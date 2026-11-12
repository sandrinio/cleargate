# STORY-063-08-F1 QA-Red (role: qa, Mode: RED, off-sprint EPIC-063 M2)

QA-RED: WRITTEN
Branch `story/STORY-063-08-F1` in `cleargate-cli/`, base main 068d37f. Nothing committed. No src/ or scaffold/ edits.

## Files (all under cleargate-cli/test/wiki/)
| File | Kind | Red | Green (guards) |
|---|---|---|---|
| extract-sections-f1.red.node.test.ts | unit: F1-1, F1-2, F1-3 | 35 | 10 |
| extract-sections-pages-f1.red.node.test.ts | handler level, build + ingest, F1-1(e) | 10 | 1 (build/ingest parity; trivially holds while both are wrong) |
| extract-sections-sources-f1.red.node.test.ts | docs/source, F1-4 | 10 | 5 (incl. the `--check` anchor) |
| extract-sections-corpus.live.integration.node.test.ts (new 2nd test appended) | live, F1-5 | 1 | 0 (existing G1 test unchanged, still green) |
| fixtures/extract/EPIC-903_Inline_Answers_Epic.md, CR-901_Indented_Decisions_CR.md | authored, corpus-shaped (EPIC-048 inline form; CR-022..026 indented form), sanitised | - | - |

Total: 56 red, 16 green guards. All 149 existing 08 tests (extract-sections.red, -pages.red, -sources.red, build-sprint-reports.red, build-ingest-parity) are green on the clean baseline.
Every red was run against current main code and its failure reason checked with a scratch probe (actual values: answers swallowed into the question text, placeholder tokens returning false, `Sprint Goal:` kept in the digest, `<outer>` left dangling, closing fence always ```, `intro` instead of `intro line`, fill pass ending mid-sentence).

## Mapping
- **F1-1 answer forms (G-M2-46 rules 1-4):** unit (a),(a2),(a3) indented; (b),(b2) inline + trimming; (c),(c2) code-span guards (green: already hold); rule 2 Recommended closes text; bullet-form regression (green).
- **F1-1(d) placeholders (rule 5):** full Arch list true, 12 further rule-5 branch cases true (`- _ -`, `{default-accept}.`, `tbd`, `Open`, `Waiting on the owner`, ...), the 5 Arch "false" cases plus `Waitingroom opens at nine.` false (green). A pair with a legacy token is unresolved.
- **F1-1(e) page level:** unit via `buildPageBody` (epic Decisions/Open questions, indented + inline, CR open-only, CR all-answered has no Open questions part); handler level EPIC-903 / CR-901 in build and ingest, plus build == ingest.
- **F1-2 digest (G-M2-47):** digestSource strict per type (sprint/epic/bug/cr with the label absent give ''), bug Actual paragraph (own paragraph and same-paragraph forms), CR New Logic, whole-part fallback when label missing (green), BUG-900 / CR-900 fixture digests; digestOf: leading bold label (both spellings, list marker, long template label), one label only, heading, table-only and table-before-prose, `---`, leading fence (``` and ~~~), ` — ` to `, `, word cap.
- **F1-3:** (a) outermost back-off (two cases; single-element guard green); (b) 4-backtick and `~~~` closers (plain ``` guard green); (c) newline and tab boundary; (d) `allocateBudget` max 500 ends on `.`, `buildReportBlock` Carried Over > 1,200 ends on `.`, and a max 2400 guard (green) that the fill pass stays for max >= 2,000. No marker/placement rule was given in the Arch report, so none is pinned.
- **F1-4 docs:** both examples (protocol §10.4, query agent): frontmatter status equals identity status and equals `Approved`; part headings belong to the page type; `## The Spec (The Contract)` present, no `## Open questions`/`## Problem & Value`; size claim not `2,000–2,400 characters`, has `at most 2,400 characters` and an "at least 2,000 ... more/than" clause; ingest agent lists none of the four synthesis files and contains `the synthesis pages listed in protocol §10.2`; §10.2 does name all four; TOMLs carry the new text; `build-codex-payload.mjs --check` anchor (green now).
- **F1-5 live (scratch copy only, outer repo untouched):** zero resolved answers matching the legacy token regexp or `isPlaceholderAnswer`; zero questions still containing `**Human Answer/decision` (outside backticks) or `**Recommended`; epic/CR pages: no marker text under Open questions, no placeholder under Decisions; digests: none start with `|`, `#`, a numbered template heading or a template label, none contain ` — `; bug digest differs from the Expected paragraph digest, CR digest from the Obsolete one. Diagnostics print counts. Baseline now: resolved 445 / open 113, placeholderResolved 169, swallowed 52, badOpen 17, bad digests 241.

## Shape-change reds (existing tests F1 deliberately breaks) -- Dev must update, not QA
1. `test/wiki/extract-sections.red.node.test.ts:653-665`, "digestSource: epic -> Objective, bug -> Anomaly, cr -> Context override, ...". It asserts `digestSource('bug', BUG_900)` equals the WHOLE Anomaly text and CR likewise. After G-M2-47 the bug source is the paragraph starting at `**Actual Behavior`, the CR source the paragraph at `**New Logic`. Update those two rows (epic, sprint, proposal rows stay). The Arch's "pins at :640-665 stay green" holds for the two digestOf pins, not this one.
2. Watch-list (not predicted to break): allocateBudget tests at ~:523-590 with small parts and explicit `max` 1200; they pass today and the new rule only removes the fill pass for max < 2000.
No other shape change: placeholder pins :261-269 and the sources pin on `2,000`/`2,400` stay green.

## Ambiguities and chosen defaults
1. **§10.4 / query example type.** The dispatch text said "epic-type page"; the Arch report (F1-4) says keep the story page, status `Approved`, heading `## The Spec (The Contract)`, drop `## Open questions`. Default: the Arch report. The consistency test is generic by `type`, but one test pins the Arch's heading. If the Dev switches the example to an epic, that single test must change.
2. **Paragraph for "Actual Behavior"/"New Logic".** G-M2-47 says "the paragraph that starts at its label". Tests assert only the digest and that the other side is absent, so ending at a blank line or at the next label both pass.
3. **Label present but bug uses `**Expected:**`/`**Actual:**` (e.g. BUG-035).** G-M2-47 names only `Actual Behavior`; such bugs fall back to the whole Anomaly, and the digest would state the Expected side. Not tested; flagging for the orchestrator.
4. **Live resolved count.** Arch expects ~402 on the 2026-11-12 corpus; my sweep counts all `interrogation loop` + `open questions` sections of ingestable items (445 today, corpus moves). Pinned as invariants plus `> 250` and a diagnostic, not an exact number. F1-5 "before/after page counts" are evidence for the Dev report, not asserted.
5. **Live "inverted digest" check** is vacuous on pre-fix code (label not dropped, so no equality); it guards the post-fix state. The template-label check carries the red.
6. **Fill-pass red geometry.** Fixtures use ~150-char paragraphs; at ~80 chars the prefer pass is already near max and the fill pass cannot beat it, which made the first draft green.
7. **EPIC-903 `{Waiting}`** open question and CR-901 `_accept recommended_` (resolved, not open) follow G-M2-46 rule 5 literally.
8. The old live test's `scratchCopy` is reused in place (second test in the same file), no helper extracted.

## Script Incidents
None. No `run_script.sh` invocation; scratch probe in the session scratchpad only.

## flashcards_flagged
- 2026-11-12 · #qa-red #wiki · Fill-pass reds need ~150-char paragraphs; at ~80 chars the prefer pass is near max and the fill pass can't beat it (vacuous green).
- 2026-11-12 · #qa-red #live · Corpus "inverted digest" oracles are vacuous pre-fix; pair them with a template-label regex that carries the red.

## Round 2 (orchestrator ruling on ambiguity 3)
Ruling: a bare `**Actual:**` label is an alias of `**Actual Behavior:**` for the bug digest source (21 of 104 corpus bugs, e.g. BUG-035). Rulings 1, 2, 4, 5 accepted as written.
- Added 2 unit reds in `extract-sections-f1.red.node.test.ts`: (a) `**Expected:** X.` then `**Actual:** Y.`; (b) `**Expected Behavior:**` then a later bare `**Actual:**`. Both expect `digestSource` to start at the Actual label (no Expected text) and `digestOf` to give Y's first sentence without the label. They fail for the right reason: the digest today is `Expected: X marker text`.
- Live sweep (F1-5): the Expected-side check regex now matches the bare `**Expected:**` / `**Actual:**` labels too, and the template-label regex now flags a digest starting with `Expected:` / `Actual:`. Still red (baseline), post-fix guard for the inverted side.
- Counts now: unit file 37 red / 10 green; pages 10 / 1; sources 10 / 5; live 1 red (existing G1 test green). Total 58 red, 16 green guards. Existing 08 tests unchanged.
