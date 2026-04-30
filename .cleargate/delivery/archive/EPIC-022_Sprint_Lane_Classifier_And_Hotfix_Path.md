---
epic_id: EPIC-022
status: Completed
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: 🟢 Low
context_source: PROPOSAL-013_Sprint_Planning_Fast_Track.md
owner: sandrinio
target_date: 2026-05-10
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: cleargate@0.5.0
updated_at_version: cleargate@0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: no-tbds
      detail: 1 occurrence at §9
    - id: affected-files-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-26T08:52:47Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-022
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-26T08:52:47Z
  sessions: []
sprint_cleargate_id: "SPRINT-14"
---

# EPIC-022: Sprint Planning Lane Classifier + Hotfix Path

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add an Architect-judged lane classifier to Sprint Planning v2 that tags each story with one of {standard, fast, hotfix}; route the four-agent loop accordingly; auto-demote on failure; surface metrics and audit tables in the Sprint Report; preserve the existing four-agent contract (no DevOps role split).</objective>
  <architecture_rules>
    <rule>Pre-gate scanner is NEVER skipped, regardless of lane. Mechanical correctness is non-negotiable.</rule>
    <rule>Four-agent contract preserved. No new agent. Lane routing happens inside the existing Architect (judges) + Developer (executes lane-aware) + QA (skipped on lane=fast) + Reporter (audits) loop.</rule>
    <rule>Demotion is one-way: a story can demote `fast → standard` mid-sprint but NEVER promote `standard → fast`. Lane is decided once at Sprint Planning v2 Gate 2.</rule>
    <rule>Hotfix lane is OFF-SPRINT only. Sprint Plan stories carry `lane: standard|fast`; `hotfix` is a separate routing applied to off-sprint CR/Bug items.</rule>
    <rule>state.json schema bumps to v2. Migration is additive: every story in a v1 file gets `lane: standard, lane_assigned_by: migration-default` on first read under new code. Reversible by fresh-init for tests.</rule>
    <rule>The Architect-judges / human-confirms pattern from STORY-013-09 is reused — Architect proposes lanes during Sprint Design Review, human confirms at Gate 2.</rule>
    <rule>Forbidden surfaces (auto-`standard`): database schema/migration, auth/identity flow, runtime config schema, MCP adapter API, scaffold manifest shape, security-relevant code (token handling, invite verification, gate enforcement). Encoded as a file-path prefix list in protocol §14.</rule>
    <rule>Reporter validation activation is feature-flagged: `close_sprint.mjs` enforces the new §5 Lane Audit + Hotfix Audit tables ONLY when state.json `schema_version >= 2` AND at least one story in the sprint had `lane: fast`. Saves SPRINT-14's own close report from a chicken-and-egg failure.</rule>
    <rule>Hotfix cap: ≤3 per rolling 7-day window. Enforced at draft time by counting pending-sync HOTFIX-* files plus archived hotfixes resolved in last 7 days.</rule>
    <rule>No ML. The rubric is a deterministic checklist. Drift is fixed by tightening the rubric (one-line protocol edit + flashcard), not by retraining.</rule>
  </architecture_rules>
  <target_files>
    <file path=".claude/agents/architect.md" action="modify" />
    <file path=".claude/agents/developer.md" action="modify" />
    <file path=".claude/agents/reporter.md" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path=".cleargate/templates/Sprint Plan Template.md" action="modify" />
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".cleargate/templates/sprint_report.md" action="modify" />
    <file path=".cleargate/scripts/update_state.mjs" action="modify" />
    <file path=".cleargate/scripts/pre_gate_runner.sh" action="modify" />
    <file path=".cleargate/scripts/close_sprint.mjs" action="modify" />
    <file path=".cleargate/scripts/init_sprint.mjs" action="modify" />
    <file path="cleargate-planning/MANIFEST.json" action="modify" />
    <file path="cleargate-cli/src/commands/wiki.ts" action="modify" />
    <file path=".cleargate/templates/hotfix.md" action="create" />
    <file path="cleargate-planning/.cleargate/templates/hotfix.md" action="create" />
    <file path=".cleargate/wiki/topics/hotfix-ledger.md" action="create" />
    <file path=".cleargate/wiki/index.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

SPRINT-12 and SPRINT-13 each carried ≥1 story (BUG-006, BUG-007, CR-007 ResendMailer swap) that went through the full architect → developer → QA → reporter loop despite being a single-file fix with deterministic verification. Token spend ~30–60k per item, with zero correction signal in the QA bounces — the loop was theatre. EPIC-013 §2 punted a fast-track lane with the rationale *"formalize only if metrics show cost"* — those metrics now exist. PROPOSAL-013 (approved 2026-04-26) is the response.

The framework also lacks an off-sprint surface for L1 trivial work (one-line bug reports, copy fixes) that arrive *between* sprints. Today these either bloat a sprint plan they don't belong in, or get done invisibly without an audit trail. The Hotfix lane formalises that surface with a cap (≤3 per rolling 7 days) so it does not become a process-bypass back door.

**Success Metrics (North Star):**

- Token spend per fast-lane story drops to ≤10k (Architect plan + QA gate skipped; pre-gate scanner only) versus the ~30–60k baseline measured in SPRINT-12/13.
- Fast-Track Demotion Rate ≤30% across any rolling 3-sprint window (signal that the rubric is tight enough). Above 30% triggers a rubric-tightening CR.
- Hotfix-to-Story Ratio ≤0.3 across a sprint window (signal that hotfixes are not absorbing real planned work). Above 0.3 surfaces a planning-discipline warning in §5 of the Sprint Report.
- Zero fast-tracked failures escape detection. The pre-gate scanner OR post-merge sprint-branch test catches every bad classifier call; demotion mechanics ensure the cost of a wrong call is bounded by one extra pre-gate run + the standard loop.
- Reporter §5 Lane Audit + Hotfix Audit tables are populated in every post-EPIC-022 sprint report. Sprints missing either fail `close_sprint.mjs` validation (when activation conditions are met).

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] Architect Lane Classification: rubric (PROPOSAL-013 §2.3, seven checks) lands in `.claude/agents/architect.md` and `.cleargate/knowledge/cleargate-protocol.md` §14 (new). Both surfaces stay in sync — protocol is the spec, agent file is the runtime instruction.
- [ ] Sprint Design Review tail step: Architect emits `lane: standard|fast` per story + a one-line rationale per non-standard lane; writes a §2.4 Lane Audit subsection in the Sprint Plan listing every fast-lane story + rationale. Gate 2 rejects sprints whose fast-lane rationale references a forbidden surface.
- [ ] state.json schema v1 → v2 bump in `.cleargate/scripts/update_state.mjs`. New per-story optional fields: `lane`, `lane_assigned_by`, `lane_demoted_at`, `lane_demotion_reason`. Migration auto-applies on first read of a v1 file: defaults all stories to `lane: standard, lane_assigned_by: migration-default`.
- [ ] `update_state.mjs` accepts `--lane <standard|fast>` and `--lane-demote <reason>` flags.
- [ ] Templates carry the new fields: `Sprint Plan Template.md` §1 story table gains a `Lane` column + §2.4 Lane Audit section skeleton; `story.md` frontmatter adds `lane: standard|fast` (default `standard` if absent); `sprint_report.md` adds §3 Fast-Track + Hotfix metric rows + §5 Lane Audit + Hotfix Audit table skeletons + §5 Hotfix Trend narrative placeholder.
- [ ] `pre_gate_runner.sh` post-pass hook: if scanner passes AND lane=fast, skip the QA spawn signal; if scanner fails AND lane=fast, write a demotion event to state.json (`lane: fast → standard`, reset `qa_bounces` and `arch_bounces` to 0) and emit an `LD` (Lane Demotion) event row to the sprint markdown §4.
- [ ] Developer agent (`.claude/agents/developer.md`) reads `lane` from state.json on spawn; if `lane: fast`, skips writing the architect-plan-citation block (no plan exists for fast-lane stories); demotion handler that resets state.json on pre-gate or post-merge failure.
- [ ] Hotfix lane (off-sprint): `.cleargate/templates/hotfix.md` new template (ports V-Bounce hotfix.md adapted to ClearGate frontmatter, includes mandatory §"Verification Steps" the user walks). Mirror at `cleargate-planning/.cleargate/templates/hotfix.md` per the three-surface landing rule.
- [ ] `cleargate-cli/src/commands/wiki.ts` registers `cleargate hotfix new <slug>` to scaffold a `pending-sync/HOTFIX-NNN_<slug>.md` from the new template. Parallels the existing `cleargate story new` ergonomics.
- [ ] `.cleargate/wiki/topics/hotfix-ledger.md` new append-only synthesis page. Each merged hotfix appends a YAML row: `merged_at`, `id`, `files[]`, `loc_changed`, `originating_signal` (`user-report`/`monitor`/`drive-by`/`regression`), `commit_sha`, `verified_by`, plus sprint-close fields `sprint_id`/`could_have_been_sprint_story`/`planning_miss_reason`.
- [ ] Hotfix cap stub: at draft time the conversational agent counts `pending-sync/HOTFIX-*` plus archived hotfixes resolved in the last 7 days. ≥3 = block draft with a clear error. Full rolling-window walk is the v1 implementation; defer optimisation only if walk time exceeds 200ms on a real sprint.
- [ ] Reporter (`.claude/agents/reporter.md`) Sprint Report v2.1 contract change: §3 gains five new metric rows (Fast-Track Ratio, Fast-Track Demotion Rate, Hotfix Count, Hotfix-to-Story Ratio, Hotfix Cap Breaches) plus an `LD events` count row alongside CR:* / UR:* tallies. §5 Process gains the Lane Audit + Hotfix Audit tables + the Hotfix Trend rolling-4-sprint narrative.
- [ ] `close_sprint.mjs` validates that REPORT.md contains §3 fast-track + hotfix rows AND §5 Lane Audit + Hotfix Audit + Hotfix Trend sections — but ONLY when activation conditions are met (state.json `schema_version >= 2` AND at least one story had `lane: fast`). Reads `wiki/topics/hotfix-ledger.md` for the sprint-window count cross-check.
- [ ] `close_sprint.mjs` enforces the sprint-runs naming convention `^SPRINT-\d{2,3}$` — rejects reports at non-conformant paths (e.g. legacy `S-NN/`).
- [ ] `init_sprint.mjs` accepts lane-per-story input from Sprint Plan §1 table; emits an error if any story has `lane: fast` AND `expected_bounce_exposure: med|high` (rubric §6 contradiction).
- [ ] `MANIFEST.json` declares the new template files (`hotfix.md` outer + scaffold mirror) and bumps scaffold version per SPRINT-14's close-out story (014-02).
- [ ] `wiki/index.md` adds a "Hotfix Ledger" section linking to `wiki/topics/hotfix-ledger.md`.
- [ ] Dogfood end-to-end (STORY-022-08): seed or pick a known-trivial CR, assign `lane: fast`, run the loop against the post-upgrade dogfood (post STORY-014-02), verify Lane Audit row populates, induce a pre-gate failure, verify auto-demotion + `LD` event in sprint markdown §4.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- DevOps agent split. EPIC-013 Q5 deferred this; EPIC-022 keeps merge inside Developer's extended checklist regardless of lane. Re-evaluate after 2 sprints on this epic.
- Automatic lane assignment without human confirmation. Architect proposes; human must explicitly accept the Sprint Plan with the lane column populated at Gate 2.
- Retroactive fast-tracking mid-sprint. Lane is fixed at sprint planning. Reverse (fast → standard demotion on failure) is allowed because it strictly tightens the loop.
- ML-based classifier. Rubric is deterministic. No training. Drift is fixed by tightening the rubric.
- Cross-repo fast-track. ClearGate fast-tracks ClearGate stories; nested `mcp/` and any future submodules use the same outer-repo lane assignment (consistent with EPIC-013 Q3 worktree decision).
- Hotfix lane cap optimisation. v1 ships the rolling-window walk in plain code; defer caching/indexing only if walk time exceeds 200ms on a real sprint.
- Three-strike rubric self-disablement. PROPOSAL-013 §4 Q4 floated auto-disabling the fast lane after 3 consecutive sprints with "n" retrospect answers. Defer; first observe whether classifier drift is even a real signal in practice.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Four-agent contract | Preserved. No DevOps role. Developer's existing post-merge checklist absorbs the merge step regardless of lane. |
| Pre-gate scanner | Never skipped, any lane. Mechanical floor is non-negotiable. |
| Demotion direction | One-way: `fast → standard` on failure. `standard → fast` mid-sprint is forbidden. |
| Forbidden surfaces | Encoded in protocol §14 as a file-path prefix list. Adding a new forbidden surface is a one-line protocol edit + flashcard, not a code change. |
| Schema version | state.json bumps to `schema_version: 2`. Migration defaults are explicit (no silent field addition). |
| Hotfix cap | ≤3 per rolling 7-day window. Enforced at draft time by counting `pending-sync/HOTFIX-*` plus archived hotfixes resolved in last 7 days. |
| Hotfix metrics | Off-sprint by execution path, on-sprint by metric. Sprint Report §3 always includes Hotfix Count, Hotfix-to-Story Ratio, Hotfix Cap Breaches; §5 always includes the Hotfix Audit table — even when the count is zero (proves the metric was checked, not skipped). |
| No ML | Rubric is deterministic. No training. Drift is fixed by tightening the rubric, not by retraining. |
| Reporter activation | New §3 + §5 sections enforced ONLY when `schema_version >= 2` AND at least one story had `lane: fast`. Backward-compatible with `template_version: 1` reports (legacy-pass). |
| Naming convention | Sprint reports must live at `.cleargate/sprint-runs/<SPRINT-ID>/REPORT.md` where `<SPRINT-ID>` matches `^SPRINT-\d{2,3}$`. |
| LOC cap (rubric §1) | ≤2 files AND ≤50 LOC net. Tests count. Generated files do not. Tighten or loosen after 2 sprints of audit data per PROPOSAL-013 §4 Q2 resolution. |

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files** *(verified by Read/Grep against repo state on 2026-04-26)*:

- `.claude/agents/architect.md` — append §"Lane Classification" with the rubric, Sprint Design Review tail step, rationale-emission contract.
- `.claude/agents/developer.md` — append §"Lane-Aware Execution": read `lane` from state.json on spawn; if `lane: fast`, skip writing the architect-plan-citation block; demotion handler resets state on failure.
- `.claude/agents/reporter.md` — extend report-writing contract: §3 Fast-Track + Hotfix metric rows, §5 Lane Audit table, §5 Hotfix Audit table, §5 Hotfix Trend narrative; reject reports missing any of these. Reads `wiki/topics/hotfix-ledger.md` filtered by sprint window.
- `.cleargate/knowledge/cleargate-protocol.md` — add §14 "Lane Routing" with rubric, demotion mechanics, hotfix cap, state.json schema bump, `LD` event addition to §10.
- `.cleargate/templates/Sprint Plan Template.md` — extend §1 story table with `Lane` column; add §2.4 "Lane Audit" section.
- `.cleargate/templates/story.md` — add `lane: standard|fast` frontmatter (additive; defaults to `standard` if absent).
- `.cleargate/templates/sprint_report.md` — add §3 Fast-Track Ratio + Demotion Rate + Hotfix Count + Hotfix-to-Story Ratio + Hotfix Cap Breaches rows; add §5 Lane Audit + Hotfix Audit table skeletons + Hotfix Trend narrative.
- `.cleargate/scripts/update_state.mjs` — accept `--lane <standard|fast>` and `--lane-demote <reason>`; bump schema_version to 2 on first write; auto-migrate v1 state.json on read.
- `.cleargate/scripts/pre_gate_runner.sh` — post-pass hook: scanner-pass + lane=fast → skip QA spawn; scanner-fail + lane=fast → write LD event to state.json.
- `.cleargate/scripts/close_sprint.mjs` — validate §3 fast-track + hotfix metric rows AND §5 Lane Audit + Hotfix Audit + Hotfix Trend presence in REPORT.md (when activation conditions met). Cross-check sprint-window hotfix count against `wiki/topics/hotfix-ledger.md`. Enforce naming convention `^SPRINT-\d{2,3}$`.
- `.cleargate/scripts/init_sprint.mjs` — accept lane-per-story input from Sprint Plan §1; reject `lane: fast` + `expected_bounce_exposure: med|high` contradiction.
- `cleargate-planning/MANIFEST.json` — bump scaffold version (handled by SPRINT-14 STORY-014-02); declare new template files.
- `cleargate-cli/src/commands/wiki.ts` — register `cleargate hotfix new <slug>` (parallels existing scaffold subcommands).
- `.cleargate/wiki/index.md` — add "Hotfix Ledger" section linking to `wiki/topics/hotfix-ledger.md`.

**New Entities:**

- `.cleargate/templates/hotfix.md` — new work-item template (ports V-Bounce hotfix.md to ClearGate frontmatter; id format `HOTFIX-NNN`; mandatory §"Verification Steps").
- `cleargate-planning/.cleargate/templates/hotfix.md` — scaffold mirror per EPIC-013 R9 three-surface landing rule.
- `.cleargate/wiki/topics/hotfix-ledger.md` — new append-only synthesis page (canonical source for hotfix metrics).

**Data Changes:**

- `state.json` schema v1 → v2. Per-story additive fields: `lane`, `lane_assigned_by`, `lane_demoted_at`, `lane_demotion_reason`. Migration is additive-only on first read of a v1 file.
- New event type `LD` (Lane Demotion) in sprint markdown §4 vocabulary, alongside existing `UR` and `CR`.
- New synthesis page `wiki/topics/hotfix-ledger.md`. No table/migration in any database.

## 5. Acceptance Criteria

```gherkin
Feature: Sprint Planning Lane Classifier + Hotfix Path

  Scenario: Architect proposes lanes during Sprint Design Review
    Given a sprint plan in Sprint Planning v2 with N decomposed stories
    When the Architect runs the §14 lane rubric on each story
    Then the Sprint Plan §1 story table contains a Lane column with one of {standard, fast}
    And every fast-lane story has a one-line rationale in the §2.4 Lane Audit section
    And no fast-lane rationale references a forbidden surface

  Scenario: Gate 2 rejects fast-lane on forbidden surface
    Given a Sprint Plan with a story marked lane=fast
    And the story's affected files include a path matching a §14 forbidden-surface prefix
    When init_sprint.mjs runs
    Then the script exits non-zero
    And the error names the offending story + the forbidden prefix matched

  Scenario: state.json migrates v1 → v2 on first write under new code
    Given an existing state.json with schema_version: 1 and 5 stories
    When update_state.mjs is invoked under the new code
    Then the on-disk state.json contains schema_version: 2
    And every story has lane: standard, lane_assigned_by: migration-default
    And no other story field is modified

  Scenario: Fast-lane story skips QA on scanner pass
    Given a story with lane: fast and a developer commit that passes the pre-gate scanner
    When pre_gate_runner.sh runs against the story branch
    Then no QA agent is spawned
    And the story state advances directly to merge-ready
    And state.json reflects qa_bounces: 0

  Scenario: Fast-lane story auto-demotes on scanner failure
    Given a story with lane: fast
    When the pre-gate scanner fails on the developer commit
    Then state.json updates lane: standard with lane_assigned_by: human-override
    And state.json populates lane_demoted_at and lane_demotion_reason
    And sprint markdown §4 contains an LD event row naming the story and reason
    And QA is spawned per the standard contract on the next iteration

  Scenario: Fast-lane story auto-demotes on post-merge sprint-branch test failure
    Given a story with lane: fast that passed the pre-gate scanner
    And it was merged to sprint/SPRINT-NN
    When the post-merge sprint-branch test fails
    Then the merge is reverted
    And state.json updates lane: standard
    And the story re-enters the standard loop from the Architect plan stage

  Scenario: Hotfix new scaffolds an off-sprint item
    Given the user runs `cleargate hotfix new copy-fix`
    When the command completes
    Then `.cleargate/delivery/pending-sync/HOTFIX-NNN_copy_fix.md` exists
    And the file matches the hotfix.md template structure
    And the §"Verification Steps" section is present and non-empty

  Scenario: Hotfix cap blocks a fourth draft in a rolling 7-day window
    Given 3 hotfix items resolved in the last 7 days
    When the user runs `cleargate hotfix new another-fix`
    Then the command exits non-zero
    And the error explains the rolling-7-day cap and counts the existing hotfixes
    And no HOTFIX-NNN_*.md file is created

  Scenario: Reporter writes Lane Audit and Hotfix Audit on a sprint with a fast-lane story
    Given a sprint where at least one story shipped with lane: fast
    And one hotfix merged within the sprint window
    When the Reporter generates REPORT.md
    Then §3 contains rows for Fast-Track Ratio, Fast-Track Demotion Rate, Hotfix Count, Hotfix-to-Story Ratio, Hotfix Cap Breaches
    And §3 contains an `LD events` count row alongside CR:* / UR:* tallies
    And §5 Process contains a Lane Audit table with one row per fast-lane story
    And §5 Process contains a Hotfix Audit table with the merged hotfix's row
    And §5 Process contains the Hotfix Trend rolling-4-sprint narrative

  Scenario: close_sprint.mjs accepts a v1 report unchanged (backward compat)
    Given a REPORT.md with template_version: 1 and no §0 AI Continuity block
    When close_sprint.mjs validates the report
    Then validation passes
    And no error is emitted about missing Lane Audit / Hotfix Audit sections

  Scenario: close_sprint.mjs rejects a v2 report missing required sections
    Given a sprint where state.json has schema_version: 2 AND at least one lane: fast story
    And REPORT.md has template_version: 2 BUT lacks §5 Lane Audit
    When close_sprint.mjs validates the report
    Then validation fails non-zero
    And the error names the missing section verbatim

  Scenario: close_sprint.mjs rejects non-conformant sprint-run path
    Given a REPORT.md at `.cleargate/sprint-runs/S-09/REPORT.md`
    When close_sprint.mjs validates the report
    Then validation fails non-zero
    And the error explains the `^SPRINT-\d{2,3}$` convention and the offending path

  Scenario: Dogfood end-to-end at sprint close (STORY-022-08)
    Given the SPRINT-14 close-out has run STORY-014-02 self-upgrade
    And the live `.claude/` reflects the post-EPIC-022 scaffold canonical
    And a known-trivial CR is seeded with lane: fast
    When the four-agent loop executes the CR
    Then token spend for the CR is ≤ 10000 (vs ~30k–60k baseline)
    And state.json reflects qa_bounces: 0 and arch_bounces: 0 for the CR
    And REPORT.md §5 Lane Audit shows the CR's row with the human retrospect column ready for fill-in

  Scenario: Dogfood demotion path on induced failure (STORY-022-08)
    Given a known-trivial CR is seeded with lane: fast
    And the developer is instructed to commit a deliberate scanner-failing change
    When pre_gate_runner.sh runs
    Then state.json reflects lane: standard with lane_assigned_by: human-override
    And state.json populates lane_demoted_at and lane_demotion_reason
    And sprint markdown §4 contains the LD event row
```

## 6. AI Interrogation Loop (Human Input Required)

> All four open questions from PROPOSAL-013 §4 resolved 2026-04-26 with AI recommendations accepted verbatim. Resolution log:
>
> - **Q1 — Lane assignment for Bugs (story-only or extend to bugs).** ✅ Extended to bugs. Same rubric, same demotion path. Bug frontmatter gains the same `lane: standard|fast` field.
> - **Q2 — LOC cap (50 / 30 / 100 net).** ✅ Start at 50 net per rubric §1. Log every fast-lane story's actual LOC in §5 Lane Audit; tighten or loosen after 2 sprints of audit data.
> - **Q3 — Hotfix cap window (calendar week / rolling 7-day).** ✅ Rolling 7-day. No Sunday-resets-budget gaming.
> - **Q4 — Three-strike auto-disable on rubric retrospect "n" answers.** ✅ Yes — fail-safe default. After 3 consecutive sprints with retrospect "n" answers, auto-disable the fast lane until a CR ships to tighten the rubric.

§6 is empty. No outstanding questions. Epic is 🟢.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Sprint Execution**

Pass criteria — all met:
- [x] PROPOSAL-013 has `approved: true` (flipped 2026-04-26 by sandrinio per Path A choice).
- [x] §0 `<agent_context>` block is complete with 10 architecture rules + 17 target files.
- [x] §4 Technical Grounding contains 100% real, verified file paths (cross-checked against repo state on 2026-04-26).
- [x] §6 AI Interrogation Loop is empty; all 4 questions resolved with ratified answers integrated into §2/§3/§4/§5.
- [x] 0 "TBDs" exist in this document.

Decomposed into 8 stories ready for SPRINT-14 M3-M5: STORY-022-01 through STORY-022-08 per the SPRINT-14 §1 deliverables table.
