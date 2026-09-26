# BUG-098 — QA-Verify report (INTEGRATED tree)

role: qa

```
STORY: BUG-098
TYPECHECK: pass
TESTS: 517 passed, 0 failed, 0 skipped (scoped to BUG-098's own files, its named build-phase reds, and the Rule-16 CLEARGATE_META_ROOT sweep — no full `npm test` run, per dispatch instruction and Rule 20)
SMOKE: PASS — live fresh-mktemp CLI journey (init → new sprint/cr/epic/story → real git drift commit → sprint init --allow-drift) shows byte-identical preamble, no phantom block, waiver landed inside the real span; a second unterminated-`<instructions>` file was untouched (byte-identical, same sha256) after the same drift-waiver path
VERDICT: PASS
```

## 1. Diff shape (984e8d5..9b2abf0)

`git -C <cw> diff 984e8d5 9b2abf0 --stat` → **26 files, 2018(+)/118(-)**: exactly the 12-file TPV allow-list (`frontmatter-locator.ts`, `sprint.ts`, `lifecycle-reconcile.ts`, `readiness-predicates.ts`, `doctor.ts`, `frontmatter-merge.ts`, `slug.ts`, `contradict.ts`, `wiki-audit-status.ts`, `intake.ts`, `prep_reporter_context.mjs`, `dedupe_frontmatter.mjs`) + the 13 test files the original QA-Red commit created/amended (the dispatch's "12 sealed test files" underc­ounts by one — `test/lib/frontmatter-yaml-splice.red.node.test.ts` is also QA-Red's own file; it just wasn't touched by the re-seal patch, so it's easy to drop from a "12" count. Not a defect: I verified nothing outside this 26-file set changed.) + `test/helpers/init-fixture.ts` (the 2 BUG-098 delta rows). 12 + 13 + 1 = 26, matches the stat exactly. Nothing else.

`git -C <cw> diff ca18c73 9b2abf0 -- <13 sealed test files>` → **empty**. The sealed tests are byte-identical from the QA-Red re-seal commit through the integrated tree; the cli-main merge (984e8d5, BUG-090+BUG-097) touched none of them.

## 2. Typecheck + make-green (solo)

`npm run typecheck` in `<cw>` → clean, exit 0.

Solo `npm run test:file`, counted via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`:

| File | tests/pass/fail |
|---|---|
| frontmatter-yaml-splice.red | 4/4/0 |
| sprint-frontmatter-fence.red | 5/5/0 |
| sprint-archive | 18/18/0 |
| lifecycle-reconcile-fence.red | 2/2/0 |
| gate-unit | 30/30/0 |
| doctor-fence.red | 3/3/0 |
| slug | 14/14/0 |
| frontmatter-merge | 8/8/0 |
| contradict | 28/28/0 |
| audit-status | 14/14/0 |
| intake | 9/9/0 |
| scripts-fence-bug098.red | 4/4/0 |
| **12-file total** | **139/139/0** |
| e2e sprint-allow-drift-fresh-install.red.integration | 1/1/0 |
| claude-adapter-init-parity (M2, `CLEARGATE_INIT_BASELINE`) | 5/5/0 |
| init-host-parity (M2, same env) | 15/15/0 |

All match the integrate report's claimed 139/139 + 1/1 + 5/5+15/15 exactly.

## 3. Rule 16 — 21 CLEARGATE_META_ROOT files

`command grep -rl CLEARGATE_META_ROOT test` → 22 paths; minus `test/helpers/scaffold-roots.ts` (a helper, not a test) = 21. Ran every one solo, default META_ROOT (no override — this is the nested-worktree default, `<cw>/.. = <ow>`, per rule 19/21). **310/310 pass, 0 fail.** `<ow>` `git status --porcelain` unchanged before/after (still exactly the 2 twins). Matches the integrate report and the Dev report's identical count.

(First attempt at this sweep used an unquoted zsh `for f in $FILES` loop and produced empty parses — zsh does not word-split an unquoted multi-line var the way bash does [FLASHCARD "zsh never word-splits..."]. Re-ran via an explicit `bash -c` script; no test was actually double-counted or skipped, just a shell-quoting false start on my side, corrected before recording numbers.)

## 4. Twins

- `cmp <ow>/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs` vs `<cw>/scaffold/core/.cleargate/scripts/…` → **both identical**.
- `stat -f %Lp`: `dedupe_frontmatter.mjs` = **755** on both sides (required). `prep_reporter_context.mjs` = **644** on both sides.
  - **Correction to the integrate report:** its §4 note claims "both scripts are mode 755 in this wave... both sides match." Measured mode for `prep_reporter_context.mjs` is **644**, not 755, on both the live and canonical side. This matches the plan's own measured M2 baseline (`plans/M5-fixwave.md` line 807: "`prep_reporter_context.mjs` … mode 644"). The dispatch's own requirement ("dedupe mode = 755 on both sides") is satisfied regardless; the integrate report's parenthetical about `prep_reporter_context.mjs`'s mode is simply wrong, with no behavioral consequence — not a regression, just a report inaccuracy worth flagging so it doesn't propagate.
- `(cd <ow> && node .cleargate/scripts/prep_reporter_context.mjs; echo exit=$?)` → `Usage: node prep_reporter_context.mjs <sprint-id>`, `exit=2`. No SyntaxError.
- `(cd <ow> && node .cleargate/scripts/dedupe_frontmatter.mjs --dry-run <fresh mktemp dir>)` → `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.`, exit 0.

## 5. Behavioural smoke (goal witness)

Fresh `mktemp -d` (`/private/tmp/cg-s41-qa098-smoke-*`, deleted after), one `(cd <dir> && …)` call per step, never backgrounded:

1. `node <cw>/dist/cli.js init --yes` — clean install.
2. `node <cw>/dist/cli.js new sprint probe` → `SPRINT-01_probe.md` (`<instructions>`-led).
3. `node <cw>/dist/cli.js new cr probe-cr` → `CR-001_probe_cr.md` (`<instructions>`-led, `status: "Draft | In Review | Approved | Completed"` placeholder).
4. `node <cw>/dist/cli.js new epic probe-epic` + `new story probe-story --epic EPIC-001` (both `<instructions>`-led).
5. Real `git commit` (not a stub): `chore: scaffold …`, then `feat(CR-001): probe drift commit` — a genuine lifecycle-drift trigger via `parseCommitMessage`/`VERB_STATUS_MAP` (`feat` expects `Completed`; CR-001's real status is the unfilled placeholder), not a `gitRunner` mock.
6. `node <cw>/dist/cli.js sprint init SPRINT-01 --stories STORY-001-01 --allow-drift --no-dashboard`:
   - stderr: `DRIFT: CR-001 status=Draft | In Review | Approved | Completed … expected Completed` then `lifecycle drift waived via --allow-drift flag`.
   - Command later exits 1 on an unrelated missing-stub-story check (`MISSING (1): STORY-NNN-NN`) — irrelevant to the frontmatter question; the waiver write happens earlier in the pipeline and is unconditional on that later exit.
   - **Diff of `SPRINT-01_probe.md` before/after:** the only changed lines are inside the frontmatter block (`sprint_id`, `context_source`, etc. — quote-style normalization from the `yaml.dump` round-trip, expected); **every line before the frontmatter (`<instructions>…</instructions>`, 39 lines) and every line after the closing fence are byte-for-byte identical**. `context_source` became `"lifecycle waiver: 2026-09-26 for CR-001"` **inside the real, located block** — no `---` line was ever planted before `<instructions>`. This is BUG-098's own §2 reproduction protocol, run for real, and it is fixed.
7. **Malformed-framing probe:** hand-built `SPRINT-02_malformed.md` — same fixture as (2) with `</instructions>` deleted (unterminated preamble; `locateFrontmatter` throws `unterminated <instructions> block`). Ran the identical drift-triggering `sprint init SPRINT-02 --allow-drift` (same CR-001 drift is picked up, since `reconcileLifecycle` scans git log globally, not per-sprint). Console: `decomposition gate: sprint plan could not be read/parsed (frontmatter-parse-failed) — waived via --allow-drift.` **File byte count and sha256 are identical before and after** (6095 bytes, `6f8840c6…3ba`) — the `framingError` branch of `rewriteFrontmatter` fired and no write occurred, despite the same "waived via --allow-drift" log line printing. This is the FW-A17-item-2 fix (the plan-level defect the TPV caught) confirmed live, outside the test harness.

Smoke dir deleted after (`rm -rf`). No write to `/private/tmp/cg-s41-m2-init-baseline` (read-only, env var only) or `/private/tmp/cg-s41-fresh-journey` (never referenced).

## 6. Acceptance mapping

| Gherkin scenario / @rule | Evidence |
|---|---|
| `--allow-drift never plants a phantom block` (@rules) | S1/S2 (`sprint-frontmatter-fence.red.node.test.ts`, now green) + my own live smoke §5 step 6 |
| Close reconciler sets a field on an instructions-led story (@interfaces) | L1/L2 (`lifecycle-reconcile-fence.red.node.test.ts`, 2/2 green) |
| `parent-approved` reads an instructions-led approved parent (@interfaces) | R1/R2 in `gate-unit.node.test.ts` (30/30 green, includes BUG-097's +3) |
| Remaining readers agree with the shared locator (@data @paths, Scenario Outline) | S3/S4/S6/D4/D5/SL1/SL2/FM1/C1/W1/I1/P1/DD1 across the 12 default files — all green |
| A malformed frontmatter behind `<instructions>` is never rewritten (@rules, FW-A14 amendment) | S5 + S3's malformed-framing half (re-seal) — green — + my own live smoke §5 step 7 |

**ACCEPTANCE_COVERAGE: 5 of 5 scenarios have matching, passing tests. MISSING: none.**

**Task Breakdown (7 rows):** all satisfied per the Dev report (K1–K6 self-checks, independently re-verified in §7 below) and the integrate report's byte-copy of the two script twins. The rows currently read unchecked in the outer `pending-sync` copy I read at preflight — per the dispatch note, the orchestrator ticks these on `sprint/S-41` after QA-Verify approval and had reverted the Developer's/integrate-dispatch's premature ticks in `<ow>` for exactly that reason. Not a finding.

**Deferred-acceptance check (CR-082):** BUG-098's frontmatter carries no `deferred_verification:` entry. The plan's "E2E / acceptance tests: 1 — the clean-room sprint-init row at RS-4" is a **sprint-goal-level** witness (Goal Acceptance Check condition 2/3, tracked under STORY-058-09's re-witness at RS-4), not a scenario belonging to BUG-098's own acceptance criteria — BUG-098's own single integration-tier test (the e2e fresh-install) is in scope and green (§2). PASS-PENDING-SMOKE does not apply; this is a full PASS.

## 7. Post-flight K-gates (independently re-run, not just trusted from the Dev/TPV reports)

- **K1.** All of `sprint.ts`, `lifecycle-reconcile.ts`, `readiness-predicates.ts`, `doctor.ts`, `slug.ts`, `contradict.ts`, `wiki-audit-status.ts`, `intake.ts` import from `frontmatter-locator.{js,ts}`. `frontmatter-merge.ts` has no direct import (routes through `parseFrontmatter`, which does) — confirmed by reading `parseBlock` (the guard `if (!trimmed.startsWith('---')) throw` is gone; the site now falls straight through to `parseFrontmatter`).
- **K2.** `command grep -nE "lines\[0\] !== '---'|startsWith\('---'\)|indexOf\('\\n---'|match\(/\^---"` over the 10 TS files → exactly one hit, the pre-existing BUG-067 doc comment at `frontmatter-locator.ts:8`. No BUG-098 site.
- **K3.** `command grep -c "trimStart().startsWith('---')" src/commands/doctor.ts` → **0**.
- **K4.** `rewriteFrontmatter` (`sprint.ts:828-839`): first statement is `if (parsed.framingError) return raw;`.
- **K5.** Both scripts carry `import { locateFrontmatterFence } from './assert_story_files.mjs';`; `dedupe_frontmatter.mjs` is 755 on both sides (§4).
- **K6.** `git diff --name-only ca18c73..9970c10` (Dev's own commit, pre-integration) → exactly the 12-file allow-list, nothing else.

Read `parseFileFrontmatter`/`rewriteFrontmatter`/`dumpFrontmatterYaml` (`sprint.ts:774-839`), `applyStatusFix` (`wiki-audit-status.ts:256-278`), `upsertFrontmatterField` (`contradict.ts:502-531`), and `locateFrontmatter`/`frontmatterYaml`/`withFrontmatterYaml` (`frontmatter-locator.ts:66-141`) directly — the FW-A17 `framingError`-first ordering and the byte-outside-span invariant hold as described.

## 8. BUG-098-dev.md plan_deviations — ruled

| # | What | Ruling | Why |
|---|---|---|---|
| 1 | Empty YAML block parses `parseOk:true` (`sprint.ts:786`, short-circuits before `yaml.load`) | **ACCEPT** | The pinned shape's "non-object → `parseOk:false`" (plan line 869) would make a freshly-initialized `---\n---` block permanently unstampable (`rewriteFrontmatter`'s `span && !parseOk` branch never writes). An empty YAML document is not malformed — `yaml.load('')` throws nothing; it is a legitimate empty mapping. No sealed test pins either behavior through `parseFileFrontmatter` specifically (H3 tests the lower-level `frontmatterYaml`/`withFrontmatterYaml` splice, not this branch), so nothing is broken by the deviation, and it avoids a real regression the plan's literal wording would have introduced. |
| 2 | Waiver write skipped when `rewritten === rawSprint` (`sprint.ts:415`) | **ACCEPT** | Not specified for the waiver site in the plan text (only `stampSprintClose` was given an explicit equality-skip), but it is the same rule the plan pins for `stampSprintClose`, applied consistently. It is also a no-op safety net given `rewriteFrontmatter` already returns `raw` unchanged on `framingError`/malformed — harmless, and it prevents a needless disk write on an unrelated legitimate no-op. No test asserts a write must occur when content is unchanged. |
| 3 | `applyStatusFix` returns `rawText` unchanged when no `status:` line is found (`wiki-audit-status.ts:275`) | **ACCEPT** | The plan only specifies the writer's `null`/throw → unchanged case; the "no match found" case was left open. Skipping the splice avoids EOL-renormalizing an otherwise-untouched CRLF block. W1 (the only sealed scenario for this site) exercises the "status line found" path and is green; nothing regresses. |
| 4 | `upsertFrontmatterField` treats empty YAML as `[]` rather than `['']` (`contradict.ts:512`) | **ACCEPT** | Prevents inserting a spurious leading blank YAML line on a previously-empty frontmatter block — a faithful port of the pre-BUG-098 behavior, per its own stated reasoning. C1 (the sealed scenario) uses a non-empty block and is green; this only affects an edge case no red test exercises either way. |
| 5 | Task Breakdown rows not ticked during the build phase | **ACCEPT** | The build brief forbids outer writes; FW-A17 item 6 explicitly assigns the tick to integration. Consistent with protocol — see §6 above. |

All five: **ACCEPT**. None weakens the "never write on malformed framing" or "bytes outside the span are preserved" invariants; each is either a defensible interpretation of an underspecified branch or a direct extension of an explicitly-pinned equality rule, and none is contradicted by any sealed test.

The integrate report's own `plan_deviations` entry (Task Breakdown ticked at integration, producing 5 modified `<ow>` paths instead of "exactly the 2 twins") is likewise **ACCEPT** — it is FW-A17 item 6's own instruction, and the orchestrator already reverted the non-twin paths (confirmed: `<ow>` `git status --porcelain` shows only the 2 twins, §4).

## Script Incidents

None. Every invocation was a direct `npm run test:file` / `npm run typecheck` / `node <cw>/dist/cli.js …` / `cmp` / `stat` / `git diff` / `git status`, never a `.cleargate/scripts/*` invocation requiring the `run_script.sh` wrapper.

```yaml
flashcards_flagged:
  - "2026-09-26 · #qa #test-harness #zsh · Rule-16-style multi-file sweeps: use bash -c with a while-read loop, not an unquoted zsh for-loop var."
  - "2026-09-26 · #frontmatter #reports · prep_reporter_context.mjs is mode 644 (matches M2 baseline), not 755; an integrate report claiming '755 both sides' for it is wrong but harmless."
```
