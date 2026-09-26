# BUG-085 — QA-Red report

role: qa

## Commit

cli repo, branch `story/BUG-085` (cut from `main` `b100ea8`, STORY-058-07 merged):

```
ec29f45 qa-red(BUG-085): write failing tests
```

5 files changed, 1100 insertions(+), 60 deletions(-). Untracked `cleargate-0.25.0.tgz` left alone (pre-existing).

## Files

| File | Status | Purpose |
|---|---|---|
| `test/lib/drift-check-scaffold.red.node.test.ts` | new | Scenarios 1-10 + new-export sanity checks against the rewritten `checkCanonicalDrift` contract |
| `test/commands/doctor-drift-guard.node.test.ts` | modified (re-rooted, M3-A47) + extended | All 7 pre-existing cases re-rooted to `scaffold/{core,hosts/claude}` fixtures; new Scenario 11/11b/12 (default mode + `--session-start`, M3-A46) |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | new | Scenarios 13-17, 17b (M3-A48), 17c-1..4 (M3-A53) |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | modified | Scenario 4 deleted (Decision 7); header scenario list updated |
| `test/helpers/init-fixture.ts` | modified | Two BUG-085 `SANCTIONED_BASELINE_DELTAS` rows (M3-A21/T11); `captureOrCompare`'s missing-delta check now tolerates a `rel` absent from BOTH sides (see Plan ambiguity 2) |

`.claude/hooks/pending-task-sentinel.sh` (live), `CLAUDE.md` (outer), `bug068_dispatch_tool_name.red.sh` (outer), `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` and `scaffold/core/.cleargate/scripts/validate_state.mjs` (canonical implementation) are **not** touched — Developer's surface, per the "no implementation Read access" / "write tests only" RED-mode contract. I did read `src/commands/doctor.ts` and `src/lib/drift-check.ts` (read-only) to verify line anchors against T11 before writing seams against them; no implementation file was edited.

## Per-scenario table

| # | Scenario | File | Result @ `b100ea8` | Named reason |
|---|---|---|---|---|
| 1 | Parity (scaffold-rooted) | drift-check-scaffold | FAIL | `checkCanonicalDrift` still reads `cwd/cleargate-planning`; always returns `skipped:true` against a scaffold-only fixture |
| 2 | Live-behind (config.example.yml) | drift-check-scaffold | FAIL | same (skipped:true) |
| 3 | Canonical-behind (validate_state.mjs) | drift-check-scaffold | FAIL | same |
| 4a | Pin equal | drift-check-scaffold | **PASS (vacuous)** | negative control; "no drift" is trivially true under global skip — flagged, not a bug |
| 4b | Pin mismatched values | drift-check-scaffold | FAIL | same skip, plus no pin-tolerant logic exists |
| 4c | Pin unsafe value | drift-check-scaffold | FAIL | same |
| 4d | `pinTolerantEqual` direct | drift-check-scaffold | FAIL | export does not exist (`typeof === 'undefined'`) |
| 5 | Exceptions (gate-checks.json / config.yml) | drift-check-scaffold | FAIL | same skip |
| 6 | Live-only tolerance (3 subtests) | drift-check-scaffold | FAIL (2), PASS (1, `.cleargate/scripts/maint.sh` ignored) | live-only reasoning doesn't exist; the `.cleargate` ignore subtest is a regression anchor, vacuously true under skip |
| 7 | `missing-in-live` | drift-check-scaffold | FAIL | same skip |
| 8a | CLAUDE.md block mismatch | drift-check-scaffold | FAIL | same skip |
| 8b | CLAUDE.md prose-only diff | drift-check-scaffold | **PASS (vacuous)** | negative control; trivially true under global skip |
| 9 | Skipped w/ legacy `cleargate-planning/` populated | drift-check-scaffold | FAIL | OLD code sees `cleargate-planning/` and does NOT skip — inverted from the required behaviour |
| 10 | Regression guard (one canonical hook byte) | drift-check-scaffold | FAIL | same skip |
| new-export ×4 | `PIN_PLACEHOLDER` / `META_REPO_DRIFT_EXCEPTIONS` / `LIVE_ONLY_CLAUDE_ENTRIES` / `pinTolerantEqual` | drift-check-scaffold | FAIL | none of the four exports exist yet |
| new-shape | `DriftReport.allowed` | drift-check-scaffold | FAIL | shape has no `allowed` field yet |
| Scenario: Clean / Stale / CLAUDE.md / no-canonical | doctor-drift-guard (re-rooted unit ×4) | 3 FAIL, 1 PASS | re-rooted fixtures always skip except the deliberate no-scaffold case (regression anchor, correctly still `skipped:true`) |
| Scenario: 3 dist-spawning cases | doctor-drift-guard (integration) | 2 FAIL, 1 PASS | run against the on-disk pre-BUG-085 `dist/cli.js`; 2 assert drift lines that can't appear yet; the report-only "no mutation" invariant passes regardless (M3-A47: lag BD) |
| 11 | Default mode: drift line + exit(1) | doctor-drift-guard | FAIL | no `ClearGate drift:`/`scaffold drift:` line possible while skipped |
| 11 | `CLEARGATE_ADVISORY=1` → `[advisory]` + exit(0) | doctor-drift-guard | FAIL | same |
| 11b | Allowed-only → silent, exit(0) | doctor-drift-guard | FAIL | fixture-engagement guard (`skipped===false`) fails first — old code always skips this scaffold-rooted fixture |
| 12 | `--session-start` line 3 = drift text | doctor-drift-guard | FAIL | no drift line emitted at all (array has only 2 lines) |
| 12 | no-scaffold → no drift line | doctor-drift-guard | **PASS** | regression anchor, correctly green both before and after |
| 13(a) | Empty report set | pending-task-sentinel-cards | FAIL | bash-3.2 `"${REPORT_FILES[@]}"` on an empty array is a fatal `unbound variable` (measured: exit 1, `line 224: REPORT_FILES[@]: unbound variable`) |
| 14(b) | Fenced JSON block, 2 cards | pending-task-sentinel-cards | FAIL | no JSON-array parser mode exists; exit 0 instead of 2 |
| 15 | Inline JSON array, unescape | pending-task-sentinel-cards | FAIL | same; also no unescape logic |
| 16 | Unterminated JSON array (fail-closed) | pending-task-sentinel-cards | FAIL | no JSON mode ⇒ no "unparseable" detection either |
| 17(a) | `flashcards_flagged: []` → no cards | pending-task-sentinel-cards | **PASS** | regression anchor, already correct |
| 17(b) | md list form still blocks | pending-task-sentinel-cards | **PASS** | regression anchor, already correct |
| 17b-i | Unterminated `["a"]` last line | pending-task-sentinel-cards | FAIL | no JSON mode; also the `read -r` final-line drop would independently defeat it |
| 17b-ii | Unterminated `- "z"` last line | pending-task-sentinel-cards | FAIL | measured: `read -r` (no `\|\| [[ -n "$line" ]]`) silently drops the unterminated final line — card never seen, exit 0 |
| 17c-1 | Two YAML blocks, prose between | pending-task-sentinel-cards | FAIL | measured: card-two dropped (`break` at the intervening prose line exits the whole per-file scan, M3-A53) |
| 17c-2 | Inline `[]` then a later YAML block | pending-task-sentinel-cards | FAIL | measured: the inline-`[]` `break` (line 115) exits the whole file scan before the later block is ever reached |
| 17c-3 | Two md blocks, heading between | pending-task-sentinel-cards | FAIL | measured: `break` at the intervening `## Notes` heading exits the whole scan |
| 17c-4 | List block + later fenced JSON block | pending-task-sentinel-cards | FAIL | measured: the md-heading check (124) re-arms state via `continue` (never resets from block 1), and no JSON parsing exists — json-one silently dropped |
| 18 | `canonical-live-parity` full pass | canonical-live-parity (edited) | FAIL (Scenario 2 only) | canonical `validate_state.mjs` is the pre-CR-117-port stale copy; the real, pre-existing BUG-085 defect this bug fixes |

## Per-file counts (both runs — deterministic, identical run 1 / run 2)

| File | tests | pass | fail |
|---|---|---|---|
| `test/lib/drift-check-scaffold.red.node.test.ts` | 22 | 2 | 20 |
| `test/commands/doctor-drift-guard.node.test.ts` | 12 | 3 | 9 |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 12 | 2 | 10 |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 11 | 10 | 1 |

`npm run typecheck` → exit 0, both before and after (test files are excluded from `tsconfig.json`'s `include`, so only the untouched `src/**` is checked either way).

## Sealed files — stay green (unaffected by this diff)

| File | Expected | Actual |
|---|---|---|
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 |
| `test/hosts/host-selection.red.node.test.ts` | 11/11 | 11/11 |
| `test/commands/init-host-selection.red.node.test.ts` | 10/10 | 10/10 |
| `test/commands/init-host-cli.red.integration.node.test.ts` | 4/4 | 4/4 |
| `test/lib/manifest-host-ownership.red.node.test.ts` | 18/18 | 18/18 |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 (see Plan ambiguity 2 — required a `test/helpers/init-fixture.ts` behavior fix, not just additive rows, to hold) |
| `test/hosts/host-lifecycle.red.node.test.ts` | 17/17 | 17/17 |
| `test/commands/host-cli.red.integration.node.test.ts` | 3/3 | 3/3 |
| `test/hosts/manifest-query.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/doctor-per-host.red.node.test.ts` | 10/10 | 10/10 |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 |
| `test/commands/uninstall-reinit.red.node.test.ts` | 4/4 | 4/4 |
| `test/commands/doctor.node.test.ts` | green | 39/39 |
| `test/commands/doctor-session-start.node.test.ts` | green | 20/20 |
| `test/hooks/hook-signal.red.node.test.ts` | green | 14/14 |
| `test/hooks/hook-signal.red.integration.node.test.ts` | green | 3/3 |
| `test/snapshots/hooks-snapshots.node.test.ts` (bonus check — pins no `pending-task-sentinel` bytes) | green | 14/14 |
| `test/hooks/run-id-ledger-attribution.red.node.test.ts` (bonus check) | green | 10/10 |
| `test/scripts/parallel-dispatch.red.node.test.ts` (bonus check) | green | 6/6 |
| `test/docs/autonomy-contract.red.node.test.ts` (bonus check) | green | 30/30 |
| `test/scaffold/ratchet-retired.node.test.ts` (adjacent to the Scenario-4 deletion) | green | 8/8 |

`test/commands/init-host-snapshot.red.node.test.ts`'s Scenario 15 (`captureOrCompare` unit tests) went **2/13 red** immediately after adding the two `scenarios: 'all'` rows — see Plan ambiguity 2 for the fix and rationale. After the fix, re-confirmed 13/13 across two solo runs.

## Parity (M2 baseline, compare mode)

`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, solo:

| File | Expected | Actual |
|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5/5 | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15/15 | 15/15 |

**Which rows go red because of the two new delta rows: none, today.** Both `currentHash()` functions read the REAL canonical source at test time (not a hardcoded future literal) and apply the same pin substitution `copyPayload` performs. Since neither `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` nor `scaffold/core/.cleargate/scripts/validate_state.mjs` has been edited yet on this branch, `currentHash() === baselineHash()` for both rows — a legitimate no-op today, independently confirmed:
- `pending-task-sentinel.sh` (pin-substituted to `0.0.0-m2`): `b1ab7702066788282302efa160c7b5075adec971ec1318112d13a4b949f9636e` (matches T11's literal, and matches both `baselineHash()` and `currentHash()` today).
- `validate_state.mjs` (canonical, no substitution): `c868234c77f4a25d15eeca066eff6f04b2f1dc7a1a16f9240e8ea1976b58fd7d` (matches T11; also matches the M2-recorded baseline). Live target (recomputed against `OUTER/.cleargate/scripts/validate_state.mjs`): `9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae` (matches T11's literal exactly).

Once the Developer's commit changes either file's canonical bytes, `currentHash()` will automatically track the new bytes (no re-edit needed here), and the same two parity files must stay 5/5 and 15/15 per M3-A50.

## Baseline hash (M2 init baseline directory, not the cli suite)

Recipe: `find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256` — **absolute paths are required** to reproduce the previously-recorded value (relative `cd`+`.` paths hash identical file content but a different overall digest, since the path string is part of each `shasum` line; flagged as a flashcard below).

- Before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files)
- After: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files) — unchanged.

## Outer status

Start:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

End (identical — only the four hook-owned ledger/state files, no QA-Red pollution):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

No writing CLI smoke was run in this dispatch (QA-Red only writes/runs tests inside the cli checkout; no `init`/`upgrade`/`host add`/`uninstall` was invoked).

## Plan ambiguities (orchestrator_confirmed: false)

1. **Home for scenarios 11-12.** The blueprint offers "the amended `test/commands/doctor-drift-guard.node.test.ts` (or a new `test/commands/doctor-drift-session.red.node.test.ts`), whichever the plan names" but never names one explicitly. I put them in the existing `doctor-drift-guard.node.test.ts`, because BUG-085 §4's own "New Files Needed" row lists only `drift-check-scaffold.red.node.test.ts` and `pending-task-sentinel-cards.red.node.test.ts` — no third doctor file. `orchestrator_confirmed: false` — please confirm or redirect before TPV.

2. **`captureOrCompare`'s missing-delta check had to change, not just gain two rows.** Adding the two BUG-085 `scenarios: 'all'` rows immediately turned 2 of `test/commands/init-host-snapshot.red.node.test.ts`'s 13 (sealed, immutable, `*.red.node.test.ts`) tests red: Scenario 15's own unit test of the delta mechanism builds a **minimal 1-2-file synthetic fixture** (only `.cleargate/.install-manifest.json`, plus `.claude/settings.json` in one sub-case) and calls `captureOrCompare` directly — it never modelled either new file. The pre-existing check (`!storedEntry || !recordEntry` ⇒ throw) treated "absent from both sides" the same as "present on only one side," so any new `scenarios: 'all'` row breaks it. I narrowed the throw to fire only on the **asymmetric** case (present on exactly one side) and skip cleanly when a `rel` is absent from both — preserving the original safety net (a delta whose `rel` never reaches a REAL captured tree still errors) while letting a minimal synthetic fixture opt out. The alternative — scoping the two new rows' `scenarios` to exclude `'fresh'` — was rejected because both files genuinely exist in the real `'fresh'` scenario's captured tree (confirmed: 84-file `fresh/meta.json` includes both paths), so excluding `'fresh'` would silently break `claude-adapter-init-parity`'s `'fresh'` sub-case the moment the Developer's fix lands (violating M3-A50's "must hold 5/5 and 15/15" requirement for the *post-fix* world, not just today). `orchestrator_confirmed: false` — this is a behavior change to a shared test helper, not purely additive; please have TPV specifically review `test/helpers/init-fixture.ts`'s `captureOrCompare` diff.

3. **M3-A53's Case A1 fixture shape, as literally described, does not reproduce the defect.** The table entry "two YAML blocks (card-one, card-two), no markers → exit 2; stderr lists card-one only" does not reproduce when the two blocks are adjacent with only a blank line and a `## Remediation` heading between them: the second block's own `flashcards_flagged:` line matches the **unconditional** block-open check (line 118) *before* the in-block stop-check ever runs, so it `continue`s and silently re-arms the *same* (never-reset) YAML state — measured result: **both** cards are found, not just card-one. Reproducing the actual defect (card-two silently dropped) requires an **intervening plain-prose line starting with a letter** (e.g. `Notes: some prose line here.`), which is what genuinely happens in the real `STORY-058-07-dev.md` fixture (a paragraph of English prose, not just headings, sits between the two blocks). I used that verified shape for scenario 17c-1 instead of the table's literal minimal description. `orchestrator_confirmed: false` — worth a one-line correction to the M3-A53 table so a future reader doesn't try the minimal two-header shape and conclude the bug doesn't reproduce.

## flashcards_flagged

```
flashcards_flagged: [
  "2026-09-26 · #test-harness #host #danger · A scenarios:'all' SANCTIONED_BASELINE_DELTAS row breaks any synthetic captureOrCompare fixture that never modelled that rel; skip when absent from BOTH sides, error only on a one-sided asymmetry.",
  "2026-09-26 · #test-harness #recipe · Reproducing a recorded payload-tree hash needs find with ABSOLUTE paths before -print0|sort -z|xargs -0 shasum; relative . paths hash identical bytes to a DIFFERENT overall digest.",
  "2026-09-26 · #hooks #flashcard-gate #danger · pending-task-sentinel's block-open checks run unconditionally before the in-block stop check, so two adjacent 'flashcards_flagged:' headers re-arm state via continue and never break — the M3-A53 bug needs an intervening PROSE line to reproduce, not just adjacent headers."
]
```

## Re-seal (TPV R1–R7)

**Commit:** cli repo, branch `story/BUG-085`:

```
8425816 qa-red(BUG-085): re-seal R1-R7 per TPV
```

Applied `/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/75d958ba-2473-408d-b4db-e15b774ad28f/scratchpad/reseal-085.patch` verbatim via `git apply` (no edits beyond the patch). Patch sha256 `7adc1598178c7b0d412eba52ff4feca516424044ddf47ffb70f3e2e5bc5989a5` — matched. `git apply --check` was clean at `ec29f45`. `git apply --stat`: 4 files, +132/−24 — matched exactly. Files touched: `test/commands/doctor-drift-guard.node.test.ts`, `test/helpers/init-fixture.ts`, `test/hooks/pending-task-sentinel-cards.red.node.test.ts`, `test/lib/drift-check-scaffold.red.node.test.ts` — nothing else staged or committed.

Post-apply hash spot-checks (both landed verbatim as the TPV diff shows): `BUG085_SENTINEL_BASELINE = 'b1ab7702066788282302efa160c7b5075adec971ec1318112d13a4b949f9636e'` in `init-fixture.ts:463`; the `validate_state.mjs` row's `currentHash` returns the literal `'9702f9741f4d89f6c4a32aadd59a70ffb4cf6b455abd592f953d083ec3958fae'` at `init-fixture.ts:527`; the R2 guard `if (!storedEntry && !recordEntry && !fs.existsSync(treeDir)) continue;` at `init-fixture.ts:613`.

### Counts against the expected table

| File | Expected | Actual (run 1) | Actual (run 2) | Match |
|---|---|---|---|---|
| `test/lib/drift-check-scaffold.red.node.test.ts` | 2/24 | 2/24 | 2/24 | yes |
| `test/commands/doctor-drift-guard.node.test.ts` | 3/13 (pre-BUG-085 dist) | 3/13 | 3/13 | yes |
| `test/hooks/pending-task-sentinel-cards.red.node.test.ts` | 2/13 | 2/13 | 2/13 | yes |
| `test/scaffold/canonical-live-parity.red.integration.node.test.ts` | 10/11 | 10/11 | 10/11 | yes |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 0/5, every failure the sentinel row's "current hash mismatch" | 0/5, all 5 failures name `.claude/hooks/pending-task-sentinel.sh": current hash mismatch` | — (single run; compare-mode, deterministic by construction — see baseline-hash-unchanged below) | yes |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 0/15, same reason | 0/15, all 15 failures name the same "current hash mismatch" | — | yes |
| `test/commands/init-host-snapshot.red.node.test.ts` | 13/13 | 13/13 | — | yes |
| Sealed -03..-07 contract files | 19/11/10/4/18/13/17/3/6/10/6/16/4 | 19/11/10/4/18/13/17/3/6/10/6/16/4 | — | yes |

**No mismatch.** Every count reproduced exactly, on the first run, with the four re-seal-touched files independently re-run solo a second time (identical: drift-check-scaffold 2/24, doctor-drift-guard 3/13, pending-task-sentinel-cards 2/13, canonical-live-parity 10/11 both times).

`npm run typecheck` → exit 0.

Baseline hash (`find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`, absolute paths):
- Before: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files)
- After: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` (425 files) — unchanged.

### Outer status

Before:
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

After (identical — no re-seal pollution):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

cli status, before and after: `?? cleargate-0.25.0.tgz` only (pre-existing, untouched). No writing CLI smoke was run.

### flashcards_flagged

flashcards_flagged: []

Nothing new surfaced in this step beyond what the TPV report already logged — I verified the patch hash, applied it verbatim, and reproduced every expected count with zero mismatches.

STATUS=done
