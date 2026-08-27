---
cr_id: CR-108
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
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
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-25T20:50:15Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
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

## Prior work

- `cleargate wiki query "work item scaffold id allocation frontmatter stamp"` → **none found** for a universal scaffolder.
- Direct precedent in the tree, not in the wiki: `cleargate hotfix new` (shipped) is the single-type implementation this CR generalizes.
- [[BUG-041]] — collapsed duplicated ID grammars into one; shipped in cleargate 0.24.1. This CR applies the identical remedy one layer up. The accompanying flashcard ("pin duplicated grammars with a shared-corpus test", 2026-08-24) prescribes the test shape used in §4.
- [[STORY-054-02]] (SPRINT-39) — registers the `spike` type in KNOWN_TYPES. Adjacent surface; ordering constraint recorded in §3.
- [[CR-105]], [[BUG-043]] — also SPRINT-39, also two-tree template/marker edits, but on `CLAUDE.md` handling rather than the templates themselves. No overlap.

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
