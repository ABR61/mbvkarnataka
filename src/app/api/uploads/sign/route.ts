import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasPermission, type Permission } from "@/lib/rbac";
import {
  isAllowedImageType,
  presignUpload,
  storageConfigured,
  MAX_UPLOAD_BYTES,
} from "@/lib/storage";

/**
 * Mints a short-lived presigned PUT so the browser can upload an image straight
 * to R2. Image bytes never pass through this server.
 *
 * The object key is generated server-side and the permission is checked here, so
 * a caller can neither overwrite someone else's object nor upload without rights.
 */

// Which upload kinds exist, where they land, and who may create them.
const KINDS: Record<string, { prefix: string; permission: Permission }> = {
  post: { prefix: "activities", permission: "post.manage" },
  "future-program": { prefix: "future-programs", permission: "program.plan" },
};

export async function POST(req: Request) {
  if (!storageConfigured()) {
    return NextResponse.json(
      { error: "Object storage is not configured on this deployment." },
      { status: 503 },
    );
  }

  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  let body: { kind?: string; contentType?: string; size?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const kind = KINDS[body.kind ?? ""];
  if (!kind) {
    return NextResponse.json({ error: "Unknown upload kind." }, { status: 400 });
  }
  if (!hasPermission(session.user.permissions, kind.permission)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const contentType = body.contentType ?? "";
  if (!isAllowedImageType(contentType)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed." },
      { status: 415 },
    );
  }
  if (typeof body.size === "number" && body.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Image is too large." },
      { status: 413 },
    );
  }

  const { uploadUrl, publicUrl } = await presignUpload(kind.prefix, contentType);
  return NextResponse.json({ uploadUrl, publicUrl });
}
