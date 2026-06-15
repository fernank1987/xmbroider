# XMBroider

Next.js App Router site for XMBroider — custom embroidery and DTF apparel in Rhode Island.

## Getting started

```bash
npm install
npm run dev
```

- Public site: [http://localhost:3000](http://localhost:3000)
- Admin shell: [http://localhost:3000/admin](http://localhost:3000/admin)

## Content

Editable website copy lives in `src/lib/siteContent.ts` as local mock data. The public homepage and admin dashboard read from this file today.

Firebase repository placeholders are in `src/lib/firebase/` for future Firestore, Storage, and quote request integration. Nothing is saved to Firebase yet.

## Firebase setup (optional)

The app works without Firebase environment variables. When you are ready to connect Firebase:

1. Create a Firebase project in the [Firebase console](https://console.firebase.google.com/).
2. Add a web app and copy the Firebase config values.
3. Copy `.env.local.example` to `.env.local`.
4. Fill in the `NEXT_PUBLIC_FIREBASE_*` values in `.env.local`.

```bash
cp .env.local.example .env.local
```

Required variables:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Client initialization: `src/lib/firebase/client.ts`

Planned repositories:

- `src/lib/firebase/siteContentRepository.ts` — editable site content
- `src/lib/firebase/storageRepository.ts` — gallery image uploads
- `src/lib/firebase/quoteRepository.ts` — quote form submissions

If env vars are missing, Firebase exports are `null` and the app continues using `siteContent.ts`.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
