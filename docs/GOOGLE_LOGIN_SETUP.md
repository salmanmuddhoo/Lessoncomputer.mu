# Enabling "Sign in with Google" — Step-by-Step

This guide walks you through everything needed to make the **Sign in / Sign up with Google**
buttons work on LessonComputer.mu.

The code is already deployed. Google login will **not work until you complete the two
dashboard configurations below** (Google Cloud + Supabase). Until then, email/password
login keeps working normally and the Google button just shows a friendly error.

You will need:
- Access to your **Supabase** project dashboard.
- A **Google account** with access to [Google Cloud Console](https://console.cloud.google.com).

Total time: ~15 minutes.

---

## Overview

There are two systems to connect:

1. **Google Cloud** issues you a *Client ID* and *Client Secret*, and needs to know
   which URL to send users back to after they log in.
2. **Supabase** stores that Client ID/Secret and does the actual sign-in.

They point at each other, so we set up Google Cloud first, then paste its values into
Supabase.

---

## Part 0 — Find your Supabase callback URL (write this down)

You'll need this URL in Part 1.

1. Open your Supabase project dashboard.
2. Go to **Authentication** → **Sign In / Providers** (older UI: **Authentication → Providers**).
3. Click **Google** to expand it.
4. Near the bottom you'll see a field labelled **Callback URL (for OAuth)**. It looks like:

   ```
   https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
   ```

   > `YOUR-PROJECT-REF` is the random ID of your project — e.g. `abcd1234efgh5678`.
   > You can also see it in the browser address bar of your Supabase dashboard, or under
   > **Project Settings → General → Reference ID**.

5. **Copy this exact URL** — you'll paste it into Google in Part 1, Step 7.

---

## Part 1 — Create Google OAuth credentials

### Step 1: Open Google Cloud Console
Go to <https://console.cloud.google.com> and sign in.

### Step 2: Select or create a project
- Click the project dropdown at the top of the page.
- Either pick an existing project, or click **New Project**, name it (e.g. `LessonComputer`),
  and click **Create**. Wait a few seconds, then make sure the new project is selected.

### Step 3: Configure the OAuth consent screen
Google requires this before you can create credentials.

1. In the left menu (or the search bar), go to **APIs & Services** → **OAuth consent screen**.
2. Choose **External** user type, then click **Create**.
3. Fill in the required fields:
   - **App name**: `LessonComputer.mu`
   - **User support email**: your email.
   - **App logo** (optional): you can add it later.
   - **Application home page**: `https://lessoncomputer.mu` (or your production domain).
   - **Developer contact email**: your email.
4. Click **Save and Continue**.
5. On the **Scopes** step, you don't need to add anything — click **Save and Continue**.
6. On the **Test users** step, click **Save and Continue** (see "Publishing" note below).
7. Review and go **Back to Dashboard**.

> **Important — Publishing status.** While the consent screen is in **"Testing"** mode,
> only email addresses you add under **Test users** can log in with Google. Once you're
> ready for all students to use it, click **Publish App** on the OAuth consent screen and
> confirm. For the basic email/profile scopes we use, Google does **not** require a full
> verification review, so publishing is instant.

### Step 4: Create the OAuth Client ID
1. Go to **APIs & Services** → **Credentials**.
2. Click **+ Create Credentials** → **OAuth client ID**.
3. **Application type**: choose **Web application**.
4. **Name**: `LessonComputer Web` (this is just a label for you).

### Step 5: Add Authorized JavaScript origins
Under **Authorized JavaScript origins**, click **+ Add URI** and add each of these
(add every domain you actually use):

```
https://lessoncomputer.mu
https://www.lessoncomputer.mu
https://lessoncomputer-mu.vercel.app
http://localhost:3000
```

> Add `http://localhost:3000` only if you test Google login locally. Remove any domain
> you don't use.

### Step 6: Add the Authorized redirect URI  ← the critical one
Under **Authorized redirect URIs**, click **+ Add URI** and paste the **Supabase callback
URL** you copied in Part 0:

```
https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback
```

> This must match **exactly** — no trailing slash, correct project ref. A mismatch is the
> #1 cause of a `redirect_uri_mismatch` error.

### Step 7: Create and copy your credentials
1. Click **Create**.
2. A dialog shows your **Client ID** and **Client secret**.
3. **Copy both.** (You can always find them again later under **Credentials** → your OAuth client.)

---

## Part 2 — Enable Google in Supabase

1. Back in your Supabase dashboard, go to **Authentication** → **Sign In / Providers**.
2. Click **Google** to expand it.
3. Toggle **Enable Sign in with Google** to **ON**.
4. Paste your **Client ID** into the **Client ID** field.
5. Paste your **Client Secret** into the **Client Secret (for OAuth)** field.
6. Leave **Skip nonce checks** off unless you have a specific reason.
7. Click **Save**.

---

## Part 3 — Check your redirect URL allowlist

Supabase only redirects back to URLs you've allowlisted after login.

1. In Supabase, go to **Authentication** → **URL Configuration**.
2. Set **Site URL** to your production domain:
   ```
   https://lessoncomputer.mu
   ```
3. Under **Redirect URLs**, click **Add URL** and add each domain the app runs on:
   ```
   https://lessoncomputer.mu/**
   https://www.lessoncomputer.mu/**
   https://lessoncomputer-mu.vercel.app/**
   http://localhost:3000/**
   ```
   > The `/**` wildcard allows the `/api/auth/callback` path the app redirects to after login.
4. Click **Save**.

---

## Part 4 — Test it

1. Open your site (e.g. <https://lessoncomputer.mu/login>) in a **private/incognito** window.
2. Click **Sign in with Google** (or **Sign up with Google**).
3. Choose a Google account and approve.
4. Expected behaviour:
   - **A brand-new user** is taken to the **"Almost there!"** onboarding screen to pick their
     grade, then lands on the dashboard.
   - **A returning user who already has a grade** goes straight to the dashboard.

> Why the extra step? Email sign-up asks for the student's **grade** during registration.
> Google login can't collect that, so the app asks for it once, right after the first Google
> login. A grade is mandatory for the dashboard to work correctly.

---

## Troubleshooting

| Symptom | Likely cause & fix |
| --- | --- |
| `redirect_uri_mismatch` error from Google | The **Authorized redirect URI** in Google (Part 1, Step 6) doesn't exactly match your Supabase callback URL. Re-copy it from Supabase (Part 0) — watch for a missing/extra `/` or wrong project ref. |
| "Access blocked: app not verified" or only your own account works | The OAuth consent screen is still in **Testing** mode. Add the tester under **Test users**, or click **Publish App** (Part 1, Step 3). |
| Button shows a generic error toast immediately | Google provider isn't enabled in Supabase, or Client ID/Secret is missing/incorrect (Part 2). |
| Login succeeds but you land back on `/login` | The redirect URL isn't allowlisted in Supabase **URL Configuration** (Part 3). |
| User logs in but has no name | Google returns the profile name automatically; the app backfills it. If it's still missing, the student can edit it on the onboarding screen. |

---

## What the code already does (no action needed)

- Shows **Sign in / Sign up with Google** buttons on the login and register pages.
- After Google login, sends users to `/api/auth/callback`, which saves their Google
  profile name.
- Forces new Google users through a one-time **grade onboarding** screen (`/onboarding`)
  before they can use the dashboard.
- Leaves email/password sign-up completely unchanged (grade is still captured at
  registration).

Once Parts 1–3 are done, Google login is live for your students.
