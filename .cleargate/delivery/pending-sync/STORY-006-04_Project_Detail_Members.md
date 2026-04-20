---
story_id: STORY-006-04
parent_epic_ref: EPIC-006
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006, STORY-004-03, STORY-004-07
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-006-02
  - STORY-004-03
  - STORY-004-07
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:46:05.857Z
push_version: 2
---

# STORY-006-04: Project Detail + Members Page

**Complexity:** L2 — two routes, one modal, one confirm dialog. Exercises the three-state member status derived by STORY-004-07's LATERAL join.

## 1. The Spec

Two routes rooted at `/projects/[id]`:

**`/projects/[id]` (overview)** — project header (name + created_at meta), a stats snapshot row (member count, token count, item count, last activity) using the dark "value chip" treatment from Design Guide §6.3, and a nav row linking to the four sibling tabs (Members · Tokens · Items · Audit · Stats). Data sources: `GET /admin-api/v1/projects/:id` (STORY-004-02) plus the per-page endpoints for counts.

**`/projects/[id]/members`** — members table (Design Guide §6.7). Columns: display name / email (`members.email`), role (pill §6.2), status pill, invited_at, actions. Status is one of three values per STORY-004-07:
- `pending` — invite row exists, `consumed_at IS NULL`, `expires_at > now()`. Chip `bg-warning` text.
- `active` — invite row consumed OR no invite row but `members` row present. Chip `bg-success` text.
- `expired` — invite row exists, `consumed_at IS NULL`, `expires_at <= now()`. Chip `bg-error` text.

Actions:
- **Invite** button (primary, page-header) opens a modal: inputs `email` + role select (`member` / `admin-of-project`) + submit. On success, the modal pivots to show the invite URL in a copyable chip + "Copy" icon button + "Done" close button. URL shape: `https://mcp.cleargate.<domain>/join/<invite_token>` (from STORY-003-13 + STORY-004-03 response).
- **Remove** row-action on each member row: opens a confirm dialog "Remove <email> from <project>? Their tokens will be revoked." On confirm, `DELETE /admin-api/v1/projects/:id/members/:mid` (STORY-004-03). On success: toast success + optimistic row removal.
- **Resend invite** (on `pending` and `expired` rows): re-hits `POST /admin-api/v1/projects/:id/members` with the existing email + role — MCP regenerates the invite row. On success show the new URL in the same modal as initial invite.

### Detailed Requirements

- SSR load fetches both project detail + members list in parallel (`Promise.all`) inside `+page.server.ts`. If one fails, render what succeeded and show inline banners for the missing slice.
- Invite modal's URL chip has `select-all` + the modal's "Copy" button uses `navigator.clipboard.writeText`. On HTTPS only (Admin UI is HTTPS-only — ok).
- Confirm dialog for remove is a separate reusable `<ConfirmDialog>` component (other stories use it: STORY-006-05 revoke token).
- Invite URL **never shown anywhere else** — modal only. Reload the page → URL is gone; the member row shows `pending` status, no URL accessible. Root admins regenerate via "resend invite."
- Role change UX: **out of scope**. STORY-004-03 does not expose a role-update endpoint; `member_role` is set at invite time. Flag in §5.
- Empty state on members page: "No members yet. Invite the first collaborator →"

### Data shapes

`GET /admin-api/v1/projects/:id/members` (STORY-004-03):
```ts
{
  id: string,
  email: string,
  role: "member" | "admin",
  status: "pending" | "active" | "expired",
  invited_at: string,
  consumed_at: string | null,
  expires_at: string
}[]
```

Invite POST response:
```ts
{
  member_id: string,
  invite_token: string,   // UUID v4, also the invite PK per STORY-004-07
  invite_url: string,     // pre-rendered by MCP: https://mcp.../join/<token>
  expires_at: string
}
```

## 2. Acceptance

```gherkin
Scenario: View project detail
  Given project P with 4 members, 2 tokens, 17 items
  When I visit /projects/<P>
  Then the header shows P.name
  And four value chips render: "4 members" · "2 tokens" · "17 items" · "Last activity <relative>"
  And the tab nav links to Members / Tokens / Items / Audit / Stats

Scenario: List members with three statuses
  Given project P has one active member, one pending invite, one expired invite
  When I visit /projects/<P>/members
  Then three rows render with status pills: "Active" (green), "Pending" (amber), "Expired" (red)
  And each pill uses the Design-Guide semantic token colors

Scenario: Invite flow shows URL modal
  When I click "Invite", enter "alice@example.com", select role "member", submit
  Then POST /admin-api/v1/projects/<P>/members is called
  And the modal pivots to show invite_url in a select-all chip
  And "Copy" writes the URL to the clipboard
  And closing the modal returns to the members list with a new "pending" row for alice

Scenario: Invite URL only shown in modal
  Given I just invited alice (modal showed URL)
  When I close the modal and reload the page
  Then alice's row shows status "pending"
  And no URL is visible anywhere in the DOM
  And no URL is in localStorage/sessionStorage

Scenario: Resend invite regenerates URL
  Given alice's invite is "expired"
  When I click "Resend invite" on her row
  Then POST /admin-api/v1/projects/<P>/members is called with her email + role
  And the modal shows a fresh invite_url
  And her row flips to "pending" with a new expires_at

Scenario: Remove member revokes tokens
  Given bob is an active member with one issued token
  When I click Remove on bob, then confirm
  Then DELETE /admin-api/v1/projects/<P>/members/<bob> is called
  And on success, bob's row disappears
  And a later call to GET /projects/<P>/tokens shows bob's tokens are revoked (per STORY-004-03 cascade)
  And a toast "Removed bob" appears

Scenario: Confirm dialog can be canceled
  Given the remove dialog is open for bob
  When I click Cancel
  Then the dialog closes
  And no DELETE call is made
  And bob's row remains

Scenario: Invite email validation
  When I submit the invite form with an empty or malformed email
  Then the form shows an inline error and does not call POST
  And submit is disabled until email is valid

Scenario: Empty members list
  Given project P has zero members (freshly created)
  When I visit /projects/<P>/members
  Then the EmptyState reads "No members yet"
  And the CTA routes to the invite modal

Scenario: Design-Guide pills render correctly
  When I inspect a status pill in DevTools
  Then its classes include `rounded-full text-xs font-semibold px-2.5 py-0.5`
  And the Active variant uses `bg-success`

Scenario: Mobile layout
  Given viewport width 390 px
  When I visit /projects/<P>/members
  Then the members table collapses to a stack of cards
  And the invite modal is full-screen
```

## 3. Implementation

- `admin/src/routes/projects/[id]/+page.server.ts` + `+page.svelte` — overview
- `admin/src/routes/projects/[id]/+layout.svelte` — shared tab nav for `/projects/[id]/*` children
- `admin/src/routes/projects/[id]/members/+page.server.ts` + `+page.svelte`
- `admin/src/lib/components/InviteModal.svelte` (two-phase: form → URL display) + unit test
- `admin/src/lib/components/ConfirmDialog.svelte` (reusable) + unit test
- `admin/src/lib/components/StatusPill.svelte` — three-state member status. Unit test (all three variants).
- `admin/src/lib/mcp-client.ts` — add `getProject`, `listMembers`, `inviteMember`, `removeMember` helpers.
- `admin/tests/e2e/members-invite.spec.ts` — Playwright end-to-end: invite → copy URL → close modal → verify pending row → remove → verify absent.

## 4. Quality Gates

- All eleven acceptance scenarios pass.
- Invite URL not logged to stdout/stderr (pino + Playwright capture assertions).
- `localStorage` + `sessionStorage` never contain `invite_url` — regression test explicitly asserts this.
- `<ConfirmDialog>` is keyboard-accessible (focus trap, Esc to close, Enter to confirm). Tested with Playwright + axe-core.
- Design-Guide pill class grep test: asserts three status-pill variants map to correct semantic tokens.

## 5. Open questions

1. **Role change UX.** `admin/` has no endpoint to change an existing member's role. If stakeholders need this before GA, spec a new admin-API endpoint (PATCH `/members/:mid`) — v1.1 candidate, do not shoehorn into SPRINT-04.
2. **Invite-URL copy fallback.** `navigator.clipboard` requires user-gesture context. All flows here are click-initiated, so it works — but if iframed in the future, fallback to a hidden `textarea + execCommand('copy')`. Not a SPRINT-04 risk.
3. **Bulk invite / CSV import.** Out-of-scope per EPIC-006 §2; reaffirm here.

## Ambiguity Gate

🟢 — STORY-004-03 locks the invite flow (email, role, URL shape); STORY-004-07 locks the three-state status; Design Guide locks the pills and modal. Only role-change UX is open and explicitly deferred.
