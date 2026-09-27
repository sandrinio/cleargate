role: devops

# STORY-058-13 DevOps Report — merge (SPRINT-41, M7 §4.2 OD-M7-1)

```
STORY: STORY-058-13
STATUS: done
MERGE_SHA (outer): a3b7750535f9b8e517e84c8c955b07d50f9f84c9  (sprint/S-41; parents 7db0e89e + 72c457c2; tree af28dd84)
MERGE_SHA (cli):   0e5b0acdbbcbd9b955aa7ae2c68792b3891f0686  (main; parents f0c33f7e + f33cc4a2; tree 61d902ed)
TESTS: 3653 passed-total tier — 3651 passed, 0 failed, 2 skipped (files: full default-tier `npm test` in cli main, 611.6s)
MIRROR_PARITY: n/a — this story touches no canonical/live mirror pair (scripts/clean-room/**, src/commands/verify-install.ts only)
STATE: Done
WORKTREE: removed (both <cw> and <ow>)
BRANCH: kept (story/STORY-058-13 not deleted in either repo; plan does not call for deletion)
```

## Plan basis

Followed `plans/M7.md` §4.2 "F9 deltas for -13's DevOps" (OD-M7-1: merge -13 now, before M7's own 7-item batch;
step L deferred to boundary step RS-L after M7). Per those deltas: dropped the two "before merging" confirmations
tied to a completed step L (not yet run — step L is now RS-L); committed `codex-loop-evidence.md` (scripted Run 1 +
Run 2) and the clean-room doc on this merge via the real `update_state` → commit → merge pattern (F6.9 step 7 /
rule 17); expected the post-BD `codex-loop.mjs check` to report "needs a live human-trust PASS run on the final
artifact inputs" and recorded it as non-blocking; kept the smokes, M2 pair, `verify-pack` counts-unchanged and
`--check` as in F9 (M6:1033-1041).

Pre-conditions verified before touching git: `<ow>` @ `d6c5264e` had exactly the 2 expected uncommitted authored
files; `<cw>` @ `f33cc4a` clean; `STORY-058-13-qa.md` = PASS-PENDING-SMOKE; `STORY-058-13-arch-recheck.md` = PASS
(post-flight B1 delta re-check); `STORY-058-13-integrate.md` = done. All three required reports present.

## Step 1 — Pre-merge baseline

- `cp -R cleargate-cli/templates/cleargate-planning /private/tmp/cg-s41-payload-pre-058-13` (89 files incl.
  `MANIFEST.json`) — taken before any merge, reflecting cli main's last BD at `f0c33f7`.
- Pre-merge `node scripts/verify-pack.mjs`: `OK — 232 files, payload 88, version 0.26.1`.

## Step 2 — Outer half (rule 15 / F6.9 pattern)

- Real state transition first: `update_state.mjs STORY-058-13 "Architect Passed"` (QA Passed → Architect Passed;
  `updated_at` became the sprint's max, so the file-surface gate resolves -13 as the active item). Confirmed via
  `state.json` read before/after.
- In `<ow>`, staged and committed **only** the 2 authored files (`git add` the 2 paths explicitly, verified
  `git status --short` showed exactly those 2 before staging):
  - `.cleargate/knowledge/clean-room-verification.md` (M)
  - `.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md` (new)
  - Commit: `story/STORY-058-13` `72c457c2` — "evidence(STORY-058-13): clean-room doc (Codex loop section) +
    codex-loop-evidence (Run 1, Run 2 scripted PASS)". Pre-commit hooks (surface gate + `check:no-vitest` +
    `check:no-inline-id-regex`) ran and passed; not bypassed.
- Read-only preview: `git merge-tree --write-tree --name-only sprint/S-41 story/STORY-058-13` → tree `af28dd84`,
  no conflicted paths.
- Merge: `git merge --no-ff story/STORY-058-13 -m "merge(story/STORY-058-13): Codex loop harness + verify-install
  for Codex"` → clean, `a3b7750535f9b8e517e84c8c955b07d50f9f84c9`, tree matches the preview exactly (`af28dd84`).
  Diff stat: 2 files changed, 272 insertions(+), 3 deletions(-).

## Step 3 — Cli half

- `merge-base --is-ancestor main story/STORY-058-13` → yes (main unmoved at `f0c33f7`, story already contains it).
- Read-only preview: `git merge-tree --write-tree --name-only main story/STORY-058-13` → tree `61d902ed`, clean.
- Merge: `git -C cleargate-cli merge --no-ff story/STORY-058-13 -m "merge(story/STORY-058-13): Codex loop harness +
  verify-install for Codex"` → clean, `0e5b0acdbbcbd9b955aa7ae2c68792b3891f0686`, tree matches the preview exactly
  (`61d902ed`). Diff stat: 25 files changed, 5439 insertions(+), 59 deletions(-) (`scripts/clean-room/codex-loop.mjs`
  new, `scripts/clean-room/loop-evidence.mjs` new, `scripts/clean-room/loop-script.mjs` new,
  `src/commands/verify-install.ts` +362/-…, 6 new test files, `CHANGELOG.md` +1). No conflict on either half.

## Step 4 — Full suite (merge lane only)

- `cd cleargate-cli && npm test`: **3653 tests / 3651 pass / 0 fail / 2 skipped**, 1206 suites, 611.6s — exactly the
  plan's D4 total (previous merge's 3569 + 84 default-tier for -13). No regression.
- Rule-14 revert: `git diff --name-only` under `.cleargate/delivery/**` listed 38 pending-sync files touched by the
  suite's wiki/back-sync side effects; reverted exactly that list via `git checkout --`. No
  `cleargate-planning/MANIFEST.json` diff appeared (expected no-op per the 2026-09-25 STORY-058-01 amendment —
  nothing regenerates that path anymore). The 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`,
  `token-ledger.jsonl`) were left untouched, never reverted, never committed.
- One unrelated artifact appeared mid-run and was **not** touched: `.cleargate/sprint-runs/SPRINT-41/reports/BUG-100-qa-red.md`
  (concurrent QA-Red lane for BUG-100, one of the four other active worktrees named in the dispatch — confirmed
  absent from that worktree's own copy, so it is that lane's report landing at its conventional OUTER path, not a
  test-suite artifact). Left in place, not reverted, not authored by this dispatch.

## Step 5 — BD (build)

- `npm run build` (which runs `prebuild` automatically via npm's lifecycle hook naming): exit 0. Log:
  `[prebuild] cleargate-planning payload composed: 88 files`, `scaffold split view composed: 107 files`,
  `[build-manifest] 82 files`, then `tsup` CJS/ESM/DTS build success.
- `node scripts/verify-pack.mjs`: `OK — 232 files, payload 88, version 0.26.1` — **unchanged** from the pre-merge
  measurement.
- `node scripts/build-codex-payload.mjs --check`: exit 0.
- **Payload identity.** `diff -rq /private/tmp/cg-s41-payload-pre-058-13 templates/cleargate-planning` → only
  `MANIFEST.json` differs. `jq -S 'del(.generated_at)'` on both copies of that file → **0 content differences**.
  For `templates/scaffold/**` (no pre-merge snapshot was taken of that tree per the dispatch's step-1 instruction,
  which only copies `templates/cleargate-planning`): confirmed by `git diff --stat f0c33f7 HEAD -- scaffold/` being
  **empty** — no scaffold source changed by this merge, so `build-manifest.ts`'s per-root manifests under
  `templates/scaffold/{core,hosts/claude,hosts/codex}/MANIFEST.json` are deterministically unchanged content-wise
  (module is a pure function of scaffold source plus `generated_at`). No count or content delta found anywhere.

## Step 6 — Doctor

- `node cleargate-cli/dist/cli.js doctor --cwd OUTER`: exit 0, **0** `scaffold drift:` lines. Output carried one
  pre-existing advisory (`5 sprint files carry a retired execution_mode: field`) and one pre-existing stale
  hook-failure log line from 2026-09-26 — neither is drift, both pre-date this dispatch.

## Step 7 — Post-BD witnesses

- **codex-loop check (expected FAIL, per M7 §4.2):**
  ```
  codex-loop check: FAIL (ref=main) — needs a live human-trust PASS run on the final artifact inputs
  ```
  exit 1, **only** that reason (no `stale`). Recorded per plan, not treated as a failure — step L/RS-L is the
  outstanding gate, deferred to after M7.
- **Smoke `--host codex`:** fresh `git init` + `init --yes --host codex` + `verify-install --json` → exit 0.
  15 `checks` entries all `pass` (7 core + 8 `codex.*`), 8 `live` entries (`codex.live.*`), `ok: true`. Dir deleted
  by exact path afterward.
- **Smoke `--host all`:** same pattern → exit 0. 20 `checks` entries all `pass` (7 core + 5 `claude.*` + 8
  `codex.*`), 15 `live` entries (7 `claude.live.*` incl. `agents-md-exposure`, 8 `codex.live.*`), `ok: true`,
  `installed`/`verified`/`registered` all `["claude","codex"]`. Dir deleted by exact path afterward.
- **M2 pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, solo, baseline dir untouched —
  verified via `find -newer`):
  - `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`: **5/5** pass.
  - `test/commands/init-host-parity.red.integration.node.test.ts`: **15/15** pass.

## Step 8 — State

`CLEARGATE_STATE_FILE=.../SPRINT-41/state.json node update_state.mjs STORY-058-13 Done` → confirmed via
`state.json`: `state: "Done"`, `updated_at: "2026-09-27T08:48:21.199Z"`.

## Step 9 — Teardown

- Both `<cw>` and `<ow>` verified `git status --porcelain` empty before removal.
- `git -C cleargate-cli worktree remove <cw>` (first) → exit 0.
- `git -C OUTER worktree remove .worktrees/STORY-058-13` (second) → exit 0.
- `git worktree list` in both repos confirms no `STORY-058-13` row remains. The four other active worktrees
  (`BUG-047`, `BUG-100`, `BUG-101`, `BUG-103`) are untouched.
- Story branches **kept** in both repos (`story/STORY-058-13` still exists in outer and cli) — the dispatch and
  the plan do not call for deletion.

## Step 10 — Outer status check

```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/reports/BUG-047-qa-red.md
?? .cleargate/sprint-runs/SPRINT-41/reports/BUG-100-qa-red.md
```
Only the 4 ledger files plus this report (once written) and two untracked reports from concurrent, unrelated
QA-Red lanes (BUG-047, BUG-100 — the other active worktrees named in the dispatch preamble) remain. Neither was
created, edited, or touched by this dispatch.

## Findings

- None blocking. The merge was conflict-free on both halves (both `git merge-tree` previews matched the committed
  merge trees exactly).
- Two files landed transiently in the OUTER main checkout mid-dispatch from concurrent lanes
  (`reports/BUG-100-qa-red.md`, later also `reports/BUG-047-qa-red.md`) — normal concurrent-lane activity per rule
  20 (4 build lanes + 1 merge lane), not touched, not part of this story's scope.
- `codex-loop.mjs check` on `main` correctly still reports the deferred live-run gate; this is the mechanism
  working as designed (M7 §4.2), and remains the RS-L boundary step's job after the rest of M7 merges.

```yaml
flashcards_flagged:
  - "2026-09-27 · #devops #merge #contract-first · Two clean --no-ff merges (outer then cli) both matched their own read-only merge-tree preview tree hash exactly."
  - "2026-09-27 · #devops #rule-14 · git diff --name-only under .cleargate/delivery/** after a full cli suite run can list 38 files touched by wiki/back-sync side effects; revert exactly that list, nothing else."
```
