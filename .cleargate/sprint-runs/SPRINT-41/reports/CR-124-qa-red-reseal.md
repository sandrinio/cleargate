role: qa

# CR-124: QA-Red TPV re-seal

```
QA-RED: WRITTEN
RESEAL_COMMIT: ac491a610f5d65700ef678e587a41e1d3e517c93
```

## 1. Patch verification

- `shasum -a 256 reports/CR-124-tpv-reseal.patch` = `66bc35a994e6d6195482f513b410bde613a35a9c5e471e5315b662fe25705077` — matches the dispatch value exactly.
- `git -C <cw> apply --check` on `dbd002f`: clean.
- Applied; modified-file list = staged-file list = patch's file list, all three equal:
  - `test/docs/contract-first-dag-text.red.node.test.ts`
  - `test/scripts/init-sprint-waves-v2.red.integration.node.test.ts`
  - `test/scripts/waves-json-v2.red.node.test.ts`
- Committed as `ac491a6` on `story/CR-124` in `<cw>`: `qa-red(CR-124): TPV re-seal — applies patch sha256 66bc35a9…5077 (RP-A25)`.

## 2. Solo re-measurement (`npm run test:file`, `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

| File | Measured | TPV expected | Match |
|---|---|---|---|
| `waves-json-v2.red.node.test.ts` | 7 tests, 4 pass, 3 fail | 7 (3 red, 4 anchors) | yes |
| `contract-first-dag-text.red.node.test.ts` | 10 tests, 3 pass, 7 fail | 10 (7 red, 3 anchors) | yes |
| `init-sprint-waves-v2.red.integration.node.test.ts` | 1 test, 0 pass, 1 fail | 1 red | yes |
| `claude-adapter-init-parity.red.integration.node.test.ts` (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`) | 5 tests, 0 pass, 5 fail | 0/5 | yes |
| `init-host-parity.red.integration.node.test.ts` (same env) | 15 tests, 0 pass, 15 fail | 0/15 | yes |

All counts equal TPV's expected per-file table exactly.

## 3. Red-for-right-reason check

- `waves-json-v2`: `AssertionError` — `storyBases` not exported (W3), `STORY-99-02 must end with its declared contract base` — bases ignored (W4), `integrationReady` not exported (W5). Matches TPV's listed reasons.
- `contract-first-dag-text`: `AssertionError`s — missing `"exports_provided"` (T1), missing `## Real-collision predicate` heading (T3c), missing `#### C.0.2 …` heading (T3a), `§A.4 must reference the real-collision predicate` (T3c), enforcement `:103` naming (T4), `§2.1 Phase Plan body must contain "contract/S-"` and must name the contract-first DAG (T5/T7). Matches.
- `init-sprint-waves-v2` (integration): `AssertionError` — the room's own `launch_wave.mjs` copy does not export `storyBases` yet. Matches.
- Parity pair: both files fail with `sanctioned delta ".claude/agents/architect.md" (CR-124): current hash mismatch` — the refuse-baseline pattern, not wiring.
- No failure in any of the five files came from a missing import, a bad constructor/mock, a thrown `TypeError`/`SyntaxError`, or a spawn failure — every failure is an `AssertionError` on missing text/export/bases, matching TPV's "never wiring" finding.

## 4. Baseline integrity

`/private/tmp/cg-s41-m2-init-baseline` was read-only for both parity runs: `find /private/tmp/cg-s41-m2-init-baseline -newer <pre-run marker>` returned nothing after both runs. Never captured.

## 5. Typecheck

`npm run typecheck` (`tsc --noEmit`) in `<cw>`: clean, exit 0.

## 6. Checkout status

- `<cw>` = `.worktrees/CR-124/cleargate-cli`: `git status --porcelain` empty (clean at `ac491a6`).
- `<ow>` = `.worktrees/CR-124`: `git status --porcelain` empty (clean). No `.cleargate/delivery` back-sync occurred in `<ow>`; nothing to revert.
- Outer main checkout (`/Users/ssuladze/Documents/Dev/ClearGate`): dirty, but not from this dispatch — `git status --porcelain` shows 30 `delivery/pending-sync/*` files plus sprint-runs ledger/state/events files (concurrent merge-lane full-suite back-sync, rule 14) and other lanes' untracked reports (`BUG-090-tpv*.md`, `plans/M5-fixwave.md`). I ran no full `npm test` and no `cleargate` command against the outer main checkout; this dispatch touched only `<cw>` (test files + typecheck + targeted `test:file` runs).

## Script Incidents

None. All invocations were `npm run test:file`/`npm run typecheck` inside `<cw>`, not through `run_script.sh` (not `.cleargate/scripts`), and none failed.

```yaml
flashcards_flagged: []
```
