# STORY-058-08 — Architect post-flight
role: architect

ARCH: FAIL — `verify-install.ts` has two defects, both measured:
1. It emits `<h>.no-verifier` for a `--host h` that is registered but not installed. This violates binding rules H17 and M4-A5; the Dev report's "Deviations: None" is wrong on this point.
2. It crashes with an uncaught `TypeError` when the snapshot parses but is not an install snapshot (`null`, `{}`, `[]`, `"x"`). The user gets no report and a stack trace.

Separately, the DoD requires folding back the doc gap QA hit (S1 needs an authored item). All three go in one bounded round: M4-A14 R-A/R-B/R-C, three new QA-Red tests, and no §3.1 change. Everything else conforms. The design is sound as the single extension point for -10/-13, with the gaps routed below.

## Subject

- **Cli:** `story/STORY-058-08` @ `9ac0fa3` (re-seal `549fdaa`, main `b244551`). `git diff --numstat main 9ac0fa3` shows `CHANGELOG.md` 10/0, `src/cli.ts` 11/0, `src/commands/init.ts` 3/19, `verify-install.ts` +692, `cli-package-root.ts` +41, plus the three sealed test files. Between `549fdaa` and `9ac0fa3` no test file changed (H23).
- **Outer:** `.worktrees/STORY-058-08` @ `adde0a23`, a single file: `.cleargate/knowledge/clean-room-verification.md` (216 lines).
- **Scratch:** `/private/tmp/cg-s41-arch08-pack`, deleted with `rm -rf --`.
  - fresh clone of `9ac0fa3`, symlinked `node_modules`, `npm run build`, `npm pack`
  - extracted tarball with a PATH shim, and a scrubbed env
  - rooms: no-flag, `--host all`, plus `.active`, malformed-snapshot, upgrade and live copies
- **Independent re-run in the fresh clone:** unit 38/38, integration 5/5, doc 9/9 (with `CLEARGATE_META_ROOT` = the worktree).

## Conformance

| Row | Verdict | Evidence |
|---|---|---|
| H1 | conforms | `cli-package-root.ts:21-41`. Inclusive walk; walks past a foreign name or an unparseable file; never throws. U17a–e green |
| H2 | conforms | numstat 3/19; body at `init.ts:200-203` |
| H3 | conforms | defaults come from `findCleargatePackageRoot`; no `resolveDefaultPayloadDir`; no `scripts/**` import. Nit: a second package.json version reader (FU-6) |
| H4 | conforms | order at `:539-549`; the handler maps `UnknownHostError` / `VerifyInstallUsageError` to stderr and exit 2 with no stdout (`:674-681`) |
| H5 | conforms | formula at `:574-580`. The no-verifier emission is H17 |
| H6 | **gap** | the skip rule holds, except that a parseable non-snapshot passes check 1 and then crashes (R-B) |
| H7 | conforms | every pinned template verbatim |
| H8 | conforms | `grep -c __CLEARGATE_VERSION__` = 0; the scan covers the surgery targets |
| H9–H11 | conform | `selectEntriesForHosts`, `entryOwner`; line-anchored ignore checks; `defaultRunDoctor` has flags `{}`, a throwing seam, captured sinks |
| H12 | conforms | the matcher is part of the triple. Fails open when the payload `settings.json` is unreadable (FU-5) |
| H13–H16 | conform | — |
| H17 | **violated** | measured (M4-A14 R-A): `--host fake` not installed gives `fake.no-verifier:fail`; with the snapshot deleted it also gives `fake.no-verifier:fail` |
| H18–H22 | conform | H20: `cli.ts` 11/0, `:35`, `:637-645`. H21: awk prints `### Added`, `### Fixed`. H22: no file under `scaffold/`, `templates/` or `scripts/`, and no `package.json` change |
| H23–H24 | conform | per the Dev report; nothing contradicts it |
| D1–D9 | conform | all 12 H2 headings; pinned phrases; M4-A1 sentence; one `npm publish` line ("No `npm publish`, no push.") |
| D10 | **gap** | QA gap 2, plus three inaccuracies (R-C) |
| M4-A5 | **violated** | same as H17 |
| M4-A6..A13 | conform | the result line counts `fail` only; A7 doctor seam; A8 ordering; A9/A10 have 38 tests; A12: I1/I3 green in the fresh clone after build |

## Findings

1. **`HOST_VERIFIERS` as the extension point is sound.** It is a keyed, frozen table, and a missing verifier fails closed.
   - Check 5 already scans every verified host's `surgeryTargets()`, so codex's `AGENTS.md` and config get pin coverage without new code.
   - `--host claude` narrows core checks 4 and 5 to the claude-visible subset through `selectEntriesForHosts`, which is exactly what -09 needs.
   - Three gaps for a second host:
     - `VerifyCtx.payloadDir` is the flat core+claude compat payload. The tarball's `templates/scaffold/hosts/` holds only `claude`, and `host.ts`'s `resolveHostPayloadDir` is still the bundle-only `resolveDefaultPayloadDir()`.
     - The helpers a codex verifier needs (`extractTriples`, `stripProjectDirPrefix`) are private.
     - The R-A emission bug.

   FU-1 routes all three to -10.
2. **The read-only guarantee holds.** U14/U14b cover it. In a room with `.cleargate/sprint-runs/.active` and a sprint dir, `verify-install` and `doctor` both exited 0, and the tree was unchanged in path, size, mtime and mode, directories included. `runHookHealth` never reads `.active` (`doctor.ts:163-280`), and `checkCanonicalDrift` skips when there is no `cleargate-cli/`.
3. **Version-match semantics for a user who upgraded.**
   - **Global CLI bumped, `cleargate upgrade` not run.** `version-match` fails with an actionable sentence, and checks 8 and 11 skip (U10). That is the right design.
   - **After `cleargate upgrade`.** The snapshot's `cleargate_version`/`pin_version` and the hook pins move (CR-088 restamp, `upgrade.ts:855`), but `.mcp.json` does not.
     - Measured: `init --pin 0.0.1`, then `upgrade --yes`, gives `pin_version` 0.26.1, hook pin 0.26.1, and `.mcp.json` still at `cleargate@0.0.1`. `verify-install` then exits 1 on `claude.mcp-registration`.
     - `.mcp.json` and `CLAUDE.md` are `INTENTIONALLY_UNTRACKED` (`manifest-builder.ts:418`). Upgrade only routes manifest entries into `mergeSurgeryTarget` (`upgrade.ts:395`), so neither file is ever refreshed. The `CLAUDE.md` half is from reading the code, not measured.

     `verify-install` is correct here: it is detecting a real upgrade bug. Its detail, though, names neither the expected nor the found value (FU-4).
4. **Check 7 is Claude-centric.** Hook-health only inspects `.claude/settings.json` and `gate-check.log`. In a codex-only room it passes while proving nothing about codex (FU-6).
5. **The doc against real tool behaviour.**
   - **§1: exact.** Clone, symlink, `npm run build` runs `prebuild`, `npm pack` exits 0. No `prepack`/`prepare` script exists, and the tarball has no `.gitignore`.
   - **§2: QA measured the install and the identity gate.** I measured that the gate carries into hooks: Claude Code 2.1.283 runs `/bin/sh -c` with the launcher's PATH. The doc does not state this.
   - **§2 scrub list: incomplete.** An agent Bash exports 12 `CLAUDE*` variables, and 11 of them are not listed.
   - **§4: `scaffold-lint` target wrong.** The doc says `scaffold-lint` lints `cleargate-cli/scaffold/`. It actually lints `<cwd>/cleargate-planning/` (`scaffold-lint.ts:57`).
   - **§5 recipe: flags valid on 2.1.283.** The `mcp-connect` bullet omits two facts: it is record-only (it runs the published `cleargate@<pin>`), and the claude.ai connectors (`source: "claudeai"`) load regardless.
   - **QA gap 2.** A human following §5 by hand gets `gate=1` on an unauthored item.
6. **The malformed-snapshot crash (R-B)** is a plan gap. The catalogue said "exists and parses", and TPV's reference code has the same flaw. It is still a defect: a diagnostic that crashes on corrupted state fails the case it exists for, and `--json` consumers (the -09 harness) receive no JSON.
7. **Minor, routed to -13.**
   - `payload-files` uses `existsSync`, so a directory passes.
   - `resolvePackageDefaults` falls back to `process.cwd()/templates/cleargate-planning` when no root is found. This is unreachable in a real install, and the resulting `0.0.0` version would mismatch anyway.
   - The doctor detail drops doctor's own reason.

## Forward risks

- **-09.**
  - The `--json` shape, the check ids, the live ids and the no-flag/`--host all` shape all match the blueprint (V9).
  - New binding rules: M4-A15..A23. They cover:
    - a full `CLAUDE*` scrub
    - an in-session `hook-identity` row, because the resolver line prints no path
    - `mcp-connect` filtering
    - `.mjs` roots without `findCleargatePackageRoot`
    - Step 2.9 reads only the result file, so RS-CLOSE must be the last cli-touching step
    - keep `<instructions>` in both probe items, despite the 2026-09-26 flashcard
    - no `--no-session-persistence`
    - the container stamp
    - artifact inputs going forward
  - B1's `deferred_verification` command is correct when run from the OUTER root. The `close_sprint.mjs:1052-1098` parser reads its `command:` and `blocks:`, and the result path matches `:1181`.
- **-10.**
  - The codex verifier must land in the same commit as codex registration. From that merge, the fail-closed `codex.no-verifier` otherwise reds every codex or all room.
  - Snapshot-null ⇒ every check `skip`.
  - Fail closed on the payload source.
  - Export the helpers, and use one host-payload resolver built on `findCleargatePackageRoot`.
  - New prebuild scripts join `ARTIFACT_INPUT_PATHS`.
- **-13.**
  - Codex hooks run under `zsh -lc`, where path_helper reorders PATH, so it needs its own in-session identity row.
  - FU-5 and FU-6 land with its verifier extension.

## FU routing

| FU | Finding | Target | Binding text |
|---|---|---|---|
| R-A/R-B/R-C | no-verifier guard; snapshot shape guard; doc fold-back (QA gap 2, scaffold-lint target, `CLAUDE*` scrub, hook-shell fact, mcp-connect caveat) | **STORY-058-08 round 2** (QA-Red re-seal U9c/U11e/U11f, then Dev) | M4-A14 |
| FU-1 | codex verifier rules: same-commit landing, snapshot-null skip, fail-closed payload, exported helpers, shared host-payload resolver plus an additive `VerifyCtx` field | STORY-058-10 | M4 §Forward pointers |
| FU-2 | prebuild/build scripts join `ARTIFACT_INPUT_PATHS` | STORY-058-10 | M4-A22 |
| FU-3 | Codex in-session identity (`zsh -lc`) | STORY-058-13 | M4 §Forward pointers |
| FU-4 | `cleargate upgrade` never refreshes `.mcp.json` (measured) or the `CLAUDE.md` block (from code). The MCP server keeps the old CLI, and `verify-install` then fails check 12 (and 11 if the block changed). The fix should also name expected vs found in both details | **new BUG** (orchestrator files it) → close follow-ups | — |
| FU-5 | check 8 fails open on unreadable payload settings; no-root `process.cwd()` fallback | STORY-058-13 | M4 §Forward pointers |
| FU-6 | check 7 detail carries doctor's blocker lines; codex-meaningful health; payload-files requires a regular file; shared version reader | STORY-058-13 | M4 §Forward pointers |
| FU-7 | M4-A15..A23 (-09 readiness) | STORY-058-09 | M4 append |

## Adjacent Implementations row

Paste this after the round-2 merge (M4 Open decisions 5):

`STORY-058-08 | runVerifyInstall(opts) → VerifyInstallReport { cwd, version, registered, installed, verified, checks[{id,owner,status,details}], live[{id,host,description}], ok }; verifyInstallHandler (exit 0/1/2; usage errors decided before any read; read-only; never walks up); HOST_VERIFIERS (frozen { claude } — the ONE per-host extension point; -10/-13 add codex here, same commit as registration); CheckResult/LiveCheck/HostVerifier/VerifyCtx/VerifyInstallOptions/VerifyInstallCliOptions; stable check ids snapshot, version-match, manifest-hosts, payload-files, pin-substituted, gitignore-generated, doctor, claude.{settings-hooks,hooks-executable,no-foreign-hooks,instruction-block,mcp-registration}, <host>.no-verifier (installed ∧ registered ∧ no verifier only); live ids claude.live.{session-start,pre-tool-use,post-tool-use,dispatch,agents-skills,mcp-connect} + claude.live.agents-md-exposure iff <cwd>/AGENTS.md; findCleargatePackageRoot(startDir) — the one package-root walk (bundled + tsx), init's readRunningCliVersion routes through it; private extractTriples/stripProjectDirPrefix (export before a second verifier uses them); procedure doc is meta-repo only | cleargate-cli/src/commands/verify-install.ts, src/lib/cli-package-root.ts, src/cli.ts, src/commands/init.ts; outer .cleargate/knowledge/clean-room-verification.md`

## Part B

Everything is in `plans/M4.md` §"As-built resolution after STORY-058-08": the anchor table, V9 (resolved: every F10 value and every `evidence.mjs` constant reproduced from the extracted tarball), V12 (resolved: 2.1.283, haiku accepted), M4-A14..A23 and the tag status table.

## Writes and status

- **Outer writes:** the append to `plans/M4.md`, and this report. Nothing is committed.
- **Outer `git status` at the end:** the orchestrator-owned ledger/state/events/session-totals files, plus `plans/M4.md`.
- **Cli checkout and worktree:** unchanged. The cli is on `story/STORY-058-08` with only the pre-existing untracked `cleargate-0.25.0.tgz`; the worktree is clean.
- **SMOKE RULE:** every command that wrote ran as one `(cd /private/tmp/cg-s41-arch08-pack/<room> && …)` call.
- **Outside the scratch dir:**
  - One `claude -p` session persisted `~/.claude/projects/-private-tmp-cg-s41-arch08-pack-room-live/`. I deleted it with a literal `rm -rf --`.
  - No live `.claude/` was touched, and no main-checkout build ran.

## Script Incidents

None. No wrapped `.cleargate/scripts/*` script was executed.

## Flashcards

```yaml
- "2026-09-26 · #clean-room #claude-p #hooks · Claude Code 2.1.283 runs hooks as /bin/sh -c with the launcher's PATH; a PATH shim reaches hooks."
- "2026-09-26 · #upgrade #mcp #danger · upgrade re-pins hooks and pin_version but never .mcp.json; the MCP server keeps running the old CLI."
- "2026-09-26 · #verify-install · A snapshot parsing to null/{}/[] crashed verify-install (TypeError); validate the shape, not just the JSON."
- "2026-09-26 · #clean-room #env · An agent Bash exports 12 CLAUDE* vars (CLAUDE_CODE_CHILD_SESSION…); scrub every CLAUDE* before claude -p."
- "2026-09-26 · #clean-room #claude-p · --setting-sources project,local still loads claude.ai MCP connectors (source claudeai); filter by name."
- "2026-09-26 · #scaffold-lint #docs · scaffold-lint lints <cwd>/cleargate-planning (the frozen snapshot), not cleargate-cli/scaffold."
```

## Round 2 — M4-A14

role: architect

ARCH-R2: PASS — the code conforms to M4-A14 R-A, R-B and R-C verbatim, and nothing from round 1 regressed. Test adequacy falls short in one place, R-B's per-clause guarantees: six R-B mutants survive the sealed 41 tests. Three of them matter, because they bring back a crash or reject every field install.

**Required before the DevOps merge:** QA-Red appends U9d, below, to `verify-install.red.node.test.ts` in one QA-Red commit.
- U9d is already measured green on `fc0184d`, so no Dev change is needed.
- Expected unit count afterwards: 42/42.

### Subject

| Item | Commit | Change |
|---|---|---|
| QA-Red round 2 | cli `4285391` | `+122/-0` in `test/commands/verify-install.red.node.test.ts` only |
| Dev fix | cli `fc0184d` | `src/commands/verify-install.ts` `+36/-3` only |
| Doc | outer `.worktrees/STORY-058-08` @ `31f266f2` | `.cleargate/knowledge/clean-room-verification.md` `+37/-11` only |

The cli checkout and the worktree are clean.

**Measurement.** Scratch clone of `fc0184d` at `/private/tmp/cg-s41-arch08-r2`, deleted afterwards with `rm -rf --`.
- Ran U1, U9c, U9d, U11e, U11f, U12 and U12b by name pattern, from a scratch copy of the red file.
- Nine mutants, each applied to `verify-install.ts` and then reverted.
- This does not duplicate QA-Verify's full re-runs.

### 1. R-A, R-B, R-C against M4-A14

**R-A: conforms.** The host loop now guards on `installed.includes(host) && registeredNames.includes(host)`.

**R-B: conforms.** `isInstallSnapshotShape` sits inside the existing `try`, so JSON-parse errors still reach the `catch`. It checks:
- a non-null, non-array object
- string `cleargate_version`
- `files` is an array whose every element is an object with a string `path`
- `hosts` is absent or an array of strings

A shape failure gives the pinned detail `unparseable: .cleargate/.install-manifest.json` verbatim, and `snapshot` stays `null`. So M4-A5's fallback and the skip rule apply unchanged (U9d measures `installed === []`).

**R-C: conforms.** All five items are present:
- **§5 S1:** `cleargate new epic`, the five F7 edits, and "`gate=1` by design"
- **§4:** `scaffold-lint` → `<cwd>/cleargate-planning/` (`scaffold-lint.ts:57`)
- **§2 scrub:** every `CLAUDE*`, `CLEARGATE_*` and `SKIP_*` variable, plus `ORCHESTRATOR_PROJECT_DIR`
- **§2:** the measured `/bin/sh -c` PATH-inheritance fact
- **§5 `mcp-connect`:** record-only, the published package, `claudeai` connectors, select by name

The D-row phrases are intact: 12 H2 headings, one `npm publish` line guarded by `No`, `recreated per run`, `command -v cleargate`. No new `npm publish` mention was added.

Wording nit, not blocking: "`stamp=0`/`ingest=0` are this check's real pass criteria unless the item was also authored" reads correctly only with the preceding instruction to author the item. -09's M4-A23 edit replaces that paragraph anyway.

### 2. Test adequacy

| Mutant | Sealed 41 (U9c, U11e, U11f, U12, U1) | With U9d | Matters? |
|---|---|---|---|
| A1: R-A guarded on `registered` only (the round-1 code) | killed by U11e, U11f | killed | yes |
| A2: R-A guarded on `installed` only | survives | survives | no — equivalent. Every host in `verified` is registered: `--host` passes `registry.resolve`, the snapshot branch filters by registered, and the fallback filters registered hosts that have a verifier |
| B1: no `hosts` clause | **survives** | killed | **yes** — `hosts: 5` or `{}` makes `installedHosts` spread a non-iterable, the round-1 `TypeError` class |
| B2: `hosts` array accepted without the string-element check | **survives** | killed | minor — `hosts: [1]` reports a bogus unregistered host, no crash |
| B3a: `files` element without a string `path` | **survives** | killed | **yes** — `entryOwner` calls `entry.path.startsWith`, so it throws |
| B3b: no `files` element check at all | **survives** | killed | **yes** — `files: [null]` makes `entryOwner(null)` throw |
| B4: shape-failure detail differs from the pinned text | killed by U9c (exact `===`) | killed | yes |
| B5: `hosts` required (over-strict) | **survives** | killed | **yes** — every pre-058-06 snapshot has no `hosts` (all published 0.26.1-and-earlier installs), so every field install would read `unparseable` |
| B6: no `cleargate_version` clause | **survives** | killed | minor — version-match then reads "installed by undefined", no crash |

**Verdict: not adequate without U9d.** B1, B3a/B3b and B5 matter. Paste the following verbatim into `test/commands/verify-install.red.node.test.ts`, immediately after the U9c `describe` block. It uses only existing file helpers: `loadVerifyInstall`, `freshInstall`, `snapshotPath`, `PAYLOAD_DIR`, `VERSION`, `defaultHostRegistry`, `stubDoctor0`.

```ts
// ── U9d — snapshot shape guard, one clause at a time (M4-A14 R-B) ───────────

describe('U9d: snapshot shape guard clauses', () => {
  test('each R-B clause alone fails the snapshot "unparseable" without throwing; a legacy snapshot without hosts still passes', async () => {
    const { runVerifyInstall } = await loadVerifyInstall();
    const clauseCases: ReadonlyArray<{ label: string; mutate: (snap: Record<string, unknown>) => void }> = [
      { label: 'cleargate_version missing', mutate: (s) => { delete s.cleargate_version; } },
      { label: 'files element {}', mutate: (s) => { (s.files as unknown[]).push({}); } },
      { label: 'files element null', mutate: (s) => { (s.files as unknown[]).push(null); } },
      { label: 'files element path is a number', mutate: (s) => { (s.files as unknown[]).push({ path: 1, tier: 'protocol' }); } },
      { label: 'hosts is a string', mutate: (s) => { s.hosts = 'claude'; } },
      { label: 'hosts is a number', mutate: (s) => { s.hosts = 5; } },
      { label: 'hosts holds a non-string', mutate: (s) => { s.hosts = ['claude', 1]; } },
    ];
    for (const { label, mutate } of clauseCases) {
      const dir = await freshInstall();
      const snap = JSON.parse(fs.readFileSync(snapshotPath(dir), 'utf8')) as Record<string, unknown>;
      mutate(snap);
      fs.writeFileSync(snapshotPath(dir), JSON.stringify(snap, null, 2));
      const report = await runVerifyInstall({ cwd: dir, payloadDir: PAYLOAD_DIR, version: VERSION, registry: defaultHostRegistry, runDoctor: stubDoctor0 });
      const check = report.checks.find((c) => c.id === 'snapshot')!;
      assert.equal(check.status, 'fail', `[${label}] snapshot must fail`);
      assert.deepStrictEqual(check.details, ['unparseable: .cleargate/.install-manifest.json'], `[${label}] pinned H7 detail`);
      assert.deepStrictEqual(report.installed, [], `[${label}] installed must be []`);
    }

    const legacy = await freshInstall();
    const snap = JSON.parse(fs.readFileSync(snapshotPath(legacy), 'utf8')) as Record<string, unknown>;
    delete snap.hosts;
    fs.writeFileSync(snapshotPath(legacy), JSON.stringify(snap, null, 2));
    const report = await runVerifyInstall({ cwd: legacy, payloadDir: PAYLOAD_DIR, version: VERSION, registry: defaultHostRegistry, runDoctor: stubDoctor0 });
    assert.equal(report.checks.find((c) => c.id === 'snapshot')!.status, 'pass', 'a legacy snapshot without hosts is still a snapshot');
    assert.deepStrictEqual(report.installed, ['claude'], 'legacy hosts resolve to [claude]');
    assert.equal(report.ok, true, JSON.stringify(report.checks.filter((c) => c.status !== 'pass')));
  });
});
```

**Measured on `fc0184d`:**
- U9d passes (7/7 in the pattern run, alongside U1, U9c, U11e, U11f, U12 and U12b).
- U9d kills B1, B2, B3a, B3b, B4, B5 and B6.

U9d is a regression guard, not a red: it is green on arrival by design. It needs no §3.1 change. Integration stays 5/5 and doc 9/9.

### 3. Round-1 conformance: no regression

- `git diff --stat 9ac0fa3 fc0184d -- src` shows `verify-install.ts` only.
- H1–H5, H7–H16 and H18–H24 are untouched by the diff.
- **H6** now fully conforms: a shape-invalid snapshot fails check 1, so the dependents skip.
- **H17 and M4-A5** now conform: A1 is killed, and U11e/U11f pass.
- **D1–D9** are intact (phrase checks above). **D10's** round-1 gap is closed by R-C.
- Per the Dev report, the sealed and parity sets and the baseline hash are unchanged. QA-Verify owns that re-run.

### 4. Adjacent Implementations row

Yes, it needs one change: add the check-1 shape rule. Final row, to paste after merge:

`STORY-058-08 | runVerifyInstall(opts) → VerifyInstallReport { cwd, version, registered, installed, verified, checks[{id,owner,status,details}], live[{id,host,description}], ok }; verifyInstallHandler (exit 0/1/2; usage errors decided before any read; read-only; never walks up); check 1 accepts only a snapshot-shaped object (non-null object, string cleargate_version, files[] of objects with string path, hosts absent or string[]) — anything else is "unparseable: .cleargate/.install-manifest.json" and snapshot = null; HOST_VERIFIERS (frozen { claude } — the ONE per-host extension point; -10/-13 add codex here, same commit as registration; a verifier returns all checks 'skip' when ctx.snapshot is null); CheckResult/LiveCheck/HostVerifier/VerifyCtx/VerifyInstallOptions/VerifyInstallCliOptions; stable check ids snapshot, version-match, manifest-hosts, payload-files, pin-substituted, gitignore-generated, doctor, claude.{settings-hooks,hooks-executable,no-foreign-hooks,instruction-block,mcp-registration}, <host>.no-verifier (installed ∧ registered ∧ no verifier only); live ids claude.live.{session-start,pre-tool-use,post-tool-use,dispatch,agents-skills,mcp-connect} + claude.live.agents-md-exposure iff <cwd>/AGENTS.md; findCleargatePackageRoot(startDir) — the one package-root walk (bundled + tsx), init's readRunningCliVersion routes through it; private extractTriples/stripProjectDirPrefix (export before a second verifier uses them); procedure doc is meta-repo only | cleargate-cli/src/commands/verify-install.ts, src/lib/cli-package-root.ts, src/cli.ts, src/commands/init.ts; outer .cleargate/knowledge/clean-room-verification.md`

### Writes and status

- **Outer write:** this appended section only. Nothing is committed.
- **Outer `git status`:** only the orchestrator-owned ledger, state, events and session-totals files.
- **Cli checkout:** unchanged — `story/STORY-058-08` @ `fc0184d`, plus the pre-existing untracked `cleargate-0.25.0.tgz`.
- **Script incidents:** none.

flashcards_flagged:
  - "2026-09-26 · #test-harness #tpv · A multi-body shape-guard red where every body fails the first clause leaves the later clauses untested."
  - "2026-09-26 · #verify-install #manifest · Every pre-058-06 snapshot lacks hosts; a guard requiring hosts rejects every field install."

STATUS=done
