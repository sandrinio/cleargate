# DevOps Report — STORY-058-07

role: devops

CLI-only story (Rule 15 cli-only variant, same pattern as STORY-058-03/-04/-05/-06) — no outer half, no worktree. QA-Verify round-2 PASS and Architect post-flight round-2 PASS both on record before this dispatch (`STORY-058-07-qa.md`, `STORY-058-07-arch.md`); round-1 Architect post-flight was FAIL (plan gap, remediated per M3-A44/M3-A52/M3-A53). One merge round, no conflicts.

## Outer Status — START

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2141-1694-32095.json
```

## Pre-Merge

| Check | Expected | Actual | Result |
|---|---|---|---|
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |
| `git -C $CLI rev-parse main` | `170ac4c` | `170ac4c5b2095f602aa0dbc11282416dac0a4cb2` | PASS |
| Story tip | `384a628` on `4394c9b` → `b146faf` → `fe11c1d` → `23e8280` → `170ac4c` | confirmed via `git log --oneline -6 story/STORY-058-07` | PASS |
| Pre-merge compat manifest `.files` array saved | 74 entries | saved to scratch (`pre-merge-manifest-files-07.json`) | PASS |
| `git -C $CLI checkout main` | switches cleanly | `Switched to branch 'main'` | PASS |

## Merge Result

- `git -C $CLI merge --no-ff story/STORY-058-07 -m "merge(story/STORY-058-07): per-host doctor, upgrade, uninstall and prune"` — merge made by the `ort` strategy, no conflicts.
- Merge commit SHA: **`b100ea808178ac6b63c7b4a8715fa72f315ec432`**
- Diff stat: **20 files changed, 2895 insertions(+), 143 deletions(-)**
  - `CHANGELOG.md`, `src/cli.ts`, `src/commands/doctor.ts`, `src/commands/uninstall.ts`, `src/commands/upgrade.ts`, `src/hosts/claude.ts`, `src/hosts/manifest-query.ts` (new), `src/hosts/types.ts`, `src/init/merge-settings.ts` (new), `src/lib/manifest.ts`, `src/lib/settings-json-surgery.ts`
  - Tests: `test/commands/doctor-per-host.red.node.test.ts` (new), `test/commands/lifecycle-per-host.red.integration.node.test.ts` (new), `test/commands/uninstall-per-host.red.node.test.ts` (new), `test/commands/uninstall-reinit.red.node.test.ts` (new), `test/commands/upgrade-per-host.red.node.test.ts` (new), `test/helpers/host-fixtures.ts` (new), `test/helpers/init-fixture.ts`, `test/hosts/host-adapter-contract.red.node.test.ts`, `test/hosts/manifest-query.red.node.test.ts` (new)
- `git -C $CLI diff 170ac4c..main --stat -- scaffold` → **empty** (confirmed no canonical scaffold touched).

## Full Suite (once, on main)

`cd $CLI && npm test` → **2944 tests, 2942 pass, 0 fail, 2 skipped** (duration_ms 351507, ~5m52s).

**Expected-count reconciliation:** dispatch predicted post-(-05) baseline 2902 + 42 new = 2944 (`manifest-query.red` 6, `doctor-per-host.red` 10, `upgrade-per-host.red` 6, `uninstall-per-host.red` 16, `uninstall-reinit.red` 4; `lifecycle-per-host.red.integration` excluded by the default glob; `host-adapter-contract` stays 19). Actual = 2944, 0 fail, 2 skipped. **Exact match, no reconciliation needed.**

No halt condition met — full suite is green against the reconciled baseline.

## Rule-14 Outer Revert

- `git -C $OUTER diff --stat -- .cleargate/delivery` → **29 files changed, 37 insertions(+), 37 deletions(-)**.
- Sampled 2 diffs: `BUG-071_existing_surfaces_sentinel_contradicts_template.md` and `STORY-058-07_per_host_doctor_upgrade_uninstall_scoping.md` — both pure `parent_cleargate_id: null → "..."` noise from the full-suite back-sync, no content changes.
- `git -C $OUTER checkout -- .cleargate/delivery/` applied.
- Post-revert `git -C $OUTER status --porcelain`:
  ```
   M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
   M .cleargate/sprint-runs/SPRINT-41/events.jsonl
   M .cleargate/sprint-runs/SPRINT-41/state.json
   M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
  ```
  Only hook-owned ledger/state files remained modified — no delivery noise left behind. (Per the 2026-09-25T09:50Z amendment, Rule 14's MANIFEST revert is a no-op — nothing regenerates `cleargate-planning/MANIFEST.json` any more.)
- **Anomaly (not caused by this dispatch):** the untracked `.pending-task-2141-1694-32095.json` file present in the outer status at dispatch start was no longer present by the end of the dispatch — this DevOps dispatch never wrote to or deleted it; it is outside `.cleargate/delivery` and outside this story's scope. Same class of anomaly noted in `STORY-058-05-devops.md`. Flagging for the orchestrator, not reverting/recreating anything.

## BD (`npm run build`, on main)

- Prebuild: `[prebuild] cleargate-planning payload composed: 80 files`, `[prebuild] scaffold split view composed: 80 files`, `[build-manifest] 74 files → .../MANIFEST.json`. No unclassified warning. Matches expected (80/80/74).

**Payload identity (NUL-safe, relative paths).** `B=/private/tmp/claude-501/cg5801/payload-baseline`, `T=$CLI/templates/cleargate-planning`.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `(cd $B && find . -type f ! -name MANIFEST.json -print0 \| sort -z \| xargs -0 shasum -a 256 \| shasum -a 256)` vs same in `$T` | equal | both `1011327db670ee6448f02386a5f2c2c2d442f751c1eafbaace5c71ae7f8118fb` | PASS |
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) | PASS |

**MANIFEST `.files` array — pre-merge vs post-BD deep-equal check** (node script compared `JSON.stringify` of both arrays): pre count 74, post count 74, **deep-equal: true**. Confirms -07 changes no scaffold.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `cmp $CLI/dist/MANIFEST.json $T/MANIFEST.json` | exit 0 | exit 0 | PASS |
| `node $CLI/dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | `OK — <n> files, payload 80`, no REFUSING line | `[verify-pack] OK — 196 files, payload 80, version 0.26.1.` — no REFUSING line | PASS (n=196) |
| `dist/cli.js` carries `selectEntriesForHosts` (`command grep -a -c`) | present | 4 occurrences | PASS |
| `dist/cli.js` carries `supersedeHookCommands` (`command grep -a -c`) | present | 3 occurrences | PASS |
| `dist/cli.js` carries `mergeSurgeryTarget` (`command grep -a -c`) | present | 3 occurrences | PASS |
| `dist/cli.js` carries `--host applies only to --check-scaffold` (`command grep -a -c`) | present | 1 occurrence | PASS |
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |

## Real-Dist Smokes (M3-A45 + M3-A52; SMOKE RULE followed — every writing command as one literal-path `(cd <mktemp> && …)` call, never backgrounded, never relying on a prior `cd`, never `--cwd $OUTER`)

**(0) Help text (read-only, any cwd):**

| Check | Expected | Actual | Result |
|---|---|---|---|
| `doctor --help` lists `--host` | yes | `--host <name>  restrict --check-scaffold to one installed host` | PASS |
| `uninstall --help` lists `--host` | yes | `--host <name>  uninstall one host adapter; the last host uninstalls ClearGate entirely` | PASS |

**(1) `T0=$(mktemp -d)` → `/var/folders/wf/.../tmp.YcitetByq3`, echoed before use.** Copied OUTER's real 0.10.0 legacy `.install-manifest.json` snapshot into the room, then:

```
(cd $T0 && mkdir -p .cleargate && cp $OUTER/.cleargate/.install-manifest.json .cleargate/ && node $CLI/dist/cli.js doctor --check-scaffold --cwd $T0)
```

| Check | Expected | Actual | Result |
|---|---|---|---|
| `Scaffold drift:` line format | followed by exactly `  core: …` and `  claude: …` | `Scaffold drift: 0 user-modified, 0 upstream-changed, 0 both-changed, 0 clean` / `  core: 0 …` / `  claude: 0 …` | PASS |
| Exit code | recorded | `0` | recorded |

- All-zero counts are the correct measured behavior, not a gap: `classify()` (`src/lib/manifest.ts:333-369`) returns `'untracked'` for any entry whose `currentSha === null` (missing live file), and `'untracked'` is excluded from the four printed states (`user-modified`/`upstream-changed`/`both-changed`/`clean`). Since T0 has no scaffold files at all — only the copied legacy manifest — every selected entry is `untracked` and drops out of the visible counts, giving `0/0/0/0` with exit 0. This is the legacy-snapshot path witnessed on real bytes, per M3-A45's intent.
- `T0` deleted via literal `rm -rf -- /var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/tmp.YcitetByq3`; confirmed gone (`ls` → No such file or directory).

**(2) `T1=$(mktemp -d)` → `/var/folders/wf/.../tmp.HZFjdqSJh4`, echoed before use.**

| Step | Command | Expected | Actual | Result |
|---|---|---|---|---|
| a | `(cd $T1 && git init -q && node $CLI/dist/cli.js init --yes --pin 0.0.0-m3)` | exit 0 | exit 0, 80 files created | PASS |
| b | `(cd $T1 && node $CLI/dist/cli.js doctor --check-scaffold)` | prints the two owner lines | `Scaffold drift: 0 user-modified, 1 upstream-changed, 0 both-changed, 72 clean` / `Run cleargate upgrade to review.` / `  core: 0 user-modified, 1 upstream-changed, 0 both-changed, 48 clean` / `  claude: 0 user-modified, 0 upstream-changed, 0 both-changed, 24 clean`; exit 0 | PASS |
| c | `(cd $T1 && node $CLI/dist/cli.js doctor --check-scaffold --host nope)` | exit 2 | `cleargate doctor: host "nope" is not installed (installed: claude)`; exit 2 | PASS |
| d | `(cd $T1 && node $CLI/dist/cli.js upgrade --dry-run)` | exit 0, no `[upgrade] hint:` line | exit 0; `command grep -c "\[upgrade\] hint:"` → 0 occurrences | PASS |
| e | `(cd $T1 && node $CLI/dist/cli.js uninstall --dry-run --yes)` | exit 0; `.claude/settings.json` under neither `[remove]` nor `[skip]` | exit 0; `command grep -c "settings.json"` → 0 occurrences | PASS |
| f | `(cd $T1 && node $CLI/dist/cli.js uninstall --host bogus --dry-run)` | exit 2 | `cleargate uninstall: Unknown host "bogus". Valid hosts: claude.`; exit 2 | PASS |

The 1 `upstream-changed` entry in step (b) is expected: the room was initialized with `--pin 0.0.0-m3` (a synthetic pin distinct from the package's build-time placeholder substitution), so one pin-aware hook file's install-recorded sha diverges from the package sha while current == install. This does not affect any PASS/FAIL criterion above.

**(3) Same `$T1`, one call (M3-A52 — re-init must not read the terminal):**

```
(cd $T1 && node $CLI/dist/cli.js uninstall --yes --force && node $CLI/dist/cli.js init --yes --pin 0.0.0-m3 </dev/null && diff .claude/settings.json $CLI/templates/cleargate-planning/.claude/settings.json && echo SMOKE3-OK)
```

| Check | Expected | Actual | Result |
|---|---|---|---|
| `diff .claude/settings.json <payload>/.claude/settings.json` | empty | empty (no output) | PASS |
| `SMOKE3-OK` printed | yes | printed | PASS |
| Overall exit | 0 | 0 | PASS |
| `Restore preserved items? [Y/n]` prompt | appears despite `--yes`, takes default (Y) at EOF | appeared: `Detected previous ClearGate install (uninstalled …, prior version 0.26.1). Restore preserved items? [Y/n]`; `[preserved] .cleargate/FLASHCARD.md` restored | PASS (M3-A52 confirmed) |

`T1` deleted via literal `rm -rf -- /var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/tmp.HZFjdqSJh4`; confirmed gone (`ls` → No such file or directory).

## Mirror Parity Audit

Not applicable — `git -C $CLI diff 170ac4c..main --stat -- scaffold` is empty; this story touched no canonical scaffold surface (`src/`, `test/` only). No mirror re-sync is required.

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
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 pass |
| `test/commands/doctor-drift-guard.node.test.ts` | 7/7 pass |
| `test/commands/doctor-retired-field.red.node.test.ts` | 3/3 pass |
| `test/changelog-format.node.test.ts` | 5/5 pass |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag) | 5/5 pass |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare, same baseline) | 15/15 pass |

**No halt.** All required post-BD dist-spawning tests pass clean.

## Baseline Integrity

- `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425 files** — matches expected.
- `find ... -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — **exact match** to the expected digest. Baseline directory kept intact (compare-only; retained until M3 closes).

## Cleanup

- `git -C $CLI branch -d story/STORY-058-07` → `Deleted branch story/STORY-058-07 (was 384a628)` — fully merged, non-force delete succeeded (lowercase `-d` did not refuse).
- No worktree existed for this cli-only story.

## State Transition

- `CLEARGATE_STATE_FILE=$OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs STORY-058-07 "Done"` → `Updated STORY-058-07: state="Done"`.
- Confirmed via `state.json`: `stories["STORY-058-07"] = { "state": "Done", "qa_bounces": 0, "arch_bounces": 2, ... }`.
- Transitioned at: `2026-09-26T00:18:31.372Z`.

## Outer Status — END

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Compared to START: `events.jsonl` and `state.json` are newly modified vs. what a bare hook-tick would show, both hook/state-owned (this dispatch's own Done transition + event log), matching the allowed exception list. The untracked `.pending-task-2141-1694-32095.json` file from START is absent at END — see the Rule-14 anomaly note above; not created, edited, or deleted by this DevOps dispatch. This devops report itself is additionally untracked (per instructions, not committed by DevOps).

## Commit Ledger (this round)

| SHA | Repo | Message |
|---|---|---|
| `b100ea8` | cli | merge(story/STORY-058-07): per-host doctor, upgrade, uninstall and prune |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |

## Flashcards

```yaml
flashcards_flagged: []
```

STATUS=done
