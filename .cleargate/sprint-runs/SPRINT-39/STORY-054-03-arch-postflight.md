role: architect

# STORY-054-03 — Architect Post-Flight + M1 Milestone Close

Commit under review: `afdf7feb` on `story/STORY-054-03`, worktree `.worktrees/STORY-054-03/`.
7 files, 52 insertions, 4 deletions. QA-Verify PASS (`STORY-054-03-qa.md`).
This is also the M1 milestone-close review — 054-03 is M1's final story.

Concurrency constraint honoured: no `cleargate wiki` command run, no read of
`EPIC-058_*`, `wiki/epics/EPIC-058.md`, or `wiki/{index,log,product-state,roadmap}.md`
as sprint input. Nothing committed, nothing staged.

---

# Part A — the story

## A1. Is a spike reachable end-to-end? **No. The chain breaks at `CLAUDE.md:161`.**

Walked by reading code and docs, not by running `cleargate wiki`. Six hops:

| # | Hop | Site | Verdict |
|---|---|---|---|
| 1 | Triage names Spike | `CLAUDE.md:140` + `cleargate-planning/CLAUDE.md:18` — `(Epic / Story / CR / Bug / Spike / Pull / Push)` | ✅ this story |
| 2 | Triage → template | `CLAUDE.md:161` "Drafting work items" | ❌ **BREAK** |
| 3 | Template exists | `.cleargate/templates/spike.md` (9081 B, both trees) | ✅ 054-01 |
| 4 | Type detection | `work-item-type.ts:8` union · `:23` `spike_id` in `FM_KEY_MAP` · `:38` `SPIKE-` in `PREFIX_MAP` · `:86` two transitions | ✅ 054-02 |
| 5 | Gate blocks | `readiness-gates.md:252` (`ready-to-investigate`, 4 criteria) and `:267` (`ready-to-conclude`, 3 criteria), both `severity: advisory` | ✅ 054-02 |
| 6 | Bucket | `derive-bucket.ts:17` `{ prefix: 'SPIKE-', type: 'spike', bucket: 'spikes' }` → `.cleargate/config.yml:19` `- spikes` | ✅ 054-04 |

**Hop 2 is the break.** `CLAUDE.md:161` reads:

```
- Use the templates in `.cleargate/templates/` (`epic.md`, `story.md`, `CR.md`, `Bug.md`, `Sprint Plan Template.md`, `initiative.md`).
```

Six templates. `spike.md` is not among them. This is 21 lines below the triage list this
story just amended, in the same file, inside the same `<!-- CLEARGATE:START -->` block,
and it is the **next actionable instruction** after "classify the request". Identical in
canonical (`cleargate-planning/CLAUDE.md:39`).

**Why it reads as closed rather than illustrative.** Every drafting type in the amended
`:140` list has a matching entry at `:161` — Epic→`epic.md`, Story→`story.md`, CR→`CR.md`,
Bug→`Bug.md` (Pull and Push are operations, not draft types). The enumeration is complete
for every type it was written against. Spike is now the only classification an agent can
reach at triage that has no named artifact at the point of drafting.

**And the one pointer that does exist is on the wrong surface.** A `git grep` for
`spike.md` across the tracked outer tree returns exactly five hits: three FLASHCARD lines,
one `wiki/epics/EPIC-055.md` line, and one `MANIFEST.json` path row. Zero in `.claude/`,
zero in `.cleargate/knowledge/`. The **only** guidance pointer to the template in the whole
scaffold is the one this commit adds — `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`
§10: `- **Spike charter, timebox and gate criteria** → .cleargate/templates/spike.md`.

`SKILL.md` is the sprint-execution playbook, loaded when a sprint is active. This story's
own new `### 2.1` says a spike "runs **before sprint kickoff**". So the sole pointer to
`spike.md` lives on the surface that is loaded precisely when a spike is *not* being chosen.

That is the exact failure the commit's own new protocol section describes:

> a rule needed before any template is chosen cannot live anywhere but `CLAUDE.md`.
> Placing a rule on the wrong surface does not make it wrong — it makes it unreachable
> by the agent who needed it.

The Guidance Surface Reach doctrine is correct, and M1 does not satisfy it for the very
type it was written to route.

**Measured second-order cost, not just a doctrinal one.** An agent that never opens
`spike.md` takes the generic naming rule at `CLAUDE.md:162` — `{TYPE}-{ID}-{Name}.md`,
hyphens — instead of `spike.md:30`'s `Output location: .cleargate/delivery/pending-sync/{ID}_{SLUG}.md`.
`deriveBucket` (`derive-bucket.ts:63-66`) computes `id` as *everything before the first
underscore*. With no underscore present, `SPIKE-001-Timebox-Probe.md` yields
`id = 'SPIKE-001-Timebox-Probe'`, not `SPIKE-001` — the wiki page is written under a
mangled key and every `[[SPIKE-001]]` wikilink dangles. The bucket still resolves (the
`startsWith('SPIKE-')` test passes), so this fails silently.

**Scope ruling.** The Developer is not at fault. Story §1.2 Requirement 2 is exhaustive and
names only "the triage classification list in `CLAUDE.md:140`"; §1.5's mitigation bounds the
`CLAUDE.md` cost to "one word added to an existing list"; and the M1 §"File surface" table
names only that line. `:161` was never in the declared surface, and the M1 blueprint I wrote
did not catch it either. **This is a spec gap in Requirement 2, surfaced at milestone close
— not a Developer defect.** It does not flip the post-flight verdict. It is routed as Open
Decision 1 below with two costed routes.

## A2. Gate index — **undisturbed. Verified against the registry, not reasoned about.**

Four independent witnesses.

**(1) `story.md` heading census is byte-identical between `main` and the worktree** — line
numbers *and* text:

```
diff <(grep -n '^## ' .cleargate/templates/story.md) \
     <(grep -n '^## ' .worktrees/STORY-054-03/.cleargate/templates/story.md)
→ no output (exit 0)
```

Eight headings, unchanged positions: `1 ## 1. The Spec :110 · 2 ## 2. The Truth :137 ·
3 ## 3. The Implementation Guide :159 · 4 ## 4. Quality Gates :180 · 5 ## Existing Surfaces :195 ·
6 ## Prior work :203 · 7 ## Why not simpler? :212 · 8 ## ClearGate Ambiguity Gate :221`.
The edit is raw line 27, inside the `<instructions>` block, which `templateBodyOf` strips
before any section split. `story.implementation-files-declared` stays `section(3)`;
`story.dod-declared` stays `section(4)`.

**(2) `cleargate-protocol.md` gains exactly one heading, last in document order.** The same
diff returns a single line: `> 921:## Guidance Surface Reach`. It is the 24th `## ` heading
in a file that had 23. Every prior heading keeps its index by construction — an append at
EOF cannot shift anything above it.

**(3) No `section(N)` criterion resolves against the protocol under any index.** Enumerated
the live registry rather than inferring: `.cleargate/knowledge/readiness-gates.md` holds
**18** `section(N)` criteria across **11** gate blocks covering nine types — `proposal`,
`epic`×2, `story`, `cr`, `bug`, `sprint`, `initiative`, `hotfix`, `spike`×2. There is no
`work_item_type: protocol` block, and `TEMPLATE_FOR`
(`gate-section-index-pinning.node.test.ts:111-119`) maps seven types to seven template
filenames — `epic.md`, `story.md`, `CR.md`, `Bug.md`, `initiative.md`, `hotfix.md`,
`spike.md`. `cleargate-protocol.md` is not a gated document and is not reachable from any
criterion. Its `## ` count is not an input to anything.

**(4) The pinning test is green.** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`
→ **pass 14 · fail 0 · skipped 0** (251 ms). S1a still asserts `18 = 16 pinnable + 2
known-unpinnable`; S1c's live↔canonical byte-parity across seven templates + registry passes.
(Skipped 0 matters — per FLASHCARD 2026-08-27 `#test-harness #gate #danger`, an
`existsSync`-guarded suite reports *skipped*, never *failed*, on a wrong root.)

**Protocol Numbering Resolver.** Max numbered section is `## 23. Execution Contract` (`:846`)
in **both** trees, unchanged by this commit. Next free number is **§24** and this story
deliberately did not consume it — correct, since §3.2 specifies unnumbered and EPIC-043
settled the trailing-unnumbered convention. Anyone appending a *numbered* protocol section
next takes §24.

Incidental: `cleargate-cli/test/scripts/_archive/protocol-section-24.integration.node.test.ts`
exists and its name looks alarming. It is archived, integration-tier (excluded at
`run-default-tests.mjs:26`), and documents that the old §24 "Lane Routing" was moved to
`cleargate-enforcement.md` §9 by EPIC-024. It pins nothing that this commit touches, and its
one live-ish assertion (two-tree protocol byte-equality) is satisfied — the commit edits both
trees identically.

## A3. Doctrine accuracy — **no contradiction on either fact.**

**(a) Advisory-gate invisibility.** Confirmed the mechanism at
`.claude/hooks/stamp-and-gate.sh:38-42`:

```sh
if [ "$SR2" -ne 0 ]; then
  WORK_ITEM_ID=$(grep -m1 -oE '(EPIC|STORY|CR|BUG|HOTFIX|PROPOSAL|INITIATIVE|SPRINT)-[0-9]+(-[0-9]+)?' "$FILE" | head -1)
  : "${WORK_ITEM_ID:=<work-item>}"
  grep '^❌' "$GATE_OUT" 2>/dev/null | sed -E "s/^❌ /⚠️ gate failed: ${WORK_ITEM_ID} — /"
fi
```

The re-emit is gated on non-zero exit and greps `^❌`. Advisory exits 0 and prints the
warning glyph, so nothing reaches hook stdout. Both spike blocks are `severity: advisory`
(`readiness-gates.md:254`, `:269`). I read every added `+` line in the commit: neither the
new `### 2.1` nor `## Guidance Surface Reach` asserts, implies, or depends on an author
being told when a gate fails. **No contradiction.** QA's `DOCTRINE_ACCURATE` finding is
independently confirmed.

*Adjacent defect, not this story's* — the `WORK_ITEM_ID` regex at `:40` enumerates seven
type prefixes and omits `SPIKE`. Identical in the canonical hook. Latent today (advisory
never reaches that branch), but the moment any story flips the spike gate to `enforcing`,
the warning renders as `⚠️ gate failed: <work-item> — …` with the literal placeholder
instead of `SPIKE-001`. One prefix, two trees. See Finding 2.

**(b) BUG-055 / push.** Confirmed `getItemId` at `push.ts:480-486`:

```ts
function getItemId(fm: Record<string, unknown>): string {
  for (const key of ['story_id', 'epic_id', 'proposal_id', 'sprint_id', 'cr_id', 'bug_id']) {
```

Six keys, no `spike_id`, returns the sentinel `'unknown'`. Meanwhile `getItemType`
(`:507-516`) *does* carry `spike_id: 'spike'` — 054-02 took M1 Open Decision 2 / R21 on the
type map but not the adjacent id map. That one-key delta is exactly BUG-055.

**No sentence added by this commit implies a spike can be pushed.** The new `### 2.1`
speaks only to branch/worktree/state.json; `## Guidance Surface Reach` speaks only to
surfaces. Grepped the added lines for `push`, `remote`, `track`, `sync` — zero hits.

**One composite-surface caveat, flagged not scored as a contradiction.** By adding Spike at
`CLAUDE.md:140`, the story routes spikes into the "Drafting work items" block whose third
bullet (`:163`) reads *"After `cleargate_push_item` returns a Remote ID, update the
frontmatter AND move the file to `.cleargate/delivery/archive/`."* That bullet names the
**MCP tool**, where the caller supplies `cleargate_id` explicitly — not the CLI `push.ts`
path BUG-055 measures. So the bullet is not literally falsified. But a maintainer who
triages to Spike and reaches for `cleargate push` gets BUG-055's silent wrong write with
exit 0, and no surface warns them. This becomes live imminently: `wiki/epics/EPIC-055.md:16`
records that EPIC-055 is sequenced behind "a mandatory SPIKE charter … blocked on
STORY-054-01 shipping `.cleargate/templates/spike.md`" — which just shipped. **The first
real spike is the next one authored.** See Finding 3.

## A4. Scope

Commit contains exactly the seven paths in the M1 §"File surface" table. Zero
`cleargate-cli/` paths. Live `.claude/skills/sprint-execution/SKILL.md` correctly not
staged — it does not materialize in the worktree at all (gitignored, zero tracked files
per CR-099), so `git add -f` was structurally unavailable. Worktree `git status --short`
is **empty** — no untracked or modified leftovers. All 11 M1 kick-back criteria walked and
clear; QA's walk matches mine.

The ORCHESTRATOR CORRECTION block is correctly applied: two tracked pairs (`story.md`,
`cleargate-protocol.md`) diff silent; `CLAUDE.md` verified at the edited-line level
(root `:140` ≡ canonical `:18`, byte-for-byte); SKILL.md not diffed. The Developer
independently reached the same resolution before the correction reached them, which is the
right instinct.

**Post-flight verdict: PASS.** The commit is correct against everything it declared.

---

# Part B — M1 milestone close

## B1. Does M1 meet "The SPIKE Charter, End to End"? — **Partial.**

The machine chain is complete and I verified every link. The human chain is not.

**What decides it, stated as a test:** a maintainer sitting at a fresh session, given a
request that is genuinely discovery-shaped, can now *classify* it as a Spike (hop 1) and,
if they somehow produce a correctly-named charter, everything downstream works — type
detection, both gate transitions, bucket derivation, wiki ingest. What they cannot do is
get from the classification to the artifact, because the only always-on surface that names
templates omits the one this milestone shipped, and the only pointer that does exist is in
a document loaded during sprint execution — the phase this milestone's own doctrine
excludes spikes from.

M1's four stories were framed as four links in one chain, and 054-03 was explicitly the
reachability link: *"a spike that is not in the always-on `CLAUDE.md` classification list is
unreachable regardless of how good the other three stories are."* That framing is right and
the story half-executed it — `CLAUDE.md` carries two independent lists and the story
amended one.

Not "missed": three of four links are clean, and the fourth is a one-line remedy in a file
already inside the story's declared surface. Not "met": the milestone's own success
condition — reachability — is the one that does not hold.

## B2. What M1 left behind

Seven defects are open in `pending-sync`, all `status: Draft`, all `approved: false`.
BUG-050 predates M1; BUG-052 and BUG-053 were filed during M0/M1 as pre-existing conditions;
BUG-051, 054, 055, 056 were filed by M1's post-flights.

M2 = wave 6 (STORY-054-06, Task Breakdown into three templates + one gate criterion +
index updates + 2 unit tests) and wave 7 (STORY-054-07, three `.claude/agents/*.md` files +
mirrors).

| Defect | Sev | Blocks M2? | Reason |
|---|---|---|---|
| BUG-053 cli commits ungated | P1 | **No — but imposes a mandatory manual step** | 054-06 §4.1 requires 2 unit tests ⇒ a `cleargate-cli` commit ⇒ zero installed hooks. Cross-Cutting Rule 6 already covers it: run `typecheck` + suite by hand, report both numbers. The M2 plan must restate it; 054-07 touches no cli file and is unaffected. |
| BUG-054 gate criteria vacuous on blank template | P1 | **No — but is a required design input** | 054-06 R5 adds `task-breakdown-complete`. BUG-054's measured result (9 of 12 pinnable criteria passed their own unedited template) plus FLASHCARD 2026-08-27 `#gate #dx #danger` (non-vacuous ⇒ non-satisfiable) must shape the predicate choice. Feeding it into the M2 plan is cheaper than re-deriving it. |
| BUG-050 `declared-item` scores bare labels | P1 | **No — but constrains the predicate** | Quarantined by M0 R10. The new criterion must not use `declared-item` on a section that ships a bold label. |
| BUG-055 spike push → `unknown` | P1 | **No for M2. Yes for first real use.** | Orthogonal to Task Breakdown. But it is the only P1 that makes something M1 *shipped* actively wrong, and EPIC-055's mandatory charter is next in the queue. Gate-4 / sprint-report item, not an M2 item. |
| BUG-056 severity unpinned | P2 | No | 054-06 adds a criterion to three existing `enforcing` blocks; block count and severities unchanged. |
| BUG-051 registry drift | P2 | No | Does not intersect M2's surface. Owns the `config.example.yml` stale-bucket line and the `SPIKE` hook-regex gap (Finding 2). |
| BUG-052 surface gate resolves wrong story | P2 | No | The dead `state in ('In Progress',…)` branch always falls back to `max(updated_at)`. M2 waves are single-story and sequential, so the fallback resolves correctly. It degrades parallel waves only; M2 has none. |

**Nothing blocks M2.** Two impose obligations the M2 plan must carry (BUG-053's manual
verification; BUG-054 + BUG-050 as design constraints on the new criterion). One — BUG-055
— blocks the first real use of what M1 shipped and belongs on the Gate-4 list, not M2's.

## B3. The M2 hazard, scoped before dispatch

STORY-054-06 §3.2 already knows the story.md arithmetic. It does **not** specify CR.md or
Bug.md placement, does not specify the new criterion's predicate shape, and does not
mention the corpus. All three are decided below so a Developer does not discover them.

### B3.1 What the M2 plan must pin — exact values

Current gated-template heading positions, read from disk 2026-08-27:

```
story.md : 1 §1 The Spec · 2 §2 The Truth · 3 §3 Implementation Guide · 4 §4 Quality Gates
           5 Existing Surfaces · 6 Prior work · 7 Why not simpler? · 8 Ambiguity Gate
CR.md    : 1 §0.5 Open Questions · 2 §1 Context Override · 3 §2 Blast Radius · 4 Existing Surfaces
           5 Prior work · 6 §3 Execution Sandbox · 7 §4 Verification Protocol · 8 Context Source · 9 Ambiguity Gate
Bug.md   : 1 §1 The Anomaly · 2 §2 Reproduction Protocol · 3 §3 Evidence & Context
           4 §4 Execution Sandbox · 5 §5 Verification Protocol · 6 Prior work · 7 Context Source · 8 Ambiguity Gate
```

**P1 — `story.md`. Exactly one registry value moves.** Inserting `## Task Breakdown` after
`## 3. The Implementation Guide` makes it position 4.
- `story.implementation-files-declared` `section(3)` → **unchanged** (the insert is below it).
- `story.dod-declared` `section(4)` → **must become `section(5)`** (`readiness-gates.md:149`,
  both trees, same commit).
- Positions 5-8 slide to 6-9, but `reuse-audit-recorded`, `simplest-form-justified`,
  `prior-work-recorded` and `ambiguity-gate-resolved` are all text-match or named
  predicates — position-immune. Nothing else moves.

**P2 — `CR.md`. Placement must be pinned at position ≥7, i.e. strictly after
`## 3. Execution Sandbox`.** At that placement `cr.blast-radius-populated` (`section(3)`)
and `cr.sandbox-paths-declared` (`section(6)`) both stay correct and **CR needs zero
registry edits**. Any placement at position ≤6 forces `sandbox-paths-declared` 6→7 *and*
breaks S3a/S3b (below). 054-06 R4 names only story.md — this is a genuine open placement
and the plan must close it.

**P3 — `Bug.md`. Placement must be pinned at position ≥3.** `bug.repro-steps-deterministic`
is `section(2)` = `## 2. Reproduction Protocol`. Any semantic placement (after §3 Evidence,
§4 Sandbox, or §5 Verification) leaves it correct and **Bug needs zero registry edits**.
Only an insert at position ≤2 would move it.

**P4 — the real heading must NOT be titled `## 9. Task Breakdown`.** That literal string is
the synthetic mutation heading S3a and S3b inject into a copy of `CR.md`
(`gate-section-index-pinning.node.test.ts:566`, and S3b's expected message at `:588` quotes
it verbatim). A real CR.md heading with that exact text makes the mutation's output
ambiguous and S3b's assertion meaningless. Use unnumbered `## Task Breakdown`, or any
number other than 9.

**P5 — `task-breakdown-complete` must be a NAMED predicate, not `section(N)`.** R5 says it
"passes on absence". `section(N)` cannot express that: a missing section N is a hard
`section N not found` failure (the shape EPIC-031 already hits on `section 8`). Modelling it
on `existing-surfaces-verified` / `prior-work-recorded` — both named predicates in the story
block at `readiness-gates.md:155` and `:159` — is the only form that satisfies R5. This is
not a style preference; it collapses most of the fixture churn:
- as a named predicate: `enumerateSectionCriteria` never keys on it. **S1a's `18`/`16`
  (`:433`/`:435`) and S6's `16` (`:645`) do not move. No `EXPECTED_HEADINGS` row.**
- as `section(N)` in three blocks: totals go 18→21 and 16→19 at three sites, plus three
  fixture rows, plus three stale test titles — and it still cannot pass on absence.

### B3.2 What goes red — and what does not

| Site | Verdict | Detail |
|---|---|---|
| `gate-section-index-pinning.node.test.ts` **S1b** | **RED if the bump is forgotten** — intended | Message: `story.dod-declared: section(4) in story.md resolves to "## Task Breakdown", expected "## 4. Quality Gates"`. This is the **only automated witness** of the story.md shift — sprint-context records `story.dod-declared` as single-witness. |
| `test/fixtures/gate-section-index/expected-headings.ts` | **ZERO edits** | Index-free, keyed by heading text. `'story.dod-declared': '## 4. Quality Gates'` (`:42`) stays correct once the index is bumped. Per R15 / FLASHCARD `#test-harness #gate` 2026-08-27, **opening it is the hazard, not the fix.** Touch only if P5 is decided the wrong way. |
| **S3a** (`:546`) / **S3b** (`:584`, `:588`) | **GREEN iff P2 and P4 hold** | Verified by construction. With the real heading at CR position ≥7: S3a's mutation still lands `## Prior work` at 6 and S3b's still lands the synthetic at 3 and `## Prior work` at 6 — both hardcoded messages unchanged. Violate P2 and both go red with a message a Developer will misread as a fixture problem. |
| `gate-unit.node.test.ts:748` / `readiness-predicates.node.test.ts:714` (block census, both `11`) | **GREEN** | 054-06 adds a *criterion* to existing blocks, not a block. Both censuses hold. |
| `cleargate-planning/MANIFEST.json` | **Refresh required** | 6 template SHAs + 2 `readiness-gates.md` SHAs. DevOps post-merge, same shape as 054-01/054-02. |
| `readiness-predicates-prior-work-ambiguity.node.test.ts` `:217-220`, `:237`, `:274`, `:372`, `:390` | **GREEN but STALE — must still be edited** | These build a *synthetic* story body in-test, so the template change cannot make them red. The `:217` comment claims the body "match[es] the shape of the updated story.md template" — false after 054-06; `:274`'s title "section(4) still resolves to Quality Gates" becomes wrong doctrine that a future reader will trust. Same class as the three stale titles A5 caught in 054-02. It is also **false comfort**: this looks like a second witness for `dod-declared` and is not, because it never reads the real template. |
| `collision-surface-planning-workflow.red.node.test.ts:148`, `test/fixtures/code-truth-triage/story-missing-why-not-simpler.md:52` | **GREEN, cosmetic** | Both place `## 4. Quality Gates` at position 4 in constructed/fixture bodies. Neither is gate-checked on `section(4)`. Audit, do not chase. |

### B3.3 The corpus effect — measured, and absent from 054-06

Ran the real exported `evaluate()` over every authored `STORY-*.md` in
`.cleargate/delivery/{pending-sync,archive}` (2026-08-27):

```
authored STORY files scanned:                                   231
  already carry a "## … Task Breakdown" heading:                  0
  section(4) >=1 listed-item PASS  (today's dod-declared):    195/231
  section(5) >=1 listed-item PASS  (post-054-06 dod-declared): 121/231

cross-tab:  pass→pass 121 · PASS→FAIL 74 · FAIL→PASS 0 · fail→fail 36
```

**Bumping `story.dod-declared` to `section(5)` flips 74 authored stories from PASS to FAIL
and 0 from FAIL to PASS.** The direction is a false-**RED** wave, not a fail-open — worth
stating because the instinct after BUG-042 is to expect fail-open. Legacy items have no
Task Breakdown, so `section(5)` resolves to `## Existing Surfaces` (121 of them ship bullets
there and stay green *for the wrong reason*) or to nothing at all (74 older items with fewer
headings → `section 5 not found`).

`story.ready-for-execution` is `severity: enforcing`. So every future edit to one of those
74 files trips a hard gate failure naming `dod-declared`, while the real DoD sits untouched
at §4. This is the corpus half of FLASHCARD 2026-08-27 `#gate #readiness-gates #danger`
("positional gates are correct-at-authoring-time, not correct-forever"), and neither
054-06 §1.4 nor §1.5 mentions it.

**The M2 plan must state a disposition before dispatch** — accept-and-document, the way
EPIC-031's `section 8 not found` residue was accepted in M0 R1, or scope a corpus migration.
Either is defensible. Silence is not: a Developer who runs `cleargate gate check` on any
archived story mid-implementation will see a red they cannot explain and will be tempted to
"fix" the index back.

## B4. Gate-4 checklist

| # | Obligation | Why it will not self-surface |
|---|---|---|
| 1 | **Re-sync live `/.claude/skills/sprint-execution/SKILL.md`** from `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (`cleargate init` from repo root, or hand-port `### 2.1` + the §10 pointer bullet). | Verified today on `main`: both files are md5 `8dd6ef8cec45ef30e1ac6b55e60dfa94` — still identical **pre-merge**. They diverge the instant 054-03 merges. Nothing in the default suite catches it: `sprint-execution-mirror.integration.node.test.ts` and `canonical-live-parity.red.integration.node.test.ts` both carry `// @cleargate-tier: integration` and are excluded by `run-default-tests.mjs:26` (`'!test/**/*.integration.node.test.ts'`). The live tree is fully untracked (CR-099), so `git status` will never show it either. **Two independent blind spots on the same file.** |
| 2 | **`npm --prefix cleargate-cli run prebuild`** — regenerate `cleargate-cli/templates/cleargate-planning/**`. | Cross-Cutting Rule 2: payload regen is a Gate-4 step, deferred by every DevOps dispatch this sprint (054-01 `:17`, 054-05 `:102`). M1 touched six canonical scaffold files across four stories — `spike.md`, `readiness-gates.md`, `story.md`, `CLAUDE.md`, `cleargate-protocol.md`, `SKILL.md`. The payload is stale for all six. Gitignored in the cli repo, so nothing flags it. |
| 3 | **Confirm `cleargate-planning/MANIFEST.json` carries 054-03's three tracked SHAs** — `.claude/skills/sprint-execution/SKILL.md`, `.cleargate/knowledge/cleargate-protocol.md`, `.cleargate/templates/story.md`. | All three are present as MANIFEST rows today and all three change in this commit. DevOps owns the refresh post-merge per the M1 file-surface table; this is the verification, not the action. `MANIFEST.json` is currently clean in the outer tree, so a skipped refresh leaves no trace. |
| 4 | **Release note: existing installs must hand-add `- spikes` to `wiki.ingest_buckets`.** | `.cleargate/config.yml` is `INTENTIONALLY_UNTRACKED` in MANIFEST (`build-manifest.ts:333-341`, first-install-only), so `cleargate upgrade` can never add it. New installs get it from the canonical seed; existing repos silently do not. A bare "conclude a spike and it appears in your wiki" is false for every pre-existing install. |
| 5 | **Fix `cleargate-planning/.cleargate/config.example.yml:10`'s `# Valid buckets:` prose list** (omits `spikes` and `topics`). | Correctly declined by 054-04 (R22); owned by BUG-051. One line, no test reads it. |
| 6 | **Read `.cleargate/sprint-runs/SPRINT-39/.doc-refresh-checklist.md`** (from `prep_doc_refresh.mjs`) and apply/punt each `- [ ]` per `.cleargate/knowledge/sprint-closeout-checklist.md`. | Standard close step; listed so it is not skipped under the weight of items 1-5. |
| 7 | **Dispose of seven Draft/unapproved defects** — BUG-050, 051, 052, 053, 054, 055, 056 (three P1 among them: 050, 053, 054, 055 — four). Each needs Gate-1 triage or explicit deferral to a named future sprint. | All are `approved: false`, so none can push. **BUG-055 warrants separate mention:** it is the only one that makes something M1 *shipped* actively wrong, and EPIC-055's mandatory charter (`wiki/epics/EPIC-055.md:16`) is the next spike to be authored. |
| 8 | **Decide Open Decision 1** (the `CLAUDE.md:161` chain break) — resolve before close, either as a pre-merge amendment or as a filed defect carried into the sprint report. | M1's stated goal is reachability; closing the sprint with the chain broken and unrecorded is the one outcome that leaves no trace of a known gap. |

---

## Open decisions for orchestrator

**1. How to close the `CLAUDE.md:161` chain break.** Two routes, both cheap; I am not
deciding this because it is a scope question, not a technical one.

- **Route A — amend `afdf7feb` before merge.** Add `` `spike.md` `` to the template
  enumeration at `CLAUDE.md:161` and `cleargate-planning/CLAUDE.md:39`. Two files, both
  already in the story's declared surface, both already edited by this commit; one list
  item each. It does not add a paragraph, so the M1 kick-back criterion ("more than one
  paragraph added to `CLAUDE.md`") is not tripped, and both edits stay inside the
  `CLEARGATE:START/END` block. Cost: one Developer re-dispatch or an orchestrator amend.
  Formally this exceeds §1.2 Requirement 2, so it wants a `CR:scope-change` note; I will
  append the Mid-Sprint Amendment on your word, not before.
- **Route B — file it.** A P2 defect against EPIC-054, carried to the sprint report and
  scheduled. Honest, but it books a work item for a two-word fix and leaves the milestone
  goal unmet across the close.

**Recommendation: Route A.** M1's entire stated purpose is reachability; shipping the
milestone with the last hop broken, when the fix is one list item in a file the commit
already opens, is the wrong trade. But it is your scope call.

**2. Does BUG-055 get scheduled before EPIC-055's charter is authored, or does the charter
author work around it?** The workaround is real (push via `cleargate_push_item` with an
explicit `cleargate_id` rather than CLI `cleargate push`), but it is undocumented on every
surface. If deferred, the deferral needs a line in the sprint report so the charter author
is not the one who discovers it.

**3. Should M2's plan carry the corpus disposition (B3.3) as a decision, or does the
orchestrator want to settle accept-vs-migrate now?** 74 items is small enough to migrate
and large enough that discovering it mid-implementation costs a bounce.

---

## Findings

1. **`CLAUDE.md:161` omits `spike.md` — the spike chain breaks between triage and template.**
   The only pointer to `.cleargate/templates/spike.md` in the entire scaffold is this
   commit's own `SKILL.md` §10 bullet, and `SKILL.md` is loaded during sprint execution —
   which this commit's `### 2.1` defines as exactly when a spike is not chosen. Measured
   second-order cost: without opening the template, the agent takes `CLAUDE.md:162`'s
   hyphen naming shape and `deriveBucket` (`derive-bucket.ts:63-66`) mis-keys the wiki page
   under the full stem. **Spec gap in §1.2 R2, not a Developer defect.** Open Decision 1.

2. **`stamp-and-gate.sh:40`'s `WORK_ITEM_ID` regex omits `SPIKE`** — both trees. Latent
   while the spike gate is advisory (the `-ne 0` guard at `:39` means advisory never reaches
   that branch at all), but it renders `⚠️ gate failed: <work-item> — …` with the literal
   placeholder the moment the gate is flipped to enforcing. One prefix. Route to BUG-051
   (registry drift) or as a second face on BUG-056.

3. **BUG-055 is imminent, not theoretical.** `wiki/epics/EPIC-055.md:16` sequences EPIC-055
   behind a mandatory SPIKE charter that was blocked only on `spike.md` shipping — which it
   now has. The next spike authored will hit the `cleargate_id: "unknown"` silent wrong
   write, and every subsequent spike will overwrite it on the same server row. Elevate to
   the Gate-4 list; see checklist item 7 and Open Decision 2.

4. **`readiness-predicates-prior-work-ambiguity.node.test.ts:217-220/274/390` will go stale
   green under STORY-054-06** and look like a second witness for `story.dod-declared` while
   never reading the real template. Listed in B3.2 so the M2 plan books the edit rather than
   trusting the coverage.

## Flashcard candidates

Not written — this dispatch's write allowance is the report, `plans/M1.md` appends, and
defect files. Recording for you to append:

- `2026-08-27 · #doctrine #dogfood #danger · CLAUDE.md carries TWO independent type lists — the triage classification parenthetical AND the drafting-template enumeration ~20 lines below. Adding a type to one leaves it classifiable but un-draftable. Amend both or the type is unreachable. [SPRINT-39 STORY-054-03]`
- `2026-08-27 · #gate #readiness-gates #danger · Inserting a heading and CORRECTLY bumping section(N) is right for the template and wrong for the corpus: measured 74 of 231 authored stories flip PASS→FAIL (0 fail-open) when story.dod-declared moves 4→5. Enforcing severity ⇒ a latent red on every future edit to those 74. Decide accept-vs-migrate at plan time. [SPRINT-39 M1 close]`
- `2026-08-27 · #test-harness #gate · A test that builds a SYNTHETIC copy of a template body never goes red when the real template moves — it silently asserts a stale shape and reads as a second witness it is not. Grep for synthetic template bodies whenever a template heading lands. [SPRINT-39 M1 close]`

## Script Incidents

None. No `run_script.sh` invocation was required. Every finding is from Read/Grep/`git show`/
`git diff`, one targeted `tsx --test` run of the existing pinning test, and two read-only
`tsx` probes that imported the real exported `evaluate()` and wrote nothing (temp file
created and removed inside `cleargate-cli/`, confirmed absent afterward). Nothing was
edited, staged, branched, or committed.

## Version check

Not applicable — this dispatch declares no dependency and adds no package to any
`package.json`. No `npm view` call needed, none skipped.

---

POSTFLIGHT: pass
CHAIN_REACHABLE: BROKEN at hop 2 — `CLAUDE.md:161` (+ canonical `:39`) enumerates six drafting templates and omits `spike.md`; the only `spike.md` pointer in the scaffold is this commit's own SKILL.md §10 bullet, on a surface loaded during sprint execution, which its own §2.1 excludes spikes from. Hops 1, 3, 4, 5, 6 all verified clean.
GATE_INDEX_SAFE: yes — four witnesses. (1) `story.md` heading census byte-identical main↔worktree, line numbers and text (`diff` of `grep -n '^## '` → empty); edit is raw line 27 inside `<instructions>`, stripped by `templateBodyOf`. (2) `cleargate-protocol.md` gains exactly one heading at `:921`, the 24th and last in document order — nothing above it can shift. (3) The registry holds 18 `section(N)` criteria across 11 blocks / 9 types; `TEMPLATE_FOR` maps 7 types → 7 templates; there is no `protocol` type and no criterion resolves against `cleargate-protocol.md` under any index. (4) Pinning test: pass 14 · fail 0 · skipped 0; S1a still `18 = 16 pinnable + 2`. Max numbered protocol section unchanged at §23 both trees; §24 remains free.
DOCTRINE_ACCURATE: yes on both. (a) Advisory-invisibility: `stamp-and-gate.sh:39` gates the ⚠️ re-emit on non-zero exit and greps `^❌`; advisory exits 0 with a warning glyph, and both spike blocks are `severity: advisory` (`readiness-gates.md:254`, `:269`). No added line asserts or depends on author notification. (b) BUG-055: `getItemId` (`push.ts:480-486`) carries six keys, no `spike_id`, returns `'unknown'`; no added sentence implies a spike can be pushed — grep of added lines for push/remote/track/sync returns zero. One flagged caveat, not a contradiction: `CLAUDE.md:163`'s push-and-archive bullet now applies to Spike by inclusion, but it names the MCP tool (caller-supplied id), not the CLI path BUG-055 measures.
M1_GOAL: partial — machine chain complete and verified (template, type union + FM/prefix maps + transitions, both gate blocks, bucket, config allowlist); human chain broken at the milestone's own stated success condition, reachability. Three of four links clean; the fourth is a one-list-item remedy in a file already inside the story's declared surface.
M1_RESIDUE: **Nothing blocks M2.** Obligations rather than blockers: BUG-053 (P1) forces manual `typecheck` + suite on 054-06's cli commit (Cross-Cutting Rule 6 — restate in the M2 plan); BUG-054 (P1) + BUG-050 (P1) are required design inputs to `task-breakdown-complete`'s predicate choice. BUG-051/052/056 are inert against M2's surface — 052's `max(updated_at)` fallback resolves correctly for M2's single-story sequential waves. BUG-055 (P1) does not block M2 but blocks first real use of what M1 shipped: EPIC-055's mandatory charter is next in the queue (`wiki/epics/EPIC-055.md:16`) — Gate-4 item.
M2_HAZARD: **Must pin, five values.** (P1) `story.md` insert after §3 ⇒ position 4; `implementation-files-declared` `section(3)` unchanged; **`story.dod-declared` `section(4)` → `section(5)`** at `readiness-gates.md:149`, both trees — the only registry value that must move. (P2) `CR.md` placement **≥ position 7**, strictly after `## 3. Execution Sandbox`, ⇒ zero CR registry edits; ≤6 forces `sandbox-paths-declared` 6→7 **and** reds S3a/S3b. (P3) `Bug.md` placement **≥ position 3** ⇒ zero Bug registry edits. (P4) heading must **not** be titled `## 9. Task Breakdown` — that literal is S3a/S3b's synthetic mutation heading (`:566`, quoted verbatim at `:588`). (P5) `task-breakdown-complete` must be a **named predicate**, not `section(N)` — `section(N)` cannot "pass on absence" (missing ⇒ hard `section N not found`); as a named predicate S1a's `18`/`16` (`:433`/`:435`) and S6's `16` (`:645`) do not move and no fixture row is needed. **Red:** S1b only, naming `story.dod-declared: section(4) in story.md resolves to "## Task Breakdown", expected "## 4. Quality Gates"` if the bump is skipped — and it is the sole automated witness. **Zero edits:** `expected-headings.ts` (index-free, heading-text-keyed; opening it is the hazard, R15). **Green iff P2+P4:** S3a `:546`, S3b `:584`/`:588`. **Green but stale, still must be edited:** `readiness-predicates-prior-work-ambiguity.node.test.ts:217-220/237/274/372/390` — synthetic body, never goes red, reads as a second witness it is not. **Refresh:** `MANIFEST.json` (6 template + 2 registry SHAs). **Corpus, measured:** 231 authored stories, 0 carry the heading; the 4→5 bump flips **74 PASS→FAIL, 0 FAIL→PASS** against an `enforcing` gate — a latent false-red on every future edit to those 74. The M2 plan must state accept-vs-migrate before dispatch.
GATE_4_CHECKLIST: 1. Re-sync live `/.claude/skills/sprint-execution/SKILL.md` from canonical — identical (md5 `8dd6ef8c…`) pre-merge, divergent post-merge, and caught by nothing: both mirror tests are `@cleargate-tier: integration`, excluded at `run-default-tests.mjs:26`, and the live tree is untracked (CR-099). 2. `npm --prefix cleargate-cli run prebuild` — payload stale for all six canonical files M1 touched. 3. Confirm `cleargate-planning/MANIFEST.json` carries 054-03's three tracked SHAs (SKILL.md, cleargate-protocol.md, story.md). 4. Release note — existing installs must hand-add `- spikes` to `wiki.ingest_buckets` (`config.yml` is `INTENTIONALLY_UNTRACKED`, `build-manifest.ts:333-341`, so `upgrade` cannot). 5. Fix `config.example.yml:10`'s stale `# Valid buckets:` list (BUG-051). 6. Apply/punt `.doc-refresh-checklist.md`. 7. Dispose of seven Draft/unapproved defects (BUG-050…056; four P1) — BUG-055 flagged as the only one that makes shipped behaviour wrong. 8. Resolve Open Decision 1 (the `CLAUDE.md:161` break) before close.
SCOPE: clean — exactly the seven declared paths, zero `cleargate-cli/` paths, live SKILL.md unstaged (structurally impossible from the worktree), worktree `git status --short` empty, all 11 M1 kick-back criteria clear.
FINDINGS: 1. `CLAUDE.md:161` (+ canonical `:39`) omits `spike.md` — chain break; spec gap in §1.2 R2, not a Developer defect; Open Decision 1. 2. `stamp-and-gate.sh:40` `WORK_ITEM_ID` regex omits `SPIKE`, both trees — latent while advisory, wrong the moment the gate enforces. 3. BUG-055 is imminent, not theoretical — EPIC-055's charter is the next spike authored. 4. `readiness-predicates-prior-work-ambiguity.node.test.ts` will go stale-green under 054-06 and impersonate a second witness for `dod-declared`.
