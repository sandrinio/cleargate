---
type: cr
id: "CR-085-Drive-Execution-Loop-States-Live"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/CR-085-Drive-Execution-Loop-States-Live.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
---

# CR-085-Drive-Execution-Loop-States-Live: CR-085: Drive Execution-Loop Lifecycle States Live (In-Progress + Intermediate)

## 0.5 Open Questions

> Resolve every entry before flipping ambiguity to 🟢.

- **Question:** Who drives the state flips — the orchestrator, or the agents themselves?
  - **Recommended:** The **orchestrator**, via `update_state.mjs`, at each dispatch boundary — consistent with the existing §C.5 `→ QA Passed` flip and with `state.json` being orchestrator/DevOps-owned (Developer/QA are worktree-isolated and must not touch `state.json`). "Agents put tasks in progress" is satisfied by the orchestrator flipping the state at the moment it dispatches the agent.
  - **Human decision:** _______

- **Question:** When does a story become `Bouncing` (in-progress) — at worktree creation (§C.2, covers QA-Red→Dev), or only at Developer dispatch (§C.4)?
  - **Recommended:** At **§C.2 worktree creation** — the story is "in progress" for its whole active cycle (QA-Red, TPV, Developer), not just the Dev sub-step. This makes the dashboard show a story as in-progress the moment its worktree opens.
  - **Human decision:** _______

[+8,746 bytes not shown — read .cleargate/delivery/pending-sync/CR-085-Drive-Execution-Loop-States-Live.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

## Open questions
- **Question:** Who drives the state flips — the orchestrator, or the agents themselves?
  - **Recommended:** The **orchestrator**, via `update_state.mjs`, at each dispatch boundary — consistent with the existing §C.5 `→ QA Passed` flip and with `state.json` being orchestrator/DevOps-owned (Developer/QA are worktree-isolated and must not touch `state.json`). "Agents put tasks in progress" is satisfied by the orchestrator flipping the state at the moment it dispatches the agent.
  - **Human decision:** _______

- **Question:** When does a story become `Bouncing` (in-progress) — at worktree creation (§C.2, covers QA-Red→Dev), or only at Developer dispatch (§C.4)?
  - **Recommended:** At **§C.2 worktree creation** — the story is "in progress" for its whole active cycle (QA-Red, TPV, Developer), not just the Dev sub-step. This makes the dashboard show a story as in-progress the moment its worktree opens.
  - **Human decision:** _______

[+1,173 bytes not shown — read .cleargate/delivery/pending-sync/CR-085-Drive-Execution-Loop-States-Live.md]
