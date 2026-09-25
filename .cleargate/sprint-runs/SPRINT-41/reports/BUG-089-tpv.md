# BUG-089 Test Pattern Validation

role: architect

TPV: BLOCKED-WIRING-GAP — the fixture-bin `cleargate` stub answers every subcommand, so in the `allow` fixture (unit U5 first case, integration I2) it also answers `pre-edit-gate.sh`'s upstream `doctor --can-edit` with exit 0; the edit is judged covered and a spec-faithful implementation exits 0 without ever reaching the blocking branch (measured `0 !== 2`).

Supersedes the Codex-era TPV (2026-09-12, `refs/cgtest/BUG-089` seal `1ee88a5`). Reviewed this repo's re-sealed tests: cli `story/BUG-089` @ `dc78bcc`, outer worktree `story/BUG-089` @ `5bdd45c5`.

## Method

Wiring was read from source, then measured with a minimal out-of-tree reference implementation in the scratchpad, not in either repo. The reference makes these changes to copies of the canonical hooks and `settings.json`:
- It adds a `--host` argument that defaults to `claude`.
- On each blocking branch it calls `hook signal block --host "$HOST"` through the same CLI resolution order as `pre-edit-gate.sh:94-116`, then **always** exits 2 (fail closed on any resolver result other than 2).
- It appends `--host claude` to both registered commands.
- It leaves the doctor decision, warn mode, active-sprint bypass, `CLEARGATE_ADVISORY` and `SKIP_FLASHCARD_GATE` untouched.

The red tests then ran against the reference via `CLEARGATE_META_ROOT=<scratch>`.

| Suite | Result vs reference | Notes |
|---|---|---|
| `test/hooks/hook-signal.red.node.test.ts` | 11/14 | U1-U2, U3-U4 fail on the absent cli module, which is expected out-of-tree. The **U5 allow case fails `0 !== 2`**: this is the gap. |
| `test/hooks/hook-signal.red.integration.node.test.ts` | 2/3 | **I2 fails `0 !== 2`**, with empty stderr (doctor said "allowed"). I1 and I3 pass. |
| `test/scripts/test_pre_edit_gate.sh` (scratch copy rooted at the reference) | 11/11 | Cases 4 and 7 are satisfiable. |
| `.cleargate/scripts/test/test_flashcard_enforcement.sh` (`PENDING_TASK_SENTINEL_HOOK` → reference) | 12/12 | S1 is satisfiable. |

## Wiring findings

### W1 (blocking) — resolver stub over-intercepts the doctor call

`pre-edit-gate.sh:133` asks `"${CG[@]}" doctor --can-edit "${FILE}"` through the same `CG` resolution that the fixture stubs. In `fixturePath(root,'allow')` (unit file line 110, status 0) and in the integration `fixturePath` (line 97, `exit 0`), the stub returns 0 for `doctor --can-edit`. The hook then reads `DOCTOR_EXIT=0`, skips §7 (`:155`) and exits 0. No correct implementation can produce the asserted 2 without changing the allow path's semantics.

The `failed` (1), `unexpected` (17) and `missing` (npx stub 127) modes only pass because doctor also fails in those modes. They reach the blocking branch by accident of the same over-interception, not by design.

**Repair:** scope both `fixturePath` stubs by subcommand, the same way `test_pre_edit_gate.sh:57-77` `make_fake_cleargate` already does:
- `*--can-edit*` prints `blocked: no_approved_stories` and exits 1. This is the "uncovered edit" precondition.
- `*hook signal*` exits with the mode's status (0/1/17).
- Anything else exits 0.
- Missing mode is unchanged.

Measured with a scoped stub, the reference gives: enforce → 2, warn → 0.

Consequences of the W1 repair that QA-Red must handle in the same bounce (both measured):

- **U13 becomes a real control.** It is vacuous today. A mutant that blocks in warn mode too (`if [ "${MODE}" = "enforce" ]` → `if true`) exits 0 under the current fixture, so it survives U13. Under the scoped stub it exits 2 and is killed.
- **U15 must be retargeted.** It is vacuous today. Under the scoped stub, the reference exits 2 for enforce plus `CLEARGATE_ADVISORY=1`, because `pre-edit-gate.sh` has no advisory handling. Making U15 green would require a new `CLEARGATE_ADVISORY` honor site in `pre-edit-gate.sh`. `cleargate-enforcement.md` §15 (lines 574-576) forbids that: `pending-task-sentinel.sh` is the only hook honor site, and "adding a new honor site anywhere else is out of scope by design". **Decision:** retarget U15 to `pending-task-sentinel.sh` (pending card + `CLEARGATE_ADVISORY=1` → exit 0). That is the only place where "advisory still degrades to a warning" (Task Breakdown row 5) has an existing behavior to preserve.

### W2 (blocking, same bounce) — `test_pre_edit_gate.sh` never reads the worktree hook

`test_pre_edit_gate.sh:12-13` derives `REPO_ROOT` from `BASH_SOURCE/../../..`. Run from the cli checkout, that resolves `HOOK` to the outer **main** checkout's `cleargate-planning/.claude/hooks/pre-edit-gate.sh`, not `.worktrees/BUG-089/`. There is no env override.

As a result, Cases 4 and 7 cannot turn green from the Developer's worktree edit until the outer story branch lands in `sprint/S-41`. The §5 verification command therefore reports red against a correct fix.

**Repair:** add a `PRE_EDIT_GATE_HOOK` override that mirrors `test_flashcard_enforcement.sh:23-28` (`PENDING_TASK_SENTINEL_HOOK`), or honor `CLEARGATE_META_ROOT`. Measured: a copy rooted at the reference passes 11/11.

## Checks that pass

1. **Imports.**
   - Only `node:` builtins are imported.
   - The dynamic `../../src/hooks/hook-signal.js` import resolves to `cleargate-cli/src/hooks/hook-signal.ts`, the path §4 names. That file is absent at Red (`src/hooks/` does not exist yet).
   - The `.js` specifier matches the repo convention (`test/auth/factory.node.test.ts:26`, tsconfig `moduleResolution: Bundler`).
   - `SETTINGS` and `HOOK_ASSET` honor `CLEARGATE_META_ROOT` (unit `:63-66`, integration `:47-51`).
2. **Signatures.**
   - The hook invocation `--host claude` matches the §4 and Task Breakdown requirement for explicit host selection.
   - `resolveHookSignal({host, decision}) → {exitCode}` is test-defined, since BUG-089 names no export. See A2.
   - The I1 matchers `Edit|Write` and `Task|Agent` match the current `settings.json`.
3. **Fixture resolution routes.** `pre-edit-gate.sh:94-116` resolves the CLI in this order:
   - `${REPO_ROOT}/cleargate-cli/dist/cli.js`: the fixture root has none, so this route cannot bypass the stub.
   - `cleargate` on PATH: this is the fixture-bin stub.
   - `npx`: the fixture-bin stub exits 127.

   PATH is restricted to fixture-bin plus system dirs, with no global `cleargate`. `node` is symlinked from `process.execPath`. `jq` and `shasum`, which the sentinel needs (`:56-57`, `:126`), exist at `/usr/bin`. No unsimulated bypass route exists. The defect is over-interception (W1), not bypass.
4. **After-hooks.**
   - `FIXTURE_PARENT` is created with `mkdtemp` and removed by a top-level `after()`.
   - Each case root is removed in `finally`.
   - The hooks' own writes (hook-log, sentinel) land inside the case roots.
   - Measured: 0 leftover `bug089-*` dirs after both runs.
5. **Naming.**
   - `hook-signal.red.node.test.ts` is correct.
   - `hook-signal.red.integration.node.test.ts` is correct and carries `// @cleargate-tier: integration`.
   - The two `.sh` files are the existing suites that §5 names, with only their expectations bumped.

## Advisory (non-blocking; fold into the same QA-Red bounce)

- **A1.** U3 uses `host: 'codex'` as the "unknown host". STORY-058-10 (M5) makes `codex` valid, so U3 would go red then. Use a bogus literal instead, e.g. `'not-a-host'`.
- **A2.** The resolver name diverges across stories. The red test pins `resolveHookSignal({host, decision})`, but STORY-058-10 §3.2 (line 167) names `resolveBlockSignal(host, outcome)`. BUG-089's red test governs this story; the orchestrator should amend STORY-058-10 to cite the shipped name.
- **A3.** Immutability is honor-system for 3 of the 4 red artefacts. `pre-commit-surface-gate.sh` matches neither `*.red.integration.node.test.ts` nor the `.sh` suites.
- **A4.** `test_flashcard_enforcement.sh` `invoke_hook` inherits `SKIP_FLASHCARD_GATE` and `CLEARGATE_ADVISORY` (pre-existing). Run it under `env -u SKIP_FLASHCARD_GATE -u CLEARGATE_ADVISORY`.

## Pre-gate typecheck flag

This is an environment artifact only.
- `npm run typecheck` in `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` (through the wrapper) exits 0.
- `npm --prefix cleargate-cli run typecheck` inside `.worktrees/BUG-089` reproduces exit 254.
- The outer worktree has no `cleargate-cli/` directory, which is rule R1 (nested repo, never in the outer worktree).

## Routing

Route back to QA-Red for W1 (including the U13/U15 consequences) and W2; A1 is optional in the same pass. The orchestrator increments `arch_bounces` (`update_state.mjs BUG-089 --arch-bounce`). No repo files were edited; only this report was written.

## Script Incidents

These are expected red runs against the scratch reference, written to the gitignored outer-main bucket:
- `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260924T235657Z-932a737a44d6.json` (unit file)
- `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260924T235709Z-379741b0e173.json` (integration file)

## flashcards_flagged

- "2026-09-25 · #test-harness #hooks #tpv · A PATH `cleargate` stub answers EVERY subcommand, incl. pre-edit-gate's doctor --can-edit — stub by subcommand."
- "2026-09-25 · #hooks #advisory · CLEARGATE_ADVISORY has ONE hook honor site (pending-task-sentinel); an edit-gate advisory test pins a §15-forbidden site."
- "2026-09-25 · #test-harness #cross-repo · test_pre_edit_gate.sh roots at BASH_SOURCE/../../.. → outer MAIN hook, never the worktree; no override."
