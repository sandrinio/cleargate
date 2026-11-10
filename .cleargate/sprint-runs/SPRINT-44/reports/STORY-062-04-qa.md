# STORY-062-04 QA-Verify (role: qa)
QA: PASS | tree story/STORY-062-04 @ ca2b644 | lane standard

TYPECHECK: pass (clean). Fresh shell, TMPDIR=/tmp/cg44q4, one file per invocation, 0 fail / 0 skipped everywhere:
plan-stale-claims.red 4, plan.red 9, plan-endpoint.red 24, plan-roundtrip.red 2, plan-tab.red 14, plan 9, backlog.red 18,
backlog-tab.red 13, dashboard-lifecycle.red 19, tab-shell.red 13, cr101 24, serve 2, render 31, cr097 13, cr102 21, collect 19,
commands/sprint-scope.red 31, scaffold/codex-payload.red 14.

## Mapping (red-now-green) - 5 of 5
- Commit updates membership: plan-roundtrip.red (add CR-120/remove BUG-086, frontmatter-only, next /data sha) + plan-endpoint.red (remove->add chain) + plan-tab.red (client POST body, "+N -M")
- Unready picks warned, not blocked: plan.red warning strings (not approved / fails <criteria>) + plan-tab.red (Commit stays enabled)
- Unguarded writes 403 (4 outline rows + Host + oversize 64 KiB + no-write assertions): plan-endpoint.red
- Stale sha 409 "sprint file changed - reload", file unchanged: plan-endpoint.red / plan-roundtrip.red
- Out-of-date banner: plan.red (bodyOutOfDate) + plan-tab.red (banner text)
Unit (plan.node 9: splitTableRow incl. escaped pipes, deliverablesTableIds) and integration (real server, port 0) minimums met.

## Rule checks (literal)
- R1: bodyOutOfDate compares stories+bugs+crs+proposals vs table ids minus EPIC-* (plan.ts). EXCLUDED_STATUS = Active, Completed, Abandoned; also active sentinel and state.json. Manual: SPRINT-31/37/42/43 offered; SPRINT-44 (Active) absent.
- R2: stale claim -> enabled row, warning "claimed by <X> (<reason>) - will be reassigned"; disabled only for an open claim (reason null). Manual: BUG-102/BUG-106 (SPRINT-41, Completed/archived) enabled with "claimed by SPRINT-41 (completed) - will be reassigned"; PROPOSAL-029 (open SPRINT-29 claim, carryOver) disabled. 
- R5: serve.ts runs remove then add with the sha remove returned; refusal after a write adds `partial: {removed, sha}` (409/422); serialized via runSerial.
- Stale classification parity (plan.ts staleReason vs sprint-scope.ts add branch, same order: no file -> status Completed -> archive path -> else open): no sprint file = stale both; Completed = stale both; archived = stale both; Draft/Ready/Active = open both; Abandoned (pending-sync) = open on BOTH sides (plan shows "in X" disabled; add refuses). Consistent; A-2 follow-up (treat Abandoned claims as stale) remains open on both.
- Observation (non-blocking, matches R2 literal): a non-carryOver item claimed by another open sprint is not listed at all (e.g. BUG-052 in SPRINT-42 absent from SPRINT-43's picker); only carryOver items claimed by an open sprint render disabled.

## Integration hygiene
- `/* STORY-062-0[24] */ }` count 0; `function cgRenderBacklog(` 1; `function cgRenderPlan(` 1.
- `git diff main..HEAD --stat`: 11 files = plan.ts, serve.ts, render.ts, both sprint-dashboard SKILL.md copies, plan.node + 4 red files + plan-stale-claims.red. All within declared 3.1. (serve.node/render.node not modified.)
- C4 frozen exports vs d6c74ac: plan.ts adds PlanCandidate/PlanSprint/PlanData/splitTableRow/deliverablesTableIds/collectPlan; no frozen name renamed or retyped. render()'s second `opts` param is additive.

## Write-endpoint security (code + manual)
planGuard: Host must be 127.0.0.1:<live port>|localhost:<live port>; Origin (if present) likewise; Content-Type exactly application/json; token via timingSafeEqual; Content-Length and streamed size <= 64 KiB (403). No CORS headers. Only POST /plan is routed; GET/PUT /plan -> 404. Writes only via sprintScopeHandler (sprint + item files). Token is in GET / HTML only, absent from /data (verified).

## Manual check (temp copy under /tmp/cg44q4/scratch; server via tsx serve(), port 0 -> 62235; stopped)
- /data: BUG-102 and BUG-106 enabled "will be reassigned"; PROPOSAL-029 disabled (open claim).
- POST /plan: no token 403, wrong token 403, Origin evil 403, Host evil 403, text/plain 403, stale sha 409; tree identical to pre-snapshot after each (diff -rq).
- Valid POST add BUG-102 -> 200. Diffs: BUG-102 sprint_cleargate_id SPRINT-41->SPRINT-43 + stamps (updated_at, updated_at_version); SPRINT-43 gains `- BUG-102` + stamps. Frontmatter-only. Next /data: bugs includes BUG-102, new sha, bodyOutOfDate true (flag works). Warnings in the 200 body (readiness-gates.md missing in scratch; wiki template path under src/ when run via tsx) are fixture/run-mode artifacts, not defects.
- Real repo: `git status --porcelain .cleargate/delivery` empty after (the three pre-existing modified files were committed by the orchestrator as 7433390d during my run; nothing of mine touched the real tree). Scratch wiki/ dir created only under /tmp.

## Task Breakdown / DoD
7 rows unchecked in story file (orchestrator ticks at merge, rule 15; advisory). 2.2 manual steps exercised on the temp copy. Architect review is outside QA.

REGRESSIONS: none. MISSING: none.
