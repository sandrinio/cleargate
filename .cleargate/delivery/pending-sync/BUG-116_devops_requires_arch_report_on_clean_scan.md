---
bug_id: BUG-116
parent_ref: EPIC-058
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-41
carry_over: false
area: sprint-execution
status: Triaged
severity: P3-Low
reporter: orchestrator (SPRINT-41 Codex dogfood run r8, issue I27)
approved: true
approved_by: "sandrinio (SPRINT-41 directives: 'log every issue you find and fix them'; 2026-09-27 'you watch and file all issues, then fix and then use codex to test again'; 'you respond as an owner'); filed by the orchestrator per plans/M7.md §8.4"
approved_at: 2026-09-27T08:58:00Z
context_source: "Codex dogfood r8 (issues.md I27); verified codebase grounding at cli main 0e5b0ac: scaffold/hosts/claude/.claude/agents/devops.md:48,:100 (arch report required for every standard-lane story) vs SKILL.md:489-494,:508,:540 (post-flight scan-gated; arch report absent on a clean scan)"
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

# BUG-116: DevOps halts on a missing Architect report that the skill says a clean-scan story never has

### Open Questions

- **Question:** Which text is right?
- **Recommended:** The skill (scan-gated post-flight, CR-080's cost rule). `devops.md` requires `STORY-ID-arch.md` only when the pre-gate scan flagged, matching SKILL.md :508 and :540 word for word. The orchestrator's DevOps brief states `post-flight: clean scan (no arch report)` or `post-flight: arch report <path>`.
- **Human decision:** Recommended option taken by the orchestrator acting as owner (2026-09-27 "you respond as an owner"). The owner may overrule at the next check-in.

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** DevOps's precondition check agrees with the playbook's report inventory.

**Actual Behavior:** `devops.md` says "Required for standard-lane only: `ls …/STORY-NNN-NN-arch.md`", and "If any required report is missing: write a blockers report and halt." SKILL.md §C.6 skips the Architect on a clean scan ("absent on a clean-scan story"). Codex r8's DevOps halted on the missing report and had to be re-dispatched with the scan evidence.

## 2. Reproduction Protocol
1. `sed -n '44,50p;96,104p' scaffold/hosts/claude/.claude/agents/devops.md`.
2. `sed -n '489,494p;508p;540p' scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md`.
3. Run a standard-lane story whose pre-gate scan is clean; DevOps halts at Step 1.

Edge conditions:
- A flagged scan still requires the arch report.
- The fast lane is unchanged.

## 3. Evidence & Context
```
devops.md:48   - {STORY-ID}-arch.md   ✓ (standard lane only)
devops.md:100  ls .cleargate/sprint-runs/SPRINT-NN/reports/STORY-NNN-NN-arch.md   # Required for standard-lane only
SKILL.md:508   | STORY-NNN-NN-arch.md | standard-lane only, AND only when the §C.6 pre-gate scan flagged …; absent on a clean-scan story |
Codex r8: ls …/reports/STORY-001-02-arch.md → No such file or directory (DevOps halted; re-dispatched)
```

## 4. Execution Sandbox (Suspected Blast Radius)
**Investigate / Modify:**
- `cleargate-cli/scaffold/hosts/claude/.claude/agents/devops.md` (inventory and Step 1 precondition); then `npm run gen:codex`.
- Tests beside the skill-drift tests.

**Do NOT modify:** SKILL.md §C.6 (it is the reference).

## Task Breakdown
- [ ] QA-Red: devops.md scopes the arch report to a flagged scan in both places; the Codex devops.toml matches
- [ ] Edit devops.md, then gen:codex
- [ ] Typecheck, targeted tests

## 5. Verification Protocol (The Failing Test)
**Command:** `cd cleargate-cli && npm run test:file -- test/scaffold/devops-arch-report-scan-gated.red.node.test.ts` (solo).

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | A clean scan (no report) vs a flagged scan (report required) |
| Interfaces | T | devops.md and its Codex render |
| Data | F | No data variation |
| Rules | F | Covered by Paths |

```gherkin
Feature: DevOps preconditions match the scan-gated post-flight

  @paths @interfaces
  Scenario: The arch report is scan-gated in devops.md
    Then devops.md's inventory and Step 1 list STORY-ID-arch.md only when the pre-gate scan flagged
    And the generated devops.toml says the same
```

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | text assertions across both files |
| Integration tests | 0 | none |
| E2E / acceptance tests | 0 | DT re-run |

---

## Prior work

- [[BUG-103]]: the skill/role drift batch; none found for this contradiction.

## Context Source

**context_source:** Codex dogfood r8 (2026-09-27, issues.md I27); code grounding at cli main `0e5b0ac`; owner directives recorded in `approved_by`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
