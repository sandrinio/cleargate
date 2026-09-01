---
sprint_id: "SPRINT-40"
created_at: "2026-09-01T19:15:18.228Z"
last_updated: "2026-09-01T19:15:18.228Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Restore the agent-dispatch telemetry that a host tool rename silently broke, so sprint accounting and the pre-dispatch flashcard gate work again.

## Goal Acceptance Check

Confirmed by the human at the §A.5 plan-confirmation halt, 2026-09-01.

After `BUG-068` and `BUG-069` merge **and the live `/.claude/` instance is re-synced**:

1. `ls .cleargate/sprint-runs/SPRINT-40/.dispatch-*.json` is non-empty following any agent dispatch.
2. `.cleargate/hook-log/pre-tool-use-task.log` exists and carries one line per dispatch, including a line for a rejected tool name (the silent-exit path must become loud).
3. A marker-less `SubagentStop` appends a row with `agent_type: unattributed` — not a copy of the preceding row.
4. SPRINT-40's own `token-ledger.jsonl` shows more than one distinct `agent_type` across the sprint. Only satisfiable for waves 2-3: wave 1 runs under the very bug it fixes.

## Locked Versions

Frozen dependency versions for this sprint. Orchestrator populates from `package.json` snapshots at sprint init; Developers must not upgrade these mid-sprint without an explicit CR.

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| (add rows per workspace below) |  |

## Test Stack

Repo-derived test conventions. Written best-effort by `cleargate init` (detector); the
orchestrator may correct any field per-sprint. Agents read this block as OVERRIDING their
built-in defaults — Developer/QA/Architect use these values, not any hardcoded runner.

| Field | Value |
|-------|-------|
| Backend runner    | `bash .cleargate/scripts/test/<name>.sh` — no package runner. This sprint's surfaces are bash hooks + `settings.json` + one `.mjs` script. |
| Frontend runner   | n/a (no frontend surface in this sprint) |
| Typecheck command | **none — do not run.** `.cleargate/config.yml` points `arch.typecheck`/`qa.typecheck` at `npm --prefix cleargate-cli run typecheck`, but `cleargate-cli/` is an independent nested git repo, gitignored in the meta-repo, so `git worktree add` materialises it in **no** worktree. The command fails `ENOENT: cleargate-cli/package.json` for every story here, unconditionally and regardless of the diff. Treat any pre-gate `typecheck FAIL` in this sprint as environmental, per this section's own backstop rule below. |
| Red-test naming   | `<item>_<slug>.red.sh` in `.cleargate/scripts/test/` — established convention (`cr077_eviction.red.sh`, `cr081_qa_red_lint.red.sh`, `test_flashcard_fail_closed.red.sh`). Executable, self-contained, `mktemp -d` fixtures, trap cleanup, exits non-zero while red. |

**Hook-under-test contract (this sprint only).** The surfaces are the hooks themselves, so a test
must drive the *in-worktree canonical* copy, never the live `/.claude/` instance. Inject
`ORCHESTRATOR_PROJECT_DIR=<mktemp -d fixture>` so sentinel, ledger, and hook-log writes route into
the fixture. A test that writes to the real `.cleargate/sprint-runs/SPRINT-40/` or
`.cleargate/hook-log/` is a defect in the test.

_If unresolved at init: leave the table stubbed. The pre-gate scan emits a one-line
"test_stack unresolved — populate sprint_context.md §Test Stack" advisory and treats the
typecheck/test gate as advisory (not FAIL) until populated. (§0.5 backstop decision.)_

## Cross-Cutting Rules

Sprint-wide architecture rules and UI/API tokens that every story must honour. Populated from the parent Epic's `<architecture_rules>` block.

1. (rule 1)
2. (rule 2)
3. (rule 3)

## Active FLASHCARD Tags

FLASHCARD tags that appear in any story's `<agent_context>` for this sprint. Auto-populated by grepping `.cleargate/FLASHCARD.md` at sprint init. Agents: grep the flashcard file for each tag listed here before starting work.

- `#tag1` — one-line summary of the most recent card
- `#tag2` — one-line summary

## Adjacent Implementations (Reuse First)

Exported helpers and modules from already-merged stories in this sprint. The Architect updates this section after each story merges. Developers check here before writing new helpers — if the module already exists, import it; duplication is a kick-back criterion.

| Story | Module / Export | Path |
|-------|----------------|------|
| (populated as stories merge) | | |

## Mid-Sprint Amendments

_(populated by Architect on CR:scope-change or CR:approach-change; never rewrite, only append. Format: '<ISO-ts> · <ID> · <one-line note>')_

- 2026-09-02T00:05:00Z · BUG-068 · `CR:approach-change` (wave-2 only). Post-flight review of `story/BUG-068` measured that `pending-task-sentinel.sh` carries **no** ALLOW_LIST, so the six non-allow-listed agent roles are attributed via the sentinel, not left `unattributed`. M1.md §4.1/§4.3 corrected by an appended §8: BUG-069's refusal guard must also reject the literal `"unknown"` (`pending-task-sentinel.sh:173` default), and §4.5 gains a fifth red test. BUG-068's own diff is unaffected — this changes wave 2's decided shape only.
- 2026-09-02T00:05:00Z · BUG-068 · §Goal Acceptance Check item 2 flagged unobservable through the live route: `settings.json:15`'s `"Task|Agent"` matcher is the outer gate, so no rejected tool name can reach `pre-tool-use-task.sh` in production and its rejection log line will not appear. The path is proven instead by `bug068_dispatch_tool_name.red.sh` Sc3.1/Sc3.2 (direct invocation). See M1.md §8.4 / open decision 5 — orchestrator call, not an Architect one.
