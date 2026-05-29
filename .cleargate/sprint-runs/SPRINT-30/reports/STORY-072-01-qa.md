---
story_id: "STORY-072-01"
report_type: "qa"
sprint_id: "SPRINT-30"
created_at: "2026-05-19T00:00:00Z"
agent: "qa"
commit: "9e379f75"
verdict: "PASS"
qa_bounces: "0"
arch_bounces: "0"
---

# QA Report — STORY-072-01

## Verdict

QA: PASS

## Inputs

- Worktree: `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-072-01`
- Commit: `9e379f75`
- Test file: `cleargate-cli/test/commands/init-gitignore-expansion.node.test.ts`

## Typecheck

TYPECHECK: pass — `npm run typecheck` exits 0, no output.

## Tests

TESTS: 5 passed, 0 failed, 0 skipped

Runner: `npx tsx --test test/commands/init-gitignore-expansion.node.test.ts`

All 5 scenarios passed in 3.6s. No skipped tests.

## Acceptance Coverage

ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios covered.

| # | Scenario | Test | Result |
|---|---|---|---|
| 1 | `.env` is gitignored | `scenario 1: .env is gitignored after fresh init` | PASS |
| 2 | `.env.example` is NOT gitignored | `scenario 2: .env.example is NOT gitignored (allowlist preserved)` | PASS |
| 3 | Python + Node markers present | `scenario 3: Python and Node markers present in .gitignore` | PASS |
| 4 | ClearGate blocks preserved | `scenario 4: existing ClearGate blocks preserved in expanded .gitignore` | PASS |
| 5 | re-init preserves user customization | `scenario 5: re-init preserves user customization in .gitignore` | PASS |

MISSING: none

## Mirror Parity

MIRROR_PARITY_VERIFIED: yes

- `cleargate-cli/templates/cleargate-planning/` is gitignored (confirmed via `git check-ignore -v`: rule at `cleargate-cli/.gitignore:5`). Prebuild output is local-only; never committed.
- `diff cleargate-planning/.gitignore cleargate-cli/templates/cleargate-planning/.gitignore` → IDENTICAL (byte-equal post-prebuild).
- Canonical `.gitignore` is 55 lines, 7 section headers: Secrets, OS junk, Python, Node.js, ClearGate per-participant, ClearGate worktrees, ClearGate telemetry.
- `!.env.example` and `!.env.template` appear at lines 6-7, AFTER `.env` (line 4) and `.env.*` (line 5) — correct negation order.
- `/.cleargate/hook-log/` present at line 55 (was absent in QA-Red baseline S4 — correctly added by Dev).

## Spec Deviation: `-v` flag removal

Dev dropped `-v` from `git check-ignore` in the test for Scenario 2. Gherkin says `git check-ignore .env.example exits 1` (no `-v`). With `-v`, git exits 0 on ANY matched rule including negations, producing a false positive for allowlisted files. Without `-v`, git correctly exits 1 for not-ignored files. This matches the literal Gherkin wording and improves test accuracy. ACCEPTED — not a deviation.

## Regressions

REGRESSIONS: none

Pre-existing wiki test failures noted by Dev (build, contradict-cli, ingest, lint-index-budget) predate this story and are not in the touched-file neighborhood.

## DoD Audit

- [x] `cleargate-planning/.gitignore` rewritten with expanded blocks + section headers (55 lines, 7 sections).
- [x] `npm run prebuild` mirrored to npm payload (byte-identical confirmed).
- [x] All 5 Gherkin scenarios covered by tests.
- [x] `npm run typecheck` passes.
- [x] `npm test` (scoped) 5/5 green.
