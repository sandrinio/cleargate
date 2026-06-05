# Improvement Suggestions — SPRINT-36


## Trends

Trends: 23 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

_No candidates detected this sprint._

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-36-F01: broker revoke subscriber: ONE ioredis subscribe-mode conn, P
<!-- hash:e6a2b2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-05 · #connector #redis · broker revoke subscriber: ONE ioredis subscribe-mode conn, PSUBSCRIBE rev:*; resubscribe re-issues PSUBSCRIBE on the SAME conn (no 2nd connection) + flushes whole verify cache via invalidate({}) — fail-closed so a revoke missed during the gap cannot survive the TTL. [SPRINT-36 047-06]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F02: mcp/src/db/migrations/ has TWO 0009_*.sql files (0009_aspiri
<!-- hash:886916 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-06-04 · #schema #migration #mcp · mcp/src/db/migrations/ has TWO 0009_*.sql files (0009_aspiring_vapor + 0009_sad_mindworm, journal idx 8 & 9) — next migration MUST be 0010_*; never trust `drizzle generate` numbering blind, grep the journal _journal.json tail first. [SPRINT-36 047-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F03: broker/package.json ships ONLY `ws` — no redis/http client. 
<!-- hash:e77903 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-06-04 · #connector #auth #deps · broker/package.json ships ONLY `ws` — no redis/http client. Real-auth M1 adds ioredis ^5.4.0 (match mcp plane; registry 5.11.1) for the PSUBSCRIBE subscriber (047-06); verify-client (047-05) uses Node-24 global fetch + node:crypto, no new dep. [SPRINT-36]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F04: run_script.sh FORWARDS CLEARGATE_STATE_FILE/CLAUDE_PROJECT_D
<!-- hash:89c281 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-06-04 · #run_script #env · run_script.sh FORWARDS CLEARGATE_STATE_FILE/CLAUDE_PROJECT_DIR/ORCHESTRATOR_PROJECT_DIR to the child (CR-080 F8) — but ONLY if set in the WRAPPER's own env; set them as an inline prefix on the `bash run_script.sh …` call itself, not on a nested command. "wrapper strips env" is a misdiagnosis (verified by reading run_script.sh L44/107). [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F05: Cross-repo sprint (code in a separate gitignored repo): expo
<!-- hash:690706 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #reporting #cross-repo · Cross-repo sprint (code in a separate gitignored repo): export ORCHESTRATOR_PROJECT_DIR or the SubagentStop hook mis-buckets per-agent cost to _off-sprint (ledger ends up ~1 row, unreconcilable); the v2 report hotfix-ledger + flashcard-audit passes also assume same-repo — both need a cross-repo mode. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F06: broker server.ts boots gateway+registry but does NOT attach 
<!-- hash:7a5540 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #e2e · broker server.ts boots gateway+registry but does NOT attach a router — the e2e harness must `createRelay`/`createRouter` over ONE shared MemoryRegistry and pass it + the router into `createGateway`, else prompt/event/cancel/turn_end never relay. [SPRINT-35 046-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F07: broker `router.red` "no-cross-talk" test is intermittently f
<!-- hash:fbe712 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #broker #flaky · broker `router.red` "no-cross-talk" test is intermittently flaky (loopback TCP coalescing race the setImmediate drain-queue mitigates but doesn't fully kill); re-run before treating a single failure as a regression — 31/31 on retry. [SPRINT-35 046-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F08: Opaque payload pass-through = forward the SAME decoded Envel
<!-- hash:55e181 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #broker · Opaque payload pass-through = forward the SAME decoded Envelope object to encode() (one JSON.stringify on the whole frame); never touch `.payload` (typed `unknown` in shared/types.ts to block accidental inspection). [SPRINT-35 046-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F09: Two concurrent same-tick app→connector WS sends can coalesce
<!-- hash:0fe173 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #ws #race · Two concurrent same-tick app→connector WS sends can coalesce into one TCP data event, breaking sequential `.once('message')` receivers — fix with a per-connector setImmediate drain queue + `allowSynchronousEvents:false` on WebSocketServer (ws ≥8.18). [SPRINT-35 046-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F10: EOF is the SOLE turn terminus: a `result` → turn_result and 
<!-- hash:a800cd -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #normalize · EOF is the SOLE turn terminus: a `result` → turn_result and NEVER closes; emit stream_end only on stdout 'end'. Background tasks emit ≥2 results (fixture 02-background) — closing on the first breaks them. [SPRINT-35 048-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F11: Two disjoint error classes: in-band `is_error:true` → turn_r
<!-- hash:5c7ec4 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #normalize · Two disjoint error classes: in-band `is_error:true` → turn_result{error} (recoverable); out-of-band spawn failure (ENOENT/0 parseable records) → distinct fatal error{code:'spawn_failed'}, never a hang on an already-fired EOF. [SPRINT-35 048-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F12: claude tool names arrive already-PascalCase from the assista
<!-- hash:8d5358 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #tool-use · claude tool names arrive already-PascalCase from the assistant record — do NOT apply a case transform (the spike fixture proves it). [SPRINT-35 048-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F13: exactOptionalPropertyTypes=true: never assign `prop: expr|un
<!-- hash:9b5f08 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-06-04 · #typescript #strict · exactOptionalPropertyTypes=true: never assign `prop: expr|undefined` in an object literal — use conditional spread `...(cond ? {prop:val} : {})`. [SPRINT-35 048-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F14: Build the `shared` package (npm run build --workspace=shared
<!-- hash:b2ec9e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #test-harness · Build the `shared` package (npm run build --workspace=shared) before broker/daemon red tests run, or they fail with ERR_MODULE_NOT_FOUND on @connector/shared instead of the intended missing-impl failure. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F15: Node 25: `--input-type=module` is stdin/`--eval`/`--print` o
<!-- hash:a25503 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #node25 #spawn · Node 25: `--input-type=module` is stdin/`--eval`/`--print` only — a file-based ESM spawn target must use a `.mjs` extension (no flag), else ERR_INPUT_TYPE_NOT_ALLOWED crashes the child before it forks. [SPRINT-35 048-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F16: Broker presence uses ONE setInterval sweep over a lastSeen/l
<!-- hash:a05279 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #broker · Broker presence uses ONE setInterval sweep over a lastSeen/listAll() table, never per-socket timers (verify via single-setInterval grep); all credential logic stays in auth-stub.ts (EPIC-047 deletes it wholesale). [SPRINT-35 046-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F17: connector broker/daemon test scripts glob both src/** and te
<!-- hash:6a9896 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #test-harness · connector broker/daemon test scripts glob both src/** and test/** for *.node.test.ts — put test files where the package globs, and extend the glob in the SAME commit if you add a new test dir. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F18: Developer makes the FROZEN *.red.node.test.ts pass — do NOT 
<!-- hash:73170e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #tdd #process · Developer makes the FROZEN *.red.node.test.ts pass — do NOT author a parallel duplicate *.node.test.ts for the same scenarios (creates D.5 dedup); harness bugs in red tests route back to QA-Red, never a dev rewrite. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F19: Error subclass carrying `cause`: pass via `super(msg, { caus
<!-- hash:592d44 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #typescript #strict · Error subclass carrying `cause`: pass via `super(msg, { cause })` (ES2022), not a `public readonly cause?` ctor param — `noImplicitOverride` rejects the param-property form (Error.cause is built-in). [SPRINT-35 STORY-046-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F20: Cross-repo sprint (code in a separate gitignored repo): QA/D
<!-- hash:8a029e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #qa #cross-repo · Cross-repo sprint (code in a separate gitignored repo): QA/Dev context packs assume meta-repo paths and are absent — the orchestrator MUST pass the code-repo root + branch + commit SHA + path-prefix mapping explicitly in every dispatch prompt. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F21: A red test that greps for "zero hits" of a token will SELF-H
<!-- hash:bea9ae -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #qa-red #grep · A red test that greps for "zero hits" of a token will SELF-HIT its own assertion-message string literals — always `grep --exclude=<the-red-test-file>` (or scope the grep away from the test file) or it never goes green. [SPRINT-34 CR-075]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F22: Running `npm test` via `bash run_script.sh npm test` leaks `
<!-- hash:f5495e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test #run_script #isolation · Running `npm test` via `bash run_script.sh npm test` leaks `RUN_SCRIPT_ACTIVE=1` into the test child env → CR-046/052/054 self-exemption tests false-fail (find 0 incident files). Invoke `npm test` DIRECTLY when measuring the suite or testing run_script.sh behavior. [SPRINT-34 CR-075]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F23: cleargate init reads ROOT templates/cleargate-planning (reso
<!-- hash:5e8752 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #npm-publish #payload #init · cleargate init reads ROOT templates/cleargate-planning (resolveDefaultPayloadDir init.ts:140-145 = dist/../templates). dist/templates/ is the DROPPABLE dup, NOT root templates. CR-076 hypothesis was inverted. [SPRINT-34]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F24: cleargate-cli test_ratchet.mjs lives ONLY in OUTER .cleargat
<!-- hash:02f36e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test #monorepo #ratchet · cleargate-cli test_ratchet.mjs lives ONLY in OUTER .cleargate/scripts/, still spawns vitest (removed EPIC-028), expects test-baseline.json that does NOT exist. Ratchet is stale/dead vs node:test. [SPRINT-34 CR-075]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F25: TWO files shell 'npm pack --workspace=cleargate-cli': test/c
<!-- hash:76dcd1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test #workspace · TWO files shell 'npm pack --workspace=cleargate-cli': test/changelog-format.node.test.ts AND test/lib/license-contract.node.test.ts. CR-075 named only the first. [SPRINT-34]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F26: `node --test --import tsx/esm` throws ERR_REQUIRE_CYCLE_MODU
<!-- hash:c505bd -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test-runner #node25 #tsx · `node --test --import tsx/esm` throws ERR_REQUIRE_CYCLE_MODULE on Node ≥25 (stricter ESM/CJS cycle detection); use `--import tsx` (no `/esm`) — functionally identical, tsx auto-detects ESM. [SPRINT-34 CR-082]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F27: A Class-3 close_sprint.mjs gate (e.g. deferred_verification,
<!-- hash:51c0f0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #close-gate #live-on-merge #backward-compat · A Class-3 close_sprint.mjs gate (e.g. deferred_verification, CR-082) goes LIVE at the SAME sprint's own Gate-4 close — it MUST silent-no-op when zero stories declare the field, else it self-blocks the sprint that shipped it. Mirror Step 2.7/2.8 env seams (CLEARGATE_SKIP_*/CLEARGATE_FORCE_*) and add an explicit none-declared→no-op test. [SPRINT-34 CR-082]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F28: A Class-3 pre-gate check wired into pre_gate_runner.sh (e.g.
<!-- hash:d033ac -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #pre-gate #live-on-merge #qa-red-lint · A Class-3 pre-gate check wired into pre_gate_runner.sh (e.g. qa_red_lint, CR-081) runs against the NEXT story's own *.red tests the moment it merges — it MUST exit 0 on non-applicable files (plain node:test w/ no Pydantic Literal / no queryByText) or it phantom-flags a wiring gap and stalls the serial loop. Add a negative "non-applicable file" scenario. [SPRINT-34 CR-081]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F29: Worktree config provisioning + its stray-env-scan exemption 
<!-- hash:2ff4d8 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-03 · #worktree #pre-gate #single-source · Worktree config provisioning + its stray-env-scan exemption must read ONE source (`config.yml worktree.provision_config` via a shared helper) — never duplicate the list into gate-checks.json, or the two drift and a provisioned file false-flags (F7). [SPRINT-34 CR-079]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F30: `npm run <x> --workspace=<pkg>` fails "No workspaces found" 
<!-- hash:6223d1 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-03 · #gate #npm #workspace · `npm run <x> --workspace=<pkg>` fails "No workspaces found" when the repo root has NO npm workspaces (meta-repo root isn't a workspace of cleargate-cli). Use `npm --prefix cleargate-cli run <x>` — works AND no `cd`, so it dodges the pre_gate cwd-leak. config.yml gates.* carried this latent-broken string. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F31: `X=$(grep -c PAT f || echo 0)` DOUBLES to "0\n0" on zero mat
<!-- hash:0a46f6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-06-03 · #test-harness #bash · `X=$(grep -c PAT f || echo 0)` DOUBLES to "0\n0" on zero matches (grep -c prints 0 AND exits 1, so `|| echo 0` appends) → `[[ "$X" -eq 0 ]]` throws a syntax error and falls to the FAIL branch. Use `grep -q` (no count capture) or `grep -c … | head -1`. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F32: pre_gate_runner.sh arch-mode (~L205) runs `cd "$WORKTREE" &&
<!-- hash:038335 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-06-03 · #pre-gate #cwd-leak #worktree · pre_gate_runner.sh arch-mode (~L205) runs `cd "$WORKTREE" && eval typecheck_cmd` UN-subshelled — a typecheck cmd containing `cd cleargate-cli` leaks cwd for the rest of the script, breaking the relative REPORT_FILE ("No such file or directory"). Pass an ABSOLUTE worktree path; prefer `npm --prefix` over `cd` in gate cmds. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-36-F33: write_dispatch.sh guard FIXED (043-09 re-verify): skip requi
<!-- hash:52d742 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 3 sprint dir(s)
**Original entry:** `2026-06-01 · #dispatch #marker #write_dispatch · write_dispatch.sh guard FIXED (043-09 re-verify): skip requires exact tuple work_item_id==$1 AND agent_type==$2 AND session_id==CLAUDE_SESSION_ID AND writer prefix pre-tool-use-task.sh*; else WRITE. Fails toward writing on jq-fail/malformed/empty/non-auto-writer. Same work_item+agent re-dispatch still de-dups (tuple-keyed ledger attribution preserved). [SPRINT-33 043-09 PASS]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
