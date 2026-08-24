---
type: sprint
id: "SPRINT-03"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-03_CLI_Packages.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# SPRINT-03: CLI Packages (`cleargate-cli` scaffold + Admin CLI + `cleargate join`)

## Sprint Goal
Ship the two CLI packages that make the MCP hub operable without the UI: (a) `cleargate-cli` — the shared scoped npm package (`@cleargate/cli`) that every future client command roots into; (b) `cleargate-admin` — headless admin ops run against SPRINT-02's `/admin-api/v1/*` surface; (c) `cleargate join` — the Vibe Coder onboarding flow that redeems an invite token and seats a refresh token in the OS keychain. Two storage-layer corrections also land this sprint: STORY-004-07 migrates invite storage from Redis-only (SPRINT-02) to a Postgres `invites` table (durability + auditability + UI queryability), and STORY-003-13 adds the MCP-side `POST /join/:invite_token` redemption route that SPRINT-01 didn't cover. After this sprint, a root admin can create a project + issue an invite from their terminal, a Vibe Coder can redeem the invite on their machine, and Claude Code can authenticate to MCP using the resulting refresh token — with no UI required.

## Consolidated Deliverables

[+16,262 bytes not shown — read .cleargate/delivery/archive/SPRINT-03_CLI_Packages.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
