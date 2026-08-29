role: architect · Mode: TPV (mutation-testing gate) · SPRINT-39 · wave 10 · M4 · BUG-045

# TPV: rulings-required

**SURVIVORS — four mutants pass the entire authored R1–R7 baseline:**

1. **M9 — the `classifyType(id) === 'HOTFIX'` filter dropped while widening the helper.** Passes R1–R7 *and* passes the item's own real-tree collision argument. On this repo's live tree it allocates **`HOTFIX-115`** (it tracks the CR/EPIC/STORY numbering), which collides with nothing and therefore looks correct by every criterion the item states. Highest-severity survivor. Killed only by new **R14**.
2. **M6b/M6c — one `try/catch` around the whole directory loop instead of one per directory.** `catch { return 0 }` discards an accumulated max when a *later* directory is missing; `catch { return max }` abandons a *later* directory when an earlier one is missing. R3 cannot reach either, because R3's fixture leaves `pending-sync/` present-and-empty. Realistic: **git does not track empty directories**, so a fresh clone materialises neither. Killed only by new **R9** (both) and **R10** (M6b).
3. **M3b — a hand-rolled, case-*sensitive*, underscore-only id regex (`/^HOTFIX-(\d+)_/`).** R4 exercises only the case-*in*sensitivity direction. This is verbatim the pattern `hotfix.ts:41-42` records as having already shipped once as BUG-041 — and `check:no-inline-id-regex` **cannot see it** (§T7). Killed only by new **R12**/**R13**.
4. **M5d — pad width inherited from the widest scanned numeric stem (defaulting to 3).** Every id in R1–R7 is already 3 digits, so an inheriting mutant reproduces the correct answer everywhere in the battery. Load-bearing for CR-108, whose pad width is **per-type** (`SPRINT-39` is 2-digit unpadded — M4 plan F4). Killed only by new **R11**.

With the seven scenarios ruled in below, **zero mutants survive**: **17 mutants built, 17 killed**, each against the augmented file; `FIX` green at 14/14.

---

## Method

Mutants were built and executed **entirely out of tree**. Nothing under `cleargate-cli/src/`, `cleargate-cli/test/`, or the outer repo was written, moved, or renamed. `git status --porcelain` in `cleargate-cli` is empty; HEAD is unchanged at `6169ed7` on `story/BUG-045`.

Scratch tree: `<scratchpad>/mut/` — `src/commands/hotfix.ts` (regenerated per variant from a byte-verified copy of the shipped file), `src/lib/{work-item-id,project-root}.ts` (copies), `test/commands/{battery,probe,final,integ}.node.test.ts`, `node_modules` symlinked to the cli checkout, `tsconfig.json` copied.

- `battery.node.test.ts` is the authored red file **byte-identical apart from line 37** (`REPO_ROOT`, hardcoded because the copy sits at a different depth; it resolves to the same absolute path, `/Users/ssuladze/Documents/Dev/ClearGate`, that the in-tree file computes).
- `BASE` was verified `diff`-identical to `cleargate-cli/src/commands/hotfix.ts` before any run.
- Runner: `npm --prefix cleargate-cli exec -- tsx --test --test-concurrency=1 --test-reporter=tap <file>`, output redirected to a log and read from the completed file. No live run was piped through `tail`/`head` (N10).

**QA-Red's full-suite number independently reproduced.** `npm --prefix cleargate-cli test` at `6169ed7`, redirected to a log and read from the completed file (N10):

```
ℹ tests 2583 · ℹ suites 903 · ℹ pass 2577 · ℹ fail 5 · ℹ skipped 1
```

Failing set, verbatim from the log — **byte-for-byte QA-Red's list**:

```
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:2692    (R1)
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:3260    (R2)
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:4227    (R4)
test/commands/hotfix-id-archive-scan.red.node.test.ts:1:5209    (R6)
test/commands/sync.node.test.ts:1:18146                          (pre-existing network case)
```

No other file in the suite is red. Every number in QA-Red's report is confirmed.

**Control reproduced exactly.** `BASE` against the authored battery: `pass 3 · fail 4`, failing **R1 R2 R4 R6**. This is QA-Red's stated red set, independently reproduced.

---

## §T1 — Mutation battery (Part 1). 17 variants, measured.

`✝` = killed. Column shows the scenario(s) that killed it in the **authored** battery (R1–R7), and in the **augmented** battery (R1–R15).

| Mutant | What it does | Killed by (R1–R7) | Killed by (R1–R15) |
|---|---|---|---|
| **FIX** | union over N dirs, per-dir ENOENT tolerance | — (7/7 green) | — (14/14 green) |
| **M1** | scan `archive/` instead of the union | ✝ **R5** | ✝ R5, R10 |
| **M2a** | archive consulted only as a *fallback* when pending yields 0 | ✝ **R2** | ✝ R2 |
| **M2b** | per-directory max, accumulator reset each dir (last dir wins) | ✝ **R5** | ✝ R5, R10 |
| **M3a** | inline regex `/^HOTFIX-(\d+)[_.-]/i` (case-insensitive) | ✝ **R4** | ✝ R4 |
| **M3b** | inline regex `/^HOTFIX-(\d+)_/` (case-sensitive, underscore-only) | **SURVIVES** | ✝ R12, R13 |
| **M4a** | `nextId = maxId` (reuse the max) | ✝ R1 R2 R3 R4 R5 R6 | ✝ 13 of 14 |
| **M4b** | `nextId = maxId + 2` (skip a number) | ✝ R1 R2 R3 R4 R5 R6 | ✝ 13 of 14 |
| **M5a** | `padStart` dropped | ✝ R1 R2 R3 R4 R5 R6 | ✝ 13 of 14 |
| **M5b** | `padStart(2, '0')` | ✝ R1 R2 R3 R4 R5 R6 | ✝ 13 of 14 |
| **M5c** | width inherited from widest stem, default **1** | ✝ **R3** | ✝ R3, R11, R14, R15 |
| **M5d** | width inherited from widest stem, default **3** | **SURVIVES** | ✝ R11 |
| **M6a** | per-dir `try/catch` removed entirely (raw `readdirSync`) | ✝ **R3** | ✝ R3, R9, R10 |
| **M6b** | one `try/catch` round the whole loop, `catch { return 0 }` | **SURVIVES** | ✝ R9, R10 |
| **M6c** | one `try/catch` round the whole loop, `catch { return max }` | **SURVIVES** | ✝ R9 |
| **M7** | allocator inherits `countActiveHotfixes`'s 7-day mtime filter | ✝ **R6** | ✝ R6 |
| **M8** | the union scan leaks into the cap (`countActiveHotfixes`) | ✝ **R7** | ✝ R7 |
| **M9** | `classifyType(id) === 'HOTFIX'` filter dropped | **SURVIVES** | ✝ R14 |

Dispatch-mandated coverage, mapped: **M1** = M1 above (killed by R5, not by R1/R2 — see §T3). **M2** = M2a/M2b. **M3** = M3a/M3b + §T7. **M4** = M4a/M4b. **M5** = M5a/M5b/M5c/M5d. **M6** = M6a/M6b/M6c.

### The two survivors that matter most, in one sentence each

- **M9 defeats the item's own acceptance argument.** BUG-045 §1 defines correct behaviour as *"an ID strictly greater than every HOTFIX id that has ever existed"* and argues severity from **collision**. M9 satisfies the collision criterion on this repo (`HOTFIX-115`, no collision) while being flagrantly wrong. Replayed read-only against the live tree: `shipped scan → HOTFIX-001` (collision), `union scan → HOTFIX-002` (correct), `union scan minus the type filter → HOTFIX-115` (no collision, wrong).
- **M6b/M6c is the fresh-install case the item's own §2 edge-condition list names** (*"`archive/` absent entirely (fresh install) → must not throw"*), and R3 tests only the half of it that cannot fail.

---

## §T2 — Adjudication A. The dispatch's premise is HALF right; the correction is measured.

**The dispatch says "the item's §2 reproduction is decorative." That is wrong, and the distinction matters.**

- **§2 Reproduction Protocol is diagnostic.** Executed verbatim as **R15** (`hotfix new "first"` → `mv` to `archive/` → `hotfix new "second"`), it is **RED at `BASE`** and green under `FIX`. It is the only scenario in the whole set that drives two sequential real invocations through the create → archive → create path rather than a pre-seeded fixture. It must be **added**, not amended away.
- **§5 case 2 is the non-diagnostic one**, and QA-Red is correct about it. Reproduced as `P3`: `HOTFIX-001` in `archive/`, `HOTFIX-002` in `pending-sync/`, expect `HOTFIX-003`. Measured **GREEN at `BASE`** — `pendingDir`'s own archive-blind max is already `2`, so the shipped, unfixed code returns the right answer by coincidence. A fix could be omitted entirely and this scenario would pass.
- **QA-Red's substituted R2 is correct and is confirmed red at `BASE`** (`pending=002`, `archive=005`, expect `006`). It is the sole killer of M2a (the fallback-not-peer mutant), so it is load-bearing and must stay.
- QA-Red's own caveat is also confirmed: R2 does **not** independently distinguish "scan `archive/` alone". That mutant (M1) is caught by **R5** — a scenario QA-Red classified as an orthogonal padding guard. R5 is doing load-bearing work it does not know about (§T3).

**Ruling.** BUG-045 §5 case 2 is decorative and its numbers are misleading; **§2 is not**. The item's §5 case-2 line should be corrected to the `pending=002 / archive=005 → 006` arrangement, with the reason recorded. **The Architect does not edit item files under this dispatch** — handed to the orchestrator as a one-line amendment (§T9). It is not a blocker: R2 already encodes the corrected fixture, and R15 encodes §2.

---

## §T3 — Adjudication B. All three green-by-design guards are real. Two are misattributed. One is under-specified.

| Guard | Named mutant | Does it kill it? | Measured reality |
|---|---|---|---|
| **R3** — `archive/` absent → no throw | drop the archive `try/catch` | **YES** (kills M6a) | Also kills **M5c** (width-inheritance defaulting to 1) — an unadvertised second kill. **But** it does *not* reach M6b or M6c, and those are the same failure family. R3's fixture leaves `pending-sync/` present-and-empty, so the directory that would throw is also the one with no data to lose. |
| **R5** — `HOTFIX-009` → `HOTFIX-010` | drop `padStart`, or derive width from input | **YES** (kills M5a, M5b) | **Misattributed, and much more valuable than its comment claims: R5 is the ONLY killer of M1 (`maxHotfixId(archiveDir)` alone) and of M2b in the authored battery.** Its comment calls it *"deliberately isolated to `pendingDir` only, orthogonal to the archive-scan defect"* — that isolation is precisely what makes it the union-semantics witness. Do not "simplify" it by moving the id into `archive/`. **It does not kill the derive-width mutant it names** when that mutant defaults to 3 (M5d survives). |
| **R7** — cap still respects the 7-day window | union scan leaking into `countActiveHotfixes` | **YES** (kills M8) | Correct as written and correctly scoped. Its deliberate id range (901-903) and its assertion scoped to exit code + absence of the cap message are both right: entangling it with an allocator assertion would make it fail for the wrong reason. Keep verbatim. |

**Ruling.** No guard is padding. R3 is retained but is insufficient for its own stated purpose and is supplemented by R9/R10. R5 is retained **verbatim** and its comment should be corrected to name M1/M2b as its real kills.

---

## §T4 — Adjudication C. The real-tree reproduction is independently confirmed.

Reproduced from a fresh script against the live outer meta-repo, read-only, through the same exported grammar helpers `hotfix.ts:17` imports. No outer-repo file written, moved, or renamed.

```
pending-sync/ HOTFIX-*   -> (none)
archive/      HOTFIX-*   -> HOTFIX-001_init_skip_strips_exec_bit.md

shipped scan (pending only)   max=0  -> would allocate HOTFIX-001
union scan (pending+archive)  max=1  -> would allocate HOTFIX-002
COLLISION on shipped path: true  -> HOTFIX-001
COLLISION on fixed path  : false -> HOTFIX-002
```

Identical to QA-Red's transcript and to the M4 plan's own measurement. **Confirmed: the next `cleargate hotfix new` in this repository would today mint a duplicate `HOTFIX-001`.**

One qualification the evidence does not carry on its own, added here: **collision-freedom is not sufficient as an acceptance criterion.** M9 is collision-free on this tree and wrong. Whoever verifies this fix must check the allocated id, not just the absence of a clash (R14).

---

## §T5 — Adjudication D. R8: the two failures are unrelated, the file is genuinely unrun, and that matters.

**Confirmed, three ways.**

1. **The failures are unrelated and pre-existing.** `test/commands/hotfix-new.integration.node.test.ts` → `tests 9 · pass 7 · fail 2`. Both failures are subtests of *"Scenario 5: wiki/index.md has Hotfix Ledger section linking to hotfix-ledger.md"*, failing on `The input did not match the regular expression /## Hotfix Ledger/` against the **outer meta-repo's** `.cleargate/wiki/index.md`. No id allocation, no `maxHotfixId`, no `countActiveHotfixes`.
2. **The fix does not change them.** Run out-of-tree against `BASE` and against `FIX`: **`pass 7 · fail 2` in both cases, same scenario.** Scenarios 1 (`scaffolds HOTFIX-001`), 2 (`ID increments when HOTFIX-001 already exists`), 3 (cap blocks the 4th), 4 (template stubs) and slug validation are green before and after. The cap scenario that seeds `archive/` (`:349-384`) expects `exit 1`, so the allocator never runs in it — no interaction with the widening.
3. **The file is outside the default tier, and outside every automated tier.** `scripts/run-default-tests.mjs:26` negates `!test/**/*.integration.node.test.ts`. A `test:integration` script **does** exist (`package.json:47`) covering 30 files, but nothing invokes it: `cleargate-cli/.github` does not exist, `prepublishOnly` runs `npm test` (default tier only), and per Cross-Cutting Rule 6 the cli repo has **zero** installed git hooks.

**Ruling — three parts.**

- **The Developer does NOT green them.** Greening requires either rebuilding the outer repo's wiki (out of scope; BUG-045 is cli-only with zero outer commits) or rewriting a legitimate cross-repo dogfood assertion (CR-111's territory). Leave both.
- **The Developer DOES run the file** — `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/commands/hotfix-new.integration.node.test.ts` — and reports `tests 9 · pass 7 · fail 2` with the Scenario 5 attribution. It carries Scenario 2, the only *pre-existing* regression guard on the allocator, and nothing else will run it.
- **Yes, it matters.** A 30-file tier that no gate, no hook and no CI executes is a tier whose green is unverified between hand-runs. It is why `hotfix-id-archive-scan.red.node.test.ts` being in the **default** tier is correct and must stay that way — the fix's regression coverage would otherwise be as unrun as the guard it supplements. Not BUG-045's to solve; recorded as a proposed follow-on (§T10).

---

## §T6 — Adjudication E. `CHANGELOG.md` is undeclared, must be declared, and the entry is specified.

**Confirmed undeclared.** `## 4. Execution Sandbox` lists exactly two rows — `cleargate-cli/src/commands/hotfix.ts` and `cleargate-cli/test/`. `CHANGELOG` appears in the item **once**, at `:134`, inside the `## Task Breakdown` block the orchestrator committed from the M4 plan (R5). It is a task row with no surface declaration behind it. Given N4 (the surface gate is inert for `BUG-`/`CR-` items), the plan's corrected three-row surface is the only control.

**Mechanical facts the Developer needs:**

- `cleargate-cli/CHANGELOG.md:6` is `## Unreleased`; `grep -c '^## Unreleased'` returns **1** and must still return **1** after M4 (plan X11).
- `## Unreleased` currently holds `### Changed` (CR-105) and `### Known limitations` (BUG-061). It has **no `### Fixed`**.
- The most recent released section, `## [0.24.2]`, orders its subsections **Fixed → Added → Changed**. Follow the file, not the Common-Changelog default.
- `test/changelog-format.node.test.ts:128` matches only `^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$`. `## Unreleased` is invisible to it, so this edit cannot move the suite. `:140-149` asserts the **topmost `## [X.Y.Z]` heading equals `package.json.version`** (`0.24.2`).
- `test/commands/upgrade-changelog.node.test.ts` writes its own synthetic changelog into a fixture root; it does not read the real file.

**Ruling.**

1. Insert a `### Fixed` subsection **immediately after line 6 (`## Unreleased`), above the existing `### Changed`**. Do not open a second `## Unreleased`.
2. **Do not touch `package.json`.** `:140-149` pins the topmost `[X.Y.Z]` to `0.24.2`; bumping the version without adding a dated release heading turns the suite red, and adding one is a release action reserved for Gate 4.
3. Required content — the entry must state (a) the user-visible behaviour change, (b) why it fires in normal use rather than as an edge case, and (c) the mtime asymmetry, because that is the part a reader will otherwise assume is a bug:

```markdown
### Fixed
- **`cleargate hotfix new` reused archived hotfix IDs (BUG-045).** The next-ID scan read only
  `.cleargate/delivery/pending-sync/`, but the ClearGate protocol *mandates* moving an item to
  `.cleargate/delivery/archive/` once it is pushed — so the scan was looking in the one directory
  the protocol drains. In the steady state (`pending-sync/` empty, everything archived) the next
  allocation was `HOTFIX-001` again, colliding with the oldest archived hotfix, and two distinct
  work items then shared an ID across the wiki, the ledger, git history and any pushed remote ID.
  The scan now takes the maximum over the union of both directories. Archive **age** is
  deliberately not consulted: the ≤3-per-rolling-7-days cap still counts only recently-archived
  hotfixes, but the ID allocator must see every ID that has ever existed — inheriting the cap's
  7-day filter would have re-opened the bug for any archive older than a week.
```

---

## §T7 — `check:no-inline-id-regex` cannot see the mutant the M4 plan tells QA to check for.

The M4 plan's BUG-045 kick-back criterion 2 offers `npm --prefix cleargate-cli run check:no-inline-id-regex` as the **mechanical** check that no new HOTFIX regex appeared. Measured: for the likely mutant it is not mechanical, it is silent.

`scripts/check-no-inline-id-regex.mjs:47` requires a *regex-ish continuation* immediately after the hyphen:

```js
export const ID_ESCAPE = /-\+?(\\+d|\[0-9\]|\\+w)|\)-\+?\\+d/;
```

A capture group between the hyphen and the escape defeats both alternatives. Probed through the script's own exported predicate and then through `findInlineIdRegexHits()` against a real file under a `src` root:

| Candidate line | Verdict |
|---|---|
| `const m = /^HOTFIX-\d+/.exec(entry);` | **CAUGHT** |
| `const m = /^HOTFIX-(\d+)_/.exec(entry);` | **MISSED** |
| `const RE = /^HOTFIX-([0-9]+)_/;` | **MISSED** |
| `const RE = /^HOTFIX-(\d+)[_.-]/i;` | **MISSED** |
| `if (/HOTFIX-(\d+)/.test(entry)) {}` | **MISSED** |
| `const n = Number(entry.replace(/^HOTFIX-/, '').split('_')[0]);` | **MISSED** |

Confirmed end-to-end: `findInlineIdRegexHits(['<scratch>/mut/src'])` returns `[]` against the **M3b mutant file**, whose line 58 is literally `const m = /^HOTFIX-(\d+)_/.exec(entry);`.

The irony is exact: **the gate's own motivating example is invisible to it.** `hotfix.ts:41` records the shipped BUG-041 defect as `/^HOTFIX-(\d+)_.*\.md$/` — capture-group form. Any hand-rolled parser that actually *uses* the number must capture it, so the caught form (`\d+` with no group) is the one nobody writes.

**Ruling.** Criterion 2's mechanical half stands (run it — it costs nothing and catches the un-grouped form), but **it is not the control.** The control for BUG-045 is **R12 + R13**, which kill M3b behaviourally. QA-Verify must additionally read the diff: `git diff -U0 -- cleargate-cli/src/commands/hotfix.ts | grep -n '/\^\?HOTFIX'` must return nothing on an added line. Widening `ID_ESCAPE` is **not BUG-045's** — recorded as a proposed follow-on (§T10).

---

## §T8 — Part 3. Measured hand-off for the Developer.

### Wiring verification (the five TPV checks, all clean)

1. **Imports resolve.** `node:test`, `node:assert/strict`, `node:fs`, `node:os`, `node:path`, and `../../src/commands/hotfix.js` → `src/commands/hotfix.ts`. The file executes and reports; no `ERR_MODULE_NOT_FOUND`.
2. **Signature match.** `hotfixNewHandler({ slug }, { cwd, stdout, stderr, exit })` matches `HotfixCliOptions` (`hotfix.ts:24-32`) exactly; `now` is optional and correctly omitted.
3. **`t.mock.method()`** — none used. Nothing to mis-reference.
4. **Setup/teardown.** `afterEach` (`:120-125`) drains `tempRepos` and `rmSync`s each `mkdtemp` root; `useRepo` (`:127-131`) registers on creation. No orphan state; nothing is written outside `os.tmpdir()` and the outer repo is read only for the template. Two non-blocking nits: (a) `makeTmpRepo` creates the tmpdir at `:75` but registration happens at `:129`, so a throw inside `copyFileSync` leaks one tmpdir; (b) `runHotfixNew` (`:107-111`) swallows every exception, so a genuine crash is reported as `code === null` with the message lost — the assertions still fail, but the diagnostic is gone. Neither justifies a bounce.
5. **Naming.** `*.red.node.test.ts` per `sprint-context.md` §Test Stack, and confirmed **inside the default glob** — the path appears in the live `run-default-tests.mjs` argv. `@cleargate-tier: unit` at `:1` is consistent.

**This is not a QA-Red bounce.** The wiring is sound and the four authored reds are genuine. The gap is coverage, and TPV has already fixed the fixtures and measured them against a byte-identical copy of the shipped implementation, which is the same evidence a QA-Red round would produce. **`arch_bounces` must not increment.**

### R-case list, measured against `BASE` (= shipped `hotfix.ts` at `e4cb49f`) and `FIX`

| # | Scenario | at `BASE` | after fix | Sole/primary killer of |
|---|---|---|---|---|
| R1 | `archive/` `HOTFIX-001`, pending empty → `HOTFIX-002` | **RED** | green | the shipped scan; M4a/M4b/M5a/M5b |
| R2 | pending `002`, archive `005` → `006` | **RED** | green | **M2a** (fallback-not-peer) |
| R3 | `archive/` absent → no throw, allocate `001` | green | green | **M6a**, **M5c** |
| R4 | malformed + lowercase entries ignored | **RED** | green | **M3a** (case-insensitive regex) |
| R5 | pending `HOTFIX-009` → `HOTFIX-010` | green | green | **M1**, **M2b** (union semantics — see §T3) |
| R6 | archive `001` backdated 30d → `002` | **RED** | green | **M7** (mtime filter in the allocator) |
| R7 | 3 archived 30d ago → cap does not block | green | green | **M8** (union scan leaking into the cap) |
| **R9** | **pending-sync/ absent, archive `001` → `002`** | **RED** | green | **M6b, M6c** |
| **R10** | **pending `009`, archive absent → `010`** | green | green | **M6b** |
| **R11** | **archive `HOTFIX-12` → `HOTFIX-013`** | **RED** | green | **M5d** |
| **R12** | **archive `HOTFIX-007-dash-slug.md` → `008`** | **RED** | green | **M3b** |
| **R13** | **archive `HOTFIX-013.md` → `014`** | **RED** | green | **M3b** |
| **R14** | **archive `STORY-999-01` + `CR-500` → `HOTFIX-001`** | green | green | **M9** |
| **R15** | **item §2 verbatim: create → archive → create → `002`** | **RED** | green | the shipped scan, end-to-end |

R8 stays a hand-run of `hotfix-new.integration.node.test.ts`, not a scenario in this file (§T5).

- **Red → green:** R1, R2, R4, R6 (authored) **+ R9, R11, R12, R13, R15** (ruled in) = **nine**.
- **Must stay green:** R3, R5, R7, R10, R14 — and the rest of the suite.
- Augmented file measured: `BASE` → `pass 5 · fail 9`; `FIX` → `pass 14 · fail 0`. **All 17 variants killed.**

### Expected suite line after the fix

With the seven ruled-in scenarios (14 total in the file):

```
ℹ tests 2590 · suites 910 · pass 2588 · fail 1 · skipped 1
```

Without them (7 scenarios, not recommended): `tests 2583 · suites 903 · pass 2581 · fail 1 · skipped 1`.

Derivation from QA-Red's post-authoring `2583 / 903 / 2577 / 5 / 1`: `+7` tests and `+7` suites for the new describes; of those seven, five are red at `BASE` and two green, so the unfixed-with-additions line would read `2590 / 910 / 2579 / 10 / 1`; the fix flips all nine reds. **The single remaining failure is the pre-existing `test/commands/sync.node.test.ts` network case** (`cannot reach https://cleargate-mcp.soula.ge`) — N10, not yours, do not chase it. Typecheck must be `exit 0`.

### Allocator constraints the battery proved necessary

Each is a mutant this battery kills. None is stylistic.

1. **Union semantics, both directories as peers.** Not `archive`-only (M1), not per-directory-then-first-wins (M2a), not last-wins (M2b). `Math.max` over the union, or a single accumulator that is **never reset inside the directory loop**.
2. **Per-directory missing-directory tolerance.** One `try/catch` (or `existsSync`) **per directory, continuing to the next** — never one wrapped around the whole loop (M6b/M6c), never absent (M6a). Both `pending-sync/` and `archive/` must independently be allowed not to exist. Argument order must not be able to matter.
3. **The type filter survives the widening.** `classifyType(id) === 'HOTFIX'` stays. Dropping it is the survivor that looks correct on every criterion the item states (M9).
4. **No new id regex.** Call `idFromFilename` / `classifyType` / `numericStem` from `../lib/work-item-id.js`, already imported at `hotfix.ts:17`. The grammar accepts `HOTFIX-013_slug.md`, `HOTFIX-013-slug.md` **and** bare `HOTFIX-013.md`; a hand-rolled pattern will not, and the gate will not tell you (§T7).
5. **Pad width is a fixed literal 3, never derived from the scanned corpus** (M5c/M5d). It is a property of the type, not of the data.
6. **`nextId = maxId + 1`.** Not `maxId`, not `maxId + 2`.
7. **`countActiveHotfixes` (`hotfix.ts:74-115`) is byte-unchanged.** The allocator ignores mtime; the cap respects it. They read the same directories for opposite reasons (M7/M8). Verify with `git diff` on the function body, not by test result alone.

### The fix, measured

This shape is green at 14/14 and typechecks clean under the repo's own `tsconfig.json` (`strict`, `noUnusedLocals`, `noImplicitReturns`, `tsc --noEmit` exit 0):

```ts
function maxHotfixId(...dirs: string[]): number {
  let max = 0;
  for (const dir of dirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const id = idFromFilename(entry);
      if (id !== null && classifyType(id) === 'HOTFIX') {
        const stem = numericStem(id);
        if (stem !== null) {
          const n = parseInt(stem, 10);
          if (n > max) max = n;
        }
      }
    }
  }
  return max;
}
```

Call site (`hotfix.ts:162-166`), adding one line above the existing `pendingDir` resolution or below it:

```ts
  const archiveDir = path.join(repoRoot, '.cleargate', 'delivery', 'archive');
  const maxId = maxHotfixId(pendingDir, archiveDir);
```

`hotfix.ts:165-166` (`nextId`, `idStr`) are unchanged. The doc comment at `:44-47` says *"Scan pending-sync/"* and is now false — update it in the same commit (N7). `grep -rn "maxHotfixId" cleargate-cli/src` must still return exactly two hits.

### What CR-108 (w12) may rely on

Measured, and safe to build the nine-type allocator on:

- **The union-over-N-directories signature is already general.** `maxHotfixId(...dirs: string[])` needs no reshaping to serve more types; only the type predicate and the pad width need parameterising.
- **Per-directory ENOENT tolerance is a proven requirement, not a nicety.** R9/R10 pin both directions; carry them forward parameterised.
- **The pad width is a fixed literal and is NOT inherited from the corpus.** This is exactly what makes M4 plan **F4** implementable — CR-108 can attach a per-type `padWidth` (`3` for `HOTFIX`/`BUG`/`CR`/`EPIC`/`INITIATIVE`/`SPIKE`, `2` for `SPRINT`) to the type map, and R11 is the generalisable witness that no width leaks from the data.
- **The type filter is load-bearing and is the axis CR-108 parameterises.** R14 generalises directly to "type X's allocator must not see type Y's ids" — with nine types in one archive directory, this stops being a hypothetical.
- **What CR-108 may NOT lift:** `max + 1` does not generalise to `story` (M4 plan **F5** — `numericStem("STORY-054-06")` returns the **epic** number `054`; story allocation needs the parent as an argument). And `countActiveHotfixes`'s mtime semantics are hotfix-cap-specific; nothing else should inherit them.
- **Blast radius, verified:** `maxHotfixId` has exactly two references in `src/` (definition `:48`, call `:164`); `hotfixNewHandler` is consumed by `src/cli.ts` and the two hotfix test files only. Nothing else in the suite exercises hotfix id allocation.

### Commit checklist

- [ ] `src/commands/hotfix.ts` — widen `maxHotfixId`, pass `archiveDir`, refresh the `:44-47` doc comment. `countActiveHotfixes` byte-unchanged.
- [ ] `test/commands/hotfix-id-archive-scan.red.node.test.ts` — append R9–R15 (§T8 code is measured and copy-ready). Do not modify R1–R7 except R5's comment (§T3).
- [ ] `CHANGELOG.md` — `### Fixed` under the existing `## Unreleased`, above `### Changed`. `grep -c '^## Unreleased'` still `1`. `package.json` untouched.
- [ ] `npm --prefix cleargate-cli run typecheck` → exit 0. Report it (Cross-Cutting Rule 6).
- [ ] `npm --prefix cleargate-cli test` → redirect to a log, read the status line from the completed file. Report `2590 / 910 / 2588 / 1 / 1`. Never pipe through `tail`/`head` (N10).
- [ ] `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/commands/hotfix-new.integration.node.test.ts` → report `9 / 7 / 2`, Scenario 5 attribution (§T5).
- [ ] `npm --prefix cleargate-cli run check:no-inline-id-regex` → clean, **and** eyeball the diff for a capture-group regex (§T7).
- [ ] `grep -rn "maxHotfixId" cleargate-cli/src` → exactly 2.
- [ ] cli-repo commit only. Zero outer-repo commits. No `dist/` rebuild (N9, Gate-4).

---

## §T9 — For the orchestrator (not actioned here; item files are outside this dispatch)

1. **BUG-045 §5 case 2** should read `pending=002 / archive=005 → 006`, with the note: *"the item's original `001` archived / `002` pending → `003` is green against the unfixed tree — `pending-sync/`'s own max is already 2."* §2 needs **no** change; it is diagnostic (§T2).
2. **`cleargate-cli/CHANGELOG.md` should be added to BUG-045 `## 4. Execution Sandbox`** as a third row. It is currently only a task row (§T6). N4 means no gate will notice, which is precisely why it needs to be written down.
3. **M4 plan BUG-045 kick-back criterion 2** should be amended: `check:no-inline-id-regex` is not a mechanical control for this mutant class (§T7).

## §T10 — Proposed flashcards (NOT written — `.cleargate/FLASHCARD.md` is outside this dispatch)

- `2026-08-29 · #id-parsing #gate #danger · check:no-inline-id-regex misses every capture-group form (/TYPE-(\d+)/); it catches only the un-grouped one nobody writes.`
- `2026-08-29 · #test-harness #danger · a green-by-design guard often kills a mutant its own comment does not name — measure kills, do not read them off the comment.`
- `2026-08-29 · #test-harness #fixtures · a two-id fixture where the buggy dir holds the higher id is green at baseline; put the max in the dir the bug cannot see.`
- `2026-08-29 · #test-harness #danger · git tracks no empty directories, so "dir absent" is the common case, not the edge case — test absence of EACH dir, not just one.`
- `2026-08-29 · #test-tiers #danger · cleargate-cli's 30-file integration tier is run by no hook, no CI and no prepublish — its green is only as fresh as the last hand-run.`

## Script Incidents

None. No script was invoked through `run_script.sh`; all measurement was direct `tsx`/`node`/`npm --prefix` execution against an out-of-tree scratch copy.

## Repo state at exit

`cleargate-cli`: branch `story/BUG-045`, HEAD `6169ed7`, `git status --porcelain` empty. `stash@{0}` untouched. Outer repo: no file written, moved or renamed by this dispatch. No `dist/` rebuild, no `cleargate init`, no `cleargate wiki`, no branch switch, no merge.
