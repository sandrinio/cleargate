# CR-108 — TPV (mutation gate) report

role: architect · Mode: TPV · SPRINT-39 · wave 12 · M4 · CR-108 — `cleargate new <type>`

Subject: cli `story/CR-108` @ `637e606` (QA-Red) · outer `.worktrees/CR-108` @ `1af90d6b`.
Every mutant was built, applied and destroyed **out of tree** in
`<scratchpad>/meta/`, a faithful mimic of the meta-repo layout (see §0). Nothing under
`cleargate-cli/`, `.worktrees/CR-108/` or the main checkout was written.

---

## §0 — Method and harness fidelity

The test file resolves its roots by walking **up four levels from its own path**
(`new-command.node.test.ts:79-86`), so a faithful out-of-tree harness needs the cli package to
sit one level below a directory holding `.cleargate/templates/`, `CLAUDE.md` and
`cleargate-planning/CLAUDE.md`. Built as:

```
<scratchpad>/meta/
  .cleargate/templates/            (10 files, copied from the main checkout)
  CLAUDE.md · cleargate-planning/CLAUDE.md
  cleargate-cli/                   (rsync minus .git/node_modules/dist; node_modules symlinked)
```

Runner for every measurement below (never piped — N10):
`cd <scratchpad>/meta/cleargate-cli && npx tsx --test --test-concurrency=1 test/commands/new-command.node.test.ts > <log> 2>&1`

**Control, real repo** (`cleargate-cli` @ `637e606`):
`ℹ tests 45 · suites 14 · pass 5 · fail 40` — QA-Red's number reproduced exactly.

**Control, scratch harness:** `ℹ tests 45 · suites 14 · pass 5 · fail 40` — byte-identical split.
The harness is faithful; every number below is comparable to the real tree.

Scoring convention: the correct reference implementation leaves **two** permanent failures
(N5, N6b — see §2 and §7). A mutant is **KILLED** iff it produces at least one failure outside
that pair.

---

## §1 — Direction B first: the correct reference implementation

Built out-of-tree, deliberately in a shape QA-Red did not specify: a `SCAFFOLD_REGISTRY`
carrying `{ template, padWidth, prefix }`, a `collectIds(prefix, ...dirs)` helper distinct from
BUG-045's `maxHotfixId`, case-exact template resolution by `readdirSync().includes()`, a
`wx`-lockfile with randomised backoff, and **substitution-only** rendering
(`{ID}`/`{SLUG}`/`{ISO}`/`{PARENT_EPIC_ID}`) per OD-3. Plus the eight-template normalisation
in one tree.

**Result: `ℹ tests 45 · pass 43 · fail 2`.** First run, no iteration against the assertions.

The two failures are:

| # | Case | Why it fails for a CORRECT implementation |
|---|---|---|
| N5 | 6 concurrent subprocesses | **Harness wiring defect.** See §2. |
| N6b | `stampFrontmatter` corruption | **Deliberately red by QA-Red**, pending RULING 1. See §7. |

**Verdict on direction B: the baseline is satisfiable and well-formed for 43 of 45 cases.**
No assertion over-fits QA-Red's imagined shape — my registry key names, helper decomposition,
error strings and lock mechanism all differ from the wiring contract's prose and every one of
the 43 passed. The `newHandler(opts, cli)` five-seam signature is the only real coupling and it
mirrors `hotfixNewHandler` exactly, which is correct.

**Three of the 43, however, are green today and go RED the moment the Developer does what
CR-108 requires.** That is the load-bearing direction-B finding and it is §3 and §4.

---

## §2 — N5 is unsatisfiable as shipped, and vacuous once fixed

### §2.1 As shipped: fails for every implementation, including a correct one

`spawnNewCommand` (`new-command.node.test.ts:213-232`) spawns
`node --import tsx/esm --input-type=module -e <script>` with `cwd: args.cwd` — the **tmp repo**
(`/var/folders/.../cg-new-test-*`). Node resolves an `--import` specifier relative to that cwd.
There is no `node_modules` there, nor anywhere above it.

Measured directly:

```
$ cd $(mktemp -d) && node --import tsx/esm --input-type=module -e 'console.log("ok")'
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from /private/var/folders/.../
```

A global `tsx@4.22.1` exists at `/opt/homebrew/lib`; node's ESM resolver does not consult the
global root, and the error above is with it installed.

Under the correct reference implementation, N5 fails with exactly this, ×6:

```
AssertionError: subprocess 0 must exit 0. stderr:
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'tsx' imported from /private/var/folders/.../cg-new-test-amsK4f/
```

**N5 as authored cannot pass. It is a 100% false red and would bounce the Developer.**

### §2.2 Once wired, it discriminates nothing

One-line fix — `spawn(..., { cwd: CLI_ROOT, ... })`; the repo root already reaches the handler
through the `-e` script's `{ cwd: <tmp repo> }` argument, so nothing else changes. Applied to a
copy of the test file:

| Implementation | Runs | Result |
|---|---|---|
| Correct (with `wx` lock) | 1 | `pass 1 · fail 0` |
| **Lock removed entirely** | **8** | **`pass 1 · fail 0` — 8 for 8** |

The lock-free mutant passes the correctly-wired N5 **eight times out of eight**. Cause: each
subprocess pays ~200–400 ms of tsx startup while the read-scan-write critical section is
sub-millisecond, so six processes serialise by luck.

Proof that the assertion *could* discriminate if the window were real — same lock-free mutant,
150 ms inserted between id computation and write:

```
run 1: pass=0 fail=1  expected 6 distinct ids, got 2
run 2: pass=0 fail=1  expected 6 distinct ids, got 2
run 3: pass=0 fail=1  expected 6 distinct ids, got 2
```

Widening the natural window instead (3000 seeded `CR-*.md` in `archive/`) gives 1 pass / 2 fail
across 3 runs — **flaky, not deterministic**, so it is not an acceptable amendment.

**N5 therefore fails in both directions at once: it bounces every correct implementation today,
and once fixed it certifies a lock-free implementation as green.** The §0.5 human decision
("scan both directories under a lockfile, then create the file before releasing") has zero
mechanical enforcement.

---

## §3 — N13 goes RED on CR-108's own mandated edit (direction-B bounce)

N13's two cases are green today and are listed as regression pins independent of `new.ts`. They
are not independent of **CR-108's outer half**, which the item's own task rows require:

> `- [ ] Edit CLAUDE.md:33 and cleargate-planning/CLAUDE.md:39 in the SAME commit; run the ANCHORED block-equal check`

That sentence is **inside** the bounded block. Both N13 assertions hard-code pre-edit lengths:
`11762` (anchored, `:679`) and `10606` (unanchored, `:692`).

Measured — CR-108's real edit (replace the "Use the templates in …" sentence with the
`cleargate new` directive), applied **correctly to both trees**:

```
G4b-both-trees: 41 pass / 4 fail
    FAIL: anchored block-equal is true and both blocks are 11762 chars
    FAIL: the UNANCHORED form is a trap: it also reports true, but at the WRONG length
  AssertionError: anchored block length pin ...
  11818 !== 11762
```

The **equality** assertion still passes (both trees mirrored); only the two frozen constants
fail. The un-mirrored control confirms the equality half is genuinely load-bearing:

```
G4-root-only (root edited, canonical not): 41 pass / 4 fail   (equality AND length both red)
```

The relational property the constants were reaching for survives the edit and is invariant:

| File state | anchored | unanchored | anchored > unanchored |
|---|---|---|---|
| pre-edit root | 11762 | 10606 | true |
| post-edit root | 11818 | 10662 | true |
| post-edit canonical | 11818 | 10662 | true |

**Ruling: keep `assert.equal(a, b)`; replace both frozen lengths with
`assert.ok(anchoredLen > unanchoredLen)`.** That states the anchoring property (BUG-043's
defect) without pinning a byte count of a file the CR is required to change.

---

## §4 — The cross-repo template-visibility defect (the largest direction-B bounce)

`REPO_ROOT` (`:79`) resolves to `path.resolve(<test file>, '..','..','..','..')`. Measured:

```
/Users/ssuladze/Documents/Dev/ClearGate          ← the MAIN checkout, branch sprint/S-39
```

`cleargate-cli/` is its own repo living **inside** the main checkout; a worktree materialises
tracked files only and `.worktrees/CR-108/cleargate-cli` does not exist (`ls` → *No such file
or directory*; BUG-046 flashcard). So `LIVE_TEMPLATES_DIR` and both `CLAUDE.md` paths are
always the **main checkout's**, never the worktree's.

CR-108's outer half — the eight-template normalisation and the two `CLAUDE.md` edits — is
committed in `.worktrees/CR-108`. The cli suite cannot see it.

Measured: **correct cli implementation + the shipped (un-normalised) templates**:

```
V0-unnormalised-templates: 33 pass / 12 fail
  N3  ×4  story / epic / initiative / hotfix  ({EpicID} {StoryID} {StoryName} {NNN} {semver} {Slug} survive)
  N8  ×4  bug / cr / epic / initiative        (bug_id renders "BUG-BUG-046")
  N10 ×1  story_id is "STORY-{EpicID}-..."
  N12 ×1  created_at_version is "cleargate@{semver}"
  + the 2 permanent (N5, N6b)
```

**Ten false reds for a Developer who has done everything right.** The file honours no root
override — `grep -n "CLEARGATE_META_ROOT\|CLEARGATE_REPO_ROOT\|process.env"` returns **nothing**
— while **eight** other cli test files do honour `CLEARGATE_META_ROOT`
(`bucket-registry-parity.red`, `claude-md-block-leads-relocation.red`,
`close-sprint-assume-ack-guard`, `no-exec-mode-vocab`, `enforcement-doc-coherence`,
`ratchet-retired`, `pre-commit-downstream-safe`, `file-surface-gate-e2e`). This is the exact
idiom STORY-054-04 established (FLASHCARD 2026-08-27 `#test-harness #cross-repo`, R18) and this
file did not inherit it.

Both trees are byte-identical for these four paths **today** (`cmp` → IDENTICAL for
`.cleargate/templates/Bug.md`, `story.md`, `CLAUDE.md`, `cleargate-planning/CLAUDE.md`), so the
defect is invisible until the Developer's first template commit and then it is total.

Second-order consequence, and it binds the merge order: once the outer half **does** reach the
main checkout, `cleargate-cli` `main` is green only while the outer checkout sits on a branch
carrying the normalised templates. That is FLASHCARD 2026-08-27 `#test-harness #cross-repo`
(#48) verbatim — a cross-**branch** dependency, not merely cross-repo.

---

## §5 — Primary mutants

### M1 — the tenth-type mutant: **KILLED**

Mutant: validate the type argument by uppercasing it and testing membership of
`work-item-id.ts`'s 12-prefix `TYPE_PREFIXES` (i.e. "uppercase but do not reject"), with a
`${type}.md` fallback when `SCAFFOLD_REGISTRY` has no row — the exact shape the item's
blocker-class finding names.

```
M1: 40 pass / 5 fail
    FAIL: cleargate new platform rejects — the registry bridge (dispatch scenario 3)
    FAIL: cleargate new audit rejects   — the registry bridge (dispatch scenario 3)
    FAIL: cleargate new prop rejects    — the registry bridge (dispatch scenario 3)
    (+ the 2 permanent)
```

**Three kills.** Mechanism worth recording precisely, because it is not what it looks like: the
mutant *does* still exit non-zero (template `platform.md` absent → exit 2). What kills it is
`assert.match(joined, /unknown|unregistered|not a registered|unrecognized/)` — the baseline
discriminates **"rejected as an unregistered type"** from **"rejected because a file is
missing"**. That is the right distinction and it holds.

Caveat, measured: the fixture is `runNew({type: badType, slug: 'x'}, [])` — an **empty**
templates dir — so the literal "exit 0" the item predicts is unreachable in this fixture. The
outcome half of the assertion (`notEqual(code, 0)`) is trivially satisfied; only the message
half discriminates. The complementary registry direction **is** independently pinned: adding a
`platform` row to `SCAFFOLD_REGISTRY` trips N1's
`assert.ok(!hasOwnProperty(SCAFFOLD_REGISTRY, lower))`. Both doors are closed; only one of them
is closed by the assertion that names it.

### M2 — the case-insensitive-filesystem family: **ALL FIVE KILLED on macOS**

This is the one the dispatch flagged as most likely to survive. It does not. Five variants, all
run on APFS (case-insensitive, case-preserving):

| Variant | Mechanism | Result |
|---|---|---|
| **M2a** | `path.join(templatesDir, `${type}.md`)` + `existsSync` | **KILLED** — 4 extra fails |
| **M2b** | correct map + `existsSync` (correct on Linux) | **KILLED** — 1 extra fail |
| **M2c** | map miscased for `cr` (`'cr.md'`) + `existsSync` | **KILLED** — 1 extra fail |
| **M2d** | map miscased for `bug` (`'bug.md'`) + `existsSync` | **KILLED** — 1 extra fail |
| **M2e** | correct map + `readdirSync` with case-**insensitive** compare | **KILLED** — 1 extra fail |

```
M2a: 39 pass / 6 fail   FAIL: sprint smoke · CaseSens · sprint N3 · SPRINT pad
M2b: 42 pass / 3 fail   FAIL: a wrong-case template file (cr.md present, CR.md absent) is REJECTED
M2c: 42 pass / 3 fail   FAIL: (same)
M2d: 42 pass / 3 fail   FAIL: (same)
M2e: 42 pass / 3 fail   FAIL: (same)
```

**Why it dies — the mechanism, not the map.** The `CaseSens` fixture seeds only `cr.md` and
requires rejection. On APFS, `existsSync(path.join(dir,'CR.md'))` returns **true** against a
`cr.md` on disk, so any resolver that goes through the OS path layer (`existsSync`,
`readFileSync`-and-catch, or a case-folded `readdirSync` match) accepts it, scaffolds, exits 0,
and fails `assert.notEqual(code, 0)`. Only listing-membership survives. The single
`CaseSens` case therefore kills the whole **mechanism** class, for every type at once — not
just for `cr`.

**And the orthogonal half — a miscased map with a case-exact resolver — is killed by the
fixtures.** `makeTmpRepo` copies templates by their real names (`copyFileSync(src, join(dir,
'CR.md'))`), so the tmp listing is case-exact; a map row reading `'bug.md'` finds no member,
rejects, and fails N2's `bug` smoke. All eight template names are exercised (N2 smoke ×7, N3
×8, N8 ×6, N10 story), so no map row is unwitnessed.

**Both platforms are covered, by different assertions.** macOS: `CaseSens` kills the mechanism,
fixtures kill the map. Linux: `existsSync` is case-sensitive so `CaseSens` passes vacuously for
M2b/c/d, and the per-type smoke tests kill the miscased map instead. All four cells are closed.

**Resolution: M2 does NOT survive on macOS. No mandatory amendment is triggered by it.** One
*recommended* hardening remains (§6, A7): nothing asserts `SCAFFOLD_REGISTRY[t].template` by
value, so today's kill depends on APFS folding semantics and on the fixture-copy convention.
A pure-data assertion — the eight template names against a hard-coded expected map, plus
case-exact membership of `readdirSync(LIVE_TEMPLATES_DIR)` — is filesystem-independent and
costs one test. It is belt-and-braces, not the sole control, so it is recommended rather than
mandatory.

### M3 — the `proposal` hole: **ALL THREE KILLED**

```
M3a  no KNOWN_UNSCAFFOLDABLE branch (falls through to the generic unknown-type error)
     42 pass / 3 fail   FAIL: cleargate new proposal rejects with a NAMED error naming the missing template
M3b  proposal silently registered against CR.md, exits 0
     42 pass / 3 fail   FAIL: (same)
M3c  a second member quietly added to KNOWN_UNSCAFFOLDABLE ('initiative')
     38 pass / 7 fail   FAIL: KNOWN_UNSCAFFOLDABLE contains exactly {proposal}
                        FAIL: initiative smoke · initiative N3 · initiative N8 · initiative N12
```

The baseline pins a **defined behaviour**, not an improvisation: exit non-zero, error naming
both `proposal` **and** `template` (distinct from the `unknown type` message reserved for
platform/audit/prop), and zero files created. The size assertion closes the escape hatch, and
M3c shows it closes it four times over. This matches the F6 ruling and BUG-065 exactly.

### M4 — the null implementation: **no single-line null, but four whole surfaces are unguarded**

No cheap mutation of the reference implementation scores clean; the 43 passing assertions are
dense over allocation, rendering, id semantics and filesystem shape. But the "null" question
answers differently at the **surface** level, and the answer is measured by construction: my
reference implementation scores **43/45 having touched only two source files** —
`src/commands/new.ts` (created) and `src/lib/work-item-type.ts` (two exports appended) — plus
templates in **one** tree.

Confirmed by grep against the red file:

| Surface CR-108 requires | Occurrences in `new-command.node.test.ts` |
|---|---|
| `cli.ts` (top-level `new <type> <slug>` registration, F13) | **0** |
| `CHANGELOG` (F11, one bullet under `## Unreleased`) | **0** |
| `maxHotfixId` (the eviction check, ≤1 general allocator) | **0** |
| `SCAFFOLD_REGISTRY[...]` by value (the case-exact map) | **0** |
| `cleargate-planning/.cleargate/templates` (Cross-Cutting Rule 1) | **0** (the 2 hits are N13's `CLAUDE.md` path only) |

**A Developer can score 43/45 with `cleargate new` unreachable from the command line, with
`hotfixNewHandler` never reduced to a delegate, with two live allocators, with no CHANGELOG
entry, and with the canonical template mirror untouched.** Five of the ten QA kick-back
criteria in the M4 plan have no mechanical witness. These are QA-Verify obligations, not
baseline defects — but they must be carried into the Developer dispatch explicitly, because
the suite will say nothing.

One of them is cheaply closable and I recommend it (§6, A8): `TEMPLATE_FOR` in
`gate-section-index-pinning.node.test.ts:111-118` has **seven** rows and **no `sprint` row**,
so `Sprint Plan Template.md` — which CR-108 normalises — has **zero** two-tree parity coverage
anywhere in the repo. `sprint` has **0** `section(N)` criteria (measured across all gate blocks
in `readiness-gates.md`), so adding the row changes no index and no fixture; it is exactly the
STORY-054-01 precedent recorded in sprint-context ("add the `TEMPLATE_FOR` row even though it
ships no gate blocks").

---

## §6 — The rest of the battery, and the two survivors

### Killed (the plan's named implementation defects)

| Mutant | Change | Score | Killed by |
|---|---|---|---|
| M7 | `{ID}` → bare number (F3) | 36/9 | N8 ×6, N10 |
| M8 | `padStart(3,'0')` for every type (F4) | 41/4 | N9 SPRINT, N10 |
| M9 | story allocated by `max+1` over `numericStem` (F5) | 42/3 | N10 |
| M10 | strip `<instructions>` on render (OD-3 violation) | 36/9 | N2 smoke ×7 |
| M11 | scan `pending-sync/` only (BUG-045 regression, registry-wide) | 41/4 | N4 cr, N4 bug |
| M6 | hyphen filename separator for **all** types (F9) | 38/7 | N4 ×3, N9 ×2 |
| M12b | one `try/catch` round the whole loop, `archive` scanned **first** | 42/3 | N4 epic |
| G1 | drop `SPIKE` from `TYPE_PREFIXES` | 42/3 | N1 sanity witness |
| G2 | widen `HUMAN_FILL_WHITELIST` to 14 (tamper direction) | 42/3 | N3 size assertion |
| G3 | `hotfixNewHandler` starts stripping `<instructions>` | 42/3 | N7 |
| G4 | edit root `CLAUDE.md` inside the block, don't mirror | 41/4 | N13 ×2 |

### **SURVIVOR 1 — M6b: a hyphen separator for the four types nothing pins**

The M4 plan's **N11** ("Every scaffolded path matches `^<FULL-ID>_[A-Za-z0-9_]+\.md$`") **is not
in the QA-Red baseline.** QA-Red's own scenario table runs N1, N2, CaseSens, N3, N4, N5, N6,
N6b, N7, N8, N9, N10, N12, N13 — there is no N11 row. The M4 plan's kick-back criterion 1 lists
"N8, N9, N10 **or N11** absent" as a fail condition; N11 is absent.

Its content is *incidentally* covered for four types, by `assert.ok(files.some(f =>
f.startsWith('CR-108_')))` in N4 and `BUG-046_` / `SPRINT-40_` in N9. It is covered for **none**
of `spike`, `initiative`, `hotfix`, `story` — N2's smoke asserts only `files.length === 1`, N10
asserts `startsWith('STORY-054-08')` with no separator, and N5's `f.split('_')[0]` returns the
whole filename under a hyphen and still yields six distinct values.

Measured:

```
M6b — hyphen separator for spike, initiative, hotfix, story only
      43 pass / 2 fail          ← IDENTICAL to the correct implementation
```

Consequence if shipped, per F9 and FLASHCARD 2026-08-28 `#id-parsing #danger`:
`derive-bucket.ts:63-66` keys the wiki id on everything before the **first underscore**, so
`SPIKE-001-my-slug.md` is keyed on the whole stem — dead `[[SPIKE-001]]` wikilinks and an
ingest that exits 0 silently. It also lets `cleargate new hotfix` and `cleargate hotfix new`
disagree on the filename with nothing detecting it (N7 exercises `hotfixNewHandler` directly and
never runs `newHandler` for `hotfix` with a filename assertion).

**Amendment built and verified** — one `test` per member of `SCAFFOLDABLE_TYPES` asserting
`/^[A-Z]+(?:-\d+)+_[A-Za-z0-9_]+\.md$/` on the scaffolded basename:

```
correct implementation + N11 probe :  52 pass / 2 fail   (54 cases; the 2 are N5, N6b)
M6b                 + N11 probe :  48 pass / 6 fail   (4 kills: story, initiative, hotfix, spike)
```

### **SURVIVOR 2 — M12: one `try/catch` around the whole directory loop**

```
M12 — collectIds wraps the entire `for (const dir of dirs)` loop in ONE try/catch
      43 pass / 2 fail          ← IDENTICAL to the correct implementation
```

This is verbatim the defect BUG-045's own TPV closed one layer down, and its flashcard is
already in the file:

> 2026-08-29 · `#test-harness #fixtures #danger` · git tracks no empty directories, so
> "directory absent" is the COMMON case, not the edge case. Test the absence of EACH scanned
> directory independently — one try/catch around the whole loop passes a single-absence fixture
> and silently discards the other directory's accumulated max. [SPRINT-39 BUG-045 TPV]

BUG-045 shipped R9/R10 to close it for `hotfix`. CR-108 lifts the allocator registry-wide and
the baseline carries **no** equivalent. N4's epic case (`archive/` absent, max in `pending/`)
cannot reach it under the natural `[pendingDir, archiveDir]` scan order: `pending` is read
first and succeeds, so the accumulator already holds the max when `archive` throws. Reverse the
scan order and the same mutant dies (**M12b**, 42/3) — **so survival is a coin flip on an
arbitrary implementation choice the item does not specify.**

**Amendment built and verified** — the mirror of N4-epic: `pending-sync/` **absent from disk**,
max in `archive/`. This also requires the handler to create `pending-sync/` **after** the scan
rather than before, which is itself correct (a fresh clone has no `pending-sync/` — git tracks
no empty directories, the flashcard's own point):

```
correct implementation (lazy mkdir) + N4d probe :  44 pass / 2 fail   (46 cases)
M12 (single catch)                  + N4d probe :  43 pass / 3 fail
    FAIL: bug: pending-sync/ absent from disk, archive holds BUG-050 -> next is BUG-051
```

---

## §7 — RULING 1 · `stampFrontmatter` is not `<instructions>`-aware

**RULING: fixing `stamp-frontmatter.ts:54` is OUT of CR-108's scope. It is a separate, already-
shipped defect and must be filed as its own Bug. `N6b` stays in the file, red-and-expected,
carrying a link to that Bug — it is not a CR-108 acceptance criterion and must not gate the
Developer.** The justification is measured, not deferential, and it is below.

### The defect, reproduced against the unmodified module

Input (the shape every CR-108 scaffold will have, per the §4 AMENDMENT's no-stripping ruling):

```
<instructions>\nDo the thing.\n</instructions>\n\n---\nbug_id: "BUG-999"\nstatus: "Draft"\nseverity: "P1-High"\n---\n\n# Body\n
```

Output after one `stampFrontmatter` call (`reason: 'created'`, `changed: true`, exit clean, no warning):

```
---
created_at: 2026-08-29T10:00:00Z
updated_at: 2026-08-29T10:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
---

<instructions>
Do the thing.
</instructions>

---
bug_id: "BUG-999"
status: "Draft"
severity: "P1-High"
---

# Body
```

`frontmatterAfter` keys: `created_at, updated_at, created_at_version, updated_at_version`.
`bug_id`, `status` and `severity` are gone from the machine-readable block and are now inert
body text below a phantom second `---` fence. QA-Red's diagnosis of the root cause
(`stamp-frontmatter.ts:54`, `hasFrontmatter = raw.trimStart().startsWith('---')`) is exact.

### Blast radius, measured

`command grep -rn "stampFrontmatter" cleargate-cli/src cleargate-cli/test .cleargate/scripts`:

- **Production callers: exactly one file** — `src/commands/stamp.ts`, two call sites (the
  `--dry-run` tmpdir copy and the real file). No other `src/` module imports it.
- Everything else is `stamp-frontmatter.node.test.ts` and CR-108's own red file.
- The PostToolUse hook `stamp-and-gate.sh:30` runs **`stamp-tokens`**, not `stamp`. There is no
  automatic trigger.

### The blast radius is worse than the item states, and it is pre-existing

`prep_doc_refresh.mjs:160` — the Gate-4 doc-refresh checklist generator — emits:

> `surface: 'Modified \`.cleargate/templates/*.md\` (run \`cleargate stamp <path>\`)'`

and the same at `:165/:170/:175` for `.cleargate/knowledge/*.md`. Measured, against real copies
of the shipped templates:

```
Bug.md                     reason=created  phantom-block-prepended=true
CR.md                      reason=created  phantom-block-prepended=true
story.md                   reason=created  phantom-block-prepended=true
epic.md                    reason=created  phantom-block-prepended=true
initiative.md              reason=created  phantom-block-prepended=true
hotfix.md                  reason=created  phantom-block-prepended=true
spike.md                   reason=created  phantom-block-prepended=true
Sprint Plan Template.md    reason=created  phantom-block-prepended=true
```

**All eight authoring templates are corrupted by `cleargate stamp` today, on `main`, with no
CR-108 involvement — and the sprint-close doc-refresh checklist is the documented instruction
to run exactly that command on exactly those files.** CR-108 modifies eight templates × two
trees, so the SPRINT-39 checklist will list them.

### Corpus census

523 files scanned across `pending-sync/`, `archive/` and both template trees:

- files already carrying the corruption signature: **0**
- files whose first content is `<instructions>`: **16 — all of them templates** (8 × 2 trees).
  **No work item in the corpus carries an `<instructions>` block.**

That census is the load-bearing fact for this ruling, in both directions.

### Why it is out of scope — three measured reasons

1. **CR-108 does not create the defect and does not touch the defective line.** It is reachable
   today, via `cleargate stamp` on any template, and the reachable population (16 files) is
   exactly the same before and after CR-108's cli half.
2. **`stamp-frontmatter.ts` internals are in the item's own Do-NOT-modify list** *and* in the M4
   plan's, on the stated ground that they are reused as-is. Reversing that mid-wave changes a
   shipped function with a single production caller that CR-108 has no test coverage over —
   `stamp-frontmatter.node.test.ts` is untouched by this dispatch and QA-Red authored no case
   for the fixed behaviour, only for the broken one.
3. **The `<instructions>` hand-clean workflow is a legitimate contract, not a workaround.** The
   census proves it: zero of 231 story items and zero of 523 corpus files carry the block, while
   all 16 templates do. OD-3 ruled no-stripping on that same evidence and on §4 case 7's
   byte-identical requirement. N6 already encodes the workflow and passes (43/45 includes it).

### But the scope is about to widen, and that must be recorded

After CR-108 ships, **every scaffolded item carries `<instructions>`** — the exposed population
goes from 16 template files to 16 + every work item authored from that day. The first agent that
runs `cleargate stamp` on a freshly scaffolded item before hand-cleaning it loses `bug_id`,
`status` and `severity` silently, at exit 0. That is a real, near-term regression in blast
radius that CR-108 causes without causing the defect.

**Therefore, three obligations attach to this ruling:**

- **O1.** File the Bug now, before CR-108 merges, citing `stamp-frontmatter.ts:54`, the two
  `stamp.ts` call sites, `prep_doc_refresh.mjs:160`, and the eight-template reproduction above.
  It is a `stamp` defect with a documented Gate-4 trigger, independent of this CR.
- **O2.** `N6b` **stays in the file and stays red**, retitled to name the Bug id and marked
  expected-red in the same idiom Cross-Cutting Rule 2 uses for the payload test. It must be
  excluded from CR-108's acceptance line, and the Developer must be told so explicitly — a red
  assertion with no ruling attached is exactly what a Developer "fixes" by editing
  `stamp-frontmatter.ts`, which is the kick-back.
- **O3.** CR-108's `newHandler` **must not call `stampFrontmatter`** — QA-Red's option (b),
  which is also what `hotfix.ts` does today and what §4 case 7's byte-identical requirement
  forces. My reference implementation does exactly this and scores 43/45. Option (a) (strip,
  stamp, re-attach) is a kick-back: it reintroduces stripping logic that OD-3 placed out of
  scope, and it cannot satisfy case 7.

---

## §8 — RULING 2 · `story.md`'s `story_id` token

**RULING: the `story.md` edit IS inside CR-108's declared surface, and it is required. Drop
`-{StoryName}`. Cross-Cutting Rule 4 is NOT engaged.**

### The corpus claim, verified in both directions

`story_id:` across `pending-sync/` ∪ `archive/`, 231 `STORY-*.md` files:

| Form | Count |
|---|---|
| bare `STORY-NNN-NN` | **218** |
| hyphen-suffixed `STORY-NNN-NN-<Name>` (the template's form) | **4** |
| underscore-suffixed `STORY-NNN-NN_<Name>` (a third form) | **9** |

The 4 that match the template are all EPIC-024, all from the same era:

```
story_id: STORY-024-01-Architect_Plan_Slim
story_id: STORY-024-02-Protocol_Split_And_Citation_Rewrite
story_id: STORY-024-03-CLAUDE_md_Gap_Fill
story_id: STORY-024-04-Sprint_Closeout_Doc_And_Metadata_Refresh
```

The 9 underscore-suffixed are all EPIC-013 archive items. **94% bare; every recent item bare;
the template's own form is a 13-item legacy tail split across two mutually inconsistent
conventions.** QA-Red's claim is upheld, and the census is stronger than QA-Red stated because
it identifies a third form the template does not describe either.

### Is it in scope?

Yes, on two independent grounds:

1. The item's own task row reads *"Normalize placeholders in EIGHT templates x 2 trees"* and
   `story.md` is one of the eight. `{EpicID}`, `{StoryID}` and `{StoryName}` are three of the 22
   measured token forms and three of N3's nine FORBIDDEN entries.
2. It is not optional. Measured: with the shipped `story.md`, a correct implementation fails
   N10 and story's N3 case (§4's V0 run). Under the full-id semantic there is **no** rendering
   of `story_id: "STORY-{EpicID}-{StoryID}-{StoryName}"` that yields `STORY-054-08`. The line
   must change for the CR to be implementable at all.

### Cross-Cutting Rule 3 / 4 — verified, not assumed

- **Rule 3** (`evalSection` frozen): not engaged. No `src/` file is touched by the template edit.
- **Rule 4** (`## ` heading insertion renumbers `section(N)`): **not engaged.** `story_id` is at
  `story.md:66`, inside the frontmatter block; `story.md`'s first `## ` heading is at `:111`.
  A line edit inside frontmatter inserts and deletes no `## ` heading, and `section(N)` is an
  **ordinal position among `## ` headings**, not a line number — so even a length change is
  irrelevant. `story.md`'s nine headings and their order are unchanged:
  `1 ## 1. The Spec · 2 ## 2. The Truth · 3 ## 3. The Implementation Guide · 4 ## Task Breakdown ·
  5 ## 4. Quality Gates · 6 ## Existing Surfaces · 7 ## Prior work · 8 ## Why not simpler? ·
  9 ## ClearGate Ambiguity Gate`.
- **Verified by execution, not by reasoning** — `gate-section-index-pinning.node.test.ts` on the
  current tree: `ℹ tests 14 · pass 14 · fail 0 · skipped 0`.

### Correction the Developer needs: the M4 plan's expected number is a homonym error

The plan instructs *"Assert `gate-section-index-pinning` at `18 / 18 / 0 / 0`"*. Measured, the
runner reports **`14 / 14 / 0 / 0`**. `18` is the **criteria** count, asserted inside the file at
`:433` (`criteria.length === 18`) and `:435` (`pinnable.length === 16`); `14` is the **test-case**
count (`:7`). This is precisely FLASHCARD 2026-08-27 `#test-harness #danger`
("check for HOMONYMS in the same file… `:7`'s `14` is the test-CASE count and `:22`/`:41`'s is the
criteria count"). **The acceptance line is `tests 14 · pass 14 · fail 0 · skipped 0`, and
`expected-headings.ts` is not opened.**

---

## §9 — Vacuity audit of the five green assertions

Every one was given a plausible mutant and made to flip. **None is vacuous.** Three were
described as "independent of `new.ts`"; that is true and is not the same as vacuous — two of
them are the sharpest assertions in the file.

| # | Green assertion | Mutant constructed | Flipped? |
|---|---|---|---|
| 1 | N1 — every scaffoldable type classifies via `classifyType`/`TYPE_PREFIXES` | remove `'SPIKE'` from `work-item-id.ts` `TYPE_PREFIXES` | **YES** — `42/3` |
| 2 | N3 — `FORBIDDEN`=9, `WHITELIST`=13, no overlap, 22 total | add `{PARENT_EPIC_ID}` to `HUMAN_FILL_WHITELIST` (the **tamper** direction it exists to catch) | **YES** — `42/3` |
| 3 | N7 — `hotfix new` byte-identical | `hotfixNewHandler` starts stripping `<instructions>` | **YES** — `42/3` |
| 4 | N13a — anchored block-equal | edit root `CLAUDE.md` inside the block without mirroring | **YES** — `41/4` |
| 5 | N13b — unanchored form returns the wrong length | (see below) | **YES, but see below** |

Notes that matter:

- **#2 is not testable by any production mutation** — no change to `new.ts` or
  `work-item-type.ts` can flip it. Its role is the `KNOWN_UNPINNABLE` / `KNOWN_BUCKET_GAPS`
  idiom: a tamper tripwire that makes "widen the whitelist to go green" a visible edit. It works;
  I flipped it exactly as a Developer would trip it. Keep it verbatim.
- **#3's kill is narrower than its title.** N7 reconstructs `expected` from the **same live
  template** it just rendered, so it is invariant under any `hotfix.md` content change. It pins
  *"the renderer performs exactly the three `{ID}`/`{SLUG}`/`{ISO}` substitutions and nothing
  else"* — not "byte-identical to pre-CR output" as §4 case 7 words it. That is the right
  property for a CR that normalises `hotfix.md:11` and `:39`, and it does kill the OD-3
  violation (G3, M10). The title should be corrected; the assertion should not.
- **#5 (N13b) flips only on an edit to `CLAUDE.md:50`'s inline marker mention**, which is
  unrelated prose that CR-108 does not touch, and it also flips on CR-108's own required block
  edit (§3, `10606 → 10662`). It is a documentation pin with a stale constant and no protective
  value in its current form. §6's amendment A3 converts it into the relational assertion, which
  is the property it was actually reaching for.

For contrast with the BUG-066 shape the dispatch names: **all 45 leaf cases execute** — the
per-test dynamic-import seam (`before()` + `getNewHandler()`'s `assert.ok`) does what QA-Red
claims, and the runner reports 45 individual leaves, not one collapsed file failure. Zero
non-executing scenarios. Zero `skipped`. The vacuity risk in this file is not phantom execution;
it is the two coverage holes in §6 and the three false reds in §2–§4.

---

## §10 — The sprint-context baseline table

**Verified independently; the correction QA-Red asks for is not the right one.**

Targeted runs against the current tree:

```
test/scaffold/skill-md-conditional-architect.red.node.test.ts : tests 18 · pass 18 · fail 0 · skipped 0
test/commands/sync.node.test.ts                               : tests 13 · pass 12 · fail 1 · skipped 0
                                                                (✖ exits 2 when no MCP URL or token is configured)
```

The `skill-md-conditional-architect` test is **green now**. Cause, measured: the npm payload was
regenerated after QA-Red's run — `cleargate-cli/templates/cleargate-planning/.claude/skills/sprint-execution/SKILL.md`
has mtime `Aug 29 23:31`, canonical has `Aug 29 17:27`, `cmp` reports **IDENTICAL**, both 797
lines / 58853 bytes; 76 payload files carry post-20:00 mtimes. Nothing in this dispatch ran
`prebuild` (it is reachable only via `npm run build` / `prepublishOnly`); the payload is
gitignored, so `git -C cleargate-cli status --porcelain` is empty and no tracked file moved.

Deriving the pre-CR-108 baseline from QA-Red's full-suite figure (`2635 / 924 / 2592 / 42 / 1`)
minus this file's contribution (45 tests / 14 suites / 40 fail / 5 pass):
`tests 2590 · suites 910 · pass 2587 · fail 2 · skipped 1` **at QA-Red's instant**, and
`tests 2590 · suites 910 · pass 2588 · fail 1 · skipped 1` **now**.

**So the table's numbers are correct as written. What is missing is not a number but a
conditional.** Recommended orchestrator edit to sprint-context.md §Test Stack — do not add a
second standing exception:

> `test/scaffold/skill-md-conditional-architect.red.node.test.ts` is **payload-state-dependent**.
> It compares canonical `SKILL.md` to the gitignored npm payload and goes red whenever canonical
> `.claude/skills/sprint-execution/SKILL.md` has been edited since the last
> `npm --prefix cleargate-cli run prebuild` (Cross-Cutting Rule 2 defers prebuild to Gate 4). It
> was red on 2026-08-29 after CR-107's `SKILL.md` edit and is green again after a payload
> regeneration. Expect `fail 1` when the payload is in sync and `fail 2` when it is not; neither
> is a regression. **CR-108 does not touch `SKILL.md`, so its expected count is `fail 1`.**

Scoped precisely: it is the **only** canonical→payload byte comparison in the suite
(`grep -rln "templates/cleargate-planning" test/` returns 11 files; the other ten check
tracked-ness, path resolution or package trim, not content parity), and it compares `SKILL.md`
alone. CR-108's eight-template and two-`CLAUDE.md` edits red **no** payload-parity test.

I did not run the 9.6-minute full suite: the two targeted runs above plus the arithmetic above
answer the question exactly, and the targeted control already reproduced QA-Red's 45/5/40 split
byte-for-byte. I did not edit `sprint-context.md`.

---

## §11 — Required amendments

Applied by **QA-Red** on `story/CR-108`, test file only. A Developer amending its own acceptance
test is the tampering shape.

### Mandatory — each one bounces a correct implementation or lets a real defect ship

**A1 — N5 spawn resolution root.** `spawnNewCommand` (`:225`): `cwd: args.cwd` → `cwd: CLI_ROOT`.
The repo root already reaches the handler through the `-e` script's `{ cwd }` argument.
*Motivated by:* the correct reference implementation failing N5 with `ERR_MODULE_NOT_FOUND` (§2.1).
*Verified:* correct implementation → `pass 1 · fail 0`.

**A2 — N5 needs a deterministic lock witness; the concurrency assertion is not one.**
*Motivated by:* the lock-free mutant passing the correctly-wired N5 **8/8** (§2.2).
Add **N5b**, mechanism-pinned and timing-free: export the lock basename from `new.ts` (a wiring-
contract addition), pre-create the lockfile, assert `newHandler` creates no item file and exits
non-zero within its bounded retry budget; then assert the lockfile is **absent** after a normal
successful run (no orphan). Keep the 6-subprocess case as a liveness smoke, not as the lock
guard. Do **not** attempt a barrier: FLASHCARD 2026-08-29 `#test-harness #tpv #danger` records
what a barrier arming inside the critical section cost BUG-044. Do **not** tune a delay or seed
a large corpus — measured at 1 pass / 2 fail over 3 runs, i.e. flaky (§2.2).

**A3 — N13's two frozen lengths.** Replace `assert.equal(a.length, 11762)` (`:679`) and
`assert.equal(m[1].length, 10606)` (`:692`) with `assert.ok(anchoredLen > unanchoredLen)`.
Keep `assert.equal(a, b)` verbatim — it is the Cross-Cutting-Rule-1 witness and G4 proves it fires.
*Motivated by:* G4b — CR-108's own mandated `CLAUDE.md` edit, correctly mirrored to both trees,
reds both cases (`11818 !== 11762`). *Verified:* the relation holds at 11762>10606 pre-edit and
11818>10662 post-edit, in both trees (§3).

**A4 — N11, the missing scenario.** One case per member of `SCAFFOLDABLE_TYPES`:
`assert.match(basename, /^[A-Z]+(?:-\d+)+_[A-Za-z0-9_]+\.md$/)`.
*Motivated by:* **M6b**, a hyphen separator for `spike`/`initiative`/`hotfix`/`story` scoring
`43/45` — identical to a correct implementation (§6). *Verified:* correct implementation
`52/2` over 54 cases; M6b `48/6`, four kills, one per untested type.

**A5 — N4d, the mirror of N4-epic.** `pending-sync/` **absent from disk**, `archive/BUG-050`
present → next is `BUG-051`, exit 0. Requires the handler to create `pending-sync/` after the
scan, which is independently correct (git tracks no empty directories).
*Motivated by:* **M12**, one `try/catch` around the whole directory loop scoring `43/45` — the
defect BUG-045's TPV already closed one layer down and flashcarded (§6). *Verified:* correct
implementation (lazy mkdir) `44/2` over 46 cases; M12 `43/3`.

**A6 — the cross-repo template root.** Honour `CLEARGATE_META_ROOT` when resolving `REPO_ROOT`
(`:79`), the idiom eight other cli test files already use
(`bucket-registry-parity.red.node.test.ts:105-125` is the reference). Scope it to **targeted**
runs only — FLASHCARD 2026-08-27 `#test-harness #cross-repo` (#49) records what setting it for a
full-suite run costs. *Motivated by:* a fully correct implementation scoring **33/45** against
the un-normalised main-checkout templates — ten false reds (§4).
*Alternative, if the override is refused:* the outer half must be merged to `sprint/S-39`
**before** the cli half is measured, and the Developer dispatch must say so. Do not leave this
to discovery.

### Recommended — belt-and-braces, each closes a coverage hole the battery exposed

**A7 — assert `SCAFFOLD_REGISTRY` by value.** Eight rows against a hard-coded expected map, plus
case-exact membership of `readdirSync(LIVE_TEMPLATES_DIR)`. All five M2 variants die today
(§5/M2), but the kill rests on APFS folding semantics and on `makeTmpRepo` copying by real name;
a data assertion is filesystem-independent and states the contract directly.

**A8 — add `sprint: 'Sprint Plan Template.md'` to `TEMPLATE_FOR`**
(`gate-section-index-pinning.node.test.ts:111-118`). It has seven rows and no `sprint` row, so
`Sprint Plan Template.md` — one of CR-108's eight — has **zero** two-tree parity coverage
anywhere in the repo. `sprint` carries **0** `section(N)` criteria, so no index and no fixture
moves; `18 = 16 + 2` and the `14/14` case count both hold. Exactly the STORY-054-01 precedent.

**A9 — retitle N7** from "byte-identical to pre-CR output" to what it measures: *"the renderer
performs exactly the three `{ID}`/`{SLUG}`/`{ISO}` substitutions and nothing else"* (§9 note).

### Not amendments — QA-Verify obligations, because the suite says nothing

Five of the M4 plan's ten kick-back criteria have **no** mechanical witness, proven by a correct
implementation scoring 43/45 while touching none of them (§5/M4):
`cli.ts` registration (**0** references) · `hotfixNewHandler` reduced to a delegate ·
the `maxHotfixId` eviction check (**0** references) · `CHANGELOG.md` (**0** references) ·
`cleargate-planning/.cleargate/templates/*` byte-parity. Carry all five into the Developer
dispatch as explicit prohibitions and into QA-Verify as manual checks.

---

## §12 — Numbers for the Developer dispatch

| Measurement | Value |
|---|---|
| Baseline as shipped (`637e606`, targeted) | `tests 45 · suites 14 · pass 5 · fail 40` |
| Green by design | N1 classify-witness · N3 constant self-check · N7 · N13 ×2 — **all five flip under a plausible mutant (§9)** |
| Correct implementation, file as shipped | **`pass 43 · fail 2`** — N5 (harness, A1/A2) and N6b (RULING 1, expected-red) |
| Correct implementation, after A1–A5 | 54+ cases; **N6b is the only expected red** once A1/A2 land |
| Expected cli full suite after the fix | `fail 1` — the `sync.node.test.ts` network case only (§10) |
| `gate-section-index-pinning` acceptance | **`tests 14 · pass 14 · fail 0 · skipped 0`** — *not* `18/18`; `18` is the criteria count (§8) |
| Typecheck | `npm --prefix cleargate-cli run typecheck` → clean (test files are outside `tsc`'s include surface) |

**Red → green (must flip):** the 40 currently-red cases minus N5 and N6b, i.e. **38**, plus the
new A4/A5 cases.
**Must stay green:** N1 classify-witness, N3 constant self-check, N7, N13 ×2 (with A3's
relational form).
**Must stay RED:** **N6b** — RULING 1, obligation O2. Do not fix `stamp-frontmatter.ts`.

Seven implementation constraints, each pinned by a killed mutant:
full-id `{ID}` semantic (M7) · per-type `padWidth` (M8) · story allocation takes `--epic` (M9) ·
no `<instructions>` stripping (M10) · union scan over both directories (M11) · **per-directory**
ENOENT tolerance, never one catch round the loop (M12, needs A5) · **underscore** filename
separator for every type (M6b, needs A4). Plus: case-exact template resolution by listing
membership, never `existsSync` (M2 family) — and `newHandler` must **not** call
`stampFrontmatter` (RULING 1, O3).

---

## §13 — Tree cleanliness

```
$ git -C .worktrees/CR-108 status --porcelain     # (no output)
$ git -C cleargate-cli status --porcelain         # (no output)
$ git -C cleargate-cli rev-parse --abbrev-ref HEAD ; git -C cleargate-cli rev-parse --short HEAD
story/CR-108
637e606
$ git -C .worktrees/CR-108 rev-parse --abbrev-ref HEAD ; git -C .worktrees/CR-108 rev-parse --short HEAD
story/CR-108
1af90d6b
```

**Both trees clean.** No commit, no test-file edit, no implementation written in either tree.
All mutants, the reference implementation, the two probe test files and the normalised templates
live under `<scratchpad>/meta/` and `<scratchpad>/logs/` only. `npm run prebuild` was not run by
this dispatch; `close_sprint.mjs` was not run.

---

## §14 — Script Incidents

None. No `run_script.sh`-wrapped script was invoked; all measurement was direct `npx tsx --test`,
`node -e`, `git`, `cmp` and `python3` against read-only or scratch paths.

---

## §15 — Flashcards, PROPOSED (deliberately not written)

```yaml
flashcards_flagged:
  - "2026-08-29 · #test-harness #tpv #danger · A subprocess spawned with cwd=<tmp fixture> cannot resolve `--import tsx/esm` — no node_modules above /var/folders, and node's ESM resolver ignores the global root. CR-108's N5 failed 100% for every implementation including a correct one. Spawn with cwd=CLI_ROOT and pass the fixture root as an argument. [SPRINT-39 CR-108 TPV]"
  - "2026-08-29 · #test-harness #tpv #danger · A concurrency assertion whose critical section is sub-ms and whose processes each pay ~300ms of loader startup certifies a LOCK-FREE implementation green 8/8. Only a 150ms artificial window reds it. Pin the lock MECHANISM (pre-create it, assert refusal, assert no orphan), never wall-clock overlap. [SPRINT-39 CR-108 TPV]"
  - "2026-08-29 · #test-harness #danger · A regression pin that hard-codes a byte LENGTH of a file the same CR is required to edit reds on the correct fix: CR-108's own CLAUDE.md task row moves the anchored block 11762 -> 11818. Assert the RELATION (anchored > unanchored), which is the property, not the snapshot. [SPRINT-39 CR-108 TPV]"
  - "2026-08-29 · #scaffold #cross-repo #danger · A cleargate-cli test resolving REPO_ROOT as <cli>/.. always reads the MAIN checkout — cleargate-cli has 0 tracked files in the outer repo and never materialises in a worktree. A correct implementation scored 33/45 because its own template edits, committed in .worktrees/, were invisible. Honour CLEARGATE_META_ROOT on targeted runs. [SPRINT-39 CR-108 TPV]"
  - "2026-08-29 · #scaffold #frontmatter #danger · `cleargate stamp` corrupts ALL EIGHT authoring templates today — hasFrontmatter (stamp-frontmatter.ts:54) is false when <instructions> leads, so real fields become body text under a phantom block, exit 0. prep_doc_refresh.mjs:160 INSTRUCTS running it on modified templates at Gate 4. 0 of 523 corpus files are affected only because no work item carries <instructions> — which CR-108 changes. [SPRINT-39 CR-108 TPV]"
  - "2026-08-29 · #test-harness #fixtures #danger · A hyphen-vs-underscore filename separator survives if only SOME types are pinned: N4/N9 pin cr/bug/sprint via startsWith('CR-108_'), so a hyphen for spike/initiative/hotfix/story scores identically to a correct fix. Parameterise shape assertions over the WHOLE registry, never over the types a fixture happened to need. [SPRINT-39 CR-108 TPV]"
  - "2026-08-29 · #test-harness #fixtures #danger · The single-try/catch allocator defect BUG-045 closed reappears in the generalised allocator and survives: N4's 'archive absent' fixture cannot reach it under the natural [pending, archive] order because pending is read FIRST and the max is already accumulated. Survival is a coin flip on scan order — assert the absence of EACH directory with the max in the OTHER one. [SPRINT-39 CR-108 TPV]"
  - "2026-08-29 · #scaffold #test-harness · On APFS a single wrong-case fixture kills the whole resolution MECHANISM class at once: existsSync/readFileSync/case-folded-readdir all accept cr.md for CR.md, scaffold, and exit 0. The map's own case-exactness is killed separately by fixtures that copy templates by real name. Both platforms are covered, by different assertions — say which, or the coverage reads as luck. [SPRINT-39 CR-108 TPV]"
```

---

# VERDICT

`TPV: PASS WITH AMENDMENTS`

1. **A1 — N5's spawn cwd.** Motivated by the correct reference implementation failing N5 with
   `ERR_MODULE_NOT_FOUND` ×6; unsatisfiable for every implementation as shipped.
2. **A2 — a deterministic lock witness (N5b).** Motivated by the lock-free mutant passing the
   correctly-wired N5 eight times out of eight.
3. **A3 — N13's two frozen byte lengths → the relational assertion.** Motivated by G4b:
   CR-108's own mandated `CLAUDE.md` edit, correctly mirrored, reds both cases.
4. **A4 — N11, the missing per-type separator scenario.** Motivated by **M6b** (hyphen for
   `spike`/`initiative`/`hotfix`/`story`), which scores `43/45` — identical to a correct
   implementation.
5. **A5 — N4d, the mirror of N4-epic.** Motivated by **M12** (one `try/catch` around the whole
   directory loop), which scores `43/45` — the defect BUG-045 already closed one layer down.
6. **A6 — the cross-repo template root (`CLEARGATE_META_ROOT`), or an enforced merge order.**
   Motivated by a fully correct implementation scoring `33/45` against the main checkout's
   un-normalised templates: ten false reds.

Recommended, not blocking: **A7** (`SCAFFOLD_REGISTRY` asserted by value), **A8**
(`sprint` row in `TEMPLATE_FOR` for two-tree parity of `Sprint Plan Template.md`), **A9**
(retitle N7 to what it measures).

**M2 — the case-insensitive-filesystem mutant — does NOT survive on macOS.** All five variants
were built and killed; the `CaseSens` case kills the entire OS-path-layer resolution mechanism
for every type at once, and the fixtures kill a miscased map independently, on both platforms.
No amendment is mandated by M2. A7 is offered as hardening because today's kill depends on APFS
semantics rather than on a stated contract.

**Rulings.** RULING 1: `stamp-frontmatter.ts:54` is **out of CR-108's scope** — file it as its
own Bug (O1), keep **N6b red and excluded from the acceptance line** (O2), and require that
`newHandler` never calls `stampFrontmatter` (O3). RULING 2: the `story.md` `story_id` edit **is
in scope and is required** — 218 bare against 4 matching the template; Cross-Cutting Rule 4 is
not engaged (verified: `gate-section-index-pinning` `14/14`, and the plan's `18/18` is a
criteria-vs-case-count homonym).

`arch_bounces` **must not increment.** This is a coverage-and-wiring ruling, not a QA-Red
bounce: the file executes all 45 leaves individually, the import seam works as claimed, 38 of
the 40 reds are red because the feature is absent, and a correct implementation reaches 43/45
on the first attempt.
