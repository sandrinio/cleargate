---
epic_id: EPIC-053
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-36"
carry_over: false
status: Draft
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-08-06T00:00:00Z
ambiguity: 🟢 Low
context_source: "direct-human-ask 2026-08-06 — owner clarified the target: \"under db i mean that when cleargate runs in a user's repo, they will have db for their product. i thought that we need to be checking that dependency when planning the sprint.\" Proposal gate waived per ~/.claude memory feedback_proposal_gate_waiver.md: sharp intent, and the scope was narrowed live across two investigation rounds. Grounded against source read directly this session, not inferred: .cleargate/templates/story.md:70 (the fail-open default), cleargate-cli/src/wiki/code-map/extract-skeleton.ts:250,265 (extractDbWrites + the DRIZZLE_WRITE_METHODS false-positive set), and .cleargate/sprint-runs/SPRINT-36/plans/waves.json (wave2 co-waved STORY-047-02 at parallel:true despite a non-empty db_write_set). Two multi-agent verification workflows informed this epic; four of five finders in the second were disputed on adversarial review, so every load-bearing claim below was re-verified by hand and only hand-verified claims are stated as fact."
owner: sandrinio
target_date: 2026-10-15
area: cli,templates,agents,config
created_at: 2026-08-06T00:00:00Z
updated_at: 2026-08-06T00:00:00Z
created_at_version: 0.23.0
updated_at_version: 0.23.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-06T10:27:47Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-053
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-06T10:27:47Z
  sessions: []
---

# EPIC-053: Downstream DB Collision Detection — Fail-Safe by Default, Derived Not Declared

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make the wave planner's DB-collision axis fail SAFE instead of open, and populate it by derivation from the repo rather than by author declaration, for downstream repos on any stack.</objective>
  <architecture_rules>
    <rule>Polarity first, derivation second. WS1 (fail-safe) must land before or with WS2-WS5. Shipping derivation onto an axis that still fails open delivers a detector nobody can trust.</rule>
    <rule>Absent MUST be distinguishable from empty. `db_write_set: []` means "a detector ran and found nothing"; absent/null means "no evidence" and MUST serialize. Never collapse the two.</rule>
    <rule>Detection is a LADDER and every rung is optional. L0 path globs must work with zero parser and zero TypeScript. Never make a downstream repo's protection depend on the TS compiler being resolvable.</rule>
    <rule>Do NOT connect to a live database. All detection is static — file paths and source text only. No credentials, no introspection, no runtime.</rule>
    <rule>Do NOT build an ORM plugin/adapter system. A config-driven glob list plus a flat regex table covers the stacks; an extension framework is unwarranted.</rule>
    <rule>Templates, agent prompts, scripts, and config edited under .cleargate/ or .claude/ MUST be mirrored to cleargate-planning/ in the same commit — canonical edits do not auto-propagate. See the Dogfood split rule in CLAUDE.md.</rule>
    <rule>Wave ORDER (leading vs trailing placement of serialized stories) is out of scope — that is a separate change. This epic decides only WHETHER stories may co-wave.</rule>
  </architecture_rules>
  <target_files>
    <file path=".cleargate/templates/story.md" action="modify" />
    <file path=".claude/agents/architect-reader.md" action="modify" />
    <file path=".claude/agents/architect-synth.md" action="modify" />
    <file path=".cleargate/config.yml" action="modify" />
    <file path=".cleargate/scripts/collision_surface.sh" action="modify" />
    <file path="cleargate-cli/src/wiki/code-map/extract-skeleton.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/code-map/page-schema.ts" action="modify" />
    <file path="cleargate-cli/src/wiki/code-map/compile-page.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**

ClearGate is installed into other teams' repos, and those repos have a real product database. The wave planner has a dedicated DB-collision axis (clause 4) precisely because two stories can write the same table from **different files** — one adds a migration, another adds a query module — leaving their file surfaces disjoint so clause 2 clears them to run concurrently. In a repo whose tests run against real infrastructure with no mocks, concurrent worktrees share **one** development database. That is a corruption path, not a theoretical one: [[BUG-035]] in this repo is a systemic cross-file FK seed race (Postgres 23503).

Three verified facts make this a live hole rather than a rough edge:

1. **The axis fails open.** `.cleargate/templates/story.md:70` ships `db_write_set: []` documented as *"default `[]` = no DB collision contribution; absent treated as `[]`"*. Empty is read as **proven DB-free**. This is the exact `∅ ∩ ∅ = ∅` inference that [[BUG-033]] outlawed on the file axis — where `architect-synth.md:48` insists *"An empty surface is unproven, not proven-disjoint"*. Every other clause fails closed. This one does not.
2. **Nothing populates it.** The value is hand-written by the story author. In a fresh downstream repo it is `[]` on every story, forever, and the clause is satisfied by construction.
3. **Declaring it correctly still conferred no protection.** `.cleargate/sprint-runs/SPRINT-36/plans/waves.json` wave 2 co-waved `STORY-047-02` — `db_write_set: ["pairings","app_tokens"]` — with `STORY-047-04` at `"parallel": true`. The rationale shows the planner saw the DB writes (*"pairings/app_tokens DML … No shared source file"*) and cleared them on file-surface grounds, contradicting the fail-safe rule at `architect-synth.md:59`.

The author did everything right and got nothing. A downstream team that never heard of the field gets less.

**Success Metrics (North Star):**

- **M1 — Fail-safe:** a story with no DB evidence is never co-waved. Absence produces serialization, and the wave rationale names the reason.
- **M2 — Stack-agnostic floor:** a repo with no TypeScript at all (Rails, Django, Go, Java) receives working DB-collision protection through configuration alone, with no parser.
- **M3 — Derived, not declared:** for repos where a detector applies, `db_write_set` is computed from the repo rather than typed by the author; a story author writing nothing still gets correct classification.
- **M4 — Bounded false positives:** the derived classifier does not flag non-database code. Concretely: zero `createHash(...).update(...)` sites classified as DB writes (6 such sites exist in `mcp/src/` today under the current logic).
- **M5 — Enforced, not advised:** a `waves.json` that co-waves two stories with overlapping or unproven DB evidence is rejected by an executable check, not merely discouraged by prompt text.
- **M6 — Parallelism preserved:** after the polarity flip plus detection, a representative sprint retains a comparable wave count to today. Fail-safe without derivation would serialize everything — correct and useless; this metric is what stops that.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**

- [ ] **WS1 — Polarity flip: absent ≠ empty (the MVP, ships value alone).** Introduce a third state. `null`/absent = **no evidence → serialize**; `[]` = a detector affirmatively found nothing → proven DB-free; a non-empty list = intersect. Update `.cleargate/templates/story.md:70` so the shipped default no longer asserts DB-freedom, `architect-reader.md:34` so it emits `null` rather than defaulting absent to `[]`, and `architect-synth.md` clause 4 + the fail-safe rule so unproven DB evidence serializes and the rationale names it. Mirror all three. **This workstream alone converts a silent fail-open into a loud fail-safe.**

  **Rollout is advisory-first (D1).** For one release the flip reports rather than blocks: unproven stories are named loudly in the SDR output and the wave rationale, but co-waving is not prevented. It flips to enforcing in the following release. Rejected: enforcing immediately (strands every installed repo until it configures globs) and enforcing-only-when-`db:`-is-present (absence would again be read as "no database" — the very fail-open being removed). Per [[EPIC-043]] WS8, a gate people switch off is worse than no gate; the advisory release is what earns the enforcing one.

  **Clause 4 unknown-table rule (D4).** A write resolving to a dynamic or unknown table **collides with every other DB-touching story**, not merely with itself. An unknown table cannot be proven disjoint from any known one — identical reasoning to [[BUG-033]]'s empty-surface guard.

- [ ] **WS2 — L0 detection: config-driven path globs.** New top-level `db:` key in `.cleargate/config.yml` (today the file has only `wiki:`, `gates:`, `worktree:`) carrying `schema_globs`. **The default list is the BROAD one (D2)** — protecting more teams out of the box beats avoiding occasional over-serialization, because over-serialization is the safe failure direction (`collision_surface.sh:78-79`) while under-detection corrupts a shared database:

  ```
  **/migrations/**          **/migrate/**            **/migration/**        **/Migrations/**
  prisma/schema.prisma      prisma/migrations/**     db/schema.rb           alembic/versions/**
  priv/repo/migrations/**   **/db/changelog/**       **/changelog*.xml      **/entities/**
  **/entity/**              **/models.py             **/*.migration.*       **/schema.sql
  ```

  Case matters: `**/Migrations/**` is listed separately for EF Core because globs are case-sensitive, and `**/migration/**` separately from `**/migrate/**` because Flyway uses the singular. **A bare `**/*.sql` is deliberately excluded** — it sweeps in seed data, fixtures, and analytics queries, which would serialize nearly everything in a SQL-heavy repo. A story whose §3.1 file surface matches any glob is DB-touching. **This is the only rung that works without a parser, the only one that works on non-TypeScript repos, and the only one that can classify a migration file that does not exist yet** (see WS4). Ships in the payload config so downstream repos get it by default.

- [ ] **WS3 — L1 detection: cross-language signature grep.** A flat regex table applied to the story's declared files regardless of language: `pgTable(`/`mysqlTable(`/`sqliteTable(`, `model \w+ {` in `.prisma`, `ActiveRecord::Migration`, `create_table`, `@Entity`, `CREATE TABLE`, Django `class Meta:` + `db_table`. Yields a DB-touch boolean plus best-effort table names. No compiler required.

  **Confirmed in scope (D6).** L1 is what preserves parallelism on non-TypeScript repos: without table names a Rails or Django team gets only a DB-touching boolean, so every DB story serializes against every other and M6 fails there. It remains the first workstream to cut if scope must shrink later.

- [ ] **WS4 — L2 detection: persist and repair the existing TS pass.** `extractDbWrites` (`cleargate-cli/src/wiki/code-map/extract-skeleton.ts:250,268`) already computes `{tables, schema_ddl}` per module and stores it on the skeleton (`:54,:257`) — then `page-schema.ts` and `compile-page.ts` discard it entirely (verified: zero references in either file). Persist it into `CodeMapPage`, **and fix two defects first**: (a) `DRIZZLE_WRITE_METHODS` (`:265`) contains `update`, so any `.update(x)` on any receiver is classified as a DB write — `createHash('sha256').update(data)` included, 6 sites in `mcp/src/` today; (b) `resolvePgTableArg` returns `'<dynamic>'` on every path, so the `!== null` guard downstream never filters. Shipping the current output unrepaired would be worse than shipping nothing.

  **Repair method (D3): require the first argument to resolve to a known `pgTable` symbol before recording a write, reinforced by a receiver check that the call target resolves to a Drizzle database handle.** One change fixes both defects — it eliminates `createHash('sha256').update(data)` outright and simultaneously revives the `resolvePgTableArg` null contract that is dead code today. Rejected: dropping `update` from the set, which would lose genuine `db.update(table)` detection.

  **Persistence target (D7): a separate compact machine-readable artifact** that the SDR reads, with a one-line summary on the code-map page. The code-map page is human-facing and token-budgeted; a per-file table map belongs beside it, not inside it.

- [ ] **WS5 — Join detection to the story.** Derive a story's DB classification by intersecting its file surface — already emitted by `.cleargate/scripts/collision_surface.sh` — with the L0/L1/L2 evidence, and feed the result to `architect-reader` so `db_write_set` becomes derived. Author-declared values remain honored and **union** with derived ones; a human naming a table the detector missed must never be overridden.

- [ ] **WS6 — Make clause 4 executable.** A blocking validator that rejects a `waves.json` co-waving two stories whose DB evidence overlaps or is unproven. SPRINT-36 is the proof this is required: the prose rule existed, was applicable, and was not applied. Scope strictly to clause 4 — see OUT-OF-SCOPE.

  **Blocks at `sprint init` (D5)**, not at wave launch and not both. That is where the plan is still cheap to change; by wave launch it is too late to re-plan, and `launch_wave.mjs` cannot read `waves.json` in any case (it imports only `node:crypto`). The validator honors the D1 advisory window — it reports during the advisory release and blocks from the enforcing one.

**❌ OUT-OF-SCOPE (Do NOT Build This)**

- **Making the whole five-clause predicate executable.** Clauses 1, 2, 3, and 5 are also prose in `architect-synth.md`, and `launch_wave.mjs` cannot even read `waves.json` (it imports only `node:crypto`). That is a real and larger problem, and it is not this epic. WS6 covers clause 4 only.
- **Wave ordering / leading-vs-trailing placement.** `architect-synth.md:62`'s "trailing serial wave" rule is separately wrong, and separately owned. This epic decides only *whether* stories may co-wave, never *where* a serialized story lands.
- **Live database introspection.** No connecting to a database, no credentials, no `information_schema` queries. Static evidence only.
- **An ORM adapter or plugin framework.** Config globs plus a flat regex table cover the stacks. An extension system is unwarranted complexity.
- **Fixing `dep_predecessors`.** It has no producer either, which is a real defect — and a different one.
- **Retrofitting `db_write_set` onto the 224 existing stories.** New and in-flight work only.
- **Speculative parallel execution with post-hoc reconciliation.** Evaluated and rejected: merging text cannot resolve a semantic dependency, and ClearGate's red tests are immutable to the Developer, so a wrong guess becomes a locked spec.

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| **Ordering dependency** | WS1 must not ship after WS2–WS5. Derivation without the polarity flip leaves the axis failing open; the flip without derivation serializes every story in a DB-bearing repo. M6 is the guard against shipping half of this. |
| **Migration-path risk** | The flip changes behavior for every existing installed repo. A repo with no `db:` config and no TS detector will serialize everything until configured. A staged rollout (advisory → enforcing) is likely required — see §6. |
| **False positives are fatal to adoption** | A detector that flags `createHash().update()` as a database write will be switched off, and a switched-off gate is [[EPIC-043]] WS8's failure class. WS4's repairs are a precondition for WS4's value, not a follow-up. |
| **Stack generality** | `isSchemaOrMigrationPath` (`extract-skeleton.ts:526-533`) matches only `/migrations/`, `/drizzle/`, `*.migration.ts` — and lives *inside* the TypeScript-only extractor, which `scan-source.ts` feeds with `.ts`/`.tsx` only. Rails `db/migrate/`, Prisma `schema.prisma`, Alembic `alembic/versions/`, and Flyway `db/migration/` are all missed. L0 must not inherit this. |
| **Non-TS repos today** | A repo without resolvable TypeScript gets an empty code-map and `wiki build: OK` — a silent no-op. L0/L1 must be reachable on that path. |
| **Real infra, no mocks** | ClearGate mandates database tests against real Postgres/Redis. Parallel worktrees share one dev database. This is why the axis exists and why fail-open is dangerous. |
| **Test runner** | node:test only, `*.node.test.ts`, via `tsx --test`. vitest is forbidden. |
| **Mirror discipline** | Eight target files span `.cleargate/`, `.claude/`, and `cleargate-cli/`. Every `.cleargate/**` and `.claude/**` edit needs its `cleargate-planning/` mirror in the same commit. |

## Existing Surfaces

- **Surface:** `.cleargate/templates/story.md:70` — ships `db_write_set: []` with the comment *"default `[]` = no DB collision contribution; absent treated as `[]` by architect-synth predicate"*. This single line is the fail-open. WS1 rewrites it.
- **Surface:** `.claude/agents/architect-reader.md:34` — *"`db_write_set` — frontmatter `db_write_set` array (default `[]` if absent or empty)"*. The collapse of absent into empty happens here. WS1 and WS5 change it.
- **Surface:** `.claude/agents/architect-synth.md:39-46,54-64` — clause 4, the "intentionally coarse" DB rationale, and the fail-safe-serialize rule. WS1 and WS6 target these.
- **Surface:** `.claude/agents/architect-synth.md:48` — the [[BUG-033]] empty-surface guard, *"An empty surface is unproven, not proven-disjoint."* This is the precedent WS1 copies verbatim onto the DB axis.
- **Surface:** `cleargate-cli/src/wiki/code-map/extract-skeleton.ts:250,268-363` — `extractDbWrites` already computes per-module `{tables, schema_ddl}`. WS4 repairs and persists it rather than writing a new extractor.
- **Surface:** `cleargate-cli/src/wiki/code-map/extract-skeleton.ts:265` — `DRIZZLE_WRITE_METHODS = new Set(['insert','update','delete','onConflictDoUpdate'])`, the false-positive source. WS4 fixes it.
- **Surface:** `cleargate-cli/src/wiki/code-map/extract-skeleton.ts:526-533` — `isSchemaOrMigrationPath`, the three-pattern path heuristic. WS2 generalizes and relocates its idea into config.
- **Surface:** `cleargate-cli/src/wiki/code-map/page-schema.ts` and `compile-page.ts` — the `CodeMapPage` shape and its serializer; neither references `db_writes` (verified). WS4 adds the field here.
- **Surface:** `cleargate-cli/src/wiki/code-map/scan-source.ts` — collects source files for the extractor; the TS-only gate WS2 must bypass.
- **Surface:** `.cleargate/scripts/collision_surface.sh` — emits one file path per line from a story's §3.1 table, already stack-agnostic bash. WS5 joins its output to the DB evidence; this is the natural seam.
- **Surface:** `.cleargate/config.yml` — top-level keys today are `wiki:`, `gates:`, `worktree:`. WS2 adds `db:` alongside them.
- **Surface:** `cleargate-cli/src/commands/wiki-build.ts` — invokes the code-map pass; the entry point WS4's persistence flows through.
- **Coverage of this epic's scope:** **partial — roughly 50%.** The story-side file surface (`collision_surface.sh`), the code-map extraction pass, the config loader, and the wave predicate's four other clauses all exist and are extended, not rebuilt. `extractDbWrites` in particular already computes the exact data WS4 needs and simply discards it. What does not exist anywhere: a fail-safe tri-state for the DB axis, any non-TypeScript detection path, any join between file surface and DB evidence, and any executable enforcement of clause 4.

## Prior work

- [[EPIC-033]] — Parallel Wave Sprint Execution. Introduced the five-clause predicate, clause 4, and the `db_write_set` field. This epic repairs that axis rather than replacing it.
- [[STORY-033-03]] — Architect Planning Workflow. The story that added `db_write_set` to `story.md` as *advisory-v1*; the advisory status is precisely what this epic ends.
- [[BUG-033]] — collision_surface fail-open. Established the governing principle — empty is unproven, never proven-disjoint — on the **file** axis. WS1 applies the identical reasoning to the **DB** axis. The closest and most important precedent.
- [[BUG-035]] — mcp test suite systemic cross-file FK seed race (Postgres 23503). In-repo evidence that concurrent work against one shared database corrupts test state. The failure this epic prevents.
- [[EPIC-032]] / [[STORY-032-02]] — Code Map Awareness Layer and its page schema. Owns `extract-skeleton.ts` and `CodeMapPage`; WS4 extends both.
- [[EPIC-043]] — Framework Hygiene. WS8 catalogues "gates that don't gate"; clause 4 is a further instance, and WS8's lesson constrains WS6's design.
- [[CR-103]] — Wiki Page & Index Fidelity. Adjacent (`wiki-build.ts` code-map invocation) but non-overlapping; no file conflict expected.
- [[EPIC-052]] — Requirement-Level Grounding. Independent surface, no shared files.
- No prior item addresses DB-collision detection for downstream repos, the fail-open polarity, or non-TypeScript schema detection.

## Why not simpler?

- **Smallest existing surface that could carry this epic:** `.cleargate/templates/story.md:70` plus `.claude/agents/architect-reader.md:34` genuinely carry WS1 — the polarity flip is a few lines of template and prompt text with no new abstraction. Nothing existing can carry WS2–WS6.
- **Why isn't extension / parameterization / config sufficient?** For the highest-value slice it *is*, and the epic is deliberately ordered so that slice ships first and alone: WS1 is a comment-and-prompt change, and WS2 is pure configuration with no code. If the epic were trimmed to WS1+WS2 it would still convert a silent fail-open into a working fail-safe on every stack, which is the majority of the value. Beyond that, config cannot suffice for three specific reasons. First, a glob list can say *whether* a file touches schema but never *which table*, so two stories editing unrelated tables in one migrations directory serialize needlessly — WS3/WS4 exist to buy that parallelism back (M6), not to add capability. Second, `extractDbWrites` is actively wrong today, and no configuration fixes a `Set` containing `update` that classifies `createHash().update()` as a database write; that is a code repair. Third, SPRINT-36 demonstrated that a correct declaration plus a correct prose rule still produced a parallel co-wave — no amount of configuration makes a prompt obey itself, which is why WS6 must be executable. The workstreams are separable and independently shippable, and the epic explicitly names WS1+WS2 as the minimum viable slice.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**

- `.cleargate/templates/story.md` — tri-state `db_write_set` semantics + authoring guidance (WS1)
- `.claude/agents/architect-reader.md` — emit `null` for absent; stop defaulting to `[]`; consume derived evidence (WS1, WS5)
- `.claude/agents/architect-synth.md` — clause 4 tri-state handling; fail-safe rule covers unproven DB evidence; rationale must name the reason (WS1, WS6)
- `.cleargate/config.yml` — new top-level `db:` key with `schema_globs` (WS2)
- `.cleargate/scripts/collision_surface.sh` — or a sibling script: emit DB classification alongside the file surface (WS2, WS3, WS5)
- `cleargate-cli/src/wiki/code-map/extract-skeleton.ts` — repair `DRIZZLE_WRITE_METHODS` receiver check and `resolvePgTableArg` null contract (WS4)
- `cleargate-cli/src/wiki/code-map/page-schema.ts` — add `db_writes` to `CodeMapPage` + serializer (WS4)
- `cleargate-cli/src/wiki/code-map/compile-page.ts` — read and emit `skeleton.db_writes` (WS4)
- `cleargate-cli/src/wiki/code-map/scan-source.ts` — non-TS reachability for the L0/L1 path (WS2, WS3)
- `cleargate-cli/src/commands/wiki-build.ts` — plumb persisted `db_writes` through the build (WS4)
- `cleargate-planning/.cleargate/**` and `cleargate-planning/.claude/**` — canonical mirrors of every scaffold file above (all WS)
- `cleargate-cli/test/wiki/code-map/*.node.test.ts`, `cleargate-cli/test/scripts/*.node.test.ts` — coverage for WS2–WS6

**Data Changes:**

- No product database schema changes. This epic *detects* schema work; it does not perform any. The only persisted-shape change is the `db_writes` field added to the `CodeMapPage` markdown/JSON artifact under `.cleargate/wiki/code/`, plus a new `db:` block in `.cleargate/config.yml`.

## 5. Acceptance Criteria

```gherkin
Feature: Downstream DB Collision Detection

  Scenario: Absent DB evidence serializes instead of co-waving
    Given a story whose frontmatter omits db_write_set entirely
    And no detector produced DB evidence for its file surface
    When architect-synth evaluates the wave-compatibility predicate
    Then the story is fail-safe-serialized into its own wave
    And the rationale states that its DB evidence is unproven

  Scenario: Affirmative empty is honored as proven DB-free
    Given a story whose file surface was scanned by a detector
    And the detector found no schema path, no schema signature, and no DB write
    When the predicate evaluates clause 4
    Then db_write_set is the empty list
    And the story is eligible to co-wave on the DB axis

  Scenario: Two stories writing the same table from different files are serialized
    Given story A declares a migration file that creates table "orders"
    And story B declares a query module that writes to table "orders"
    And their file surfaces are disjoint
    When the predicate evaluates the pair
    Then clause 4 fails on the shared table
    And the two stories are placed in different waves

  Scenario: A non-TypeScript repo receives protection through globs alone
    Given a repository with no resolvable TypeScript
    And .cleargate/config.yml declares db.schema_globs including "db/migrate/**"
    And a story declares "db/migrate/20260806_add_orders.rb" in its file surface
    When DB classification runs
    Then the story is classified as DB-touching by the L0 glob rung
    And no TypeScript compiler is required

  Scenario: A migration file that does not exist yet is still classified
    Given a story that will CREATE "db/migrate/20260806_add_orders.rb"
    And that file is absent from the working tree at planning time
    When DB classification runs against the story's declared file surface
    Then the L0 glob rung classifies it as DB-touching from the declared path

  Scenario: Hashing is not mistaken for a database write
    Given a source module calling createHash('sha256').update(payload)
    And the module performs no database write
    When extractDbWrites analyses it
    Then no table is recorded for that module
    And the module is not classified as schema_ddl

  Scenario: A human declaration is never overridden by the detector
    Given a story author declares db_write_set ["ledger"]
    And the detector independently derives ["orders"]
    When the two are combined
    Then the effective write set is the union of both
    And neither value is discarded

  Scenario: Error — a waves.json co-waving unproven DB stories is rejected
    Given a waves.json placing two stories with unproven DB evidence in one parallel wave
    When the clause-4 validator runs
    Then the validator exits non-zero
    And the message names both story IDs and the offending wave

  Scenario: Error — an unreadable or malformed db config fails closed
    Given .cleargate/config.yml contains a db block that cannot be parsed
    When DB classification runs
    Then classification reports no evidence rather than assuming DB-free
    And every affected story is fail-safe-serialized

  Scenario: Error — a glob matching no files does not assert DB-freedom
    Given db.schema_globs is configured but matches nothing in the repo
    When a story's file surface is classified
    Then the result is unproven, not an affirmative empty
    And the story is serialized
```

## 6. AI Interrogation Loop (Human Input Required)

_Empty — the loop is closed. All seven questions were answered by the owner on 2026-08-06 and their
decisions are integrated into §2 (workstreams), §3 (constraints), and §5 (acceptance criteria). The
audit trail is preserved below under **Resolved Decisions**._

## Resolved Decisions

> Decision record. Each entry names the choice, who made it, and what was rejected. Referenced from
> the workstreams as D1–D7.

| # | Decision | Chosen | Rejected |
|---|---|---|---|
| **D1** | Rollout mode for the polarity flip | **Advisory for one release**, then enforcing. Unproven stories are named loudly but not blocked. | Enforcing immediately (strands every installed repo); enforcing-only-when-`db:`-present (recreates the fail-open). |
| **D2** | Default `db.schema_globs` | **Broad list** — 16 patterns spanning Drizzle, Prisma, Rails, Django, Ecto, Flyway, Liquibase, TypeORM, EF Core, Alembic. | A narrow list; and a bare `**/*.sql`, which would sweep in seeds, fixtures, and analytics queries. |
| **D3** | Fixing the `update` false positive | **Require the first argument to resolve to a known `pgTable` symbol**, reinforced by a receiver check for a Drizzle db handle. Delegated to the agent by the owner. | Dropping `update` from `DRIZZLE_WRITE_METHODS`, which loses genuine `db.update(table)`. |
| **D4** | Unknown / dynamic table | **Collides with every other DB-touching story.** | Isolating only itself — an unknown table cannot be proven disjoint from a known one. |
| **D5** | Where the clause-4 validator blocks | **`sprint init`.** | Wave launch (too late to re-plan; `launch_wave.mjs` cannot read `waves.json`); both. |
| **D6** | Is L1 signature grep worth building | **Keep it** — it is what preserves parallelism on non-TypeScript repos. | Cutting it. Remains first-to-cut if scope shrinks later. |
| **D7** | Where persisted `db_writes` lives | **A separate compact machine-readable artifact**, plus a one-line summary on the code-map page. Delegated to the agent by the owner. | Embedding a per-file table map in the token-budgeted, human-facing code-map page. |

**Scope question raised and settled 2026-08-06.** The owner asked what a *planning* framework has to do
with database writes. Answer of record: nothing. ClearGate never connects to a database, never runs a
migration, never reads a row. `db_write_set` is a poorly named collision axis — it answers only
"can these two stories run concurrently?", the same question clause 2 answers for files. The hazard
exists *because* ClearGate runs stories in parallel worktrees against shared real infrastructure, so
detecting it is owning a consequence the framework introduced, not scope creep. WS3 and WS4 (which
read product source to extract table names) were explicitly examined as the part nearest the scope
line and **confirmed in scope** — they extend the code-map surface [[EPIC-032]] already established,
and they buy parallelism back rather than adding safety.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Decomposition**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [x] `approved: true` is set in the YAML frontmatter.
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths. *(Every path was confirmed present on disk this session.)*
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec). *(Literally empty of questions — the seven were answered 2026-08-06, integrated into §2/§3/§5, and the audit trail moved to a separate `## Resolved Decisions` section so §6 itself carries none.)*
- [x] 0 "to-be-determined" markers exist in the document.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered.

**Note on the Proposal gate:** `parent_ref` is null. Waived per the recorded `proposal_gate_waiver` frontmatter and `~/.claude` memory `feedback_proposal_gate_waiver.md` — direct human ask with sharp intent, scope narrowed live across two verification rounds.

**Evidence provenance.** Two multi-agent workflows informed this epic. In the second, four of five finders were disputed on adversarial review and one verifier died on an API error, so every fact asserted above was re-verified by hand: `story.md:70`, `extract-skeleton.ts:250/265`, the absence of `db_writes` in `page-schema.ts`/`compile-page.ts`, the six `createHash().update()` sites in `mcp/src/`, and SPRINT-36 wave 2's `parallel: true`. Claims that could not be hand-verified were excluded.

**Decomposition note:** stories are not yet cut. On promotion this decomposes to roughly STORY-053-01 (WS1 polarity flip + mirrors), STORY-053-02 (WS2 config globs + payload default), STORY-053-03 (WS3 signature grep), STORY-053-04 (WS4 extractor repair), STORY-053-05 (WS4 persistence), STORY-053-06 (WS5 join), STORY-053-07 (WS6 validator). WS4 is split because the repair and the persistence differ in risk. Run the Granularity Rubric at decomposition time.

**Value ordering if the epic is trimmed:** WS1 + WS2 are the minimum viable slice and deliver the majority of the value — a working fail-safe on every stack, achieved with a template edit, two prompt edits, and a config block. WS4's repair is the next most valuable and must precede WS4's persistence. WS3 is the first cut if scope must shrink. WS6 is what makes the rest binding rather than advisory.
