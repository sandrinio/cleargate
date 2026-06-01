# Architect Post-Flight Review: STORY-043-04

role: architect

Mode: POST-FLIGHT (cross-repo, read-only). Reviewed cleargate-cli branch `story/STORY-043-04`
(commits e8a1210 impl + 86f1ea5 count-guard, on top of d1e02bf QA-Red) and the outer-repo
uncommitted working tree (`readiness-gates.md` + canonical mirror).

ARCH-POSTFLIGHT: FAIL

## Summary

Type registration (work-item-type.ts) is correct and complete. The **gate block is
structurally mis-wired**: its `section(N)` indices are off-by-one against the hotfix
template because the evaluator is positional and the hotfix template carries a
`## 0.5 Open Questions` section ahead of `## 1`. Net effect: a fully-populated, valid
hotfix file FAILS the gate (on `verification-steps-nonempty`), and the two "passing"
criteria pass against the wrong sections. The gate does not gate the signals §3.2 promised.

## ISSUES

### [BLOCKER] G1 — Gate-block section indices are off-by-one vs the hotfix template

`evalSection` (readiness-predicates.ts:540-550) splits the body on `^(?=## )` and resolves
sections **positionally** — it does NOT parse the `0.5`/`1`/`2` numeric heading prefixes
(`headingTitleOf` is used only by body-contains / existing-surfaces, not by evalSection).
The hotfix template's H2 order is:

| positional § (hasPreamble=true) | heading |
|---|---|
| section(1) | `## 0.5 Open Questions` |
| section(2) | `## 1. Anomaly` |
| section(3) | `## 2. Files Touched` |
| section(4) | `## 3. Verification Steps` |

So the gate criteria resolve one section too low:

| Criterion (intends) | Actually inspects | Effect |
|---|---|---|
| `anomaly-populated` = `section(1) ≥1 listed-item` (intends §1 Anomaly) | `## 0.5 Open Questions` | Passes on Open-Questions bullets; an **empty Anomaly is NOT caught**. |
| `files-touched-declared` = `section(2) ≥1 declared-item` (intends §2 Files Touched) | `## 1. Anomaly` | Passes on Anomaly's `**Expected/Actual**` def-list terms; an **empty Files Touched is NOT caught**. |
| `verification-steps-nonempty` = `section(3) ≥1 unchecked-checkbox` (intends §3 Verification) | `## 2. Files Touched` | Files Touched has no `- [ ]` → **FAILS on every valid hotfix**; the real §3 Verification (positional section 4) is never inspected. |

End-to-end smoke through the live `evaluate()` on a realistic authored hotfix file
(severity P1, all sections filled, three `- [ ]` verification steps):

```
PASS  anomaly-populated            | section 1 has 3 listed-item (≥1 required)   [WRONG section — Open Questions]
PASS  files-touched-declared       | section 2 has 2 declared-item (≥1 required) [WRONG section — Anomaly]
FAIL  verification-steps-nonempty  | section 3 has 0 unchecked-checkbox (≥1 req)  [WRONG section — Files Touched]
PASS  severity-set                 | frontmatter(.).severity != "null" → "P1"
PASS  no-tbds                      | no 'TBD' markers found in body
GATE RESULT (enforcing): FAIL
```

A valid hotfix fails the gate. This defeats the story goal ("returns a meaningful pass/fail
against hotfix-specific criteria") — the gate now blocks correct hotfixes and rubber-stamps
empty Anomaly/Files-Touched sections.

**Root cause of the slip:** §3.2 said "Mirror the bug block's shape." The bug template's
first H2 is `## 1. The Anomaly` (no `## 0.5`), so bug's `section(2)` correctly hits `## 2`.
The hotfix template's extra `## 0.5 Open Questions` (Bug.md:76 vs hotfix.md:68) shifts all
indices by one — the 1:1 `section(N)→§N` assumption copied from the bug block does not hold
for hotfix. Neither the story author, Dev, nor QA smoked section resolution against the
actual template; QA verified vocabulary + YAML shape only (qa.md:41-43).

**Fix options (Architect recommendation — NOT applied; read-only review):**
- Option A (smallest, recommended): bump the three section indices to account for the
  `## 0.5` offset → `section(2)` anomaly, `section(3)` files-touched, `section(4)`
  verification-steps. Pure data edit in both `readiness-gates.md` copies; no code change.
- Option B: drop `## 0.5 Open Questions` from the hotfix template so it matches the bug
  template's clean 1:1 layout. Wider blast radius (touches template + brief extraction
  contract at hotfix.md:19); not recommended for a gate-registration story.

Either fix must re-run the end-to-end smoke above and keep both readiness-gates.md copies
byte-identical.

## Checks that PASSED

1. **Registration completeness + consistency — PASS.**
   - `'hotfix'` in `WorkItemType` union (work-item-type.ts:8). PASS.
   - `FM_KEY_MAP` `{ key: 'hotfix_id', type: 'hotfix' }` (line ~22). PASS.
   - `PREFIX_MAP` `{ prefix: 'HOTFIX-', type: 'hotfix' }` (line ~36). PASS.
   - `WORK_ITEM_TRANSITIONS.hotfix === ['ready-for-merge']` (line ~83). PASS.
   - `hotfix_id` is unique to the hotfix template; no FM_KEY_MAP detection-order collision. PASS.
   - Count guard tightened to exact `assert.strictEqual(keys.length, 8)` (86f1ea5) + test
     renamed to "8 entries total post-STORY-043-04". PASS (QA follow-up correctly applied).
   - Transition name `ready-for-merge` matches the hotfix template's Ambiguity Gate header
     "Requirements to pass to Green (Ready for Merge)" (hotfix.md:107). PASS.

2. **Gate-block predicate vocabulary — PASS (parses), FAIL (wiring) — see G1.**
   All 5 criteria parse against `parsePredicate`: `section(...)` (lines 80-81),
   `frontmatter(.).severity != null` (lines 44-45; `compareValues` null-branch 256-258),
   `body does not contain marker 'TBD'` (line 58, TBD allowed). No `<=` op used (correctly
   out of scope). Parse-validity PASS; **section-index targeting FAIL (G1)**.

3. **Mirror discipline — PASS.** `.cleargate/knowledge/readiness-gates.md` and
   `cleargate-planning/.cleargate/knowledge/readiness-gates.md` working-tree diffs are
   byte-identical (same hunk, same blob → both index cd758855..acbda478).

4. **Cross-repo coupling — PARTIAL.** Transition name in the gate block (`ready-for-merge`)
   matches `WORK_ITEM_TRANSITIONS.hotfix` exactly. The evaluator WILL find the `hotfix` block
   post-dist-rebuild. But it will evaluate the wrong sections (G1), so the coupling is
   "consistent but incorrect."

5. **≤2-file cap decision — PASS.** Recorded in §3.2/§1.3 as a DevOps-merge / review-time
   check, NOT a machine gate. No `<=` predicate op was added; `readiness-predicates.ts` is
   unchanged on the branch. Correct.

6. **Scope — PASS.** cleargate-cli diff = `src/lib/work-item-type.ts` + the two test files
   only (plus an auto-generated `_off-sprint/.script-incidents/*.json` artifact — harness
   noise, not source). Outer diff (in-scope to this story) = `readiness-gates.md` +
   canonical mirror only. No stray production files. (Outer working tree also carries
   unrelated SPRINT-33 run artifacts: state.json, token-ledger, MANIFEST.json, dispatch +
   report files — orchestration noise, not part of this story's deliverable.)

## GATE4_NOTES

Do NOT proceed to Gate-4 / merge until G1 is fixed. After the fix + dist rebuild
(`npm --prefix cleargate-cli run build`), run this smoke and require GATE RESULT = PASS on a
fully-populated hotfix AND a targeted FAIL on a hotfix with an EMPTY §3 Verification Steps
(to prove the criterion now actually gates §3):

```
node cleargate-cli/dist/cli.js gate check <authored HOTFIX-NNN-*.md>
# expect: 5/5 pass on a complete file; verification-steps-nonempty FAIL when §3 is empty.
```

Re-confirm both `readiness-gates.md` copies stay byte-identical after the index edit.

## flashcards_flagged

- "2026-06-01 · #gates #predicate #section · evalSection is POSITIONAL not numeric — a `## 0.5` (or any pre-§1) heading shifts section(N) by one; verify gate indices against the template's actual H2 ORDER, not its printed numbers."
- "2026-06-01 · #gates #review · Post-flight a new gate block by running evaluate() end-to-end on a filled template file (pass) AND an empty-section file (targeted fail) — vocabulary-parse + YAML-shape checks miss section-targeting bugs."

---

# RE-VERIFY (2026-06-01) — post-fix confirmation

role: architect

Mode: POST-FLIGHT RE-VERIFY (read-only). Re-ran the same end-to-end `evaluate()` smoke that
caught G1, against the fixed gate block.

ARCH-POSTFLIGHT: FAIL

## G1 is FIXED — confirmed

The three section indices were corrected (note: the entire `work_item_type: hotfix` block is
a fresh `+` addition in the working tree — it lands with the correct indices, not a literal
+1 edit of prior lines). Live `evaluate()` smoke through `readiness-predicates.ts:evaluate`:

**Fixture 1 — fully-populated hotfix (H1 preamble + §0.5/§1/§2/§3/§4, plain `- [ ]` steps, severity P1, approved, no TBDs):**
```
PASS  anomaly-populated            section 2 has 1 listed-item (≥1 required)
PASS  files-touched-declared       section 3 has 2 declared-item (≥1 required)
PASS  verification-steps-nonempty  section 4 has 3 unchecked-checkbox (≥1 required)
PASS  severity-set                 frontmatter(.).severity != "null" → "P1"
PASS  no-tbds                      no 'TBD' markers found in body
=> ALL 5 PASS: true
```
Target resolution confirmed (hasPreamble=true): `section(2)→"## 1. Anomaly"`,
`section(3)→"## 2. Files Touched"`, `section(4)→"## 3. Verification Steps"`. Correct targets.

**Fixture 2 — §3 Verification emptied:** `verification-steps-nonempty` → **FAIL** (`section 4 has
0 unchecked-checkbox`), while anomaly-populated + files-touched still PASS. Proves the criterion
now genuinely gates §3.

**Mirror discipline:** main + canonical `readiness-gates.md` are byte-identical (md5
`d95363c52c7162fd168d0179435f3c0d` on both; `diff` clean).

**Scope:** working-tree diff = ONLY the hotfix yaml block in the two `.cleargate/knowledge/`
copies. No other criteria/blocks changed. `hotfix.md` NOT edited (no diff, no status entry) —
confirmed; Open-Questions→H3 demotion is the logged follow-up, correctly deferred.

## NEW BLOCKER — G2: collateral yaml-block-count guard not bumped (8→9)

Adding the hotfix block as the 9th `yaml` fence in `readiness-gates.md` broke an unrelated,
pre-existing guard that this story's commits never touched:

`cleargate-cli/test/commands/gate-unit.node.test.ts:748`
```
assert.strictEqual((blocks).length, 8);   // ← now 9 blocks in readiness-gates.md
```
Run result (`node --import tsx/esm --test test/commands/gate-unit.node.test.ts`): **24 pass, 1
FAIL** —
```
✖ readiness-gates.md parses all gate blocks with no errors
    9 !== 8   (gate-unit.node.test.ts:748)
```
The test reads `REAL_GATES_PATH = <meta-repo>/.cleargate/knowledge/readiness-gates.md`
(`GATE_TEST_REPO_ROOT` resolves 3 levels up from `test/commands/` = the live meta-repo), so it
counts the live fixed file. This is **distinct** from the `WORK_ITEM_TRANSITIONS` ==8 guard the
dispatch referenced (that one is correct — 8 work-item TYPES). This is a second, separate
block-COUNT guard keyed to the number of yaml gate blocks. It must be bumped to `9` with a
title update ("…CR-030 adds initiative=8th, STORY-043-04 adds hotfix=9th").

Because `readiness-gates.md` is a file this story modified, this failure is in-scope collateral —
the story's own test surface is red. Cannot merge with a failing test.

**Secondary gap (not a merge-blocker by itself, but the reason G1 ever shipped):** there is
still NO regression test asserting the hotfix gate criteria target the right sections. Grep for
`anomaly-populated|verification-steps-nonempty|files-touched-declared` across `test/` = zero
hits. The off-by-one was invisible to CI both before and after the fix. Recommend adding a
fixture-driven test (filled hotfix → 5/5 pass; empty-§3 hotfix → verification-steps-nonempty
fail) so this can never silently regress again.

## ISSUES
- [RESOLVED] G1 — section indices off-by-one. Fixed; ALL 5 criteria pass on a valid hotfix,
  verification-steps-nonempty correctly fails on empty §3. Verified end-to-end.
- [BLOCKER] G2 — `gate-unit.node.test.ts:748` yaml-block-count guard still asserts 8; live file
  now has 9 blocks → test fails (9 !== 8). Bump to 9 + update test title.
- [GAP] No regression test for hotfix gate-criteria section targeting (zero coverage). Add one.

## GATE4_NOTES
Dist-rebuild smoke at Gate-4: after `npm --prefix cleargate-cli run build` (rebuilds dist) and
`npm --prefix cleargate-cli run prebuild` (re-mirrors canonical → `templates/cleargate-planning/`,
overwriting the currently-stale cli-template + dist copies of `readiness-gates.md` — they carry
old/absent indices but are auto-reconciled from canonical, not in-scope to hand-edit), run:
```
node --import tsx/esm --test cleargate-cli/test/commands/gate-unit.node.test.ts   # must be 25/25 after G2 fix
node cleargate-cli/dist/cli.js gate check <authored HOTFIX-NNN-*.md>              # 5/5 on complete; v-steps FAIL on empty §3
```
Runtime loader (`gate.ts:187`) reads `<projectRoot>/.cleargate/knowledge/readiness-gates.md` —
the fixed copy — so the live gate fires correctly today; the cli-template/dist staleness is a
prebuild concern only, not a runtime correctness issue.

## flashcards_flagged
- "2026-06-01 · #gates #test · readiness-gates.md has TWO independent count guards: WORK_ITEM_TRANSITIONS keys (==8 types) AND gate-unit.node.test.ts yaml-block count (==N blocks); adding any new gate block bumps the SECOND, not the first."

---

# FINAL-CONFIRM (2026-06-01) — post-G2-fix, third-collateral sweep

role: architect

Mode: POST-FLIGHT FINAL CONFIRM (read-only). Independently re-ran the gate suites at
cleargate-cli HEAD `ec126e2` (d1e02bf red + e8a1210 impl + 86f1ea5 ==8-types guard +
ec126e2 G2 block-count 8→9). Did NOT trust the Dev "no other collateral" report.

ARCH-POSTFLIGHT: FAIL

## G2 — CLEARED (confirmed independently)
`npx tsx --test test/commands/gate-unit.node.test.ts` → **25/25, 0 fail**. The block-count
assertion at :748 now reads `assert.strictEqual((blocks).length, 9)` and the test title was
updated to "…CR-030 adds initiative=8th, STORY-043-04 adds hotfix=9th". ec126e2 scope is tight:
1 file, 3 lines (`git show --stat ec126e2`). Correct, minimal fix.

## G3 — NEW THIRD COLLATERAL (BLOCKER) — a SECOND, un-bumped yaml-block-count guard
`cleargate-cli/test/lib/readiness-predicates.node.test.ts:714`
```
assert.strictEqual((yamlBlocks).length, 8);   // ← live readiness-gates.md now has 9 yaml fences
```
`npx tsx --test test/lib/readiness-predicates.node.test.ts` → **FAIL**:
```
✖ js-yaml parse of readiness-gates.md returns 7 blocks (6 original + sprint gate added by CR-027)
    9 !== 8   (readiness-predicates.node.test.ts:714)
```
`SMOKE_REPO_ROOT` (line 547) = `path.resolve(dirname(import.meta.url), '..','..','..')` =
`test/lib/` → `cleargate-cli/` → **meta-repo root**, so the test reads the LIVE
`.cleargate/knowledge/readiness-gates.md` (verified: `grep -c '```yaml'` = 9). This is a
DUPLICATE of the G2 guard in a different file. ec126e2 patched ONLY `gate-unit.node.test.ts:748`;
this twin guard was left at 8. Same root cause as G2, different file — the Dev report ("no other
collateral") missed the duplicate.

In-scope: the story modifies `readiness-gates.md`; this test reads that file → the story's own
test surface is red. **Cannot merge.**

**Fix (must apply before merge):** at `readiness-predicates.node.test.ts:714` bump `8`→`9`; also
update the now-stale block descriptions to name hotfix as the 9th block:
- line 699 test title: "…returns 7 blocks…" is already historically stale; at minimum amend the
  comment at line 713 ("CR-027 added sprint…7th; CR-030 adds initiative…8th") to append
  "; STORY-043-04 adds hotfix=9th".
- line 714: `assert.strictEqual((yamlBlocks).length, 9);`
This is a pure test-data edit (no production change). Re-run the suite → expect 0 fail.

## Exhaustive count-guard sweep (proves no FOURTH collateral)
`grep -rnE "yamlBlocks|\`\`\`yaml|gate.?block" test/ | grep -iE "length|strictEqual|toHaveLength"`
plus a sweep for `strictEqual(.., 8|9)` / `toHaveLength(8|9)`:
| Site | Verdict |
|---|---|
| `readiness-predicates.node.test.ts:714` | **G3 — FAILS (9!=8). Must fix.** |
| `gate-unit.node.test.ts:748` | Fixed by ec126e2 → 9. PASS. |
| `work-item-type.node.test.ts:184` (`keys.length, 8`) | WORK_ITEM_TRANSITIONS ==8 **TYPES** guard (hotfix=8th type, 86f1ea5). Correct; suite 15/15. Not block-count. |
| `sha256.node.test.ts:195` `toHaveLength(8)` | short-hash length. Unrelated. |
| `join.node.test.ts:507/870` exitCode 8/9 | CLI exit codes. Unrelated. |
| `sprint-init-decomp-gate.node.test.ts:170` | boolean `shouldBlock`. Unrelated. |
No KNOWN_TYPES / RESERVED_PAYLOAD_KEYS enumeration in cli enumerates work-item types
(RESERVED_PAYLOAD_KEYS = payload keys, not types). No snapshot fixture of readiness-gates.md in
test/ beyond the two smoke tests above (both are live-file readers, both now covered). **G3 is the
only remaining collateral.**

## G1 — STILL HOLDS (re-affirmed)
Live `readiness-gates.md` hotfix block: `section(2)`=anomaly-populated, `section(3)`=files-touched,
`section(4)`=verification-steps — correct for the §0.5-offset template (RE-VERIFY 5/5 + empty-§3
targeted FAIL stands; readiness-gates.md unchanged since that run — md5 `d95363c5…`). Mirrors
byte-identical: main + canonical both md5 `d95363c52c7162fd168d0179435f3c0d`, `diff` clean.

## Scope — clean
Only change since the G2 FAIL is ec126e2 (the :748 bump, 1 file / 3 lines). No scope creep. No
production-code edits on the branch beyond e8a1210's `work-item-type.ts`.

## GATE4_NOTES (restated, + G3 addendum)
After the G3 fix + dist rebuild, run at Gate-4:
```
npm --prefix cleargate-cli run build          # rebuild dist
npm --prefix cleargate-cli run prebuild       # re-mirror canonical → templates/ (overwrites stale cli-template + dist copies of readiness-gates.md; auto-reconciled, not hand-edited)
npx tsx --test cleargate-cli/test/commands/gate-unit.node.test.ts        # 25/25
npx tsx --test cleargate-cli/test/lib/readiness-predicates.node.test.ts  # 0 fail (G3 must be fixed first)
node cleargate-cli/dist/cli.js gate check <authored HOTFIX-NNN-*.md>     # 5/5 on complete file; verification-steps-nonempty FAIL on empty §3
```
Re-confirm both `readiness-gates.md` copies stay byte-identical (md5) after any edit. Runtime loader
(`gate.ts:187`) reads `<projectRoot>/.cleargate/knowledge/readiness-gates.md` (the fixed copy) →
live gate fires correctly today; cli-template/dist staleness is a prebuild concern only.

## flashcards_flagged
- "2026-06-01 · #gates #test #regression · readiness-gates.md block count is guarded in TWO files (gate-unit.node.test.ts AND readiness-predicates.node.test.ts) — both read the LIVE meta-repo file via repo-root resolution; adding a gate block must bump BOTH or the second goes red. Grep ALL test/ for the count, not just the first hit."

---

# FINAL-CONFIRM-2 (post-G3, independent)

role: architect

Mode: POST-FLIGHT FINAL CONFIRM. Independently re-verified the full story after G1/G2/G3
fixes — did NOT trust the Dev grep-sweep. State: d1e02bf + e8a1210 + 86f1ea5 + ec126e2 (G2)
+ ade083b (G3) on `story/STORY-043-04`; outer + canonical `readiness-gates.md` hotfix block
UNCOMMITTED and byte-identical.

ARCH-POSTFLIGHT: PASS
ISSUES: none (no G4)

## 1. Suite re-runs (from cleargate-cli/, fresh)
- `test/lib/readiness-predicates.node.test.ts` → **102 pass / 0 fail** (22 suites). Matches expected 102/102.
- `test/commands/gate-unit.node.test.ts` → **25 pass / 0 fail** (12 suites). Matches expected 25/25.
- `test/lib/work-item-type.node.test.ts` + `test/lib/work-item-type-hotfix.red.node.test.ts` → **21 pass / 0 fail** (combined). Green.

## 2. Independent G4 sweep — NO G4
Swept ALL of test/ for hardcoded counts / type enumerations / KNOWN_TYPES lists /
transition enumerations / readiness-gates.md block-count guards. Every live-file count guard
accounted for; every other hit verified correct/unrelated:
- **readiness-predicates.node.test.ts:714** — `yamlBlocks.length === 9` — G3 fix applied. Reads LIVE meta-repo file. ✓
- **gate-unit.node.test.ts:748** — `blocks.length === 9` — G2 fix applied. Reads LIVE meta-repo file. ✓
- **work-item-type.node.test.ts:184** — `WORK_ITEM_TRANSITIONS keys.length === 8` — 86f1ea5 guard; suite green at 8. ✓ (This is the FIRST guard from the flashcard; the block-count is the SECOND — both correctly bumped.)
- **gate-unit.node.test.ts:142 GATES_DOC ("6 gate blocks")** — test-LOCAL inline fixture, NOT the live file. Adding a 9th live block does not touch it. Not a G4.
- **gate-unit.node.test.ts:212 `severity-set`** — inside the same test-local fixture region, not the live block. Not a G4.
- **hotfix-new.node.test.ts / template-stubs / close-sprint REPORT fixtures / token-ledger snapshots / lifecycle-reconcile / parent-rollup** — all reference the *hotfix command/template/ledger* (STORY-022-06 lineage) or the HOTFIX- ID regex, none enumerate the work-item-TYPE count or the gate-block count. Unrelated. Not G4s.
- No snapshot fixture hardcodes the readiness-gates.md block sequence (only the two `blockRe` count guards exist, both updated).

## 3. G1 re-affirm (gate wiring) + registration intact
- `evalSection` (readiness-predicates.ts:540-549): positional, 1-indexed, preamble-aware. Hotfix template body HAS a preamble → `arrayIndex = parsed.index`.
- Hotfix template `## ` headings (outer == canonical, byte-identical): (1)`## 0.5 Open Questions` (2)`## 1. Anomaly` (3)`## 2. Files Touched` (4)`## 3. Verification Steps` (5)`## 4. Rollback`.
- Gate block predicates resolve: `anomaly-populated section(2)`→`## 1. Anomaly` ✓; `files-touched-declared section(3)`→`## 2. Files Touched` ✓; `verification-steps-nonempty section(4)`→`## 3. Verification Steps` ✓. The +1 offset (Open Questions occupying §1) is correctly absorbed. G1 mapping correct.
- Registration (work-item-type.ts): union (8 types incl `hotfix`); FM_KEY_MAP `hotfix_id→hotfix`; PREFIX_MAP `HOTFIX-→hotfix`; `WORK_ITEM_TRANSITIONS.hotfix === ['ready-for-merge']`; keys.length === 8. All intact.
- `readiness-gates.md`: outer == canonical, byte-identical (`diff` clean). `hotfix.md` template: outer == canonical, byte-identical.

## 4. Scope
Only ade083b since last FAIL (single file `readiness-predicates.node.test.ts`, +3/-3: the
8→9 block-count guard + the stale "7 blocks"→"9 blocks" test-label tidy in the same file).
`git diff e8a1210..ade083b` touches ONLY test files (3), zero `src/` changes after the impl
commit. No production change, no creep.

GATE4_NOTES: Built fresh `dist/cli.js` from current branch (build OK, hotfix refs present in
bundle). Live `gate check HF.md --transition ready-for-merge -v` against a properly-populated
hotfix fixture → `✅ hotfix.ready-for-merge passed (5 criteria)`, exit 0. (An earlier partial-
fixture run showed anomaly/verification fails — traced to the PostToolUse formatter stripping
`- [ ]` checkbox markers + bold-prose-not-bullets in the fixture; pure fixture-content
artifacts, NOT wiring. The clean fixture passes all 5.) For close: dist/cli-template payload
will pick up the type registration on next `npm run prebuild` — that is a release-time mirror
concern, not a merge blocker; the LIVE meta-repo gate resolves the on-disk readiness-gates.md
(repo-root path) so the gate fires correctly today.

## flashcards_flagged
- Re-affirmed the existing card: "2026-06-01 · #gates #test · readiness-gates.md has TWO independent count guards (WORK_ITEM_TRANSITIONS keys ==8 + yaml-block count ==9) — adding a gate block bumps the SECOND not the first; both must be updated." (already logged; no new card needed — the two-guard lesson is captured and proven correct by this confirm.)

VERDICT: Story is clean and mergeable. This story merges next.
