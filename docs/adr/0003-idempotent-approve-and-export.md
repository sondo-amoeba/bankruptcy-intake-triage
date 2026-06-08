# Idempotent approve and export (analyze is intentionally not idempotent)

Status: accepted

**Approve** (`POST /api/cases/:id/approve`): second request for the same case returns the existing approval record (HTTP 200) without overwriting. Enforced with a unique constraint on `case_id` in `approval_records`. UI disables the approve button after success.

**Export** (`POST /api/cases/:id/export`): accepts `Idempotency-Key` (default: approval record ID). Retries with the same key return the same `syncId` from the first successful attempt; logged in `export_attempts`. UI shows export history and a retry action.

**Analyze** is **not** idempotent in v1: re-analyze overwrites extraction when intake text changes or the user explicitly re-runs analysis.

**Why:** Double-submit on approve/export is the highest-risk failure mode for downstream legal workflows (duplicate case creation in practice management). That maps directly to Ellipsis webhook replay handling and AffiniPay idempotent integration semantics — the strongest senior signal for minimal scope. Analyze caching adds complexity without a clear demo payoff.

**Considered:** Idempotent analyze (cache by intake hash) — rejected for v1; export-only idempotency — rejected as incomplete story.

**Consequences:** Approve/export need integration-style tests. Analyze remains “last write wins” on the case row.
