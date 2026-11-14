<instructions>
This template is actively authored during the Prepare phase.

WHAT TO GATHER
  - Sprint number — read .cleargate/wiki/active-sprint.md, scan pending-sync/SPRINT-*.md, emit max(N) + 1
  - Available work items — pending-sync/{EPIC,STORY,CR,BUG,HOTFIX}-*.md filtered ambiguity:🟢 + status:Ready
  - Human-set priorities — frontmatter `priority` field per item
  - Cross-item dependencies — `parent_epic_ref:` + shared file-surface analysis

HOW TO GATHER
  - Read for sprint-runs/, Grep for pending-sync/, scripts/wiki-query for awareness layer
  - cleargate-cli/src/lib/admin-url.ts for any admin-link references

ANALYSIS REQUIRED
  - Propose priority reordering for technical reasons (dep chains, shared-surface conflicts, fast-lane bundling). One-line rationale per change.
  - Flag missing decomposition (epics with no child stories) — must resolve before Gate 2 passes.
  - Trigger Architect Sprint Design Review (writes §2 Execution Strategy) once scope is locked.

WHERE TO WRITE
  - .cleargate/delivery/pending-sync/SPRINT-<#>_<name>.md

POST-WRITE BRIEF
  Render in chat with these sections:
    - Sprint Goal (1 sentence)
    - Selected items (table: id / type / lane / milestone / parallel? / bounce-exposure)
    - Recommended priority changes (with one-line rationale per change)
    - Open questions for human (with recommended answers)
    - Risks (with mitigations)
    - Current ambiguity + Gate 2 readiness checklist (decomposed? all 🟢? SDR §2 written?)
  Halt for human review. When ambiguity reaches 🟢 AND Gate 2 conditions satisfy, proceed to call cleargate_push_item.

DUAL-AUDIENCE STRUCTURE
  Top of body: Stakeholder/Sponsor view (Sprint Goal, Business Outcome, Risks/Mitigations, Metrics).
  Bottom of body: AI-execution view (Phase Plan, Merge Ordering, Lane Audit, ADR-Conflict Flags, Decomposition Status).

Do NOT output these instructions.
</instructions>

---
sprint_id: SPRINT-45
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
lifecycle_init_mode: block
remote_id: null
source_tool: manual
status: Draft
start_date: 2026-11-14
end_date: 2026-11-17
synced_at: null
created_at: 2026-11-13T23:00:46.015Z
updated_at: 2026-11-13T23:00:46.015Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T23:02:35Z
  transition: ready-for-execution
epics:
  - EPIC-064
proposals: []
stories:
  - STORY-064-01
  - STORY-064-02
crs:
  - CR-120
bugs:
  - BUG-117
  - BUG-133
  - BUG-134
execution_mode: v2
sprint_goal: |
  Make the sprint report's rework and cost figures come from what actually happened (the host's
  subagent transcripts and git), and make `cleargate upgrade` safe for repos with local edits,
  proven against a holdout recount of SPRINT-44 and dispenser_adapter's sprints.
context_source: |
  Decomposes EPIC-064 (INITIATIVE-002 WS-4, triaged 2026-11-14) into STORY-064-01/02 plus the
  amended CR-120. Carries BUG-117 (from SPRINT-43, folded per INITIATIVE-002 §6) and BUG-133/134
  (upgrade safety needed before the dispenser_adapter pilot).
last_contradict_sha: "9f4323fce86953e6a8c25dfc6074064025057e9cbf36a85baad100dd56b430fe"
---

# SPRINT-45: Measured Loop and Safe Upgrade

## 0. Stakeholder Brief

This is the first slice of INITIATIVE-002 (Evidence-First Execution Loop). The loop's own numbers are wrong: rework counters stay at zero while git shows rework, and per-agent cost measures the orchestrator's window. Until they are right, no later change to the loop can be judged. This sprint makes the sprint report count rework and cost from records the loop cannot forget to write: the host's per-agent transcripts, including workflow runs, and git. It also fixes two upgrade defects, so the release candidate can go to dispenser_adapter without silently replacing its local customisations.

The sprint runs on the current loop, with five rules from INITIATIVE-002 applied by hand (Execution Guidelines below). Nothing here changes this repo's live loop until the release candidate has passed in dispenser_adapter.

- **Sprint Goal:** Make the sprint report's rework and cost figures come from what actually happened (subagent transcripts and git), and make `cleargate upgrade` safe for repos with local edits, proven against a holdout recount of SPRINT-44 and dispenser_adapter's sprints.
- **Business Outcome:** sprint reports the owner can trust without a recount, and a release candidate safe to install in a customised field repo.
- **Risks (top 3):** host transcript layout or retention changes; derived counts disagree with the recount for reasons that are not bugs; the upgrade fixes miss a dispenser-specific customisation. See Risks & Dependencies.
- **Metrics:** derived rework within 10% of the holdout recount; at least 95% of subagent tokens attributed; upgrade dry-run on a copy of dispenser_adapter lists only changed files and names every overwritten local edit.

## Sprint Goal

Make the sprint report's rework and cost figures come from what actually happened (the host's subagent transcripts and git), and make `cleargate upgrade` safe for repos with local edits, proven against a holdout recount of SPRINT-44 and dispenser_adapter's sprints.

## 1. Consolidated Deliverables

The Proof column applies INITIATIVE-002 rule 1 by hand: the tier, and the check that produces the evidence.

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure | Proof (tier — check) |
|---|---|---|---|---|---|---|
| `CR-120` | Measure the subagent, not the orchestrator — dispatch ledger incl. workflow runs | standard | M1 | y | med | Real run — reader on SPRINT-44 and dispenser_adapter sessions; dispatch counts match the holdout recount |
| `STORY-064-01` | Per-item metrics derived from transcripts and git | standard | M1 | y (on contract C1) | med | Real run — `sprint_metrics.mjs` on the evidence set vs the holdout recount (10% / ±1 per item) |
| `STORY-064-02` | Sprint report reads derived metrics | standard | M2 | n (after 064-01) | low | Real run — bundle for SPRINT-44 and SPRINT-45's own close |
| `BUG-117` | Pricing table lacks Claude 5 models | fast | M1 | y | low | Unit — pricing lookups for every Claude 5 model id |
| `BUG-133` | Upgrade output hides lost local edits | standard | M1 | y | med | Real run — packed RC, `upgrade --dry-run` on a copy of dispenser_adapter |
| `BUG-134` | Upgrade settings merge reorders hooks | standard | M1 | y | low | Real run — packed RC, `upgrade --yes` on a copy of dispenser_adapter; `settings.json` diff shows only ClearGate hooks |

## 2. Execution Strategy
*(Written by Architect during Sprint Design Review, architect-reader ×6 → architect-synth, 2026-11-14.)*

> **SDR status: complete. Nested-cli layout confirmed by the owner at Gate 2 (2026-11-14).** Every path in this sprint is inside the nested `cleargate-cli` repo. From an outer worktree the readers classify all of them unreachable, so under BUG-046 all six items would be refused. The plan below uses the SPRINT-44 ruling (a) layout instead: nested cli worktrees under detached outer hosts, merging locally into cli `main`. In that layout every declared path exists. The SPRINT-44 ruling covered SPRINT-44 only, so it needs confirming again for SPRINT-45. `plans/waves.json` carries the full plan, with `launchable: false` until then.
>
> Refusal record (applies only if Gate 2 declines the layout; all paths under `cleargate-cli/`):
>
> | Item | Refusal |
> |---|---|
> | CR-120 | unreachable file surface — refused: scaffold/core/.cleargate/scripts/{subagent-ledger.mjs, count_tokens.mjs, lib/ledger-digest.mjs, surface-whitelist.txt, pre_gate_runner.sh}, scaffold/hosts/claude/.claude/{hooks/token-ledger.sh, skills/sprint-execution/SKILL.md}, test/scripts/subagent-ledger.node.test.ts, test/fixtures/subagent-ledger/ |
> | STORY-064-01 | unreachable file surface — refused: scaffold/core/.cleargate/{scripts/sprint_metrics.mjs, config.example.yml}, test/scripts/sprint-metrics.node.test.ts, test/fixtures/sprint-metrics/ |
> | STORY-064-02 | unreachable file surface — refused: scaffold/core/.cleargate/{scripts/prep_reporter_context.mjs, templates/sprint_report.md}, scaffold/hosts/claude/.claude/agents/reporter.md, test/scripts/test_prep_reporter_context.node.test.ts, test/agents/reporter-content.node.test.ts |
> | BUG-117 | unreachable file surface — refused: src/lib/pricing.ts, test/lib/pricing.node.test.ts |
> | BUG-133 | unreachable file surface — refused: src/commands/upgrade.ts, src/lib/changelog.ts |
> | BUG-134 | unreachable file surface — refused: src/init/merge-settings.ts, src/lib/settings-json-surgery.ts, src/commands/upgrade.ts, src/hosts/claude.ts, src/hosts/codex.ts |

### 2.1 Phase Plan

**How the work runs.** Same layout as SPRINT-44 rules 10–16; copy them into `sprint-context.md` at kickoff, with S-44 changed to S-45.
- Each item builds in `OUTER/.worktrees/<ID>/cleargate-cli`, cut with `git -C OUTER/cleargate-cli worktree add <path> -b story/<ID> <base>`. The outer host is detached at the outer sprint line; no item changes the outer repo.
- The orchestrator sets up each worktree, one at a time: symlink `node_modules` and `/.claude`, then run `npm run prebuild`. Never run `npm install` or `npm ci` in a worktree. No agent edits the cli main checkout.
- At most 4 build lanes and 1 merge lane. Build lanes run typecheck and targeted test files. Only the merge lane runs `npm test`, and never two full suites at once.
- The cli sprint line is local `main` (tip `dbccc79`). Nothing is pushed or published.

**Contract step C0.** One Developer dispatch in a throwaway cli worktree.
- It writes two skeleton commits, C2 stacked on C1: `chore(EPIC-064): contract C1 skeleton (CR-120 subagent-ledger)` and `chore(EPIC-064): contract C2 skeleton (STORY-064-01 sprint_metrics)`.
- Each commit stays inside its owner's declared surface.
- Before handoff, on each branch: `node --check` passes, `npm run typecheck` is clean and `npm run prebuild` passes.
- For C2 only: with `CLEARGATE_SPRINT_DIR` set to an empty scratch dir, `sprint_metrics.mjs SPRINT-44 --json` prints one document with schema 1 and exits 0. With no arguments it exits 2.

| ID | Branch | Base | Owner | What it freezes |
|---|---|---|---|---|
| C1 | `contract/S-45-ledger` | cli `main` | CR-120 | **`subagent-ledger.mjs`:** `@typedef DispatchRow {schema: 1, session_id: string, agent_id: string, tool_use_id: string, completed: boolean, run_id: string \| null, agent_type: string, workflow_phase: string \| null, description: string, model: string, started_at: string, ended_at: string, wall_ms: number, turns: number, tool_uses: number, usage: {input: number, output: number, cache_read: number, cache_creation: number}}`. Timestamps are ISO-8601. `run_id` is null for a top-level dispatch. `completed` is false on a user interruption or a cancelled hook.<br>**Functions:** `discoverSessions(sprintDir: string, opts?: object): string[]` and `readDispatches(sessionDirs: string[], opts?: object): DispatchRow[]`, **both synchronous**. Both stubs return `[]`. |
| C2 | `contract/S-45-metrics` | C1 | STORY-064-01 | **CLI:** `node sprint_metrics.mjs <sprint-id> [--json]`. `CLEARGATE_SPRINT_DIR` overrides the sprint dir, as in `count_tokens.mjs:100`. Exit 0 whenever it runs, degraded runs included. Exit 2 on a usage error, with empty stdout. `--json` prints exactly one document.<br>**Document:** `{schema: 1, sprint_id: string, generated_at: string, sources: {sessions: number, dispatches: number, repos: string[], warnings: string[]}, items: Record<ID, Item>, sprint_level: {dispatches: number, tokens: number}, unattributed: {dispatches: number, tokens: number, share: number}, totals: {dispatches: number, rework: number, tokens: number}}`.<br>**Item:** `{dispatches: {total, by_role: Record<string, number>, by_phase: Record<string, number>}, rework: {red_corrections, dev_reruns, verify_reruns, total}, interrupted, post_merge, git: {red_written, red_corrected, build, rework, integrate, merged}, wall_ms, tokens: {input, output, cache_read, cache_creation, total}, models: string[], state_counters: {qa_bounces, arch_bounces}, disagrees: boolean, dispatch_source: string}`. Every field without a stated type is a `number`; every `git` field is a commit count.<br>**Semantics:** `dispatch_source: "not measured"` is the only reserved value. When it is set, `sources.warnings` includes `"dispatch data: not measured"`, and consumers show dispatch and token figures as "not measured", never as 0. `share` is a fraction in [0, 1]: unattributed tokens ÷ all subagent tokens.<br>**Stub:** prints a valid all-zero document with `items: {}` and both warnings (`"contract C2 stub — STORY-064-01 not integrated"`, `"dispatch data: not measured"`). It writes nothing to disk. |

**Amendments to the proposed contracts (confirm at Gate 2):**
- Every field now has an exact type.
- Both reader functions are synchronous, as proposed (`→ string[]`).
- C2 freezes the CLI, the env override and the exit codes from STORY-064-01 R1, because STORY-064-02 depends on them.
- C2 fixes how "not measured" is shown (R9; STORY-064-02 R2).
- `share` is frozen as a token fraction, matching the ≥95% attribution metric.

**Freeze rules:**
- Owners replace stub bodies. They may add optional `opts` fields, row fields and document keys.
- Owners never remove, rename or retype a frozen name, never make a reader function async, and never change C2's exit codes, env override or the meaning of "not measured".
- If CR-120 needs an async reader or a nullable field, amend the contract before C0, not after.
- If a bounce changes a frozen export, record the new SHA in §6. Each consumer adjusts at integration (QA-Red handles tests). Never cherry-pick.

**Build set.** All six build at once after C0, within the 4-lane cap.

| Item | Base | Upstream | Layer | Why it waits |
|---|---|---|---|---|
| CR-120 | `contract/S-45-ledger` | — | 0 | — (owner of C1; builds from its own contract, so the skeleton is a shared ancestor for later merges) |
| BUG-117 | cli `main` | — | 0 | — |
| BUG-133 | cli `main` | — | 0 | — |
| BUG-134 | cli `main` | — | 0 | — (its `upgrade.ts` overlap with BUG-133 is not a real collision; see §2.2) |
| STORY-064-01 | `contract/S-45-metrics` | CR-120 | 1 | Consumes C1 |
| STORY-064-02 | `contract/S-45-metrics` | CR-120, 064-01, BUG-117, BUG-133, BUG-134 | 2 | Consumes C2, which sits on C1. `parallel_eligible: n` and the plan says it "integrates last". The three bug edges only set merge order; there is no file overlap (flashcard 2026-09-26 #sdr #waves). Drop one if that bug stalls. |

**Lane schedule.** Kickoff: CR-120, STORY-064-01, BUG-133, BUG-134. The first free lane goes to STORY-064-02 (the end of the critical path), then BUG-117.

**Integration (CR-124).** Same as SPRINT-44 rule 13.
1. Run `git merge --no-ff main` in the item's worktree. On a conflict, the owner's file wins. A conflict inside an existing or red test goes to QA-Red.
2. Run `npm run gen:codex`; it must leave no diff. Then run `prebuild`, typecheck and the targeted tests.
3. Run QA-Verify on the integrated tree. If `main` moves before the merge, integrate again.

**Merge order:** CR-120 → STORY-064-01 → BUG-117 → BUG-133 → BUG-134 → STORY-064-02. The merge lane takes items as they pass, as long as their upstream has merged. On a tie, the critical path goes first.

**Critical path:** C0 → CR-120 build → merge CR-120 → integrate 064-01 → merge 064-01 → (bugs merged) → integrate 064-02 → merge 064-02 → close (064-02's SPRINT-45 bundle).

**Expected red before integration.**
- **STORY-064-01:** against C1's stub, only the R9 "not measured" path runs end to end. Feed `DispatchRow` fixtures through the story's own seam to test R3–R8. The holdout real run goes green only after integrating CR-120.
- **STORY-064-02:** C2's stub makes "Metrics not measured never fail the bundle" green. The metrics-available scenario runs from a fixture document through the story's own seam. Real bundles come only on the integrated tree. Dev reports should say so.

**Proof runs (rule 1).**
- Use the canonical scripts by path, never the live copies (rule 5). `prep_reporter_context.mjs:54` and `count_tokens.mjs:45` find the repo root from their own location, so set `CLEARGATE_SPRINT_DIR` (and `CLEARGATE_PENDING_SYNC_DIR`) to the target sprint.
- `sprint_metrics.mjs` always writes `<sprintDir>/metrics.json` (R1). For SPRINT-44 that file lands in the outer tree; commit it as evidence or restore it.
- `npm pack` runs no lifecycle script (there is no `prepack` or `prepare`). Run `prebuild && build` in the item's worktree before packing, and run the RC on a fresh copy of dispenser_adapter.
- QA-Verify or the orchestrator makes the holdout comparisons, never QA-Red or the Developer. Results go to `evidence/`.
- STORY-064-02's SPRINT-45 bundle exists only at close, so its rule-1 evidence completes at close.

### 2.2 Merge Ordering (Shared-File Surface Analysis)

| Shared File | Stories Touching It | Merge Order | Rationale |
|---|---|---|---|
| `src/commands/upgrade.ts` | BUG-133, BUG-134 | BUG-133 → BUG-134 (either works) | Not a real collision. BUG-133 edits the dry-run label (:834–846) and the `[always]` print line (:1127). `upgrade.ts` never calls `mergeSettings` or `removeClearGateHooks`; it only names them in a header comment at :14. BUG-134's call sites are in `hosts/claude.ts` (:127, :241, :364–368) and `hosts/codex.ts` (:115–117, :229, :313–314). If BUG-134 does touch `upgrade.ts`, it will be a different region, re-applied at integration. |
| `scripts/subagent-ledger.mjs` (C1) | CR-120 (owner), STORY-064-01 (imports) | CR-120 → 064-01 | A contract dependency, not a file collision; 064-01 never edits it. |
| `scripts/sprint_metrics.mjs` (C2) | STORY-064-01 (owner), STORY-064-02 (runs it as a child process) | 064-01 → 064-02 | A contract dependency; 064-02 only runs it. |
| Codex-generated copies | CR-120: `scaffold/core/.agents/skills/sprint-execution/SKILL.md`, `scaffold/hosts/codex/.codex/hooks/token-ledger.sh`. STORY-064-02: `scaffold/hosts/codex/.codex/agents/reporter.toml` | — | Not a single-writer collision: each file has one source and one owner, and `gen:codex` rewrites unchanged files with identical bytes. Added to their owners' surfaces by CR:spec-clarification on 2026-11-14, because `prebuild` runs `build-codex-payload.mjs --check` (SPRINT-44 precedent). |

No ordered migration journal, lockfile or shared generated file is involved. No item declares a new dependency. `db_write_set` is empty for all six.

### 2.3 Shared-Surface Warnings

- **BUG-133 × BUG-134, `upgrade.ts`:** keep the edit regions apart. Each bug puts its red tests in its own new `*.red.node.test.ts`, not in one shared upgrade test file.
- **CR-120 × STORY-064-01, C1:** the reader functions are frozen as synchronous, with `usage` never null. A late change to async or nullable breaks 064-01's build, so make any such change before C0.
- **CR-120 × STORY-064-02, `count_tokens.mjs --json`:** `prep_reporter_context.mjs:247` reads this output, and no contract freezes it. CR-120 keeps the existing keys and only adds.
- **STORY-064-01 × STORY-064-02, C2:** 064-02 passes `CLEARGATE_SPRINT_DIR` through to the child, as it already does for `count_tokens.mjs` (:15). It detects "not measured" from `dispatch_source`, never from a zero.
- **STORY-064-01, R6 project root:** find the project root from the sprint dir or cwd, never from the script's own location. Otherwise a proof run from the canonical path treats `cleargate-cli/scaffold/core` as the project.
- **CR-120, sprint-execution `SKILL.md`:** the Codex copy is rendered using anchors A1–A6 (each unique, in order) and a list of banned tokens (`Workflow tool`, `launch_wave`, `RUN_ID`, `parallel()`, `C.0.1`, `C.0.2` and others). Text about workflow runs could easily use one of these outside a replaced anchor, which fails `prebuild --check`.
- **CR-120, `token-ledger.sh`:** `token-ledger-delta.integration` runs the live hook, so CR-120's tests run the canonical hook by path. CR-120 adds no new hook event kind (sprint constraint).
- **Canonical-live parity (rule 5):** canonical-live-parity check 5d fails from the CR-120 merge. Checks 5a (`sprint_report.md`, not skipped in worktrees) and 5c (`reporter.md`, merge lane) fail from the STORY-064-02 merge. The `doctor` drift warning starts at the first merge. See §2.5.
- **BUG-133 × STORY-064-01, behaviour only:** `upgrade` always overwrites `config.example.yml` (:1127), and 064-01 edits that file. The dry-run's list of changed files depends on what the RC contains, so run the Goal Acceptance Check on the final integrated RC.
- **BUG-134, Codex half:** `upgrade` never calls the codex adapter's install (flashcard 2026-09-27 #codex #upgrade). If `upgrade` never reaches `codex.ts:313`, the `upgrade --yes` proof does not cover the Codex half, so that half needs its own test.
- **Fixtures:** transcripts in `test/fixtures/subagent-ledger/` and `test/fixtures/sprint-metrics/` are synthetic or scrubbed. They contain no prompt text, user paths or names (the same rule as STORY-064-01 R10).

### 2.4 Lane Audit

| Story | Lane | Rationale (≤80 chars) |
|---|---|---|
| `BUG-117` | fast | one table in src/lib/pricing.ts, unit-provable, no UI or subsystem crossing |

**Literal check:** BUG-117 fails rubric check 4 as written: it has one `Scenario Outline` (5 rows) plus one `Scenario`. The other checks hold on the evidence available: 2 files, no forbidden surface, no new dependency, the existing `test/lib/pricing.node.test.ts`, bounce exposure `low`, one subsystem. It stays fast under sprint rule 3 and the orchestrator's direction. The owner confirms at Gate 2; otherwise it becomes standard and nothing else in the plan changes.

The other five stay `standard`. Failing checks:

| Story | Lane | Failing checks |
|---|---|---|
| `CR-120` | standard | 1 (9 paths, new module); 4 (runtime change, no Gherkin); 6 (`med`) |
| `STORY-064-01` | standard | 1 (new script, config, tests); 4 (4 scenarios + 2 outlines); 6 (`med`) |
| `STORY-064-02` | standard | 1 (5 files); 4 (4 scenarios) |
| `BUG-133` | standard | 1 (2 source files + tests); 4 (4 scenarios); 6 (`med`) |
| `BUG-134` | standard | 1 (5 files); 4 (2 scenarios + 1 outline) |

### 2.5 ADR-Conflict Flags

- **BUG-046 reachability (owner decision 2026-08-26):** needs the Gate 2 confirmation above; otherwise the refusal stands for all six items.
- **Rule 5 vs merge-lane tests (owner decision needed):** live copies are frozen and the re-sync waits for the dispenser verdict, so the parity checks listed in §2.3 are certain to fail.
  - Recommended: record each as an expected failure in §6 at the merge that causes it, and have DevOps confirm that the full-suite failures are exactly those.
  - No hand-port to live.
- **Rule 5 vs the `dist` rebuild (owner decision needed):** five live hooks run `cleargate-cli/dist/cli.js` (`session-start.sh:13`, `pre-edit-gate.sh:87`, `post-shell-ingest.sh:24`, `pending-task-sentinel.sh:279`, `stamp-and-gate.sh`).
  - SPRINT-44 rebuilt `dist` on cli `main` after each merge; doing that here would change the live loop mid-sprint.
  - Recommended: no rebuild during the sprint. Run post-merge full suites in a throwaway worktree at `main`'s tip (flashcard 2026-09-26 #worktree #build).
- **Dogfood split / BUG-085:** canonical-only edits. Consistent.
- **Flashcards 2026-11-10 #codex #skill and 2026-09-27 #codex #gen-codex / #codex #hooks:** generated Codex copies. Handled by the §3.1 amendments in §2.2.
- **Flashcards 2026-11-13 #upgrade (#hash, #classify, #drift) and #qa-red #upgrade:**
  - BUG-133/134 red tests diff the ClearGate side rather than faking install hashes.
  - A hooks-only settings hash must reach MANIFEST, snapshot and the current-file sha.
- **Holdout rule:** QA-Red and Developer briefs exclude `sprint-runs/SPRINT-45/holdout/`. Consistent with the plan.
- **No new dependency:** none declared.

### Wave Assignment

These are integration layers. All six items build at once after C0, within the 4-lane cap.

| Wave | Stories | Parallel? | Rationale |
|---|---|---|---|
| wave1 | CR-120, BUG-117, BUG-133, BUG-134 | Yes | Integration layer 0: no upstream. BUG-133 and BUG-134 edit separate parts of `upgrade.ts`, so it is not a real collision. Merge CR-120 first. |
| wave2 | STORY-064-01 | No | Integration layer 1: waits on CR-120 (C1). Builds now from C2. |
| wave3 | STORY-064-02 | No | Integration layer 2, last: waits on 064-01 (C2) and CR-120 (C1). It also waits on the three bugs, because it is `parallel_eligible: n` and "integrates last". Builds now from C2. |

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| The host changes where it writes subagent transcripts, or removes them before close | The reader degrades to "not measured", never zero (EPIC-064 rule); retention is noted in the report |
| Derived counts disagree with the holdout recount for a definitional reason, not a bug | The recount records its counting rule per cause; a definitional gap is fixed in the story text by `CR:spec-clarification`, not by bending the code to the number |
| BUG-133/134 miss a dispenser_adapter customisation | Goal check runs the packed RC against a copy of dispenser_adapter itself, not a synthetic fixture |
| Cross-story contract drift (CR-120 row shape → STORY-064-01 → STORY-064-02) | Contract-first: C1 and C2 frozen at kickoff; owners replace bodies, never rename or retype |
| The live loop here drifts from canonical from the first merge until the re-sync that follows the dispenser verdict | Expected (INITIATIVE-002 rollout cycle). Three canonical-live parity tests fail in the merge lane (5d from the CR-120 merge; 5a and 5c from the STORY-064-02 merge); each is recorded in §6 as an expected failure when it starts, and DevOps confirms the full-suite failures are exactly those |

## Metrics & Metadata
- **Expected Impact:** the rework and cost rows of every later sprint report are measured, not remembered; a safe upgrade path for customised installs.
- **Priority Alignment:** INITIATIVE-002 §6 decision 1 — measurement first.

---

## Execution Guidelines (Local Annotation — Not Pushed)

- **Starting Point:** contracts C1 and C2 first, then CR-120, STORY-064-01, BUG-117, BUG-133 and BUG-134 build in parallel; STORY-064-02 integrates last.
- **Relevant Context:** INITIATIVE-002 (archive), EPIC-064, `cleargate-cli/scaffold/core/.cleargate/scripts/`, `cleargate-cli/src/commands/upgrade.ts`, `cleargate-cli/src/init/merge-settings.ts`.
- **Constraints:** canonical edits only; no new event kinds; no live re-sync at Gate 4 (it follows the dispenser verdict); local merges only, no push or publish during the sprint.

**Hand-applied rules from INITIATIVE-002** (copied into `sprint-context.md` Cross-Cutting Rules at kickoff):

1. **Proof per item.** Each item is Done only when the evidence named in its Proof column exists, recorded in its DevOps report or in `sprint-runs/SPRINT-45/evidence/`.
2. **Fixed roster.** The six items above are the roster. Anything found mid-sprint goes to `sprint-runs/SPRINT-45/intake.md` and enters only with the owner's recorded OK in §6.
3. **Lanes by risk.** Lanes follow UI surface, subsystems crossed and scenario count; BUG-117 is the only fast-lane item.
4. **Recount at close.** The orchestrator records a hand recount of rework from git and dispatch metadata beside the counters in the close Brief.
5. **Loop unchanged under the sprint.** No edit to live `/.claude/**` or live `.cleargate/{scripts,knowledge,templates}` during the sprint.

**Holdout.** `sprint-runs/SPRINT-45/holdout/recount.md` holds the baseline recount of SPRINT-44 and dispenser_adapter SPRINT-01 and SPRINT-02, made before kickoff. dispenser_adapter SPRINT-03 is recounted at the Goal Acceptance Check. Builder dispatches (QA-Red, Developer) are told not to read `sprint-runs/SPRINT-45/holdout/`.

**Proposed contracts (for the SDR to confirm or amend):**
- **C1** `contract/S-45-ledger` (base cli `main`, owner CR-120): `subagent-ledger.mjs` exports `discoverSessions(sprintDir, opts?) → string[]` and `readDispatches(sessionDirs, opts?) → DispatchRow[]`, where `DispatchRow` is `{schema: 1, session_id, agent_id, tool_use_id, completed: boolean, run_id: string|null, agent_type, workflow_phase: string|null, description, model, started_at, ended_at, wall_ms, turns, tool_uses, usage: {input, output, cache_read, cache_creation}}`.
- **C2** `contract/S-45-metrics` (base C1, owner STORY-064-01): the `sprint_metrics.mjs --json` document `{schema: 1, sprint_id, generated_at, sources: {sessions, dispatches, repos, warnings}, items: {<ID>: {dispatches: {total, by_role, by_phase}, rework: {red_corrections, dev_reruns, verify_reruns, total}, interrupted, post_merge, git: {red_written, red_corrected, build, rework, integrate, merged}, wall_ms, tokens: {input, output, cache_read, cache_creation, total}, models, state_counters: {qa_bounces, arch_bounces}, disagrees, dispatch_source}}, sprint_level: {dispatches, tokens}, unattributed: {dispatches, tokens, share}, totals: {dispatches, rework, tokens}}`.

## 4. Decomposition Status

- [x] All work items have their type's required sections.
- [x] No epic without child stories — EPIC-064 has STORY-064-01/02 and CR-120.
- [x] All work items 🟢 — owner approved EPIC-064, STORY-064-01/02, CR-120, BUG-117, BUG-133 and BUG-134 (2026-11-14).
- [x] Gate 2 SDR §2 Execution Strategy written by Architect (2026-11-14). Nested-cli layout confirmed by the owner at Gate 2 (2026-11-14).

## 5. Gate Checklist

- [x] **Gate 1** — EPIC-064 and the six roster items approved (owner, 2026-11-14: "approved. please execute").
- [x] **Gate 2** (Sprint Ready) — SDR §2 confirmed; Goal Acceptance Check confirmed (owner, 2026-11-14).
- [ ] **Gate 3** (preflight) — `cleargate sprint preflight SPRINT-45` and devops reachability.
- [ ] **Gate 4** (close) — after all items merge and the walkthrough.

## 6. Execution Log

- 2026-11-14 · Gate 1 + Gate 2 · owner approved all eight Brief decisions ("approved. please execute"): the seven items with their recorded answers; Goal Acceptance Check (a) metrics vs holdout within 10% / ±1 per item and ≥95% tokens attributed, (b) packed RC dry-run and `--yes` on a copy of dispenser_adapter, (c) SPRINT-45 report §3 from Measured Metrics; nested-cli worktree layout with hand dispatches; three canonical-live parity failures (5d after CR-120, 5a and 5c after STORY-064-02) expected; no `dist` rebuild during the sprint, full suites in a throwaway worktree; BUG-117 stays fast; contract typings frozen; planning committed to `main`. CR:spec-clarification at kickoff: BUG-117 table re-grounded against the claude-api reference cached 2026-11-03 (Fable 5.2 and Haiku 5.5 added, Sonnet 5.5 cache read 0.20 → 0.10).
- 2026-11-14 · SDR · architect-reader ×6 → architect-synth; §2 inserted; `plans/waves.json` (schema 2, launchable: false). CR:spec-clarification: generated Codex copies added to CR-120 and STORY-064-02 surfaces; BUG-134 surface gains hosts/claude.ts and hosts/codex.ts.
- 2026-11-14 · holdout · baseline recount of SPRINT-44 and dispenser_adapter SPRINT-01/02 written to `sprint-runs/SPRINT-45/holdout/recount.md`. It showed "dispatches minus one" overcounting rework about 4x; STORY-064-01 R4 and CR-120 amended before build (CR:spec-clarification).
- 2026-11-14 · planning · SPRINT-45 drafted from INITIATIVE-002 WS-4. CR-120 and BUG-117 moved here from SPRINT-43 (INITIATIVE-002 §6 decision 7).
