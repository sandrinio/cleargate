role: architect

# CR-036 Post-Flight Review (W4)

**Commit:** `55257eb` on `story/CR-036` worktree `.worktrees/CR-036`
**Reviewer:** Architect (post-flight, read-only)
**Time budget:** ~10 min, observed under
**Verdict:** **PASS** — all 7 review checks satisfied.

## 1. Step 3.5 v2-fatal / v1-advisory branching — PASS

`.cleargate/scripts/close_sprint.mjs:516-551`

```
518:  const isEnforcingV2 = isV2 && state.execution_mode === 'v2';
519:  const MIN_BUNDLE_BYTES = 2048;
520:  if (process.env.CLEARGATE_SKIP_BUNDLE_CHECK === '1') {
521:    process.stdout.write('Step 3.5 skipped: CLEARGATE_SKIP_BUNDLE_CHECK=1 set (test seam).\n');
522:  } else {
...
539:      if (isEnforcingV2) {
540-545:        v2 hard-block path → process.exit(1)
546:      } else {
547:        process.stderr.write(`Step 3.5 warning (v1 advisory): ${msg}\n`);
```

Branching matches the M4 plan requirement exactly: `isV2 && execution_mode === 'v2'` for fatal; v1 path emits to stderr and proceeds. `CLEARGATE_SKIP_BUNDLE_CHECK=1` short-circuits the entire block — the analogous test seam pattern to `CLEARGATE_SKIP_MERGE_CHECK` at Step 2.8.

`MIN_BUNDLE_BYTES = 2048` (line 519) matches the M4 plan threshold (2KB). Bundle path resolves to `<sprintDir>/.reporter-context.md` (line 517).

## 2. Reporter prompt — bundle is the ONLY input — PASS

`cleargate-planning/.claude/agents/reporter.md`:

- **Capability Surface table** (line 14): `Default input` row says _"Bundle is the only input; do NOT Read, Grep, or Bash-shell-out to source story bodies, plan files, raw git log, hook logs, or FLASHCARD.md. If a slice is missing, surface it as a Brief footnote."_
- **§Inputs** (top of agent body): _"Read this first and only. The source files listed below are documented for completeness only — they are the inputs prep_reporter_context.mjs slices into the bundle. Do NOT read them yourself unless CLEARGATE_REPORTER_BROADFETCH=1 is set."_
- Escape-hatch is documented + explicit (env CLEARGATE_REPORTER_BROADFETCH=1 logged + auto-flashcarded).
- New §"Token Budget Discipline (CR-036)" + §"Fresh Session Dispatch (CR-036)" sections are present and correct.

Source-file fallback path in the prior reporter.md has been textually replaced — there is no remaining "fall back to source files" verbiage outside the diagnostic escape-hatch.

## 3. Fresh session_id mechanics — PASS, minimal & correct

`cleargate-planning/.claude/skills/sprint-execution/SKILL.md:380` (§E.2):

> Fresh session. The Reporter MUST dispatch in a fresh session — do not inherit dev+qa cumulative context. `write_dispatch.sh` already spawns a clean shell child; the `Agent` tool path requires no session-continuation flag. If the runtime offers a session-reset knob (e.g. `--resume false` or equivalent), use it.

reporter.md §"Fresh Session Dispatch (CR-036)" matches this exactly: Agent tool needs no flag (Task creates new conversation per dispatch), shell-child fallback is `bash .cleargate/scripts/write_dispatch.sh <sprint-id> reporter`. Architect's M4 plan note that `Agent` tool path doesn't need `--resume` is honored — no unnecessary mechanics imposed.

## 4. Budget thresholds emit to stdout — PASS

`cleargate-planning/.claude/hooks/token-ledger.sh:404-422`:

```
405:  if [[ "${AGENT_TYPE}" == "reporter" ]]; then
406:    REPORTER_TOTAL=$(( DELTA_IN + DELTA_OUT + DELTA_CC + DELTA_CR ))
407:    REPORTER_BUDGET_SOFT=200000
408:    REPORTER_BUDGET_HARD=500000
409:    if [[ "${REPORTER_TOTAL}" -gt "${REPORTER_BUDGET_HARD}" ]]; then
410:      printf '\n⚠️ Reporter token budget exceeded: %s > %s (HARD advisory)\n' \
411:        "${REPORTER_TOTAL}" "${REPORTER_BUDGET_HARD}"
...
419:      printf '\n⚠️ Reporter token budget exceeded: %s > %s (soft warn)\n' \
```

Both `printf` calls have **no `>&2` redirect** — they go to stdout. The CR-032 chat-injection hook reads stdout, so warnings will be surfaced into the orchestrator chat. The outer wrapper at line 433 (`} 2>> "${HOOK_LOG}"`) only redirects stderr, leaving stdout intact. Auto-flashcard via `cleargate flashcard record` at line 414 is best-effort + `|| true` — never blocks. Correct.

## 5. Snapshot lock — `cr-036` supersedes `cr-026` — PASS

`cleargate-cli/test/snapshots/hooks-snapshots.test.ts:107-140`:

- Line 107-117: `'CR-026 snapshot file exists (historical baseline — superseded by CR-036)'` — assertion only that the file exists; no live-vs-cr-026 byte-equality check.
- Line 119-140: `'token-ledger.sh matches CR-036 snapshot byte-for-byte'` — reads `cleargate-planning/.claude/hooks/token-ledger.sh` (canonical) vs `cleargate-cli/test/snapshots/hooks/token-ledger.cr-036.sh` and asserts `live.equals(snapshot)`.

Snapshot file size: 435 lines (`token-ledger.cr-036.sh`) vs 415 lines (`token-ledger.cr-026.sh`) — 20-line delta matches the CR-036 budget block additions (lines 404-422 = 19 effective lines + comment header).

Verified: `diff cleargate-planning/.claude/hooks/token-ledger.sh cleargate-cli/test/snapshots/hooks/token-ledger.cr-036.sh` returns empty — byte-equal. The snapshot test will pass.

## 6. close_sprint.mjs canonical mirror — EXISTS + byte-equal

The Dev report's claim of "live-only" is **incorrect**. The canonical mirror DOES exist at `cleargate-planning/.cleargate/scripts/close_sprint.mjs` (31,625 bytes, modified 2026-05-04 09:50 — same minute as the commit). The flashcard `2026-05-01 #scaffold #mirror #prebuild` correctly states the canonical-mirror invariant.

Verified byte-equality:
- `diff .cleargate/scripts/close_sprint.mjs cleargate-planning/.cleargate/scripts/close_sprint.mjs` → empty (no diff).
- Both files contain `MIN_BUNDLE_BYTES = 2048`, `isEnforcingV2`, `CLEARGATE_SKIP_BUNDLE_CHECK` test seam.
- token-ledger.sh canonical = `cleargate-planning/.claude/hooks/token-ledger.sh` is also byte-equal to live `.claude/hooks/token-ledger.sh`.

Mirror parity is preserved. Dev report claim is an oversight in note-keeping but not a code issue. Recommendation: amend the dev report's parity statement at next opportunity, but no rework required.

## 7. SPRINT-21 fixture self-check — PASS

`.cleargate/sprint-runs/SPRINT-21/.reporter-context.md` exists in the **main repo working tree** (orchestrator's pre-merge verify left it):
- 1119 lines, 110,111 bytes (≈108KB).
- Far exceeds `MIN_BUNDLE_BYTES = 2048`.
- SPRINT-21's own Gate-4 close will pass Step 3.5 cleanly under v2.

The bundle is absent from the worktree itself, which is expected — the verification runs against the live sprint dir, not the worktree's. The dev report's claim of "108KB" is accurate.

## Tests added

| File | Scope | Cases |
|---|---|---|
| `cleargate-cli/test/scripts/test_token_ledger.sh` | bash table-driven | 4 new (Cases 19-22): under/soft/hard/non-reporter |
| `.cleargate/scripts/test/test_close_pipeline.sh` | bash close-pipeline | 3 new (Scenarios A/B/C): v2 SKIP, v2 missing-bundle, v1 missing-bundle |
| `cleargate-cli/test/scripts/test_close_sprint_v21.test.ts` | vitest | existing tests updated with `CLEARGATE_SKIP_BUNDLE_CHECK: '1'` |
| `cleargate-cli/test/scripts/close-sprint-reconcile.test.ts` | vitest | 1 line added: `CLEARGATE_SKIP_BUNDLE_CHECK: '1'` |
| `cleargate-cli/test/scripts/fixtures/sprint-v1-legacy/state.json` | fixture | `execution_mode: v1` (corrected from prior v2 — v1-era sprint) |
| `cleargate-cli/test/scripts/fixtures/stub-cleargate-cli/cleargate` | fixture | new stub (records invocations for flashcard assertion) |

Test seam pattern is consistent with `CLEARGATE_SKIP_MERGE_CHECK` for Step 2.8. Production paths are NEVER opted out — env var must be explicitly set.

## Flashcards flagged

None new — the four CR-036-relevant cards (`#close-pipeline #step-3.5`, `#reporter #fresh-session`, `#scaffold #mirror #prebuild`, `#test-harness #hooks #sed`) were correctly recorded by the dev pass and are referenced in code comments.

## Risks / open items

- **None blocking.** CR-036 is mergeable.
- Minor doc nit: dev report says close_sprint.mjs is "live-only"; canonical mirror exists and is byte-equal. No code impact.

---

```
ARCH: PASS
V2_FATAL_GUARD: ok
BUDGET_STDOUT: ok
SNAPSHOT_LOCK: cr-036-supersedes-cr-026
CLOSE_SPRINT_MIRROR: live+canonical
flashcards_flagged: []
```
