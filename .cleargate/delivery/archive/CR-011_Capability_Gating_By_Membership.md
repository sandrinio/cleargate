---
cr_id: CR-011
parent_ref: EPIC-021
parent_cleargate_id: EPIC-021
status: Completed
approved: true
approved_at: 2026-04-29T00:00:00Z
approved_by: sandrinio
created_at: 2026-04-26T00:00:00Z
updated_at: 2026-04-26T00:00:00Z
created_at_version: 0.5.0
updated_at_version: 0.5.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T11:52:13Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-011
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-29T11:17:12Z
  sessions: []
---

# CR-011: Capability Gating of Sync Surface by Membership State

## 0. Live Evidence (Why Now)

`cleargate init` installs the full CLI surface — `push`, `pull`, `sync`, `admin issue-token`, `admin create-project`, `sync-log`, `conflicts` — into every fresh repo, regardless of whether the user has joined a project. The injected `CLAUDE.md` block (cleargate-planning/CLAUDE.md) lists `init, join, whoami, push, pull, sync, admin issue-token, wiki build, gate check, doctor` as the curated 10 most-used commands. **None of these are conditioned on membership state.**

Concrete failure mode (the same UX failure EPIC-021 was written to fix, but at a different layer):

1. User runs `npx cleargate init` in a fresh repo.
2. User opens Claude Code. Agent reads CLAUDE.md, sees the 10-command list, sees the four-agent protocol, sees the "Halt at gates → push when approved" flow.
3. Agent drafts a Proposal, asks for approval, gets it, then attempts `cleargate push`.
4. Push fails with a cryptic auth error (no JWT on disk because the user never ran `cleargate join <url>`).
5. Agent retries, escalates, or hallucinates a workaround. The user is stuck.

The root issue: ClearGate exposes its **post-membership surface to pre-membership users**. There is no progressive disclosure. The agent is told "here are 10 commands; some require sync" with no rule for *which subset is reachable now*.

User principle (turn that surfaced this): *"Sync becomes available to the user once someone creates a project in admin panel, invites the user, and user joins the project. All sync-to-MCP related skills should be enabled then."*

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "All CLI commands are listed in `cleargate --help` regardless of membership." False as a UX assumption — it is technically true but it misleads agents into recommending paths the user cannot execute.
- The injected CLAUDE.md "CLI Commands" section (cleargate-planning/CLAUDE.md, lines around the post-EPIC-021 10-command list) does not differentiate pre-join from post-join surface.
- "The conversational agent should follow the four-agent loop including `cleargate_push_item` from minute one." False when no membership exists.
- Per-command auth errors (e.g. `push` failing with "no auth token") are sufficient guidance. False — they are cryptic, lack the suggested next step (`cleargate join <url>`), and arrive *after* the agent has already drafted, approved, and tried to push.

**New Logic (The New Truth):**

Two states. Detect transition. Adapt agent surface accordingly.

**State A — Pre-membership (default after `cleargate init`):**
- *Reachable surface:* `init`, `join`, `whoami`, `wiki build`, `wiki query`, `wiki lint`, `gate check`, `stamp`, `doctor`, `scaffold-lint`, `upgrade`, `uninstall`, `sprint`/`story`/`state` (local artifacts only).
- *Hidden/gated:* `push`, `pull`, `sync`, `sync-log`, `conflicts`, `admin *` (except `admin login`).
- *Agent guidance (CLAUDE.md):* "You can plan, draft, and refine work items locally. To push to the PM tool you must first run `cleargate join <invite-url>`. Ask the user for the invite URL when ready."

**State B — Post-membership (`cleargate whoami` resolves to a member of an active project):**
- Full surface available. Existing four-agent loop and Push/Pull/Sync flows apply.

**Detection mechanism (proposed; confirm in §3):**
- Source of truth: `~/.cleargate/auth/<profile>.json` exists AND its JWT decodes to a non-expired claim with a `member_id` (or whatever the EPIC-019 invite-redeemed token carries).
- Cheap-path detection: file existence + non-expiry, no network call. The first network call (push/pull/sync) re-verifies; if revoked, the gating reverts to State A on next session.
- Exposed via: `cleargate whoami --json` returns `{ state: 'member' | 'pre-member', email?: ..., project_id?: ... }`. A non-zero exit happens only on parse errors.

**Surfaces that must adapt:**
1. **CLI help text** — `cleargate --help` filters the command list by current state. Hidden commands print a one-liner "(requires `cleargate join`)" if invoked directly.
2. **Direct command invocation** — `cleargate push <file>` in State A exits 2 with a structured stderr: `cleargate push requires membership. Run: cleargate join <invite-url>`. Same for pull/sync/sync-log/conflicts.
3. **`admin` subcommands** — gated separately by role (admin token), but pre-membership users see *no* admin surface unless they hold an admin token. `admin login` is the only entry point.
4. **Injected CLAUDE.md** (cleargate-planning/CLAUDE.md) — adds a state-aware block: "If `cleargate whoami` reports `pre-member`, treat sync commands as unreachable; redirect the user to `cleargate join`."
5. **SessionStart hook** — `cleargate doctor --session-start` emits a one-line state banner: `ClearGate state: pre-member — local planning enabled, sync requires join.` or `ClearGate state: member (project: …) — full surface enabled.`
6. **Subagents** — Architect/Developer/QA/Reporter are local-only and unchanged. Wiki ingest/lint/query are local-only. **Only the conversational agent's prompt template changes.**

## 2. Blast Radius & Invalidation

- [x] Invalidate/Update Story: STORY-019-XX (token-first join CLI under EPIC-021) — its acceptance does not currently include a state-banner / capability-gating contract. CR-011 amends the contract; story decomposition under EPIC-021 should add a story for this gating layer.
- [x] Invalidate/Update Epic: **EPIC-021** (Solo Onboarding DX) is the parent. CR-011 closes the DX gap that EPIC-021 leaves open: token-first join now works, but pre-join users still see the post-join surface.
- [ ] Database schema impacts: **None.** Membership detection is local (auth file + JWT claim parse).
- [ ] Cross-repo: change ships via `cleargate-cli` (the binary) + `cleargate-planning/CLAUDE.md` (the injected block) + `cleargate-planning/.claude/hooks/session-start.sh` (the SessionStart hook). All three are part of the next `npx cleargate` release.
- [ ] FLASHCARD impact: add card on completion — *"CLI surface is membership-aware. `cleargate whoami --json` returns `{state}`; pre-member state hides push/pull/sync/sync-log/conflicts/admin* with redirect-to-join messages. Detection is cheap (file + JWT claim parse), no network."*
- [ ] Manifest impact: no new files, but `session-start.sh` and `CLAUDE.md` injected templates change → rev their `manifest_hash` so `cleargate upgrade` re-applies them.
- [ ] Backward compatibility: existing meta-repo and any project that has already redeemed a token continues to work — `whoami` returns `member`, full surface enabled, no behavior change. Pre-member state is a *new* code path.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/whoami.ts` — add `--json` mode returning `{ state, email?, project_id?, expires_at? }`. State derived from auth file presence + JWT decode + expiry check. No network call.
- `cleargate-cli/src/lib/membership.ts` — **new file.** Single source of truth for state detection. Exports `getMembershipState(profile?: string): MembershipState`. Used by whoami, by per-command guards, by doctor.
- `cleargate-cli/src/cli.ts` — pre-action hook on each Commander subcommand: for sync-touching commands (`push`, `pull`, `sync`, `sync-log`, `conflicts`, `admin *` minus `admin login`), if state === 'pre-member', exit 2 with stderr message including the literal `cleargate join <invite-url>` redirect. Help-text filter so `--help` lists only reachable commands when state is pre-member; an explicit `--all` flag prints the full surface.
- `cleargate-cli/src/commands/doctor.ts` — `--session-start` mode emits a state banner as the first line of output (one of two literal strings declared in §1).
- `cleargate-planning/.claude/hooks/session-start.sh` — pipe doctor output through (already addressed in CR-008 Phase A; this CR depends on that landing first or wires the same change as a fallback).
- `cleargate-planning/CLAUDE.md` — add a new bounded subsection after the "CLI Commands" 10-command list: **"State-aware surface."** Three to five lines: how to read the SessionStart banner, what subset of commands is reachable in each state, what to recommend in pre-member state.
- `cleargate-cli/test/commands/whoami.test.ts` — new scenarios for `--json` output in member, pre-member (no auth file), pre-member (expired JWT), and pre-member (malformed JWT) cases.
- `cleargate-cli/test/lib/membership.test.ts` — **new file.** Unit tests for `getMembershipState` across the same four cases plus profile-switching.
- `cleargate-cli/test/commands/cli-gating.test.ts` — **new file.** Integration tests: invoke `push`/`pull`/`sync`/`admin issue-token` in pre-member state; assert exit 2 + redirect message. Invoke same commands in member state; assert no extra friction.
- `cleargate-cli/test/commands/doctor.test.ts` — extend with state-banner emission scenarios.

**Out of scope:**
- Refactoring the four-agent loop (Architect/Developer/QA/Reporter are local-only; unaffected).
- Wiki sync via MCP (separate Epic).
- Advisory readiness gates on push (CR-010).
- Network-time membership re-validation (rely on the next push/pull failing if revoked; do not add a heartbeat).
- Admin role-level gating (admin token vs member token) — that's an EPIC-005 / EPIC-019 concern and should land separately if not already covered.

## 4. Verification Protocol

**Acceptance:**
1. **Fresh repo, no join.** `mkdir /tmp/cg-test && cd /tmp/cg-test && npx cleargate init`. Open Claude Code.
   - Assert: SessionStart banner reads `ClearGate state: pre-member — local planning enabled, sync requires join.`
   - Assert: `cleargate --help` lists `init join whoami wiki gate stamp doctor scaffold-lint sprint story state upgrade uninstall` and **omits** `push pull sync sync-log conflicts admin`. `cleargate --help --all` lists everything.
   - Assert: `cleargate push some-file.md` exits 2; stderr includes the literal `cleargate join`.
   - Assert: agent reading the new CLAUDE.md does not suggest push/pull until the user reports a successful join.
2. **After join.** Run `cleargate join <valid-invite-url>`. Reopen the session.
   - Assert: SessionStart banner reads `ClearGate state: member (project: …) — full surface enabled.`
   - Assert: `cleargate --help` lists the full command set without the `--all` flag.
   - Assert: `cleargate push <approved-file>` proceeds (no gating message).
3. **Expired token.** Manually expire the JWT in `~/.cleargate/auth/default.json`.
   - Assert: state returns to pre-member; banner and help output match step 1; agent reverts to "needs join" guidance.
4. **`whoami --json` contract.** Member state returns `{ state: 'member', email, project_id, expires_at }`. Pre-member state returns `{ state: 'pre-member' }` with no PII fields.
5. **Backward compatibility.** Existing meta-repo (`/Users/ssuladze/Documents/Dev/ClearGate`) shows `member` state on first session after upgrade; no commands gated; no behavior change in normal flows.

**Test commands:**
- `cd cleargate-cli && npm run typecheck && npm test` — green.
- `cd cleargate-cli && npm test whoami.test.ts membership.test.ts cli-gating.test.ts doctor.test.ts` — focused.
- Manual smoke per acceptance steps 1 and 2 in a clean tmp dir.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared (full-surface help, undifferentiated CLAUDE.md command list, cryptic auth errors).
- [x] All impacted downstream Epics/Stories are identified (EPIC-021 parent; STORY-019 token-first join contract amended).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] **Open question:** Detection mechanism. Draft picks **cheap-path** (auth-file + JWT-claim + expiry, no network). Alternative is a real `whoami` HTTP call against the MCP. Cheap-path is fast and works offline; alternative catches server-side revocation immediately. Confirm choice.
- [ ] **Open question:** What about the `admin` token holder who has not joined a project? Today an admin can `admin issue-token` without belonging to any project. CR-011 draft hides `admin *` in pre-member state, but `admin login` should remain visible. Confirm whether admin-only users (no project membership) should be a *third* state or folded into `member`.
- [ ] **Open question:** Help-text filtering. Draft picks "hide by default, show with `--all`". Alternative is "always show, mark with `(requires join)` suffix". The first is cleaner but trains the user to not know what's possible; the second is more discoverable but cluttered. Confirm.
- [ ] **Open question:** Dependency on CR-008 (SessionStart hook stops swallowing doctor stdout). CR-011 needs the same plumbing. Land CR-008 first, or include a defensive duplicate of that fix here?
- [ ] `approved: true` is set in the YAML frontmatter.
