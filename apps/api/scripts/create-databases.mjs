import { Client } from "pg";

const adminUrl =
  process.env.DATABASE_ADMIN_URL ??
  "postgres://dealer:dealer@127.0.0.1:5432/postgres";

const databases = (process.env.DATABASES ?? "dealer,dealer_test")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);

const client = new Client({ connectionString: adminUrl });
await client.connect();

for (const name of databases) {
  const existing = await client.query("select 1 from pg_database where datname = $1", [name]);

  if (existing.rowCount === 0) {
    await client.query(`create database "${name}"`);
    console.log(`created ${name}`);
  } else {
    console.log(`${name} already exists`);
  }
}

await client.end();
