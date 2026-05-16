---
cr_id: CR-067
parent_ref: status-vocabulary across templates, gate-checks, scripts, archived items
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-28
carry_over: false
area: cli,scripts,templates,gate-checks,migration
status: Approved
approved: true
approved_by: sandrinio
approved_at: 2026-05-17T00:00:00Z
created_at: 2026-05-17T00:00:00Z
updated_at: 2026-05-16T20:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
context_source: |
  Spawned 2026-05-17 from CR-066 Q2 resolution. User direction: "we need to
  have 1 and only meaning of done. let's call it Completed". User then
  selected "Spawn CR-067, migrate everything now" via AskUserQuestion —
  covering templates, gate-checks, scripts, AND backfill of all archived
  items in one pass.

  Current vocabulary inventory (2026-05-17 grep over .cleargate/delivery/):
    archive: 107 Completed + 101 Done + 24 Abandoned + 21 "Completed" (quoted)
             + 18 "Abandoned" (quoted) + 12 Verified + 8 Approved (stale)
             + 2 Draft (stale) + 1 Triaged + 1 "🟢" (junk)
    pending-sync: 7 Approved + 5 Draft + 3 Ready + 1 Abandoned + 1 "Planned"
                  + 1 "Approved" (quoted)
  Migration targets: 101 "Done" → "Completed", 12 "Verified" → "Completed",
  plus quote-normalization. ~113 frontmatter rewrites at minimum.

  Memory feedback_status_vocab_completed_only.md tracks this direction.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-16T20:56:30Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-067
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-16T23:31:14Z
  sessions: []
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-16T23:31:34.261Z
push_version: 1
---

# CR-067: Unify Status Vocabulary to "Completed"

## 0.5 Open Questions

> All resolved 2026-05-17 at Gate-1 ack via AskUserQuestion.

- **Q1: Forward-only rename, archive backfill, or both?** **Resolved:** both — templates + gate-checks + scripts update for new items AND ~113 archived items get migrated to `Completed` in one pass.
- **Q2: How does sync-down from Linear/Jira (which use `Done` natively) translate?** **Resolved:** adapter maps remote `Done` / `Resolved` / `Closed` → local `Completed` at ingest time. Local frontmatter is always `Completed`. Adapter mapping table lands in `mcp/src/adapters/README.md`.
- **Q3: Does Sprint state.json `story_state` (Done / Escalated / Parking Lot) also rename?** **Resolved:** **NO.** State-machine vocab for in-flight work is orthogonal to artifact terminal status. `state.json` `story_state: Done` means "agent finished writing code on this story this sprint"; it does NOT mean "the artifact is in terminal status." Keep state.json vocab as-is.

## 1. The Context Override (Old vs. New)

**Obsolete logic (what to remove / forget):**
- Stories use terminal `status: Done`. Bugs use terminal `status: Verified`. CRs use either `Completed` or `Done` inconsistently. Sprints use `Completed`.
- Lifecycle reconciler (`cleargate-cli/src/lib/lifecycle-reconcile.ts:28`) defines `TERMINAL_STATUSES = ['Done', 'Completed', 'Verified']` and gate-check expectations vary per artifact type (line 47, 51, 309).
- Templates (`story.md`, `Bug.md`, `CR.md`) show different terminal labels per artifact in their status enum guidance.
- Wiki ingest (`cleargate-cli/src/lib/wiki/*`) treats all three terminal strings as "shipped" but doesn't normalize them in compiled wiki pages.

**New logic (the new truth):**
- **One and only one terminal status: `Completed`.** Applies to every artifact type (Story, Bug, CR, Epic, Sprint, Proposal, Initiative).
- `TERMINAL_STATUSES` in `lifecycle-reconcile.ts` becomes the single-element set `['Completed']` AFTER the archive backfill migration completes. The CR-067 migration script ensures the rename is atomic; reconciler tightening lands in the same commit as the rename.
- Templates updated: every artifact template's status enum drops `Done` / `Verified` and lists `Completed` as the sole terminal value.
- Gate-checks updated: `bug.verified`, `story.done`, `cr.completed` rules normalize to `*.completed`. Gate-check definitions in `cleargate-cli/src/lib/gate/*` consolidate to one terminal-state check per gate.
- Migration script `cleargate-cli/scripts/migrate-status-to-completed.mjs` walks `.cleargate/delivery/**/*.md`, parses frontmatter, and rewrites `status: Done|Verified` → `status: Completed` atomically (atomic-rename pattern from `push.ts`). Idempotent: re-running produces zero diffs.
- Adapter layer maps remote terminal names (Linear `Done`, Jira `Resolved`/`Closed`, GitHub-Projects `Done`) → local `Completed` at ingest. Local frontmatter is always `Completed`.

## 2. Blast Radius & Invalidation

**Affected callers:**
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` — `TERMINAL_STATUSES` tightens to `['Completed']`; gate-check expectations per artifact type (line 47, 51, 309) consolidate.
- `cleargate-cli/src/lib/gate/*.ts` — bug/story/CR terminal-state gates all check `status === 'Completed'`.
- `cleargate-cli/src/lib/wiki/*` — wiki ingest normalizes terminal strings on read (catches any pre-migration archived items that the migration script missed).
- `.cleargate/templates/{story,Bug,CR,epic,initiative,Sprint Plan Template,sprint_report,hotfix}.md` — status enum guidance updated to `Completed` only.
- `cleargate-planning/.cleargate/templates/*` — mirror.
- `cleargate-cli/templates/cleargate-planning/.cleargate/templates/*` — regenerates via `npm run prebuild`.
- `.cleargate/scripts/close_sprint.mjs` + `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — any literal `'Done'` / `'Verified'` references update to `'Completed'`.
- `cleargate-cli/src/commands/*` — push/pull/sync/stamp all reference status; grep for literals.
- `mcp/src/adapters/*` — Linear/Jira adapter ingest mapping table.
- `.cleargate/wiki/` — wiki rebuild after migration normalizes compiled pages.

**Existing items affected:**
- ~113 archived frontmatter rewrites (101 `Done` → `Completed`, 12 `Verified` → `Completed`).
- ~40 quoted-variant normalizations (`"Completed"`, `"Abandoned"`, etc. → unquoted form).
- 8 stale `Approved` archive items (should be `Completed` per parent-rollup logic from CR-066) — surfaced but not auto-migrated; flagged for human review.
- 2 stale `Draft` archive items — same.
- 1 `Triaged` archive item — left as-is; `Triaged` is a non-terminal state and the item should have moved back to pending-sync. Flagged.
- 1 `"🟢"` archive item — junk; flagged for human cleanup.

**Invalidated assumptions:**
- Anything that grepped frontmatter for `'Done'` or `'Verified'` as a terminal signal needs to grep for `'Completed'`. Includes any tests, fixtures, mocks.
- CR-066's `TERMINAL_STATUSES = {Done, Verified, Completed}` tolerance window closes immediately after this CR's migration commits. CR-066 lands first in SPRINT-28 with the tolerant set; CR-067's last step tightens it.

**Risk:** double-write race — migration script edits a frontmatter at the same time the user runs `cleargate push` on the same file. Mitigation: migration script acquires a `.cleargate/.migration-lock` flock; push commands respect the lock and exit with "migration in progress, retry in 30s".

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts` (TERMINAL_STATUSES at line 28; gate-check expectations at line 47, 51, 309) — single source of truth for terminal vocabulary.
- **Surface:** `cleargate-cli/src/commands/push.ts` — uses `writeAtomic()` pattern; migration script copies the same pattern for atomic frontmatter rewrites.
- **Surface:** `cleargate-cli/src/lib/frontmatter-yaml.ts` — parse + serialize for round-trip-safe edits.
- **Surface:** `.cleargate/templates/*.md` — 8 artifact templates (story, Bug, CR, epic, initiative, Sprint Plan Template, sprint_report, hotfix).
- **Coverage of this CR's scope:** ~80% — extends existing reconciler + push infrastructure; one new migration script.

## 3. Execution Sandbox

**Files to modify:**
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` — tighten `TERMINAL_STATUSES` to `['Completed']`; consolidate per-artifact gate-check expectations.
- `cleargate-cli/src/lib/gate/*.ts` — each terminal-state check uses `Completed`.
- `cleargate-cli/src/lib/wiki/page-schema.ts` (if it normalizes status strings) — single normalization rule.
- `.cleargate/templates/{story.md,Bug.md,CR.md,epic.md,initiative.md,Sprint Plan Template.md,sprint_report.md,hotfix.md}` — status enum guidance.
- `cleargate-planning/.cleargate/templates/*` — mirror.
- `.cleargate/scripts/close_sprint.mjs` + `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — literal status refs.
- `mcp/src/adapters/README.md` — adapter mapping table (Linear `Done`, Jira `Resolved`/`Closed` → local `Completed`).

**Files to create:**
- `cleargate-cli/scripts/migrate-status-to-completed.mjs` — migration runner. Walks `.cleargate/delivery/**/*.md`, parses frontmatter via `frontmatter-yaml.ts`, rewrites terminal status, atomic rename. Dry-run mode prints diff without mutation; flag `--apply` to commit.
- `cleargate-cli/scripts/migrate-status-to-completed.node.test.ts` — fixtures: rewrite Done→Completed, rewrite Verified→Completed, leave Completed unchanged, leave non-terminal unchanged, idempotency.

**Tests to update:**
- Any test fixture under `cleargate-cli/test/fixtures/` or `mcp/test/fixtures/` that uses literal `'Done'` or `'Verified'` as a terminal status — migrate.

**Migration execution plan (3 phases, all in SPRINT-28):**
1. **Phase A** — ship script + tests; run `migrate-status-to-completed --dry-run` against the repo; capture the diff in the PR.
2. **Phase B** — run `migrate-status-to-completed --apply`; commit the rename in a dedicated commit `chore(SPRINT-28): CR-067 vocab unification — Done/Verified → Completed (113 items)`.
3. **Phase C** — tighten `TERMINAL_STATUSES`, update gate-checks, update templates, update adapter mapping. Commit `feat(SPRINT-28): CR-067 — terminal vocab = {Completed}`. Wiki rebuild.

## 4. Verification Protocol

**Old logic eviction:**
- `rg "status:\s*Done|status:\s*Verified" .cleargate/delivery/` → zero matches after Phase B.
- `rg "TERMINAL_STATUSES\s*=\s*\[" cleargate-cli/` → returns `['Completed']` only.
- `rg "'Done'|'Verified'" cleargate-cli/src/lib/gate/` → zero matches.

**New logic verification:**
1. **Unit test green** — `npm test -- migrate-status-to-completed` covers six shapes.
2. **Migration dry-run** — `cleargate-cli/scripts/migrate-status-to-completed.mjs` produces the expected ~113-item diff.
3. **Migration apply** — re-run produces zero diffs (idempotent).
4. **Reconciler still passes** — `cleargate sprint reconcile-lifecycle SPRINT-27` exits 0 after migration.
5. **Wiki rebuild clean** — `cleargate wiki build` 0 errors after migration.
6. **CR-066 sub-story 'reconciler-tighten'** — the one-line edit that drops `Done` + `Verified` from `TERMINAL_STATUSES` lands in the same PR as Phase C.

**Definition of Done:**
- [ ] Migration script + tests merged.
- [ ] Phase B applied: ~113 archived items rewritten; one dedicated commit.
- [ ] Phase C applied: `TERMINAL_STATUSES = ['Completed']`; templates updated; gate-checks updated; adapter mapping documented.
- [ ] All template mirrors (live + canonical + npm payload) in sync.
- [ ] Memory `feedback_status_vocab_completed_only.md` reflects shipped state.
- [ ] Wiki rebuild clean; SPRINT-29 prep audit finds zero `Done` / `Verified` literals in delivery/.
- [ ] Stale-status flagged items (8 `Approved` + 2 `Draft` + 1 `Triaged` + 1 `"🟢"` archive entries) surfaced in PR description for human triage; do not auto-resolve.

## Why not simpler?

- **Smallest existing surface that could carry this CR:** a forward-only template + gate-check update (no archive backfill). Estimated effort: 1 story.
- **Why isn't extension sufficient?** User direction was explicit: "1 and only one meaning of done" + selected "migrate everything now". Forward-only leaves the archive in mixed-vocab state forever, which means lifecycle-reconciler must keep the tolerant `{Done, Verified, Completed}` set forever, and any cross-artifact audit query has to handle three terminal labels. Migrate-now collapses the simplification down to one term everywhere.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — All 3 Open Questions resolved**

- [x] Q1 forward-only vs migrate-everything resolved (migrate-everything per AskUserQuestion).
- [x] Q2 adapter mapping resolved (adapter maps remote terminal → local `Completed`).
- [x] Q3 state.json scope resolved (state.json `story_state` vocab is orthogonal; not in scope).
- [x] §4 Technical Grounding verified against repo (`lifecycle-reconcile.ts:28`).
- [x] No TBDs.
