---
cr_id: CR-006
parent_ref: EPIC-019
parent_cleargate_id: "EPIC-019"
status: Completed
approved: true
completed_at: 2026-04-25T13:59:00Z
created_at: 2026-04-25T00:00:00Z
updated_at: 2026-04-25T13:59:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-25T10:10:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-006
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-25T00:05:29Z
  sessions: []
---

# CR-006: CLI `cleargate join` Provider Selection UX

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Single-shot redemption: `cleargate join <url>` does one POST to `/join/:token` and either succeeds or fails (`cleargate-cli/src/commands/join.ts:71`). No interactive flow, no provider concept.
- The assumption that a redemption is bounded by a single HTTP round-trip — provider-driven flows are inherently multi-step (open browser, wait for email, paste code).

**New Logic (The New Truth):**
- `cleargate join <url>` becomes a **two-step orchestrator**:
  1. Determine provider: explicit `--auth <github|email>` flag, OR interactive picker if not specified, OR defaulted to the invite's `required_provider` if the server pins one
  2. POST `/join/:token/challenge { provider }`; render `clientHints` (open URL in browser for OAuth, or show "code sent to a***@x.com" for magic-link)
  3. Drive the provider-specific completion: poll for OAuth, prompt for the magic-link code on stdin
  4. POST `/join/:token/complete { challengeId, proof }`; on success, seat the JWT (existing `TokenStore.save` path unchanged)
- Shared CLI helpers in `cleargate-cli/src/auth/identity-flow.ts` so `cleargate admin login` can reuse the same renderer (no duplicated polling/prompting code).
- `--non-interactive` flag for CI/scripted invitations: requires `--auth email --code <code>` to skip the prompt (presupposes a separate `--challenge-id` flag once the email is sent — niche, document but don't over-build).

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Epic: [[EPIC-019]] — closes the user-facing surface
- [ ] Invalidate/Update existing CLI: `cleargate-cli/src/commands/join.ts:26` — request shape, response handling, all changes
- [ ] Invalidate/Update existing CLI: `cleargate-cli/src/commands/admin-login.ts` — refactor onto shared `identity-flow.ts` helpers (no UX regression for admin-login)
- [ ] Invalidate/Update tests: `cleargate-cli/test/commands/join.test.ts` (and admin-login equivalents) — must cover new two-step flow + provider selection
- [ ] Database schema impacts: **No**
- [ ] Hard dependency: CR-003 (server endpoints must exist)
- [ ] Soft dependency: CR-004 + CR-005 (at least one provider must be live for the CLI to do anything useful end-to-end)

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/join.ts` — replace single-shot POST with two-step orchestrator; preserve current invite-URL parsing (lines 37–66) and `TokenStore.save` (lines 147–148)
- `cleargate-cli/src/commands/admin-login.ts` — consume `identity-flow.ts` helpers; admin-login UX MUST remain identical (regression-test contract)
- `cleargate-cli/src/cli.ts:39` — extend `cleargate join` command definition with `--auth <provider>`, `--non-interactive`, `--code <code>` options

**Create:**
- `cleargate-cli/src/auth/identity-flow.ts`:
  - `pickProvider({available, requiredProvider, flag})` — resolves which provider to use (flag > pinned > interactive picker > error if non-interactive)
  - `renderChallenge(provider, clientHints)` — pretty-prints next-step instructions (open URL, show user_code, show masked email)
  - `pollOAuth(challengeId, interval)` — long-polls `/join/:token/complete` (or a dedicated poll endpoint) for OAuth providers
  - `promptCode()` — reads code from stdin (with TTY-aware masking; honors `--code` flag for non-interactive)
- `cleargate-cli/src/auth/identity-flow.test.ts` — unit tests for each helper
- `cleargate-cli/test/commands/join-multi-provider.test.ts` — end-to-end test against a mock MCP

**Do NOT modify in this CR:**
- `cleargate-cli/src/config.ts` — config schema unchanged
- `TokenStore` or keychain integration — unchanged
- Any MCP server code (CR-003/004/005's sandbox)

## 4. Verification Protocol

**Command/Test:**
```bash
cd cleargate-cli && npm test
cd cleargate-cli && npm run typecheck
```

**Required test scenarios (new + regression):**
- New: `cleargate join <url> --auth github` → opens browser to verification URI, polls, seats JWT on success
- New: `cleargate join <url> --auth email` → shows "code sent to a***@x.com", reads code from stdin, seats JWT on success
- New: `cleargate join <url>` (no flag) when server reports `required_provider="github"` → auto-selects github, no interactive picker
- New: `cleargate join <url>` (no flag, no pin, TTY) → interactive picker lists registered providers
- New: `cleargate join <url> --non-interactive` without `--auth` → exits 1 with "provider required in non-interactive mode"
- New: `cleargate join <url> --auth email --non-interactive` without `--code` → exits 1 with "magic-link requires code in non-interactive mode"
- New: server returns 403 `email_mismatch` → CLI prints user-readable error ("verified email does not match the invitee — ask your admin to re-issue") and exits 1; no token seated
- New: provider error mid-flow (network drop while polling) → exits 1 with retry hint; challenge state not corrupted
- New: FLASHCARD #plaintext-redact — magic-link code never appears in CLI debug logs (`--log-level debug` test must show redaction)
- Regression: `cleargate admin login` — UX is byte-identical to pre-refactor (snapshot test on rendered output)
- Regression: `cleargate whoami` after a successful new-flow join → returns the same shape as pre-refactor

**Eviction confirmation:**
- `cleargate-cli/src/commands/join.ts` no longer contains a direct POST to `/join/:token` (legacy single-shot path is gone)
- `cleargate-cli/src/commands/admin-login.ts` and `commands/join.ts` share ≥80% of their orchestration logic via `identity-flow.ts` (no copy-paste)

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity** (was 🔴; downgraded after EPIC-019 §6 resolved 2026-04-25)

**Resolved decisions:**
- **Magic-link UX:** 6-digit code, pasted into CLI prompt. `promptCode()` reads from stdin with TTY echo (codes are short-lived OTPs, not long-term secrets — visible echo is fine; matches GitHub device-flow shape).
- **OAuth polling:** CLI-side polling (preserves existing `cleargate admin login` behaviour; smaller MCP surface; consistent with the server `IdentityProvider.completeChallenge` returning pending vs. complete).
- **Interactive picker:** When TTY + multiple providers registered + no `--auth` flag + no `required_provider` pin → show picker. When only one provider registered → auto-select silently. Non-TTY without flag → exit 1 with hint.

Requirements to pass to Green (Ready for Execution):
- [ ] CR-003 merged (server endpoints exist)
- [ ] At least one provider CR (CR-004 OR CR-005) merged so end-to-end smoke is possible
- [x] EPIC-019 §6 Q4 answered: paste-6-digit-code in CLI
- [x] OAuth polling decision: CLI-side (matches CR-004)
- [x] Interactive picker UX reviewed: auto-select on single provider
- [ ] `approved: true` set in YAML frontmatter
