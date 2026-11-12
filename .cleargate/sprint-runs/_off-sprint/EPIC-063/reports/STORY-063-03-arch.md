# STORY-063-03 Architect post-flight
ARCH: PASS

role: architect · read-only review of `git diff 83d0753 d54d516` on `story/STORY-063-03` (cleargate-cli; base main 10b37dd). No code edits, no commits, no branch switch.
Preflight: `_off-sprint/EPIC-063` has no `sprint-context.md`. The constraints come from `plans/M1.md` (C3, the 03 blueprint, the BUG-086 check) and orchestrator decisions 10–14.
The full suite was not re-run, as instructed. I ran only scratch git/bash probes under a private `TMPDIR` (git 2.50.1, `/bin/bash` 3.2.57).

**Verdict in one line:** C3, the fast/slow-path design and decision 14 are all implemented as specified. The three deviations are sound. Every install path wires the hook. No finding blocks the merge.
One correctness gap remains, and it is in my plan, not in the Dev's work: unresolved conflicts that leave no `MERGE_HEAD` are not guarded (F1). I also found one documentation overclaim (F2). Both go into a small follow-up, 03-F1, which lands before §R step 1 so it ships in 0.29.0. 03 merges as it is.

## 1. Contract C3: honoured
| Item | Evidence | OK |
|---|---|---|
| C3.1 CLI | `src/cli.ts:625-634`: hidden `hook shell-ingest`, `--repo-root <abs>` required, `--since` optional. The handler never sets an exit code, so the exit is 0 | yes. One text deviation: a usage error exits **1** (commander default), not 2 (F4) |
| C3.2 signature | `src/commands/hook.ts:180` `hookShellIngestHandler({ repoRoot, since?, git?: GitRunner, now?, stdout? })` | yes, exact |
| C3.3 helpers | `src/hooks/shell-ingest.ts:42` `parseShellSnapshot`, `:58` `computeShellChanges({since, head, dirty, headDiff, exists})` (decision 13 shape). Pure: no fs, no git | yes |
| C3.4 format | bash builds `MAGIC\nHEAD <sha\|none>\n<blob> <path>\n…` (`post-shell-ingest.sh:63,90,94`) and writes it with `printf '%s'`; F always ends in `\n`. The parser needs a trailing `\n`, `HEAD ([0-9a-f]{40}\|none)`, `^([0-9a-f]{40}) (.+)$`, and the path is everything after the first space (`shell-ingest.ts:38-54`) | yes, byte for byte |
| Atomic write | `write_snapshot` writes `.tmp.$$`, then `mv -f`, then `rm -f` leftovers (`:101-106`) | yes |
| Written only when allowed | merge/rebase guard exits before any write (`:109-114`); lock held → `exit 0` with no write (`:142-148`); `hash-object` failure → `exit 0` (`:86`). Writes happen only on the cheap path (`:127`) and after the slow path (`:170`) | yes |

## 2. Hook vs the fast/slow-path design and decision 14
- **P1 `-z` parsing:** `status --porcelain=v1 -z -uall` is read with `while IFS= read -r -d '' REC` (`:77-82`). A rename or copy record in either column (`R?|C?|?R|?C`) skips one extra NUL field (`:78-79`). Existence is checked with `[ -f ]`.
- **P2:** `rev-parse --path-format=absolute --git-path …` (`:109`). I verified this from a subdirectory cwd: it prints absolute paths. In a linked worktree it resolves `.git/worktrees/<wt>/MERGE_HEAD`.
- **E2:** when the handler returns RC≠0, the hook appends `⚠️ wiki ingest failed: cleargate hook shell-ingest exited <RC> (older cleargate? …)` (`:158-160`) and still writes the snapshot (`:170`). This matches decision 14 and the `ingestFailedLine` prefix.
- **Decision 10 fallback:** handler stdout is buffered in `mktemp` (`:153,156`). `emit-context` is called once from the file (`<"$CTX"`), followed by `|| cat "$CTX"` (`:166`). There is no pipe.
- **Lock:**
  - `mkdir` acquires the lock (`:142`) before `OWN_LOCK=1` and `trap cleanup EXIT` are set (`:150-151`).
  - A lock older than 2 min is stale (`find -maxdepth 0 -mmin +2`, `:143`). The stale lock is removed and the hook retries once (`:144-145`).
  - `cleanup` runs `rmdir` only when `OWN_LOCK=1` (`:138`).
- **Environment:**
  - `mkdir -p hook-log` runs on the slow path (`:134`) and inside `write_snapshot` (`:102`).
  - `unset GIT_DIR GIT_WORK_TREE GIT_INDEX_FILE` (`:55`).
  - Every git call goes through `G=(git --no-optional-locks -C "$REPO_ROOT" -c core.quotePath=false)` (`:57`; calls at `:67,70,82,86,109,126`).
- **Bash 3.2 safety:** there is no `mapfile`, `declare -A` or `${x,,}`. I verified that `${#DIRTY_PATHS[@]}` is safe on an empty array under `set -u` (prints `len=0`). `"${DIRTY_PATHS[@]}"` is used only inside the `-gt 0` guard (`:85-86`), and `SINCE` uses `${SINCE[@]+"${SINCE[@]}"}` (`:156`). All variables are assigned before use; `$1`/`$2` are guarded by `$#`.
- **Exit 0 on every path:** `:70, :86, :99, :112, :128, :145, :147, :153, :171`. `cleanup` returns 0 and never calls `exit`.
- **Banned and required text:** the wiring and harness-shim reds are green (Dev report). By inspection: one `SOURCE_LINE` (`:16`); `REPO_ROOT="$(cg_repo_root claude-first "${INPUT}")"` comes after `INPUT="$(cat)"` (`:15,17`); `# cleargate-pin:` is present (`:19`); there is no non-comment `exit [1-9]`.

## 3. Rulings on the Dev's three deviations
1. **Process substitution, with a `rev-parse --git-dir` fallback for non-repos: APPROVED.**
   - Not-a-repo is still a silent `exit 0`: `rev-parse -q --verify HEAD` fails, then `--git-dir` fails (`:67-72`).
   - In a valid repo a failing `status` now yields an empty dirty list instead of an `exit 0`. The result is two deduplicated slow-path runs and no wrong output.
   - It saves the `mktemp` and `rm` execs on every no-op call.
   - Because the `while` loop runs in the **current** shell (not a pipe subshell), an `exit` inside the loop leaves the hook. F1's fix depends on that.
2. **`git diff --name-status -M -z`: APPROVED.** `parseNameStatusZ` (`hook.ts:157-176`) consumes `R100\0old\0new\0` correctly (it skips old and takes new). This matches the `-z` status parser for paths with spaces.
3. **One `rev-parse` for all three markers: APPROVED.**
   - Verified on git 2.50.1: one call with three `--git-path` arguments prints three absolute lines. `rev-parse` prints a path whether or not it exists, so the loop at `:111-113` tests each line on its own with `-e`.
   - Probe with exactly one marker present each time: `MERGE_HEAD` → guarded, `rebase-merge` → guarded, `rebase-apply` → guarded, none → proceeds.
   - Floor: `--path-format` needs git ≥ 2.31. Older git echoes the flag as a line and falls back to cwd-relative paths, which is the TPV E1 failure mode (F8).

## 4. Handler correctness
- **G3 dedup:** `page.raw_path === rel && Date.parse(page.last_ingest) >= fs.statSync(abs).mtimeMs` (`hook.ts:237`). A missing or unreadable page means the file is ingested. If `last_ingest` is empty, `NaN >= x` is false, so it re-ingests (conservative).
- **G11:** a missing `--since` (bash omits it when no file exists, `:155`) or a corrupt one (`parseShellSnapshot` → null, `:190`) → `since === null` → every existing dirty path is ingested (`shell-ingest.ts:62-65`).
- **Deleted paths dropped:** `D*` statuses and `!exists` (`shell-ingest.ts:69-70,76,81`). The status list is also filtered with `existsSync` (`hook.ts:197-199`).
- **Non-ingestable buckets:** `deriveBucket` throws for `INDEX.md`, `README.md` and `notes.md` (probed), and those files are skipped (`:226-229`). `isBucketIngestable` skips stories (`:231`).
- **Seam:**
  - `wikiIngestHandler` returns after every `exit(...)` (`wiki-ingest.ts:120-232`, each `exit` followed by `return`). The handler passes a non-throwing exit seam (`hook.ts:257-260`) and wraps the call in try/catch (`:262-265`). An outer try/catch covers the whole run (`:283-285`).
  - Nothing in the ingest call graph writes `process.stdout` or `process.exitCode` directly (grep over `src/wiki`, `src/lib/wiki`, `wiki-ingest.ts`). The agent context cannot be polluted.
- **Lines:**
  - `ingestedLine` comes only from `wiki ingest: (create|update) …` (`:271`).
  - `contradictionPendingLine(draftId, abs)` comes from the `phase4:` JSON (`:272-280`), whose key is `draftId` (`wiki-ingest.ts:379-380`).
  - `ingestFailedLine` is built for each non-empty line of stdout+stderr (`:268`).
  - All three builders come from `hook-lines.ts`, and the order matches `stamp-and-gate.sh:113,117`.
- **stderr captured:** yes (`:254-256`).
- **Git runner:** `repoGit` (`:129-141`) pins `-C repoRoot`, drops `GIT_*` and returns `''` on failure. This matches `getGitSha`'s use of the default runner (`git-sha.ts:10-14`) and makes ingest independent of the process cwd (E1).

## 5. Install paths
| Path | Result |
|---|---|
| Fresh init | The payload hook is 0755 (`git ls-tree` 100755). `copy-payload.ts:176-226` chmods it. Canonical `settings.json` carries the Bash group. Wired |
| Plain init over an existing `settings.json` | The hook file is new, so it is copied. `CLAUDE_HOOK_ADDITION` gains the Bash group, byte-equal to canonical (`src/hosts/claude.ts:55-64`), and `mergeSettings` merges it (`claude.ts:117-118`). Wired (decision 13) |
| `init --force` | The payload `settings.json` overwrites the existing one, Bash group included. Wired |
| Uninstall | `post-shell-ingest` is in `CLEARGATE_HOOK_SCRIPT_NAMES` (`settings-json-surgery.ts:48`), so the registration is stripped and user hooks are kept. The file has `preserve_on_uninstall: false` |
| Codex | Generated copy, byte-identical, 0755. `CODEX_HOOK_SCRIPTS` includes it (`build-codex-payload.mjs:65`). The `hooks.json` Bash group carries `--host codex`. The codex merge merges the full payload `hooks.json` (`codex.ts:303-322`) |
| Manifest | `pin-aware` rows for `.claude/…` and `.codex/…post-shell-ingest.sh` sit before the `**` catch-alls (`manifest-builder.ts:206-214, 263-270`; first match wins, `:369`) |
| Composed payload | `templates/cleargate-planning/.claude/hooks/post-shell-ingest.sh` is byte-identical to the scaffold. Composed `settings.json:61`, `MANIFEST.json:142` (pin-aware), `templates/scaffold/hosts/codex/{.codex/hooks.json:48, .codex/hooks/post-shell-ingest.sh, MANIFEST.json:118}` all present |
| `cleargate upgrade` | The hook is pin-aware, so `applyPinAware` always writes it, creates its directory and chmods `.sh` to 0755 (`upgrade.ts:297-317, 113-120`). `settings.json` is merge-3way: `--yes` or choice `t` goes through `mergeSurgeryTarget` and carries the Bash group (BUG-093 clobber caveat) |

What still leaves an existing user without a working hook after upgrading to 0.29.0, other than BUG-093:
- **Codex hook trust (release note required).**
  - A new `hooks.json` registration does not run until the user trusts it: "N hooks need review", and `hooks.state.<key>.trusted_hash` must match (FLASHCARD 2026-09-25 `#codex #trust`, 2026-09-26 `#codex #trust`).
  - App-server and exec runs never prompt, so in those runs the hook stays inert until someone trusts it in the TUI.
- **`cleargate upgrade` with choice `k` on `settings.json`** keeps the user's file, so the hook is not registered. Upgrade prints no warning, and no doctor check flags a hook script on disk that is not registered. This is pre-existing UX and goes to the backlog, not 03.
- **An older global `cleargate` on PATH** (resolver branch 2 is unversioned). The hook is registered but `hook shell-ingest` fails. This is visible, not silent: the E2 line appears once per changed state.

## 6. BUG-086 interaction
- **The predictions hold as built:**
  - (a) `MERGE_HEAD`/rebase guard: DevOps merges with `--no-ff` (`.claude/agents/devops.md:53,116`), so a conflicted merge leaves `MERGE_HEAD` and the guard holds.
  - (b) G3 dedup.
  - (c) The `mkdir` lock.
  - A clean story merge moves HEAD, the same Bash call's hook ingests the delivery diff, and the main checkout's wiki is dirty after every merge. Commit-before-merge (BUG-086 as amended, `BUG-086…md:139-142`) is still required. **Keep BUG-086 in SPRINT-42.**
- **Verified by code path:** DevOps' step-2 `chore(wiki)` commit moves HEAD but changes no delivery file and leaves the dirty set the same. It therefore takes the cheap path (`post-shell-ingest.sh:117-131`: `diff --quiet` → snapshot only, no node). The wiki commit does not re-dirty the wiki.
- **New for the meta-repo once 0.29.0 is live (none of it blocks):**
  1. The hook watches `CLAUDE_PROJECT_DIR`, the main checkout, only (`harness.sh:46-49`). Bash calls inside `.worktrees/*` or the nested `cleargate-cli/` repo never ingest anything there; worktree shell moves reach the wiki after the merge. This reduces wiki churn on story branches.
  2. Every Bash call of every agent pays the no-op cost. In this repo that is **3** git execs plus `dirname`, not 2, because 25 delivery files are dirty right now, which adds `hash-object` (see §7).
  3. Squash merges, `stash pop`, cherry-pick and revert conflicts are not guarded (F1). ClearGate's DevOps does none of them (it uses `--no-ff`, and FLASHCARD 2026-09-26 `#worktree #git #danger` says never stash), so F1 matters mainly for target-repo users.

## 7. Performance (decision 12): take no rework now
- **Probes on this machine (load 5.9/6.6/6.8), 20 runs each, average:**

  | Command | ms |
  |---|---|
  | `bash -c cat` (baseline) | 124 |
  | `dirname` | 50 |
  | `rev-parse` | 97 |
  | `status v1 -z` | 95 |
  | `status v2 --branch -z` | 100 |
  | `hash-object` (25 files) | 97 |

  Cost is set by the number of execs, not by the git work done, and `status` v2 costs the same as v1.
- **Taking the single `status --porcelain=v2 --branch -z` spawn now changes neither outcome:**
  - It removes exactly one exec (`rev-parse`, about 95 ms here).
  - The Dev's 380 ms delta would become about 280 ms, which still fails under this load.
  - On a quiet machine, where an exec takes a few ms, both designs are far under 150 ms.
  - The cost would be a bash 3.2 field-stripping parser for v2 records (`1/2/u/?`), a red re-run and a QA cycle, for no change in the gate result.
- **The §R decision-12 run is enough.** It runs `CLEARGATE_PERF=1` on a quiet machine and the recorded p95 delta is the gate.
- **Pre-approved remedy if the quiet run still exceeds 150 ms:**
  - Use the v2 single spawn. HEAD comes from `# branch.oid`, `(initial)` maps to `none`, and a missing header means not a repo → `exit 0`. `u` records give the F1 guard for free.
  - Keep C3.4 and the handler's v1 parser.
- **Rejected alternative:** replacing `hash-object` with `-nt` mtime tests. `cp -p`, `rsync -t` and `tar x` preserve old mtimes, so changes would be dropped silently (an R2 violation).
- **The `dirname` exec stays.** It is part of the pinned `SOURCE_LINE` shared by all hooks.

## 8. Docs
- **Ingest agent Phase 4:** fixed. Step 4 is now the orchestrator's step at Brief time (`cleargate-wiki-ingest.md:159-164`), consistent with `:144`. The Codex TOML was regenerated.
- **Protocol §10.9 #2** (`cleargate-protocol.md:367`): true except one sentence (F2).
  - "A call that changes no delivery file starts no node process" overclaims. The first Bash call after an Edit/Write of a delivery file always takes the slow path: the blob differs from the snapshot, then the dedup prints nothing. The story itself accepts this (`STORY-063-03…md:167`).
  - The same applies to the first call after install, when no snapshot exists and delivery files are dirty.
  - The merge/rebase skip is not documented.
- **Stale code comments the corrected doc now contradicts:** `src/commands/wiki-ingest.ts:75` and `:376-378` still say the ingest agent "spawns … via Task" (F3).

## Findings
| # | Sev | Where | Finding | Disposition |
|---|---|---|---|---|
| F1 | Med-Low | `post-shell-ingest.sh:77-82,109-114` | Several unresolved-conflict states set no `MERGE_HEAD`/rebase marker; verified on git 2.50.1: <br>• `git stash pop` conflict: no marker <br>• `git merge --squash` conflict: only `SQUASH_MSG` <br>• cherry-pick conflict: `CHERRY_PICK_HEAD` <br>• revert conflict: `REVERT_HEAD` <br>All of them show `UU <delivery path>`. The hook then ingests the conflict-marked file: <br>• markers in the frontmatter → 5 `⚠️ wiki ingest failed` lines <br>• markers only in the body → the page gets marker text, and a 🔎 directive fires for conflicted content <br>It heals itself after resolution (the blob changes, so the file is re-ingested). No lasting damage. This is a gap in my plan (M1 `:700`), not a Dev deviation | 03-F1 |
| F2 | Low | `cleargate-protocol.md:367` | No-node sentence overclaims (§8) | 03-F1 |
| F3 | Low | `wiki-ingest.ts:75,376-378` | "via Task" comments are stale | 03-F1 |
| F4 | Low | M1 C3.1 text | Says "usage errors (2)", but commander exits 1. Same as `emit-context`; no test pins it; the hook treats any RC≠0 the same | Orchestrator amends the C3.1 text to "1 (commander usage error)"; no code |
| F5 | Nit | `hook.ts:151` | `parseStatusZ` checks only column X for `R`/`C`; bash checks both (`:79`). With `?R` (intent-to-add rename) the handler pushes `old.slice(3)`, which `existsSync` filters out. Harmless; a parity fix | 03-F1 |
| F6 | Nit | `post-shell-ingest.sh:143-145` | Two hooks reclaiming the same stale lock can each `rmdir` the other's fresh lock. Needs a crashed hook plus two concurrent runs; the worst case is one duplicated `log.md` append race | Accept |
| F7 | Low | design | Project root must be the git toplevel. A ClearGate project nested below a git root gets root-relative status/diff paths that never exist under `REPO_ROOT`, so the hook is silently inert. Codex `hooks.json` already assumes `--show-toplevel` | Accept; backlog note |
| F8 | Low | `:109` | Needs git ≥ 2.31 (`--path-format`) | Release note |
| F9 | Nit | `:17` vs `:55` | `unset GIT_*` runs after `cg_repo_root`. It matters only when `CLAUDE_PROJECT_DIR` is unset and `GIT_DIR` is inherited; both hosts set it | Accept |

**03-F1 (one follow-up, standard lane, new branch after 03 merges, lands before §R step 1):**
1. In the status loop, before the rename skip, add `case "${REC:0:2}" in DD|AU|UD|UA|DU|AA|UU) exit 0 ;; esac`. This exits without writing the snapshot, the same contract as the merge guard. It adds zero spawns and works because of deviation 1 (the loop runs in the current shell).
2. Make `parseStatusZ` test `rec[0]` or `rec[1]` for `R`/`C` (F5).
3. Replace §10.9 #2's sentence with: "When no delivery file differs from the hook's previous snapshot it starts no node process; the first Bash call after an Edit/Write of a delivery file runs one slow-path check, which prints nothing when the page is current. It skips while a merge, rebase or unresolved conflict is in progress; the next call after it ends catches up."
4. Fix the comments at `wiki-ingest.ts:75,376-378`.
5. Run `npm run gen:codex` and `--check`. Re-lock `test/snapshots/hooks/post-shell-ingest.story-063-03.sh`. Refresh the composed payload with `copy-planning-payload` + `build-manifest`. Never `npm run build`.
6. QA-Red adds one integration red:
   - a `git stash pop` conflict on a delivery `.md` → exit 0, no `shell-ingest` in the stub log, page and snapshot bytes unchanged;
   - then resolve and `git add` → the next run ingests.

## Carry-forwards
- **06:** no dependency on 03 and no action. The Bash hook never stamps `last_contradict_sha`, so 06's "unchecked" logic is unaffected.
- **07:**
  - (a) Prompt (c) (`git mv`, then DONE, with no commit) is covered even without a snapshot: G11 re-checks dirty files. A first Bash call that runs `git mv … && git commit` with **no prior snapshot** is missed, because the HEAD diff needs a stored HEAD. **Decision:** seed a baseline snapshot after the room commit by running the room's `.claude/hooks/post-shell-ingest.sh` once with `CLAUDE_PROJECT_DIR=<room>` and stdin `{}`. Keep prompt (c) commit-free.
  - (b) The seeds are epics, so the shell check's `additionalContext` carries `✅ ingested as epics/<ID>.md`.
  - (c) The room PATH rule (already routed) applies doubly here: rooms have no resolver branch 1, so the hook runs PATH `cleargate`.
- **Codex follow-up (BUG-106 / live Codex proof owner, not 07):** `scripts/clean-room/codex-loop.mjs:1013-1014` owner-trust text says "five ClearGate hooks" and lists five; it is now six. `scripts/clean-room/codex-hooks.mjs:781` shared-hooks hash list omits `post-shell-ingest.sh`.
- **§R:**
  - (a) Step 1 runs `post-shell-ingest.red.integration`, the baseline and the codex-loop integration files explicitly, after the commit exists (packed-HEAD pins).
  - (b) The decision-12 quiet-machine run is the R5 gate; apply the §7 remedy if it fails. Also record, for information only, the meta-repo per-call no-op cost (3 git execs + `dirname`, with dirty delivery files).
  - (c) Time one slow path over a ~30-file HEAD diff (a sprint→main merge in a scratch clone). If it takes more than 10 s, file a bulk-threshold follow-up: above N files, run one `wiki build` instead of N in-process ingests. Claude's default hook timeout is 60 s.
  - (d) Step 8 manual check for 03: the first Bash call after the live re-sync has no snapshot, so it re-checks the ~25 dirty delivery files. Expect a one-time burst of ✅/🔎 lines; it is not a defect.
  - (e) Release notes: Codex users must trust the new Bash hook; git ≥ 2.31.
  - (f) 03-F1 merged before step 1.
- **M2:**
  - The G3 dedup reads page frontmatter `raw_path` + `last_ingest` through `parsePage` (`hook.ts:236-237`). The 08/13 page-schema changes must keep both fields, and must stamp `last_ingest` on every ingest or build write. A build that preserves an older `last_ingest` makes every HEAD-moving Bash call re-ingest.
  - 12's eval transcripts gain `PostToolUse:Bash` hook_response events. They are not `tool_use` and must not be counted.

## Flashcard candidates
- `2026-11-12 · #git #hooks · stash pop / merge --squash / cherry-pick / revert conflicts set no MERGE_HEAD; guard on unmerged XY (UU/AA/DU…) in status.`
- `2026-11-12 · #hooks #perf · Here every exec costs 50–125 ms under load (dirname 50, git ~95): hook budgets are exec counts; status v1≈v2 in cost.`
- `2026-11-12 · #git #hooks · rev-parse takes several --git-path args in one call (one line each); --path-format=absolute needs git ≥ 2.31.`
- `2026-11-12 · #hooks #shell-ingest · Bash-hook snapshot lags Edit/Write: the first Bash call after a delivery Edit always runs the slow path.`
