---
story_id: STORY-051-05
parent_epic_ref: EPIC-051
parent_cleargate_id: EPIC-051
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🟢 Low
context_source: EPIC-051 decomposition (framework self-audit 2026-07-17) + verified codebase grounding + recorded direct approval
area: framework/enforcement
actor: ClearGate maintainer (docs & scaffold)
complexity_label: L3
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-07-17T00:00:00Z
updated_at: 2026-07-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
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
  last_gate_check: 2026-07-17T18:17:05Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# STORY-051-05: Sweep Dead execution_mode/v1/v2 Vocabulary from Shipping Surfaces
**Complexity:** L3 — a wide-but-shallow doc/agent/template/comment sweep that deletes every live `execution_mode`/v1/v2 behavior-switch phrase from shipping surfaces and re-syncs the three dogfood copies, proven zero by a repo-wide grep gate.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate maintainer (docs & scaffold), I want every dead `execution_mode` / `v1` / `v2` behavior-switch phrase removed from the shipping docs, agents, templates, and script comments (and the three dogfood copies re-synced), so that the scaffold we ship in v0.17.x never instructs an agent to route on a field CR-070/CR-074 already retired, and the only enforcement-strength lever a reader sees is `CLEARGATE_ADVISORY=1`.

### 1.2 Detailed Requirements
- Delete the root `CLAUDE.md` "**Sprint mode.** Read `execution_mode:` … `v1` = advisory; `v2` = enforce … Default `v1`." paragraph (`CLAUDE.md:152`) — it routes on a field that no longer exists.
- Re-inject the root `CLAUDE.md` bounded block (`<!-- CLEARGATE:START -->…<!-- CLEARGATE:END -->`, `CLAUDE.md:129-188`) from cleaned canonical so the root block becomes byte-aligned with canonical (this also removes the root's residual "v2-mode question" at `:138`, "Both block in v2" at `:158`, and "under v2" at `:160`).
- Strip residual behavior-switch vocab from canonical `cleargate-planning/CLAUDE.md`: "triaging a v2-mode question" (`:16`) → "an enforcement question"; "Both block in v2." (`:34`) → "Both block."; "under v2" (`:36`) → dropped.
- Rewrite `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md:119` (§4 Gate-3) so the sentence "Under `execution_mode: v2` a failing per-item gate hard-blocks; under `v1` it warns." becomes "A failing per-item gate hard-blocks (always enforced)." — drop the v1/v2 clause AND the inverted default, and do **not** state that `CLEARGATE_ADVISORY=1` softens per-item gates (per resolved Q1, it softens only `cleargate sprint preflight`).
- Scrub the §4 Gate-3 vocab overlap and the residual table row `cleargate-protocol.md:864` "Architect-pass SHA (standard lane v2 only)" → "(standard lane only)".
- Rewrite the `cleargate-planning/.cleargate/templates/story.md` decomposition-signals block (`:34-37`) to describe `parallel_eligible` / `expected_bounce_exposure` / `lane` as always-on fields (delete "v2-only signals. Under v1 sprints they are informational" at `:37` and strip the "in a v2 sprint" clause from `:35`), and rewrite the §3.1 gate-input note (`:155`) from "**v2 gate input:** under v2 execution mode, this table is a pre-commit gate input" to an always-enforced framing.
- Change the shared agent boilerplate "Direct invocation (without wrapper) is forbidden under v2." → "…is forbidden." in `qa.md:174`, `devops.md:244`, `reporter.md:131`; and change devops.md's "v2 standard lane only" (`:48`) and "Required for v2 standard-lane only" (`:99`) → "standard lane only".
- Reword the dead v1/v2-fork docstrings and comments that describe a routing that no longer exists: `close_sprint.mjs` header comments "the v2 block / v1 advisory paths" (`:45,:51`), "Step 3.5 is v2-fatal" (`:65`), **and the inline Step-2.8 merge-check comment `:639` "exit 1 (v2 enforcing); warn + continue (v1 advisory)"**; and `cleargate-cli/src/commands/sprint.ts` handler docstrings "v1: print inert message, exit 0. / v2: run …" (`:184-185`, `:371-372`, `:687-688`) and "run two gates (v2 only)" (`:187`) → always-on wording.
- Reword the stale `under v2` qualifier in `cleargate-cli/src/commands/story.ts:85` ("Path to the sprint's state.json. The file may not exist yet **under v2** when the sprint was just initialized" → "…may not exist yet **immediately after** the sprint was just initialized") — state.json existence is init-timing, not a mode axis; this is the last of the 15 grep-gate hits and would otherwise leave the gate at 1.
- After every canonical edit, run `npm run prebuild` (in `cleargate-cli/`) to re-mirror the payload, then hand-sync the live gitignored copies under `/.claude` and `/.cleargate` — diffing before overwrite (never blind `cp`).
- A repo-wide grep gate for the dead behavior-switch vocabulary returns **0** hits across shipping surfaces (it returns exactly 15 today) after excluding: `delivery/archive/`, `CHANGELOG`, absence-asserting tests + fixtures, state-schema/report-template version labels, `execution_mode`-retirement annotations, and the four sibling-owned in-flight files.

### 1.3 Out of Scope
- **`file_surface_diff.sh`** (its `detect_execution_mode()` / v1/v2 branch removal is owned by STORY-051-01) and **`test_ratchet.mjs`** (retired by STORY-051-02) — both EXCLUDED from this sweep's worklist per resolved Q1.
- **`assert_story_files.mjs`** `CLEARGATE_EXEC_MODE` bypass removal (behavioral, STORY-051-04) and the **`launch_wave.mjs`** header (STORY-051-09).
- The gate-numbering renumber and the stale §9 pre-CR-025 flow in `cleargate-protocol.md` (STORY-051-09) — this story touches only line 119 / §4 Gate-3 and the line-864 row.
- Any **behavioral** change to a script or the CLI — this is a vocabulary/comment sweep only; no exit codes, control flow, or gate logic change. (`close_sprint.mjs:639` and `story.ts:85` edits reword comments/docstrings only; the merge-check control flow at Step 2.8 is untouched.)
- **Legitimate, non-switch vocabulary that stays untouched:** the `state.json` schema versions `v1`/`v2`/`v3` and their migrators (`migrateV1ToV2`, `migrateStateToV3`, `_migrate-schema-v3.mjs`), the `execution_mode`-field-strip code in the v3 migration (it must name the key it deletes), the "Sprint Report v2 / v2.1" template name and `v1-schema` sprint references in `reporter.md`, the `SPRINT-99-v1/v2.md` test fixtures + `.sh` test scripts, and the "`execution_mode` retired" historical annotations in `cleargate-enforcement.md`, `init_sprint.mjs`, `gate-mode.ts`, and the inline `close_sprint.mjs` / `sprint.ts` annotations (these announce the retirement — the opposite of dead-switch vocab).

### 1.4 Open Questions
> Both entries below are RESOLVED — recorded as Human decisions. No new blocking question surfaced while drafting.
- **Question (Q1 from the Epic §6):** Does `CLEARGATE_ADVISORY=1` become the universal strength knob, or is enforcement narrowed so it only softens `cleargate sprint preflight`?
- **Recommended:** narrow.
- **Human decision (FINAL, gate review):** NARROW. The protocol §preflight rewrite states a failing per-item gate hard-blocks (always enforced); it does **not** claim `CLEARGATE_ADVISORY` softens per-item gates. `file_surface_diff.sh` (STORY-051-01) and `test_ratchet.mjs` (STORY-051-02) are EXCLUDED from this sweep's worklist.
- **Question:** Where is the boundary between "dead switch vocab to delete" and "legitimate version/retirement vocab to keep"?
- **Recommended:** keep state-schema version labels, template-version names, field-strip migration code, and retirement annotations; delete only phrases that instruct routing on the retired axis.
- **Human decision (RESOLVED by recommendation):** adopt the exemption set in §1.3 and encode it as the grep gate's exclusion filter (§3.2). This keeps the gate precise and prevents over-scrubbing.

### 1.5 Risks
- **Risk:** Shared-file collision — this story edits `cleargate-protocol.md` (also touched by STORY-051-09) and `CLAUDE.md` (also touched by STORY-051-07). / **Mitigation:** `parallel_eligible=n`; land this sweep **first** in M1, then 051-07/09 layer their edits on the cleaned files; this story confines its protocol.md edits to line 119/§4 Gate-3 and line 864, well clear of §9 and the gate-numbering canon.
- **Risk:** Blind `cp` canonical→live has already destroyed live-only content once (FLASHCARD 2026-07-17). / **Mitigation:** `diff` canonical vs live for every touched path before syncing; hand-port the specific lines rather than overwriting whole files; treat `npm run prebuild` (payload) as the only automated copy.
- **Risk:** Over-scrubbing — deleting the `execution_mode`-field-strip code or a state-schema `v2` label would break the v3 migration or report tooling. / **Mitigation:** the §3.2 exemption filter and §1.3 keep-list explicitly protect schema-version labels, migration code, and retirement annotations; the absence test uses the same exclusion filter so it cannot demand their removal.
- **Risk:** Root `CLAUDE.md` block is diverged from canonical in more than the Sprint-mode paragraph (missing the "Single test runner (EPIC-028)" note, thinner orientation item 1). / **Mitigation:** the re-inject aligns the whole bounded block to canonical, which is the intended drift-repair; the meta-repo-specific content OUTSIDE the block (`CLAUDE.md:1-128`) is left untouched.
- **Risk:** The gate's `Sprint mode\. Read` sub-pattern does not literally match root `CLAUDE.md:152` (markdown bold `**` and backticks sit between the tokens), so the gate alone cannot prove that paragraph's removal. / **Mitigation:** the re-inject deletes the whole bounded block regardless; the §2.2 `git diff CLAUDE.md` manual check is the belt-and-suspenders proof the Sprint-mode paragraph is gone.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)
```gherkin
Feature: Sweep dead execution_mode/v1/v2 vocabulary from shipping surfaces

  Scenario: Grep gate is clean after the sweep
    Given every one of the 15 shipping-surface hits in this story's worklist has been edited
    And the exclusion filter drops archive, changelog, absence tests, fixtures,
      schema-version labels, retirement annotations, and the four sibling-owned files
    When the repo-wide dead-switch-vocabulary grep gate runs
    Then it returns zero hits (it returned 15 before the sweep)

  Scenario: Root CLAUDE.md no longer routes on execution_mode
    Given the root CLAUDE.md after re-injection from cleaned canonical
    When I read the CLEARGATE:START..END block
    Then the "Sprint mode. Read execution_mode … Default v1" paragraph is absent
    And "block in v2", "under v2", and "v2-mode question" no longer appear in the block
    And the block matches the cleaned canonical bounded block

  Scenario: Protocol Gate-3 states always-enforced blocking without ADVISORY softening
    Given cleargate-protocol.md line 119 after the rewrite
    When I read the per-item gate sentence
    Then it reads "a failing per-item gate hard-blocks (always enforced)"
    And it contains no "execution_mode", "v1", or "v2" clause
    And it does not claim CLEARGATE_ADVISORY softens per-item gates

  Scenario: Canonical, payload, and live copies agree
    Given a canonical edit under cleargate-planning/**
    When npm run prebuild runs and the live copies are hand-synced
    Then the payload mirror is byte-identical to canonical
    And each touched live /.claude|/.cleargate file matches canonical
    And no live-only content was destroyed (diff reviewed before overwrite)

  Scenario: Legitimate version and retirement vocabulary is preserved
    Given the sweep is complete
    When I grep the surfaces for schema-version labels and retirement annotations
    Then state.json v1/v2/v3 migrators, "Sprint Report v2" naming, the execution_mode
      field-strip migration, and "execution_mode retired" annotations still exist
```

### 2.2 Verification Steps (Manual)
- [ ] Run the §3.2 grep gate; confirm it prints **0** lines (baseline was 15, including `close_sprint.mjs:639` and `story.ts:85`).
- [ ] `git diff CLAUDE.md` — Sprint-mode paragraph gone; bounded block equals cleaned canonical block.
- [ ] Read `cleargate-protocol.md:119` and `:864`; confirm always-enforced wording and no v1/v2 tokens.
- [ ] Read `story.md:34-37` and `:155`; confirm always-on framing for the three fields and the gate-input note.
- [ ] Read `close_sprint.mjs:639` and `cleargate-cli/src/commands/story.ts:85`; confirm the switch tokens are gone and no control flow changed.
- [ ] `diff` each canonical file against its payload mirror (post-`prebuild`) — zero diff.
- [ ] `diff` each canonical file against its live `/.claude`|`/.cleargate` copy — only the intended lines changed; no live-only content lost.
- [ ] `cd cleargate-cli && npm run typecheck` clean (sprint.ts/story.ts comment edits compile) and `tsx --test` green including the new absence test.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `CLAUDE.md` (root meta-repo — delete `:152` Sprint-mode paragraph; re-inject `:129-188` bounded block from cleaned canonical) |
| Related File | `cleargate-planning/CLAUDE.md` (strip `:16` "v2-mode question", `:34` "Both block in v2", `:36` "under v2") |
| Related File | `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` (rewrite `:119` §4 Gate-3; fix `:864` "standard lane v2 only") |
| Related File | `cleargate-planning/.cleargate/templates/story.md` (rewrite `:34-37` decomposition signals; `:155` gate-input note) |
| Related File | `cleargate-planning/.claude/agents/qa.md` (`:174` "forbidden under v2" → "forbidden") |
| Related File | `cleargate-planning/.claude/agents/devops.md` (`:244` "forbidden under v2"; `:48` + `:99` "v2 standard lane" → "standard lane") |
| Related File | `cleargate-planning/.claude/agents/reporter.md` (`:131` "forbidden under v2" → "forbidden") |
| Related File | `cleargate-planning/.cleargate/scripts/close_sprint.mjs` (header docstring `:45`, `:51`, `:65` + inline `:639` — reword dead v1/v2-fork lines) |
| Related File | `cleargate-cli/src/commands/sprint.ts` (handler docstrings `:184-185`, `:187`, `:371-372`, `:687-688` — always-on wording) |
| Related File | `cleargate-cli/src/commands/story.ts` (`:85` docstring — drop stale "under v2" qualifier) |
| Payload Mirror (via `npm run prebuild`) | `cleargate-cli/templates/cleargate-planning/CLAUDE.md` |
| Payload Mirror (via `npm run prebuild`) | `cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` |
| Payload Mirror (via `npm run prebuild`) | `cleargate-cli/templates/cleargate-planning/.cleargate/templates/story.md` |
| Payload Mirror (via `npm run prebuild`) | `cleargate-cli/templates/cleargate-planning/.claude/agents/qa.md` |
| Payload Mirror (via `npm run prebuild`) | `cleargate-cli/templates/cleargate-planning/.claude/agents/devops.md` |
| Payload Mirror (via `npm run prebuild`) | `cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md` |
| Payload Mirror (via `npm run prebuild`) | `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs` |
| Live Copy (hand-sync, diff-first) | `/.cleargate/knowledge/cleargate-protocol.md` |
| Live Copy (hand-sync, diff-first) | `/.cleargate/templates/story.md` |
| Live Copy (hand-sync, diff-first) | `/.cleargate/scripts/close_sprint.mjs` |
| Live Copy (hand-sync, diff-first) | `/.claude/agents/qa.md` |
| Live Copy (hand-sync, diff-first) | `/.claude/agents/devops.md` |
| Live Copy (hand-sync, diff-first) | `/.claude/agents/reporter.md` |
| New File Needed | Yes — `cleargate-cli/src/commands/no-exec-mode-vocab.node.test.ts` (absence test — greps payload + CLI src, asserts zero dead-switch hits; itself exempt from the gate) |

> Note: `cleargate-cli/src/**` (incl. `sprint.ts`, `story.ts`, the new test) is the CLI's **own** git repo — it has no `cleargate-planning/` payload mirror and no `/.claude` live copy; only the canonical→payload rows above are mirrored by `prebuild`.

### 3.2 Technical Logic

**Docs — `CLAUDE.md` (root) + `cleargate-planning/CLAUDE.md`.** In canonical, delete the "under v2"/"block in v2"/"v2-mode question" tokens: `:16` "triaging a v2-mode question" → "triaging an enforcement question"; `:34` "Both block in v2." → "Both block."; `:36` "…Steps 2.7 … + 2.8 … under v2; failure halts close." → "…Steps 2.7 … + 2.8 …; failure halts close." Canonical has **no** Sprint-mode paragraph (it was already dropped) — the root diverged. So in the root `CLAUDE.md`, delete the whole `:152` "**Sprint mode.** Read `execution_mode:` …" paragraph, then re-inject the bounded block `:129-188` from cleaned canonical (via `cleargate init` from the repo root, or a hand-port of the block) so the root block equals canonical byte-for-byte; content outside the block (`:1-128`) is untouched. Then `npm run prebuild` mirrors canonical → `cleargate-cli/templates/cleargate-planning/CLAUDE.md`.

**Docs — `cleargate-protocol.md`.** Line 119 currently: "…per-item readiness gates pass for every work item in §1 Consolidated Deliverables. **Under `execution_mode: v2` a failing per-item gate hard-blocks; under `v1` it warns.** See `cleargate-enforcement.md` §<N> …" Replace the bold sentence with: "**A failing per-item gate hard-blocks (always enforced).**" Do not add any `CLEARGATE_ADVISORY` softening clause here (Q1 narrow). (Leave the pre-existing `§<N>` cross-reference token as-is — it is current file content owned by the §9 renumber in STORY-051-09, not this sweep's to resolve.) Line 864 table row: "Architect-pass SHA (standard lane v2 only)" → "Architect-pass SHA (standard lane only)".

**Template — `story.md`.** Rewrite `:37` "All three fields are v2-only signals. Under v1 sprints they are informational; defaults apply for stories authored before SPRINT-09." → "All three fields are always-on signals; defaults apply for stories authored before SPRINT-09." Keep `:34-36` field descriptions but strip the "in a v2 sprint" clause from `:35` ("Used by orchestrator to sequence high-exposure stories before low-exposure ones **in a v2 sprint** to surface risk early." → "… to sequence high-exposure stories before low-exposure ones to surface risk early."). Rewrite `:155` "**v2 gate input:** under v2 execution mode, this table is a pre-commit gate input (cleargate-enforcement.md §6)…" → "**Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced)…" — preserve the surface-whitelist and non-path-row sentences verbatim.

**Agents.** In `qa.md:174`, `devops.md:244`, `reporter.md:131`, the identical run_script.sh boilerplate sentence "Direct invocation (without wrapper) is forbidden under v2." → "Direct invocation (without wrapper) is forbidden." In `devops.md:48` "{STORY-ID}-arch.md ✓ (v2 standard lane only)" → "(standard lane only)"; `:99` "# Required for v2 standard-lane only:" → "# Required for standard-lane only:". Leave every "Sprint Report v2/v2.1" name, "v1-schema", and "v1 state" in `reporter.md` unchanged — those are template/schema versions, not switches.

**Scripts.** `close_sprint.mjs` header docstring: `:45` and `:51` "Used to exercise the v2 block / v1 advisory paths" → "Used to exercise the block / advisory paths"; `:65` "Never use in production — Step 3.5 is v2-fatal in production." → "Never use in production — Step 3.5 is fatal in production." Inline Step-2.8 merge-check comment `:639` "// On miss: list unmerged commits + exit 1 (v2 enforcing); warn + continue (v1 advisory)." → "// On miss: list unmerged commits + exit 1 (always enforced; `CLEARGATE_ADVISORY=1` warns + continues)." — **comment only; the merge-check control flow is unchanged.** Keep every inline `// Always enforced (STORY-070-01: execution_mode retired)` annotation and the `migrateV1ToV2` / `migrateStateToV3` state-schema code as-is. `sprint.ts` handler docstrings: replace the "v1: print inert message, exit 0. / v2: run …" two-line forks (`:184-185`, `:371-372`, `:687-688`) with a single "Always runs the pipeline (STORY-070-01: execution_mode retired)." line, and `:187` "run two gates (v2 only)" → "run two gates". `story.ts:85` docstring: "Path to the sprint's state.json. The file may not exist yet **under v2** when the sprint was just initialized — callers must guard." → "Path to the sprint's state.json. The file may not exist yet **immediately after** the sprint was just initialized — callers must guard." Keep the inline `// STORY-070-01: execution_mode retired …` annotations and every `state.json` reference. No control-flow change.

**The grep gate (verification, ships as `package.json` script `check:no-exec-mode-vocab` + the node:test).** Runnable form:
```
grep -rnE 'under v[12]\b|block in v2|forbidden under v2|v2-only|v2 only|v1 advisory|v2 block|v2-fatal|v1 = advisory|execution_mode: *"?v[12]|Sprint mode\. Read' \
  CLAUDE.md cleargate-planning cleargate-cli/src \
  --include='*.md' --include='*.mjs' --include='*.ts' --include='*.sh' 2>/dev/null \
  | grep -vE '/delivery/archive/|CHANGELOG|/test/|\.test\.|/fixtures/|SPRINT-99-v[12]|migrateV1ToV2|migrateStateToV3|_migrate-schema-v3|execution_mode.*retired|retired.*execution_mode|file_surface_diff\.sh|test_ratchet\.mjs|assert_story_files\.mjs|launch_wave\.mjs|cleargate-enforcement\.md'
```
Exit semantics: **0 lines ⇒ pass (exit 0); ≥1 line ⇒ fail (exit 1)**, printing the offending `path:line`. This returns 15 today (verified this session — the 15 include `close_sprint.mjs:639` and `cleargate-cli/src/commands/story.ts:85`, both now in the worklist) and must return 0 post-sweep. Note the `Sprint mode\. Read` sub-pattern does not literally match root `CLAUDE.md:152` (markdown bold sits between the tokens), so that paragraph is not one of the 15 counted hits; its removal is proved by the re-inject + the §2.2 `git diff` check rather than by the gate. The absence node:test wraps the same pattern over `cleargate-cli/templates/cleargate-planning/**` + `cleargate-cli/src/**` (the surfaces reachable inside the CLI's own repo; canonical cleanliness follows transitively because `prebuild` mirrors canonical → payload byte-identically) and asserts an empty result.

### 3.3 API Contract (if applicable)
N/A — no API surface. This story changes only documentation, agent prompts, template prose, and code comments/docstrings; it adds one dev-only `package.json` script (`check:no-exec-mode-vocab`) and one test file, neither of which is a product HTTP/CLI contract.

## 4. Quality Gates

### 4.1 Minimum Test Expectations
| Test Type | Minimum Count | Notes |
|---|---|---|
| node:test absence test (`*.node.test.ts`) | 1 | `no-exec-mode-vocab.node.test.ts` — shells the §3.2 pattern over payload + CLI src, asserts zero hits; runs via `tsx --test`. Exempt from the gate itself (absence-asserting test). |
| node:test regression assertion | 1 | Same file, a second case asserting the preserved vocabulary still exists (state-schema migrators + "Sprint Report v2" + "execution_mode retired" annotation each match ≥1) — guards against over-scrubbing. |
| Manual verification (§2.2) | 8 checks | grep-gate = 0, `git diff` on CLAUDE.md/protocol/story, close_sprint.mjs:639 + story.ts:85 reword, canonical↔payload↔live diffs, `typecheck` + `tsx --test` green. |

### 4.2 Definition of Done (The Gate)
- [ ] All §1.2 requirements implemented; every dead-switch phrase in the §3.1 table (all 15 grep-gate hits) removed/reworded.
- [ ] §2.1 Gherkin scenarios all pass; §2.2 manual checks all ticked.
- [ ] Grep gate (§3.2) returns **0** (baseline 15); `check:no-exec-mode-vocab` wired into `cleargate-cli/package.json`.
- [ ] Absence node:test added and green under `tsx --test`; `npm run typecheck` clean in `cleargate-cli/`.
- [ ] Canonical → payload synced via `npm run prebuild` (byte-identical mirrors verified by diff).
- [ ] Canonical → live `/.claude|/.cleargate` hand-synced with a **diff-before-overwrite** on every touched file; no live-only content destroyed.
- [ ] Root `CLAUDE.md` bounded block re-injected from cleaned canonical; Sprint-mode paragraph gone; block equals canonical.
- [ ] Preserved-vocabulary keep-list (§1.3) intact: schema migrators, template-version names, field-strip migration, and retirement annotations untouched.
- [ ] No behavioral/control-flow change to any script or the CLI (comment/prose-only diffs, plus the new test + package script).

## Existing Surfaces
> L1 reuse audit.
- **Surface:** `cleargate-cli/package.json:55` — the `check:no-vitest` npm script (an `execSync('grep -rE …')` guard that exits non-zero on residue) is the exact shape to clone for `check:no-exec-mode-vocab`.
- **Coverage of this requirement:** partial — it proves the grep-gate-as-npm-script pattern already ships and is CI-wired, but its pattern targets vitest, not the execution_mode vocabulary; this story adds a sibling script with the §3.2 pattern.
- **Surface:** `cleargate-planning/.cleargate/knowledge/cleargate-enforcement.md:27,211,254,266,270,280` — the canonical "execution_mode is retired — single always-enforced behavior" annotations already establish the correct post-CR-074 language this sweep aligns every other surface to.
- **Coverage of this requirement:** partial — enforcement.md is already clean and is the template for the always-enforced wording, but the ~15 other surfaces (docs/agents/template/comments) still carry the dead vocab this story removes; enforcement.md itself is out of scope (owned by the break-glass story).
- **Surface:** `cleargate-cli/src/commands/sprint.ts:8` and `cleargate-cli/src/util/gate-mode.ts:4` — existing `// STORY-070-01: execution_mode … retired` annotations show the accepted in-code retirement-note convention this sweep keeps and extends.
- **Coverage of this requirement:** partial — establishes the keep-list convention; the dead v1/v2-fork **docstrings** in the same file (`:184-188` etc.) still need rewording.

## Why not simpler?
- **Smallest existing surface that could carry this:** none single — the dead vocabulary is spread across four surface classes (root + canonical `CLAUDE.md`, the protocol/template docs, the three agent prompts, and two script/CLI comment blocks), each with its own canonical/payload/live copy set. There is no one file whose edit clears the grep gate.
- **Why isn't extension / parameterization / config sufficient?** The debt is textual, not behavioral — there is no switch to parameterize; CR-070/CR-074 already deleted the runtime axis, leaving only stale prose that lies about how enforcement works. The only durable fix is to delete the phrases and prove their absence with a grep gate, then keep the three dogfood copies in sync. A config flag would re-introduce exactly the `execution_mode`-style lever this epic forbids. The work is deliberately kept in one story so a single grep-gate run (15 → 0) is the atomic proof of completeness; splitting per-file would fragment that proof and risk a partial sweep leaving a live surface still routing on a retired field.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low — approved at Gate 1 (2026-07-17)**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2. (Grep-gate=0, root CLAUDE re-inject, protocol always-enforced rewrite, three-copy sync, and preserved-vocab each map to a scenario; the per-file rewords are subsumed by the atomic grep-gate=0 scenario.)
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding. (Every path + line re-Read this session; grep gate confirmed to return exactly 15 today, and all 15 hits — including close_sprint.mjs:639 and story.ts:85 — are now in the worklist.)
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new." (Cites `package.json:55`, `enforcement.md:27…`, `sprint.ts:8`, `gate-mode.ts:4`.)
- [x] Why not simpler? has both sub-bullets answered.

> Boxes 1–5 are checked because the policy decisions (Q1 narrow) are resolved and grounding is verified. The remaining gap to 🟢 is the epic-level `approved: true`, which is not this story's to set.