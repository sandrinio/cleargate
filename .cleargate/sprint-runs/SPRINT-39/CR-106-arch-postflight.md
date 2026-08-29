# CR-106 — Architect Post-Flight

role: architect · Mode: POST-FLIGHT · SPRINT-39 · wave 11 · M4
Commit under review: `d6edc45d` on `story/CR-106`, worktree `.worktrees/CR-106`, branched from `a9304776`.
Sprint tip at review time: `56eae83d` (`sprint/S-39`).

---

## VERDICT: **KICK-BACK**

One defect. It is bounded, it sits entirely inside the item's already-declared surface, and the
fix is smaller than this paragraph. **Everything else in this commit passes** — the two-tree
parity, the byte-compatibility of the fold against the live sprint's own `state.json`, the
retained lock, the `atomicWrite` relocation, the barrier, the cli-suite blast radius, and
Cross-Cutting Rule 4 — all verified by measurement below. Re-dispatch is narrow.

### The defect

> **`update_state.mjs` overwrites `state.json` with `fold(readEvents(eventsFile))` unconditionally
> (`:427-428`), with no floor check that the folded story set still covers the story set on disk.
> A present-but-incomplete `events.jsonl` therefore silently deletes stories from `state.json`
> and exits 0 with a success message.**

Measured, against a byte-copy of the live `.cleargate/sprint-runs/SPRINT-39/state.json`
(18 stories) with a zero-byte `events.jsonl` beside it:

```
$ CLEARGATE_STATE_FILE=$SC/state.json node .cleargate/scripts/update_state.mjs CR-106 Done
Updated CR-106: state="Done"
exit=0
```

Resulting `state.json`: **1 story**. Seventeen stories deleted. Every `lane`,
`lane_assigned_by`, `lane_demoted_at`, `lane_demotion_reason` field gone from the survivor. No
stderr, no non-zero exit, no warning. The degenerate tail of the same hole is
`fold([]) → {sprint_id: null, sprint_status: null, stories: {}}` — a schema-invalid document that
`update_state.mjs` will write without complaint.

**Why this is not theoretical, and why it matters more than a hand-edit scenario.** The asymmetry
is the trap: the adoption predicate is `fs.existsSync(eventsFile)` (`update_state.mjs:337`).

- **Deleting `events.jsonl` entirely is SAFE** — genesis re-synthesises from `state.json`.
  Verified: 18 genesis events + 1 action event, diff against the pre-existing file is exactly the
  four lines a correct transition should change.
- **Truncating or partially losing `events.jsonl` is CATASTROPHIC** — genesis is skipped, the
  short log folds, and the cache is destroyed.

The first-party path that produces exactly that skew is **the CR's own named rollback**. Sequence:
merge → transitions create and commit `events.jsonl` → `git revert -m 1 <merge commit>` reverts
only the eight script files, leaving a live `events.jsonl` on disk while the old writer resumes
mutating `state.json` → the log goes stale → **re-merge, and the first transition folds the stale
log and rolls the sprint back**, deleting every transition made during the revert window, exit 0.
The rollback the human was promised as the mitigation for accepting zero soak has this in it, and
nothing in the shipped code detects it. `events.jsonl` being **neither gitignored nor whitelisted**
(F-C below) makes ordinary git skew — a commit that picks up one file and not the other — the
second route to the same place.

Cases 7 (byte-compat), 8 (vacuity mutant) and 9 (eviction) are the three mitigations the human
traded soak time for. **None of them can see this**: 7 drives both paths from the same seed, 8
asserts the fold reads nothing but the array (which is exactly what makes it blind here), 9 greps
for evicted call sites.

### Remediation — 6 lines, no new file, no surface expansion, and it makes an existing helper load-bearing

`checkFoldDrift(stateFile)` already exists, already handles the no-log skip, and is already
exported (`validate_state.mjs:146`). `update_state.mjs` already imports from `validate_state.mjs`
(`:49`). Add it to that import and call it immediately after the closed-sprint check
(`update_state.mjs:305`), before any append:

```js
const drift = checkFoldDrift(stateFile);
if (!drift.skipped && !drift.valid) {
  for (const e of drift.errors) process.stderr.write(`Error: ${e}\n`);
  process.stderr.write(
    `Refusing to fold: delete ${eventsFile} to re-synthesize genesis from state.json.\n`
  );
  process.exit(1);
}
```

This closes the truncated-log case, the revert/re-apply case, the git-skew case and the
`fold([])` case with one guard, and it uses only what this commit already wrote. It also fixes a
second thing worth saying plainly: **as shipped, `checkFoldDrift` has exactly one caller —
`validate_state.mjs`'s own CLI, which nothing automatic invokes.** The human's Open-Question
ruling was *"log wins, drift is flagged."* Right now the flag is raised in a place almost nobody
looks. Wiring it into the writer is what makes that ruling real.

Mirror byte-identically into `cleargate-planning/`. One test case in
`state-scripts.test.mjs`: seed a valid multi-story `state.json`, truncate `events.jsonl` to zero
bytes, assert exit 1 and `state.json` **unchanged on disk**.

Everything below is a forward obligation, not part of the kick-back.

---

## 1. Did the CR deliver its actual claim? (brief §3)

**Partly — and the half it did not deliver is the half TPV was worried about, in a different form
than TPV expected.**

**The write path genuinely derives.** After genesis, the on-disk `state.json` contributes **zero
bytes** to any subsequent write. `fold()` (`state-events.mjs:205-298`) takes only its array
argument — no path parameter, no env, no cwd, nowhere for a smuggled second parameter to go. The
whole document, including `schema_version` (`:291`), `last_action` (`:238/:245/:252/:262/:271`),
`updated_at` (`:296`), the `to === 'Done' ⇒ worktree = null` consequence (`:269-270`) and the
`BOUNCE_CAP` escalation (`:236`, `:243`) is reconstructed from events. `init_sprint.mjs` derives
`state.json` via `fold(genesisEvents)` (`:237`) rather than hand-assembling it in parallel. That
is real, and it is the thing the CR set out to build.

**The decision path does not.** Every value that *feeds* the next event is read from the cache,
not from the log:

| Input | Read from | Line |
|---|---|---|
| `story.qa_bounces + 1` | `doc` (state.json) | `update_state.mjs:376` |
| `story.arch_bounces + 1` | `doc` | `:389` |
| `story.state === newState` (idempotency) | `doc` | `:410` |
| `story.state === 'Escalated'` (refusal guard) | `doc` | `:372`, `:385` |
| `doc.sprint_id` / `doc.sprint_status` on every event | `doc` | `:237-238` |
| story-exists check | `doc` | `:325` |

So the honest one-line answer to the brief's question: **`events.jsonl` is the source of truth for
the OUTPUT; `state.json` is still the source of truth for the INPUT.** The consequence is that a
drifted cache is not *corrected* by the log — it is **laundered into** it. `update_state.mjs`
computes the next event from the stale value and then appends that event, making the wrong value
permanent in the file that is supposed to be authoritative. This is the same root as the kick-back
and the same guard fixes it.

**The eviction grep passes on a rename, not on an eviction.** `command grep -n
"readFileSync.*stateFile" update_state.mjs` returns 0 hits **only because the parameter was renamed
`stateFile` → `docPath`** in `readStateDocument(docPath)` (`:222-224`). The read of `state.json` at
the top of `main()` still happens on every single invocation. The commit message says this plainly
and TPV's T7 sanctioned the naming convention, so this is disclosed, not hidden — but the item's
own §4 case 9 describes the check as proving *"the read-modify-write is gone, not merely guarded,"*
and that description is now false. **Grep 2 (`atomicWrite(stateFile`) is the one that actually
proved something**: 7 call sites → 1, verified (`update_state.mjs:428` is the only one).

**Irony worth recording:** the surviving read is what saved the CR from § AMENDMENT — THE TRAP.
The harness barrier arms on `fs.readFileSync` of the state file
(`state-scripts.test.mjs:118-119`, target `CG_TEST_BARRIER_TARGET: stateFile` at `:546`, `:664`,
`:838`). Had the read genuinely been evicted, the barrier would have silently disarmed. Confirmed
armed by wall-clock: my own independent run measured **21s**, far above the sub-6s disarm tell.

---

## 2. The self-hosting hazard — traced concretely (brief §2)

### 2.1 What happens on the next transition against the live `state.json`

`.cleargate/sprint-runs/SPRINT-39/state.json`: `schema_version: 3`, `sprint_status: "Active"`,
18 stories (13 `Done`), no `events.jsonl`.

**Answer: genesis synthesis, then a normal write. Not migration, not refusal.** Traced by running
the shipped script against a byte-copy:

1. `TERMINAL_SPRINT_STATUSES.includes('Active')` → false, so the legacy-immutable refusal at
   `:300-305` does not fire. Correct — the § RESOLVED ruling keys on terminal `sprint_status`, and
   SPRINT-39 is `Active`.
2. `schema_version === 3`, so `migrateV1ToV2` is skipped and `migrateStateToV3` is a no-op.
3. `fs.existsSync(eventsFile)` → false → `synthesizeGenesisEvents(doc)` produces **18** events,
   one per story, in `Object.keys(doc.stories)` order.
4. 18 genesis appends + 1 action append → `events.jsonl` = 19 lines. Fold. Write.

Resulting diff against the pre-existing file — **exactly four lines, all of them the ones a
correct transition should change**:

```
139c139 <   "state": "Bouncing"          >   "state": "Done"
143c143 <   "updated_at": "…11:08:47.879Z"  >   "updated_at": "…13:04:12.128Z"
223c223 <   "last_action": "transition CR-107 → Bouncing"  >   "…CR-106 → Done"
224c224 <   "updated_at": "…11:08:47.997Z"  >   "…13:04:12.128Z"
```

Byte-compatibility holds on the real corpus, not just on a fixture. Key order matches exactly:
the skeleton (`state-events.mjs:188-195`) emits `state, qa_bounces, arch_bounces, worktree,
updated_at, notes` and `INITIAL_MERGE_KEYS` (`:173-182`) appends `lane, lane_assigned_by,
lane_demoted_at, lane_demotion_reason` after `notes` — which is the live file's order, exactly.

### 2.2 Does `close_sprint.mjs` still read `state.json` correctly?

**Yes for reading. No for writing, and that is finding F-B.**

Reading: `close_sprint.mjs:213` parses `state.json` into the same shape it always had; the
lifecycle reconciler and the Step 2.6d backsync consume `stories.<ID>.state`, which the fold
reproduces byte-identically (§2.1). `close_sprint.mjs:82` imports `{ validateState }` — the
function, not `checkFoldDrift` — so **close itself cannot be blocked by the new check.** Verified:
`test_close_pipeline.sh` scores `13 passed, 9 failed` in a scratch meta-root carrying the new
scripts, **identical to the same command's baseline on `sprint/S-39`**.

**F-B (forward obligation, not blocking).** `close_sprint.mjs` writes `state.json` through its own
private `atomicWrite` (`:133-137`) at three sites — `:222`, `:228` (migrations) and `:1047`
(Step 5, `sprint_status → "Completed"` + `last_action` + `updated_at`) — **entirely outside the
log**. So from now on, every sprint that closes ends with a `state.json` that no event produced.
Measured on the scratch copy:

```
$ node validate_state.mjs                 # in-sync active sprint
state.json … is valid (schema_version=3)                     exit 0

$ <simulate close_sprint Step 5>          # sprint_status -> Completed, direct write
Validation failed …:
  - state.json content differs from fold(events.jsonl) …      exit 1

$ node update_state.mjs CR-107 Done       # the remediation the error advises
Error: sprint SPRINT-39 is closed (sprint_status="Completed"); state.json is immutable  exit 1
```

Two problems, both permanent: `cleargate state validate` on any sprint closed after this ships
reports a failure forever, and **the error message's own advised remediation is refused by the same
commit's legacy-immutability guard.** A drift check whose steady-state signal on 100% of closed
sprints is red is a check that gets ignored. Nothing automatic runs `validate_state.mjs` (grep
across `.claude/hooks/`, `settings.json`, `doctor.ts` → zero hits), so this does not block Gate-4;
it is a user-facing false positive. Options for the follow-on: append a `close` event from
`close_sprint.mjs`, or make `checkFoldDrift` tolerate a terminal `sprint_status` delta. Do not
"fix" it by softening the check into uselessness.

A second, smaller consequence: `SKILL.md:266` (§C.1 Pre-execution check, *"Fail → halt"*) now runs
the drift check. That is a **new halt condition in the sprint loop**, undocumented. The safe
recovery — `rm events.jsonl`, which re-synthesises genesis from `state.json` — is verified correct
but written nowhere.

### 2.3 Rollback

`git revert -m 1 <merge commit>` in the outer repo. **Never `git reset --hard`, never force-push.**
Read the kick-back section first: the revert is safe in the revert direction and unsafe in the
**re-apply** direction until the floor check lands. If a revert happens, delete
`.cleargate/sprint-runs/SPRINT-39/events.jsonl` before any re-merge.

---

## 3. The retained lock (T3a), audited as design (brief §4)

**The critical section did not shrink. It did not move either. It is byte-for-byte the same span
as BUG-044's.**

| | BUG-044 (`a9304776`) | CR-106 (`d6edc45d`) |
|---|---|---|
| Acquire | `:216`, right after `existsSync(stateFile)` | `:274`, right after `existsSync(stateFile)` |
| Release | `process.on('exit')` registered at acquire | `process.on('exit')` registered at acquire (`:163-169`) |
| Span | read → migrate → dispatch → write | read → migrate → **genesis → append → fold** → write |

So the lock now covers *more* operations than before, not fewer — the `events.jsonl` appends
(`:424-425`) are **inside** it, not outside. That is a strict superset of the T3 ruling's stated
span (*"read-log → fold → write-cache"*) and therefore strictly safer; it is not a correctness
defect and I am not kicking back on it. But two claims are now false in prose and must not
propagate:

- The item's §1 amendment says the critical section *"shrinks from BUG-044's whole
  read-migrate-write to ~1 ms."* **It did not.** What shrank is the work inside the same span:
  seven `atomicWrite(stateFile, …)` call sites collapsed to one. The migration case does one fewer
  full-document write; the common case does the same one, plus an extra JSONL read and an extra
  append.
- The T3 ruling's own framing — mutual exclusion *around* read-log → fold → write-cache — implies a
  narrow section. What shipped is the whole of `main()`.

**Release fires on every in-lock exit path.** Verified by reading each: `process.on('exit')` runs
on `process.exit()` (which is why BUG-044 chose it over `finally`), on natural return from
`main()`, and after an uncaught throw. Every post-acquire exit — `:277, :285, :293, :304, :322,
:327, :349, :364, :374, :387, :405, :413` — plus the fall-through at `:430-431` and any throw from
`appendEvent`/`fold`/`atomicWrite` is covered. BUG-044's S4/S5 (lock-stealing semantics) are
retained and green.

**One scaling note for whoever owns the fold next:** the fold is O(events) per invocation and the
log grows monotonically across a sprint, so total work is quadratic in transition count. At
SPRINT-39's scale (19 events now, maybe 60–100 by close) this is noise. At EPIC-055's intended wave
widths it is worth a compaction story before it isn't.

---

## 4. `atomicWrite` relocation (brief §5)

**Scoping is right; nothing was left dangling.**

- `atomicWrite` moved to `state-events.mjs:90-94`, imported by `update_state.mjs:57` and
  `init_sprint.mjs:32`. It is the sole writer of `state.json` on the new path.
- **No consumer was left importing a now-absent export.** In BUG-044's file it was a *module-local*
  `function atomicWrite` (`:191`), never exported — so no external importer was possible. Confirmed
  by grep: zero `import … from './update_state.mjs'` anywhere in `.cleargate/` or
  `cleargate-planning/` (the only hits are archived FLASHCARD prose about the missing module guard).
- `init_sprint.mjs`'s duplicated inline tmp+rename (old `:231-233`) is genuinely collapsed —
  `atomicWrite(stateFile, state)` at `:241`, `writeEventsFile(eventsFile, genesisEvents)` at `:247`.
  Order is cache-then-log, which is the *safe* order here: a crash between them leaves a `state.json`
  with no log, and no-log is the safe state (genesis re-synthesises).
- QA-Verify's five unrelated private `atomicWrite` copies, confirmed:
  `prefill_report.mjs`, `prep_qa_context.mjs`, `prep_reporter_context.mjs`,
  `suggest_improvements.mjs`, `close_sprint.mjs`. Four of the five never touch `state.json` and are
  correctly out of scope. **The fifth, `close_sprint.mjs:133`, does** — that is F-B, and it is a
  follow-on, not a scope error in this commit.
- No import cycle introduced: `update_state → validate_state → state-events` and
  `update_state → state-events`. `state-events.mjs` has zero import-time side effects;
  `validate_state.mjs` keeps its `process.argv[1]` CLI guard (TPV T11 honoured).

---

## 5. Blast radius the worktree could not see — measured, and clean

**This was the largest structural risk in the review and it comes back clean.** Per FLASHCARD
2026-08-26 `#worktree #collision-surface #danger`, `cleargate-cli/` has zero tracked files in the
outer repo and **does not exist inside `.worktrees/CR-106`** (confirmed: `ls` → No such file or
directory). Twenty-two default-suite cli test files spawn `.cleargate/scripts/{update_state,
validate_state,init_sprint,close_sprint}.mjs` by a **fixed** path — `REPO_ROOT =
path.resolve(__dirname, '..','..','..')`, no env override. Neither the Developer nor QA-Verify could
have run any of them against the new scripts.

I built a scratch meta-root (`.cleargate` + `cleargate-planning` copied from the worktree;
`cleargate-cli` reconstructed as a real dir of symlinks so `__dirname` resolves inside it) and ran
the full set both ways:

| | tests | suites | pass | fail |
|---|---|---|---|---|
| Baseline (`sprint/S-39` scripts) | 314 | 122 | 296 | 18 |
| New (`story/CR-106` scripts) | 314 | 122 | 295 | 19 |

Set-difference on failing test names: the only two rows unique to the new run are
`CR-033 existing-surfaces-verified — L0 code-truth tightening` and
`Section present, cites package.json (real top-level file) → pass` — both are **my harness's
fault** (the scratch meta-root has no top-level `package.json`; the real repo does). **Zero
CR-106-caused regressions.** The 18 shared failures are pre-existing in this subset and unrelated.

Also checked: `test_update_state.integration.node.test.ts` — the one cli file whose Scenario 5
(*"on-disk state.json is byte-equal after a no-op invocation"*) the new genesis path would break,
because a first invocation against a log-less sprint is no longer a zero-write no-op. It is
**already red on `main`** (two broken `assert.strictEqual(actual, expected, message)` ports) **and
excluded from the default suite** by `run-default-tests.mjs`'s `!test/**/*.integration.node.test.ts`
pattern (CR-075). So it neither fails today nor fails differently tomorrow — but it is dark
coverage of the exact behaviour this CR changed, and it is worth a cleanup item.

Meta-repo acceptance, run independently in this review:
`node --test .cleargate/scripts/state-scripts.test.mjs` → **`tests 31 · suites 22 · pass 31 ·
fail 0 · skipped 0`, wall-clock 21s.** Matches QA-Verify's three runs; barrier armed.

---

## 6. Cross-Cutting Rules (brief §7)

- **Rule 1 (two-tree atomicity):** `diff` is empty for all four files —
  `state-events.mjs`, `update_state.mjs`, `validate_state.mjs`, `init_sprint.mjs`. **PASS.**
- **Rule 2 (`cleargate-cli/templates/**` generated):** not touched. **PASS.**
- **Rule 3 (`evalSection` frozen):** not touched. **PASS.**
- **Rule 4 (`## ` heading renumbering):** **NOT ENGAGED — verified, not assumed.**
  `git show --name-only d6edc45d` returns exactly eight paths, all `.mjs`. Zero markdown, zero
  templates, zero `section(N)` criteria. No heading moved anywhere.
- **Rule 5 (no `--no-verify` / no history rewrite):** commit is a normal commit on the story
  branch. **PASS.**
- **Rule 6 (cli commits ungated):** not applicable — this commit touches no file inside
  `cleargate-cli/`.

---

## 7. Forward coupling — waves 12 and 13 (brief §6)

**CR-108 (`cleargate new`, w12) — no collision.** Grepped M4 `:1355-1610` and the item file for
`init_sprint|update_state|validate_state|state.json|state-events`: **zero hits.** CR-108 stamps
frontmatter and touches `cleargate-cli/src` + `.cleargate/delivery/**`; it does not touch execution
state. Its only inherited obligation from this CR is F-C below, and F-C is inert for `CR-`-shaped
items (see N4).

**CR-110 (sprint-goal acceptance check, w12) — collision is citation-only, and every anchor moves.**
`init_sprint.mjs` went 313 → 327 lines. CR-106 rewrote `:220-247` (the state-seed block); CR-110
edits `:253-303` (the `sprint-context.md` render). **The regions are disjoint — there is no textual
conflict** — but everything at or below CR-110's region shifts **+14**. All six of CR-110's
`init_sprint.mjs` citations in M4 are now wrong; they are listed under WAVE-GATING below and must
be re-anchored before dispatch. Two further notes for CR-110:

- CR-110 inherits a **parity-clean** `init_sprint.mjs` (both trees byte-identical as of this
  commit), so its Cross-Cutting-Rule-1 obligation is a straight mirror.
- M4 `:201` and `:2869` assert *"`init_sprint.mjs:221` writes `SCHEMA_VERSION`"*. **That line is
  deleted.** `SCHEMA_VERSION` is now written by `state-events.mjs:291` inside `fold()`. Related
  hygiene: `init_sprint.mjs:31` still imports `SCHEMA_VERSION`, `VALID_STATES` and
  `TERMINAL_STATES` and **uses none of them** — `SCHEMA_VERSION` became dead in this very commit
  (the other two were already dead on `a9304776`).

**CR-111 (test-layer declaration, w13) — no collision.** Grepped M4 `:1815-2122` for the same five
tokens: **zero hits.**

**EPIC-055 (parallel wave scheduling) — unblocked on correctness, NOT on the axis it was promised.**
The blocker EPIC-055 recorded was the lost-update race, and that is genuinely closed: the truth is
now an append-only log that cannot lose a write, and per-story records are durable. But EPIC-055's
premise — inherited from this item's original §1 — was that the log makes mutual exclusion
unnecessary, so waves could widen freely. **T3(a) ruled the opposite and the shipped code retains
the lock over the full read → migrate → fold → write span (§3 above).** So every concurrent
`update_state.mjs` in a wave still serialises through one global lockfile. TPV measured 20-way
contention serialising in ~6s; `LOCK_RETRY_BUDGET_MS = 2000` is per-holder and resets on holder
change, so it will not spuriously refuse, but wave width now buys wall-clock, not parallelism, at
the state boundary. **EPIC-055 must be re-planned against a serialised state writer**, and should
budget for the quadratic fold (§3) and for the fact that **`wave` is a pinned field of the event
contract that nothing ever populates** — `baseEventFields` hardcodes `wave: null` (`:244`) and
there is no CLI flag to set it. `wave` is exactly the attribution EPIC-055 would want from this
log; today it is structurally always `null`.

---

## 8. `last_action` on fresh sprints — audited as an architect (brief §8)

**Deriving rather than duplicating is the right call. Keep it.** A hand-built
`last_action: "Sprint <id> initialised"` next to a `fold()` that computes `last_action` from the
last event is two writers for one field, and it disagrees the instant either changes — which is
precisely the class of defect this sprint exists to remove. `init_sprint.mjs:227-234` argues this
correctly in its own comment. The measured absence of readers makes the change free today; the
architectural argument makes it right regardless.

Measured on a fresh init (`S-77`, stories `A-1,B-2`):
`"last_action": "transition B-2 → Ready to Bounce"` — the **last** genesis event, as designed.

**But the genesis event shape does deserve one pin that C1–C6 missed.** The genesis event carries
`actor: "migration"` even at fresh init:

```json
{"ts":"…","sprint_id":"S-77","sprint_status":"Active","story_id":"A-1","from":null,
 "to":"Ready to Bounce","actor":"migration","run_id":"genesis:S-77:A-1","wave":null,
 "reason":null,"kind":"transition","initial":{…}}
```

Nothing was migrated. The log now cannot distinguish **"this sprint was created"** from **"this
legacy sprint was adopted onto the log"** — the two are byte-identical apart from timestamps. That
distinction is exactly what the retired `"Sprint <id> initialised"` string carried, and it is the
one piece of information the derivation actually loses. C1–C6 pinned `from: null`, the `initial:`
payload, per-event `sprint_status`, the `kind` discriminator, the five `last_action` literals and
terminal `sprint_status` — but said nothing about the **actor vocabulary**, so it defaulted to the
migration path's value for both. Pin it: `actor: 'init'` for `init_sprint.mjs`'s genesis,
`actor: 'migration'` for `update_state.mjs`'s log-adoption genesis. One-line change, and it is the
difference between a log you can audit and a log you can only fold.

Everything else in the genesis shape checks out: `run_id` is the deterministic
`genesis:<sprint>:<story>` (C13) so concurrent adopters dedupe; `initial` correctly excludes
`state`/`updated_at` (they come from `to`/`ts`, enforced by merge order at
`state-events.mjs:279-285`); tied timestamps across genesis events are safe because `fold` resolves
`last_action` by log order, not by comparing `ts`.

---

## 9. Remaining findings (forward obligations, not part of the kick-back)

**F-C — `events.jsonl` is a new auto-generated file class that nothing knows about.** It appears in
**neither** `.gitignore` **nor** `.cleargate/scripts/surface-whitelist.txt` (grep across both trees
plus `.cleargate/knowledge/`, `.claude/skills/`, `.claude/agents/` → zero hits). `state.json` is
tracked (27 of them under `.cleargate/sprint-runs/`) and is whitelisted under the comment *"Sprint
state files (auto-managed)"*. Its new co-file is neither. Consequences:

1. **Not blocking in M4.** Per M4 N4, `file_surface_diff.sh` globs `STORY-<num>_*.md` only, so the
   surface gate is inert for every `BUG-`/`CR-` item — and all of M4 is `BUG-`/`CR-`. It will bite
   the first `STORY-`-shaped item in a later sprint whose commit stages `events.jsonl`, and the only
   lane out is `SKIP_SURFACE_GATE=1`, which this sprint has already had to log once as a framework
   gap.
2. **It is the second route to the kick-back defect.** Because both files are tracked and nothing
   ties them to the same commit, a checkout can produce a newer `state.json` beside an older
   `events.jsonl`. Decide deliberately: track both (add the whitelist line, both trees) or ignore
   both. Do not leave one tracked and one incidental.

**F-D — `fold([])` emits a schema-invalid document** (`sprint_id: null`, `sprint_status: null`).
Unreachable from `init_sprint.mjs` (zero-story guard at `:103`) but it is the degenerate tail of the
kick-back and the proposed guard covers it.

**F-E — dark coverage.** `test_update_state.integration.node.test.ts` is the only cli-side test of
`update_state.mjs` behaviour, is already red on `main`, and is excluded from the default suite. The
CR changed that script's write path completely and nothing on the cli side noticed. Worth a cleanup
item independent of CR-106.

---

## STALE_CITATIONS

Format: `file:line — cited → corrected` (or `delete`). Measured against `d6edc45d`.
`update_state.mjs` 371 → **433**; `validate_state.mjs` 184 → **252**; `init_sprint.mjs` 313 → **327**;
`state-events.mjs` is new at **298**.

### GATING WAVE 12 — fix before CR-110 is dispatched

All six are `init_sprint.mjs` and all six shift **+14** (CR-106's `+6/+1/+3/+4` insertions all sit
above CR-110's region; the regions themselves are disjoint, so this is drift only).

| Location | Cited | Corrected | What it is |
|---|---|---|---|
| `plans/M4.md:1652` | `init_sprint.mjs:239-289` (`:243`) | **`:253-303`** (`:257`) | sprint-context render block / template read |
| `plans/M4.md:1752` | `init_sprint.mjs:270-275` | **`:281-286`** | the goal-splice idiom CR-110 mirrors |
| `plans/M4.md:1754` | `init_sprint.mjs:284-286` | **`:298-300`** | ctx tmp+rename write |
| `plans/M4.md:1782` | `init_sprint.mjs:242` | **`:256`** | `if (!fs.existsSync(ctxOut) \|\| force)` |
| `plans/M4.md:1784` | `init_sprint.mjs:270` | **`:281`** | `/^- \*\*Sprint Goal:\*\* (.+)$/` |
| `plans/M4.md:1786` | `init_sprint.mjs:249` | **`:263`** | WARN-and-continue on missing template |
| `plans/M4.md:1795-1812` (Task rows) | `:270-275` | **`:281-286`** | same anchor inside the task row |

**Wave 13 (CR-111): none.** Grepped `plans/M4.md:1815-2122` and the item file — zero references to
any of the four scripts. **CR-108: none**, same check over `:1355-1610`.

### CR-106's own item file — the BUG-044 re-anchors are stale a second time

Re-measuring each of the eleven anchors the orchestrator repaired after BUG-044
(`CR-106_Execution_State_Event_Log.md:333-350`). Seven of them **no longer refer to anything that
exists in `update_state.mjs`** — the read-modify-write they described has been evicted or relocated,
which is the CR working as intended.

| Row | Re-anchored to | Now | Verdict |
|---|---|---|---|
| `:78` → `:193` | `JSON.stringify(state, null, 2) + '\n'` | **`state-events.mjs:92`** | **relocated** — `update_state.mjs:193` is now `export function migrateV1ToV2` |
| `:76-80` → `:191-195` | `atomicWrite` | **`state-events.mjs:90-94`** | **relocated** |
| `:99` → `:224` | *"the read the fold must evict"* | **`update_state.mjs:223`** (in `readStateDocument`) | **line moved, description now WRONG** — not evicted, renamed |
| `:114-117` → `:239-242` | `migrateV1ToV2` + `atomicWrite` | **`:310-312`** | `atomicWrite` half **deleted**; drop it from the description |
| `:120-123` → `:245-248` | `migrateStateToV3` + `atomicWrite` | **`:315`** | `atomicWrite` + `v3Changed` branch **deleted**; now one unconditional call |
| `:187-189` → `:312-314` | auto-escalation at `BOUNCE_CAP` (qa) | **`:376-377`** + **`state-events.mjs:236`** | split — the decision stayed, the mutation moved into the fold |
| `:204-206` → `:329-331` | auto-escalation (arch) | **`:389-390`** + **`state-events.mjs:243`** | split, same shape |
| `:227-229` → `:352-354` | idempotency no-op, returns without writing | **`:408-421`** (exit at `:413`) | **semantics changed** — now a zero-write no-op only when `genesisEvents.length === 0` |
| `:233-235` → `:358-360` | `newState === 'Done'` ⇒ `worktree = null` | **`state-events.mjs:269-270`** | **relocated** — gone from `update_state.mjs` entirely |
| `:246` → `:371` | `main()` is synchronous top-to-bottom | **`:251`** (`function main()`) / **`:433`** (`main();`) | still true, both lines moved |
| `:52-66` → `:167-181` | `migrateV1ToV2`, exported, external surface | **`:193-207`** | still exported, still the external surface |

Also in the item file:

| Location | Cited | Corrected |
|---|---|---|
| `CR-106…:10` (frontmatter `context_source`) | `update_state.mjs:78-99` | **`state-events.mjs:92` + `update_state.mjs:223`** — never one range; `:78-99` has not been contiguous since BUG-044 |
| `CR-106…:113` (Existing Surfaces) | `update_state.mjs:78-79` | **`state-events.mjs:91-93`** |
| `CR-106…:114` (Existing Surfaces) | `update_state.mjs:99` | **`update_state.mjs:223`**, and rewrite *"Replaced by an append"* → *"renamed to `readStateDocument`; still read on every invocation"* |
| `CR-106…:198` (C3) | `validate_state.mjs:39-41` | **`:55-57`** |
| `CR-106…:200` (C5) | `update_state.mjs:278, :299, :316, :333, :364` | **`state-events.mjs:271, :262, :238, :245, :252`** — all five `last_action` literals moved into the fold; `update_state.mjs` no longer writes `last_action` at all |
| `CR-106…:227` (case 7 anchor) | `update_state.mjs:78` | **`state-events.mjs:92`** |
| `CR-106…:239` | `update_state.mjs:114-117` / `:120-123` | **`:310-312`** / **`:315`**; `atomicWrite` halves **delete** |
| `CR-106…:244` | `init_sprint.mjs:231-233` (inline tmp+rename) | **delete** — collapsed; `atomicWrite(stateFile, state)` at **`:241`**, `writeEventsFile` at **`:247`** |
| `CR-106…:374` (Context Source) | `update_state.mjs:78-99` | same split as `:10` |

### Plan and sprint-context

| Location | Cited | Corrected |
|---|---|---|
| `plans/M4.md:201` | `init_sprint.mjs:221` writes `SCHEMA_VERSION` | **delete** — line deleted; `SCHEMA_VERSION` now written by **`state-events.mjs:291`** |
| `plans/M4.md:2869` | same claim | **delete**, same reason |
| `plans/M4.md:456` | `update_state.mjs:88` (`args[1]` as action) | **`:257`** |
| `plans/M4.md:602` | `update_state.mjs:229` (`process.exit(0)` no-op) | **`:413`** |
| `plans/M4.md:604` | `update_state.mjs:116`, `:122` (two pre-dispatch `atomicWrite`s) | **delete** — both evicted |
| `plans/M4.md:606` | `update_state.mjs:77` (`${stateFile}.tmp.${process.pid}`) | **`state-events.mjs:91`** |
| `plans/M4.md:609` | `update_state.mjs:52-66` (`migrateV1ToV2` exported) | **`:193-207`** |
| `plans/M4.md:1027` | `update_state.mjs:114-117` | **`:310-312`**; `atomicWrite` half **delete** |
| `plans/M4.md:1065` (E7 anchor) | `update_state.mjs:78` | **`state-events.mjs:92`** |
| `plans/M4.md:1071` | `atomicWrite` (`update_state.mjs:76-80`) | **`state-events.mjs:90-94`** |
| `plans/M4.md:1073` | `init_sprint.mjs:231-233` | **delete** — collapsed as instructed |
| `plans/M4.md:1079` | `validate_state.mjs:98` (`validateState`), `:27` | **`:114`**, **`:43`**; add **`checkFoldDrift` at `:146`** |
| `plans/M4.md:1120` | `update_state.mjs:227-229` | **`:408-421`**, and note the changed semantics |
| `plans/M4.md:1125` | `update_state.mjs:187-189` / `:204-206` | **`:376-377`** / **`:389-390`** + **`state-events.mjs:236` / `:243`** |
| `plans/M4.md:1129` | `update_state.mjs:233-235` | **`state-events.mjs:269-270`** |
| `plans/M4.md:1131` | `init_sprint.mjs:231-233` | **delete** |
| `plans/M4.md:2220` | `update_state.mjs:116`/`:122` | **delete** (historical prose in `## Open decisions`) |
| `plans/M4.md:2816` | `update_state.mjs:102,:110,:130,:135,:146,:166,:184,:201,:223` (`process.exit` sites) | all nine shift; the new set is **`:183, :263, :277, :285, :293, :304, :322, :327, :349, :364, :374, :387, :405, :413`** (fourteen, not nine) |
| `plans/M4.md:188-226` (N3) | `init_sprint.mjs:221 writes SCHEMA_VERSION` | **delete** — the ruling landed and the line is gone |
| `sprint-context.md` | **none** — no citation into any of the four scripts | — |
| `.claude/agents/**`, `.claude/skills/**` | **none with line numbers.** `SKILL.md:266` names `validate_state.mjs` without an offset — still valid, but see §2.2: that invocation now carries a new halt condition | — |

### Other pending-sync items (not wave-gating)

| Location | Cited | Corrected |
|---|---|---|
| `BUG-039…:58, :101` | `update_state.mjs:71` / `:71:9` (`resolveStateFile` throw) | **`:209-215`**, throw at **`:212`** |
| `BUG-044…:12, :163` | `update_state.mjs:78-79` (`atomicWrite`) | **`state-events.mjs:91-93`** |
| `CR-085…:90, :122` | `update_state.mjs:217-242` (*"the transition branch"*) | **`:397-421`**, `VALID_STATES` check at **`:401-406`**. Was **already wrong before CR-106** — `:217-242` has been the lock-error block + migrations since BUG-044 |
| `SPRINT-39…:130` | `update_state.mjs:78-99` | same split as `CR-106…:10` |

### Archive + knowledge (`init_sprint.mjs`, all **+14**; low priority)

`CR-078…:17, :70, :88, :119, :134` `:160` → **`:167`**; `CR-078…:62` `:179` → **`:186`**;
`STORY-051-04…:198` `:128-146` → **`:135-153`**; `STORY-051-04…:205` and
`STORY-051-08…:76, :90, :176, :195, :241` `:140` → **`:147`**;
`cleargate-enforcement.md:572` `:140` → **`:147`**.

### FLASHCARD.md — reported, NOT rewritten (append-only)

No dated card in `.cleargate/FLASHCARD.md` carries a line citation into any of the four scripts.
Two cards are now **factually stale in substance** and should be superseded by a new dated card
rather than edited:

- `#mjs #module-guard #import` (2026-04-27) — *"`update_state.mjs` has no module guard"*. Still
  true (`main()` at `:433` is unconditional), but the reason it mattered — inline the fn rather than
  import it — is now obsolete for `atomicWrite`, which lives in the import-safe `state-events.mjs`.
- The card noting `init_sprint.mjs` no longer writes `execution_mode` into `state.json` (item's
  `## Prior work`, line ~82) — `init_sprint.mjs` no longer writes `state.json`'s *body* at all; it
  derives it from `fold(genesisEvents)`.

---

## FLASHCARDS_PROPOSED

Not written by me. None duplicates TPV's four, the Developer's two, or QA-Verify's one.

- `2026-08-29 · #event-log #danger · Deleting a derived-cache's log is SAFE (genesis re-synthesizes); TRUNCATING it is catastrophic — the fold silently drops every story with no event and exits 0. existsSync is the wrong adoption predicate; compare the folded key set to the cache's.`
- `2026-08-29 · #event-log #architecture · A fold can own the OUTPUT while the cache still owns the INPUT: if the next event's values are read from state.json, drift is laundered INTO the log, not corrected by it. "Log is the truth" must hold on the read path too.`
- `2026-08-29 · #gate #eviction-grep #danger · An eviction grep keyed on a VARIABLE NAME (readFileSync.*stateFile) is satisfied by renaming the parameter. CR-106's read survived as readStateDocument(docPath) and grep 1 went to 0 hits. Grep the call graph, not the token.`
- `2026-08-29 · #state #close #danger · close_sprint.mjs writes state.json outside the event log, so every sprint closed after CR-106 permanently fails the fold-drift check — and the error's advised remediation (re-run update_state) is refused by the closed-sprint guard it ships with.`
- `2026-08-29 · #worktree #test-harness #danger · cleargate-cli/ does not exist inside a worktree, so a .cleargate/scripts/** change is invisible to the 22 cli tests that spawn those scripts by fixed path. Build a symlinked scratch meta-root to run them BEFORE merge, not after.`

---

## Script Incidents

None. Every command in this review was a direct read, `git` read-only query, `node --test`, or a
script invocation against a **byte-copy** of `state.json` in the session scratchpad. No
state-mutating git command was run: no commit, no merge, no branch switch, no worktree removal, no
`cleargate init`, no `dist/` rebuild, and **`close_sprint.mjs` was not run**. The one artefact I
created inside the worktree (a scratch `S-77` sprint dir from an `init_sprint.mjs` probe) was
removed; `git -C .worktrees/CR-106 status --porcelain` is empty.

---

## Round 2 (scoped re-check)

role: architect · Mode: POST-FLIGHT round 2 · SPRINT-39 · wave 11 · M4 · CR-106
Commit under review: `c84a0958` on `story/CR-106`, worktree `.worktrees/CR-106`, base `d6edc45d`.
Scope: the three questions in the dispatch. Round-1 findings were not re-derived.

### VERDICT: **PASS**

The kick-back defect is closed, and it is closed on the route I actually named — not only on the
degenerate zero-byte case QA reproduced. Measured below, four probes, all against byte-copies in the
session scratchpad. **The live `.cleargate/sprint-runs/SPRINT-39/state.json` was never touched** (it
still has 18 stories and still has no `events.jsonl`).

---

### Check 1 — STALE log, not just EMPTY: **covered, measured**

The reason it is covered is worth stating precisely, because it is stronger than what I asked for.
`checkFoldDrift` (`validate_state.mjs:146-181`) is **byte-equality**, not a coverage floor:

```js
const foldedBytes = `${JSON.stringify(fold(events), null, 2)}\n`;
if (foldedBytes !== onDiskBytes) { /* invalid */ }
```

A coverage floor ("the folded story set must still cover the set on disk") is a strict subset of
byte-equality. So a log that folds to *any* document differing from the cache — fewer stories, same
stories with older values, different `last_action` — is refused. It cannot fold through and drop
stories, because dropping a story is a byte difference by construction. The Developer wired the
existing stronger helper rather than writing my weaker one; that is the better outcome.

Probes (fixed script, `CLEARGATE_STATE_FILE` pointed at scratch). Seed for all four: a byte-copy of
the live 18-story `state.json`, run once through the genesis path to produce a **consistent pair**
(`state.json` 18 stories / `events.jsonl` 19 lines).

| Probe | Log condition | Transition | Result |
|---|---|---|---|
| **A** — subset | 5 genesis events deleted → 14 lines, **valid JSONL, non-empty, plausible**, folds to **13** stories | `CR-110 Bouncing` | **exit 1**, refused. `state.json` sha256 unchanged, **18 stories intact**. No `.lock`, no `.tmp`. |
| **B** — revert simulation | consistent pair, then `state.json` advanced by an out-of-log writer (`CR-110 → Bouncing` + `last_action` + both `updated_at`, written in fold's own format); log left stale at 19 lines | `CR-111 Bouncing` | **exit 1**, refused. Unchanged, 18 intact, no stray files. |
| **C** — control | untouched consistent pair | `CR-111 Bouncing` | **exit 0**, succeeded. 18 stories, log 19 → 20. No false positive on a real field-changing transition. |
| **D** — valid prefix | last event truncated → 18 lines, all 18 stories present, log is a legal prefix | `CR-111 Bouncing` | **exit 1**, refused. Unchanged, 18 intact. |

**Probe B is the exact route from round 1** — `git revert -m 1` leaves a live, non-empty,
no-longer-updated `events.jsonl` while the old writer resumes mutating `state.json`; the skew appears
on re-merge. It refuses. The pre-fix behaviour on this same shape was exit 0 and seventeen stories
deleted.

**The advised remediation actually recovers — verified, not assumed.** Applying the error's own
instruction to probe B (`rm events.jsonl`, then re-run):

```
Updated CR-111: state="Bouncing"   exit=0
stories: 18 · CR-110.state: "Bouncing" (the out-of-log writer's advance SURVIVED) · log: 19 lines
```

Genesis re-synthesises from the cache, the out-of-log advance is preserved, and the pair is
consistent again. The revert → re-merge sequence now has a working, one-command recovery.

**Two bounded observations, neither blocking, neither on the do-not-reopen list.**

1. **The two stderr lines contradict each other.** Line 1: *"the log … is the source of truth."*
   Line 2: *"delete `events.jsonl` to re-synthesize genesis from `state.json`."* The only recovery
   shipped discards the log and keeps the cache. There is no "re-fold from the log" command —
   `update_state.mjs` refuses and `validate_state.mjs` only reports. In practice, therefore, **the
   cache wins on divergence**, which is the safe direction (it never loses stories) but is the
   opposite of what line 1 claims. Fix the prose, not the behaviour.
2. **The check runs before migration** (`:313`, migrations at `:325`/`:330`), so it compares raw
   on-disk bytes. A pre-v3 `state.json` beside a v3-folded `events.jsonl` therefore refuses —
   confirmed by probe E (`schema_version: 2` + `execution_mode` beside the seed log → exit 1). That
   pair is unreachable from first-party code (the old writer never creates a log; the new writer
   always writes a v3 fold), needs a checkout skew to produce, and the delete-the-log remediation
   clears it. Noted for whoever owns the check next; not a defect in this commit.

### Check 2 — the new in-lock exit site: **structurally safe**

Code read, per the dispatch. The release is **registered at acquire time, not per exit site**:

- `acquireLock` (`update_state.mjs:107-170`) creates the lockfile with `openSync(lockPath,'wx')`,
  writes the payload, then registers `process.on('exit', () => unlinkSync(lockPath))` at **`:163-169`**
  before returning. Called once, at **`:274`**.
- The new guard is at **`:313-320`**, exit at **`:319`** — textually and dynamically *after* `:274`,
  inside the same synchronous `main()` body (`:251-446`, called unconditionally at `:448` with no
  wrapping try/catch).
- `process.on('exit')` fires on `process.exit(n)` (which is why BUG-044 chose it over `finally` —
  `finally` is skipped by `process.exit`), on natural return from `main()`, and after an uncaught
  throw. There is no code path from `:274` to process termination that bypasses it.

The property that matters is that coverage is **dominated by the registration site, not enumerated
per exit site**. Every post-acquire exit is covered — `:277, :285, :293, :304, :319 (new), :337,
:342, :364, :379, :389, :402, :420, :428` plus the fall-through at `:445-446` and any throw from
`checkFoldDrift`/`appendEvent`/`fold`/`atomicWrite`. That is exactly the shape BUG-044's M6/T1
finding wanted: adding an in-lock exit site cannot leak a lock here, because no site is responsible
for release. The two pre-acquire exits (`:183` usage, `:263` state.json-not-found) are correctly
uncovered — no lockfile exists yet.

Empirically consistent: probes A, B and D each left **no `.lock` and no `.tmp.<pid>`** in the scratch
dir, including on a repeat refusal against the same seed.

One residual, **pre-existing at `a9304776` and not introduced by this commit**: a throw from
`writeSync`/`closeSync` in the two-syscall window between lockfile creation (`:115`) and handler
registration (`:163`) would leak. Self-healing via the stale-holder steal (`isPidAlive` → dead pid →
`unlinkSync`, `:135-143`). Not this CR's, not re-opened here.

### Check 3 — N7, corrected delta only

The hunk inserts **15 lines after old `:306`** (6 comment + 9 code), plus one in-place import
rewrite at `:49` that shifts nothing. Therefore, measured against `d6edc45d`:

> **`update_state.mjs`: every line ≥ 307 shifts +15. Lines ≤ 306 are unchanged. File 433 → 448.**
> **`state-events.mjs` (298), `validate_state.mjs` (252), `init_sprint.mjs` (327): zero diff between
> `d6edc45d` and `c84a0958` — every round-1 citation into those three files is FINAL.**

Verified by reading each corrected anchor, not by arithmetic alone.

### Disturbance check on the round-1 obligations (confirmed untouched, not re-audited)

`git diff --stat d6edc45d c84a0958` is exactly three files: the two `update_state.mjs` copies
(+17/-0 each) and the CR item's own markdown. Individually confirmed **UNTOUCHED**:
`state-events.mjs`, `validate_state.mjs`, `init_sprint.mjs`, `close_sprint.mjs`,
`state-scripts.test.mjs`, `state.schema.json`, `constants.mjs`, `surface-whitelist.txt`.
Spot-confirmed still in their round-1 condition, no re-audit: lock span unchanged · eviction grep 1
still 0 hits (rename, not eviction) · `events.jsonl` in neither `.gitignore` nor
`surface-whitelist.txt` · `wave: null` still hardcoded, 1 site · genesis `actor: 'migration'` at
`state-events.mjs:158`.

Two-tree parity: `diff` empty for all four scripts. Independent suite run:
**`tests 31 · suites 22 · pass 31 · fail 0 · skipped 0`, wall-clock 17s** — barrier armed (the
T4 canary still proves the lost-update race in 792ms).

---

## STALE_CITATIONS — round 2 (corrected delta only)

Everything not listed here is **FINAL** as of round 1. The only mover is `update_state.mjs`, +15 at
lines ≥ 307.

### Now stale a third time — re-anchor these

| Location | Round-1 correction | Round-2 correction |
|---|---|---|
| `CR-106…:114-117` (BUG-044 re-anchor row) | `update_state.mjs:310-312` | **`:325-327`** |
| `CR-106…:120-123` (re-anchor row) | `:315` | **`:330`** |
| `CR-106…:187-189` (re-anchor row) | `:376-377` | **`:391-392`** (`state-events.mjs:236` FINAL) |
| `CR-106…:204-206` (re-anchor row) | `:389-390` | **`:404-405`** (`state-events.mjs:243` FINAL) |
| `CR-106…:227-229` (re-anchor row) | `:408-421`, exit `:413` | **`:423-436`**, exit **`:428`** |
| `CR-106…:246` (re-anchor row) | `:251` / `:433` | `:251` FINAL / **`:448`** |
| `CR-106…:239` | `:310-312` / `:315` | **`:325-327`** / **`:330`** |
| `plans/M4.md:602` | `:413` | **`:428`** |
| `plans/M4.md:1027` | `:310-312` | **`:325-327`** |
| `plans/M4.md:1120` | `:408-421` | **`:423-436`** |
| `plans/M4.md:1125` | `:376-377` / `:389-390` | **`:391-392`** / **`:404-405`** |
| `plans/M4.md:2816` (`process.exit` sites) | fourteen: `:183,:263,:277,:285,:293,:304,:322,:327,:349,:364,:374,:387,:405,:413` | **fifteen: `:183, :263, :277, :285, :293, :304, :319, :337, :342, :364, :379, :389, :402, :420, :428`** |
| `CR-085…:90, :122` | `:397-421`, `VALID_STATES` at `:401-406` | **`:412-436`**, `VALID_STATES` at **`:416-421`** |
| My own round-1 §1 decision-path table | `:325`, `:372`, `:376`, `:385`, `:389`, `:410` | **`:340`, `:387`, `:391`, `:400`, `:404`, `:425`** (`:237-238` FINAL) |
| My own round-1 §3 post-acquire exit list | as above | as the fifteen-site row above |
| Dev round-1 report N7 rows citing `update_state.mjs ≥307` | — | apply **+15**; eviction grep 2 is now **`:443`** |

### One addition, not a correction

| Location | Round-1 | Round-2 |
|---|---|---|
| `plans/M4.md:1079` | `checkFoldDrift` at `validate_state.mjs:146` — **one caller** (its own CLI) | **two callers**: add `update_state.mjs:313`. The helper is now load-bearing on the write path; the round-1 note that it "protects nothing" is discharged. |

### Treat as FINAL — do not re-anchor again

- **All seven `init_sprint.mjs` GATING WAVE 12 rows** (`plans/M4.md:1652, :1752, :1754, :1782, :1784,
  :1786, :1795-1812`) — `init_sprint.mjs` has a zero diff this round. The `+14` corrections stand;
  CR-110 can be dispatched against them.
- Every citation resolving into `state-events.mjs` (`:90-94, :91-93, :92, :158, :236, :238, :243,
  :245, :252, :262, :269-270, :271, :291`) — file untouched.
- Every citation resolving into `validate_state.mjs` (`:43, :55-57, :114, :146`) — file untouched.
- Every `update_state.mjs` citation at ≤ 306: `:193-207` (`migrateV1ToV2`), `:209-215` + throw `:212`
  (BUG-039), `:223` (`readStateDocument`), `:237-238` (`baseEventFields`), `:251` (`function main`),
  `:257` (`args[1]`), `:274` (`acquireLock`).
- Every `delete` verdict from round 1 (`plans/M4.md:201, :604, :1073, :1131, :2220, :2869, :188-226`;
  `CR-106…:244`) — still deleted.
- The archive/knowledge `init_sprint.mjs` `+14` block and the FLASHCARD.md section — untouched.
- `sprint-context.md`, `.claude/agents/**`, `.claude/skills/**` — still no line citations into any of
  the four scripts.

---

## FLASHCARDS_PROPOSED — round 2

Not written by me. None duplicates my round-1 five, TPV's four, the Developer's three, or QA's two.

- `2026-08-29 · #event-log #recovery #danger · If the only shipped recovery from cache-vs-log divergence is "delete the log", the CACHE is the source of truth in practice — whatever the error message claims. Ship a re-fold-from-log path, or stop saying the log wins.`
- `2026-08-29 · #review #floor-check · When you spec a coverage floor ("folded set must cover the set on disk"), check for an existing EQUALITY helper first — byte-equality strictly subsumes coverage, and wiring a dead helper beats writing a weaker new one.`
- `2026-08-29 · #lock #danger · A lock whose release is registered ONCE at acquire (process.on('exit')) is safe to add new in-lock exit sites to; one whose release is per-exit-site is not. Check which kind you have BEFORE adding an early return inside a critical section.`

---

## Script Incidents — round 2

None. Every command was a read (`sed`/`awk`/`grep`/`git diff --stat`/`git show`), a `node --test`
run, or a `node update_state.mjs` invocation against **byte-copies** in the session scratchpad. No
state-mutating git command: no commit, no merge, no branch switch, no worktree removal, no revert, no
clone, no `cleargate init`, no `dist/` rebuild, and **`close_sprint.mjs` was not run**. The live
`.cleargate/sprint-runs/SPRINT-39/state.json` was read once and never written;
`git -C .worktrees/CR-106 status --porcelain` is empty.
