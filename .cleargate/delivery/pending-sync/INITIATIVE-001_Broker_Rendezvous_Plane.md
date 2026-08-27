---
initiative_id: INITIATIVE-001
remote_id: null
source_tool: manual-paste
status: In Triage
synced_at: null
triaged_at: null
spawned_items: []
created_at: 2026-06-04T00:00:00Z
updated_at: 2026-06-03T21:05:57Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
area: platform-broker
cached_gate_result:
  pass: false
  failing_criteria:
    - id: success-criteria-populated
      detail: section 5 has 0 listed-item (≥1 required)
  last_gate_check: 2026-06-03T21:05:57Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: manual-paste
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id INITIATIVE-001
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-06-03T21:05:57Z
  sessions: []
---

# INITIATIVE-001: Broker / Rendezvous Plane for Local Claude Code Connectors

> For the ClearGate planning session: this is stakeholder input from a sibling product (the "Claude Code Connector"), owned by the same person who owns ClearGate. We want you to triage it and tell us what can be built on the ClearGate infra, where it should live, and roughly what it takes — not to accept a pre-baked design. The §6 questions are the real ask. Where this doc references ClearGate internals, treat them as our outside-in guesses to confirm or correct, not assertions — we have not verified your stack; please do.

## 0. Glossary (so this stands alone)

- **The Connector** — a planned (not yet built) local service that wraps a user's locally-installed `claude` CLI and exposes it over an outbound network connection. A separate product from ClearGate; same owner. Its local-side design is tracked as EPIC-012 in the Connector repo (which also owns the event contract below).
- **The ClearGate plane** — the shared hosting/infra/auth layer behind `*.cleargate.soula.ge` (deploy platform, datastore, the ClearGate MCP backend, the admin UI, and token minting) — as distinct from the ClearGate planning-framework CLI product. "Build it on the plane" means reuse this infra, not embed code in the planning framework.
- **Broker** — the new centralized service this initiative is about: the public rendezvous point local Connectors dial out to and chat apps connect into.
- **Pairing code** — a one-time credential that registers/binds one Connector to a project (analogous to an invite).
- **App token** — a durable credential that lets a specific chat app address an already-paired Connector.
- **Normalized event contract** — the JSON event stream the Connector emits (token text deltas, tool-call / tool-result events, turn completion, error). Defined by the Connector side (EPIC-012), not by ClearGate. The broker is expected to forward these events opaquely, without reshaping them.
- **Turn** — one prompt→reply exchange, mapping to one `claude` invocation. The unit that streams, that gets cancelled, and that must not be double-run on reconnect.
- **MCP** — two different things in this doc: "ClearGate MCP backend" = ClearGate's server. "Claude Code's local MCP servers" = the user's locally-configured tools that `claude` uses. They are unrelated; we always qualify which.
- **Roles** — Operator (runs/owns the broker on the plane), Connector-owner (installs the Connector on their machine, mints a pairing for it), chat app (connects in). In the simplest case the Operator and Connector-owner are the same person, but the roles are separable.

## 1. User Flow

**Happy path:**

1. Operator runs the broker on the ClearGate plane.
2. Connector-owner installs the Connector on their own machine — the same machine their Claude Code runs on (laptop, server, anywhere).
3. The Connector-owner mints a one-time pairing code for their Connector, scoped to their project (in the admin UI or via CLI).
4. They start the Connector with the broker URL + pairing code. The Connector dials out to the broker over a persistent connection and registers; it shows "online" in admin.
5. They point a chat app at the broker by giving it an app token. The chat app now sees the paired Connector and shows a "Claude Code connected" state.
6. They send a message in the chat app → the app calls the broker → the broker routes it down the Connector's connection → the Connector runs one `claude` turn locally → streams normalized events back up through the broker → the app renders the reply live.
7. They hit stop → a cancel signal flows down → the local `claude` turn is torn down cleanly.

**Alternative flows** (canonical statement of behavior; §5 references these):

- **offline** — app sees "offline" and errors rather than hanging;
- **network blip** — the Connector auto-reconnects and resumes without user action, and the in-flight turn is not duplicated;
- **multiple apps** — more than one chat app can be paired to one Connector;
- **revoke** — a revoked pairing/app token immediately stops reaching the Connector.

## 2. Diagrams

**Topology** (Connectors dial out from behind NAT; apps dial in; broker is the only public, reachable piece):

```
   Local machines (wherever Claude Code lives — often behind NAT)
   ┌────────────┐   ┌────────────┐   ┌────────────┐
   │ Connector  │   │ Connector  │   │ Connector  │
   │  + claude  │   │  + claude  │   │  + claude  │
   └─────┬──────┘   └─────┬──────┘   └─────┬──────┘
         │   outbound persistent connection │
         └──────────────┬──┴────────────────┘
                        ▼
            ┌───────────────────────────┐
            │   BROKER  (ClearGate plane │
            │   *.cleargate.soula.ge)    │
            └───────────┬───────────────┘
                        ▲  dial in (HTTPS / stream)
         ┌──────────────┼──────────────┐
   ┌─────┴─────┐  ┌─────┴─────┐  ┌──────┴────┐
   │ Chat App 1│  │ Chat App 2│  │ Chat App 3│   (any app)
   └───────────┘  └───────────┘  └───────────┘
```

**Happy-path sequence** (the loop the first milestone must prove):

```
App ──run(prompt)──▶ Broker ──route──▶ Connector ──▶ claude (one turn)
App ◀─stream events─ Broker ◀─events── Connector ◀── (token deltas…)
App ──cancel───────▶ Broker ──────────▶ Connector ──▶ tear down turn
```

## 3. End-to-End Verbal Description

The Connector must run co-located with Claude Code on the user's machine — it needs the user's local workspace files, the machine's Claude Code login, and the user's locally-configured (Claude Code) MCP servers. Because those machines sit behind NAT/firewalls with no inbound port reachable from the internet, chat apps cannot connect to a Connector directly, and asking every user to set up tunnels/port-forwarding is unacceptable. So the Connector must initiate a persistent outbound connection to a central broker, which then pushes work down that already-open connection and streams results back. This initiative asks ClearGate to host that broker on the plane and reuse the plane's existing primitives — per-project auth, token minting/revocation, deployment, and store — rather than stand up a parallel system. Whether a runtime relay should live on a planning-framework plane at all is a real question for you (see §6 Charter), and we want your honest read rather than a rubber stamp.

## 4. Business Outcome

If this ships, any chat app can drive a user's local Claude Code from anywhere with zero network setup by the user (no tunnels, no port-forwarding) — "Claude Code on my machine" becomes a service any app can connect to, the way an outbound reverse tunnel (e.g. ngrok / Cloudflare Tunnel) exposes a NAT'd service without inbound ports. Strategically, it could make the ClearGate plane the connectivity + identity backbone for the Connector product — if that fit is appropriate.

## 5. Success Criteria

- **Reachability:** a Connector on a NAT'd machine (no inbound port, no tunnel) connects to the broker and appears online.
- **End-to-end relay:** a chat app, given an app token, sends a prompt and renders the streamed reply through the broker; cancel works; no orphaned local `claude` processes.
- **Security (must-have):** a revoked or unauthorized pairing/app token cannot reach the Connector or start a turn; every relayed turn is attributable (who/which app initiated it).
- **Resilience:** reconnect after a network drop is automatic and does not double-run an in-flight turn (we recognize this implies run-identity/idempotency on resume and want your read on how heavy that is).
- **Contract fidelity:** the app and Connector agree on the normalized event contract end-to-end; the broker does not silently mutate it.
- **Multi-tenant:** connectors and pairings are isolated per ClearGate project.
- (Aspirational onboarding goal, not an engineering acceptance test: a new user gets a NAT'd Connector online in < 15 min following quickstart docs, measured from opening the docs to seeing "online" in admin.)
- **Starting v1 scale assumption (confirm/adjust):** tens of connectors, single-digit apps per connector, ~1 concurrent turn per connector. We state this only so the single-instance question in §6 is judgeable.

## 6. Open Questions for AI Triage

*(The "tell us what can be done" ask. Phrased at outcome level; please answer from your own codebase — our parenthetical guesses are non-binding inference.)*

1. **Realtime data plane (the crux).** Does anything on the plane today hold a persistent connection and relay messages, or is it all request/response? If net-new, where does a long-connection gateway + a live presence/registry cleanly belong?
2. **Platform fit.** The broker is a stateful, long-lived-connection service. Does the plane's current runtime + store suit that, or does it need a new home? (We don't know your runtime/store — please state it.)
3. **Minting reuse.** Can your existing per-project token mint + revoke be extended to a pairing code (registers a connector) and an app token (lets an app address it), or is that a genuinely new credential type?
4. **Routing & registry.** Is there an existing "route a request to a specific remote client" seam, or is the registry net-new? Is a single broker instance acceptable for v1 (given the scale above)?
5. **Security / authorization model (please scope this).** A relayed turn executes code (`claude` with tools) on the user's machine. What should an app token be authorized to do — arbitrary prompts, or scoped? What is the blast radius of a leaked pairing code vs app token, who is the revocation authority (operator vs connector-owner), and what audit trail of relayed turns is required?
6. **Data handling.** May the broker log/buffer/persist relayed payloads (prompts + model output), or is it transit-only, no persistence? Is the operator trusted to see plaintext, or is operator-blind confidentiality required? (This materially changes the design.)
7. **Wire-protocol versioning.** The event contract is owned by the Connector side (EPIC-012). Should the broker be a version-agnostic pass-through, or enforce a version handshake at pairing and reject mismatches?
8. **Charter / boundary.** ClearGate's charter scopes it to planning (no runtime execution; a codebase/PM-tool boundary in its CLAUDE.md). Does a runtime relay belong on this plane as an in-charter sibling service sharing only infra/auth, or should it be a fully separate service that only borrows token verification? Who approves that, and is it a human Gate-1 decision?
9. **Estimate.** Given the above, what is the smallest first milestone that proves the rendezvous loop (one connector ⇄ broker ⇄ one app, one streamed turn), and a rough epic/story breakdown with T-shirt sizing of what can be built now vs later? (Treat any number as order-of-magnitude, non-binding.)

---

## Stakeholder Authoring Notes (not pushed)

Authored by the Connector project as stakeholder input to ClearGate; same owner (Sandro). `source: manual-paste`. The Connector-side work (local WS client + the normalized event contract) is EPIC-012 in the Connector repo and is **out of scope here** — this initiative is only the ClearGate-hosted broker.

**OPTIONAL straw-man — feel free to throw this away entirely.** Our outside-in, unverified read of your stack and a possible shape, given only to save you keystrokes if it happens to be right:

- **Guessed stack (verify!):** deploy via Coolify, Node services, Redis + Postgres (`sql/`), admin = SvelteKit UI, the ClearGate MCP backend = request/response over `/admin-api/v1`, join flow = invite → token → member. We have not confirmed any of this.
- **Possible broker shape:** WS gateway (connectors dial out) + live registry/presence + app-facing API (HTTPS/stream) + pairing/app-token mint (reusing your token flow) + relay core + heartbeat/reconnect + an admin "Connectors" view. Data could be `connectors` / `pairings` / `app_clients` rows + Redis presence. If your runtime is Cloudflare-based instead, the gateway+registry likely map to Durable Objects + WebSocket Hibernation. Replace freely with whatever actually fits ClearGate.

Per ClearGate protocol the AI does not push this file; it is intake for decomposition into Epics/Stories on the ClearGate side.
