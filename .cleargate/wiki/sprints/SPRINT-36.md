---
type: sprint
id: "SPRINT-36"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-36_Connector_M1_Identity_And_Credentials.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
sprint_cleargate_id: "SPRINT-36"
report_raw_path: ".cleargate/sprint-runs/SPRINT-36/SPRINT-36_REPORT.md"
last_report_ingest_commit: "77b6da7136ff086393fcd6ad3a9b57aa7a13de62"
---

# SPRINT-36: Connector M1 — Connection Identity & Credentials (Real Auth)

**Status:** Completed · **Sprint:** SPRINT-36 · **Gate:** fail: discovery-checked

## Goal
Stand up real connection identity + credentials for the M0 loop: one authority (`mcp`) mints/verifies pairing codes, member tokens, and app tokens via an indexed (O(1)) verify; the broker verifies at connect, caches successful bindings, subscribes to a Redis revoke channel, and kills in-flight turns on revoke — retiring the shared-secret stub across all three register lanes.

## Deliverables
*(Decomposed 2026-06-04 from EPIC-047 — **all 7 stories at 🟢 Low** after the 4 §6 decisions were resolved: scope=one sprint, pairing-revoke=operator+owner, native-lane=reuse `cleargate join` token directly, verify-cache=short-TTL positive. Local/pre-member — not pushed. **Spans two code repos**: `mcp/` (identity authority) + `connector/broker/` (verifying edge).)*

| Story ID | Title | Repo | Lane | Wave | Parallel? | Depends on |
|---|---|---|---|---|---|---|
| `STORY-047-01` | Dedicated credential schema (`connections`/`pairings`/`app_tokens`) + **indexed token verify** (kills the whole-table bcrypt scan) | mcp | standard | M1 | n | — |
| `STORY-047-02` | Pairing-code + app-token lifecycle (mint / one-time consume / revoke by **operator + owner**) | mcp | standard | M1 | y | 047-01 |
| `STORY-047-04` | Revocation **publish** on Redis pub/sub (`rev:connection`/`rev:apptoken`/`rev:project`) — first plane pub/sub | mcp | standard | M1 | y | 047-01 |
| `STORY-047-03` | `POST /admin-api/v1/connections/verify` — per-kind, rate-limited, **fail-closed**, always returns `project_id` (+ pool headroom) | mcp | standard | M2 | n | 047-01, 047-02 |
| `STORY-047-05` | Broker **verify-client** + fail-closed + short-TTL verify cache + `project_id` stamping | connector/broker | standard | M3 | n | 047-03 |
| `STORY-047-06` | Broker **revoke-subscriber** (`PSUBSCRIBE rev:*`) + **kill-in-flight** + whole-tenant kill | connector/broker | standard | M3 | n | 047-04, 047-05 |
| `STORY-047-07` | Wire the **3 register lanes**, **retire the M0 `auth-stub.ts`**, **audit rows** per turn | connector/broker | standard | M4 | n | 047-05, 047-06 |

[+437 bytes not shown — read .cleargate/delivery/archive/SPRINT-36_Connector_M1_Identity_And_Credentials.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** Shipped · **Report:** .cleargate/sprint-runs/SPRINT-36/SPRINT-36_REPORT.md · **Improvement suggestions:** .cleargate/sprint-runs/SPRINT-36/improvement-suggestions.md

### Carried Over
- None. All 7 stories reached Done; BUG-035 Completed.
<!-- END sprint-report -->
