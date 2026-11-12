---
story_id: STORY-063-11
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-11; grounded against cleargate-cli main 2026-11-12
actor: Orchestrator agent
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: wiki,hooks,cleargate-cli,orientation
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
  last_gate_check: 2026-11-11T23:33:55Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-11
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:31:58Z
  sessions: []
---

# STORY-063-11: Session Brief Injected at Session Start
**Complexity:** L3 — new synthesis compiler, live refresh inside `doctor --session-start` on both hosts, a budget-driven truncation rule, plus orientation doc changes.

## 1. The Spec (The Contract)

### 1.1 User Story
As the orchestrator, I want a brief of at most 1,500 tokens in my context the moment a session starts, saying where the project stands and what is waiting on the owner, so that I start oriented without relying on an honour-system instruction to read `wiki/index.md` and without the owner hand-maintaining an "Active state" section in CLAUDE.md.

### 1.2 Detailed Requirements
- **R1 — Brief compiler.** New `cleargate-cli/src/wiki/synthesis/session-brief.ts` writes `wiki/brief.md`. It is recompiled on every ingest (added to `BUCKET_SYNTHESIS_MAP` for every bucket, `cleargate-cli/src/commands/wiki-ingest.ts:565`) and on `wiki build` (`cleargate-cli/src/commands/wiki-build.ts:205-208`).
- **R2 — Sections and sources**, in priority order (1 = kept longest under truncation). Each section is one line with the fixed prefix shown (contract in §3.3):
  1. `Active sprint:`
     - **When a sprint is active:** ID, goal (≤ 15 words, from the sprint's `sprint_goal`), phase (`sprint_status` and `last_action` from `.cleargate/sprint-runs/<id>/state.json`), and story state counts.
     - **When no sprint is active:** `none`.
     - **Validation:** reuses STORY-063-05's sentinel reading, including BUG-036's "plan file exists" check (`cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh:30-46`).
  2. `Waiting on you:` four counts, followed by up to 5 IDs:
     - open items with `cached_gate_result.pass == false`;
     - open items whose decision lines still hold `Unresolved` or `{populated during Brief review}`;
     - `wiki/contradictions.md` entries with `label: null`;
     - `.cleargate/sprint-runs/*/.doc-refresh-checklist.md` files that still contain `- [ ]`.
  3. `P0/P1 bugs:` count, then up to 5 `ID title` pairs, for open bugs whose `severity` starts `P0` or `P1`.
  4. `Last closed:` the terminal sprint with the latest `completed_at`, plus its report (`.cleargate/sprint-runs/<id>/SPRINT-<NN>_REPORT.md`): report `status`, the `**Stories:**` line, and the carried count from `### Carried Over`.
  5. `Carried, no sprint:` open items with `carry_over: true` whose `sprint_cleargate_id` is null or names a terminal sprint (today: BUG-102..116, carried from Completed SPRINT-41).
  6. `Planned:` each non-terminal, non-active sprint with `<n>/<m> 🟢`, counting items whose `sprint_cleargate_id` names it.
  7. `Decisions:` the 5 newest from STORY-063-10's `latestDecisions`.
  8. `Release:` per repo in a new config key `wiki.brief.release_repos` (default `["."]`): the latest git tag plus the commit count since it. A repo with no tags prints `<repo> no tags`; a path that is not a git repo prints `<repo> unavailable`.
- **R3 — Budget.** The brief, including live sections, never exceeds 1,500 tokens (`Math.round(bytes / 4)`).
  - Truncation first shrinks each section's ID lists from the lowest priority up (5 → 3 → 0, with `+N more`), then drops whole sections from the lowest priority up.
  - The last line then reads `…more in wiki/index.md`.
- **R4 — Live refresh at session start.** `cleargate doctor --session-start` (`cleargate-cli/src/commands/doctor.ts:628` `runSessionStart`) prints `wiki/brief.md` after its banner.
  - It recomputes sections 1 (active sprint) and 8 (release) live, because `state.json` and git tags change without any ingest.
  - Both hosts' `session-start.sh` already call it (claude `:21`, codex `cleargate-cli/scaffold/hosts/codex/.codex/hooks/session-start.sh:21`), so both hosts get the brief with no new process.
  - The session-start hook may add at most p95 100 ms over today (EPIC-063 §3).
- **R5 — Orientation docs.** In both host instruction blocks, orientation step 1 (`cleargate-cli/scaffold/hosts/claude/CLAUDE.md:13`, `cleargate-cli/scaffold/hosts/codex/AGENTS.md:7`) says: "the brief is printed at session start; read `wiki/index.md` when you need more". It no longer says "read index.md first (~3k tokens)".
- **R6 — Meta-repo pointer (release step).** At the 0.30.0 release, a separate meta-repo commit:
  - replaces `./CLAUDE.md`'s `## Active state (as of 2026-11-10)` section (lines 166-177, outside the CLEARGATE block) with one line pointing to `.cleargate/wiki/brief.md`;
  - sets `wiki.brief.release_repos: [cleargate-cli, mcp]` in `.cleargate/config.yml`.

  This is not a cleargate-cli commit, because the meta-repo is not in the cli repo.

### 1.3 Out of Scope
- Section extraction (063-08), computed relations (063-13), the index (063-09), decisions (063-10).
- The truth oracle and the orientation eval that verify this brief (063-12).
- A structured goal verdict in sprint reports (§1.4 Q3). It goes to a follow-up CR that adds `goal_verdict: met|partial|missed` to the report template; once that field exists, the brief reads it.
- Network calls at session start (npm registry, GitHub).
- Changing the doctor banner's existing lines.

### 1.4 Open Questions

- **Question (Q1):** Release state has to work in any target repo, not just ClearGate's. What should it read?
- **Recommended:** The latest git tag plus `git rev-list --count <tag>..HEAD`, for each repo in `wiki.brief.release_repos` (default `["."]`), computed live in `doctor --session-start`. That is two git calls per repo. If measurement shows it breaks the 100 ms budget, compute it at ingest instead and mark it "as of <date>". A repo with no tags prints `no tags`.
- **Human decision:** Owner approved 2026-11-12: latest git tag plus commits since, per repo in the new `wiki.brief.release_repos` key (default `["."]`), computed live in `doctor --session-start`. It falls back to an ingest-time value marked "as of <date>" only if measured over the 100 ms budget (R2 item 8, §3.2).

- **Question (Q2):** Should `session-start.sh` just `cat wiki/brief.md`, or should `doctor --session-start` print it with live sections?
- **Recommended:** `doctor --session-start`. It already runs on both hosts in Node, so there is no extra process start. `state.json` changes during sprint execution without any ingest, so a precomputed brief's active-sprint line would go stale mid-sprint.
- **Human decision:** Owner approved 2026-11-12: `doctor --session-start` prints the brief and refreshes the active-sprint and release lines live (R4).

- **Question (Q3):** Sprint reports carry no structured goal verdict. SPRINT-44's report has `status: "Shipped"` and a `**Stories:**` line; "goal met" lives only in the sprint file's execution log and in CLAUDE.md. What should "Last closed" show?
- **Recommended:** The report's `status`, its `**Stories:**` line and the carried count, now. File a follow-up CR to add a `goal_verdict: met|partial|missed` field to the report template, written by the Reporter. The brief reads it when present.
- **Human decision:** Owner approved 2026-11-12: "Last closed" shows the report status, its `**Stories:**` line and the carried count now (R2 item 4). A structured `goal_verdict` field goes to a follow-up CR (§1.3).

### 1.5 Risks

- **Risk:** A wrong brief is worse than none. Today's `active-sprint.md` names three Completed sprints as current.
- **Mitigation:** STORY-063-12's truth oracle checks every fact, fact by fact, in `npm test`. Section 1 reuses 05's corrected sentinel reading.
- **Risk:** The ~500 tokens added to every session's always-loaded context.
- **Mitigation:** Hard 1,500 cap (R3). R6 removes the ~1,040-token hand-written section in this repo.
- **Risk:** Session-start latency.
- **Mitigation:** No full scan at session start. Only `brief.md`, `.active`, one `state.json` and two git calls per release repo are read, inside the Node process doctor already starts. Measured against the 100 ms budget.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Active sprint vs no active sprint. |
| Interfaces | T | Claude Code and Codex session-start hooks; `wiki build` and `wiki ingest` writing `brief.md`. |
| Data | T | Small corpus vs one whose "waiting on you" lists overflow the budget. |
| Rules | T | 1,500-token cap and priority-ordered truncation; 100 ms session-start budget. |

```gherkin
Feature: Session brief injected at session start

  @paths
  Scenario: The brief carries every section while a sprint is active
    Given a fixture repo whose .active names SPRINT-9 with a plan file and a state.json with 4 stories
    And open items with failing gates, unanswered questions, P0/P1 bugs, carried items and answered decisions
    And `cleargate wiki build` has run
    When `cleargate doctor --session-start` runs
    Then stdout contains lines starting "Active sprint: SPRINT-9", "Waiting on you:", "P0/P1 bugs:", "Last closed:", "Carried, no sprint:", "Planned:", "Decisions:" and "Release:"
    And the brief is at most 1,500 tokens, measured as Math.round(bytes / 4)
    And after `cleargate wiki ingest` of one bug whose severity changed to P1-High, wiki/brief.md lists that bug under "P0/P1 bugs:"

  @paths
  Scenario: No active sprint
    Given .active is empty
    And SPRINT-42 is planned with 5 items of which 5 are 🟢
    When `cleargate doctor --session-start` runs
    Then the brief reads "Active sprint: none"
    And "Planned:" lists "SPRINT-42 — 5/5 🟢"

  @interfaces @rules
  Scenario Outline: Both hosts inject the brief within budget
    Given the <host> session-start.sh from the scaffold, installed in a fixture repo with a built wiki
    When the hook runs 20 times
    Then each run's stdout contains the brief and the exit code is 0
    And p95 added wall time over a run without the brief is at most 100 ms, measured with /usr/bin/time
    And the <doc> orientation step 1 says the brief is printed at session start

    Examples:
      | host   | doc                                   |
      | claude | scaffold/hosts/claude/CLAUDE.md block |
      | codex  | scaffold/hosts/codex/AGENTS.md        |

  @data @rules
  Scenario: Over-budget content is truncated by priority, never past the cap
    Given a synthetic corpus with 40 failing-gate items, 30 P0/P1 bugs and 25 carried items
    When the brief is compiled
    Then it is at most 1,500 tokens
    And "Active sprint:" and "Waiting on you:" are present
    And lower-priority ID lists show "+N more" before any section is dropped
    And the last line reads "…more in wiki/index.md"

  @interfaces
  Scenario: The meta-repo's hand-written Active state gives way to the brief
    Given cleargate 0.30.0 is released and the live instance is re-synced
    When the R6 meta-repo commit lands
    Then ./CLAUDE.md's "## Active state" section is a single line pointing to .cleargate/wiki/brief.md
    And .cleargate/config.yml sets wiki.brief.release_repos to [cleargate-cli, mcp]
    And the next session's "Release:" line names both repos

  Scenario: Error — missing or stale inputs never break session start
    Given one of: no wiki/brief.md; a .active naming SPRINT-99 with no plan file; a release repo path that is not a git repo; a release repo with no tags
    When `cleargate doctor --session-start` runs
    Then it prints, respectively: "ClearGate brief: not built — run `cleargate wiki build`"; "Active sprint: none (stale sentinel names SPRINT-99)"; "Release: <repo> unavailable"; "Release: <repo> no tags"
    And the exit code is 0
```

### 2.2 Verification Steps (Manual)
- [ ] Dogfood in the meta-repo after 0.30.0: start a new Claude Code session. Confirm the brief appears after the doctor banner, and compare it with the Active-state section it replaces before deleting that section (R6).
- [ ] Commit R6 in the meta-repo, then start a new session and confirm CLAUDE.md's "## Active state" is one pointer line.
- [ ] `node cleargate-cli/dist/cli.js doctor` exits 0 after the live re-sync (no scaffold drift from the CLAUDE.md/AGENTS.md changes).

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/wiki/synthesis/session-brief.ts` |
| Related Files | `cleargate-cli/src/commands/doctor.ts`, `cleargate-cli/src/commands/wiki-ingest.ts`, `cleargate-cli/src/commands/wiki-build.ts`, `cleargate-cli/src/lib/wiki-config.ts`, `cleargate-cli/scaffold/core/.cleargate/config.example.yml`, `cleargate-cli/scaffold/hosts/claude/CLAUDE.md`, `cleargate-cli/scaffold/hosts/codex/AGENTS.md`, `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh`, `cleargate-cli/scaffold/hosts/codex/.codex/hooks/session-start.sh` |
| New Files Needed | Yes — `cleargate-cli/src/wiki/synthesis/session-brief.ts`, `cleargate-cli/templates/synthesis/brief.md`, `cleargate-cli/test/wiki/session-brief.node.test.ts`, `cleargate-cli/test/hooks/session-start-brief.node.test.ts` |
| Meta-repo (separate commit at release, R6) | `./CLAUDE.md`, `.cleargate/config.yml` |

### 3.2 Technical Logic
- **Dependencies.** Depends on STORY-063-05 (M1 sentinel and `state.json` reader), STORY-063-09 (open-item and Gate 1 logic) and STORY-063-10 (`latestDecisions`), so `parallel_eligible: n`. STORY-063-12 verifies it.
- **Release-line fallback.** If the session-start timing test shows the two git calls per repo push the hook over its 100 ms p95 budget, compute section 8 at ingest instead and print it as `<repo>: <tag> + <n> commits (as of <date>)`. The line contract in §3.3 allows that suffix.
- **Compile time (ingest/build).** `session-brief.ts` exports two functions:
  - `compile(items, allItems, ctx)` builds sections 2–7 from raw items (stories included, for sprint membership counts), `contradictions.md`, checklists, the latest sprint report, and `latestDecisions` (063-10).
  - `renderBrief(sections)` applies R3 truncation.
  
  Write `wiki/brief.md` with sections 1 and 8 as placeholders tagged `<!-- live:active-sprint -->` and `<!-- live:release -->`.
- **Session start.** In `runSessionStart`, after the existing banner and blocked-items lines:
  1. Read `wiki/brief.md`.
  2. Compute section 1 with 05's sentinel and `state.json` reader, and section 8 with `git -C <repo> describe --tags --abbrev=0` plus `git -C <repo> rev-list --count <tag>..HEAD`, each wrapped in a 300 ms timeout.
  3. Replace the placeholders, re-run `renderBrief`'s cap check, and print.
  
  `session-start.sh` needs no change unless measurement shows otherwise. It stays in the file surface for that reason, and for the hook-contract test.
- **Config.** `wiki.brief.release_repos?: string[]` in `wiki-config.ts`, documented in `config.example.yml`.
- **Docs.** Edit step 1 in the CLAUDE.md block source and in AGENTS.md (R5). Reminder for the release: canonical edits need a live re-sync (`node cleargate-cli/dist/cli.js init`) and a clean `doctor`.

### 3.3 API Contract (if applicable)

Brief line contract, parsed by STORY-063-12's truth oracle. Every fact line starts with one of these prefixes, in this order:

| Prefix | Shape |
|---|---|
| `Active sprint:` | `<ID> — <goal ≤15 words> — <sprint_status>/<last_action> — <n> stories: <state>=<count>, …` or `none` or `none (stale sentinel names <ID>)` |
| `Waiting on you:` | `<a> failing gates · <b> open questions · <c> unlabelled contradictions · <d> unfinished close checklists — <ID>, …` |
| `P0/P1 bugs:` | `<n> — <ID> <title>; …` |
| `Last closed:` | `<ID> (<completed_at date>) — <report status> — <Stories line> — carried <n>` |
| `Carried, no sprint:` | `<n> — <ID>, …` |
| `Planned:` | `<ID> — <n>/<m> 🟢; …` |
| `Decisions:` | `[[ID]] <text ≤12 words>; …` |
| `Release:` | `<repo>: <tag> + <n> commits[ (as of <date>)]; …` or `<repo> unavailable` / `<repo> no tags` |

## Task Breakdown

- [ ] Write red tests: sections with and without an active sprint, truncation on an overflowing synthetic corpus, the three error inputs, and the line contract.
- [ ] Implement `session-brief.ts` (`compile`, `renderBrief`) and the template; wire it into the ingest bucket map and build.
- [ ] Add `wiki.brief.release_repos` to config and `config.example.yml`.
- [ ] Extend `runSessionStart` to print the brief with live sections 1 and 8.
- [ ] Hook-contract test: run both hosts' `session-start.sh` from the scaffold in a fixture repo, 20 runs, and assert stdout, exit 0 and p95 ≤ 100 ms added.
- [ ] Update orientation step 1 in the CLAUDE.md block source and in AGENTS.md.
- [ ] At release: meta-repo commit for R6, live re-sync, `doctor` exit 0.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | One per R2 section source, plus truncation (R3). EPIC-063 verification level: unit. |
| Integration tests | 2 | Hook-contract runs of `session-start.sh` for claude and codex in a fixture repo (`test/hooks/session-start-brief.node.test.ts`). They run in the default suite because they need no network or model. EPIC-063 verification level: hook-contract. |
| E2E / acceptance tests | 1 | Dogfood session in the meta-repo after 0.30.0 (§2.2). EPIC-063 verification level: dogfood. Fact accuracy is proven separately by STORY-063-12's truth oracle; usefulness by its orientation eval (live end-to-end). |
| Performance test | 1 | Session-start added wall time p95 ≤ 100 ms over 20 runs, measured with `/usr/bin/time` against the same hook run with the brief disabled. Baseline: today's `session-start.sh` timing on the fixture repo, recorded in the test output. EPIC-063 verification level: hook-contract. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/doctor.ts:628` `runSessionStart`. Already prints model-visible lines at every session start (state banner, drift, blocked items at `:841-849`). The brief is printed after them.
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh:21` and `:30-46`, and `cleargate-cli/scaffold/hosts/codex/.codex/hooks/session-start.sh:21`. Both call `doctor --session-start`; the claude hook already validates the `.active` sentinel against a plan file (BUG-036).
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:565` `BUCKET_SYNTHESIS_MAP` and `cleargate-cli/src/commands/wiki-build.ts:205-208`. Where a precomputed page is wired.
- **Surface:** `cleargate-cli/src/lib/wiki-config.ts:68` `loadWikiConfig`. Home for `wiki.brief.release_repos`.
- **Coverage of this requirement:** partial. Delivery to the model is ≥ 80% reuse (doctor already prints at session start); the brief compiler is new.

## Prior work

- [[EPIC-063]] — parent; this is story 063-11 (session brief).
- [[EPIC-024]] — AI Orientation Surface Slim (Completed). Aspirational ≤ 8,000-token orientation budget. CLAUDE.md alone is ~7.6k today, hence the hard 1,500 cap and R6.
- [[EPIC-015]] — Wiki Index Hygiene & Scale (Completed). The 2,000-token "active surface" target this brief now meets.
- [[BUG-036]] — Stale `.active` sentinel announced a non-existent sprint (fixed in `session-start.sh`). R2 §1 keeps that validation.
- Depends on STORY-063-05 (sentinel and `state.json` reader), 063-09 (open-work definitions), 063-10 (`latestDecisions`). Verified by STORY-063-12.

## Why not simpler?

- **Smallest existing surface that could carry this:** `doctor --session-start`, which already prints model-visible lines at every session start on both hosts.
- **Why isn't extension / parameterization / config sufficient?** The facts the brief needs are spread across raw frontmatter, `state.json`, sprint reports, contradictions and checklists. No existing page joins them, and the nearest one, `active-sprint.md`, is wrong today.
  - **Printing `index.md` at start:** costs 2.6k–4k tokens and still doesn't say what is waiting on the owner.
  - **A plain `cat` of a precomputed file:** goes stale during a sprint.
  
  A precomputed brief with two live sections, printed by the process that already runs, is the smallest design that is both cheap and true.

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
