---
type: sprint
id: "SPRINT-35"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-35_Connector_M0_Walking_Skeleton.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
sprint_cleargate_id: "SPRINT-35"
report_raw_path: ".cleargate/sprint-runs/SPRINT-35/SPRINT-35_REPORT.md"
last_report_ingest_commit: "cfac25cc3c549b737d84dedbb6153544113882bb"
---

# SPRINT-35: Connector M0 — Walking Skeleton (Relay Loop E2E)

**Status:** Completed · **Dates:** 2026-06-05 → 2026-06-19 · **Gate:** fail: discovery-checked

## Goal
Stand up the minimum broker + connector daemon needed to relay a single live Claude Code turn end-to-end and cancel it cleanly — the walking skeleton that proves the architecture, not a production system.

## Deliverables
*(Decomposed 2026-06-04 into six story files under `pending-sync/` — **5 at 🟢, STORY-048-01 at 🟡** pending one human granularity decision (keep-whole+Opus vs split, §1.4 of that story). Critic pass + Architect SDR applied. Everything non-essential to "does the loop work" is deliberately deferred to M1/hardening sprints. Local/pre-member — not pushed.)*

| Story ID | Title | Lane | Milestone | Parallel? | Bounce Exposure |
|---|---|---|---|---|---|
| `STORY-046-01` | Scaffold `/connector` workspace: `broker/` + `daemon/` TS packages, node:test runner, build/typecheck, **shared envelope codec + types** (JSON framing for M0) | fast | M1 | n | low |
| `STORY-046-02` | Broker M0: WS gateway (both edges) + in-memory `Map` registry + register (**shared-secret stub**) + lightweight presence | standard | M2 | y | med |
| `STORY-046-03` | Broker M0: prompt routing down + ordered `event` relay up + `cancel` pass-through + `turn_end`/EOF tracking + offline fast-fail | standard | M2 | y | med |
| `STORY-048-01` | Connector M0: WS dial-out + register (shared-secret) + **`Backend` seam** (zero direct claude-CLI refs in the turn path) + spawn-per-turn (verified `claude -p … --output-format stream-json --verbose --include-partial-messages < /dev/null`, realpath-pinned cwd) + **staged process-tree teardown** that **reaps the descendant tree** (a background child sits in its own PGID, so `kill(-pgid)` misses it; macOS/OrbStack now, Linux deferred) | standard | M3 | y | **high** |
| `STORY-048-02` | Connector M0: normalize core records (`text_delta`/`tool_use`/`tool_result`/`turn_result`/`error`, **skip `signature_delta`**) + multi-result EOF lifecycle (**hold open past the first `result` until stdout EOF**; same-session `system/init` = continuation, not a new turn; in-band vs out-of-band error classes) + wire `turn-runner` into the daemon entry. Fixtures re-captured on 2.1.162 | standard | M3 | y | med |

[+1,038 bytes not shown — read .cleargate/delivery/archive/SPRINT-35_Connector_M0_Walking_Skeleton.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-35/SPRINT-35_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-35/improvement-suggestions.md

### Carried Over
- None. All six stories reached Done.
<!-- END sprint-report -->
