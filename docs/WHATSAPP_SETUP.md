# Configuring WhatsApp for Parent Broadcasts & Reports

The app sends parent messages through the **official WhatsApp Cloud API** (Meta). This guide
gets broadcasts and individual reports actually delivering.

There are two layers:
1. **Credentials** — so the server can call WhatsApp at all.
2. **Message templates** — required by WhatsApp to message a parent who hasn't messaged you
   in the last 24 hours (which is almost always the case for reports/announcements).

---

## Part 1 — Credentials (required)

The server reads two environment variables (already used by the existing parent-contact flow):

| Variable | Where to get it |
| --- | --- |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta → WhatsApp → API Setup → "Phone number ID" |
| `WHATSAPP_ACCESS_TOKEN` | A **permanent** access token (see below) |

### Steps
1. Go to <https://developers.facebook.com> → create/select an app of type **Business**.
2. Add the **WhatsApp** product. Under **API Setup** you'll see a test phone number and a
   temporary token — good for a quick test, but the token **expires in 24h**.
3. Register/verify **your own business phone number** (production sending).
4. Create a **permanent** token:
   - Go to **Business Settings → Users → System Users** → add a System User (Admin).
   - Assign your WhatsApp app to it, then **Generate token** with the
     `whatsapp_business_messaging` and `whatsapp_business_management` permissions.
   - Copy it — this is your `WHATSAPP_ACCESS_TOKEN`.
5. In **Vercel → your project → Settings → Environment Variables**, add both variables for
   **Production** (and Preview if you want to test there). Redeploy.

Once set, **Admin → Parent Groups → Broadcast** will attempt to send. If credentials are
missing, the app returns "WhatsApp is not configured" instead of sending.

---

## Part 2 — Message templates (required for real broadcasts)

WhatsApp only lets a business send **free-form text** within **24 hours** of the parent last
messaging your number. Since parents won't have messaged you first, a broadcast or report is a
**business-initiated** message and must use a **pre-approved template**.

> Without templates, broadcasts will only reach parents who happen to have messaged your
> WhatsApp number in the last 24h — i.e. almost none. This is a WhatsApp rule, not an app bug.

### Steps
1. In **Meta → WhatsApp → Manage templates** (or Business Manager → WhatsApp Manager →
   Message Templates), click **Create template**.
2. Pick a category — **Utility** (e.g. student reports, class notices) is usually cheapest and
   fastest to approve; **Marketing** for promotional messages.
3. Give it a name (e.g. `parent_report`) and a body with variables, e.g.:
   ```
   Hello, this is a message from Lesson Computer regarding {{1}}:

   {{2}}
   ```
   Here `{{1}}` could be the student's name and `{{2}}` the report/announcement text.
4. Submit for review. Approval is usually minutes to a few hours for Utility templates.
5. Tell me the **template name** and its **variable order**, and I'll switch the sender from
   free-form text to that template so broadcasts/reports deliver reliably to any parent.

### Also required
- **Opt-in**: WhatsApp requires that parents agreed to be contacted. Collecting their number to
  join live classes is a reasonable basis, but make the purpose clear at collection time.
- **Cost**: WhatsApp charges per conversation (varies by country/category). Utility templates are
  the cheapest tier.

---

## How the app uses this

- **Parent Groups → Broadcast to all parents** — sends your message 1-to-1 (privately) to every
  parent in the grade's cohort.
- **Parent Groups → Send report** (per parent) — sends privately to that one parent.
- **Live-class enrolment** — when a student submits their parent's number, the parent is added to
  their grade's current-year cohort and (if you set a group invite link) sent that link to
  self-join the real WhatsApp group.

> Reminder: the WhatsApp API cannot add anyone to a group or post to a group — that's why the app
> sends 1-to-1 messages and an invite link, rather than posting in a group.
