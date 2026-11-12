---
story_id: STORY-063-01
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 STORY-063-01; grounded against cleargate-cli main 2026-11-12.
area: wiki,cleargate-cli
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
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
  last_gate_check: 2026-11-11T23:11:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:11:54Z
  sessions: []
---

# STORY-063-01: Contradiction Commit Command and Recheck Rules
**Complexity:** L2 — one new CLI subcommand over existing commit logic, plus two rule changes in `contradict.ts`.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want a command that saves the contradiction subagent's findings and marks the item checked, so that the contradiction check finishes once per version of a draft instead of never.

### 1.2 Detailed Requirements
- **R1 — commit command.** `cleargate wiki contradict-commit <raw-file>` reads findings JSON from stdin, or from `--findings <file>`. It validates the input, then calls the existing `commitPhase4Findings`. That appends each finding to `wiki/contradictions.md` with `label: null` and stamps `last_contradict_sha` on the wiki page and the raw file.
- **R2 — input shape.** The input is a JSON array of `{ "neighbor": "<ID>", "claim": "<≤80 chars>" }`; `draft` is optional and defaults to the item's ID. An empty array `[]` is valid and means "checked, no findings". The CLI also accepts the subagent's raw text output: lines `contradiction: <draft> vs <neighbor> · <claim>`. These are parsed into the same shape, so the orchestrator can pipe the subagent's answer in unchanged.
- **R3 — all-or-nothing.** Invalid input (not JSON and not contradiction lines, or an entry missing `neighbor` or `claim`) exits non-zero with a message naming the problem. `wiki/contradictions.md`, the wiki page and the raw file are left unchanged.
- **R4 — the "already checked" key is the body's content hash.** Phase 4 idempotency compares `last_contradict_sha` with a sha256 of the raw file's body, frontmatter excluded. It no longer uses `git log -1`, which is empty for an uncommitted draft. The frontmatter is excluded because `commitPhase4Findings` stamps the raw file's frontmatter itself. The field name `last_contradict_sha` stays.
- **R5 — status filter.** Phase 4 runs only when `status ∈ {Draft, In Review}` **and** `approved !== true`. This is EPIC-020 A1's "skip on approved" in today's vocabulary.
- **R6 — no git required.** The commit command works on an uncommitted, never-committed draft.

### 1.3 Out of Scope
- Delivering the directive to the agent (STORY-063-02).
- Changing the subagent's prompt or neighbourhood rules.
- Labelling findings.
- Ingest's own git-SHA drift detection, which stays as it is (locked 2026-04-19).

### 1.4 Open Questions
- None. The input format (JSON or the subagent's own lines) and the hash scope (body without frontmatter) follow from the code facts above.

### 1.5 Risks
- **Risk:** Hashing a slightly different "body" in prepare and in commit, for example a different trailing-newline treatment, would re-flag drafts forever.
- **Mitigation:** One exported `contradictContentHash(raw)` helper is used by both `preparePhase4` and the commit path. A unit test proves that prepare, then commit, then prepare again results in a skip.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful routes: findings present, and an empty array (checked, none found). |
| Interfaces | T | Two input surfaces: stdin and `--findings <file>`; JSON and the subagent's line format. |
| Data | F | Findings are one fixed shape; volume does not change behaviour. |
| Rules | T | Content-hash recheck rule, approved filter, status filter, all-or-nothing rule. |

```gherkin
Feature: Contradiction commit command and recheck rules

  @paths
  Scenario: Committing findings records them and stamps the item
    Given a Draft epic EPIC-X with approved: false and an ingested wiki page
    When `cleargate wiki contradict-commit <EPIC-X raw path>` receives two findings on stdin
    Then wiki/contradictions.md gains two entries with label: null
    And EPIC-X's wiki page and raw file carry last_contradict_sha equal to the body content hash

  @paths
  Scenario: An empty result still marks the item checked
    Given a Draft epic EPIC-X
    When contradict-commit receives []
    Then wiki/contradictions.md is unchanged
    And EPIC-X's wiki page carries last_contradict_sha equal to the body content hash

  @interfaces
  Scenario: The subagent's own output can be piped in
    Given the text "contradiction: EPIC-X vs EPIC-Y · scope claim differs"
    When it is passed with --findings <file>
    Then one entry with neighbor "[[EPIC-Y]]" is appended

  @rules
  Scenario: An already-checked uncommitted draft is not flagged again
    Given a never-committed Draft whose contradiction check was committed
    When `cleargate wiki ingest` runs again without a body change
    Then no phase4 signal is emitted
    And when the body changes, the next ingest emits one

  @rules
  Scenario: Approved and non-draft items are skipped
    Given an epic with status Draft and approved: true, and another with status Active
    When each is ingested
    Then neither emits a phase4 signal

  @rules
  Scenario: Error — malformed findings are rejected without side effects
    Given findings input that is neither JSON nor contradiction lines, or an entry with no claim
    When contradict-commit runs
    Then it exits non-zero naming the problem
    And wiki/contradictions.md, the wiki page and the raw file are byte-identical to before
```

### 2.2 Verification Steps (Manual)
- [ ] On this repo: run `cleargate wiki contradict <EPIC-063 raw>`, pipe `[]` to `contradict-commit`, and check that `wiki/epics/EPIC-063.md` gains `last_contradict_sha`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/wiki/contradict.ts` |
| Related Files | `cleargate-cli/src/commands/wiki-contradict.ts`, `cleargate-cli/src/commands/wiki-ingest.ts`, `cleargate-cli/src/cli.ts`, `cleargate-cli/test/wiki/contradict.node.test.ts`, `cleargate-cli/test/wiki/contradict-cli.node.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic
- `contradict.ts`:
  - Add `contradictContentHash(raw: string)`: sha256 of the body after the frontmatter block.
  - Change the status filter at `:88-91` to also skip when `fm.approved === true`.
  - The idempotency compare at `:100` stays, but its `currentSha` input becomes the content hash.
  - Add `parseFindings(input: string): ContradictFinding[]`, which accepts JSON or contradiction lines and throws on invalid input.
- `wiki-ingest.ts:189`:
  - Keep `currentSha = getGitSha(...)` for ingest drift.
  - Pass `contradictContentHash(rawContent)` into `preparePhase4` (and into `ingestSha` in the `phase4:` signal at `:361`).
- `wiki-contradict.ts`: add `wikiContradictCommitHandler({ filePath, findingsPath?, stdin? })`. It runs `parseFindings` before any write, then calls `commitPhase4Findings` with `ingestSha = contradictContentHash(raw)`.
- `cli.ts:296`:
  - Register `wiki contradict-commit <file>` with `--findings <file>`.
  - Fix the `contradict` help text, which says the commit subcommand doesn't exist.

## Task Breakdown
- [ ] Red tests for the six scenarios in `test/wiki/contradict.node.test.ts` and `test/wiki/contradict-cli.node.test.ts`.
- [ ] `contradictContentHash`, `parseFindings` and the approved filter in `contradict.ts`.
- [ ] Wire the content hash through `wiki-ingest.ts` and the `wiki contradict` path.
- [ ] `contradict-commit` handler and CLI registration; fix the help text.
- [ ] typecheck plus the full `npm test`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | One per Gherkin scenario, plus a round-trip check that prepare → commit → prepare skips. EPIC-063 level: unit. |
| Integration tests | 1 | CLI subprocess test: stdin and `--findings` against a temp repo with a real wiki page. EPIC-063 level: unit/contract. |
| E2E / acceptance tests | 0 | The live loop is proved in STORY-063-07 (clean-room). EPIC-063 level: live end-to-end belongs there. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/wiki/contradict.ts:159` `commitPhase4Findings`. Appends findings and stamps the page and raw file (`:196-205`); only tests call it today.
- **Surface:** `cleargate-cli/src/lib/wiki/contradict.ts:84` `preparePhase4`, with the status filter at `:88-91` and the idempotency check at `:100`.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:189` (`currentSha`, empty for uncommitted drafts) and `:361` (`phase4:` signal).
- **Surface:** `cleargate-cli/src/commands/wiki-contradict.ts:51` `wikiContradictHandler`, the prepare-only CLI registered at `cleargate-cli/src/cli.ts:296`.
- **Coverage of this requirement:** ≥ 80% extension. The commit logic exists; this adds input parsing, a CLI entry point and two rule changes.

## Prior work

- [[EPIC-063]] — parent. This story is M1's first link.
- [[EPIC-020]] — shipped `commitPhase4Findings` and the prepare-only CLI. Its STORY-020-03 help text promises the commit subcommand that this story builds.
- [[PROPOSAL-012]] — contradiction-check design; status filter A1, "skip on approved".

## Why not simpler?

- **Smallest existing surface that could carry this:** `commitPhase4Findings` plus the existing `wiki contradict` command.
- **Why isn't extension / parameterization / config sufficient?** It is extension. A `--commit` flag on `wiki contradict` was considered, but that command's job is to prepare and emit a signal, and mixing in a stdin-reading commit mode makes both harder to test. The ingest agent's instructions already name `contradict-commit`. The hash change cannot be config: the git SHA is empty for exactly the drafts Phase 4 exists to check.

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
