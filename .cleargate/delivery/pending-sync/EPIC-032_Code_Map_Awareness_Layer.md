---
epic_id: EPIC-032
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
ambiguity: 🟡 Medium
context_source: |
  user-direct-epic-waiver — conversation 2026-05-28 (Repo Prompt "Code Maps" analysis;
  user: "path B please. write the epic"). Planning-layer wiki extension. §6 fully
  answered 2026-05-29 (all 9 questions); design generalized to package/schema discovery
  so the feature works for any repo consuming ClearGate, not just this meta-repo.
proposal_gate_waiver: true
proposal_gate_waiver_reason: |
  Direct user ask with sharp intent ("path B please. write the epic") + inline reference
  to Repo Prompt Code Maps and the existing wiki pipeline. Recorded per memory
  feedback_proposal_gate_waiver.md.
area: wiki
owner: Sandro
target_date: TBD
created_at: 2026-05-28T00:00:00Z
updated_at: 2026-05-28T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-29T09:19:11Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-032
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-29T09:19:10Z
  sessions: []
---

# EPIC-032: Code-Map Awareness Layer for Execution Agents

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Emit a token-budgeted structural skeleton (exports + signatures + module relationships) of each TypeScript package into .cleargate/wiki/code/&lt;package&gt;.md, refreshed by the existing wiki compile pipeline, so Architect/Developer agents read structure once per dispatch instead of re-grepping source.</objective>
  <architecture_rules>
    <rule>Reuse the existing wiki compile pipeline (cleargate-cli/src/wiki/**) — code-map is a new bucket/synthesis pass, not a parallel system.</rule>
    <rule>Drift detection uses git-SHA per ADR locked 2026-04-19 (same as work-item ingest). No content hashing.</rule>
    <rule>No new runtime dependency in target repos beyond what `tsc` already provides. Extractor uses the raw TypeScript Compiler API (`ts.createProgram`); ts-morph is REJECTED (§6 Q4, resolved 2026-05-29).</rule>
    <rule>No PM-tool SDK imports (EPIC-027 boundary).</rule>
    <rule>Code-map is advisory context for agents — must never be treated as source of truth. Code wins on conflict; the map rebuilds.</rule>
    <rule>GENERAL-PURPOSE (ClearGate ships to many repos): the extractor DISCOVERS packages by walking for `tsconfig.json` roots (fallback `package.json`) and discovers DB-schema vocabulary by scanning for modules that define `pgTable(...)` — NEVER hardcode the cleargate-cli/mcp/admin layout or a fixed schema path. This meta-repo's three packages are merely what discovery finds here. (§6 Q1, resolved 2026-05-29.)</rule>
    <rule>Emit a per-module db_writes:{tables[],schema_ddl} set (live pgTable vocabulary discovered by scanning for modules that define `pgTable(...)` — never a hardcoded table list AND never a hardcoded schema path) to feed EPIC-033's two-axis wave planner. This is the ONLY EPIC-033-driven addition here; the per-STORY db_write_set frontmatter field + the Architect SDR DB axis are owned by EPIC-033, not this epic.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/wiki/code-map/scan-source.ts" action="create" />
    <file path="cleargate-cli/src/wiki/code-map/extract-skeleton.ts" action="create" />
    <file path="cleargate-cli/src/wiki/code-map/compile-page.ts" action="create" />
    <file path="cleargate-cli/src/wiki/code-map/page-schema.ts" action="create" />
    <file path="cleargate-cli/src/commands/wiki-build.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/scan.ts" action="modify" />
    <file path="cleargate-planning/.claude/agents/architect.md" action="modify" />
    <file path=".cleargate/wiki/code/" action="create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
The Architect agent currently rediscovers source structure on every dispatch — grep + read raw files — burning ~5–15k input tokens per milestone plan and producing plans that vary in grounding quality across runs. ClearGate already compiles a *work-item* awareness layer (`.cleargate/wiki/index.md`, ~3k tokens); the *code* equivalent does not exist. Repo Prompt's "Code Maps" demonstrated that a structural skeleton (signatures, exports, types) is the highest-leverage token-cheap input you can give a planning model. This epic gives ClearGate the same lever, native, shipped with the scaffold.

**Success Metrics (North Star):**
- Architect dispatch input tokens reduce ≥30% on plans touching ≥3 files (measured against SPRINT-30/31 baseline in token-ledger).
- Code-map page ≤2k tokens per package; full ClearGate monorepo (cleargate-cli + mcp + admin) ≤6k tokens combined.
- `cleargate wiki build` full rebuild ≤10s on a 50k-LOC TypeScript repo.
- Architect plan-grounding error rate (M-plan referencing files that don't exist) drops to zero across one full sprint.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Per-package TypeScript skeleton extractor: exports, public types, function/class signatures (no bodies).
- [ ] Module-relationship summary per package: which modules import which (top-level only).
- [ ] New wiki bucket `.cleargate/wiki/code/<package>.md` with `kind: code-map` page schema.
- [ ] `cleargate wiki build` registers the code-map pass; idempotent on git-SHA match.
- [ ] Synthesis pass links code-map pages from `.cleargate/wiki/index.md`.
- [ ] Architect agent description updated to read code-map for in-scope packages before reading raw source.
- [ ] **Per-module DB write-set (for EPIC-033 wave planning):** emit `db_writes: { tables: string[], schema_ddl: boolean }` per module — drizzle `.insert/.update/.delete/.onConflictDoUpdate` on imported `pgTable` symbols (vocabulary discovered LIVE by scanning for modules that define `pgTable(...)`, never hardcoded and never a fixed schema path) + raw `INSERT/UPDATE/DELETE` string-literal scan for `pg.Pool` writers; `schema_ddl: true` on edits to `schema.ts` or migration files. One incremental AST visitor on the existing `ts.createProgram` pass — no new file, no new dependency.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Non-TypeScript languages (Python/Go/Rust/Svelte template syntax — Svelte `.svelte` script blocks may be in scope but defer to a Q in §6).
- Runtime call graphs or dynamic-dispatch resolution.
- Semantic search / embedding / RAG over source.
- Cross-repo source mapping (the three deploy targets stay independent).
- Replacing grep — code-map is a *first pass*, not a replacement.
- A GUI / file picker in the spirit of Repo Prompt's macOS app. Out forever — ClearGate is a CLI/scaffold.
- Apply-edit / patch-merge tooling (Claude Code's Edit tool already covers this).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | Full rebuild ≤10s for the meta-repo; incremental rebuild (single source file changed) ≤500ms. |
| Drift | Per-source-file git-SHA stored in page frontmatter; mismatch triggers rebuild of that package only. |
| Token budget | ≤2k tokens per package page; emit a truncation warning if over budget rather than silently dropping symbols. |
| Dependency cost | Zero new runtime deps in target repos. `tsc` Compiler API is already transitively available via TypeScript itself. ts-morph requires explicit §6 justification before adoption. |
| Boundary | No PM-tool SDK imports (EPIC-027). No code-map page can reference PM-tool internals. |
| Reliability | Missing `tsconfig.json` in a package → skip that package with a warning, exit 0. Build never fails on source it can't parse. |
| Trust | Code-map is advisory. If Architect/Developer hits a contradiction between map and source, the source wins and the map gets flagged for rebuild. |

## Existing Surfaces

> L1 reuse audit. Wiki pipeline is reused; only the source-extraction layer is net-new.

- **Surface:** `cleargate-cli/src/wiki/scan.ts` — wiki page scanner with git-SHA drift detection (the canonical drift mechanic per ADR 2026-04-19).
- **Surface:** `cleargate-cli/src/wiki/synthesis/` — synthesis page compiler (currently emits index, active-sprint, product-state, roadmap). Code-map is a new synthesis target with the same shape.
- **Surface:** `cleargate-cli/src/commands/wiki-build.ts` — `cleargate wiki build` entrypoint. Code-map registers as a new pass alongside ingest + synthesis.
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts` — page-schema definitions. Extend with `kind: code-map`.
- **Surface:** `cleargate-cli/src/wiki/derive-repo.ts` — multi-repo `repo:` tag derivation (per SPRINT-04 adaptation). Code-map pages get the same `repo:` tag.
- **Surface:** `cleargate-planning/.claude/agents/architect.md` — the Architect agent description. Becomes the canonical consumer; live mirror at `/.claude/agents/architect.md` must be re-synced after edit (dogfood split per CLAUDE.md).
- **Coverage of this epic's scope:** ≥80% extension of the wiki pipeline. The genuinely net-new piece is the TypeScript source scanner + skeleton extractor (≤20% of LOC).

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `cleargate-cli/src/wiki/synthesis/` — add a `code-map` synthesis pass. Pipeline, drift detection, page emission, index linking, ingest hook integration are all reused.
- **Why isn't extension / parameterization / config sufficient?** The synthesis pipeline today reads from `.cleargate/wiki/*.md` (already-ingested work-item pages) and recompiles aggregations. Source files are not in that input set — they live under `cleargate-cli/src/**`, `mcp/src/**`, `admin/src/**`. A scanner that walks source trees + extracts TypeScript skeleton signatures via the tsc Compiler API is genuinely net-new code (~3 files, ~400 LOC estimated). It cannot be expressed as a config flag on the existing synthesis pass because the input shape (TS AST nodes) differs from the input shape today (markdown frontmatter). Everything downstream of the extractor — page schema, drift detection, index linking, agent consumption — is config/extension on existing surfaces.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `cleargate-cli/src/wiki/code-map/scan-source.ts` (create) — walk `<package>/src/**/*.{ts,tsx}` honoring tsconfig `include`/`exclude`.
- `cleargate-cli/src/wiki/code-map/extract-skeleton.ts` (create) — use `ts.createProgram` (TypeScript Compiler API) to extract: top-level exports, exported function signatures, exported class declarations (members + visibility), exported type/interface declarations, import edges. No bodies. **Also emit per-module `db_writes: { tables: string[], schema_ddl: boolean }`** (one extra AST visitor on the same program; for EPIC-033's wave planner — see §2 IN-SCOPE).
- `cleargate-cli/src/wiki/code-map/compile-page.ts` (create) — render extracted skeleton to markdown; enforce ≤2k token budget; emit truncation footer if exceeded.
- `cleargate-cli/src/wiki/code-map/page-schema.ts` (create) — `kind: code-map` page schema with `source_shas: { <file>: <git-sha> }` frontmatter.
- `cleargate-cli/src/commands/wiki-build.ts` (modify) — register code-map pass; flag `--skip-code-map` for fast iteration.
- `cleargate-cli/src/wiki/scan.ts` (modify) — extend page-kind enum; include `wiki/code/**` in index synthesis input set.
- `cleargate-cli/src/commands/wiki-build.ts` → `buildIndex()` (modify) — add `## Code Map` section linking per-package pages. NB: the index page is assembled in `buildIndex()` (`wiki-build.ts:172`); there is no separate `synthesis/index.ts` (`synthesis/render.ts` is a generic template engine, not the index emitter).
- `cleargate-planning/.claude/agents/architect.md` (modify) — prepend instruction: "Read `.cleargate/wiki/code/<package>.md` for any package named in the milestone scope before reading raw source. Code-map is advisory; verify with Read/Grep when planning a non-trivial change."
- `cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` (modify — auto-mirror via `npm run prebuild`).
- `.cleargate/wiki/code/cleargate-cli.md` (create — first ingest run produces this).
- `.cleargate/wiki/code/mcp.md` (create — produced by first ingest run).
- `.cleargate/wiki/code/admin.md` (create — produced by first ingest run; `.ts`/`.tsx`-only per §6 Q2, `.svelte` `<script>` blocks deferred).

**Data Changes:**
- New wiki bucket directory `.cleargate/wiki/code/`.
- New `kind: code-map` variant in `wiki/page-schema.ts`.
- New frontmatter field `source_shas: Record<string, string>` for per-file drift detection.
- New per-module `db_writes: { tables: string[], schema_ddl: boolean }` field in the code-map page (consumed by EPIC-033's two-axis wave planner; absent today).

## 5. Acceptance Criteria

```gherkin
Feature: Code-Map Awareness Layer

  Scenario: First-time build emits one code-map page per package
    Given a fresh checkout with no .cleargate/wiki/code/ directory
    When the operator runs `cleargate wiki build`
    Then a file .cleargate/wiki/code/cleargate-cli.md exists
    And it has frontmatter kind: code-map and source_shas covering every TS file under cleargate-cli/src
    And its body lists exported symbols + signatures, no function bodies
    And its rendered token count is ≤ 2000

  Scenario: Idempotent rebuild on unchanged source
    Given .cleargate/wiki/code/cleargate-cli.md exists and matches source git-SHAs
    When the operator runs `cleargate wiki build` again
    Then the page file mtime is unchanged
    And stdout reports `code-map: cleargate-cli unchanged`

  Scenario: Incremental rebuild on single source-file change
    Given .cleargate/wiki/code/cleargate-cli.md is up-to-date
    When the developer edits cleargate-cli/src/commands/wiki-build.ts and re-runs build
    Then only cleargate-cli.md is rewritten (mcp.md, admin.md untouched)
    And source_shas for wiki-build.ts in the page frontmatter matches `git hash-object` of the new file
    And the rebuild completes in ≤ 500ms

  Scenario: Architect dispatch consumes code-map first
    Given a Story milestone names files in cleargate-cli/src/wiki/**
    When the orchestrator dispatches the Architect agent
    Then the dispatch context includes the contents of .cleargate/wiki/code/cleargate-cli.md
    And the Architect plan output cites file:line references that resolve in the actual source tree

  Scenario: Token-budget overrun emits truncation warning
    Given a package whose extracted skeleton exceeds 2000 tokens
    When wiki build emits its code-map page
    Then the page body ends with `<!-- truncated: N symbols omitted -->`
    And stdout warns `code-map: <package> exceeded 2k budget by N tokens`
    And exit code is 0

  Scenario: Missing tsconfig is skipped, not fatal
    Given a directory under packages/ with no tsconfig.json
    When wiki build runs
    Then that directory is skipped with a warning
    And other packages still produce code-map pages
    And exit code is 0

  Scenario: Code-map advisory boundary
    Given a code-map page lists `export function foo()` but the source file no longer exports foo
    When the Architect plans a change touching that file
    Then the Architect verifies via Read/Grep before citing foo in the plan
    And the code-map page is queued for rebuild on the next ingest pass

  Scenario: Unparseable source file logs an Error and is skipped, not fatal
    Given a TypeScript file under cleargate-cli/src that fails to parse (syntax error)
    When wiki build extracts that package's skeleton
    Then stdout logs `code-map: parse Error in <file> — symbols from this file omitted`
    And the package page is still emitted from the files that parsed cleanly
    And the build exit code is 0
```

## 5.5 Story Breakdown (phased)

| Story | Title | Lane | Depends on | Mode / Milestone |
|---|---|---|---|---|
| STORY-032-01 | TS skeleton extractor (exports/signatures/import-edges + `db_writes`) | standard | none | v2 / M1 |
| STORY-032-02 | Code-map page schema + git-SHA drift detection + 2k token budget | standard | none | v2 / M2 |
| STORY-032-03 | wiki-build integration + synthesis/index linking + Architect consumption | standard | STORY-032-01, STORY-032-02 | v2 / M2 |

> STORY-032-01 and STORY-032-02 touch disjoint surfaces (extractor vs. page schema) and are a single file-disjoint wave; STORY-032-03 integrates both and sequences after. See SPRINT-32 §2 for the cross-epic merge order against EPIC-033.

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** "Which packages get code-mapped in the first ship — only `cleargate-cli/`, all three (cleargate-cli + mcp + admin), or configurable per repo via a new field in `.cleargate/knowledge/`?"
  - **Human Answer (2026-05-29):** ALL discovered packages, with clear per-package separation (one page each). **Generalize — no hardcoded list:** the extractor DISCOVERS packages by walking for `tsconfig.json` roots (fallback `package.json`), because ClearGate ships to many repos with arbitrary layouts; in this meta-repo discovery yields `cleargate-cli`, `mcp`, `admin`. No `.cleargate/knowledge/` config knob. Code-map pages are repo-local wiki artifacts and are NEVER PM-synced — the whole `.cleargate/wiki/**` is a committed derived cache, not pushed to Linear/Jira.

- **AI Question:** "`admin/` is SvelteKit. Do we extract skeleton from `.svelte` `<script>` blocks (requires a Svelte preprocessor pass), or scope admin code-map to plain `.ts` files only and skip `.svelte` for v1?"
  - **Human Answer (2026-05-29):** `.ts`/`.tsx` only for v1; skip `.svelte` `<script>` blocks (no preprocessor pass). Generic rule for any consuming repo: extract `.ts`/`.tsx`; `.svelte`/`.vue`/etc. deferred.

- **AI Question:** "Token budget: a hard 2k-per-package cap with truncation, or split large packages into multiple pages (`code/cleargate-cli.commands.md`, `code/cleargate-cli.wiki.md`, etc.) with no cap?"
  - **Human Answer (2026-05-29):** Hard 2k-per-package cap with a truncation footer + stdout warning (per §3). Revisit page-splitting only if a real package overruns.

- **AI Question:** "TypeScript Compiler API (`ts.createProgram`) is built into the `typescript` package already on disk. ts-morph is a higher-level wrapper, +~700kb. Stick with raw Compiler API, or accept the ts-morph dep for extractor readability?"
  - **Human Answer (2026-05-29):** Raw TypeScript Compiler API (`ts.createProgram`) — zero new runtime dep is a hard §3 constraint. No ts-morph. (Decided jointly with Q9: the import-symbol flow for `db_writes` is tractable on the raw API.)

- **AI Question:** "Should code-map run on every `cleargate wiki build` by default, or be opt-in via `--code-map` flag for the first sprint while we tune the extractor? (Default-on is the wiki pattern; opt-in is the safer rollout.)"
  - **Human Answer (2026-05-29):** Opt-in via `--code-map` for this first sprint while the extractor is tuned; flip to default-on (the wiki pattern) at sprint close once stable.

- **AI Question:** "Architect dispatch shape: append the code-map page to existing dispatch context as another input file, or restructure dispatch into a layered context (work-items → code-map → raw source) with explicit token budgets per layer?"
  - **Human Answer (2026-05-29):** Append the code-map page to existing dispatch context as another input file for v1. The layered-context restructure (work-items → code-map → raw source, per-layer budgets) is a separate future refactor.

- **AI Question:** "For target repos consuming `cleargate init`: code-map default-on, off, or driven by a new `.cleargate/knowledge/code-map.config.yaml`?"
  - **Human Answer (2026-05-29):** Off by default in target repos; opt-in via the same `--code-map` flag (no config YAML — consistent with the "no knowledge/ knob" decision in Q1). Avoids surprising a consuming repo with an unrequested tsc scan; flip to default-on later once proven across repos.

- **AI Question:** "Should the code-map page include a *Module Graph* (top-level import edges) ASCII summary, or just per-file exports? Graph adds ~20% to page size for arguably high planning value."
  - **Human Answer (2026-05-29):** Include the Module Graph (top-level import-edge ASCII summary). High planning value and it feeds EPIC-033's file-surface/collision axis; the ~20% page-size cost stays within the 2k cap (truncate per Q3 if needed).

- **AI Question:** "DB write-set extraction (for EPIC-033): drizzle `.insert/.update/.delete` on imported `pgTable` symbols is exact, but raw-SQL `INSERT/UPDATE/DELETE` string-literal scanning (cleargate-cli's `pg.Pool` writers) is heuristic and misses dynamically-built table names. Accept the heuristic + EPIC-033's fail-safe-serialize-on-unknown, or scope `db_writes` to drizzle-only (mcp) for v1? (Also: the ts-morph-vs-raw-Compiler-API choice above should be decided WITH this import-symbol-flow requirement in mind — ts-morph eases it.)"
  - **Human Answer (2026-05-29):** Accept the heuristic raw-SQL scan + EPIC-033's fail-safe-serialize-on-unknown (a story whose `db_writes` can't be resolved is serialized, never parallelized — an incomplete map stays correct, just conservative). **Generalize the schema-vocabulary source:** discover drizzle schema modules by pattern (any file defining `pgTable(...)`), not a hardcoded `mcp/src/db/schema.ts` path — a consuming repo's schema lives wherever it lives. Raw Compiler API confirmed (Q4); the import-symbol flow is tractable without ts-morph.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (§6 resolved 2026-05-29; remaining open items are kickoff-time: §4 path re-verification + 0-TBD sweep)

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal document has `approved: true`.
  - *Substitution surfaced in Brief:* no proposal exists; epic was directly authorized by user 2026-05-28 ("path B please. write the epic") per memory rule `feedback_proposal_gate_waiver.md`. Context_source frontmatter records the waiver.
- [x] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths.
- [x] §6 AI Interrogation Loop answered — all 9 questions integrated 2026-05-29 (Q/A retained for audit).
- [ ] 0 "TBDs" exist in the document.
- [x] Existing Surfaces cites verified source-tree paths (wiki/scan.ts, wiki/synthesis/, commands/wiki-build.ts, wiki/page-schema.ts, wiki/derive-repo.ts, architect.md — all confirmed on disk).
- [x] Why not simpler? — both sub-bullets answered.
