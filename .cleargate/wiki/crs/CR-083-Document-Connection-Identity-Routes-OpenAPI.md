---
type: cr
id: "CR-083-Document-Connection-Identity-Routes-OpenAPI"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/CR-083-Document-Connection-Identity-Routes-OpenAPI.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "1ed0fb723bbcefc386f623e2587d4d155fcc4295"
repo: "planning"
---

# CR-083-Document-Connection-Identity-Routes-OpenAPI: CR-083: Document connection-identity routes in the mcp admin-api OpenAPI spec

## 0.5 Open Questions

> Populate during drafting. Resolve every entry before flipping ambiguity to 🟢.

- **Question:** Should the broker-facing `POST /connections/verify` appear in the same public spec as the admin-JWT routes, given it uses a *different* auth scheme (service token, not admin JWT)?
- **Recommended:** Yes — include it, but declare a distinct OpenAPI `securityScheme` (`serviceToken` bearer) on that one operation so the Scalar explorer prompts for the correct credential. The spec is already public (`/openapi.json` requires no auth); documenting the route does not widen exposure — the route already exists and is reachable.
- **Human decision:** {populated during Brief review}

- **Question:** Add a regression test that fails if a future connection route ships without a spec entry?
- **Recommended:** Yes — a single `openapi-connection-coverage.node.test.ts` asserting the 8 paths below are present in `getOpenApiDocument().paths`. This is what would have caught the gap in SPRINT-36.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

[+6,369 bytes not shown — read .cleargate/delivery/pending-sync/CR-083-Document-Connection-Identity-Routes-OpenAPI.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter

## Open questions
- **Question:** Should the broker-facing `POST /connections/verify` appear in the same public spec as the admin-JWT routes, given it uses a *different* auth scheme (service token, not admin JWT)?
- **Recommended:** Yes — include it, but declare a distinct OpenAPI `securityScheme` (`serviceToken` bearer) on that one operation so the Scalar explorer prompts for the correct credential. The spec is already public (`/openapi.json` requires no auth); documenting the route does not widen exposure — the route already exists and is reachable.
- **Human decision:** {populated during Brief review}

- **Question:** Add a regression test that fails if a future connection route ships without a spec entry?
- **Recommended:** Yes — a single `openapi-connection-coverage.node.test.ts` asserting the 8 paths below are present in `getOpenApiDocument().paths`. This is what would have caught the gap in SPRINT-36.
- **Human decision:** {populated during Brief review}
