---
cr_id: CR-109
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: verified codebase grounding (5 writers of cached_gate_result; template frontmatter inventory) + design conversation 2026-08-26
created_at: 2026-08-26T00:00:00Z
updated_at: 2026-08-25T20:57:31Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
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
  last_gate_check: 2026-08-25T20:57:31Z
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

# CR-109: Machine fields move out of the work-item document

> **Not scheduled for SPRINT-39.** Drafted to record the decision; sequenced after [[CR-108]]. See §0.5.

## 0.5 Open Questions

- **Question:** Should this run in SPRINT-39?
- **Recommended:** No. It touches all nine templates, five `cached_gate_result` writers, the wiki ingest path, and the push/pull sync stamps — while SPRINT-39 already has four items contending on `readiness-gates.md` and two more on `CLAUDE.md`. [[CR-108]] delivers most of the practical benefit (machine fields stop being *hand-written*) without moving a single field, and is the natural predecessor.
- **Human decision:** Deferred — recorded 2026-08-26.

- **Question:** Does the sidecar break `cleargate push`, which sends the document to the MCP server?
- **Recommended:** Push must merge sidecar + document before transmitting, so the remote payload is unchanged. This is the single highest-risk part of the change and needs its own story.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that a work item is one file.** Work-item frontmatter today mixes human-authored intent (`status`, `area`, `parent_ref`, `context_source`) with machine-maintained bookkeeping (`cached_gate_result`, `synced_at`, `remote_id`, `updated_at`, `updated_at_version`, `server_pushed_at_version`, `draft_tokens`, `pushed_by`, `pushed_at`, `last_pulled_by`, `last_pulled_at`, `last_remote_update`, `last_synced_status`, `last_synced_body_sha`). Fourteen of the ~20 frontmatter keys on a CR are machine-owned.

**New Logic (The New Truth):**

- **The markdown file is human truth. A sidecar holds machine truth.** `.cleargate/delivery/.meta/<ID>.json` carries the machine-owned keys; the document keeps only what a human writes or reads.
- **Three problems close at once.** (1) Work-item diffs stop being polluted with machine churn, so a reviewer can see what a human actually changed. (2) `cached_gate_result` can keep *history* instead of only the last check — currently every gate run overwrites the previous verdict, which is odd given gates are the enforcement story. (3) Machine writes and human edits stop colliding on one file — the same defect class as [[CR-106]]'s `state.json` race, currently invisible only because planning edits happen at conversational speed with one writer.
- **The affordance is preserved deliberately.** The human-editable markdown work item is why ClearGate works; this CR must not event-source it or hide it behind tooling. Contrast with [[CR-106]], where the surface is machine-written end-to-end and an event log is therefore correct.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update: all nine templates + nine canonical mirrors.
- [ ] Invalidate/Update: five `cached_gate_result` writers — `gate.ts`, `sprint.ts`, `doctor.ts`, `frontmatter-cache.ts`, `wiki/lint-checks.ts`.
- [ ] Invalidate/Update: `cleargate push` / `cleargate pull` sync stamps; the wiki ingest path; readiness predicates that read frontmatter.
- [ ] Database schema impacts? **No** locally. **Remote payload must be unchanged** — see §0.5 open question.
- [ ] Migration required for every existing item in `pending-sync/` + `archive/` (~150+ files).
- [ ] Conflicts with [[EPIC-052]] and SPRINT-39 `STORY-054-06`, both of which edit template structure. Must not run in an overlapping sprint.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/frontmatter-cache.ts` — existing frontmatter read/cache layer; the natural home for a sidecar-aware merged read.
- **Surface:** `cleargate-cli/src/commands/gate.ts`, `sprint.ts`, `doctor.ts` — the three command-level writers of `cached_gate_result`.
- **Surface:** `cleargate-cli/src/wiki/lint-checks.ts` — reads `cached_gate_result` during lint.
- **Surface:** `cleargate-cli/src/lib/stamp-frontmatter.ts:94-119` — owns five of the machine keys already; becomes the sidecar writer.
- **Why this CR extends rather than rebuilds:** `frontmatter-cache.ts` already centralizes frontmatter reads, so a merged document+sidecar view has one insertion point rather than N. `stamp-frontmatter.ts` already owns a subset of the machine keys and already knows canonical key ordering. The change is relocating fields these modules already manage, not introducing a new persistence concept.

## Prior work

- `cleargate wiki query "frontmatter machine fields sidecar"` → **none found**.
- [[CR-106]] — the same machine/human boundary applied to execution state. That CR chose an event log because the surface is machine-written end-to-end; this CR chooses a sidecar because the surface is human-authored. Sibling decisions from one principle.
- [[CR-108]] — establishes *who writes* the machine fields. Predecessor; delivers most of the benefit without relocation.
- [[BUG-042]] (SPRINT-39) — gate index drift; adjacent to gate-result handling but does not touch frontmatter storage.

## 3. Execution Sandbox

**Modify:** `cleargate-cli/src/lib/frontmatter-cache.ts`, `stamp-frontmatter.ts`, `commands/{gate,sprint,doctor,push,pull}.ts`, `wiki/lint-checks.ts`, all nine templates + mirrors.
**Create:** `.cleargate/delivery/.meta/` + a migration script.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`

1. Merged read returns a frontmatter view identical to today's for every existing item.
2. `cleargate push` payload is byte-identical pre/post migration.
3. Migration is idempotent and reversible.
4. A work item with a missing sidecar degrades to document-only, never throws.
5. Gate history accumulates rather than overwrites.

---

## Context Source

**context_source:** Verified codebase grounding — five `cached_gate_result` writers enumerated by grep; frontmatter key inventory taken from `.cleargate/templates/CR.md`. Design conversation 2026-08-26, in which the machine/human field boundary was derived independently from two directions (write-collision and token cost).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> 🟡 not 🟢: the §0.5 push-payload question is unresolved. Deliberately not scheduled.

> **Gate 1 sign-off: approved 2026-08-26** by sandrinio. Status stays 🟡: approval authorizes the work, it does not answer the open design question above. The gate's sentinel token in that answer line is load-bearing and must stay until a real answer replaces it.
