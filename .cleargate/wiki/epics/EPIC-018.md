---
type: epic
id: "EPIC-018"
parent: ""
children: 
  - "[[STORY-018-01]]"
  - "[[STORY-018-02]]"
  - "[[STORY-018-03]]"
  - "[[STORY-018-04]]"
  - "[[STORY-018-05]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-018_Framework_Universality_Public_Ship.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-018: Framework Universality — Public Ship

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Make ClearGate installable into any target repo by stripping ClearGate-specific assumptions from the scaffold (npm/vitest/monorepo hard-codes), adding LICENSE + stranger-onboarding README, and proving it works end-to-end via an automated foreign-repo integration test.</objective>
  <architecture_rules>
    <rule>The scaffold (cleargate-planning/) must contain ZERO stack-specific strings — no `drizzle`, `svelte`, `coolify`, `fastify`, `postgres`, concrete version numbers for user-project deps</rule>
    <rule>Gate commands (`precommit`, `typecheck`, `test`) must be user-configurable via `.cleargate/config.yml`; default to sensible fallback (`echo "no precommit configured"` exits 0) rather than npm-specific invocations</rule>
    <rule>Agent definitions reference `cleargate gate <name>` CLI verbs, not raw language-specific commands.

[+13,096 bytes not shown — read .cleargate/delivery/archive/EPIC-018_Framework_Universality_Public_Ship.md]

## Blast radius
Affects: [[STORY-018-01]], [[STORY-018-02]], [[STORY-018-03]], [[STORY-018-04]], [[STORY-018-05]]
