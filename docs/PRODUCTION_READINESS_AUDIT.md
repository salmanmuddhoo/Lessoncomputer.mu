# Production-Readiness Audit — LessonComputer.mu

**Date:** 2026-07-16
**Scope:** Full codebase — 42 SQL migrations, all API routes, middleware, auth/payment/billing flows, RSC pages, config.
**Target scale reviewed against:** 100k+ students, thousands concurrent, hundreds of teachers, millions of video views, thousands of monthly recurring payments.
**Method:** Six parallel deep-dive audits (security, database/scalability, payments, performance/cost, reliability/ops, maintainability/UX). Top findings verified line-by-line against source.

> **Bottom line:** The app works today at small scale, but it is not yet safe to serve real money or large traffic. There are **four exploitable security holes** (one lets any student become admin; one lets a student pay Rs 1 for anything), the **recurring-billing cron cannot survive its own scale and cannot recover from a failed run** (silent loss of a month's revenue + double-charge risk), and there is **no monitoring, no tests, no env validation, and no caching**. The good news: the architecture is mostly sound (video offloaded to Streamable, money stored as `numeric`, idempotent callback, sensible RLS structure), so these are fixable without a rewrite.

Severity legend: **P0** = fix before real users/money · **P1** = fix before scaling up · **P2** = fix soon · **P3** = cleanup.

---

## P0 — Blockers (security & money correctness)

### P0-1. Any student can promote themselves to admin ✅ verified
`supabase/migrations/001_initial_schema.sql:150-152`, `supabase/migrations/027_parent_contact.sql:9-14`
The `profiles` UPDATE policies authorize with `using (auth.uid() = id)` and **no `WITH CHECK` restricting columns**. A logged-in student can run, straight from the browser with the anon key:
```js
supabase.from('profiles').update({ role: 'admin' }).eq('id', myId)
```
RLS accepts it; the `role` CHECK constraint permits `'admin'`. On the next request middleware treats them as admin → full access to every admin page, all orders, all payment tokens, all student data, billing settings.
**Fix:** Add a `WITH CHECK` (or BEFORE-UPDATE trigger) that forbids a student changing `role`/`is_active`. Never let a self-update touch privileged columns.

### P0-2. Payment amount is client-controlled — pay Rs 1, unlock anything ✅ verified
`app/api/payment/create/route.ts:13-40, 85-97`
`amount` is taken from the request body, inserted into the order, and sent to MIPS **without any server-side price check**. The callback then activates every `package_id` regardless of amount.
```js
const { orderType, packageIds, amount, ... } = body   // client-supplied
...insert({ package_ids: packageIds, amount, ... })     // charged as-is
```
A student POSTs `{ packageIds:[<expensive live months>], amount: 1 }`, MIPS collects Rs 1, subscriptions activate.
**Fix:** Recompute `amount` server-side by summing authoritative prices for `packageIds` (grade `live_subscription_price` / package price); ignore the client value. In the callback, also assert the decrypted `amount` matches the recomputed order total before granting access.

### P0-3. MIPS callback checksum failure is logged but honored ✅ verified
`app/api/payment/callback/route.ts:75-79`
```js
const checksumValid = verifyImnChecksum(details)
if (!checksumValid) { console.error(...); /* Log but don't block */ }
```
The only tamper-detection on the payment notification is advisory. Any payload resolving to a known order id with `status:SUCCESS` grants access — a forged/replayed notification is accepted.
**Fix:** `return imn('fail')` when the checksum is present and invalid. Additionally validate decrypted `amount`/`currency`/`status` against the stored order before flipping to `paid`.

### P0-4. Premium revision-note content is world-readable ✅ verified
`supabase/migrations/020_revision_notes.sql:22-24`, exposed by `app/(marketing)/notes/[id]/page.tsx` (unauthenticated) and `app/api/notes/[id]/route.ts`
```sql
create policy "student_read_revision_notes" on public.revision_notes
  for select using (is_published = true or is_published_for_live = true);
```
No grade, subscription, or ownership check — the policy comment says "for their grade" but doesn't enforce it. Anyone can open `/notes/<id>` and read paid content; the API even returns live-only `content_live` to any logged-in user.
**Fix:** Gate the policy and both handlers on an active `student_subscriptions` row for the note's grade/package; split video vs. live content access.

### P0-5. Hardcoded admin credentials seeded by a migration ✅ verified
`supabase/migrations/002_seed_test_accounts.sql:5-6`
Seeds a confirmed admin `admin@lessoncomputer.mu` / `AdminLC2024!` (and a student account) into the migration chain. `.github/workflows/migrate.yml` runs `supabase db push` on every merge to `main`, so this can reach production.
**Fix:** Confirm these accounts do **not** exist in production (rotate immediately if they do). Move seed accounts to a dev-only seed step outside the migration chain.

### P0-6. Recurring billing cron cannot recover from a failed run — a whole month is silently lost ✅ verified
`app/api/cron/billing/route.ts:23-32`
The cron runs daily but only does work when the Mauritius day **exactly equals** `billingDay`; otherwise it early-returns `skipped`. If that one day's run fails (timeout, blip, throw), the next day skips and **no recurring student is charged that month** — they lose access on the 1st. The route also returns HTTP 200 even when every charge fails, so Vercel Cron reports it healthy.
**Fix:** Process any student whose next-month subscription is missing whenever `today >= billingDay` (guarded by the existing "already subscribed" check so re-runs are safe). Persist a per-month billing-run ledger. Return non-2xx when failures occur so alerting fires.

### P0-7. Cron double-charges on overlapping/duplicate runs — no idempotency key ✅ verified
`app/api/cron/billing/route.ts:124-178`
The only guard is a **non-atomic read** of `student_subscriptions`; there is no unique constraint on `mips_orders` per period and no idempotency key sent to MIPS. Two runs on the same day (manual re-trigger, redeploy, or overlap with the C2 timeout) both pass the check and both call `claimMipsPayment` → the card is charged twice. At 3,000 subscribers an overlap can mean hundreds of duplicate charges + chargebacks.
**Fix:** Add a unique constraint keyed to the billed period (`mips_orders(student_id, order_type, billing_period)` or a dedicated `idempotency_key`), insert-before-charge, and send MIPS a stable period-derived order id so the gateway also rejects duplicates.

### P0-8. Charge and DB writes are not transactional — paid-but-no-access, then re-charged ✅ verified
`app/api/cron/billing/route.ts:171-207` (mirrored in callback & claim)
Charge (1) and the subscription/order writes (2)-(4) are four independent awaited calls with no transaction and no compensation. If the card is charged but the process dies before the writes, money is taken, the order stays `pending`, no subscription exists — and next month the "already subscribed" check finds nothing and charges **again**.
**Fix:** Perform the DB mutations in a single Postgres transaction (RPC) after a confirmed charge; on post-charge DB failure record `paid_pending_provision` and reconcile rather than allowing a re-charge. Combine with the P0-7 idempotency key.

---

## P1 — Fix before scaling up

### P1-1. Cron bills thousands of cards sequentially — guaranteed timeout ✅ verified
`app/api/cron/billing/route.ts:80-232` — no `maxDuration`, no batching. ~4 DB round-trips + 1 sequential MIPS HTTP call per student. At ~1.5s/student, 3,000 students ≈ 75 min → killed after a few hundred; the rest silently never billed (feeds P0-6). Non-viable at 100k.
**Fix:** `export const maxDuration = 300`; process in bounded batches with a durable cursor, controlled concurrency (5–10 parallel claims), driven by a queue (Vercel Queues / QStash / pg_cron + claim table). Make it resumable + idempotent.

### P1-2. No application monitoring or alerting
No Sentry/Datadog/OTel anywhere; server logging is `console.*` only (short retention on Vercel, no search/alerting). A run where every charge fails returns 200 and pages nobody.
**Fix:** Add `@sentry/nextjs` for exception capture on all routes + cron; return non-2xx on cron failures; add a dead-man's-switch heartbeat that alerts if the monthly run never completes.

### P1-3. No runtime env validation; no `.env.example`
`lib/supabase/server.ts`, `lib/mips.ts` use `process.env.X!` and `?? ''` defaults. Missing `CRON_SECRET` → cron 403s forever (billing never runs); empty MIPS creds → every payment fails opaquely. ~15 required vars, none documented.
**Fix:** Commit `.env.example`; add `lib/env.ts` validating required vars with Zod at boot (fail fast).

### P1-4. Transactional email uses Supabase default SMTP — breaks at signup volume
`supabase/config.toml:37-40` — signup confirmations + password resets go through Supabase's built-in mailer (a few emails/hour, not for production). A launch driving 500 signups/hour drops most confirmation emails → students locked out.
**Fix:** Configure a production SMTP provider (Resend/SES/SendGrid) and raise auth email rate limits; monitor delivery/bounce.

### P1-5. RLS re-evaluates `auth.uid()` per row across the whole platform ✅ verified
Every policy of the form `using (auth.uid() = student_id)` (e.g. `008:30`, `017:31`, `039:13/25`, and many in `001`) treats `auth.uid()` as volatile → one GoTrue call **per candidate row**. On `video_progress` (grows to students×videos ≈ 50M rows) this re-invokes millions of times per query.
**Fix:** Wrap every auth call: `using ((select auth.uid()) = student_id)`; convert the raw `EXISTS(... profiles ...)` policy in `030_blog_posts.sql:20` to `using (public.is_admin())`.

### P1-6. Middleware runs `auth.getUser()` on essentially every request + whole-site 500 coupling ✅ verified
`middleware.ts:38` with a matcher (`:88-92`) that only excludes static assets. Every homepage/blog/API/video hit triggers a network Auth round-trip; anonymous marketing traffic pays 50–150ms and an invocation per view. The call is un-try/caught, so a Supabase auth incident **500s the entire site, including public pages**.
**Fix:** Narrow the matcher to `/dashboard`, `/admin`, `/login`, `/register`; skip the Supabase client entirely when no auth cookies are present; wrap auth/profile calls in try/catch so public routes degrade to logged-out instead of 500.

### P1-7. Zero caching — every page fully dynamic, per-view DB queries ✅ verified
No `revalidate`/`unstable_cache`/`generateStaticParams`/`force-static` anywhere. Marketing pages (`page.tsx`, `grades`, `blog`, `grades/[slug]` with **9 parallel queries/view**) recompute from the DB on every anonymous visit; `site_settings` is re-read on nearly every request. This is the single biggest cost multiplier at millions of views.
**Fix:** Add ISR (`export const revalidate = 300`, or on-demand `revalidateTag` from admin mutations) to marketing pages; wrap shared reads (`grades`, `site_settings`) in `unstable_cache`; move personalized nav to a client component so page bodies stay static.

### P1-8. Duplicated per-request auth fan-out (middleware → layout → page) ✅ verified
`middleware.ts:60`, `app/(student)/layout.tsx:8-17`, `dashboard/page.tsx:16-33` each independently call `getUser()` + fetch `profiles` — ~3 Auth calls + 2–3 profile selects before any page data, per navigation.
**Fix:** Fetch the profile once wrapped in React `cache()` (dedupes within a render) or pass role via headers from middleware.

### P1-9. Unbounded admin/finance queries load entire tables into the browser ✅ verified
`app/(admin)/admin/finance/page.tsx:90` (all paid `mips_orders`, no limit), `app/(admin)/admin/students/page.tsx:112` (all students, client-side search/filter). At 100k students / millions of orders these ship megabytes, freeze the tab, and make finance totals (`reduce` over a truncated set) wrong.
**Fix:** Server-side pagination (`.range()`) + server-side search (`.ilike`); compute revenue with a SQL `sum()` RPC scoped to the financial year, not a client reduce.

### P1-10. No tests, no lint/typecheck CI gate, build errors ignored ✅ verified
`next.config.mjs:3-5` `typescript.ignoreBuildErrors: true`; no `test` script or test files; the only workflow is `migrate.yml`. A type error in the billing loop compiles and deploys.
**Fix:** Remove `ignoreBuildErrors`; add CI running `lint` + `tsc --noEmit` as a required check; add unit tests for the billing date logic and the payment-callback state machine (they handle money).

### P1-11. Reusable payment token (`id_token`) and full decrypted payloads written to logs ✅ verified
`lib/mips.ts:306-312` logs `full: decryptText` (entire decrypted IMN incl. the ODRP card-on-file token + `card_last_four_digit`). Anyone with log access can harvest chargeable tokens.
**Fix:** Never log `id_token`, `full`/raw decrypted bodies, or response headers; log only order id + status.

### P1-12. `ON DELETE CASCADE` from students onto financial records ✅ verified
`mips_orders`, `student_subscriptions`, `purchases` all cascade from `profiles`; `students/page.tsx:137` exposes a hard student DELETE. Deleting one student wipes their paid-order history → corrupts revenue/tax records computed from `mips_orders`.
**Fix:** Use `ON DELETE RESTRICT` (or soft-delete via the existing `is_active`) on financial tables.

### P1-13. No rate limiting on auth or payment endpoints
No limiter in middleware or routes. Enables credential stuffing on login, order/`payment/create` spam (each hits MIPS + inserts a row), and `/api/notes/[id]` enumeration.
**Fix:** IP/user rate limiting (Upstash/Vercel KV) on auth + `payment/*` + `notes/*`; enable Supabase Auth attempt limits.

### P1-14. Internal error details leaked to clients ✅ verified
`payment/create:168`, `claim:128`, `cancel-recurring:40`, `restore-recurring:64` return `String(err)` — which embeds raw MIPS response bodies and Postgres error messages — to the browser.
**Fix:** Return a generic message + correlation id; log detail server-side.

### P1-15. Swallowed write errors on the payment path ✅ verified
`callback/route.ts:159-175/208`, `cron/billing:101-206`, `create:162`, `auth/callback:28` destructure without checking `{ error }`. A silent failure on the "mark order paid" write leaves the student charged with no access.
**Fix:** Check `{ error }` on every write; on the callback activation path, return non-2xx on failure so MIPS retries; reconcile via a ledger.

### P1-16. Missing indexes on FKs and hot filter columns ✅ verified
No index on `profiles.role`, `documents.grade_id/chapter_id`, `revision_notes.grade_id/chapter_id`, `live_classes.package_id`, `broadcasts.chapter_id`, `mips_orders.created_at`, `student_subscriptions.status/valid_until`, the 5-column `subscription_packages` cron lookup. `profiles.role` unindexed = seq scan on every student list/count.
**Fix:** Add the indexes (DDL listed in the database audit); e.g. `create index on public.profiles (role);` etc.

---

## P2 — Fix soon

### P2-1. Timezone inconsistency: purchase logic (UTC) vs billing cron (UTC+4) ✅ verified
`lib/subscription-billing.ts:30-43` and `payment/create:40` use server-local (UTC on Vercel); `cron/billing:24` shifts +4h. Between 20:00–23:59 UTC the two disagree about "today," so near the cutoff day a student can be assigned the wrong billing month.
**Fix:** One shared `mauritiusNow()`/`mauritiusToday()` helper (ideally `Intl.DateTimeFormat` with `Africa/Port_Louis`) used by purchase, cron, and display.

### P2-2. Date-only access checks use UTC → ~4-hour access gap each month boundary ✅ verified
`videos/[id]/page.tsx:75`, `subscriptions/page.tsx:75`, `grades/[slug]/page.tsx:150` compute `today` via `toISOString().split('T')[0]` (UTC) but compare against Mauritius month boundaries. From 00:00–03:59 MU on the 1st, a paid new-month sub (`valid_from = 08-01`) fails `lte.today` → student locked out for ~4 hours; expired subs keep access for 4 hours.
**Fix:** Compute `today` in Mauritius time (same helper as P2-1).

### P2-3. `token.max_amount` stored 100× too small via a stray `/100` ✅ verified
`callback/route.ts:186` `max_amount: order.metadata?.recurringAmount ?? Number(details.amount)/100`. MUR amounts are whole rupees elsewhere, so when `recurringAmount` is absent the cap becomes Rs 5 for a Rs 500 grade → next cron charges `Math.min(500,5)=5`, or skips if ≤0.
**Fix:** Store the cap from the authoritative order amount in the same unit used everywhere; remove the `/100`.

### P2-4. `mips_orders.package_ids text[]` instead of a join table ✅ verified
`024:12`, consumed via JS `.includes()` and even string-concatenated into a PostgREST `in (...)` filter (`callback:164`). No FK → deleting a package orphans order line-items (corrupt receipts); package-level analytics can't use an index.
**Fix:** A `mips_order_items(order_id, package_id)` join table with FKs and an index; at minimum make it `uuid[]` + GIN + validation.

### P2-5. Missing uniqueness for live/grade subscriptions ✅ verified
`unique (student_id, package_id)` (`008:11`) doesn't dedupe rows where `package_id IS NULL` (live/grade subs keyed by `grade_id`), so duplicates are possible and `onConflict:'student_id,package_id'` upserts misbehave for them.
**Fix:** `create unique index on student_subscriptions (student_id, grade_id, subscription_type) where package_id is null;`

### P2-6. No reconciliation / stuck-order sweep ✅ verified
Interactive purchases activate **only** in the IMN callback. A lost/delayed IMN leaves the student charged-on-MIPS but `pending` forever, with no automated remedy and raw gateway responses only in ephemeral logs.
**Fix:** Scheduled reconciliation querying MIPS for `pending` orders older than N minutes; persist the raw gateway response/transaction id per order; surface mismatches in the admin UI.

### P2-7. Failed recurring charge = immediate silent churn (no dunning) ✅ verified
`cron/billing:209-224` marks the order failed and may deactivate the token on a single decline — no retry schedule, no grace period, no notification. Normal ~5–10% decline rates → hundreds of avoidable involuntary churns/month.
**Fix:** Dunning schedule (retry over days), grace window before revoking access, distinguish hard vs soft declines before deactivating, notify the student. Also track card/token expiry (`P2` schema addition) and pre-emptively prompt re-auth.

### P2-8. Image optimization disabled globally + raw `<img>` ✅ verified
`next.config.mjs:6-8` `images.unoptimized: true`; blog/testimonial images use raw `<img>`. Full-size, non-lazy, no WebP/AVIF → uncontrolled egress and poor LCP at millions of views.
**Fix:** Remove `unoptimized`, configure `remotePatterns`, switch to `next/image` with dimensions.

### P2-9. Payment-pending poller full-refreshes every 4s unconditionally ✅ verified
`components/lc/payment-pending-poller.tsx:18-44` calls `router.refresh()` every tick (full RSC re-render + a verify API call + middleware `getUser()`) = 15 invocations/min/user while pending.
**Fix:** Only refresh on status change to `paid`; back off the interval; consider Supabase Realtime on the order row.

### P2-10. No shared `requireAdmin`/`requireUser` helper ✅ verified
Auth+role boilerplate copy-pasted across middleware, layouts, API routes, pages. A new route can silently omit the role check.
**Fix:** `lib/auth.ts` exporting `requireUser()`/`requireAdmin()` returning `{ user, supabase }` or throwing typed 401/403.

### P2-11. Status/type strings are magic literals; `STATUS_CONFIG` defined twice ✅ verified
75 occurrences of `'active'|'paid'|'pending'|'failed'|'live'|'cancelled'` across 22 files; `STATUS_CONFIG` diverges between `admin/payments/page.tsx:26` and `payments-table.tsx:26`. A typo (`'canceled'`) silently mis-classifies a row.
**Fix:** `lib/constants.ts` with typed unions + one shared `STATUS_CONFIG`.

### P2-12. Hand-written Supabase types drift → 202 `as any` casts ✅ verified
`lib/types/database.ts` is hand-maintained and **missing** `mips_orders`, `student_payment_tokens`, `site_settings`, `student_subscriptions` — the money tables — forcing `(supabase as any)` on exactly the correctness-critical routes.
**Fix:** `supabase gen types typescript` + a CI check for drift; drop the casts so the compiler validates columns.

### P2-13. Business rules (pricing / recurring window / next-billing-date) duplicated across UI, API, cron ✅ verified
`cron/billing:141`, `create:139`, `callback:120`, `admin/payments/page.tsx:33` each re-implement caps / the ×24 window / next-date. They will drift.
**Fix:** Centralize in `lib/subscription-billing.ts` (`computeRecurringAmount`, `nextBillingDate(mauritiusNow)`).

### P2-14. No `error.tsx` / `loading.tsx` / `not-found.tsx` anywhere ✅ verified
Any thrown query error renders the raw Next error page; slow mobile users see a blank screen with no skeleton.
**Fix:** Add route-group `loading.tsx` (skeletons) + `error.tsx` (retry) + root `not-found.tsx`.

### P2-15. Admin payments hard-capped at 200 with client-side filter ✅ verified
`admin/payments/page.tsx:51` `.limit(200)`; revenue totals computed over the truncated 200 → finance under-reports.
**Fix:** Server-side pagination + SQL aggregate for totals.

### P2-16. Single region, no health check, no DR posture documented ✅ verified
`vercel.json` pins `cdg1` only; no `/api/health`; no documented Supabase PITR/backup/restore. Confirm the Supabase region matches `cdg1` (cross-continent RTT × 10 queries/page = 1s+ latency otherwise).
**Fix:** Add `/api/health` + uptime monitor; enable & rehearse Supabase PITR; document RPO/RTO; co-locate function region with Supabase.

### P2-17. `migrate.yml` auto-pushes migrations to prod with no gate ✅ verified
`db push` on every merge to `main`, no staging/dry-run/rollback; the presence of `supabase/fix_production.sql` suggests prior drift.
**Fix:** Gate behind environment approval, run against staging first, document rollback; fold `fix_production.sql` into tracked migrations.

---

## P3 — Cleanup / lower risk

- **Dead/redundant `/api/payment/claim` route** — a second charging path with a different auth header (`x-cron-secret` vs the cron's `Bearer`), trusting client `studentId`+`amount`, likely dead (uses cookie client). Delete or lock to service-role. *(security L2, payments M1, reliability M4)*
- **`billing_hour` setting is dead config** — `040_billing_hour.sql` adds it; nothing reads it. Honor it in the cron or remove. *(payments L1)*
- **Stored-XSS surface in notes API** — `app/api/notes/[id]/route.ts:68/95` interpolates `note.title`/`content` raw (the page sanitizes; the API doesn't). Sanitize server-side + escape title. Same for blog `dangerouslySetInnerHTML`. *(security M2, perf M3)*
- **Open-redirect-adjacent `next` param** in `auth/callback` — same-origin only, but add an allowlist / `/`-prefix check. *(security L1)*
- **Two toast systems bundled** (`sonner` + Radix toast trio) and native `alert()` in `payments-table.tsx:54`. Standardize on `sonner`, delete the rest. *(maintainability M4/M5)*
- **41 `console.*` calls, no logger abstraction / levels** — `console.error` used for info logging pollutes error dashboards. Add `lib/logger.ts`. *(maintainability L1, reliability L2)*
- **Per-request debug env-check log** on the payment hot path (`create:121`). Gate behind a flag. *(maintainability M7)*
- **Inconsistent currency/date formatting** (`Rs ${n.toFixed(2)}` vs `toLocaleString('en-MU')` vs bare `toLocaleDateString()`). Add shared `formatMUR()`/`formatDate()`. *(maintainability L3)*
- **Duplicate FK on `mips_orders.student_id`** (auth.users via 024 + profiles via 031) — keep the profiles one. *(database M1)*
- **Superseded `purchases`/`subscriptions` tables** still live and read by `admin/page.tsx:25` — confirm canonical system, drop the other. *(database H4)*
- **Money math on JS floats** (`×24`, `Math.min`) — safe for whole-rupee amounts today; move to integer minor units if fractional pricing ever appears. *(payments L3)*
- **Recharts + client-side `useEffect` fetch waterfalls** in admin pages — `next/dynamic` the charts; fetch server-side. *(performance M4)*
- **Accessibility gaps** in the buy dialog (`aria-describedby={undefined}`, label/for pairing, color-only status). *(maintainability L6)*
- **Framework version** — repo is on `next@16.0.10` + React 19 (bleeding edge), not 14. Confirm it's a stable line for a 100k-user platform. *(reliability L4, maintainability L4)*
- **`getBillingSettings` silently defaults to day 28** on a query error — could bill on the wrong day. Distinguish "no row" from "error". *(reliability M3)*

---

## What's already done well (don't regress these)

- **Video delivery offloaded to Streamable** (iframe embeds) — no video bandwidth / signed-URL cost. Correct call for millions of views.
- **Service-role key is server-only**; browser uses the anon key.
- **Payment callback is idempotent** on already-paid orders; metadata is merged not overwritten; ODRP token key resiliently deep-scanned.
- **Per-student error isolation** in the billing loop — one bad token doesn't abort the run.
- **Money stored as `numeric(10,2)`/`numeric(12,2)`** everywhere — never float.
- **`is_admin()` is `stable security definer`** with `set search_path` — breaks RLS recursion correctly.
- **Good composite indexes where they exist** (`chapters(grade_id, order_index)`, `timetables(...)`, partial `student_payment_tokens(is_active)`), and correct natural-key uniques.
- **Ownership verified before privileged writes** in cancel/restore/verify; admin routes re-check role server-side rather than trusting middleware alone.
- **Cron authenticated with a secret**; secrets logged as presence/length, never values (except the token-payload leak in P1-11).
- **Correct short-month billing-day clamping** (day-31 still fires on 28 Feb).
- **Double-submit protection** on the payment button; `Promise.all` used well within heavy pages; self-hosted fonts via `next/font`.

---

## Suggested remediation order

1. **This week (P0):** role-escalation `WITH CHECK` (P0-1), server-side amount (P0-2), enforce checksum (P0-3), lock down notes (P0-4), verify/rotate seeded creds (P0-5). These are exploitable now.
2. **Before scaling the cron (P0-6/7/8 + P1-1):** make billing idempotent, transactional, batched, and self-healing, with a run ledger — this is money correctness.
3. **Before more traffic (P1):** monitoring (P1-2), env validation (P1-3), production SMTP (P1-4), RLS `(select auth.uid())` (P1-5), middleware matcher + degradation (P1-6), ISR/caching (P1-7), CI gate (P1-10).
4. **Then P2/P3** as steady-state hardening.

*No code changes were made as part of this audit — it is analysis only. Each finding cites `file:line` for the fix.*
