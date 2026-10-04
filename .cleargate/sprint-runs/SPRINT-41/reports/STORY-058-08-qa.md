# STORY-058-08 — QA-Verify report

role: qa

STORY: STORY-058-08

QA: FAIL — H17/M4-A5 fail-closed rule violated: `<h>.no-verifier` is emitted for a `--host h` that is *registered but not installed* (confirmed by direct probe below), when the binding TPV constraint requires it to fire only when the host is installed AND registered AND has no verifier. Everything else — all 5 Gherkin scenarios, 52 sealed tests, byte-identical baselines/regressions, and the full clean-room DoD run (zero doc gaps) — checks out clean. This is a scoped, single-condition fix; ordinary QA bounce, round 1.

## 1. Scope check

| Check | Expected | Measured | Match |
|---|---|---|---|
| `git diff 549fdaa 9ac0fa3 --stat` (cli) | `CHANGELOG.md`, `src/cli.ts`, `src/commands/init.ts`, `src/commands/verify-install.ts`, `src/lib/cli-package-root.ts` | exactly those 5 files (10/+11/+22/+692 new/+41 new) | yes |
| `test/` diff (cli) | empty | empty (`git diff 549fdaa 9ac0fa3 -- test/` = no output) | yes |
| Outer diff (`787dc899`→`adde0a23`) | doc only | `.cleargate/knowledge/clean-room-verification.md` (A, 216 lines) only | yes |

## 2. Typecheck

`npm run typecheck` (cli main checkout, `story/STORY-058-08` @ `9ac0fa3`) — **exit 0**.

## 3. Re-run SOLO

| Suite | Expected | Measured |
|---|---|---|
| Unit `verify-install.red.node.test.ts` | 38/38 | 38 tests, 38 pass, 0 fail |
| Integration `verify-install-cli.red.integration.node.test.ts` | 5/5 | 5 tests, 5 pass, 0 fail |
| Doc `clean-room-verification-doc.red.node.test.ts` (`CLEARGATE_META_ROOT=.worktrees/STORY-058-08`) | 9/9 | 9 tests, 9 pass, 0 fail |

**Spot-checked 4 sealed files, SOLO, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`:**

| File | TPV/Dev count | QA measured |
|---|---|---|
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 |
| `test/lib/drift-check-scaffold.red.node.test.ts` (BUG-085) | 24/24 | 24/24 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 |

**Both parity files, compare mode:**

| File | TPV/Dev count | QA measured |
|---|---|---|
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5/5 | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15/15 | 15/15 |

**Baseline hash** (`/private/tmp/cg-s41-m2-init-baseline`, 425 files, absolute paths, `find -print0 \| sort -z \| xargs -0 shasum -a 256 \| shasum -a 256`):
`bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — matches the TPV/Dev-recorded value exactly, before this dispatch touched anything and after (never written to).

**TESTS (targeted, per Rule 14 — no full `npm test` run in the cli main checkout):** 137 passed, 0 failed, 0 skipped (38 unit + 5 integration + 9 doc + 65 spot-checked sealed + 20 parity).

## 4. H1–H24 conformance (by diff read against `story/STORY-058-08` @ `9ac0fa3`)

| Item | Verdict | Note |
|---|---|---|
| H1 `cli-package-root.ts` | conforms | exact signature, walk, unparseable/foreign-name skip, `undefined` at root |
| H2 `init.ts` routing | conforms | `git diff --numstat` reads `3 19`; routes through `findCleargatePackageRoot` verbatim per M3 V3 |
| H3 pinned exports/types | conforms | `HOST_VERIFIERS` frozen `{ claude }`; defaults via `findCleargatePackageRoot`; never `resolveDefaultPayloadDir()` |
| H4 usage errors first (M4-A8) | conforms | order is cwd-resolve → `registry.resolve(host)` → cwd-exists check → snapshot/checks/doctor; never creates a dir |
| H5 host resolution / M4-A5 fallback | conforms | `verified` formula matches exactly; `report.installed` is `[]` when snapshot absent |
| H6 skip rule, exact | conforms | checks 2–5 + host checks skip on check-1 fail only; 6/7 always run; 8/11 skip on version-mismatch only; `ok = every(pass)` |
| H7 detail templates | conforms | `absent:`/`unparseable:` distinguished; version-match sentence verbatim; `<h> not installed`; `(owner <o>)`; `missing: <path> (tier <t>)`; `this cleargate cannot verify host <h>` — all byte-exact |
| H8 check 5 (`PIN_PLACEHOLDER`) | conforms | imported from `copy-payload.js`, never re-typed; `grep -c __CLEARGATE_VERSION__ src/commands/verify-install.ts` = 0 |
| H9 checks 3/4 | conforms | `installedHosts`/`entryOwner` only (never `e.owner`/`snapshot.hosts`); check 4 via `selectEntriesForHosts` only |
| H10 check 6, line-anchored | conforms | `lines.includes(...)` exact-line match, not substring |
| H11 check 7 doctor seam (M4-A7) | conforms | `doctorHandler({}, {..., exit: throwing seam})`; stdout/stderr are no-ops; never `checkScaffold` |
| H12 check 8, matcher-inclusive | conforms | triple compare includes `matcher`; U7b passes |
| H13 check 9 | conforms | snapshot-hook-glob ∪ settings-referenced scripts; missing files not reported here |
| H14 check 10 | conforms | `--host x≠claude` flagged; `pathUnderRoots` against other adapters' owned+shared roots; `echo hi` passes |
| H15 check 11, anchored | conforms | exact-line START/END count, then `extractBlock` deep compare |
| H16 check 12, deep compare | conforms | `isDeepStrictEqual(mcpServers.cleargate, buildStdioEntry(...))` |
| **H17 fail-closed** | **VIOLATED** | see finding below — no-verifier fires without checking `installed` |
| H18 live list | conforms | 6 ids + conditional `agents-md-exposure`; concatenates only verified hosts with a verifier |
| H19 output | conforms | header/PASS-FAIL-SKIP/NOT CHECKED line/Result line all match; `--json` is bare `JSON.stringify`; always calls `exit` |
| H20 `cli.ts` | conforms | import after `:34`; block immediately before `.command('upgrade')`; not in `GATED_COMMANDS`; `+11/-0` |
| H21 `CHANGELOG.md` | conforms | FU-10 bullet appended to existing `### Added`; FU-11 BUG-085 sentinel bullet appended after `### Fixed` |
| H22 untouched surfaces | conforms | no `scaffold/**`, `templates/**`, `scripts/**`, `package.json`, lockfile changes |
| H23 Dev verification | conforms | Dev report shows red-without-code round-trip, full count table, Rule 16 sweep (20/21 green, 1 pre-existing structural gap named) |
| H24 fresh-clone `templates/cleargate-planning` | conforms | QA's own fresh `git clone` + `npm run build` reproduced the artifact from commit `9ac0fa3` exactly (see §5) |

**H17 finding, reproduced directly** (adhoc probe against the real `runVerifyInstall`, U11a's exact registry/fixture shape: `registry = {claude, fake([.fakehost])}`, snapshot `hosts:['claude']` only, `--host fake`):

```
checks: [..., manifest-hosts:fail("fake not installed"), ..., fake.no-verifier:fail("this cleargate cannot verify host fake")]
verified: ['fake']
```

M4-A5 / H17 binding text: *"`<h>.no-verifier` is emitted only for a host that is installed, registered and has no verifier. It is never emitted under the fallback, and never for a `--host h` that is registered but not installed; that case is manifest-hosts' `h not installed`."* U11a's own test only asserts on the `manifest-hosts` check and never asserts the *absence* of `fake.no-verifier`, so this passes 38/38 today but is a confirmed, reproducible deviation. It also contradicts the Dev report's "Deviations from H1-H24 and the D-rows: None."

**Required fix (scoped, one condition):** in `runVerifyInstall`'s no-verifier loop (`src/commands/verify-install.ts` around line 608), gate the `<h>.no-verifier` push on `installed.includes(host)` in addition to `registeredNames.includes(host)`. Verified this does not regress U12 (there, `snap.hosts = ['claude','fake']` makes `fake` genuinely installed, so the fix still fires) or U12b/U11a.

## 5. Gherkin + DoD map

| §2.1 scenario | Test(s) | Clean-room confirmation |
|---|---|---|
| Driver passes on a correct install | U1, I1 | `verify-install` → `Result: PASS`, exit 0, on the fresh no-flag room |
| Driver fails on a missing payload file | U2, I2 | break test: deleted `.cleargate/knowledge/cleargate-protocol.md` → exit 1, `FAIL payload-files` naming it exactly |
| Driver catches an unsubstituted version pin | U3a, U3b | not separately re-broken in the clean room (unit-covered; not required by the dispatch's break-test scope) |
| Driver catches a lost hook executable bit | U4, U4b | not separately re-broken in the clean room (unit-covered) |
| Procedure is committed and names its constraints | D1, D2 | confirmed by direct read: sections outside-repo/outside-`/tmp`, dogfood-witness rationale, all present verbatim |

| DoD item | Status |
|---|---|
| §4.1 minimum test expectations | met — unit 38 (≥4), integration 5 (≥1), e2e = this clean-room run (≥1) |
| All §2.1 Gherkin scenarios covered | yes (table above) |
| Peer/Architect Review passed | TPV report exists (REJECTED → R1–R17 re-seal, then green); however TPV's 58-mutant set did not include an explicit-`--host`-registered-but-uninstalled no-verifier mutant, so it did not catch the H17 escape found here |
| Procedure followed once by someone other than its author | **done in this dispatch** — see §6, zero structural doc gaps |

## 6. THE CLEAN-ROOM RUN (DoD item, followed verbatim)

**Container** (left in place per the doc): `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T042955Z-qa08/`
**`<ref>`:** `story/STORY-058-08` — **`<cli>`:** `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`

| Step | Command | Result |
|---|---|---|
| 1. Build | `git clone --no-hardlinks --branch story/STORY-058-08 <cli> <C>/src`, symlink `node_modules`, `npm run build`, `npm pack` | clone HEAD `9ac0fa39b52a52cbc6681305c7a202fc218c9f93` — **matches the Dev commit exactly**; build succeeded (ESM/CJS/DTS); `npm pack` → `cleargate-0.26.1.tgz`, sha256 `14018281def428a659a3c3abec1ceb7c9aca7517bc93079b1595baf358941bf3` |
| 2. Install | `npm install --global --prefix <C>/tools <C>/artifact/cleargate-0.26.1.tgz`; identity gate | `command -v cleargate` → `<C>/tools/bin/cleargate`; `cleargate verify-install --help` → exit 0. Env scrubbed (`CLAUDE_*`, `ORCHESTRATOR_PROJECT_DIR`, `SKIP_*_GATE`, every `CLEARGATE_*`) |
| 3. Create room | `mkdir <C>/repo-noflag && (cd <C>/repo-noflag && git init -q && cleargate init --yes)` | exit 0. Top level: `.claude`, `.cleargate`, `.git`, `.gitignore`, `.mcp.json`, `CLAUDE.md` — matches F10. No `cleargate-cli` entry (M4-A1 confirmed) |
| 4. Machine checks | `cleargate verify-install --json`, `cleargate doctor`, `cleargate doctor --check-scaffold` | verify-install exit 0, `ok:true`, all 12 checks `pass`, `live` lists the 6 unconditional ids, `installed=verified=registered=['claude']`; `doctor` exit 0; `--check-scaffold` → `1 upstream-changed` (info only — matches F8 exactly) |
| Break test | delete `.cleargate/knowledge/cleargate-protocol.md`; re-run `verify-install` | exit 1, `FAIL payload-files` / `missing: .cleargate/knowledge/cleargate-protocol.md (tier protocol)`, `Result: FAIL (1 of 12 checks failed)` — restored the file afterward, re-ran → `Result: PASS`, exit 0 |
| 5. Live host — S1 | `claude -p "<S1 prompt>" --setting-sources project,local --permission-mode bypassPermissions --model claude-haiku-4-5-20251001 --output-format stream-json --verbose --include-hook-events --max-turns 4/6 < /dev/null`, twice (see Gaps) | see below |

**S1 evidence (2nd, corrected run — `cleargate new cr "qa058-08-canary"` then one `Edit` on the body):**

| `claude.live.*` id | Confirmed | Evidence |
|---|---|---|
| `session-start` | yes | `SessionStart:startup` hook_response `exit_code 0`, output starts `ClearGate state: pre-member — local planning enabled, sync requires join.` |
| `pre-tool-use` | yes | `PreToolUse:Edit` hook_response `exit_code 0` (S1 exercised `Edit`; the first S1 attempt also exercised `Write` at `exit_code 0`) |
| `post-tool-use` | yes (with a wording caveat — see Gaps §2) | `PostToolUse:Edit` `exit_code 0`; matching `gate-check.log` line: `stamp=0 gate=1 ingest=0` — stamp and ingest succeeded (no BUG-067 phantom-block corruption); gate=1 because a freshly-`cleargate new`-scaffolded CR gates 1 by design (F7), not a defect |
| `dispatch` | **not run** — dispatch scope was "ONE S1 headless Claude session"; S2 (Agent dispatch) is out of this dispatch's scope, not a gap |
| `agents-skills` | yes | `system/init.agents` = the 11 ClearGate agents + 5 built-ins (16, matches F3 exactly, named list confirmed); `system/init.skills` = the 3 ClearGate skills + built-ins (21) |
| `mcp-connect` | yes | `system/init.mcp_servers` includes `{name:'cleargate', status:'connected', source:'project'}` |
| `agents-md-exposure` | N/A | no-flag room has no `AGENTS.md`; correctly absent from `live` (confirmed in the machine-check JSON) |

`claude -p` exited 0 both times. `claude_code_version` 2.1.283, `permissionMode: bypassPermissions`.

**Gaps found following the doc verbatim** (the DoD's "every step that needed knowledge not in the document"):

1. Step 5's exact S1/S2 prompt wording is not in this doc — the doc itself says *"verbatim wording lives in STORY-058-09's harness once it lands"*. This is a pre-disclosed forward-reference, not a silent omission, so it is **not counted** as a fault against -08's own doc. QA authored its own S1 prompt from the doc's functional description (one `Edit` on a freshly authored delivery item).
2. My first S1 attempt used an arbitrary filename (`qa058-08-canary.md`, no frontmatter) as the "freshly authored delivery item." The doc's `claude.live.post-tool-use` bullet gives `stamp=0 gate=0 ingest=0` as the example matching log line, but a bare, non-work-item-shaped file makes stamp *and* gate *and* ingest all fail at once (`stamp=1 gate=1 ingest=1`) rather than illustrating the intended distinction. A second attempt using `cleargate new cr "<slug>"` (a real, correctly-shaped item) reproduced `stamp=0 gate=1 ingest=0` — stamp/ingest genuinely pass; gate=1 is F7's documented by-design behavior for an unresolved fresh scaffold, not a bug. **Fold-back suggestion:** name the required item shape ("use `cleargate new <type>` to author it, not an arbitrary file") and note that `gate=1` on a bare fresh scaffold is expected (cross-reference F7), so only `stamp=0`/`ingest=0` are the check's actual pass criteria.

No other step needed outside knowledge. Zero *structural* doc gaps (all 12 pinned H2 headings present with pinned content, verified independently of the passing D1/D2 tests).

**Observation, not a gap:** this machine's `system/init.mcp_servers` also listed account-level `claude.ai` connectors (Gmail, Calendar, Drive, Docs) alongside `cleargate`, even under `--setting-sources project,local`. These are account-level OAuth connectors, not project/user *settings-file* layers, so `--setting-sources` correctly has no effect on them — F3's isolation claim is about plugins/hooks/skills from settings files, which held (confirmed via `plugins`/`agents`/`skills` lists), not MCP connectors from the account. Not a doc defect.

## 7. Outer status

**Start:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
?? .cleargate/sprint-runs/SPRINT-41/.pending-task-2355-7914-32285.json
```

**End:**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
(the pending-task JSON is hook/orchestrator-owned housekeeping, unrelated to and untouched by this dispatch). Cli main checkout: only the pre-existing untracked `cleargate-0.25.0.tgz`, unchanged. Outer worktree `.worktrees/STORY-058-08` @ `adde0a23`: clean. No writing CLI command ran against the outer repo, `cleargate-cli` main checkout, or the outer worktree — every `init`/`verify-install`/`doctor`/`claude -p` invocation ran as a single `(cd <literal clean-room path> && ...)` call against `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T042955Z-qa08/repo-noflag`, never against this repo.

## 8. Script Incidents

None. Every command was a direct `git`/`npm`/`node`/`tsx --test`/`claude -p`/`shasum`/`find` invocation, or a read-only inspection — no wrapped `.cleargate/scripts/*` script was executed.

## flashcards_flagged

flashcards_flagged:
  - "2026-09-26 · #verify-install #qa #fail-closed · <h>.no-verifier fires for --host h registered-but-not-installed; H17/M4-A5 require gating on installed too, not just registered."
  - "2026-09-26 · #clean-room #claude-p #test-harness · An S1 canary Edit target must be a real cleargate new <type> item to get a genuine stamp/gate/ingest log line; an arbitrary filename fails all three at once."

## Round 2 — M4-A14

QA-R2: PASS — R-A (no-verifier guard) and R-B (snapshot shape guard) both reproduce and hold under direct re-probe against the Dev's actual `fc0184d` binary (not just the unit suite); R-C folds in every one of the five M4-A14 bullets verbatim, including round 1's own gap-2 fold-back suggestion, with all D1–D10 phrases and headings intact.

### 1. Scope

| Check | Expected | Measured | Match |
|---|---|---|---|
| `git diff 4285391 fc0184d --stat` (cli) | `src/commands/verify-install.ts` only | `src/commands/verify-install.ts \| 39 ++++++++++++++++++++++++++++++++++++---` (1 file, 36 ins / 3 del) — only file | yes |
| `test/` diff since `4285391` | empty | `git diff 4285391 fc0184d -- test/` = no output | yes |
| Outer `adde0a23..31f266f2` diff | doc only | `.cleargate/knowledge/clean-room-verification.md \| 48 +++++++++++++++++++------` (37 ins / 11 del) — only file | yes |

### 2. Typecheck

`npm run typecheck` (cli main checkout, `story/STORY-058-08` @ `fc0184d`) — **exit 0**.

### 3. SOLO runs

| Suite | Expected | Measured |
|---|---|---|
| Unit `verify-install.red.node.test.ts` | 41/41 | 41 tests, 41 pass, 0 fail |
| Integration `verify-install-cli.red.integration.node.test.ts` | 5/5 | 5 tests, 5 pass, 0 fail |
| Doc `clean-room-verification-doc.red.node.test.ts` (`CLEARGATE_META_ROOT`=worktree @ `31f266f2`) | 9/9 | 9 tests, 9 pass, 0 fail |

**Spot-checked 4 sealed files + both parity files, SOLO, `CLEARGATE_INIT_BASELINE=/private/tmp/cg-s41-m2-init-baseline`:**

| File | Round-1 count | Round-2 measured |
|---|---|---|
| `test/hosts/host-adapter-contract.red.node.test.ts` | 19/19 | 19/19 |
| `test/commands/upgrade-per-host.red.node.test.ts` | 6/6 | 6/6 |
| `test/lib/drift-check-scaffold.red.node.test.ts` (BUG-085) | 24/24 | 24/24 |
| `test/commands/uninstall-per-host.red.node.test.ts` | 16/16 | 16/16 |
| `test/hosts/claude-adapter-init-parity.red.integration.node.test.ts` | 5/5 | 5/5 |
| `test/commands/init-host-parity.red.integration.node.test.ts` | 15/15 | 15/15 |

**Baseline hash** (`/private/tmp/cg-s41-m2-init-baseline`, 425 files, absolute paths): `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — unchanged, matches round 1 exactly.

### 4. H17 re-probe (R-A)

Same fixture shape as round 1's finding: `registry={claude, fake([.fakehost])}`, `--host fake`, run directly against `runVerifyInstall` at `fc0184d`.

| Case | `fake.no-verifier` present? | `manifest-hosts` |
|---|---|---|
| snapshot present, `hosts:['claude']`, `--host fake` (registered, not installed) | **no** (fixed — round 1 had `fail`) | `fail`, detail `["fake not installed"]` — still correctly reported |
| snapshot deleted, `--host fake` | **no** (fixed) | `skip` (correct, per the M4-A5 fallback) |

R-A confirmed fixed by direct reproduction, not just by the unit suite (U11e/U11f also independently confirm this: 41/41 green).

### 5. R-B probe (fresh sibling room, new container, fc0184d binary)

- Copied the round-1 evidenced room without mutating it: `cp -a <C>/repo-noflag <C>/repo-noflag-r2` (`<C>` = `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T042955Z-qa08/`). Verified the original `repo-noflag`'s file listing is untouched (diff shows only the path-prefix change, no content divergence).
- The doc supports only the packed-artifact route (no tsx-run alternative is described in it), so rebuilt a **new container** for the `fc0184d` binary: `git clone --no-hardlinks --branch story/STORY-058-08 <cli> <C2>/src` → clone HEAD **`fc0184dee59dbe79946fe615f2c0d035e92f10c5`** (exact match to the Dev's round-2 commit) → `npm run build` → `npm pack` → `cleargate-0.26.1.tgz`, sha256 `d1cbe3504e9271173c41e913e65066d9e1fc29a9d12e3e0f80ee5d60b3f055aa` → `npm install --global --prefix <C2>/tools` → identity gate: `command -v cleargate` → `<C2>/tools/bin/cleargate`, `verify-install --help` exit 0.
- Wrote the literal `null` into `<C>/repo-noflag-r2/.cleargate/.install-manifest.json`, then ran `cleargate verify-install --json` (PATH pointed at `<C2>/tools/bin`, cwd = `<C>/repo-noflag-r2`, env scrubbed as in round 1).

**Result:**
```
exit=1
stderr: (empty — no stack trace)
snapshot check: {"id":"snapshot","owner":"core","status":"fail","details":["unparseable: .cleargate/.install-manifest.json"]}
installed: []
other checks: version-match:skip, manifest-hosts:skip, payload-files:skip, pin-substituted:skip,
  gitignore-generated:pass, doctor:pass, claude.settings-hooks:skip, claude.hooks-executable:skip,
  claude.no-foreign-hooks:skip, claude.instruction-block:skip, claude.mcp-registration:skip
```
Exit 1, JSON parses, `snapshot` fails with the pinned `unparseable:` detail (never a crash/stack trace), checks 2–5 and the 5 claude checks skip, checks 6/7 (gitignore/doctor, which never depend on the snapshot) still run and pass, `ok:false`. Matches M4-A14 R-B and the Dev's own smoke exactly.

New container (left in place, per the doc, alongside the round-1 container): `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T050106Z-qa08-r2/`. `<ref>` = `story/STORY-058-08`, `<cli>` = `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`.

### 6. R-C doc fold-back

Read `git diff adde0a23 31f266f2 -- .cleargate/knowledge/clean-room-verification.md` in full against every M4-A14 R-C bullet:

| R-C bullet | Folded in? |
|---|---|
| §5 S1: author via `cleargate new epic <slug>` + the five F7 edits (verbatim list) before the `Edit`; state that an unauthored fresh scaffold logs `gate=1` by design and a non-work-item file fails stamp+gate+ingest | yes — verbatim, matches round 1's own QA gap-2 fold-back suggestion almost word for word |
| §4: `scaffold-lint` targets `<cwd>/cleargate-planning/` (`scaffold-lint.ts:57`), not `cleargate-cli/scaffold/` | yes |
| §2 scrub list: every `CLAUDE*`, every `CLEARGATE_*`, every `SKIP_*`, `ORCHESTRATOR_PROJECT_DIR` | yes |
| §2 identity gate: hooks run as `/bin/sh -c "<command>"` inheriting the launcher's PATH (measured 2.1.283) | yes |
| §5 `claude.live.mcp-connect`: record-only (`.mcp.json` runs published `npx -y cleargate@<pin>`, outside the artifact); select by `name`, not count, since `claude.ai` account connectors also appear | yes |

**Invariants held** (independently re-measured, not just cited from the Dev report):
- 12 pinned `## ` headings present (`grep -c "^## "` = 12).
- Exactly one `npm publish` mention, still guarded (`No \`npm publish\`, no push.`, line 91) — no new mention added.
- `recreated per run` (line 65), `/private/tmp` (line 45), `gitignored` (line 20), `disposable` (lines 60, 65) all intact, unchanged from round 1 — confirms the diff never touched the three "Why not" sections or `## Purpose`/`## Location`, as M4-A14 requires.
- Doc file grew 216 → 242 lines (+37/-11 net +26), consistent with the diff shown.
- Doc test 9/9 green (§3 above).

## Outer status

**Start (round 2 dispatch):**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```

**End (round 2 dispatch):**
```
 M .cleargate/sprint-runs/SPRINT-41/.session-totals.json
 M .cleargate/sprint-runs/SPRINT-41/events.jsonl
 M .cleargate/sprint-runs/SPRINT-41/state.json
 M .cleargate/sprint-runs/SPRINT-41/token-ledger.jsonl
```
Identical — no outer write of any kind this round besides this report edit (uncommitted, per instructions). Cli main checkout: only the pre-existing untracked `cleargate-0.25.0.tgz`, unchanged. Outer worktree `.worktrees/STORY-058-08` @ `31f266f2`: clean. No writing CLI command ran against the outer repo, the cli main checkout, or the outer worktree — every invocation ran as a single `(cd <literal clean-room path> && ...)` call against one of the two clean-room containers, never against this repo.

## Script Incidents (Round 2)

None. Every command was a direct `git`/`npm`/`node`/`tsx --test`/`cp`/`shasum`/`printf` invocation, or a read-only inspection — no wrapped `.cleargate/scripts/*` script was executed.

flashcards_flagged: []

STATUS=done
