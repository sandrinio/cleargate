# QA Report — STORY-071-01

**Story:** STORY-071-01 — Anchor Sprint Execution Autonomy contract in protocol doc + propagate to all loop agents + soft PreToolUse hook
**Sprint:** SPRINT-30 (M2, Wave 4)
**Dev commit:** `28aed0fd`
**QA-Red commit:** `c5fd850b`
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-071-01`
**QA date:** 2026-05-22

---

## STORY: STORY-071-01
## QA: PASS
## TYPECHECK: pass
## TESTS: 44 passed, 0 failed, 0 skipped (targeted Red files); 1974 passed, 138 failed, 56 cancelled (full suite — all failures pre-existing, zero dev-introduced)

---

## ACCEPTANCE_COVERAGE: 6 of 6 Gherkin scenarios

### Scenario trace

| Scenario | Test file | Test IDs | Result |
|---|---|---|---|
| 1: protocol doc carries Sprint Execution Autonomy section + 5 cases | `autonomy-contract.red.node.test.ts` | p1–p7 | PASS |
| 2: each loop agent carries the contract | `autonomy-contract.red.node.test.ts` | a1×5, a2×5, a3×5, a4 | PASS |
| 3: SKILL.md is cross-referenced | `autonomy-contract.red.node.test.ts` | s1–s3 | PASS |
| 4: soft hook logs when AskUserQuestion fires during Active sprint | `pre-tool-use-autonomy.red.node.test.ts` | t0, t1, t2, t3 | PASS |
| 5: hook is silent without active sprint | `pre-tool-use-autonomy.red.node.test.ts` | t0, t4, t5 | PASS |
| 6: settings.json wires hook into PreToolUse | `autonomy-contract.red.node.test.ts` | j1–j4 | PASS |

---

## MISSING: none

---

## REGRESSIONS: none

Regression analysis: full suite shows 138 failures / 56 cancelled both WITH and WITHOUT the dev commit (confirmed via stash/pop baseline run — identical counts). Dev-touched files are exclusively `.md`, `.sh`, and `.json` (no `.ts` source changes). No test failure count change attributable to this story's changes.

Note: Dev reported 122 failures in the full suite; QA observes 138. The +16 difference is environmental variance (pre-existing infrastructure failures in token-ledger + advisory-env-gate + close-sprint tests that are environment-sensitive). The stash baseline confirms this variance predates the dev commit.

---

## Verification Detail

### Protocol doc (§22)
- `.cleargate/knowledge/cleargate-protocol.md` carries heading `## 22. Sprint Execution Autonomy` at line 786.
- Prior max was `## 21. Status Vocabulary` at line 618. §22 is the correct next slot.
- All 5 blocker case strings verified in doc: "Destructive action" (line 802), "Secret / credential handling" (line 804), "User-intent decision" (line 806), "True technical impossibility" (line 808), "Spec-internal contradiction" (line 810).
- Section includes rule, rationale, scope note (SDR exempt), true-blockers list, not-blockers list, and BLOCKED fallback instruction.

### Agent files (5 of 5)
- `architect.md`, `developer.md`, `qa.md`, `devops.md`, `reporter.md` — all carry `## Autonomy Contract` heading at line 10 (immediately after role prefix).
- All 5 contain "MUST NOT" and "AskUserQuestion".
- All 5 cross-reference the protocol section by NAME (`§ Sprint Execution Autonomy`), not by number (`§22`). Cross-Cutting Rule 8 satisfied.
- `reporter.md` additionally references "autonomy-warnings" log (sprint-close read requirement).

### SKILL.md cross-reference
- Line 640: `See .cleargate/knowledge/cleargate-protocol.md § Sprint Execution Autonomy for the canonical rule and blocker enumeration.`
- Name-based reference confirmed. No `§22` number used. Cross-Cutting Rule 8 satisfied.

### Hook script
- Path: `cleargate-planning/.claude/hooks/pre-tool-use-autonomy.sh`
- Shebang: `#!/usr/bin/env bash`
- Permissions: `0755` (executable bit set)
- Soft mode: `set -u` with `|| true` fallbacks throughout; `exit 0` always (including final line).
- `jq` absent degradation: exits 0 silently — correct.
- Reads `CLAUDE_PROJECT_DIR` with fallback to `.` for test fixture compatibility.
- Log format: `<iso-timestamp>\tAskUserQuestion\t<agent>\t<question-summary>` — tab-separated per API contract.
- Note: hook uses `set -u` (not `set -euo pipefail` as spec template showed). This is strictly correct for soft-mode: `set -e` could cause non-zero exit if any subcommand fails. The `|| true` fallbacks throughout make behavior equivalent. No acceptance criterion requires `set -euo pipefail`.

### settings.json
- `cleargate-planning/.claude/settings.json` PreToolUse array contains entry with `matcher: "AskUserQuestion"` pointing at `pre-tool-use-autonomy.sh`.
- Pre-existing entries (Task + pending-task-sentinel, Edit/Write + stamp-and-gate) unchanged — additive only.

### NPM payload mirror
- `cleargate-cli/.gitignore` line 5: `templates/cleargate-planning/` — gitignored as expected. Dev notes payload regenerates at pack time via `npm run prebuild`. No QA failure — expected behavior per dogfood-mirror discipline.
- `cleargate-planning/MANIFEST.json` updated (73 files).

### Test execution (actual runs)
- Targeted Red files: `44 pass, 0 fail, 0 skip, 0 cancel` (confirmed in QA shell).
- Typecheck: `npm run typecheck` exits 0, no TypeScript errors.
- Full suite: `1974 pass, 138 fail, 56 cancel` — failure count identical pre- and post-commit (baseline stash run = same counts). No deviation in Dev-touched test neighborhoods.

---

## VERDICT: ship it.

All 6 Gherkin scenarios covered. Protocol §22 is present and correct. All 5 agent files carry the Autonomy Contract subsection with name-based cross-reference. SKILL.md cross-reference is correct. Hook exists, is executable, always exits 0, logs correctly under Active sprint, and is silent under no-sprint / non-Active / non-AskUserQuestion conditions. settings.json is wired additively. Typecheck clean. 44/44 Red tests green. Full suite regression count unchanged from pre-commit baseline. The +16 failure delta vs Dev's report is pre-existing environmental variance, not a regression.

DoD items remaining for orchestrator (not QA gates):
- Live `/.claude/agents/*.md` + `/.claude/hooks/pre-tool-use-autonomy.sh` + `/.claude/settings.json` re-sync via `cleargate init` re-run against meta-repo (orchestrator post-merge DoD item).
- Visual confirm of live agent file headers after re-sync.

---

## flashcards_flagged:
- "2026-05-22 · #qa #regression #baseline-variance · full-suite failure count can vary by ~15 across test runs — always confirm via stash-baseline before attributing delta to story changes"
