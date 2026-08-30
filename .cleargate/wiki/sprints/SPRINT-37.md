---
type: sprint
id: "SPRINT-37"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/SPRINT-37_Connector_M2_Daemon_Hardening.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "ec5e6d5673cec3082c3761ae296d81d819ac08f7"
repo: "planning"
---

# SPRINT-37: Connector M2 — Daemon Hardening (Production Posture)

## 0. Stakeholder Brief
*(Third sprint of the Connector program. Local/pre-member — not pushed. Decomposes the remaining EPIC-048 scope; single code repo this time — all 7 stories land under `connector/daemon/**`.)*

- **Sprint Goal:** Turn the M0 walking-skeleton daemon into a **production-posture local Connector**: dial the post-047 broker with a **real, verifiable credential** (pairing or member) instead of the shared-secret stub; survive network drops and broker redeploys via **reconnect + re-attach by stable `connection_id` + full-jitter backoff + resume-from-`seq`** (a drop becomes a hiccup, not a lost turn or a double-run); turn the `claude` 2.1.162 pin into a **runtime drift guard** that degrades-not-crashes; delegate session continuity to `claude`; derive correct metrics from `result.modelUsage`; **enforce** the sandbox; and prove the descendant-tree teardown leaves **zero orphans on Linux/Docker**.

[+13,562 bytes not shown — read .cleargate/delivery/pending-sync/SPRINT-37_Connector_M2_Daemon_Hardening.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
