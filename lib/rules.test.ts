import { describe, expect, it } from "vitest";
import { runRules } from "./rules";
import { SAMPLES } from "./samples";

describe("runRules", () => {
  it("Sarah M. is ready for petition prep", () => {
    const sample = SAMPLES.find((s) => s.id === "sarah-m")!;
    const result = runRules(sample.cannedExtraction);
    expect(result.disposition).toBe("ready_for_petition_prep");
    expect(result.missing.filter((m) => m.severity === "blocking")).toHaveLength(0);
  });

  it("James R. needs follow-up for blocking gaps", () => {
    const sample = SAMPLES.find((s) => s.id === "james-r")!;
    const result = runRules(sample.cannedExtraction);
    expect(result.disposition).toBe("needs_follow_up");
    expect(result.missing.some((m) => m.field === "debtor.monthlyIncome")).toBe(true);
    expect(result.missing.some((m) => m.field === "history.receivedCreditCounseling")).toBe(
      true,
    );
  });

  it("Maria L. needs attorney review for ambiguities", () => {
    const sample = SAMPLES.find((s) => s.id === "maria-l")!;
    const result = runRules(sample.cannedExtraction);
    expect(result.disposition).toBe("needs_attorney_review");
  });
});
