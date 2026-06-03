# CR-077 Developer Report

**Sprint:** SPRINT-34
**Date:** 2026-06-03
**Status:** done

---

## Summary

CR-077 closes the F3 + F6 portability gap: the shipped ClearGate scaffold was carrying meta-repo-specific EPIC-028 node:test policy in `developer.md`, `qa.md`, `architect.md` and a `cd cleargate-cli` literal in `gate-checks.json` that would permanently false-FAIL every non-node target's gate. This CR:

1. Strips the EPIC-028 policy from the three canonical agents and parameterizes them off `sprint_context.md §Test Stack`.
2. Rewrites `gate-checks.json` shipped defaults to empty strings (no `cd cleargate-cli`); sets the meta-repo live copy to `npm run typecheck/test --workspace=cleargate-cli`.
3. Adds the `## Test Stack` structured block to `sprint_context.md` template (canonical + live mirror).
4. Implements `detect-test-stack.ts` (`detectTestStack` / `applyTestStack`) and wires it into `init.ts` as Step 3.5 (post-`copyPayload`, pre-Step 4) with a defensive `try/catch` so a detector error never breaks `cleargate init`.

---

## Files Changed (by class)

### Class 1 cli (`cleargate-cli/` — `story/CR-077` branch, commit `1132391`)
- `src/init/detect-test-stack.ts` — NEW: detector module + `applyTestStack`
- `src/commands/init.ts` — MODIFIED: Step 3.5 wiring (import + call + advisory stdout)

### Class 2 canonical-live-deferred (outer `story/CR-077`, commit `421df138`)
- `cleargate-planning/.claude/agents/developer.md` — EPIC-028 policy stripped, §Test Stack parameterized
- `cleargate-planning/.claude/agents/qa.md` — `*.red.node.test.ts` literals replaced with §Test Stack references
- `cleargate-planning/.claude/agents/architect.md` — TPV step red-test naming generalized

### Class 3 tracked-live-on-merge (outer `story/CR-077`, commit `421df138`)
- `cleargate-planning/.cleargate/scripts/gate-checks.json` — shipped defaults = empty strings
- `.cleargate/scripts/gate-checks.json` — meta-repo live = `npm run typecheck/test --workspace=cleargate-cli`
- `cleargate-planning/.cleargate/templates/sprint_context.md` — `## Test Stack` block added
- `.cleargate/templates/sprint_context.md` — byte-identical mirror

---

## Wiring (Step 3.5 in `init.ts`)

Inserted between the `copyPayload` action-logging loop (line ~315) and Step 4 (settings merge). The call:

```ts
import { detectTestStack, applyTestStack } from '../init/detect-test-stack.js';

// Step 3.5: Detect + apply test stack.
try {
  const stack = detectTestStack(cwd);
  applyTestStack(cwd, stack);
  if (stack.resolved) {
    const parts = [stack.backendRunner, stack.frontendRunner].filter(Boolean);
    stdout(`[cleargate init] Test stack: ${parts.join('/')}\n`);
  } else {
    stdout(`[cleargate init] Test stack unresolved — populate sprint_context.md §Test Stack\n`);
  }
} catch {
  stdout(`[cleargate init] Test stack unresolved — populate sprint_context.md §Test Stack\n`);
}
```

The `filter(Boolean)` avoids the `/vitest run` artifact for vitest-only targets.

---

## Targeted Verification Results

| Check | Result |
|-------|--------|
| `tsc --noEmit` (cleargate-cli) | PASS (exit 0) |
| Detector tests `init-test-stack-detect.red.node.test.ts` | 14/14 pass |
| Eviction harness `cr077_eviction.red.sh` | 3/3 pass |
| Init-area tests `test/init/** test/commands/init*.node.test.ts` | 77/78 pass; 1 pre-existing failure (`copy-payload-perms.node.test.ts` — `ReferenceError: it is not defined`, vitest-style `it` without import, confirmed pre-existing on clean baseline before stash) |
| No new failures from wiring | confirmed (stash/unstash comparison) |

---

## Gate-command fix (post-Architect pre-gate catch, 2026-06-03)

The §C.6 Architect pre-gate scan revealed that the meta-repo live `gate-checks.json` and `config.yml` were using `npm run typecheck --workspace=cleargate-cli` / `npm test --workspace=cleargate-cli`. This form fails with "No workspaces found: --workspace=cleargate-cli" because the outer meta-repo has no npm workspace configuration (`cleargate-cli/` is a gitignored independent repo). The pre_gate_runner.sh typecheck step was therefore erroring on every arch scan.

**Root cause:** M1 plan §3a directed reuse of `config.yml:24-26` strings — those strings were themselves latently broken and had never been exercised on the live gate path.

**Fix applied:**
- `.cleargate/scripts/gate-checks.json`: replaced all three `--workspace=cleargate-cli` occurrences with `npm --prefix cleargate-cli run typecheck` and `npm --prefix cleargate-cli test`. The `--prefix` form runs the sub-package script from the repo root without needing `cd` (dodges the un-subshelled-cd cwd-leak in pre_gate_runner.sh).
- `.cleargate/config.yml` `gates:` block: same substitution for `typecheck`, `test`, and `precommit` keys, keeping `lint` untouched.
- Canonical `cleargate-planning/.cleargate/scripts/gate-checks.json` left unchanged (empty strings, as required by eviction test).

**Verification:**
- `pre_gate_runner.sh arch "$PWD" sprint/S-34` → exit 0, `[PASS] typecheck`
- `cr077_eviction.red.sh` → 3/3 passed, exit 0 (canonical still empty; live `--prefix` contains no `cd cleargate-cli`)

---

## Deferred to Gate-4

The following items are deliberately deferred per M1 §7 Risk 3 + DoD §8 last bullet:

1. **`npm run prebuild`** — mirrors canonical `cleargate-planning/.claude/**` → `cleargate-cli/templates/` payload. Required before `cleargate-cli/dist/` reflects the stripped agents. NOT run during this Developer dispatch.
2. **`cleargate init` live re-sync** — re-syncs live `/.claude/` from the updated payload. Order: prebuild FIRST, then init. This is the BUG-024 class load-bearing order.
3. **`npm run build` in `cleargate-cli/`** — makes `detect-test-stack.ts` live in `dist/cli.js`. Until then, detector runs source-only via `tsx --test`.
4. **Mirror-parity tests** (`qa-content`, `agent-developer-section`, `canonical-live-parity`) — will go RED until Gate-4 re-sync. This is expected deferred drift. Do NOT "fix" by editing live `/.claude/`.
5. **F6 end-to-end regression** (§5c: `cleargate init` into non-node `mktemp -d` → assert `gate-checks.json` has no `cd cleargate-cli`) — requires `npm run prebuild` first; deferred to Gate-4 per M1 §7.3.
