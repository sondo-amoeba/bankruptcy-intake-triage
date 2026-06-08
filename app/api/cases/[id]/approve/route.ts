import { NextResponse } from "next/server";
import { approveCase } from "@/lib/cases";
import { handleCaseRouteError, requireDatabase } from "@/lib/api-error";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const { id } = await params;
    const result = await approveCase(id);
    return NextResponse.json({
      approval: {
        id: result.approval.id,
        approvedAt: result.approval.approvedAt.toISOString(),
        disposition: result.approval.disposition,
      },
      triage: result.triage,
      status: "approved",
    });
  } catch (error) {
    return handleCaseRouteError(error);
  }
}
