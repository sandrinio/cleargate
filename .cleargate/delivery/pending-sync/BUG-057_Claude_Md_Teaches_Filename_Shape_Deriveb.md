---
bug_id: BUG-057
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — discovered while scoping STORY-054-03's Route A correction (SPRINT-39 wave 5); measured against the live delivery tree and the compiled wiki; no prior approval, filed for triage
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: afdf7feb-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: false
  failing_criteria:
    - id: repro-steps-deterministic
      detail: section 2 has 1 declared-item (≥3 required)
  last_gate_check: 2026-08-28T21:15:41Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-057: CLAUDE.md teaches a draft filename shape that deriveBucket cannot key

## 1. The Anomaly (Expected vs. Actual)

> **CITATION RENUMBERING (orchestrator, 2026-08-29, per M3 `## Cross-story risks` item 2 and
> Open decision 5).** [[CR-105]] relocated the bounded block in root `CLAUDE.md` from lines 129-186
> to lines 1-58, which renumbered every line of this repo's own prose below it. The lines this Bug
> cites did not change content; only their offsets moved. **`CLAUDE.md:162` -> `:34`** (the
> `{TYPE}-{ID}-{Name}.md` save-path instruction) and **`CLAUDE.md:161` -> `:33`** (the template
> list). Both citations have been updated in place throughout this file. The canonical mirror
> `cleargate-planning/CLAUDE.md` was NOT relocated -- it is the injection spec, and its equivalents
> remain at `:40` and `:39`. Verified by grep after the relocation commit `71037e5`.
> One stale citation is knowingly left standing: FLASHCARD card `2026-08-28 #id-parsing #danger`
> still reads `CLAUDE.md:162`. `FLASHCARD.md` is an append-only dated log and rewriting a past
> entry is worse than a dead offset; the card's lesson is the `deriveBucket` mismatch, not the line.

`CLAUDE.md:34` instructs every drafting agent:

> - Save drafts to `.cleargate/delivery/pending-sync/{TYPE}-{ID}-{Name}.md`.

That shape separates the id from the slug with a **hyphen**. `deriveBucket`
(`cleargate-cli/src/wiki/derive-bucket.ts:63-66`) derives the work-item id as
*everything before the first underscore*, falling back to the entire stem when
there is no underscore:

```ts
const underscoreIdx = stem.indexOf('_');
const id = underscoreIdx === -1 ? stem : stem.slice(0, underscoreIdx);
```

**Expected:** a file named per `CLAUDE.md:34` ingests to `wiki/<bucket>/<ID>.md`.

**Actual:** it ingests to `wiki/<bucket>/<ENTIRE-STEM>.md`. The prefix match still
succeeds, so the bucket is right and **nothing errors** — the page is simply keyed
on a string no `[[ID]]` wikilink, `wiki query`, or lint cross-check will ever
resolve.

The de-facto convention in the tree is `{ID}_{SLUG}.md` (underscore), which
`deriveBucket` keys correctly. `CLAUDE.md:34` documents a third shape that
matches neither the code nor the corpus.

## 2. Reproduction Protocol

```bash
# 1. The instruction
grep -n 'Save drafts to' CLAUDE.md

# 2. The corpus: underscore vs not, across pending-sync + archive
ls .cleargate/delivery/{pending-sync,archive}/*.md | xargs -n1 basename \
  | awk '{ if ($0 ~ /^[A-Z]+-[0-9]+(-[0-9]+)?_/) u++; else h++ }
         END { print "underscore:", u; print "not:", h }'
#   underscore: 466
#   not:         24

# 3. The already-manifested damage
ls .cleargate/wiki/*/ | grep -E '^[A-Z]+-[0-9]+-[A-Za-z]'
#   BUG-035-MCP-Test-Isolation-FK-Race.md
#   CR-083-Document-Connection-Identity-Routes-OpenAPI.md
#   CR-084-Sprint-Dashboard-In-CLI-Payload.md
#   CR-085-Drive-Execution-Loop-States-Live.md

# 4. The consequence: BUG-035 has no page under its own id
ls .cleargate/wiki/bugs/ | grep -x 'BUG-035.md' || echo 'NO PAGE for BUG-035'
```

## 3. Evidence & Context

- **24 of 490** authored work items do not use the underscore separator.
- **4 wiki pages are already mis-keyed** and were compiled that way silently.
- `BUG-035` has **no** `wiki/bugs/BUG-035.md`. Every `[[BUG-035]]` reference in
  the wiki is unresolvable, and the duplicate-check step in CLAUDE.md — which
  dispatches `cleargate-wiki-query` before drafting — cannot surface it by id.
- Only `.cleargate/templates/spike.md:30` (new in [[STORY-054-01]]) states an
  output-location convention at all, and it correctly says `{ID}_{SLUG}.md`.
  No other template names one, so `CLAUDE.md:34` is the sole guidance the
  other nine types get.
- Failure mode is **silent**: the prefix match succeeds, the bucket resolves,
  ingest exits 0. This is the same shape as [[BUG-042]] — a derived value that
  is wrong rather than absent, so nothing raises.

## 4. Execution Sandbox (Suspected Blast Radius)

- `CLAUDE.md` + `cleargate-planning/CLAUDE.md` (the instruction itself).
- `cleargate-cli/src/wiki/derive-bucket.ts` (read-only — the code is correct;
  it is the doc that is wrong).
- Optional remediation: rename the 24 non-conforming files and recompile, or
  accept them and pin the convention with a lint check.

## 5. Verification Protocol (The Failing Test)

A test asserting that every file under `.cleargate/delivery/{pending-sync,archive}/`
has a stem whose `deriveBucket(...).id` round-trips to a bare work-item id —
i.e. `id` matches `^[A-Z]+-\d+(-\d+)?$`. It fails on 24 files today.

## Prior work

- [[BUG-042]] — same silent-wrong-derived-value class.
- [[BUG-051]] — work-item registries drifted; this is the same drift between a
  documented convention and the code that consumes it.
- [[STORY-054-01]] — introduced the only template that states the convention correctly.
- [[STORY-054-03]] — surfaced this while routing `spike.md` into the same list.
- No prior item covers the draft-filename convention.

## Context Source

Discovered 2026-08-27 while scoping the Route A correction to STORY-054-03,
after the Architect post-flight found `CLAUDE.md:33` omitted `spike.md`.
Deliberately **not** folded into STORY-054-03: that story's surface is spike
doctrine, while this defect predates it and affects all ten drafting types.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] Remediation of the 24 existing files decided (rename-and-recompile vs accept-and-lint).
- [ ] `approved: true` is set in the YAML frontmatter.
