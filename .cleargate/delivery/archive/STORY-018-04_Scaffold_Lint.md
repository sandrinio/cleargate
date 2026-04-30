---
story_id: STORY-018-04
parent_epic_ref: EPIC-018
parent_cleargate_id: EPIC-018
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-018_Framework_Universality_Public_Ship.md
actor: CI pipeline / scaffold maintainer
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-24T00:00:01Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-018-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T19:51:47Z
  sessions: []
---

# STORY-018-04: `cleargate scaffold-lint` — Stack-Leak Detection
**Complexity:** L2 — new CLI command + blocklist + CI workflow wiring.

**Depends on:** STORY-018-03 (so agent files already use gate verbs when the lint runs for the first time; otherwise legitimate `npm test` strings would trip the lint).

## 1. The Spec (The Contract)

### 1.1 User Story
As the scaffold maintainer, I want a `cleargate scaffold-lint` command that greps `cleargate-planning/` for a blocklist of stack-specific strings and fails on any hit, so that ClearGate-specific vocabulary from our dogfooding (Postgres, Drizzle, Svelte, Coolify, Fastify, etc.) cannot silently leak into the installable scaffold downstream users receive.

### 1.2 Detailed Requirements
- New CLI subcommand: `cleargate scaffold-lint [--fix-hint]`.
  - Scans `cleargate-planning/**/*.md`, `cleargate-planning/**/*.sh`, `cleargate-planning/**/*.mjs`, `cleargate-planning/**/*.json`.
  - Default blocklist (case-insensitive substring match):
    - ORMs: `drizzle`, `prisma`, `sequelize`, `typeorm`
    - Web frameworks: `fastify`, `express`, `hono`, `svelte`, `sveltekit`, `react`, `next.js`, `nextjs`, `nuxt`, `remix`, `vue`
    - Infra: `coolify`, `vercel`, `netlify`, `heroku`, `render.com`, `fly.io`
    - DB engines: `postgres`, `postgresql`, `mysql`, `sqlite`, `mongodb`, `dynamodb`
    - Cache/queue: `redis`, `ioredis`, `memcached`, `rabbitmq`, `kafka`
    - Styling: `daisyui`, `tailwind`, `bootstrap`, `mui`
    - Specific-version numbers: `\b\d+\.\d+\.\d+\b` (configurable severity — see below)
  - User-extensible via `.cleargate/scaffold-blocklist.txt` (one term per line, `#` for comments).
  - User-suppressible via `.cleargate/scaffold-allowlist.txt` (term + optional file-glob scope, e.g. `svelte cleargate-planning/.cleargate/templates/*`).
  - Version-number scan off by default (too noisy); enable with `--versions`.
- Exit codes: 0 = clean, 1 = findings found, 2 = config/parse error.
- Output format per finding: `<file>:<line>: <term>  — example context: <matched line truncated to 80 chars>`.
- `--fix-hint` flag: for each finding, suggest a neutral placeholder (`<your-orm>`, `<your-framework>`, `<your-db>`).
- **Self-scope:** the scaffold-lint must NOT scan itself (would find its own blocklist entries as a false positive). Exclude `cleargate-cli/src/lib/scaffold-blocklist.ts` + its test.
- GitHub Actions workflow `.github/workflows/scaffold-lint.yml`:
  - Triggers: `pull_request` to main, `push` to main.
  - Steps: checkout → setup-node@v4 (Node 24) → `npm ci --workspace=cleargate-cli` → `npm run build --workspace=cleargate-cli` → `node cleargate-cli/dist/cli.cjs scaffold-lint`.
  - Fails the check on non-zero exit.

### 1.3 Out of Scope
- Auto-fix (replacing terms with placeholders in-place).
- Scanning the repo root (`.cleargate/`, `.claude/` outside `cleargate-planning/` — those are dogfood live state, allowed to have stack references).
- AST-level analysis or semantic detection (pure substring is sufficient and fast).
- Remote blocklist registry / update service.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: scaffold-lint

  Scenario: Clean scaffold passes
    Given cleargate-planning/ contains no blocklist terms
    When I run `cleargate scaffold-lint`
    Then exit code is 0
    And stdout contains "scaffold-lint: clean"

  Scenario: Blocklist term flagged
    Given cleargate-planning/.claude/agents/developer.md contains the word "drizzle" at line 42
    When I run `cleargate scaffold-lint`
    Then exit code is 1
    And stderr contains "cleargate-planning/.claude/agents/developer.md:42: drizzle"

  Scenario: User-extensible blocklist
    Given .cleargate/scaffold-blocklist.txt contains "mycorp-internal"
    And a scaffold file contains "mycorp-internal"
    When I run `cleargate scaffold-lint`
    Then exit code is 1 and the custom term is flagged

  Scenario: Allowlist suppresses a match
    Given .cleargate/scaffold-allowlist.txt contains "svelte cleargate-planning/templates/example.md"
    And that file contains "svelte" as a genuine example
    When I run `cleargate scaffold-lint`
    Then the match is suppressed for that file only

  Scenario: --fix-hint suggests placeholders
    Given a file contains "postgres"
    When I run `cleargate scaffold-lint --fix-hint`
    Then stderr includes "hint: replace with <your-db>"

  Scenario: CI fails on leak
    Given a PR adds "fastify" to a scaffold file
    When the scaffold-lint GitHub Actions check runs
    Then the check fails
```

### 2.2 Verification Steps (Manual)
- [ ] Run `cleargate scaffold-lint` against current repo; resolve any unexpected hits (either fix the scaffold or add to allowlist with justification).
- [ ] Create a scratch branch that adds `drizzle` to a scaffold file; push; confirm CI fails.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/scaffold-lint.ts` (new) |
| Related Files | `cleargate-cli/src/lib/scaffold-blocklist.ts` (new — default terms array), `cleargate-cli/src/cli.ts` (register), `cleargate-cli/test/commands/scaffold-lint.test.ts` (new), `.github/workflows/scaffold-lint.yml` (new) |
| New Files Needed | Yes — 4 new files + optional user-override files (documented, not committed) |

### 3.2 Technical Logic
- Recursive file walk under `cleargate-planning/` respecting `.gitignore` if present; otherwise node-glob-style.
- Read each file; for each blocklist term; regex `new RegExp(term, 'gi')`; collect matches with line numbers via line-split.
- Merge default + custom blocklist at startup. Apply allowlist as post-filter.
- Output sorted by file path asc, line asc.

### 3.3 API Contract
CLI only. `cleargate scaffold-lint [--fix-hint] [--versions] [--quiet]`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 6 | One per Gherkin scenario |
| E2E | 1 | Real run against this repo's `cleargate-planning/` — must exit 0 at story-end. If it doesn't, fix the scaffold first |

### 4.2 Definition of Done
- [ ] `cleargate scaffold-lint` exists; exit codes match spec.
- [ ] Default blocklist covers the categories in §1.2.
- [ ] User extension + suppression files work.
- [ ] GitHub Actions workflow committed at `.github/workflows/scaffold-lint.yml`.
- [ ] Against this repo: `cleargate scaffold-lint` exits 0 at story-end (fixing any real leaks or adding justified allowlist entries along the way).
- [ ] Typecheck + tests pass.
- [ ] Commit: `feat(EPIC-018): STORY-018-04 scaffold-lint + CI workflow`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

All requirements concrete; no TBDs.
