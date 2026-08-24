---
cr_id: CR-103
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
area: cli
context_source: |
  Direct user request 2026-08-05 ("plan the work to change it please") following a cross-repo
  field report: an EPIC-152 wiki page rendered 623 bytes from a 26,308-byte raw item (2.4%),
  truncated mid-token, and asserted "Open questions: None." as a finding. Every claim in this CR
  was verified against the current source before drafting, not taken from the report:
  wiki-ingest.ts:467-468 and wiki-build.ts:251 (two different truncation algorithms),
  :486 / :268 (the hardcoded literal), :475 / :257 (blast radius, which IS computed — the field
  report was wrong on this point and the correction is reflected in §1), wiki-ingest.ts:539 vs
  wiki-build.ts:357 (two incompatible index row schemas). The reporter's proposed
  "reconcile status from git" item was dropped after discovery that lifecycle-reconcile.ts
  already implements it and EPIC-043 WS5 deliberately hid the command; what survives here is
  only the awareness-layer half — surfacing drift the reconciler already detects.
created_at: 2026-08-05T00:00:00Z
updated_at: 2026-08-05T00:00:00Z
created_at_version: 0.23.0
updated_at_version: 0.23.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-06T07:13:25Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-103
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-06T07:13:24Z
  sessions: []
---

# CR-103: Wiki Page & Index Fidelity — One Builder, No Fabricated Sections

## 0.5 Open Questions

> All three resolved by the owner 2026-08-06. Retained for the decision record; none is open.

- **Question:** What is the right summary budget for a wiki page body — keep 200 chars, or raise it?
- **Recommended:** Raise to ~1200 chars *and* cut on a paragraph/sentence boundary with an explicit
  `[+N,NNN bytes not shown — read <raw path>]` marker. 200 chars cannot carry a work item's purpose;
  1200 is still ~6% of a large item, so the marker (not the budget) is what does the real work.
- **Human decision: RESOLVED 2026-08-06 — accept as recommended.** Budget 1200 chars, cut on a
  paragraph/sentence boundary, explicit not-shown marker naming the raw path. The marker is a hard
  requirement, not a nicety: a page that silently drops content reads as complete, which is the
  defect this CR exists to fix.

- **Question:** Should `## Open questions` be computed from the raw doc's `## 0.5 Open Questions`
  section, or simply omitted?
- **Recommended:** Compute it. Every template ships a `## 0.5 Open Questions` section, so the input
  exists and extraction is a heading scan — the same mechanism `readiness-predicates.ts` already uses.
  Omitting is the safe fallback when the section is absent.
- **Human decision: RESOLVED 2026-08-06 — compute it.** Extract from the raw doc's
  `## 0.5 Open Questions` section by heading scan. When that section is absent or empty, omit the
  `## Open questions` section from the page entirely. The literal `'None.'` is never printed under
  any condition.

- **Question:** Index rows currently carry no title. Adding one changes the index schema — does any
  consumer parse it?
- **Recommended:** `wiki-ingest.ts:616` parses rows to extract IDs; that parser is rewritten as part
  of this CR regardless. Add the title. Grep for other readers before landing.
- **Human decision: RESOLVED 2026-08-06 — yes, add the title column.** The pre-landing grep for
  other index readers remains a required implementation step, not a condition on the decision.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **"The wiki page body represents the raw item."** It does not. It is `fm.description`, or failing
  that a fixed-length prefix of the raw body — 200 characters, cut mid-token, with no ellipsis and
  no indication that anything was dropped. A 26KB item renders as 623 bytes and reads as complete.
- **"There is one page builder."** There are two, and they have drifted.
  `wiki-build.ts:251` uses `body.split('\n')[0]` (first line, then capped); `wiki-ingest.ts:467`
  uses `body.trim().slice(0, 200)` (first 200 chars including newlines). The same raw item produces
  a *different* page depending on which command last touched it.
- **"There is one index schema."** There are two, and they are mutually unparseable.
  `wiki-build.ts:357` writes bullets — `- [[ID]] (type) — Status`. `wiki-ingest.ts:539` writes
  markdown table rows — `| [[ID]] | type | status | path |`. Last writer wins; the row-extraction
  parser at `wiki-ingest.ts:616` cannot read what `build` wrote.
- **"`## Open questions / None.` is a finding."** It is a hardcoded string literal
  (`wiki-ingest.ts:486`, `wiki-build.ts:268`). No input is consulted. It is printed identically for
  every item in every repo.
- **"The index is searchable."** The live index is 1,718 bytes for ~150 items and carries no titles —
  only ID, type, and status. `cleargate wiki query` greps *this file* (`wiki-query.ts`, grep-and-list
  over `index.md`), so a topic query can only match text that appears in an ID or a filename.
- **"Wiki pages have titles." ROOT CAUSE — no ClearGate work item has ever had one.** Both builders
  read `String(fm['title'] ?? item.id)`, but **no template in `.cleargate/templates/` ships a
  `title:` frontmatter key** (verified: zero matches for `^title:` across all six templates). The
  title lives only in the document's body H1. So the fallback fires universally and every page ever
  built carries the H1 `# <ID>: <ID>` — `# CR-001: CR-001`, `# CR-002: CR-002`, for all ~150 pages.
  This is the upstream cause of the unsearchable index: there is no title to put in a row. It also
  means each page emits **two** H1s, since the body prefix that follows begins with the real one.

**New Logic (The New Truth):**

- **One shared page builder.** `buildPageBody` and `buildPlanStub` collapse into a single exported
  function used by both `wiki build` and `wiki ingest`. Byte-identical output for identical input is
  a test assertion, not a convention.
- **One shared index writer,** with the row schema defined in exactly one place and both the writer
  and the parser derived from it.
- **Truncation is never silent.** The summary budget is **1200 characters**, cut on a paragraph or
  sentence boundary — never mid-word, never mid-token. When the body is cut, the page emits an
  explicit `[+N,NNN bytes not shown — read <raw path>]` marker naming the raw file. A page that
  drops content without saying so is worse than no page, because it reads as complete.
- **Uncomputed sections are not printed.** `## Open questions` is **computed** from the raw doc's
  `## 0.5 Open Questions` section by heading scan. When that section is absent or empty, the
  `## Open questions` section is omitted from the page entirely. The literal `'None.'` is never
  printed under any condition.
- **`Affects:` states its own basis.** The empty case reads `no parent/child refs declared in
  frontmatter` — not `None.` **Note:** blast radius *is* genuinely computed from
  `parent_epic_ref`/`parent` + `children` (`wiki-ingest.ts:475`). This is a wording fix, not a
  fabrication fix; only `## Open questions` is fabricated.
- **Every item has a resolvable title.** The shared builder derives it as
  `fm.title ?? <body H1 text> ?? id` — extracting from the body H1 that every template already
  ships, so no template change and no backfill of ~150 archived items is required. Pages emit
  exactly one H1. Adding an explicit `title:` key to the templates is the optional belt-and-braces
  follow-up, deliberately **out of scope here** to keep this CR to the compiler.
- **Index rows carry the title,** so the index is greppable by topic and `cleargate wiki query`
  becomes able to match on something other than an ID.
- **Index status reflects reconciliation.** Where `reconcileLifecycle()` detects that an item's
  declared status contradicts a merged commit, the index marks it (e.g. `Draft ⚠︎ drift`) rather
  than reprinting `fm.status` verbatim. The reconciler is **not** modified and **not** unhidden —
  this CR only surfaces a signal it already produces.

## 2. Blast Radius & Invalidation

- [ ] **Every existing wiki page is regenerated.** Output shape changes for all ~150 pages. This is
      intended; `cleargate wiki build` is a full rebuild by design.
- [ ] **`.cleargate/wiki/index.md` schema changes** (title column added, one canonical row format).
      Any external reader of this file breaks. Grep required before landing.
- [ ] **Three test files assert current page/index text** and must be updated:
      `test/wiki/build.node.test.ts`, `test/scripts/template-stubs.integration.node.test.ts`,
      `test/commands/sprint-archive-stamp.integration.node.test.ts`.
- [ ] **`wiki lint` is unaffected** — verified: `src/wiki/lint-checks.ts` contains no assertion on
      `Open questions`, `Blast radius`, or the summary text.
- [ ] **EPIC-043 WS3 (incremental recompile) overlaps this file.** `recompileSynthesis` in
      `wiki-ingest.ts` was narrowed by [[STORY-043-07]]. Do not re-widen it; this CR touches page
      body + index only.
- [ ] **EPIC-043 WS5 conflict — do NOT unhide `reconcile-lifecycle`.** WS5 marked it `hidden:true`
      deliberately ("keep callable"). This CR consumes the reconciler's output; it does not change
      its surface.
- [ ] Database schema impacts? **No.** Wiki pages are files on disk; no store is touched.
- [ ] Downstream gate reset: none. No open work item depends on the current page shape.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:458-489` (`buildPlanStub`) — builds the
  page body on the ingest path: `fm.description ?? body.trim().slice(0, 200)`, hardcoded `'None.'`
  at :486. This CR replaces it with a call to the shared builder.
- **Surface:** `cleargate-cli/src/commands/wiki-build.ts:248-271` (`buildPageBody`) — the near-duplicate
  on the build path, differing at :251 (`body.split('\n')[0]`) and sharing the hardcoded `'None.'`
  at :268. This CR collapses it into the shared builder.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:530-545,610-665` (`updateIndex`) — writes
  and re-parses index rows in `| [[ID]] | type | status | path |` form.
- **Surface:** `cleargate-cli/src/commands/wiki-build.ts:340-410` (`buildIndex`) — writes the same
  file in `- [[ID]] (type) — Status` bullet form, including nested story rows at :391.
- **Surface:** `.cleargate/templates/{epic,story,CR,Bug,initiative}.md` — none defines a `title:`
  frontmatter key (verified: zero `^title:` matches), which is why `fm['title']` never resolves.
  Read-only evidence for this CR; the builder derives the title from the body H1 instead of
  changing these files.
- **Surface:** `cleargate-cli/src/lib/lifecycle-reconcile.ts` — `reconcileLifecycle()` already
  computes status drift from git commit subjects. This CR **reads** it; it does not modify it.
- **Surface:** `cleargate-cli/src/commands/wiki-query.ts` — grep-and-list over `index.md`; the
  direct beneficiary of adding titles to index rows.
- **Why this CR extends rather than rebuilds:** the wiki compiler, its page schema, its lint pass,
  and its synthesis pages all work and are covered by tests. The defect is localized to two
  drifted copies of one function and two drifted copies of one row format. Unifying four functions
  into two is strictly smaller than a rebuild, and it is a precondition for [[EPIC-052]] —
  a grounding table cannot survive a 200-char truncation.

## Prior work

- [[PROPOSAL-002]] — original Knowledge Wiki design; §2.2 specifies NL synthesis for `wiki query`,
  which the CLI intentionally diverges from (grep-and-list, for testability). This CR does not
  revisit that divergence; it makes the grep target actually contain topic words.
- [[EPIC-032]] — Code Map Awareness Layer; established the `## Code Map` index section this CR's
  index rewrite must preserve.
- [[STORY-032-02]] — Code Map Page Schema; precedent for a page-schema change.
- [[CR-063]] — Ingest Sprint Reports Into Wiki; introduced the plan-stub/report-block split in
  `buildPageBody` that this CR must keep intact.
- [[STORY-043-07]] — Incremental Wiki Synthesis Recompile; adjacent work in the same file.
- No prior item covers page-body truncation, the build/ingest divergence, or index row schema.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/wiki-build.ts`
- `cleargate-cli/src/commands/wiki-ingest.ts`
- `cleargate-cli/src/wiki/page-schema.ts` — new home for the shared page builder + index row schema
- `cleargate-cli/test/wiki/build.node.test.ts`
- `cleargate-cli/test/scripts/template-stubs.integration.node.test.ts`
- `cleargate-cli/test/commands/sprint-archive-stamp.integration.node.test.ts`

**Do NOT modify:**
- `cleargate-cli/src/lib/lifecycle-reconcile.ts` (read-only consumer; EPIC-043 WS5 surface decision stands)
- `cleargate-cli/src/wiki/lint-checks.ts`
- `recompileSynthesis` in `wiki-ingest.ts` (EPIC-043 WS3 / [[STORY-043-07]] territory)

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test`

New assertions required:
1. **Builder parity** — for a fixture item, the page written by `wiki build` is byte-identical to the
   page written by `wiki ingest`. This is the regression lock for the whole CR.
2. **Index parity** — `wiki build` then `wiki ingest` on the same item yields one row, in one schema,
   with no duplicate and no loss. (Today this round-trip is broken.)
3. **Truncation is marked** — a fixture body over the budget produces a page containing the
   not-shown marker and the raw path; the cut lands on a boundary, not mid-word.
4. **No fabricated sections** — a fixture item with no `## 0.5 Open Questions` content produces a
   page with **no** `## Open questions` section. Assert absence, not `'None.'`.
5. **Blast radius wording** — an item with no parent/children renders the "no refs declared" phrasing.
6. **Titles resolve** — a fixture with no `title:` frontmatter but a body H1 produces a page whose
   H1 is the real title, exactly one H1 per page, and an index row carrying that title. Regression
   lock against `# <ID>: <ID>`.
7. **Old logic evicted** — repo-wide grep proves the string literal `'None.'` no longer appears in
   `wiki-build.ts` or `wiki-ingest.ts`, and that `buildPlanStub` has no remaining definition.

**Manual acceptance:** rebuild the live wiki (`cleargate wiki build`) and confirm
`.cleargate/wiki/index.md` shows real titles for all ~150 items and that no page H1 reads
`# <ID>: <ID>`. This CR's own page is the canonical smoke test — it currently renders 529 bytes
from a 13,467-byte source (3.9%) with the H1 `# CR-103: CR-103`.

---

## Context Source

**context_source:** Direct user request 2026-08-05, grounded against the cited source lines above —
each verified by reading the file, not inferred from the field report. Two claims in the originating
report were checked and corrected during drafting: blast radius is computed (not fabricated), and
git-based status reconciliation already ships in `lifecycle-reconcile.ts`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
      (None are impacted — §2 records the two EPIC-043 workstreams to avoid, both already Completed.)
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

**All six criteria pass.** The three §0.5 Open Questions were resolved by the owner 2026-08-06
(1200-char budget with boundary cut + not-shown marker; compute `## Open questions` and omit when
absent; add the index title column). Their decisions are recorded in §0.5 and baked into §1
New Logic. Nothing is blocking.
