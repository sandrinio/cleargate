---
story_id: STORY-032-03
parent_epic_ref: EPIC-032
parent_cleargate_id: "EPIC-032"
sprint_cleargate_id: SPRINT-32
carry_over: false
status: Completed
approved: true
ambiguity: 🟡 Medium
context_source: |
  EPIC-032 decomposition at SPRINT-32 kickoff 2026-05-29; §6 answers (Q5 opt-in --code-map
  flag, Q6 append-as-input-file Architect consumption, Q7 target-repos off-by-default same flag)
  + STORY-033-01 spike result are inputs. Depends on STORY-032-01 (scanner/extractor) and
  STORY-032-02 (page compile + drift). This story is the pipeline-integration + consumption glue.
actor: Architect agent
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: med
lane: standard
area: wiki
created_at: 2026-05-29T00:00:00Z
updated_at: 2026-05-29T00:00:00Z
created_at_version: cleargate@0.13.0
updated_at_version: cleargate@0.13.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T08:04:39Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-032-03-Wiki-Build-Integration
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T08:04:39Z
  sessions: []
---

# STORY-032-03: Wiki-Build Integration + Synthesis/Index Linking + Architect Consumption
**Complexity:** L2 — register the code-map pass behind an opt-in flag, link pages from the index, and wire the Architect to read them.

## 1. The Spec (The Contract)

> Prior work: [[EPIC-032]] + [[STORY-033-01]] (spike) — decomposition pre-authorized at epic level.

### 1.1 User Story
As an Architect agent, I want `cleargate wiki build --code-map` to register the code-map pass, link every per-package code-map page from `.cleargate/wiki/index.md`, and be told to read `.cleargate/wiki/code/<package>.md` for in-scope packages before raw source, so that I plan milestones from a token-cheap structural skeleton instead of re-grepping the source tree every dispatch.

### 1.2 Detailed Requirements
- Register the code-map compile pass (built by STORY-032-01/02) inside the `wikiBuildHandler` in `cleargate-cli/src/commands/wiki-build.ts`, gated behind a new **opt-in `--code-map` flag** (off by default this sprint per EPIC-032 §6 Q5; the flag stays the same control when default flips on at sprint close, and is the same opt-in control for target repos per §6 Q7 — no config YAML, no `.cleargate/knowledge/` knob).
- The `--code-map` flag surfaces as a boolean `WikiBuildOptions.codeMap` test-seam-friendly option so the handler can be exercised both with and without the pass.
- When the flag is absent, `wiki build` behaves exactly as today (no `.cleargate/wiki/code/**` writes, no `## Code Map` index section).
- Extend the page-kind set consumed by the scanner in `cleargate-cli/src/wiki/scan.ts` so that pages under `wiki/code/**` are a recognized `code-map` kind and are included in the index-synthesis input set (today `scanRawItems` only reads `pending-sync/` + `archive/`; the index builder must additionally see the emitted code-map pages).
- Add a `## Code Map` section to the index assembly (`buildIndex` in `cleargate-cli/src/commands/wiki-build.ts`, the renderer being the shared `renderTemplate` in `cleargate-cli/src/wiki/synthesis/render.ts`) that lists one linked entry per per-package code-map page (e.g. `- [[code/cleargate-cli]] — N exported symbols`). The section is emitted only when the `--code-map` pass ran and produced at least one page; it is omitted entirely otherwise.
- Architect consumption (EPIC-032 §6 Q6 — append-as-input-file, NOT a layered-context refactor): the orchestrator appends the contents of `.cleargate/wiki/code/<package>.md` for every in-scope package to the Architect dispatch context as another input file.
- Update the Architect agent description in `cleargate-planning/.claude/agents/architect.md` (canonical) so the "Inspect existing code" step instructs the Architect to read `.cleargate/wiki/code/<package>.md` for any in-scope package **before** reading raw source — advisory only, with explicit "code-map is advisory; verify with Read/Grep" wording so the code stays source of truth.
- Note the live `/.claude/agents/architect.md` re-sync (via `cleargate init` or hand-port) and the `npm run prebuild` auto-mirror to `cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` as a close-time follow-up (dogfood split per CLAUDE.md).

### 1.3 Out of Scope
- The source scanner, skeleton extractor, page compiler, drift detection, and `db_writes` extraction — owned by STORY-032-01 and STORY-032-02. This story only registers and consumes their output.
- Flipping `--code-map` to default-on (that flip happens at SPRINT-32 close once the extractor is proven; this story ships opt-in only).
- A layered-context dispatch refactor (work-items → code-map → raw source with per-layer token budgets) — explicitly deferred per §6 Q6.
- Any `.cleargate/knowledge/code-map.config.yaml` or other config knob — rejected in §6 Q1/Q7; the single `--code-map` flag is the only control.
- EPIC-033's per-story `db_write_set` frontmatter and the Architect SDR DB axis — owned by EPIC-033, not this story.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Should the `## Code Map` index section render even when the code-map pass ran but every package was skipped (e.g. all missing tsconfig), producing zero pages?
- **Recommended:** Omit the section entirely when zero code-map pages exist — an empty heading is noise. Emit it only when `≥1` page was produced.
- **Human decision:** _(populated during Brief review)_

- **Question:** When `--code-map` is absent but a stale `.cleargate/wiki/code/**` directory exists from a prior run, should `buildIndex` still link those pages?
- **Recommended:** No — the `## Code Map` section is gated on the pass actually running this invocation, not on directory presence, to keep "no flag = today's behavior" literally true. Stale pages are left untouched on disk (cleanup is out of scope).
- **Human decision:** _(populated during Brief review)_

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** `architect.md` is shared with STORY-033-03; concurrent edits collide.
- **Mitigation:** Per the brief merge order, STORY-032-03 merges **after** STORY-033-03. The Architect's milestone plan must serialize these two stories on `architect.md`; this story rebases onto 033-03's edit before merging.

- **Risk:** The index `## Code Map` section could push `index.md` over its ~3k token budget on a large monorepo.
- **Mitigation:** Link entries only (one line per package: backlink + symbol count), never inline page bodies. Page bodies stay in `wiki/code/<package>.md` under their own 2k cap (STORY-032-02).

- **Risk:** Registering the pass without a flag-guard would force a `tsc` scan on every `wiki build`, surprising target repos.
- **Mitigation:** Hard opt-in `--code-map` gate (§6 Q5/Q7); default path is byte-identical to today.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Wiki-build code-map integration + index linking + Architect consumption

  Scenario: Opt-in flag registers the code-map pass
    Given a repo with code-map pages compilable by STORY-032-01/02
    When the operator runs `cleargate wiki build --code-map`
    Then the code-map pass runs and writes .cleargate/wiki/code/<package>.md pages
    And index.md contains a "## Code Map" section linking each per-package page

  Scenario: Flag absent preserves today's behavior
    Given the same repo
    When the operator runs `cleargate wiki build` with no --code-map flag
    Then no files are written under .cleargate/wiki/code/
    And index.md contains no "## Code Map" section

  Scenario: Index links resolve to emitted pages
    Given `cleargate wiki build --code-map` produced code/cleargate-cli.md and code/mcp.md
    When the index is assembled by buildIndex
    Then the "## Code Map" section contains a backlink entry for [[code/cleargate-cli]] and [[code/mcp]]
    And each entry shows the page's exported-symbol count

  Scenario: Architect dispatch consumes the code-map page first
    Given a milestone names files in cleargate-cli/src/wiki/**
    When the orchestrator dispatches the Architect agent
    Then the dispatch context includes the contents of .cleargate/wiki/code/cleargate-cli.md
    And the architect.md description instructs reading the code-map page before raw source

  Scenario: Stale code-map page lists an export the source no longer has
    Given code/cleargate-cli.md lists `export function foo()` but the source file no longer exports foo
    When the Architect plans a change touching that file
    Then the Architect verifies via Read/Grep before citing foo in the plan
    And the code-map page is queued for rebuild on the next ingest pass
    And the Architect's plan output does not cite the stale symbol
```

### 2.2 Verification Steps (Manual)
- [ ] Run `cleargate wiki build --code-map` and confirm `.cleargate/wiki/code/*.md` pages exist and `index.md` has a `## Code Map` section.
- [ ] Run `cleargate wiki build` (no flag) and confirm `git status` shows no changes under `.cleargate/wiki/code/` and no `## Code Map` heading in `index.md`.
- [ ] Confirm every `[[code/...]]` link in the `## Code Map` section resolves to an existing page file.
- [ ] Read `cleargate-planning/.claude/agents/architect.md` and confirm the "Inspect existing code" step names `.cleargate/wiki/code/<package>.md` and the "advisory; verify with Read/Grep" wording is present.
- [ ] Confirm `npm run typecheck` is clean and `npm test` is green for `cleargate-cli`.

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input. Every file staged in this story's commit must appear in the Value column.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/wiki-build.ts` — register the `--code-map` pass + add `## Code Map` to `buildIndex`. |
| Related File (modify) | `cleargate-cli/src/wiki/scan.ts` — extend page-kind set; include `wiki/code/**` in the index input set. |
| Related File (modify) | `cleargate-cli/src/wiki/synthesis/render.ts` — shared `renderTemplate` used to render the `## Code Map` section block. |
| Related File (modify) | `cleargate-planning/.claude/agents/architect.md` — instruct reading code-map pages before raw source (advisory). |
| Related File (read-only) | `cleargate-cli/src/wiki/code-map/compile-page.ts` — produced by STORY-032-02; its output pages are what this story links. |
| New Files Needed | No — a code-map registration test fixture is added under `cleargate-cli/test/wiki/code-map-integration.node.test.ts`. |

### 3.2 Technical Logic
1. Add `codeMap?: boolean` to `WikiBuildOptions` and parse `--code-map` from argv at the command-binding layer; default `false`.
2. In `wikiBuildHandler`, after Step 6 (synthesis pages), guard a new code-map step on `opts.codeMap`. When set, invoke the STORY-032-01/02 compile-page entrypoint to emit `.cleargate/wiki/code/<package>.md`, collecting the list of `{ package, symbolCount }` results.
3. In `scan.ts`, recognize the `code-map` page kind so the emitted pages are part of the index-synthesis input set (they live under the excluded `.cleargate/wiki/` suffix today, so the index builder must receive the in-memory results list rather than re-scanning that excluded dir).
4. In `buildIndex`, when the code-map results list is non-empty, render a `## Code Map` section via `renderTemplate` — one `- [[code/<package>]] — <symbolCount> exported symbols` line per page. Omit the whole section when the list is empty or the flag was off.
5. Edit `architect.md` "Inspect existing code" step (currently `## Workflow` item 3) to read `.cleargate/wiki/code/<package>.md` for in-scope packages first, with explicit advisory wording. Append the code-map page to the dispatch context as another input file (orchestrator-side, append-only — no layered refactor).
6. Close-time follow-up (note only): re-sync live `/.claude/agents/architect.md` and run `npm run prebuild` to mirror canonical → npm payload.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | `--code-map` on writes pages + index section; flag-off writes nothing + no section; `## Code Map` links resolve to emitted pages. |
| Acceptance tests | 5 | 1 per Gherkin scenario in §2.1, including the stale-export edge scenario. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered by `*.node.test.ts` tests run via `tsx --test`.
- [ ] `--code-map` absent leaves `wiki build` byte-identical to today (no `wiki/code/**` writes, no `## Code Map` section).
- [ ] `architect.md` updated with advisory code-map-first wording; live re-sync + `npm run prebuild` noted for close-time.
- [ ] `npm run typecheck` clean and `npm test` green for `cleargate-cli`.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

> Reuse audit. The wiki pipeline is extended; only the `--code-map` registration glue and index `## Code Map` section are net-new.

- **Surface:** `cleargate-cli/src/commands/wiki-build.ts:54` — `wikiBuildHandler`; Step 4 (`buildIndex`, line 113) assembles `index.md` and Step 6 (lines 120-124) runs synthesis passes. This is where the `--code-map` pass registers and where `## Code Map` is added.
- **Surface:** `cleargate-cli/src/wiki/scan.ts:34` — `scanRawItems` produces the typed page list and carries the `WikiPageType` (`page-schema.ts`) used as the index input set; extended to recognize the `code-map` kind.
- **Surface:** `cleargate-cli/src/wiki/synthesis/render.ts:13` — `renderTemplate`, the shared Mustache-lite renderer every synthesis pass calls; reused to render the `## Code Map` section block.
- **Surface:** `cleargate-planning/.claude/agents/architect.md:31` — the Architect "Inspect existing code" workflow step; updated to read `.cleargate/wiki/code/<package>.md` before raw source.
- **Coverage of this requirement:** ≥80% — registration, index linking, and consumption are all extensions of the existing wiki pipeline and Architect description; only the `--code-map` flag glue and the `## Code Map` section template are net-new.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/commands/wiki-build.ts` — the `wikiBuildHandler` already orchestrates scan → per-item pages → index → synthesis; the code-map pass slots in as one more guarded step and `buildIndex` gains one more section.
- **Why isn't extension / parameterization / config sufficient?** It mostly is — and that is the point: this story is deliberately the thin integration layer (a boolean flag + one index section + one agent-description edit). It cannot collapse to a pure config flag on the existing synthesis passes because (a) the code-map pages live under the `.cleargate/wiki/` suffix that `scanRawItems` explicitly excludes, so the index builder must receive an in-memory results list rather than a config toggle on the existing scan; and (b) the Architect-consumption requirement edits a separate surface (`architect.md`) outside the CLI entirely. The §6 Q1/Q7 decision also explicitly rejected a `.cleargate/knowledge/` config YAML in favor of the single `--code-map` flag, so a config-file abstraction is ruled out by design.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (depends on STORY-032-01/02 deliverables; two §1.4 open questions are kickoff-resolvable)

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the parent epic.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one verified source-tree path.
- [x] Why not simpler? has both sub-bullets answered.
