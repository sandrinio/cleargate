# STORY-063-03 QA-Verify (role: qa)

QA: PASS

- Red tests unmodified: `git diff 83d0753 d54d516 -- test/` = only `test/snapshots/hooks/post-shell-ingest.story-063-03.sh`; byte-equal to canonical with `__CLEARGATE_VERSION__`->0.5.0. Codex hook copy byte-equal to the Claude one.
- `npm run typecheck` exit 0. `build-codex-payload.mjs --check` exit 0.
- Eight explicit files, all exit 0, 0 fail: post-shell-ingest integration 22 pass/1 skip (the CLEARGATE_PERF timing half); shell-ingest 17; wiring 10; claude-hook-addition-bash 6; emit-context-fallback 2; ingest-docs 25; clean-room 13; codex-loop 2.
- Coverage: Outline rows 1-5 (git mv, mv, sed on dirty file, CLI rewrite, edit+commit): PASS (+codex row). Deleted/Draft directive: PASS. Budget: deterministic half PASS (no node, no cleargate, silent); timing half skipped without CLEARGATE_PERF (see PERF). Error E2: PASS. R1 wiring tests PASS; R2 rows PASS; R3 deleted skipped PASS; R4 PASS (claude JSON, codex plain, version-skew fallback); R5 deterministic half PASS; R6 missing/corrupt snapshot, CLI fail, non-repo, lock, merge guards PASS. MISSING: none.
- Smoke (temp repo, tsx stub): run 1 after `git mv` printed one JSON `hookSpecificOutput.additionalContext`, but the content was the synthesis-template ENOENT warning (active-sprint.md under tsx), as anticipated, so the ✅ line was not seen; relied on integration row 1 (passes). Run 2 silent, rc 0. E2 with failing stub: prints the `⚠️ wiki ingest failed … hook shell-ingest exited 1` line, rc 0.
- Deviations: (a) status via process substitution with `rev-parse --git-dir` non-repo fallback: sound, non-repo test passes. (b) `diff --name-status -M -z`: sound, rename covered by unit tests. (c) single `rev-parse --path-format=absolute --git-path` for the three markers: prints three independent absolute lines, hook loops and tests each with `-e`. Verified with only `.git/rebase-apply` present (MERGE_HEAD absent): hook exited 0 silently with a dirty delivery file, i.e. the guard fired, not masked. Requires git >= 2.31 (here 2.50.1); a failing rev-parse yields an empty list and skips the guard (non-blocking, acceptable).
- Wiring: settings.json Bash group and `CLAUDE_HOOK_ADDITION` Bash command both `${CLAUDE_PROJECT_DIR}/.claude/hooks/post-shell-ingest.sh` (byte-equal, tested); hooks.json Codex Bash group; `CODEX_HOOK_SCRIPTS` lists it; manifest pin-aware rows for `.claude/` and `.codex/`; `CLEARGATE_HOOK_SCRIPT_NAMES` includes it; one `# cleargate-pin:`; no non-comment `exit [1-9]`.
- Docs: protocol §10.9 #2 names post-shell-ingest.sh and matches behaviour; ingest agent (md + toml) no longer says "via Task" (now the orchestrator's step); no 150 ms "measured green" claim in protocol or agent docs.
- PERF (not judged): load avg 7.5-8.1. QA run `CLEARGATE_PERF=1` timing test: hook p95 344.1 ms, baseline p95 91.9 ms, delta 252.3 ms (test failed on 150 ms at this load). Dev measured 467 vs 87. Release gate re-runs on a quiet machine (decision 12).

Flashcard candidates:
- "2026-11-12 · #qa #hooks · smoke of hooks via tsx stub hits synthesis-template ENOENT; use the integration harness for the ✅ line"
- "2026-11-12 · #qa #perf · CLEARGATE_PERF timing test is load-sensitive (load 7+ gives ~250-380 ms delta); judge on a quiet machine"
