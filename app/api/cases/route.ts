import { NextResponse } from "next/server";
import { z } from "zod";
import { buildCaseDetail, createCase, listRecentCases } from "@/lib/cases";
import { handleCaseRouteError, requireDatabase } from "@/lib/api-error";
import { runRules } from "@/lib/rules";

const createCaseSchema = z.object({
  intakeText: z.string().optional(),
  sampleId: z.string().optional(),
});

export async function GET() {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const cases = await listRecentCases(10);
    return NextResponse.json({
      cases: cases.map((row) => ({
        id: row.id,
        status: row.status,
        title: row.extraction?.debtor.name ?? "Untitled intake",
        dispositionPreview: row.extraction ? runRules(row.extraction).disposition : null,
        createdAt: row.createdAt.toISOString(),
        sampleId: row.sampleId,
      })),
    });
  } catch (error) {
    return handleCaseRouteError(error);
  }
}

export async function POST(request: Request) {
  const dbError = requireDatabase();
  if (dbError) return dbError;
  try {
    const body = createCaseSchema.parse(await request.json());
    if (!body.sampleId && !body.intakeText?.trim()) {
      return NextResponse.json({ error: "intakeText or sampleId is required" }, { status: 400 });
    }
    const created = await createCase(body);
    return NextResponse.json(buildCaseDetail(created), { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }
    return handleCaseRouteError(error);
  }
}
