# DevOps Report — CR-105

role: devops

SPRINT-39 · wave 9 · M3 · the merge that closes M3. Two-repo merge (cleargate-cli own repo +
outer meta-repo). No worktree existed for either half — nothing to tear down. Neither
`story/CR-105` branch was deleted, per dispatch (branch deletion deferred to Gate 4 for every
SPRINT-39 story branch).

## Preflight

- `sprint-context.md` read in full (Sprint Goal, Cross-Cutting Rules, Test Stack, M3
  Adjacent-Implementations context for BUG-042/STORY-054-*).
- `CR-105-qa.md` — `QA: pass` (verdict: "Ship it", all 14 kick-back criteria clear).
- `CR-105-arch-postflight.md` — `POSTFLIGHT: pass`, `GOAL_RELATION: off critical path`.

## Merge Result — A) cleargate-cli

- Repo: `cleargate-cli` (own git repo, gitignored inside the outer meta-repo)
- Target branch: `main`, confirmed at `1133bf7` before merge
- Story branch: `story/CR-105` @ `45816b9`
- Merge commit SHA: `e4cb49f6da0dca5c97aeb3992ac1007e2367557f`
- Merge strategy: `ort`, `--no-ff`, no conflicts
- Diff stat:
  ```
  CHANGELOG.md                                                    |   8 +
  src/commands/init.ts                                            |  20 ++
  src/commands/upgrade.ts                                         |   5 +-
  src/init/inject-claude-md.ts                                    |  18 +-
  test/commands/init.node.test.ts                                 |  11 +-
  test/commands/upgrade-claude-md.red.node.test.ts                |  21 +-
  test/docs/claude-md-block-leads-relocation.red.node.test.ts     | 126 +++++++++
  test/init/claude-md-block-leads.red.node.test.ts                | 308 +++++++++++++++++++++
  test/lib/claude-md-anchoring.red.node.test.ts                   |  13 +-
  9 files changed, 506 insertions(+), 24 deletions(-)
  create mode 100644 test/docs/claude-md-block-leads-relocation.red.node.test.ts
  create mode 100644 test/init/claude-md-block-leads.red.node.test.ts
  ```

## Merge Result — B) outer repo

- Repo: outer meta-repo (this repo)
- Target branch: `sprint/S-39`, confirmed at `764ad6ba` before merge; uncommitted work in the
  working tree survived the branch checkout with zero collateral touch (verified below)
- Story branch: `story/CR-105` @ `71037e5a`
- Merge commit SHA: `68235df94673d3c7a5cf4f5d64070113d06aa13c`
- Merge strategy: `ort`, `--no-ff`, no conflicts
- Diff stat:
  ```
  CLAUDE.md                    | 118 +++++++++++++++++++++----------------------
  cleargate-planning/CLAUDE.md |   2 +-
  2 files changed, 60 insertions(+), 60 deletions(-)
  ```
- Outer checkout left on `sprint/S-39` per dispatch (orchestrator commits the wave-9 close there
  next).

## State Transition

```
CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-39/state.json \
  node .cleargate/scripts/update_state.mjs CR-105 Done
-> Updated CR-105: state="Done"
```

Confirmed via `state.json`:
```json
{
  "state": "Done",
  "qa_bounces": 0,
  "arch_bounces": 0,
  "worktree": null,
  "updated_at": "2026-08-28T21:51:32.426Z"
}
```

`node .cleargate/scripts/validate_state.mjs --state-file .cleargate/sprint-runs/SPRINT-39/state.json`
→ `state.json ... is valid (schema_version=3)`, exit 0.

## Post-Merge Verification

### Typecheck

```
npm --prefix cleargate-cli run typecheck
> tsc --noEmit
```
Clean, no output, exit 0.

### Full default-tier suite (from source, background-run, never piped through tail/head)

```
ℹ tests 2576
ℹ suites 896
ℹ pass 2574
ℹ fail 1
ℹ cancelled 0
ℹ skipped 1
ℹ duration_ms 337714.292792

✖ failing tests:
test at test/commands/sync.node.test.ts:1:18146
✖ exits 2 when no MCP URL or token is configured
  AssertionError: Input did not match /MCP URL not configured|.../
  actual: 'Error: cannot reach https://cleargate-mcp.soula.ge (fetch failed)\n'
```

**`2576 / 2574 / 1 / 1`** — matches the expected line exactly. The sole failure is the documented
pre-existing network-dependent case in `test/commands/sync.node.test.ts` (no outbound network in
this sandbox; fails identically on `main`; not this change). No delta to report.

### Targeted doc-truth run (commit-3 acceptance)

```
npm exec -- tsx --test --test-reporter=tap test/docs/claude-md-block-leads-relocation.red.node.test.ts
# tests 4
# pass 4
# fail 0
# skipped 0
```

`pass 4 · fail 0 · skipped 0` — exactly the required line. These four tests are
`skip: !existsSync`-guarded; `skipped 0` confirms the outer half is fully certified, not
skip-satisfied.

### Block-equal invariant

```
node -e "...block-equal check..."
-> block-equal: true 11762 11762
```

Matches expected `block-equal: true 11762 11762` exactly.

### Root CLAUDE.md leads with the marker

```
$ head -1 CLAUDE.md
<!-- CLEARGATE:START -->
```

Confirmed: the merged root `CLAUDE.md` leads with the START marker at line 1.

**Line-count discrepancy, noted not halted.** The dispatch text expected "187 lines." Three
independent measurements post-merge (`wc -l`, `awk 'END{print NR}'`, `grep -c ''`) all agree the
file is **186** lines — not 187. This matches, not contradicts, the certified record: QA's own
report (§5) states *"Root `CLAUDE.md` is 186 lines (`wc -l` confirmed)"* and the Architect
post-flight independently re-derives *"file length unchanged at 186 newlines."* Both prior gates
passed on 186, so the dispatch's "187" appears to be a stale/transcribed number in the dispatch
text itself, not a merge defect. Reported verbatim per instruction; not treated as a halt because
it is corroborated by two independent prior pass verdicts, not a fresh anomaly, and it does not
match any of the five true-blocker autonomy-contract cases.

## Mirror Parity Audit

CR-105's declared file surface (six files: `cleargate-cli/src/init/inject-claude-md.ts`,
`cleargate-cli/src/commands/init.ts`, `cleargate-cli/src/commands/upgrade.ts`,
`cleargate-cli/CHANGELOG.md`, `CLAUDE.md`, `cleargate-planning/CLAUDE.md`) touches **no** file
under `cleargate-planning/.claude/**` or `.cleargate/knowledge/**` / `.cleargate/templates/**` —
the canonical↔npm-payload mirror pattern (`cleargate-planning/.claude/**` ↔
`cleargate-cli/templates/cleargate-planning/.claude/**`) is not engaged by this story. No `diff`
against the npm payload is applicable.

The one two-tree pair this story *does* touch — `CLAUDE.md` (outer root) ↔
`cleargate-planning/CLAUDE.md` — is not a byte-identical mirror by design (canonical carries a
`:1-6` preamble the live root does not); the correct invariant is the **bounded-block body**
hash-match, which is the block-equal check above.

- `CLAUDE.md` ↔ `cleargate-planning/CLAUDE.md` — block-equal: **clean** (`true 11762 11762`, see
  above). No drift.

No mirror parity drift detected.

## Uncommitted Outer Work — survived the branch checkout and merge, untouched

`git status --short` immediately after the outer merge shows the identical set of modified /
untracked paths as before the branch switch, with no new or dropped entries:

```
 M .cleargate/delivery/pending-sync/BUG-057_Claude_Md_Teaches_Filename_Shape_Deriveb.md
 M .cleargate/delivery/pending-sync/CR-113_One_Bounded_Marker_Grammar.md
 M .cleargate/sprint-runs/SPRINT-39/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-39/plans/M3.md
 M .cleargate/sprint-runs/SPRINT-39/state.json
 M .cleargate/sprint-runs/SPRINT-39/token-ledger.jsonl
 M .cleargate/wiki/index.md
 M .cleargate/wiki/log.md
 M .cleargate/wiki/product-state.md
 M .cleargate/wiki/roadmap.md
 M cleargate-planning/MANIFEST.json
?? .cleargate/delivery/pending-sync/CR-114_Relocation_Whitespace_Scar_Unrecorded.md
?? .cleargate/delivery/pending-sync/EPIC-058_Additive_Multi_Host_Execution_Adapters.md
?? .cleargate/sprint-runs/SPRINT-39/.session-totals.json.tmp.G5Ptvh
?? .cleargate/sprint-runs/SPRINT-39/CR-105-arch-postflight.md
?? .cleargate/sprint-runs/SPRINT-39/CR-105-dev.md
?? .cleargate/sprint-runs/SPRINT-39/CR-105-qa-red.md
?? .cleargate/sprint-runs/SPRINT-39/CR-105-qa.md
?? .cleargate/sprint-runs/SPRINT-39/CR-105-tpv.md
?? .cleargate/wiki/epics/EPIC-058.md
```

(`state.json`'s modification is the `update_state.mjs` write in this dispatch's own §State
Transition step, which is expected — not collateral damage from the merge.) Files owned by the
concurrent session (`EPIC-058_*.md`, `.cleargate/wiki/**`, `cleargate-planning/MANIFEST.json`)
were not touched, read for edit, or committed by this dispatch. This report's own creation is the
only file this dispatch adds.

## Cleanup

- No worktree existed for either `story/CR-105` half — nothing to remove (confirmed via
  `git worktree list` on both repos: cli shows only the `main` checkout, outer shows only the
  main checkout on `sprint/S-39`).
- `story/CR-105` branch **retained** in both repos per dispatch (branch deletion deferred for
  every SPRINT-39 story branch to Gate 4).

## Forbidden actions — none taken

No `git reset --hard`, `stash`, force push, history rewrite, `--no-verify`, or
`SKIP_SURFACE_GATE`. No `git push` to any remote. No file owned by the concurrent session
touched. No commit beyond the two `--no-ff` merge commits. No `cleargate init`, `cleargate wiki`,
or bare `cleargate` invoked. No verification run through `cleargate-cli/dist/cli.js`.
`cleargate-cli` `stash@{0}` left untouched.

## Script Incidents

None. `update_state.mjs` and `validate_state.mjs` were invoked directly per the dispatch contract
(state-transition scripts, not gated through `run_script.sh` per this agent's own capability
surface table). Both succeeded on first invocation; no incident file was produced.

---

STATUS=done
