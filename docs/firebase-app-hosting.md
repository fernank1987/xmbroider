# Firebase App Hosting migration (xmbroider.com)

Stage 2 config only. **Do not** merge to production, deploy, create an App Hosting
backend, upload secrets, or change DNS/Vercel from this document until a named GO
for stages 3–5.

- Firebase project: `xmbroider-production` (number `640667549080`)
- Firestore: default `(default)`, location **`nam5`**
- Current production: Vercel project `xmbroider`, SHA `2540b2c`, Node **24.x**
- Target: Firebase App Hosting (SSR Next.js 16.2.9), not static Firebase Hosting

Related: Stage 1 inventory (handoff, not in this repo),
[`FIREBASE_STORAGE_CORS.md`](./FIREBASE_STORAGE_CORS.md),
[App Hosting configure](https://firebase.google.com/docs/app-hosting/configure),
[custom domains / Migrate a domain](https://firebase.google.com/docs/app-hosting/custom-domain),
[frameworks and runtimes](https://firebase.google.com/docs/app-hosting/frameworks-tooling).

---

## Node runtime

`package.json` `engines.node` is pinned to **`22`**.

App Hosting runs on Cloud Run and documents **Node.js 22 and higher**. Automatic
Base Image Updates (ABIU) use even-numbered versioned runtimes (`nodejs22` or
`nodejs24`). The `engines` field must be compatible with the backend runtime
selected at backend-create time or Cloud Build fails.

| Place | Version |
|---|---|
| Vercel project today | **24.x** |
| App Hosting supported | **22+** (even-numbered for ABIU: 22, 24) |
| This repo pin | **22** (current Node LTS; Next 16.2.9 supports it) |

**Stage 3:** when creating the backend, select **`nodejs22`** (and leave ABIU on)
so it matches `engines`. `nodejs24` is also supported if we later want to match
Vercel; do not pick 24 while `engines` says `22`.

Next.js **16.2.9** is newer than App Hosting’s documented “active” Next line
(15.2.x as of 2026-11-18). 16.x is expected to build (16.2 is the Deployment
Adapter baseline) but is **preview / best-effort** until Firebase marks it
active. Smoke this on `*.hosted.app` in stage 4 before DNS.

---

## `apphosting.yaml`

- `runConfig.minInstances: 0` — default; required so the Cloud Run no-cost
  allowances can apply at ~3k invocations/month.
- `runConfig.maxInstances: 2` — spend cap. Default is 100; this site’s traffic
  does not need that, and quote/composite routes use `sharp` + Admin SDK.
  Raise only if stage 4 shows queued exports.
- CPU / memory / concurrency: **omitted** (App Hosting defaults: 1 CPU, 512 MiB, 80).
- No `firebase.json` App Hosting `backendId` yet — the backend does not exist.

---

## Environment mapping

Values are **not** stored in git except the four public Firebase project
identifiers below. Create Secret Manager secrets in stage 3 with
`firebase apphosting:secrets:set <NAME> --project xmbroider-production`
and grant the App Hosting service agent access (the `secrets:set` flow prompts).

`NEXT_PUBLIC_*` need **BUILD** (Next inlines them into the client bundle) and
**RUNTIME** (server routes also read `process.env.NEXT_PUBLIC_*`). Server-only
keys are **RUNTIME** only.

**Admin allowlist choice:** canonical name is `NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST`
(what the code and `.env.local.example` already used). Vercel today has
`NEXT_PUBLIC_ADMIN_EMAILS` and does **not** have the canonical name — that
mismatch previously fail-opened admin to any signed-in Firebase user. Code now
**fails closed** when both are empty, and accepts `NEXT_PUBLIC_ADMIN_EMAILS` as
a fallback so Vercel keeps working until cutover. App Hosting should set **only**
the canonical name (copy the Vercel `NEXT_PUBLIC_ADMIN_EMAILS` value into
`NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST`).

Firebase docs warn not to prefix Secret Manager values with `NEXT_PUBLIC_`.
We still do for keys the browser must see (Firebase web config, Turnstile site
key, admin allowlist): Secret Manager keeps them out of git; Next still inlines
them at build. The **server** allowlist check on `/api/admin/*` is the
authoritative control for that API.

Every listed secret **must exist** before the first App Hosting rollout or Cloud
Build/rollout will fail the missing reference. Optional unused keys can be an
empty string.

| Vercel name | App Hosting | Kind | Availability | Notes |
|---|---|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | `NEXT_PUBLIC_FIREBASE_API_KEY` | **secret** | BUILD + RUNTIME | Web API key (public in the client bundle; keep out of git) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | **value** `xmbroider-production.firebaseapp.com` | BUILD + RUNTIME | Public |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | **value** `xmbroider-production` | BUILD + RUNTIME | Public |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | **value** `xmbroider-production.firebasestorage.app` | BUILD + RUNTIME | Public |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | **value** `640667549080` | BUILD + RUNTIME | Public project number |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | `NEXT_PUBLIC_FIREBASE_APP_ID` | **secret** | BUILD + RUNTIME | Web app ID |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | **secret** | BUILD + RUNTIME | Optional Analytics |
| `NEXT_PUBLIC_ADMIN_EMAILS` | *(do not set on App Hosting)* | — | — | Vercel-only name. Copy its value into the canonical secret |
| *(not on Vercel)* `NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST` | `NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST` | **secret** | BUILD + RUNTIME | Canonical allowlist. Empty/unset ⇒ **no one is admin** |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | `FIREBASE_SERVICE_ACCOUNT_JSON` | **secret** | RUNTIME | Admin SDK JSON, single line |
| `RESEND_API_KEY` | `RESEND_API_KEY` | **secret** | RUNTIME | |
| `QUOTE_NOTIFICATION_EMAIL` | `QUOTE_NOTIFICATION_EMAIL` | **secret** | RUNTIME | |
| `QUOTE_FROM_EMAIL` | `QUOTE_FROM_EMAIL` | **secret** | RUNTIME | |
| `SEND_CUSTOMER_QUOTE_CONFIRMATION` | `SEND_CUSTOMER_QUOTE_CONFIRMATION` | **secret** | RUNTIME | `"true"` / unset. Unknown prod value; copy from Vercel |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | **secret** | BUILD + RUNTIME | Public widget key; keep out of git |
| `TURNSTILE_SECRET_KEY` | `TURNSTILE_SECRET_KEY` | **secret** | RUNTIME | |

Console env vars **override** `apphosting.yaml` if both are set.

---

## Host-header findings (App Hosting)

App Hosting / Cloud Run sets `Host` to the Cloud Run service URL. The public
hostname is on **`x-forwarded-host`** (see the [App Hosting wildcard-domain
note](https://firebase.blog/posts/2024/07/app-hosting-updates/)).

| Location | Reads Host / origin? | Change |
|---|---|---|
| No `middleware.ts` at `2540b2c` | — | Added Next 16 `src/proxy.ts`: copies `x-forwarded-host` → `Host` when present |
| `src/lib/siteSeo.ts` | Hardcoded `https://xmbroider.com` | None (canonical/OG/metadataBase already ignore Host) |
| `src/app/robots.ts`, `sitemap.ts` | Use `SITE_ORIGIN` | None |
| `next.config.ts` redirects | Path-only, relative destinations | **Not changed** (stage 2 rule) |
| `/api/preview-image-data` | `request.url` for search params; `hostname` checks are **Storage** hosts (`firebasestorage.googleapis.com` / `storage.googleapis.com`), not the site | Uses `getRequestUrl()` so origin is the public host if later code needs it |
| `/api/quote-request`, `/api/preview-composite` | `x-forwarded-for` / `x-real-ip` only | None |
| Turnstile (`src/lib/turnstile.ts`) | No hostname check in code. Cloudflare Siteverify uses the **widget** hostname from the browser | Stage 4: allow `xmbroider.com`, `www.xmbroider.com`, and the `*.hosted.app` URL in the Turnstile dashboard |
| CORS / Origin | No API origin allowlist in code | Storage CORS is a bucket config, not Host-header code (stage 4) |
| `toAbsoluteAssetUrl` | Browser `window.location.origin` | None (client) |
| Admin API | `Authorization` only | None |

Helper: `src/lib/requestHost.ts` (`getRequestHost` prefers `x-forwarded-host`).

---

## Admin allowlist + API

- Client guard (`AdminAuthProvider`) and server `verifyAdminRequest` share
  `isAdminEmailAllowed`.
- Empty/unset allowlist ⇒ **fail closed** (previously fail-open).
- Only admin Route Handler today: `DELETE /api/admin/quote-requests/[quoteRequestId]`.
  It already called `verifyAdminRequest`; fail-closed applies there. Empty
  allowlist returns **403** `"Admin allowlist is not configured."`
- Other admin writes go through the **Firebase client SDK** + Firestore/Storage
  rules (`allow write: if request.auth != null`). Tightening those rules to the
  email allowlist is **out of scope** (rules live in the Firebase console, not
  this Next app). Do not treat the UI guard as sufficient after cutover if
  arbitrary Auth users exist.

---

## Stage 3 — GitHub connection, backend, secrets (no custom domain)

Do this only with a GO. Do **not** run these from the Stage 2 PR.

1. Firebase Console → App Hosting → **Create backend** on
   `xmbroider-production`.
2. **Region near Firestore `nam5`:** `us-central1` or `us-east4` (both US).
   Prefer `us-central1` unless there is a reason not to.
3. Connect GitHub repo `fernank1987/xmbroider`. Live branch: decide `main`
   vs a staging branch; do not auto-roll out this draft PR to production.
4. Root directory `/`. Runtime **`nodejs22`**, ABIU on.
5. Link the existing web app `xmbroider-production`
   (`1:640667549080:web:76d03805bd4d3ae8c23fed`) so
   `FIREBASE_WEBAPP_CONFIG` is populated (still set the `NEXT_PUBLIC_*` keys;
   the app reads those names, not the auto JSON).
6. Create every secret in the table (except the four `value:` keys):

   ```bash
   firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_API_KEY --project xmbroider-production
   firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_APP_ID --project xmbroider-production
   firebase apphosting:secrets:set NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID --project xmbroider-production
   firebase apphosting:secrets:set NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST --project xmbroider-production
   firebase apphosting:secrets:set NEXT_PUBLIC_TURNSTILE_SITE_KEY --project xmbroider-production
   firebase apphosting:secrets:set FIREBASE_SERVICE_ACCOUNT_JSON --project xmbroider-production
   firebase apphosting:secrets:set RESEND_API_KEY --project xmbroider-production
   firebase apphosting:secrets:set QUOTE_NOTIFICATION_EMAIL --project xmbroider-production
   firebase apphosting:secrets:set QUOTE_FROM_EMAIL --project xmbroider-production
   firebase apphosting:secrets:set SEND_CUSTOMER_QUOTE_CONFIRMATION --project xmbroider-production
   firebase apphosting:secrets:set TURNSTILE_SECRET_KEY --project xmbroider-production
   ```

   Copy values from the Vercel project (names only differ for the admin
   allowlist). `secrets:set` prompts to grant access; if a secret was created
   in GCP instead:

   ```bash
   firebase apphosting:secrets:grantaccess SECRET_NAME --project xmbroider-production
   ```

7. Do **not** add a custom domain yet. Note the `*.hosted.app` URL.
8. Confirm Cloud Run `minInstances` is 0 after the first rollout.
9. Optional: budget alert / Cloud Run spend cap on the Blaze project.

---

## Stage 4 — `*.hosted.app` smoke (before DNS)

Treat the preview URL as internal (no Vercel Deployment Protection).

Storage CORS ([`FIREBASE_STORAGE_CORS.md`](./FIREBASE_STORAGE_CORS.md)): add the
`https://<backend>.hosted.app` origin **and** keep `https://xmbroider.com`.
Do not drop the production origin before cutover.

Turnstile dashboard: allow the `hosted.app` hostname in addition to
`xmbroider.com` / `www.xmbroider.com`.

Smoke list:

- [ ] Home / products / product detail / preview render
- [ ] Quote form submit → Firestore `sites/xmbroider/quoteRequests/...`
- [ ] Resend admin email (and customer confirmation if that flag is `"true"`)
- [ ] Turnstile (no silent bypass in production)
- [ ] Images: `next/image` + `sharp`; product photos from Storage
- [ ] Logo preview composite (`/api/preview-composite`, Admin SDK + sharp)
- [ ] Admin: sign-in, allowlist deny for a non-listed user, listed user OK
- [ ] Admin quote delete (`DELETE /api/admin/quote-requests/...`)
- [ ] `next.config.ts` WordPress redirects (`/home`, `/shop`, `/product/...`, etc.)
- [ ] `https://www…` is **not** in play yet; www→apex is a **domain-add checkbox**
      in stage 5 (replicate today’s Vercel **308**)
- [ ] `robots.txt` / `sitemap.xml` still use `https://xmbroider.com`
- [ ] Cold start with `minInstances: 0` acceptable

---

## Stage 5 — DNS at Bluehost (named GO only)

DNS is the **Bluehost zone** (`ns1.bluehost.com` / `ns2.bluehost.com`). Registrar
of record is **Network Solutions**. **DNSSEC is on** — leave NS and DS alone.
Edit records in Bluehost → Advanced DNS / Zone Editor.

Official flow: **Migrate a domain**, not “connect a new domain”
([docs](https://firebase.google.com/docs/app-hosting/custom-domain)). Wait until
ownership is active **and** the cert is minted **before** switching apex A / www
CNAME. FairwayRoster hit HTTPS downtime by switching too early.

Exact `fah-claim` TXT, `_acme-challenge` CNAME targets, and Firebase A values
come from the console wizard. Do not guess IPs.

### Lower TTL first

On **only** apex **A** and **www CNAME** (both TTL **14400** today): set TTL
**300**. Wait **at least 4 hours**. Do not change targets yet. Leave MX / mail
TTLs alone.

### Prepare / mint cert (traffic stays on Vercel)

1. App Hosting → backend → Settings → Add custom domain → `xmbroider.com`
2. Add `www.xmbroider.com` with **redirect to apex** (today’s 308)
3. Choose **Migrate a domain**
4. Add **only** what the wizard shows for Prepare domain, typically:
   - Apex **TXT** `fah-claim=[UUID]` — **add**, do not replace SPF or
     `google-gws-recovery-domain-verification=72318161`
   - **CNAME** on `_acme-challenge` (or the host the wizard prints) — **keep
     after cutover** or cert renewal lapses
5. No apex AAAA today; nothing to remove
6. CAA is empty; if the wizard asks, allow `letsencrypt.org` and `pki.goog`
7. Verify records. Wait until cert is minted / domain prepared (up to 24h).
   **Do not** change apex A (`216.150.1.1`) or www CNAME
   (`f59aed66988717f0.vercel-dns-016.com`) in this step.

### Direct traffic (only after cert is active)

1. Apex **A**: replace `216.150.1.1` with the Firebase IPv4(s). Do not mix
   Vercel + Firebase A records.
2. **www** CNAME: replace `f59aed66988717f0.vercel-dns-016.com` with the
   Firebase target.
3. Keep `fah-claim` TXT and `_acme-challenge` CNAME.
4. Confirm HTTPS on both hosts and www→apex redirect.

### Do not touch

- NS / SOA / DNSSEC DS (registrar Network Solutions)
- MX (`mx001`–`mx004.bluehost.xion.oxcs.net`)
- SPF TXT, Google recovery TXT (except **adding** `fah-claim`)
- `_dmarc` TXT
- `default._domainkey` TXT
- `mail` A and `webmail` A (`162.241.226.103`)

### Rollback

Restore **current live** records (not the older README `76.76.21.21` /
`cname.vercel-dns.com` pair):

| Host | Type | Value |
|---|---|---|
| `@` / `xmbroider.com` | A | **`216.150.1.1`** |
| `www` | CNAME | **`f59aed66988717f0.vercel-dns-016.com`** |

Leave mail records alone. Firebase TXT / `_acme-challenge` can stay for a retry.

---

## Out of scope / do not do from Stage 2

- Create App Hosting backends or custom domains
- `firebase deploy`, secret upload, CORS `gsutil cors set`
- DNS or Vercel project/env/billing changes
- Cancel Vercel Pro (FairwayRoster `golf-event-planner` is still on that team)
- Rewrite `next.config.ts` redirects
- Remove `sharp` or `firebase-admin`

---

## Risks

- Next 16.2.9 vs App Hosting’s documented active Next 15.2.x — verify on
  `hosted.app`
- First rollout fails if any `secret:` name is missing in Secret Manager
- Admin fail-closed: if `NEXT_PUBLIC_ADMIN_EMAIL_ALLOWLIST` is not copied from
  Vercel’s `NEXT_PUBLIC_ADMIN_EMAILS`, **nobody** can use admin after this code
  ships (including on Vercel, unless the fallback env is still set)
- Firestore/Storage rules still allow any authenticated writer
- HTTPS downtime if apex/www are switched before the cert is minted
- Mail breakage if MX/SPF/DKIM/DMARC/`mail`/`webmail` are edited
- TTL 14400: skip the 4-hour wait and some resolvers keep the old A/CNAME
- Storage CORS missing `hosted.app` breaks any browser canvas / cross-origin
  image reads during stage 4
- `minInstances: 0` cold starts; `maxInstances: 2` can queue under a spike
