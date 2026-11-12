---
type: cr
id: "CR-083-Document-Connection-Identity-Routes-OpenAPI"
parent: "[[EPIC-047]]"
children: []
cites: 
  - "[[EPIC-047]]"
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/CR-083-Document-Connection-Identity-Routes-OpenAPI.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
parent_cleargate_id: "EPIC-047"
sprint_cleargate_id: "SPRINT-36"
---

# CR-083-Document-Connection-Identity-Routes-OpenAPI: CR-083: Document connection-identity routes in the mcp admin-api OpenAPI spec

**Status:** Draft · **Sprint:** SPRINT-36 · **Gate:** fail: existing-surfaces-verified

## Context override
**Obsolete Logic (What to Remove / Forget):**
- The assumption that "the route works ⇒ the API is documented." SPRINT-36 / EPIC-047 shipped eight connection-identity routes whose handlers are live and tested, but the **hand-maintained** `OPENAPI_DOC` object in `mcp/src/admin-api/openapi.ts` was never extended to cover them. The spec is authored by hand, not generated from the route table, so new routes do not self-document.
- As a result, the Scalar in-browser explorer at `/admin-api/v1/reference/` (backed by `/admin-api/v1/openapi.json`) renders only the pre-EPIC-047 surface (`projects`, `members`, `tokens`, `audit`, `stats`, `admin-users`, `auth/*`). A human opening the explorer cannot see or fire the pairing / app-token / verify operations.

[+1,075 bytes not shown — read .cleargate/delivery/pending-sync/CR-083-Document-Connection-Identity-Routes-OpenAPI.md]

## Blast radius
*(A CR acts as a "Gate Reset" — all affected downstream items revert to 🔴 High Ambiguity.)*

- [ ] Invalidate/Update Story: none — STORY-047-02/03/04 are merged + Completed; this CR is **additive documentation**, it does not change their shipped behavior or re-open them.
- [x] Update Epic: [[EPIC-047]] — adds a doc-coverage acceptance item; does not alter the identity contract.
- [ ] Database schema impacts? **No.** No migration, no schema change. Pure spec-object edit (+ one test).
- **Runtime behavior impact:** none. The spec doc is descriptive metadata; adding paths changes no handler, no auth, no wire format.
- **Risk:** low. Worst case a path entry's schema drifts from the handler's real shape — mitigated by the coverage test (presence) and by copying field shapes from the existing DTO mappers (`toPairingDto` / `toAppTokenDto` / `VerifyResult`).

## Open questions
- Should the broker-facing `POST /connections/verify` appear in the same public spec as the admin-JWT routes, given it uses a *different* auth scheme (service token, not admin JWT)?
- Add a regression test that fails if a future connection route ships without a spec entry?

<!-- BEGIN relations -->
## Relations
- Parent: [[EPIC-047]]
- Cites (1): [[EPIC-047]]
<!-- END relations -->
