# BUG-031 QA Report

role: qa

**Sprint:** SPRINT-30
**Story:** BUG-031 — `cleargate init` inherits a project_id from global state
**Mode:** VERIFY
**Commit:** 209b9b78
**Date:** 2026-05-20

## Result

QA: PASS
TYPECHECK: pass
TESTS: 30 passed, 1 failed (pre-existing baseline fail), 0 skipped
ACCEPTANCE_COVERAGE: 2 of 2 scenarios
MISSING: none
REGRESSIONS: none
DEVIATIONS_ACCEPTED: yes (see rationale)
PRE_EXISTING_WHOAMI_FAIL: verified baseline

## Test Run (scoped)

Files: init-pre-member-isolation.node.test.ts, doctor-membership-banner.node.test.ts, cli-gating.node.test.ts, whoami.node.test.ts
- Test A: PASS — fresh repo with global auth.json → banner = pre-member, FAKE-GLOBAL-PID absent.
- Test B: PASS — after seeding .join.json → banner = member (PER-REPO-PID-12345).
- whoami backward-compat FAIL: `calls exit(5) when mcpUrl is not configured` — verified same failure on commit 8d3287d3 (qa-red baseline before BUG-031 fix). NOT introduced by this commit.

## Acceptance Coverage

- **Scenario 1 (Test A):** fresh tmpdir + global fake JWT → pre-member. COVERED and PASSING.
- **Scenario 2 (Test B):** per-repo .join.json seeded → flips to member (per-repo project_id). COVERED and PASSING.

## Deviations Accepted

1. **Dev added `.cleargate/.join.json` write to join.ts:** ACCEPTED. The dispatch contract (`getMembershipState` checks for per-repo `.join.json`) requires this file to exist after join. join.ts had no per-repo write step before. The write is necessary and correctly scoped (uses `projectRoot`, extracts project_id from refresh JWT, writes atomically, silently handles non-fatal fs errors).

2. **Three existing unit tests updated (doctor-membership-banner, cli-gating, whoami):** ACCEPTED. These tests previously assumed `getMembershipState` returned `member` purely from a valid global auth.json — testing the old (buggy) behavior. Updates align them with the CR-011 per-repo isolation contract by seeding `.cleargate/.join.json` in member-state fixtures.

3. **Banner omits `(identity: ...)` clause vs M1 plan §3 blueprint:** ACCEPTED. QA-Red established the expected banner form as `pre-member — local planning enabled, sync requires join.` (without identity clause). Test and implementation agree. The simpler form still satisfies the CR-011 correctness requirement. M1 plan §3 prescribed the identity-inclusive form as a "sketch," not a verbatim contract.

## CR-011 Contract Verification

Literal contract: "fresh repos with no valid join token on disk MUST be pre-member; only `cleargate join <invite-url>` flips state to member, scoped to the project carried by that invite."

- Fresh repo (no .join.json): getMembershipState returns pre-member regardless of global auth.json validity — CONFIRMED (lines 185-189 membership.ts).
- join.ts writes `.cleargate/.join.json` with `project_id` extracted from the invite's refresh JWT — CONFIRMED (lines 480-499 join.ts). Per-repo project_id beats global.
- Identity (email) remains globally inferable from global auth.json `sub` claim — CONFIRMED (lines 176-179 membership.ts, Cross-Cutting Rule #3).

## Files Verified

- /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-031/cleargate-cli/src/lib/membership.ts
- /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-031/cleargate-cli/src/commands/join.ts
- /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-031/cleargate-cli/src/commands/doctor.ts
- /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-031/cleargate-cli/test/integration/init-pre-member-isolation.node.test.ts
- /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-031/cleargate-cli/test/commands/doctor-membership-banner.node.test.ts
- /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-031/cleargate-cli/test/commands/cli-gating.node.test.ts
- /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-031/cleargate-cli/test/commands/whoami.node.test.ts
