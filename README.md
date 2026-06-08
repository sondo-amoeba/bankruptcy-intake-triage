# Bankruptcy Intake Triage

Demo project for the [Glade.ai](https://www.glade.ai) Software Engineer application.

**Live demo:** https://bankruptcy-intake-triage.vercel.app

**Repository:** https://github.com/sondo-amoeba/bankruptcy-intake-triage

## Problem

Bankruptcy firms lose time when intake notes are incomplete or inconsistent before petition prep. Paralegals need structured facts, blocking gaps flagged early, a human approval gate, and a handoff to downstream systems.

## What I built (v1)

- **Case queue** (`/`) — recent intakes with status
- **Triage workspace** (`/cases/[id]`) — analyze → edit → approve → export
- **PostgreSQL** — cases, immutable approval records, export attempts
- **Hybrid AI** — Gemini extraction + deterministic rules (`lib/rules.ts`)
- **Idempotent approve & export** — safe double-submit; export history panel
- **Stub practice-management export** — sync ID + case packet from approval snapshot

See [docs/adr/](./docs/adr/) for architecture decisions.

## Architecture

```
/  case queue
/cases/[id]  workspace
  → POST /api/cases/[id]/analyze   (Gemini or sample)
  → PATCH /api/cases/[id]          (edit extraction)
  → POST /api/cases/[id]/approve   (immutable snapshot)
  → POST /api/cases/[id]/export    (idempotent stub handoff)
       ↓
  PostgreSQL (Vercel Postgres / Neon)
  triage_cases | approval_records | export_attempts
```

Legacy v0 endpoint `POST /api/triage` remains for reference; the UI uses the case API.

## Versioning

| Version | Summary |
|---------|---------|
| v0 | Single-page, no persistence (superseded) |
| **v1** | Current — Postgres, queue, audit, export |
| v2 | Planned — field-level edit audit trail |

## Tradeoffs and v1 cuts

- No auth, multi-tenant firms, or real PM OAuth/webhooks
- No PDF upload, CRM sync, or petition drafting
- Field-level edit history → v2
- Rules are simplified for demo — not legal advice

## Local setup

```bash
npm install
cp .env.example .env.local
```

Required in `.env.local`:

- `POSTGRES_URL` — set automatically when [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) Storage is linked (`DATABASE_URL` also works)
- `GEMINI_API_KEY` — optional for custom paste; [Google AI Studio](https://aistudio.google.com/apikey) (samples work without)

```bash
npm run db:push    # apply schema
npm run dev
```

Open http://localhost:3000

Optional: `EXPORT_SIMULATE_FAILURE=true` — first export attempt fails, retry succeeds (demo integration fault tolerance).

## Sample scenarios

| Sample | Expected disposition |
|--------|---------------------|
| Sarah M. | Ready for petition prep |
| James R. | Needs follow-up |
| Maria L. | Needs attorney review |

Start from **Start from sample…** on the case queue.

## Scripts

```bash
npm test           # rules + export idempotency helpers
npm run build
npm run db:push    # Drizzle → Postgres
```

## Deploy (Vercel)

```bash
vercel env pull .env.local   # includes POSTGRES_URL from Vercel Storage
npm run db:push
vercel --prod
```

## Disclaimer

Fictional client data only. This tool does not provide legal advice and is not affiliated with Glade.ai. Built as an engineering demo for a job application.
