# CR-123 — Architect Post-Flight (§C.6)

role: architect

- **Sprint:** SPRINT-41 · **Item:** CR-123 (`spidr-coverage`)
- **Reviewed:** cli `3f562c3` on `story/CR-123`; outer `3d5e8e90` on `story/CR-123` (`.worktrees/CR-123`)
- **Contract:** `plans/M1.md` §CR-123 (lines 30-154)
- **Why dispatched:** the pre-gate scan flagged only `typecheck: exit 254`

## Verdict: ARCH: PASS

The one flag is environmental. It is not a code defect.
- `.cleargate/config.yml:28` sets `arch.typecheck` to `npm --prefix cleargate-cli run typecheck`, and `pre_gate_runner.sh:208-214` runs it inside the outer worktree.
- `cleargate-cli/` is a separate, gitignored repo, so it does not exist in `.worktrees/CR-123/` (checked with `ls`). npm hits ENOENT and exits 254.
- This is the known false FAIL filed as **BUG-087** (pending-sync).
- The real typecheck ran in the cli checkout and was clean (`CR-123-qa.md:23`).

The implementation matches the M1 contract. The DevOps plan needs one correction: the epic checks must name the transition (§3, A1). It also needs two ordering constraints made explicit (§3, A2-A3). None of these blocks the merge.

---

## 1. Fit with the closed-set predicate design (CR-111 precedent)

| Property | `test-layers-declared` (CR-111) | `spidr-coverage` (CR-123) | Verdict |
|---|---|---|---|
| Reads | `doc.body` only (`readiness-predicates.ts:1279+`) | `doc.body` only (`:1411-1414`); no `doc.fm`, no `absPath`, no branch on type | ✓ |
| Absent → | pass, `not-applicable:` | pass, `not-applicable: no **SPIDR coverage.** lead-in (migration grace)` (`:1424-1428`) | ✓ same prefix convention |
| Heading dependence | none (row-label regexes) | none: no `## ` lookup, no `section(N)`, no heading anchor | ✓ |
| Trigger | `body.includes` substring | column-0 `startsWith` outside a generic fence mask (`:1416-1422`) | ✓ stricter, per M1 contract item 1 |
| Registration | story/cr/bug, last criterion | story/cr/bug, appended last; epic never | ✓ |
| Wiring | union + parser + evaluate case | union `:26`, parser `// 12.` before the throw, case in `evaluate()`, docstring 12→13 | ✓ |

**Self-fire check (the reason the trigger is designed this way):**
- CR-123's own body has **no** column-0 `**SPIDR coverage.**` line.
- The hits at `:55`, `:115` and `:186` are inline. The hit at `:89` is indented two spaces inside the 4-backtick fence at `:88-100`.
- After BD2, CR-123 therefore evaluates `not-applicable`.
- No other `pending-sync/` item, in either the main checkout or the worktree, carries a column-0 trigger (`command grep -l '^\*\*SPIDR coverage\.\*\*'` returns nothing). All 26 stories, 27 CRs and 41 bugs are grandfathered, as the CR states at `:115`.

**Is `computeGenericFenceMask` reuse-first?** Yes. It is a sensible helper and not a duplicate.
- `readiness-predicates.ts` had no fence scanner before this commit (grep `fence|```|~~~` on the pre-CR file finds nothing). The existing `section(N)` / `body contains` scanners are deliberately fence-blind (flashcard 2026-07-19).
- The only other fence state machine in `src/` is inside `frontmatter-locator.ts:72-99` (BUG-067). It is not exported, it is interleaved with `<instructions>` opacity, and it returns a span, not a per-line mask. Using it would have required a refactor of a file that just shipped, which is out of scope.
- The two implement the same CommonMark rule: same fence character, closer length ≥ opener.
- There is one cosmetic difference. The mask accepts `\s{0,3}` indentation (tabs included); the locator accepts ` {0,3}` (spaces only). This has no effect on shipped templates.
- **Future consolidation candidate:** a shared `lib/markdown-fences.ts` that exports a mask used by both. File it as hygiene. It is not a kick-back.

**Nit (not blocking, within contract):** the gherkin tag scanner (`:1467-1486`) keeps its own 3-backtick state machine and does not consult the generic mask.
- Effect: a ```` ```gherkin ```` example nested inside a ````` ````markdown ````` fence would contribute tags.
- This only matters when a document has a live column-0 trigger **and** quotes a tagged gherkin example inside an outer fence. The template instructions forbid tagged gherkin, so the case is unlikely.
- M1 contract item 4 specifies exactly this fence rule, so this is conformant.

## 2. Criterion interaction risk

**Does appending the criterion last shift anything positional?** No.
- Criteria are keyed by `id` everywhere: `gate.ts:235-243` evaluates in order but keys failures by `criterion.id`, and the OR-group logic keys by group name.
- `section(N)` indexes count template `## ` headings, not criterion positions. The four templates keep their `## ` counts: story 9/9, CR 10/10, Bug 9/9, epic 11/11. No added line starts with `#`.
- `gate-section-index-pinning.node.test.ts:439,651` counts only `section(` checks. That count stays at 18 = 16 + 2, and its fixture is keyed `<type>.<criterion-id>`.
- The block-count pins (11 blocks) do not change, because no block was added.
- No test pins a per-block criterion count or a failing-criteria list that contains `test-layers-declared`. Grep of `test/**` for `passed (N criteria)` and for `'test-layers-declared'` in a list returns nothing outside the CR-111/CR-123 red files.
- `doctor.ts:696` displays `failing_criteria[0]`. Because the new criterion is last, `spidr-coverage` only surfaces there when it is the sole failure. This is display only.
- `test-layers-declared` matches its rows by label (`^\| Unit tests \|` …). It cannot confuse its table with the new SPIDR table rows (`Paths/Interfaces/Data/Rules`), and the reverse is also true.

**Does the tightened epic `gherkin-error-path` newly fail anything?** No. Checked against the main checkout:

| Epic | lines with `Error` | lines with `Scenario: Error` | Effect |
|---|---|---|---|
| EPIC-052 | 3 | 3 (`:281,288,294`) | stays pass |
| EPIC-053 | 3 | 3 (`:267,273,279`) | stays pass |
| other 10 pending epics | 0 | 0 | already failing, unchanged |

- The needle is a case-sensitive, non-heading literal substring (`evalBodyContains` non-heading branch; `headingTitleOf('Scenario: Error')` returns null).
- The unedited `epic.md` carries `Scenario: {Error — …}`, which is not the literal `Scenario: Error`, so a fresh epic still fails as designed.
- `gherkin-error-path` lives in `epic.ready-for-coding` only. The `ready-for-decomposition` block, which drives Goal check 1, is untouched.

## 3. DevOps merge plan: review

The sequence is correct: cli merge → BD1 → outer merge → BD2 + MANIFEST commit → full suite → gate checks → RS-2. Amendments:

**A1 — Correction (item 8 is otherwise vacuous for the epics).**
- `gate check` re-evaluates the **cached** transition (`gate.ts:134-136`). EPIC-052 and EPIC-053 both cache `transition: ready-for-decomposition`, and that block has no `gherkin-error-path`.
- A plain `gate check -v` on them therefore proves nothing about the tightened string.
- Run: `node cleargate-cli/dist/cli.js gate check <EPIC-052|053 file> --transition ready-for-coding -v`.
  - Expected: `gherkin-error-path` passes, `'Scenario: Error' found 3 times`. On an overall pass `-v` only prints `passed (6 criteria)`, which also proves it passed.
  - `gate check` always writes the cache (`gate.ts:300-306`), so this run moves the epics' cached transition forward. That is not CR-123's decision to make. Afterwards, `git checkout -- ` both epic files.

**A2 — Load-bearing order: commit the MANIFEST before the suite.**
- The rule-14 revert (`git checkout -- .cleargate/delivery cleargate-planning/MANIFEST.json`) would throw away BD2's regenerated MANIFEST if it were still uncommitted.
- The plan already orders BD2 + commit before the suite. Keep it that way.
- Also verify after BD2:
  - `diff -q cleargate-cli/templates/cleargate-planning/.cleargate/knowledge/readiness-gates.md cleargate-planning/.cleargate/knowledge/readiness-gates.md` is silent. The payload must reflect the merged canonical; this is -01's baseline input.
  - `command grep -c spidr-coverage cleargate-cli/dist/cli.js` ≥ 1. Use `command grep`: `dist/` is gitignored and the grep shim hides it.

**A3 — Load-bearing order: re-gate CR-123 after the suite's revert.**
- If CR-123 is re-gated before the suite, the rule-14 `.cleargate/delivery` revert discards the fix.
- Run `node cleargate-cli/dist/cli.js gate check .cleargate/delivery/pending-sync/CR-123_spidr_scenario_coverage.md -v`.
  - Expected: `cr.ready-to-apply` passes, with `spidr-coverage` not-applicable.
  - This replaces the poisoned `predicate error` cache committed in `3d5e8e90`.
- Commit it as `chore(CR-123): re-gate after BD2 (clear stale predicate-error cache)`. This is a legitimate cache change.

**A4 — Candidates for "one story, one CR, one bug".** Pick items whose bodies have not changed since their last gate, so the only possible delta is attributable to CR-123:
- **CR:** CR-122 (`ready-to-apply`, pass, 09-06)
- **Bug:** BUG-088 (`ready-for-fix`, pass, 09-06)
- **Story:** STORY-058-01. Its cache (09-04) predates `a8f0b29b`, which added Task Breakdown rows, so a refresh is legitimate and useful before -01 starts. Commit it.

For each: `spidr-coverage` must not appear in `failing_criteria`, and the passing count rises by exactly 1. Revert timestamp-only changes on CR-122 and BUG-088.

**A5 — Merge mechanics (confirmed clean).**
- `sprint/S-41` is 2 commits ahead of the merge base `019e9cb4` (`a8f0b29b`, `393e939a`).
- The file sets are disjoint. The sprint side touched STORY-058-01/-02 and sprint-runs state/ledger. The story side touched templates, knowledge, canonical `.claude`, CR-123, `wiki/crs/CR-123.md`, `wiki/log.md` and reports.
- The merge will be a true merge with no conflicts.
- The main checkout's uncommitted state/ledger files, and BD1's dirty MANIFEST, are not touched by the merge, so it proceeds.

**Poisoning window: confirmed closed if the sequence holds.**

| Interval | dist | live gates doc (main) | Consistent? |
|---|---|---|---|
| cli merge → BD1 | old (no spidr) | unregistered | ✓ |
| BD1 → outer merge | new | unregistered | ✓ (new dist parses every old predicate) |
| outer merge → BD2 | BD1 (same src as BD2) | registered | ✓ (only the payload/MANIFEST lags; it drives no gate evaluation) |
| during BD2 `rm -rf dist && tsup` | absent → hook falls back to global `cleargate` 0.26.1 | registered | ✗ for seconds only; no delivery edits permitted |
| after BD2 | new | registered | ✓ |

Results:
- No main-checkout pending-sync item can be poisoned. Grep for `predicate error` across both trees finds only:
  - `CR-123` (worktree): the known case.
  - `archive/CR-111`: a stale SPRINT-39 `test-layers-declared` poisoning. It predates this sprint and is out of scope, but is worth a hygiene re-gate someday.
  - `CR-112`: the phrase appears in prose, not in the cache.
- **Root cause of the CR-123 poisoning:**
  - The stamp-and-gate hook runs the **main** checkout's `dist` (`stamp-and-gate.sh:3,12-13`, `CLAUDE_PROJECT_DIR`).
  - But `gate.ts:161,197-199` resolves `readiness-gates.md` from the **edited file's own tree** (`resolveProjectRootForFile`).
  - So the worktree's already-registered gates doc met the pre-CR `dist` when the Developer ticked the Task Breakdown rows at 06:11:38Z.
  - The M1 plan (line 125) warned about this. It happened in the same commit, not afterwards. A3 fixes it.

**RS-2:** clean copy.
- Live `.claude/agents/qa.md` and `.claude/skills/sprint-execution/SKILL.md` are byte-identical to the pre-CR canonical (`git show 3d5e8e90^:… | diff -q -` is silent for both). Copying canonical over them is lossless.
- Live `.cleargate/templates` and `.cleargate/knowledge` are tracked and arrive through the merge, so they need no re-sync. Canonical and live twins are byte-identical (`diff -q` is silent for all five).

## 4. Carry-forwards for STORY-058-01 (and -02)

1. **Snapshot source.** Cut `scaffold/core/**` from `git ls-files cleargate-planning/.cleargate` at the `sprint/S-41` tip **after** the MANIFEST commit (A2) and the CR-123 re-gate (A3).
   - Verify `sha256` equality between `scaffold/core/.cleargate/{templates/{story,CR,Bug,epic}.md,knowledge/readiness-gates.md}` and the merged canonical.
   - Verify `command grep -c spidr-coverage scaffold/core/.cleargate/knowledge/readiness-gates.md` is 7, the count measured on the merged canonical: 1 vocabulary heading plus `id` and `check` lines for each of the 3 registrations.
2. **Host files.** `scaffold/hosts/claude/.claude/agents/qa.md` and `…/skills/sprint-execution/SKILL.md` must carry CR-123's per-type Gherkin pointer.
   - The `:340` `File-naming:` clause is pinned by doctrine T7 (`test-layers-declared-doctrine.red.node.test.ts:260-285`).
   - If -01 or -02 regenerates or re-anchors `SKILL.md`, the clause must stay on the same line.
3. **Payload baseline** (M1 plan line 212, `cp -Rp … payload-baseline`) is the BD2 output. It is valid only if the A2 `diff -q` check was silent.
4. **A failed BD is no longer harmless.** From the outer merge on, a missing `dist` makes every hook fall back to global 0.26.1, which lacks `spidr-coverage`. Every story/CR/bug edit then caches `predicate error` (flashcards 2026-08-28 / 2026-09-25 `#gate #cross-repo`).
   - -01 changes the build pipeline (prebuild order, copier, tsup MANIFEST copy), so the risk of a failed build goes up.
   - After every -01/-02 BD, verify `dist/cli.js` exists and contains `spidr-coverage`.
   - If a BD fails, freeze all delivery edits until `dist` is rebuilt from the last good cli `main`.
5. **-02 test-repoint inventory (measured at 515dd3e, before CR-123) is stale.** Add:
   - `test/lib/readiness-predicates-spidr-coverage.red.node.test.ts:77-85`: joins `META_ROOT/cleargate-planning/.cleargate/{templates,knowledge}` behind a `CLEARGATE_META_ROOT` override.
   - `test/docs/test-layers-declared-doctrine.red.node.test.ts:86-88`: reads `CANON_ROOT/.claude/{agents/qa.md,skills/sprint-execution/SKILL.md}`.
   - Both are `.red` files, "immutable post-Red". Repointing them needs either an explicit exception in the -02 plan or root resolution through `test/helpers/scaffold-roots.ts` without editing the red file's assertions.
   - Otherwise both keep asserting against the frozen `cleargate-planning/` snapshot, and drift in `scaffold/core` goes undetected.
6. **Fresh-scaffold expectations.** Any -01/-02 test or clean-room check that scaffolds a **story/CR/bug** and asserts a gate result must now expect `spidr-coverage` to fail, because a `{T or F}` Cover cell is a defect by design (BUG-054).
   - Goal check 1 (fresh **epic**) is unaffected.
   - The BUG-067 hook smoke (`frontmatter-authoring.red.integration.node.test.ts:336-405`, fixture BUG-067 with no lead-in) still expects `gate=0` and gets not-applicable. It holds only when run against a post-BD `dist`.
7. **Anchors.** CR-123 edited `SKILL.md:340,438` in place, so the line count is unchanged. The `:104` / `:269` insertion anchors in the M1 plan (line 358) are still valid, but re-measure at branch time.

## Script Incidents

None from this dispatch (read-only; no wrapper invocations).

flashcards_flagged: ["2026-09-25 · #gate #worktree #cross-repo #danger · stamp-and-gate runs MAIN's dist but gate.ts reads the edited file's OWN tree's readiness-gates.md (resolveProjectRootForFile) — a predicate registered in a worktree poisons every delivery edit there until merge+BD.", "2026-09-25 · #gate #transition · gate check re-evaluates the CACHED transition (gate.ts:134); proving a later-transition criterion (epic ready-for-coding) needs --transition, which rewrites the cache — revert after."]
