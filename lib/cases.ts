import { desc, eq } from "drizzle-orm";
import { extractWithGemini, isGeminiConfigured } from "@/lib/extract";
import { getDb } from "@/lib/db";
import {
  approvalRecords,
  exportAttempts,
  triageCases,
  type ApprovalRecordRow,
  type ExportAttemptRow,
  type TriageCaseRow,
} from "@/lib/db/schema";
import {
  buildStubExportFailure,
  buildStubExportSuccess,
  shouldSimulateExportFailure,
} from "@/lib/export-stub";
import { hashIntakeText } from "@/lib/hash";
import { buildTriageResponse, runRules } from "@/lib/rules";
import { getSampleById } from "@/lib/samples";
import {
  triageExtractionSchema,
  type Disposition,
  type MissingItem,
  type TriageExtraction,
} from "@/lib/schema";

const GEMINI_MODEL = "gemini-2.5-flash";

export class CaseError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function listRecentCases(limit = 10): Promise<TriageCaseRow[]> {
  const db = getDb();
  return db.select().from(triageCases).orderBy(desc(triageCases.createdAt)).limit(limit);
}

export async function getCaseById(caseId: string): Promise<TriageCaseRow | undefined> {
  const db = getDb();
  const rows = await db.select().from(triageCases).where(eq(triageCases.id, caseId)).limit(1);
  return rows[0];
}

export async function createCase(input: {
  intakeText?: string;
  sampleId?: string;
}): Promise<TriageCaseRow> {
  const db = getDb();
  const sample = input.sampleId ? getSampleById(input.sampleId) : undefined;
  const intakeText = sample?.intakeText ?? input.intakeText?.trim() ?? "";
  if (!intakeText) {
    throw new CaseError("intakeText is required", 400);
  }

  const rows = await db
    .insert(triageCases)
    .values({
      intakeText,
      sampleId: sample?.id ?? input.sampleId ?? null,
    })
    .returning();
  return rows[0]!;
}

export async function updateCaseExtraction(
  caseId: string,
  extraction: TriageExtraction,
): Promise<TriageCaseRow> {
  const triageCase = await requireCase(caseId);
  if (triageCase.status !== "analyzed") {
    throw new CaseError("Can only edit extraction when case is analyzed", 409);
  }
  const parsed = triageExtractionSchema.parse(extraction);
  const db = getDb();
  const rows = await db
    .update(triageCases)
    .set({ extraction: parsed, updatedAt: new Date() })
    .where(eq(triageCases.id, caseId))
    .returning();
  return rows[0]!;
}

export async function analyzeCase(caseId: string): Promise<TriageCaseRow> {
  const triageCase = await requireCase(caseId);
  if (triageCase.status === "approved" || triageCase.status === "exported") {
    throw new CaseError("Cannot analyze after approval", 409);
  }

  let extraction: TriageExtraction;
  let extractionSource: "sample" | "gemini";
  let model: string | null = null;

  if (triageCase.sampleId) {
    const sample = getSampleById(triageCase.sampleId);
    if (!sample) {
      throw new CaseError("Unknown sample on case", 400);
    }
    extraction = sample.cannedExtraction;
    extractionSource = "sample";
  } else {
    if (!isGeminiConfigured()) {
      throw new CaseError(
        "GEMINI_API_KEY is not configured. Load a sample or set a free key from Google AI Studio.",
        503,
      );
    }
    let result = await extractWithGemini(triageCase.intakeText);
    if (!result) {
      result = await extractWithGemini(triageCase.intakeText, true);
    }
    if (!result) {
      throw new CaseError("Extraction failed", 502);
    }
    extraction = result;
    extractionSource = "gemini";
    model = GEMINI_MODEL;
  }

  const analyzedAt = new Date();
  const db = getDb();
  const rows = await db
    .update(triageCases)
    .set({
      status: "analyzed",
      extraction,
      extractionSource,
      model,
      analyzedAt,
      updatedAt: analyzedAt,
    })
    .where(eq(triageCases.id, caseId))
    .returning();
  return rows[0]!;
}

export async function approveCase(caseId: string): Promise<{
  approval: ApprovalRecordRow;
  triage: ReturnType<typeof buildTriageResponse>;
}> {
  const existing = await getApprovalByCaseId(caseId);
  if (existing) {
    const triageCase = await requireCase(caseId);
    return {
      approval: existing,
      triage: buildResponseFromCase(triageCase, existing.disposition as Disposition, existing.missing),
    };
  }

  const triageCase = await requireCase(caseId);
  if (triageCase.status !== "analyzed") {
    throw new CaseError("Case must be analyzed before approval", 409);
  }
  if (!triageCase.extraction || !triageCase.extractionSource || !triageCase.analyzedAt) {
    throw new CaseError("Case has no extraction to approve", 409);
  }

  const triage = buildTriageResponse(triageCase.extraction);
  const db = getDb();
  try {
    const approvalRows = await db
      .insert(approvalRecords)
      .values({
        caseId,
        extraction: triageCase.extraction,
        disposition: triage.disposition,
        missing: triage.missing,
        intakeTextHash: hashIntakeText(triageCase.intakeText),
        extractionSource: triageCase.extractionSource,
        model: triageCase.model,
        analyzedAt: triageCase.analyzedAt,
      })
      .returning();

    await db
      .update(triageCases)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(triageCases.id, caseId));

    return { approval: approvalRows[0]!, triage };
  } catch (error) {
    const pgCode = (error as { code?: string }).code;
    if (pgCode === "23505") {
      const replay = await getApprovalByCaseId(caseId);
      if (replay) {
        return {
          approval: replay,
          triage: buildResponseFromCase(triageCase, replay.disposition as Disposition, replay.missing),
        };
      }
    }
    throw error;
  }
}

export async function exportCase(
  caseId: string,
  idempotencyKey?: string,
): Promise<{ attempt: ExportAttemptRow; casePacket: CasePacket }> {
  const triageCase = await requireCase(caseId);
  if (triageCase.status !== "approved" && triageCase.status !== "exported") {
    throw new CaseError("Case must be approved before export", 409);
  }

  const approval = await getApprovalByCaseId(caseId);
  if (!approval) {
    throw new CaseError("Approval record missing", 500);
  }

  const key = idempotencyKey?.trim() || approval.id;
  const db = getDb();

  const priorAttempts = await db
    .select()
    .from(exportAttempts)
    .where(eq(exportAttempts.idempotencyKey, key))
    .orderBy(desc(exportAttempts.createdAt));

  const succeeded = priorAttempts.find((row) => row.status === "succeeded");
  if (succeeded) {
    return { attempt: succeeded, casePacket: buildCasePacket(approval) };
  }

  const priorFailed = priorAttempts.some((row) => row.status === "failed");
  const simulateFailure = shouldSimulateExportFailure(key, priorFailed);

  if (simulateFailure) {
    const failure = buildStubExportFailure();
    const errorMessage = failure.ok ? "Export failed" : failure.errorMessage;
    const failedRows = await db
      .insert(exportAttempts)
      .values({
        caseId,
        approvalRecordId: approval.id,
        idempotencyKey: key,
        status: "failed",
        errorMessage,
      })
      .returning();
    throw new CaseError(failedRows[0]!.errorMessage ?? "Export failed", 502);
  }

  const stubResult = buildStubExportSuccess();
  if (!stubResult.ok) {
    throw new CaseError("Export stub failed", 500);
  }
  const stub = stubResult;
  const successRows = await db
    .insert(exportAttempts)
    .values({
      caseId,
      approvalRecordId: approval.id,
      idempotencyKey: key,
      status: "succeeded",
      syncId: stub.syncId,
    })
    .returning();

  if (triageCase.status === "approved") {
    await db
      .update(triageCases)
      .set({ status: "exported", updatedAt: new Date() })
      .where(eq(triageCases.id, caseId));
  }

  return { attempt: successRows[0]!, casePacket: buildCasePacket(approval, stub) };
}

export async function listExportAttempts(caseId: string): Promise<ExportAttemptRow[]> {
  const db = getDb();
  return db
    .select()
    .from(exportAttempts)
    .where(eq(exportAttempts.caseId, caseId))
    .orderBy(desc(exportAttempts.createdAt));
}

export async function getApprovalByCaseId(caseId: string): Promise<ApprovalRecordRow | undefined> {
  const db = getDb();
  const rows = await db
    .select()
    .from(approvalRecords)
    .where(eq(approvalRecords.caseId, caseId))
    .limit(1);
  return rows[0];
}

export type CasePacket = {
  caseId: string;
  approvalRecordId: string;
  disposition: string;
  missing: MissingItem[];
  extraction: TriageExtraction;
  intakeTextHash: string;
  extractionSource: string;
  model: string | null;
  analyzedAt: string;
  approvedAt: string;
  export?: { syncId: string; target: string; receivedAt: string };
};

function buildCasePacket(
  approval: ApprovalRecordRow,
  stub?: { syncId: string; target: string; receivedAt: string },
): CasePacket {
  return {
    caseId: approval.caseId,
    approvalRecordId: approval.id,
    disposition: approval.disposition,
    missing: approval.missing,
    extraction: approval.extraction,
    intakeTextHash: approval.intakeTextHash,
    extractionSource: approval.extractionSource,
    model: approval.model,
    analyzedAt: approval.analyzedAt.toISOString(),
    approvedAt: approval.approvedAt.toISOString(),
    ...(stub
      ? { export: { syncId: stub.syncId, target: stub.target, receivedAt: stub.receivedAt } }
      : {}),
  };
}

function buildResponseFromCase(
  triageCase: TriageCaseRow,
  disposition: Disposition,
  missing: MissingItem[],
) {
  if (!triageCase.extraction) {
    throw new CaseError("Case has no extraction", 409);
  }
  return {
    extraction: triageCase.extraction,
    missing,
    disposition,
    suggestedChapter: triageCase.extraction.suggestedChapter,
    confidence: triageCase.extraction.confidence,
  };
}

export function buildCaseDetail(triageCase: TriageCaseRow) {
  const triage = triageCase.extraction ? buildTriageResponse(triageCase.extraction) : null;
  return {
    id: triageCase.id,
    status: triageCase.status,
    intakeText: triageCase.intakeText,
    sampleId: triageCase.sampleId,
    extractionSource: triageCase.extractionSource,
    model: triageCase.model,
    analyzedAt: triageCase.analyzedAt?.toISOString() ?? null,
    createdAt: triageCase.createdAt.toISOString(),
    updatedAt: triageCase.updatedAt.toISOString(),
    triage,
  };
}

async function requireCase(caseId: string): Promise<TriageCaseRow> {
  const triageCase = await getCaseById(caseId);
  if (!triageCase) {
    throw new CaseError("Case not found", 404);
  }
  return triageCase;
}

export function previewRules(extraction: TriageExtraction) {
  return runRules(extraction);
}
