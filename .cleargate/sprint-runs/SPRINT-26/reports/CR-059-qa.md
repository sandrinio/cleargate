# CR-059 QA Report

**Story:** CR-059 — Smarter session-load restart warning  
**Mode:** VERIFY  
**Date:** 2026-05-05  
**QA Agent:** claude-sonnet-4-6

---

## Round 1 (kickback)

QA-Verify flagged 2 gaps from M1 plan — Scenario 5 (idempotent re-init suppresses restart warning for `init.ts`) and Scenario 6 (real hooks change still warns in `init.ts`) were missing from `init.test.ts`. Scenario 7 (parse-failure conservative fallback) flagged as optional but recommended.

Verdict: `QA: FAIL — missing test for "init.ts idempotent restart warning suppression" (Scenario 5) and "init.ts real-change warning" (Scenario 6)`

---

## Round 2

**Commit:** `c84cd66` (test additions on top of `7896ad6` implementation)

### Scenarios Verified

**Scenario 5 — idempotent re-init suppresses restart warning**

Test: `CR-059 scenario 5: idempotent re-init suppresses restart warning` in `cleargate-cli/test/commands/init.test.ts`

Assertion scoping: test asserts on the specific `settings.json` log line (`cap.out.find((line) => line.includes('settings.json'))`), not the full stdout. This is the correct and only valid approach: greenfield `.mcp.json` creation legitimately emits "restart Claude Code to load it" on first init (a distinct string from the settings.json "restart Claude Code if already open"). Scoping to the settings.json line does NOT weaken the assertion — it precisely targets the code path under test and avoids false failures from the `.mcp.json` step. ACCEPTED.

**Scenario 6 — real hooks change still emits restart warning**

Test: `CR-059 scenario 6: real hooks change emits restart warning` in `cleargate-cli/test/commands/init.test.ts`

Asserts `outJoined.toContain('Updated .claude/settings.json')` and `outJoined.toContain('restart Claude Code if already open')`. The "if already open" suffix is the settings.json-specific message; `.mcp.json` uses "to load it" / "to pick up changes". Assertion is unambiguous. ACCEPTED.

**Scenario 7 — parse-failure conservative fallback**

Test: `CR-059 scenario 7: malformed settings.json triggers conservative restart warning` in `cleargate-cli/test/commands/init.test.ts`

Logic path verified: malformed JSON → `catch` in `init.ts:321` → `existingSettings = null` → `existingSettingsContent = '{}'` → `extractSessionLoadDelta` compares `'{}'` vs merged content (has hooks block) → returns `true` → "restart Claude Code if already open" emitted. The assertion `toContain('restart Claude Code if already open')` maps exactly to this path. ACCEPTED.

### Test Run Results

`cleargate-cli/test/commands/init.test.ts` via vitest:
- 26 tests, 26 passed, 0 failed (includes CR-059 scenarios 5, 6, 7 at lines 883, 943, 988)

`cleargate-cli/test/commands/upgrade-restart-warning.red.node.test.ts` via tsx --test:
- 4 tests, 4 passed, 0 failed (Scenarios 1-4: upgrade.ts paths)

### Regressions

None observed. Existing scenarios 1-4 (vitest numbering) unaffected.

---

```
QA: PASS
TYPECHECK: pass (per Dev report — typecheck clean)
TESTS: 26 passed (init.test.ts vitest), 4 passed (upgrade red node:test) — spot-check, no full re-run per memory hint
ACCEPTANCE_COVERAGE: 7 of 7 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none
VERDICT: All 7 scenarios covered and passing. Scenario 5 scoping to the settings.json log line is correct and acceptable — the greenfield .mcp.json creation step independently emits a restart message using different phrasing; scoping prevents false assertion failures without weakening the CR-059 suppression contract. Ship it.
flashcards_flagged: []
```
