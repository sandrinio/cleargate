role: qa

# BUG-101 QA-Verify report (SPRINT-41 M7)

```
STORY: BUG-101
QA: PASS
TYPECHECK: pass
TESTS: 41 passed, 0 failed, 0 skipped (targeted files run solo; harness lane relied on INTEGRATE's fresh run, see §Harness lane)
ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none
VERDICT: ship it — the codex branch matches every pinned rule (source order task_name -> marker -> message -> none, mv-claim, 10-min/agent_type-equal marker window, never session_id, single-marker consumption, bash 3.2 compatible), the Claude path is byte-diff-verified unchanged, the generated .codex hook is byte-identical to canonical, SKILL.md R4/R5 match Test 31 verbatim, and scope is exactly the 8 files the brief names. No further action needed from QA; RS-M7a live re-sync is a DevOps/boundary step, not a QA item.
flashcards_flagged: []
```

## Preflight

- Read `sprint-context.md` (Sprint Goal, Cross-Cutting Rules 9-21, Mid-Sprint Amendments through the 2026-09-27 M7 entries).
- Read `BUG-101_codex_dispatch_attribution_encrypted_spawn_message.md` (§1, §5 Gherkin, Task Breakdown — all 3 rows unticked in the bug file itself; the Developer's report explains this is a cli-only item with a detached outer host, so ticking belongs to the orchestrator at merge, per flashcard `2026-09-27 · #worktree #task-breakdown`).
- Read `plans/M7.md` §1 errata E1/E3/E4/E15, §2 (collision matrix — BUG-101 sole owner of the sentinel hook and `build-codex-payload.mjs` R4/R5 "by fold", OD-M7-3), §3 BUG-101 blueprint, and the TPV101-A1..A4 amendments (offset ~1022-1039).
- Read all BUG-101 reports in `reports/`: `BUG-101-tpv.md` (TPV REJECTED, test-only re-seal, mutant table 22/37 → 36/37), `BUG-101-qa-red-reseal.md` (re-seal applied at `d07d4a0`, 5 red + 1 green), `BUG-101-dev.md` (fix at `26bdf84`, 485/485 including witnesses), `BUG-101-integrate.md` (merge at `94fa6e6` onto cli main `0e5b0ac`; test 46 1/1; scripted codex-loop 2/2; all 6 scripted dispatches show `source=message`).
- `command grep` FLASHCARD.md for `#codex #dispatch #markers #hooks #qa`: confirmed the pinned rules (task_name carries the id; never match markers on `session_id`; `.codex/hooks/*.sh` are generated copies — fix the Claude file's codex branch; `ls -t` with empty operand lists cwd; multi-marker fixtures need aged mtimes) all match what's implemented.

## Tree under test

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-101/cleargate-cli`
- HEAD `94fa6e663b7711391e30755a2d8499727cb8bc2c` on `story/BUG-101`, `git status --porcelain` empty before and after every check.
- Log: `94fa6e6` (integrate merge of cli main `0e5b0ac`) → `26bdf84` (fix) → `d07d4a0` (QA-Red re-seal) → `59da770` (QA-Red seal) → `0e5b0ac` (main, STORY-058-13 merge).

## Tests (solo `npm run test:file`, counts via `ℹ tests|pass|fail|skipped`)

| # | Command | Result |
|---|---|---|
| 1 | `npm run typecheck` | exit 0, clean |
| 2 | `codex-dispatch-attribution.red` | **6/6** — T1, T2, T3, T4, T5, T6 all pass |
| 3 | `codex-sprint-execution-render.red` | **3/3** — Test 31 (R1-R5 deterministic, banned-token drop), Test 32 (anchor errors), Test 33 (planCodexPayload + `--check`) |
| 4 | `hooks-claude-parity.red.integration` | **19/19** — all 9 hooks byte/behavior-identical to the frozen pre-058-11 fixture, both env variants (Test 12 + Test 13) |
| 5 | `pending-task-sentinel-cards.red` | **13/13** |
| 6 | `node scripts/build-codex-payload.mjs --check` | exit 0 |

Total run by QA today: 41 tests / 41 pass / 0 fail / 0 skipped, across 4 files, plus one clean `--check` and one clean typecheck. This exactly matches the counts the Developer's and INTEGRATE reports recorded for these same files, re-derived independently rather than trusted.

**Harness lane (test 46 + scripted codex-loop).** Per the dispatch's own guidance ("You may rely on INTEGRATE's harness results ... unless a spot check disagrees"), I relied on `BUG-101-integrate.md` §5 rather than re-running the harness lane myself (Cross-Cutting Rule 20 caps it at one machine-wide run; INTEGRATE already consumed it with a fresh result on the exact merged tree `94fa6e6` under review):
- Test 46 (`codex-hooks.red.integration`, `CLEARGATE_CODEX_BIN=<pinned>`) — **1/1 PASS**.
- Scripted codex-loop (`codex-loop.red.integration`) — **2/2 PASS** (Part A install/verify-install; Part B full loop, `result PASS`, `loop_transport PASS`, `enforcement_parity PASS`, pinned codex sha256 matched).
- All 6 scripted dispatches in that run show `source=message` on their sentinel lines (expected pre-BUG-106: scripted `task_name`s are bare role names with no id, and no `.dispatch-*.json` marker exists in the scripted loop's room) — consistent with TPV101's "pre-BUG-106 expected behaviour" note and not a regression.

No spot-check disagreement found in my own code read (below), so no re-run was warranted.

## Gherkin trace (BUG-101 §5)

| Scenario | Test(s) | Code lines (canonical `pending-task-sentinel.sh`, codex branch) |
|---|---|---|
| "The work item comes from task_name" | T1 (+ sub-cases B/C in the re-seal: outranks a newer same-type marker and a plaintext message; case-insensitive `sprint` prefix) | `TASK_NAME=...task_name`; the `grep -oiE '(^\|[_/-])(story\|epic\|cr\|bug\|proposal\|sprint)...'` regex; `sed`+`tr` normalisation; sets `WORK_ITEM_SOURCE="task_name"`; calls `claim_dispatch_marker "${TASK_ID}"` to consume exactly its own marker |
| "The work item comes from the orchestrator's dispatch marker" | T2 (+ sub-case B: newest same-type wins, ignores `session_id`, skips other types, beats the message) | `claim_dispatch_marker()` — `find ... -mmin -10`, empty-list guard, `ls -t` newest-first, `agent_type` equality with `continue` (never a stop) on mismatch, `mv` claim, then read, then `rm -f`; `session_id` is never referenced anywhere in the function |
| "A plaintext message still attributes (scripted provider)" | T3 (stale/wrong-type marker falls through), T4 (plaintext message, no marker) | the existing `PROMPT` regex, now gated by `if [[ -z "${WORK_ITEM_ID}" ]]`; sets `WORK_ITEM_SOURCE="message"` only on a hit |
| "The Claude hook is unchanged" | T6 (already-green anchor) + `hooks-claude-parity.red.integration` 19/19 | the `HOST == codex` gate excludes Claude from the entire new block; the Claude jq object and printf (no `source=` field) are byte-unchanged, confirmed by direct diff below |

M7 plan rules and TPV101-A1..A4 (source order, 10-minute/`agent_type` window, never `session_id`, single-marker consumption, no unplanned deletions, bash 3.2 compatibility, wiring via in-place spawn beside real `lib/harness.sh`) are all covered per the TPV's own conformance table (36/37 mutants killed, survivor is the non-atomic-claim case which no serial test can observe) — re-verified today by running the actual sealed+implemented tests myself rather than trusting the report.

No scenario is missing a test.

## Code read (codex branch of the canonical hook)

Read `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` lines ~321-470 in `<cw>` directly (not the cli-main-cited line numbers) and confirmed every pinned behaviour:

- **Source order:** `task_name` → marker → message → none, exactly as coded (`if -n TASK_ID ... else claim_dispatch_marker "" ... fi`, then `if -z WORK_ITEM_ID` for the message fallback).
- **`task_name` regex/normalisation:** `grep -oiE '(^|[_/-])(story|epic|cr|bug|proposal|sprint)[-_]?[0-9]+([-_][0-9]+)?' | head -1 | sed -E 's#^[_/-]##' | tr 'a-z_' 'A-Z-'` (explicit letter-list `tr`, bash-3.2-safe).
- **Marker candidates:** `find "$SPRINT_DIR" -maxdepth 1 -type f -name '.dispatch-*.json' -mmin -10`; empty-list guard (`[[ "${#cands[@]}" -gt 0 ]] || return 1`) before `ls -t "${cands[@]}"`; newest-first traversal.
- **Same `agent_type` only, skip others:** `[[ "${at}" == "${AGENT_TYPE}" ]] || continue` — a `continue`, never a `break`/stop.
- **Claim by `mv`, then read, then `rm -f`:** `claimed="${m}.claimed.$$"; mv "${m}" "${claimed}" ... ; wi=$(jq ... "${claimed}"); rm -f "${claimed}"` — exact order.
- **Never reads `session_id`:** grepped the whole function body; `session_id`/`SESSION_ID` does not appear anywhere in `claim_dispatch_marker` or the calling block.
- **On a `task_name` hit, consumes exactly its own marker:** `claim_dispatch_marker "${TASK_ID}"` is called with `want="${TASK_ID}"`, and inside the function `want` also gates on `agent_type` (checked before `want`), so only a `{TASK_ID, AGENT_TYPE}` marker is ever claimed; result is discarded (`> /dev/null || true`) — matches TPV101-A2's binding ruling, verified green by T1-B.
- **No other deletions:** the codex block's only filesystem mutations are the two `mv`/`rm -f` pairs inside `claim_dispatch_marker`; nothing else in the diff touches `.dispatch-*` files. Matches TPV101-A3.
- **bash 3.2 compatibility:** no `mapfile`, no associative arrays; `local cands=()` with count-guard before array expansion; `while IFS= read -r m || [[ -n "${m}" ]]; do ... done < <(...)` idiom used for both the candidate-collection loop and the claim loop.
- **`source=` field:** appended only to the codex printf (`... turn=%s source=%s\n' ... "${WORK_ITEM_SOURCE}"`); the codex sentinel JSON (`jq -cn`) does not gain a `source` key — only the log line does, matching the pinned rule ("`source=` on the codex printf only", not the JSON shape).

## Claude path unchanged

`git -C <cw> diff f0c33f7 94fa6e6 -- scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` (full diff read in the response above): every added/changed line sits either (a) inside the new `if [[ "${HOST}" == "codex" ]]` block, which the Claude path never enters, or (b) inside the codex-only branch of the sentinel-write `if/else` (the codex jq object and codex printf). The Claude `else` branch's jq object (`{agent_type, work_item_id, turn_index, started_at}`, no `source`) and printf (`wrote sentinel sprint=... turn=%s\n`, no `source=`) are byte-for-byte identical to the pre-fix file — confirmed by direct read of both sides of the diff, not inferred. The one structural change on the shared code path — wrapping the message-regex extraction in `if [[ -z "${WORK_ITEM_ID}" ]]` — is behaviorally a no-op for Claude, since `WORK_ITEM_ID` is unconditionally initialized to `""` before the codex-only block runs, so Claude always enters that branch exactly as it did before. `hooks-claude-parity.red.integration` (19/19, all 9 hooks, both env variants) is the regression witness and it is green.

## Generated files

- `cmp scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh` → **identical**, mode **0755** on the codex copy.
- `scaffold/core/.agents/skills/sprint-execution/SKILL.md`: R4 row = `**Per-dispatch gate.** On this host the gate is checked at every role dispatch, inside a story too: when a role's report flags a card, process it (approve or reject as above, then write its marker) before the next role dispatch. It is never relocated and never suppressed: do not set \`SKIP_FLASHCARD_GATE\` during a sprint (\`dispatch-serial.md\` §4).` — verbatim with M7 §3's pinned text and Test 31. R5 spawn row and `write_dispatch.sh` row both grepped and verbatim with the plan (`task_name` = work-item id + role; `write_dispatch.sh` framed as the optional fallback the hook also reads since it "cannot read `message`").
- `node scripts/build-codex-payload.mjs --check` → exit 0 (confirms no drift between canonical and generated on disk).

## Scope

`git -C <cw> diff --stat 0e5b0ac 94fa6e6` — exactly 8 files, matching the brief's declared surface plus tests and CHANGELOG:
```
CHANGELOG.md
scaffold/core/.agents/skills/sprint-execution/SKILL.md          (generated)
scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh    (canonical, codex branch only)
scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh      (generated)
scripts/build-codex-payload.mjs                                 (R4/R5 only)
test/helpers/init-fixture.ts                                    (+6, one refusal row)
test/hooks/codex-dispatch-attribution.red.node.test.ts          (new, 399 lines)
test/scripts/codex-sprint-execution-render.red.node.test.ts     (+4/-... pin update)
```
Nothing under `src/`, `scripts/clean-room/**`, `token-ledger.sh`, or `init-fixture.ts` beyond the one declared row. `token-ledger.sh` was grepped and confirmed untouched (it already reads `work_item_id` off the claimed sentinel, per the plan's "Do not touch" list).

## DoD

- CHANGELOG `### Fixed` entry present (`grep -n -i "BUG-101" CHANGELOG.md` → line 55, full paragraph read and matches the fix as implemented).
- RS-M7a (live re-sync of `/.claude/hooks/pending-task-sentinel.sh`) is a post-merge boundary step per `waves.json`'s `"boundary_after":["BD","RS-M7a"]` row for BUG-101 — noted here, not a QA action item.
- Task Breakdown: all 3 rows unticked in the bug file itself. This is by design for this item (cli-only, detached outer host — the Developer cannot tick the outer bug file from inside `<cw>`, and the dispatch forbids touching the outer main checkout beyond this report). Advisory per EPIC-054 WS7: the orchestrator is expected to tick these at merge from the Developer's/INTEGRATE's own row-by-row account (`BUG-101-dev.md` §Task Breakdown, `BUG-101-integrate.md` implicitly covering row 3's harness-lane half). Not a bounce reason.

## Never-list compliance

No file edited, staged, or committed by QA. No live codex binary invoked (relied on INTEGRATE's already-run harness results per the dispatch's explicit permission). No `--provider live`, no `--trust human`. `~/.codex`, `CODEX_HOME`, and auth files were never touched; `codex login status` was never run. No build was run in the cli main checkout — only reads (`git diff`/`git log`/`git status`) against it; all test/typecheck/`--check` execution happened inside `<cw>`, which already had a working `dist`/`node_modules` (no build needed for these checks). `<cw>` and the outer worktree `git status --porcelain` were empty before and after every command I ran.

## Script Incidents

None. No script was invoked via `run_script.sh` — only `git`, `npm run typecheck`, `npm run test:file`, `node scripts/build-codex-payload.mjs --check`, `cmp`, `stat`, and `grep`, all run directly per the dispatch's own Verify step list (none of which route through the wrapper).

flashcards_flagged: []
