# Sprint 41 Isolated Baseline

**Recorded:** 2026-09-11T23:32:11Z  
**Scope:** isolated local preparation only; no implementation, story preflight, or full tests.

## Paths

- Run root: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1`
- Outer isolated clone: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace`
- Nested isolated CLI clone: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/workspace/cleargate-cli`

`CG_TEST` did not exist when preparation began. It was created as a real directory, checked not to be a symlink, and the run root was created with `mktemp -d`.

## Git Baseline

| Repository | Source base SHA | Isolated branch | Current SHA |
| --- | --- | --- | --- |
| outer ClearGate | `11c29fd3b9cf085df5aea5d309c0fdc9d82dcaf8` | `codex/sprint-41` | `fe9f7b893223d4582b9d21d9c1d8d1c3c2d63859` |
| cleargate-cli | `33648024bb7d829506858cfed8899279133813ac` | `codex/sprint-41` | `33648024bb7d829506858cfed8899279133813ac` |

The outer snapshot commit is `fe9f7b89` on `codex/s41-baseline`, message `chore(sprint-41): snapshot isolated planning baseline`; `codex/sprint-41` was created from it. The snapshot contains the requested current planning/bootstrap inputs and the current delivery archive moves. The tracked `cleargate-planning` source was checked clean before cloning, so it was retained from the fresh outer clone.

## Isolation Verification

- Both local clones used `git clone --no-hardlinks`; scans found no multi-link Git objects.
- The outer clone has no live `.claude` directory.
- No `.participant`, `.env`, or `.env.*` files were copied.
- The ignored source tarball `cleargate-cli/cleargate-0.25.0.tgz` was not copied.
- No source checkout, index, branch, trust setting, credential, remote, push, merge, or destructive original operation was changed by this setup.

## Dependency and Payload Status

`cleargate-cli/package.json` scripts were inspected before dependency setup. The required isolated `npm ci` was run through the ClearGate script wrapper and exited `EUSAGE`: this CLI revision has neither `package-lock.json` nor `npm-shrinkwrap.json`.

No `npm install` substitute was used, and `npm run prebuild` was not run because dependencies were not installed. No tests or story preflight were run. The wrapper captured the failed command in the isolated outer clone at `.cleargate/sprint-runs/SPRINT-41/.script-incidents/20260911T233153Z-588c8e06ada4.json`.

## Handoff

The isolated `codex/sprint-41` branches are ready for coordinator-owned planning edits and later explicit worktree creation. Do not treat this baseline as generated-payload or clean-room proof until a lockfile-backed dependency-install path is supplied.

## Dependency Lock Recovery

**Recorded:** 2026-09-11T23:35Z

The source CLI checkout contains an ignored, non-secret `package-lock.json`; it was copied verbatim into the isolated CLI only. SHA-256 in both locations is `98854edd28578b4869d5191411f8e73db9a801c66e67e829537f29ea86feae2c`. Its root package identity (`cleargate@0.26.1`) matches `package.json`.

With that pinned lock present, isolated `npm ci` completed successfully (85 packages installed). npm reported 3 audit findings (1 low, 2 high); no audit fix, dependency update, publication, credential, or source-checkout change was performed.

The normal prebuild then completed through the wrapper: it wrote the isolated outer `cleargate-planning/MANIFEST.json` and copied 81 payload files to `cleargate-cli/templates/cleargate-planning`. This is generated-payload preparation only; no full tests or story preflight were run. The coordinator owns any resulting isolated outer planning checkpoint.

## Planning Checkpoint and Strict Preflight

**Recorded:** 2026-09-11T23:38Z

The coordinator-provided isolated planning edits were stamped and checked through the wrapper without advisory mode or token-stamp fabrication:

- BUG-089 — `bug.ready-for-fix`: passed, 8 enforcing criteria.
- STORY-058-12 — `story.ready-for-execution`: passed, 13 enforcing criteria.
- SPRINT-41 — `sprint.ready-for-execution`: passed, 2 enforcing criteria.

The isolated planning checkpoint is commit `c357bd3af9a5062d0730028eea3cd0398e635c18` on `codex/s41-bootstrap-plan`, mechanically merged with a no-fast-forward commit to `codex/sprint-41` at `cfa42b14bb22463b3354475b0cca7fca34b2a58c`. It contains only the specified planning/raw, wiki, and generated manifest surfaces.

The source-mode wiki ingest could not load `cleargate-cli/src/wiki/templates/synthesis/open-gates.md`; the template exists only in the package `templates/` layout. After an isolated normal CLI build, ingest from `dist/cli.js` succeeded for BUG-089 and SPRINT-41. STORY-058-12 was intentionally skipped because `stories` is absent from `wiki.ingest_buckets`.

Strict `sprint preflight SPRINT-41` was run with `CLEARGATE_ADVISORY` explicitly unset and failed. It passed previous-sprint completion, no-leftover-worktrees, and free legacy `refs/heads/sprint/S-41`; it failed because Step 0 refreshed 17 items and reported an error for STORY-058-08, then left that file modified. The resulting failures were: dirty main (`STORY-058-08_clean_room_verification_procedure_and_driver.md` modified) and 5/19 readiness failures (`STORY-058-12` stale, `BUG-089` stale, `STORY-058-08` `existing-surfaces-verified`, and SPRINT-41 stale twice). No story worktrees, implementation, or full tests were started after this failure.

## Readiness Repair and Worktree Provisioning

**Recorded:** 2026-09-11T23:42Z

The STORY-058-08 existing-surface reference was corrected in the isolated checkout to its actual source (`cleargate-planning/.claude/hooks/stamp-and-gate.sh:4`), not to a generated runtime log. A real stamp and enforcing gate check then passed all 13 STORY-058-08 criteria. The source correction plus its regenerated verdict was committed as `a986680abba04fac8f70f4ae1b59940d5b0724b5` and merged into isolated sprint branch `codex/sprint-41`.

For the three amended raw items whose derived gate timestamps preceded their semantic `updated_at` values, only `cached_gate_result` was invalidated; the real gate command regenerated every result. All three passed: STORY-058-12 (13 criteria), BUG-089 (8), and SPRINT-41 (2). The regenerated results were committed as `e581b664d444acca1c3b1ca3c2c5d6fc958b9dcb` and no-fast-forward merged. Isolated sprint head is now `a1bfe52f2a460aa32833057117e85e73a3e7a768`.

Strict preflight was rerun with `CLEARGATE_ADVISORY` unset and passed all five checks. It verified the legacy `refs/heads/sprint/S-41` name was free; this did not infer or modify a legacy branch.

Provisioned worktrees (no implementation or tests run):

- BUG-089 outer: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/BUG-089/meta` on `codex/BUG-089` from isolated `codex/sprint-41`.
- BUG-089 CLI: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/BUG-089/meta/cleargate-cli` on `codex/BUG-089`.
- STORY-058-12 CLI: `/Users/ssuladze/Documents/Dev/CG_TEST/sprint-41-D2QMC1/stories/STORY-058-12/cleargate-cli` on `codex/STORY-058-12`.

The ignored non-secret lockfile was copied to both CLI worktrees with SHA-256 `98854edd28578b4869d5191411f8e73db9a801c66e67e829537f29ea86feae2c`; `npm ci` completed in each (85 packages). npm reported 3 audit findings (1 low, 2 high); no audit fix or dependency change was made.
