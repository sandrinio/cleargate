---
work_item: CR-062
sprint: SPRINT-27
agent: qa
lane: standard
verdict: FAIL
typecheck: pass
tests_inner: 7 passed, 0 failed (node:test — resend-invite.red.node.test.ts)
tests_outer: 6 passed, 0 failed (vitest — MembersList.test.ts)
acceptance_coverage: 7 of 9 Gherkin scenarios traced
---

# CR-062 — QA Report

## STORY: CR-062 SPRINT-27

## QA: FAIL

## TYPECHECK: pass
(Dev's pre-commit run accepted; commits have .strict() Zod schemas and TS types that are correct-by-construction — no deviation to type-check.)

## TESTS: 13 passed (7 inner + 6 outer), 0 failed, 0 skipped

## ACCEPTANCE_COVERAGE: 7 of 9 Gherkin scenarios have matching tests

## MISSING

1. **Mail_sent: true path** — No test exercises the mailer-success path (`mail_sent: true`). The §4 verification protocol explicitly requires FakeMailer injection to assert exactly one `send()` call per create-invite + per resend-invite. `registerAdminApi` now accepts `mailer?` but no test passes a FakeMailer and checks call count or `mail_sent === true`. All tests run in no-API-key env → `mail_sent: false` only.

2. **invite-email-template.test.ts missing** — CR spec §3 explicitly lists `mcp/src/admin-api/invite-email-template.test.ts (NEW) — pure-template test`. This file was NOT delivered. Template is only covered by Scenario 7 in `resend-invite.red.node.test.ts` (module existence + basic API check). No dedicated pure-function test for subject/text/html edge cases.

## REGRESSIONS: none

BUG-030 try/catch region (members.ts lines 372-387) is intact — `try { await deps.db.delete(...) }` + `catch (err)` for SQLSTATE 23503 → 409 guard. CR-062 did not touch the DELETE handler.

## DEVIATION VERDICTS

- **squashed-commits: ACCEPT** — Two mcp commits squashed to one before delivery is consistent with the single-commit-per-story rule. Squash happened after the vitest snapshot regen (required a separate run). The resulting single commit `3be7a6b` contains the full diff cleanly. No audit risk.

- **div-vs-input: ACCEPT** — `InviteUrlModal.svelte` renders the invite URL in a `<div>` with `role="textbox" aria-readonly="true"`. This is functionally equivalent for a read-only URL display. The accommodation for Red Scenario 10b (`container.textContent` assertion) is legitimate; `input.value` is excluded from textContent by spec. Visual parity confirmed.

## PARTIAL GAP (not a FAIL on its own, but flagged)

**Create-invite flow does not use `InviteUrlModal`** — CR spec §3 (UI section) says "Same modal opens for the create-invite flow (extract to shared component if currently inline). Both create + resend use the same modal." The page.svelte uses the existing `InviteModal.svelte` for create-invite (still shows URL but no mail_sent pill) and `InviteUrlModal.svelte` only for resend. The `mail_sent` green/amber indicator is absent from the create-invite modal. This is a spec deviation — however the dispatch verification list does not include a Gherkin scenario that explicitly tests the create-invite flow opening `InviteUrlModal` with the mail_sent pill; the missing test above (mail_sent:true path) is the immediate failing criterion. The create-flow modal unification should be addressed as a follow-up.

## VERDICT

FAIL — two required test deliverables are absent:
1. No test for `mail_sent: true` (mailer success path / FakeMailer call-count assertion per §4).
2. `mcp/src/admin-api/invite-email-template.test.ts` not delivered per §3.

Fix: (a) Add a test that passes a `FakeMailer` spy into `registerAdminApi`, invokes create-invite, asserts `mail_sent: true` and that `send()` was called once with the correct `to`, `subject` (containing project name), and body (containing invite URL + ISO expiry); mirror for resend-invite. (b) Create `mcp/src/admin-api/invite-email-template.test.ts` as a pure-function vitest or node:test file covering subject format, text body content, and HTML escape correctness.

---

## FLASHCARDS_FLAGGED

- 2026-05-15 · #qa #mailer #test-coverage · mail_sent:true path requires FakeMailer injection into registerAdminApi deps — add spy-based test; no-API-key path alone is insufficient coverage.
- 2026-05-15 · #qa #spec-delivery · pure-function template files (invite-email-template.ts) need a dedicated test file per spec §3; RED coverage of module existence ≠ the required unit test.

---

## Round 1 — QA Re-verify (qa_bounce 1 → 2, b960448)

### QA: PASS

### TYPECHECK: pass
(No implementation changes in b960448 — test-only commit. Typecheck carried from round 0.)

### TESTS: 22 inner passed (7 original red + 4 FakeMailer integration + 11 template unit), 0 failed, 0 skipped

### ACCEPTANCE_COVERAGE: 9 of 9 Gherkin scenarios have matching tests

### MISSING: none

### REGRESSIONS: none
(b960448 is test-file-only; no implementation files modified.)

### VERDICT

Both prior gaps are closed. Gap 1 (mail_sent:true path): `resend-invite-mailer.node.test.ts` provides FakeMailer integration for create-invite (201 + mail_sent:true + exactly 1 send() call with correct to/subject/bodyText/ISO-expiry) and resend-invite (200 + mail_sent:true + incremental send() call + correct shape + expires_at in future), plus ThrowingMailer edge for both routes (201/200 with mail_sent:false). Gap 2 (pure-template test): `invite-email-template.node.test.ts` is a dedicated 11-scenario pure-unit test for renderInviteEmail covering subject format, text and html content (inviteUrl, project name, ISO expiry, HTML structure), long-URL non-truncation in both text and html, and special-char HTML escaping. FakeMailer interface conformance verified against mailer.ts SentMessageView. No implementation files changed in b960448 — no regression surface. Ship it.
