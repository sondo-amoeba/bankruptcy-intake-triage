import { randomUUID } from "crypto";

export type StubExportResult =
  | { ok: true; syncId: string; target: string; receivedAt: string }
  | { ok: false; errorMessage: string };

export function shouldSimulateExportFailure(
  idempotencyKey: string,
  priorFailedAttempt: boolean,
): boolean {
  if (process.env.EXPORT_SIMULATE_FAILURE !== "true") {
    return false;
  }
  return !priorFailedAttempt;
}

export function buildStubExportSuccess(): Extract<StubExportResult, { ok: true }> {
  return {
    ok: true,
    syncId: `demo-sync-${randomUUID()}`,
    target: "demo-practice-mgmt",
    receivedAt: new Date().toISOString(),
  };
}

export function buildStubExportFailure(): Extract<StubExportResult, { ok: false }> {
  return {
    ok: false,
    errorMessage: "Simulated practice-management outage (EXPORT_SIMULATE_FAILURE=true)",
  };
}
