# v1 UI: case queue plus workspace; stub integration only

Status: accepted

v1 adds **`/` case queue** (recent cases, status badges, “New intake”) and **`/cases/[id]` triage workspace** (analyze/edit/approve flow plus export history panel). Export calls an **internal stub** (`POST /api/cases/:id/export`) that returns a fake practice-management `syncId` and logs attempts — no OAuth, no external webhook URL, no real MyCase API.

**Why:** Glade reviewers need to see workflow product judgment in under a minute: backlog → open case → approve → export. A second route costs one click but avoids building search, auth, or pagination. A stub integration demonstrates handoff semantics without partnership/API keys that would block submission.

**Considered:** Single-page only with hidden case IDs — rejected (hard to demo audit/export); full ops queue with filters — rejected (CMS creep); real PM webhook — deferred to v2 candidate theme B.

**Consequences:** Sample intakes create or open persisted cases. README documents v1 cuts; real integrations move to [v2-roadmap.md](../../v2-roadmap.md).
