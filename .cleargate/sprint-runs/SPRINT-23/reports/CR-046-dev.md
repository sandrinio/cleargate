# CR-046 Dev Report — run_script.sh Wrapper + Script Incidents

**Story:** CR-046
**Worktree:** `.worktrees/CR-046/`
**Branch:** `story/CR-046`
**Commits:**
- `0540f9d` — initial implementation
- `763e7f7` — Path A back-compat fix (after Architect kickback)

**Status:** done
**arch_bounces:** 1/3
**Typecheck:** pass
**Tests:** 38 passed, 0 failed

## Files changed

- `.cleargate/scripts/run_script.sh` — REWRITTEN to arbitrary-cmd interface (`bash run_script.sh <command> [args...]`). 763e7f7 added back-compat extension-routing shim (~15 LOC): if arg-1 matches `*.mjs` AND exists at `${SCRIPT_DIR}/${arg1}` → exec node; if `*.sh` AND exists → exec bash; otherwise treat as arbitrary executable. Self-exemption: `RUN_SCRIPT_ACTIVE=1` env guard + `exec "$@"`. Failure path writes `.script-incidents/<ts>-<hash>.json` with full schema.
- `cleargate-cli/src/lib/script-incident.ts` — NEW typed schema (ScriptIncident interface + MAX_STREAM_BYTES + isScriptIncident guard).
- `cleargate-planning/.claude/agents/{architect,developer,devops,qa,reporter}.md` — NEW `## Script Invocation` section. reporter.md gained Workflow step 7 for incident aggregation. architect.md L60+L62 prose lines updated to NEW form (in 763e7f7).
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — wrapper-mandatory bullets at §C.3, §C.4, §C.5, §C.6 + new §C.11 Script Invocation Contract.
- `cleargate-cli/test/scripts/run-script-wrapper.red.node.test.ts` — Red tests (5 scenarios + self-exemption).
- `cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts` — NEW companion test (763e7f7) — 3 scenarios / 7 assertions exercising the REAL wrapper via spawnSync (no spawnMock). Catches the regression that the original Red test missed.
- `cleargate-planning/.cleargate/scripts/run_script.sh` — canonical mirror.
- `cleargate-planning/MANIFEST.json` — auto-updated by prebuild.

## Acceptance trace

All 7 acceptance criteria PASS (verified by QA-Verify + Architect re-review).

## Goal advancement

Goal clause: *"script failures become structured incident reports instead of raw bash output"* — delivered. Wrapper writes `.script-incidents/<ts>-<hash>.json` on failure; Reporter aggregates into REPORT.md §Risks Materialized via the new Workflow step.

## Architect kickback resolution

Original 0540f9d broke 6 production CLI call-sites that passed `<script-name>.{mjs,sh}` and relied on the OLD interface routing. Path A back-compat shim (763e7f7) restores the old extension-routing for files in `${SCRIPT_DIR}` while keeping the NEW arbitrary-cmd interface. Conservative `-f SCRIPT_DIR/*` predicate avoids typo false-positives. SMOKE_CLI confirmed: `cleargate sprint preflight SPRINT-23` no longer 127s.

## Notable design decisions

- Bash truncation uses `${var:0:N}` (char-index, not byte-count) — ASCII-safe per M1 plan acknowledgment; UTF-8 multi-byte boundary edge deferred to CR-049 self-repair iteration.
- Self-exemption uses `RUN_SCRIPT_ACTIVE=1` env guard + `exec passthrough` (canonical recursion-prevention pattern).

## Flashcards flagged

- `2026-05-04 · #bash #substring · bash ${var:0:N} truncates by character index (not byte) — safe for ASCII; UTF-8 multi-byte chars near boundary may split.`
- `2026-05-04 · #test-harness #regression · spawnFn mock never exercises real run_script.sh wrapper — back-compat routing regression went undetected; always add one real end-to-end invocation test.`
