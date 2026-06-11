import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// e2e smoke runs against an already-running, seeded server (set BASE_URL).
// Serial, generous timeouts for network round-trips.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.test.ts"],
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    // Forward BASE_URL (set on the CLI) into the test worker's process.env.
    env: {
      BASE_URL: process.env.BASE_URL || "http://localhost:3000",
    },
  },
});
