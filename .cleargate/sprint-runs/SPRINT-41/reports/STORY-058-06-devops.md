# DevOps Report — STORY-058-06

role: devops

CLI-only story (Rule 15 cli-only variant, same pattern as STORY-058-03/-04) — no outer half, no worktree. QA-Verify PASS and Architect post-flight PASS both on record before this dispatch (`STORY-058-06-qa.md`, `STORY-058-06-arch.md`). One merge round, no conflicts.

## Pre-Merge

| Check | Expected | Actual | Result |
|---|---|---|---|
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |
| `git -C $CLI rev-parse main` | `2e566b5` | `2e566b513f1c3ca8a242802b671bfa5d5ae925a6` | PASS |
| Story tip | `10176ea` on `e990607` → `3871857` → `2e566b5` | confirmed via `git log --oneline -5 story/STORY-058-06` | PASS |
| `git -C $CLI checkout main` | switches cleanly | `Switched to branch 'main'` | PASS |

## Merge Result

- `git -C $CLI merge --no-ff story/STORY-058-06 -m "merge(story/STORY-058-06): install-manifest owner + snapshot hosts, legacy default, FU-1..FU-4"` — merge made by the `ort` strategy, no conflicts.
- Merge commit SHA: **`6b5ee5c6c436b45b0f38301d602ce3b09d914d3d`**
- Diff stat: **16 files changed, 3019 insertions(+), 699 deletions(-)**
- `git -C $CLI diff 2e566b5..main --stat -- scaffold` → **empty** (confirmed no canonical scaffold touched — matches dispatch's "Canonical scaffold touched? no").

## Full Suite (once, on main)

`cd $CLI && npm test` → **2885 tests, 2883 pass, 0 fail, 2 skipped** (duration_ms 316536, ~5m17s).

**Expected-count reconciliation** (dispatch asked to compute the exact number, not just cite the plan's approximate formula):

- Baseline (post-`-04` merge, per `STORY-058-04-devops.md`): 2850 total, 2848 pass, 0 fail, 2 skipped.
- `+18` `test/lib/manifest-host-ownership.red.node.test.ts` (new, now default-glob, all-pass)
- `+13` `test/commands/init-host-snapshot.red.node.test.ts` (new)
- `+7` `test/scripts/verify-pack-compat.red.node.test.ts` (new)
- Delta of the two named amended default-glob files, measured directly (not assumed) by running each file's **pre-merge** content in a scratch detached worktree at `2e566b5` (node_modules symlinked from main, worktree removed after measuring):
  - `test/scripts/scaffold-layout.red.node.test.ts`: **18 → 18, delta 0.** The `2e566b5..main` diff on this file only rewrites the assertion body *inside* the existing scenario 6-7 `it()` block (compares against `buildViewManifest` instead of the legacy `planningRoot` walk) — no new test block is added. (The TPV report's "(18)" column header for this file already reflected 18 pre-existing tests, not a count increase; its "17→18/18" row describes pass/fail state at the intermediate re-seal commit, not a file-size delta.)
  - `test/commands/init-from-source.node.test.ts`: **14 → 11, delta −3.** The 4-test `describe('QA bounce 1: resolveCliPackageRoot ...')` block is deleted (that helper is retired by FU-2) and replaced by the 1-test `describe('STORY-058-06 scenario 19: ...')` block (net −3).
  - (`init-from-source-dist.integration.node.test.ts`'s 1→2 delta is **not** counted here — it is excluded from the default glob; confirmed via `package.json`'s `"test"` script: `'!test/**/*.integration.node.test.ts'`.)
- **Reconciled expected total: 2850 + 38 − 3 = 2885.** Actual = 2885. **Exact match, 0 fail.** Skip count (2) unchanged from baseline.

No halt condition met — full suite is green against the reconciled baseline.

## Rule-14 Outer Revert

- `git -C $OUTER diff --stat -- .cleargate/delivery` → **29 files changed, 39 insertions(+), 39 deletions(-)**.
- Sampled 2 diffs: `STORY-058-10_codex_payload_surfaces.md` and `BUG-071_existing_surfaces_sentinel_contradicts_template.md` — both pure `parent_cleargate_id`/`sprint_cleargate_id: null → "..."` noise from the full-suite back-sync, no content changes.
- `git -C $OUTER checkout -- .cleargate/delivery/` applied.
- Post-revert `git -C $OUTER status --porcelain`:
  ```
   M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
   M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
  ```
  Only hook-owned ledger files remained modified — no delivery noise left behind.

## BD (`npm run build`, on main)

- Prebuild: `[prebuild] cleargate-planning payload composed: 80 files`, `[prebuild] scaffold split view composed: 80 files`, `[build-manifest] 74 files → .../MANIFEST.json`. No unclassified warning. Matches expected (80/80/74).

**Payload identity (M3-A12, NUL-safe, relative paths).** `B=/private/tmp/claude-501/cg5801/payload-baseline`, `T=$CLI/templates/cleargate-planning`.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `(cd $B && find . -type f ! -name MANIFEST.json -print0 \| sort -z \| xargs -0 shasum -a 256 \| shasum -a 256)` vs same in `$T` | equal | both `1011327db670ee6448f02386a5f2c2c2d442f751c1eafbaace5c71ae7f8118fb` | PASS |
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) | PASS |

**MANIFEST delta is `owner` only** (node script: loads both MANIFESTs, asserts every `$T` entry's `owner ∈ {core, claude}` with `owner === 'claude'` iff under `.claude/`, strips `owner` from each `$T` entry and compares `JSON.stringify` against `$B`, checks `cleargate_version` equality and absence of a `hosts` key on either side):

```
PASS — 74 entries, all owner-valid; files-minus-owner identical to baseline (74 entries); cleargate_version=0.26.1; no hosts key on either side.
```

| Check | Expected | Actual | Result |
|---|---|---|---|
| `cmp $CLI/dist/MANIFEST.json $T/MANIFEST.json` | exit 0 | exit 0 | PASS |
| `node $CLI/dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | `OK — 196 files, payload 80`, no REFUSING line | `[verify-pack] OK — 196 files, payload 80, version 0.26.1.` — no REFUSING line | PASS. File count unchanged at 196 (`verify-pack-checks.mjs`, though new, is a `scripts/` helper — not itself packed into the npm tarball, so it did not move the count) |
| Split-view `templates/scaffold/{core,hosts/claude}/MANIFEST.json` owners + count sum | 74 | `core`: 50 entries, owner=`core` only; `hosts/claude`: 24 entries, owner=`claude` only; sum 74 | PASS |
| `dist/cli.js` carries `buildInstallView` | present | 2 occurrences (`grep -a -c`; plain `grep -c` returned nothing on this file's very-long-line text — noted below as a flashcard candidate) | PASS |
| `dist/cli.js` carries `mergeInstalledHosts` | present | 2 occurrences | PASS |
| `dist/cli.js` carries `installedHosts` | present | 2 occurrences | PASS |
| `dist/cli.js` does NOT contain `build-manifest.ts` | 0 occurrences | **2 occurrences found** — see below | **FLAGGED, not a halt** |
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |

**`build-manifest.ts` string mismatch — investigated, not a regression.** The two hits are both pre-existing and unrelated to the retired dynamic `.ts` import:
1. Line 80: the CLI's own `package.json` `"prebuild"` script text (`"node scripts/copy-planning-payload.mjs && tsx scripts/build-manifest.ts"`), embedded in `dist/cli.js` because the bundle inlines `package.json` for version/script metadata. This string is unchanged by this story — `package.json`'s `prebuild` script itself was not touched.
2. Line 2647: a prose comment inside `src/lib/scaffold-layout.mjs` (`// build-manifest.ts — drop one without the other and 'upgrade' reports missing files.`) — a file this story does not touch (owned by `-01`/`-02`).

The actual thing the assertion means to verify — the dynamic `import()` of `scripts/build-manifest.ts` from the `--from-source` bridge in `init.ts` — **is** retired: `src/commands/init.ts` contains neither `resolveCliPackageRoot` nor `build-manifest` (Dev's own static check, reproduced independently: `command grep -n "resolveCliPackageRoot\|build-manifest" src/commands/init.ts` → no output). Reporting as a dispatch-text-vs-reality mismatch rather than silently passing it.

## Real-Dist Smokes (fresh `git init` targets)

**(a) `init --yes`:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| Exit code | 0 | 0 | PASS |
| `.install-manifest.json` last key | `hosts` | `hosts` | PASS |
| `hosts` value | `["claude"]` | `["claude"]` | PASS |
| Every entry has `owner ∈ {core, claude}` | yes | 0 missing/bad-owner entries | PASS |
| `cleargate_version` | `0.26.1` | `0.26.1` | PASS |
| Re-init (`init --yes` again) exit code | 0 | 0 | PASS |
| `hosts` after re-init | `["claude"]` | `["claude"]` | PASS |

**(b) `init --from-source $CLI/scaffold --yes`:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| Exit code | 0 | 0 | PASS |
| Snapshot entries all have `owner` | yes | 0 missing/bad-owner of 74 | PASS |
| `hosts` | `["claude"]` | `["claude"]` | PASS |
| `cleargate_version` | `0.26.1` | `0.26.1` | PASS |
| `$TMPDIR/cleargate-from-source-*` before run | none | none | — |
| `$TMPDIR/cleargate-from-source-*` after run | none (no leftover) | none | PASS |

**(c) Legacy upgrade path** (`init --yes` then overwrite `.install-manifest.json` with `test/fixtures/manifest/legacy-install-manifest-0.10.0.json`):

| Check | Expected | Actual | Result |
|---|---|---|---|
| `doctor` exit code | no crash | 0 | PASS |
| `doctor --check-scaffold` exit code | no crash | 0 (`Scaffold drift: 0 user-modified, 0 upstream-changed, 62 both-changed, 11 clean`) | PASS |
| Snapshot shasum before doctor | — | `fa0c79ac7f2b61295d02c75a5c5a01360c8b1483a0fd520bb24c1b05fd0d39c7` | — |
| Snapshot shasum after both doctor calls | byte-unchanged | `fa0c79ac7f2b61295d02c75a5c5a01360c8b1483a0fd520bb24c1b05fd0d39c7` | PASS (identical) |

All three smoke targets (a/b/c) deleted individually via literal-absolute-path `rm -rf --` calls, one per target; each confirmed gone by a follow-up `ls` ("No such file or directory").

## Post-BD Re-Runs, Solo

| File | Result |
|---|---|
| `test/commands/init-restart-banner.node.test.ts` | 3/3 pass |
| `test/commands/init-no-dep0190.node.test.ts` | 2/2 pass |
| `test/cli.node.test.ts` | 23/23 pass |
| `test/integration/init-pre-member-isolation.node.test.ts` | 2/2 pass |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2/2 pass |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 pass |
| `test/lib/manifest-legacy-snapshot.red.integration.node.test.ts` | 1/1 pass |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag) | 5/5 pass |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare, same baseline) | 15/15 pass |

**No halt.** All required post-BD dist-spawning tests pass clean.

## Baseline Integrity

- `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425 files** — matches expected.
- `find ... -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — **exact match** to the expected digest. Baseline directory kept intact (compare-only; retained until M3 closes).

## Mirror Parity Audit

Not applicable — `git -C $CLI diff 2e566b5..main --stat -- scaffold` is empty; this story touched no canonical scaffold surface (`src/`, `scripts/`, `test/` only). No mirror re-sync is required.

## Cleanup

- `git -C $CLI branch -d story/STORY-058-06` → `Deleted branch story/STORY-058-06 (was 10176ea)` — fully merged, non-force delete succeeded (lowercase `-d` did not refuse).
- No worktree existed for this cli-only story; `git worktree list` shows only the main checkout at `6b5ee5c [main]`.

## State Transition

- `CLEARGATE_STATE_FILE=$OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs STORY-058-06 "Done"` → `Updated STORY-058-06: state="Done"`.
- Confirmed via `state.json`: `stories["STORY-058-06"] = { "state": "Done", "qa_bounces": 0, "arch_bounces": 1, ... }`.
- Transitioned at: `2026-09-25T19:50:19.316Z`.

## Outer Repo State (not committed by DevOps)

Post-cleanup `git -C $OUTER status --porcelain` shows only hook/state-owned files: `.session-totals.json`, `events.jsonl`, `state.json` (this dispatch's own Done transition), `token-ledger.jsonl`. This devops report itself is additionally untracked. Per instructions, DevOps does not commit in the outer repo.

## Commit Ledger (this round)

| SHA | Repo | Message |
|---|---|---|
| `6b5ee5c` | cli | merge(story/STORY-058-06): install-manifest owner + snapshot hosts, legacy default, FU-1..FU-4 |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |

## Flashcards

```yaml
flashcards_flagged:
  - "2026-09-25 · #test-harness #devops · plain grep -c silently no-ops on dist/cli.js's very-long-line text on macOS; use grep -a -c for dist bundles."
```

STATUS=done
