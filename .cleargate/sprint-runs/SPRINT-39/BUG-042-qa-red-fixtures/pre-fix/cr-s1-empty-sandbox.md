---
cr_id: CR-RED01
parent_ref: EPIC-999
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: false
context_source: QA-Red fixture for BUG-042 reproduction — not a real work item.
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
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
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-27T08:34:33Z
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

# CR-RED01: QA-Red fixture — empty Execution Sandbox

## 0.5 Open Questions

- **Question:** none — synthetic fixture.
- **Recommended:** n/a
- **Human decision:** n/a

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- We no longer use the old flow.

**New Logic (The New Truth):**
- Route everything through the new flow.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: [STORY-999-01]
- [ ] Invalidate/Update Epic: [EPIC-999]
- [ ] Database schema impacts? No

## Existing Surfaces

- **Surface:** `.cleargate/knowledge/readiness-gates.md` — evalSection, positional heading split.
- **Why this CR extends rather than rebuilds:** Synthetic fixture; citing a real path only to satisfy existing-surfaces-verified.

## Prior work

- none found

## 3. Execution Sandbox

## 4. Verification Protocol

**Command/Test:** `npm test`

---

## Context Source

**context_source:** QA-Red fixture for BUG-042 reproduction — not a real work item.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [ ] "Obsolete Logic" to be evicted is explicitly declared.
- [ ] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [ ] Execution Sandbox contains exact file paths.
- [ ] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] Existing Surfaces cites at least one source-tree path the CR extends.
