"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { runRules } from "@/lib/rules";
import {
  DISPOSITION_LABELS,
  DISPOSITION_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/ui/disposition";
import type { Disposition, TriageExtraction } from "@/lib/schema";

type ExportAttempt = {
  id: string;
  status: string;
  syncId: string | null;
  errorMessage: string | null;
  idempotencyKey: string;
  createdAt: string;
};

type CaseDetail = {
  id: string;
  status: string;
  intakeText: string;
  sampleId: string | null;
  triage: {
    extraction: TriageExtraction;
    missing: { field: string; message: string; severity: string }[];
    disposition: Disposition;
  } | null;
  approval: { id: string; approvedAt: string; disposition: string } | null;
  exportAttempts: ExportAttempt[];
};

function FieldRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900 disabled:bg-zinc-50"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function CaseWorkspacePage() {
  const params = useParams();
  const caseId = params.id as string;

  const [caseDetail, setCaseDetail] = useState<CaseDetail | null>(null);
  const [extraction, setExtraction] = useState<TriageExtraction | null>(null);
  const [intakeText, setIntakeText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [approvedDisposition, setApprovedDisposition] = useState<Disposition | null>(null);
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    setError(null);
    const res = await fetch(`/api/cases/${caseId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Failed to load case");
    setCaseDetail(data);
    setIntakeText(data.intakeText);
    setExtraction(data.triage?.extraction ?? null);
    if (data.approval) {
      setApprovedDisposition(data.approval.disposition as Disposition);
    }
  }, [caseId]);

  useEffect(() => {
    loadCase().catch((err) => setError(err instanceof Error ? err.message : "Load failed"));
  }, [loadCase]);

  const rulesResult = useMemo(() => {
    if (!extraction) return null;
    return runRules(extraction);
  }, [extraction]);

  const canEdit = caseDetail?.status === "analyzed";
  const canAnalyze =
    caseDetail && (caseDetail.status === "draft" || caseDetail.status === "analyzed");
  const canApprove = caseDetail?.status === "analyzed" && extraction;
  const canExport =
    caseDetail?.status === "approved" || caseDetail?.status === "exported";

  const analyze = useCallback(async () => {
    setBusy("analyze");
    setError(null);
    setExportMsg(null);
    try {
      const res = await fetch(`/api/cases/${caseId}/analyze`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setCaseDetail((prev) => (prev ? { ...prev, ...data, exportAttempts: prev.exportAttempts } : data));
      setExtraction(data.triage?.extraction ?? null);
      setApprovedDisposition(null);
      await loadCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setBusy(null);
    }
  }, [caseId, loadCase]);

  const persistExtraction = useCallback(
    async (next: TriageExtraction) => {
      const res = await fetch(`/api/cases/${caseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ extraction: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save edits");
      setExtraction(data.triage?.extraction ?? next);
    },
    [caseId],
  );

  const updateExtraction = useCallback(
    (updater: (prev: TriageExtraction) => TriageExtraction) => {
      setExtraction((prev) => {
        if (!prev) return prev;
        const next = updater(prev);
        void persistExtraction(next).catch((err) =>
          setError(err instanceof Error ? err.message : "Save failed"),
        );
        return next;
      });
      setApprovedDisposition(null);
    },
    [persistExtraction],
  );

  const approve = useCallback(async () => {
    if (!extraction || !rulesResult) return;
    setBusy("approve");
    setError(null);
    try {
      await persistExtraction(extraction);
      const res = await fetch(`/api/cases/${caseId}/approve`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Approve failed");
      setApprovedDisposition(data.triage.disposition);
      await loadCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusy(null);
    }
  }, [caseId, extraction, rulesResult, persistExtraction, loadCase]);

  const exportCase = useCallback(async () => {
    setBusy("export");
    setError(null);
    setExportMsg(null);
    const key = caseDetail?.approval?.id;
    try {
      const res = await fetch(`/api/cases/${caseId}/export`, {
        method: "POST",
        headers: key ? { "Idempotency-Key": key } : {},
      });
      const data = await res.json();
      if (!res.ok) {
        await loadCase();
        throw new Error(data.error ?? "Export failed");
      }
      setExportMsg(`Exported — sync ID ${data.attempt.syncId}`);
      await loadCase();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(null);
    }
  }, [caseId, caseDetail?.approval?.id, loadCase]);

  if (!caseDetail && !error) {
    return <p className="p-6 text-sm text-zinc-500">Loading case…</p>;
  }

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-5">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800">
          ← Case queue
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Triage workspace</h1>
          {caseDetail && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[caseDetail.status]}`}
            >
              {STATUS_LABELS[caseDetail.status]}
            </span>
          )}
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Intake notes</h2>
          <textarea
            className="h-64 w-full rounded-md border border-zinc-300 p-3 text-sm disabled:bg-zinc-50"
            value={intakeText}
            disabled={caseDetail?.status !== "draft"}
            onChange={(e) => setIntakeText(e.target.value)}
          />
          <button
            type="button"
            onClick={analyze}
            disabled={!canAnalyze || busy === "analyze"}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy === "analyze" ? "Analyzing…" : "Analyze intake"}
          </button>
          {caseDetail?.sampleId && (
            <p className="text-xs text-zinc-500">Sample: {caseDetail.sampleId}</p>
          )}
        </section>

        <section className="space-y-3 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Extracted facts</h2>
          {!extraction ? (
            <p className="text-sm text-zinc-500">Run analysis to see structured fields.</p>
          ) : (
            <div className="space-y-3">
              <FieldRow
                label="Debtor name"
                value={extraction.debtor.name ?? ""}
                disabled={!canEdit}
                onChange={(v) =>
                  updateExtraction((prev) => ({
                    ...prev,
                    debtor: { ...prev.debtor, name: v || null },
                  }))
                }
              />
              <FieldRow
                label="Monthly income ($)"
                value={extraction.debtor.monthlyIncome?.toString() ?? ""}
                disabled={!canEdit}
                onChange={(v) =>
                  updateExtraction((prev) => ({
                    ...prev,
                    debtor: {
                      ...prev.debtor,
                      monthlyIncome: v === "" ? null : Number(v),
                    },
                  }))
                }
              />
              <FieldRow
                label="State"
                value={extraction.debtor.state ?? ""}
                disabled={!canEdit}
                onChange={(v) =>
                  updateExtraction((prev) => ({
                    ...prev,
                    debtor: { ...prev.debtor, state: v || null },
                  }))
                }
              />
              <FieldRow
                label="Suggested chapter"
                value={extraction.suggestedChapter}
                disabled={!canEdit}
                onChange={(v) =>
                  updateExtraction((prev) => ({
                    ...prev,
                    suggestedChapter:
                      v === "7" || v === "13" || v === "unclear" ? v : prev.suggestedChapter,
                  }))
                }
              />
              <label className="block text-sm">
                <span className="font-medium text-zinc-700">Confidence</span>
                <select
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 disabled:bg-zinc-50"
                  value={extraction.confidence}
                  disabled={!canEdit}
                  onChange={(e) =>
                    updateExtraction((prev) => ({
                      ...prev,
                      confidence:
                        e.target.value === "high" ||
                        e.target.value === "medium" ||
                        e.target.value === "low"
                          ? e.target.value
                          : prev.confidence,
                    }))
                  }
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={extraction.history.receivedCreditCounseling === true}
                  onChange={(e) =>
                    updateExtraction((prev) => ({
                      ...prev,
                      history: {
                        ...prev.history,
                        receivedCreditCounseling: e.target.checked,
                      },
                    }))
                  }
                />
                Credit counseling confirmed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={extraction.history.priorFilings === true}
                  onChange={(e) =>
                    updateExtraction((prev) => ({
                      ...prev,
                      history: { ...prev.history, priorFilings: e.target.checked },
                    }))
                  }
                />
                Prior filings reported
              </label>
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Missing, approve & export</h2>
          {!rulesResult ? (
            <p className="text-sm text-zinc-500">Checklist appears after analysis.</p>
          ) : (
            <>
              <p className="text-sm text-zinc-600">
                Disposition preview:{" "}
                <span className="font-medium">{DISPOSITION_LABELS[rulesResult.disposition]}</span>
              </p>
              <ul className="max-h-40 space-y-2 overflow-y-auto">
                {rulesResult.missing.length === 0 ? (
                  <li className="text-sm text-emerald-700">No missing items detected.</li>
                ) : (
                  rulesResult.missing.map((item) => (
                    <li
                      key={item.field}
                      className="rounded-md border border-zinc-200 px-3 py-2 text-sm"
                    >
                      <span
                        className={
                          item.severity === "blocking"
                            ? "font-medium text-red-700"
                            : "font-medium text-amber-700"
                        }
                      >
                        {item.severity === "blocking" ? "Blocking" : "Follow-up"}
                      </span>
                      <p className="text-zinc-700">{item.message}</p>
                    </li>
                  ))
                )}
              </ul>
              <button
                type="button"
                onClick={approve}
                disabled={!canApprove || busy !== null || !!approvedDisposition}
                className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                {approvedDisposition ? "Approved" : "Approve triage"}
              </button>
              {canExport && (
                <button
                  type="button"
                  onClick={exportCase}
                  disabled={busy === "export"}
                  className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  {busy === "export" ? "Exporting…" : "Export to practice mgmt (stub)"}
                </button>
              )}
            </>
          )}

          {caseDetail && caseDetail.exportAttempts.length > 0 && (
            <div className="border-t border-zinc-100 pt-3">
              <h3 className="text-sm font-semibold">Export history</h3>
              <ul className="mt-2 space-y-2 text-xs">
                {caseDetail.exportAttempts.map((attempt) => (
                  <li key={attempt.id} className="rounded border border-zinc-200 p-2">
                    <span
                      className={
                        attempt.status === "succeeded"
                          ? "text-emerald-700"
                          : attempt.status === "failed"
                            ? "text-red-700"
                            : "text-zinc-600"
                      }
                    >
                      {attempt.status}
                    </span>
                    {attempt.syncId && <p>Sync: {attempt.syncId}</p>}
                    {attempt.errorMessage && <p>{attempt.errorMessage}</p>}
                    <p className="text-zinc-400">{new Date(attempt.createdAt).toLocaleString()}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </main>

      {error && (
        <div className="mx-auto max-w-7xl px-6 pb-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {exportMsg && (
        <div className="mx-auto max-w-7xl px-6 pb-4">
          <p className="text-sm text-emerald-700">{exportMsg}</p>
        </div>
      )}

      {approvedDisposition && (
        <div className="mx-auto max-w-7xl px-6 pb-8">
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${DISPOSITION_STYLES[approvedDisposition]}`}
          >
            Approved: {DISPOSITION_LABELS[approvedDisposition]}
            {caseDetail?.approval && (
              <span className="ml-2 font-normal opacity-80">
                {new Date(caseDetail.approval.approvedAt).toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
