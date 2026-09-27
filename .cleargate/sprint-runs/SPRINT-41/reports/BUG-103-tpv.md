role: architect

# BUG-103 TPV report (SPRINT-41 M7)

```
TPV: REJECTED
RESEAL_PATCH: reports/BUG-103-tpv-reseal.patch (also embedded below)
RESEAL_SHA256: 0da981c577776974121c3e40fb8a82d21d9a905a4467c061e88998fa0e0cc555
RESEAL_SCOPE: 2 test files, +205/-52 (sprint-execution-skill-drift.red +183/-27, skill-md-serial-pointers.red +22/-25). git apply --check is clean on <cw> 833b6a4 (run read-only). No change to src, scaffold, scripts or helpers; init-fixture.ts unchanged
PLAN_AMENDMENT: "## Amendments to append to M7.md" below, TPV103-A1..A8
COUNTS_AFTER_RESEAL: red file 22 leaves (20 sealed + T7b + T7c), 19 red at the seal (the same 19 reasons); skill-md-serial-pointers 3, unchanged. D4 for BUG-103 = +22, not +7
```

## Verdict in one paragraph

The seal is wired correctly:
- every import resolves;
- the counts reproduce exactly (20 leaves, 19 red, T7 green);
- every red fails on a plain assertion against the unedited text or script;
- the three init-fixture refusal hashes equal the measured pre-fix bytes.

A plan-conformant prototype turns all 20 green, and the six named witnesses and the M2 pair stay green. Two problems remain, so the verdict is REJECTED:

1. **BUG-103 as planned breaks a default-tier test the plan never named.** `test/scaffold/skill-md-serial-pointers.red.node.test.ts` Test 20 (`:39-69`) requires canonical SKILL.md to equal the pre-058-12 fixture plus exactly P1 and P2. Any SKILL.md edit turns it red. The plan's `# e.g.` example line in §C.11 also turns the Test 21 anchor red: its `/^#{1,6} /` counts fenced comment lines as headings (`:33-35`). The re-seal re-scopes Test 20, with the count unchanged. TPV103-A2 moves the example into prose, so Test 21 stays binding as sealed.
2. **The sealed file is too weak.** Each text check is one file-wide `includes()`, and T7 is the only guard against too much being filtered. The sealed suite kills **11 of 33** single-fault mutants of the prototype. It misses:
   - one of the four CR-046 lines left as `<cmd>`;
   - the §C.2 paragraph or any §C.3–§C.6 report bullet dropped;
   - the E7 `stories` clause dropped from §A.4;
   - the old §A.2 rule kept next to the new one;
   - a dirt filter that ignores all of `.cleargate/`, or that skips the `-> new` side of a rename.

   The re-sealed suite kills **33 of 33**. Each new pin is either a phrase the plan pins verbatim, located in its own section, or the absence of the defective text the bug reports.

The integration is safe:
- `init-fixture.ts` auto-merges with BUG-101 in both directions, proven by comparing the `>` streams with `cmp`;
- the generated Codex render auto-merges with a simulated BUG-101 R4/R5 regeneration, and `--check` passes.

## Rulings on the three points

**D4.** The plan's +7 counts scenarios; §2.3 says DevOps uses QA-Red's leaf counts. The sealed file registers 20 `test()` leaves, because T1/T2/T3/T5 loop over 2–4 targets. The re-seal adds T7b and T7c, for **22**. `skill-md-serial-pointers` stays at 3 and `init-fixture.ts` registers none. Measured on the scratch prototype plus the re-seal, based on `f0c33f7`: `npm test` ran **3591 = 3569 + 22** tests, with 2 skips. The corrected §2.3 line is TPV103-A1.

**T4 scope (OD-M7-3): confirmed.** QA-Red's T4 pins the lead sentence in both renders. The lead line (`SKILL.md:581`) is plain prose outside every renderer anchor (`build-codex-payload.mjs:296-306`), so it passes through unmodified. This was verified in both directions:
- scratch render without BUG-101: the sentence is present once;
- simulated integration with BUG-101's R4: the sentence and `**Per-dispatch gate.**` are each present once.

`**Per-dispatch gate.**` is pinned by value only in BUG-101's re-pinned Test 31 (`codex-sprint-execution-render.red.node.test.ts:55` at `59da770`, asserted into the render by the `:78` loop). Asserting it in BUG-103 would make T4 fail on BUG-103's own branch, which is cut from `f0c33f7` without R4. §3's "and the Codex render contains `**Per-dispatch gate.**`" is struck from BUG-103 (TPV103-A6).

**init-fixture.ts vs BUG-101 (`BUG101_SENTINEL_PRE`, `59da770`).** The hunks are disjoint:
- BUG-101 adds a const and one refusal branch inside `bug085SentinelCurrentHash()` (~L498–516);
- BUG-103 adds the new row and two chained branches in `SANCTIONED_BASELINE_DELTAS` (~L669–760 at `833b6a4`).

Simulation on a clone of cli `main` `0e5b0ac`:
- merging BUG-101 then BUG-103 auto-merges with no conflict;
- the `-U0` `>`/`<` streams of each side's delta are byte-equal before and after the other merges (`cmp`, both directions);
- `git merge-tree` of 101×103 and of main×103 is clean.

**Predicted conflict: none.**

The refusal hashes stay valid through integration. Measured: `cecf1700…` = SKILL.md and `51f30ec4…` = architect.md, both pin-substituted at `f0c33f7`. No item ahead of BUG-103 in the merge order touches either file: BUG-101 edits only the sentinel hook and `build-codex-payload.mjs`. `e4c6bead…` equals canonical and the M2 baseline copy (`/private/tmp/cg-s41-m2-init-baseline/fresh/tree/...`, read-only `shasum`).

**Resolution rule for INTEGRATE:**
1. Take the union of rows and refusal branches. Never drop a branch, and never add a second row for a `rel` (flashcard 2026-09-26 "One SANCTIONED_BASELINE_DELTAS row per rel").
2. Prove any hand splice by comparing the `>` streams with `cmp`, not by hunk offsets (flashcard 2026-09-27).
3. Never hand-merge the generated `scaffold/core/.agents/**` or `.codex/**` files. Take either side, run `npm run gen:codex`, then `node scripts/build-codex-payload.mjs --check`.
4. Run the M2 pair with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (compare-only).
5. A textual conflict in `init-fixture.ts` goes to QA-Red (rule 21 / R-6).

## Conformance table (M7 §3 BUG-103 rows → tests)

`S` = sealed at `833b6a4`, `R` = after the re-seal. A sealed `includes()` anywhere in the file counts as "weak" when another copy of the phrase can satisfy it.

| M7 §3 rule | Sealed coverage | Re-seal coverage | Gap closed |
|---|---|---|---|
| §A.1 "Five automated checks …" | T1 (file-wide) | T1: inside §A.1; §A.1 has no "Six checks" and no "all 6 preflight checks" | the resolution-list line |
| §A.2 bookkeeping rule | T2: 2 phrases, file-wide | T2: inside §A.2, plus "Never commit bookkeeping to \`main\`"; "never committed to directly" absent | old rule kept; the main-branch ban dropped |
| §A.3 `cleargate sprint init SPRINT-NN --stories` | T1 (file-wide) | T1: inside §A.3; no `init_sprint.mjs SPRINT-NN` without `--stories` anywhere | the old block kept next to the new one |
| §A.3 prefix sentence | none | none (explanatory, not a rule) | — |
| §A.4 Task-instruction line | none | T5: "Also write <sprintDir>/plans/waves.json" inside §A.4 | yes (DT P4) |
| §A.4 `:185` one-wave paragraph | T5 phrase | T5 phrase plus 'a \`"stories"\` entry per story' (E7) inside §A.4 | the stories clause |
| §A.4 verify "(any N)" / SDR re-dispatch | none | T5: "Verify before leaving A.4 (any N)" | yes |
| §C.1 wiki exclusion text | none | T2: "\`.cleargate/wiki/**\` excluded" inside §C.1 | yes |
| §C.2 paragraph + §C.3/§C.4/§C.5/§C.6 bullets | T3: one phrase, file-wide | T3: the phrase in each of the five sections | each placement |
| CR-046 lines ×4 | T1: one `includes` | T1: no `run_script.sh <cmd>`; each of ≥4 CR-046 lines has `run_script.sh node .cleargate/scripts/` | a 1-of-4 fix |
| §C.11 example + "never a bare script name" | none (a CR-046 line satisfied T1) | T1: both inside §C.11 Script Invocation Contract | yes |
| §C.9 lead (I16) | T4, both renders | unchanged | — |
| dispatch-serial.md §2 step 3 | T3 (file-wide) | T3: on the step-3 line | — |
| architect.md:108 + architect.toml | T5 | unchanged | — |
| `gen:codex` (render, dispatch-serial copy, toml) | the Codex cases of T1–T5 | same, plus the new pins on the render | — |
| validate_bounce_readiness: wiki dirt passes | T6 (modified + untracked) | unchanged | — |
| real dirt still blocks | T7 (`src/`) | T7, plus T7b (non-wiki `.cleargate/delivery/…` dirt next to wiki churn, stderr names it) and T7c (staged rename `.cleargate/wiki/foo.md -> .cleargate/wiki-archive/foo.md`) | too-loose filters |
| init-fixture rows | new row + 2 refusal chains | unchanged | — |
| Regression witness `skill-md-serial-pointers` | not named by the plan | Test 20 re-scoped | the plan gap (TPV103-A5) |

**Tests asserting beyond §3: none.**
- T4's Codex half pins a plan-pinned sentence in the regenerated copy, which §3's "both renders" rule requires.
- T6's stdout prefix "Bounce readiness check passed" and T7's "git working tree is dirty" are existing texts that §3 keeps unchanged ("the error text is unchanged").
- T3's `3. Run the story through` is the existing step-3 prefix, used only as a locator.

## Prototype results

**Scratch setup.** Scratch root `/private/tmp/cg-s41-tpv103-20260927T085537`:
- the cli is `git clone --no-hardlinks <cw>`, nested in an outer `git clone --no-hardlinks` at `story/BUG-103` `7db0e89e`;
- `.claude` is a copy of the live `/.claude`, so the tests that resolve `REPO_ROOT`/`META_ROOT` to the cli's parent read real outer files;
- `node_modules` is symlinked to the main cli;
- `prebuild` and `build` ran in scratch only.

**Prototype.** It applies every §3 row verbatim, with TPV103-A2/A3/A4 wording, then `npm run gen:codex`. Diff: 7 files, +66/-33:
- canonical SKILL.md, dispatch-serial.md, architect.md;
- `validate_bounce_readiness.mjs`;
- the regenerated Codex SKILL.md, dispatch-serial.md copy and architect.toml.

**Results:**

| Run | Result |
|---|---|
| red file at the seal, sealed | 20 tests / 1 pass / 19 fail (T6 red on "got 1", ` M .cleargate/wiki/foo.md` + `?? .cleargate/wiki/bar.md` listed) |
| red file at the seal, re-sealed | 22 / 3 / 19; the same 19 plain assertion reasons, T7/T7b/T7c green |
| red file on the prototype | sealed 20/20; re-sealed 22/22 |
| six named witnesses (portable-skills, codex-payload, contract-first-dag-text, collision-surface-planning-workflow, codex-sprint-execution-render, init-codex-sprint-execution) | 51/51 |
| `sprint-execution-mirror.integration` | 3/4. "diff command on live vs canonical" is red, as expected until RS-M7b; the other 3 are green |
| M2 pair (`claude-adapter-init-parity` + `init-host-parity`, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare-only) | 20/20 (the new row and both chained refusals resolve to the landed bytes) |
| `skill-md-serial-pointers.red` | sealed: Test 20 red (delta of 14 lines); with the plan's `# e.g.` line, Test 21 red too. Re-sealed plus TPV103-A2: 3/3, and 3/3 at the seal |
| every test naming the edited files (29 files) | green, except the expected mirror red and the 2 pre-existing `foreign-repo.integration` reds (also red at the seal: `.install-manifest.json cleargate_version field`) |
| full default tier (`npm test`, re-sealed tests) | **3591 tests / 3585 pass / 4 fail / 2 skip** |
| the 4 full-tier fails | all environmental: `admin-api/snapshot-drift` (no outer `mcp/` in scratch), `examples/red-green-example` ×2 (no outer `node_modules/.bin/tsx`), `init-from-source` Scenario 1 (a temp-dir race with the concurrent mutant sweep; 11/11 solo) |
| `npm run typecheck` / `npm run prebuild` (`--check`) | 0 / 0 |
| integration simulation: clone of cli main `0e5b0ac` + BUG-101 (`59da770` + R4/R5 set to its Test 31 pins + `gen:codex`) + BUG-103 (prototype + re-seal) | both merges auto-merge (including the generated render); `--check` is 0; red file + Test 31 file + serial-pointers = 28/28; the lead sentence and `**Per-dispatch gate.**` are each once in the render |

Rule 16: the full tier ran every default-tier `CLEARGATE_META_ROOT` file against the scratch outer clone, with the twin unchanged; all green. No cli test pins twin byte-parity for `validate_bounce_readiness.mjs`. The twin is a Developer/DevOps obligation (rule 10/15), and `doctor` drift catches it after BD.

## Mutant table

The prototype = the §3 texts plus the plan-rule filter. Each mutant is one fault; `gen:codex` re-runs unless noted. Cells give the tests that fail.

| # | Mutant | Sealed | Re-sealed |
|---|---|---|---|
| 1 | §A.1 check line not changed | T1 "Five" ×2 | T1 "Five" ×2 |
| 2 | §A.1 resolution keeps "re-run all 6 preflight checks" | survives | T1 "Five" ×2 |
| 3 | §A.2 not changed | T2 ×2 | T2 ×2 |
| 4 | §A.2 new text added, old "never committed to directly" kept | survives | T2 ×2 |
| 5 | §A.2 "Never commit bookkeeping to \`main\`." dropped | survives | T2 ×2 |
| 6 | §A.3 block not changed | T1 init ×2 | T1 init ×2 |
| 7 | §A.3 new command added, `init_sprint.mjs SPRINT-NN` line kept | survives | T1 init ×2 |
| 8 | §A.4 `:185` not changed | T5 ×2 | T5 ×2 |
| 9 | §A.4 paragraph without the `"stories"` clause (E7) | survives | T5 ×2 |
| 10 | §A.4 Task-instruction line not appended | survives | T5 ×2 |
| 11 | §A.4 verify heading stays "(N > 2)" | survives | T5 ×2 |
| 12 | §C.1 wiki-exclusion text missing | survives | T2 ×2 |
| 13 | §C.2 report paragraph missing (bullets present) | survives | T3 SKILL ×2 |
| 14–17 | one of the §C.3/§C.4/§C.5/§C.6 report bullets missing (4 mutants) | survive (4) | T3 SKILL ×2 each |
| 18–21 | one of the four CR-046 lines left with `<cmd>` (4 mutants) | survive (4) | T1 run_script ×2 each |
| 22 | §C.11 example + "never a bare script name" missing | survives | T1 run_script ×2 |
| 23 | §C.9 lead not changed | T4 ×2 | T4 ×2 |
| 24 | dispatch-serial.md step 3 not changed | T3 DS ×2 | T3 DS ×2 |
| 25 | architect.md:108 not changed | T5 architect.md + architect.toml | T5 architect.md + architect.toml |
| 26 | canonical edited, `gen:codex` not re-run | 9 Codex cases | 9 Codex cases (plus prebuild `--check`) |
| 27 | no wiki filter | T6 | T6 |
| 28 | filter ignores all of `.cleargate/` | survives | T7b, T7c |
| 29 | whole-output "any wiki line present → pass" | survives | T7b, T7c |
| 30 | no `-> new` handling (source side decides) | survives | T7c |
| 31 | trims the whole output before `slice(3)` | T6 | T6, T7c |
| 32 | filters tracked lines only (untracked wiki stays dirty) | T6 | T6, T7c |
| 33 | prefix `.cleargate/wiki` without the trailing slash | survives | T7c |

**Killed: sealed 11/33, re-sealed 33/33.**

One further mutant is a plan-text finding, not part of the red file: the plan's own `# e.g.` line in §C.11. It is killed by `skill-md-serial-pointers` Test 21, which is why TPV103-A2 changes the plan text rather than the anchor.

## Plan-text findings (amendments below)

1. **§C.11 `# e.g.` line (TPV103-A2).** A new fenced `# ` line changes the heading sequence that sealed Test 21 pins.
2. **CR-046 parenthetical (TPV103-A3).** "(or `bash .cleargate/scripts/<script>.sh`)" reads as an unwrapped direct invocation, and the next sentence forbids exactly that. A literal reader will run it bare, which is the same defect class as BUG-103 defect 4. `run_script.sh:9-12` documents the `run_script.sh bash …` form.
3. **§C.9 lead "the next paragraph" (TPV103-A4).** The next paragraph is "For each card:". The hook paragraph (A4 anchor, R4 on Codex) comes after the table and the marker block.

## Re-seal patch (test-only, unified diff against `833b6a4`)

Apply in `<cw>`:
1. `git apply .cleargate/sprint-runs/SPRINT-41/reports/BUG-103-tpv-reseal.patch`;
2. check `shasum -a 256` = `0da981c5…c555`;
3. check that the staged files equal the two test files.

Commit as `qa-red(BUG-103): TPV re-seal …`. The same bytes are embedded here between the markers. Extract them with:

`awk '/^<!-- RESEAL-PATCH-BEGIN -->$/{f=1;next}/^<!-- RESEAL-PATCH-END -->$/{f=0}f' BUG-103-tpv.md | sed '1d;$d'`

This drops the fence lines.

<!-- RESEAL-PATCH-BEGIN -->
```diff
diff --git a/test/scaffold/skill-md-serial-pointers.red.node.test.ts b/test/scaffold/skill-md-serial-pointers.red.node.test.ts
index 2c8c9c7..91e995e 100644
--- a/test/scaffold/skill-md-serial-pointers.red.node.test.ts
+++ b/test/scaffold/skill-md-serial-pointers.red.node.test.ts
@@ -34,38 +34,35 @@ function headings(text: string): string[] {
   return text.split('\n').filter((l) => /^#{1,6} /.test(l));
 }
 
-// ── Test 20 — exactly the two pinned insertions, nothing else ───────────────
+// ── Test 20 — P1 and P2 stay pinned in place ─────────────────────────────────
+//
+// Re-scoped by BUG-103 (SPRINT-41 M7, TPV): the original "canonical = fixture + exactly P1 + P2"
+// byte check froze the whole playbook, so every later sanctioned SKILL.md edit turned it red.
+// STORY-058-12's Gherkin 1 guard is kept where it still means something: the fixture stays the
+// pinned pre-story bytes, and P1/P2 each appear exactly once, verbatim, one blank line after
+// their anchor line. Test 21 keeps guarding the heading sequence against the fixture.
 
-test('Test 20 — canonical SKILL.md differs from the frozen pre-story fixture by exactly P1 after line 104 and P2 after "A single-story wave..."', () => {
-  const fixture = fs.readFileSync(FIXTURE_PATH, 'utf8');
+test('Test 20 — canonical SKILL.md keeps P1 after its anchor and P2 after "A single-story wave..." (re-scoped by BUG-103)', () => {
   assert.equal(
     createHash('sha256').update(fs.readFileSync(FIXTURE_PATH)).digest('hex'),
     'e7c730efde50df072e6eccffc6b48764e55c19ab8706dae376208a644d35c797',
     'the frozen fixture itself must be the pinned pre-story bytes',
   );
-  const canonical = fs.readFileSync(CANONICAL_PATH, 'utf8');
-  const fixtureLines = fixture.split('\n');
-  const canonicalLines = canonical.split('\n');
-
-  assert.equal(canonicalLines.length, fixtureLines.length + 4, `expected exactly 4 more lines (2 blank + P1 + P2), got a delta of ${canonicalLines.length - fixtureLines.length}`);
-
-  const p1AnchorIdx = fixtureLines.findIndex((l) => l.startsWith(P1_AFTER_PREFIX));
-  const p2AnchorIdx = fixtureLines.findIndex((l) => l.startsWith(P2_AFTER_PREFIX));
-  assert.ok(p1AnchorIdx >= 0, 'fixture must contain the P1 anchor line');
-  assert.ok(p2AnchorIdx >= 0, 'fixture must contain the P2 anchor line');
-
-  assert.equal(canonicalLines[p1AnchorIdx + 1], '', 'expected a blank line directly after the P1 anchor');
-  assert.equal(canonicalLines[p1AnchorIdx + 2], P1, 'expected P1 verbatim directly after its blank line');
-  // P2's anchor shifts by 2 lines (P1's insertion): canonical anchor at +2, blank at +3, P2 at +4.
-  assert.ok(canonicalLines[p2AnchorIdx + 2]!.startsWith(P2_AFTER_PREFIX), 'expected the P2 anchor 2 lines lower in canonical');
-  assert.equal(canonicalLines[p2AnchorIdx + 3], '', 'expected a blank line directly after the P2 anchor');
-  assert.equal(canonicalLines[p2AnchorIdx + 4], P2, 'expected P2 verbatim directly after its blank line');
+  const fixtureLines = fs.readFileSync(FIXTURE_PATH, 'utf8').split('\n');
+  const canonicalLines = fs.readFileSync(CANONICAL_PATH, 'utf8').split('\n');
 
-  // Removing the 4 inserted lines must reproduce the fixture byte-for-byte.
-  const withoutInsertions = canonicalLines
-    .filter((_, i) => i !== p1AnchorIdx + 1 && i !== p1AnchorIdx + 2 && i !== p2AnchorIdx + 3 && i !== p2AnchorIdx + 4)
-    .join('\n');
-  assert.equal(withoutInsertions, fixture, 'removing exactly the 4 inserted lines must reproduce the fixture byte-for-byte');
+  for (const [label, prefix, paragraph] of [
+    ['P1', P1_AFTER_PREFIX, P1],
+    ['P2', P2_AFTER_PREFIX, P2],
+  ] as const) {
+    assert.equal(fixtureLines.filter((l) => l.startsWith(prefix)).length, 1, `fixture must contain the ${label} anchor line once`);
+    assert.equal(fixtureLines.filter((l) => l === paragraph).length, 0, `the pre-story fixture must not contain ${label}`);
+    const anchors = canonicalLines.flatMap((l, i) => (l.startsWith(prefix) ? [i] : []));
+    assert.equal(anchors.length, 1, `canonical must contain the ${label} anchor line exactly once`);
+    assert.equal(canonicalLines[anchors[0]! + 1], '', `expected a blank line directly after the ${label} anchor`);
+    assert.equal(canonicalLines[anchors[0]! + 2], paragraph, `expected ${label} verbatim directly after its blank line`);
+    assert.equal(canonicalLines.filter((l) => l === paragraph).length, 1, `${label} must appear exactly once in canonical`);
+  }
 });
 
 // ── Test 21 (ANCHOR) — heading sequence is unchanged ─────────────────────────
diff --git a/test/scaffold/sprint-execution-skill-drift.red.node.test.ts b/test/scaffold/sprint-execution-skill-drift.red.node.test.ts
index 927d761..a5575fd 100644
--- a/test/scaffold/sprint-execution-skill-drift.red.node.test.ts
+++ b/test/scaffold/sprint-execution-skill-drift.red.node.test.ts
@@ -10,13 +10,15 @@
  * vs. clean-tree contradiction, the run_script.sh `<cmd>` ambiguity, relative report paths)
  * plus the I16 §C.9 lead fold and the BUG-102 §A.4 one-wave-waves.json text fold (OD-M7-5).
  *
- * TEST INVENTORY (7 tests, M7.md §3 "Tests"):
- *   T1 — both renders carry "cleargate sprint init SPRINT-NN --stories", "Five automated
- *        checks" and a run_script.sh example naming node + the script path.
+ * TEST INVENTORY (7 scenarios, M7.md §3 "Tests"; 22 node:test leaves):
+ *   T1 — both renders carry "cleargate sprint init SPRINT-NN --stories" (§A.3), "Five automated
+ *        checks" (§A.1) and a run_script.sh example naming node + the script path (every CR-046
+ *        line and §C.11; no `run_script.sh <cmd>` left).
  *   T2 — both renders carry the §A.2 bookkeeping rule (orchestrator bookkeeping commits vs.
- *        no story code on the sprint branch directly).
- *   T3 — both renders plus both dispatch-serial.md copies name the main checkout's absolute
- *        reports path.
+ *        no story code on the sprint branch directly; the old contradicting rule is gone) and
+ *        §C.1 names the `.cleargate/wiki/**` exclusion.
+ *   T3 — both renders (§C.2 plus each §C.3-§C.6 dispatch list) plus both dispatch-serial.md
+ *        copies (§2 step 3) name the main checkout's absolute reports path.
  *   T4 — the canonical §C.9 lead carries the serial-host sentence. SCOPE NOTE: the Codex
  *        render's "Per-dispatch gate" text is a DIFFERENT passage (R4 in
  *        CODEX_SKILL_REPLACEMENTS, build-codex-payload.mjs:284) owned by BUG-101 (collision
@@ -25,14 +27,18 @@
  *        (not an R-anchor) survives verbatim into the regenerated Codex copy once `gen:codex`
  *        re-runs, which is within BUG-103's own scope.
  *   T5 — both renders' §A.4 plus architect.md/architect.toml name the one-wave
- *        `plans/waves.json` (BUG-102 §A.4 text fold, OD-M7-5, plus architect.md:108 / E9).
+ *        `plans/waves.json` (BUG-102 §A.4 text fold, OD-M7-5, plus architect.md:108 / E9); §A.4
+ *        also carries the `stories` entry (E7), the tiny-sprint Task line and "(any N)".
  *   T6 — validate_bounce_readiness.mjs: wiki-only dirt (modified + untracked
  *        `.cleargate/wiki/*`) passes.
- *   T7 — validate_bounce_readiness.mjs: real uncommitted work under `src/` still blocks.
+ *   T7 — validate_bounce_readiness.mjs: real uncommitted work under `src/` still blocks; so do
+ *        bookkeeping dirt outside the wiki next to wiki churn (T7b) and a page renamed out of
+ *        `.cleargate/wiki/` (T7c: the `-> new` side decides; `.cleargate/wiki-archive/` is not
+ *        the wiki).
  *
  * BASELINE FAIL CONTRACT (QA-Red commit, cli main f0c33f7): T1-T6 FAIL today on a plain
  * string/behavior assertion against the UNEDITED canonical text and the UNEDITED script —
- * never a wiring error. T7 is a REGRESSION GUARD for behavior that already works today
+ * never a wiring error. T7, T7b and T7c are REGRESSION GUARDS for behavior that already works today
  * (flashcard 2026-09-26 "a byte-neutral story's e2e reds must mark already-green anchor
  * cases, not force them red") — it PASSES at the QA-Red commit and must keep passing after
  * the Developer's fix narrows the dirty-tree check to ignore only `.cleargate/wiki/**`.
@@ -68,6 +74,27 @@ function read(p: string): string {
   return fs.readFileSync(p, 'utf8');
 }
 
+/**
+ * The body of the unique heading starting with `headingPrefix`: the lines after the heading up
+ * to the next `##`/`###` heading. The heading line itself is excluded (flashcard 2026-09-26: a
+ * slice that keeps its heading makes 'body names X' vacuous), and a phrase is pinned inside its
+ * own section so a copy elsewhere cannot mask a missing operative copy (flashcard 2026-09-26).
+ */
+function section(text: string, headingPrefix: string): string {
+  const lines = text.split('\n');
+  const hits = lines.flatMap((l, i) => (l.startsWith(headingPrefix) ? [i] : []));
+  assert.equal(hits.length, 1, `expected exactly one heading starting with "${headingPrefix}", found ${hits.length}`);
+  const start = hits[0]!;
+  let end = lines.length;
+  for (let i = start + 1; i < lines.length; i++) {
+    if (/^#{2,3} /.test(lines[i]!)) {
+      end = i;
+      break;
+    }
+  }
+  return lines.slice(start + 1, end).join('\n');
+}
+
 // ── T1/T2/T3/T5: text-drift assertions on the two renders ───────────────────
 
 describe('BUG-103 T1 — both renders carry the corrected kickoff commands', () => {
@@ -78,25 +105,46 @@ describe('BUG-103 T1 — both renders carry the corrected kickoff commands', ()
     test(`${label} SKILL.md names "cleargate sprint init SPRINT-NN --stories"`, () => {
       const text = read(file);
       assert.ok(
-        text.includes('cleargate sprint init SPRINT-NN --stories'),
-        `${label} SKILL.md (${file}) does not yet name the --stories invocation`,
+        section(text, '### A.3 ').includes('cleargate sprint init SPRINT-NN --stories'),
+        `${label} SKILL.md (${file}) §A.3 does not yet name the --stories invocation`,
+      );
+      assert.ok(
+        !/init_sprint\.mjs SPRINT-NN(?! --stories)/.test(text),
+        `${label} SKILL.md (${file}) still gives the usage-failing "init_sprint.mjs SPRINT-NN" invocation (BUG-103 defect 1)`,
       );
     });
 
     test(`${label} SKILL.md says "Five automated checks"`, () => {
-      const text = read(file);
+      const a1 = section(read(file), '### A.1 ');
+      assert.ok(
+        a1.includes('Five automated checks'),
+        `${label} SKILL.md (${file}) §A.1 still says "Six checks" (M7.md §3 §A.1 row)`,
+      );
       assert.ok(
-        text.includes('Five automated checks'),
-        `${label} SKILL.md (${file}) still says "Six checks" (M7.md §3 §A.1 row)`,
+        !a1.includes('Six checks') && !a1.includes('all 6 preflight checks'),
+        `${label} SKILL.md (${file}) §A.1 still counts six preflight checks (the check line or the resolution list)`,
       );
     });
 
     test(`${label} SKILL.md gives a concrete run_script.sh node example`, () => {
       const text = read(file);
       assert.ok(
-        text.includes('run_script.sh node .cleargate/scripts/'),
-        `${label} SKILL.md (${file}) has no concrete "run_script.sh node .cleargate/scripts/<x>" example (the ` +
-          '<cmd> placeholder is the ambiguity Codex misread, M7.md §3 §C.11 row)',
+        !text.includes('run_script.sh <cmd>'),
+        `${label} SKILL.md (${file}) still has a "run_script.sh <cmd>" placeholder (the ambiguity Codex misread)`,
+      );
+      const cr046 = text.split('\n').filter((l) => l.startsWith('**Script invocation rule (CR-046):**'));
+      assert.ok(cr046.length >= 4, `${label} SKILL.md (${file}) has ${cr046.length} CR-046 rule lines, expected the four dispatch ones`);
+      for (const line of cr046) {
+        assert.ok(
+          line.includes('run_script.sh node .cleargate/scripts/'),
+          `${label} SKILL.md (${file}) CR-046 line has no concrete "run_script.sh node .cleargate/scripts/<x>" form: ${line}`,
+        );
+      }
+      const c11 = section(text, '### C.11 Script Invocation Contract');
+      assert.ok(
+        c11.includes('run_script.sh node .cleargate/scripts/') && c11.includes('never a bare script name'),
+        `${label} SKILL.md (${file}) §C.11 Script Invocation Contract has no concrete node example and no ` +
+          '"never a bare script name" rule (M7.md §3 §C.11 row)',
       );
     });
   }
@@ -109,31 +157,62 @@ describe('BUG-103 T2 — both renders carry the §A.2 bookkeeping rule', () => {
   ] as const) {
     test(`${label} SKILL.md names orchestrator bookkeeping commits on sprint/S-NN`, () => {
       const text = read(file);
+      const a2 = section(text, '### A.2 ');
+      assert.ok(
+        a2.includes('Orchestrator bookkeeping is:'),
+        `${label} SKILL.md (${file}) §A.2 does not yet distinguish orchestrator bookkeeping from story code`,
+      );
       assert.ok(
-        text.includes('Orchestrator bookkeeping is:'),
-        `${label} SKILL.md (${file}) does not yet distinguish orchestrator bookkeeping from story code`,
+        a2.includes('chore(SPRINT-NN):'),
+        `${label} SKILL.md (${file}) §A.2 does not yet name the chore(SPRINT-NN) bookkeeping commit convention`,
       );
       assert.ok(
-        text.includes('chore(SPRINT-NN):'),
-        `${label} SKILL.md (${file}) does not yet name the chore(SPRINT-NN) bookkeeping commit convention`,
+        a2.includes('Never commit bookkeeping to `main`'),
+        `${label} SKILL.md (${file}) §A.2 does not forbid bookkeeping commits on main (Codex committed there)`,
+      );
+      assert.ok(
+        !a2.includes('never committed to directly'),
+        `${label} SKILL.md (${file}) §A.2 still carries the contradicting "never committed to directly" rule`,
+      );
+      assert.ok(
+        section(text, '### C.1 ').includes('`.cleargate/wiki/**` excluded'),
+        `${label} SKILL.md (${file}) §C.1 does not name the .cleargate/wiki/** exclusion of the clean-tree check`,
       );
     });
   }
 });
 
 describe('BUG-103 T3 — both renders plus both dispatch-serial.md copies name the absolute reports path', () => {
+  const PHRASE = "main checkout's absolute";
+
   for (const [label, file] of [
     ['Claude canonical SKILL.md', CLAUDE_SKILL],
     ['Codex render SKILL.md', CODEX_SKILL],
+  ] as const) {
+    test(`${label} names the main checkout's absolute reports path`, () => {
+      const text = read(file);
+      // §C.2 carries the paragraph; each of the four role dispatch input lists carries the bullet.
+      for (const heading of ['### C.2 ', '### C.3 ', '### C.4 ', '### C.5 ', '### C.6 ']) {
+        assert.ok(
+          section(text, heading).includes(PHRASE),
+          `${label} (${file}) ${heading.trim()} does not yet tell the orchestrator to pass the main checkout's ` +
+            'absolute reports path (M7.md §3 §C.2 row; BUG-103 evidence #5)',
+        );
+      }
+    });
+  }
+
+  for (const [label, file] of [
     ['Claude canonical dispatch-serial.md', CLAUDE_DISPATCH_SERIAL],
     ['Codex render dispatch-serial.md', CODEX_DISPATCH_SERIAL],
   ] as const) {
     test(`${label} names the main checkout's absolute reports path`, () => {
-      const text = read(file);
+      const step3 = read(file).split('\n').filter((l) => l.startsWith('3. Run the story through'));
+      assert.equal(step3.length, 1, `${label} (${file}) must keep exactly one §2 step 3 line`);
       assert.ok(
-        text.includes("main checkout's absolute"),
-        `${label} (${file}) does not yet tell the orchestrator to pass the main checkout's ` +
-          'absolute reports path (M7.md §3 §C.2/dispatch-serial.md row; BUG-103 evidence #5)',
+        step3[0]!.includes(PHRASE),
+        `${label} (${file}) §2 step 3 does not yet name the main checkout's absolute reports path ` +
+          '(M7.md §3 dispatch-serial.md row; errata E8)',
       );
     });
   }
@@ -176,12 +255,25 @@ describe('BUG-103 T5 — both renders\' §A.4 plus architect.md/architect.toml n
     ['Codex render', CODEX_SKILL],
   ] as const) {
     test(`${label} SKILL.md §A.4 says the ≤2-story plan is still one serial wave, always written`, () => {
-      const text = read(file);
+      const a4 = section(read(file), '### A.4 ');
       assert.ok(
-        text.includes(SKILL_SENTENCE),
+        a4.includes(SKILL_SENTENCE),
         `${label} SKILL.md (${file}) §A.4 does not yet say the tiny-sprint floor still writes ` +
           'plans/waves.json (M7.md §3 "§A.4 :185" row; E7/E9)',
       );
+      assert.ok(
+        a4.includes('a `"stories"` entry per story'),
+        `${label} SKILL.md (${file}) §A.4 one-wave shape has no "stories" entry per story — a schema_version 2 ` +
+          'plan without it makes integrationReady throw "unknown story" (errata E7)',
+      );
+      assert.ok(
+        a4.includes('Also write <sprintDir>/plans/waves.json'),
+        `${label} SKILL.md (${file}) §A.4 tiny-sprint Task instruction does not tell the SDR Architect to write waves.json`,
+      );
+      assert.ok(
+        a4.includes('Verify before leaving A.4 (any N)'),
+        `${label} SKILL.md (${file}) §A.4 still verifies waves.json only for N > 2`,
+      );
     });
   }
 
@@ -340,5 +432,69 @@ describe('BUG-103 T6/T7 — validate_bounce_readiness.mjs dirty-tree scope', ()
       fs.rmSync(stateDir, { recursive: true, force: true });
     }
   });
+
+  test('T7b (regression guard, already green): bookkeeping dirt outside .cleargate/wiki/ blocks even next to wiki churn', () => {
+    const repoDir = initRepo();
+    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug103-vbr-state-'));
+    try {
+      // The BUG-103 evidence's own non-wiki line: an uncommitted sprint-plan edit. Only
+      // .cleargate/wiki/** is excluded; other bookkeeping is committed first (§A.2, §C.1).
+      const deliveryRel = '.cleargate/delivery/pending-sync/SPRINT-01_tiny_node_todo_cli.md';
+      fs.mkdirSync(path.dirname(path.join(repoDir, deliveryRel)), { recursive: true });
+      fs.writeFileSync(path.join(repoDir, deliveryRel), 'plan v1\n');
+      execSync('git add -A && git commit -q -m "plan"', { cwd: repoDir, stdio: 'pipe' });
+      fs.writeFileSync(path.join(repoDir, deliveryRel), 'plan v1\nstatus: Active\n');
+      fs.writeFileSync(path.join(repoDir, '.cleargate', 'wiki', 'foo.md'), 'wiki content v1\nmore\n');
+
+      const stateFile = writeState(stateDir, 'STORY-001-01');
+      const result = runValidateBounceReadiness(repoDir, stateFile, 'STORY-001-01');
+
+      assert.equal(
+        result.status,
+        1,
+        `expected exit 1 for non-wiki bookkeeping dirt, got ${result.status}\nstdout: ${result.stdout}`,
+      );
+      assert.ok(
+        result.stderr.includes('git working tree is dirty') && result.stderr.includes(deliveryRel),
+        `stderr does not name the dirty tree and the offending path: ${result.stderr}`,
+      );
+    } finally {
+      fs.rmSync(repoDir, { recursive: true, force: true });
+      fs.rmSync(stateDir, { recursive: true, force: true });
+    }
+  });
+
+  test('T7c (regression guard, already green): a page renamed out of .cleargate/wiki/ blocks (the -> new side decides)', () => {
+    const repoDir = initRepo();
+    const stateDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug103-vbr-state-'));
+    try {
+      // `.cleargate/wiki-archive/` shares the `.cleargate/wiki` prefix but is not the wiki.
+      fs.mkdirSync(path.join(repoDir, '.cleargate', 'wiki-archive'), { recursive: true });
+      execSync('git mv .cleargate/wiki/foo.md .cleargate/wiki-archive/foo.md', { cwd: repoDir, stdio: 'pipe' });
+      // Rename detection forced for this sanity read only; with status.renames=false the script
+      // sees D + A lines instead, and the A line (outside the wiki) still blocks.
+      const porcelain = execSync('git -c status.renames=true status --porcelain', { cwd: repoDir, encoding: 'utf8' });
+      assert.ok(
+        porcelain.startsWith('R  .cleargate/wiki/foo.md -> .cleargate/wiki-archive/foo.md'),
+        `fixture setup error: expected a staged rename line, got: ${porcelain}`,
+      );
+
+      const stateFile = writeState(stateDir, 'STORY-001-01');
+      const result = runValidateBounceReadiness(repoDir, stateFile, 'STORY-001-01');
+
+      assert.equal(
+        result.status,
+        1,
+        `expected exit 1 for a rename whose destination is outside .cleargate/wiki/, got ${result.status}\nstdout: ${result.stdout}`,
+      );
+      assert.ok(
+        result.stderr.includes('git working tree is dirty'),
+        `stderr does not name the dirty tree: ${result.stderr}`,
+      );
+    } finally {
+      fs.rmSync(repoDir, { recursive: true, force: true });
+      fs.rmSync(stateDir, { recursive: true, force: true });
+    }
+  });
 });
 
```
<!-- RESEAL-PATCH-END -->

## Developer brief (after the re-seal lands and TPV103-A1..A8 are appended)

**Repo order:** outer, then cli, then dist rebuild.
- The outer twin goes in `.worktrees/BUG-103` on `story/BUG-103`.
- The cli work goes in `<cw>` on `story/BUG-103`.

**Files to edit:**
1. `scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`: every §3 BUG-103 row verbatim, with these three wording changes:
   - TPV103-A2: the §C.11 example becomes a prose paragraph after the code block, with no new `#` line;
   - TPV103-A3: the CR-046 parenthetical names `run_script.sh bash …`;
   - TPV103-A4: the §C.9 lead says "the dispatch-hook paragraph below".
2. `scaffold/hosts/claude/.claude/skills/sprint-execution/dispatch-serial.md` §2 step 3 (the `:24` line).
3. `scaffold/hosts/claude/.claude/agents/architect.md:108`.
4. `scaffold/core/.cleargate/scripts/validate_bounce_readiness.mjs` `:86-104`, then a byte copy to the outer `.cleargate/scripts/validate_bounce_readiness.mjs`.
5. `npm run gen:codex`. This regenerates `scaffold/core/.agents/skills/sprint-execution/{SKILL.md,dispatch-serial.md}` and `scaffold/hosts/codex/.codex/agents/architect.toml`.
6. `CHANGELOG.md`: one `### Fixed` line.

**Do not touch:**
- `init_sprint.mjs` and `sprint init` parsing;
- `dispatch_serial.mjs` (BUG-102);
- `build-codex-payload.mjs` R4/R5 (BUG-101);
- `test/**` (QA-Red owns it; stop and route any test change);
- `init-fixture.ts` (its rows resolve once your bytes land).

**Pinned behaviours the tests enforce:**

*SKILL.md placement.* Each phrase lives in its own section; the test slices by heading:
- §A.1: "Five automated checks", and no "Six checks" or "all 6 preflight checks" anywhere in §A.1.
- §A.2: "Orchestrator bookkeeping is:", `chore(SPRINT-NN):` and "Never commit bookkeeping to \`main\`". The old "never committed to directly" sentence is removed, not kept beside the new one.
- §A.3: the code block reads `cleargate sprint init SPRINT-NN --stories …`. No `init_sprint.mjs SPRINT-NN` without `--stories` remains anywhere.
- §A.4:
  - the tiny-sprint Task block gains the "Also write <sprintDir>/plans/waves.json: …" line;
  - `:185` becomes the one-wave paragraph including 'a \`"stories"\` entry per story';
  - the verify blockquote reads "(any N)".
- §C.1: "\`.cleargate/wiki/**\` excluded".
- §C.2: the Reports paragraph after the provisioning paragraph (before `### C.3`), plus one Reports bullet inside each of §C.3, §C.4, §C.5 and §C.6. Put the bullet in the dispatch-input list, before the next `###` heading.
- CR-046: all four lines rewritten. No `run_script.sh <cmd>` remains.
- §C.11 Script Invocation Contract: the example plus "never a bare script name".
- §C.9 lead: the serial-host sentence.

*SKILL.md guards.*
- **Add no line that starts with `#`** anywhere in SKILL.md, fenced comments included. `skill-md-serial-pointers` Test 21 counts them as headings.
- Add no heading.
- New text must avoid every `CODEX_SKILL_BANNED` token (`build-codex-payload.mjs:264-276`); the renderer throws on survivors. `SKIP_SURFACE_GATE=1` and "parallel: false" are fine. Never write `SKIP_FLASHCARD_GATE=1`, `C.0.1`/`C.0.2` or `launch_wave`.
- Keep §A.4 free of banned tokens and keep `real-collision predicate`, `exports_provided`, `exports_consumed` and `schema_version: 2` there (contract-first-dag-text T3b/T3c).

*`validate_bounce_readiness.mjs`:*
- Split `git status --porcelain` on `\n` without trimming the whole output first. The first line can start with a space (` M …`), and T6 fails otherwise.
- For each non-empty line, the path is `line.slice(3)`. For a rename, use the text after ` -> `. Stripping a leading `"` from quoted paths is harmless.
- A line is excluded only when that path starts with `.cleargate/wiki/`, trailing slash included. `.cleargate/wiki-archive/…` is dirt (T7c).
- Every other line stays dirty: untracked files, other `.cleargate/**` bookkeeping (T7b) and anything outside `.cleargate/`.
- On dirt, exit 1 with the unchanged prefix `Error: git working tree is dirty. Uncommitted changes:` followed by the remaining lines (T7b looks for the offending path).
- The success message is unchanged (`Bounce readiness check passed for …`).
- Update the header comment's check (d).

*Codex render.* Run `npm run gen:codex` after the last canonical edit. `npm run prebuild` runs `--check` and fails on a stale render.

**Verification (rule 12, rule 16):**
1. `npm run typecheck`.
2. `npm run test:file -- test/scaffold/sprint-execution-skill-drift.red.node.test.ts` → 22/22.
3. `test/scaffold/skill-md-serial-pointers.red.node.test.ts` → 3/3.
4. The six named witnesses → 51/51.
5. The M2 pair with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (compare-only; never capture) → 20/20.
6. `node scripts/build-codex-payload.mjs --check` → 0.
7. After the outer twin copy: every file from `command grep -rl CLEARGATE_META_ROOT test` with `CLEARGATE_META_ROOT=<ow>`.

Expected reds:
- `sprint-execution-mirror.integration` "diff command on live vs canonical" stays red until RS-M7b.
- `foreign-repo.integration` Scenarios 1/2 are red at the seal too; they are not BUG-103's.

**D4:** +22 default-tier tests at this item's merge (TPV103-A1).

## Amendments to append to M7.md

```markdown
## Amendments from TPV (BUG-103, 2026-09-27; role: architect; append-only)

- **TPV103-A1 (§2.3 D4).** BUG-103 is **+22** default-tier tests, not +7. `sprint-execution-skill-drift.red` has 7 scenarios but 22 node:test leaves after the TPV re-seal: 20 sealed, plus T7b and T7c. `skill-md-serial-pointers.red` stays at 3 (Test 20 re-scoped). `init-fixture.ts` registers none. Measured: the prototype plus the re-seal on `833b6a4` (base `f0c33f7`) runs 3591 = 3569 + 22 default-tier tests, with 2 skips. Running totals use QA-Red's recorded counts: BUG-100 +8 per `reports/BUG-100-qa-red.md`; the rest as planned. Each item's own TPV may still amend its row. Skips stay 2.
  - STORY-058-13: 3653 / 3651 (actual)
  - BUG-101: 3659 / 3657
  - BUG-100: 3667 / 3665
  - BUG-047: 3672 / 3670
  - BUG-103: 3694 / 3692
  - BUG-102: 3699 / 3697
  - BUG-105: 3706 / 3704
  - BUG-104: 3712 / 3710
  - BUG-106: 3715 / 3713
- **TPV103-A2 (§3 BUG-103, §C.11 row).** Replace "add the example line `# e.g. …`" with: after the code block, add the paragraph `For example: \`bash .cleargate/scripts/run_script.sh node .cleargate/scripts/dispatch_serial.mjs next --sprint SPRINT-NN --wave wave1\`. \`<command>\` is the full command line — interpreter and script path — never a bare script name (\`run_script.sh dispatch_serial.mjs …\` exits 127).` Reason: sealed `skill-md-serial-pointers.red` Test 21 counts every `^#{1,6} ` line as a heading, fenced comments included, so a new `# e.g.` line turns that anchor red. No BUG-103 edit adds a line starting with `#`.
- **TPV103-A3 (§3 BUG-103, CR-046 row).** The parenthetical "(or \`bash .cleargate/scripts/<script>.sh\`)" becomes "(or \`bash .cleargate/scripts/run_script.sh bash .cleargate/scripts/<script>.sh [args...]\` for a shell script)". Reason: as pinned, it reads as an unwrapped direct invocation, which the next sentence forbids. That is the literal-reading defect class BUG-103 fixes; `run_script.sh:9-12` documents the wrapped `bash` form.
- **TPV103-A4 (§3 BUG-103, §C.9 lead row).** "(see that host's rendering of the next paragraph)" becomes "(see that host's rendering of the dispatch-hook paragraph below)". Reason: the paragraph after the lead is "For each card:"; the hook paragraph (A4 anchor; R4 on Codex) follows the table and the marker block. T4's pinned phrase is unaffected.
- **TPV103-A5 (§3 BUG-103, Regression witnesses).** Add `test/scaffold/skill-md-serial-pointers.red.node.test.ts` (3/3). Its Test 20 compared canonical SKILL.md with the pre-058-12 fixture plus exactly P1 and P2, so every BUG-103 edit turned it red. The TPV re-seal re-scopes it to: P1 and P2 each once, verbatim, one blank line after their anchor, with the fixture hash still pinned and the count unchanged. Test 21 (heading sequence vs the fixture) is unchanged and binding. `foreign-repo.integration` Scenarios 1/2 are red at the seal as well (`.install-manifest.json cleargate_version field`); they are not BUG-103's.
- **TPV103-A6 (§3 BUG-103, Tests row).** The re-sealed tests pin each passage inside its own section:
  - T1: §A.3 (and no `init_sprint.mjs SPRINT-NN` without `--stories`), §A.1 (no six-check count left), every CR-046 line (no `run_script.sh <cmd>` left) and §C.11.
  - T2: §A.2, including "Never commit bookkeeping to \`main\`" and with the old rule removed, plus §C.1's wiki exclusion.
  - T3: §C.2–§C.6 and the step-3 line.
  - T5: §A.4's `"stories"` entry, the Task line and "(any N)".
  - T7b: non-wiki bookkeeping dirt next to wiki churn blocks, and stderr names the path.
  - T7c: a staged rename out of `.cleargate/wiki/` (to `.cleargate/wiki-archive/`) blocks.

  T4 asserts the lead sentence in both renders only. "…and the Codex render contains `**Per-dispatch gate.**`" is struck from BUG-103: BUG-101's Test 31 is its sole owner (OD-M7-3), and BUG-103's branch has no R4. The filter must not trim the whole porcelain output before splitting.
- **TPV103-A7 (§5 / rule 21, BUG-103 INTEGRATE).** `init-fixture.ts`: BUG-101 (sentinel helper, ~L498–516) and BUG-103 (the delta array, ~L669–760) auto-merge. This was proven by comparing each side's `-U0` delta streams with `cmp` in both directions on cli `main` `0e5b0ac`. A simulated BUG-101 R4/R5 regeneration and BUG-103's canonical edits also auto-merge in the generated Codex render, and `--check` passes. Rule:
  1. take the union of rows and refusal branches (never drop one, never add a second row per `rel`);
  2. never hand-merge generated files: run `npm run gen:codex`, then `--check`;
  3. then run the M2 pair with the compare-only baseline;
  4. a textual conflict goes to QA-Red.
- **TPV103-A8 (§8.3 follow-up).** FU-11: `skill-md-serial-pointers` Test 21 counts fenced `# ` comment lines as headings. A future SKILL.md edit that needs a fenced comment must re-scope Test 21 to ignore fenced lines. Owner: whichever item next needs one; not M7.
```

## Script Incidents

None. `run_script.sh` was not invoked. Everything ran in the scratch clones, with `npm run`, `npx tsx --test`, `git` and `node` called directly. All three probes against real trees were read-only:
- `git apply --check` on `<cw>`;
- `shasum` of the M2 baseline copy;
- `git show` on the cli branches.

Scratch dir `/private/tmp/cg-s41-tpv103-20260927T085537` was deleted by exact path at the end. `<cw>`, the main checkouts and `/private/tmp/cg-s41-m2-init-baseline` were not written. There are no commits. No codex binary was run, and `~/.codex` and every CODEX_HOME were left alone.

```yaml
flashcards_flagged:
  - "2026-09-27 · #tpv #skill #test-harness · skill-md-serial-pointers Test 20 froze all of SKILL.md (fixture+P1+P2); any later SKILL edit reds it. Re-scope it."
  - "2026-09-27 · #skill #test-harness · skill-md-serial-pointers Test 21 counts fenced '# ' comments as headings; a SKILL.md edit must add no line starting '#'."
  - "2026-09-27 · #tpv #bounce · Wiki-passes + src-blocks cases let 'ignore all of .cleargate/' survive; add non-wiki .cleargate dirt + a rename out."
  - "2026-09-27 · #tpv #test-harness · git porcelain line 1 can start with a space (' M x'); trimming the whole output before slice(3) corrupts the first path."
```
