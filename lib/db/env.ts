/** Vercel Postgres injects POSTGRES_URL; Neon/local setups often use DATABASE_URL. */
export function getDatabaseUrl(): string | undefined {
  return process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim() || undefined;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}
