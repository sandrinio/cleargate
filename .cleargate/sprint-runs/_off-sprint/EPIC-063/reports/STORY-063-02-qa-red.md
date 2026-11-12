# STORY-063-02 QA-Red (role: qa)

QA-RED: WRITTEN. Not committed. No src/scaffold/scripts edits.

## New red files
- test/hooks/emit-context.red.node.test.ts (unit: formatHookContext, hook-lines builders, hookEmitContextHandler export) - 9 red
- test/hooks/stamp-and-gate-context.red.integration.node.test.ts (hook-contract: canonical stamp-and-gate.sh via PATH stub; emit-context CLI subprocess; codex generated copy) - 15 red
- test/docs/ingest-docs-match-code.red.node.test.ts (docs slices: protocol 10.4/10.8/10.9/10.10/12.6, ingest agent, CLAUDE.md block, AGENTS.md) - 21 red; 3 anchor tests green

## Existing tests amended
- test/hooks/stamp-and-gate.node.test.ts: fake dist/cli.js forwards `hook ...` to real src/cli.ts; CR-093 ingest-failure case asserts JSON additionalContext (1 red).
- test/commands/init.node.test.ts: 058-11 snapshot test demoted to existence-only; new active byte-equality lock vs test/snapshots/hooks/stamp-and-gate.story-063-02.sh (1 red; Dev must capture the lock rendered with pin 0.5.0).

## Baseline
~47 red total; all fail as not-implemented (missing export/command, plain stdout, doc text). Green anchors: build-codex-payload --check, wiki-lint exists, contradict-commit registered, contradictContentHash exported.

## Notes for Dev
- Emit-context only when $CTX non-empty (tests assert no spawn when silent).
- Directive text must be byte-equal to contradictionPendingLine(id, absolute FILE).
- Doc tests slice by headings: `### §10.4`..`### §10.5`, `### §10.8`..`### §10.9`, `### §10.9`..`### §10.10`, `### §10.10`..`## 11.`, `### §12.6`..`\n---`; agent steps `2. **SHA idempotency`, `4. **Subagent invocation`, `6. **Stamp` anchors must be kept.
- §10.9 needs words: PostToolUse...Edit/Write, "Bash hook", STORY-063-03, "agent rule", "wiki lint", "unverified"; not "three-level".
- Rule paragraph in CLAUDE.md/AGENTS.md must contain "contradiction check pending", Brief, both commands, "Contradictions:", approved, and "once"/"not acted on".
- Comment-only carry-forwards (Git SHA comments, collect.ts headers) have no red test.
