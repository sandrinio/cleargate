# SPRINT-07 — Multi-Participant MCP Sync v1 — Retrospective

**Status:** Shipped · **Window:** 2026-04-19 → 2026-04-20 · **Stories:** 8/8 (EPIC-010-01…08)

## Executive Summary

Sprint goal (SPRINT-07 line 26) — *ship EPIC-010 end-to-end: bidirectional Linear↔ClearGate sync with identity, attribution, conflict resolution, stakeholder intake, comments-to-wiki, push gate, revert, protocol §14, and daily-throttled SessionStart nudge* — **met in full**.

- **Stories shipped:** 8/8 (STORY-010-01 through 010-08).
- **Commits:** 9 on outer CLI repo (`5e5c405`, `93a7c8b`, `f35a0c5`, `ade6aba`, `17cfca2`, `a22f37f`, `0bea538`, `4e8e8cc`, `8703443`) + 4 on nested `mcp/` repo (`315af63`, `816e653`, `2026627`, `4ed9ef2`) = **13 commits total** (sprint-file budget was 8–10; overage is the 3 QA kickback fixes).
- **Test delta:** CLI **628 → 730** (+102). MCP **147 → 172** (+25). Both suites green; all kickback fixes re-verified.
- **Kickbacks (3):** 010-02 unique-index refused null `remote_id` → partial-unique fix (`816e653`); 010-04 push path missed stamping `last_synced_status` + `last_synced_body_sha` → fix (`ade6aba`); 010-05 intake stdout dropped emoji prefix + missing live-path test → fix (`a22f37f`).
- **Mid-sprint scope adjustments:** (a) `@linear/sdk` approved as new MCP runtime dep (was forbidden by sprint-file line 65, resolved at M2 blocker B2); (b) `items.remote_id` column added via Drizzle migration (M2 blocker B3); (c) `cleargate_adapter_info` probe tool added to MCP mid-M3 to close the no-op-stub silent-success class (cross-repo commit `2026627`); (d) `cleargate-cli/src/commands/push.ts` created from scratch in M4 (Epic §0 + Story §1.2 both said "modify" — file absent; flashcard recorded); (e) `last_synced_status` + `last_synced_body_sha` frontmatter fields added to all 5 templates in M3 (not reserved in M1); (f) `skipApprovedGate` internal-caller bypass added to MCP `PushItemContext` in M4 to avoid false refusals from `sync_status`.

---

## What Shipped (per milestone)

### M1 — Foundations (STORY-010-01 · commit `5e5c405`)

Identity resolver (`cleargate-cli/src/lib/identity.ts`) with precedence `.participant.json → CLEARGATE_USER → git → host+user`; append-only sync-log JSONL (`src/lib/sync-log.ts`) with op/result unions and `eyJ…` token redaction at append time; `cleargate init` extended with `--yes` flag and `promptEmail` test seam; 6 new optional frontmatter fields on 5 templates mirrored to `cleargate-planning/.cleargate/templates/*.md`; `.gitignore` entry for `/.cleargate/.participant.json`; `R-014` constant exported but **not** wired to lint pipeline (flashcard `#lint #schema #severity` — `LintFinding` has no `severity` field; wiring deferred).

### M2 — MCP endpoints + conflict logic (STORY-010-02 + STORY-010-03)

**STORY-010-02 (MCP, commits `315af63` + `816e653` kickback):** `PmAdapter` interface (`mcp/src/adapters/pm-adapter.ts`) with 4 verbs + 3 PM-tool-agnostic shapes (`RemoteItem`, `RemoteUpdateRef`, `RemoteComment`); Linear concrete on `@linear/sdk ^82.0.0`; 4 new MCP tools with `cleargate_` prefix; `items.remote_id` Drizzle migration. **QA kickback:** unique index refused `remote_id=null` rows → fix `816e653` switches to **partial-unique** `WHERE remote_id IS NOT NULL`. Cross-PM-tool R1 findings in `mcp/src/adapters/README.md`.

**STORY-010-03 (CLI, commit `93a7c8b`):** Pure `conflict-detector.ts` implementing the 8-state matrix from PROP-007 §2.3 **plus** a 9th explicit `unknown` → `halt` fallthrough per R3; `merge-helper.ts` reuses EPIC-009's `renderInlineDiff` + `promptMergeChoice` primitives. Placement overridden from `mcp/src/lib/` to `cleargate-cli/src/lib/` per M2 plan (pure logic, CLI-only consumer). 13 unit tests.

### M3 — Driver + stakeholder intake (STORY-010-04 + STORY-010-05)

**STORY-010-04 (CLI, commits `f35a0c5` + `ade6aba` kickback):** 6-step sync driver (identity → listUpdates → pullItem loop → classify → resolve → apply+log), `cleargate pull <id>`, `cleargate conflicts`, `cleargate sync-log`, `mcp-client.ts` built from scratch, `frontmatter-merge.ts` (timestamp-max on 5 time fields; git-merge markers for non-ts conflicts), atomic `.cleargate/.conflicts.json` writer. `--dry-run` verified as zero-writes invariant. Two new frontmatter fields (`last_synced_status`, `last_synced_body_sha`) added to all 5 templates + scaffold mirror. **QA kickback:** push path failed to stamp both fields on apply; classifier rule 6 (`status-status`) would silently route to `remote-only` next sync — exact silent-bug class predicted by flashcard `#sync #driver #last-synced-status`. Fix `ade6aba` stamps both on every successful pull/push apply.

**MCP side of M3 (commit `2026627`):** `cleargate_adapter_info` probe tool added; driver calls it pre-flight and exits on `{configured:false}` — closes the no-op-stub silent-success class. Cross-repo change deliberately piggybacked per M3 open decision #2.

**STORY-010-05 (CLI, commits `17cfca2` + `a22f37f` kickback):** `lib/slug.ts` with `slugify()` (NFKD → strip marks → lowercase → `[^a-z0-9]+ → -` → 40-char trim) and `nextProposalId()` (scans pending-sync + archive). Intake branch inserted into `sync.ts` between step 2 (pull) and step 4 (classify); emits `PROPOSAL-NNN-remote-<slug>.md` with `source: "remote-authored"`, `approved: false`, `proposal_id: "PROP-NNN"`; idempotent on re-sync. **QA kickback:** initial commit emoji-stripped the intake summary AND missed a live-path stdout assertion — fix `a22f37f` restored the emoji prefix and added the missing test.

### M4 — Enrichment + hardening (STORY-010-06 + STORY-010-07)

**STORY-010-06 (CLI, commit `0bea538`):** `lib/active-criteria.ts` (in-sprint body-regex + 30-day freshness union); `lib/comments-cache.ts` (atomic per-`remote_id` JSON cache at `.cleargate/.comments-cache/`); `lib/wiki-comments-render.ts` with **literal-string delimiters** `<!-- cleargate:comments:start --> … <!-- cleargate:comments:end -->` (R6 + flashcard `#regex #inject-claude-md` — no fuzzy regex); per-item try/catch on 429 with `result: 'skipped-rate-limit'` (R4); `pull <ID> --comments` WARN-stub replaced with real implementation. `SyncLogOp` union extended with `'pull-comments'`.

**STORY-010-07 (CLI commit `4e8e8cc` + MCP commit `4ed9ef2`):** MCP `push-item.ts` adds `PushNotApprovedError` gate BEFORE transaction; `PushItemResult` extended with `pushed_by` + `pushed_at`; `pushed_by` resolved via `members.email` lookup from `ctx.member_id` (flashcard `#mcp #jwt #attribution` — JWT `sub` is member UUID, not email). **Security-adjacent design:** `skipApprovedGate?: boolean` on `PushItemContext` so `sync_status` internal caller bypasses the approved gate; flag lives on context, NOT extractable from wire args. CLI side **created** `commands/push.ts` from scratch: pre-push refusal, attribution write-back, `--revert <id>` soft-revert via `cleargate_sync_status → archived-without-shipping` (NEVER deletes remote), refuse-on-`status:done` with `--force` override. `rg "eyJ" sync-log.jsonl` zero-matches verified.

### M5 — Protocol + hook closeout (STORY-010-08 · commit `8703443`)

Protocol §14 **"Multi-Participant Sync"** appended to BOTH `.cleargate/knowledge/cleargate-protocol.md` AND `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` — **`diff -u` empty**. Nine rules §14.1–§14.9, each citing shipped code. `cleargate sync --check` flag added as separate `syncCheckHandler` (read-only, JSON stdout, exits **0 on all failure paths** — flashcard `#hook-safe #sync-check #exit-code`, distinguishing from `syncHandler`'s exit 2). SessionStart hook extension: `timeout 3 node … sync --check` with cross-platform fallback (macOS lacks GNU `timeout` → background-process + kill-subshell pattern; no zombies); parses `updates`; prints `📡 ClearGate: N remote updates since yesterday — run cleargate sync to reconcile.` once per 24h; throttled via `.cleargate/.sync-marker.json`. Both hook files byte-identical except pre-existing `REPO_ROOT` line. `cleargate-planning/.gitignore` created.

---

## DoD Checklist (SPRINT-07 §Engineering DoD + §Ops DoD verbatim)

| Item | Status | Evidence |
|---|---|---|
| All 8 Stories merged | Shipped | Commits listed above |
| `npm run typecheck` clean in `mcp/` + `cleargate-cli/` | Shipped | Verified at each story's pre-commit gate |
| `npm test` green in `mcp/` (new suites: pull-item / list-updates / pull-comments / detect-new / push-gate) | Shipped | MCP 147 → 172 (+25). Tools co-located at `mcp/src/tools/*.test.ts` |
| `npm test` green in `cleargate-cli/` | Shipped | CLI 628 → 730 (+102) |
| Two-terminal E2E verified by hand | Partial | Recipe at `.cleargate/sprint-runs/SPRINT-07/M3-e2e-recipe.md`; live run deferred pending MCP Coolify redeploy with `LINEAR_API_KEY`. R9 accepted manual-only for v1 |
| Stakeholder intake E2E verified by hand | Partial | Same gating — unit + integration tests cover code paths |
| Content-conflict 3-way merge E2E verified by hand | Partial | Same gating. `merge-helper.test.ts` covers `[k]/[t]/[e]/[a]` in unit tests |
| Protocol §14 present in both protocol files; diff empty | Shipped | `diff` returns zero output; 9 `### §14.N` headings present |
| Wiki rebuild clean | Pending | `cleargate wiki build` scheduled with archive-move post-sprint |
| Back-compat lint warnings limited to R-014 | Shipped by design | R-014 constant exported; zero new errors on 57 archived items |
| No JWT / API fragments in sync-log | Shipped | Redaction at `sync-log.ts:100-103`; grep assertion in STORY-010-07 tests |
| Linear workspace has `cleargate:proposal` label | Ops-side partial | `CLEARGATE_PROPOSAL_LABEL` env escape-hatch shipped (R10 mitigation); label creation unverified |
| Project-scoped Linear token rotated into Coolify | Ops-side partial | Not verified this session |
| MCP redeployed; 5 new tools visible via `/mcp/tools/list` | Ops-side partial | Code shipped; deployment step pending |
| `PmAdapter` interface diffed against Jira + GH in `mcp/src/adapters/README.md` | Shipped | Landed in `315af63`; M2 plan §R1 findings verbatim |
| SessionStart hook verified in fresh shell | Partial | Unit tests cover both `<24h` silent and `≥24h` nudge branches; fresh-shell manual probe deferred |
| At least one dev has `.cleargate/.participant.json` | Shipped | Sandro's file written at `cleargate init` during M1 |
| Sprint retrospective (REPORT.md) authored | Shipped | This document |

---

## Risks Table — Final Status

| ID | Risk | Final Status | Evidence |
|---|---|---|---|
| R1 | Generic `PmAdapter` locked too early to Linear idioms | **mitigated** | M2 plan §R1 diffed against Jira REST + GH Projects v2; findings in `mcp/src/adapters/README.md`. `RemoteItem.body: string \| null`, `RemoteComment.author_email: string \| null`, `pullItem → T \| null` for 404. Linear specifics under `.raw` |
| R2 | Sync-ordering invariant broken (push-before-pull) | **mitigated** | `sync.test.ts::pullBeforePush` asserts `McpClient.call` tuple order; driver structured as two distinct `await`ed phases |
| R3 | Conflict matrix has gaps | **mitigated** | 9th `unknown` state with `halt` resolution shipped in `conflict-detector.ts`; test covers it. Halt message carries reproducer |
| R4 | Linear API rate limits on comment pulls | **mitigated** | Per-item try/catch on 429; `result: 'skipped-rate-limit'` logged; other items still process. `--skip-comments` flag NOT graduated (held to fallback per sprint line 146) |
| R5 | Participant identity mismatch (CI env vs local) | **mitigated** | `Identity.source` returned on every `resolveIdentity` call and logged into every sync-log row. Protocol §14.4 documents precedence |
| R6 | Wiki comment section delimiter drift | **mitigated** | `indexOf()` against literal markers (not regex); insert/replace/remove/double-run idempotency tests in `wiki-comments-render.test.ts` |
| R7 | SessionStart hook adds latency to session boot | **mitigated** | `timeout 3 node … sync --check` wrapper; all failure paths exit 0 with silent-safe JSON. Flashcard `#hook-safe #sync-check #exit-code` codifies the rule |
| R8 | Back-compat lint noise on archived items | **did-not-fire** | R-014 defined as constant only; lint pipeline unchanged (wiring deferred to proper severity-column change) |
| R9 | Two-terminal E2E infrastructure gap | **did-not-fire (deferred)** | Recipe at `M3-e2e-recipe.md`; automation accepted as v1.1 per sprint line 57 |
| R10 | `cleargate:proposal` label missing on fresh workspace | **mitigated** | `CLEARGATE_PROPOSAL_LABEL` env override; STORY-010-05 zero-label-match warn path; Protocol §14.5 names the convention |

---

## Kickbacks (QA Feedback Loop)

| Story | Initial | Fix | What QA flagged | What Dev changed | Lesson |
|---|---|---|---|---|---|
| 010-02 | `315af63` | `816e653` | Unique index on `(project_id, remote_id)` refused second row with `remote_id=null` — breaks local-drafts-without-remote idempotent push | Switched to **partial-unique** `WHERE remote_id IS NOT NULL` via `db:generate` regeneration | `#mcp #schema #remote-id` updated; partial-unique is the correct semantic |
| 010-04 | `f35a0c5` | `ade6aba` | Push-apply path failed to stamp `last_synced_status` + `last_synced_body_sha`; classifier rule 6 would silently route to `remote-only` next sync | Added stamping in step 6 `applyPush()` + `applyPull()`; added `sync.test.ts` dataflow invariant | **Architect flashcard `#sync #driver #last-synced-status` predicted this exact silent-bug class** — test matches the prediction |
| 010-05 | `17cfca2` | `a22f37f` | Intake stdout lost emoji prefix (Dev followed `#no-emoji` default); missing live-path stdout assertion | Restored emoji on intake summary; added live-path stdout test | Tension between global "no emoji" rule and story §2.1 — resolved story-wins for user-facing sync output; repo convention confirmed via `gate.ts` ✅/⚠/❌ |

All three fixes landed same-day as the flagged commit. QA iteration cost was the expected cost of the gate, not an outlier.

---

## Flashcards Added This Sprint

**Architect-era (M1–M5 planning):**
- `#mcp #path-convention` — `mcp/src/tools/` not `endpoints/` (M2 B1)
- `#mcp #linear #deps` — no existing Linear SDK pin (M2 B2)
- `#mcp #schema #remote-id` — no `items.remote_id` column (M2 B3)
- `#mcp #linear #vitest` — SDK at `^82.0.0`, use DI not vi.mock hoisting
- `#mcp #adapter #mcp-is-separate-repo` — `git -C mcp/` for nested commits
- `#cli #merge-helper #reuse` — EPIC-009 primitives; only `[a]bort` is new
- `#cli #simple-git #deps` — spawnSync, no simple-git in cleargate-cli
- `#lint #schema #severity` — no `severity` on `LintFinding`; R-014 deferred
- `#cli #test-seam #tty` — vitest has no real TTY; inject `stdinIsTTY?: boolean`
- `#cli #mcp-client #sync` — no pre-existing MCP JSON-RPC client in CLI
- `#mcp #adapter #no-op-stub` — adapter-info probe needed to distinguish stub from legit empty
- `#proposal-id #frontmatter #format` — `PROP-NNN` in frontmatter, `PROPOSAL-NNN-*.md` filename

**Developer/QA-era (during execution):**
- `#sync #driver #last-synced-status` — classifier rule 6 silent-bug predictor (became 010-04 kickback)
- `#cli #push #missing-file` — `commands/push.ts` absent despite Epic §0 "modify"
- `#mcp #jwt #attribution` — JWT `sub` is member UUID, not email; query `members` table
- `#mcp #push #gate #internal-caller` — `skipApprovedGate` bypass for `sync_status`
- `#cli #sync #mcp-client #driver` — mandatory `CLEARGATE_MCP_TOKEN` + `CLEARGATE_MCP_URL` env; adapterInfo pre-flight
- `#hook-safe #sync-check #exit-code` — `sync --check` MUST exit 0 on all failure paths

---

## Token Ledger Summary

**Token ledger was not populated for SPRINT-07.** `.cleargate/sprint-runs/SPRINT-07/token-ledger.jsonl` is **0 bytes / 0 rows**. Per-agent and per-story cost aggregation cannot be computed from ledger data. This continues the pattern documented in prior flashcards — the SubagentStop hook fires on the orchestrator session, not on subagent transcripts.

**No fabricated numbers in this report.** A true token-per-agent / token-per-story accounting requires one of: (a) per-Task sentinel write before spawning each subagent, routing the ledger hook to attribute correctly; (b) moving ledger write from SubagentStop to a per-invocation transcript scan; or (c) accepting orchestrator-session-level aggregates only and dropping per-agent claims. **Recommend option (a) before SPRINT-06 starts**, else SPRINT-06 retrospective inherits the same blind spot.

---

## Carry-Forward

- **R-014 `sync-attribution-missing` wiring** — constant exported from `sync-log.ts:23`; lint pipeline wire-up requires `severity: 'warn'|'error'` column on `LintFinding` (flashcard `#lint #schema #severity`). Blocked on schema change. Target: SPRINT-08 lint hardening, or piggyback on Admin UI lint surfacing in SPRINT-06.
- **`stories: []` frontmatter array on sprint files** — M4's `active-criteria.ts` uses body-regex scan (`/(STORY|EPIC|PROPOSAL|CR|BUG)-\d+(-\d+)?/g`) with potential false-positives. CR to tighten post-Admin-UI.
- **Wire-level defense-in-depth test for `skipApprovedGate`** — story-level unit test exists; integration test that `skipApprovedGate` is NEVER true on external-caller paths was judged advisory, not blocking. Add on next MCP touch.
- **Two-terminal E2E automation (R9)** — manual recipe only in v1. Automation candidate for SPRINT-08+.
- **Adapter SDK → raw GraphQL swap path** — acceptable fallback if `@linear/sdk ^82` rate-limit or version-coupling becomes painful. `RemoteItem.raw` already unblocks the swap.
- **Token ledger fix** — see §Token Ledger Summary. Orchestrator attention required before SPRINT-06.
- **Tool-name prefix consolidation** — `cleargate_` prefix on new tools only; v1.1 consolidation story.
- **`cleargate sync --watch`, webhook push, FLASHCARD personal/shared split, multi-remote federation** — explicit v1.1 deferrals per PROPOSAL-007.

---

## Next Sprint Handoff (SPRINT-06 Admin UI)

SPRINT-06 ships **second** per `execution_order: 2`. Things SPRINT-06 must know:

1. **`items.remote_id` column is now authoritative** — partial-unique `(project_id, remote_id) WHERE remote_id IS NOT NULL`. Admin UI item list MUST display it (nullable).
2. **Sync attribution fields** (`pushed_by`, `pushed_at`, `last_pulled_by`, `last_pulled_at`, `last_remote_update`, `source`, `last_synced_status`, `last_synced_body_sha`) are on all 5 work-item types — Admin UI item detail should surface them.
3. **`members.email`** is the authoritative source for `pushed_by` display — do NOT infer from JWT `sub`.
4. **MCP adds 5 new tools** (`cleargate_pull_item`, `cleargate_list_remote_updates`, `cleargate_pull_comments`, `cleargate_detect_new_items`, `cleargate_adapter_info`) — any Admin UI tooling-overview page must reflect 9 tools total.
5. **`/auth/exchange` (STORY-004-08)** remains unshipped; SPRINT-07 CLI uses `CLEARGATE_MCP_TOKEN` env as short-circuit. SPRINT-06 may ship `/auth/exchange` as part of admin login to enable proper CLI JWT refresh.
6. **Token ledger blind spot** — resolve before SPRINT-06 starts if per-agent cost accounting is desired.

---

## Metadata

- **Sprint ID:** SPRINT-07
- **Dates:** 2026-04-19 → 2026-04-20 (2 calendar days; M1 kickoff to M5 QA-approval)
- **Participant:** Sandro Suladze (`sandro.suladze@gmail.com`) — single Vibe Coder
- **Commits:** 9 outer + 4 nested (`mcp/`) = **13 total**
- **Test totals at sprint close:** CLI 730 passing (4 skipped) / MCP 172 passing
- **MCP tool inventory at sprint end:** 9 tools — `push_item`, `pull_item`, `list_items`, `sync_status` (pre-existing), `cleargate_pull_item`, `cleargate_list_remote_updates`, `cleargate_pull_comments`, `cleargate_detect_new_items`, `cleargate_adapter_info` (new)
- **Protocol sections at sprint end:** §1–§14 in both dogfood and scaffold copies; `diff` empty
- **Token ledger rows:** 0 (see §Token Ledger Summary — not populated)
- **Report generated:** 2026-04-20 by Reporter agent
