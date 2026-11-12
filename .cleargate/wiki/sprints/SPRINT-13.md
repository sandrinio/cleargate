---
type: sprint
id: "SPRINT-13"
parent: ""
children: []
cites: []
cited_by: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-13_Identity_Bound_Invite_Auth.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
sprint_cleargate_id: "SPRINT-13"
report_raw_path: ".cleargate/sprint-runs/SPRINT-13/REPORT.md"
last_report_ingest_commit: "6883a94781e46a04f797d1e76e74a69b95c21b33"
---

# SPRINT-13: Identity-Bound Invite Auth

**Status:** Completed · **Sprint:** SPRINT-13 · **Gate:** not run

## Goal
Ship **EPIC-019** — replace bearer-only invite redemption with **identity-bound, pluggable-provider auth**. After this sprint, possessing an invite URL is no longer enough to redeem it: the invitee must additionally prove ownership of the email the admin invited (via GitHub OAuth or magic-link emailed via Resend). The provider abstraction is real — adding a third provider (Google, GitLab, SAML) becomes a single follow-up CR with no changes to `routes/join.ts` or schema.

This sprint hardens the onboarding edge of the system. SPRINT-12 made ClearGate installable in any repo; SPRINT-13 makes it safely installable for any team — invite URL leaks (Slack screenshots, copy-paste fumbles) stop being a takeover vector.

## Deliverables
Note: this sprint executes **CRs, not Stories** — at user direction (2026-04-25 conversation). Each CR is sized like a story and follows the same QA gate. The Granularity Rubric in `templates/story.md` was applied: no CR exceeds L3 complexity; CR-006 is the largest at L3 due to two CLI surfaces (`join.ts` + `admin-login.ts`) sharing helpers.

| Item | Title | Complexity | Parallel? | Bounce Exposure | Milestone |
|---|---|---|---|---|---|
| [`CR-003`](CR-003_Identity_Bound_Invite_Redemption.md) | Identity-Bound Invite Redemption (substrate: provider interface + 2-step `/join` endpoints + `identity_proofs` schema + migration) | L3 | n | high | M1 |
| [`CR-004`](CR-004_GitHub_OAuth_Identity_Provider.md) | GitHub OAuth Identity Provider (refactor `cleargate admin login` device-flow onto interface; add member-side path) | L2 | y | med | M2 |
| [`CR-005`](CR-005_Email_Magic_Link_Identity_Provider.md) | Email Magic-Link Identity Provider (Resend SMTP, 6-digit OTP, 5-attempt cap, 10-min TTL) | L2 | y | med | M2 |
| [`CR-006`](CR-006_CLI_Join_Provider_Selection_UX.md) | CLI `cleargate join` Provider Selection UX (two-step orchestrator, shared helpers with `admin login`) | L3 | n | med | M3 |

**Totals: 4 CRs, 1 Epic. Complexity: 2×L2 + 2×L3. No L4.**

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
<!-- BEGIN sprint-report -->
## Sprint Report
**Report status:** unknown · **Report:** .cleargate/sprint-runs/SPRINT-13/REPORT.md

### Carried Over
(none recorded)
<!-- END sprint-report -->
