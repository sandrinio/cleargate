---
story_id: STORY-016-04
parent_epic_ref: EPIC-016
parent_cleargate_id: "EPIC-016"
status: Done
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: EPIC-016_Upgrade_UX.md §5 Scenario 5 (upgrade prints CHANGELOG delta), §4 (upgrade.ts modify). Depends on STORY-016-03 CHANGELOG.
actor: ClearGate user running upgrade
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-28T14:01:31Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-016-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T14:01:31Z
  sessions: []
---

# STORY-016-04: `cleargate upgrade` Prints CHANGELOG Delta Before Merge Loop
**Complexity:** L2 — CHANGELOG slicing logic, integration into existing upgrade.ts flow, edge cases (missing CHANGELOG, version not found).

## 1. The Spec (The Contract)

### 1.1 User Story
As a user running `cleargate upgrade`, I want the relevant CHANGELOG sections (everything between my installed version and the package version, exclusive of installed, inclusive of target) printed to stdout before the per-file merge plan, so that I can read what's changing before I start accepting merge proposals.

### 1.2 Detailed Requirements
- Read `cleargate-cli/CHANGELOG.md` (shipped with the package) at the start of `cleargate upgrade` (and `cleargate upgrade --dry-run`).
- Read installed version from the target repo's install-manifest (`cleargate_version` field) — fall back to `package.json` of the installed CLI when manifest is missing.
- Slice the CHANGELOG: include every `## [X.Y.Z]` section where `installed < X.Y.Z <= target`.
- Print the sliced delta to stdout in original CHANGELOG order (most-recent first), separated from the per-file plan by a `---` divider line.
- If `installed === target`, skip the delta print entirely (proceed straight to merge loop or "nothing to do").
- If `CHANGELOG.md` is missing or unparseable, print one stderr warning (`cleargate: CHANGELOG.md not readable; skipping release notes`) and proceed — never block the upgrade.
- If the installed version has no matching CHANGELOG section (older than the earliest entry), print all sections.

### 1.3 Out of Scope
- Editing or extending CHANGELOG.md (STORY-016-03 owns authoring).
- Asking for confirmation before proceeding past the delta — the user already opted in by running `upgrade`.
- Any pager/scroll behavior — plain stdout, user pipes to `less` if they want.
- Coloring / formatting beyond preserving CHANGELOG markdown verbatim.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: upgrade prints CHANGELOG delta

  Scenario: Delta covers intermediate versions
    Given installed version 0.6.0 and target 0.8.2
    And CHANGELOG.md has sections for 0.8.2, 0.8.1, 0.8.0, 0.7.0, 0.6.0, 0.5.0
    When `cleargate upgrade --dry-run` runs
    Then stdout includes the 0.8.2, 0.8.1, 0.8.0, 0.7.0 sections (in that order)
    And stdout does NOT include the 0.6.0 or 0.5.0 sections
    And the delta appears before the "---" divider before the per-file plan

  Scenario: Same version skips delta
    Given installed version 0.8.2 and target 0.8.2
    When `cleargate upgrade --dry-run` runs
    Then stdout does NOT include any "## [" CHANGELOG heading
    And the merge plan still runs (or "nothing to do")

  Scenario: Missing CHANGELOG warns and continues
    Given cleargate-cli/CHANGELOG.md does not exist (mocked)
    When `cleargate upgrade --dry-run` runs
    Then stderr contains "CHANGELOG.md not readable"
    And the upgrade flow proceeds to the merge plan

  Scenario: Installed older than earliest changelog entry prints all
    Given installed version 0.0.5 and CHANGELOG.md earliest section is 0.1.0
    When `cleargate upgrade --dry-run` runs
    Then stdout includes every CHANGELOG section
```

### 2.2 Verification Steps (Manual)
- [ ] On a target repo with manifest pinned to 0.6.0, run `cleargate upgrade --dry-run`; observe sections 0.7.0+ rendered above the merge plan.
- [ ] Temporarily rename CHANGELOG.md; re-run; observe the warning + completed flow.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/upgrade.ts` |
| Related Files | `cleargate-cli/src/lib/changelog.ts` (new — slicing logic), `cleargate-cli/test/commands/upgrade-changelog.test.ts` (new), `cleargate-cli/test/lib/changelog-slice.test.ts` (new) |
| New Files Needed | Yes — `lib/changelog.ts` plus two test files. |

### 3.2 Technical Logic
- `lib/changelog.ts` exports `sliceChangelog(content: string, fromExclusive: string, toInclusive: string): string[]` — returns the matching sections in original order.
- Section boundary regex: `^## \[(\d+\.\d+\.\d+)\]/m` — split on this; emit each block whose semver lies in `(fromExclusive, toInclusive]`.
- `upgrade.ts` reads `CHANGELOG.md` from `path.join(__dirname, '../../CHANGELOG.md')` (relative to the installed CLI), wraps the slice call in `try/catch` for missing-file handling.
- Print to stdout via `process.stdout.write` so existing logger framing (if any) is bypassed for the verbatim markdown.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | 4 Gherkin scenarios + 2 boundary tests on `sliceChangelog` (empty input; same-version range). |
| E2E / acceptance tests | 1 | `cleargate upgrade --dry-run` against fixture target repo. |

### 4.2 Definition of Done (The Gate)
- [ ] All Gherkin scenarios + boundary tests pass.
- [ ] Missing-CHANGELOG path proven by stub test.
- [ ] `npm run typecheck && npm test -- changelog` green.
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin covers §1.2.
- [x] Files declared.
- [x] No TBDs.
- [x] Lane = standard. Multi-file (lib + command), parser logic with edge cases — fails fast-lane single-surface check.
