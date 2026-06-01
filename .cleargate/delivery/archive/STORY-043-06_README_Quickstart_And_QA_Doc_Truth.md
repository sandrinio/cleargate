---
story_id: STORY-043-06
parent_epic_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: SPRINT-33
carry_over: false
area: docs,readme,agents
status: Completed
approved: true
ambiguity: 🟢 Low
complexity_label: L2
parallel_eligible: y
created_at: 2026-06-01T12:00:00Z
updated_at: 2026-05-31T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
source: local-authored
context_source: |
  EPIC-043 WS1 (Doc truth). Spawned 2026-06-01 from the source-level framework
  self-review: README §"Getting started" line ~229 still says "File a proposal"
  (Proposal retired CR-025/SPRINT-19) and line ~248 says "close_sprint.mjs
  --assume-ack" (forbidden by the CLAUDE.md guardrail). qa.md Workflow prose
  mandates an unconditional full re-run, contradicting the shipped EPIC-031
  scoped-test default + the feedback_qa_skip_test_rerun memory. Doc-only
  reconciliation; no test-runner behavior change.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-31T21:39:15Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-043-06
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-31T21:39:14Z
  sessions: []
---

# STORY-043-06: README Quickstart & QA-Doc Truth Reconciliation

## 1. The Spec (The Contract)

### 1.1 User Story

As a new user who just ran `cleargate init`, I want the README's "Getting started"
section and the `cleargate init` final banner to describe the **shipped** framework
(no retired Proposal step, no forbidden `--assume-ack`), and a single-page Quickstart
that walks the single-item happy path — so my first hour is not spent doing the one
thing the framework forbids.

As a sprint-execution operator, I want `qa.md` re-run prose to match the shipped
EPIC-031 scoped-test default and the `feedback_qa_skip_test_rerun` memory — so the
QA agent's own prompt does not contradict the policy it is supposed to follow.

### 1.2 Detailed Requirements

- **README §"Getting started in 10 minutes" line ~229** — replace the retired
  "File a proposal." step (Proposal flow retired by CR-025/SPRINT-19) with a
  "File a ClearGate Epic/Story." step. The prose must no longer instruct the user
  to draft a Proposal file; it must instruct Claude Code to classify the request
  and draft an Epic/Story under `.cleargate/delivery/pending-sync/`, halting at Gate 1.
- **README §"Getting started" line ~248** — replace the forbidden
  `close_sprint.mjs --assume-ack` instruction (forbidden by the CLAUDE.md guardrail:
  "Never pass `--assume-ack` yourself") with: run `close_sprint.mjs` with **NO flags**,
  then confirm the surfaced prompt **verbatim**.
- After the edits, `README.md` must contain **0** occurrences of the substring
  `File a proposal` and **0** occurrences of the substring `--assume-ack`.
- **Add a tiered 1-page QUICKSTART section to `README.md`** covering ONLY the
  single-item happy path: `cleargate init` → file a Story → Gate 1 (approve) → push.
  It must explicitly state that sprints, the five-agent loop, and Gates 2-4 are
  **deferred** to a later "go deeper" pointer — the Quickstart does not document them.
- **Repoint the `cleargate init` final banner** (`cleargate-cli/src/commands/init.ts`,
  the "Step 8: Done" stdout line at ~547) so it points the user at the README
  Quickstart section instead of the 55KB `cleargate-protocol.md`. The banner must
  still print on a successful init and must keep the `[cleargate init]` prefix
  convention used by every other line in the handler.
- **Reconcile `cleargate-planning/.claude/agents/qa.md` re-run prose** with the
  shipped EPIC-031 scoped-test default and the `feedback_qa_skip_test_rerun` memory.
  The `## Workflow` step 3 ("Re-run the checks from scratch") and step 5
  ("run the full package test suite, not just new tests") must no longer mandate an
  **unconditional** fresh-shell full re-run; they must defer to the existing
  `## Lane-Aware Playbook` scoped-by-default behavior (scoped tests on the `standard`
  lane; full suite only on the `runtime` lane or an explicit opt-in trigger).
  This is **doc-only**: no test-runner behavior, no lane logic, no script changes.
- **Mirror `qa.md` to the npm payload** at
  `cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md` (kept byte-identical
  to canonical by `prebuild`). The live `/.claude/agents/qa.md` re-sync is operator-owned
  at Gate-4 doc refresh and is tracked in the DoD, not executed by the Developer.

### 1.3 Out of Scope

- Any change to QA-Verify's actual test-scope **behavior** or lane logic — that is
  EPIC-031 / STORY-031-02 (already shipped). This story reconciles prose only.
- The execution-mode v1/v2 collapse (CR-070) — do not touch `execution_mode` lines.
- The flashcard-curation retro step (WS2), the wiki recompile change (WS3), the
  Architect-re-entry change (WS4), or the CLI surface-hygiene change (WS5) — separate
  stories.
- Authoring a separate `QUICKSTART.md` file — the resolved decision (EPIC-043 §6 Q2)
  is an in-README section, no new file to drift.
- Editing the live `/.claude/agents/qa.md` instance directly — operator re-syncs at Gate 4.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: README Quickstart and QA-doc truth reconciliation

  Scenario: README no longer contradicts the shipped framework (happy path)
    Given the edited README.md
    When a reader greps the file
    Then there are zero occurrences of "File a proposal"
    And there are zero occurrences of "--assume-ack"
    And the file-the-work step instructs filing a ClearGate Epic/Story
    And the close step says to run close_sprint.mjs with no flags and confirm the prompt verbatim

  Scenario: README carries a single-item Quickstart that defers the deep loop
    Given the edited README.md
    When a reader finds the Quickstart section
    Then it covers only init then file a Story then Gate 1 then push
    And it explicitly states that sprints, the five-agent loop, and Gates 2-4 are deferred

  Scenario: cleargate init final banner points at the Quickstart
    Given cleargate-cli/src/commands/init.ts
    When the "Step 8: Done" banner line is read
    Then it references the README Quickstart section
    And it no longer points the user at cleargate-protocol.md as the first read

  Scenario: qa.md re-run prose matches the scoped-test default
    Given cleargate-planning/.claude/agents/qa.md
    When the Workflow re-run guidance is read
    Then it does not mandate an unconditional fresh-shell full re-run
    And it defers to the Lane-Aware Playbook scoped-by-default behavior

  Scenario: qa.md canonical and payload mirrors stay byte-identical
    Given cleargate-planning/.claude/agents/qa.md and its payload mirror
    When the two files are diffed
    Then diff -q reports no difference

  Scenario: Mirror drift Error — payload qa.md diverges from canonical
    Given the canonical qa.md was edited but the payload mirror was not refreshed by prebuild
    When a reader runs diff -q on the two files
    Then the diff Errors with a non-zero exit naming the divergent file
    And the story is not Done until prebuild restores byte-identical parity
```

### 2.2 Verification Steps (Manual)

- [ ] `grep -c "File a proposal" README.md` returns `0`.
- [ ] `grep -c -- "--assume-ack" README.md` returns `0`.
- [ ] `grep -n "Epic/Story" README.md` shows the file-the-work step.
- [ ] `grep -n "no flags" README.md` (or equivalent) shows the verbatim-confirm close step.
- [ ] The Quickstart section exists and names init → Story → Gate 1 → push, and states sprints/agents/Gates 2-4 are deferred.
- [ ] The `init.ts` "Step 8: Done" banner string references the README Quickstart, not `cleargate-protocol.md`.
- [ ] `qa.md` Workflow re-run prose no longer says "from scratch" / "full package test suite" unconditionally; it defers to the Lane-Aware Playbook.
- [ ] `diff -q cleargate-planning/.claude/agents/qa.md cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md` reports no difference.

## 3. The Implementation Guide

### 3.1 Context & Files

- `README.md` — rewrite §"Getting started in 10 minutes" lines ~229 (drop "File a proposal" → "File a ClearGate Epic/Story") and ~248 (drop `--assume-ack` → run with no flags + confirm verbatim); add the tiered 1-page Quickstart section.
- `cleargate-cli/src/commands/init.ts` — repoint the "Step 8: Done" final banner (~line 547) at the README Quickstart instead of `cleargate-protocol.md`.
- `.claude/agents/qa.md` — live instance; reconcile the `## Workflow` re-run prose (operator re-syncs at Gate 4; not Developer-edited, but cited here as the live surface the change targets).
- `cleargate-planning/.claude/agents/qa.md` — canonical source-of-truth edit; reconcile the `## Workflow` re-run prose. Mirror to the npm payload at `cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md` via `prebuild`.

### 3.2 Technical Logic

1. **README §Getting started, step 1 (line ~229):** replace the Proposal-flow sentence. New step text classifies the request and drafts an **Epic/Story** under `pending-sync/`, halting at Gate 1. No mention of a Proposal document.
2. **README §Getting started, close step (line ~248):** replace `close_sprint.mjs --assume-ack` with: run `close_sprint.mjs` with NO flags, then confirm the surfaced prompt verbatim. This matches the CLAUDE.md guardrail.
3. **README Quickstart section:** a new short section (above or beside "Getting started in 10 minutes") that walks ONLY: `cleargate init` → "ask Claude to file a Story" → review + set `approved: true` (Gate 1) → `cleargate push`. End with one sentence explicitly deferring sprints, the five-agent loop, and Gates 2-4 to the deeper "Getting started" / `docs/INTERNALS.md` pointer.
4. **`init.ts` banner:** edit the single stdout string in Step 8 so the "Done" line tells the user to read the README **Quickstart** to get started. Keep the `[cleargate init]` prefix and the trailing `\n`. No control-flow change.
5. **`qa.md` prose reconciliation:** in `## Workflow`, soften step 3 ("Re-run the checks from scratch") and step 5 ("run the full package test suite, not just new tests") so they explicitly defer to the `## Lane-Aware Playbook` (scoped-by-default on `standard`; full suite only on `runtime` lane or an opt-in trigger), consistent with `feedback_qa_skip_test_rerun`. Do not change the Lane-Aware Playbook itself — it already encodes the shipped behavior. Doc-only.
6. **Mirror:** run `prebuild` (or hand-copy) so the payload `qa.md` is byte-identical to canonical; the Developer commits both. Live `/.claude/agents/qa.md` re-sync is a tracked Gate-4 operator action.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Layer | Expectation |
|---|---|
| Doc-shape (README) | A node:test file greps `README.md`: `0` matches for `File a proposal`, `0` for `--assume-ack`, ≥1 for the Epic/Story step and the verbatim-confirm close step, and presence of the Quickstart section + its deferral sentence. |
| Doc-shape (init.ts) | A grep asserts the Step 8 banner string references the README Quickstart and does not name `cleargate-protocol.md` as the primary read. |
| Doc-shape (qa.md) | A grep asserts the Workflow re-run prose no longer mandates an unconditional full re-run and references the Lane-Aware Playbook. |
| Mirror parity | `diff -q` between canonical and payload `qa.md` exits 0 (byte-identical). |
| Regression | `cleargate gate typecheck` clean; existing `init.ts` tests still green (banner-string assertion, if any, updated). |

### 4.2 Definition of Done

- [ ] One commit per repo: `feat(EPIC-043): STORY-043-06 README quickstart + qa-doc truth`.
- [ ] `README.md` has `0` occurrences of `File a proposal` and `0` of `--assume-ack`.
- [ ] README step 1 files a ClearGate Epic/Story; close step runs `close_sprint.mjs` with no flags + confirm verbatim.
- [ ] README Quickstart section exists, covers init → Story → Gate 1 → push, and defers sprints/agents/Gates 2-4.
- [ ] `init.ts` Step 8 banner repointed at the README Quickstart; `init.ts` tests green.
- [ ] `qa.md` Workflow re-run prose reconciled with the scoped-test default + `feedback_qa_skip_test_rerun`; no behavior change.
- [ ] Canonical and payload `qa.md` byte-identical (`diff -q` clean).
- [ ] Doc-shape node:test added and passing.
- [ ] DoD item: operator re-syncs live `/.claude/agents/qa.md` from canonical at Gate-4 doc refresh (tracked, not Developer-executed).

## Existing Surfaces

> L1 reuse audit. All paths verified by Read/grep on 2026-06-01.

- **Surface:** `README.md:229` — "Getting started in 10 minutes" step 1 still reads "File a proposal." (Proposal flow retired by CR-025/SPRINT-19). This story rewrites it to "File a ClearGate Epic/Story."
- **Surface:** `README.md:248` — close step still reads "Run `close_sprint.mjs --assume-ack`", which the CLAUDE.md guardrail forbids ("Never pass `--assume-ack` yourself"). This story rewrites it to no-flags + verbatim-confirm.
- **Surface:** `cleargate-cli/src/commands/init.ts:547` — the Step 8 "Done" banner points the user at `.cleargate/knowledge/cleargate-protocol.md` (the 55KB protocol). This story repoints it at the new README Quickstart.
- **Surface:** `cleargate-planning/.claude/agents/qa.md:115,118,122` — `## Workflow` step 3 ("Re-run the checks from scratch") and step 5 ("run the full package test suite, not just new tests") mandate an unconditional fresh-shell full re-run, contradicting the `## Lane-Aware Playbook` (lines 78-101, scoped-by-default on `standard`) and the `feedback_qa_skip_test_rerun` memory. This story reconciles the prose only.
- **Surface:** `cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md` — the npm payload mirror (byte-identical to canonical via `prebuild`); this story refreshes it alongside canonical.
- **Coverage:** ~100% edit/reconcile of existing files — no net-new abstraction.

## Why not simpler?

- **Smallest existing surface:** the four files in §3.1 already exist (`README.md`, `init.ts`, canonical + payload `qa.md`); this story edits their existing prose/strings. Nothing new is built — the README Quickstart is a new *section* in an existing file, not a new file (the no-new-file decision is EPIC-043 §6 Q2).
- **Why isn't extension/config sufficient?** It is, and that is the point: this story is pure reconciliation/deletion of stale text plus one new in-file section. There is no behavior to parameterize — the QA scoped-test logic already shipped (EPIC-031), so a config flag would be redundant; the only correct fix is making the *prose* stop contradicting the shipped behavior. A config knob would add surface, not remove the contradiction.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low**

*Evaluate each criterion against its literal text.*

- [x] Parent EPIC-043 is approved (`approved: true` in the epic frontmatter).
- [x] §1.2 has exact, literal requirements (line numbers, target strings, banner location).
- [x] §3.1 cites only this story's real, grep-verified file paths.
- [x] §2.1 has a happy-path scenario and a named "Error" scenario (mirror-drift).
- [x] 0 TBDs in the document.
- [x] §Existing Surfaces cites at least one source-tree path with file:line.
- [x] §Why not simpler? has both the smallest-surface and the why-not-extension sub-bullets answered.
- [x] Out-of-scope explicitly fences off EPIC-031 behavior, CR-070, and sibling WS stories.
