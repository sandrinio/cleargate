# STORY-048-01 — Architect Post-flight Report

role: architect · STORY=048-01 · 2026-06-04 · post-flight structural & ADR review of branch story/STORY-048-01 (b975f1f impl + f34809a harness fix)

VERDICT: PASS

(1) Boundary / EPIC-027 / ADR — clean. All 7 changed files under daemon/src/ in the connector worktree only; daemon/package.json untouched; no PM-tool SDK import; no import reaches cli/.claude/meta-repo. db_write_set empty (daemon owns no DB).

(2) Daemon architecture rules — all satisfied:
- Backend seam built BEFORE spawn wiring: backend.ts defines Backend interface + ClaudeBackend + createBackendRegistry; spawn.ts receives binary by injection. "claude" literal appears ONLY in backend.ts; turn path (index.ts) names no binary — DoD grep-clean.
- Resolution registry-map only (registry.resolve(backendId)); no instanceof operator.
- Spawn argv exact: -p <prompt> --output-format stream-json --verbose --include-partial-messages (+ optional --resume), shell:false, stdin ignore (=/dev/null), cwd realpath-pinned (symlink-jail, abs-path fallback on ENOENT).
- Staged teardown reaps the FULL descendant tree (not just process group): snapshot before SIGTERM, SIGTERM→grace→SIGKILL on parent, re-walk to fold late forks, then reap every tracked descendant — correct GH#19045 detached-grandchild defense, proven with a real setsid detached grandchild orphan check.
- Connector-exit handler reaps every live turn's tree; index.ts also wires WS-close → same handler (disconnect = reap).
- Runtime version-drift guard absent — acceptable M0 defer (flags pinned to spike-verified surface); non-blocking gap, noted.

(3) New dependencies — NONE. daemon/package.json unchanged (deps: @connector/shared; dev: @types/node, tsx, typescript). Teardown uses a thin native `ps -eo pid=,ppid=` reader via spawnSync — no tree-kill-class dep (correct call: avoids an unmaintained child-process-killing dep + its security surface). dial.ts uses Node built-in WebSocket (no ws dep).

(4) Reuse/altitude — one advisory (NOT a FAIL): teardown.impl.node.test.ts duplicates 3 scenarios now also covered by the fixed red tests → D.5 consolidation candidate (delete the impl-test duplicates once the red suite is confirmed green on the merge runner).

(5) §3.1 surface drift — advisory (v1, NOT a FAIL): tests landed in daemon/src/ (*.node.test.ts) rather than daemon/test/; the package test script globs src/**, so internally consistent + intentional.

(6) db_write_set empty — confirmed.

newDeps: (none)
