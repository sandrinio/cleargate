---
type: sprint
id: "SPRINT-12"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-12_Framework_Universality.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# SPRINT-12: Framework Universality — Public Ship

## Sprint Goal

Ship **EPIC-018** — make ClearGate installable into any target repo. Remove the dogfood-specific assumptions that leak through the scaffold (`npm test` / `npm run typecheck` hard-codes, stack vocabulary, no LICENSE, dogfood-first README), and prove it works end-to-end via an automated foreign-repo integration test.

After this sprint: a stranger with no prior context can `npm i -D cleargate && npx cleargate init` in a blank Node or Go repo and drive the four-agent loop without forking the scaffold. Hygiene (bugs + EPIC-018 pruning that was renumbered + awareness polish) is **deferred to SPRINT-13** per Option C of the 2026-04-24 conversation.

**This sprint is the vibe-coder-product-market-fit gate.** Until it lands, ClearGate is a private dogfood repo; after it lands, ClearGate is a public framework.

## 1. Consolidated Deliverables

[+9,070 bytes not shown — read .cleargate/delivery/archive/SPRINT-12_Framework_Universality.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
