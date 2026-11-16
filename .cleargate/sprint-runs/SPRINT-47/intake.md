# SPRINT-47 intake (enters only with the owner's recorded OK in sprint §6)

- 2026-11-16 · from kickoff (orchestrator) · (low) PreToolUse:Task `.pending-task-<turn>-<pid>-<n>.json` sentinels were left in `_off-sprint/` for finished subagents (one `cleargate-wiki-contradict`, two `architect-reader`); the untracked files made preflight check 4 fail ("main is dirty") until removed by hand. Candidate: SubagentStop consumes the sentinel for every agent type (or a stale-age sweep), and/or check 4 ignores `.pending-task-*.json`.
- 2026-11-16 · from plans/STORY-065-04.md · (low, doc) `cleargate-protocol.md` §23 barrier order (:921-926) does not mention the prove step; 03 owns protocol edits this sprint. Candidate: one line in §23 once 04 merges.
