# BUG-090 — Architect TPV (live), on QA-Red `dbdcfc8`

role: architect

```
TPV: REJECTED — re-seal required (tests only)
RESEAL_PATCH: reports/BUG-090-tpv-reseal.patch
RESEAL_SHA256: 28d4f07c6da5e2fe84332bb3fd14076c55ab3a33f0e0c2970652d1af22f51b27
NEW_COUNTS: default tier 48 (40 red / 8 anchors) + integration 2 red; M2 parity pair 5 + 15 red
AFTER_RESEAL: APPROVED for the Developer (every red satisfiable, every anchor green, parity 5/5 + 15/15)
```

## Verdict

**REJECTED.** Every sealed red fails for the right reason, and every red is satisfiable. A plan-conformant simulation turns all of them green, keeps all 8 anchors green, and brings the M2 parity pair to 5/5 and 15/15.

The rejection is about coverage. Mutant sampling found 19 survivors in 55 mutants, and 13 of them are real:

- **The parity table is the only thing that enforces the JS port contract that BUG-098 builds on (C4).** Seven framing rules that plan (a) pins explicitly have no fixture:
  - the exact-line `<instructions>` opener and closer;
  - the fence closer's char and its length;
  - fence indentation;
  - a `--- ` closer with trailing space;
  - instructions-before-fence precedence;
  - a BOM that is stripped on line 0 only.
- **One C4 frozen export is unpinned.** `assertWorkItemApproved` is exercised only through a spawn.
- **The plan's "on a throw, approved = false" rule is unpinned.** The offset-0 regex approves a `----`-closed block today.
- **Three close_sprint whole-file-scan mutants survive,** because no fixture preamble holds a column-0 key.

The re-seal adds 10 tests and strengthens 3 fixtures. It touches no src, scaffold, script or template file. It kills all 13 real survivors plus 2 new closer mutants.

## Subject and setup

- **cli:** `story/BUG-090` @ `dbdcfc8`, parent C1 `d0f0d95`. Worktree `.worktrees/BUG-090/cleargate-cli`, read-only for this dispatch.
- **Scratch root:** `/private/tmp/cg-s41-tpv-bug090`.
  - `outer/` is a `git archive` of outer `story/BUG-090` = `0b97950d`.
  - `outer/cleargate-cli` is a clone of the worktree at `dbdcfc8`. Its `node_modules` is a symlink to the shared cli `node_modules`. `prebuild` ran in the clone, and `build` ran in the clone only, for the dist-spawning anchors.
  - `redcheck/` is a second clone at `dbdcfc8`, used for the patch-apply and red-reason proof.
- The scratch root was deleted at the end. No `npm install` was run, and no bare `cleargate` was run. The M2 baseline was compare-only.

## 1. Reproduced counts (solo, `npm run test:file --`, at `dbdcfc8`)

| File | Tests | Red | Anchor | Right reason (observed) |
|---|---|---|---|---|
| `test/scripts/frontmatter-fence-parity.red.node.test.ts` | 13 | 13 | 0 | `script threw: fn is not a function` (the export is missing) |
| `test/scripts/assert-story-files-fence.red.node.test.ts` | 9 | 4 (A1 A3 A5 A9) | 5 | A1, A3 and A5: `UNAPPROVED (1): STORY-900-01`. A9: no `STUB-EMPTY` (it reads UNAPPROVED) |
| `test/scripts/close-sprint-fence.red.node.test.ts` | 4 | 3 (C1 C3 C4) | 1 | C1: `Step 2.9 passed: no deferred verifications declared.` C3: `Step 2.6c warning: parent rollup unavailable: No frontmatter in …EPIC-900_probe.md`. C4: silent, no archive. All three spawns reach their step; the stub loaded through the `REPO_ROOT` fallback (2.6d prints `reconcileCurrentSprintStories not in built CLI`, which is the stub's signature) |
| `test/scripts/template-approved-key.red.node.test.ts` | 7 | 5 (T1 T2 T3 T5 T6) | 2 | T1–T3: `parsed frontmatter must carry approved: false`. T5: 2 approved lines. T6: `Missing expected exception` |
| `test/commands/push.node.test.ts` | 9 (+2) | 2 (P1 P2) | — | the substring is absent under today's single message |
| `test/commands/doctor.node.test.ts` | 40 (+1) | 1 (D1) | — | `codes=[1], out=["blocked: no_approved_stories"]` |
| `test/commands/doctor-session-start.node.test.ts` | 22 (+2) | 2 (D2 D3) | — | the reminder is printed; the blocked id is not named |
| `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts` | 2 | 2 | 0 | I1: `epic: expected exactly one "approved: false" line, got 0`. I2: `init_sprint.mjs` fails (UNAPPROVED) |

- **Totals:** default tier 38 (30 red, 8 anchors) and integration 2 red. This exactly matches the QA-Red report and M5-fixwave §(a)/(b).
- **M2 parity pair, compare mode** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, read-only):
  - QA-Red measured 5/5 and 15/15 red on the `epic.md` row.
  - I ran the pair only on the simulation (§2), not at `dbdcfc8`. The template rows pin literal hashes that differ from the canonical bytes at `dbdcfc8` (confirmed below), so they fail there by construction.

**The TPV checks the plan requires:**

1. Both parity imports resolve: canonical `.mjs` through `canonicalPath` + `pathToFileURL`, and the TS module. ✓
2. The C1 and C3 spawns print their Step 2.9 / 2.6c lines, not a Step-1 error. ✓
3. The stub reconciler resolves through `REPO_ROOT`. ✓
4. The script rows' `currentHash` refuses the baseline (code read; green on the simulation). ✓
5. No sealed -09 or -10 test file is edited. `dbdcfc8` touches 9 files, and `init-fixture.ts` is a 56-line append at the tail. ✓
6. I1 runs `<room>/.cleargate/scripts/init_sprint.mjs` with `cwd` and `CLEARGATE_REPO_ROOT` set to the room. ✓

**Standard five:**
- The imports and call signatures resolve: typecheck is clean, and every file passes on the simulation.
- No new `t.mock.method` calls.
- Naming is correct.
- **Orphan state:** the new files write tmp dirs (`cg-bug090-assert-*`, `cg-bug090-close-*`, and the re-seal's `cg-bug090-awia-*`) with no cleanup. `runInitScenario` leaks 2 dirs per call until BUG-096 integrates. This is hygiene, not a wiring defect.

## 2. Satisfiability: the plan-conformant simulation

The simulation was built in the scratch clone, with each change done exactly as the plan pins it:

- **`assert_story_files.mjs`:**
  - `locateFrontmatterFence`, a line-for-line port of `frontmatter-locator.ts:37-121`;
  - `assertWorkItemApproved`, exported, with the plan (a) body: try/catch, `body = content.slice(span.end)`, and the `:168` regex unchanged.
- **`close_sprint.mjs`:**
  - one import;
  - `fenceYaml`;
  - `readFmStatus`, `setFrontmatterStatusAtomic` (offset splice), `parseFrontmatterFields` and `parseDeferredVerifications` all read `fm.yaml`.
- **Templates:** a bare `approved: false` after `status:` in epic, story and hotfix. The sha256 values are `d99b995b…`, `e7736854…` and `38edde0d…`, which **equal the plan literals**.
- **`push.ts`:** the plan (c) block.
- **`doctor.ts`:** the 2 sniff lines are deleted. The `runPricing` sniff remains.
- **`approveProbeStory`:** the plan shape.
- **Outer twins:** the 5 files, byte-copied (`cmp` OK). The live `close_sprint.mjs` prints usage and exits 2, so the import pair links.
- `npm run typecheck` is clean, and `node scripts/check-no-inline-id-regex.mjs` is clean.

### Red → green

| File | at `dbdcfc8` tests / red / anchor | re-sealed tests / red / anchor | simulation |
|---|---|---|---|
| frontmatter-fence-parity | 13 / 13 / 0 | **21 / 21 / 0** | 21/21 pass |
| assert-story-files-fence | 9 / 4 / 5 | **11 / 6 / 5** | 11/11 |
| close-sprint-fence | 4 / 3 / 1 | 4 / 3 / 1 (3 fixtures strengthened) | 4/4 |
| template-approved-key | 7 / 5 / 2 | same | 7/7 |
| push (amended) | 9, 2 red | same | 9/9 |
| doctor (amended) | 40, 1 red | same | 40/40 |
| doctor-session-start (amended) | 22, 2 red | same | 22/22 |
| sprint-init-fresh-install (integration) | 2 / 2 | same | 2/2 |
| M2 parity pair (compare) | 5 + 15 red | same | **5/5, 15/15** |

**Anchors on the simulation (solo):**

| Anchor | Result |
|---|---|
| clean-room-evidence | 60/60 (E5-1, E5-4, E5-6) |
| frontmatter-locator | 11/11 |
| test_assert_work_item_files | 20/20 |
| sync-acquire | 9/9 |
| init-host-snapshot | 13/13 |
| work-item-id | 47/47 |
| no-inline-id-regex | 7/7 |
| no-exec-mode-vocab | 4/4 |
| clean-room-baseline-coexistence | 24/24 |
| status-vocab-phase-b | 75/75 |
| gate-section-index-pinning | 14/14 (S1c green, because META_ROOT = the simulated outer, which holds the twins) |
| close-sprint-step-7-4 | 6/6 |
| close-sprint-assume-ack-guard | 20/20 (it spawns the live pair, so it witnesses the ESM link) |
| close-sprint-step-2-6c | 8 pass + 1 skip, after the scratch `build`. Without a dist: the 5 known env failures (`walkActiveParents not in built CLI`) |
| frontmatter-authoring (integration) | 9/9 |
| canonical-live-parity (integration) | 11/11 |
| canonical `test_assert_story_files.sh` | 15/15 |
| outer `test_assert_story_files.sh` | 15/15 |

**Pre-existing, not BUG-090's:** `template-sync-fields.integration` is 16/20. Its 4 failures are "live template {epic,story,CR,Bug}.md — parseFrontmatter returns all 6 new keys". The test bug is at `:78`: `field in (fm, msg)` uses the comma operator, so `in` runs on a string and throws. It fails the same way on the untouched `CR.md` and `Bug.md`, at any commit.

**Unsatisfiable or over-constrained:** none. The template rows pin literals that the plan's single-line insertion reproduces exactly. T1–T3's "the line right after `status:`" matches the plan placement.

## 3. Mutant sampling (57 mutants; the harness ran each area's files solo)

| Id | Area | Mutant | at `dbdcfc8` | after re-seal |
|---|---|---|---|---|
| L01 | locator | no BOM strip on line 0 | K (F5) | K |
| L02 | locator | BOM start offset +0 | K (F5) | K |
| L03 | locator | `eol` hard-coded `'\n'` (CRLF mishandled) | K (F3, F4) | K |
| L04 | locator | `yamlStart = line.end + 1` (CRLF off-by-one) | K (F3, F4) | K |
| L05 | locator | `yamlEnd = close.start - 1` (fence off-by-one) | K (F1–F8) | K |
| L06 | locator | `end` includes the closer's EOL | K | K |
| L07 | locator | `<instructions>` not opaque | K (F6, F11) | K |
| L08 | locator | skip the phantom before `<instructions>` (accept the phantom, BUG-067 parity broken) | K (F7, A6) | K |
| L09 | locator | `<instructions>` opener via `trim()` | **S** | K (F14) |
| L10 | locator | fenced examples not opaque | K (F8, F13) | K |
| L11 | locator | fence closer ignores char | **S** | K (F16) |
| L12 | locator | fence closer ignores length | **S** | K (F17) |
| L13 | locator | fence opener allows no indentation | **S** | K (F18) |
| L14 | locator | drop the `eol === ''` early throw | S | S — **equivalent** (last line, so the loop throws the same message) |
| L15 | locator | "missing closing" message off by one char | K (F10) | K |
| L16 | locator | "unterminated `<instructions>`" message altered | K (F11) | K |
| L17 | locator | "unterminated fence" message altered | K (F13) | K |
| L18 | locator | unterminated `<instructions>` returns null | K (F11) | K |
| L19 | locator | opener via `trim()` | K (F12) | K |
| L20 | locator | closer via `trimEnd()` | **S** | K (F19) |
| L21 | locator | fence check before instructions state | **S** | K (F20) |
| L22 | locator | BOM stripped on every line | **S** | K (F21) |
| L23 | locator | unterminated fence returns null | K (F13) | K |
| L24 | locator | `</instructions>` closer via `trim()` | not run | K (F15) |
| L25 | locator | fence closer allows no indentation | not run | K (F18) |
| A01 | assertWorkItemApproved | `body = content` (the preamble counts as body) | K (A9) | K |
| A02 | assertWorkItemApproved | no try/catch (a throw crashes the script) | **S** | K (A10) |
| A03 | assertWorkItemApproved | not exported | **S** | K (A11) |
| A04 | assertWorkItemApproved | approved regex relaxed, unanchored | S | S — accepted, K-gate K4 (pre-existing regex; keep it byte-identical) |
| A05 | assertWorkItemApproved | offset-0 regex fallback when the span is null or throws | **S** | K (A10) |
| A06 | assertWorkItemApproved | `locateFrontmatterFence` not exported | K (13/13) | K |
| C01 | close_sprint | `parseFrontmatterFields` on the old regex | K (C1) | K |
| C02 | close_sprint | `parseDeferredVerifications` on the old regex | K (C1) | K |
| C03 | close_sprint | `readFmStatus` on the old regex (2.6c no-op kept) | K (C4) | K |
| C04 | close_sprint | flip = whole-file `^status:` replace | **S** | K (C3 preamble) |
| C05 | close_sprint | flip = `raw.replace(fm.yaml, newFm)` | S | S — equivalent in practice (needs a preamble that duplicates the whole YAML); post-flight splice check |
| C06 | close_sprint | splice `yamlEnd + 1` | K (C3) | K |
| C07 | close_sprint | 2.6c copy instead of rename | K (C3) | K |
| C08 | close_sprint | the no-op archive loop never archives | K (C4) | K |
| C09 | close_sprint | `parseFrontmatterFields` over the whole raw | S | S — accepted, K-gate K5 (benign on shipped templates: no column-0 key in their preambles) |
| C10 | close_sprint | `parseDeferredVerifications` over the whole raw | **S** | K (C1 preamble) |
| C11 | close_sprint | `readFmStatus` over the whole raw | **S** | K (C4 preamble) |
| T01 | templates | `approved:` missing from hotfix | K (T3) | K |
| T02 | templates | `approved:` placed before `status:` | K (T1) | K |
| T03 | templates | `approved: "false"` quoted | K (T2) | K |
| T04 | templates | trailing comment | K (T2) | K |
| P01 | push | wording unchanged | K (P1, P2) | K |
| P02 | push | `String()` instead of `JSON.stringify` | K (P2) | K |
| P03 | push | false-path punctuation changed (`.` → `!`) | S | S — accepted (cosmetic; the substring pins hold) |
| P04 | push | absent-key wording altered | K (P1) | K |
| R01 | probe-items | never flips (always inserts) | K (T5) | K |
| R02 | probe-items | no throw on two lines | K (T6) | K |
| R03 | probe-items | status anchor not checked first | K (E5-6) | K |
| R04 | probe-items | flip all lines with no throw | K (T6) | K |
| D01 | doctor | the `runSessionStart` sniff kept | K (D2, D3) | K |
| D02 | doctor | the `runCanEdit` sniff kept | K (D1) | K |
| D03 | doctor | the `runPricing` sniff also deleted (outside scope) | S | S — accepted, K-gate K2 (BUG-098's D6 anchor pins it later) |

**Per-area results.**

| Area | at `dbdcfc8` (killed/run) | after re-seal (killed/run) |
|---|---|---|
| locator | 15/23 | 24/25 (the 1 left is equivalent) |
| assertWorkItemApproved | 2/6 | 5/6 |
| close_sprint | 6/11 | 9/11 |
| templates | 4/4 | 4/4 |
| push | 3/4 | 3/4 |
| probe-items | 4/4 | 4/4 |
| doctor | 2/3 | 2/3 |

- **Overall:** 36/55 at `dbdcfc8`, and 51/57 after the re-seal. Excluding the 2 equivalents (L14, C05), that is 51/55.
- The parity rows also kill any template byte change, because they pin literal hashes (T01–T04 would fail those rows too; not run separately).

## 4. Re-seal patch

- **Path:** `reports/BUG-090-tpv-reseal.patch`.
- **sha256:** `28d4f07c6da5e2fe84332bb3fd14076c55ab3a33f0e0c2970652d1af22f51b27`.
- **Size:** 153 lines.
- **`git apply --check`:** clean on `dbdcfc8`.
- **Files, per `--numstat`:**
  - `test/scripts/assert-story-files-fence.red.node.test.ts`: +49 −0.
  - `test/scripts/close-sprint-fence.red.node.test.ts`: +8 −1.
  - `test/scripts/frontmatter-fence-parity.red.node.test.ts`: +35 −1.
- **Contents:**
  - **Parity F14–F21**, compared against the TS reference at runtime:
    - F14 is `<instructions> ` (trailing space), which is not an opener.
    - F15 is `</instructions> `, which is not a closer, so the phantom inside stays opaque.
    - F16: `~~~` does not close a ``` fence.
    - F17: a shorter run does not close a longer fence.
    - F18 covers opener and closer indentation of 3 and 2 spaces.
    - F19: a `--- ` closer is not the closer.
    - F20: a ``` inside `<instructions>` stays opaque.
    - F21: a BOM mid-file is not stripped.
  - **A10 [red]:** a `----`-closed block with `approved: true` gives exit 1, `UNAPPROVED (1): STORY-900-01`, and no locator stack.
    - At `dbdcfc8` it exits 0 with `OK: …`: the offset-0 regex treats `----` as the closer and approves a malformed block.
    - The plan pins "on null or a throw, approved = false".
    - Census: the TS locator throws on 0 of 556 corpus files, so this fail-closed change has no real-item regression.
  - **A11 [red]:** a direct `import()` of `assertWorkItemApproved`, which must be a function, deep-equal to:
    - `{approved:true, has_heading:true}` for an instructions-led file with a heading;
    - `{approved:true, has_heading:false}` for an A9-shaped file;
    - `{approved:false, has_heading:false}` for an absent path.
  - **Fixture strengthening (counts unchanged).** Each preamble gains one line inside `<instructions>`:
    - C1: `deferred_verification: []`;
    - C3: `status: "Draft"`;
    - C4: `status: "Draft"`.
    - The expected bytes and messages are unchanged.
- **Proof on a fresh `dbdcfc8` clone with the patch:**
  - parity is 21/21 red; F21's red is the missing export, which misses TS's "missing closing" throw.
  - assert is 6 red (A1 A3 A5 A9 A10 A11) and 5 anchors;
  - close is 3 red and 1 anchor, with unchanged reasons.
  - On the simulation, all three files are green: 21/21, 11/11 and 4/4.
  - Typecheck is clean, and `check-no-inline-id-regex` is clean.
- **New exact counts:** default tier **48**, of which **40 red** and **8 anchors** (A2 A4 A6 A7 A8 C2 T4 T7). Integration: **2 red**. The M2 pair flips 5 + 15. DevOps D4 = previous total **+48**.
- **Blueprint:** FW-A16 is appended to `plans/M5-fixwave.md` (counts, D4, the item's test-count table 38 → 48, K-gates, and the pre-existing failure).

## 5. Rulings

**C4 contract (question 4): no mismatch.**
- C4 freezes (replan §2, waves.json `frozen_exports`):
  - `locateFrontmatterFence(raw) → {start,end,yamlStart,yamlEnd,eol} | null`;
  - the 3 messages;
  - `assertWorkItemApproved(filePath)`;
  - the 5 rows.
- BUG-098 (`plans/M5-fixwave.md` §BUG-098, "Scripts (sites 14-15)") consumes:
  - the named import;
  - the single `raw` argument;
  - try/catch → null;
  - `span.yamlStart` and `span.yamlEnd`. `dedupe` relies on `yamlEnd = close.start`, so the slice ends with the pre-closer EOL.
- It never consumes the messages or `assertWorkItemApproved`.
- **What the tests pin:**
  - Parity deep-equality (`node:assert/strict` `deepEqual` = deepStrictEqual) pins the exact 5-key shape and the yaml offsets.
  - F9, F12 and F14 pin `null`.
  - F10, F11 and F13 pin the 3 messages byte-for-byte against the shipped TS (`frontmatter-locator.ts:101,115,118,119`).
  - After the re-seal, A11 pins `assertWorkItemApproved`'s export and its `{approved, has_heading}` return.
- **Integration fact:** `-10` merged to cli `main` as `fcb1491` during this TPV. `git diff d0f0d95 fcb1491` touches none of BUG-090's 8 source files, 3 amended tests or `init-fixture.ts`. So the M5-fixwave entry gate still holds, the literal rows stay valid, and the integration merge is conflict-free on these surfaces. CR-124's 7 rows and -11's hook rows share no rel with BUG-090's 5.

**QA-Red flashcard, Step 2.6c `'no-op'` (question 5): in scope and covered, and it becomes stale on merge.**
- **In scope:** FW-A2 and the census row `close_sprint.mjs:250 readFmStatus … FIX` put it in BUG-090's scope.
- **Covered:** C4 is its red. The simulation turns it green.
- **Strengthened:** the re-seal's preamble `status: "Draft"` in C4 kills the whole-file variant (C11).
- **Reachable:** `parent-rollup.ts:125` reads parents through the located `parseFrontmatter` and emits `no-op` for Completed parents (`:259,495`).
- **Residual:** a `no-op` parent whose frontmatter is absent or malformed is still skipped silently, by design (the "best-effort … left for Step 2.6 to report" catch). **Ruling: no new red; log it as a follow-up** (hygiene: warn when a pending-sync non-flip parent has no locatable frontmatter).
- **Stale card:** after BUG-090 merges, `FLASHCARD.md:1` ("'no-op' silently skips archiving an `<instructions>`-led Completed parent") describes fixed behaviour. The orchestrator or Reporter should supersede it at close.

**Pre-merge-red class under rule 19.** In the nested worktree, META_ROOT = `<ow>`. Once the Developer copies the 5 twins into `<ow>`, M5-fixwave's "expected pre-merge reds" all go green, as measured here with META_ROOT = the simulated outer:
- S1c;
- 2-6c Scenario 5, with a built dist;
- 7-4 Scenario 3;
- canonical-live-parity.

`template-sync-fields` is the only non-green integration file, and its failure is pre-existing (§2).

## 6. Developer brief (make-green set and K-gates)

- **K0 (orchestrator, before dispatch).** Commit the re-seal on cli `story/BUG-090` as a QA-Red re-seal commit. Check it against the patch sha, `git apply --check`, and the equality of the 3-file list. Apply FW-A16 to the BUG-090 item (§5 table: Unit tests 48), then re-gate with `node OUTER/cleargate-cli/dist/cli.js gate check <file>`.
- **K1 (allow-list).** `git diff --name-only <reseal> HEAD` in `<cw>` equals exactly these 8 files:
  - `scaffold/core/.cleargate/scripts/assert_story_files.mjs`
  - `scaffold/core/.cleargate/scripts/close_sprint.mjs`
  - `scaffold/core/.cleargate/templates/epic.md`
  - `scaffold/core/.cleargate/templates/story.md`
  - `scaffold/core/.cleargate/templates/hotfix.md`
  - `scripts/clean-room/probe-items.mjs`
  - `src/commands/push.ts`
  - `src/commands/doctor.ts`

  No test file, and no new file (a new payload file is inexpressible in the delta rows).
- **K2 (doctor).** `git diff --numstat -- src/commands/doctor.ts` is `0	2`. `command grep -c "trimStart().startsWith('---')" src/commands/doctor.ts` is `1`: that is `runPricing`, which is BUG-098's.
- **K3 (templates).** The sha256 values are `d99b995b…c67a1b`, `e7736854…15baa5c5` and `38edde0d…a8b471`. Each has one bare `approved: false` directly after `status:`.
- **K4 (`assert_story_files.mjs`).**
  - `locateFrontmatterFence` is a line-for-line port of `frontmatter-locator.ts:37-121`.
  - `assertWorkItemApproved` is exported.
  - The locator call is inside try/catch, and `body = content.slice(span.end)`.
  - The `approved` regex line is byte-identical to base `:168`.
  - `node scripts/check-no-inline-id-regex.mjs` is clean.
- **K5 (`close_sprint.mjs`).**
  - Exactly one new import line, `import { locateFrontmatterFence } from './assert_story_files.mjs';`, plus `fenceYaml`.
  - `readFmStatus`, `setFrontmatterStatusAtomic`, `parseFrontmatterFields` and `parseDeferredVerifications` read `fm.yaml` only, never `raw`.
  - The flip is an offset splice.
  - `:711` `start_date` is untouched.
- **K6 (`push.ts`).** The plan (c) block verbatim. The false-path text stays byte-identical: `has approved: false. Set approved: true in frontmatter after review.`
- **K7 (`probe-items.mjs`).** Only `approveProbeStory` changes, in the plan shape.
- **K8 (build, rule 11).** `(cd <cw> && npm run prebuild && npm run build)` before the parity pair and the dist-spawning anchors.
- **K9 (make-green set, solo).**

  | File | Expected |
  |---|---|
  | parity | 21/21 |
  | assert | 11/11 |
  | close | 4/4 |
  | template | 7/7 |
  | push | 9/9 |
  | doctor | 40/40 |
  | doctor-session-start | 22/22 |
  | `sprint-init-fresh-install.red.integration` | 2/2 |

  No integration-only exclusions: the base is C1, and the only upstream is `-10`.
- **K10 (M2 pair, compare mode, never capture).** 5/5 and 15/15. The baseline hash is `bdc4bb1a…62b2`, 425 files.
- **K11 (twins).**
  - After the cli Dev commit, `cp` the 5 files to `<ow>/.cleargate/{scripts,templates}/`, then `cmp` each.
  - Leave them **uncommitted** (rules 17/21).
  - At integration step 7, all 5 land in **one** outer commit. This is the ESM import pair.
  - Witnesses: `(cd <ow> && node .cleargate/scripts/close_sprint.mjs; echo $?)` prints usage and exits 2, with no SyntaxError. The same holds for `assert_story_files.mjs`.
- **K12 (anchors, solo, after K11).**
  - The M5-fixwave anchor list, with the counts in §2.
  - Also `gate-section-index-pinning` 14/14, `close-sprint-step-2-6c` 8 plus 1 skip, `close-sprint-step-7-4` 6/6, and the integration files `frontmatter-authoring` 9/9 and `canonical-live-parity` 11/11.
  - Name `template-sync-fields`' 4 pre-existing failures.
- **K13 (rule 16).** Run all 21 `CLEARGATE_META_ROOT` files **without** the override, because the default is `<ow>`. `close-sprint-assume-ack-guard` 20/20 is the link witness.
- **K14.** `npm run typecheck` is clean. `git -C <ow> status --porcelain` shows only the 5 twins.
- **K15 (integration).**
  - Merge `main` (`fcb1491`+).
  - The init-fixture tail order is upstream rows first (CR-124's 7, if it merged first), then BUG-090's 5.
  - Re-derive the twins.
  - Re-run K9–K13.
  - DevOps D4 = previous total + 48.

## Real-checkout git statuses

| Tree | State |
|---|---|
| cli main `/…/ClearGate/cleargate-cli` | `main` @ `fcb1491`, `?? cleargate-0.25.0.tgz` |
| BUG-090 cli worktree | `dbdcfc8`, clean |
| BUG-090 outer worktree | `0b97950d`, clean |
| outer main checkout | this dispatch wrote only three things: `M plans/M5-fixwave.md` (the FW-A16 append), `?? reports/BUG-090-tpv-reseal.patch`, and this report |

- `-10` merged to cli `main` during this TPV, moving it from `35580b0` to `fcb1491`. That was the merge lane, not this dispatch.
- The outer main checkout's other entries are concurrent-lane artifacts, not this dispatch's:
  - 30 `delivery/pending-sync/*` files were modified at 18:56:56 by the `-10` DevOps full suite (`run-default-tests.mjs`, cwd = the cli main checkout; Rule 14 back-sync, a `parent_cleargate_id` diff shape). My last run before that ended at 18:56:22, and it ran in scratch.
  - `plans/replan-contract-first.md` (CR-124 TPV);
  - `reports/BUG-097-dev.md`;
  - `reports/CR-124-tpv-reseal.patch`;
  - the ledger and state files.
- DevOps owns the Rule-14 revert.
- **/tmp:** `runInitScenario` leak dirs (`cg-s41-fix-*` / `cg-s41-payload-*`) from my I1 and parity runs could not be told apart from the 486 that concurrent lanes created in the same window. They were left for BUG-096's DevOps sweep.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked. Every run was a targeted `npm run test:file` or a direct canonical-script spawn inside the scratch root.

## Open decisions for orchestrator

1. Apply the re-seal (K0) and FW-A16, then dispatch the Developer.
2. Log the follow-ups:
   - the Step 2.6c warning for an unlocatable non-flip parent;
   - the `template-sync-fields.integration.node.test.ts:78` comma-operator bug.
3. Supersede FLASHCARD line 1 once BUG-090 merges.

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #tpv #locator · A port-parity table needs one fixture per framing rule; 13 fixtures left 7 port mutants alive."
  - "2026-09-26 · #tpv #frontmatter · Preamble-free fixtures can't tell a located-YAML read from a whole-file scan; add a col-0 key in <instructions>."
  - "2026-09-26 · #test-harness #tpv · A frozen contract export exercised only through a spawn is unpinned; add one direct-import test per export."
  - "2026-09-26 · #frontmatter #scripts · assert_story_files' offset-0 regex approves a ----closed block (---- read as closer); the locator fails closed."
  - "2026-09-26 · #test-harness · template-sync-fields :78 `field in (fm, msg)` comma operator throws on every template; pre-existing, not a regression."
  - "2026-09-26 · #orchestrator #cross-repo · A merge-lane full suite back-syncs outer main delivery/**; a parallel agent's git status shows it — not theirs."
```
