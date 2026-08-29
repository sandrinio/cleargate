role: architect · Mode: POST-FLIGHT · SPRINT-39 · wave 12 · CR-108

# CR-108 — Architect post-flight

Subject: cli `story/CR-108` @ `b4ae1976` · outer `.worktrees/CR-108` @ `ac7c9801`.
Every number below was re-measured in this dispatch. Where I reproduce a QA number I say so;
where I correct one I show the measurement.

---

## 0. Tree state (read-only contract)

```
git -C .worktrees/CR-108 status --porcelain
?? .cleargate/sprint-runs/SPRINT-39/CR-108-dev.md
?? .cleargate/sprint-runs/SPRINT-39/CR-108-qa.md

git -C cleargate-cli status --porcelain
(empty)
```

`cleargate-cli` is clean. The outer worktree carries **two untracked files** — the Developer and
QA reports. Both were present when this dispatch opened and neither was written or modified by
me. `git -C .worktrees/CR-108 rev-parse HEAD` = `ac7c9801`; `git -C cleargate-cli rev-parse HEAD`
= `b4ae1976`. The main checkout's `git status --porcelain` line count is **27**, unchanged from
session start.

**DevOps action item (not optional):** those two untracked reports are the only copy. The sprint
already has the precedent — `e2ed28db docs(CR-110): add dev + qa reports (worktree-untracked,
preserved by DevOps)`. Commit or copy them out **before** `git worktree remove`.

All scratch work was done in
`/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/49c00a07-a425-4af9-9ac6-97ed8ed5ee64/scratchpad/`
(two throwaway fixture repos, `fx-repo/` and `fx2/`). No `close_sprint.mjs`, no `npm run prebuild`,
no live `.claude/` re-sync.

---

## 1. The `fail 14` decomposition — adjudicated. QA's attribution is CORRECT, and the number has since moved to 13.

**Verdict: none of the failures is a CR-108 defect. The merge is not blocked by the suite.**

### 1.1 My full-suite measurement

One run, `env -u CLEARGATE_META_ROOT npm --prefix cleargate-cli test`, 461s:

```
tests 2647 · suites 927 · pass 2633 · fail 13 · cancelled 0 · skipped 1 · todo 0
```

**`fail 13`, not QA's 14 and not the Developer's 12.** The full failing-name list, verbatim from
the runner:

| # | Test | Class |
|---|---|---|
| 1 | `story: every {Token} surviving in scaffolded output is a member of the human-fill whitelist` | template-visibility (N3) |
| 2 | `epic: …same…` | template-visibility (N3) |
| 3 | `initiative: …same…` | template-visibility (N3) |
| 4 | `hotfix: …same…` | template-visibility (N3) |
| 5 | `bug: bug_id is a full id like "BUG-NNN" — never bare digits, never doubled` | template-visibility (N8) |
| 6 | `cr: cr_id …` | template-visibility (N8) |
| 7 | `epic: epic_id …` | template-visibility (N8) |
| 8 | `initiative: initiative_id …` | template-visibility (N8) |
| 9 | `cleargate new story --epic EPIC-054 yields STORY-054-08, not STORY-100` | template-visibility (N10) |
| 10 | `initiative created_at_version / updated_at_version are NOT the literal "cleargate@{semver}"` | template-visibility (N12) |
| 11 | `calling stampFrontmatter directly on a freshly scaffolded (instructions-intact) file corrupts the real frontmatter — see BUG-067` | N6b, expected-red (RULING 1) |
| 12 | `Capability Surface + Post-Output Brief sections are byte-identical between live and canonical` | CR-110-caused drift |
| 13 | `exits 2 when no MCP URL or token is configured` (`test/commands/sync.node.test.ts`, 10.7s) | pre-existing network baseline |

`13 = 10 + 1 + 1 + 1`.

### 1.2 The 10 are template-visibility — proven in both directions, not asserted

Two targeted runs of the same file, same commit, differing only in `CLEARGATE_META_ROOT`:

```
# A — no override; REPO_ROOT resolves to the outer MAIN checkout (un-normalized templates)
npx --prefix cleargate-cli tsx --test --test-concurrency=1 \
    cleargate-cli/test/commands/new-command.node.test.ts
  → tests 57 · pass 46 · fail 11

# B — override pointed at the CR-108 worktree (normalized templates)
CLEARGATE_META_ROOT=.../.worktrees/CR-108 npx --prefix cleargate-cli tsx --test \
    --test-concurrency=1 cleargate-cli/test/commands/new-command.node.test.ts
  → tests 57 · pass 56 · fail 1   (N6b only)
```

Run A's 11 failing names are, exactly, rows 1–11 of the table above. The delta between A and B is
**precisely the 10**, and the only variable is which tree's `.cleargate/templates/` the test reads.
That is a proof, not a plausibility argument: the implementation is byte-identical across the two
runs. The mechanism is `new-command.node.test.ts:129-132` —
`REPO_ROOT = process.env.CLEARGATE_META_ROOT ? path.resolve(…) : path.resolve(import.meta.url, '..','..','..','..')`
— whose fallback is the outer **main checkout working tree**, and `.worktrees/CR-108` contains no
`cleargate-cli/` (BUG-046, 0 tracked files), so the two halves cannot see each other.

**QA reproduced `56/1` and the Developer reproduced `56/1`; I reproduce `56/1` and additionally
reproduce the complementary `46/11`.** All three agree.

### 1.3 The CR-110 attribution — independently confirmed, and one of the two has already self-resolved

**Failure 12 (`reporter-content.node.test.ts`, "Mirror parity over inserted sections"): CR-110's,
proven by the assertion diff itself.** I ran the file targeted (`tests 33 · pass 32 · fail 1`) and
read the `ERR_ASSERTION` payload. `actual` and `expected` differ by exactly one inserted line:

```
> **Goal:** `<verbatim sprint goal>` — state the verdict derived from `## Goal Acceptance Check`
> (vocabulary defined in `SKILL.md` §0.5); name each milestone's `GOAL_RELATION`.
```

That is CR-110's text. `git log -1 -- cleargate-planning/.claude/agents/reporter.md` →
`07eba094 feat(CR-110): sprint goal acceptance check`, which is on `sprint/S-39` via merge
`8ea385e7`. The live copy `.claude/agents/reporter.md` is dated **Aug 1**, 21772 bytes, against
canonical's 23210 — gitignored, per-machine, never re-synced. `cmp` confirms they differ at
char 1701. Neither CR-108 commit touches `reporter.md` in any tree (`git show --name-status` on
both, above in §3.1). **QA's attribution is exactly right.**

**Failure 13 in QA's run (`skill-md-conditional-architect.red.node.test.ts` S5, "payload SKILL.md
is byte-identical to canonical") no longer fails.** I re-ran it: S5 **passes**. Reason:
`cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md` has mtime
`Aug 30 01:04` and now `cmp`s byte-identical to canonical. The npm payload was regenerated between
QA's measurement and mine — corroborated by `cleargate-planning/MANIFEST.json` showing as ` M` in
the main checkout, which only `npm run prebuild` writes. I did **not** run it.

I checked whether a test regenerates it: S5 itself does not (`skill-md-conditional-architect.red.node.test.ts:401-431`
only reads and, on mismatch, shells `diff`). No test in the default glob invokes `prebuild`. So it
was an out-of-band manual/agent action on this shared machine — which is exactly the volatility
QA flagged in its second flashcard, and it is confirmed rather than merely suspected.

### 1.4 What "green" means for CR-111 (wave 13) and for Gate 4 — state it this way

The sprint's expected-red set has grown, and it is now three-layered. Say this precisely in the
CR-111 dispatch, because two of the three layers are **not** reproducible from a git checkout:

| Layer | Count today | Nature | Clears when |
|---|---|---|---|
| Pre-existing network baseline (`sync.node.test.ts`) | 1 | Stable; documented in `sprint-context.md:57-60` | never in this sandbox — ignore |
| `new-command.node.test.ts` N6b (BUG-067) | 1 | Stable; deliberate expected-red, RULING 1 / O2 | when BUG-067 ships (out of sprint) |
| `new-command.node.test.ts` cross-repo template-visibility | 10 | **Transient** — a function of *which tree the runner's `REPO_ROOT` lands in* | the instant CR-108's outer half reaches the main checkout's working tree (see §2) |
| `reporter-content.node.test.ts` live↔canonical | 1 | **Machine-state** — not in git, not reproducible elsewhere | a manual `.claude/` re-sync (Gate-4 doc-refresh, or never) |
| `skill-md-…` payload parity | 0 *(was 1)* | **Machine-state, volatile** — flips on any `prebuild` | already cleared; will re-red on the next canonical edit until prebuild runs |

**Therefore:**

- **CR-111's acceptance line must be a targeted count, not a full-suite count.** A full-suite
  number for wave 13 is unfalsifiable: two of its failures depend on whether someone ran
  `prebuild` or `cleargate init` on this laptop in the interim. The CR-111 dispatch should state
  the expected full-suite total as **`fail 2` after CR-108 merges** (N6b + sync-network) and treat
  any of the 3 machine-state/transient rows as *named-and-excused*, never as a regression.
- **For Gate 4:** the two derived-copy rows (`payload`, `live .claude/`) are already on the
  `.doc-refresh-checklist.md` path — `npm run prebuild` and the live re-sync are both Gate-4 steps
  per Cross-Cutting Rule 2 and the CLAUDE.md dogfood-split rule. They must be closed at Gate 4 in
  that order, and the suite re-run **after** both, or the close reads a green that is an artifact
  of when someone last ran a build script.

### 1.5 On the Developer's `12 = 10 + 1 + 1`

QA is right that it was wrong when written, and right that it does not change the acceptance
verdict. I add one thing QA did not: **the Developer's arithmetic was not merely undercounted, it
was unfalsifiable by construction.** It named 12 by *predicting* the classes and adding them, then
matched the total. The two it missed are precisely the two that no amount of reasoning about
CR-108's own diff can surface, because they live outside git. The correct method is the one QA
used and I repeated: dump the failing **names**, then attribute each one. Recommend a flashcard
(§7).

**No finding in this section blocks the merge.**

---

## 2. Merge ordering — confirmed, and stated as an executable procedure

QA's constraint is correct. I sharpen it in one respect that matters: **the binding condition is
not "merged to `sprint/S-39`" — it is "present in the outer MAIN checkout's working tree at
`/Users/ssuladze/Documents/Dev/ClearGate`."** `new-command.node.test.ts:131` resolves `REPO_ROOT`
by walking four directories up from the test file on disk. It reads the working tree, not a git
ref. Merging to `sprint/S-39` satisfies it only *because* the main checkout happens to be on
`sprint/S-39` right now. If the merge is performed from another worktree, or if the main checkout
is moved to another branch first, the 10 false reds persist and nothing warns.

### 2.1 Topology, measured

```
cli    main            = 82da563   (merge(BUG-045))
cli    story/CR-108    = b4ae197
       main IS an ancestor of story/CR-108  -> FAST-FORWARD available

outer  sprint/S-39     = f670c6aa
outer  story/CR-108    = ac7c9801
       DIVERGED — sprint/S-39 carries 12 commits story/CR-108 lacks (CR-106, CR-110, wave-12 docs)
       git merge-tree --write-tree sprint/S-39 story/CR-108  -> exit 0, ZERO conflicts
```

I verified the merge is clean with `git merge-tree --write-tree` (read-only; wrote no ref, touched
no index). File-overlap check: the 12 `sprint/S-39`-only commits touch
`.cleargate/templates/sprint_context.md` and **none** of the seven templates CR-108 modifies, and
do not touch `CLAUDE.md` in either tree. So the merge result for CR-108's file surface is exactly
CR-108's version.

The two repos share no index and no hook. `cleargate-cli` is gitignored in the outer repo, and per
Cross-Cutting Rule 6 / BUG-053 the cli repo has **zero** installed hooks. Nothing mechanical
enforces the order. This is the procedure:

### 2.2 The procedure

**Step 1 — outer half first.** From the outer **main checkout** (must be on `sprint/S-39`):

```
git -C /Users/ssuladze/Documents/Dev/ClearGate merge --no-ff story/CR-108
```

**Verify before proceeding — three checks, all from the main checkout:**

```
# a) the templates actually changed on disk (not just in a ref)
command grep -n 'bug_id:' .cleargate/templates/Bug.md
    -> expect  bug_id: "{ID}"        (NOT "BUG-{ID}")

# b) two-tree parity survived the merge
for f in .cleargate/templates/*.md; do diff -q "$f" \
    "cleargate-planning/.cleargate/templates/$(basename "$f")"; done
    -> expect no output (10/10 identical)

# c) the ANCHORED CLAUDE.md block-equal (N13's form — anchors are load-bearing, §Q5-A)
node -e '
const fs=require("fs");
const RE=/^<!-- CLEARGATE:START -->$([\s\S]*?)^<!-- CLEARGATE:END -->$/m;
const g=p=>{const m=RE.exec(fs.readFileSync(p,"utf8")); if(!m) throw new Error("no anchored block: "+p); return m[1];};
const a=g("CLAUDE.md"), b=g("cleargate-planning/CLAUDE.md");
console.log("block-equal:", a===b, a.length, "/", b.length);'
    -> expect  block-equal: true 11948 / 11948
```

**Step 2 — cli half.** From `cleargate-cli/` (currently checked out on `story/CR-108`):

```
git -C cleargate-cli checkout main
git -C cleargate-cli merge --ff-only story/CR-108     # fast-forward is available
```

**Verify — this is the check that proves Step 1 reached the working tree:**

```
env -u CLEARGATE_META_ROOT npx --prefix cleargate-cli tsx --test --test-concurrency=1 \
    cleargate-cli/test/commands/new-command.node.test.ts
    -> expect  tests 57 · pass 56 · fail 1     (N6b only)
```

**If that reports `fail 11`, Step 1 did not land in the working tree.** Do not "fix" it with
`CLEARGATE_META_ROOT` — the override is scoped to targeted pre-merge runs only (TPV A6, FLASHCARD
2026-08-27 `#test-harness #cross-repo`), and setting it for a full-suite run reds other files.

**Step 3 — full suite, once, after both merges.**

```
env -u CLEARGATE_META_ROOT npm --prefix cleargate-cli test
    -> expect  fail 2   (N6b + sync.node.test.ts network)
    -> plus 0-2 machine-state rows (payload parity, live .claude/ reporter.md) per §1.4
```

**Step 4 — preserve the two untracked reports, then remove the worktree.**

Reversing steps 1 and 2 is not a git error; it is a measurement error that nothing catches. That is
the whole hazard, and it is why it needs to be written down rather than left to discovery.

---

## 3. `hotfix.ts` 211 → 122 — what changed that no test covers

The delegation is functionally correct: `hotfix-id-archive-scan.red.node.test.ts` is 14/14 through
the new delegate, and I invoked `cleargate hotfix new` end-to-end against a scratch fixture (exit 0,
`HOTFIX-001_my_probe.md`, correct content). QA established that and I do not repeat it.

The question I was asked is different, and the answer is: **five observable changes, four of them
uncovered by any test, and one published claim that is false.**

### 3.1 The two commits, for the record

```
cli   b4ae1976   CHANGELOG.md +11 · src/cli.ts +13 · src/commands/hotfix.ts +14/-103
                 · src/commands/new.ts +350 (new) · src/lib/work-item-type.ts +38
outer ac7c9801   7 templates × 2 trees (all ins==del, no line-count change)
                 · CLAUDE.md ×2 (1/1 each) · CR-108 item · 4 hook-generated wiki files
```

`211 − 103 + 14 = 122`. **QA's correction is right; the `211 → 66` figure is wrong in three
places** — the commit message body, `CR-108-dev.md` §"five unwitnessed requirements" item 2, and
the item's own ticked Task Breakdown row. Neither commit touches `SKILL.md` or `reporter.md` in
either tree, confirming §1.3.

### 3.2 Observable behaviour changes in `cleargate hotfix new` — measured by invocation

All five reproduced in a scratch fixture repo with the shipped code.

**(a) stdout prefix changed. User-visible, zero test coverage.**

```
pre-CR   [cleargate hotfix new] created: …/HOTFIX-001_my_probe.md    (hotfix.ts:206 of the 211-line file)
post-CR  [cleargate new] created: …/HOTFIX-001_my_probe.md           (new.ts:348)
```

I grepped the whole meta-repo for consumers of the old string (`command grep -rnF
"[cleargate hotfix new]"` over `cleargate-cli/{src,test,scripts}`, `.cleargate/scripts`, `.claude`,
`cleargate-planning`) — **zero hits**. So nothing breaks. But a user who runs
`cleargate hotfix new` now gets output labelled with a command they did not type.

**(b) stderr prefix changed for slug validation.** `[cleargate hotfix new] slug must match …` →
`[cleargate new] slug must match …`. The load-bearing substring `slug must match ^[a-z0-9-]+$` is
preserved (as `hotfix.ts:99-100`'s comment claims and the integration test pins) — only the prefix
moved.

**(c) The cap check and the slug check swapped order. Different message for the same input.**

Old `hotfix.ts`: slug validation at `:156`, cap check at `:162`. New `hotfix.ts`: cap check at
`:113-119`, then delegate at `:121` — and slug validation now lives inside `newHandler`
(`new.ts:213-216`), i.e. *after* the cap. Measured with three hotfixes already in `pending-sync/`:

```
$ cleargate hotfix new "Bad Slug"
Hotfix cap: ≤3 per rolling 7-day window. Currently 3 active. …      exit 1
   (pre-CR-108 this printed:  [cleargate hotfix new] slug must match ^[a-z0-9-]+$)
```

Same exit code, different diagnosis. Narrow input class; no test covers it.

**(d) NEW failure mode: a stale lockfile bricks both commands. Measured.**

`newHandler` acquires an `O_EXCL` lock at `.cleargate/delivery/.new-lock` (`new.ts:58`, `:76-91`,
`:286-289`) with a bounded budget of 150 attempts × 20 ms. `cleargate hotfix new` had **no lock at
all** before. Reproduced:

```
$ touch .cleargate/delivery/.new-lock
$ cleargate new bug lock-probe
[cleargate new] another "cleargate new" is currently allocating an id — lock held at
  …/.cleargate/delivery/.new-lock. Try again shortly.
exit 2   (elapsed ~6s wall, of which 3s is the retry budget)
```

Three observations, in descending order of consequence:

1. **"Try again shortly" is wrong advice for the common case.** There is no TTL and no
   pid-liveness check, so a lock orphaned by `^C`, SIGTERM or a crash is *permanent*. Retrying
   never succeeds. The message should name the recovery — `rm .cleargate/delivery/.new-lock` — the
   way it already helpfully names the path.
2. **There is no `process.on('exit')` release**, although M4's Reuse table pointed the Developer at
   BUG-044's `'wx'` + `process.on('exit')` idiom for exactly this. The release is a straight-line
   call at `new.ts:341`, deliberately outside the `try` (the comment at `:294-298` explains why,
   and that reasoning is sound for the *exit-seam* problem). The leak window is short — only
   synchronous `readdirSync`/`writeFileSync` sit between `:286` and `:341` — but it is real, and
   the consequence of hitting it is a permanently dead command.
3. **`acquireLock` re-throws non-`EEXIST` errors** (`new.ts:86`) from *outside* any try/catch, so
   an `EACCES`/`EROFS` on `.cleargate/delivery/` surfaces as an unhandled exception with a Node
   stack trace rather than a `[cleargate new] …` line.

None of this blocks CR-108 — the lock is a requirement (N5/N5b, TPV A2) and it works. It is a
follow-on hardening item.

**(e) Output content changed, by design, via `hotfix.md`.** A file produced by `cleargate hotfix
new` today differs from a pre-CR one in two lines:

```
- Output location: .cleargate/delivery/pending-sync/HOTFIX-{ID}-{Slug}.md
+ Output location: .cleargate/delivery/pending-sync/{ID}_{SLUG}.md
- created_at_version: "cleargate@0.5.0"
+ created_at_version: "strategy-phase-pre-init"
```

Both are the intended F8/F10 fixes. I note them only because of §3.3.

### 3.3 FINDING — the CHANGELOG makes a false claim about a shipped command

`cleargate-cli/CHANGELOG.md`, under `## Unreleased` → `### Added`:

> `cleargate hotfix new` is now a thin alias over this command; **its behaviour is unchanged**.

That sentence is false in five measured respects — (a), (b), (c), (d) and (e) above. This is the
one artifact in the whole change set that ships to users as the record of what changed, and it
tells them nothing changed.

**Severity: non-blocking, but fix before publish.** Suggested replacement clause:

> `cleargate hotfix new` is now a thin alias over this command. Its ids, filenames and cap
> behaviour are unchanged; its output prefix is now `[cleargate new]`, id allocation takes a
> short-lived lock under `.cleargate/delivery/`, and the hotfix cap is now checked before slug
> validation.

CHANGELOG accuracy is not gated by anything — no test reads it — which is precisely why it needs a
human to have looked. I looked.

---

## 4. `CLAUDE.md` — the block-equal claim holds; the new directive is correct; the bullet under it is now self-contradictory

### 4.1 The `11948/11948` claim — verified, in the anchored form

Run from `.worktrees/CR-108`:

```
ANCHORED   block-equal: true 11948 / 11948
UNANCHORED block-equal: true 10792 / 10792
```

The claim is exact. The anchored/unanchored relation (`11948 > 10792`) holds, satisfying TPV A3's
relational assertion, and the unanchored form once again returns a confident `true` about the
wrong 10792 characters — the §Q5-A trap, still live, still silent. Post-merge this will read
identically from the main checkout, since `sprint/S-39` does not touch `CLAUDE.md`.

### 4.2 The directive itself — correct as shipped

```
- Run `cleargate new <type> "<slug>"` to scaffold the frontmatter, id, and file path (types:
  `epic`, `story`, `cr`, `bug`, `sprint`, `initiative`, `spike`, `hotfix`; `story` additionally
  requires `--epic <EPIC-NNN>`), then author the body. `cleargate new` reads
  `.cleargate/templates/` internally — do not hand-copy a template file.
```

Checked against the implementation, not against the commit message:

- **The eight types are exactly `SCAFFOLD_REGISTRY`'s eight keys.** Read at
  `work-item-type.ts:100-109`: `story, epic, cr, bug, initiative, sprint, hotfix, spike`. Match.
- **`--epic` is genuinely required for `story` and only for `story`** (`new.ts:242-258`). Verified
  by invocation: `cleargate new story foo` → *"story requires --epic <EPIC-NNN> — the parent epic
  this story belongs to."*, exit 1.
- **`cleargate new` is reachable pre-member.** `GATED_COMMANDS` (`cli.ts:38-50`) is an explicit
  allowlist of `push/pull/sync/sync-log/conflicts/admin *`; `new` is not in it, so the `preAction`
  gate at `:79-95` returns early. Correct — this is a local-planning command. (Consequence: the
  pre-member enumeration elsewhere in `CLAUDE.md` — *"only local-planning commands are reachable:
  `init`, `join`, `whoami`, `wiki *`, …"* — is worded as exhaustive and now omits `new`. One word
  to add; nobody is harmed today.)

**One nit worth a word.** The doc writes the slug as `"<slug>"`, shell-quoted. `SLUG_RE`
(`new.ts:54`) is `^[a-z0-9-]+$`, which can never contain a character requiring quoting. The quotes
have no purpose and they *suggest* a phrase is acceptable — `cleargate new bug "gate index off by
heading"` exits 1. Drop the quotes and the invited mistake goes with them.

### 4.3 FINDING — the next bullet now contradicts the one CR-108 just wrote

Two adjacent lines in the same list, both installed into every repo by `cleargate init`:

```
:33  Run `cleargate new <type> "<slug>"` …           <- writes  BUG-046_my_slug.md   (UNDERSCORE)
:34  Save drafts to `.cleargate/delivery/pending-sync/{TYPE}-{ID}-{Name}.md`.   (HYPHEN)
```

`:34` is doubly wrong after CR-108: the separator is a hyphen, which `derive-bucket.ts:63-66` keys
on the first *underscore* (F9 — 24 of 490 items already produce dead `[[ID]]` wikilinks this way);
and `{TYPE}-{ID}` under the newly-locked full-id semantic reads as `BUG-BUG-046`, F3's own defect
class written in prose.

**This is not CR-108's defect and it is already filed — `BUG-057` owns `:34` verbatim, `approved:
false`, in no wave.** CR-108 did not introduce it. What CR-108 *did* do is put a directive that
produces underscore filenames immediately above a directive that tells the agent to write hyphen
ones, so the contradiction is now visible in a two-line window rather than latent. That raises
BUG-057's practical priority; it does not block this merge. Flagged for the orchestrator's
backlog, not for DevOps.

---

## 5. Citation integrity

`hotfix.ts` lost 103 lines and gained 14; `work-item-type.ts` gained 38 lines *appended after line
72*. I audited every `hotfix.ts:N` and `work-item-type.ts:N` citation across the surfaces named in
the dispatch. **The headline is: there are 61 of them, and CR-111 — the immediate consumer — cites
none.**

### 5.1 The good news, measured first

- **`command grep -n "hotfix\.ts\|work-item-type\.ts\|new\.ts\|SCAFFOLD_REGISTRY" .cleargate/delivery/pending-sync/CR-111_*.md` → zero hits.**
  CR-111 does not cite either file. Its dispatch is safe from this class entirely.
- **`.cleargate/knowledge/` → zero line-number citations** into either file. The single mention
  (`readiness-gates.md:48`) cites `work-item-type.ts:detectWorkItemTypeFromFm` by **symbol**, and
  that function still exists. Shipped docs are clean.
- **`work-item-type.ts:8`, `:14`, `:29`, `:66` are UNMOVED.** I diffed landmark positions before
  and after: the union, `FM_KEY_MAP`, `PREFIX_MAP` and the `basename.includes(prefix)` line are all
  at identical lines, because CR-108's 38 lines were appended below them. Every citation to those
  four — and that is most of them, across `M0.md`, `M1.md`, `M4.md`, `EPIC-054`, `STORY-054-02`,
  `BUG-051`, `BUG-065`, `FLASHCARD.md:25` — **remains correct.**
- **All ten templates changed by equal insert/delete counts, so no template line moved.** Measured:
  `Bug 144→144 · CR 148→148 · Sprint Plan Template 140→140 · epic 192→192 · hotfix 111→111 ·
  initiative 122→122 · story 241→241 · spike 177→177`. **CR-111's M4 file-surface citation —
  *"one table row between `:195` and `:196`"* — is unaffected and correct.** I confirmed `:195` is
  `| Unit tests |` and `:196` is `| E2E / acceptance tests |` in the post-CR-108 `story.md`.
- **All 10 templates are byte-identical across the two trees** post-commit (`diff -q`, 10/10,
  including the two Do-NOT-modify ones). Cross-Cutting Rule 1 satisfied.

### 5.2 The stale set — inventory

`hotfix.ts:N` citations, counted per artifact:

| Artifact | count | status |
|---|---|---|
| `plans/M4.md` | 31 | ~all stale (see below) |
| `pending-sync/CR-108_Universal_Work_Item_Scaffold.md` | 16 | all stale |
| `pending-sync/BUG-045_Hotfix_Id_Scan_Ignores_Archive.md` | 4 | all stale (`:164`, `:164-166` — deleted code) |
| `FLASHCARD.md` | 3 | stale — **do not rewrite** (append-only) |
| `sprint-context.md` | 3 | stale — **these are the ones that matter** |
| `plans/M0.md` | 2 | stale |
| `plans/M1.md` | 1 | stale |
| `pending-sync/SPRINT-39_Decomposition_Surfaces.md` | 1 | stale |
| `plans/M2.md`, `M3.md`, `.cleargate/knowledge/**` | 0 | clean |

Post-CR-108 `hotfix.ts` (122 lines) retains only four landmarks, all moved:

| Landmark | was (211-line file) | now | notes |
|---|---|---|---|
| `HotfixCliOptions` | `:24-32` | **`:26-34`** | |
| `countActiveHotfixes` | `:86-125` (M4 cites `:74-115`) | **`:51-88`** | |
| 7-day mtime filter | `:115` (M4 cites `:106-108`) | **`:79-81`** | |
| `cwd` seam | `:152` (M4 cites `:143`) | **`:110`** | |

Everything else cited is **deleted, not moved**: `maxHotfixId` (`:54-79`), `resolveTemplatePath`
(`:128-130`), `SLUG_RE` (`:40`), the id allocation/pad block (`:164-175`), the substitution
(`:188-191`) and the write (`:192`). Their successors live in the new file:

| Old | New |
|---|---|
| `maxHotfixId` | `new.ts:119-140` `maxIdForType` (+ `:150-172` `maxStorySeqForEpic`) |
| `resolveTemplatePath` | `new.ts:260-272` (listing membership, not path join) |
| `SLUG_RE` | `new.ts:54` |
| id alloc + pad | `new.ts:302-312` |
| substitution | `new.ts:314-322` + `renderTemplate` `new.ts:175-181` |
| write | `new.ts:332-333` |

`work-item-type.ts` — one landmark moved: **`WORK_ITEM_TRANSITIONS` `:77-87` → `:115-125`.**
Affects `M4.md:1542` (`:77-87`), `M1.md:1039` (`:86`), and — already stale before this story, at
`:75` — `STORY-054-02:217`, `EPIC-054:102`, `EPIC-054:139`.

### 5.3 FINDING — the Task Breakdown row that owns citation integrity states a falsehood

CR-108's own ticked row, the last one, whose entire purpose is N7 ("re-measure every hotfix.ts line
citation in the item after the edit"):

> `- [x] Re-measure every hotfix.ts line citation … — hotfix.ts is now 66 lines post-CR-108 (was
> 211), so every citation in this item is stale again as of this commit — expected and out of
> scope to chase further (**no downstream item cites hotfix.ts line numbers after this story**).`

Two errors in one row: `66` is wrong (§3.1), and the parenthetical is **false**. `sprint-context.md`
carries three (`:301`, `:319`, `:320`), `FLASHCARD.md` three, `M4.md` thirty-one. This is exactly
the "wrong edit that looks right" pattern the dispatch names — a citation-hygiene row that closes
itself by asserting there is nothing left to check.

### 5.4 What to repair, and what to leave alone

**Repair (3 lines, high forward value).** `sprint-context.md` is read at the top of every dispatch,
including CR-111's. Its three citations are stale *and* two of them carry claims CR-108 has now
discharged:

1. **`:301`** — the R12 guard note: *"CR-108 therefore cannot ship the strip without settling
   `sprint_cleargate_id` in the same commit."* **This obligation is DISCHARGED.** OD-3 ruled no
   stripping, the shipped `renderTemplate` (`new.ts:175-181`) strips nothing, and I verified all
   eight authoring templates still begin with `<instructions>`, so `backfill_hierarchy.mjs:70`
   (`if (!raw.startsWith('---')) return null`) skips every scaffolded item — the exposure remains
   latent-zero exactly as R12's correction predicted. Annotate it discharged, or a future agent
   reads a satisfied guard as an open blocker.
2. **`:320`** — *"CR-108 generalising the allocator to all nine types would write a literal
   `cleargate@{semver}` into every new initiative."* **RESOLVED by this commit.** `initiative.md`
   now ships `strategy-phase-pre-init`; N12 pins it. Mark resolved.
3. **`:319`** — cites `hotfix.ts:179-181` for the three-substitution behaviour. Retarget to
   `new.ts:314-322`. Note the behaviour *widened*: there is now a fourth substitution,
   `{PARENT_EPIC_ID}`, applied for `story` only (`new.ts:319-321`; the token appears in exactly one
   template — I grepped: `story.md` alone).

**Also worth one line:** `sprint-context.md`'s §Adjacent Implementations table has no CR-108 row.
Add one naming `SCAFFOLD_REGISTRY` / `KNOWN_UNSCAFFOLDABLE` (`work-item-type.ts:90`, `:100-109`),
`newHandler` and `NEW_LOCK_BASENAME` (`new.ts:58`, `:202`) so wave 13 reuses rather than
re-derives.

**Leave alone.** Do **not** bulk-rewrite the 31 in `M4.md`, the 16 in the CR-108 item, or the 4 in
BUG-045. They are the historical record of executed work; every one describes a file state that was
true when written; and this sprint has already spent 13 repairs on citations. Rewriting 51 dead
offsets is a large edit with no forward consumer and a real chance of introducing a wrong one.
**One pointer note at the head of M4's CR-108 section — "`hotfix.ts` is 122 lines post-`b4ae1976`;
all `hotfix.ts:N` citations below describe the pre-merge file" — buys the same protection for one
line.**

**Do not touch `FLASHCARD.md`'s three.** It is append-only and dated; BUG-057 already set this
precedent explicitly. But see §7 — one card there is now contrary to a shipped ruling and needs a
*new* card, not an edit.

---

## 6. What no test can see

I read `new.ts` (350 lines) as someone who will maintain it, and I exercised its error paths
against a scratch fixture rather than reasoning about them.

### 6.1 The error messages — mostly good, and specifically good where it counts

| Input | Output | Exit | Verdict |
|---|---|---|---|
| `new stroy foo` (typo) | `unknown/unregistered work-item type "stroy". Registered scaffoldable types: bug, cr, epic, hotfix, initiative, spike, sprint, story.` | 2 | **Good.** Names the bad input, lists the whole valid set, sorted. This is what I was asked to check and the answer is yes. |
| `new proposal foo` | `"proposal" is a registered work-item type with no authoring template (see BUG-065) — cannot scaffold. No template is available for "proposal".` | 2 | **Good and, importantly, distinct.** A user learns the type is real but unscaffoldable, and gets a tracking id. The two rejection paths (`new.ts:223-229` vs `:231-237`) can never collapse into one. Mildly redundant — it says "no template" twice — and it does not say what to do instead, but there *is* nothing else to do: no `proposal.md` exists in either tree. Honest. |
| `new story foo` (no `--epic`) | `story requires --epic <EPIC-NNN> — the parent epic this story belongs to.` | 1 | **Good.** Names the flag, the format, and why. |
| `hotfix new "Bad Slug"` | `slug must match ^[a-z0-9-]+$ (got: "Bad Slug")` | 1 | Good, though prefixed `[cleargate new]` (§3.2b). |
| stale `.new-lock` | `another "cleargate new" is currently allocating an id … Try again shortly.` | 2 | **Weakest message in the file** — §3.2d. |

**One coherence gap.** Three user-input mistakes return two different exit codes: typo'd type → 2,
missing `--epic` → 1, bad slug → 1. The split follows an internal distinction (`new.ts`'s doc
comment: *"Exits 1 on validation failure, 2 on a resource/registry problem"*) that is invisible
from outside the CLI — from the user's chair a typo and a missing flag are the same mistake. It is
also the case that `cleargate` already overloads exit 2 for the membership gate (`cli.ts:93`). Not
worth churning now; worth knowing before anything scripts against these codes.

### 6.2 FINDING — the PostToolUse hook silently corrupts a freshly scaffolded item, and TPV §7 / BUG-067 say it cannot

This is the substantive discovery of this post-flight, and I proved it rather than inferred it.

**BUG-067 (`pending-sync/BUG-067_…md:127-128`) states:**

> The PostToolUse hook (`stamp-and-gate.sh:30`) runs **`stamp-tokens`**, a different command, so
> there is **no automatic trigger** — this fires only when a human or agent runs `cleargate stamp`
> by hand.

**That is false, and the reason it is false is that the analysis stopped at the command name.**
`stamp-tokens.ts:92` carries the identical sniff to `stamp-frontmatter.ts:54`:

```
stamp-frontmatter.ts:54   const hasFrontmatter = raw.trimStart().startsWith('---');
stamp-tokens.ts:92        const hasFrontmatter = rawContent.trimStart().startsWith('---');
```

`stamp-tokens` then takes the `else` branch (`:103-105`, `body = rawContent`), recovers the id from
the **filename** rather than bailing (`:107-113` — and `cleargate new`'s filenames always carry the
id), and re-serializes as `<new frontmatter>\n\n<entire original file>` (`:348-354`).

**Reproduced end-to-end** in a scratch fixture, using the shipped CR-108 code and the shipped
normalized templates, in the hook's real order (`stamp-and-gate.sh:30 → :36 → :52`):

```
$ cleargate new bug scaffold-probe
[cleargate new] created: …/BUG-001_scaffold_probe.md          exit 0
$ cleargate stamp-tokens …/BUG-001_scaffold_probe.md
[stamped] …/BUG-001_scaffold_probe.md (BUG-001)               exit 0     <- looks successful
$ cleargate gate check …
[cleargate gate] error: unable to detect work-item type from frontmatter in: …
$ # and the file itself:
frontmatter keys: stamp_error, draft_tokens
bug_id visible:   (GONE — demoted to body)
```

5917 → 6128 bytes. A phantom `---` block is now the file's frontmatter; the real one — `bug_id`,
`status`, `severity`, `parent_ref`, `ambiguity`, `context_source` — sits inert below a second fence.
`gate check` and `wiki ingest` then fail with a *misleading* message ("unable to detect work-item
type") rather than the accurate one they give on a pristine scaffold ("cannot parse frontmatter").
The hook exits 0 regardless, by design (`stamp-and-gate.sh:60`).

**Scoping — and this is why it is not a merge blocker:**

- `stamp-tokens.ts` is **untouched by CR-108 and by this sprint**: `git log -1` on it →
  `e8a78d1 release(cleargate): v0.24.2`, long pre-sprint.
- The defect is **already live for `hotfix`**: `hotfix.md` begins with `<instructions>` (I checked
  all eight — every one does), and the pre-CR `cleargate hotfix new` also stripped nothing. So
  today's shipped `cleargate hotfix new` already produces a file that `stamp-tokens` corrupts.
- CR-108 therefore **does not cause this**. It multiplies the blast radius from one type to eight,
  and its own `CLAUDE.md` edit now points every drafting agent in every install at `cleargate new`
  as the front door.

**Recommendation (not a merge gate):** widen BUG-067 to name `stamp-tokens.ts:92` alongside
`stamp-frontmatter.ts:54`, and **delete the "no automatic trigger" mitigation at `:127-128`** —
there is one, it is the PostToolUse hook, it fires on every Write/Edit under
`.cleargate/delivery/**`, and it is silent. Severity is already `P1-High`, so nothing changes
numerically; what changes is that the item currently under-describes its own reach, and the
under-description is the sentence a triager would read to defer it.

### 6.3 Two things I checked that are clean — stated so nobody re-derives them

- **`sprint_cleargate_id: null` in a scaffolded story is safe as shipped.** A scaffolded
  `STORY-054-01_probe.md` does carry `sprint_cleargate_id: null`, but the file opens with
  `<instructions>`, so `backfill_hierarchy.mjs:70` returns null and skips it entirely. The M0-R12
  guard is discharged, not evaded (§5.4).
- **Surviving human-fill tokens are exactly the intended set.** A scaffolded story leaves
  `{Action} {Benefit} {N} {Persona} {precondition}` and nothing else; frontmatter renders
  `story_id: "STORY-054-01"` / `parent_epic_ref: "EPIC-054"`. `{PARENT_EPIC_ID}` appears in
  `story.md` and no other template, so the story-only substitution cannot leak a literal elsewhere.

---

## 7. Flashcards — PROPOSED, deliberately not written

Following this sprint's convention (M4 plan §"Flashcards — PROPOSED", TPV §15): proposed here, not
appended. Grep-checked against `FLASHCARD.md`; none duplicates an existing card.

1. `2026-08-30 · #scaffold #frontmatter #hooks #danger · stamp-tokens.ts:92 carries the SAME`
   `raw.trimStart().startsWith('---') sniff as stamp-frontmatter.ts:54, and the PostToolUse hook`
   `runs stamp-tokens on every Write under .cleargate/delivery/**. A file that opens with`
   `<instructions> (every cleargate new output) gets a phantom frontmatter block prepended at exit`
   `0 — its real bug_id/status/severity demoted to body text. "The hook runs a DIFFERENT command"`
   `is not a mitigation until you check whether that command shares the defect. [SPRINT-39 CR-108`
   `post-flight]`
2. `2026-08-30 · #test-harness #reporting #danger · Never report a suite total by PREDICTING the`
   `failure classes and summing them — dump the failing NAMES and attribute each one. CR-108's dev`
   `predicted 12=10+1+1 and matched the total; the real set was 14, and the 2 misses were`
   `machine-state rows (npm payload, live .claude/) that no reasoning about the story's own diff`
   `can reach. [SPRINT-39 CR-108]`
3. `2026-08-30 · #cross-repo #test-harness · A cli test whose REPO_ROOT is`
   `path.resolve(import.meta.url,'..','..','..','..') reads the outer MAIN CHECKOUT'S WORKING`
   `TREE, not a git ref. "Merge the outer half to sprint/S-39 first" is only correct while the`
   `main checkout is ON that branch — state the condition as the working tree, and verify with a`
   `grep of the file the test reads. [SPRINT-39 CR-108 merge ordering]`
4. `2026-08-30 · #changelog #refactor #danger · A delegation refactor that keeps ids, filenames`
   `and exit codes identical still changes the stdout/stderr PREFIX, the order of two validation`
   `checks, and adds a lock whose stale-file failure mode is new. "Behaviour is unchanged" in a`
   `CHANGELOG is a claim no test checks — diff the old and new handler by observable output before`
   `writing it. [SPRINT-39 CR-108]`

---

## 8. Script Incidents

None. Every command in this dispatch was run directly (`git`, `npm --prefix`, `npx tsx`, `diff`,
`cmp`, `command grep`, `node -e`); no `.cleargate/scripts/` script was invoked, so `run_script.sh`
had nothing to wrap.

---

## 9. Summary of findings

**Merge-blocking: none.** I looked for one specifically in the place it would hide — the 3-failure
gap between the Developer's count and QA's — and it is not there. The 10 template-visibility reds
are proven transient by a controlled two-run experiment; the CR-110 row is proven by the assertion
diff and `git log`; the sync row is the documented baseline.

**Non-blocking, ordered by consequence:**

| # | Finding | Owner |
|---|---|---|
| 1 | **BUG-067 `:127-128` states there is "no automatic trigger" — false.** `stamp-tokens.ts:92` shares the defect and the PostToolUse hook runs it on every delivery-tree Write. Reproduced end-to-end. Pre-existing, not CR-108's; CR-108 multiplies it 1→8 types. | orchestrator — widen BUG-067 |
| 2 | **CHANGELOG says `cleargate hotfix new`'s "behaviour is unchanged".** False in five measured respects (stdout prefix, stderr prefix, cap/slug order, new stale-lock failure, template content). The only user-facing record of the change. | fix before publish |
| 3 | **`211 → 66` is wrong; actual `211 → 122`.** In the commit message, `CR-108-dev.md`, and the item's ticked Task Breakdown row. QA found it; I confirm the arithmetic (`211−103+14=122`). | correct before it reaches the sprint report |
| 4 | **The Task Breakdown's citation-integrity row asserts "no downstream item cites `hotfix.ts` line numbers"** — false: `sprint-context.md` ×3, `FLASHCARD.md` ×3, `M4.md` ×31. | correct the row |
| 5 | **`sprint-context.md:301/:319/:320`** — 3 stale citations, and two guard notes that CR-108 has *discharged* (`:301` no-strip, `:320` `{semver}`) but which still read as open obligations to a wave-13 agent. | repair before CR-111's dispatch |
| 6 | **`work-item-type.ts` `WORK_ITEM_TRANSITIONS` moved `:77-87 → :115-125`** — affects `M4.md:1542`, `M1.md:1039`. `:8/:14/:29/:66` are unmoved and every citation to those is fine. | low priority |
| 7 | **`CLAUDE.md:33` and `:34` now contradict each other** (underscore command above hyphen instruction). Already filed as BUG-057, `approved: false`. CR-108 makes it visible, not worse. | backlog — raise BUG-057's priority |
| 8 | **Stale-lock message advises "Try again shortly"** for a permanent condition; no TTL, no pid check, no `process.on('exit')` release; `acquireLock`'s non-EEXIST rethrow escapes as a stack trace. | follow-on hardening |
| 9 | **Exit codes 1 vs 2 split on an invisible internal distinction** across three equivalent user errors. | note only |

**CR-111 is clean of this story's citation drift** — it cites neither `hotfix.ts` nor
`work-item-type.ts`, and M4's `story.md :195/:196` insertion point is unmoved because all ten
templates changed by equal insert/delete counts. Its own body's `story.md:184-189` citation (4
sites) *is* stale — the §4.1 table is at `:193-197` — but that was shifted by STORY-054-06's
`## Task Breakdown` insertion in wave 6, not by CR-108. Worth a line in its dispatch since it is
free to catch now.

I found no manufactured finding, and I found no reason to hold the merge. The implementation is
correct, the two rulings are honoured, the two trees are byte-identical, the anchored block-equal
is exact, and the suite's every failure has a name and an owner.

**POST-FLIGHT: PASS**

Merge per the §2 procedure — outer half first, verify the three checks, then the cli fast-forward,
then the targeted `56/1` confirmation. Preserve the two untracked reports before removing the
worktree.
