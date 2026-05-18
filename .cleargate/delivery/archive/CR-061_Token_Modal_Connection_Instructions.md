---
cr_id: CR-061
parent_ref: STORY-006-05
parent_cleargate_id: STORY-006-05
sprint_cleargate_id: SPRINT-27
carry_over: false
area: admin-console
status: Completed
approved: true
context_source: "Direct human ask 2026-05-06 after STORY-006-05 dogfood: token-issued modal currently shows the raw token only. Users (incl. Claude Desktop / Claude Code via stdio) lack a copy-paste connection snippet. Approved 2026-05-14 with 4 §0.5 Qs resolved at Gate-1 ack. Depends on CR-065 (CLEARGATE_SERVICE_TOKEN env auth) shipping first so the stdio tab content references the correct env var name."
created_at: 2026-05-06T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: post-SPRINT-26
updated_at_version: cleargate@0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:23:24Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-14T19:57:38.110Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-061
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T19:50:24Z
  sessions: []
push_version: 1
---

# CR-061: Token-Issued Modal Should Render Connection Instructions + Copyable Snippet

## 0.5 Open Questions

- **Question:** Stdio clients (Claude Desktop, Claude Code) cannot use service tokens today — `cleargate mcp serve` only handles refresh-token + keychain auth. Should the modal show a stdio snippet that won't work, hide it, or surface a "for stdio clients use `cleargate join` instead" pointer?
- **Recommended (original):** Hide the stdio snippet entirely; defer stdio service-token support to a separate CR.
- **Human decision (2026-05-14):** REVISED — fold a working stdio snippet into the modal as a third tab. Companion [[CR-065]] ships `cleargate mcp serve` service-token auth via `CLEARGATE_SERVICE_TOKEN` env in SPRINT-27 W1, unblocking this. Modal shows 3 tabs: (1) HTTP JSON config, (2) curl test, (3) Claude Desktop stdio config. Drop the "use `cleargate join` instead" line.

- **Question:** Snippet shape — Cursor's `mcp.json` schema vs Claude API's native MCP-tool config vs a generic curl test. Show all three or just one canonical form?
- **Recommended:** Two snippet tabs in the modal:
  1. **Generic JSON config** (works for Cursor, Cline, custom agents — `{ url, headers: { Authorization } }`).
  2. **curl one-liner** for connection-test (`curl -X POST .../mcp -H "Authorization: Bearer ..." -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`) — proves auth works before wiring an agent.
  3. **Claude Desktop / stdio config** (added per Q1 revision): `{ "mcpServers": { "cleargate": { "command": "cleargate", "args": ["mcp", "serve"], "env": { "CLEARGATE_SERVICE_TOKEN": "<token>" } } } }`.
  Skip Claude-API-specific shape; that audience is Anthropic-SDK-savvy enough to translate.
- **Human decision (2026-05-14):** Accepted — three tabs (JSON config + curl + stdio).

- **Question:** Where does the MCP base URL come from? Hardcoded `https://cleargate-mcp.soula.ge` per the cleargate-cli default, or read from the admin UI's environment so self-hosted deployments show the right URL?
- **Recommended:** Read from `PUBLIC_MCP_URL` (already wired via `$env/dynamic/public` in admin). The admin UI is per-deployment, so its `PUBLIC_MCP_URL` is authoritative for the snippets it renders.
- **Human decision (2026-05-14):** Accepted — read from `PUBLIC_MCP_URL`.

- **Question:** The "where do pulled items land?" warning — agent instructions decide, not the token. Worth surfacing in the modal, or out-of-scope?
- **Recommended:** One sentence in the modal footer: "Pulled items land wherever the agent's instructions say. Install ClearGate scaffold in the target repo (`npx cleargate init`) for auto-routing to `.cleargate/delivery/pending-sync/`." Prevents the inevitable "I pasted the token but nothing happened" support question.
- **Human decision (2026-05-14):** Accepted — include footer line.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- Token-Issued modal currently shows: token name, plaintext value (copyable), and an "I've saved it" gate. End of story. The user is left to figure out for themselves how to plug the token into a client.

**New Logic (The New Truth):**
- Token-Issued modal shows everything above PLUS:
  1. A copyable **MCP HTTP config snippet** (`url` + `headers.Authorization: Bearer <token>`) using the admin UI's `PUBLIC_MCP_URL` as the base URL.
  2. A copyable **curl test command** that calls `tools/list` against `/mcp` so the user can verify the token before wiring an agent.
  3. A copyable **stdio config snippet** (Claude Desktop / Claude Code) — JSON shape `{ "mcpServers": { "cleargate": { "command": "cleargate", "args": ["mcp", "serve"], "env": { "CLEARGATE_SERVICE_TOKEN": "<token>" } } } }`. Requires [[CR-065]] (`cleargate mcp serve` service-token auth) shipping in same sprint W1.
  4. A one-line **routing reminder**: "Pulled items land where the agent's instructions say. Run `npx cleargate init` in the target repo for `.cleargate/delivery/pending-sync/` auto-routing."
- The "I've saved it" gate still applies; the snippet is shown alongside the plaintext, not after dismissal.
- Plaintext token interpolation into the snippets must use the in-memory Svelte state from STORY-006-05 — no localStorage / sessionStorage write of the rendered snippet either.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Story: STORY-006-05 (Tokens Page) — already shipped; this CR extends it. No re-test of existing scenarios; new scenarios are additive.
- [ ] Invalidate/Update Epic: EPIC-006 — Completed. CR scope is post-ship UX; doesn't reopen the epic.
- [ ] Database schema impacts? **No.** Pure UI change. Token issuance API and storage unchanged.

**Downstream cascade:**
- E2E test `admin/tests/e2e/tokens-modal.spec.ts` (or wherever the STORY-006-05 modal test lives) gains 2-3 new assertions: snippet renders with the issued plaintext interpolated; copy buttons fire; no plaintext leaks to storage.
- No CLI/MCP/Adapter API changes. No documentation propagation needed beyond the modal itself.

## 2.5 Existing Surfaces

- **Surface:** `admin/src/lib/components/TokenIssuedModal.svelte` — current modal that renders plaintext + "I've saved it" gate after a successful POST `/admin-api/v1/projects/<id>/tokens`. This CR extends the modal's body; it does not replace the gate or the storage-leak guards.
- **Surface:** `admin/src/lib/components/TokenIssueForm.svelte` — form whose submit handler triggers the modal. Untouched by this CR.
- **Surface:** `admin/src/routes/projects/[id]/tokens/+page.svelte` — page that hosts the form + modal. Untouched.
- **Surface:** `admin/src/lib/env.ts` (or equivalent `$env/dynamic/public` consumer) — already exposes `PUBLIC_MCP_URL`; the modal will import the same source rather than re-deriving.
- **Why this CR extends rather than rebuilds:** The modal exists, the plaintext-once discipline is enforced, and the storage-leak tests are green. We are appending two snippet blocks + two informational lines to the modal body. No existing assertions are invalidated.

## 3. Execution Sandbox

**Modify:**
- `admin/src/lib/components/TokenIssuedModal.svelte` — add a `<section class="connect-snippets">` block below the plaintext field; render two `<pre>` snippets (JSON config + curl command) with copy buttons reusing the existing `CopyButton` component (or whatever STORY-006-05 used); add stdio-redirect and routing-reminder lines.
- `admin/src/lib/components/__tests__/TokenIssuedModal.test.ts` (or `.svelte.test.ts` per the rune-mode convention) — extend with 3 unit cases: snippet interpolation, copy-button behavior, no-storage-leak invariant carries over.
- `admin/tests/e2e/tokens-modal.spec.ts` (Playwright) — extend the existing modal-flow test to assert the two snippets appear with the plaintext substituted, both copy buttons fire, and `localStorage`/`sessionStorage` still don't receive the plaintext after copy.

**Do NOT modify:**
- `mcp/src/admin-api/tokens.ts` — server-side issuance unchanged.
- `mcp/src/auth/service-token.ts` — auth path unchanged.
- `cleargate-cli/src/commands/mcp-serve.ts` — stdio bridge gap is out of scope for this CR.
- The token storage schema, the "I've saved it" gate, or the plaintext-once discipline.

## 4. Verification Protocol

**Commands:**
```sh
# Unit
cd admin && npm test -- TokenIssuedModal

# E2E (requires admin dev server + mocked admin-api)
cd admin && npm run test:e2e -- tokens-modal

# Manual
cd admin && npm run dev
# Issue a token in /projects/<id>/tokens; verify:
# - JSON snippet shows {"url": "https://cleargate-mcp.soula.ge/mcp", "headers": {"Authorization": "Bearer <43-char-plaintext>"}}
# - curl snippet shows the same token, calling /mcp with tools/list
# - Both copy buttons fire and write to clipboard
# - DevTools → Application → localStorage and sessionStorage: token plaintext absent
```

**Pass criteria:**
- All three test layers green.
- Storage-leak invariant from STORY-006-05 remains green.
- Manual: copy the JSON snippet → paste into a Cursor/Cline-style MCP config → `tools/list` returns the 10 cleargate tools without a 401.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this CR extends.

- **Surface:** `admin/src/lib/mcp-client.ts` — existing MCP-client wiring on the admin side; the 3-tab snippet's curl-tab and stdio-tab values are derived from the same `mcpUrl` resolution this file performs.
- **Surface:** `cleargate-cli/src/commands/mcp-serve.ts` — current MCP-serve entry; the stdio tab cites the CLEARGATE_SERVICE_TOKEN env path added by CR-065.

The token-issued modal itself (`admin/src/lib/components/TokenIssuedModal` — Svelte file extension intentionally not cited by full path because the readiness-gate regex caps file extensions at 5 chars; see SPRINT-27 plan §Execution Guidelines) is the primary edit target.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution.** All four §0.5 questions resolved 2026-05-14. Q1 reversed: stdio snippet shown as 3rd tab; companion [[CR-065]] ships service-token auth in SPRINT-27 W1.

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity. (Only the modal-test scope; STORY-006-05 itself stays Done.)
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
- [x] All §0.5 Open Questions resolved.
