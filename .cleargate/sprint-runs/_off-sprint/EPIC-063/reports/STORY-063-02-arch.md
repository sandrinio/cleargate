# STORY-063-02 Architect post-flight

ARCH: FAIL

role: architect. Reviewed `git diff 26e8c62 23e4582` (cli repo, branch story/STORY-063-02) against M1 plan C2 + the STORY-063-02 blueprint. The code side is correct and the contract is honoured. The FAIL is on R4 ("docs match code"): three canonical doc statements this commit wrote or reworded are false. The root cause of R-1 is my plan (M1.md:616), which inherited the EPIC-063 §6 Q1 premise. The Developer followed the plan. All three fixes are text-only, and the wording below keeps the sealed QA-Red docs test green, so this goes back to the Developer only. No QA-Red bounce is needed.

## Required remediation (Developer, same branch)

**R-1: lint does not run at `cleargate sprint close`.**
- Wrong text: protocol `:348` (§10.8), `:369` (§10.9 #4) and `:515` (§12.6).
- Evidence:
  - The only `wiki lint` caller is `sprintArchiveHandler` (`src/commands/sprint.ts:933`). The call is at `:1126-1131`, in `cleargate sprint archive`.
  - In that command, a lint failure rolls back the archive unless `--allow-wiki-lint-debt` is passed (`cleargate-enforcement.md:564`).
  - `sprintCloseHandler` (`sprint.ts:546`) only shells out to `close_sprint.mjs`, and `close_sprint.mjs` contains no lint reference.
  - The sprint-execution close flow never runs `sprint archive`.
- So "by lint at sprint close at the latest" (`:348`) promises a backstop that does not run.
- Replace with this wording (it still contains the `cleargate sprint close` and "on demand" strings the sealed test needs):
  > `cleargate wiki lint` runs in `cleargate sprint archive` (a lint failure rolls the archive back unless `--allow-wiki-lint-debt`) and on demand. `cleargate sprint close` (`close_sprint.mjs`) does not run it, and it is not run at Gate 1 (Brief) or at the push.

  Apply the same correction to §10.9 #4 and §12.6.

**R-2: §10.9 #3 (`:368`) credits the ingest fallback rule to "the CLAUDE.md / AGENTS.md rule".**
- Neither file has such a rule. `scaffold/hosts/claude/CLAUDE.md` and `scaffold/hosts/codex/AGENTS.md` carry only the Brief-time contradiction rule.
- The fallback rule lives in protocol §10.2 (`:248`). That text says to dispatch the `cleargate-wiki-ingest` subagent, while `:368` says to run `cleargate wiki ingest <file>`.
- Fix: cite §10.2 for the ingest fallback (accept either action, and align `:248`). Keep the CLAUDE.md/AGENTS.md citation for the contradiction check only.
- Keep the literal "Agent rule" text, and keep "wiki lint" out of items #1–#3, because the order test slices on both.

**R-3: the ingest agent still claims the hook runs it.**
- `:3`: the new phrase "Run by the PostToolUse hook's `cleargate wiki ingest` call" restates the claim R4 removes.
- `:194` (body): "you are invoked by the PostToolUse hook" is the same false claim.
- The hook calls the CLI directly (`stamp-and-gate.sh:106`) and never dispatches this agent.
- Reword both: the hook runs `cleargate wiki ingest` itself, and this agent is dispatched only when no hook fired. Then run `npm run gen:codex` and confirm `build-codex-payload.mjs --check` is clean.

## Recommended in the same pass (not gating)

- **Stale hook comments.** `stamp-and-gate.sh:86-88` ("re-emit ⚠️ lines to hook stdout (→ Claude Code system-reminder)") and `:103-104` ("Re-emit to hook stdout") describe the old channel, which is the very misconception this story fixes. If you fix them, re-capture `test/snapshots/hooks/stamp-and-gate.story-063-02.sh` (pin 0.5.0) and run `npm run gen:codex`.
- **§10.10 intro (`:375`).** It still says "the ingest subagent runs … Phase 4 is synchronous". That contradicts the new "Mode A as built" bullet in the same section.
- **Codex caveat placement.** "Codex PostToolUse context delivery unverified" sits in §10.9 #2 (`:367`). It belongs in #1 (`:366`), which is the item that claims Codex delivery.
- **Ingest agent Phase 4.** `:144` and `:161` say "This agent then orchestrates the LLM call via Task", but the agent's tools are `Read, Write, Bash` (no Task), and Mode A gives the dispatch to the orchestrator at Brief time.
- **Typing.** Add `satisfies Record<HookContextHost, Record<HookContextEvent, ContextFormatter>>` to `HOST_CONTEXT_MAP` (`hook-signal.ts:94`). A new host or event is then compile-checked, and the two exported types get a use. Today both are unused.
- **Vacuous anchor test (QA-Red, optional).** `test/docs/ingest-docs-match-code.red.node.test.ts:48-51` is named "wiki lint is invoked by sprint close…" but only checks that `wiki-lint.ts` exists. That is why R-1 went unnoticed. Assert the real caller instead.

## Checks

1. **Contract C2: honoured.**
   - `formatHookContext` matches the contract (`hook-signal.ts:112`):
     - It throws on an unknown host or event before the empty check.
     - `[]` gives `''`.
     - Claude PostToolUse gives one `JSON.stringify` object (`:97-100`).
     - SessionStart and Codex give plain lines.
   - `HOST_CONTEXT_MAP` is a table with no `if host ===` ladder. It is unexported, the same as `HOST_SIGNAL_MAP`.
   - `hookEmitContextHandler` (`hook.ts:82-100`) splits on `/\r?\n/` and drops blank lines. It uses `process.exitCode` and writes stderr then exit 2 on a throw.
   - The hidden `hook emit-context` command with two `requiredOption`s is at `cli.ts:613-623`.
   - `hook-lines.ts` holds the three builders, with text byte-equal to the bash directive (test `:184`).
   - Room left for 03 (imports the builders, pipes through emit-context). 06 is untouched (doctor stdout). For 11, M2 G-M2-25 already decided there is no `session-start.sh` change, so the unused SessionStart mapping is harmless.
2. **Host contract: correct.**
   - The JSON is built only in the CLI.
   - The hook's `exit 0` is unchanged (`:130`).
   - emit-context failures are wrapped in `|| true`, with stderr going to the log (`:126`).
   - The CLI is spawned only when `[ -s "$CTX" ]` (`:125`), and tests `:168` and `:176` assert there is no spawn when nothing was emitted.
   - The ✅ line matches only `create|update`. The real format is `wiki-ingest.ts:391`, and `unchanged`/`skipped` emit nothing.
   - G13 is stated as unverified in §10.9 and in the comment at `hook-signal.ts:88-92`.
3. **Canonical-only edits: clean.**
   - The Codex hook is byte-identical to the Claude hook, and the toml was regenerated. `node scripts/build-codex-payload.mjs --check` exits 0.
   - Outer `git status` shows nothing under `cleargate-planning/` or `.cleargate/{knowledge,templates,scripts}`.
   - Live `.claude/hooks/stamp-and-gate.sh` is dated Sep 26 and has no `emit-context`.
   - `dist/cli.js` is dated Nov 10 22:37, and the cli `git status` is clean.
4. **Snapshot lock: established pattern, not a new trap.**
   - Chain: cr-008 → cr-009 → cr-093 → story-058-10 → story-058-11 → story-063-02. The prior lock was demoted to existence-only (`init.node.test.ts:841`).
   - The lock equals the canonical file with `__CLEARGATE_VERSION__`→`0.5.0`.
   - The only cost: any later edit to the hook, including the comment fix above, must re-capture the lock.
5. **Doctor drift: §R step 3 fixes it.**
   - `drift-check.ts` compares only `scaffold/{core,hosts/claude}` and the CLAUDE.md bounded block (`:280-308`), and `init` rewrites all of those.
   - The meta-repo `AGENTS.md` is a hand-written bootstrap and is not drift-checked.
   - Expect `ClearGate drift:` banner lines in the meta-repo until §R. Do not hand-port to clear them.
6. **Carry-forwards landed: all except G15's second half, which is fixed but with the R-1 error.**
   - 8(a) landed: `contradict.ts:56/231/312` and `wiki-contradict.ts:51`. No stale "Git SHA" remains in either file.
   - A2 landed: the `collect.ts:8-12` header was rewritten and the empty state.json banner was removed.
   - G13 landed.
   - G15: §10.4 `:305` is fixed. `:515` was corrected, but to the wrong command (see R-1).
   - G10 was recorded as a plan deviation. Nothing else from the plan was dropped.

## Carry-forwards

- **STORY-063-03:**
  - §10.9 #2 already describes the Bash hook as built: matcher `Bash` on both hosts, covering `git mv` and `cleargate new`. 03 must make that true or edit it.
  - When copying the resolver/`--host` block from `stamp-and-gate.sh:12-48`, leave out the stale "re-emit to hook stdout" comments.
  - Optionally add the Bash hook to §10.2 `:248`.
- **STORY-063-07:**
  - The directive check parses one JSON object (plus `\n`) from the PostToolUse hook output.
  - The room's PATH must not put an older global `cleargate` ahead of the pinned npx. Resolver branch 2 (`stamp-and-gate.sh:19-20`) is not version-checked. An old binary rejects `hook emit-context`, the hook's `|| true` swallows the error, and every line is silently dropped.
- **Orchestrator / §R:**
  - The same version-skew risk applies to real installs. Before 02, these lines at least reached the transcript as plain stdout. Consider a fallback, `|| cat "$CTX"`, which outputs the plain lines, no worse than before. That is an owner call, not 02 scope.
  - Run §R step 8's 02 manual check (every automation claim names its code) after R-1, R-2 and R-3 land.
- **Orchestrator (outer docs):**
  - EPIC-063 §6 Q1 says "nothing outside `cleargate sprint close` calls lint".
  - CR-127 `:55` and `:81` cite `sprint.ts:1129-1131` as "sprint close", but that code is `sprint archive`.
  - Correct both before CR-127 is decomposed.

## Flashcard candidates

- `2026-11-12 · #wiki #docs · wiki lint runs only in \`cleargate sprint archive\` (sprintArchiveHandler); sprint close/close_sprint.mjs never runs it`
- `2026-11-12 · #tpv #docs · A docs-match-code anchor test must assert the code fact (grep the real caller), not that a module file exists`
- `2026-11-12 · #hooks #cli · Hook resolver branch 2 (PATH cleargate) is unversioned; a new \`hook <sub>\` fails on an older global and \`|| true\` hides it`
- On the Developer's cards: approve `#hooks #claude` (PostToolUse JSON `additionalContext`) and `#docs #tpv` (anchor prefix). Reject `#test-harness #macos` (`timeout 590 npm test`): it is operational, and close to the "full npm test ~18 min" card rejected earlier.

## Re-check after bounce 1 (4101a6a)

ARCH: PASS

role: architect. Reviewed `git diff 23e4582 4101a6a` (7 files, +39/−34). R-1, R-2 and R-3 are fixed, and the fixes are true against the code. Decision 10 (the version-skew fallback) behaves as specified on both paths. One optional item was only half done (see "Residual").

### Required items

- **R-1: fixed.**
  - Protocol `:348` (§10.8), `:369` (§10.9 #4) and `:515` (§12.6) now say lint runs in `cleargate sprint archive` and on demand, and not in `sprint close`.
  - The code agrees:
    - The only caller of `wikiLintHandler` outside the `wiki lint` command is `sprint.ts:964`, invoked at `:1131` inside `sprintArchiveHandler` (`:933`).
    - The waiver is at `sprint.ts:1137`.
    - `close_sprint.mjs` has zero `lint` hits.
  - No "lint at sprint close" claim remains anywhere under `scaffold/` (checked with `command grep -rni`).
- **R-2: fixed.**
  - §10.9 #3 (`:368`) cites §10.2 for the ingest fallback. `:248` sits under `### §10.2` (heading at `:244`) and now offers both actions (dispatch the subagent, or run `cleargate wiki ingest <file>`).
  - CLAUDE.md/AGENTS.md are cited only for the contradiction check. That matches `CLAUDE.md:34` and `AGENTS.md:26`, and neither file has a fallback rule.
  - Item #3 does not contain "wiki lint", so the order test is safe.
- **R-3: fixed.**
  - Ingest agent `:3` and `:194` now say the hook runs `cleargate wiki ingest` itself and never dispatches the agent. This matches `stamp-and-gate.sh:106`.
  - The `.toml` was regenerated, and `node scripts/build-codex-payload.mjs --check` exits 0.

### Decision 10: version-skew fallback (`stamp-and-gate.sh:128`)

- **Ends `exit 0`.**
  - The hook runs under `set -u` only (`:2`), with no `-e` and no `pipefail`. A failing `cat` cannot abort it, and `:132` is reached on every path.
  - `bash -n` is clean.
- **No double output.**
  - `hookEmitContextHandler` (`hook.ts:91-98`) writes stdout only inside `try`, after `formatHookContext` returns. A throw writes stderr and exits 2. The function sets no exit status after stdout has been written.
  - Probe with the stale meta-repo dist (Nov 10, no `emit-context`) and with the global 0.28.0: both print `error: unknown command 'emit-context'` to stderr, exit 1, and write **0 bytes** to stdout.
  - End-to-end sandbox (`CLAUDE_PROJECT_DIR` temp repo, stub `cleargate` on PATH):

    | Stub | Hook exit | stdout | Where the error went |
    |---|---|---|---|
    | Old CLI | 0 | exactly `✅ ingested as wiki/epics/EPIC-999.md` | the commander error went to `gate-check.log` |
    | New CLI (real `hookEmitContextHandler` via tsx) | 0 | exactly one `{"hookSpecificOutput":…}` line | none |

- **Codex copy: byte-identical.** `cmp` of the Claude and Codex hooks exits 0, and `build-codex-payload.mjs --check` exits 0.
- **Snapshot.** `sed 's/__CLEARGATE_VERSION__/0.5.0/g' <canonical> | cmp - test/snapshots/hooks/stamp-and-gate.story-063-02.sh` exits 0.
- **Gap (non-gating).** No test drives the `|| cat` path. `command grep` for `fallback|unknown command|older` finds nothing in either hook test file. My sandbox is the only evidence. QA-Verify, or 07, should add an old-CLI-stub case.

### Optional items

| Item | Result | Evidence |
|---|---|---|
| §10.10 intro | done | `:375` now has the CLI prepare the check and print `phase4:`, with the check run at Brief time. This agrees with the "Mode A as built" bullet. |
| Codex caveat moved to #1 | done | `:366` |
| Ingest agent "via Task" | **partial** | See "Residual" below. |
| Stale hook comments | done | `:86-87` and `:103-104`. The snapshot was re-captured. |
| `satisfies` | done | `hook-signal.ts:106`. The `Record<string,…>` local at `:114` is only a widened view for string indexing, and the `hasOwnProperty` guards at `:115` and `:119` are intact. `npm run typecheck` exits 0. |

`satisfies` probe results:
- Unknown host (`foo`, `toString`, `__proto__`) throws `unknown host`.
- Unknown event (`Foo`, `toString`, `constructor`) throws `unknown event`. This holds even with `[]` lines, because the throw comes before the empty check.
- `claude/PostToolUse` with `[]` returns `''`.

Targeted run of the 7 story-02 test files (docs, emit-context, hook-signal ×3, stamp-and-gate ×2): **78/78 pass**.

### Residual (non-gating, carry to orchestrator)

- **Ingest agent Phase 4 step 4 still contradicts itself.**
  - `:144` now says "The LLM call is not made here".
  - Step 4 (`:157-162`) still says "this agent: … b. Invokes `cleargate-wiki-contradict` via Task", but the agent's tools are `Read, Write, Bash`.
  - Also stale:
    - `:142` says Phase 4 runs "BEFORE the agent returns".
    - Step 5 says "Ingest is the sole writer" of `contradictions.md`, but `contradict-commit` writes it.
  - My first report cited `:161` with `:144`'s wording, which likely caused the miss.
  - This is outside R4's literal scope (description, buckets, step 4d), and no later EPIC-063 story touches this file.
  - Fix: rewrite step 4 as "the orchestrator, at Brief time, per §10.10 Mode A" and fix `:142` and step 5. Do it as a text-only rider on 03 (plan amendment), or as an orchestrator fixup before §R. Either way, run `gen:codex` after.
- **Vacuous anchor test.** It is unchanged (`ingest-docs-match-code.red.node.test.ts:48-51`), because QA-Red owns that file and the fix commit could not change it. This stays an optional QA-Red follow-up.
- **03 carry-forward (update).** Copy decision 10's `|| cat "$CTX"` fallback verbatim into the Bash hook, not the old `|| true`.
- **07 carry-forward (update).** On an older CLI, lines now reach stdout as plain text. Claude shows that only in the transcript, not to the model. So an old-PATH `cleargate` in the room shows up as "no JSON directive", not as "nothing". 07's check must still assert the JSON form.

### The 8 `.live.integration` failures

Measured on `4101a6a` by running `test/docs/*.live.integration.node.test.ts`: 20 tests, 12 pass, 8 fail. All four test files are unchanged since `455de32` (v0.28.0). For the parity tests, I attributed each drift by comparing live against `git show <ref>:scaffold/…` at `455de32`, `26e8c62` and `4101a6a`.

**Correction to the Developer's list.** The 8th failure is **`serial-dispatch-docs` Test 26** (canonical vs live protocol parity), not a dogfood-split test. All `dogfood-split-integrity.live` tests pass. The "bounded-block hash" failure is CR-105 test 3.

| # | Test | Kind | Introduced by | Fixed by §R step 3? |
|---|---|---|---|---|
| 1 | `claude-md-block-leads-relocation` 3: block-body hash | live vs canonical CLAUDE.md block | 02 (same at `26e8c62`, differs at `4101a6a`) | **Yes, by plain `init`.** `injectClaudeMd` always strips and re-prepends the block. Sandbox: a mutated block was gone after a plain re-run. |
| 2 | `gate-section-index-pinning` S1c | live vs canonical `readiness-gates.md`, `epic.md`, `story.md` | CR-126 (all matched at `455de32`; differ at `26e8c62`) | **Only with `--force`** |
| 3 | `serial-dispatch-docs` Test 26 | live vs canonical `cleargate-protocol.md` | 02 (same at `26e8c62`) | **Only with `--force`** |
| 4–8 | `readme-qa-doc-truth-043-06`: s1_d, s1_e, s2_a, s2_b, s2_c | content assertions on the **outer** `README.md` (Quickstart, "Epic/Story", "no flags") | Before EPIC-063: the outer README rewrite `dbad31f8` (2026-11-07) dropped the STORY-043-06 Quickstart. The README is unmodified since then. | **No.** `init` never writes `README.md`. |

**§R defect (my plan, M1.md:979): plain `init` will not re-sync the live files.**
- `copy-payload.ts:194-203`: when a target exists with different content and `--force` is absent, it is "Skipped (exists)".
- Sandbox proof: `init --yes` into a temp repo, append a line to `.cleargate/knowledge/cleargate-protocol.md` and `.claude/hooks/stamp-and-gate.sh`, then re-run `init --yes`. Both are reported "Skipped (exists)" and keep the appended line.
- So §R step 3 as written fixes only #1. It also leaves these stale:
  - the live hook, so the step 8 check for 02 (directive + `✅` in a real session) fails;
  - the live ingest agent;
  - the protocol, `readiness-gates.md`, `epic.md` and `story.md`, so step 4 `doctor` stays non-zero.

**Amend §R step 3** to `node cleargate-cli/dist/cli.js init --force`, with these guards:
- Before running, diff live `.claude/settings.json` against canonical. `--force` overwrites it wholesale (flashcard 2026-09-25 `#init #settings-json`), and `.claude/` is gitignored, so git cannot restore it. Back up `.claude/` first.
- `FIRST_INSTALL_ONLY` (`copy-payload.ts:89-93`) still protects `.gitignore`, `FLASHCARD.md` and `.cleargate/scripts/*`. EPIC-063 has touched no canonical script so far (`git diff --stat 455de32 4101a6a -- scaffold/`).
- Keep the existing `git checkout -- gate-checks.json config.yml` restore.

**§R step 1 must name:**
- README s1_d, s1_e, s2_a, s2_b and s2_c as expected-red that the re-sync will **not** fix. They predate EPIC-063. Their resolution is an owner call: restore a Quickstart in the outer README, or retire or repoint the test.
- S1c, Test 26 and CR-105 test 3 as red until step 3. With `--force`, all three go green.

### Flashcard candidates (re-check)

- `2026-11-12 · #init #dogfood #danger · plain \`cleargate init\` SKIPS live files that differ (copy-payload.ts:194); live re-sync needs --force (+ settings.json backup)`
- `2026-11-12 · #shell #zsh · in zsh, "$ref:scaffold/…" applies the :s modifier; write "${ref}:path" in git show loops`
