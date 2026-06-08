# Export case packets from immutable approval records

Status: accepted

When a case is **approved**, we write an **immutable approval record** containing the full extraction JSON, disposition, missing items, intake text hash, extraction source (`sample` | `gemini`), model name, and analyzed-at timestamp. **Export always builds the case packet from this approval record**, not from live editable fields on `triage_cases`.

**Why:** The human-in-the-loop gate only has meaning if downstream integration receives exactly what was signed off. Live case rows remain editable in `analyzed` status; after approve, export must not silently pick up post-approval drift (there should be none — approve transitions status — but the snapshot makes the contract explicit). This mirrors compliance-style “authorized state at time T” patterns from legal billing platforms.

**Considered:** Pointer-only approval (reference current case row) — rejected because it weakens audit story; field-level edit delta log — rejected as v3 scope.

**Consequences:** One approval per case in v1 (unique constraint on `case_id` in `approval_records`). Re-approve after correction requires a v3 “reopen” flow we explicitly cut. Export idempotency keys are tied to `approval_record_id`.
