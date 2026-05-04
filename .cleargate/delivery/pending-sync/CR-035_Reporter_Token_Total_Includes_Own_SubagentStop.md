---
cr_id: CR-035
parent_ref: EPIC-008
parent_cleargate_id: EPIC-008
sprint_cleargate_id: "SPRINT-21"
carry_over: false
status: Ready
approved: true
approved_at: 2026-05-03T20:00:00Z
approved_by: sandrinio
created_at: 2026-05-03T00:00:00Z
updated_at: 2026-05-03T00:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
context_source: |
  Surfaced 2026-05-03 in markdown_file_renderer test sprint close. The
  Reporter agent wrote SPRINT-01_REPORT.md §3 Execution Metrics with:

    Token source: ledger-primary | 10,974,922 tokens
    (242 input + 95,769 output + 320,522 cache_creation + 10,558,389 cache_read
     across 11 SubagentStop rows)

  But .cleargate/sprint-runs/SPRINT-01/.session-totals.json shows the actual
  cumulative session total at end of sprint:

    {"input":413,"output":152820,"cache_creation":684220,"cache_read":23008199}
    Total: 23,845,652 tokens — DOUBLE what the report claims.

  The 12,870,730-token gap is the Reporter's own dispatch (the 12th
  SubagentStop row at 07:20:36Z, agent_type:"reporter"). The Reporter
  snapshotted ledger row 11's session_total (the last QA dispatch BEFORE
  itself) and labeled it "ledger-primary" — silently excluding its own work.

  This is an off-by-one source-row selection. Two failure modes:
    (a) Trust: reports under-count cost, leadership sees 11M not 24M, scaling
        decisions based on wrong number.
    (b) Label: "ledger-primary" implies "from the canonical ledger," not
        "from one specific row of the ledger immediately before the Reporter
        ran." The label is misleading.

  Fix is one of: include Reporter's own row in the sum (with explicit
  disclosure), OR use .session-totals.json (the cumulative source of truth)
  instead of last-row session_total, OR explicitly label the exclusion in
  the report ("excluding Reporter analysis pass: <X>; Reporter cost: <Y>").
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-03T19:04:50Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-035
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-03T17:46:19Z
  sessions: []
---

# CR-035: Reporter §3 Token Total Includes Its Own SubagentStop Row (Or Explicitly Labels the Split)

## 0.5 Open Questions

- **Question:** Source — sum all ledger rows' deltas, OR read `.session-totals.json` directly, OR sum from last SubagentStop's `session_total` (current behavior, off-by-one)?
  - **Recommended:** **read `.session-totals.json`**. It's already maintained by the token-ledger hook as the cumulative source of truth, updated atomically on every SubagentStop. Single source, no arithmetic, no off-by-one possible. Falls back to last-row `session_total` only if the file doesn't exist (legacy sprints).
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Reporting shape — single total OR two-line split (sprint work + Reporter analysis)?
  - **Recommended:** **two-line split**. Sprint cost transparency matters. Format:
    ```
    Token cost (sprint work, dev+qa+architect): 10,974,922
    Token cost (Reporter analysis pass):        12,870,730
    Token cost (sprint total):                  23,845,652
    ```
    Makes Reporter cost visible — it IS a Reporter dispatch concern (CR-036) and burying it under one total hides the signal.
  - **Human decision:** ✅ accepted as Recommended (batch 2026-05-03 — orchestrator + sandrinio compounding-order sweep)

- **Question:** Sprint inclusion?
  - **Recommended:** SPRINT-21 — pair with CR-036 (Reporter diet). Both touch Reporter prompt + dispatch path. One commit covers both.
  - **Human decision:** ✅ SPRINT-21 (confirmed 2026-05-03). W1 batch dispatch (with BUG-026 + CR-031 + CR-037); CR-036 in W3 builds on this prompt edit. Sprint plan §2.1 W3 narrative incorrectly re-lists CR-035 as paired with CR-036 — disregard; CR-035 is W1-only.

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Reporter agent prompt's §3 Execution Metrics generation logic — currently grabs the *last* row of `token-ledger.jsonl`'s `session_total` and labels it "ledger-primary." That row is the QA dispatch immediately before the Reporter spawns itself, so the Reporter's own delta is never included.
- The label "ledger-primary" is misleading: implies summed from the ledger; actually a single-row snapshot.

**New Logic (The New Truth):**

Two coordinated changes in `.claude/agents/reporter.md` §3 instructions (and the `prep_reporter_context.mjs` token-ledger digest if it pre-extracts this):

**Change 1 — Use `.session-totals.json` as the canonical source.** The token-ledger hook writes this atomically on every SubagentStop. It contains the true cumulative session total including the Reporter's own row (because it's updated *after* the Reporter's SubagentStop fires — though for the active Reporter dispatch reading its own pre-write value, the gap is one row; see Change 2).

**Change 2 — Two-line split format in §3.** Report both:
- "Sprint work (dev+qa+architect): <sum of all non-reporter rows' deltas>"
- "Reporter analysis pass: <reporter row delta, if available, else 'TBD next sprint'>"
- "Sprint total: <session-totals.json input+output+cache_creation+cache_read>"

The Reporter's own row may not be in `.session-totals.json` at the moment the Reporter is reading (its own SubagentStop hasn't fired yet). Two valid handlings:
- (a) Compute Reporter's expected cost from its own session token meter (Anthropic SDK exposes this) — accurate but SDK-dependent.
- (b) Report Reporter cost as "TBD — see token-ledger.jsonl after this dispatch completes" — honest, low-effort.

Recommended (b) for v1; tighten to (a) once SDK semantics confirmed.

## 2. Blast Radius & Invalidation

- [x] **Pre-existing reports** carry the wrong number. Not auto-corrected; future reports get the new format. No backfill — historical reports retain their (under-counted) numbers as historical artifact.
- [x] **Update Epic:** EPIC-008 (cost + measurement family).
- [ ] **Database schema impacts:** No.
- [ ] **MCP impacts:** No. Local Reporter prompt edit + (optional) prep script touch.
- [ ] **Audit log:** No new fields. Report §3 wording changes.
- [ ] **Coupling with CR-036** (Reporter diet): both touch Reporter prompt + dispatch surface. Ship paired in same commit.
- [ ] **FLASHCARD impact:** add card on completion — *"Reporter §3 reads `.session-totals.json` as canonical token source; reports two-line split (sprint work + Reporter pass + total). Off-by-one in v0.10.0 under-counted by Reporter's own dispatch."*
- [ ] **Scaffold mirror:** `.claude/agents/reporter.md` + canonical mirror byte-equal post-edit.

## Existing Surfaces

> L1 reuse audit.

- **Surface:** `.claude/agents/reporter.md` — Reporter prompt §3 token-total instruction currently reads last ledger row's `session_total` (off-by-one — excludes Reporter's own SubagentStop).
- **Surface:** `.cleargate/sprint-runs/<id>/.session-totals.json` — already maintained atomically by the token-ledger SubagentStop hook; cumulative source of truth.
- **Surface:** `.claude/hooks/token-ledger.sh` — writes `.session-totals.json` on every SubagentStop; behavior unchanged.
- **Why this CR extends rather than rebuilds:** prompt edit + read existing `.session-totals.json` instead of last-row arithmetic. Zero engine change.

## 3. Execution Sandbox

**Modify (Reporter prompt — 1 file + 1 mirror):**

- `.claude/agents/reporter.md` §3 Execution Metrics generation guidance — rewrite the token source instruction:
  - Old: "sum the last row's `session_total` and report as `ledger-primary`"
  - New: "read `.cleargate/sprint-runs/<id>/.session-totals.json` for `Sprint total`; sum non-reporter rows' deltas from `token-ledger.jsonl` for `Sprint work`; report Reporter pass as `TBD — see token-ledger.jsonl post-dispatch` (or pull from session token meter if SDK exposes it). Format §3 as the two-line split."
- `cleargate-planning/.claude/agents/reporter.md` — byte-equal mirror.

**Modify (prep_reporter_context.mjs — 1 file + 1 mirror, optional):**

- `.cleargate/scripts/prep_reporter_context.mjs` `buildTokenLedgerDigest()` (~L236) — if the script pre-extracts the §3 numbers, bake the new shape in:
  - `sprint_work_tokens`: sum of deltas where `agent_type != 'reporter'`.
  - `sprint_total_tokens`: from `.session-totals.json`.
  - `reporter_pass_tokens`: null at extraction time (Reporter hasn't run yet); or filled from prior-sprint historical average as advisory.
- `cleargate-planning/.cleargate/scripts/prep_reporter_context.mjs` — byte-equal mirror.

**Tests (1 file):**

- `cleargate-cli/test/scripts/test_prep_reporter_context.sh` (or new) — fixture sprint with known ledger + session-totals → digest contains correct sprint_work / sprint_total / reporter_pass=null.

**Out of scope:**

- Backfilling historical reports. They remain as-shipped historical record.
- SDK-based Reporter self-cost measurement — defer until SDK semantics confirmed.
- Per-agent breakdown in §3 (already present in current Reporter output as a side table). Unchanged.

## 4. Verification Protocol

**Acceptance:**

1. **Bug reproduces pre-CR.** Read SPRINT-01_REPORT.md §3 in markdown_file_renderer test folder → "10,974,922 tokens (... across 11 SubagentStop rows)". `.session-totals.json` shows 23,845,652. Mismatch confirmed.
2. **Fix produces correct numbers.** Re-run a small sprint post-CR. §3 shows three lines: Sprint work, Reporter pass (TBD or filled), Sprint total. Sprint total matches `.session-totals.json` exactly.
3. **Source labeling correct.** No "ledger-primary" label remaining; instead "session-totals" or "ledger-deltas-by-agent" as appropriate per source.
4. **Coupling with CR-036.** End-to-end: post-CR-036, Reporter pass should drop to ~80-100k. Two-line split makes that visible immediately in the report.
5. **Scaffold mirror diffs empty.**

**Test commands:**
- `bash .cleargate/scripts/test/test_prep_reporter_context.sh` (post-fix, if test exists).
- Manual: re-run a small sprint, read §3 of the new report.

**Pre-commit:** typecheck + tests green; one commit `feat(CR-035): reporter §3 reads session-totals + two-line split (work + analysis + total)`; never `--no-verify`.

**Post-commit:** archive CR file; append flashcard.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟡 Medium Ambiguity**

- [x] Obsolete logic declared (off-by-one source row + misleading label).
- [x] All impacted downstream items identified (no backfill; future reports get new format).
- [x] Execution Sandbox names exact files + prompt instruction.
- [x] Verification with 5 acceptance scenarios.
- [ ] **Open question:** Source — session-totals vs deltas-sum vs last-row (§0.5 Q1).
- [ ] **Open question:** Reporting shape — single total vs two-line split (§0.5 Q2).
- [x] ~~**Open question:** Sprint inclusion (§0.5 Q3).~~ Resolved 2026-05-03: SPRINT-21 (W1).
- [ ] `approved: true` is set in the YAML frontmatter.
