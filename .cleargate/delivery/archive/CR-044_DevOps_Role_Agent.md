---
cr_id: CR-044
parent_ref: EPIC-013
parent_cleargate_id: EPIC-013
sprint_cleargate_id: SPRINT-22
carry_over: false
status: Done
approved: true
approved_at: 2026-05-04T08:30:00Z
approved_by: sandrinio
agent_model: sonnet
created_at: 2026-05-04T08:00:00Z
updated_at: 2026-05-04T08:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
context_source: |
  Mid-sprint user feedback 2026-05-04: "how would you make Orchestrator,
  Architect, Dev, QA, Reporter roles much better and smooth?"

  Diagnosis from SPRINT-21 retrospective: orchestrator currently does plan +
  dispatch + halt + merge + worktree teardown + state transitions + mirror
  parity diff + report consolidation + flashcard processing. That's ~30+
  manual bash calls per session. SPRINT-21 burned several minutes on
  cleanup loops that don't require orchestrator judgment.

  V-Bounce-Engine reference (skills/agent-team/SKILL.md L23-32): defines
  DevOps role explicitly — owns merge/deploy/branch cleanup. Adapted to
  ClearGate as a per-story DevOps dispatch after QA-Verify + Architect
  post-flight.

  Companion to CR-043 (TDD discipline) — both restructure the four-agent
  loop. CR-043 inserts QA-Red before Dev; CR-044 inserts DevOps after the
  story is verified. Together they expand the loop from 4 dispatches to 6
  for standard-lane (Architect → QA-Red → Dev → QA-Verify → Architect →
  DevOps); fast-lane skips QA-Red but keeps DevOps (3 dispatches: Dev →
  QA-Verify → DevOps).
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-04T08:34:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-044
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-04T08:34:45Z
  sessions: []
---

# CR-044: DevOps Role Agent — Owns Merge + Worktree Teardown + State Transitions

## 0.5 Open Questions

- **Question:** Per-story DevOps dispatch, or per-wave (batch all stories in a wave into one DevOps dispatch)?
  - **Recommended:** per-story for SPRINT-22 simplicity. Per-wave batching is a future cost-optimization (CR-048-candidate). Per-story dispatches give cleaner ledger attribution and isolate failure modes.
  - **Human decision:** _populated during Brief review*

- **Question:** What does DevOps do if merge fails (e.g., conflict)?
  - **Recommended:** DevOps writes a `STORY-NNN-NN-devops-blockers.md` report with conflict diagnostics + halts. Orchestrator surfaces to human; human resolves conflict OR re-dispatches Dev with conflict-fix instruction. DevOps does NOT auto-resolve conflicts.
  - **Human decision:** _populated during Brief review_

- **Question:** Mirror parity diff post-merge — DevOps owns this, OR keep with current per-CR convention?
  - **Recommended:** DevOps runs `diff cleargate-planning/<file> <live>/<file>` for any file changed in the story's commit and surfaces drift in its post-merge report. Hand-port stays with the orchestrator (it's a per-machine action).
  - **Human decision:** _populated during Brief review_

- **Question:** Flashcard processing — DevOps owns the per-merge gate (V-Bounce Step 5.5), OR keep with orchestrator?
  - **Recommended:** keep with orchestrator for SPRINT-22. The per-merge flashcard hard gate (V-Bounce-inspired) is CR-045 in SPRINT-23. CR-044 in SPRINT-22 only owns the mechanical merge + state + worktree work.
  - **Human decision:** _populated during Brief review_

- **Question:** Token-ledger attribution — `agent_type=devops`. Pricing-tier implications?
  - **Recommended:** add `devops` to valid set; same pricing tier as other agents (sonnet by default). Reporter's session-totals digest groups by agent_type — devops appears as a separate line.
  - **Human decision:** _populated during Brief review_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Orchestrator runs `git merge story/STORY-NNN-NN --no-ff -m "merge ..."` after QA pass.
- Orchestrator runs `git worktree remove .worktrees/STORY-NNN-NN` after merge.
- Orchestrator runs `git branch -d story/STORY-NNN-NN` after worktree removal.
- Orchestrator runs `node .cleargate/scripts/update_state.mjs STORY-NNN-NN Done` after branch delete.
- Orchestrator runs `cd cleargate-cli && npm run prebuild` after canonical scaffold edits.
- Orchestrator manually inspects `git status` for stale staged changes / hook side effects.

**New Logic (The New Truth):**
- After QA-Verify + Architect post-flight pass, Orchestrator dispatches **DevOps** with the story ID + commit SHA.
- DevOps merges story branch into sprint branch (no-ff), runs post-merge test verification, removes worktree, deletes branch, runs `update_state.mjs STORY-NNN-NN Done`, runs `npm run prebuild` if canonical scaffold changed, diffs live ↔ canonical mirrors, and writes `STORY-NNN-NN-devops.md` post-merge report.
- DevOps does NOT auto-resolve merge conflicts. On conflict: writes blockers report + halts + Orchestrator surfaces to human.
- Orchestrator narrows to: plan + dispatch + halt + flashcard processing (until CR-045) + Gate-4 close.

## 2. Blast Radius & Invalidation

- [ ] **`.claude/skills/sprint-execution/SKILL.md` §C.6** (current "Story Merge" step) — rewritten as DevOps dispatch step. §C.7+ renumbered.
- [ ] **`cleargate-planning/.claude/agents/devops.md`** — new agent prompt file.
- [ ] **`.claude/hooks/token-ledger.sh`** — add `devops` to valid agent_type set.
- [ ] **`cleargate-cli/scripts/suggest_improvements.mjs`** — add `devops` to recognized agent types.
- [ ] **`.cleargate/scripts/write_dispatch.sh`** — accepts `devops` as valid agent_type arg.
- [ ] **State machine** — DevOps writes `Done` state. Orchestrator no longer writes state directly (except for `Escalated` cases). Update SKILL.md §8 quick-reference table.
- [ ] **Reports schema** — `STORY-NNN-NN-devops.md` is a NEW required report under v2 standard-lane. Merge prerequisite checks in SKILL.md §C.6 verify it exists.
- [ ] **Database schema impacts? No** — process change only.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (current Story Merge step in §C.6 — currently orchestrator-owned).
- **Surface:** `cleargate-planning/.claude/agents/architect.md`
- **Surface:** `cleargate-planning/.claude/agents/developer.md`
- **Surface:** `cleargate-planning/.claude/agents/qa.md`
- **Surface:** `cleargate-planning/.claude/agents/reporter.md`
- **Surface:** `.cleargate/scripts/update_state.mjs` (state-transition entry point).
- **Surface:** `.cleargate/scripts/write_dispatch.sh` (dispatch marker — needs to accept new agent type).
- **Surface:** `.claude/hooks/token-ledger.sh` (agent_type validator — needs new value).
- **Why this CR extends rather than rebuilds:** existing four-agent loop has implicit DevOps-like work performed by orchestrator. CR-044 makes it explicit + delegates. Not a from-scratch role introduction. Design provenance: V-Bounce-Engine `agent-team` skill (external reference cited in `context_source` only — not a local surface).

## 3. Execution Sandbox

**Modify:**
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — §C.6 rewrite (DevOps dispatch insert), §8 quick-reference update
- `cleargate-planning/.claude/agents/architect.md`, `qa.md`, `reporter.md` — add cross-references to new DevOps role where they reference merge/state mechanics
- `.claude/hooks/token-ledger.sh` — agent_type validator
- `.cleargate/scripts/write_dispatch.sh` — agent_type validator
- `.cleargate/scripts/suggest_improvements.mjs` — recognized agent_types
- `.cleargate/sprint-runs/<id>/state.json` schema — no field change, but DevOps writes via update_state.mjs

**Add:**
- `cleargate-planning/.claude/agents/devops.md` — new agent prompt
- (Implicit) `STORY-NNN-NN-devops.md` and `STORY-NNN-NN-devops-blockers.md` report templates documented in SKILL.md §C.6

**Auto-regenerated:**
- `cleargate-cli/templates/cleargate-planning/.claude/...` (via prebuild)
- `cleargate-planning/MANIFEST.json` (via prebuild)

**Hand-port (post-merge):**
- Live `.claude/skills/sprint-execution/SKILL.md`, `.claude/agents/devops.md`, etc. (gitignored; sync via `cleargate init` or hand-port)

**Out of scope:**
- Per-merge flashcard hard gate (CR-045 in SPRINT-23).
- DevOps for sprint-close work (sprint→main merge, archive sprint plan, update INDEX.md) — that stays with orchestrator + close_sprint.mjs.
- Auto-conflict-resolution by DevOps. DevOps reports conflicts, doesn't fix them.
- Per-wave batching (CR-048-candidate, future).

### 3.1 DevOps Context Pack (orchestrator dispatch contract)

The orchestrator's dispatch text injects this context into every DevOps spawn:

```
SPRINT-{NN} — DevOps dispatch for {STORY-ID}.

INPUTS (orchestrator-provided):
- Story ID: {STORY-NNN-NN | CR-NNN | BUG-NNN}
- Sprint ID: SPRINT-{NN}
- Worktree path: .worktrees/{STORY-ID}/  (absolute path also provided)
- Story branch: story/{STORY-ID}
- Sprint branch: sprint/S-{NN}
- Dev commit SHA: {abc1234}
- QA commit SHA (if present): {def5678}
- Architect commit SHA (if present): {ghi9012}
- Files-changed manifest: {list from git show --stat <dev-sha>}
- Canonical scaffold touched? {yes|no}  (DevOps decides whether to run prebuild)
- Lane: {standard | fast}  (affects which reports must exist before merge)
- Required reports present:
    - {STORY-ID}-dev.md    ✓
    - {STORY-ID}-qa.md     ✓ (or "skipped — fast lane")
    - {STORY-ID}-arch.md   ✓ (v2 standard lane only)

ACTIONS (in order):
1. Verify all required reports exist; halt if any missing.
2. Checkout sprint branch.
3. git merge story/{STORY-ID} --no-ff -m "merge(story/{STORY-ID}): {commit subject}"
4. If canonical scaffold touched: cd cleargate-cli && npm run prebuild
5. Mirror parity audit: for each file in files-changed where canonical mirror exists, diff live ↔ canonical. Report drift in §Mirror Parity of devops report (DO NOT auto-fix).
6. Post-merge test verification: run only the test files touched by this commit (npm test -- {test-file-paths}). Full suite NOT required (cost discipline).
7. git worktree remove .worktrees/{STORY-ID}
8. git branch -d story/{STORY-ID}
9. CLEARGATE_STATE_FILE=... node .cleargate/scripts/update_state.mjs {STORY-ID} Done

OUTPUT (single file):
.cleargate/sprint-runs/SPRINT-{NN}/reports/{STORY-ID}-devops.md
- Merge result (commit SHA + diff stat)
- Post-merge test result (tests run, pass/fail)
- Mirror parity audit (per-file diff-empty or drift-noted)
- State transition confirmation
- Worktree + branch teardown confirmation

ON CONFLICT (any step 2-9 fails):
- HALT immediately. Do NOT auto-resolve.
- Write {STORY-ID}-devops-blockers.md with full failure context.
- Return STATUS=blocked. Orchestrator escalates to human.

TOOLS: Read, Edit (for report), Bash (for git/npm). Write is NOT in your tool set — you don't author code.
```

The agent file `cleargate-planning/.claude/agents/devops.md` carries `model: sonnet` in its frontmatter (per `agent_model: sonnet` in this CR's frontmatter). Sonnet is sufficient — DevOps work is mechanical-but-bounded; Opus would be overkill.

## 4. Verification Protocol

**Acceptance:**
1. `cleargate-planning/.claude/agents/devops.md` exists with full prompt: `model: sonnet` in frontmatter; tools restricted to `Read, Edit, Bash, Glob, Grep` (no Write — DevOps doesn't author code, only reports + scripted ops); explicit per-story scope; explicit no-conflict-resolution boundary; explicit post-merge report format. Context Pack per §3.1 reproduced verbatim in the prompt as the dispatch contract.
2. `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` §C.6 documents the DevOps dispatch with: input contract (story ID + commit SHA); expected actions (merge, post-merge test, worktree remove, branch delete, state Done, prebuild if canonical changed, mirror parity diff); output (report file + return format).
3. `.claude/hooks/token-ledger.sh` accepts `agent_type=devops`. Fixture dispatch + ledger row inspection.
4. `.cleargate/scripts/write_dispatch.sh devops` exits 0 (validator accepts).
5. Sample DevOps dispatch on a fixture story end-to-end: orchestrator runs zero `git merge`, `git worktree remove`, `git branch -d`, `update_state.mjs`, or `npm run prebuild` calls — DevOps does all of them.
6. Mirror parity diff post-merge — if drift exists, DevOps surfaces it in `STORY-NNN-NN-devops.md` with explicit "live re-sync needed via `cleargate init`" callout.
7. **Process acceptance (validated retrospectively at SPRINT-23 close):** orchestrator's main-session bash log for ≥1 SPRINT-23 standard-lane story shows zero of the 5 forbidden command patterns. If any occur, classify as edge case + document in §4 Execution Log.

**Test Commands:**
- `grep -E "git merge|git worktree remove|update_state.mjs" cleargate-planning/.claude/agents/devops.md` — should hit (DevOps OWNS these)
- `grep -E "git merge|git worktree remove|update_state.mjs" cleargate-planning/.claude/skills/sprint-execution/SKILL.md §C.6` — orchestrator no longer runs them (replaced with "dispatch DevOps")
- (Manual) fixture story end-to-end with DevOps dispatch

**Pre-commit:** `cd cleargate-cli && npm run typecheck` + `npm test` (post-CR-040 routing). Never `--no-verify`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Yellow — Awaiting Brief approval**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream items identified (SKILL.md §C.6, agent prompts, hooks, dispatch script, state machine).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification commands provided (7 acceptance criteria).
- [ ] `approved: true` is set in YAML frontmatter (post-Brief).
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
