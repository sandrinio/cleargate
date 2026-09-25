# CR-123 QA-Red — Round 1

role: qa

## Mode

RED — write failing tests against CR-123 §4 Verification Protocol (scenario list authoritative).
Read: CR-123 body, `sprint-runs/SPRINT-41/plans/M1.md` §CR-123, `src/lib/readiness-predicates.ts`
(existing public API shape only), the three unedited canonical templates (`story.md`, `CR.md`,
`Bug.md`, `epic.md`) and `.cleargate/knowledge/readiness-gates.md` (both read-only, via
`CLEARGATE_META_ROOT`), and the CR-111 precedent test files for idiom. No implementation file was
edited. No template, gates-doc, agent or skill file was edited — those are the Developer's outer
half.

## What was written

- **New:** `cleargate-cli/test/lib/readiness-predicates-spidr-coverage.red.node.test.ts` — 32
  scenarios across 8 describe blocks (S1–S8), mapped to CR-123 §4 items 1–7 (item 8 is a DevOps
  post-BD1 sweep, not testable pre-registration; items 9–11 are grep/regression-count/diff checks
  named in the M1 plan as not needing new code).
- **Moved (QA-Red-authorized, exactly two assertions, nothing else touched):**
  `cleargate-cli/test/docs/test-layers-declared-doctrine.red.node.test.ts:328`
  (`exactly **11 predicate shapes**` → `**12 predicate shapes**`) and `:358`
  (`Supports exactly 12 closed-set predicate shapes.` → `13`). Confirmed via `git diff` that only
  these two lines changed in that file.

## Scenario map (CR-123 §4 → describe block)

| §4 item | Describe | Notes |
|---|---|---|
| 1 (blank templates fail) | S1 | Reads canonical story/CR/Bug.md live via `templateBodyOf` + `CLEARGATE_META_ROOT` → `CANON` — will re-exercise the Developer's future template edits at run time, same idiom as CR-111's T8. |
| 2 (grandfathered + self-fire) | S2 | Absent lead-in, lead-in quoted inline (CR-123 body:47 shape), and lead-in indented inside a fenced example with a blank `{T or F}` table (CR-123 body:81 shape — the exact self-fire hazard in FLASHCARD 2026-08-30 `#gate #readiness-gates #danger`). All three must pass `not-applicable:`. |
| 3 (T needs tag / F forbids one) | S3 | Table-driven over the 4 axes × 2 = 8 cases, plus one "complete valid mixed body passes" case. |
| 3 (missing row / cell shape) | S6 | Missing-axis-row, unfilled `{T or F}` placeholder (BUG-054), and an out-of-vocabulary Cover value (`"Yes"`). |
| 4 (reason required) | S4 | F+empty-reason fails; T+empty-reason passes. |
| 5 (fence-scoped tags) | S5 | Tag in prose outside the fence doesn't count; same tag directly above `Scenario:` inside the fence does. |
| 6 (type-agnostic) | S8 | `spidr-coverage` registered identically (same id + check string) in story/cr/bug gate blocks, absent from epic; vocabulary gains a numbered `**12. \`spidr-coverage\`**` entry; `evaluate()` result independent of `doc.fm.work_item_type`. |
| 7 (epic tightening) | S7 | Registry check-string assertion reads the LIVE `gherkin-error-path` check dynamically (not hardcoded) so it stays red until the Developer tightens the doc; the "prose Error" behavioural assertion also reads that live check, so it too is red at baseline (today's `'Error'` substring wrongly passes prose) and flips green once tightened. The `Scenario: Error — x` and unedited-`epic.md` assertions use the literal target string directly — they are stable acceptance locks, true both before and after the doc edit, matching CR-111's T5 grandfathering-guard pattern. |
| 8 | — | DevOps post-BD1 `gate check` sweep (CR-123 §2: "CLI and gate-doc must ship together" — registering `spidr-coverage` in the live doc before BD1 poisons `cached_gate_result` on every gate check). Not a QA-Red test. |
| 9 | — | "Evicted pointer is gone" grep — `test/**` carries no `§4 acceptance` phrasing today (confirmed, matches M1 plan). No code to write. |
| 10 | — | `gate-section-index-pinning.node.test.ts` pass-count regression guard — satisfied by NOT touching that file (CR-123 adds no `## ` heading). |
| 11 | — | `diff -q` mirror parity — DevOps/QA-Verify hand check. |

## Baseline run

Command (wrapped, targeted, `CLEARGATE_META_ROOT` pointed at this worktree per the M1 plan's
cross-repo idiom):

```
bash .cleargate/scripts/run_script.sh bash -c "cd cleargate-cli && \
  CLEARGATE_META_ROOT=<repo>/.worktrees/CR-123 npm run test:file -- \
  test/lib/readiness-predicates-spidr-coverage.red.node.test.ts \
  test/docs/test-layers-declared-doctrine.red.node.test.ts \
  test/lib/readiness-predicates-test-layers-declared.red.node.test.ts"
```

`npm run typecheck` (cleargate-cli): clean, no errors.

Aggregate: **tests 60 · suites 17 · pass 29 · fail 31 · skipped 0**, split by file:

| File | Tests | Fail | Reason class |
|---|---|---|---|
| `readiness-predicates-spidr-coverage.red.node.test.ts` (new) | 32 | 29 | 23 throw `unsupported predicate shape: spidr-coverage` (S1, S2, S3, S4, S5, S6 in full, plus S8's fm-branching case — the predicate does not exist yet); 6 are doc-content mismatches against the current, unedited `readiness-gates.md` (S7's registry-string check + its prose-Error live-check assertion, S8's 3 per-type registration checks, S8's vocabulary-entry check). |
| `test-layers-declared-doctrine.red.node.test.ts` (2 lines moved) | 11 | 2 | Exactly the two moved assertions (`readiness-gates.md`'s vocabulary count still reads 11; `readiness-predicates.ts:3`'s docstring still reads 12). All other 9 assertions (T4 registrations ×3, T4 YAML-validity, T7 ×2, T10, T11 vocabulary-entry-11 unchanged) still pass — CR-111's shipped feature is untouched. |
| `readiness-predicates-test-layers-declared.red.node.test.ts` (unmodified) | 17 | 0 | Regression check only — confirms CR-123 introduces no regression against the already-shipped `test-layers-declared` predicate. |

Of the 32 new-file scenarios, 3 pass today: S7's `Scenario: Error — x` and unedited-`epic.md`
acceptance locks (stable both before and after the Developer's doc edit, matching CR-111's T5
grandfathering-guard pattern), plus S8's "NOT registered in epic" vacuous-true guard (currently
true because nothing is registered anywhere yet; stays true once the Developer registers
`spidr-coverage` on story/cr/bug only).

Every failure is for one of two legitimate "not yet implemented" reasons: (a) `spidr-coverage` is
absent from `ParsedPredicate`/`parsePredicate`/`evaluate()`, or (b) the outer canonical
`readiness-gates.md` has not yet been edited to register/tighten the relevant check strings. No
fixture-guard reds, no throws from a wrong root (`CLEARGATE_META_ROOT` resolved correctly — the
canonical template reads succeeded and returned real template bodies, visible in the S1 assertion
failure details).

## Wiring-soundness notes (for TPV)

- Imports resolve: `evaluate`/`ParsedDoc` imported from `../../src/lib/readiness-predicates.js`
  (existing export surface, unchanged).
- `templateBodyOf` copied byte-for-byte from
  `readiness-predicates-test-layers-declared.red.node.test.ts` (frontmatter-fence locator,
  reflects BUG-067's fix — not offset-0-based).
- `CLI_ROOT` / `META_ROOT` / `CANON` constants re-verified and re-rooted for THIS repo and branch
  (FLASHCARD 2026-09-25 `#test-harness #cross-repo`) — grepped the assignment, not copied the
  prose (FLASHCARD 2026-08-30 `#test-harness #cross-repo #danger`); confirmed live by running with
  `CLEARGATE_META_ROOT` pointed at `.worktrees/CR-123` and observing the canonical-template
  assertions read real (non-empty) template bodies.
- File naming: `*.red.node.test.ts`, per `sprint_context.md` §Test Stack (this is a unit-layer
  predicate test, not an integration-layer one — no `.integration.` infix required).
- No implementation file, template, gates-doc, agent or skill file was edited by QA-Red. `git
  status --short` in both the cli repo and the outer worktree confirms the file surface: two cli
  files touched (one new, one two-line edit), outer worktree untouched.

## Script Incidents

None. Both the typecheck and targeted-test invocations exited 0 through the wrapper's
self-exemption path (`bash -c "..."` running under `run_script.sh`); no incident JSON was written
for this session's commands. (An unrelated pre-existing untracked incident file from a prior
session, `.cleargate/sprint-runs/_off-sprint/.script-incidents/20260925T045738Z-c1ed9ebe1872.json`,
was already present in the cli repo before this dispatch started and is not from this run.)

## Flashcards

None new — the self-fire trigger hazard (S2) and the cross-repo root idiom (path derivation) are
both already recorded in `.cleargate/FLASHCARD.md` (2026-08-30 `#gate #readiness-gates #danger`;
2026-09-25 `#test-harness #cross-repo`) and were applied, not rediscovered.

flashcards_flagged: []
