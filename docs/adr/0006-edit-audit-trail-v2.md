# Edit audit trail with superseded analysis runs (v2)

Status: accepted

v2 records **field-level edit events** while a case is in `analyzed` status. Each analyze creates an **analysis run** with an **analyzed snapshot** baseline. Edits commit on **field blur** (text/number) or **immediate change** (checkboxes/selects). Each event stores field path, from/to values, timestamp, run ID, and `editorLabel: "Demo paralegal"`.

**Re-analyze** starts a new run and **supersedes** edit events from prior runs (retained, collapsed in UI — not deleted). **Approve** rolls up an **edit summary** (active run only) onto the approval record. **Export** includes `editSummary` in the case packet.

**Why:** v1’s approval snapshot answers “what was signed off?” v2 answers “what did the human change before sign-off?” — a common Glade/compliance follow-up without auth or integration scope. Superseded runs handle the realistic case where intake text changes and the model re-runs without losing audit history.

**Considered:** Approve-time diff only (no timeline) — rejected as too thin; hard reset on re-analyze — rejected as loses history; full event sourcing — rejected (v3+).

**Consequences:** New tables and patch API semantics; v1 approval record schema gains `editSummary`; export payload grows. Real user identity deferred to v3.
