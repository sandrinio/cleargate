---
epic_id: EPIC-027
parent_cleargate_id: EPIC-010
sprint_cleargate_id: null
carry_over: false
status: Approved
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-12T00:00:00Z
ambiguity: 🟢 Low
context_source: "direct-human-ask 2026-05-12 (Proposal gate waived: sharp intent, inline references to push-item.ts:7-14/18, mcp/src/db/schema.ts:92, mcp/src/adapters/, CR-010, STORY-010-07, EPIC-010 lineage. Waiver per ~/.claude memory feedback_proposal_gate_waiver.md)"
owner: sandrinio
target_date: 2026-06-09
area: mcp,cli,adapters
created_at: 2026-05-12T00:00:00Z
updated_at: 2026-05-12T00:00:00Z
created_at_version: v0.11.5
updated_at_version: v0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: false
  failing_criteria:
    - id: reuse-audit-recorded
      detail: "'## Existing Surfaces' not found in body"
    - id: simplest-form-justified
      detail: "'## Why not simpler?' not found in body"
  last_gate_check: 2026-05-14T19:52:12Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-14T19:57:22.945Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id EPIC-027
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T19:53:01Z
  sessions: []
push_version: 2
---

# EPIC-027: MCP Type-Agnostic Sync & Universal Payload Contract

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Relax MCP push-item type validation to an open normalized string, formalize a minimum payload contract (title + status), extract ClearGate-specific gates from the universal push path, and surface a three-layer structured error model (L1 reject codes / L2 warnings / L3 draft-time lint).</objective>
  <architecture_rules>
    <rule>CLI and agent surfaces (cleargate-cli, .claude/agents, repo scripts) MUST NOT import a PM-tool SDK (no @linear/sdk, no jira-client, no azure-devops). They speak only to MCP.</rule>
    <rule>PM-tool adapters live exclusively at mcp/src/adapters/. Credentials are stored against the project row in the admin DB. Configuration happens only through the admin console UI — never via CLI flags or env vars.</rule>
    <rule>items.type column stays text + JSONB payload — no DB CHECK/ENUM. Validation is API-layer only.</rule>
    <rule>Approved gate (STORY-010-07) and cached_gate_result.pass (CR-010) are ClearGate-process artifacts. They MUST be gated by payload.origin === "cleargate-cli" so adapter-driven pushes bypass them automatically.</rule>
    <rule>JSONB body advisory prefix injection (CR-010) MUST be idempotent — never double-prepend on re-push.</rule>
    <rule>No breaking change to the existing six type strings: initiative, epic, story, bug, cr, proposal continue to validate identically. They become "known types" in the advisory registry.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/tools/push-item.ts" action="modify" />
    <file path="mcp/src/tools/pull-item.ts" action="modify" />
    <file path="mcp/src/tools/sync-status.ts" action="modify" />
    <file path="mcp/src/lib/payload-contract.ts" action="create" />
    <file path="cleargate-cli/src/commands/lint.ts" action="create" />
    <file path="cleargate-cli/src/lib/frontmatter-schema.ts" action="create" />
    <file path=".cleargate/knowledge/cleargate-protocol.md" action="modify" />
    <file path="CLAUDE.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Today MCP `cleargate_push_item` enforces a closed six-type Zod enum at `mcp/src/tools/push-item.ts:7-14`. Every new artifact class (sprints, sprint reports, adapter-imported issue types from Jira/Azure/Linear) requires a schema migration and coordinated CLI/server release. That couples the universal store to ClearGate's evolving vocabulary, blocks the Overview-tab sprint cards (sprints can't sync), and makes external-PM-tool interop impossible without forking the enum per integration. Simultaneously, the `approved: true` gate and `cached_gate_result.pass` checks fire on every push — including server-side adapter pushes that imported items from Jira where those concepts don't exist — forcing the brittle `skipApprovedGate` boolean. Silent failure modes (mixed-case typos, payload key collisions with server-stamped fields, mid-life type changes, advisory-prefix double-injection on re-push) compound the brittleness.

**What's the solution?**
Open the `type` field to a normalized lowercase string with a regex sanity bound; extract ClearGate-specific gates into a thin policy wrapper triggered only when `payload.origin === "cleargate-cli"`; codify a "minimum payload contract" (`cleargate_id` + `type` + recommended `title` + `status`) that the UI and adapters universally rely on; introduce a three-layer error model (L1 structured reject codes, L2 non-fatal warnings, L3 draft-time `cleargate lint`); and lock in the architectural rule that PM-tool credentials and SDKs live only behind the admin console UI, never in the codebase.

**Success Metrics (North Star):**
- Adding a new sync-able type (e.g. `sprint`, `sprint_report`, `risk-log`) requires **zero** MCP code changes — push works on first attempt.
- 100% of L1 push rejections return a structured error code (one of `invalid_type_format`, `reserved_key`, `type_change_forbidden`, `payload_too_large`, `approved_not_boolean`) — no generic 400s.
- Adapter pushes (Jira/Azure/Linear pulled items) succeed without setting `approved: true` and without `skipApprovedGate=true` hand-flags.
- `cleargate-cli` source tree grep for `@linear/sdk|jira-client|azure-devops` returns zero hits — verified by CI lint.
- Frontmatter typo class (e.g. `approved: "true"` string, unknown keys, missing `title`) caught locally by `cleargate lint` before push round-trip in ≥90% of cases (measured by post-push warning rate decline).

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Open `type` Zod validator: `z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/)` after server-side normalize (`trim().toLowerCase().replace(/\s+/g, '-')`).
- [ ] Return `stored_type` in `PushItemResult` so callers see the normalized form when input differed.
- [ ] Advisory `KNOWN_TYPES` registry in `mcp/src/lib/payload-contract.ts` — drives L2 `unknown_type` warning; does **not** gate.
- [ ] `RESERVED_PAYLOAD_KEYS = ['cleargate_id', 'type', 'server_pushed_at_version', 'pushed_by', 'pushed_at']` constant; reject on collision with `reserved_key`.
- [ ] Type-change forbid: if a cleargate_id already exists with type `X`, reject a push with type `Y` (`type_change_forbidden`).
- [ ] Payload size cap (default 1 MB, configurable via env `MCP_MAX_PAYLOAD_BYTES`); reject with `payload_too_large`.
- [ ] Improved `approved` gate error: `approved must be boolean true, got <typeof>: <value>` instead of the current generic line.
- [ ] Approved + cached-gate policy split: gates apply only when `payload.origin === "cleargate-cli"`. Adapter intake sets `origin` to e.g. `"adapter:linear"`, `"adapter:jira"`, `"adapter:azure"` and skips both gates without needing `skipApprovedGate`.
- [ ] L2 warnings array in `PushItemResult`: `warnings: Array<{code, message, field?}>`. Codes: `unknown_type`, `missing_recommended_fields`.
- [ ] Recommended-field check: warn (don't reject) when `payload.title` or `payload.status` missing.
- [ ] Idempotent body advisory prefix: detect existing `[advisory: gate_failed —` line and replace in-place rather than stacking.
- [ ] Pull 404 clarification: when `cleargate_pull_item` finds no row, return `{code: "item_not_found", hint: "push it first, or check the cleargate_id"}`.
- [ ] `cleargate lint` CLI command — parses each `.cleargate/delivery/pending-sync/*.md` frontmatter against the template's declared key set (gathered from `.cleargate/templates/*.md` parsing), surfaces unknown keys + type-coerced booleans + missing required keys. Non-zero exit on hard errors; zero-exit + stdout warnings for soft ones.
- [ ] Optional pre-push hook in CLI that runs `lint` automatically; bypassable via `--no-lint`.
- [ ] Document `RESERVED_PAYLOAD_KEYS` + open-type + minimum-contract in `.cleargate/knowledge/cleargate-protocol.md` and in CLAUDE.md ClearGate Planning Framework block.
- [ ] CI rule (script) that greps `cleargate-cli/src/**` + `.claude/**` for forbidden PM-SDK imports; failing match breaks build.

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Actual Jira / Azure DevOps adapter implementations (separate Epic, builds on this contract).
- Admin console UI for adapter credential configuration (next Admin UI epic).
- Overview-tab sprint cards (separate Epic — *enabled* by this one but tracked apart).
- Schema-drift detection report (e.g., flagging `status: "Done"` vs `status: "completed"` across project) — parking lot.
- Migrating existing items' types (no historical rewrites).
- Adding a DB CHECK constraint or pgEnum on `items.type` — explicitly rejected; storage stays text+JSONB.
- A "schema registry per type" service — types stay opaque to MCP.
- Cross-project type vocabulary harmonization (each project's KNOWN_TYPES is the same advisory list).

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | Push validator + lint must add <5ms p99 vs current baseline. Lint over 200 frontmatter files must complete in <2s. |
| Security | No PM-tool credentials in CLI codebase, dev-laptop env, or repo files. Adapter creds live in `admin_credentials` table (or equivalent), encrypted at rest, retrievable only by the MCP server process. |
| Backward-compat | All six existing types (`initiative`, `epic`, `story`, `bug`, `cr`, `proposal`) continue to push identically. No existing payload rejected by the new validator. No type-change rejection for items whose first version pre-dates this Epic (grandfathered until first re-push). |
| Compatibility | `skipApprovedGate` boolean parameter on `PushItemContext` stays for one minor version as deprecated alias for the new `origin`-based policy; removed in the next minor. |
| Observability | Every L1 reject and L2 warning writes one `audit_log` row with `errorCode` populated. Adapter-origin pushes log `origin` field for telemetry. |
| Versioning | This Epic ships as a minor (e.g. v0.12.0) — additive contract, no breaking changes to the existing six types. |
| Build-fail rule | CI script that scans for forbidden PM-SDK imports must fail the build, not just warn. |

## 3.5 Existing Surfaces

- **Surface:** `mcp/src/tools/push-item.ts:7-14` (`ITEM_TYPES` closed enum) — current closed type validator. Coverage: 100% replaceable — open-string replacement is a one-symbol swap plus normalize.
- **Surface:** `mcp/src/tools/push-item.ts:39` (`skipApprovedGate` boolean on `PushItemContext`) — current opt-out flag for internal callers. Coverage: replaced by origin-based policy split; flag kept one minor for compat.
- **Surface:** `mcp/src/tools/push-item.ts:110-114` (approved gate check) and `:122-138` (cached-gate check) — current gate logic. Coverage: lifted unchanged into the new policy wrapper, just wrapped in an `origin === "cleargate-cli"` conditional.
- **Surface:** `mcp/src/tools/push-item.ts:160-175` (advisory body prefix injection) — current implementation re-prepends on every call. Coverage: extended with idempotency check (regex test for existing prefix).
- **Surface:** `mcp/src/db/schema.ts:92` (`type: text().notNull()` with vocabulary comment) — DB column already type-agnostic. Coverage: zero schema work, just update the comment to "free-form lowercase kebab string".
- **Surface:** `mcp/src/adapters/{linear-adapter,pm-adapter}.ts` — server-side adapter pattern already established. Coverage: this Epic codifies the boundary; no new adapter code (separate Epic).
- **Surface:** `.cleargate/templates/*.md` — frontmatter schemas authored as conventions, no machine-readable manifest. Coverage: `cleargate lint` parses these to derive expected key sets per template.
- **Coverage of this epic's scope:** ≈75% extension of [[EPIC-010]] foundations. Novel: type-change forbid, reserved-keys constant, normalize+warn pattern, three-layer error model, `cleargate lint`.

## 3.6 Why not simpler?

- **Smallest existing surface that could carry this epic:** `push-item.ts` itself could absorb the open-type + reserved-keys + size-cap changes inline (≈40 LOC). The `cleargate lint` command and policy wrapper extraction are net-new, but small.
- **Why isn't extension / parameterization / config sufficient?** Three concerns are not parameterizable: (a) the architectural rule that the CLI must never import a PM-tool SDK can't be enforced by a config flag — it requires a CI grep + documentation rule; (b) the `approved` gate's origin-based policy split is a structural change to who-calls-what, not a flag; (c) the L3 lint layer is a new code path in cleargate-cli that needs a template-schema discovery mechanism. Each is small individually, but together they're enough to warrant a single coherent Epic rather than three CRs.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**
- `mcp/src/tools/push-item.ts` — replace `ITEM_TYPES` closed enum with open string validator + normalize; add `RESERVED_PAYLOAD_KEYS` check; add type-change-forbid logic; wrap approved + cached-gate checks in origin guard; add warnings array; idempotent advisory prefix.
- `mcp/src/tools/pull-item.ts` — return structured 404 with `item_not_found` code + hint.
- `mcp/src/tools/sync-status.ts` — internal caller; switch from `skipApprovedGate: true` to setting `payload.origin = "system:sync-status"` semantics.
- `mcp/src/lib/payload-contract.ts` (new) — exports `KNOWN_TYPES`, `RESERVED_PAYLOAD_KEYS`, `normalizeType()`, `validateMinimumContract()`, error class definitions.
- `cleargate-cli/src/commands/lint.ts` (new) — `cleargate lint` command implementation.
- `cleargate-cli/src/lib/frontmatter-schema.ts` (new) — parses `.cleargate/templates/*.md` for declared frontmatter keys; used by lint command.
- `cleargate-cli/src/commands/push.ts` — optional pre-push lint invocation; surface `stored_type` + warnings from server response.
- `.cleargate/knowledge/cleargate-protocol.md` — add §"Type & Payload Contract" + §"Codebase / PM-Tool Boundary".
- `CLAUDE.md` — extend ClearGate Planning Framework block: open-type rule, RESERVED_PAYLOAD_KEYS, CLI-never-imports-PM-SDK.
- `scripts/ci-no-pm-sdk.mjs` (new) — CI grep script; wired into `npm run check` or `prepush`.

**Data Changes:**
- None to DB schema. `items.type` stays `text`. JSONB payload conventions documented but not enforced at storage.
- New audit_log error codes used by L1 rejects: `invalid_type_format`, `reserved_key`, `type_change_forbidden`, `payload_too_large`, `approved_not_boolean`. Existing codes (`not_approved`, `gate_failed`) retained.

## 5. Acceptance Criteria

```gherkin
Feature: MCP type-agnostic sync and universal payload contract

  Scenario: Mixed-case type normalizes to lowercase
    Given a member calls cleargate_push_item with type "Epic" and approved: true
    When the request reaches the validator
    Then the item is stored with type "epic"
    And the response contains stored_type: "epic"
    And no warning is emitted for type case

  Scenario: Unknown type accepted with advisory warning
    Given a member calls cleargate_push_item with type "risk-log" and approved: true
    When the request reaches the validator
    Then the item is stored with type "risk-log"
    And the response warnings array contains {code: "unknown_type", message: "type 'risk-log' is not in KNOWN_TYPES (advisory)"}
    And the push succeeds with version 1

  Scenario: Invalid type format rejected
    Given a member calls cleargate_push_item with type "!!bad type!!"
    When the request reaches the validator
    Then the response is a 400 with errorCode "invalid_type_format"
    And no DB row is written
    And one audit_log row is written with errorCode "invalid_type_format"

  Scenario: Approved as string rejected with clear message
    Given a member calls cleargate_push_item with payload.approved set to the string "true"
    When the request reaches the validator
    Then the response is a 400 with errorCode "approved_not_boolean"
    And the message says "approved must be boolean true, got string: \"true\""
    And no DB row is written

  Scenario: Reserved key in payload rejected
    Given a member calls cleargate_push_item with payload.server_pushed_at_version set to "spoofed"
    When the request reaches the validator
    Then the response is a 400 with errorCode "reserved_key"
    And the message says "payload contains reserved key 'server_pushed_at_version'; this field is stamped by the server"
    And no DB row is written

  Scenario: Type change between versions rejected
    Given an item with cleargate_id "STORY-027-01" exists with type "story"
    When a member calls cleargate_push_item with cleargate_id "STORY-027-01" and type "bug"
    Then the response is a 400 with errorCode "type_change_forbidden"
    And the message names both the existing type and the rejected new type
    And the existing item's currentVersion is unchanged

  Scenario: Payload size cap enforced
    Given a member calls cleargate_push_item with a payload of 2 MB and MCP_MAX_PAYLOAD_BYTES=1048576
    When the request reaches the validator
    Then the response is a 400 with errorCode "payload_too_large"
    And the message says "payload size 2097152 bytes exceeds limit 1048576"

  Scenario: Missing title and status produce non-fatal warnings
    Given a member calls cleargate_push_item with approved: true and payload omitting title and status
    When the request reaches the validator
    Then the item is stored
    And the response warnings array contains {code: "missing_recommended_fields", fields: ["title","status"]}

  Scenario: Adapter-origin push bypasses approved gate
    Given the Linear adapter pulls a Jira-style issue and constructs a push with payload.origin = "adapter:linear" and no approved field
    When pushItem is called server-side
    Then the push succeeds without the approved gate firing
    And no PushNotApprovedError is thrown

  Scenario: ClearGate CLI push without approved still rejected
    Given a member calls cleargate_push_item with payload.origin = "cleargate-cli" and approved omitted
    When the request reaches the validator
    Then the response is a 400 with errorCode "not_approved"

  Scenario: Advisory body prefix is idempotent on re-push
    Given an item was pushed with cached_gate_result.pass: false (advisory line injected once)
    When a member re-pushes the same item with the same body (advisory line still present)
    Then the stored body has exactly one "[advisory: gate_failed —" line, not two

  Scenario: Pull of unknown id returns structured 404
    Given no item exists with cleargate_id "NONESUCH-999"
    When a member calls cleargate_pull_item with cleargate_id "NONESUCH-999"
    Then the response is a 404 with errorCode "item_not_found"
    And the hint field says "push it first, or check the cleargate_id"

  Scenario: cleargate lint catches frontmatter typos before push
    Given a story file has frontmatter "approved: 'true'" (quoted string instead of boolean)
    When the developer runs cleargate lint
    Then exit code is non-zero
    And stdout contains "approved must be boolean true, got string 'true'"
    And the file is named in the error

  Scenario: cleargate lint warns on unknown frontmatter keys
    Given a story file has a frontmatter key "moodd: vibing" (typo of expected "mood")
    When the developer runs cleargate lint
    Then exit code is zero
    And stdout contains a warning naming the unknown key and listing keys declared by story.md template

  Scenario: CI build fails on forbidden PM-SDK import in CLI
    Given a developer adds "import { LinearClient } from '@linear/sdk'" to cleargate-cli/src/foo.ts
    When CI runs npm run check
    Then the build fails with a message naming the forbidden import and the file
    And the error references the adapter-boundary rule in cleargate-protocol.md
```

## 6. AI Interrogation Loop (Human Input Required)

> All 8 questions resolved at Gate 1 ack 2026-05-12 and 2026-05-14.

- **AI Question 1:** Should `MCP_MAX_PAYLOAD_BYTES` default to 1 MB, or higher (e.g. 4 MB to accommodate large sprint reports with embedded artifacts)? Recommendation: 1 MB default with override env var. Log size of every push to surface real-world distribution before raising.
  - **Human Answer (2026-05-12):** 1 MB default, `MCP_MAX_PAYLOAD_BYTES` env override.

- **AI Question 2:** Should `KNOWN_TYPES` live (a) in `mcp/src/lib/payload-contract.ts` server-side only (Admin UI fetches via endpoint), or (b) in a shared `@cleargate/types` published npm package consumed by CLI + UI + MCP? Recommendation: (a) for now — single source of truth, no version drift; promote to (b) when a third consumer appears.
  - **Human Answer (2026-05-12):** Shared npm package `@cleargate/types` consumed by MCP + CLI + UI (path b). STORY-027-01 places constants in `mcp/src/lib/payload-contract.ts` for SPRINT-27; STORY-027-07 (deferred to SPRINT-28) extracts to the published package.

- **AI Question 3:** For `type_change_forbidden`: hard reject always, or allow with explicit `force_type_migration: true` flag on the push payload? Recommendation: hard reject always — type changes should require deleting and re-creating the cleargate_id, which is rare and deliberate.
  - **Human Answer (2026-05-14):** Hard reject always, but error must be **guiding**: `{code: "type_change_forbidden", message: "cleargate_id '<id>' is type '<existing>'; cannot change to '<requested>'.", hint: "To reclassify, push under a new cleargate_id (e.g., '<NEW-PREFIX>-NNN'). The current item stays as '<existing>'."}`. Same `{code, message, hint}` shape applies to all L1 rejects (`reserved_key`, `approved_not_boolean`, `payload_too_large`, `invalid_type_format`) so AI consumers always get actionable error text.

- **AI Question 4:** Approved-gate policy split — is `payload.origin === "cleargate-cli"` the right signal, or should it be a server-side flag set when the call originates from an MCP tool invocation (vs. the internal adapter caller)? Recommendation: `payload.origin` string set by the caller is simplest; document the convention (`cleargate-cli`, `adapter:linear`, `adapter:jira`, `adapter:azure`, `system:sync-status`). The CLI stamps it automatically.
  - **Human Answer (2026-05-12):** `payload.origin` string convention. CLI stamps automatically.

- **AI Question 5:** `cleargate lint` — new top-level command, or sub-mode of `cleargate push --dry-run`? Recommendation: new top-level command `cleargate lint [path]` (default: scan all `pending-sync/**`). Reuse: `cleargate push --dry-run` calls lint internally and refuses to push on hard errors.
  - **Human Answer (2026-05-12):** New `cleargate lint` top-level command; `push --dry-run` reuses it. Lint itself deferred to SPRINT-28 (STORY-027-06).

- **AI Question 6:** Should this Epic ship its own sprint, or piggyback on an existing one (SPRINT-27 not yet cut)? Recommendation: dedicated sprint — clean cutover, single release note, easy rollback. The CI no-PM-SDK rule is the kind of guardrail that benefits from a discrete announcement.
  - **Human Answer (2026-05-12):** Dedicated sprint. SPRINT-27 carries EPIC-027 Phase 1 (5 stories) + proof-loop CRs.

- **AI Question 7:** Existing items whose first version pre-dates this Epic — grandfather them against type-change-forbid until their next push, or run a one-time migration that snapshots their current type? Recommendation: grandfather. Migration is risk for zero gain.
  - **Human Answer (2026-05-14):** Grandfather. Lazy enforcement on first re-push. Zero migration code.

- **AI Question 8 (added 2026-05-12):** Should `cleargate_id` have a format regex, or stay fully freeform within length bounds?
  - **Human Answer (2026-05-14):** Accept **two** valid forms without warning: (a) the TYPE-NNN convention `^[A-Z][A-Z0-9_]*-\d+(-\d+)*$` (e.g. `EPIC-027`, `STORY-027-01`); (b) plain 5-digit numeric `^\d{5}$` (e.g. `00027`, `12345`, useful for adapter-pulled items with numeric IDs from Linear/Jira). Anything else triggers L2 `unknown_id_format` advisory warning. Length bounds (1-128) stay enforced.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Coding Agent.** All 8 §6 questions resolved 2026-05-12 + 2026-05-14. `proposal_gate_waiver` recorded in frontmatter.

Requirements to pass to Green (Ready for Coding Agent):
- [x] Proposal document has `approved: true`. *(Waived per memory feedback_proposal_gate_waiver.md — direct human ask with sharp intent, inline references to push-item.ts:7-14/18, schema.ts:92, mcp/src/adapters/, CR-010, STORY-010-07, EPIC-010 lineage. Waiver recorded in `proposal_gate_waiver` frontmatter + context_source prose.)*
- [x] The `<agent_context>` block is complete and validated.
- [x] §4 Technical Grounding contains 100% real, verified file paths. *(push-item.ts:7-14/18/39/110-114/122-138/160-175 + schema.ts:92 + mcp/src/adapters/ confirmed via grep + ls.)*
- [x] §6 AI Interrogation Loop is empty (all human answers integrated into the spec). All 8 questions resolved.
- [x] 0 "TBDs" exist in the document.
- [x] §3.5 Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] §3.6 Why not simpler? has both sub-bullets answered.
