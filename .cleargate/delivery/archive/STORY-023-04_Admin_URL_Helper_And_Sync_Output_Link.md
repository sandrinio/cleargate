---
story_id: STORY-023-04
cleargate_id: STORY-023-04
parent_epic_ref: EPIC-023
parent_cleargate_id: EPIC-023
sprint_cleargate_id: SPRINT-16
carry_over: false
status: Done
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: SPRINT-16_Upgrade_UX_And_MCP_Native_Slice.md §1 (Admin-URL helper paragraph, added 2026-04-30). EPIC-023_MCP_Native_Source_Of_Truth.md §2 (sync success output spec). cleargate-cli/src/commands/push.ts (stdout pattern reference).
actor: ClearGate developer reading sync output
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
source_tool: local
created_at: 2026-04-30T00:00:00Z
updated_at: 2026-04-30T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T17:37:24Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-023-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-30T17:37:24Z
  sessions: []
---

# STORY-023-04: Admin-URL Helper + Sync Success Output Link
**Complexity:** L1 — one new ~30 LOC library file, one import in `sync.ts`. No schema changes. Single acceptance scenario.

## 1. The Spec (The Contract)

### 1.1 User Story
As a developer who just ran `cleargate sync`, I want to see a clickable link to the admin UI in the success output, so that I can navigate directly to the synced items without remembering the URL.

### 1.2 Detailed Requirements

- New file `cleargate-cli/src/lib/admin-url.ts` exports one function:
  ```typescript
  export function adminUrl(path?: string): string
  ```
- Default base URL: `https://admin.cleargate.soula.ge/`.
- Override via env var `CLEARGATE_ADMIN_URL` (trailing slash normalised — strip it if present, re-add before appending `path`).
- Optional project-scoped suffix: if `~/.cleargate/config.json` (or whatever `loadConfig` resolves) contains a `project_id` field, append `/projects/<project_id>` as the default path when `path` argument is omitted.
- If config read fails (file absent, parse error): fall back to bare base URL silently — no thrown exception, no stderr.
- `cleargate-cli/src/commands/sync.ts` (STORY-023-01) imports `adminUrl` and prints on success:
  ```
  → View synced items: <adminUrl()>
  ```
  This story's only edit to `sync.ts` is adding this import and the one stdout line — STORY-023-01 already has a placeholder call. If STORY-023-01 merges first with a stub `adminUrl` import, this story replaces the stub file with the real implementation.
- The function must be env-injectable for tests: accept an optional `opts?: { env?: NodeJS.ProcessEnv; configReader?: () => unknown }` parameter.

### 1.3 Out of Scope

- Other commands printing the admin URL (doctor, join, push) — those can adopt `adminUrl()` in future stories; this story only wires `sync.ts`.
- Authentication state in the URL (no tokens in URLs).
- URL validation beyond stripping trailing slash.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Admin-URL helper

  Scenario: Default URL returned when no env var or config
    Given CLEARGATE_ADMIN_URL is unset
    And no config file contains project_id
    When adminUrl() is called
    Then it returns "https://admin.cleargate.soula.ge/"

  Scenario: Env var overrides default base
    Given CLEARGATE_ADMIN_URL = "https://my-admin.example.com/"
    When adminUrl() is called
    Then it returns "https://my-admin.example.com/"

  Scenario: Env var trailing slash is normalised
    Given CLEARGATE_ADMIN_URL = "https://my-admin.example.com"
    When adminUrl() is called
    Then it returns "https://my-admin.example.com/"

  Scenario: project_id in config appends project path
    Given CLEARGATE_ADMIN_URL is unset
    And config returns { project_id: "proj-abc-123" }
    When adminUrl() is called with no path argument
    Then it returns "https://admin.cleargate.soula.ge/projects/proj-abc-123"

  Scenario: Explicit path argument overrides project suffix
    Given config returns { project_id: "proj-abc-123" }
    When adminUrl("/items") is called
    Then it returns "https://admin.cleargate.soula.ge/items"

  Scenario: Config read failure falls back silently
    Given the configReader throws an error
    When adminUrl() is called
    Then it returns "https://admin.cleargate.soula.ge/"
    And no exception is thrown

  Scenario: cleargate sync prints admin URL on success
    Given a successful sync run (1 item accepted)
    When cleargate sync runs
    Then stdout contains "→ View synced items: https://admin.cleargate.soula.ge/"
```

### 2.2 Verification Steps (Manual)

- [ ] Run `cleargate sync` against a project; confirm last stdout line is `→ View synced items: https://admin.cleargate.soula.ge/` (or project-scoped URL if config has `project_id`).
- [ ] Set `CLEARGATE_ADMIN_URL=https://staging-admin.cleargate.soula.ge/`; re-run; confirm URL changes.

## 3. The Implementation Guide

- Primary file: see §3.1 table.
- Reuse: see §3.1 table.
- Tests: see §3.1 table.

### 3.1 Context and Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/admin-url.ts` (new) |
| Related Files | `cleargate-cli/src/commands/sync.ts` (add import + one stdout line — touches file created by STORY-023-01) |
| New Files Needed | Yes — `cleargate-cli/src/lib/admin-url.ts`, `cleargate-cli/test/lib/admin-url.test.ts` |

### 3.2 Technical Logic

```typescript
// cleargate-cli/src/lib/admin-url.ts

const DEFAULT_BASE = 'https://admin.cleargate.soula.ge/';

export interface AdminUrlOpts {
  env?: NodeJS.ProcessEnv;
  configReader?: () => unknown;
}

export function adminUrl(path?: string, opts?: AdminUrlOpts): string {
  const env = opts?.env ?? process.env;
  const rawBase = env['CLEARGATE_ADMIN_URL'] ?? DEFAULT_BASE;
  const base = rawBase.endsWith('/') ? rawBase : rawBase + '/';

  if (path !== undefined) {
    const suffix = path.startsWith('/') ? path.slice(1) : path;
    return base + suffix;
  }

  // Try to append project-scoped path from config
  try {
    const cfg = opts?.configReader ? opts.configReader() : readLocalConfig();
    const projectId =
      cfg && typeof cfg === 'object' && 'project_id' in cfg
        ? (cfg as Record<string, unknown>)['project_id']
        : undefined;
    if (typeof projectId === 'string' && projectId) {
      return base + 'projects/' + projectId;
    }
  } catch {
    // silent fallback
  }

  return base;
}

function readLocalConfig(): unknown {
  // Reads ~/.cleargate/config.json — reuse loadConfig() from cleargate-cli/src/config.ts
  // or read the JSON file directly. Prefer loadConfig() if it exposes project_id.
  // If loadConfig() does not expose project_id, read ~/.cleargate/config.json directly.
  // Developer must verify which path exposes project_id before implementing.
  return null; // placeholder — Developer resolves during implementation
}
```

**Note for Developer:** verify whether `loadConfig()` from `cleargate-cli/src/config.ts` exposes a `project_id` field. If it does, use it. If not, read `~/.cleargate/config.json` directly with `fs.readFileSync` + `JSON.parse`. The `configReader` injection seam allows either approach in tests without touching the filesystem.

**Edit to `sync.ts`:** after the `sync: N accepted...` stdout line, add:
```typescript
stdout(`→ View synced items: ${adminUrl()}\n`);
```
Import `adminUrl` from `'../lib/admin-url.js'`.

### 3.3 API Contract

No MCP tool involved. This story is CLI-only. No API contract table applies.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 7 | One per Gherkin scenario. Inject `env` and `configReader` seams; no filesystem access in tests. |
| E2E / acceptance tests | 0 | Covered by STORY-023-01's sync command tests (scenario 7 reuses that test harness). |

### 4.2 Definition of Done (The Gate)

- [ ] All 7 Gherkin scenarios pass.
- [ ] `npm run typecheck && npm test -- admin-url` green in `cleargate-cli/`.
- [ ] `cleargate sync` stdout contains `→ View synced items:` on success.
- [ ] `CLEARGATE_ADMIN_URL` env var override verified by test.
- [ ] No hardcoded URL anywhere in `sync.ts` — all URL construction goes through `adminUrl()`.
- [ ] Architect Review passed.

---

## ClearGate Ambiguity Gate
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] `lane: standard` — demoted 2026-04-30 by orchestrator after architect M2 review (`plans/M2.md`). Rubric trip points: rubric #1 (LOC w/ tests > 50 once admin-url helper test + sync output link assertions are included) and rubric #4 (7 acceptance scenarios in §2.1, not 1). Helper itself is small but the testing surface and scenario count exceed fast-lane bounds. No surface change to the work — just lane-state classification.
- [x] One open implementation detail: whether `loadConfig()` exposes `project_id`. Developer resolves by reading `cleargate-cli/src/config.ts` before implementing `readLocalConfig()`. Flagged in §3.2 — not a blocker for drafting.
- [x] No TBDs blocking execution.
