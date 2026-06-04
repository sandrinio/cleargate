role: developer

STORY: STORY-046-04
STATUS: done
COMMIT: 8dcc6ef55752fd331b41187a820bad61d7f90570
TYPECHECK: pass
TESTS: e2e: 4 passed, 0 skipped, 0 failed (all 4 scenarios green — claude was ready) + full-suite regression: shared 7/7, broker 31/31 (one flaky `no-cross-talk` failure on first run, 31/31 clean on retry — pre-existing loopback-TCP race, no broker source touched), daemon 35/35
CLAUDE_READY: true (live scenarios 1 + 3 RAN, did not skip; scenario 4 took the present-branch assertion path)
ORPHANS_AFTER: none — `pgrep claude` shows only the operator's own interactive Claude Code sessions + relay plugin daemons (PIDs unrelated to the test runner); no E2E-spawned `claude -p` turn survived; the detached-node-sleeper probe returned exit 1 (zero stray grandchildren); in-suite `assertNoLeakedDescendants(process.pid)` passed after every scenario
FILES_CHANGED:
  - connector/e2e/package.json (new — @connector/e2e workspace)
  - connector/e2e/tsconfig.json (new)
  - connector/e2e/harness.ts (new — broker+daemon+app boot/teardown)
  - connector/e2e/test-app.ts (new — throwaway hello/prompt/cancel app)
  - connector/e2e/relay-e2e.node.test.ts (new — the 4 §2.1 scenarios; this IS the integration test)
  - connector/e2e/README.md (new — claude prereq, skip behavior, Tailscale dogfood note)
  - connector/package.json (workspaces array: +"e2e")
  - connector/package-lock.json (e2e workspace link only — no dep version churn)

NOTES: Built the new `e2e/` package per §3.1 surface. The harness wires the broker's router+relay itself (broker `server.ts` exposes gateway+registry but never attaches a router; the gateway only relays when a router is injected) over ONE shared MemoryRegistry. The daemon's injectable `BackendRegistry` seam let each scenario pick its backend: real `ClaudeBackend` (scenario 1), a fixture-replay backend streaming `captures-2.1.162/02-background.ndjson` through a fresh Readable (scenario 2 — 2 turn_results, second before stream_end/turn_end), and a live detached-node-grandchild tree routed through the Backend (scenario 3 — the same primitive STORY-048-01's teardown test uses; cancel reaps the full tree, grandchild dead). claude readiness is probed ONCE with a hard 20s SIGKILL timer; live turns are hard-capped at 60s via readTurn's turnTimeoutMs (returns timedOut:true, never hangs). No deviations from the dispatch.

r_coverage:
  - { r_id: "R1-green-path-no-orphans", covered: true, deferred: false, clarified: false }
  - { r_id: "R2-two-result-background-replay", covered: true, deferred: false, clarified: false }
  - { r_id: "R3-cancel-reaps-detached-descendant", covered: true, deferred: false, clarified: false }
  - { r_id: "R4-claude-absent-clean-skip", covered: true, deferred: false, clarified: false }
plan_deviations: []
adjacent_files:
  - "connector/broker/src/server.ts"
  - "connector/package-lock.json"
flashcards_flagged:
  - "2026-06-04 · #connector #e2e · broker server.ts boots gateway+registry but does NOT attach a router — the e2e harness must createRelay/createRouter over ONE shared MemoryRegistry and pass it + the router into createGateway, else prompt/event/cancel/turn_end never relay. [SPRINT-35 046-04]"
  - "2026-06-04 · #connector #broker #flaky · broker router.red no-cross-talk test is intermittently flaky (loopback TCP coalescing race the setImmediate drain-queue mitigates but doesn't fully kill); re-run before treating a single failure as a regression — 31/31 on retry. [SPRINT-35 046-04]"
  - "2026-06-04 · #connector #e2e · No-hang E2E rule: probe claude ONCE at suite start with a hard kill-timer (spawnSync timeout+SIGKILL), set a READY flag, t.skip() live scenarios when false; deterministic replay + skip-machinery tests always run regardless. [SPRINT-35 046-04]"
