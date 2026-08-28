# STORY-054-06 — Architect Post-Flight

role: architect

**Under review:** cli `a7f1c66` · outer `33c56974`, both on `story/STORY-054-06`. Main checkout, no
worktree. Reviewed 2026-08-28.

**Preflight read:** `sprint-context.md` (Goal / Locked Versions / Test Stack / Cross-Cutting Rules 1-6
/ Active FLASHCARD Tags / Adjacent Implementations / Mid-Sprint Amendments) · the story file
**including `§3.1 AMENDMENT`** · `plans/M2.md` N1-N7 + the 054-06 blueprint + the
`> **TPV RULING — STORY-054-06**` block · `STORY-054-06-{qa-red,tpv,dev,qa}.md` · FLASHCARD lines
tagged `#gate` and `#test-harness` (46 cards grepped; cards 13, 15-19, 26, 30, 37, 39 bear on this
story and are cited inline below).

**Concurrency compliance:** no `cleargate wiki` command was run; `wiki/index.md` was not read; no
`EPIC-058_*`, `wiki/epics/EPIC-058.md`, `wiki/{index,log,product-state,roadmap}.md`,
`.session-totals.json.tmp.*` or `cleargate-planning/MANIFEST.json` was read as sprint input, edited,
reverted or staged. Nothing was committed. Three files written: this report, an append to
`plans/M2.md`, and `BUG-058`.

---

```
POSTFLIGHT: pass

END_TO_END: Works, all three types, verified by execution — not by reading. An author opens
  .cleargate/templates/story.md and sees `## Task Breakdown` at heading position 4 (immediately
  after §3 The Implementation Guide, immediately before §4 Quality Gates) carrying a five-line
  `> `-prefixed guidance block that states the L3/L2/L1 rule, the absence-passes rule, and the row
  grammar. Measured with the rebuilt `cleargate-cli/dist/cli.js` on three real instances built from
  a live in-flight story: (a) shipped section untouched, zero rows -> `exit 1`,
  "❌ task-breakdown-complete: ## Task Breakdown is present but carries no `- [ ]` task rows";
  (b) section deleted entirely (the L1 route, R5) -> `exit 0`, "✅ story.ready-for-execution passed
  (12 criteria)"; (c) one `- [ ] … -> R5` row written -> `exit 0`, 12 criteria. Same three
  behaviours confirmed on a CR instance (`cr.ready-to-apply`) and a Bug instance
  (`bug.ready-for-fix`). The section-absent detail reads `not-applicable: ## Task Breakdown section
  absent`. Strongest single datapoint: BUG-058 — the defect this review filed — was authored from
  the shipped Bug.md, carries 6 real task rows, and passes `bug.ready-for-fix` (7 criteria) with
  `task-breakdown-complete: ## Task Breakdown has 6 task rows`. The surface works on a real work
  item, end to end, first try.

  FIRST FRICTION, and it is not the section: `which cleargate` -> /opt/homebrew/bin/cleargate, a
  real global install of 0.24.2. It reads this repo's updated readiness-gates.md and has no parser
  branch for the new criterion, so `cleargate gate check <any Story|CR|Bug>` now prints
  "❌ task-breakdown-complete: predicate error: Error: unsupported predicate shape:
  task-breakdown-complete" — measured identically on all three variants above, including the
  correctly-authored one. The message is wrong in the sense that matters: it is the same on a
  perfect item, an empty-section item and a legacy item, so it carries zero signal and points at
  nothing the author can fix. N6 was correct and was executed (dist rebuilt 12:14, contains the
  predicate, hooks prefer it at stamp-and-gate.sh:12-13), but N6 reasoned only about the hook path;
  the human's PATH path was never in scope. SKILL.md:128 tells the orchestrator to run
  `cleargate gate check <file> -v` on a preflight failure, which is the most likely way this gets
  hit. Second friction, quieter and worse: a heading typo silently PASSES — see WAVE_7_CONTRACT.
  Operator instruction: for the rest of this sprint use `node cleargate-cli/dist/cli.js gate check
  <file>`, never the bare `cleargate` binary, in this repo. No script is affected (zero
  `npx cleargate` / `command -v cleargate` gate calls under .cleargate/scripts/**); end-user
  installs are unaffected because payload and binary ship in the same npm version. Closes when the
  next cleargate is published and reinstalled globally — a Gate-4 item, not a story defect.

ENFORCING_IMPACT: ZERO of the 11 remaining sprint items is re-gated to failure. Measured, not
  reasoned: every one of the 11 (STORY-054-07 · BUG-043/044/045/046 · CR-105/106/107/108/110/111)
  was evaluated with the real exported evaluate() against BOTH registries — the pre-commit one
  (`git show 33c56974^:.cleargate/knowledge/readiness-gates.md`) and the shipped one — over its
  full criteria list. Result: 11/11 PASS before, 11/11 PASS after. No item flips, no criterion
  flips. Two structural reasons: (i) `task-breakdown-complete` passes on absence and 0 of the 231
  authored stories — and none of the 11 — carries the heading; (ii) the only index that moved,
  `dod-declared` section(4)->section(5), touches the `story` block only, and exactly ONE of the 11
  is a Story. The 4 Bugs and 6 CRs are index-untouched: `bug.repro-steps-deterministic` is
  section(2) and `cr.blast-radius-populated`/`cr.sandbox-paths-declared` are section(3)/section(6),
  none of which the CR.md/Bug.md insertions (positions 7 and 5) disturb — N4/P2/P3 re-confirmed on
  the shipped files.

  So: NO in-flight item fails a `cleargate gate check` today that passed this morning — PROVIDED
  the check runs through `node cleargate-cli/dist/cli.js`. Through the global `cleargate` binary,
  ALL ELEVEN now report `predicate error: unsupported predicate shape` where they were clean this
  morning. That is the answer to "what bites in the next 24 hours", and it is a binary-staleness
  artifact, not a gate change.

  OPERATOR INSTRUCTION (three lines, verbatim into the wave7 dispatch and the sprint log):
    1. Use `node cleargate-cli/dist/cli.js gate check <file>` for every gate check in this repo
       until a cleargate newer than 0.24.2 is published and globally reinstalled. `cleargate gate
       check` is stale-binary and will report a predicate error on every Story/CR/Bug.
    2. Nothing needs re-gating and nothing needs editing. All 11 remaining items pass unchanged.
    3. Newly SCAFFOLDED items are a different case and are the intended teeth: any Story/CR/Bug
       drafted from the template after this merge hard-fails `task-breakdown-complete` until the
       author writes rows or deletes the section (both routes printed in the section's own
       guidance block). This lands on CR-108 (wave12), which generalises the scaffold to all types
       — cross-story risk 6 in the M2 plan already flags it and it now has a measured message.

VOCAB_DEFECT: CONFIRMED independently, and filed as BUG-058
  (.cleargate/delivery/pending-sync/BUG-058_Predicate_Vocabulary_Omits_Marker_Absence.md).
  Re-derived from source, not from QA's report: `ParsedPredicate`
  (readiness-predicates.ts:14-25) has 11 members; readiness-gates.md:9 declares "exactly 10
  predicate shapes" and prints exactly 10 numbered entries (:11 :24 :27 :38 :41 :44 :47 :50 :53
  :56). The missing member is `marker-absence` (:16), parser branch 2a (:61-68), dispatched at
  :173-174, evaluated by evalMarkerAbsence (:581-636). `git log -S"marker-absence"` -> 3f2011c,
  Sun Apr 26 19:35:48 2026, "fix(BUG-008): SPRINT-14 M2 — gate criteria over-match". Both trees
  affected (live and canonical readiness-gates.md are byte-identical).

  QA's trace is right and understates it. The gap is SUBSTANTIVE, not cosmetic: `marker-absence`
  backs 10 of the registry's 66 criteria — every `no-tbds`, one per gate block — and its matcher is
  a syntactic-role matcher, not a substring search. Vocabulary entry 2's only worked example says
  "`body does not contain 'TBD'` fails if the literal string TBD appears anywhere in the body",
  which is true of `body-contains` and false of the shape the registry actually uses. Measured on
  one identical body ("The estimate is TBD pending measurement."): marker form ->
  {"pass":true,"detail":"no 'TBD' markers found in body"}; plain form ->
  {"pass":false,"detail":"1 occurrence at §2"}. Same string, opposite verdicts, and the documented
  one is the unused one. Not this story's fault, not a kick-back: 054-06's docstring correction
  (stale 6 -> true 11) is what made the count visible for the first time in four months. The
  Developer's PLAN DEVIATION (writing 11 where the plan said 10) was arithmetically correct and
  should stand; the residual 11-vs-10 disagreement between the docstring and the vocabulary is
  BUG-058's, not the story's.

POSTMERGE_BLOCK: The coupling is REAL. The BLOCKING is NOT — TPV R10 and this plan's N7 are both
  wrong on the mechanism, and M1 plan R17 (M1.md:688) already had it right.
  What is real: Scenario 7 of readiness-predicates-task-breakdown.red.node.test.ts reads
  `resolve(CLI_ROOT,'..')/cleargate-planning/.cleargate/templates/story.md` — the OUTER working
  tree, by filesystem path, at run time — and asserts pass === false. Reproduced with the real
  evaluator against both historical blobs: the pre-054-06 canonical story.md returns
  {"pass":true,"detail":"not-applicable: ## Task Breakdown section absent"} => Scenario 7 RED; the
  shipped one returns {"pass":false,...} => GREEN. So cli main's greenness depends on which branch
  the single outer checkout is sitting on. New instance of FLASHCARD 2026-08-27
  `#test-harness #cross-repo #danger`.
  What is NOT real: "every outer commit ... is blocked". `.cleargate/config.yml:26`'s
  `gates.precommit` is NOT executed by git. The installed hook is .git/hooks/pre-commit ->
  .claude/hooks/pre-commit.sh, a dispatcher over `pre-commit-*.sh` in that directory; exactly one
  file matches, pre-commit-surface-gate.sh, which runs the CR-043 red-test immutability check,
  check:no-vitest, check:no-inline-id-regex and then `exec file_surface_diff.sh`. It never invokes
  the cli suite. pre_gate_runner.sh reads qa.typecheck / qa.test / arch.typecheck (:81 :186 :207),
  none of which this repo's config defines. The Developer's SURPRISE (1) is confirmed. N7's "the
  order is self-enforcing" is therefore false — the cli-first ordering held because the Developer
  followed TPV R6, not because a hook forced it.

  (a) DEVOPS, merging this story: merge BOTH repos in one operation — cli `story/STORY-054-06` ->
      cli `main` (cli has no sprint branch; 054-02 merged straight to main at 507f67c) AND outer
      `story/STORY-054-06` -> `sprint/S-39`. Never outer-only: that leaves sprint/S-39's registry
      naming a predicate cli main cannot parse, which reds `gate-unit` ("all criterion check
      strings ... parse") and `readiness-predicates` ("every criterion.check parses") for the next
      dispatch that runs the suite. Note cleargate-planning/MANIFEST.json is already dirty and
      already regenerated by the concurrent session — coordinate before staging it; it is
      whitelisted (surface-whitelist.txt:12) and remains a post-merge action.
  (b) WAVE 7: branches cut from sprint/S-39 contain 33c56974, so canonical story.md carries the
      section and Scenario 7 is green. No action. One constraint: the wave7 Developer must keep the
      outer checkout on the story branch while running the cli suite. Running it with the outer
      checkout parked on main produces exactly 1 spurious failure.
  (c) OUTER MAIN until sprint/S-39 merges: main (4b171393) lacks the section, so any cli suite run
      from an outer checkout on main shows 1 failure — Scenario 7, and only Scenario 7. Expected,
      not a regression, read against the TPV report §T5 table. Merge sprint/S-39 to main promptly
      at close to shut the window.
  FORBIDDEN, unconditionally: "fixing" that red by editing Scenario 7. It is the sole non-vacuity
  pin on task-breakdown-complete (M2 plan addition #7, QA kick-back #7); weakening it re-opens the
  BUG-054 shape the criterion exists to prevent. Same prohibition as TPV R10 — the prohibition is
  right even though its stated mechanism is not.

WAVE_7_CONTRACT: The heading string is `## Task Breakdown` — exact, unnumbered, H2. Measured
  against the shipped predicate, one row per variant (body carrying one `- [ ]` row):
    ## Task Breakdown              -> MATCHES  "## Task Breakdown has 1 task row"
    ## 3.5 Task Breakdown          -> MATCHES  (numeric prefix stripped by headingTitleOf)
    ## 9. Task Breakdown           -> MATCHES
    ##  Task Breakdown (2 spaces)  -> MATCHES
    ## Task breakdown              -> SILENT MISS ("not-applicable: ... absent", pass:true)
    ## Tasks                       -> SILENT MISS
    ## Task Breakdown (optional)   -> SILENT MISS
    ### Task Breakdown             -> SILENT MISS
  Every miss reads as a PASS. There is no failing message to notice — the decoupling is invisible.
  054-07's three agent paragraphs must quote `## Task Breakdown` verbatim.
  Row grammar: `- [ ]` / `- [x]`, counted WITHIN the located section only (never over doc.body —
  independently probed: rows under `## 4. Quality Gates` do not satisfy an empty Task Breakdown
  section). Indented and fenced rows DO count (TPV R9). Optional trailing `-> <requirement-id>`,
  accepted and not interpreted (probed: detail never mentions the reference).
  Detail strings, verbatim, for anything that greps them:
    "## Task Breakdown has N task row(s)"
    "## Task Breakdown is present but carries no `- [ ]` task rows"
    "not-applicable: ## Task Breakdown section absent"
  Also fixed by this story and not to be re-litigated by 054-07: the R3 `<instructions>` sentence is
  already present in all three templates, identical, one per file. 054-07's §2.1 scenario-4 negative
  assertion has a measured baseline — `grep -n "Task Breakdown" .cleargate/templates/*.md` returns
  exactly 6 lines: story.md:7, CR.md:8, Bug.md:8 (the instructions sentence) and story.md:181,
  CR.md:114, Bug.md:102 (the headings). Anything beyond those six is a scenario-4 violation.
  Severity is `enforcing` on all three blocks (inherited, not chosen — M2 §Open decisions #3), so
  054-07's qa.md paragraph must still carry the literal word "advisory" and say it does not bounce:
  the AGENT contract is advisory, the GATE criterion is not, and conflating them is the one way
  054-07 can contradict this story.

PAYLOAD_TEETH: qa.md IS in sync right now, and 054-07's parity check still bites. Measured:
  cleargate-planning/.claude/agents/{architect,developer,qa}.md are byte-identical to BOTH the npm
  payload (cleargate-cli/templates/cleargate-planning/.claude/agents/*.md) and the live
  .claude/agents/*.md — 9 diff -q comparisons, all silent. The payload qa.md is dated Aug 28 12:31,
  i.e. the concurrent session's prebuild regenerated it today. Teeth intact and unchanged:
  readme-qa-doc-truth-043-06.red.node.test.ts re-run now -> 18 pass / 0 fail / 0 skipped, and its
  s5_b/s6 assertions compare canonical vs payload AT RUN TIME, so the moment 054-07 edits canonical
  qa.md without re-running the copier they go 2-red exactly as the M2 plan measured. 054-07's
  §Blast radius stands as written.
  Both of B3's rules still hold, and one plan fact is now stale:
   - `node cleargate-cli/scripts/copy-planning-payload.mjs` remains correct and `npm run prebuild`
     remains forbidden — confirmed from source: prebuild = `tsx scripts/build-manifest.ts && node
     scripts/copy-planning-payload.mjs`, and build-manifest.ts writes the TRACKED
     cleargate-planning/MANIFEST.json.
   - MANIFEST.json is currently modified in the outer working tree (7 rows: generated_at +
     SKILL.md, cleargate-protocol.md, readiness-gates.md, Bug.md, CR.md, story.md) and already
     carries 054-06's SHAs. It is in NEITHER of this story's commits, which is correct. No default-
     suite test asserts MANIFEST freshness (test/scripts/build-manifest.node.test.ts compares no
     SHA to disk), so 054-07 editing canonical qa.md without regenerating MANIFEST reds nothing.
   - STALE, and worth correcting in the plan: the M2 §Blast radius row "canonical != payload today
     (from 054-03), no test sees it" is no longer true — the same prebuild brought the four 054-06
     files' payload copies into sync as well. Gate-4 obligation #2 is already satisfied for them.

GOAL_ADVANCE: Ships the sprint goal's second clause — the Task Breakdown section now exists in
  Story, CR and Bug with a machine-checkable criterion behind it — and is the first and only
  consumer of the third clause's repair, passing a heading insertion through BUG-042's corrected
  indices and STORY-054-05's pin with zero fixture edits and zero item-level gate regressions.

SCOPE: Clean. Outer 33c56974 stages exactly 8 files — .cleargate/templates/{story,CR,Bug}.md,
  .cleargate/knowledge/readiness-gates.md and their four cleargate-planning/ mirrors — which is
  §3.1's declared outer surface, exactly, with nothing added. cli a7f1c66 stages exactly 2 —
  src/lib/readiness-predicates.ts and test/lib/readiness-predicates-prior-work-ambiguity.node.test.ts
  — both rows 1 and 3 of the §3.1 AMENDMENT; row 2 (the new red test) was committed by QA-Red at
  c9d44ba/e9c780f and is untouched by the Developer (git diff e9c780f..a7f1c66 on that path is
  empty). Zero archived items modified. Zero `cleargate-cli/templates/cleargate-planning/**` in
  either commit. Zero new SPRINT-<digits> literal in either commit. evalSection frozen: the 5 hunks
  in the readiness-predicates.ts diff are at pre-image lines 1 / 20 / 131 / 180 / 1114-end, none
  inside 632-657, and the string "evalSection" appears zero times in the branch diff.
  UNDECLARED FILES: none attributable to this story. The outer working tree is dirty with three
  things that are NOT 054-06's and were not touched: (i) the concurrent session's EPIC-058 files,
  wiki pages and .session-totals tmp; (ii) cleargate-planning/MANIFEST.json (regenerated 12:31 by
  that session's prebuild — whitelisted, DevOps post-merge, coordinate before staging);
  (iii) a `sprint_cleargate_id: null -> "SPRINT-39"` one-line backfill in 7 pending-sync items
  (BUG-047/048/049/050, CR-109, EPIC-055, EPIC-057) — a backfill_hierarchy run, unrelated to this
  story, pre-existing this review.

REPRODUCED: Everything load-bearing was re-run; nothing was taken from the Dev or QA reports.
  1. Registry differential — `git show 33c56974^:` vs `33c56974:` on readiness-gates.md: exactly 4
     changes (9->10 shape count, entry 10, dod-declared section(4)->section(5), three identical
     two-line criterion appends). No other section(N) moved.
  2. Full before/after gate evaluation of all 11 remaining sprint items with the real exported
     evaluate() against both registries -> 11/11 PASS both ways.
  3. Corpus scan of all 231 authored STORY-*.md: 0 carry a Task Breakdown heading; section(4)
     resolved to "## 4. Quality Gates" in 209/231; section(5) resolves to it in 1/231.
  4. dod-declared false-pass demonstration on STORY-054-07 with the DoD section fully gutted ->
     section(5) still {"pass":true,"detail":"section 5 has 5 listed-item"} (counting Existing
     Surfaces); section(4) correctly {"pass":false}.
  5. End-to-end `gate check` on three story variants + one CR + one Bug via the rebuilt dist, and
     the same three via the global 0.24.2 binary (predicate error on all three).
  6. Scenario 7 mechanism reproduced against both historical canonical story.md blobs.
  7. Hook chain read end to end: .git/hooks/pre-commit symlink -> pre-commit.sh dispatcher ->
     `ls .claude/hooks/pre-commit-*.sh` = one file -> its full body. Plus pre_gate_runner.sh's
     read_config_field call sites.
  8. Heading-variant battery (8 forms) against the shipped predicate.
  9. marker-absence differential: parsePredicate on both forms + evaluate on one identical body;
     `grep -c` of the marker form in the registry (10) and of all criteria (66);
     `git log -S"marker-absence"` -> 3f2011c.
 10. Targeted test re-runs, all green: readiness-predicates-task-breakdown.red 10/10 ·
     gate-section-index-pinning 14/14 · readiness-predicates-prior-work-ambiguity 22/22 ·
     gate-unit 25/25 · readiness-predicates 119/119 · readme-qa-doc-truth-043-06 18/18/0skip.
     `npm --prefix cleargate-cli run typecheck` clean, exit 0. The full 2526-test suite was NOT
     re-run — QA-Verify ran it from clean in 617.7s (2526/2524/1/1, the documented pre-existing
     sync.node.test.ts network failure) and the six targeted files above cover every assertion this
     change can move.
 11. Guidance-block invariants on all 6 template files: 0 line-initial bullets, 0 fences, 0
     non-blockquote lines inside the section.
 12. Nine canonical/payload/live diff -q comparisons on the three agent files; MANIFEST.json git
     diff; prebuild script definition read from package.json.
 13. Global binary identity: `which cleargate` + `npm ls -g --depth=0` -> real install of 0.24.2,
     not a link. `dist/cli.js` contains the predicate (node fs.readFileSync().includes(), not grep
     — FLASHCARD 2026-08-28 #test-harness #gate #danger), mtime 12:14 > commit A 12:13:13.

FINDINGS:
  1. N7 and TPV R10 both assert that .cleargate/config.yml:26 makes the outer git pre-commit run
     the cli suite. It does not — the installed hook chain is one file and it runs no tests.
     M1 plan R17 had this right; M2 regressed it. The cli-first ordering was correct anyway, by
     Developer discipline. Not a story defect; a plan-text defect, corrected in the M2 append (P1).
  2. Scenario 7 makes cli main's greenness depend on the outer checkout's branch. Real, scoped in
     POSTMERGE_BLOCK, unfixable without weakening the only non-vacuity pin — so it is accepted
     with an operator instruction, not repaired.
  3. The global cleargate 0.24.2 binary now reports `predicate error: unsupported predicate shape`
     on every Story/CR/Bug in this repo, including correctly authored ones. N6 covered the hook's
     dist path and nothing covered PATH. Highest-probability human friction in the next 24 hours.
     Workaround is one command; permanent fix is the next publish + global reinstall.
  4. `story.dod-declared` resolved to the real DoD section in 209/231 authored stories before this
     commit and in 1/231 after. Zero item-level verdict flips (N5 confirmed), but the criterion now
     measures `## Existing Surfaces` on 76 items and an Ambiguity Gate on 104 — and gutting a
     story's entire DoD leaves it green. Accepted (R4 is approved scope, the pin is against the
     template, FLASHCARD 2026-08-27 already names the class) but this is the strongest evidence yet
     for M2 §Open decisions #4: re-express dod-declared and the other eight vacuous positional
     criteria as heading-anchored named predicates. That CR should be filed, not left a candidate.
  5. A misspelled or suffixed heading (`## Tasks`, `## Task breakdown`, `## Task Breakdown
     (optional)`, `### Task Breakdown`) passes silently as "absent". Correct behaviour for the
     absence rule, but it means 054-07 has no safety net on the string — hence WAVE_7_CONTRACT.
  6. BUG-058 filed: 11 union members vs 10 documented shapes; the undocumented `marker-absence` is
     the shape 10 of 66 criteria use, and entry 2's worked example describes a matcher no criterion
     has. Pre-existing since 3f2011c (2026-04-26). Not a kick-back.
  7. Small, real, and worth one sentence in the sprint report: the `no-tbds` criterion makes the
     five literal marker forms unwritable inside a work item — BUG-058 failed its own gate on the
     first draft for spelling them out, and had to describe them with a `<MARKER>` placeholder.
     A documentation defect that is partly self-inflicted by the gate that depends on it.

FLASHCARDS (proposed — NOT written; FLASHCARD.md is dirty from the concurrent session, and this
dispatch's write budget is report + M2 append + defect file. Append these at close):
  - 2026-08-28 · #gate #cross-repo #danger · `.cleargate/config.yml` `gates.precommit` is NOT run by
    git — the installed outer hook chain is one file (pre-commit-surface-gate.sh: red-gate,
    no-vitest, no-inline-id-regex, file_surface_diff.sh). Any plan claiming "the hook runs the suite"
    is wrong; two-repo commit order is discipline, not enforcement. [SPRINT-39 STORY-054-06]
  - 2026-08-28 · #gate #readiness-gates #danger · Measured: shifting `dod-declared` section(4)->
    section(5) kept it correct for the TEMPLATE and broke it for the CORPUS — 209/231 authored
    stories resolved to "## 4. Quality Gates" before, 1/231 after. Zero item-level flips, so nothing
    goes red; the criterion just silently reads `## Existing Surfaces` instead. Fixture pinning
    cannot see this: it pins the template. [SPRINT-39 STORY-054-06 post-flight]
  - 2026-08-28 · #gate #dogfood #danger · Adding a predicate ships it in TWO binaries, not one.
    Rebuilding `cleargate-cli/dist/cli.js` fixes the hooks (stamp-and-gate.sh prefers it), but a
    globally installed `cleargate` still reads the repo's new registry with an old parser and prints
    `predicate error: unsupported predicate shape` on EVERY item of that type — identical message on
    a perfect item and a broken one. [SPRINT-39 STORY-054-06]
  - 2026-08-28 · #gate #dx · A heading-anchored predicate misses SILENTLY: `## Tasks`,
    `## Task breakdown` and `## Task Breakdown (optional)` all return pass:true "section absent".
    Any prompt or doc that names the section must quote the heading verbatim — there is no failing
    message to catch a typo. [SPRINT-39 STORY-054-06]

SCRIPT INCIDENTS: none. No script was invoked through run_script.sh during this dispatch; all
  measurement was direct read-only execution (git show, tsx against the real exported evaluator, the
  rebuilt dist CLI, and targeted node:test runs). No repo write outside the three files named above.
```

---

## Recommendation

**Proceed to DevOps merge.** Carry POSTMERGE_BLOCK (a)/(b)/(c) into the DevOps dispatch verbatim,
and ENFORCING_IMPACT's three operator lines into the wave7 dispatch. The M2 plan now carries a
`POST-FLIGHT RULING — STORY-054-06` block (P1-P7) with the same content in plan form; after the
merge, port P4's corpus numbers and P5's literal contract into `sprint-context.md` §Adjacent
Implementations as "facts downstream Developers must NOT re-derive", as was done for 054-01/04/05.
