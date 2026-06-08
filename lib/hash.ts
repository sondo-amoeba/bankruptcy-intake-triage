import { createHash } from "crypto";

export function hashIntakeText(intakeText: string): string {
  return createHash("sha256").update(intakeText.trim()).digest("hex");
}
