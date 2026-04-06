import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

type DB = ReturnType<typeof drizzle<typeof schema>>;

/**
 * Creates a Drizzle client from DATABASE_URL.
 * Throws at call time (request time), not at module evaluation time.
 */
function createDb(): DB {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is required for @raylak/db");
  }
  const queryClient = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(queryClient, { schema });
}

let _instance: DB | undefined;

/**
 * Lazy singleton — initialized on first access.
 * Exporting a Proxy preserves the `db.select()` / `db.insert()` call surface
 * for all consumers while deferring the DATABASE_URL read to request time.
 * This prevents Next.js static-route build analysis from triggering a hard
 * throw when DATABASE_URL is absent (e.g. SKIP_ENV_VALIDATION=1 builds).
 */
export const db: DB = new Proxy({} as DB, {
  get(_target, prop: string | symbol) {
    _instance ??= createDb();
    return Reflect.get(_instance, prop);
  },
});

export type Database = DB;
