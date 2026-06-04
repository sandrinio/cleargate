# STORY-048-01 — QA-Verify Report (adversarial multi-lens)

role: qa · STORY=048-01 · 2026-06-04 · Mode: VERIFY (read-only, 3 independent lenses, run post-harness-fix)

QA: PASS
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios
MISSING: none
REGRESSIONS: none
Independently re-run by orchestrator at barrier: 12/12 pass across 3 consecutive runs, no flakes, clean tree.

## Lens 1 — Acceptance trace: PASS
All 5 §2.1 Gherkin scenarios map 1:1 to named passing tests (dial-out-and-register, spawn-exact-command, staged-teardown-no-orphans, connector-exit-tears-down-all, no-direct-claude-reference). 12 tests green (≥5 min met). dial-register uses an in-test in-process Node `http` WS stub (no ws package, no broker package import).

## Lens 2 — No-orphans correctness (sprint-goal crux): PASS
teardown.ts tracks descendants via a native `ps -eo pid=,ppid=` full-table walk building a ppid→children adjacency map. Snapshot is taken BEFORE any signal (so the detached grandchild is captured while ppid still points to root), then SIGTERM→grace→SIGKILL on the parent, a second walk folds in late forks, then SIGTERM→SIGKILL every tracked survivor. Explicitly avoids kill(-pgid) (which misses a detached child's own process group). Tests spawn REAL processes (no mocked kill): a parent .mjs forks a detached:true grandchild in its own PGID; post-teardown process.kill(pid,0) probes the OS to assert both gone; an explicit listDescendants().includes(grandchildPid) assertion proves the grandchild is found independently of the PGID. 3 runs × 12/12, zero flakes. Residual: a child forked in the sub-microsecond window between snapshot and SIGTERM that re-parents before the re-walk — explicitly scoped to EPIC-048 Linux/Docker hardening per §1.5 + event-contract.md §Watch-list; M0 contract is macOS/OrbStack only.

## Lens 3 — Backend seam + spawn-correctness: PASS
Zero `claude` string literals in executable turn-path code (index.ts/dial.ts/spawn.ts/teardown.ts) — only comment lines; the binary literal lives solely in backend.ts (ClaudeBackend). Backend resolved exclusively via map.get(backendId) in createBackendRegistry — no instanceof / type-branch. Spawn argv is exactly ["-p", prompt, "--output-format", "stream-json", "--verbose", "--include-partial-messages"] with shell:false, stdio ["ignore","pipe","ignore"] (Node-idiomatic /dev/null stdin), cwd pinned by fs.realpathSync (rejects symlink/relative escape).

flashcards_flagged: (rolled into dev.md)
