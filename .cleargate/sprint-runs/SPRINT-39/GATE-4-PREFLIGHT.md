# SPRINT-39 — Gate-4 preflight state

Measured by the orchestrator on 2026-08-29 during wave 10, read-only. Every line here is a
measurement, not a plan. Re-measure immediately before close — several of these move.

## Worktrees (must be zero before `close_sprint.mjs` Step 2.7)

```
/Users/ssuladze/Documents/Dev/ClearGate                     3eca34b2 [sprint/S-39]
/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-044  871270d1 [story/BUG-044]
/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-046  f5a1c778 [story/BUG-046]
```

`.worktrees/BUG-046` is **dirty** — four regenerated wiki caches (`wiki/bugs/BUG-046.md`,
`wiki/index.md`, `wiki/log.md`, `wiki/product-state.md`, +32/-10). They are derived caches
written by the PostToolUse ingest hook, deliberately left unstaged by the Developer and
confirmed by QA-Verify as the only uncommitted changes. `git worktree remove` refuses a dirty
tree, so DevOps must discard them explicitly before teardown. Nothing authored is lost — the
wiki recompiles at Gate 4.

## Branches to delete at close

**`cleargate-cli`** (7): `story/BUG-043`, `story/BUG-045`, `story/CR-105`, `story/STORY-054-02`,
`story/STORY-054-04`, `story/STORY-054-05`, `story/STORY-054-06`.

**outer** (10 from this sprint): `story/BUG-044`, `story/BUG-046`, `story/CR-105`,
`story/STORY-054-01`, `-02`, `-03`, `-04`, `-06`, `-07`.

**Pre-existing cruft — NOT this sprint's, do NOT delete without asking:** `story/STORY-014-02`,
`-03`, `-04`, `-04-bounce`, `-05`, `-06`, `-07`, `-08`. Eight branches predating this sprint,
still present in the outer repo. Why they survived is not established here — only that they exist
and are not SPRINT-39's. Worth surfacing to the human as a separate cleanup decision; deleting
them is not part of SPRINT-39's close.

## `cleargate-cli` stash

```
stash@{0}: WIP on story/BUG-043: 1e01ea0 fix(EPIC-043): BUG-043 upgrade refuses rather than
                                 overwrites a user's CLAUDE.md
```

A stray `cleargate-0.23.1.tgz`. Dropping a stash destroys work irreversibly — **ask the human
before `git stash drop`**, do not fold it into a mechanical close step.

## `dist/cli.js` is stale — and it is what the orchestrator has been running

Built **Aug 28 12:14**. Source files newer than it:

```
cleargate-cli/src/init/inject-claude-md.ts
cleargate-cli/src/lib/readiness-predicates.ts
cleargate-cli/src/lib/claude-md-surgery.ts
cleargate-cli/src/commands/hotfix.ts
cleargate-cli/src/commands/init.ts
```

So the shipped `dist` predates **BUG-043** (merged 18:53), **CR-105** (21:51) and **BUG-045**
(wave 10, cli-only). Every `node cleargate-cli/dist/cli.js gate check` run during waves 10-13
therefore exercises pre-BUG-043 CLI code. This does **not** invalidate the gate results — BUG-043
and CR-105 are `CLAUDE.md`-injection changes with no gate surface, and BUG-042's section-index fix
(merged Aug 27) *is* in this build — but the rebuild is a Gate-4 obligation and the reason must be
stated rather than assumed.

## Global `cleargate`

`cleargate@0.24.2` — a **real global install, not `npm link`** (confirmed via `npm ls -g`). Local
`src/` changes do not take effect in the global binary until published and reinstalled. Any repro
run through the global `cleargate` binary during close is testing 0.24.2, not this sprint's tree.

## `cleargate-planning/MANIFEST.json`

Uncommitted, 10 insertions / 10 deletions. Needs reconciliation at close.

## Not-in-sprint items re-stamped by `backfill_hierarchy.mjs`

Recurred again during wave 10 — **8 items** this time: BUG-047, BUG-048, BUG-049, BUG-050,
**BUG-062** (newly created this sprint, newly swept), CR-109, EPIC-055, EPIC-057. Each diff was
verified as exactly the one line `sprint_cleargate_id: null -> "SPRINT-39"` and reverted before
committing, so the wrong attribution stays out of git history.

Mechanism is filed as **BUG-048 §3.5** and is unscheduled: `SPRINT_REGEX = /\bSPRINT-(\d+)\b/` runs
over the first 50 body lines as the last-resort fill, so any prose mention re-owns the item. An
explicit `null` is **not** protection — the write guard treats null as absent.

**Standing close-gate obligation** (`sprint-context.md:292`): re-verify sprint attribution
**immediately before** `close_sprint.mjs`, not earlier. Any agent dispatch can re-corrupt it, and
the lifecycle reconciler reads `sprint_cleargate_id`.

## Operational note carried from TPV T6 (BUG-044)

`.cleargate/sprint-runs/*/state.json.lock` is deliberately **not** gitignored, and
`validate_bounce_readiness.mjs:98-101` hard-fails on a dirty tree. If any wave-11/12/13 transition
reports "git working tree is dirty", check for that lock file **first** — the diagnostic never
mentions `update_state`.

---

## GATE-4 DECISION REQUIRED — arming BUG-046's refusal branch

Raised by the BUG-046 Architect post-flight (verdict PASS; this is a scope/plan finding, not a
Developer defect). **It is the single most consequential thing on this list.**

**The feature is inert today and that is why waves 11-13 are safe.** BUG-046 edited the *canonical*
agents (`cleargate-planning/.claude/agents/architect-reader.md`, `architect-synth.md`) and canonical
`SKILL.md`. The **live** `/.claude/**` copies still carry the old contract, so the refusal branch
does not execute in this repo until the Gate-4 re-sync runs. Nothing in the remaining waves is
affected.

**The re-sync arms it — and measured, it would refuse everything.** The post-flight ran the shipped
classifier against the five remaining in-flight items:

```
CR-108  7 flags     CR-107  2 flags     CR-110  2 flags
CR-111  3 flags     BUG-062 6 flags
-> 5 of 5 would be REFUSED; a whole-backlog fan-out yields zero waved stories
```

13 of the 20 flags are genuine. **7 are BUG-062's deferred parser over-reporting** — the scope split
out of BUG-046 by the human decision at the M4 planning halt.

**Why the split changed the blast radius.** Before this commit, an over-reported prose token cost a
*spurious serialization* — the safe direction. After it, the same token costs a **refusal**. The
split was correct on scope grounds and this consequence was not visible at the time it was made.

**The post-flight's recommendation: treat BUG-062 as a precondition for arming the refusal.**

Two viable routes, both defensible — **this is the human's call at Gate 4, not the orchestrator's:**

1. **Re-sync everything, accept the refusals.** Honest and loud: the next SDR refuses and says why.
   Costs a blocked fan-out until BUG-062 ships.
2. **Re-sync `SKILL.md` and `architect-reader.md`, hold `architect-synth.md`** until BUG-062 lands.
   Keeps planning runnable, at the cost of a knowingly partial re-sync — which the post-flight also
   names as a hazard in its own right (see below).

Related findings that bear on the choice:

- **The refusal has no output slot (D1).** `waves.json`'s shape and the Wave Assignment table were
  not extended, and the mandated rationale string lives only on a wave object the refusal forbids
  creating — so a refused story is an *absence*. `SKILL.md:204`'s only post-condition is
  `test -f waves.json` (existence, never coverage), so an N-1-story artifact passes silently.
- **The Autonomy Contract still contradicts it (D2)** — `architect-synth.md:154`, the file's last
  instruction, still says *"Return BLOCKED only if you cannot write `waves.json` at all."*
- **The digest is unversioned (finding 6).** New field + stale live agent degrades silently in
  **both** directions (extra key ignored / missing key defaults `[]`), and a partially re-synced
  install is ClearGate's steady state — so degraded scheduling is indistinguishable from correct.
  EPIC-055 (`waves.json` → `schema_version: 2`) and EPIC-057 (per-story `checkout`) both declare
  `architect-synth.md` as a modify target; if `refused` and `digest_version` are not designed in
  there, the refusal is homeless permanently.

## Gate-4 re-sync list — now THREE files, not one

R8 recorded one. BUG-046 is the sole author of the new drift (all three were byte-identical before
`f5a1c778`):

| Canonical file | Drift |
|---|---|
| `.claude/skills/sprint-execution/SKILL.md` | 787 → 787, **one line differs in place at `:286`** (zero line shift) |
| `.claude/agents/architect-reader.md` | +2 lines |
| `.claude/agents/architect-synth.md` | +28 lines |

**None contains `__CLEARGATE_VERSION__`**, so the re-sync is a straight copy, not a judgement call —
the only judgement is *whether* to copy `architect-synth.md`, per the decision above.


---

## ~~NEW Gate-4 obligation~~ — SUPERSEDED, see "prebuild is per-merge, not Gate-4" below

Raised by the BUG-044 Architect post-flight. `cleargate-cli/templates/cleargate-planning/.cleargate/
scripts/update_state.mjs` matches canonical **today** at 246 lines, and becomes **246-vs-371** the
moment BUG-044 merges. The payload is a generated, gitignored build artifact — regenerated by
`copy-planning-payload.mjs` — so it does not show in `git status` and nothing will surface the drift.

**Run `npm --prefix cleargate-cli run prebuild` at Gate 4.** Until it runs, every fresh
`cleargate init` ships the **racing** version of `update_state.mjs` — the exact defect this sprint
fixed. This is a shipping-correctness item, not housekeeping.

## Accepted residual carried out of BUG-044 (not a defect, recorded so it is not rediscovered)

`close_sprint.mjs` and `init_sprint.mjs` **never take the lock** — they write `state.json`
unguarded. The lock serialises `update_state.mjs` against itself, which is where the measured race
was; it does not make `state.json` writes globally exclusive. Post-flight verified no legitimate
holder can exceed the 5-minute steal backstop (`acquireLock` has exactly one call site, and the test
suite's 32 children contend on `os.tmpdir()` paths), so the backstop needs a *suspended* holder to
fire at all. When it does fire it is compound: the release unlinks **unconditionally** with no
ownership check, so a stolen-from process would delete the new holder's lock. Accepted because the
age ceiling was mandated verbatim by the plan and CR-106 deletes the lock next wave.

---

## USE-PROHIBITION — do not run `cleargate hotfix new` from `dist/` or the global binary before Gate 4

From the BUG-045 Architect post-flight. N9 forbids *verifying* through `dist/`; this adds the
*use* prohibition, because the failure is live and silent.

Measured right now: `pending-sync/` holds **0** `HOTFIX-*` items and `archive/` holds **1**
(`HOTFIX-001_init_skip_strips_exec_bit.md`). The stale `dist/cli.js` (built Aug 28 12:14) and the
global `cleargate@0.24.2` both carry the **pre-BUG-045** archive-blind scan, so either one would
allocate **`HOTFIX-001` — a live collision on its first invocation**, writing a second item with an
id already in use.

Safe to leave for the remaining waves: the blast radius is one command, no remaining wave calls it,
and the write targets a new path so nothing is overwritten. **The likely victim is a human filing a
hotfix from the global binary** — so the prohibition is worth stating rather than assuming.
Cleared by the Gate-4 `dist` rebuild plus publish-and-reinstall.

## Follow-on worth filing — `## Unreleased` has no guarantee of ever being released

From the same post-flight. `grep -rn "Unreleased" cleargate-cli/{test,scripts,src}` returns **zero
hits**, there is no release script, and `parseChangelog` slices from `matches[0].index` — the first
bracketed `## [X.Y.Z]` heading. `test/changelog-format.node.test.ts:128` matches only
`^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$`, so **everything above the first version heading is
invisible to every check in the suite.**

Consequence: if a releaser bumps to 0.25.0 and inserts the dated heading *below* a still-present
`## Unreleased`, **all five format scenarios pass** and BUG-045's entry is stranded above the parse
boundary permanently — shipped code, unshipped changelog, nothing red.

The guard belongs in `verify-pack.mjs` — the `prepublishOnly` chokepoint — not in the test suite,
which by construction cannot see the region. Candidate follow-on CR; not this sprint's.


---

## CORRECTION — `prebuild` is a PER-MERGE obligation, not a Gate-4 step. A test enforces it.

Recorded 2026-08-29 after BUG-045's DevOps merge halted on an unexpected suite failure. This
supersedes the "NEW Gate-4 obligation" entry above, which framed the payload drift as something
to clean up at close.

**What happened.** BUG-045's post-merge full suite came back `tests 2590 · suites 910 · pass 2587
· fail 2 · skipped 1` — one more failure than every prior measurement. DevOps halted rather than
waving it through, which was correct. The extra failure was
`test/scaffold/skill-md-conditional-architect.red.node.test.ts`, a file BUG-045's branch never
touched (`git diff e4cb49f..c589a039` over it is empty).

**Why it failed, and it was a REAL failure.** Its **S5** case asserts the generated payload
`cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` is
byte-identical to canonical `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`. The
diff it printed was **exactly BUG-046's doctrine correction at line 286** — the payload still
carried the false claim BUG-046 was chartered to remove:

```
< ... that path does NOT exist in a worktree: `mcp/` has zero tracked files in the outer repo,
    so edit it in the main checkout instead.
> ... the Developer edits `mcp/` from inside `.worktrees/STORY-NNN-NN/mcp/...` — visible as a
    subdirectory of the outer worktree.
```

So the false claim survived in the **generated npm payload** — a surface neither BUG-046's C13
grep nor its post-flight census covered, because both scanned canonical and live doctrine, not the
build artifact. It would have shipped to every fresh `cleargate init` until someone ran `prebuild`.

**The reframing.** S5 makes payload↔canonical parity a **tested invariant**. Any commit that edits
a canonical scaffold file reds the `cleargate-cli` suite from that moment until `npm --prefix
cleargate-cli run prebuild` runs. It is therefore a **per-merge** obligation for any story touching
`cleargate-planning/**`, not a Gate-4 tidy-up. Deferring it means every subsequent cli suite run is
red-by-default, which masks real regressions — exactly what nearly happened here.

**Current state — measured, not assumed.** The full payload tree was regenerated at ~14:54 (both
halves of `prebuild`: the payload copy and the manifest). All six files changed by BUG-044 and
BUG-046 are now **in sync**:

```
SKILL.md · architect-reader.md · architect-synth.md
cleargate-enforcement.md · collision_surface.sh · update_state.mjs      all in sync
```

`cleargate-planning/MANIFEST.json` carries a pending 15-insertion / 15-deletion diff, consistent
with `build-manifest` having run — that is the manifest reconciliation the Gate-4 list already
expects, and it should be committed rather than reverted.

**Open question worth one measurement at close:** S5's outcome depends on whether the payload
happens to be in sync when the suite runs, and nothing in the suite regenerates it (no test invokes
`copy-planning-payload.mjs` — grepped). So a canonical edit made *after* a prebuild will red S5 on
the next run with a diagnostic that names S5's own story, not the story that actually changed
canonical. Worth a follow-on: have the pre-commit hook run `prebuild` when
`cleargate-planning/**` is staged, so the payload can never lag a commit.
