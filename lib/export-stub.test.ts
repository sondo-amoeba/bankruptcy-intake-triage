import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  buildStubExportFailure,
  shouldSimulateExportFailure,
} from "./export-stub";

describe("export stub", () => {
  const original = process.env.EXPORT_SIMULATE_FAILURE;

  afterEach(() => {
    if (original === undefined) delete process.env.EXPORT_SIMULATE_FAILURE;
    else process.env.EXPORT_SIMULATE_FAILURE = original;
  });

  it("simulates failure on first attempt when flag set", () => {
    process.env.EXPORT_SIMULATE_FAILURE = "true";
    expect(shouldSimulateExportFailure("key-1", false)).toBe(true);
    expect(shouldSimulateExportFailure("key-1", true)).toBe(false);
  });

  it("does not simulate when flag unset", () => {
    delete process.env.EXPORT_SIMULATE_FAILURE;
    expect(shouldSimulateExportFailure("key-1", false)).toBe(false);
  });

  it("returns actionable failure message", () => {
    const result = buildStubExportFailure();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errorMessage).toContain("Simulated");
    }
  });
});

describe("idempotent export key behavior", () => {
  it("second attempt after failure should not simulate again", () => {
    process.env.EXPORT_SIMULATE_FAILURE = "true";
    const key = "approval-123";
    expect(shouldSimulateExportFailure(key, false)).toBe(true);
    expect(shouldSimulateExportFailure(key, true)).toBe(false);
  });
});
