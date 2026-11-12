# STORY-063-10-F1 QA-Red

QA-RED: WRITTEN

Worktree `scratchpad/wt10f1`, branch `story/STORY-063-10-F1`, baseline ffb3a71. No src/templates/scaffold edits, no commit.

## Files
- `test/wiki/decisions-f1.red.node.test.ts` (35 cases)
- `test/wiki/decisions-f1.live.integration.node.test.ts` (1 live case, gated on `CLEARGATE_META_ROOT`, defaults to `<cli>/..`; scratch copy; independent line counter)

Counts: red file 35 cases = 19 red + 16 guard; live file 1 red. Total 20 red, 16 guard.

## Reds vs ffb3a71 (failure reason)
F1-1 (today's rule takes the first ID anywhere in the rest of the sentence; sentences span lines/rows):
- cond 1 table row: API row (records STORY-063-11), plain-verb row (EPIC-021).
- cond 2 code span: verb in span with later ID; verb+ID both in span.
- cond 3 double quotes: the `Example: EPIC-063's "supersedes EPIC-020's ..."` shape; a quoted sentence.
- cond 4 ID not directly after verb: "supersedes the old plan in EPIC-021", "supersedes the plan described by EPIC-021", `superseded), [[STORY-005-05]]`, verb ending a list line with `CR-124` on the next.
- Page-level: table row + plain sentence in one item records both (expected only EPIC-020); `latestDecisions` for a table-row mention returns `['EPIC-021']`, not `[]`.
F1-2: `latestDecisions` and compile `- Q:` order put the loop pairs first; expected Open Questions first (body order).
F1-3: the two entries share one `supersedes` array (mutation leaks; same instance).
F1-4: header says "any item"; the exact sentence is absent from the compiled page and from `templates/synthesis/decisions.md` (2 reds).
F1-5: sentence absent from the Claude agent `.md` Step 2 and from the Codex `.toml` (2 reds; the .md test also pins it between `### Step 2` and `### Step 3`).
Live (run with `CLEARGATE_META_ROOT=<meta>`): fails with "STORY-063-10 supersedes nothing" (STORY-063-10 block exists, so the check is not vacuous). Without the env var and no meta repo beside the checkout it SKIPs.

## Guards (pass today, labelled GUARD in the title)
Positives: wikilinked ID, backticked ID, plain ID, `EPIC-021's` (starts-with), `"EPIC-021"` and `'EPIC-021'` after the verb, even backticks before the verb, even double quotes before the verb, a table elsewhere not poisoning a later plain line, only-first-ID. Kept guards: `not`, `never`, `by` after, self-reference drop. F1-2: loop-first order unchanged. F1-3: no leak across calls.

## Ambiguities and defaults
- G-M2-57 cond 4 line-crossing: "first non-space token after the match" could cross a newline; I only pinned the case where the token is a non-ID (`)` then newline then an ID) -> none. A verb at line end with the bare ID on the next line is unpinned.
- A leading-space `  | row` (indented table) is unpinned; rule text says "starts with `|`".
- Positive `supersedes "EPIC-021"` (quote AFTER the verb) is pinned as recorded; the quote-parity test counts only quotes BEFORE the verb, per the rule.
- Live check uses `blockOf` from `_decisions-support.ts` (a block parser, not the module under test) and a plain `startsWith('- Supersedes:')` line count.
- `git status --porcelain .cleargate/delivery` of the outer repo is identical before and after the live run.

flashcards_flagged:
  - "2026-11-12 · #qa-red #live · A live test's META_ROOT defaults to <cli>/.., so in a scratchpad worktree it SKIPs; run with CLEARGATE_META_ROOT set."
