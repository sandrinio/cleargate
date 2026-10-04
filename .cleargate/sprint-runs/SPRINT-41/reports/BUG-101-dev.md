role: developer

# BUG-101 Developer report (SPRINT-41 M7)

```
STORY: BUG-101
STATUS: done
COMMIT: 26bdf84 (cli story/BUG-101, parent d07d4a0, base main f0c33f7)
TYPECHECK: pass
TESTS: 485 passed, 0 failed (targets 9/9, witnesses 169/169, M2 pair 20/20, adjacency 287/287)
FILES_CHANGED: scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh; scripts/build-codex-payload.mjs; scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh (generated); scaffold/core/.agents/skills/sprint-execution/SKILL.md (generated); CHANGELOG.md
NOTES: I followed the TPV brief exactly. There are no plan deviations and no test or init-fixture edits.
```

## What landed

**1. The Codex branch of the canonical `pending-task-sentinel.sh`.** The new block sits between the `AGENT_TYPE`/`PROMPT` block and the extraction. It picks the work item from the first source that yields one:

1. **`task_name`.** It matches `grep -oiE '(^|[_/-])(story|epic|cr|bug|proposal|sprint)[-_]?[0-9]+([-_][0-9]+)?'` and takes the first match. It strips one leading `[_/-]` and maps the result through `tr 'a..z_' 'A..Z-'` with explicit letter lists. On a hit it consumes exactly one marker: the newest fresh one whose `work_item_id` and `agent_type` both match. The log line gets `source=task_name`.
2. **A marker.** The helper `claim_dispatch_marker` collects `find … -maxdepth 1 -type f -name '.dispatch-*.json' -mmin -10` into an array. It guards the count before running `ls -t`, walks newest first, and moves past markers of another type rather than stopping on them. It claims with `mv "$m" "$m.claimed.$$"`, reads `work_item_id`, then runs `rm -f`. It never reads `session_id`. The log line gets `source=marker`.
3. **The message.** The existing regex over `PROMPT` runs only when the id is still empty. The Claude path always lands here. The log line gets `source=message`.
4. **None.** The sentinel is still written with an empty id and `source=none`, and the hook exits 0.

The Codex printf gains ` source=%s` at the end. The Claude printf (`:456`) and the Claude jq object (`:453`) are byte-unchanged. Nothing is deleted apart from the claimed or consumed marker; there is no sweep.

**2. `CODEX_SKILL_REPLACEMENTS.R4` and `.R5`** are set to the M7 §3 pinned texts:
- R4 now reads **Per-dispatch gate** and checks the gate at every role dispatch.
- R5's spawn row now includes `task_name` = the work-item id plus the role.
- R5's `write_dispatch.sh` row now says the hook attributes from `task_name` and the marker is an optional fallback.

Test 31 passes against these texts.

**3. `npm run gen:codex`** regenerated the `.codex` hook copy, which has the same blob (`a60d4be`) and mode 100755 as the canonical hook. It also regenerated the Codex `SKILL.md` render; the diff is exactly the R4 and R5 rows. `build-codex-payload.mjs --check` exits 0.

**4. `CHANGELOG.md`:** one `### Fixed` entry.

## Verification (in `<cw>`, every file run solo with `npm run test:file`)

| Run | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run prebuild` (includes `--check`) | exit 0 |
| `node scripts/build-codex-payload.mjs --check` | exit 0 |
| `codex-dispatch-attribution.red` | 6/6 |
| `codex-sprint-execution-render.red` | 3/3 |
| `codex-hooks-harness.red` | 91/91 |
| `codex-hook-scripts.red` | 18/18 |
| `pending-task-sentinel-cards.red` | 13/13 |
| `flashcard-gate-parity.red` | 14/14 |
| `codex-payload.red` (`test/scaffold/`) | 14/14 |
| `hooks-claude-parity.red.integration` | 19/19 |
| M2 pair: `claude-adapter-init-parity` + `init-host-parity`, run with `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` and `CLEARGATE_INIT_BASELINE_CAPTURE` unset (compare only) | 5/5 + 15/15 = 20/20. The `BUG101_SENTINEL_PRE` refusal row resolves. |
| Adjacency: the 21 other files that name the sentinel, the Codex render or `CODEX_SKILL_REPLACEMENTS` (e2e and clean-room excluded) | 287/287. See the note below the table. |

**Adjacency note.** On the first pass, `enforcement-section-13` failed 2 tests because `dist/cli.js` was missing from the worktree. I ran `npm run build` inside the worktree, which rule 11 allows, and the file then passed 11/11.

**Red at the seal.** The QA-Red re-seal report shows 5 red + 1 green in the attribution file and Test 31 red at `d07d4a0`, which is this tree without my change. I did not re-run that check with a stash, because the dispatch forbids `git stash`.

**`/bin/bash` 3.2.57 probe** (scratch, since removed by exact path). I ran the generated `.codex` hook with `--host codex`:

| Case | Result |
|---|---|
| Encrypted message with `task_name "story_001_01_qa"` | sentinel `work_item_id STORY-001-01`, `source=task_name` |
| No id anywhere, no markers, and a decoy `.dispatch-decoy.json` in the cwd | `source=none`; the decoy is untouched (the empty-list guard works) |
| Markers: `{STORY-001-01, qa}` at 4 min, `{STORY-002-02, qa}` at 2 min, `{STORY-777-77, architect}` at 1 min, plus a plaintext `STORY=003-03` message | `STORY-002-02`, `source=marker`; only that marker is deleted |
| `task_name "SPRINT_01_REPORTER"` | `SPRINT-01`, `source=task_name` |

No `unbound variable` or other stderr lines reached the hook log.

**M27 race probe.** Over 8 rounds, I launched two hooks in parallel against one fresh marker each round. Exactly one hook claimed the marker every round (8 `source=marker`, 8 `source=none`). No id was claimed twice and no `.claimed.*` file was left behind.

**Git status after all commands:**
- The outer main checkout shows only the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`). The re-seal report and the `.pending-task-*.json` from the dispatch snapshot are gone: the orchestrator committed the report in `712a4bcc`, and I touched neither.
- The outer `.worktrees/BUG-101` worktree is clean and still detached.
- `<cw>` is clean.
- The cli main checkout is on `main` and shows one untracked `cleargate-0.25.0.tgz` dated 2026-09-02, which was there before this dispatch.

## Mutant cross-check (TPV table; every mutant stays killed on this build)

| ID | What in `26bdf84` rules it out | Green killer |
|---|---|---|
| M01, M22 | `session_id` is never read in the Codex block | T1, T2 |
| M02 | `ls -t` lists newest first | T2 |
| M03, M20, M21 | `-mmin -10` | T1, T2, T3 |
| M04, M12 | `[[ at == AGENT_TYPE ]] \|\| continue` moves past other types instead of stopping | T1, T2, T3 |
| M05, M08 | `task_name` is read first; the marker is claimed only when `task_name` has no id | T1 |
| M06, M07a, M07b, M25 | The message regex runs only when the id is still empty; a raw message is never used as the id; the Codex message fallback is kept | T1–T5 |
| M09, M10, M10b | A `task_name` hit calls `claim_dispatch_marker "$TASK_ID"`, which requires both `work_item_id` and `agent_type` to match | T1 |
| M11, M11b | `mv`, then `rm -f` of the claim name | T1, T2 |
| M13, M14, M17 | The pattern has the `(^\|[_/-])` boundary, `-i` and `sprint` | T1, T5 |
| M15, M16 | `tr` with explicit a–z/A–Z lists and `_`→`-` | T1 |
| M18, M19 | Each branch sets its own `WORK_ITEM_SOURCE` | T1, T2 |
| M23, M24 | The sentinel is always written and the hook exits 0 | T5 |
| M26 | Nothing is swept | T3 |
| M27 | The claim is `mv` (brief mandate); the race probe above found no double claim | not test-observable |
| C01, C03 | The source-order block and the `task_name` read sit inside `HOST == codex` | T6 |
| C02, C04 | The Claude printf and jq object are byte-unchanged | T6; `hooks-claude-parity` 19/19 (Test 40 R-H4) |
| R01–R03 | R4 and R5 are set to the pinned texts | Test 31, Test 33 |
| G01 | `gen:codex` was run; `cmp` shows the copies identical; `--check` exits 0 | `codex-payload.red` 14/14; render Test 33 |

## Task Breakdown

The rows in `BUG-101_codex_dispatch_attribution_encrypted_spawn_message.md` are unticked. That file lives in the outer repo, the outer worktree is a detached host, and this dispatch forbids touching it or the main checkout (other than this report).

For the orchestrator to tick:
- **Row 1 (QA-Red):** done at `d07d4a0`.
- **Row 2 (Codex source order, `source=`, R4/R5, `gen:codex`):** done at `26bdf84`.
- **Row 3:** typecheck, targeted, `codex-hooks-harness` 91, `--check` and `hooks-claude-parity` are done here. Test 46 and the scripted codex-loop belong to QA-Verify's harness lane.

## Script Incidents

None. `run_script.sh` was not invoked. The `npm`, `git` and test commands and the bash probe were run directly, as the dispatch's Verify list specifies.

r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # task_name source -> STORY-001-01 (T1, T1-B, T1-C)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # marker claim + consume, newest same-type, never session_id (T2, T2-B, T3)
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # plaintext message still attributes (T3, T4)
  - { r_id: "R4", covered: false, deferred: false, clarified: true }   # "Claude hook bytes equal baseline" -> "Claude path unchanged" per M7 E1 (T6, hooks-claude-parity 19/19)
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # source= on the codex log line only (T1-T6)
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # R4/R5 Codex render rows (Test 31, 33; --check)
  - { r_id: "R7", covered: false, deferred: true, clarified: false }   # test 46 + scripted codex-loop: QA-Verify harness lane per M7 §3
plan_deviations: []
adjacent_files:
  - "scaffold/hosts/claude/.claude/hooks/token-ledger.sh"
  - "scaffold/core/.cleargate/scripts/write_dispatch.sh"
  - "scripts/clean-room/codex-hooks.mjs"
  - "scripts/clean-room/loop-script.mjs"
  - "test/helpers/init-fixture.ts"
  - "/Users/ssuladze/Documents/Dev/ClearGate/.claude/hooks/pending-task-sentinel.sh"
flashcards_flagged:
  - "2026-09-27 · #worktree #task-breakdown · cli-only item, detached outer host: Dev can't tick bug-file rows; orchestrator ticks at merge."
