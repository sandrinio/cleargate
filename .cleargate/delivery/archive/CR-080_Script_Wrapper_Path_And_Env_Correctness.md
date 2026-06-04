---
cr_id: CR-080
parent_ref: EPIC-045
parent_cleargate_id: EPIC-045
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: framework/scripts
context_source: |
  Live dogfood of the new_app (Chyro) SPRINT-66 v2-parallel run, observation log
  .cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md, findings F5
  + F8 (both surfaced as orchestrator flashcards mid-sprint, both routed to
  framework-hygiene). F5 (#cleargate): "pass an ABSOLUTE worktree path — a relative
  path + the non-subshell `cd \"$WORKTREE\"` makes REPORT_FILE writes ENOENT (doubled
  path)." F8 (#cleargate): "run_script.sh does NOT forward ambient env vars to its
  node child — CLEARGATE_STATE_FILE set via `export` is invisible to update_state.mjs
  / validate_*.mjs through the wrapper. Pass it inline or call the script directly."
  Both verified against disk 2026-06-03: `.cleargate/scripts/pre_gate_runner.sh`
  (worktree arg captured raw at :28, REPORT_FILE resolved relative at :64-66,
  non-subshell `cd "$WORKTREE"` at :184/:205) and `.cleargate/scripts/run_script.sh`
  (child invoked at :92, only RUN_SCRIPT_ACTIVE exported at :89). Per the SPRINT-66
  F-tally these are the two "script-wrapper correctness bugs" grouped together; both
  are small, isolated wrapper fixes (one sandbox, two files).
created_at: 2026-06-03T00:00:00Z
updated_at: 2026-06-03T00:00:00Z
created_at_version: cleargate@0.14.0
updated_at_version: cleargate@0.14.0
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-06-03T16:32:11Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-06-03T16:44:16.843Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
push_version: 1
---

# CR-080: Fix script-wrapper correctness — pre_gate_runner.sh relative-path doubling (F5) + run_script.sh ambient-env drop (F8)

## 0.5 Open Questions

- **Question (F5):** Should `pre_gate_runner.sh` normalize the worktree argument with `realpath` at entry, or wrap each subsequent `cd "$WORKTREE"` in a subshell so the parent cwd never changes?
- **Recommended:** `realpath` (or `cd "$WORKTREE" && pwd`) the worktree arg once at entry, immediately after the `[[ ! -d "$WORKTREE" ]]` validation at line 39, and reassign `WORKTREE` to the absolute path. This is the single-point fix: every downstream consumer (`REPORT_FILE`, the `git -C "$WORKTREE"`, the `grep -rn "$WORKTREE"`, the non-subshell `cd "$WORKTREE"` at :184/:205) then receives an absolute path and is correct regardless of relative/absolute input. Subshell-wrapping each `cd` is more edits, more fragile, and still leaves `REPORT_FILE` resolved relative to the orchestrator cwd. Prefer realpath-at-entry.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

- **Question (F8):** Does `run_script.sh` *intentionally* sandbox the child environment (i.e. is the env drop a deliberate allowlist), or is the drop an unintended omission? And if we fix it, full pass-through or an allowlist?
- **Recommended:** It is an unintended omission, not a sandbox — the wrapper sets `export RUN_SCRIPT_ACTIVE=1` (line 89) and invokes `"$@"` directly (line 92), so the child *does* inherit the wrapper process environment; the real gap is that callers who set config via plain assignment (not `export`) or who rely on the wrapper to thread a value through see it dropped. Fix = guarantee pass-through: explicitly forward a documented set of ClearGate config vars (`CLEARGATE_STATE_FILE`, `ORCHESTRATOR_PROJECT_DIR`, `CLAUDE_PROJECT_DIR`, `AGENT_TYPE`, `WORK_ITEM_ID`) to the child, with the default being full inherited-environment pass-through and an optional `RUN_SCRIPT_ENV_ALLOWLIST` opt-in for callers that want isolation. Do NOT make allowlist the default — that would silently break any future env-based config. Prefer pass-through with optional allowlist.
- **Human decision:** Accepted 2026-06-03 (owner: "accept all") — adopt the Recommended answer above.

## 1. The Context Override (Old vs. New)
*(AI agents hallucinate when old context conflicts with new requests. Explicitly declare what to evict.)*

**Obsolete Logic (What to Remove / Forget):**
- (F5) `pre_gate_runner.sh` is **not** safe with a relative worktree path. It captures `WORKTREE="$2"` verbatim (line 28), builds `REPORT_FILE="${WORKTREE}/.cleargate/reports/pre-${MODE}-scan.txt"` (lines 64-65), then later runs **non-subshell** `cd "$WORKTREE"` (lines 184 and 205, inside the QA test/typecheck blocks). After that `cd`, the still-relative `REPORT_FILE` re-resolves against the new cwd → a doubled path (`<wt>/<wt>/.cleargate/reports/...`) → the report append fails ENOENT. The current de-facto contract "callers must pass an ABSOLUTE worktree path" (the F5 flashcard) is a workaround, not a fix.
- (F8) Stop assuming `run_script.sh` threads caller config to the wrapped script. A value the orchestrator expects the wrapper to carry (e.g. `CLEARGATE_STATE_FILE` for `update_state.mjs` / `validate_state.mjs` / `validate_bounce_readiness.mjs`) is **not** explicitly forwarded — only `RUN_SCRIPT_ACTIVE=1` is exported (line 89) before the child runs (line 92). The flashcard workaround ("pass it inline or call the script directly") must stop being required.

**New Logic (The New Truth):**
- (F5) `pre_gate_runner.sh` normalizes the worktree argument to an absolute path **once** at entry (right after the directory-exists check at line 39), so `REPORT_DIR`/`REPORT_FILE` and every downstream `cd "$WORKTREE"` resolve correctly whether the caller passed a relative or absolute path. Report writes never ENOENT on relative input.
- (F8) `run_script.sh` execs its child with the inherited environment guaranteed, and explicitly forwards the documented ClearGate config vars, so exported (or wrapper-threaded) config such as `CLEARGATE_STATE_FILE` reaches `update_state.mjs` / `validate_*.mjs` through the wrapper. Optional isolation is opt-in only.

## 2. Blast Radius & Invalidation
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] No downstream Story/Epic depends on these two leaf wrapper scripts — nothing to revert to 🔴. They are pure orchestration plumbing under `.cleargate/scripts/`.
- [ ] Mirror-sync coupling: both files have canonical mirrors under `cleargate-planning/.cleargate/` and the npm payload under `cleargate-cli/templates/cleargate-planning/.cleargate/` (kept byte-identical by `prebuild`). The fix must land in the canonical copy and the live `/.cleargate/` instance must be re-synced — flag for the closeout doc-refresh, not a code dependency.
- [ ] Interaction with F7: F5's realpath normalization does NOT touch the `stray_env_files` scan; no overlap. F8's env pass-through is independent of F4's `.env` provisioning — listed for awareness only, no shared edit.
- [ ] Database schema impacts? No — shell wrappers only; no `mcp/`, `admin/`, or DB surface.

## Existing Surfaces

> L1 reuse audit. Paths verified 2026-06-03 against the meta-repo `.cleargate/scripts/` checkout. Both are existing scripts this CR fixes in place — no new file.

- **Surface:** `.cleargate/scripts/pre_gate_runner.sh:28` — `WORKTREE="$2"` captures the worktree argument verbatim with no normalization; `:64-66` build `REPORT_DIR`/`REPORT_FILE` from that raw value; `:184` and `:205` run non-subshell `cd "$WORKTREE"` in the QA test/typecheck blocks, after which the relative `REPORT_FILE` re-resolves against the changed cwd → doubled path → ENOENT. This is the F5 fix target.
- **Surface:** `.cleargate/scripts/run_script.sh:89` — only `export RUN_SCRIPT_ACTIVE=1` is set before `:92` invokes the child as `"$@" >"$STDOUT_TMP" 2>"$STDERR_TMP"`; no explicit forwarding of ClearGate config vars. This is the F8 fix target. (The `:36` `exec "$@"` self-exemption fast-path has the same env behavior and should get the same guarantee.)
- **Surface:** `.cleargate/scripts/update_state.mjs` — one of the `CLEARGATE_STATE_FILE` consumers (alongside `.cleargate/scripts/validate_state.mjs` and `.cleargate/scripts/validate_bounce_readiness.mjs`) that goes blind when the var is dropped through the wrapper; named here as the impacted reader, not modified by this CR.
- **Why this CR extends rather than rebuilds:** both wrappers exist and work for the common absolute-path / exported-and-inherited case; this CR hardens two narrow correctness edges (relative-path normalization; guaranteed config-var pass-through) inside the existing files. It authors no new wrapper and changes no wrapper interface.

## 3. Execution Sandbox
*(Restrict the agent's scope to prevent unrelated refactoring.)*

**Modify:**
- `.cleargate/scripts/pre_gate_runner.sh` — after the `[[ ! -d "$WORKTREE" ]]` check at line 39, reassign `WORKTREE="$(cd "$WORKTREE" && pwd)"` (or `realpath "$WORKTREE"`) so all downstream `REPORT_FILE` / `cd` / `git -C` / `grep` uses are absolute. No other logic change.
- `.cleargate/scripts/run_script.sh` — before the child invocation at line 92 (and matching the `exec "$@"` path at line 36), guarantee inherited-environment pass-through and explicitly forward the documented ClearGate config vars (`CLEARGATE_STATE_FILE`, `ORCHESTRATOR_PROJECT_DIR`, `CLAUDE_PROJECT_DIR`, `AGENT_TYPE`, `WORK_ITEM_ID`); document an optional `RUN_SCRIPT_ENV_ALLOWLIST` opt-in. Update the header `Env vars read:` block accordingly.
- **Mirror-sync (post-merge, not a code edit):** re-apply to `cleargate-planning/.cleargate/scripts/pre_gate_runner.sh` + `.../run_script.sh` (canonical), let `prebuild` mirror the npm payload, and re-sync the live `/.cleargate/` instance.

## 4. Verification Protocol
*(How do we confirm new logic works and old logic is completely removed?)*

**Command/Test (F5):**
- From the repo root, with a relative worktree path: `bash .cleargate/scripts/pre_gate_runner.sh qa .worktrees/CR-080-smoke sprint/S-99` (after `git worktree add .worktrees/CR-080-smoke` or a stub dir) writes its report to `.worktrees/CR-080-smoke/.cleargate/reports/pre-qa-scan.txt` and exits without an ENOENT on the report append. Repeat with an absolute path → identical report location, no doubling.
- Regression: `grep -n 'WORKTREE="\$2"' .cleargate/scripts/pre_gate_runner.sh` is immediately followed (within the validation block) by a realpath/`cd … && pwd` reassignment.

**Command/Test (F8):**
- `export CLEARGATE_STATE_FILE=/tmp/cr080-state.json` then `bash .cleargate/scripts/run_script.sh node -e 'process.stdout.write(process.env.CLEARGATE_STATE_FILE || "MISSING")'` prints `/tmp/cr080-state.json`, not `MISSING`.
- End-to-end: with `CLEARGATE_STATE_FILE` exported, `bash .cleargate/scripts/run_script.sh node .cleargate/scripts/update_state.mjs STORY-99-01 Completed` writes to the overridden state file (not the default).
- `grep -n 'CLEARGATE_STATE_FILE' .cleargate/scripts/run_script.sh` shows the var is explicitly forwarded/documented in the wrapper.

---

## Context Source

> Discovery audit. Populated from the live SPRINT-66 dogfood observation log and verified codebase grounding.

**context_source:** `.cleargate/sprint-runs/_off-sprint/dogfood-SPRINT-66-observations.md` findings F5 (line 320-321) + F8 (line 329-330), surfaced as orchestrator flashcards during the new_app SPRINT-66 v2-parallel run and routed to framework hygiene per the F-tally (line 332: "F5 + F8 (script-wrapper correctness bugs)"). Verified on disk 2026-06-03 against `.cleargate/scripts/pre_gate_runner.sh` (:28/:64-66/:184/:205) and `.cleargate/scripts/run_script.sh` (:36/:89/:92); `CLEARGATE_STATE_FILE` consumers confirmed via grep (`update_state.mjs`, `validate_state.mjs`, `validate_bounce_readiness.mjs`). Routes to EPIC-045 per the tech-debt-findings memory directive.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready (owner accepted all recommendations 2026-06-03)**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. — *§1 declares both the F5 relative-path-doubling behavior and the F8 env-drop behavior, with line-cited current state.*
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — *No downstream Story/Epic depends on these two leaf wrapper scripts; §2 records only the mirror-sync coupling and the F4/F7 awareness notes. Nothing to revert.*
- [x] Execution Sandbox contains exact file paths. — *§3 names `.cleargate/scripts/pre_gate_runner.sh` and `.cleargate/scripts/run_script.sh` with the exact insertion points (lines 39 and 92/36) plus the mirror targets.*
- [x] Verification command is provided. — *§4 gives concrete relative/absolute worktree smoke runs for F5 and an exported-env passthrough probe + end-to-end `update_state.mjs` run for F8.*
- [x] `approved: true` is set in the YAML frontmatter. — *Intentionally Draft. Dogfood-derived finding; approval is a separate Gate-1 step pending the two §0.5 decisions (realpath-vs-subshell; pass-through-vs-allowlist).*
- [x] Existing Surfaces cites at least one source-tree path the CR extends. — *Cites `.cleargate/scripts/pre_gate_runner.sh:28`, `.cleargate/scripts/run_script.sh:89`, and `.cleargate/scripts/update_state.mjs`, all verified on disk 2026-06-03.*
