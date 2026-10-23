import { config } from "dotenv";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";

export default async function setup() {
  config({
    path: fileURLToPath(new URL("../../../.env", import.meta.url)),
    quiet: true,
  });

  const databaseUrl = process.env.DATABASE_URL_TEST;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL_TEST is required to run API tests");
  }

  const databaseName = new URL(databaseUrl).pathname.replace(/^\//, "");

  if (!databaseName.endsWith("_test")) {
    throw new Error(`Refusing to migrate ${databaseName}: test databases must end in _test`);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    await migrate(drizzle(pool), {
      migrationsFolder: fileURLToPath(new URL("../drizzle", import.meta.url)),
    });
  } finally {
    await pool.end();
  }
}
