<!-- Orchestrator-collected follow-ups for the SPRINT-41 Reporter and close triage. Source of truth for items to file under EPIC-058 / next sprint. Persisted from session scratch 2026-09-27. -->

# SPRINT-41 close follow-ups (orchestrator scratch, appended 2026-09-26 post-compaction)
- gate-v2.integration 3/5 pre-existing: gateQaHandler/gateArchHandler run_script argv-ordering (gate.ts:422/:457) (BUG-097 QA)
- flashcard SKILL.md description contains ' #' -> Codex YAML listing truncates it (-11 TPV card 7)
- -11 F9 story-text amendment applied AFTER QA-Red re-seal dispatch (no cli surface gate; order deviation noted)
- RS-4 list = 8 hooks + lib/harness.sh (M5-A54 correction)
- BUG-090 post-flight: 2.6c phantom-led parent no-op write still archives + logs Completed (throw when no status line replaced) — BUG-098 or new bug
- BUG-090 post-flight: one malformed parent aborts all remaining 2.6c flips, message says "No frontmatter"
- BUG-090 post-flight: doctor.ts two double blank lines (cosmetic); M6.md:954 stale offset-0 regex text
- BUG-090 D9: add ONE correction flashcard superseding 4 stale cards (2.6c no-op skip; offset-0 regex ---- closer; assert_story_files.mjs:162 ^---; doctor runCanEdit/runSessionStart skip <instructions>-led)
- CR-124 post-flight: launch_wave ref allowlist admits '-x' and '..' — harden in worktreeAddCommand after -12 (require alnum first char)
- CR-124 post-flight: fail-safe trailing-wave stories have no upstream edges -> integrationReady says ready immediately (EPIC-055 automation concern; blueprint gap)
- CR-124 post-flight: -12 Codex rendering replaces §C.0.2 -> §A.4 pointer dangles; -12 must re-freeze SKILL.md + launch_wave.mjs fixtures (hashes in CR-124-arch.md)
- CR-124 post-flight: enforcement line 103 "file-disjointness" claim stale; collision_surface.sh:40 "five-clause" stale; launch_wave usage line names 4 exports
- BUG-098 D9 (post-merge): record correction card: 2026-09-26 · #frontmatter #correction · BUG-098 merged: sprint.ts writers, 2.6d, parent-approved, slug, intake, doctor, 2 scripts read past <instructions>. (marks FLASHCARD lines 124/125/126/140 stale per BUG-098-arch)
- BUG-098 post-flight follow-ups: sprint archive moves malformed item unstamped + logs archived (silent); 2.6d per-story catch; null/comment-only YAML can't be stamped; sprint writers drop inline template # comments (yaml.dump); audit-status --fix preview shows <instructions> example line; 2 leftover offset-0 parsers in scripts (one dead)
- Merge order after CR-124: -11 first (lane priority; harness-bearing QA), BUG-098 re-integrates once after -11 + RS-4
- status-vocab-phase-b.red runs a real npm run prebuild in CLI main mid-suite (test-order side effect) — follow-up
- -11 post-flight follow-ups: timeout on codex debug prompt-input call; --write never deletes extra generated files; frontmatter reader accepts ': ' YAML rejects; CLAUDE.md hand-port advice must say copy hooks + lib/ together; skills verdict keeps last root mapping only; M5-A54 +90 stale (actual +96)
- Agents deleted scratchpad files by glob twice (*.mjs by -11 TPV2; *.txt/*.log/*.patch/*.tmp by -11 post-flight) — cards added; tell agents exact-name deletes only
- -12 TPV-A6: `cleargate host add` bypasses payloadFilter (lifecycle.ts:293-294) — serial-surface rule never reaches host add; file under EPIC-058 before any wave-parallel host declares `.agents`.
- -12 TPV: dispatch-serial CLI main guard vs symlinked path (re-seal pins it); verify at QA.
- Surface gate resolves the "active" item by max updated_at in main state.json; same-state update_state is a no-op, so a BUG twin commit resolved STORY-058-11's §3.1 and blocked (BUG-098 DevOps, 2026-09-27). Consider resolving by branch name (story/<ID>) first.
- -12 post-flight PF12-FU-1..6 (plans/M6.md PF12-A4): record accepts any wave member; dispatchSerial sprintId/sprintBranch validation; uncaught error exit 1 collides with INVALID; build-codex-payload header stale; payload-parity tests read stale templates/; flashcard-gate UTF-8 vs raw bytes (low). File under EPIC-058 with TPV-A6.
- -13 cross-story risk: live orchestrator cwd — dispatch_serial resolves repo root from git toplevel of cwd; follow-up CR to add "from the repository root" to Codex R2.
- RS-CLOSE reminder: codex-hooks-evidence.md's last scripted run (RS-4, cli 0399beb) is already stale vs cli main (BUG-098 changed src). RS-CLOSE must append a fresh scripted run on the final cli + a live PASS (RS-4L) before close Step 2.9 can pass for STORY-058-10; same for claude-baseline (-09) and codex-loop (-13).
- Merge order decided: -12 DevOps + RS-5 → BUG-099 DevOps (cli-only, +4, disjoint) → -13 integrate (picks up -12 + BUG-099; possible codex-hooks.mjs conflict with -13 pass B edits).
- Dashboard check (browser, 2026-09-27): M6 card state correct (-12 Done, -13 In Progress, BUG-099 QA Passed; 21/23 done). Findings: (a) token metrics implausible — ledger delta sums give output 440.3M, cache_read 109,748M over 5150 rows (≈100 agent dispatches); token-ledger delta accounting over-counts (likely cumulative transcript re-counted per SubagentStop / per turn) → dashboard "OUTPUT TOKENS 440.3M" and Reporter cost numbers untrustworthy; (b) durable dashboard.html opened statically polls /data every 2s → 404 console errors; should detect static mode and stop polling.

## STORY-058-13 post-flight (reports/STORY-058-13-arch.md §7; M6 PF13-A5) — file under EPIC-058 at close
- PF13-FU-1 sealed evidence row: root update_state "QA Passed" keeps terminal-state PASS (QA-Red, next touch)
- PF13-FU-2 codex.roles / codex.skills pass vacuously on empty payload listing (V2) → fail with split view unavailable
- PF13-FU-3 restrict role threads to root-dispatched children (merge/terminal-state/worktree verdicts)
- PF13-FU-4 ancestry-based merge check (--is-ancestor facts), name storyHead source; live risk R3
- PF13-FU-5 parseLoopRuns anchors from header block only (V3)
- PF13-FU-6 Controls evidence column shows blocked run id + feedback; Trust label trusted_hash → currentHash (trustStatus trusted)
- PF13-FU-7 dispatches: require defined role (undefined===undefined passes)
- PF13-FU-8 prepare's printed run hint: full F10 L4 form (--meta-repo, --evidence)
- PF13-FU-9 allow multi-turn children when identity lines agree (R4; F8 15d re-scope)
- Process: -13 arch_bounces=2 (TPV reject + post-flight B1, both plan-origin) — one more escalates; Reporter should note plan-origin bounce pattern (M6 copied SKILL.md:536 list, missed :448)
