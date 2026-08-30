# STORY-054-05 — QA-Red

role: qa

## Execution route

Worked in `cleargate-cli/` (own git repo, gitignored in the outer meta-repo — no worktree, per BUG-046 / M0 plan R7). Branch `story/STORY-054-05`, cut from `main` at `e39297a`. Reads targeted `../` (the meta-repo) for the canonical tree (`cleargate-planning/.cleargate/**`) and live tree (`.cleargate/**`), per M0 plan §Test shape.

## Deliverable

`cleargate-cli/test/docs/gate-section-index-pinning.red.node.test.ts` — committed at `7778722` on `story/STORY-054-05`.

`git diff --stat` on `cleargate-cli/src/**`: empty (confirmed via `git status --short` before commit — only the new test file staged; the pre-existing untracked `cleargate-0.23.1.tgz` is unrelated, noted in M0 plan R7 as already present before this story started).

## Red-phase design

BUG-042 (the three `section(N)` corrections) is already merged to `sprint/S-39`, so a test that only pins the live/canonical tree is green the instant it's authored and proves nothing about failure. Per M0 plan §STORY-054-05 "Red-phase contract", the red-ness is relocated into the mutation scenarios (S2, S3, S5), which drive the checker against synthetic mutated copies and assert a specific named failure.

**Design choice — in-memory mutation, not tmpdir.** The checker (`checkPinning()`) takes registry **text** and a template-body **reader callback**, not filesystem paths. S2/S3's "synthetic mutated copies" are built as in-memory strings (`mutateCriterionIndex`, `insertHeadingAfter`) and passed directly — behaviorally identical to a tmpdir copy for every code path that matters (`loadGateBlocksFromText`/`resolveHeadingLine` don't care whether their input came from disk or memory), with no fs churn/cleanup. The non-mutation path (`canonicalTemplateReader`) always reads the real canonical tree from disk, so nothing about the "real" scenarios is faked.

**Design choice — dynamic fixture import, not static.** `expected-headings.ts` does not exist yet (Developer's deliverable, explicitly not created here per M0 plan §Rejected approaches — "Derive the expected headings from the templates" is rejected; it must be hand-authored). A static top-level `import` of a nonexistent module would crash the whole file at load time, collapsing all 13 scenarios into one undifferentiated "module not found" report. Instead a `before()` hook attempts a guarded dynamic `import()`; each fixture-dependent scenario calls `requireFixture()` first, which explicitly fails with a diagnostic naming the missing path and the expected fixture shape. This keeps every scenario's red/green status individually legible — matching the precedent convention in `test/lib/readiness-predicates-heading-anchor.red.node.test.ts` ("S4 and S5 already pass") — and means promotion (rename to `gate-section-index-pinning.node.test.ts`) needs **no further edits to this file**; the Developer's only required deliverable is the fixture at the exact path `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts`, exporting `EXPECTED_HEADINGS: Record<string, string>` keyed `"<work_item_type>.<criterion-id>"` → full heading line.

## Scenario table (S1–S7)

| # | Shape | What it drives | Fixture-dependent? | Baseline (observed) |
|---|---|---|---|---|
| S1a | positive | enumerate `section(N)` criteria from the live registry; assert 14 total, 12 pinnable | no | ✅ pass |
| S1b | positive | resolve all 12 pinnable criteria against canonical templates, compare to fixture | **yes** | ❌ fail (fixture missing) |
| S1c | positive | live↔canonical byte parity, registry + six templates | no | ✅ pass |
| S2a | mutation | revert `cr.sandbox-paths-declared` to `section(3)`; message names criterion + expected + resolved heading | yes | ❌ fail (fixture missing) |
| S2b | mutation | revert `cr.blast-radius-populated` to `section(2)` | yes | ❌ fail (fixture missing) |
| S2c | mutation | revert `epic.affected-files-declared` to `section(5)` | yes | ❌ fail (fixture missing) |
| S3 | mutation | insert `## 9. Task Breakdown` into CR.md after Blast Radius; assert full finding set (not first-only) | yes | ❌ fail (fixture missing) |
| S4 | positive | source pin — the 3 load-bearing lines in `readiness-predicates.ts` are still present | no | ✅ pass |
| S5a | mutation | fixture row deleted → "no expected heading declared" naming the criterion | yes | ❌ fail (fixture missing) |
| S5b | mutation | orphan fixture row → "orphan fixture row" naming the key | yes | ❌ fail (fixture missing) |
| S6 | positive | `KNOWN_UNPINNABLE` = exactly the 2 proposal criteria, size 2; 14 = 12+2 | no | ✅ pass |
| S7 | positive (R11) | every `cleargate-cli/test/**/*.node.test.ts` path cited in Predicate Vocabulary prose exists on disk | no — but fails for a **different** reason: the cited path is the promoted filename, which doesn't exist while this file is still named `*.red.node.test.ts` | ❌ fail (file not yet promoted) |
| — | always-on | `cleargate-planning/.cleargate` exists whenever `cleargate-planning/` exists (R8) | no | ✅ pass |

## 3-positive / 3-mutation ratio accounting

Per M0 plan §Red-phase contract: "of the 6 scenarios [S1–S6], 3 are positive (live tree) and 3 are mutation. A submission whose only assertions read the live tree is a QA kick-back, regardless of green."

- **Positive (S1, S4, S6):** live/canonical-tree reads, no synthetic mutation. All three groups contain at least one currently-passing sub-case (S1a, S1c, S4, S6 all pass today — expected, since the tree is already correct post-BUG-042), and S1's core claim (S1b, "resolves to its **named** heading") is fixture-dependent and correctly fails today, because "named" requires the fixture to say what the name is.
- **Mutation (S2, S3, S5):** all fail today, all fixture-dependent, all reference `EXPECTED_HEADINGS` before asserting on the mutated result. This is where the real, permanent Red signal lives — these scenarios drive synthetic mutated content through the checker and will keep failing on any future regression regardless of what the live tree looks like at the time.
- Not part of the ratio, added at post-flight (R11): **S7**, itself positive-shaped but red today for a filename reason, not a fixture reason.

This submission does **not** consist solely of live-tree assertions — S2/S3/S5 are the mutation half and are the majority of today's failures (7 of 8).

## Observed red run (verbatim)

Command: `npx tsx --test --test-concurrency=1 --experimental-test-module-mocks --test-reporter=spec test/docs/gate-section-index-pinning.red.node.test.ts` (run from `cleargate-cli/`; this is exactly what `npm --prefix cleargate-cli test` → `scripts/run-default-tests.mjs` invokes, scoped to this one file for a clean signal). `npm --prefix cleargate-cli run typecheck` was run first and is clean (no output, exit 0).

```
▶ R8 sanity: CANON exists whenever cleargate-planning/ exists
  ✔ cleargate-planning/.cleargate exists when cleargate-planning/ exists (0.640375ms)
✔ R8 sanity: CANON exists whenever cleargate-planning/ exists (1.467959ms)
▶ STORY-054-05: gate section-index pinning
  ✔ S1a: exactly 14 section(N) criteria are enumerated (12 pinnable + 2 known-unpinnable) (4.331292ms)
  ✖ S1b: every pinnable criterion resolves to its fixture-pinned heading against the canonical templates (1.843042ms)
  ✔ S1c: live and canonical readiness-gates.md + six templates are byte-identical (1.661708ms)
  ✖ S2a: reverting cr.sandbox-paths-declared to section(3) is caught (0.257584ms)
  ✖ S2b: reverting cr.blast-radius-populated to section(2) is caught (0.161709ms)
  ✖ S2c: reverting epic.affected-files-declared to section(5) is caught (0.130917ms)
  ✖ S3: inserting "## 9. Task Breakdown" into CR.md shifts sandbox-paths-declared and the checker names it (0.140625ms)
  ✔ S4: readiness-predicates.ts still contains the three load-bearing lines this checker replicates (0.316708ms)
  ✖ S5a: a criterion missing a fixture row fails loudly, naming it (0.139167ms)
  ✖ S5b: an orphan fixture row (no matching criterion) fails loudly, naming it (0.098125ms)
  ✔ S6: KNOWN_UNPINNABLE names exactly the two proposal criteria (size 2); 14 = 12 pinned + 2 (0.709875ms)
  ✖ S7: every cleargate-cli/test/**/*.node.test.ts path cited in the Predicate Vocabulary prose exists on disk (0.296ms)
✖ STORY-054-05: gate section-index pinning (10.616667ms)
ℹ tests 13
ℹ suites 2
ℹ pass 5
ℹ fail 8
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 222.834917
```

Every failure's stack traces to one of two, and only two, root causes — confirming the design is behaving as intended, not failing on an unrelated defect:

1. `S1b, S2a, S2b, S2c, S3, S5a, S5b` — all fail inside `requireFixture()` with the message `expected-headings.ts not found at .../test/fixtures/gate-section-index/expected-headings.ts — RED phase: the Developer has not authored the fixture yet. Expected shape: ... "EXPECTED_HEADINGS: Record<string, string>" keyed "<work_item_type>.<criterion-id>" -> the full heading line, e.g. "cr.sandbox-paths-declared": "## 3. Execution Sandbox".`
2. `S7` — fails with `Predicate Vocabulary cites "cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts" — not found on disk at /Users/ssuladze/.../test/docs/gate-section-index-pinning.node.test.ts` (the file exists today only under its Red name).

## Baseline fail count

**STATUS=red-captured**
**BASELINE_FAIL: 8** (of 13 test() cases; 5 pass — see table above and verbatim run output)

## Gaps / things not encoded

None found that require stopping. Two things worth flagging plainly rather than silently working around:

- **S3 exercises only a single-criterion shift.** The M0 plan's own worked example ("here: sandbox-paths-declared") is single-criterion too, so the "names every criterion whose resolved heading changed, not just the first" claim is asserted structurally (`findings.length === 1`, i.e. the checker returns the *complete* array rather than short-circuiting) rather than empirically demonstrated with a 2+-criterion shift. A genuine 2-criterion CR.md shift would require inserting a heading *before* `## 2. Blast Radius & Invalidation` (so both `blast-radius-populated` and `sandbox-paths-declared` move), which contradicts the plan's explicit insertion point ("immediately after `## 2. Blast Radius & Invalidation`"). Not changed — the plan's insertion point is followed verbatim; noting the structural-vs-empirical distinction for the Developer/Architect.
- **S6's "no template" sanity check is narrow.** It asserts `'proposal' in TEMPLATE_FOR` is false, which is correct today but only guards the one known unpinnable type; it does not (and per scope should not) attempt to detect a *future* new gated type with no template — that would require enumerating `WorkItemType` registrations from `work-item-type.ts`, which is out of this story's declared file surface (test-only, `cleargate-cli/src/**` zero-diff) and not requested by the Gherkin.

No `run_script.sh` invocation was required — only `npm --prefix cleargate-cli run typecheck` and a direct `npx tsx --test` invocation of the one file, both plain CLI commands, no wrapper-eligible script per the Script Invocation contract (wrapper governs `.cleargate/scripts/**` invocations, not ad hoc `npm`/`npx`).

## Flashcards flagged

None new. Existing `#gate #readiness-gates` / `#gate #test-harness` cards (grepped at preflight) already cover the counting trap (checked from `check: "section(` inside parsed YAML, never a loose text scan) and the un-pinnable-set requirement; nothing surprised during authoring that isn't already recorded.
