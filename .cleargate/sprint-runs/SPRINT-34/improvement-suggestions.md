# Improvement Suggestions — SPRINT-34


## Trends

Trends: 21 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

_No candidates detected this sprint._

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-34-F01: A red test that greps for "zero hits" of a token will SELF-H
<!-- hash:bea9ae -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #qa-red #grep · A red test that greps for "zero hits" of a token will SELF-HIT its own assertion-message string literals — always `grep --exclude=<the-red-test-file>` (or scope the grep away from the test file) or it never goes green. [SPRINT-34 CR-075]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F02: Running `npm test` via `bash run_script.sh npm test` leaks `
<!-- hash:f5495e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test #run_script #isolation · Running `npm test` via `bash run_script.sh npm test` leaks `RUN_SCRIPT_ACTIVE=1` into the test child env → CR-046/052/054 self-exemption tests false-fail (find 0 incident files). Invoke `npm test` DIRECTLY when measuring the suite or testing run_script.sh behavior. [SPRINT-34 CR-075]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F03: cleargate init reads ROOT templates/cleargate-planning (reso
<!-- hash:5e8752 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #npm-publish #payload #init · cleargate init reads ROOT templates/cleargate-planning (resolveDefaultPayloadDir init.ts:140-145 = dist/../templates). dist/templates/ is the DROPPABLE dup, NOT root templates. CR-076 hypothesis was inverted. [SPRINT-34]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F04: cleargate-cli test_ratchet.mjs lives ONLY in OUTER .cleargat
<!-- hash:02f36e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test #monorepo #ratchet · cleargate-cli test_ratchet.mjs lives ONLY in OUTER .cleargate/scripts/, still spawns vitest (removed EPIC-028), expects test-baseline.json that does NOT exist. Ratchet is stale/dead vs node:test. [SPRINT-34 CR-075]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F05: TWO files shell 'npm pack --workspace=cleargate-cli': test/c
<!-- hash:76dcd1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test #workspace · TWO files shell 'npm pack --workspace=cleargate-cli': test/changelog-format.node.test.ts AND test/lib/license-contract.node.test.ts. CR-075 named only the first. [SPRINT-34]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F06: A Class-3 close_sprint.mjs gate (e.g. deferred_verification,
<!-- hash:51c0f0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #close-gate #live-on-merge #backward-compat · A Class-3 close_sprint.mjs gate (e.g. deferred_verification, CR-082) goes LIVE at the SAME sprint's own Gate-4 close — it MUST silent-no-op when zero stories declare the field, else it self-blocks the sprint that shipped it. Mirror Step 2.7/2.8 env seams (CLEARGATE_SKIP_*/CLEARGATE_FORCE_*) and add an explicit none-declared→no-op test. [SPRINT-34 CR-082]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F07: A Class-3 pre-gate check wired into pre_gate_runner.sh (e.g.
<!-- hash:d033ac -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #pre-gate #live-on-merge #qa-red-lint · A Class-3 pre-gate check wired into pre_gate_runner.sh (e.g. qa_red_lint, CR-081) runs against the NEXT story's own *.red tests the moment it merges — it MUST exit 0 on non-applicable files (plain node:test w/ no Pydantic Literal / no queryByText) or it phantom-flags a wiring gap and stalls the serial loop. Add a negative "non-applicable file" scenario. [SPRINT-34 CR-081]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F08: Worktree config provisioning + its stray-env-scan exemption 
<!-- hash:2ff4d8 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-03 · #worktree #pre-gate #single-source · Worktree config provisioning + its stray-env-scan exemption must read ONE source (`config.yml worktree.provision_config` via a shared helper) — never duplicate the list into gate-checks.json, or the two drift and a provisioned file false-flags (F7). [SPRINT-34 CR-079]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F09: `npm run <x> --workspace=<pkg>` fails "No workspaces found" 
<!-- hash:6223d1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-03 · #gate #npm #workspace · `npm run <x> --workspace=<pkg>` fails "No workspaces found" when the repo root has NO npm workspaces (meta-repo root isn't a workspace of cleargate-cli). Use `npm --prefix cleargate-cli run <x>` — works AND no `cd`, so it dodges the pre_gate cwd-leak. config.yml gates.* carried this latent-broken string. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F10: `X=$(grep -c PAT f || echo 0)` DOUBLES to "0\n0" on zero mat
<!-- hash:0a46f6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-03 · #test-harness #bash · `X=$(grep -c PAT f || echo 0)` DOUBLES to "0\n0" on zero matches (grep -c prints 0 AND exits 1, so `|| echo 0` appends) → `[[ "$X" -eq 0 ]]` throws a syntax error and falls to the FAIL branch. Use `grep -q` (no count capture) or `grep -c … | head -1`. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F11: pre_gate_runner.sh arch-mode (~L205) runs `cd "$WORKTREE" &&
<!-- hash:038335 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-03 · #pre-gate #cwd-leak #worktree · pre_gate_runner.sh arch-mode (~L205) runs `cd "$WORKTREE" && eval typecheck_cmd` UN-subshelled — a typecheck cmd containing `cd cleargate-cli` leaks cwd for the rest of the script, breaking the relative REPORT_FILE ("No such file or directory"). Pass an ABSOLUTE worktree path; prefer `npm --prefix` over `cd` in gate cmds. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F12: Evicting an internal policy from shipped agents: scope the z
<!-- hash:3ad73a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-03 · #portability #eviction #grep · Evicting an internal policy from shipped agents: scope the zero-match grep to POLICY tokens (node:test|vitest|tsx --test) on the NAMED agents only — a bare repo-path token like `cleargate-cli` legitimately recurs in devops/reporter/wiki agents + runtime-lane heuristics and can never be zeroed. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-34-F13: write_dispatch.sh guard FIXED (043-09 re-verify): skip requi
<!-- hash:52d742 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #dispatch #marker #write_dispatch · write_dispatch.sh guard FIXED (043-09 re-verify): skip requires exact tuple work_item_id==$1 AND agent_type==$2 AND session_id==CLAUDE_SESSION_ID AND writer prefix pre-tool-use-task.sh*; else WRITE. Fails toward writing on jq-fail/malformed/empty/non-auto-writer. Same work_item+agent re-dispatch still de-dups (tuple-keyed ledger attribution preserved). [SPRINT-33 043-09 PASS]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
