import {
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { MissingItem, TriageExtraction } from "@/lib/schema";

export const caseStatusEnum = pgEnum("case_status", [
  "draft",
  "analyzed",
  "approved",
  "exported",
]);

export const extractionSourceEnum = pgEnum("extraction_source", ["sample", "gemini"]);

export const exportStatusEnum = pgEnum("export_status", ["pending", "succeeded", "failed"]);

export const triageCases = pgTable("triage_cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  status: caseStatusEnum("status").notNull().default("draft"),
  intakeText: text("intake_text").notNull(),
  sampleId: text("sample_id"),
  extraction: jsonb("extraction").$type<TriageExtraction>(),
  extractionSource: extractionSourceEnum("extraction_source"),
  model: text("model"),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const approvalRecords = pgTable(
  "approval_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => triageCases.id, { onDelete: "cascade" }),
    extraction: jsonb("extraction").$type<TriageExtraction>().notNull(),
    disposition: text("disposition").notNull(),
    missing: jsonb("missing").$type<MissingItem[]>().notNull(),
    intakeTextHash: text("intake_text_hash").notNull(),
    extractionSource: extractionSourceEnum("extraction_source").notNull(),
    model: text("model"),
    analyzedAt: timestamp("analyzed_at", { withTimezone: true }).notNull(),
    approvedAt: timestamp("approved_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("approval_records_case_id_unique").on(table.caseId)],
);

export const exportAttempts = pgTable(
  "export_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    caseId: uuid("case_id")
      .notNull()
      .references(() => triageCases.id, { onDelete: "cascade" }),
    approvalRecordId: uuid("approval_record_id")
      .notNull()
      .references(() => approvalRecords.id, { onDelete: "cascade" }),
    idempotencyKey: text("idempotency_key").notNull(),
    status: exportStatusEnum("status").notNull(),
    syncId: text("sync_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("export_attempts_idempotency_key_idx").on(table.idempotencyKey)],
);

export type TriageCaseRow = typeof triageCases.$inferSelect;
export type ApprovalRecordRow = typeof approvalRecords.$inferSelect;
export type ExportAttemptRow = typeof exportAttempts.$inferSelect;
