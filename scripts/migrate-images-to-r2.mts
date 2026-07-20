/**
 * One-off migration: move image data URLs stored in Postgres into Cloudflare R2,
 * replacing each imageUrl with its public R2 URL.
 *
 * Photos used to be stored as base64 data URLs directly on Post.imageUrl and
 * FutureProgram.imageUrl. After R2 is configured, run this once to lift the
 * existing images out of the database.
 *
 * Idempotent: rows whose imageUrl is already an https URL are skipped, so it's
 * safe to re-run (e.g. if it's interrupted). Run with:
 *
 *   npx tsx scripts/migrate-images-to-r2.mts          # migrate
 *   npx tsx scripts/migrate-images-to-r2.mts --dry-run  # report only
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { putObject, storageConfigured } from "../src/lib/storage";

const DRY = process.argv.includes("--dry-run");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Parse a data URL into its mime type and raw bytes, or null if not one. */
function parseDataUrl(value: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(value);
  if (!m) return null;
  return { mime: m[1], bytes: new Uint8Array(Buffer.from(m[2], "base64")) };
}

type Row = { id: string; imageUrl: string | null };

async function migrateTable(
  label: string,
  prefix: string,
  find: () => Promise<Row[]>,
  update: (id: string, imageUrl: string) => Promise<unknown>,
): Promise<{ migrated: number; skipped: number; failed: number }> {
  const rows = await find();

  let migrated = 0,
    skipped = 0,
    failed = 0;

  for (const row of rows) {
    const parsed = row.imageUrl ? parseDataUrl(row.imageUrl) : null;
    if (!parsed) {
      skipped++;
      continue;
    }
    const ext = EXT[parsed.mime];
    if (!ext) {
      console.warn(`  ! ${label}/${row.id}: unsupported type ${parsed.mime}`);
      failed++;
      continue;
    }
    const key = `${prefix}/${row.id}.${ext}`;
    const kb = (parsed.bytes.byteLength / 1024).toFixed(0);
    if (DRY) {
      console.log(`  would upload ${label}/${row.id} -> ${key} (${kb} KB)`);
      migrated++;
      continue;
    }
    try {
      const publicUrl = await putObject(key, parsed.bytes, parsed.mime);
      await update(row.id, publicUrl);
      console.log(`  ✓ ${label}/${row.id} -> ${publicUrl} (${kb} KB)`);
      migrated++;
    } catch (e) {
      console.error(`  ✗ ${label}/${row.id}:`, e instanceof Error ? e.message : e);
      failed++;
    }
  }
  return { migrated, skipped, failed };
}

async function main() {
  if (!storageConfigured()) {
    console.error(
      "R2 is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, " +
        "R2_SECRET_ACCESS_KEY, R2_BUCKET, and R2_PUBLIC_BASE_URL first.",
    );
    process.exit(1);
  }
  console.log(DRY ? "DRY RUN — no changes will be made\n" : "Migrating…\n");

  const dataUrl = { imageUrl: { startsWith: "data:" } } as const;

  const post = await migrateTable(
    "post",
    "activities",
    () => prisma.post.findMany({ where: dataUrl, select: { id: true, imageUrl: true } }),
    (id, imageUrl) => prisma.post.update({ where: { id }, data: { imageUrl } }),
  );
  console.log(`Posts: ${post.migrated} migrated, ${post.skipped} skipped, ${post.failed} failed\n`);

  const fp = await migrateTable(
    "futureProgram",
    "future-programs",
    () =>
      prisma.futureProgram.findMany({ where: dataUrl, select: { id: true, imageUrl: true } }),
    (id, imageUrl) => prisma.futureProgram.update({ where: { id }, data: { imageUrl } }),
  );
  console.log(`Future programs: ${fp.migrated} migrated, ${fp.skipped} skipped, ${fp.failed} failed`);

  const failed = post.failed + fp.failed;
  await prisma.$disconnect();
  if (failed > 0) process.exit(1);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
