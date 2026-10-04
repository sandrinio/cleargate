# SPRINT-41 — M2 baseline recovery assessment

role: architect

Date: 2026-09-30. Scope: read-only historical assessment; the only authored file is this report. No candidate, baseline, code, test, commit, state, ledger or dependency-install mutation was performed. No child agent was spawned.

## Decision

**A concrete historical reconstruction is available. Exact recovery remains UNVERIFIED until the candidate matches the recorded digests.** There is no demonstrated technical impossibility. Authorize a bounded candidate-only reproduction from CLI QA-Red commit `11fe51499a48fe66ecfdb258fdce2ca2364c49c4`, then independently verify it. Do not capture from current code, overwrite the missing baseline location, change sanctioned deltas, or waive the 20 parity tests.

M2.md:272 explicitly says: “If it is lost, recapture from `git archive <red-sha>` … Never recapture from a branch tip that contains `src/hosts`.” The original plan places that archive under CLI for dependency resolution. This assessment proposes a distinct scratch extraction with an explicit node_modules symlink, because this dispatch prohibits writes in the CLI checkout. The historical fixture's paths are package-relative; it does not need that original placement. Later M7 §5 retains **compare-only** baseline use. A scratch candidate and hash proof preserve that restriction; accepting different expected bytes does not.

The September 30 resume amendment authorizes continued local sprint work, not push, publish, close, altered acceptance criteria or speculative replacement bytes. The parent subsequently confirmed bounded historical candidate reproduction is accepted under M2.md:272, with promotion permitted only after historical SHA provenance and both original hashes match; no additional owner approval is needed for that exact restoration. A separate execution worker must receive that bounded scope. The sprint context has no `Active CRs` heading; its existing Mid-Sprint Amendments and the approved M7 plan supply the applicable decisions.

## Provenance that survives

| Input/evidence | Verified value |
|---|---|
| Original capture production HEAD | `a821d402ef18fa924a3113f1f0be093e3e54491b` |
| Committed capture instrument | `11fe51499a48fe66ecfdb258fdce2ca2364c49c4` |
| Diff original HEAD → QA-Red | Exactly three additions under test/: init-fixture, contract reds, parity integration; no production or scaffold change |
| `src` Git tree at both commits | `2db028b400bbf92f0cd7054202d6774635a2216c` |
| `scaffold` Git tree at both commits | `a0702f042c7d743b018fec2d7742fe0ed254e3ff` |
| Historical core payload tree | `34f7152b63e292a77fc70fc7dc02ea8e6625dbd6` |
| Historical Claude payload tree | `a86786bd78c79ed7d41452b2897ee061597aa06f` |
| Historical init.ts blob | `cfb165ad3f3f08f9be765f29ead6e575b4de5783` |
| Historical init-fixture.ts blob | `852aeca3574901e6b1d4ca9849f82c47e3c23ad8` |
| Historical scaffold-roots.ts blob | `6d01128c90ffee0ee55e0f295c10a5417b25f06d` |
| Historical scaffold-layout.mjs blob | `9b2e573a1ce4548c72872656b7872ae5a3a47ace` |
| Historical build-manifest.ts blob | `fc87f7903836570f3ae8d8997f3540294b48a9e1` |
| Historical package.json blob | `ef71d00ff7277a5fb4f6e3fe4eeb27fb494305a7` |

The QA-Red report records capture before committing the tests, with production HEAD a821d40. Its committed instrument is 11fe514. QA-Verify subsequently verified that the Developer changed none of those tests and checked the frozen aggregate twice; DevOps again passed all five scenarios after merge `55f5d95`. These reports establish the instrument/subject separation, not just an inferred convenient old revision.

Recorded capture invariants (STORY-058-03-qa-red.md:42–59):

- 425 regular files, **4,619,226 bytes** total.
- Five scenario directories: fresh, user-content, reinit, malformed, force. Each contains `tree/**` and `meta.json`.
- Original absolute-path listing SHA-256: `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`.
- Later independent relative-listing SHA-256, BUG-100-integrate.md:68: `549dcde034db874f59112f839392a1f1c60e8e9eaac44ff7865e3e28b089dad9`.

The original absolute recipe is `find /private/tmp/cg-s41-m2-init-baseline -type f -print0 | sort -z | xargs -0 shasum -a 256 | shasum -a 256`. The later relative recipe is run **inside** the baseline: `find . -type f -exec shasum -a 256 {} + | sort -k2 | shasum -a 256`. They hash different filename strings and need not equal each other. The filename `Sprint Plan Template.md` requires space-safe enumeration.

## Historical subject and deterministic inputs

All paths in this section are inside the CLI archive at 11fe514, not the current checkout.

`test/helpers/scaffold-roots.ts:19–73` derives CLI_ROOT from its own module, then composes **that archive's** `scaffold/core` followed by `scaffold/hosts/claude`. It invokes that archive's `src/lib/scaffold-layout.mjs` and `scripts/build-manifest.ts`. The outer repository, frozen cleargate-planning tree, live .claude, current generated templates, current dist and current sanctioned delta rows have no role.

`test/helpers/init-fixture.ts:30–31,82–98,171–207,262–292,319–367` freezes:

- Time `2026-01-01T00:00:00.000Z`; pin `0.0.0-m2`.
- Participant git email `m2@example.test`, noninteractive/yes operation, probe stub, no-op wiki build, empty-file manifest stub with fixed version and timestamp.
- Exact historical seed functions; second invocation only for reinit; force only for force scenario.
- CLEARGATE_REPO_ROOT set to each fresh fixture and restored afterward; only fixture-root transcript paths replaced with `<ROOT>`.
- Raw file SHA-256, sorted relative paths, permission bits `mode & 0777`, exact captured stdout/stderr; capture copies real bytes and reapplies recorded file modes.

`src/commands/init.ts:794–820` forces the identity resolver's env rung off for the git-email lookup. The injected email therefore wins without reading the user's Git identity or home configuration. `src/init/copy-payload.ts:54` skips payload MANIFEST.json, and init's manifest seam supplies the fixed install snapshot. The newly generated payload MANIFEST timestamp is consequently not part of the captured output. Atomic Date.now temporary filenames are renamed/removed before enumeration. The restart banner bypasses the injected stderr, as the original QA report explicitly documents; do not start capturing that additional stream into meta.json now.

File permissions are part of meta.json and thus part of both aggregate digests. Use the same macOS/POSIX behavior, extract Git modes, and start with umask 022; this is a controlled candidate input, not a recorded historical umask. The full digest is the arbiter. Do not chmod candidate content afterward to force a desired result.

## Bounded reproduction recipe — proposed, NOT executed

1. Obtain the orchestrator's reviewed candidate-only dispatch. It must authorize scratch writes, running the historical test, and wrapper-owned incident output on failure. Create a unique `/private/tmp/cg-s41-arch-baseline-<UTC>/` with separate `source/`, `candidate/`, and `evidence/` children; refuse all pre-existing destinations. Keep scripts, logs, manifests and listings outside candidate. Reserve the original `/private/tmp/cg-s41-m2-init-baseline` path; do not create it.
2. Export **the entire** CLI 11fe514 commit with `git -C <CLI> archive --format=tar 11fe51499a48fe66ecfdb258fdce2ca2364c49c4`, then extract into source. Record the archive SHA-256 and resolved commit/tree IDs. Check that source/src/hosts is absent and source/test/helpers/init-fixture.ts matches the recorded Git blob. Do not transplant historical tests into the current branch or merge current source into the archive.
3. Symlink source/node_modules to the existing CLI node_modules solely for runtime dependencies. Do not run npm install, npm ci, prebuild or build, and never mutate shared dependencies. Record node executable/version, tsx version and relevant dependency versions, OS, locale and umask. The historical Git root contains package.json but no tracked lockfile, so the original dependency installation cannot be certified from Git alone. Matching captured outputs will independently certify the resulting fixture, rather than falsely claiming a restored historical runtime.
4. Run one historical test file from source with candidate as its baseline target, capture enabled, and umask 022. Use the original package script `npm run test:file -- test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`. The test file's imported helper supplies all historical seams; do not edit or monkey-patch it. Capture must report 5/5 and no skip, but that alone is **not** recovery proof.
5. Immediately remove CLEARGATE_INIT_BASELINE_CAPTURE from the test process environment; retain CLEARGATE_INIT_BASELINE=candidate. Run that same archived file once in compare mode, expecting 5/5. This checks deterministic replay but still does not authenticate the candidate.
6. Run the independent verifier described below and preserve its complete evidence. On any mismatch, leave the failed candidate distinct and halt promotion; do not retry into a non-empty candidate. Diagnose from historical source or recovered evidence only. Another candidate requires a fresh directory and a recorded, justified input correction.

Every standalone recovery bash/node script must be invoked through:

```text
ORCHESTRATOR_PROJECT_DIR=/Users/ssuladze/Documents/Dev/ClearGate bash /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/run_script.sh bash /private/tmp/cg-s41-arch-baseline-<UTC>/reproduce.sh
```

The reproduction script may call the historical package's npm test:file script internally under that wrapper. No current branch build is required. The old helper creates `/tmp/cg-s41-payload-*` and `/tmp/cg-s41-fix-<scenario>-*` fixtures outside the candidate; record the run's exact newly created directories and clean only its owned fixtures after evidence preservation. Never glob-delete another agent's scratch directories or reuse another agent's mutant/recovery script.

## Independent proof and promotion gate

The verifier must refuse symlinks/special files inside candidate and assert exactly the five scenario directories and expected tree/meta structure. It must enumerate every regular file once, count 425, and sum raw byte lengths to 4,619,226.

For each scenario, parse meta.json without rewriting it. Enumerate tree regular files independently and check exact path-set equality, raw SHA-256 equality and actual `(stat.mode & 0777)` equality against every meta.files row. Reject duplicate or traversal paths and extra/missing files. The aggregate hash authenticates the serialized meta.json, including expected stdout/stderr and mode numbers; checking actual file modes closes the gap that a content-only aggregate leaves.

Compute both historical aggregates:

1. **Relative:** execute the exact BUG-100-integrate recipe inside candidate, preserving `./` names. Expect `549dcde034db874f59112f839392a1f1c60e8e9eaac44ff7865e3e28b089dad9`.
2. **Original absolute namespace:** produce the NUL-safe sorted shasum listing for candidate files, but replace **only the filename prefix** `<candidate>/` in each output record with `/private/tmp/cg-s41-m2-init-baseline/`. Preserve per-file digest, shasum's two spaces, path spelling, ordering and final newline exactly. Hash that listing; expect `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`. Do not alter file contents, meta.json, or embedded strings. A direct hash of candidate's own absolute paths is expected to differ and is not a failure or an acceptance substitute.

Prefer a verifier that calls shasum on the actual files and remaps the known filename field, rather than rebuilding shasum formatting approximately. Pin `LC_ALL=C` for verifier sorting and record it; the original locale was not recorded. If that gives a mismatch, preserve both listings and investigate ordering explicitly; never replace a pinned digest with a new one. ASCII payload names and both independent recipes provide a strict cross-check.

Only after **both digests**, count, byte sum, metadata/tree consistency, modes, and historical compare pass may the orchestrator classify this candidate as an exact reconstruction of the previously recorded fixture. At that point the orchestrator can authorize restoring a copy at the original absent path (or explicitly approve a durable comparison path). This assessment does not perform that promotion. Recheck the original-path literal aggregate after any copy; retain an immutable durable archive plus checksum and recovery provenance outside /tmp so the next pause does not erase it. Preserve file modes on copies.

Then QA runs the current integrated BUG-100 tree's two parity files with capture **unset**, using the authenticated comparison fixture: claude-adapter-init-parity (5) and init-host-parity (15). Hash the baseline before and after. These tests remain a separate acceptance check; successful historical reconstruction does not make BUG-100 pass.

## Missing material and escalation boundary

The original inode/mtime history, original runtime/dependency inventory, original umask/locale, and original captured directory are not available from the cited records. Git captures executable bits rather than every possible POSIX permission bit. The two aggregate pins plus serialized mode records can nevertheless authenticate recreated bytes and permission expectations without recovering those incidental historical details.

A narrow filename search of sprint artifacts, /private/tmp and CG_TEST identified no named exact M2 baseline archive. Sprint b0 contains Claude live-resync backups; those represent a different source and lack this five-scenario capture provenance. They are not acceptable replacements. No authentication files, home credential stores or archive contents unrelated to baseline provenance were read. This is not a claim that every storage location on the machine was searched.

If no candidate built solely from evidenced historical inputs matches the full pins, exact recovery stays blocked. Do not infer correctness from 425 files, 5/5 historical tests, a current parity pass, partial file hashes or a similar live snapshot. Seek an exact backed-up capture or an owner-approved change to the verification contract. Accepting new baseline bytes or waiving the frozen baseline is a user-intent/spec decision requiring explicit owner approval; the existing “go ahead” does not authorize it. An exact authenticated restoration follows M2's existing recovery rule and requires no waiver of acceptance semantics.

## Checks performed and limits

- Read the complete architect profile, repository guidance, relevant protocol/context sections, flashcard entry and relocated canonical skill, raw STORY-058-03/BUG-100 requirements, M2/M7 baseline clauses, original QA-Red/QA/DevOps evidence and BUG-100 integration fingerprint.
- Read historical fixture/composer/manifest/init/copy/identity code; compared Git source and payload tree IDs; checked the precise QA-Red diff and captured commit IDs above.
- Initial CLI status: only pre-existing `?? cleargate-0.25.0.tgz`. Initial outer status: four sprint bookkeeping files modified by existing work. Preserved them.
- No recovery test, runtime build, candidate capture, baseline write, gate execution or host-enforcement claim. Usage telemetry: unavailable.
- Flashcard applied: 2026-09-26 #test-harness #baseline — the absolute listing embeds the original path. Additional record-worthy lesson for the parent: frozen /tmp acceptance fixtures need a durable checksum-backed archive. FLASHCARD was not edited because this dispatch permits only the report.

## Script Incidents

None. Assessment used read-only shell inspection tools and Git object reads, not standalone bash/node scripts. The proposed reproduction and verifier have not run.
