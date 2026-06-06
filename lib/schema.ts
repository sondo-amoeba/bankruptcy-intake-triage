import { z } from "zod";

export const chapterSchema = z.enum(["7", "13", "unclear"]);
export const confidenceSchema = z.enum(["high", "medium", "low"]);
export const dispositionSchema = z.enum([
  "ready_for_petition_prep",
  "needs_follow_up",
  "needs_attorney_review",
]);
export const severitySchema = z.enum(["blocking", "follow-up"]);

export const triageExtractionSchema = z.object({
  debtor: z.object({
    name: z.string().nullable(),
    householdSize: z.number().nullable(),
    monthlyIncome: z.number().nullable(),
    state: z.string().nullable(),
  }),
  debts: z.object({
    hasSecured: z.boolean().nullable(),
    hasPriority: z.boolean().nullable(),
    estimatedUnsecured: z.number().nullable(),
  }),
  assets: z.object({
    hasRealProperty: z.boolean().nullable(),
    hasVehicle: z.boolean().nullable(),
    estimatedEquity: z.number().nullable(),
  }),
  history: z.object({
    priorFilings: z.boolean().nullable(),
    priorFilingYearsAgo: z.number().nullable(),
    receivedCreditCounseling: z.boolean().nullable(),
  }),
  suggestedChapter: chapterSchema,
  confidence: confidenceSchema,
  ambiguities: z.array(z.string()),
});

export const missingItemSchema = z.object({
  field: z.string(),
  message: z.string(),
  severity: severitySchema,
});

export const triageRequestSchema = z.object({
  intakeText: z.string().optional(),
  sampleId: z.string().optional(),
});

export const triageResponseSchema = z.object({
  extraction: triageExtractionSchema,
  missing: z.array(missingItemSchema),
  disposition: dispositionSchema,
  suggestedChapter: chapterSchema,
  confidence: confidenceSchema,
});

export type TriageExtraction = z.infer<typeof triageExtractionSchema>;
export type MissingItem = z.infer<typeof missingItemSchema>;
export type Disposition = z.infer<typeof dispositionSchema>;
export type TriageResponse = z.infer<typeof triageResponseSchema>;
