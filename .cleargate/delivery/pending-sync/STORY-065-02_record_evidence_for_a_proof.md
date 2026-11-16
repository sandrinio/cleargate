---
story_id: STORY-065-02
parent_epic_ref: EPIC-065
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
approved: true
approved_by: sandrinio
approved_at: 2026-11-16T09:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-065 (approved 2026-11-16) §2 scope and §6 answers; surfaces re-mapped at cleargate-cli 99cbfd7 on 2026-11-16 after SPRINT-46; SPRINT-46 intake items folded in are named in Prior work
actor: Orchestrator at the prove step and the walkthrough; cleargate init/upgrade
complexity_label: L3
area: scripts,cli,init
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-16T07:39:05.602Z
updated_at: 2026-11-16T07:39:05.602Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
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
  last_gate_check: 2026-11-16T07:48:08Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
last_contradict_sha: "5f696d4c44cd0a73a08e5d92649a8600b29fe3431fcd9eb00692b1648180475a"
---

# STORY-065-02: Record Evidence for a Proof
**Complexity:** L3 — one new script with three modes, a shared proof module, the `proof` block in `gate-checks.json`, init seeding and upgrade key preservation.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator, I want one script that runs an item's proof (or records the owner's check) and writes the result to a file, so that "proven" is a record on disk, written by a script, never an agent's claim.

### 1.2 Detailed Requirements
- **R1 — `record_evidence.mjs`.** New script in `scaffold/core/.cleargate/scripts/`:
  - `record_evidence.mjs <ID> [--tier <t>] [--worktree <dir>] [-- <command…>]` runs a command proof.
  - `record_evidence.mjs <ID> --human "<what the owner checked>"` records a human-tier proof (no command runs).
  - The tier comes from `--tier`, else the item's frontmatter `proof_tier` (item file found in `pending-sync/` or `archive/` the way `init_sprint.mjs` `findItemFile` finds it). No tier → exit 2, nothing written.
  - The command comes from the arguments after `--`, else the item's `## Proof` command (`parseProofCommand`), else `gate-checks.json` `proof.<tier>`, else, for `unit` only, `qa.test`. No command for `unit`/`container` → exit 2, nothing written.
  - For `live` or `human` with no command and no `--human`, it writes `status: "pending"` and exits 0 (the prove stage uses this; STORY-065-04).
  - It runs the command with `bash -c` in `--worktree` (default: repo root), records the exit code, and keeps the last 40 output lines with the value of any environment variable whose name contains `TOKEN`, `SECRET`, `KEY` or `PASSWORD` replaced by `***`. A run is bounded by `CLEARGATE_PROOF_TIMEOUT_S` (default 1800); a timeout records `status: "fail"` with `timed_out: true`.
  - **Baseline:** when the command equals `baseline.json`'s `command` and every failing test it names already failed in the baseline, it records `status: "pass"` with `excused: "baseline"` and the names, using `record_baseline.mjs`'s `extractFailing` (an old failure on the sprint base is not held against the item).
  - It writes `<sprintDir>/evidence/<ID>.json` atomically: `{schema_version: 1, id, tier, status: pass|fail|pending, command | note, exit_code, timed_out, excused, tail[], sha, recorded_at, recorded_by: "record_evidence.mjs", mode: command|human|pending, duration_ms}`, where `sha` is `git rev-parse HEAD` in the run directory. It prints the same object as one JSON line on stdout.
  - Exit codes: 0 pass or pending, 1 proof failed (evidence written), 2 could not run (nothing written).
- **R2 — Shared module.** `parseProofCommand` and the `proof_tier` read move from `prep_qa_context.mjs` into a new `lib/proof.mjs` (with `PROOF_TIERS`), beside `lib/work-item-id.mjs`; `prep_qa_context.mjs` imports them. `buildCommands` falls back to `gate-checks.json` `proof.<tier>` when the item has no command, so QA-Verify and the recorder run the same command.
- **R3 — Config.** The scaffold default `gate-checks.json` gains `"proof": {"unit": "", "container": "", "browser": ""}`.
- **R4 — Init seeding.** `detect-test-stack.ts` seeds `proof.unit` with the detected test command and `proof.container` with `make e2e` when a root `Makefile` declares an `e2e:` target (else empty). `GATE_FIELDS` gains both, so `planGateCommands` keeps a non-empty prior value.
- **R5 — Upgrade keeps user keys.** `cleargate upgrade` keeps every key in the user's `gate-checks.json` that the package default does not define, and every non-empty user value under `proof`, in addition to the four it keeps today. When the result is byte-identical to the user's file, upgrade neither rewrites it nor lists it as changed.

### 1.3 Out of Scope
- When the recorder runs (STORY-065-04), the Done guard (065-03), close and report (065-06).
- A browser harness; `proof.browser` is only a slot here.
- Retiring `deferred-verify/` (065-06 reads it for one more release).

### 1.4 Open Questions

- **Question:** Should a baseline-excused unit proof count as `pass`?
- **Recommended:** Yes, with `excused: "baseline"` and the names recorded; the epic requires that an old failure on the sprint base is not recorded against an item, and the report shows the excuse.
- **Human decision:** As recommended (owner, 2026-11-16: "approve as recommended").

### 1.5 Risks

- **Risk:** A proof prints a secret that is not in the environment (read from a file).
- **Mitigation:** Only 40 lines are kept and env-named secrets are masked; the epic's security row asks for no more. The evidence directory sits in the sprint dir, which target repos already track selectively.
- **Risk:** Upgrade restores a user key the package has since renamed.
- **Mitigation:** Only keys absent from the new default are restored; a renamed key appears as both, and the dev report lists any such key found in this repo's and the sandbox's files.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Command mode, human mode, pending mode. |
| Interfaces | T | The recorder CLI, and `cleargate init`/`upgrade` writing the config it reads. |
| Data | T | Command source fallback order through one Outline. |
| Rules | T | Failure recording with secret masking; baseline excuse. |

```gherkin
Feature: Record evidence for a proof

  @paths
  Scenario: A command proof passes and is recorded
    Given STORY-A declares proof_tier "container" and its Proof command is "make e2e"
    When record_evidence.mjs STORY-A runs and the command exits 0
    Then evidence/STORY-A.json records tier "container", status "pass", exit code 0, the commit sha and at most 40 output lines
    And the script exits 0

  @rules
  Scenario: A failing proof is recorded as failed, with secrets masked
    Given STORY-A's Proof command prints the value of API_TOKEN and exits 2
    When record_evidence.mjs STORY-A runs
    Then evidence/STORY-A.json records status "fail" and exit code 2
    And the tail shows "***" where the token value was
    And the script exits 1

  @paths
  Scenario: A human proof and a pending proof are recorded
    Given BUG-C declares proof_tier "human"
    When record_evidence.mjs BUG-C runs with no --human note
    Then evidence/BUG-C.json records status "pending"
    When record_evidence.mjs BUG-C --human "owner saw the controller reconnect" runs
    Then evidence/BUG-C.json records tier "human", status "pass" and that note

  @data
  Scenario Outline: The command comes from the first source that has one
    Given a unit-tier item with <item_cmd> and gate-checks proof.unit <proof_unit> and qa.test <qa_test>
    When record_evidence.mjs runs for it
    Then it <outcome>
    And the QA-Verify context's proof command names the same command (none in the last row)

    Examples:
      | item_cmd          | proof_unit    | qa_test   | outcome                                   |
      | Proof "go test ./x" | "go test ./..." | "make t"  | runs "go test ./x"                        |
      | no Proof command  | "go test ./..." | "make t"  | runs "go test ./..."                      |
      | no Proof command  | ""            | "make t"  | runs "make t"                             |
      | no Proof command  | ""            | ""        | exits 2 and writes no evidence file       |

  @rules @interfaces
  Scenario: A baseline failure is excused, and init and upgrade keep the proof config
    Given baseline.json recorded "go test ./..." failing TestOld
    When the unit proof "go test ./..." fails only on TestOld
    Then evidence records status "pass" with excused "baseline" and TestOld
    And cleargate init in a Go repo whose Makefile has an "e2e:" target seeds proof.unit "go test ./..." and proof.container "make e2e"
    And cleargate upgrade keeps a user-set proof.container and a user key qa.baseline_command
```

### 2.2 Verification Steps (Manual)
- [ ] In a temp clone of the sandbox Go repo, `record_evidence.mjs` on a unit item writes a readable evidence file with the right sha.
- [ ] `cleargate upgrade` twice in a row on an unchanged repo does not list `gate-checks.json` as changed the second time.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/record_evidence.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/scripts/lib/proof.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/gate-checks.json`, `cleargate-cli/src/init/detect-test-stack.ts`, `cleargate-cli/src/commands/upgrade.ts` |
| New Files Needed | Yes — `cleargate-cli/scaffold/core/.cleargate/scripts/record_evidence.mjs`, `cleargate-cli/scaffold/core/.cleargate/scripts/lib/proof.mjs`, `cleargate-cli/test/scripts/record-evidence.red.node.test.ts`, `cleargate-cli/test/init/gate-checks-proof.red.node.test.ts` |

### 3.2 Technical Logic
- Sprint dir: resolve as `merge_story.mjs` and `record_baseline.mjs` do (`.active` sentinel, `CLEARGATE_SPRINT_DIR` override for tests). Item file: the `findItemFile` loop of `init_sprint.mjs:117-130` over `matchesId` from `lib/work-item-id.mjs`; move it into `lib/proof.mjs` and have `init_sprint.mjs` import it rather than keep two copies. Run the command with `commandEnv()` from `record_baseline.mjs`, as the baseline and merge runs do.
- Baseline: read `<sprintDir>/baseline.json`; import `extractFailing` from `record_baseline.mjs` (already exported for `merge_story.mjs`).
- Write the evidence file with a tmp+rename, like `record_baseline.mjs:229-231`.
- Upgrade: extend the restore step at `upgrade.ts:1258-1264` (after `applyTestStack` and `restoreTestWaiver`) with a deep merge of user-only keys and non-empty `proof.*`; extend `withoutGateCommands` (`detect-test-stack.ts:274-293`) so the local-edit comparison ignores the kept keys; compare bytes before writing.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `record_evidence.mjs` (CLI) | exec | None | `<ID> [--tier T] [--worktree W] [-- cmd…]` or `<ID> --human "<note>"` | stdout: one JSON line = the evidence object; exit 0 / 1 / 2 |
| `evidence/<ID>.json` (file) | read | None | — | `{schema_version, id, tier, status, command\|note, exit_code, timed_out, excused, tail[], sha, recorded_at, recorded_by, mode, duration_ms}` — the contract STORY-065-03, 065-04 and 065-06 read |

## Task Breakdown
- [ ] Red tests for the five scenarios (fixture repo with a fake proof command; Go-shaped fixture for init).
- [ ] `lib/proof.mjs`; `prep_qa_context.mjs` imports it and gains the `proof.<tier>` fallback.
- [ ] `record_evidence.mjs`: argument parsing, tier and command resolution, run with timeout, masking, baseline excuse, atomic write, JSON line, exit codes.
- [ ] `gate-checks.json` default `proof` block.
- [ ] `detect-test-stack.ts` seeding and `GATE_FIELDS`.
- [ ] `upgrade.ts` user-key merge and byte-identical skip.
- [ ] Clean-room: `cleargate init` from the packed tarball in a temp Go repo shows the seeded block (EPIC-058 rule 1).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 9 | Scenarios 1–3, four Outline rows, baseline excuse, masking. Epic levels: Unit, Contract (evidence schema). |
| Integration tests | 2 | Init seeding in a Go fixture; upgrade key preservation on a real temp repo. Epic level: Integration. |
| E2E / acceptance tests | 1 | Clean-room init from the packed tarball shows the `proof` block. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Clean-room install evidence recorded in the dev report.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_qa_context.mjs:545-591` — `parseProofCommand` and `buildCommands`; moved to the shared module.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/record_baseline.mjs:21-29,229-231` — baseline shape, `extractFailing`, the atomic write pattern.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/close_sprint.mjs:1339` — reads `deferred-verify/<ID>.json`, the file this one generalises; nothing writes it today.
- **Surface:** `cleargate-cli/src/init/detect-test-stack.ts:152,203,233-304` and `cleargate-cli/src/commands/upgrade.ts:787-796,1236-1264` — seeding and the four keys upgrade keeps.
- **Coverage of this requirement:** partial — the proof reader, baseline and seeding exist; the recorder, the `proof` block and key preservation are new.

## Prior work

- [[EPIC-065]] — parent.
- [[CR-082]] (Completed) — deferred verification; its result file is generalised here and retired one release later.
- [[CR-132]] (Draft) — file-level three-way merge on upgrade; this story keeps keys in `gate-checks.json` only and does not pre-empt it.
- [[BUG-133]] (Completed) — upgrade showed lost local edits; R5 extends its comparison.
- [[BUG-091]] (Draft) — doctor flags a pristine `gate-checks.json`; the seeded block must not add to it (checked in the dev report).
- [[STORY-066-04]] (Completed) — the kickoff baseline the recorder reads.

## Why not simpler?

- **Smallest existing surface that could carry this:** CR-082's `deferred-verify/<ID>.json` read by close Step 2.9.
- **Why isn't extension / parameterization / config sufficient?** That file has no writer, covers only stories that opt in, and is read only at close. A recorder is the missing writer; it reuses the existing proof reader, baseline and atomic-write code rather than adding new ones, and the `proof` block extends the existing config file instead of adding a second one.

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
