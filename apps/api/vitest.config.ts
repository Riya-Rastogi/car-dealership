import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  quiet: true,
});

const databaseUrl = process.env.DATABASE_URL_TEST ?? "";

if (!databaseUrl) {
  throw new Error("DATABASE_URL_TEST must be set in the repo-root .env to run API tests");
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Every file truncates the same dealer_test database, so files must not
    // interleave. Workers within one file still run normally.
    fileParallelism: false,
    globalSetup: ["./tests/global-setup.ts"],
    setupFiles: ["./tests/setup-db.ts"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL: databaseUrl,
      JWT_SECRET: process.env.JWT_SECRET ?? "",
      CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:5173",
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "json-summary"],
      include: ["src/**/*.ts"],
    },
  },
});
