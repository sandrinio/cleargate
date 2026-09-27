---
bug_id: BUG-115
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: sprint-execution
status: Triaged
severity: P3-Low
reporter: orchestrator (SPRINT-41 Codex dogfood run r8, issue I26)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood r8 (issues.md I26); verified codebase grounding at cli main 0e5b0ac: scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md:679-690 (§D.5.1 'Invoke the code-simplifier agent (/simplify)'); scaffold/hosts/claude/.claude/agents/ has no code-simplifier role (it is a separate Claude Code plugin)"
created_at: 2026-09-27T08:58:00Z
updated_at: 2026-09-27T08:58:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-27T09:01:07Z
  transition: ready-for-fix
---

# BUG-115: Consolidation (§D.5.1) requires a `code-simplifier` agent that ClearGate does not install

### Open Questions

- **Question:** Ship a consolidation role, or name a fallback?
- **Recommended:** Name a fallback. §D.5.1 says to use `code-simplifier` when that agent is installed, and otherwise to dispatch the Developer in Consolidation mode with the same inputs (the full sprint diff) and the same constraints (one commit on `sprint/S-NN`, no red-test edits). `developer.md` gains a short Consolidation-mode paragraph mirroring `qa.md`'s Consolidation-mode dispatch.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** Every role the playbook dispatches exists in a ClearGate install, on any host.

**Actual Behavior:** §D.5.1 says "Invoke the `code-simplifier` agent (`/simplify`)". That agent comes from a separate Claude Code plugin, not from `cleargate init`. It is absent on Codex, and on Claude installs without the plugin. Codex r8: "The configured `code-simplifier` role is absent. A Developer-role substitute performed the mandatory consolidation review."

## 2. Reproduction Protocol
1. `ls scaffold/hosts/claude/.claude/agents/` → no `code-simplifier`.
2. `sed -n '679,690p' scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` → it requires `code-simplifier`.

Edge conditions:
- On a Claude install with the plugin, the plugin path still works.
- The red-test immutability check in §D.5.1 applies to the fallback too.

## 3. Evidence & Context
```
Codex r8 final report: "The configured `code-simplifier` role is absent. A Developer-role substitute performed the mandatory consolidation review; no safe change was found, and independent QA passed 18/18."
SKILL.md:681  Invoke the `code-simplifier` agent (`/simplify`) against the full sprint diff:
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- SKILL.md §D.5.1 (upstream BUG-103); `developer.md` Consolidation-mode paragraph; then `npm run gen:codex`.
- Tests beside the skill-drift tests.

**Do NOT modify:** §D.5.2 QA Consolidation mode.

## Task Breakdown
- [ ] QA-Red: §D.5.1 names the Developer Consolidation-mode fallback; developer.md defines it; the Codex renders match
- [ ] Edit SKILL.md and developer.md, then gen:codex
- [ ] Typecheck, targeted tests

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scaffold/consolidation-fallback.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Plugin agent present vs the Developer fallback |
| Interfaces | T | The skill and the role file |
| Data | F | No data variation |
| Rules | F | The existing immutability rule is unchanged |

```gherkin
Feature: Consolidation runs on every install

  @paths @interfaces
  Scenario: The skill names a fallback
    Then SKILL.md §D.5.1 dispatches the Developer in Consolidation mode when code-simplifier is not installed

  @interfaces
  Scenario: The Developer defines Consolidation mode
    Then developer.md and the generated developer.toml define Consolidation mode: the sprint diff, one commit on sprint/S-NN, no red-test edits
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | text assertions |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | DT re-run |

---

## Prior work

- [[BUG-103]]: the SKILL.md drift batch this edit sits on; none found for the consolidation role itself.

## Context Source

**context_source:** Codex dogfood r8 (2026-09-27, issues.md I26); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
