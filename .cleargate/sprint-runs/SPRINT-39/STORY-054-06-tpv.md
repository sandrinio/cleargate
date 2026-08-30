# STORY-054-06 — TPV (Test Pattern Validation)

role: architect

Mode: TPV. Gate between QA-Red (`c9d44ba`, cli repo) and Developer. Wiring + red-baseline
honesty only. Test-logic correctness remains the Developer's TDD challenge except where the
dispatch's five questions explicitly put it in scope.

**Verdict: `TPV: rulings-required`.** All five wiring checks PASS — there is no
`BLOCKED-WIRING-GAP`, the file does not go back to QA-Red. But the mutation battery found two
implementations that pass all eight assertions while violating two of the M2 plan's own
normative rulings, and the sequence analysis found that M2 §N7's "Commit A is inert" property is
no longer true now that QA-Red's file exists. Ten binding rulings below; all are additive
(nothing in the red file weakens).

---

## Preflight

Read: `sprint-context.md` (both halves), `STORY-054-06_Task_Breakdown_Section.md` incl. the
committed `§3.1 AMENDMENT` block (verified present in `HEAD` — commit `2ed99cf8`, so
`file_surface_diff.sh:150-157` will see it), `plans/M2.md` §§N1–N7 + the full STORY-054-06
blueprint, `STORY-054-06-qa-red.md`, and the red file itself. Flashcards checked by direct grep
of `.cleargate/FLASHCARD.md` for `#test-harness` and `#gate` (no `Skill` tool is exposed to this
dispatch; CLAUDE.md's grep protocol is the documented equivalent). Load-bearing cards:
2026-08-27 `#test-harness #tpv #danger` (helpers unexecuted behind a guard), 2026-08-27
`#test-harness #tpv` (a red-window prediction must be MEASURED), 2026-08-27
`#test-harness #cross-repo #danger` (cli test reading the outer tree = cross-BRANCH dependency),
2026-08-27 `#gate #readiness-gates #danger` (BUG-054 / `listed-item` is only safe paired with a
zero-bullet section), 2026-08-27 `#gate #readiness-gates` (R11 — assert doc-referenced paths
exist), 2026-08-27 `#test-harness #gate #danger` (a guard that reports SKIPPED satisfies "fail 0"
while asserting nothing).

## Method

Everything below was measured, not reasoned. An out-of-tree scratch mirror was built at
`/private/tmp/claude-501/.../scratchpad/tpv06` reproducing the meta-repo layout
(`<S>/cleargate-cli/{src,test}`, `<S>/cleargate-planning/.cleargate/{knowledge,templates}`,
`<S>/.cleargate/{knowledge,templates}`) so that `CLI_ROOT`/`META_ROOT`/`CANON` resolve inside the
scratch. **No file in either real repo was modified.** The real tree was only read, plus four
read-only targeted test runs.

---

## Wiring checks (the TPV mandate) — 5/5 PASS

| # | Check | Result |
|---|---|---|
| 1 | Imports resolve to real modules at the cited paths | **PASS.** `../../src/lib/readiness-predicates.js` from `test/lib/` → `cleargate-cli/src/lib/readiness-predicates.ts`. `evaluate` is exported at `:154`; `ParsedDoc` at `:125`. Both resolved live in every run below. |
| 2 | Constructor / signature calls match source | **PASS.** `evaluate(predicate: string, doc: ParsedDoc, opts?: EvalOptions)` (`:154-158`). All eight call sites pass exactly two arguments; `opts` is optional and unused by both predicate kinds exercised. `makeDoc` (`:43-45`) emits `{ fm, body, absPath }` — byte-for-byte the `ParsedDoc` interface at `:125-129`, no missing or extra field. |
| 3 | `t.mock.method()` targets exist | **PASS (vacuously).** The file uses no mocking of any kind — no `t.mock`, no `mock.method`, no module stubbing. |
| 4 | Setup/teardown leaves no orphan state | **PASS.** Zero `before`/`after`/`beforeEach`/`afterEach` hooks. Zero filesystem writes (`writeFile`/`mkdir`/`rm` all absent). Zero `process.cwd()` / `process.env` reads. The file is read-only and order-independent. |
| 5 | Red-test naming per `sprint-context.md` §Test Stack | **PASS.** `*.red.node.test.ts`. Matched by `run-default-tests.mjs:23`'s glob `test/**/*.node.test.ts`; not caught by either exclusion (`!test/**/*.integration.node.test.ts`, `!test/fixtures/**`). Independently corroborated by QA-Red's `+8` full-suite delta. |

Plus the two extra wiring items the M2 plan's own TPV note named:

- **`path.resolve(CLI_ROOT, '..')`, not a worktree-relative root** — satisfied. `:54-56` are
  character-identical to `gate-section-index-pinning.node.test.ts:96-98`. The `test/lib/` vs
  `test/docs/` difference is immaterial: both are one level under `test/`, so the `'..','..'`
  climb lands on `cleargate-cli/` from either.
- **`templateBodyOf` replication fidelity** — `diff` of the two function bodies with comment
  lines stripped is **empty**. QA-Red's `:75-82` is a byte-identical copy of the pinning test's
  `:212-227` (same frontmatter regex, same `slice(index + length)`, same throw message). No
  divergent parser was introduced (Cross-Cutting Rule 3 / BUG-041 shape avoided).

**One deliberate divergence, ruled acceptable.** The pinning test guards its canonical reads
(`:391`, `if (!fs.existsSync(META_ROOT/cleargate-planning)) return;`). Scenario 7 has no such
guard, so in a standalone `cleargate-cli` clone it would hard-fail ENOENT rather than silently
pass. **Keep it unguarded.** That is the direction FLASHCARD 2026-08-27
`#test-harness #gate #danger` points (a `return`/`skip` guard reports pass and asserts nothing —
"fail 0" satisfied by a run that checked nothing). The concern is also not live: `cleargate-cli`
has **no** `.github/workflows/`, and ~20 existing cli test files already read
`META_ROOT/cleargate-planning`, so meta-repo coupling is pre-existing, not introduced here.

---

## T1 — Do all six reds discriminate, or is the baseline vacuous?

**Claim under test (QA-Red `RED_REASON`):** all six die at the same `parsePredicate:134` throw,
but each is reached via a distinct body construction, so the baseline certifies per-scenario
wiring.

### T1a — the throw is at the assertion line, and every helper runs first

Confirmed by stack, not by argument. The real-tree targeted run shows six identical stacks
`parsePredicate (readiness-predicates.ts:134:9) → evaluate (:159:18) → TestContext.<anonymous>
(<test>:100 | :116 | :153 | :175 | :212 | :227)` — six *distinct* call-site line numbers. For
Scenario 7 the frame is `:227`, i.e. **after** `templateBodyOf(CANONICAL_STORY_MD)` at `:226`
already read and stripped the real file. No fixture guard short-circuits anything. This is the
specific fact the M2 plan asked TPV to confirm rather than the generic one, and it holds.

(QA-Red cites the throw at `:135`; it is `:134`. So does the M2 plan §Test shape. Cosmetic.)

### T1b — implemented out-of-tree: all six flip green, and they discriminate

I applied M2 §Schema changes (4) **verbatim** (union member, `parsePredicate` branch, `evaluate`
switch case, `evalTaskBreakdownComplete`) to the scratch copy only.

```
P0  no predicate, template untouched (= today)      tests 8 · pass 2 · fail 6   [reproduced twice]
P1  predicate only, template untouched              tests 8 · pass 7 · fail 1   (Scenario 7)
P2  predicate + guidance-only section in canonical  tests 8 · pass 8 · fail 0   [reproduced twice]
```

P0 reproduces QA-Red's targeted `8/2/6/0` exactly. So the baseline is not vacuous in the count
sense: the six reds are six real assertions that a correct implementation satisfies.

### T1c — mutation battery: 6 of 8 mutants killed, **2 survive**

Eight implementations of `evalTaskBreakdownComplete` run against the unmodified red file in the
P2 state (predicate present, guidance-only section shipped). "Killed" = at least one assertion
fails.

| Mutant | What it does wrong | Killed by | Verdict |
|---|---|---|---|
| `correct` | — | — (0 fail) | control |
| `M1_always_absent` | ignores the body; always `pass:true, detail:"…absent"` | **S1, S6, S7** | killed |
| `M2_absence_fails` | no migration grace — absent section fails | **S2, S3a** | killed |
| `M4_no_teeth` | present-but-row-free returns `pass:true` | **S6, S7** | killed |
| `M5_interprets_ref` | parses `-> R5` and leaks it into `detail` | **S4** | killed |
| `M7_whole_body` | counts rows over the whole body, not the located section | **S7 only** | killed |
| **`M3_listed_item`** | **counts `/^\s*- /gm` (`listed-item`) instead of `- [ ]`/`- [x]`** | **nothing — 0 fail** | **SURVIVES** |
| **`M8_literal_heading`** | **`firstLine.trim() === '## Task Breakdown'`; never calls `headingTitleOf`** | **nothing — 0 fail** | **SURVIVES** |
| `M6_startswith` | over-broad heading match (`startsWith('Task')`) | nothing — 0 fail | survives (same class as M8) |

`M3` and `correct` were both re-run; both reproduced.

**Why M3 survives:** every body in the file that must fail (Scenario 6's guidance block,
Scenario 7's canonical `story.md` `## Task Breakdown` section) contains **zero** line-initial
`- ` of any kind, so a `listed-item` counter and a checkbox counter both score 0 and both fail.
Every body that must pass contains a `- [ ]` row, which is also a `listed-item`. The two counters
are indistinguishable across the whole suite.

This is not a cosmetic gap. `listed-item` is precisely the implementation **M2 §N2 forbids**, on
BUG-054 grounds, in a normative ruling — and the reason it forbids it is that a future bullet in
the guidance block silently re-vacates the criterion, which is how `story.dod-declared` and
`initiative.success-criteria-populated` were already vacated twice in this repo (FLASHCARD
2026-08-27 `#gate #readiness-gates #danger`). The red baseline does not pin the one distinction
the plan spent a ruling on. → **RULING 1.**

**Why M8/M6 survive:** every heading in every body is the bare `## Task Breakdown`. Nothing
exercises the numeric-prefix tolerance that registry edit 3's vocabulary entry ("numeric prefixes
tolerated"), the `evalTaskBreakdownComplete` docstring, and the M2 §Gotchas paragraph all
promise. An implementation that contradicts the shipped documentation passes the whole file.
→ **RULING 2.**

**Answer to T1:** the baseline is honest — six genuine assertion-line reds, six distinct
constructions, all six satisfied by the plan's own implementation. It is **not** vacuous in the
STORY-054-05 S3 shape (where an assertion passed merely because the throw stopped). But it is
**incomplete**: the criterion's two load-bearing normative properties are uncovered, and the
uncovered pair is exactly the pair the M2 plan wrote rulings about.

---

## T2 — Scenario 5 asserts a file exists. Is that a test?

**Ruling: legitimate pin. KEEP. Do not strengthen. Correct the comment.**

It duplicates an assertion that already exists — the pinning test's own **S7** (`:650-665`)
extracts every `` `cleargate-cli/test/**/*.node.test.ts` `` path from the Predicate Vocabulary
prose and `existsSync`-checks each, and asserts the list *includes* its own promoted path. On
that basis Scenario 5 looks redundant.

It is not, for one structural reason: **S7 lives inside the very file it asserts about.** Delete
or rename `gate-section-index-pinning.node.test.ts` and S7 is deleted with it — the suite loses
14 tests, `readiness-gates.md:36`'s citation is orphaned, and *nothing fails*. Scenario 5 is the
only witness that survives that deletion, because it lives in a different file.

**What it would actually catch:** deletion, rename, or relocation of the STORY-054-05 pinning
test — which is simultaneously (a) the single automated witness for the `section(4)`→`section(5)`
bump this very story performs, (b) the file `readiness-gates.md:36` names contractually, and
(c) the file M2 §Reuse forbids re-implementing. Losing it silently is a real and specific
failure mode.

**What it does NOT catch, and its comment wrongly implies it does:** the comment at `:188-189`
says it pins "the promoted path `readiness-gates.md:36` cites". It does not — it pins a
hardcoded constant (`:60-65`). If the vocabulary prose were edited to cite a different path,
Scenario 5 stays green. That direction is S7's job. → **RULING 5** (comment correction only).

**Do not "strengthen" it into reading the registry.** Its current form touches `CLI_ROOT` only,
so it carries **zero** cross-repo dependency — unlike Scenario 7. Making it read
`readiness-gates.md` would import the cross-branch fragility of FLASHCARD 2026-08-27
`#test-harness #cross-repo #danger` for a check S7 already performs. The cheap form is the
correct form.

---

## T3 — Scenario 3b: does it pin the *pre*-bump index?

**No. It pins the POST-bump index, and it stays true after the bump.**

Measured on 3b's own `legacyBody` with the real exported `evaluate()`:

```
section(3) has ≥1 declared-item   {"pass":true, "detail":"section 3 has 1 declared-item (≥1 required)"}
section(4) has ≥1 listed-item     {"pass":true, "detail":"section 4 has 1 listed-item (≥1 required)"}
section(5) has ≥1 listed-item     {"pass":false,"detail":"section 5 not found (body has 4 sections)"}
task-breakdown-complete           {"pass":true, "detail":"not-applicable: ## Task Breakdown section absent"}
```

Today `section(4)` is `story.dod-declared` and it **passes** on this body. `section(5)` — what
`dod-declared` becomes after the Developer's registry edit — **fails**. 3b asserts the
`section(5)` result. So it describes the world this story is about to create, not the one it is
leaving. Post-bump it is the assertion that correctly characterises the N5-accepted residue.
Confirmed green in the FULL state (new file 8/8).

**But it is a synthetic-body pin, and its title over-claims.** It never reads
`readiness-gates.md`, never reads a corpus item, and hardcodes its check string. It therefore
stays green if the Developer forgets the bump entirely — it provides **zero** protection against
the failure it appears to be about. Its title says "the accepted N5 residue, not this story's
regression", which invites exactly the inference the M2 plan spends a whole subsection warning
against for `readiness-predicates-prior-work-ambiguity.node.test.ts:274`/`:356`: *"a reader greps
`section(4)` + `Quality Gates`, finds these, and concludes `dod-declared` is double-covered. It
is not: these read a synthetic body, never the template, and never the registry."* The new file
reproduces that pattern in a fresh file, one wave after the plan required it be removed two files
over. → **RULING 4** (retitle at promotion; assertion unchanged).

---

## T4 — Scenario 7, the non-vacuity pin

### (a) Does it genuinely read the real file, not a fixture? — YES

- `CANONICAL_STORY_MD` = `META_ROOT/cleargate-planning/.cleargate/templates/story.md`
  (`:54-57`), the tracked canonical source of truth. No fixture directory is referenced anywhere
  in the file.
- `templateBodyOf` is byte-identical (code lines) to the pinning test's; verified by `diff`.
- Proven by execution, not inspection: the P0 failure frame is at `:227` (the `evaluate` call),
  which is only reachable if `:226`'s `templateBodyOf(CANONICAL_STORY_MD)` already succeeded. A
  fabricated or missing path would have thrown ENOENT at `:226` with a different stack.
- Live and canonical `story.md` are byte-identical today (`diff` silent), and live↔canonical
  parity for `story.md` is separately machine-checked by the pinning test's **S1c**, so reading
  canonical only is not a coverage hole.

### (b) Would it bite on a worked-example task row in the shipped template? — YES, measured four ways

Against the correct implementation, with the guidance block in canonical `story.md`, one line
appended to that block per run:

| Mutation of the shipped guidance | Counted as a row? | Scenario 7 |
|---|---|---|
| `- [ ] add the predicate branch -> R5` (line-initial) | yes | **RED** *(reproduced)* |
| `  - [ ] indented worked-example row` (2-space indent) | yes | **RED** |
| ```` ```\n- [ ] fenced example row\n``` ```` (inside a fence) | yes | **RED** |
| `> - [ ] blockquoted example row` | no | green |
| `- plain bullet, no checkbox` | no | green |

So the pin bites on the exact mistake STORY-054-01's invariants exist to prevent, and its bite is
**broader** than the M2 plan's stated invariant: the plan says "zero line-initial `- `", but an
*indented* `- [ ]` also counts (the row regex is `/^\s*- \[[ xX]\]/gm`) and a *fenced* one counts
too (the counter is fence-blind — the same class as FLASHCARD 2026-07-19
`#test-harness #readiness-gates`).

Two corrections to the plan's invariant, both measured:
1. A plain `- ` bullet with **no** checkbox does **not** vacate `task-breakdown-complete`. The
   plan's "a bullet here re-vacates the criterion" is true of a `listed-item` predicate and false
   of this one. Keep the zero-bullet rule anyway — but the *teeth* depend on checkbox rows, and a
   Developer who believes otherwise will reach for `listed-item` (which is exactly mutant M3).
2. The `> ` blockquote prefix is what keeps the shipped example inert. Converting the inline
   `` `- [ ] <action>` `` illustration into a fenced block "for readability" reds Scenario 7.
   → **RULING 9.**

### (c) Does it survive the Developer *adding* the section? — YES

P2 (predicate + guidance-only section, both trees, byte-identical): **8 pass / 0 fail**,
reproduced. The Developer never has to touch QA-Red's file to make it green. Scenario 7 is also
the **sole** killer of mutant M7 (whole-body row counter) — the canonical `story.md` body carries
`- [ ]` DoD checkboxes under `## 4. Quality Gates`, so an unscoped counter returns `pass:true`
and only this assertion notices. That makes Scenario 7 the highest-value test in the file.

**One consequence, and it is the T5 hinge:** with the predicate present and the template *not*
yet edited — precisely M2 §Commit plan's **Commit A** content in isolation — Scenario 7 is RED
(P1: 7 pass / 1 fail, measured twice). M2 §N7's "cli code first → INERT, suite green" was
measured before QA-Red's file existed. **It is no longer true.**

---

## T5 — Sequence: measured red set per intermediate state

Four test files were run against each state in the scratch mirror. `readiness-predicates.node.test.ts`
carries **4** scratch-environment failures in the mirror that do not exist on the real tree
(missing top-level `package.json`, missing `pending-sync/` corpus, two unrelated export probes);
they are subtracted from every row below. Real-tree baseline was measured directly and is clean:
`gate-unit 25/25`, `readiness-predicates 119/119`, `gate-section-index-pinning 14/14`
(reproduced twice).

| State | gate-unit | readiness-predicates | gate-section-index-pinning | new red file | attributable reds |
|---|---|---|---|---|---|
| **P0** today (`c9d44ba`) | 0 | 0 | 0 | 6 | **6** |
| **A only** — cli code, outer untouched | 0 | 0 | 0 | **1 (Scenario 7)** | **1** |
| **Registry only** — `readiness-gates.md` edited, no templates, no cli code | 1 | 1 | **3 (S1b, S3a, S3b)** | 6 | **11** |
| **B only** — registry **+** templates, no cli code | 1 | 1 | 0 | 6 | **8** |
| **FULL** | 0 | 0 | 0 | 0 | **0** |

Exact failing test names:

- `gate-unit.node.test.ts` → *"all criterion check strings in readiness-gates.md parse via
  parsePredicate without throwing"*
- `readiness-predicates.node.test.ts` → *"every criterion.check parses via parsePredicate without
  throwing"*
- pinning → *"S1b: every pinnable criterion resolves to its fixture-pinned heading against the
  canonical templates"*, *"S3a: … expected exactly one finding …"*, *"S3b: … expected exactly two
  findings …"*

**Three findings this table produces:**

1. **Commit A is no longer inert.** M2 §N7 and §Commit plan both assert it is. Measured: it reds
   Scenario 7. There is now **no** intermediate at which a clean checkout of either repo alone is
   green. The order is still cli-first (registry-first hard-fails the outer pre-commit, which is
   the self-enforcing property N7 correctly identified) — but "inert intermediate" can no longer
   be relied on as a safety property, and a suite run taken between A and B must not be read as a
   regression.
2. **The registry-only red set is 5 tests, not 2.** M2 §N7 names only the two parse tests. A
   Developer who edits `readiness-gates.md` first — the natural reading order of the §Schema
   changes section, which lists the registry edits before the template edits — also reds S1b,
   S3a and S3b. S3a/S3b's messages name `CR.md`; the fix is the `story.md` `dod-declared` bump.
   This is the same misread the M2 plan already warns about for the forgotten-bump case; it also
   applies to the ordering case. FLASHCARD 2026-08-27 `#test-harness #tpv` ("a wrong red set
   reads as 'I broke an unrelated file'") applies directly.
3. **Post-merge cross-branch hazard, and this one blocks commits.** Scenario 7 is cli test code
   reading the **outer** repo's working tree. Once STORY-054-06's cli commit reaches cli `main`,
   the cli suite is green only when the outer checkout sits on a branch carrying
   `## Task Breakdown` in `cleargate-planning/.cleargate/templates/story.md`. Outer `main` will
   not, until `sprint/S-39` merges. And `.cleargate/config.yml:26` sets
   `precommit: "npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test"`, so
   **every outer-repo commit made from such a branch is blocked by its own pre-commit hook**,
   failing on exactly one test: Scenario 7. This is a new instance of FLASHCARD 2026-08-27
   `#test-harness #cross-repo #danger` (STORY-054-04's `config.yml` case) — now on a *template*
   instead of a config file, and escalated from "red run" to "blocked commit".

**Ruling: two commits, cli first, outer second — but in ONE turn, with a single suite run after
both halves are in the working tree.** Same conclusion STORY-054-02 reached, for a different
reason: 054-02 had no inert intermediate; 054-06 *had* one and QA-Red's file consumed it. This is
the R19 shape (FLASHCARD 2026-08-27 `#cross-repo #test-harness`: *"a two-repo story has a merge
ORDER only if one intermediate is inert"*). → **RULINGS 6 and 7.**

**N6 timing, unchanged but now sharper.** Between Commit B and
`npm --prefix cleargate-cli run build`, the stale `dist/cli.js` makes every PostToolUse edit to a
**story / CR / Bug** delivery file emit `⚠️ gate failed: <ID> — predicate error: unsupported
predicate shape: task-breakdown-complete`. **Epic** edits are unaffected — the epic gate block
gains no criterion — so the concurrent session's EPIC-058 work is not disturbed by this window.
Rebuild in the same turn regardless.

---

## Secondary findings (verified in passing, all read-only)

- **N4 placement independently re-measured.** Inserting the block before the N4 anchor in all
  three templates yields exactly the plan's table: `story.md` → Task Breakdown at **4**, Quality
  Gates at **5**; `CR.md` → Task Breakdown at **7**; `Bug.md` → Task Breakdown at **5**.
  Confirmed against `templateBodyOf`-stripped bodies, both trees, parity-clean.
- **The fixture needs zero edits — confirmed.** Pinning test is **14/14** in the FULL state with
  `expected-headings.ts` untouched. `S1a`'s `18`/`16` (`:432`/`:434`) and `S6`'s `16` (`:645`)
  and `KNOWN_UNPINNABLE.size === 2` are all unchanged (a named predicate is never enumerated by
  `enumerateSectionCriteria`). `gate-unit` block census (`11`) unchanged: 25/25. M2 §Reuse is
  correct; Cross-Cutting Rule 4's "AND update the fixture" clause does not apply here.
- **Registry line numbers in the M2 plan have drifted.** `dod-declared` at `:148-149` is
  **correct**. The block-boundary numbers are not: the `story` block's closing fence is `:164`
  (plan says the block "ends at :165"), `- work_item_type: bug` is at **`:190`** (plan says
  "bug.ready-for-fix begins at :192"), and `cr`'s last criterion sits at `:185-186`. → **RULING 8.**
- **`§3.1 AMENDMENT` is committed** in `HEAD` (`2ed99cf8`), so `file_surface_diff.sh:150-157`
  will resolve the three cli paths. The pre-dispatch orchestrator action the M2 plan required was
  performed.
- **Scenario 6's assertion is coupled to the plan's verbatim detail string.**
  `/no .* task rows/` requires at least one character between `no ` and ` task rows`; the plan's
  `` '## Task Breakdown is present but carries no `- [ ]` task rows' `` satisfies it, but a
  reworded `"carries no task rows"` would **not** match. Use §Schema changes (4) verbatim.
  Same for Scenario 1's `/1 task row/` against `` `## Task Breakdown has ${rows} task row…` ``.
- **The transient QA-Red reported is gone.** `test/scaffold/skill-md-conditional-architect.red.node.test.ts`
  re-run here: **18/18, 0 fail.** Consistent with QA-Red's account (the concurrent session's
  `npm run prebuild` at 11:16 re-synced the gitignored payload mid-run).

---

## RULINGS — binding on the Developer

1. **Add one `it()` pinning checkbox-vs-`listed-item`.** A body whose `## Task Breakdown` section
   contains `- a plain bullet` and **no** `- [ ]`/`- [x]` row must return `pass: false` with
   `detail` matching `/no .* task rows/`. Measured: without it, an implementation counting
   `/^\s*- /gm` — the `listed-item` shape M2 §N2 forbids on BUG-054 grounds — passes all eight
   existing cases. Red-phase-valid: it throws `unsupported predicate shape` today like the other
   six.
2. **Add one `it()` pinning numeric-prefix tolerance.** A body whose heading is
   `## 3.5 Task Breakdown` with one `- [ ]` row must return `pass: true` with `/1 task row/`.
   Measured: without it, a literal `firstLine.trim() === '## Task Breakdown'` compare passes all
   eight cases while contradicting registry edit 3's vocabulary prose, the
   `evalTaskBreakdownComplete` docstring, and M2 §Gotchas.
3. **Locate the section with `headingTitleOf` + `body.split(/^(?=## )/m)` and scope the row count
   to the located section**, exactly as M2 §Schema changes (4) writes it. Do not count over
   `doc.body`. Measured: an unscoped counter is caught by Scenario 7 **alone** (canonical
   `story.md`'s §4 DoD checkboxes flip it to `pass:true`); one witness for a four-line function is
   thin, and ruling 2's fixture doubles it.
4. **Retitle Scenario 3b's second `it()` at promotion** to name the synthetic body, e.g.
   *"…on a SYNTHETIC 4-section legacy body — not the registry and not a corpus item; the real
   witness for the section(4)→section(5) bump is gate-section-index-pinning S1b"*. Assertion
   unchanged. Same class as the four stale sites M2 already requires de-staling in
   `readiness-predicates-prior-work-ambiguity.node.test.ts`.
5. **Correct Scenario 5's comment at promotion.** It pins a hardcoded path constant, not
   `readiness-gates.md:36`'s citation (that is the pinning test's S7). State what it is: the only
   external witness that survives deletion of `gate-section-index-pinning.node.test.ts`. **Do not**
   make it read the registry — that would add a cross-branch dependency the current form does not
   have.
6. **One turn, two commits.** Make every edit — cli source, cli tests, six templates, two
   registries — in the working tree first. Run `npm --prefix cleargate-cli run typecheck` and the
   full suite **once**, with everything present; those are the numbers that go in the report. Then
   Commit A (cli), then the `update_state.mjs … Bouncing` touch, then Commit B (outer), then
   `npm --prefix cleargate-cli run build`. **Do not run the suite between A and B.**
7. **If a partial state is run anyway, read it against the T5 table.** Commit A alone → 1 red
   (Scenario 7), not a defect. Registry-without-templates → 5 reds including pinning S1b/S3a/S3b;
   S3a/S3b name `CR.md` and the fix is the `story.md` `dod-declared` bump, not `CR.md`.
8. **Anchor the three registry appends on the `- id: ambiguity-gate-resolved` entry inside each
   of the `story`, `cr` and `bug` blocks — not on line numbers.** The M2 plan's block-boundary
   numbers are stale by 1–2 lines (see Secondary findings). `dod-declared` at `:148-149` is
   correct as written.
9. **Ship the guidance block with `> ` on every line, verbatim from M2 §Schema changes (1).** Do
   **not** convert the inline `` `- [ ] <action>` `` illustration into a fenced code block and do
   not indent it — measured, both count as rows and both red Scenario 7. Note also that a plain
   `- ` bullet with no checkbox does **not** vacate this criterion; keep the zero-bullet rule for
   the other criteria, but understand the teeth are checkbox-shaped.
10. **DevOps / QA-Verify:** once the cli commit reaches cli `main`, any outer commit from a branch
    lacking `## Task Breakdown` in canonical `story.md` is blocked by `.cleargate/config.yml:26`'s
    pre-commit, failing on Scenario 7 alone. Merge `sprint/S-39` to outer `main` promptly, or
    expect blocked commits there. Do not "fix" that red by editing Scenario 7.

## Not rulings — explicitly left to the Developer

Test-logic correctness beyond the five dispatch questions. Whether `detail` strings read well.
Whether the vocabulary entry's example is the best example. The `## Task Breakdown` heading title
(settled by N3, not re-opened).

## Flashcards proposed (not written — this dispatch's write allowlist is the report + the M2 append)

1. `#test-harness #tpv #danger` — A red baseline where every case dies at one `unsupported
   predicate shape` throw is honest but blind: implement it out-of-tree and run a MUTANT battery.
   054-06's 6 reds flipped green correctly yet two mutants — `listed-item` instead of checkbox
   rows, and a literal heading compare instead of `headingTitleOf` — passed all 8 assertions.
   Both were properties the plan wrote NORMATIVE rulings about.
2. `#test-harness #cross-repo #danger` — QA-Red adding a canonical-template read to a cli test
   CONSUMES the inert intermediate a two-repo commit order depended on. M2 §N7 measured "cli code
   first = inert, suite green" before the red file existed; after it, Commit A alone reds the
   non-vacuity pin. Re-measure inertness AFTER the red baseline lands, never before.
3. `#gate #readiness-gates` — A `- [ ]` row counter (`/^\s*- \[[ xX]\]/gm`) is indentation- and
   fence-BLIND: an indented or fenced worked example in a template's guidance block counts as a
   real row and vacates the criterion. "Zero line-initial `- `" under-specifies it in one
   direction (indent/fence) and over-specifies it in another (a plain `- ` bullet is harmless).

## Script Incidents

None. No `.cleargate/scripts/**` invocation was required; every command was a sanctioned
Test-Stack `npm --prefix … exec -- tsx` run, plain `git`/`diff`/`grep`, or a scratch-directory
`python3`. `run_script.sh` does not apply.

## Tree discipline

Both repos left exactly as found. Outer: the pre-existing modified set (7 delivery drafts, 4
sprint-run artifacts, 4 wiki files, `cleargate-planning/MANIFEST.json`) plus 4 untracked —
**`MANIFEST.json` was not read into any decision, not reverted, and not staged**; its 4-line diff
(`generated_at` + 3 SHAs) is the concurrent session's `npm run prebuild` and remains untouched.
`cleargate-cli`: clean at `c9d44ba`, only the pre-existing untracked `cleargate-0.23.1.tgz`.
Nothing committed. All mutation work was confined to
`/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/49c00a07-a425-4af9-9ac6-97ed8ed5ee64/scratchpad/tpv06`.

---

```
TPV: rulings-required
T1_REDS_HONEST: yes — but incomplete. All 6 die at parsePredicate:134 from 6 DISTINCT call-site frames (:100/:116/:153/:175/:212/:227), no guard short-circuits, and implementing M2 §Schema(4) verbatim out-of-tree flips them 8/8 green (P2, reproduced). An 8-mutant battery killed 6: M1 always-absent (S1,S6,S7), M2 absence-fails (S2,S3a), M4 no-teeth (S6,S7), M5 interprets-ref (S4), M7 whole-body-locator (S7 only). TWO SURVIVE all 8 assertions, both reproduced: M3 = count `listed-item` /^\s*- /gm instead of `- [ ]` rows (the exact implementation N2 forbids on BUG-054 grounds), and M8/M6 = literal heading compare with no headingTitleOf (contradicts the "numeric prefixes tolerated" promise in vocabulary entry 10 + the docstring). Rulings 1-3 close both.
T2_SCENARIO_5: legitimate pin — KEEP, do not strengthen, fix the comment (Ruling 5). It duplicates the pinning test's own S7, but S7 lives INSIDE the file it asserts about, so it dies with that file; Scenario 5 is the only external witness. Catches: deletion/rename/relocation of gate-section-index-pinning.node.test.ts — simultaneously the sole automated witness for THIS story's section(4)->section(5) bump, the path readiness-gates.md:36 cites contractually, and the file M2 §Reuse forbids re-implementing. Does NOT catch the citation itself changing (S7's job) — the comment at :188-189 wrongly implies it does. Reads CLI_ROOT only, so zero cross-repo coupling; making it read the registry would import cross-branch fragility for nothing.
T3_SCENARIO_3B: still true post-bump — it pins the POST-bump index, not the old world. Measured on its own legacyBody: section(4) PASS (today's dod-declared), section(5) FAIL (post-bump dod-declared). 3b asserts section(5), i.e. the world this story creates; green in FULL. BUT it is synthetic — it never reads readiness-gates.md or any corpus item and hardcodes its check string, so it stays green if the bump is forgotten and provides zero protection against it. Its "the accepted N5 residue" title claims a registry/corpus meaning it does not carry — the exact impersonates-a-witness shape M2 requires be de-staled in readiness-predicates-prior-work-ambiguity.node.test.ts:274/:356. Retitle at promotion (Ruling 4); assertion unchanged.
T4_NON_VACUITY: (a) reads the real file — YES: CANONICAL_STORY_MD resolves to the tracked cleargate-planning copy, templateBodyOf is byte-identical (code lines) to the pinning test's :212-227 per diff, and the P0 failure frame is at :227, i.e. AFTER :226's real read+strip succeeded. No fixture anywhere in the file. (b) bites on a worked-example row — YES, measured 4 ways: line-initial `- [ ]` RED (reproduced), INDENTED `  - [ ]` RED, FENCED `- [ ]` RED, `> - [ ]` blockquoted green, plain `- bullet` green. Its bite is BROADER than M2's "zero line-initial `- `" invariant (indent/fence also count) and narrower in one place (a checkbox-free bullet is harmless) — Ruling 9. (c) survives the section being added — YES: P2 = 8 pass / 0 fail, reproduced; the Developer never edits QA-Red's file. It is also the SOLE killer of the whole-body-locator mutant, making it the highest-value test in the file.
T5_SEQUENCE: ONE TURN, two commits, cli first — measured, all states in a scratch mirror (real-tree baseline verified clean twice: gate-unit 25/25, readiness-predicates 119/119, pinning 14/14). P0 today = 6 reds (new file). COMMIT A ALONE = 1 red — Scenario 7 (7 pass/1 fail, reproduced): M2 §N7's "cli code first is INERT" was measured before QA-Red's file existed and is NO LONGER TRUE. REGISTRY-ONLY (no templates, no cli code) = 5 reds, not the 2 §N7 names: gate-unit "all criterion check strings ... parse", readiness-predicates "every criterion.check parses", PLUS pinning S1b + S3a + S3b — and S3a/S3b's messages name CR.md while the fix is the story.md dod-declared bump. COMMIT B ALONE (registry+templates, no cli code) = 2 parse-test reds + the 6 baseline reds; pinning back to 14/14. FULL = 0. Ordered steps: (1) all edits in the working tree — cli src + cli tests + 6 templates + 2 registries; (2) typecheck + full suite ONCE, both halves present — these are the report numbers; (3) Commit A (cli); (4) CLEARGATE_STATE_FILE=... update_state.mjs STORY-054-06 Bouncing; (5) Commit B (outer, surface-gated, passes because A landed); (6) npm --prefix cleargate-cli run build (N6). Do NOT run the suite between (3) and (5). Post-merge hazard for DevOps: Scenario 7 is cli code reading the OUTER tree, and .cleargate/config.yml:26 runs the cli suite in the outer pre-commit — so once the cli commit reaches cli main, every outer commit from a branch lacking the section (outer main, until sprint/S-39 merges) is BLOCKED, failing on Scenario 7 alone.
REPRODUCED: (1) real-tree targeted baseline of the red file — 8/2/6/0 with 6 throw occurrences, run twice, matching QA-Red's independent run; (2) scratch P0 8/2/6/0 and P2 8/8/0, each run twice; (3) gate-unit 25/25, readiness-predicates 119/119, gate-section-index-pinning 14/14 on the real tree, run twice; (4) mutant M3_listed_item 0-fail and the `correct` control 0-fail, run twice; (5) P3a worked-example row -> S7 red, run twice; (6) the transient QA-Red flagged — skill-md-conditional-architect.red.node.test.ts re-run here: 18/18, 0 fail, i.e. resolved. Every conclusion in this report rests on a re-run result; nothing single-run is load-bearing.
RULINGS: 1. Add an it() pinning checkbox-vs-listed-item (plain `- bullet`, no checkbox -> pass:false, /no .* task rows/) — mutant M3 survives all 8 cases without it. 2. Add an it() pinning numeric-prefix tolerance (`## 3.5 Task Breakdown` + one row -> pass:true, /1 task row/) — mutant M8/M6 survive without it. 3. Locate via headingTitleOf + body.split(/^(?=## )/m) and count rows WITHIN the located section, per M2 §Schema(4) verbatim; never over doc.body. 4. Retitle Scenario 3b's second it() to name the SYNTHETIC body and point at pinning S1b as the real bump witness; assertion unchanged. 5. Correct Scenario 5's comment — it pins a hardcoded constant, not readiness-gates.md:36's citation; do NOT make it read the registry. 6. One turn: all edits in the working tree, ONE typecheck+suite run, then Commit A (cli), state touch, Commit B (outer), then npm --prefix cleargate-cli run build. 7. Read any partial-state red against the T5 table; registry-without-templates reds 5 tests and S3a/S3b's CR.md message means the story.md bump, not CR.md. 8. Anchor the three registry appends on each block's `- id: ambiguity-gate-resolved` entry, not on line numbers (plan's block boundaries are stale by 1-2; :148-149 for dod-declared is correct). 9. Guidance block verbatim, `> ` on every line — never fence or indent the `- [ ] <action>` illustration; a checkbox-free `- ` bullet is harmless to this criterion but keep the zero-bullet rule. 10. DevOps/QA: after the cli merge, outer commits from any branch lacking the section are blocked by the outer pre-commit on Scenario 7 — merge sprint/S-39 to outer main promptly; never "fix" that red by editing Scenario 7.
REPO_CLEAN: yes, both. Outer = the pre-existing 15 modified + 4 untracked, unchanged; cleargate-cli = clean at c9d44ba plus the pre-existing untracked cleargate-0.23.1.tgz. I did NOT revert, stage, edit or rely on cleargate-planning/MANIFEST.json — its 4-line diff (generated_at + 3 SHAs) is the concurrent session's prebuild and is exactly as I found it. Nothing committed. All mutation work was confined to the out-of-tree scratch mirror.
```
