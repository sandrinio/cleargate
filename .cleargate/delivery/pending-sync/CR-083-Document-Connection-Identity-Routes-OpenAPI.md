---
cr_id: CR-083
parent_ref: EPIC-047
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: "SPRINT-36"
carry_over: false
status: Draft
approved: false
context_source: EPIC-047 (SPRINT-36 shipped) + verified codebase grounding (live /openapi.json probe 2026-06-05) + recorded direct approval
owner: Sandro
area: connector
created_at: 2026-06-05T00:00:00Z
updated_at: 2026-06-05T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: existing-surfaces-verified
      detail: "cited paths do not exist on disk: mcp/src/admin-api/openapi.ts, mcp/src/admin-api/connections.ts, mcp/src/admin-api/index.ts"
  last_gate_check: 2026-06-05T07:16:46Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-083
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-05T07:16:46Z
  sessions: []
---

# CR-083: Document connection-identity routes in the mcp admin-api OpenAPI spec

## 0.5 Open Questions

> Populate during drafting. Resolve every entry before flipping ambiguity to 🟢.

- **Question:** Should the broker-facing `POST /connections/verify` appear in the same public spec as the admin-JWT routes, given it uses a *different* auth scheme (service token, not admin JWT)?
- **Recommended:** Yes — include it, but declare a distinct OpenAPI `securityScheme` (`serviceToken` bearer) on that one operation so the Scalar explorer prompts for the correct credential. The spec is already public (`/openapi.json` requires no auth); documenting the route does not widen exposure — the route already exists and is reachable.
- **Human decision:** {populated during Brief review}

- **Question:** Add a regression test that fails if a future connection route ships without a spec entry?
- **Recommended:** Yes — a single `openapi-connection-coverage.node.test.ts` asserting the 8 paths below are present in `getOpenApiDocument().paths`. This is what would have caught the gap in SPRINT-36.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- The assumption that "the route works ⇒ the API is documented." SPRINT-36 / EPIC-047 shipped eight connection-identity routes whose handlers are live and tested, but the **hand-maintained** `OPENAPI_DOC` object in `mcp/src/admin-api/openapi.ts` was never extended to cover them. The spec is authored by hand, not generated from the route table, so new routes do not self-document.
- As a result, the Scalar in-browser explorer at `/admin-api/v1/reference/` (backed by `/admin-api/v1/openapi.json`) renders only the pre-EPIC-047 surface (`projects`, `members`, `tokens`, `audit`, `stats`, `admin-users`, `auth/*`). A human opening the explorer cannot see or fire the pairing / app-token / verify operations.

**New Logic (The New Truth):**
- Every shipped admin-api connection-identity route MUST have a matching OpenAPI path entry, so `/openapi.json` and the Scalar explorer reflect the real, reachable surface. The eight routes to document:
  - `POST   /projects/{pid}/pairings` — mint pairing code (returns one-time `code: "<id>.<secret>"`)
  - `GET    /projects/{pid}/pairings` — list pairings (metadata only)
  - `POST   /pairings/{id}/consume` — atomic one-time consume
  - `DELETE /pairings/{id}` — revoke
  - `POST   /projects/{pid}/app-tokens` — mint app token (returns one-time `token: "<token_id>.<secret>"`)
  - `GET    /projects/{pid}/app-tokens` — list app tokens (metadata only)
  - `DELETE /app-tokens/{id}` — revoke (writes `rev:apptoken:<id>` + Redis publish)
  - `POST   /connections/verify` — broker-facing fail-closed verify (service-token auth; always HTTP 200 with `{ valid, reason? }`)
- The `verify` operation is annotated with a distinct `serviceToken` security scheme so the explorer prompts for the broker service token, not an admin JWT.

## 2. Blast Radius & Invalidation

*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Invalidate/Update Story: none — STORY-047-02/03/04 are merged + Completed; this CR is **additive documentation**, it does not change their shipped behavior or re-open them.
- [x] Update Epic: [[EPIC-047]] — adds a doc-coverage acceptance item; does not alter the identity contract.
- [ ] Database schema impacts? **No.** No migration, no schema change. Pure spec-object edit (+ one test).
- **Runtime behavior impact:** none. The spec doc is descriptive metadata; adding paths changes no handler, no auth, no wire format.
- **Risk:** low. Worst case a path entry's schema drifts from the handler's real shape — mitigated by the coverage test (presence) and by copying field shapes from the existing DTO mappers (`toPairingDto` / `toAppTokenDto` / `VerifyResult`).

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `mcp/src/admin-api/openapi.ts:905` (`OPENAPI_DOC` / `getOpenApiDocument()` / `registerOpenApiRoute` mounting Scalar at `/reference`) — the hand-maintained spec object and its explorer mount; today its `paths` omits all connection-identity routes.
- **Surface:** `mcp/src/admin-api/connections.ts:301,356,426,514` — the live pairing / app-token / `connections/verify` handlers whose shapes the new spec entries must mirror (request bodies, the one-time `code`/`token` responses, the always-200 verify verdict).
- **Surface:** `mcp/src/admin-api/index.ts:245` — the service-token-authed `verifyScope` that mounts `/connections/verify`; informs the distinct `serviceToken` security scheme on that operation.
- **Why this CR extends rather than rebuilds:** the routes, auth, and DTOs already exist and are tested; the only missing artifact is their description in the hand-authored spec. This CR adds spec entries (and a guard test), touching no handler logic.

## 3. Execution Sandbox

**Modify:**
- `mcp/src/admin-api/openapi.ts` — add the eight path entries under `OPENAPI_DOC.paths`, plus any new component schemas (`Pairing`, `AppToken`, `VerifyRequest`, `VerifyResult`) and a `serviceToken` entry under `components.securitySchemes`.

**Add:**
- `mcp/test/openapi-connection-coverage.node.test.ts` — asserts each of the eight paths (and its primary method) is present in `getOpenApiDocument().paths`; fails if a connection route ships undocumented.

**Do NOT touch:** any handler in `connections.ts` / `tokens.ts`, any schema/migration, any auth code. Documentation + one test only.

## 4. Verification Protocol

**Command/Test:**
- `cd mcp && npm test -- test/openapi-connection-coverage.node.test.ts` → green (all 8 paths present).
- Manual: `curl -s localhost:3000/admin-api/v1/openapi.json | python3 -c "import sys,json;print([k for k in json.load(sys.stdin)['paths'] if 'pairing' in k or 'app-token' in k or 'connection' in k])"` → lists all 8.
- Manual: open `http://localhost:3000/admin-api/v1/reference/` → the pairing / app-token / verify operations now render and are fireable (admin JWT for mint/list/revoke; service token for verify).

---

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** EPIC-047 shipped surface (SPRINT-36, merged to mcp main `9f4c33a`) + live `/admin-api/v1/openapi.json` probe on 2026-06-05 confirming the 8 routes are absent from the spec while reachable at runtime + recorded direct approval (user: "create cr" for the OpenAPI follow-up flagged during post-sprint manual testing).

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared. (the "route works ⇒ documented" assumption)
- [x] All impacted downstream Epics/Stories are identified — EPIC-047 updated (doc-coverage item); no story re-opened (additive docs).
- [x] Execution Sandbox contains exact file paths. (`openapi.ts` + new coverage test)
- [x] Verification command is provided. (`npm test -- test/openapi-connection-coverage.node.test.ts` + curl probe)
- [ ] `approved: true` is set in the YAML frontmatter. — pending Brief sign-off.
- [x] Existing Surfaces cites at least one source-tree path the CR extends. (`openapi.ts:905`, `connections.ts:301…`)
