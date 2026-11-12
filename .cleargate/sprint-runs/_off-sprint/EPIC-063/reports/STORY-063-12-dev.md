# STORY-063-12 Dev report (role: developer, off-sprint EPIC-063, M2)

STORY: STORY-063-12
STATUS: done
COMMIT: 4a994b9 (cleargate-cli, branch story/STORY-063-12, on top of a90c44b)
TYPECHECK: pass (`npm run typecheck`, tsc --noEmit clean)
TESTS: scoped five files 215 passed, 0 failed (oracle 60, R3 15, eval 57, corpus 10, edges integration 73). Full `npm test` once before commit: 5053 run, 5051 passed, 0 failed, 2 skipped (EXIT=0, 424 s).

## Default-tier wall time (G-M2-78)
Three default oracle/R3/eval files plus the corpus guards, one tsx run (`--test-concurrency=1`): 142 tests in 54.5 s (shell `time` 55.7 s). `uptime` before: load 6.38 6.11 7.29; after: load 6.60 6.28 7.29 (22:30 to 22:31).
Individually (load 4.5-6.8): oracle file 34.3 s, R3 + corpus 7.7 s, eval 2.4 s. The edges integration file: 73 tests in 33.9 s.

## Real-corpus dogfood (scratch only, outer repo untouched)
Scratch repo = copy of the outer `.cleargate/{delivery,sprint-runs,config.yml,wiki/contradictions.md}` (623 delivery files), git init + tag. Scratch build of this tree at HEAD (`git archive` + symlinked node_modules + `./node_modules/.bin/tsup`), `wiki build` (345 pages), then `doctor --session-start | bash scripts/brief-oracle.sh --compare - <scratch repo>`:
- exit code 0, zero mismatch lines. All eight facts agree: 21 failing gates, 48 open questions, 0 unlabelled contradictions, 5 unfinished close checklists (+63 more); P0/P1 15; last closed SPRINT-44; carried 18; planned SPRINT-31/37/42/43; the five decisions; release `.: v0.0.0 + 0 commits`.
- Oracle cost on the 623-file corpus: compare 1.25 s wall, facts mode 1.00 s wall (load about 6.8). Spawn count: 9 (find x2, sort, awk, jq x3, git x2), constant in the number of delivery files (E9 pins it: equal counts for +60 files, at most 40).
- Room setup was exercised by hand with the scratch build on the corpus (git init, corpus, tag, commit, wiki build, doctor): the oracle compare exits 0 on it. `cleargate init --yes` could not run there because the scratch build has no `templates/cleargate-planning` payload (needs `prebuild`); `packArtifact` runs `npm run build` in its own clone, so the eval path does get it. The live eval (real `claude`, `npm install`, packing) was not run, as instructed.

## FILES_CHANGED (commit 4a994b9)
- `scripts/brief-oracle.sh` (new, mode 100755)
- `scripts/clean-room/orientation-eval.mjs` (new)
- `scripts/clean-room/fixtures/orientation-questions.json` (new)
Tests and the corpus were already on the branch (QA-Red 81ed826 + TPV bounce 34e43ee); not edited. No scaffold/ change, so no gen:codex / payload / manifest step. No CHANGELOG edit (scripts-only; orchestrator writes it at §R).

`git status --porcelain .cleargate/delivery` before and after the full run: identical (` M STORY-063-12_...md`, `?? CR-131_...md`).

## NOTES
Oracle: one awk pass reads every delivery file through `getline` from a sorted path list (frontmatter locator with the `<instructions>` and fence rules, rows keyed by file, block-scalar goals, section/fence/heading tracking, the G-M2-46 answer forms and placeholders, D7 section nesting, D4 report lookup, `release_repos` block/flow parsing); `state.json` and the final object go through `jq`, D8 through two `git` calls per repo. Compare mode runs in one jq program (D-order prefixes with `+N more`, the G-M2-67 P0/P1 split, `[[ID]]` sequences, live caps as byte prefixes, never-excused live lines, raw-marker refusal with exit 2). Works on macOS bash 3.2 and BSD awk (no intervals, no `\s`).
Eval: all exports per the test header; `run` calls `validateContainer` first (relative paths are NOT resolved before it, or a relative container would slip past), then checks jq/git/npm/bash (never `claude`), packs (`--ref`, default `main`) or `npm install cleargate@<v>` (`--version`, identity-gated), builds the room, takes facts from the oracle on the room, runs 12 sessions via `runClaudeSession` (max-turns 8, `--max-budget-usd` default 2, 300 s timeout), writes evidence plus a `<evidence>.transcripts/` dir. Runnable as `node scripts/clean-room/orientation-eval.mjs run --model claude-opus-5-5 --ref main` and `... run --version 0.28.0 --evidence <path>` (needs `claude`, network and an absolute non-temp `--container` outside a git work tree).
A session with no `result` event and a non-zero exit counts as "not run" (a crash is not a wrong answer).

## r_coverage
- R1 independent oracle (shell/awk/jq/git, no CLI code): covered (static regex test, edges, corpus A/B, real corpus).
- R2 compare mode (`+N more`, D-order, exit 0/1/2): covered.
- R3 oracle test in `npm test` incl. planted fault and "jq required": covered (red files, default tier).
- R4 corpus: covered (pre-existing, guards green).
- R5 eval driver and questions file: covered by units; live run deferred to §R step 8.
- R6 scoring and tool-use counter: covered.
- R7 verdict / "not run": covered.
- R8 baseline mode: covered by units (BASELINE verdict, label); live 0.28.0 run deferred to the orchestrator.
- R9 gating model: covered.

## plan_deviations
- Brief question tokens for `active_sprint` are the sprint ID only (no "N stories"): the sealed test `a clean brief session` requires `SPRINT-9` alone to score correct (orchestrator_confirmed: false; forced by the red).
- `waiting`, `carried`, `p0p1`, `planned` tokens are the first five IDs only; empty lists use the token `none`.

## adjacent_files
- `test/wiki/_oracle-support.ts` (hand-computed FACTS_A/B and LINES_A/B; unchanged, still valid)
- `test/fixtures/orientation-corpus/**` (shared by the oracle, R3 and the eval)
- `src/wiki/synthesis/session-brief.ts`, `src/commands/doctor.ts` (R3 compares their output to the oracle)

## flashcards_flagged
- 2026-11-12 · #oracle #jq · jq `capture` on a non-matching string yields EMPTY, not null: `try capture catch null` silently drops the check; use `[capture(..)] | .[0]`.
- 2026-11-12 · #oracle #awk · BSD awk: `NR` is a builtin (an array named NR is a fatal error); no `{n}` intervals, `\s`, `\d` or `gensub`; ENVIRON beats `-v` for data.
- 2026-11-12 · #clean-room #eval · Do not path.resolve a --container before validateContainer: a relative path becomes absolute and, with no git on PATH, passes the work-tree check.
