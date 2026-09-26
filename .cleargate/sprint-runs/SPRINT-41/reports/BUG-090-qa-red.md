# BUG-090 — QA-Red report

role: qa

```
QA-RED: WRITTEN
RED_TESTS:
  - test/scripts/frontmatter-fence-parity.red.node.test.ts
  - test/scripts/assert-story-files-fence.red.node.test.ts
  - test/scripts/close-sprint-fence.red.node.test.ts
  - test/scripts/template-approved-key.red.node.test.ts
  - test/e2e/sprint-init-fresh-install.red.integration.node.test.ts
  - test/commands/push.node.test.ts (amended, +P1/P2)
  - test/commands/doctor.node.test.ts (amended, +D1)
  - test/commands/doctor-session-start.node.test.ts (amended, +D2/D3)
  - test/helpers/init-fixture.ts (amended, +5 SANCTIONED_BASELINE_DELTAS rows)
BASELINE_FAIL: 32 (30 default-tier + 2 integration; see per-file table)
flashcards_flagged:
  - "2026-09-26 · #test-harness #close-gate · Step 2.6c 'no-op' verdict silently skips archival for an <instructions>-led already-Completed parent — no warning at all, unlike auto-flip's caught-exception warning."
  - "2026-09-26 · #test-harness #scaffold-roots · canonicalPath('.') resolves to scaffold/core, not CLI_ROOT; import CLI_ROOT directly from scaffold-roots.js, never derive it via canonicalPath."
  - "2026-09-26 · #test-harness #qa-red · Pin a literal currentHash (not a refuse-baseline fn) when the delta's post-fix bytes are fully specified — it's red for the right reason before the value lands."
  - "2026-09-26 · #push #frontmatter · push.ts's approved:false refusal message is identical for an absent key and any non-true value — misleading until BUG-090's wording fix lands."
```

## Commit

- cli `story/BUG-090` (worktree `.worktrees/BUG-090/cleargate-cli`), cut from C1 `contract/S-41-codex` = STORY-058-10 Developer commit `d0f0d95`:
  - `dbdcfc8` — `qa-red(BUG-090): fence-parity + assert_story_files + close_sprint 2.9/2.6c + approved-key reds`
  - 9 files changed, 1249 insertions(+), 0 deletions. 5 new files, 4 amended (`push.node.test.ts`, `doctor.node.test.ts`, `doctor-session-start.node.test.ts`, `test/helpers/init-fixture.ts`).
- No outer commit: the plan places every BUG-090 (a)/(b)/(c) test in the cli repo only. The outer live-mirror byte-copy (5 files, one commit) is the Developer's job (M5-fixwave §(e)), not QA-Red's.

## Per-file red/anchor table

Measured solo, `npm run test:file -- <file>`, from `<cw>` on cli `dbdcfc8` (`d0f0d95` + this commit).

| File | Tests | Red | Anchor | Red reason (why it fails NOW) |
|---|---|---|---|---|
| `test/scripts/frontmatter-fence-parity.red.node.test.ts` | 13 | 13 (F1–F13) | 0 | `locateFrontmatterFence` is not yet exported by canonical `assert_story_files.mjs`; every call throws `TypeError: ... is not a function`, so every fixture's script-side attempt disagrees with the already-shipped TS `locateFrontmatter` reference. |
| `test/scripts/assert-story-files-fence.red.node.test.ts` | 9 | 4 (A1, A3, A5, A9) | 5 (A2, A4, A6, A7, A8) | The canonical script's offset-0 `/^---\r?\n/` regex never matches an `<instructions>`-led file, so A1/A3/A5 read `UNAPPROVED (1): STORY-900-01` instead of exit 0, and A9 reads `UNAPPROVED` instead of `STUB-EMPTY` (the body-exclusion behaviour doesn't exist yet). |
| `test/scripts/close-sprint-fence.red.node.test.ts` | 4 | 3 (C1, C3, C4) | 1 (C2) | C1: Step 2.9's `parseDeferredVerifications` finds no frontmatter behind `<instructions>`, so it prints `Step 2.9 passed: no deferred verifications declared.` instead of failing. C3: Step 2.6c's parent-status read throws on the `<instructions>`-led file, caught as `Step 2.6c warning: parent rollup unavailable: No frontmatter in ...` — nothing flipped or archived. C4: the `'no-op'` verdict path silently no-ops on an `<instructions>`-led already-Completed parent (0 printed, no archive) — see flashcard above. |
| `test/scripts/template-approved-key.red.node.test.ts` | 7 | 5 (T1, T2, T3, T5, T6) | 2 (T4, T7) | T1–T3: canonical `epic.md`/`story.md`/`hotfix.md` scaffold no `approved:` key at all (parsed `fm.approved === undefined`, not `false`). T5: today's `approveProbeStory` unconditionally inserts a **second** `approved: true` line even when a scaffolded `approved: false` already exists (2 lines, not 1). T6: it does not throw on a pre-existing duplicate-key input. |
| `test/e2e/sprint-init-fresh-install.red.integration.node.test.ts` | 2 | 2 (I1, I2) | 0 | I1 fails at its first assertion — a real `runInitScenario('fresh')` + `cleargate new epic`/`new story` scaffolds **zero** `approved:` lines. I2's flip (`raw.replace(/^approved: false$/m, 'approved: true')`) is a no-op against the same absent key, so `init_sprint.mjs` still reports `UNAPPROVED (1): STORY-001-01`, exit 1. |
| `test/commands/push.node.test.ts` (+2) | 2 new (7 existing stay green) | 2 (P1, P2) | — | Today's `push.ts:271-277` emits the same `has approved: false` text for an absent key (P1) and for a non-boolean truthy-looking value like `'true'` (P2) — neither pinned substring is present. |
| `test/commands/doctor.node.test.ts` (+1) | 1 new (39 existing stay green) | 1 (D1) | — | `runCanEdit`'s positional `raw.trimStart().startsWith('---')` sniff (`doctor.ts:1022`) skips the `<instructions>`-led approved story before `parseFrontmatter` ever runs, so the story is invisible and the gate reports `blocked: no_approved_stories`. |
| `test/commands/doctor-session-start.node.test.ts` (+2) | 2 new (20 existing stay green) | 2 (D2, D3) | — | Same sniff in `runSessionStart` (`doctor.ts:738`): an approved `<instructions>`-led story is invisible, so the planning-first reminder fires anyway (D2), and a blocked `<instructions>`-led item is never named or matched against `no-tbds` (D3). |
| `test/helpers/init-fixture.ts` (+5 rows) | n/a (exercised via the two M2 parity files) | flips 5/5 + 15/15 (compare mode) | — | See "M2 parity" below. |

**Totals: 38 default-tier (30 red / 8 anchor) + 2 integration (both red) = 40 tests written/amended**, matching `plans/M5-fixwave.md` BUG-090 §(a)/(b) totals exactly ("Default tier +38: 30 red at the red commit, 8 anchors"; "Integration +2, both red").

## Integration-only exclusions

None. BUG-090 built directly off C1 (`contract/S-41-codex` = STORY-058-10's `d0f0d95`) with `-10` as its sole upstream; every make-green test in this commit depends only on BUG-090's own forthcoming Developer commit, not on STORY-058-11/CR-124/STORY-058-12's contracts (C2/C3). No test is deferred to a later integration layer.

## Pinned C4 interface (as tested)

`test/scripts/frontmatter-fence-parity.red.node.test.ts` pins, for downstream BUG-098:
- `locateFrontmatterFence(raw: string) → {start, end, yamlStart, yamlEnd, eol: '\n'|'\r\n'} | null`, deep-equal to `src/lib/frontmatter-locator.ts`'s `locateFrontmatter` on every fixture (F1–F13), including the BUG-067 parity rulings: F6 (phantom fence *inside* `<instructions>` is opaque, real span read) and F7 (phantom fence *before* `<instructions>`, the corruption signature, wins — `start: 0`).
- The 3 pinned throw messages, byte-identical to the TS side: `'locateFrontmatter: missing closing ---'` (F10), `'locateFrontmatter: unterminated <instructions> block'` (F11), `'locateFrontmatter: unterminated Markdown fence'` (F13) — verified by executing the real TS reference (see "Measurement method" below), not by inspecting its source.
- `assertWorkItemApproved(filePath)` is exercised indirectly (not unit-imported): `assert-story-files-fence.red.node.test.ts` spawns the canonical script end-to-end against 9 fixtures covering every branch the plan pins for it (approved/unapproved, LF/CRLF, phantom-inside vs phantom-before, no-frontmatter, and the body-excludes-`<instructions>` STUB-EMPTY case).

## M2 parity (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, read-only)

| File | Scenarios | Result | Which rows flip |
|---|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5 | **5/5 red** | every scenario fails on the `.cleargate/templates/epic.md` (BUG-090) row: `current hash mismatch ... equal to the baseline hash means the delta has not landed` |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15 | **15/15 red** | same row, same reason, across all 15 host/scenario combinations |

Both parity files flip in full — 20/20 — with no other row or scenario affected, and no count change (matches "Both parity files flip, 20 runs, with no count change"). The 3 template rows (epic/story/hotfix) pin **literal** target hashes (their post-delta bytes are fully specified by the plan), so they read red directly against the still-unchanged canonical bytes rather than through a refuse-baseline function. The 2 script rows (`assert_story_files.mjs`, `close_sprint.mjs`) use the refuse-baseline pattern (BUG-085/M3-A54), since their post-delta bytes are the Developer's.

I independently confirmed all 5 canonical payload files are still byte-identical to their pinned M2-baseline hashes at this red commit (the M5-fixwave entry-gate condition holds):

```
epic.md            bb33870663319bad4e4cd45bc84701b516f2abd782206523417daec9005257ac
story.md           862099f8bce51664a0fe66c9f33a2a623cfeec6e4fe4eafaf3ec59212ecc9f21
hotfix.md          2a75055eb5d0e9591e7741d3af8ff7917303863a5ee649c79aeffc8ac49195e2
assert_story_files.mjs  ef7b02262e9a9fbb3ad4a52548f01cee7f8d62577c98c9303612b771d808441d
close_sprint.mjs        76098f3625a1938da6fe6e1a09935ff7e7f5c25f899509f70f92244156af9246
```
(mode 644 on all five)

## Anchors re-verified green (solo)

| File | Result |
|---|---|
| `test/lib/frontmatter-locator.red.node.test.ts` | 11/11 |
| `test/scripts/test_assert_work_item_files.node.test.ts` | 20/20 |
| `test/commands/sync-acquire.node.test.ts` | 9/9 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60/60 (E5-1, E5-4, E5-6 unchanged) |
| `test/lib/work-item-id.node.test.ts` | 47/47 |
| `test/scripts/no-inline-id-regex.node.test.ts` | 7/7 |
| `test/commands/no-exec-mode-vocab.node.test.ts` | 4/4 |
| `test/scripts/clean-room-baseline-coexistence.red.node.test.ts` (imports `probe-items.mjs`) | 24/24 |
| `test/scripts/status-vocab-phase-b.red.node.test.ts` (runs `prebuild` itself) | 75/75 |
| canonical `bash scaffold/core/.cleargate/scripts/test/test_assert_story_files.sh` | 15/15 |
| `node scripts/check-no-inline-id-regex.mjs` | clean (exit 0) — the new script-spawning test files put no type-word next to an ID escape on one line |
| `npm run typecheck` | clean, re-run after every amendment |

`test/commands/push.node.test.ts` (existing 7), `test/commands/doctor.node.test.ts` (existing 39) and `test/commands/doctor-session-start.node.test.ts` (existing 20) all stayed green inside their own amended-file runs (see per-file table above).

Not independently re-run in this pass (named in the plan, budget-deferred to QA-Verify): the two `claude-adapter-init-parity`/`init-host-parity` files' own non-BUG-090 anchor rows beyond the parity-flip check itself (their green-path assertions were exercised as part of the compare-mode run above, just not itemised row-by-row).

## Measurement method (how the fixtures were validated without reading implementation source)

Per RED-mode's "no implementation Read access" and this dispatch's own hard rule ("No `src/**`, `scaffold/**`, `scripts/**` or template edits"), every fixture's expected behaviour was pinned by **executing** the already-shipped reference implementation (`src/lib/frontmatter-locator.ts`'s `locateFrontmatter`, already merged by BUG-067) and the **current** canonical scripts (`assert_story_files.mjs`, `close_sprint.mjs`) against hand-built fixtures in a scratch dir — never by reading their source. This surfaced two behaviours the blueprint's prose didn't spell out byte-for-byte, both now flashcarded above: Step 2.6c's `'no-op'` verdict path is completely silent (not a warning) on an `<instructions>`-led already-Completed parent, and `canonicalPath('.')` resolves to `scaffold/core`, not `CLI_ROOT`.

## Spec-Gap

None. The blueprint (`plans/M5-fixwave.md` BUG-090 + FW-A1/A2/A3/A4, `plans/replan-contract-first.md` §2/§3/§9) fully specifies the contract, fixtures, and expected messages; every ambiguity it flags (the phantom-fence Gherkin contradiction, FW-A1) was already resolved by the Architect before this dispatch.

## Git status (all three trees, post-commit)

```
git -C .worktrees/BUG-090/cleargate-cli status --porcelain   → (empty)
git -C .worktrees/BUG-090 status --porcelain                 → (empty)
git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
The four outer-meta-repo modifications are pre-existing orchestrator/ledger artifacts (session totals, events log, sprint state, token ledger) — not touched by this dispatch.
