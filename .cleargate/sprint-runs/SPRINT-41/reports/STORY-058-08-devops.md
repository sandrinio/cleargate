# DevOps Report — STORY-058-08

role: devops

Two-repo item (outer meta-repo + `cleargate-cli`), M4 wave12, standard lane, last item before wave13 (STORY-058-09). QA-Verify round 1 FAIL (H17/M4-A5 fail-closed violation) → fixed → round 2 PASS (`reports/STORY-058-08-qa.md`, `QA-R2: PASS`). Architect post-flight round 1 FAIL (no-verifier guard + snapshot-shape crash) → fixed → round 2 PASS (`reports/STORY-058-08-arch.md`, `ARCH-R2: PASS`), conditioned on landing the U9d regression guard before merge (M4-A14). U9d landed as its own qa-red commit (`6251f06`, green on arrival, 42/42) — confirmed present on the cli story branch before this dispatch began.

## Outer Status — START

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2415-94516-25721.json
```

## Pre-Merge

| Check | Expected | Actual | Result |
|---|---|---|---|
| `git -C $OUTER branch --show-current` | `sprint/S-41` | `sprint/S-41` | PASS |
| `git -C $OUTER/.worktrees/STORY-058-08 status --porcelain` | empty | empty | PASS |
| `git -C $OUTER log --oneline -1 story/STORY-058-08` | `31f266f2` | `31f266f2` (on `adde0a23` → `787dc899`) | PASS |
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |
| `git -C $CLI rev-parse main` | `b244551` | `b24455189533a32e5d1d45c326aded1826b5121e` | PASS |
| `git -C $CLI log --oneline -6 story/STORY-058-08` | `6251f06` on `fc0184d` → `4285391` → `9ac0fa3` → `549fdaa` → `81c05e9` → `b244551` | exact match | PASS |
| Pre-merge compat manifest `.files` array saved | 74 entries | saved to scratch (`pre-merge-manifest-files-08.json`) | PASS |
| Required reports present | dev ✓, qa ✓ (round-2 PASS), arch ✓ (round-2 PASS, standard lane) | all three confirmed on disk, verdicts read in full | PASS |

## Merge Result

### OUTER

- `git -C $OUTER checkout sprint/S-41` (already there, HEAD `4bbadd1d`).
- `git -C $OUTER merge --no-ff story/STORY-058-08 -m "merge(story/STORY-058-08): clean-room verification procedure"` — merge made by the `ort` strategy, **no conflicts**.
- Merge commit SHA: **`cb283bab16a42fdc5dae0ef875d914ad90a93241`**
- Diff stat: **1 file changed, 242 insertions(+)** — exactly `.cleargate/knowledge/clean-room-verification.md` (create), as expected.

### CLI

- `git -C $CLI checkout main`.
- `git -C $CLI merge --no-ff story/STORY-058-08 -m "merge(story/STORY-058-08): cleargate verify-install + findCleargatePackageRoot"` — merge made by the `ort` strategy, **no conflicts**.
- Merge commit SHA: **`1b742b3c0ed07394367ed45a595f07b9fde65d2b`**
- Diff stat: **8 files changed, 2529 insertions(+), 19 deletions(-)**:
  - `CHANGELOG.md`, `src/cli.ts`, `src/commands/init.ts`, `src/commands/verify-install.ts` (new), `src/lib/cli-package-root.ts` (new)
  - `test/commands/verify-install-cli.red.integration.node.test.ts` (new), `test/commands/verify-install.red.node.test.ts` (new, includes the U9d guard from `6251f06`), `test/docs/clean-room-verification-doc.red.node.test.ts` (new)
- `git -C $CLI diff b244551..main --stat -- scaffold` → **empty** (no canonical scaffold touched — expected; matches "Canonical scaffold touched? no").

## Full Suite (once, on main)

`cd $CLI && npm test` → **3038 tests, 3036 pass, 0 fail, 2 skipped** (duration_ms 335278.46, ~5m35s).

**Expected-count reconciliation:** dispatch baseline 2987 (post BUG-085) + 51 new (`verify-install.red` 42 including U9d, `clean-room-verification-doc.red` 9; `verify-install-cli.red.integration` excluded by the default glob) = **3038**. Actual = 3038, 0 fail. **Exact match, no reconciliation needed.**

No halt condition met.

## Rule-14 Outer Revert

- `git -C $OUTER diff --stat -- .cleargate/delivery` → **29 files changed, 37 insertions(+), 37 deletions(-)** — pure back-sync noise (`parent_cleargate_id` / timestamp churn from the full-suite run).
- `git -C $OUTER checkout -- .cleargate/delivery/` applied.
- Post-revert `git -C $OUTER status --porcelain`: only the 4 hook-owned ledger/state files remained modified. No delivery noise left behind.
- **Anomaly (not caused by this dispatch):** the untracked `.pending-task-2415-94516-25721.json` file present in the outer status at dispatch start was no longer present by dispatch end — this DevOps dispatch never wrote to or deleted it. Same anomaly class noted in `STORY-058-05-devops.md`, `STORY-058-07-devops.md` and `BUG-085-devops.md`. Flagging for the orchestrator, not reverting/recreating anything.

## BD (`npm run build`, on main)

- Prebuild: `[prebuild] cleargate-planning payload composed: 80 files`, `[prebuild] scaffold split view composed: 80 files`, `[build-manifest] 74 files → MANIFEST.json`. No unclassified warning. Matches expected (80/80/74).

**Payload identity vs post-BUG-085 baseline (NUL-safe, relative paths).** `B=/private/tmp/claude-501/cg5801/payload-baseline-post-085` (from `BUG-085-devops.md`), `T=$CLI/templates/cleargate-planning`.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `(cd $B && find . -type f ! -name MANIFEST.json -print0 \| sort -z \| xargs -0 shasum -a 256 \| shasum -a 256)` | `e44154af06f608c8cb9c83c2b2845527ed489c52740eeec66fd16798a8939a27` | `e44154af06f608c8cb9c83c2b2845527ed489c52740eeec66fd16798a8939a27` | PASS |
| Same command in `$T` | same hash | `e44154af06f608c8cb9c83c2b2845527ed489c52740eeec66fd16798a8939a27` | PASS |
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) | PASS |
| Pre-merge manifest `.files` (74) vs post-BD manifest `.files` (74) — `JSON.stringify` deep-equal | true | true (74/74, deep-equal) | PASS |

Payload is byte-identical to the post-BUG-085 baseline, confirming M4's "byte-neutral" claim (no packed byte changes — the new cli files live outside `package.json`'s `files` set).

| Check | Expected | Actual | Result |
|---|---|---|---|
| `cmp $CLI/dist/MANIFEST.json $T/MANIFEST.json` | exit 0 | exit 0 | PASS |
| `node $CLI/dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | `OK`, no REFUSING | `[verify-pack] OK — 196 files, payload 80, version 0.26.1.` | PASS |
| `dist/cli.js` carries `verifyInstallHandler` (`command grep -a -c`) | present | 2 | PASS |
| `dist/cli.js` carries `findCleargatePackageRoot` (`command grep -a -c`) | present | 3 | PASS |
| `dist/cli.js` carries the "NOT CHECKED — needs a live host session" line | present | 1 (bundled as `NOT CHECKED — needs a live host session:` — esbuild's default unicode escaping of the em-dash; substring-matched without the dash) | PASS |
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |

## Post-BD Smokes on the Real Dist (SMOKE RULE followed)

**(0) Help text (read-only):** `node $CLI/dist/cli.js verify-install --help` → exit 0, lists `--host`, `--json`, `--cwd`. PASS.

**(1) `T=$(mktemp -d)` → `/var/folders/wf/.../tmp.fA0X3oKqeH`, echoed before use.**

```
(cd $T && git init -q && node $CLI/dist/cli.js init --yes && node $CLI/dist/cli.js verify-install; echo exit=$?)
```

- `init` created 80 files; no `cleargate-cli` entry in the room (M4-A1 held).
- `verify-install` printed all 12 `PASS` lines (`snapshot`, `version-match`, `manifest-hosts`, `payload-files`, `pin-substituted`, `gitignore-generated`, `doctor`, `claude.settings-hooks`, `claude.hooks-executable`, `claude.no-foreign-hooks`, `claude.instruction-block`, `claude.mcp-registration`), the 6-item `NOT CHECKED — needs a live host session:` list, and `Result: PASS`. Exit 0.

**(2) Same `$T`, one call:**

```
(cd $T && rm .cleargate/knowledge/cleargate-protocol.md && node $CLI/dist/cli.js verify-install; echo exit=$?)
```

- `payload-files` → `FAIL — missing: .cleargate/knowledge/cleargate-protocol.md (tier protocol)`. `Result: FAIL (1 of 12 checks failed)`. Exit 1. Names the file exactly.

**(3) Same `$T`, one call:**

```
(cd $T && printf null > .cleargate/.install-manifest.json && node $CLI/dist/cli.js verify-install --json; echo exit=$?)
```

- Exit 1, valid parseable JSON, `snapshot` check `status: "fail"`, `details: ["unparseable: .cleargate/.install-manifest.json"]`, checks 2–5 and the 5 claude checks `skip`, `gitignore-generated`/`doctor` still `pass`, `ok: false`.

`$T` deleted via literal `rm -rf -- /var/folders/wf/b825zb5d63vcyjtkq69pdsp40000gn/T/tmp.fA0X3oKqeH`; confirmed gone (`ls` → No such file or directory).

## Mirror Parity Audit

Not applicable — `git -C $CLI diff b244551..main --stat -- scaffold` is empty; this story touched no canonical scaffold surface (`src/`, `test/` only; the doc lives at `.cleargate/knowledge/clean-room-verification.md`, live-only, no `scaffold/core` twin per M4's decision D-1). No mirror re-sync required. No live `.claude/` re-sync performed (dispatch: "-08 changes no scaffold").

## Post-BD Re-Runs, SOLO

| File | Result |
|---|---|
| `test/commands/verify-install-cli.red.integration.node.test.ts` | 5/5 pass |
| `test/cli.node.test.ts` | 23/23 pass |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2/2 pass |
| `test/commands/doctor-drift-guard.node.test.ts` | 13/13 pass |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 pass |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 pass |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 pass |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag) | 5/5 pass |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare, same baseline) | 15/15 pass |

**No halt.** All required post-BD dist-spawning tests pass clean.

## Baseline Integrity

- `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425 files** — matches expected.
- `find ... -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → **`bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`** — exact match to the recorded digest. Baseline directory kept intact (compare-only; retained until M3 closes).

## Cleanup

- `git -C $OUTER worktree remove .worktrees/STORY-058-08` — removed; confirmed absent from `git -C $OUTER worktree list`.
- `git -C $OUTER branch -d story/STORY-058-08` → `Deleted branch story/STORY-058-08 (was 31f266f2)`.
- `git -C $CLI branch -d story/STORY-058-08` → `Deleted branch story/STORY-058-08 (was 6251f06)`.
- Both deletes used lowercase `-d`; neither refused (fully merged).

## State Transition

- `CLEARGATE_STATE_FILE=$OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs STORY-058-08 "Done"` → `Updated STORY-058-08: state="Done"`.
- Confirmed via `state.json`: `stories["STORY-058-08"] = { "state": "Done", "qa_bounces": 1, "arch_bounces": 2, ... }`.
- Transitioned at: `2026-09-26T05:15:03.686Z`.

## Outer Status — END

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Compared to START: `events.jsonl` and `state.json` are newly modified beyond a bare hook-tick (this dispatch's Done transition + event log) — both hook/state-owned, matching the allowed exception list. The untracked `.pending-task-2415-94516-25721.json` present at START is absent at END — see the Rule-14 anomaly note above; not created, edited, or deleted by this DevOps dispatch. This devops report itself is untracked/new (not committed by DevOps, per instructions).

## CLI Status — END

```
?? cleargate-0.25.0.tgz
```

CLI left checked out on `main` at `1b742b3c`. No other changes.

## Commit Ledger (this dispatch)

| SHA | Repo | Message |
|---|---|---|
| `cb283bab` | outer | merge(story/STORY-058-08): clean-room verification procedure |
| `1b742b3c` | cli | merge(story/STORY-058-08): cleargate verify-install + findCleargatePackageRoot |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |

## Script Incidents

None. All invocations were direct `git`/`npm`/`node`/`tsx --test`/`cmp`/`diff`/`shasum`/`find` commands, or `update_state.mjs` invoked directly per the dispatch's own step 10 (matching the precedent in `BUG-085-devops.md`/`STORY-058-07-devops.md`) — no wrapped `.cleargate/scripts/run_script.sh` invocation was required or attempted.

## Flashcards

```yaml
flashcards_flagged: []
```

STATUS=done
