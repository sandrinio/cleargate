# SPRINT-41 — M2 historical baseline recovery

role: qa

Date: 2026-09-30. Mode: bounded historical recovery, explicitly authorized by the orchestrator under M2.md:272 and plans/m2-baseline-recovery-2026-09-30.md. Selected model: GPT-6.1 Sol, medium. This is candidate authentication, not BUG-100 QA approval. Usage telemetry: unavailable.

## Verdict

**RECOVERY CANDIDATE AUTHENTICATED.** The first historical capture reproduces both mandatory recorded hashes, 425 regular files and 4,619,226 raw bytes. Historical capture and replay each passed all five scenarios without skips. Every scenario's metadata pathset, file SHA-256 and actual permission bits match its tree independently. No symlinks or special files occur in candidate.

Candidate: `/private/tmp/cg-s41-qa-baseline-20260930T151058Z/candidate`.

The original `/private/tmp/cg-s41-m2-init-baseline` remains absent. No promotion or copy was performed. The orchestrator must independently verify before authorizing exact restoration. Current integrated parity tests remain a separate acceptance check.

## Provenance

The entire CLI Git commit was exported using `git archive --format=tar`, extracted into a distinct `source/`, and run with `source/node_modules` symlinked solely to existing CLI dependencies. No install, prebuild or build ran. Historical tests and helper were never patched or transplanted into current code.

| Evidence | Value |
|---|---|
| Historical QA-Red commit | `11fe51499a48fe66ecfdb258fdce2ca2364c49c4` |
| Commit tree | `86bde43e40d2e78657194f89055b47e09748bdee` |
| src tree | `2db028b400bbf92f0cd7054202d6774635a2216c` |
| scaffold tree | `a0702f042c7d743b018fec2d7742fe0ed254e3ff` |
| Extracted init-fixture Git blob | `852aeca3574901e6b1d4ca9849f82c47e3c23ad8` |
| Source archive SHA-256 | `c4c3d05e367719e85e2056a081a2ddb2c7d421a9df3efdaf1c4cfef81c59b7e1` |
| source/src/hosts | Absent, asserted before execution |

The full source archive is retained at `evidence/source.tar`; `provenance.txt` and `source-tar.sha256` preserve the exact recorded values. Git export authenticates historical source, not the original dependency installation.

## Execution and independent proof

All three standalone scripts were invoked through the absolute meta-repository `run_script.sh`, with inline `ORCHESTRATOR_PROJECT_DIR` for wrapper routing. `reproduce.sh` unsets both `ORCHESTRATOR_PROJECT_DIR` and `CLAUDE_PROJECT_DIR` before starting historical tests; it also clears inherited capture/repo/meta-root overrides. The test's historical seams and script are unmodified.

The package script was `npm run test:file -- test/hosts/claude-adapter-init-parity.red.integration.node.test.ts`, run from the archive's literal `source/` directory. The capture process alone received `CLEARGATE_INIT_BASELINE_CAPTURE=1`; replay explicitly used `env -u CLEARGATE_INIT_BASELINE_CAPTURE`, retaining the candidate baseline target. Candidate was empty before capture.

| Check | Result |
|---|---|
| Historical capture | Exit 0; 5 pass, 0 fail, 0 skipped |
| Historical compare, capture unset | Exit 0; 5 pass, 0 fail, 0 skipped |
| Independent verifier | Exit 0 |
| Regular files | 425, recorded count matched |
| Raw byte sum | 4,619,226, recorded sum matched |
| Relative aggregate | `549dcde034db874f59112f839392a1f1c60e8e9eaac44ff7865e3e28b089dad9` — matched |
| Original-namespace aggregate | `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` — matched |
| Candidate's own absolute aggregate | `70dba6a9d2cdf6f4b6ecad51710ff21a2d3efcacbedebf776b8ca9b73ccdf3d5` — informational; its namespace differs |
| Scenario roots | Exactly force, fresh, malformed, reinit, user-content; each exactly meta.json + tree |
| Tree metadata checks | 84 files per scenario; 420 total rows; pathsets, raw hashes and actual `stat.mode & 0777` all matched |
| Invalid/duplicate metadata paths | None |
| Candidate symlinks/special files | 0 / 0 |

Verifier sorting used `LC_ALL=C`. The relative digest was checked both from the preserved listing and the exact recipe `find . -type f -exec shasum -a 256 {} + | sort -k2 | shasum -a 256` inside candidate. The absolute listing used actual shasum output from NUL-safe sorted paths; only its filename prefix was remapped to the original namespace. No file contents, metadata serialization, transcript or modes were altered to obtain either pin.

Runtime: `/opt/homebrew/bin/node` v25.9.0; npm 11.12.1; tsx 4.22.3; Darwin 25.6.0 arm64; capture locale C.UTF-8; umask 0022. Existing runtime dependency versions: @napi-rs/keyring 1.3.0, commander 12.1.0, diff 5.2.2, js-yaml 4.1.1, pg 8.21.0, zod 4.4.3. This inventory describes the reproduction runtime; it does not claim restored historical dependencies.

## Preserved evidence and cleanup

Root: `/private/tmp/cg-s41-qa-baseline-20260930T151058Z`.

- `reproduce.sh`, `verify.mjs`, `cleanup.mjs`: exact execution and verification scripts.
- `evidence/capture.log`, `capture.exit`, `compare.log`, `compare.exit`: complete test output and exit codes.
- `evidence/verification.json`, `inventory.json`: all count/hash/mode/pathset results and file inventory.
- `evidence/relative-listing.txt`, `candidate-absolute-listing.txt`, `original-namespace-listing.txt`: complete digest input records, including filenames with spaces.
- `evidence/runtime.txt`, `dependency-versions.json`, `provenance.txt`, `source.tar`, `source-tar.sha256`: reproduction provenance.
- `evidence/fixtures-before.txt`, `fixtures-after.txt`, `fixtures-created.txt`: exact temporary directory inventory.
- `evidence/cleanup-authorized-exact-dirs.json`, `cleanup-result.json`: twelve newly created fixture directories were identified, independently checked and removed; no glob deletion occurred.
- `evidence/cli-status-before.txt`, `cli-status-after.txt`: both contain only pre-existing `?? cleargate-0.25.0.tgz`.

Cleanup removed exactly two historical payload directories and two historical fixture directories per scenario. Each scenario fixture's files were checked against candidate metadata before removal; payloads were checked against the extracted historical session-start hook. Source, candidate, scripts and complete evidence remain intact for independent review.

Current CLI code/tests, shared dependencies, state, ledgers, production installs and original baseline path were not modified. Existing outer changes were preserved. No actual Codex process, live harness, authentication/config-home read, commit, push or sprint close occurred. No host-fired enforcement or usage attribution is claimed.

Sprint context lacks an Active CRs heading; its append-only amendments and the reviewed recovery plan were applied. Flashcard applied: 2026-09-26 #test-harness #baseline, absolute listing hashes embed the original path. No flashcard edit was authorized in this report-only dispatch.

## Script Incidents

None. Recovery, independent verification and exact owned-fixture cleanup wrapper invocations all exited 0.

flashcards_flagged: []

## Orchestrator promotion — subsequent action, attributed

After the candidate-only recovery above completed, the orchestrator reported independently authenticating the candidate with both shell aggregate recipes and its own `verify-baseline.py`: 425 files, 4,619,226 bytes and all 420 metadata hash/mode rows. The orchestrator then promoted with `cp -pR` into the previously absent `/private/tmp/cg-s41-m2-init-baseline` and independently rechecked the literal original-namespace digest as `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2`. This promotion was performed by the orchestrator, not by this QA recovery worker. The original execution sections remain a historical record of candidate-only work.

The orchestrator subsequently authorized this worker to preserve a durable archive and verify a fresh extraction. No additional parity test or live test was run by this worker.

## Durable archive and fresh extraction verification

Durable directory: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/baselines/m2-recovered-20260930T151507Z`. Its destination was new; the preservation script refused pre-existing destinations. No previous archive was overwritten.

Archive: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/baselines/m2-recovered-20260930T151507Z/m2-init-baseline.tar`.

Archive SHA-256: **`faacc128fccebd530c304e0ccf8e05622c9f49e0976ca384c0eb09f5166c3544`**. Archive size: 5,517,312 bytes. The tar was created from the promoted original baseline with macOS copyfile metadata disabled, preserving POSIX modes, and then made read-only (0444). A relative checksum sidecar `m2-init-baseline.tar.sha256` is stored beside it.

A new extraction at `/private/tmp/cg-s41-qa-archive-20260930T151507Z/cg-s41-m2-init-baseline` was independently enumerated and verified by `verify-archive.mjs`, through the wrapper-owned `preserve.sh`. Verification exit 0:

- 425 regular files, 4,619,226 raw bytes, exactly five scenario roots.
- 420 metadata rows; exact pathsets, raw SHA-256 and actual permission modes match every row.
- Relative digest `549dcde034db874f59112f839392a1f1c60e8e9eaac44ff7865e3e28b089dad9` and remapped original-namespace digest `bdc4bb1a6be55f938dd87ce1a281231972bec12c7a850009fcbec8cf354a62b2` both match their mandatory pins.
- Full extracted inventory equals the promoted baseline's inventory, including modes, raw hashes, sizes and paths; no symlinks or special files.
- Literal original-path digest rechecked independently during archive verification and matches the same absolute pin.
- Archive checksum matches the stored checksum sidecar.

The durable directory retains the complete prior `evidence/` directory, all recovery/cleanup/preservation/verification scripts, source Git archive and provenance, complete logs, listings, inventories, dependency versions and cleanup records. `historical-source-postrun.tar` preserves the post-run historical source scratch snapshot while excluding `./node_modules`; `evidence/source.tar` remains the original Git export. No shared dependency symlink target, credentials or authentication directory was copied. `archive-verification.json`, the extracted inventory/listings, `PROVENANCE.md`, a copy of this report and `durable-files.sha256` preserve the follow-up evidence outside `/tmp`.

The durable preservation and fresh-extraction verification wrapper also exited 0. No new Script Incident occurred. This verifies recoverability of the frozen acceptance fixture; it does not approve BUG-100 or any unrun acceptance test.
