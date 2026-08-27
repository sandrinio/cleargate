---
cr_id: CR-110
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
approved: true
context_source: verified codebase grounding (SKILL.md A.5 surfaces the goal but never asks how it is verified; sprint_context.md §Sprint Goal is prose-only; reporter verdict met/partial/missed is a judgement with nothing to check against; close_sprint.mjs:295 validates only §3 process-metric ROWS EXIST, never declared outcome targets) + recorded direct approval 2026-08-25
created_at: 2026-08-25T22:10:31Z
updated_at: 2026-08-25T22:10:31Z
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
  last_gate_check: 2026-08-25T22:10:32Z
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

# CR-110: The sprint goal gets an acceptance check, and the Orchestrator holds it

## 0.5 Open Questions

- **Question:** What happens when a sprint goal has no mechanical check?
- **Recommended:** Record `goal_check: not-mechanically-verifiable` plus the qualitative evidence that will stand in (walkthrough outcome, stakeholder confirmation). This is an explicit, valid outcome — **not** a gate failure. Forcing a synthetic metric onto a qualitative goal produces a number nobody believes and a gate nobody trusts.
- **Human decision:** Explicit not-verifiable is valid — recorded 2026-08-25.

- **Question:** Does a missing goal check block `sprint init`?
- **Recommended:** No. It emits a one-line advisory and init proceeds, matching how `sprint_context.md` §Test Stack already degrades ("test_stack unresolved — … treats the typecheck/test gate as advisory"). A new hard block at kickoff would strand every existing sprint plan.
- **Human decision:** Advisory, not blocking — recorded 2026-08-25.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Forget that surfacing the goal is sufficient.** `SKILL.md` §A.5 instructs the Orchestrator to surface the sprint goal verbatim and treat it as the acceptance condition. It never asks **how the goal will be verified**. The goal therefore enters execution as prose and stays prose.
- **Forget that the close verdict is an evaluation.** The Reporter returns `met | partial | missed` (`SKILL.md` §E.2). With no recorded check, that verdict is a judgement call with nothing to check against — and it is explicitly advisory, so nothing depends on it being right.
- **Forget that declared metrics are consumed.** A sprint plan's §0 Metrics line is falsifiable and machine-shaped — SPRINT-39 declares `gated section(N) criteria resolving to their named heading 9/12 → 12/12`. Nothing reads it. `close_sprint.mjs:295` validates that the *Reporter's* §3 process-metric **rows are present** (bug-fix tax, first-pass rate); it never evaluates the sprint's declared outcome targets. Declared intent is write-only.
- **Forget that the Orchestrator's goal anchor is durable.** Every sub-agent re-reads `sprint-context.md` cold on each dispatch. The Orchestrator holds the goal only in conversation context, which compacts across a long sprint. It is the single participant whose anchor is volatile.

**New Logic (The New Truth):**

- **Every sprint records a goal acceptance check at kickoff.** `sprint-context.md` gains `## Goal Acceptance Check` beside `## Sprint Goal`: the concrete condition that is true when the goal is met. Derived by the Orchestrator at §A.5, confirmed by the human at the same halt that already confirms the sprint plan.
- **The check is either mechanical or explicitly not.** A named command, artifact, or observable state — or the literal token `not-mechanically-verifiable` plus the qualitative evidence standing in for it. Both are valid; silence is not.
- **The Orchestrator re-reads it at every phase boundary**, from the same file the agents read. One source of truth, compaction-proof.
- **The Reporter's verdict reads the check instead of judging.** `met` means the recorded check passed; `partial`/`missed` name which part did not. The verdict stays advisory — it becomes better-grounded, not newly blocking.
- **The forcing function is the point.** A goal for which no check can be stated is usually a goal too vague to execute against. Discovering that at kickoff is cheap; discovering it at close is not.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update: `SKILL.md` §A.5 (derive + record the check), §0.5 (Orchestrator re-reads at phase boundaries), §E.2 (verdict reads the check).
- [ ] Invalidate/Update: `.cleargate/templates/sprint_context.md` — new `## Goal Acceptance Check` section.
- [ ] Invalidate/Update: `.cleargate/scripts/init_sprint.mjs` — render the new section, emit the advisory when unpopulated.
- [ ] Invalidate/Update: `.claude/agents/reporter.md` — verdict derivation.
- [ ] Database schema impacts? **No.**
- [ ] **Backward compatibility:** every existing sprint plan lacks a goal check. Init must degrade to the advisory path, never fail. Closed sprints are untouched.
- [ ] **Interaction with [[CR-107]] and [[BUG-046]]** — all three edit `SKILL.md`. Different sections; ordering recorded in the sprint's §2.2.
- [ ] **Interaction with [[CR-106]]** — both edit `init_sprint.mjs`. 106 seeds `events.jsonl`; this renders a template section. Disjoint regions, ordering still recorded.

## Existing Surfaces

- **Surface:** `.claude/skills/sprint-execution/SKILL.md` §A.5 — surfaces the goal verbatim at kickoff. Extended with the derive-and-record step; the existing halt is reused as the confirmation point, so no new gate is introduced.
- **Surface:** `.claude/skills/sprint-execution/SKILL.md` §0.5 Goal-First Execution — already names five goal touchpoints. This CR gives those touchpoints something concrete to reference.
- **Surface:** `.cleargate/templates/sprint_context.md` `## Sprint Goal` — the existing per-sprint goal carrier that every Dev/QA/Architect/DevOps dispatch already reads as preflight. The check lives beside it, reusing that propagation path rather than inventing one.
- **Surface:** `.cleargate/scripts/init_sprint.mjs` — already renders `sprint-context.md` from the template and already extracts the goal from sprint plan §0.
- **Surface:** `.cleargate/templates/sprint_context.md` §Test Stack — the established precedent for "unresolved → one-line advisory, gate degrades to advisory, never blocks." The degradation path is copied from it verbatim.
- **Surface:** `.claude/agents/reporter.md` §E.2 verdict — exists; changes input from judgement to recorded check.
- **Why this CR extends rather than rebuilds:** the goal already has a home (`sprint-context.md`), a populator (`init_sprint.mjs`), a propagation path (every agent's preflight read), and a consumer (the Reporter verdict). All four stay. What is added is one section and the requirement that it be filled — the smallest change that turns a prose goal into a checkable one. A new gate, a new artifact, or a metrics engine would each be a larger mechanism than the problem needs.

## Prior work

- `cleargate wiki query "sprint goal acceptance check testable"` → **none found**.
- [[CR-106]] — shares `init_sprint.mjs`. Ordering recorded in the sprint's §2.2.
- [[CR-107]], [[BUG-046]] — share `SKILL.md`. Different sections; ordering recorded.
- [[EPIC-056]] — CI verification layer. Adjacent: this CR asks *whether the goal is verifiable*, EPIC-056 supplies environment-independent verification. Neither depends on the other.
- SPRINT-39's own DoD already carries the testable form of its goal (`A SPIKE-NNN document can be drafted, gate-checked, and ingested into wiki/spikes/`) — sitting unlabelled among nine sibling checkboxes. That line is the worked example this CR generalises.

## 3. Execution Sandbox

**Modify:**
- `.claude/skills/sprint-execution/SKILL.md` — §A.5, §0.5, §E.2.
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` — canonical mirror.
- `.cleargate/templates/sprint_context.md` — new section.
- `cleargate-planning/.cleargate/templates/sprint_context.md` — canonical mirror.
- `.cleargate/scripts/init_sprint.mjs` — render + advisory.
- `cleargate-planning/.cleargate/scripts/init_sprint.mjs` — canonical mirror.
- `.claude/agents/reporter.md` — verdict derivation.
- `cleargate-planning/.claude/agents/reporter.md` — canonical mirror.

**Do NOT modify:** `close_sprint.mjs` (the verdict stays advisory — this CR does not make close depend on it), the readiness gates, or the §0 Metrics line's format.

## 4. Verification Protocol

**Command/Test:** `bash .cleargate/scripts/test/cr078_init.test.sh` + `npm --prefix cleargate-cli test`

1. **The failing case.** `init_sprint.mjs` renders `## Goal Acceptance Check` into `sprint-context.md`. **Must fail against the current tree** — the section does not exist today.
2. A sprint plan with no derivable check → init emits the one-line advisory and **exits 0**. Backward-compat guard for every existing plan.
3. The literal token `not-mechanically-verifiable` is accepted as a populated check, not treated as unpopulated.
4. `sprint-context.md` remains readable by the existing Dev/QA/Architect/DevOps preflight path — no parse regression.
5. Reporter emits `met` only when the recorded check is satisfied; `partial`/`missed` name the unmet part.
6. Existing `cr078_init.test.sh` cases stay green.

**Parity check:** all four modified files diff clean against their `cleargate-planning/` mirrors.

---

## Context Source

**context_source:** Verified codebase grounding — `SKILL.md` §A.5/§0.5/§E.2 read directly; `sprint_context.md` template and SPRINT-38's rendered copy confirm the goal propagates to agents but not to the Orchestrator; `close_sprint.mjs:295` confirmed to validate Reporter §3 row presence only. Direct approval recorded 2026-08-25 in the design conversation, framed by the human as: the Orchestrator must hold a goal to deliver the sprint goal and make sure it is testable where applicable.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. — none invalidated; three shared-file orderings recorded in §2 and the sprint's §2.2.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

> **Gate 1 sign-off: approved 2026-08-25** by sandrinio.
