---
story_id: STORY-016-01
parent_epic_ref: EPIC-016
parent_cleargate_id: "EPIC-016"
status: Done
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: "EPIC-016_Upgrade_UX.md §4 (Affected Files), §6 Q1+Q2 (recommended defaults accepted: registry check fires from doctor --session-start; Common Changelog format)."
actor: ClearGate user on stale CLI version
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-28T14:00:04Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-016-01
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T14:00:04Z
  sessions: []
---

# STORY-016-01: Registry-Check Library + 24h Cache
**Complexity:** L2 — new library file, cache file at `~/.cleargate/update-check.json`, opt-out env var, offline-silent failure.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate user, I want a reusable function that returns the latest published cleargate version (or a cached value, or `null` on failure), so that any command surface — doctor, upgrade, init — can decide whether to render an upgrade-available notice without each surface re-implementing throttling, opt-out, and offline handling.

### 1.2 Detailed Requirements
- New module `cleargate-cli/src/lib/registry-check.ts` exports `checkLatestVersion(opts?: { fetcher?: typeof fetch }): Promise<{ latest: string | null; from: 'cache' | 'network' | 'opt-out' | 'error' }>`.
- Hits `https://registry.npmjs.org/cleargate` (the public npm metadata endpoint) — no telemetry, no ClearGate-controlled endpoint.
- Caches the result at `~/.cleargate/update-check.json` with shape `{ checked_at: ISO8601, latest_version: string }`.
- 24-hour throttle: if `Date.now() - checked_at < 24h`, return `{ latest: cached, from: 'cache' }` without making a network call.
- Honors `CLEARGATE_NO_UPDATE_CHECK=1` — returns `{ latest: null, from: 'opt-out' }` and writes nothing.
- Network failure (DNS, timeout > 2s, non-2xx) returns `{ latest: cached_or_null, from: 'error' }` with no thrown exception, no stderr.
- Injectable `fetcher` parameter for unit tests.

### 1.3 Out of Scope
- Surfacing the result anywhere — that's STORY-016-02.
- Registry lookups for the MCP server, admin-API, or any package other than `cleargate`.
- Telemetry of any kind.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Registry version check

  Scenario: Fresh check writes cache and returns network result
    Given no cache file exists
    And the registry returns { "dist-tags": { "latest": "0.9.0" } }
    When checkLatestVersion runs
    Then result is { latest: "0.9.0", from: "network" }
    And ~/.cleargate/update-check.json contains checked_at and latest_version: "0.9.0"

  Scenario: Recent cache short-circuits network
    Given the cache was written 1 hour ago with latest_version: "0.9.0"
    When checkLatestVersion runs
    Then result is { latest: "0.9.0", from: "cache" }
    And no network call is made

  Scenario: Stale cache triggers refresh
    Given the cache was written 25 hours ago with latest_version: "0.8.0"
    And the registry now reports "0.9.0"
    When checkLatestVersion runs
    Then result is { latest: "0.9.0", from: "network" }

  Scenario: Opt-out env var suppresses everything
    Given CLEARGATE_NO_UPDATE_CHECK=1
    When checkLatestVersion runs
    Then result is { latest: null, from: "opt-out" }
    And no network call is made
    And no cache file is written

  Scenario: Network failure falls back to cache silently
    Given the cache holds latest_version: "0.8.0" written 25 hours ago
    And the registry rejects with ECONNREFUSED
    When checkLatestVersion runs
    Then result is { latest: "0.8.0", from: "error" }
    And no exception is thrown
    And nothing is written to stderr

  Scenario: Network failure with no cache returns null
    Given no cache file exists
    And the registry rejects
    When checkLatestVersion runs
    Then result is { latest: null, from: "error" }
```

### 2.2 Verification Steps (Manual)
- [ ] Delete `~/.cleargate/update-check.json`; run a one-shot script importing the module — observe network call + cache write.
- [ ] Re-run within 24h — observe no network call (e.g., `dtruss -t connect`).
- [ ] Set `CLEARGATE_NO_UPDATE_CHECK=1`; re-run — confirm `from: 'opt-out'`.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/registry-check.ts` |
| Related Files | `cleargate-cli/test/lib/registry-check.test.ts` (new) |
| New Files Needed | Yes — the lib file and its test. |

### 3.2 Technical Logic
- Use `globalThis.fetch` (Node 18+) with `AbortSignal.timeout(2000)`.
- Cache path: `path.join(os.homedir(), '.cleargate', 'update-check.json')`. Create parent dir if missing.
- Read+parse cache before any network logic; treat parse errors as "no cache."
- Only the `dist-tags.latest` field is consumed from the npm response — keep the parse minimal so registry-format drift doesn't break us.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | One per Gherkin scenario; use injected `fetcher` mock and `tmpdir` for `HOME`. |
| E2E / acceptance tests | 0 | Library-internal; integration covered by STORY-016-02. |

### 4.2 Definition of Done (The Gate)
- [ ] All 6 Gherkin scenarios covered.
- [ ] `npm run typecheck && npm test -- registry-check` green.
- [ ] No direct `console.error` / `process.stderr.write` on failure paths.
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover all detailed requirements.
- [x] Files & API shape declared.
- [x] No TBDs.
- [x] Lane = standard. New library + cache file + env var + offline path = multi-concern; bounce-risk low but rubric prefers standard for new exports.
