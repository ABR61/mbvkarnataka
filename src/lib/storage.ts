import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Object storage for activity/programme photos (Cloudflare R2, S3-compatible).
 *
 * Photos used to be stored as base64 data URLs directly in Postgres, which meant
 * every page that listed them shipped the full image payload inline — uncacheable
 * by the browser or a CDN. Images now live in R2 and the database keeps only the
 * public URL.
 *
 * Uploads are presigned and go browser → R2 directly, so image bytes never pass
 * through the Next server (and never hit the 5MB server-action body limit).
 */

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID ?? "";
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID ?? "";
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY ?? "";
const BUCKET = process.env.R2_BUCKET ?? "";
// Public base URL the bucket is served from — an r2.dev domain in dev, or a
// custom domain like https://images.mbvkarnataka.org in production.
const PUBLIC_BASE = (process.env.R2_PUBLIC_BASE_URL ?? "").replace(/\/$/, "");

/** True when every R2 variable is set; callers fall back to data URLs if not. */
export function storageConfigured(): boolean {
  return Boolean(
    ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET && PUBLIC_BASE,
  );
}

let client: S3Client | null = null;
function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: ACCESS_KEY_ID,
        secretAccessKey: SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

/** Images we accept, mapped to the extension used for the stored object. */
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function isAllowedImageType(contentType: string): boolean {
  return contentType in EXT;
}

/** Hard ceiling enforced server-side; the client resizes well below this. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Mint a presigned PUT for a new object under `prefix/`. Returns the URL the
 * browser uploads to and the public URL to persist once the upload succeeds.
 * The key is server-generated so a caller can't overwrite an existing object.
 */
export async function presignUpload(
  prefix: string,
  contentType: string,
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const ext = EXT[contentType];
  if (!ext) throw new Error(`Unsupported image type: ${contentType}`);

  const key = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const uploadUrl = await getSignedUrl(
    s3(),
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  );

  return { uploadUrl, publicUrl: `${PUBLIC_BASE}/${key}`, key };
}

/**
 * Validate an imageUrl submitted through a form before persisting it. Accepts:
 *  - a reasonably-sized image data URL (the fallback when R2 isn't configured), or
 *  - an https URL under our own R2 public base (a real upload).
 * Anything else — arbitrary external URLs, oversized data URLs — becomes null, so
 * a form field can't inject a third-party URL onto a public page.
 */
export function sanitizeImageUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (value.startsWith("data:image/") && value.length < 2_200_000) return value;
  if (PUBLIC_BASE && value.startsWith(`${PUBLIC_BASE}/`)) return value;
  return null;
}

/** Server-side upload — used by the data-URL migration script, not by requests. */
export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
  return `${PUBLIC_BASE}/${key}`;
}
