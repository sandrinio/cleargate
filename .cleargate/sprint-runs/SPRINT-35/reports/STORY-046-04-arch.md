# STORY-046-04 — Architect Post-flight Report

role: architect · STORY=046-04 · 2026-06-04 · review of dev commit 8dcc6ef, diff main...story/STORY-046-04

VERDICT: PASS

(1) EPIC-027 boundary CLEAN: all 8 changed files under connector/ (e2e/ package + root package.json/lock workspace edit); no PM-tool SDK; no reach into cli/.claude/meta-repo; no `../../` or absolute cross-repo imports.
(2) Integration architecture REAL: bootHarness composes the REAL broker (createGateway + createRouter + createRelay over ONE shared MemoryRegistry — the 046-03 router-attachment seam) + REAL daemon (startDaemon: dial/register/turn-runner) + test-app, shared-secret stub on both edges, free loopback port. Imported symbols all exist on-branch; injection shapes match (DaemonOpts.registry?: BackendRegistry; GatewayOptions.router?: Router).
(3) New deps: ws ^8.21.0 (runtime — WS client for test-app; ALREADY a broker workspace dep, not a new ecosystem dependency) + @types/ws (dev) + standard tsx/typescript/@types/node. Nothing heavy/unexpected.
(4) M0 scope held: loopback-only (127.0.0.1), no public exposure, no daemon listener, no real-auth/load-test/admin/multi-tenant creep; README documents the claude-logged-in prereq, the clean-skip path, and the Tailscale private-mesh dogfood note.
(5) Reuse/altitude: e2e imports the workspace packages (@connector/broker|daemon|shared) — composes, never reimplements; orphan assertion reuses 048-01's listDescendants.
(6) db_write_set empty — confirmed (no drizzle/pg/redis in e2e/package.json).

FOLLOWUPS (advisory, EPIC-046 hardening — non-blocking for M0):
- The 046-03 no-cross-talk broker test is intermittently flaky (loopback TCP coalescing race; setImmediate drain-queue mitigates but doesn't fully kill). Lives in already-merged 046-03, not this diff. Recommend an EPIC-046 hardening item: robust message-boundary framing on the loopback relay path (length-prefix), then re-run the cross-talk test under it. The same class could surface in the e2e green path under CI timing.
- Headless CI exercises only the deterministic replay (2) + skip-machinery (4) + live-detached-tree reap (3, no claude needed); the real-claude green path (1) is local/dogfood-box only at M0. Document this CI limitation.

NEWDEPS: ws ^8.21.0 (already a broker dep), @types/ws ^8.18.1 (dev)
