# STORY-063-10 Architect post-flight (role: architect)

ARCH: PASS-WITH-FOLLOW-UPS

Reviewed: cli `story/STORY-063-10`, `git diff 68f9ee0..a78b744` (0255c20 QA-Red, c8bf33b redundant merge with an identical tree, a78b744 Dev), against M2 C10, G-M2-44/46/53/55/56, the 10 blueprint, the QA-Red ambiguity defaults and the Dev report. Read-only measurements: scratch tsx scripts in the session scratchpad that call `scanRawItems` + `src/wiki/synthesis/decisions.ts` (a78b744) on the outer repo's 623 raw items. Nothing in either repo was written; no build, no `wiki build/ingest/doctor`, no test-suite run.

**Bottom line.** The contract is met: C10.1, C10.2, C10.3, C10.4 after G-M2-56, C10.5, the `onSkip` warning and the doc carry-forwards. 11 can start its Dev as soon as 10 merges. **Do not hold the merge for an F1.** One finding ships wrong facts: 3 of the 4 `- Supersedes:` lines on this repo's page are false. That needs a STORY-063-10-F1 inside M2, before §R. The F1 touches no file 11 touches, so it can run in a worktree alongside 11. 12 needs two amendments (G-M2-58, G-M2-59) and 11 needs two (G-M2-59, G-M2-60) before their Devs run.

---

## 1. Plan conformance

| Contract | Implemented | Verdict |
|---|---|---|
| C10.1 `compile(allItems, { wikiRoot, templateDir? })`, reads `contradictions.md` from `wikiRoot` | `decisions.ts:171-193` | ✓ |
| C10.2 `latestDecisions(allItems, n)`: Q/A answers only; `text` is the full answer; date = `approved_at` → `updated_at` → `''`, first 10 chars; date desc, id in C order, then document order | `decisions.ts:45-52, 95-107, 118-127`. `byCOrder`, not `localeCompare`. Undated items sort last | ✓ (see deviation D2) |
| C10.3 `readUnlabelledContradictions(wikiRoot)` | `decisions.ts:130-168`. It parses exactly what `commitPhase4Findings` writes (`contradict.ts:259-266`: `- draft: "[[X]]"`, `neighbor`, `claim: <JSON>`, `label: null`), returns bare IDs and the JSON-decoded claim, returns `[]` when the file is absent, and never throws | ✓ |
| C10.4 / G-M2-56: `SYNTHESIS_PAGES` (renamed, plus `decisions`) | `wiki-ingest.ts:711` | ✓ |
| `BUCKET_SYNTHESIS_MAP` gains `decisions` for 7 buckets (G-M2-17) | `wiki-ingest.ts:698-709`; topics, spikes and unknown are unchanged | ✓ |
| `compileSynthesisPage(page, items, allItems, templateDir, cwd)` | `wiki-ingest.ts:756-776` | ✓ |
| `writeSynthesisPage(wikiRoot, page, content, onlyIfChanged)` unchanged | `wiki-ingest.ts:779-789` | ✓ |
| `recompileSynthesis` gains `allItems` after `items`; the handler passes `scanned`, not `forRelations` | `wiki-ingest.ts:385`, with `scanned` from `:268-277` | ✓ |
| `decisions` is written only on a byte difference and is outside the C9.5a pair | `wiki-ingest.ts:836`; the pair logic at `:829-832` ignores it | ✓ (see D1) |
| Build writes it from the unfiltered scan | `wiki-build.ts:324` (`all`) | ✓ |
| C10.5 `checkDecisionsSize(repoRoot, ceiling = 8000)`, printed through the C9.4 channel | `lint-checks.ts:542-548`, `wiki-lint.ts:152-153` | ✓ |
| Step 5 `onSkip` | `scan.ts` optional third argument, fired only on the parse-failure branch. Build prints `wiki build: warn: skipped <path>: malformed frontmatter` (`wiki-build.ts:94`); ingest is silent | ✓ |
| R6 shape and truncation (`… ([[ID]])`); `## Unresolved conflicts` / `_None._`; header lag note | `decisions.ts:112-115, 175-192`; `templates/synthesis/decisions.md` | ✓ |
| Docs (G-M2-56): §10.1 index line, §10.1 `decisions.md` line, §10.2 list, §21.1 "build and ingest compact" plus the decisions-size sentence, query agent Step 1 and the replaced example, Codex TOML regenerated, `recompileSynthesis` comment | all present; the TOML diff mirrors the `.md` diff byte for byte, and QA's `build-codex-payload.mjs --check` guard is green | ✓ |
| No second `scanRawItems` call | build: one (`:94`); ingest: one (`:271`) | ✓ |

### Deviations

| # | Deviation | Ruling |
|---|---|---|
| D1 | `decisions` is written only on a byte difference on **both** paths. G-M2-56 named only the stamp-only path, and the other pages still write unconditionally on non-stamp-only ingests. | **Accept.** It avoids rewriting a 131 KB file on every mapped ingest. Nothing reads the mtime of `decisions.md`: lint's `missing-ingest` reads item pages only (`load-wiki.ts:13` `BUCKET_DIRS`), and synthesis-parity Scenario 1b does not pin `decisions`. |
| D2 | When an item has two **disjoint** sections, its pairs are emitted section by section, loop first (`decisions.ts:61-64`). C10.2 and G-M2-44 ask for document order. Measured: 1 corpus item, EPIC-045, whose Open Questions section comes first (1 pair; the loop has 4). | **F1-2.** Order the two sections by their offset in the body. This does not change D7's id sequence. |
| D3 | When one section contains the other (a `### Open Questions` nested in §6), only the outer section is read (`decisions.ts:59-60`). The rule is not in C10; it is QA ambiguity 7. Measured: 2 corpus items nest, with 0 answered pairs in the nested part. | **Accept.** It is now part of what latestDecisions computes, so 12 must mirror it (G-M2-58). |
| D4 | An item with a supersession but no answered pair and no open-epic rule gets no block (`decisions.ts:101`; QA ambiguity 4, not pinned). Measured: 4 such items (EPIC-002, EPIC-043, PROPOSAL-074, SPRINT-41), and all 4 hits are false positives. | **Accept.** 12's corpus must respect it (G-M2-58 item 4). |
| D5 | Every `DecisionEntry` of one item shares the same `supersedes` array (`decisions.ts:123`). | **F1-3** (nit): pass `[...d.supersedes]`. |
| D6 | The `decisions` case derives `wikiRoot` from `cwd` (`wiki-ingest.ts`, `compileSynthesisPage`) instead of receiving it. | **Accept.** The two are equal by construction (`wiki-ingest.ts:181`). |
| D7 | `dateOf`'s `Date` branch never runs, because `parse-frontmatter.ts` uses `CORE_SCHEMA` and timestamps stay strings. | **Accept** (harmless). |
| D8 | The header says story decisions refresh "on the next ingest of any item". Topic and spike ingests do not map to `decisions`. | **F1-4** (wording). |

---

## 2. Downstream readiness

**11 (session brief).** These consumer surfaces exist with the planned names and shapes:
- `latestDecisions(allItems, n): DecisionEntry[]` (`{ id, date, text, supersedes }`).
- `readUnlabelledContradictions(wikiRoot)`.
- `SYNTHESIS_PAGES`, which 11 extends with `brief`.
- `compileSynthesisPage` already receives both `items` and `allItems`, which matches C11.2 `compile(items, allItems, ctx)`.
- The map pins in `wiki-ingest-synthesis-parity.red` now carry `decisions`, and 11 appends `brief`.

11 needs two changes before its Dev runs:
- **`Decisions:` line separators (G-M2-59).** C11.1 joins entries with `; `. 46 of the 402 answers contain `;` within their first 12 words and 1 contains a `[[…]]` link. Today's latest 5 include CR-126 ("not in this CR; a follow-up CR…") and EPIC-063 ("…(STORY-063-02);"). Without a rule, 12's compare-mode either mis-splits these lines or picks up a link ID that is not an entry.
- **G-M2-55 item 5 cites a return value that does not exist (G-M2-60).** `refreshRelationPages` returns `void` (`wiki-ingest.ts:549-590`), so "reuse its scan" needs a signature change. That change must also return the bare `scanned` list, not the relations input `items` that carries the out-of-tree file. This is the same rule G-M2-56 set for `forRelations`.

**12 (truth oracle and eval).** D7 says "the first 5 of `latestDecisions`", but some of what that function computes now exists only in 10's code:
- the section union and nesting rule (D3);
- duplicates are kept: today's sequence is CR-126 four times, then EPIC-063;
- the YAML unset spellings for `approved_at`.

G-M2-58 writes these rules down so the shell oracle can implement them independently.

12's corpus "supersedes" sentence must also sit in an item that gets a block (D4), with its ID directly after the verb (G-M2-57).

No frozen export differs from the contract in name or shape.

---

## 3. Architecture risks

**Performance** (in-process, 623 items, 5 runs each):
- `compile` takes 39–63 ms and `latestDecisions` 38–47 ms. Both run a full `collect` pass: two `findSection` calls and the pairing per item, `extractRules` for open epics, and a sentence split for items with entries.
- On ingest, 10 adds about 50 ms plus a 131 KB read-and-compare. The Dev's +0.1–0.2 s per ingest and the `wiki build` +3.1 s (35.3 → 38.4 s) are mostly machine noise; the compile cannot account for 3 s.
- After 11, every ingest also runs `latestDecisions` for the brief: about 40 ms more, about 90 ms in total for the two pages. That is acceptable against a 0.7–1.0 s ingest.
- No memo is wanted: a cache keyed on the `allItems` array would go stale in tests that mutate an item between calls.
- G6 (session start) is unaffected, because doctor reads `brief.md` and compiles nothing.

**Page size:**
- 131,425 bytes = **32,856 tokens**. The `- Q:` lines are 93,975 bytes (72%) and the `- Rule:` lines 16,740 bytes (13%); there are 189 blocks.
- It is larger than the plan's ≈25k because 08-F1 recovered answers (402 resolved against §1.4's ~280) and answers keep up to 40 words.
- `warn: decisions-size` therefore fires permanently here, as the owner accepted.
- Practical consequence: the page is past the host Read tool's default single-read token limit (25k on Claude Code), so agents must grep it, not Read it whole. Nothing in the agent prompts says so (open decision 2).

**Scans and re-parsing:**
- No second scan.
- `compile` and `latestDecisions` each re-run `collect`. That costs about 40 ms; leave it.

**Errors:**
- `readUnlabelledContradictions` never throws.
- `scanRawItems` skips malformed frontmatter and reports it through `onSkip`.
- `collect` has no per-item guard. The extract-sections functions are pure string code that 08's sweep ran clean on every corpus item, and the other four compilers follow the same pattern. A missing template throws, which the other four compilers also do.
- One accepted gap: a `label:` written as `~` or left empty is not treated as `null`. `commitPhase4Findings` always writes `null`, and only humans change the value.

**Freshness:**
- Story edits in a repo that excludes stories leave `decisions.md` stale until the next mapped ingest or `wiki build`. The owner accepted this lag, and decision 12 keeps it.
- Side effect after G-M2-55 item 5: the brief's `Decisions:` line will refresh on a story edit while `decisions.md` will not, so the two can disagree for a while. Adding `decisions` to that branch would cost about 50 ms; that is the owner's call, and the default stays as decided.
- New `label: null` entries reach the page on the next ingest after `wiki contradict-commit`, the same lag G-M2-55 item 5 accepts for the brief.

**Docs:** all carry-forwards landed (§1). The query agent still never mentions `decisions.md`, so the page is reachable only through protocol §10.1 (F1-5).

---

## 4. Supersession precision: the F1 decision

The rule at `decisions.ts:78-93` follows plan step 3 literally: the first ID anywhere in the rest of the sentence after the verb. Sentences split only on `. `, `.\n` and `\n\n`, so a "sentence" often spans list lines and table rows. On today's corpus that gives 8 distinct hits, of which **1** is true (EPIC-063 → EPIC-020). Four of the hits render as `- Supersedes:` lines on the page:

| Rendered line | Source | True? |
|---|---|---|
| EPIC-063 → EPIC-020 | the `<rule>` "This supersedes EPIC-020's …" | yes |
| STORY-063-10 → EPIC-020 | the story quotes the example (`"supersedes EPIC-020's …"`) | no |
| STORY-063-10 → STORY-063-11 | the API table row `` `…supersedes: string[] }>` \| STORY-063-11 (session brief) `` | no |
| CR-022 → CR-021 | a table row (`shipped (CR-021 / SPRINT-18)`) | no |

The other 4 hits are dropped by D4. All 4 are false: "superseded), [[STORY-005-05]]", "superseded/stale … CR-070", a later line's "CR-124", and a PROPOSAL-074 table cell.

A page that says "STORY-063-10 supersedes STORY-063-11" tells the orchestrator something untrue about live work. That is the class of state lie M2 exists to remove (G14, A1, A3). It does not break 11 (the brief never renders `supersedes`) or 12 (D7 compares ids only, and the eval runs on its own fixture corpus). **So: F1 inside M2, merged before §R. It is not a merge blocker for 10.** I measured the G-M2-57 rule below with a scratch reimplementation: 8 hits → exactly 1 (EPIC-063 → EPIC-020). Every sealed R4 row stays green on inspection, because in each positive row of the 13-sentence matrix, page Gherkin 3 and the `latestDecisions` supersedes test the ID comes directly after the verb.

### STORY-063-10-F1 scope

Files touched: `src/wiki/synthesis/decisions.ts`, `templates/synthesis/decisions.md`, the decisions tests, and the query agent `.md` plus its regenerated `.toml`. 11 touches none of these, so the F1 can run in a worktree alongside 11.

- **F1-1 (G-M2-57):** the supersession rule.
- **F1-2 (D2):** within an item, read the two disjoint sections in body-offset order.
- **F1-3 (D5):** give each entry its own copy of the `supersedes` array.
- **F1-4 (D8):** header wording: "Story decisions refresh on the next ingest of an epic, CR, bug, proposal, initiative, story or sprint, or on `wiki build`."
- **F1-5 (open decision 2, default yes):** add one sentence to query agent Step 2, Claude `.md` and then `npm run gen:codex`: "To check whether something was already decided or superseded, grep `.cleargate/wiki/decisions.md` for the topic or ID; it is too large to Read whole on big repos."

QA-Red hints for F1-1:
- **Negative rows:**
  - the table row `| latestDecisions | … supersedes: string[] }> | STORY-063-11 |` → none;
  - `` `supersedes` `` inside a code span → none;
  - `Example: EPIC-063's "supersedes EPIC-020's …"` → none;
  - `[[STORY-004-03]] (… superseded), [[STORY-005-05]]` → none;
  - a sentence over two list lines, `… the BUG-089 supersede)\n- 2026-09-26 · CR-124 …` → none.
- **Positive rows:**
  - `supersedes [[EPIC-020]]` → EPIC-020;
  - ``supersedes `EPIC-020` `` → EPIC-020 (a backticked ID after the verb is allowed).
- **Live check:** the STORY-063-10 block carries no `- Supersedes:` line, and EPIC-063 keeps `[[EPIC-020]]`.

---

## Amendment proposals (the orchestrator applies them; M2.md was not edited)

- **G-M2-57 (supersession precision; binds 10-F1 and 12's corpus; replaces plan 10 step 3's "`extractWorkItemIds(<text after the match>)[0]`").** A `supersed(e|es|ed|ing)` match records X only when all of the following hold:
  1. Its line does not start with `|` (a table row).
  2. It is not inside an inline code span (an odd number of backticks precedes it on its line).
  3. It is not inside a double-quoted span (an odd number of ASCII `"` precedes it on its line).
  4. The first non-space token after the match, minus a leading `[[`, `"`, `'` or backtick, **starts with** a work-item ID X (`extractWorkItemIds(token)[0]`, the same starts-with rule as `parentIdOf`).

  Kept unchanged: the `not`/`never`-before guard, the `\s+by\b`-after guard (G-M2-15), self-drop and dedup. Fenced blocks are **not** stripped: epic `<rule>`s sit inside fenced ```` ```xml ```` blocks, and stripping fences loses the one true hit (measured). Measured on today's corpus: 8 hits → 1.

- **G-M2-58 (D7 made exact; binds 12 and refines D7).** The oracle's D7 sequence is built as follows:
  1. **Section set per item.** Take the first non-empty `ai interrogation loop` section and the first non-empty `open questions` section (`findSection` as built, G-M2-46). When one lies inside the other's line range, read only the outer one; otherwise read both. Every line is read once, and no pair spans two disjoint sections. Corpus today: 2 nested items (0 answered pairs inside the nested part) and 1 disjoint item (EPIC-045).
  2. **Entries.** Every answered pair (G-M2-46 rules 1–5, orphan answers included) is one entry. Identical pairs are not merged, and the id sequence keeps duplicates (today: CR-126 ×4, then EPIC-063).
  3. **Date.** Use `approved_at` when it is a non-empty YAML string, else `updated_at`, else `''`. Trim, then take the first 10 characters. The unset spellings of G-M2-55 item 4 (empty, `~`, `null`, `Null`, `NULL`) fall through. Undated items sort after all dated items; ties go by id in C order. Corpus today: 0 non-string and 0 non-ISO values.
  4. **Corpus (12 R4).** The one "supersedes" sentence sits in an item that has at least one answered pair, or in an open epic that has a `<rule>`; an item with only a supersession gets no block (D4). Its target ID follows the verb directly, outside quotes, code spans and table rows (G-M2-57). The page question's required token is that ID.

- **G-M2-59 (C11.1 `Decisions:` line; binds 11 and 12).**
  - **11:** each entry renders as `[[<id>]] <excerpt>`. The excerpt is the first 12 words of `text` after three steps: remove every `[[` and `]]`, replace every `;` with `,`, and collapse whitespace. Entries are joined with `; `.
  - **12:** compare-mode reads the Decisions id sequence as every `[[ID]]` on the line, in order, duplicates kept. It compares that with the first k ids of D7, where k is the number of ids shown.
  - If 11's QA-Red (wt11) already pinned Decisions excerpt text, route this to it as a shape change.

- **G-M2-60 (corrects G-M2-55 item 5's mechanics; binds 11).** `refreshRelationPages` returns `void` today (`wiki-ingest.ts:549-590`; it returns early when `delivery/` is absent).
  - 11 changes it to return the bare `scanned` list, or `null` on the early return.
  - The brief is compiled from that list, filtered for `items` and unfiltered for `allItems`, and never from the relations input `items`, which carries the out-of-tree file (G-M2-56's `forRelations` rule).
  - When `refreshRelationPages` throws (the caller's `try` at `:170-174`) or returns `null`, the brief is not compiled in that branch.

## Out-of-M2 follow-ups

- Truncated entries for stories link to `[[STORY-…]]`. In a repo that excludes stories there is no such page; the raw file is still findable by ID. Doc note only.
- A human `label:` of `~` or empty is not read as unlabelled (C10.3 parses only `label: null`).

## Open decisions for orchestrator

1. **F1 timing.** Default: merge 10 now. Cut 10-F1 from post-merge `main` in a worktree, run it in parallel with 11's Dev (no shared files), and merge it before 12 starts, or at the latest before §R. QA-Red reruns only the decisions tests; the F1 Dev runs the full suite once.
2. **F1-5, a query-agent pointer to `decisions.md`.** Default: yes, in 10-F1. Optionally, 11's R5 orientation sentence gains a clause to grep `decisions.md` before reopening a settled question. That would touch 11's sealed CLAUDE.md text, so the default is **no** for 11.
3. **Accept G-M2-57 to G-M2-60** (G-M2-57 narrows plan step 3's literal rule).

## Script Incidents
None. No `run_script.sh` invocation; the read-only tsx census scripts ran from the session scratchpad with a short TMPDIR.

flashcards_flagged:
- "2026-11-12 · #wiki #decisions · 'first ID after supersede in the sentence' is 1/8 precise on this corpus (tables, code spans, quoted spec text); require the ID directly after the verb."
- "2026-11-12 · #wiki #decisions · Epic <rule>s sit inside ```xml fences; stripping fenced blocks before scanning rules or supersession sentences loses the real hits."
- "2026-11-12 · #wiki #brief · 46/402 decision answers contain ';' in their first 12 words; a '; '-joined brief line must sanitize excerpts or the oracle mis-splits."
- "2026-11-12 · #wiki #ingest · refreshRelationPages returns void; a plan that says 'reuse its scan' needs a signature change — grep return types before citing reuse."
