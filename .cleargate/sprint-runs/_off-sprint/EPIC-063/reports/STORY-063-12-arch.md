# STORY-063-12 Architect post-flight (role: architect, Mode: Post-Flight, off-sprint EPIC-063 M2)

**VERDICT: PASS-WITH-FOLLOW-UPS**

- **Merge blockers:** none. Merge `story/STORY-063-12` as trial-merged (7494449).
- **Blockers for §R step 8 (G7):** four follow-ups (F1–F4) must land before the 0.28.0 baseline run. G-M2-28 locks the corpus and the questions by sha256 from the baseline onward, so they cannot change after it.
- **G5 (G5b compare):** no blocker found.

Reviewed: commit 4a994b9, and the trial merge with main (including 11-F2 d7c5fa2) at `scratchpad/trial12` (7494449). I read them against M2 C11/C12, D1–D8, G-M2-58..79 and decisions 16–19, and against `session-brief.ts` and `doctor.ts` as merged.

## What I ran (scratch only)
- **Unit and R3 tests on the trial merge:** `brief-truth-oracle.red` + `orientation-eval.red` → **72/72** (load ≈ 6). The trial tree stayed clean.
- **Corpus (variant A), oracle facts mode:** matches FACTS_A. Waiting has **6** ids (5 shown + `+1 more`). Release is `.: v0.0.1 + 1 commits`.
- **Real corpus in the G5b shape (pipe form) on the trial merge:**
  - Inputs: a scratch copy of the outer `.cleargate/{delivery,config.yml,wiki/contradictions.md}` plus the needed `sprint-runs` files, with `release_repos: [cli, mcp]` (symlinks to the live repos, so F2's async describe and its provably-no-tags path both ran).
  - The brief was compiled and printed in-process from the trial-merge sources.
  - Result: `--compare` **exit 0** in 0.94 s, with `Release: cli: v0.29.0 + 38 commits; mcp no tags`.
- **The compiler's own truncation, end to end:** I built three synthetic corpora that force R3 truncation:
  - lists cut to 3 entries;
  - lists cut to counts only, then whole sections dropped;
  - the compiler's printed brief compared against the oracle.
  
  All exit 0. A truncated brief the compiler produced itself is treated as agreement.
- **Divergence probes:**
  - an active plan present in both `archive/` and `pending-sync/`;
  - a last-closed report with no frontmatter;
  - shrunk lists with no truncation line.
  
  Results are in F5–F8.
- **Doctor output at today's date** on the corpus. This found F1.

## Incident — my error, already repaired
My scratch driver wrote the doctor resolver stub `<repo>/cleargate-cli/dist/cli.js` into a scratch repo where `cleargate-cli` was a **symlink to the live checkout**.
- **What happened:** at **22:54 (+04)** the write emptied the live `cleargate-cli/dist/cli.js` to 0 bytes.
- **What I restored from:** the global `cleargate@0.29.0` install (`/opt/homebrew/lib/node_modules/cleargate/dist/cli.js`). Before restoring, I checked that all 26 dist files shared between that install and the live checkout compare byte-identical. So the live dist is the build that was published, and its `cli.js` is the original.
- **Restore:** done about 22:55. sha256 `9a259ca9…43b2`, 756,907 bytes, mode 0755, mtime reset to 15:13. `node dist/cli.js --version` prints `0.29.0`, and `git status` in cleargate-cli is clean.
- **Scope:** no other file was touched; the `rmSync` removed only the symlink.
- **Consequence:** for about one minute, every live hook that runs `node cleargate-cli/dist/cli.js` did nothing and exited 0.
- **Orchestrator action:** if any agent edited a `.cleargate/delivery/**` file in 22:54–22:56, run `wiki ingest` on it. Otherwise nothing is needed. The driver now `lstat`s first and never writes through an existing path; the flashcard is below.

## Findings, ranked by severity

### Must land before §R step 8 (they block G7; none blocks the merge)

**F1 (High for G7). The eval room's SessionStart banner depends on the clock, and today it tells the model to act.**
- **Cause:**
  - `test/fixtures/orientation-corpus/.cleargate/delivery/pending-sync/SPRINT-10_Index_Follow_Ups.md:6` and `SPRINT-11_Cache_Cleanup.md:5` carry `updated_at: "2026-11-11T00:00:00Z"` on Draft, unapproved sprints.
  - `src/lib/wiki/unchecked-drafts.ts:52-55` alarms on drafts that are 1–7 days old.
- **Observed:** with `now` set to the real clock, `doctor --session-start` on the corpus prints this until 2026-11-18T00:00Z:

  `⚠️ contradiction check missing: 2 recently edited draft(s) never checked — SPRINT-10, SPRINT-11. Run the check before their Brief (wiki contradict <file>, then wiki contradict-commit).`
- **Why it matters:**
  - A brief question whose session follows that directive makes tool calls, and that alone fails G7.
  - A candidate run before 11-18 and one after it see different banners, so runs are not reproducible.
  - The 0.28.0 baseline has no alarm at all.
  - R3 is unaffected, because it pins `now` to 2031.
- **Fix:** remove `updated_at` from SPRINT-10/11, or move it to ≤ 2026-10-01. Neither date feeds any D-fact: neither sprint has decision pairs, and D4 reads only terminal sprints. Add one corpus guard: no Draft/In Review, unapproved `pending-sync` item has `updated_at` later than 2026-11-01. This is a QA-Red-class fixture edit and must land before the baseline.

**F2 (Medium). "Not run" is decided by exit code plus a missing `result` string, not by the result event's error flag.** See `scripts/clean-room/orientation-eval.mjs:183`.
- **Max turns:** a session that hits `--max-turns 8` ends with a result event of subtype `error_max_turns` that has no `result` string, and a non-zero exit. That is classed "not run", so the verdict is INCOMPLETE where scoring it wrong could still PASS at 11/12.
- **API or auth errors:** these end with `is_error: true` and a `result` string, so they are scored as **wrong answers**. Twelve auth failures read as `VERDICT: FAIL`, and §R counts two FAILs as a release block. That breaks R7 ("never scored as a wrong answer").
- **Fix:** add a small local reader of the last `result` event (`parseClaudeStream` stays frozen):
  - `subtype` other than `success` because of max turns or budget → ran, wrong, with the subtype recorded;
  - `is_error: true` otherwise → not run, with the reason;
  - spawn error or timeout → not run (as today).
- **Caveat:** these are the shapes in the Claude Code SDK's result-message type. Confirm them against one smoke transcript.

**F3 (Medium, privacy). Transcripts are written next to the evidence file.** See `orientation-eval.mjs:388-391`.
- §R step 8 says to commit the evidence under `.cleargate/sprint-runs/_off-sprint/EPIC-063/reports/`. Passing `--evidence` there puts 12 raw `claude -p` transcripts into the outer repo.
- Flashcard 2026-11-12 `#privacy #fixtures`: raw transcripts hold home paths, connectors, plugins and rate-limit information.
- **Fix:** always write transcripts under `<container>/transcripts/` and cite absolute paths, as the M1 ingest-loop evidence does.
- **Until then:** run without `--evidence` and copy only the `.md` into `reports/`.

**F4 (Low-Medium). The rule "only an Opus run counts" (R9) is checked against the requested `--model` flag, not the model that actually ran.** See `orientation-eval.mjs:196`.
- The transcript's `system/init` carries `model`. The M1 ingest-loop evidence already records `init.model`.
- **Fix:** read the init `model` per session, record it in the evidence, and refuse to give a release verdict when any session's model is not `GATING_MODEL`.

### G7 design risks (orchestrator decisions, not code defects)

**R-a. Skill-induced reads.** With SPRINT-9 active, `session-start.sh` prints `→ Active sprint detected. Load skill: sprint-execution`, and the CLAUDE.md block requires loading it.
- G-M2-29 excludes the `Skill` call itself.
- The skill body then says "Read `sprint_goal:` from the active sprint plan's frontmatter … at kickoff" (`scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` §0.5). Any `Read` that follows fails the zero-tool bar on a brief question.

**R-b. q05 asks for something the brief can't fully show.** "What is waiting on me right now? **Name the items.**" — but the corpus Waiting list has 6 ids, so the brief shows `… SPRINT-08 +1 more`.
- Scoring correctly asks only for the 5 shown ids (sealed red `orientation-eval.red:188`).
- But the prompt invites a lookup of the sixth, which is a tool call.
- **Options:** drop "Name the items" (the 5 ids remain the tokens), or cut the corpus Waiting union to ≤ 5 ids (that changes FACTS_A and LINES_A).

Both risks are cheap to measure: one non-Opus smoke run on the candidate before the baseline, which G-M2-28's "before any candidate run" allows for a smoke-labelled run. Then freeze the question/corpus set and run baseline → candidate.

### Follow-ups (non-blocking; one CR or 12-F1 after §R)

**F5 (Low-Medium). The compare accepts lists that shrank without the truncation line.** See `scripts/brief-oracle.sh:726-731` (`prefixok` returns true with no tail) and `:829` (Decisions takes any k).
- Probe: a brief with `P0/P1 bugs: 3`, `Carried, no sprint: 4` and Waiting as counts only, Decisions with 1 entry and Planned with 1 entry + `+1 more`, and **no** `[…more in wiki/index.md]` line → exit 0.
- A wrong fact cannot pass this way: counts, prefixes and `+N` are always checked. But a compiler that truncates silently, or has a level bug, is invisible.
- This matches C12.2 and G-M2-62.5 as written. The gap is in the contract.
- **Fix:** with no truncation line, require full level (min(5, |T|) shown, with `+N` when |T| > 5; Decisions shows min(5, |D|)). Allow levels 3 and 0 only when the truncation line is present.
- **G5b impact:** none. The real brief (1,459 B printed) never truncates.

**F6 (Low). D1 plan lookup differs from the compiler and from the hook.** See `brief-oracle.sh:475,487` and `:609-614`.
- The oracle takes the first matching file in C-sorted full-path order, so `archive/` wins.
- `findSprintPlanFile` (`sprint-file-locate.ts:53`) and `session-start.sh` take `pending-sync/` first.
- The oracle also requires frontmatter before it accepts a plan, and it searches subdirectories.
- Probe: a stale copy of SPRINT-9 in `archive/` with a different goal → `mismatch: active_sprint` (spurious).
- **Fix:** pending-sync first, then archive, top level only, name-sorted, by filename.

**F7 (Low). D4 with a report that has no frontmatter.** See `brief-oracle.sh:557-565,578-579`.
- The oracle prints `no report`.
- G-M2-69.4 says an absent fm `status` prints `unknown` and the Stories line comes from the body.
- The compiler (`session-brief.ts:252-269`) prints `unknown` but drops the Stories line, because `parseFrontmatter` throws.
- Probe: `mismatch: last_closed … unknown … truth=… no report …`.
- Both sides deviate from D4. Real corpus: not reachable (SPRINT-44 has frontmatter).

**F8 (Low, compiler side, found by the oracle). Duplicate active-sprint files keep one `Planned:` entry.**
- D6 lists the active sprint once per file (G-M2-69.1).
- `adjustPlanned` splices only the first match (`session-brief.ts:424-428`).
- The oracle drops every entry, which matches "the live active sprint is removed".
- Probe: `mismatch: planned`. It is a real compiler edge bug; route it to an 11-side follow-up.

**F9 (Low). D8 timeout asymmetry.** The compiler maps a describe slower than 1,000 ms to `<repo> unavailable` (`session-brief.ts:42,166-179`); the oracle never times out (G-M2-61, by design).
- At high load this fails R3 (in-process describe on the corpus repo) or G5b spuriously.
- The F2 Dev saw it once with files running in parallel.
- **Mitigation:** run G5b at the G6 load (< 4). A `release`-only mismatch that names `unavailable` is re-run, not treated as a defect.

**F10 (Low). A setup failure exits 1, the same code as FAIL, and prints no VERDICT line.** See `orientation-eval.mjs:422-425`.
- **Fix:** print `VERDICT: INCOMPLETE` with exit 3, or use a distinct code.
- Also extend §R step 8 to say "INCOMPLETE → re-run; not a FAIL".

**F11 (Low, portability hardening).** `brief-oracle.sh:503` `substr(AMB[i], 1, 4) == "🟢"` relies on byte-mode awk.
- That holds today: BSD awk 20200816, and gawk/mawk under the exported `LC_ALL=C`.
- A UTF-8-aware awk returns 4 characters, which I checked with gawk under en_US.UTF-8.
- **Fix:** `index(AMB[i], "🟢") == 1` works in both modes.

**F12 (Low).**
- `lineof` (`brief-oracle.sh:715`) takes the first prefixed line anywhere in the doctor output. Scope it to the lines after `ClearGate brief:` when that line is present. No doctor line collides today; I checked `doctor.ts` session-start strings.
- The evidence header (`orientation-eval.mjs:223-226`) records the questions and corpus sha256 but not the oracle's sha256. Add it, since the oracle supplies the brief tokens.

## 1. Independence: where the oracle uses the compiler's own heuristic

| Fact | Oracle derivation | Same heuristic as the compiler? | Acceptable? |
|---|---|---|---|
| D-universe | `find` + awk; id = stem up to `_`; frontmatter = an awk port of `locateFrontmatter` (BOM, opaque `<instructions>`, fences opaque) | **Yes** (locator port) | Yes. D-universe is defined as that locator. A locator bug would be shared, but the real census shows 0 skips. |
| D1 | `.active` + plan scan + `jq` on `state.json`; its own block-scalar goal parse | No (`jq` vs `readSprintRunState` + `JSON.parse`; no js-yaml) | Yes. See F6 on precedence. |
| D2 a | its own scrape of `cached_gate_result.pass` | No | Yes |
| D2 b | awk transliteration of `scan`/`findSection`/`cleanLines`/`extractDecisionPairs`/`isPlaceholderAnswer`: same regexes, placeholder list, backtick-parity inline rule, `stripNumber` | **Yes** | Acceptable only because D2 b is *defined* through those functions. The oracle proves selection (open items, both sections, files not ids, nesting), not the parser. **No independent witness for the placeholder parser.** |
| D2 c | awk port of `readUnlabelledContradictions` (`- draft:` / `label:` regexes, `bare` strip) | **Yes** | Yes. The definition is literally `label: null`. Low value, low risk. |
| D2 d | `find -maxdepth 2` | No | Yes |
| D3 | its own severity scrape and sort; titles not compared (QA-Red default 4, ratified) | No | Yes |
| D4 | its own report lookup and ranking; the `Carried Over` fallback reuses the `findSection` port | Partly | Yes. See F7. |
| D5 / D6 | its own | No | Yes. It found compiler bug F8. |
| D7 | port of the `latestDecisions` ordering + the D2 b parser | **Yes** (by definition: "first 5 of `latestDecisions`") | Yes. 10's G4 live counter (no extract-sections import) is the independent witness for the answered-pair parser. |
| D8 | two-call `describe --abbrev=0` + `rev-list --count`, no provably-no-tags shortcut | No | Yes. See F9. |

The static check holds: no `cleargate`/`node`/`npx`/`tsx` invocation and no `cleargate-cli`, `dist/` or `src/` text. Only `.cleargate/` paths appear.

## 2. Fact fidelity (plan vs oracle)

- **D1–D8 as amended:** match, with the exceptions in F6 (D1 precedence) and F7 (D4 report with no frontmatter).
- **11-F1:**
  - G-M2-66 (sprints are not members): `:503` `id !~ /^SPRINT-/`.
  - G-M2-67 (P0/P1 split on `; `, first token): `:770-772`.
  - G-M2-68 (a terminal active plan leaves the line as is and is never in D6, so `:529` never fires for it): all consistent.
- **11-F2:** consistent. `<repo>: <tag> + <n> commits` / `no tags` / `unavailable`.
  - A provably tag-less repo gets `no tags` from both sides.
  - A `.git` file goes through describe on both sides.
  - `wiki.brief.release_repos` is parsed as a block or flow list with the G-M2-74 fallbacks.
  - Proven live on the real repos (`mcp no tags`, `cli: v0.29.0 + 38`).

## 3. Compare semantics

- **Legitimate shrinkage → agreement.** Proven end to end on compiler output at levels 3 and 0 and with section drops (G-M2-62).
- **Live caps:** compared as byte prefixes (G-M2-69.5).
- **Never excused:** a missing Active sprint, Waiting or Release line (G-M2-72.2).
- **Wrong but shrunk:** a false count, prefix or `+N` cannot pass. Undeclared shrinkage can (F5).
- **G5b on the real corpus:** passes (exit 0 on the trial merge with both release repos). The residual spurious-failure sources are F9 (load) and a stale `brief.md` if delivery changes between §R step 5 and step 10 without an ingest.

## 4. Eval harness

- **Scoring:** case-insensitive with the digit boundary. Bar ≥ 11/12, zero tool calls on the 8 brief questions with Skill excluded, all 12 hooks injected.
- **Verdict precedence:** INCOMPLETE > BASELINE > SMOKE > PASS/FAIL, per G-M2-77.
- **Refusals:** `validateContainer` runs before the tool checks; `claude` is never pre-checked; a relative container is refused.
- **Evidence:** header with model, ref/version, tarball sha, questions and corpus sha, container, cli_sha, claude version; the table; every answer through `markdownCell`.
- **`run --model claude-opus-5-5 --ref main`:**
  - `packArtifact` clones `main` into `<container>/src` and only symlinks `node_modules`.
  - `npm run build` runs there. `tsup.config.ts` `onSuccess` resolves `pkgRoot` from the bundled config, which `bundle-require` 5.1.0 writes next to the config file, so it writes `<container>/src/dist/MANIFEST.json`.
  - **The live checkout is not touched.** The M1 ingest-loop run used the same path.
  - The default container `/Users/ssuladze/Documents/Dev/cg-cleanroom-<stamp>-orient` passes validation (that parent is not a git work tree).
- **`run --version 0.28.0`:** 0.28.0 has `init --yes`. The facts come from the oracle on the room, so baseline and candidate share the same tokens.
- **Gaps:** F1–F4, R-a, R-b.

## 5. Dev deviation (`active_sprint` token = sprint id only)
Accepted (decision 19).
- q01 asks only "which sprint". Requiring `4 stories` would fail a correct answer.
- The full line's truth is G5b's job.
- The session's Skill/state.json side effects cannot shift the id token.
- Using first-5 tokens for the list questions and `none` for empty lists is consistent with what the brief can show.

## 6. Portability, cost, packaging

- **bash 3.2:**
  - no `set -u` (empty-array expansion is safe);
  - `read -r -d ''` heredocs, `$'\t'` case patterns and `<<<` all work on 3.2;
  - `LC_ALL=C` is exported first (`:19`);
  - the `jq` check comes before any work (`:22`).
- **BSD awk:** no intervals, `\s` or `gensub`; `NF2`/`NU` avoid builtins. F11 is the one hardening item.
- **Spawns:** constant at 9 (+2 per extra release repo) and ≤ 40, pinned by E9.
- **Packaging:** nothing ships. `package.json` `files` = `dist`, `templates`, README, LICENSE, CHANGELOG; `scripts/**` and `test/**` are excluded.
- **Commit:** mode 100755 on the oracle; three files; no CHANGELOG line (flashcard 2026-09-27).

## Open decisions for orchestrator
1. F1 fixture edit + guard (QA-Red) and F2–F4 eval edits as **12-F1, before the baseline run**. F5–F12 go to a post-§R follow-up CR; F8 is routed to the 11 side.
2. R-a / R-b: run a non-Opus smoke on the candidate before freezing the questions and corpus? If Skill-driven reads appear, choose between measuring real behaviour (G7 can fail on the skill, not the brief) and an explicit exemption rule. Record the choice before the baseline.
3. §R step 8 wording:
   - INCOMPLETE → re-run (not a FAIL);
   - commit only the evidence `.md`;
   - run G5b at load < 4 (F9).

## flashcards_flagged
- `2026-11-12 · #test-harness #danger · Stubbing <repo>/cleargate-cli/dist/cli.js in a scratch repo whose cleargate-cli is a symlink writes the LIVE dist; lstat first.`
- `2026-11-12 · #eval #fixtures · Fixed updated_at on a Draft fixture trips the 1–7-day unchecked-draft alarm for a week; the eval banner becomes clock-dependent.`
- `2026-11-12 · #oracle #compare · Count-only or shrunk list lines pass --compare without the truncation line; silent compiler truncation is invisible.`
- `2026-11-12 · #clean-room #claude-p · Key "not run" on the result event (is_error/subtype), not on exit code + missing result string; else max-turns→INCOMPLETE, auth→FAIL.`

## Script Incidents
None. There was no `run_script.sh` invocation. All probes ran under a private `/tmp/a12.*` (since deleted) and `scratchpad/arch12`. The dist incident is described above.
