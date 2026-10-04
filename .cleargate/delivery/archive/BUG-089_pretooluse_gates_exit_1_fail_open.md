---
bug_id: BUG-089
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: "Completed"
severity: P1-High
reporter: sandrinio
approved: true
approved_by: sandrinio
approved_at: 2026-09-11T22:19:09Z
ambiguity: 🟢 Low
context_source: Surfaced 2026-09-11 while reconciling [[STORY-058-10]]'s claim that the shared hook scripts 'port unchanged' to Codex. Reading the scripts showed they block with `exit 1`; the official Claude Code hooks reference states exit 1 is a non-blocking error and only exit 2 (or a JSON permissionDecision of deny) blocks. The defect is therefore not Codex-specific — it is live on the Claude host today.
created_at: 2026-09-11T00:00:00Z
updated_at: 2026-09-11T22:25:54Z
created_at_version: cleargate@0.26.1
updated_at_version: 11c29fd3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-11T22:29:13Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-089
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-25T03:34:42Z
  sessions: []
---

# BUG-089: Both blocking PreToolUse gates exit 1, which Claude Code treats as non-blocking — the planning-first gate and the flashcard write-gate are fail-open

**Milestone:** M0 — repair the Claude block signal before ordinary sprint dispatch; [[STORY-058-10]] extends the same handler for Codex in M5.

### Resolved Decisions

- **Question:** which fix shape — change the two blocking branches to `exit 2`, emit `hookSpecificOutput.permissionDecision: "deny"` on exit 0, or route both through the normalized `cleargate hook signal <block|allow>` handler that [[STORY-058-10]] §3.2 already requires for the Codex port?
- **Recommended:** the normalized handler, with `exit 2` as its Claude resolution. A one-line `exit 2` fixes today and is re-broken the moment a second host with different semantics is added, which is exactly what SPRINT-41 is doing. One handler, host-resolved, fixes both at once.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: implement one shared block/allow handler, with Claude block mapped to exit 2 and explicit host selection; ensure wrapper propagation and fail-closed resolver errors.

- **Question:** does this belong in SPRINT-41 — where the host work is already in flight and would otherwise implement the same handler twice — or as a standalone fix outside the sprint?
- **Recommended:** SPRINT-41 M0, before ordinary dispatch; M5 extends rather than recreates the handler.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: include BUG-089 in SPRINT-41 M0, then re-sync through BUG-085 and prove live Claude denials before ordinary dispatch.

- **Question:** how far back does the exposure go, and does anything need re-auditing as a result — every "the gate blocked it" claim in past sprint reports rests on a gate that did not block?
- **Recommended:** do not re-audit history. Record the exposure window in the fix commit and move on; the cost of re-deriving past sprints outweighs the value.
- **Human decision:** Approved by sandrinio on 2026-09-11T22:19:09Z through “continue please” after the recommended decision brief: keep retrospective re-auditing outside this repair; document the observed exposure and qualify unverified historical enforcement claims without rewriting history.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** The two PreToolUse gates that ClearGate documents as *always enforced* actually stop the tool call they are wired to.
`pre-edit-gate.sh` (matcher `Edit|Write`) should refuse an edit to a file no approved story covers when the planning-first gate is in enforce mode and the existing active-sprint bypass does not apply. Its default warning mode and active-sprint bypass are not changed by this repair. `pending-task-sentinel.sh` (matcher `Task|Agent`) should refuse to spawn the next subagent while unprocessed flashcards remain — `cleargate-enforcement.md` line 176 states the orchestrator "MUST NOT create the next story's worktree until all `flashcards_flagged` entries from the prior story's dev + QA reports are processed," and line 213 states the gate "is always enforced."

**Actual Behavior:** Both gates signal their block with a bare `exit 1` and emit no JSON decision. Claude Code treats a PreToolUse hook exiting 1 with no valid JSON on stdout as a *non-blocking* error: the tool call proceeds, and the failure surfaces only as a transcript notice (`Failed with non-blocking status code:`). Only `exit 2` — or a JSON `hookSpecificOutput.permissionDecision` of `"deny"` — blocks. Neither script emits either. Both gates are therefore fail-open: they log, they print to stderr, and the action they exist to prevent happens anyway.

The blast radius is doctrinal as well as mechanical. `CLEARGATE_ADVISORY=1` is documented as *downgrading* these gates from blocking to warning — but there is nothing to downgrade, because the default path is already a warning. Every "always enforced" claim resting on these two scripts is currently false.

## 2. Reproduction Protocol

Shell reproduction identifies the invalid host signal; a real host session is still required to prove actual enforcement. Use isolated fixture repositories, never alter this sprint's live sentinel for a test:

- Run: `printf '{"tool_name":"Write","tool_input":{"file_path":"/tmp/uncovered.ts"},"cwd":"'"$PWD"'"}' | bash cleargate-planning/.claude/hooks/pre-edit-gate.sh; echo "exit=$?"` with the planning-first gate in enforce mode, no active-sprint sentinel in the fixture, and no approved story covering the path.
- Observe: `exit=1`, with the refusal text on stderr. Per the hooks contract, 1 does not block.
- Run the same for the flashcard gate: with at least one unprocessed flashcard for the active sprint and `env -u SKIP_FLASHCARD_GATE -u CLEARGATE_ADVISORY`, pipe a `Task` payload into `pending-task-sentinel.sh` and observe `exit=1`.
- Confirm no JSON decision path exists: `command grep -rn "permissionDecision\|hookSpecificOutput" cleargate-planning/.claude/hooks/` returns zero matches, so the exit code is the only signal either script sends.

In-session confirmation: with the gate in enforce mode, ask Claude Code to edit a file no approved story covers. The edit lands; the transcript shows a hook-error notice rather than a refusal.

## 3. Evidence & Context

```
cleargate-planning/.claude/hooks/pre-edit-gate.sh:154-166
  # ── 7. Gate decision ───────────────────────────────────────────────
  if [ "${DOCTOR_EXIT}" -ne 0 ]; then
    ...
    if [ "${MODE}" = "enforce" ]; then
      printf 'ClearGate: planning-first gate — no approved story covers %s (%s). ...' ... >&2
      exit 1

cleargate-planning/.claude/hooks/pending-task-sentinel.sh:150-160
      # Default: block Task spawn — exit 1 with diagnostic on stderr (real stderr, not log)
      printf 'FLASHCARD GATE BLOCKED: %d unprocessed flashcard(s) must be processed before spawning next Task.\n' ...
      exit 1

cleargate-planning/.claude/settings.json
  PreToolUse | matcher "Edit|Write"  -> pre-edit-gate.sh
  PreToolUse | matcher "Task|Agent"  -> pending-task-sentinel.sh, pre-tool-use-task.sh

command grep -rn "permissionDecision|hookSpecificOutput" cleargate-planning/.claude/hooks/
  (no matches)

Claude Code hooks reference — https://code.claude.com/docs/en/hooks
  "For most hook events, exit code 2 is the only exit code that blocks through the code alone.
   Without valid JSON on stdout, Claude Code treats exit code 1 as a non-blocking error and
   proceeds with the action, even though 1 is the conventional Unix failure code. If your hook
   is meant to enforce a policy, use exit 2."
  "PreToolUse | Can block: Yes | What happens on exit 2: Blocks the tool call"
  Non-blocking path: "the action proceeds, and the transcript shows a <hook name> hook error
   notice followed by the first line of stderr, prefixed with 'Failed with non-blocking status code:'"
```

Not in scope, and verified so rather than assumed: `stamp-and-gate.sh` always exits 0 by explicit design (severity enforcement lives at wiki lint); `pre-tool-use-task.sh` and `pre-tool-use-autonomy.sh` are observability-only and documented as never blocking; `pre-commit-surface-gate.sh`'s three `exit 1`s are correct — it is a git pre-commit hook, where non-zero does abort the commit.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/hooks/hook-signal.ts` — new shared resolver, Claude mapping first; Codex mapping belongs to STORY-058-10.
- `cleargate-cli/src/commands/hook.ts` and `cleargate-cli/src/cli.ts` — command implementation and registration for `cleargate hook signal <block|allow> --host claude`.
- `cleargate-cli/test/hooks/hook-signal.node.test.ts` — new mapping/CLI regression tests.
- `cleargate-cli/test/scripts/test_pre_edit_gate.sh`, `.cleargate/scripts/test/test_flashcard_enforcement.sh`, and `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` — update host-signal expectations and add wiring coverage.
- `cleargate-planning/.claude/settings.json` — explicit host selection at the hook boundary; preserve existing matchers and policy.
- `cleargate-planning/.claude/hooks/pre-edit-gate.sh`
- `cleargate-planning/.claude/hooks/pending-task-sentinel.sh`
- `.cleargate/knowledge/cleargate-enforcement.md` — the break-glass wording that describes `CLEARGATE_ADVISORY=1` as downgrading a block that never happened.
- `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md` — canonical twin of the file above; tracked outer knowledge files are edited in both trees byte-identically per house rule (verified identical pre-fix via cmp).
- The live gitignored .claude/ mirror of both hooks above is re-synced from canonical at the sprint
  boundary, per CLAUDE.md's dogfood-split rule — a canonical-only fix does not reach the running
  instance (see [[BUG-085]]); it is not edited directly in this story.

**§4 self-amendment (Developer, 2026-09-25, skill §9 file-surface contract):** three additional
`cleargate-cli` files, outside the list above, required a matching fix in the same commit:
- `test/commands/init.node.test.ts` — the frozen BUG-038 `pre-edit-gate.sh` init-snapshot test
  (`payloadDir` reads the canonical hook verbatim) breaks once the hook's body changes for any
  reason; repointed that one regular test to a new successor snapshot (below) and kept the
  historical bug-038 lock file + its own existence-only test untouched.
- `test/snapshots/hooks/pre-edit-gate.bug-089.sh` — new successor snapshot: the worktree's
  `pre-edit-gate.sh` with `__CLEARGATE_VERSION__` substituted for `0.5.0` (the same substitution
  `copyPayload` performs), verified byte-identical to the worktree hook via `diff` before being
  committed as the new lock.
- `src/commands/init.ts` (`HOOK_ADDITION`) + the one `test/commands/init.node.test.ts` fixture that
  hand-authors an equivalent object (CR-059 scenario 5) — `HOOK_ADDITION`'s `pre-edit-gate.sh`
  command string is merged into a fresh install's settings.json via exact-string dedup
  (`mergeSettings`); leaving it without `--host claude` while the canonical payload gained it would
  have registered `pre-edit-gate.sh` **twice** under `Edit|Write` on every fresh `cleargate init`
  (one call with `--host claude`, one without). Updated both to match the canonical string; full
  `test/commands/init.node.test.ts` run (28/29 pass, 1 expected Rule-15 failure) confirms no
  duplicate-hook regression survived.

**§4 self-amendment (Rework 1, Developer, 2026-09-25, coordinator-dispatched post-merge fix):**
- `cleargate-cli/scripts/build-manifest.ts` — DevOps' post-merge full suite caught
  `test/docs/pin-placeholder-coverage.node.test.ts` failing: `pending-task-sentinel.sh`'s
  three-branch CLI resolver (copied from `pre-edit-gate.sh`'s) carries the same
  `HOOK_PIN="__CLEARGATE_VERSION__"` literal, but had no dedicated `pin-aware` `TIER_RULES`
  entry — the same gap class BUG-038 fixed for `pre-edit-gate.sh`. Added the matching entry.
  Full report: `.cleargate/sprint-runs/SPRINT-41/reports/BUG-089-devops-blockers.md` and the
  dev report's "Rework 1" section.

## Task Breakdown

- [x] Write the failing test first: assert each blocking branch emits a signal Claude Code actually honors, not merely a non-zero code. (QA-Red, `hook-signal.red.node.test.ts` + `.red.integration.node.test.ts`, arch_bounces=1, TPV APPROVED 2026-09-25.)
- [x] Implement the approved shared handler once: block→2 and allow→0 for Claude, with explicit `--host claude` selection. (`src/hooks/hook-signal.ts`, `src/commands/hook.ts`, `cleargate hook signal <block|allow> --host claude` registered in `src/cli.ts`.)
- [x] Propagate the handler result through the shell wrapper; a missing CLI, unknown host, resolver failure, or unexpected resolver status must fail closed as exit 2 on a blocking branch, not fall through as 0/1/127. Test each failure route. (U7-U12 cover missing/failed/unexpected for both scripts; both blocking branches always resolve to exactly `exit 2` regardless of the resolver's own outcome.)
- [x] Apply it to both blocking branches; leave the non-blocking scripts untouched. (`pre-edit-gate.sh`, `pending-task-sentinel.sh` only; `pre-tool-use-task.sh`/`pre-tool-use-autonomy.sh`/`stamp-and-gate.sh` unchanged.)
- [x] Confirm `CLEARGATE_ADVISORY=1` still degrades to a warning after the change, and that `SKIP_FLASHCARD_GATE=1` still suppresses the flashcard gate where the wave path requires it. (U15/U16 + `test_flashcard_enforcement.sh` Scenario 3/4, all green; no new `CLEARGATE_ADVISORY` honor site added to `pre-edit-gate.sh` per enforcement.md §15.)
- [ ] Coordinate BUG-085's targeted backed-up live re-sync after the repair; start a new Claude session and prove both an uncovered enforce-mode edit and a pending-flashcard dispatch are refused, plus positive controls. Record the exact live settings/script hashes. **Dropped from this dispatch:** this is M0-B (BUG-085's own item), sequenced by the Architect to run after this repair lands, not inside it — out of BUG-089 Developer scope per the M0 plan's wave split.
- [x] Correct the enforcement-doc wording that assumes exit 1 blocked. (`.cleargate/knowledge/cleargate-enforcement.md` §4.6 + §15, both copies, byte-identical.)
- [x] Record a flashcard: a gate's exit code is part of its host contract, not a shell convention. (see `flashcards_flagged` in the dev report.)

## 5. Verification Protocol (The Failing Test)

**Commands:** `npm --prefix cleargate-cli run test:file -- test/hooks/hook-signal.node.test.ts`; `bash cleargate-cli/test/scripts/test_pre_edit_gate.sh`; `bash .cleargate/scripts/test/test_flashcard_enforcement.sh`; `bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh`. Shell suites are invoked explicitly; the default Node test glob does not select `.sh` files.

The red test must assert the *host-honored* signal, not the shell exit code in isolation — the existing flashcard tests pass today against a script that does not block, which is exactly how this survived. A test asserting "exit code is non-zero" scores identically on a broken implementation and a correct one.

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | Block/allow mapping; each blocking branch; resolver failure/unknown host; missing CLI; advisory/skip and existing planning-gate bypass behavior |
| Integration tests | 1 | Both hooks invoked through their real settings.json wiring, asserting the blocking signal end to end |
| E2E / acceptance tests | 2 | Real Claude edit denial and dispatch denial, each paired with a permitted-action control; transcript plus absence of the forbidden side effect is required |

---

## Prior work

- [[BUG-085]] — canonical `.claude/` fixes never reach the live instance; this fix inherits that hazard and must be re-synced, not merely committed.
- [[STORY-058-10]] — its §3.2 already requires a normalized `cleargate hook signal` handler for the Codex port; this bug is the Claude-side half of the same defect and should share that implementation.
- The repo's own flashcard log records the adjacent class of failure — a hook whose enforcement never reaches the code beneath it — for the settings.json matcher case; this is the same class one layer down, at the exit code.

## Context Source

**context_source:** Surfaced 2026-09-11 during the Codex-port planning audit, by reading the hook scripts rather than their doc comments, and confirmed against the official Claude Code hooks reference.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity** — shared-handler shape, M0 placement, and bounded exposure reporting are approved. The implementation and live enforcement checks have not run.

- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
