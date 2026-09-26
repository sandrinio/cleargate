# BUG-098 — QA-Verify RE-RUN report (RE-INTEGRATED tree, cli main 0399beb / sprint/S-41 667e8bce)

role: qa

```
STORY: BUG-098
TYPECHECK: pass
TESTS: 616 passed, 0 failed, 0 skipped (scoped to BUG-098's own files, its named build-phase reds/e2e, the M2 pair, the STORY-058-11 shared-surface suites, and the full Rule-16 CLEARGATE_META_ROOT sweep — no full `npm test` run, per dispatch instruction and Rule 20)
SMOKE: PASS — live fresh-mktemp CLI journey on the rebuilt `dist` (init → new sprint/cr/epic/story → real git init + drift commit → sprint init --allow-drift) shows byte-identical `<instructions>` preamble (lines 1-39) and byte-identical post-fence tail (line 69 on), waiver landed strictly inside the real frontmatter span (lines 40-68); a second unterminated-`<instructions>` file (SPRINT-02_malformed.md) stayed byte-for-byte and sha256-identical (a3205d87…, 6430 bytes) through the identical drift-triggering `sprint init --allow-drift` path aimed at it
VERDICT: PASS
```

## 0. Preflight

- `<cw>` HEAD = `ff29236e685dd94bfa4b37654f733b432bcc9b9f` (matches dispatch). `<ow>` HEAD = `2e4d6fe48e944fb3312ac6f83aae087d3057a47f` (matches dispatch), `git status --porcelain` = exactly the 2 twins (`dedupe_frontmatter.mjs`, `prep_reporter_context.mjs`).
- Outer MAIN checkout (`/Users/ssuladze/Documents/Dev/ClearGate`) `git status --short` before any work: only the 4 ledger files (`.session-totals.json`, `events.jsonl`, `state.json`, `token-ledger.jsonl`). Unchanged after all work below.
- `<cw>/dist/cli.js` mtime (23:30:29) predated the `ff29236` commit time (23:38:17), so per dispatch permission I rebuilt inside `<cw>`: `npm run prebuild && npm run build`, exit 0 both, writes confined to gitignored `templates/**` and `dist/`. Used this rebuilt dist for the smoke test.

## 1. Diff shape (re-verified against `0399beb..ff29236`)

- `git -C <cw> diff 0399beb ff29236 --stat` → **26 files, 2018(+)/118(-)** — file-set identical (`diff` of sorted name-lists) to the prior QA baseline `984e8d5..9b2abf0`. Same 26 paths.
- `git -C <cw> diff 9b2abf0 ff29236 -- <25 non-fixture files>` → **empty**. All 25 TPV-allow-listed src/scaffold/test files are byte-identical to the previously-approved `9b2abf0`.
- `test/helpers/init-fixture.ts` resolution: `git -C <cw> diff 0399beb ff29236 -- test/helpers/init-fixture.ts` is a **pure insertion**, 35 lines appended immediately after main's last delta row (STORY-058-11's `pre-commit-surface-gate.sh` row), before the closing `]);`. Line-by-line compare of the `+` content against BUG-098's original addition (`984e8d5..9b2abf0`) confirms the inserted lines (comment header + both `SanctionedDelta` objects) are byte-identical; only the insertion offset (line 659→line 833) and the differing following-context comment differ, as expected from main having grown in between. No BUG-098 row was edited, reordered, or duplicated.
- 13 sealed test files (12 default `.red`/plain files + the e2e integration file) vs re-seal `ca18c73`: `git -C <cw> diff ca18c73 ff29236 -- <13 files>` → **empty**. Byte-identical.

## 2. Typecheck + make-green (solo, re-run independently)

`npm run typecheck` in `<cw>` → clean, exit 0.

All solo `npm run test:file` runs, counted via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`:

| Set | Files / counts | Total |
|---|---|---|
| BUG-098 12 default files | frontmatter-yaml-splice.red 4, sprint-frontmatter-fence.red 5, sprint-archive 18, lifecycle-reconcile-fence.red 2, gate-unit 30, doctor-fence.red 3, slug 14, frontmatter-merge 8, contradict 28, audit-status 14, intake 9, scripts-fence-bug098.red 4 | **139/139/0** |
| e2e | sprint-allow-drift-fresh-install.red.integration | **1/1/0** |
| M2 pair (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare-only, never written) | claude-adapter-init-parity 5, init-host-parity 15 | **20/20/0** (5+15) |
| STORY-058-11 shared-surface | hooks-claude-parity.red.integration 19, portable-skills.red 6, codex-hooks-harness.red (default tier, no env override) 90, lifecycle-codex.red 6 | **121/121/0** |
| Rule-16 sweep | 23 files (24 `CLEARGATE_META_ROOT` hits minus the `scaffold-roots.ts` helper), default META_ROOT (nested-worktree default = `<ow>`) | **335/335/0** |
| **Grand total** | | **616/616/0** |

Every number matches the Developer's re-integrate report and my own prior QA baseline exactly. 0 fail, 0 skipped everywhere.

**Rule-16 file-by-file** (all pass, 0 fail): new-command 57, no-exec-mode-vocab 4, claude-md-block-leads-relocation.red 4, clean-room-verification-doc.red 9, codex-enforcement-delta.red 15, contract-first-dag-text.red 10, test-layers-declared-doctrine.red 11, frontmatter-authoring.red.integration 9, spidr-coverage.red.integration 1, hook-signal.red.integration 3, hook-signal.red 14, pre-tool-use-task 13, token-ledger-attribution 9, token-ledger-regression 14, readiness-predicates-spidr-coverage.red 32, readiness-predicates-test-layers-declared.red 17, enforcement-doc-coherence 26, file-surface-gate-e2e 21, pre-commit-downstream-safe 12, ratchet-retired 8, close-sprint-assume-ack-guard 20, scaffold-relocation.red 15, bucket-registry-parity.red 11. Sum = 335, matching the Developer's claimed 335/335 and reconciliation (310 prior + 15 codex-enforcement-delta + 10 contract-first-dag-text).

*Process note:* my first attempt at the Rule-16 sweep used a single long-running `while read` shell loop that the harness silently moved to background and which never produced a single per-file log after 15+ minutes on this multi-lane machine (concurrent STORY-058-12 test activity observed via `ps aux` competing for the same box) — I abandoned it (never counted its output) and re-ran all 23 files as independent parallel foreground `npm run test:file` invocations instead, which completed cleanly. No result above is drawn from the abandoned run.

## 3. Twins

- `cmp <ow>/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs` vs `<cw>/scaffold/core/.cleargate/scripts/…` → **both identical**.
- Modes (`stat -f %Lp`): `prep_reporter_context.mjs` = **644** both sides; `dedupe_frontmatter.mjs` = **755** both sides. Matches the corrected baseline from my prior QA report (not the integrate report's stale "both 755" claim).
- Link witnesses (from `<ow>`): `node .cleargate/scripts/prep_reporter_context.mjs` → `Usage: node prep_reporter_context.mjs <sprint-id>`, exit 2, no SyntaxError. `node .cleargate/scripts/dedupe_frontmatter.mjs --dry-run <fresh empty dir>` → `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`, exit 0 (scratch dir never actually materialized — dedupe scans and finds nothing without creating the target; nothing to clean up).

## 4. Behavioural smoke (goal witness, re-run on the rebuilt `dist`)

Outer MAIN checkout `git status --short` confirmed clean (only the 4 ledger files) both before and after this section.

Fresh `mktemp -d` → `/private/tmp/cg-s41-qa098b-smoke-ZKLWfF`. Every writing step below is its own `(cd /private/tmp/cg-s41-qa098b-smoke-ZKLWfF && node <cw>/dist/cli.js …)` call, never backgrounded, never pointed at a real repo via `--cwd`.

1. `init --yes` — clean install, exit 0.
2. `new sprint probe` → `SPRINT-01_probe.md`, `<instructions>`-led (verified: opening `<instructions>` on line 1, closing fence + `---` frontmatter opener on line 39, frontmatter close on line 69).
3. `new cr probe-cr` → `CR-001_probe_cr.md`, `status: "Draft | In Review | Approved | Completed"` unfilled placeholder (the drift trigger).
4. `new epic probe-epic` + `new story probe-story --epic EPIC-001` — both created cleanly.
5. Real git history (not a stub): `git init`, `git add -A`, `git commit -m "chore: scaffold probe items"`, then `git commit --allow-empty -m "feat(CR-001): probe drift commit"` — a genuine lifecycle-drift trigger via the real commit-message verb/status mapping (`feat` expects `Completed`; CR-001's actual status is the placeholder).
6. `sprint init SPRINT-01 --stories STORY-001-01 --allow-drift --no-dashboard`:
   - stderr: `DRIFT: CR-001 status=… expected Completed` → `lifecycle drift waived via --allow-drift flag`.
   - Exits 1 later on an unrelated `MISSING (1): STORY-NNN-NN` check — irrelevant to the frontmatter question; the waiver write happens earlier in the pipeline.
   - **Before/after diff of `SPRINT-01_probe.md`:** every changed line (`sprint_id`, `context_source`, `epics`, etc.) sits strictly between line 40 and line 68 — inside the real frontmatter block. Independently confirmed: `head -39` before/after are byte-identical (the entire `<instructions>` block + opening `---` fence), and `tail -n +69` before/after are byte-identical (closing fence onward). `context_source` became `"lifecycle waiver: 2026-09-26 for CR-001"` **inside the real, located span** — no phantom `---` block was ever planted ahead of `<instructions>`. This is BUG-098's own §2 reproduction protocol, run live, and it holds on the re-integrated tree.
7. **Malformed-framing probe:** built `SPRINT-02_malformed.md` (copy of the SPRINT-01 file with `sprint_id` renamed and the `</instructions>` line deleted — unterminated preamble). Ran `sprint init SPRINT-02 --stories STORY-001-01 --allow-drift --no-dashboard` (same global CR-001 drift is picked up, since lifecycle reconciliation scans git log globally). Console: `decomposition gate: sprint plan could not be read/parsed (frontmatter-parse-failed) — waived via --allow-drift.` **File byte count (6430) and sha256 (`a3205d87fe87ff0ce89945781194f6c09766147dc5be9abe606fb9919282cb41`) are identical before and after** — confirmed by an independent second read after the run. The `framingError` branch of `rewriteFrontmatter` correctly refused to write despite the same "waived" log line printing. This is the FW-A17-item-2 fix confirmed live, on the re-integrated tree, outside the test harness.

Smoke dir deleted after by exact path (`rm -rf /private/tmp/cg-s41-qa098b-smoke-ZKLWfF`), confirmed gone. No write to `/private/tmp/cg-s41-m2-init-baseline` (verified: `find <path> -newer <marker>` returns nothing — untouched) or to `cg-s41-fresh-journey` / `cg-s41-int11-evidence` / `cg-s41-fix11-evidence` (never referenced, only listed to confirm non-interference).

## 5. Acceptance mapping (unchanged from re-integrated code — src is byte-identical, so re-affirmed rather than re-derived from scratch)

| Gherkin scenario / @rule | Evidence |
|---|---|
| `--allow-drift` never plants a phantom block (@rules) | `sprint-frontmatter-fence.red.node.test.ts` (5/5 green) + my own live smoke §4 step 6 |
| Close reconciler sets a field on an instructions-led story (@interfaces) | `lifecycle-reconcile-fence.red.node.test.ts` (2/2 green) |
| `parent-approved` reads an instructions-led approved parent (@interfaces) | `gate-unit.node.test.ts` (30/30 green) |
| Remaining readers agree with the shared locator (@data @paths) | all 12 default files — green |
| A malformed frontmatter behind `<instructions>` is never rewritten (@rules, FW-A14) | `sprint-frontmatter-fence.red` malformed-framing half + my own live smoke §4 step 7 |

**ACCEPTANCE_COVERAGE: 5 of 5 scenarios have matching, passing tests. MISSING: none.**

**Deferred-acceptance check (CR-082):** BUG-098's frontmatter carries no `deferred_verification:` entry (unchanged since the code and item file did not move). PASS-PENDING-SMOKE does not apply — full PASS.

## 6. Regressions

None found. All scoped sets above are 0 fail. The re-integration is a mechanical merge with a single conflicting file resolved as a pure insertion — no BUG-098 logic changed, and nothing outside BUG-098's own 26-file diff moved versus the previously-approved `9b2abf0`.

## Script Incidents

None. Every invocation was `npm run test:file` / `npm run typecheck` / `npm run prebuild` / `npm run build` / `node <cw>/dist/cli.js …` / `cmp` / `stat` / `git diff` / `git status` / `find` / `shasum`, never a `.cleargate/scripts/*` invocation requiring the `run_script.sh` wrapper (the two link-witness smokes are direct `node <script>` calls per dispatch).

```yaml
flashcards_flagged:
  - "2026-09-27 · #qa #test-harness #concurrency · On a multi-lane box, a single backgrounded while-loop over 23 test files can silently starve; run independent foreground calls in parallel instead."
```
