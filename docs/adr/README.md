# Architecture Decision Records

Design decisions for the Bankruptcy Intake Triage demo (v1 shipped, v2 planned).

| ADR | Status | Summary |
|-----|--------|---------|
| [0001](./0001-postgres-vercel-persistence.md) | Accepted | Persist cases in Vercel Postgres (Neon) via Drizzle |
| [0002](./0002-export-from-approval-snapshot.md) | Accepted | Export builds case packets from immutable approval records |
| [0003](./0003-idempotent-approve-and-export.md) | Accepted | Idempotent approve + export; analyze is overwrite-on-rerun |
| [0004](./0004-v1-ui-and-integration-boundaries.md) | Accepted | Case queue + workspace UI; stub practice-management export only |
| [0005](./0005-simulated-export-failure.md) | Accepted | Optional env flag to demo export retry semantics |
| [0006](./0006-edit-audit-trail-v2.md) | Accepted | Planned v2 — field-level edit audit with superseded analysis runs |

Each ADR captures context, the decision, alternatives considered, and consequences — written for reviewers and future maintainers.
