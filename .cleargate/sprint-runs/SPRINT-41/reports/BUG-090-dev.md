# BUG-090 — Developer report (build phase)

role: developer

```
STORY: BUG-090
STATUS: done
COMMIT: f31c6843d65c610f2fdb8bf6f041d160d192e4a9 (cli story/BUG-090, parent 93e48dc)
TYPECHECK: pass
TESTS: make-green 48/48 default delta + 2/2 integration; M2 pair 5/5 + 15/15; anchors all green except the 4 named pre-existing template-sync-fields :78 failures
FILES_CHANGED: scaffold/core/.cleargate/scripts/assert_story_files.mjs, scaffold/core/.cleargate/scripts/close_sprint.mjs, scaffold/core/.cleargate/templates/{epic,story,hotfix}.md, scripts/clean-room/probe-items.mjs, src/commands/push.ts, src/commands/doctor.ts (cli); outer twins uncommitted in .worktrees/BUG-090
```

This commit is the candidate for contract C4 `contract/S-41-fence`. The commit subject matches the dispatch verbatim.

## Where

- cli worktree `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090/cleargate-cli`, branch `story/BUG-090`. HEAD was `93e48dc` (verified) before the commit; now `f31c684`.
- outer worktree `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090`, branch `story/BUG-090` @ `0b97950d`.
- Build phase only. No merge of cli `main`, which has moved to `c5a311e` since the TPV (BUG-096 merged). No outer commit.
- The cli main checkout was never edited, tested or checked out. I only read its branch and HEAD for the status table.

## K-gate checklist

| Gate | Result | Evidence |
|---|---|---|
| K0 | done (orchestrator) | `93e48dc` = re-seal, HEAD verified before work |
| K1 allow-list | PASS | `git diff --name-only 93e48dc HEAD` = exactly the 8 files. No test file and no new file |
| K2 doctor | PASS | numstat `0	2 src/commands/doctor.ts`. The ``trimStart().startsWith('---')`` count is 1, at `doctor.ts:887`, the `runPricing` site that belongs to BUG-098 |
| K3 templates | PASS | epic `d99b995b04043a425126b57af4e312e67d091828b05962bff3ac458411c67a1b`; story `e77368548efac3258b289ca566657b3535a77fbbce446fc28c604e5815baa5c5`; hotfix `38edde0df8a4eadf5baaa470abf32fc2f5f742c8bd7e9fc4a2d4fff799a8b471`. Each has one bare `approved: false` directly after `status:` (epic :44, story :75, hotfix :36). All equal the plan literals |
| K4 assert_story_files | PASS | Line-for-line port of `frontmatter-locator.ts:37-121`; the BOM is a literal U+FEFF, the same bytes as the TS source. `assertWorkItemApproved` is exported. The locator call is inside try/catch, and `body = content.slice(span.end)`. The approved regex line (`:280`) whole-line-matches (`grep -xF`) base `:168`. `node scripts/check-no-inline-id-regex.mjs` gives "no inline work-item-id regexes", exit 0 |
| K5 close_sprint | PASS | One new import (`:85`) plus `fenceYaml` (`:255`). `readFmStatus` (`:270-272`), `setFrontmatterStatusAtomic` (`:609-612`, offset splice `raw.slice(0, fm.span.yamlStart) + newFm + raw.slice(fm.span.yamlEnd)`), `parseFrontmatterFields` (`:1058-1061`) and `parseDeferredVerifications` (`:1076-1078`) read `fm.yaml` only. No `^---` regex or `fm[1]` remains. The `start_date` whole-file scan (base :711, now :744) is untouched |
| K6 push | PASS | The plan (c) block, verbatim. The false-path text is byte-identical: `has approved: false. Set approved: true in frontmatter after review.` |
| K7 probe-items | PASS | Only `approveProbeStory` changed, in the plan shape (+11 −5 including its doc comment) |
| K8 build | PASS | `(cd <cw> && npm run prebuild && npm run build)`: payload 80 files, split view 87, manifest 74, build exit 0. It ran in `<cw>` only |
| K9 make-green | PASS | Table below |
| K10 M2 pair | PASS | 5/5 and 15/15 in compare mode. Baseline `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`, 425 files, before and after (read-only) |
| K11 twins | PASS | 5 × `cmp` OK. They were re-verified against the committed blobs (`git show HEAD:… \| cmp -`), and they are uncommitted in `<ow>`. Link witnesses: `(cd <ow> && node .cleargate/scripts/close_sprint.mjs)` prints usage and exits 2; `assert_story_files.mjs` prints usage and exits 2; no SyntaxError |
| K12 anchors | PASS | Table below. `template-sync-fields` has 4 named pre-existing failures |
| K13 rule 16 | PASS | 21/21 files green without the override (`env -u CLEARGATE_META_ROOT`; default META_ROOT = `<ow>`). `close-sprint-assume-ack-guard` is 20/20 (link witness). There are no ENOENT-class exceptions |
| K14 | PASS | `npm run typecheck` is clean (before and after). `git -C <ow> status --porcelain` shows exactly the 5 twins |
| K15 integration | NOT RUN (by design) | Integration is a later INTEGRATE dispatch. Notes below |

## Per-file counts (solo, `npm run test:file -- <file>`, from `<cw>`)

**K9 make-green set:**

| File | tests / pass / fail / skip |
|---|---|
| `test/scripts/frontmatter-fence-parity.red.node.test.ts` | 21 / 21 / 0 / 0 |
| `test/scripts/assert-story-files-fence.red.node.test.ts` | 11 / 11 / 0 / 0 |
| `test/scripts/close-sprint-fence.red.node.test.ts` | 4 / 4 / 0 / 0 |
| `test/scripts/template-approved-key.red.node.test.ts` | 7 / 7 / 0 / 0 |
| `test/commands/push.node.test.ts` | 9 / 9 / 0 / 0 |
| `test/commands/doctor.node.test.ts` | 40 / 40 / 0 / 0 |
| `test/commands/doctor-session-start.node.test.ts` | 22 / 22 / 0 / 0 |
| `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts` | 2 / 2 / 0 / 0 |

The default-tier delta is 48/48 green: 40 former reds and 8 anchors. Integration is 2/2.

**K10:** `claude-adapter-init-parity.red.integration` 5/5 and `init-host-parity.red.integration` 15/15, both with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`.

**K12 anchors:**

| File | Result |
|---|---|
| clean-room-evidence.red | 60/60 |
| frontmatter-locator.red | 11/11 |
| test_assert_work_item_files | 20/20 |
| sync-acquire | 9/9 |
| init-host-snapshot.red | 13/13 |
| status-vocab-phase-b.red | 75/75 |
| work-item-id | 47/47 |
| no-inline-id-regex | 7/7 |
| no-exec-mode-vocab | 4/4 |
| clean-room-baseline-coexistence.red | 24/24 |
| gate-section-index-pinning | 14/14 (S1c green against the twins) |
| close-sprint-step-2-6c.red | 8 pass + 1 skip (the worktree dist was built) |
| close-sprint-step-7-4.red | 6/6 |
| frontmatter-authoring.red.integration | 9/9 |
| canonical-live-parity.red.integration | 11/11 |
| template-sync-fields.integration | 16/20 (see the named reds below) |
| canonical `bash scaffold/core/.cleargate/scripts/test/test_assert_story_files.sh` | 15/15 |
| outer `(cd <ow> && bash .cleargate/scripts/test/test_assert_story_files.sh)` | 15/15 |

**K13 (21 files, no override):**

| File | Result |
|---|---|
| new-command | 57/57 |
| no-exec-mode-vocab | 4/4 |
| claude-md-block-leads-relocation.red | 4/4 |
| clean-room-verification-doc.red | 9/9 |
| test-layers-declared-doctrine.red | 11/11 |
| frontmatter-authoring.red.integration | 9/9 |
| spidr-coverage.red.integration | 1/1 |
| hook-signal.red.integration | 3/3 |
| hook-signal.red | 14/14 |
| pre-tool-use-task | 13/13 |
| token-ledger-attribution | 9/9 |
| token-ledger-regression | 14/14 |
| readiness-predicates-spidr-coverage.red | 32/32 |
| readiness-predicates-test-layers-declared.red | 17/17 |
| enforcement-doc-coherence | 26/26 |
| file-surface-gate-e2e | 21/21 |
| pre-commit-downstream-safe | 12/12 |
| ratchet-retired | 8/8 |
| close-sprint-assume-ack-guard | 20/20 |
| scaffold-relocation.red | 15/15 |
| bucket-registry-parity.red | 11/11 |

**Red-before-green:** `git stash` is forbidden, so I did not re-derive it. QA-Red (`reports/BUG-090-qa-red-reseal.md`) and the TPV both measured the 40 default reds and 2 integration reds as red for the right reason at `93e48dc`/`dbdcfc8`, and no test file changed since.

## Named pre-existing reds (not BUG-090's)

- `test/scripts/template-sync-fields.integration.node.test.ts`, 4 failures, all "live template {epic,story,CR,Bug}.md — parseFrontmatter returns all 6 new keys". Each throws `TypeError: Cannot use 'in' operator to search for 'pushed_by' in <name> frontmatter should have key "pushed_by"`.
- Cause: the test bug at `:78`, `assert.ok(field in (fm, msg))`. The comma operator evaluates to the message string.
- It fails the same way on the untouched `CR.md` and `Bug.md`, at any commit (FW-A16).

## Twins (K11)

| Twin (`<ow>/…`) | cmp vs `<cw>` canonical (HEAD blob) | sha256 |
|---|---|---|
| `.cleargate/scripts/assert_story_files.mjs` | identical | `8764961f295e334c28cbaf39b2b6028d7de2d0dd19651e0e123f1f4a9ae2755a` |
| `.cleargate/scripts/close_sprint.mjs` | identical | `0f837a9a4d2f77014742ca789c1807d63ededc93b010ff3e47e3f88502b233aa` |
| `.cleargate/templates/epic.md` | identical | `d99b995b…c67a1b` |
| `.cleargate/templates/story.md` | identical | `e7736854…15baa5c5` |
| `.cleargate/templates/hotfix.md` | identical | `38edde0d…a8b471` |

The twins are uncommitted. The ESM pair lands in one outer commit at integration step 7.

## Extra evidence: corpus census with the shipped script (read-only)

I imported `<ow>/.cleargate/scripts/assert_story_files.mjs` and walked `<ow>/.cleargate/delivery/{pending-sync,archive}/*.md`, 558 files:

- `locateFrontmatterFence`: 0 throws, 0 nulls.
- Against the TS `locateFrontmatter` (imported from `src/lib/frontmatter-locator.ts` via `node --import tsx`), there were **0 mismatches** in span, null or throw message.
- The old `^---\n` regex hits 553 files. On all 553, the old and new Step-2.9 `parseFrontmatterFields` give identical field maps.
- The SPRINT-41 deferred set is `[STORY-058-09, STORY-058-10, STORY-058-13]` under both parsers.

## C4 interface as shipped (quoted from `f31c684` `scaffold/core/.cleargate/scripts/assert_story_files.mjs`)

```js
/** @returns {{start: number, end: number, yamlStart: number, yamlEnd: number, eol: '\n'|'\r\n'} | null} */
export function locateFrontmatterFence(raw) {            // :192
        return {                                          // :229-235
          start: line.start + (i === 0 && line.text.startsWith('<U+FEFF>') ? 1 : 0),
          end: close.end,
          yamlStart: line.end + line.eol.length,
          yamlEnd: close.start,
          eol: line.eol,
        };
    if (line.eol === '') throw new Error('locateFrontmatter: missing closing ---');   // :224
    throw new Error('locateFrontmatter: missing closing ---');                        // :238
  if (instructions) throw new Error('locateFrontmatter: unterminated <instructions> block');  // :241
  if (fence) throw new Error('locateFrontmatter: unterminated Markdown fence');               // :242
  return null;

export function assertWorkItemApproved(filePath) {       // :258
    return { approved: false, has_heading: false };       // unreadable path
  return { approved, has_heading };                       // :287
```

- The source holds a literal U+FEFF where `<U+FEFF>` is shown, matching `frontmatter-locator.ts:78,107` byte-for-byte.
- `yamlEnd = close.start`, so the yaml slice ends with the EOL before the closer (flashcard #locator :80).
- `close_sprint.mjs` consumes the locator as `import { locateFrontmatterFence } from './assert_story_files.mjs';`.
- `assert_story_files.mjs` keeps its `isMain` guard, so importing it runs nothing.

## Git statuses (at report time)

```
$ git -C <cw> status --porcelain
(empty — f31c684 is HEAD)

$ git -C <ow> status --porcelain
 M .cleargate/scripts/assert_story_files.mjs
 M .cleargate/scripts/close_sprint.mjs
 M .cleargate/templates/epic.md
 M .cleargate/templates/hotfix.md
 M .cleargate/templates/story.md

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/delivery/pending-sync/{30 files: BUG-071..078, BUG-085, BUG-089, CR-118, CR-119, CR-124, SPRINT-41, STORY-031-03..05, STORY-058-01..13}
 M .cleargate/sprint-runs/SPRINT-41/{.session-totals.json, events.jsonl, state.json, token-ledger.jsonl}
 (+ this report, untracked)
```

The 30 outer-main `delivery/pending-sync` modifications are **not this dispatch's**:
- All 30 share one mtime, 19:27:54, two minutes after the BUG-096 merge on cli `main` (`c5a311e`, 19:25:49).
- They have the merge-lane full-suite back-sync shape (`parent_cleargate_id` rewrites, 30 files, +38 −38), the same signature the TPV attributed to the -10 DevOps suite.
- Every run in this dispatch was `npm run test:file` (direct `tsx --test`, never `run-default-tests.mjs`) from `<cw>`, whose META_ROOT is `<ow>`, and `<ow>` shows no delivery writes.
- DevOps owns the Rule-14 revert.

## Task Breakdown

I did not tick the item file's Task Breakdown in this dispatch:
- `<ow>` must show exactly the 5 twins.
- Replan §6 step 7 puts "the twins plus X's item-file ticks" in the one outer commit at integration.
- Rows 2–7 are done in `f31c684`. Row 8 (the byte-copy) is done and uncommitted. Row 1 (QA-Red) is done in `dbdcfc8`/`93e48dc`.

## K15 integration notes (for the INTEGRATE dispatch)

- cli `main` is now `c5a311e`: `fcb1491` (-10) plus BUG-096 (`9a3a0c0` integrate, `c5a311e` merge). BUG-096 edits `test/helpers/init-fixture.ts` in a different region (temp-dir tracking). Expect a clean merge, but check the init-fixture tail: upstream rows first, then BUG-090's 5.
- After `git merge --no-ff main`:
  1. `npm run prebuild && npm run build` in `<cw>`;
  2. re-run K9–K13;
  3. re-derive the twins (`git -C <ow> checkout --` the 5 paths, `merge --no-ff sprint/S-41`, `cp`, `cmp`).
- DevOps D4 = previous merge total + 48.
- FLASHCARD line 23 ("Step 2.6c 'no-op' silently skips archiving an `<instructions>`-led Completed parent") is stale once this merges (C4 is green).

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked.

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # approved instructions-led story passes sprint init (A1, I1)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # Step 2.9 reads deferred_verification behind <instructions> (C1)
  - { r_id: "R3", covered: true, deferred: false, clarified: true }    # CRLF + phantom INSIDE <instructions> (A3, A5; FW-A1 reworded the Examples row)
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # templates scaffold approved: false; flip + strip → sprint init 0 (T1-T3, I1, I2)
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # push names an absent approved key (P1, P2)
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # unapproved instructions-led story rejected (A7)
  - { r_id: "R7", covered: true, deferred: false, clarified: true }    # BUG-067-corrupted item read from its first fence → UNAPPROVED (A6, F7; FW-A1 parity ruling)
  - { r_id: "R8", covered: true, deferred: false, clarified: false }   # doctor --can-edit / --session-start read behind <instructions> (D1-D3)
  - { r_id: "R9", covered: true, deferred: false, clarified: false }   # Step 2.6c flips + archives instructions-led epic, preamble byte-identical (C3, C4)
  - { r_id: "R10", covered: false, deferred: true, clarified: false }  # outer twin commit: twins written + cmp OK, commit deferred to integration step 7
  - { r_id: "R11", covered: false, deferred: true, clarified: false }  # -09 harness sprint-init row PASS ×2: QA-Verify's harness-lane run after integration
plan_deviations:
  - { what: "assertWorkItemApproved keeps the two-line approvedMatch form", why: "Plan (a)'s snippet used a one-line .test(); K4 requires the regex line byte-identical to base :168, so K4 wins (same semantics).", orchestrator_confirmed: true }
  - { what: "twins copied before the cli commit", why: "Twin-dependent anchors (S1c, 7-4 Sc3, canonical-live-parity, assume-ack link witness) had to run before committing; twins re-cmp'd against the committed HEAD blobs afterwards, bytes identical.", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/scripts/clean-room/claude-baseline.mjs"
  - "cleargate-cli/scripts/clean-room/codex-hooks.mjs"
  - "cleargate-cli/src/lib/lifecycle-reconcile.ts"
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/test/scripts/template-sync-fields.integration.node.test.ts"
  - ".cleargate/scripts/dedupe_frontmatter.mjs"
  - ".cleargate/scripts/prep_reporter_context.mjs"
flashcards_flagged:
  - "2026-09-26 · #test-harness #baseline · M2 baseline hash lines embed absolute paths: run find on /private/tmp/cg-s41-m2-init-baseline, not cd + find ."
  - "2026-09-26 · #locator #test-harness · dist bundles frontmatter-locator (no dist/lib file); use node --import tsx on src/lib/frontmatter-locator.ts."
```
