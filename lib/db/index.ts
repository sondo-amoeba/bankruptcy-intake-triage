import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { getDatabaseUrl, isDatabaseConfigured } from "./env";
import * as schema from "./schema";

export { getDatabaseUrl, isDatabaseConfigured };

export function getDb() {
  const url = getDatabaseUrl();
  if (!url) {
    throw new Error("POSTGRES_URL or DATABASE_URL is not configured");
  }
  const sql = neon(url);
  return drizzle(sql, { schema });
}

export type Db = ReturnType<typeof getDb>;
