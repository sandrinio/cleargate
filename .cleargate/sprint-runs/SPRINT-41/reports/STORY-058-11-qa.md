role: qa

# STORY-058-11 QA-Verify — integrated tree (55fc4cb / 46244b04), harness lane

```
STORY: STORY-058-11
QA: PASS
TYPECHECK: pass
TESTS: 618 passed, 0 failed, 0 skipped (38 distinct files, solo re-run, first-run, no flakes) — plus the two harness-lane runs below
HARNESS_CODEX: PASS (12/12 gating rows; codex.live.roles + codex.live.skills PASS)
HARNESS_CLAUDE: PASS (every Run-1 gating row PASS/N-A as expected; findings: [])
ACCEPTANCE_COVERAGE: 6 of 6 Gherkin scenarios have matching tests
MISSING: none
REGRESSIONS: none
VERDICT: ship it — the 8-hook shim leaves Claude Code fully intact (live witness), Codex roles/skills gate on the pinned binary, and the tree at cli 55fc4cb / outer 46244b04 matches every hash the Architect and Developer reports forecast, byte for byte.
```

Reviewed: `<cw>` = `OUTER/.worktrees/STORY-058-11/cleargate-cli` @ `55fc4cb` (chore: regen codex architect TOMLs) ← `53f90a2` (re-sync cli main `6fc13d2`) ← `76dee8c` (fix) ← `6cdce4e` (re-seal #2) ← `1e7f0e6` (collection) ← `2941d83` ← `44ba381` (Dev). `<ow>` = `OUTER/.worktrees/STORY-058-11` @ `46244b04` + uncommitted enforcement twin (sha256 `477b404f…50cc`). Both matched the dispatch's stated commits exactly before any command ran.

## 1. Diff shape vs main + re-integration invariants (arch §8)

`git -C <cw> diff 6fc13d2 55fc4cb --stat`: 15 files, +1189/−85 (CHANGELOG.md, the enforcement twin, `launch_wave.mjs`, `Sprint Plan Template.md`, 3 architect `.md` + 3 architect `.toml`, `sprint-execution/SKILL.md`, `test/docs/contract-first-dag-text.red.node.test.ts`, `test/helpers/init-fixture.ts`, `test/scripts/init-sprint-waves-v2.red.integration.node.test.ts`, `test/scripts/waves-json-v2.red.node.test.ts`) — this is CR-124's own set plus the 3 regenerated architect TOMLs. -11's own sealed delta is untouched by the merge.

Re-ran all four invariants myself, independently:

| Invariant | Check | Result |
|---|---|---|
| I1 | `git diff main HEAD -- scaffold src scripts ':!scaffold/hosts/codex/.codex/agents/architect*.toml'` vs `git diff 984e8d5 76dee8c` over the same paths — line-set diff | **MATCH** — 2722 lines each, identical sets |
| I2 | `git diff 76dee8c HEAD --stat` | **MATCH** — 15 files, +1189/−85, `test/helpers/init-fixture.ts` at +109/−18 |
| I3 | `git diff 8c8c5ff HEAD -- scaffold` vs `git diff d0f0d95 984e8d5 -- scaffold` — line-set diff | **MATCH** — 176 lines each (5 files, +157/−19, BUG-090's scaffold delta) |
| I4 | `init-fixture.ts`: no duplicate `rel:` rows; exactly one `item: 'STORY-058-11+CR-124'` row; one `SANCTIONED_BASELINE_ADDITIONS` block | **MATCH** — no conflict markers, `git diff --check` clean |

Sealed tests are unchanged since `6cdce4e` except what main (CR-124) brought — confirmed by I1's exact line-set match.

## 2. Typecheck + make-green (solo, `npm run test:file -- <file>`, counts via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

`npm run typecheck` in `<cw>`: **exit 0**.

**K3 red set (8 files) — all first-run, matches Dev/re-integrate reports exactly:**

| File | tests/pass/fail |
|---|---|
| test/scripts/codex-agents-codegen.red | 30/30/0 |
| test/scaffold/portable-skills.red | 6/6/0 |
| test/hooks/harness-shim.red | 18/18/0 |
| test/docs/codex-enforcement-delta.red | 15/15/0 |
| test/scripts/codex-hooks-harness.red | 90/90/0 |
| test/commands/init.node | 34/34/0 |
| test/snapshots/hooks-snapshots.node | 16/16/0 |
| test/commands/lifecycle-codex.red | 6/6/0 |

**K3 anchors (8 files) + hooks-claude-parity:**

| File | tests/pass/fail |
|---|---|
| test/commands/init-host-snapshot.red | 13/13/0 |
| test/scaffold/codex-payload.red | 14/14/0 |
| test/hooks/pre-tool-use-task.node | 13/13/0 |
| test/hooks/stamp-and-gate.node | 7/7/0 |
| test/hooks/session-start.node | 9/9/0 |
| test/scaffold/file-surface-gate-e2e.node | 21/21/0 |
| test/scaffold/pre-commit-downstream-safe.node | 12/12/0 |
| test/hooks/cr-026-integration.node | 1/1/0 |
| test/hooks/hooks-claude-parity.red.integration | 19/19/0 |

**M2 pair** (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare-only, `CLEARGATE_INIT_BASELINE_CAPTURE` unset):

| File | Result |
|---|---|
| test/hosts/claude-adapter-init-parity.red.integration | 5/5/0 |
| test/commands/init-host-parity.red.integration | 15/15/0 |

Baseline integrity: touched a marker file before both runs; `find /private/tmp/cg-s41-m2-init-baseline -newer <marker>` returned **0** entries — baseline untouched.

`node scripts/build-codex-payload.mjs --check` in `<cw>`: **exit 0**.

**Rule-16 set** (every file under `test/` honouring `CLEARGATE_META_ROOT`, `command grep -rl CLEARGATE_META_ROOT test`, run with the default META_ROOT — in this nested worktree that is already `<ow>`, no override needed): **23 files** (`test/helpers/scaffold-roots.ts` excluded as the helper), **335 tests, 335 pass, 0 fail**:

| File | tests |
|---|---|
| new-command.node | 57 |
| no-exec-mode-vocab.node | 4 |
| claude-md-block-leads-relocation.red | 4 |
| clean-room-verification-doc.red | 9 |
| codex-enforcement-delta.red | 15 |
| contract-first-dag-text.red | 10 |
| test-layers-declared-doctrine.red | 11 |
| frontmatter-authoring.red.integration (e2e) | 9 |
| spidr-coverage.red.integration (e2e) | 1 |
| hook-signal.red.integration | 3 |
| hook-signal.red.node | 14 |
| pre-tool-use-task.node | 13 |
| token-ledger-attribution.node | 9 |
| token-ledger-regression.node | 14 |
| readiness-predicates-spidr-coverage.red | 32 |
| readiness-predicates-test-layers-declared.red | 17 |
| enforcement-doc-coherence.node | 26 |
| file-surface-gate-e2e.node | 21 |
| pre-commit-downstream-safe.node | 12 |
| ratchet-retired.node | 8 |
| close-sprint-assume-ack-guard.node | 20 |
| scaffold-relocation.red | 15 |
| bucket-registry-parity.red | 11 |

**Solo re-run grand total (deduped across all batches above): 38 distinct files, 618 tests, 618 pass, 0 fail, 0 skipped.** Every count matches the Developer's re-integrate report exactly; no flakes, no re-runs needed.

## 3. Twin cmp

`cmp <ow>/.cleargate/knowledge/cleargate-enforcement.md <cw>/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` → **exit 0** (identical). sha256 both sides: `477b404f51058f0ff97439248b2caef53e345d4367e320adb3c80a85717650cc` — matches the Architect's forecast and the Developer's re-integrate report exactly.

Regenerated architect TOML sha256, spot-checked directly against C2/forecast:
- `architect.toml` → `71d1c56b2089a90120cd442942a2cbcbe6ae294945a371c3591a6711c88483ea`
- `architect-synth.toml` → `8bdd01387a4336dbc0ce3483140a0c4fb64f55d775bd4d363e70ae1bb5547522`
- `architect-reader.toml` → `64ba7730bb2a3620d708d142e8320f225da6a0cc8b9ef84ecf25a9a6fedc3f55`

All three exact matches.

## 4. Harness lane

Pinned codex sha256 verified first: `1d8b80de0a27f69b152bfb9b7b3b4fd3b8c589e4e76213db27219eab9ae53afa` (`codex-cli 0.154.0-alpha.6.2`) — matches.

Ran the two witnesses sequentially, never concurrently, each exactly once, from a literal `mktemp -d` per the danger-flashcard rule. `codex-hooks.mjs run --help` printed only a usage refusal, so I read the module's header doc to confirm the flag is `--codex-bin <abs>` (not an env var) before invoking it — the dispatch's own hedge ("check --help for exact flags first") anticipated this.

### 4a. Scripted codex witness (HARNESS_CODEX: PASS)

```
(cd <mktemp D1> && node <cw>/scripts/clean-room/codex-hooks.mjs run \
    --codex-bin /Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/codex-runtime-X33IWV/bin/codex \
    --provider scripted --ref story/STORY-058-11 \
    --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T184555Z-11codex \
    --label "QA STORY-058-11 codex")
```

**Exit 0.** stdout: `codex-hooks run: PASS`.

`summary.json`: `cliSha` `55fc4cb49d15ef2e027b83fa820ed7f06f1b3b07` (this HEAD, exact); `artifactInputs` `802ee5c951c0c41784e6a0f495b00471836ab05cff551fb0cdebff19097fd003`; codex `codex-cli 0.154.0-alpha.6.2`, sha256 matches the pin; `trustPosture` `harness-exact-hash`; `findings: []`.

| id | status | detail |
|---|---|---|
| codex.live.discovery | PASS | |
| codex.live.session-start | PASS | |
| codex.live.post-tool-use | PASS | |
| codex.live.edit-deny | PASS | |
| codex.live.edit-allow | PASS | |
| codex.live.dispatch-deny | PASS | |
| codex.live.dispatch-identity | PASS | |
| codex.live.shared-hooks | PASS | |
| claude.control.edit-deny | PASS | |
| codex.verify-install | PASS | |
| **codex.live.roles** | **PASS** | "11 roles listed; qa spawned with its instructions" |
| **codex.live.skills** | **PASS** | "flashcard, sprint-dashboard room-local; no room-local sprint-execution" |
| codex.live.metering | INFO | "unavailable" |
| codex.live.trust-posture | INFO | "harness-exact-hash: 5 hooks" |

All 12 gating ids PASS — matches the Architect's §8 forecast exactly, including the `codex.live.roles` detail string verbatim. This is the live proof that the M5-A55 tokenization fix (parsed-string, whole-token match) holds against the real pinned binary, and that the M5-A52 collection (roles + skills gathered in `runCodexSessions`) is wired correctly end to end.

Cleanup: container and `mktemp` dir deleted (exact paths); `ps aux` shows no leftover `cg-cleanroom-20260926T184555Z-11codex` or codex-runtime process. Pre-existing, not-mine containers (`cg-cleanroom-20260904`, `…qa08`, `…qa08-r2`, `…claude`) left untouched. No `CODEX_HOME`, `~/.codex`, or `codex login status` touched (scripted provider only).

### 4b. M5-A6 Claude witness (HARNESS_CLAUDE: PASS) — the live Rule-2 witness for the shim

```
(cd <mktemp D2> && node <cw>/scripts/clean-room/claude-baseline.mjs run \
    --ref story/STORY-058-11 \
    --container /Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T184830Z-11claude \
    --label "QA STORY-058-11")
```

No `--evidence`, no `--known-fail` (FW-A7: the flag is retired now that BUG-090 is fixed and merged into this tree).

**Exit 0.** stdout: `claude-baseline run: PASS`.

`summary.json`: `cliSha` `55fc4cb49d15ef2e027b83fa820ed7f06f1b3b07` (exact match); `registeredHosts`/`allResolvedHosts` both `[claude, codex]`; `findings: []`.

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
| claude.live.agents-skills-parity | PASS | PASS | now with core `.agents/skills` in the all room |
| claude.live.mcp-connect | INFO | INFO | non-gating |
| sprint-init | PASS | PASS | exit 0 both columns — **no `--known-fail` needed** (BUG-090 fixed) |
| check-scaffold | INFO | INFO | non-gating |
| active-sprint | INFO | INFO | ".active after sprint-init: present" both columns |
| verify-install-all-plain | N/A | PASS | |

Against the dispatch's exact checklist: agents-md-exposure noflag N/A / all PASS (yes) · host-set PASS (yes) · claude.live.agents-skills-parity PASS (yes) · verify-install-all-plain PASS in all (yes) · sprint-init PASS ×2 (yes — no known-fail) · active-sprint ".active after sprint-init: present" ×2 (yes) · claude.live.hook-identity PASS (yes) · every other gating row PASS (yes). This is the story's own live proof that the 8-hook shim is a true no-op under Claude Code: every one of the 8 shimmed hooks fires through a real headless Claude session with the identical observable behavior recorded for prior sprints.

Cleanup: container and `mktemp` dir deleted (exact paths); `ps aux` shows no leftover process. Two real Claude session directories were created under `~/.claude/projects/` (the harness's own artifact, not deleted — consistent with the STORY-058-10-qa2 precedent).

## 5. Acceptance mapping (Gherkin §2.1)

| # | Scenario | Evidence | Status |
|---|---|---|---|
| 1 | Agent TOML generated from canonical markdown | `codex-agents-codegen.red` 30/30 (field mapping); `codex-payload.red` 14/14; live smoke (Dev report): 11 `.codex/agents/*.toml` install, each parses to exactly `{name, description, developer_instructions}` | covered |
| 2 | Regeneration is byte-stable | `codex-agents-codegen.red` (byte-stability cases, part of the 30); live `--check` exit 0 confirmed myself in step 2 | covered |
| 3 | Portable skills copy verbatim | `portable-skills.red` 6/6; harness `codex.live.skills` PASS ("flashcard, sprint-dashboard room-local; no room-local sprint-execution") | covered |
| 4 | Repo-root shim resolves under Codex | `harness-shim.red` 18/18 (test 9, `cg_repo_root` payload-cwd resolution); harness `codex.live.shared-hooks` PASS | covered |
| 5 | Repo-root shim is a no-op under Claude Code | `hooks-claude-parity.red.integration` 19/19 (frozen pre-shim vs current); M2 pair 5/5+15/15; **live Claude witness PASS** (§4b, every Run-1 row reproduces) | covered |
| 6 | Tools-allowlist delta is recorded | `codex-enforcement-delta.red` 15/15; §16 twin `cmp` 0, sha256 exact match | covered |

**Task Breakdown** (advisory, EPIC-054 WS7): all 8 rows are either checked-equivalent by evidence above or explicitly explained in the story/Dev/Arch reports (row 1 QA-Red done at `f4234f2`/`635816c`; rows 2–6 covered by the K3/twin evidence above; row 7 — real Codex session roles/skills delegable — satisfied by the §4a scripted harness witness (`codex.live.roles`/`codex.live.skills` PASS on the real pinned binary), with RS-4's live-provider run remaining a boundary-step follow-on per the story's own text; row 8 — integrate — complete: re-integration invariants I1–I4 hold, post-flight already PASSed (`reports/STORY-058-11-arch.md`), and this QA-Verify is its final piece). No row is silently dropped.

**Manual Verification Steps (§2.2):**
- "Start a real Codex session and confirm the roles are listed and delegable" — satisfied by §4a: a real pinned Codex binary session (scripted responses, deterministic), `codex.live.roles` PASS with detail "11 roles listed; qa spawned with its instructions", `codex.live.dispatch-identity` PASS with `expectedAgentType` qa.
- "Run the Claude hook suite with the shim in place and diff behavior against pre-shim" — satisfied by `hooks-claude-parity.red.integration` (19/19, frozen pre-shim fixtures vs current) plus the live §4b witness.

**MISSING: none.**

## 6. Deviation spot-check (arch report ruled 13 ACCEPT)

Spot-checked 3 of the 13 directly against source, from the tests-as-contract angle:

- **#1 (frontmatter reader also refuses a missing key, a repeated key, and an indented continuation line).** Read `scripts/build-codex-payload.mjs:176-190` myself: `values.has(key)` throws on a repeat, `/^[ \t]+\S/.test(next)` throws on an indented continuation, and the trailing `for (const key of ['name','description'])` loop throws on a missing key. All three are narrowings of "anything else throws" (M5-A49) — no valid canonical agent is affected (all 11 pass). **ACCEPT confirmed.**
- **#4 (`cg_repo_root` treats an unknown mode like claude-first).** Read `lib/harness.sh:30-64` myself: the `git`/`orchestrator-first` branches are gated on the mode string, but the `CLAUDE_PROJECT_DIR` check is unconditional, so any unrecognized mode falls through to it — never an empty root, because of the final unconditional `pwd`. Then confirmed `test/hooks/harness-shim.red.node.test.ts:251-258` pins each of the 8 shipped hooks to exactly one of the three declared modes (no hook can reach the fallthrough in production). **ACCEPT confirmed.**
- **#5 (`toml-eslint-parser` loaded via `createRequire(anchor).resolve` + `import()`, not a static import).** My own §4a scripted witness ran `codex-hooks.mjs` from a `mktemp`-installed npm artifact (not the source tree), and `codex.live.roles` still returned "qa spawned with its instructions" — i.e. `qaFirstLine` was correctly populated from `qa.toml`, which requires the lazy TOML-parser load to have succeeded via its fallback anchor. **ACCEPT confirmed by live re-run, independent of the Architect's simulation.**

No disagreement with any of the 13 rulings.

## 7. Script Incidents

None. `run_script.sh` was not invoked; every command was `npm run …`, `node scripts/…`, `git`, or a direct `node` harness invocation per the dispatch's own smoke rule.

## 8. Git status / cleanup disclosure

- `<cw>`: clean throughout, HEAD `55fc4cb` (unchanged by this dispatch).
- `<ow>`: only the pre-existing ` M .cleargate/knowledge/cleargate-enforcement.md` (the twin left uncommitted by the Developer's re-integrate dispatch, per rule 21 — this QA pass did not touch it beyond read-only `cmp`).
- OUTER: only the orchestrator's pre-existing `.session-totals.json`/`events.jsonl`/`state.json`/`token-ledger.jsonl` edits, plus this report.
- cli main checkout: untouched, on `main` @ `6fc13d2` (pre-existing untracked `cleargate-0.25.0.tgz`).
- Never touched: `/private/tmp/cg-s41-m2-init-baseline` (env read only, confirmed untouched by mtime), `/private/tmp/cg-s41-fresh-journey`, any `*-evidence` dir, other worktrees (BUG-098, STORY-058-12), `CODEX_HOME`/`~/.codex`/auth files. No `git stash`, no `reset --hard`, no push, no bare `cleargate`, no `--no-verify`, no full `npm test`, no build/prebuild in the cli main checkout.
- Scratchpad hygiene: deleted only the exact-named ad hoc files this dispatch created (`qa11-i1-*.diff/.txt`, `qa11-i3-*.diff/.txt`, the two harness containers and two `mktemp` dirs, and the harness run logs); never a glob-delete; no other agent's file was touched.

```yaml
flashcards_flagged:
  - "2026-09-26 · #test-harness #codex · codex-hooks.mjs run has no CLEARGATE_CODEX_BIN env fallback; the flag is --codex-bin <abs>, --help refuses instead of printing usage."
```
