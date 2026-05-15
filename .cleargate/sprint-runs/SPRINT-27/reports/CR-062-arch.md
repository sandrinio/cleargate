---
work_item: CR-062
sprint: SPRINT-27
agent: architect
phase: post-flight
status: approved
inner_mcp_commit: 3be7a6b
outer_commit: 1f5cb1f
---

# CR-062 — Architect Post-Flight Review

ARCH-PASS: APPROVED

## Verification (10 checks)

1. **members.ts region isolation — PASS.** CR-062 edits live in (a) the `POST /:pid/members` create-invite handler around line 259 (mailer call insertion before reply.send), and (b) the new `POST /members/:mid/resend-invite` route handler at line 296. BUG-030's `db.delete(members)` try/catch at line 373 with `23503 → member_has_dependents` is intact and untouched (verified by `git show 3be7a6b -- src/admin-api/members.ts`).
2. **invite-email.ts structure — PASS.** Single export `sendInviteEmail(mailer, log, input)`; returns false on `!mailer` (no key) AND on caught `mailer.send` throw; never throws back. `magic-link-provider.ts:88` pattern matched (`this.mailer.send(to, subject, text)` shape).
3. **invite-email-template.ts structure — PASS.** Pure function `renderInviteEmail({projectName, inviteUrl, expiresAt}) → {subject, text, html}`. Zero I/O imports. Subject contains project name; body contains URL and ISO expiry. (Note: dispatch verify-list said `buildInviteEmail`; M1 plan and the actual implementation say `renderInviteEmail` — matches the plan.)
4. **Mailer consumer pattern — PASS.** `Mailer | null | undefined` defensive type. Null/undefined returns false without throwing. Try/catch wraps `mailer.send`. Aligned with magic-link-provider precedent.
5. **OpenAPI sync — PASS.** `openapi.ts:78-94` adds `mail_sent: boolean` to InviteCreated (required) and a new `ResendInvite` schema with the four wire fields. Snapshot `__snapshots__/openapi.test.ts.snap` regenerated; new path `/members/{mid}/resend-invite` present at snapshot line 1215.
6. **Zod schema sync — PASS-with-note.** `cleargate-cli/src/admin-api/responses.ts:42` adds `mail_sent: z.boolean()` (REQUIRED, not optional) to InviteCreatedSchema. Server emits this field in lockstep, so the in-sprint contract holds. Documented under DEVIATION_VERDICTS below.
7. **Svelte component extraction — PASS.** `admin/src/lib/components/MembersList.svelte` is a clean Svelte 5 `$props()` component (`members, onresend, onremove`). `+page.svelte` imports it at line 24 and renders it at line 181; no inline row-rendering remains.
8. **InviteUrlModal single-modal — PASS.** Props `{open, inviteUrl, expiresAt, recipientEmail, mailSent, onclose}`. Renders green badge-success when `mailSent`, amber badge-warning otherwise. Reuses `Modal.svelte` shell. Page uses one instance for both create and resend (see deviation #2 below for div-vs-input).
9. **lucide-svelte icons — PASS.** `Send` + `Trash2` imported from `lucide-svelte`. Send only renders when `member.status === 'pending'`; Trash2 always renders. Both have `aria-label` AND `title`. Mobile card stack mirrors the same icon rule.
10. **Server wiring — PASS.** `mcp/src/server.ts` lifts `mailerInstance` to module scope and passes it into `registerAdminApi(app, {...mailer: mailerInstance})`. `admin-api/index.ts:34-35` declares `mailer?: Mailer | null` on `AdminApiDeps` and forwards to `registerMembersRoutes` at line 137 with `mailer: deps.mailer ?? null`. Null-safety preserved end-to-end.

## NOTES

CR-062 lands clean. The blueprint's three goal-advancement promises hold: resend route exists with the four documented response cases (pending/consumed/missing/non-owner), create-invite path now emits mail through the seam, and the UI extracts a reusable `MembersList` component while consolidating the URL handoff in `InviteUrlModal`. Mailer-optional path returns `mail_sent: false` without throwing, matching CR §0.5 Q4. Snake_case wire field names hold (`mail_sent`, `expires_at`, `invite_token`, `invite_url`, `recipient_email`). Test seam wiring (Mailer interface) and openapi/zod schemas track in lockstep. No untouched files in BUG-030's DELETE handler region; the two CRs cleanly share the file via different symbol regions as SDR §2.2 predicted.

One minor architectural footnote: the resend handler introduces a private helper `resolveMemberWithOwnership` (line 138) that one-shot resolves the member + project + ownership check instead of two round-trips via the existing `assertProjectOwned`. Not a plan deviation — the M1 blueprint said "reuse assertProjectOwned" but the implementation's one-query variant is functionally equivalent and faster. Acceptable.

## STRUCTURAL_DEBT

- **InviteCreatedSchema `mail_sent` is required, not optional.** With `.strict()`, any future CLI consumer pinned to an older MCP server image (pre-CR-062) will fail to parse the create-invite response. Mitigated by the fact that `cleargate-cli` and `mcp` ship from the same monorepo and rev together. Watch on next stable-pin rotation; if the CLI ever needs to talk to a stale server, demote to `.optional()` with default `false`. Logged here, not blocking.

## DEVIATION_VERDICTS

- **squashed-commits: ACCEPT.** Two mcp commits squashed to one (`3be7a6b`) per the one-commit-per-story rule (CLAUDE.md "Test + commit conventions"). The intermediate snapshot-regen commit was a vitest-tool artifact, not a logical step. Squash is rule-compliant.
- **div-vs-input: ACCEPT.** InviteUrlModal renders the URL inside `<div role="textbox" aria-readonly="true" aria-label="Invite URL">` instead of `<input readonly>`. Rationale (per Dev report): testing-library's `container.textContent` excludes `input.value`, and the Red Scenario 10b asserts URL presence via textContent. Adding `role="textbox"` + `aria-readonly="true"` preserves screen-reader semantics; visual rendering is read-only either way. Flashcard already recorded (`2026-05-15 · #svelte #testing-library`).

## Files reviewed

- `mcp/src/admin-api/members.ts` (post-3be7a6b — region L131–L347)
- `mcp/src/admin-api/invite-email.ts` (NEW)
- `mcp/src/admin-api/invite-email-template.ts` (NEW)
- `mcp/src/admin-api/invites.ts` (`findActivePendingByMember`, `bumpExpiry` added)
- `mcp/src/admin-api/index.ts` (Mailer on AdminApiDeps)
- `mcp/src/admin-api/openapi.ts` (L78–94 InviteCreated + ResendInvite)
- `mcp/src/admin-api/__snapshots__/openapi.test.ts.snap` (regenerated)
- `mcp/src/server.ts` (mailerInstance hoisted to module scope)
- `cleargate-cli/src/admin-api/responses.ts` (InviteCreatedSchema.mail_sent)
- `admin/src/lib/components/MembersList.svelte` (NEW @ 1f5cb1f)
- `admin/src/lib/components/InviteUrlModal.svelte` (NEW @ 1f5cb1f)
- `admin/src/routes/projects/[id]/members/+page.svelte` (post-1f5cb1f — uses MembersList + shared InviteUrlModal)

## Routing

DevOps may proceed to merge `story/CR-062` into `sprint/S-27` and then mark CR-062 Done.
