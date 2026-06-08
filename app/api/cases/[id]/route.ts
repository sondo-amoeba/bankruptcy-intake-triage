import { NextResponse } from "next/server";
import {
  buildCaseDetail,
  getApprovalByCaseId,
  getCaseById,
  listExportAttempts,
  updateCaseExtraction,
} from "@/lib/cases";
import { handleCaseRouteError, requireDatabase } from "@/lib/api-error";
import { triageExtractionSchema } from "@/lib/schema";
import { z } from "zod";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const { id } = await params;
    const triageCase = await getCaseById(id);
    if (!triageCase) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }
    const approval = await getApprovalByCaseId(id);
    const exports = await listExportAttempts(id);
    return NextResponse.json({
      ...buildCaseDetail(triageCase),
      approval: approval
        ? {
            id: approval.id,
            approvedAt: approval.approvedAt.toISOString(),
            disposition: approval.disposition,
          }
        : null,
      exportAttempts: exports.map((row) => ({
        id: row.id,
        status: row.status,
        syncId: row.syncId,
        errorMessage: row.errorMessage,
        idempotencyKey: row.idempotencyKey,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return handleCaseRouteError(error);
  }
}

const patchCaseSchema = z.object({
  extraction: triageExtractionSchema,
});

export async function PATCH(request: Request, { params }: RouteParams) {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const { id } = await params;
    const body = patchCaseSchema.parse(await request.json());
    const updated = await updateCaseExtraction(id, body.extraction);
    return NextResponse.json(buildCaseDetail(updated));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid extraction" }, { status: 400 });
    }
    return handleCaseRouteError(error);
  }
}
