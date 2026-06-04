// Next.js 16 renamed "middleware" to "proxy". This wires up next-intl locale routing.
import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const handle = createMiddleware(routing);

export function proxy(request: NextRequest) {
  return handle(request);
}

export const config = {
  // Run on all paths except API routes, Next internals, and files with an extension.
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
