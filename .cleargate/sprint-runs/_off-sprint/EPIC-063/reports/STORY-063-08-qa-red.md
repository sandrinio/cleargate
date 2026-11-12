# STORY-063-08 QA-Red report (role: qa, Mode: RED)

Branch `story/STORY-063-08` in `cleargate-cli/` (cut from main 65f2708). Nothing committed; no production code touched.
Plan refs are to `.cleargate/sprint-runs/_off-sprint/EPIC-063/plans/M2.md`.

QA-RED: WRITTEN

## RED_COUNT

120 new red cases + 11 deliberate shape-change reds in edited existing tests = 131. Baseline: 0 of the 120 new cases pass except 3 + 1 intentional anchors listed below.

| File | tests | red | anchors green |
|---|---|---|---|
| `test/wiki/extract-sections.red.node.test.ts` (unit: C8.2-C8.7, buildPageBody, buildReportBlock) | 75 | 75 | 0 |
| `test/wiki/extract-sections-pages.red.node.test.ts` (build + ingest handlers, §2.1 scenarios, G-M2-14) | 36 | 36 | 0 |
| `test/wiki/extract-sections-sources.red.node.test.ts` (protocol, ingest/query agents, Codex TOMLs) | 11 | 8 | 3 |
| `test/wiki/extract-sections-corpus.live.integration.node.test.ts` (G1 sweep on a scratch copy) | 1 | 1 | 0 |

Red reasons: all unit cases and the corpus sweep fail on `ERR_MODULE_NOT_FOUND` for `src/wiki/extract-sections.js` (dynamic import inside each case, so each is red on its own); page-level cases fail on the missing identity line / parts / 1,200-char cut; the 6 `buildReportBlock` cases fail with `reportBody.trim is not a function` (old string signature).
Anchors (green by design): `build-codex-payload.mjs --check` exit 0; relations field note survives in §10.4; ingest agent keeps the exclusion + bucket-allowlist guards.

## Files

New:
- `test/wiki/extract-sections.red.node.test.ts`
- `test/wiki/extract-sections-pages.red.node.test.ts`
- `test/wiki/extract-sections-sources.red.node.test.ts`
- `test/wiki/extract-sections-corpus.live.integration.node.test.ts` (`skip: !fs.existsSync(META_ROOT/.cleargate/delivery)`; scratch copy of `{delivery, sprint-runs (reports + improvement-suggestions only), config.yml}`)
- `test/wiki/_extract-support.ts` (shared helpers; not a test file)
- `test/wiki/fixtures/extract/` (plan path M2.md:569, not the dispatch's `test/fixtures/`):
  - verbatim corpus copies: `EPIC-058_…md` (31,334 bytes), `SPRINT-44_dashboard_…md` (plan; one line sanitised, see below), `SPRINT-44_REPORT.md`;
  - `SPRINT-44_improvement-suggestions.md` is a 2-line stub (the real file is 267 KB);
  - authored, template-shaped: `BUG-900` (severity P1-High, failing gate with two criterion ids), `CR-900` (one resolved + one placeholder §0.5 pair), `EPIC-901` (`## Testing Strategy` + `### User journeys` between §5 and §6, §6 with markers), `EPIC-902` (unclosed `<agent_context>`), `PROPOSAL-901` (legacy: `<instructions>`, `<agent_context>`, `>` guidance, fenced `##` line), `PROPOSAL-903` (H1 only).
  - Provenance: the SPRINT-44 plan's line 114 had `/Users/ssuladze/Documents/Dev/ClearGate`; it is now `<outer-repo-root>` because `cr075-standalone-contract` Scenario 7 bans machine paths under `test/`. Otherwise byte-identical (diffed).

Edited existing tests (deliberate pin updates, each marked "superseded by STORY-063-08" in a comment):
- `page-builder-shared.node.test.ts` (6 red): drops the `SUMMARY_BUDGET`/`applyBudget`/`extractOpenQuestions` imports; the "truncation" and "Open questions" blocks now call `allocateBudget`/`findSection` (dynamic import); `input()` carries `type: 'cr'`. Plan M2.md:621.
- `build-ingest-parity.node.test.ts`: tests 1 and 2 put their long filler under `## 1. Problem & Value`, so the extract (not the old cut) produces the marker (plan :622, lines :81 and :97). Green now, green after.
- `build-sprint-reports.red.node.test.ts` (1 red): `buildReportBlock({fm, body, rawPath})` (plan :623); fixture narrative moved under `### Carried Over`.
- `sprint-report-markers.red.node.test.ts` (4 red): the 13-F1 file calls `buildReportBlock('…')` six times. NOT in the plan's pin-update list; it must change with the C8.7 signature. A local `reportBlock()` helper wraps the old narrative in `### Carried Over`.
- `wiki-ingest-sprint-report.red.node.test.ts` (plan :624): Scenario 8's report sentinel moves under `### Carried Over`; Scenario 9's plan sentinel moves under `## Sprint Goal` (frontmatter `description` is no longer a summary source). Both stay green before and after.
- `relations.red.node.test.ts`: `buildPageBody` `input()` gets `type: 'cr'`, a real unresolved §0.5 pair and a `## 1. The Context Override` section (fixture prose, not in the plan list).
- `relations-handlers.red.node.test.ts` and `relations-f1.red.node.test.ts` (not in the plan list): report narratives sit under `### Carried Over`; plan prose that assertions read back sits under `## Notes` / `## Sprint Goal` / `## 1. Problem & Value`. Reason: fallback takes H2 sections only and the report block is an extract, so loose prose would no longer reach the page. All still green at baseline.

Untouched and green: all other `test/wiki/*.node.test.ts` (full dir: 664 tests, 130 fail, every failure is a new red or one of the 11 shape-change reds), `build-ingest-parity`, `lint.node`, `cr075-standalone-contract` (8/8). Read-only checks only; no `npm run build`, no `wiki build` on the outer repo (the live test runs on a temp copy and cleans up).

## Pinned contract names (plan lines)

- `src/wiki/extract-sections.ts` (new, pure): `findSection(body, namePattern): string|null` (C8.2, M2:197-201); `extractAgentContextTag(body,'objective')`, `extractRules(body)`, both inside the ```xml fence, null/[] when unclosed (C8.3, :203-205); `DecisionPair`, `extractDecisionPairs`, `isPlaceholderAnswer` (C8.4, :207-217); `PAGE_EXTRACT_MAX=2400`, `PAGE_EXTRACT_MIN=2000`, `ExtractPart`, `extractParts(type, body, fm)`, `allocateBudget(parts, rawPath, max?)`, `safeCut(text, budget)` (C8.5, :219-250); `digestSource`, `digestOf` (C8.6, :251-255).
- `page-schema.ts`: `buildPageBody(input & {type})` with layout and identity line exactly per C8.1 (:174-190); `buildPlanStub` forwards `type:'sprint'` (:260); `buildReportBlock({fm, body, rawPath, improvementSuggestionsPath?})` per C8.7 (:256-261); `SUMMARY_BUDGET`, `applyBudget`, `extractOpenQuestions` deleted, `deriveTitle` kept (:249-250); marker constants and `extractReportBlock`/`extractPlanStub` unchanged.
- Part labels: epic `Objective | Problem & Value | Scope | Architecture rules | Decisions | Open questions`; bug `Anomaly | Reproduction | Evidence | Sandbox`; cr `Context override | Blast radius | Open questions`; sprint `Goal | Deliverables` (:219-250); fallback labelled by the item's own heading text. Plan scenarios :584-611 for the handler-level cases; relations block last plan-side, then the report block (Amendment 5).
- Marker format `[+N bytes not shown — read <rawPath>]` where N is the byte count of the part's trimmed text minus the kept bytes (the old `applyBudget` rule).
- Docs/agents (G-M2-11 :1077; 13 post-flight): protocol §10.4 example is the new shape (identity line, a part heading, relations block, 2,000/2,400 note); §10.1-§10.2 mention the extract; the fallback ingest agent names `cleargate wiki ingest <raw_path>` as the page writer and loses `## Blast radius`/copied `children`/`None.`; the query agent example is the new shape; the two Codex TOMLs carry the same text and `build-codex-payload.mjs --check` stays clean (regenerate with `npm run gen:codex`).
- No sealed full-body goldens: the blueprint (:584-611) specifies structural assertions, so the Developer seals nothing.

## Open ambiguities (numbered)

1. **Scope allocation.** Plan scenario 1 requires `## Scope` to hold both In and Out bullets for EPIC-058, but In is ~3,000 chars against a ~550-char share, and C8.5 has no sub-allocation rule. Page-level tests demand both a first In bullet and "Supporting Antigravity"; the unit test only requires both present in the pre-budget Scope part. Mechanism (per-list caps) is the Developer's.
2. **Fallback preamble.** Plan-literal fallback takes H2 sections only; text between the H1 and the first H2 (and H1-only items) yields no part. Not pinned either way; every existing fixture that relied on loose prose was edited to be robust to both readings.
3. **Report-only sprint, plan side.** `wiki-build.ts` builds it with `buildPlanStub({fm: report.fm, body: report.body, rawPath: report.rel})`, so the "plan" extract is the fallback over the report's H2s (no Sprint Goal). Unspecified; not pinned (13's build==ingest parity tests still cover consistency).
4. **Improvement-suggestions pointer form.** C8.7 writes `sprint-runs/<ID>/improvement-suggestions.md`; the report path is `.cleargate/sprint-runs/...`. Tests match the substring `sprint-runs/SPRINT-44/improvement-suggestions.md`, so both forms pass.
5. **Extract region.** Blueprint scenario 5 measures "from the identity line to RELATIONS_BEGIN" as 2,000-2,400, yet R3/C8.1 put the identity line outside the budget. Tests measure the text after the identity line.
6. **Scope headers.** C8.5 says `**In:**`/`**Out:**`; real epics use `**✅ IN-SCOPE (Build This)**` / `**❌ OUT-OF-SCOPE (Do NOT Build This)**`. Tests pin bullet content only.
7. **§10.1/§10.2 wording.** The plan lists only §10.4 for 08 (:564); the dispatch adds §10.1/§10.2. Pinned weakly: the combined text mentions "extract" and drops "Summary in one or two sentences". Architect should confirm.
8. **`DecisionPair.line`** is pinned only as a number that increases with position; the join character for answer continuation lines is unpinned (substring checks).
9. **`buildPageBody` with no `type`** and fallback label numbering (`1. Problem` vs `Problem`) are unpinned; fixtures avoid numbered fallback headings.
10. **Fenced headings in the fallback.** Pinned (a `##` line inside a code fence is not a section), by analogy with C8.2; the plan does not say it for the fallback.

## flashcards_flagged

- "2026-11-12 · #qa-red #test-harness · A `**Status:**` regex over a page matches a report's own line; pin the identity line by index (body line 2), not by search."
- "2026-11-12 · #qa-red #test-harness · Corpus-copied fixtures naming /Users/<me>/…ClearGate trip cr075 Scenario 7; sanitise the path line and note provenance."

## TPV round 2 (rulings G-M2-38..45; fix list in STORY-063-08-tpv.md)

All 11 fixes applied to tests only; nothing committed.
1. Live sweep: a structural "cut" line that appears verbatim in the raw body is no longer counted (header comment updated).
2. Ingest agent: negatives for the manual index-row format, the `log.md` append step and the `Update wiki/index.md` step.
3. Query agent: one prose line must name frontmatter, `children` and `cited_by`. Protocol: §10.2 clause pinned (identity + extract + §10.4 pointer; §10.1 no longer pinned, G-M2-43); §10.4 field note must describe cut markers and the report extract; the "short prose body" opener is banned.
4. Purity: `extract-sections.ts` has no `node:` import and only `import type` from `./page-schema.js`.
5. EPIC-902 fallback: labels `['Problem & Value','Scope Boundaries']`, no ``` anywhere; no dangling fence on the page either.
6. Fallback units: Overview preamble (two cases), line-anchored drops, number-stripped labels.
7. Scope: starts with `**In:**`, `**Out:**` precedes the first out bullet; page-level both sub-labels and exactly one marker that is the part's last line.
8. Decision pairs: `line` 1 and 4, one-space continuation join; added the 20-word `…` cut and the orphan `- <answer>` rendering (G-M2-44).
9. Vacuity: safeCut table case requires `row one one`; `<rule>` case requires `<rule>rule 0 `.
10. Identity edges: `fail` with no ids, `unknown` status; `buildPlanStub` default `sprint` and explicit type honoured. (`type` required is not pinned as a throw, since the ruling gives no behaviour.)
11. Pointer pinned to `**Improvement suggestions:** .cleargate/sprint-runs/SPRINT-44/improvement-suggestions.md`.

Counts after round 2: unit 83 red (was 75), pages 36 red, sources 11 red + 3 anchors (was 8 + 3), live sweep 1 red. Total 131 red new + the 11 shape-change reds from round 1 = 142 by file counts (a full test/wiki run reports 141 failures, 533 passes of 675).

## Round 3 (orchestrator decision 9; test-only)

- `extract-sections-pages.red.node.test.ts:43` (EPIC-058, both modes): the page-level `Problem & Value` check is now "part present and starts with `**Why are we doing this?**`". The "Introduce a host-adapter architecture" check stays at unit level (`extract-sections.red` :121 `findSection` and :286 `extractParts`), where it already existed.
- `_extract-support.ts`: `partText`/`partLabels` track ``` and ~~~ fences and ignore heading lines inside them (G-M2-39).
- `pages` PROPOSAL-901 case: because `partLabels` is now fence-aware, the "fenced heading is not a section" label check alone would be vacuous; added an assertion that the `Decision needed` part still contains the fenced `## Fenced heading…` line and `FENCED-HEADING-SENTINEL`.
- Result with the Developer's tree: `extract-sections-pages.red` + `extract-sections.red` = 119 tests, 119 pass, 0 fail.
