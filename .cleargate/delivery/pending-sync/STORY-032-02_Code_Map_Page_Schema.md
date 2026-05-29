---
story_id: STORY-032-02
parent_epic_ref: EPIC-032
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-32
carry_over: false
status: Draft
ambiguity: 🟡 Medium
context_source: |
  EPIC-032 decomposition at SPRINT-32 kickoff 2026-05-29; §6 answers (Q3 hard 2k
  budget, Q8 Module Graph) + STORY-033-01 spike result are inputs. ADR 2026-04-19
  (git-SHA drift, no content hashing) governs the drift field. Depends on
  STORY-032-01 (scan + skeleton extractor) for the skeleton model this page renders.
actor: cleargate wiki build
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
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
  last_gate_check: 2026-05-29T08:04:09Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-032-02-Code-Map-Page-Schema
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T08:04:09Z
  sessions: []
---

# STORY-032-02: Code-map page schema + git-SHA drift + token budget
**Complexity:** L2 — a `kind: code-map` page schema plus a renderer that enforces a hard ≤2k-token-per-package budget and per-source-file git-SHA drift.

## 1. The Spec (The Contract)

> Prior work: [[EPIC-032]] + [[STORY-033-01]] (spike) — decomposition pre-authorized at epic level.

### 1.1 User Story
As a `cleargate wiki build` operator, I want each extracted package skeleton serialized into a `kind: code-map` page with per-source-file git-SHAs and a hard ≤2k-token budget, so that drift rebuilds touch only the changed package and no page can blow the Architect's context window.

### 1.2 Detailed Requirements
- New file `cleargate-cli/src/wiki/code-map/page-schema.ts` defining a `kind: 'code-map'` page variant with `source_shas: Record<string, string>` frontmatter — one git-SHA entry per source file feeding the page (relative path → SHA).
- Reuse the existing git-SHA mechanic from `cleargate-cli/src/wiki/git-sha.ts` (`getGitSha`) per ADR 2026-04-19. No content hashing.
- New file `cleargate-cli/src/wiki/code-map/compile-page.ts` rendering the extracted skeleton (the model produced by STORY-032-01) to markdown.
- Enforce a HARD ≤2000-token-per-package budget (§6 Q3): when a rendered page exceeds the budget, drop the lowest-priority symbols, append a truncation footer `<!-- truncated: N symbols omitted -->`, and emit a stdout warning `code-map: <package> exceeded 2k budget by N tokens`. Exit code stays 0 — never silently drop without the footer + warning.
- Include a Module Graph section (top-level import-edge ASCII summary, §6 Q8) inside the page, counted against the same 2k budget (truncate the graph first if the budget is tight).
- Drift: the page stores per-source-file git-SHA in frontmatter. A scan comparing stored SHAs to current `getGitSha` output yields a per-package "stale" verdict; a mismatch on any one file marks the whole package's page for rebuild while leaving other packages' pages untouched.
- Token counting uses a deterministic estimator (e.g. char/4 or a tokenizer helper) consistently between budget-check and warning math, so the reported overrun N is reproducible.

### 1.3 Out of Scope
- The source scanner and TypeScript skeleton extractor themselves — owned by STORY-032-01 (this story consumes their output model).
- Registering the code-map pass into `cleargate wiki build` / the `--code-map` flag — owned by the build-wiring story.
- The `db_writes` extraction logic — produced by the extractor (032-01); this page only serializes whatever the skeleton model carries.
- Page-splitting into multiple files per package (§6 Q3 chose a hard cap with truncation; splitting is explicitly deferred).
- Synthesis/index linking of code-map pages and the Architect agent description edits.
- `.svelte`/`.vue` source — `.ts`/`.tsx` only per §6 Q2.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Which token estimator backs the 2k budget — a true tokenizer dependency, or the cheap `chars/4` heuristic the rest of the wiki uses?
- **Recommended:** Use the `chars/4` heuristic (zero new dep, consistent with the wiki's existing token math); expose it as a single `estimateTokens(text)` helper so it can be swapped later without touching budget logic.
- **Human decision:** _(populated during Brief review)_

- **Question:** When truncating, what is the symbol priority order (which symbols survive)?
- **Recommended:** Keep exported function/class signatures and the Module Graph first; drop exported type/interface bodies, then private/member detail, then the graph, in that order — record the order as a constant so it is auditable.
- **Human decision:** _(populated during Brief review)_

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the milestone plan).

- **Risk:** The skeleton model shape from STORY-032-01 is still in flux, so the renderer couples to an unstable interface.
- **Mitigation:** Import the skeleton type from 032-01's module rather than redeclaring it; 032-02 is `parallel_eligible: y` but gate the merge on 032-01's type being exported. If 032-01's model changes, the type-check fails loudly rather than silently mis-rendering.

- **Risk:** A genuinely large package overruns 2k even after truncation, leaving a page that is mostly a truncation footer with little signal.
- **Mitigation:** Truncation is priority-ordered (signatures + graph survive first), so the surviving content is the highest-value subset. The stdout warning surfaces the overrun magnitude so the operator can decide whether page-splitting (deferred) is warranted.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Code-map page schema, git-SHA drift, and 2k token budget

  Scenario: Serialize a skeleton into a kind:code-map page
    Given an extracted skeleton for package "cleargate-cli" with N source files
    When compile-page renders it
    Then the page frontmatter has kind: code-map
    And source_shas contains one git-SHA entry per source file feeding the page
    And the body lists exported symbols and signatures with no function bodies

  Scenario: Page within budget renders without truncation
    Given a skeleton whose rendered token estimate is under 2000
    When compile-page renders it
    Then the body contains no truncation footer
    And no stdout warning is emitted

  Scenario: Module Graph appears inside the page
    Given a skeleton with top-level import edges between modules
    When compile-page renders it
    Then the page body contains a Module Graph ASCII import-edge summary
    And the Module Graph is counted against the 2000-token budget

  Scenario: Drift rebuilds only the changed package
    Given a code-map page whose source_shas match current git-SHAs except one file
    When the drift check runs over all packages
    Then only that package's page is marked stale for rebuild
    And every other package's page is reported unchanged

  Scenario: Over-budget skeleton truncates, warns, and exits 0 (error/edge)
    Given a skeleton whose rendered token estimate exceeds 2000 by N tokens
    When compile-page renders it
    Then the body ends with the footer "<!-- truncated: N symbols omitted -->"
    And stdout warns "code-map: cleargate-cli exceeded 2k budget by N tokens"
    And the process exit code is 0
    And no symbols are dropped silently without the footer
```

### 2.2 Verification Steps (Manual)
- [ ] Render a small package skeleton and confirm `kind: code-map` + one `source_shas` entry per source file in the frontmatter.
- [ ] Edit one source file, re-run the drift check, and confirm only that package's page is reported stale.
- [ ] Feed an oversized synthetic skeleton and confirm the `<!-- truncated: N symbols omitted -->` footer, the stdout warning, and exit code 0.
- [ ] Confirm a Module Graph block is present in a multi-module package page and absent for a single-module package.
- [ ] Confirm `getGitSha` from `git-sha.ts` is the SHA source (no content-hash call introduced).

## 3. The Implementation Guide

### 3.1 Context & Files

> **v2 gate input:** under v2 execution mode, this table is a pre-commit gate input (cleargate-enforcement.md §6). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows are ignored by the parser.

| Item | Value |
|---|---|
| Primary File (new) | `cleargate-cli/src/wiki/code-map/page-schema.ts` |
| Primary File (new) | `cleargate-cli/src/wiki/code-map/compile-page.ts` |
| Related File (extend) | `cleargate-cli/src/wiki/page-schema.ts` |
| Related File (reuse) | `cleargate-cli/src/wiki/git-sha.ts`, `cleargate-cli/src/wiki/scan.ts` |
| New Files Needed | Yes — `cleargate-cli/src/wiki/code-map/page-schema.ts`, `cleargate-cli/src/wiki/code-map/compile-page.ts` |
| Test Files (new) | `cleargate-cli/src/wiki/code-map/compile-page.node.test.ts`, `cleargate-cli/src/wiki/code-map/page-schema.node.test.ts` |

### 3.2 Technical Logic
- `page-schema.ts`: declare a `CodeMapPage` interface extending the wiki page shape with `kind: 'code-map'` and `source_shas: Record<string, string>`. Provide `serializeCodeMapPage(page, body)` / `parseCodeMapPage(raw)` mirroring the existing `serializePage`/`parsePage` pair in `cleargate-cli/src/wiki/page-schema.ts` so YAML emission stays consistent. Provide a `driftCheck(page, runner?)` that walks `source_shas`, calls `getGitSha(file, runner)` per file, and returns `{ stale: boolean, changed: string[] }` — stale if any current SHA differs from the stored one. The optional `runner` mirrors `git-sha.ts`'s `GitRunner` injection so tests are hermetic.
- `compile-page.ts`: input is the extracted skeleton model from STORY-032-01. Steps: (1) render frontmatter via the page-schema serializer, populating `source_shas` from `getGitSha`; (2) render the body — exported signatures, then the Module Graph ASCII import-edge summary; (3) run `estimateTokens(body)`; (4) if over 2000, drop symbols in the documented priority order until under budget, append `<!-- truncated: N symbols omitted -->`, and `console.warn('code-map: <package> exceeded 2k budget by N tokens')`; never throw, never `process.exit(non-zero)`. Return the full page string.
- Budget math: `N` in the footer is the count of omitted symbols; `N` in the warning is the token overrun before truncation. Keep both deterministic via the single `estimateTokens` helper.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | serialize/parse round-trip, drift-check stale vs unchanged, in-budget render, Module-Graph presence, token estimator determinism |
| E2E / acceptance tests | 5 | 1 per Gherkin scenario in §2.1, including the over-budget truncation+warning+exit-0 edge case |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met via `*.node.test.ts` files run under `tsx --test`.
- [ ] All Gherkin scenarios from §2.1 covered, including the over-budget edge scenario.
- [ ] `source_shas` populated exclusively via `getGitSha` from `git-sha.ts` (no content hashing introduced).
- [ ] Hard 2k budget enforced with footer + stdout warning + exit 0 (no silent drops).
- [ ] `npm run typecheck` clean and `npm test` green for `cleargate-cli`.
- [ ] Peer/Architect review passed.

## Existing Surfaces

> L1 reuse audit. The page-schema serializer and the git-SHA drift mechanic are reused verbatim; only the code-map variant + renderer/budget are net-new.

- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:11` — `WikiPage` interface, `WikiPageType` union, and `serializePage`/`parsePage` (lines 35, 77). The `kind: code-map` variant extends this and the new serializer mirrors this YAML emission.
- **Surface:** `cleargate-cli/src/wiki/git-sha.ts:10` — `getGitSha(rawPath, runner?)` with injectable `GitRunner`. This is the exact drift-SHA source reused for `source_shas` per ADR 2026-04-19.
- **Surface:** `cleargate-cli/src/wiki/scan.ts:34` — `scanRawItems(deliveryRoot, repoRoot)` and the `RawItem` shape (line 8); the canonical git-SHA-based drift scan pattern this story follows for per-package staleness.
- **Coverage of this requirement:** partial — the serialization and git-SHA drift surfaces cover ≈40% of the work (serializer shape + SHA helper reused directly); the net-new ≈60% is the `kind: code-map` schema variant plus the renderer, 2k budget enforcement, truncation, and Module Graph.

## Why not simpler?

- **Smallest existing surface that could carry this:** `cleargate-cli/src/wiki/page-schema.ts` — adding a `code-map` member to `WikiPageType` and reusing `serializePage`/`parsePage` carries the schema half.
- **Why isn't extension / parameterization / config sufficient?** The schema half is genuinely an extension and is done that way. The renderer half is not: `serializePage` emits a frontmatter+body string with no concept of a token budget, priority-ordered truncation, a `<!-- truncated -->` footer, an over-budget stdout warning, or a Module Graph ASCII summary. Those are new control flow over a new input shape (the 032-01 skeleton model, not a markdown page), so `compile-page.ts` and the `source_shas`/`driftCheck` additions in `page-schema.ts` cannot be expressed as a flag on the existing serializer.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (depends on STORY-032-01's skeleton model export; two §1.4 questions carry recommended answers pending Brief sign-off)

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved epic.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path (page-schema.ts, git-sha.ts, scan.ts — all confirmed on disk).
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
