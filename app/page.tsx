"use client";

import { useCallback, useMemo, useState } from "react";
import { runRules } from "@/lib/rules";
import { SAMPLES } from "@/lib/samples";
import type { Disposition, TriageExtraction, TriageResponse } from "@/lib/schema";

type UiState = "idle" | "loading" | "reviewed" | "approved";

const DISPOSITION_LABELS: Record<Disposition, string> = {
  ready_for_petition_prep: "Ready for petition prep",
  needs_follow_up: "Needs follow-up",
  needs_attorney_review: "Needs attorney review",
};

const DISPOSITION_STYLES: Record<Disposition, string> = {
  ready_for_petition_prep: "bg-emerald-50 border-emerald-200 text-emerald-900",
  needs_follow_up: "bg-amber-50 border-amber-200 text-amber-900",
  needs_attorney_review: "bg-orange-50 border-orange-200 text-orange-900",
};

function FieldRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <input
        className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

export default function Home() {
  const [intakeText, setIntakeText] = useState("");
  const [sampleId, setSampleId] = useState("");
  const [extraction, setExtraction] = useState<TriageExtraction | null>(null);
  const [uiState, setUiState] = useState<UiState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [approvedDisposition, setApprovedDisposition] = useState<Disposition | null>(null);

  const rulesResult = useMemo(() => {
    if (!extraction) return null;
    return runRules(extraction);
  }, [extraction]);

  const loadSample = useCallback((id: string) => {
    const sample = SAMPLES.find((s) => s.id === id);
    if (!sample) return;
    setSampleId(id);
    setIntakeText(sample.intakeText);
    setExtraction(sample.cannedExtraction);
    setUiState("reviewed");
    setError(null);
    setApprovedDisposition(null);
  }, []);

  const analyze = useCallback(async () => {
    setUiState("loading");
    setError(null);
    setApprovedDisposition(null);

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intakeText: intakeText.trim(),
          sampleId: sampleId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Analysis failed");
      }

      const triage = data as TriageResponse;
      setExtraction(triage.extraction);
      setUiState("reviewed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
      setUiState("idle");
    }
  }, [intakeText, sampleId]);

  const updateExtraction = useCallback(
    (updater: (prev: TriageExtraction) => TriageExtraction) => {
      setExtraction((prev) => (prev ? updater(prev) : prev));
      setApprovedDisposition(null);
    },
    [],
  );

  const approve = useCallback(() => {
    if (!rulesResult) return;
    setApprovedDisposition(rulesResult.disposition);
    setUiState("approved");
  }, [rulesResult]);

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-semibold">Bankruptcy Intake Triage</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Turn messy intake notes into structured facts, flag blocking gaps, and route cases before
          petition prep. Demo for Glade.ai application — fictional clients only, not legal advice.
        </p>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-6 py-6 lg:grid-cols-3">
        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Intake notes</h2>
          <select
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
            value={sampleId}
            onChange={(e) => {
              const id = e.target.value;
              if (id) loadSample(id);
              else setSampleId("");
            }}
          >
            <option value="">Load sample…</option>
            {SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
          <textarea
            className="h-64 w-full rounded-md border border-zinc-300 p-3 text-sm"
            placeholder="Paste intake call notes or web form text…"
            value={intakeText}
            onChange={(e) => {
              setIntakeText(e.target.value);
              setSampleId("");
            }}
          />
          <button
            type="button"
            onClick={analyze}
            disabled={!intakeText.trim() || uiState === "loading"}
            className="w-full rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uiState === "loading" ? "Analyzing…" : "Analyze intake"}
          </button>
          {error && <p className="text-sm text-red-600">{error}</p>}
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
                  className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-zinc-900"
                  value={extraction.confidence}
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
              {extraction.ambiguities.length > 0 && (
                <div className="rounded-md bg-zinc-50 p-3 text-sm">
                  <p className="font-medium">Ambiguities</p>
                  <ul className="mt-1 list-disc pl-5 text-zinc-600">
                    {extraction.ambiguities.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="font-semibold">Missing and blocking items</h2>
          {!rulesResult ? (
            <p className="text-sm text-zinc-500">Checklist appears after analysis.</p>
          ) : (
            <>
              <p className="text-sm text-zinc-600">
                Disposition preview:{" "}
                <span className="font-medium">{DISPOSITION_LABELS[rulesResult.disposition]}</span>
              </p>
              <ul className="space-y-2">
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
                disabled={!extraction || uiState === "loading"}
                className="w-full rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium hover:bg-zinc-50 disabled:opacity-50"
              >
                Approve triage
              </button>
            </>
          )}
        </section>
      </main>

      {approvedDisposition && (
        <div className="mx-auto max-w-7xl px-6 pb-8">
          <div
            className={`rounded-lg border px-4 py-3 text-sm font-medium ${DISPOSITION_STYLES[approvedDisposition]}`}
          >
            Approved: {DISPOSITION_LABELS[approvedDisposition]}
          </div>
        </div>
      )}
    </div>
  );
}
