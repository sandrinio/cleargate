# Reporter Context Bundle — SPRINT-45

_Generated: 2026-11-14T12:52:56.199Z_

---

## Sprint Plan Slices

_Source: SPRINT-45_measured_loop_and_safe_upgrade.md_

## 1. Consolidated Deliverables

## 2. Execution Strategy
*(Written by Architect during Sprint Design Review, architect-reader ×6 → architect-synth, 2026-11-14.)*

## 5. Gate Checklist

## State.json Summary

Sprint: SPRINT-45 | Status: Active

CR-120 | Done | standard | qa_bounces=0 arch_bounces=0
STORY-064-01 | Done | standard | qa_bounces=0 arch_bounces=0
STORY-064-02 | Done | standard | qa_bounces=0 arch_bounces=0
BUG-117 | Done | fast | qa_bounces=0 arch_bounces=0
BUG-133 | Done | standard | qa_bounces=0 arch_bounces=0
BUG-134 | Done | standard | qa_bounces=0 arch_bounces=1

## Milestone Plans

### M1.md

# Milestone: M1 — measured loop core + safe upgrade (SPRINT-45)
## Stories: CR-120, STORY-064-01, BUG-133, BUG-134 (BUG-117 is fast lane: no plan; STORY-064-02 is M2)
## Wave: wave1 (CR-120, BUG-133, BUG-134) parallel; wave2 STORY-064-01 builds now on C2, integrates after CR-120 merges

role: architect

GOAL_RELATION: advances. CR-120 and STORY-064-01 produce the measured rework and cost figures, and BUG-133 and BUG-134 make upgrade safe for customised repos. These are goal clauses 1 and 2. Clause 3 (the report) is M2.

Code read at cli `main` dbccc79. Contracts: C1 `contract/S-45-ledger` = e1e8ad0, C2 `contract/S-45-metrics` = 4720d79 (stub texts read from the branches). Holdout not read. No protocol section is added (numbering resolver: n/a). No dependency is added (version check: n/a).

---

## Order

1. All four build at once in their own cli worktrees: CR-120 on C1, STORY-064-01 on C2, BUG-133 and BUG-134 on `main`.
2. Merge order: CR-120 → (064-01 integrates: `git merge --no-ff main`) → STORY-064-01 → BUG-133 → BUG-134.
3. No two M1 items share a source or test file (see the shared-file table below). The plan of record names one overlap, `upgrade.ts` for BUG-133 and BUG-134. It does not exist: BUG-134 makes no `upgrade.ts` edit.

| File | Items | Note |
|---|---|---|
| `src/commands/upgrade.ts` | BUG-133 only | It has no `mergeSettings`/`removeClearGateHooks` call; the only mention is the header comment at :14. The settings take path is `adapter.mergeSurgeryTarget` (:464-470), implemented in `hosts/*.ts`. |
| `scaffold/core/.cleargate/scripts/subagent-ledger.mjs` | CR-120 owns; 064-01 imports | Contract C1 |
| `scaffold/core/.cleargate/scripts/sprint_metrics.mjs` | 064-01 owns | Contract C2; STORY-064-02 (M2) runs it |
| `scaffold/core/.cleargate/config.example.yml` | 064-01 | `upgrade` always overwrites it (upgrade.ts:1121-1129). Behaviour coupling with BUG-133 only. |

## Conventions for every M1 item

- **Run tests:** `npm run test:file -- <file>` in the cli worktree, plus `npm run typecheck`. Do not run full suites in a build lane.
- **Red naming:** `*.red.node.test.ts`. A red that needs the integrated tree, a built CLI or a composed payload is `*.red.integration.node.test.ts`. `npm test` skips those (package.json `test` glob), so QA-Verify runs them by file.
- **New-module reds:** dynamic-import the module inside each test and assert `typeof fn === 'function'` first, so each case fails on its own and the file still loads (flashcards #qa-red #esm, #test-harness).
- **Fixtures** (rule 11): synthetic only. Every transcript fixture carries one unique privacy marker string (`PRIVATE-MARKER-7f3a`) in message content. Every output test asserts the marker never appears.
- **Canonical scripts, never live:** run `.mjs` scripts by canonical path when they take `CLEARGATE_SPRINT_DIR`. Run scripts that derive `REPO_ROOT` from their own path (`pre_gate_runner.sh`) from `stageCanonicalScripts()` (`test/helpers/scaffold-roots.ts:117-124`). That helper copies the whole canonical `scripts/` tree, so sibling imports resolve.
- **Inline ID regex gate:** `test/scripts/no-inline-id-regex.node.test.ts` (default tier) scans `scaffold/core/.cleargate/scripts/**` (`scripts/check-no-inline-id-regex.mjs:31-34`). It fails any line that names a type word (STORY/BUG/CR/…) and also has a `-\d`/`[0-9]`/`\w` escape. In new `.mjs`/`.sh` code, never write an ID regex: use `extractWorkItemIds` (`lib/work-item-id.mjs:32-42`) and literal roster strings.
- **Git children:** strip `GIT_DIR`, `GIT_WORK_TREE`, `GIT_INDEX_FILE` from the env of every spawned `git` (flashcard 2026-09-27 #git #test-harness).

---

## Per-story blueprint

### CR-120 — subagent ledger

CR-120 advances the goal by replacing the orchestrator-window token rows with one measured row per subagent dispatch, workflow-run agents included, read from the host's own transcripts.

**Layout verified on disk** (counts only, dispenser_adapter + this repo):
- Session dir = transcript path minus `.jsonl`. It holds `subagents/agent-<id>.jsonl` + `.meta.json`, and workflow runs under `subagents/workflows/wf_<id>/`. A run dir also holds a `journal.jsonl`, which is not an agent. A sibling `<session>/workflows/` exists outside `subagents/`; never walk it.
- Top-level `.meta.json` has `agentType, description, toolUseId, finished, spawnDepth, …`. Workflow `.meta.json` has `agentType, description, workflowPhase, model` (an alias, e.g. `sonnet`), and **no `toolUseId`, no `finished`**.
- Phases seen: QA-Red, Build, Verify, Post-flight, Merge, Wiring, Prepare, Integrate, Contract, Plan, Pre-verify.
- 46% of assistant lines repeat a `message.id`, and every repeat carries identical usage. One line carries `message.model: "<synthetic>"`.
- Interruption markers: a user text block starting `[Request interrupted by user`, and an `attachment` line with `attachment.type === "hook_cancelled"`. The bare word `interrupted` occurs over 2,000 times inside tool results, so never substring-match it.
- Three meta-only copies (`.meta.json` without `.jsonl`) exist in one dispenser session.

**Files:**

| File | Change |
|---|---|
| `scaffold/core/.cleargate/scripts/subagent-ledger.mjs` | replace both C1 stub bodies; add the additive export `writeSubagentLedger` |
| `scaffold/core/.cleargate/scripts/count_tokens.mjs` | one call site + `subagent` key (additive) |
| `scaffold/core/.cleargate/scripts/lib/ledger-digest.mjs` | `LEDGER_MEASURES` + `measures` key in `aggregate()` |
| `scaffold/hosts/claude/.claude/hooks/token-ledger.sh` | `measures` field in the row literal (:579) |
| `scaffold/core/.cleargate/scripts/surface-whitelist.txt` | three rows after :18 |
| `scaffold/core/.cleargate/scripts/pre_gate_runner.sh` | one `pre-gate.jsonl` append |
| `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` | one paragraph after :71 |
| `scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `scaffold/hosts/codex/.codex/hooks/token-ledger.sh` | `npm run gen:codex` output only |
| `test/scripts/subagent-ledger.red.node.test.ts` (new), `test/fixtures/subagent-ledger/` (new) | reds + static synthetic session tree |
| `test/snapshots/hooks-snapshots.node.test.ts`, `test/snapshots/hooks/token-ledger.cr-120.sh` (new) | snapshot lock moves to CR-120 (clarification C-1) |
| `test/scaffold/skill-md-serial-pointers.red.node.test.ts` | re-scope Test 20 (clarification C-1) |

**`subagent-ledger.mjs` design.** Synchronous, Node built-ins plus `./lib/ledger-digest.mjs` (`parseJsonl`, which tolerates bad lines, :32-44). No `main()`: library only.

- `discoverSessions(sprintDir, opts = {})` returns `string[]`. `opts.transcriptsRoot` and `opts.report` are new optional fields (freeze rules allow them). When `opts.report` is given, the function sets `report.source` (`'ledger' | 'fallback' | 'none'`) and `report.window` (`{start, end} | null`) and pushes strings onto `report.warnings`, creating the array if absent.
  1. **Ledger first.** Parse `<sprintDir>/token-ledger.jsonl` and collect distinct non-empty `transcript` values ending `.jsonl`, in first-seen order. Session dir = `path.join(path.dirname(t), path.basename(t, '.jsonl'))`. Keep those that are existing directories. If any remain, set source `ledger` and return them. A ledger whose transcript paths no longer exist on disk counts as "none" and falls through. The test fixture `/dev/null` is not a directory, so it falls through too.
  2. **Fallback.** Window = earliest and latest `ts` in `<sprintDir>/events.jsonl` (parsed with `parseJsonl`). If no window is available: warn `no ledger sessions and no sprint window`, set source `none`, return `[]`. Never scan unbounded.
  3. **Root.** `opts.transcriptsRoot` ?? `process.env.CLEARGATE_TRANSCRIPTS_ROOT` ?? `~/.claude/projects/<slug>`. The root is the directory that directly holds `<uuid>/` session dirs. `slug = projectRoot.replace(/[^A-Za-z0-9]/g, '-')` (verified: `dispenser_adapter` becomes `-…-dispenser-adapter`). `projectRoot` = three levels up from `sprintDir` only when `sprintDir` sits at `<root>/.cleargate/sprint-runs/<id>`; otherwise there is no default root (warn, source `none`).
  4. Return every subdir of the root that has a `subagents/` child, sorted. Set source `fallback` and the window.
- `readDispatches(sessionDirs, opts = {})` returns `DispatchRow[]`. Optional `opts.window` (`{start, end} | null`) and `opts.report`.
  - **Missing `subagents/`.** For each session without one, push the warning `<session-id>: no subagents directory` and continue.
  - **Walk.** Walk recursively and match only `^agent-(.+)\.jsonl$`. `agent_id` = the capture. `run_id` = the parent dir name when the grandparent is named `workflows`, else `null`. `session_id` = basename of the session dir.
  - **Meta.** Read `agent-<id>.meta.json` beside the transcript. If it is missing, use `agent_type: 'unknown'`, `description: ''`, `workflow_phase: null`. A meta without a `.jsonl` is never visited, because the walk keys on `.jsonl`; that is the meta-only skip.
  - **Dedupe across sessions, first seen wins.** Key = `meta.toolUseId` when present, else `agent:<agent_id>` (workflow metas have no toolUseId). Row `tool_use_id` = `meta.toolUseId ?? ''`. The empty string is a valid frozen `string`, so no contract change is needed.
  - **Parse the transcript** one line at a time inside try/catch, skipping bad lines (one warning per file).
    - `started_at`/`ended_at` = min/max `timestamp`; `wall_ms` = their difference.
    - Assistant lines are deduped by `message.id`, first wins: `usage` = the sum over distinct ids of `input_tokens`, `output_tokens`, `cache_read_input_tokens` (→ `cache_read`) and `cache_creation_input_tokens` (→ `cache_creation`).
    - `turns` = distinct ids.
    - `tool_uses` = distinct `tool_use` block `id`s across all assistant lines. Each duplicate line carries a different block.
    - `model` = the most frequent `message.model` among distinct messages, excluding `<synthetic>`; fall back to `meta.model ?? 'unknown'`.
  - **`completed: false`** when a `type:"user"` line has a string `message.content`, or a `{type:"text"}` block, starting `[Request interrupted by user`, **or** an `attachment.type === 'hook_cancelled'` line exists. Never match text inside `tool_result` blocks.
  - **Window.** When `opts.window` is set, keep rows with `started_at` ∈ [start, end].
  - Sort rows by `started_at`, then `agent_id`. Each row is `schema: 1` with the full C1 field set; `usage` is never null.
- `writeSubagentLedger(sprintDir, rows)` returns a path or `null` (additive export). It writes one JSON line per row to `<sprintDir>/subagent-ledger.jsonl` (tmp + rename) **only when `rows.length > 0`**. With zero rows it never creates or truncates the file: a file left by an earlier run is the only record once the host deletes transcripts.
- **How a consumer composes the two readers.** Both `count_tokens.mjs` and 064-01 use this, and it works unchanged on the C1 stub:
  ```js
  const report = { warnings: [] };
  const sessions = discoverSessions(sprintDir, { report });
  const rows = readDispatches(sessions, { window: report.source === 'fallback' ? report.window : null, report });
  ```
  Ledger-discovered sessions are read whole: CR-120 §1 applies the window to the fallback only. SPRINT-44 has 60 agents in its one ledger session: 7 start before the events window (planning) and 1 after.

**`count_tokens.mjs` call site** (CLI shape locked, rule 6):
- Import `{ discoverSessions, readDispatches, writeSubagentLedger }`.
- **Placement.** After the ledger existence check (:106-109 keeps exit 1 for a missing `token-ledger.jsonl`), run the snippet above once inside try/catch, before the empty-ledger branch (:114).
- **New `--json` key** `subagent`, added in both the empty (:116) and full (:126) branches:
  `{measures: 'subagent-transcripts', status: 'measured' | 'not measured', source, sessions: n, dispatches: n, interrupted: n, tokens: {input, output, cache_read, cache_creation, total}, by_agent_type: {<t>: {dispatches, tokens}}, by_model: {<m>: {dispatches, tokens}}, ledger_file: 'subagent-ledger.jsonl' | null, warnings: string[]}`.
  - `status` is `not measured` when there are zero rows or the snippet threw (warning `subagent ledger failed: <message>`).
  - Existing keys keep their values, including `total: 0` (a number) in the empty branch, which `prep_reporter_context.mjs:258` tests for.
- **Human output.**
  - `Per-agent breakdown:` (:62) becomes `Per-agent breakdown (orchestrator window):`.
  - After Anomalies, print `Subagent dispatches (from transcripts): <N> across <S> sessions, <T> tokens` plus one indented line per agent type, or `Subagent dispatches: not measured (<first warning>)`.
  - Each warning also goes to stderr. Exit codes are unchanged.
- No test pins the human text (grep: only `reporter-content.node.test.ts:68-71` names the script).

**`ledger-digest.mjs`:** `export const LEDGER_MEASURES = 'orchestrator-window'`; `aggregate()` (:94-124) adds `measures: LEDGER_MEASURES` to its return. `count_tokens` reads the label from there.

**`token-ledger.sh`:** in the jq literal at :579 append `, measures: "orchestrator-window"` after `turns: $turns`, inside the braces before the `| if $run_id …` filter. The Codex branch (:114-121) writes no row, so nothing changes there. Then run `npm run gen:codex`, which writes the verbatim `.codex/hooks/token-ledger.sh` copy.

**`surface-whitelist.txt`:** after :18 add three commented rows:
- `.cleargate/sprint-runs/**/subagent-ledger.jsonl` (count_tokens.mjs)
- `.cleargate/sprint-runs/**/metrics.json` (sprint_metrics.mjs)
- `.cleargate/sprint-runs/**/pre-gate.jsonl` (pre_gate_runner.sh)

**`pre_gate_runner.sh`:** after the `SPRINT_ID`/`STATE_JSON` block (:376-383) and before lane routing (:385), whose fast-lane branches `exit` early, append one line to `${REPO_ROOT_FOR_LANE}/.cleargate/sprint-runs/${SPRINT_ID:-_off-sprint}/pre-gate.jsonl` (`mkdir -p` first).
- **Line shape:** `{ts, mode, item, exit, flagged_checks}`.
  - `item` = `STORY_ID`, or `null` when empty.
  - `exit` = `OVERALL_EXIT`.
  - `flagged_checks` = the check names of `^\[(FAIL|WARN)\] <name>:` lines in `$REPORT_FILE` (format at `pre_gate_common.sh:48-54`), de-duplicated, in order.
- **Building the JSON:** use `node -e` with argv. Under `set -euo pipefail` (:9) and macOS bash 3.2, an empty array must expand as `${flagged[@]+"${flagged[@]}"}` (flashcard 2026-09-25 #bash #macos). The whole write ends `|| true`: it must never change the scan's exit.
- Exit-2 argument failures (:22-63) happen before a scan exists and write no line.

**SKILL.md:** insert one blank line and this exact paragraph after the "Registration constraint" paragraph (:71), before `### Wall-clock budgets`:

> `**Dispatch description format (CR-120).** Give every dispatch, including each agent a wave run spawns, the description \`<stage> <WORK-ITEM-ID>[ — note]\`: the stage word first (\`QA-Red\`, \`Developer\`, \`QA-Verify\`, \`Architect\`, \`DevOps\`, \`Reporter\`), then the full work-item ID, never a short form — e.g. \`QA-Red STORY-064-01\`, \`QA-Verify BUG-133 — re-run\`. A sprint-level dispatch names the sprint ID instead (\`Reporter SPRINT-45\`). \`sprint_metrics.mjs\` attributes each subagent's tokens and rework rounds by this description.`

Constraints on this paragraph (rule 18, waves.json CR-120 note):
- **Placement.** §1 lies outside every replaced anchor range: A5 is the title line, and A1 starts at §2 (`build-codex-payload.mjs:297-308`). The paragraph must not start with `#` (flashcard #skill #test-harness) and adds no heading, so Test 21 still holds.
- **Banned tokens** (`build-codex-payload.mjs:265-277`): it must contain none of `/workflows`, `Workflow tool`, `parallel()`, `launch_wave`, `resumeFromRunId`, `RUN_ID`, `mintRunId`, `SKIP_FLASHCARD_GATE=1`, `Between-wave relocation`, `C.0.1`, `C.0.2`. It must not name the `subagents/workflows/…` path: `/workflows` is banned.
- **Regenerate.** `npm run gen:codex` re-renders `scaffold/core/.agents/skills/sprint-execution/SKILL.md`; `npm run prebuild` (`--check`) must then pass.

**Test seams and scenarios** (`test/scripts/subagent-ledger.red.node.test.ts`; minimums: 6 unit + 5 CLI):

**Fixture** (`test/fixtures/subagent-ledger/`), copied to a tmp root per test:
- **Session A** (`sess-a/subagents/`):
  - `agent-t1` (developer, top-level, `toolUseId: toolu_T1`): two assistant lines share `msg_1` with identical usage, plus one more message.
  - `agent-t2` (qa, top-level): carries an interruption text block.
  - `workflows/wf_fixture/`: `agent-w1` (qa, QA-Red), `agent-w2` (developer, Build), `agent-w3` (qa, Verify), plus `journal.jsonl`.
- **Session B** (`sess-b/subagents/`): `agent-t1.meta.json` only (same `toolUseId`), plus `agent-b1` with a `hook_cancelled` attachment.
- **Sprint dir:** `sprint/token-ledger.jsonl`, rows whose `transcript` = `<tmp>/sess-a.jsonl` and `<tmp>/sess-b.jsonl` (written at test time), and `events.jsonl` with two `ts`.

**Unit cases** (direct import of the canonical module):
1. **Pair walk:** rows for t1, t2 and b1 have `run_id: null`.
2. **Workflow walk:** w1–w3 have `run_id: 'wf_fixture'` and `workflow_phase` set; `journal.jsonl` yields no row.
3. **Dedupe:** t1's usage counts `msg_1` once (`turns` = 2); the meta-only t1 in B adds no row; total rows = 6.
4. **`completed`:** false for t2 and b1, true for the rest.
5. **Missing `subagents/`:** a session dir without one gives a warning and no throw.
6. **Row shape:** every key of the C1 typedef is present with its type, `schema === 1` and `tool_use_id === ''` for workflow rows. Plus discovery:
   - (a) ledger → `report.source === 'ledger'`;
   - (b) ledger with no transcript rows plus `CLEARGATE_TRANSCRIPTS_ROOT` → `fallback`, and an agent whose first timestamp lies outside the window is excluded by `readDispatches` with that window;
   - (c) no ledger sessions and no `events.jsonl` → `none`, `[]`, with a warning.

**CLI cases:** canonical `count_tokens.mjs` by path as a child, with `CLEARGATE_SPRINT_DIR=<tmp sprint>` and `CLEARGATE_TRANSCRIPTS_ROOT=<tmp root>`.
1. `--json` has `subagent.dispatches === 6`, keeps the old keys, and writes `subagent-ledger.jsonl` with 6 lines.
2. The duplicate is counted once in `subagent.tokens`.
3. Remove `subagents/` → exit 0, `subagent.status === 'not measured'`, a stderr warning, and no ledger file created.
4. Fallback discovery through the CLI (ledger rows without `transcript`, plus `events.jsonl`).
5. **Hook:** run the canonical `scaffold/hosts/claude/.claude/hooks/token-ledger.sh` **by its canonical path** (`canonicalPath('.claude/hooks/token-ledger.sh')`, never `<cli>/../.claude`).
   - Env: `ORCHESTRATOR_PROJECT_DIR=<tmp>` (the `orchestrator-first` resolver, `lib/harness.sh:41-44`, picks it before `CLAUDE_PROJECT_DIR`), `CLEARGATE_NO_DASHBOARD=1`.
   - stdin: `{session_id, transcript_path, hook_event_name: 'SubagentStop'}`.
   - Tmp tree: `<tmp>/.cleargate/sprint-runs/.active` = `SPRINT-T`, and a one-assistant-turn transcript.
   - Assert: the last row of `<tmp>/.cleargate/sprint-runs/SPRINT-T/token-ledger.jsonl` has `measures === 'orchestrator-window'`. Do **not** reuse the `REPO_ROOT=` regex-patch copies of the older hook tests; that is not needed now that the shim exists.

**Further pins:**
- (a) `pre-gate.jsonl`: `stageCanonicalScripts()`, a `.active` sentinel, a scratch git worktree and a `gate-checks.json` whose `qa.typecheck` is a failing command with a `package.json` present. Run `bash <staged>/pre_gate_runner.sh qa <wt> story/CR-120`. Expect one line `{mode:'qa', item:'CR-120', exit:1, flagged_checks:[…'typecheck'…]}`; a second run appends a second line.
- (b) `surface-whitelist.txt` contains the three patterns.
- (c) Canonical SKILL.md contains the paragraph verbatim (pinned by value, flashcard #tpv #test-harness), and the rendered Codex copy contains it too.
- (d) No output (`subagent-ledger.jsonl`, `--json` stdout) contains `PRIVATE-MARKER-7f3a`.

**Existing tests CR-120 must move** (clarification C-1; QA-Red edits them):
- `test/snapshots/hooks-snapshots.node.test.ts:271-291` pins canonical `token-ledger.sh` byte-for-byte to `token-ledger.story-058-11.sh`.
  - Following the file's own convention: demote that case to existence-only, add `token-ledger.sh matches the CR-120 snapshot byte-for-byte` against `test/snapshots/hooks/token-ledger.cr-120.sh`.
  - The Developer creates that file with `cp` of the edited hook.
- `test/scaffold/skill-md-serial-pointers.red.node.test.ts:39-68`: Test 20 pins canonical SKILL.md = frozen fixture + exactly 4 lines (true today: 849 vs 845). Re-scope it to "P1 and P2 appear verbatim, each directly after its anchor plus one blank line". Drop the whole-file line-count and byte-reproduction asserts. Tests 21 and 22 stay.

**Gotchas:**
- `count_tokens.mjs:134` calls `main()` unguarded: never import it in-process; spawn it.
- `prep_reporter_context.mjs:247-262` only reads `total`, `by_agent` and `anomalies`; the new keys are inert until M2.
- `test/hooks/token-ledger-delta.integration` runs the LIVE hook and does not move (flashcard #test-harness #worktree).

### STORY-064-01 — per-item metrics

STORY-064-01 advances the goal by turning C1 dispatch rows plus git into per-item rework, wall time and tokens. These are the numbers Goal Acceptance Check 1 compares against the holdout.

**Files:**
- `scaffold/core/.cleargate/scripts/sprint_metrics.mjs`: replace the C2 stub body. Keep its usage logic (:38-46: no sprint id, or a first arg starting `--`, prints usage to stderr and exits 2 with empty stdout) and its `import.meta` guard (:79-81).
- `scaffold/core/.cleargate/config.example.yml`: after :22 add a commented top-level block:
  ```
  # metrics:
  #   # No keys. sprint_metrics.mjs classifies commits in "." plus wiki.brief.release_repos (above).
  ```
  Do not add another `#  brief:` line: `test/lib/wiki-config-brief.red.node.test.ts:51-56` regexes the existing one.
- `test/scripts/sprint-metrics.red.node.test.ts` and `test/scripts/sprint-metrics.red.integration.node.test.ts` (new names, clarification C-2); `test/fixtures/sprint-metrics/` (static parts only; transcripts and git are generated at test time).

**Imports:**
- `./subagent-ledger.mjs` (`discoverSessions`, `readDispatches`; frozen names only, so the build works against the stub);
- `./state-events.mjs` (`atomicWrite` :90-95, `TERMINAL_SPRINT_STATUSES` :56);
- `./lib/work-item-id.mjs` (`extractWorkItemIds`);
- `./lib/ledger-digest.mjs` (`parseJsonl`, for `events.jsonl`).

Do not use `readEvents` (:74-81): it throws on one bad line, and rule 3 forbids a throw. Imports are read-only; `state-events.mjs` is never edited (rule 1).

**Exported functions** (new exports are free: C2 freezes the CLI and the document only):

| Function | Requirement | Contract |
|---|---|---|
| `matchItem(description, phase, roster)` | R3 | → `{kind:'item', id}` \| `{kind:'sprint-level'}` \| `{kind:'unattributed'}` |
| `roundKind(row)` | R4 | → `'red'` \| `'build'` \| `'verify'` \| `null` |
| `computeRework(itemRows, {mergedAt})` | R4 | pure → `{red_corrections, dev_reruns, verify_reruns, total, interrupted, post_merge}` |
| `classifyCommits(commits, roster, window)` | R5 | pure; `commits` = `{date, subject, repo}[]` → `Record<id, {red_written, red_corrected, build, rework, integrate, merged, first_merge_at}>` |
| `readRepoList(projectRoot)` | R6 | line-scan YAML (precedent `close_sprint.mjs:117-155`; no parser dependency). Reads `wiki.brief.release_repos` as a block list (`- x`) or a flow list (`["."]`) → `["."]` + entries, deduped by resolved realpath |
| `readGitCommits(projectRoot, repos)` | R5/R6 | → `{commits, repos, warnings}` |
| `sprintWindow(events, state, now)` | R7 | → `{start, end}` \| `null` |
| `buildMetrics(input)` | R8–R10 | pure → C2 document |
| `runSprintMetrics(sprintId, {sprintDir, ledger, now, projectRoot})` | R1 | I/O shell; `ledger` defaults to the imported module; **this is the test seam** for feeding `DispatchRow` fixtures before CR-120 integrates |

**R1 — command.**
- `sprintDir` = `CLEARGATE_SPRINT_DIR` or the stub default.
- `projectRoot` = three levels up when `sprintDir` is `<root>/.cleargate/sprint-runs/<id>`, else `process.cwd()`. **Never** derive it from the script's own location: the stub's `REPO_ROOT` (:36) is `cleargate-cli/scaffold/core` when run by canonical path.
- Always write `<sprintDir>/metrics.json` with `atomicWrite`, when `sprintDir` exists. If it does not, warn and write nothing.
- `--json`: stdout is exactly `JSON.stringify(doc) + '\n'`. Without it, print one table line per item (ID, dispatches, rework r/d/v = total, git rework, interrupted, post_merge, tokens, source, `disagrees`, with "not measured" in the dispatch and token columns when degraded). Then sprint-level, unattributed share and totals.
- Every warning also goes to stderr as `sprint_metrics: warning: <text>`.
- Wrap `main()` in try/catch: an unexpected error becomes a warning, a degraded document and exit 0. Exit 2 is reserved for usage errors.

**R2 — roster.** `Object.keys(state.stories)`. If `state.json` is missing or unreadable, warn, and the roster is empty.

**R3 — `matchItem`.**
1. Full IDs = `extractWorkItemIds(description) ∩ roster`.
2. If none: short forms. For each roster ID, short = the text after its first `-` (`STORY-003-01` → `003-01`). Eligible only when it contains `-`; `001` and `120` never match.
   - Find each short with `indexOf`. The character before must not be `[A-Za-z0-9-]`, and the character after must not be `[A-Za-z0-9]`, or `-` followed by a digit.
   - Candidates = the roster IDs whose short form occurs.
3. Exactly one distinct ID → item. Two or more full IDs, or two or more candidate IDs (an ambiguous short form such as `003-01` for STORY-003-01 + CR-003-01) → `unattributed` (clarification C-2).
4. No ID → `sprint-level` if `/\b(plan|design review|sdr|reader|synth|preflight|close|report)/i` matches `workflow_phase` or the description (prefix match at a word start, so `Planning`, `Reporter` and `closeout` hit and `explanation` does not), else `unattributed`.
5. Write no type-prefixed regex.

**R4 — `roundKind(row)`** (role = `row.agent_type`):
- **Never rounds.** `NEVER = {Integrate, Pre-verify, Prepare, Wiring, Post-flight, Merge, Contract, Plan}`. A phase in `NEVER` → `null`. Not `completed` → `null`.
- **qa:**
  - phase `QA-Red` → `red`;
  - phase `Verify` → `null` if `/\bpre\b/i` matches the description, else `verify`;
  - phase null (top-level) or any other phase: `/\bpre\b/i` → `null`; `/\bqa-?red\b|\bred\b/i` → `red`; `/\bverif/i` → `verify`; otherwise `null`.
- **developer:** phase `Build` or null → `build`; anything else → `null`.
- Every other role → `null` (the general-purpose `commit red r1` counts as a dispatch, not a round).

Top-level dispatches carry no phase, so a top-level developer dispatch is always a Build, as R4 states. Keep the phase and keyword sets in one table at the top of the file. If the holdout comparison shows a definitional gap, the fix is then a one-line spec clarification plus a one-line edit.

**R4 — `computeRework`.**
- **Order.** Sort by `started_at`.
- **Post-merge.** `post_merge` = rows with `started_at > mergedAt` (all roles). Those rows are never rounds.
- **Interrupted.** `interrupted` = rows with `completed === false`.
- **Passes.** `pass(row)` = `N` from `/\bpass\s+(\d+)\b/i`, else 1.
- **Reds.** `reds` = round rows of kind `red`; `red_corrections = max(0, reds.length − |distinct pass(reds)|)`. **Builds:** the same with kind `build` gives `dev_reruns`.
- **Verifies.** Drop each verify whose latest preceding item row of phase `Integrate` comes after the latest preceding completed `build` row (or there is no such build). Then `verify_reruns = max(0, verifies.length − 1)`.
- **Total** = the sum of the three.
- The function is pure, so all ten R3 and R4 outline rows run with no transcripts and no git.

**R5 — `classifyCommits`.**
- **Dedupe.** Drop repeated subjects (exact subject text, across and within repos, keeping the earliest author date). Keep commits whose author date is in the window, or all of them when the window is null (warn).
- **Attribute.** Item = `matchItem(subject, null, roster)` must be an item.
- **Classify** by ID-free prefix, oldest first:
  1. `^merge\(story\//` → merged.
  2. `^integrate\(` or `^merge\(sprint\/[^)]*\): integrate ` → integrate.
  3. `^qa-red\(` → the first is `red_written`, later ones `red_corrected`.
  4. `^(feat|fix)(\([^)]*\))?!?: ` or any other subject containing `(rework)` → the first is `build`, later ones `rework`.
  5. Anything else is ignored.
- `first_merge_at` = the earliest merged date.
- Git rework = `red_corrected + rework`.

**R6 — `readGitCommits`.** For each repo path resolved against `projectRoot`:
- **Skip with a warning** unless `git -C p rev-parse --show-toplevel` equals `realpath(p)`. Without this, a plain subdirectory (`mcp` in a clone without its own `.git`) silently reads the parent repo.
- **Read:** `git -C p log --all --format=%H%x09%aI%x09%s` with `execFileSync` (no shell, `maxBuffer` 64 MB, `GIT_*` stripped). Split on the first two tabs.
- **Edge cases:** if no repo is readable, add the warning `git data: not measured`. `sources.repos` lists repos as written.

**R7 — `sprintWindow`.** Start = min `ts` in `events.jsonl`. End = max `ts` when `state.sprint_status` ∈ `TERMINAL_SPRINT_STATUSES`, else `now`. No events → `null` plus a warning.

**R8–R10 — `buildMetrics`.**
- **Dispatch rows.** `report = {warnings: []}`; `sessions = ledger.discoverSessions(sprintDir, {report})`; `rows = ledger.readDispatches(sessions, {window: report.source === 'fallback' ? report.window : null, report})`. Wrap this in try/catch: a throw means zero rows plus a warning.
- **Not measured** when `rows.length === 0`. Every item gets `dispatch_source: 'not measured'`, `sources.warnings` gets `'dispatch data: not measured'`, and `rework.total` = git rework. Otherwise `dispatch_source: 'transcripts'` and `rework.total` = dispatch-derived.
- **Per item:**
  - `dispatches.total` and `by_role` keyed by `agent_type`;
  - `by_phase` keyed by `workflow_phase ?? 'top-level'`;
  - `tokens` = Σ usage, with `total` = the four summed;
  - `wall_ms` = Σ;
  - `models` = sorted distinct;
  - `state_counters` from `state.stories[id]`;
  - `git` = counts without `first_merge_at`;
  - `post_merge` cutoff = the item's `first_merge_at`.
- **`disagrees`** when measured: `!(d === g && g === s)`, with d = dispatch rework, g = git rework, s = `qa_bounces + arch_bounces`. When not measured: `g !== s`.
- **Document.**
  - `sprint_level` and `unattributed` are `{dispatches, tokens}`.
  - `unattributed.share` = unattributed tokens ÷ all row tokens (0 when there are none).
  - `totals` = `{dispatches: rows.length, rework: Σ item totals, tokens: all row tokens}`; `sources.sessions` = `sessions.length`; `sources.dispatches` = `rows.length`.
  - No description, prompt or message text is copied into the document.

**Test seams and scenarios.** Minimums: 11 unit, 2 integration, 6 E2E, 1 performance.

**Unit file** (`sprint-metrics.red.node.test.ts`: dynamic import of the canonical module):
1. **R3 outline, 5 rows.** `matchItem` against the roster STORY-003-01, CR-003-01, BUG-001, using the Gherkin's exact rows and expected results.
2. **R4 outline, 5 rows.** `computeRework` with STORY-002-07 = one red, one Build and one Verify, `mergedAt` 12:00, plus each extra row → total 0 and the extra counted in the named bucket (dispatches / interrupted / post_merge).
3. **Scenario 1 counts through the seam.** `runSprintMetrics` with an injected `ledger` returning the four Gherkin rows, a fixture `state.json`/`events.jsonl` and an empty git repo → `red_corrections 1, dev_reruns 0, verify_reruns 0, total 1`. The general-purpose row is in `dispatches.total` and is not a round.
4. **Git classification** (Gherkin 4). A fixture git repo at the tmp project root with the five subjects, dated with `GIT_AUTHOR_DATE`/`GIT_COMMITTER_DATE` inside the events window, plus one identical subject committed in a second repo listed in `config.yml` `wiki.brief.release_repos`, which must count once → `{red_written 1, red_corrected 1, build 1, rework 1, merged 1}` and `disagrees true`.
5. **Ambiguity rule:** an ambiguous short form → unattributed.
6. **Contract shape.** C2 keys and types, `share` ∈ [0,1], and the privacy marker absent.
7. **Repo skip.** A release repo that is a plain subdirectory is skipped with a warning.

**CLI cases** (child process, canonical path):
1. **`--json` contract** (Gherkin 5). stdout parses with `schema 1` and the five keys. `metrics.json` deep-equals stdout.
2. **Not measured** (Gherkin 6). A ledger naming a session with no `subagents/` plus a git fixture → exit 0, the warning on stderr and in `sources.warnings`, every item `dispatch_source "not measured"` with `rework.total` = git. **Green before integration** (the C1 stub returns []).
3. **Usage.** No args → exit 2 with empty stdout; `--json` first → exit 2.

**Integration file** (`sprint-metrics.red.integration.node.test.ts`): red until CR-120 is integrated, by design; say so in the Dev report.
- **Setup.** Generate 60 synthetic agent pairs in one session at test time: Gherkin 1's four STORY-003-01 workflow agents plus 56 fillers across BUG-001, sprint-level and unattributed. Add a ledger row pointing at the session, set `CLEARGATE_TRANSCRIPTS_ROOT`, and add the git fixture.
- **Assert:** Gherkin 1 end to end through the real reader, and wall-clock under 10 000 ms measured around the child.
- **Generator.** Its own minimal writer (do not import CR-120's test fixture: separate items).

**Gotchas:**
- `atomicWrite` pretty-prints, so compare parsed documents, not bytes.
- `sprint_status` comes from state.json.
- A meta-repo proof against SPRINT-44 reads `.`, `cleargate-cli` and `mcp` (`.cleargate/config.yml:22-25`); `git log` in the cli main checkout is read-only and allowed.

### BUG-133 — upgrade output names lost local edits

BUG-133 advances the goal by making `upgrade` name every file whose local edits it replaces and stop burying them among unchanged files. That is Goal Acceptance Check 2, dry-run half.

**Files:**
- `src/commands/upgrade.ts`;
- `src/lib/changelog.ts` (additive only);
- `test/commands/upgrade-output.red.node.test.ts` (new) and `test/commands/upgrade-output.red.integration.node.test.ts` (new; fixture install at an older version);
- `test/commands/upgrade-changelog.node.test.ts` and `test/commands/upgrade-state-parity.red.node.test.ts` (re-scoped by QA-Red, clarification C-3).

**Shared predicates** (new, in `upgrade.ts`, exported for unit tests):
- `hasLocalEdits(entrySha, installSha, currentSha)` = `currentSha !== null && currentSha !== installSha && currentSha !== entrySha`. This equals `user-modified`/`both-changed` (manifest.ts:386-420), minus the `installSha === null && currentSha === pkgSha` case that classify mislabels `both-changed` (upgrade.ts:161-165).
- `expectedMode(sourcePath, targetPath)`: lift the mode rule out of `copyPackageMode` (:130-138) so the write and the comparison never diverge.
- `fileOutcome(item, projectRoot, packageRoot, newPin)` → `'unchanged' | 'changes'`:
  - `overwrite`: the target is missing, or its bytes or `mode & 0o777` differ from the package (a mode-only difference counts as `changes`; edge case).
  - `pin-aware`: the same comparison against `pkg.replaceAll(PIN_PLACEHOLDER, newPin)`.
  - `merge-3way`: `currentSha !== entry.sha256` (:419-424 writes nothing when they are equal).
  - `skip`: `unchanged`.

**Real run** (`applyAlwaysOverwrite`, :299-320; call site :952-955):
- Pass `installSha` and `currentSha` in. Before the (unchanged) write, compute the outcome and `hasLocalEdits`. Keep the write exactly as it is: §4 "Do NOT modify what upgrade writes".
- Print nothing when unchanged; `[always] overwritten: <path>` when updated; `[always] overwritten (local edits replaced): <path>` when updated with local edits.
- Return the outcome so the loop tallies `unchanged`, `updated` and `localEdits`.
- The example-config line (:1127) keeps its text and counts as one `updated`. It already prints only when bytes differ (`planExampleConfig`, :803-820). It is never a local-edit case, because it is untracked.
- After the example-config block and before `[upgrade] complete.` (:1135), print once, when any `always` entry was processed: `[always] <U> unchanged, <N> updated (<L> had local edits)`. N always equals the number of `[always] overwritten…` lines.
- `pin-aware` real-run lines (:360) and all `merge-3way` lines are unchanged.

**Dry run** (:822-880):
- For non-surgery files (surgery = `installedAdapters.some(a => a.surgeryTargets().includes(path))`):
  - `hasLocalEdits` and action `overwrite`/`pin-aware` → `state=<pre> → overwritten, local edits lost`;
  - `hasLocalEdits` and `merge-3way` → `→ overwritten, local edits lost` when `flags.yes`, else `→ asks: keep, take or edit` (C-3 wording);
  - all others keep `state=<pre> → <post>` / `state=<pre>`.
- Surgery-target lines are untouched (§4 Do-NOT: settings.json, .mcp.json, CLAUDE.md).
- Per C-3: skip the per-file line when `fileOutcome === 'unchanged'` and the path is not a surgery target. Print `[dry-run] <U> unchanged (not listed)` before the final `files planned` line, where `count` = listed lines.
- The prune, gate, untracked and example-config lines are unchanged.

**Release notes** (§1b, :613-650):
- Compute the notes there, without printing. Print them **after** the plan: in the dry run after the `files planned` line; in the real run after `[upgrade] complete.` and the hint and prune lines, before the restart block.
- Format: a `---` line, then for each version in the slice that has notes (newest first, the `sliceChangelog` order) its heading line `## [x.y.z] — date`, followed by the subsection verbatim (including its `### Upgrade notes` line). Then one line, `Full release notes: <pkgRoot>/CHANGELOG.md`.
- No version change → print nothing (:620). Unreadable CHANGELOG → the same stderr warning, printed at that point.
- In `changelog.ts`, add `extractUpgradeNotes(sectionBody): string | null`: from the `### Upgrade notes` line to the next `^## ` or `^### `, `trimEnd`.
- `sliceChangelog` and its return shape stay as they are: the header at :7 calls the API locked, and `test/lib/changelog-slice.node.test.ts` pins it (C-3).
- Body text, including the 0.29.0/0.30.0 "re-run init" paragraphs that 0.30.1's notes supersede, is never printed.

**Test seams and scenarios.** `upgradeHandler(flags, {cwd, packageRoot, stdout, stderr, exit})` with a synthetic package root (manifest + files + CHANGELOG), the same seam `test/commands/upgrade.node.test.ts:538-580` uses.

**Red file** (`upgrade-output.red.node.test.ts`):
1. 3 always files byte-identical to the package plus 1 upstream-changed, `--yes` → exactly one `[always] overwritten` line and `[always] 3 unchanged, 1 updated (0 had local edits)`. The fixture package must not ship a `config.example.yml` that differs from the target.
2. A locally edited always file, `--dry-run` → its line contains `state=user-modified → overwritten, local edits lost`, and no line for it contains `→ clean`.
3. The same file with `--yes` → `[always] overwritten (local edits replaced): <path>`.
4. Mode-only difference → one updated line. `--only <tier>` → the tally counts only that tier.
5. **Unchanged files omitted.** A clean merge-3way file and a clean always file get no dry-run line; `[dry-run] 2 unchanged (not listed)` is printed; a settings.json surgery target with state clean still gets its line.

**Integration red** (`upgrade-output.red.integration.node.test.ts`):
- **Setup.** Snapshot `cleargate_version` 0.27.0, package 0.30.1, and a CHANGELOG with three sections: two carrying `### Upgrade notes`, one without.
- **Dry run.** The first stdout line starts `[dry-run] `; after the plan come only `---`, version headings, upgrade-notes lines and the `Full release notes:` line. No body sentence from any section appears.
- **`--yes` run.** The notes follow `[upgrade] complete.`

**Existing pins** (QA-Red re-scopes them, C-3):
- `upgrade-changelog.node.test.ts:284-308` ("delta appears before the dry-run plan") inverts. Its section-presence cases (:247-282, :368-) need `### Upgrade notes` in their fixture sections.
- `upgrade-state-parity.red.node.test.ts:196-270` (a CRLF merge-3way file that is sha-clean) becomes "neither run prints a line for it".
- Stay green with no edit: `install-state-parity.red.node.test.ts:138-199` and `upgrade-field-path.red.integration.node.test.ts:100-105` (settings.json clean lines; surgery target), `upgrade-mcp-refresh.red.node.test.ts:281,389` (example-config lines), `upgrade.node.test.ts:265-268` (both-changed files are listed).

**Gotcha:** `--dry-run` and the real run must use the same `fileOutcome`. A divergence reintroduces BUG-028 (dry-run vs live disagreement).

### BUG-134 — upgrade keeps settings.json hook order

BUG-134 advances the goal by making `upgrade --yes` leave `.claude/settings.json` order intact. That is Goal Acceptance Check 2, `--yes` half.

**Where the code really is.** `upgrade.ts` has no settings merge. Its take path calls `adapter.mergeSurgeryTarget` (:464-470), which lives in:
- `src/hosts/claude.ts:357-377`: the `.claude/settings.json` branch, `removeClearGateHooks` then `mergeSettings`;
- `src/hosts/codex.ts:308-321`: the `.codex/hooks.json` branch, the same pair.

The install paths (`claude.ts:127` with the partial `CLAUDE_HOOK_ADDITION`, `codex.ts:115-117`) and the remove paths (`claude.ts:241`, `codex.ts:229`) are **not** changed:
- `test/hosts/host-adapter-contract.red.node.test.ts:252-288` pins install's `mergeSettings` calls;
- `test/hosts/codex-adapter.red.node.test.ts:252-288` pins install keeping a user group at index 0;
- §4 forbids touching init (BUG-092).

`settings-json-surgery.ts` needs no edit: `isClearGateCommand` (:53-57) is already exported. **No `upgrade.ts` edit.**

**Files:**
- `src/init/merge-settings.ts`: new export `mergeUpstreamSettings(ours: SettingsJson, theirs: SettingsJson): SettingsJson`. `mergeSettings` (:50-101) is unchanged.
- `src/hosts/claude.ts`: add the function to `ClaudeAdapterDeps`/`DEFAULT_DEPS` (:83-103). The settings branch returns `JSON.stringify(d.mergeUpstreamSettings(ours, theirs), null, 2) + '\n'`, and keeps its try/catch fallback to `theirs`.
- `src/hosts/codex.ts`: the same in `CodexAdapterDeps`/`DEFAULT_DEPS` (:19-34) and the hooks.json branch.
- `test/init/merge-settings-order.red.node.test.ts` (new), `test/commands/upgrade-settings-order.red.integration.node.test.ts` (new, C-4).

**Algorithm** (pure, deep-clones, never mutates its inputs):
1. **Top-level keys.** Keep ours' order and values. The `hooks` key keeps its position and is deleted if the result is empty; it is appended if ours had none and the result is non-empty. Theirs' non-hooks keys are ignored, as `mergeSettings` ignores them today.
2. **Event order (anchored merge).**
   - Start from theirs' event keys in theirs' order (T).
   - Place each ours-only event e, walking ours' order O, immediately before the first event after e in O that is in T; if there is none, append it.
   - Consecutive ours-only events keep their relative order. Drop an event whose merged group list is empty.
   - Why: dispenser_adapter's real file has a user-only `Stop` event **first**. Appending ours-only events would move it, and Goal check 2 forbids that. With anchoring, a repo with no user hooks gets theirs' event order exactly (edge: "upstream's file exactly").
3. **Groups within an event.**
   - Matcher key = `g.matcher ?? ''`. Only ours groups with a non-empty `hooks` array take part in matching.
   - For each theirs group, in theirs' order:
     - Take the first unconsumed ours group with the same key.
     - The output group = theirs' group keys in theirs' order, then ours-only group keys in ours' order.
     - Its `hooks` = theirs' hooks (cloned, in theirs' order), followed by that ours group's non-ClearGate hooks (`!isClearGateCommand(h.command)`) in their original order. Drop any whose `command` equals one already present.
   - Then ours' unconsumed groups in their original order:
     - A group with no `hooks` array or an empty one is kept verbatim.
     - Otherwise ClearGate hooks are stripped; an emptied group is dropped; an untouched group keeps its object.
4. **Idempotence.** A second merge of the same theirs is byte-identical: ClearGate hooks are always theirs' and in theirs' order, user hooks stay in their groups, and key orders are deterministic.

**Hash interplay** (flashcard 2026-11-13 #upgrade #hash). The settings.json hash is the hooks-only projection (`manifest.ts:316-320`; `clearGateHooksProjection`, sorted triples). Order never changes it, and adding user hooks never changes it either. So a fixture that only adds user hooks stays `clean`, and the take path never runs (:419-424). The integration red must **change the ClearGate side** (flashcard #qa-red #upgrade), never fake a snapshot hash:
- **Setup.**
  - The payload is the composed canonical payload: `composeCanonicalPayload(dst)`, `test/helpers/scaffold-roots.ts` (its manifest settings sha is the projection, built by `manifest-builder.ts:603-604`).
  - The target's `.cleargate/.install-manifest.json` = that MANIFEST.json, with `hosts` set to `['claude']` if the manifest lacks it.
  - The target's `.claude/settings.json` = the payload file minus the `PostToolUse` `Bash` group (a ClearGate edit, giving `user-modified`), plus `guard.sh` appended to the `PreToolUse` `Edit|Write` group, a user `PreToolUse` `Bash` group, and a user-only `Stop` event placed first.
- **Run:** `upgradeHandler({yes: true, only: 'cli-config'}, {cwd, packageRoot: dst, …})`.
- **Assert:**
  - events = `[Stop, SubagentStop, PreToolUse, PostToolUse, SessionStart]`;
  - PreToolUse groups = `[Task|Agent, Edit|Write, AskUserQuestion, Bash]`, with Edit|Write = `[pre-edit-gate.sh --host claude, guard.sh]`;
  - the PostToolUse `Bash` ClearGate group is restored.

**Unit reds** (`merge-settings-order.red.node.test.ts`: dynamic import; minimum 5):
1. **Gherkin outline, 3 rows:**
   - no user hooks plus an old ClearGate layout → result bytes equal `JSON.stringify(theirs, null, 2) + '\n'`;
   - `guard.sh` in Edit|Write → `[pre-edit-gate.sh --host claude, guard.sh]`, groups in upstream order;
   - user Bash group → upstream's PreToolUse groups, then Bash.
2. Merging the output again is byte-identical.
3. User hooks under PreToolUse, PostToolUse and SessionStart are all present with their matchers.
4. A user-only event first stays first (the dispenser shape).
5. **Codex half:** `createCodexAdapter().mergeSurgeryTarget('.codex/hooks.json', ours, theirs, {stderr})` with a user hook inside a ClearGate group gives ClearGate hooks first and then the user hook. Upgrade never calls codex `install` (flashcard #codex #upgrade), so the dispenser proof (claude-only install) cannot cover this half.

**Existing tests that stay green and must be run:** `test/hosts/claude-merge-surgery-settings.red.node.test.ts` (set-based triples, :79), `test/hosts/claude-merge-surgery-commandless-hooks.red.node.test.ts`, `test/commands/upgrade-user-hooks.red.integration.node.test.ts` (BUG-093: user hooks exactly once), `test/hosts/codex-adapter.red.node.test.ts`, `test/hosts/host-adapter-contract.red.node.test.ts`.

**Post-flight amendments (2026-11-14, Architect post-flight on `e4a4094`; report `reports/BUG-134-arch.md`).** These replace the matching parts of steps 2 and 3. The re-launched Developer follows this text.
- **PF-1 · event order (step 2, placement bullet). Developer's rule accepted.** Walk ours' order O. An ours-only event with no T event before it in O stays leading, ahead of every T event. One with no T event after it in O is appended after every T event. Any other one goes immediately before the first later O event that is in T. Ours-only runs keep O order. This differs from the original rule only for leading events: the original anchored them to their first shared successor, so a user `Stop` lost first place whenever ours' shared events were in a different order from theirs (red 4). Satisfies C-4. A second merge gives the same order.
- **PF-2 · group pairing (step 3, "Take the first unconsumed ours group" bullet). Developer's fold rejected, and the original bullet corrected.** A theirs group pairs with exactly one ours group: the first unconsumed one with the same matcher key and a non-empty `hooks` array that holds at least one hook whose `command` passes `isClearGateCommand` or equals a command in that theirs group. With no candidate, the theirs group is emitted alone at upstream's position. Every other ours group, including a user-only group that shares the key, goes to the unconsumed tail (step 3's last bullet: ClearGate hooks stripped, an emptied group dropped, an untouched group kept as-is). Why: the spec keeps "the user's own groups after upstream's groups". Folding, and the original matcher-only pairing, merge a user's own `SessionStart` or `PostToolUse` `Bash` group into ClearGate's. That is a diff on user hooks, which Goal check 2 forbids.
- **PF-3 · dedup (step 3, "Drop any whose command equals" clause).** Drop an ours hook only when its `command` is a string equal to one already in the list. Command-less hooks (`type: "prompt"` / `"agent"`) are never deduped: `undefined === undefined` dropped the second one, which breaks BUG-093 ("user hooks are never dropped").
- **Reds. QA-Red re-scopes these before the Developer is re-launched:**
  - **Red 3:** assert that the `SessionStart` group hook lists deep-equal `[[START], [NOTIFY]]`. Its `cmds()` helper uses `.find`, which reads only the first matcher-less group, so the current assertion forces folding.
  - **3b (new):** a user group that shares a key with a ClearGate group is never merged into it, whether it sits before or after that group. `[{NOTIFY}, {START}]` gives `[[START], [NOTIFY]]`.
  - **3c (new):** upstream adds `PostToolUse` `Bash` while the user already has a `Bash` group of their own. The result is `[Edit|Write, Bash[INGEST], Bash[lint]]`, byte-identical on a second merge.
  - **9b (new):** two command-less hooks in a ClearGate group both survive.
  - Every other unit, codex and integration red holds unchanged under PF-1 to PF-3. A scratch copy with PF-2/PF-3 applied fails only red 3.

---

## Cross-story risks

- **CR-120 → 064-01:**
  - 064-01 must call only `discoverSessions` and `readDispatches` with the `report`/`window` composition above. The `report` out-param is the one mechanism that works on both the stub and the real reader; a feature-detected extra export is not needed.
  - `tool_use_id` is `''` for workflow rows; 064-01 never keys on it.
- **CR-120 → STORY-064-02 (M2):** the `count_tokens --json` additions are `measures` (top level) and `subagent`. M2 must detect "not measured" from `subagent.status` / C2 `dispatch_source`, never from a zero.
- **064-01 × BUG-133 (behaviour):** 064-01 changes `config.example.yml`, so the final RC's dry run on dispenser lists `[dry-run] .cleargate/config.example.yml  action=overwrite`. That is expected; run Goal check 2 on the final integrated RC.
- **BUG-133 × BUG-134:**
  - No shared file.
  - BUG-133's dry-run suppression keeps surgery-target lines, so the dispenser dry run shows exactly one unchanged line, `.claude/settings.json … state=clean`. This is by design (C-3).
- **Proof data hygiene:**
  - A proof run of `count_tokens.mjs` or `sprint_metrics.mjs` writes `subagent-ledger.jsonl` / `metrics.json` into the target sprint dir. For SPRINT-44 that is the outer tree (commit it as evidence or restore it).
  - For dispenser_adapter never write into the real repo; use the copy procedure under Proof runs.
- **Attribution risk (not a defect):** SPRINT-44's descriptions include item-less ones (`Developer contract step C0`, `QA consolidation full-suite run`, `Cleanup pass on sprint diff`, wiki queries). R3 classes them `unattributed`. If `unattributed.share` misses 0.05 on SPRINT-44, that is a definitional finding for the orchestrator (spec clarification), not a code fix.

## Known reds to add to sprint §6 (beyond waves.json `known_red_after_merge`)

- `test/scaffold/sprint-execution-mirror.integration.node.test.ts:216-246` ("diff command on live vs canonical"): red from the CR-120 merge. It diffs `<outer>/.claude/skills/sprint-execution/SKILL.md` (live, frozen by rule 9) against canonical. In worktrees, too, because the outer host's `.claude` symlink is live.
- Not known reds, because CR-120 fixes them in-item: `hooks-snapshots.node.test.ts` (new snapshot) and `skill-md-serial-pointers.red.node.test.ts` Test 20 (re-scope). If either stays red after CR-120 merges, it is a CR-120 defect.

## Recommended CR:spec-clarifications (orchestrator applies before QA-Red)

**C-1 · CR-120.**
- §3 "Modify" bullet:
  - old: `` `cleargate-cli/test/scripts/subagent-ledger.node.test.ts` (new) and `cleargate-cli/test/fixtures/subagent-ledger/` (new) ``
  - new: `` `cleargate-cli/test/scripts/subagent-ledger.red.node.test.ts` (new) and `cleargate-cli/test/fixtures/subagent-ledger/` (new); `cleargate-cli/test/snapshots/hooks-snapshots.node.test.ts` and `cleargate-cli/test/snapshots/hooks/token-ledger.cr-120.sh` (new) — the byte-for-byte hook lock moves to CR-120; `cleargate-cli/test/scaffold/skill-md-serial-pointers.red.node.test.ts` — Test 20 re-scoped to P1/P2 placement only ``
- §4 Command:
  - old: `` node --test --import tsx/esm test/scripts/subagent-ledger.node.test.ts ``
  - new: `` npm run test:file -- test/scripts/subagent-ledger.red.node.test.ts ``
- Task Breakdown:
  - old: `- [ ] Add the two \`surface-whitelist.txt\` rows`
  - new: `- [ ] Add the three \`surface-whitelist.txt\` rows (subagent-ledger.jsonl, metrics.json, pre-gate.jsonl)`
  - after the SKILL.md row, add `- [ ] Run \`npm run gen:codex\`; move the token-ledger.sh snapshot lock to token-ledger.cr-120.sh; re-scope skill-md-serial-pointers Test 20`

**C-2 · STORY-064-01.**
- §3.1 Test Files:
  - old: `` `cleargate-cli/test/scripts/sprint-metrics.node.test.ts`, `cleargate-cli/test/fixtures/sprint-metrics/` ``
  - new: `` `cleargate-cli/test/scripts/sprint-metrics.red.node.test.ts`, `cleargate-cli/test/scripts/sprint-metrics.red.integration.node.test.ts` (green only after CR-120 integrates), `cleargate-cli/test/fixtures/sprint-metrics/` ``
- R3, after "Otherwise it is **unattributed**.", add: `A description naming two or more roster items (full IDs or short forms), or a short form shared by two roster items, is **unattributed**.`

**C-3 · BUG-133** (widens the dry run to meet Goal Acceptance Check 2, "lists only files that change", which the owner approved at Gate 2. Escalate instead if the orchestrator reads it as a scope change):
- §4, append to the Investigate/Modify list: `` `cleargate-cli/src/lib/changelog.ts`: add `extractUpgradeNotes`; `sliceChangelog`'s locked return is unchanged. Tests re-scoped by QA-Red: `cleargate-cli/test/commands/upgrade-changelog.node.test.ts` (notes now follow the plan; fixture sections carry `### Upgrade notes`), `cleargate-cli/test/commands/upgrade-state-parity.red.node.test.ts` (a file neither run changes gets no line). New: `cleargate-cli/test/commands/upgrade-output.red.integration.node.test.ts`. ``
- Open Questions, Q2 Human decision, append: `A locally edited merge-3way file reads \`→ asks: keep, take or edit\` without --yes and \`→ overwritten, local edits lost\` with --yes.`
- Open Questions, Q1 Human decision, append: `The dry run applies the same rule: a file the run would leave unchanged gets no per-file line, except a host surgery target (.claude/settings.json, .mcp.json, CLAUDE.md), whose line §4 keeps; one line \`[dry-run] <U> unchanged (not listed)\` precedes \`N files planned\`.`
- §5 Gherkin: no change; the new behaviour is covered by the unit case "unchanged files omitted" in `upgrade-output.red.node.test.ts`.

**C-4 · BUG-134.**
- §4, append: `` Only upgrade's take path changes: a new `mergeUpstreamSettings` in `merge-settings.ts`, called from `mergeSurgeryTarget` in `hosts/claude.ts` and `hosts/codex.ts`. `mergeSettings`, the install paths and `upgrade.ts` are unchanged. New integration red: `cleargate-cli/test/commands/upgrade-settings-order.red.integration.node.test.ts`. ``
- Open Questions, Human decision, append: `Events keep the user's placement: an event only the user has stays before the ClearGate event it preceded; an event upstream adds takes upstream's position.`

## Decisions needing the owner

None. C-3 is the only clarification that widens behaviour, and it implements the Gate 2 Goal Acceptance Check wording.

## Proof runs (rule 20)

**CR-120 proof** (in its cli worktree): `CLEARGATE_SPRINT_DIR=OUTER/.cleargate/sprint-runs/SPRINT-44 node scaffold/core/.cleargate/scripts/count_tokens.mjs SPRINT-44 --json`. Record `subagent.dispatches`/`by_agent_type`; the orchestrator compares them with the holdout.

**dispenser_adapter sprints** (CR-120 and 064-01 real runs):
1. `git clone --no-hardlinks <dispenser> <scratch>/disp`.
2. `rsync -a <dispenser>/.cleargate/sprint-runs/SPRINT-0N/ <scratch>/disp/.cleargate/sprint-runs/SPRINT-0N/`. This brings the untracked ledger, events and state.
3. Run with `CLEARGATE_SPRINT_DIR=<scratch>/disp/.cleargate/sprint-runs/SPRINT-0N`.
- The ledger's absolute `transcript` paths still resolve, and git runs on the clone (`--all` covers its `origin/*` refs).
- 064-01's run uses the integrated tree: `node scaffold/core/.cleargate/scripts/sprint_metrics.mjs SPRINT-0N --json`.

**BUG-133 / BUG-134 RC:**
1. In the item's cli worktree: `npm run prebuild && npm run build && npm pack --pack-destination <scratch>` (pack runs no lifecycle script).
2. `npm install --prefix <scratch>/rc --cache <scratch>/npm-cache --no-save <scratch>/cleargate-0.30.1.tgz`. Never global: the global cleargate drives the live hooks.
3. Two fresh clones of dispenser_adapter:
   - (A) at HEAD (installed 0.30.1): Goal check 2 as written;
   - (B) checked out at the parent of its commit `chore(cleargate): upgrade ClearGate 0.28.0 to 0.30.0`. That is a real 0.28.0 install whose `settings.json` lacks the ClearGate `PostToolUse Bash` group and carries a user `Stop` event first, so the settings take path really runs and the release-notes range is non-empty.
4. In each clone: `CLEARGATE_NO_UPDATE_CHECK=1 node <scratch>/rc/node_modules/cleargate/dist/cli.js upgrade --dry-run`, then `… upgrade --yes`, then `git diff -- .claude/settings.json` and `git diff --stat`.
5. Save the outputs to `sprint-runs/SPRINT-45/evidence/`. On (A), settings.json is clean, so `--yes` leaves it untouched. (B) is the order proof: only the `PostToolUse Bash` group is added, with `Stop` still first.

The goal-check run uses the final integrated RC.

## Flashcards flagged

- `2026-11-14 · #ledger #transcripts · Workflow .meta.json has no toolUseId/finished; dedupe falls back to agent id. Match interrupts only in user text blocks.`
- `2026-11-14 · #ledger #transcripts · ~46% of subagent assistant lines repeat a message.id with identical usage; count usage once per id, tool_use per block id.`
- `2026-11-14 · #codex #skill · '/workflows' is a banned Codex-render token: a SKILL.md line outside A2 naming subagents/workflows fails prebuild --check.`
- `2026-11-14 · #hooks #snapshot · hooks-snapshots pins canonical token-ledger.sh byte-for-byte; a hook edit adds token-ledger.<item>.sh and demotes the old lock.`
- `2026-11-14 · #upgrade #settings · Real installs put user-only events (Stop) first; a settings merge must anchor them, not append after ClearGate's events.`
- `2026-11-14 · #upgrade #qa-red · Dry-run clean lines are pinned by install-state-parity/field-path (settings.json) and state-parity (CRLF merge-3way).`
- `2026-11-14 · #scripts #git · git -C <subdir> reads the PARENT repo when the subdir has no .git; check rev-parse --show-toplevel == realpath first.`

Version check skipped: no dependency is declared by any M1 item. Protocol numbering: no new protocol section.

### M2.md

# Milestone: M2 — Sprint report reads derived metrics
## Stories: STORY-064-02
## Wave: wave3 (sequential, integrates last)

GOAL_RELATION: advances

role: architect · cli read at main `dbccc79`; C2 stub read at `contract/S-45-metrics` `4720d79`.

## Order

1. Build now in `OUTER/.worktrees/STORY-064-02/cleargate-cli` on `story/STORY-064-02` from base `contract/S-45-metrics` (waves.json). The C2 stub prints a valid "not measured" document, so every path below can be built and tested before integration.
2. QA-Red writes the reds, then the Developer builds, then QA-Verify runs on the build tree.
3. Integrate only after CR-120, STORY-064-01, BUG-117, BUG-133 and BUG-134 have all merged into cli `main` (rule 15). Then QA-Verify runs on the integrated tree and does the SPRINT-44 proof. Merge last (rule 16).

No parallel pair: this is the only item in M2. It shares no file with any other item. The only coupling is the C2 contract.

Task Breakdown: the story is L2 and has no `## Task Breakdown` section, so it gets no rows.

## Per-story blueprint

### STORY-064-02

STORY-064-02 advances the goal by putting `sprint_metrics.mjs`'s derived rework and cost figures (C2) into the one bundle the Reporter reads, and by pointing the template's §3 rows and the Reporter's step 6 at that section, so the report states measured numbers instead of `state.json` counters.

**Cross-story coupling.** It reads C2 only: `scaffold/core/.cleargate/scripts/sprint_metrics.mjs` (owner STORY-064-01), run as a child process. It never imports C1 or C2 code. Use only the frozen C2 keys. `count_tokens.mjs --json` (CR-120 adds keys only) is read exactly as it is today.

**Schema changes.** None: no state, event or frontmatter change. The bundle gains one section, and one heading changes.

#### E1 — `scaffold/core/.cleargate/scripts/prep_reporter_context.mjs`

1. **Heading rename (R3).** Replace the literal `## Token Ledger Digest` with `## Token Ledger Digest (orchestrator window)` at **both** sites: `:259` (success path) and `:349` (`catch` path). The content does not change, and the CR-035 lines `:337-343` stay byte-identical.
2. **New builder `buildMeasuredMetrics(sprintId)`.** Add it right after `buildTokenLedgerDigest` (ends `:351`).
   - Copy the child call from `:247-257`: `path.join(__dirname, 'sprint_metrics.mjs')`, `execSync(\`node "${script}" "${sprintId}" --json\`, { stdio: ['ignore','pipe','pipe'], encoding: 'utf8', env: process.env, timeout: 120000, maxBuffer: 16 * 1024 * 1024 })`.
   - Forward `env: process.env` as `:255` does. This passes `CLEARGATE_SPRINT_DIR`, `CLEARGATE_PENDING_SYNC_DIR` and `CLEARGATE_TRANSCRIPTS_ROOT` on to the child.
   - **Do not pass `cwd`.** The child inherits it. STORY-064-01 resolves its repo list from the sprint dir or cwd, never from the script's own location.
3. **Wire it in `main()`.** Push the builder between `:514` (token digest) and `:515` (flashcard slice).
4. **Update the docblock.**
   - `:17-28`: add `6. Measured Metrics — sprint_metrics.mjs --json (contract C2) as markdown`, renumber Flashcard Slice to 7 and the template pointer to 8, and show item 5's new heading.
   - `:15`: name both children (`count_tokens.mjs --json`, `sprint_metrics.mjs --json`).
   - `:32` is stale: BUG-081 (`:450-470`) already turned a missing ledger into warn + exit 0. Rewrite it as `1 — the bundle could not be written (uncaught fs error)`, and add a line saying that a missing ledger and a failed `sprint_metrics.mjs` both still exit 0. Do **not** bring back an exit 1.
5. **The builder never throws.** Wrap the whole body (run, parse, render) in `try/catch`. Any throw becomes **Case F**.

**Rendering contract.** Render from C2 fields only, and never re-derive.

- **Number format.** `n.toLocaleString('en-US')`. The existing `:269` uses the bare `toLocaleString()`, which depends on the locale; the new code must not.
- **Non-numbers.** Any field that is not a finite number renders as `not measured`.
- **Flags:**
  - `DNM` (doc): `sources.warnings` includes the exact string `dispatch data: not measured`, OR any item has `dispatch_source === 'not measured'`.
  - `itemDNM`: `item.dispatch_source === 'not measured'`.
  - `GNM` (git not measured): `sources.repos.length === 0`. See open decision OD-B.
  - Never detect "not measured" from a zero value (sprint plan :218).
- **Case F (failure).** Covers: `sprint_metrics.mjs` absent (`fs.existsSync` first), non-zero exit, timeout, JSON that will not parse, `schema !== 1`, `items` not an object, or a render throw.
  - The section is the heading plus exactly one line: `dispatch data: not measured (sprint_metrics.mjs <reason>)`.
  - `<reason>` is one of `not found`, `failed: <first line of err.message>`, `unreadable output` or `render failed: <msg>`, cut to 160 chars.
  - `execSync`'s `err.message` holds the whole command plus stderr, so take only line 1.
- **Case N (`DNM` is true).** Lines in this order:
  1. `## Measured Metrics`
  2. `_Source: sprint_metrics.mjs --json (schema 1, generated <generated_at>)_`
  3. `dispatch data: not measured`: one line, the R2 statement.
  4. If `items` is non-empty: the item table (below), where an `itemDNM` row has Dispatches, Wall time, Tokens and Models set to `not measured`, and Rework set to `git: <rework.total>` (or `not measured` when `GNM`).
  5. `Rework (git): <totals.rework> rework rounds, <Σgit> git rework commits.` Both become `not measured` when `GNM`.
  6. The First-pass line, the Disagreements block and the Warnings block (below).
  - Case N has **no** Sources, Totals-tokens, Sprint-level or Unattributed lines. The stub's zeros must never appear (rule 3).
- **Case M (measured).** Lines in this order:
  1. The heading and the `_Source:_` line.
  2. `Sources: <sessions> sessions, <dispatches> dispatch rows, <repos.length> repos.`
  3. The item table.
  4. `Totals: <totals.dispatches> dispatches, <totals.tokens> subagent tokens, <totals.rework> rework rounds, <Σgit> git rework commits.`
  5. The First-pass line.
  6. `Sprint-level: <d> dispatches, <t> tokens.`
  7. `Unattributed: <d> dispatches, <t> tokens, share <(share*100).toFixed(1)>%.`
  8. The Disagreements block and the Warnings block.
- **Item table.**
  - Header: `| Item | Dispatches | Rework red/dev/verify/total | Git rework | Wall time | Tokens | Models |`, then a separator row.
  - One row per `Object.keys(items).sort()`: `| <ID> | <dispatches.total> | <red_corrections>/<dev_reruns>/<verify_reruns>/<total> | <git rework> | <Math.round(wall_ms/60000)>m | <tokens.total> | <models> |`.
  - Git rework is `git.red_corrected + git.rework` (STORY-064-01 R5's definition, summing two C2 fields). It is `not measured` when `GNM`.
  - Models are joined with `, `. With more than 3, show the first 3 plus ` +<n>`. An empty list renders as `-`.
  - When `items` is empty, write the one line `No roster items in the metrics document.` instead of the table.
- **First-pass line.** `First-pass (measured rework total 0): <k> of <n> items.` `k` counts items with `rework.total === 0`. Write `not measured` when `DNM && GNM`.
- **Disagreements block.** A line `Disagreements:`, then one bullet per item with `disagrees === true`, sorted: `- <ID>: derived <rework.total | not measured if itemDNM>, git <Σgit | not measured if GNM>, state.json counter <qa_bounces + arch_bounces>`. With no such item, write the single line `Disagreements: none.` The R1 string is a substring of each bullet.
- **Warnings block.** Leave out the exact `dispatch data: not measured` string. If any warnings remain, write `Warnings (<n>):`, then up to 5 bullets cut to 160 chars, then `- …and <n-5> more (see metrics.json)`. Omit the block when none remain.
- **Budget.** The section stays under 12 × 1024 bytes for 50 items. A 50-row table with 9-digit tokens and 2 models, plus 50 disagreement bullets and 6 warnings, comes to about 10 KB. Never truncate. The 160 KB bundle warning at `:529` is unchanged.

#### E2 — `scaffold/core/.cleargate/templates/sprint_report.md` §3 (`:64-102`)

- **Comment `:66-70`.** Replace line `:69` with these lines. `:67`, `:68` and `:70` stay.
  ```
       First-pass success rate = items with measured rework total 0 / total items × 100
         (source: the bundle's ## Measured Metrics section)
       First-pass success rate (state.json counters) = stories with qa_bounces=0 AND arch_bounces=0 / total stories × 100
         (kept for one release, for comparison)
       Rework rounds, Git rework commits, Subagent tokens and Unattributed share (measured) come from
         ## Measured Metrics; write "not measured" where it says so, never 0.
       Orchestrator window tokens (ledger) comes from ## Token Ledger Digest (orchestrator window).
  ```
- **Rows.**
  - Insert after `:85` (`Total Arch bounces`): `| Rework rounds (measured) | N |` and `| Git rework commits (measured) | N |`.
  - Insert after `:97` (`**First-pass success rate**`, label unchanged): `| First-pass success rate (state.json counters) | N% |`, `| Subagent tokens (measured) | N tokens |`, `| Unattributed share (measured) | N% |` and `| Orchestrator window tokens (ledger) | N tokens |`.
- **Untouched.** `:78-83` (the six `close_sprint.mjs:451-458` rows), `:84-85`, the frontmatter and `template_version: 2`.

#### E3 — `scaffold/hosts/claude/.claude/agents/reporter.md`

- **Step 6, after `:129`.** Insert, indented to match:
  ```
        Fill the rework, first-pass and cost rows (Rework rounds (measured), Git rework commits (measured),
        First-pass success rate, Subagent tokens (measured), Unattributed share (measured)) from the bundle's
        `## Measured Metrics` section, and Orchestrator window tokens (ledger) from
        `## Token Ledger Digest (orchestrator window)`. Fill First-pass success rate (state.json counters),
        Total QA bounces and Total Arch bounces from the State.json Summary.
        Name a state.json counter only for an item the bundle lists under Disagreements.
        Where the bundle says "not measured", write "not measured" in the row, never 0.
  ```
- **`:94`.** Change `` `## Token Ledger Digest` `` to `` `## Token Ledger Digest (orchestrator window)` ``. This is step 2's pointer, which the rename would otherwise leave stale.
- **Do not touch `## Capability Surface` (`:47-55`).** `reporter-content.live.integration.node.test.ts:22-48` byte-compares that slice against the live file, and an edit there would add a known red. Leave the Scripts row as it is (no `sprint_metrics.mjs`).

#### E4 — `scaffold/hosts/codex/.codex/agents/reporter.toml`

Generated, never hand-edited. Run `npm run gen:codex` after E3. `codex-agents-codegen.red.node.test.ts:93` pins the TOML to the canonical body. `prebuild` (`build-codex-payload.mjs --check`) is the real freshness check: `npm run gen:codex -- --check` ignores `--check` (flashcard 2026-11-10 #codegen). It must leave no diff on a re-run at integration.

**Reuse (no duplication).**
- `stageCanonicalScripts()` from `test/helpers/scaffold-roots.ts:117`.
- `canonicalPath()` from the same helper.
- The child-process pattern at `prep_reporter_context.mjs:246-257`.

Nothing has merged into cli `main` this sprint (tip `dbccc79`), so there is no further adjacent export to reuse. Do not add `lib/` modules: §3.1 says no new source files.

**Gotchas from code inspection.**
- `prep_reporter_context.mjs:539` calls `main()` with no import guard. Never import it from a test (flashcard 2026-11-12 #qa-red). Do not add an `import.meta` guard either: `close_sprint.mjs:322-333` runs the script by a path that may be symlinked, and a guard that misses would silently skip `main()` (flashcard 2026-09-26 #codex #danger).
- `close_sprint.mjs:1268-1323` Step 3.5 runs this script with `stdio: 'inherit'`. A slow child slows close, which is why the 120 s `timeout` falls through to Case F.
- `template-stubs.integration.node.test.ts:211-215` byte-compares live `REPO_ROOT/.cleargate/templates/sprint_report.md` with canonical and has **no worktree skip**. It goes red in the build tree and the merge lane as soon as E2 lands (see OD-A). `canonical-live-parity` 5a (`:183`) behaves the same way. 5c (`:227`) goes red only in the merge lane.
- `test_close_sprint_v21.integration.node.test.ts:626-718` (Sc 9/10) reaches this script through close. Those tests check exit codes and messages only, not bundle content, so they stay unchanged. Run them as targeted tests at integration.
- In a canonical by-path run, `REPO_ROOT` (`:54`) resolves to `cleargate-cli/scaffold/core`. The flashcard slice then reads the seed `FLASHCARD.md`, the git digest finds no branch, and the archive is never searched. Pass `CLEARGATE_PENDING_SYNC_DIR` to find a closed sprint's plan.

#### Test scenarios (QA-Red covers all; reds live in two new files, see SC-2)

`test/scripts/prep-reporter-measured-metrics.red.node.test.ts`:
- **Seam.** Make a second `stageCanonicalScripts()` copy and overwrite its `sprint_metrics.mjs` with a fixture script.
  - The fixture exits 2 unless argv has `--json`.
  - Otherwise it prints the JSON file named by env `FIXTURE_C2_PATH`, adding the warning `env-forwarded:<CLEARGATE_SPRINT_DIR>`.
  - `FIXTURE_C2_MODE=fail|garbage` makes it exit 1, or print non-JSON.
  - C2 documents are built inline in TS. Nothing goes under `test/fixtures/` (rule 11; no collision with STORY-064-01's fixture dir).
  - The untouched first copy runs the real C2 script.
- **Every spawn** sets these: `CLEARGATE_SPRINT_DIR` and `CLEARGATE_PENDING_SYNC_DIR` (tmp), `CLEARGATE_TRANSCRIPTS_ROOT` (an empty tmp dir), and `cwd` (a tmp dir that is not a git repo).
- **Section slicing.** Slice the section from `\n## Measured Metrics\n` to the next `\n## ` (flashcard 2026-11-12 #tpv anchor).

1. **Gherkin Sc1 (@paths).** A measured fixture with 2 items.
   - `\n## Measured Metrics\n` comes after `\n## Token Ledger Digest (orchestrator window)\n`.
   - Both item rows show dispatches, `r/d/v/t` and tokens.
   - The section contains `env-forwarded:<tmp sprint dir>` (R1 forwarding).
2. **Gherkin Sc2 (@rules).** STORY-A: `rework.total` 2, git `red_corrected` 1 + `rework` 1, counters 0/0, `disagrees: true`. STORY-B: 1/1/1, `disagrees: false`.
   - The section contains `STORY-A: derived 2, git 2, state.json counter 0`.
   - No line matches `/^- STORY-B: derived/m`.
3. **Gherkin Sc3 (@paths).** Run the real staged C2 script (the stub until integration). The ledger's `transcript` points at a missing tmp path, and `state.json` holds a 2-item roster.
   - Exit 0, and the section has the line `dispatch data: not measured`.
   - It contains no `subagent tokens`, `Sprint-level:` or `share ` text.
   - Every rendered item row has `not measured` in the Dispatches and Tokens cells. This is vacuous on the stub, where `items` is `{}`. QA-Verify must see it non-vacuous on the integrated tree.
4. **R2 failure.** `FIXTURE_C2_MODE=fail`, then `garbage`, then a staged copy with `sprint_metrics.mjs` deleted. Each gives exit 0 and a section of exactly one non-empty line after the heading, starting `dispatch data: not measured (sprint_metrics.mjs `.
5. **Budget.** A 50-item measured fixture: all items disagree, 2 models each, 9-digit tokens, 6 warnings. Section `Buffer.byteLength < 12 * 1024`. Also assert the row count is 50, so the test cannot pass vacuously.
6. **Case N with items.** `DNM` warning plus 2 items with `dispatch_source: "not measured"` and `repos: ['.']`. Rows show `git: <n>`, and no line starts `Sprint-level:` or `Unattributed:`.

`test/agents/reporter-measured-metrics.red.node.test.ts`:

7. **Gherkin Sc4 (@rules).**
   - Extract the regex list from `close_sprint.mjs` source, sliced from `const requiredMetricRows = [` to `];`, rather than hardcoding it (flashcard #docs #tpv: assert the code fact). Assert each regex matches the canonical template.
   - The template contains `Rework rounds (measured)`, `Git rework commits (measured)`, `First-pass success rate (state.json counters)`, `Subagent tokens (measured)`, `Unattributed share (measured)`, `Orchestrator window tokens (ledger)`, `| Total QA bounces |`, `| Total Arch bounces |` and `items with measured rework total 0 / total items × 100`.
   - The reporter.md step 6 slice runs from `\n6. **Synthesize**` to `\n7. **`. It contains `## Measured Metrics`, `not measured`, `never 0` and `Disagreements`.
   - reporter.md contains `## Token Ledger Digest (orchestrator window)`.

Unchanged and still required green: `test_prep_reporter_context.node.test.ts` (CR-035 Sc1/Sc2 pin only the `sprint_*_tokens` lines), `reporter-content.node.test.ts`, `close-sprint-hardening-043-05.red.node.test.ts` S3 and `test_close_sprint_v21` Sc1.

§4.1 mapping: Unit ×2 = scenarios 1 and 2 (render, filter). Integration ×1 = scenario 3. Acceptance ×4 = scenarios 1, 2, 3 and 7. Scenarios 4-6 cover R2 and the budget.

#### Existing tests that pin changed text

| File:line | Pins | Must change? |
|---|---|---|
| `grep "Token Ledger Digest" test/` | nothing | No: no test pins the heading |
| `test/scripts/test_prep_reporter_context.node.test.ts:269,272,275,324-328` | CR-035 lines inside the digest | No: content unchanged |
| `test/agents/reporter-content.node.test.ts:18-138` | Capability Surface, Brief, output name | No: E3 leaves them alone |
| `test/agents/reporter-content.live.integration.node.test.ts:22-48` | Capability Surface to Your-one-job slice, live = canonical | No: stays green because E3 leaves that slice alone |
| `test/scripts/test_close_sprint_v21.integration.node.test.ts:277-285` | the six row names in reporter.md | No: kept |
| `test/scripts/close-sprint-hardening-043-05.red.node.test.ts:508-556` | `template_version: 2`, §§1-7 names | No: kept |
| `test/scripts/status-vocab-phase-b.red.node.test.ts:80` | the template `Status:` vocabulary | No: `:19`/`:49` untouched |
| `test/scripts/codex-agents-codegen.red.node.test.ts:93` | reporter.toml = canonical body | No: regenerate (E4) |
| `test/scripts/template-stubs.integration.node.test.ts:211-215` | live === canonical `sprint_report.md` | **Red by design (OD-A).** Never edit the test, never hand-port live |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts:183` (5a), `:227` (5c) | live = canonical templates and agents | Known red (rule 17). No edit |

No existing assertion has to change, so QA-Red has no existing-test edits. If integration produces a conflict inside a test, it goes to QA-Red (rule 15).

**Integrated-tree check (rule 15).**
1. In the cli worktree: `git merge --no-ff main`.
2. `npm run gen:codex` must leave no diff. Then `npm run prebuild` and `npm run typecheck`.
3. `npm run test:file --` on both red files, `test_prep_reporter_context`, `reporter-content`, `codex-agents-codegen`, `test_close_sprint_v21` and `scripts-fence-bug098`.
4. QA-Verify confirms scenario 3 is non-vacuous: rows exist, with `not measured` cells.

**Proof at merge (rule 8/20, QA-Verify on the integrated tree).** Run the SPRINT-44 bundle by path, then restore the outer tree:
```
OUTER=/Users/ssuladze/Documents/Dev/ClearGate; CLI=$OUTER/.worktrees/STORY-064-02/cleargate-cli
EV=$OUTER/.cleargate/sprint-runs/SPRINT-45/evidence/STORY-064-02; mkdir -p "$EV"; cd "$OUTER"
CLEARGATE_SPRINT_DIR=$OUTER/.cleargate/sprint-runs/SPRINT-44 \
CLEARGATE_PENDING_SYNC_DIR=$OUTER/.cleargate/delivery/archive \
ORCHESTRATOR_PROJECT_DIR=$OUTER bash $OUTER/.cleargate/scripts/run_script.sh \
  node "$CLI/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs" SPRINT-44
cp .cleargate/sprint-runs/SPRINT-44/.reporter-context.md "$EV/SPRINT-44.reporter-context.md"
mv .cleargate/sprint-runs/SPRINT-44/metrics.json "$EV/SPRINT-44.metrics.json"
git checkout -- .cleargate/sprint-runs/SPRINT-44/.reporter-context.md   # tracked; restore
git status --porcelain .cleargate/sprint-runs/SPRINT-44                  # must be empty
```
- The evidence is the section in `$EV`, read against the holdout by QA-Verify or the orchestrator (rule 10).
- The SPRINT-45 bundle exists only at close, so this item's rule-8 evidence completes at close (OD-C).

## Cross-story risks

- **STORY-064-01 × 064-02 (C2 meaning).** C2 fixes the key names but not two meanings that 064-02 renders: whether `sources.repos` lists repos read or repos configured (the `GNM` test), and whether `totals.tokens` covers every subagent dispatch (the "Subagent tokens (measured)" row and the `share` denominator). See SC-3. Until that lands, 064-02 renders C2 values under C2 names and never infers.
- **STORY-064-01 writes `<sprintDir>/metrics.json` (R1).** Every prep run now leaves that file behind: in test tmp dirs (harmless), in close (intended), and in SPRINT-44 during the proof (moved to evidence above).
- **CR-120 × 064-02.** `count_tokens.mjs --json` is read at `:258-298`. CR-120 adds keys only, so there is no change here.
- **Wiki fixture.** `test/wiki/fixtures/extract/SPRINT-44_REPORT.md:133-147` quotes the old §3 rows. It is a static report fixture, not the template, so it does not change.

## Open decisions

**OD-A (owner — genuine gap in the Gate-2 known-red list).** `template-stubs.integration.node.test.ts:211` (`sprint_report.md: live === mirror`) goes red from E2 alongside 5a and 5c. The owner approved three parity failures (sprint plan :222, :280); this would be a fourth, for the same reason (live is frozen by rule 9), and DevOps's "exactly those" check would stop on it. **Recommended:** record it in sprint §6 as known red at the STORY-064-02 merge together with 5a and 5c, with no hand-port and no test edit. Mid-Sprint Amendment text: `<ts> · STORY-064-02 · known red added: template-stubs.integration :211 sprint_report.md live === mirror (same rule-9 cause as parity 5a)`.

**OD-B (orchestrator).** Route SC-3 to STORY-064-01's build before it hands over C2's body.

**OD-C (orchestrator — Goal Acceptance Check 3 at close).** Live `close_sprint.mjs` Step 3.5 runs the live, frozen `prep_reporter_context.mjs`, and the Reporter runs the frozen live `reporter.md` and template, so SPRINT-45's own bundle would have no Measured Metrics section. **Recommended recipe:**
1. Before Step 3.5, run the canonical prep by path for SPRINT-45. Use the command above with `SPRINT-45` and `CLEARGATE_PENDING_SYNC_DIR=$OUTER/.cleargate/delivery/pending-sync`.
2. Move its bundle to `evidence/STORY-064-02/SPRINT-45.reporter-context.canonical.md`.
3. Let Step 3.5 write the live bundle, which keeps the real flashcard slice and git log.
4. In the Reporter brief, name the canonical file's `## Measured Metrics` section as a second input. Paste E3's step-6 text and point at the canonical template `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md` for the §3 rows.
5. Never edit live (rule 9).

## Recommended CR:spec-clarification

**SC-1: STORY-064-02 §1.2 R2.**
- Old: "If `sprint_metrics.mjs` fails or reports dispatch data "not measured", the section says so in one line, and the bundle is still written with exit 0. The existing exit-1 rule for a missing `token-ledger.jsonl` is unchanged."
- New: "If `sprint_metrics.mjs` fails (missing, non-zero exit, timeout or unreadable output), the section is one line, `dispatch data: not measured (sprint_metrics.mjs <reason>)`. If it reports dispatch data "not measured", the section states `dispatch data: not measured` on one line and still lists the roster items, with dispatch, wall-time, token and model cells shown as "not measured" and rework taken from git (contract C2). Either way the bundle is written and the script exits 0. Missing-ledger handling is unchanged: `count_tokens.mjs` exits 1, and `prep_reporter_context.mjs` warns and still writes the bundle (BUG-081)."
- Why: `prep_reporter_context.mjs` has no exit-1 rule since BUG-081 (`:450-470`), and C2 requires the per-item fallback to git.

**SC-2: STORY-064-02 §3.1.**
- Old: `| Test Files | \`cleargate-cli/test/scripts/test_prep_reporter_context.node.test.ts\`, \`cleargate-cli/test/agents/reporter-content.node.test.ts\` |` and `| New Files Needed | No |`.
- New: `| Test Files | \`cleargate-cli/test/scripts/prep-reporter-measured-metrics.red.node.test.ts\`, \`cleargate-cli/test/agents/reporter-measured-metrics.red.node.test.ts\`, \`cleargate-cli/test/scripts/test_prep_reporter_context.node.test.ts\`, \`cleargate-cli/test/agents/reporter-content.node.test.ts\` |` and `| New Files Needed | Yes — the two red test files only; no new source file |`.
- Why: the sprint's red naming is `*.red.node.test.ts`, and the existing files stay unchanged.

**SC-3: STORY-064-01 §1.2 R10 (append one sentence; no key is renamed or retyped, C2 freeze holds).**
- Old: "… Each item carries `dispatches`, `rework`, `git`, `wall_ms`, `tokens`, `models`, `state_counters`, `disagrees`, `dispatch_source`. No prompt or message text is copied."
- New: "… No prompt or message text is copied. `totals.dispatches` and `totals.tokens` cover every subagent dispatch read (items, sprint-level and unattributed), so `unattributed.share = unattributed.tokens / totals.tokens`; `totals.rework` sums the items' `rework.total`; `sources.repos` lists only the repos actually read, and a skipped path appears only in `sources.warnings`."

Dependency check: no package is added (EPIC-064 rule), so there was no `npm view` to run.

## Git Log Digest

Git log unavailable for sprint/S-45 (branch not found).

## Token Ledger Digest (orchestrator window)

**Total:** 1,664,452,873 tokens (input: 15,440 / output: 10,203,268 / cache_read: 1,626,768,293)

**Per-agent breakdown:**
- architect: 18,224,550 (3 dispatches)
- developer: 20,447,850 (12 dispatches)
- qa: 20,220,382 (20 dispatches)
- unattributed: 1,583,461,509 (14 dispatches)
- devops: 22,098,582 (6 dispatches)
- general-purpose: 0 (1 dispatches)
- code-simplifier:code-simplifier: 0 (1 dispatches)

**Anomalies:**
- unassigned: 140.6× higher than median story cost

**CR-035 two-line split (pre-computed for Reporter §3):**
sprint_work_tokens: 1,664,452,873
sprint_total_tokens: 2,127,104
reporter_pass_tokens: null


## Measured Metrics

_Source: sprint_metrics.mjs --json (schema 1, generated 2026-11-14T12:52:57.230Z)_

Sources: 1 sessions, 43 dispatch rows, 3 repos.

| Item | Dispatches | Rework red/dev/verify/total | Git rework | Wall time | Tokens | Models |
|---|---|---|---|---|---|---|
| BUG-117 | 3 | 0/0/0/0 | 0 | 29m | 1,621,728 | claude-sonnet-5-5 |
| BUG-133 | 9 | 0/0/0/0 | 3 | 49m | 7,433,143 | claude-sonnet-5-5 |
| BUG-134 | 7 | 1/1/0/2 | 2 | 49m | 6,705,235 | claude-opus-5-5, claude-sonnet-5-5 |
| CR-120 | 4 | 0/0/0/0 | 0 | 39m | 5,137,651 | claude-sonnet-5-5 |
| STORY-064-01 | 7 | 1/0/0/1 | 4 | 49m | 5,616,451 | claude-sonnet-5-5 |
| STORY-064-02 | 4 | 0/1/0/1 | 0 | 7m | 2,132,253 | claude-sonnet-5-5 |

Totals: 43 dispatches, 76,802,368 subagent tokens, 4 rework rounds, 9 git rework commits.

First-pass (measured rework total 0): 3 of 6 items.

Sprint-level: 6 dispatches, 43,846,819 tokens.
Unattributed: 3 dispatches, 4,309,088 tokens, share 5.6%.

Disagreements:
- BUG-133: derived 0, git 3, state.json counter 0
- BUG-134: derived 2, git 2, state.json counter 1
- STORY-064-01: derived 1, git 4, state.json counter 0
- STORY-064-02: derived 1, git 0, state.json counter 0

## Flashcard Slice

No flashcard entries found in sprint window [2026-11-14 → 2026-11-17].

## REPORT Template

Template path: `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md`
