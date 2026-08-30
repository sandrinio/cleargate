# STORY-054-02 — Architect TPV (Test Pattern Validation)

**Verdict: `TPV: rulings-required`.** The QA-Red file is correctly wired, its six reds are
honest, and Pin A bites on all four mutations. But a full out-of-band simulation of the
Developer's turn found **two existing tests that go red on a complete, correct
implementation and are named in no plan, no story §3.1, and no QA-Red prediction** — and
found that the predicted red-window set is misidentified (S5 stays green; S3a/S3b go red).
Seven rulings below.

Commit under review: `8229109` on `cleargate-cli` branch `story/STORY-054-02`,
`test/lib/work-item-type-spike.red.node.test.ts` (474 lines, 12 cases, 4 describes).
Baseline reproduced exactly: **`tests 12 · pass 6 · fail 6`**.

---

## 0. Method

Everything below is executed, not reasoned. Two harnesses:

**(a) In-place mutation of the live `spike.md`** with byte-verified restore, used only for
Pin A (§1). `.cleargate/templates/spike.md` sha256 `8f0baebd2d61…` before and after every
one of the four mutations; both trees verified identical at exit.

**(b) A full dry-run tree at `$SCRATCH/dryrun/`** — a copy of `cleargate-cli/src`, the
relevant `test/` files, `.cleargate/{knowledge,templates}` and
`cleargate-planning/.cleargate/{knowledge,templates}`, laid out so that
`META_ROOT = resolve(CLI_ROOT, '..')` resolves inside the scratch tree. `node_modules`
symlinked. **Zero bytes of the real repo were modified by harness (b).** The simulated
Developer edit set applied there is exactly the M1 plan's:

```
work-item-type.ts   union += 'spike'; FM_KEY_MAP += spike_id; PREFIX_MAP += SPIKE- (LAST);
                    WORK_ITEM_TRANSITIONS += spike: ['ready-to-investigate','ready-to-conclude']
push.ts             typeMap += spike_id: 'spike'
readiness-gates.md  the two verbatim M1 gate blocks, BOTH trees
tests               TEMPLATE_FOR += spike; 4 fixture rows; :432 14→18; :434 12→16; :644 12→16;
                    work-item-type.node.test.ts :184 8→9
```

The dry tree at pristine reproduces the real tree faithfully: the pinning test runs
`14/14 green` there, identical to the main checkout.

---

## 1. Does Pin A bite? **Yes — all four mutations, no decoration.**

Each mutation applied to the live `spike.md`, real Pin A executed, then restored.

| Mut | Edit | Assertion that went red | Message (verbatim) |
|---|---|---|---|
| **M1** | one `- ` bullet added inside §1 | `question-stated` | `question-stated PASSES on the UNEDITED spike.md — the gate is born vacuous: section 1 has 1 listed-item (≥1 required).` |
| **M2** | two `- ` bullets added inside §2 | `timebox-and-kill-criteria-set` | `… the gate is born vacuous: section 2 has 2 listed-item (≥2 required).` |
| **M3** | one data row added to §4's Decision Log table | `decision-log-populated` | `… the gate is born vacuous: section 4 has 1 declared-item (≥1 required).` |
| **M4** | `## 3. Decision Unblocked` deleted (slides §6 `## Prior work` into slot 5) | **`decision-log-populated` AND `outcome-declared` — two at once** | `… section 4 has 1 declared-item (≥1 required).` / `… section 5 has 1 listed-item (≥1 required).` |

**No assertion is decorative.** Every one of the four criteria has at least one mutation
that flips it, and M4 confirms the STORY-054-01 post-flight §1.3 prediction exactly: the
heading-deletion direction — which Cross-Cutting Rule 4 does not cover — turns *two*
criteria green on an empty charter, because `## Prior work` (1 bullet) and the Ambiguity
Gate (5 bullets) sit directly beneath the gated band.

M4's message reads `section 4 has 1 declared-item` because after the deletion, slot 4 is
`## 5. Outcome & Spawned Items` whose prose sentence *"State the concluding verdict here:
the answer…"* scores 1 `declared-item` — the BUG-050 mechanism, arriving through the
back door. Pin A catches it.

Repo restored: `git status --short .cleargate/templates/ cleargate-planning/.cleargate/templates/`
empty; both shas `8f0baebd2d614567c1363d78773f69468ac76687f52998bdaf6cc2dab264dbd8`.

---

## 2. Is the R24 guard vacuous? **Vacuous today, discriminating tomorrow — and it does distinguish the two placements.**

Two scratch copies of `work-item-type.ts`, one with `SPIKE-` appended **after `HOTFIX-`**,
one with it inserted **before `STORY-`**. Real `detectWorkItemType` run from each:

| input | `SPIKE-` LAST | `SPIKE-` BEFORE `STORY-` |
|---|---|---|
| `STORY-054-03_Spike-Doctrine.md` | **`story`** ✅ | **`spike`** ❌ |
| `SPIKE-001` | `spike` | `spike` |
| `SPIKE-001_Probe.md` | `spike` | `spike` |
| `STORY-054-02_Spike_Type.md` | `story` | `story` |

Then confirmed against the **real test file** in the dry tree (VARIANT B: `SPIKE-` moved to
position 1 of `PREFIX_MAP`, everything else complete):

```
ℹ pass 11 · fail 1
✖ R24 PIN — detectWorkItemType("STORY-054-03_Spike-Doctrine.md") → "story", never "spike"
```

Exactly one failure, and it is the guard. **The guard works.** Note that Scenario 2
(`detectWorkItemType('SPIKE-001') → 'spike'`) passes under *both* placements, so S2 is not
a substitute for it — R24 is carried solely by this assertion.

**Residual (not a blocker, route to [[BUG-051]]):** most-specific-container-last fixes the
`STORY-…Spike…` direction and leaves the inverse open. Measured:
`detectWorkItemType('SPIKE-003_Sprint-Scheduling.md')` → **`'sprint'`** under the correct
placement. Any spike charter whose slug contains a hyphenated other-type word
(`Sprint-`, `Story-`, `Bug-`) mis-types. Inherent to `basename.includes(prefix)`; no
ordering fixes both directions. Record in the commit message alongside the R30 count.

---

## 3. Are the six reds red for the right reason? **Yes — proven, not assumed.**

The concern is real: S3 and S4 both die at
`[cleargate gate] error: unable to detect work-item type from frontmatter`, before any
criterion is evaluated. Neither currently exercises the gate it is named for. The question
is whether they therefore clear *vacuously*. Three executed checks say no.

**(a) Registration alone does not clear them.** VARIANT A — `work-item-type.ts` + `push.ts`
fully registered, gate blocks **absent** from both `readiness-gates.md` trees:

```
ℹ pass 10 · fail 2
✖ S3 — gate passes: §1 + §2 populated, §5 empty
✖ S4 — error: §2 has only 1 listed-item …
   stderr: [cleargate gate] error: no gate definition found for spike.ready-to-investigate
```

The early exit simply moves down one guard (`findGate` → `exitFn(1)`, `gate.ts:221-226`).
S3/S4 require the gate blocks to exist. They cannot clear on registration alone.

**(b) The assertions are discriminating once reached.** Both fixtures evaluated against the
four specified `ready-to-investigate` criteria with the real exported `evaluate()`:

| criterion | S3 fixture (2 bullets in §2) | S4 fixture (1 bullet in §2) |
|---|---|---|
| `question-stated` | PASS `section 1 has 1 listed-item (≥1 required)` | PASS |
| `timebox-and-kill-criteria-set` | PASS `section 2 has 2 listed-item (≥2 required)` | **FAIL `section 2 has 1 listed-item (≥2 required)`** |
| `no-tbds` | PASS | PASS |
| `ambiguity-gate-resolved` | PASS `not-applicable: ## ClearGate Ambiguity Gate section absent` | PASS |

S4's asserted detail string — `section 2 has 1 listed-item (≥2 required)` — matches the
source's output **byte-for-byte, including the `≥` glyph**. It simultaneously pins the
predicate kind (`listed-item`, not `declared-item`), the index (`2`), and the threshold
(`≥2`). That is the sharpest assertion in the file. S3 pins overall-pass on a charter whose
§5 is *empty*, so it goes red if `outcome-declared` is wrongly placed in the
`ready-to-investigate` block. Neither is a count; both are content.

**(c) End-to-end: the specified implementation clears all six and nothing else.** Full
simulated turn in the dry tree, **zero edits to the QA-Red file**:

```
✔ work-item-type — STORY-054-02 spike registration (RED)
✔ spike gate non-vacuity — Pin A (PIN, green at baseline, guard forever)
✔ spike advisory gate — ready-to-investigate (RED, scenarios 3 & 4)
✔ R21 — cleargate push resolves a spike charter to type "spike" (RED)
ℹ tests 12 · pass 12 · fail 0
```

**Verdict:** acceptable as a red baseline. The shared early-exit cause is the *correct*
red for an unregistered type, and — unlike STORY-054-05's S3 — the assertions retain
independent discriminating power after the cause is removed. This is not the multiplicity
problem.

### 3.1 One real coverage gap — `severity` has no machine witness

VARIANT C — both spike blocks flipped to `severity: enforcing`, everything else complete:

```
ℹ tests 12 · pass 12 · fail 0
```

**All twelve stay green.** Reason: `writeCachedGate` runs at `gate.ts:305`, *before* the
severity-based exit routing at `:331-334`, so `cached_gate_result` is written identically
under both severities; and S3's fixture passes, so no exit fires either way. Requirement 4's
`severity: advisory` — and the M1 kick-back criterion "`severity: enforcing` on either spike
block → kick back" — are therefore **enforced by human reading only**. See Ruling 6.

---

## 4. R19 — the no-inert-intermediate claim

**Confirmed, and the direction is right — but QA-Red's predicted red set is wrong in one
place, and two red tests are missing from every document.**

Measured across five states (same five test files each time; the two extra tripwires from
§5.1 are folded in from state 4 on):

| State | What landed | Failures |
|---|---|---|
| **0** PRISTINE | — | the 6 spike reds only |
| **1** Commit A alone (both `readiness-gates.md` trees) | registry declares 18, tests expect 14 | **S1a, S1b, S3a, S3b, S6** + `gate-unit` block-count + `readiness-predicates` block-count + the 6 spike reds |
| **2** Commit B `src` only (no test edits) | 9 transitions, registry still 14 | `WORK_ITEM_TRANSITIONS has 8 entries` + S3/S4 only — **the pinning test is fully green** |
| **3** Commit B full (src + all T2 test edits), registry absent | tests expect 18, registry declares 14 | **S1a, S1b, S3a, S3b, S6** |
| **4** A + B complete | — | **`gate-unit` + `readiness-predicates` block-count only** (see §5.1) |

Two corrections to the recorded prediction:

- **S5 does NOT go red in either direction.** S5a/S5b build their own synthetic
  registry/fixture pairs, so a real-tree mismatch never reaches them. The M1 plan
  (`§Handling`, "B alone — … **S5 red** (four orphan fixture rows)") and QA-Red §4 both
  name S5. It stays green in states 1 and 3.
- **S3a and S3b DO go red, in both directions,** and nobody predicted them. They assert an
  *exact* finding list against a mutated `CR.md`; a registry/fixture mismatch injects extra
  findings ("no template found for spike…" in state 1, orphan rows in state 3) and the list
  no longer matches. A Developer told to expect "S1a/S1b/S5/S6" and seeing "S1a/S1b/S3a/S3b/S6"
  will reasonably suspect they broke `CR.md`. **They did not.**

**State 2 is the useful discovery:** landing the `src` edits alone leaves the pinning test
entirely green. The red window is opened by the *registry*, not by the code. That makes the
sequence below safe by construction.

### Exact sequence for the single Developer turn

The red window is a property of commit granularity, not of the working tree. Do **all**
edits before **any** test run, and there is no midway state to misread.

1. **Preconditions.** Both repos on `story/STORY-054-02`; outer is the **MAIN checkout**,
   not a worktree (`git rev-parse --show-toplevel` must be `/Users/ssuladze/Documents/Dev/ClearGate`).
   `ls .cleargate/templates/spike.md cleargate-planning/.cleargate/templates/spike.md` — both present.
2. **Edit the outer repo** (Commit A's four files: `readiness-gates.md` ×2 trees,
   `cleargate-protocol.md` ×2 trees). **Do not commit yet.** Verify both mirror pairs with
   `diff` before proceeding.
3. **Edit `cleargate-cli`** — `src/lib/work-item-type.ts`, `src/commands/push.ts`, and the
   **seven** test sites of §5.2. **Do not commit yet.** No test has been run at this point.
4. **Run once, now that the tree is complete:** `npm --prefix cleargate-cli run typecheck`,
   then the targeted files, then the full suite. Expected: green except the known
   pre-existing `test/commands/sync.node.test.ts` network failure.
5. **State-touch, then commit A (outer).** `STORY-054-02` currently holds `max(updated_at)`
   and is `Bouncing`, so the surface gate resolves correctly — but re-touch immediately
   before staging, because any intervening agent write flips the fallback
   (sprint-context amendment `M1/wave3 · MECHANISM`):
   `CLEARGATE_STATE_FILE="$PWD/.cleargate/sprint-runs/SPRINT-39/state.json" node .cleargate/scripts/update_state.mjs STORY-054-02 Bouncing`
6. **Commit B (`cleargate-cli`), back-to-back, same turn.** Record the R30 registry count
   and the §2 prefix residual in the commit message.

**The trap, stated for the dispatch:** if you run the suite between steps 2 and 3 you will
see four `no template found for work_item_type "spike" — either add one to TEMPLATE_FOR or
add "spike.<id>" to KNOWN_UNPINNABLE` findings. The message names the escape hatch. **Taking
it trips `:634`'s `KNOWN_UNPINNABLE.size === 2` instead** — a louder failure, one bounce
later. Do not run the suite until step 4.

---

## 5. T2 arithmetic — verified, and it is short by two sites

### 5.1 The numbers are right

Measured from the files, not inherited:

| Claim | Measured | After |
|---|---|---|
| `section(N)` criteria in `readiness-gates.md` | **14** (`bug 1, cr 2, epic 2, hotfix 3, initiative 2, proposal 2, story 2`) | **18** |
| new `section(N)` criteria from the two spike blocks | **4** (`question-stated`, `timebox-and-kill-criteria-set` in `ready-to-investigate`; `decision-log-populated`, `outcome-declared` in `ready-to-conclude`; `no-tbds`/`ambiguity-gate-resolved` are not `section(N)`) | — |
| S1a `:432` | `14` | **`18`** ✅ |
| S1a `:434` | `12` | **`16`** ✅ |
| S6 `:644` | `12` | **`16`** ✅ |
| S6 `:634` `KNOWN_UNPINNABLE.size` | `2` | **`2` — unchanged** ✅ |
| `EXPECTED_HEADINGS` rows | 12 | 16 (4 added) |

All four confirmed empirically: the dry tree with exactly these values runs the pinning
test green (state 4). **STORY-054-02 §3.1 and the M1 plan are correct on the arithmetic.**

**But two existing tests hardcode the gate-*block* count and go red on a complete, correct
implementation.** The live registry has **9** fenced yaml blocks; the two spike blocks make
**11**:

| File:line | Assertion | Fix |
|---|---|---|
| `cleargate-cli/test/commands/gate-unit.node.test.ts:748` | `assert.strictEqual((blocks).length, 9);` | → **`11`** |
| `cleargate-cli/test/lib/readiness-predicates.node.test.ts:714` | `assert.strictEqual((yamlBlocks).length, 9);` | → **`11`** |

Neither is named in STORY-054-02 §3.1, the M1 plan, `sprint-context.md`, R20, T2, or
QA-Red's §4 prediction. Both are the **same tripwire class as R20's `8 entries`** — a
hardcoded registry census in a file the story never mentions. With both bumped, the dry-run
failure set at state 4 becomes byte-identical to the pristine failure set (4 dry-tree
artifacts from the scratch layout, present in both states). **That is the whole delta.**

Both resolve their path as `resolve(dirname(import.meta.url), '..','..','..')` — the MAIN
checkout, same R18 property as the pinning test. Consistent with executing in place.

### 5.2 Complete edit-site census — seven test sites, not four

| # | File:line | Edit |
|---|---|---|
| 1 | `test/docs/gate-section-index-pinning.node.test.ts:111-118` | `TEMPLATE_FOR` += `spike: 'spike.md'` |
| 2 | `test/fixtures/gate-section-index/expected-headings.ts` | four rows |
| 3 | `…pinning.node.test.ts:432` / `:434` | `14`→`18`, `12`→`16` |
| 4 | `…pinning.node.test.ts:644` | `12`→`16` (`:634` stays `2`) |
| 5 | `test/lib/work-item-type.node.test.ts:184` | `8`→`9` (R20) |
| **6** | **`test/commands/gate-unit.node.test.ts:748`** | **`9`→`11` — UNLISTED** |
| **7** | **`test/lib/readiness-predicates.node.test.ts:714`** | **`9`→`11` — UNLISTED** |

### 5.3 Stale prose — six sites in the pinning test, not three, plus one homonym trap

The M1 plan and `sprint-context.md` name three stale *titles*. The same numbers appear
three more times in that file's header block:

| Line | Current text | Becomes |
|---|---|---|
| `:22` | `12 pinnable of 14 total` | `16 pinnable of 18 total` |
| `:23` | `byte parity across the six templates + registry` | `seven templates` |
| `:41` | `14 = 12 pinnable + 2 known-unpinnable` | `18 = 16 pinnable + 2` |
| `:430` | S1a title `exactly 14 … (12 pinnable + 2 …)` | `18 … (16 pinnable + 2 …)` |
| `:443` | S1c title `… + six templates are byte-identical` | `seven templates` |
| `:633` | S6 title `… (size 2); 14 = 12 pinned + 2` | `18 = 16 pinned + 2` |

**`:7` is a homonym — do NOT touch it.** `"every one of the 14 test() cases below is
expected GREEN"` counts **test cases**, not criteria. This story adds no test to that file;
it stays `14`. A Developer grepping the file for `14` will find `:7` first.

Same class in the two new sites: `gate-unit.node.test.ts:738` (title) and `:747` (comment),
`readiness-predicates.node.test.ts:699` (title) and `:713` (comment) all narrate
`… CR-027 sprint=7th, CR-030 initiative=8th, STORY-043-04 hotfix=9th`. Extend, do not
rewrite.

---

## 6. Wiring checks (the five TPV questions proper)

| # | Check | Result |
|---|---|---|
| 1 | All imports resolve to real modules | **PASS** — all 7 modules exist; `detectWorkItemTypeFromFm`/`detectWorkItemType`/`WORK_ITEM_TRANSITIONS` (`work-item-type.ts:43/:59/:75`), `evaluate`/`ParsedDoc` (`readiness-predicates.ts:154/:25`), `gateCheckHandler` (`gate.ts:152`), `pushHandler` (`push.ts:87`), `McpClient`/`AdapterInfo` (`mcp-client.ts:51/:44`), `parseFrontmatter` (`parse-frontmatter.ts:16`), `serializeFrontmatter` (`frontmatter-yaml.ts:17`) |
| 2 | Constructor / handler signatures match source | **PASS** — `gateCheckHandler(file, {verbose?,transition?}, cli?: GateCliOptions)`; the seam object supplies exactly `cwd`/`stdout`/`stderr`/`exit`/`now`, all members of `GateCliOptions` (`gate.ts:39-49`), `now` correctly typed `() => Date`. `pushHandler(fileOrId, opts: PushOptions)`; the seam supplies `projectRoot`/`mcp`/`stdout`/`stderr`/`exit`/`now`, all members (`push.ts:63-85`), `now` correctly `() => string` (**note the two handlers differ — the test gets both right**). Mock `McpClient` implements both `call<T>` and `adapterInfo`. |
| 3 | `t.mock.method()` targets exist | **N/A** — no `t.mock` used; hand-rolled seam objects and a hand-rolled `McpClient` throughout. |
| 4 | setup/teardown leaves no orphan state | **PASS** — both `before`-hooks that create state have matching `after` hooks (`:288-289`, `:432-443`) calling `fs.rmSync(dir,{recursive,force})`. Fixtures live in `os.tmpdir()`; nothing is written under the repo. Pin A and the R24 guard are pure reads. |
| 5 | Red-test naming per `sprint_context.md` §Test Stack | **PASS as authored** (`*.red.node.test.ts`) — but see Ruling 5: the M1 plan's Commit B file list names the *promoted* path. |

Additional wiring note, in the test's favour: the `as Record<string, string[]>` cast at
`:124` is required, not cosmetic — `'spike'` is not yet a member of the closed
`WorkItemType` union, so a bare index would fail `tsc`, not merely fail at runtime. It
matches `work-item-type-hotfix.red.node.test.ts:97` precedent exactly.

---

## 7. Rulings — the Developer must follow these

1. **Bump the two unlisted block-count assertions in the same cli commit.**
   `test/commands/gate-unit.node.test.ts:748` `9`→**`11`** and
   `test/lib/readiness-predicates.node.test.ts:714` `9`→**`11`**. Also extend their titles
   (`:738`, `:699`) and comments (`:747`, `:713`) with `+ spike ×2 = 11`. Without these the
   turn ends with two red tests that look unrelated to the story.
2. **Update all six stale prose sites in the pinning test** (§5.3): `:22`, `:23`, `:41`,
   `:430`, `:443`, `:633`. **Do not touch `:7`** — its `14` is the test-case count and is
   unchanged.
3. **Follow the §4 sequence.** All edits in both working trees *before* the first test run;
   one suite run at step 4; state-touch immediately before the outer commit; commit A then
   commit B, same turn. **Never** resolve a mid-way `no template found for work_item_type
   "spike"` finding by adding to `KNOWN_UNPINNABLE`.
4. **Expect S3a/S3b, not S5, if you do land a partial state.** The corrected red-window set
   in either direction is `S1a, S1b, S3a, S3b, S6` (+ the two from Ruling 1 when the
   registry is in). `CR.md` is not broken; `S5` will not fire.
5. **Test-file name.** The M1 plan's Commit B list names
   `test/lib/work-item-type-spike.node.test.ts` (no `.red`), matching STORY-054-05's
   promotion precedent (`git mv` from the `.red` name on promotion, recorded at
   `gate-section-index-pinning.node.test.ts:4-5`). QA-Red committed the `.red` name per
   §Test Stack, which is correct for the red phase. **Ruling: `git mv` it to
   `test/lib/work-item-type-spike.node.test.ts` in Commit B.** The file contains two
   permanent PINs (Pin A, R24) that must stay green forever; leaving `.red.` in the name
   mislabels them as transient. Content must not change — the `git mv` is the only edit.
6. **`severity: advisory` has no machine witness — QA-Verify must read the YAML.** Flipping
   both blocks to `enforcing` leaves all 12 tests green (§3.1). The M1 kick-back criterion
   stands and is now known to be human-only. Do **not** add a severity assertion to the test
   file — that is new scope on a QA-Red artifact; record it as a QA-Verify step.
7. **Do not edit the QA-Red test file otherwise.** It is correct as authored. The simulated
   turn clears all six reds and keeps all six pins green with **zero** changes to it.

## 8. For the orchestrator (not the Developer)

- **§3.1 amendment required.** `cleargate-cli/test/commands/gate-unit.node.test.ts` and
  `cleargate-cli/test/lib/readiness-predicates.node.test.ts` are absent from the story's
  `Related Files`. Both are mandatory edits. Commits inside `cleargate-cli` are ungated
  (Cross-Cutting Rule 6), so nothing blocks — but §3.1 is the QA-Verify contract, and an
  incomplete one invites a kick-back on a correct implementation.
- **BUG-051 gains a measured row:** `detectWorkItemType('SPIKE-003_Sprint-Scheduling.md')`
  → `'sprint'` under the mandated correct placement. `includes`-based prefix matching has
  no ordering that satisfies both collision directions.
- **BUG-054 gains a second measured row:** the M4 mutation shows a heading *deletion* is a
  live vacuity vector, distinct from the nine `declared-item`/`listed-item` rows already
  recorded. Pin A is the only witness anywhere in the registry, and it covers `spike` only.

## Script Incidents

None. No `run_script.sh` invocation was required; all runs used the sanctioned targeted-run
command from `sprint-context.md` §Test Stack.

## Repo state at exit

Both repos byte-identical to the dispatch-start snapshot. Outer: the 7 pre-existing
modified `pending-sync/` items, 4 hook-owned sprint-run artifacts, `MANIFEST.json`, and the
untracked QA-Red report. `cleargate-cli`: only the pre-existing untracked
`cleargate-0.23.1.tgz`. `spike.md` sha256 unchanged in both trees. No commit, no branch, no
merge, no push.
