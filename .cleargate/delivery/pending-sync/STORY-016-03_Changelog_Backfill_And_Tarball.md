---
story_id: STORY-016-03
parent_epic_ref: EPIC-016
parent_cleargate_id: "EPIC-016"
status: Draft
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-016_Upgrade_UX.md §4 (CHANGELOG.md new file), §6 Q2 (Common Changelog format default accepted).
actor: ClearGate user reading release notes
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: fast
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-28T14:00:56Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-016-03
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T14:00:56Z
  sessions: []
---

# STORY-016-03: CHANGELOG.md Backfill + npm Tarball Inclusion
**Complexity:** L1 — pure doc edit + one-line `package.json` `files` array change.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate user upgrading from an older CLI version, I want a single `CHANGELOG.md` shipped with the npm package describing every published release, so that I can read the release narrative at the point of upgrade without browsing GitHub.

### 1.2 Detailed Requirements
- New file `cleargate-cli/CHANGELOG.md` in [Common Changelog](https://common-changelog.org/) format — most-recent version first, one `## [X.Y.Z] — YYYY-MM-DD` heading per published release.
- Backfill sections for all published versions from `0.1.0` through `0.8.2` (current floor) using `git log` + commit-message scan as the source. Each section lists `Added` / `Changed` / `Fixed` subsections as applicable; one bullet per non-trivial commit grouped semantically.
- Add `"CHANGELOG.md"` to the `files` array in `cleargate-cli/package.json` so it ships in the published tarball.
- The file is **valid Common Changelog** — a unit test parses it and asserts: (a) at least one `## [vN.N.N]` heading; (b) the topmost version equals current `package.json` version; (c) versions appear in descending order.

### 1.3 Out of Scope
- Reading or rendering the CHANGELOG from `cleargate upgrade` — that's STORY-016-04.
- Linking from each commit bullet to its hash / PR (informational text only).
- Pre-`0.1.0` history (none was published).
- Sections for the `mcp/` package or admin tooling — this CHANGELOG is CLI-only.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: CHANGELOG ships with the npm tarball

  Scenario: CHANGELOG exists and parses
    Given cleargate-cli/CHANGELOG.md exists
    When a Common-Changelog parser runs over its contents
    Then at least one ## [X.Y.Z] heading is found
    And no parse error is raised

  Scenario: Topmost version matches package.json
    Given cleargate-cli/package.json reports version 0.8.2
    When the topmost ## [X.Y.Z] heading is read from CHANGELOG.md
    Then the heading version equals "0.8.2"

  Scenario: Versions descending
    Given the list of ## [X.Y.Z] headings in CHANGELOG.md
    When compared by semver
    Then each is strictly less than its predecessor

  Scenario: Tarball includes CHANGELOG
    Given cleargate-cli/package.json
    When jq '.files | index("CHANGELOG.md")' runs
    Then result is non-null
```

### 2.2 Verification Steps (Manual)
- [ ] `cd cleargate-cli && npm pack --dry-run | grep CHANGELOG.md` — file appears in pack list.
- [ ] Open CHANGELOG.md; spot-check that 0.5.0 (SPRINT-14 process v2) and 0.8.x (recent fixes) sections describe what actually shipped per `git log v0.5.0..v0.8.2 --oneline`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/CHANGELOG.md` |
| Related Files | `cleargate-cli/package.json` (files array), `cleargate-cli/test/changelog-format.test.ts` (new) |
| New Files Needed | Yes — CHANGELOG.md + the format test. |

### 3.2 Technical Logic
- Authoring is git-archeology: `git log v<prev>..v<next> --oneline -- cleargate-cli/` per version range; group by Conventional-Commit prefix into Added / Changed / Fixed subsections.
- Format-test parses with a minimal regex (`/^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}/m`) — no external dep needed.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | Format scenarios 1–3. |
| E2E / acceptance tests | 1 | `npm pack --dry-run` includes CHANGELOG.md (Scenario 4). |

### 4.2 Definition of Done (The Gate)
- [ ] CHANGELOG.md exists with sections for every published version.
- [ ] All 4 scenarios pass.
- [ ] `npm pack --dry-run` lists CHANGELOG.md.
- [ ] Fast-lane skip Architect Review per protocol §24 (single-surface doc edit, no schema, deterministic verify).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover §1.2.
- [x] Files declared.
- [x] No TBDs.
- [x] Lane = fast. Single subsystem (CLI package), doc-only with one trivial JSON edit, no auth, no schema, deterministic verify.
