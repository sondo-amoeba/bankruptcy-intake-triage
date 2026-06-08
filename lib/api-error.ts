import { NextResponse } from "next/server";
import { CaseError } from "@/lib/cases";

export function handleCaseRouteError(error: unknown) {
  if (error instanceof CaseError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(error);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

export function requireDatabase() {
  if (!process.env.DATABASE_URL?.trim()) {
    return NextResponse.json(
      {
        error:
          "DATABASE_URL is not configured. Add Vercel Postgres or a Neon connection string.",
      },
      { status: 503 },
    );
  }
  return null;
}
