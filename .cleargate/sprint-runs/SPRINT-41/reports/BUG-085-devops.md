# DevOps Report — BUG-085

role: devops

Two-repo item (outer meta-repo + `cleargate-cli`), standard lane, last M3 item. QA-Verify PASS (`reports/BUG-085-qa.md`) and Architect post-flight PASS (`reports/BUG-085-arch.md`) both on record before this dispatch. Ends with the boundary step RS-BUG085 (M3-A61 R1–R10), which replaces DevOps steps 6–10 of the BUG-085 blueprint and re-syncs one live hook.

## Outer Status — START

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2256-89420-25092.json
```

## Pre-Merge

| Check | Expected | Actual | Result |
|---|---|---|---|
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |
| `git -C $OUTER/.worktrees/BUG-085 status --porcelain` | empty | empty | PASS |
| `git -C $CLI rev-parse main` | `b100ea8` | `b100ea8` | PASS |
| Story tip (cli) | `12ae157` on `8425816` → `ec29f45` → `b100ea8` | confirmed via `git log --oneline -6 story/BUG-085` | PASS |
| Story tip (outer) | `68fd9426` on `ac6eb16e` | confirmed via `git log --oneline -3 story/BUG-085` | PASS |
| Pre-merge compat manifest `.files` array saved | 74 entries | saved to scratch (`pre-merge-manifest-files-BUG-085.json`) | PASS |

Required reports present at dispatch: `BUG-085-dev.md` ✓, `BUG-085-qa.md` ✓, `BUG-085-arch.md` ✓ (standard lane).

## Merge Result

### OUTER

- `git -C $OUTER checkout sprint/S-41` (already there, HEAD `75ee2aca`).
- `git -C $OUTER merge --no-ff story/BUG-085 -m "merge(story/BUG-085): bug068 repoint + CLAUDE.md drift pointer"` — merge made by the `ort` strategy, **no conflicts**.
- Merge commit SHA: **`ccdeb4b3cdff477645ea6f83f0431a259f81159e`**
- Diff stat: **2 files changed, 20 insertions(+), 8 deletions(-)** — exactly `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` and `CLAUDE.md`, as expected.

### CLI

- `git -C $CLI checkout main`.
- `git -C $CLI merge --no-ff story/BUG-085 -m "merge(story/BUG-085): durable drift detection, sentinel parser repairs, CR-117 port"` — merge made by the `ort` strategy, **no conflicts**.
- Merge commit SHA: **`b24455189533a32e5d1d45c326aded1826b5121e`**
- Diff stat: **9 files changed, 1624 insertions(+), 149 deletions(-)**:
  - `scaffold/core/.cleargate/scripts/validate_state.mjs`, `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`
  - `src/commands/doctor.ts`, `src/lib/drift-check.ts`
  - `test/commands/doctor-drift-guard.node.test.ts`, `test/helpers/init-fixture.ts`, `test/hooks/pending-task-sentinel-cards.red.node.test.ts` (new), `test/lib/drift-check-scaffold.red.node.test.ts` (new), `test/scaffold/canonical-live-parity.red.integration.node.test.ts`
- `git -C $CLI diff b100ea8..main --stat -- scaffold` → **non-empty** (canonical scaffold touched — expected, this item edits `pending-task-sentinel.sh` and `validate_state.mjs`).

## Full Suite (once, on main)

`cd $CLI && npm test` → **2987 tests, 2983 pass, 2 fail, 2 skipped** (duration_ms 377000.972083, ~6m17s), exit code 0 (test runner reports failures via summary, not process exit).

**Expected-count reconciliation:** dispatch baseline 2944 (post -07) + 43 new (drift-check-scaffold 24, sentinel-cards 13, doctor-drift-guard +6) = **2987**. Actual = 2987. Exact match.

**Failure reconciliation (permitted by dispatch):** the 2 failures are exactly 2 of the 3 dist-spawning `doctor-drift-guard.node.test.ts` cases named in the file itself as `(lags BD until rebuilt from post-BUG-085 main)`:
- `test/commands/doctor-drift-guard.node.test.ts:1:6658` — "names the drifted path and exits non-zero, without the [advisory] prefix"
- `test/commands/doctor-drift-guard.node.test.ts:2:616` — "prints [advisory]-prefixed drift and does not set the drift-driven exit"

Both spawn the pre-merge `dist/cli.js`, which still has the old `drift-check.ts` (reads `cleargate-planning/`, not `cleargate-cli/scaffold`), hence `[doctor] No .claude/settings.json found` instead of a drift line. The third dist-spawning case (`:329`, "leaves canonical qa.md, live qa.md, and root CLAUDE.md byte-identical") passed even pre-BD because its assertion only checks file byte-identity before/after, independent of whether the drift line is correct — so it is not part of the count of 2 fails. Confirmed green post-BD in the Post-BD Witnesses table below (13/13, including both these cases). No other failure. **No halt** — reconciled exactly as the dispatch predicted.

## Rule-14 Outer Revert

- `git -C $OUTER diff --stat -- .cleargate/delivery` → **29 files changed, 37 insertions(+), 37 deletions(-)** — pure back-sync noise (`parent_cleargate_id` / timestamp churn).
- `git -C $OUTER checkout -- .cleargate/delivery/` applied.
- Post-revert `git -C $OUTER status --porcelain`: only the 4 hook-owned ledger/state files remained modified. No delivery noise left behind.

## BD (`npm run build`, on main)

- Prebuild: `cleargate-planning payload composed: 80 files`, `scaffold split view composed: 80 files`, `build-manifest: 74 files → MANIFEST.json`. No unclassified warning. Matches expected (80/80/74).

**Payload delta (NUL-safe, relative paths).** `B=/private/tmp/claude-501/cg5801/payload-baseline` (pre-BUG-085, from STORY-058-07-devops), `T=$CLI/templates/cleargate-planning`.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `diff -rq --exclude=MANIFEST.json $B $T` | exactly 2 files differ | `.claude/hooks/pending-task-sentinel.sh`, `.cleargate/scripts/validate_state.mjs` | PASS |
| Pre-merge manifest `.files` (74) vs post-BD manifest `.files` (74) — deep path-set equal, per-entry key diff | only `sha256` differs, only for the 2 files above | confirmed via node script: same 74-path set; 2 entries differ, each only in `sha256`, no owner/tier change | PASS |
| `.cleargate/scripts/validate_state.mjs` post-BD sha256 | `9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae` | `9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae` | PASS |

**New post-BUG-085 baseline snapshot:** `cp -Rp $T /private/tmp/claude-501/cg5801/payload-baseline-post-085`. Identity hash (`find . -type f ! -name MANIFEST.json -print0 \| sort -z \| xargs -0 shasum -a 256 \| shasum -a 256`): **`e44154af06f608c8cb9c83c2b2845527ed489c52740eeec66fd16798a8939a27`**. Kept for later items to compare against.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `cmp $CLI/dist/MANIFEST.json $T/MANIFEST.json` | exit 0 | exit 0 | PASS |
| `node $CLI/dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | `OK`, no REFUSING | `[verify-pack] OK — 196 files, payload 80, version 0.26.1.` | PASS |
| `dist/cli.js` carries `pinTolerantEqual` (`grep -a -c`) | present | 2 | PASS |
| `dist/cli.js` carries `LIVE_ONLY_CLAUDE_ENTRIES` (`grep -a -c`) | present | 2 | PASS |
| `dist/cli.js` carries `ClearGate drift:` (`grep -a -c`) | present | 1 | PASS |
| `git -C $CLI status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |

## Post-BD Witnesses, SOLO

| File | Result |
|---|---|
| `test/commands/doctor-drift-guard.node.test.ts` | **13/13 pass** (against new dist — both previously-failing cases now green) |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 11/11 pass |
| `test/commands/doctor-retired-field.red.node.test.ts` | 3/3 pass |
| `test/cli.node.test.ts` | 23/23 pass |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 2/2 pass |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 pass |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 pass |
| `test/commands/lifecycle-per-host.red.integration.node.test.ts` | 3/3 pass |
| `test/lib/manifest-legacy-snapshot.red.integration.node.test.ts` | 1/1 pass |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag) | **5/5 pass** |
| `test/commands/init-host-parity.red.integration.node.test.ts` (same baseline, compare mode) | **15/15 pass** |

**No halt.** All required post-BD dist-spawning tests pass clean.

**Baseline integrity** (absolute paths): `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425 files**; `find ... -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → **`bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`** — exact match to the recorded digest. Baseline kept intact (compare-only, retained until M3 closes).

**Clean-room smoke** (SMOKE RULE followed — one literal-path `(cd <mktemp> && …)` call, never backgrounded): `T=$(mktemp -d)` → echoed before use; `(cd $T && git init -q && node $CLI/dist/cli.js init --yes --pin 0.0.0-m3 && node $CLI/dist/cli.js doctor; echo doctor-exit=$?)` → init created 80 files, `doctor-exit=0`, **no `scaffold drift:` line** (correctly skipped — the room has no `cleargate-cli`). `T` deleted via literal `rm -rf --`; confirmed gone.

## Mirror Parity Audit

Not a generic mirror-parity case — this item's canonical↔live re-sync is the RS-BUG085 boundary step itself (below), governed by M3-A61, not an ad-hoc `cleargate init`. Prior to RS-BUG085, live `.claude/hooks/pending-task-sentinel.sh` carried the pre-BUG-085 signal/parser (drift `content-mismatch`, confirmed by R1); all other canonical↔live surfaces were already in sync (`allowed: [.cleargate/scripts/gate-checks.json]` only — a permanent meta-repo exception, not drift). Post RS-BUG085 (R6/R7), zero drift remains.

## RS-BUG085 (M3-A61 R1–R10)

**Preconditions confirmed:** outer merge on `sprint/S-41`; cli `main` holds the `story/BUG-085` merge with the `12ae157` tree, checked out; full suite + rule-14 revert done; BD done from `main`; post-BD witnesses green.

| Step | Expected | Actual | Result |
|---|---|---|---|
| **R1** — pre-check, `doctor --cwd $OUTER` | exactly one `scaffold drift:` line, `.claude/hooks/pending-task-sentinel.sh (content-mismatch)`, exit 1 | exactly that line (plus unrelated pre-existing `⚠ hook failure` and `[advisory] execution_mode` lines — neither is a drift line); exit 1 | PASS |
| **R1** — `doctor --session-start --cwd $OUTER` | line 3 = `ClearGate drift: 1 live scaffold file(s) …` | line 3 = `ClearGate drift: 1 live scaffold file(s) differ from cleargate-cli/scaffold — run \`cleargate doctor\` for the list; re-sync per CLAUDE.md "Dogfood split".` | PASS |
| **R2** — dry-parse, new hook, fixture (24 SPRINT-41 dev/qa reports incl. `BUG-085-qa.md`, all `.processed-*` markers, `.active=SPRINT-41`, PATH `cleargate` stub, `SKIP_FLASHCARD_GATE`/`CLEARGATE_ADVISORY`/`CLAUDE_PROJECT_DIR` unset) | exit 0, 0 cards, 0 unparseable | exit 0, no stdout/stderr (0 cards, 0 unparseable) | PASS |
| **R2** — control (delete `.processed-0133bc771de9`, re-run) | exit 2, names that card | exit 2, stderr: `FLASHCARD GATE BLOCKED … card: 2026-09-25 · #test-harness #danger · Files with REPO_ROOT hardcoded …` naming exactly that card | PASS |
| **R3** — orchestrator confirms/marks any listed card | N/A if 0 cards | 0 cards listed by R2's first run — nothing to confirm or mark | N/A (clean) |
| **R4** — dry run (`b0-live-resync.mjs`) | pin `0.20.0`, `orphans_reported_not_deleted: []`, exactly one change `hooks/pending-task-sentinel.sh` `e373fea7…3f41` → `444becd2…4d1b` | exact match | PASS |
| **R4** — `--apply` | refuses unless OUTER=`sprint/S-41` & cli=`main`; backs up `.claude/` to `b0/claude-live-backup-<ts>.tgz` + sha256 manifest; writes pin-substituted canonical atomically at mode `0755`; asserts post-condition | ran (preconditions true); backup `b0/claude-live-backup-2026-09-26T02-49-47-446Z.tgz` + `.sha256.json`; `post_condition: "live == canonical (pin-substituted) for every canonical file"`; stdout JSON saved to `b0/rs-bug085-apply.json` (git-excluded) | PASS |
| **R5** — verify | sha256 `444becd20e458c7982203243b7e6d8471905d90120660eca430405804fbb4d1b`, mode `755` | exact match | PASS |
| **R6** — `doctor --cwd $OUTER` | no `scaffold drift:` line, exit 0 | no drift line (unrelated `⚠ hook failure`/`[advisory]` lines still present, pre-existing, not drift), exit 0 | PASS |
| **R7** — `doctor --session-start --cwd $OUTER` | line 1 `ClearGate state:`, line 2 `cleargate CLI:`, no `ClearGate drift:` line | matches; no drift line | PASS |
| **R8** — `validate_state.mjs` sha256 unchanged | `9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae` | exact match | PASS |
| **R9** — bug068 canonical mode | 10/10 | 10/10 | PASS |
| **R9** — bug068 live mode (`BUG068_HOOKS_DIR=$PWD/.claude/hooks`) | 10/10 | 10/10 | PASS |
| **R10** — no session restart | noted, not performed | not performed; `.claude/settings.json` unchanged, hook scripts read per-invocation; the orchestrator's next Agent dispatch is the live witness (new `.pending-task-*.json`, ledger row with `agent_type`, no unexpected `flashcard-gate:` line) | noted |

R1, R6, R7 were read-only for the repo (no write from `checkCanonicalDrift`). R2 and R4's dry run wrote nothing into OUTER. R4's `--apply` was the only write into live `.claude/` this dispatch performed, touching exactly one file.

## Cleanup

- `git -C $OUTER worktree remove .worktrees/BUG-085` — removed; confirmed absent from `git -C $OUTER worktree list`.
- `git -C $OUTER branch -d story/BUG-085` → `Deleted branch story/BUG-085 (was 68fd9426)`.
- `git -C $CLI branch -d story/BUG-085` → `Deleted branch story/BUG-085 (was 12ae157)`.
- Both deletes used lowercase `-d`; neither refused (fully merged).

## State Transition

- `CLEARGATE_STATE_FILE=$OUTER/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs BUG-085 "Done"` → `Updated BUG-085: state="Done"`.
- Confirmed via `state.json`: `stories["BUG-085"] = { "state": "Done", "qa_bounces": 0, "arch_bounces": 1, ... }`.
- Transitioned at: `2026-09-26T02:50:25.860Z`.

## Outer Status — END

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

Compared to START: `events.jsonl` and `state.json` are newly modified beyond a bare hook-tick (this dispatch's Done transition + event log) — both hook/state-owned, matching the allowed exception list. The untracked `.pending-task-2256-89420-25092.json` present at START is absent at END — this DevOps dispatch never wrote to or deleted it (same anomaly class noted in `STORY-058-05-devops.md` and `STORY-058-07-devops.md`); flagging for the orchestrator, not reverting/recreating anything. This devops report itself is untracked/new (not committed by DevOps, per instructions). The live re-sync (R4 apply) and its backup/apply-JSON artifacts landed in gitignored `.claude/**` and git-excluded `.cleargate/sprint-runs/SPRINT-41/b0/**` respectively, so neither shows in `git status`.

## CLI Status — END

```
?? cleargate-0.25.0.tgz
```

CLI left checked out on `main` at `b2445518`. No other changes.

## Commit Ledger (this dispatch)

| SHA | Repo | Message |
|---|---|---|
| `ccdeb4b3` | outer | merge(story/BUG-085): bug068 repoint + CLAUDE.md drift pointer |
| `b2445518` | cli | merge(story/BUG-085): durable drift detection, sentinel parser repairs, CR-117 port |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |

## Script Incidents

None. `run_script.sh` invocations (`b0-live-resync.mjs` dry-run and `--apply`) both completed successfully; no incident JSON was written.

## Flashcards

```yaml
flashcards_flagged: []
```

STATUS=done
