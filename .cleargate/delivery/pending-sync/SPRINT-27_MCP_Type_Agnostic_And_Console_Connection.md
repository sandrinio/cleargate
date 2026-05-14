---
sprint_id: SPRINT-27
parent_cleargate_id: null
sprint_cleargate_id: SPRINT-27
carry_over: false
lifecycle_init_mode: warn
remote_id: null
source_tool: local
status: Approved
approved: true
execution_mode: v2
start_date: 2026-05-19
end_date: 2026-06-01
created_at: 2026-05-12T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: cleargate@0.11.5
updated_at_version: cleargate@0.11.5
area: mcp,admin-console,cli,docs,scripts,auth
context_source: |
  Planned 2026-05-12 in response to direct human ask: "plan next sprint, but do
  not start it. I also want in sprint to show mcp connection in the console UI.
  the one i can use to connect from external agents."

  Expanded 2026-05-14 in response to follow-up "what about ingesting and
  syncing sprint reports and sprint plans too with mcp?" — pulled CR-063 in
  from deferred + drafted CR-064 as the EPIC-027 proof loop.

  Expanded 2026-05-14 (second pass) in response to CR-061 Q1 reversal — user
  wants Claude Desktop / stdio clients to connect with a service token
  pasted into mcpServers config without `cleargate join`. Drafted CR-065
  (`cleargate mcp serve` service-token auth via `CLEARGATE_SERVICE_TOKEN`
  env) so the modal can render a working stdio config tab.

  Theme: ship the MCP type-agnostic sync foundation drafted in EPIC-027
  (this week), prove the foundation by syncing ClearGate's own sprint plans
  and sprint reports to MCP, and give the admin console a self-serve
  "connect an external agent" surface for HTTP + stdio clients. Three
  threads, one sprint:

  Thread A — MCP boundary hardening (EPIC-027 Phase 1):
    - Open the push-item type validator from a closed six-type enum to a
      normalized lowercase string, so sprints, sprint reports, and adapter-
      imported issue types (Jira / Azure / Linear) all sync without schema
      migrations.
    - Lock the codebase/PM-tool boundary: CLI never imports a PM-tool SDK.
    - Three-layer error model: L1 structured reject codes (with guiding
      `{code, message, hint}` shape), L2 non-fatal warnings, L3 draft-time
      lint (lint+npm-package deferred to SPRINT-28).
    - Origin-based gate policy split so adapter-driven pushes bypass approved
      gate without the brittle skipApprovedGate flag.

  Thread B — Sprint artifact sync (EPIC-027 proof loop):
    - CR-063: ingest sprint reports into wiki (one wiki page per sprint
      carries both plan + report bodies; backfill SPRINT-03..26; Gate-4
      auto-trigger). Already 🟢 approved, pulled in from deferred.
    - CR-064: MCP push for sprint plans + reports (type-agnostic-sync proof).
      Extends `cleargate push` to accept `sprint-runs/SPRINT-NN/REPORT*.md`
      with derived `type: "sprint_report"`; adds `sprint_id → sprint` to
      the typeMap; wires close_sprint.mjs Gate-4 push step; smoke-tests by
      pushing SPRINT-25 + SPRINT-26 plans + reports to MCP.

  Thread C — Admin-console connection UX (CR-061 + member-management gaps):
    - CR-061: token-issued modal renders 3-tab snippet (HTTP JSON config +
      curl test + Claude Desktop stdio config) so users can copy-paste an
      external-agent connection in one click for any client class.
    - CR-062: resend invite from members list + email-on-issue/resend, so
      admins recover from missed invites without shell access. Includes
      Send/Trash2 icon-button refactor of the members row.
    - CR-065: `cleargate mcp serve` service-token auth via
      `CLEARGATE_SERVICE_TOKEN` env var. Unblocks the stdio tab in CR-061's
      modal so Claude Desktop / Claude Code clients can connect with a
      pasted token instead of needing `cleargate join`.
    - BUG-030: member delete 500 FK violation — P1 blocker on the members
      surface; ON DELETE SET NULL migration + 23503 → 409 mapping.

  Items in scope: 5 EPIC-027 stories (to be drafted at sprint init / Architect
  SDR) + CR-061 + CR-062 + CR-063 + CR-064 + CR-065 + BUG-030 = 11 items.
  All Qs resolved at Gate-1 ack 2026-05-14.

  Out-of-scope (deferred to SPRINT-28 or later):
    - STORY-027-06 cleargate lint command + frontmatter-schema parser (L3)
    - STORY-027-07 @cleargate/types shared npm package
    - Full backfill (SPRINT-01..24) push to MCP — CR-064 smoke-tests last
      two only; full backfill filed separately if smoke passes
    - BUG-027/028/029 + CR-059/060 — SPRINT-26 carry-overs (separate close)
    - Persistent "connection info" project-page panel (CR-061 modal-only first)
    - Overview-tab sprint cards (separate epic — enabled by EPIC-027 + CR-064)
    - Jira/Azure/Linear adapter implementations (separate epic, builds on this)
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T19:55:29Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-4-7
  last_stamp: 2026-05-14T21:35:04Z
  sessions:
    - session: 91fdf8e4-b3db-40ae-9172-2b207315dbde
      model: claude-opus-4-7
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-05-14T21:33:27Z
---

# SPRINT-27: MCP Type-Agnostic Sync + Sprint Artifact Push + Admin-Console Connection UX

## 0. Stakeholder Brief

- **Sprint Goal:** Open MCP to any work-item type, prove it by syncing ClearGate's own sprint plans + reports to MCP, lock the codebase/PM-tool boundary, and give the admin console a copy-paste "connect an external agent" snippet that works for both HTTP and stdio (Claude Desktop) clients.
- **Business Outcome:** (a) New artifact classes (sprints, sprint reports, future adapter-imported issues) sync without any MCP code change. (b) Sprint reports become wiki-visible and MCP-queryable — historical sprint context is no longer locked in `sprint-runs/`. (c) External-agent onboarding drops from "read docs + extract token + hand-craft JSON" to "click 'Issue token' → copy snippet → paste" for Cursor/Cline/curl AND Claude Desktop / Claude Code. (d) Member management stops 500-ing when a member has authored items.
- **Risks (top 3):** EPIC-027 stories serialize on `push-item.ts` (bounce-exposure compounds); CR-063 + CR-064 both edit `close_sprint.mjs` Gate-4 pipeline (merge order matters); CR-065 is auth-adjacent — service-token consumer path is net-new in the CLI bridge though server-side verification already exists.
- **Metrics:** Adding a new type takes zero MCP code changes (verified by CR-064 smoke-pushing 4 sprint artifacts at `type: "sprint"` + `type: "sprint_report"`). 100% of L1 push rejects return structured `{code, message, hint}` triples. Token-issued modal includes 3 tabs (JSON + curl + stdio) all of which round-trip against `/mcp tools/list`. Claude Desktop connects to ClearGate MCP via pasted snippet without `cleargate join`. `DELETE /admin-api/v1/members/:mid` returns 204 even when member has authored items.

## Sprint Goal
Ship EPIC-027 Phase 1 (open-type validator, gate-policy split, error taxonomy, codebase/PM-tool boundary lock), prove the type-agnostic foundation end-to-end via sprint artifact sync (CR-063 wiki + CR-064 MCP push), and ship the admin-console connection-UX quartet (CR-061 3-tab modal, CR-062 invite resend + email, CR-065 stdio service-token bridge, BUG-030 member-delete FK fix).

## 1. Consolidated Deliverables

| ID | Type | Title | Lane | Bounce Exposure | Status |
|---|---|---|---|---|---|
| [[STORY-027-01]] | Story (EPIC-027) | Open type validator + normalize + `KNOWN_TYPES` registry (incl. `sprint`/`sprint_report`) in `mcp/src/lib/payload-contract.ts` | standard | low | **To draft @ SDR** |
| [[STORY-027-02]] | Story (EPIC-027) | `RESERVED_PAYLOAD_KEYS` + reserved-key reject + type-change forbid (guiding error) + payload size cap + `approved_not_boolean` with `{code, message, hint}` | standard | med | **To draft @ SDR** |
| [[STORY-027-03]] | Story (EPIC-027) | Origin-based gate policy split (`approved` + `cached_gate_result` wrapped in `payload.origin === "cleargate-cli"`) + idempotent advisory prefix + structured pull 404 | standard | high | **To draft @ SDR** |
| [[STORY-027-04]] | Story (EPIC-027) | L1 error code taxonomy + L2 warnings array (`unknown_type`, `unknown_id_format`, `missing_recommended_fields`) + `audit_log` integration | standard | low | **To draft @ SDR** |
| [[STORY-027-05]] | Story (EPIC-027) | Docs (`cleargate-protocol.md` + `CLAUDE.md`) + CI no-PM-SDK grep rule script | fast | low | **To draft @ SDR** |
| [[CR-061]] | CR | Token-Issued modal renders 3-tab snippet (HTTP JSON + curl + stdio Claude Desktop config) | standard | low | 🟢 |
| [[CR-062]] | CR | Resend invite from members list + email on create + email on resend + Send/Trash2 icon buttons | standard | low | 🟢 |
| [[CR-063]] | CR | Ingest sprint reports into wiki (plan + report on one page, backfill SPRINT-03..26, Gate-4 auto-trigger) | standard | low | 🟢 |
| [[CR-064]] | CR | Sync sprint plans + reports to MCP (typeMap entry + path validator extension + close_sprint.mjs Gate-4 push step + smoke script) | standard | low | 🟢 |
| [[CR-065]] | CR | `cleargate mcp serve` service-token auth via `CLEARGATE_SERVICE_TOKEN` env (unblocks CR-061 stdio tab) | standard | med | 🟢 |
| [[BUG-030]] | Bug | `DELETE /members/:mid` 500 → 204: `ON DELETE SET NULL` migration on `items.updated_by_member_id` + 23503 → 409 defense-in-depth | standard | low | 🟢 |

**Decomposition note:** EPIC-027 stories are listed by working title + lane. Actual story files (`pending-sync/STORY-027-NN_*.md`) will be drafted during the Architect Sprint Design Review at sprint init, with full Gherkin per scenario from EPIC-027 §5. Listing them here is the **plan**, not the **commitment** — the human can revise the decomposition before sprint init.

**Cross-thread dependency note:** CR-064 verification depends on STORY-027-01 including `'sprint'` and `'sprint_report'` in its `KNOWN_TYPES` advisory registry. CR-061's stdio tab depends on CR-065 shipping `CLEARGATE_SERVICE_TOKEN` auth path. Both dependencies are surfaced in §2.2 merge ordering.

## 1.5 Items Deferred (not in scope)

> Acknowledged backlog — out of §1 so the preflight extractor doesn't pull these IDs as in-scope.

- STORY-027-06 (planned, SPRINT-28) — `cleargate lint` command + frontmatter-schema parser — L3
- STORY-027-07 (planned, SPRINT-28) — `@cleargate/types` shared npm package
- Full SPRINT-01..24 backfill push to MCP — separate CR if CR-064 smoke passes and the user wants the full history visible in the admin UI
- BUG-027 / BUG-028 / BUG-029 / CR-059 / CR-060 — SPRINT-26 items, closed via SPRINT-26 path

## 2. Execution Strategy (Sprint Design Review — Binding)

> Architect SDR output 2026-05-14T21:30Z, replacing the prior conversational-agent §2 proposal. v2 binding rules below. **Three plan amendments + three open decisions surfaced — see §"Open Decisions for Orchestrator" at end of §2.5 below.**

### 2.1 Phase Plan

Three waves. v2 mode; Wave 2 strict-serial on `push-item.ts` + `payload-contract.ts`. Cross-coupling claims grepped against codebase before this section was written (see §2.3 for evidence cites; FLASHCARD `2026-05-14 #architect #sdr #anti-speculation` applies).

**Wave 1 — Parallel-safe quintet** (single orchestrator dispatch turn):

- **CR-065** — `cleargate-cli/src/commands/mcp-serve.ts` (insert env-var branch before `new AuthFetcher` at line 71) + new file `cleargate-cli/src/auth/service-token-fetcher.ts` + tests. **Goal advancement:** Unblocks the stdio tab of CR-061 by giving Claude Desktop / Claude Code a `CLEARGATE_SERVICE_TOKEN` consumer path that bypasses keychain auth.
- **BUG-030** — `mcp/src/db/schema.ts:96-98` (drop `notNull()`, add `onDelete: 'set null'`) + new migration + try/catch around `members.ts:250` (23503 → 409). **Goal advancement:** Removes the P1-High 500 blocker on the members surface that gates `cleargate join` recovery flows.
- **CR-062** — `mcp/src/admin-api/members.ts` (new `POST /:mid/resend-invite` route, mailer call inside existing `POST /:projectId/members` create-invite path at line 218-225) + new files `invite-email.ts` + `invite-email-template.ts` + admin UI icon refactor. **Goal advancement:** Closes the members-list UX gap; admins can recover from missed invites without shell access.
- **CR-063** — `cleargate-cli/src/commands/wiki-ingest.ts` (path validator + EXCLUDED_SUFFIXES carve-out + buildPageBody two-source idempotency) + `wiki/scan.ts` + `wiki/derive-bucket.ts` + `wiki/page-schema.ts` + new backfill script + new Step 7.5 in `close_sprint.mjs`. **Goal advancement:** First half of the EPIC-027 proof loop — sprint reports become a second wiki source class.
- **STORY-027-05** — `CLAUDE.md` bounded-block paragraph + `cleargate-planning/CLAUDE.md` mirror + two new H2 sections in `cleargate-protocol.md` + new `scripts/ci-no-pm-sdk.mjs` + `mcp/src/db/schema.ts:92` comment + `package.json` script. **Goal advancement:** Locks the codebase/PM-tool SDK boundary as a CI-enforced invariant. Fast lane (see §2.4).

**Wave 2 — MCP core, strict-serial chain on `mcp/src/tools/push-item.ts` and the new `mcp/src/lib/payload-contract.ts`** (one Developer dispatch at a time, each rebased on the prior):

- **STORY-027-01** → **STORY-027-02** → **STORY-027-03** → **STORY-027-04**.
- No parallelization. -01 creates the module; -02 extends it; -03 refactors the gate-policy block at push-item.ts:109/121 wrapping each in `originRequiresGates(payload.origin)`; -04 wraps the whole result in the `warnings: []` array.
- **Goal advancement (chain):** -01 opens the type validator (precondition for CR-064 smoke). -02 hardens the payload contract with guiding errors. -03 unlocks adapter-driven pushes by replacing `skipApprovedGate` with `payload.origin`. -04 makes EPIC-027's "headline metric" (zero MCP code change to add a type) observable via warnings telemetry.

**Wave 3 — Post-EPIC-027 follow-on pair** (parallel-safe; both depend on Wave 2 complete):

- **CR-061** — `admin/src/lib/components/TokenIssuedModal.svelte` 3-tab refactor + tests. Depends on CR-065 (W1) for the stdio tab snippet to reference the correct env var name. Authored in parallel with CR-064 once Wave 2 -01 is green.
- **CR-064** — `cleargate-cli/src/commands/push.ts:404-412` typeMap + path validator extension + new `close_sprint.mjs` step inserted **before** CR-063's wiki-ingest step + new smoke-test script. **Hard precondition:** STORY-027-01..-04 fully merged AND -01's `KNOWN_TYPES` includes `'sprint'` + `'sprint_report'` so smoke pushes emit `warnings: []`. **Goal advancement:** Closes the EPIC-027 proof loop — pushes ClearGate's own sprint plans + reports to MCP with zero MCP code change.

### 2.2 Merge Ordering — Shared-File Surface

Boundaries locked by **symbol**, not line number (Wave 2 chain shifts line numbers between merges).

| Shared File | Stories | Order | Rationale |
|---|---|---|---|
| `mcp/src/lib/payload-contract.ts` (NEW) | STORY-027-01, -02, -03, -04 | strict: -01 creates → -02/-03/-04 extend | -01 owns module creation: `KNOWN_TYPES` (must include `'sprint'`, `'sprint_report'`), `TYPE_REGEX`, `normalizeType`, forward-declared `ValidationError`. -02 adds `RESERVED_PAYLOAD_KEYS`, `MAX_PAYLOAD_BYTES_DEFAULT`, full `ValidationError` class. -03 adds `ORIGIN_CLEARGATE_CLI`, `originRequiresGates()`. -04 adds `CLEARGATE_ID_TYPE_REGEX`, `CLEARGATE_ID_NUMERIC_REGEX`, `isKnownIdFormat`, `Warning` type. No story may extend without rebasing on prior. |
| `mcp/src/tools/push-item.ts` | STORY-027-01, -02, -03, -04 | strict: -01 → -02 → -03 → -04 | -01 swaps the `ITEM_TYPES` z.enum at the `pushItemInput` Zod object (currently line 7-14, 18). -02 inserts four reject paths ABOVE the existing approved-gate symbol `if (!ctx.skipApprovedGate)` (currently line 109). -03 wraps that same symbol block + the `cached_gate_result` block (line 121-122) in `originRequiresGates(payload.origin)`, replaces the bare `!ctx.skipApprovedGate` predicate, and rewrites the advisory-prefix injection site. -04 extends `PushItemResult` (line 47) with `warnings: Warning[]` and builds the array after L1 checks pass. Cannot parallelize — each rewrites symbols the next reads. |
| `mcp/src/mcp/register-tools.ts` | STORY-027-01 (import update) | (single — folded into -01) | Line 5 currently `import { ITEM_TYPES, pushItem, ... }`. -01's M-plan must drop the `ITEM_TYPES` import (replaced by validator) and confirm the `pushItem(...)` call at line 106 sets `payload.origin = "cleargate-cli"` as the default when CLI omits it (or relies on -03's missing-origin-defaults-to-cleargate-cli rule). **This file is missing from STORY-027-01 §3.1's file table — surface as plan amendment.** |
| `mcp/src/tools/sync-status.ts` | STORY-027-03 | (single — folded into -03) | Line 40 currently `{ ...ctx, skipApprovedGate: true }`. -03 must migrate to setting `payload.origin = "system:sync-status"` on the args object. **Test files** (`pull-item.test.ts`, `list-items.test.ts`, `sync-status.test.ts`, `push-item.test.ts`) carry 8+ `skipApprovedGate: true` hits — -03's R4 keeps the alias one minor, so tests pass unchanged. M-plan must NOT migrate test files (regression risk on deprecation-alias path). |
| `mcp/src/admin-api/members.ts` | BUG-030, CR-062 | **strict: BUG-030 → CR-062** | BUG-030 wraps `db.delete(members)` at the DELETE handler symbol (currently line 250) with try/catch + 23503 mapping. CR-062 registers a new `POST /:mid/resend-invite` route (different function entirely) AND inserts a mailer call into the existing `POST /:projectId/members` create-invite handler immediately AFTER the `invite_url` return prep at line 221-225. Different regions; sequential to avoid rebase. |
| `mcp/src/db/schema.ts` | BUG-030, STORY-027-05 | BUG-030 first (line 96-98 FK clause) → STORY-027-05 (line 92 comment) | Adjacent regions. BUG-030 changes the FK behavior; STORY-027-05 updates the type-column vocabulary comment. Order BUG-030 first since it ships with a migration. |
| `mcp/src/db/schema.ts` (audit_log columns) | STORY-027-04 | (conditional — see Open Decisions) | If -04 needs `warningCode` + `origin` columns and they're absent today, -04 adds a migration. Independent of BUG-030's edit (different table). |
| `admin/src/lib/components/TokenIssuedModal.svelte` | CR-061 | (single) | UI isolated. Reads `PUBLIC_MCP_URL` via `$env/dynamic/public` (verified pattern). Snippet text for stdio tab hardcodes `CLEARGATE_SERVICE_TOKEN`. |
| `admin/src/routes/projects/[id]/members/+page.svelte` | CR-062 | (single) | **CR-062 references `admin/src/lib/components/MembersList.svelte` — file does not exist** (`admin/src/lib/components/` has AddAdminModal, InviteModal, Modal, TokenIssueForm, TokenIssuedModal only). Members row rendering lives in the page-level Svelte file. CR-062 Developer must either extract MembersList.svelte as a new component OR inline-edit the page. **Surface as plan amendment for CR-062.** |
| `cleargate-cli/src/commands/mcp-serve.ts` | CR-065 | (single) | Env-var branch inserted BEFORE `new AuthFetcher(...)` at line 71. Header construction at line 178 unchanged. |
| `cleargate-cli/src/commands/push.ts` | CR-064 | (single) | typeMap extension at line 404-412 (confirmed). Path validator at line 350-351 extended with second permitted root. |
| `CLAUDE.md` + `cleargate-planning/CLAUDE.md` | STORY-027-05 | mirror pair, identical edits | Bounded-block parity (FLASHCARD `2026-04-19 #wiki #protocol #mirror` + `2026-05-01 #mirror #parity`). |
| `.cleargate/scripts/close_sprint.mjs` + `cleargate-planning/.cleargate/scripts/close_sprint.mjs` | CR-063, CR-064 | **strict: CR-063 → CR-064** | Mirror parity verified GREEN. CR-063 inserts new "Step 7.5: wiki ingest sprint report" AFTER Step 7. CR-064 inserts new "Step 7.4: MCP push sprint plan + report" IMMEDIATELY BEFORE CR-063's Step 7.5. Anchor for CR-064: the literal line `// CR-063: wiki ingest sprint report` that CR-063 emits. Mirror parity must hold after both edits. |
| `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs` | (both) | regenerated via `npm run prebuild` | Do NOT hand-edit. FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`. |

### 2.3 Shared-Surface Warnings

- **`push-item.ts` four-story rebase chain (Wave 2)** — Bug in -01 forces re-test of -02..-04. Mitigation: -01's M-plan locks `KNOWN_TYPES` literal verbatim including `'sprint_report'` (underscore, not hyphen — CR-064 §0.5 Q1) and seeds the `normalizeType` regex test bar. QA-Red on -01 writes Red tests for the open-type + normalize + invalid-format scenarios BEFORE -01 implementation. **High-care merge** even though story bounce-exposure is rated low.
- **`register-tools.ts` ITEM_TYPES import (gap)** — Line 5 imports `ITEM_TYPES` from push-item.ts. -01's swap removes this export. STORY-027-01 §3.1 does NOT list `register-tools.ts`. **Architect M-plan for -01 MUST include this file.** Without the amendment, -01 ships with a broken import and typecheck fails.
- **`members.ts` BUG-030 ↔ CR-062 region collision** — No symbol overlap; sequential ordering avoids cherry-pick risk.
- **`MembersList.svelte` does not exist (gap)** — CR-062 §3 names this file four times with "(verify name)". Grep confirms absent. **Architect must surface this to orchestrator** — decision required before CR-062 dispatch.
- **`skipApprovedGate` audit incomplete (gap)** — Verified: only TWO production callers — `sync-status.ts:40` (named in -03) AND **`mcp/src/mcp/register-tools.ts:106`** (NOT named in -03's §3). **Surface as plan amendment for STORY-027-03.**
- **CR-061 stdio tab ↔ CR-065 env-var-name coupling** — CR-065 §0.5 Q1 locks `CLEARGATE_SERVICE_TOKEN` final. CR-061 unit test must assert the rendered JSON contains the exact env var literal (string match, not constant import).
- **CR-064 ↔ STORY-027-01 `KNOWN_TYPES` coupling** — If -01 ships with `'sprint-report'` (hyphen) instead of `'sprint_report'` (underscore), CR-064's smoke emits `unknown_type` warnings. **M-plan for -01 cites underscore verbatim.**
- **`close_sprint.mjs` CR-063 → CR-064 ordering on a moving target** — Symbolic anchoring, not line-number. Mirror parity (live↔canonical) MUST hold per FLASHCARD `2026-05-04 #mirror #parity`.
- **CR-065 auth-adjacency** — Wave 1's only auth-touching item. Built-in mitigation: env-unset path byte-identical to pre-CR. **High-care merge** despite low intrinsic risk.
- **CLAUDE.md mirror invariant per-edit (STORY-027-05)** — Live↔canonical CLAUDE.md is pre-divergent by 4 canonical-only bullets pre-EPIC-024. -05's edit must apply IDENTICALLY but MUST NOT reconcile the 4-bullet divergence. QA runs CLEARGATE-block awk-diff per FLASHCARD `2026-05-02 #claude-md #mirror #prune`.
- **`scripts/ci-no-pm-sdk.mjs` glob runtime risk** — STORY-027-05 §3.2 example uses `import { globSync } from 'node:fs'` — this API does NOT exist in Node 24. **Surface as plan amendment for STORY-027-05.**

### 2.4 Lane Audit

Default `standard`. Rows added only for non-standard lanes.

| Item | Lane | Rationale (≤80 chars) |
|---|---|---|
| STORY-027-05 | **fast** | Doc edits + ≤30 LOC CI grep script; no runtime change; passes 7-check rubric. |

All other items (STORY-027-01..-04, CR-061, CR-062, CR-063, CR-064, CR-065, BUG-030) are `standard`.

**STORY-027-05 fast-lane verification:** 9 Gherkin scenarios literally fails 7-check #4 ("exactly one Scenario:"), but 5 are doc-state grep-assertions, not runtime test scenarios. **Architect overrides to fast lane** citing the doc-state-vs-runtime distinction and `expected_bounce_exposure: low`. Fast lane approved with §2.3 globSync-API amendment applied before Dev dispatch.

### 2.5 ADR-Conflict Flags

- **STORY-027-03 — Conditional flag (must amend protocol).** Origin-based gate policy is a contract change. STORY-027-05 MUST land in W1 BEFORE STORY-027-03 finishes W2 so the protocol section exists when -03 cites it. Sequencing: STORY-027-05 (W1) ✓ → STORY-027-03 (W2 #3) → no conflict.
- **STORY-027-05 — Locks an architectural rule.** "CLI never imports a PM-tool SDK" becomes CI-enforced. **No conflict with prior ADRs.**
- **CR-064 — Proves EPIC-027 headline metric.** Zero MCP code change to sync `"sprint"` + `"sprint_report"`. **No conflict.**
- **CR-063 ↔ CR-064 close_sprint.mjs ordering — Resolved.** CR-064 §0.5 Q4 locks the order. §2.2 binds the symbolic anchor. **No conflict.**
- **CR-065 ↔ CR-061 stdio tab — Coordinated.** CR-065 ships W1; CR-061 ships W3 referencing locked env var name. **No conflict.**
- **EPIC-027 vs. EPIC-010** — Extension, not redo. FLASHCARDs `2026-04-30 #mcp #cli #wire-format` + `2026-04-30 #mcp #frontmatter #serialization` reviewed; no conflict.
- **BUG-030 vs. `audit_log` cascade comment at schema.ts:168** — Out of scope per BUG-030 §3 Evidence. **No conflict; flagged for future triage.**
- **CR-062 vs. mailer consumer pattern** — Mailer wired only at `magic-link-provider.ts:88`; admin-api/members.ts does NOT call it today. CR-062 adds a second consumer using the shared `Mailer` interface. **No conflict.**
- **STORY-027-04 audit_log schema migration vs. BUG-030 schema.ts edit** — Different tables. **No conflict.**
- **CR-065 vs. STORY-006-05 token-issuance contract** — Service-token verification path exists. Reuse, not change. **No conflict.**
- **STORY-027-01 vs. `register-tools.ts:5` ITEM_TYPES import** — Plan amendment (not ADR conflict). Add `register-tools.ts` to -01 §3.1 Related Files.

### Open Decisions for Orchestrator

Three items require human/orchestrator response before Wave 1 dispatch:

1. **CR-062 component name.** Resolve whether the Developer extracts a new `admin/src/lib/components/MembersList.svelte` OR inlines the icon refactor in `admin/src/routes/projects/[id]/members/+page.svelte`. The CR §3 references the component four times with "(verify name)"; the file does not exist. Architect recommends: extract new component (CR-062 §2 already plans tests at `MembersList.test.ts`).
2. **STORY-027-04 audit_log schema state.** Before -04 dispatch, grep `mcp/src/db/schema.ts` for existing `audit_log` table definition and confirm whether `warningCode` + `origin` columns exist. -04's M-plan branches: columns exist → no migration; columns absent → migration required.
3. **STORY-027-05 globSync API choice.** Lock the actual import (`fs.promises.glob` from Node 22+, or `fast-glob` from existing deps, or fall back to a `readdir` recursion) before the Developer dispatch. The §3.2 example code uses an API that does not exist in Node 24 stable.

### 2.1 Phase Plan (Proposal — superseded)

Three waves; v2 mode.

**Wave 1 — Parallel-safe quintet (single orchestrator dispatch turn):**
- **BUG-030** — `mcp/src/db/schema.ts`, `mcp/migrations/<next>.sql`, `mcp/src/admin-api/members.ts`. Independent of EPIC-027 work.
- **CR-062** — `mcp/src/admin-api/{members,invites,invite-email,invite-email-template}.ts` + `admin/src/lib/components/{MembersList,InviteUrlModal}.svelte`. Touches `members.ts` (shared with BUG-030) but a different region — see §2.2 merge ordering.
- **CR-063** — `cleargate-cli/src/commands/wiki-ingest.ts` + `wiki/{scan,derive-bucket,page-schema}.ts` + `close_sprint.mjs` (canonical + live mirror) + backfill script + tests. Wiki-only; no MCP surface overlap.
- **CR-065** — `cleargate-cli/src/commands/mcp-serve.ts` (service-token env branch) + `cleargate-cli/src/auth/service-token-fetcher.ts` (new) + tests. Auth-adjacent but additive (existing keychain path unchanged).
- **STORY-027-05** — `CLAUDE.md` + `.cleargate/knowledge/cleargate-protocol.md` + `scripts/ci-no-pm-sdk.mjs` (new). Doc + CI grep, fast lane.

**Wave 2 — MCP core, hard-serialized on `mcp/src/tools/push-item.ts` and the new `mcp/src/lib/payload-contract.ts`:**
- **STORY-027-01** → **STORY-027-02** → **STORY-027-03** → **STORY-027-04**.
- Each story rebases on the prior story's tree. Architect must lock the file-region boundaries in the M-plan so Developers don't collide on push-item.ts edits.

**Wave 3 — Post-EPIC-027 follow-ons (parallel-safe; both depend on Wave-2 -01 minimum):**
- **CR-061** — `admin/src/lib/components/TokenIssuedModal.svelte` + tests. Depends on CR-065 (Wave 1) for the stdio tab content to be accurate. Authored after CR-065 merges.
- **CR-064** — `cleargate-cli/src/commands/push.ts` (typeMap + path validator) + `close_sprint.mjs` (Gate-4 MCP-push step, lands AFTER CR-063's wiki-ingest step in the same script) + smoke-test script. Requires STORY-027-01..04 fully landed before smoke can run; can author the code in parallel with CR-061 while Wave 2 finishes.

### 2.2 Merge Ordering (Shared-File Surface — Proposal)

| Shared File | Stories | Order | Rationale |
|---|---|---|---|
| `mcp/src/tools/push-item.ts` | STORY-027-01, -02, -03, -04 | strict: -01 → -02 → -03 → -04 | -01 creates the open-type validator + normalize. -02 adds reserved-keys + type-change forbid (guiding error) + size cap. -03 rewrites the gate-check region around lines 110-138 (origin guard) + advisory prefix at 160-175. -04 wraps the whole result in the new warnings array. Cannot parallelize. |
| `mcp/src/lib/payload-contract.ts` (new) | STORY-027-01, -02, -03, -04 | strict: -01 creates; -02/-03/-04 extend | New module ownership lives with -01. Subsequent stories add exports (constants, normalize, error classes, warning codes). -01 also seeds `KNOWN_TYPES` with `'sprint'`/`'sprint_report'` so CR-064 smoke pushes emit no `unknown_type` warning. Includes both ID-format regexes per EPIC-027 Q8 (TYPE-NNN OR 5-digit). |
| `mcp/src/admin-api/members.ts` | BUG-030, CR-062 | BUG-030 → CR-062 | BUG-030 wraps `db.delete(members)` at line ~250 in try/catch with 23503 → 409 mapping. CR-062 registers a new `POST /:mid/resend-invite` route + edits the existing `POST /:projectId/members` route to call the mailer. Different regions; sequential ordering avoids cherry-pick risk. |
| `mcp/src/db/schema.ts` | BUG-030 | (single) | `items.updatedByMemberId` nullability + onDelete clause. |
| `admin/src/lib/components/MembersList.svelte` | CR-062 | (single) | Icon-button refactor lives here. BUG-030 is server-only. |
| `admin/src/lib/components/TokenIssuedModal.svelte` | CR-061 | (single) | UI change isolated. |
| `cleargate-cli/src/commands/mcp-serve.ts` | CR-065 | (single) | Service-token env branch added before the keychain path. |
| `CLAUDE.md` | STORY-027-05 | (single) | Doc-only. |
| `.cleargate/knowledge/cleargate-protocol.md` | STORY-027-05 (+ possibly STORY-027-03) | STORY-027-05 owns; -03 may amend the gate policy paragraph | If STORY-027-03 needs to document the origin-based gate policy, it edits the protocol — Architect must serialize with -05 (-05 first, -03 amends). |
| `cleargate-planning/.cleargate/scripts/close_sprint.mjs` + `.cleargate/scripts/close_sprint.mjs` (mirrored) | CR-063, CR-064 | **strict: CR-063 → CR-064** | CR-063 adds a Gate-4 wiki-ingest step. CR-064 adds a Gate-4 MCP-push step immediately BEFORE the wiki-ingest step (per CR-064 §0.5 Q4 — MCP push first, wiki ingest second). Land CR-063 first since it's already 🟢; CR-064 rebases. |
| `cleargate-cli/src/commands/push.ts` | CR-064 | (single) | typeMap + path validator extension. |
| CR-061 stdio-tab content depends on CR-065 env var | CR-065 → CR-061 | sequential across waves | CR-065 ships in W1, defining `CLEARGATE_SERVICE_TOKEN`. CR-061 in W3 cites the env var in the stdio config snippet. CR-061's tests verify the snippet text matches the actual env-var name CR-065 implements. |

### 2.3 Shared-Surface Warnings (Proposal)

- **`push-item.ts` ↔ `payload-contract.ts` four-story serial chain** — Wave 2's four stories rebase on each other. Bounce-exposure compounds: a bug in -01 forces re-test of -02..-04. **Mitigation:** Architect M-plan must spec strong unit-test coverage on -01's surface (open-type validator + normalize + `KNOWN_TYPES`) so a green Wave-2 -01 merge is a real safety bar, not just typecheck-clean.
- **`members.ts` BUG-030 ↔ CR-062** — Both touch the same file. BUG-030 lands first (smaller surface, safer fix). CR-062 rebases. **Mitigation:** Architect M-plan references regions by symbol (`POST /:projectId/members`, `DELETE /members/:mid`), not line numbers.
- **`skipApprovedGate` callers** — STORY-027-03 splits the gate policy by `payload.origin`. The current `skipApprovedGate: true` caller in `mcp/src/tools/sync-status.ts` (verify path during SDR) must migrate to setting `payload.origin = "system:sync-status"` semantics. **Mitigation:** -03 keeps `skipApprovedGate` as a deprecated alias for one minor; remove in SPRINT-28+.
- **CR-061 stdio tab ↔ CR-065 env var name coupling** — CR-061's stdio snippet hardcodes `CLEARGATE_SERVICE_TOKEN`. If CR-065 renames the env var late in dev (e.g. to `CLEARGATE_SERVICE_BEARER`), CR-061's snippet ships wrong. **Mitigation:** CR-065's name is locked at Gate-1 ack (`CLEARGATE_SERVICE_TOKEN` final). CR-061's Developer references CR-065's resolved-Q1 verbatim, not the proposal text.
- **EPIC-027 breaking-change cliff** — STORY-027-03 changes how `pushItem()` is called by *every* server-side caller. Today only sync-status uses `skipApprovedGate`, but the audit must be exhaustive. **Mitigation:** Architect M-plan for -03 begins with a `grep -rn "pushItem\|cleargate_push_item\|skipApprovedGate" mcp/src/` audit, output cited verbatim in §3 of the story.
- **CR-064 ↔ STORY-027-01 KNOWN_TYPES coupling** — CR-064 smoke pushes `type: "sprint"` and `type: "sprint_report"`. If STORY-027-01's `KNOWN_TYPES` advisory registry omits these strings, the smoke pushes succeed but emit L2 `unknown_type` warnings. **Mitigation:** Architect M-plan for STORY-027-01 includes `'sprint'`, `'sprint_report'` in the initial `KNOWN_TYPES` array. QA-Verify on -01 reads the array literally. QA-Verify on CR-064 asserts `warnings: []` on the smoke responses.
- **`close_sprint.mjs` CR-063 ↔ CR-064 ordering** — Both edit the same script. Different steps, adjacent positions. CR-063 lands first; CR-064 rebases on the post-CR-063 tree. **Mitigation:** Architect M-plan for CR-064 specifies "insert before the line `// CR-063: wiki ingest sprint report`"; symbolic anchor rather than line-number reference.
- **CR-065 auth-adjacency** — CR-065 is the only Wave-1 item that touches auth-related code. Mitigation already built in: existing keychain path completely unchanged; service-token branch is purely additive; server-side verification path (`mcp/src/auth/service-token.ts`) already exists and is exercised by HTTP-MCP today. **High-care merge** despite low intrinsic risk — QA reads both branches in `mcp-serve.ts` and confirms the env-unset path is byte-identical to pre-CR.

### 2.4 Lane Audit (Proposal)

| Item | Lane | Rationale (≤80 chars) |
|---|---|---|
| STORY-027-01 | standard | New module + open-type validator + KNOWN_TYPES + tests; >50 LOC. |
| STORY-027-02 | standard | Cross-cutting validation + 3 new error classes + guiding-error shape. |
| STORY-027-03 | standard | Gate policy refactor + idempotent prefix + pull-tool; high-care. |
| STORY-027-04 | standard | Warnings array + audit_log integration; touches result shape. |
| STORY-027-05 | **fast** | Doc edits + ≤30 LOC CI grep script; no runtime impact. |
| CR-061 | standard | Modal UI + 3 snippet renderers + e2e test extension. |
| CR-062 | standard | Server (new route + mailer call) + UI (icons + modal). |
| CR-063 | standard | Wiki-ingest extension + 2-source idempotency + backfill 24 sprints. |
| CR-064 | standard | typeMap + path validator + close_sprint step + smoke script. |
| CR-065 | standard | Auth-adjacent: new env branch + static fetcher; ~80 LOC. |
| BUG-030 | standard | Schema migration + handler edit + test seeding. |

**Fast-lane justification for STORY-027-05** (all 7 checks per `.claude/agents/architect.md` §Lane Classification): (1) ≤2 files ≤50 LOC ✓ — `CLAUDE.md` para + protocol §, plus ≤30 LOC script; (2) no forbidden surfaces ✓ — `scripts/` is not auth/db/config/adapter; (3) no new dep ✓ — pure Node glob+grep; (4) zero acceptance scenarios ✓ — one Gherkin against the CI rule; (5) no runtime change ✓; (6) low bounce-exposure ✓; (7) no epic-spanning subsystem ✓.

### 2.5 ADR-Conflict Flags (Proposal)

- **STORY-027-03 ⚠️ Conditional flag.** Origin-based gate policy is a contract change for `pushItem()` callers. STORY-027-03 must include a one-line update to `.cleargate/knowledge/cleargate-protocol.md` declaring the `payload.origin` convention (`cleargate-cli`, `adapter:<vendor>`, `system:<service>`) and a flashcard entry under `#mcp #push-gate #origin`. Do not let -03 land as a code-only change.
- **STORY-027-05 ⚠️ Locks an architectural rule.** "CLI never imports a PM-tool SDK" becomes a CI-enforced invariant. Once shipped, any future adapter work must live server-side. Document the rationale in `cleargate-protocol.md` so the rule isn't mysterious to future Developers.
- **CR-064 ✓ Proves EPIC-027 headline metric.** Zero MCP code change to sync two new types (`sprint`, `sprint_report`). Cross-references EPIC-027 §1 Success Metrics as the binding verification step.
- **CR-063 vs. CR-064 close_sprint.mjs ordering ✓ Resolved.** Both touch the same Gate-4 pipeline; CR-064 §0.5 Q4 locks the order (MCP push first, wiki ingest second). Architect M-plan must reflect this.
- **CR-065 vs. CR-061 stdio tab ✓ Coordinated.** CR-065 must land in W1 so CR-061's W3 modal references the correct env var name (`CLEARGATE_SERVICE_TOKEN`).
- **EPIC-027 vs. EPIC-010** ✓ Extension, not redo. Wiki-query confirmed: EPIC-010's foundations stand; this Epic codifies the boundary [[EPIC-010]] implied.
- **BUG-030 vs. `audit_log` cascade comment at `schema.ts:168`** ✓ Out of scope per the BUG-030 §3 Evidence note. Latent issue flagged but not fixed here.
- **CR-062 vs. `magic-link-provider.ts:88` mailer consumer pattern** ✓ Aligned. CR-062 §0.5 Q4 revision confirmed the mailer is wired; CR adds a second consumer using the same `Mailer` interface.

## 3. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wave-2 push-item.ts four-story serial chain — bug in -01 forces re-test of -02..-04 | Medium | Sprint stalls 1-2 days mid-wave | Architect M-plan specs strong unit coverage on -01; QA-Red writes failing tests for the open-type + normalize semantics before -01 implementation; high-care merge for -01. |
| `skipApprovedGate` audit incomplete — hidden caller breaks post-merge | Medium | Adapter-driven pushes silently fail or CLI pushes silently bypass approved gate | -03's M-plan begins with exhaustive grep audit, cited verbatim. QA-Verify re-runs the grep in a fresh shell. |
| CR-063 ↔ CR-064 close_sprint.mjs ordering — Developer for CR-064 rebases incorrectly | Low | Gate-4 pipeline ordering wrong | Architect M-plan for CR-064 specifies symbolic anchor; QA-Verify reads the resulting script and asserts ordering. |
| CR-064 KNOWN_TYPES coupling — STORY-027-01 omits `'sprint'`/`'sprint_report'` from the advisory registry | Medium | Smoke pushes emit `unknown_type` L2 warnings | Architect M-plan for STORY-027-01 explicitly lists `'sprint'`, `'sprint_report'`. QA-Verify on -01 reads the array literally. |
| CR-065 env var rename late in dev breaks CR-061 stdio tab content | Low | Modal snippet ships wrong env var; users hit 401 | CR-065 Q1 locks `CLEARGATE_SERVICE_TOKEN` at Gate-1 ack. CR-061 references this exact string; CR-061's e2e test asserts the env var name in the rendered snippet. |
| CR-065 auth-adjacent change introduces regression in keychain path | Low | Existing `cleargate join` users broken | Service-token branch is additive — env-unset path stays byte-identical. Test case: boot with `CLEARGATE_SERVICE_TOKEN=` (empty) → keychain-refresh mode active, behavior pre-CR baseline. |
| BUG-030 schema migration in production — null-attribution for pre-deploy items | Low | Existing items keep their `updated_by_member_id` (no backfill needed) | Migration is `ALTER COLUMN DROP NOT NULL` + FK clause swap — non-destructive. Verified by reading BUG-030 §3. |
| CR-062 mailer best-effort error swallowing — silent fail in prod when Resend API hits 5xx | Low | User sees "email sent" UI but inbox is empty | CR-062 §0.5 Q4 mitigation: `mail_sent: false` returned by API when mailer throws; UI shows amber pill. Pino log line captures failure. |
| CR-064 smoke push grows MCP audit_log + items volume | Low | 4 new rows in items + 4-8 rows in audit_log; ≈250kB total | Acceptable. Full SPRINT-01..24 backfill deferred to a follow-up CR; not part of SPRINT-27 scope. |
| EPIC-027 `@cleargate/types` package deferred — duplicated constants between MCP + CLI + UI | Medium | Maintenance burden grows until SPRINT-28 lands -07 | Acceptable for one sprint. -01 places constants in `mcp/src/lib/payload-contract.ts` with a `// TODO(SPRINT-28): extract to @cleargate/types` comment so the migration is discoverable. |
| Type-change forbid grandfathering correctness | Low | First post-deploy re-push of legacy item must lock type, not reject | -02's M-plan handles this: existing cleargate_id + matching type = lock as before; existing + differing type = reject with guiding error. Grandfathered items pass first re-push unchanged. |
| Architect agent dispatching SPRINT-27 still uses pre-CR-065-architect.md prompt | Medium | Cross-story coupling checks may regress to 069-09-mishap pattern | Hand-port the 4 architect.md edits (or re-run `cleargate init` after prebuild) BEFORE running `cleargate sprint init` for SPRINT-27. Flagged in §Execution Guidelines. |

## 4. Execution Log

_Populated by DevOps as merges land._

## 5. Metrics & Metadata

- Stories planned: 11 (5 Story + 5 CR + 1 Bug)
- Estimated wall clock: ~12-14 working days for v2 mode (Wave 1 parallel quintet ~2-3d, Wave 2 serial 4-story chain ~5-6d, Wave 3 parallel pair ~2-3d, plus overhead). Window: 2026-05-19 → 2026-06-01 (14 calendar days).
- Estimated token cost: ~360-450k output (EPIC-027 stories carry more design density than SPRINT-26's fixes; CR-061 + CR-062 + CR-063 + CR-064 + CR-065 + BUG-030 in the 180-230k range)
- Owning epic refs: STORY-027-01..05 + CR-064 → [[EPIC-027]]; CR-061 + CR-065 → [[STORY-006-05]] / [[EPIC-006]]; CR-062 → [[STORY-006-04]] / [[EPIC-006]]; CR-063 → [[EPIC-002]]; BUG-030 → [[STORY-004-03]] (admin-api members)

## Execution Guidelines (Local Annotation — Not Pushed)

- **Sprint stays in Draft until pushed.** All ambiguity-gate conditions met as of 2026-05-14: EPIC-027 🟢 + approved, CR-061 / CR-062 / CR-063 / CR-064 / CR-065 / BUG-030 all 🟢 + approved. Once this sprint plan is pushed to MCP, `cleargate sprint init` can run when the user is ready.
- **Sprint runs `execution_mode: v2`.** Architect Sprint Design Review required — §2 above is the conversational-agent proposal; the Architect will rewrite during init and that version is binding.
- **Pre-init action — architect.md re-sync.** SPRINT-27's architect dispatches will use the live `/.claude/agents/architect.md`. The 2026-05-14 edits (cross-story coupling verification + §2.4 collision fix) live only in `cleargate-planning/.claude/agents/architect.md`. Before running `cleargate sprint init`: either (a) hand-port the four architect.md edits into `/.claude/agents/architect.md`, or (b) run `npm run prebuild` followed by `cleargate init` to rewrite the live `.claude/` from the canonical payload. Otherwise the SDR will use the OLD prompt and the 069-09-mishap class remains uncovered.
- **Story file drafting:** STORY-027-01 through -05 do NOT exist as files yet. They get drafted during sprint init (Architect SDR phase) before the lifecycle reconciler runs. This is intentional per "plan, don't start" — listing them in §1 commits to the decomposition; drafting them commits to scope detail.
- **CR-061 connection-info breadth:** intentionally scoped to the token-issued modal moment, not a persistent project-page panel. Token plaintext is one-shot by discipline (STORY-006-05); a per-issue 3-tab snippet IS the connection-info surface. A future enhancement could add a persistent "Connection info" widget — file as a separate CR after CR-061 + CR-065 ship if the UX gap remains.
- **Type-agnostic test bar (the EPIC-027 headline):** CR-064's smoke-test script (`cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs`) pushes SPRINT-25 + SPRINT-26 plans + reports to MCP at `type: "sprint"` and `type: "sprint_report"`, then pulls each back via `cleargate_pull_item`. All 4 pushes return 200 with `stored_type` matching, no `unknown_type` warning, no manual MCP edit required. Reporter at sprint close cites the smoke output verbatim.
- **Claude Desktop integration smoke (CR-061 + CR-065 proof):** After CR-061 + CR-065 merge, issue a token via admin console, copy the stdio tab JSON, paste into `~/Library/Application Support/Claude/claude_desktop_config.json`, restart Claude Desktop, verify the cleargate MCP server shows connected in the sidebar and `tools/list` returns the 10 cleargate tools.
- **Full backfill posture:** CR-064 only smoke-tests the last two sprints. If smoke passes and the user wants the full SPRINT-01..24 history in MCP (e.g. for an Overview-tab roadmap view), file a separate CR.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Push.** All 19 open questions across EPIC-027 (8) + CR-061 (4) + CR-064 (4) + CR-065 (4 in-flight at draft) resolved at Gate-1 ack 2026-05-14. EPIC-027 + CR-061 + CR-062 + CR-063 + CR-064 + CR-065 + BUG-030 all approved. Sprint plan ready for push to MCP.

Requirements to pass to Green (Ready for Execution):
- [x] Risk table populated with at least one row.
- [x] Discovery-checked (`context_source` set).
- [x] All in-scope items exist in `pending-sync/` and are 🟢 + approved.
- [ ] EPIC-027 decomposed into story files in `pending-sync/STORY-027-NN_*.md`. **Intentionally deferred to sprint init (Architect SDR).**
- [x] CR-061 4 §0.5 Qs resolved.
- [x] CR-064 4 §0.5 Qs resolved.
- [x] CR-065 4 §0.5 Qs resolved.
- [x] EPIC-027 ambiguity 🟢 + approved.
- [x] `approved: true` set in YAML frontmatter.
