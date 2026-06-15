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

Editable website copy lives in `src/lib/siteContent.ts` as the fallback source of truth.

The public homepage loads editable content from Firestore at `sites/{siteId}/content/main` when available, then merges it with the local fallback. If Firebase is unavailable or the document is missing, the site continues using `siteContent.ts`.

Firestore structure:

- `sites/{siteId}` — parent site summary (`siteId`, `businessName`, `tagline`, timestamps)
- `sites/{siteId}/content/main` — editable brand, hero, and SEO content (brand may include `logoUrl`, `logoStoragePath`, and `logoAlt`)
- `sites/{siteId}/gallery/{galleryItemId}` — gallery metadata (`title`, `category`, `imageUrl`, `storagePath`, `isVisible`, `sortOrder`, timestamps)

Storage structure:

- `sites/{siteId}/gallery/{generatedFileName}` — uploaded gallery image files
- `sites/{siteId}/brand/{generatedFileName}` — uploaded brand logo files (PNG, JPG, WebP, or SVG; max 5MB)

Example for this project: `sites/xmbroider`, `sites/xmbroider/content/main`, and `sites/xmbroider/gallery/{galleryItemId}`.

Other Firebase repositories in `src/lib/firebase/` (quote requests) are placeholders until connected.

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

Repositories:

- `src/lib/firebase/siteContentRepository.ts` — editable site content and brand logo metadata (connected)
- `src/lib/firebase/galleryRepository.ts` — gallery metadata (connected)
- `src/lib/firebase/storageRepository.ts` — gallery and brand logo uploads (connected)
- `src/lib/firebase/quoteRepository.ts` — quote form submissions (placeholder)

If env vars are missing, Firebase exports are `null` and the app continues using `siteContent.ts`.

## Firebase security rules (recommended)

Adjust these for your project and admin allowlist strategy. Examples below assume authenticated admin users can write, while public read access is allowed for future homepage integration.

Firestore:

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sites/{siteId} {
      allow read: if true;
      allow write: if request.auth != null;

      match /content/{docId} {
        allow read: if true;
        allow write: if request.auth != null;
      }

      match /gallery/{galleryItemId} {
        allow read: if true;
        allow write: if request.auth != null;
      }
    }
  }
}
```

Storage:

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /sites/{siteId}/gallery/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /sites/{siteId}/brand/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

Tighten `allow write` later to match your admin email allowlist once you move checks into security rules.

## Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```
