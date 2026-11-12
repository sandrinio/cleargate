# STORY-063-08 TPV (role: architect, Mode: TPV)

Branch `story/STORY-063-08` in `cleargate-cli/` at QA-Red `ab2ed87` (cut from `65f2708`). This review is read-only: no test or production file was edited, and no build was run. The plan is `.cleargate/sprint-runs/_off-sprint/EPIC-063/plans/M2.md`. Rulings are written into M2.md under Amendments as **G-M2-38 … G-M2-45**.

**TPV: BOUNCE.** The tests faithfully cover C8, the story's Gherkin and G-M2-11..14, with two exceptions:
- One check is red for the wrong reason: the G1 live sweep's structural-cut oracle fails a correct implementation.
- Five rulings below change or narrow Architect-specified behaviour and need pins.

The fix list is short and mechanical.

## Red-run evidence (`TMPDIR=$(mktemp -d /tmp/tpv.XXXX)`, `npx tsx --test`)

| File | tests | fail | why |
|---|---|---|---|
| `extract-sections.red.node.test.ts` | 75 | 75 | 60 × `ERR_MODULE_NOT_FOUND` on `src/wiki/extract-sections.js`; 6 × `reportBody.trim is not a function` (old `buildReportBlock` signature); 9 × page-schema assertions (no identity line, extract length 0, deleted exports still present, `buildPlanStub` has no Goal) |
| `extract-sections-pages.red.node.test.ts` + `-sources.red.node.test.ts` | 47 | 44 | page cases fail on the missing identity line, parts and report extract, and a too-large SPRINT-44 page; source cases fail on the old §10.4 and agent text. The 3 green tests are the declared anchors (`--check`, the §10.4 relations note, the ingest guards). |

Every red has the stated cause. No case fails on a file-load error. The live sweep was not run: it is a 280 s build on a scratch copy, it is red by construction (`loadExtract`), and its oracle is analysed statically below.

## Coverage check (Gherkin + blueprint + G-M2-11..14)

| Requirement | Covered by | Verdict |
|---|---|---|
| Outline epic / bug / CR / sprint (both writers) | pages :31-128 | ok |
| Identity block (status, sprint, gate, severity) | pages + unit C8.1 :632-660 | ok |
| Budget 2,000–2,400; no XML or table cut; markers name the raw path | pages :133-174, unit allocateBudget/safeCut | ok |
| Legacy fallback | pages :178-195, unit :375-440 | ok (pins added below, G-M2-39) |
| Parity, build vs ingest (EPIC-058, SPRINT-44 plan then report, plus others) | pages :199-221 | ok |
| Error: unclosed `<agent_context>`, empty body, build exits 0 | pages :225-255 | ok (fence pin added below) |
| G-M2-14 Testing Strategy between §5 and §6 | pages :259-274, unit EPIC-901 | ok |
| C8.4 pairing units | unit :155-245 | ok (`line` pinned below) |
| C8.6 digest | unit | ok |
| C8.7 report block, 1,200 cap, pointer | unit :687-750, pages | ok (pointer form pinned below) |
| G-M2-11 protocol, ingest/query agents, Codex TOMLs | sources | gaps: double-write steps and the children/cited_by guidance are unpinned |
| Purity rule (`extract-sections.ts` pure, type-only `page-schema` import) | — | **missing** |
| G1 live sweep | corpus live | **oracle defect** |

**Over-pinning:** none found. The page-level tests pin structure and sentinels, not full-body goldens, so the Developer seals nothing. That is correct now that 13 has landed.

**Vacuous passes:** two weak cases, fix 9.

## Edited pre-existing tests (do they still guard what they guarded?)

- **`page-builder-shared`:** the truncation and Open-questions guarantees move to `allocateBudget` and `findSection` with the same assertions (marker names the raw path, no mid-word cut, max respected, real remainder, empty section is null). Rendering of an unresolved question is still asserted through `buildPageBody`. **Kept.**
- **`build-ingest-parity`:** the long text moves under `## 1. Problem & Value`. Parity and the marker remain the assertions. **Kept.**
- **`build-sprint-reports.red`, `sprint-report-markers.red`:**
  - The narrative moves under `### Carried Over`, the only report text the block carries.
  - Every F1 inline-quote case still passes the quote through the block verbatim.
  - The `extractReportBlock`/`extractPlanStub` equalities are unchanged.
  - **Kept.**
- **`relations.red`:** the CR fixture now has §1 and an unresolved §0.5 pair. Amendment 5's "relations after Open questions" still has an Open questions part to be after. **Kept.**
- **`relations-f1.red`:**
  - The `## Notes` / `## Sprint Goal` / `## 1. Problem & Value` / `### Carried Over` wrappers keep the inline and fenced full-line marker quotes on the page.
  - The fenced `## Relations` case still exercises 13-F1's last-marker search, because the fallback must not treat a fenced `##` as a section (G-M2-39).
  - **Kept.**
- **`relations-handlers.red`, `wiki-ingest-sprint-report.red`:** the sentinels sit under extracted headings. I found no other `includes(` on report body text in the 760-line file: the remaining hits are markers, ids, stdout, and the source-text checks at :724/:729. **Kept.**

## Rulings on QA-Red ambiguities 1–10

1. **Scope sub-allocation → G-M2-38.** Scope is rendered as `**In:**` + In lines + `**Out:**` + Out lines. When cut, its share is water-filled half and half between the two lists, each list is cut with `safeCut`, and one marker ends the part. Mechanism: an optional `ExtractPart.segments`.
2. **Fallback preamble → G-M2-39.** Text between the H1 and the first H2, after drops, is a first part labelled `Overview`. An H1-only item stays empty.
3. **Report-only sprint, plan side → G-M2-40.** No special case. The fallback runs over the report body (type `sprint`, no Goal/Deliverables). Parity is already covered by 13's report-only cases (`relations-handlers` "report-only sprint named as a parent", `relations-f1` F2).
4. **Improvement pointer → G-M2-41.** The full repo-relative path is `.cleargate/sprint-runs/<ID>/improvement-suggestions.md`, built from the report's rel dirname. Both callers compute it the same way.
5. **Scenario 5 region → G-M2-42.** The region runs from after the identity line to the full-line `RELATIONS_BEGIN` and equals `allocateBudget`'s output. That output, separators included, is ≤ max. The tests already measure it this way.
6. **Scope headers → G-M2-38.** Source markers are bold lines containing `IN-SCOPE` / `OUT-OF-SCOPE` (plus `**In:**`/`**Out:**`). `**In:**`/`**Out:**` are the rendered sub-labels.
7. **Protocol and agents → G-M2-43.**
   - Protocol: 08 owns §10.4 (opener, body example, body field note) plus one clause in §10.2's ingest paragraph. §10.1 stays with 09/10/11. The existing §10.1–§10.2 test passes on that clause and stays as written.
   - Ingest agent: steps 4–10 collapse into one `cleargate wiki ingest <raw_path>` hand-off. That command writes the page, the neighbours, the index row, the log event and synthesis; no manual index or log step remains.
   - Query agent: gets the new example plus "answer from fm `children`/`cited_by`".
   - Codex: `gen:codex`.
8. **`DecisionPair.line` and the continuation join → G-M2-44.** `line` is the 1-based line of the opening bullet within `sectionText`. Continuation lines are trimmed and space-joined. A long question is cut to 20 words with `…`. An orphan answer renders `- <answer>`.
9. **`buildPageBody` without `type` and label numbering → G-M2-45 / G-M2-39.** `type` is required. Fallback labels strip the leading number (`1. The Spec` → `The Spec`). A missing status renders `unknown`; `pass:false` with no ids renders `fail`. `buildPlanStub` defaults to `'sprint'`, and ingest's plan branch passes its own type.
10. **Fenced headings in the fallback → G-M2-39.** Confirmed: they are not sections. In addition, drops are line-anchored, and a fenced `<agent_context>` is dropped together with its fence lines, so EPIC-902 leaves no dangling ```` ```xml ````.

## Fix list for QA-Red (numbered; do not touch production code)

1. **`test/wiki/extract-sections-corpus.live.integration.node.test.ts:89` is red for the wrong reason.**
   - `structuralCuts` flags any line that starts with `|` and does not end with `|`, even when the line is a verbatim raw line.
   - Real corpus case: `BUG-057` §2 Reproduction holds a fenced shell continuation, `  | awk '{ if ($0 ~ …) u++; else h++ }`, at section offset ~271. That falls inside the Reproduction share of a correct extract (parts ≈ 2,133 / 827 / 881 / 369 chars → about 540 kept). `BUG-058` §3 has 11 fenced TS-union lines of the same shape.
   - Change: build `const rawLines = new Set(i.body.split('\n').map((l) => l.trimEnd()))` and count a cut only for `structuralCuts(s.extract).filter((l) => !rawLines.has(l.trimEnd()))`. Also say in the header comment that verbatim raw lines are not cuts.
2. **`test/wiki/extract-sections-sources.red.node.test.ts:76-82` (ingest agent): add negatives for the double-write steps (G-M2-43).**
   - The agent no longer contains the manual index-row format `` `| <id> | <type> | <status> | <raw_path> |` ``.
   - It no longer contains a step "Append one YAML event to `wiki/log.md`".
   - Reason: the CLI writes both. A kept manual step double-logs.
3. **Same file :99-104 (query agent): add a pin.** Some non-YAML line, one not starting with whitespace plus a `key:` pattern, contains `children`, `cited_by` and `frontmatter` (case-insensitive). This is the "what belongs to / what cites" instruction from the 13 post-flight §7, and it feeds 12's eval question.
4. **`test/wiki/extract-sections.red.node.test.ts:31` (or a new describe): purity test for the cross-item Purity rule.** Model it on `relations.red.node.test.ts:67`:
   - `src/wiki/extract-sections.ts` has no `from 'node:…'` import;
   - every import of `./page-schema.js` in it is `import type`.
5. **Same file :411-419 (EPIC-902 fallback unit), G-M2-39:**
   - add `assert.deepEqual(labelsOf(parts), ['Problem & Value', 'Scope Boundaries'])`, which pins the number strip and shows that section 0 yields no part;
   - add `assert.ok(!all.includes('```'))`.
   - In `extract-sections-pages.red.node.test.ts:227-237` add `assert.ok(!s.extract.includes('```'), 'no dangling fence')`.
6. **New fallback unit cases (G-M2-39), next to :375:**
   - (a) `extractParts('proposal', '# P-1: T\n\nPREAMBLE-SENTINEL text.\n\n## Background\n\nB-TEXT.\n', {})` → labels `['Overview', 'Background']`, with `Overview` text containing `PREAMBLE-SENTINEL`.
   - (b) `extractParts('proposal', '# P-2: T\n\nOnly prose here.\n', {})` → labels `['Overview']`.
   - (c) Body `## A\n\nThe \`<instructions>\` block is guidance. INLINE-KEEP-SENTINEL\n\n<instructions>\nDROP-ME-SENTINEL\n</instructions>\n\n## B\n\nB-TEXT\n`. The joined parts contain `INLINE-KEEP-SENTINEL` and `B-TEXT`, and do not contain `DROP-ME-SENTINEL`.
   - (d) `## 1. The Spec\n\nSPEC-TEXT\n` → label `The Spec`.
   - Add (a)'s pattern to the PROPOSAL-901 assertions only if it stays true there; PROPOSAL-901 has no preamble after the drop, so its existing `slice(0, 3)` pin is unchanged.
7. **Same file :266-273 (EPIC-058 Scope unit), G-M2-38:**
   - add `assert.ok(scope.startsWith('**In:**'))`;
   - add `assert.ok(scope.indexOf('**Out:**') !== -1 && scope.indexOf('**Out:**') < scope.indexOf('Supporting Antigravity'))`.
   - In `extract-sections-pages.red.node.test.ts:44-46` assert that the page's `Scope` part contains both `**In:**` and `**Out:**` and exactly one `bytes not shown` marker, which is its last line. Do not pin `segments`; it is mechanism.
8. **Same file :155-176 (EPIC-063 §6 shape), G-M2-44:**
   - add `assert.equal(pairs[0].line, 1)` and `assert.equal(pairs[1].line, 4)`;
   - add `assert.equal(pairs[1].answer, 'Two milestones, off-sprint. continuation line of the second answer.')`.
9. **Vacuity:**
   - `:560-566` (safeCut table row): add `assert.ok(out.includes('row one one'))`, since an empty result passes today;
   - `:521-527` (allocateBudget `<rule>`): add `assert.ok(kept.includes('<rule>rule 0 '))`, since zero kept rules is "balanced" today.
10. **`:632-639` (Gate) and `:641-644` (Status), G-M2-45:**
    - `fm: { status: 'Approved', cached_gate_result: { pass: false, failing_criteria: [] } }` → `lines[2] === identityLine('Approved', 'none', 'fail')`;
    - `fm: {}` → `lines[2] === identityLine('unknown', 'none', 'not run')`.
11. **`extract-sections-pages.red.node.test.ts:111` (G-M2-41):** tighten the pointer to `block.includes('**Improvement suggestions:** .cleargate/sprint-runs/SPRINT-44/improvement-suggestions.md')`.

A TPV re-check is waivable if the fixes are applied exactly as written (13 precedent); the post-flight checks for drift.

## Notes for the Developer (not test changes)

- **`buildPlanStub` in ingest.** `wiki-ingest.ts:482` calls `buildPlanStub(item)` on the plan branch for **every** type. With C8.7's `type: 'sprint'` forward, an epic ingest would extract as a sprint. G-M2-45 threads `bucketInfo.type`. The parity reds catch this, but fix it up front.
- **Report abs path.** Build's `ReportEntry` (`wiki-build.ts:108`) has no `absPath`. Add it from `listSprintReports` (`src/wiki/sprint-reports.ts:38`) for the G-M2-41 existence check.
- **The `≥ 2,000` floor on EPIC-058.** Three cut parts × (≈117-char marker + label) leave about 420 text chars each. A paragraph-boundary cut at ≥ 50% can drop up to half of that. Expect to need a second pass that hands unused share back to the cut parts.
- **Corpus feasibility.** Sprint plans carry table rows of up to 1,830 chars (SPRINT-23) and 1,021 (SPRINT-44). A Goal + Deliverables estimate cut at line boundaries reaches ≥ 2,000 for every sprint that overflows; SPRINT-44 fits whole (≈ 1,780).
- **Scope of `<instructions>` handling.** The corpus has 0 typed or fallback items whose in-body `<instructions>` block contains a heading. Typed extraction needs no `<instructions>` skip.

## Script Incidents

None. No `run_script.sh` invocation. Read-only census scripts ran from the session scratchpad against the outer `.cleargate/delivery/`.

## flashcards_flagged

- `2026-11-12 · #tpv #oracle #wiki · A "cut table row" oracle (starts with |, no closing |) flags verbatim raw lines (fenced shell pipes, TS unions); skip lines present in the raw.`
- `2026-11-12 · #wiki #extract · Epic <agent_context> sits inside a ```xml fence; dropping only the tag range leaves a dangling fence that swallows the page. Drop the fence too.`
- `2026-11-12 · #wiki #ingest · wiki-ingest's plan branch calls buildPlanStub for every type; a sprint-defaulted builder there extracts epics as sprints.`
