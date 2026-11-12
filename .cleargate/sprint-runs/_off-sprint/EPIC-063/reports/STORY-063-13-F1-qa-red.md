# STORY-063-13-F1 QA-Red (role: qa, Mode: RED)

QA-RED: WRITTEN
Branch `story/STORY-063-13-F1` (cli main checkout, from 63e69b0). Nothing committed; no production code touched.

## Files
- `cleargate-cli/test/wiki/sprint-report-markers.red.node.test.ts` (pure layer, 11 tests: 6 red, 5 anchors green)
- `cleargate-cli/test/wiki/relations-f1.red.node.test.ts` (handler layer, 19 tests: 14 red, 5 anchors green)
- Reuses `_relations-support.ts` unchanged. Existing 13 files + shell-ingest/sprint-report suites: 128/128 pass.

## Cases and red reason
| Item | Case | Red because |
|---|---|---|
| F1 | replaceRelationsBlock, marker-less 0.29, inline report quote (append / before real report) | block spliced mid-sentence at the inline quote |
| F1 | replaceRelationsBlock 0.30, inline relations quote; fenced full-line pair | `indexOf` takes the quote as BEGIN, deletes through real END |
| F1 | extractReportBlock / extractPlanStub with inline END / BEGIN quote | truncated at the inline quote |
| F1 handler (a)(b)(b2)(c) | neighbour rewrite of a CR-063-shaped page; quoting text kept, equals fresh build; plan re-ingest keeps SPRINT-27-shaped report | same splice/truncation |
| F2 | report-only SPRINT-74, CR re-parented after build, ingest CR | sprint `children` stays `[]` (no raw item, skipped) |
| F3 | new story and edited story (re-parent + dropped cite), via `wikiIngestHandler` and via `hookShellIngestHandler` (git stub) | story ingest exits before relations: epic `children` / CR `cited_by` stale |
| F4 | §10.5 overclaim sentence gone; "edits and creations" + deletion-gap wording present | old sentence still present |
| F8 | three stale comments (page-schema:20, wiki-ingest:586, lint-checks:232) | comments still present |

Anchors (green by design): no-quote bodies render identically; no-quote report survives re-ingest; story edit with nothing relational changes no page (content, mtime, ctime of epic + cited page, all pages byte-equal; 30 ms gap so a rewrite would move ctime); hook route ingests an ingestable epic (harness sanity); F4 negative on un-amended wording.

F3 deletion half: documented as a known limit in the file header; no test.

Pinned wording (F4, scoped to §10.5): absent `so single-file ingests end byte-identical to a full \`wiki build\`.`; present `edits and creations`, `byte-identical to a full \`wiki build\``, and `deletions are reflected at the next \`wiki build\` or the next ingest that rewrites the affected page`; absent `edits to excluded-bucket items`.

RED_COUNT: 20 (6 pure + 14 handler); 10 anchors green.

## Open ambiguities
1. Zero-write test checks only the epic and CR pages (+ whole per-item snapshot equality), not synthesis pages, `index.md` or `log.md`. If the Developer recompiles synthesis / logs on an excluded-bucket ingest, that is allowed by these tests. Orchestrator may want to say whether it is.
2. Neighbour rewrites restore mtime, so "zero writes" is detected via ctime; a Developer that writes identical bytes and utimes would fail the anchor (intended).
3. EMPTY_RELATIONS deep-freeze (F8, optional) is NOT tested: Arch allowed "freeze or type readonly". Left to Developer.
4. F4 pins the Arch-proposed deletion wording verbatim plus `edits and creations`; if the Developer words it differently the test must be amended before Dev (not after).
5. Hook-route tests cannot inject `templateDir` (hook.ts does not pass it); they rely on `resolveDefaultTemplateDir` working from source (anchor confirms it does).
6. Page-schema comment tests assert absence of the old phrase only, not any new wording.

flashcards_flagged: []
