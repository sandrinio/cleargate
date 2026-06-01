---
story_id: STORY-043-08
sprint_id: SPRINT-33
agent: developer
status: done
timestamp: "2026-06-01"
---

# STORY-043-08 Developer Report — Conditional Architect Re-Entries

## Summary

Edited canonical SKILL.md §C.3.5 (TPV Gate) and §C.6 (Architect Pass) to make both Architect re-entries conditional on a `pre_gate_runner.sh` flag. Added a new `## Mode: Post-Flight` section to canonical architect.md. Updated `## Mode: TPV` in architect.md with the scan-flag qualifier. Ran `npm run prebuild` in `cleargate-cli/` to sync canonical to payload. All 12 Red scenarios pass.

## Files Changed

- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — §C.3.5 and §C.6 gated on scan result; safeguard block added to both sections; ≤5 dispatch count documented in §C.6.
- `cleargate-planning/.claude/agents/architect.md` — `## Mode: TPV` updated with scan-flag conditional qualifier; new `## Mode: Post-Flight` section added with conditional contract + verbatim safeguard.
- `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — payload copy synced via `npm run prebuild` (byte-identical to canonical).
- `cleargate-cli/templates/cleargate-planning/.claude/agents/architect.md` — payload copy synced via `npm run prebuild` (byte-identical to canonical).

## Test Results

All 12 scenarios in `cleargate-cli/test/scaffold/skill-md-conditional-architect.red.node.test.ts` pass:
- S1 (2 tests): §C.6 + §C.3.5 conditionality confirmed
- S2 (1 test): ≤5 dispatch count documented
- S3 (2 tests): safeguard terms present in BOTH files
- S4 (3 tests): post-flight section + conditional contract + TPV qualifier in architect.md
- S5 (4 tests): canonical exists, payload parity confirmed, Gate-4 live-drift noted

## Safeguard Verbatim (in both files)

> **Safeguard (non-removable):** ANY pre-gate flag — demotion, `arch_bounce` signal, surface drift, new-deps, structural issue, OR exit-2 (scan-could-not-run) — MUST still dispatch the live Architect. Treat exit 2 as a flag (fail toward dispatching, never toward skipping). This optimization removes the Architect ONLY on a proven-clean scan; it never removes the Architect from a flagged path.

## ADR Invariant

The adversarial-core 5-agent split is preserved. This change narrows WHEN the Architect re-enters, never removes the Architect from any risky path. The TPV and post-flight dispatches now fire only on a pre-gate flag, reducing a clean standard-lane story from 6 dispatches to ≤5.

## Deviation from Plan

None. Followed M3.md §STORY-043-08 blueprint exactly. `prebuild` was run (payload parity required by S5 test — the test hard-fails if payload exists and differs from canonical).

## Notes

- Live `/.claude/` copies NOT updated — Gate-4-deferred per M3 SDR §2.3.
- The payload SKILL.md was already present in `cleargate-cli/templates/`, so the S5 parity test ran hard (not skipped). Prebuild was required to make it pass.
- 043-09 must rebase onto this story's SKILL.md changes before its §C.3.5 prose edits at L293 apply cleanly.
