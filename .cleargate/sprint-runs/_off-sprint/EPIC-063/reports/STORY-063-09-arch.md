# STORY-063-09 Architect post-flight (role: architect, Mode: Post-Flight, off-sprint EPIC-063 M2)

## Verdict: PASS-WITH-FOLLOW-UPS

**No 09-F1 is needed: nothing has to land before 10.**

The 09 code matches C9 and G-M2-49..54. Every follow-up is either:
- a downstream contract amendment, recorded in `plans/M2.md` § Amendments:
  - **G-M2-55** binds 11 and the 12 oracle;
  - **G-M2-56** binds 10 and carries the doc fixes;
- or a non-blocking nit (N1–N6 below).

**Preflight.** This run is off-sprint, so there is no `sprint-context.md` (plan line 5). Branch `story/STORY-063-09` is at `2c40864`. I made no code edits, did not run `npm run build` or tsup in the checkout, and ran no wiki build or ingest against the outer repo. The outer `git status --porcelain .cleargate/{delivery,wiki}` md5 was identical before and after my probes (`0f698fef…`).

## Evidence

**Diff read.** `669ee3b..2c40864` in full. 21 files changed in the Dev commit alone:
- src: page-schema, sprint-partition (new), active-sprint, roadmap, open-gates, product-state, wiki-ingest, wiki-build, wiki-lint, lint-checks, wiki-config;
- 3 synthesis templates;
- scaffold: config.example.yml and the protocol;
- the 5 shape-change tests.

**Targeted tests on the branch:** 14 files, **256/256 pass**.
- The 7 files of 09 reds and guards.
- The pins:
  - `wiki-ingest-synthesis-parity.red` Scenarios 1, 1b and 2;
  - `active-sprint-sentinel.red`, unedited;
  - `build-ingest-parity`, `page-builder-shared`, `bucket-registry-parity.red`, `build-index-hierarchical` and `lint-index-budget`.

**Read-only probe on the real corpus.** A scratchpad script called `scanRawItems`, `computeRelations` and `buildIndex` in-process.

| Measure | Result |
|---|---|
| Corpus | 622 raw, 344 ingestable, **91 open** |
| Index size | **3,582 tokens**; header `> Compacted (tier 1): digests dropped from CR, bug and story lines` |
| Open IDs | 0 missing, 0 duplicated; every open ID appears exactly once as `[[ID]]` |
| Unparsable lines | 0 lines starting `- [[` that `parseIndexRow` rejects |
| Round-trip at tier 1 | 91/91 lines satisfy `formatIndexRow(parseIndexRow(l), indent) === l` |
| Round-trip at tier 0 | 91/91 (forced, 4,786 tokens) |
| Parsed titles | equal `deriveTitle`, with ` — ` written as ` - ` |
| Titles starting or ending with `—` | 0 (the one shape where the title/digest split could misparse) |
| `buildIndex` time | 19 ms average, 29 ms on the first call |
| `partitionSprints(all, META)` | `activeId` null, `staleId` null |
| Planned sprints | SPRINT-18, 31, 37, 42, 43 |
| `completed[0]` | **SPRINT-44**, key `2026-11-10T18:30:00Z`, canonical report |
| Next in `completed` | SPRINT-41, 40, 39, 38 |
| `partitionSprints` time | 9 ms per call |

These match the Dev's live numbers and decision 2: last closed is SPRINT-44, not SPRINT-32.

## 1. Contract fidelity

| Contract | Result |
|---|---|
| C9.1 `buildIndex(items, codeMap?, drift?, opts?: {relations, tokenTarget})` | ✓ Pure: `Buffer` is a global, there is no I/O import, and the purity rule holds. It measures `Math.round(bytes/4)` over the complete output, header and code-map block included (`page-schema.ts:599`). |
| C9.2 line shape, `IndexRowData {id,status,sprint,title,digest,drift?}` (G-M2-49) | ✓ `formatIndexRow` and `parseIndexRow` (`:332`, `:341`) are inverse (see the round-trip rows above). `sprint` values `''`, `null`, absent and `'null'` all render `no sprint`. A title's ` — ` becomes ` - `, and a digest's ` — ` becomes `, `. An empty digest ends the line at the title. `null` is returned for area, `IDs:`, rollup, code-map and header lines. |
| Placement (G-M2-49) | ✓ CRs, bugs and stories (`CHILD_BUCKETS`, `:413`) go under an open epic present in `items`, else under the first area token, else Unparented. With no `relations`, nothing nests. Under an epic: child rows (or the `IDs:` line), then the `stories (n):` rollup at 3 or more stories, which tiers never touch. |
| Tiers (C9.2a / G-M2-49) | ✓ Tier 1 drops child-level digests. Tier 2 drops all digests. Tier 3 collapses epic and area children to `  - IDs: [[…]]` (G-M2-2 wikilinks); Unparented rows stay, without digests. The ladder is first-fit with a floor at tier 3. The header texts match G-M2-49 verbatim, at line index 3. |
| Layout and order | ✓ Sections are Sprints, Epics, Proposals and initiatives (proposals, then initiatives, then spikes), By area, Unparented. Empty subsections are omitted, and there are no blank lines between area groups. Archive, Contradictions and the code map are unchanged. Sorting uses `localeCompare` (plan step 3). |
| Digests (G-M2-47) | ✓ `digestOf(digestSource(type, body, fm))` is computed lazily and cached by id (`:490`), only for rows rendered with a digest. Rolled-up stories and archived items are never digested. |
| C9.3 / C9.4 | ✓ `DEFAULT_INDEX_TOKEN_TARGET` lives in page-schema and is imported by wiki-config. `extractTarget` mirrors `extractCeiling`. `checkIndexTarget` uses the same `bytes/4` measure. Warnings print in both modes, after findings and before the summary. They never enter `findings` and never change the exit code. |
| C9.6 / G-M2-52 | ✓ `partitionSprints` filters sprints itself and keeps input order. `rankCompletedSprints` filters nothing. The key is the report's `generated_at` when set (trimmed, not `''`/`null`; canonical report preferred via `listSprintReports`, one per dir), else `updated_at`, else null. Sorting is descending by string, nulls last, then numeric stem descending (−1 when absent). This is semantically identical to 05's inline code. `active-sprint.ts` contains neither `numericStem` nor `listSprintReports`. |
| Roadmap in-flight row (G-M2-52) | ✓ Rendered from `activeId` even when that sprint is not in `items`: `sprintStatus.trim() \|\| 'unknown'` when the read is `ok`, else `state unknown`. Planned uses `partition.planned`. Shipped lists all of `completed` as `completed: <key \| date unknown>`. Template wording matches C9.6 verbatim. |
| State-page counts (G-M2-51) | ✓ Open is status not in `TERMINAL_STATUSES`; Shipped is by archive path; Total is everything. Keys are `open_*`, `open_epics_list` and `no_open_epics`, and the comment reads `// Open counts`. |
| Gate 1 rows (G-M2-50) | ✓ Heading, description and the row `- [[ID]] — <type> · status: <s> — <checks>` all match. Checks come from the exported `gateText`, with `not run` mapped to `gate not run`. Order is `ACTIVE_BUCKET_ORDER`, then `localeCompare`. Gates 2 and 3 are unchanged. |

## 2. G-M2-4 / G-M2-53: is the stamp-only path correct and safe?

**True no-op.** The work is still skipped. The Step 4 guard (`wiki-ingest.ts:228-242`) exits before 13's scan (`:270`), before `rebuildIndex` (`:369`) and before `recompileSynthesis` (`:384`). Nothing is compiled.

**Stamp-only.**
- The early return is gone.
- On the stamp-only path, each targeted page is compiled and written only when the file is missing or its bytes differ (`:774`, `:818-829`). Every other path writes unconditionally, as before.
- Bootstrap still selects all four pages.
- The C9.5a pair (`:826`) works on both paths: when exactly one of the two pages is targeted, the other is compiled too and written only when it differs.

**Git-status churn: none.**
- No synthesis compiler or template reads a clock. I grepped for `Date`, `toISOString`, `generated` and `timestamp`; the only hit is `generated_at` as a ranking key. So a byte difference is always a real content change, and a full `wiki build` would write the same bytes.
- `index.md` is still rewritten on every ingest that is not a no-op (tmp file, then rename), as before. When its bytes are identical, git shows nothing.

**Writes that are new, and intended:**
- During an active sprint, an epic or sprint ingest now rewrites `active-sprint.md` whenever `state.json` has moved, because of the coupled pair (G-M2-35). The page becomes current; this is not churn.
- Push stamps (`remote_id`) are stamp-only, and they now refresh Gate 3 in `open-gates.md`. Before 09 they left it stale, so this is a fix.

**13-F1 and the excluded-bucket path.** The branch (`:167-177`) runs `refreshRelationPages` and exits before the index and synthesis steps. That is correct for every 09 page:
- all of them compile from the filtered list;
- a story edit cannot move a CR or bug, because nesting happens only under open epics and a story is never a nesting parent.

It is **not** correct for 11's brief. The brief's facts count stories (the D-universe is all buckets), so story edits would leave `brief.md` stale. See G-M2-55 item 5.

**Cost.** The Dev measured about +30 ms. That fits: two `partitionSprints` calls at about 9 ms each (roadmap plus the coupled active-sprint) plus open-gates and product-state. See N1.

## 3. Downstream fitness (C10, C11, C12, D1–D8)

**What already fits:**
- `TERMINAL_STATUSES` is exactly D's open(i) set.
- `partitionSprints(…).completed[0]` is the single source for "last closed" (decision 2).
- `CompletedSprint.report` carries the canonical-preferred report path for D4's status, `**Stories:**` line and carried count (decision 3).
- No sprint ranking remains anywhere else in src. I grepped for `generated_at`, `updated_at`, `listSprintReports` and `numericStem`.

**Drift that is now amended:**
- **G-M2-55** (11 and 12):
  1. D4 must use `partitionSprints(allItems)`, the R universe. The 11 blueprint says `items`.
  2. D4 report fields come from `completed[0].report`.
  3. D6 must **not** reuse `partition.planned`. That list drops the `.active` sprint at compile time, which would bake the sentinel into `brief.md` and contradict G-M2-21 and 11 scenario 3. It is also in input order. The amendment adds a tie rule for TS and the oracle.
  4. "When set" means YAML-core nulls (`~`, `Null`, `NULL`) are unset, which the oracle must mirror.
  5. The excluded-bucket branch refreshes `brief.md` (default, see Open decisions).
  6. README orientation text (doc).
- **G-M2-56** (10): C10.4's `writeSynthesisPage(page, items, allItems, …)` predates the G-M2-53 split. `allItems` goes to `compileSynthesisPage` and `recompileSynthesis`; `writeSynthesisPage` is unchanged. The handler passes `scanned`, not `forRelations`. `decisions` follows the stamp-only write-on-difference path and is not coupled.

**Index consumers:**
- `link-target-exists` (`includes('[[ID]]')`) holds at every tier.
- `wiki query`'s `searchIndex` takes the first `[[ID]]` on a line, so a tier-3 `IDs:` line answers for its first ID only. This is the known plan gotcha, and the real corpus does not reach tier 3.
- BUG-097's excerpt stripping still works on C9.2 rows.
- `parseIndexRow` has no production consumer.
- 12's oracle does not read the index.

**Tier headroom.**
- Tier 1 is at 3,582 tokens, about 39 tokens per open item, which leaves room for about 10 more open items before tier 2.
- When the corpus crosses the target, every digest disappears at once and `index.md` shows a large diff.
- The tier is a pure function of the corpus, so build and ingest agree. This is R4 behaviour, not churn, but worth knowing on this repo.

## 4. Code quality

- **Dead code: none.**
  - `active-sprint.ts` has its imports pruned, and `isSet` and the inline ranking are gone.
  - `roadmap.ts` has lost `isSet` and the `activated_at` partition.
  - `product-state.ts` has lost `isActive`.
  - `page-schema.ts` has lost `rowFor` and `parentEpicOf`.
  - No `activated_at` logic remains in src or the templates; the only mention is the "never from" comment.
- **Duplicated ranking: none** (section 3).
- **`templates/synthesis/*.md`:**
  - The files are tracked and shipped, because package.json `files` includes `templates`.
  - `resolveDefaultTemplateDir` resolves them from the package root.
  - There is no live mirror and no drift check to update.
- **Performance:** `buildIndex` takes about 19 ms on 91 open items. Digests are computed only for rendered rows (G-M2-47).
- **Nits** (no action required for 10):
  - **N1.** `partitionSprints` runs twice per epic or sprint recompile (about 9 ms each here), and 11's brief would add a third run per ingest. This is optional. If 11's ingest timing pinches, compute the partition once per `recompileSynthesis` and pass it through an optional trailing parameter (additive to C5.1).
  - **N2.** `formatIndexRow` does not sanitise ` — ` or ` · ` inside `status` or `sprint`, so such a value would make the row unparsable. No corpus item has one, and no production code parses rows.
  - **N3.** A Gate 1 row prints `status: ` (empty) for a missing status, whereas the identity line prints `unknown` (G-M2-45). This is cosmetic.
  - **N4.** `test/wiki/query.node.test.ts:465` hand-writes an index in the retired `(epic)` row shape. The test still exercises BUG-097 correctly; refresh it when someone next touches it.
  - **N5.** In `recompileSynthesis`, the comment at `:810` ("initiatives, topics, unknown") is stale, since only `unknown` maps to no pages. It is pre-existing and carried to 10 under G-M2-56.
  - **N6.** `wiki build --code-map` measures the code-map block, but ingest's `rebuildIndex` passes `[]`. So after a code-map build, the next ingest drops that block (CR-091, pre-existing), and the tier can now differ between the two runs. Code map is opt-in and off in this repo.

## 5. Docs

**Agreement with the code.** Protocol §10.1, §21.1 and `config.example.yml` agree with the code, apart from two wording fixes carried to 10 (G-M2-56):
- §10.1's "one line per open item" overclaims, because rolled-up stories and tier-3 `IDs:` lines share a line.
- §21.1 says only `wiki build` compacts the index; ingest does too. That wording came from my own G-M2-54 text.

**Agent docs.** None describes the index row shape or the tiers, so none is stale on those points. Related stale text:
- `cleargate-wiki-query.md` uses a Gherkin example ("index lists PROPOSAL-stripe-webhooks archived as LIN-987") that an archive-as-counts index cannot satisfy. It has been stale since CR-103, and 09's §10.1 now states the rule outright. Carried to 10, with one sentence added to Step 1 and a `gen:codex` regeneration.
- The CLAUDE.md block and AGENTS.md step 1 ("~3k tokens. Lists active sprint, in-flight items…") are already 11's R5 rewrite.
- `README.md` ("~3k-token orientation page … at session start") is added to 11 (G-M2-55 item 6).

**Pre-existing, outside M2 (follow-up CR):**
- `wiki query --persist`, in both the CLI (`wiki-query.ts:188`) and the agent's Step 4b, appends a `## Topics` section that the next build or ingest drops.
- The `status-of` predicate parses the retired table-row index (`readiness-predicates.ts:872-877`). No `gate-checks.json` uses it; only `readiness-gates.md` documents it.

## 6. Shared surfaces with 10–12

| Surface | 09 left it | Rule for the next item |
|---|---|---|
| `wiki-ingest.ts` `recompileSynthesis` | `compileSynthesisPage` + `writeSynthesisPage(…, onlyIfChanged)`; coupled pair at `:826` | 10 adds `allItems` (G-M2-56) and the `SYNTHESIS_PAGES` rename. Keep the bootstrap `some(missing)` check over the renamed list. 11 adds `brief`, plus the excluded-branch refresh (G-M2-55 item 5). Neither 10 nor 11 adds a second `scanRawItems` call. |
| `lint-checks.ts` / `wiki-lint.ts` | `warnings[]` channel | 10 pushes `checkDecisionsSize` into the same array. A warning is never a finding. |
| `sprint-partition.ts` | owner: 09 | 11 imports it read-only. G-M2-55 items 1–3 govern D4 and D6. |
| `wiki-config.ts` + `config.example.yml` | `index_token_target` beside `index_token_ceiling` | 11 adds `wiki.brief.release_repos`, using the same extractor shape. |
| Protocol §10.1, §10.2, §21.1 | §10.1 index line; §21.1 target paragraph | 10 and 11 edit in place. G-M2-56 carries the two wording fixes. |
| `wiki-ingest-synthesis-parity.red` | Scenarios 1, 1b and 2 green, unedited | 10 and 11 append pages to the per-bucket map pins. They must never drop `open-gates` or `product-state`. |

## §R heads-up (these are not caused by 09; name them in §R step 1)

- `test/integration/foreign-repo.integration.node.test.ts` Scenarios 1 and 2 fail on this branch.
  - The cause is `:215` `assert.strictEqual(typeof v, '<message>', 'string')`, with the arguments swapped. It has been present since 880de75 (2026-06-04), and flashcard 2026-11-07 `#test-harness #assert` covers the pattern.
  - I ran this test on the branch. A scratch run on the base commit failed on every scenario for an unrelated reason: the scratch tree has no payload, so that run is not comparable.
- `test/commands/hotfix-new.integration.node.test.ts` Scenario 5 reads the **meta-repo's** `wiki/index.md` and looks for a "Hotfix Ledger" heading.
  - No src has ever written that heading (`git log -S`), and the current index does not contain it, so I expect this test to fail.
  - I did not run it.

## Open decisions for orchestrator

1. **G-M2-55 item 5 (the default is written into the plan).** 11 refreshes `brief.md` from the excluded-bucket branch, writing only on a byte difference and reusing `refreshRelationPages`' scan. The alternatives:
   - (a) also refresh `decisions` there, which would remove 10's header-note lag;
   - (b) accept the lag for the brief too. G5b passes at §R after a fresh build either way, but day to day the `Planned:` n/m (story ambiguity) and D2's story counts would go stale.

## Script Incidents

None. I made no `run_script.sh` invocation. The probes are scratchpad scripts run with `tsx` from the cli checkout, and the scratch tree for the base-commit test was a `git archive` extract that I removed afterwards.

## flashcards_flagged
- `2026-11-12 · #wiki #ingest · Excluded-bucket ingests exit before recompileSynthesis; a page computed over all buckets (brief) goes stale on story edits.`
- `2026-11-12 · #wiki #sprint · partitionSprints().planned drops the .active sprint at compile time; a sentinel-free page lists non-terminal sprints itself.`
- `2026-11-12 · #wiki #index · Index tier is a pure function of corpus size; crossing the target re-renders every line one tier down: big diff, not churn.`
