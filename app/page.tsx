"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SAMPLES } from "@/lib/samples";
import {
  DISPOSITION_LABELS,
  STATUS_LABELS,
  STATUS_STYLES,
} from "@/lib/ui/disposition";
import type { Disposition } from "@/lib/schema";

type CaseListItem = {
  id: string;
  status: string;
  title: string;
  dispositionPreview: Disposition | null;
  createdAt: string;
  sampleId: string | null;
};

export default function CaseQueuePage() {
  const router = useRouter();
  const [cases, setCases] = useState<CaseListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/cases");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load cases");
      setCases(data.cases);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load cases");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCases();
  }, [loadCases]);

  const createCase = useCallback(
    async (body: { intakeText?: string; sampleId?: string }) => {
      setError(null);
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create case");
      router.push(`/cases/${data.id}`);
    },
    [router],
  );

  return (
    <div className="min-h-full bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white px-6 py-5">
        <h1 className="text-2xl font-semibold">Bankruptcy Intake Triage</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600">
          Case queue — open a triage workspace to analyze intake, approve disposition, and export
          to practice management. Fictional data only; not legal advice.
        </p>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-6">
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => createCase({ intakeText: "New intake — paste notes in workspace." })}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white"
          >
            New intake
          </button>
          <select
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            defaultValue=""
            onChange={async (e) => {
              const sampleId = e.target.value;
              if (!sampleId) return;
              try {
                await createCase({ sampleId });
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to create sample case");
              }
              e.target.value = "";
            }}
          >
            <option value="">Start from sample…</option>
            {SAMPLES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <section className="rounded-lg border border-zinc-200 bg-white">
          <h2 className="border-b border-zinc-200 px-4 py-3 font-semibold">Recent cases</h2>
          {loading ? (
            <p className="px-4 py-6 text-sm text-zinc-500">Loading…</p>
          ) : cases.length === 0 ? (
            <p className="px-4 py-6 text-sm text-zinc-500">No cases yet. Create one above.</p>
          ) : (
            <ul className="divide-y divide-zinc-100">
              {cases.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/cases/${item.id}`}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-zinc-50"
                  >
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(item.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.dispositionPreview && (
                        <span className="text-xs text-zinc-600">
                          {DISPOSITION_LABELS[item.dispositionPreview]}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[item.status] ?? STATUS_STYLES.draft}`}
                      >
                        {STATUS_LABELS[item.status] ?? item.status}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
