# STORY-054-02 — QA-Verify

role: qa

**Verdict: PASS.** All eleven verification items independently re-derived from source
(diffs, direct file reads, and fresh test runs — not from the Developer's or TPV's
prose). No discrepancy found beyond one confusingly-worded (not incorrect) line in the
Developer's own report.

Commits reviewed: outer `3a114e9c` (`.cleargate/knowledge/readiness-gates.md`,
`.cleargate/knowledge/cleargate-protocol.md`, `.cleargate/templates/spike.md` + three
`cleargate-planning/` mirrors), cli `32eaaa0` (`src/lib/work-item-type.ts`,
`src/commands/push.ts`, five test files + one `git mv`). Both on branch
`story/STORY-054-02`, outer in the MAIN checkout (not a worktree, per the story's
execution-routing note) — verified, no worktree created for this QA pass either.

---

## 1. Suite arithmetic

Ran the full suite myself from the cli MAIN checkout, story branch, fresh process:
`npm --prefix cleargate-cli test` → **suites 878 · pass 2514 · fail 1 · skipped 1**
(2516 total; `duration_ms 506453`, ~8.4 min, `--test-concurrency=1`). Matches the
Developer's reported `2516/2514/1/1` exactly — my dispatch's `2516/2508/7/1` was wrong,
as flagged; that was QA-Red's pre-fix baseline.

The single failure: `test/commands/sync.node.test.ts:1:18146` —
`exits 2 when no MCP URL or token is configured` —
`AssertionError`, actual `'Error: cannot reach https://cleargate-mcp.soula.ge (fetch
failed)\n'`.

**Confirmed against `main` directly** (not inferred from sprint-context.md's claim): I
`git checkout main`'d the cli repo (working tree was clean, only the pre-existing
untracked `cleargate-0.23.1.tgz`) and ran the single file
`npm --prefix cleargate-cli exec -- tsx --test test/commands/sync.node.test.ts`. Same
test, same location (`sync.node.test.ts:1:18146`), same error string verbatim
(`fetch failed` against `cleargate-mcp.soula.ge`). Genuinely network-dependent — this
sandbox has no outbound network — not newly caused by this story. Switched back to
`story/STORY-054-02` cleanly afterward (`git status --short` confirms clean, only the
tgz untracked).

*(Process note, not a story defect: I initially ran `git checkout main -- .` instead of
`git checkout main`, which staged 7 files as reverted-to-main in the story branch's
working tree. Caught immediately via `git status --short`, fixed with
`git reset --hard HEAD` before any test ran against the corrupted state. Confirmed clean
afterward — `32eaaa0` unaffected, no artifact of this mistake survives.)*

## 2. S6 arithmetic

Read the literal assertion at `test/docs/gate-section-index-pinning.node.test.ts:645`
(line shifted from the story's `:644` reference by the six-stale-prose-site edits, same
statement): `assert.strictEqual(criteria.length - unpinnableInRegistry.length, 16);` —
**16**, not 18. Matches TPV exactly.

The Developer's dev.md phrase `"S6 18=16+2"` is not wrong, just terse to the point of
ambiguity: it echoes the S6 **test title** string, which literally reads
`'S6: KNOWN_UNPINNABLE names exactly the two proposal criteria (size 2); 18 = 16 pinned +
2'` (confirmed in the diff) — not the numeric assertion. The assertion itself is 16.
Flagging as a phrasing note, not a defect; see flashcard below.

## 3. `severity: advisory`

Read `.cleargate/knowledge/readiness-gates.md` by eye (not via test): both new blocks
carry `severity: advisory` verbatim —

```yaml
- work_item_type: spike
  transition: ready-to-investigate
  severity: advisory
  ...
- work_item_type: spike
  transition: ready-to-conclude
  severity: advisory
  ...
```

Confirmed byte-identical in the `cleargate-planning/` mirror (`diff` silent). No
`severity: enforcing` anywhere in either block, either tree.

## 4. Invariant 1 — shipped template still scores 0

Ran the actual Pin A assertions myself (not trusted from TPV or dev prose):
`npm --prefix cleargate-cli exec -- tsx --test test/lib/work-item-type-spike.node.test.ts`
→ all 5 Pin A cases pass, including the 4 non-vacuity FAILS
(`question-stated`, `timebox-and-kill-criteria-set`, `decision-log-populated`,
`outcome-declared` all fail against the unedited `spike.md`, as required).

Independently grepped for line-initial bullets in the three edited sections, not relying
on the test: `awk 'NR==90,NR==121' spike.md | grep '^- '` (covers §1 lines 90-105 and §2
lines 106-121) → **zero matches**; `awk 'NR==138,NR==150'` (§5) → **zero matches**. The
three added sentences (one per §1/§2/§5) are prose instructing bullet-form answers, no
line-initial `- ` in any of them. §4 untouched (already non-vacuous via `declared-item`
on the empty table). Invariant 1 holds.

## 5. R24 ordering

Read `cleargate-cli/src/lib/work-item-type.ts` directly: `PREFIX_MAP` has `STORY-` first
(index 0) and `SPIKE-` last (index 8, appended after `HOTFIX-`). Guard test present and
green: `test/lib/work-item-type-spike.node.test.ts:107`
`'R24 PIN — detectWorkItemType("STORY-054-03_Spike-Doctrine.md") → "story", never
"spike"'` — ran it directly, passes.

## 6. Fixtures hand-written

Read `test/fixtures/gate-section-index/expected-headings.ts`'s four new rows and
independently cross-checked each against `spike.md`'s actual `## ` heading lines (via
direct `grep -n '^## '` on the live file, not the resolver):

| Criterion id | Fixture heading text | Verified against `spike.md` |
|---|---|---|
| `spike.question-stated` | `## 1. The Question` | line 90 — exact match |
| `spike.timebox-and-kill-criteria-set` | `## 2. Timebox & Kill Criteria` | line 106 — exact match |
| `spike.decision-log-populated` | `## 4. Decision Log` | line 129 — exact match |
| `spike.outcome-declared` | `## 5. Outcome & Spawned Items` | line 138 — exact match |

All four match byte-for-byte. Not resolver-derived — independently confirmed by reading
the template.

## 7. `KNOWN_UNPINNABLE.size`

Read the set definition directly: still exactly `proposal.architecture-populated` and
`proposal.touched-files-populated`, size 2. No spike id added to it (as the story's
ordering-hazard warning forbade).

## 8. `work-item-id.ts` unmodified

`git diff main -- src/lib/work-item-id.ts` in the cli repo → **empty**. DoD item
confirmed.

## 9. Mirrors byte-identical

All three `diff` commands silent (zero output):
`.cleargate/knowledge/readiness-gates.md` ↔ `cleargate-planning/.cleargate/knowledge/readiness-gates.md`;
`.cleargate/knowledge/cleargate-protocol.md` ↔ `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md`;
`.cleargate/templates/spike.md` ↔ `cleargate-planning/.cleargate/templates/spike.md`.

## 10. Gherkin coverage — 5/5

Read the actual test bodies (not just names) to confirm each genuinely exercises the
scenario, not just asserts a stub:

1. `detectWorkItemTypeFromFm({ spike_id: 'SPIKE-001' })` → `'spike'` —
   `work-item-type-spike.node.test.ts:80`.
2. `detectWorkItemType('SPIKE-001')` → `'spike'` — `:90` (plus R24 guard `:107`).
3. Advisory gate passes, §1+§2 populated, §5 empty — `:291` (`S3`). Read the body: builds
   a real temp charter file, calls the real `gateCheckHandler`, asserts
   `cached_gate_result.pass === true` from the written frontmatter — not a mock of the
   evaluator.
4. Error case, §2 has 1 listed-item, reports `timebox-and-kill-criteria-set` by id — `:326`
   (`S4`), same real-handler pattern.
5. `cleargate push` resolves a spike charter to type `'spike'` and reaches `push_item` —
   `:445` (R21), real `pushHandler` + mock MCP client, asserts `pushCall.args.type ===
   'spike'`.

All 5 ran green in my own targeted run (12/12 in this file overall — 5 scenarios + R24
guard + transitions-content + 5 Pin A sub-assertions).

## 11. T2 extra sites

Both read the literal value directly:

- `test/commands/gate-unit.node.test.ts:748` — `assert.strictEqual((blocks).length, 11);`
  — title (`:738`) extended to `"... STORY-054-02 adds spike=10th+11th)"`, comment (`:744`)
  extended `"... + two spike blocks (STORY-054-02)"`.
- `test/lib/readiness-predicates.node.test.ts:714` — `assert.strictEqual((yamlBlocks).length,
  11);` — title (`:699`) extended `"... + two spike blocks STORY-054-02)"`, comment
  (`:707`) extended `"... STORY-054-02 adds two spike blocks (10th+11th)"`.

Both **11**, both titles and comments genuinely extended (not just the numeric literal).
Both ran green in my targeted pass.

## DoD (§4.2) — per item

- [x] Minimum test expectations (§4.1): 4 unit + 4 acceptance minimum; actual 12 cases in
  the dedicated file plus edits across 5 more test files — exceeds minimum.
- [x] All 5 Gherkin scenarios (4 original + M1 Open Decision #2's fifth) covered — see §10.
- [x] `work-item-id.ts` unmodified — see §8.
- [x] Both knowledge-doc mirrors updated — see §9 (plus the template mirror, also
  required by Cross-Cutting Rule 1, also confirmed).
- [x] Peer/Architect Review passed — TPV issued 7 rulings (`rulings-required`, not a
  block); all 7 independently confirmed applied by diff: Ruling 1 (two extra T2 sites,
  §11), Ruling 2/3 (sequence — no partial-state artifact observed, commits land clean),
  Ruling 4 (arithmetic 18/16/16, six not three stale-prose sites — confirmed in the diff
  header block), Ruling 5 (`git mv` to non-`.red.` name — confirmed, `work-item-type.node.test.ts`
  reference is now `work-item-type-spike.node.test.ts`), Ruling 6 (no severity assertion
  added — confirmed, none present), Ruling 7 (file otherwise untouched — confirmed, only
  the rename).

## Findings

None. No kickback-worthy defects found. One phrasing note (§2) recorded as a flashcard
below, not a defect.

## Script Incidents

None. All verification used the sanctioned direct commands from `sprint-context.md`
§Test Stack (`npm --prefix cleargate-cli run typecheck`, `npm --prefix cleargate-cli exec
-- tsx --test <path>`, `npm --prefix cleargate-cli test`) or plain `git`/`diff`/`grep`/`awk`
reads. No `run_script.sh` invocation was required.

---

```
QA: pass
SUITE: 2516/2514/1/1  (surviving fail same as main? yes — confirmed by checking out main
  and running test/commands/sync.node.test.ts directly: identical test, location, and
  error string, "fetch failed" against cleargate-mcp.soula.ge, no outbound network in
  this sandbox)
S6_LITERAL: 16 (test/docs/gate-section-index-pinning.node.test.ts:645, read directly —
  matches TPV; Developer's dev.md "S6 18=16+2" echoes the test TITLE string, not the
  assertion, and is not itself wrong)
SEVERITY_ADVISORY: both blocks — both read `severity: advisory` verbatim, quoted above
  in §3; confirmed byte-identical in the cleargate-planning mirror
INVARIANT_1: yes — Pin A's 4 non-vacuity assertions all still FAIL on the shipped
  spike.md (ran directly); independently grepped §1 (90-105), §2 (106-121), §5 (138-150)
  for `^- ` — zero matches in all three ranges
R24_ORDERING: yes — SPIKE- is index 8 (last) in PREFIX_MAP, STORY- is index 0 (first);
  guard test work-item-type-spike.node.test.ts:107 covers it and passes
FIXTURES_HANDWRITTEN: spike.question-stated → '## 1. The Question' (spike.md:90);
  spike.timebox-and-kill-criteria-set → '## 2. Timebox & Kill Criteria' (spike.md:106);
  spike.decision-log-populated → '## 4. Decision Log' (spike.md:129);
  spike.outcome-declared → '## 5. Outcome & Spawned Items' (spike.md:138) — all four
  independently verified against the live template, not the resolver
KNOWN_UNPINNABLE: 2 (unchanged — the two proposal.* criteria only, no spike id added)
WORK_ITEM_ID_CLEAN: yes — `git diff main -- src/lib/work-item-id.ts` empty
MIRRORS: yes — all three diffs silent (readiness-gates.md, cleargate-protocol.md, spike.md)
GHERKIN: 5/5 mapped — detectWorkItemTypeFromFm (work-item-type-spike.node.test.ts:80),
  detectWorkItemType prefix (:90, + R24 guard :107), advisory-gate-passes S3 (:291),
  advisory-gate-error S4 (:326), push resolves spike R21 (:445)
T2_EXTRA_SITES: both read 11 (gate-unit.node.test.ts:748, readiness-predicates.node.test.ts:714);
  both titles and comments extended, not just the numeric literal
DOD: all 5 items met — see DoD section above
FINDINGS: none
flashcards_flagged:
  - "2026-08-27 · #qa #test-harness · A dev report's suite-run shorthand can echo a test's own TITLE string (S6 18=16+2), not its numeric assertion (16) — read the assertion line, not the recap."
```
