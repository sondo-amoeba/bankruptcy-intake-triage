import { NextResponse } from "next/server";
import { exportCase, listExportAttempts } from "@/lib/cases";
import { CaseError } from "@/lib/cases";
import { handleCaseRouteError, requireDatabase } from "@/lib/api-error";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const { id } = await params;
    const attempts = await listExportAttempts(id);
    return NextResponse.json({
      attempts: attempts.map((row) => ({
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

export async function POST(request: Request, { params }: RouteParams) {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const { id } = await params;
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;
    const result = await exportCase(id, idempotencyKey);
    return NextResponse.json({
      attempt: {
        id: result.attempt.id,
        status: result.attempt.status,
        syncId: result.attempt.syncId,
        idempotencyKey: result.attempt.idempotencyKey,
        createdAt: result.attempt.createdAt.toISOString(),
      },
      casePacket: result.casePacket,
      status: "exported",
    });
  } catch (error) {
    if (error instanceof CaseError && error.status === 502) {
      const { id } = await params;
      const attempts = await listExportAttempts(id);
      const latest = attempts[0];
      return NextResponse.json(
        {
          error: error.message,
          attempt: latest
            ? {
                id: latest.id,
                status: latest.status,
                errorMessage: latest.errorMessage,
                idempotencyKey: latest.idempotencyKey,
                createdAt: latest.createdAt.toISOString(),
              }
            : null,
        },
        { status: 502 },
      );
    }
    return handleCaseRouteError(error);
  }
}
