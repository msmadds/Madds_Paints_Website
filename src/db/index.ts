import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * One small pool per serverless instance. On Vercel use a *pooled* connection
 * string (Neon "-pooler" host, Supabase transaction pooler, etc.).
 * `prepare: false` keeps it compatible with PgBouncer-style poolers.
 */
declare global {
  var __medepaintsSql: ReturnType<typeof postgres> | undefined;
}

function getSql() {
  if (globalThis.__medepaintsSql) return globalThis.__medepaintsSql;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set. Add it to .env.local or to your Vercel project settings.");
  }
  const client = postgres(url, {
    prepare: false,
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    ssl: url.includes("localhost") || url.includes("127.0.0.1") ? false : "require",
  });
  globalThis.__medepaintsSql = client;
  return client;
}

type Database = ReturnType<typeof drizzle<typeof schema>>;
let _db: Database | undefined;

/** Lazily created so `next build` never needs a database connection. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    if (!_db) _db = drizzle(getSql(), { schema });
    return Reflect.get(_db, prop, receiver);
  },
});

export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];
export { schema };
