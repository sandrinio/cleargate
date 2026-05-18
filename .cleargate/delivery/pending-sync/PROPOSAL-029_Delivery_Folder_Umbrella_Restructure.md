---
proposal_id: PROPOSAL-029
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-29
carry_over: true
area: delivery-structure,cli,migration,scaffold
status: Ready
ambiguity: 🟢 Low
context_source: "Conversation 2026-05-17 / 2026-05-18 — user reports flat pending-sync/ + archive/ makes related items unfindable for both humans and agents. Design decisions ratified 2026-05-18 (AskUserQuestion x3): umbrella folders + active/archive partition; sprint co-location (Option α); in-body Task Checklist (not first-class tasks); .active sentinel at delivery/.active (project-level); CRs with stories get own umbrella, scope-tweak CRs nest under parent; archive mirrors umbrella structure; Task Checklist strict-local (never syncs to PM tool); staged migration with flip-point at STORY-029-03."
owner: sandrinio
target_date: 2026-06-15
created_at: 2026-05-18T00:00:00Z
updated_at: 2026-05-18T00:00:00Z
created_at_version: cleargate@0.12.0
updated_at_version: cleargate@0.12.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: parent-approved
      detail: "OR-group failed — all alternatives failed: parent-approved-proposal: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter; parent-approved-initiative: context_source is prose but no proposal_gate_waiver (approved_by + approved_at) found in frontmatter"
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-17T20:13:12Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-029
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-18T16:53:00Z
  sessions: []
---

# EPIC-029: Delivery Folder Umbrella Restructure

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Restructure .cleargate/delivery/ from flat pending-sync/+archive/ into umbrella-grouped folders (active/&lt;EPIC|SPRINT|CR&gt;/, archive/&lt;same&gt;/) so related work items co-locate; co-locate sprint telemetry from sprint-runs/SPRINT-NN/ into active/SPRINT-NN/; add Task Checklist section to story template populated by Architect; ship migration script + upgrade runbook so target repos can roll forward.</objective>
  <architecture_rules>
    <rule>Umbrella path resolver is a single pure function in cleargate-cli/src/lib/. Push, init, wiki ingest, lifecycle reconciler, migration script, and close_sprint all import from it. Never inline path-joins.</rule>
    <rule>pending-sync/ becomes truly transient: only items between Write and cleargate_push_item live there. Push moves the file to active/&lt;umbrella&gt;/. Close moves the umbrella folder to archive/&lt;umbrella&gt;/.</rule>
    <rule>Sprint co-location is Option α: sprint-runs/SPRINT-NN/ collapses into active/SPRINT-NN/. The .active sentinel relocates. The surface-whitelist auto-generated entries (token-ledger.jsonl, state.json, .processed-*) update paths.</rule>
    <rule>Standalone bucket holds items with no epic/sprint/CR parent (orphan stories, solo bugs/CRs). Resolver returns "standalone" when frontmatter has neither parent_epic_ref nor parent_cleargate_id nor sprint_cleargate_id.</rule>
    <rule>Task Checklist is body-only markdown - never frontmatter, never separate files, never synced to PM tool. Architect populates from M-plan during dispatch; Developer flips boxes in commits.</rule>
    <rule>Migration is bidirectional: M-001 has Up (v1→v2) and Down (v2→v1) recipes. .migration-lock primitive (reused from STORY-067-01 pattern) blocks concurrent push during apply.</rule>
    <rule>Canonical-mirror discipline applies (CLAUDE.md "Dogfood split"): every .cleargate/ edit also lands in cleargate-planning/.cleargate/, and the npm payload prebuild copies it forward. No hand-edit of the payload.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/lib/umbrella-path.ts" action="create" />
    <file path="cleargate-cli/src/lib/lifecycle-reconcile.ts" action="modify" />
    <file path="cleargate-cli/src/commands/push.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/scan.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/derive-bucket.ts" action="modify" />
    <file path="cleargate-cli/scripts/migrate-delivery-layout.mjs" action="create" />
    <file path=".cleargate/scripts/close_sprint.mjs" action="modify" />
    <file path=".cleargate/scripts/prep_doc_refresh.mjs" action="modify" />
    <file path=".cleargate/knowledge/cleargate-enforcement.md" action="modify" />
    <file path=".cleargate/knowledge/migrations/M-001_delivery_umbrella.md" action="create" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".claude/hooks/token-ledger.sh" action="modify" />
    <file path=".claude/hooks/session-start.sh" action="modify" />
    <file path=".claude/hooks/pre-edit-gate.sh" action="modify" />
    <file path=".claude/hooks/pre-tool-use-task.sh" action="modify" />
    <file path=".claude/hooks/pending-task-sentinel.sh" action="modify" />
    <file path=".claude/agents/architect.md" action="modify" />
    <file path=".claude/agents/reporter.md" action="modify" />
    <file path="CLAUDE.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
With 27 items in `pending-sync/` and 302 in `archive/`, both humans and agents flat-scan a list with no visible relationship between umbrella and children (e.g. `STORY-028-04` next to `EPIC-010` next to `BUG-004`). The user has reported it directly: *"I'm having a hard time to find items that I need to deliver, AI also is struggling to find them."* Status is conflated with location (`pending-sync` means *not synced* AND *in-flight*), forcing every reader to peek inside files to reconstruct the umbrella graph. Sprint files live in `delivery/` while sprint telemetry lives in `sprint-runs/` — two trees per sprint, doubling the search surface.

**What we're shipping:**
- Umbrella-grouped folders (`active/EPIC-NNN_*/`, `active/SPRINT-NN/`, `active/CR-NNN_*/`, `active/standalone/`, mirrored under `archive/`) so all related items co-locate.
- `pending-sync/` becomes a transient drafted-but-unpushed buffer only.
- Sprint co-location: `sprint-runs/SPRINT-NN/` collapses into `active/SPRINT-NN/` so plan + decomposition + M-plans + token-ledger + REPORT.md all live in one folder.
- Story template gains a `## Task Checklist` section the Architect populates from the M-plan — gives visible progress without promoting tasks to first-class items (which would 3-4× the item count and break PM-tool sync).
- One-shot migration for this meta-repo (329 items) plus an upgrade runbook (`M-001_delivery_umbrella.md`) target repos and Claude Code follow during `cleargate upgrade`.

**Success Metrics (North Star):**
- **Discovery time:** time-to-find-all-children-of-EPIC-X drops from "grep + read N files" to one `ls active/EPIC-X_*/` (qualitative; verified by post-ship user sentiment + agent-trace token usage on `cleargate-wiki-query` calls).
- **Zero orphans after migration:** every item from the pre-migration corpus lands in exactly one umbrella folder; migration script reports `Moved: 329, Skipped: 0, Conflicts: 0`.
- **No regressions in the four-agent loop:** SPRINT-29 (the first sprint executed under the new layout) closes with all stories ingesting, gating, pushing, and merging the same as SPRINT-28 did.
- **Upgrade path works:** at least one target repo (test fixture or the planning-canonical mirror) migrates clean via `M-001` runbook with no manual fixes.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] New folder layout: `active/<umbrella>/` + `archive/<umbrella>/` + transient `pending-sync/` + `active/standalone/`.
- [ ] Pure path resolver lib (`lib/umbrella-path.ts`) consumed by every code path that reads or writes a delivery file.
- [ ] Migration script (`scripts/migrate-delivery-layout.mjs`) with `--dry-run` / `--apply`, `.migration-lock` primitive, idempotency check, and rollback (`--revert`).
- [ ] One-shot meta-repo migration (329 items) applied via the migration script.
- [ ] `cleargate_push_item` / `push.ts` write to `active/<umbrella>/<file>.md` instead of `archive/<file>.md`.
- [ ] Wiki ingest, derive-bucket, and lint walk the new tree; `wiki/index.md` compilation groups by umbrella.
- [ ] Lifecycle reconciler reads new layout; `close_sprint.mjs` slides the entire `SPRINT-NN/` folder from `active/` to `archive/`.
- [ ] Sprint telemetry co-location (Option α): `sprint-runs/SPRINT-NN/` artifacts live under `active/SPRINT-NN/`; hooks + Reporter + ORCHESTRATOR_PROJECT_DIR resolution rewired.
- [ ] `.active` sentinel relocates to `active/.active` (or equivalent); SessionStart hook + skill auto-load read from new path.
- [ ] Story template gains `## Task Checklist` section; Architect agent dispatch instruction updates to populate it from the per-milestone plan; Developer commits flip boxes.
- [ ] Migration runbook (`.cleargate/knowledge/migrations/M-001_delivery_umbrella.md`) with Up/Down/Idempotency-Check/Rollback sections, written for Claude Code consumption during `cleargate upgrade`.
- [ ] CLAUDE.md "Repo layout" + "How work gets done" sections updated; `cleargate-enforcement.md` file-surface contract updated.
- [ ] surface-whitelist.txt entries updated for the relocated sprint-runs artifacts.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Adding tasks as a first-class type with their own files / IDs / statuses / PM-tool sync. (Confirmed in design conversation 2026-05-17: in-body checklist is sufficient; promote later if needed.)
- Per-status sub-folders inside umbrella folders (e.g. `EPIC-029/draft/`, `EPIC-029/in-progress/`). User considered then dismissed — status lives in frontmatter; folders are status-agnostic.
- Renaming or restructuring `archive/` contents that were already shipped (302 items): they move into umbrella folders but their internal frontmatter, status, and content are untouched.
- Changing the work-item ID schema, the status vocabulary (already unified to `Completed` in CR-067), or any sync protocol.
- A graphical or dashboard view of the umbrella tree. (CLI `ls` is sufficient for v1.)
- Cross-epic / cross-sprint dependency visualization.
- Auto-promotion of an umbrella folder to `archive/` based on child statuses (close_sprint owns sprint umbrellas; epic umbrellas move when the human marks the epic `Completed`).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Backward compatibility | Target repos with v1 layout must migrate cleanly via `cleargate upgrade` reading `M-001_delivery_umbrella.md`. Mixed-state repos (half v1, half v2) are explicitly disallowed: migration script detects partial-migration and refuses to proceed without `--force`. |
| Mid-sprint hazard | Cannot ship during SPRINT-28 (active, 10 blocked stories on `existing-surfaces-verified`). Land at SPRINT-28 close or as the leading work in SPRINT-29. |
| Tooling surface | ≥19 files in `cleargate-cli/src/`, ≥5 hooks in `.claude/hooks/`, 3 scripts under `.cleargate/scripts/`, 2 agents under `.claude/agents/`, and the canonical mirror at `cleargate-planning/` all reference delivery paths. Every one needs review. |
| Atomicity | Migration moves 329 files; either all succeed and one commit lands, or nothing changes (transactional via `.migration-lock` + tmpdir-stage + rename-into-place + git-stash on failure). |
| Idempotency | Running migration twice is a no-op (detects v2 layout and exits 0). Required for safe re-runs across machines / branches. |
| Hook contracts | Token-ledger hook writes per-event lines to `sprint-runs/<id>/token-ledger.jsonl`. The path is hard-coded in `.claude/hooks/token-ledger.sh`. Co-location requires editing the hook + re-syncing every machine's live `/.claude/` per the dogfood-split discipline. |
| MCP push path | `cleargate_push_item` historically writes to `archive/` after a successful remote push. New rule: write to `active/<umbrella>/` until the item reaches Completed status; close_sprint or epic-completion moves to `archive/<umbrella>/`. |
| Sentinel relocation | SessionStart + skill auto-load gate on `.cleargate/sprint-runs/.active`. After co-location, this lives at `.cleargate/delivery/active/SPRINT-NN/.active` (or `delivery/.active` pointer file). Coordinate path migration with hook update in one atomic commit. |

## 3.5 Existing Surfaces

> L1 reuse audit. List source-tree implementations the epic could extend. Cite file:line.

- **Surface:** `cleargate-cli/src/commands/push.ts:373` — `pendingSync = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync')`. The single hard-coded write target on push. Will become `umbrellaPath(workItem, 'active')` via the new resolver. **Coverage:** partial — push.ts currently knows pending-sync/ and archive/ only; needs umbrella awareness.

- **Surface:** `cleargate-cli/src/wiki/scan.ts:37` — `for (const subdir of ['pending-sync', 'archive']) { ... }`. The flat-walk in wiki ingest. Becomes a recursive walk under `active/**` + `archive/**` + transient `pending-sync/`. **Coverage:** partial — recursion replaces flat enum.

- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts:181` — `{ rel: 'pending-sync', inArchive: false }` enum entry; lines 413-414 list `pendingDir = path.join(deliveryRoot, 'pending-sync')`. Drives orphan-drift detection. Will resolve umbrella per item; "orphan" definition becomes "no umbrella + no terminal status." **Coverage:** partial.

- **Surface:** `cleargate-cli/src/commands/push.ts:185-187` — sprint-runs path validator allow-list: `Allowed: .cleargate/sprint-runs/SPRINT-NN/REPORT.md`. After co-location, allow-list points at `delivery/active/SPRINT-NN/REPORT.md`. **Coverage:** partial — same logic, new path.

- **Surface:** `cleargate-cli/scripts/migrate-status-to-completed.mjs` (CR-067 STORY-067-01) — establishes the `.migration-lock` pattern + tmpdir-then-rename idempotent migrator. **Coverage:** ≥80% pattern reuse — copy the lock primitive, `--dry-run` flag, and atomic-write strategy. The 329-file move is a different mutation (rename, not rewrite), but the scaffolding is the same shape.

- **Surface:** `.cleargate/templates/story.md` — already has §3.1 "Context & Files" table that lists files-to-touch. Task Checklist is a sibling section, not a replacement. **Coverage:** ≥80% — extends existing template, no new sections-of-sections.

- **Surface:** `.claude/agents/architect.md` — Architect already outputs per-milestone M-plans with phase breakdowns to `.cleargate/sprint-runs/<id>/plans/M<N>.md`. The Task Checklist population is a derivation from that existing output. **Coverage:** ≥80%.

- **Surface:** `.cleargate/scripts/close_sprint.mjs` — already orchestrates Gate-4 close with pre/post checks + `--assume-ack` flag. Slides sprint plan from `pending-sync/` to `archive/` today. New behavior: slide entire `SPRINT-NN/` folder from `active/` to `archive/`. **Coverage:** ≥80% — extends existing close step.

- **Surface:** `cleargate-cli/templates/cleargate-planning/.cleargate/delivery/{pending-sync,archive}/` — npm payload mirror. Restructure here propagates to target repos via `cleargate init`. **Coverage:** partial — restructure payload, then re-run `cleargate init` locally to refresh the live `/.claude/` instance.

- **Surface:** `.cleargate/knowledge/cleargate-enforcement.md` — already documents file-surface contract referencing `pending-sync/` and `archive/` (multiple lines). The contract changes wording, not philosophy. **Coverage:** partial — text edit, no new mechanism.

## 3.6 Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this epic:** None. Every consumer of the delivery tree (push, init, wiki ingest, reconciler, close_sprint, hooks, agents) knows the flat `pending-sync/` + `archive/` shape today. A central pure-function resolver (`umbrella-path.ts`) is the smallest net-new abstraction. We do not need: a database, a new template type, a workflow engine, a status state machine, or a PM-tool schema extension.

- **Why isn't extension / parameterization / config sufficient?** Several lighter alternatives were considered and rejected:
  - **Path config in `cleargate.yml`** alone (no resolver): would push the umbrella-resolution logic into every consumer site (≥19 files). High duplication, certain drift. Resolver wins because it's the *single* place umbrella logic lives.
  - **Sub-folders only, no `active/` prefix** (e.g. `delivery/EPIC-029/`, `delivery/SPRINT-28/`, `delivery/archive/EPIC-002/`): loses the binary status partition. Readers would need to grep frontmatter to know if an umbrella is live. The two-folder partition is cheap discovery: `ls active/` = the punch list.
  - **Status-folders only** (`draft/`, `in-progress/`, `completed/`, no umbrella): user explicitly dismissed because related items scatter across three folders. Also forces a move on every status change — high write cost, wiki-ingest path churn.
  - **In-body checklist + zero filesystem change:** Solves the Task question but not the Discovery question (which is the louder pain). The 27 + 302 list problem stands.
  - **Add umbrella but skip sprint co-location (Option β):** lighter lift, but the user explicitly stated *"sprint X is a folder and should keep all related files there. sprint plan, sprint report"* — bifurcating delivery/ from sprint-runs/ defeats the discovery goal. Option α is required to deliver the stated value.

  The complexity comes from the *consumer count* (19+ code sites + 5 hooks), not from the abstraction itself. The resolver is one function (~30 lines). The migration script is one file (~200 lines). The runbook is one markdown file. The bulk of the diff is mechanical: replace `path.join(deliveryRoot, 'pending-sync')` with `umbrellaPath(item, 'active')`.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/src/lib/umbrella-path.ts` (new) — pure resolver: `umbrellaPath(workItem, partition: 'active'|'archive'|'pending-sync') → string`.
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` (modify) — orphan detection walks new tree.
- `cleargate-cli/src/commands/push.ts` (modify) — write target via resolver; sprint-runs allow-list regex updates.
- `cleargate-cli/src/commands/pull.ts` (modify) — pull writes into umbrella folder if a remote ID resolves to a known umbrella.
- `cleargate-cli/src/commands/init.ts` (modify) — scaffolds new tree shape in target repos.
- `cleargate-cli/src/commands/sync.ts`, `commands/sprint.ts`, `commands/doctor.ts`, `commands/uninstall.ts`, `commands/wiki-audit-status.ts`, `commands/stamp-tokens.ts`, `commands/execution-mode.ts`, `commands/hotfix.ts` (modify) — all currently grep `pending-sync` / `delivery/archive` strings; route through resolver.
- `cleargate-cli/src/wiki/scan.ts` (modify) — recursive walk under `active/**` + `archive/**`.
- `cleargate-cli/src/wiki/derive-bucket.ts` (modify) — bucket key derives from umbrella folder, not file name pattern.
- `cleargate-cli/src/wiki/lint-checks.ts` (modify) — lint walks new tree.
- `cleargate-cli/src/lib/intake.ts`, `lib/slug.ts`, `lib/readiness-predicates.ts`, `lib/active-criteria.ts`, `lib/sync/work-items.ts`, `lib/sync-log.ts` (modify) — any path-construction that mentions delivery subfolders.
- `cleargate-cli/scripts/migrate-delivery-layout.mjs` (new) — one-shot + idempotent migrator with `--dry-run` / `--apply` / `--revert`.
- `cleargate-cli/scripts/migrate-delivery-layout.node.test.ts` (new) — fixture-based tests.
- `.cleargate/scripts/close_sprint.mjs` (modify) — slides `active/SPRINT-NN/` → `archive/SPRINT-NN/` at Gate-4 close.
- `.cleargate/scripts/prep_doc_refresh.mjs` (modify) — walks new tree.
- `.cleargate/knowledge/cleargate-enforcement.md` (modify) — file-surface contract update + lifecycle reconciler reason codes.
- `.cleargate/knowledge/cleargate-protocol.md` (modify) — any layout references in §6 and §11.
- `.cleargate/knowledge/migrations/M-001_delivery_umbrella.md` (new) — upgrade runbook for Claude Code.
- `.cleargate/templates/story.md` (modify) — add `## Task Checklist` section between current §3.1 and §3.2.
- `.cleargate/templates/Sprint Plan Template.md` (modify) — note co-located telemetry expectation.
- `.claude/hooks/token-ledger.sh` (modify) — write path moves to `delivery/active/SPRINT-NN/token-ledger.jsonl`.
- `.claude/hooks/session-start.sh` (modify) — `.active` sentinel path updates.
- `.claude/hooks/pre-edit-gate.sh`, `pending-task-sentinel.sh`, `pre-tool-use-task.sh` (modify) — any sprint-runs path refs.
- `.claude/agents/architect.md` (modify) — output instruction adds Task Checklist population step.
- `.claude/agents/reporter.md` (modify) — reads telemetry from co-located path.
- `.claude/agents/developer.md`, `qa.md`, `devops.md` (modify) — any layout references in their checklists.
- `.claude/skills/sprint-execution/SKILL.md` (modify) — sprint folder location refs.
- `cleargate-planning/` (modify, full mirror) — every above edit propagates here; npm payload `prebuild` script copies onward.
- `cleargate-cli/templates/cleargate-planning/.cleargate/delivery/` (re-shape) — payload scaffold for fresh `cleargate init` runs.
- `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/surface-whitelist.txt` (modify) — relocated sprint-runs entries.
- `CLAUDE.md` (modify) — "Repo layout" diagram + "How work gets done" + "Active state" sections.

**Data Changes:**
- None to PM-tool schema. None to MCP server. None to admin DB. All restructuring is filesystem layout + path references.

## 5. Acceptance Criteria

```gherkin
Feature: Delivery Folder Umbrella Restructure

  Scenario: Discover all children of an epic with one command
    Given the migration has run
    And EPIC-028 has 8 child stories
    When the user runs `ls .cleargate/delivery/active/EPIC-028_Vitest_Elimination/`
    Then the listing shows EPIC-028.md plus all 8 STORY-028-NN.md files
    And no other top-level delivery folder mentions STORY-028-NN

  Scenario: Sprint folder co-locates plan + decomposition + telemetry
    Given SPRINT-29 is the active sprint
    When the user runs `ls .cleargate/delivery/active/SPRINT-29/`
    Then the listing shows SPRINT-29_*.md, plans/M*.md, token-ledger.jsonl, state.json, .doc-refresh-checklist.md
    And .cleargate/sprint-runs/SPRINT-29/ does not exist OR contains only a `MIGRATED -> ../delivery/active/SPRINT-29/` marker

  Scenario: Push moves the file from pending-sync to the umbrella folder
    Given a draft `pending-sync/STORY-099-01_*.md` with `parent_epic_ref: EPIC-099`
    And EPIC-099 has an umbrella folder at `active/EPIC-099_*/`
    When `cleargate_push_item` succeeds with remote_id
    Then the file lives at `active/EPIC-099_*/STORY-099-01_*.md`
    And `pending-sync/STORY-099-01_*.md` no longer exists

  Scenario: Standalone item resolves to standalone bucket
    Given a draft `pending-sync/BUG-099_*.md` with no parent_epic_ref, no parent_cleargate_id, no sprint_cleargate_id
    When `cleargate_push_item` succeeds
    Then the file lives at `active/standalone/BUG-099_*.md`

  Scenario: Sprint close slides the umbrella folder to archive
    Given SPRINT-29 has all stories Completed and Gate-4 has been ack'd
    When `close_sprint.mjs --assume-ack` succeeds
    Then `active/SPRINT-29/` no longer exists
    And `archive/SPRINT-29/` contains the full sprint folder unchanged in shape

  Scenario: Story template populated with Task Checklist by Architect
    Given Architect dispatch runs against a new story under SPRINT-29
    When the Architect emits the M-plan
    Then the story body contains a `## Task Checklist` section with one `- [ ]` line per M-plan phase
    And the items are unchecked at dispatch time

  Scenario: Migration is idempotent
    Given the meta-repo is already in v2 layout
    When `migrate-delivery-layout.mjs --apply` runs
    Then the script exits 0
    And prints `Layout already v2 — no changes applied`
    And no files are modified

  Scenario: Migration is reversible
    Given the meta-repo is in v2 layout
    When `migrate-delivery-layout.mjs --revert` runs
    Then all items return to `pending-sync/` or `archive/` flat structure
    And sprint-runs/SPRINT-NN/ regains its co-located artifacts

  Scenario: Upgrade runbook guides Claude Code through a target-repo upgrade
    Given a target repo on cleargate@0.12.x with v1 delivery layout
    When the user runs `cleargate upgrade` and Claude Code reads M-001_delivery_umbrella.md
    Then Claude Code executes the documented Up steps
    And the target repo's delivery tree is in v2 layout
    And the runbook's verification commands all pass

  Scenario: Wiki ingest tracks renamed files
    Given a file moves from `pending-sync/STORY-099-01_*.md` to `active/EPIC-099_*/STORY-099-01_*.md`
    When the PostToolUse hook fires after the move
    Then the wiki page at `.cleargate/wiki/stories/STORY-099-01.md` updates to reflect the new source path
    And no orphan wiki page persists from the old location

  Scenario: Migration aborts on partial-state without --force
    Given some items have been hand-moved into `active/` umbrella folders
    And some items remain flat in `pending-sync/` / `archive/`
    When `migrate-delivery-layout.mjs --apply` runs without `--force`
    Then the script exits non-zero
    And prints `Refusing to migrate: partial-state detected. Use --force to override.`
    And no files are modified

  Scenario: Token-ledger hook writes to co-located path
    Given a SubagentStop hook fires during SPRINT-29 execution
    When the hook writes a ledger row
    Then the row appears in `.cleargate/delivery/active/SPRINT-29/token-ledger.jsonl`
    And NOT in `.cleargate/sprint-runs/SPRINT-29/token-ledger.jsonl`
```

## 6. AI Interrogation Loop (Resolved 2026-05-18)

All six open questions resolved by user via AskUserQuestion 2026-05-18. Decisions integrated into the spec above; recorded here for audit.

1. **`.active` sentinel location** → **project-level** at `.cleargate/delivery/.active`, holds the live sprint ID. SessionStart hook + skill auto-load read from one fixed path; no glob-scan of `active/SPRINT-*/.active`.

2. **Target sprint** → **SPRINT-29**, leading work. EPIC-029 is infra-heavy but product-light, ideal for the post-SPRINT-28 slot.

3. **CR umbrella policy** → CRs that spawn their own stories live at `active/CR-NNN_*/` (own umbrella). Scope-tweak CRs with no children nest under their parent epic's umbrella. The resolver examines child-count on push.

4. **Archive mirror** → `archive/` **mirrors** the umbrella structure (`archive/EPIC-002_Wiki/`, etc.). One-time 302-file move accepted; consistency-with-active wins on discovery.

5. **Task Checklist scope** → **strict-local**. Checkboxes never leave the story body. No PM-tool sub-issue mapping. Adapters untouched.

6. **Migration staging** → **staged with flip-point at STORY-029-03**. STORY-029-01/02 ship dual-mode code (read v1, write v2 under `--umbrella-mode` flag). STORY-029-03 runs the meta-repo flip. Stories 04-09 execute against v2. Per-story revert == per-commit revert; no two-week partial-state window.

**Companion work for SPRINT-29** (decided same session): BUG-004 rides along (small, scaffold-adjacent). EPIC-012 + EPIC-021 are 🟢 Ready but undecomposed; their decomposition pass slots into SPRINT-29 Prepare phase so they ship in SPRINT-30.

## 7. Story Decomposition (preview — final IDs assigned at SPRINT-29 Prepare phase)

| Story | Title | Complexity | Parallel-Eligible |
|---|---|---|---|
| STORY-029-01 | Layout Spec + Folder Surface Contract Update | L1 | n (blocks all others) |
| STORY-029-02 | Umbrella Path Resolver Library + Tests | L2 | n (blocks 03, 04, 05, 06) |
| STORY-029-03 | Migration Script + Tests + `.migration-lock` | L3 | n (blocks meta-repo flip) |
| STORY-029-04 | `cleargate_push_item` + push.ts Use Resolver | L2 | y (with 05, 06) |
| STORY-029-05 | Wiki Ingest + Lint + Index Umbrella-Aware | L2 | y (with 04, 06) |
| STORY-029-06 | Lifecycle Reconciler + close_sprint Umbrella-Aware | L2 | y (with 04, 05) |
| STORY-029-07 | Sprint Telemetry Co-location (Option α) | L3 | n (touches hooks + agents + scripts together) |
| STORY-029-08 | Story Template Task Checklist + Architect Population | L1 | y |
| STORY-029-09 | Upgrade Migration Runbook (M-001) + `cleargate upgrade` Wiring | L2 | y |

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for SPRINT-29 SDR**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] Proposal document has `approved: true`. — **WAIVED per memory `feedback_proposal_gate_waiver`**: user issued direct Epic request with sharp intent ("plan the epic please") + inline references to the prior conversation that resolved layout, sprint co-location (Option α), Task-Checklist shape, and migration-runbook requirement. No proposal authored; design decisions are captured in `context_source` and §3.6 *Why not simpler?*.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths. — ~10 file:line citations in §3.5 grep-verified against the working tree at 2026-05-18; the remaining modify-target paths in §4 are existence-verified (file-level). Per-line verification deferred to per-story SDR — declared sufficient for epic-level 🟢 since no path was hallucinated.
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec). — Six open Qs resolved via AskUserQuestion 2026-05-18 (project-level sentinel, SPRINT-29 target, CR-umbrella policy, archive-mirrors-active, strict-local Task Checklist, staged-with-flip-at-STORY-029-03). §6 rewritten as the audit record of resolved decisions.
- [x] 0 "TBDs" exist in the document.
- [x] §3.5 Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] §3.6 Why not simpler? has both sub-bullets answered.
