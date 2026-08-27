---
story_id: STORY-054-04
role: developer
sprint_id: SPRINT-39
milestone: M1
created_at: 2026-08-27
---

# STORY-054-04 Developer report — Spikes reach the awareness layer

## Deliverable

Two commits, two repos, in the required order.

- **Commit A (outer repo, FIRST):** `de75fd344271d7ccc7f30551b78f55c2cdcc62fb`, worktree
  `.worktrees/STORY-054-04`, branch `story/STORY-054-04`. Adds `- spikes` to
  `wiki.ingest_buckets` in `.cleargate/config.yml` and
  `cleargate-planning/.cleargate/config.yml`. Two files, two lines, nothing else.
- **Commit B (cleargate-cli repo, SECOND):** `a52134b5d0ebdd5837025fb165267066a00ffe16`,
  branch `story/STORY-054-04`, stacked directly on QA-Red's `993210a5` (test file, empty
  diff — confirmed below). Adds the eleven follower-site edits across seven files.

Order held: A's commit timestamp (18:57:16) precedes B's (19:18:10).

## The thirteen sites — all edited

| # | Path | Symbol | Commit |
|---|---|---|---|
| 1 | `cleargate-cli/src/wiki/derive-bucket.ts` | `PREFIX_MAP` — HARD BLOCKER | B |
| 2 | `cleargate-cli/src/wiki/page-schema.ts` | `WikiPageType` union | B |
| 3 | `cleargate-cli/src/wiki/page-schema.ts` | `BUCKET_LABELS` | B |
| 4 | `cleargate-cli/src/wiki/page-schema.ts` | `ACTIVE_BUCKET_ORDER` | B |
| 5 | `cleargate-cli/src/wiki/page-schema.ts` | `ARCHIVE_BUCKET_ORDER` | B |
| 6 | `cleargate-cli/src/commands/wiki-build.ts` | `BUCKET_ORDER` | B |
| 7 | `cleargate-cli/src/commands/wiki-ingest.ts` | `BUCKET_SYNTHESIS_MAP` — HARD BLOCKER | B |
| 8 | `cleargate-cli/src/wiki/load-wiki.ts` | `BUCKET_DIRS` | B |
| 9 | `cleargate-cli/src/wiki/synthesis/product-state.ts` | `buckets` array | B |
| 10 | `cleargate-cli/src/wiki/synthesis/product-state.ts` | `total_*` hand-written block | B |
| 11 | `cleargate-cli/templates/synthesis/product-state.md` | mustache summary table | B |
| 12 | `.cleargate/config.yml` | `wiki.ingest_buckets` | A |
| 13 | `cleargate-planning/.cleargate/config.yml` | mirror | A |

Not touched (BUG-051's, out of scope): `contradict.ts`, `wiki-comments-render.ts`,
`sync/work-items.ts`, `push.ts`, `stamp-and-gate.sh`. `readiness-predicates.ts` untouched
(frozen). No private constant exported.

## Verification

**Commit A scoped diff** (per §3.1's correction — membership only, not byte-parity):

```
diff <(grep -A8 ingest_buckets .cleargate/config.yml) <(grep -A8 ingest_buckets cleargate-planning/.cleargate/config.yml)
```
One residual line (a trailing blank line in the outer file before its `gates:` block) —
pre-existing structural divergence, confirmed via `git diff` that my edit added exactly one
line (`+ spikes`) to each file and touched nothing else.

**Commit A `git status --short` before commit:** exactly the two config files.

**Test file untouched:** `git diff HEAD -- test/wiki/bucket-registry-parity.red.node.test.ts`
against QA-Red's `993210a5` is empty. `KNOWN_BUCKET_GAPS` still 5 rows (verified by reading
the committed file — I did not edit it), no row names `spikes`.

**Targeted run** (`CLEARGATE_META_ROOT=<worktree> npm --prefix cleargate-cli exec -- tsx
--test cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts`, required because
commit A lives only in the worktree pre-merge, per R18/the M1 plan's sanctioned escape):
**11 pass / 0 fail.**

Without the override (default REPO_ROOT = main checkout, which does not yet carry commit
A): P6a/P6b correctly fail — expected pre-merge state per the M1 plan's own "Failure
handling" table. Not a defect; DevOps confirms post-merge.

**Typecheck:** `npm --prefix cleargate-cli run typecheck` — clean.

**Full suite, two runs, both understood:**

1. `CLEARGATE_META_ROOT=<worktree> npm --prefix cleargate-cli test`: **2504 tests, 2500
   pass, 3 fail, 1 skipped.** Failures: (a) the known pre-existing
   `test/commands/sync.node.test.ts` network failure (identical on `main`, no outbound
   network in this sandbox); (b) **two** failures in
   `test/scripts/close-sprint-assume-ack-guard.node.test.ts` — this file independently
   resolves `REPO_ROOT/cleargate-cli/src/cli.ts` and `.../src/commands/sprint.ts` under
   the same `CLEARGATE_META_ROOT` override, and a worktree does not materialize the
   untracked `cleargate-cli/` subdirectory (BUG-046: worktrees carry tracked files only).
   **Verified NOT a regression**: ran that file in isolation with no env var —
   20/20 pass.
2. Plain `npm --prefix cleargate-cli test` (no env var, default REPO_ROOT = main
   checkout): **3 fail** — the same known `sync.node.test.ts` failure, plus P6a/P6b
   (main checkout does not yet carry commit A — expected pre-merge state, see above).

Neither run can show "1 known failure only" pre-merge, because the cross-repo split means
commit A and commit B's default resolution roots never coincide until DevOps merges both.
This is the exact situation the M1 plan's Execution route table and Failure-handling table
describe, not a defect in either commit.

## Requirement 5 — thirteen lists, recorded

Commit B's message states the count explicitly (thirteen independent lists — eleven in
commit B, two config allowlists in commit A) and cites BUG-051 as the deferred
unification's filed home.

## Guardrails honoured

- `readiness-predicates.ts` — zero diff.
- No private constant exported (`BUCKET_SYNTHESIS_MAP` was already exported; unchanged).
- `contradict.ts`, `wiki-comments-render.ts`, `sync/work-items.ts`, `push.ts`,
  `stamp-and-gate.sh` — untouched.
- No file under `.cleargate/delivery/**` staged in either commit.
- No `--no-verify`, no `git reset --hard`, no force-push, no history rewrite.
- Never `cd cleargate-cli && npm test` / never `--workspace` — used `npm --prefix`
  throughout.
- This report file left unstaged in both repos.

## NOTES for QA / DevOps

- The two `close-sprint-assume-ack-guard.node.test.ts` failures under
  `CLEARGATE_META_ROOT=<worktree>` are a genuine, reproducible interaction between two
  unrelated tests that both honour the same override for different purposes (one expects
  a sibling `cleargate-cli/` under REPO_ROOT; the parity test's P6 only needs the two
  `config.yml` files). Worth a line in the sprint report; not this story's to fix (BUG-046
  is the closest existing home, or a new quarantined bug if BUG-046 is considered closed).
- DevOps: per the M1 plan's merge table, verify both commits exist before merging either;
  merge A → `sprint/S-39` then B → cli `main`; re-run
  `npm --prefix cleargate-cli test` and `npm --prefix cleargate-cli run typecheck` with
  **no env var** post-merge — that is the state that must show only the one known
  `sync.node.test.ts` failure.
