# Accounts, Digital SIM and Blockvile AI — setup (about 15 minutes)

These three features use **Supabase** (free plan is fine). Until you do this, Blockvile still works fully — people just can't sign in, and the Digital SIM stays hidden (it only exists for signed-in users).

## 1. Make the project and the database
1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, press **Run**. (Safe to run again.)
   This makes the tables for devices, SIMs and messages, locks them to each signed-in user, and adds the functions that charge the SIM and send messages.

## 2. Connect Blockvile to it
1. **Project Settings → API**: copy the **Project URL** and the **anon / publishable key**.
2. Paste them into `web/js/config.js` (`supabase.url` and `supabase.anonKey`), then rebuild with `python3 tools/build-single-file.py`.
   - The anon key is meant to be public. **Never paste the `service_role` key** — Blockvile refuses it.
   - Not ready to edit the file? Open **Accounts → Setup** in the app and paste them there (saved on that device only).

## 3. Sign-in methods
Open **Authentication → URL Configuration** and set **Site URL** to your website address. Under **Redirect URLs** add:
- your website address (e.g. `https://yourname.github.io/blockvile-plus-os/`)
- `blockvile://auth` (for the Android app)

**Any email address (custom email):** works straight away (Authentication → Providers → Email). Supabase emails a confirmation link; you can switch confirmation off while testing.

**Google:** Google Cloud Console → *APIs & Services → Credentials → Create OAuth client ID (Web application)*. Add the redirect URI shown in Supabase (Providers → Google, it ends in `/auth/v1/callback`), then paste the client ID and secret into Supabase and switch Google on.
- *Google services:* in the same project enable the **Gmail API, Google Calendar API and Google Drive API**. Blockvile asks for **read-only** access, and only when the user taps "Link Google mail, calendar & files".
- Gmail and Drive read access are "restricted" scopes: while your Google app is in **Testing** you can add up to 100 test users; to let anyone use them, Google requires app verification. Plain Google sign-in (email and name) needs no verification.

**Microsoft:** Azure Portal → *App registrations → New registration*. Choose "Accounts in any organizational directory and personal Microsoft accounts". Add the same Supabase callback URI as a **Web** redirect, create a **client secret** (copy its *Value*), then paste the Application (client) ID and secret into Supabase → Providers → **Azure** and switch it on. Add the Graph permissions **User.Read, Mail.Read, Calendars.Read, Files.Read** (delegated). Some company tenants need an admin to approve them.

## 4. Blockvile AI (optional)
Device commands ("open notes", "dark mode on", "switch to laptop mode") work with no setup. For general questions the AI needs a small server function so your AI key never ships inside the app:
```
npm i -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase functions deploy ai
```
Only signed-in users can call it. Using it costs whatever your AI key costs — you can cap that in your AI provider's dashboard.

## Feedback
The Feedback app sends to the form service in `web/js/config.js` (`feedback.endpoint`) **and**, if Supabase is connected, saves each message to the `feedback` table (anyone can send, nobody can read it through the app). Read them in **Supabase → Table Editor → feedback**. Re-run `schema.sql` to create the table.

## What the Digital SIM is (and isn't)
- Every signed-in account gets a **Blockvile number** like `BV 4821 7730`. People with an account can message each other's numbers.
- It **banks Wi-Fi data too**: +5 MB a minute on Wi-Fi, up to 500 MB. When Wi-Fi is off or unavailable, each SIM message spends 2 MB of that bank (on Wi-Fi they cost no data). With no connection at all, messages wait in an outbox and send when the device is back online. **If you already ran `schema.sql` earlier, run the new one again** — it adds the data bank safely.
- It **charges 1% a minute while the device is on Wi-Fi** (Android app: the phone must really be on Wi-Fi/Ethernet; browser: the connection must not report cellular). Each message uses 2%.
- It is **not a phone-company SIM**: it can't call or text normal phone numbers. The banked "Wi-Fi data" is an allowance for Blockvile's own SIM messages — it can't create internet. Off Wi-Fi, the message still travels over the phone's own mobile data. A real SIM or eSIM can only come from a mobile carrier. Say this clearly in your store listing so nobody is misled.
- Charge and messages are enforced by the database functions, not by the app, so editing the app can't give free charge.

## Privacy and Google Play
Accounts mean you now store personal data (email, name, device names, SIM number, messages) on your Supabase project. `web/privacy.html` and `store-listing/listing.md` were updated to say so — check them, then fill the Play **Data safety** form to match.
