---
sprint_id: "SPRINT-12"
source_tool: "local"
status: "Planned"
start_date: null
end_date: null
activated_at: null
completed_at: null
created_at: "2026-04-24T00:00:00Z"
updated_at: "2026-04-24T00:00:00Z"
context_source: "EPIC-018_Framework_Universality_Public_Ship.md"
epics: ["EPIC-018"]
approved: true
approved_at: "2026-04-24T00:00:00Z"
approved_by: "sandro"
execution_mode: "v2"
human_override: false
---

# SPRINT-12: Framework Universality — Public Ship

## Sprint Goal

Ship **EPIC-018** — make ClearGate installable into any target repo. Remove the dogfood-specific assumptions that leak through the scaffold (`npm test` / `npm run typecheck` hard-codes, stack vocabulary, no LICENSE, dogfood-first README), and prove it works end-to-end via an automated foreign-repo integration test.

After this sprint: a stranger with no prior context can `npm i -D cleargate && npx cleargate init` in a blank Node or Go repo and drive the four-agent loop without forking the scaffold. Hygiene (bugs + EPIC-018 pruning that was renumbered + awareness polish) is **deferred to SPRINT-13** per Option C of the 2026-04-24 conversation.

**This sprint is the vibe-coder-product-market-fit gate.** Until it lands, ClearGate is a private dogfood repo; after it lands, ClearGate is a public framework.

## 1. Consolidated Deliverables

| Story | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|
| [`STORY-018-01`](STORY-018-01_LICENSE_MIT.md) LICENSE (MIT) | L1 | y | low | M1 |
| [`STORY-018-02`](STORY-018-02_README_Split_Onboarding.md) README split + onboarding walkthrough | L2 | y | low | M1 |
| [`STORY-018-03`](STORY-018-03_Config_Driven_Gates.md) Config-driven gates | L2 | y | med | M1 |
| [`STORY-018-04`](STORY-018-04_Scaffold_Lint.md) `cleargate scaffold-lint` + CI | L2 | n | low | M2 |
| [`STORY-018-05`](STORY-018-05_Foreign_Repo_Integration_Test.md) Foreign-repo integration test + CI | L2 | n | med | M2 |

**Totals: 5 stories, 1 Epic. Complexity: 1×L1 + 4×L2. No L3/L4.**

## 2. Execution Strategy

### 2.1 Phase Plan

**M1 — LICENSE + README + Gate decoupling (Wave 1, parallel):**
All three stories marked `parallel_eligible: y`, touching disjoint surfaces:
- 018-01 is a 2-file LICENSE add (trivial).
- 018-02 edits README.md + adds docs/INTERNALS.md.
- 018-03 edits `cleargate-cli/src/commands/gate.ts` + `src/lib/wiki-config.ts` + agent `.md` files in both `cleargate-planning/.claude/agents/` and this repo's `.claude/agents/`.
There IS shared surface between 018-02 and 018-03: both edit nothing directly but 018-02's stranger-onboarding walkthrough references the new `cleargate gate` verbs. Recommended concurrency: 018-01 + 018-03 first (018-03 provides the vocabulary 018-02 documents), then 018-02 after 018-03's commit lands. Or run all three in parallel worktrees and accept that 018-02 may need a one-line update post-018-03.

**M2 — Scaffold-lint + Integration test (Wave 2, sequential):**
- **018-04 first.** Needs M1's 018-03 gate-verb agent rewording to be in place so scaffold-lint doesn't flag legitimate `npm test` strings in agent docs (those strings are gone post-018-03).
- **018-05 after 018-04.** Integration test invokes `cleargate scaffold-lint` as one of its assertions — the command must exist.
Both stories `parallel_eligible: n` and share CI-workflow touches (`.github/workflows/scaffold-lint.yml`): 018-04 creates it, 018-05 extends it with a new job.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `cleargate-planning/.claude/agents/developer.md` + `qa.md` | 018-03 (gate reword) | — | Single-story surface post-rewording |
| `.claude/agents/developer.md` + `qa.md` (this repo) | 018-03 | — | Single-story surface |
| `cleargate-cli/src/lib/wiki-config.ts` | 018-03 (extend to load `gates`) | — | Built on EPIC-015's wiki-config surface; single-story edit |
| `cleargate-cli/src/commands/gate.ts` | 018-03 | — | Single-story |
| `cleargate-cli/src/cli.ts` | 018-03 + 018-04 (register subcommands) | 018-03 → 018-04 | Both add new subcommand imports at the top + registration blocks. Serialize: 018-03 lands first, 018-04 rebases and appends |
| `.github/workflows/scaffold-lint.yml` | 018-04 (create) + 018-05 (extend) | 018-04 → 018-05 | 018-05 adds a new job to the workflow 018-04 created |
| `cleargate-cli/package.json` | 018-01 (license field + files array) | — | Single-story |
| `README.md` | 018-02 | — | Single-story (may need nudge post-018-03 if gate-verb names change) |
| `cleargate-cli/vitest.config.ts` | 018-05 (include `test/integration/**`) | — | Single-story |

### 2.3 Shared-Surface Warnings

- **`cli.ts` registration.** Both 018-03 and 018-04 add new subcommand blocks. Serialize per §2.2; landing out-of-order causes an easy rebase but wastes time.
- **Agent `.md` rewording (018-03).** Agent definitions are read by Claude Code at session start. If we push 018-03 mid-sprint with the agent wording change, any in-flight Developer agent spawned before the push still sees the OLD wording; agents spawned after see the new. In practice this is fine because v2 worktrees snapshot agent files at spawn time.
- **Scaffold-lint self-scan (018-04).** The blocklist file itself (`cleargate-cli/src/lib/scaffold-blocklist.ts`) contains the very terms we're banning. 018-04 must exclude its own lib file + test file from the scan or the lint fails against itself.
- **This repo's `.cleargate/config.yml` (018-03).** New file committed in this repo. Must be added as part of the 018-03 commit, not left for a follow-up, or dogfood loop breaks the moment agent definitions switch to `cleargate gate test`.

### 2.4 ADR-Conflict Flags

- **Protocol wording (`cleargate-protocol.md`).** Current protocol text references `npm run typecheck` + `npm test` as pre-commit gates in several sections. 018-03 agent-wording change may trigger a follow-up protocol edit. Decision: protocol text becomes *descriptive of this repo's chosen gates* with a one-line note that downstream repos configure via `.cleargate/config.yml`. Out-of-scope for SPRINT-12 unless a story ships a protocol edit organically.
- **Version bump (`0.2.1` → `0.3.0`).** Per EPIC-018 §6 Q4 recommended default. Happens at sprint close, not inside a specific story. Reporter captures in REPORT.md; a follow-up `chore(SPRINT-12): bump to 0.3.0` commit publishes.

## Milestones

- **M1 — LICENSE + README + Gate decoupling (3 stories).** Ends when 018-01/02/03 all pass QA + merge to sprint branch. M1 goal: the public-adoption prerequisites are all in place (LICENSE exists, README reads for strangers, agents no longer hard-code Node verbs).
- **M2 — Scaffold-lint + Integration test (2 stories).** Starts after M1 closes (both 018-04 and 018-05 depend on M1 landing). M2 goal: universality is enforced by CI — any regression fails loudly on PR.

## Risks & Dependencies

**Status legend:** `open` · `mitigated` · `hit-and-handled` · `did-not-fire`.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R-01 | 018-03's agent rewording silently breaks the dogfood loop if this repo's `.cleargate/config.yml` isn't committed in the same commit | Developer must land both in the single 018-03 commit; QA checks the dogfood loop still runs | Developer 018-03 / QA | open |
| R-02 | scaffold-lint flags legitimate ClearGate-planning examples (e.g. a code fence showing `npm test` as "the example from our own setup") | Allowlist file per STORY-018-04 §1.2; QA verifies exit 0 against current tree at story-end | Developer 018-04 | open |
| R-03 | Foreign-repo integration test relies on `initHandler` accepting a `cwd` seam; if seam doesn't exist, 018-05 balloons into a seam-add story | Pre-flight: developer confirms `cwd` seam exists on `initHandler` before touching test code; if absent, split into 018-05a (seam) + 018-05b (test) | Architect M2 / Developer 018-05 | open |
| R-04 | README walkthrough cites command names that shift between M1 merge and sprint close (e.g. `cleargate gate test` vs `cleargate test`) | Lock CLI verb shape at 018-03 merge; 018-02 rebases on 018-03's merged state rather than authoring in parallel | Developer 018-02 | mitigated |
| R-05 | CI workflow permissions / secrets — GitHub Actions needs no special access for scaffold-lint or integration test | Design uses only `node`, `npm`, `git`; no external API calls | Developer 018-04 / 018-05 | did-not-fire (prospective) |
| R-06 | Node 24 availability on GitHub Actions — `setup-node@v4` supports it | Pin to `node-version: 24` in workflow; fallback LTS if needed | Developer 018-04 | did-not-fire (prospective) |

## Metrics & Metadata

- **Expected Impact:** ClearGate becomes installable in any public repo without forking. Foreign-repo integration test creates a regression safety net preventing future re-leakage.
- **Priority Alignment:** User-designated **Option C** of 2026-04-24 conversation — "anyone can use it" product-market-fit gate precedes hygiene cleanup.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** 018-01 (LICENSE, 5 min) + 018-03 (gate decoupling, the structural change) in parallel. 018-02 (README) waits until 018-03's merge lands on sprint/SPRINT-12 so the walkthrough cites final verb names.
- **Relevant Context:**
  - EPIC-018 §6 interrogation answers drive default behavior (tokenizer, allowlist strictness, gate CLI shape, version bump, README tone).
  - STORY-015-03's `wiki-config.ts` is the base for 018-03's gate-config extension.
  - This repo's current pre-commit invocation (`npm run typecheck --workspace=cleargate-cli && npm test`) must land verbatim in this repo's `.cleargate/config.yml` as the 018-03 commit.
  - Scaffold-lint allowlist file (`.cleargate/scaffold-allowlist.txt`) is user-editable but expected to be empty for this repo post-story.
- **Constraints:**
  - Do NOT touch MCP server or admin UI surfaces — this sprint is framework-universality only.
  - Do NOT delete or rename existing agent-definition sections outside the `npm test` / `npm run typecheck` substitutions.
  - Do NOT publish `0.3.0` to npm inside a story commit — the bump is a post-sprint-close chore.
  - Node + vitest remain the CLI's own toolchain (this sprint is about what the CLI *imposes on downstream*, not what it *uses internally*).
