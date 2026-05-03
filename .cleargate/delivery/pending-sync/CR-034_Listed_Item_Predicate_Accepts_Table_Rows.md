---
cr_id: CR-034
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Live evidence 2026-05-03 — markdown_file_renderer end-to-end test, Sprint
  Plan creation phase. Agent decomposed EPIC-001 + EPIC-002 into 10 stories.
  All 10 stories failed `implementation-files-declared`:

    ❌ implementation-files-declared: section 3 has 0 listed-item (≥1 required)

  Reading STORY-001-01 §3 The Implementation Guide — content IS populated:

    ## 3. The Implementation Guide
    | Item | Value |
    |---|---|
    | Primary File | `package.json` |
    | Related Files | `vite.config.ts`, `tsconfig.json`, ... |
    | New Files Needed | Yes — all of the above |

  The agent followed the template; the template uses a markdown TABLE for §3.
  The predicate `section(N) has ≥N listed-item` counts only `- ` bullet lines
  (per readiness-gates.md "Predicate Vocabulary" §3 definition: "lines matching
  `- ` regardless of checkbox state"). Tables don't match.

  Net effect: every well-formed Story trips `implementation-files-declared`
  forever, by construction. The criterion is unsatisfiable through the
  template's own format.

  Same predicate `section(N) has ≥N listed-item` is referenced in 9+ gate
  criteria across readiness-gates.md (epic.affected-files-declared,
  epic.scope-in-populated, story.implementation-files-declared,
  story.dod-declared, cr.blast-radius-populated, cr.sandbox-paths-declared,
  bug.repro-steps-deterministic, etc.). Wherever the template uses tables for
  the corresponding section, the same false-positive fires. Story §3 is the
  most visible case (every story trips it); other sections may be silently
  intermittent depending on whether the agent picked table vs bullet shape.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T17:47:42Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-034
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:46:11Z
  sessions: []
---

# CR-034: Predicate-vs-Template Format Mismatch — `section(N) has ≥N listed-item` Trips on Tables

## 0.5 Open Questions

- **Question:** Fix at the template layer (rewrite §3 + similar sections to use bullets) or at the predicate layer (broaden `listed-item` to also count table rows)?
  - **Recommended:** **predicate layer**, with a new item-type. Rationale:
    - Templates with tables convey *more* structure (Item / Value pairs, column semantics) than bullets — forcing bullets degrades the human-readable artifact.
    - Predicate is the layer that doesn't care about format — it cares about "did the author declare anything in §N?" Tables, bullets, and definition lists all answer "yes."
    - Single fix (one predicate change) covers all 9+ criteria using the shape; rewriting templates is N changes that drift over time.
  - **Counter-recommendation:** template layer is *simpler* — one rewrite per template, no engine change, lowest risk. Worth considering if §0.5 Q3 is "no" (don't broaden item-type semantics).
  - **Human decision:** _populated during Brief review_

- **Question:** If predicate fix — extend existing `listed-item` (silently broader) or add new item-type `declared-item` (explicit)?
  - **Recommended:** **new item-type `declared-item`**. Definition: "any line that declares a structured item — either a `-` bullet, a `| ... |` table data row (after a `|---|` separator), or a definition-list term." Explicit name; existing `listed-item` stays bullet-precise for criteria that genuinely need bullets (e.g., DoD checkboxes). Gates that don't care about format switch from `listed-item` → `declared-item`.
  - **Human decision:** _populated during Brief review_

- **Question:** Which gate criteria switch from `listed-item` → `declared-item`?
  - **Recommended:** all 9+ where the corresponding template section uses tables. Concretely: `implementation-files-declared`, `affected-files-declared`, `scope-in-populated`, `blast-radius-populated`, `sandbox-paths-declared`, `repro-steps-deterministic`. Keep `dod-declared` on `listed-item` (DoD is a checkbox list — bullet shape is the right enforcement).
  - **Human decision:** _populated during Brief review_

- **Question:** Sprint inclusion?
  - **Recommended:** ~~**SPRINT-20** if not yet activated~~. **Stale rec — SPRINT-20 shipped in commit `618fadc`.** Defaults to SPRINT-21.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W2 Developer dispatch 3 (parallel with CR-032). MUST land before any W3 work-item draft trips its own predicate.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- `cleargate-cli/src/lib/readiness-predicates.ts` — `listed-item` predicate counts only lines matching `^- ` (the `- ` bullet shape). Table rows and definition-list items are invisible.
- `.cleargate/knowledge/readiness-gates.md` — every criterion using `section(N) has ≥N listed-item` against a template section that uses table format generates false positives. Six criteria identified (per §0.5 Q3): `implementation-files-declared`, `affected-files-declared`, `scope-in-populated`, `blast-radius-populated`, `sandbox-paths-declared`, `repro-steps-deterministic`.
- The implicit assumption that "templates declare things in bullets" — half the templates use tables (Story §3 Implementation Guide, Bug §2 Repro Steps, CR §3 Execution Sandbox, Epic §5 Affected Files) because tables carry richer structure.

**New Logic (The New Truth):**

Predicate vocabulary gains a new item-type. Definition (added to `readiness-gates.md` Predicate Vocabulary §3):

> `declared-item` — a line that declares a structured item. Matches:
> - bullet lines (`- ...` regardless of checkbox state),
> - table data rows (`| ... |` lines that follow a `|---|` (or `|:--:|` etc.) separator within the same section),
> - definition-list terms (lines preceded by `Term:` or matching the loose `*term* — definition` shape).
>
> Use `declared-item` when the gate cares only that the author declared at least N entries in section N, regardless of presentation format. Use `listed-item` (bullet-precise) when the gate specifically requires the checkbox or task-list semantics.

Six criteria switch from `listed-item` → `declared-item`. The `dod-declared` criterion stays on `listed-item` (DoD is intentionally a checkbox list).

No new closed-set predicate *shape* — `section(N) has ≥N declared-item` reuses shape #3 with a broader vocabulary entry. Closed-set grammar is preserved.

## 2. Blast Radius & Invalidation

- [x] **Pre-existing items currently failing the 6 criteria** due to table-shape content — start passing on next gate evaluation. Surface as positive signal in `cleargate doctor` output (these were always intended to pass; the predicate was wrong).
- [x] **Update Epic:** EPIC-008 (predicate engine).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Local predicate work.
- [ ] **Audit log:** No new fields. Failing-criteria details adopt `declared-item` wording.
- [ ] **Coupling with CR-027:** CR-027's `risk-table-populated` predicate uses `body contains '| Mitigation'` (a table-column-header check, not `listed-item`) — already correct; no change needed there. CR-034 affects only the criteria using shape #3.
- [ ] **Coupling with CR-028:** CR-028's `reuse-audit-recorded` and `simplest-form-justified` use shape #2 (`body contains "<string>"`) — unaffected.
- [ ] **Coupling with CR-033:** CR-033's `existing-surfaces-verified` introduces shape #7 — independent of `listed-item` vs `declared-item`.
- [ ] **FLASHCARD impact:** add card on completion — *"`section(N) has ≥N declared-item` accepts bullets OR table data rows OR definition-list terms; `listed-item` stays bullet-precise (use for checkbox-list semantics like DoD). Six criteria migrated."*
- [ ] **Templates unchanged.** Story / Epic / CR / Bug templates keep their table-based sections. Author-experience preserved.
- [ ] **Scaffold mirror:** `readiness-gates.md` + `readiness-predicates.ts` mirrors stay byte-equal.

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `listed-item` item-type matches `^- ` only; this CR adds a new item-type `declared-item` that also matches `| ... |` table data rows + definition-list terms.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — six criteria (`implementation-files-declared`, `affected-files-declared`, `scope-in-populated`, `blast-radius-populated`, `sandbox-paths-declared`, `repro-steps-deterministic`) currently use `listed-item`; switch to `declared-item`. Keep `dod-declared` on `listed-item`.
- **Why this CR extends rather than rebuilds:** existing predicate engine grammar supports new item-types via additive enum; no engine refactor.

## 3. Execution Sandbox

**Modify (predicate engine — 1 file):**

- `cleargate-cli/src/lib/readiness-predicates.ts` — extend the `section(N) has <count> <item-type>` evaluator. The dispatch on `<item-type>` gains a `'declared-item'` branch:
  - Reuse the existing bullet matcher.
  - Add table-row matcher: scan section lines for a `|---|`-shape separator; subsequent `| ... |` lines until the next blank line or non-table line are data rows. Count each data row as 1.
  - Add definition-list matcher: lines matching `^[*_]?[A-Z][^|*\n]*[*_]?:` (loose; agents commonly write `Item:` or `**Item:**`).
  - Total count = bullets + table-rows + def-list-terms within the section.
  - Sandbox unchanged; pure string parsing.

**Modify (readiness gates — 1 file + 1 mirror):**

- `.cleargate/knowledge/readiness-gates.md` — three changes:
  1. **Predicate Vocabulary §3** — extend the item-type list to include `declared-item` with the definition above. `listed-item` definition stays as-is.
  2. **Six criteria** switch the item-type token:
     - `epic.ready-for-decomposition.affected-files-declared`: `listed-item` → `declared-item`.
     - `epic.ready-for-decomposition.scope-in-populated`: `listed-item` → `declared-item`.
     - `story.ready-for-execution.implementation-files-declared`: `listed-item` → `declared-item`.
     - `cr.ready-to-apply.blast-radius-populated`: `listed-item` → `declared-item`.
     - `cr.ready-to-apply.sandbox-paths-declared`: `listed-item` → `declared-item`.
     - `bug.ready-for-fix.repro-steps-deterministic`: `listed-item` → `declared-item` (`section(2) has ≥3 declared-item`).
  3. **`dod-declared` stays on `listed-item`** — DoD is a checkbox list; bullet shape is the right enforcement.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-equal mirror.

**Tests (1 file):**

- `cleargate-cli/test/lib/readiness-predicates.test.ts` — add scenarios:
  1. Section with 3 bullets → `section(N) has ≥1 declared-item` passes (count=3).
  2. Section with a 4-row table (4 data rows + 1 separator + 1 header) → passes (count=4).
  3. Section with 2 bullets + 3 table rows → passes (count=5).
  4. Section with definition-list `Item: value` lines (3 entries) → passes (count=3).
  5. Section empty → fails.
  6. Section with only the table header + separator (no data rows) → fails (count=0).
  7. Section with mixed: 1 bullet + 1 def-list + 2 table rows → passes (count=4).
  8. **Regression baseline:** `dod-declared` against a section of `- [x]` and `- [ ]` lines still passes via `listed-item`.

**Out of scope:**

- Auto-migrating existing failing items (none need migration; they pass on next gate evaluation).
- Globbed templates that don't use bullets, tables, OR definition lists (e.g., free-text "Affected Files" section). Out of scope; the criterion isn't asking the template to be free-text.
- Removing `listed-item` from the vocabulary — kept for `dod-declared` and any future bullet-only criteria.
- Sprint plan section (Risks & Dependencies uses tables but isn't gate-checked under shape #3 today; CR-027 adds `risk-table-populated` via shape #2 instead).

## 4. Verification Protocol

**Acceptance:**

1. **Bug reproduces pre-CR.** In the markdown_file_renderer test folder, `cleargate gate check .cleargate/delivery/pending-sync/STORY-001-01_*.md` reports `❌ implementation-files-declared: section 3 has 0 listed-item (≥1 required)`. Post-CR: same command reports section 3 has ≥1 declared-item; criterion passes.
2. **Six criteria all migrate.** `grep "listed-item" .cleargate/knowledge/readiness-gates.md` returns ≤2 matches (the vocabulary definition + the dod-declared criterion). `grep "declared-item" .cleargate/knowledge/readiness-gates.md` returns ≥7 matches (vocabulary + six migrated criteria).
3. **Vocabulary §3 doc complete.** Manual read: vocabulary §3 names `listed-item`, `checked-checkbox`, `unchecked-checkbox`, `declared-item` with one example each.
4. **Tests cover all 8 scenarios** (bullets, tables, mixed, def-list, empty, header-only, mixed-all, dod regression).
5. **End-to-end re-test.** Re-run the markdown_file_renderer scenario after CR-030 + CR-031 + CR-032 + CR-034 land. The 10 stories that today fail `implementation-files-declared` start passing it.
6. **Scaffold mirror diffs empty.** `diff` returns empty for readiness-gates.md and readiness-predicates.ts mirrors.

**Test commands:**

- `cd cleargate-cli && npm run typecheck && npm test` — green.
- `cd cleargate-cli && npm test -- readiness-predicates` — focused.
- Manual smoke: gate check the test folder's STORY-001-01 → confirms pass post-CR.

**Pre-commit:** typecheck + tests green; one commit `feat(CR-034): declared-item predicate accepts tables + def-lists; six criteria migrated`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic explicitly declared (predicate counts bullets only; six criteria using shape against table-format sections).
- [x] All impacted downstream items identified (pre-existing failing items pass on next eval; intended signal).
- [x] Execution Sandbox names exact files + per-criterion migration list.
- [x] Verification protocol with reproducer + 6 acceptance scenarios + 8 unit-test cases.
- [ ] **Open question:** Template layer vs predicate layer (§0.5 Q1).
- [ ] **Open question:** Extend `listed-item` vs new `declared-item` (§0.5 Q2).
- [ ] **Open question:** Which six criteria migrate (§0.5 Q3).
- [x] ~~**Open question:** Sprint inclusion (§0.5 Q4).~~ Resolved 2026-05-03: SPRINT-21 (W2).
- [ ] `approved: true` is set in the YAML frontmatter.
