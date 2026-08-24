---
type: sprint
id: "SPRINT-13"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-13_Identity_Bound_Invite_Auth.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# SPRINT-13: Identity-Bound Invite Auth

## Sprint Goal

Ship **EPIC-019** — replace bearer-only invite redemption with **identity-bound, pluggable-provider auth**. After this sprint, possessing an invite URL is no longer enough to redeem it: the invitee must additionally prove ownership of the email the admin invited (via GitHub OAuth or magic-link emailed via Resend). The provider abstraction is real — adding a third provider (Google, GitLab, SAML) becomes a single follow-up CR with no changes to `routes/join.ts` or schema.

This sprint hardens the onboarding edge of the system. SPRINT-12 made ClearGate installable in any repo; SPRINT-13 makes it safely installable for any team — invite URL leaks (Slack screenshots, copy-paste fumbles) stop being a takeover vector.

## 1. Consolidated Deliverables

Note: this sprint executes **CRs, not Stories** — at user direction (2026-04-25 conversation). Each CR is sized like a story and follows the same QA gate. The Granularity Rubric in `templates/story.md` was applied: no CR exceeds L3 complexity; CR-006 is the largest at L3 due to two CLI surfaces (`join.ts` + `admin-login.ts`) sharing helpers.

[+14,255 bytes not shown — read .cleargate/delivery/archive/SPRINT-13_Identity_Bound_Invite_Auth.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
