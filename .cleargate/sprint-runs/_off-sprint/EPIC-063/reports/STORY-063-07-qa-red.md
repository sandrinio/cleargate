# STORY-063-07 QA-Red report

role: qa · Mode: RED · QA-RED: WRITTEN

## Files written
- /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli/test/e2e/clean-room-ingest-loop.red.integration.node.test.ts (new, untracked; nothing else touched, claude-baseline red test untouched)

## Result
59 tests: 55 red (ERR_MODULE_NOT_FOUND for ingest-loop.mjs / session.mjs, `INGEST_LOOP_CHECKS` not exported, assertion on baseline source), 4 green: the limits test and 3 `[REGRESSION ANCHOR]`s (GATING_CHECKS identical; claude-baseline.mjs spawn with `bogus` exits 2 "unknown command"; baseline DEFAULT_MODEL). Validated satisfiable: a throwaway reference impl (since deleted, git status shows only the new test) turned all 59 green.

## Pinned contract (and source of each pin)
- Directive line: `🔎 contradiction check pending for <ID> — before its Brief …` where the first arg is the draft ID, NOT the path (src/hooks/hook-lines.ts:15; hook.ts:278). Delivered as `{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":…}}` (src/hooks/hook-signal.ts:98). Test builds fixtures with the real `contradictionPendingLine`/`ingestedLine`.
- contradictions.md entry: `- draft: "[[ID]]"` / `  neighbor: "[[ID]]"` (src/lib/wiki/contradict.ts:259-266). Test passes before/after text; "gains" = entries not in before.
- Page frontmatter: `raw_path: "…"`, `last_contradict_sha: "<hex>"` (wiki page shape, .cleargate/wiki/bugs/BUG-086.md).
- Silent-drop line: `⚠️ contradiction check missing: N recently edited draft(s) never checked — ID, …` (unchecked-drafts.ts:76-79); test uses the real `formatUncheckedDraftsLine`; id match must be whole-token.
- Hash vectors: 01 vector df3f9228… (contradict-commit.red.node.test.ts:446) plus no-frontmatter 4247dfc6…; two new literals produced once from src `contradictContentHash` (instructions-with-`---` 964fa138…; BOM + instructions + fenced `---` 5cd2c677…); also a src-parity corpus (CRLF, no EOL, empty, fences).
- hook_response shape: hook_name/hook_event/output/stdout/stderr/exit_code/outcome (recorded D1/E1 transcripts). Real recording only contains `SessionStart:startup`; `PostToolUse:<Tool>` and `SubagentStop` names are extrapolated (stated in the test's limits).
- Names chosen beyond the lead's contract (all documented in the test header): parseSessionStream, deriveDirective/Dispatch/Finding/Stamp/BriefLine/Negative/ShellIngest/ReportKept/SilentDropAlarm, evaluatePositiveAttempt, evaluateNegativeSession, buildEvidenceRows, renderIngestRunSection, checkIngestEvidence. Every derive returns `{status:'PASS'|'FAIL', pointer}`.
- session.mjs: four exports, `maxTurns = 4` / `maxBudgetUsd = 1` asserted in source; no `src/` import.

## Ambiguities resolved
1. Directive text uses the draft ID, not path (lead said path); pinned from source.
2. claude-baseline.mjs has no main guard (runs `main()` on load), so "imports cleanly" is asserted by spawning it with `bogus` (exit 2, stderr "unknown command"), plus a red source check that it imports `./session.mjs` and no longer defines the four functions.
3. Hook discrimination uses `hook_name` (`PostToolUse:Edit|Write|MultiEdit` for directive, `PostToolUse:Bash` for shell), exit_code 0, scanning all events; SubagentStop keyed on `hook_event`.
4. stamp/brief rows cover both drafts (positive attempt 1 AND negative); directive/dispatch/finding come from the positive session; negative row from the negative session. Flake: only finding may pass via attempt 2; its pointer must contain "attempt 1" and "attempt 2".
5. Evidence file format is the driver's own (`## Run N — …` + `| Check | Room | Result | Evidence |` table, last run wins); tests build it only through `renderIngestRunSection`, so Developer may choose the header text but not the row shape `| id | room | PASS/FAIL | pointer |`.
6. FAIL pointers must contain the transcriptPath passed in.

## Amendment (TPV) — A1-A10 applied

Red file now 100 tests: 94 red, 6 green (limits test, 3 `[REGRESSION ANCHOR]`, 2 `[FIXTURE GUARD]` tests that are green by design because the redacted fixture is committed with the amendment). Reds fail for the right reasons: ERR_MODULE_NOT_FOUND for `ingest-loop.mjs`/`session.mjs`, a missing `INGEST_LOOP_CHECKS` export, ENOENT on the not-yet-written `scripts/clean-room/fixtures/ingest-loop/` and on source reads of the new modules, and the baseline-source assertion. As before, a throwaway reference implementation (deleted afterwards; `git status` shows only the test and the fixture) turned all 100 green, so the amendment is satisfiable.

- A1: `asyncPositiveTranscript()` (two inits, two results, subagent turn with `parent_tool_use_id`/`agent_id`, SubagentStop, task events) plus swapped / error_max_turns / no-result companions. `Parsed` gains `resultSubtype`, `resultCount`; `init` exposes `claude_code_version` and `model`.
- A2: fixture `test/fixtures/ingest-loop/claude-2.1.322-async-agent-probe.stream.jsonl` (39 lines; 31 byte-identical to the probe, 8 changed by path/init redaction; rate_limit_event line dropped). Built from the scratchpad probe (copy kept outside both repos). Redaction guard `redactionViolations()` checks `/Users/`, `claude-501`, `"mcp_servers"`, `"plugins"`, `rate_limit_event`; it has its own self-test, and the fixture test also asserts no `ssuladze` and that both inits hold only the allow-listed keys. All TPV fixture assertions (hooks, directive, tool uses, last result, init, dispatch rename, brief FAIL) added.
- A3: decorated-label positives and negatives (table row, "No Contradictions: found", mid-line). The binding regex is the Developer's, not in the test.
- A4: 5 parity cases, 4 throw-parity cases, `deriveStamp` unlocatable frontmatter -> FAIL, no throw.
- A5: `buildPrompts`, `SEED_SLUGS`, `SEED_EDITS`, `SESSION_DEFAULTS` pinned (O1: sonnet-5-5 / 20 / 3 / 900000), "contradict" scan over prompts, slugs and `scripts/clean-room/fixtures/ingest-loop/` files and names, non-empty fixtures dir.
- A6: absent contradictions.md as `''` for finding and negative.
- A7: `resetRoomForRetry` in a temp git repo (draft and page restored, untracked wiki file removed, ledger modification kept).
- A8: source scan of `ingest-loop.mjs` for `src/` and `dist/` imports.
- A9: every mkdtemp via `mkTmp(t, …)` with `t.after` cleanup.
- A10: header and LIMITS rewritten (fixture-pinned hook names, FLASHCARD 2026-09-26 cited, turns/budget/timeout limit); O1, O2, O4 recorded in the header.

Not applied as written: none. Judgement notes: the fixture-presence tests are green at the red commit by construction; the TPV "agents" init key keeps the recorded agent names (`claude`, `Explore`, `general-purpose`, `Plan`, `statusline-setup`), which carry no personal data.
