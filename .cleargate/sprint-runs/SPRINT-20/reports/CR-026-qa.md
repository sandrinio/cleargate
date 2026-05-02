# CR-026 QA Report

QA: FAIL
ACCEPTANCE_COVERAGE: 4 of 6 Gherkin scenarios have matching tests
MISSING: Scenario 2 (dispatch marker written on Task() spawn — end-to-end), Scenario 3 (SubagentStop consumes marker → ledger row + hook log line)
REGRESSIONS: none
flashcards_flagged:
  - "2026-05-02 · #qa #test-coverage #integration · M3 integration test file (cr-026-integration.test.ts) was spec'd but not delivered; unit tests alone do not cover cross-hook end-to-end flow"

---

## Test re-run: SKIPPED

Per orchestrator instruction (MODE: LIGHT). Developer reported 127 passed, 0 failed with clean typecheck. QA did not re-execute vitest or npm run typecheck.

---

## Commit inspected

SHA: bd6eb4f  
Branch: story/CR-026  
Files changed: 15  

---

## Gherkin scenario mapping (M3 §"Test scenarios")

| # | Scenario | Test | Status |
|---|---|---|---|
| 1 | Pre-fix sentinel: SPRINT-18 ledger has 1 distinct pair | Manual check only (no automated test; SPRINT-18 ledger verified to have 1 pair = BUG-004/architect) | Advisory — no automated enforcement |
| 2 | Dispatch marker written on Task() spawn (pre-tool-use-task.sh) | `cr-026-integration.test.ts` — NOT PRESENT | **MISSING** |
| 3 | SubagentStop consumes marker → ledger row + `dispatch-marker:` log line | `cr-026-integration.test.ts` — NOT PRESENT | **MISSING** |
| 4 | SessionStart-poisoned transcript → banner skipped, correct attribution | `token-ledger-attribution.test.ts` CR-026-B (line 508) | PASS |
| 5 | All 6 `pre-tool-use-task.test.ts` scenarios (STORY/BUG/CR/EPIC/no-marker/parallel) | Lines 161–414, 11 tests total (6 required + 5 additional) | PASS |
| 6 | Smoke test (manual, post-merge) | Manual; not automatable | Advisory |

---

## File-surface compliance (CR-026 §3 vs diff --name-only)

**In-spec modifications:**
- `.claude/hooks/token-ledger.sh` — Defect 1 (newest-file lookup) + Defect 2 (BANNER_SKIP_RE + banner-skip). PASS.
- `.cleargate/scripts/write_dispatch.sh` — 4-line FALLBACK PATH comment header. PASS.
- `CLAUDE.md` — Dispatch Convention paragraph replaced inside CLEARGATE block (line 143). PASS.
- `cleargate-planning/.claude/hooks/token-ledger.sh` — byte-equal mirror. PASS.
- `cleargate-planning/.claude/hooks/pre-tool-use-task.sh` — NEW, byte-equal mirror of live. PASS.
- `cleargate-planning/.claude/settings.json` — `pre-tool-use-task.sh` added as second hook in PreToolUse:Task array. PASS.
- `cleargate-planning/.cleargate/scripts/write_dispatch.sh` — NEW canonical mirror. PASS.
- `cleargate-planning/CLAUDE.md` — Dispatch Convention paragraph replaced inside CLEARGATE block (line 52). PASS.
- `cleargate-planning/MANIFEST.json` — 62 files; `pre-tool-use-task.sh` (tier:hook, overwrite_policy:always) and `write_dispatch.sh` (tier:script, overwrite_policy:always) entries present; `settings.json` retains merge-3way. PASS.
- `cleargate-cli/test/hooks/pre-tool-use-task.test.ts` — NEW, 11 scenarios. PASS.
- `cleargate-cli/test/hooks/token-ledger-attribution.test.ts` — CR-026-A + CR-026-B appended. PASS.
- `cleargate-cli/test/snapshots/hooks-snapshots.test.ts` — byte-equality snapshot test added. PASS.
- `cleargate-cli/test/snapshots/hooks/token-ledger.cr-026.sh` — NEW snapshot. Verified byte-equal to live token-ledger.sh. PASS.

**Off-surface modifications (not listed in CR-026 §3 or M3 file surface):**
- `cleargate-cli/scripts/build-manifest.ts` — adds `script` tier to TIER_RULES.
- `cleargate-cli/src/lib/manifest.ts` — adds `'script'` to the `Tier` type.

These two files are not in the §3 "Modify" list. However, they are required build-tooling enablers for the `script` tier MANIFEST entry that M3 explicitly mandates. The Do NOT modify list excludes only `cleargate-cli/src/lib/token-ledger.ts`. The changes are in build scripts and a type definition — no production logic altered. Assessed as justified enablers, not regressions.

**Live `.claude/settings.json` not committed:**
`.claude/` is gitignored in the main repo (per CLAUDE.md "LIVE dogfood instance (gitignored)"). The canonical mirror at `cleargate-planning/.claude/settings.json` was correctly updated. The live settings.json update is a post-merge orchestrator action — not a Developer commit-deliverable. No penalty.

---

## Mirror parity

| Pair | Status |
|---|---|
| `.claude/hooks/token-ledger.sh` ↔ `cleargate-planning/.claude/hooks/token-ledger.sh` | BYTE-EQUAL |
| `.claude/hooks/pre-tool-use-task.sh` ↔ `cleargate-planning/.claude/hooks/pre-tool-use-task.sh` | BYTE-EQUAL |
| `.cleargate/scripts/write_dispatch.sh` ↔ `cleargate-planning/.cleargate/scripts/write_dispatch.sh` | BYTE-EQUAL |
| `.claude/hooks/token-ledger.sh` ↔ `cleargate-cli/test/snapshots/hooks/token-ledger.cr-026.sh` | BYTE-EQUAL |
| `CLAUDE.md` Dispatch Convention ↔ `cleargate-planning/CLAUDE.md` Dispatch Convention | TEXT-EQUAL (both match M3 verbatim paragraph) |

---

## Hook executability

- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-026/.claude/hooks/pre-tool-use-task.sh` — `-rwxr-xr-x` PASS
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-026/cleargate-planning/.claude/hooks/pre-tool-use-task.sh` — `-rwxr-xr-x` PASS
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-026/.cleargate/scripts/write_dispatch.sh` — `-rwxr-xr-x` PASS
- `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-026/cleargate-planning/.cleargate/scripts/write_dispatch.sh` — `-rwxr-xr-x` PASS

---

## BUG-024 defect coverage

| Defect | M3 resolution | In commit | Verified |
|---|---|---|---|
| Defect 1: session-id mismatch | Path-B newest-file lookup | `DISPATCH_FILE="$(ls -t "${SPRINT_DIR}"/.dispatch-*.json 2>/dev/null | head -1)"` at token-ledger.sh | YES |
| Defect 2: transcript-grep poisoned by banner | BANNER_SKIP_RE constant + jq select + sed filter | Constant defined; jq `select(. | test($banner_re) | not)` applied; sed fallback applies `sed -E "/${BANNER_SKIP_RE}/d"` | YES |
| Defect 3: manual write_dispatch.sh unreliable | PreToolUse:Task hook auto-writes | `pre-tool-use-task.sh` created; `write_dispatch.sh` demoted to fallback with comment | YES |
| Bonus: `.pending-task-*.json` dead code | DEFERRED to SPRINT-21 CR-029 per M3 GOTCHA-1 | Not removed; deferred correctly | YES (deferred per spec) |

---

## Reason for FAIL

`cleargate-cli/test/hooks/cr-026-integration.test.ts` is explicitly listed in M3 §"Test shape → Real-infra integration test" as a NEW file requirement. It covers M3 Gherkin Scenarios 2 and 3:

- Scenario 2: fire `pre-tool-use-task.sh` with synthetic `tool_input.prompt="STORY=026-01 ..."` + `subagent_type=developer` → assert `.dispatch-*.json` written with correct fields.
- Scenario 3: fire `token-ledger.sh` with that dispatch file present → assert ledger row `work_item_id=STORY-026-01`, `agent_type=developer`, dispatch file renamed to `.processed-*`, hook log contains `dispatch-marker:` success line.

These two scenarios specifically validate the end-to-end cross-hook attribution chain — the core fix of CR-026. Their absence means the primary regression risk (pre-tool-use-task.sh writes an unreadable format, or token-ledger.sh fails to consume it) is uncaught by automated tests.

The per-hook unit tests (pre-tool-use-task.test.ts and token-ledger-attribution.test.ts CR-026-A/B) cover each hook in isolation; the integration test covers their composition. The plan treats `cr-026-integration.test.ts` as a required deliverable ("NEW file"), not optional.

**Fix required:** create `cleargate-cli/test/hooks/cr-026-integration.test.ts` per M3 §174–178 spec. Single `it()` using `execFileSync` against both hooks, tmpdir repo root, `SPRINT-CR-026-TEST` sentinel, synthetic stdin JSON for pre-tool-use-task.sh, synthetic transcript for token-ledger.sh. Assert ledger row fields + renamed dispatch file + both hook log lines.


---

## Rework Verify — 2026-05-02 (Round 2)

QA: PASS

### Checks performed (MODE: LIGHT — test re-run skipped per orchestrator instruction)

**1. Integration test file exists**
`/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-026/cleargate-cli/test/hooks/cr-026-integration.test.ts` — present, 298 LOC.

**2. M3 §174–178 recipe compliance**

| Requirement | Status |
|---|---|
| Single `it()` exercising both hooks in sequence | PASS — one `it('end-to-end: pre-tool-use-task.sh writes dispatch → token-ledger.sh consumes it …')` at line 228 |
| `execFileSync` against real bash hooks (no mocks) | PASS — `execFileSync('bash', [patchedHookPath], …)` at lines 153 + 191 |
| Synthetic stdin / transcript fixtures | PASS — `JSON.stringify({tool_input:{prompt:'STORY=026-01 …',subagent_type:'developer'}})` at line 130; `makeTranscript(…)` at line 260 |
| Tmpdir as fake repo root | PASS — `fs.mkdtempSync(…'cr-026-integration-…')` at line 94; `REPO_ROOT="${env.tmpDir}"` patch at lines 145/183 |
| `SPRINT-CR-026-TEST` sentinel | PASS — `TEST_SPRINT_ID = 'SPRINT-CR-026-TEST'` constant at line 39; sentinel written at line 106 |

**3. Assertions cover all three required checks**

| Required assertion | Location | Status |
|---|---|---|
| Ledger row `work_item_id=STORY-026-01` | Line 278 `expect(lastRow['work_item_id']).toBe('STORY-026-01')` | PASS |
| Ledger row `agent_type=developer` | Line 279 `expect(lastRow['agent_type']).toBe('developer')` | PASS |
| Dispatch file renamed to `.processed-*` and cleaned up | Lines 285–288 `remainingDispatch.toHaveLength(0)` | PASS |
| Hook log contains `wrote dispatch:` (pre-tool-use) | Lines 255 | PASS |
| Hook log contains `dispatch-marker:` (token-ledger) | Line 293 | PASS |

**4. New commit is NEW (not amend)**

`git log sprint/SPRINT-20..story/CR-026` shows 2 commits:
- `5beeb96 test(SPRINT-20): CR-026 integration test for dispatch→ledger chain`
- `bd6eb4f fix(SPRINT-20): CR-026 token-ledger attribution fix (3 defects)`

Commit `5beeb96` is a new commit on top of `bd6eb4f`. Not an amend.

**5. Rework commit scope — ONLY two files**

`git show 5beeb96 --name-only` shows exactly:
- `.cleargate/sprint-runs/SPRINT-20/reports/CR-026-dev.md` (rework note appended)
- `cleargate-cli/test/hooks/cr-026-integration.test.ts` (new test file)

No hook/CLAUDE.md/script edits. Scope is clean.

**6. Dev report rework note**

`CR-026-dev.md` contains `## Rework Pass (qa_bounces=1) — 2026-05-02` at line 56 with fix description and `128 passed, 0 failed` test count. Present and correct.

### Gap from previous FAIL: CLOSED

The only failing item was the missing `cr-026-integration.test.ts`. That file now exists and structurally matches the M3 §174–178 recipe in every required dimension.

ACCEPTANCE_COVERAGE: 6 of 6 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none
