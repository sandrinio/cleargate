---
cr_id: CR-016
parent_ref: STORY-014-05
parent_cleargate_id: "STORY-014-05"
sprint_cleargate_id: "SPRINT-15"
status: Approved
approved: true
approved_at: 2026-04-28T00:00:00Z
approved_by: sandrinio
sprint: SPRINT-15
milestone: M3
closes:
  - BUG-021
related:
  - CR-018
created_at: 2026-04-28T00:00:00Z
updated_at: 2026-04-28T00:00:00Z
created_at_version: cleargate@0.8.2
updated_at_version: cleargate@0.8.2
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-29T11:16:05Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
context_source: |
  Conversation 2026-04-28 — originally drafted as unified hook-v2 redesign
  closing BUG-021 + BUG-022. User invoked granularity rubric (L3+high →
  default split) on 2026-04-28; re-scoped to attribution layer only.
  Companion CR-018 owns the per-turn delta math (closes BUG-022). Both
  ship in SPRINT-15 M3 sequenced (CR-016 → CR-018) and land together in
  the 0.9.0 release CR-018 cuts.
stamp_error: no ledger rows for work_item_id CR-016
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-28T17:58:13Z
  sessions: []
---

# CR-016: Token Ledger Hook — Dispatch-Marker Attribution

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- **Transcript-scan attribution.** Hook scans the subagent transcript for the first `(STORY|EPIC|CR|BUG)-NNN(-NN)?` pattern and the first dispatch marker. Architects/QA/Reporter often have no story_id in their dispatch text, and template/wiki content read mid-session pollutes the regex match space. Result (SPRINT-001 Hakathon): all 17 rows tagged `agent_type: architect` + `story_id: STORY-010-07`, even with BUG-020's template strip applied.

**New Logic (The New Truth):**

- **Explicit dispatch markers.** Before each `Task()` spawn, the orchestrator writes `.cleargate/sprint-runs/<id>/.dispatch-<session-id>.json` with `{story_id, agent_type, spawned_at}`. The hook's SubagentStop handler reads the file matching the subagent's session id and uses those values verbatim. Falls back to transcript-scan only when the dispatch file is absent (graceful degradation for older orchestration patterns). Hook deletes the dispatch file post-write so stale files don't linger.
- **Row schema unchanged in this CR.** Same flat `input/output/cache_*` fields; only the `story_id` and `agent_type` values become accurate. The schema-shape change (delta + session_total blocks) ships in companion CR-018.
- **Backwards-compat read path.** Older sprints with transcript-scan-attributed rows continue to read; only `story_id` accuracy improves on new rows.

## 2. Blast Radius & Invalidation

- [x] **Closes BUG-021** — Token-ledger detector still mis-attributes after BUG-020 template strip.
- [x] **Companion CR-018** — owns the per-turn delta math (closes BUG-022). Sequenced after this CR within SPRINT-15 M3 because both modify `.claude/hooks/token-ledger.sh`.
- [x] **No reset on STORY-014-05** in this CR — the row schema is unchanged. CR-018 carries the schema-reset (additive) and the Reporter contract change.
- [x] **Database schema impacts?** No. JSONL on disk; no MCP table touched.
- [x] **Orchestrator convention update.** Conversational agent + the four subagent role contracts must learn that the orchestrator writes the dispatch marker before each `Task()` spawn. Implemented via a helper script (`.cleargate/scripts/write_dispatch.sh`) called from the orchestrator section of `cleargate-planning/CLAUDE.md`. Agent contracts themselves do not change behavior — only the orchestrator side wires up dispatch context before spawning.
- [x] **No version bump on its own.** CR-016 ships under whatever 0.8.x patch level exists at merge; CR-018's schema change is what cuts 0.9.0. Both land in the same SPRINT-15 close — the 0.9.0 release absorbs both.

## 3. Execution Sandbox

**Modify:**

- `cleargate-planning/.claude/hooks/token-ledger.sh` — add a dispatch-file read step at the top of the SubagentStop handler. If `.dispatch-<session-id>.json` exists, parse `story_id` + `agent_type` and use verbatim. Otherwise fall through to existing transcript-scan logic. Delete the dispatch file after a successful read.
- `cleargate-planning/CLAUDE.md` — document the orchestrator-side dispatch-write convention in the orchestrator section.

**Create:**

- `.cleargate/scripts/write_dispatch.sh` — helper for orchestrator: takes `story_id`, `agent_type` as args; resolves the active sprint id from state.json; writes `.dispatch-<session-id>.json` to that sprint's run directory.

**Tests:**

- `cleargate-cli/test/hooks/token-ledger-attribution.test.ts` — table-driven scenarios:
  - dispatch file present → fields used verbatim
  - dispatch file absent → falls back to scan, no exception
  - dispatch file malformed JSON → ignored, falls back to scan, warning logged once
  - dispatch file present + transcript pollution → dispatch wins
  - dispatch file deleted post-read

**Out of scope:**

- Per-turn delta math (CR-018 owns).
- Reporter agent contract changes (CR-018 owns).
- New row schema fields (`delta`, `session_total` blocks) (CR-018 owns).
- 0.9.0 version bump (CR-018 owns).
- Re-attributing historical mis-attributed rows in past sprints — unrecoverable without re-running the sessions.

## 4. Verification Protocol

**Failing test (proves the bug):**

```bash
# Pre-fix: real session with multi-agent fires
grep -c '"story_id":"STORY-010-07"' .cleargate/sprint-runs/<id>/token-ledger.jsonl
# 17 (all rows mis-attributed despite multiple distinct stories executed)

# Post-fix on a new sprint with dispatch-write enabled:
jq -r '.story_id' .cleargate/sprint-runs/<id>/token-ledger.jsonl | sort | uniq -c
# N distinct story_ids matching the actual stories run
```

**Acceptance scenarios (Gherkin shape):**

1. **Dispatch file present** — orchestrator writes dispatch JSON before spawn → hook reads it → row carries the explicit `story_id` and `agent_type`. (Closes BUG-021 happy path.)
2. **Dispatch file absent** — older orchestration without write_dispatch.sh → hook falls back to transcript scan → row attribution may be lossy but does not throw. (Backwards compat.)
3. **Dispatch file malformed** — invalid JSON → fall back to scan, warning logged once per session, no crash.
4. **Dispatch wins over transcript pollution** — transcript contains `STORY-X-Y` strings from template reads AND dispatch file says `STORY-A-B` → row carries `STORY-A-B`.
5. **Dispatch file is consumed** — after a successful read, the `.dispatch-<session-id>.json` file is removed so it cannot leak attribution to a later subagent in the same sprint.

**Command/Test:**

```bash
cd cleargate-cli && npm run typecheck && npm test -- token-ledger-attribution
```

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Ready for Execution**

- [x] "Obsolete Logic" to be evicted is explicitly declared (transcript-scan attribution).
- [x] All impacted downstream items identified (BUG-021 closed; CR-018 sequenced after; BUG-022 unaffected here, owned by CR-018).
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command + 5 acceptance scenarios provided.
- [x] `approved: true` is set in the YAML frontmatter.
