import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Credentials provider requires JWT sessions (Auth.js constraint).
  session: { strategy: "jwt" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    // Runs on sign-in (when `user` is present) and on every subsequent request.
    // We resolve roles + permissions once at sign-in and cache them on the token,
    // so RBAC checks elsewhere read from the session without hitting the DB.
    // Trade-off: a role change takes effect on the user's next sign-in.
    async jwt({ token, user }) {
      if (user?.id) {
        token.uid = user.id;
        const userRoles = await prisma.userRole.findMany({
          where: { userId: user.id },
          include: {
            role: {
              include: { rolePermissions: { include: { permission: true } } },
            },
          },
        });
        token.roles = userRoles.map((ur) => ur.role.name);
        token.permissions = [
          ...new Set(
            userRoles.flatMap((ur) =>
              ur.role.rolePermissions.map((rp) => rp.permission.key),
            ),
          ),
        ];
      }
      return token;
    },
    session({ session, token }) {
      // JWT extends Record<string, unknown> in Auth.js v5, so token fields read back
      // as `unknown` — cast to the shapes we wrote in the jwt callback above.
      if (session.user) {
        session.user.id = (token.uid as string | undefined) ?? "";
        session.user.roles = (token.roles as string[] | undefined) ?? [];
        session.user.permissions =
          (token.permissions as string[] | undefined) ?? [];
      }
      return session;
    },
  },
});
