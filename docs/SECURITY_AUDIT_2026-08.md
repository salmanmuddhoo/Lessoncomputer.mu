# Security & DDoS Re-Audit — LessonComputer.mu

**Date:** 2026-08-08
**Scope:** Full re-audit focused on **exploitable attacks** (paywall bypass, privilege escalation, data theft) and **DoS/DDoS resilience**. Covers all 50 SQL migrations + RLS policies, every `app/api/**` route, middleware, the new Google OAuth + onboarding flow, and the payment path.
**Method:** Four parallel deep-dive audits (API routes, RLS/database, auth/OAuth, DoS), every HIGH finding verified line-by-line against source.

> **Bottom line:** The big holes from the July audit are **fixed** — a student can no longer make themselves admin, can no longer pay Rs 1 for anything, and premium *notes* are locked down. Auth, admin gating, and the new Google login are solid. **However, three RLS policies still hand paid content straight to anyone with no login** (the same bug class as the July notes fix, but never applied to videos, live classes, and documents), and there is **still zero application-level rate limiting**. None of these needs a rewrite.

**Severity:** **P0** = exploitable now, fix immediately · **P1** = fix soon · **P2** = hardening · **P3** = cleanup.

---

## ✅ Confirmed FIXED since the July audit (don't regress these)

| July finding | Status | Fixed by |
| --- | --- | --- |
| **P0-1** Any student could set `role:'admin'` from the browser | **FIXED** | `043_profiles_prevent_privilege_escalation.sql` — `BEFORE UPDATE` trigger blocks non-admins changing `role`/`is_active`; there is also **no INSERT policy** on `profiles`, so upsert-escalation is denied too. |
| **P0-2** Client-controlled payment amount (pay Rs 1) | **FIXED** | `app/api/payment/create/route.ts` recomputes the amount server-side from the DB and **ignores** the client value. |
| **P0-4** Premium revision notes world-readable | **FIXED** | `044_revision_notes_subscription_access.sql` — replaced the open policy with a subscription-gated `EXISTS`. |
| **P0-5** Seeded admin creds in a migration | **MITIGATED** | `045_rotate_seeded_credentials.sql` randomises the password if unchanged. *(Still verify the account is disabled in prod.)* |
| Metadata → privileged-column smuggling (new concern for Google login) | **SAFE by design** | Trigger `handle_new_user` copies only `full_name`/`grade_id`; the backfill code writes only those two columns via service role — `role`/`is_active` are never reachable from `user_metadata`. |

Also solid: every admin route re-checks `role==='admin'` server-side; every "act on my resource" route scopes by `user.id` (no IDOR found); the payment callback is idempotent; Google OAuth uses Supabase's PKCE correctly; session cookies are httpOnly/secure/sameSite; middleware `getUser()` is now try/caught (an auth outage no longer 500s the whole site) and `/api/*` bypasses middleware.

---

## 🔴 P0 — Paid content is readable by anyone, no login required

These three are the **same bug** the July audit fixed for revision notes — the fix was just never applied to the other content tables. The app UI correctly hides locked content, but that doesn't matter: the browser holds the Supabase **anon key**, so an attacker skips the UI and queries the table directly. The RLS policy `using (is_published = true)` returns **every column** (including the secret content URL) to `anon`.

### P0-1. Video stream URLs leak to anyone
`supabase/migrations/001_initial_schema.sql:171-172`
```sql
create policy "Published videos are publicly readable"
  on public.videos for select using (is_published = true);
```
`videos` rows carry `streamable_url` next to `price`/`is_free`. The player page (`app/(marketing)/videos/[id]/page.tsx:262`) only renders the player when `hasAccess` — but the URL is exposed at the data layer regardless.

**Exploit (unauthenticated, just the public anon key from the browser console):**
```js
supabase.from('videos').select('title, price, is_free, streamable_url').eq('is_published', true)
// → every paid video's Streamable URL. Paste it in a browser → watch for free.
```
Because paid videos are protected only by the unlisted Streamable URL, leaking the URL = free access to the entire paid catalogue.

**Fix:** Gate the row on access, e.g.
```sql
using (
  is_published = true and (
    is_free = true or is_demo = true
    or exists (select 1 from purchases pu
               where pu.video_id = videos.id and pu.student_id = (select auth.uid()) and pu.status = 'completed')
    or exists (select 1 from student_subscriptions ss
               join subscription_package_chapters spc on spc.package_id = ss.package_id
               where ss.student_id = (select auth.uid()) and ss.status = 'active'
                 and spc.chapter_id = videos.chapter_id)
  )
)
```
(Keep a separate lightweight "catalogue" policy/view exposing only non-secret columns — `title`, `price`, `is_free`, thumbnail — for the public grade pages.)

### P0-2. Live-class join links & replay URLs leak to anyone
`supabase/migrations/001_initial_schema.sql:181-182`
```sql
create policy "Published live classes are publicly readable"
  on public.live_classes for select using (is_published = true);
```
Exposes `meet_url` (the live Google Meet link) and `streamable_replay_url` of subscription-only classes.
```js
supabase.from('live_classes').select('title, meet_url, streamable_replay_url').eq('is_published', true)
// → crash/attend any paid live class, or watch any replay, without paying.
```
**Fix:** Gate on an active live subscription for the class's `grade_id`; never expose `meet_url`/`streamable_replay_url` under an `is_published`-only policy.

### P0-3. Documents (worksheets/files) leak to anyone
`supabase/migrations/014_documents.sql:22-25`
```sql
create policy "Published documents are publicly readable"
  on public.documents for select to anon, authenticated using (is_published = true);
```
`documents.file_url` is served to `anon` on publish alone. If these files are paid material, they're free to grab.
**Fix:** Gate on active subscription for the document's `chapter_id` (mirror the notes fix), **or** confirm documents are intentionally free and leave as-is.

> **These three are the headline of this audit.** They are trivially exploitable, require no account, and directly defeat the paywall. Fix before anything else.

---

## 🟠 P1 — Abuse & integrity

### P1-1. Students can insert fake "paid" orders → poisons revenue reports
`supabase/migrations/024_mips_settings.sql:34-36` — the INSERT policy only checks `student_id`, so a student can set `status`, `amount`, `package_ids` freely.
```js
supabase.from('mips_orders').insert({ student_id: myId, order_type:'mixed',
  package_ids:['x'], amount: 999999, currency:'MUR', status:'paid' })
```
The admin **finance page sums exactly `mips_orders WHERE status='paid'`** (`app/(admin)/admin/finance/page.tsx:90`), so injected rows corrupt revenue totals. (It does *not* currently grant access — `student_subscriptions` has no student-insert policy — but it's a latent provisioning risk too.)
**Fix:** Tighten the check to `with check (auth.uid() = student_id and status = 'pending')` (and ideally create orders only server-side via the service role).

### P1-2. `/api/parent-contact` sends WhatsApp to any number, unthrottled
`app/api/parent-contact/route.ts` — any logged-in student POSTs `{ phone }` and the server sends a WhatsApp from the business number to that number. No rate limit, no verification the number is theirs.
**Exploit:** Loop over victim numbers → mass unsolicited WhatsApp from the business account → number flagged/banned + per-message cost.
**Fix:** Rate-limit per user (e.g. a few/day via a `parent_whatsapp_sent_at` cooldown); bind the send to the caller's own saved parent number.

### P1-3. No rate limiting anywhere + auth email-bomb vector
There is **zero** application-level rate limiting in the codebase (confirmed). Two consequences:
- **Auth calls go browser → Supabase directly** (login/register/reset), so they **never reach Vercel** — Vercel's WAF cannot see them. An attacker can loop `resetPasswordForEmail(victim)` / `signUp` to email-bomb a victim and burn the Supabase SMTP quota (locking out real signups), or run credential-stuffing on login.
- Gateway routes (`payment/create`, `payment/retry-recurring`) and the marketing pages can be flooded to amplify cost (see DoS section).

**Fix (highest leverage, mostly no-code):**
1. **Enable hCaptcha/Turnstile in Supabase → Auth** — the *only* control that stops the email-bomb path, because those calls bypass Vercel.
2. Tighten **Supabase Auth rate limits** and configure **custom SMTP** with its own limits/alerts.
3. **Enable Vercel WAF rate rules** on `/api/*` and the auth pages.
4. Add **Upstash Ratelimit** per-user on `payment/create` + `retry-recurring`.

---

## 🟡 P2 — Hardening

- **Open redirect (login):** `app/(auth)/login/login-form.tsx:28,52` pushes `redirectTo` with no same-origin check → `…/login?redirectTo=https://evil/…` sends the user off-site after login (phishing). Fix: only allow values starting with a single `/`.
- **Unsafe redirect build (OAuth callback):** `app/api/auth/callback/route.ts:7,36` concatenates `${origin}${next}`; a `next` not starting with `/` yields a foreign host. Not directly reachable today (needs a valid PKCE code, and the Google button sends no `next`), but fix now: `new URL(next, origin)` + leading-`/` check.
- **Self-service grade change:** `app/api/onboarding/route.ts` (and the RLS self-update policy) let a student change their own `grade_id` at any time to any active grade. Grade is treated as a trusted enrollment key but is user-writable. Fix: only set when currently null; require admin to change an established grade.
- **Weak notes HTML sanitiser (stored XSS):** `app/api/notes/[id]/route.ts:40-48` strips `<script>` but leaves `onerror=`/`javascript:`/`<iframe>`. Whoever can write `revision_notes.content` (admins today) can plant XSS that runs in every subscribed student's browser. Fix: use DOMPurify/sanitize-html allow-list, or serve notes in a sandboxed iframe.
- **MIPS callback checksum disabled:** `app/api/payment/callback/route.ts:84-87` computes but does not enforce the IMN checksum. **Not exploitable today** (authenticity rests on the server-to-server decrypt call, which needs the merchant cipher key), but it's a single point of failure with the intended second gate switched off, and the callback amount is never re-checked against the stored order. Fix: enforce the checksum + assert `amount`/`currency`/`status` match the stored order.
- **Cron secret compared with `!==`** (`app/api/cron/billing/route.ts:25`) — timing side-channel. Use `crypto.timingSafeEqual`.
- **Raw DB error leaked to user:** `app/api/parent-contact/route.ts:65` returns `profileError.message`. Return a generic message; log detail server-side.
- **Unvalidated `grade_id` in backfills:** `auth/callback` and `student/layout` write `meta.grade_id` without the `is_active` check that `/api/onboarding` does. Low impact; add the check for consistency.

---

## 🟢 DDoS Posture — what's covered vs what you must do

**Vercel already absorbs, for free, with no action:** volumetric network-layer DDoS (L3/L4) — SYN floods, UDP reflection, raw packet volume, TLS-level attacks. **Your network-layer "DDoS" worry is already handled by the platform.**

The real exposure is **application-layer (L7)** — cheap HTTP requests that each trigger expensive backend work — and none of it is throttled:

| Gap | Impact | Fix |
| --- | --- | --- |
| **No caching on `grades/[slug]`** — public page runs **~11–13 Supabase queries/view**, fully dynamic | Loop `GET /grades/*` → hundreds of DB queries/sec → Supabase cost + connection-pool exhaustion | `export const revalidate = 300` (ISR) on marketing pages; `.limit()` the catalogue queries; move the "am I subscribed" bit to a small client component |
| **Auth email-bomb** (P1-3) — calls bypass Vercel | Burn SMTP quota, lock out real users | **Supabase CAPTCHA** (only real fix) + tighter auth limits + custom SMTP |
| **No WAF rate rules** | L7 floods hit origin | Enable **Vercel WAF** rate limiting on `/api/*` + auth/marketing paths (dashboard, no code) |
| **`payment/create` unthrottled** | One user → unlimited pending orders + MIPS calls | Upstash per-user limit + dedupe recent pending orders |
| **Middleware `getUser()` on every page** | Every public view = a Supabase auth round-trip | Narrow the matcher to `/dashboard`, `/admin`, `/login`, `/register` so public pages skip it |
| **Unbounded admin queries** (`students`, `finance` load whole tables) | Self-DoS as data grows | Server-side pagination (`.range()`) + SQL aggregates for totals |
| No `/api/health`, single region, no `maxDuration` on external-call routes | Monitoring hits real pages; slow gateway holds invocations | Add static `/api/health`; set `maxDuration` on `payment/create`; consider Supabase connection pooling (Supavisor) |

---

## Recommended order

1. **Today (P0):** close the three content-leak RLS policies — videos, live classes, documents. This is the actual paywall bypass.
2. **This week (P1):** lock the `mips_orders` insert policy; throttle `parent-contact`; enable **Supabase CAPTCHA + Vercel WAF rate rules** (the two no-code wins that cover the biggest DoS/abuse surface).
3. **Then (P2):** redirect validation, grade-change lock, notes sanitiser, checksum enforcement, constant-time cron compare.
4. **Ongoing:** ISR caching + middleware matcher (kills the query-amplification DoS), admin pagination, monitoring/health, Upstash on payment routes.

*Analysis only — no code changed as part of this audit. Every finding cites `file:line`.*
