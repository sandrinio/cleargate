---
story_id: STORY-063-06
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-06; grounded against cleargate-cli main 2026-11-12
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
area: doctor,wiki,hooks
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
  last_gate_check: 2026-11-11T22:55:42Z
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
  last_stamp: 2026-11-12T09:14:16Z
  sessions:
    - session: 72e522d7-caa6-4837-81f5-8fa60f84f8b5
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-11-12T08:39:21Z
---

# STORY-063-06: Silent-Drop Alarm in the Session Banner
**Complexity:** L2 — one new check in `doctor --session-start`, reusing the scan doctor already does and 063-01's Phase 4 helpers.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want the session-start banner to name any recently edited draft that never got its contradiction check, so that if the check silently stops running again, I find out within a day instead of after 604 dropped signals.

### 1.2 Detailed Requirements
- R1: `cleargate doctor --session-start` (`runSessionStart`, `cleargate-cli/src/commands/doctor.ts:628`) prints at most one alarm line when one or more items are "unchecked". It prints nothing when none are.
- R2: an item is a candidate when all of these hold:
  - its bucket is ingestable (`isBucketIngestable`, `cleargate-cli/src/lib/wiki-config.ts:58`);
  - its raw frontmatter passes the same Phase 4 trigger filter 063-01 adds to `cleargate-cli/src/lib/wiki/contradict.ts`: `status ∈ {Draft, In Review}` and `approved !== true`;
  - its raw `updated_at` is more than 24 hours and less than 7 days old (see §1.4).
- R3: a candidate is "unchecked" when its wiki page has no `last_contradict_sha`, or the value differs from the raw file's current content hash. The hash is computed by 063-01's helper, so both sides agree.
- R4: the line names the count and up to five IDs, oldest first, and says how to clear them, e.g. `⚠️ contradiction check missing: 3 recently edited draft(s) never checked — EPIC-070, CR-130, BUG-140. Run the check before their Brief (wiki contradict <file>, then wiki contradict-commit).`
- R5: the line is informational. It never sets `outcome.blocker` or `outcome.configError`, the same rule as the drift line (`doctor.ts:665-677`). It is printed after the drift line and before the stale-sentinel block (`doctor.ts:692`).
- R6: it reads only frontmatter (raw and page), plus a content hash for candidates. It makes no git calls and no network calls. It stays within EPIC-063's session-start budget (§2.1).

### 1.3 Out of Scope
- Running the contradiction check (agent-side, STORY-063-02 rule).
- A plain `cleargate doctor` listing of every unchecked item. The banner line is the scope.
- Alarming on stories (not an ingestable bucket) or on approved items (Phase 4 skips them by design).

### 1.4 Open Questions

- **Question:** Which timestamp drives the 24-hour/7-day window? The epic text said the page's `last_ingest`, but `cleargate wiki build` rewrites `last_ingest` on every page. Measured on 2026-11-12, a `last_ingest` window flags 55 items (all touched by the 2026-11-10 build). The raw `updated_at` window flags 0 of 42 unapproved Draft/In Review items.
- **Recommended:** use the raw file's `updated_at`, with the 24-hour floor and 7-day ceiling. *(Corrected 2026-11-12 by the 06 post-flight: `stamp-tokens` does not stamp `updated_at`. It moves only on `cleargate new` — real creation time since follow-up 06-F1 replaced the templates' hard-coded date with `{ISO}` — and on `cleargate stamp` and `sprint add|remove`. Edits through Edit/Write do not move it either; that gap is accepted.)* Edits made only through the shell don't move `updated_at`; STORY-063-03 still ingests them, and they are caught the next time the item is edited through Edit/Write. Accept that gap rather than use mtime, which `git checkout` resets.
- **Human decision:** Agreed 2026-11-12 (owner): the raw file's `updated_at`, alarming between 24 hours and 7 days old.

### 1.5 Risks

- **Risk:** the alarm turns into a permanent banner nobody reads.
- **Mitigation:** the 7-day ceiling ages items out. One line with at most five IDs. Zero hits on this repo today.
- **Risk:** doctor and Phase 4 disagree about which items need a check.
- **Mitigation:** R2 and R3 call 063-01's filter and hash helper; no second copy of either rule.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Two successful outcomes: nothing to report (silent), and items to report (one line). |
| Interfaces | F | One surface only: `cleargate doctor --session-start`, which session-start.sh already prints. |
| Data | T | Missing stamp vs stamp that no longer matches the content. |
| Rules | T | Window rule (24h / 7d), filter rule (status + approved), cap-at-five rule. |

```gherkin
Feature: Silent-drop alarm in the session banner

  @paths
  Scenario: Nothing unchecked prints nothing
    Given every unapproved Draft item edited 1–7 days ago has a stamp matching its content
    When `cleargate doctor --session-start` runs
    Then no "contradiction check missing" line is printed

  @data
  Scenario: A missing stamp is reported
    Given EPIC-X is Draft, approved: false, updated_at 2 days ago, and its page has no last_contradict_sha
    When `cleargate doctor --session-start` runs
    Then one line names EPIC-X as a recently edited draft that was never checked

  @data
  Scenario: A stale stamp is reported
    Given CR-Y was checked, then edited 3 days ago without a new check
    When `cleargate doctor --session-start` runs
    Then the line names CR-Y

  @rules
  Scenario: The window and filter exclude the rest
    Given BUG-A edited 2 hours ago, BUG-B edited 10 days ago, EPIC-C approved: true, and STORY-D, all unchecked
    When `cleargate doctor --session-start` runs
    Then none of them is named

  @rules
  Scenario: At most five IDs, oldest first
    Given seven unchecked candidates
    When `cleargate doctor --session-start` runs
    Then the line gives the count 7 and names the five oldest

  Scenario: Error — a missing or unreadable wiki page does not break the banner
    Given a candidate whose wiki page is absent or has malformed frontmatter
    When `cleargate doctor --session-start` runs
    Then the candidate counts as unchecked, the command exits as it would without the check, and outcome.blocker is unset

  Scenario: The check stays within the session-start budget
    Given this repo's delivery tree (≈150 pending-sync items)
    When `cleargate doctor --session-start` is timed 20 times with and without the check
    Then the check adds p95 ≤ 100 ms, measured with /usr/bin/time against the pre-change build as baseline
```

### 2.2 Verification Steps (Manual)
- [ ] In this repo after release, run `node cleargate-cli/dist/cli.js doctor --session-start` and confirm no alarm line (0 candidates today).
- [ ] Back-date a scratch Draft's `updated_at` by two days, run again, and confirm it is named; then revert.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/doctor.ts` |
| Related Files | `cleargate-cli/src/lib/wiki/contradict.ts`, `cleargate-cli/src/lib/wiki-config.ts`, `cleargate-cli/src/wiki/page-schema.ts` |
| New Files Needed | Yes — `cleargate-cli/test/commands/doctor-contradiction-alarm.node.test.ts` |

### 3.2 Technical Logic
1. Add `checkUncheckedDrafts(cwd, now)` in `doctor.ts`, or a small `src/lib/wiki/` helper doctor imports. It returns `{ count, ids }`.
2. Scan `.cleargate/delivery/pending-sync/*.md`. Doctor already reads this directory for the blocked-items list (`doctor.ts:768` onward); reuse that pass rather than adding a second walk if the structure allows. Derive each file's bucket and keep ingestable ones. Apply 063-01's trigger filter and the `updated_at` window.
3. For each candidate, read `.cleargate/wiki/<bucket>/<ID>.md` frontmatter via `parsePage` (`page-schema.ts:77`). Compare `last_contradict_sha` with 063-01's content-hash helper applied to the raw file.
4. Emit the R4 line from `runSessionStart` between the drift line and the stale-sentinel block. Never touch `outcome`.
5. `now` is a test seam (frozen clock), like other doctor test seams.

### 3.3 API Contract (if applicable)
n/a — banner text only.

## Task Breakdown

- [ ] Write red tests for the seven §2.1 scenarios in `test/commands/doctor-contradiction-alarm.node.test.ts` (temp repo fixtures, frozen clock).
- [ ] Implement the candidate scan and unchecked test, reusing 063-01's filter and hash helper.
- [ ] Emit the line in `runSessionStart` at the R5 position; keep `outcome` untouched.
- [ ] Time `doctor --session-start` before and after on this repo (20 runs) and record the p95 delta in the PR notes.
- [ ] Run `test/commands/doctor-session-start.node.test.ts` and the other `doctor-*.node.test.ts` suites unchanged.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | One per functional §2.1 scenario. EPIC-063 verification level: **unit**. |
| Integration tests | 1 | `doctor --session-start` run as a subprocess on a temp repo, asserting the exact banner line. Level: **hook-contract** (session-start output is what the model sees). |
| E2E / acceptance tests | 0 | The live session-start output is exercised by STORY-063-07's clean-room run and by the post-release dogfood check. Levels: **live end-to-end** (063-07), **dogfood**. |
| Performance test | 1 | §2.1 budget scenario: p95 ≤ 100 ms added, 20 timed runs with `/usr/bin/time`, baseline = the pre-change build on the same repo. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] Existing `doctor-*.node.test.ts` suites green.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/doctor.ts:628` `runSessionStart` — the session banner, already printing model-visible lines (membership, resolver, drift `:672`, stale sentinel `:692`).
- **Surface:** `cleargate-cli/src/commands/doctor.ts:768` — existing pending-sync scan for the blocked-items list.
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:77` `parsePage` (reads `last_contradict_sha`, `:23`).
- **Surface:** `cleargate-cli/src/lib/wiki-config.ts:58` `isBucketIngestable`, `:68` `loadWikiConfig`.
- **Coverage of this requirement:** ≥80% extension — one more banner check over data doctor already reads.

## Prior work

- [[EPIC-063]] — parent; this is the regression guard for its M1 fix.
- [[BUG-085]] — added the `ClearGate drift:` banner line with the same "inform, never block" rule this line follows.
- [[BUG-036]] — the stale-sentinel banner line, the other model for a self-reporting session check.
- [[EPIC-020]] — shipped the `last_contradict_sha` field this check reads.

## Why not simpler?

- **Smallest existing surface that could carry this:** `runSessionStart` in `doctor.ts`, which already prints every other session health line.
- **Why isn't extension / parameterization / config sufficient?** It is an extension. A lint rule would only fire when someone runs lint, which is the failure mode we are guarding against. A separate hook would add a second session-start cost. The banner is already printed into the model's context every session.

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
