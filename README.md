# Bankruptcy Intake Triage

Demo project for the [Glade.ai](https://www.glade.ai) Software Engineer application.

**Live demo:** https://bankruptcy-intake-triage.vercel.app

**Repository:** https://github.com/sondo-amoeba/bankruptcy-intake-triage

## Problem

Bankruptcy firms lose time when intake notes are incomplete or inconsistent before petition prep. Paralegals need structured facts, blocking gaps flagged early, and a human approval step before downstream workflows.

## What I built

Single-page app: paste intake notes (or load a sample) → server-side LLM extraction → Zod validation → deterministic rule engine → editable review → Approve → disposition banner.

## Architecture

```
React UI (app/page.tsx)
  → POST /api/triage
  → OpenAI (custom paste) OR canned sample
  → Zod schema validation
  → lib/rules.ts (blocking vs follow-up, disposition)
  → UI edit + client-side rule recompute
  → Approve
```

**Hybrid pattern:** LLM extracts facts; code enforces compliance-style missing-field rules (tested separately with Vitest).

## Tradeoffs and v1 cuts

- No PDF upload, CRM sync, PostgreSQL, auth, or multi-case queue
- Sample intakes work without `OPENAI_API_KEY`
- Custom paste requires server-side API key on Vercel
- Rules are simplified for demo — not legal advice

## Local setup

```bash
npm install
cp .env.example .env.local   # optional for custom paste
npm run dev
```

Open http://localhost:3000

## Sample scenarios

| Sample | Expected disposition |
|--------|---------------------|
| Sarah M. | Ready for petition prep |
| James R. | Needs follow-up |
| Maria L. | Needs attorney review |

## Scripts

```bash
npm test    # rule engine unit tests
npm run build
```

## Deploy (Vercel)

```bash
vercel link
vercel env add OPENAI_API_KEY
vercel --prod
```

## Disclaimer

Fictional client data only. This tool does not provide legal advice and is not affiliated with Glade.ai. Built as an engineering demo for a job application.
