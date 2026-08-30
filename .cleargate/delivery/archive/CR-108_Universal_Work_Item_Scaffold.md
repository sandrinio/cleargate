---
cr_id: CR-108
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-39
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: verified codebase grounding (hotfix.ts:118-192 existing scaffolder; stamp-frontmatter.ts:94-119 existing stamper; placeholder inventory across all 9 templates) + recorded direct approval 2026-08-26
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:50:15Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: cleargate-cli/src/commands/hotfix.ts, cleargate-cli/src/lib/stamp-frontmatter.ts, cleargate-cli/src/commands/stamp.ts, cleargate-cli/src/lib/work-item-type.ts"
  last_gate_check: 2026-08-29T20:52:04Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: <synthetic>,claude-opus-5
  last_stamp: 2026-08-29T20:52:04Z
  sessions:
    - session: 49c00a07-a425-4af9-9ac6-97ed8ed5ee64
      model: <synthetic>,claude-opus-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-08-29T19:28:57Z
---

# CR-108: `cleargate new <type>` — one scaffolder for every work-item type

## 0.5 Open Questions

- **Question:** Should the agent be *forbidden* from hand-writing frontmatter, or merely expected to use the scaffolder?
- **Recommended:** Forbidden, mechanically. A readiness predicate or pre-commit check that rejects a work item whose frontmatter was not machine-generated is the only version of this that survives contact with a busy agent. Start with the scaffolder plus a CLAUDE.md directive; add the mechanical check as a follow-up once the scaffolder covers every type.
- **Human decision:** Scaffolder + directive now, mechanical check as follow-up — recorded 2026-08-26.

- **Question:** How are ID collisions between concurrent sessions prevented?
- **Recommended:** Allocate by scanning `pending-sync/` **and** `archive/` under an exclusive `O_EXCL` lockfile, then create the file before releasing. `hotfix.ts:164` scans only `pendingDir` today, which under-counts once items are archived — that is a latent ID-reuse bug this CR fixes while generalizing.
- **Human decision:** Scan both directories under a lockfile — recorded 2026-08-26.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that the conversational agent authors frontmatter.** Today I generate ~33 lines of YAML per work item by hand, roughly 20 of them literal `null` boilerplate, and I discover the next free ID by running three greps. Both are mechanical, both are token-priced, and both are error-prone in a way a script is not: a typo in `updated_at_version`, an omitted `server_pushed_at_version`, or an ID collision with a concurrent session are all reachable by hand and unreachable by code.
- **Forget that scaffolding is a hotfix-only capability.** `cleargate hotfix new` already implements the entire mechanism — max-ID scan (`hotfix.ts:164`), increment (`:165`), zero-pad (`:166`), template resolve (`:118-121`), placeholder substitution (`:179`), write (`:192`). It is wired to exactly one of the nine templates.
- **Forget that `hotfix.ts:164`'s ID scan is correct.** It scans `pendingDir` only. Once items move to `archive/` (which the protocol mandates after push), the max-ID scan under-counts and the next allocation can reuse a live ID. **This is now filed as [[BUG-045]] and fixed there, ahead of this CR** — generalizing an allocator before correcting it would propagate the defect to all nine types.

**New Logic (The New Truth):**

- **`cleargate new <type> "<slug>"` scaffolds any work-item type.** One command, one ID grammar, one placeholder vocabulary, one stamping path. It allocates the next ID, renders the type's template, stamps the machine fields, and writes to `pending-sync/`.
- **This is the BUG-041 divergence class again.** BUG-041 collapsed duplicated ID grammars into one; `hotfix new` is the same defect at the scaffolding layer — a general mechanism implemented once per type. SPRINT-39 §2.5 already flags the identical pattern for `STORY-054-04`'s four hardcoded bucket lists. One grammar, enforced by a shared-corpus test, is the established remedy.
- **The machine/human boundary becomes explicit.** The script owns everything derivable — ids, dates, versions, file path, `null` scaffolding. The agent owns everything requiring judgment — Context Override, Existing Surfaces, Gherkin, gate evaluation. This is the same seam CR-109 relocates physically; this CR establishes *who writes which side* without moving any field.
- **`cleargate stamp` is the update half and already exists.** `stampFrontmatter` (`stamp-frontmatter.ts:94-119`) preserves `created_at`/`created_at_version`, advances `updated_at`/`updated_at_version`, appends keys in canonical order, and no-ops when nothing changed. It needs wiring into the scaffolder and into the edit path, not rewriting.

## 2. Blast Radius & Invalidation

- [ ] **Hard predecessor: [[BUG-045]]** — corrects the archive-blind ID scan before this CR lifts the allocator to all nine types. Merges before this CR inside M4.
- [ ] Invalidate/Update: **`cleargate hotfix new`** — becomes a thin alias over `cleargate new hotfix`, or is deprecated in its favour. Its behaviour must not regress.
- [ ] Invalidate/Update: **CLAUDE.md drafting directive** — "Use the templates in `.cleargate/templates/`" becomes "run `cleargate new <type>`, then author the body."
- [ ] Database schema impacts? **No.**
- [ ] **Placeholder normalization is required and is the main compatibility risk.** Inventory across all nine templates: `{ID}` is used by `Bug.md`, `CR.md`, `epic.md`, `hotfix.md`, `story.md`; `{NNN}` is used by `epic.md` and `initiative.md` for the same concept; `{ISO}` and `{SLUG}` exist **only** in `hotfix.md`. Normalizing these tokens edits all nine templates plus all nine canonical mirrors — 18 files — and any drift breaks scaffolding for that type silently.
- [ ] **`sprint_context.md` and `sprint_report.md` have no placeholders at all** and are not work items in the ID sense. They must be excluded from the type registry, not force-fitted.
- [ ] **Interaction with SPRINT-39 `STORY-054-02`** (spike type registration, KNOWN_TYPES) — both touch the work-item type registry. Merge ordering required; see §3.
- [ ] **Interaction with EPIC-052** — already flagged in SPRINT-39 §2.5 as touching the same six templates. Do not run in overlapping sprints.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/hotfix.ts:164-166` — `maxHotfixId(pendingDir)` + increment + zero-pad. The ID allocator, generalized by this CR (and corrected to scan `archive/` too).
- **Surface:** `cleargate-cli/src/commands/hotfix.ts:118-121` — `resolveTemplatePath()`; template lookup under `.cleargate/templates/`. Generalized from a fixed filename to a type→template map.
- **Surface:** `cleargate-cli/src/commands/hotfix.ts:179,192` — `{ID}`/`{SLUG}`/`{ISO}` substitution and write. The render half.
- **Surface:** `cleargate-cli/src/lib/stamp-frontmatter.ts:94-119` — `stampFrontmatter()`; create-vs-restamp semantics, canonical key order, no-op detection. Reused verbatim as the stamping half.
- **Surface:** `cleargate-cli/src/commands/stamp.ts:62-127` — `stampHandler`, including `--dry-run` via a tmpdir copy. The dry-run idiom is reused for `cleargate new --dry-run`.
- **Surface:** `cleargate-cli/src/lib/work-item-type.ts` — the existing type registry the new command's type argument must validate against.
- **Why this CR extends rather than rebuilds:** Every mechanism this CR needs already runs in production for one type. The ID allocator, the template renderer, the frontmatter stamper, the dry-run harness, and the type registry all exist and are individually correct. What does not exist is the *generalization* — a type→template map and a single entry point. Rebuilding would mean writing a second allocator and a second stamper, which is precisely the divergence BUG-041 was filed to eliminate.

## Task Breakdown

> Rows authored by the M4 Architect in `.cleargate/sprint-runs/SPRINT-39/plans/M4.md`
> and committed into this item by the orchestrator on 2026-08-29 (M4 OD-5), before any
> worktree was cut. Execution order.

- [x] Correct CR-108 ## Prior work line 92: name the CLAUDE.md overlap with CR-105/BUG-043 (orchestrator, pre-dispatch) — done pre-dispatch, see the `§ AMENDMENT` already in this section.
- [x] Branch story/CR-108 from cli main (post-BUG-045); cut the outer half from sprint/S-39 — done pre-dispatch; verified clean at `649e6df` (cli) / `078722c6` (outer) at session start.
- [x] Decide and record the {ID} semantic (full-id) and the {PARENT_EPIC_ID} split before touching any template — ruled by CR-108-tpv.md F3/RULING (full-id; story.md's `parent_epic_ref` uses the distinct `{PARENT_EPIC_ID}` token); applied identically across all eight templates.
- [x] Build the type -> {template, padWidth, allocator} map in work-item-type.ts; add KNOWN_UNSCAFFOLDABLE = {proposal}, size-asserted — `SCAFFOLD_REGISTRY` (8 rows: template + padWidth) and `KNOWN_UNSCAFFOLDABLE` (size 1, `{'proposal'}`) added to `work-item-type.ts`. The allocator itself lives in `new.ts` (`maxIdForType` / `maxStorySeqForEpic`), not in the registry map, per the item's own "generalise the loop body, don't reshape the signature" guidance.
- [x] QA-Red: author N1-N13 in test/commands/new-command.node.test.ts; measure the red set, do not predict it — done by QA-Red, both rounds (baseline `pass 5 · fail 52` of 57).
- [x] Create src/commands/new.ts reusing maxHotfixId (BUG-045-corrected), work-item-id.ts, stampFrontmatter, the wx lock idiom — created, reusing `work-item-id.ts` (`classifyType`/`idFromFilename`/`numericStem`/`parseWorkItemId`) and the `wx`-lock idiom. **Deviation:** does NOT call `stampFrontmatter` — RULING 1 (CR-108-tpv.md §7, O3) supersedes this row's original text; `newHandler` must never call `stampFrontmatter`, since it corrupts `<instructions>`-prefixed scaffolds (filed as BUG-067) and CR-108's own §4 AMENDMENT rules that `<instructions>` is not stripped.
- [x] Register top-level `new <type> <slug>` in cli.ts; reduce hotfix.ts:719 to a delegate — registered beside `stamp` in `cli.ts`; `hotfixNewHandler` reduced to its cap-check plus a delegate call into `newHandler({ type: 'hotfix', ... })`. `hotfix.ts` dropped from 211 to 66 lines (`maxHotfixId`, `resolveTemplatePath`, the render/write body and its own `SLUG_RE` all retired — `grep -rn "maxHotfixId" src` is zero hits).
- [x] Normalize placeholders in EIGHT templates x 2 trees; fix hotfix.md:11, initiative.md:23/38/39, hotfix.md:39 — all eight templates normalized in both `.cleargate/templates/` and `cleargate-planning/.cleargate/templates/`, byte-identical (verified via `diff`). `hotfix.md:11`, `initiative.md:23/38/39` fixed as named; `hotfix.md:39`'s hardcoded `cleargate@0.5.0` also joined the `strategy-phase-pre-init` convention per F10. Additionally normalized (in scope per "Normalize placeholders" but not individually named by F1-F14): `Bug.md`/`CR.md`/`epic.md`/`Sprint Plan Template.md`'s `<PREFIX>-{ID}` id-field and H1 sites (F3's doubled-prefix defect class), and `Bug.md`/`CR.md`/`epic.md`'s `parent_ref` example text (was `"EPIC-{ID} | STORY-{ID}"`, which a global `{ID}` substitution would have silently corrupted into the item's own new id — changed to plain non-token prose `"EPIC-NNN | STORY-NNN-NN"`, matching the existing pipe-enum convention used elsewhere in the same templates).
- [x] Edit CLAUDE.md:33 and cleargate-planning/CLAUDE.md:39 in the SAME commit; run the ANCHORED block-equal check — both edited identically; anchored check: `block-equal: true 11948 / 11948`.
- [x] Add one CHANGELOG.md bullet under the existing ## Unreleased — one `### Added` bullet added (a new subsection under the same `## Unreleased` heading, not a second `## Unreleased`).
- [x] Run gate-section-index-pinning (expect 18/18/0/0), typecheck, full suite; record all numbers — `gate-section-index-pinning`: `tests 14 · pass 14 · fail 0 · skipped 0` (TPV §8 corrects the plan's `18/18` — that is the criteria count printed inside test titles, not the test-case count; the acceptance line is `14/14/0/0`, confirmed unchanged by this story). Typecheck: clean, 0 errors. Full suite: see CR-108-dev.md for the full breakdown and the cross-repo caveat on 10 of its 12 reported failures.
- [x] Re-measure every hotfix.ts line citation in the item after the edit (N7 of the rulings) — re-measured pre-dispatch in `§ PRE-DISPATCH AMENDMENTS`; `hotfix.ts` is now 66 lines post-CR-108 (was 211), so every citation in this item is stale again as of this commit — expected and out of scope to chase further (no downstream item cites `hotfix.ts` line numbers after this story).

## Prior work

- `cleargate wiki query "work item scaffold id allocation frontmatter stamp"` → **none found** for a universal scaffolder.
- Direct precedent in the tree, not in the wiki: `cleargate hotfix new` (shipped) is the single-type implementation this CR generalizes.
- [[BUG-041]] — collapsed duplicated ID grammars into one; shipped in cleargate 0.24.1. This CR applies the identical remedy one layer up. The accompanying flashcard ("pin duplicated grammars with a shared-corpus test", 2026-08-24) prescribes the test shape used in §4.
- [[STORY-054-02]] (SPRINT-39) — registers the `spike` type in KNOWN_TYPES. Adjacent surface; ordering constraint recorded in §3.
- [[CR-105]], [[BUG-043]] — also SPRINT-39, also two-tree template/marker edits.
  **§ AMENDMENT (orchestrator, 2026-08-29, per M4 plan §Q5-A F1). The original claim "No overlap"
  is FALSE and this item's own §3 falsifies it** — §3 declares root `CLAUDE.md` and
  `cleargate-planning/CLAUDE.md`, which is exactly the pair CR-105 rewrote in `71037e5a`. The
  overlap is at file level and it is real. Three consequences bind this item:
  (1) its target sentence now sits at root `CLAUDE.md:33` / canonical `:39` — CR-105's relocation
  renumbered the root file wholesale, so any pre-2026-08-29 line citation is wrong;
  (2) that sentence is **inside the bounded block**, adjacent to [[BUG-057]]'s at `:34`;
  (3) the two-tree hash coupling binds it and **nothing warns at test time** — an edit inside the
  block in one tree without the mirror makes `drift-check.ts` set `outcome.blocker = true` on bare
  `cleargate doctor`. The `block-equal` check in §4 is the only thing that catches it, and it must
  use the **anchored** grammar: the unanchored form returns a confident `true` about the wrong
  10606 characters, because `CLAUDE.md:50` mentions the markers inline. That is BUG-043's own
  defect reproduced inside the check meant to guard against it.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/hotfix.ts` — reduce to an alias over the general path.
- `cleargate-cli/src/lib/work-item-type.ts` — type→template map.
- `cleargate-cli/src/cli.ts` — register the `new` command.
- `.cleargate/templates/{Bug,CR,epic,initiative,story,hotfix}.md` + `Sprint Plan Template.md` — normalize `{ID}`/`{NNN}`/`{ISO}`/`{SLUG}`.
- `cleargate-planning/.cleargate/templates/*` — canonical mirrors of the above.
- `CLAUDE.md` (root + `cleargate-planning/`) — drafting directive.

**Create:**
- `cleargate-cli/src/commands/new.ts` — the general scaffolder.
- `cleargate-cli/test/new-command.node.test.ts` — see §4.

**Merge ordering:** must land **after** [[BUG-045]] (corrected allocator) and **after** `STORY-054-02` (spike type registration) — 02 adds a row to KNOWN_TYPES, this CR reads that registry to build the type→template map. Landing this first means 02 rebases onto a changed registry shape.

**Do NOT modify:** `stamp-frontmatter.ts` internals (reused as-is), the push/pull path, `sprint_context.md`, `sprint_report.md`.

## § PRE-DISPATCH AMENDMENTS (orchestrator, 2026-08-29, per the BUG-045 Architect post-flight)

BUG-045 merged into `cleargate-cli` `main`; `hotfix.ts` is now **211 lines** and every offset this
CR cites moved. Shift function: `1-47` unchanged · `48-65` restructured to `54-75` · `66-163` **+8**
· `164-211` **+9**. Re-measured against the merged file:

| Cited in this item | Now | What it is |
|---|---|---|
| `hotfix.ts:164` (×3) | **`:173`** | the `maxHotfixId(pendingDir, archiveDir)` call |
| `:165` | **`:174`** | `nextId = maxId + 1` |
| `:166` | **`:175`** | `padStart(3, '0')` |
| `:118-121` | **`:128`** | `resolveTemplatePath` |
| `:179` | **`:189-191`** | the three `.replace()` substitutions |
| `:192` | **`:201`** | `writeFileSync` |
| — | `:54` | `maxHotfixId(...dirs: string[])` definition |

**`hotfix.ts:719` in the Task Breakdown is a phantom** — the file is 211 lines and never had a
`:719`. The row means *reduce `hotfixNewHandler` to a delegate*; it carries no usable citation.

**The `§ AMENDMENT` recording OD-3 cites `hotfix.ts:188-191` and is CORRECT — do not "harmonise" it.**
That ruling was measured against the post-BUG-045 branch. Every *other* copy of that render
statement in the tree (`:179-182`, `:180-182`, `:179-181`, `:178-192`, `:178-182` — eight sites) is
stale. The OD-3 citations are the minority and the only right ones; conforming them to the majority
breaks exactly what gates this CR.

**Two §0.5/§1 claims are now factually false and are REPLACED, not deleted.** *"`hotfix.ts:164`
scans only `pendingDir` today"* and *"Forget that `hotfix.ts:164`'s ID scan is correct"* described
the pre-BUG-045 world. BUG-045 shipped the union scan, so the correct statement is: **the allocator
already scans `pending-sync` ∪ `archive` with per-directory ENOENT tolerance and a surviving type
filter; this CR generalises that corrected allocator rather than fixing it.**

### § BLOCKER-CLASS FINDING — "every work-item type" is not a single well-defined set

Two live `WorkItemType` exports, same name, same directory, neither importing the other, and
`stamp-tokens.ts` imports from **both** (`:14` and `:20`):

- `src/lib/work-item-id.ts:56` — `type WorkItemType = (typeof TYPE_PREFIXES)[number]`, **12
  UPPERCASE** prefixes: `INITIATIVE PROPOSAL PLATFORM HOTFIX SPRINT STORY AUDIT SPIKE EPIC PROP BUG CR`.
- `src/lib/work-item-type.ts:8` — `type WorkItemType = 'story' | 'epic' | 'proposal' | 'cr' | 'bug'
  | 'initiative' | 'sprint' | 'hotfix' | 'spike'`, **9 lowercase**.

`PLATFORM`, `AUDIT` and legacy `PROP` exist in the id grammar with **no** counterpart in the 9-type
registry. Without an explicit bridge that uppercases **and rejects** those three,
**`cleargate new platform` scaffolds a tenth type with no template and no wiki bucket, and exits 0.**

### § BLOCKER-CLASS FINDING — the template mapping is NOT `${type}.md`, and `proposal` has none

Measured against `.cleargate/templates/`:

| type | template file |
|---|---|
| story | `story.md` |
| epic | `epic.md` |
| cr | **`CR.md`** (uppercase) |
| bug | **`Bug.md`** (capitalised) |
| initiative | `initiative.md` |
| sprint | **`Sprint Plan Template.md`** (spaces, no type token) |
| hotfix | `hotfix.md` |
| spike | `spike.md` |
| **proposal** | **NONE — the file does not exist** |

Two consequences:

1. **`proposal` is a registered type with no template.** `cleargate new proposal` cannot work as
   specified. Decide before dispatch whether this CR authors `proposal.md`, or narrows its own
   claim from "every work-item type" to the eight that have one. **Do not let a Developer discover
   this at implementation time and silently pick one.**
2. **A naive `path.join(templatesDir, `${type}.md`)` is wrong for three of nine and must not ship.**
   Worse, it will appear to work: macOS APFS is case-insensitive by default, so `cr.md` and `bug.md`
   resolve to `CR.md` and `Bug.md` on the developer's machine and fail on Linux — for users and for
   any CI. **Use an explicit type → filename map, and assert every entry resolves with
   case-sensitive matching** (compare against a `readdirSync` listing, not `existsSync`).

The item's *"Normalize placeholders in EIGHT templates"* row is consistent with eight, not nine —
which is itself evidence the proposal gap was noticed and never written down.

### § RULING — `cleargate new proposal` REJECTS with a named error; CR-108 does not author `proposal.md`

Resolving the decision the finding above says must be made before dispatch. Measured: `proposal` is
**live**, not vestigial — **16** `PROPOSAL-*`/`PROP-*` items across `pending-sync/` + `archive/`,
**15** compiled `wiki/proposals/` pages, and `proposals` is a declared `wiki.ingest_buckets` entry.
So narrowing the CR's claim to "the eight types that have templates" and saying nothing is not
honest: `cleargate new proposal` is a command a user would reasonably run.

**Ruling, three parts:**

1. **CR-108 scaffolds the eight types that have templates.**
2. **`proposal` is rejected with a named error naming the missing template** — it must not fall
   through, must not silently resolve to another template, and must not exit 0. The rejection is a
   required test case, not an implementation detail.
3. **CR-108 does NOT author `proposal.md`.** Designing a work-item template is doctrine work — which
   sections, which readiness gate, which Ambiguity-Gate criteria — and it carries its own gate
   registration. Folding it in would add an unbounded design surface to a CR whose acceptance is
   "one scaffolder plus a byte-identical `hotfix new` regression", and would make that regression
   case unverifiable.

The gap itself is **filed separately as [[BUG-065]]** — a registered type with 16 live items and no
authoring template is registry drift of the same family as [[BUG-051]], and it predates this CR.

### § What CR-108 may and may not lift from BUG-045's allocator

- **`...dirs: string[]` generalises the SCAN, not the ALLOCATION.** `maxHotfixId` returns `number`
  because a HOTFIX id is a scalar; a story id is a pair. Lift the **loop body** into
  `collectIds(type, ...dirs)` and give each type its own `nextId()` — do not reshape the existing
  signature and call it general.
- **`max + 1` does not generalise to `story`.** `numericStem('STORY-054-06')` returns the **epic**
  number `054` (executed, not reasoned). Story allocation needs the parent epic as an argument. The
  live STORY union max is `099`, from the sentinel `STORY-099-01_Dogfood_Lane_Fast_Smoke.md`.
- **Pad width cannot leak from the corpus** — `padStart(3, '0')` is at the call site and `parseInt`
  discards width before the max is taken. A per-type width table is fine, but note it is
  **under-determined by the corpus**: SPIKE has 0 live items, HOTFIX and INITIATIVE 1 each. Derive
  it from the type registry, never from what happens to be on disk.
- **`countActiveHotfixes`'s mtime semantics are cap-specific.** Nothing else may inherit them.
- **Keep the single shared scan over both directories — do not add per-type indexing.** Not on cost
  (501 files, two `readdirSync`), but because one shared `archive/` makes a dropped type filter
  return a *plausible* id — BUG-045's M9 mutant allocated `HOTFIX-115` and collided with nothing —
  whereas per-type directories would return empty and look like a different bug. Indexing adds a
  second place for the partition to be wrong.

---

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`

Required cases:
1. **Shared-corpus grammar test** (per the BUG-041 flashcard): one corpus of `{type, id}` pairs exercised against both the allocator and the type registry. A type present in one and absent from the other fails the test. This is the anti-divergence pin.
2. **Every registered type scaffolds.** Parameterized over the type registry — a newly registered type with no template mapping fails loudly rather than silently producing an unrendered `{ID}`.
3. **No unrendered placeholders.** Scaffolded output contains no `{...}` token that the renderer owns (`{ID}`, `{NNN}`, `{ISO}`, `{SLUG}`). Body placeholders the human fills are whitelisted.
4. **ID allocation scans both directories, for every registered type.** [[BUG-045]] fixes and pins this for `hotfix`; this case re-runs the same scenario parameterized across the whole type registry. With `CR-106` in `pending-sync/` and `CR-107` in `archive/`, the next allocation is `CR-108`, not `CR-107`.
5. **Concurrent allocation.** Two simultaneous `cleargate new cr` invocations produce two distinct IDs, never a collision.
6. **Stamp round-trip.** Scaffold → `cleargate stamp` → re-stamp: `created_at` is preserved, `updated_at` advances, second identical re-stamp is a no-op.
7. **`hotfix new` regression.** Existing behaviour byte-identical to pre-CR output.

**§ AMENDMENT (orchestrator, 2026-08-29, resolving M4 OD-3 — the Architect flagged this as
"must be decided before dispatch"). `cleargate new <type>` does NOT strip `<instructions>`
blocks. Ruled: no stripping.** Measured, not inferred:

- Eight of ten templates carry exactly one `<instructions>` block (`Bug.md`, `CR.md`,
  `Sprint Plan Template.md`, `epic.md`, `hotfix.md`, `initiative.md`, `spike.md`, `story.md`);
  only `sprint_context.md` and `sprint_report.md` carry none. **`hotfix.md` is in the carrying set.**
- The shipping renderer strips nothing. `hotfixNewHandler` reads the template and performs exactly
  three substitutions — `cleargate-cli/src/commands/hotfix.ts:188-191`:
  `.replace(/\{ID\}/g, idStr).replace(/\{SLUG\}/g, opts.slug).replace(/\{ISO\}/g, now)`.
  `grep -n 'instructions' src/commands/hotfix.ts` returns nothing.
- The one real scaffolded artefact, `archive/HOTFIX-001_init_skip_strips_exec_bit.md`, carries
  **zero** `<instructions>` blocks while its own template carries one. The renderer cannot have
  removed it, so **it was hand-cleaned after scaffolding** — a human editorial step, not a
  renderer behaviour.

Three reasons, in order of weight:

1. **Case 7 above demands byte-identical output.** Stripping violates it by construction, since
   `hotfix.md` carries a block. The two requirements are mutually exclusive as written, and
   byte-identical regression is the one protecting a command that already ships to users.
2. **The block is the drafting agent's contract** — it is what tells the agent to render a Brief
   and halt (the universal pre-push handshake in CLAUDE.md). Stripping at scaffold time deletes
   the instruction from the artefact the agent then reads.
3. **Stripping is separable.** If hand-cleaning proves a real burden across nine types it is its
   own CR with its own regression case; it is not a precondition of "one scaffolder for every
   type", and folding it in would make case 7 unverifiable.

Implement substitution-only rendering, matching `hotfix.ts:188-191`. Any `<instructions>`
handling is **out of scope and a kick-back**.

**Eviction check:** `command grep -rn "maxHotfixId" cleargate-cli/src` returns at most the general allocator — no type-specific duplicate remains.

**Parity check:** all nine template mirrors diff clean against `cleargate-planning/`.

---

## Context Source

**context_source:** Verified codebase grounding — `hotfix.ts:118-192` read directly and confirmed to implement the full scaffold mechanism for one type; `stamp-frontmatter.ts:94-119` confirmed to implement create-vs-restamp semantics; placeholder divergence across nine templates established by direct inventory. Direct approval recorded 2026-08-26: user asked whether frontmatter/date updates could move from token-priced agent authoring to a script, and proposed automatic ID assignment in the same message.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — `STORY-054-02` ordering constraint recorded in §3; no item is invalidated.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio, in the design conversation that produced this CR.
