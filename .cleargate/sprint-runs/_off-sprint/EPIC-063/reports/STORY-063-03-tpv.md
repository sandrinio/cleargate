# STORY-063-03 TPV
TPV: BOUNCE

role: architect · red commit 11f49fa on `story/STORY-063-03` (base 10b37dd) · read-only review.
Preflight: there is no `sprint-context.md` for `_off-sprint/EPIC-063`, so the constraints come from `plans/M1.md` and orchestrator decisions 10–13.

**Verdict in one line:** the reds are sound, fail for the right reasons, contain no contradictory pins, and do not over-constrain. They do have one gap: every hook run uses process cwd = REPO_ROOT. That hides a defect in the M1 plan itself (step 7 uses a relative `--git-path`), and it hides any cwd-relative git call. One required red edit (E1) follows.

## Baseline evidence (run with a private TMPDIR; no build)
- `shell-ingest.red` 17/17, `post-shell-ingest-wiring.red` 10/10 and `claude-hook-addition-bash.red` 6/6 fail. Each failure is a missing module, file or row, or the Bash group absent from `CLAUDE_HOOK_ADDITION`.
- `post-shell-ingest.red.integration`: 20 fail and 1 skip (the `CLEARGATE_PERF` gate). The `before` seeding (three real ingests with the preload) passes. Every failure is the existence guard at `:146`.
- Amended pin files (13 files, 179 tests): exactly 12 fail, all on the missing hook, settings row, codex script, surgery name or docs text. `uninstall-reinit`, `host-lifecycle`, `host-adapter-contract`, `init-host-snapshot` and `hook-emit-context-fallback` pass.
- `init.node` (filtered run): scenario 6 and the 063-03 lock are red. CR-059 s5 and s6 and the 063-02 lock are green.
- `npm run typecheck` is clean.

## 1. Coverage
| Req / scenario | Red | OK |
|---|---|---|
| R1 trigger (Bash matcher, script exists) | wiring `:28-66`; integration (all) | yes, but cwd is never varied (E1) |
| R2 git mv / plain mv / sed on a dirty file / CLI write / same-command commit | integration rows 1–5 `:193-255`; units `:109-235` | yes |
| R3 delete skipped | integration `:270-285`; unit `:157-167` | yes |
| R4 ✅ / ⚠️ / 🔎 / silence | rows, `:335-345`, `:279`, budget `:289-299`, plan 9/10 | yes |
| R5 budget | deterministic `:289-299` (PATH `node` + `cleargate` stub log); timing `:306-331` gated | yes (decision 12, assertion unchanged, `t.skip` unless `CLEARGATE_PERF=1`) |
| R6 never blocks: snapshot missing or corrupt, git error, CLI failure, emit failure | `:347-396`, `:495-505` | yes |
| G3 dedup / G11 full re-check | `:362-380`, `:399-416` | yes |
| Plan 10 / 11 / 12 / 13 | `:418-493`; units | yes. `rebase-apply` is untested (minor) |
| Codex shape, decision 10(a) | `:257-266`, `:495-505` | yes. The fallback test correctly forces a buffered file, not a pipe |

No over-constraint found. The literal pins (`hook emit-context --host "$HOST" --event PostToolUse` at wiring `:51`, `unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE` at `:45`, `|| cat`) are the plan's own text (M1 `:688`, `:708`) or decision 10.

## 2. Contracts
- `computeShellChanges({since, head, dirty, headDiff, exists}) → string[]` (unit `:13-21`) is consistent with C3.3 and the handler algorithm (M1 `:714-720`). It is pure and implementable without contortion:
  - union of the non-deleted, existing headDiff post-image paths;
  - plus dirty entries whose blob changed or is new;
  - plus old dirty paths that are now clean and still exist;
  - `since === null` → every existing dirty path.
- `parseShellSnapshot` matches C3.4 byte for byte: path = everything after the first space; newline-terminated; anything else → null (`:61-104`). `deepEqual` pins `{head, dirty}` with no extra keys. That is accepted by decision 13.
- `hookShellIngestHandler` is pinned only as an exported function (`:238-242`), which leaves C3.2's opts shape to the Developer. OK.

## 3. Template preload (A2)
It is sound and hides no production defect.
- The default template dir is `path.resolve(__dirname,'..','templates','synthesis')` (`src/wiki/synthesis/open-gates.ts:63`, `roadmap.ts:100`, `product-state.ts:84`, `active-sprint.ts:99`). From dist that is `<pkg>/templates/synthesis`, which exists. Under tsx it is `src/wiki/templates/synthesis`, which does not. Only source runs break.
- Every hook resolver branch runs dist (`stamp-and-gate.sh:17-23`).
- The preload is loaded in the same node process that runs the in-process ingest, so it covers both an in-process design and a per-file subprocess design.
- The stub does not `cd` to the CLI root, which is correct, because `getGitSha` and project-root resolution are cwd-based.

## 4. Pin updates: all deliberate, none weakened, all satisfiable together
- codex-payload: Test 18 goes to 6 groups, plus the AD-3 exact shape with `post-shell-ingest.sh`/`Bash`/`--host codex`. The AD-2 regex `[a-z-]+\.sh` admits the name. Test 19 adds the script to `CODEX_HOOK_SCRIPTS`.
- Baseline: 9 → 10 `.sh` files (9 today, including `pre-commit.sh`), plus the triple.
- codex-loop: 5 → 6. Loop-harness 21i: 6 registrations and two `postToolUse`.
- init-codex: hook list plus the title.
- `HOOKS_THAT_INVOKE_CLI` gains the new hook. The harness-shim ADOPTION row is `claude-first`/`INPUT`. Both strengthen.
- init.node CR-059 s5 fixture gains the Bash group. It is green before and after (dedup → "unchanged"). Scenario 6 gains an assertion.
- uninstall and uninstall-per-host each add a strip assertion. uninstall-reinit changes only text; R11b compares against canonical bytes and self-adjusts once `isClearGateCommand` knows the name.
- init-fixture: the hash gains the pushed Bash group (the push lands at the end, same as `mergeSettings` `:76-78`). The new SANCTIONED row runs only in `captureOrCompare` compare mode. Scenario 15's synthetic `fresh` record skips it (`init-fixture.ts:1088`).
- No two files pin contradictory shapes:
  - canonical settings.json has 2 PostToolUse groups;
  - `CLAUDE_HOOK_ADDITION`'s Bash command is byte-equal to canonical;
  - hooks.json has 6 groups;
  - the script list is 6 plus `lib/`;
  - manifest rows and the surgery name are consistent.

## 5. Decision 13
The reds pin what the existing merge code produces:
- `mergeSettings` matches on `matcher`. It appends the inner command to an existing group (`src/init/merge-settings.ts:72-95`), or pushes a new group when none matches (`:76-78`).
- "User's Bash group takes the ClearGate command beside its own" is real behaviour, in the order `[user, CG]` (`claude-hook-addition-bash.red:104-112`, `init.node:441-446`).
- `supersedeHookCommands` (`:124-154`) never drops a user command with a different first token.
- `removeClearGateHooks` keeps `[user]` (`settings-json-surgery.ts:82-97`).

## 6. Timing gate (decision 12): as specified
- The deterministic half always runs. It needs 20 runs with an empty stub log after a warm-up, which is sufficient proof of "starts no node":
  - a bare `node`, `/usr/bin/env node` or `npx` would hit the `node` stub;
  - any CLI start would hit the `cleargate` stub.

## 7. Docs reds: correct against the code
- The lint caller is real. `sprintArchiveHandler` (`src/commands/sprint.ts:933`) calls `wikiLintHandler(` at `:964`, the only call site. `sprintCloseHandler` (`:546-602`) has none. Protocol §10.8 line 3 matches both regexes. The test passes today, as intended.
- §10.9 item 2 currently lacks `post-shell-ingest.sh`, so it is red for the right reason.
- The ingest agent says "via Task" only at `cleargate-wiki-ingest.md:161`, so that test is red for the right reason too. The Codex TOML copy (`.codex/agents/cleargate-wiki-ingest.toml:158`) regenerates through `gen:codex`.

## Required red edits (QA-Red)
**E1 — the hook process cwd ≠ REPO_ROOT (R1: runs after every Bash call, from whatever cwd the session or turn has).**
- All runs use `cwd: b.root` (`post-shell-ingest.red.integration:159`).
- `git rev-parse --git-path MERGE_HEAD` prints `.git/MERGE_HEAD` relative to `-C`'s directory. I verified this on git 2.50.1, and it holds even with `-C`.
- So the plan's own guard (M1 `:700`) and any un-`-C`'d git call pass every current red, yet fail when the hook process cwd is a subdirectory. That is the case for Codex, whose command resolves `R` from a turn cwd, and for Claude after a `cd`.
- In the meta-repo a cwd inside nested `cleargate-cli/` is a *different* git repo, so the failure is silent.

Edits:
1. `runHook` gains `opts.cwd` (default `b.root`). It is used for both the spawn `cwd` and the payload's `cwd` field.
2. New test "hook run from a sibling git repo (cwd ≠ REPO_ROOT)":
   - `establish(b)`;
   - `other = mkdtemp(PARENT)` plus `git init -q`;
   - `git mv F_X ARCH_X` in `b.root`;
   - `runHook(b, { cwd: other })` → exit 0, `claudeLines` includes `ingestedLine('crs/CR-901.md')`, `pageOf(b,'CR-901').raw_path === ARCH_X`, and `snapPath(b)` contains `ARCH_X`;
   - a second `runHook(b, { cwd: other })` → stdout `''` and `log === ''` (the fast path works from a foreign cwd).
3. New test "MERGE_HEAD guard from a subdirectory cwd":
   - copy plan 11 (`:432-448`) with `runHook(b, { cwd: path.join(b.root, '.cleargate', 'delivery') })`;
   - assert no `shell-ingest` in the log, page bytes unchanged, snapshot unchanged.
   - It fails against an implementation that tests `[ -e "$(git … --git-path MERGE_HEAD)" ]` without anchoring.

**E2 — conditional on orchestrator decision; recommended.** When `hook shell-ingest` fails (version skew: resolver branch 2 is unversioned, and per FLASHCARD :425 Codex's `zsh -lc` puts the global `cleargate` first), the plan writes F anyway (M1 `:709`), and the changes are dropped silently. R4 says "`⚠️ wiki ingest failed: …` for each ingest failure."
- If the orchestrator accepts, extend `:382-388`: stdout contains a line starting `⚠️ wiki ingest failed` that names `hook shell-ingest`.
- The snapshot is still written, so there is no per-call node cost or spam.

Optional nit: `test/helpers/init-fixture.ts:547` comment "Measured equal to 123d7bc7…" is now stale.

## Plan amendments (Architect; record as orchestrator decision 14, and the Developer follows these over M1 `:693-700`)
- **P1 (step 5):** parse `git status --porcelain=v1 -z -uall` in bash with `while IFS= read -r -d '' rec`. A record `R  new\0old\0` consumes one extra NUL field.
  - Non-`-z` output quotes any path with a space or `"`/`\`. I verified this on 2.50.1: `?? ".cleargate/…/CR-905 with  spaces.md"`.
  - `${p##* -> }` and `[ -f … ]` would then silently drop the file from F.
  - It also diverges from the handler's `-z` list.
  - `deriveBucket('CR-907 x.md')` yields id `CR-907 x`, so no red is required, only parity.
- **P2 (step 7):** `"${G[@]}" rev-parse --path-format=absolute --git-path MERGE_HEAD` (likewise `rebase-merge`, `rebase-apply`), or prefix a relative result with `$REPO_ROOT/`. Every other path in the hook is absolute from `$REPO_ROOT`.

## Developer hints
- **Bash 3.2 (`/bin/bash`):**
  - no `mapfile`/`readarray`/`declare -A`/`${x,,}`;
  - under `set -u`, `"${arr[@]}"` on an empty array aborts. I verified this; it would break R6 on a clean tree. Guard `${#arr[@]}` or use `${arr[@]+"${arr[@]}"}`;
  - always use `IFS= read -r`, because porcelain line 1 can start with a space (FLASHCARD :102).
- **Banned text in the hook:**
  - `^else\n\s*exit 0` (`scaffold-cli-resolution.node.test.ts:182`, BUG-006);
  - `${CLAUDE_PROJECT_DIR:-` and `REPO_ROOT="$(git rev-parse --show-toplevel` (`harness-shim.red:280`);
  - any non-comment `exit [1-9]` (wiring `:55`).
- **Required text in the hook:**
  - `# cleargate-pin:`;
  - exactly one `SOURCE_LINE`;
  - exactly one `REPO_ROOT="$(cg_repo_root claude-first "${INPUT}")"`, after `INPUT="$(cat)"`.
- **git:**
  - `unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE` first;
  - `--no-optional-locks` sits before the subcommand, on every call (`G` array).
  - QA-Red's budget tip: one `status --porcelain=v2 --branch --no-ahead-behind -z` gives HEAD (`# branch.oid`, or `(initial)` → `none`) and the dirty list in a single spawn. Keep the C3.4 snapshot format either way.
- **Fast path:**
  - compare F and the snapshot through the same `$(…)` stripping on both sides, and write with `printf '%s\n'`;
  - `mkdir -p "$REPO_ROOT/.cleargate/hook-log"` before the lock or snapshot. The G11 red starts with no `hook-log/` dir;
  - set `trap 'rmdir "$LOCK"' EXIT` only *after* acquiring the lock (`:478` "must not remove a lock it does not own");
  - BSD `find -maxdepth 0 -mmin +2` works.
- **Slow path:**
  - buffer handler stdout in a `mktemp` file, then `… hook emit-context --host "$HOST" --event PostToolUse <"$CTX" 2>>"$LOG" || cat "$CTX"`. Call it once (one JSON object, `:188`); a pipe fails decision 10(a);
  - send handler stderr to the log;
  - never `exec` the CLI.
- **Handler:**
  - use `--repo-root` verbatim for abs paths; the directive must equal `contradictionPendingLine(id, path.join(repoRoot, rel))` (`:279`);
  - capture ingest **stderr** too. The malformed message is 5 lines (YAML snippet), giving one ⚠️ per non-empty line;
  - use a non-throwing `exit` seam (`wiki-ingest.ts` returns after each `exit`; flashcard 063-04);
  - only `wiki ingest: (create|update) …` → ✅;
  - G3 dedup = `raw_path === rel && Date.parse(last_ingest) >= mtimeMs`. `last_ingest` is ms ISO (`wiki-ingest.ts:92,244`).
- **Codex:**
  - `hooks.json` is hand-edited, not generated: 2-space JSON plus a trailing newline, Bash group after `stamp-and-gate`;
  - add `'post-shell-ingest.sh'` to `CODEX_HOOK_SCRIPTS` (`scripts/build-codex-payload.mjs:61-68`), and update the "five hooks" comment at `:57`;
  - run `npm run gen:codex`, which also regenerates the wiki-ingest agent TOML after the "via Task" fix. Verify with `node scripts/build-codex-payload.mjs --check` (FLASHCARD :30: `gen:codex -- --check` rewrites).
- **Manifest and uninstall:**
  - `pin-aware` rows for `.claude/hooks/post-shell-ingest.sh` and `.codex/hooks/post-shell-ingest.sh`, before the `**` catch-alls (`src/lib/manifest-builder.ts:160-206`, `:219-254`);
  - add `post-shell-ingest` to `CLEARGATE_HOOK_SCRIPT_NAMES` (`src/lib/settings-json-surgery.ts:47-48`);
  - add the Bash group to `CLAUDE_HOOK_ADDITION` (`src/hosts/claude.ts:27-56`), byte-equal to canonical.
- **Composed payload:** `scaffold-cli-resolution.node.test.ts:134-137` reads the gitignored `templates/cleargate-planning/`, which 20 test files read. Refresh it with `node scripts/copy-planning-payload.mjs` (plus `npx tsx scripts/build-manifest.ts`). **Never** `npm run build`: it hot-swaps the outer repo's live hooks (FLASHCARD :18).
- **Snapshot lock:** create `test/snapshots/hooks/post-shell-ingest.story-063-03.sh` from the test's own render (pin 0.5.0) after the hook is final.
- **Running the tests:**
  - `*.integration.node.test.ts` is excluded from `npm test` (`package.json:47`). Run `npm run test:file -- test/hooks/post-shell-ingest.red.integration.node.test.ts` (and the baseline and codex-loop pins) explicitly, with a short private `TMPDIR` (FLASHCARD :62);
  - QA-Verify must run it as well.

## Orchestrator notes (not 03 scope)
- `cleargate upgrade` merges settings.json per event (`claude.ts:290-292` `{...ours, ...theirs}`). It already replaces a user's whole PostToolUse array; the new Bash group makes user Bash PostToolUse hooks likelier victims. This is pre-existing; route it to a bug.
- G13: FLASHCARD :428 records Codex `exec_command` firing hooks as `Bash`. The matcher is evidenced; only PostToolUse context delivery is unverified.

## Flashcard candidates
- `2026-11-12 · #git #hooks · rev-parse --git-path prints a path relative to -C's dir; a hook whose cwd ≠ root must use --path-format=absolute.`
- `2026-11-12 · #git #shell · porcelain v1 without -z quotes paths containing spaces; bash parsers must use -z + read -d ''.`
- `2026-11-12 · #tpv #hooks · Hook-contract reds that always spawn with cwd=REPO_ROOT hide cwd-relative bugs; add one foreign-cwd run.`
