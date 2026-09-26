# STORY-058-08 — Developer report

role: developer

## Commits

**Cli.** `story/STORY-058-08` @ `9ac0fa39b52a52cbc6681305c7a202fc218c9f93` (one commit on top of the re-seal `549fdaa`, on main `b244551`):

```
feat(EPIC-058): STORY-058-08 cleargate verify-install + findCleargatePackageRoot
```

Files: `CHANGELOG.md` (M), `src/cli.ts` (M), `src/commands/init.ts` (M), `src/commands/verify-install.ts` (A, 692 lines), `src/lib/cli-package-root.ts` (A, 41 lines).

**Outer.** worktree `.worktrees/STORY-058-08` @ `adde0a23971b92198d04d4815baf76eb9bae1470` (one commit on `story/STORY-058-08`):

```
docs(SPRINT-41): STORY-058-08 clean-room verification procedure
```

Files: `.cleargate/knowledge/clean-room-verification.md` (A, 216 lines).

`cleargate-0.25.0.tgz` (pre-existing untracked, cli root) was left alone in both commits.

## Count table

| Check | Expected (TPV) | Measured |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| Unit `verify-install.red.node.test.ts`, SOLO | 38/38 | 38/38 (two runs, identical) |
| Integration `verify-install-cli.red.integration.node.test.ts`, SOLO | 5/5 | 5/5 (two runs, identical) |
| Doc `clean-room-verification-doc.red.node.test.ts`, SOLO, `CLEARGATE_META_ROOT=.worktrees/STORY-058-08` | 9/9 | 9/9 (two runs, identical) |
| Sealed -03..-07 + BUG-085 (17 files) | per TPV table | all match exactly — 19/19, 11/11, 17/17, 6/6, 18/18, 10/10, 13/13, 10/10, 6/6, 16/16, 4/4 (`uninstall-reinit`), 4/4, 3/3, 3/3, 24/24, 13/13, 13/13 |
| Parity | 5/5, 15/15 | `claude-adapter-init-parity` 5/5, `init-host-parity` 15/15 |
| Regression-witness list (16 files) | per TPV table | all match exactly — `cli.node` 23/23, `init.node` 29/29, `init-from-source.node` 11/11, `init-from-source-dist.integration` 2/2, `init-gitignore-expansion` 5/5, `init-no-dep0190` 2/2, `init-participant` 3/3, `init-restart-banner` 3/3, `init-root-gitignore` 9/9, `doctor.node` 39/39, `doctor-membership-banner` 4/4, `doctor-notifier` 6/6, `doctor-pricing` 5/5, `doctor-retired-field.red` 3/3, `doctor-session-start` 20/20, `upgrade-state-parity.red` 2/2 |
| Baseline hash (`/private/tmp/cg-s41-m2-init-baseline`, 425 files, absolute paths) | `bdc4bb1a…62b2` | `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — unchanged, before and after (never wrote into it) |
| Red-without-code (mandatory verification) | 38/38 + 5/5 fail | Reverted `src/cli.ts`/`src/commands/init.ts`/`CHANGELOG.md` to `main` and moved the two new files aside (no `git stash`; manual `git diff`/`git checkout -- `/`git apply` round-trip) → unit 38 fail / 0 pass, integration 5 fail / 0 pass, both `ERR_MODULE_NOT_FOUND`. Restored, re-verified 38/38 and 5/5 green, `npm run typecheck` clean again. |

## Witness NAME diff against main `b244551`

**0 files.** Every sealed/parity/regression-witness file above reproduces its TPV-pinned count exactly on `9ac0fa3` — no test that passed on `b244551` fails now, and no new failure name appears anywhere in the measured set.

## Rule 16 — every `CLEARGATE_META_ROOT` test, SOLO, worktree as meta-root

`command grep -rl CLEARGATE_META_ROOT cleargate-cli/test` returns 22 paths; one (`test/helpers/scaffold-roots.ts`) is a helper module, not a runnable test, leaving 21 test files. Ran each SOLO with `CLEARGATE_META_ROOT=/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/STORY-058-08`:

- **20/21 green:** `new-command.node.test.ts` 57/57, `no-exec-mode-vocab.node.test.ts` 4/4, `claude-md-block-leads-relocation.red.node.test.ts` 4/4, `clean-room-verification-doc.red.node.test.ts` 9/9, `test-layers-declared-doctrine.red.node.test.ts` 11/11, `frontmatter-authoring.red.integration.node.test.ts` 9/9, `spidr-coverage.red.integration.node.test.ts` 1/1, `hook-signal.red.integration.node.test.ts` 3/3, `hook-signal.red.node.test.ts` 14/14, `pre-tool-use-task.node.test.ts` 13/13, `token-ledger-attribution.node.test.ts` 9/9, `token-ledger-regression.node.test.ts` 14/14, `readiness-predicates-spidr-coverage.red.node.test.ts` 32/32, `readiness-predicates-test-layers-declared.red.node.test.ts` 17/17, `enforcement-doc-coherence.node.test.ts` 26/26, `file-surface-gate-e2e.node.test.ts` 21/21, `pre-commit-downstream-safe.node.test.ts` 12/12, `ratchet-retired.node.test.ts` 8/8, `scaffold-relocation.red.node.test.ts` 15/15 (unlike TPV's own git-archive scratch root, the real worktree IS a git repo, so this file's git-tracked-file assertion is fully satisfied here — 15/15, not TPV's 14/15), `bucket-registry-parity.red.node.test.ts` 11/11.
- **1/21 structural, pre-existing, unrelated to this story:** `test/scripts/close-sprint-assume-ack-guard.node.test.ts` throws `ENOENT` reading `<META_ROOT>/cleargate-cli/src/commands/sprint.ts`. This file's `REPO_ROOT` (when `CLEARGATE_META_ROOT` is set) expects a directory that itself contains a nested `cleargate-cli/` checkout, mirroring the real outer-repo layout. `.worktrees/STORY-058-08` is a `git worktree` of the *outer* repo only — `cleargate-cli/` is a separate, gitignored git checkout that worktree creation never materializes inside a new worktree (confirmed: `ls .worktrees/STORY-058-08/` has no `cleargate-cli/` entry). This is the same class of harness gap the TPV named for `scaffold-relocation.red.node.test.ts` (a fixture-root shape mismatch, not a code regression) — it is orthogonal to `verify-install`/`cli-package-root`/`init.ts`/`cli.ts`/`CHANGELOG.md`, none of which this test reads, and it would fail identically against any other story's worktree used the same way.

## Smoke (one literal tmp call)

```
(cd /private/tmp/cg-s41-058-08-smoke && \
  git init -q && \
  npx --prefix <CLI> tsx <CLI>/src/cli.ts init --yes --from-source <CLI>/scaffold --pin 0.0.0-m4 && \
  npx --prefix <CLI> tsx <CLI>/src/cli.ts verify-install; echo "exit=$?")
```

Result: init exit 0 (a fresh `--from-source` install), no `cleargate-cli` entry in the room (M4-A1, confirmed with a direct existence check), `verify-install` exit 0:

```
cleargate verify-install — /private/tmp/cg-s41-058-08-smoke (cleargate 0.26.1; verifying: claude)
PASS  snapshot
PASS  version-match
PASS  manifest-hosts
PASS  payload-files
PASS  pin-substituted
PASS  gitignore-generated
PASS  doctor
PASS  claude.settings-hooks
PASS  claude.hooks-executable
PASS  claude.no-foreign-hooks
PASS  claude.instruction-block
PASS  claude.mcp-registration
NOT CHECKED — needs a live host session:
  claude.live.session-start  ...
  claude.live.pre-tool-use  ...
  claude.live.post-tool-use  ...
  claude.live.dispatch  ...
  claude.live.agents-skills  ...
  claude.live.mcp-connect  ...
Result: PASS
exit=0
```

`version-match` passes because `--from-source`'s composed snapshot's `cleargate_version` and `verify-install`'s own default `version` resolution both route through the *same* running package (`findCleargatePackageRoot` walking up from the running tsx module), so they agree — this is the expected "verify with the running version" case named in the dispatch, not a from-source-specific special case.

## Outer status

**Start** (outer main checkout, matches the conversation's opening `git status`):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2345-23886-23307.json
```

**End** (outer main checkout):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Identical modulo the pending-task JSON, which is hook/orchestrator-owned housekeeping this dispatch never touched. This dispatch made no writes to the outer main checkout — all outer writes landed in `.worktrees/STORY-058-08` and are committed there.

## New anchors for -09, -10, -13

- **`HOST_VERIFIERS`** — `src/commands/verify-install.ts:532-534`: `export const HOST_VERIFIERS: Readonly<Record<string, HostVerifier>> = Object.freeze({ claude: claudeVerifier });`. -10/-13 add a `codex` key to this same object; there is no second driver.
- **Check ids** (pinned order, `EXPECTED_CHECK_IDS` in the test file, produced in this exact order by `runVerifyInstall`): `snapshot`, `version-match`, `manifest-hosts`, `payload-files`, `pin-substituted`, `gitignore-generated`, `doctor`, then per verified host in registry order: `claude.settings-hooks`, `claude.hooks-executable`, `claude.no-foreign-hooks`, `claude.instruction-block`, `claude.mcp-registration` (or `<host>.no-verifier` for an installed+registered host with no `HOST_VERIFIERS` entry).
- **`runVerifyInstall`** — `src/commands/verify-install.ts:538`: `export async function runVerifyInstall(opts: VerifyInstallOptions = {}): Promise<VerifyInstallReport>`.
- **`verifyInstallHandler`** — `src/commands/verify-install.ts:651`: `export async function verifyInstallHandler(opts: VerifyInstallCliOptions, cli: Omit<VerifyInstallOptions, 'cwd' | 'host'> & { stdout?; stderr?; exit? } = {}): Promise<void>`.
- **`cli.ts` `verify-install` block** — import `src/cli.ts:35` (the line after the `hookSignalHandler` import at `:34`); the `program.command('verify-install')` block is `src/cli.ts:637-645`, immediately before `program` `:647` / `.command('upgrade')` `:648` (both shifted by exactly one line from the pre-dispatch `:636`/`:637` cited in the plan/TPV, since this insertion is itself the one new block).
- **`findCleargatePackageRoot`** — `src/lib/cli-package-root.ts:16`: `export function findCleargatePackageRoot(startDir: string): string | undefined`.

## Deviations from H1-H24 and the D-rows

None. Every binding constraint (H1-H24, D1-D10) was followed as written; no plan mismatch or spec conflict was hit. The one judgment call not fully pinned by the catalogue — the exact prose for check 3's "installed host not registered" detail (rule a) and the settings-triple/no-foreign-hooks detail strings beyond the catalogue's literal templates (H7's "every other detail names the offending path") — follows QA-Red's own documented ambiguity #3 (substring latitude): tests assert `.includes(...)` on the substrings the catalogue names, and my wording satisfies every one of those `.includes()` checks. Not logged as a deviation since it is explicitly the latitude the TPV granted, not a departure from it.

## Task Breakdown

Not ticked, per dispatch instruction ("Don't tick the Task Breakdown").

## Script Incidents

None. Every command in this dispatch was a direct `npm run typecheck` / `npx tsx --test` / `npx tsx <cli.ts>` / `git` / `find`/`shasum` invocation — no wrapped `.cleargate/scripts/*` script was executed.

## Flashcards

flashcards_flagged:
  - "2026-09-26 · #verify-install #test-harness · A worktree lacks any gitignored sibling repo (cleargate-cli/); META_ROOT tests expecting one (close-sprint-assume-ack-guard) ENOENT there, unrelated to the story under test."

## Round 2 (M4-A14)

role: developer

QA-Verify and the Architect post-flight both FAILED `9ac0fa3` on two `verify-install.ts` defects (H17/M4-A5 fail-closed violation; a snapshot-shape crash), plus a DoD doc-fold-back gap. QA-Red re-sealed first (`4285391`, U9c/U11e/U11f). This round implements M4-A14 R-A, R-B and R-C.

### Commits

**Cli.** `story/STORY-058-08` @ `fc0184d` (one commit on top of the round-2 QA-Red `4285391`, on `9ac0fa3`):

```
fix(EPIC-058): STORY-058-08 round 2 — no-verifier guard + snapshot shape guard (M4-A14)
```

**Outer.** worktree `.worktrees/STORY-058-08` @ `31f266f2` (one commit on top of `adde0a23`):

```
docs(SPRINT-41): STORY-058-08 round 2 — clean-room doc fold-back (M4-A14)
```

### Diff stats

| Repo | File | Stat |
|---|---|---|
| cli | `src/commands/verify-install.ts` | 1 file changed, 36 insertions(+), 3 deletions(-) |
| outer | `.cleargate/knowledge/clean-room-verification.md` | 1 file changed, 37 insertions(+), 11 deletions(-) |

No other file changed in either repo (§3.1 unchanged, as M4-A14 requires).

### R-A — no-verifier guard

The `<h>.no-verifier` push now requires `installed.includes(host)` in addition to the existing `registeredNames.includes(host as HostName)` check, in the same `if` condition, in `runVerifyInstall`'s host loop. `installed` was already computed (`installedHosts(snapshot)` or `[]`), so this is a one-condition addition — no new variable, no change to the `verified`/host-resolution formula (M4-A5 untouched).

### R-B — snapshot shape guard

Added `isInstallSnapshotShape(value): value is ManifestFile` (a type-guard function, module-private) and routed the snapshot read through it: `JSON.parse` result is checked for shape (non-null non-array object, string `cleargate_version`, `files` an array of objects each with a string `path`, `hosts` absent or a string array) before being assigned to `snapshot`; a shape failure produces the same pinned `unparseable: .cleargate/.install-manifest.json` detail as a JSON-parse failure, and `snapshot` stays `null`. No change to the skip rule, the M4-A5 fallback, or any downstream check — they already branch on `snapshot`/`snapshotOk`, which now can never hold a malformed value.

### R-C — doc fold-back

Five edits to `.cleargate/knowledge/clean-room-verification.md`, all within §2, §4 and §5 (no §1/§3/§6/`## Other hosts`/`## Purpose`/the three "Why not" sections touched):
- §5 S1: now directs authoring the item with `cleargate new epic <slug>` plus the five F7 edits before the `Edit`, and states that an unauthored fresh scaffold logs `gate=1` by design (F7) — `stamp=0`/`ingest=0` are the real pass criteria otherwise.
- §4: corrected the `scaffold-lint` target from `cleargate-cli/scaffold/` to `<cwd>/cleargate-planning/` (`scaffold-lint.ts:57`).
- §2: widened the scrub list from three named `CLAUDE*` variables to every `CLAUDE*`-prefixed name, every `CLEARGATE_*`, every `SKIP_*`, and `ORCHESTRATOR_PROJECT_DIR`.
- §2: added the measured `/bin/sh -c` hook-invocation fact (the identity gate carries into the hooks).
- §5 `claude.live.mcp-connect`: added the record-only caveat (published `cleargate@<pin>`, outside the artifact) and the `claude.ai` account-connector caveat (filter by name).

Verified after editing: all 12 pinned H2 headings present, exactly one `npm publish` line (still guarded by `No`), and the lowercase `recreated per run` phrase unchanged (`command grep` checks, shown below).

### Counts

| Check | Expected | Measured |
|---|---|---|
| `npm run typecheck` | exit 0 | exit 0 |
| Unit `verify-install.red.node.test.ts`, SOLO | 41/41 | 41/41 (two runs, identical) |
| Integration `verify-install-cli.red.integration.node.test.ts`, SOLO | 5/5 | 5/5 |
| Doc `clean-room-verification-doc.red.node.test.ts`, SOLO, `CLEARGATE_META_ROOT`=worktree, after the outer commit | 9/9 | 9/9 |
| Sealed -03..-07 + BUG-085 (17 files) + parity (2 files) | unchanged | re-ran all 19, all match the round-1 counts exactly (19/19, 11/11, 17/17, 6/6, 18/18, 10/10, 13/13, 10/10, 6/6, 16/16, 4/4, 4/4, 3/3, 3/3, 24/24, 13/13, 13/13; parity 5/5, 15/15) |
| Baseline hash (`/private/tmp/cg-s41-m2-init-baseline`, 425 files) | `bdc4bb1a…62b2` unchanged | `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — unchanged |
| Red-without-R-A/R-B (mandatory verification) | U9c+U11e+U11f fail, nothing else | Reverted only `src/commands/verify-install.ts`'s round-2 diff (saved via `git diff`, restored via `git checkout --`/`git apply`; no `git stash`) → unit 38 pass / 3 fail, and the 3 failing test names were exactly "a parseable non-snapshot body never crashes…" (U9c), "manifest-hosts still reports \"fake not installed\"; fake.no-verifier never appears" (U11e), and "fake.no-verifier never appears when the snapshot is absent…" (U11f). Restored, re-verified 41/41 and typecheck clean. |

### Doc phrase checks (after R-C edits)

```
$ command grep -n "npm publish" clean-room-verification.md
91:No `npm publish`, no push. Precedent:
$ command grep -n "recreated per run" clean-room-verification.md
65:It is disposable and recreated per run: the container must not exist before
$ command grep -n "command -v cleargate" clean-room-verification.md
101:**Identity gate (F1).** `command -v cleargate` must print
$ command grep -c "^## " clean-room-verification.md
12
```

### Smoke (one literal tmp call)

```
(cd /private/tmp/cg-s41-058-08-r2-smoke && \
  git init -q && \
  npx --prefix <CLI> tsx <CLI>/src/cli.ts init --yes --from-source <CLI>/scaffold --pin 0.0.0-m4 && \
  npx --prefix <CLI> tsx <CLI>/src/cli.ts verify-install; echo "exit=$?" && \
  printf 'null' > .cleargate/.install-manifest.json && \
  npx --prefix <CLI> tsx <CLI>/src/cli.ts verify-install --json; echo "exit=$?")
```

Result:
- Fresh install → `verify-install` exit 0, all 12 checks `PASS`, `Result: PASS`.
- After overwriting the snapshot with the literal `null`: `verify-install --json` printed parseable JSON — `"snapshot": { "status": "fail", "details": ["unparseable: .cleargate/.install-manifest.json"] }`, `version-match`/`manifest-hosts`/`payload-files`/`pin-substituted`/the five `claude.*` checks all `"skip"`, `"installed": []`, `"ok": false` — and exited 1. No crash, no stack trace, no empty stdout.

### Outer status

**Start** (outer main checkout):
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

**End** (outer main checkout): identical — this dispatch made no writes to the outer main checkout; both round-2 writes landed in `.worktrees/STORY-058-08` and are committed there.

### Deviations

None. R-A, R-B and R-C were implemented exactly as M4-A14 specifies (verbatim guard condition, verbatim shape rule and pinned detail string, and all five named doc fold-backs) — no reinterpretation, no additional scope. Touched only `src/commands/verify-install.ts` and the outer doc, per the dispatch's "The Dev touches only..." line.

### Flashcards

flashcards_flagged: []

STATUS=done
