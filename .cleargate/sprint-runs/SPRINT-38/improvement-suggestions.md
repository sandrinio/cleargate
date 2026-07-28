# Improvement Suggestions — SPRINT-38


## Trends

Trends: 24 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

_No candidates detected this sprint._

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-38-F01: check:no-vitest is itself a NO-OP in all 3 packages: package
<!-- hash:6538cd -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-27 · #gate #danger · check:no-vitest is itself a NO-OP in all 3 packages: package.json holds \\b, the shell hands node -e a \b, and the JS single-quoted literal inside execSync('…') eats it — grep sees a literal BACKSPACE. Verified: real `import {vi} from 'vitest'` passes clean. [SPRINT-38 CR-087]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F02: A shipped pre-commit hook must guard every `npm --prefix <di
<!-- hash:58f804 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-27 · #hooks #portability · A shipped pre-commit hook must guard every `npm --prefix <dir>` on the dir existing AND defining the script — a missing dir exits 254, `if !` turns it into exit 1, and `-s`+`2>/dev/null` make it a zero-byte commit failure. [SPRINT-38 CR-087]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F03: mcp/cleargate-cli/admin are gitignored in the meta-repo, so 
<!-- hash:fedafa -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-27 · #hooks #worktree · mcp/cleargate-cli/admin are gitignored in the meta-repo, so an unguarded --prefix check blocks every LINKED WORKTREE of this repo too, not just downstream installs. [SPRINT-38 CR-087]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F04: npm_config_* leaks into nested `npm run` (npm_config_logleve
<!-- hash:1c35cb -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-27 · #test-harness #npm · npm_config_* leaks into nested `npm run` (npm_config_loglevel=silent propagates), so a hook relying on npm's banner for diagnosability goes silent under `npm test --silent` — emit your own stderr line. [SPRINT-38 CR-087]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F05: A gate can be "restored" at the script level and still be de
<!-- hash:28c933 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-27 · #gate #dogfood · A gate can be "restored" at the script level and still be dead end-to-end: verify reachability with a REAL git commit, not just the script's own exit code. [SPRINT-38 CR-086]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F06: Gitignored runtime sentinels (.active) never exist in a link
<!-- hash:49e2f2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-27 · #gate #worktree · Gitignored runtime sentinels (.active) never exist in a linked worktree — resolve them from `git rev-parse --git-common-dir`'s parent, not --show-toplevel, or every in-worktree commit silently skips the gate. [SPRINT-38 CR-086]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F07: pre-commit-surface-gate.sh runs `npm run check:no-vitest --p
<!-- hash:396f69 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-27 · #danger #gate · pre-commit-surface-gate.sh runs `npm run check:no-vitest --prefix mcp|cleargate-cli|admin` → exit 254 in any repo lacking those dirs; latent only while the dispatcher was dead. Arming the gate ships a commit-blocker downstream — fix before publish. [SPRINT-38 CR-086]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F08: An architect plan's per-leg red/green ledger can mis-predict
<!-- hash:233cc7 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-27 · #qa-red #test-harness · An architect plan's per-leg red/green ledger can mis-predict green-by-accident when an assertion also checks stderr text, not just exit status — run it, don't trust the table. [SPRINT-38 CR-086]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F09: Orchestrator rulings issued in DISPATCH text must be written
<!-- hash:30a96e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-27 · #orchestration #scope-discipline · Orchestrator rulings issued in DISPATCH text must be written back into the milestone plan — QA audits scope against the plan and will red a legitimately-approved edit that lives only in a dispatch prompt. [SPRINT-38 051-09]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F10: Red tests written from dispatch-only scope additions read as
<!-- hash:409358 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-27 · #qa-red #scope-discipline · Red tests written from dispatch-only scope additions read as overreach when audited against the blueprint; TPV checks wiring only — reconcile the plan BEFORE authoring the legs. [SPRINT-38 051-09]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F11: Anchor doc-coherence assertions on literal heading text (con
<!-- hash:81ab51 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-27 · #test-harness #qa-red · Anchor doc-coherence assertions on literal heading text (content.indexOf), not line numbers — sibling-story edits drift them within one wave. [SPRINT-38 051-08]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F12: A close_sprint test case that reaches exit 0 runs Steps 7/7.
<!-- hash:14da3c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-27 · #test-harness #close-sprint · A close_sprint test case that reaches exit 0 runs Steps 7/7.4/7.5 → shells out to dist/cli.js against the LIVE repo; no CLEARGATE_SKIP_* seam exists, only the dist-existence check. [SPRINT-38 051-08]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F13: close-sprint-reconcile.integration spawns the REAL outer clo
<!-- hash:e36024 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-27 · #test-harness #cross-repo · close-sprint-reconcile.integration spawns the REAL outer close_sprint.mjs — it reds on the repo's genuine backlog drift, not on your regression. [SPRINT-38 051-08]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F14: developer/qa agents write a report file only on the BLOCKED 
<!-- hash:ce8cfa -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-27 · #orchestration · developer/qa agents write a report file only on the BLOCKED path, but DevOps §C.7 halts without dev.md/qa.md — orchestrator must transcribe the returned verdicts before merge. [SPRINT-38 051-08]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F15: closed-set section locators (body.split(/^(?=## )/m)) ignore
<!-- hash:f9622a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-19 · #test-harness #readiness-gates · closed-set section locators (body.split(/^(?=## )/m)) ignore code fences — a fenced '## X' example in prose can hijack prior-work-recorded/section(N) and defeat migration grace; follow-up CR to make locators fence-aware. [SPRINT-38 051-07]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F16: doctor drift guard: CLAUDE.md can show zero live drift while
<!-- hash:f3cf01 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-19 · #dogfood #test-harness · doctor drift guard: CLAUDE.md can show zero live drift while other canonical/.claude files still drift, if a sibling story re-synced just that one file — expected, not a guard defect. [SPRINT-38 051-06]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F17: Wrapping full-suite `npm test` through run_script.sh collide
<!-- hash:03c375 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-19 · #test-harness #qa · Wrapping full-suite `npm test` through run_script.sh collides with run-script-wrapper.red.node.test.ts's own incident-dir assertions (false fails); invoke npm test directly for full-suite reruns. [SPRINT-38 051-06]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F18: grep mis-detects cleargate-cli/src/commands/doctor.ts as bin
<!-- hash:67f42c -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-19 · #review #tooling · grep mis-detects cleargate-cli/src/commands/doctor.ts as binary (multibyte arrows) and silently returns nothing; use `grep -a` or `sed` when reviewing that file. [SPRINT-38 051-06]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F19: test_assert_work_item_files.node.test.ts:194 ('v1 warns-only
<!-- hash:701ab5 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-19 · #test-harness #cross-repo · test_assert_work_item_files.node.test.ts:194 ('v1 warns-only' case) went stale after 051-04 (284d481d) removed the EXEC_MODE bypass in assert_story_files.mjs — pre-existing red on the branch, not a 051-05 regression; the STORY-028-06 fixture needs updating. [SPRINT-38 051-05]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F20: Gate try/catch must wrap ONLY the fallible call, not exitFn(
<!-- hash:23afb9 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-18 · #test-harness #cli · Gate try/catch must wrap ONLY the fallible call, not exitFn()/return — else a throw-based exit seam silently waives a hard block. [SPRINT-38 051-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F21: A cli node:test whose REPO_ROOT default resolves to the oute
<!-- hash:1889f3 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-18 · #test-harness #cross-repo · A cli node:test whose REPO_ROOT default resolves to the outer-meta MAIN checkout (not the story worktree) is red pre-merge for any story editing outer files in the same commit family; CLEARGATE_META_ROOT override is the correct pre-merge path, not a defect. [SPRINT-38 051-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F22: Equal git blob index hashes across canonical+live hunks in o
<!-- hash:0e88bc -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-07-18 · #dogfood #sync · Equal git blob index hashes across canonical+live hunks in one diff prove byte-identical sync — no separate diff run needed. [SPRINT-38 051-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F23: prebuild's copy-planning-payload.mjs HARDCODES src=<outer-ma
<!-- hash:35018a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-18 · #dogfood #sync #build · prebuild's copy-planning-payload.mjs HARDCODES src=<outer-main>/cleargate-planning (metaRoot=pkgRoot/.., no env override) — it can ONLY regen the payload from the outer MAIN working tree, never a story worktree. Payload/MANIFEST regen is a once-per-wave post-merge step; never commit prebuild output per-story-branch (MANIFEST checksum collisions). [SPRINT-38 M0]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F24: init_sprint.mjs no longer writes an execution_mode key into 
<!-- hash:f596b8 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-18 · #test-harness · init_sprint.mjs no longer writes an execution_mode key into state.json (STORY-070-01 retired the axis) — any test asserting s.execution_mode from init_sprint output (e.g. test_assert_story_files.sh Sc2 'execution_mode=v2') reads undefined and FAILS; drop that assertion when bringing the suite green. [SPRINT-38 051-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F25: Sprint-plan pipe-table columns VARY per sprint (SPRINT-36 = 
<!-- hash:0790ab -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-07-14 · #cli #parse #dashboard · Sprint-plan pipe-table columns VARY per sprint (SPRINT-36 = Story ID|Title|Repo|Lane|Wave|Parallel?|Depends on, NOT the template Milestone/Bounce order). Parse by HEADER NAME not position; group by Milestone-else-Wave; blank Title on miss. [CR-084]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F26: broker revoke subscriber: ONE ioredis subscribe-mode conn, P
<!-- hash:e6a2b2 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-05 · #connector #redis · broker revoke subscriber: ONE ioredis subscribe-mode conn, PSUBSCRIBE rev:*; resubscribe re-issues PSUBSCRIBE on the SAME conn (no 2nd connection) + flushes whole verify cache via invalidate({}) — fail-closed so a revoke missed during the gap cannot survive the TTL. [SPRINT-36 047-06]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F27: mcp `GET /admin-api/v1/admin-users` returns the WHOLE admin_
<!-- hash:6402a5 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #mcp #test #flaky · mcp `GET /admin-api/v1/admin-users` returns the WHOLE admin_users table; its `=== 3` test flakes when a SEPARATE process (connector EPIC-047 app-token tests on shared :5433 DB) leaves admin rows. --test-concurrency=1 DOES serialize files (no intra-run overlap; verified by handle-transition probe) → leak is cross-PROCESS. Fix: FK-safe-clear FOREIGN admins in beforeEach (bootstrapAdmin precedent), never weaken to >=3. [BUG-035]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F28: mcp/src/db/migrations/ has TWO 0009_*.sql files (0009_aspiri
<!-- hash:886916 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-04 · #schema #migration #mcp · mcp/src/db/migrations/ has TWO 0009_*.sql files (0009_aspiring_vapor + 0009_sad_mindworm, journal idx 8 & 9) — next migration MUST be 0010_*; never trust `drizzle generate` numbering blind, grep the journal _journal.json tail first. [SPRINT-36 047-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F29: mcp revocation is SPLIT: RevocationStore (auth/revocation.ts
<!-- hash:9e014d -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #auth #redis · mcp revocation is SPLIT: RevocationStore (auth/revocation.ts) writes only `revoked:<jti>` for refresh-token jtis; per-token revoke keys `rev:token:<id>` are written INLINE in admin-api/tokens.ts:181-186, NOT in revocation.ts. A story that says 'extend revocation.ts' for connection/apptoken revoke must add that path — it doesn't exist there yet. [SPRINT-36 047-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F30: broker/package.json ships ONLY `ws` — no redis/http client. 
<!-- hash:e77903 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-04 · #connector #auth #deps · broker/package.json ships ONLY `ws` — no redis/http client. Real-auth M1 adds ioredis ^5.4.0 (match mcp plane; registry 5.11.1) for the PSUBSCRIBE subscriber (047-06); verify-client (047-05) uses Node-24 global fetch + node:crypto, no new dep. [SPRINT-36]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F31: run_script.sh FORWARDS CLEARGATE_STATE_FILE/CLAUDE_PROJECT_D
<!-- hash:89c281 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-04 · #run_script #env · run_script.sh FORWARDS CLEARGATE_STATE_FILE/CLAUDE_PROJECT_DIR/ORCHESTRATOR_PROJECT_DIR to the child (CR-080 F8) — but ONLY if set in the WRAPPER's own env; set them as an inline prefix on the `bash run_script.sh …` call itself, not on a nested command. "wrapper strips env" is a misdiagnosis (verified by reading run_script.sh L44/107). [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F32: Cross-repo sprint (code in a separate gitignored repo): expo
<!-- hash:690706 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #reporting #cross-repo · Cross-repo sprint (code in a separate gitignored repo): export ORCHESTRATOR_PROJECT_DIR or the SubagentStop hook mis-buckets per-agent cost to _off-sprint (ledger ends up ~1 row, unreconcilable); the v2 report hotfix-ledger + flashcard-audit passes also assume same-repo — both need a cross-repo mode. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F33: broker server.ts boots gateway+registry but does NOT attach 
<!-- hash:7a5540 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #e2e · broker server.ts boots gateway+registry but does NOT attach a router — the e2e harness must `createRelay`/`createRouter` over ONE shared MemoryRegistry and pass it + the router into `createGateway`, else prompt/event/cancel/turn_end never relay. [SPRINT-35 046-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F34: broker `router.red` "no-cross-talk" test is intermittently f
<!-- hash:fbe712 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #broker #flaky · broker `router.red` "no-cross-talk" test is intermittently flaky (loopback TCP coalescing race the setImmediate drain-queue mitigates but doesn't fully kill); re-run before treating a single failure as a regression — 31/31 on retry. [SPRINT-35 046-04]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F35: Opaque payload pass-through = forward the SAME decoded Envel
<!-- hash:55e181 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #broker · Opaque payload pass-through = forward the SAME decoded Envelope object to encode() (one JSON.stringify on the whole frame); never touch `.payload` (typed `unknown` in shared/types.ts to block accidental inspection). [SPRINT-35 046-03]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F36: EOF is the SOLE turn terminus: a `result` → turn_result and 
<!-- hash:a800cd -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #normalize · EOF is the SOLE turn terminus: a `result` → turn_result and NEVER closes; emit stream_end only on stdout 'end'. Background tasks emit ≥2 results (fixture 02-background) — closing on the first breaks them. [SPRINT-35 048-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F37: claude tool names arrive already-PascalCase from the assista
<!-- hash:8d5358 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #tool-use · claude tool names arrive already-PascalCase from the assistant record — do NOT apply a case transform (the spike fixture proves it). [SPRINT-35 048-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F38: exactOptionalPropertyTypes=true: never assign `prop: expr|un
<!-- hash:9b5f08 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-04 · #typescript #strict · exactOptionalPropertyTypes=true: never assign `prop: expr|undefined` in an object literal — use conditional spread `...(cond ? {prop:val} : {})`. [SPRINT-35 048-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F39: Node 25: `--input-type=module` is stdin/`--eval`/`--print` o
<!-- hash:a25503 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #node25 #spawn · Node 25: `--input-type=module` is stdin/`--eval`/`--print` only — a file-based ESM spawn target must use a `.mjs` extension (no flag), else ERR_INPUT_TYPE_NOT_ALLOWED crashes the child before it forks. [SPRINT-35 048-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F40: Broker presence uses ONE setInterval sweep over a lastSeen/l
<!-- hash:a05279 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #broker · Broker presence uses ONE setInterval sweep over a lastSeen/listAll() table, never per-socket timers (verify via single-setInterval grep); all credential logic stays in auth-stub.ts (EPIC-047 deletes it wholesale). [SPRINT-35 046-02]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F41: connector broker/daemon test scripts glob both src/** and te
<!-- hash:6a9896 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #connector #test-harness · connector broker/daemon test scripts glob both src/** and test/** for *.node.test.ts — put test files where the package globs, and extend the glob in the SAME commit if you add a new test dir. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F42: Developer makes the FROZEN *.red.node.test.ts pass — do NOT 
<!-- hash:73170e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #tdd #process · Developer makes the FROZEN *.red.node.test.ts pass — do NOT author a parallel duplicate *.node.test.ts for the same scenarios (creates D.5 dedup); harness bugs in red tests route back to QA-Red, never a dev rewrite. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F43: Error subclass carrying `cause`: pass via `super(msg, { caus
<!-- hash:592d44 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #typescript #strict · Error subclass carrying `cause`: pass via `super(msg, { cause })` (ES2022), not a `public readonly cause?` ctor param — `noImplicitOverride` rejects the param-property form (Error.cause is built-in). [SPRINT-35 STORY-046-01]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F44: Cross-repo sprint (code in a separate gitignored repo): QA/D
<!-- hash:8a029e -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #qa #cross-repo · Cross-repo sprint (code in a separate gitignored repo): QA/Dev context packs assume meta-repo paths and are absent — the orchestrator MUST pass the code-repo root + branch + commit SHA + path-prefix mapping explicitly in every dispatch prompt. [SPRINT-35]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F45: A red test that greps for "zero hits" of a token will SELF-H
<!-- hash:bea9ae -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #qa-red #grep · A red test that greps for "zero hits" of a token will SELF-HIT its own assertion-message string literals — always `grep --exclude=<the-red-test-file>` (or scope the grep away from the test file) or it never goes green. [SPRINT-34 CR-075]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F46: cleargate init reads ROOT templates/cleargate-planning (reso
<!-- hash:5e8752 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #npm-publish #payload #init · cleargate init reads ROOT templates/cleargate-planning (resolveDefaultPayloadDir init.ts:140-145 = dist/../templates). dist/templates/ is the DROPPABLE dup, NOT root templates. CR-076 hypothesis was inverted. [SPRINT-34]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F47: `node --test --import tsx/esm` throws ERR_REQUIRE_CYCLE_MODU
<!-- hash:c505bd -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #test-runner #node25 #tsx · `node --test --import tsx/esm` throws ERR_REQUIRE_CYCLE_MODULE on Node ≥25 (stricter ESM/CJS cycle detection); use `--import tsx` (no `/esm`) — functionally identical, tsx auto-detects ESM. [SPRINT-34 CR-082]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F48: A Class-3 close_sprint.mjs gate (e.g. deferred_verification,
<!-- hash:51c0f0 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #close-gate #live-on-merge #backward-compat · A Class-3 close_sprint.mjs gate (e.g. deferred_verification, CR-082) goes LIVE at the SAME sprint's own Gate-4 close — it MUST silent-no-op when zero stories declare the field, else it self-blocks the sprint that shipped it. Mirror Step 2.7/2.8 env seams (CLEARGATE_SKIP_*/CLEARGATE_FORCE_*) and add an explicit none-declared→no-op test. [SPRINT-34 CR-082]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F49: A Class-3 pre-gate check wired into pre_gate_runner.sh (e.g.
<!-- hash:d033ac -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-06-04 · #pre-gate #live-on-merge #qa-red-lint · A Class-3 pre-gate check wired into pre_gate_runner.sh (e.g. qa_red_lint, CR-081) runs against the NEXT story's own *.red tests the moment it merges — it MUST exit 0 on non-applicable files (plain node:test w/ no Pydantic Literal / no queryByText) or it phantom-flags a wiring gap and stalls the serial loop. Add a negative "non-applicable file" scenario. [SPRINT-34 CR-081]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F50: `X=$(grep -c PAT f || echo 0)` DOUBLES to "0\n0" on zero mat
<!-- hash:0a46f6 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-03 · #test-harness #bash · `X=$(grep -c PAT f || echo 0)` DOUBLES to "0\n0" on zero matches (grep -c prints 0 AND exits 1, so `|| echo 0` appends) → `[[ "$X" -eq 0 ]]` throws a syntax error and falls to the FAIL branch. Use `grep -q` (no count capture) or `grep -c … | head -1`. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F51: pre_gate_runner.sh arch-mode (~L205) runs `cd "$WORKTREE" &&
<!-- hash:038335 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-03 · #pre-gate #cwd-leak #worktree · pre_gate_runner.sh arch-mode (~L205) runs `cd "$WORKTREE" && eval typecheck_cmd` UN-subshelled — a typecheck cmd containing `cd cleargate-cli` leaks cwd for the rest of the script, breaking the relative REPORT_FILE ("No such file or directory"). Pass an ABSOLUTE worktree path; prefer `npm --prefix` over `cd` in gate cmds. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F52: Evicting an internal policy from shipped agents: scope the z
<!-- hash:3ad73a -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-03 · #portability #eviction #grep · Evicting an internal policy from shipped agents: scope the zero-match grep to POLICY tokens (node:test|vitest|tsx --test) on the NAMED agents only — a bare repo-path token like `cleargate-cli` legitimately recurs in devops/reporter/wiki agents + runtime-lane heuristics and can never be zeroed. [SPRINT-34 CR-077]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-38-F53: write_dispatch.sh guard FIXED (043-09 re-verify): skip requi
<!-- hash:52d742 -->

**Category:** stale
**Reason:** stale: zero grep hits across last 2 sprint dir(s)
**Original entry:** `2026-06-01 · #dispatch #marker #write_dispatch · write_dispatch.sh guard FIXED (043-09 re-verify): skip requires exact tuple work_item_id==$1 AND agent_type==$2 AND session_id==CLAUDE_SESSION_ID AND writer prefix pre-tool-use-task.sh*; else WRITE. Fails toward writing on jq-fail/malformed/empty/non-auto-writer. Same work_item+agent re-dispatch still de-dups (tuple-keyed ledger attribution preserved). [SPRINT-33 043-09 PASS]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---
