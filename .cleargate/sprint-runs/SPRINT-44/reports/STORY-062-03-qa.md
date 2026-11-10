# STORY-062-03 QA-Verify (role: qa)
QA: PASS
TYPECHECK: pass. TESTS (fresh shell, TMPDIR=/tmp/cg44v3, one file per run): sprint-scope.red 31/31, sprint-scope 19/19, cli-surface-hygiene.red 18/18, sprint-archive 18, sprint-preflight 27, sprint-unit 11, sprint.dashboard 9, sprint.node 5, sprint-sentinel-validation 14, sprint-init-decomp-gate 11, sprint-frontmatter-fence.red 5. 0 fail, 0 skipped.
ACCEPTANCE_COVERAGE: 7 of 7 scenarios (all Examples rows asserted).
Mapping: Add outline -> 4 @data tests (EPIC-031, STORY-031-03, BUG-086, CR-120); Remove -> @paths; Invalid outline -> 5 @rules rows (active, BUG-999, claimed by open SPRINT-42, stale --expect code 3, INITIATIVE-001); Unready -> @rules R8; Stale claim -> @rules (Completed/archived and no-file); JSON -> @interfaces + R9 chained expectSha.
Diff: only cli.ts, sprint-scope.ts, sprint-scope.node.test.ts (+ red file) changed. C3 frozen names intact (SprintScopeCli gained optional seams only). Handler returns, never process.exit (cli.ts action exits). No import of commands/sprint.ts. Line-level editYamlList/setYamlScalar, no yaml.dump; verifyEdit re-parses and checks body/preamble identical; items first then sprint, tmp+rename, restore on failure. Post-write stamp/gate/ingest via exit seams -> warnings. sha = raw bytes after R7.
Manual §2.2 on temp copy of real SPRINT-43 + BUG-086: add (no-op, already member) then remove: bodies sha identical; diff limited to updated_at, updated_at_version, list entry, sprint_cleargate_id. Gate/ingest warnings there were fixture/src-run environmental (no readiness-gates.md in tmp tree), correctly non-fatal exit 0.
Task Breakdown rows unchecked: orchestrator ticks at merge (rule 15). Advisory.
REGRESSIONS: none. MISSING: none.
flashcards_flagged: []
