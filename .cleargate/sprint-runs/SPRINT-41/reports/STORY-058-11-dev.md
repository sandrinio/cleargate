# STORY-058-11 Developer report (build phase, contract C1)

role: developer

```
STORY: STORY-058-11
STATUS: done
COMMIT: 44ba381df921ce9ae1a6de94323b92cc1e19cd44 (cli story/STORY-058-11, parent 635816c)
TYPECHECK: pass
TESTS: 86/86 reds green; all K3 anchors green; parity lock 19/19; M2 pair 5/5 + 15/15; rule-16 sweep 22 files 325/325; adjacent sweep 81 files 1106/1106
```

Worktrees: `<cw>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11/cleargate-cli`; `<ow>` = `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-11` (outer twin left uncommitted, per rule 21).

Contract precedence applied: M5-A49..A54, then the TPV rulings (R-1..R-6), then the M5 blueprint.

## K3 make-green set (solo `npm run test:file -- <file>` in `<cw>`, counts via `command grep -aE "^ℹ (tests|pass|fail|skipped) "`)

All counts are first-run results. No test was re-run to reach green.

### The 86 reds

| File | tests | pass | fail | Expected |
|---|---|---|---|---|
| test/scripts/codex-agents-codegen.red.node.test.ts | 30 | 30 | 0 | 30/30 |
| test/scaffold/portable-skills.red.node.test.ts | 6 | 6 | 0 | 6/6 |
| test/hooks/harness-shim.red.node.test.ts | 18 | 18 | 0 | 18/18 |
| test/docs/codex-enforcement-delta.red.node.test.ts | 15 | 15 | 0 | 15/15 |
| test/scripts/codex-hooks-harness.red.node.test.ts | 84 | 84 | 0 | 84/84 |
| test/commands/init.node.test.ts | 34 | 34 | 0 | 34/34 |
| test/snapshots/hooks-snapshots.node.test.ts | 16 | 16 | 0 | 16/16 |
| test/commands/lifecycle-codex.red.node.test.ts | 6 | 6 | 0 | 6/6 |

### Anchors

| File | tests | pass | fail | Expected |
|---|---|---|---|---|
| test/commands/init-host-snapshot.red.node.test.ts | 13 | 13 | 0 | 13/13 |
| test/scaffold/codex-payload.red.node.test.ts | 14 | 14 | 0 | 14/14 |
| test/hooks/pre-tool-use-task.node.test.ts | 13 | 13 | 0 | 13/13 |
| test/hooks/stamp-and-gate.node.test.ts | 7 | 7 | 0 | 7/7 |
| test/hooks/session-start.node.test.ts | 9 | 9 | 0 | 9/9 |
| test/scaffold/file-surface-gate-e2e.node.test.ts | 21 | 21 | 0 | 21/21 |
| test/scaffold/pre-commit-downstream-safe.node.test.ts | 12 | 12 | 0 | 12/12 |
| test/hooks/cr-026-integration.node.test.ts | 1 | 1 | 0 | 1/1 |

### Integration

| File | tests | pass | fail | Expected |
|---|---|---|---|---|
| test/hooks/hooks-claude-parity.red.integration.node.test.ts | 19 | 19 | 0 | 19/19 |
| test/hosts/claude-adapter-init-parity.red.integration.node.test.ts (`CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`, compare only) | 5 | 5 | 0 | 5/5 |
| test/commands/init-host-parity.red.integration.node.test.ts (same env, compare only) | 15 | 15 | 0 | 15/15 |

M2 baseline integrity: `CLEARGATE_INIT_BASELINE_CAPTURE` was not set. `find /private/tmp/cg-s41-m2-init-baseline -newer <pre-run marker>` returned nothing, so no file was written or captured.

### Rule-16 sweep

Every file under `test/` that honours `CLEARGATE_META_ROOT` (22 files, helper excluded) was run without the override. The default META_ROOT is `<cli wt>/..` = `<ow>`. Result: 22 files, 325 tests, 325 pass, 0 fail. Per file:
- new-command 57
- no-exec-mode-vocab 4
- claude-md-block-leads-relocation 4
- clean-room-verification-doc 9
- codex-enforcement-delta 15
- test-layers-declared-doctrine 11
- frontmatter-authoring e2e 9
- spidr-coverage e2e 1
- hook-signal integration 3
- hook-signal 14
- pre-tool-use-task 13
- token-ledger-attribution 9
- token-ledger-regression 14
- readiness-predicates-spidr-coverage 32
- readiness-predicates-test-layers-declared 17
- enforcement-doc-coherence 26
- file-surface-gate-e2e 21
- pre-commit-downstream-safe 12
- ratchet-retired 8
- close-sprint-assume-ack-guard 20
- scaffold-relocation 15
- bucket-registry-parity 11

The TPV scratch run failed scaffold-relocation 4c because it had no outer git index. It passes in the real worktree.

### Extra regression sweeps (beyond K3)

- **Adjacent default tier.** 81 files, 1106 tests, 1106 pass, 0 fail. Coverage: `test/hooks/*`, `test/scaffold/*`, `test/snapshots/*`, `test/hosts/*`, `test/lib/manifest*`, `test/docs/*`, and `test/commands/{init,host,doctor,upgrade,uninstall,verify-install,lifecycle}*`. It also covered `test/scripts/{clean-room,codex}*`. Integration files were excluded.
- **Integration files touching changed surfaces.** Green:
  - red-gate 4/4
  - host-cli 3/3
  - init-host-cli 4/4
  - lifecycle-per-host 3/3
  - verify-install-cli 5/5
  - init-from-source-dist 2/2
  - manifest-legacy-snapshot 1/1
  - scaffold-relocation.integration 2 pass / 3 skipped
  - scaffold-standalone 7/7

  Three were red, none caused by this story:
  - `canonical-live-parity` 5d (token-ledger canonical differs from live). This is the M5-A54 named expected red until RS-4.
  - `token-ledger-delta.integration` 7/8. The test runs the LIVE hook at `<cli>/../../.claude/hooks/token-ledger.sh`, which resolves through the `<ow>/.claude` symlink to OUTER live, not the canonical. The failure is a ledger row carrying `cache_creation`/`cache_read`. No canonical edit can reach it.
  - `dogfood-install.integration` 0/1. Doctor prints `Run cleargate upgrade to review.` I reproduced the identical failure at base `635816c` in a scratch `git archive` with its own prebuild, so it is pre-existing. The scratch is now deleted.
- **Named integration-only exclusions (not run).** These belong to the harness lane or the integrate phase:
  - the test 46 e2e (`test/e2e/codex-hooks.red.integration`);
  - the QA-Verify scripted `codex-hooks.mjs` run;
  - the M5-A6 `claude-baseline.mjs` run;
  - the -09 e2e.

  No clean-room harness was run.

### Smoke

This ran under the smoke rule: one `(cd <mktemp> && node <cw>/dist/cli.js …)` call, never backgrounded, with the scratch deleted afterwards.
- `init --host codex --yes --pin 0.0.0-dev` exited 0 and installed:
  - 11 `.codex/agents/*.toml`. All parse with `toml-eslint-parser` to exactly `{name, description, developer_instructions}`, and `name` equals the basename.
  - `.agents/skills/{flashcard,sprint-dashboard}`.
  - `.codex/hooks/lib/harness.sh` at 0755.
  - No `.claude/**`.
- `verify-install` exited 0.
- **Gherkin 4 on the installed Codex hook.** I ran `bash <room>/.codex/hooks/stamp-and-gate.sh --host codex` from cwd `/` with `CLAUDE_PROJECT_DIR` and `ORCHESTRATOR_PROJECT_DIR` unset, and a payload `cwd` of `<room>/sub/dir`. The hook resolved its root to `<room>`: it created `<room>/.cleargate/hook-log`, and nothing was created under `/`.

## K4 — codegen check

- `node scripts/build-codex-payload.mjs --check` exits 0. Checked after `npm run gen:codex` and again right before commit.
- `npm run gen:codex` ran after all 8 hook edits. No canonical hook or agent was edited after that run.
- `npm run prebuild && npm run build` ran in `<cw>` only.
  - Payload composition: 83 files. Split view: 102 files. Manifest: 77 files.
  - `node scripts/verify-pack.mjs` (dry run) printed `[verify-pack] OK — 222 files, payload 83, version 0.26.1.`, the same as the TPV simulation.

## K5 — twin cmp

`cmp <ow>/.cleargate/knowledge/cleargate-enforcement.md <cw>/scaffold/core/.cleargate/knowledge/cleargate-enforcement.md` exits 0. The outer twin is a `cp` of the canonical and is left uncommitted. `git -C <ow> status --porcelain` shows only ` M .cleargate/knowledge/cleargate-enforcement.md`.

## K6 — sentinel refusal

- `bug085SentinelCurrentHash()` and `test/helpers/init-fixture.ts` were not touched.
- The shimmed canonical `pending-task-sentinel.sh` hashes differently from the refused value:
  - pin-substituted with `FIXED_PIN` `0.0.0-m2`: `162a1b1739e9239bdae818b1c1a3dac0ccc6c104057d1ec3b109238be34058ab`, not the refused `edb7df4d03a3844d44d0fac8bb7495478529e4dff1dd39ed628b73733abf0673`;
  - raw: `bbeafe7bdd308f9b140d6c1ed734c85f7a813f589ec5531c45cf383948bc39c0`, not the frozen `43a3cb26…1b30`.
- The M2 pair at 5/5 and 15/15 is the witness.

## K7 — pre-commit

- `npm run typecheck` is clean.
- `git diff --cached --stat 635816c -- test/` lists exactly 4 files, all new, all mode 0644:
  - `test/snapshots/hooks/pre-edit-gate.story-058-11.sh`
  - `test/snapshots/hooks/session-start.story-058-11.sh`
  - `test/snapshots/hooks/stamp-and-gate.story-058-11.sh`
  - `test/snapshots/hooks/token-ledger.story-058-11.sh`

  The first three are canonical with `__CLEARGATE_VERSION__` replaced by `0.5.0`. The token-ledger lock is raw canonical.
- Paths were staged explicitly. One commit. No `--no-verify`, `git stash` or reset.
- `git -C <cw> status --porcelain` is empty after the commit.

```
$ git -C <cw> show --stat HEAD
commit 44ba381df921ce9ae1a6de94323b92cc1e19cd44
Author: sandrinio <sandrinio@users.noreply.github.com>
Date:   Sat Sep 26 20:46:06 2026 +0400

    feat(EPIC-058): STORY-058-11 codex roles + portable skills + harness-neutral repo-root shim
    (body elided; trailers Co-Authored-By: Claude Opus 5.5 (1M context) and Claude-Session present)

 CHANGELOG.md                                       |   1 +
 scaffold/core/.agents/skills/flashcard/SKILL.md    | 102 ++++
 .../core/.agents/skills/sprint-dashboard/SKILL.md  | 124 ++++
 .../.cleargate/knowledge/cleargate-enforcement.md  |  18 +
 scaffold/hosts/claude/.claude/hooks/lib/harness.sh |  64 ++
 .../claude/.claude/hooks/pending-task-sentinel.sh  |  13 +-
 .../.claude/hooks/pre-commit-surface-gate.sh       |   5 +-
 .../hosts/claude/.claude/hooks/pre-edit-gate.sh    |  11 +-
 .../claude/.claude/hooks/pre-tool-use-autonomy.sh  |  16 +-
 .../claude/.claude/hooks/pre-tool-use-task.sh      |  15 +-
 .../hosts/claude/.claude/hooks/session-start.sh    |   5 +-
 .../hosts/claude/.claude/hooks/stamp-and-gate.sh   |  10 +-
 .../hosts/claude/.claude/hooks/token-ledger.sh     |  13 +-
 .../codex/.codex/agents/architect-reader.toml      |  61 ++
 .../hosts/codex/.codex/agents/architect-synth.toml | 152 +++++
 scaffold/hosts/codex/.codex/agents/architect.toml  | 232 ++++++++
 .../.codex/agents/cleargate-wiki-contradict.toml   | 106 ++++
 .../codex/.codex/agents/cleargate-wiki-ingest.toml | 192 ++++++
 .../codex/.codex/agents/cleargate-wiki-lint.toml   | 259 +++++++++
 .../codex/.codex/agents/cleargate-wiki-query.toml  | 141 +++++
 scaffold/hosts/codex/.codex/agents/developer.toml  | 178 ++++++
 scaffold/hosts/codex/.codex/agents/devops.toml     | 255 ++++++++
 scaffold/hosts/codex/.codex/agents/qa.toml         | 182 ++++++
 scaffold/hosts/codex/.codex/agents/reporter.toml   | 295 ++++++++++
 scaffold/hosts/codex/.codex/hooks/lib/harness.sh   |  64 ++
 .../codex/.codex/hooks/pending-task-sentinel.sh    |  13 +-
 scaffold/hosts/codex/.codex/hooks/pre-edit-gate.sh |  11 +-
 scaffold/hosts/codex/.codex/hooks/session-start.sh |   5 +-
 .../hosts/codex/.codex/hooks/stamp-and-gate.sh     |  10 +-
 scaffold/hosts/codex/.codex/hooks/token-ledger.sh  |  13 +-
 scripts/build-codex-payload.mjs                    | 327 +++++++++--
 scripts/clean-room/evidence.mjs                    | 154 +++++
 src/lib/manifest-builder.ts                        |  25 +
 test/snapshots/hooks/pre-edit-gate.story-058-11.sh | 295 ++++++++++
 test/snapshots/hooks/session-start.story-058-11.sh |  98 ++++
 .../snapshots/hooks/stamp-and-gate.story-058-11.sh | 113 ++++
 test/snapshots/hooks/token-ledger.story-058-11.sh  | 644 +++++++++++++++++++++
 37 files changed, 4137 insertions(+), 85 deletions(-)
```

## What was built (as pinned)

### `scripts/build-codex-payload.mjs` (M5-A49)

- **Imports.** Node builtins only.
- **Frontmatter reader.**
  - Line 1 must be exactly `---`; the next exact `---` line closes the block.
  - Only `name` and `description` are read.
  - Values are handled in three ways:
    - double-quoted: `JSON.parse`;
    - single-quoted: `''` becomes `'`;
    - plain: trimmed, and refused when empty, when it contains ` #`, or when it starts with one of `` [{&*!|>%@` ``.
  - Anything the reader cannot map throws `build-codex-payload: unsupported frontmatter in <file>: <key>`, and `--write`/`--check` then exit 1.
- **`developer_instructions`.** This is `parseFrontmatter`'s body: everything after the closing fence's EOL, minus at most one immediately following empty line.
- **Escaping.**
  - Basic strings: `\`, `"` and every control character are escaped.
  - Multiline: `\` is escaped first; then every control character except LF and TAB (CR included); then `"""` becomes `""\"`.
- **Modes.** Hooks, `lib/harness.sh` included, are 0755. TOMLs and skill copies are 0644.
- **Plan order.** Hooks, then agents sorted by name, then skills.
- **`--check`.** It walks `hosts/codex/.codex/hooks`, `hosts/codex/.codex/agents` and `core/.agents/skills` recursively. Every problem line names its path relative to `scaffold/`.

### `TIER_RULES`

Two rows were added after `.codex/hooks.json` and before `.claude/skills/**`:
- `.codex/agents/**`: agent / always / preserve false;
- `.agents/skills/**`: skill / always / preserve false.

### `lib/harness.sh` (M5-A50)

- File mode 0755.
- `git` mode is decided first and ignores both env vars and the payload.
- An env var counts only when it is non-empty (`${VAR:-}` semantics).
- An empty payload skips the payload-cwd step. The shim never reads stdin.
- It is safe under `set -u` and `set -euo pipefail`.

### The 8 hooks

- Each carries exactly one source line and one `REPO_ROOT="$(cg_repo_root <mode> <arg>)"`, with the modes and arguments as pinned.
- Stdin reads moved above the source line. `token-ledger.sh`'s `INPUT="$(cat)"` left the `{ … }` block.
- `pre-tool-use-autonomy.sh` resolves its root after its jq guard, and its four `${CLAUDE_PROJECT_DIR:-.}` became `${REPO_ROOT}`.
- No legacy resolution string remains.
- `pre-commit.sh` is byte-unchanged.

### Enforcement doc and harness verdicts

- **§16 (M5-A51).** The exact heading is `## 16. Host Enforcement Deltas — Codex (source: STORY-058-11)`, and the index row sits directly after §15. The section has 10 bullets carrying all 11 required terms, and the canonical and outer copies are byte-identical.
- **`evidence.mjs` (M5-A52).**
  - `codex.live.roles` and `codex.live.skills` take raw inputs, and both are appended to `CODEX_GATING_IDS`.
  - `scripts/clean-room/codex-hooks.mjs` is untouched; the INTEGRATE Developer adds the collection.
  - Until then, C1's driver reports N/A for both ids, which makes a run FAIL by design.

## Items for the orchestrator

- **Task Breakdown boxes.** I did not tick them. The story file lives on `sprint/S-41`, where F9 is being applied in parallel, and this dispatch limits outer writes to the enforcement twin. What the build phase covered:
  - Done: row 2 (codegen + skills), row 3 (TIER_RULES), row 4 (shim + 8 hooks + codex regen), row 5 (no-op proof: parity lock 19/19 and the M2 pair) and row 6 (§16 in both twins).
  - Row 1 is QA-Red's (done at f4234f2 and 635816c).
  - Row 7 (real Codex session) and row 8 (integrate) are outside the build phase.
- **Outer MAIN checkout.** It shows 30 modified `.cleargate/delivery/pending-sync/*.md` files, all stamped 20:27:01. They contain `parent_cleargate_id` back-sync, the rule-14 full-suite signature. I ran no test between 20:24 and 20:29 (only edits, `gen:codex` and `node --check`), so these come from the concurrent merge-lane suite, not this dispatch. They were left as found for DevOps to revert.

## Script Incidents

None. `run_script.sh` was not needed: every command was `npm run …`, `node scripts/…` or `git` inside `<cw>`.

```yaml
r_coverage:
  - { r_id: "R1", covered: true, deferred: false, clarified: false }   # 11 .codex/agents TOMLs, name/description/developer_instructions, no model (codegen T1-T3)
  - { r_id: "R2", covered: true, deferred: false, clarified: false }   # canonical .md single source, GENERATED header, --check stale/extra/hand-edit (codegen T3, T4, T4c; codex-payload)
  - { r_id: "R3", covered: true, deferred: false, clarified: false }   # flashcard + sprint-dashboard byte-identical under .agents/skills; sprint-execution absent (portable-skills T6-T8)
  - { r_id: "R4", covered: true, deferred: false, clarified: false }   # lib/harness.sh sourced from hook dir, per-hook precedence, pre-commit.sh unchanged (harness-shim T9-T11c)
  - { r_id: "R5", covered: true, deferred: false, clarified: false }   # no-op under Claude (hooks-claude-parity 19/19; M2 pair 5/5 + 15/15)
  - { r_id: "R6", covered: true, deferred: false, clarified: false }   # tools-allowlist delta recorded, §16 (codex-enforcement-delta 15/15)
  - { r_id: "R7", covered: false, deferred: true, clarified: false }   # real Codex session: roles delegable, skills discovered; verdicts built + tested (Test 15), collection in codex-hooks.mjs is INTEGRATE, witness is QA-Verify scripted run / RS-4
plan_deviations:
  - { what: "frontmatter reader refuses three extra shapes", why: "a missing name/description, a repeated key, or an indented continuation line after name/description would silently diverge from js-yaml; read as M5-A49's 'anything else throws'", orchestrator_confirmed: false }
  - { what: "roles check (a) stringifies the properties.agent_type schema value", why: "M5-A52 'JSON.stringify of that value' read as the agent_type schema (where Codex lists roles), not the whole spawn_agent tool object", orchestrator_confirmed: false }
  - { what: "extra named exports in build-codex-payload.mjs", why: "PORTABLE_SKILLS, GENERATED_DIRS, parseAgentMarkdown, renderAgentToml, tomlBasicString, tomlMultilineContent, UnsupportedFrontmatterError are additive helpers; CODEX_HOOK_SCRIPTS gains lib/harness.sh per blueprint (c)", orchestrator_confirmed: false }
  - { what: "cg_repo_root treats an unknown mode like claude-first", why: "the pinned contract names three modes only; falling through keeps a typo from ever emitting an empty root", orchestrator_confirmed: false }
adjacent_files:
  - "cleargate-cli/scripts/clean-room/codex-hooks.mjs"
  - "cleargate-cli/test/e2e/codex-hooks.red.integration.node.test.ts"
  - "cleargate-cli/test/scaffold/canonical-live-parity.red.integration.node.test.ts"
  - "cleargate-cli/test/hooks/session-start.node.test.ts"
  - "cleargate-cli/test/hooks/cr-026-integration.node.test.ts"
  - "cleargate-cli/test/hooks/token-ledger-delta.integration.node.test.ts"
  - "cleargate-cli/test/helpers/init-fixture.ts"
  - "cleargate-cli/scaffold/hosts/codex/.codex/agents/architect.toml"
  - ".claude/hooks/lib/harness.sh"
```

```yaml
flashcards_flagged:
  - "2026-09-26 · #shell #zsh #test-harness · zsh never word-splits an unquoted $LIST; a file list reaches the runner as one arg. Use bash -c."
  - "2026-09-26 · #test-harness #baseline · dogfood-install.integration is red at C1 base (doctor prints 'Run cleargate upgrade to review.')."
  - "2026-09-26 · #test-harness #worktree · token-ledger-delta.integration runs LIVE <cli>/../../.claude token-ledger.sh; canonical edits can't move it."
```
