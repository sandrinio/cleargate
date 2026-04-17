---
story_id: "STORY-002-03"
parent_epic_ref: "EPIC-002"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-002_Knowledge_Wiki.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-002-03: `cleargate-wiki-query` Subagent Definition

**Complexity:** L1.

## 1. The Spec
Define the `cleargate-wiki-query` subagent (Haiku). At triage, reads `wiki/index.md`, surfaces relevant existing items matching the current prompt.

## 2. Acceptance
```gherkin
Scenario: Triage finds prior work
  Given wiki/index.md lists PROPOSAL-stripe-webhooks archived as LIN-987
  When user prompts about "Stripe webhook support"
  Then subagent surfaces the archived Proposal
```

## 3. Implementation
- `cleargate-cli/assets/subagents/cleargate-wiki-query.md`

## Ambiguity Gate
🟢.
