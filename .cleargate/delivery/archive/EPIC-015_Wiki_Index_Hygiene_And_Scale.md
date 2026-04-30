---
epic_id: EPIC-015
status: Completed
approved: true
approved_at: 2026-04-30T00:00:00Z
approved_by: sandrinio
ambiguity: null
context_source: "Direct-epic waiver (2026-04-24 conversation). No separate PROPOSAL filed. Inline references: (a) Karpathy LLM Wiki scale breakpoints — flat index breaks at ~200–500 documents (https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f, https://atlan.com/know/llm-wiki-vs-rag-knowledge-base/); (b) current state: .cleargate/wiki/index.md is 15 KB / ~4k tokens with 151 pages, projected to cross 8k tokens at ~300 pages; (c) stale entries observed — SPRINT-10 frontmatter still 'Planned' despite merge to main, EPIC-001/008/009 marked Ready/Draft while archived, stories 001-0x/008-0x/009-0x listed as Draft but abandoned; (d) no retrieval augmentation (BM25/vector) exists or is planned — verified."
owner: sandro
target_date: 2026-05-15
created_at: 2026-04-24T00:00:00Z
updated_at: 2026-04-24T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
children:
  - "[[STORY-015-01]]"
  - "[[STORY-015-02]]"
  - "[[STORY-015-03]]"
  - "[[STORY-015-04]]"
cached_gate_result:
  pass: false
  failing_criteria:
    - id: affected-files-declared
      detail: section 4 has 0 listed-item (≥1 required)
  last_gate_check: 2026-04-30T11:06:15Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-015
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-24T08:12:20Z
  sessions: []
sprint_cleargate_id: "SPRINT-10"
---

# EPIC-015: Wiki Index Hygiene & Scale

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Reshape .cleargate/wiki/index.md from a flat 151-row table into a scale-ready hierarchical index and fix the stale frontmatter that causes half its rows to lie about status.</objective>
  <architecture_rules>
    <rule>Source of truth stays the raw-item frontmatter in .cleargate/delivery/{pending-sync,archive}/; index.md is derived</rule>
    <rule>No retrieval augmentation (BM25, vector, embeddings) — this epic stays inside Karpathy's flat-index regime</rule>
    <rule>Status vocabulary remains protocol-defined (Draft / Ready / Approved / Completed / Done). Adding "Abandoned" is the only new literal permitted and must land in the protocol doc in the same story</rule>
    <rule>wiki-build must remain idempotent — same inputs produce byte-identical output</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/wiki-build.ts" action="modify" />
    <file path="cleargate-cli/src/commands/wiki-audit-status.ts" action="create" />
    <file path="cleargate-cli/src/commands/wiki-lint.ts" action="modify" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-planning/.cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="cleargate-cli/src/lib/sprint-archive.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
The wiki index is the first thing every ClearGate agent reads at session start (CLAUDE.md orientation step 1). Today it contains 151 rows in a single flat table, ~4k tokens, and ~60% of those rows are stale or abandoned items (EPIC-001/008/009 and their never-shipped child stories, SPRINT-10 marked "Planned" despite being merged). Agents waste tokens scanning noise and — worse — make decisions on lies (e.g. "SPRINT-10 is planned, so we can still add to it"). At current drift rate we cross 8k index tokens around ~300 pages, well before we'd hit Karpathy's 200–500 document BM25 breakpoint.

**Success Metrics (North Star):**
- Index file ≤ 8k tokens at current page count (baseline: ~4k today, must stay under ceiling as we grow).
- 0 rows in the Active section whose raw-file location contradicts their declared status (archive+Ready or pending-sync+Completed).
- Agent-visible "active surface" (epics + in-flight stories) fits in ≤ 2k tokens — the 80% case for orientation.
- `cleargate wiki lint` fails if index exceeds the configurable token ceiling.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Hierarchical index rendering: Active / Archive split; stories collapsed under parent epic with count + expand link
- [ ] `cleargate wiki audit-status` — detects items whose status/location disagree; exits non-zero; `--fix` flag applies the obvious correction (archived → Completed or Abandoned)
- [ ] `Abandoned` as a first-class protocol status; documented in both protocol files
- [ ] Token-budget lint: wiki-lint fails when `index.md` exceeds the configured ceiling (default 8k tokens)
- [ ] Sprint-close hook: `cleargate sprint-archive` (STORY-014-08 wrapper) stamps `status: Completed` + `completed_at` on the sprint file before rebuilding the wiki
- [ ] One-time data correction commit for SPRINT-10, EPIC-001, EPIC-008, EPIC-009, and their stranded child stories (delivered by running audit --fix in the last story)

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- BM25, vector search, embeddings, or any RAG retrieval layer
- Sharding the index into multiple files (reserved for the next epic at ~300 pages)
- Changing the raw-item directory layout (pending-sync / archive split stays)
- Re-numbering or merging any archived epic/story IDs
- UI surface for the wiki (admin-UI viewer is EPIC-006 scope)

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | `wiki build` must stay O(n) over raw items; current ~151 items build in <200ms |
| Compatibility | Wiki page schema (per-item files under `wiki/{epics,stories,…}/<id>.md`) unchanged — only `index.md` rendering and frontmatter values change |
| Protocol | New `Abandoned` status must be added to the canonical status vocabulary in both `.cleargate/knowledge/cleargate-protocol.md` and `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` in the same story that introduces it |
| Scale ceiling | Flat-index regime only. When wiki pages cross ~200, a follow-up epic introduces retrieval augmentation; this epic does NOT do that |
| Idempotency | `wiki build` must produce byte-identical output when raw items don't change; the hierarchical rendering must not introduce timestamp- or order-dependent churn |

## 4. Technical Grounding

**Affected Files:**
- `cleargate-cli/src/commands/wiki-build.ts` — `buildIndex()` at L158 rewritten to group by epic with Active/Archive split and per-epic story rollup
- `cleargate-cli/src/commands/wiki-audit-status.ts` — new file: scan delivery/, compare frontmatter status vs. directory (pending-sync vs. archive), emit diff + optional --fix
- `cleargate-cli/src/commands/wiki-lint.ts` — add token-count check on final rendered `index.md`; read ceiling from `.cleargate/config.yml` with 8000 default
- `cleargate-cli/src/lib/sprint-archive.ts` — stamp sprint frontmatter (`status: Completed`, `completed_at`) before triggering wiki rebuild
- `.cleargate/knowledge/cleargate-protocol.md` + `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — add `Abandoned` to status vocabulary; document index ceiling + audit-status behavior
- `cleargate-cli/src/commands/index.ts` (or wherever commands are registered) — register the new `wiki audit-status` subcommand

**Data Changes:**
- Raw item frontmatter: add `status: "Abandoned"` as a permitted literal. No schema migration needed — existing consumers (wiki-build, wiki-lint) already treat `status` as an opaque string
- `.cleargate/config.yml` — optional new key `wiki.index_token_ceiling` (default 8000); absent = default

## 5. Acceptance Criteria

```gherkin
Feature: Wiki Index Hygiene & Scale

  Scenario: Active/Archive split renders correctly
    Given 15 epics, 104 stories, 11 proposals, 1 CR exist in delivery/
    And 7 epics are status=Completed, 1 is Approved, the rest are Draft/Ready
    When I run `cleargate wiki build`
    Then index.md contains a "## Active" section and a "## Archive" section
    And the Active section shows only epics with non-terminal status
    And stories appear as a count under their parent epic ("STORY-014-xx (10 stories) — 10 Ready") not as 10 individual rows

  Scenario: Audit detects status/location drift
    Given SPRINT-10 has status="Planned" but lives in pending-sync/ and its stories are all status=Done in archive/
    When I run `cleargate wiki audit-status`
    Then the command exits non-zero
    And stderr lists "SPRINT-10: status=Planned but all child stories Done — suggest Completed"

  Scenario: Audit --fix applies corrections
    Given an audit run reports 6 items with obvious status/location drift
    When I run `cleargate wiki audit-status --fix`
    Then the corresponding frontmatter `status` values are updated in-place
    And the command exits 0
    And a subsequent `cleargate wiki audit-status` exits 0

  Scenario: Token-budget lint catches regression
    Given index.md renders to 9000 tokens (above the 8000 ceiling)
    When I run `cleargate wiki lint`
    Then the command exits non-zero with message "wiki/index.md exceeds token ceiling: 9000 > 8000"

  Scenario: Sprint close stamps frontmatter
    Given SPRINT-10 with status="Planned" and the sprint branch merged to main
    When I run `cleargate sprint-archive SPRINT-10`
    Then the sprint frontmatter status becomes "Completed" and completed_at is set
    And the subsequent `wiki build` shows SPRINT-10 in the Archive section

  Scenario: Abandoned status is a protocol literal
    Given the protocol doc enumerates valid statuses
    When I grep for "Abandoned" in `.cleargate/knowledge/cleargate-protocol.md`
    Then the term appears in the status vocabulary section with a one-line definition
```

## 6. AI Interrogation Loop

*(Resolved 2026-04-24 — human approved all recommended defaults.)*

- **Q1. Tokenizer vs chars/4 heuristic?** → **chars/4 heuristic.** Zero deps, ~10% error on markdown is acceptable. Revisit only if false-positives hurt.
- **Q2. `audit-status --fix` confirmation UX?** → **Always require `--yes`** (or TTY prompt) unless `--quiet`. Single predictable rule.
- **Q3. Need `replaced_by:` frontmatter pointer?** → **No — status-only for now.** Add as a CR if audit later surfaces the need.
- **Q4. Sprint-archive post-stamp lint failure — block or warn?** → **Block.** Revert frontmatter, abort the archive step; operator fixes the lint error first.
- **Q5 (STORY-015-01). Story-rollup threshold?** → **≥3 active stories** collapse under the parent epic. Tunable later.
- **Q6 (STORY-015-02). `Completed` vs `Done` — aliases or distinct?** → **Aliases.** Both land in the terminal-status set. Picking a single canonical form is a separate cleanup CR.

## 7. Stories (Decomposition)

| ID | Title | Complexity | Depends on |
|---|---|---|---|
| [[STORY-015-01]] | Hierarchical Index Rendering | L2 | — |
| [[STORY-015-02]] | Status Audit CLI + One-Time Fix | L2 | — |
| [[STORY-015-03]] | Index Token-Budget Lint | L1 | 015-01 |
| [[STORY-015-04]] | Abandoned Status + Sprint-Close Stamp | L2 | 015-02 |

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Sprint Planning**

Requirements to pass to Green:
- [x] §6 AI Interrogation Loop answered by human (6 questions resolved 2026-04-24)
- [x] `<agent_context>` target_files list confirmed against actual repo layout
- [x] 0 TBDs
