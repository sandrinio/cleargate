# BUG-090 — QA-Verify (integrated tree)

role: qa

```
STORY: BUG-090
QA: PASS
TYPECHECK: pass
TESTS: 48/48 default-tier delta + 2/2 integration; M2 parity 5/5 + 15/15; K12 anchors all green
       except the 4 named pre-existing template-sync-fields failures (16/20); K13 21/21 files
       (100/100 tests) green with CLEARGATE_META_ROOT=<ow>, no ENOENT-class exceptions needed
HARNESS: PASS — sprint-init PASS ×2 (fix witness), all gating rows PASS, findings: []
ACCEPTANCE_COVERAGE: 9 of 9 Gherkin scenarios have matching tests (R1-R9), plus R10 (twins) and
       R11 (harness) both confirmed independently
MISSING: none
REGRESSIONS: none
VERDICT: ship it. Every K-gate, anchor, parity row and the live harness witness reproduce
       exactly what the Dev/Integrate reports claim, independently re-measured on 2e63854/398dfac3.
```

## Subject

- `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090/cleargate-cli`, `story/BUG-090` @ `2e63854` (integrate = merge of cli main `c5a311e`), clean.
- `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090`, `story/BUG-090` @ `398dfac3` (integrate = merge of `sprint/S-41`), 5 twins uncommitted by design.
- OUTER main checkout: read-only throughout except the harness run's own container/mktemp (deleted after). Never edited, never built, never checked out.

## 1. Diff shape

`git -C <cw> diff c5a311e 2e63854 --stat` = exactly the 17 files: 5 core (`assert_story_files.mjs`, `close_sprint.mjs`, `epic.md`, `hotfix.md`, `story.md`), `probe-items.mjs`, `doctor.ts`, `push.ts`, and 8 test files (7 amended/new default-tier + `init-fixture.ts` tail rows + the integration e2e file). Matches the pinned "Files (BUG-090, complete)" list plus sealed tests exactly; `test/helpers/init-fixture.ts`'s BUG-090 rows sit at the tail, after `-10`'s rows (confirmed by `item: 'BUG-090'` grep positions, all after `item: 'STORY-058-10'`).

C4 interface as shipped, confirmed by direct read:
- `locateFrontmatterFence(raw)` at `assert_story_files.mjs:192`, returning `{start,end,yamlStart,yamlEnd,eol}` or throwing the 3 pinned messages verbatim (`:224/:238` "missing closing ---", `:241` "unterminated <instructions> block", `:242` "unterminated Markdown fence").
- `assertWorkItemApproved(filePath)` at `:258`, exported, try/catch around the locator call, `body = content.slice(span.end)`.
- `close_sprint.mjs:85` imports `locateFrontmatterFence`; `fenceYaml` at `:255`; consumed at `:270` (`readFmStatus`), `:609` (`setFrontmatterStatusAtomic`, offset splice), `:1058`/`:1076` (Step 2.9 parsers) — all read `fm.yaml`, never raw.

## 2. Typecheck + make-green set (solo, from `<cw>`)

`npm run typecheck` — clean.

| File | tests/pass/fail/skip |
|---|---|
| `frontmatter-fence-parity.red.node.test.ts` | 21/21/0/0 |
| `assert-story-files-fence.red.node.test.ts` | 11/11/0/0 |
| `close-sprint-fence.red.node.test.ts` | 4/4/0/0 |
| `template-approved-key.red.node.test.ts` | 7/7/0/0 |
| `push.node.test.ts` | 9/9/0/0 |
| `doctor.node.test.ts` | 40/40/0/0 |
| `doctor-session-start.node.test.ts` | 22/22/0/0 |
| `sprint-init-fresh-install.red.integration.node.test.ts` | 2/2/0/0 |

Default-tier delta 48/48 (matches FW-A16 exactly). Integration 2/2.

M2 parity pair, compare mode, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline` (read-only, never touched):
- `claude-adapter-init-parity.red.integration.node.test.ts`: 5/5.
- `init-host-parity.red.integration.node.test.ts`: 15/15.

Template hashes (`shasum -a 256`) match the plan literals exactly: epic `d99b995b…c67a1b`, story `e7736854…15baa5c5`, hotfix `38edde0d…a8b471`. Each has exactly one bare `approved: false` directly after `status:` (epic `:44`, story `:75`, hotfix `:36`).

`doctor.ts` numstat vs pre-fix `93e48dc`: `0 2` — exactly the two `trimStart().startsWith('---')` sniff lines deleted (`runSessionStart` and `runCanEdit`), nothing else. `runPricing`'s sniff (BUG-098 scope) remains, count 1.

`push.ts` and `probe-items.mjs` (`approveProbeStory`) read byte-for-byte identical to the plan's pinned shapes.

## 3. Rule 16 — 21 `CLEARGATE_META_ROOT` files, `CLEARGATE_META_ROOT=<ow>`

`command grep -rl CLEARGATE_META_ROOT test` (excluding `helpers/scaffold-roots.ts`) returns exactly 21 files, matching the plan's count. Ran every one solo with the override pointed at `<ow>`:

new-command 57/57 · no-exec-mode-vocab 4/4 · claude-md-block-leads-relocation.red 4/4 · clean-room-verification-doc.red 9/9 · test-layers-declared-doctrine.red 11/11 · frontmatter-authoring.red.integration 9/9 · spidr-coverage.red.integration 1/1 · hook-signal.red.integration 3/3 · hook-signal.red 14/14 · pre-tool-use-task 13/13 · token-ledger-attribution 9/9 · token-ledger-regression 14/14 · readiness-predicates-spidr-coverage.red 32/32 · readiness-predicates-test-layers-declared.red 17/17 · enforcement-doc-coherence 26/26 · file-surface-gate-e2e 21/21 · pre-commit-downstream-safe 12/12 · ratchet-retired 8/8 · close-sprint-assume-ack-guard 20/20 · scaffold-relocation.red 15/15 · bucket-registry-parity.red 11/11.

**21/21 files, 100/100 tests, all green — zero ENOENT-class exceptions needed** (the outer worktree already carries the 5 twins + a `.claude` symlink, so nothing is absent). `close-sprint-assume-ack-guard` (20/20) is the pre-merge witness that the live import pair links — it spawns the outer worktree's `close_sprint.mjs`, which statically imports `locateFrontmatterFence` from the outer worktree's `assert_story_files.mjs`.

## 4. K12 anchors + pre-existing reds

clean-room-evidence.red 60/60 · frontmatter-locator.red 11/11 · test_assert_work_item_files 20/20 · sync-acquire 9/9 · init-host-snapshot.red 13/13 · status-vocab-phase-b.red 75/75 · work-item-id 47/47 · no-inline-id-regex 7/7 · no-exec-mode-vocab 4/4 · clean-room-baseline-coexistence.red 24/24 · gate-section-index-pinning 14/14 · close-sprint-step-2-6c.red 8 pass + 1 skip · close-sprint-step-7-4.red 6/6 · canonical-live-parity.red.integration 11/11 · canonical `test_assert_story_files.sh` 15/15 · outer `test_assert_story_files.sh` 15/15.

`template-sync-fields.integration.node.test.ts`: 16/20, 4 failures, all `live template {epic,story,CR,Bug}.md — parseFrontmatter returns all 6 new keys`. Read the test source at `:78`: `assert.ok(field in (fm, msg))` — the comma operator evaluates `(fm, msg)` to the message string, so `field in <string>` throws `TypeError` unconditionally, regardless of `fm`'s content. This fails identically on `CR.md` and `Bug.md`, which BUG-090 never touches (confirmed: not in the diff-shape file list, §1), and the failure mode is content-independent — so it is pre-existing and disjoint from BUG-090's change surface, not a regression. Named, not fixed (follow-up per FW-A16).

## 5. Twins + link witnesses

`cmp` of all 5 `<ow>/.cleargate/{scripts,templates}/*` against `<cw>/scaffold/core/.cleargate/{scripts,templates}/*`: **identical**, all 5.

`(cd <ow> && node .cleargate/scripts/close_sprint.mjs)` → usage printed, exit 2, no SyntaxError.
`(cd <ow> && node .cleargate/scripts/assert_story_files.mjs)` → usage printed, exit 2, no SyntaxError.

The ESM import pair links correctly in the outer worktree even though the twins are still uncommitted there (by design — Rule 21/K11: the commit happens once, at DevOps merge time).

## 6. Live harness run (harness lane, one run, no `--evidence`, no `--known-fail`)

```
(cd <mktemp under session scratchpad> && node /Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-090/cleargate-cli/scripts/clean-room/claude-baseline.mjs run --ref story/BUG-090 --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T161154Z-bug090 --label "QA BUG-090")
```

Ran in the foreground via `run_in_background` + notification-wait (never polled with `sleep`, never launched a second harness run — confirmed no other `claude-baseline.mjs`/`cg-cleanroom-*` process was live before I started, per `ps aux` check). **Exit 0.** stdout: `claude-baseline run: PASS`.

`summary.json`:
- `cliSha`: `2e638540e82fe49fde9e841ffd648db0adfa4ece` — matches `<cw>` HEAD exactly.
- `registeredHosts`/`allResolvedHosts`: `[claude, codex]` both.
- `findings`: `[]` (empty).

| id | noflag | all | evidence |
|---|---|---|---|
| room-isolation | PASS | PASS | |
| verify-install | PASS | PASS | |
| doctor | PASS | PASS | |
| tree-comparison | PASS | PASS | |
| host-set | PASS | PASS | noflag=[claude]; all=[claude, codex]; registered=[claude, codex] |
| claude.live.session-start | PASS | PASS | |
| claude.live.pre-tool-use | PASS | PASS | |
| claude.live.post-tool-use | PASS | PASS | |
| claude.live.dispatch | PASS | PASS | |
| claude.live.agents-skills | PASS | PASS | |
| claude.live.agents-md-exposure | N/A | PASS | |
| claude.live.hook-identity | PASS | PASS | |
| claude.live.agents-skills-parity | PASS | PASS | |
| claude.live.mcp-connect | INFO | INFO | non-gating |
| **sprint-init** | **PASS** | **PASS** | noflag: exit 0 \| all: exit 0 |
| check-scaffold | INFO | INFO | non-gating (F8: one pre-existing upstream-changed false positive, unrelated) |
| **active-sprint** | INFO | INFO | `.active after sprint-init: present` (both columns) |
| verify-install-all-plain | N/A | PASS | |

Against the required outcome: exit 0 (yes) · `agents-md-exposure` N/A/PASS (yes) · `host-set` PASS (yes) · `agents-skills-parity` PASS (yes) · `verify-install-all-plain` PASS (yes) · **`sprint-init` PASS ×2 — the BUG-090 fix witness, previously FAIL-KNOWN** (yes) · **`active-sprint` cell `.active after sprint-init: present` ×2** (yes) · every other gating row PASS (yes). No gating row newly FAILed.

**Cleanup:** container `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T161154Z-bug090` and the scratch mktemp dir both deleted. `ps aux | grep` for the container name: no match, no leftover processes. Pre-existing, not-mine containers (`cg-cleanroom-20260904`, `…qa08`, `…qa08-r2`, `…claude`) left untouched. No `~/.codex`, `CODEX_HOME`, `CG_TEST` or auth files touched — only a Claude session ran.

## 7. Acceptance mapping (BUG-090 §5 Gherkin → evidence)

| Scenario | Test(s) | Result |
|---|---|---|
| Approved instructions-led story passes sprint init | A1, I1 | green |
| Step 2.9 reads deferred_verification behind `<instructions>` | C1 | green |
| Fence located regardless of line endings / phantom fences (CRLF, phantom-inside) | A3, A5 | green |
| Template-scaffolded story carries approved key to flip | T1-T3, I1, I2 | green |
| push names an absent approved key accurately | P1, P2 | green |
| Unapproved instructions-led story still rejected | A7 | green (anchor) |
| BUG-067-corrupted item read from its first fence (phantom before `<instructions>`) | A6 (+ A10 re-seal, malformed `----`-closed) | green |
| doctor reads approval behind an instructions block | D1, D2, D3 | green |
| Step 2.6c flips an instructions-led epic, byte-identical preamble | C3, C4 | green |
| (R10) Outer twin commit | twins written + `cmp` OK | confirmed directly, §5 above; commit itself deferred to DevOps merge lane by design |
| (R11) `-09` harness `sprint-init` row PASS ×2 | live harness run | confirmed, §6 above |

9 of 9 static Gherkin scenarios covered by passing tests; R10/R11 (deferred-by-design / QA-Verify's own job) both independently confirmed. No MISSING entries, no red-now-green ambiguity — every test in the make-green set is currently green against the Developer's integrated commit.

**Task Breakdown.** All 8 rows in the item file have complete code evidence (confirmed above by direct file:line read), but the checkboxes remain unticked. Per the Dev/Integrate reports this is intentional: ticks land in the same single outer commit at DevOps merge time that commits the 5 twins (replan §6 step 7-8), not before. Advisory only — not a bounce reason.

## 8. Review of BUG-090-dev.md's plan deviations

1. **"`assertWorkItemApproved` keeps the two-line `approvedMatch` form"** (`assert_story_files.mjs:279-281`, vs. plan (a)'s one-line `.test()` snippet). **ACCEPT.** Verified byte-for-byte: the regex line `fmBlock.match(/^approved:\s*["']?(true)["']?\s*$/m)` is identical to base `:168`. Same semantics, and it satisfies K4's explicit "byte-identical to base" requirement more literally than the plan's own inline snippet would have. orchestrator_confirmed: true (per Dev report) — correctly so.
2. **"twins copied before the cli commit"** (process-order only, no code effect). **ACCEPT.** The observable outcome — 5 twins in `<ow>`, `cmp`-identical to canonical — is what I independently re-verified in §5 above, on the post-integration tree, regardless of the build-phase ordering. No residual risk.

## Script Incidents

None. All test/typecheck/build commands were direct `npm run` / `node` invocations, not `run_script.sh`-wrapped. The harness run used the exact command form named in the dispatch and `plans/replan-contract-first.md` §BUG-090.

```yaml
flashcards_flagged: []
```
