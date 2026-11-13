---
type: sprint
id: "SPRINT-37"
parent: ""
children: []
cites: []
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-37_Connector_M2_Daemon_Hardening.md"
last_ingest: "2026-11-13T01:02:08.963Z"
last_ingest_commit: "ec5e6d5673cec3082c3761ae296d81d819ac08f7"
repo: "planning"
sprint_cleargate_id: "SPRINT-37"
---

# SPRINT-37: Connector M2 — Daemon Hardening (Production Posture)

**Status:** Draft · **Dates:** 2026-07-07 → 2026-07-21 · **Gate:** fail: discovery-checked

## Goal
Harden the M0 daemon to production posture across seven axes — real-credential register (fail-closed), reconnect + re-attach + full-jitter backoff + heartbeat, resume-from-`seq` + `turn_id` idempotency, runtime version-drift guard + CI fixtures, sessions-via-`--resume` + metrics derivation, sandbox enforcement, and a **gating** Linux/Docker no-orphan teardown verification — extending the on-disk `connector/daemon/**` modules (M0 turn-path shipped in SPRINT-35), retiring the shared-secret stub, with all code under `connector/**` (EPIC-027 plane-sibling boundary) and local-only (not pushed).

## Deliverables
*(Decomposed 2026-06-06 from EPIC-048 — the M0 turn-path (STORY-048-01/02) **already shipped in SPRINT-35**, so M2 is the hardening + real-auth layer: 7 new stories 048-03…048-09. The 4 EPIC-048 §6 questions are resolved (recommended defaults acked by Sandro 2026-06-06). Local/pre-member — not pushed. **Single code repo:** `connector/daemon/` — except 048-03, which imports the credential plumbing from `cleargate-cli/src/auth` (see §2.3 boundary note).)*

| Story ID | Title | Repo | Lane | Wave | Parallel? | Depends on |
|---|---|---|---|---|---|---|
| `STORY-048-09` | **Linux/Docker process-tree teardown verification (GATING)** — close the macOS-only no-orphan gap | connector/daemon | standard | M1 | y | — |
| `STORY-048-03` | **Real-credential register** (pairing \| member + `kind`) + fail-closed; retire the shared-secret stub | connector/daemon | standard | M1 | y | — |
| `STORY-048-06` | **Runtime version-drift guard** (2.1.162 → degrade-not-crash) + CI fixtures | connector/daemon | standard | M1 | y | — |
| `STORY-048-07` | **Sessions** via `--resume` + **metrics** from `result.modelUsage` | connector/daemon | standard | M1 | y | — |
| `STORY-048-08` | **Sandboxing** — allowlist enforcement + tool-IO cap/redaction + concurrency cap | connector/daemon | standard | M1 | y | — |
| `STORY-048-04` | **Reconnect** + re-attach by `connection_id` + full-jitter backoff + heartbeat ping/pong | connector/daemon | standard | M2 | n | 048-03 |
| `STORY-048-05` | **Resume-from-`seq`** + `turn_id` idempotency (drop = hiccup, not lost turn / double-run) | connector/daemon | standard | M3 | n | 048-04 |

[+695 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-37_Connector_M2_Daemon_Hardening.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
