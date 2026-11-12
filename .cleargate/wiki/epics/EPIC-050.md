---
type: epic
id: "EPIC-050"
parent: ""
children: []
cites: []
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-050_Connector_Onboarding_And_Companion_Packaging.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "69d4814e7370023ba8352eea1f7de913e3acd8d9"
repo: "planning"
---

# EPIC-050: Connector Onboarding & Companion Packaging

**Status:** Draft · **Sprint:** none · **Gate:** fail: parent-approved, existing-surfaces-verified

## Objective
Ship the Connector as an OPT-IN, default-off ClearGate companion that the `cleargate` CLI installs, identifies, and supervises — including running N independent daemons on one machine, each bound to its own repo/project. This is the epic where the product's charter visibly expands from planning-only to planning + connectivity.

## Problem & Value
**Why are we doing this?**
EPIC-046/047/048 make the relay *work and be safe*, but only if you hand-run the daemon and hand-wire its identity. This epic is the difference between "a thing engineers can run" and "a thing a ClearGate member turns on in one command." It also answers the concrete multi-project case: a user with 4 unrelated repos, each `cleargate join`'d to a different project, running **4

[+517 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-050_Connector_Onboarding_And_Companion_Packaging.md]

## Scope
**In:**
- [ ] `cleargate connector` command surface: `install` (fetch/pin `@cleargate/connector`), `up`/`down` (start/stop the daemon for this repo), `status` (connection_id, project, presence, broker URL),
**Out:**
- The broker / registry / routing (→ EPIC-046), credential minting/verify (→ EPIC-047), the daemon's `claude`-spawn/normalize/teardown CORE (→ EPIC-048).

[+2,078 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-050_Connector_Onboarding_And_Companion_Packaging.md]

## Architecture rules
- NEVER bundle connector runtime code into the shipped npm planning payload (`cleargate-cli/src`, `.claude/`, the package). The connector ships as a SEPARATE package `@cleargate/connector` (own repo). `cleargate connector` is a THIN launcher that installs/spawns it and imports NOTHING from it.

[+683 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-050_Connector_Onboarding_And_Companion_Packaging.md]

## Open questions
- "Lifecycle depth for v1: foreground/detached process only (user manages restart), or OS-service integration (launchd/systemd) for auto-restart + boot survival?"
- "Per-repo profile pinning: land it as a **standalone CLI CR first** (benefits push/pull/sync across repos immediately) or fold it into this epic?"
- "Install mechanism for `@cleargate/connector`: global `npm i -g`, `npx`-on-demand, or a

[+335 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-050_Connector_Onboarding_And_Companion_Packaging.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
