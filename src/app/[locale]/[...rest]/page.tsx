import { notFound } from "next/navigation";

// Catch-all for any unmatched path under a locale. Without this, arbitrary URLs
// like /en/does-not-exist fall through to Next's bare global 404 instead of our
// branded, bilingual [locale]/not-found.tsx. Triggering notFound() here routes
// them to that boundary. Real routes always match before this catch-all.
export default function CatchAllNotFound() {
  notFound();
}
