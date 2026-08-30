# DevOps Report — CR-108 (SPRINT-39, wave 12)

role: devops

STATUS: **DONE.** Both merges (Step 1, Step 2, recorded below) plus the QA §9 pin-repair follow-up
are complete and verified. Steps 4 (teardown) and 5 (state transition) — the only two steps
authorized in this dispatch — are now also complete, both verified against the three required
measurements.

## Addendum — what resolved since the prior HALT (this dispatch)

The prior halt (full-suite `fail 4`, one unaccounted-for failure) was correct and the finding was
real: `claude-md-anchoring.red.node.test.ts:172` pinned the canonical `CLAUDE.md` anchored-block
length at `11762` — the same frozen-pin defect class TPV amendment A3 had already fixed in a
different file, uncaught by either mutation round because both scoped their sweep to the file under
test. QA repaired it on cli `main` @ **`9df6f2a`** (`test(CR-108): replace frozen CLAUDE.md length
pin with cross-tree identity`), replacing the length pin with a cross-tree identity assertion. Per
the redispatch, full suite is now `tests 2648 · pass 2644 · fail 3` (N6b expected-red + BUG-067;
`sync.node.test.ts` pre-existing network case; `reporter-content.node.test.ts` CR-110 live/canonical
drift, clears at Gate-4 re-sync) — no further verification of the suite was performed or required
this dispatch (explicitly out of scope: "Steps 4 and 5 only").

Pre-dispatch state, confirmed before touching anything:
- outer `sprint/S-39` @ `f2840f16` (the CR-108 merge, already landed from the prior halted run).
- cli `main` @ `9df6f2a`, clean working tree — confirmed via `git -C cleargate-cli log --oneline -1`
  and `git -C cleargate-cli status --short` (empty).
- worktree `.worktrees/CR-108` still present (branch `story/CR-108` @ `ac7c9801`), holding two
  untracked reports (`CR-108-dev.md`, `CR-108-qa.md`) not yet in the main checkout. The main checkout
  already had `CR-108-arch-postflight.md`, `CR-108-qa-red.md`, `CR-108-tpv.md`,
  `CR-108-devops-blockers.md` (from the prior halted run) but was missing `CR-108-dev.md` and
  `CR-108-qa.md` — confirmed by directory listing.

## Step 1 — Outer merge (record from the prior dispatch, unchanged)

- Sprint branch: `sprint/S-39`, pre-merge HEAD `69b28c373bb07a2c68a11b2e85dcfd7df2c94930` (working
  tree clean, confirmed before touching git).
- `git merge --no-ff story/CR-108 -m "merge(CR-108): universal work-item scaffolder — templates and CLAUDE.md"`
- **Merge commit: `f2840f16041a0951990d528115ac7370bc2f9bc8`** — 22 files changed, 390 insertions(+), 82 deletions(-).
- **Conflict:** exactly as the dispatch predicted — `.cleargate/wiki/log.md` conflicted (both sides
  appended a new entry at the same tail position); `.cleargate/wiki/index.md` and
  `.cleargate/wiki/product-state.md` auto-merged cleanly (no markers). Resolved `log.md` as a union
  of both appended entries, ordered chronologically (HEAD's `2026-08-27T17:14:14.120Z` EPIC-058
  entry, then story's `2026-08-29T20:52:05.311Z` CR-108 entry) — no content dropped from either side.
  Reported per instruction ("resolve toward a union ... but report that you had to").
- Pre-commit hooks ran (no `--no-verify`): `check:no-vitest` x3 clean, `no inline work-item-id regexes`
  clean, file-surface gate emitted an advisory ("No active story file found ... skipping surface
  check") — not a block.

### Verification (a) — `bug_id` token
```
.cleargate/templates/Bug.md:30:bug_id: "{ID}"
```
Matches expected exactly.

### Verification (b) — two-tree parity
`for f in .cleargate/templates/*.md; do diff -q "$f" cleargate-planning/.cleargate/templates/$(basename "$f"); done`
→ **no output** (10/10 identical). Matches expected exactly.

### Verification (c) — anchored CLAUDE.md block-equal
```
block-equal: true 11948 / 11948
```
Matches expected exactly.

## Step 2 — cli merge

- `git -C cleargate-cli checkout main` (pre-merge `main` at `82da563238554dcc99ce4dd8589d6e1c9e49b377`)
- `git -C cleargate-cli merge --ff-only story/CR-108` → **fast-forward, no merge commit.**
- **cli `main` now at `b4ae19768ea5895def63684543c08f7eaf9a9bb7`** — CHANGELOG.md, src/cli.ts,
  src/commands/hotfix.ts, src/commands/new.ts (new), src/lib/work-item-type.ts,
  test/commands/new-command.node.test.ts (new), test/docs/gate-section-index-pinning.node.test.ts —
  7 files, 1337 insertions(+), 104 deletions(-).

### Targeted proof-of-reach test (new-command.node.test.ts)
```
env -u CLEARGATE_META_ROOT npx --prefix cleargate-cli tsx --test --test-concurrency=1 cleargate-cli/test/commands/new-command.node.test.ts
tests 57 · suites 17 · pass 56 · fail 1 · cancelled 0 · skipped 0 · todo 0
```
The one failure is exactly N6b (expected-red, BUG-067 — `calling stampFrontmatter directly on a
freshly scaffolded (instructions-intact) file corrupts the real frontmatter`). **Matches expected
exactly** — Step 1's templates reached the outer main checkout's working tree; had it not, this
would have read `fail 11`.

## Step 3 — full suite

`env -u CLEARGATE_META_ROOT npm --prefix cleargate-cli test`

```
tests 2647 · suites 927 · pass 2642 · fail 4 · cancelled 0 · skipped 1 · todo 0
duration_ms 429523.132583
```

**Dispatch expected `fail 2` (N6b + sync.node.test.ts) plus 0–2 machine-state rows (named
candidates: npm-payload parity, live `.claude/reporter.md`). Actual: fail 4.** All four named below —
two match the baseline exactly, one matches a named machine-state candidate exactly, and **one does
not match either named candidate and is not accounted for anywhere in CR-108's own dev/qa reports.**

1. `test/commands/new-command.node.test.ts` — N6b (BUG-067), expected-red per CR-108's own
   acceptance line. **Matches baseline.**
2. `test/commands/sync.node.test.ts` — "exits 2 when no MCP URL or token is configured" — pre-existing
   network failure (`fetch failed` to `https://cleargate-mcp.soula.ge`, no outbound network in this
   sandbox), named in sprint-context.md's Test Stack correction. **Matches baseline.**
3. `test/agents/reporter-content.node.test.ts` — "Capability Surface + Post-Output Brief sections are
   byte-identical between live and canonical" — confirmed by direct diff: canonical
   `cleargate-planning/.claude/agents/reporter.md` carries a `## Goal Acceptance Check` section (CR-110)
   that live `.claude/agents/reporter.md` does not. **Matches the named "live `.claude/reporter.md`"
   machine-state candidate exactly** — CR-110's canonical-only merge leaving the derived live copy
   behind, not a CR-108 defect. (Checked the OTHER named candidate too: `diff --brief
   cleargate-cli/templates/cleargate-planning/.claude/agents/reporter.md
   cleargate-planning/.claude/agents/reporter.md` → no output, npm-payload is NOT drifted. Only one of
   the two named candidates actually manifested.)
4. **`test/lib/claude-md-anchoring.red.node.test.ts`** — "real-file pin: readBlock on canonical
   `cleargate-planning/CLAUDE.md` returns length 11762" — **actual 11948, expected 11762.** This is a
   BUG-043 QA-Red regression pin that hardcodes the byte length of the anchored block in
   `cleargate-planning/CLAUDE.md`, measured against a historical baseline commit. Confirmed by direct
   measurement: `git show 69b28c37:cleargate-planning/CLAUDE.md` (the pre-merge sprint-branch tip) has
   an anchored-block length of exactly 11762 — i.e. this pin was GREEN immediately before Step 1's
   merge and went RED as a direct, mechanical consequence of CR-108's own edit to
   `cleargate-planning/CLAUDE.md` (the `Drafting work items:` bullet, now instructing `cleargate new
   <type>` instead of hand-copying a template — the same edit Step 1's verification (c) measured at
   11948 bytes). **This is neither of the two named candidates and is not mentioned anywhere in
   CR-108-dev.md, CR-108-qa.md, or CR-108-qa-red.md.** It reads as a CR-108 footprint the Developer
   did not budget for (a cli-repo regression test measuring an outer-repo file CR-108 edited), but per
   instruction I am not resolving or characterizing it further — reporting the measurement and halting.

**This is the halt condition**: the dispatch says "Report the exact count and name every failure — do
not round to 'expected'" and "Halt on any number that doesn't match rather than resolving it." Failure
#4 does not match either named 0–2 machine-state candidate, so `fail 4` does not resolve cleanly to
the dispatch's own accounting (`2` baseline `+` at most `2` named candidates, of which only `1`
actually fired). I am halting here rather than guessing at whether #4 is acceptable residue or a real
defect.

## Mirror Parity Audit (templates, Step 1 scope)

All 10 `.cleargate/templates/*.md` ↔ `cleargate-planning/.cleargate/templates/*.md` pairs — diff empty
(clean). See Verification (b) above.

## Incidental observations (not acted on, reporting only per instruction)

- **BUG-048 §3.5 recurrence, 8 more occurrences.** After the outer merge commit, `git status`
  showed 8 unrelated `pending-sync/` items with `sprint_cleargate_id: null` → `sprint_cleargate_id:
  "SPRINT-39"` in their frontmatter, none touched by any command I ran: `BUG-047`, `BUG-048`,
  `BUG-049`, `BUG-050`, `BUG-062`, `CR-109`, `EPIC-055`, `EPIC-057`. Left uncommitted and unmodified
  by me, per "Report it; do not 'fix' other items."
- **`cleargate-planning/MANIFEST.json` shows dirty** (`generated_at` timestamp + the
  `.claude/agents/reporter.md` sha256 changed) even though I never ran `npm run prebuild` or any other
  build/manifest command. Per instruction ("it regenerates spontaneously ... leave it and say so") —
  left untouched, uncommitted.
- `.cleargate/sprint-runs/SPRINT-39/.session-totals.json` and `token-ledger.jsonl` show unstaged
  modifications — these are hook-owned (token-ledger hook), not touched directly, left as-is.

## Full-suite log (from the prior halted run, historical)

Redirected to file, never piped through `tail`/`head` live (N10):
`/private/tmp/claude-501/-Users-ssuladze-Documents-Dev-ClearGate/49c00a07-a425-4af9-9ac6-97ed8ed5ee64/scratchpad/full-suite.log`
(2647 tests, 429.5s wall time — not committed anywhere, scratch only). Superseded by the QA §9
repair; not re-run this dispatch (out of scope — "Steps 4 and 5 only", "Nothing further to verify on
the suite — do not re-run it").

## Step 4 — Preserve reports, then teardown

**Pre-check.** cli `main` confirmed at `9df6f2a` with a clean working tree
(`git -C cleargate-cli status --short` → empty) before touching anything. Main checkout's
`.cleargate/sprint-runs/SPRINT-39/` was missing `CR-108-dev.md` and `CR-108-qa.md` (present only in
the worktree); `CR-108-devops-blockers.md` was already present in the main checkout from the prior
halted run (correct — not re-copied, nothing newer existed in the worktree to bring across; the
worktree held only the two untracked report files listed below).

1. Copied `CR-108-dev.md` and `CR-108-qa.md` from
   `.worktrees/CR-108/.cleargate/sprint-runs/SPRINT-39/` into the main checkout's
   `.cleargate/sprint-runs/SPRINT-39/`. Verified the copied `CR-108-qa.md` carries QA's `## 9. QA
   Amendment — post-merge test repair (SPRINT-39 wave 12)` section (§9.1–§9.6, lines 266–360-ish) —
   the current version, not a stale one.
2. Committed both files on `sprint/S-39` (report-only commit, no source/build changes):
   `chore(CR-108): preserve dev + qa reports (incl. QA §9 pin repair) in main checkout` —
   **commit `c3e9f02b`**, 2 files changed, 597 insertions(+). Pre-commit hooks ran clean
   (`check:no-vitest` ×3, `no inline work-item-id regexes`; surface gate emitted its standard
   no-active-story-file advisory, not a block). No `--no-verify`.
3. `git worktree remove .worktrees/CR-108` → refused
   (`fatal: ... contains modified or untracked files, use --force to delete it`). Inspected first:
   `git -C .worktrees/CR-108 status --short` showed **only** the two report files just copied and
   committed in step 1–2 (`?? .cleargate/sprint-runs/SPRINT-39/CR-108-dev.md`, `?? ...CR-108-qa.md`)
   — nothing else modified or untracked, no source, no uncommitted branch work. Safe to force-remove
   since both files were already durably preserved in the main checkout. Ran
   `git worktree remove --force .worktrees/CR-108` → succeeded (exit 0; the shell surfaced a non-zero
   wrapper exit code with empty stderr, harmless — `git worktree list` and a direct `ls -d` both
   confirm the directory and worktree registration are gone).
4. **Verified:** `git worktree list` no longer lists `.worktrees/CR-108`; `ls -d .worktrees/CR-108`
   → "No such file or directory".
5. **Branches — deliberately untouched, per instruction:** outer `story/CR-108` still exists
   (`git branch --list story/CR-108`), cli `story/CR-108` still exists
   (`git -C cleargate-cli branch --list story/CR-108`). Sanity-checked that the pre-existing unrelated
   `story/STORY-014-{02,03,04,04-bounce,05,06,07,08}` branches are untouched and were never in scope.

## Step 5 — State transition to Done

`CLEARGATE_STATE_FILE=.cleargate/sprint-runs/SPRINT-39/state.json bash .cleargate/scripts/run_script.sh node .cleargate/scripts/update_state.mjs CR-108 Done`
→ `Updated CR-108: state="Done"` (exit 0, via the mandatory `run_script.sh` wrapper — no incident
JSON emitted, no `## Script Incidents` entry needed).

**Three required measurements, before/after:**

| Measurement | Before | After | Match? |
|---|---|---|---|
| `events.jsonl` line count | 21 | 22 | ✅ exactly +1 |
| `state.json` story count | 18 | 18 | ✅ unchanged |
| `arch_bounces` total (summed across all 18 stories) | 1 | 1 | ✅ unchanged (CR-108's own `arch_bounces` was 0; the only nonzero contributor is CR-106) |

New tail event in `events.jsonl`: `{"ts":"2026-08-29T22:03:41.980Z", ..., "story_id":"CR-108",
"from":"Bouncing","to":"Done","actor":"system", ...}`.

**Post-transition roll-up (18 stories):** 17 `Done`, 1 `Ready to Bounce` (`CR-111`) — matches the
dispatch's prediction exactly. Full list: `BUG-042, STORY-054-{01,02,03,04,05,06,07}, BUG-043, BUG-044,
BUG-045, BUG-046, CR-105, CR-106, CR-107, CR-108, CR-110` → `Done`; `CR-111` → `Ready to Bounce`.

No drift-check refusal encountered — `update_state.mjs` ran clean on the first attempt, so the
`rm events.jsonl` recovery recipe was not needed.

## Incidental observations (this dispatch)

- `git worktree remove` (non-force) correctly refused on untracked content, exactly as the guardrail
  is designed to — inspected before forcing, per the general DevOps discipline of never blind-forcing
  a worktree teardown. No destructive action taken beyond removing a worktree whose only untracked
  content had already been durably copied and committed elsewhere.
- `cleargate-planning/MANIFEST.json` remains dirty in `git status` (unrelated, pre-existing per the
  prior report and the dispatch's own note that it "has drifted spontaneously twice today") — left
  untouched, uncommitted, not investigated further per instruction (no `npm run prebuild` run).
- BUG-048 §3.5 `pending-sync/` frontmatter drift (8 items, noted in the prior report) — unchanged
  this dispatch; not touched.
- `.session-totals.json` / `token-ledger.jsonl` under `SPRINT-39/` remain hook-owned unstaged
  modifications, not touched.

DEVOPS: DONE — CR-108 17/18
