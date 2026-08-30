---
story_id: "STORY-054-04"
role: "qa"
mode: "VERIFY"
sprint_id: "SPRINT-39"
milestone: "M1"
created_at: "2026-08-27"
qa_bounces: "0"
arch_bounces: "0"
---

# STORY-054-04 QA-Verify report — Spikes reach the awareness layer

## Verdict: PASS

Two-repo story, two commits, both inspected directly (not on the Developer's word):

- Commit A (outer): `de75fd34` — `.cleargate/config.yml` + `cleargate-planning/.cleargate/config.yml`, exactly one `+ spikes` line each. Confirmed via `git show de75fd34`.
- Commit B (cleargate-cli): `a52134b5` — 7 files, 11 insertions / 6 deletions, stacked cleanly on QA-Red's `993210a5` (`git diff 993210a5..a52134b5 -- test/` empty). Confirmed via `git show --stat a52134b5`.

## 1. Site correctness (13 of 13 correct)

Read every one of the eleven code sites plus both config files directly (not just P2's non-empty check):

- `derive-bucket.ts` `PREFIX_MAP` — `{ prefix: 'SPIKE-', type: 'spike', bucket: 'spikes' }` appended after the `INITIATIVE-` row. `id.startsWith(prefix)` means order is non-hazardous here (R24 is `work-item-type.ts`'s concern, confirmed zero-diff — see §Scope below).
- `page-schema.ts` `WikiPageType` — `'spike'` added, singular, consistent with every other member (`'epic' | 'story' | ... | 'initiative' | 'spike'`). No plural leaked into the type union.
- `BUCKET_LABELS.spikes = 'Spikes'` — correct display string, placed after `topics` (last position, harmless — it's an object literal).
- `ACTIVE_BUCKET_ORDER` and `ARCHIVE_BUCKET_ORDER` both append `'spikes'` at the end and **agree with each other** — no divergence between active/archive ordering.
- `wiki-build.ts` `BUCKET_ORDER` — `'spikes'` appended, independent list from #4/#5, correctly wired.
- `wiki-ingest.ts` `BUCKET_SYNTHESIS_MAP.spikes = ['open-gates', 'product-state']` — verified byte-for-byte identical to the `initiatives` row, exactly as the M1 plan's derivation argument requires (neither a sprint nor an epic → skip `active-sprint`/`roadmap`).
- `load-wiki.ts` `BUCKET_DIRS` — `'spikes'` appended.
- `product-state.ts` `buckets` array (`:36`) — `'spikes'` appended; `total_spikes: countBucket('spikes').length` added to the hand-written totals block, matching the existing per-bucket pattern; `active_spikes`/`shipped_spikes` come for free from the `Object.fromEntries(buckets.map(...))` spread since `buckets` now includes `'spikes'`.
- `templates/synthesis/product-state.md` — new row `| Spikes | {{total_spikes}} | {{active_spikes}} | {{shipped_spikes}} |`. Column count (4) matches the header (`Type | Total | Active | Shipped`), and all three mustache variable names match exactly what `product-state.ts` now emits. Confirmed by direct file read, not by the test passing.
- `.cleargate/config.yml` and `cleargate-planning/.cleargate/config.yml` — see §3 below.

**13 of 13 correct.** No value is wrong, mismatched, or placed inconsistently with its sibling.

## 2. Synthesis map — `spikes` got `['open-gates', 'product-state']`, correct vs `initiatives`

Verified this is the exact same value the `initiatives` row carries in `BUCKET_SYNTHESIS_MAP` (read both rows directly in `wiki-ingest.ts:565-576`). Per the M1 plan's derivation (open-gates Gate 3 = all buckets, product-state's `shippedItems` scan = all buckets, `active-sprint.ts` = sprints-only, `roadmap.ts` = sprints+epics — a spike is neither), this is the only correct value. A spike ingest recompiles exactly `open-gates` and `product-state`, nothing else — right.

## 3. Config preservation — intact, one line per file

`git show de75fd34` shows **exactly one `+` line per file, zero deletions**. Direct read of both files post-commit confirms:

- Live `.cleargate/config.yml` (36 lines) still carries `index_token_ceiling`, `bucket_pagination_ceiling`, the full `gates:` block (including `precommit: "npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test"`), and the `worktree:` block — nothing was touched or reconciled toward canonical.
- Canonical `cleargate-planning/.cleargate/config.yml` (19 lines incl. new row) stays its 18-line-plus-one seed shape, no `gates:`/`worktree:` added.

No "restore parity" damage. This is exactly what §3.1's correction block and R22 required.

## 4. Scope discipline — clean

- `src/lib/wiki/contradict.ts`, `src/lib/wiki-comments-render.ts` — zero diff (`git diff 993210a5..a52134b5` touches neither; confirmed by direct diff against both paths).
- `src/lib/readiness-predicates.ts` — zero diff (frozen sprint-wide, confirmed).
- `src/lib/work-item-type.ts` — zero diff (confirmed; R24's hazard belongs to 054-02, untouched here).
- `src/lib/sync/work-items.ts`, `src/commands/push.ts`, `.claude/hooks/stamp-and-gate.sh` — zero diff.
- No file under `.cleargate/delivery/**` staged in either commit (`git show --stat` on both, grepped for `delivery` — no hits).
- No private constant given an `export` keyword (`BUCKET_SYNTHESIS_MAP` was already exported pre-story; nothing else changed export status).

`KNOWN_BUCKET_GAPS` — exactly 5 rows (`initiatives` × 4 sites + `stories` × mustache), each citing `BUG-051`, **no `spikes` row**. Confirmed by direct read of the committed test file (`test/wiki/bucket-registry-parity.red.node.test.ts:258-279`) — matches the QA-Red baseline exactly, and the Developer's diff against `993210a5` on that file is empty, so this table was never touched by the Developer.

## 5. Requirement 5 — thirteen, recorded

Commit B's message states explicitly: *"Thirteen independent lists had to change for this story (eleven here plus the two config.yml ingest_buckets allowlists landed in commit A, de75fd34, on the outer repo)"* and cites BUG-051 as the deferred-unification home. Verified by direct `git show a52134b5`. Not four, not eleven-standing-alone — thirteen, with the split across commits explained.

## 6. P7 Scenario 2 — honest, not vacuous

`P7 Scenario 2` passes pre-merge because it builds a throwaway `mktemp`-style fixture (`buildFixture([...])`) with its **own** `.cleargate/config.yml` written by `writeSpikeConfig()` (test file lines 464-485), carrying `spikes` in `wiki.ingest_buckets` from the start. `wikiBuildHandler({ cwd: fixture.root, ... })` and `loadWikiConfig` are both cwd-parameterised, so this exercises the **real** `deriveBucket` → `scanRawItems` → `product-state.compile` pipeline end-to-end against a config that already has the allowlist entry — it does not stub or bypass any of the eleven code sites. This is legitimate, not a sidestep: the allowlist-membership question ("does the *real* repo's config carry `spikes`?") is a **separate, independently-tested** concern, covered by P6a/P6b, which read the real `OUTER_CONFIG_PATH`/`CANONICAL_CONFIG_PATH` via `loadWikiConfig(REPO_ROOT)` and correctly fail at baseline (and pass once commit A is visible via `CLEARGATE_META_ROOT`). P7 Scenario 2 answers "does the code correctly count a spike once configured," P6 answers "is the real repo configured." Together they're non-vacuous; neither alone would be, and the test doesn't conflate them.

## 7. Post-merge prediction — independently verified, 11 pass / 0 fail

Ran the targeted suite myself with both commits present simultaneously (`CLEARGATE_META_ROOT` pointed at the worktree carrying commit A, `cleargate-cli` checkout on `story/STORY-054-04` carrying commit B — functionally identical to the post-merge state where A is on `sprint/S-39` and B is on cli `main`):

```
CLEARGATE_META_ROOT=.../.worktrees/STORY-054-04 npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts
```

Result: **11 pass / 0 fail**, all eleven named (P1, P2, P3, P4, P5, P6a, P6b, both Scenario-3 negatives, both P7 scenarios). This confirms the dispatch's stated 9/2 result on the un-merged main checkout is exclusively an artifact of commit A's absence there — once both commits coexist, the suite is fully green. DevOps should expect **11 pass / 0 fail** post-merge with no env var required (main checkout will carry commit A directly; cli `main` will carry commit B directly).

## Script Incidents

None. All verification was direct `git show`/`git diff`/`Read`/targeted `npm --prefix cleargate-cli exec -- tsx --test` — no `.cleargate/scripts/*.mjs` invocation required.

## flashcards_flagged

- "2026-08-27 · #test-harness #cross-repo · A tmpdir-fixture test with its OWN config isn't vacuous if it exercises the real code path — the real-repo-config question just needs a SEPARATE assertion (P6) to avoid conflating 'code works' with 'repo configured'." [SPRINT-39 STORY-054-04]
