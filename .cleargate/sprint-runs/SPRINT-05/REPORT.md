role: reporter

# SPRINT-05 REPORT — ClearGate Process Refinement (Dogfood Trifecta)

## One-line outcome

**Shipped.** 21 stories across 3 Epics (EPIC-001 Document Metadata Lifecycle · EPIC-008 Token Cost + Readiness Gates · EPIC-009 Scaffold Manifest + Uninstall) landed in ~2.5h wall time on 2026-04-19, 20 commits on the meta-repo + 1 in `mcp/`. The framework is now self-observant (auto-stamped `draft_tokens`), self-validating (machine-checked readiness gates for Epic/Story/CR/Bug), and cleanly reversible (SHA-tracked scaffold manifest driving `upgrade` and `uninstall`). The active token-ledger sprint-routing regression was closed in M1 as a first-class scope item; one meta-level Reporter caveat below on ledger attribution.

## Delivery

| Milestone | Stories | Commits (meta) | Commits (mcp) | Tests at close |
|---|---|---|---|---|
| M1 Foundations | 8 | 8 | 0 | 368 |
| M2 CLI Layer | 9 | 8 | 1 | 488 (cleargate-cli) + 9 (mcp) |
| M3 Integration | 4 | 4 | 0 | 579 → 582 (post kickback fix) |
| **Total** | **21 + 1 kickback** | **21** | **1** | **582 cleargate-cli + 9 mcp** |

QA verdicts: M1 APPROVED (368/368) · M2 APPROVED (488/488 cleargate-cli, 9/9 mcp) · M3 KICKBACK on STORY-008-06 Gherkin Scenario 5 "Doctor reports hook health" (missing hook-log scan) → patched in commit `fbbb78a` (3 new tests, suite → 582).

## Stories shipped

| Story | Title | Commit | L-level | Tests added (approx) |
|---|---|---|---|---|
| STORY-008-04 | Ledger hook generalization + sprint-routing fix + `ledger-reader` | `0f20994` | L2 | ~10 |
| STORY-001-02 | Protocol §11 "Document Metadata Lifecycle" | `37da42e` | L1 | 0 (doc) |
| STORY-001-03 | `codebase-version` helper | `1a46e3d` | L2 | 6 |
| STORY-001-01 | Template metadata fields (7 templates + mirror) | `b104529` | L1 | 0 (doc) |
| STORY-001-04 | `stamp-frontmatter` helper | `2b103d8` | L2 | 7 |
| STORY-009-06 | `claude-md-surgery` + `settings-json-surgery` libs | `ed434df` | L2 | ~16 |
| STORY-009-01 | `sha256` + `manifest` libraries | `2c3a0a7` | L2 | 13 |
| STORY-009-02 | `build-manifest` + CHANGELOG diff + package plumbing | `02716a1` | L2 | 10 |
| STORY-008-01 | `readiness-gates.md` (6 gate definitions) | `16ddf86` | L2 | 0 (doc; yaml-parse in 008-02) |
| STORY-009-03 | `cleargate init` snapshot + restore | `84c767a` | L2 | 5 |
| STORY-009-04 | `cleargate doctor` base + `--check-scaffold` | `b77bf73` | L2 | 8 |
| STORY-001-05 | `cleargate stamp <file>` CLI | `23234ca` | L1 | 6 |
| STORY-008-02 | Predicate evaluator + frontmatter-cache libs | `7d56c16` | L3 | 13 |
| STORY-008-03 | `cleargate gate check\|explain` CLI | `e723eb5` | L2 | 10 |
| STORY-008-05 | `cleargate stamp-tokens` CLI (hook-invoked) | `08c9d8e` | L1 | 7 |
| STORY-009-05 | `cleargate upgrade` three-way merge driver | `1fd2822` | L3 | 10 |
| STORY-001-06 | MCP `push_item` writes `server_pushed_at_version` (cross-repo) | `ca263ff` (mcp) | L1 | 4 (mcp) |
| STORY-008-06 | PostToolUse + SessionStart hooks + doctor extensions + `pricing.ts` | `354d11b` + kickback `fbbb78a` | L2 | ~14 |
| STORY-008-07 | Template stubs + Protocol §12 + wiki-lint gate checks | `79fd3ba` | L2 | ~7 |
| STORY-009-07 | `cleargate uninstall` with preservation + marker | `d99fded` | L3 | ~15 |
| STORY-009-08 | Protocol §13 "Scaffold Manifest & Uninstall" | `8d7e97a` | L1 | ~6 |

Complexity profile shipped: **8× L1 · 10× L2 · 3× L3 · 0× L4** — matches the sprint file's planned distribution exactly.

## Token cost

### Raw ledger totals (orchestrator session)

The token ledger at `.cleargate/sprint-runs/SPRINT-05/token-ledger.jsonl` contains 25 rows. **All 25 rows are cumulative snapshots of a single orchestrator Claude Code session** — the ledger hook fired on each SubagentStop and captured the orchestrator's running totals, not per-subagent deltas.

Final cumulative totals (row 25, 2026-04-19T15:04:43Z, 144 turns):

| Bucket | Tokens |
|---|---|
| input | 1,122 |
| output | 249,584 |
| cache_creation | 1,420,854 |
| cache_read | 16,447,027 |
| **Raw total** | **18,118,587** |

Model: `claude-opus-4-7` for all rows.

### USD cost (pricing from `cleargate-cli/src/lib/pricing.ts`)

Opus 4.7: `$15 input / $75 output / $1.50 cache_read / $18.75 cache_creation` per 1M tokens.

| Bucket | Tokens | Rate ($/M) | Cost (USD) |
|---|---|---|---|
| input | 1,122 | 15.00 | $0.02 |
| output | 249,584 | 75.00 | $18.72 |
| cache_read | 16,447,027 | 1.50 | $24.67 |
| cache_creation | 1,420,854 | 18.75 | $26.64 |
| **Total** | **18,118,587** | — | **~$70.05** |

### Per-story / per-agent breakdown — ATTRIBUTION GAP

**Ledger content does not support per-story or per-agent breakdown for this sprint.** All 25 rows carry `agent_type: "architect"` and `work_item_id: "EPIC-002"`, with an empty `story_id`. Two contributing causes:

1. The SubagentStop hook fired against the **orchestrator** session (the main Claude Code conversation running the four-agent loop), not against the individual subagent sessions. Developer / QA / Reporter subagents each run in their own session; those sessions' SubagentStop events are not landing in `SPRINT-05/token-ledger.jsonl`.
2. The first-user-message work-item detector (generalized in STORY-008-04) locked onto `EPIC-002` from the orchestrator's initial context — likely because the session began with wiki-ingest/SPRINT-04 wrap-up before the SPRINT-05 kickoff — and the hook preserves that tag across every subsequent SubagentStop. This is NOT the SPRINT-04→SPRINT-03 misrouting (which IS fixed — verified by the absence of SPRINT-05 rows in any prior sprint's ledger); it is a **separate, newly surfaced orchestrator-session-tagging issue** not covered by 008-04.

**Follow-up:** flashcard candidate recorded. Reporter per-story attribution requires either per-subagent ledger rows (hook needs to reach subagent transcripts, not orchestrator transcript) OR an explicit `STORY=NNN-NN` per-prompt sentinel the orchestrator writes before each Task invocation. Not in SPRINT-05 scope.

### Parallelism efficiency

Wall time: first commit `0f20994` at 16:51:24, last commit `8d7e97a` at 19:04:34 = **2h 13min** of commit-to-commit dev time (plus ~25min of M1 planning, per ledger timestamps starting 12:51:50 and ramp-up through 16:51). Observed cadence:
- **M1 eight stories in ~15min** (16:51→17:06, high parallelism — Wave A 4-way after the two bootstraps).
- **M2 nine stories in ~70min** (17:12→18:10, mixed parallel + serialized 008-01→008-02→008-03 chain).
- **M3 four stories in ~60min** (18:10→19:04, strictly serialized as planned).

The architect's parallelism map held exactly as specified; no unexpected serialization stalls.

### Headline note for cost estimation

The `~$70.05` number captures only the orchestrator's Opus session cost. **Actual total sprint cost including Developer (sonnet) and QA (sonnet) subagents is higher and is not captured in this ledger.** For future cost-per-sprint forecasting, treat the orchestrator cost as a **lower bound** until the per-subagent attribution gap is closed. Most expensive "story" proxy: M3-planning window (STORY-008-06 + STORY-009-07) saw the two biggest `cache_creation` jumps (~900K tokens / ~$17) at 14:03Z and 14:11Z. **Budget ~$20-25 per L3 story with settings.json surgery or scaffold-mutation scope in orchestrator planning alone.**

## Flashcards added during sprint

Seven new cards (all `2026-04-19`, newer than the pre-sprint set):

1. `#uninstall #rmdir #empty-check` — `.cleargate/` empty via `readdirSync` misses subdirs left by file deletion; use removeAll flag + preserved-path membership check. (STORY-009-07)
2. `#wiki #lint #yaml` — `parseFrontmatter` stores nested YAML as opaque string when value starts with `{`; lint checks reading `cached_gate_result` must `yaml.load()` on that string. (STORY-008-07)
3. `#hooks #init #settings` — `init.ts` has its own `HOOK_ADDITION` constant (SPRINT-04 legacy); when scaffold settings.json is updated, `init.ts` must also be updated or tests fail with 2 PostToolUse inner-hooks. (STORY-008-06)
4. `#schema #manifest #upgrade` — `ManifestEntry.overwrite_policy` uses `'skip'` not `'never'`; story/plan prose says "never-policy" but the TS type is `'always'|'merge-3way'|'skip'|'preserve'`. (STORY-009-05)
5. `#cli #gate #transition-inference` — `gate check` infers transition from `cached_gate_result.pass`: no cache or fail → first transition; pass + multi-transition (Epic) → next. (STORY-008-03)
6. `#gates #predicate #yaml` — `readiness-gates.md` fenced yaml blocks are YAML lists; `yaml.load()` returns array — unwrap `[0]`. (STORY-008-02)
7. `#gates #predicate #section` — section evaluator split on `/^(?=## )/m`: detect `hasPreamble` before indexing. (STORY-008-02)

**Plus post-sprint orchestrator-learnings (queued for the orchestrator to append after this report lands):**
8. `#reporting #hooks #ledger #subagent-attribution` — SubagentStop hook fires on orchestrator session; subagent rows aren't captured. Reporter can't compute per-story or per-agent cost until the hook reaches subagent transcripts OR a per-Task sentinel is written by the orchestrator.
9. `#concurrency #agents #shared-main` — parallel Developer agents on main share a working tree — one agent's uncommitted file edits are transiently visible to another's `npm test` (caught cleanly in STORY-001-05 only because 008-02 landed its parse-frontmatter change first). Bias toward worktree isolation or stricter serialization on shared-file surfaces.

**Theme distribution:** 3 cards on gates/predicates, 2 cards on CLI/hook wiring, 1 card on manifest/upgrade, 1 card on wiki lint YAML parsing. EPIC-008 generated the most gotchas (4/7) — consistent with it being the newest conceptual surface.

## DoD checklist

### Engineering DoD
- [x] All 21 Stories merged (EPIC-001: 6, EPIC-008: 7, EPIC-009: 8). Evidence: 20 commits `4dc79a5..8d7e97a` + `ca263ff` in `mcp/` + kickback patch `fbbb78a`.
- [x] `npm run typecheck` clean in `cleargate-cli/` and `mcp/`.
- [x] `npm test` in `cleargate-cli/` 582 passing / 0 failing / 4 pre-existing skips.
- [x] `npm test` in `mcp/` push-item suite 9/9.
- [x] Ledger-regression fixture landed in 008-04 test suite.
- [x] Scaffold-mirror diffs empty (templates, protocol, knowledge, readiness-gates).
- [x] Protocol §§11, 12, 13 added to both live and canonical; mirror-diff empty.
- [x] CLAUDE.md unchanged this sprint.
- [x] All 7 templates (live + canonical) carry metadata fields + `draft_tokens` + `cached_gate_result` stubs.
- [x] `.cleargate/knowledge/readiness-gates.md` exists (live + canonical).
- [x] `cleargate-planning/MANIFEST.json` generated by `npm run build`.
- 🟡 Dogfood end-to-end on meta-repo: **partial**.
  - [x] PostToolUse hook chain writes `.cleargate/hook-log/gate-check.log` entries.
  - 🟡 SessionStart fresh-session smoke deferred (requires new Claude Code session).
  - [x] Intentional TBD in pending-sync Epic → `wiki lint` exits non-zero (008-07 test case).
  - 🟡 `cleargate doctor --check-scaffold` on meta-repo not dogfood-verified — meta-repo has no `.install-manifest.json` at root (bootstrapped pre-009-03).
  - [x] `cleargate upgrade --dry-run` runs without error (009-05 test #1).
  - [x] `cleargate uninstall --dry-run` in tmpdir produces preservation preview (QA-verified).
- 🟡 Token budget: 25 rows tagged `SPRINT-05`; per-story attribution gap flagged above.
- [x] FLASHCARD: 7 new cards (+2 orchestrator-learnings queued).

### Ops DoD
- ❌ `@cleargate/cli@0.2.0` published to npm. **Deferred** — manual maintainer-machine step.
- [x] CHANGELOG pipeline shipped (002716a1).
- [x] `mcp/package.json` decision recorded: **Option B** (port helper).
- ❌ MCP Coolify redeploy. **Deferred** — manual ops window.
- 🟡 Fresh-install smoke gated on npm publish.
- [x] FLASHCARD content diff included.

## Risks observed vs. predicted

| Risk | Hit? | Handling |
|---|---|---|
| Merge-conflict concentration on shared files | **Not hit** | M3 strict serialization held. Read-before-Write discipline in 008-07. |
| 008-04 scope creep masking deeper bug | **Partially hit** | 008-04 closed its stated scope. A **separate** orchestrator-session-tagging bug surfaced in Reporter — not expanded into 008-04. |
| Three L3 stories in one sprint | **Not hit** | Each L3 got its own plan section + Developer subagent. |
| `doctor` cross-Epic coordination (009-04 vs 008-06) | **Not hit** | 009-04 shipped base first (M2); 008-06 extended stubs in M3. |
| Wiki-ingest hook removal regression | **Not hit** | 008-06 `settings-json-surgery` removed the SPRINT-04 inline entry; new chain includes wiki-ingest as step 3. |
| MCP cross-repo (001-06) | **Not hit** | Option B (port helper) chosen at M2 kickoff. |
| Publishing cycle (npm publish) | **Deferred** | Code pipeline shipped; manual publish not executed. |
| SessionStart auto-firing mid-sprint | **Not hit** | 008-06 scheduled first in M3; subsequent M3 stories completed under new hook regime without kickback. |
| Uninstall blast radius | **Not hit** | All 009-07 tests in `os.tmpdir()`; meta-repo never ran wet uninstall. |
| 21-story load on four-agent loop | **Partially hit** | Shipped all 21 (new record). Wall time ~2.5h — well under the 2-3 day estimate. Reporter paid the price in the attribution gap. |
| Hook-schema drift | **Not hit** | M1 plan verified current schema; 008-06 shipped exactly that shape. |

## Open items for ops close-out

- **npm publish `@cleargate/cli@0.2.0`** — maintainer-machine manual step. Prereqs all green.
- **MCP redeploy to Coolify** at `https://cleargate-mcp.soula.ge/` for STORY-001-06. Smoke: push dummy item, confirm `server_pushed_at_version` in response.
- **Archive move** — SPRINT-05 + 21 story files + EPIC-001/008/009 + PROPOSAL-005/006: pending-sync → archive, with frontmatter status updates.
- **Update `.cleargate/delivery/INDEX.md`** — flip SPRINT-05 row to "✅ Completed"; add EPIC-001/008/009 to shipped list.
- **Fresh-install smoke** (`npx cleargate@0.2.0 init` in blank tmpdir) — gated on npm publish.
- **Run `cleargate doctor --check-scaffold` on meta-repo** as retroactive dogfood check (will fail cleanly for absent `.install-manifest.json`).

## Follow-up candidates for SPRINT-06+

- **SPRINT-06 Admin UI + OAuth closeouts** — 12 stories (10× EPIC-006 + STORY-004-08 + STORY-005-06). Benefits from SPRINT-05 trifecta immediately.
- **`mcp/.claude/settings.json` cleanup** — flagged in M3 open-decision #3; candidate for SPRINT-06 or standalone CR.
- **Ledger attribution fix** — orchestrator-session dominance gap surfaced by this Reporter run. Separate Bug/CR needed.
- **Gate-check initial-migration pass** — one-shot `for f in pending-sync/*.md; do cleargate gate check "$f"; done` cleanup pass to silence `gate-stale` noise from pre-migration items.

## Meta

- **Token ledger:** `.cleargate/sprint-runs/SPRINT-05/token-ledger.jsonl` (25 rows, orchestrator-session only — attribution gap flagged above).
- **Off-sprint ledger:** `.cleargate/sprint-runs/_off-sprint/token-ledger.jsonl` (1 row, pre-sprint kickoff).
- **Flashcards added:** 7 in-story + 2 post-sprint orchestrator-learnings queued.
- **Model rates used:** `cleargate-cli/src/lib/pricing.ts` as of 2026-04-19 (Opus 4.7: $15/$75/$1.50/$18.75 per 1M).
- **Sprint wall time:** 2026-04-19T12:25Z → 2026-04-19T15:04:43Z ≈ **2h 40min**.
- **Commit wall time:** 2026-04-19T16:51:24+04 → 2026-04-19T19:04:34+04 = **2h 13min** + kickback patch.
- **Report generated:** 2026-04-19 (post-STORY-009-08 + kickback `fbbb78a`).

---

## Appendix A: Commit-by-commit git log

Meta-repo (`4dc79a5..HEAD`, 21 commits reverse-chronological):

```
fbbb78a fix(epic-008): STORY-008-06 add hook-health log scan (QA kickback)
8d7e97a feat(epic-009): STORY-009-08 protocol §13 scaffold manifest & uninstall
d99fded feat(epic-009): STORY-009-07 cleargate uninstall with preservation + marker
79fd3ba feat(epic-008): STORY-008-07 template stubs + protocol §12 + wiki-lint gate checks
354d11b feat(epic-008): STORY-008-06 PostToolUse+SessionStart hooks + doctor --session-start/--pricing
1fd2822 feat(epic-009): STORY-009-05 cleargate upgrade three-way merge driver
08c9d8e feat(epic-008): STORY-008-05 add cleargate stamp-tokens CLI command
e723eb5 feat(epic-008): STORY-008-03 add cleargate gate check|explain CLI
7d56c16 feat(epic-008): STORY-008-02 predicate evaluator + frontmatter-cache libs
23234ca feat(epic-001): STORY-001-05 cleargate stamp <file> CLI command
b77bf73 feat(epic-009): STORY-009-04 doctor base command + --check-scaffold mode
84c767a feat(epic-009): STORY-009-03 cleargate init snapshot + restore
16ddf86 feat(epic-008): STORY-008-01 author readiness-gates.md with 6 gate definitions
02716a1 feat(epic-009): STORY-009-02 build-manifest script + changelog diff + package plumbing
2c3a0a7 feat(epic-009): STORY-009-01 sha256 + manifest libraries
ed434df feat(epic-009): STORY-009-06 claude-md-surgery + settings-json-surgery libs
2b103d8 feat(epic-001): STORY-001-04 stamp-frontmatter helper
b104529 feat(epic-001): STORY-001-01 add metadata fields to all 7 templates
37da42e feat(epic-001): STORY-001-02 add §11 Document Metadata Lifecycle to protocol
1a46e3d feat(epic-001): STORY-001-03 codebase-version helper
0f20994 feat(epic-008): STORY-008-04 ledger hook generalization + sprint-routing fix + ledger-reader
```

`mcp/` sub-repo (1 sprint commit):
```
ca263ff feat(epic-001): STORY-001-06 push_item writes server_pushed_at_version
```

One commit per story = 21 story commits + 1 QA kickback patch = 22 commits. Budget was 25 max — **22/25**, under budget.

---

## Appendix B: Token ledger raw

See `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-05/token-ledger.jsonl` for the 25-row JSONL. Summary deltas from row 1 to row 25:

- input: +1,007 tokens over 2h 13min
- output: +192,804 tokens (dominant cost driver for a 144-turn orchestrator session)
- cache_creation: +1,131,268 tokens (two big jumps at row 18→19 at 14:03Z and 19→20 at 14:11Z — context cache rebuilds at the M3 planning boundary)
- cache_read: +13,572,020 tokens (largest raw bucket; cheapest rate; the savings engine)

Cache-read tokens contributed 16.4M of 18.1M total (91% of raw volume) at $1.50/M vs $15/M input rate — **~$222 saved** vs. cold-input pricing on the same token volume. The cache strategy paid off heavily.
