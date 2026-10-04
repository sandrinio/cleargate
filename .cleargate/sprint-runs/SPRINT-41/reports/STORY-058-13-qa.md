role: qa

# STORY-058-13 QA-Verify (harness lane, post-B1-fix)

```
QA: PASS-PENDING-SMOKE
STORY: STORY-058-13
TREE: cli f33cc4a216f67894294a9e734345a4c91a43408f (clean) · outer d6c5264e3d9151170eafe9c6bb1863ec284ac535 (2 expected uncommitted files: clean-room-verification.md M, codex-loop-evidence.md ??)
TYPECHECK: pass (npm run typecheck, exit 0, in <cw>)
TESTS:
  shape 20/20 · evidence 43/43 · harness 21/21
  -10 amend: verify-install-codex.red 9/9 · verify-install.red 42/42 · verify-install-cli.red.integration 5/5 · verify-install-codex-cli.red.integration 2/2
  codex-hooks-harness.red 91/91 · codex-hooks-write-result.red 4/4
  rule-16 spot check: clean-room-verification-doc.red 9/9 (relied on Dev/INTEGRATE's 338/338 total per brief; spot check did not disagree)
  0 fail, 0 skipped anywhere I ran
WITNESSES:
  test 46 CLEARGATE_CODEX_BIN=<P> codex-hooks.red.integration.node.test.ts — 1/1 PASS (99.9s)
  clean-room-claude-baseline.red.integration.node.test.ts — 13/13 PASS
  CLEARGATE_CODEX_BIN=<P> codex-loop.red.integration.node.test.ts — 2/2 PASS; Part B summary.json: result PASS, loop_transport PASS, enforcement_parity PASS, cliSha f33cc4a (current HEAD); metering.rows matchesProvider true 5/5; container removed by exact path after reading ($TMPDIR/cg-s41-13-codexloop-e2e-1790469070747)
```

## REPRODUCTION

Command run exactly per brief (single UTC-stamped literal path, no `--evidence`):
```
node .worktrees/STORY-058-13/cleargate-cli/scripts/clean-room/codex-loop.mjs run --provider scripted --trust harness \
  --codex-bin <PINNED> --ref story/STORY-058-13 \
  --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T061256Z-13qa \
  --meta-repo /Users/ssuladze/Documents/Dev/ClearGate
```
- **Container (kept):** `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T061256Z-13qa`
- Exit 0. `codex-loop run: PASS (loop_transport PASS, enforcement_parity PASS)`.
- **Diff vs Run 2** (`/Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2`), programmatic, all 23 verdict ids compared: **0 differences** — every id has the identical status (INFO rows included; wall-clock/trust-posture detail text differs only in timing, which is expected and not diffed). `result`/`loop_transport`/`enforcement_parity` all PASS on both.
- Container left in place per brief.

**Run 2 container (read only, not touched):** `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260927T001250Z-13run2`

## B1 PROBE

Imported `<cw>/scripts/clean-room/loop-evidence.mjs` (at `f33cc4a`, the B1 fix commit) in a scratch script and fed my own reproduction's `inputs.json` (not Run 2's — an independently produced dataset) through `codexLoopVerdicts`, with mutations on `inputs.loop.commands` / `inputs.loop.rootThreadId`:

| Case | Result | Detail |
|---|---|---|
| As recorded | **PASS** (loop_transport PASS, enforcement_parity PASS) | terminal-state: `Done; transitions: ... Ready to Bounce → Done` |
| Root `update_state.mjs STORY-001-01 'QA Passed'` added | **PASS** | terminal-state adds `; orchestrator update_state (recorded, playbook-prescribed): 1` |
| Root `update_state.mjs STORY-001-01 Done` added | **terminal-state FAIL → loop_transport FAIL → result FAIL** | `the orchestrator (root thread) ran the DevOps-owned Done transition: ...` |
| `rootThreadId` deleted | **merge FAIL, terminal-state FAIL → loop_transport FAIL, enforcement_parity FAIL → result FAIL** | merge: `no root thread id: the orchestrator-forbidden patterns cannot be checked`; terminal-state: `no root thread id: the orchestrator-forbidden Done transition cannot be checked` |

All four outcomes match the Architect's prescribed post-flight probe (M6.md "Post-flight rulings" §8 Observations) and the Developer's own re-grade in `STORY-058-13-dev-b1.md`, reproduced independently on a third dataset. B1 is fixed; no vacuity observed on my data.

## SMOKE

Single `(cd /literal/tmp && git init -q && node <cw>/dist/cli.js init --yes --host all && node <cw>/dist/cli.js verify-install --json)` call:
- Exit 0. 8 codex ids: `codex.features-hooks, codex.hooks-wiring, codex.hooks-executable, codex.no-foreign-hooks, codex.instruction-block, codex.mcp-registration, codex.roles, codex.skills` — all `pass`. 5 claude ids — all `pass`. `ok: true`.

Second single call, plain `init --yes` (no `--host`), same pattern:
- `verify-install --json`: 0 codex rows in `checks`, 0 codex rows in `live`. `ok: true`. `installedHosts: ['claude']`.

Both smoke dirs deleted by exact path afterward.

**Outer git status after both smokes and the reproduction:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Only the 4 ledger files — nothing new. Matches the SMOKE RULE requirement.

## CHECK

```
(cd /Users/ssuladze/Documents/Dev/ClearGate && node .worktrees/STORY-058-13/cleargate-cli/scripts/clean-room/codex-loop.mjs check \
  --evidence .worktrees/STORY-058-13/.cleargate/sprint-runs/SPRINT-41/codex-loop-evidence.md \
  --cli .worktrees/STORY-058-13/cleargate-cli --ref story/STORY-058-13)
```
`codex-loop check: FAIL (ref=story/STORY-058-13) — needs a live human-trust PASS run on the final artifact inputs`, exit 1. **Only** that reason — no `stale`. Confirms the F6.9 scripted re-run (Run 2) is current against the B1-fixed tip, and the sole remaining gate is Step L (owner-only, out of QA-Verify scope per the dispatch's credential/trust rules).

## Diff-scope confirmation

`git -C <cw> diff --numstat f0c33f7 HEAD` (25 rows) vs `git -C <cw> diff --numstat 9a94ff2 7a7bfa6` (25 rows): identical except one row, `scripts/clean-room/loop-evidence.mjs` (962 vs 948 added lines — the +14 net delta of the B1 fix's +18/−4). Confirms the integrated tip is exactly STORY-058-13's build delta plus the B1 fix, nothing else.

## Gherkin / DoD table

| # | Item | Status | Evidence |
|---|---|---|---|
| G1 | A real story completes the loop under Codex (scripted) | **PASS** | Run 1, Run 2, my reproduction — all `result PASS`, merge SHA recorded (`10769273…` on my repro), STORY-001-01 reaches `Done` |
| G1-live | ...under a live human-trust session | **not run — Step L (owner-only)** | out of QA-Verify scope; blocked on OD1 + owner trust grant |
| G2 | Hook firing recorded per dispatch, incl. gaps; negative/positive controls; missing enforcement fails | **PASS** | `codex.loop.hook-matrix` PASS, `codex.live.{edit-deny,edit-allow,dispatch-deny,dispatch-identity}` all PASS on Run1/Run2/my repro; B1 probe shows a genuine forbidden-pattern FAIL is reachable (not vacuous) |
| G3 | Unavailable metering stated, never synthesized | **PASS** | `codex.loop.metering` INFO `unavailable`, 5/5 dispatches with records, `matchesProvider` true 5/5 (e2e Part B, confirmed above); `codex.loop.no-synthetic-usage` PASS on all three runs |
| G4 | Trust posture disclosed (scripted half) | **PASS** | `codex.loop.trust-posture` INFO `harness-exact-hash` on Run1/Run2/my repro |
| G4-live | ...primary evidence records human trust of exact hook hashes | **not run — Step L** | requires OD1 + owner TUI trust grant; explicitly forbidden to QA-Verify (no `--trust human`) |
| G5 | `verify-install --host codex` machine-checkable half automated | **PASS** | shape 20/20, CLI integration 2/2, smoke: 8 codex ids all `pass`, plain install 0 codex rows |
| DoD §4.1 | Min test counts (2 unit / 1 integration / 1 e2e) | **PASS** | shape+features-hooks tests, `verify-install-codex-cli` integration 2/2, e2e Part B PASS |
| DoD | All Gherkin scenarios covered | **PASS** (static scope); live half deferred | see G1-live/G4-live above |
| DoD | Peer/Architect Review passed | **Conditionally met**: Architect FAILed (B1), Developer fixed it; my independent re-grade (B1 PROBE) confirms the fix. Architect's own "post-flight delta re-check" (M6.md §8 item 5, a distinct architect action after QA-Verify) has not yet run as of this dispatch — not a QA gap, next in the plan's order | `STORY-058-13-arch.md`, `STORY-058-13-dev-b1.md` |
| DoD | Real story reached terminal state, DevOps merge, SHA recorded | **PASS** | Run1 `ec957563…`, Run2 `c2ca25de…`, my repro `10769273…` |
| DoD | Per-dispatch hook firing recorded, gaps included | **PASS** | hook-matrix verdict, all three runs |
| DoD | loop_transport AND enforcement_parity both pass | **PASS** (scripted); live pending Step L | Run1/Run2/my repro all PASS/PASS |
| DoD | Telemetry real-or-unavailable, no synthesized zero rows | **PASS** | see G3 |
| DoD | Primary standalone path/version/SHA-256, human trust of exact hook hashes recorded | **not yet — Step L** | primary evidence is the live run; not runnable by QA-Verify |
| DoD | Every gap has a filed follow-up | **not yet — Step L6** | gaps currently carry placeholder "to be filed at step L6" per D6; this runs after the owner's live session |
| DoD | `codex-loop-evidence.md` gates close via `deferred_verification` | **Working as designed** | `check` correctly FAILs pending the live PASS (see CHECK above); this is the mechanism, not a defect |
| DoD | Run proves nothing written to meta-repo sprint state | **PASS** | `codex.loop.meta-repo-untouched` PASS on Run1/Run2/my repro; outer git status confirmed clean of anything but the 4 ledger files after my own reproduction + both smokes |

## Not provable without OD1 + Step L (expected-open, per M6 F8)

- A live model actually following the installed Codex playbook (live loop transport).
- Human trust of the exact workspace and hook hashes — Gherkin "Trust posture is disclosed" 2nd `Then`, and the DoD's "human trust of the exact hook hashes are recorded" bullet.
- `checkLoopEvidence` returning ok, and with it the story's `deferred_verification` and sprint-close Step 2.9.
- Filing the per-gap follow-up items (L6) and finalizing the Gaps column in the evidence doc.
- The Architect's post-flight delta re-check (a distinct architect action per M6.md §8's ordering, sitting between this QA-Verify and RS-4L).

## Task Breakdown (advisory, EPIC-054 WS7)

The story file's `## Task Breakdown` section still shows every row unchecked except the last (`deferred_verification` frontmatter, `- [x]`). This is consistent with the Developer's own note in `STORY-058-13-dev.md` ("Task Breakdown rows satisfied (not ticked; the delivery file was not edited)") — Pass A and Pass B rows are satisfied by commits `608e45c`/`7a7bfa6`, Integrate/QA-Verify rows by this dispatch and the prior INTEGRATE report, and the remaining rows (Step L, follow-up filing) are genuinely open pending the owner's live session. Advisory only, not a bounce criterion — noting per protocol.

## Findings

- No blocking findings from this QA-Verify pass. B1 is confirmed fixed on independently reproduced data (third dataset beyond Run 1/Run 2).
- The evidence file's cosmetic `⏎` artifact from Run 1 remains as an append-only historical record (by design — the Architect's remediation only affects future runs); Run 2 and my reproduction both render the trimmed line cleanly (verified for Run 2 in `STORY-058-13-dev-b1.md`; not independently re-verified by me since my repro used `check`/programmatic diff, not the rendered markdown — non-blocking).
- Everything the Architect's post-flight §7 follow-ups (FU-1..FU-9) name is correctly left open as non-blocking follow-up work, to be filed under EPIC-058 at sprint close per the story's own DoD bullet — none of them affect this dispatch's PASS-PENDING-SMOKE verdict.
- Verdict is `PASS-PENDING-SMOKE`, not `PASS`, per CR-082: the story's frontmatter `deferred_verification` entry (Goal check 5, live human-trust run) is out of scope for this QA pass by explicit rule (no `--provider live`/`--trust human`), and every other static scenario passes. This merges to the sprint branch but is not fully Done until Step L + the deferred check land, per protocol.

```yaml
flashcards_flagged:
  - "2026-09-27 · #qa #codex #clean-room · An independently reproduced inputs.json is a stronger B1 fix witness than re-grading the dev's own dataset."
  - "2026-09-27 · #qa #verify-install · verify-install --json 'checks' vs 'live' arrays both need a codex-row count; a plain install must show 0 in both."
```
