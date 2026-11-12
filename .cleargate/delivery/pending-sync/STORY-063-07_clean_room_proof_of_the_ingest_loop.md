---
story_id: STORY-063-07
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-07; grounded against cleargate-cli main 2026-11-12
actor: QA agent running the 0.29.0 release gate
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: clean-room,verification,hooks
db_write_set: []
deferred_verification: []
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T22:57:22Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-11-12T09:52:25Z
  sessions:
    - session: 72e522d7-caa6-4837-81f5-8fa60f84f8b5
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-12T09:33:55Z
---

# STORY-063-07: Clean-Room Proof of the Ingest Loop
**Complexity:** L3 — a new live clean-room driver (real `claude -p` sessions against the packed artifact) plus its automated, model-free test of the driver's own logic. It runs across 063-01..03.

## 1. The Spec (The Contract)

### 1.1 User Story
As the QA agent gating the 0.29.0 release, I want one scripted run against the packed artifact in a real headless Claude Code session, so that "the contradiction check reaches the agent and runs" is proven the way a user would hit it, not only in unit tests that passed while the old hook was broken.

### 1.2 Detailed Requirements
- R1: a new driver, `cleargate-cli/scripts/clean-room/ingest-loop.mjs`, with `run` and `check` modes like `claude-baseline.mjs`. It packs and installs the artifact with `artifact.mjs` (`packArtifact`, `installArtifact`) into a clean room outside the repo, per `.cleargate/knowledge/clean-room-verification.md`.
- R2: it seeds the room before any session.
  - **Neighbour epic:** carries a blunt rule (e.g. "The cache MUST be Redis; an in-process cache is forbidden").
  - **Positive draft:** contradicts that rule ("Replace the Redis cache with an in-process Map") and cites `[[<neighbour ID>]]`.
  - **Negative draft:** cites the same neighbour without contradicting it.
  - Both drafts are authored with `authorProbeEpic` (`cleargate-cli/scripts/clean-room/probe-items.mjs:24`), so each gates 0 and keeps `approved: false`. Then `cleargate wiki build` runs.
- R3: the sessions use the documented headless recipe (`--setting-sources project,local --permission-mode bypassPermissions --output-format stream-json --verbose --include-hook-events`), with a pinned model and raised `--max-turns` / `--max-budget-usd` (see §1.4). The prompts never mention the contradiction check; they only ask for one edit and the item's Brief. The CLAUDE.md rule from 063-02 must do the rest.
- R4: checks recorded per run, all gating for the 0.29.0 release:
  - `claude.live.contradiction-directive`: the PostToolUse `hook_response` for the edit carries the directive as `additionalContext`.
  - `claude.live.contradiction-dispatch`: an Agent `tool_use` with `subagent_type: cleargate-wiki-contradict`, a `SubagentStop` with exit 0, and a new token-ledger row for that agent.
  - `claude.live.contradiction-finding`: `wiki/contradictions.md` gains at least one entry with `neighbor` naming the seeded neighbour (positive draft).
  - `claude.live.contradiction-stamp`: the draft's page `last_contradict_sha` equals the raw file's content hash after the session (both drafts).
  - `claude.live.brief-contradictions-line`: the final assistant message contains a `Contradictions:` line (both drafts).
  - `claude.live.contradiction-negative`: the negative draft is stamped and adds 0 findings.
  - `claude.live.shell-ingest`: after a session that `git mv`s the positive draft into `archive/` via Bash, its page `raw_path` points into `archive/`, and the PostToolUse:Bash hook exits 0.
- R6 (added 2026-11-12, EPIC-063 journeys J3 and J4, from the CR-126 post-flight): two model-free room checks, run in the same room against the installed tarball's real CLI and hooks, with no model session.
  - `claude.live.report-kept` (J3): seed a sprint plan plus `SPRINT-NN_REPORT.md` in the room, run `cleargate wiki build`, and require the sprint page to contain `<!-- BEGIN sprint-report -->`.
  - `claude.live.silent-drop-alarm` (J4): seed an unapproved Draft whose `updated_at` is back-dated by 2 days and which was never contradiction-checked, run the room's `.claude/hooks/session-start.sh`, and require stdout to name it.
  - Both are gating for the 0.29.0 release. They spend no model tokens, so the cost of a re-run is the model sessions alone. `check` reads recorded evidence only and never re-runs them (orchestrator decision 17, O2).
- R5: evidence is appended with `evidence.mjs` in the same table shape as the baseline (`id | room | PASS/FAIL | pointer`). The checks live in their own list, so the baseline's `GATING_CHECKS` (`evidence.mjs:65`) is unchanged.
Delivery constraints (not behaviour; checked in §4.2, not by Gherkin):
- The driver's logic is tested without any live session: fixture seeding, stream-json parsing for each check, and the PASS/FAIL derivation. The test lives under `test/e2e/` as an `*.integration.node.test.ts`, so default `npm test` never spends model tokens. It states its own limits, like `clean-room-claude-baseline.red.integration.node.test.ts`.
- The procedure doc gains a section describing the run and its check ids.

### 1.3 Out of Scope
- The session-brief and orientation eval (STORY-063-12, M2 release gate).
- Codex live runs (EPIC-063 out of scope).
- Making the contradict subagent's judgement deterministic. The positive fixture is made blunt instead (see §1.4 flake policy).

### 1.4 Open Questions

- **Question:** Which model, and how much budget per session? The baseline pins `claude-haiku-4-5-20251001` with `--max-turns 4` and `--max-budget-usd 1` (`claude-baseline.mjs:56`, `:229-247`). This loop needs the agent to read hook context, dispatch a subagent, run `contradict-commit`, then write a Brief.
- **Recommended:** pin `claude-sonnet-5-5`, `--max-turns 12`, `--max-budget-usd 3` per session, three sessions per run (positive, negative, shell move). Override with `--model`.
- **Human decision:** Owner, 2026-11-12 ("do it"): `claude-sonnet-5-5`, 12 turns, $3 per session, 3 sessions per run. **Amended 2026-11-12 (orchestrator, delegated; M1 decision 17):** 20 turns and a 900 s timeout. A live probe showed headless `--max-turns` resets per async-subagent segment while cost accumulates, so the $3 cap still binds.

- **Question:** Flake policy for `contradiction-finding`, which depends on the subagent's judgement.
- **Recommended:** run the positive session up to twice. `contradiction-finding` passes if either attempt records the neighbour, and the evidence records both attempts. Every other check must pass on the first attempt.
- **Human decision:** Owner, 2026-11-12 ("do it"): only the finding check gets up to 2 attempts; every other check must pass first time.

### 1.5 Risks

- **Risk:** the agent ignores the directive in headless mode because CLAUDE.md is not loaded with `--setting-sources project,local`.
- **Mitigation:** the room installs the CLAUDE.md block via `cleargate init`, and project settings include it. The first dry run confirms that `system/init` and the transcript show the rule being followed; if not, that is a 063-02 defect, not a harness one.
- **Risk:** live sessions cost money and time on every release.
- **Mitigation:** it is a manual release gate that runs once per release, not in `npm test` or CI. The budget cap is enforced by `--max-budget-usd`.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Positive (finding), negative (no finding) and shell-move sessions are three distinct successful routes. |
| Interfaces | T | Two hook surfaces proven live: PostToolUse on Edit/Write (directive) and PostToolUse on Bash (shell ingest). |
| Data | F | The fixtures are fixed; behaviour does not vary by data shape inside this story. |
| Rules | T | Flake rule for the finding check; "prompt never mentions the check" rule. |

```gherkin
Feature: Clean-room proof of the ingest loop

  @paths @interfaces
  Scenario: A contradicting draft is checked end to end
    Given a clean room with the packed artifact installed, a seeded neighbour epic, and a positive draft citing it
    When `ingest-loop.mjs run` drives a headless session that edits the draft and asks for its Brief
    Then the transcript shows the PostToolUse directive delivered as additionalContext
    And a cleargate-wiki-contradict dispatch ran and wrote a token-ledger row
    And wiki/contradictions.md gains an entry naming the neighbour
    And the draft's page last_contradict_sha equals the raw file's content hash
    And the final message contains a "Contradictions:" line

  @paths
  Scenario: A consistent draft is stamped with no findings
    Given the negative draft citing the same neighbour without contradicting it
    When the session edits it and asks for its Brief
    Then its page is stamped and wiki/contradictions.md gains no entry for it

  @paths @interfaces
  Scenario: A shell move reaches the wiki
    Given the positive draft's page raw_path points into pending-sync/
    When a session runs `git mv` on it into archive/ via the Bash tool
    Then the PostToolUse:Bash hook exits 0 and the page raw_path points into archive/ before the session ends

  @rules
  Scenario: The finding check tolerates one judgement miss, nothing else does
    Given the first positive attempt records no finding but the second does
    When `ingest-loop.mjs check` evaluates the evidence
    Then contradiction-finding is PASS with both attempts recorded
    And a directive, dispatch or stamp failure on the first attempt is FAIL

  @paths
  Scenario: Model-free room checks walk journeys J3 and J4
    Given the clean room holds a sprint plan with its SPRINT-NN_REPORT.md, and an unapproved Draft back-dated 2 days that was never contradiction-checked
    When `ingest-loop.mjs run` executes `cleargate wiki build` and the room's session-start.sh
    Then the sprint page contains "<!-- BEGIN sprint-report -->" and report-kept is PASS
    And the session-start output names the back-dated Draft and silent-drop-alarm is PASS

  Scenario: Error — a run where the agent never dispatches is recorded as FAIL
    Given a transcript in which the directive was delivered but no Agent tool_use for cleargate-wiki-contradict occurs
    When `ingest-loop.mjs check` evaluates it
    Then contradiction-dispatch, contradiction-stamp and brief-contradictions-line are FAIL with pointers into the transcript
    And the evidence file gains one `id | room | PASS/FAIL | pointer` row per check
    And `check` exits 1
```

### 2.2 Verification Steps (Manual)
- [ ] QA runs `node cleargate-cli/scripts/clean-room/ingest-loop.mjs run --ref main` once against the 0.29.0 release candidate, then `check`. The run passes only on an exit-0 `check`.
- [ ] Read the positive transcript and confirm the directive text and the Brief's `Contradictions:` line by eye.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scripts/clean-room/ingest-loop.mjs` (new) |
| Related Files | `cleargate-cli/scripts/clean-room/artifact.mjs`, `cleargate-cli/scripts/clean-room/evidence.mjs`, `cleargate-cli/scripts/clean-room/probe-items.mjs`, `cleargate-cli/scripts/clean-room/claude-baseline.mjs`, `.cleargate/knowledge/clean-room-verification.md` |
| New Files Needed | Yes — `cleargate-cli/scripts/clean-room/ingest-loop.mjs`, `cleargate-cli/scripts/clean-room/fixtures/ingest-loop/` (neighbour + draft seeds), `cleargate-cli/test/e2e/clean-room-ingest-loop.red.integration.node.test.ts` |

### 3.2 Technical Logic
1. Plain Node ESM under `node` (not `tsx`) that never imports `src/**`, the same rule as `claude-baseline.mjs` (its header J1).
2. `runClaudeSession` (`claude-baseline.mjs:229`) and the ledger helpers (`snapshotLedgers` `:127`, `diffLedgerRows` `:136`) are not exported. Move them into a shared module (e.g. `scripts/clean-room/session.mjs`) and import them from both drivers, so `claude-baseline.mjs` keeps its behaviour. Add the model, turns and budget as parameters; the baseline keeps its current values.
3. Seeding: `cleargate new epic` twice in the room, then `authorProbeEpic` on each. Overwrite the neighbour's architecture rule and the drafts' bodies from `fixtures/ingest-loop/`. Run `cleargate wiki build` before the first session so the neighbour's page exists.
4. Prompts: (a) "Use the Edit tool once on `<draft>` to replace X with Y, then render this item's Brief as CLAUDE.md describes."; (b) the same for the negative draft; (c) "Use the Bash tool to run `git mv <draft> .cleargate/delivery/archive/`, then reply DONE."
5. Check derivation reads the stream-json `system/hook_response` events (`hook_event`, `exit_code`, `output`), the `assistant` `tool_use` blocks, the room's `token-ledger.jsonl`, `wiki/contradictions.md`, and the page frontmatter. The content hash must match 063-01's helper. Re-implement it in the driver (no `src` import) and pin it with a fixture test against a known value.
6. Evidence: reuse `renderRunSection`-style output from `evidence.mjs`. Add an `INGEST_LOOP_CHECKS` export and leave `GATING_CHECKS` untouched.

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `node ingest-loop.mjs run` | CLI | none | `[--container <abs>] [--ref main] [--model <id>] [--evidence <path>]` | exit 0 PASS / 1 FAIL (evidence written) / 2 usage |
| `node ingest-loop.mjs check` | CLI | none | `--evidence <path>` | exit 0 / 1, 2 on usage |

## Task Breakdown

- [ ] Write the red model-free test: fixture seeding output, the stream parser for each R4 check (fed recorded stream-json fixtures), and PASS/FAIL derivation, including the flake rule and the no-dispatch error case.
- [ ] Extract `runClaudeSession` and the ledger helpers into a shared module; confirm `clean-room-claude-baseline.red.integration.node.test.ts` stays green.
- [ ] Add `fixtures/ingest-loop/` and the seeding step.
- [ ] Implement `ingest-loop.mjs run|check` and `INGEST_LOOP_CHECKS`.
- [ ] Add the procedure section to `.cleargate/knowledge/clean-room-verification.md` (live-only doc in the meta-repo; separate commit there).
- [ ] Dry-run once against the 063-01..03 build and record the evidence.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | No `src/**` code; the driver is covered by the model-free integration test below. |
| Integration tests | 5 | One per §2.1 scenario, run on recorded stream-json fixtures with no live session (`npm run test:integration`). EPIC-063 verification level: **hook-contract** (parsing what the hooks emitted). |
| E2E / acceptance tests | 3 | The three live sessions (positive, negative, shell move) in one `run`, as the manual 0.29.0 release gate. Level: **live end-to-end**. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] One recorded live run with `check` exit 0 against the 0.29.0 candidate, evidence committed.
- [ ] The model-free integration test states its own limits, and `.cleargate/knowledge/clean-room-verification.md` documents the run and its check ids.

## Existing Surfaces

- **Surface:** `cleargate-cli/scripts/clean-room/claude-baseline.mjs:229` `runClaudeSession` — the headless `claude -p` runner with `--include-hook-events`; `:56` pinned default model.
- **Surface:** `cleargate-cli/scripts/clean-room/artifact.mjs:45` `packArtifact`, `:88` `installArtifact` — pack-and-install of the real npm artifact.
- **Surface:** `cleargate-cli/scripts/clean-room/probe-items.mjs:24` `authorProbeEpic` — makes a fresh epic gate 0 while keeping `approved: false`.
- **Surface:** `cleargate-cli/scripts/clean-room/evidence.mjs:65` `GATING_CHECKS` — the evidence table and check-id convention.
- **Surface:** `.cleargate/knowledge/clean-room-verification.md` §5 — the documented headless recipe and the `claude.live.*` check model.
- **Coverage of this requirement:** partial (~60%). Pack, install, session and evidence plumbing exist; seeding, the new prompts and the seven check derivations are new.

## Prior work

- [[EPIC-063]] — parent; this is the M1 live release gate from its §5 verification plan.
- [[EPIC-058]] — STORY-058-08/09 built the clean-room procedure and the `claude-baseline.mjs` harness reused here.
- [[EPIC-020]] — the contradiction loop being proven live for the first time.
- [[BUG-066]] — a test reporting PASS for scenarios that never ran; the reason the error scenario checks that a missing dispatch is FAIL.

## Why not simpler?

- **Smallest existing surface that could carry this:** `claude-baseline.mjs run`, which already drives live sessions against the packed artifact.
- **Why isn't extension / parameterization / config sufficient?** Adding three more sessions and seven checks to the baseline driver would change its gating set and its cost for every multi-host verification. A sibling driver that shares the session helpers keeps the baseline stable and lets this run gate only the ingest loop. Unit tests alone are not enough: the old hook passed every unit test while the model never saw its output.

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
