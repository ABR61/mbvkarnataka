/**
 * Rasterize the MBV brand mark (public/icon.svg) into PWA PNG icons.
 * Uses sharp (bundled with Next). Re-run after changing icon.svg:
 *   npx tsx scripts/gen-icons.ts
 */
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const svg = readFileSync(join(process.cwd(), "public", "icon.svg"));
  // 180 = Apple touch icon; 192 + 512 = Android/PWA manifest icons.
  for (const size of [180, 192, 512]) {
    const out = join(process.cwd(), "public", `icon-${size}.png`);
    // High density so the SVG rasterizes crisply at the target size.
    await sharp(svg, { density: 512 }).resize(size, size).png().toFile(out);
    console.log(`wrote ${out}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
