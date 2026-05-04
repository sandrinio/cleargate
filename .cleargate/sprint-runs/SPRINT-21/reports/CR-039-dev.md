# CR-039 Developer Report — Session Reset Spike

**Story:** CR-039 (spike)  
**Status:** done  
**Recommendation:** PARTIAL

## Unknowns Resolved

1. **SDK support:** NO. Agent/Task tool shares the orchestrator session_id. Confirmed by ledger analysis across SPRINT-20 and SPRINT-21 (all rows share one session_id per sprint). The `claude` CLI offers `--session-id` and `--no-session-persistence` flags but these are CLI-level, not Agent-tool parameters.

2. **Cache-creation overhead:** Substantial token reduction available (~16M cache_read tokens per 4-story sprint, ~27% of sprint total), but these are billed at cache_read price (0.10x), not input price. Dollar impact ~$0.70/sprint. Fresh-session startup costs ~213k cache_creation per dispatch (offsetting some of the saving).

3. **Token-ledger attribution:** Survives session reset in theory (dispatch marker path is session-id-independent). Critical blocker: SubagentStop does NOT fire for CLI subprocess dispatches. Without SubagentStop, ledger rows are never written for fresh-session developers/QA. Requires a non-trivial manual-trigger mechanism.

4. **Granularity:** Per-story is the correct granularity. Per-milestone still allows within-milestone compounding; per-wave doesn't address the core problem.

## Time Spent

~75 minutes wall-clock:
- 35 min: reading token-ledger, transcript, hook, skill, agent files
- 20 min: Python analysis scripts (ledger data, transcript per-turn analysis)
- 20 min: writing memo

## Prototype Status

SKIPPED. The primary blocker (SubagentStop not firing for CLI subprocesses) means any prototype would require non-trivial changes to the attribution pipeline before it could demonstrate savings. A 5-line change does not exist.

## Recommendation Detail

PARTIAL: The problem is real (context overhead compounds across stories) and the reduction is measurable (~16M tokens/sprint). However:
- Dollar impact is modest (~$0.70/sprint) since cache_read is the cheapest billing tier
- Implementation requires changes to 3+ files (dispatch script, token-ledger hook, skill)
- SubagentStop gap is a hard blocker for correct attribution
- Estimated implementation effort: 2-4 developer-days

File as CR-041 (CR-040 reserved for vitest→node:test migration) with the pre-draft scope in the memo. Route to SPRINT-22.
