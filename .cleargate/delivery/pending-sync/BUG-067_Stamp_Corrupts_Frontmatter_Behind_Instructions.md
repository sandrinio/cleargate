---
bug_id: BUG-067
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: cli,frontmatter,stamp
status: Triaged
severity: P1-High
reporter: orchestrator
approved: true
approved_by: sandrinio
approved_at: 2026-09-04T00:00:00Z
context_source: measured reproduction in .cleargate/sprint-runs/SPRINT-39/CR-108-tpv.md §7 (RULING 1), against unmodified stamp-frontmatter.ts on main
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-29T19:56:50Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
stamp_error: no ledger rows for work_item_id BUG-067
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-09-24T23:02:45Z
  sessions: []
---

# BUG-067 — `cleargate stamp` corrupts frontmatter when an `<instructions>` block precedes it

## 1. The Anomaly (Expected vs. Actual)

**Expected:** `cleargate stamp <file>` adds or refreshes the four timestamp/version keys in a file's
frontmatter, leaving every other key untouched.

**Actual:** when the file opens with an `<instructions>` block *before* its frontmatter, `stamp`
does not skip the file — it **destroys the frontmatter**. It prepends a phantom block containing
only its own four keys, and demotes every real field to inert body text below a second `---` fence.

Exit code clean. `changed: true`, `reason: 'created'`. **No warning of any kind.**

Root cause is one line — `cleargate-cli/src/lib/stamp-frontmatter.ts:54`:

```ts
const hasFrontmatter = raw.trimStart().startsWith('---');
```

The file does not start with `---`, so the function concludes there is no frontmatter to update and
takes the create-new branch. The check tests *position*, not *presence*.

## 2. Reproduction Protocol

1. **Create the input file.** Any file whose `<instructions>` block precedes its frontmatter — the
   shape every authoring template has today, and every scaffolded item will have once [[CR-108]]
   ships. Contents given verbatim below.
2. **Run `cleargate stamp <file>`** (or call `stampFrontmatter` directly against the unmodified
   module). Observe exit code 0, `changed: true`, `reason: 'created'`, and no warning on stderr.
3. **Read the file back.** A phantom `---` block containing only the four stamp keys now leads the
   file; the original frontmatter sits below a second `---` fence as body text.
4. **Confirm the loss mechanically:** parse the frontmatter and inspect the key set. It is
   `created_at, updated_at, created_at_version, updated_at_version` — `bug_id`, `status` and
   `severity` are absent.
5. **Sweep the templates** to confirm it is not fixture-specific: run steps 1–4 against copies of
   all eight shipped authoring templates. All eight reproduce.

Input:

```
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

One `stampFrontmatter` call yields:

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

`frontmatterAfter` keys are `created_at, updated_at, created_at_version, updated_at_version`.
`bug_id`, `status` and `severity` are gone from the machine-readable block.

**Reproduced against all eight shipped authoring templates**, unmodified, on `main`:

```
Bug.md · CR.md · story.md · epic.md · initiative.md · hotfix.md · spike.md · Sprint Plan Template.md
    → reason=created   phantom-block-prepended=true   (8 of 8)
```

## 3. Evidence & Context

**There is a documented instruction to run exactly this command on exactly these files.**
`.cleargate/scripts/prep_doc_refresh.mjs:160` — the Gate-4 doc-refresh checklist generator — emits:

> `Modified \`.cleargate/templates/*.md\` (run \`cleargate stamp <path>\`)`

with the same at `:165`, `:170`, `:175` for `.cleargate/knowledge/*.md`. Any sprint that modifies a
template gets a close-out checklist instructing the corrupting command. **SPRINT-39 modifies eight
templates across two trees**, so its checklist lists them; the hazard is recorded in that sprint's
`GATE-4-PREFLIGHT.md` with instructions to punt those items.

**Blast radius, measured.** Exactly one production caller: `src/commands/stamp.ts`, two call sites
(the `--dry-run` tmpdir copy, and the real file). No other `src/` module imports `stampFrontmatter`.
**CORRECTION (2026-08-30, CR-108 architect post-flight) — an earlier draft of this section claimed
there is "no automatic trigger". That is FALSE, and it understated this bug by the widest possible
margin.**

The original reasoning stopped at the command name: the PostToolUse hook (`stamp-and-gate.sh:30`)
runs `stamp-tokens`, not `stamp`, so it was assumed safe. But **`stamp-tokens.ts:92` carries the
identical sniff** — `rawContent.trimStart().startsWith('---')` — and the hook runs it on **every**
Write/Edit under `.cleargate/delivery/**`. Verified directly: `stamp-and-gate.sh:30` is
`"${CG[@]}" stamp-tokens "$FILE"`, and `stamp-tokens.ts:92` is byte-for-byte the same check as
`stamp-frontmatter.ts:54`.

Reproduced end-to-end against a real scaffolded item:

```
$ cleargate stamp-tokens BUG-001_scaffold_probe.md
[stamped] … (BUG-001)          exit 0
$ # frontmatter afterwards:
keys:           stamp_error, draft_tokens
bug_id visible: GONE — demoted to body text
```

**So the trigger is automatic, silent, and already wired.** The defect is therefore two functions in
two commands, one of which fires on every qualifying file edit without anyone invoking it. The
`hotfix` type has been exposed this way since v0.24.2; [[CR-108]] takes it from one type to eight and
points every install's `CLAUDE.md` at the front door.

This correction does not change [[CR-108]]'s merge decision — the defect is pre-existing
(`stamp-tokens.ts` untouched since v0.24.2) and CR-108 neither creates nor touches either sniff. It
changes this bug's **severity and urgency**: there is no "only if someone runs it by hand" mitigation
to rely on.

**Corpus census, 523 files** across `pending-sync/`, `archive/` and both template trees:

- already carrying the corruption signature: **0**
- beginning with `<instructions>`: **16 — all templates** (8 × 2 trees). **No work item carries the
  block today.**

**The exposed population grows sharply when [[CR-108]] merges.** CR-108 scaffolds every work-item
type from these templates verbatim (no stripping, per its §4 AMENDMENT and OD-3), so from that day
*every newly authored item* opens with `<instructions>`. The first agent that stamps a fresh item
before hand-cleaning it silently loses `bug_id`/`status`/`severity` at exit 0. CR-108 does not cause
this defect and does not touch the defective line — but it widens the reachable set from 16 files to
every item authored thereafter. **That is the argument for fixing this early, not eventually.**

### FIELD CONFIRMATION — 2026-09-04, published v0.26.1, clean-room install

The prediction above has now happened. CR-108 shipped, and this was reproduced **outside the meta-repo**
in a clean-room install (`~/Documents/Dev/cg-cleanroom-20260904`: fresh `git init`, installed from the
**global npm `cleargate@0.26.1`**, verified a real install and not a link). The corpus census figure of
"0 files carrying the signature" is now stale — a fresh install produces one on its first authoring cycle.

Verbatim, `.cleargate/hook-log/gate-check.log` after `cleargate new epic` + one PostToolUse fire:

```
[stamped] …/EPIC-001_cleanroom_probe.md (EPIC-001)
[cleargate gate] error: unable to detect work-item type from frontmatter in: …/EPIC-001_cleanroom_probe.md
wiki ingest: create epics/EPIC-001.md
[2026-09-04T08:20:25Z] stamp=0 gate=1 ingest=0 file=…/EPIC-001_cleanroom_probe.md
```

The file afterwards: a phantom block at line 1 holding only `stamp_error` + `draft_tokens`, closing at
line 11; the real frontmatter demoted below a second fence at line 46, where `epic_id: "EPIC-001"` now
sits as body text. `stamp=0` — exit clean, exactly as this bug describes.

**Two facts this run adds beyond the original filing:**

1. **A SECOND consumer, on the read path, independent of any stamp.** `cleargate gate check` fails on a
   freshly scaffolded item *before* stamping ever runs — `[cleargate gate] error: cannot parse
   frontmatter`, reproduced on `bug` and `cr` scaffolds. Root cause is the same positional assumption in
   a different module: `cleargate-cli/src/wiki/parse-frontmatter.ts:17` **throws** on
   `lines[0] !== '---'`. So the locator defect is not confined to the two write-path sniffs — it is
   three call sites sharing one assumption, and a locate-the-fence fix must cover all three.
2. **Severity is understated as "silent data loss on stamp".** The compound effect is that a fresh
   install's very first `cleargate new` → edit cycle produces an item that can **never** pass a gate:
   the write path corrupts the frontmatter and the read path then cannot type it. Ingest still exits 0
   and creates a wiki page, so the wiki shows an item the gate cannot evaluate.

Discovered while running the clean-room verification that [[EPIC-058]] now mandates as a standing
requirement. This is the argument for that requirement: the meta-repo dogfood never surfaced it,
because agents hand-clean `<instructions>` out before the hook matters.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `cleargate-cli/src/lib/stamp-frontmatter.ts` — `:54`, the `hasFrontmatter` positional check.
- `cleargate-cli/src/commands/stamp-tokens.ts` — **`:92`, the identical sniff, and the one that is
  hook-wired.** Both must move together; fixing only `stamp-frontmatter.ts` leaves the automatic
  path intact and would read as fixed.
- `cleargate-planning/.claude/hooks/stamp-and-gate.sh` — line 30, the automatic trigger. The live
  .claude/hooks/stamp-and-gate.sh mirror is re-synced from canonical at the sprint boundary
  (CLAUDE.md's dogfood-split rule); this story edits canonical only.
- `cleargate-cli/test/lib/stamp-frontmatter.node.test.ts` — regression coverage.
- `.cleargate/scripts/prep_doc_refresh.mjs` — lines 160, 165, 170, and 175, the checklist that instructs
  the corrupting command; should not emit a `stamp` instruction for `<instructions>`-led files.
- `cleargate-planning/.cleargate/scripts/prep_doc_refresh.mjs` — canonical twin of the file above;
  tracked outer scripts are edited in both trees byte-identically per house rule (verified identical
  pre-fix via cmp).
- `cleargate-cli/src/wiki/parse-frontmatter.ts` — **`:17`, the READ-path third site** (added
  2026-09-04 by clean-room field confirmation). `if (lines[0] !== '---') throw` is the same
  positional assumption as the two write-path sniffs, and it is what makes `cleargate gate check`
  fail on a fresh scaffold before any stamp runs. Fixing only the two write sites leaves every
  freshly scaffolded item ungateable and would again read as fixed.
- `cleargate-cli/test/e2e/` — a clean-room regression that scaffolds, fires the PostToolUse chain,
  and asserts the item still gates. The meta-repo dogfood structurally cannot catch this.

**Do NOT modify:** the `<instructions>`-verbatim scaffold contract. OD-3 ruled no-stripping on
measured evidence, and §4 case 7's byte-identical requirement depends on it. The fix belongs in the
frontmatter *locator*, not in the scaffold renderer.

**Suggested direction:** locate the frontmatter fence rather than requiring it at offset 0 — the
same discipline [[BUG-041]] applied to id grammars. A `<instructions>`-aware sniff already exists as
precedent in `backfill_hierarchy.mjs`'s `parseFm`, which bails on the same condition (see FLASHCARD
2026-08-27 `#frontmatter #backfill`); that one fails *closed* (skips the file) where this one fails
*open* (corrupts it). Failing closed is the acceptable interim behaviour if a full fix is deferred.

## 5. Verification Protocol (The Failing Test)

A red test asserting that `stampFrontmatter`, given an `<instructions>`-led file with real
frontmatter, **preserves every pre-existing key** and creates no second `---` fence.

Note: [[CR-108]]'s QA-Red already authored this assertion as scenario `N6b` in
`cleargate-cli/test/commands/new-command.node.test.ts`. Per CR-108 TPV obligation **O2**, `N6b`
stays red and is **excluded from CR-108's acceptance line**, retitled to cite this bug id. The
assertion therefore already exists and is already failing — this bug is what makes it green.

## Prior work

- [[STORY-001-04]] — `Stamp Frontmatter Helper`, the original implementation of this module.
- [[STORY-001-05]] — `Stamp CLI`, the single production caller.
- [[EPIC-001]] — `Document Metadata Lifecycle`, the parent surface.
- [[BUG-025]] — a prior stamp-path frontmatter defect (`PostToolUse` duplicating
  `parent_cleargate_id`); same module family, different mechanism.
- [[CR-108]] — does not cause this defect but widens its blast radius; the two must not be conflated.
- [[BUG-047]] — `Gate Cache Stamp Deadlock`, stamp-adjacent, unrelated mechanism.

- [[EPIC-058]] — `Additive Multi-Host Execution Adapters`; its clean-room verification requirement is
  what produced this bug's 2026-09-04 field confirmation. Scheduling the two together is deliberate.

No prior item reports this defect. Found 2026-08-29 by the CR-108 mutation gate.

Re-checked 2026-09-04 via `cleargate-wiki-query` before filing what would have been a duplicate
(`BUG-085`, scaffolded then removed unauthored). The query returned this item as the direct match;
[[BUG-047]] `Gate Cache Stamp Deadlock` was the only near-miss and remains a distinct mechanism. The
new read-path symptom was folded in here rather than filed separately, because it is the same
positional assumption in a third module and one locate-the-fence fix closes all three sites.

## Context Source

`.cleargate/sprint-runs/SPRINT-39/CR-108-tpv.md` §7 (RULING 1) — measured reproduction against the
unmodified module, eight-template sweep, caller census, and 523-file corpus census. Filed per that
ruling's obligation **O1**, which requires the bug exist before CR-108 merges.

**Amended 2026-09-04** on direct owner request, after clean-room field confirmation against published
`cleargate@0.26.1` in `~/Documents/Dev/cg-cleanroom-20260904`. Adds §3 FIELD CONFIRMATION, the
read-path third call site (`parse-frontmatter.ts:17`) to §4, and proposes scheduling alongside
[[EPIC-058]].

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢**

- [x] The defect is reproduced with exact input and output.
- [x] Root cause is identified to a single line.
- [x] Blast radius is measured, not estimated.
- [x] Prior work is checked and recorded.
- [x] Fix approach is chosen: **locate-the-fence**, decided 2026-09-04 on direct owner approval.
- [x] Scheduling decided — proposed for [[SPRINT-41]] at M0, sequenced first and alone, on direct
      owner instruction 2026-09-04. (Was: not in SPRINT-39; CR-108 TPV ruled it out of that CR's scope.)

**RESOLVED 2026-09-04 — locate-the-fence.** Direct owner approval. The locator finds the frontmatter
fence wherever it sits rather than requiring offset 0, applied to all three call sites named in §4:
`stamp-frontmatter.ts:54`, `stamp-tokens.ts:92`, and `parse-frontmatter.ts:17`. This is §4's own
suggested direction and the same discipline [[BUG-041]] applied to id grammars.

Fail-closed remains available as an in-sprint fallback **only** if the Developer finds the locator
change materially larger than scoped; taking it requires re-dispatch, not a silent substitution,
because a fail-closed stamp still leaves every freshly scaffolded item ungateable on the read path.
