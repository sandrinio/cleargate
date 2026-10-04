# DevOps Report — STORY-058-01

role: devops

Two-repo item (outer meta-repo + `cleargate-cli`), standard lane. Followed Cross-Cutting Rule 15 order: outer merge → cli merge → full suite → BD → mirror parity (info-only) → teardown → state. No conflicts, no reworks, one round.

## Merge Result

- Outer: `sprint/S-41` ← `story/STORY-058-01` — merge commit **`9837329c`** ("merge(story/STORY-058-01): scaffold relocation — Dogfood split rewrite, DEPRECATED.md"), `SKIP_SURFACE_GATE=1` per rule 17. Clean, no conflicts. 8 files changed, 815 insertions(+), 27 deletions(-): item file, 5 new sprint reports, `CLAUDE.md` rewrite, `cleargate-planning/DEPRECATED.md`.
- CLI: `main` ← `story/STORY-058-01` — merge commit **`464e1e4b`** ("merge(story/STORY-058-01): tracked scaffold/core + scaffold/hosts/claude"). Clean, no conflicts. 99 files changed, 23049 insertions(+), 91 deletions(-): new `scaffold/core/**` + `scaffold/hosts/claude/**` canonical trees, `src/lib/scaffold-layout.{mjs,d.mts}`, updated `scripts/copy-planning-payload.mjs` + `scripts/build-manifest.ts` + `tsup.config.ts`, red tests. Pre-existing untracked `cleargate-0.25.0.tgz` left alone. Merge order matters here — `scaffold-relocation.red.node.test.ts` scenario 5 reads outer MAIN, so it stayed red until the outer half landed first; confirmed green in the post-merge suite below.

## Post-Merge Tests

- Command: `cd cleargate-cli && npm test` (plain, not through `run_script.sh`).
- Result: **2788 tests, 2786 pass, 0 fail, 2 skipped** — exactly the `45bde09` baseline (2773/2771/0/2) plus the 15 new `test/scripts/scaffold-relocation.red.node.test.ts` scenarios, all green. The integration red file (`scaffold-relocation.red.integration.node.test.ts`) is excluded from the default suite, as expected.
- Duration: ~394.8s (~6m35s).
- Exit code: 0.

## Rule-14 Cleanup

Full-suite run wrote the usual `.cleargate/delivery/pending-sync/**` back-sync noise (28 files — `parent_cleargate_id`/`sprint_cleargate_id` placeholder fills) plus the ledger/session-totals files into outer MAIN. Inspected via `git diff` before reverting: all delivery-file changes were back-sync placeholder noise, no content edits. `cleargate-planning/MANIFEST.json` did **not** appear in `git status` at all — confirming the Architect's prediction that nothing in the merged tree still writes to the frozen `cleargate-planning/MANIFEST.json` default output, so that half of the rule-14 revert is now a no-op.

- `git status --porcelain -- cleargate-planning` was empty **before** the revert (nothing to revert there).
- `git checkout -- .cleargate/delivery` reverted the 28 pending-sync placeholder-fill files.
- Only `.cleargate/sprint-runs/SPRINT-41/.session-totals.json` and `token-ledger.jsonl` remained modified afterward (hook-owned, left untouched).

## BD Assertions

Build: `cd cleargate-cli && npm run build`. `B=/private/tmp/claude-501/cg5801/payload-baseline`, `T=cleargate-cli/templates/cleargate-planning`.

| Assertion | Expected | Actual | Result |
|---|---|---|---|
| `[prebuild]` log line | `cleargate-planning payload composed: 80 files` | `cleargate-planning payload composed: 80 files → …/cleargate-cli/templates/cleargate-planning` | PASS |
| `[build-manifest]` log line | `74 files → …/templates/cleargate-planning/MANIFEST.json` | matched | PASS |
| tsup onSuccess line | `MANIFEST.json copied to dist/MANIFEST.json` | matched | PASS |
| Unclassified-path warning | none | none | PASS |
| `diff -rq --exclude=MANIFEST.json $B $T` | empty | empty (exit 0) | PASS |
| Mode listings (`stat -f '%p %N'`, sorted) | identical, 100 entries each | identical, 100/100 | PASS |
| `diff <(sed 3d $B/MANIFEST.json) <(sed 3d $T/MANIFEST.json)` | empty (only `generated_at` differs) | empty; baseline `generated_at: 2026-09-25T00:00:00.000Z` vs current `2026-09-25T09:41:14.650Z`; `cleargate_version: 0.26.1`, 74 file entries | PASS |
| `cmp dist/MANIFEST.json $T/MANIFEST.json` | identical | exit 0 | PASS |
| `$T/.cleargate/sprint-runs`, `$T/.cleargate/hook-log` | exist, empty | both exist, 0 entries each | PASS |
| Outer `git status --porcelain -- cleargate-planning` | empty | empty | PASS |
| `node dist/cli.js --version` | `0.26.1` | `0.26.1` | PASS |
| `node scripts/verify-pack.mjs` | OK | `OK — 115 files, payload 80, version 0.26.1` | PASS |
| `dist/cli.js` carries `spidr-coverage` | present | 10 occurrences (`command grep -c`) | PASS |
| `dist/cli.js` carries `hook signal` | present | 3 occurrences (`command grep -c`) | PASS |

No live-enforcement regression. All expectations from the Architect's DevOps merge notes (§ rule 15) held.

## Mirror Parity Audit

No live re-sync performed — the relocation is byte-preserving, per the Architect's note ("No live re-sync. The relocation preserves bytes."). Informational `cmp` of live `/Users/ssuladze/Documents/Dev/ClearGate/.claude/hooks/*.sh` against `cleargate-cli/scaffold/hosts/claude/.claude/hooks/*.sh`:

| File | Result |
|---|---|
| `pending-task-sentinel.sh` | drift — pin placeholder only (`HOOK_PIN="0.20.0"` live vs `"__CLEARGATE_VERSION__"` canonical) |
| `pre-commit-surface-gate.sh` | identical |
| `pre-commit.sh` | identical |
| `pre-edit-gate.sh` | drift — pin placeholder only |
| `pre-tool-use-autonomy.sh` | identical |
| `pre-tool-use-task.sh` | identical |
| `session-start.sh` | drift — pin placeholder only (`cleargate-pin:` comment + `npx -y "cleargate@…"`) |
| `stamp-and-gate.sh` | drift — pin placeholder only |
| `token-ledger.sh` | identical |

All four drifts are the expected install-time pin substitution (`__CLEARGATE_VERSION__` → the live-installed pin, currently `0.20.0`), not content drift — no live re-sync needed for this story. Live `.claude/` was not touched.

## State Transition

- Story state: `Done` (confirmed via `.cleargate/sprint-runs/SPRINT-41/state.json` → `stories["STORY-058-01"].state === "Done"`).
- Transitioned at: `2026-09-25T09:42:33.122Z`.

## Cleanup

- Worktree `.worktrees/STORY-058-01`: removed (confirmed absent from `git worktree list`).
- Branch `story/STORY-058-01` (outer): deleted (`git branch -d`, was `085017a1` — fully merged).
- Branch `story/STORY-058-01` (cli): deleted (`git branch -d`, was `66ed73a` — fully merged).
- CLI checkout left on `main` at `464e1e4b`.

## Commit Ledger (this round)

| SHA | Message |
|---|---|
| `9837329c` (outer) | merge(story/STORY-058-01): scaffold relocation — Dogfood split rewrite, DEPRECATED.md |
| `464e1e4b` (cli) | merge(story/STORY-058-01): tracked scaffold/core + scaffold/hosts/claude |
| (this report + state) | chore(STORY-058-01): DevOps report; state Done |
