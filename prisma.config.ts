import { defineConfig, env } from "prisma/config";
import dotenv from "dotenv";

// Prisma 7's config loader does not read .env automatically.
dotenv.config();

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    path: "./prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
