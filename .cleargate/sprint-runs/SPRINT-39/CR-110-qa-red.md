# CR-110 — QA-Red report

role: qa · Mode: QA-RED · SPRINT-39 · wave 12 · M4 · CR-110

## Scope

Cut from `sprint/S-39` @ `ac3e07f3` (CR-106 + CR-107 already merged). No production code, no
template edit, no `init_sprint.mjs` edit — tests only, per dispatch constraints. All 8 scenarios
(G1-G8) authored per the M4 plan's CR-110 section (`plans/M4.md:1727-1743`), plus a standalone
Rule-4-verification scenario (dispatch item 7). Everything lands in
`.cleargate/scripts/test/cr078_init.test.sh` (both trees, byte-identical) — the file the CR's own
§4 Verification Protocol names as the command.

## Baseline (measured, 3 stable runs, no `tail`/`head` piping per N10)

`bash .cleargate/scripts/test/cr078_init.test.sh` → **22 passed, 12 failed**, exit 1. Log captured
to `/tmp/cr110_run_{1,2,3}.log`, byte-identical across all three runs (no flakiness).

Pre-existing baseline (before this dispatch's additions): **11 passed, 1 failed** — the trailing
SAFETY assertion, which hardcodes `expected SPRINT-34` and therefore fails on **any** checkout
whose real `.active` reads `SPRINT-39` (or is absent, as it is inside this worktree — `.active` is
untracked). Reproduced identically on the **main checkout** (not just the worktree), so this is a
pre-existing sprint-number-drift bug, unrelated to CR-110, out of the declared file surface, and
not fixed here (mirrors the `test/commands/sync.node.test.ts` "not yours, do not chase it"
precedent).

New assertions added by this dispatch: **22** (11 pass, 11 fail), all traced to a `G<N>` label in
the pass/fail output for direct correlation with the CR's own mutant table.

## Per-scenario red/green table

| CR G# | Sub-check | Status | Mutant it kills | Notes |
|---|---|---|---|---|
| G1 | G1a (live tree) | **RED** | heading missing entirely | Runs the REAL committed `.cleargate/templates/sprint_context.md` through the real `init_sprint.mjs` render path (F2: copy is verbatim, zero script change needed once the template carries the heading) |
| G1 | G1b (canonical tree) | **RED** | heading added to live only, not the canonical mirror (Rule 1) | Independent of G1a — a live-only edit passes G1a, still fails G1b |
| G1 | G1c (parity) | GREEN (regression guard) | live/canonical diverge | `diff -q` on both templates — trivially equal today (both lack the section identically); stays green only if the Developer edits both trees byte-identically |
| G2 | G2a (exit 0) | GREEN (regression guard) | `process.exit(1)` on unpopulated | Already true today — nothing in the render path errors; pins the non-blocking contract against a future regression |
| G2 | G2b (advisory text) | **RED** | emitting nothing at all | Synthetic future-state template (see below) with the placeholder unresolved; asserts stderr names `Goal Acceptance Check` **and** `unresolved`. Today's stderr only carries the unrelated lane-assignment WARN — meaningful red, not vacuous |
| G3 | G3a (exit 0) | GREEN | — | Same non-blocking guard, token-populated case |
| G3 | G3b (no false advisory) | GREEN-AT-BASELINE | treating the token as a placeholder | No advisory logic exists yet to false-fire, so this is vacuously true today — pins the future non-regression (FLASHCARD 2026-08-28 `#test-harness #qa`: "a gap-closing red test can be green on today's baseline by design") |
| G3 | G3c (token survives verbatim) | GREEN | — | Confirms F2's "render is free" claim for the token-populated case too |
| G4 | G4a/G4b (heading order, both trees) | **RED** | inserting the section before `## Sprint Goal` | Checked directly against the REAL committed templates (not this harness's fixture) — ordering is a property of what ships, not of the test. Currently red for the same underlying reason as G1 (heading absent), will diverge from G1 the moment the heading exists but is misplaced |
| G4 | G4c/G4d (frontmatter intact, both trees) | GREEN | — | Unaffected by this CR; regression guard |
| G5 | G5a (names the section) | **RED** | — | `reporter.md` doesn't mention `Goal Acceptance Check` yet |
| G5 | G5b ("satisfied" language) | **RED** | — | No verdict-derivation language exists yet |
| G5 | G5c (rejected mutant absent) | GREEN-AT-BASELINE | `non-empty` tied to `met` (the rejected "section non-empty ⇒ met" shortcut) | **Corrected mid-authoring**: a bare `grep 'non-empty'` false-positived on `reporter.md:269`'s unrelated "§§1-7 must all be present with non-empty content" line. Re-scoped to co-occurrence of `non-empty` and `met` within ~80 chars — see Findings below |
| G5 | G5d (quotes GOAL_RELATION) | **RED** | — | F1's corrected justification requires this |
| G6 | G6a (GOAL_RELATION exists) | **RED** | — | Absent from SKILL.md entirely, confirmed by direct grep |
| G6 | G6b (both enum values named) | **RED** | — | Neither `advances` (as an enum value; the bare word already appears twice, unrelated — see Findings) nor `off critical path` exists yet |
| G6 | G6c (decoupled from sprint verdict) | **RED** | folding GOAL_RELATION into the sprint verdict enum | — |
| G7 | reporter.md has zero vocab-triplet duplication | GREEN-AT-BASELINE | duplicating `met \| partial \| missed` into reporter.md | Scoped to the **enum-style** sequence, not bare words — see Findings (correction to F1) |
| G8 | existing `cr078_init.test.sh` cases stay green | 11/12 pre-existing PASS unchanged | — | The 12th (SAFETY) is pre-existing and unrelated, see Baseline above; not reshaped |
| Rule 4 | `readiness-gates.md` carries no `sprint_context` gate block (both trees) | GREEN (regression guard) | a future story accidentally gates `sprint_context` | Direct, mechanical, testable from this worktree |
| Rule 4 | `TEMPLATE_FOR` (cli) has 7 entries, no `sprint_context` | **not encoded — see below** | — | Manually verified instead |

## Findings (corrections to the M4 plan / CR-110 body, measured not assumed)

1. **F1's "zero occurrences of `verdict`, `met`, `partial`, `missed`" in `reporter.md` is false by
   word-boundary grep.** `command grep -niE '\b(verdict|met|partial|missed)\b' reporter.md` returns
   3 hits: `:99` "missed symbols", `:193` "conditions are not met", `:243` "why was it missed at
   planning?" — all unrelated prose, none goal-verdict vocabulary. The plan's underlying point
   (no goal-verdict *section* exists) is correct; the literal occurrence count is not. G7 is
   therefore scoped to the **enum-style sequence** (`met[^a-z]{1,4}partial[^a-z]{1,4}missed`,
   mirroring how SKILL.md itself writes the triplet), not bare words — a bare-word guard would be
   permanently unsatisfiable given lines `:99/:193/:243` and would never have caught the actual
   BUG-041-class risk (a Developer pasting the enum wholesale) any better than the scoped form does.
2. **A first-draft `non-empty` substring guard for G5c false-positived** on `reporter.md:269`
   ("All seven sections required ... non-empty content" — about report-section completeness,
   unrelated to the goal verdict). Caught by running the suite before finalizing; re-scoped to
   co-occurrence of `non-empty` and `met` within ~80 characters, which correctly stays green today
   and would correctly catch a Developer who writes something like "if the section is non-empty,
   report met."
3. **The exact wire format for "populated" is genuinely underspecified by the CR/plan** — the
   template's own placeholder says "populated by orchestrator **at §A.5**" (a later, human-confirmed
   step), unlike `## Sprint Goal`'s placeholder ("populated ... **from sprint plan §0 at kickoff**",
   which IS mechanically extracted by `init_sprint.mjs:270-275` today). This means there is no
   established plan-line syntax to mirror for extraction timing. G2/G3/G4 were therefore built
   against a **synthetic future-state template** this harness constructs itself
   (`make_future_template`, in both scratch flavors: `placeholder` and `token`) rather than against
   a guessed sprint-plan-line regex — `init_sprint.mjs` resolves its template path from
   `CLEARGATE_REPO_ROOT` (`init_sprint.mjs:37-39`), so a scratch dir can ship its own template and
   exercise whatever detection logic the Developer writes, decoupled from *how* a populated value
   reaches the file. **Flagged assumption for the Developer/TPV:** the synthetic placeholder is
   fixtured as ONE unwrapped line (matching every other placeholder in the current template,
   including `## Sprint Goal`'s), whereas the CR body's verbatim block is word-wrapped across two
   lines for doc readability. If the real template ships the placeholder wrapped, whitespace-
   normalize the detection or update this fixture — do not silently assume either.

## Could not author (with reason)

- **The other half of Rule-4 verification** — `TEMPLATE_FOR`
  (`cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts:111-118`) has exactly 7 entries
  and no `sprint_context` key. **Not encoded as a committed test**: `cleargate-cli` has 0 tracked
  files in the outer repo and does not exist under `.worktrees/*`
  (FLASHCARD 2026-08-26 `#worktree #collision-surface #danger`), and that file is outside CR-110's
  declared `§3 Execution Sandbox` — adding a case to it would be scope creep this dispatch does not
  authorise. **Manually verified instead**, from the main checkout:
  `TEMPLATE_FOR = { epic, story, cr, bug, initiative, hotfix, spike }` (7 entries, `sprint_context`
  absent) and `readiness-gates.md`'s `## Gate Definitions` has no `sprint_context` block — both
  confirm N6's claim directly. `RULE4a-live`/`RULE4b-canonical` in the committed suite cover the
  `readiness-gates.md` half, which IS reachable from this worktree.
- **G5's mutant table phrase "G5 must feed a check that is recorded and failed and assert `partial`
  or `missed`"** describes a dynamic behavioural test, but per OD-4 the verdict is **spoken** in the
  close Brief and never written to any file — there is no executable Reporter output to run such a
  test against. G5 is therefore encoded as a **static prose-contract check** on `reporter.md`'s own
  instruction text (does it name the section, does it use "satisfied" language, does it avoid the
  rejected non-empty/met shortcut, does it quote `GOAL_RELATION`) rather than a feed-a-failure/
  assert-the-output test. This is the same posture the CR's own text adopts one paragraph later
  ("assert against reporter.md's instructions, not against a report section").

## Parity

`diff .cleargate/scripts/test/cr078_init.test.sh cleargate-planning/.cleargate/scripts/test/cr078_init.test.sh`
→ clean (byte-identical, both trees updated in the same commit). `bash -n` syntax-checked clean on
both. `shellcheck -S warning` reports one pre-existing warning (`CONSTANTS_SCRIPT` unused,
line 33, predates this dispatch) and zero new warnings from the additions.

## Guardrails honored

- No file outside the declared surface (`§3 Execution Sandbox`) was opened for editing.
- No file under `cleargate-cli/**`, `close_sprint.mjs`, `readiness-gates.md`, `sprint_report.md`,
  `state.json`/`state.schema.json`, or the real templates was modified.
- No live `.claude/**` path touched (N1) — confirmed absent from this worktree entirely.
- `expected-headings.ts` not opened (N6).
- No `tail`/`head` piping of a suite run (N10) — captured to log files, status line read directly.
