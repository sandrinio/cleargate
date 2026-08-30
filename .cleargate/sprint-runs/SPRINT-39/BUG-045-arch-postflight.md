role: architect · Mode: POST-FLIGHT · SPRINT-39 · wave 10 · M4 · BUG-045

# Architect post-flight: BUG-045 — `hotfix new` ID scan ignores `archive/`

**VERDICT: PASS.** No code defect. `cleargate-cli` `story/BUG-045` @ `c589a039` is correct,
minimal, and safe to merge. Everything blocking is a citation-repair obligation on the
orchestrator before the **wave-12 CR-108 dispatch**, plus one release-time hazard for Gate 4.

Measured against the merged tree, not against any citation handed to me.

---

## 0. What I ran

Read-only throughout. No commit, merge, branch switch, `cleargate init`, `dist/` rebuild, or
`git` state mutation of any kind. `run_script.sh` not used — no wrapper-eligible script was
invoked (all measurement was direct `git`/`grep`/`sed`/`npx tsx` and one `npm run
check:no-inline-id-regex`).

`cleargate-cli` at exit: branch `story/BUG-045`, HEAD `c589a039`, `git status --porcelain`
**empty**. Outer repo: no file written except this report.

---

## 1. N7 — every `hotfix.ts` citation in the tree, re-measured

### 1.1 The shift function

`c589a039` is two hunks in `src/commands/hotfix.ts`: `@@ -42,24 +42,32 @@` (+8) and
`@@ -161,7 +169,8 @@` (+1). Derived and verified against both blobs:

| Old range | New range | Rule |
|---|---|---|
| `1–47` | unchanged | above the first hunk |
| `48–65` | `54–75` | restructured (signature widened, loop nested, `catch` moved inside) |
| `66–163` | `+8` | below hunk 1, above hunk 2 |
| `164–211` | `+9` | below hunk 2's inserted `archiveDir` line |

Anchor check (all verified by `sed -n Np`): old `:164 maxHotfixId(pendingDir)` → new `:173
maxHotfixId(pendingDir, archiveDir)`; old `:179-182` render → new `:188-191`; old `:192` write
→ new `:201`; old `:163 pendingDir` → new `:171`.

### 1.2 The ones that matter — measured verdicts

**`hotfix.ts:188-191` — the three-substitution render. STILL VALID. Do not touch it.**

```
188|   const content = templateContent
189|     .replace(/\{ID\}/g, idStr)
190|     .replace(/\{SLUG\}/g, opts.slug)
191|     .replace(/\{ISO\}/g, now);
```

The statement moved from `:179-182` to `:188-191` in this commit, and the OD-3 ruling was written
at `:188-191` — i.e. it was measured against the story branch, not against `main`. That is the
right thing to have done, and it is why both OD-3 copies need **zero** repair:

- `plans/M4.md:2919` and `:2941` — correct.
- `CR-108_Universal_Work_Item_Scaffold.md:165` and `:185` (the `§ AMENDMENT` copy) — correct.

**Trap, and it is the reason this section leads:** every *other* citation of that same statement
in the tree is now stale (`:179-182`, `:180-182`, `:179-181`, `:178-192`, `:178-182` — eight
sites). The four OD-3 sites are the **minority** and the only correct ones. Anyone
"harmonising" the file's citations toward the majority breaks precisely the four that gate
wave 12. Repair the eight; leave the four alone.

**The rest of the brief's list:**

| Cited | Measured today | Verdict |
|---|---|---|
| `:41-42` BUG-041 comment | `:41-42` — `// BUG-041: was /^HOTFIX-(\d+)_.*\.md$/ …` | **still valid** |
| `:17` `work-item-id.js` import | `:17` | **still valid** |
| `:24-32` `HotfixCliOptions` | `:24` `export interface` → `:32` `}` | **still valid** |
| `:74-115` `countActiveHotfixes` | doc `:77-85`, fn **`:86-123`** | **corrected → `:86-123`** |
| `:162-166` old call site | Next-ID block **`:170-175`** | **corrected → `:170-175`** |
| `:164` old call site | **`:173`** (`:164` is now a `stderrFn(` line inside the cap check) | **corrected → `:173`** |
| `:126` template-resolve doc | `:126` — ` * Resolve the path to …` | **still valid** |
| `:129` template-resolve return | `:129` — `return path.join(…'hotfix.md')` | **still valid** |
| `:139` render doc | `:139` — `* - Reads … substitutes {ID}, {SLUG}, {ISO}.` | **still valid** |
| `:141` filename-convention doc | `:141` | **still valid** |

**QA's own six, re-measured.** Five hold, one does not:

| QA's citation | Measured | Verdict |
|---|---|---|
| accumulator `:55` | `:55 let max = 0;` | valid |
| per-dir tolerance `:58-61` | `try` `:58` → `continue` `:61`, closing `}` at **`:62`** | **`:58-62`** (QA's range stops one line short) |
| type filter `:65` | `:65 if (id !== null && classifyType(id) === 'HOTFIX')` | valid |
| `maxId + 1` `:174` | `:174` | valid |
| pad width `:175` | `:175 padStart(3, '0')` | valid |
| doc comment `:44-51` | `/**` `:44` → `*/` **`:53`** | **`:44-53`** — QA's range is two lines short |
| `countActiveHotfixes` `:82-121` | fn `:86-123` | **`:86-123`** — QA applied +8 to a range that was itself loose |

None of these is a defect; all are N7 decay inside artefacts written the same day.

### 1.3 Searched surfaces

`.cleargate/delivery/**`, `.cleargate/sprint-runs/SPRINT-39/**` (all reports + `plans/M0.md`,
`M1.md`, `M4.md`), `sprint-context.md`, `.cleargate/wiki/**`, `.cleargate/knowledge/**`,
`cleargate-planning/**`, `FLASHCARD.md`.

- `.cleargate/knowledge/**` — **zero** `hotfix.ts` citations. Clean.
- `cleargate-planning/**` — **zero**. Clean.
- `FLASHCARD.md` — two stale, **reported not rewritten** (append-only). See §7.

### 1.4 Two citation defects that are not offset drift

**(a) A fabricated grep result, in two plans.** `plans/M0.md:443` and `plans/M1.md:163` both
state: *"`grep -n instructions src/commands/hotfix.ts` returns one doc comment at `:131`."*
Measured on both blobs:

```
grep -in "instruction" src/commands/hotfix.ts   → exit 1, no output   (merged c589a039)
git show b79adbd:… | grep -in "instruction"      → exit 1, no output   (pre-merge)
```

Old `:131` is ` * - Reads .cleargate/templates/hotfix.md and substitutes {ID}, {SLUG}, {ISO}.` —
it contains no such token. The claim was never true. OD-3's own line (`grep -n 'instructions'
… returns nothing`) is the accurate one and **contradicts both plans**. Delete the false claim;
do not "correct" `:131` to `:139`, because there is nothing there either.

**(b) A line number that cannot exist.** `plans/M4.md:1601` and `CR-108:98` both carry the task
row *"reduce hotfix.ts:719 to a delegate."* The file is **211 lines**. Pre-existing, not this
commit's; delete the offset. The delegate target is `hotfixNewHandler` at `:145-211`.

### 1.5 Two citations that are semantically false, not merely stale

These matter more than any offset, because they will be read by CR-108's Developer as a statement
of current behaviour:

- `CR-108_Universal_Work_Item_Scaffold.md:47` — *"`hotfix.ts:164` scans only `pendingDir` today,
  which under-counts once items are archived."*
- `CR-108_Universal_Work_Item_Scaffold.md:56` — *"**Forget that `hotfix.ts:164`'s ID scan is
  correct.** It scans `pendingDir` only."*

**As of `c589a039` both sentences are false.** The scan takes the union. Retargeting the offset
to `:173` without rewriting the prose produces a *worse* artefact than leaving it stale: a
correct line number attached to a wrong claim. Rewrite to past tense with the fix named
(`— fixed by BUG-045 (w10); the allocator now takes the max over pending-sync ∪ archive`).

`.cleargate/wiki/crs/CR-108.md:23` and `:41` carry the same sentence. The wiki is a derived
cache — fix the item file, then `cleargate wiki build`. Do not hand-edit the wiki page.

---

## 2. Does OD-3 still hold on the merged code? **Yes — and unusually, so does its citation.**

All three measurements re-run against `c589a039` and the current template tree.

**Measurement 1 — eight of ten templates carry exactly one `<instructions>` block. HOLDS.**

```
Bug.md 1/1 · CR.md 1/1 · Sprint Plan Template.md 1/1 · epic.md 1/1 · hotfix.md 1/1
initiative.md 1/1 · spike.md 1/1 · story.md 1/1
sprint_context.md 0/0 · sprint_report.md 0/0
```

`hotfix.md` is in the carrying set. Untouched by this commit (which is `cleargate-cli`-only).

**Measurement 2 — the renderer performs exactly three substitutions and strips nothing. HOLDS,
and the offset is exact.** `:188-191` as quoted in §1.2; `grep -in "instruction"` exits 1 with
no output on the merged file. `writeFileSync` at `:201` writes `content` unmodified. There is no
third path between the read at `:181` and the write at `:201`.

**Measurement 3 — the one real scaffolded artefact was hand-cleaned. HOLDS.**
`archive/HOTFIX-001_init_skip_strips_exec_bit.md`: `grep -c instructions` → **0**, while
`.cleargate/templates/hotfix.md` carries one. No unsubstituted `{ID}`/`{SLUG}`/`{ISO}`/`{semver}`
tokens survive in it either. The renderer cannot have removed the block, so a human did.

**Verdict: the ruling's basis survived this commit intact, and so did its citation.** Nothing to
repair in OD-3 or in its CR-108 copy. The instruction to CR-108's Developer — *substitution-only
rendering, `<instructions>` handling out of scope and a kick-back* — stands unamended.

The one thing OD-3's evidence chain now depends on that it did not before: `hotfix.ts:188-191`
is the **only** correct citation of that statement in the repository (§1.2 trap).

---

## 3. The CR-108 hand-off, audited as architecture

### 3.1 TPV's five claims, each verified against the shipped code

**(a) `...dirs: string[]` is genuinely general — PARTLY TRUE, and the qualifier is load-bearing.**

The *scan* generalises cleanly. `maxHotfixId(...dirs: string[])` (`:54`) with a single accumulator
declared once outside the loop (`:55`) and a `for (const dir of dirs)` (`:56`) is N-ary by
construction, not two-ary with a second parameter bolted on. Nine types, two directories, or
twenty — the body does not change.

The *allocation* does not generalise, and TPV's framing understates this. `maxHotfixId` returns
`number`, because a HOTFIX id **is** a scalar. A story id is a pair. See (e).

**(b) Per-directory ENOENT tolerance is STRUCTURAL, not incidental — CONFIRMED.**

```
 56|   for (const dir of dirs) {
 57|     let entries: string[];
 58|     try {
 59|       entries = fs.readdirSync(dir);
 60|     } catch {
 61|       continue;
 62|     }
```

The `try/catch` is *inside* the loop body and `continue`s the loop, so tolerance is a property
of the iteration, not of a two-argument special case. Three consequences the Developer got right
and CR-108 inherits free: the accumulator at `:55` is never reset, so a missing directory cannot
discard an earlier max (kills M6b); a missing *earlier* directory cannot abandon a later one
(kills M6c); and **argument order cannot matter**, which is what makes the helper safe to call
with a per-type directory list of arbitrary length. This is the single most reusable line of the
commit.

**(c) Pad width is a fixed literal and no width leaks from the corpus — CONFIRMED, and the
structural reason is stronger than the literal.**

`padStart(3, '0')` at `:175` is at the **call site**, outside `maxHotfixId` entirely. More
importantly, `maxHotfixId` returns `number`: `numericStem` yields a string, `parseInt(stem, 10)`
at `:68` discards its width before the comparison at `:69`. **No string ever crosses the function
boundary**, so a width *cannot* leak from the corpus even by accident. That is why M5d
("inherit the widest scanned stem") is dead permanently, not just dead against this battery.

CR-108 needs a **per-type** width and cannot derive one from the corpus. Measured, live union of
both directories:

| Type | `pending-sync` | `archive` | max | next id |
|---|---|---|---|---|
| STORY | 30 | 201 | `099` | — (see (e)) |
| CR | 28 | 82 | `114` | `CR-115` |
| BUG | 31 | 25 | `064` | `BUG-065` |
| EPIC | 15 | 32 | `058` | `EPIC-059` |
| SPRINT | 6 | 33 | `39` | **`SPRINT-40`, not `SPRINT-040`** |
| PROPOSAL | 2 | 14 | `074` | `PROPOSAL-075` |
| HOTFIX | 0 | 1 | `001` | `HOTFIX-002` |
| INITIATIVE | 1 | 0 | `001` | `INITIATIVE-002` |
| SPIKE | 0 | 0 | — | `SPIKE-001` |

**New finding: a corpus-derived width table is under-determined for three of nine types.**
`SPIKE` has zero witnesses; `HOTFIX` and `INITIATIVE` have one each. F4's per-type width *table*
is therefore not merely preferable to inference — inference is **unanswerable** for a third of
the type set. Write the widths as literals in the type→template map.

**(d) The type filter is the axis CR-108 parameterises — CONFIRMED at `:65`, with a registry
caveat that is the strongest finding in this section.**

```
 65|       if (id !== null && classifyType(id) === 'HOTFIX') {
```

`'HOTFIX'` is a member of `TYPE_PREFIXES` (`work-item-id.ts:41-54`) — **twelve** UPPERCASE
tokens: `INITIATIVE, PROPOSAL, PLATFORM, HOTFIX, SPRINT, STORY, AUDIT, SPIKE, EPIC, PROP, BUG,
CR`. `PROP` is a legacy alias normalised to `PROPOSAL` at `work-item-id.ts:116-118`.

`cleargate new <type>`'s argument will come from `work-item-type.ts:8`'s `WorkItemType` —
**nine** lowercase tokens: `story epic proposal cr bug initiative sprint hotfix spike`.

**There are two live exports named `WorkItemType` in the same `src/lib/`, different cardinality,
different casing, neither importing the other** (`work-item-id.ts:56` and `work-item-type.ts:8`).
`stamp-tokens.ts` already imports from both files in one module (`:14` and `:20`), so the
collision is real and currently unmanaged.

The bridge between them is **not identity**. CR-108 must write it explicitly: uppercase the
argument, and *reject* `platform`, `audit`, `prop`. If it does not, `cleargate new platform`
scaffolds a tenth type with no template, no bucket (`derive-bucket.ts` `PREFIX_MAP` has no row),
and no gate — exiting 0. Size-assert the map, in the `KNOWN_UNPINNABLE` / `KNOWN_BUCKET_GAPS`
shape this sprint has already used twice; a nine-row map that silently becomes eight is exactly
the vacuous-green this sprint exists to close.

**(e) What CR-108 may NOT lift — CONFIRMED, and sharpened.**

- **`max + 1` does not generalise to `story`.** Executed against the real exported helper:
  `numericStem('STORY-054-06')` → `'054'` — the **epic** number.
  `deriveParentEpicId` (`work-item-id.ts:255-260`) exists precisely because of this. On the live
  corpus the STORY union max is `099`, seeded by `STORY-099-01_Dogfood_Lane_Fast_Smoke.md` — a
  deliberate high-number sentinel, not a real epic. `max+1` yields `STORY-100`, an invalid shape
  derived from a fixture. Story allocation is `STORY-<parentEpic>-<nextSeqWithinEpic>` and needs
  the parent as an argument.
- **`countActiveHotfixes`'s mtime semantics are cap-specific.** `:113-115`
  (`stat.mtimeMs >= sevenDaysAgo`) is the rolling-window cap. Byte-unchanged by this commit
  (verified against the diff, not against the test result). The allocator must never see it:
  inheriting the 7-day filter re-opens BUG-045 for any archive older than a week. The two
  functions read the same two directories for opposite reasons and sit 30 lines apart.
- **`padStart(3, '0')` verbatim** — produces `SPRINT-040`. See (c).

### 3.2 The judgement TPV did not give

**Question: with nine types sharing one `archive/`, is a single shared scan over both directories
still the right shape, or does CR-108 need per-type indexing?**

**Keep the single shared scan. Do not index.** Four reasons, in order of weight.

**1. The shared directory makes the *filter* load-bearing, which argues for one scan, not nine.**
This is the real argument and it cuts opposite to intuition. With one `archive/` holding seven
prefixes, a dropped or wrong type filter returns a number that *looks* like a valid id — TPV's
M9 survivor allocating `HOTFIX-115` off the CR/EPIC numbering is exactly that, and it passed the
entire authored R1–R7 baseline plus the item's own collision argument. Under per-type
directories, an unfiltered scan would return an empty set: loudly wrong, caught by any test.
So the shared layout *raises* the value of R14's filter assertion and *lowers* the value of
indexing — the partition you would be building an index over is the thing you must test anyway,
and an index would give you a second place for the partition to be wrong.

**2. Cost is not the axis.** Measured live: `pending-sync/` 113 entries, `archive/` 388, flat,
no subdirectories. One `cleargate new` invocation is two `readdirSync` calls and 501 grammar
parses, against a human-initiated command that then does template I/O and a git-visible write.
At 10× corpus growth it is still one syscall pair and ~5,000 regex tests — low single-digit ms.
An index buys nothing measurable and costs a staleness surface with three invalidation triggers
(write, `git checkout`, manual `mv`). This repo already owns one derived cache with exactly that
problem — the wiki — and already pays for it.

**3. But the return type must change, and that IS a reshape.** One scan, N allocation strategies:

```
collectIds(type, ...dirs): string[]     ← a clean generalisation of the merged loop
nextId(type, ids, opts): string         ← per-type; scalar for 8, pair-valued for story
```

The merged `maxHotfixId` collapses both into `number`. That is correct for HOTFIX and wrong for
STORY, and it is the seam where F5 lives. Presenting the merged function as "generalises with no
reshaping" is right about the scan and wrong about the allocation — CR-108's Developer should
lift the loop body, not the signature.

**4. One caveat on scope creep.** The union scan reads *filenames only*. It never opens a file,
so it cannot see an id that disagrees with its own filename, and it cannot see items outside
these two directories (`.cleargate/sprint-runs/`, `.cleargate/wiki/`, a PM-tool remote). Under
one type that was a non-issue — 1 HOTFIX file total. Under nine types with 501 files it becomes
a stated boundary: **`cleargate new` allocates against the local delivery tree, not against
ClearGate.** CR-108 must say so out loud, because the failure mode (two developers on two
clones allocating `CR-115` simultaneously) is invisible until push. BUG-044's `'wx'` lockfile
idiom serialises *within* a checkout; it does nothing across clones. Not CR-108's to solve —
CR-108's to *declare*.

---

## 4. `CHANGELOG.md` and the `## Unreleased` blind spot

### 4.1 Form — clean

- **One `### Fixed` in the Unreleased block**, at `:8`, inserted directly under `## Unreleased`
  (`:6`) and **above** the pre-existing `### Changed` (`:20`) and `### Known limitations` (`:23`).
- Matches the file's own convention. `## [0.24.2]` (`:26`) orders `### Fixed` (`:28`) → `### Added`
  (`:38`) → `### Changed` (`:43`). Fixed leads; the new block leads. Correct.
- Entry shape matches every neighbour: one bullet, bolded lead sentence, item id in parentheses,
  cause-then-consequence prose. It also states the *design* decision (archive age deliberately
  not consulted) rather than only the change — which is what makes it useful at release time.
- `grep -c '^## Unreleased'` → **1**. Confirmed.
- `package.json` **untouched** — `git show --stat c589a039` lists exactly two files. Version stays
  `0.24.2`, matching the topmost `## [0.24.2] — 2026-08-24` heading.

### 4.2 The blind spot, measured

`parseChangelog` (`src/lib/changelog.ts:29-65`) collects matches of
`/^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})/gm` and slices from `matches[0].index` onward
(`:50-54`). Content **above the first version heading never enters `sections[]` at all** — it is
not an empty section, it is not a section. `sliceChangelog` (`:76-98`) filters that array, so
`cleargate upgrade`'s release-notes print can never surface an Unreleased entry.

`test/changelog-format.node.test.ts` has five scenarios (`:132, :140, :152, :167, :185`); all five
key off `HEADING_RE` / `HEADING_RE_ALL` (`:128-129`). And:

```
grep -rn "Unreleased" test/ scripts/ src/   →  ZERO hits
```

Nothing in the package reads, validates, or promotes the section. There is no release script.
`prepublishOnly` = `npm test && npm run typecheck && npm run build && node scripts/verify-pack.mjs`
— none of the four touches CHANGELOG semantics.

### 4.3 Architectural consequence for Gate 4

**What has to happen:** at release, a human must rename `## Unreleased` to
`## [X.Y.Z] — YYYY-MM-DD` (or relocate its three `###` blocks under a new version heading) in the
same change that bumps `package.json`.

**What guarantees it: nothing.** And the near-miss is worse than the miss. The `:140` "topmost
version matches package.json" scenario fires only when a `## [X.Y.Z]` heading is absent or
mismatched. If the releaser bumps to `0.25.0` and inserts `## [0.25.0] — …` **below** a still-present
`## Unreleased`, all five scenarios pass, `verify-pack` passes, publish succeeds — and the BUG-045
entry is stranded above the parse boundary **permanently**: shipped in the tarball, invisible to
`sliceChangelog`, invisible to every `cleargate upgrade` release-notes print, forever. The
0.24.2 entry (`:29`) documents a bug where release notes never printed on a real install; this is
the same class of failure one layer up.

**Recommendation — put the guard at the chokepoint, not in the test suite.** `verify-pack.mjs` is
the one script every publish passes through (`prepublishOnly`). A five-line check —
*"if a `## Unreleased` heading exists and is followed by any `### ` subsection before the first
`## [X.Y.Z]`, refuse to publish"* — converts silent stranding into a refused publish, costs
nothing on every other run, and needs no CI (there is none in `cleargate-cli`). Adding it to
`changelog-format.node.test.ts` instead would make the suite red for the entire life of every
Unreleased section, i.e. permanently — that is the wrong shape. **Not BUG-045's to fix**; filed
here as a Gate-4 item.

---

## 5. Cross-repo hygiene

| Check | Result |
|---|---|
| Zero outer-repo commits | **Confirmed.** `git log aaabd9ef..HEAD` in the outer repo contains no BUG-045 commit. `git log --all --grep=BUG-045` returns only `aaabd9ef` and `ec5e6d56` — both pre-dispatch **docs** commits. |
| No `dist/` rebuild (N9) | **Confirmed.** `git ls-files dist` → 0 (untracked); `cleargate-cli` working tree clean; `dist/cli.js` mtime **Aug 28 12:14**, predating `c589a039` (**Aug 29 14:18:53 +0400**). |
| `stash@{0}` untouched | **Confirmed.** `cleargate-cli` `stash@{0}` = `WIP on story/BUG-043: 1e01ea0 …`, still at index 0. Outer repo `stash@{0}` = `WIP on sprint/S-32: ef0facff …`, 13-deep stack intact. |
| Two-tree parity (Cross-Cutting Rule 1) | **N/A.** No `.cleargate/knowledge/**` or `.cleargate/templates/**` file touched. |
| Rule 6 (ungated cli commits) | Honoured — Developer ran typecheck + full suite explicitly and reported both numbers; QA-Verify re-ran independently. `check:no-inline-id-regex` re-run by me: `no inline work-item-id regexes`, exit 0. |

### 5.1 For the record — the stale binary still ships the bug

`dist/cli.js` predates the fix, so `node cleargate-cli/dist/cli.js hotfix new <slug>` runs the
archive-blind allocator, as does the global `cleargate@0.24.2` install (which is a **real** npm
install on this machine, not a link — local `src` changes do not reach it).

On this repo's live corpus that is not theoretical: `pending-sync/` holds **0** `HOTFIX-*`,
`archive/` holds exactly **1** (`HOTFIX-001_init_skip_strips_exec_bit.md`). Both stale surfaces
therefore allocate **`HOTFIX-001` — a live collision, on the first invocation**.

**Is that safe to leave for the remaining waves? Yes, with one named condition.**

- Blast radius is exactly one command. No remaining M4 wave invokes `hotfix new`. N9 already
  restricts `dist` to `gate check`, which does not reach the allocator.
- The failure is not data-corrupting. `writeFileSync` (`:201`) targets a **new** path in
  `pending-sync/`; the archived `HOTFIX-001` is never opened or overwritten. The collision is
  visible to `ls` the moment it happens.
- **The condition, which is not currently written anywhere:** nobody may run `cleargate hotfix
  new` — from `dist`, from the global binary, or from a target repo — until Gate 4 rebuilds and
  republishes. **N9 forbids *verifying* through `dist`; it does not forbid *using* it.** The
  person most likely to hit this is a human filing a real hotfix mid-sprint from the global
  install, who is not reading N9. Add the line to `GATE-4-PREFLIGHT.md`.
- Sequencing note: the fix is not user-visible until a `0.25.0` publish, and §4's Unreleased
  stranding sits on the same critical path. Both resolve in the same Gate-4 release step, or
  neither does.

---

## 6. Report-integrity finding

### 6.1 What is actually true

| Report | `orchestrator_confirmed` | `plan_deviations` | Footer shape |
|---|---|---|---|
| `BUG-043-dev.md` | 1 | 1 | markdown `## plan_deviations` heading |
| `BUG-044-dev.md` | 0 | 1 (`[]`) | fenced YAML block |
| `BUG-045-dev.md` | **0** | **0** | **none** |
| `BUG-046-dev.md` | 2 | 1 | fenced YAML block |
| `CR-105-dev.md` | **0** | **0** | **none** |

`BUG-045-dev.md` ends `## Script Incidents` → `STATUS=done`. There is no structured footer at
all — no `requirements_covered`, no `plan_deviations`, no `adjacent_files`, no
`flashcards_flagged`.

### 6.2 Assessment — and it is not the assessment the brief expects

**Issue (a), the asserted-but-unwitnessed `orchestrator_confirmed: true`: the artefact is
innocent, and QA already said so one wave ago.**

`BUG-045-qa.md:112-125` adjudicates this explicitly: *"The dispatch characterized this as marked
`orchestrator_confirmed: true`. **That characterization does not match the actual report.**"*
QA is right. I re-grepped: zero hits, and the Developer's narrative under `## Task Breakdown`
(`:108-125`) cites M4 **N8** and the dispatch's zero-outer-commit mandate — it does **not** claim
anyone confirmed anything. QA's conclusion is the correct one: the report *under*-claims relative
to the sprint's convention rather than over-claiming.

Separately confirmed: `grep -n "BUG-045" sprint-context.md` returns **zero**. The
§Mid-Sprint Amendments log carries five `ORCHESTRATOR CONFIRMATION`/`ADJUDICATION` entries
(M0/DoD, M0/R1, three from M1/wave3) and **none** for BUG-045. So there is no orchestrator
confirmation for this story anywhere in the durable record — consistent with the report, which
never claimed one.

**The real finding is the propagation.** The false characterization originated in the wave-10
Developer dispatch, was refuted in writing by QA in `BUG-045-qa.md:114-116`, and then appeared
**again, unchanged, in this post-flight dispatch** — which lists `BUG-045-qa.md` as preflight
item 3. The correction was written into the durable record and the next dispatch citing that same
record did not read it.

That reframes the question the brief asks. These reports **can** be trusted as the sprint's
record: the Developer's report was accurate and QA's audit caught the discrepancy within one
wave. What cannot be trusted is **dispatch text**, because it is authored from the return channel
and never reconciled against the artefacts it names. A return-channel assertion that no artefact
supports currently has an unbounded lifetime and propagates dispatch-to-dispatch.

**Issue (b), the missing structured block: real, but benign here and systemic elsewhere.**

The substantive deviation — the item file's `## Task Breakdown` checkboxes were not ticked — is
fully documented in prose (`BUG-045-dev.md:108-125`), correctly justified (N8 + zero-outer-commit
mandate, both verified in the M4 plan), and independently substance-checked row-by-row by QA
(`BUG-045-qa.md:127-145`). Nothing was lost. But 2 of 5 wave-10-era reports carry no footer, and
the three that do use **three different shapes** (markdown heading vs. fenced YAML, `[]` vs.
populated). A field with no schema cannot be checked, and a field that is checked by nobody is a
field that is emitted by whoever remembers.

### 6.3 Recommendations

1. **Make `orchestrator_confirmed` derivable, not assertable.** Replace the boolean with
   `orchestrator_confirmation_ref: "<ISO-date · item-id>"` or `null`, resolving to a line in
   `sprint-context.md` §Mid-Sprint Amendments. An unsupported claim then becomes a dangling
   pointer — mechanically detectable — instead of a `true` nobody can falsify.
2. **Reconcile dispatch text against the durable record, not the return channel.** One line in the
   orchestration playbook: *before writing a dispatch that characterizes a prior agent's report,
   grep the report for the literal field.* This dispatch's own preflight named the file that
   refuted it. QA independently proposed the same card
   (`BUG-045-qa.md:170`) — two agents converged on it from opposite ends of the same wave.
3. **Give the footer a schema and a size-assert.** One pre-gate check: every `*-dev.md` under
   `sprint-runs/<id>/` contains a fenced block with `requirements_covered:` and
   `plan_deviations:`. This is the identical shape to `KNOWN_UNPINNABLE.size === 2` and
   `KNOWN_BUCKET_GAPS` — silence must not read as coverage.
4. **Retro-record BUG-045's deviation** in `sprint-context.md` §Mid-Sprint Amendments before merge,
   so the record is complete: the item file's Task Breakdown boxes are unticked *by dispatch
   design*, and all seven rows were completed in substance and QA-verified.

None of the four is a code defect; none blocks merge. (2) and (3) are candidate follow-on items —
flagged, not filed; filing work items is outside a post-flight dispatch.

---

## 7. Verdict

**PASS.** Merge `c589a039`.

Seven allocator constraints re-verified independently of QA: union semantics with a
never-reset accumulator (`:55-56`), structural per-directory ENOENT tolerance (`:58-62`), the
`'HOTFIX'` type filter preserved verbatim inside the widened loop (`:65`), `maxId + 1` untouched
(`:174`), fixed-literal pad width outside the scan (`:175`), `countActiveHotfixes` byte-unchanged
(`:86-123`, verified against the diff), and no new id regex anywhere in the added lines
(`check:no-inline-id-regex` clean, `grep '/\^\?HOTFIX'` on added lines empty).
`grep -rn maxHotfixId src/` → exactly 2 (`:54` definition, `:173` sole call site).

The only defect class found is citation decay, and it is unavoidable by construction: the commit
shifted 150 lines of a file that 60 places cite. **N7's literal obligation was met** — the commit
introduces no self-citation, and the doc comment it rewrote (`:44-53`) carries no line numbers.
The repairs below live in outer-repo files that this dispatch forbade the Developer from touching.
They are the orchestrator's, and **the CR-108 group gates wave 12**.

---

## STALE_CITATIONS:

### Group A — OD-3 / CR-108 relevant. **These gate wave 12.**

**A0 — DO NOT TOUCH. Verified correct against the merged code. Repairing these would break OD-3.**

```
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:2919                    hotfix.ts:188-191 → STILL VALID
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:2941                    hotfix.ts:188-191 → STILL VALID
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:165   hotfix.ts:188-191 → STILL VALID
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:185   hotfix.ts:188-191 → STILL VALID
```

**A1 — semantic, not offset. Rewrite the prose; a correct offset on a false claim is worse than a stale one.**

```
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:47   hotfix.ts:164 → :173 AND rewrite "scans only pendingDir today" → past tense, "fixed by BUG-045 (w10)"
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:56   hotfix.ts:164 → :173 AND rewrite "It scans pendingDir only" → past tense; the do-not-forget framing now inverts
.cleargate/wiki/crs/CR-108.md:23                                            hotfix.ts:164 → :173 — DERIVED CACHE: fix the item file, then `cleargate wiki build`; do not hand-edit
.cleargate/wiki/crs/CR-108.md:41                                            hotfix.ts:164 → :173 — same, derived cache
```

**A2 — offset repairs in the CR-108 item file**

```
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:10   hotfix.ts:118-192 → :126-201
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:55   hotfix.ts:164 → :173 · :165 → :174 · :166 → :175 · :118-121 → :128-130
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:78   hotfix.ts:164-166 → :173-175; signature shown is now maxHotfixId(pendingDir, archiveDir)
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:79   hotfix.ts:118-121 → :128-130
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:80   hotfix.ts:179 → :188 · :192 → :201
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:98   hotfix.ts:719 → DELETE the offset (file is 211 lines); delegate target is hotfixNewHandler :145-211
.cleargate/delivery/pending-sync/CR-108_Universal_Work_Item_Scaffold.md:196  hotfix.ts:118-192 → :126-201
```

**A3 — offset repairs in the M4 plan's CR-108 sections**

```
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:285    hotfix.ts:118-121 → :128-130
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1404   hotfix.ts:166 → :175
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1417   hotfix.ts:166 → :175
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1446   hotfix.ts:186-188 → :195-197
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1447   hotfix.ts:180-182 → :189-191
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1457   hotfix.ts:180-182 → :189-191
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1540   hotfix.ts:48-67 → :54-75
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1543   hotfix.ts:120-122 → :128-130; the inline ":118-121 is off by two" note → :126-129 was the literal shift, :128-130 is the accurate target
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1544   hotfix.ts:179-182 → :188-191 · :180-182 → :189-191 · :192 → :201
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1582   hotfix.ts:143 → :152 (was ALREADY off by one pre-merge: old :143 = exitFn; the cwd seam was old :144)
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1601   hotfix.ts:719 → DELETE the offset (file is 211 lines)
```

### Group B — non-gating

```
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:673    hotfix.ts:49 → :55
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:676    hotfix.ts:143 → :152 (already off by one pre-merge)
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:680    hotfix.ts:74-115 → :86-123
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:720    hotfix.ts:106-108 → :114-116 (the mtime comparison itself is :115)
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:732    hotfix.ts:80 → :88 · :97-102 → :105-110
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:738    hotfix.ts:48 → :54
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:761    hotfix.ts:106-108 → :114-116
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:762    hotfix.ts:186-188 → :195-197
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:777    hotfix.ts:164 → :173 (task row)
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:2492   hotfix.ts:106-108 → :114-116 — PROPOSED flashcard text; fix BEFORE it is written to FLASHCARD.md
.cleargate/sprint-runs/SPRINT-39/plans/M0.md:403    hotfix.ts:178-192 → :187-201
.cleargate/sprint-runs/SPRINT-39/plans/M0.md:443    hotfix.ts:179-182 → :188-191 AND delete "grep -n instructions … returns one doc comment at :131" → FALSE on both blobs; grep exits 1 with no output
.cleargate/sprint-runs/SPRINT-39/plans/M1.md:163    hotfix.ts:179-182 → :188-191 AND delete the same false ":131" grep claim
.cleargate/sprint-runs/SPRINT-39/BUG-045-tpv.md:265 hotfix.ts:74-115 → :86-123
.cleargate/sprint-runs/SPRINT-39/BUG-045-tpv.md:296 hotfix.ts:162-166 → :170-175
.cleargate/sprint-runs/SPRINT-39/BUG-045-tpv.md:303 hotfix.ts:165-166 → :174-175 · :44-47 → :44-53
.cleargate/sprint-runs/SPRINT-39/BUG-045-qa.md:43   hotfix.ts:58-61 → :58-62
.cleargate/sprint-runs/SPRINT-39/BUG-045-qa.md:61   hotfix.ts:82-121 → :86-123
.cleargate/sprint-runs/SPRINT-39/BUG-045-qa.md:66   hotfix.ts:44-51 → :44-53
.cleargate/sprint-runs/SPRINT-39/BUG-045-dev.md:52  "countActiveHotfixes (:78-115 before, same span after)" → :78-115 before, :86-123 AFTER — the body is byte-unchanged but the span moved +8; N7 violation inside the Developer's own report
.cleargate/sprint-runs/SPRINT-39/BUG-045-qa-red.md:129  hotfix.ts:164 → :173 (historical "the shipped code" — annotate as pre-fix rather than retarget)
.cleargate/sprint-runs/SPRINT-39/BUG-045-qa-red.md:134  hotfix.ts:106-108 → :114-116
.cleargate/sprint-runs/SPRINT-39/STORY-054-05-arch-postflight.md:245  hotfix.ts:178-182 → :187-191
.cleargate/sprint-runs/SPRINT-39/STORY-054-01-dev.md:34  hotfix.ts:166 → :175
.cleargate/sprint-runs/SPRINT-39/STORY-054-01-dev.md:89  hotfix.ts:166 → :175 · :180-182 → :189-191
.cleargate/sprint-runs/SPRINT-39/sprint-context.md:319   hotfix.ts:179-181 → :189-191
.cleargate/sprint-runs/SPRINT-39/sprint-context.md:320   hotfix.ts:179-181 → :189-191
.cleargate/delivery/pending-sync/BUG-045_Hotfix_Id_Scan_Ignores_Archive.md:155  hotfix.ts:164 → :173 (task row)
```

### Group C — historical by design. Annotate, do not retarget.

```
.cleargate/delivery/pending-sync/BUG-045_Hotfix_Id_Scan_Ignores_Archive.md:12   context_source "hotfix.ts:164-166 read directly" — records the pre-fix state on 2026-08-26; correct as history
.cleargate/delivery/pending-sync/BUG-045_Hotfix_Id_Scan_Ignores_Archive.md:59   `const maxId = maxHotfixId(pendingDir); // hotfix.ts:164 — pendingDir only` — the defect repro; KEEP verbatim
.cleargate/delivery/pending-sync/BUG-045_Hotfix_Id_Scan_Ignores_Archive.md:170  same context_source line — correct as history
```

Suffix each with `(pre-fix; corrected to :173 by c589a039)` on the close-out pass.

### Group D — FLASHCARD.md. REPORTED, NOT REWRITTEN (append-only, dated log).

```
.cleargate/FLASHCARD.md:45   hotfix.ts:179-181 → now :189-191 — card content still TRUE; offset stale
.cleargate/FLASHCARD.md:58   hotfix.ts:178-192 → now :187-201 — card content still TRUE; offset stale
```

Both cards' *lessons* survive `c589a039` unchanged (the renderer still substitutes only three
tokens and still strips nothing). Only the offsets decayed. Per the append-only rule, do not
edit; if the drift becomes load-bearing, append a new dated card superseding them.

### Verified still valid — no action

`hotfix.ts:17` (M4:691, :733, :2744; tpv:109, :262; qa:35) · `:41-42` (M4:693, :1580, :2722,
:2771; tpv:9, :200; qa:32) · `:24-32` (M4:734; tpv:211) · `:54`/`:173` (qa:65, :135; dev:106) ·
`:55` (qa:39) · `:65` (qa:49) · `:174` (qa:55) · `:175` (qa:53) · `:126`, `:129`, `:139`, `:141`
(brief's list) · `:188-191` (the four Group-A0 sites).

---

## FLASHCARDS_PROPOSED:

Not written — `.cleargate/FLASHCARD.md` is outside this dispatch. TPV's five (`BUG-045-tpv.md`
§T10) and QA's one (`BUG-045-qa.md:170`) are not duplicated here.

```
2026-08-29 · #citations #danger · A ruling measured on the STORY BRANCH is the only correct citation in a tree where every other copy was measured on main — harmonising to the majority breaks it.
2026-08-29 · #citations #process · Retargeting a line number without re-reading the CLAIM ships a correct offset on a false sentence: worse than stale, because it now looks audited.
2026-08-29 · #process #danger · A correction written into a QA report does not reach the next dispatch — dispatch text is authored from the return channel and never reconciled against artefacts.
2026-08-29 · #changelog #release #danger · Everything above the first `## [X.Y.Z]` heading is invisible to parseChangelog; an Unreleased block left un-promoted at publish is stranded forever, silently.
2026-08-29 · #types #registry #danger · cleargate-cli exports TWO live `WorkItemType`s — work-item-id.ts (12, UPPERCASE) and work-item-type.ts (9, lowercase); stamp-tokens.ts imports both.
2026-08-29 · #id-parsing #danger · numericStem("STORY-054-06") is "054" — the EPIC. max+1 over the story corpus yields STORY-100, seeded by a sentinel fixture id.
2026-08-29 · #scaffold #allocator · A shared archive/ makes a DROPPED type filter allocate a plausible-looking id; per-type dirs would make it loudly empty. Test the filter, don't index around it.
2026-08-29 · #scaffold #danger · A width table cannot be corpus-derived: SPIKE has 0 live items and HOTFIX/INITIATIVE have 1 each — inference has no witness for a third of the type set.
2026-08-29 · #reports #schema · Five dev reports, three different footer shapes, two with none. An unschematised structured field is emitted by whoever remembers.
2026-08-29 · #dist #danger · N9 forbids VERIFYING through dist/, not USING it — a stale binary keeps shipping the fixed bug to any human who runs the command mid-sprint.
```

---

## Script Incidents

None. No script was invoked through `run_script.sh` — all measurement was direct
`git` / `grep` / `sed` / `npx tsx` execution plus one `npm --prefix` script
(`check:no-inline-id-regex`, exit 0), none of which routes through the wrapper.

STATUS=PASS
