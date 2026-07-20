# Image storage (Cloudflare R2)

Activity and programme photos are stored in **Cloudflare R2** (S3-compatible
object storage), not in the database. The database keeps only the public URL.

Historically photos were base64 data URLs on `Post.imageUrl` /
`FutureProgram.imageUrl`. That embedded the full image in every page that listed
them, so nothing was cacheable. R2 lets the browser and a CDN cache each image
independently and serve it lazily.

## How it works

1. In an admin form, the [`ImagePicker`](../src/components/image-picker.tsx)
   component downscales the chosen/taken photo in the browser (longest edge
   1600px, WebP ~0.82 quality) — a 6MB phone photo becomes ~200KB.
2. It asks [`/api/uploads/sign`](../src/app/api/uploads/sign/route.ts) for a
   presigned PUT. That route checks the user's permission and generates the
   object key server-side.
3. The browser uploads the bytes **directly to R2** — they never pass through the
   Next server, so the 5MB Server Action limit doesn't apply.
4. The form submits the resulting public URL, which
   [`sanitizeImageUrl`](../src/lib/storage.ts) validates (must be under our own
   R2 base, or a small data URL) before it's persisted.

**Fallback:** if the R2 env vars are unset (local dev), the sign route returns
503 and the picker embeds a data URL instead — the pre-R2 behaviour. So the app
works with or without R2 configured.

## One-time Cloudflare setup

1. Cloudflare dashboard → **R2** → **Create bucket** (e.g. `mbv-images`).
   Choose a location hint close to users (APAC).
2. Bucket → **Settings** → enable public access. Either:
   - use the provided **r2.dev** URL (fine to start), or
   - connect a **custom domain** like `images.mbvkarnataka.org` (recommended for
     production — put it behind Cloudflare's CDN).
3. **R2** → **Manage API Tokens** → create a token with **Object Read & Write**
   scoped to this bucket. Note the Access Key ID and Secret.
4. Your R2 **Account ID** is on the R2 overview page.
5. Set CORS on the bucket so browser PUTs are allowed from your site:

   ```json
   [
     {
       "AllowedOrigins": ["https://mbvkarnataka.org"],
       "AllowedMethods": ["PUT"],
       "AllowedHeaders": ["content-type"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```

   Add `http://localhost:3000` to `AllowedOrigins` if testing uploads locally.

## Environment variables

```
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=mbv-images
R2_PUBLIC_BASE_URL=https://images.mbvkarnataka.org   # or the pub-xxxx.r2.dev URL
```

`R2_PUBLIC_BASE_URL` has **no trailing slash**. Its hostname is added to
`next.config.ts` `images.remotePatterns` automatically.

## Migrating existing data-URL images

Any photos posted before R2 was configured are still data URLs in Postgres. Once
the env vars are set, lift them into R2:

```bash
npx tsx scripts/migrate-images-to-r2.mts --dry-run   # report what would move
npx tsx scripts/migrate-images-to-r2.mts             # do it
```

The script is idempotent — rows already migrated (https URLs) are skipped, so
it's safe to re-run.
