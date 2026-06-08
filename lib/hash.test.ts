import { describe, expect, it } from "vitest";
import { hashIntakeText } from "./hash";

describe("hashIntakeText", () => {
  it("is stable for same intake", () => {
    const text = "  Sarah Martinez, CA\nIncome $3200  ";
    expect(hashIntakeText(text)).toBe(hashIntakeText(text));
  });

  it("differs when intake changes", () => {
    expect(hashIntakeText("a")).not.toBe(hashIntakeText("b"));
  });
});
