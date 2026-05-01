---
cr_id: CR-022
parent_ref: SDLC brainstorm charter §1.8 (Gate 4 expanded close pipeline) + §2.4 (Sprint 3 of 3); CR-021 (SPRINT-18 Prepare/Close/Observe mechanics, shipped); SPRINT-18 REPORT.md §6 Tooling (lessons folded in)
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-19
carry_over: false
status: Approved
ambiguity: 🟢 Low
context_source: "Charter §2.4 Sprint 3 of 3 — Gate 4 close pipeline hardening. Charter explicitly deferred CR-022 drafting until SPRINT-18 closed so it could absorb actual lessons from CR-021's first run (charter §2.4 line 272). SPRINT-18 closed 2026-05-01 with 7 anchors shipped; REPORT.md §6 surfaced concrete lessons folded into §3 below: (i) suggest_improvements.mjs missed the SPRINT-<#>_REPORT.md naming sweep, (ii) 138KB Reporter bundle exceeded 80KB cap on heavy-strategy sprints, (iii) cleargate sprint archive's wiki-lint hard-block has no data-debt waiver path. Plus the charter §1.8 pre-close + post-close additions: Step 2.7 worktree-closed check, Step 2.8 sprint-merged-to-main verify, Step 6.5 sprint_trends.mjs (V-Bounce port), Step 6.6 skill-candidate detection, Step 6.7 FLASHCARD cleanup pass, Step 8 verbose post-close handoff list."
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-01T22:30:00Z
  reason: Charter-locked anchor (Sprint 3 of 3 in the SDLC redesign roadmap, §2.4). Direct approval pattern. Scope already enumerated in charter §1.8 + §5 (drift-from-current-protocol summary). User 2026-05-01 confirmed inclusion in SPRINT-19.
approved: true
owner: sandrinio
target_date: SPRINT-19
created_at: 2026-05-01T22:30:00Z
updated_at: 2026-05-01T22:30:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-01T17:40:16Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-022
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-01T17:40:15Z
  sessions: []
---

# CR-022: Gate 4 Close Pipeline Hardening

**Lane:** `standard` — 5-6 stories, ~400 LOC across `close_sprint.mjs` + new scripts + agent definitions + protocol. Sprint 3 of 3 in the SDLC redesign roadmap.

## 0.5 Open Questions

- **Question:** Step 6.5 `sprint_trends.mjs` — full V-Bounce port (~150 LOC) in this CR, or stub it (just the script skeleton + close-pipeline wiring) and defer the trend-detection logic to a follow-up?
  **Recommended:** **Stub + wire.** Ship the script skeleton at ~30 LOC that reads ledger + state.json + writes a "Trends placeholder — coming in CR-027" line into `improvement-suggestions.md`. Full trend-detection logic lands in a dedicated CR once we have ≥3 closed sprints under the new naming convention to compare against. Avoids speculative implementation.
  **Human decision:** _accept recommended unless objection_

- **Question:** Reporter bundle 80KB → 160KB cap raise (SPRINT-18 lesson) — fold into CR-022 or separate cleanup?
  **Recommended:** **Fold into CR-022.** One-line change in `prep_reporter_context.mjs` (raise `MAX_BUNDLE_BYTES` constant from 80000 → 160000) plus a §2 trim helper if implementation surfaces inefficiency. Logical fit because CR-022 owns the close-pipeline scripts. Marginal scope addition (~20 LOC).
  **Human decision:** _accept recommended_

- **Question:** Archive's wiki-lint hard-block (SPRINT-18 lesson — blocked SPRINT-18 close on 34 pre-existing broken-backlinks) — fix in CR-022 or separate cleanup CR?
  **Recommended:** **Fix in CR-022.** Add a `--allow-wiki-lint-debt` flag to `cleargate sprint archive` mirroring the existing `--allow-drift` pattern in `cleargate sprint init`. Drift waiver is already a documented pattern; this CR extends it. ~15 LOC. Sibling task: data-debt cleanup (populate `children:` arrays on EPIC-023/024/025 wiki pages) is a separate one-shot — file as off-sprint hotfix or fold into CR-025's archive cleanup.
  **Human decision:** _accept recommended_

- **Question:** Step 2.8 verify-only vs. auto-merge to main — charter §1.8 line 108-111 already locked verify-only. Re-confirm at execution time.
  **Recommended:** **Verify-only, no auto-merge.** Charter rationale stands: force-push edge cases, conflict resolution without context, push permission failures, signing key mismatches. The script asserts `git merge-base --is-ancestor refs/heads/sprint/S-NN refs/heads/main`; on failure, stderr lists unmerged commits + exits 1; human resolves manually.
  **Human decision:** _accept recommended_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "Sprint close is a soft handshake — flip status, write REPORT.md, done." Wrong under v2 + the new Gate 4 model. Sprint close has expanded pre-close criteria (block on failure) and a post-close pipeline (informs the next sprint).
- The assumption that a sprint can be marked Completed before its branch merges to main. Today's `close_sprint.mjs` flips `sprint_status: Completed` after Reporter writes REPORT.md, regardless of merge state. Under CR-022, the merge must happen first OR the close blocks.
- Manual orchestrator reading of `improvement-suggestions.md` for next-sprint inputs. Under CR-022, the file is materially richer (trends + skill candidates + flashcard cleanup + verbose handoff) so the orchestrator's read becomes structured.
- The expectation that REPORT.md is the only Reporter output. Under the new pipeline, the Reporter's bundle digest gets reused by `sprint_trends.mjs` for cross-sprint comparison.

**New Logic (The New Truth):**

**Pre-close criteria — block on failure (v2 enforcing, v1 advisory per execution_mode):**

| Step | Check | Block in v2? |
|---|---|---|
| 2 | Stories all in `TERMINAL_STATES` | yes (today) |
| 2.5 | v2.1 §3 metric rows + §5 sections in REPORT (when sprint has fast-lane stories) | yes (today) |
| 2.6 | Lifecycle reconciler — commit verbs match artifact statuses (CR-017) | yes (today) |
| **2.7** | **All worktrees closed** — `git worktree list` shows no `.worktrees/STORY-*` entries | **yes — NEW** |
| **2.8** | **Sprint branch merged to main** — `git merge-base --is-ancestor refs/heads/sprint/S-NN refs/heads/main` returns 0 | **yes — NEW (verify only; script does NOT run the merge)** |

**Post-close pipeline — runs after Gate 4 ack:**

| Step | Action | Status today |
|---|---|---|
| 3.5 | Build curated Reporter context (`prep_reporter_context.mjs`) | shipped (CR-021 / SPRINT-18) |
| 6 | `suggest_improvements.mjs` — improvement suggestions | shipped (today) |
| **6.5** | **`sprint_trends.mjs`** — cross-sprint metrics comparison stub (V-Bounce port deferred to CR-027) | **NEW** |
| **6.6** | **Skill-candidate detection** — repetitive sequences in agent runs → suggest new `.claude/skills/<name>/SKILL.md`; output to `improvement-suggestions.md` | **NEW** |
| **6.7** | **FLASHCARD cleanup pass** — stale + superseded + resolved cards surfaced as proposals (human approves per entry); output to `improvement-suggestions.md` | **NEW** |
| 7 | Auto-push status updates to MCP (`cleargate sync work-items`) | shipped (CR-021 / SPRINT-18) |
| **8** | **Verbose post-close handoff list** — V-Bounce-style 6 explicit next steps printed to stdout | **NEW** |

**SPRINT-18 lessons folded in:**
- `suggest_improvements.mjs` reads REPORT path via shared helper (so the SPRINT-<#>_REPORT.md naming sweep stays consistent across all close-pipeline scripts).
- `prep_reporter_context.mjs` cap raised 80KB → 160KB (heavy-strategy sprints exceed soft cap; SPRINT-18 hit 138KB).
- `cleargate sprint archive` accepts `--allow-wiki-lint-debt` flag (mirrors `--allow-drift` pattern from `sprint init`).

## 2. Blast Radius & Invalidation

- [x] `.cleargate/scripts/close_sprint.mjs` (live + canonical mirror) — add Steps 2.7, 2.8, 6.5, 6.6, 6.7, 8. Wire reportFilename helper across all internal references (already done in STORY-025-03 for naming; CR-022 shares it).
- [x] `.cleargate/scripts/suggest_improvements.mjs` (live + canonical) — switch to `reportFilename()` helper from `close_sprint.mjs` (or extract to shared `lib/report-filename.mjs`); add new sections "Skill Creation Candidates" + "FLASHCARD Cleanup Candidates" to its output template.
- [x] `.cleargate/scripts/prep_reporter_context.mjs` (live + canonical) — raise `MAX_BUNDLE_BYTES` constant 80000 → 160000. Optional: §2 trim helper if profiling surfaces a hot spot.
- [x] `.cleargate/scripts/sprint_trends.mjs` (NEW, live + canonical) — stub that reads ledger + state.json across N closed sprints; emits a placeholder line into `improvement-suggestions.md`. Full implementation deferred to CR-027.
- [x] `cleargate-cli/src/commands/sprint.ts` — add `--allow-wiki-lint-debt` flag to `archive` subcommand. Mirror `--allow-drift` pattern.
- [x] `cleargate-cli/test/commands/sprint-archive.test.ts` — extend with new flag scenario.
- [x] `cleargate-cli/test/scripts/test_close_sprint_v21.test.ts` — extend with Steps 2.7, 2.8, 6.5, 6.6, 6.7, 8 scenarios.
- [x] `.cleargate/knowledge/cleargate-enforcement.md` (live + canonical) — extend §13 (or new §14) to enumerate Steps 2.7 + 2.8 as Gate 4 enforcement under v2.
- [x] `CLAUDE.md` (live + canonical) — update Gate-4 close bullet to reference the expanded pre-close criteria.
- [ ] No schema/migration impact on state.json or sprint frontmatter.
- [ ] No agent-prompt changes (Reporter / Architect / Developer / QA all unchanged).

**Downstream invalidation:** None of the in-flight SPRINT-19 work items get blast-radius'd. CR-024 + CR-025 + BUG-024 (the other SPRINT-19 anchors) touch QA / Initiative / token-ledger surfaces — disjoint from close-pipeline territory.

## 3. Execution Sandbox

**Six stories under this CR (M1..M6 + a bonus M0 for the helper extraction):**

### M0 — `lib/report-filename.mjs` shared helper (~30 LOC)

Extract the `reportFilename()` helper currently in `close_sprint.mjs` (shipped by STORY-025-03) into a shared module. Re-use from `suggest_improvements.mjs` + `prep_reporter_context.mjs` + `prefill_report.mjs` so the naming convention stays consistent across all close-pipeline scripts. Lessons-from-SPRINT-18 fix.

### M1 — Step 2.7 worktree-closed check (~40 LOC + tests)

Insert in `close_sprint.mjs` between Step 2.6 (lifecycle reconciler) and Step 3 (prefill). Run `git worktree list --porcelain`; assert no path matches `.worktrees/STORY-*`. On failure: stderr lists leftover worktrees + exits 1. v2 enforcing; v1 advisory (warn + continue).

### M2 — Step 2.8 sprint-merged-to-main verify (~40 LOC + tests)

Insert after M1's Step 2.7. Run `git merge-base --is-ancestor refs/heads/sprint/S-<NN> refs/heads/main`; assert exit 0. On failure: stderr lists unmerged commits via `git log refs/heads/main..refs/heads/sprint/S-<NN> --oneline` + exits 1. **Verify-only — script does NOT run the merge** (charter rationale §1.8 line 108-111).

### M3 — Step 6.5 + 6.6 + 6.7 post-close additions (~120 LOC + tests)

Insert after Step 6 (`suggest_improvements.mjs`). Each step is non-fatal (warn + continue on failure):

- **Step 6.5 — `sprint_trends.mjs <sprint-id>` stub.** Reads `state.json` + `token-ledger.jsonl` + sibling sprints under `.cleargate/sprint-runs/`. Emits placeholder line `"Trends: <N> closed sprints visible — full analysis deferred to CR-027."` into the sprint's `improvement-suggestions.md`. Returns exit 0.
- **Step 6.6 — Skill-candidate detection.** Folds into existing `suggest_improvements.mjs`. Heuristics from charter §1.8 line 96-100: same multi-step sequence ≥3× across agent runs; grep+read+apply patterns the orchestrator manually narrated; "remember to also do X" patterns in flashcards. Output: `improvement-suggestions.md` gets a "Skill Creation Candidates" section with proposed `.claude/skills/<name>/SKILL.md` skeletons.
- **Step 6.7 — FLASHCARD cleanup pass.** Folds into existing `suggest_improvements.mjs`. Categories from charter §1.8 line 102-106: stale (zero grep hits across last N sprints); superseded (contradicted by newer card); resolved (underlying issue fixed by a CR that landed). Output: `improvement-suggestions.md` gets a "FLASHCARD Cleanup Candidates" section with reasons. Human approves per entry; protocol §11.4 archive-immutability not violated (FLASHCARD.md is not an archive doc).

### M4 — Step 8 verbose post-close handoff list (~40 LOC + tests)

Insert as final step before exit. Print 6 explicit next steps to stdout (V-Bounce style):

```
SPRINT-<#> closed. Next steps:
  1. Review SPRINT-<#>_REPORT.md
  2. Review improvement-suggestions.md (sections: Suggestions / Skill Candidates / FLASHCARD Cleanup)
  3. Approve or reject Skill Candidates → run /improve or cleargate skill create <name>
  4. Approve or reject FLASHCARD cleanup entries → run /improve or cleargate flashcard prune
  5. Push approved status changes to MCP if Step 7 warned (`cleargate sync work-items`)
  6. Initialize next sprint: `cleargate sprint init SPRINT-<#+1> --stories <ids>`
```

### M5 — Reporter bundle cap raise + `--allow-wiki-lint-debt` flag (~50 LOC + tests)

- `prep_reporter_context.mjs` — `MAX_BUNDLE_BYTES` constant 80000 → 160000. Update warning text. SPRINT-18 lesson.
- `cleargate-cli/src/commands/sprint.ts` archive subcommand — add `--allow-wiki-lint-debt` flag. When set: lint failure logs `[archive] wiki-lint debt waived via --allow-wiki-lint-debt flag` to stderr, archive proceeds. Mirror `--allow-drift` pattern from `init`.
- Sprint plan template's archive instruction line — note the flag exists for data-debt scenarios.

### M6 — Protocol + CLAUDE.md updates + agent definition refresh (~60 LOC + tests)

- `.cleargate/knowledge/cleargate-enforcement.md` (live + canonical) — extend §13 with Steps 2.7 + 2.8 enforcement clauses, OR add new §14 if §13 is the wrong home. Decision: extend §13 (Sprint Execution Gate is Gate 3; Gate 4 close mechanics belong elsewhere — likely §14 if numbering continues, or a §13.1/13.2 sub-numbering).
- `CLAUDE.md` (live + canonical) — update "Sprint close is Gate-4-class (CR-019)" bullet to reference the expanded pre-close criteria (worktrees + main-merge).
- `.claude/agents/reporter.md` (live + canonical) — minor update: Capability Surface "Output" row now references the post-close pipeline outputs (no behavior change, just documentation).

## 4. Verification Protocol

### 4.1 Minimum Test Expectations

| Test type | Min count | Notes |
|---|---|---|
| Vitest scenarios in `test_close_sprint_v21.test.ts` | 8 | Steps 2.7, 2.8, 6.5, 6.6, 6.7, 8 — at least one happy-path + one failure-mode test per new step. Plus `--allow-wiki-lint-debt` flag scenario in `sprint-archive.test.ts`. |
| Bash fixture tests in `test_close_pipeline.sh` | extend existing | Add scenarios for the new pre-close blocks + post-close stdout assertions. |
| Doc lint tests in `enforcement-section-13.test.ts` | extend existing | Or new file `enforcement-section-14.test.ts` if numbering goes that way. Cover the new pre-close criteria language. |
| Manual verification | 4 | (a) Run `close_sprint.mjs SPRINT-19 --assume-ack` against a real fixture with leftover worktree; expect Step 2.7 block. (b) Same with sprint branch unmerged; expect Step 2.8 block. (c) Verify Step 6.5/6.6/6.7 produce output in `improvement-suggestions.md`. (d) Verify Step 8 prints the 6-line handoff. |

### 4.2 Definition of Done

- [ ] All 6 stories ship within SPRINT-19. Each commit format: `feat(EPIC-???-or-CR-022): <story-id> <short desc>`.
- [ ] `close_sprint.mjs` (live + canonical) byte-identical post-edit.
- [ ] `suggest_improvements.mjs` (live + canonical) byte-identical post-edit.
- [ ] New `lib/report-filename.mjs` (live + canonical) byte-identical post-edit.
- [ ] New `sprint_trends.mjs` stub (live + canonical) byte-identical post-edit.
- [ ] CLAUDE.md (live + canonical CLEARGATE-block region) byte-identical post-edit.
- [ ] `cleargate-enforcement.md` (live + canonical) byte-identical post-edit.
- [ ] All Gherkin scenarios from §4.3 below pass.
- [ ] Backwards-compat: SPRINT-18 archived `SPRINT-18_REPORT.md` continues to work for any retroactive `suggest_improvements.mjs` invocation (read-fallback to legacy filename if needed — extend the helper).

### 4.3 Gherkin acceptance scenarios

```gherkin
Feature: Gate 4 close pipeline hardening

  Scenario: Step 2.7 blocks on leftover worktree
    Given a sprint with all stories Done and sprint_status="Active"
    And `git worktree list` shows .worktrees/STORY-NNN-NN/ present
    When `close_sprint.mjs SPRINT-19 --assume-ack` runs
    Then exit code is 1
    And stderr contains "Step 2.7 failed: leftover worktree at .worktrees/STORY-NNN-NN"
    And sprint_status is NOT flipped to Completed

  Scenario: Step 2.8 blocks when sprint branch unmerged
    Given Step 2.7 passes (no leftover worktrees)
    And `git merge-base --is-ancestor sprint/S-19 main` returns 1 (unmerged)
    When close_sprint.mjs runs
    Then exit code is 1
    And stderr lists unmerged commits via git log oneline
    And stderr contains "Step 2.8 failed: sprint/S-19 not merged to main"

  Scenario: Step 6.5 sprint_trends stub writes placeholder
    Given Steps 1-6 pass and Gate 4 ack proceeds
    When close_sprint.mjs reaches Step 6.5
    Then improvement-suggestions.md contains a "Trends" section
    And the section text includes "deferred to CR-027"

  Scenario: Step 6.6 skill candidates surface
    Given the sprint has agent runs with repeated grep+read+apply sequences
    When Step 6.6 runs
    Then improvement-suggestions.md contains a "Skill Creation Candidates" section
    And each candidate proposes a .claude/skills/<name>/SKILL.md skeleton

  Scenario: Step 6.7 flashcard cleanup surfaces
    Given FLASHCARD.md contains a card that has zero grep hits across the last 3 sprints
    When Step 6.7 runs
    Then improvement-suggestions.md contains a "FLASHCARD Cleanup Candidates" section
    And the stale card is listed with reason "stale: zero grep hits across last 3 sprints"

  Scenario: Step 8 prints verbose handoff
    Given close_sprint.mjs reaches the final step
    When Step 8 runs
    Then stdout contains "SPRINT-19 closed. Next steps:"
    And stdout enumerates 6 numbered next-step items

  Scenario: --allow-wiki-lint-debt flag waives lint failures
    Given `cleargate sprint archive SPRINT-19` fails on wiki-lint debt
    When `cleargate sprint archive SPRINT-19 --allow-wiki-lint-debt` runs
    Then exit code is 0
    And stderr contains "wiki-lint debt waived via --allow-wiki-lint-debt flag"
    And sprint frontmatter is stamped + files moved to archive/

  Scenario: Reporter bundle cap raised to 160KB
    Given prep_reporter_context.mjs is invoked against a heavy-strategy sprint
    When the bundle exceeds 80KB but stays under 160KB
    Then no warning is emitted
    And the bundle is written normally

  Scenario: SPRINT-<#>_REPORT.md naming consistent across all close-pipeline scripts
    Given suggest_improvements.mjs runs against SPRINT-19
    When it looks up the report path
    Then it uses lib/report-filename.mjs (or equivalent shared helper)
    And the lookup returns SPRINT-19_REPORT.md (not legacy REPORT.md) for SPRINT-18+
    And falls back to legacy REPORT.md for SPRINT-01..17 archives
```

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — pending Gate 1 (push)**

Requirements to pass to Green:
- [x] §1 Old vs. New context override is concrete (5 obsolete-logic items, 6 new-logic blocks).
- [x] §2 Blast radius enumerates 8 file surfaces + confirms zero downstream invalidation on SPRINT-19 siblings.
- [x] §3 Six-story decomposition (M0..M6) with file lists + LOC estimates.
- [x] §4 Verification protocol cites specific Gherkin assertions + DoD checklist + backwards-compat carve-out.
- [x] Charter alignment confirmed (§1.8 + §2.4 + SPRINT-18 lessons folded in).
- [x] All 4 §0.5 open questions have recommended answers; user-confirmable inline.
