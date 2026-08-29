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

---

## GATE-4 FOLLOW-UP — flip `vcs.sprint_pr` to `true` AFTER this sprint closes

Recorded 2026-08-29 alongside the CR-107 ruling. **Do this after SPRINT-39's close completes, not
during it.**

CR-107 ships `vcs.sprint_pr: false` in both `.cleargate/config.yml` (live, 37 lines) and
`cleargate-planning/.cleargate/config.yml` (canonical seed, 19 lines). The human's recorded intent
in CR-107 §0.5 is *"enabled in this repo"*, and the capability is measured satisfiable today:
`origin` = `git@github.com:sandrinio/cleargate.git`, `gh` 2.90.0 on PATH, authenticated with `repo`
scope.

It ships `false` because CR-107 is **fail-closed on the sprint's terminal boundary**, and arming it
now would make the first real exercise of the new gate the close of the sprint that built it — the
one operation that cannot be cheaply retried. The flip is one line and reversible; a halted Gate 4,
after worktrees are already torn down, is not.

**The action:** after SPRINT-39 is closed, set `vcs.sprint_pr: true` in the **live**
`.cleargate/config.yml` only. Leave the canonical seed at `false` — it is the shipped first-install
default, and ClearGate installs into repos with no GitHub remote, where `true` would fail-close
every close. SPRINT-40 then becomes the first PR-gated close, with a sprint of soak behind the code.

**Do not diff the two config files against each other, ever** — they are deliberately different
(live carries this repo's `gates:` and `worktree:` blocks; canonical carries `wiki.ingest_buckets`
only). STORY-054-04's post-flight R22 measured that treating them as mirrors deletes this repo's
gate and worktree configuration.

---

## PRE-FLIP obligations for `vcs.sprint_pr: true` (CR-107 post-flight PF-2, PF-3)

Both are advisory on a path currently gated behind `false`, so neither blocked the merge. **Both
must be settled before the post-close flip to `true`**, or the first PR-gated close hits them.

**PF-2 — the failure message over-claims.** The shipped squash probe (`git merge-base` +
`git commit-tree` + `git cherry`) is genuinely correct *in general*, not merely on the fixture: the
post-flight built the topologies the one-commit fixture cannot and measured TRUE for a **3-commit
squash** and for a **squash after main advanced** — strictly better than a naive per-commit
`git cherry`, which would return false on every real sprint. **But for a rebase-merge it returns
FALSE**, while the message says *"squash- or rebase-merged"*. The two forms are exactly
complementary and were measured on the same repo. Fix the prose, or detect both, before flipping.

**PF-3 — the production stale-ref case is still open, and the harness cannot see it.**
`cs_simulate_stale_local_main` ends with `git fetch`, so P6 **cannot distinguish** "fetches" from
"reads a pre-fetched ref". In production `gh pr merge` is **server-side and updates no local ref**,
so after a real PR merge **both** `refs/heads/main` and `refs/remotes/origin/main` are stale, and
Step 2.8 still fails. The local-first/origin-fallback ordering is exactly as ruled and is correct;
what is missing is that *something* must refresh the remote-tracking ref before the check. Invisible
to the harness by construction — do not expect a test to catch it.

## Canonical↔payload parity: only ONE file has a witness

Standing gap, named by the CR-107 post-flight. `SKILL.md` has a byte-parity test
(`skill-md-conditional-architect` S5). `close_sprint.mjs` has only an anchor-string grep.
**`cleargate-enforcement.md` has nothing** — which is exactly why its payload copy silently carried
the "strips gitignored" clause until a merge surfaced it. Worth a follow-on: one parity test over
the whole canonical→payload set rather than per-file witnesses.

## S5 is EXPECTED-RED after the CR-107 merge — do not chase it

The generated payload lags canonical `SKILL.md` from the moment CR-107 merges. Nothing blocks on
it: `.git/hooks/` carries one hook, it runs only the surface gate, and `gates.precommit` is
reachable only via an explicit `cleargate gate precommit`. **Do not run `prebuild` mid-sprint to
clear it** — `build-manifest.ts:317` also rewrites the *tracked* `cleargate-planning/MANIFEST.json`,
churning a tracked file on every run. `prebuild` runs **once, here at Gate 4**.

## Doc-truth correction owed to `sprint-context.md` Rule 6

It states that `gates.precommit` runs the cli typecheck + tests on outer-repo commits. **It does
not** — no git hook invokes it. The rule's practical instruction (run them by hand and report) is
still right; only its stated mechanism is wrong. Correct the wording at close.

---

## OPERATIONAL — recovering from a `state.json` ↔ `events.jsonl` divergence (CR-106, live from merge)

From the CR-106 post-flight round 2, measured. **This is live behaviour for the rest of this sprint
and for Gate 4**, so it belongs where whoever hits it will look.

`update_state.mjs` now refuses to write when the on-disk `state.json` does not byte-match
`fold(events.jsonl)`. The check is **byte-equality** (`validate_state.mjs:146-181`), not a coverage
floor — which is strictly stronger, so a story-dropping fold is a byte difference by construction and
cannot slip through. Four probes confirmed it: a subset log (folds to 13 of 18 stories) → refused; a
stale log after an out-of-log writer advanced `state.json` → refused; a truncated-last-event log →
refused; a consistent pair → succeeded normally.

**Recovery, measured working:**

```
rm .cleargate/sprint-runs/<sprint>/events.jsonl
# then re-run the transition
```

The genesis path re-synthesises the log from `state.json`, the transition applies, and **an advance
made by an out-of-log writer survives** — the post-flight verified a `CR-110 → Bouncing` change made
outside the log was still present afterwards. One command, no data loss.

**Two known wrinkles, neither blocking:**

1. **The two stderr lines contradict each other.** One says the log is the source of truth; the other
   says delete the log to recover. Since no re-fold-from-log path exists, **the cache wins in
   practice** — the safe direction, but the prose is wrong. Worth a follow-on: either ship a
   re-fold-from-log path or stop claiming the log wins.
2. **The check runs before migration**, so a pre-v3 `state.json` sitting beside a v3-folded log
   false-positives. Unreachable from first-party code (nothing writes that combination), and cleared
   by the same `rm` remediation.

**Lock safety on the new refusal path — confirmed structurally, not just by the cases exercised.**
The release is registered **once at acquire** (`process.on('exit')`, inside `acquireLock`), not per
exit site, so coverage is dominated by the registration point and adding an in-lock early return
cannot leak a lock. That is exactly the property BUG-044's M6/T1 finding was after. One pre-existing
residual, unchanged by this CR: a throw in the two-syscall window between lockfile creation and
handler registration leaks, self-healed by the stale-holder steal.

---

## Wave-12 additions (2026-08-29)

### `events.jsonl` is untracked, and nothing has decided whether it should be

`git check-ignore` returns nothing for `.cleargate/sprint-runs/SPRINT-39/events.jsonl` — it is not
ignored, merely **untracked**. CR-106 introduced it as the new append-only source of truth for
execution state while `state.json` (the derived cache) **is** tracked. That pairing is backwards on
its face: the derived artifact is versioned, the source of truth is not.

It is not urgent, because the genesis path re-synthesises a log from `state.json` on first use, so a
fresh clone self-heals rather than breaking. But it means the sprint's actual transition history —
every state change, in order, with timestamps — exists only on this machine and vanishes with the
worktree. **Decide at Gate 4:** track it (history survives, and `checkFoldDrift` gains a versioned
reference), or ignore it explicitly (silence the ambiguity, accept the cache as the shipped record).
Doing neither leaves it in the current accidental state.

### A leaked atomic-write temp in the sprint-run tree

`.cleargate/sprint-runs/SPRINT-39/.session-totals.json.tmp.G5Ptvh` — orphaned by the token-ledger
hook's tmp+rename on 2026-08-27, two days stale.

**Verified safe before proposing removal:** parsed both files and compared. Same two session keys,
no key present in the tmp but missing from the live file, and the live file's output counter is
strictly higher (3,281,678 vs 1,752,454). It is a **strict subset, fully superseded** — no data loss
in deleting it.

**Not deleted.** It is untracked, and the standing rule is to ask before killing untracked work.
Flagging rather than acting; one `rm` at Gate 4 if the human agrees.

The finding underneath it is the reusable one: the hook's atomic write **leaks its temp on
interruption**. One orphan is harmless; the pattern means every interrupted agent run can leave
another in the sprint tree, and anything that globs the sprint directory will eventually meet one.
Note the dotfile shape — `.session-totals.json.tmp.*` did not match a `*.tmp.*` glob and was only
found by `find`, so a casual check will report the tree clean when it is not.

### Attribution re-corruption: occurrence 18

The same eight items (`BUG-047`, `BUG-048`, `BUG-049`, `BUG-050`, `BUG-062`, `CR-109`, `EPIC-055`,
`EPIC-057`) were re-stamped `sprint_cleargate_id: "SPRINT-39"` again during wave 12. Diffed first —
one hunk per file, that line only, no other change — then reverted. Tally recorded in BUG-048 §3.5.

**This is the 18th occurrence in a single sprint.** The standing close-gate obligation stands:
re-verify attribution *immediately* before `close_sprint.mjs`, because any dispatch between the last
check and the close re-corrupts it.


---

## ⛔ BLOCKING HAZARD — do NOT run `cleargate stamp` on templates at this close

**Found by CR-108 TPV, 2026-08-29. This is a live footgun in the close pipeline itself.**

`cleargate stamp` **corrupts all eight authoring templates today, on `main`, with no CR-108
involvement.** Measured against real copies of the shipped files:

```
Bug.md · CR.md · story.md · epic.md · initiative.md · hotfix.md · spike.md · Sprint Plan Template.md
    → reason=created   phantom-block-prepended=true   (8 of 8)
```

Root cause `stamp-frontmatter.ts:54` — `hasFrontmatter = raw.trimStart().startsWith('---')`. When an
`<instructions>` block precedes the frontmatter, the check reads "no frontmatter", so the function
**prepends a phantom block and demotes the real fields to inert body text** below a second `---`
fence. `bug_id`, `status`, `severity` all leave the machine-readable block. Exit clean, `changed:
true`, **no warning**.

**Why this matters right now:** `prep_doc_refresh.mjs:160` — the Gate-4 doc-refresh checklist
generator — emits the instruction

> `Modified .cleargate/templates/*.md (run `cleargate stamp <path>`)`

and the same at `:165/:170/:175` for `.cleargate/knowledge/*.md`. **SPRINT-39 modifies eight
templates across two trees, so this close's checklist will list them and instruct exactly the
command that corrupts them.** Following the generated checklist as written destroys the frontmatter
of every template this sprint shipped.

**Action at Gate 4: when `.doc-refresh-checklist.md` lists a `cleargate stamp` item for any template
or knowledge file, PUNT it and record the reason.** Do not run it. The stamp fields are cosmetic
metadata; the frontmatter it would eat is not.

Tracked as **BUG-067** (filed per TPV obligation O1). Not fixed in SPRINT-39 — CR-108 neither
creates nor touches the defect, and `stamp-frontmatter.ts` internals are on both the item's and the
plan's Do-NOT-modify list.

**The exposure grows the day CR-108 merges.** Today only 16 files (8 templates × 2 trees) begin with
`<instructions>`; a 523-file corpus census found **zero work items** carrying the block. After
CR-108, *every newly scaffolded item* carries it — so the first agent that runs `cleargate stamp` on
a fresh item before hand-cleaning it silently loses `bug_id`/`status`/`severity` at exit 0. CR-108
does not cause the defect; it widens the blast radius from 16 files to every item authored from that
day forward. That is the argument for fixing BUG-067 early in the next sprint, not eventually.


---

## Sprint-report obligations added in wave 12

**1. `cr078_init.test.sh`'s SAFETY assertion is sprint-number-rotted.** Its trailing check hardcodes
`expected SPRINT-34`, so it has failed on every checkout since SPRINT-34 closed — in worktrees and
the main checkout alike. Confirmed pre-existing and unrelated to CR-110; correctly left unfixed
(outside the declared surface). It is the single permitted red in CR-110's acceptance line.

Report it as its own finding, not as a footnote. A safety assertion pinned to a sprint number stops
being a safety assertion the moment that sprint closes — it becomes a permanent red that everyone
learns to scroll past, which is how [[BUG-066]]'s vacuous passes survived unnoticed. Same failure
class, opposite polarity: one always-green that proves nothing, one always-red that protects
nothing.

**2. The `18/18/0/0` figure in the M4 dispatch package was a homonym error.** Both TPV agents landed
on this independently: `gate-section-index-pinning`'s real acceptance is `tests 14 · pass 14 · fail 0
· skipped 0`. The `18` is a **criteria count printed inside S1a's and S6's test names**, not a test
count. The underlying Rule-3/4 claim (`18 = 16 pinnable + 2 known-unpinnable`) is verified **true**
and unchanged — only the number quoted as an acceptance target was wrong. Two independent
confirmations of the same correction is worth recording; the figure had been propagating through
dispatches all sprint.

**3. Two consumers of `sprint_context.md` were missing from the plan's Rule-4 analysis** —
`cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts` (asserts `## Mid-Sprint
Amendments` is the last `## ` heading) and `collect.ts:540` `extractSprintGoal`. Both are
**heading-text keyed, not positional**, so the Rule-4 conclusion holds — but the plan reached the
right answer on incomplete evidence. Worth reporting as a near-miss: the conclusion survived, the
reasoning that produced it did not cover the ground it claimed to.


## ORCHESTRATOR RULING — CR-110's two plan deviations (2026-08-30)

**Both deviations are APPROVED, retroactively and explicitly.** They add a compaction-proof anchor
to `SKILL.md` §0.5 and a reference-only "verdict reads the check" pointer to §E.2. Both implement
Task Breakdown rows that already existed in writing, both land inside CR-110's declared file
surface, and the second is deliberately reference-only so `SKILL.md` never becomes a second copy of
`reporter.md`'s derivation instruction — which is the [[BUG-041]] shape G7 exists to prevent, in the
other file. Good judgement.

**But the `orchestrator_confirmed: true` field was set without an orchestrator confirmation.** I
confirmed neither during the run; there was no exchange. The Developer's report is transparent about
this and states its basis — *"pre-existing written instruction, not a unilateral scope call"* — so
this is a **redefinition of the field, openly declared**, not a fabricated exchange. That distinction
matters and the transparency is why it was catchable.

The redefinition is still wrong. `orchestrator_confirmed` is a machine-readable signal that a
human-in-the-loop step **happened**. If "the instruction already implied it" satisfies the field,
then every in-scope deviation self-satisfies it and the field stops carrying information — precisely
when it is most needed, which is when a deviation is defensible and the reviewer is inclined to wave
it through.

**Same shape as BUG-045's Developer**, where the return channel carried a confirmation the durable
artifact did not. Recurring twice in one sprint makes it a contract gap, not an agent slip: the
Developer agent definition does not state that the field may only be set by an actual orchestrator
reply. Fix in the agent definition next sprint; flashcarded meanwhile.


---

## Two CR-110 findings that no assertion can reach (post-flight §5)

Both surfaced by reading the shipped prose as an engineer who has to follow it — the judgement the
mutation gate explicitly cannot make. Neither blocks the merge; both need a decision.

### 1. The anti-duplication guard structurally forbids a verdict slot in the Brief

`SKILL.md` §E.2 mandates the goal verdict as the **first** line of the close Brief, with a literal
enum slot. `reporter.md`'s new Brief puts it **second**, and as a meta-instruction rather than a
slot. That looks like a Developer shortcut and is not: the clean fix — an angle-bracketed
`<met | partial | missed>` slot — **would trip G7 as widened by TPV amendment A5**, which now
catches the backticked form, the definition-site paste, and the three-bullet list.

So the anti-duplication assertion prevents `reporter.md`'s Brief from ever carrying a verdict slot
at all. The Developer took the least-bad shape available to it. **This is a G7 scoping decision, not
a patch** — A5 was measured correct against five real duplication mutants, so narrowing it needs its
own measurement rather than a judgement call. Route to the next sprint with the tension stated:
the guard that stops the vocabulary drifting is the same guard that stops the consumer using it.

### 2. `GOAL_RELATION` ships with a consumer but no producer and no fallback

`SKILL.md` now instructs "for each milestone, quote it" — but `GOAL_RELATION` has **zero
occurrences** in `architect.md` and `architect-synth.md`, the agents that write milestone plans, and
there is no defined behaviour for a plan that lacks the line.

Measured against this very sprint: M3 has 7 occurrences and M4 has 13, because they were written
after the convention existed. **M0, M1 and M2 have 0/0/0** — so the instruction is unsatisfiable for
three of five milestones of the sprint that introduced it, and would be unsatisfiable for every
milestone of every sprint already in flight.

Not a defect in what CR-110 was asked to build — the CR's §3 surface does not include the architect
agent definitions. It is an **incomplete feature boundary**: the reading half shipped, the writing
half was never scoped. Needs either an architect-agent edit or an explicit absent-value fallback
("treat a missing `GOAL_RELATION` as `advances`"). File as a follow-up CR next sprint; do not widen
CR-110's surface at merge time.
