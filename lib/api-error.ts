import { NextResponse } from "next/server";
import { CaseError } from "@/lib/cases";
import { isDatabaseConfigured } from "@/lib/db/env";

export function handleCaseRouteError(error: unknown) {
  if (error instanceof CaseError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function requireDatabase() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      {
        error:
          "POSTGRES_URL (or DATABASE_URL) is not configured. Add Vercel Postgres or a Neon connection string.",
      },
      { status: 503 },
    );
  }
  return null;
}
