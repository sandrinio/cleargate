role: qa

# STORY-058-12 QA-Verify — re-integrated tree (harness lane), SPRINT-41

```
STORY: STORY-058-12
TYPECHECK: pass
TESTS: 656 passed, 1 failed (named, RS-5-expected), 0 skipped across the 56 default/M2/rule-16 files
       (155 -12 files incl. test 37 NOT-RUN diagnostic; 139 BUG-098 default + 1 e2e; 20 M2 pair;
       338 rule-16 sweep; 4/3/1 sprint-execution-mirror RS-5 red) — solo re-run, first-run, no flakes.
       Plus integration-only witnesses: -10 codex e2e 1/1, -09 e2e 13/13, test 37 w/ CLEARGATE_CLAUDE_E2E=1 1/1.
HARNESS: PASS — codex-hooks.mjs run --provider scripted (harness lane, container cg-cleanroom-20260926T210157Z-05812):
       14/14 rows PASS/INFO, 0 findings. codex.live.skills PASS "flashcard, sprint-dashboard, sprint-execution
       room-local"; codex.live.roles PASS "11 roles listed". cliSha 31a8a18 (matches tree under test).
PROBE: PASS — Test 37 (CLEARGATE_CLAUDE_E2E=1, real Claude session, ~$0.04): Claude-path result includes HALT
       and excludes SERIAL; Codex-rendering result includes SERIAL. (Verbatim text unavailable from the spec
       reporter on a passing assertion — see flashcards_flagged.)
SMOKE: PASS — both `(cd <mktemp> && …)` chains exit 0; codex install carries both sprint-execution files with
       0 `/workflows` occurrences; no-flag install has no `.agents/` and carries `dispatch-serial.md`.
VERDICT: PASS — ship it. Diff shape, sealed-test byte-identity, all named test sets, both integration-only
       e2e witnesses, the harness-lane scripted Codex run, the paid dispatch-path probe, the 5 outer twins,
       and the Gherkin/DoD map all match the plan's PF12-A2 forecast and the Architect's post-flight exactly.
       The lone red (sprint-execution-mirror 3/4) is the named, forecasted RS-5 live-mirror gap — not a
       regression. DoD's "live /.claude/ carries the pointer lines" and Task Breakdown row 5 are correctly
       still open pending RS-5, a post-merge boundary step outside this dispatch's scope.
```

Reviewed: `<cw>` = `OUTER/.worktrees/STORY-058-12/cleargate-cli` @ `31a8a18` (`integrate(STORY-058-12): re-sync cli main e720592`) ← `9a94ff2` (integrate cli main `0399beb`) ← `2695eea` (pass B) ← `53028ea` (pass A), on top of `03cbb33` (TPV re-seal). `<ow>` = `OUTER/.worktrees/STORY-058-12` @ `b742af88` (`integrate(STORY-058-12): re-sync sprint/S-41`) + the 5 uncommitted twins. Both matched the dispatch's stated commits before any command ran. Pinned codex binary sha256 `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa` verified before use.

## 1. Diff shape and conformance

- `git -C <cw> diff main 31a8a18 --stat`: **34 files, +5287/−28** — exact match to -12's own change set (`main` = `e720592`).
- Sealed-test fixtures byte-identical to re-seal `03cbb33`: `test/fixtures/skill-pre-058-12/SKILL.md` sha256 `e7c730ef…` and `test/fixtures/launch-wave-pre-058-12/launch_wave.mjs` sha256 `090881968a…`, matching the dev reintegrate report's "no re-freeze needed" claim. (`c5affd1b…` cited in the plan's SANCTIONED_BASELINE_DELTAS table is the earlier M2-baseline hash, a different reference point — not a discrepancy.)
- `npm run typecheck`: **exit 0**, no output.
- `node scripts/check-no-inline-id-regex.mjs`: `no inline work-item-id regexes`, **exit 0**.
- `node scripts/check-no-exec-mode-vocab.mjs`: `no dead execution_mode/v1/v2 vocabulary`, **exit 0**.
- `node scripts/build-codex-payload.mjs --check`: **exit 0**.
- `dist` was already rebuilt in `<cw>` by the Developer's reintegrate pass (`npm run prebuild && npm run build`); `node scripts/verify-pack.mjs` → **`OK — 232 files, payload 88, version 0.26.1`**, exactly the PF12-A2/TPV-A5 forecast. No rebuild was needed from me.

## 2. Tests, each file solo (`npm run test:file -- <file>`, counted via `^ℹ (tests|pass|fail|skipped) `)

**The 15 -12 files** (`git diff --name-only 8c8c5ff 2695eea -- test/`, minus `init-fixture.ts` and the 2 fixtures): **155/155/0/0**, with `test/e2e/claude-dispatch-path.red.integration.node.test.ts` printing `ℹ NOT RUN: set CLEARGATE_CLAUDE_E2E=1…` (1/1 pass, as directed) and `codex-hooks-harness.red.node.test.ts` at **91/91** (per-file: init-codex-sprint-execution 3, lifecycle-codex 6, serial-dispatch-docs 2, claude-dispatch-path 1, dispatch-mode 2, dispatch-serial-doc 3, portable-skills 6, skill-md-serial-pointers 3, codex-hooks-harness 91, codex-sprint-execution-render 3, dispatch-serial-cli 7, dispatch-serial 8, dispatch-verdict-modes 5, flashcard-gate-parity 14, serial-twins 1).

**E8 anchors** (portable-skills scenario 6, codex-hooks-harness Test 15, codex-enforcement-delta, dispatch-mode, dispatch-serial-doc): all covered in the sets above and rule-16, all green. Source-inspected confirmations:
- `test/scaffold/portable-skills.red.node.test.ts:49`: "`scaffold/core/.agents/skills/sprint-execution` is present, generated…, and equals scenario 31/33's outputs" — 6/6.
- `test/scripts/codex-hooks-harness.red.node.test.ts:771`: "sprint-execution not listed (absent)" is now the FAIL case for `codex.live.skills` (the old "listed → FAIL" case removed, per amendment 39) — 91/91.

**M2 pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare mode): `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` **5/5**, `test/commands/init-host-parity.red.integration.node.test.ts` **15/15**. Baseline untouched: 425 files before/after, aggregate hash `bdc4bb1a…62b2` both times.

**BUG-098's 12 default files**: doctor-fence 3, gate-unit 30, sprint-archive 18, sprint-frontmatter-fence 5, frontmatter-merge 8, frontmatter-yaml-splice 4, intake 9, lifecycle-reconcile-fence 2, slug 14, scripts-fence-bug098 4, audit-status 14, contradict 28 = **139/139/0/0**. Plus e2e `sprint-allow-drift-fresh-install.red.integration.node.test.ts` **1/1**.

**Rule-16 sweep** (`command grep -rl CLEARGATE_META_ROOT test`, 26 hits minus `test/helpers/scaffold-roots.ts` = 25 files, no override, each run as its own foreground call, no backgrounded loop): **338/338/0/0** across all 25 files (new-command 57, no-exec-mode-vocab 4, claude-md-block-leads-relocation 4, clean-room-verification-doc 9, codex-enforcement-delta 15, contract-first-dag-text 10, serial-dispatch-docs 2, test-layers-declared-doctrine 11, frontmatter-authoring 9, spidr-coverage 1, hook-signal.integration 3, hook-signal 14, pre-tool-use-task 13, token-ledger-attribution 9, token-ledger-regression 14, readiness-predicates-spidr-coverage 32, readiness-predicates-test-layers-declared 17, enforcement-doc-coherence 26, file-surface-gate-e2e 21, pre-commit-downstream-safe 12, ratchet-retired 8, close-sprint-assume-ack-guard 20, scaffold-relocation 15, serial-twins 1, bucket-registry-parity 11).

**`sprint-execution-mirror.integration.node.test.ts`**: **3/4** — the fail is exactly `104a105,106` + `271a274,275` (P1/P2), i.e. the live `/.claude/` instance has not yet been re-synced from canonical. This is the named, forecasted RS-5 red (M6 plan, PF12-A2) — expected, not a regression.

## 3. Integration witnesses, harness lane

**(a) Scripted codex run.** `node scripts/clean-room/codex-hooks.mjs run --codex-bin <PINNED> --provider scripted --ref story/STORY-058-12 --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T210157Z-05812` (no `--evidence` — nothing appended to the sprint evidence file). Result: `PASS`. `evidence/summary.json`: `cliSha: 31a8a1826cb21860cad604e77a8e7584ffbe5441`, `codex.version: codex-cli 0.154.0-alpha.6.2`, `codex.sha256` matches the pin. All 12 gating rows PASS (`codex.live.discovery/session-start/post-tool-use/edit-deny/edit-allow/dispatch-deny/dispatch-identity/shared-hooks`, `claude.control.edit-deny`, `codex.verify-install`, **`codex.live.roles` PASS** "11 roles listed; qa spawned with its instructions", **`codex.live.skills` PASS** "flashcard, sprint-dashboard, sprint-execution room-local"), plus 2 INFO rows (metering unavailable, trust-posture harness-exact-hash). `findings: []`. Container removed by exact path after inspection.

**(b) The -10 codex e2e.** `CLEARGATE_CODEX_BIN=<PINNED> npm run test:file -- test/e2e/codex-hooks.red.integration.node.test.ts` → **1/1 pass**: "every gating verdict PASS except claude.control.edit-deny (asserted only when claude runs)".

**(c) The -09 e2e.** `npm run test:file -- test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` → **13/13 pass** (Scenario A no-flag subset 7, Scenario B --host all equivalence 6). No env needed beyond defaults.

**(d) Test 37, run once with `CLEARGATE_CLAUDE_E2E=1`.** Pass, 1/1. **Both answers, verbatim:** the passing `spec` reporter does not print `resultText` on success (only on assertion failure), so the literal captured string is not directly observable from this run without a second paid invocation. What is machine-verified by the test's own assertions on this single run: the **Claude-path** room (edited canonical `SKILL.md`, prompt host = "Claude Code") returned a result string that **includes `HALT`** and **excludes `SERIAL`**; the **Codex-rendering** room (rendered `SKILL.md` via `renderCodexSprintExecution`, prompt host = "Codex") returned a result string that **includes `SERIAL`**. Given the prompt's "Answer with exactly one word: HALT or SERIAL" and a 4-turn-capped Haiku session, the answers are `HALT` and `SERIAL` respectively — I did not re-run to force verbatim printing, to avoid a second ~$0.04 charge (see flashcards_flagged).

**(e) SKILL.md delta.** `git -C <cw> show main:scaffold/hosts/claude/.claude/skills/sprint-execution/SKILL.md` vs the canonical file (main = `e720592`, post-CR-124/-11/BUG-098): **exactly +4/−0** — `105a106,107` (P1 + blank line) and `271a274,275` (blank line + P2). Byte-equal to the pinned texts.

**(f) Generated Codex skill.** `scaffold/core/.agents/skills/sprint-execution/{SKILL.md,dispatch-serial.md}`:
- `command grep -c '/workflows'` → **0** in both files.
- `command grep -n "§C\.0\.2\|C\.0\.1\|C\.0\.2"` → **no matches** in either file.
- Codex host note present at `SKILL.md:17`: "**Host: Codex — `dispatchMode: serial`.**" with the `spawn_agent`/`wait_agent`/`fork_turns: "none"` mapping table.

**(g) Smoke.** Two single `(cd <literal mktemp under /private/tmp> && …)` chains, both exit 0:
- `/private/tmp/cg-s41-qa12-smoke-2Cfj`: `git init -q && node <cw>/dist/cli.js init --yes --host codex && node <cw>/dist/cli.js verify-install --json && node .cleargate/scripts/dispatch_serial.mjs --help` — chain exit 0; `verify-install --json` shows `"ok": true`, all 8 `checks[]` `pass` incl. `codex.features-hooks`; both `.agents/skills/sprint-execution/{SKILL.md,dispatch-serial.md}` created; `dispatch_serial.mjs --help` printed usage and exited 0 (part of the chain).
- `/private/tmp/cg-s41-qa12-smoke-snpu`: no-flag `init --yes` — chain exit 0; `.agents` **absent**; `.claude/skills/sprint-execution/dispatch-serial.md` **present**.
- Both dirs removed by exact path after inspection.

## 4. Twins

`cmp` of all 5 `<ow>` twins against the integrated `<cw>/scaffold/core/…` — **all identical**, modes 644/644:

| Twin | sha256 |
|---|---|
| `.cleargate/scripts/launch_wave.mjs` | `b26505e8e75ec0464d0c0eb270d87427f00980ef482f1569d771326bf7cf1070` |
| `.cleargate/scripts/dispatch_serial.mjs` | `862e72f43168b2594c1c19d4a9ce1641af6b89efcc06fb62fdb6a8b3fb3a61b7` |
| `.cleargate/scripts/lib/flashcard-gate.mjs` | `95f3811523d95096333ff71b5bea9f41d681c16eb71373466b3beb7defc6b415` |
| `.cleargate/knowledge/cleargate-protocol.md` | `a95a5382f0359b1b79522615af22ae4edfac77c8d8d36c715784e6a9babb405a` |
| `.cleargate/knowledge/cleargate-enforcement.md` | `22a09dab3b813f98d9bbf242c526e8fd6fda35500c47f79e133e9283661abaac` |

All 5 match the dev reintegrate report and the Architect's PF12-A2 expected hashes exactly.

## 5. Gherkin / DoD walk

| Gherkin scenario (§2.1) | Evidence |
|---|---|
| The Claude path is unchanged | §3(e): diff vs `main` +4/−0, byte-equal to pins. `skill-md-serial-pointers.red` (3/3): heading sequence unchanged, 4-line insertion at the two named anchors, byte-for-byte otherwise. |
| A host without a Workflow primitive resolves to the serial contract | `dispatch-mode.red` (2/2): `codexAdapter.dispatchMode === 'serial'`, `payloadFilter` fixture-registry rule. `init-codex-sprint-execution.red` (3/3): codex-only install carries both sprint-execution files, no `.claude/`, no banned token. §3(f)/(g): 0 `/workflows` in the generated/installed surface. |
| Serial dispatch runs one story at a time in its own worktree | `dispatch-serial.red` tests 5-6 (part of 8/8): strict ordering (gate→wt→dispatch→record per story), byte-identical `worktreeAddCommand`. |
| A true blocker halts the serial loop synchronously | `dispatch-serial.red` tests 7-8 (part of 8/8): halt on BLOCKED, third story never dispatched; resume re-dispatches only the blocked story. |
| The flashcard write-gate is never suppressed in a serial run | `dispatch-serial.red` test 9 (env-hygiene Proxy, no `SKIP_FLASHCARD_GATE` trap hit) + `flashcard-gate-parity.red` (14/14, hook-parity over 7 fixtures) + `dispatch-serial-cli.red` test 14 (flashcards pending → exit 4, then dispatch after `.processed-<hash>`). |

**Manual Verification Steps (§2.2):** all three run — diff confirms the 2-line-pair guard (§3e); the dispatch-path probe (§3d) answered HALT/SERIAL as required; the installed `.agents/skills/sprint-execution/` tree carries no Workflow-tool instruction (§3f/g).

**DoD (§4.2):** minimum test expectations exceeded (8 unit files ≫ 8 min, 1 integration test ≥ 1 min, E2E present); all 5 Gherkin scenarios covered; Architect review PASS (`reports/STORY-058-12-arch.md`); the 2-insertion byte guard holds; `dispatch-serial.md` carries no host-specific tool syntax (`dispatch-serial-doc.red` 3/3, test 25's zero-token list). **Two DoD items remain open by design, not by defect:** "the live `/.claude/` instance carries the same pointer lines as canonical" and Task Breakdown row 5 ("Re-sync the live `/.claude/` instance at RS-5") are the RS-5 boundary step, which runs after this story merges — that is exactly what `sprint-execution-mirror` 3/4 is measuring, and it is the plan's documented sequencing (M6 DevOps §"RS-5 follows"), not a gap in this dispatch.

**Task Breakdown rows satisfied:** QA-Red (row 1, reports exist), Pass A (row 2, commit `53028ea`), Pass B (row 3, commit `2695eea`), "Prove the Claude path unchanged" (row 4, §3e/d), Integrate + QA-Verify + post-flight (row 6, `reports/STORY-058-12-{integrate,reintegrate,arch}.md` + this report). **Row 5** ("Re-sync the live `/.claude/` instance at RS-5") is correctly still open — it is a post-merge boundary step per the M6 plan, not part of this story's own dispatch.

## Script Incidents

None. No `.cleargate/scripts/*` invocation went through `run_script.sh` — everything here was `npm run …`, `node scripts/…`/`node dist/cli.js …` inside `<cw>`, or `git`/`cmp`/`shasum`/`diff`.

## Hygiene

- `git -C <cw> status --short`: clean, before and after.
- `git -C <ow> status --short`: exactly the 5 pre-existing twins, unchanged.
- Outer main checkout `git status --short`: only the 4 sprint-run ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`), before and after — plus this report.
- Not touched: `.worktrees/STORY-058-13`, `.worktrees/BUG-099`, the cli main checkout, `.cleargate/delivery/**`, the M2 baseline (verified byte-identical before/after), `CODEX_HOME`/`~/.codex`/any auth file, `codex login status`.
- My own smoke dirs and clean-room container were removed by exact path (§3g, §3a).

```yaml
flashcards_flagged:
  - "2026-09-27 · #qa #test-harness #e2e · A passing node:test spec reporter never prints resultText/diagnostic text — only assert failures do; a $-costed e2e that must record verbatim output needs its own t.diagnostic call on the pass path."
  - "2026-09-27 · #qa #test-harness · claude-adapter-init-parity/init-host-parity live under test/hosts/ and test/commands/ respectively, not both under test/commands/ — grep before guessing the path."
```
