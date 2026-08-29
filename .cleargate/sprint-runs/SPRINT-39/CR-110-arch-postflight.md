# CR-110 — Architect post-flight

role: architect · Mode: Post-Flight · SPRINT-39 · wave 12 · M4 · CR-110
Commit `07eba094` on `story/CR-110`, worktree `.worktrees/CR-110`, cut from `sprint/S-39` @ `ac3e07f3`.
Every claim below was measured in this session. Nothing was accepted from the Developer's, QA-Red's,
TPV's or QA-Verify's report.

**Worktree integrity.** `git -C .worktrees/CR-110 status --porcelain` snapshotted before and after
this dispatch — byte-identical, two untracked lines both times
(`CR-110-dev.md`, `CR-110-qa.md`, the two reports written into the worktree by earlier dispatches).
`HEAD` still `07eba094635ccef15c34d877ad8f82d4f84c13ef`. **I wrote nothing to the worktree.** All
scratch work is out-of-tree under the session scratchpad; `close_sprint.mjs` was never invoked;
`init_sprint.mjs` was never run against the live sprint tree; `npm run prebuild` was never run.

---

## 1. Blast radius of the `init_sprint.mjs` change — the state pair cannot be torn

**Question asked:** does the new advisory code run before, after, or interleaved with CR-106's
genesis-and-fold path, and can it produce `state.json` without `events.jsonl` (or vice versa) while
still exiting 0 with no advisory?

**Answer: strictly after, and no — the torn pair is unreachable from the new code.**

### 1.1 Ordering, by line number in the committed file

`.worktrees/CR-110/.cleargate/scripts/init_sprint.mjs` (374 lines post-commit):

| Line | Statement |
|---|---|
| `:268-270` | `genesisSeed` → `synthesizeGenesisEvents()` → `fold()` (CR-106 path) |
| `:272` | `fs.mkdirSync(sprintDir, …)` |
| `:274` | `atomicWrite(stateFile, state)` — **state.json lands** |
| `:280` | `writeEventsFile(eventsFile, genesisEvents)` — **events.jsonl lands** |
| `:282-350` | CR-045 `sprint-context.md` block |
| `:330-343` | **the new CR-110 advisory** |
| `:346-347` | ctx tmp+rename |
| `:352-369` | CR-078 `.active` sentinel |

The new code sits **56 lines below** the second of the two state writes. It is not interleaved and
there is no code path that reaches it before either write.

### 1.2 Fault injection — measured, not reasoned

I copied the worktree's `.cleargate/scripts` + `.cleargate/templates` into an out-of-tree scratch
repo and injected `throw new Error(...)` at the exact advisory site (`:337`):

```
EXIT=1
Error: FAULT-INJECTED at CR-110 advisory site   (at main … init_sprint.mjs:337:13)
files after fault:  events.jsonl (428 B)   state.json (548 B)     <- BOTH present
.active:            No such file or directory
```

Both halves of the pair survive a hard throw at the new site. What is lost on such a fault is
`sprint-context.md` and the `.active` sentinel — a pre-existing property of the CR-045/CR-078
ordering that any throw in that block produces, and it exits **1**, loudly. The specific failure
mode the dispatch asked me to rule out — *torn pair, no advisory, exit 0* — is **structurally
impossible**: the pair is complete before the advisory is reachable, and the advisory has no
`return`, no `process.exit`, and no throwable operation (`String.split`, `RegExp.test`,
`String.replace`, `===`, `process.stderr.write`).

### 1.3 The advisory is observationally pure on the written file

I ran the identical scratch repo twice — once with the advisory block present, once with lines
`:330-343` excised — and diffed the two rendered `sprint-context.md` files:

```
3,4c3,4
< created_at: "2026-08-29T20:30:53.833Z"
---
> created_at: "2026-08-29T20:31:38.108Z"
```

The only difference is the two ISO timestamps. The advisory reads `ctxContent` and never assigns to
it. F2's "the render is free" property holds after the change, mechanically.

### 1.4 Two non-defect properties worth recording

- **The advisory has exactly one reachable state on a fresh init.** `init_sprint.mjs` never
  substitutes the Goal-Acceptance placeholder (by design — the orchestrator populates it later at
  §A.5), so on every fresh init the placeholder survives and the WARN always fires. Its silent
  branch is reachable only by editing the template or by a `--force` re-init over a populated file.
  This is correct, and §A.3→§A.5 in `SKILL.md` is exactly that handoff — the WARN at A.3 is the
  signal the orchestrator acts on at A.5. Not noise.
- **`--force` re-init discards a human-confirmed check — and the new advisory is the only witness.**
  Measured: populated the scratch `sprint-context.md` with a real mechanical check, re-ran with
  `--force`; the value was replaced by the placeholder and the WARN fired. Pre-existing CR-045
  whole-file behaviour, not new; CR-110 incidentally makes the loss announced rather than silent.

---

## 2. Fresh `cleargate sprint init`, end-to-end, out-of-tree — WORKS

Never run against the live tree. Scratch repo at
`…/scratchpad/scratchrepo/` carrying the worktree's `.cleargate/scripts/` (whole dir, so
`assert_story_files.mjs` resolves via its own `__dirname`), the worktree's post-CR-110
`sprint_context.md` template, an approved `SPRINT-99` plan with a `- **Sprint Goal:**` bullet and a
§2.4 Lane Audit table, and one approved story file. `cleargate sprint init` shells out to exactly
this — `sprint.ts:496-502` spawns `bash run_script.sh node <repo>/.cleargate/scripts/init_sprint.mjs
<id> --stories <csv>` and returns the script's own exit code (no `--force`).

```
$ node .cleargate/scripts/init_sprint.mjs SPRINT-99 --stories STORY-999-01
EXIT=0
stdout: Initialized state.json for sprint SPRINT-99 with 1 stories
stderr: WARN: Goal Acceptance Check unresolved — populate sprint-context.md §Goal Acceptance Check
files:  events.jsonl  sprint-context.md  state.json      .active -> SPRINT-99
```

**Mutual consistency of the pair, measured** — not inferred from the source comment:

```
fold(events.jsonl) === state.json : true      (JSON.stringify equality, both read from disk)
```

`state.json` carries `schema_version: 3`, `lane: "standard"`, `lane_assigned_by: "sdr-lane-audit"`
(so the §2.4 fallback parsed; no lane WARN), and `last_action: "transition STORY-999-01 → Ready to
Bounce"` — the fold's output, exactly as CR-106 designed. **This is the first run of the CR-106
genesis path and the CR-110 advisory in combination, and it is clean.**

**Rendered section, in the right place:**

```
11:## Sprint Goal        (goal spliced: "Prove init works end to end after CR-106 and CR-110.")
15:## Goal Acceptance Check
21:## Locked Versions
…
71:## Mid-Sprint Amendments      <- still the last ## heading
```

**Populated-value paths, on the real flow** (populated the template, re-ran init):

| Recorded value | exit | stderr |
|---|---|---|
| `npm test exits 0` (mechanical) | 0 | *(empty)* |
| `not-mechanically-verifiable — walkthrough sign-off stands in.` | 0 | *(empty)* |

Neither false-fires. TPV mutant **M5** (advisory keyed on the token's presence) is killed by the
implementation itself, not only by the harness fixture.

### 2.1 The second, unnamed consumer — verified green post-change

TPV flagged `cleargate-cli/test/scripts/init-sprint-context.red.node.test.ts` as an unnamed consumer
asserting `## Mid-Sprint Amendments` is the file's last `## ` heading. It hardcodes
`REPO_ROOT = path.resolve(__dirname,'..','..','..')` (`:39`) and cannot be pointed at a worktree, so:

- Ran it as-is against the main checkout (pre-merge baseline): **tests 3 · pass 3 · fail 0 · skipped 0.**
- Replicated all twelve of its assertion points against the render produced by the **worktree's**
  script and template: **12/12 PASS** — six required headers present, `## Sprint Goal` (char 337)
  before `## Locked Versions` (char 805), `## Mid-Sprint Amendments` last, frontmatter block present,
  `sprint_id` matched, both timestamps ISO-8601.

It stays 3/3 after merge.

### 2.2 Every other consumer of `sprint-context.md` / the template — checked, all safe

`command grep -rl 'sprint.context'` over `.cleargate/scripts/`, `cleargate-cli/src/`, and both hook
trees returns five files. Each inspected:

| Consumer | Mechanism | Effect of the new section |
|---|---|---|
| `init_sprint.mjs` | writer | the change itself |
| `cleargate-cli/src/dashboard/collect.ts:540-558` `extractSprintGoal` | finds `## Sprint Goal` **by name**, returns first non-empty line, stops at next `#` | none — new section is inserted *after* the goal's content |
| `cleargate-cli/src/init/detect-test-stack.ts` | writes `gate-checks.json` only; never parses the template's sections | none |
| `cleargate-cli/src/commands/init.ts:335,341` | emits a `§Test Stack` advisory string | none |
| `.cleargate/scripts/test/cr077_eviction.red.sh:100` | `grep -q "## Test Stack"` on the canonical template | none — verified `## Test Stack` still present post-change |

No positional/`section(N)` consumer exists: the plan's proof holds — `sprint_context` is in neither
`readiness-gates.md`'s gate blocks nor `TEMPLATE_FOR`.

**Incidental duplication, non-blocking:** the new `extractSectionFirstNonEmptyLine`
(`init_sprint.mjs:56-72`) is a second implementation of the algorithm already in
`collect.ts:540-558`. They live in different repos and different languages, `cleargate-cli` is not
reachable from a worktree, and the M4 plan named neither as reusable — so this is not a duplication
kick-back. It is worth knowing they exist and differ in one detail: `collect.ts` terminates on any
line starting with `#`, the new helper only on `^## `. No consequence on today's template.

---

## 3. Citation integrity — TWO stale-citation findings, one of them a live trap for CR-111

This commit moves line numbers in four files. Exact shift maps, derived from `git diff -U0` hunk
headers and **verified empirically** by locating each cited line's text in the post-commit file:

| File | Old range | Shift | Net |
|---|---|---|---|
| canonical `SKILL.md` | 1–45 / 46–211 / 212–230 / 231–703 / 704–797 | +0 / +5 / +15 / +26 / +32 | 797 → 829 |
| canonical `reporter.md` | 1–27 / 28–42 / 43–274 | +0 / +19 / +21 | 274 → 295 |
| `init_sprint.mjs` (both trees) | 1–40 / 41–296 / 297–327 | +0 / +33 / +47 | 327 → 374 |
| `sprint_context.md` (both trees) | 1–14 / 15–67 | +0 / +6 | 67 → 73 |

### 3.0 First, a correction to the M4 plan's premise: **there is no live/canonical drift today**

N2 states *"`SKILL.md` HAS DRIFTED. Every live line number in an M4 item is wrong for the tree you
will commit."* Measured at `ac3e07f3`:

```
md5  .claude/skills/sprint-execution/SKILL.md                       8c1807fd7053edb3d6672bf14f9c963f
md5  cleargate-planning/.claude/skills/sprint-execution/SKILL.md    8c1807fd7053edb3d6672bf14f9c963f
diff .claude/agents/reporter.md  vs canonical                       IDENTICAL
```

Both pairs are **byte-identical**, 797 and 274 lines. Whatever drift existed when M4 was planned was
resolved by a live re-sync mid-sprint. Consequence: **CR-110 re-creates the drift**, in the opposite
direction — after merge, canonical is +32 / +21 lines ahead of live until the Gate-4 re-sync. Any
citation written from here to Gate 4 must say which tree it means.

### 3.1 FINDING 1 (blocking-adjacent for wave 13) — `plans/M4.md:1880` and `:2109` will misdirect CR-111's Developer

`M4.md:1880` reads: *"**F5 — VERIFIED:** canonical `SKILL.md:312` (live `:303`) reads
`File-naming: *.red.node.test.ts (immutable post-Red)`"*. Measured:

| Tree | Where that text actually is |
|---|---|
| canonical @ `ac3e07f3` | **`:313`** |
| live (today) | **`:313`** |
| canonical @ `07eba094` (post-merge) | **`:339`** |

So the citation is **already off by one today**, the "(live `:303`)" parenthetical is off by ten and
rests on a drift that no longer exists — and after merge it is off by **27**.

The trap: post-merge, canonical `SKILL.md:312` is

```
**Do not run `git worktree add` inside `mcp/`.** It is a nested git repo. …
```

— a real, plausible, load-bearing line about a completely unrelated subject (BUG-046's own fix). A
CR-111 Developer told "canonical `SKILL.md:312` reads `File-naming: …`" who opens `:312` finds
prose that looks deliberate and is wrong. This is precisely the wrong-file-edit-that-looks-right the
dispatch anticipated, and CR-111 is the next item out of the gate.

**Repair before the CR-111 dispatch is written:** `M4.md:1880` → `SKILL.md:339` (canonical,
post-CR-110) / `:313` (live), and drop the stale `(live :303)`. `M4.md:2109` carries the same
`SKILL.md:312` reference and needs the same repair.

### 3.2 FINDING 2 — a stale citation in a **shipped** doc, in both trees, outside the declared surface

`.cleargate/knowledge/cleargate-enforcement.md:574` — and its byte-identical
`cleargate-planning/` mirror — reads:

> …the `cleargate sprint init` story-file assertion (`init_sprint.mjs:140`)…

Measured: that text (`// Always enforce (v2-equivalent behavior; CLEARGATE_ADVISORY=1 for
break-glass)`) is at `:140` before this commit and at **`:173`** after. Post-merge `:140` is a blank
line.

This matters more than the sprint-artifact citations because `cleargate-enforcement.md` **ships to
every install**. It is not in CR-110's declared file surface (which the plan states is exhaustive),
so fixing it in-commit would itself be a surface breach. **Route it as a separate orchestrator
citation-repair commit** — the same route `69869a6f chore(SPRINT-39): … repair the close_sprint
citation misdirect` already established this sprint.

### 3.3 The rest — full repair table

Wave 12/13 item files carry **zero** citations into any of the four changed files (grepped
`CR-108`, `CR-110`, `CR-111` in `pending-sync/` for every `<file>:<N>` form: CR-108 cites only
`hotfix.ts`/`stamp*.ts`/`CLAUDE.md`/templates; CR-110 only `close_sprint.mjs`; CR-111 only
`story.md`/`developer.md`/`readiness-predicates.ts`). **Nothing inside the wave-13 item needs repair.**

Everything below is a sprint-artifact or archived-item citation. `→` = post-merge canonical value.

| Citing file | Cite | Repair |
|---|---|---|
| `plans/M4.md:1880`, `:2109` | `SKILL.md:312` | **→ `:339`** (Finding 1) |
| `plans/M4.md:1761` | `SKILL.md:35-55` (§0.5 span) | → `:35-60` |
| `plans/M4.md:1794` | `SKILL.md:695` / inline `:700` | → `:721` / `:726` |
| `plans/M4.md:1169` | `SKILL.md:714` | → `:746` |
| `plans/M4.md:1170` | `SKILL.md:445` | → `:471` |
| `plans/M4.md:1256` | `SKILL.md:454` | → `:480` |
| `plans/M4.md:1333` | `SKILL.md:723` | → `:755` |
| `plans/M4.md:810` | `SKILL.md:277` | → `:303` |
| `plans/M4.md:963`, `:975` | `SKILL.md:286` | → `:312` |
| `plans/M4.md:1652` | `init_sprint.mjs:239-289` | → `:272-322` |
| `plans/M4.md:1758` | `init_sprint.mjs:270-275` | → `:303-308` |
| `plans/M4.md:1760` | `init_sprint.mjs:284-286` | → `:317-319` |
| `plans/M4.md:1788` | `init_sprint.mjs:242` | → `:275` |
| `plans/M4.md:1790` | `init_sprint.mjs:270` | → `:303` |
| `plans/M4.md:1792` | `init_sprint.mjs:249` | → `:282` |
| `plans/M4.md:201`, `:2875` | `init_sprint.mjs:221` | → `:254` |
| `plans/M4.md:469` | `init_sprint.mjs:207` | → `:240` |
| `plans/M4.md:1073`, `:1131` | `init_sprint.mjs:231-233` | → `:264-266` |
| `plans/M4.md:1709`, `:1726` | `sprint_context.md:13` | **no change** — `:13` verified unchanged |
| `plans/M4.md:1763` | `reporter.md:26` | **no change** — `:26` verified unchanged |
| `sprint-context.md:115` | `SKILL.md:277` | → `:303` (flashcard prose; historical, low value) |
| `SPRINT-39_Decomposition_Surfaces.md:130` | `SKILL.md:277` | → `:303` |
| `plans/M2.md:834`, `:839` | `SKILL.md:229` | → `:244` |
| `plans/M2.md:1445`, `STORY-054-06-arch-postflight.md:51` | `SKILL.md:128` | → `:133` |
| `STORY-054-03-qa.md:25` | `SKILL.md:101-108` | → `:106-113` |
| `BUG-046-arch-postflight.md:183`/`:176`, `GATE-4-PREFLIGHT.md:139` | `SKILL.md:202` / `:204` | → `:207` / `:209` |
| `CR-106-arch-postflight.md:217`, `:544` | `SKILL.md:266` | → `:292` |
| `CR-110-tpv.md:103`, `:592` | `SKILL.md:702` | → `:728` |
| `CR-110-tpv.md:109` | `SKILL.md:697` | → `:723` |
| `CR-110-tpv.md:110`, `:150` | `SKILL.md:45`, `:42` | **no change** — positions held (`:45`'s *text* changed in place) |
| `CR-110-tpv.md:248`, `:594` | `reporter.md:99` | → `:120` (QA-Verify already re-measured this) |
| `CR-089_Payload_Telemetry_Hygiene.md:71` | `reporter.md:63` | → `:84` |
| `CR-106_…Event_Log.md:253`, `BUG-044-arch-postflight.md:77/450/451` | `init_sprint.mjs:231-233` | → `:264-266` |
| `BUG-044-tpv.md:122`, `CR-106-arch-postflight.md:367/524/542` | `init_sprint.mjs:221` | → `:254` |
| `CR-106-arch-postflight.md:398` | `init_sprint.mjs:227-234` | → `:260-267` |
| `CR-106-arch-postflight.md:474-479` | `:239-289`,`:270-275`,`:284-286`,`:242`,`:270`,`:249` | → `:272-322`, `:303-308`, `:317-319`, `:275`, `:303`, `:282` |
| **`cleargate-enforcement.md:574` (BOTH trees)** | `init_sprint.mjs:140` | **→ `:173`** (Finding 2 — shipped doc) |

Pre-existing, **not** CR-110's: `.cleargate/FLASHCARD.md:91` cites `SKILL.md:277` for a claim
BUG-046 already rewrote — stale since wave 10, and a historical record besides. No action.

### 3.4 The Developer's own in-commit citations — checked, and they are correct

N7 predicted the Developer's `§A.5`/`§E.2` citations would shift within their own commit. Checked
every cross-reference the commit introduces: all four (`reporter.md` → `SKILL.md §0.5`; `SKILL.md`
§0.5 → §E.2; §4 → §0.5/§E.2; §E.2 → `reporter.md §Goal Acceptance Check`) are **section references,
not line numbers**. There is not a single new `<file>:<N>` citation in the diff. N7 is satisfied by
construction, which is the right way to satisfy it.

---

## 4. The `GOAL_RELATION` worked example — the claim is TRUE and the example is in-convention

**4a — is "SPRINT-39's M3 and M4 are both `off critical path`" true against this sprint's record?**
Yes, from the record, not from inference:

- `plans/M4.md:39`, in a fenced block at the top of the milestone: `GOAL_RELATION (M4, all eight
  items): off critical path`, followed by `:69`: *"Report the goal `met` on M1+M2 and report M4
  separately."*
- `plans/M3.md` carries `GOAL_RELATION: off critical path` at seven sites, including `:1986` (the
  M3 post-flight verdict line) and `:2033` (*"now confirmed by machine witness rather than
  argument"*), and `:1668` records the human's O5 adoption.

**4b — does the sentence over-claim?** No, and this is worth saying because it easily could have.
The shipped text is *"…while the sprint's goal verdict, decided on M1+M2 evidence, is unaffected."*
It asserts only that the verdict is decided on M1+M2 evidence and is not moved by M3/M4's relation.
It does **not** assert `met` — which would have been an assertion about a verdict no Reporter has
spoken yet, in a sprint with two items still unmerged. The claim it does make is true whatever the
verdict turns out to be. Correctly hedged where hedging is the accurate thing.

**4c — does the example leak sprint-specific content into a file that installs everywhere?**
No new class of leakage. Measured on canonical `SKILL.md` at `ac3e07f3`: **21 concrete work-item /
sprint IDs already present**, including `SPRINT-19` at `:90` in the same worked-example register,
plus `BUG-021`, `BUG-033`, `BUG-034` ×3, `CR-016/036/046`×5`/078`×2`/079/081/101/107`×2,
`EPIC-033`, `STORY-020-02`, `STORY-033-02/03`×2. `reporter.md` carries 18 (`SPRINT-01/08/09`×3`/18`,
`STORY-013-07`, `STORY-014-10`, `STORY-022-04/08`, …). CR-110 adds **one** `SPRINT-39` (`:251`) and
four `CR-110` provenance tags. That is the file's established convention, applied consistently.
Nothing is hard-coded in a way that changes behaviour for a downstream install — it is one
illustrative sentence explicitly framed *"Worked example:"*.

---

## 5. What the tests cannot see — reading the prose as the engineer who has to follow it

TPV's own finding was that two HTML comment lines satisfied all six G5/G6 assertions before A1. A1
raised the floor to "inside a `## ` section whose heading contains Goal". That is a real
improvement and the Developer cleared it honestly. Below is the part no assertion reaches.

### 5.1 What is genuinely good, and why

- **The §A.5 instruction is executable, and the sequencing is right.** I checked the one thing that
  could have made it unexecutable: does `sprint-context.md` exist when §A.5 runs? `SKILL.md` §A.3
  (`:153-165`) runs `init_sprint.mjs`, which writes `sprint-context.md`; §A.5 (`:211`) is where the
  new derive-and-record paragraph sits. **Init precedes the halt**, so the placeholder is on disk
  waiting to be replaced. Had the order been reversed, an orchestrator hand-creating the file would
  have made init's `!existsSync(ctxOut)` guard skip the render entirely and silently lose the
  frontmatter and goal splice. It is not reversed. The A.3 WARN → A.5 write loop is coherent.
- **The degenerate case is named, not hand-waved.** `not-mechanically-verifiable` plus the
  qualitative evidence, with an explicit escalation (*"a goal for which no check can be stated at
  all is usually a goal too vague to execute against; surface that to the human"*). That is a real
  instruction with a real fallback and a real out.
- **The two-way pointer works.** `reporter.md` → `SKILL.md §0.5` for the vocabulary; `SKILL.md`
  §E.2 → `reporter.md §Goal Acceptance Check` for the full instruction. Neither restates the other.
  G7 wanted no duplication and the design genuinely delivers it rather than gaming it.

### 5.2 FINDING 3 — the two Brief templates now contradict each other

Both are live, both are authoritative for the same rendered artifact:

`SKILL.md` §E.2 (canonical `:721-725`):
```
> **Goal:** `<verbatim sprint goal>` — **Verdict: met | partial | missed.**      <- line 1
> Delivered N stories, M epics. Observe: X bugs, …                               <- line 2
```
plus `:728`: *"The verdict line is mandatory and **is the first line of the Brief**."*

`reporter.md` §Post-Output Brief (`:61-66`):
```
> Delivered N stories, M epics. Observe: X bugs, …                               <- line 1
> **Goal:** `<verbatim sprint goal>` — state the verdict derived from `## Goal    <- line 2
>   Acceptance Check` (vocabulary defined in `SKILL.md` §0.5); name each
>   milestone's `GOAL_RELATION`.
```

Two divergences, both created by this commit (before it, `reporter.md`'s Brief had no Goal line at
all, so the templates differed only in completeness):

1. **Ordering.** `SKILL.md` mandates the verdict as line 1. `reporter.md` — the file the Reporter
   actually executes — puts it at line 2. The shipped behaviour will violate `SKILL.md`'s explicit
   mandate.
2. **Slot vs. instruction.** Every other line of that blockquote is a fill-in template
   (`N stories`, `M epics`, `X bugs`). The Goal line is a meta-instruction *about* what to say. An
   agent rendering the block literally emits *"state the verdict derived from `## Goal Acceptance
   Check`…"* where a verdict belongs.

**Why the obvious fix is not available, and why I am not asking for it in this commit.** The clean
repair is `> **Goal:** \`<verbatim sprint goal>\` — **Verdict: <met | partial | missed>.**` as line
1. That reintroduces the enum into `reporter.md` and trips **G7 as widened by TPV A5** (markup
stripped, gap class `[^a-z]{1,12}`, standalone-backticked-token clause) — a measured kick-back
criterion. So the anti-duplication assertion **structurally prevents `reporter.md`'s Brief from
carrying a verdict slot at all**; the only conforming shapes are a pointer or prose, and the
Developer picked the least-bad one available. This is the assertion shaping the prose rather than
the intent shaping it — which is exactly the class of thing that no assertion can catch and is
therefore worth writing down. It needs its own decision (reconcile the two templates, and decide
whether G7 should permit an angle-bracketed slot), not a rushed same-commit patch that either
violates a measured kick-back or has the Developer amend its own acceptance test.

**Severity: non-blocking.** The verdict is spoken in chat at a human-attended Gate 4, per OD-4 it is
never written to any file, nothing gates on it, and the orchestrator reading `SKILL.md` §E.2 sees
the correct shape. A malformed Brief line is visible and correctable in the moment.

### 5.3 FINDING 4 — the `GOAL_RELATION` half ships a consumer with no producer and no fallback

`reporter.md:38-41`: *"**For each milestone**, quote that milestone's own `GOAL_RELATION` line
verbatim from its plan."* Measured against this sprint's own plans:

```
M0.md: 0 occurrences      M1.md: 0      M2.md: 0      M3.md: 7      M4.md: 13
```

For SPRINT-39's own close, that instruction is **unsatisfiable for three of five milestones**, and
`reporter.md` states no fallback for an absent line — no advisory, no "record `not-recorded`",
nothing. The CR modelled its whole degradation story on `sprint_context.md`'s §Test Stack idiom
("leave it stubbed, emit a one-line advisory, continue") and applied that idiom carefully to the
Goal Acceptance Check while leaving `GOAL_RELATION` with no equivalent.

The producer side is thinner still. `GOAL_RELATION` occurs in exactly two canonical files after this
commit — `reporter.md` (3×, consumer) and `SKILL.md` (2×, orchestrator contract) — and **zero times
in `architect.md` or `architect-synth.md`**, the two agents that actually author milestone plans.
`SKILL.md` §4's paragraph is passive-voice with no actor (*"Every milestone plan states one line
near its top"*) and, unlike the 🎯 Goal-check bullet six lines above it (*"Pass the sprint goal
verbatim in the Architect's dispatch prompt… Plans that don't reference the goal go back to the
Architect with a re-dispatch"*), it carries neither a dispatch instruction nor an enforcement.

**This is not a Developer deviation.** The §Q5-B ruling scoped the cost to *"one enum, one line of
Reporter instruction"* and the plan's file surface is declared exhaustive and excludes
`architect.md`. The gap is in the ruling, and it surfaces only now that both halves are readable
together. G6 asserts that `off critical path` is *accepted* and does not force the verdict; nothing
asserts the line is ever *produced*.

**Severity: non-blocking, route as follow-up.** Recommended shape: one sentence in `architect.md`
(emit `GOAL_RELATION` at the top of every milestone plan) plus one fallback sentence in
`reporter.md` (absent line → say so in the Brief, do not infer). Both are single lines; neither
belongs in this commit.

### 5.4 FINDING 5 (minor) — `SKILL.md §0.5` is the naming site, not the definition site

`reporter.md:34-35`: *"The verdict vocabulary itself lives in `SKILL.md` §0.5 — quote it from there
when you speak the Brief."* §0.5 (`:45`) **names** `met / partial / missed`; the **definitions**
(*"`met` = goal achieved as written. `partial` = … `missed` = …"*) live in §E.2's 🎯 note, canonical
`:728` — the site TPV itself called "the enum's definition site" when it built mutant M6a from it.
A Reporter that follows the pointer gets the three tokens but not their meanings. Harmless for
speaking the Brief (the token is what is spoken); imprecise as a statement about where the
vocabulary lives. One-word repair (`§0.5/§E.2`) at the next touch.

### 5.5 Observation, not a finding

`## Goal Acceptance Check` now exists as a `## ` heading in two files with two different meanings —
`sprint_context.md:15` (a **data** section an agent writes a value into) and `reporter.md:28` (an
**instruction** section). Today's assertions all scope by file, so nothing is at risk. Recorded
because a future file-agnostic grep for "the Goal Acceptance Check section" would hit both.

---

## 6. Structural checks — clean

- **Syntax, independently re-run:** `node --check` OK on **both** `init_sprint.mjs` copies.
- **Mirror parity, independently re-measured:** `diff -q` clean on `init_sprint.mjs` and
  `sprint_context.md` across the two trees.
- **Schema fidelity:** the shipped `## Goal Acceptance Check` block is **byte-identical** to the M4
  plan's `### Schema change — verbatim placement` block (`M4.md:1713-1717` vs
  `sprint_context.md:15-19`, `diff` empty) — including the one-unwrapped-line pin from the
  `ORCHESTRATOR AMENDMENT (2026-08-29, CR-110 TPV A2)`.
- **No new dependency**, no `package.json` touched, no `.ts` surface, no `src/`.
- **Do-NOT-modify list honoured:** `close_sprint.mjs`, `readiness-gates.md`, `sprint_report.md`,
  `state.json`/`state.schema.json` all absent from the diff.
- **Cross-Cutting Rule 4 not engaged**, re-verified independently: `sprint_context` appears in
  neither `readiness-gates.md`'s gate blocks nor `TEMPLATE_FOR`. Zero `section(N)` indices move.

### 6.1 MANIFEST drift — expected, quantified, and owed at Gate 4

`cleargate-planning/MANIFEST.json` pins a sha256 per payload file. Measured at three revisions
(all four paths; `git show` at each rev, hashed):

| Path | @`main` | @`ac3e07f3` (merge base) | @`07eba094` |
|---|---|---|---|
| `.cleargate/templates/sprint_context.md` | MATCH | MATCH | **STALE** |
| `.cleargate/scripts/init_sprint.mjs` | MATCH | **STALE** (CR-106) | **STALE** |
| `.claude/agents/reporter.md` | MATCH | MATCH | **STALE** |
| `.claude/skills/sprint-execution/SKILL.md` | MATCH | **STALE** (BUG-046/CR-107) | **STALE** |

This commit takes the sprint's MANIFEST drift on these paths from **2 → 4**. That is **correct
behaviour**: Cross-Cutting Rule 2 makes payload regeneration a Gate-4/close step, and two paths were
already drifted before CR-110 for exactly that reason. Recorded so the Gate-4 doc-refresh carries
the number rather than rediscovering it. (`npm run prebuild` deliberately not run.)

---

## 7. Verdict and routing

Nothing here blocks the merge. I looked for a reason to hold it and did not find one: the state pair
is provably untearable by the new code, a fresh init works end to end with `fold(events) ===
state.json` on the first combined run of CR-106 + CR-110, every consumer of the changed template is
name-keyed rather than position-keyed, the mirrors are byte-identical, the shipped block matches the
plan byte for byte, and the self-referential worked example is factually true and correctly hedged.

Five findings, all off the critical path of *this* merge, in priority order:

| # | Finding | Severity | Route |
|---|---|---|---|
| 1 | `plans/M4.md:1880`/`:2109` cite `SKILL.md:312`; correct value is `:339` post-merge (`:313` today, and `(live :303)` is doubly wrong). Post-merge `:312` is BUG-046's unrelated `mcp/` warning — a wrong line that reads as deliberate. | **Repair before the CR-111 dispatch is written** | orchestrator, pre-wave-13 |
| 2 | `cleargate-enforcement.md:574` (both trees) cites `init_sprint.mjs:140`; correct value is `:173`. Shipped doc, outside CR-110's declared surface. | Non-blocking | separate citation-repair commit (precedent: `69869a6f`) |
| 3 | `SKILL.md` §E.2 and `reporter.md` §Post-Output Brief now disagree on the Goal line's position and its shape (slot vs. instruction). G7+A5 structurally forbid the clean fix. | Non-blocking | follow-up CR; needs a G7 decision, not a patch |
| 4 | `GOAL_RELATION` has a consumer (`reporter.md`, "for each milestone") but no producer instruction in `architect.md`/`architect-synth.md` and no absent-value fallback. Unsatisfiable for M0/M1/M2 of this very sprint. | Non-blocking | follow-up CR: one line in `architect.md`, one fallback line in `reporter.md` |
| 5 | `reporter.md` points at `SKILL.md §0.5` for the vocabulary; the definitions are at §E.2 (`:728`). | Minor | fix at next touch |
| — | MANIFEST drift 2 → 4 on the changed paths. | Expected (Rule 2) | Gate-4 doc refresh |

Findings 1 and 2 are the only ones that cost anything if deferred, and both are line-number repairs
in files this commit does not own.

## Script Incidents

None. No `run_script.sh`-wrapped invocation was made from this dispatch, and no incident JSON was
produced. All measurement ran read-only against the worktree or inside the out-of-tree scratch repo.

## Flashcards

One recorded (`#citations #dogfood-split #danger`): a canonical-only edit re-creates live/canonical
line drift that a mid-sprint re-sync had already erased — cite the tree, not just the line.

---

POST-FLIGHT: PASS
