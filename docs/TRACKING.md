# New Website Tracking — Brief for the Developer and Claude

- [ ] Oct 1, 2026 · @Muhammud Shoheb Muddhoo

## Start here (for the developer)

This doc is written so your Claude can do the whole job. Two steps:

1. Export this doc as Markdown and save it in the website repo as `docs/TRACKING.md`.
2. Open Claude Code in the repo and paste the prompt below.

Google Tag Manager, Meta and Google Analytics are already configured. The work is code only, plus one secret to add in Vercel (Step 4).

```text
You are working in the LessonComputer.mu codebase (Next.js App Router on Vercel, Supabase, MIPS card payments).
Read docs/TRACKING.md fully before changing anything. Implement it exactly:

1. Step 1: add the GTM-PS78S8GC snippet to the root layout. Remove any other tracking script
   (old GTM-K9WPDXKM, Meta pixel code, gtag.js) if present. Keep Vercel Analytics.
2. Step 2: create lib/track.ts and components/PageViewTracker.tsx as written.
3. Step 3: push every event in the table at the exact moment described. Find the real components for:
   grade pages (/grades/[slug]), live-class "Subscribe" and video "Buy" buttons (including the
   ?buy=live / ?buy=video&pkg= flow after login), pay-per-lesson purchases, free preview videos,
   register (email AND Google sign-up), login, contact form, waitlist form, footer newsletter,
   every wa.me / WhatsApp link, the MIPS redirect and the payment success page.
   Use the exact event names, field names and the course object shape. Prices are numbers in MUR.
4. Step 4: server-side Purchase. Save fbp, fbc, client IP, user agent and page URL on the order when
   checkout starts. When MIPS confirms payment (server callback), send ONE Purchase per order to Meta
   Conversions API with event_id purchase_<order id>. Make it idempotent (a flag on the order).
   Read META_PIXEL_ID and META_CAPI_ACCESS_TOKEN from env. Never commit the token.
5. Rules: no personal data outside user_data; push events only after the action succeeded;
   do not edit GTM, Meta or GA4 settings; do not add other analytics tools.
6. When done, give me a report: each event, file and line where it is pushed, and anything you
   could not find or had to assume. Then walk me through Step 5 (testing) and the Definition of done.
```

## What we sell and what the ads optimise on

Meta Sales campaigns optimise on **Purchase**. Every paid order must reach Meta with its value in MUR, from the browser and from the server, so no sale is lost when a parent closes the tab after paying.

| Product | Example price | `item_category` | Where it is bought |
| --- | --- | --- | --- |
| Live class, one month | MUR 650 | `live_class` | "Subscribe" on a grade page |
| Video package | MUR 650 | `video_package` | "Buy" on a grade page |
| Single video or single live class | from MUR 50 | `video_lesson` | Pay per lesson |
| Free preview lesson | MUR 0 | not a sale | "Watch Demo Videos" |

Other signals the ads use, in order of value: InitiateCheckout and AddToCart (people close to buying, used for retargeting), CompleteRegistration (account created), Lead (contact form or waitlist), Contact (WhatsApp click). Payments are one-off per month or per item; there is no auto-renewal, so each monthly payment is its own Purchase.

## Summary

The new site gets its own, brand-new tracking setup. Nothing from the old WordPress tracking (container GTM-K9WPDXKM) is reused or should be installed. The developer's only jobs are to add one GTM snippet and send paid orders to Meta from the server and push 12 named events into the `dataLayer`. Everything else is already built in Tag Manager.

| What | ID / value | Notes |
| --- | --- | --- |
| GTM web container (new) | GTM-PS78S8GC | "Lesson Computer - New Website (Next.js)". 3 tags, 2 triggers. Published (version 1) on 1 Oct 2026. Silent until the site's code is added. |
| GA4 property (new) | G-C4KXXE0NXS | "Lesson Computer - New Website (Next.js)". Mauritius time, MUR currency. |
| Meta pixel / dataset | 1154933753197119 | Same pixel as today, kept on purpose so the ads keep their learning and audiences. |
| Server-side endpoint (Stape) | https://tracking.lessoncomputer.mu | Existing server container GTM-KQ9KMP4Z. It is site-agnostic: it forwards any GA4 hit to GA4 and to Meta Conversions API. No changes needed. |
| Meta test event code | TEST27148 | Added automatically, but only in GTM Preview mode. |

How it works: each `dataLayer` event fires two things at once. One is the Meta pixel in the browser. The other is a GA4 hit sent to the Stape server, which then sends GA4 and Meta Conversions API. Both carry the same `event_id`, so Meta counts each action only once.

&#91;embedded content: data flow · new website tracking\]

Staging safety: on any host other than lessoncomputer.mu (test-development.xyz, the `.test` and `.local` copies), every tag stays silent unless GTM Preview is open. So test clicks never pollute live data or the ads.

## Step 1 — Install GTM in Next.js

Add GTM-PS78S8GC once, in the root layout. Do not add the Meta pixel, gtag.js or any other tracking script directly; GTM loads them.

1. Add the ID to Vercel environment variables, for all environments: `NEXT_PUBLIC_GTM_ID=GTM-PS78S8GC`.
2. Put this in `app/layout.tsx`. The `dataLayer` line must run before GTM loads.

```tsx
import Script from 'next/script';
import PageViewTracker from '@/components/PageViewTracker';

const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {GTM_ID && (
          <Script id="gtm" strategy="afterInteractive">{`
            window.dataLayer = window.dataLayer || [];
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
            var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
            j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${GTM_ID}');
          `}</Script>
        )}
      </head>
      <body>
        {GTM_ID && (
          <noscript>
            <iframe src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0" width="0" style={{ display: 'none', visibility: 'hidden' }} />
          </noscript>
        )}
        <PageViewTracker />
        {children}
      </body>
    </html>
  );
}
```

3. If the site has a Content-Security-Policy, allow `www.googletagmanager.com`, `connect.facebook.net`, `www.facebook.com` and `tracking.lessoncomputer.mu` for scripts, images and connections.
4. Remove any copy of the old WordPress snippet (GTM-K9WPDXKM) or old pixel code if one was pasted into the new site.

## Step 2 — Tracking helper and page views

Use one small helper for every event so the names and shape never drift. It also clears the previous `ecommerce` object, which GA4 requires.

`lib/track.ts`

```ts
type UserData = { email?: string; phone?: string; first_name?: string; last_name?: string };

export function track(event: string, data: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return;
  const w = window as any;
  w.dataLayer = w.dataLayer || [];
  if ('ecommerce' in data) w.dataLayer.push({ ecommerce: null });
  w.dataLayer.push({ event, event_id: crypto.randomUUID(), ...data });
}

export type { UserData };
```

Next.js changes pages without a full reload, so page views must be pushed on every route change. GA4 "history change" page views are switched off in the new property, so this component is the only source of page views (no doubles).

`components/PageViewTracker.tsx`

```tsx
'use client';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { track } from '@/lib/track';

function Inner() {
  const pathname = usePathname();
  const search = useSearchParams();
  useEffect(() => {
    track('page_view', {
      page_location: window.location.href,
      page_path: pathname,
      page_title: document.title,
    });
  }, [pathname, search]);
  return null;
}

export default function PageViewTracker() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
```

Rules for every push:

- Push only after the action really succeeded (form saved, payment confirmed), never on button click.
- Personal data goes only inside `user_data` (email, phone, first and last name). GTM hashes it before anything leaves the browser. Never put it in other fields, URLs or page titles.
- Money is a number in MUR, for example `2500`, not `"Rs 2,500"`.

## Step 3 — The 12 events to push

GTM listens for exactly these names; anything else is ignored. The table follows the buying journey.

| dataLayer event | When to push | Meta event | GA4 event |
| --- | --- | --- | --- |
| `page_view` | Every page and route change (Step 2) | PageView | page\_view |
| `view_item` | A grade page opens, with the products it shows | ViewContent | view\_item |
| `watch_sample` | A free preview video starts playing (first play) | watch\_sample | watch\_sample |
| `add_to_cart` | "Subscribe" or "Buy" is clicked, even if it then sends the visitor to log in | AddToCart | add\_to\_cart |
| `sign_up` | Account created (email or Google), first time only | CompleteRegistration | sign\_up |
| `login` | Successful sign-in | (none) | login |
| `begin_checkout` | Payment step opens with the product chosen (after login, from `?buy=`) | InitiateCheckout | begin\_checkout |
| `add_payment_info` | Just before redirecting to MIPS | AddPaymentInfo | add\_payment\_info |
| `purchase` | Success page, after the server confirmed MIPS payment | Purchase | purchase |
| `generate_lead` | Contact form or course waitlist saved | Lead | generate\_lead |
| `whatsapp_click` | Any wa.me link or WhatsApp button is clicked | Contact | Contact |
| `newsletter_signup` | Footer "Subscribe" email form saved | newsletter\_signup | newsletter\_signup |

One product object is used by every commerce event:

```ts
// lib/track.ts (add below track)
export type Product = {
  item_id: string;        // live class id, video package id (e.g. the pkg= uuid) or lesson id
  item_name: string;      // e.g. 'G7 October 2026' or 'Grade 9 Video Package 1'
  item_category: 'live_class' | 'video_package' | 'video_lesson';
  item_category2: string; // grade slug, e.g. 'grade-9'
  price: number;          // MUR, e.g. 650
  quantity: 1;
};

export const cart = (items: Product[], extra: Record<string, unknown> = {}) => ({
  ecommerce: { currency: 'MUR', value: items.reduce((s, i) => s + i.price, 0), items, ...extra },
});
```

Exact code for each event:

```ts
import { track, cart } from '@/lib/track';

// Grade page, on mount: every paid product shown on the page
track('view_item', { grade: 'grade-9', ...cart(productsOnPage) });

// Free preview player, first play only
track('watch_sample', { grade: 'grade-9', video_title: lesson.title });

// "Subscribe" (live class) or "Buy" (video) onClick, BEFORE any redirect to /login
track('add_to_cart', { grade: 'grade-9', ...cart([product]) });

// After account creation (email sign-up AND first Google sign-in; not on later logins)
track('sign_up', { method: 'email', user_id: user.id, // or 'google'
  user_data: { email: user.email, phone: profile.phone, first_name: profile.firstName, last_name: profile.lastName } });

// After successful sign-in
track('login', { method: 'email', user_id: user.id });

// Payment step shown with the chosen product (the ?buy= flow after login)
track('begin_checkout', { user_id: user.id, user_data: { email: user.email }, ...cart([product]) });

// Right before redirecting to MIPS (after the order row is created)
track('add_payment_info', { user_id: user.id, ...cart([product], { payment_type: 'card' }) });

// Payment success page, ONLY when your server says the order is paid.
// event_id MUST be purchase_<order id>: the server sends the same id (Step 4) and Meta keeps one.
const key = `purchase_sent_${order.id}`;
if (order.status === 'paid' && !localStorage.getItem(key)) {
  track('purchase', {
    event_id: `purchase_${order.id}`,
    user_id: user.id,
    user_data: { email: user.email, phone: profile.phone, first_name: profile.firstName, last_name: profile.lastName },
    ...cart(order.items, { transaction_id: order.id }),
  });
  localStorage.setItem(key, '1'); // a refresh must not count a second sale
}

// Contact form or waitlist form, after it is saved
track('generate_lead', {
  lead_type: 'contact_form', // or 'waitlist'
  grade: form.grade,          // optional
  user_data: { email: form.email, phone: form.phone, first_name: form.firstName, last_name: form.lastName },
});

// Every WhatsApp link or button, onClick
track('whatsapp_click');

// Footer newsletter form, after it is saved (not a Lead)
track('newsletter_signup', { user_data: { email } });
```

Phone numbers can be in any format (`5915 1012`, `+230 5915 1012`); GTM adds 230 for local numbers. If an order holds several products, pass them all in `items`; the value is their total.

## Step 4 — Server-side Purchase (from the MIPS confirmation)

The browser Purchase is lost when a parent pays and closes the tab, or blocks trackers. So the server also tells Meta about every paid order, straight from the MIPS payment confirmation. Both use `event_id = purchase_<order id>`, so Meta counts the sale once.

1. Vercel environment variables (Production and Preview): `META_PIXEL_ID=1154933753197119`, `META_CAPI_ACCESS_TOKEN=<from Shoheb, secret>`. Preview only: `META_TEST_EVENT_CODE=TEST27148`.
2. Supabase migration on the orders table: `tracking jsonb` and `meta_capi_sent_at timestamptz`.
3. When the order is created (before the MIPS redirect), save the visitor's tracking details on it.
4. In the MIPS confirmation handler, after the payment is verified as paid, call `sendMetaPurchase` once.

```ts
// When creating the order (route handler / server action)
import { cookies, headers } from 'next/headers';
const c = await cookies(); const h = await headers();
const tracking = {
  fbp: c.get('_fbp')?.value,
  fbc: c.get('_fbc')?.value,
  ip: h.get('x-forwarded-for')?.split(',')[0]?.trim(),
  ua: h.get('user-agent'),
  page_url: h.get('referer'),
};
// save `tracking` on the new order row
```

```ts
// lib/meta-capi.ts (server only)
import crypto from 'crypto';

const GRAPH = 'v24.0'; // confirm the current Graph API version when implementing
const sha = (v?: string | null) =>
  v ? crypto.createHash('sha256').update(v.trim().toLowerCase()).digest('hex') : undefined;
const phoneHash = (p?: string | null) => {
  if (!p) return undefined;
  let d = p.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 7 || d.length === 8) d = '230' + d;
  return d.length >= 8 ? sha(d) : undefined;
};
const arr = (v?: string) => (v ? [v] : undefined);

export async function sendMetaPurchase(order: any, user: any, profile: any) {
  if (order.meta_capi_sent_at) return; // already sent: never twice
  const t = order.tracking ?? {};
  const items = order.items as { item_id: string; item_category: string; price: number; quantity: number }[];
  const body: any = {
    data: [{
      event_name: 'Purchase',
      event_time: Math.floor(new Date(order.paid_at ?? Date.now()).getTime() / 1000),
      event_id: `purchase_${order.id}`,
      action_source: 'website',
      event_source_url: t.page_url,
      user_data: {
        em: arr(sha(user.email)), ph: arr(phoneHash(profile?.phone)),
        fn: arr(sha(profile?.firstName)), ln: arr(sha(profile?.lastName)),
        country: arr(sha('mu')), external_id: arr(sha(user.id)),
        client_ip_address: t.ip, client_user_agent: t.ua, fbp: t.fbp, fbc: t.fbc,
      },
      custom_data: {
        currency: 'MUR', value: order.amount, order_id: String(order.id),
        content_type: 'product', content_category: items[0]?.item_category,
        content_ids: items.map(i => String(i.item_id)),
        contents: items.map(i => ({ id: String(i.item_id), quantity: i.quantity, item_price: i.price })),
        num_items: items.length,
      },
    }],
  };
  if (process.env.VERCEL_ENV !== 'production' && process.env.META_TEST_EVENT_CODE) {
    body.test_event_code = process.env.META_TEST_EVENT_CODE; // staging goes to Test events only
  }
  const res = await fetch(
    `https://graph.facebook.com/${GRAPH}/${process.env.META_PIXEL_ID}/events?access_token=${process.env.META_CAPI_ACCESS_TOKEN}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
  );
  if (!res.ok) { console.error('Meta CAPI purchase failed', order.id, await res.text()); return; }
  // set orders.meta_capi_sent_at = now() for this order
}
```

Never let a Meta error block the payment flow: log it and move on. The access token is a password: Vercel environment variables only, never in GitHub, never in the browser.

## Step 5 — Test on staging

On test-development.xyz nothing is sent unless GTM Preview is open, so testing is safe.

1. Deploy the code above to staging.
2. In Tag Manager, open container GTM-PS78S8GC and click **Preview**. Enter `https://test-development.xyz` and connect.
3. Walk the journey: home, a grade page, a free preview video, Subscribe (logged out), register with email and with Google, login, payment step, a MIPS sandbox payment for a live class and one for a video package, the contact form, a waitlist, a WhatsApp button, the newsletter.
4. In the Tag Assistant window, check each event: "Meta Pixel - Browser" and "GA4 - Event" both fired, and `event_id` is the same in both.
5. In Meta Events Manager → Lesson Computer Pixel by Chamok → **Test events**, the server events should appear with code TEST27148. Each should show as browser and server, de-duplicated.
6. In GA4 (new property) → Admin → **DebugView**, the same events should arrive with MUR values on `purchase`.

Known staging limit: Meta only accepts browser pixel events from lessoncomputer.mu (traffic allowlist), so browser events from test-development.xyz may show as blocked. That is expected; server events and the GTM Preview checks prove the setup. Browser events are confirmed on launch day.

## Definition of done

The job is finished only when every box is ticked on staging.

- [ ] Only one tracking script in the page source: GTM-PS78S8GC (plus Vercel Analytics)
- [ ] All 12 events fire in GTM Preview at the right moment, each with one Meta tag and one GA4 tag
- [ ] Route changes give exactly one `page_view` each, never two
- [ ] `view_item`, `add_to_cart`, `begin_checkout`, `add_payment_info` and `purchase` carry `items` with `item_category` and a numeric MUR `value`
- [ ] `purchase` has `transaction_id` = order id and `event_id` = `purchase_<order id>`
- [ ] A refreshed success page does not send a second `purchase`
- [ ] A sandbox payment where the browser tab is closed before the success page still shows a server Purchase in Meta Test events
- [ ] In Meta Test events, Purchase shows browser and server, de-duplicated, with email and phone matched
- [ ] Google sign-up sends `sign_up` once; later Google logins send only `login`
- [ ] No email, phone or name appears anywhere except inside `user_data`
- [ ] The access token is only in Vercel environment variables
- [ ] Report delivered: event, file and line for each push

## Launch-day checklist

Before launch, add META\_CAPI\_ACCESS\_TOKEN to Vercel Production. Then do these in order on the day lessoncomputer.mu moves from WordPress to the new site. No tracking code changes are needed: the live domain switches tracking on by itself.

- [ ] Staging tests in Step 5 and the Definition of done all passed
- [ ] GTM container GTM-PS78S8GC published (done 1 Oct 2026, version 1)
- [ ] Point lessoncomputer.mu to Vercel; WordPress (and its old container GTM-K9WPDXKM) stops loading at the same moment
- [ ] Within 1 hour: Meta Events Manager shows PageView from lessoncomputer.mu as browser + server, de-duplicated
- [ ] Within 1 hour: GA4 new property → Realtime shows visitors
- [ ] Do one real test enquiry; Lead arrives in Meta with email and phone matched
- [ ] Recreate Meta website audiences on the new event names (ViewContent, AddToCart, InitiateCheckout, Purchase, Lead, Contact). Audiences built on old WordPress events such as enroll\_now\_click will stop growing
- [ ] Day 7: check Event Match Quality for Lead and Purchase is 6 or higher
- [ ] Day 30: pause the old WordPress container in GTM (do not delete it, it holds the history)

The current WhatsApp ad campaigns do not depend on the website, so they keep running unchanged through the switch.
