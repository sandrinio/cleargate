---
epic_id: EPIC-056
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-08-26T00:00:00Z
ambiguity: 🟡 Medium
context_source: verified codebase grounding (no .github/workflows in any of the three repos, confirmed by ls; qa.md:98 fast-lane skip; qa.md:130,165 lane-aware re-run) + recorded direct approval 2026-08-26
owner: sandrinio
target_date: 2026-10-31
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T21:19:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: interrogation-resolved
      detail: 1 occurrence at §11
  last_gate_check: 2026-08-25T21:19:00Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# EPIC-056: CI verification layer — environment-independent proof that tests pass

> **Not scheduled.** Filed 2026-08-26. Prerequisite for [[CR-107]]'s deferred story-PR half and for a GitHub merge queue under [[EPIC-055]].

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add GitHub Actions workflows to cleargate-cli, cleargate-mcp and cleargate-admin that run typecheck plus the full test suite on push and pull_request, and wire them as required status checks.</objective>
  <architecture_rules>
    <rule>Must use node:test via tsx — the single-runner rule (EPIC-028). Do NOT reintroduce vitest</rule>
    <rule>Must run database tests against real infra (docker-compose Postgres 18 + Redis 8) — the no-mocks rule</rule>
    <rule>admin/ tests require the `node --conditions browser` flag for jsdom-bootstrap</rule>
    <rule>No changes to the five-agent loop — CI supplements QA, it does not replace it</rule>
    <rule>No deployment steps — Coolify owns deploy for mcp and admin; npm publish stays manual</rule>
  </architecture_rules>
  <target_files>
    <file path=".github/workflows/ci.yml" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

There is no CI in any ClearGate repo — `ls .github/workflows` returns nothing for the meta repo, `cleargate-cli`, and `mcp`. Today "the tests pass" is established entirely inside the five-agent loop: the Developer runs them, then QA independently re-runs them (`qa.md:130`, `:165` — *"Never approve on Developer's word. Re-run everything yourself."*).

That gives **agent independence** — QA is a separate dispatch with its own scope, its own skip/flake policy (`qa.md:167-168`), and a Gherkin coverage audit the Developer never performs. What it cannot give is **environment independence**: QA re-runs in a fresh shell but on the same machine, same worktree, same `node_modules`, same env vars, same OrbStack daemon. A suite that passes only because of local install drift, a stale build artifact, or an env var set weeks ago passes every gate the loop has.

Second gap: `qa.md:98` lets `fast`-lane stories skip typecheck and the test re-run entirely unless adjacent test files fall under `cleargate-cli/` or `mcp/`. On those stories nothing re-runs at all.

**Success Metrics (North Star):**
- Every commit on every branch of all three repos has a machine-verified typecheck + test result, independent of any developer or agent workstation.
- `fast`-lane stories gain a verification floor they currently lack.
- [[CR-107]]'s story→sprint PR half becomes viable (it is explicitly deferred today for want of an independent verifier).

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] `ci.yml` for `cleargate-cli`: typecheck + full `node:test` suite.
- [ ] `ci.yml` for `cleargate-mcp`: typecheck + tests against docker-compose Postgres 18 + Redis 8 services.
- [ ] `ci.yml` for `cleargate-admin`: typecheck + tests with `node --conditions browser`.
- [ ] Branch protection with the CI check required on `main` for each repo.
- [ ] A documented local-vs-CI parity command so a red CI is reproducible on a workstation.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Story→sprint pull requests. That is [[CR-107]]'s deferred half and a separate decision once this lands.
- Deployment. Coolify watches `main` for mcp and admin; `npm publish` stays a manual release step.
- Replacing or restructuring the five-agent loop. CI is a floor beneath QA, not a substitute — it cannot audit Gherkin coverage, count skipped tests, or check DoD.
- The meta repo's own workflow. It holds planning markdown and shell/mjs scripts; a test job there is a separate question.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Runner cost | Three repos × every push is real GitHub Actions minutes. Scope triggers to `push` on `main` + `pull_request` rather than all branches, and re-evaluate if minutes bite. |
| Test infra | Database tests run against real Postgres 18 + Redis 8 per the no-mocks rule — CI needs service containers, not mocks. This is the main authoring complexity. |
| Security | No secrets in workflow logs. `mcp/.env` holds `NPM_PAT`; CI must never echo env. |

## Existing Surfaces

- **Surface:** `.claude/agents/qa.md:98-109` — the Lane-Aware Playbook governing what QA re-runs. CI sits beneath it; this epic does not modify it.
- **Surface:** `cleargate-cli/package.json` — existing `typecheck` and `test` scripts CI invokes rather than reimplements.
- **Surface:** `.cleargate/scripts/test/` — existing shell test suite (`test_file_surface.sh`, `test_close_pipeline.sh`, …) that a meta-repo workflow would run if that is later added.
- **Coverage of this epic's scope:** none — net-new. No CI configuration exists in any repo.

## Prior work

- `cleargate wiki query "continuous integration github actions"` → **none found**.
- [[CR-107]] — sprint→main PR. Its §0.5 records story-PRs as explicitly out of scope *because* no CI exists; this epic removes that blocker.
- [[EPIC-055]] — parallel wave scheduling. A GitHub native merge queue needs branch protection + required status checks, i.e. this epic.
- [[EPIC-028]] — vitest elimination; established node:test as the single runner. CI must honour it.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** none. `qa.md`'s Lane-Aware Playbook is the closest thing to a verification policy, but it executes inside the same environment it is trying to vouch for.
- **Why isn't extension / parameterization / config sufficient?** The property wanted is *independence from the workstation*. No amount of configuration inside a loop that runs on that workstation can produce it — a second process on the same machine shares the same `node_modules`, the same env, and the same daemon. It requires an execution context ClearGate does not currently have anywhere.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/.github/workflows/ci.yml` — create.
- `mcp/.github/workflows/ci.yml` — create; needs Postgres + Redis service containers.
- `admin/.github/workflows/ci.yml` — create; needs `--conditions browser`.

**Data Changes:** none.

## 5. Acceptance Criteria

```gherkin
Feature: CI verification layer
  Scenario: A pushed commit is independently verified
    Given a commit pushed to any branch of cleargate-cli
    When the CI workflow runs
    Then typecheck and the full node:test suite execute on a clean runner
    And the result is visible on the commit

  Scenario: Database tests run against real infra
    Given the mcp workflow runs
    Then Postgres 18 and Redis 8 service containers are available
    And no test is mocked to avoid them

  Scenario: A locally-green suite that depends on workstation state goes red in CI
    Given a test passing only because of an env var set on the developer machine
    When CI runs the same suite
    Then it fails

  Scenario: main is protected
    Given the CI check is configured as required
    When a PR has a failing check
    Then it cannot merge
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** "Two decisions I can't make from the code. (a) Should CI run the full suite on every push to every branch, or only on `main` + `pull_request`? Full-on-every-push is the strongest signal but three repos × every push is real Actions spend. (b) Should the meta repo get a workflow too — it holds no TypeScript but does hold ~20 shell tests under `.cleargate/scripts/test/` that nothing currently runs automatically?"
- **Human Answer:** Unresolved — replace this entire line with the human's decision.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths.
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [x] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio. 🟡 until §6 is answered; deliberately unscheduled.
