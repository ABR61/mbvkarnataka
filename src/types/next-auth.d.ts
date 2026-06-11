// Augment Auth.js so `session.user` carries our RBAC fields (this interface merges
// because next-auth declares `Session` itself). The JWT is intentionally NOT augmented:
// in v5 it extends Record<string, unknown> and is only re-exported from @auth/core/jwt,
// so augmenting "next-auth/jwt" wouldn't merge — the jwt/session callbacks cast instead.
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: string[];
      permissions: string[];
    } & DefaultSession["user"];
  }
}
