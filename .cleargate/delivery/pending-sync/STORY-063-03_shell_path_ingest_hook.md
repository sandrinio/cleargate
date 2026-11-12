---
story_id: STORY-063-03
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 STORY-063-03; grounded against cleargate-cli main 2026-11-12.
area: hooks,wiki,cleargate-cli
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:11:56Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:11:56Z
  sessions: []
---

# STORY-063-03: Shell-Path Ingest Hook
**Complexity:** L2 — one new hook script, one settings matcher and one CLI handler, with a strict time budget on the no-op path.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want work items changed by shell commands and CLI writes to reach the wiki the same way Edit/Write changes do, so that a `git mv` into `archive/` or a `cleargate sprint add` never leaves the wiki pointing at the old state.

### 1.2 Detailed Requirements
- **R1 — trigger.** A PostToolUse hook on the `Bash` tool (`post-shell-ingest.sh`, wired in `settings.json`) runs after every Bash call.
- **R2 — what counts as changed.** Since the hook's previous run, a `.cleargate/delivery/**/*.md` file was:
  - **Added:** untracked or staged.
  - **Modified:** content changed, including a second `sed -i` on a file that was already dirty.
  - **Renamed or moved:** `git mv`, or a plain `mv`, which keeps the file's mtime.
  - **Committed in the same command:** HEAD moved, and the files in the diff from the old HEAD to the new one count as changed.
- **R3 — action.** Each changed file is passed to `cleargate wiki ingest`. Deleted files are skipped: lint already reports orphan pages, and orphan cleanup is out of scope.
- **R4 — output.** Results go through `cleargate hook emit-context --host <host> --event PostToolUse` (from STORY-063-02):
  - `✅ ingested as <bucket>/<ID>.md` for each file ingested;
  - `⚠️ wiki ingest failed: …` for each ingest failure;
  - the `🔎 contradiction check pending` directive when ingest emits `phase4:`.

  When nothing changed, the hook prints nothing.
- **R5 — budget (EPIC-063 §3).** On a Bash call that changes no delivery file, the hook adds p95 ≤ 150 ms. It is measured by timing 20 runs of the hook fed a recorded Bash payload, before and after, on the same machine at the same load. Starting the CLI took about 250 ms (measured 2026-11-12, under load average 10–13), so **the no-op path must not start node**. It compares a cheap git-plumbing fingerprint with a snapshot and exits.
- **R6 — never blocks.** The hook exits 0 on every path, including a missing snapshot, a git error, or a CLI failure. Snapshot state lives under the gitignored `.cleargate/hook-log/` (`.cleargate/.gitignore:13`).

### 1.3 Out of Scope
- Changes made outside the agent's tools, such as the human editing in an IDE; those are caught at the next agent Bash call, or by `wiki build`.
- Removing orphan pages for deleted files.
- Codex: its shell tool's PostToolUse event needs its own matcher in `cleargate-cli/scaffold/hosts/codex/.codex/hooks.json`. That is added for parity, with no live Codex run (EPIC-063 rule).

### 1.4 Open Questions
- None. The fingerprint mechanism is the Architect's choice, within R2, R5 and R6.

### 1.5 Risks
- **Risk:** A fingerprint that misses a change type (same-size `sed -i` within one second; plain `mv`) silently re-creates the gap.
- **Mitigation:** Fingerprint on content (`git hash-object` of the dirty delivery files), the path list (porcelain output) and HEAD, never on mtime alone. There is one hook-contract test per change type in R2.
- **Risk:** Under a heavy machine load the budget test is flaky.
- **Mitigation:** Measure before and after in the same run and compare them (EPIC-063 §3 method), rather than against an absolute number taken on another machine.
- **Risk:** More frequent wiki writes make [[BUG-086]] (DevOps merges failing on the orchestrator's own wiki changes) worse.
- **Mitigation:** The Architect checks the merge path against this hook in the M1 plan.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Several successful change routes: rename, plain move, in-place edit, CLI write, same-command commit. |
| Interfaces | F | One surface, the Bash PostToolUse hook. Codex parity is a config entry with no behaviour of its own here. |
| Data | T | Change types differ in shape (path change vs content change vs HEAD change); covered by one outline. |
| Rules | T | Budget rule on the no-op path; never-block rule. |

```gherkin
Feature: Shell-path ingest hook

  @paths @data
  Scenario Outline: Shell and CLI changes reach the wiki
    Given CR-X has a current wiki page
    When the agent runs <command> via the Bash tool
    Then by the time the hook returns, CR-X's wiki page shows <result>
    And the agent's context receives "✅ ingested as crs/CR-X.md"

    Examples:
      | command                                                       | result                         |
      | `git mv` of CR-X from pending-sync/ into archive/             | raw_path under archive/        |
      | plain `mv` of CR-X into archive/                              | raw_path under archive/        |
      | `sed -i` changing CR-X's status (file already dirty)          | the new status                 |
      | a cleargate CLI command that rewrites CR-X's frontmatter      | the rewritten value            |
      | a script that edits CR-X and commits it in the same command   | the edited value               |

  @rules
  Scenario: Deleted files are skipped and drafts still get the directive
    Given CR-Y is deleted with `git rm` and CR-Z is an unapproved Draft changed by `sed -i`
    When the hook runs
    Then no ingest runs for CR-Y and no error is reported for it
    And the agent's context receives "🔎 contradiction check pending for CR-Z"

  @rules
  Scenario: Bash calls that touch no work item stay within budget
    Given no file under .cleargate/delivery/ changed since the hook's last run
    When the hook runs 20 times on a recorded `ls` payload
    Then it starts no node process and prints nothing
    And its p95 added time is ≤ 150 ms compared with the no-hook baseline measured in the same run

  @rules
  Scenario: Error — a failing ingest is reported and the hook still exits 0
    Given a moved delivery file whose frontmatter cannot be parsed
    When the hook runs
    Then the agent's context receives "⚠️ wiki ingest failed"
    And the exit code is 0
    And a missing or corrupt snapshot file also leads to exit 0, followed by a full re-check on the next run
```

### 2.2 Verification Steps (Manual)
- [ ] After the live re-sync, `git mv` a test item into `archive/` in a real Claude Code session and check that `wiki/<bucket>/<ID>.md` `raw_path` is updated before the next prompt.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/hosts/claude/.claude/hooks/post-shell-ingest.sh` (new, in the verified directory `cleargate-cli/scaffold/hosts/claude/.claude/hooks/`) |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/settings.json`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks.json`, `cleargate-cli/src/cli.ts`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/lib/harness.sh`, `cleargate-cli/test/hooks/post-shell-ingest.node.test.ts` |
| New Files Needed | Yes — `post-shell-ingest.sh` and its test `cleargate-cli/test/hooks/post-shell-ingest.node.test.ts`. A Codex copy of the hook script is needed only if the Architect finds `hooks.json` cannot point at the Claude one. |

### 3.2 Technical Logic
- `post-shell-ingest.sh` (thin adapter, same resolver block as `stamp-and-gate.sh:12-23`, repo root via `cg_repo_root` in `lib/harness.sh:30`):
  1. **Fast path, no node:** compute a fingerprint from:
     - `git rev-parse HEAD`;
     - `git status --porcelain=v1 -uall -- .cleargate/delivery`, `.md` paths only;
     - `git hash-object` of those dirty paths.
     If it equals the snapshot in `.cleargate/hook-log/shell-ingest.snapshot`, exit 0.
  2. **Slow path:** call `cleargate hook shell-ingest --since <snapshot>`, a new hidden handler under `cleargate-cli/src/cli.ts:579`. It works out the changed paths (R2), runs ingest on each, and prints result lines. Pipe those into `cleargate hook emit-context`, write the new snapshot, and exit 0.
- `settings.json`: add a second PostToolUse entry with matcher `Bash` pointing at the new script (next to the `Edit|Write` entry at `:48`).
- Files Edit/Write already ingested show up once as "changed" on the next Bash call. Re-ingesting them is a no-op (ingest idempotency) and costs one slow-path run. That is accepted.

## Task Breakdown
- [ ] Red hook-contract tests: one per outline row, the budget scenario (no node spawned, timing vs baseline) and the error scenario, in a temp git repo.
- [ ] `cleargate hook shell-ingest` handler (change detection per R2, ingest, result lines).
- [ ] `post-shell-ingest.sh` fast path and snapshot; settings.json and Codex hooks.json entries.
- [ ] typecheck plus the full `npm test`; local live re-sync and the manual check in §2.2.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | Change detection in the handler: rename, same-command commit, deleted file skipped. EPIC-063 level: unit. |
| Integration tests | 8 | Hook-contract tests running the real script in a temp git repo: 5 outline rows, the delete/directive scenario, the budget scenario and the error scenario. EPIC-063 level: hook-contract. |
| E2E / acceptance tests | 0 | The live `git mv` case is proved in STORY-063-07. EPIC-063 level: live end-to-end belongs there. |
| Performance test | 1 | No-op path: 20 runs on a recorded `ls` payload, p95 added time ≤ 150 ms against the no-hook baseline taken in the same run (EPIC-063 §3). |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/settings.json:48`. The only PostToolUse matcher today (`Edit|Write`), so shell and CLI writes never trigger ingest.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/stamp-and-gate.sh:12-23`. The CLI resolver block the new hook copies.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/lib/harness.sh:30` (`cg_repo_root`).
- **Surface:** `cleargate-cli/src/cli.ts:579`. The `cleargate hook` command that hosts the new handler.
- **Coverage of this requirement:** partial. Ingest itself is reused unchanged; change detection and the Bash trigger are new.

## Prior work

- [[EPIC-063]] — parent.
- [[CR-093]] — narrowed `stamp-and-gate.sh` to `.md` files. The same filter applies here.
- [[BUG-086]] — DevOps merges vs orchestrator wiki changes; see §1.5.

## Why not simpler?

- **Smallest existing surface that could carry this:** the `Edit|Write` PostToolUse entry, by widening its matcher to `Bash`.
- **Why isn't extension / parameterization / config sufficient?** `stamp-and-gate.sh` reads `tool_input.file_path`, which a Bash payload does not have; a Bash command does not say which files it touched. Parsing command text misses CLI writes and scripts. Running `wiki build` per Bash call misses the budget by orders of magnitude, and today it also deletes sprint reports (STORY-063-04). Change detection against a snapshot is the narrowest reliable signal.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
