---
cr_id: CR-030
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
  Live evidence 2026-05-03 from end-to-end install test in
  /Users/ssuladze/Documents/Dev/markdown_file_renderer (cleargate@0.10.0, fresh
  init). User pasted a stakeholder spec; agent triaged it as INITIATIVE-001
  (correct), drafted the file, moved pending-sync → archive with
  status: "Triaged" + triaged_at + spawned_items: ["EPIC-001"] (correct lifecycle).

  Three hook errors fired silently in `.cleargate/hook-log/gate-check.log` on
  every Initiative write:
    1. [stamp-tokens] error: cannot determine work_item_id from frontmatter or
       filename (regex at cleargate-cli/src/commands/stamp-tokens.ts:204+213
       only matches STORY|EPIC|PROPOSAL|CR|BUG; INITIATIVE/INIT absent).
    2. [cleargate gate] error: unable to detect work-item type from frontmatter
       (cleargate-cli/src/lib/work-item-type.ts:8 — WorkItemType union has 5
       members, no 'initiative'; FM_KEY_MAP at L14-20 has no initiative_id;
       PREFIX_MAP at L25-31 has no INITIATIVE-).
    3. wiki ingest: cannot determine bucket
       (cleargate-cli/src/wiki/derive-bucket.ts:9-16 PREFIX_MAP has 6 entries,
       no INITIATIVE).

  Net effect: Initiative is invisible to the gate engine, the token ledger, and
  the wiki. The user's wiki has 5 synthesis pages + epics/EPIC-001.md, but no
  initiatives/ bucket — the planning-first source artifact never enters the
  awareness layer it's supposed to seed.

  Bonus failure: even when an Epic correctly references an archived Initiative
  via `context_source: INITIATIVE-NNN_*.md`, the `proposal-approved` predicate
  fails because Initiatives stamp `triaged_at` + `status: "Triaged"`, never
  `approved: true`. Predicate is hardcoded to one shape (Proposal's). Per-type
  field map needed.

  Also: ID-shape inconsistency in initiative.md template — filename uses
  INITIATIVE-NNN (L11, L19, L23), frontmatter declares
  `initiative_id: "INIT-NNN"` (L29), and Epic `parent_cleargate_id: INIT-001`
  (observed in test). Three shapes for one entity. Pick one.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T17:47:41Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-030
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:45:54Z
  sessions: []
---

# CR-030: Initiative + Sprint First-Class Citizenship — Bucket, Type Detection, Token Stamp, ID Normalization, Predicate Field Map

> **AMENDED 2026-05-03**: Scope expanded from Initiative-only to Initiative + Sprint after the
> markdown_file_renderer test surfaced the same hook-error pair against `SPRINT-01_*.md`:
> ```
> [stamp-tokens] error: cannot determine work_item_id from frontmatter or filename: SPRINT-01_*.md
> [cleargate gate] error: unable to detect work-item type from frontmatter in: SPRINT-01_*.md
> ```
> Same root cause: `WorkItemType` union and `stamp-tokens.ts` regex omit SPRINT. Wiki worked
> (derive-bucket has SPRINT); stamp + gate did not. Fix is identical pattern — add SPRINT
> alongside INITIATIVE in the same files.

## 0.5 Open Questions

- **Question:** ID shape — pick `INITIATIVE-NNN` (long form, matches filename) or `INIT-NNN` (short form, matches current `initiative_id` field)?
  - **Recommended:** **`INITIATIVE-NNN`** — matches the filename convention and is consistent with EPIC/STORY/PROPOSAL (full noun, not abbreviation). Cost: edit `initiative.md` template L29 + any seeded examples. The current 0.10.0 dogfood has zero shipped Initiatives so blast radius is one test artifact.
  - **Human decision:** ✅ `INITIATIVE-NNN` (confirmed 2026-05-03 during SPRINT-21 Brief review). All downstream surfaces (`WorkItemType` union, `PREFIX_MAP`, `FM_KEY_MAP`, `stamp-tokens.ts` regex, `derive-bucket.ts`) use the long form.

- **Question:** `proposal-approved` predicate — promote to per-type field map vs add Initiative-specific `initiative-triaged` criterion?
  - **Recommended:** rename criterion to `parent-approved` and define per-type field semantics in the gate definition itself: when `context_source` resolves to an Initiative, check `frontmatter(context_source).status == "Triaged"`; when it resolves to a Proposal, check `frontmatter(context_source).approved == true`. Avoids predicate-engine surgery; the gate authoring layer already lives in `readiness-gates.md`.
  - **Human decision:** ✅ rename to `parent-approved` with per-type field semantics (confirmed 2026-05-03). Architect SDR pins exact line ranges in `readiness-gates.md` + grep for any hardcoded `proposal-approved` callers across the codebase.

- **Question:** Sprint inclusion — fold into SPRINT-20 alongside CR-027/CR-028 or off-sprint?
  - **Recommended:** ~~SPRINT-20 if not yet activated; otherwise off-sprint~~. **Stale rec — SPRINT-20 shipped in commit `618fadc` (cleargate@0.10.0).** Defaults to SPRINT-21.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). Listed in §1 Consolidated Deliverables as W3 Developer dispatch 6.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- `cleargate-cli/src/wiki/derive-bucket.ts:9-16` — PREFIX_MAP has 6 entries (epic/story/sprint/proposal/cr/bug). Initiative absent.
- `cleargate-cli/src/lib/work-item-type.ts:8` — `WorkItemType` union: 5 members. No `initiative`.
- `cleargate-cli/src/lib/work-item-type.ts:14-20` — `FM_KEY_MAP`: 5 entries. No `initiative_id`.
- `cleargate-cli/src/lib/work-item-type.ts:25-31` — `PREFIX_MAP`: 5 entries. No `INITIATIVE-`.
- `cleargate-cli/src/lib/work-item-type.ts:69-75` — `WORK_ITEM_TRANSITIONS`: 5 entries. No `initiative` key.
- `cleargate-cli/src/commands/stamp-tokens.ts:204` and `:213` — regex `^(STORY|EPIC|PROPOSAL|CR|BUG)-\d+(-\d+)?` excludes INITIATIVE.
- `.cleargate/templates/initiative.md:29` — `initiative_id: "INIT-{NNN}"` uses short form while filename + body header use `INITIATIVE-{NNN}`.
- `.cleargate/knowledge/readiness-gates.md` — `proposal-approved` predicate `frontmatter(context_source).approved == true` assumes context_source is always a Proposal. Initiative-typed context_sources never carry `approved`; predicate fails by construction.

**New Logic (The New Truth):**

Initiative becomes a recognized work-item type across every framework surface. Five concrete changes:

**1. Bucket.** `derive-bucket.ts` PREFIX_MAP gains `{ prefix: 'INITIATIVE-', type: 'initiative', bucket: 'initiatives' }`. `WikiPageType` union (in `page-schema.js`) gains `'initiative'`.

**2. Type detection.** `work-item-type.ts`:
- `WorkItemType` union gains `'initiative'`.
- `FM_KEY_MAP` gains `{ key: 'initiative_id', type: 'initiative' }`.
- `PREFIX_MAP` gains `{ prefix: 'INITIATIVE-', type: 'initiative' }`.
- `WORK_ITEM_TRANSITIONS` gains `initiative: ['ready-for-decomposition']`.

**3. Token stamp.** `stamp-tokens.ts` regexes (L204, L213) extended to `^(STORY|EPIC|PROPOSAL|CR|BUG|INITIATIVE)-\d+(-\d+)?` (longest alternative ordering preserved per BUG-010 lesson).

**4. ID normalization.** `initiative.md` template L29 changes from `initiative_id: "INIT-{NNN}"` to `initiative_id: "INITIATIVE-{NNN}"`. Single canonical shape across filename, frontmatter, and cross-references. The `INIT-` short form is evicted.

**5. Predicate field map.** Rename `proposal-approved` → `parent-approved` in `readiness-gates.md` for all enforcing Epic gates. The new criterion is type-aware:
```yaml
- id: parent-approved
  check: |
    if-type(context_source) == 'initiative' then frontmatter(context_source).status == 'Triaged'
    if-type(context_source) == 'proposal'   then frontmatter(context_source).approved == true
```
Implementation can be one of two paths (decided at sandbox time): (a) extend predicate grammar with `if-type(...)` shape; (b) emit two separate criteria (`initiative-triaged` and `proposal-approved`) and have gate evaluator OR them when context_source resolves. Path (b) is simpler — closed predicate grammar stays intact; gate authoring carries the type-aware OR.

Add new readiness gate entry `initiative.ready-for-decomposition` (advisory severity, mirroring proposal): criteria = `no-tbds`, `user-flow-populated` (`section(1) has ≥1 listed-item`), `success-criteria-populated` (`section(5) has ≥1 listed-item`). Initiative gates are advisory because Initiatives are stakeholder-authored intent, not engineering commitments.

## 2. Blast Radius & Invalidation

- [x] **Test-folder evidence (one Initiative).** The dogfood live repo (this ClearGate meta-repo) has zero shipped Initiatives. Test folder has one (the markdown_file_renderer test). Backwards-compat impact: zero shipped artifacts to migrate.
- [x] **Update Epic:** **EPIC-008** is the parent (extends predicate engine + work-item type system). Same lineage pattern as CR-008/CR-027/CR-028.
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** `cleargate_pull_initiative` (already shipped per protocol §Initiative Intake) — verify pull continues to write `initiative_id: INITIATIVE-NNN` post-rename. If the MCP-side template still emits `INIT-NNN`, that's an out-of-band fix.
- [ ] **Audit log:** `work_item_id` column in token-ledger.jsonl will start carrying `INITIATIVE-NNN` rows. Pre-existing rows unaffected.
- [ ] **Wiki:** `wiki/initiatives/` bucket appears on first ingest. Wiki index gets a new section. `wiki build` rebuild needed once after deploy.
- [ ] **Templates:** only `initiative.md` itself changes (L29 ID shape). No other template references INIT-/INITIATIVE-.
- [ ] **Existing predicate `proposal-approved`:** renamed to `parent-approved` across all 5 enforcing Epic gates. Pre-existing Epic frontmatter `cached_gate_result.failing_criteria` may carry the old name temporarily; staleness check (`last_gate_check < updated_at`) will trigger re-evaluation on next edit.
- [ ] **FLASHCARD impact:** add card on completion — *"Initiative is a first-class work item: regex/PREFIX_MAP/WikiPageType all carry INITIATIVE-NNN; predicate `parent-approved` is type-aware (Initiative→status:Triaged; Proposal→approved:true)."*
- [ ] **Scaffold mirror:** every modified `.cleargate/scripts/` and `.cleargate/templates/` file must be byte-equal in `cleargate-planning/` mirror.
- [ ] **0.10.0 dogfood backfill:** the one in-flight test Initiative (markdown_file_renderer) gets re-stamped automatically when the agent re-edits it under the new CLI version. No manual migration.

## Existing Surfaces

> L1 reuse audit. Surfaces this CR extends (already cited in §1 Obsolete Logic with line numbers).

- **Surface:** `cleargate-cli/src/lib/work-item-type.ts:8-75` — `WorkItemType` union, `FM_KEY_MAP`, `PREFIX_MAP`, `WORK_ITEM_TRANSITIONS` — currently 5 entries; this CR adds `initiative` + `sprint`.
- **Surface:** `cleargate-cli/src/wiki/derive-bucket.ts:9-16` — bucket router `PREFIX_MAP` has SPRINT but missing INITIATIVE.
- **Surface:** `cleargate-cli/src/commands/stamp-tokens.ts:204,213` — work-item-id regex excludes INITIATIVE + SPRINT.
- **Surface:** `cleargate-planning/.cleargate/templates/initiative.md:29` — template seeds `INIT-NNN`; this CR aligns to `INITIATIVE-NNN`.
- **Surface:** `.cleargate/knowledge/readiness-gates.md` — `proposal-approved` criterion renames to `parent-approved` with per-type field semantics.
- **Why this CR extends rather than rebuilds:** five disjoint engine sites already encode the work-item type contract; the change is additive (new union members + new regex disjuncts), no rewrite needed.

## 3. Execution Sandbox

**Modify (CLI / engine — 4 files):**

- `cleargate-cli/src/wiki/page-schema.ts` — `WikiPageType` union: add `'initiative'`. (Sprint already in union — verify.)
- `cleargate-cli/src/wiki/derive-bucket.ts:9-16` — PREFIX_MAP: add `{ prefix: 'INITIATIVE-', type: 'initiative', bucket: 'initiatives' }`. SPRINT entry already present (`derive-bucket.ts:12`); no change there.
- `cleargate-cli/src/lib/work-item-type.ts` — extend all four exports (union + FM_KEY_MAP + PREFIX_MAP + WORK_ITEM_TRANSITIONS) with **both** `initiative` and `sprint`:
  - `WorkItemType` union gains `'initiative'` and `'sprint'`.
  - `FM_KEY_MAP` gains `{ key: 'initiative_id', type: 'initiative' }` and `{ key: 'sprint_id', type: 'sprint' }`.
  - `PREFIX_MAP` gains `{ prefix: 'INITIATIVE-', type: 'initiative' }` and `{ prefix: 'SPRINT-', type: 'sprint' }`.
  - `WORK_ITEM_TRANSITIONS` gains `initiative: ['ready-for-decomposition']` and `sprint: ['ready-for-execution']` (the latter aligns with CR-027's planned `sprint.ready-for-execution` gate; if CR-027 hasn't shipped, the transition is declared but no gate criteria run yet — non-fatal).
- `cleargate-cli/src/commands/stamp-tokens.ts:204,213` — regex extended to `(STORY|EPIC|PROPOSAL|CR|BUG|INITIATIVE|SPRINT)-\d+(-\d+)?` (longest-alternative-first preserved per BUG-010 lesson — INITIATIVE before SPRINT before shorter prefixes).

**Modify (templates — 1 file + 1 mirror):**

- `.cleargate/templates/initiative.md:29` — `initiative_id: "INIT-{NNN}"` → `initiative_id: "INITIATIVE-{NNN}"`.
- `cleargate-planning/.cleargate/templates/initiative.md` — byte-equal mirror.

**Modify (readiness gates — 1 file + 1 mirror):**

- `.cleargate/knowledge/readiness-gates.md` — three changes:
  1. Rename `proposal-approved` → `parent-approved` in 5 enforcing Epic gate entries (epic.ready-for-decomposition, story.ready-for-execution, cr.ready-to-apply, bug.ready-for-fix — wherever the criterion currently appears).
  2. Add Path (b) implementation: split into `initiative-triaged` (`frontmatter(context_source).status == "Triaged"`) and `proposal-approved` (`frontmatter(context_source).approved == true`). Gate evaluator picks based on `context_source` resolution. (Or implement Path (a) per §0.5 Q2.)
  3. Add new gate entry `initiative.ready-for-decomposition` (advisory): `no-tbds`, `user-flow-populated`, `success-criteria-populated`.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-equal mirror.

**Modify (gate evaluator — 1 file, conditional):**

- `cleargate-cli/src/lib/readiness-predicates.ts` — only if Path (a) chosen (§0.5 Q2). Adds `if-type(...)` predicate shape. If Path (b), no engine change needed.

**Tests (2-3 files):**

- `cleargate-cli/test/wiki/derive-bucket.test.ts` — add scenarios:
  - `INITIATIVE-001_foo.md` → `{ type: 'initiative', id: 'INITIATIVE-001', bucket: 'initiatives' }`.
  - `SPRINT-01_foo.md` → existing scenario (verify still passes).
- `cleargate-cli/test/lib/work-item-type.test.ts` — add scenarios for all four exports recognizing **both** new types:
  - `initiative_id` + `INITIATIVE-` prefix + `initiative` transition list.
  - `sprint_id` + `SPRINT-` prefix + `sprint` transition list (regression: SPRINT-NN previously returned `null`).
- `cleargate-cli/test/commands/stamp-tokens.test.ts` — two new fixtures:
  - `INITIATIVE-001_test.md` → stamp succeeds, work_item_id captured.
  - `SPRINT-01_test.md` → stamp succeeds, work_item_id captured (regression: previously logged `cannot determine work_item_id`).
- `cleargate-cli/test/lib/readiness-predicates.test.ts` — add scenarios:
  - Epic with `context_source: INITIATIVE-NNN_*.md` → `parent-approved` (or `initiative-triaged`) passes when Initiative has `status: "Triaged"`.
  - Epic with `context_source: PROPOSAL-NNN_*.md` → `proposal-approved` passes when Proposal has `approved: true`.

**Out of scope:**

- `resolveLinkedPath` archive fallback (the *cross-directory* lookup bug observed in the same test). That's a separate concern, filed as **CR-031** below — the predicate engine bug affects all types, not just Initiative.
- Capability index / `wiki/capabilities/` — filed under CR-028's CR-029-suggested follow-up.
- Migrating shipped INIT-NNN frontmatter — none exist; not applicable.

## 4. Verification Protocol

**Acceptance:**

1. **Bucket recognized.** `node -e "console.log(require('./cleargate-cli/dist/wiki/derive-bucket.js').deriveBucket('INITIATIVE-001_foo.md'))"` returns `{ type: 'initiative', id: 'INITIATIVE-001', bucket: 'initiatives' }`. Pre-CR: throws.
2. **Type detection.** Author a fixture Initiative with `initiative_id: INITIATIVE-001`. Run `cleargate gate check <fixture>`. Pre-CR: stderr `unable to detect work-item type`. Post-CR: gate runs, advisory severity, criteria evaluated.
3. **Token stamp.** Edit a fixture Initiative; PostToolUse stamp-and-gate hook fires; `cleargate-cli/src/commands/stamp-tokens.ts` writes `work_item_id: INITIATIVE-001` to `token-ledger.jsonl`. Pre-CR: stderr `cannot determine work_item_id`.
4. **Wiki ingest.** Edit a fixture Initiative; `wiki ingest` creates `.cleargate/wiki/initiatives/INITIATIVE-001.md`. Pre-CR: stderr `cannot determine bucket`.
5. **`parent-approved` resolves Initiative.** Author Epic with `context_source: INITIATIVE-001_foo.md` referencing a triaged Initiative (`status: "Triaged"`). Run gate check. Assert `parent-approved` (or `initiative-triaged` per Path b) passes. Pre-CR: fails with "linked file not found" or wrong-field check.
6. **`proposal-approved` still resolves Proposal.** Same with `context_source: PROPOSAL-NNN.md` and Proposal `approved: true`. Assert pass. Regression baseline.
7. **ID normalization.** `grep -r "INIT-" .cleargate/templates/` returns zero matches (template uses INITIATIVE-). The one in-flight test artifact (markdown_file_renderer) gets re-stamped on next agent edit.
8. **Scaffold mirror diffs empty.** `diff` returns empty for all template + readiness-gates pairs.
9. **End-to-end re-test.** Re-run the markdown_file_renderer install test scenario from scratch. Assert: zero hook errors against the Initiative, wiki contains `initiatives/INITIATIVE-001.md`, Epic gate passes `parent-approved` against the archived Initiative.

**Test commands:**

- `cd cleargate-cli && npm run typecheck && npm test` — green.
- `cd cleargate-cli && npm test -- derive-bucket work-item-type stamp-tokens readiness-predicates` — focused.
- Manual smoke: blow away `markdown_file_renderer/.cleargate/`, re-init with the post-CR CLI, paste the same Initiative spec, watch hook log stay clean.

**Pre-commit:**

- `npm run typecheck` clean.
- `npm test` green.
- All scaffold mirror diffs empty.
- One commit, conventional format: `feat(CR-030): initiative as first-class work item (bucket+type+stamp+id+predicate)`.
- Never `--no-verify`.

**Post-commit:**

- Move `.cleargate/delivery/pending-sync/CR-030_*.md` to `.cleargate/delivery/archive/`.
- Append flashcard line.
- Wiki re-ingest (PostToolUse hook handles automatically).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):

- [x] "Obsolete Logic" to be evicted is explicitly declared (5 code locations + 1 template line + 1 predicate criterion, all cited with line numbers).
- [x] All impacted downstream items identified (zero shipped Initiatives in dogfood; one in-flight test artifact auto-migrates).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command provided with 9 acceptance scenarios.
- [x] ~~**Open question:** ID shape — INITIATIVE-NNN vs INIT-NNN (§0.5 Q1).~~ Resolved 2026-05-03: `INITIATIVE-NNN`.
- [x] ~~**Open question:** Predicate Path (a) `if-type` grammar vs Path (b) split criteria (§0.5 Q2).~~ Resolved 2026-05-03: rename to `parent-approved` with per-type field semantics.
- [x] ~~**Open question:** Sprint inclusion vs off-sprint (§0.5 Q3).~~ Resolved 2026-05-03: SPRINT-21.
- [ ] `approved: true` is set in the YAML frontmatter.
