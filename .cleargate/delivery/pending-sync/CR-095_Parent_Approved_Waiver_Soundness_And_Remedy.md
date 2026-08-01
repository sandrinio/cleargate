---
cr_id: CR-095
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
area: cli
context_source: verified codebase grounding — reproduced against EPIC-027/030/046/047 in this repo plus a synthetic empty-waiver probe; root-caused to readiness-predicates.ts evalFrontmatter and gate.ts OR-group assembly
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T08:00:37Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-095
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T08:00:37Z
  sessions: []
---

# CR-095: parent-approved — Waiver Soundness and a Remedy You Can Act On

## 0.5 Open Questions

- **Question:** Should `context_source` carry double duty — prose discovery-audit text for `discovery-checked`, and a resolvable document path for `parent-approved`?
- **Recommended:** Out of scope here, but worth a decision. The templates ship `context_source` as prose ("approved Epic / verified codebase grounding + recorded direct approval") while `parent-approved` reads it as a path. The prose-vs-path heuristic exists precisely to straddle that, and every item hitting this gate pays for the ambiguity. A dedicated `parent_ref_path` key would remove the guess entirely. Not changed here because it is a schema change across every template and every archived item.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Forget that the presence of a `proposal_gate_waiver` key is evidence of an approval. `String({})` is `'[object Object]'` — non-empty and not `'false'` — so the truthiness test granted the waiver to an empty mapping.
- Forget that a prose `context_source` leaves only the waiver route. It does not. The gate doc's `<ref>` definition — "a frontmatter key whose value is a relative path to another document" — is the primary route, and the failure message never said so.

**New Logic (The New Truth):**
- An **object-shaped** `proposal_gate_waiver` is valid only when it carries a non-empty `approved_by` **and** `approved_at`. A **scalar** waiver keeps its previous truthiness behaviour — it cannot be present and empty at the same time.
- The prose failure names all three routes: point the ref at the parent document as a relative path; record `proposal_gate_waiver` with `approved_by` + `approved_at`; or set top-level `approved_by` + `approved_at`.
- OR-group alternatives that failed for the same reason collapse onto one line naming both criteria.

**The failure this fixes.** `parent-approved` is an or_group over `parent-approved-proposal` (`frontmatter(context_source).approved == true`) and `parent-approved-initiative` (`frontmatter(context_source).status == 'Triaged'`). Both read the same ref. When `context_source` is prose, both fell to the same fallback and emitted the same sentence, and that sentence named only the waiver. An epic whose parent Initiative is on disk and already `status: Triaged` — exactly what `parent-approved-initiative` asks for — therefore reads as having no route forward, because the one route that applies is the one the message omits. Separately, the waiver check itself was unsound: it accepted an empty object.

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update CR: [[CR-093]], [[CR-094]] — siblings from the same review pass; independent, land together.
- [ ] Invalidate/Update Bug: [[BUG-008]] — authored the prose-vs-path heuristic and the waiver signals. Not reverted: the heuristic stands, and its R-08 regression guarantee (a path-like value pointing at a missing file must still fail) is asserted unchanged.
- [ ] Database schema impacts? **No.** Two expressions and their detail strings.

**Downstream risk.**
- **Items relying on an empty or malformed waiver will start failing.** This is the point of the change, but it is the one behaviour that gets stricter, so it can surface newly-blocked items. A `grep` for `proposal_gate_waiver` across `.cleargate/delivery/**` in this repo finds only EPIC-027, whose waiver is properly filled and which still passes — verified.
- Items already passing via top-level `approved_by` + `approved_at`, or via a filled waiver mapping, are unaffected.
- The new failure text is longer. It is one line per distinct reason rather than one per alternative, so for `parent-approved` the total output is shorter than before.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts` — `evalFrontmatter`, the prose-vs-path branch: the waiver truthiness test and the failure detail. Both changed.
- **Surface:** `cleargate-cli/src/commands/gate.ts:261` — OR-group failure assembly; now groups alternatives by identical detail.
- **Surface:** `.cleargate/knowledge/readiness-gates.md:12` — the `<ref>` definition the new message now surfaces to the author; unchanged, it was already correct.
- **Surface:** `.cleargate/knowledge/readiness-gates.md:78-83` — the `parent-approved` or_group; unchanged.
- **Why this CR extends rather than rebuilds:** BUG-008's prose-vs-path heuristic is the right shape and its regression guarantee is worth keeping — a path-like value that resolves to nothing must still fail, waiver or not. The defects are narrower than the design: one unsound truthiness test, one incomplete message, one duplicated line. Replacing the heuristic would re-open R-08.

## Prior work

- [[BUG-008]] — introduced the prose-vs-path heuristic and both waiver signals; this CR hardens one and rewrites the other's message.
- [[CR-030]] — introduced the OR-group evaluator whose failure assembly is deduped here.
- [[CR-093]], [[CR-094]] — the other two defects from this review pass. All three are the same family: a check that decided the wrong thing without explaining itself.
- No prior item addresses waiver-object validation or remedy discoverability in gate output.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — validate object-shaped waivers on `approved_by` + `approved_at`; rewrite the prose failure detail to name all three routes.
- `cleargate-cli/src/commands/gate.ts` — group OR-group alternatives by identical detail.
- `cleargate-cli/test/lib/readiness-predicates.node.test.ts` — four regression tests plus one assertion added to the existing R-08 prose-without-waiver test.
- `cleargate-cli/CHANGELOG.md` — Unreleased entry.

## 4. Verification Protocol

**Command/Test:** `cd cleargate-cli && npm run typecheck && npm test`

- Targeted suite: **106 pass / 0 fail**, including every BUG-008 R-08 regression test unchanged.
- Live corpus, rebuilt binary:
  - `EPIC-027` (filled waiver mapping) → `✅ epic.ready-for-coding passed (6 criteria)` — no regression.
  - `EPIC-046` (prose, no waiver) → one deduped line naming both criteria and all three remedies.
  - Synthetic `proposal_gate_waiver: {}` probe → `parent-approved` now **fails**; before this change it passed.
- Old logic evicted: the empty-object probe is the direct assertion; `CR-095: proposal_gate_waiver: {} does NOT grant the waiver` encodes it.

---

## Context Source

**context_source:** verified codebase grounding. Defect reported from a live session and reproduced here against EPIC-027/030/046/047 plus a synthetic empty-waiver probe. Root-caused to `evalFrontmatter`'s waiver truthiness test and failure detail, and to the OR-group assembly in `gate.ts`. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — promoted from 🟡 at Gate 1**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.
