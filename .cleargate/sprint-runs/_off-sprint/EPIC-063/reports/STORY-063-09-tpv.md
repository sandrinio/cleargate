# STORY-063-09 TPV (role: architect, Mode: TPV, off-sprint EPIC-063 M2)

**TPV: BOUNCE.** 2 test fixes for QA-Red (below). Plan amendments G-M2-49 … G-M2-54 are in `plans/M2.md` § Amendments. Once the 2 fixes are applied exactly as written, a TPV re-check can be waived (13 / 08 precedent).

Branch `story/STORY-063-09` @ 233a191 (cut from 669ee3b). Read-only: no src or test edits, no `npm run build`, no `tsup`, and no wiki build or ingest on the outer repo.

## Evidence
- 7 default-tier files, `TMPDIR=$(mktemp -d /tmp/tpv.XXXX) npx tsx --test …`: **136 tests: 118 fail, 18 pass.** This matches QA-Red's count. Every red fails for a 09 reason:
  - the old `(type)` row and flat list (`rowOf` undefined, missing headings);
  - no digests yet (tier 0 at 1× = 2,793 tokens);
  - no compaction (2× = 5,452 tokens);
  - `checkIndexTarget` absent, `index_token_target` absent;
  - `sprint-partition.js` not found; roadmap `compile` reading `repoRoot` as `templateDir` (ENOENT);
  - proposals-only Gate 1, `Active` columns, `activated_at` in flight;
  - the stamp-only early return.
- The 18 greens are guards: archive and empty state, determinism, Gates 2/3, lint under target, ceiling default.
- Live `index-open-ids.live.integration` on a scratch copy: open = 91, index = 2,736 tokens, tier 0. It fails at G3d (`_No sprints currently in flight._` count 0 ≠ 1), the reason QA-Red states. `git status --porcelain .cleargate/{delivery,wiki}` md5 was identical before and after, and the scratch dir was removed.
- Shape-change and pin suites on the baseline (hierarchical, page-builder-shared, build-ingest-parity, bucket-registry-parity, wiki-ingest-synthesis-parity, active-sprint-sentinel, build, lint-index-budget): **201/201 green.**
- Wiring: every import resolves (`computeRelations`, `deriveBucket`, `parseFrontmatter`, `evaluate(pred, {fm, body, absPath}, {projectRoot, wikiIndexPath})`, `digestOf`/`digestSource`, `scanRawItems`, `resolveActiveSprint`, `SprintReportFile {sprintId, absPath, relPath}`). Every `afterEach` removes the temp roots. Naming follows the plan (`*.red.node.test.ts`; the two Goal-cited files keep their plan names).

## Fix list (QA-Red)
1. **`test/wiki/index-tiers.red.node.test.ts:155`.** Change to `assert.deepEqual(areaBlock(t3, a).filter((l) => l.trim() !== ''), [\`  - IDs: …\`], a);`.
   - Why: `areaBlock` runs to the next `- area:` line or heading. The last group therefore carries the blank line before `### Unparented` (G-M2-49 layout, and the conventional one), so a correct tier-3 render fails on whitespace, not policy. Line 149 (`nestedUnder`) is fine.
2. **`test/wiki/state-pages-open-work.red.node.test.ts:261`.** Seed with `doc(id, { approved: false, gate: { pass: true } })` instead of the failing gate, so the flip at :250 (`approved: true, gate: { pass: true }`) changes `approved` alone. In `flipAndIngest`, also assert that the item's wiki page body is byte-identical before and after the ingest. Use the text after the closing frontmatter fence of `wiki/<epics|bugs>/<id>.md`, read once after the build and again after the ingest. That proves the stamp-only path ran.
   - Why: probed on the baseline in scratch. A `fail → pass` gate flip changes the identity line's `**Gate:**`, so the ingest is **not** stamp-only, and the ingest rewrote `open-gates.md` anyway (body changed). A `pass → pass` flip is stamp-only (body same, no rewrite).
   - As written, once R7 lands, both EPIC-501 and BUG-501 cases pass without C9.5. They are vacuous for G-M2-4 / plan scenario 7, which is the only content check of `open-gates.md` on the stamp-only path. The mtime case at :277 already uses a pure flip and stays as is.

## Fidelity
- **Gherkin coverage is complete:** S1 (build, nesting, area, line, once, ingest byte-identical after junk overwrite), the Outline at 1×/2× (in-memory and through `wiki build`), S3, S4 and S5.
- **Goal Acceptance items 09 owns are covered:**
  - G3, G3b, G3c and G3d by the live test;
  - G3d additionally by `sprint-pages-agree` (a)–(d) and C9.5a;
  - R6/R7 on the real corpus.
- **Plan scenarios 1–12 are covered.** Scenario 7's content check needs fix 2. Scenario 12 is the sealed `active-sprint-sentinel.red`, green and unedited.
- **Over-pinning: none material.** Two source-text pins are accepted because the plan states them: `sprint-partition.red:220-229` (import plus "moved, not copied"), whose comment trap is called out in G-M2-52, and the header at line index 3 ("directly under").
- **Unlisted pin, accepted.** A default `tokenTarget` of 4000 when `opts.tokenTarget` is absent (`index-tiers.red:81`) is now G-M2-49's `DEFAULT_INDEX_TOKEN_TARGET`.

## Tier ladder and generator
- **Generator vs decision 1 census: matches.** 92 open (48/17/15/6/5/1), 22 area groups, 10 nested, 2 unparented and 252 archived at 1×, all doubled at 2×.
- **Independent estimator** (scratch, my own renderer of C9.2 over `digestOf`/`digestSource`/`computeRelations`):

  | Corpus | Tier 0 | Tier 1 | Tier 2 | Tier 3 | Lands at |
  |---|---|---|---|---|---|
  | Generator 1× | 4,796 | 3,595 | 3,090 | 1,432 | tier 1 |
  | Generator 2× | 9,445 | 7,036 | 6,023 | 2,744 | tier 3 |
  | Real corpus (91 open) | 4,771 | 3,566 | — | — | tier 1 (434 tokens of headroom) |

  The calibration margins (> 4,400 at tier 0; ≤ 4,000 at tier 1; > 4,000 at 2× tier 2) all hold with ≥ 10% margin.
- **The ladder pins the policy, not just shrinkage.** Requesting tier k+1 at `tokens(tier k) − 5` forces first-fit selection, so a skipped tier or a "most compact that fits" choice fails. It also forces measurement that includes the header: a measure without the header lets tier k "fit" and fails. The per-tier content tests catch every wrong drop set:
  - tier 1 dropping only nested digests, or every digest;
  - tier 2 touching titles, status or sprint;
  - tier 3 keeping digests or collapsing epics.
  - The floor test pins the stop at tier 3; the boundary test pins `≤`.

## Rulings on QA-Red's 13 ambiguities
1. The title is always on the line, and a missing H1 shows the ID: **confirmed** (G-M2-49).
2. Area items are indented two spaces: **ruled** (G-M2-49). Blank lines between area groups: none. The full layout is pinned.
3. `partitionSprints` filters to sprints; `rankCompletedSprints` does not filter: **confirmed/ruled** (G-M2-52).
4. `IndexRowData` is `{id,status,sprint,title,digest,drift}`, with sprint `no sprint`: **confirmed**. The string `null` also means no sprint (G-M2-49).
5. Tier 3 keeps Unparented rows: **confirmed**. Stories follow the CR/bug rules (G-M2-49).
6. The header text is now pinned per tier; it sits at line index 3 (G-M2-49).
7. Self-observed thresholds: **confirmed** by the independent estimator (numbers above).
8. With no relations nothing nests, and `buildIndex` never calls `computeRelations`: **ruled** (G-M2-49).
9. Gate 1 row, heading, description and checks come from the exported `gateText`; order is `ACTIVE_BUCKET_ORDER` then id: **ruled** (G-M2-50).
10. Open by status, Shipped by path, Total = all: **confirmed** (G-M2-51).
    - The row need not add up. 30+ terminal items still sit in `pending-sync/` and count in Total only; 6 archived non-terminal items count in Open and Shipped.
    - No conflict with D1–D8: they define "open" by status and never use a path-based "shipped".
    - Gate 1 and the index use the same status rule.
11. Roadmap row: ok with an empty `sprint_status` → `unknown`; any non-ok status → `state unknown`; rendered from `activeId`: **confirmed** (G-M2-52).
12. Live tier ≤ 1: **confirmed**. Real corpus at tier 1 with 434 tokens of headroom.
13. The plan's census wins over the story text: **confirmed** (decision 1).

**G-M2-4 / QA-Red's flashcard.** The fix is pinned:
- by `state-pages…red:277` (stamp-only writes on difference only, mtime);
- by `sprint-pages-agree` C9.5a "approve" (a pure flip, content equals a fresh build);
- after fix 2, by the EPIC-501/BUG-501 cases for `open-gates.md` content.

C9.5 named the behaviour but not the mechanics. G-M2-53 now specifies them: a `compileSynthesisPage` split, the early return deleted, and write-on-difference only on the stamp-only path, which keeps Scenario 1's and 1b's mtime pins green.

## Shape-change reds
QA-Red's list is incomplete. G-M2-54 holds the full list with the exact replacement lines:
1. **Item 4's location and digest are wrong.** It is `build-ingest-parity.node.test.ts:123`, not `:121`. The replacement has **no** digest, because `epicContent` has no Objective.
2. **A 5th red was missed.** `bucket-registry-parity.red:211` extracts product-state's `total_*` keys from `// Totals` up to `// Active counts`. The R6 rename of that comment empties the slice and fails every bucket. The Dev updates the regex (G-M2-51).
3. **The golden's expected lines are derived in G-M2-54**, so the Dev checks the regenerated file instead of trusting its own output.
4. **Guards kept:**
   - "no individual story row" becomes "no STORY line parses as a row; each wikilink appears once";
   - "title omitted when equal to id" is inverted, with a supersede note (ambiguity 1).

## Script Incidents
None. No `run_script.sh` invocation; the scratch scripts live under the session scratchpad.

## flashcards_flagged
- `2026-11-12 · #tpv #wiki #ingest · An approve-flip red that also changes cached_gate_result changes the page identity line; ingest is not stamp-only.`
- `2026-11-12 · #tpv #test-harness · A block slice running to the next heading keeps the blank line before it; drop blank lines before deepEqual.`
- `2026-11-12 · #wiki #test-harness · bucket-registry-parity slices product-state.ts from "// Totals" to "// Active counts"; renaming that comment empties it.`
