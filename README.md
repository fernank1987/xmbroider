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
- `sites/{siteId}/quoteRequests/{quoteRequestId}` — quote form submissions (`name`, `email`, `phone`, `serviceNeeded`, `projectDetails`, `quantity`, `deadline`, `status`, `source`, `adminReadAt`, `notificationStatus`, `notificationSentAt`, timestamps)
- `sites/{siteId}/products/{productId}` — product catalog (`name`, `slug`, `brand`, `brandSlug`, `styleCode`, `category`, `description`, `basePriceMin`, `basePriceMax`, `sizes`, `colors`, `isVisible`, `sortOrder`, timestamps)

  Preview-tool submissions (`source: "logo_preview_tool"`) may also include:

  - `productId`, `productName`, `productType`, `productLabel`, `productVariantId`, `colorName`, `size`, `productImageUrl`
  - `placement`, `logoSize`, `logoPositionX`, `logoPositionY`
  - `artworkUrl`, `artworkStoragePath`
  - `previewImageUrl`, `previewImageStoragePath` (optional generated mockup export)

Storage structure:

- `sites/{siteId}/gallery/{generatedFileName}` — uploaded gallery image files
- `sites/{siteId}/brand/{generatedFileName}` — uploaded brand logo files (PNG, JPG, WebP, or SVG; max 5MB)
- `sites/{siteId}/quoteUploads/{quoteRequestId}/artwork-{fileName}` — customer artwork from the logo preview tool
- `sites/{siteId}/quoteUploads/{quoteRequestId}/preview.png` — optional generated preview image export
- `sites/{siteId}/products/{brandSlug}/{productSlug}/{fileName}` — product color front/back images (new uploads)

  Examples:

  - `sites/xmbroider/products/sport-tek/st550/atomic-blue-front.jpg`
  - `sites/xmbroider/products/richardson/112/black-charcoal-front.jpg`
  - `sites/xmbroider/products/yupoong/6606/black-front.jpg`

- `sites/{siteId}/products/{productId}/{fileName}` — legacy product image paths (still readable; no automatic migration)

Public mockup images for the logo preview tool:

- `public/mockups/st550/{variant-id}-front.jpg` — Sport-Tek ST550 front photos (`.svg` fallback when JPG missing)

Example for this project: `sites/xmbroider`, `sites/xmbroider/content/main`, `sites/xmbroider/gallery/{galleryItemId}`, `sites/xmbroider/products/{productId}`, `sites/xmbroider/products/sport-tek/st550/…`, and `sites/xmbroider/quoteRequests/{quoteRequestId}`.

All Firebase repositories in `src/lib/firebase/` are connected for site content, gallery, brand logos, products, and quote requests.

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
- `src/lib/firebase/storageRepository.ts` — gallery, brand logo, product, and quote uploads (connected)
- `src/lib/firebase/quoteRepository.ts` — quote form and logo preview submissions (connected)
- `src/lib/firebase/productRepository.ts` — product catalog metadata (connected)

If env vars are missing, Firebase exports are `null` and the app continues using `siteContent.ts`.

### Quote email notifications (optional)

When a visitor submits a quote, the app can email the admin via [Resend](https://resend.com/). Add these **server-only** variables to `.env.local` (never commit real keys):

```bash
RESEND_API_KEY=re_...
QUOTE_NOTIFICATION_EMAIL=you@example.com
QUOTE_FROM_EMAIL=XMBroider <notifications@your-verified-domain.com>
```

Optional customer confirmation email:

```bash
SEND_CUSTOMER_QUOTE_CONFIRMATION=true
```

Optional — persist `notificationStatus` on the quote document after email send (requires a Firebase service account JSON string):

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

If Resend is not configured, quote submission still succeeds; `/api/quote-notification` returns `not_configured`.

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

      match /quoteRequests/{quoteRequestId} {
        allow create: if true;
        allow read, update, delete: if request.auth != null;
      }

      match /products/{productId} {
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

    match /sites/{siteId}/quoteUploads/{quoteId}/{fileName} {
      allow write: if true;
      allow read: if request.auth != null;
    }

    match /sites/{siteId}/products/{productId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    match /sites/{siteId}/products/{brandSlug}/{productSlug}/{fileName} {
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
