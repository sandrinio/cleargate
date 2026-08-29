---
bug_id: BUG-067
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: cli,frontmatter,stamp
status: Draft
severity: P1-High
reporter: orchestrator
approved: false
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
The PostToolUse hook (`stamp-and-gate.sh:30`) runs **`stamp-tokens`**, a different command, so there
is **no automatic trigger** — this fires only when a human or agent runs `cleargate stamp` by hand.

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

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `cleargate-cli/src/lib/stamp-frontmatter.ts` — `:54`, the `hasFrontmatter` positional check.
- `cleargate-cli/test/lib/stamp-frontmatter.node.test.ts` — regression coverage.
- `.cleargate/scripts/prep_doc_refresh.mjs` — `:160/:165/:170/:175`, the checklist that instructs
  the corrupting command; should not emit a `stamp` instruction for `<instructions>`-led files.

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

No prior item reports this defect. Found 2026-08-29 by the CR-108 mutation gate.

## Context Source

`.cleargate/sprint-runs/SPRINT-39/CR-108-tpv.md` §7 (RULING 1) — measured reproduction against the
unmodified module, eight-template sweep, caller census, and 523-file corpus census. Filed per that
ruling's obligation **O1**, which requires the bug exist before CR-108 merges.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡**

- [x] The defect is reproduced with exact input and output.
- [x] Root cause is identified to a single line.
- [x] Blast radius is measured, not estimated.
- [x] Prior work is checked and recorded.
- [ ] Fix approach is chosen (locate-the-fence vs. fail-closed) — needs human direction.
- [ ] Scheduling decided — not in SPRINT-39; CR-108 TPV ruled it out of that CR's scope.

**Open question for the human:** fix properly (locate the frontmatter fence wherever it is) or fail
closed for now (detect `<instructions>`, refuse to stamp, exit non-zero with a clear message)? The
second is a few lines and removes the data-loss risk immediately; the first is the real fix. Both
are compatible — fail-closed first is a safe interim.
