# BUG-085 — Architect post-flight report
role: architect

ARCH: PASS

BUG-085 conforms to TPV G1–G13 and to M3-A46…A60 with no deviation. I found no defect in the Dev's implementation. Two things are wrong, and both come from my own M3 blueprint, not from the Dev:

1. **The CR-117 port changes shipped behaviour.** It makes `cleargate state validate <sprint-id>` fail in every repo (FU-1). It does not block this merge:
   - nothing in the sprint loop calls that command;
   - nothing is published this sprint (rule 9);
   - the same bytes have been live in the meta-repo since CR-117.
2. **CLAUDE.md edit (c) is wrong.** Its deprecated-snapshot reader list is incomplete, and it is now less accurate than the sentence it replaced. M3-A62 corrects it with a post-merge orchestrator chore.

RS-BUG085 is confirmed with five changes (M3-A61). M4 V7 and V8 are resolved. M4-A1…A4 bind -08 and -09. M3 is closed.

## Subject

| Repo | Ref |
|---|---|
| cli `story/BUG-085` | Dev `12ae157` (on re-seal `8425816`, on main `b100ea8`). 4 files, +416/−89, and no `test/` file (G7). |
| outer `.worktrees/BUG-085` | `68fd9426`. 2 files, +20/−8. The worktree is clean. |

- I read both with `git show` and `git diff` only. Nothing was built, stashed or checked out in either checkout, and no suite ran. I read `doctor.ts` with `grep -a`.
- I did not repeat QA-Verify's re-runs or probes. My probes are listed under *Evidence* and cover different ground.
- Preflight:
  - `sprint-context.md`, including the 2026-09-26T01:20Z SMOKE RULE;
  - M3 (the blueprint, *Cross-story risks*, *Open decisions* step 5, T11, M3-A46…A60, the tag table);
  - the QA-Red, TPV and Dev reports and the bug file;
  - M4 (V7–V9, *Cross-story risks*, the forward pointers);
  - M6 (AD-M6-5 and its end pointer);
  - `command grep` over `FLASHCARD.md` for `#hooks #flashcard-gate #doctor #drift #clean-room #verify-install`.
- The flashcard Skill tool is not available in this dispatch, so I read the cards with a grep instead.

## 1. Conformance

| Constraint | Verdict | Evidence at `12ae157` |
|---|---|---|
| **G1** — export surface, skip rule, no `cleargate-planning/` read, no throw or write, sorted, no manifest or `selectEntriesForHosts` use | PASS | `drift-check.ts:27-56,84,328`. Skip at `:334-336` checks both dirs. `cleargate-planning` appears only in comments. No write call. Sorting at `:358-360`. No import of the manifest or of `manifest-query`. |
| **G2** — `pinTolerantEqual`: normalises like `hashNormalized`, escapes the literal parts, first placeholder captures, later ones use `\1`, anchored `^…$`, compares hashes when there is no placeholder | PASS | `:65-71` mirrors `sha256.ts` (BOM, CRLF, trailing `\n`); `:84-101`. The regex compiles without flags, so JS `$` matches only at end of input. Nits in FU-9. |
| **G3** — the walks | PASS | `.claude/**` is compared both ways (`:133-209`). `LIVE_ONLY_CLAUDE_ENTRIES` are skipped by equality or an `entry + sep` prefix in both walks, and symlinks are skipped. `.cleargate/**` is canonical-driven only, over `scripts`, `knowledge` and `templates` plus `README.md` and `config.example.yml` (`:60-61`, `:346-351`). `config.yml` is never walked. Exceptions go to `allowed` (`:115-121`). |
| **G4** — `doctor.ts` | PASS | The diff has two hunks: the drift-block comment only (`:275-280`), and the session line at `:624-636`, after CR-009 (`:612-622`) and before BUG-036 (`:638`). The condition, count and text match the blueprint verbatim. It never touches `outcome`. `runCheckScaffold`, `emitSummary`, the `--host` guard and `DriftMapEntry.owner` are byte-unchanged. |
| **G5** — sentinel (a), (b), (c), loop head, fail-closed, R5 gate, stderr text, advisory, dev/qa-only glob, pin literal and `TIER_RULES` unchanged, list form never unescaped | PASS | (a) `:147`. (b) JSON mode first at `:161-164`; `JSON_STR_RE` in a variable at `:106`; unescape at `:137-138`; unquoted-`]` close at `:140-144`. (c) Resets at `:167-170`, `:195-198` and `:202-205`. Loop head `:160`. Fail-closed at `:223-225`. Gate at `:228`. The stderr text is verbatim; `printf` renders `"- \"card\""`. The glob `:102` is unchanged. The pin literal is still once, at `:281`. `manifest-builder.ts` is untouched. |
| **G6** — `validate_state.mjs` | PASS | sha256 `9702f974…3958fae`, mode `100644`, byte-equal to live. |
| **G7** — no test edits | PASS | `git diff --stat 8425816 12ae157 -- test/` is empty. |
| **G8** — dist | PASS | The Dev used a scratch-clone build and disclosed it. The main-checkout `dist` is the pre-BUG-085 BD build (04:12). |
| **G9** — run list | PASS (reported) | Counts match the TPV table: 24/24, 13/13, 13/13, 11/11, 5/5, 15/15, 13/13 and the 13 sealed files. Rule 16: 20 files, 18/20 only on the expected `close-sprint-assume-ack-guard` (the worktree has no `cleargate-cli/src`). |
| **G10** — CHANGELOG | PASS (none required). FU-11 flags a release note before the next publish. | — |
| **G11** — bug068 repoint | PASS | Comment, usage lines, the two-line `CLI_ROOT`/`HOOKS_DIR` block verbatim, and an exit-2 message naming `HOOKS_DIR`. |
| **G12** — CLAUDE.md | PASS on the letter; (c) is inaccurate (plan-originated; M3-A62) | (a) at `:62`, (b) at `:127` and `:189`, (d) verbatim. The block is byte-equal to `scaffold/hosts/claude/CLAUDE.md` (START..END `a957bed5…afb0` in all three copies). |
| **G13** — outer scope | PASS | The commit touches 2 files; orchestration rows are left to the orchestrator. |
| **M3-A46** placement | PASS | Line 3, after the `cleargate CLI:` line. |
| **M3-A48** loop head | PASS | `:160` |
| **M3-A50** no host or manifest coupling | PASS | — |
| **M3-A53** multi-block scan | PASS | Also measured on the real reports: the -07 second-block card is found (control run, *Evidence*). |
| **M3-A54 / A55** | PASS | These are the re-seal's test-side rows (`init-fixture.ts:500-528`, `:613`); the Dev made them green without touching them. |
| **M3-A57** | PASS | `sessionDrift.drifted.length` only; `allowed` is never counted. |
| **M3-A58** R5 / R6 / R7 | PASS | `:228`, `drift-check.ts:93,98`, `:61` |
| **M3-A59** | Superseded | The orchestrator marked the 6 -02 cards (`45ac7134`). The new parser now finds 0 cards in the real tree (M3-A61 R2). |
| **M3-A60** | PASS | QA-Red reproduced the re-seal counts, and the Dev reproduced the conformant counts. |

## 2. Design quality

**`drift-check` never throws and never writes. Confirmed.**
- Every `readdirSync` sits in a `try` and returns on error.
- Every `readFileSync` sits in a `try`: a failed read (including `EISDIR`) is classified as `missing-in-live`, so it is reported, not thrown.
- `existsSync` cannot throw. `checkClaudeMdBlockDrift` wraps both reads.
- `Dirent` types come from `withFileTypes` without following links, so a symlink loop cannot recurse.
- No `fs.write*`, `mkdir*` or `rename*` call exists.
- Runtime on the real OUTER: 56 ms. That cost is paid at every meta-repo SessionStart, which is acceptable.

**The pin regex is anchored and safe. Confirmed, with two nits (FU-9).**
- `escapeRegExp` covers every metacharacter outside a class. The value class `[0-9A-Za-z][0-9A-Za-z.+-]*` excludes whitespace, `;`, quotes, `$` and `/`.
- There is a single capture group, and every later placeholder uses a backreference, so the pattern cannot backtrack catastrophically: the worst case is O(n²) over one group.
- Nit 1 (measured): when a later placeholder is followed by a literal digit, `\1` + `1` parses as octal `\11` (TAB) in non-`u` mode, so an equal file reads as `content-mismatch`. This fails safe, and no canonical file has that shape today: every second placeholder is followed by `"`.
- Nit 2: `:67` holds a raw U+FEFF inside a string literal, not `'﻿'`. If an editor strips it, `startsWith('')` becomes true for every file. The effect would be symmetric, so the risk is low.
- Accepted limit: pin equality is per file, not across files.

**Sentinel parser: fail-closed JSON mode, multi-block scan, bash 3.2 safety. Confirmed.**
- Every regex lives in a variable or is unquoted. The script uses `local`, `+=`, `${v//p/r}`, `"${!a[@]}"` and the `+` alternate form, all of which are 3.2-safe.
- I measured under `/bin/bash` 3.2.57:
  - JSON `"x\\y"` → `x\y`, and `"q\\\"z"` → `q\"z` (a correct JSON decode);
  - an active sprint with zero reports → exit 0, sentinel written;
  - over the real 23 reports → 0 cards and 0 unparseable files, with a control that blocks.
- **Edges that follow from the design** (low, routed):
  - **(i) Quoted fixtures are gated.** A dev or qa report that quotes a JSON-form line at a line start, fenced or not, is gated as real cards. Measured: a quoted test-15 line blocks with `a` and `b "q"`. This is Decision 5 working as designed; it fails safe (FU-4, and M3-A61 R3).
  - **(ii) List items after a JSON array are not read.** A JSON close resets to no-block, so list items that follow a JSON array under the same `## flashcards_flagged` heading are no longer gated; before BUG-085 they were (FU-13).
  - **(iii) CRLF.** List-form cards keep `\r`, which is quirk 2. JSON-form cards are immune (M6 pointer).
  - **(iv) The unparseable-only message.** When only an unparseable file is found, the gate prints `0 unprocessed flashcard(s)` before the unparseable line. The wording is odd, but it is harmless.

**SessionStart placement and exit-code neutrality. Confirmed.**
- The line sits after the resolver line and before the BUG-036 block, so the six `out[1]` pins hold.
- It does not touch `outcome`. The scratch-room probe shows `--session-start` exit 0 with no drift line.
- `session-start.sh:18` runs `… || true` anyway.
- Target repos skip the check, so there is no Claude-observable install change (Rule 2).

**The CLAUDE.md prose against the mechanical check.**
- **(d) is accurate on behaviour, with one gap:** "`cleargate doctor` exits 1". In this repo a bare `cleargate` is the global 0.26.1, whose drift check still diffs live against the frozen `cleargate-planning/`. It would list the wrong files until the next publish. M3-A62 edit 2 rewords it to `node cleargate-cli/dist/cli.js doctor`. The same hint in the doctor.ts drift line is FU-10.
- **(c) is incorrect** (measured on `68fd9426` and `12ae157`).
  - It dropped the old sentence's outer shell tests. 16 `.cleargate/scripts/test/*.sh` still resolve `cleargate-planning/` paths.
  - Among those 16, the flashcard-gate tests (`test_flashcard_gate.sh`, `test_flashcard_enforcement.sh:29`, `test_flashcard_fail_closed.red.sh:77`) exercise the **frozen pre-BUG-085 sentinel**. That is the same failure class as the bug068 finding (FU-3).
  - It omits `cleargate scaffold-lint` (`src/commands/scaffold-lint.ts:57` defaults to `<cwd>/cleargate-planning`; M1.md:298 had listed it) and the path patterns in `prep_doc_refresh.mjs` and `prep_qa_context.mjs`.
  - It lists the ~85 test files that -02 repointed, which are no longer readers.
  - The list came verbatim from my blueprint. M3-A62 gives the replacement text.

**The CR-117 port changes shipped behaviour (FU-1). Measured.**
- `src/commands/state.ts:205-209` runs `run_script.sh node <validate_state.mjs> <sprintId>`.
- The pre-port script ignored the positional and auto-discovered the state file. In a repo with one sprint it exited 0.
- The ported CR-117 script resolves the positional as a **path**: `state.json not found at <cwd>/SPRINT-01`, exit 1.
- Scratch probe on a one-sprint fixture: `8425816` script exit 0, `12ae157` script exit 1. The no-argument form (SKILL.md §C.1) is unchanged, with exit 0.
- The port itself is plan-mandated and correct against CR-117. The fix belongs in `state.ts`: pass `--state-file <root>/.cleargate/sprint-runs/<id>/state.json`, and update the CR-050 argv tests.

**Duplicate constant (FU-8).** `drift-check.ts:56` re-declares `PIN_PLACEHOLDER`, which `src/init/copy-payload.ts:55` already exports. The blueprint's surface mandated it. Fix: `export { PIN_PLACEHOLDER } from '../init/copy-payload.js'`, which needs no test change.

## 3. The RS-BUG085 plan (DevOps step 6): confirmed, with changes

The binding text is in M3-A61 (`plans/M3.md` § "As-built resolution after BUG-085"). What changes against the blueprint and G14/G15:
1. **Re-sync with the existing tool.** Use `b0-live-resync.mjs` (dry run, then `--apply`) instead of a hand copy. It already implements every step the plan listed:
   - it refuses unless OUTER is on `sprint/S-41` and cli is on `main`;
   - it backs up all of `.claude/` as a tarball plus a sha256 manifest in `b0/` (excluded by `.git/info/exclude`);
   - it reads the pin from live `# cleargate-pin:`;
   - it writes atomically with the canonical mode;
   - it asserts a post-condition.

   Simulated against the `12ae157` tree, its dry run lists exactly one change: `hooks/pending-task-sentinel.sh`, `e373fea7…` → `444becd2…`, pin `0.20.0`, no orphans.
2. **A new halt pre-check (R1).** `doctor --cwd OUTER` must print exactly one drift line (the sentinel) before the tool runs, because the tool re-syncs every differing canonical file.
3. **The pin is `0.20.0`, verified.** Its sources are live `stamp-and-gate.sh:7` and `session-start.sh:5` (`# cleargate-pin: 0.20.0`), plus the live sentinel's fallback literal at `:211`.
4. **The `pinTolerantEqual` check becomes a byte check.** The live sha must equal `444becd20e458c7982203243b7e6d8471905d90120660eca430405804fbb4d1b`, and the mode must be `755`. `pinTolerantEqual` cannot be imported from the tsup bundle, and byte equality implies it (measured `true` for the target bytes, `false` for today's live file). `doctor` then checks it through the real function (R6).
5. **G14's 6 cards are now 0.**
   - The pre-marking covers the 6 -02 JSON cards (`45ac7134`) and the 5 later-block cards (`5f2902d4` has the 4 CR-123 cards; `.processed-75dc3b1f9309` is the -07 card).
   - My dry parse of the new hook over the real 23 reports: exit 0, 0 cards, 0 unparseable. The control run blocks as expected.
   - The RS-time dry parse (R2) is still mandatory, and it must include `reports/BUG-085-qa.md`: QA-Verify is writing it now, and it may quote the test-15 JSON line (R3 covers that case).

**Unchanged and confirmed:**
- R6: `doctor --cwd OUTER`, zero drift lines, **exit 0**.
- R7: SessionStart with no drift line.
- R8: live `validate_state.mjs` is `9702f974…`; the tool touches only `.claude/`.
- R9: bug068 passes in both canonical and live mode from OUTER.
- R10: no restart. `settings.json` is unchanged, and scripts are read per invocation.

## 4. Forward risks

**M4.**
- **-08 check 7.** Default-mode doctor in a clean room skips the drift check and exits 0 (V7, measured). This holds only if the room has no `cleargate-cli` entry (M4-A1). B0's fixture symlinked one in, and that pattern must not be reused.
- **Running `verify-install` in OUTER** fails check 7 whenever OUTER has drift. That is correct behaviour (M4-A4).
- **-09 `dispatch`.** The payload carries the guard (V8). But in a Run 1 room `sprint-init` known-fails, so `.active` is absent, the gate is skipped, and the old and new hooks pass alike (measured). The M4 claim that "F6 reappears → Run 1 FAIL" does not hold. M4-A2 adds a deterministic active-sprint drive of the sentinel to the e2e test's A4, which makes it the packed-artifact witness for the guard.

**M4–M6: mid-story drift noise.**
- The drift check reads the cli checkout's working tree, which under R1 is the story branch.
- OUTER's SessionStart therefore prints `ClearGate drift: N …`, and `doctor --cwd OUTER` exits 1, from the first scaffold edit on a story branch until the outer twin merges or the RS step re-syncs.
- This is expected. The items affected are listed in M3 § "Mid-story drift noise". Every post-RS witness asserts zero drift.

**M5.**
- **-10 and -11 edit the sentinel.** G16 is concretized in the M3 pointer (FU-6): -10 refuses the post-BUG-085 hash `1572281d…ba2c` (measured with `FIXED_PIN`), and -11 refuses the post-(-10) hash. The note at M5 line 604, "already covered by BUG-085's row", is superseded.
- **M5 test 49's 3 rows and test 17's 5 rows repeat the M3-A54 defect** (a `currentHash` read from canonical passes at the red commit). Each row must refuse its own baseline.
- **Anchor shifts:** `:234-235` → `:304-305`, `:256-261` → `:326-331`, `:179-221` → `:246-291`.
- **RS-4a and RS-4** reuse `b0-live-resync.mjs`, with the dry-run change list pinned.
- **T-M5-3 is resolved.**

**M6.**
- -12's port targets the post-BUG-085 hook (glob `:99-102`, parser `:104-225`).
- It needs an `unparseable` channel (`flaggedCards` → `{cards, unterminated}`; `pendingFlashcards` → `{ok, unprocessed, unparseable}`; `ok` is false on any unparseable file).
- It must also port the JSON, reset and CRLF semantics exactly as measured, and the parity test compares card sets (FU-7).

## 5. Part B — M4 readiness

These are appended to `plans/M3.md` § "As-built resolution after BUG-085". The orchestrator mirrors them into M4.

**V7 — resolved.**
- Signature: `checkCanonicalDrift(cwd: string): DriftReport` (`drift-check.ts:328`).
- Path handling: taken relative to `cwd` with no walk-up. It skips when `<cwd>/cleargate-cli/scaffold/{core/.cleargate,hosts/claude/.claude}` is absent (`:334-336`). `doctorHandler`'s `cwd` is `cli.cwd ?? resolveProjectRoot(process.cwd())` (`doctor.ts:1080`).
- Measured on the as-built source against a scratch install:
  - `skipped: true`;
  - default `doctorHandler` exits 0;
  - `--session-start` exits 0 with no drift line.

**V8 — resolved.**
- The payload sentinel carries `${REPORT_FILES[@]+"${REPORT_FILES[@]}"}` at `:147`, with mode `0755` and the pin placeholder at `:281`.
- A clean-room Agent dispatch with an active sprint and zero reports: exit 0, sentinel written. The pre-BUG-085 hook exits 1 with `REPORT_FILES[@]: unbound variable` and writes no sentinel.
- Without `.active`, both hooks exit 0 and write the sentinel. See M4-A2.

**Anchors that the merge moves:**
- `doctor.ts`:
  - `doctorHandler` `:1001` (M4, at `2e566b5`) → `:1076`;
  - outcome exit `:1066-1074` → `:1146-1156`;
  - hook-failure scan `:212-235` → `:212-244`;
  - drift block `:275-288`;
  - `runSessionStart` `:587`;
  - `--host` guard `:1109-1114`;
  - `selectMode` `:111-129` (unchanged).
- `cli.ts` is **byte-unchanged**, so V6's `:34` and `:636/:637` stand.

**Binding amendments:**
- **M4-A1** — no `<room>/cleargate-cli`, directory or symlink. -09 asserts it with `lstat`.
- **M4-A2** — the `dispatch` verdict does not witness the guard. The e2e test's A4 gains the active-sprint sentinel drive, and the evidence records `active_sprint` as INFO.
- **M4-A3** — the citation corrections above. -08 check 5 imports `PIN_PLACEHOLDER` from `copy-payload.ts:55`.
- **M4-A4** — `verify-install` in OUTER fails check 7 whenever drift exists (informational).

**Final tag status (M3 closed):**

| Tags | Status |
|---|---|
| M3 T1–T12 | Resolved |
| M4 V1–V8 | Resolved |
| M4 V9–V12 | Open. V9 is due now: re-measure it from the tarball. BUG-085 moves no V9 value. |
| M5 T-M5-1..3 | Resolved |
| M5 T-M5-4..7 | Open |
| M6 | Unchanged |

## 6. Follow-up routing

| FU | Finding | Target | Severity |
|---|---|---|---|
| FU-1 | The CR-117 port makes `cleargate state validate <sprint-id>` resolve `<cwd>/<sprint-id>` as the state file, so it exits 1 in every repo. It used to exit 0 in single-sprint repos (measured). Fix `src/commands/state.ts:205-209` to pass `--state-file <root>/.cleargate/sprint-runs/<id>/state.json`, and update the CR-050 argv tests (`test/commands/state.node.test.ts`, `state-unit.node.test.ts`). | A new BUG, filed now. It must land before the next `npm publish` (none happens in SPRINT-41, rule 9). | P2, ship-visible |
| FU-2 | CLAUDE.md: the reader list and the bare `cleargate doctor` (M3-A62) | Orchestrator chore on `sprint/S-41`, right after the outer merge | binding, doc |
| FU-3 | 16 outer `.cleargate/scripts/test/*.sh` read the frozen `cleargate-planning/` copies. The 3 flashcard-gate tests and `bug069_ledger_fallback.red.sh` therefore test code that never runs. Repoint them with bug068's `CLEARGATE_CLI_ROOT` / live-mode pattern. | The `cleargate-planning` retirement CR at close | medium |
| FU-4 | A dev or qa report that quotes a line starting with `flashcards_flagged:` followed by `[` is gated as real cards (Decision 5, fail-safe). Add to the M4–M6 Dev and QA dispatch text: "never start a line with `flashcards_flagged:` outside your own block; quote fixtures with a leading backtick". | Dispatch text from wave12 on; hardening goes to close together with the Decision 6 scope widening | low–medium |
| FU-5 | -09's `dispatch` verdict does not witness the guard (M4-A2) | -09 QA-Red (the orchestrator mirrors it into M4) | binding |
| FU-6 | M5 delta rows. G16 concretized: refuse `1572281d…ba2c`. Rows in tests 49 and 17 refuse their own baseline. The M5 line 604 note is superseded. Sentinel anchors shift. RS-4a and RS-4 reuse `b0-live-resync.mjs`. | -10 and -11 QA-Red and TPV (the orchestrator mirrors it into M5) | binding |
| FU-7 | The M6 port API gains `unparseable` (`ok` is false on any unparseable file). JSON, reset and CRLF semantics as measured; set-based parity; 4 new parity fixtures. | -12 QA-Red (the orchestrator mirrors it into M6 AD-M6-5) | binding |
| FU-8 | `drift-check.ts:56` duplicates `PIN_PLACEHOLDER` from `copy-payload.ts:55`. Replace it with a re-export by identity. | The next cli item that touches `drift-check.ts`, or close. -08 imports copy-payload's copy (M4-A3). | low |
| FU-9 | drift-check hardening: (a) `\1` followed by a digit becomes octal, so emit `(?:\1)`; (b) raw U+FEFF at `:67`, so use `'﻿'` or reuse `hashNormalized`'s normalization; (c) modes are not compared, so a hand-ported hook without `+x` fails open unseen. Add a `mode-mismatch` reason for `.claude/hooks/**`. | Close follow-up CR | (a), (b) low; (c) medium |
| FU-10 | The drift line's `run \`cleargate doctor\`` hint resolves to the global 0.26.1 in the meta-repo until the next publish, and that version lists the wrong files. The orchestrator runs `node cleargate-cli/dist/cli.js doctor`. The doctor.ts text is sealed by S12. | The CLAUDE.md side is in M3-A62. The doctor.ts text goes to close, or becomes moot after publish. | low |
| FU-11 | The sentinel changes ship to every install on upgrade: JSON cards, later blocks and final-line cards are now gated, and an unterminated block now fails closed. Add a `### Fixed` note under `## Unreleased`. | Before the next publish. -08 appends it while it edits `## Unreleased`, or the close release-notes pass does. | low, binding before publish |
| FU-12 | The drift check walks only core and claude; `.codex/**` and `.agents/**` are not walked | Close, if the meta-repo ever dogfoods Codex live | low |
| FU-13 | A JSON close does not return to an enclosing md block, so list items after a JSON array under the same heading are ungated (a regression from pre-BUG-085 on this edge). The -12 port replicates it. | Close, with FU-4 | low |
| FU-14 | Carry the M3 *Open decisions* step 5 items to close: the flashcard-gate scan scope (Decision 6), `.mcp.json` left untouched on Claude removal, and FU-7..FU-12 from -02 | Close | — |

## 7. Final Adjacent Implementations row for BUG-085

| Story | Module / Export | Path |
|---|---|---|
| BUG-085 | `checkCanonicalDrift(cwd)` → `DriftReport { skipped, drifted, allowed }`:<br>• scaffold-rooted, relative to `cwd` with no walk-up; skips when `<cwd>/cleargate-cli/scaffold/{core/.cleargate,hosts/claude/.claude}` is absent<br>• `.claude/**` compared both ways, minus `LIVE_ONLY_CLAUDE_ENTRIES`<br>• `.cleargate/{scripts,knowledge,templates}` plus `README.md` and `config.example.yml`, canonical-driven<br>• `META_REPO_DRIFT_EXCEPTIONS` go to `allowed`<br>• never throws and never writes; compares content only, never modes<br>`pinTolerantEqual(canonical, live)`: one pin value per file, anchored.<br>`DriftReason` adds `'live-only'`.<br>`PIN_PLACEHOLDER` is re-declared here; import it from `src/init/copy-payload.ts` instead (FU-8).<br>doctor: default mode exits 1 on drift; `--session-start` prints a `ClearGate drift:` line 3.<br>Sentinel flashcard-gate parser: JSON arrays, every block, the final unterminated line, fail-closed on an unterminated array, and bash 3.2's empty array. This parser is the reference for -12's `flashcard-gate.mjs`. | `cleargate-cli/src/lib/drift-check.ts`, `src/commands/doctor.ts`, `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` |

## Evidence (probes; every one read-only for both repos)

- **`git show` and `git diff`** of `12ae157` against `8425816` and `b100ea8`, and of `68fd9426`. Anchors were measured with `grep -a` and `awk`.
- **The as-built `checkCanonicalDrift` on the real OUTER** (`tsx -e` from the cli checkout at `12ae157`):
  - `drifted = [.claude/hooks/pending-task-sentinel.sh (content-mismatch)]`, `allowed = [.cleargate/scripts/gate-checks.json]`, 56 ms;
  - `pinTolerantEqual(canonical, canonical with 0.20.0) = true`, and against the current live file `false`;
  - the outer worktree and a nonexistent `cwd` both give `skipped: true`.
- **V7 room:** `(cd <scratch>/room1 && git init -q && node CLI/dist/cli.js init --yes --pin 0.0.0-arch085 </dev/null)`, exit 0, with no `cleargate-cli` entry. The as-built `doctorHandler` gave:
  - `{}` → exit 0, 0 drift lines;
  - `{sessionStart: true}` → exit 0, 0 drift lines, lines 1 and 2 = banner and resolver.
- **The new and old canonical sentinel under `/bin/bash` 3.2.57** (PATH `cleargate` stub keyed by subcommand; gate variables unset):
  - The real 23 dev/qa reports plus the 24 markers: new exit 0, old exit 0. Control (2 markers removed): new exit 2 listing those 2 cards; old exit 0.
  - V8 active room: new exit 0 with a sentinel; old exit 1, `line 224: REPORT_FILES[@]: unbound variable`, no sentinel. V8 room without `.active`: both exit 0 with a sentinel.
  - Unescape: `x\y`, `q\"z`. CRLF: JSON card `crlf-json` is clean; the list card keeps `"` and `\r`. A quoted test-15 line gates `a` and `b "q"`.
- **`b0-live-resync.mjs` dry-run logic**, replicated against a `git archive` of `12ae157`'s `scaffold/hosts/claude/.claude`: 1 change (the sentinel `e373fea7…` → `444becd2…`, mode 755), pin `0.20.0`, 0 orphans.
- **`validate_state.mjs`**, `8425816` against `12ae157`, on a one-sprint scratch fixture: with a positional `SPRINT-01`, exit 0 against exit 1; with no argument, 0 and 0.
- **The regex octal hazard:** `new RegExp("^a(…)b\\11c$")` matches `a0.20.0b\tc` and does not match `a0.20.0b0.20.01c`; `(?:\1)1` matches the latter.
- Every scratch artefact lives under the session scratchpad `arch085/`.

## Outer status

- **Start:** `M` on the 4 hook-owned SPRINT-41 files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`), plus 2 untracked `.pending-task-*.json` files that the ledger hook later consumed.
- **End:** the same 4 `M` files. My only writes to the outer tree are this report and the `plans/M3.md` append (3172 lines). The cli checkout is unchanged (`?? cleargate-0.25.0.tgz` only, `story/BUG-085` @ `12ae157`). The outer worktree is clean.
- No writing CLI smoke touched a repository. The single `init` ran inside a literal scratchpad dir as one `(cd … && …)` call.

## Script incidents

None. No wrapped script was executed; `b0-live-resync.mjs` was simulated, not run.

## Version check

No dependency is added or pinned, so `npm view` does not apply.

## flashcards_flagged

flashcards_flagged:
  - "2026-09-26 · #hooks #flashcard-gate #danger · Post-BUG-085 a dev/qa report line starting `flashcards_flagged: [` (even fenced) is gated; quoted fixtures block."
  - "2026-09-26 · #clean-room #hooks · No .cleargate/sprint-runs/.active means the flashcard gate is skipped (_off-sprint); such a dispatch cannot witness it."
  - "2026-09-26 · #state #danger · Post-CR-117 validate_state.mjs reads a positional as a PATH; `cleargate state validate <sprint-id>` now always fails."
  - "2026-09-26 · #hooks #test-harness #danger · 16 outer .cleargate/scripts/test/*.sh still read frozen cleargate-planning/; the flashcard-gate ones test a dead hook."
  - "2026-09-26 · #doctor #drift · drift-check reads the cli checkout's WORKING tree: on an R1 story branch, OUTER reports drift for unmerged canonical."
  - "2026-09-26 · #doctor #regex · A regex backreference followed by a literal digit parses as octal escape 11 (TAB) in non-u mode; wrap it as (?:...)."
  - "2026-09-26 · #dogfood #hooks · Re-sync live with b0-live-resync.mjs: dry-run first, then --apply (branch guards, .claude backup, live pin, canonical mode)."

STATUS=done
