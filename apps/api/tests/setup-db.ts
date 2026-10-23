import { afterAll, beforeEach } from "vitest";
import { pool } from "../src/db/client.js";

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, "") : "";

if (process.env.NODE_ENV !== "test" || !databaseName.endsWith("_test")) {
  throw new Error(
    `Refusing to truncate "${databaseName || "unknown"}": tests must run against a *_test database`,
  );
}

beforeEach(async () => {
  const { rows } = await pool.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public' and tablename not like '__drizzle%'",
  );

  if (rows.length > 0) {
    const tables = rows.map(({ tablename }) => `"${tablename}"`).join(", ");
    await pool.query(`truncate table ${tables} restart identity cascade`);
  }
});

afterAll(async () => {
  await pool.end();
});
