role: developer

# CR-124: Developer report (build phase)

```
STORY: CR-124
STATUS: done
COMMIT: e22a408ebff55343561366b06c3a2e7b15d49ea6 (cli story/CR-124, parent ac491a6)
TYPECHECK: pass
TESTS: 18 passed, 0 failed (make-green: waves-json-v2 7/7, contract-first-dag-text 10/10, init-sprint-waves-v2 1/1); parity pair 5/5 + 15/15
FILES_CHANGED: CHANGELOG.md, scaffold/core/.cleargate/scripts/launch_wave.mjs, scaffold/core/.cleargate/knowledge/cleargate-enforcement.md, scaffold/core/.cleargate/templates/Sprint Plan Template.md, scaffold/hosts/claude/.claude/agents/architect.md, scaffold/hosts/claude/.claude/agents/architect-synth.md, scaffold/hosts/claude/.claude/agents/architect-reader.md, scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md (+ 3 uncommitted outer twins in <ow>)
NOTES: I implemented §7.2 plus the §7.8 clarifications (RP-A25..A27) within the 8-file allow-list. Every sealed test went green on the first run: no test was edited, and none was unsatisfiable. No codex TOMLs were regenerated: -11 has not merged, and `scripts/build-codex-payload.mjs` does not exist at base 35580b0 (-10 adds it), so `--check` only applies at integration (K9). The named reds differ in one place from RP-A27's list. In the worktree, canonical-live-parity fails at **5d** (token-ledger.sh: live now equals cli main's post -10 canonical, and this base predates -10). **5c** passes because it skips inside a worktree (`isWorktree()`), so the agent drift only turns 5c red in the merge lane, until RS-CR. I did not tick the CR's Task Breakdown boxes: the dispatch requires `<ow>` to hold exactly the 3 twins, and forbids delivery edits. Script incident: `.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260926T151729Z-e444b3d67b99.json` (cr078_init.test.sh, 38/1, the named SPRINT-34 SAFETY line).
```

## K1–K10 checklist

| Gate | Result | Evidence |
|---|---|---|
| **K1** file allow-list | PASS | `git diff --name-only ac491a6..HEAD` lists exactly the 8 files: `CHANGELOG.md`, `launch_wave.mjs`, `cleargate-enforcement.md`, `Sprint Plan Template.md`, `architect.md`, `architect-synth.md`, `architect-reader.md`, `SKILL.md`. The TPV's `dbd002f..HEAD` wording pre-dates the re-seal commit `ac491a6`, so it also lists QA-Red's 3 re-sealed test files. None of those bytes are the Developer's. `git diff --name-only ac491a6..HEAD -- test/ scaffold/core/.cleargate/scripts/init_sprint.mjs` returns 0 lines. No `init-fixture.ts` and no TOMLs. |
| **K2** twins | PASS | I copied the 3 canonical files into `<ow>`. After the commit, `cmp` exits 0 for `.cleargate/knowledge/cleargate-enforcement.md`, `.cleargate/scripts/launch_wave.mjs` and `.cleargate/templates/Sprint Plan Template.md`. They stay uncommitted (rules 17 and 21). No mode change (`git diff --summary` is empty). |
| **K3** `launch_wave.mjs` | PASS | Hunks vs `35580b0` sit at old lines 109, after 116, after 260, 264, after 266, 270 and 282. None is inside `:1-41` or `:129-224`. `storyBases` and `integrationReady` match §7.2 verbatim. `launchWave` gains `bases = {}` as its last destructured parameter, plus `baseFor(story)`, which returns a non-empty-string `bases[story]` or else `sprintBranch`. `command grep -c 'worktreeAddCommand(.*baseFor('` = **2**. JSDoc: `@param {Record<string,string>} [args.bases]`, and `worktreeAddCommand`'s 2nd parameter is described as "the base ref (the sprint branch, or a contract branch from a `schema_version: 2` plan)". `node launch_wave.mjs` prints the usage line and exits 0. `check-no-inline-id-regex.mjs` exits 0. |
| **K4** SKILL.md | PASS | Hunks at 195, 199 and 207–208 fall within §A.4 (169–213). Hunks at 269 and 291–303 fall within §C.0 (267–304). All 7 anchor prefixes (A1, the C.0 heading, `A single-story wave is one segment`, the C.1 heading, `**Serial barrier merge.**`, and the two A4 lines) diff empty against `35580b0`, and each occurs exactly once. |
| **K5** enforcement | PASS | `git diff --numstat 35580b0` = `1	1`. The only changed line is `:103`, and "(STORY-033-03's five-clause predicate)" became the §7.2 item 6 text verbatim. |
| **K6** template | PASS | Hunks at 95 and 97–99, all inside the `### 2.1 Phase Plan` body (heading at 94, `### 2.2` at 101). The body is the §7.2 item 7 text verbatim. T5b is green. |
| **K7** vocabulary | PASS | `node scripts/check-no-exec-mode-vocab.mjs` exits 0. `INCLUDE_PATTERN` over every `+` line of the diff = 0 hits. The 9 banned tokens in §A.4 = 0 (T3b green). |
| **K8** anchors | PASS | See the anchor table below. `npm run typecheck` is clean. `cr078_init.test.sh` (outer twin, via `run_script.sh`) gives 38 pass / 1 fail, the named SPRINT-34 SAFETY line. Named reds are listed below. |
| **K9** integration | N/A (build phase) | Out of scope for this dispatch. At integration: cli `main` is now `c5a311e`, which has moved past `fcb1491`. The expected `init-fixture.ts` tail conflict is resolved at row level: main's rows, then CR-124's 7. If -11 merged first, delete one copy of the shared row. Run `build-codex-payload.mjs --check`, then `gen:codex` if -11 merged. |
| **K10** synth coherence | PASS | No "Clause 2", "clause-2", "clause 4" or "five-clause" remains; `command grep -i clause` is empty. The only "five" left is "the five subsections" in the SDR reference. The Fail-safe-serialize section is byte-verbatim. The input "Reader digest shape" gains both export fields. The T3a tokens are written in the listed case (`one merge at a time`, `owner's file wins`, `never by the Developer`). |

## Per-file counts (solo, `npm run test:file -- <file>`, from `<cw>`)

**Make-green set**

| File | Red commit (ac491a6) | Now |
|---|---|---|
| `test/scripts/waves-json-v2.red.node.test.ts` | 4/7 | **7/7** |
| `test/docs/contract-first-dag-text.red.node.test.ts` | 3/10 | **10/10** |
| `test/scripts/init-sprint-waves-v2.red.integration.node.test.ts` | 0/1 | **1/1** |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` (compare, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 0/5 | **5/5** |
| `test/commands/init-host-parity.red.integration.node.test.ts` (same env) | 0/15 | **15/15** |

The baseline was read-only. Its 425-file sha fingerprint was `549dcde034db874f` both before and after the pair, and `find -newer <marker>` returned nothing. I never captured.

**Red proof.** I never stashed. The red state at `ac491a6` is QA-Red's re-seal measurement, `reports/CR-124-qa-red-reseal.md`. The test bytes are unchanged since then: my commit touches no `test/**`.

**§7.4 anchors (all at the expected counts)**

bug-033-collision-surface-failsafe 7/7 · collision-surface-planning-workflow 15/15 · wave-execution-barrier 23/23 · bug-034-flashcard-gate-restore 5/5 · parallel-dispatch 6/6 · skill-md-consolidation-d5 18/18 · skill-md-conditional-architect 18/18 · autonomy-contract 30/30 · test-layers-declared-doctrine 11/11 · enforcement-doc-coherence 26/26 · enforcement-section-13 11/11 (after `npm run prebuild && npm run build` in `<cw>`) · gate-section-index-pinning 14/14 · new-command 57/57 · clean-room-evidence 60/60 · no-execution-mode-vocabulary 9/9 · no-exec-mode-vocab 4/4 · no-inline-id-regex 7/7.

**Rule 16: every `CLEARGATE_META_ROOT`-honouring test, run without the override (the default resolves to `<ow>`)**

new-command 57/57 · no-exec-mode-vocab 4/4 · claude-md-block-leads-relocation 4/4 · clean-room-verification-doc 9/9 · contract-first-dag-text 10/10 · test-layers-declared-doctrine 11/11 · frontmatter-authoring (integration) 9/9 · spidr-coverage (integration) 1/1 · hook-signal (integration) 3/3 · hook-signal 14/14 · pre-tool-use-task 13/13 · token-ledger-attribution 9/9 · token-ledger-regression 14/14 · readiness-predicates-spidr-coverage 32/32 · readiness-predicates-test-layers-declared 17/17 · enforcement-doc-coherence 26/26 · file-surface-gate-e2e 21/21 · pre-commit-downstream-safe 12/12 · ratchet-retired 8/8 · close-sprint-assume-ack-guard 20/20 · scaffold-relocation 15/15 · bucket-registry-parity 11/11. (`test/helpers/scaffold-roots.ts` is a helper, not a test.)

**The TPV's extra rule-16 readers of the 7 rels**

init 29/29 · uninstall 20/20 · run-id-ledger-attribution 10/10 · scaffold-layout 18/18 · status-vocab-phase-b 75/75 · template-stubs (integration) 50/50 · code-map-integration 8/8.

**Other checks**

- `npm run typecheck`: clean (exit 0).
- `node scripts/check-no-exec-mode-vocab.mjs`: exit 0.
- `node scripts/check-no-inline-id-regex.mjs`: exit 0.
- `node scripts/build-codex-payload.mjs --check`: **N/A**. The script is absent at base `35580b0` (-10 adds it), and §7.4 gates this check "once -10 has merged into CR-124's tree". No TOML staleness can arise: `scaffold/hosts/codex/` does not exist in this tree.

## Named reds (integration tier, not in `npm test`)

| Test | Result | Why | Clears at |
|---|---|---|---|
| `test/scaffold/sprint-execution-mirror.integration.node.test.ts` | 3/4 | "diff command on live vs canonical returns empty output": live `SKILL.md` ≠ canonical (RP-A27) | RS-CR |
| `test/integration/foreign-repo.integration.node.test.ts` | 4/6 | Pre-existing and unrelated. `:215` `assert.strictEqual(typeof manifest['cleargate_version'], '<msg>', 'string')` has its arguments swapped (actual `'string'` vs expected the message) | never, via CR-124 |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 10/11 in the worktree | **5d**, not 5c. Live `/.claude/hooks/token-ledger.sh` byte-equals cli `main`'s canonical (`git show main:… \| cmp` = 0), which is -10's M5-A24 `--host` parser re-synced at RS-4a. This worktree's base `35580b0` predates -10, and CR-124 did not touch the file. **5c** (agents) returns early inside a worktree (`isWorktree()`), so its RP-A27 red shows only in the merge lane. | 5d at integration (`merge main`); 5c at RS-CR |

## Twin `cmp` results (after the commit)

```
cmp 0: .cleargate/knowledge/cleargate-enforcement.md
cmp 0: .cleargate/scripts/launch_wave.mjs
cmp 0: .cleargate/templates/Sprint Plan Template.md
```

## Git statuses (after the commit)

```
$ git -C <cw> status --porcelain
(empty)

$ git -C <ow> status --porcelain
 M .cleargate/knowledge/cleargate-enforcement.md
 M .cleargate/scripts/launch_wave.mjs
 M ".cleargate/templates/Sprint Plan Template.md"

$ git -C /Users/ssuladze/Documents/Dev/ClearGate status --porcelain
 M .cleargate/delivery/pending-sync/{30 files: BUG-071..078, BUG-085, BUG-089, CR-118, CR-119, CR-124, SPRINT-41, STORY-031-03..05, STORY-058-01..13}
 M .cleargate/sprint-runs/SPRINT-41/{.session-totals.json,events.jsonl,state.json,token-ledger.jsonl}
```

Where the outer main checkout's changes come from:

- **The 30 delivery files are not from this dispatch.** Each changes one `parent_cleargate_id: null` into the quoted `parent_ref`: 30 files, +38/−38 lines. That is the rule-14 back-sync of a concurrent merge-lane full `npm test`: PID 56285, `tsx --test … test/admin-api/…`, cwd the cli main checkout, started 19:26:01; the files' mtime is 19:27:54. The same set was already `M` in this session's start snapshot.
- **The merge lane reverts them.** I did not revert them: they are the merge lane's to revert, and reverting would race a live run.
- **My runs never wrote there.** All my targeted runs ran from `<cw>`, whose back-sync target `<ow>` holds only the 3 twins.
- **The 4 sprint-runs files are hook-owned.**
- **Nothing to revert in `<ow>`.** No `<ow>/.cleargate/delivery` back-sync happened.

I did not edit, test or check out anything in the cli main checkout. I did not touch live `/.claude/**`, and ran no bare `cleargate`, no `npm install` and no stash.

## Script Incidents

- `.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260926T151729Z-e444b3d67b99.json`: `bash <ow>/.cleargate/scripts/test/cr078_init.test.sh` exited 1 with 38 passed and 1 failed. The failure is the named pre-existing `SAFETY VIOLATION: real repo .active clobbered! expected SPRINT-34, got ''` (flashcard 2026-08-29). It is expected. It is run from the outer twin because the canonical nested copy's `REPO_ROOT` math assumes depth 3 (QA-Red deviation 2).

## Structured handoff

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # only real collisions serialize — synth §Real-collision predicate (T2)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # contract step — synth §Contract formation + SKILL §C.0.2 rule 2 (T2, T3a)
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # parallel build from base — storyBases + launchWave bases (W3, W4, W4b)
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # integration by DAG — integrationReady (W5) + SKILL rule 4 (T3a)
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # serial merges + re-sync — SKILL rule 5 (T3a)
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # QA-Red-only re-scope — SKILL rule 6 (T3a)
  - { r_id: "R7", covered: true, deferred: false, clarified: false }   # waves.json schema_version 2 additive — synth shape (T2), init_sprint v1/v2 (W1, W2, integration)
  - { r_id: "R8", covered: false, deferred: true, clarified: false }   # E2E: §4 contract-first ledger rows — orchestrator/Reporter at merge and close
  - { r_id: "R9", covered: false, deferred: true, clarified: false }   # integrate step + codex TOML regen (Task Breakdown row 6) — rule 21, later
  - { r_id: "R10", covered: false, deferred: true, clarified: false }  # RS-CR live re-sync (Task Breakdown row 7) — merge lane
plan_deviations:
  - { what: "K1 measured from ac491a6", why: "TPV wrote K1 as dbd002f..HEAD before the re-seal commit ac491a6 existed; ac491a6..HEAD is exactly the 8 files", orchestrator_confirmed: false }
  - { what: "Task Breakdown boxes not ticked", why: "the dispatch requires <ow> to hold exactly the 3 twins and forbids delivery edits; rows 2-5 are done and are for the orchestrator to tick", orchestrator_confirmed: false }
  - { what: "architect-reader Workflow step 5 added", why: "tells the reader where exports_provided/exports_consumed come from (§3/§3.3); inside the allow-listed file, not pinned by §7.2", orchestrator_confirmed: false }
  - { what: "synth 'Your one job' + Wave Assignment example row reworded", why: "'collision-free wave assignment' and 'disjoint file surfaces' contradict the new predicate; wording only", orchestrator_confirmed: false }
  - { what: "SKILL §C.0.2 rule 2 adds the frozen-export change rule", why: "one sentence from replan §2 (record the new SHA in sprint §4; consumers pick it up at integration)", orchestrator_confirmed: false }
  - { what: "named red is canonical-live-parity 5d in the worktree, not 5c", why: "5c skips in worktrees; 5d is base lag (live token-ledger.sh = main post -10); 5c goes red only in the merge lane until RS-CR", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/test/helpers/init-fixture.ts"                                        # integration tail conflict vs main (row-level resolve)
  - "cleargate-cli/test/scaffold/sprint-execution-mirror.integration.node.test.ts"      # red until RS-CR
  - "cleargate-cli/test/scaffold/canonical-live-parity.red.integration.node.test.ts"   # 5c red in the merge lane until RS-CR
  - "cleargate-cli/scripts/codex-sprint-execution.mjs"                                  # -12 renders SKILL.md; §A.4 has no banned tokens
  - "cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml"                   # regenerate at integration if -11 merges first
  - "cleargate-cli/scaffold/core/.cleargate/scripts/init_sprint.mjs"                    # reads lane_assignments only; unchanged
  - ".claude/agents/architect-synth.md"                                                 # live; doctor drift x4 until RS-CR
flashcards_flagged:
  - "2026-09-26 · #test-harness #worktree · canonical-live-parity 5c returns early in a worktree (isWorktree); agent drift is red only in the merge lane."
  - "2026-09-26 · #worktree #test-harness · Worktree on an old base reds canonical-live-parity 5d once live hooks re-sync from newer main; base lag, not a regression."
```

**Follow-up for post-flight (not a deviation).** The `node launch_wave.mjs` usage line at the file tail still names only the four original exports, not `storyBases` or `integrationReady`. §7.2 does not pin it. I left it alone to avoid overlapping -12's `launch_wave.mjs` edits.
