import { NextResponse } from "next/server";
import { analyzeCase, buildCaseDetail } from "@/lib/cases";
import { handleCaseRouteError, requireDatabase } from "@/lib/api-error";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const { id } = await params;
    const updated = await analyzeCase(id);
    return NextResponse.json(buildCaseDetail(updated));
  } catch (error) {
    return handleCaseRouteError(error);
  }
}
