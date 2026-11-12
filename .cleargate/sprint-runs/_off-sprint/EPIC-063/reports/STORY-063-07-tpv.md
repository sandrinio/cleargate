# STORY-063-07 TPV: Clean-room proof of the ingest loop

role: architect · Mode: TPV · red commit 8f5660b on `story/STORY-063-07` (cli main checkout)

**VERDICT: BOUNCE.** QA-Red applies amendments A1–A10. After that, the Developer follows bindings D1–D14 (the tests do not cover these). Orchestrator decisions O1–O4 are at the end.

The red file is wired correctly:
- 59 tests: 55 red, 4 green. Re-run under `tsx --test` with a short TMPDIR.
- All 55 reds fail for the intended reasons: 49× `ERR_MODULE_NOT_FOUND` for `ingest-loop.mjs`/`session.mjs`, the missing `INGEST_LOOP_CHECKS` export, an ENOENT on reading `session.mjs` source, and the baseline-source assertion.
- The src imports resolve: `contradict.ts`, `hook-lines.ts`, `unchecked-drafts.ts`.

The file cannot ship as written because it never builds a stream with two `result` events. Claude Code has run headless Agent dispatches asynchronously since 2.1.283 (FLASHCARD 2026-09-26 `#clean-room #claude-p`, line 359), and the 2.1.322 probe confirms it again. Every positive and negative session will produce two `result` events. Today a parser that keeps the first result, or that resets its state on the second `system/init`, passes all 55 tests and then fails live.

---

## 1. Validation results

### 1.1 Gherkin and requirements coverage: complete, with two gaps fixed below
| Item | Red tests | Status |
|---|---|---|
| S1 positive (directive, dispatch, finding, stamp, brief) | S1 block plus the directive-edge block | covered |
| S2 negative | S2 block (3 tests) | covered |
| S3 shell move | S3 block (5 tests; scans all Bash events) | covered |
| S4 flake rule | S4 block. The finding check may PASS via attempt 2 and its pointer names both attempts; directive, dispatch, stamp and brief failures on attempt 1 stay FAIL. | **pinned** |
| S5 R6 J3/J4 | S5 block (derivations only; seeding is live-only, stated in LIMITS) | covered |
| S6 no-dispatch | S6 block | **pinned** |
| R4 brief line | Mid-line negative only | **gap → A3** |
| R3 "prompts never mention the contradiction check" (SPIDR Rules axis) | none | **gap → A5** |

S6 details: dispatch, stamp and brief are FAIL and each pointer contains the transcript path; there are 9 unique rows; the rendered `\| id \| room \| PASS/FAIL \| pointer \|` row shape is checked; `check` exits 1; a later run wins over an earlier one; a missing row is not ok; usage errors exit 2.

### 1.2 Contract names: implementable
- **No `src/**` import needed.** The C1.1 hash re-implements `locateFrontmatter` (`src/lib/frontmatter-locator.ts:69-121`) in about 40 lines. Page and contradictions parsing is a regex over the shapes `page-schema.ts:49,56` and `contradict.ts:260-261` write. Rendering reuses `oneLine`/`markdownCell` (`evidence.mjs:194-209`).
- **`session.mjs`.** `runClaudeSession({ …, maxTurns = 4, maxBudgetUsd = 1 })` has `.length === 1`. Adding `timeoutMs` inside the same destructured bag keeps that. The only consumer is `claude-baseline.mjs`; the baseline integration test re-implements its own setup and never imports the baseline. No test byte-pins `claude-baseline.mjs`.
- **`INGEST_LOOP_CHECKS`** (nine ids) is a new export. No test pins `evidence.mjs`'s export list. `GATING_CHECKS` (`evidence.mjs:65-79`) stays untouched, and the regression anchor guards it.

**Ruling on QA-Red ambiguity 2: leave `claude-baseline.mjs` without a main guard.** Adding one is out of scope:
- 07 requires the baseline's behaviour to be unchanged (M1 plan `:801`).
- Nothing imports the baseline. `ingest-loop.mjs` imports `session.mjs`, `artifact.mjs`, `evidence.mjs` and `probe-items.mjs`; `artifact.mjs:5-10` was created precisely to avoid importing it.
- A guard would add an untested second entry path with the known `/tmp`→`/private/tmp` realpath hazard (FLASHCARD 2026-09-26 `#codex #test-harness #danger`).
- The spawn-based anchor (`bogus` → exit 2) is the right witness that the module still links after the extraction.

### 1.3 Hash vectors: correct
I re-computed every literal with the real `src/lib/wiki/contradict.ts:72` `contradictContentHash`, read-only, via tsx:
- `df3f9228…e0a7` and `4247dfc6…f0f1` match the 01 test (`test/wiki/contradict-commit.red.node.test.ts:447,451`).
- `964fa138…87cb` (a `---` inside `<instructions>`; carry-forward 8(b)) is correct.
- `5cd2c677…2719` (BOM, then `<instructions>`, then a fenced `---`) is correct.

The parity corpus misses several locator branches:
- a BOM directly before `---`;
- an indented fence opener;
- a long opener that a short fence does not close;
- `--- ` with a trailing space;
- an indented `<instructions>`;
- the three locator throws.

All of these are computed below (A4).

### 1.4 Determinism and tier: OK, with one cleanup issue
- No network or model calls. The spawns use `process.execPath` with `cwd: os.tmpdir()`.
- `npm test` excludes `*.integration.node.test.ts` (`package.json:47`), and the header carries `@cleargate-tier: integration`.
- tsx needs a short TMPDIR (EINVAL on the long scratchpad path; known flashcard).
- **TPV check 4 fails:** `evPath()` and the ledger-helper room create `mkdtemp` directories that are never removed (A9).

### 1.5 Live-run needs: the orchestrator's list is correct, plus four items the plan missed
The orchestrator's list checked against code:
- **PATH.** `installArtifact` already enforces the PATH identity gate (`artifact.mjs:91-101`). Hooks inherit that env, and resolver branch 1 is absent in a room (`session-start.sh:13`, `post-shell-ingest.sh:24`).
- **Ledger location.** Off-sprint ledger rows go to `_off-sprint/token-ledger.jsonl` (`token-ledger.sh:214-219`), and `findLedgerFiles` scans every `sprint-runs/*` directory (`claude-baseline.mjs:116-125`).
- **Dispatch allowed.** `cleargate-wiki-contradict` is on `pre-tool-use-task.sh:84`'s allow-list, and the pending-task sentinel attributes its type off-sprint.
- **Archive directory.** `archive/` exists in a room (the payload ships `.gitkeep`).
- **Back-dating.** It is required: the alarm window is `1 day < age < 7 days` (`unchecked-drafts.ts:54-55`).

Four items the plan does not cover:
- **(i) J4 must run after the model sessions.** A back-dated, unchecked draft is named in *every* SessionStart banner (`session-start.sh:21` → `doctor --session-start`). That would invite the agent to check it, which spends turns and could stamp it, so J4 would then FAIL.
- **(ii) A retry needs a reset.** Attempt 2 repeats the same edit, so it produces the same body hash. Attempt 1's page stamp then matches, `wiki contradict` prints `skipped:` (CLAUDE.md block `:34`), no dispatch happens, and the retry is useless (D4).
- **(iii) A 5-minute timeout is too short.** `SESSION_TIMEOUT_MS = 300_000` (`claude-baseline.mjs:57`) covers a haiku single step. Sonnet plus an async sonnet subagent across two segments needs about 15 minutes (D1/D3).
- **(iv) Markdown-decorated labels.** Models often bold the label (`**Contradictions:** none`). A bare `^Contradictions:` check false-FAILs a correct Brief, and the first-attempt rule gives it no retry (A3).

---

## 2. Rulings on the live-probe consequences

**(a) Brief line reads the LAST `result` event: yes, binding.**
- `result` is the `result` string of the last `type:"result"` event. If that event has no string (error results such as `error_max_turns` carry none), `result` is `null`.
- Never fall back to an earlier, interim result.
- Same semantics as `parseClaudeStream` (`evidence.mjs:349-351`, last write wins), so reuse it.
- Pinned by A1 with a two-result fixture plus three companions: swapped, error-subtype, and no-result.

**(b) Two inits: keep the FIRST init, and never reset accumulators on any init.**
- The real hazard is a parser that treats `system/init` as a session start and clears state. The Edit `hook_response` and the Agent `tool_use` both sit in segment 1, so clearing loses the directive and the dispatch.
- Pinned by A1: segment-1 evidence must survive the second init.
- `toolUses` collects top-level blocks only (`parent_tool_use_id` null or absent). Subagent turns arrive in the main stream tagged with `parent_tool_use_id` and `agent_id` (probe lines 21-22).

**(c) Turns and budget.**
- In the probe the second `result` reports `num_turns: 1` after the first reported 5, so the turn counter appears to reset per segment, while `total_cost_usd` is cumulative (0.046 → 0.051).
- Whether `--max-turns` is enforced per segment or cumulatively is unproven.
- A typical positive session under the CLAUDE.md rule (`:34`) takes about 7–9 turns cumulatively: Read → Edit → Bash `wiki contradict` → Agent → interim reply | Bash `contradict-commit` heredoc → (Read) → Brief. A pessimistic sonnet session takes 11–13.
- A turn-cap hit kills the attempt with no retry for 4 of 5 checks.
- **Decision: `--max-turns 20`, keep `--max-budget-usd 3` as the real cost guard, and use a 900 000 ms session timeout.**
- Extra turns cost nothing unless they are used. Record each result's `subtype`/`num_turns` and the final `total_cost_usd` (D6) so the next release can calibrate. This overrides the owner's recorded "12 turns", so it goes to the orchestrator as O1.

**(d) Seal the probe transcript as a fixture: yes, but a redacted reduction, never verbatim.**
- The raw file carries the local home path (`/Users/<name>/…` in `cwd`, `original_cwd`, `memory_paths`, tool inputs and results, `output_file`), the account's connected claude.ai connectors (`mcp_servers`), the installed plugin list, and an account `rate_limit_event` (plan, overage and credit state).
- cleargate-cli is a public repo. The same applies to the outer copy: keep `.cleargate/sprint-runs/_off-sprint/EPIC-063/evidence/hook-probe-claude-2.1.322.stream.jsonl` uncommitted, or replace it with the redacted copy.
- Recipe in A2.

---

## 3. Amendments to the red test (QA-Red)

**A1. Async two-segment stream (rulings a and b).**

Add an `asyncPositiveTranscript()` builder that emits, in order:
1. `init`, then a SessionStart noise hook;
2. top-level `Read`, then `Edit`;
3. the `PostToolUse:Edit` directive;
4. `Bash` running `cleargate wiki contradict <path>`, then its `PostToolUse:Bash`;
5. `Agent{subagent_type:'cleargate-wiki-contradict'}`, then a `user` tool_result `"Async agent launched successfully…"`;
6. `system/task_started`;
7. a **subagent** `assistant` `tool_use` `Read` carrying `parent_tool_use_id:'toolu_Agent'` and `agent_id`;
8. `SubagentStop` exit 0, then `system/task_notification`;
9. **result 1** with text `"Waiting for the check to finish."`;
10. a **second `init`**;
11. `Bash` running `cleargate wiki contradict-commit <path>`, then its `PostToolUse:Bash`;
12. **result 2** = `BRIEF_OK`.

Assert:
- `parseSessionStream` keeps the `PostToolUse:Edit` hook.
- `toolUses` names deep-equal `['Read','Edit','Bash','Agent','Bash']` (the subagent's Read is excluded).
- `result === BRIEF_OK` and `resultCount === 2`.
- `evaluatePositiveAttempt` on this transcript gives five PASS verdicts.

Three companion cases:
- **Swapped.** Result 1 carries `Contradictions:` and result 2 lacks it → brief FAIL, and the pointer names the last result (e.g. `/result 2 of 2/`).
- **Error result.** Result 1 is a success that carries the line; the last event is `{type:'result',subtype:'error_max_turns',is_error:true}` with no `result` field → brief FAIL, and the pointer matches `/error_max_turns/`.
- **Truncated.** No `result` event at all → brief FAIL, and the pointer matches `/no result/`.

Extend the `Parsed` interface with `resultSubtype: string | null` and `resultCount: number`. `init` must expose at least `claude_code_version` and `model`.

**A2. Seal the redacted 2.1.322 probe.**

Write `test/fixtures/ingest-loop/claude-2.1.322-async-agent-probe.stream.jsonl` from the orchestrator's transcript as follows:
- (i) Drop every `rate_limit_event` line.
- (ii) In both `system/init` events keep only `type, subtype, cwd, session_id, model, permissionMode, claude_code_version, agents, uuid`.
- (iii) In every string, replace the probe-dir prefix with `/room`, the task-output-dir prefix with `/room-tasks`, and any remaining `/Users/<name>` with `/home/user`.
- (iv) Keep every other event and field byte-for-byte, including `hook_started`, both results, `task_*` and the subagent's `parent_tool_use_id` events.

New describe block "recorded claude 2.1.322 probe":
- **Redaction guard.** The fixture text contains none of `/Users/`, `claude-501`, `"mcp_servers"`, `"plugins"`, `rate_limit_event`.
- **Hooks.** `hooks.map(h=>h.hook_name)` deep-equals `['PostToolUse:Edit','PostToolUse:Bash','SubagentStop']`, so `hook_started` is excluded, and all have `exit_code 0`.
- **Directive payload.** `JSON.parse(hooks[0].output).hookSpecificOutput.additionalContext === 'PROBE-EDIT-CTX'`.
- **Tool uses.** `toolUses` names are `['Read','Edit','Bash','Agent']`.
- **Last result wins.** `result === 'DONE\n\nAdditional context from hooks:\n- PROBE-EDIT-CTX\n- PROBE-BASH-CTX'` and `resultCount === 2`. The interim `"I've started…"` must not win.
- **Init.** `init.claude_code_version === '2.1.322'`.
- **Dispatch on the real shape.** With every `general-purpose` replaced by `cleargate-wiki-contradict` and `ledgerRows:[{agent_type:'cleargate-wiki-contradict'}]` → PASS. This proves dispatch against the real SubagentStop shape, which has no agent-type field. Unmodified → FAIL.
- **Brief.** Brief FAIL on the fixture.

The header records provenance (source path, version, model, redaction rules).

**A3. Brief-line label decoration (R4 false-FAIL guard).**
- Positives (PASS): `**Contradictions:** none`, `**Contradictions**: none`, `- Contradictions: 1 — EPIC-002 vs EPIC-001 · cache`, `1. Contradictions: none`, `  Contradictions: none`.
- Negatives (FAIL), alongside the existing mid-line case: `No Contradictions: found` and the table row `| Contradictions | none |`.
- The binding regex for the Developer is `/^[ \t]*(?:(?:[-*+]|\d+[.)])[ \t]+|>[ \t]*|#{1,6}[ \t]+)?(?:\*\*|__|\*|_)?Contradictions(?:\*\*|__|\*|_)?[ \t]*:/m`, applied to the last result's text.

**A4. Hash parity completeness (carry-forward 8(b)).**

Add these to the parity corpus. Each was compared against the real `srcHash`:
- `'﻿---\na: 1\n---\nbody\n'` (`3e8fd58d…`);
- `'   ```\n---\n   ```\n---\na: 1\n---\nb\n'`;
- ``'````\n```\n---\n````\n---\na: 1\n---\nb\n'``;
- `'--- \n---\na: 1\n---\nb\n'`;
- `' <instructions>\n---\na: 1\n---\nb\n'`.

The last four hash to `e6ed5f20…`.

Throw parity: `'<instructions>\n---\na: 1\n---\n'`, `'```\n---\na: 1\n---\n'`, `'---\na: 1\n'` and `'x\n---'`. For each, `assert.throws` on both `srcHash` and the driver's hash.

Plus: `deriveStamp({rawDraft:'<instructions>\n---\n', pageText})` returns FAIL with a pointer matching `/frontmatter/` and never throws.

**A5. R3 rule, prompts and seed constants.** New exports from `ingest-loop.mjs`:
- `buildPrompts({positivePath, negativePath, movePath})` returns `{positive, negative, shell}`;
- `SEED_EDITS = {positive:{from,to}, negative:{from,to}}`;
- `SEED_SLUGS = {neighbour, positive, negative, silentDrop}`;
- `SESSION_DEFAULTS = {model, maxTurns, maxBudgetUsd, timeoutMs}`.

Assert:
- No prompt and no slug matches `/contradict/i`.
- `positive` contains `positivePath`, `SEED_EDITS.positive.from`/`.to`, `Edit tool once` and `render this item's Brief as CLAUDE.md describes` (story §3.2(4) wording). Same for `negative`.
- `shell` contains `` `git mv ${movePath} .cleargate/delivery/archive/` `` and does not match `/\bcommit\b/i` (03 carry).
- `from !== to` for both edits.
- Every file under `scripts/clean-room/fixtures/ingest-loop/` exists (the directory is non-empty) and matches no `/contradict/i`.
- `SESSION_DEFAULTS` deep-equals `{model:'claude-sonnet-5-5', maxTurns:<O1 value; Architect: 20>, maxBudgetUsd:3, timeoutMs:900000}`.

**A6. Missing `contradictions.md`.**
- `deriveFinding({contradictionsBefore:'', contradictionsAfter:CONTRA_WITH(POS,NEIGHBOUR), neighborId})` → PASS.
- `deriveNegative({...negCtx(), contradictionsBefore:'', contradictionsAfter:''})` → PASS.

The driver reads an absent file as `''`.

**A7. Retry reset (D4).** New export `resetRoomForRetry({room})`.

Set up a temp git repo, using `git -c user.name=t -c user.email=t@t` for commits, with these committed:
- `.cleargate/delivery/pending-sync/EPIC-002_x.md`;
- `.cleargate/wiki/epics/EPIC-002.md`;
- `.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl`.

Then:
1. Modify all three.
2. Add an untracked `.cleargate/wiki/new.md`.
3. Call `resetRoomForRetry`.

Assert: the draft and the page are byte-equal to HEAD, `new.md` is gone, and the ledger keeps its modification. The ledger is append-only; it is diffed per attempt and never reset.

**A8. J1 for the driver.** Source-scan `ingest-loop.mjs`: no `from '…/src/…'`, no `import('…/src/…')`, and no `…/dist/…` import. Same regex style as the `session.mjs` test.

**A9. Cleanup.** Every `mkdtemp` (`evPath()`, the ledger room, A7's repo) is removed with `t.after(() => fs.rmSync(dir, {recursive:true, force:true}))`.

**A10. Header and LIMITS.**
- Replace the "extrapolated hook_name" limit. The hook names and the async two-result stream are now pinned from the redacted claude 2.1.322 probe fixture.
- Add a limit: only the constants are pinned for turns, budget and timeout; whether a live sonnet session fits them is proven only by `run`.
- Cite FLASHCARD 2026-09-26 `#clean-room #claude-p` for the async behaviour.

---

## 4. Binding Developer instructions (not test-covered)

**D1. `session.mjs` extraction.**
- Move `findLedgerFiles`, `snapshotLedgers`, `diffLedgerRows` (`claude-baseline.mjs:116-150`) and `runClaudeSession` (`:229-262`) verbatim.
- New signature: `runClaudeSession({ room, env, model, prompt, transcriptPath, maxTurns = 4, maxBudgetUsd = 1, timeoutMs = 300_000 })`. Use `String(maxTurns)` and `String(maxBudgetUsd)` in argv.
- The baseline call sites pass no new arguments, so its argv and timeout stay byte-identical. Delete the baseline's `SESSION_TIMEOUT_MS` if it is unused after the move.
- Do not add a main guard to the baseline (ruling §1.2).
- Do not move or copy `scrubbedEnv`; `ingest-loop.mjs` uses `artifact.mjs:27`'s version through `installArtifact`.

**D2. `ingest-loop.mjs` shape.**
- Plain Node ESM. It imports only `node:*`, `./session.mjs`, `./artifact.mjs`, `./evidence.mjs` and `./probe-items.mjs`.
- The main guard copies `isMainModule()` from `codex-loop.mjs:1088-1095` (realpath on both sides; `argv[1]` may be undefined).
- `parseSessionStream`:
  - collects `hook_response` only;
  - keeps the first init;
  - takes the last result, with no fallback;
  - collects top-level `toolUses` only;
  - skips non-JSON lines.
- Wrapping `parseClaudeStream` (`evidence.mjs:311-357`) is preferred.
- SubagentStop condition: at least one event, and every one exits 0 (parity with `evidence.mjs:400-405`).

**D3. `run` sequence (order is binding).**
1. Check that `claude`, `jq`, `git`, `npm` and `tar` are on PATH; exit 2 if any is missing. Run `validateContainer` (`evidence.mjs:645`); exit 2 on refusal. The default container comes from the baseline formula (`claude-baseline.mjs:459-462`) with suffix `-ingest`.
2. Run `packArtifact({cliRoot, ref, container})` and `installArtifact({container, tarball})` → `env`. The identity gate runs inside `installArtifact`.
3. Create the room at `<C>/repo-ingest`: `git init -q`, then `cleargate init --yes`.
4. Seed three epics (neighbour, positive, negative) with `cleargate new epic <SEED_SLUGS.*>`:
   - Apply `authorProbeEpic`, then the `fixtures/ingest-loop/` substitutions. Substitute section text; never replace a whole body (M1 plan `:818`).
   - The positive and negative drafts cite `[[<neighbour id read from the scaffold filename>]]`.
   - Each `SEED_EDITS.*.from` must occur exactly once in its file, below the frontmatter. The Edit tool rejects a non-unique `old_string`.
   - The edit must neither remove nor introduce the contradiction.
   - Then run `cleargate gate check` on each seed.
   - Any violation of these rules, or any `gate=1`, → exit 2 (refusal).
5. Run `cleargate wiki build`. Then `git add -A` and `git -c user.name=cleargate-cleanroom -c user.email=cleanroom@example.invalid commit -qm seed` (G12; a fresh machine has no git identity).
6. Seed the shell snapshot: `bash <room>/.claude/hooks/post-shell-ingest.sh`, with stdin `{}`, `cwd: room` and `env + {CLAUDE_PROJECT_DIR: room}` (`scrubbedEnv` strips `CLAUDE*`).
7. Positive attempt 1:
   - Before the session, snapshot the ledgers and read `contradictions.md` (absent → `''`).
   - Run `runClaudeSession` with the `SESSION_DEFAULTS` values (`--model` overrides only `model`).
   - **Immediately after**, read the raw draft, its page, `contradictions.md` and the ledger diff, then call `evaluatePositiveAttempt`.
8. If and only if attempt 1's finding FAILed: run `resetRoomForRetry` (D4), re-seed the snapshot (step 6), and run attempt 2 the same way as step 7.
9. Negative session (prompt b), captured the same way, then `evaluateNegativeSession`.
10. Shell session (prompt c), then read the page, then `deriveShellIngest`.
11. **J3 (after all sessions):**
    - Run `cleargate new sprint <slug>`.
    - Write `.cleargate/sprint-runs/<sprint-id>/<sprint-id>_REPORT.md` from the fixtures.
    - Run `cleargate wiki build`.
    - `deriveReportKept` on `wiki/sprints/<sprint-id>.md`.
12. **J4 (after all sessions; §1.5 (i)):**
    - Run `cleargate new epic <SEED_SLUGS.silentDrop>`.
    - Rewrite its `updated_at:` value to now−48 h in the template's quoted ISO form (`templates/epic.md:54`).
    - Do not ingest it and do not run contradict on it.
    - Run `bash <room>/.claude/hooks/session-start.sh` with `cwd: room`, `env + {CLAUDE_PROJECT_DIR: room, CLEARGATE_NO_UPDATE_CHECK: '1'}` and input `''`.
    - `deriveSilentDropAlarm` on its stdout.
13. Run `buildEvidenceRows`, then `renderIngestRunSection`, then append to the evidence file. Exit 0 iff all nine rows PASS, else 1.

**D4. `resetRoomForRetry({room})`.**
- Run `git -C room checkout HEAD -- .cleargate/delivery .cleargate/wiki`, then `git -C room clean -fdq -- .cleargate/delivery .cleargate/wiki`.
- Never touch `.cleargate/sprint-runs/`.
- Reason: without the page reset, attempt 2's identical edit reproduces attempt 1's stamped hash, so the check is `skipped:`.

**D5. Session errors.**
- `runClaudeSession` throws on timeout or spawn error (`claude-baseline.mjs:258-260`). Catch it and keep the partial transcript.
- Every row that depends on that session is FAIL, with pointer `<transcript> — session error: <message>`.
- Continue to the next step and exit 1.
- Once the room exists, never exit without writing evidence.

**D6. Evidence content.**
- Run-level metadata lines, each through `oneLine`: `cli_sha`, `artifact_inputs`, tarball `sha256`, `claude --version`, model, container, room.
- Per session: transcript path, `init.model`, each result's `subtype` and `num_turns`, and the final `total_cost_usd`.
- Every pointer **starts** with the transcript path, because `markdownCell` truncates at 300 characters (`evidence.mjs:203-209`).
- A brief-line FAIL pointer states which result (if any) carried the label.
- The finding pointer cites both attempts' transcripts.

**D7. `check` is evidence-only.** No git, no room, no network, no staleness gate (see O4). Exit 2 on usage error, 1 when not ok, 0 when ok.

**D8. Evidence path.**
- The default is `<C>/evidence/ingest-loop-evidence.md`.
- §R step 6 passes `--evidence /Users/…/ClearGate/.cleargate/sprint-runs/_off-sprint/EPIC-063/evidence/ingest-loop-evidence.md` (procedure doc §6 convention).
- Raw transcripts stay in `<C>/evidence/` and are never committed verbatim to either repo (§2 d).

**D9. Procedure doc.**
- Add `### 5.1 Ingest loop (STORY-063-07)` at the end of §5, before `## 6` (`clean-room-verification.md:237`), so nothing renumbers.
- Content: the sequence above, the nine ids, the flake rule, the async two-result note, and the J4-after-sessions rule.
- Separate outer-repo commit, staged by explicit path only (never `.cleargate/wiki/**`; BUG-086 rule).

**D10. Never run `npm run build`/tsup in the checkout.** `packArtifact` builds in `<C>/src` (`artifact.mjs:51-67`), which is allowed.

**D11. One live dry run (story Task Breakdown row 6; subject to O3).**
- After the tests are green: `node scripts/clean-room/ingest-loop.mjs run --ref story/STORY-063-07 --container <abs path outside the repo>`.
- Report each segment's `num_turns`, the cost and the nine verdicts in the dev report.
- This evidence is not committed. The release evidence is §R step 6.

**D12. `claude-baseline.mjs` diff scope.** The only changes are:
- the `./session.mjs` import;
- deletion of the four moved functions;
- deletion of `SESSION_TIMEOUT_MS` (only if unused).

`DEFAULT_MODEL` stays (anchor).

**D13. Fixture texts are blunt.**
- The neighbour carries "The cache MUST be Redis; an in-process cache is forbidden."
- The positive draft says "Replace the Redis cache with an in-process Map."
- The negative draft keeps Redis.
- No fixture says "contradict" (A5).

**D14. Live-run expectation.** `.mcp.json` runs `npx -y cleargate@<pin>`, and 0.29.0 is unpublished, so MCP connect fails. This is non-blocking, and no ingest check reads `mcp_servers`.

---

## 5. Open decisions for orchestrator
- **O1.** `--max-turns 20`, with `--max-budget-usd 3` kept and a 900 s session timeout. This overrides the owner's recorded 12 turns (story §1.4). Architect decision: 20, for the reasons in §2(c). The owner delegated these decisions; record it in the M1 orchestrator decisions and pin it in A5.
- **O2.** R6's sentence "they also run in `check`-only re-runs" contradicts the pinned `check`, which is evidence-only (S6 exit-0 case, no room). Default: `check` stays evidence-only. R6 rows come from `run`; no extra mode is added in 07.
- **O3.** Developer live dry run (D11), about $3–9 per run. Default: yes, once. Async sonnet behaviour under the real CLAUDE.md rule is unproven; the probe used haiku and a generic agent.
- **O4.** Unlike the baseline's `checkEvidence` (`evidence.mjs:579-609`), ingest `check` has no `artifact_inputs` staleness gate, and story §3.3 gives it no `--ref`. Default: record `artifact_inputs` (D6) and do not gate on it in 07. File a follow-up if the release gate should refuse stale evidence.

## Script Incidents
None. No `.cleargate/scripts` were invoked. I ran the red file and the hash vectors read-only via `tsx` with TMPDIR set to `/tmp/tpv7` (since removed). The cli checkout is unmodified.

flashcards_flagged:
- `2026-11-12 · #clean-room #alarm · A 1–7-day-old unchecked draft is named in every SessionStart banner; seed it after model sessions.`
- `2026-11-12 · #clean-room #contradict · Retrying a contradict session: reset raw AND page; same edit → same hash → Phase 4 skips, no directive.`
- `2026-11-12 · #privacy #fixtures · Raw claude -p transcripts hold home paths, connectors, rate-limit info; seal only a redacted cut.`
- `2026-11-12 · #clean-room #brief · Models bold labels (**Contradictions:**); a bare ^Contradictions: check false-FAILs a real Brief.`
