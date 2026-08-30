---
type: sprint
id: "SPRINT-30"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-30_Solo_Onboarding_Dogfood_Hardening.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "db53f81843ad19394191eb9fe3a8628ddc7c3061"
repo: "planning"
---

# SPRINT-30: Solo Onboarding Dogfood Hardening

## 0. Stakeholder Brief

- **Sprint Goal:** Eliminate the install + first-sprint friction surfaced when the framework was used end-to-end by a single solo developer with no prior ClearGate context.
- **Business Outcome:** A solo developer running `cleargate init` in a new repo gets a clean, opt-in onboarding: explicit pre-member state until `cleargate join`, prominent restart prompt, zero deprecation noise, and one always-enforcing protocol vocabulary instead of two confusing modes. Cuts the silent-failure window between "init exited 0" and "the framework actually works."
- **Risks (top 3):**
  1. **CR-070 vocabulary collapse** has wide blast radius (templates, scripts, knowledge docs, CLAUDE.md canonical + payload + live). Three-site dogfood-mirror discipline applies — easy to ship the change and forget to re-sync live `/.claude/`.
  2. **BUG-031 (project_id leak)** fix risks breaking the convenience of "you already joined elsewhere, we remember you." Need the per-repo / global identity split to feel natural, not bureaucratic.
  3. **CR-069 (restart banner)** is a UX-visible change in the literal first message new users see post-install.

[+11,350 bytes not shown — read .cleargate/delivery/archive/SPRINT-30_Solo_Onboarding_Dogfood_Hardening.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
