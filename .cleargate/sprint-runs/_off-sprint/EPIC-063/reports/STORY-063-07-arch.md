# STORY-063-07 Architect post-flight: Clean-room proof of the ingest loop

role: architect · Mode: Post-Flight · `story/STORY-063-07` (cli main checkout): red 8f5660b, amend dc82e51, dev 1c5bb1c · outer doc `.cleargate/knowledge/clean-room-verification.md` §5.1 (uncommitted)

**VERDICT: FAIL.** One binding deviation (D5) lets the release gate pass on stale evidence. The fix is small (F1 below). Everything else meets D1–D14, A1–A10 and decision 17. The outer doc needs four factual corrections before its commit (F2).

## What I verified (read-only)

- **Tests.** `clean-room-ingest-loop.red.integration.node.test.ts` passes 100/100. `clean-room-claude-baseline.red.integration.node.test.ts` passes 13/13. Both ran under `tsx --test` with `TMPDIR=/tmp/a7`, which I removed afterwards.
- **Test file untouched by the Developer.** The dev commit `dc82e51..1c5bb1c` doesn't touch the test file.
- **`dist/` untouched.** `dist/cli.js` mtime is still 2026-11-10, so D10 held.
- **Live transcripts read with `jq`.** `/Users/ssuladze/Documents/Dev/cg-cleanroom-d7-ingest/evidence/ingest.{positive-1,negative,shell}.stream.jsonl`. The model wrote **`**Contradictions:**`** in both Briefs. Without the A3 regex, a bare `^Contradictions:` check would have false-FAILed both.

### 1. `session.mjs` extraction (D1, D12): PASS
- `session.mjs:16-85` holds `findLedgerFiles`, `snapshotLedgers`, `diffLedgerRows` and `runClaudeSession`, moved verbatim. The defaults are `maxTurns = 4, maxBudgetUsd = 1, timeoutMs = 300_000`. The argv uses `String(maxTurns)`/`String(maxBudgetUsd)`, which gives `'4'`/`'1'`, byte-identical to the old literals. `timeout: timeoutMs` replaces `SESSION_TIMEOUT_MS`.
- `claude-baseline.mjs` diff:
  - adds the import (`:44`);
  - deletes the four functions and `SESSION_TIMEOUT_MS`;
  - nothing else changes.
- `DEFAULT_MODEL` (haiku) stays at `:57`. The three call sites (`:258`, `:270`, `:294`) pass no new arguments. No main guard was added.

### 2. Run sequence (D3, D4): PASS, except the refusal paths (F1)
`ingest-loop.mjs` runs the steps in this order:
1. Tool precheck: `claude jq git npm tar`, exit 2 if any is missing (`:681-686`).
2. `validateContainer` (`:691-695`). The default container is `CLI_ROOT/../../cg-cleanroom-<stamp>-ingest`, the baseline formula `:391` with the `-ingest` suffix.
3. Pack and install, then `git init` and `cleargate init --yes` (`:720-734`).
4. Seed (`seedRoom` `:601-638`):
   - `cleargate new epic` ×3, then `authorProbeEpic`, then single-occurrence anchor substitutions. These substitute section text and never replace a body.
   - Edit-text uniqueness below the frontmatter, plus a guard that the edit text doesn't touch the cache claim.
   - `gate check` on each seed (exit/❌/⚠/`passed` heuristic matches `gate.ts:308-319`), then `wiki build`.
   - `git -c user.name=… -c user.email=… add -A && commit` (G12).
5. `post-shell-ingest.sh` with stdin `{}`, `cwd: room` and `CLAUDE_PROJECT_DIR` (`:641-648`).
6. Positive attempt 1. If and only if its finding is not PASS: `resetRoomForRetry` (`git checkout HEAD --` and `git clean -fdq --` on `.cleargate/delivery` and `.cleargate/wiki` only, `:545-552`), re-seed the snapshot, then attempt 2 (`:807-816`).
7. Negative session, then the shell session. The shell prompt has no "commit".
8. J3: `new sprint`, write the report, `wiki build`. Then J4: `new epic`, `updated_at` rewritten to now−48 h in quoted ISO form, with an exactly-one-line guard; then `session-start.sh` with `CLAUDE_PROJECT_DIR` and `CLEARGATE_NO_UPDATE_CHECK=1` and input `''` (`:852-877`). J3's `wiki build` runs before J4 creates its draft, so the stale draft is never ingested.

Session errors (D5) follow the rule:
- A throw from `runClaudeSession` becomes `error`, and the partial transcript is kept (`:761-785`).
- Every dependent verdict becomes `<transcript> — session error: …` (`:787-792`, `:821-823`, `:840-841`), and the run continues.
- A crash before or during seeding writes nine FAIL crash rows and exits 1 (`:709-716`, `:735-738`, `:750-752`).
- `scrubbedEnv` (`artifact.mjs:26-35`) strips `ORCHESTRATOR_PROJECT_DIR`, so an operator's export cannot redirect the room's ledger rows.

### 3. Parser (D2, A1, A2): PASS
`parseSessionStream` (`:156-210`):
- keeps the first `system/init` (`init === null` guard) and never resets state;
- collects only `hook_response` events, so `hook_started` and `hook_progress` are excluded;
- collects `toolUses` only when `parent_tool_use_id` is `null` or `undefined`;
- skips non-JSON lines;
- takes `result` from the last `result` event, `null` when that event carries no string, with no fallback.

Wrapping `parseClaudeStream` was only preferred, not required. The standalone parser meets every binding item.

Live check: the subagent's `Read`/`Glob`/`Read` blocks carry `parent_tool_use_id` and are excluded. The top-level list is `Edit, Bash, Read, Agent, Bash`.

### 4. Hash parity (A4, carry-forward 8(b)): PASS
`frontmatterEnd` (`ingest-loop.mjs:82-138`) is a line-for-line port of `locateFrontmatter` (`src/lib/frontmatter-locator.ts:37-121`). It matches on every point:
- `linesOf`, including CRLF handling and the empty-input line;
- the BOM strip on line 0 only (`xxd`: both files carry the literal `EF BB BF` in the regex);
- the fence opener `^ {0,3}(`{3,}|~{3,})` and the closer `^ {0,3}(`+|~+)\s*$`, with same-char and `>=` length;
- the exact-equality checks for `<instructions>` and `</instructions>`;
- the column-zero `---` check with the `eol === ''` throw;
- the three throw messages;
- the return value: the closer's `end`, the same offset `contradict.ts:73-74` slices from.

`contradictContentHash` mirrors `contradict.ts:72-76`. The A4 corpus and the throw cases pass against the real `srcHash`.

### 5. Live-check robustness: PASS, with residuals noted (N3)
- **`**Contradictions:**`.** `BRIEF_LINE_RE` (`:341`) is byte-identical to the A3 binding regex, and the live Briefs used exactly this form.
- **Extra `PostToolUse:Bash` events.** The positive and negative sessions each had two (`wiki contradict`, `contradict-commit`). Shell-ingest scans all of them, needs one exit 0, and the substantive proof is `raw_path` under `archive/`. The directive check filters to `PostToolUse:(Edit|Write|MultiEdit)`, so a Bash event never satisfies it.
- **Plugin hook events.** Claude 2.1.322 `init` lists 4–5 `@builtin` `cc-plugin-*` plugins, even under `--setting-sources project,local`. The three transcripts held no foreign `hook_response` events. The directive check scans every event and the shell check accepts any exit 0, so neither can be masked. Dispatch requires every SubagentStop to exit 0 (D2 parity), which is strict by design (N3).
- **MCP.** `cleargate` reported `pending` (positive) and `failed` (negative, shell). No check reads `mcp_servers`.

### 6. 0.29.0 release run (`run --ref main`, then `check`)
- On its own, `run --ref main` would PASS again:
  - M1's last item is this story, so `main` after the merge equals what was dry-run;
  - the seeds and anchors are unchanged;
  - the container parent `/Users/ssuladze/Documents/Dev` is not a git work tree;
  - the dry run cost $0.44 over 115 s.
- **It trips on F1.** The release evidence path already holds a nine-PASS Run 1, the dry run against `story/STORY-063-07` with `cleargate-0.28.0.tgz`. Any exit-2 refusal leaves that run as the LAST run, so `check` exits 0. Examples of a refusal: a reused `--container` ("must not already exist"), a missing `jq` on another machine, or seed-template drift. Story §2.2 defines the gate as "passes only on an exit-0 `check`".

## Bindings and amendments

| Item | Status | Note |
|---|---|---|
| D1 session.mjs | PASS | see §1 |
| D2 driver shape / parser / SubagentStop rule | PASS | imports are `node:*` plus the four sibling modules; `isMainModule` uses realpath on both sides (`:932-939`) |
| D3 run order | PASS | see §2 |
| D4 reset | PASS | resets HEAD, not a pinned SHA (N5) |
| **D5 session errors / evidence once the room exists** | **FAIL** | `SeedRefusal` returns 2 without writing evidence (`:746-749`), although the room exists. See F1 |
| D6 evidence metadata / pointers | PASS | the retry finding pointer starts with `attempt 1:` (N1) |
| D7 `check` evidence-only | PASS | `:890-903` |
| D8 evidence path | PASS | default `<C>/evidence/ingest-loop-evidence.md` |
| D9 procedure doc | PASS on placement (§5.1, before `## 6`); factual fixes in F2 | |
| D10 no checkout build | PASS | |
| D11 one dry run | PASS | $0.44 rather than the estimated $3–9; one result per session (N6) |
| D12 baseline diff scope | PASS | |
| D13 blunt fixtures, no "contradict" | PASS | |
| D14 MCP non-blocking | PASS | the premise "0.29.0 unpublished" didn't apply to the 0.28.0 dry run; outcome unchanged (N7) |
| A1–A10 | PASS | all present and green. A2 fixture scan: no `/Users/`, connector names, emails, `plugins`, `mcp_servers` or `rate_limit_event`; both inits keep exactly the nine allowed keys |
| O1 | PASS | `SESSION_DEFAULTS` = sonnet-5-5 / 20 / $3 / 900 000 ms |
| O2 | PASS | `check` is evidence-only |
| O3 | PASS | one dry run |
| O4 | PASS | `artifact_inputs` and `cli_sha` recorded, no staleness gate. F1 is the minimum guard that the absence of a gate now requires |

## Findings

**F1 — Blocking, high. An exit-2 refusal writes no evidence, so `check` passes on an earlier run.**
- `runCommand` returns 2 without appending to the evidence file in three places:
  - a seed refusal (`:746-749`), which violates D5 ("once the room exists, never exit without writing evidence"; D3.4's exit 2 and D5 are compatible);
  - a missing tool (`:681-686`);
  - a refused container (`:691-695`).
- The release evidence file is append-only and shared across releases. Its LAST run is today's dry run, and after 0.29.0 it will be 0.29.0's PASS.

Remediation:
1. Resolve `evidencePath` before the tool check. When `--evidence` is absent, the default is `<container>/evidence/ingest-loop-evidence.md`.
2. Add a `refuse(reason)` helper. It appends a run section with nine FAIL rows (pointer `run refused (exit 2): <reason>`) whenever `--evidence` was given or the resolved file already exists, then returns 2.
3. Route all three exit-2 paths through `refuse`.
4. Add one model-free spawn test:
   - Seed a temp evidence file with a nine-PASS section built by `renderIngestRunSection`.
   - Run `node ingest-loop.mjs run --container <an existing temp dir> --evidence <that file>`; expect exit 2. Whichever refusal fires first, missing tool or existing container, nothing is packed.
   - Then `check --evidence <file>` exits 1.
   - Remove every temp dir in `t.after`.
5. Orchestrator routing decides whether QA-Red writes the red case first.

**F2 — Blocking for the outer-doc commit only, medium. §5.1 has claims that don't match the code or the evidence.**
- (a) "each positive and negative session emits two `system/init` and two `result` events" is false for the live run. Sonnet called `Agent` with `run_in_background: false`, and each session emitted ONE result (resultCount 1). Reword: a session *can* emit two (a backgrounded Agent, as in the 2.1.322 haiku probe); the driver handles one or two.
- (b) "roughly $3-9, up to about $12 with a retry" is the ceiling, not the cost. State the observed $0.44 (sonnet, 115 s, dry run 2026-11-12) and the hard ceiling of $9 ($12 with a retry) from the $3 per-session cap.
- (c) "`--max-turns` resets per async-subagent segment" is stated as fact. The probe only *appeared* to show this, and it is unproven (TPV §2(c)).
- (d) The exit-2 list omits seed-template anchor drift and edit-text non-uniqueness, both `SeedRefusal`. After F1, add: "a refusal still appends a FAIL run section, so `check` never passes on an earlier run."
- Optional: show `--label` in the usage line.

**N1 — Non-blocking, low. Retry pointers.** The finding pointer on a retry starts `attempt 1: <tp1> …` (`:456-459`), not with the transcript path. With the default container name it is about 309 characters, so `markdownCell` (300) cuts attempt 2's path tail and its verdict text. The full paths survive in the `session positive-N` meta lines. Optional: `<tp1> — attempt 1: … ; <tp2> — attempt 2: …`, or list the passing attempt first.

**N2 — Non-blocking, low. Truncation already seen in Run 1.** The stamp and brief rows (`combine`, `:440-446`) truncate the negative half. Failing pointers sort first, so a FAIL is never hidden. Accept.

**N3 — Non-blocking, low. Strict SubagentStop rule.** Dispatch requires every SubagentStop to exit 0 (`:257-258`). A future `@builtin` plugin SubagentStop hook that exits non-zero would false-FAIL dispatch, and dispatch gets no retry. None was observed under 2.1.322. Revisit if a release transcript shows one.

**N4 — Non-blocking, low. Commit signing.** The room commit (`:633-635`) sets the identity but not `-c commit.gpgsign=false`. An operator whose global git config signs commits gets a crash, which is exit 1 with crash rows, never a false PASS. This is a one-flag hardening.

**N5 — Non-blocking, low. Reset target.** `resetRoomForRetry` restores `HEAD`, as D4 specified. If a model ever committed during attempt 1, attempt 2 would start from attempt 1's stamped state and be skipped. Optional: record the seed SHA after the commit and check that out.

**N6 — Non-blocking, low. Stale comments.** The async wording overstates in two places:
- the `parseSessionStream` docstring (`ingest-loop.mjs:151-153`: "a session has TWO … TWO");
- the test header LIMITS (`:37-38`: "every positive/negative session has TWO `result` events").

Fix the wording alongside F1.

**N7 — Info.** The dry run packed 0.28.0, which is published, and the cleargate MCP still reported pending/failed. No check depends on it.

**N8 — Orchestrator action, low. Release evidence file.** D11 said dry-run evidence is not committed, but Run 1 (the dry run) sits at the release path. Before the 0.29.0 run, move it aside (for example to `<container>/evidence/`) so the committed release evidence starts with the release run. Pass `--label "0.29.0 release"`. F1 makes this hygiene rather than a safety measure.

## Open decisions for orchestrator
- Route F1 to the Developer, with a QA-Red red case first if you prefer the TDD order. F2 goes to the Developer, who owns the D9 doc. N1, N4, N5 and N6 are cheap to fold into the same bounce; the orchestrator chooses whether to.
- N8: move the dry-run evidence aside before the release run.

## Script Incidents
None. No `.cleargate/scripts` were invoked. I ran the two integration test files with `npx tsx --test` (`TMPDIR=/tmp/a7`, since removed) and read the live transcripts with `jq`. Neither checkout was modified apart from this report.

flashcards_flagged:
- `2026-11-12 · #clean-room #evidence #danger · A run that refuses (exit 2) without appending evidence leaves the prior PASS as LAST run; check goes green.`
- `2026-11-12 · #clean-room #claude-p · Sonnet 5.5 in -p calls Agent with run_in_background:false → ONE result; parsers must accept one or two.`
