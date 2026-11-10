# STORY-061-02 dev report
role: developer

Commit: ef90ce4 on story/STORY-061-02 (cleargate-cli repo, parent f8320ca). One commit, 84 files: 56 modified, 22 new `.live.integration` siblings, 2 `git mv` renames, 4 fixtures. Every staged path is in story section 3.1. Typecheck: `npm run typecheck` clean. No push, no `--no-verify`.

## Per-batch harness totals (working-tree mode, standalone / nested)
| Batch | Default files | Standalone | Nested | Integration siblings (nested only) |
|---|---|---|---|---|
| B1 | push-hierarchy, red-green-example | 11/11 pass | 11/11 pass | push-hierarchy.live (4) + snapshot-drift.integration (1): 5/5 |
| B2 | 10 command tests + scaffold-layout.red | 175/175 | 175/175 | new-command.live (2) + no-exec.live (1): 3/3 |
| B3 | 7 doc tests + scaffold-layout.red | 106/106 | 106/106 | clean-room (9), codex (1), contract-first (2), gsip (1), readme (8), serial (2): 23/23 |
| B4 | hook/init tests + scaffold-layout.red | 66/66 | 66/66 | claude-md-block-leads.live (1): 1/1 |
| B5 | 8 lib tests + scaffold-layout.red | 249/249 | 249/249 | anchoring (1), surgery (1), license (2) + agent-developer-section: 6/7 (see findings) |
| B6 | 5 scaffold/wiki tests + scaffold-layout.red | 95/95 | 95/95 | enforcement-doc (1), file-surface (2), ratchet (1), wiki-ingest (1): 5/5 |
| B7 | 17 extras + scaffold-layout.red | 224/224 | 224/224 | reporter (1), relocation (3), dogfood-split (3), devops (6), d5 (1), bucket (1): 15/15 |
| B8 | cr075 + scaffold-layout.red | 26/26 | 26/26 | n/a |

scaffold-layout.red (Sc9) passed in every batch: no sibling tripped it, so no `ALLOWLIST` row was added.

## Final totals, full default `npm test`
```
=== standalone (exit 0)
ℹ tests 3599 ℹ pass 3597 ℹ fail 0 ℹ cancelled 0 ℹ skipped 2      cli git-status delta: none
=== nested (exit 0)
ℹ tests 3599 ℹ pass 3597 ℹ fail 0 ℹ cancelled 0 ℹ skipped 2      cli git-status delta: none, meta-repo git-status delta: none
```
Base was standalone 3647 (187 fail, 14 cancelled) and nested 3647 (3 fail). 3599 = the plan's 3647 - 56 + 8.

## Integration tier (nested only)
Run over every integration file created or renamed by 01 and 02, plus the 2 files 01 only modified (35 files): `tests 90, pass 87, fail 3, cancelled 0`.
- All 33 created or renamed files: 0 fail, 0 cancelled. This includes snapshot-drift against the read-only mcp clone, so there is no schema drift (no OD-4 product finding).
- The 3 failures are all `test/scripts/_archive/protocol-section-24.integration.node.test.ts`. That file is the known pre-existing failure from 01's report; 01 modified it but did not create or rename it.
- Deltas: cli none, meta-repo none.

## Git status deltas
- Scratch meta-repo clone: identical before and after every run, including the 50-file corpus rewrite, which is gone (R6).
- cli (scratch layouts): none.
- Real cli checkout after the commit: only the untracked `cleargate-0.25.0.tgz`, which was left alone.
- Real meta-repo: I never ran a test there. Its `git status --porcelain` is identical to the start except one line that disappeared: the untracked `.cleargate/sprint-runs/_off-sprint/.pending-task-480-67915-32763.json`. That is the dispatch hook sentinel, consumed by the hook, not by a test.

## Parity tally
Exact counts from logs (the regex counts below under-report loop-generated tests):
- Default tier: 3647 -> 3599 = -56 moved + 8 added (6 R3-split + 2 guard scenarios).
- Integration tier: +56 moved (46 across 22 new siblings, 10 across the 2 renames: snapshot-drift 1 and clean-room 9).
- Title multiset comparison, base `q-full-nested.log` vs (final nested default + the 90-test integration run): **0 base passing titles missing**.

Per-file `it(`/`test(` counts, before -> after (regex count at HEAD vs now):

| File | Default before -> after | Integration |
|---|---|---|
| push-hierarchy | 13 -> 9 | +4 |
| snapshot-drift (rename) | -1 | +1 |
| new-command | 30 -> 28 | +2 |
| no-exec-mode-vocab | 1 -> 1 (1 moved, 1 R3-split added) | +1 |
| claude-md-block-leads-relocation | 4 -> 1 | +3 |
| clean-room (rename) | -9 | +9 |
| codex-enforcement-delta | 5 -> 4 (loop-generated count) | +1 |
| contract-first-dag-text | net 0 (T4/T5 out, T4c/T5c in) | +2 |
| dogfood-split-integrity | 4 -> 1 | +3 |
| gate-section-index-pinning | 14 -> 13 | +1 |
| readme-qa-doc-truth | 18 -> 10 | +8 |
| serial-dispatch-docs | net 0 (T26/T27 out, canonical twins in) | +2 |
| claude-md-block-leads | 15 -> 14 | +1 |
| claude-md-anchoring | 20 -> 19 | +1 |
| claude-md-surgery | 10 -> 9 | +1 |
| license-contract | 4 -> 3 (2 moved, 1 added) | +2 |
| devops-agent-registration | 12 -> 6 | +6 |
| enforcement-doc-coherence | loop 4 -> 3 | +1 |
| file-surface-gate-e2e | 17 -> 15 | +2 |
| ratchet-retired | 4 -> 3 | +1 |
| skill-md-consolidation-d5 | 18 -> 17 | +1 |
| bucket-registry-parity | 11 -> 10 | +1 |
| wiki-ingest-sprint-report | 15 -> 14 | +1 |
| reporter-content | 15 -> 14 | +1 |
| cr075 guard | 6 -> 8 | n/a |

## Guard proof (manual break, scratch standalone layout)
```
printf "import path from 'node:path';\nconst p = path.resolve(import.meta.dirname, '..', '..', '..', 'CLAUDE.md');\n" > test/commands/zz-guard-probe.node.test.ts
npx tsx --test test/cr075-standalone-contract.node.test.ts
  ✖ Scenario 7: default-tier tests never reach the meta-repo ... (EPIC-061 R10)
    test/commands/zz-guard-probe.node.test.ts: climb:../CLAUDE.md @2        (pass 7, fail 1)
rm test/commands/zz-guard-probe.node.test.ts  ->  pass 8, fail 0
```
- Scenario 8 proves the scanner on a synthetic tmp tree: the 4 coupled files are named, the integration-tier and fixture copies are exempt, and the machine-path file is found.
- `command grep -rnE "/(Users|home)/[^/'\"]+/.*ClearGate" test` returns nothing.
- `arch-guard-proto.mjs` flagged list: 54 -> 0 of 300.
- No allowlist and no opt-out marker.

## OD deviations and judgement calls
1. **E7 `skill-md-conditional-architect` (needs orchestrator confirmation).**
   - The plan lists E7 as "R1-cli, 0 moves". It missed that the file's `GATE-4 NOTE` test (about `:424`) also reads the meta-repo's live `SKILL.md` through the same `REPO_ROOT`.
   - Moving it would need a 23rd sibling that is not in section 3.1, so I did not add one.
   - I kept the test, its title and its `assert.ok(true, ...)`. I removed only the informational live-vs-canonical `console.log` comparison, because that read the meta-repo's live `.claude/`. A comment points to `cleargate doctor`'s scaffold-drift check (BUG-085).
   - Nothing was asserted by the removed part.
   - Alternative: add `skill-md-conditional-architect.live.integration.node.test.ts` (1 test, as E5 did) by amending section 3.1.
2. **`agent-developer-section.integration` (R9 only, as planned): the file has a pre-existing failing test.** `Scenario 2: live developer.md is byte-identical to scaffold` calls `assert.strictEqual(live, '<message string>', scaffold)`, with the message and the expected value swapped. It fails whenever the live file exists, and it did before this story. It is not in the "created or renamed" set, so I did not fix it. This is a one-line follow-up.
3. **`no-exec-mode-vocab` sibling.** It copies only `findExecModeVocabHits` and `ROOTS`, not `grepFiles`, which the sibling's single test does not use.
4. **Unused locals removed.** Where a constant became unused (`__dirname`, `fileURLToPath`, `path` import), I deleted it. No assertion text changed, apart from the `red-green-example` messages (`npm ci in the cli root`) and the planned repoints.
5. **Task Breakdown rows.** Not ticked. The story file lives in the meta-repo, outside the cli commit surface (same as 01).

## Flashcards proposed
- `2026-11-07 · #test-harness #standalone · A default-tier file can hide a second live read behind skip-guard or console.log-only tests; re-grep the file after repointing, not the plan's line list.`
- `2026-11-07 · #test-harness #assert · assert.strictEqual(a, 'message', b) passes the message as expected: the test fails whenever the file exists. Check arg order.`
- `2026-11-07 · #test-harness #git · Cutting a block by an end marker like "});\n" needs count==1 asserted; use a helper that fails if the marker is ambiguous.`
