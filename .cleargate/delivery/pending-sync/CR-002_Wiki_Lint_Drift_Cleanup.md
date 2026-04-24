---
cr_id: CR-002
parent_ref: EPIC-015
status: Draft
approved: false
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T14:22:22Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-002
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T14:22:22Z
  sessions: []
---

# CR-002: Wiki Lint Drift Cleanup

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- 145 pre-existing `cleargate wiki lint` findings are "fine to ignore" because the new `index-budget:` check passes. This assumption blocks the new `sprint-archive` wrapper from self-archiving — its rollback path fires on *any* lint failure.

**New Logic (The New Truth):**
- `cleargate wiki lint` must exit 0 on `main` for the sprint-archive wrapper (STORY-015-04) to be usable for its intended purpose (self-closing sprints). Until it does, every future sprint requires manual merge bypassing the wrapper.

## 2. Blast Radius & Invalidation

Current `wiki lint` findings breakdown (observed on main HEAD `82514dd`):
- **~120 `broken-backlink`** — parent epics don't list child stories in their wiki pages. Most on archived STORY-013-xx (SPRINT-09) and STORY-014-xx (SPRINT-10) items.
- **~22 `gate-failure`** — `implementation-files-declared` criteria unmet on archived STORY-013-xx / STORY-014-xx items (shipped work that never had its Shadow Spec §4 filled in).
- **3 `gate-stale`** — PROPOSAL-008, PROPOSAL-009, PROPOSAL-010 with `last_gate_check` older than `updated_at`.

- [ ] No downstream epic/story invalidation — this is pure hygiene cleanup.
- [ ] Database schema impacts? No.
- [ ] Blocks: the new `sprint archive` wrapper (STORY-015-04) cannot self-archive SPRINT-11 or any future sprint until this lands.

## 3. Execution Sandbox

**Modify (frontmatter only, no code changes):**
- `.cleargate/delivery/archive/STORY-013-*.md` — fill `implementation_files:` (§4) from each story's shipped commit.
- `.cleargate/delivery/archive/STORY-014-*.md` — same.
- `.cleargate/delivery/archive/EPIC-013_*.md` + `EPIC-014_*.md` — ensure `children:` frontmatter lists the story IDs (fixes broken-backlink).
- `.cleargate/delivery/pending-sync/PROPOSAL-008_*.md`, `PROPOSAL-009_*.md` + `.cleargate/delivery/archive/PROPOSAL-010_*.md` — refresh `cached_gate_result.last_gate_check` via `cleargate gate` re-run (gate-stale).

**Do NOT modify:**
- Code under `cleargate-cli/src/**` or `mcp/src/**`.
- Any sprint files (SPRINT-09, SPRINT-10 metadata is fine as-is).
- The lint checks themselves in `cleargate-cli/src/wiki/lint-checks.ts`.

## 4. Verification Protocol

**Before:** `cleargate wiki lint` exits non-zero with 145 findings.

**After:** `cleargate wiki lint` exits 0 on main. The new `sprint archive` wrapper can self-close a sprint without rolling back the stamp due to pre-existing lint drift.

**Command:** `node cleargate-cli/dist/cli.cjs wiki build && node cleargate-cli/dist/cli.cjs wiki lint; echo "exit=$?"` — expect `exit=0`.

**Regression check:** `node cleargate-cli/dist/cli.cjs wiki audit-status` must still exit 0 (this CR is frontmatter-only; must not re-introduce status drift).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] Decide approach: hand-edit each drift item vs. write a one-shot script that reads git history + fills frontmatter.
- [ ] Confirm whether gate-stale proposals can be fixed by re-running `cleargate gate` alone, or require substantive gate-criteria edits.
- [ ] `approved: true` set.
