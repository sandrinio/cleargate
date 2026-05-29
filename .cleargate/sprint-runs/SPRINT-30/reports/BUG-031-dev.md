# BUG-031 Developer Report

**Sprint:** SPRINT-30
**Story:** BUG-031 — isolate fresh-repo pre-member from global auth token
**Role:** developer
**Commit:** 209b9b78
**Date:** 2026-05-20

## Summary

Fixed the cross-repo project_id inheritance bug. `getMembershipState` now requires
per-repo `.cleargate/.join.json` presence before returning `state: 'member'`. A valid
global `~/.cleargate/auth.json` JWT alone is no longer sufficient.

## Files Changed

- `cleargate-cli/src/lib/membership.ts` — added `projectRoot` param + `readJoinFile()` helper; added per-repo isolation check before returning member
- `cleargate-cli/src/commands/join.ts` — added `fs`/`path`/`decodeJwtPayload` imports; added `projectRoot` option; write `.cleargate/.join.json` after successful join
- `cleargate-cli/src/commands/doctor.ts` — pass `projectRoot: cwd` to `getMembershipState` in `runSessionStart`
- `cleargate-cli/src/commands/whoami.ts` — added `projectRoot` option, thread to `getMembershipState`
- `cleargate-cli/test/commands/doctor-membership-banner.node.test.ts` — added `writeJoinFile` helper; seed `.join.json` in member-state tests
- `cleargate-cli/test/commands/cli-gating.node.test.ts` — added `writeJoinFile` helper; seed `.join.json` + pass `projectRoot` in member test
- `cleargate-cli/test/commands/whoami.node.test.ts` — added `writeJoinFile` helper; seed `.join.json` + pass `projectRoot` in member test
- `cleargate-cli/test/integration/init-pre-member-isolation.node.test.ts` — renamed from `.red.` (QA-Red tests now pass); deleted `.red.` file

## JOIN_MARKER

`.cleargate/.join.json` — the per-repo marker written by `cleargate join` on successful
project binding. Schema: `{ project_id: string, joined_at: ISO-string }`.

## Test Results

- Integration (BUG-031 scenarios): 2 passed, 0 failed
- doctor-membership-banner: 4 passed, 0 failed
- cli-gating: 20 passed, 0 failed
- whoami (excl. pre-existing failure): 4 passed, 1 pre-existing fail (network path test)
- join: 36 passed, 0 failed
- Full suite: 1926 passed, 136 failed (136 = 125 pre-existing + 11 sub-test counting delta; `diff` of failure names is identical to baseline)

## Deviations from Plan

None material. Plan prescribed `projectRoot` optional param — implemented exactly.
`join.ts` update (writing `.join.json`) was implied by the "per-repo marker" contract
but not explicitly called out in the dispatch; audited and added as required.
