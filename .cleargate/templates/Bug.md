<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-5.
YAML Frontmatter: Bug ID, Parent Ref, Status, Severity, Reporter, Approved gate.
§1 The Anomaly: Expected vs. Actual behavior.
§2 Reproduction Protocol: Deterministic steps to recreate.
§3 Evidence & Context: Raw logs, stack traces, payloads — no paraphrasing.
§4 Execution Sandbox: Exact file paths to investigate. Restrict scope to prevent unrelated refactoring.
§5 Verification Protocol: The failing test that proves the bug exists and proves the fix resolves it.
Output location: .cleargate/delivery/pending-sync/BUG-{ID}.md

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work    ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary        ← §1 The Anomaly (repro)
  - Open Questions ← §0.5 Open Questions
  - Edge Cases     ← §2 Impact (edge conditions)
  - Risks          ← §2 Impact
  - Ambiguity      ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
bug_id: "BUG-{ID}"
parent_ref: "EPIC-{ID} | STORY-{ID}"
parent_cleargate_id: null  # canonical cleargate-id of parent work item; null for top-level
sprint_cleargate_id: null  # canonical cleargate-id of owning sprint; null for off-sprint items
carry_over: false  # set true to skip lifecycle reconciliation at sprint close
status: "Draft | Triaged | In Fix | Verified"
severity: "P0-Critical | P1-High | P2-Medium | P3-Low"
reporter: "{name}"
approved: false
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
# Sync attribution. Optional; stamped by `cleargate push` / `cleargate pull`.
pushed_by: null            # set by push: which user pushed
pushed_at: null            # set by push: ISO-8601 timestamp
last_pulled_by: null       # set by pull: which user pulled
last_pulled_at: null       # set by pull: ISO-8601 timestamp
last_remote_update: null   # set by pull: server's last-modified timestamp
source: "local-authored"   # flips to "remote-authored" on intake
last_synced_status: null   # required for conflict-detector; status at last sync
last_synced_body_sha: null # sha256 of body at last sync
---

# BUG-{ID}: {Bug Name}

## 0.5 Open Questions

> Populate during drafting. Resolve every entry before flipping ambiguity to 🟢.

- **Question:** {edge case, contradiction, or missing detail}
- **Recommended:** {agent's proposed answer}
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)
**Expected Behavior:** {What the system should do under normal conditions.}

**Actual Behavior:** {What it is doing right now.}

## 2. Reproduction Protocol
*(AI agents need strict, deterministic steps. "If it can't be reproduced reliably, it can't be fixed safely.")*

1. Go to...
2. Click...
3. Observe...

## 3. Evidence & Context
*(Provide the raw truth: stack traces, terminal errors, network payloads. Do not paraphrase.)*

```
[Paste exact logs or error messages here]
```

## 4. Execution Sandbox (Suspected Blast Radius)
*(Restrict the agent's focus to prevent unrelated refactoring.)*

**Investigate / Modify:**
- `src/...`

## 5. Verification Protocol (The Failing Test)
*(The agent must write or run a specific test that proves the bug exists, then prove the fix resolves it.)*

**Command:** `npm test ...`

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [ ] Reproduction steps are 100% deterministic.
- [ ] Actual vs. Expected behavior is explicitly defined.
- [ ] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
