# Firebase Storage CORS (optional)

XMBroider generates quote composite previews **server-side** via `/api/preview-composite`, so browser canvas export does not require Storage CORS configuration.

If you add client-side canvas export or direct `<img crossOrigin="anonymous">` loading from Firebase Storage URLs, configure CORS on your bucket.

## Bucket

Use the bucket from `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, for example:

```
your-project-id.appspot.com
```

## cors.json

Create a file named `cors.json`:

```json
[
  {
    "origin": ["https://xmbroider.com", "http://localhost:3000"],
    "method": ["GET", "HEAD"],
    "responseHeader": ["Content-Type", "Content-Length", "Content-Range"],
    "maxAgeSeconds": 3600
  }
]
```

Add other deployed origins as needed (preview/staging domains).

## Apply with gsutil

```bash
gsutil cors set cors.json gs://YOUR_STORAGE_BUCKET
```

Verify:

```bash
gsutil cors get gs://YOUR_STORAGE_BUCKET
```

## Notes

- Server-side export uses the Firebase Admin SDK and `fetch()` on the server, which is not blocked by browser CORS.
- Public download URLs (`firebasestorage.googleapis.com`) work in `<img>` tags without CORS, but **canvas** reads require CORS headers or a server-side fetch.
- Prefer the server composite route for quote previews to avoid tainted canvas and flat-color fallbacks.
