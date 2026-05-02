---
cr_id: CR-026
parent_ref: BUG-024 §3.4 (Recommended fix scope) — Token-Ledger Attribution Spike
parent_cleargate_id: "BUG-024 §3.4 (Recommended fix scope) — Token-Ledger Attribution Spike"
sprint_cleargate_id: SPRINT-20
carry_over: false
status: Draft
ambiguity: 🟢 Low
approved: true
proposal_gate_waiver:
  approved_by: sandrinio
  approved_at: 2026-05-02T13:30:00Z
  reason: BUG-024 spike served as the de-facto proposal — three concrete defects + fix scope already enumerated and human-reviewed during SPRINT-19 close. CR-026 mechanically lifts §3.4 into a CR template; no architectural decision pending.
context_source: "BUG-024 spike (SPRINT-19 close 2026-05-02). 100% of SPRINT-15→18 ledger rows mis-attribute to BUG-004/architect (the SessionStart-banner-poisoned fallback canary). Three root causes identified in BUG-024 §3.1: (1) session-id mismatch between dispatch-marker writer and hook reader; (2) transcript-grep fallback poisoned by SessionStart blocked-items banner; (3) manual write_dispatch.sh discipline unreliable (~5 calls vs ~19 spawns in SPRINT-18). Plus dead code path (~50 LOC reading nonexistent .pending-task-*.json files). Fix scope ~100 LOC across 3 surfaces; lane standard; complexity L2; single-developer dispatch; ships SPRINT-20 Wave 1."
created_at: 2026-05-02T15:00:00Z
updated_at: 2026-05-02T15:00:00Z
created_at_version: cleargate@0.10.0
updated_at_version: cleargate@0.10.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-05-02T09:28:25Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id CR-026
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-05-02T09:28:25Z
  sessions: []
---

# CR-026: Token-Ledger Attribution Fix (BUG-024 Follow-On)

## 0.5 Open Questions

- **Question:** Use `parent_session_id` from Claude Code SubagentStop hook payload (cleaner) OR newest-file lookup `ls -t .dispatch-*.json | head -1` (simpler, no payload contract dependency)?
  **Recommended:** Try `parent_session_id` first; if the field is absent in the SubagentStop payload (verify by adding `jq '.' < /dev/stdin` debug line in token-ledger.sh and reading hook-log/token-ledger.log after one fire), fall back to newest-file lookup. Document the chosen path in a code comment cross-referencing BUG-024 §3.1 Defect 1.
  **Human decision:** _accept recommended — Architect M3 plan confirms which path the implementation takes_

- **Question:** Should the new PreToolUse:Task hook be additive (auto-write on every Task spawn AND keep manual `write_dispatch.sh` as fallback) or replacement (deprecate manual write)?
  **Recommended:** **Additive.** Auto-write becomes the primary path; manual `write_dispatch.sh` stays as a documented fallback for cases where the orchestrator's Task prompt does not parse cleanly (e.g., agents spawned without a STORY=NNN-NN prefix). CLAUDE.md retains the manual contract as a one-liner in the dispatch convention section.
  **Human decision:** _accept recommended_

- **Question:** Strip the SessionStart banner line from transcript-grep fallback by regex, or skip the entire transcript-grep fallback once dispatch-marker is reliable?
  **Recommended:** **Strip by regex** — the fallback still exists as a safety net for spawns where dispatch-marker write failed (e.g., disk full, race). Regex pattern: `^[0-9]+ items? blocked: ` (the banner format). Document the pattern as a constant in the hook with a comment cross-referencing this CR.
  **Human decision:** _accept recommended_

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**
- `DISPATCH_FILE="${SPRINT_DIR}/.dispatch-${SESSION_ID}.json"` — keyed on SubagentStop hook's `session_id` payload field, which is the *subagent's* session ID, never the orchestrator's. Mismatch → 100% lookup failure since SPRINT-15. Remove this exact construction.
- `.pending-task-*.json` reader code path in token-ledger.sh — nothing in the codebase writes those files (`grep -rn "\.pending-task-"` returns only the hook itself). ~50 LOC of dead code. Delete.
- Manual `bash .cleargate/scripts/write_dispatch.sh <work-item> <agent>` as the *primary* dispatch-marker path. Demote to fallback.
- The transcript-grep fallback's blanket "first matching `(STORY|EPIC|CR|BUG|PROPOSAL|HOTFIX)-NNN(-NN)?` wins" rule — poisoned by the SessionStart banner's `1 items blocked: BUG-004: …` line that prefixes every subagent transcript. Replace with banner-line-skip + regex.

**New Logic (The New Truth):**
- **Primary path — PreToolUse:Task hook auto-writes the dispatch marker.** New file `.claude/hooks/pre-tool-use-task.sh` (+ canonical mirror at `cleargate-planning/.claude/hooks/pre-tool-use-task.sh`). Reads the orchestrator's Task() tool-input prompt from stdin (Claude Code provides the tool input on PreToolUse), greps the first ≤5 lines for the work-item marker (`STORY=\d{3}-\d{2}`, `BUG-\d{3}`, `EPIC-\d{3}`, `CR-\d{3}`, `PROPOSAL-\d{3}`, `HOTFIX-\d{3}`), greps the same prefix for `subagent_type:\s*(architect|developer|qa|reporter)`, and writes `.dispatch-<orchestrator-session-id>.json` to `.cleargate/sprint-runs/<active>/`. If the orchestrator's session ID cannot be derived from the PreToolUse payload, fall back to writing `.dispatch-<timestamp>-<random>.json` (uniquified) and let the SubagentStop hook do newest-file lookup.
- **Hook-side reader uses the chosen lookup strategy.** Either `parent_session_id` from SubagentStop payload (preferred if present) or `ls -t .dispatch-*.json | head -1` (newest-file fallback). On match, the hook renames the file to `.processed-<id>.json` so subsequent fires don't re-consume it (existing behavior, retained).
- **Transcript-grep fallback survives but skips the banner.** Skip-pattern as a documented constant: `BANNER_SKIP_RE='^[0-9]+ items? blocked: '`. Apply via `sed -E "/${BANNER_SKIP_RE}/d"` before the work-item regex match.
- **Manual `write_dispatch.sh` is fallback-only.** CLAUDE.md "Orchestrator Dispatch Convention" section updates: "Primary path — the PreToolUse:Task hook auto-writes the marker; the orchestrator does not need to invoke `write_dispatch.sh` manually for typical Task() spawns. Use `write_dispatch.sh` only when the spawn prompt does not contain a parseable work-item marker (e.g., one-off Architect dispatches not tied to a sprint-tree work item)."

## 2. Blast Radius & Invalidation

A CR acts as a "Gate Reset" — affected downstream items revert to 🔴.

- [x] **Invalidate/Update Story:** None — no existing Stories depend on token-ledger attribution semantics. Stories that *consume* the ledger (Reporter agent inputs) are unaffected because the ledger row schema is unchanged; only the values populated for `work_item_id` / `agent_type` change (from "all BUG-004/architect" to "actual values").
- [x] **Invalidate/Update Epic:** None — EPIC-026 (Skill Adoption) is parallel to this CR in SPRINT-20 Wave 1. The skill's §6 "Token-Ledger Hygiene" section may need a note pointing to the new PreToolUse:Task path post-merge — handle in EPIC-026 STORY-026-02 as a one-line edit during CLAUDE.md-related polish.
- [x] **Database schema impacts?** **No.** `token-ledger.jsonl` schema unchanged. Only the value-side of `work_item_id` / `agent_type` populates differently.
- [x] **State.json schema impacts?** **No.** state.json unchanged.
- [x] **Settings.json schema impacts?** **Yes — additive.** New PreToolUse:Task hook entry. `overwrite_policy: preserve-on-conflict` (do not auto-overwrite downstream user repos that may have customized hook configurations).
- [x] **Reporter REPORT.md schema impacts?** **No.** Reporter aggregates whatever the ledger contains; correct values now populate the existing §6 cost table accurately for the first time since SPRINT-15.

## 3. Execution Sandbox

**Modify (live + canonical mirror per file):**
- `.claude/hooks/token-ledger.sh` — replace dispatch-file lookup; add banner-skip to transcript-grep fallback; delete dead `.pending-task-*.json` reader path. Mirror to `cleargate-planning/.claude/hooks/token-ledger.sh`.
- `.cleargate/scripts/write_dispatch.sh` — minor refactor: add comment header marking it as fallback path; otherwise unchanged. Mirror to `cleargate-planning/.cleargate/scripts/write_dispatch.sh`.
- `.claude/settings.json` — add PreToolUse:Task hook wiring (additive; preserve all existing entries). Mirror to `cleargate-planning/.claude/settings.json` if mirror exists; otherwise N/A (settings.json is per-repo, not always scaffolded).
- `CLAUDE.md` — update "Orchestrator Dispatch Convention" paragraph to retire manual write as primary; document fallback usage. Mirror to `cleargate-planning/CLAUDE.md`.

**Create (live + canonical mirror):**
- `.claude/hooks/pre-tool-use-task.sh` (NEW) — auto-write dispatch marker on every Task() spawn. ~30-40 LOC. Mirror to `cleargate-planning/.claude/hooks/pre-tool-use-task.sh`. Make executable (`chmod +x`). FLASHCARD `2026-04-08 #init #scaffold #hook-exec-bit` — `cleargate init` strips exec bits; the bug is fixed but verify on smoke-test.
- `cleargate-cli/test/hooks/pre-tool-use-task.test.ts` (NEW) — fixture-driven unit tests covering: STORY marker parse, BUG marker parse, no-marker fallback, agent_type parse, dispatch-file write path, idempotency.

**Do NOT modify:**
- `cleargate-cli/src/lib/token-ledger.ts` (or wherever the consumer reads `token-ledger.jsonl`) — schema unchanged; consumer logic correct.
- `.claude/agents/{architect,developer,qa,reporter}.md` — agent role contracts do not change.
- `close_sprint.mjs` Step 6 (token aggregation) — reads ledger as-is.
- `prep_reporter_context.mjs` — reads ledger as-is.

**Mirror parity reminder:** After any edit to `cleargate-planning/.claude/hooks/*` or `cleargate-planning/CLAUDE.md`, run `npm run prebuild` in `cleargate-cli/` to regenerate `cleargate-cli/templates/cleargate-planning/...` and update `cleargate-planning/MANIFEST.json` SHAs. FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`.

## 4. Verification Protocol

**Pre-fix expected to fail (today's behavior — the regression sentinel):**
```bash
# After SPRINT-18 close, with .cleargate/sprint-runs/SPRINT-18/ present:
cat .cleargate/sprint-runs/SPRINT-18/token-ledger.jsonl | jq -r '.work_item_id + " / " + .agent_type' | sort -u | wc -l
# Returns: 1 (all rows attribute to "BUG-004 / architect") — the SessionStart-banner-poisoned canary.
```

**Post-fix must pass:**
```bash
# After CR-026 ships and one full sprint with ≥3 different stories runs:
cat .cleargate/sprint-runs/SPRINT-21/token-ledger.jsonl | jq -r '.work_item_id + " / " + .agent_type' | sort -u | wc -l
# Returns: ≥3 (multiple distinct work-item/agent pairs). >95% of rows match dispatched (work_item, agent) tuple.

grep -c "dispatch-marker:" .cleargate/hook-log/token-ledger.log
# Returns: ≥1 success line per Task spawn (≫ 0 — was zero pre-fix).

grep -c "BUG-004 / architect" .cleargate/sprint-runs/SPRINT-21/token-ledger.jsonl
# Returns: 0 unless BUG-004 is actually being worked.
```

**Unit test (regression):**
```bash
cd cleargate-cli && npm test -- pre-tool-use-task.test
# All 6 fixture scenarios pass: STORY marker, BUG marker, EPIC marker, CR marker, no-marker fallback, idempotency.
```

**Smoke test (integration):**
1. Open a fresh Claude Code session with `.cleargate/sprint-runs/.active=SPRINT-20` (Wave 1 in progress).
2. Run `Task(subagent_type=developer, description="STORY-026-01 dev", prompt="STORY=026-01 ...")`.
3. Inspect `.cleargate/sprint-runs/SPRINT-20/.dispatch-*.json` immediately after spawn — confirm one new file exists with `work_item_id="STORY-026-01"`, `agent_type="developer"`.
4. After agent completes, inspect `.cleargate/sprint-runs/SPRINT-20/token-ledger.jsonl` — confirm a row with `work_item_id="STORY-026-01"`, `agent_type="developer"`.
5. Inspect `.cleargate/hook-log/token-ledger.log` — confirm a `dispatch-marker:` success line corresponding to the spawn.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — Ready for Architect Milestone Plan**

Requirements to pass to Green:
- [x] "Obsolete Logic" to be evicted is explicitly declared (§1, four bullets).
- [x] "New Logic" articulated with concrete file paths + lookup strategy + fallback contract (§1, four bullets).
- [x] All impacted downstream Epics/Stories identified (§2 — none, with justification).
- [x] Execution Sandbox contains exact file paths (§3, modify + create lists separate).
- [x] Verification command sequence covers pre-fix sentinel + post-fix expected + regression test + integration smoke (§4).
- [x] `approved: true` set in frontmatter — proposal-gate waiver recorded (BUG-024 spike served as proposal).
- [x] Mirror-parity invariants flagged in §3 (FLASHCARD `2026-05-01 #scaffold #mirror #prebuild`).
- [x] Open questions resolved with recommendations + human-decision pointers (§0.5).

**Decomposition note:** CR-026 ships as ONE milestone (M3 in the Architect's per-milestone plan). Single-developer dispatch. ~100 LOC across 3 surfaces (~30 LOC new hook + ~40 LOC token-ledger.sh edits + ~30 LOC settings.json + CLAUDE.md + write_dispatch.sh comment). No story sub-decomposition — too small to justify (per Granularity Rubric: L2, single subsystem family — hooks).
