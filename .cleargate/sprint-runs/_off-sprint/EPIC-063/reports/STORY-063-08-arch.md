# STORY-063-08 Architect post-flight (role: architect, Mode: Post-Flight)

- Branch `story/STORY-063-08` in `cleargate-cli/`.
- Dev commit `86db1c0`; QA-Red commits `ab2ed87`, `f6a33db`, `6d49a50`. Base `65f2708`.
- Plan: `plans/M2.md`, sections C8, the 08 blueprint, G-M2-38..45 and orchestrator decision 9.
- Off-sprint, so there is no `sprint-context.md` (M2.md line 5).
- The review was read-only:
  - no build, and no wiki build or ingest on the outer repo;
  - the code was exercised only by scratch `tsx` scripts that import `src/wiki/{scan,extract-sections,page-schema}.ts` and read the outer `.cleargate/delivery/` (622 raw items, 344 ingestable);
  - targeted tests were re-run: `extract-sections.red`, `extract-sections-sources.red` and `build-ingest-parity`, 101/101 pass;
  - `build-codex-payload.mjs --check` exits 0.

## Verdict: PASS-WITH-FOLLOW-UPS — **08-F1 before 09**

The implementation matches C8 and G-M2-38..45, and the three accepted deviations are sound. Build and ingest share one builder, and parity holds.

The follow-ups are mostly **spec gaps in C8.4/C8.6** that the real-corpus census exposed, not Developer defects:
- 36% of the pairs counted as "resolved" are placeholder answers;
- 66 answers are swallowed into their question's text;
- 09's digests carry template labels, table rows and inverted meaning for bugs and CRs.

Two `safeCut` guard holes are added to the list. All of it lives in `extract-sections.ts` (08 owns it; 09–11 only import it), so it lands as one F1 before 09. That way 09, 10, 11 and 12 consume the final C8. The rulings are amendments **G-M2-46, G-M2-47 and G-M2-48** in M2.md.

## 1. Contract fidelity

| Contract | Status | Evidence |
|---|---|---|
| C8.1 layout: H1, identity line, extract, relations block, report block | ok | `page-schema.ts:286-302`. The empty-extract line is `(no extractable content — read <raw>)`. The relations block is the last plan-side element (13 amendment 5). |
| Identity line, including G-M2-45 edges | ok | `page-schema.ts` `gateText`/`identityLine`: `unknown` status; `fail` with no ids; `none` for null or `'null'` sprint; bug severity `unset`. |
| C8.2 `findSection` | ok, with one note | `extract-sections.ts:128-141`: levels 2–6, outside fences, number strip, `>` dropped. It returns the **first non-empty** match: when the first matching section is empty it moves on to the next match. That only refines "null when … empty"; 12's oracle must mirror it (G-M2-46). |
| C8.3 `extractAgentContextTag`/`extractRules` | ok | `:150-181`: line-anchored opener, searched inside fences; `null`/`[]` when unclosed. |
| C8.4 `DecisionPair`/`extractDecisionPairs`/`isPlaceholderAnswer` | ok to the letter; **spec gap** | `:187-245`. Faithful to C8.4 and G-M2-44. On the real corpus it misses two answer forms and about ten placeholder tokens (§2, G-M2-46). |
| C8.5 `PAGE_EXTRACT_MAX/MIN`, `ExtractPart` (+`segments`, G-M2-38), `extractParts`, `allocateBudget`, `safeCut` | ok, with two guard holes | Per-type extractors at `:354-445`; fallback with G-M2-39 at `:258-309`; water-fill with markers inside `max` at `:598-658`. The holes are in §4. |
| C8.6 `digestSource`/`digestOf` | names ok; **semantics drift** | `:672-691`. It substitutes `parts[0]` when the typed label is absent. Digests carry template labels and tables (§2, G-M2-47). |
| C8.7 `buildReportBlock({fm, body, rawPath, improvementSuggestionsPath?})` | ok | `page-schema.ts:665-692`. The output matches C8.7; Carried Over ≤ 1,200 through `'#' + allocateBudget(…, 1199)`; `(none recorded)`. Markers and `extractReportBlock`/`extractPlanStub` are unchanged. |
| G-M2-41 pointer | ok, both callers | `wiki-build.ts:128-139` (`ReportEntry.abs` added) and `wiki-ingest.ts:339-343`. |
| G-M2-45 type plumbing | ok | `PageBodyInput.type` is required. `buildPlanStub` defaults to `'sprint'`. Ingest passes `bucketInfo.type` on the plan branch; the report branch derives `'sprint'` (`derive-bucket.ts:51`), matching build's report-only `type: 'sprint'` (`wiki-build.ts:230`). |
| Deleted symbols | ok | `git grep` over `src/` finds no `SUMMARY_BUDGET`, `applyBudget`, `extractOpenQuestions`, `stripLeadingH1` or `cutOnBoundary` outside `extract-sections.ts`. No other `src` consumer reads page-body text. |
| Purity | ok | The only import in `extract-sections.ts` is `import type { WikiPageType }`. `Buffer` is a global, not an I/O import. `page-schema.ts` imports it at runtime with no cycle. |
| Build/ingest parity | ok | Both writers call the same `buildPageBody`/`buildReportBlock`, and both parse frontmatter with `parseFrontmatter` (`scan.ts:80`, `wiki-ingest.ts:196`), so the identity line's nested `cached_gate_result` agrees. |

## 2. Downstream fitness (C9/C10/C11/C12)

- **09** consumes `digestSource`/`digestOf`, and the names and signatures fit. Measured on the 91 open items:
  - SPRINT-18's digest is `| Item | Type | Title | Lane | Complexity | Parallel?`.
  - `Sprint Goal:`, `Expected Behavior:` and `Obsolete Logic (What to Remove / Forget):` spend 2–6 of the 12 words.
  - PROPOSAL-008's digest reads `1.1 Objective Make …`.
  - A bug digest drawn from Anomaly describes the *expected* behaviour (BUG-052: "The pre-commit file-surface gate identifies the story currently in flight"). A CR digest describes the logic being *removed*. Both say the opposite of the item.
  - 4 open digests and 15 open titles contain ` — `. C9.2's `<title>[ — <digest>]` cannot then round-trip through `parseIndexRow`.
  - **G-M2-47** fixes the source and the cleanup. It also makes digests strict per typed label, so 09 scenario 5 holds as written, and it normalises ` — ` in index titles.
  - Performance is fine: 12 ms for the open items' digests, 48 ms for all 344.
- **10** consumes `findSection`, `extractDecisionPairs`, `isPlaceholderAnswer` and `extractRules`, and the names fit. Semantics on the corpus:
  - Of the 553 "resolved" pairs, 198 are placeholders (111× `_populated during Brief review_`, …). The decisions page would print about 200 non-decisions.
  - 66 answers are swallowed: 43 on indented `**Human decision:**` lines (CR-022..026, BUG-024, EPIC-025, STORY-025-0x) and 23 inline (`— **Human Answer:**`, EPIC-048, plus `_Waiting_`/`{Waiting}` on EPIC-030/050). Those answers never reach the page.
  - G4's independent count would agree with the compiler only if both share the same blind spot.
  - **G-M2-46** fixes this. Expected after F1: 402 resolved pairs and 0 swallowed. The only remaining question that contains a marker is STORY-063-10's backticked mention, which is correct.
- **11** uses `isPlaceholderAnswer` (D2's b). After G-M2-46, open items with an open question go from 32 to 47, so the plan's brief estimate ("29 open questions") is stale. No contract change; D2 just reads the amended rule.
- **12** has to implement D2 in shell. G-M2-46 states the rules regex-ready (three marker positions, the code-span parity guard and the placeholder rule) and restates `findSection`'s first-non-empty behaviour.
- `line` (G-M2-44) counts lines in the *cleaned* section text, where `>` lines are dropped. That is monotonic within a section, so C10.2's in-document order is unaffected.

## 3. The three accepted deviations

1. **The fallback drops the fence opener and closer when a dropped element's opener sits in that fence** (`:279-285`). Sound.
   - The risk is content that shares a fence with the dropped element and becomes unfenced.
   - Census: 57 fenced openers, and only BUG-067 has other content in such a fence. BUG-067 is extracted by the typed bug extractor, so the fallback never runs on it.
2. **The word-boundary fill pass** (`:625-656`). Sound for pages.
   - It calls the same `guardedCut` (table back-off, tag back-off, fence close) as the prefer pass. Only the boundary preference changes, so no structural guarantee weakens, and the marker placement and reserve are identical.
   - **Scope leak:** `wantMin = min(PAGE_EXTRACT_MIN, max)` (`:629`). For the report block (`max` 1199) the fill pass therefore runs on almost every over-budget Carried Over, so report extracts end mid-sentence. Probe: an 8-paragraph text at `max` 500 ends `"Paragraph 4 sentence one"`. Decision 9 accepted the pass "only when the first pass is under 2,000". The fix is F1-3(d).
3. **`digestOf` strips the trailing period.** Sound, and kept in G-M2-47 step 7.

## 4. Code quality

- **Dead code:** none. The `applyBudget` family is fully gone, and there is no duplicated heading parser: `findSection`, the fallback and `fenceOpenAtEnd` all share `scan()`.
- **Performance** on the real corpus, all 344 ingestable items:
  - `extractParts` + `allocateBudget` take 99 ms, and the Dev's scratch build of 344 pages took 427 ms, so build stays O(n).
  - Ingest re-extracts one page (under 1 ms); neighbour rewrites splice relations only.
  - `findSection` re-scans the body on each call (about 5 scans per item), which is affordable at these sizes.
- **Guard holes in `safeCut`**, each confirmed by a probe:
  - (a) `backOffTags` (`:489-498`) backs off to the *innermost* element that is open across the cut, because `at` is overwritten in the loop. A nested `<outer><inner>` cut returns `"<outer>"` with no closer.
  - (b) `cutText` (`:530`) closes an open fence with three backticks whatever the opener was. A ```` fence (2 in the corpus) or a `~~~` fence stays open.
  - (c) `cutOnBoundary`'s word boundary (`:465`) is the last space only, so `'intro line\n' + 'x'×300` at 100 cuts to `"intro"`. This was inherited from the old `cutOnBoundary`, but it is cheap to fix with the others.
- **Scope markers (G-M2-38) as built:** 2 closed epics lose 9 §2 lines. In EPIC-024 a bold-only sub-heading ends the lists, which is what the ruling says. In EPIC-053 a bold lead-in containing "in scope" is taken as a marker. Not fixed: both epics are closed, and the behaviour follows the ruling's text.
- **Nit:** `wiki-build.ts:132-138` calls `improvementPathFor` twice, which costs two `existsSync` per report. Cosmetic.

## 5. Docs

- **Protocol §10.2:** the ingest clause is correct, and 13's relations note and 02's `last_contradict_sha` note are untouched.
- **Protocol §10.4 and the query agent:**
  - The example is a **story** page showing `## Problem & Value` and `## Open questions`, which are epic and CR parts. A story takes the fallback (`## The Spec (The Contract)`, with §1.4 inside it).
  - The example's frontmatter says `status: "🟢"` while its identity line says `**Status:** Approved`. Both lines render the same field.
  - "The extract is 2,000–2,400 characters" overclaims: 60 of 344 real pages are shorter because they have less to extract.
- **Ingest agent:** steps 4–10 are collapsed into the hand-off, and the guards and Phase 4 are kept (pins green). But step 4 (`cleargate-wiki-ingest.md:51`) enumerates four synthesis pages, so it goes stale when 10 adds `decisions.md` and 11 adds `brief.md`.
- **Codex TOMLs** are regenerated, and `--check` exits 0.

## 6. Shared surfaces (09–12)

- **`page-schema.ts`:** it now imports `allocateBudget`, `extractParts` and `findSection` at runtime. 09 adds `digestSource`/`digestOf` to the same import and must keep the module free of `node:` imports (C9.1's `Buffer.byteLength` is a global).
- **`wiki-build.ts`:** 08 added `ReportEntry.abs`, `improvementPathFor` and `reportBlockFor` above `writePage`. 10 (scan `onSkip`, decisions write) and 11 (brief write) touch step 6 only, so there is no overlap.
- **`wiki-ingest.ts`:** the private `buildPageBody` gained `type` and `improvementPath`. 09/10/11 edit `rebuildIndex`/`recompileSynthesis`, which are separate regions.
- **Protocol §10.2:** 08's parenthetical sits in the same sentence whose page list 10 and 11 extend. They edit the list only and keep the clause.
- **Ingest agent page list:** F1-4 removes it, so 10 and 11 have nothing to update there. Any later agent edit needs `npm run gen:codex`.

## 08-F1 (lands before 09; one `story/STORY-063-08-F1` branch, QA-Red, Dev; 13-F1 precedent)

Every item is in `src/wiki/extract-sections.ts` unless a path is named. Line numbers are at `86db1c0`. Put the new reds in `test/wiki/extract-sections-f1.red.node.test.ts`. The existing 08 pins stay green: placeholder pins at `extract-sections.red.node.test.ts:261-269` and digest pins at `:640-665`.

### F1-1. G-M2-46 answer forms and placeholders (`:187-245`)
Behaviour: rules 1–5 of G-M2-46. Tests:
- **(a) Indented form.** Input: `- **Question:** Q?\n  **Recommended:** R.\n  **Human decision:** _accept recommended_\n`. Expect exactly one pair: `{question:'Q?', answer:'_accept recommended_', resolved:true, line:1}`.
- **(b) Inline form.** Input: `- **AI Question:** "Q?" — **Human Answer:** **Import directly** for M2.\n  continuation.\n`. Expect `question '"Q?"'`, `answer '**Import directly** for M2. continuation.'`, `line 1`.
- **(c) Code-span guard.** Input: ``- **Question:** count `**Human decision:**` lines?\n- **Human decision:** Yes.\n``. Expect one pair whose question keeps the backticked text and whose answer is `'Yes.'`.
- **(d) Placeholders.**
  - `isPlaceholderAnswer` is **true** for `_populated during Brief review_`, `_(populated during Brief review)_`, `{Waiting}`, `{Waiting for user.}`, `{default-accept}`, `_Waiting_`, `_____`, `*(open)*`, `_pending Gate 1._`, `TBD — default to single sprint`, `Pending owner confirmation at the walkthrough.`
  - It is **false** for `_accept recommended_`, `✅ **Hard-cut** (2026-05-02).`, `Accepted — include footer line.`, `Open the file first, then lint.`, `No unresolved items remain`.
- **(e) Page level.** An epic whose §6 holds one `_populated during Brief review_` pair and one answered pair has `- <q>` under `## Open questions` and `- <q> → <a>` under `## Decisions`.
- **(f) Live tier.** In `extract-sections-corpus.live`, no `Open questions` part line on any epic or CR page contains `**Human Answer` or `**Human decision`.

### F1-2. G-M2-47 digest (`:664-691`)
Behaviour: G-M2-47's `digestSource` and `digestOf` rules. Tests:
- A sprint with Deliverables and no Goal → `''`.
- A bug whose Anomaly has `**Expected Behavior:** A.` and `**Actual Behavior:** B happens.` → `'B happens'`.
- A CR whose Context override has Obsolete and New labels → the digest comes from New.
- `**Sprint Goal:** Ship it. More.` → `'Ship it'`.
- A proposal body of `### 1.1 Objective\nMake config real.` → `'Make config real'`.
- A table-only text → `''`.
- `The Connector — a planned service.` → `'The Connector, a planned service'`.
- A leading fenced block is skipped.

### F1-3. `safeCut` guards
- **(a) `backOffTags` (`:489-498`).** Back off to the line start of the **earliest** opener still open across the cut, i.e. the outermost one. Test: `safeCut('<outer>\n<inner>\n' + 'word '.repeat(60) + '\n</inner>\n</outer>\nafter', 150)` contains no `<outer>` without `</outer>`.
- **(b) `cutText` (`:530`).** Close an open fence with the opener's own delimiter (same character, same length). Test: a ```` fence cut mid-content ends with a ```` line; a `~~~` fence ends with `~~~`.
- **(c) `cutOnBoundary` (`:465`).** The word boundary is the last whitespace character (space, tab or newline). Test: `safeCut('intro line\n' + 'x'.repeat(300), 100) === 'intro line'`.
- **(d) `allocateBudget` (`:629`).** Run the fill pass only when `max >= PAGE_EXTRACT_MIN` (decision 9's scope). Test: 8 paragraphs of two sentences each through `allocateBudget(…, 500)` keep text ending in `.`. A `buildReportBlock` whose Carried Over exceeds 1,200 keeps text that ends on a sentence or paragraph boundary.

### F1-4. Docs
- **`scaffold/core/.cleargate/knowledge/cleargate-protocol.md`**, §10.4 example:
  - `:283` → `status: "Approved"`;
  - `:296` → `## The Spec (The Contract)`;
  - delete the `## Open questions` part at `:301-302`.
- **The same file, `:316`, and `scaffold/hosts/claude/.claude/agents/cleargate-wiki-query.md:118`:** replace "The extract is 2,000–2,400 characters" with "The extract is at most 2,400 characters, and at least 2,000 when the raw item has more than that to extract". This keeps the source test's `2,000`/`2,400` pin (`extract-sections-sources.red:56`).
- **Query agent example (`:91`, `:103`):** the same two edits as the protocol example.
- **`cleargate-wiki-ingest.md:51`:** replace the four-page list with "the synthesis pages listed in protocol §10.2".
- Then run `npm run gen:codex`; `node scripts/build-codex-payload.mjs --check` must exit 0.

### F1-5. Evidence
Re-run `extract-sections-corpus.live` (G1) on a scratch copy and record:
- the resolved and open pair counts; expected 402 resolved;
- the epic and CR pages carrying `## Open questions`, before and after.

The delivery tree's md5 must be unchanged.

## Amendments written to M2.md
- **G-M2-46:** C8.4 answer forms (indented, inline with a code-span guard, `Recommended` in any position) and the placeholder rule. It binds 08-F1, 10's page and live count, 11 D2 and the 12 oracle (including `findSection`'s first-non-empty rule).
- **G-M2-47:** C8.6 digest source (strict typed labels; Actual Behavior and New Logic paragraphs) and the `digestOf` cleanup order. For 09 (C9.2), index titles normalise ` — ` to ` - ` so the title and digest split is unambiguous, and digests cover open items only.
- **G-M2-48:** a 0.30.0 CHANGELOG upgrade line. Run `cleargate wiki build` once after upgrading, because the ingest no-op guard (`wiki-ingest.ts` Step 4) leaves unchanged items' pages in the 0.29 shape.

## Script Incidents
None. No `run_script.sh` invocation. The read-only census and probe scripts are in the session scratchpad.

## flashcards_flagged
- `2026-11-12 · #wiki #decisions · Raw answers come bullet, indented under the Q, or inline after it; plus ~10 legacy placeholder tokens. Template tokens alone: 198/553 false "resolved".`
- `2026-11-12 · #wiki #extract · Tag back-off must cut at the OUTERMOST element open across the cut; picking the last opener leaves <outer> dangling.`
- `2026-11-12 · #wiki #digest · Bug Anomaly opens with Expected Behavior, CR §1 with Obsolete Logic; a first-sentence digest states the opposite of the item.`
