---
cr_id: CR-028
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Approved
approved: true
approved_at: 2026-05-02T00:00:00Z
approved_by: sandrinio
created_at: 2026-05-02T00:00:00Z
updated_at: 2026-05-02T00:00:00Z
created_at_version: cleargate@0.6.x
updated_at_version: cleargate@0.6.x
server_pushed_at_version: null
context_source: |
  Conversation 2026-05-02 (continuation of CR-027 thread). User reframed the
  "not recreating" question from planning-artifact duplication (CR-027) to
  code-surface duplication ("we have a function that pulls data from Jira;
  another requirement comes in; AI should reuse + modify, not recreate").
  Sharpened with two further principles: (a) simplicity — Karpathy ethos:
  smallest thing that compounds, dense > sparse, reuse > rebuild; (b) codebase
  is source of truth — wiki/memory/context_source are caches; on conflict, the
  code wins and the cache rebuilds.

  Prior-art audit:
    - CLAUDE.md L109-111: "Triage first" + "Duplicate check before drafting"
      already exists for planning artifacts; says nothing about code surfaces.
    - CLAUDE.md guardrail line: "Before recommending a file/function/flag that
      memory claims exists: verify with Read/Grep" — applies to me, not codified
      as a framework principle.
    - .cleargate/templates/story.md L18-27: Granularity Rubric prevents stories
      that are too BIG; nothing prevents stories that shouldn't EXIST.
    - readiness-gates.md: no `reuse-audit-recorded` or `simplest-form-justified`
      criterion exists today.
    - PROPOSAL-002 / EPIC-002 already cite Karpathy's three-layer wiki pattern;
      this CR extends the same epistemic discipline (caches are derived; source
      is canonical) from planning artifacts to source code.
  This CR encodes a four-layer principle stack as protocol + template +
  predicate edits. No new infra, no new commands, no engine changes.
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T09:58:20Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-028
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-02T09:58:20Z
  sessions: []
---

# CR-028: Code-Truth Triage — Reuse, Right-Size, Justify Complexity

## 0.5 Open Questions

- **Question:** Off-sprint vs sprint-included? Scope is doc/template/protocol edits + 2 predicate-criteria additions using existing predicate shapes — no engine code changes. Precedent: CR-014 shipped off-sprint with similar shape.
  - **Recommended:** off-sprint. Single commit, scaffold-mirror discipline, ~14 files but per-file change is small. Off-sprint gets the principle into the loop immediately; pulling it into a sprint adds 1+ week of latency for zero risk reduction.
  - **Human decision (2026-05-02):** in-sprint — pulled into SPRINT-20 alongside CR-027. Override of recommendation; sprint inclusion gives Architect SDR a chance to refine the §3 templates and ensures the new predicates are exercised against real EPIC-026 / CR-026 / BUG-025 anchors during the same sprint.

- **Question:** Should `simplest-form-justified` apply to Bugs?
  - **Recommended:** no. Bugs target existing behavior; "Why not simpler?" is incoherent there. Apply to Epic + Story + CR only.
  - **Human decision (2026-05-02):** yes (recommendation accepted) — Bugs exempted from `simplest-form-justified`. Apply to Epic + Story + CR only.

- **Question:** `reuse-audit-recorded` predicate shape — strict citation format vs loose section presence?
  - **Recommended:** loose (`body contains '## Existing Surfaces'`). Tighter form (`body matches /grepped: src\/.+:.+/`) creates false negatives during rollout. Tighten in a follow-up CR after measurement.
  - **Human decision (2026-05-02):** agreed — ship loose form (`body contains '## Existing Surfaces'`). Tightening deferred to a follow-up CR once we have failure data.

- **Question:** Capability index (the `.cleargate/wiki/capabilities/` page generated from a TS symbol parser) — file as follow-up CR or out-of-scope entirely?
  - **Recommended:** file as follow-up CR (CR-029-suggested). It's the Karpathy compounding loop applied to code; without it, `reuse-audit-recorded` relies on the agent picking the right grep keywords. But it's a real infra addition (parser + new wiki page type + ingest hook) — too big for this CR.
  - **Human decision (2026-05-02):** yes — file as CR-029-suggested. Out of CR-028 scope; surfaces in SPRINT-21 candidate pool.

- **Question:** Coupling with CR-027 — should this CR also tighten CR-027's `discovery-checked` predicate (require code-grep evidence in `context_source`)?
  - **Recommended:** no. Keep CRs orthogonal. CR-027's `discovery-checked` is "did the agent triage" (planning-artifact layer). CR-028's `reuse-audit-recorded` is "did the agent grep code" (source layer). Different layers, different criteria, no coupling needed.
  - **Human decision (2026-05-02):** ok (recommendation accepted) — CRs stay orthogonal. CR-027 owns planning-artifact discovery; CR-028 owns source-code reuse audit.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- The implicit assumption that the wiki + memory + `context_source` are sufficient evidence of what does/doesn't exist. They are caches. The code is canonical.
- The Story Granularity Rubric in `templates/story.md` (lines 18-27) only catches stories that are too BIG. Nothing prevents stories that shouldn't exist at all (config-change-shaped, parameter-addition-shaped, one-line-edit-shaped).
- The "Duplicate check before drafting" rule in CLAUDE.md scopes the grep target to `.cleargate/delivery/archive/` + `FLASHCARD.md` — the planning-artifact layer only. Code is not in scope.
- The framework has no protocol-level rule that the smallest viable form (config / parameter / extension) must be considered before a new abstraction is drafted.

**New Logic (The New Truth):**

A four-layer principle stack governs every triage and draft. Codified in protocol, encoded in templates, enforced in two new readiness criteria.

**L0 — Code is source of truth.** Wiki, memory, and `context_source` are derived caches. On any conflict between cache and code, the code wins; the cache gets rebuilt. Verify capability claims by grep before stating them.

**L1 — Reuse before rebuild.** Before drafting a work item that names an integration, feature, or capability, grep the source tree for existing implementations. Cite findings in a `## Existing Surfaces` section. If an existing surface covers ≥80% of the requirement, the work item is an extension (CR), not a new build (Story).

**L2 — Right-size at triage.** Before drafting any work item, run the right-sizing rubric: *Could this be a config change? a parameter addition? a one-line edit?* If yes, it's not a Story — it's a PR or a tiny CR. Smallest viable form first.

**L3 — Justify complexity.** Every Epic and Story must include a `## Why not simpler?` section answering: (a) what's the smallest existing surface that could carry this; (b) why isn't extension/parameterization/config sufficient. Forces the agent to articulate the choice instead of defaulting to new abstraction.

Concretely:

- **Protocol** (`cleargate-protocol.md`) gains a new §0 "Code-Truth Principle" paragraph at the top of the document, ahead of Gate definitions, naming L0–L3 in one tight block.
- **CLAUDE.md** (orientation paragraph at lines 109-111) gains one new line between "Triage first" and "Duplicate check": **"Codebase is source of truth."** Before stating that a capability exists or doesn't exist, grep the code. Wiki and memory are caches; on conflict, the code wins and the cache rebuilds.
- **CLAUDE.md** "Duplicate check before drafting" paragraph extends its grep target from `delivery/archive/` + `FLASHCARD.md` to **also include the source tree** when the request names an integration/feature/capability.
- **`templates/story.md`** Granularity Rubric (lines 18-27) gains one new signal at the top: *"Could this be a config change, a parameter addition, or a one-line edit? If yes, this is not a Story — file a CR or submit the PR directly."* Plus a `## Why not simpler?` section template added to §1.
- **`templates/epic.md`** and **`templates/CR.md`** gain the same `## Why not simpler?` section template + a `## Existing Surfaces` section template (the citation surface for L1).
- **`readiness-gates.md`** gains two new criteria:
  - `reuse-audit-recorded` on `epic.ready-for-decomposition`, `story.ready-for-execution`, `cr.ready-to-apply`. Predicate: `body contains '## Existing Surfaces'`.
  - `simplest-form-justified` on `epic.ready-for-decomposition`, `story.ready-for-execution`. Predicate: `body contains '## Why not simpler?'`.
  Bugs are excluded (per §0.5 Q2).
- **No predicate engine changes.** Both new predicates use shape #2 (`body contains "<string>"`) from the closed-set vocabulary in `readiness-gates.md`.

## 2. Blast Radius & Invalidation

- [x] **Pre-existing drafts.** Open Epic/Story/CR drafts in `pending-sync/` lack the new sections. Under v2 they will newly fail `reuse-audit-recorded` + `simplest-form-justified`. Mitigations: (a) v1 mode preserves backwards-compat (warn-only); (b) one-cycle backfill window before promotion to v2; (c) approved + archived items are not re-evaluated.
- [x] **Update Epic:** **EPIC-008** is the parent. Same lineage pattern as CR-008/CR-027 (extends EPIC-008's predicate-engine intent without reactivating the abandoned implementation work).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Push semantics unchanged. CR-010's advisory model unaffected.
- [ ] **Sprint preflight (CR-027) interaction:** if CR-027 has shipped, the new criteria automatically participate in the per-item composite check. No coupling required at the CR-028 layer.
- [ ] **Predicate engine:** no changes (both new criteria use shape #2). Verify during implementation.
- [ ] **FLASHCARD impact:** add card on completion — *"Code-truth principle: wiki/memory/context_source are caches; code is canonical. Before claiming a capability exists, grep. Before drafting, cite existing surfaces in `## Existing Surfaces` + answer `## Why not simpler?`."*
- [ ] **Karpathy alignment:** the four-layer stack is the same epistemic discipline as the LLM-Wiki pattern (raw → wiki → schema; source → cache → derived view). Cite in the protocol §0 paragraph.
- [ ] **Scaffold mirror discipline:** every modified file under `.cleargate/templates/`, `.cleargate/knowledge/`, and `CLAUDE.md` must be byte-equal in the corresponding `cleargate-planning/` mirror. `diff` returns empty.
- [ ] **Capability index** (the wiki-page-of-symbols that would make L1's grep cheap and reliable): explicitly OUT OF SCOPE. Filed as follow-up CR-029-suggested per §0.5 Q4.

## 3. Execution Sandbox

**Modify (protocol — 2 files):**

- `.cleargate/knowledge/cleargate-protocol.md` — insert new §0 "Code-Truth Principle" block at top, ahead of Gate definitions. ≤25 lines naming L0–L3 with one-paragraph rationale citing the Karpathy LLM-Wiki epistemic parallel.
- `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — byte-equal mirror.

**Modify (CLAUDE.md — 2 files):**

- `CLAUDE.md` — insert one new paragraph between L109 ("Triage first") and L111 ("Duplicate check"): **"Codebase is source of truth."** ≤4 lines. Then extend the existing "Duplicate check" paragraph (L111) to add: *"If the request names an integration, feature, or capability, also grep the source tree for existing implementations and cite findings in `## Existing Surfaces`."*
- `cleargate-planning/CLAUDE.md` — same edit at the corresponding L18-20 anchor, byte-equal where the bounded ClearGate block applies.

**Modify (templates — 6 files):**

- `.cleargate/templates/story.md` — extend Granularity Rubric (L18-27) with one new signal at the top: *"Could this be a config change, a parameter addition, or a one-line edit? If yes, this is not a Story — file a CR or submit the PR directly."* Add `## Why not simpler?` and `## Existing Surfaces` section templates to the body skeleton (after §1 Spec, before §2 Truth).
- `.cleargate/templates/epic.md` — add `## Why not simpler?` + `## Existing Surfaces` section templates. Update §0 instructions to reference the new sections.
- `.cleargate/templates/CR.md` — add `## Existing Surfaces` template (CR template already implies "Why not simpler?" through §1 Old vs New, so no separate section needed there).
- `cleargate-planning/.cleargate/templates/story.md` — byte-equal mirror.
- `cleargate-planning/.cleargate/templates/epic.md` — byte-equal mirror.
- `cleargate-planning/.cleargate/templates/CR.md` — byte-equal mirror.

**Modify (readiness gates — 2 files):**

- `.cleargate/knowledge/readiness-gates.md` — append `reuse-audit-recorded` to the criteria lists of `epic.ready-for-decomposition`, `story.ready-for-execution`, `cr.ready-to-apply`. Append `simplest-form-justified` to `epic.ready-for-decomposition` and `story.ready-for-execution`. Both use predicate shape #2: `body contains '## Existing Surfaces'` and `body contains '## Why not simpler?'` respectively.
- `cleargate-planning/.cleargate/knowledge/readiness-gates.md` — byte-equal mirror.

**Modify (tests — 1 file):**

- `cleargate-cli/test/lib/readiness-predicates.test.ts` (or whichever existing test file covers `gate check` against fixture work items) — add 4 vitest scenarios:
  1. Epic with both new sections present → `reuse-audit-recorded` + `simplest-form-justified` pass.
  2. Epic missing `## Existing Surfaces` → `reuse-audit-recorded` fails, `cached_gate_result.failing_criteria` includes the ID.
  3. Story missing `## Why not simpler?` → `simplest-form-justified` fails.
  4. CR with `## Existing Surfaces` present → `reuse-audit-recorded` passes; `simplest-form-justified` is not asserted (CR scope per §1).
- Fixture markdown files under `cleargate-cli/test/fixtures/` for each scenario — minimal frontmatter + body.

**Modify (flashcard — 1 file):**

- `.cleargate/FLASHCARD.md` — append on commit (one line, dated 2026-05-02): *"Code-truth principle: wiki/memory/context_source are caches; code is canonical. Before claiming a capability exists, grep. Drafts cite `## Existing Surfaces` + answer `## Why not simpler?`."*

**File count summary:** 13 files modified (4 protocol/CLAUDE.md mirrors + 6 template mirrors + 2 readiness-gates mirrors + 1 test file). Plus 4 new fixture files. **Zero new commands, zero new infra, zero predicate engine changes.**

**Out of scope:**

- Capability index / `.cleargate/wiki/capabilities/` (TypeScript symbol parser, ingest hook, new wiki page type) — filed as CR-029-suggested.
- Wire-in of the existing `simplify` skill or `code-simplifier` agent at QA gate — separate concern, file as follow-up.
- Tightening `discovery-checked` (CR-027) to require code-grep citation — keep CRs orthogonal per §0.5 Q5.
- Migration of pre-existing drafts to satisfy the new sections — left to the natural backfill cycle; v1 mode warns-only.

## 4. Verification Protocol

**Acceptance:**

1. **Protocol §0 in place.** `grep -A20 "Code-Truth Principle" .cleargate/knowledge/cleargate-protocol.md` returns the four-layer block. Mirror diff returns empty.
2. **CLAUDE.md updated.** `grep "Codebase is source of truth" CLAUDE.md cleargate-planning/CLAUDE.md` returns one match each. Both files byte-equal in the bounded block.
3. **Templates expose new sections.** Drafting a new Epic from `.cleargate/templates/epic.md` produces a file containing both `## Why not simpler?` and `## Existing Surfaces` headings.
4. **Readiness gates fire.** Author a fixture Epic missing both sections. Run `cleargate gate check <fixture>`. Assert exit 1, `cached_gate_result.failing_criteria` includes both `reuse-audit-recorded` and `simplest-form-justified`.
5. **Restoration unblocks.** Add both sections to the fixture. Re-run gate check. Assert exit 0, `cached_gate_result.pass=true`.
6. **No predicate-engine regression.** Existing `npm test` suite for `readiness-predicates.test.ts` stays green; only new cases added.
7. **Bug template exemption.** Author a fixture Bug. Run `cleargate gate check`. Assert `simplest-form-justified` is NOT in evaluated criteria (Bug excluded per §1).
8. **Scaffold mirror discipline.** All `diff` pairs (4 protocol + 6 template + 2 readiness-gates) return empty.

**Test commands:**

- `cd cleargate-cli && npm run typecheck && npm test` — green.
- `cd cleargate-cli && npm test -- readiness-predicates` — focused.
- `for f in CLAUDE.md .cleargate/knowledge/cleargate-protocol.md .cleargate/knowledge/readiness-gates.md .cleargate/templates/{story,epic,CR}.md; do diff "$f" "cleargate-planning/$f" || echo "MIRROR DRIFT: $f"; done` — returns empty.
- Manual smoke: draft a fixture Epic in a scratch dir; observe `cleargate gate check` output before + after adding both new sections.

**Pre-commit:**

- `npm run typecheck` clean.
- `npm test` green.
- All scaffold mirror diffs empty.
- Both protocol files byte-equal.
- One commit, conventional format: `feat(CR-028): off-sprint — code-truth triage (reuse + right-size + justify-complexity)`.
- Never `--no-verify`.

**Post-commit:**

- Move `.cleargate/delivery/pending-sync/CR-028_*.md` to `.cleargate/delivery/archive/`.
- Append flashcard line.
- Wiki re-ingest (PostToolUse hook handles automatically).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — Ready for Sprint Execution (SPRINT-20)**

Requirements to pass to Green (Ready for Execution):

- [x] "Obsolete Logic" to be evicted is explicitly declared (cache-as-truth assumption; right-sizing absence; planning-only grep scope).
- [x] All impacted downstream items identified (no Story/Epic invalidation; pre-existing drafts may newly fail under v2 — intended one-cycle backfill signal).
- [x] Execution Sandbox contains exact file paths with anchors (CLAUDE.md L109-111; story.md L18-27).
- [x] Verification command provided with 8 acceptance scenarios.
- [x] §0.5 Q1 resolved 2026-05-02 — in-sprint (SPRINT-20), override of off-sprint recommendation.
- [x] §0.5 Q2 resolved 2026-05-02 — Bug exempted from `simplest-form-justified`.
- [x] §0.5 Q3 resolved 2026-05-02 — loose predicate form (`body contains '## Existing Surfaces'`).
- [x] §0.5 Q4 resolved 2026-05-02 — capability index filed as CR-029-suggested follow-up.
- [x] §0.5 Q5 resolved 2026-05-02 — orthogonal to CR-027 (no coupling).
- [x] `approved: true` is set in the YAML frontmatter.
