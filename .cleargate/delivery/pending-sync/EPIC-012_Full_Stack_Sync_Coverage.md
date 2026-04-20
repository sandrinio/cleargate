---
epic_id: EPIC-012
status: Ready
ambiguity: 🟢 Low
context_source: ./PROPOSAL-007_Multi_Participant_MCP_Sync.md
owner: Vibe Coder (sandro.suladze@gmail.com)
target_date: null
created_at: 2026-04-21T10:00:00Z
updated_at: 2026-04-21T10:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
depends_on_epics:
  - EPIC-003
  - EPIC-010
  - EPIC-011
scope_version: v1
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T20:12:15Z
approved: true
stamp_error: no ledger rows for work_item_id EPIC-012
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T20:11:41Z
  sessions: []
---

# EPIC-012: Full-Stack Sync Coverage (Sprints, Reports, Plans, Flashcards)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Extend MCP's sync surface to cover the three Business↔IT artefacts currently excluded from push_item: sprint plans, sprint reports, and architect milestone plans. After this Epic, a Business stakeholder visiting admin.cleargate.&lt;domain&gt; can read the full sprint package (plan + story list + report + per-milestone architect notes) in one place, and any developer pulling the project gets the same mirror in their local .cleargate/. Team-wide FLASHCARD.md becomes a project-scoped "lessons" record too.</objective>
  <architecture_rules>
    <rule>Extend the existing push_item enum — do NOT introduce a parallel push_sprint/push_report path. MCP's type column already supports free-text; only the Zod enum gates it. Single code path = single auth + audit path.</rule>
    <rule>Reports and milestone plans are NOT stored as top-level items — they ride on the parent sprint's payload as payload.report_body (string) and payload.plans: { "M1": "...", "M2": "..." } (record). Keeps item identity simple (1 sprint = 1 item) and avoids orphan rows.</rule>
    <rule>CLI derives the report + plans from disk on push: for SPRINT-NN, read .cleargate/sprint-runs/SPRINT-NN/REPORT.md if present, + glob .cleargate/sprint-runs/SPRINT-NN/plans/*.md. Missing files = omit field, not fail.</rule>
    <rule>FLASHCARD.md is project-scoped metadata, not a work item — land it as payload.flashcard on the project row (new column or a synthetic type="flashcard" singleton per project). Choose the less-invasive of the two during architect review.</rule>
    <rule>Backwards-compatible: existing 105 items in prod must continue to load without schema violations. Add fields with defaults, never remove.</rule>
    <rule>Admin UI sprint detail view reuses the markdown renderer from STORY-011-06 (marked + DOMPurify). No new rendering deps.</rule>
    <rule>No new runtime deps in either mcp/ or cleargate-cli/. All additions must reuse what the SPRINT-08 code already pulls in.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/tools/push-item.ts" action="modify" />
    <file path="mcp/src/tools/push-item.test.ts" action="modify" />
    <file path="mcp/src/admin-api/openapi.ts" action="modify" />
    <file path="mcp/src/admin-api/items.ts" action="modify" />
    <file path="cleargate-cli/src/commands/push.ts" action="modify" />
    <file path="cleargate-cli/src/commands/push.test.ts" action="modify" />
    <file path="cleargate-cli/src/admin-api/responses.ts" action="modify" />
    <file path="admin/src/routes/projects/[id]/items/[clid]/+page.svelte" action="modify" />
    <file path="admin/src/lib/components/SprintDetail.svelte" action="create" />
    <file path="admin/src/routes/projects/[id]/flashcard/+page.svelte" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
SPRINT-08 shipped the four onboarding blockers and proved the Business↔IT sync loop end-to-end for stories/epics/proposals/CRs/bugs. But during the SPRINT-08 prod bulk-push, five SPRINT files silently failed with `cannot determine item type from frontmatter` — MCP's `push_item` enum only accepts six types, none are `"sprint"`. Worse, even if we whitelisted sprints, the interesting *context* for a manager — the sprint's plan (what we promised), the REPORT.md (what we shipped), the per-milestone architect plans (how we split the work) — isn't in the repo's `delivery/` folder at all. REPORT.md lives under `.cleargate/sprint-runs/<id>/`, architect plans under `.cleargate/sprint-runs/<id>/plans/`. The CLI never scans those paths, so nothing about sprint outcomes reaches the prod mirror.

From the managers' side, this means visiting `admin.cleargate.soula.ge` shows 105 items but no way to answer "how did SPRINT-07 go?". From a developer's side, checking out a fresh clone and running `cleargate pull SPRINT-07` brings back nothing. Both roles end up reading markdown in the repo anyway, which defeats the Business↔IT-transparency value prop.

Team-wide `FLASHCARD.md` is a third blind spot — it's the canonical ledger of lessons-learned (flagged `#auth`, `#test-seam`, `#bcrypt`, ...) but lives as one file at repo root, never synced, never readable by the PM stakeholder who might want to answer "what got us burned last sprint?".

**Success Metrics:**
- `cleargate push SPRINT-08_*.md` exits 0 and admin UI shows the sprint as a first-class item.
- Opening a sprint in admin UI renders three cards: **Plan** (sprint goal + risk table + deliverables), **Report** (REPORT.md verbatim), **Milestones** (each architect plan M1, M2, M3, ... as expandable panel). All via the cg-markdown renderer shipped in SPRINT-08.
- `cleargate pull SPRINT-08` (from a fresh clone) writes `.cleargate/delivery/archive/SPRINT-08_*.md` + `.cleargate/sprint-runs/SPRINT-08/REPORT.md` + `.cleargate/sprint-runs/SPRINT-08/plans/M*.md` to disk.
- Admin UI has a `/projects/<id>/flashcard` route that renders the team flashcard log, filtered per project.
- Zero regression in existing 105 items — they load with the same payload shape, no zod strict-mode violations.

## 2. Scope Boundaries

**✅ IN-SCOPE — 5 Stories**

- [ ] **Story 1: Extend `push_item` type enum to include `"sprint"`.** Add to the Zod enum in `mcp/src/tools/push-item.ts`, regenerate openapi schema, add unit test for sprint push. Update `cleargate-cli/src/commands/push.ts` `getItemType()` to map `sprint_id` → `"sprint"`. L1.
- [ ] **Story 2: CLI folds `REPORT.md` + `plans/M*.md` into sprint payload on push.** When pushing a SPRINT file, CLI reads the co-located `.cleargate/sprint-runs/<id>/REPORT.md` (if exists) and `plans/*.md` and attaches them as `payload.report_body: string` + `payload.plans: Record<milestoneId, string>`. Missing files → field omitted. L2.
- [ ] **Story 3: Admin UI `SprintDetail.svelte` component.** When `item.type === "sprint"`, the detail page renders three markdown cards — Plan (current body), Report (report_body), Milestones (each plan as an expand/collapse panel). Reuses cg-markdown CSS. L2.
- [ ] **Story 4: FLASHCARD.md as project-scoped metadata.** New CLI subcommand `cleargate flashcard push` that reads `.cleargate/FLASHCARD.md` and writes it to MCP as `payload.flashcard_body` on a synthetic `type: "project-metadata"` singleton keyed to the project. Admin UI new route `/projects/<id>/flashcard` renders it. L2.
- [ ] **Story 5: `cleargate pull SPRINT-<ID>` writes all three artefacts to disk.** When pulling a sprint, CLI reconstructs `.cleargate/sprint-runs/<id>/REPORT.md` + `plans/M*.md` alongside the sprint file itself. Extends the existing pull handler's write path. L2.

**❌ OUT-OF-SCOPE — v1.2+**

- Token ledger sync (`token-ledger.jsonl`). Per-machine agent telemetry; aggregation is a separate analytics concern.
- `.cleargate/wiki/` sync. Wiki is compiled from sources + already works locally; prod admin doesn't need it yet.
- Linear/Jira adapter for sprint→epic mapping. Existing EPIC-010 scope. This Epic is purely MCP↔CLI↔admin.
- Mobile polish on the sprint detail view.
- "Filter admin UI by sprint" — requires a cross-item index query that's v1.2.
- Per-sprint velocity / story-point charts in admin UI.
- Markdown-diff view across sprint report versions.

## 3. The Reality Check (Context)

**Operating constraints:**

- MCP's `items.type` column is TEXT, not an enum — Zod is the only gate. Adding `"sprint"` is a one-line schema change + tests.
- `items.current_payload` is JSONB with no size cap set. A full sprint package (plan ~8KB + report ~5KB + 3×M plans ~12KB total) fits comfortably in a single JSONB row.
- `sprint-runs/<id>/` is not gitignored for REPORT.md / plans/M*.md, but `.cleargate/sprint-runs/.active` IS gitignored (per-machine state). The per-machine sentinel must NEVER end up in the payload.
- `FLASHCARD.md` is repo-root, not per-project. If we project-scope it, we need a rule for multi-project repos (none exist today, but the protocol allows it). Decision: `payload.flashcard_body` gets the full file; filtering is admin UI's job.
- Admin UI item-detail page is a single `+page.svelte` with conditional cards. Adding a sprint-type branch is a 10-line addition, not a new route.
- The existing `cg-markdown` CSS + marked + DOMPurify chain (STORY-011-06) handles all four bodies (plan, report, plans[M1..N], flashcard) with zero new dependencies.
- `cleargate pull` (EPIC-010) already writes frontmatter + body to disk; extending to emit siblings (`REPORT.md`, `plans/M*.md`) is a 20-line addition to its write path.

| Constraint | Rule |
|---|---|
| Item count | ONE sprint → ONE item. Report + plans ride as payload subkeys, not rows. |
| Payload schema | Additive only. `report_body?: string`, `plans?: Record<string, string>`, `flashcard_body?: string`. All optional — existing items unaffected. |
| Filesystem writes on pull | Atomic: write to `.tmp` then rename. Matches `cleargate push`'s attribution write-back pattern. |
| Sprint detail UI | Three cards max; render order: Plan → Milestones → Report. Report collapsed by default (it's long). |
| Flashcard view | Separate route (`/projects/<id>/flashcard`) — not embedded in item detail. Always fetched via admin-api, never cached. |
| Test infra | All new tests hit real Postgres (per #mocked-tests flashcard). No mocking push_item's DB layer. |

## 4. Technical Grounding

**Affected Files** (complete list):

- `mcp/src/tools/push-item.ts` — extend `PushItemInputSchema.type` Zod enum: add `"sprint"` (and `"project-metadata"` for Story 4). Update type definition. Backend accepts; `items.type` column already text.
- `mcp/src/tools/push-item.test.ts` — 2 new tests: `pushes a sprint item` + `pushes project-metadata item`.
- `mcp/src/admin-api/openapi.ts` — update generated spec to include new enum values + report_body/plans/flashcard_body fields.
- `mcp/src/admin-api/items.ts` — no logic change, but ItemSummaryDto's `current_payload: Record<string, unknown>` already covers the new fields (shipped in SPRINT-08).
- `cleargate-cli/src/commands/push.ts` — (a) `getItemType()` maps `sprint_id` → `"sprint"`. (b) When pushing a sprint, read `.cleargate/sprint-runs/<sprint_id>/REPORT.md` into `payload.report_body` + glob `plans/*.md` into `payload.plans`. All reads guarded with `fs.existsSync` — missing files drop the field.
- `cleargate-cli/src/commands/push.test.ts` — 3 new cases: sprint with report, sprint without report (field absent), sprint with 3 milestone plans.
- `cleargate-cli/src/admin-api/responses.ts` — ItemSummarySchema already has `current_payload`; no change. Export typed helper `SprintPayload` = `ItemSummary & { current_payload: { report_body?: string; plans?: Record<string, string> } }`.
- `cleargate-cli/src/commands/flashcard-push.ts` — **new** — handler for `cleargate flashcard push`. Reads `.cleargate/FLASHCARD.md`, pushes as `{ cleargate_id: `flashcard:${projectSlug}`, type: "project-metadata", payload: { flashcard_body: fileContents, approved: true } }`.
- `cleargate-cli/src/cli.ts` — register `flashcard` subcommand group with `push` subcommand.
- `cleargate-cli/src/commands/pull.ts` — extend write path: if pulled item's type is `"sprint"` and payload has `report_body`, write `.cleargate/sprint-runs/<id>/REPORT.md`. Same for each key in `payload.plans` → `plans/<key>.md`.
- `cleargate-cli/src/commands/pull.test.ts` — 2 new cases: pull sprint writes report, pull sprint writes plans.
- `admin/src/routes/projects/[id]/items/[clid]/+page.svelte` — conditional branch on `item.type === "sprint"`: render `<SprintDetail ... />` instead of generic Content + Frontmatter cards.
- `admin/src/lib/components/SprintDetail.svelte` — **new** — three cards: Plan (marked(body)), Milestones (each plan key → expand panel with marked), Report (collapsed card with marked(report_body)).
- `admin/src/routes/projects/[id]/flashcard/+page.svelte` — **new** — loads `project-metadata:flashcard` item, renders marked(payload.flashcard_body) via cg-markdown.
- `admin/src/routes/projects/[id]/+layout.svelte` — add "Flashcard" tab to the per-project nav (alongside Overview / Members / Tokens / Items / Audit / Stats).

**Data Changes:** none. `items` schema already has the columns. Only Zod enum widens.

## 5. Acceptance Criteria

```gherkin
Feature: Full-stack sync coverage

  Scenario: Push a sprint file with report + 3 milestone plans
    Given .cleargate/delivery/pending-sync/SPRINT-09_Demo.md exists with sprint_id=SPRINT-09
    And .cleargate/sprint-runs/SPRINT-09/REPORT.md exists
    And .cleargate/sprint-runs/SPRINT-09/plans/M1.md, M2.md, M3.md exist
    When I run `cleargate push .cleargate/delivery/pending-sync/SPRINT-09_Demo.md`
    Then the command exits 0
    And MCP receives push_item with type="sprint"
    And the payload contains report_body (the REPORT.md contents)
    And the payload contains plans = { "M1": "...", "M2": "...", "M3": "..." }

  Scenario: Push a sprint with no report or plans (early sprint, mid-execution)
    Given .cleargate/delivery/pending-sync/SPRINT-10_Future.md exists
    And no sprint-runs/SPRINT-10 directory exists
    When I run `cleargate push .cleargate/delivery/pending-sync/SPRINT-10_Future.md`
    Then the command exits 0
    And the payload does NOT contain report_body
    And the payload does NOT contain plans

  Scenario: Admin UI renders a sprint with three cards
    Given a sprint item in prod with plan body + report_body + plans[M1, M2]
    When I navigate to /projects/<id>/items/SPRINT-09
    Then I see a Plan card rendering the sprint body as markdown
    And I see a Milestones card with M1 and M2 as expand/collapse panels
    And I see a Report card (collapsed by default) with the REPORT.md content
    And clicking "Show more" on Report expands it inline

  Scenario: Flashcard push
    Given .cleargate/FLASHCARD.md exists with multiple entries
    When I run `cleargate flashcard push`
    Then MCP receives push_item with type="project-metadata" and cleargate_id="flashcard:<projectSlug>"
    And the payload contains flashcard_body = the full file contents

  Scenario: Admin UI flashcard tab
    Given the current project has a flashcard item synced
    When I navigate to /projects/<id>/flashcard
    Then I see the flashcard content rendered as markdown
    And tags like #auth, #bcrypt are visible as inline code

  Scenario: Pull sprint writes report + plans to disk
    Given a fresh clone with no sprint-runs/SPRINT-09 directory
    When I run `cleargate pull SPRINT-09`
    Then .cleargate/delivery/archive/SPRINT-09_<Name>.md is written
    And .cleargate/sprint-runs/SPRINT-09/REPORT.md is written
    And .cleargate/sprint-runs/SPRINT-09/plans/M1.md, M2.md, M3.md are written

  Scenario: Existing items unaffected
    Given 105 pre-existing items in the prod project (stories, epics, proposals, CRs, bugs)
    When the new admin UI loads /projects/<id>/items
    Then all 105 items render without zod validation errors
    And clicking any non-sprint item shows the existing Content + Frontmatter cards unchanged
```

## 6. AI Interrogation Loop — RESOLVED

*All scope-level questions resolved 2026-04-21 via review of SPRINT-08 prod-bulk-push failures + Business↔IT transparency gap surfaced in that sprint:*

1. **Why not make report + plans first-class items (their own `items` rows)?** — Tried that during scoping. Creates orphan-row problems (delete a sprint, what happens to its reports?) and requires per-milestone `cleargate_id` schemes that don't map to any existing ClearGate concept. One sprint = one item + bundled subkeys is simpler and matches how the protocol already conceptualizes sprints (one plan + one report + N plans, all cohesive).

2. **Why not a new top-level `reports` table in MCP's schema?** — Would require migration + FK to items. The JSONB payload approach costs zero schema work and scales fine to the expected volume (one REPORT per sprint, bounded).

3. **FLASHCARD.md — project-scoped or repo-scoped?** — Project-scoped via `type: "project-metadata"` singleton. The current repo has one project so both models render identically; the protocol allows multiple projects per repo and in that case each project gets its own flashcard page. Ops clarity > purity.

4. **Should architect plans (M1, M2, ...) each be their own pushable item?** — No. They're transient artefacts produced once per sprint by the architect agent, only meaningful as context for a specific sprint. Bundling under the sprint's `payload.plans` keeps them discoverable without bloating item count.

5. **What about `CLAUDE.md` / `cleargate-protocol.md`?** — Out of scope. Protocol docs are shipped by `cleargate init` (scaffold payload) and are the same across every install. They don't need sync because they're not dynamic content.

6. **Should push be atomic across sprint + report + plans?** — The payload IS atomic (one push_item call). Either the full bundle writes or none. No multi-step transaction needed.

7. **Where does `cleargate flashcard push` surface in the CLI help?** — Under `cleargate flashcard --help` subgroup, alongside future `flashcard pull` and `flashcard query`. Parallels the existing `wiki` subcommand group.

8. **Sprint placement.** — Goes into **SPRINT-09** as the anchor Epic. 5 stories, 1 × L1 + 4 × L2, fits a single sprint. Can start immediately after SPRINT-08 close.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY for Story decomposition**

Gate requirements (all met 2026-04-21):

- [x] Context lineage documented (PROPOSAL-007 approved ancestor + SPRINT-08 prod-bulk-push failure traces)
- [x] `<agent_context>` block complete with 7-rule architecture + 10 target files
- [x] §4 Technical Grounding enumerates all affected files; zero data changes required
- [x] §2 scope is 5 stories, each independently testable
- [x] §6 AI Interrogation Loop answered (8 answers; zero open questions)
- [x] Scope split v1 vs v1.2 explicit
- [x] No placeholder tokens in body

Downstream: architect produces SPRINT-09 M1 plan from the 5-story slicing in §2 IN-SCOPE; stories draft into `.cleargate/delivery/pending-sync/STORY-012-0N_*.md`. Sprint plan `SPRINT-09_Full_Stack_Sync_Coverage.md` frames milestones + DoD.
