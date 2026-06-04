# STORY-046-04 — QA-Verify Report (adversarial multi-lens)

role: qa · STORY=046-04 · 2026-06-04 · Mode: VERIFY (read-only, 3 independent lenses) · adapted: E2E integration story (the test IS the deliverable; QA-Red/TDD split N/A per §4.1 0-unit/4-E2E)

QA: PASS
ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios
MISSING: none
REGRESSIONS: none (shared 7 / broker 31 / daemon 35 after workspaces +"e2e")
Orchestrator independently re-ran the E2E suite at the barrier: 4/4 pass, 0 skipped (claude ready), zero orphaned `claude -p` processes after; broker re-run 3× all 31/31 (the flagged no-cross-talk flake did not reproduce).

## Lens 1 — Real integration (genuine, not stubbed): PASS
harness.ts composes the REAL broker (createGateway over a router+relay sharing ONE MemoryRegistry — the 046-03 attachment seam) + REAL daemon (dial/register/turn-runner) + test-app, CONNECTOR_SHARED_SECRET on both edges, free loopback port. Green path drives a REAL claude turn via the unmodified ClaudeBackend (9.7s live round-trip), asserts strict seq-monotonic ordering THROUGH the broker relay + stream_end terminal. The app talks to the broker, not directly to the daemon. Two-result replay uses the real captures-2.1.162/02-background.ndjson (2 result records) and asserts both turn_results arrive before stream_end/turn_end. No mocks/bypasses.

## Lens 2 — No-orphans genuine (sprint-goal crux): PASS
Cancel-mid-background spawns a REAL detached grandchild ({detached:true, unref}) in its own process group, tracks its pid via sentinel file, sends cancel through the broker relay, asserts !isAlive(grandchildPid) within a 5s deadline — kill is NOT mocked; reap uses 048-01's ps -eo pid=,ppid= full-tree walk (snapshot before SIGTERM), not kill(-pgid). Green path's assertNoLeakedDescendants walks the test process subtree via ps and filters survivors by command line (catches any claude / 120s sleeper). 2 runs, no flake, no post-run orphans.

## Lens 3 — No-hang + clean skip + M0 scope: PASS
claude probe is spawnSync timeout:20000 + killSignal SIGKILL; live test bodies wrapped in node:test timeouts (120s/30s); readTurn resolves {timedOut:true} on expiry (never rejects/hangs); grandchildPid poll capped. Scenario 4 always runs and validates the skip machinery (t.skip with non-empty reason when claude absent); deterministic scenarios 2+4 unconditional. Harness binds 127.0.0.1 only; no public exposure, no daemon listener; README documents the claude prereq + Tailscale private-mesh dogfood note ("do NOT expose publicly at M0"). No load-test/real-auth/admin creep. Sibling suites green after the workspaces edit.

flashcards_flagged: [] (dev appended 3 E2E cards directly; orchestrator approved + marked processed)
