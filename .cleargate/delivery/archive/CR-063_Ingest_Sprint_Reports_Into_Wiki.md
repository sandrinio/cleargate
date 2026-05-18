---
cr_id: CR-063
parent_ref: EPIC-002
parent_cleargate_id: EPIC-002
sprint_cleargate_id: SPRINT-03
carry_over: false
status: Completed
approved: true
created_at: 2026-05-08T00:00:00Z
updated_at: 2026-05-07T00:00:00Z
created_at_version: 0.11.4
updated_at_version: 0.11.4
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-07T20:56:37Z
pushed_by: sandro.suladze@gmail.com
pushed_at: 2026-05-14T19:57:39.372Z
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
area: wiki/ingest
context_source: |
  User direct request 2026-05-08 — "we need to make sprint reports part of wiki. ingest them."
  Triage clarified three design choices via AskUserQuestion: (1) page shape = append report
  block into existing wiki/sprints/SPRINT-NN.md; (2) trigger = Gate-4 close in close_sprint.mjs
  + manual `cleargate wiki ingest`; (3) backfill = one-shot for SPRINT-03..SPRINT-26 in same CR.
  Prior-work check via cleargate-wiki-query subagent surfaced [[STORY-002-07]] (original
  ingest CLI), [[STORY-025-04]] (Sprint Report v2 schema), [[CR-022]] (Gate-4 close pipeline +
  lib/report-filename.mjs legacy-fallback helper, reused here unchanged), and [[EPIC-002]]
  (parent — Knowledge Wiki Layer). No prior attempt to ingest sprint-runs found.
  Code-truth verification: read cleargate-cli/src/commands/wiki-ingest.ts:66-72 (EXCLUDED_SUFFIXES),
  :102-113 (delivery-only path validator), :345-370 (buildPageBody) and confirmed the carve-out
  shape. Read cleargate-cli/src/wiki/scan.ts:21-28 (same exclusion list). Confirmed report
  filename split: legacy SPRINT-01..17 use REPORT.md; SPRINT-18+ use SPRINT-NN_REPORT.md
  (per ls of .cleargate/sprint-runs/).
stamp_error: no ledger rows for work_item_id CR-063
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-07T20:56:37Z
  sessions: []
push_version: 1
---

# CR-063: Ingest Sprint Reports Into Wiki

## 0.5 Open Questions

> Populate during drafting. Resolve every entry before flipping ambiguity to 🟢.

- **Question:** When the plan file is re-ingested after the report has already been ingested, should the report block survive on the wiki page?
- **Recommended:** Yes. Plan-ingest must preserve any existing `<!-- BEGIN sprint-report -->…<!-- END sprint-report -->` block verbatim. Report-ingest replaces only that block. This makes the two ingest paths order-independent.
- **Human decision:** Approved 2026-05-08 — recommendation stands.

- **Question:** Two report filenames exist on disk — legacy `REPORT.md` (SPRINT-03..17) and canonical `SPRINT-NN_REPORT.md` (SPRINT-18+). Which to ingest?
- **Recommended:** Both. Resolve with the same legacy-fallback rule already in `lib/report-filename.mjs` from CR-022 — prefer `SPRINT-NN_REPORT.md`, fall back to `REPORT.md`. Treat as a single logical artifact per sprint.
- **Human decision:** Approved 2026-05-08 — recommendation stands.

- **Question:** The report file lives at `.cleargate/sprint-runs/SPRINT-NN/<file>.md`, not `.cleargate/delivery/`. How should `deriveBucket` and the ingest path validator handle this?
- **Recommended:** Add a second permitted root for ingest — `.cleargate/sprint-runs/` — gated to the two allowlisted filenames (`REPORT.md`, `SPRINT-NN_REPORT.md`). Derive `id` from the parent directory name (`SPRINT-NN`), `type=sprint`, `bucket=sprints`. Do NOT remove `sprint-runs/` from `EXCLUDED_SUFFIXES` wholesale — keep the exclusion as the default and carve out the allowlist before it runs.
- **Human decision:** Approved 2026-05-08 — recommendation stands.

- **Question:** Should the Phase-4 contradiction check run when ingesting a report?
- **Recommended:** Yes. Same pipeline, neighborhood scoped to sibling sprint pages. Reports are the richest narrative source on the sprint and the most likely to contradict prior claims.
- **Human decision:** Approved 2026-05-08 — recommendation stands.

- **Question:** Does the auto-trigger run during the sprint, on every Reporter draft revision, or only after Gate-4 close?
- **Recommended:** Only at Gate-4 close (per the user's chosen pipeline answer). The ingest call lands in `close_sprint.mjs` after the existing post-close steps, gated on the report file existing on disk. Manual `cleargate wiki ingest <report-path>` remains available for retroactive sprints.
- **Human decision:** Approved 2026-05-08 — recommendation stands.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- "`.cleargate/sprint-runs/` is excluded from wiki ingest" — was true in `wiki-ingest.ts:69` and `scan.ts:25` since EPIC-002 shipped. Remains the default for unrelated files (token-ledger, plans, scripts), but the two report filenames are now an explicit carve-out.
- "Sprint reports live only in `.cleargate/sprint-runs/<id>/REPORT.md` and are read by Reporter+humans only." Reports are now a wiki source: visible to `wiki query`, scanned by `wiki lint`, indexed in `wiki/index.md`, and contradiction-checked alongside their plan.
- "`wiki/sprints/SPRINT-NN.md` body is the plan file's stub (Blast radius / Open questions only)." That body is now plan stub + a `<!-- BEGIN sprint-report -->…<!-- END sprint-report -->` block carrying the report's narrative.

**New Logic (The New Truth):**
- Two ingest sources can land on a single sprint wiki page: the **plan** (under `.cleargate/delivery/{pending-sync,archive}/SPRINT-NN_*.md`) and the **report** (under `.cleargate/sprint-runs/SPRINT-NN/{REPORT.md|SPRINT-NN_REPORT.md}`).
- Wiki page identity stays one-per-sprint: `wiki/sprints/SPRINT-NN.md`. Ingest of either source updates that page idempotently without clobbering the other source's content.
- Frontmatter on the wiki page gains `report_raw_path` (string, optional) and `last_report_ingest_commit` (string, optional) so report-side idempotency is independent of plan-side idempotency.
- Body composition: the existing buildPageBody output (title + summary + blast radius + open questions) sits at the top, then a fenced section `## Sprint Report` (delimited by `<!-- BEGIN sprint-report -->` / `<!-- END sprint-report -->` HTML comments) carries the report body. When the report is absent, the section is omitted.
- Report-ingest path: `cleargate wiki ingest .cleargate/sprint-runs/SPRINT-NN/SPRINT-NN_REPORT.md` is the canonical command. Auto-fired by `close_sprint.mjs` after Gate-4 close; available manually for backfill or off-cycle re-ingest.
- Backfill: a one-shot `scripts/backfill-sprint-reports.mjs` iterates `SPRINT-03..SPRINT-26`, resolves the report filename per the legacy-fallback rule, and runs ingest. Output is one summary line per sprint plus an aggregate count. Idempotent — safe to re-run.

## 2. Blast Radius & Invalidation

- [ ] Update Epic: [[EPIC-002]] — adds a second ingest source-class to the wiki layer's contract.
- [ ] Invalidate downstream item: [[STORY-002-07]] — the original `cleargate wiki ingest` story constrained input to `.cleargate/delivery/`. The new permitted root `.cleargate/sprint-runs/` extends that contract; not a regression but a scope expansion.
- [ ] Invalidate downstream item: [[STORY-025-04]] — Sprint Report v2 schema. Reports were terminal artifacts; they are now a wiki source. Schema is unchanged but the consumer surface widens.
- [ ] Touch downstream item: [[CR-022]] — `lib/report-filename.mjs` is reused (not modified) by the new ingest legacy-fallback resolver.
- [ ] Database schema impacts? **No.** This is a markdown-pipeline change only.
- [ ] Wiki-page rewrite blast: all 24 existing `wiki/sprints/SPRINT-{03..26}.md` pages get a body delta on backfill (current stub → stub + report). Frontmatter gains the two new optional fields. Anyone who deep-linked an anchor on those pages should re-validate; risk is low because the existing bodies are nearly empty.
- [ ] `wiki query` index size grows. 24 reports × ~30k tokens average ≈ 720k tokens added to the wiki tree. Query subagent already does targeted reads, so the cold-load impact is limited to scans that pull whole sprint pages. Acceptable.
- [ ] `wiki lint` rule surface: the lint contract is "wiki page faithfully reflects raw file". With two raw sources the rule needs a per-source check. Lint may need a small extension (out-of-scope refactor risk if not tackled in this CR — see §3).
- [ ] Phase-4 contradiction check fires on report ingest. Neighborhood is sibling sprint pages. Cost grows linearly with report body size; same acceptable tradeoff.
- [ ] Mirror parity: changes to `close_sprint.mjs` must land in **both** the canonical scaffold (`cleargate-planning/.cleargate/scripts/close_sprint.mjs`) and the live tracked copy (`.cleargate/scripts/close_sprint.mjs`). The CLI source change in `cleargate-cli/src/...` propagates via `npm run prebuild`'s payload mirror; the live `.claude/` instance does not need re-sync (no `.claude/` surface modified).

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:66-72` — `EXCLUDED_SUFFIXES` array. Currently lists `.cleargate/sprint-runs/`. Extend by carving out a report-file allowlist before the exclusion check fires.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:102-113` — path validator that rejects anything outside `.cleargate/delivery/` with `exit(2)`. Extend to accept `.cleargate/sprint-runs/SPRINT-NN/<allowlisted-filename>` as a second permitted root.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:345-370` — `buildPageBody`. Extend to compose plan-stub + optional `## Sprint Report` block delimited by HTML comments. When ingesting a report, replace only the delimited block; when ingesting a plan, preserve any existing block verbatim.
- **Surface:** `cleargate-cli/src/wiki/scan.ts:21-28` — same `EXCLUDED_SUFFIXES`. Backfill scan must walk `sprint-runs/` for the allowlisted filenames.
- **Surface:** `cleargate-cli/src/wiki/derive-bucket.ts` — bucket+id resolver (filename-only today). Extend with a path-aware variant for report files: when the path matches `.cleargate/sprint-runs/SPRINT-NN/<report-filename>`, derive id from the parent directory name regardless of the file's own basename. Two basenames are accepted: legacy and canonical (see §1 and §2.5 cited paths under `.cleargate/sprint-runs/SPRINT-26/SPRINT-26_REPORT.md` for the canonical example, and `.cleargate/sprint-runs/SPRINT-12/REPORT.md` for the legacy example).
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts` — `WikiPage` interface. Add optional `report_raw_path` and `last_report_ingest_commit` fields. Update `serializePage` / `parsePage` accordingly.
- **Surface:** `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — Gate-4 post-close pipeline (refer existing wiki-touching steps near line 249). Add a step to run `cleargate wiki ingest <report-path>` after the sprint moves to Done. Mirror to `.cleargate/scripts/close_sprint.mjs`.
- **Why this CR extends rather than rebuilds:** The wiki ingest pipeline (Phase 1-4) already exists, is well-tested, and handles idempotency, repo derivation, log appending, index updates, synthesis recompile, and contradiction checks. The cost of adding a second source-class is far smaller than rebuilding ingest for sprint-runs. The two-source idempotency contract is the only new logic; everything else reuses existing code paths.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/commands/wiki-ingest.ts` — path validator extension; allowlist carve-out; two-source idempotency (read existing page's `last_report_ingest_commit` and report block; preserve plan-stub when re-ingesting plan; preserve report block when re-ingesting plan).
- `cleargate-cli/src/wiki/scan.ts` — backfill scan support (recognize `sprint-runs/SPRINT-NN/` allowlisted files; derive id from parent dir).
- `cleargate-cli/src/wiki/derive-bucket.ts` — extend signature to optionally accept the relative path so report-file id derivation works.
- `cleargate-cli/src/wiki/page-schema.ts` — frontmatter fields `report_raw_path` (optional string) and `last_report_ingest_commit` (optional string).
- `cleargate-cli/src/lib/wiki/contradict.ts` — Phase-4 neighborhood selector should still work but verify it includes the report block content when scoring neighbors.
- `cleargate-planning/.cleargate/scripts/close_sprint.mjs` — append a Step 6.X "Wiki: ingest sprint report" call. Use existing `cleargate` CLI binary resolution. Skip on legacy sprints where the report is absent.
- `.cleargate/scripts/close_sprint.mjs` — mirror.
- `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs` — mirror via `npm run prebuild`.

**Add:**
- `cleargate-cli/scripts/backfill-sprint-reports.mjs` — one-shot iterator over `SPRINT-NN` directories that runs ingest. Output: per-sprint result line + aggregate count. Idempotent.
- `cleargate-cli/test/wiki-ingest-sprint-report.node.test.ts` — node:test fixtures covering: (a) report-only ingest creates a page with the block, (b) plan-then-report keeps both, (c) report-then-plan keeps both, (d) re-ingest-plan preserves report block, (e) re-ingest-report preserves plan stub, (f) idempotency no-op when neither source SHA changed, (g) legacy `REPORT.md` filename works, (h) canonical `SPRINT-NN_REPORT.md` filename works, (i) path validator rejects `sprint-runs/.../token-ledger.jsonl` and other non-allowlisted files.
- `cleargate-cli/test/wiki-scan-sprint-report.node.test.ts` — scan picks up sprint-runs report files for backfill.

**Do NOT modify:**
- The Reporter agent or Sprint Report v2 template. The CR consumes existing report output as-is.
- `lib/report-filename.mjs` (CR-022). Reused, not changed.
- Other `EXCLUDED_SUFFIXES` entries (`knowledge/`, `templates/`, `hook-log/`, `wiki/`).

## 4. Verification Protocol

**Type + tests (cleargate-cli):**
```
cd cleargate-cli && npm run typecheck && npm test
```

**End-to-end manual (after build):**
```
# 1. Backfill
node cleargate-cli/scripts/backfill-sprint-reports.mjs

# 2. Spot-check a sprint page now contains the report block
grep -l "BEGIN sprint-report" .cleargate/wiki/sprints/SPRINT-25.md

# 3. Re-run backfill — must report no-op for all 24 entries
node cleargate-cli/scripts/backfill-sprint-reports.mjs   # expect: "0 changes, 24 unchanged"

# 4. Manual ingest of a single report
cleargate wiki ingest .cleargate/sprint-runs/SPRINT-26/SPRINT-26_REPORT.md

# 5. Confirm plan-side ingest preserves report block
cleargate wiki ingest .cleargate/delivery/archive/SPRINT-26_Dogfood_Hardening.md
grep "BEGIN sprint-report" .cleargate/wiki/sprints/SPRINT-26.md  # must still match

# 6. Path validator must reject non-allowlisted sprint-runs files
cleargate wiki ingest .cleargate/sprint-runs/SPRINT-26/token-ledger.jsonl   # expect exit 2

# 7. wiki query smoke test — content from a report should now be retrievable
cleargate wiki query "what shipped in SPRINT-26"   # answer should cite report-side facts
```

**Lint:**
```
cleargate wiki lint      # no drift across all 24 sprint pages after backfill
```

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Green — Ready for Execution**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [x] `approved: true` is set in the YAML frontmatter.
- [x] §2.5 Existing Surfaces cites at least one source-tree path the CR extends.
