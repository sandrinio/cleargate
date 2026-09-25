# BUG-089 QA-Red — Round 2 (arch_bounces=1, TPV BLOCKED-WIRING-GAP addressed)

role: qa

## Mode

RED — write failing tests against §5 Verification Protocol + §1 Expected
Behavior + Task Breakdown. No implementation was read or edited beyond the
BUG report's own §2/§3 and the QA-owned test suites. `src/hooks/hook-signal.ts`,
`src/commands/hook.ts`, both canonical hook shell scripts, and
`cleargate-planning/.claude/settings.json` were not directly opened this
session. `refs/cgtest/BUG-089` commit `a0d5898` was never shown or diffed.

## Round 1 recap (superseded parts only — see git history on story/BUG-089 for full text)

Sealed Codex-session red test on `refs/cgtest/BUG-089` adopted as base, two
named layout defects repaired (mkdtemp-based FIXTURE_PARENT, CLEARGATE_META_ROOT-aware
META_ROOT), dynamic-import extension normalized to `.js`, and split into unit
(`hook-signal.red.node.test.ts`) + integration (`hook-signal.red.integration.node.test.ts`)
layers per CR-111 naming. Round-1 commits: cli `dc78bcc`, outer worktree `5bdd45c5`.

## Round 2 — TPV BLOCKED-WIRING-GAP, addressed in this bounce

Full verdict: `.cleargate/sprint-runs/SPRINT-41/reports/BUG-089-tpv.md`. Three
required fixes, all applied to the Round-1 (not-yet-frozen) red files:

### W1 — stub `cleargate` by subcommand, not blanket exit code

**Gap:** `fixturePath()`'s single-status stub answered EVERY `cleargate`
subcommand identically, so in the `allow` fixture (unit U5 base case,
integration I2) it also answered `pre-edit-gate.sh`'s upstream
`doctor --can-edit` check with 0 ("covered") — TPV's scratch reference then
exits 0 without ever reaching the blocking branch (measured `0 !== 2`).

**Fix, both files:** the stub script now branches on `"$*"`, mirroring
`make_fake_cleargate` in `test/scripts/test_pre_edit_gate.sh:57-77`:
- `*--can-edit*` → `blocked: no_approved_stories`, exit 1 (forces the
  "uncovered edit" precondition every scenario in this file wants, real now
  instead of accidental).
- `*"hook signal"*` → the mode's status (unit file: 0/1/17 per
  allow/failed/unexpected; integration file: always 0, since it only proves
  the healthy-CLI wiring path).
- Anything else → exit 0.
- `missing` mode unchanged (no `cleargate` binary at all — neither subcommand resolves).

**Consequences handled in the same edit:**
- **U13 (warn mode)** was vacuous under the blanket stub (doctor always said
  "covered", so warn's exit 0 proved nothing about mode handling). No test-code
  change needed — the fixture fix alone makes it real: doctor now always says
  "uncovered," so U13 is what kills a mutant that blocks in warn mode too.
- **U15 retargeted.** The Round-1 U15 asserted `CLEARGATE_ADVISORY=1` degrades
  `pre-edit-gate.sh`'s block to a warning — `cleargate-enforcement.md` §15
  (lines 574-576) forbids a second `CLEARGATE_ADVISORY` honor site;
  `pending-task-sentinel.sh` is the only one. U15 now asserts
  `CLEARGATE_ADVISORY=1` on `pending-task-sentinel.sh` with a pending
  flashcard → exit 0 (Task Breakdown row 5's actual preserved behavior).

### W2 — `test_pre_edit_gate.sh` never reads the worktree hook

**Gap:** `REPO_ROOT` was derived from `BASH_SOURCE[0]/../../..`, which from the
cli checkout always resolves `HOOK` to the outer **main** checkout's canonical
hook, never `.worktrees/BUG-089/`. Cases 4/7 could not turn green from the
Developer's worktree edit until merge.

**Fix:** added a `PRE_EDIT_GATE_HOOK` override (default unchanged), mirroring
`PENDING_TASK_SENTINEL_HOOK` in `.cleargate/scripts/test/test_flashcard_enforcement.sh:23-30`.

### A1 — U3's "unknown host" literal

Changed from `'codex'` (which STORY-058-10/M5 will make a valid host — this
test would silently regress to green-for-the-wrong-reason once that story
lands, then red once codex mapping is added but before this test is revisited)
to the obviously-bogus `'not-a-host'`.

## RED_TESTS (this bounce)

- `cleargate-cli/test/hooks/hook-signal.red.node.test.ts` — amended (W1 stub scoping, U15 retarget, A1 literal). 16 assertions across 14 `test()`/sub-`test()` entries, unchanged count.
- `cleargate-cli/test/hooks/hook-signal.red.integration.node.test.ts` — amended (W1 stub scoping only; I1-I3 unchanged in intent).
- `cleargate-cli/test/scripts/test_pre_edit_gate.sh` — amended (W2 `PRE_EDIT_GATE_HOOK` override added; Cases 4/7 exit-2 assertions from Round 1 unchanged).
- `.cleargate/scripts/test/test_flashcard_enforcement.sh` (outer worktree) — unchanged this round (no W1/W2/A1 surface here); already committed at `5bdd45c5` with Scenario 1 bumped to exit 2.
- `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` — unchanged, still not modified (confirmed unaffected in Round 1; re-verification not required, no surface touched this round).

## BASELINE_FAIL (Round 2, re-run against the unimplemented baseline)

Command: `cd cleargate-cli && CLEARGATE_META_ROOT=<worktree> bash .cleargate/scripts/run_script.sh npm run test:file -- <file>`

- `test/hooks/hook-signal.red.node.test.ts`: **10 / 14 fail** — same count as Round 1, but the failure REASON for the U5 base case (and U7-U9) changed from the TPV-flagged gap to the genuine bug: stderr now reads `no approved story covers /tmp/uncovered.ts (no_approved_stories)` (doctor correctly forced to "uncovered" by the scoped stub) followed by `1 !== 2` — the script's current fail-open `exit 1`, not the old `0 !== 2` escape hatch. U1-U4 still fail on `ERR_MODULE_NOT_FOUND` (missing module). U13-U16 pass (U13 is now a real, non-vacuous control per W1; U15 now exercises the correct honor site).
- `test/hooks/hook-signal.red.integration.node.test.ts`: **3 / 3 fail**, all still on `assert.match(command, /--host\s+claude\b/)` before any process spawns — unchanged from Round 1 (W1 only affects the fixture used once I2/I3 get past that assertion, which nothing does yet).
- `test/scripts/test_pre_edit_gate.sh` (run with `PRE_EDIT_GATE_HOOK=<worktree>/cleargate-planning/.claude/hooks/pre-edit-gate.sh`): **2 / 11 fail** (Cases 4, 7 — "expected exit 2, got 1"). Verified the override resolves to the worktree path (not the main checkout) and that main/worktree hook content is currently byte-identical (no Developer commit yet), so this is a genuine pre-implementation red, not a false green masked by reading the wrong file.
- `npm run typecheck` (cleargate-cli): clean, exit 0, after all three edits.
- 0 leftover `bug089-*` fixture dirs after every run (checked `/tmp` post-run).

## Script Incidents (Round 2 — expected RED-mode failures, not infra faults)

- `cleargate-cli/.cleargate/sprint-runs/_off-sprint/.script-incidents/` — new entries for the two `npm run test:file` re-runs and the `PRE_EDIT_GATE_HOOK`-overridden shell re-run, each exit 1 for the same reasons itemized above.

## Not mine

E2E (real Claude session denial, BUG-089 §5 row 3) is out of scope — orchestrator proves it at barrier B0. STORY-058-10's `codex` host mapping and the `resolveBlockSignal` vs `resolveHookSignal` naming reconciliation (TPV Advisory A2) are the orchestrator's cross-story amendment, not QA-Red's.

## Process note

I mistakenly ran `git checkout -- .cleargate/FLASHCARD.md` in the outer MAIN
checkout (`/Users/ssuladze/Documents/Dev/ClearGate`) during Round 1 to undo my
own stray edit there. Per the coordinator's Round 2 note, this also wiped an
orchestrator edit. Acknowledged; no git operations of any kind were run
against the main checkout this round (read-only), and no FLASHCARD.md file
(main or worktree) was written to in Round 2 — flashcards are listed in the
QA-RED response only, per instruction.
