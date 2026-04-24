---
story_id: STORY-018-01
parent_epic_ref: EPIC-018
status: Ready
ambiguity: 🟢 Low
context_source: EPIC-018_Framework_Universality_Public_Ship.md
actor: Open-source adopter / npm consumer
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: no-tbds
      detail: 1 occurrence at §6
  last_gate_check: 2026-04-24T19:51:42Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-018-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T19:51:42Z
  sessions: []
---

# STORY-018-01: LICENSE (MIT) at Repo Root + CLI Package
**Complexity:** L1 — two files, canonical content, 5-minute fix.

## 1. The Spec (The Contract)

### 1.1 User Story
As an open-source adopter scanning this repo before using it in their own project, I want a clear MIT LICENSE file at the repo root and inside the published npm package, so that I know what usage/redistribution terms apply and my legal team doesn't block adoption.

### 1.2 Detailed Requirements
- `LICENSE` at repo root with canonical MIT text, copyright `2026 Sandro Suladze`.
- `cleargate-cli/LICENSE` — identical file so npm-published tarball ships it.
- `cleargate-cli/package.json` — ensure `"license": "MIT"` field is set (check current value; add if missing; keep if already MIT).
- `cleargate-cli/package.json` `"files"` array — include `LICENSE` so `npm pack` tarball contains it.

### 1.3 Out of Scope
- Copyright headers inside source files.
- CONTRIBUTING.md / CODE_OF_CONDUCT.md / third-party license aggregation.
- Any other package's LICENSE (mcp/, admin/, cleargate-planning/) — not published separately.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: LICENSE

  Scenario: Root LICENSE present
    Given a fresh clone
    When I check the repo root
    Then LICENSE exists and its first non-empty line is "MIT License"
    And it contains "Copyright (c) 2026 Sandro Suladze"

  Scenario: CLI package LICENSE matches
    Given cleargate-cli/LICENSE exists
    When I diff it against the root LICENSE
    Then the files are byte-identical

  Scenario: npm tarball ships LICENSE
    Given cleargate-cli/package.json
    When I inspect the "files" array
    Then "LICENSE" is listed
    And "license" field is "MIT"

  Scenario: npm pack includes LICENSE
    When I run `npm pack --workspace=cleargate-cli --dry-run`
    Then the output lists LICENSE among the packed files
```

### 2.2 Verification Steps (Manual)
- [ ] `head -1 LICENSE` → "MIT License".
- [ ] `diff LICENSE cleargate-cli/LICENSE` → no output.
- [ ] `jq -r '.license' cleargate-cli/package.json` → "MIT".
- [ ] `npm pack --workspace=cleargate-cli --dry-run 2>&1 | grep LICENSE` → match.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `LICENSE` (new at repo root) |
| Related Files | `cleargate-cli/LICENSE` (new), `cleargate-cli/package.json` (modify) |
| New Files Needed | Yes — 2 LICENSE files |

### 3.2 Technical Logic
- Use the canonical OSI MIT license text. Standard template: https://opensource.org/licenses/MIT.
- Copyright line: `Copyright (c) 2026 Sandro Suladze`.
- Both LICENSE files byte-identical.

### 3.3 API Contract
N/A.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 0 | N/A for static file delivery |
| Integration check | 1 | CI / scaffold-lint asserts LICENSE presence (covered by STORY-018-04) |

### 4.2 Definition of Done
- [ ] LICENSE exists at repo root.
- [ ] cleargate-cli/LICENSE exists and is byte-identical.
- [ ] package.json `license` field = `MIT` and `files` array includes `LICENSE`.
- [ ] `npm pack --dry-run` confirms LICENSE in tarball.
- [ ] Typecheck + tests pass (no code change — should be a no-op).
- [ ] Commit: `feat(EPIC-018): STORY-018-01 add MIT LICENSE`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

All requirements concrete; no TBDs.
