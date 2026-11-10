role: qa
STORY=061-03
QA: PASS
TYPECHECK: pass (macOS, Linux amd64)
TESTS: 3599 total, 3597 pass, 0 fail, 0 cancelled, 2 skipped (macOS and linux/amd64 node:24; skips pre-existing, same count as Dev)
ACCEPTANCE_COVERAGE: 5 of 5
MISSING: none
REGRESSIONS: none

Commit 296c421 (parent 02c1d8b), scratch clones only, private TMPDIRs, npm cache in scratchpad.

1. Surface: 3 A (ci.yml, .gitleaks.toml, package-lock.json), 5 M (.gitignore + 4 tests), 53 D under .script-incidents; 61 entries; no diff in package.json/src/scripts/scaffold. Matches 3.1.
2. G1 macOS: npm ci 0, build 0, typecheck 0, npm test rc 0 (3599/3597/0/0), npm pack 0; porcelain (untracked=all) empty; ls-files .cleargate = 0; lockfile tracked and unchanged; check-ignore printed all 3, rc 0. Pack dry-run: 232 files, no top-level .tgz/lockfile/CI files.
3. G2 Linux: plan's ci-steps.sh in node:24 linux/amd64, jq 1.7.1 at /usr/bin/jq, cleargate NONE, git identity empty. npm ci/typecheck/build/test/verify-pack all RC 0 (verify-pack OK 232 files, payload 88), lockfile unchanged, ALL-STEPS-OK, docker rc 0. actionlint (pinned digest) rc 0. ci.yml: on pull_request + push main; 2 actions, both @40-hex SHA with "# vX" comment (0 unpinned); permissions contents: read only, 0 "write"; fetch-depth 0; node-version-file .nvmrc (24); order npm ci > typecheck > build > test > verify-pack > gitleaks; gitleaks image pinned by digest; command identical to the local one used in G3.
4. G3: pinned gitleaks, .gitleaks.toml, --log-opts=HEAD: 468 commits, no leaks, rc 0.
5. G4: throwaway ghp_ commit: rc 1, RuleID github-pat, File sc4/leak.env. Allowlist value-pinned: near-miss values (svc-tok-scenario-1-abcd, tok-abc-scenario-5-verbatim2) in a new file are flagged (generic-api-key, rc 1); exact values in a new file path are NOT flagged with config (rc 0) and ARE flagged with default-only config (rc 1), so the allowlist does the work and is path-independent.
6. G5: appended number='x' in src/auth/keychain-store.ts: typecheck rc 2, TS2322; rc 0 after revert.
7. R6 diff: only additions, no assertion deleted/weakened. keychain test now dynamic-imports subject after await mock.module and adds an assertion that the secret reached MockEntry's store; doctor / doctor-session-start / sprint-sentinel stubs write only <tmpdir>/cleargate-cli/dist/cli.js inside makeTmpDir/makeProject dirs. 4 files run on macOS (flags as run-default-tests.mjs): with global cleargate (/opt/homebrew/bin) 79/79 pass rc 0; PATH without cleargate (NO-CLEARGATE confirmed) 79/79 pass rc 0. Keychain: read-only count of test-svc-0 entries 20 before and after; unchanged.
8. Typecheck clean at the commit.

Notes (non-blocking): run-default-tests.mjs signal false-green (OD-1) and mock.module sweep (OD-4) remain follow-ups; first real GitHub Actions run is still the final proof (Q5). Task Breakdown rows in the story are unticked (advisory). Running the 4 files via bare `tsx --test` without --experimental-test-module-mocks fails the keychain file at load; use npm test flags.

Proposed flashcards:
- 2026-11-07 · #qa #test-harness · Running single test files needs run-default-tests flags (--experimental-test-module-mocks); bare tsx --test fails mock.module files at load.
- 2026-11-07 · #ci #gitleaks · gitleaks auto-reads repo-root .gitleaks.toml; to prove an allowlist works, scan with an explicit default-only config.
- 2026-11-07 · #qa #docker · macOS jq is not a Linux binary; fetch jq-linux-amd64 and mount at /usr/bin/jq for amd64 container runs.
