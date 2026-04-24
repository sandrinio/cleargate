---
epic_id: EPIC-018
status: Approved
ambiguity: 🟢 Low
approved_at: 2026-04-24T00:00:00Z
approved_by: sandro
context_source: "Direct-epic waiver (2026-04-24 conversation, Option C selected). No separate PROPOSAL filed. Inline references: (a) ClearGate is a public-repo product meant to install into any target repo via `cleargate init` — current scaffold leaks ClearGate-specific assumptions (`npm test`, `npm run typecheck`, Node/vitest/monorepo layout) into downstream; (b) no LICENSE file today = blocking for public adoption; (c) README is dogfood-centric, not onboarding-centric; (d) no integration test against foreign (non-ClearGate) repo = zero empirical evidence the scaffold works outside this repo; (e) cleargate-planning/ canonical scaffold risks bleeding stack-specific content (`#drizzle`, `#svelte5`, `#coolify`) during dogfooding; (f) vibe-coder product-market-fit gate: 'anyone can use it' — hygiene (bugs + pruning + awareness polish) can wait one sprint; public-readiness can't."
owner: sandro
target_date: 2026-05-10
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: proposal-approved
      detail: "linked file not found: Direct-epic waiver (2026-04-24 conversation, Option C selected). No separate PROPOSAL filed. Inline references: (a) ClearGate is a public-repo product meant to install into any target repo via `cleargate init` — current scaffold leaks ClearGate-specific assumptions (`npm test`, `npm run typecheck`, Node/vitest/monorepo layout) into downstream; (b) no LICENSE file today = blocking for public adoption; (c) README is dogfood-centric, not onboarding-centric; (d) no integration test against foreign (non-ClearGate) repo = zero empirical evidence the scaffold works outside this repo; (e) cleargate-planning/ canonical scaffold risks bleeding stack-specific content (`#drizzle`, `#svelte5`, `#coolify`) during dogfooding; (f) vibe-coder product-market-fit gate: 'anyone can use it' — hygiene (bugs + pruning + awareness polish) can wait one sprint; public-readiness can't."
    - id: no-tbds
      detail: 1 occurrence at §10
    - id: affected-files-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-24T19:51:41Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-018
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T19:51:40Z
  sessions: []
---

# EPIC-018: Framework Universality — Public Ship

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make ClearGate installable into any target repo by stripping ClearGate-specific assumptions from the scaffold (npm/vitest/monorepo hard-codes), adding LICENSE + stranger-onboarding README, and proving it works end-to-end via an automated foreign-repo integration test.</objective>
  <architecture_rules>
    <rule>The scaffold (cleargate-planning/) must contain ZERO stack-specific strings — no `drizzle`, `svelte`, `coolify`, `fastify`, `postgres`, concrete version numbers for user-project deps</rule>
    <rule>Gate commands (`precommit`, `typecheck`, `test`) must be user-configurable via `.cleargate/config.yml`; default to sensible fallback (`echo "no precommit configured"` exits 0) rather than npm-specific invocations</rule>
    <rule>Agent definitions reference `cleargate gate <name>` CLI verbs, not raw language-specific commands. Downstream teams configure once, all agents comply</rule>
    <rule>NO breaking changes to the dogfood meta-repo's own workflow — this repo keeps working exactly as-is while the scaffold becomes portable</rule>
    <rule>Integration test must run in CI against a foreign-repo fixture (blank Node + blank non-Node) and fail the build if scaffold drift breaks either</rule>
  </architecture_rules>
  <target_files>
    <file path="LICENSE" action="create" />
    <file path="README.md" action="modify" />
    <file path="docs/INTERNALS.md" action="create" />
    <file path="cleargate-planning/.cleargate/config.example.yml" action="create" />
    <file path="cleargate-planning/.claude/agents/developer.md" action="modify" />
    <file path="cleargate-cli/src/commands/gate.ts" action="modify" />
    <file path="cleargate-cli/src/commands/scaffold-lint.ts" action="create" />
    <file path="cleargate-cli/test/integration/foreign-repo.test.ts" action="create" />
    <file path=".github/workflows/scaffold-lint.yml" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
ClearGate is a public-repo product. Its value proposition is "install this in any repo and your Claude Code agents behave like a disciplined engineering team." Today that proposition is untested: we've shipped three SPRINTs of dogfooding inside this repo, but have never run `cleargate init` in a non-ClearGate codebase and driven a sprint through. The scaffold embeds Node-specific assumptions (`npm test`, `npm run typecheck` as non-negotiable gates), our own stack's vocabulary (FLASHCARD tags referencing `#drizzle`, `#svelte5`, `#coolify`), and no LICENSE — making the repo not just hard-to-adopt but legally non-adoptable.

**Success Metrics (North Star):**
- `cleargate init` runs cleanly in a blank Node-only repo and in a blank non-Node repo (Python or Go fixture). Verified by integration test in CI.
- 0 stack-specific leaks in `cleargate-planning/` (scaffold-lint greps the tree for a blocklist and exits 0).
- A stranger with no prior context can install ClearGate, file a proposal, approve an epic, and run the first developer-agent invocation in ≤ 10 minutes following README alone.
- LICENSE exists; `npm publish` preflight doesn't complain.
- Downstream `npm test` / `pytest` / `go test` / `cargo test` can all be used as the pre-commit gate by editing `.cleargate/config.yml`.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] **LICENSE (MIT)** at repo root + `cleargate-cli/LICENSE` for the npm package.
- [ ] **README split.** New `README.md` = stranger onboarding (install → first proposal → first epic in ≤10 min). New `docs/INTERNALS.md` = dogfooding/architecture (current README content moves here).
- [ ] **Config-driven gates.** New `.cleargate/config.yml` key `gates.precommit`, `gates.typecheck`, `gates.test` accepting shell command strings. New `cleargate gate precommit` / `cleargate gate test` CLI verbs that resolve the command and execute. Agent definitions (`developer.md`, `qa.md`) switch from `npm test` to `cleargate gate test` etc.
- [ ] **Sensible fallbacks.** When config absent OR key absent: emit a friendly message ("no gate configured — add `gates.precommit` to .cleargate/config.yml") and exit 0 so the loop keeps working in minimal-setup repos.
- [ ] **Scaffold-lint.** New `cleargate scaffold-lint` command that greps `cleargate-planning/` for a blocklist of stack-specific strings (user-extensible via `.cleargate/scaffold-blocklist.txt`). Exits non-zero on any hit. CI runs on every PR to main.
- [ ] **Foreign-repo integration test.** New `cleargate-cli/test/integration/foreign-repo.test.ts` that (a) creates a tmpdir with only `package.json` (minimal Node fixture) or a bare `go.mod` (non-Node fixture), (b) runs `cleargate init` programmatically, (c) asserts scaffold files present + agent YAML parses + protocol text free of stack refs, (d) runs `cleargate gate precommit` with a dummy command and asserts exit 0. Runs in CI.
- [ ] **GitHub Actions workflow** (`.github/workflows/scaffold-lint.yml`) that executes scaffold-lint + foreign-repo integration test on every PR.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- Standalone binary distribution (bun compile / pkg) — defer to EPIC-016 Upgrade UX family or a dedicated distribution epic.
- Non-Claude-Code frontend adapters (Cursor, Windsurf, Aider) — different integration model, not universality per se.
- Plugin system for team-specific templates — useful but not blocking public adoption.
- Rewriting agents for non-Node tooling — they stay Claude-Code subagents with YAML frontmatter; only their *command invocations* are configurable.
- Porting `cleargate-cli` to a non-Node runtime — Node stays the toolchain; downstream *projects* can be anything.
- Contaminating the meta-repo's own workflow — this repo's `npm test` + `npm run typecheck` keeps working unchanged.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Compatibility | Existing SPRINTs/EPICs/stories authored against the old agent-gate wording (e.g., "Non-negotiable: `npm run typecheck` clean") must continue to work — the old wording becomes documentation of *this repo's* chosen gate, not a framework requirement |
| Licensing | MIT. Compatible with npm ecosystem. Single file, repo root + CLI package root |
| Performance | Foreign-repo integration test must complete in < 30s on CI (creates tmpdir, unpacks scaffold, runs init, asserts). If slower, investigate before merging |
| Backwards compat | Downstream users on `cleargate@0.2.x` must be able to `cleargate upgrade` to this version without their existing `.cleargate/config.yml` (if any) breaking — the new keys are purely additive |
| Dogfooding | This repo's own `.cleargate/config.yml` must be added with real values (`gates.precommit: 'npm run typecheck --workspace=cleargate-cli && npm test'`) so our workflow is unchanged after the agent-wording switch |

## 4. Technical Grounding

**Affected Files:**
- `LICENSE` (new) — MIT text at repo root; copy at `cleargate-cli/LICENSE` for npm.
- `README.md` (modify) — replace dogfood-first narrative with stranger-onboarding. "ClearGate in 5 minutes." Link out to `docs/INTERNALS.md` for depth.
- `docs/INTERNALS.md` (new) — move current README contents here (repo layout, dogfood explanation, four-agent loop detail).
- `cleargate-planning/.cleargate/config.example.yml` (new) — template users copy to `.cleargate/config.yml`. Documents all gate keys + safe defaults.
- `.cleargate/config.yml` (new, in this repo's own config dir) — real config for ClearGate's own workflow. Committed so dogfooding stays identical.
- `cleargate-planning/.claude/agents/developer.md` + `qa.md` — swap hard-coded `npm test` / `npm run typecheck` for `cleargate gate precommit` / `cleargate gate test`. Keep any stack-specific language in examples, mark as "example from ClearGate's own setup, replace with your own."
- `cleargate-cli/src/commands/gate.ts` (exists for readiness-gates; extend or add new `gate precommit|test|typecheck` subcommand surface).
- `cleargate-cli/src/commands/scaffold-lint.ts` (new) — read `cleargate-planning/**/*.md` + `*.sh` + `*.mjs`, grep against blocklist, exit non-zero on match.
- `cleargate-cli/src/lib/scaffold-blocklist.ts` (new) — exported default blocklist (`drizzle`, `svelte`, `coolify`, `fastify`, `postgres`, `redis`, `ioredis`, `orbstack`, `daisyui`, `tailwind`, exact version numbers). User-extensible via `.cleargate/scaffold-blocklist.txt`.
- `cleargate-cli/test/integration/foreign-repo.test.ts` (new) — two fixtures (minimal Node, minimal Go); run `cleargate init` programmatically via the CLI's own init handler with `cwd` seam; assert scaffold files present + parseable + no leaks.
- `.github/workflows/scaffold-lint.yml` (new) — runs scaffold-lint + foreign-repo test on PR.

**Data Changes:**
- New optional key in `.cleargate/config.yml`: `gates: { precommit: string, typecheck: string, test: string, lint: string }`. All optional; each defaults to a no-op-with-message when absent.

## 5. Acceptance Criteria

```gherkin
Feature: Framework Universality — Public Ship

  Scenario: LICENSE present
    Given a fresh clone of the repo
    When I check the root directory
    Then LICENSE exists and contains MIT text
    And cleargate-cli/LICENSE exists with the same content

  Scenario: Stranger onboarding flow
    Given a user who has never seen ClearGate
    When they follow README.md install steps in a blank Node repo
    Then within 10 minutes they can run `cleargate init`, file a proposal under .cleargate/delivery/pending-sync/, and invoke the Architect subagent in Claude Code

  Scenario: Config-driven precommit gate
    Given a downstream repo with `.cleargate/config.yml` setting `gates.precommit: "cargo check"`
    When an agent invokes `cleargate gate precommit`
    Then the command runs `cargo check` and exits with its status
    And the developer.md agent definition does not hard-code `npm test`

  Scenario: Missing config is not a blocker
    Given a downstream repo with no `.cleargate/config.yml`
    When an agent invokes `cleargate gate precommit`
    Then stdout contains "no gate configured — add `gates.precommit` to .cleargate/config.yml"
    And exit code is 0

  Scenario: Scaffold-lint catches stack leaks
    Given a hypothetical edit to cleargate-planning/.claude/agents/developer.md that adds the word "drizzle"
    When I run `cleargate scaffold-lint`
    Then the command exits non-zero
    And stderr identifies the file + line of the leak

  Scenario: Foreign-repo integration test
    Given a tmpdir initialized with only `package.json` (no ClearGate files)
    When `cleargate init` runs against it
    Then .cleargate/, .claude/agents/, .claude/hooks/, CLAUDE.md all exist
    And every agent YAML frontmatter parses without error
    And `cleargate scaffold-lint` against the installed scaffold exits 0

  Scenario: Meta-repo workflow unchanged
    Given this repo's own `.cleargate/config.yml` with `gates.precommit: <real command>`
    When the dogfood loop runs a sprint
    Then the pre-commit gate behavior is byte-identical to pre-EPIC-018 behavior
```

## 6. AI Interrogation Loop

- **Q1. Foreign-repo fixtures — Node only, or Node + Go, or Node + Go + Python?**
  - **Recommended default:** Node + Go (two fixtures). Node validates the happy path; Go validates the non-Node claim. Python adds testing time without materially different coverage.

- **Q2. Scaffold-lint strictness — block on any stack string, or use allowlist for known-safe usages (e.g., `drizzle` inside a FLASHCARD example that's explicitly labeled "ClearGate-specific")?**
  - **Recommended default:** strict block. Any mention fails. If a scaffold doc genuinely needs an example, use a neutral placeholder (`<your-orm>`, `<your-test-runner>`). Keeps the lint rule simple.

- **Q3. Gate CLI surface — single `cleargate gate <name>` (precommit|test|typecheck|lint) or separate `cleargate precommit`, `cleargate test` top-level commands?**
  - **Recommended default:** single `cleargate gate <name>`. Keeps top-level namespace clean and matches existing `cleargate gate <predicate>` readiness-gate convention.

- **Q4. Do we publish a new npm version (`cleargate@0.3.0`) at the end of this epic, or bundle with later work?**
  - **Recommended default:** publish `0.3.0` at epic close. Marks "public-ready" as a real release. Write CHANGELOG.md at the same time (partial overlap with EPIC-016 scope — but a minimal CHANGELOG for 0.2.x → 0.3.0 is cheap and unblocks shipping).

- **Q5. README tone — "ClearGate is an opinionated framework for Claude Code users" or "ClearGate is a planning scaffold your AI agents follow"?**
  - **Recommended default:** the second. Less cultish, more functional. Claude Code users will know the framing; others should still understand the value without being gated on tool affinity.

## 7. Stories (Decomposition)

| ID | Title | Complexity | Depends on |
|---|---|---|---|
| [[STORY-018-01]] | LICENSE (MIT) at repo root + CLI package | L1 | — |
| [[STORY-018-02]] | README split + stranger-onboarding walkthrough + docs/INTERNALS.md | L2 | 018-01 (LICENSE reference) |
| [[STORY-018-03]] | Config-driven gates (`gate.ts` + config.yml + agent rewording) | L2 | — |
| [[STORY-018-04]] | `cleargate scaffold-lint` + blocklist + CI workflow | L2 | 018-03 (so agents already use gate verbs when lint runs) |
| [[STORY-018-05]] | Foreign-repo integration test + CI | L2 | 018-03 + 018-04 |

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green:
- [ ] §6 AI Interrogation Loop answered by human (5 questions)
- [ ] `<agent_context>` target_files list confirmed against actual repo layout
- [ ] Sprint placement confirmed (SPRINT-12 per Option C of 2026-04-24 conversation)
- [ ] 0 TBDs

**Sprint placement:** SPRINT-12 per Option C decision. Hygiene (bugs + pruning + awareness) deferred to SPRINT-13.
