# DevOps Report — STORY-058-05

role: devops

CLI-only story (Rule 15 cli-only variant, same pattern as STORY-058-03/-04/-06) — no outer half, no worktree. QA-Verify PASS and Architect post-flight PASS both on record before this dispatch (`STORY-058-05-qa.md`, `STORY-058-05-arch.md`). One merge round, no conflicts.

## Outer Status — START

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-0-10074-19547.json
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-1816-20848-10856.json
```

## Pre-Merge

| Check | Expected | Actual | Result |
|---|---|---|---|
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |
| `git -C $CLI rev-parse main` | `6b5ee5c` | `6b5ee5c6c436b45b0f38301d602ce3b09d914d3d` | PASS |
| Story tip | `3617c67` on `156c864` → `764f063` → `6b5ee5c` | confirmed via `git log --oneline -5 story/STORY-058-05` | PASS |
| Pre-merge compat manifest `.files` array saved | 74 entries | saved to scratch (`pre-merge-manifest-files.json`) | PASS |
| `git -C $CLI checkout main` | switches cleanly | `Switched to branch 'main'` | PASS |

## Merge Result

- `git -C $CLI merge --no-ff story/STORY-058-05 -m "merge(story/STORY-058-05): cleargate host list | add | remove"` — merge made by the `ort` strategy, no conflicts.
- Merge commit SHA: **`170ac4c5b2095f602aa0dbc11282416dac0a4cb2`**
- Diff stat: **7 files changed, 1776 insertions(+), 14 deletions(-)**
  - `src/cli.ts`, `src/commands/host.ts` (new), `src/hosts/claude.ts`, `src/hosts/lifecycle.ts` (new), `src/hosts/types.ts`, `test/commands/host-cli.red.integration.node.test.ts` (new), `test/hosts/host-lifecycle.red.node.test.ts` (new)
- `git -C $CLI diff 6b5ee5c..main --stat -- scaffold` → **empty** (confirmed no canonical scaffold touched).

## Full Suite (once, on main)

`cd $CLI && npm test` → **2902 tests, 2900 pass, 0 fail, 2 skipped** (duration_ms 390827, ~6m31s).

**Expected-count reconciliation:** dispatch predicted post-(-06) baseline 2885 + 17 new (`test/hosts/host-lifecycle.red.node.test.ts`, default glob) = 2902; `host-cli.red.integration.node.test.ts` is `.integration.` and excluded from the default glob (`package.json`'s `"test"` script excludes `!test/**/*.integration.node.test.ts`). Actual = 2902, 0 fail, 2 skipped (unchanged from -06 baseline). **Exact match.**

No halt condition met — full suite is green against the reconciled baseline.

## Rule-14 Outer Revert

- `git -C $OUTER diff --stat -- .cleargate/delivery` → **29 files changed, 39 insertions(+), 39 deletions(-)**.
- Sampled 2 diffs: `STORY-058-05_host_lifecycle_commands.md` and `BUG-071_existing_surfaces_sentinel_contradicts_template.md` — both pure `parent_cleargate_id: null → "..."` noise from the full-suite back-sync, no content changes.
- `git -C $OUTER checkout -- .cleargate/delivery/` applied.
- Post-revert `git -C $OUTER status --porcelain`:
  ```
   M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
   M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
  ```
  Only hook-owned ledger files remained modified — no delivery noise left behind.
- **Anomaly (not caused by this dispatch):** the two untracked `.pending-task-*.json` files present in the outer status at dispatch start were no longer present after the full-suite run — this DevOps dispatch never wrote to or deleted them; they are outside `.cleargate/delivery` and outside this story's scope. Flagging for the orchestrator, not reverting/recreating anything.

## BD (`npm run build`, on main)

- Prebuild: `[prebuild] cleargate-planning payload composed: 80 files`, `[prebuild] scaffold split view composed: 80 files`, `[build-manifest] 74 files → .../MANIFEST.json`. No unclassified warning. Matches expected (80/80/74).

**Payload identity (NUL-safe, relative paths).** `B=/private/tmp/claude-501/cg5801/payload-baseline`, `T=$CLI/templates/cleargate-planning`.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `(cd $B && find . -type f ! -name MANIFEST.json -print0 \| sort -z \| xargs -0 shasum -a 256 \| shasum -a 256)` vs same in `$T` | equal | both `1011327db670ee6448f02386a5f2c2c2d442f751c1eafbaace5c71ae7f8118fb` | PASS |
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) | PASS |

**MANIFEST `.files` array — pre-merge vs post-BD deep-equal check** (node script compared `JSON.stringify` of both arrays): pre count 74, post count 74, **deep-equal: true**. Confirms -05 changes no scaffold.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `cmp $CLI/dist/MANIFEST.json $T/MANIFEST.json` | exit 0 | exit 0 | PASS |
| `node $CLI/dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | `OK — 196 files, payload 80`, no REFUSING line | `[verify-pack] OK — 196 files, payload 80, version 0.26.1.` — no REFUSING line | PASS |
| `dist/cli.js` carries `planHostRemoval` (`command grep -a -c`) | present | 2 occurrences | PASS |
| `dist/cli.js` carries `hostListHandler` (`command grep -a -c`) | present | 2 occurrences | PASS |
| `dist/cli.js` carries `cleargate host` (`command grep -a -c`) | present | 1 occurrence | PASS |
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |

## Real-Dist Smokes (SMOKE RULE followed — every writing command as one literal-path `(cd <mktemp> && …)` call, never backgrounded, never relying on a prior `cd`)

**(a) `host --help`** (read-only, any cwd): lists `list`, `add`, `remove`. PASS.

**(b) `T1=$(mktemp -d)` → `/var/folders/wf/.../tmp.jb87eXyzJS`, echoed before use:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| `(cd $T1 && git init -q && node $CLI/dist/cli.js init --yes)` exit | 0 | 0 | PASS |
| `(cd $T1 && node $CLI/dist/cli.js host list)` exit | 0 | 0 | PASS |
| `host list` line 1 | `installed: claude` | `installed: claude` | PASS |
| `host list` rows | `core` then `claude` | `core files=50 missing=0 healthy=yes`, `claude files=24 missing=0 healthy=yes` | PASS |

**(c) `(cd $T1 && node $CLI/dist/cli.js host remove claude)`:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| Exit code | 1 | 1 | PASS |
| stderr names `cleargate uninstall` | yes | `ERROR: "claude" is the only installed host; ... Run \`cleargate uninstall\` to remove ClearGate entirely.` | PASS |
| `.install-manifest.json` shasum before/after | unchanged | `738433fb...` both times | PASS |

**(d) `(cd $T1 && node $CLI/dist/cli.js host add claude)`:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| Exit code | 0 | 0 | PASS |
| `hosts` snapshot | `["claude"]` | `["claude"]` | PASS |
| `.claude/settings.json` shasum before/after | unchanged | `c36adcfd...` both times | PASS |
| Every stdout line starts `[cleargate host] ` | yes | all 27 lines confirmed | PASS |

**(e) `(cd $T1 && node $CLI/dist/cli.js host add bogus)`:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| Exit code | 2 | 2 | PASS |
| stderr | names unknown host | `ERROR: Unknown host "bogus". Valid hosts: claude.` | PASS |
| `.install-manifest.json` shasum before/after | unchanged | `738433fb...` both times | PASS |

**(f) READ-ONLY in OUTER:** `(cd $OUTER && node $CLI/dist/cli.js host list)` → `installed: claude`, `core files=44 missing=2 healthy=no`, `claude files=21 missing=1 healthy=no`, exit 1 (3 retired paths total, matches TPV expectation). Outer `git status --porcelain` confirmed byte-for-byte identical before and after (f):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

`T1` deleted via literal `rm -rf -- /var/folders/wf/.../tmp.jb87eXyzJS`; confirmed gone (`ls` → No such file or directory).

## Post-BD Re-Runs, Solo

| File | Result |
|---|---|
| `test/commands/init-restart-banner.node.test.ts` | 3/3 pass |
| `test/commands/init-no-dep0190.node.test.ts` | 2/2 pass |
| `test/cli.node.test.ts` | 23/23 pass |
| `test/integration/init-pre-member-isolation.node.test.ts` | 2/2 pass |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2/2 pass |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 pass |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 pass |
| `test/lib/manifest-legacy-snapshot.red.integration.node.test.ts` | 1/1 pass |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag) | 5/5 pass |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare, same baseline) | 15/15 pass |

**No halt.** All required post-BD dist-spawning tests pass clean.

## Baseline Integrity

- `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425 files** — matches expected.
- `find ... -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — **exact match** to the expected digest (verified programmatically, string length 64, character-for-character equal). Baseline directory kept intact (compare-only; retained until M3 closes).

## Mirror Parity Audit

Not applicable — `git -C $CLI diff 6b5ee5c..main --stat -- scaffold` is empty; this story touched no canonical scaffold surface (`src/`, `test/` only). No mirror re-sync is required.

## Cleanup

- `git -C $CLI branch -d story/STORY-058-05` → `Deleted branch story/STORY-058-05 (was 3617c67)` — fully merged, non-force delete succeeded (lowercase `-d` did not refuse).
- No worktree existed for this cli-only story.

## State Transition

- `CLEARGATE_STATE_FILE=$OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs STORY-058-05 "Done"` → `Updated STORY-058-05: state="Done"`.
- Confirmed via `state.json`: `stories["STORY-058-05"] = { "state": "Done", "qa_bounces": 0, "arch_bounces": 1, ... }`.
- Transitioned at: `2026-09-25T21:24:14.492Z`.

## Outer Status — END

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Compared to START: `events.jsonl` and `state.json` newly modified are both hook/state-owned (this dispatch's own Done transition + event log), matching the allowed exception list. The two untracked `.pending-task-*.json` files from START are absent at END — see the Rule-14 anomaly note above; not created, edited, or deleted by this DevOps dispatch. This devops report itself is additionally untracked (per instructions, not committed by DevOps).

## Commit Ledger (this round)

| SHA | Repo | Message |
|---|---|---|
| `170ac4c` | cli | merge(story/STORY-058-05): cleargate host list \| add \| remove |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |

## Flashcards

```yaml
flashcards_flagged: []
```

STATUS=done
