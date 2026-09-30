/** Applies SQL migrations in ./drizzle to the database.  Usage: npm run db:migrate */
import { config } from "dotenv";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

config({ path: ".env.local" });
config();

async function main() {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) throw new Error("Set DATABASE_URL (or DATABASE_URL_UNPOOLED) first.");
  const local = url.includes("localhost") || url.includes("127.0.0.1");
  const sql = postgres(url, { max: 1, prepare: false, ssl: local ? false : "require", onnotice: () => {} });
  await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
  await sql.end();
  console.log("Migrations applied.");
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
