# DevOps Report — STORY-058-04

role: devops

CLI-only story (Rule 15 cli-only variant, same pattern as STORY-058-03) — no outer half, no worktree. QA-Verify PASS and Architect post-flight PASS both on record before this dispatch (`STORY-058-04-qa.md`, `STORY-058-04-arch.md`). One merge round, no conflicts.

## Attempt 1 → Attempt 2

Attempt 1 completed steps 1–6(b) (pre-merge check, merge, full suite, Rule-14 revert, BD, and smoke (b)) and then stalled on a smoke-cleanup tool call; the orchestrator stopped it. This dispatch (attempt 2) picked up at step 6(c) and did **not** redo the merge, the full suite, the Rule-14 revert, or `npm run build` — those five items below are carried verbatim from attempt 1's own findings, re-verified only via cheap read-only checks (§Cheap BD Re-verification) before proceeding.

### Carried from DevOps attempt 1

| Item | Result |
|---|---|
| Pre-merge check | Clean apart from the untracked `cleargate-0.25.0.tgz` |
| Merge (`--no-ff`) | Merge SHA `2e566b5` on cli `main`; story tip `128bad6`, above `4785032`, above `a178d38`, above `55f5d95`; clean, no conflicts |
| Full suite on `main` | 2850 tests, 2848 pass, 0 fail, 2 skipped (~342s) — exact match to expected 2829 + 21 new |
| Rule-14 revert | 29 files, 39/39 pure `parent_cleargate_id`/`sprint_cleargate_id` noise; two sampled, then `git checkout -- .cleargate/delivery/`; post-revert only hook-owned files remained modified |
| BD (`npm run build`) | Run on `main` at 16:58Z; prebuild logged 80 files, no unclassified warning; all BD assertions PASS |
| Smoke (b) | `init --host cursor --yes` in a fresh target exited 2, stderr `[cleargate init] ERROR: --host: unknown host "cursor". Valid hosts: claude. Profiles: portable, all.`, target stayed empty |

## Merge Result

- Merge commit SHA: **`2e566b5`** — `merge(story/STORY-058-04): cleargate init --host selector parsing and profile expansion`.
- Diff stat (`55f5d95..128bad6`): **8 files changed, 1028 insertions(+), 10 deletions(-)**.
- `cleargate-cli` on `main` @ `2e566b5` post-merge; story branch fully merged.

## Cheap BD Re-verification (read-only, no build)

`B=/private/tmp/claude-501/cg5801/payload-baseline`, `T=cleargate-cli/templates/cleargate-planning`.

| Check | Expected | Actual | Result |
|---|---|---|---|
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) | PASS |
| `diff <(sed 3d $B/MANIFEST.json) <(sed 3d $T/MANIFEST.json)` | empty | empty (exit 0) | PASS |
| `cmp dist/MANIFEST.json $T/MANIFEST.json` | exit 0 | exit 0 | PASS |
| `node dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | `OK — 196 files, payload 80` | `OK — 196 files, payload 80, version 0.26.1` | PASS |
| `dist/cli.js` carries `normalizeHostSelectors` | present (new for -04) | 2 occurrences | PASS |
| `dist/cli.js` carries `payloadFilter` | present (new for -04) | 2 occurrences | PASS |
| `dist/cli.js` carries `HostSelectionError` | present (new for -04) | 6 occurrences | PASS |
| `git -C cleargate-cli status --porcelain` | only the tgz | `?? cleargate-0.25.0.tgz` | PASS |

## Smokes Against the Real Dist

**(a) `init --help`** — `--host` line derived from the registry:

```
--host <value>        host adapter(s) to install: claude, or profile
                       portable|all; repeatable and comma-separated (default:
                       claude)
```

**(c) Fresh target, `init --yes` run twice:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| Run 1 exit | 0 | 0 | PASS |
| Run 2 exit | 0 | 0 | PASS |
| `grep -c "pre-edit-gate.sh --host claude" .claude/settings.json` | 1 | 1 | PASS |
| `grep -c '^<!-- CLEARGATE:START -->$' CLAUDE.md` | 1 | 1 | PASS |
| `.codex` dir exists | no | no | PASS |
| `.agents` dir exists | no | no | PASS |

Sorted `find . -type f -not -path './.git/*'` after run 1 saved as list C (84 files, session scratchpad).

**(d) Fresh target, `init --host CLAUDE,claude --yes`:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| Exit | 0 | 0 | PASS |
| Sorted file list vs list C | identical | `diff` empty (exit 0) | PASS |

**(e) `--from-source $CLI/scaffold --host cursor --yes` in a fresh target:**

| Check | Expected | Actual | Result |
|---|---|---|---|
| `$TMPDIR` `cleargate-from-source-*` entries, before run | (baseline) | none found | — |
| Run exit code | 2 | 2, stderr `[cleargate init] ERROR: --host: unknown host "cursor". Valid hosts: claude. Profiles: portable, all.` | PASS |
| Target stayed empty | yes | confirmed — no files under target outside `.git/` | PASS |
| `$TMPDIR` `cleargate-from-source-*` entries, after run | unchanged | still none found | PASS |

All three smoke targets (c/d/e) deleted individually via literal-path `rm -rf --` calls; verified gone by a follow-up `ls` (all three reported "No such file or directory").

## Post-BD Dist-Spawning Re-Runs (solo)

| File | Result |
|---|---|
| `test/commands/init-restart-banner.node.test.ts` | 3/3 pass |
| `test/commands/init-no-dep0190.node.test.ts` | 2/2 pass |
| `test/cli.node.test.ts` | 23/23 pass |
| `test/commands/init-from-source-dist.integration.node.test.ts` | 1/1 pass |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 pass (matches expected) |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, no capture flag) | 5/5 pass — scenario 12 fresh/user-content/reinit/malformed/force all match the M2 baseline byte-for-byte |
| `test/commands/init-host-parity.red.integration.node.test.ts` (compare mode, same baseline) | 15/15 pass — all three host-value variants × 5 fixture states match the -03 captured baseline byte-for-byte |

**No halt.** All required post-BD dist-spawning tests pass clean.

## Baseline Integrity

- `find /private/tmp/cg-s41-m2-init-baseline -type f | wc -l` → **425 files** — matches expected.
- `find ... -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` → `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — **exact match** to the expected digest. Baseline directory kept intact (compare-only, per sprint-context.md's M3 amendment — retained until M3 closes).

## Cleanup

- `git -C cleargate-cli branch -d story/STORY-058-04` → `Deleted branch story/STORY-058-04 (was 128bad6)` — fully merged, non-force delete (lowercase `-d` did not refuse).
- No worktree existed for this cli-only story; `git worktree list` shows only the main checkout at `2e566b5 [main]`.

## State Transition

- `CLEARGATE_STATE_FILE=<outer>/.cleargate/sprint-runs/SPRINT-41/state.json node .cleargate/scripts/update_state.mjs STORY-058-04 "Done"` → `Updated STORY-058-04: state="Done"`.
- Confirmed via `state.json`: `stories["STORY-058-04"] = { "state": "Done", "qa_bounces": 0, "arch_bounces": 1, ... }`.
- Transitioned at: `2026-09-25T17:43:53.650Z`.

## Outer Repo State (not committed by DevOps)

Post-cleanup `git -C <outer> status --porcelain` shows only sprint-run/hook-owned files modified: `.cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}` plus a pre-existing one-line addition to `sprint-context.md`'s Adjacent Implementations table (the STORY-058-04 row — an Architect/orchestrator edit that predates this dispatch, not touched by DevOps). This devops report itself is additionally untracked. Per instructions, DevOps does not commit in the outer repo — the orchestrator commits the report and state.

## Commit Ledger (this round)

| SHA | Repo | Message |
|---|---|---|
| `2e566b5` | cli | merge(story/STORY-058-04): cleargate init --host selector parsing and profile expansion |
| (this report + state) | outer | orchestrator commits: DevOps report; state Done |

## Flashcards

flashcards_flagged: []

STATUS=done
