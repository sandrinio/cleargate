# BUG-105 — QA RED seal

role: qa

QA-RED: WRITTEN
RED_TESTS: test/commands/codex-install-papercuts.red.node.test.ts; amended test/commands/init.node.test.ts
BASELINE_FAIL: 3 of 6 behavioral scenarios, plus 1 new snapshot lock scenario
flashcards_flagged: []

## Sources and seal

- Mode RED; GPT-6.1 Sol selected by the owner. Usage telemetry unavailable.
- META_ROOT `/Users/ssuladze/Documents/Dev/ClearGate`; sprint `SPRINT-41` (resolved `.active`). Main state records BUG-105 Bouncing.
- Outer worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-105`, detached `967cea95b9d3baf125e36ad863e9dd6de769e668`.
- CLI worktree `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-105/cleargate-cli`, branch `story/BUG-105`, exact unmodified production base `c6d665656d886810faf31b8feb11f8ce2600ae79`.
- Test-only seal commit `23a8e86a299b1b7e16e7a7a6545298fa5cf701fd`; CLI tree clean after commit. Main report/logs intentionally uncommitted for the orchestrator.
- Binding spec: raw BUG-105 §5 and M7 §3 BUG-105, including E2 / OD-M7-8. M7 supersedes the raw byte-identical Claude-hook exclusion: Developer changes the canonical hook under `HOST=codex`, regenerates Codex, and later RS-M7c remains required. No implementation was read or edited by QA-Red.
- Read repository policies, QA profile, sprint context/amendments, contract-first bounds, test-runner-environment recipe, and flashcard entry/canonical policy. Relevant lessons: sanitize four ambient test variables; scripts require durable terminal exits; canonical/generated hook single-source; refusal hashes append within the existing row; sealed tests need TPV rehash; no implementation reads in RED.

| Sealed file | SHA-256 |
|---|---|
| test/commands/codex-install-papercuts.red.node.test.ts | 2b308af2958b4615a181606d0feeb933f5794f4047c44da07f9f7020946e425e |
| test/commands/init.node.test.ts | c4f1b72d65fc1512ab3a0a72c55d7179becf73513cd297c08a0eb2f5292a9efb |
| test/helpers/init-fixture.ts | 0e6cc45c15fd8b55a44736c8a70281cdfc3eb96b11354cccc6375d63a084f1a7 |
| test/hooks/codex-hook-scripts.red.node.test.ts | d5962b0f2435e65a94c5be74173bc77dca7771f48007508c97f5907736db6c10 |

## Actual RED baseline

Authoritative log `BUG-105-red-seal-20260930.log`, durable terminal status `BUG-105-red-seal-20260930.exit` = 1. Six tests: 3 pass, 3 fail, 0 skipped. Actual execution session 40366 was polled through terminal exit 1.

| Test | Actual result | Attribution |
|---|---|---|
| T1 absent MCP and Codex init | FAIL | `delta:true, banner:true` against expected false/false; `.mcp.json` absent assertion passes. Both production witnesses are observed. |
| T2 invalid nonempty MCP and plain Claude init | PASS | Invalid-to-invalid remains conservatively true; plain init creates MCP and emits restart advice. |
| T3 deleted target plus added sibling | FAIL | Canonical Codex hook logs deleted BUG-901 as well as existing BUG-902; expected deleted rows zero. Claude negative control already passed, preserving its missing-target log behavior. |
| T4 prose slug | FAIL | Existing handler returns 1 with `slug must match ^[a-z0-9-]+$ (got: "tiny node todo cli")`; expected success, exact underscore filename, normalization notice. |
| T5 valid slug | PASS | Exact `SPRINT-01_valid_slug.md`, no normalization notice. |
| T6 punctuation-only slug | PASS | Exit 1 with existing slug error, no draft created. |

Init file: `BUG-105-init.node.test.ts-20260930.log` / `.exit` = 1. 35 tests, 34 pass, 1 fail, 0 skipped. The newly added BUG-105 lock assertion fails because `stamp-and-gate.bug-105.sh` does not yet exist. The old STORY-058-11 snapshot existence test passes. QA did not create an expected lock from old behavior; Developer must capture rendered bytes after implementation.

Default suite delta is exactly **+7**: six new tests and one new snapshot test. Test37 fixture amendment changes no count. No full default suite was run in this worktree.

## Fixture changes and TPV boundaries

The existing STORY-058-10 stamp-and-gate sanctioned-delta row retains its M2 baseline refusal and adds pre-fix canonical hash `ebccbe34b63733b1787ded599dbfe591e686e2524c66c992001de16cd0eae9a4` (FIXED_PIN `0.0.0-m2`, placeholder `__CLEARGATE_VERSION__`). Raw canonical SHA-256 is `58207e9287a79db111bbede50ea3f5ea6d4c24bc91cfe5012f6bb5e21f75b148`. The historical STORY-058-11 lock remains unchanged, SHA-256 `13f4c578e5868db2d9f3e3215768f60279da573a28b9842c461952098a4e0dac`. M2 `/private/tmp/cg-s41-m2-init-baseline` was checked present and never recaptured, edited or deleted. M2 pair runs remain Developer/QA-Verify work; no pass is claimed here.

T1/T2 compose canonical host views explicitly, use fresh git fixture roots, and call runInitScenario with fixture cwd. The banner writes directly to process.stderr, so test-local mock capture is restored in finally. Top-level tests are sequential; there is no concurrent global stderr capture. Initial diagnostic run (`BUG-105-red-baseline-20260930.log`, exit 1) exposed default helper composition as Claude-only and direct stderr bypass; those wiring failures were repaired before the authoritative seal run. That initial run is not the acceptance baseline.

T3 copies opaque canonical hook/harness bytes into isolated fixtures. Its PATH seam forwards `hook signal` and `hook edit-targets` to the real worktree CLI via tsx; stamp/gate/ingest are success stubs. Assertions observe actual shell target iteration/logging, not source regex. The added sibling exists after simulated successful patch; the deleted target does not. The separate Claude-shaped missing-file payload prevents a broad missing-target skip from passing. All scratch roots are removed by after-hooks; no live hook is invoked.

**Authorized Test37 fixture amendment:** parent explicitly approved materializing the two Add File delivery `.md` files before the existing successful PostToolUse payload. Four fixture lines added; all original assertions, filter cases, counts and payload unchanged. Without this correction the mandated Codex missing-target skip would make the preexisting anchor falsely red. Live Architect TPV must review this amendment.

Mutation/boundary expectations for mandatory live TPV: T1 kills absent-MCP conservative warning; T2 guards blanket suppression including malformed nonempty values and ordinary Claude init. T3 guards deleting all targets, failing to skip deletion, and applying the skip to Claude. T4 checks success, exact filename and normalization output; T5 guards unnecessary notice on already-valid input; T6 guards acceptance of an empty normalized slug. No production mutation execution or self-approval was performed. The approved six-case blueprint does not independently probe every uppercase/underscore/repeated-hyphen normalization edge; Architect decides whether amendment is needed. Snapshot compare stays red until Developer captures the correct rendered lock. TPV is mandatory for hook fixture, snapshot convention and banner wiring; this seal does not grant TPV approval.

## Named regression anchors

Each command was the package's direct `npm run test:file -- <path>` with RUN_SCRIPT_ACTIVE, ORCHESTRATOR_PROJECT_DIR, CLAUDE_PROJECT_DIR and CLEARGATE_REPO_ROOT explicitly removed. Logs and `.exit` files are beside this report. Anchor batch session 92205 was retained and polled to actual terminal completion (outer batch exit 0; per-file statuses below, including expected failures). Typecheck session 64024 completed exit 0.

| File / check | Passed / failed / skipped | Actual exit | Log prefix |
|---|---|---|---|
| stamp-and-gate.node.test.ts | 7 / 0 / 0 | 0 | BUG-105-stamp-and-gate.node.test.ts-20260930 |
| codex-hook-scripts.red.node.test.ts | 18 / 0 / 0 | 0 | BUG-105-codex-hook-scripts.red.node.test.ts-20260930 |
| new-command.node.test.ts | 57 / 0 / 0 | 0 | BUG-105-new-command.node.test.ts-20260930 |
| hooks-claude-parity.red.integration.node.test.ts | 19 / 0 / 0 | 0 | BUG-105-hooks-claude-parity.red.integration.node.test.ts-20260930 |
| hotfix-new.integration.node.test.ts, entire file | 7 / 2 / 0 | 1 | BUG-105-hotfix-new.integration.node.test.ts-20260930 |
| hotfix-new.integration, `--test-name-pattern 'Slug validation'` (M7 :446 anchor) | 1 / 0 / 0 | 0 | BUG-105-hotfix-slug-20260930 |
| npm run typecheck | pass | 0 | BUG-105-typecheck-20260930 |
| git diff --check | pass | 0 | terminal output |

Full hotfix anchor's two failures are wiki/index.md missing `## Hotfix Ledger` and the topics/hotfix-ledger link. This is the unchanged pinned outer fixture: worktree file Git blob and `967cea95:.cleargate/wiki/index.md` both equal `d92e0bb47f16b673aa7343a4440a913cdb9ed037`; pinned file has neither string, and outer wiki diff is empty. No wiki/hotfix repair performed. The specifically named slug-rejection scenario passed independently, without treating unrelated failed scenarios as a pass.

Test46 and any live clean-room harness lane are explicitly deferred to allocated QA-Verify. No full suite, install, main build, live re-sync, push, state transition, production edit or snapshot capture performed.

## Script Incidents

One diagnostic wrapped hash helper failed exit 1 because an ES import `node -e` lacked `--input-type=module`; actual incident: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260930T161227Z-fd64e553fa85.json`. It was rerun through the same absolute wrapper with `--input-type=module`, exit 0, and produced the pin-substituted refusal hash above. This is harness invocation evidence, not a product failure. Direct package test failures are durably captured in their logs/exit files per the sprint test-runner recipe.
