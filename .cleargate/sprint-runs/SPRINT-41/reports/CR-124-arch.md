role: architect

# CR-124: Architect post-flight (live) on the integrated tree

VERDICT: PASS

```
TREE: cli story/CR-124 @ 430424a (merge of cli main c5a311e into Dev e22a408); outer story/CR-124 @ 12702ad1 + 3 uncommitted twins
BLUEPRINT: plans/replan-contract-first.md §7.1–§7.7, with §7.8 (RP-A25..A27) winning where they differ
CHECKS: 8/8 pass; 6/6 Developer deviations ACCEPTED
BLOCKING FINDINGS: none
PRE-MERGE OBLIGATION (rule 21, not a CR-124 defect): cli main and sprint/S-41 both moved after the integrate; re-integrate before DevOps (clean, measured)
```

Every measurement below comes from `430424a` (read-only). I ran tests solo from `<cw>` with `npm run test:file -- <file>`. I wrote scratch scripts only under the session scratchpad.

## Check 1: the -12 anchors and banned tokens

**Anchors.** I measured the SKILL.md anchors at `35580b0` and at `430424a`. Each prefix occurs exactly once, and each full line is byte-equal to the base.

| Anchor (M6 AD-M6-3) | Line at 35580b0 | Line at 430424a | Count | Full line equal |
|---|---|---|---|---|
| A5 `# Sprint Execution — The Playbook` | 15 | 15 | 1 | yes |
| A1 `There is one and only one way a sprint executes` (P1 anchor) | 104 | 104 | 1 | yes |
| A1 end `### 2.1 Spikes run before the loop, not inside it` | 106 | 106 | 1 | yes |
| A2 `` ### C.0 Execution — run each wave via `/workflows` `` | 265 | 267 | 1 | yes |
| `A single-story wave is one segment` (P2 anchor) | 269 | 271 | 1 | yes |
| A2 end `### C.1 Pre-execution check` | 289 | 304 | 1 | yes |
| A3 `**Serial barrier merge.**` | 481 | 496 | 1 | yes |
| A4 start (`` The `pending-task-sentinel.sh` PreToolUse hook blocks the next ``) | 578 | 593 | 1 | yes |
| A4 end `**Between-wave relocation.**` | 580 | 595 | 1 | yes |

**Banned tokens.**
- The replacement ranges at `430424a` are A1 104–105, A2 267–303, A3 496 and A4 593–595.
- I scanned all 846 lines for the 9 banned tokens: `/workflows`, `Workflow tool`, `parallel()`, `launch_wave`, `resumeFromRunId`, `RUN_ID`, `mintRunId`, `SKIP_FLASHCARD_GATE=1`, `Between-wave relocation`.
- **Zero occurrences lie outside A1–A4.** The M6 invariant ("every occurrence lies inside A1–A4") still holds.

**Where CR-124's 18 added or changed lines fall (diff against `c5a311e`):**
- Lines 195, 199, 207 and 208 are in §A.4 (169–212), outside A2. They contain no banned token. T3b and this scan agree.
- Line 269 is the §C.0 intro paragraph, where CR-124 appended one sentence. The line already carried `/workflows`, `Workflow tool` and `launch_wave` at the base (then line 267). It is inside A2.
- Lines 291–303 are the new `#### C.0.2`, entirely inside A2. The order is C.0 (267) < C.0.1 (273) < `**Idempotent segments.**` (289) < C.0.2 (291) < C.1 (304). This satisfies RP-A25's T3a placement.

**Architect agents.**
- -12 anchors nothing in them.
- -11's codegen (M5-A49) reads their frontmatter. All three descriptions are plain scalars that:
  - pass the M5-A49 refusal rules (not empty, no ` #`, no leading indicator);
  - parse under js-yaml CORE_SCHEMA;
  - keep the blank separator line after the fence.
- None of the three bodies contains `"""`. So C2's `npm run gen:codex` over CR-124's text cannot throw.

**Bytes for -12's re-derivation.** The integrate merge changed none of CR-124's scaffold files: the e22a408 and 430424a bytes are identical. -11 does not touch these two files, so C2 carries the same bytes:
- SKILL.md: `e7c730efde50df072e6eccffc6b48764e55c19ab8706dae376208a644d35c797`
- launch_wave.mjs: `090881968a62b40b4ad5da2c1471d1588654c86f05da696294d0adc17a4080ee`

These replace T-M6-7's `c5affd1b…` and `aa04cd43…` as the pre-(-12) fixture bytes. Enforcement is `8d8c8e98…51b0` after CR-124; -11's §16 will change it again.

**Result:** PASS.

## Check 2: vocabulary

**Solo runs from `<cw>`:**

| File | Result |
|---|---|
| `test/docs/no-execution-mode-vocabulary.red.node.test.ts` | 9/9 |
| `test/commands/no-exec-mode-vocab.node.test.ts` | 4/4 |
| `test/docs/contract-first-dag-text.red.node.test.ts` (T6 = the RP-A26 wording) | 10/10 |
| `test/scripts/waves-json-v2.red.node.test.ts` | 7/7 |

`node scripts/check-no-exec-mode-vocab.mjs` exits 0.

**Independent measurement,** importing `INCLUDE_PATTERN` and `findExecModeVocabHits` from the checker:
- The bare-pattern hits per CR-124 file are identical at `35580b0` and at `430424a`:
  - `launch_wave.mjs`: 0 hits.
  - `cleargate-enforcement.md`: 3 hits, at 213, 260 and 272. All three are the retired `execution_mode` prose the TPV measured.
  - The other 5 files: 0 hits.
- None of the 3 enforcement hits contains `real-collision`. Line 103, the only real-collision line, has 0 hits. This is RP-A26 exactly.
- `findExecModeVocabHits(<the 7 CR-124 files>)` returns `[]`.
- The 140 `+` lines of CR-124's delta against main (the 7 files) contain 0 bare-pattern hits.

**Result:** PASS.

## Check 3: `launchWave` shell-safety

**Nothing in the module executes.** `launch_wave.mjs` imports only `node:crypto` (line 42). There is no `child_process` import, and no `exec*`/`spawn*` call. The module only returns command strings, which the Orchestrator (and later -12's `dispatch_serial.mjs`) runs.

**The plan-file path is validated before interpolation.**
- `storyBases` (119–131) returns a base only after these checks:
  - It refuses any `schema_version` other than 2 (121).
  - It skips entries with no base or an empty base (125).
  - It checks each base against the allowlist `^[A-Za-z0-9._\/-]+$` (126) and throws a TypeError naming the story.
  - It refuses an undeclared `contract/` base (127).
- The W3 test (`waves-json-v2.red.node.test.ts:176-258`) covers a space, `;`, `$(`, a backtick, `schema_version: 3`, and missing or empty bases. It is green.
- `launchWave` (290) threads `bases` through `baseFor` (295–298) into `worktreeAddCommand` (113–116) at both call sites (303, 315).

**Defence-in-depth gaps.** None is a bounce.
1. `baseFor` does not re-validate a `bases` value. It relies on the JSDoc contract at 285 ("from `storyBases(plan)`"). Probe: `launchWave({…, bases: {'STORY-99-01': 'x;id'}})` returns `git worktree add .worktrees/STORY-99-01 -b story/STORY-99-01 x;id`. The §7.2 blueprint pins this `baseFor` behaviour verbatim. The only designed producer of `bases` validates its input, and the module never executes.
2. The allowlist admits `--detach`, `-f`, `../x` and `a..b`. A leading `-` is a git option-injection shape, not shell injection. It would make the story branch come from HEAD or error out. It would not run arbitrary code.
3. `sprintBranch` and `storyId` were never validated. `worktreeAddCommand` is byte-unchanged since `35580b0` apart from its JSDoc.

**Why these are follow-ups.** Closing them belongs in `worktreeAddCommand`. -12 imports that function and parity-freezes the pre-story `launch_wave.mjs` (AD-M6-4 and AD-M6-6). Hardening it inside CR-124 would move C2's frozen surface, so each gap is a follow-up below.

**Result:** PASS.

## Check 4: the template probe anchors

**The three `declareProbeSprint` anchors** in canonical `Sprint Plan Template.md`:
- line 66: `^epics: \[\]`
- line 89: `` | `{STORY-NNN-NN}` | {Title} | ``
- line 117: `` | `STORY-NNN-NN` | fast | <one-line rationale> | ``

**Live probe.** I imported `declareProbeSprint` from `scripts/clean-room/probe-items.mjs:78` and ran it on the canonical template. It does not throw. `epics:` becomes `[EPIC-001]`, and the fast-lane row is removed.

**Other checks:**
- The §1 table keeps its `Milestone` column (line 87), which RP-A9 and `collect.ts` grouping need.
- CR-124's only template hunk is the `### 2.1 Phase Plan` body (95–99).
- The outer twin in `<ow>` is byte-equal to canonical.
- T5 and T5b are green inside the 10/10.

**Result:** PASS.

## Check 5: no `init_sprint.mjs` byte changed

`git -C <cw> diff 35580b0 430424a -- scaffold/core/.cleargate/scripts/init_sprint.mjs` is empty (0 lines). The same is true against `c5a311e`. The blob is `f80eabdac20ab2432a2821e171bfff09611638e6` at both `35580b0` and `430424a`.

**Result:** PASS.

## Check 6: deviations

| # | Deviation (from CR-124-dev.md) | Ruling | Architectural reasoning, with file:line |
|---|---|---|---|
| 1 | K1 measured from `ac491a6`, not `dbd002f` | ACCEPT | `ac491a6` is the RP-A25 re-seal commit, created after the TPV wrote K1. `git diff --name-only ac491a6 e22a408` lists exactly the 8 allow-listed files and nothing under `test/`. |
| 2 | Task Breakdown boxes not ticked | ACCEPT | The dispatch forbade delivery edits, and ticking is the orchestrator's merge-lane chore (precedents: `c33238d4` for BUG-097, `c566dc95` for BUG-096). The CR-124 work item's rows 130–136 are still `[ ]`. That is orchestrator action, not a code finding. |
| 3 | architect-reader Workflow step 5 added | ACCEPT | Step 6 (`architect-reader.md:53`) forbids any field beyond the shape. Without step 5 (`:52`), a haiku reader has no procedural instruction to fill `exports_provided`/`exports_consumed`, and the synth's Contract formation (`architect-synth.md:61-72`) would get `[]` everywhere. The step is inside an allow-listed file, and T1 is green. |
| 4 | synth "Your one job" and example rows reworded | ACCEPT | At the base, `:14` "collision-free wave assignment", `:115` and `:138` "disjoint file surfaces" contradict the new predicate: `:49` says an insert-only shared file is not a collision. The new text is at `:14`, `:152` and `:185`. It is wording only; K10 coherence. |
| 5 | SKILL §C.0.2 rule 2 adds the frozen-export change rule | ACCEPT | It is sourced from the re-plan §2 "Change rule" (`replan-contract-first.md:159-161`). "sprint §4 Execution Log" is existing SKILL vocabulary (`SKILL.md:75`, `:134`, `:557`, `:625`). It sits inside A2 (`:296`), so it has no -12 impact. |
| 6 | The named red is canonical-live-parity 5d in the worktree, not 5c | ACCEPT | This is a factual correction of RP-A27. `canonical-live-parity.red.integration.node.test.ts:227-230` returns early under `isWorktree()` (`:52`), so 5c cannot go red in `<cw>`. 5d was base lag and cleared at integrate (11/11, CR-124-integrate.md §5). RP-A27's merge-lane 5c expectation stands until RS-CR. |

## Check 7: integration sanity

**init-fixture resolution (K9 / rule 21).**
- `git diff c5a311e 430424a -- test/helpers/init-fixture.ts` is one hunk, `@@ -604,4 +604,113 @@`, with +109 and -0 lines. The upstream rows are untouched.
- Order at `430424a`:
  1. STORY-058-06 (509)
  2. STORY-058-07 (521)
  3. BUG-085 (533, 549)
  4. STORY-058-10 (562, 579, 593)
  5. the 6 CR-124 rows, contiguous (607–684)
  6. the shared `STORY-058-11+CR-124` row (703)
  7. `]);` (715)
- The shared block (702–714) has sha256 `2203a6405406444013cfacd4312f92f6f977a16fe6a3f54df1e075c257be5fe8`. That equals the TPV's measurement of the §7.5 fence and of -11's `f4234f2` copy, so rule 21's "second merger deletes its identical copy" stays mechanical.

**CHANGELOG.**
- `## Unreleased` / `### Added` holds both the STORY-058-10 bullet (line 9) and the CR-124 bullet (line 22).
- BUG-096 and BUG-097 made no CHANGELOG change.
- CR-124's CHANGELOG delta against main is +5/-0.

**SDR text vs §C.0.2 vs the consumers.**
- **Contract fields.** `id`, `branch` = `contract/S-<NN>-<slug>`, `base`, `owner_story` and `frozen_exports` are identical in three places: `architect-synth.md:65-70`, SKILL §C.0.2 rule 1 (`:295`) and the plan §7.7 schema. The optional `consumers`/`created_by`/`create_when` appear in synth `:70`.
- **Build and integrate semantics agree:**

  | Rule | Synth | SKILL §C.0.2 |
  |---|---|---|
  | Build set | `:117` | rule 3 (`:297`) |
  | Integration edges (`dep_predecessors` → `upstream`, contract owner kept in `upstream`) | `:55`, `:72`, `:118` | rule 4 (`:298`) |
  | Contract body (skeleton or owner Developer commit) | `:72` | rule 2 (`:296`) |
- **The synth example is live-valid.** I parsed the `waves.json` example (`architect-synth.md:127-169`) and fed it to the canonical module:
  - `storyBases` returns all 4 bases.
  - `integrationReady(ex, 'STORY-NNN-02', [])` is `false` (its upstream is STORY-NNN-01), and the others are `true`.
- **`init_sprint.mjs` reads only `lane_assignments`** (199–210). The synth example (`:167`) and rule 1 keep it. W1/W2 (in waves-json-v2 7/7) prove v1/v2 lane parity through a spawned canonical `init_sprint.mjs`.
- **`launch_wave.mjs` reads no file.** `storyBases(plan)` is the only v2 reader, and `launchWave({bases})` is additive (W4/W4b).
- **`waves[]` keeps `wave`/`stories`/`parallel`/`rationale`** (synth `:147-166`). That satisfies -12's `dispatch_serial next` (M6 `:284`) and the collision-surface validator (`sprint`, `generated_at`, `waves`).
- **Dogfood.** The real `SPRINT-41/plans/waves.json` has `schema_version: 2` and 4 contracts. `storyBases` accepts all 9 bases (SHAs, `main` and `contract/S-41-*`), and 0 `upstream` refs are unresolved.

**Coherence notes.** These are non-blocking; they are follow-ups below.
- **Fail-safe ordering is not in `upstream`.** Fail-safe trailing placement (synth `:86`, `:121`) is not encoded as `upstream` edges. The synth's own example gives `STORY-DB-TOUCH` `upstream: []` in wave3, yet `integrationReady(ex, 'STORY-DB-TOUCH', [])` returns `true`.
  - §C.0.2 rule 1 makes `waves` "the derived layered view of the integration order", so the hand-run protocol integrates correctly.
  - A future EPIC-055 scheduler that gates on `integrationReady` alone would integrate fail-safe stories early.
  - This traces to my own §7.2 item 3 (layer formula plus the verbatim fail-safe section), not to the Developer.
- **A dangling pointer in the Codex rendering.** §A.4 `:207` ends "§C.0.2 runs such a plan." It sits outside A2, but -12's Codex rendering replaces A2, including §C.0.2, with R2. The generated `.agents/skills/sprint-execution/SKILL.md` would therefore point at a section it lacks.
- **Enforcement `:103` wording.** It keeps "File-disjointness between co-waved stories is the Architect's `waves.json` guarantee (the real-collision predicate …)". The real-collision predicate explicitly does not guarantee file-disjointness (synth `:49`). The wording was pinned by §7.2 item 6, which forbade other byte changes.
- **Stale comment.** `scaffold/core/.cleargate/scripts/collision_surface.sh:40` still says "five-clause wave-compatibility predicate". The file is outside CR-124's allow-list.

**Result:** PASS.

## Check 8: RS-CR readiness

**`b0-live-resync.mjs` source.** It writes only inside `if (apply && plan.length)` (68–90): backup tar, `mkdirSync`, `writeFileSync` and `renameSync`. The dry run only reads files and runs `git branch --show-current`. I ran it once as a dry run through `run_script.sh` (exit 0). Against cli main `d4d6d93` it reports `changes: []` and `orphans_reported_not_deleted: []`. Live therefore equals main's canonical today, and every post-merge drift is CR-124's.

**Post-merge prediction.** The script is hardwired to the main checkout's canonical, so I replicated its comparison in scratch: the same walk, the same `LIVE_ONLY`, and live pin `0.20.0` substituted for `__CLEARGATE_VERSION__`. I pointed it at `<cw>/scaffold/hosts/claude/.claude`:
- Predicted changes: exactly `agents/architect-reader.md`, `agents/architect-synth.md`, `agents/architect.md` and `skills/sprint-execution/SKILL.md`.
- Orphans: `[]`.

**Cross-checks:**
- `git diff --name-only main 430424a -- scaffold/hosts/claude/.claude` lists the same 4 files.
- A raw `diff -rq` also lists 4 hooks: `pending-task-sentinel.sh`, `pre-edit-gate.sh`, `session-start.sh` and `stamp-and-gate.sh`. Each is byte-equal after pin substitution, so these are install-time pins, not drift (flashcard 2026-08-28 `#dogfood-split #danger`).
- `scheduled_tasks.lock`, `settings.local.json` and `worktrees` are live-only and preserved.

**The `.cleargate` half.**
- The three twins `cmp` equal (exit 0) between `<cw>` canonical and `<ow>`. They differ from the outer main checkout (exit 1), which is expected until the outer merge commits them.
- The other differences between canonical `scaffold/core/.cleargate/{scripts,knowledge,templates}` and `<ow>` are:
  - live-only files (`backfill_hierarchy.mjs`, the test shells, `clean-room-verification.md`, `script-incident-corpus-analysis.md`), which the canonical-driven compare skips;
  - `gate-checks.json`, which is a `META_REPO_DRIFT_EXCEPTIONS` entry.
- So after the outer + cli merges and BD, `doctor` prints exactly the 4 `scaffold drift:` lines of §7.6 step 7. After RS-CR `--apply` it prints 0.

**Result:** PASS.

## Pre-merge obligation (orchestrator, rule 21)

- **cli `main` moved** after CR-124's integrate: `c5a311e` → `d4d6d93` (the BUG-097 merge; `a3720ea`, `7993d37`, `d41efe0`).
  - It touched 8 files, all under `src/commands/` and `test/commands`/`test/wiki`, and none of CR-124's 12 paths.
  - `git merge-tree --write-tree d4d6d93 430424a` exits 0, so the merge is clean.
- **Outer `sprint/S-41` moved** after `<ow>`'s integrate (`11ebac2c` → `e40aabcc`). Only reports and plans changed; nothing under `.cleargate/{scripts,knowledge,templates}` did.
- **Rule 21 requires re-integration before DevOps.** Merge main into cli `story/CR-124` and `sprint/S-41` into outer `story/CR-124`. Re-derive the 3 twins and `cmp` them. Run `build-codex-payload.mjs --check`, the make-green set and typecheck.
- **This verdict carries over** if the re-integration changes none of CR-124's 8 blueprint files, its 3 test files or `init-fixture.ts`. The probe shows it will not.
- **DevOps §7.6 step 3:** the full-suite expectation is the latest recorded merge total + 17. That base is now the post-BUG-097 total, not BUG-096's 3312.

## Follow-ups (non-blocking)

- **launch_wave ref hardening.** Validate refs where they are interpolated: `worktreeAddCommand` should require an alphanumeric first character and reject `..` and `@{` for the base and `sprintBranch`, and should check `storyId` with `extractWorkItemIds`. `baseFor` should then need no trust. Route this after -12, because -12 imports and parity-freezes `worktreeAddCommand`; it could instead land in -12's `dispatch_serial.mjs`, which already validates story ids (AD-M6-4). Suggested home: EPIC-055.
- **Fail-safe ordering as edges.** Encode fail-safe trailing placement as `upstream` edges in the synth. For example, each fail-safe story lists every non-fail-safe story plus the preceding fail-safe story. Alternatively, define `integrationReady` as necessary-only and name `waves` order as the sufficient gate. Either way, `integrationReady` and the derived waves then agree. Route to EPIC-055's scheduler.
- **-12 M6 entry re-derivation:**
  - decide whether R2 carries a one-sentence contract-first note for serial hosts, or whether the rendered §A.4 pointer to §C.0.2 (`:207`) needs an R-text;
  - re-freeze `test/fixtures/skill-pre-058-12/SKILL.md` and `test/fixtures/launch-wave-pre-058-12/launch_wave.mjs` from the C2 bytes (the sha256 values in Check 1), replacing T-M6-7's pins;
  - note that M6 line references shift: A2 by +2, A2 end, A3 and A4 by +15, and the `launch_wave.mjs` validator by +24 (orientation only; the code keys on anchors).
- **Enforcement `:103`.** Reword "File-disjointness … guarantee" to collision-freedom in a later enforcement-doc edit (-12 already edits this file for §17).
- **Stale comment.** `collision_surface.sh:40` still says "five-clause"; sweep it with the next collision-surface change.
- **Usage line.** `launch_wave.mjs:344-346` names 4 exports and omits `storyBases`/`integrationReady`. -12 edits this file anyway, so fold the fix in there.

## Git status (read-only confirmation)

- `<cw>`: `status --porcelain` is empty; HEAD is `430424a`.
- `<ow>`: exactly ` M` on the 3 twins (`cleargate-enforcement.md`, `launch_wave.mjs`, `Sprint Plan Template.md`), unchanged by this dispatch.
- Outer main checkout: this dispatch added only this report. The `M` delivery files present in the outer tree come from a concurrent merge-lane full `npm test` back-sync (rule 14), which the merge lane reverts.
- I made no commits, ran no stash, no build or prebuild in the cli main checkout, no bare `cleargate`, and no `--apply`, and I did not touch live `/.claude`.

## Script Incidents

None. The single `run_script.sh` invocation (the `b0-live-resync.mjs` dry run) exited 0.

## flashcards_flagged

```yaml
flashcards_flagged:
  - "2026-09-26 · #sdr #waves · Fail-safe trailing waves live only in waves[]; integrationReady reads upstream only, so encode the order as edges."
  - "2026-09-26 · #skill #codex · Codex render swaps SKILL A2 (C.0 to C.1) for R2; a pointer from outside A2 into §C.0.x dangles in the Codex copy."
  - "2026-09-26 · #shell-safety #git · Ref allowlist [A-Za-z0-9._/-] still admits '-x' (git option injection) and '..'; require an alnum first char."
```
