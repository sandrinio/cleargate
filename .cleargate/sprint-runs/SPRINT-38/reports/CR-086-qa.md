---
work_item: CR-086
sprint: SPRINT-38
wave: 6
agent: qa
modes: [red, verify]
verdict: PASS
acceptance_coverage: 5 of 5
transcribed_by: orchestrator
red_commit: 195194f
---

# CR-086 — QA report

## QA-Red
`QA-RED: WRITTEN` (`195194f`, cli repo) — `test/scaffold/file-surface-gate-e2e.node.test.ts`,
**15/21 legs red** against the dead chain. Red legs: 1 (block), 3a (worktree block), 4a (prose
precision — the leg that also fails a dispatcher-only partial fix), 5a/5b (bypass + sole-bypass
control), 6a/6b (dispatcher unit, relative + absolute symlink), 8a-8d ×2 tiers (doc truth).
Legs 2, 3b, 4b, 5c, 7 pass today — green-by-accident, kept as controls.

QA corrected the M3 plan's colour ledger: the plan predicted leg 5a green-by-accident, but its
second assertion checks stderr text, which the dead chain never emits — genuinely red, and a
stronger assertion.

## QA-Verify — `QA: PASS`, 5 of 5 acceptance, no regressions
- **Blocks off-surface** — real positive control: stderr carries `[surface-gate] BLOCKED` + the path.
- **Allows on-surface** — now meaningful, since leg 1 proves the chain is live.
- **Fires in a linked worktree** — `.active` confirmed absent from the worktree before committing;
  both block and allow resolve correctly via `SPRINT_STATE_ROOT`.
- **Prose-bearing §3.1 rows parse** — the load-bearing assertion. QA additionally hand-ran the
  shipped `first_backticked()` awk against synthetic cells (no backticks, empty backticks,
  bold-wrapped, prose-only): no crash, correct extraction, no-backtick cells contribute nothing.
- **`SKIP_SURFACE_GATE=1` sole bypass** — plus a structural regex guard proving exactly one `SKIP_`
  token exists in the canonical script.

**Portability** — zero `readlink -f` / `realpath` / `mapfile` / `${x,,}` / associative arrays in the
edited scripts (bash 3.2.57 confirmed). **Eviction check** — `bash -x .git/hooks/pre-commit` in the
main checkout still shows the old `continue → exit 0`, confirmed to be for the sole correct reason
(live hook Gate-4-deferred + CR unmerged at the time). **Parity** byte-identical; no stray
`.cleargate/delivery/**` mutations.
