# Persist triage cases in Vercel Postgres (Neon)

Status: accepted

v1 adds durable triage cases, approval records, and export attempts. We use **Vercel Postgres (Neon serverless PostgreSQL)** with Drizzle migrations rather than SQLite, in-memory storage, or client-only state.

**Why:** Glade’s JD calls out PostgreSQL; the applicant’s AffiniPay work includes Aurora/RDS at legal SaaS scale. A real database makes the audit/export story credible in interviews and supports idempotency constraints (unique keys on approval and export). Vercel Postgres keeps deployment on the existing Vercel project without a separate ops surface.

**Considered:** SQLite/Turso (lighter but weaker JD signal); Supabase (similar, extra vendor narrative); session-only persistence (too thin for balanced v1 scope).

**Consequences:** Requires `DATABASE_URL` on Vercel and local `.env.local`. Migrations become part of the deploy path. Swapping databases later is a meaningful refactor — acceptable for a demo with a bounded schema.
