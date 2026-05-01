---
story_id: STORY-006-05
parent_epic_ref: EPIC-006
parent_cleargate_id: "EPIC-006"
sprint_cleargate_id: "SPRINT-04"
status: Done
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006 §5 (Token display), STORY-004-04
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-006-02
  - STORY-004-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:40.684Z
push_version: 2
---

# STORY-006-05: Tokens Page + One-Time-Display Modal

**Complexity:** L2. The single riskiest UI story in SPRINT-04: the plaintext-once discipline is a security-critical contract and regression-prone. Thick Quality Gates.

## 1. The Spec

`/projects/[id]/tokens` — list tokens for the project (id, name, last_used_at, expires_at, status) + "Issue token" primary CTA + "Revoke" row action with confirm dialog.

On issue-token success, a modal displays the **plaintext token exactly once**. Close button is disabled until the admin ticks "I've saved it somewhere safe." Attempting to navigate away (reload, close tab, link click) while the modal is open triggers a `beforeunload` warning. After close: the modal is unmounted, the plaintext is dropped from memory, and the token appears in the list with its metadata but no plaintext. Reload the page → list still has the row, still no plaintext.

### Detailed Requirements — listing

- Columns: `Name` · `Status` · `Last used` · `Expires` · actions (`Revoke`).
- Status pill: `active` (green), `revoked` (red), `expired` (gray — muted text).
- Sort default: newest first (by `created_at` desc).
- Row action: `Revoke` → `<ConfirmDialog>` (from STORY-006-04) → `DELETE /admin-api/v1/tokens/:id` (STORY-004-04). Optimistic row update: status flips to `revoked`; row stays.
- Empty state: Design Guide §6.9 — "No tokens yet. Issue the first one →"

### Detailed Requirements — issue flow

- "Issue token" CTA opens a small form modal: input `name` (required, 3-80 chars, unique per project — server enforces) + `expires_at` selector (7d / 30d / 90d / "Never"; Never = `null`) + submit.
- On submit: `POST /admin-api/v1/projects/:id/tokens` (STORY-004-04) → response `{ token_id, plaintext_token, expires_at }`.
- Immediately on response: the form modal pivots to the **TokenModal** (plaintext display). The plaintext is held only in the Svelte component's local state — never in a store, never in localStorage/sessionStorage, never in a URL param.
- TokenModal layout per Design Guide §6.8:
  - Headline "Copy this token now."
  - Warning copy: "This is the only time you'll see it. Store it in a password manager or CI secret immediately."
  - Plaintext chip: `bg-base-200 rounded-xl p-4 font-mono text-sm select-all` with a single "Copy" icon button (uses `navigator.clipboard.writeText`).
  - Checkbox: "I've saved it somewhere safe." Close button is `disabled` until this checkbox is ticked.
  - Single close action (no cancel / dismiss escape hatch). Esc is disabled on this modal.
  - `beforeunload` listener is attached while the modal is mounted; detached on close.
- On close: TokenModal unmounts → plaintext drops. The token list refreshes to include the new row with `plaintext_token: undefined`.

### Detailed Requirements — anti-leak discipline

- Plaintext token **never**:
  - Written to `localStorage` or `sessionStorage`.
  - Persisted to IndexedDB.
  - Included in any fetch request body after initial display.
  - Logged to console (including `console.debug` / `console.info`).
  - Rendered into the DOM outside the modal's scoped component.
  - Survived a route change or page unmount.
- Copy button does not reveal the token in any hover tooltip or toast text.
- The response-logger strip from SPRINT-02 already scrubs `plaintext_token` from server logs — UI equivalent enforced by an integration test that captures `console.*` and asserts clean.

## 2. Acceptance

```gherkin
Scenario: Issue token shows modal once
  Given I am on /projects/<P>/tokens
  When I click "Issue token", enter name "ci-bot", select 30d expiry, submit
  Then POST /admin-api/v1/projects/<P>/tokens returns { token_id, plaintext_token, expires_at }
  And the TokenModal opens showing the plaintext in a select-all chip
  And the Close button is disabled
  And the list below does not yet include the new row (modal is the source until closed)

Scenario: Close gated by checkbox
  Given TokenModal is open
  When I click Close without ticking "I've saved it"
  Then the modal remains open
  And a subtle shake animation plays on the checkbox
  When I tick "I've saved it"
  Then the Close button enables
  When I click Close
  Then the modal closes
  And the token appears in the list with status "active" and no plaintext

Scenario: Reload hides plaintext forever
  Given a token was just issued and modal closed
  When I reload the page
  Then the token row renders with its name + status + last_used_at
  And no plaintext appears anywhere in the DOM, localStorage, sessionStorage, or IndexedDB
  And a new POST is NOT made — the issue was a one-shot

Scenario: beforeunload warns while modal is open
  Given TokenModal is open with plaintext displayed
  When I attempt to close the tab or navigate away
  Then a browser "leave site?" prompt appears
  And accepting discards the plaintext
  And canceling keeps the modal open

Scenario: Copy writes to clipboard
  Given TokenModal is open
  When I click the Copy icon button
  Then the clipboard contains exactly the plaintext_token
  And a toast "Copied to clipboard" appears
  And the toast text does NOT contain the token value

Scenario: Revoke a token
  Given an active token exists
  When I click Revoke, then confirm
  Then DELETE /admin-api/v1/tokens/<id> returns 204
  And the row's status pill flips to "Revoked"
  And the row stays in the list (not removed)

Scenario: Revoke is idempotent
  Given a token with status "revoked"
  When I click Revoke again
  Then the confirm dialog does not appear (action is hidden for revoked tokens)
  OR the confirm dialog appears and the retry returns 204 anyway (STORY-004-04 is idempotent)

Scenario: Token name validation
  When I submit the issue form with name "ab"
  Then inline error "3-80 characters" shows
  And POST is not called
  When I submit with a duplicate name
  Then the server returns 409 and the form shows "Name already exists"

Scenario: Never-expires option
  When I issue a token with expiry "Never"
  Then the row's Expires column shows "Never"
  And the DB row has expires_at = null

Scenario: Server error during issue
  Given the admin API returns 500 on POST
  When I submit the issue form
  Then the form shows an inline retry banner
  And the TokenModal does NOT open (no plaintext to reveal)

Scenario: Empty state
  Given a project with zero tokens
  When I visit /projects/<P>/tokens
  Then EmptyState "No tokens yet. Issue the first one →" renders

Scenario: Mobile full-screen modal
  Given viewport 390 px
  When TokenModal opens
  Then it fills the viewport
  And the checkbox + Close button are reachable without scroll
```

## 3. Implementation

- `admin/src/routes/projects/[id]/tokens/+page.server.ts` + `+page.svelte`
- `admin/src/lib/components/TokenModal.svelte` — the gated plaintext modal + `beforeunload` effect. Unit test.
- `admin/src/lib/components/IssueTokenForm.svelte` — form modal that submits then hands off to TokenModal. Unit test.
- `admin/src/lib/components/TokenRow.svelte` — status pill + actions.
- `admin/src/lib/mcp-client.ts` — `listTokens`, `issueToken`, `revokeToken`.
- `admin/tests/e2e/token-issue.spec.ts` — Playwright: full issue → copy → close → reload → assert no plaintext. Uses `page.evaluate()` to inspect storage and DOM.
- `admin/tests/components/token-modal.test.ts` — unit tests for close-gating, beforeunload attachment/detachment, keyboard Esc disabled, focus management.

## 4. Quality Gates

- All twelve acceptance scenarios pass.
- **Anti-leak regression test suite** (critical):
  - Playwright after-modal-close assertion: `await page.evaluate(() => JSON.stringify({ls: localStorage, ss: sessionStorage}))` contains no substring match for the plaintext.
  - DOM scrape after close: `document.body.innerText` does not contain the plaintext.
  - `console.log/info/debug/warn/error` spy asserts plaintext never emitted.
  - Network tab assertion: no outgoing request body contains the plaintext after the single issue POST.
- `beforeunload` listener is attached only while modal is mounted (memory-leak check: mount → unmount → `window.onbeforeunload` unset).
- A11y: focus trap inside modal (Esc explicitly disabled per requirements), tab cycle stays inside, screen reader announces headline + checkbox label + button states. axe-core clean.
- Design-Guide §6.8 modal class compliance (grep test).

## 5. Open questions

1. **Esc-to-close behavior.** Default browser modals dismiss on Esc; our contract disables it until the checkbox is ticked. Some screen readers may complain. If axe-core flags it, expose an assistive-text explanation ("Press Tab to move focus; Esc is disabled until you confirm you've saved the token") via `aria-describedby`.
2. **Copy-button success signal.** Use a toast (Design Guide §6.10) vs. ephemeral "Copied!" inline label. Default: toast. Architect confirms.
3. **"Never expires" risk.** Allowing never-expires tokens is a security smell in production. For alpha it's fine; add a follow-up item to require `expires_at NOT NULL` once STORY-004-04 exposes a server-side policy knob. v1.1.

## Ambiguity Gate

🟢 — EPIC-006 §5 pinned the plaintext-once contract; STORY-004-04 owns the server side; Design Guide §6.8 owns the modal. Open questions are UX polish, not security.
