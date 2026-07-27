---
cr_id: CR-086
parent_ref: STORY-051-01
parent_cleargate_id: "STORY-051-01"
sprint_cleargate_id: SPRINT-38
carry_over: false
area: framework/enforcement
status: Approved
approved: true
context_source: SPRINT-38 advisory sprint-diff review 2026-07-27 (workflow wu653hnqt, 28 findings raised / 21 adversarially refuted / 7 confirmed) + orchestrator reproduction of findings 1-3 + direct human approval to fix in-sprint rather than carry
created_at: 2026-07-27T00:00:00Z
updated_at: 2026-07-27T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-07-27T15:58:32Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-086
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-07-27T15:58:31Z
  sessions: []
---

# CR-086: Make the file-surface pre-commit gate fire end-to-end

## 0.5 Open Questions

- **Question:** Should the dispatcher resolve its own symlink, or should the install write an absolute path to the real directory?
- **Recommended:** Resolve the symlink inside the dispatcher. The install recipe is documented in three places and already deployed in existing checkouts; a dispatcher that works regardless of how it was linked fixes those retroactively, whereas changing the recipe only helps new installs.
- **Human decision:** RESOLVED — resolve inside the dispatcher (orchestrator, 2026-07-27). Keep the documented `ln -sf` recipe working unchanged.

- **Question:** Inside a linked worktree, should the gate resolve `.active` from the main checkout, or should worktree creation materialise a sentinel?
- **Recommended:** Resolve from the main checkout via `git rev-parse --git-common-dir` (whose parent is the main working tree in both plain clones and linked worktrees). Copying a gitignored runtime file into every worktree creates a second source of truth that can go stale mid-sprint.
- **Human decision:** RESOLVED — resolve from the main checkout (orchestrator, 2026-07-27). `.active` stays single-writer, owned by `init_sprint.mjs`.

- **Question:** Does making the gate live risk blocking legitimate in-flight commits?
- **Recommended:** Yes, and that is the point — but only once the §3.1 parser tolerates prose-bearing Value cells. All three layers must land in the same commit; shipping the dispatcher fix alone would false-block every commit in the repo.
- **Human decision:** RESOLVED — all three layers ship together, proven by one test that exercises the full chain (orchestrator, 2026-07-27).

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that STORY-051-01 finished the job. It restored `file_surface_diff.sh` to unconditional blocking and that fix is correct — but the script is unreachable, so the gate is a no-op end to end. Do not re-open or re-fix the script's internal `exit 1` logic; it is already right.
- Forget the claim in `cleargate-enforcement.md:292` that the chain "`file_surface_diff.sh` invoked via `pre-commit-surface-gate.sh` and dispatched from `pre-commit.sh` … symlinked to `.git/hooks/pre-commit`" functions today. It is broken at the dispatcher.
- Forget the claim in `cleargate-enforcement.md:318` that `cleargate init` installs the hook symlink. No such code exists anywhere in `cleargate-cli/src/**`; the manual `ln -sf` is the only install path.
- Forget that `SKIP_SURFACE_GATE=1` is the sole bypass. Today there are three silent ones: the dispatcher glob, the missing worktree sentinel, and the parser mismatch.

**New Logic (The New Truth):**
- The dispatcher resolves its own location through the symlink, so `pre-commit-*.sh` siblings are found in `.claude/hooks/` no matter how `.git/hooks/pre-commit` was linked.
- `file_surface_diff.sh` resolves the `.active` sentinel against the **main checkout** (`git rev-parse --git-common-dir`'s parent), so the gate fires inside `.worktrees/STORY-*` — the only place Developer commits happen.
- The §3.1 parser extracts the backticked path from a Value cell and ignores trailing prose, so real-world rows (`` `path` — rationale ``) declare their path correctly.
- The gate has one runner-reachable `*.node.test.ts` that drives the whole chain — git hook → dispatcher → surface gate → `file_surface_diff.sh` — in a scratch repo, and asserts both the block and the allow.
- Enforcement docs describe the install honestly: either `cleargate init` installs the symlink, or the docs stop saying it does.

## 2. Blast Radius & Invalidation

- [x] **Extends, does not invalidate, [[STORY-051-01]]** (merged `086788ea`). Its script fix stands; this CR makes it reachable. No gate reset — the story's own acceptance Gherkin ("gate exits non-zero on an off-surface file") becomes true for the first time when this lands.
- [x] **[[STORY-051-06]]** drift guard already flags `.claude/hooks/pre-commit-surface-gate.sh` as content-mismatched between canonical and live. Editing the hook chain changes what that guard reports; the Gate-4 live hand-sync must cover the dispatcher too.
- [x] **Every commit in this repo becomes subject to a live surface gate for the first time.** Wave-6's own commits are the first real exercise. If the parser is wrong, work stops — hence the all-three-layers-together rule.
- [ ] Database schema impacts? **No.** No schema, no MCP, no admin surface.
- **Not invalidated:** SPRINT-38's other eight stories. The three other restored gates (decomposition, `EXEC_MODE=v1` bypass removal, `--assume-ack` guard) verify clean and are untouched here.

## Existing Surfaces

- **Surface:** `cleargate-planning/.claude/hooks/pre-commit.sh:11` — computes `HOOK_DIR` from `${BASH_SOURCE[0]}`; under git invocation that is the symlink path, so line 13's `pre-commit-*.sh` glob searches `.git/hooks/` and matches nothing.
- **Surface:** `cleargate-planning/.claude/hooks/pre-commit-surface-gate.sh` — the wrapper that calls the gate; present, executable, never invoked.
- **Surface:** `.cleargate/scripts/file_surface_diff.sh:19,21,105` — `REPO_ROOT` from `git rev-parse --show-toplevel`; `ACTIVE_SENTINEL` beneath it; the "No active story file found — skipping surface check" early `exit 0`.
- **Surface:** `.cleargate/scripts/file_surface_diff.sh:134` — the awk §3.1 Value-cell parser that assumes a bare backticked path.
- **Surface:** `cleargate-planning/.cleargate/scripts/test/test_file_surface.sh:16,74` — the existing bash harness. It invokes `file_surface_diff.sh` directly and writes its own sentinel, which is exactly why it never caught any of these three defects.
- **Surface:** `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md:292,318` — the enforcement claims this CR must make true or correct.
- **Why this CR extends rather than rebuilds:** the gate's decision logic is correct and was hardened this sprint; all three defects are in reachability and input parsing around it. Rebuilding would discard a working `exit 1` path and its rubric. The fix is three surgical edits plus the end-to-end test the surface has never had.

## Prior work

- [[STORY-051-01]] — restored `file_surface_diff.sh` to unconditional blocking (M0, merged this sprint). Touches the same script; does **not** fix reachability. This CR completes it.
- [[STORY-051-06]] — canonical↔live↔root drift guard; reports on the hook files this CR edits, does not fix them.
- [[CR-070]], [[CR-074]] — retired `execution_mode`, the root cause that left the gate half-wired.
- [[STORY-051-02]] — retired the ratchet gate from the same hook chain; its risk note assumed the meta-repo had no hooks symlinked (stale: one is symlinked, it just no-ops).
- No prior work covers hook-symlink installation, worktree path resolution in the gate, or the §3.1 parser. Confirmed via `cleargate-wiki-query` 2026-07-27 plus a grep of `.cleargate/delivery/archive/` and `.cleargate/FLASHCARD.md`.

## 3. Execution Sandbox

**Modify (canonical, then hand-port to live-root by diff — never blind `cp`):**
- `cleargate-planning/.claude/hooks/pre-commit.sh` — resolve `HOOK_DIR` through the symlink.
- `cleargate-planning/.cleargate/scripts/file_surface_diff.sh` — main-checkout sentinel resolution; prose-tolerant §3.1 Value-cell parser.
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — correct the `:292` chain description and the `:318` `cleargate init` install claim.

**Live-root twins:**
- `.claude/hooks/pre-commit.sh` *(gitignored live tier — hand-sync, not staged)*
- `.cleargate/scripts/file_surface_diff.sh`
- `.cleargate/knowledge/cleargate-enforcement.md`

**Add (cli repo, branch `sprint/S-38`):**
- `cleargate-cli/test/scaffold/file-surface-gate-e2e.node.test.ts` — the end-to-end test.

**Do NOT touch:** `file_surface_diff.sh`'s blocking decision logic or its existing exit-0 early returns other than the sentinel resolution; `pre-commit-surface-gate.sh`; any of SPRINT-38's other nine work items; `MANIFEST.json` / `cleargate-cli/templates/**` (prebuild regen is DevOps's once-per-wave step); the five AD#2 carry-over v1/v2 lines in enforcement.md.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test` — the new `file-surface-gate-e2e.node.test.ts` must be picked up by the default glob (`test/**/*.node.test.ts`, no `.integration.`) and pass.

The test builds a scratch git repo in a tmpdir, installs the dispatcher exactly as documented (`ln -sf ../../.claude/hooks/pre-commit.sh .git/hooks/pre-commit`), seeds `.cleargate/sprint-runs/.active` + `state.json` + a story file with a §3.1 table whose Value cells carry trailing prose, then asserts:

1. **Blocks off-surface.** Staging a file absent from §3.1 → `git commit` exits non-zero and stderr names the offending path.
2. **Allows on-surface.** Staging only declared files → commit succeeds.
3. **Fires inside a linked worktree.** Same two cases run from `git worktree add`, where `.active` exists only in the main checkout. This is the case that no existing test covers.
4. **Prose-bearing §3.1 rows parse.** A row of the form `` | Primary File | `path/to/x.ts` — rationale text | `` resolves to `path/to/x.ts`.
5. **`SKIP_SURFACE_GATE=1` still bypasses**, and remains the only bypass.

**Old-logic eviction check:** `bash -x .git/hooks/pre-commit` in this repo must show `HOOK_DIR` resolving to the `.claude/hooks` directory and the surface gate actually executing — not the `+ continue + exit 0` trace captured 2026-07-27.

---

## Context Source

**context_source:** SPRINT-38 advisory sprint-diff review 2026-07-27 (workflow `wu653hnqt`: 28 findings raised, 21 refuted by adversarial verification, 7 confirmed). Findings 1-3 independently reproduced by the orchestrator — the dispatcher trace was run directly (`bash -x .git/hooks/pre-commit` → `HOOK_DIR=…/.git/hooks`, glob miss, `exit 0`), `.gitignore:22` confirmed for the sentinel, and the prose-bearing Value cell verified against `STORY-051-09_Doc_Consistency_And_Phantom_Refs.md:160`. Human approved fixing in-sprint rather than carrying to the next sprint, 2026-07-27.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified — STORY-051-01 is extended (not reset; its acceptance becomes true for the first time), STORY-051-06's drift report shifts, and the Gate-4 live hand-sync scope grows to include the dispatcher.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
