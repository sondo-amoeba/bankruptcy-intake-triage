# Optional simulated export failure for live demo

Status: accepted

When `EXPORT_SIMULATE_FAILURE=true`, the **first** export attempt for a given idempotency key fails with a logged `failed` status; a **retry with the same key** succeeds and returns a stable `syncId`. Default off in production unless explicitly enabled for demos.

**Why:** Idempotency and integration retry semantics are invisible when every export succeeds on the first try. A controllable failure mode lets the applicant demo AffiniPay-style fault tolerance in a Glade screen share without flaky external dependencies.

**Considered:** Always fail first attempt — rejected (bad reviewer experience on live URL); random failure — rejected (non-deterministic demos).

**Consequences:** Export service branches on env flag; tests cover both paths. Document in README so reviewers are not surprised on the public deployment.
