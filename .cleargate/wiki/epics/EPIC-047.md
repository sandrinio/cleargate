---
type: epic
id: "EPIC-047"
parent: "[[INITIATIVE-001]]"
children: 
  - "[[CR-083-Document-Connection-Identity-Routes-OpenAPI]]"
  - "[[STORY-047-01-Indexed-Credential-Schema-Verify]]"
  - "[[STORY-047-02-Pairing-And-App-Token-Lifecycle]]"
  - "[[STORY-047-03-Verify-Endpoint]]"
  - "[[STORY-047-04-Revocation-PubSub-Publish]]"
  - "[[STORY-047-05-Broker-Verify-Client-Cache]]"
  - "[[STORY-047-06-Broker-Revoke-Subscriber-Kill-Inflight]]"
  - "[[STORY-047-07-Wire-Lanes-Retire-Stub-Audit]]"
cites: []
cited_by: 
  - "[[CR-083-Document-Connection-Identity-Routes-OpenAPI]]"
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-047_Connection_Identity_And_Credentials.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "a640863cd4532ce2a199d0bb477d74902e776586"
repo: "planning"
parent_cleargate_id: "INITIATIVE-001"
---

# EPIC-047: Connection Identity & Credentials

**Status:** Draft · **Sprint:** none · **Gate:** fail: parent-approved, existing-surfaces-verified

## Objective
Give the broker a way to verify who's at the door — without becoming an identity provider. mcp mints + verifies all credentials; the broker calls a verify endpoint at connect and reacts to revocation via subscription.

## Problem & Value
**Why are we doing this?**
A relayed turn executes `claude` with tools on the user's machine — the highest-value secret in the system. Credentials must be minted, scoped, attributable, and revocable *instantly*, reusing the plane's existing identity instead of standing up a parallel system. Without this, the broker can't safely let anyone in.

[+359 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-047_Connection_Identity_And_Credentials.md]

## Scope
**In:**
- [ ] `mcp` verify endpoint `POST /admin-api/v1/connections/verify` — validates `{credential, kind: pairing|member|app_token}`, returns `{valid, project_id, member_id?, connection_id?, scopes, protocol_version?}`.
**Out:**
- The WS gateway / registry / relay (→ EPIC-046).
- Connector daemon (→ EPIC-048).
- Admin UI for minting/revoking (later epic — this epic exposes the API it will call).

[+2,582 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-047_Connection_Identity_And_Credentials.md]

## Architecture rules
- mcp is the SINGLE identity authority. The broker verifies, never mints, holds no signing secret or DB credentials.
- Clone existing primitives: pairing-code ≈ invites (one-time consume); app-token ≈ tokens service-token (bcrypt + Redis rev:).
- Revocation must be INSTANT and kill in-flight turns → connect-time introspection + a runtime revoke subscription (Redis pub/sub — first plane use).
- Fail CLOSED: deny connect if verify fails or mcp is unreachable. Cache only successful bindings, for the connection's life.

## Decisions
*Resolved (2026-06-04 design dialogue + load analysis):*
- ✅ **Credential schema:** dedicated `connections` / `pairings` / `app_tokens` tables (not a `tokens` `kind` discriminator). — *Human: "dedicated probably."*
- ✅ **Revoke propagation:** Redis pub/sub. — *Human: "yes."* Per-subject channels + a `rev:project:<id>` whole-tenant channel.

[+1,114 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-047_Connection_Identity_And_Credentials.md]

<!-- BEGIN relations -->
## Relations
- Parent: [[INITIATIVE-001]]
- Children (8): [[CR-083-Document-Connection-Identity-Routes-OpenAPI]], [[STORY-047-01-Indexed-Credential-Schema-Verify]], [[STORY-047-02-Pairing-And-App-Token-Lifecycle]], [[STORY-047-03-Verify-Endpoint]], [[STORY-047-04-Revocation-PubSub-Publish]], [[STORY-047-05-Broker-Verify-Client-Cache]], [[STORY-047-06-Broker-Revoke-Subscriber-Kill-Inflight]], [[STORY-047-07-Wire-Lanes-Retire-Stub-Audit]]
- Cited by (1): [[CR-083-Document-Connection-Identity-Routes-OpenAPI]]
<!-- END relations -->
