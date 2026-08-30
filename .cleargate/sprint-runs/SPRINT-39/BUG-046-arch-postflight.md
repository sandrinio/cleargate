---
role: architect
mode: post-flight
sprint: SPRINT-39
wave: 10
milestone: M4
item: BUG-046
commit: f5a1c7784da26fe399b10fa0538e53f86c1ef144
branch: story/BUG-046
worktree: .worktrees/BUG-046
verdict: PASS
generated_at: 2026-08-29
---

# BUG-046 — Architect Post-Flight

## Verdict: **PASS**

The commit implements the M4 blueprint, the ORCHESTRATOR RULING (R1–R8) and the TPV RULING
(T1–T10) faithfully. All eight declared files are correct, all mirrors are byte-identical, zero
live `.claude/**` paths were written, zero `## ` headings moved, zero BUG-062 scope leaked in.
I independently reproduced every acceptance number.

Independently re-measured (this dispatch, not inherited from QA):

| Check | Result |
|---|---|
| `bash .cleargate/scripts/test/test_file_surface.sh` (in worktree) | `Results: 16/16 passed, 0 failed`, exit 0 |
| `bash .cleargate/scripts/test/test_collision_surface.sh` (BUG-062's, untouched) | `7 passed, 0 failed`, exit 0 |
| `tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` | `tests 14 · pass 14 · fail 0 · skipped 0` |
| `gate check` on the committed item file (N9-sanctioned `dist/cli.js gate check`) | `bug.ready-for-fix passed (7 criteria)` |
| `git diff --name-only \| grep -c '^\.claude/'` | **0** |
| `git ls-files .claude/` | **0** (N1 holds; `.claude/` does not exist in the worktree at all) |

Five defects are recorded below. **None is a Developer defect** — three are plan/scope gaps that
post-flight is the right place to surface, one is a latent edge in the new code that no acceptance
case reaches, and one is a doctrinal site outside the story's chartered three. They route to the
orchestrator, to CR-107 (w11), and to BUG-062 / EPIC-057 — not back to the Developer.

---

## §1 — N7: citation decay. `collision_surface.sh` 146 → **267** lines.

**QA's measurement is the correct one.** The Developer's report said 193; the file is 267 in both
trees. The 193 figure is a reporting inaccuracy only — it appears in no shipped artefact and no
downstream consumer reads it. QA already flagged it non-blocking and I concur.

**Measured old→new mapping** (pre-commit `aad62c29` at 146 lines → `f5a1c778` at 267), every row
verified by fixed-string grep against the new file:

| Cited construct | old | **new** |
|---|---|---|
| STDOUT surface contract | `:8-10` | **`:9-11`** |
| `FAIL-SAFE CONTRACT (BUG-033)` block | `:12-18` | **`:18-24`** |
| `set -euo pipefail` | `:23` | **`:43`** |
| `# ---- Parse §3.1 file surface table` | `:38` | **`:62`** |
| "Over-serialization is the safe failure direction" | `:54-55` | **`:78-79`** |
| `function looks_like_path` | `:61-64` | **`:90-93`** |
| `/^### 3\.1/` section locator | `:65` (BUG-049-era) | **`:128`** |
| `function emit_backticked` | `:68-81` | **`:99-112`** |
| `## N. Execution Sandbox` locator | `:87` | **`:118`** |
| `**`-label block (Sandbox parser) | `:89-94` | **`:120-125`** |
| the `do not` label check | `:91` | **`:122`** |
| `for (c=1; c<=n; c++)` (column-1 scan) | `:104` | **`:138`** |
| `gsub(/\`/, "", val)` (whole-cell backtick strip) | `:109` | **`:143`** |

The full `STALE_CITATIONS:` list — live surfaces first, dated records second — is at the end of
this report. **`FLASHCARD.md` is NOT rewritten**; its staleness is reported in §6.

**Highest-priority correction:** `sprint-context.md:294` (read by every agent, every dispatch) and
the three `BUG-062` item-file citations (BUG-062 is the very next item to open this file).

---

## §2 — Mirror parity and the dogfood split

**Parity: clean.** All four mirrored pairs `diff` byte-identical inside the worktree:
`collision_surface.sh`, `test/test_file_surface.sh`, `test/test_collision_surface.sh`,
`knowledge/cleargate-enforcement.md`. Cross-Cutting Rule 1 satisfied in the same commit.

**N1: satisfied absolutely.** Zero live `.claude/**` paths in the diff, and `.claude/` does not
exist inside the worktree — the story could not have written one without `git add -f` from the
main checkout. `git ls-files .claude/` is still 0.

**New canonical-ahead drift created by this commit — three files, all previously byte-identical.**
I verified each live copy against the *pre-commit* canonical: all three were identical before
`f5a1c778`, so this commit is the sole author of the drift.

| File | live | canonical | delta | shape |
|---|---|---|---|---|
| `skills/sprint-execution/SKILL.md` | 787 | 787 | **0 lines** — 1 line differs in place (`:286`) | 1-for-1 replacement |
| `agents/architect-reader.md` | 61 | 63 | **+2** | 3 additions, 3 in-place replacements |
| `agents/architect-synth.md` | 126 | 154 | **+28** | 2 additions (1 line + a 25-line section), 1 in-place replacement |

**Answer to the SKILL.md question: yes, this commit created a new drift, and no, it does not make
the Gate-4 re-sync a judgement call again.** R8 discharged N2 by re-syncing live←canonical to
byte-identical at 787. This commit re-opens a **1-line, in-place** divergence at `:286` — the file
stays 787 lines, so it is a strictly-additive-in-content, zero-line-shift change. Combined with the
two agent files, the Gate-4 re-sync remains a **straight copy**, not a merge:

- All three canonical files are supersets/in-place-corrections of live; no live-only content exists.
- None of the three contains `__CLEARGATE_VERSION__` (verified) — R8's blanket-copy hazard does not
  apply to them. The hooks remain off-limits for exactly the reason R8 gave.

**Gate-4 re-sync list now stands at three files** (was one, and R8 cleared that one):
`cleargate-planning/.claude/{agents/architect-reader.md, agents/architect-synth.md,
skills/sprint-execution/SKILL.md}` → live. CR-107 (w11) and CR-110/CR-111 will add regions to
`SKILL.md`; the copy stays straight as long as no live-only edit is made in the interim. **Do not
hand-edit live `SKILL.md` for the rest of the sprint.**

**Consequence worth stating plainly: the feature is INERT in this repo until Gate 4.** The live
`architect-reader`/`architect-synth` that Claude Code actually executes still carry the
pre-BUG-046 contract. Any SDR fan-out run before the re-sync behaves exactly as it did yesterday.
This is correct per N1 — but it means BUG-046's own repo gets no benefit from BUG-046 until close.

---

## §3 — Cross-Cutting Rule 4: not engaged, and the `18 = 16 + 2` is right for the right reason

Rule 4 is satisfied **structurally**, not coincidentally. Four independent confirmations:

1. **The whole branch (`9c1ba35f..f5a1c778`) touches zero gated surfaces.**
   `git diff --name-only | grep -E 'templates/|readiness-gates|expected-headings|readiness-predicates'`
   → **NONE**. No template, no registry, no fixture, no predicate source.
2. **`cleargate-enforcement.md` heading lists are byte-identical before and after, in both trees** —
   16 `## ` headings and the full `### ` list, *including their line numbers*, `diff` clean. The
   file is 583 lines before and after: the edit is a strict 1-line-for-1-line replacement inside a
   paragraph body.
3. **Canonical `SKILL.md` `## ` heading list is byte-identical before and after**, same reason.
4. `cleargate-enforcement.md` is not a gated type in any case — it has no block in
   `readiness-gates.md` and no `TEMPLATE_FOR` entry. Even a heading move there could not shift a
   `section(N)`.

`gate-section-index-pinning` returns 14/14 with S6 asserting `18 = 16 pinned + 2` and S1a's
totals unchanged. **`expected-headings.ts` was not opened** — correctly, per N6 and the
STORY-054-05 post-flight rule carried in `sprint-context.md`.

---

## §4 — The refusal branch: architecturally sound in intent, **without an output slot**

### What is right

- **It is a genuine refusal, not a disguised serialize.** `architect-synth.md:69-92` states the
  decision, gives it its own exact rationale string
  (`"unreachable file surface — refused: <path>, <path>, ..."`), and explicitly forbids reusing
  BUG-033's `"unknown collision metadata — fail-safe-serialized"`. It is placed *after* the
  fail-safe-serialize section and argues against conflation in prose (`:83-86`). T4's mutant
  (serializing prose containing the word "refuse") is killed by C6's same-line
  `unreachab`∧`refus` coupling **with** a `serializ` exclusion.
- **The scope does not leak — measured, not asserted.** The reachability-vocabulary census across
  `.cleargate/scripts/` (excluding `test/`) returns exactly three files:
  `collision_surface.sh` (the new logic), `launch_wave.mjs:59` (the *pre-existing* blocker taxonomy
  string `"test DB unreachable, MCP down"` — unrelated, count still 1), and
  `assert_story_files.mjs:125` (an unrelated comment about regex reach). **No dispatch-time script
  gained a reachability check.** C12(c)'s count pin and the census both hold. SPRINT-39's confirmed
  waves 11–13 cannot be retroactively voided.
- **`architect-reader` stays a pure reporter.** The added field description ends *"deciding what
  happens with a non-empty list belongs to architect-synth, not this one"* and contains no
  `refus`/`reject` token — C12(b) holds.

### Defect D1 — the refusal has nowhere to go

`architect-synth.md` was extended with the refusal *decision* but not with the *output shape that
carries it*. Three concrete gaps, all inside the story's own declared file:

- **`waves.json` shape (`:104-125`) was not extended.** There is no `refused` / `refusals` key. A
  refused story is simply **absent** from the artifact.
- **The Wave Assignment table (`:129-140`) was not extended.** No refusal row. Absent there too.
- **The mandated rationale string has no container.** `rationale` exists only as a *field of a wave
  object* (`:115`, `:121`) and a *column of the wave table* (`:136`). The refusal simultaneously
  mandates the string and forbids creating the only thing that holds it. The instruction is
  self-defeating as written.

**Can it be silently swallowed by the caller? Yes — the loudest signal available is an absence.**
`SKILL.md:204`, the only mechanical post-condition after §A.4, is `test -f
<sprintDir>/plans/waves.json`. **Existence, not coverage.** A `waves.json` containing N-1 of N
stories passes. Downstream, `launchWave()` (`launch_wave.mjs:264-265`) iterates `wave.stories` and
nothing anywhere counts stories in against stories out. A refused story is never dispatched and
nothing says why.

**Mitigation that keeps this off the kick-back line:** §A.4 always halts for human confirmation of
the sprint plan (`SKILL.md:202`), and an LLM synth's primary return channel is its message to the
Orchestrator, not `waves.json`. A refusal stated in the returned block does reach a human. So the
condition is **unenforced**, not **unreachable**. It is not a no-op and it does not degrade to
serialization.

### Defect D2 — the Autonomy Contract was not updated and now reads against the refusal

`architect-synth.md:154` (unchanged, and it is the file's *last* instruction):

> "If a digest is malformed, fail-safe-serialize the story and proceed. … Return BLOCKED **only**
> if you cannot write `waves.json` at all."

versus `:73-74`: *"hand the condition back to the Orchestrator instead of writing `waves.json` for
that story."* Reconcilable — write `waves.json` without the story and say so — but an agent reading
top-to-bottom hits the narrower rule last. One clarifying clause closes it.

### Recommended fix (not this commit's; ~6 lines)

Add to `waves.json`: `"refused": [{ "storyId": ..., "reason": "unreachable file surface — refused:
<paths>" }]`, a `## Refused` row-set in the Wave Assignment table, and one clause in the Autonomy
Contract exempting the refusal. **`EPIC-055` introduces `waves.json schema_version: 2` and
`EPIC-057` adds per-story `checkout` — if a `refused` key is not designed in now, the refusal stays
homeless permanently.**

### Defect D3 — measured: **5 of 5** in-flight items would be refused

I ran the shipped classifier against the five remaining in-flight M4/next-sprint items:

| Item | stdout paths | UNREACHABLE flags | genuine | parser artefact |
|---|---|---|---|---|
| CR-108 | 10 | **7** | 5 (`cleargate-cli/src/**`) | 2 |
| CR-107 | 9 | **2** | 1 (`.claude/**`) | 1 |
| CR-110 | 8 | **2** | 2 (`.claude/**`) | 0 |
| CR-111 | 8 | **3** | 3 (`.claude/**`) | 0 |
| BUG-062 | 9 | **6** | 2 (`.claude/**`) | 4 |

**20 flags across 5 items; every one of the five would be REFUSED.** A whole-backlog SDR fan-out
after Gate-4 re-sync yields a wave plan with **zero** stories.

Two distinct causes, and the second is the one that changed:

1. **13 genuine.** `cleargate-cli/**` (gitignored, nested repo) and `.claude/**` (gitignored). The
   classifier is *correct*: these paths genuinely do not exist in a worktree. Four items still
   declare live `.claude/**` surfaces — the N1 inversion mode, which N1 corrected by ruling but the
   item files still carry.
2. **7 are BUG-062 parser over-reporting**, now routed into a refusal:
   `.cleargate/templates/{Bug,CR,epic,initiative,story,hotfix}.md` (brace-expansion prose cell),
   `Sprint Plan Template.md`, `story.md`, `CR.md`, `Bug.md`, `config.example.yml` (bare filenames
   lifted from prose), and the bare directory token `.claude/`. **All are C10's deferred case.**

**This is the finding the split created and nobody has stated yet: BUG-046 changed the blast radius
of the deferred BUG-062 defect.** Before this commit, an over-reported prose token cost a spurious
*serialization* — cheap, and in the safe direction. After it, the same token costs a **refusal** —
the story is dropped from the wave plan entirely. Over-reporting stopped being safe-by-construction
the moment the refusal branch landed. The two items must not only never be co-waved (R2); **BUG-062
should now be treated as a precondition for turning the refusal on**, not as an independent cleanup.

**This is not a Developer defect and not a surprise to the design.** BUG-046's own blast-radius
section and the M4 plan both recorded "9 of 15 in-flight items reference `cleargate-cli/src` paths;
safe by planning, not by enforcement." The human's 2026-08-26 refuse-not-serialize decision
converted "safe by planning" into "blocked by enforcement". C12 correctly protects SPRINT-39's
already-written waves. **The exposure is the next sprint's SDR, and it needs a decision before
then.** See §6 for the routing.

---

## §5 — The doctrine correction: it stops being wrong; it does not become predictive

All three chartered sites now carry TPV's replacement text, byte-identical across the Rule-1 pair,
and I verified the wording is a *correction* rather than a deletion (T5's `M8` mutant), with C13b
requiring the positive claim.

### The corrected claim is **incomplete** in two specific ways

**(a) It explains one of the classifier's three causes.** `classify_path` (`:216-244`) has three
unreachability branches: **nested repo** (`:227`), **gitignored** (`:232`), **untracked and not
declared new** (`:242`). The corrected doctrine attributes zero-tracked-ness to *nestedness* only.
A reader who internalises "nested repo ⇒ not materialised" still has no rule for a gitignored
non-repo path — and **that is the branch that fires most in this repo**: 7 of my 13 genuine flags
are `.claude/**`, which is gitignored but is not a nested repo.

**(b) Answering the question directly: no, a reader cannot predict `cleargate-cli/`'s behaviour
from the corrected text.** §1.3's heading is *"MCP nested-repo rule"* and its body names only
`mcp/`. `cleargate-cli/` and `admin/` appear nowhere in either doctrine file in a reachability
context (verified by grep — the sole `cleargate-cli/` hit in `cleargate-enforcement.md` is `:578`,
about `gate-mode.ts`). A reader must generalise from a single named example to a rule that is
never stated. The correct general rule — *a `git worktree add` checkout materialises tracked files
only; every zero-tracked root is absent regardless of why* — is stated **nowhere in shipped
doctrine**. It lives in N1, a per-sprint plan ruling that ships to no user, and in this repo's
`CLAUDE.md`, which is repo-specific.

### Defect D4 — a **fourth** live site of the same misconception, unflagged by C13 *and* C13b

`.cleargate/knowledge/cleargate-enforcement.md:101` (§1.6 Wave worktree contract) + its
byte-identical canonical mirror:

> "each in its OWN ClearGate-managed `.worktrees/STORY-X` (created via `git worktree add …` —
> **not** the Workflow tool's `isolation:'worktree'`, which **strips gitignored `/.claude/` +
> `/mcp/`** and cuts off the wrong base; spike decision 2)"

The sentence gives two reasons to prefer ClearGate-managed worktrees. The second (wrong base) is
genuinely differential. **The first is not:** plain `git worktree add` strips `/.claude/` and
`/mcp/` identically, because both are zero-tracked. The construction *"use A, not B, which strips
X"* implies A does not strip X. It does.

Why neither test catches it: **C13's grep is
`(visible|appears?|shows? up|present)[^.]*(as a )?subdirectory`** — it hunts the word
*"subdirectory"*, which `:101` does not contain. **C13b** only requires that `worktree` and
`tracked` co-occur on *some* line per file, which `:89` now satisfies for the whole file. This is
**T5 recurring one level up**: *"C13 bans a phrasing, not a claim; a green C13 is not evidence the
doc is now correct."*

**Why this is PASS and not KICK-BACK.** Evaluated literally — the standard this sprint applies to
its own gates — `:101` does not *claim* gitignored paths are visible in a worktree; it makes a true
statement about a different tool and misleads by implicature. C13's named mutant was *"grepping
only the two known lines instead of the whole tree"*, and the Developer did grep the whole tree
across three roots. The three chartered sites are corrected. Kicking back would be scope addition,
not defect remediation.

**But the implicature is one this repo has empirical evidence agents act on** — four M4 items
declared live `.claude/**` as their editable surface, which is exactly the belief `:101` licenses,
and which required N1 to be written as a normative ruling.

**Recommended: fold a one-line §1.6 correction into CR-107 (w11).** CR-107 already edits
`cleargate-enforcement.md` in both trees (§2), in a sequential wave immediately after w10, with a
byte-identical parity obligation already declared. §1.6 is a different section from §2 — no
collision. It is the cheapest possible close of the last site, this sprint. Pair it with one
sentence stating the general rule, so §1.3/§1.6 stop being three worked examples with no theory.

---

## §6 — Forward coupling

### CR-107 (w11) — **zero line-citation damage, one new obligation**

BUG-046's two doc edits are strict 1-for-1 line replacements: `SKILL.md` 787→787, and
`cleargate-enforcement.md` 583→583. **Every R8-repaired citation survives**, re-verified against
the post-commit tree:

| Citation | Owner | Text present at that line post-BUG-046? |
|---|---|---|
| canonical `SKILL.md:454` | CR-107 | yes — `**Serial barrier merge.**…` |
| canonical `SKILL.md:723` | CR-107 | yes — `git merge sprint/S-NN --no-ff …` |
| canonical `SKILL.md:261` | CR-106 | yes — `**Idempotent segments.**…` |
| `cleargate-enforcement.md` `## 2.` | CR-107 | still `:108` |

CR-107 must nonetheless: (a) cut its worktree from `sprint/S-39` **after** BUG-046 merges — regions
are disjoint (`:286` vs `:454`/`:723`; §1.3/§1.6 vs §2), so no conflict is expected; (b) inherit the
**three-file** Gate-4 re-sync list from §2 rather than R8's one-file list; (c) accept the §5
recommendation if the orchestrator takes it.

### The digest contract — **unversioned, and it degrades silently in both directions**

Answering the question plainly: **no, no future digest is unparseable by an older
`architect-synth`.** `unreachable_surface` is additive and declared optional (`:35`); the
required-field list (`:33`) excludes it, so a digest lacking it does not trip fail-safe-serialize,
and an old synth receiving the extra key simply ignores it. **The risk is not breakage — it is
silence.** Both mixed states collapse to pre-BUG-046 behaviour with no signal:

| Reader | Synth | Result |
|---|---|---|
| new (canonical) | old (live, un-re-synced) | extra key ignored → **no refusal ever fires** |
| old (live) | new (canonical) | key absent → defaults `[]` → **no refusal ever fires** |

**And a partially-re-synced install is exactly ClearGate's steady state between merges and Gate 4.**
There is no version marker on the digest anywhere. `EPIC-055` is introducing `waves.json
schema_version: 2`; there is no analogue for the digest. **If BUG-046, EPIC-055 and EPIC-057 each
extend the digest independently — and both epics declare `architect-synth.md` `action="modify"` —
a stale live agent produces silently degraded scheduling that looks identical to correct
operation.** Recommend a `digest_version` field be added when EPIC-055 lands its schema bump.

### EPIC-057 Multi-Repo Story Execution — **owns the resolution; is now the gating dependency**

EPIC-057 states it exactly: *"[[BUG-046]] makes the failure loud instead of silent. It does not
make the story runnable. This epic does."* and puts *"Reimplementing path classification —
[[BUG-046]] owns it"* out of scope. §D3 is the size of the window between them: **detection is
live, resolution is not, and the interim reading is 5/5 refused.** EPIC-057's `repos:` config block
and story routing are what make those 13 genuine flags actionable rather than fatal.

**One stale claim to fix:** `EPIC-057:14` `context_source` asserts *"collision_surface.sh has no
reachability logic"* — grounding that this commit invalidates. `EPIC-057:115` is forward-correct
(*"[[BUG-046]] adds reachability classification here; this epic consumes that output"*).

### EPIC-055 Parallel Wave Scheduling — **two obligations**

`EPIC-055:93` puts *"Any change to the five-clause compatibility predicate or to
`collision_surface.sh`"* out of scope, and `:111` says the predicate is untouched — both still hold
after BUG-046, which added a **sixth, non-pairwise** gate rather than a clause. Two obligations:
(1) its `waves.json` v2 schema must carry the `refused` key from §D1, or the refusal is homeless
forever; (2) its `depends_on` derivation reads `dep_predecessors`, which **BUG-062 owns and has not
shipped** — that field is still absent from every template, so `depends_on` derives from an
always-empty set exactly as clause 5 does today.

### BUG-062 — see §7.

---

## §7 — C8–C11 deferral: cleanly separable, and **easier**, with one new tripwire

**Nothing is half-implemented.** Verified in the shipped file:

| Deferred case | Status in `f5a1c778` |
|---|---|
| C8 `dep_predecessors` | absent — `grep -c dep_predecessors collision_surface.sh` → **0**; **0** templates contain it; zero template files on the branch diff |
| C9 cut at first ` — ` | absent — `emit_backticked` (`:99-112`) splits on backtick and `", "` only |
| C10 reject prose cells | absent — the skip list (`:145-153`) is unchanged; no space-based rejection |
| C11 unify the row-label `do not` check | absent — `do not` occurs exactly **once** in the file (`:122`, Sandbox parser); the §3.1 table parser (`:130-162`) has **zero** |

**BUG-062 got easier in one respect.** The table parser now extracts `row_label` at `:134-136` and
threads it through as a tab-separated pair. C11's unification only needs a `do not` guard *before*
the column loop at `:138` — the extraction work is already done and paid for.

### New tripwire BUG-062 must be told about (nothing asserts it)

`parse_surface_paths`'s internal contract changed from bare `path` to **`path\tlabel`**. Both
emitters were updated (`:109` and `:159`) and `classify_path` (`:263`) consumes the label for the
create-exemption. BUG-062 will edit `emit_backticked` — whose signature changed to
`(line, label, …)` — for its C9 em-dash cut. **If that edit drops the `"\t" label` suffix,
`classify_path` receives an empty label, the create-exemption silently stops working, and every
legitimately-new file becomes UNREACHABLE → refused.**

Coverage: C3 exercises the create-exemption end-to-end, but **only through the §3.1 table path** —
`cs_story` (the sole fixture builder) emits a `### 3.1` table and never an Execution-Sandbox bullet.
**The sandbox path's label threading is entirely unpinned.** BUG-062 should add a sandbox-bullet
create-exemption case as its first act.

### Defect D5 — latent, measured: the create-exemption is **order-dependent**

The dedup at `:250` is `awk -F'\t' '!seen[$1]++'` — **first label wins**. If one path appears under
two labels, whichever comes first in file order decides. Reproduced with a two-row fixture:

```
| Reference (read-only) | `src/brandnewthing.ts` |     ← listed first
| New Files Needed      | `src/brandnewthing.ts` |
  → UNREACHABLE: `src/brandnewthing.ts` is untracked and not declared as a new file …

| New Files Needed      | `src/brandnewthing.ts` |     ← listed first
| Reference (read-only) | `src/brandnewthing.ts` |
  → (no flag)
```

Same file surface, opposite verdict, decided by row order. Today the cost is a spurious stderr
annotation; once the refusal is live it is a **dropped story**.

**Not a kick-back: it is latent, not live.** I probed all 110 `pending-sync` items for paths
carrying conflicting create/non-create labels — **zero hits**. The one-line fix (dedup preferring a
create label, or classify before dedup and suppress when *any* occurrence is create-labelled)
belongs with BUG-062, which owns the parser.

### Minor notes, no action

- **The branch order in `classify_path` is load-bearing and undocumented.** `nested` (`:226`) is
  tested before `ignored` (`:231`); C2/C2b both gitignore their nested fixture, so reversing the
  order changes the message to "gitignored" and fails both. The comment does not say the order is
  the contract.
- **C12(b) forbids `refus`/`reject` anywhere in `architect-reader.md`**, so that file can never
  explain synth's behaviour using the natural verb. Intentional, but it is a grep-shaped
  documentation constraint.
- **`stamp_error: no ledger rows for work_item_id BUG-046`** entered the item's frontmatter via
  `cleargate stamp`. Pre-existing pattern — **66 of 110** `pending-sync` items carry it. Not
  BUG-046's, gate is green 7/7.

---

## §8 — Orchestrator actions

| # | Action | Owner | When |
|---|---|---|---|
| 1 | Correct `sprint-context.md:294` → `collision_surface.sh:118` | orchestrator | before w11 dispatch |
| 2 | Correct the three BUG-062 citations `:87-90` → `:118-125` | orchestrator | before BUG-062 decomposition |
| 3 | Correct `EPIC-053:108` `:54-55` → `:78-79`; fix `EPIC-057:14`'s falsified `context_source` | orchestrator | before those epics decompose |
| 4 | Fold the §1.6 `:101` one-line correction + a general "tracked files only" rule into **CR-107** | CR-107 dispatch | w11 |
| 5 | Carry the **three-file** Gate-4 re-sync list (§2); do not hand-edit live `SKILL.md` | orchestrator | Gate 4 |
| 6 | Decide D1/D3 before the next SDR fan-out: is the refusal armed, and does BUG-062 gate it? | **human** | sprint close / next sprint plan |
| 7 | Ensure `EPIC-055`'s `waves.json` v2 reserves a `refused` key and a `digest_version` | architect | EPIC-055 decomposition |

## Script Incidents

None. No wrapper-invoked script failed during this dispatch. No state-mutating `git` command was
run: no commit, merge, branch switch, worktree removal, `cleargate init`, or `dist/` rebuild.
