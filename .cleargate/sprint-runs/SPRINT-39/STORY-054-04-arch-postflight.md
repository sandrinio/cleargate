---
story_id: STORY-054-04
role: architect
mode: POST-FLIGHT
sprint_id: SPRINT-39
milestone: M1
wave: 3
created_at: 2026-08-27
---

# STORY-054-04 Architect post-flight — Spikes reach the awareness layer

## Verdict: PASS — cleared for DevOps merge

Nothing in either commit is wrong. I re-derived nothing QA already established (13 sites, zero
test-file diff, 5-row `KNOWN_BUCKET_GAPS`, synthesis-map parity with `initiatives`, mustache
column/name agreement, five zero-diff files, live `config.yml` intact). This pass answers the five
questions asked, each with an executed check rather than a re-read.

**One correction to the dispatch's premise** (§1) and **one hazard that is not a hazard** (§2). Both
below. No file in either commit was touched by this pass.

---

## 1. Merge order — literal instruction, red-window analysis, half-merge rollback

### 1.1 The claim, adjudicated

> *"Merge A into `sprint/S-39` first, then B into `cleargate-cli` `main` — no red window at all,
> because the parity test itself only arrives on cli `main` with commit B."*

**Order: CONFIRMED. Reasoning: PARTIALLY REFUTED. Conclusion "no red window": TRUE ON THIS MACHINE,
FALSE AS A GENERAL STATEMENT.**

The order is right and the intermediate state is genuinely green. But the reason it is green is not
only that the test arrives with B — it is that `REPO_ROOT` resolves to a checkout **that happens to
be on `sprint/S-39`**. Verified just now:

```
$ git branch --show-current          # outer main checkout
sprint/S-39
```

That single fact is what makes the window zero. P6a/P6b read the outer checkout's *working tree*,
so commit B's greenness on cli `main` is a **cross-branch** dependency, not merely a cross-repo one.
Restated precisely:

| State | cli `main` suite |
|---|---|
| A merged to `sprint/S-39`, B not merged | **green** — cli `main` has neither the test nor the code; nothing can be red. Claim correct. |
| A merged, B merged, outer checkout on `sprint/S-39` | **green, 11/0** — verified below. |
| A merged, B merged, outer checkout switched to `main` | **RED on P6a + P6b** — outer `main` does not carry A until `sprint/S-39` merges at sprint close. |
| B merged, A not merged (forbidden order) | **RED on P6a + P6b** for the whole window. |
| cli repo cloned alone, no sibling meta-repo | **SKIPPED, not red** — both P6 tests carry `skip: !fs.existsSync(...)` (`bucket-registry-parity.red.node.test.ts:389`, `:402`). |

So the residual window is real but relocated: **from B's merge until `sprint/S-39` merges to outer
`main` at close, cli `main`'s suite depends on an unmerged outer branch.** Two triggers make it
visible: (a) anyone runs `git switch main` in the outer checkout and then runs the cli suite;
(b) `CLEARGATE_META_ROOT` is pointed at a tree without A (e.g. a stale worktree). It is not fixable
by ordering — a commit cannot depend on an unmerged branch — and A-then-B is the minimum-exposure
order, which is the plan's conclusion via a slightly different argument. `git push` of cli `main`
(currently 3 commits ahead of `origin/main`, unpushed) does **not** widen it: a standalone clone has
no sibling meta-repo, so P6 skips. There is no CI in `cleargate-cli` (`.github/workflows` does not
exist), so no automated surface is exposed.

### 1.2 Preconditions DevOps must check before touching anything

All four verified true as of this report; re-verify, do not assume.

1. Outer main checkout is on `sprint/S-39` — `git branch --show-current`.
2. Both configs are clean — `git status --porcelain -- .cleargate/config.yml cleargate-planning/.cleargate/config.yml` prints nothing. (Other files in the tree are dirty; that is fine, the merge does not touch them.)
3. Both commits exist, per the M1 plan's binding rule *verify both before merging either*:
   - outer `de75fd34` reachable from `story/STORY-054-04` (1 commit ahead of merge-base `575bb7db`, 2 files, +2/-0);
   - cli `a52134b5` reachable from cli `story/STORY-054-04` (2 commits ahead of `db13a03`: QA-Red `993210a5` then Dev `a52134b5`).
4. No conflict is possible: `git diff 575bb7db..sprint/S-39 -- .cleargate/config.yml cleargate-planning/.cleargate/config.yml` is **empty** — `sprint/S-39` has not touched either file since the branch point. cli `main` is *at* the merge-base (`db13a03`), so B is a clean fast-forwardable merge.

### 1.3 The instruction, literally

```bash
# ── STEP 1 — commit A into the sprint branch (outer repo, MAIN checkout) ──
cd /Users/ssuladze/Documents/Dev/ClearGate
git branch --show-current                      # must print: sprint/S-39
git merge --no-ff story/STORY-054-04 \
  -m "Merge STORY-054-04: spikes reach the awareness layer (wiki.ingest_buckets, both trees)"

# ── STEP 2 — verify A landed and destroyed nothing ──
grep -c '^    - spikes$' .cleargate/config.yml cleargate-planning/.cleargate/config.yml   # 1 and 1
grep -c 'precommit\|provision_mode' .cleargate/config.yml                                 # 2 — gate+worktree config intact
git diff HEAD~1 --stat                                                                    # 2 files, 2 insertions, 0 deletions

# ── STEP 3 — commit B into cleargate-cli main (separate repo, no sprint branch there) ──
cd /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli
git checkout main                              # at db13a03, clean
git merge --no-ff story/STORY-054-04 \
  -m "Merge STORY-054-04: bucket registry sites for spikes"

# ── STEP 4 — post-merge verification, NO env var, from the outer root ──
cd /Users/ssuladze/Documents/Dev/ClearGate
npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts
#   REQUIRED: pass 11 · fail 0 · skipped 0.   "skipped 2" is a FAILURE of this step — see §2.3.
npm --prefix cleargate-cli run typecheck       # clean
npm --prefix cleargate-cli test                # exactly 1 failure: test/commands/sync.node.test.ts (no network)
#   NEVER set CLEARGATE_META_ROOT for the full-suite run — it trips close-sprint-assume-ack-guard (2 false reds).
```

Step 3 is not optional and not reorderable. Step 4's full-suite run must be done with **no env var**;
that is the only configuration that proves the post-merge claim.

Then, unchanged from the standard contract: `git worktree remove .worktrees/STORY-054-04`;
state transition to `Done` from the **main checkout** via
`CLEARGATE_STATE_FILE="$PWD/.cleargate/sprint-runs/SPRINT-39/state.json" bash .cleargate/scripts/run_script.sh node .cleargate/scripts/update_state.mjs STORY-054-04 Done`;
stage **only** `state.json` (whitelisted at `.cleargate/scripts/surface-whitelist.txt:24`, so no
`SKIP_SURFACE_GATE` is needed); leave every `*-dev.md` / `*-qa.md` / `*-arch-postflight.md` unstaged
for the orchestrator. Branches `story/STORY-054-04` in both repos are left in place per the sprint's
close-time branch-cleanup deferral.

**Observation for the orchestrator, not for DevOps to act on mid-merge:** `git worktree list` still
shows `.worktrees/STORY-054-01` (merged at `827a77e1`, state `Done`). Pre-close Step 2.7 blocks on
leftover worktrees; that one needs removing before close.

### 1.4 Half-merge rollback — the case nothing in this sprint has needed

**A landed, B fails or is abandoned → DO NOT REVERT A. Leave it.**

A alone is inert, and I verified that independently rather than accepting the plan's assertion. Every
consumer of `wiki.ingest_buckets` in `cleargate-cli/src` is a *membership filter applied after a
bucket has already been derived* — `wiki-build.ts:75`, `wiki-ingest.ts:155`, `:543`, `:681`, all
routed through `isBucketIngestable` (`wiki-config.ts:58-61`). Without B's `PREFIX_MAP` row no code
path can produce the string `spikes`, so the allowlist entry is unreachable. **No validator anywhere
rejects an unknown allowlist entry** — I grepped every reader of `ingest_buckets` in `src/` and
`test/`; there is no schema check, and `wiki lint` never reads the key. So `sprint/S-39` carrying A
alone is behaviourally identical to `sprint/S-39` without it, and reverting buys nothing while
costing a commit.

If policy nonetheless demands the tree carry no orphan config:
`git revert -m 1 <merge-commit-of-A>` (it is a merge commit, so `-m 1` is mandatory — a bare
`git revert` errors out). Never `reset --hard`, never force-push. Report BLOCKED with the revert SHA.

**B landed, A missing or A must be rolled back → this is the only genuinely bad state.** cli `main`
is red on P6a/P6b for every run in this layout. Two exits, in order of preference: (1) land A
immediately — it is two lines and conflict-free; (2) if A cannot land, `git revert -m 1 <cli merge
commit>` in the `cleargate-cli` repo. **Never leave B alone on cli `main`.** Note the asymmetry that
makes the order load-bearing: A-alone is invisible, B-alone is loud.

**Both merged, then a defect is found later:** revert B first, then A. Reverting A first reproduces
the B-alone red state for the duration between the two reverts.

---

## 2. `META_ROOT` post-merge — CONFIRMED, with a sharper acceptance criterion

### 2.1 The resolution chain, executed not read

```
CLI_ROOT  = resolve(__dirname, '..', '..')   from test/wiki/  → /Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli
REPO_ROOT = resolve(CLI_ROOT, '..')                            → /Users/ssuladze/Documents/Dev/ClearGate
```
(`bucket-registry-parity.red.node.test.ts:105`, `:110-112`.) Executed through `fs.realpathSync` to
close the symlink hole R18 does not mention: `cleargate-cli` is a **real directory**, not a symlink
(`drwxr-xr-x`), so node's realpath-based ESM `__dirname` cannot land anywhere else. `REPO_ROOT` is
the main outer checkout, full stop.

**Nothing sets `CLEARGATE_META_ROOT` ambiently.** Verified absent from `cleargate-cli/scripts/**`,
`package.json`, `scripts/run-default-tests.mjs`, and the repo-root `.env`. The unset-env path is
genuinely the default, not an accident of shell state.

### 2.2 The test cannot read a different `config.yml`

`loadWikiConfig(root)` is `path.join(root, '.cleargate', 'config.yml')` with an `existsSync` guard
and **no upward walk, no cosmiconfig-style search** (`src/lib/wiki-config.ts`, `loadWikiConfig`).
P6a reads `<REPO_ROOT>/.cleargate/config.yml`; P6b reads
`<REPO_ROOT>/cleargate-planning/.cleargate/config.yml` — exactly and only the two files commit A
edits. There is no third `config.yml` on either path, and no mechanism by which a parent- or
child-directory config could be substituted. The R18 hazard shape does not exist here.

### 2.3 Post-merge state verified against the **true merged tree**, not a proxy

QA simulated post-merge by pointing `CLEARGATE_META_ROOT` at the story worktree. That is one step
removed from the real thing. I computed the actual merge output without touching any working tree:

```
$ git merge-tree --write-tree sprint/S-39 story/STORY-054-04   → 0c2bce0b93...
```

and materialized both merged config blobs into a throwaway root. Confirmed on the merged content:
live `config.yml` = current file **plus exactly one line** (`- spikes`), with `index_token_ceiling`,
`bucket_pagination_ceiling`, the full `gates:` block and `worktree:` block all present; canonical =
19-line seed with `- spikes` appended and no `gates:`/`worktree:` leaked in. Then ran the parity
test against that root:

```
pass 11 · fail 0 · skipped 0   (P1 P2 P3 P4 P5 P6a P6b, 2 negatives, P7×2)
```

This is the strongest available pre-merge evidence: the assertion ran against the bytes the merge
will actually produce.

### 2.4 The one thing DevOps must not accept as green

P6a/P6b are guarded by `skip: !fs.existsSync(...)`. **A wrong `REPO_ROOT` therefore presents as
`skipped`, not as `fail`** — silent absence of coverage, which is the R18 failure mode inverted.
Acceptance for Step 4's targeted run is therefore *three* numbers, not one:
`pass 11 · fail 0 · skipped 0`. A run reporting `pass 9 · fail 0 · skipped 2` means the root
resolved somewhere without a meta-repo and proves nothing about the config.

Corollary worth recording: because the guard skips, **P6 only ever executes in the dogfood layout**.
On any machine where `cleargate-cli` is checked out without its meta-repo sibling, the two assertions
that protect the config are inert. Green elsewhere is not evidence the allowlist carries `spikes`.

### 2.5 No other test reads the files commit A edits, except benignly

`test/commands/init.node.test.ts:125-126` derives its own `META_ROOT` (no env branch) and passes
`payloadDir: <META_ROOT>/cleargate-planning` into `initHandler`, so it copies the **canonical
`config.yml` commit A edits** into a tmpdir and runs a real `wiki build` over it. Its assertions are
"epic page present, story pages absent" — an extra allowlist entry changes neither. Empirically
confirmed by the Developer's full-suite run, which had the edit visible and did not fail that file.
No other test in the suite reads either config from a repo-level root.

---

## 3. What this story changed for BUG-051 and BUG-054

### 3.1 BUG-051 — evidence updated (factual, appended; one judgement call flagged, not taken)

Its drift table was measured before this story and is now stale in five specific ways, all factual.
I appended a dated `### 3.1` block to BUG-051 §3 recording them. Frontmatter untouched; no criterion
box checked; no scope changed. What the block records:

1. **The count.** §1 says *"fourteen independent wiki-bucket lists."* Measured today: **fifteen**
   live bucket-name sites (thirteen now carry `spikes`; two deliberately do not), plus a **sixteenth**
   prose reference at `cleargate-planning/.cleargate/config.example.yml:10` (`# Valid buckets: epics |
   stories | sprints | proposals | initiatives | crs | bugs`), which is now stale in two directions —
   it omits `spikes` *and* `topics`.
2. **§1(b) and §3's quoted evidence are one element short.** `load-wiki.ts:13` now reads
   `['epics','stories','sprints','proposals','crs','bugs','topics','spikes']`. A fixer running the
   §2 repro (`sed -n '13p'`) gets a line that does not match the evidence block and may conclude the
   bug was already fixed. **The substantive claim — no `initiatives` — is unchanged and still true.**
3. **§1(c)'s three product-state sites each gained `spikes` and still lack `initiatives`,** which
   *strengthens* the claim: this story is a worked demonstration that adding one bucket requires all
   three edits, and that the mustache row is load-bearing (without it, sites 9-10 render nothing).
4. **§5 is the important one — its two open premises are both now settled.** §5 says *"the test does
   not exist yet; writing it is part of the fix"* and poses the export-vs-parse-source fork as an
   open decision. Both resolved by `a52134b5`: `cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts`
   exists, reads **source text** (no constant was exported), collects every finding, names the site
   by label, and its `KNOWN_BUCKET_GAPS` enumerates precisely BUG-051 §1(b)+(c) as five rows. BUG-051's
   fix is therefore **materially smaller than the bug describes**: close the gaps, delete the rows,
   drop P3's size assertion. Left uncorrected, a fixer writes a second parity test — which would be
   the sixteenth list, i.e. the defect the bug exists to end.
5. **One new drift row, deliberate.** `spikes` is absent from `src/lib/wiki/contradict.ts:313
   getBucketFromId` (a `SPIKE-` id falls through to `topics`) and from
   `src/lib/wiki-comments-render.ts:33 resolveBucket` / `:45 getPrimaryId`. Correctly excluded from
   054-04's surface. **`contradict.ts` is not in BUG-051 §4's Modify list** — the appended block adds
   it, with the measured blast radius (see §5 below).

Also recorded, as an adjacent measured fact that corroborates the class without being this story's:
`PREFIX_MAP` has **no `HOTFIX-` row**, so `deriveBucket('HOTFIX-001_x.md')` throws — `wiki build`
skips it silently (`scan.ts:59-64`), `wiki ingest` exits 1 (`wiki-ingest.ts:128-139`). Pre-existing;
relevant to CR-108 (§4).

**Flagged as judgement calls, NOT taken:** whether BUG-051's severity should rise now that its own
fix is partly pre-built; whether the `contradict.ts` gap should be closed inside STORY-054-02; and
whether BUG-051's Ambiguity-Gate box *"Verification command (failing test) is provided"* is now
satisfiable by the shipped parity test. That last one is one keystroke from flipping a quarantined
item to 🟢 by interpretive leap — it is the human's, and I left the box unchecked and said so in the
appended block.

### 3.2 BUG-054's shape vs. `KNOWN_BUCKET_GAPS` — will it calcify?

**Plainly: no, not the same way — and the reason is structural, not cultural. But it will not shrink
on its own either, and nothing today makes it shrink.**

The two are different failure classes and it matters:

- BUG-054's nine vacuous criteria are **uncounted**. Nothing enumerates them, nothing asserts their
  number, and each one reads as a passing gate. Silence is what let nine accumulate.
- `KNOWN_BUCKET_GAPS` is **counted, named, reasoned and size-asserted** — P3 pins `size === 5` and
  requires each row to cite BUG-051; P4 forbids the shipping story from declaring its own gap. This
  is the `KNOWN_UNPINNABLE` pattern and the FLASHCARD rule it came from.

Three properties keep it honest:

1. **It cannot grow silently.** Adding a sixth row makes P3 red; the author must change `5` to `6`
   in the same commit — a visible, reviewable edit with a reason string attached.
2. **It cannot persist past its cause silently.** Closing a gap makes P3 red *in the shrink
   direction* — a story that adds `initiatives` to `load-wiki.BUCKET_DIRS` is forced to decrement
   the table. The assertion is symmetric, and symmetry is the right shape here.
3. **The escape hatch is closed for the story that owns it** (P4).

What is missing, and is the only real calcification risk: **nothing forces the number down.** There
is no expiry, no owner, no test that fails when BUG-051 closes, and no assertion that all five rows
attribute to one open bug. The table can sit at 5 indefinitely while BUG-051 stays `approved: false`,
and each future bucket-adding story faces a two-line escape (add rows) that is cheaper than a two-site
fix — visible, but not blocked.

**For it to shrink rather than calcify, two things must be true:**

- **BUG-051's DoD must own the exit condition, not the test.** Its §5 should read: *"`KNOWN_BUCKET_GAPS`
  drops 5 → 0 and the table, P3 and P4 are deleted with it."* Recorded as a recommendation in the
  appended §3.1 block — I did not edit its DoD, that is scope.
- **P4 must generalise on the next bucket.** Today it says "no row naming `spikes`". The next
  bucket-adding story must extend it to "no row naming the bucket this story adds", or P4 protects
  only spikes and the hatch reopens for bucket #9. Recorded in sprint-context §Adjacent Implementations.

---

## 4. Producer obligations — what `spikes` being real imposes on wave 4 and beyond

`spikes` is now a wiki bucket. `spike` is not yet a work-item type. Those are **different registries
with different plurality conventions**, and the gap between them is the single sharpest hazard this
story leaves behind.

### 4.1 STORY-054-02 (wave 4) — the false-positive grep

After this merge, a Developer grepping `'spike'` in `cleargate-cli/src` gets hits in **three modules
before 054-02 writes a line**:

| Hit | What it actually is |
|---|---|
| `src/wiki/page-schema.ts:7` — `WikiPageType = ... \| 'spike'` | a **wiki page type**. Landed by 054-04. |
| `src/wiki/derive-bucket.ts:17` — `{ prefix: 'SPIKE-', type: 'spike', bucket: 'spikes' }` | the `type` field here is a `WikiPageType` (imported at `derive-bucket.ts:1`), **not** a `WorkItemType`. Landed by 054-04. |
| `src/lib/work-item-id.ts` — `TYPE_PREFIXES` already contains `SPIKE` | the ID-grammar union (R25), pre-existing, twelve UPPERCASE prefixes. |

None of those is the registry 054-02 owns. **054-02's targets are `src/lib/work-item-type.ts`
(`FM_KEY_MAP` `spike_id` → `'spike'`, the `WorkItemType` union, `WORK_ITEM_TRANSITIONS` 8 → 9) and
`src/commands/push.ts` (decision-2).** It must **not** touch `page-schema.ts` or `derive-bucket.ts` —
they are done, and re-touching them can only break P2/P3.

Plurality, stated once so nobody has to guess: **bucket `spikes` (plural)** — config allowlist, wiki
directory, `BUCKET_*` lists, `BUCKET_SYNTHESIS_MAP` key. **type `spike` (singular)** — `WikiPageType`,
`WorkItemType`, `TEMPLATE_FOR.spike`, `spike.md`, `spike_id`. There is no site where the plural form
belongs in a type registry, and none where the singular belongs in a bucket list. Also unchanged from
the M1 plan: **`spike` must NOT be added to `lint-checks.ts:303 ENFORCING_TYPES`** — the spike gate
ships advisory.

### 4.2 `PREFIX_MAP` is now an authority, and adding a row is an eleven-site commitment

`bucket-registry-parity.red.node.test.ts` derives `DELIVERY_BUCKETS` from
`derive-bucket.ts` `PREFIX_MAP`. One authority, ten followers. **Any future story that appends a row
there immediately owes the new bucket in all ten follower sites** — P2 demands it, P3 makes the
paper-over visible, P4 (once generalised) forbids it. That is the intended ratchet and it should be
stated in any story that proposes a new bucket, before it is dispatched.

### 4.3 STORY-054-03 (wave 5) — the doctrine caveat that is easy to get wrong

`.cleargate/config.yml` is in `INTENTIONALLY_UNTRACKED` in `cleargate-cli/scripts/build-manifest.ts:333-341`
(*"first-install-only, per-project policy the user owns outright"*). Consequences for any doctrine
sentence 054-03 writes:

- **`cleargate upgrade` will never add `spikes` to an existing install's allowlist.** New installs
  get it from the canonical seed; existing repos must add `- spikes` to `wiki.ingest_buckets` by hand.
- Repos whose config omits `ingest_buckets` entirely are unaffected — absent key means all buckets
  (`isBucketIngestable`, `wiki-config.ts:58-61`).
- So a promise of the form *"conclude a spike and it appears in your wiki"* is true here and in new
  installs, and false in every already-installed repo until one line is added. One caveat sentence.
- Consistent with this: **no MANIFEST refresh is required for commit A** (unlike 054-01's template).

`config.example.yml:10`'s `# Valid buckets:` prose line is now stale. R22 correctly kept it out of
054-04. If 054-03 opens that file for another reason it may fix it; otherwise it stays BUG-051's.

### 4.4 M2 (STORY-054-06, 054-07) and M4

- **054-06:** no coupling. No `section(N)`, no template, no bucket list.
- **054-07:** if it writes agent-facing prose enumerating wiki buckets, `spikes` belongs in it.
- **Any story with a fixture pinning `product-state.md`'s summary table** now sees a `| Spikes |`
  row (count 0 until a charter is ingested). Update the fixture, do not delete the row.
- **CR-108 (M4, `cleargate new <type>` for all types):** two inherited facts. (1) It depends on
  054-02's registry row, not on this story — a `spike` scaffolded into `pending-sync/` will ingest
  correctly because `PREFIX_MAP` now resolves it. (2) **`HOTFIX-` has no `PREFIX_MAP` row**, so a
  scaffolded hotfix is silently skipped by `wiki build` and hard-errors `wiki ingest` (exit 1). CR-108
  makes hotfix items easier to create and therefore makes that path more likely to be hit. Not CR-108's
  to fix (BUG-051 owns it), but its DoD should state the expected behaviour rather than discover it.

All of the above is appended to `sprint-context.md` §Adjacent Implementations.

---

## 5. Residual risk

The two advisory sites left unfixed are **dormant in the sense that matters and non-inert in one
measurable way**, and I would rather state the distinction than round it to "harmless".
`wiki-comments-render.ts` is genuinely dormant: `renderComments` early-`return`s when `resolveBucket`
yields `null` (`:118-120`), and reaching it at all requires a spike that has been pushed to the server
*and* has pulled comments — and `cleargate push` cannot type a spike until STORY-054-02 lands the
`push.ts` row, so the path is unreachable today and low-traffic afterwards; the same gap already
exists for sprints, initiatives and hotfixes, so spikes join an existing silence rather than opening
a new one. `contradict.ts` is the one that actually does something: `getBucketFromId('SPIKE-001')`
returns `'topics'`, so `preparePhase4`'s SHA-idempotency probe (`:88-96`) looks for
`wiki/topics/SPIKE-001.md`, never finds it, and **never skips** — Phase 4 re-prepares a contradiction
check on every ingest of an unchanged spike charter, and the neighborhood lookups at `:345`, `:353`,
`:365` miss real spike pages, so the check runs with less context than it should. No corrupt output
results and **no phantom page is written**: `stampContradictSha` (`:478-486`) reads before writing and
swallows ENOENT, so the mis-resolved path is a no-op rather than a stray `wiki/topics/SPIKE-*.md` that
`wiki lint` would then index. Net: wasted work and thinner contradiction context for spikes, visible
only to someone re-ingesting a charter, with no wrong artifact on disk — acceptable until BUG-051 is
scheduled, and worth one line in that bug rather than a mid-sprint fix. The larger residual is not
these two sites at all: it is that P6a/P6b bind cli `main` to outer `sprint/S-39` until close, and
that they *skip* rather than fail wherever the meta-repo sibling is absent — so the only assertion
protecting the allowlist runs in exactly one layout, and a green suite on any other machine says
nothing about it.

---

## Script Incidents

None. No `.cleargate/scripts/*` invocation was required by this pass; all verification was
`git`/`node`/`npm --prefix ... exec -- tsx --test` and direct reads.

## Files changed by this pass

- `.cleargate/sprint-runs/SPRINT-39/STORY-054-04-arch-postflight.md` (this file — left unstaged)
- `.cleargate/delivery/pending-sync/BUG-051_Work_Item_Registries_Drifted.md` (append-only `### 3.1`)
- `.cleargate/sprint-runs/SPRINT-39/sprint-context.md` (append-only: §Adjacent Implementations + §Mid-Sprint Amendments)
- `.cleargate/sprint-runs/SPRINT-39/plans/M1.md` (append-only post-flight addendum)

**No file in either story commit was touched.** `src/`, both `config.yml`s, the test file and every
fixture are byte-identical to `de75fd34` / `a52134b5`.

## flashcards_flagged

- `2026-08-27 · #test-harness #cross-repo #danger · A cli test asserting on the meta-repo's working tree binds cli main to a BRANCH, not just a repo — green depends on which branch the sibling checkout is on.`
- `2026-08-27 · #test-harness #cross-repo · existsSync-guarded skip inverts R18: a wrong root reads as SKIPPED, not failed — acceptance must assert pass/fail/skipped, all three.`
- `2026-08-27 · #git #merge · git merge-tree --write-tree gives you the true merged bytes to test against without touching any working tree — better than a worktree proxy.`
- `2026-08-27 · #gate #test-harness · A size-asserted exception table resists growth AND shrinkage; the exit condition must live in the bug's DoD, or 5 stays 5 forever.`
