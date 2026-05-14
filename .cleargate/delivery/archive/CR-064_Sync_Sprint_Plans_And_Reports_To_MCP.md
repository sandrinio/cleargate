---
cr_id: CR-064
parent_ref: EPIC-027
parent_cleargate_id: EPIC-027
sprint_cleargate_id: null
carry_over: false
area: cli,mcp,scripts
status: Approved
approved: true
created_at: 2026-05-14T00:00:00Z
updated_at: 2026-05-14T00:00:00Z
created_at_version: cleargate@0.11.5
updated_at_version: cleargate@0.11.5
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-14T21:22:11Z
context_source: |
  Direct human ask 2026-05-14 during SPRINT-27 planning: "what about ingesting
  and syncing sprint reports and sprint plans too with mcp?"

  EPIC-027 opens the MCP type validator so `type: "sprint"` and `type:
  "sprint_report"` become legal strings. That unblocks but does not wire the
  CLI/script-side push path. Today `cleargate push` uses a frontmatter-key
  `typeMap` at push.ts:404-412 (no entry for sprint_id) and its path validator
  is `delivery/`-only. Sprint reports live under `sprint-runs/SPRINT-NN/` and
  cannot be pushed through the existing command.

  This CR is the proof loop for EPIC-027's headline metric — "adding a new
  syncable type requires zero MCP code changes" — by demonstrating positive
  push of `type: "sprint"` (the archived plan) and `type: "sprint_report"`
  (the SPRINT-NN_REPORT.md artifact) end-to-end against the deployed MCP.

  Wiki-side ingest for sprint reports is owned by [[CR-063]] (already 🟢
  approved, also in SPRINT-27). The two CRs share one file edit — they both
  append a Gate-4 step to close_sprint.mjs — so merge ordering matters
  (see §2 below).
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-14T19:57:39.993Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-064
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-14T19:51:27Z
  sessions: []
push_version: 1
---

# CR-064: Sync Sprint Plans + Reports to MCP (Type-Agnostic Sync Proof Loop)

## 0.5 Open Questions

- **Question:** What's the canonical `type` string for a sprint report — `sprint_report` (snake_case, matches `sprint-runs/` filename convention) or `sprint-report` (kebab-case, matches the EPIC-027 type regex `^[a-z][a-z0-9_-]*$`)?
- **Recommended:** `sprint_report`. Snake_case matches the existing template filename (`templates/sprint_report.md`) and the FLASHCARD/protocol prose. Both forms pass the regex; snake-case is the local-convention winner. Document in `KNOWN_TYPES` (advisory registry from STORY-027-01).
- **Human decision (2026-05-14):** Accepted — `sprint_report`.

- **Question:** Should `cleargate push` of a report file auto-derive type from filename (override frontmatter), or require a frontmatter signal?
- **Recommended:** Filename override when the path matches `.cleargate/sprint-runs/SPRINT-NN/{REPORT.md,SPRINT-NN_REPORT.md}`. Reports don't have a discriminator field in frontmatter today (no `report_id:`; the file uses `sprint_id:` like the plan). Adding a frontmatter discriminator would force template edits across SPRINT-03..26 backfill targets. The wiki-ingest equivalent (CR-063 §3 path validator) already uses path-based derivation; mirror the pattern.
- **Human decision (2026-05-14):** Accepted — filename-based override.

- **Question:** Backfill scope — push every existing sprint plan (SPRINT-01..26) and report (SPRINT-03..26) to MCP, or only the most-recent two (SPRINT-25 + SPRINT-26) as a smoke test?
- **Recommended:** Smoke-test the most-recent two in this CR (SPRINT-25 + SPRINT-26 plans, SPRINT-25 + SPRINT-26 reports — 4 push calls). Full backfill is mechanically trivial once smoke passes but its blast on MCP storage + audit_log volume is real (24 plans × ~30k payload + 24 reports × ~30k = ~1.5MB of fresh rows). File a follow-up CR for full backfill if the smoke test passes and the user wants the history visible in the admin UI. The Overview-tab work (future epic) will benefit from full backfill but doesn't gate on it.
- **Human decision (2026-05-14):** Accepted — smoke last two only; full backfill deferred to follow-up CR.

- **Question:** Gate-4 close pipeline — should the close_sprint.mjs MCP push run BEFORE or AFTER the CR-063 wiki ingest of the same report?
- **Recommended:** MCP push first, wiki ingest second. Reason: if MCP push fails (network, auth), the wiki ingest still completes on the local file — partial success is better than dual failure. Both are idempotent so order doesn't affect correctness, only failure surface area. Architect M-plan locks the ordering in close_sprint.mjs.
- **Human decision (2026-05-14):** Accepted — MCP push first, wiki ingest second.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "`cleargate push` only handles items under `.cleargate/delivery/`" — was true; sprint reports under `sprint-runs/` were unpushable. After this CR the push command accepts a second permitted root, gated to two allowlisted basenames.
- "Sprint plans don't sync to MCP" — was true because the closed Zod enum had no `sprint` type. After EPIC-027 -01 lands (validator opens) and this CR (typeMap entry), `cleargate push delivery/archive/SPRINT-NN_*.md` succeeds with `type: "sprint"`.
- "Sprint reports are terminal artifacts read only by Reporter + humans" — was true; reports become MCP items addressable via `cleargate_pull_item` and visible to future Overview-tab cards.
- "Gate-4 close pipeline ends at wiki ingest" — was true after CR-063 lands wiki ingest. This CR appends a second post-close step: push the report to MCP.

**New Logic (The New Truth):**
- `cleargate-cli/src/commands/push.ts` `typeMap` (line 404-412) gains `sprint_id: "sprint"`.
- `cleargate push` accepts a second permitted root: `.cleargate/sprint-runs/SPRINT-NN/<basename>` where `<basename>` is one of `REPORT.md` or `SPRINT-NN_REPORT.md`. Anything else under `sprint-runs/` is rejected as before (token-ledger, hook-log, plans/, etc.).
- When the resolved path matches the report carve-out, type is forced to `"sprint_report"` regardless of frontmatter (path-based override mirrors CR-063 §3 derive-bucket path-aware variant).
- `close_sprint.mjs` Gate-4 pipeline gains one new step: `cleargate push <report-path>` runs after the existing Step 6.X added by CR-063. Failure non-fatal; logs warning, doesn't block close.
- A new smoke-test script `cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs` pushes the most-recent two sprint plans + reports as an end-to-end EPIC-027 verification. Output: 4 push results + summary.

## 2. Blast Radius & Invalidation

- [ ] Update Epic: [[EPIC-027]] — this CR proves the headline metric (zero-MCP-code-change for new types). Reference in EPIC-027 §1 Success Metrics for the verification step.
- [ ] Touch downstream item: [[CR-063]] — both edit `close_sprint.mjs` Gate-4 post-close pipeline. CR-063 lands first (wiki ingest step); CR-064 lands second (MCP push step) immediately before CR-063's wiki ingest in the pipeline order. **Merge order: CR-063 → CR-064.** See SPRINT-27 §2.2 for explicit row.
- [ ] Touch downstream item: [[STORY-027-01]] — `KNOWN_TYPES` advisory registry must include `sprint` and `sprint_report` so the L2 `unknown_type` warning doesn't fire on these legitimate pushes. -01's M-plan must include the two entries.
- [ ] Database schema impacts? **No.** Pure CLI + script wiring. MCP storage already handles arbitrary type strings (text + JSONB).
- [ ] MCP audit_log impact: 4 new `audit_log` rows per smoke test (2 plans + 2 reports). One-shot; no recurring volume until full backfill is filed as a separate CR.
- [ ] Wiki ingest interaction: pushing a sprint plan to MCP triggers no wiki ingest (push and ingest are independent). Pushing a sprint report to MCP and then re-ingesting the wiki is the existing CR-063 flow — unchanged.
- [ ] Existing items renamed by EPIC-027 normalize: `type: "Sprint"` (mixed case) would normalize to `"sprint"` per STORY-027-01 — but our frontmatter has no such cases. Verify via grep on SPRINT-NN_*.md frontmatter before push.
- [ ] Mirror parity: `close_sprint.mjs` edit lands in both `cleargate-planning/.cleargate/scripts/close_sprint.mjs` (canonical) and `.cleargate/scripts/close_sprint.mjs` (live). `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs` regenerates via `npm run prebuild`.

## 2.5 Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/push.ts:210-212` — `getItemType(fm)` reads frontmatter via `typeMap`. Extend `typeMap` at line 404-412 with `sprint_id: "sprint"`. Add a path-aware override branch before the frontmatter check fires.
- **Surface:** `cleargate-cli/src/commands/push.ts:84` — `resolveActiveSprintDir(projectRoot)` plus `appendSyncLog` at line 270. Sync log writes to the active sprint root. Confirm report-push writes to the right sprint root (the one being closed, not necessarily the active one — close_sprint.mjs sets the context).
- **Surface:** `cleargate-cli/src/commands/push.ts` path validator — locate the `delivery/` check; extend to accept `sprint-runs/SPRINT-NN/<allowlisted-basename>` as a second permitted root. Pattern mirrors CR-063's wiki-ingest extension at `wiki-ingest.ts:102-113`.
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — Gate-4 post-close pipeline. CR-063 adds a wiki-ingest step here; this CR adds one MCP-push step immediately before the wiki-ingest step (per §0.5 Q4 recommendation). Skip on legacy sprints where the report file is absent.
- **Surface:** `.cleargate/scripts/close_sprint.mjs` — mirror; both copies must update.
- **Surface:** `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs` — regenerates via `npm run prebuild`; do not hand-edit.
- **Surface:** `mcp/src/lib/payload-contract.ts` (created by STORY-027-01) — `KNOWN_TYPES` constant. Add `'sprint', 'sprint_report'` so L2 `unknown_type` warning suppresses on these pushes. Coordinate with STORY-027-01's M-plan (Architect responsibility during SDR).
- **Why this CR extends rather than rebuilds:** The push command, sync log, sprint-runs convention, and Gate-4 pipeline all exist. This CR composes them. No new module; no new abstraction. The smoke-test script is the only new file.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/push.ts` — (1) extend `typeMap` with `sprint_id: "sprint"`; (2) add path-aware type override: if `path.match(/sprint-runs\/SPRINT-\d+\/(REPORT|SPRINT-\d+_REPORT)\.md$/)`, set type to `"sprint_report"` and skip frontmatter type derivation; (3) extend path validator to accept the second permitted root with allowlisted basenames; (4) ensure the existing `title` requirement at line 222 works for both — sprint plans have a body H1; sprint reports have one too. If frontmatter lacks `title`, derive from the H1 (path-aware fallback).
- `cleargate-cli/src/commands/push.test.ts` (or the existing node:test file) — new cases per §4.
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — append MCP-push step before the CR-063 wiki-ingest step. Non-fatal on failure; warns + continues.
- `.cleargate/scripts/close_sprint.mjs` — mirror.

**Add:**
- `cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs` — one-shot script: push the most-recent two sprint plans (`archive/SPRINT-25_*.md`, `archive/SPRINT-26_*.md`) and the two reports (`sprint-runs/SPRINT-25/SPRINT-25_REPORT.md` if present, fallback `REPORT.md`; same for SPRINT-26). Output: one line per push with `cleargate_id`, `stored_type`, `version`, plus aggregate `4 pushed, 0 failed`. Idempotent — re-runs bump version numbers but don't fail.

**Coordinate with (do NOT modify in this CR):**
- `mcp/src/lib/payload-contract.ts` `KNOWN_TYPES` — owned by STORY-027-01; CR-064 verification depends on -01 including `'sprint'` and `'sprint_report'` in that constant. Architect M-plan for -01 must include this; QA-Verify on -01 must confirm.
- The sprint plan template + sprint report template — no schema changes needed.
- The wiki-ingest pipeline — owned by CR-063.

**Do NOT modify:**
- The Reporter agent or report-generation logic.
- Anything under `mcp/src/tools/` beyond what STORY-027-01..04 already cover.
- The CR-063 wiki-ingest path validator (it stays its own thing — CR-064 adds a parallel path-validator extension to `push.ts`).

## 4. Verification Protocol

**Type + tests (cleargate-cli):**
```sh
cd cleargate-cli && npm run typecheck && npm test
```

New unit cases in `push.node.test.ts`:
- Frontmatter with `sprint_id: "SPRINT-26"` and a path under `delivery/` → type `"sprint"`.
- Path matching `sprint-runs/SPRINT-26/SPRINT-26_REPORT.md` → type `"sprint_report"` regardless of frontmatter (including absent / blank type).
- Path matching `sprint-runs/SPRINT-12/REPORT.md` (legacy) → type `"sprint_report"`.
- Path under `sprint-runs/SPRINT-26/token-ledger.jsonl` → rejected (path validator).
- Path under `sprint-runs/SPRINT-26/plans/M1.md` → rejected (not allowlisted basename).
- Title fallback: report frontmatter has no `title:` but H1 reads `# SPRINT-26 Report: <Title>` → push payload's `title` derives from the H1 first line.

**End-to-end smoke (after EPIC-027 -01..-04 land + this CR lands):**
```sh
# Build CLI from local source
cd cleargate-cli && npm run build

# Run smoke script
node cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs

# Expected output:
#   ✓ SPRINT-25 plan pushed   type=sprint        version=N
#   ✓ SPRINT-25 report pushed type=sprint_report version=N
#   ✓ SPRINT-26 plan pushed   type=sprint        version=N
#   ✓ SPRINT-26 report pushed type=sprint_report version=N
#   4 pushed, 0 failed
```

**MCP-side verification (proves the round trip):**
```sh
# Pull back each pushed item and assert type matches what was pushed
cleargate pull SPRINT-26       # expect stored_type=sprint
cleargate pull SPRINT-26_REPORT # expect stored_type=sprint_report
```

**Gate-4 integration (proves the close_sprint.mjs wiring):**
```sh
# Simulate a Gate-4 close on a finished sprint (dry run if available, else use a test fixture sprint)
node scripts/close_sprint.mjs --sprint-id SPRINT-26 --dry-run
# Output must include both steps in the right order:
#   Step 6.X: MCP push of sprint report
#   Step 6.Y: Wiki ingest of sprint report  (← CR-063)
```

**EPIC-027 headline metric check:**
- All 4 smoke pushes return 200 with `stored_type` matching the pushed type.
- MCP audit_log shows 4 new rows with no errorCode set.
- `cleargate_pull_item` round-trip succeeds for all 4 cleargate_ids.
- No `unknown_type` L2 warning fires on any of the 4 pushes (STORY-027-01's `KNOWN_TYPES` must include both strings).

**Pass criteria:**
- Unit tests all green.
- Smoke script returns `4 pushed, 0 failed`.
- Pull round-trip succeeds for all 4 items.
- Gate-4 dry run shows the two ordered steps.
- No warnings or errors in MCP audit_log.

## Existing Surfaces

> L1 reuse audit. Source-tree implementations this CR extends.

- **Surface:** `cleargate-cli/src/commands/push.ts` — existing push command with typeMap; extended to recognize sprint-runs/SPRINT-NN/REPORT*.md paths and derive type "sprint_report".
- **Surface:** `.cleargate/scripts/close_sprint.mjs` — existing Gate-4 pipeline; extended with MCP push step (before CR-063's wiki-ingest step).
- **Surface:** `mcp/src/tools/push-item.ts` — EPIC-027 STORY-027-01 opens the type validator; this CR proves the end-to-end by pushing sprint + sprint_report types.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Execution.** All four §0.5 questions resolved 2026-05-14.

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
- [x] All §0.5 Open Questions resolved.
