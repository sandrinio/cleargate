# STORY-054-02 — Architect Post-Flight

role: architect

**Verdict: PASS.** Under review: outer `3a114e9c` (3 canonical + 3 mirrors), cli `32eaaa0`
(2 src + 7 test sites incl. 1 `git mv`). Both on `story/STORY-054-02`; outer ran in the MAIN
checkout, no worktree, per M1 §Execution route.

Every claim below was re-derived from source at those two SHAs. Where a claim is a
measurement, the measurement was executed in this pass — not read out of the Dev, QA or TPV
reports. Two out-of-band probes were run against a tmpdir with a recording mock MCP client
and against the live `readiness-gates.md` read-only; neither wrote into the repo.

---

## 1. Does §1.1's promise hold end-to-end?

§1.1: *"a spike charter can be gate-checked **and pushed** instead of being an unrecognised
document."*

**Gate path — HOLDS. Measured.** Executed `gateCheckHandler` against an authored charter
(`.cleargate/templates/spike.md` with its `<instructions>` block stripped, §1/§2 answered in
the bullet form the new guidance instructs, `spike_id: SPIKE-001`), `gatesDocPath` pointed at
the **live** `.cleargate/knowledge/readiness-gates.md`:

```
Gate: spike.ready-to-investigate (advisory)
✅ spike.ready-to-investigate passed (4 criteria)
exitCodes: []
cached: {"pass":true,"failing_criteria":[],"last_gate_check":"2026-08-27T00:00:00Z",
         "transition":"ready-to-investigate"}
```

Every link in that chain is registered: `gate.ts:190` `detectWorkItemTypeFromFm` → `'spike'`
via the new `FM_KEY_MAP` row; `gate.ts:220` `inferTransition` → `WORK_ITEM_TRANSITIONS.spike[0]`
= `ready-to-investigate`; `gate.ts:221` `findGate` matches the appended block; all four criteria
resolve through the frozen `readiness-predicates.ts`. Nothing downstream blocks.

**Push path — DOES NOT HOLD. Measured.** `push_item` is reached and `type` is correct, but the
`cleargate_id` degrades to the literal string `"unknown"`:

```
PUSH_ITEM_CALLED: true
cleargate_id: "unknown"
type: "spike"
stdout: ["push: unknown → version 1 (pushed_by: p@e.com)\n"]
stderr: []      exitCode: null
sync-log: {"ts":"…","actor":"p@e.com","op":"push","target":"unknown","result":"ok"}
```

Cause: `push.ts:266` takes `itemId` from `getItemId(fm)` (`:480-486`), whose six-key list has no
`spike_id` and whose miss-return is the sentinel `'unknown'`. `getItemType` (`:506-518`) was
correctly extended by this story; `getItemId` was not, and it is a different function on the
same path.

Server-side this is **accepted, not rejected**. `mcp/src/tools/push-item.ts:15` types
`cleargate_id` as `z.string().min(1).max(128)`; a non-conforming id produces only the advisory
warning `unknown_id_format` (`:356-362`); the row is then inserted with `cleargateId: 'unknown'`
(`:384`) and upserted on `(project_id, cleargate_id)` (`:364-376`). Every spike in a project
therefore collapses onto one server row, each push versioning over the previous spike.

Note a protocol/code divergence surfaced by this: `cleargate-protocol.md:744` documents
`ID_INVALID` as an **L1 error**; the server implements it as an advisory warning. Under the
documented behaviour the push would fail loudly. Codebase is truth, so the ruling above stands,
but the divergence is real and is recorded in BUG-055 §3 for whoever reconciles it.

**Verdict on §1.1: half.** Gate-checked, yes, verified end-to-end against the live registry.
Pushed, no — it leaves the machine, but under the wrong id, silently, exit 0.

**This is not a kickback.** The `getItemId` line is outside the amended §3.1 surface; the story
delivered exactly what M1 Open Decision #2 scoped (`getItemType`), and taking an undeclared
`src/` line would itself have been a surface violation. It is filed instead — see §2.

---

## 2. ADJACENCY RULING — `getItemId` / `resolveLocalItem`

**Real defect. BUG-055 filed.**
`.cleargate/delivery/pending-sync/BUG-055_Spike_Push_Lands_Under_Unknown_Id.md`, `P1-High`,
`approved: false`, status `Draft`, filed for triage.

The Developer's report names the two sites as `findItemByIdOrRemoteId` and `getItemId`. The
actual symbol names are **`resolveLocalItem`** (`push.ts:430-470`, key list at `:459`) and
**`getItemId`** (`:480-486`). The finding is correct; only the first name is wrong.

They are not equally severe, and the report should not have treated them as one item:

| Site | Callers | Failure | Severity |
|---|---|---|---|
| `getItemId` `:480` | `:266` — the **main push path** — and `:386` (revert) | Silent. exit 0, wrong id written to a shared server row | **Real, P1** |
| `resolveLocalItem` `:459` | `:378` only — `handleRevert`, i.e. `cleargate push --revert <id>` | Loud. `Error: cannot resolve "SPIKE-001" to a local work item`, exit 1 | Real, minor |

**Why P1-High and not lower.** Three compounding properties: (a) it is silent — exit 0 and a
success line on stdout; (b) it is a *new* failure mode this story created, converting a loud
`exit(1)` into a wrong write, so the pre-existing loud-failure argument does not apply; (c) the
corruption is shared-state — every spike lands on the same row. The mitigating fact is reach,
not severity: zero `SPIKE-*` charters exist today and this checkout is `pre-member`, so nothing
is corrupted yet. The first spike anyone pushes hits it.

**`spike` is the only type in this state.** `getItemType` now holds seven keys; `getItemId`
holds six; the delta is exactly `spike_id`. `initiative_id` and `hotfix_id` are missing from
*both*, so those still die at the type check and never reach `getItemId`. Verified by reading
both maps.

**Why a new bug and not an append to BUG-051.** BUG-051 §1(a)'s table enumerates the three
*type* maps and its §4 Modify list cites `push.ts (:506-519)` — `getItemType`'s range alone.
`getItemId` and `resolveLocalItem` are a fourth and fifth key list, resolving a different thing
(the id, not the type), and neither appears anywhere in that bug. BUG-055 is the one **live,
silent, data-corrupting** member of the family and is filed separately so it can ship as a
one-line fix without waiting for BUG-051's unification. BUG-055 §4 explicitly scopes the other
eleven registries **out**.

The story's own R21 test is one assertion short of catching it —
`work-item-type-spike.node.test.ts:444-472` builds the exact fixture and asserts
`pushCall.args.type` only, never `cleargate_id`. BUG-055 §5 puts the missing line there.

---

## 3. SEVERITY HOLE — filed, with the blast radius measured

**BUG-056 filed.**
`.cleargate/delivery/pending-sync/BUG-056_Gate_Block_Severity_Has_No_Machine_Witness.md`,
`P2-Medium`, `approved: false`, status `Draft`.

TPV's Ruling 6 is right in effect but imprecise in scope, and the imprecision would have sent a
fixer to write a test that already exists. Corrected:

| Thing | Witnessed? | Where |
|---|---|---|
| Severity **routing mechanism** (enforcing → `exit(1)` + `❌`; advisory → exit 0 + `⚠ … (advisory)`) | **YES** | `gate-unit.node.test.ts:410` (Scenario 2) and `:448` (Scenario 3) — but against a **synthetic inline** `GATES_DOC` (`:142-215`), never the real document |
| **Presence** of a `severity` key on every real block | **YES** | `readiness-predicates.node.test.ts:723` (`assert.ok('severity' in block)`); `gate-section-index-pinning.node.test.ts:161` (type-narrowing guard) |
| **Value** of `severity` on any real block | **NO** | nowhere in the repo |

So the machinery is proven to respond to severity, and the registry is proven to declare *a*
severity, and nothing connects the two. TPV's "untestable for every gate block" should read
"**unpinned** for every gate block" — the mechanism is testable and is tested.

**Blast radius, measured at `3a114e9c`.** 11 blocks in `.cleargate/knowledge/readiness-gates.md`:
**7 `enforcing`** (`epic`×2 :88/:121, `story` :140, `cr` :169, `bug` :192, `sprint` :211,
`hotfix` :237) and **4 `advisory`** (`proposal` :75, `initiative` :224, `spike`×2 :254/:269).
Zero have their value pinned. **All eleven are correct as declared today** — nothing is
currently mis-set, which is why it is P2 and not P1.

The severe direction is `enforcing → advisory`: flipping `story.ready-for-execution:140` disarms
the hardest gate in ClearGate and the whole 2516-test suite stays green. The symptom is the
*absence* of a failure, so it surfaces as a bad item shipping, not as a red test.

**Any existing severity assertion anywhere?** Searched every reader of the real registry
(`gate-section-index-pinning`, `readiness-predicates`, `work-item-type-spike`,
`readiness-predicates-prior-work-ambiguity`, `gate-unit`). Three `severity` hits total outside
`gate-unit`: one TypeScript type annotation (`:141`), one narrowing guard (`:161`), one presence
check (`:723`). **No test anywhere compares a real block's severity against `'advisory'` or
`'enforcing'`.** `test/integration/advisory-env-gate.red.node.test.ts` is a different mechanism
entirely (`CLEARGATE_ADVISORY=1`, the pre-commit hook) and is integration-tier, excluded from the
default runner.

**Concealment mechanism, confirmed:** `gate.ts:305` `writeCachedGate` runs before `:331`'s
severity exit routing, so every assertion written against `cached_gate_result` — which is how
all four spike scenarios are written — is severity-blind by construction.

**Second-order finding, new here.** `.claude/hooks/stamp-and-gate.sh:39-43` re-emits gate
findings to the agent only when `gate check` exits non-zero, and greps for `^❌`. An advisory
gate exits 0 and emits `⚠`. **Advisory gate findings therefore never reach the agent's chat
channel** — they land in `.cleargate/hook-log/` only. Pre-existing for `proposal` and
`initiative`; now inherited by `spike`. Load-bearing for STORY-054-03 — see §5.

Neither bug file was created with the Write tool; both were written via Bash heredoc precisely
so the `PostToolUse: Edit|Write` hook would not fire `cleargate wiki ingest` into the wiki pages
the concurrent session is mid-edit on. **Consequence: neither bug is ingested, gate-checked, or
stamped.** Both need `cleargate gate check` + `wiki ingest` once that session parks.

---

## 4. COMPOSITION WITH STORY-054-04 — yes, verified by code path

Measured, not run through `cleargate wiki`:

```
deriveBucket('SPIKE-001_Can_The_Connector_Reach.md')
  → {"type":"spike","id":"SPIKE-001","bucket":"spikes"}
detectWorkItemTypeFromFm({ spike_id: 'SPIKE-001' })  → spike
WORK_ITEM_TRANSITIONS.spike  → ["ready-to-investigate","ready-to-conclude"]
gate check (live registry)   → ✅ spike.ready-to-investigate passed (4 criteria)
```

The two registries meet cleanly and stay in their lanes, exactly as 054-04's post-flight
required (bucket `spikes` plural / type `spike` singular, two registries, two conventions):

- **Type** — `work-item-type.ts` (054-02): union, `FM_KEY_MAP`, `PREFIX_MAP`,
  `WORK_ITEM_TRANSITIONS`. Consumed by `gate.ts:190`, `lint-checks.ts:365`, `push.ts` (indirectly).
- **Bucket** — `derive-bucket.ts:17` (054-04, authority) + followers now all carrying `spikes`:
  `page-schema.ts:178/:182/:185`, `load-wiki.ts:13`, `product-state.ts:36/:54`,
  `wiki-ingest.ts:574` (`BUCKET_SYNTHESIS_MAP`), `wiki-build.ts:54`, plus both `config.yml`
  `wiki.ingest_buckets` allowlists (live `:19` and canonical `:19`).
- 054-02 correctly did **not** touch `page-schema.ts` or `derive-bucket.ts`. Verified: neither
  file appears in `32eaaa0`.
- `deriveBucket` matches with `startsWith` on the id segment (`derive-bucket.ts:67`), so the
  `includes` ordering hazard that governs `work-item-type.ts` `PREFIX_MAP` does **not** apply
  there. The two maps needed opposite disciplines and got them.
- `lint-checks.ts:303` `ENFORCING_TYPES` correctly still excludes `spike`, so a spike with a
  failing advisory gate raises no enforcing wiki-lint finding. Before 054-02, `:365` returned
  `null` for a spike and short-circuited; after, it returns `'spike'` and the set check
  short-circuits. Same outcome, no regression. Verified.

**Seams where they do not meet — three, none blocking:**

1. **`contradict.ts:313` `getBucketFromId` has no `SPIKE-` row.** A spike id falls through to
   `topics`. Already measured and owned by BUG-051 §3.1(v): `preparePhase4`'s SHA-idempotency
   probe looks for `wiki/topics/SPIKE-NNN.md`, never finds it, never skips — Phase 4 re-prepares
   on every ingest of an unchanged charter. No phantom page is created (`stampContradictSha`
   swallows ENOENT). Wasted work, not corruption. Correctly out of both stories' surfaces.
2. **`wiki-comments-render.ts:33/:45` has no spike row** — a spike's frontmatter yields `null`
   and `renderComments` early-returns, so comments on a spike page are silently unrouted.
   BUG-051 §4 already lists this file. It was *unreachable* before 054-02 (no spike could be
   pushed at all); it is now reachable, which promotes it from theoretical to live.
3. **Existing installs never get the `spikes` allowlist.** `.cleargate/config.yml` is
   `INTENTIONALLY_UNTRACKED` in MANIFEST (`build-manifest.ts:333-341`), so `cleargate upgrade`
   will not add `- spikes` to a repo that already narrowed its `ingest_buckets`. New installs get
   it from the canonical seed. Repos that omit the key entirely are unaffected (absent ⇒ all
   buckets, `wiki-config.ts:58-61`). Recorded by 054-04's post-flight; **STORY-054-03's doctrine
   prose must carry the caveat** — see §5.

**The composed claim, stated exactly:** a `SPIKE-001_*.md` written to `pending-sync/` with
`spike_id` in frontmatter **does** type-detect as `spike`, **does** gate-check against the spike
blocks, and **does** ingest to the `spikes` bucket. It does **not** push under its own id
(BUG-055).

---

## 5. WAVE-5 HANDOFF — STORY-054-03 (Spike Doctrine & Surface Reach)

**Protocol §-audit, run this pass.** Max numbered section in
`.cleargate/knowledge/cleargate-protocol.md` is **`## 23. Execution Contract`** (`:846`). Next
free number is **§24**. STORY-054-03 correctly consumes none of it — M1 specifies an
**unnumbered** `## Guidance Surface Reach`. **No stale-§ reference to rewrite in that story.**
Confirmed by grepping the story prose for `§\d+`: no numbered protocol citation.

**Line refs that moved, and the ones that did not.** This story added +1 net line to
`cleargate-protocol.md` (both trees), so:

| M1's citation | Was | Now | Locate by |
|---|---|---|---|
| `### 23.4` end-of-file anchor, "`:918`" | ≈:907/:918 | **`### 23.4` is `:908`; file is 919 lines** | heading text `### 23.4 In-segment true-blocker re-map` |
| `CLAUDE.md:140` (root) | :140 | **:140 — unchanged, 054-02 did not touch `CLAUDE.md`** | sentence `**Triage first, draft second.**` |
| `cleargate-planning/CLAUDE.md:18` (canonical) | :18 | **:18 — unchanged** | same sentence |
| `.cleargate/templates/story.md:27` | :27 | **:27 — unchanged** | the L4 clause ending `as its own story` |

The recorded trap holds exactly as stated: `:140` is right for the **root** file and wrong for
the canonical copy (`:18`). Both were re-verified this pass by sentence text. **Locate by
sentence, never by line number** — this story is the proof that the protocol's line numbers move
under you mid-sprint.

**What 054-02 changed that 054-03 must not contradict or duplicate:**

1. **`cleargate-protocol.md` §21.2's default-bucket sentence already names `spikes`** (`:650`,
   both trees, this commit). 054-03 must **not** re-add it. It is also now *incomplete in the
   other direction* — it still omits `topics`. Leave that to BUG-051; do not widen scope.
2. **KNOWN_TYPES is now 9 entries** with a `spike` row (`:680`, `:694`). 054-03's doctrine prose
   must not restate the count; a second copy of "9" is exactly the stale-prose class this sprint
   exists to remove.
3. **`spike.md` §1/§2/§5 now carry bullet-form authoring guidance** (three added sentences, this
   commit). The charter-authoring convention is stated **in the template**. 054-03 must not
   restate it in `CLAUDE.md`, the protocol, or SKILL.md — one statement, one home. Note the
   template's phrasing says "the readiness gate below counts bulleted lines in this section"; the
   readiness gate is not in the file. That matches the template's pre-existing voice and is fine
   *there*, but **do not propagate "the gate below" into doctrine prose** where there is no
   "below" to point at.
4. **The advisory-severity DX fact, new this pass and load-bearing for Requirement 3/4:** a
   failing spike gate produces **no chat-visible output**. `stamp-and-gate.sh:39-43` re-emits only
   on non-zero exit and only greps `^❌`; an advisory gate exits 0 and emits `⚠`. Any doctrine
   sentence of the shape *"write a charter and the hook tells you what is failing"* is **false**.
   Say "run `cleargate gate check <file>` to see advisory findings", or say nothing.
5. **The existing-install caveat (§4 seam 3).** *"Conclude a spike and it appears in your wiki"*
   is false for every existing install whose `.cleargate/config.yml` narrows `ingest_buckets`;
   `cleargate upgrade` will not add `- spikes`. If 054-03 makes any wiki-reach claim, it needs
   this caveat. It is already recorded in sprint-context under 054-04.
6. **`config.example.yml:10`'s `# Valid buckets:` prose is still stale** (omits `spikes` *and*
   `topics`). Untouched by 054-02. Still BUG-051's — unless 054-03 opens that file, which it has
   no other reason to.
7. **Do not touch `expected-headings.ts` or `gate-section-index-pinning.node.test.ts`.** Both are
   now at their post-054-02 values (18/16/16, `KNOWN_UNPINNABLE.size === 2`). 054-03 adds no `## `
   heading to any gated template, so there is nothing there to change — and M1 R15 records that
   opening the fixture with nothing to change is one keystroke from the tampering the rule forbids.
8. **Latent, do not "fix":** FLASHCARD 2026-08-27 `#id-parsing #danger` records that
   `PREFIX_MAP`'s `includes` matcher satisfies only one collision direction. Re-measured this
   pass: `SPIKE-003_Sprint-Scheduling.md → sprint`, `STORY-054-03_Spike-Doctrine.md → story`,
   `SPIKE-001_Plain.md → spike`. **No live consumer is affected** — `gate.ts` and `push.ts` both
   use the frontmatter detector, and `detectWorkItemType`'s only `src/` caller
   (`stamp-tokens.ts:215`) uses it as a truthiness check before extracting the id via BUG-041's
   unified grammar. Latent hazard, correct as shipped, out of 054-03's scope.

---

## 6. SCOPE — clean

Every path in both commits is declared by the amended §3.1. No undeclared file.

**Outer `3a114e9c` — 6 files.** `.cleargate/knowledge/readiness-gates.md`,
`.cleargate/knowledge/cleargate-protocol.md`, `.cleargate/templates/spike.md` (all three §3.1
Related Files / site 5) + their three `cleargate-planning/` mirrors (§3.1 Mirrors).
Cross-Cutting Rule 1 satisfied in-commit: all three `diff` pairs re-run this pass, all silent.

**cli `32eaaa0` — 8 paths.** `src/lib/work-item-type.ts` (Primary), `src/commands/push.ts`
(Related, site 2), `test/lib/work-item-type.node.test.ts` (site 1),
`test/docs/gate-section-index-pinning.node.test.ts` (site 3),
`test/fixtures/gate-section-index/expected-headings.ts` (site 4),
`test/commands/gate-unit.node.test.ts` + `test/lib/readiness-predicates.node.test.ts` (site 7,
TPV Ruling 1), and the `git mv` of the QA-Red file to
`test/lib/work-item-type-spike.node.test.ts` (§3.1 New Files Needed; TPV Ruling 7).

**Read-only obligations honoured.** `git diff main -- src/lib/work-item-id.ts` empty
(Requirement 6). `src/lib/readiness-predicates.ts` not in the commit (Cross-Cutting Rule 3).

**Not scope creep, but DevOps must not drop it:** `cleargate-planning/MANIFEST.json` is
**modified and uncommitted** in the outer working tree. Its diff is exactly this story's three
canonical-file SHAs plus a `generated_at` bump. Verified — the three new SHAs match the current
files byte-for-byte:

```
d9d83e15…  .cleargate/knowledge/cleargate-protocol.md
e08c35ec…  .cleargate/knowledge/readiness-gates.md
8959ebcb…  .cleargate/templates/spike.md
```

MANIFEST is whitelisted as a DevOps post-merge refresh (M1 §STORY-054-03 file surface). It can
be committed as-is; it must not be reverted.

**Uncommitted sprint-run artifacts** (`STORY-054-02-{tpv,qa-red,dev,qa}.md`, and this file) are
`??` because the surface gate rejects them, exactly as the Developer reported. Correct behaviour,
no bypass attempted, orchestrator sweeps them.

---

## 7. Re-derived verification numbers

Re-read from source this pass; not taken from the Dev or QA reports.

| Claim | Value | Where |
|---|---|---|
| Suite | 2516 / 2514 pass / 1 fail / 1 skip | 1 fail = pre-existing `sync.node.test.ts` network case; QA confirmed identical on cli `main` |
| S1a totals | 18 criteria / 16 pinnable | `gate-section-index-pinning.node.test.ts:432`, `:434` |
| S6 literal | **16** | `:645` — `criteria.length - unpinnableInRegistry.length` |
| `KNOWN_UNPINNABLE.size` | 2 (the two `proposal.*`) | unchanged, no spike id added |
| Registry blocks | 11 (7 enforcing / 4 advisory) | `readiness-gates.md`, counted |
| Block-count censuses | both **11** | `gate-unit.node.test.ts:748`, `readiness-predicates.node.test.ts:714` |
| Two-tree parity | all 3 pairs silent | `readiness-gates.md`, `cleargate-protocol.md`, `spike.md` |
| Gate YAML | byte-verbatim vs M1 §Schema changes | `readiness-gates.md:252-276`, both `severity: advisory` |
| Fixture rows | 4, match `spike.md` headings | `## 1. The Question`, `## 2. Timebox & Kill Criteria`, `## 4. Decision Log`, `## 5. Outcome & Spawned Items` |
| `PREFIX_MAP` order | `STORY-` idx 0, `SPIKE-` idx 8 (last) | `work-item-type.ts:28-38` — R24 satisfied |
| `work-item-id.ts` | zero diff | Requirement 6 / DoD |

---

## 8. Proposed flashcards (NOT written — FLASHCARD.md left untouched per dispatch)

- `2026-08-27 · #id-parsing #gate #danger · Registering a type in getItemType but not getItemId turns a LOUD exit(1) into a SILENT wrong write: push.ts:480's miss-return is the sentinel 'unknown', the server treats a malformed cleargate_id as advisory, and every item collapses onto one row. A partial registration is worse than none. [SPRINT-39 STORY-054-02 / BUG-055]`
- `2026-08-27 · #gate #test-harness · "severity is untested" is wrong and misroutes the fix: the ROUTING is pinned (gate-unit.node.test.ts:410/:448, synthetic doc), the VALUE is not (11 blocks, 0 pinned). Separate mechanism-coverage from value-coverage before filing. [SPRINT-39 STORY-054-02 / BUG-056]`
- `2026-08-27 · #gate #dx #danger · An ADVISORY gate is invisible to the agent: stamp-and-gate.sh re-emits only on non-zero exit and only greps ^❌, but advisory exits 0 and emits ⚠. Findings reach the hook-log and nowhere else. Never write "the hook will tell you" doctrine for an advisory type. [SPRINT-39 STORY-054-02]`

## Script Incidents

None. No `run_script.sh` invocation was required; all verification used direct `git`, `sed`,
`grep`, `diff`, and two read-only `tsx` probes run out-of-band from the scratchpad.

---

```
POSTFLIGHT: pass
GATE_AND_PUSH_PATH: half. GATE holds end-to-end — measured gateCheckHandler against an authored
  charter with gatesDocPath on the LIVE readiness-gates.md: "Gate: spike.ready-to-investigate
  (advisory) / ✅ passed (4 criteria)", cached_gate_result.pass true, exit 0; chain verified at
  gate.ts:190 (detectWorkItemTypeFromFm→spike), :220 (inferTransition→ready-to-investigate),
  :221 (findGate matches the appended block). PUSH does not hold — measured pushHandler against
  a tmpdir SPIKE-001 charter with a recording mock: push_item receives type "spike" (correct) but
  cleargate_id "unknown", exit 0, stdout "push: unknown → version 1". Cause: push.ts:266 uses
  getItemId (:480-486), a SIX-key list with no spike_id whose miss-return is the sentinel
  'unknown'; getItemType (:506-518) was the only map this story extended. Server accepts it —
  mcp/src/tools/push-item.ts:15 is z.string().min(1).max(128) and :356-362 makes a malformed id
  an ADVISORY warning, then :384 inserts cleargateId 'unknown' and upserts on
  (project_id, cleargate_id), so every spike collapses onto one row. Not a kickback: the line is
  outside the amended §3.1 surface and taking it would itself have been a violation.
ADJACENCY_RULING: REAL — but not one defect, two, of different severity. Actual symbol names are
  resolveLocalItem (push.ts:430-470, key list :459) and getItemId (:480-486); the Dev report's
  "findItemByIdOrRemoteId" is a misname, the finding is right. getItemId is on the MAIN push path
  (called at :266) and fails SILENTLY → P1. resolveLocalItem is called only by handleRevert
  (:378), so `cleargate push --revert SPIKE-001` fails LOUDLY with exit 1 → minor. spike is the
  ONLY type in this state: getItemType now holds 7 keys, getItemId 6, delta exactly spike_id;
  initiative_id/hotfix_id are missing from BOTH so they still die at the type check.
  BUG FILED: BUG-055 (P1-High, Draft, approved:false) at
  .cleargate/delivery/pending-sync/BUG-055_Spike_Push_Lands_Under_Unknown_Id.md — measured repro,
  both faces, one-line fix, and the existing R21 test named as one assertion short (it asserts
  args.type and never args.cleargate_id). NOT covered by BUG-051: that bug's §1(a) table and §4
  Modify list cite push.ts:506-519 = getItemType's range only. BUG-055 §4 scopes the other eleven
  registries OUT so it can ship standalone.
SEVERITY_HOLE: FILED NOW — BUG-056 (P2-Medium, Draft, approved:false) at
  .cleargate/delivery/pending-sync/BUG-056_Gate_Block_Severity_Has_No_Machine_Witness.md.
  BLAST RADIUS: 11 gate blocks in readiness-gates.md — 7 enforcing (epic×2 :88/:121, story :140,
  cr :169, bug :192, sprint :211, hotfix :237), 4 advisory (proposal :75, initiative :224,
  spike×2 :254/:269). Zero have their VALUE pinned. All 11 are correct as declared today, so this
  is a latent coverage hole, not a live mis-declaration — hence P2. Severe direction is
  enforcing→advisory: flipping story:140 disarms the hardest gate in ClearGate with the full
  2516-test suite still green.
  EXISTING SEVERITY ASSERTION ANYWHERE: yes for the MECHANISM, no for the VALUE — this corrects
  TPV Ruling 6's scope. gate-unit.node.test.ts:410 (enforcing→exit 1 + ❌) and :448
  (advisory→exit 0 + ⚠ "(advisory)") DO assert severity behaviour, but against a synthetic inline
  GATES_DOC (:142-215), never the real document. Presence is pinned twice
  (readiness-predicates.node.test.ts:723; gate-section-index-pinning.node.test.ts:161, a
  narrowing guard). NO test anywhere compares a real block's severity to 'advisory'/'enforcing'.
  advisory-env-gate.red.node.test.ts is a different mechanism (CLEARGATE_ADVISORY=1 pre-commit)
  and is integration-tier, excluded from the default runner. Concealment confirmed: gate.ts:305
  writeCachedGate precedes :331 severity routing, so every cached_gate_result assertion is
  severity-blind by construction. Fix shape: an EXPECTED_SEVERITY fixture beside EXPECTED_HEADINGS
  — 11 rows, both-ways closure — reusing loadGateBlocksFromText, which already parses these blocks.
COMPOSES_WITH_054_04: YES — verified by code path, not by running `cleargate wiki`. Measured:
  deriveBucket('SPIKE-001_x.md') → {type:spike, id:SPIKE-001, bucket:spikes};
  detectWorkItemTypeFromFm({spike_id}) → spike; WORK_ITEM_TRANSITIONS.spike → [ready-to-investigate,
  ready-to-conclude]; live-registry gate check → ✅ 4 criteria. `spikes` present in all follower
  sites (page-schema :178/:182/:185, load-wiki :13, product-state :36/:54, wiki-ingest :574
  BUCKET_SYNTHESIS_MAP, wiki-build :54) and in BOTH config.yml allowlists. 054-02 correctly did
  not touch page-schema.ts or derive-bucket.ts. lint-checks.ts:303 ENFORCING_TYPES correctly still
  excludes spike. deriveBucket uses startsWith so the includes-ordering hazard is
  work-item-type.ts-only — the two maps needed opposite disciplines and got them.
  SEAMS (3, none blocking): (1) contradict.ts:313 getBucketFromId has no SPIKE- row → falls
  through to topics, Phase 4 re-prepares every ingest, no phantom page (BUG-051 §3.1(v) owns it);
  (2) wiki-comments-render.ts:33/:45 → spike comments silently unrouted, was unreachable before
  this story and is now live (BUG-051 §4 lists the file); (3) existing installs never get
  `- spikes` — config.yml is INTENTIONALLY_UNTRACKED in MANIFEST, so `cleargate upgrade` cannot
  add it; new installs get it from the canonical seed.
WAVE_5_HANDOFF: §-audit run — protocol max numbered section is 23 (## 23. Execution Contract,
  :846), next free is §24, and 054-03 correctly consumes none of it (unnumbered
  ## Guidance Surface Reach). No stale §N in the story to rewrite. LINE REFS: this story added
  +1 net line to cleargate-protocol.md, so M1's end-of-file anchor moved — `### 23.4` is now :908
  and the file is 919 lines; locate by heading text. CLAUDE.md:140 (root) and
  cleargate-planning/CLAUDE.md:18 (canonical) are BOTH still correct — re-verified by sentence
  text this pass; the recorded trap holds exactly as stated, locate by sentence never by line.
  story.md:27 unchanged. MUST NOT CONTRADICT/DUPLICATE: (1) §21.2's bucket sentence already names
  spikes — do not re-add; it still omits `topics`, leave that to BUG-051. (2) KNOWN_TYPES is now
  9 entries — do not restate the count in prose. (3) spike.md §1/§2/§5 already carry the
  bullet-form authoring guidance — one statement, one home; and do not propagate its "the gate
  below" phrasing into doctrine, where there is no "below". (4) NEW AND LOAD-BEARING: a failing
  spike gate is INVISIBLE in chat — stamp-and-gate.sh:39-43 re-emits only on non-zero exit and
  greps ^❌, while an advisory gate exits 0 and emits ⚠, so findings reach hook-log only. Any
  "the hook will tell you what's failing" sentence is FALSE; say `cleargate gate check <file>`.
  (5) any wiki-reach claim needs the existing-install caveat above. (6) do not open
  expected-headings.ts or the pinning test — nothing there changes (M1 R15). (7) latent, do not
  fix: PREFIX_MAP's includes matcher — re-measured SPIKE-003_Sprint-Scheduling.md → sprint,
  STORY-054-03_Spike-Doctrine.md → story; no live consumer affected (gate + push use the
  frontmatter detector; stamp-tokens.ts:215 uses it only as a truthiness check).
SCOPE: clean. Outer 3a114e9c = 3 canonical + 3 mirrors, all in §3.1 Related Files/Mirrors/site 5.
  cli 32eaaa0 = 8 paths (work-item-type.ts Primary; push.ts site 2; work-item-type.node.test.ts
  site 1; gate-section-index-pinning site 3; expected-headings site 4; gate-unit +
  readiness-predicates site 7 per TPV Ruling 1; plus the git mv covered by "New Files Needed").
  Zero undeclared files. work-item-id.ts zero diff; readiness-predicates.ts absent from the
  commit. NOTE FOR DEVOPS, not scope creep: cleargate-planning/MANIFEST.json is MODIFIED AND
  UNCOMMITTED in the outer tree; its diff is exactly this story's three canonical SHAs plus a
  generated_at bump, and all three SHAs were verified to match the files byte-for-byte. Commit it
  with the merge; do not revert it.
GOAL_ADVANCE: the sprint goal's first surface — a pre-sprint SPIKE charter for bounded discovery
  — stops being a markdown file and becomes a work item ClearGate can carry: `spike` is now a
  member of the closed WorkItemType union with a compiler-forced transition pair, two advisory
  gate blocks that a real authored charter passes and a blank template fails, a KNOWN_TYPES row,
  and a wiki bucket that composes with STORY-054-04 — leaving only doctrine reach (054-03) before
  a maintainer can actually author, gate and file one.
FINDINGS:
  1. push.ts:480 getItemId lacks spike_id → a spike pushes under cleargate_id "unknown", silently,
     exit 0, and every spike upserts onto the same server row. Measured. BUG-055 filed (P1-High).
     §1.1's "and pushed" promise does not hold end-to-end.
  2. push.ts:459 resolveLocalItem lacks spike_id → `cleargate push --revert SPIKE-001` exits 1
     "cannot resolve". Loud, minor. Folded into BUG-055 as its second face.
  3. Gate-block severity VALUE is unpinned for all 11 registry blocks (7 enforcing, 4 advisory);
     the routing mechanism IS pinned, but only against a synthetic doc. BUG-056 filed (P2-Medium),
     with TPV Ruling 6's scope corrected from "untestable" to "unpinned".
  4. Advisory gate findings never reach the agent's chat channel — stamp-and-gate.sh:39-43
     re-emits only on non-zero exit and greps ^❌; advisory exits 0 and emits ⚠. Pre-existing for
     proposal/initiative, now inherited by spike. Load-bearing for STORY-054-03's doctrine prose.
     Recorded in BUG-056 §1 as a noted second-order effect, explicitly scoped OUT of its fix.
  5. Protocol/code divergence: cleargate-protocol.md:744 documents ID_INVALID as an L1 error;
     mcp/src/tools/push-item.ts:356-362 implements it as an advisory warning. Under the documented
     behaviour BUG-055 would fail loudly instead of writing. Recorded in BUG-055 §3; no owner
     assigned — flagging for the orchestrator.
  6. Neither bug file is ingested. Both were written via Bash heredoc specifically so the
     PostToolUse:Edit|Write hook would not fire `cleargate wiki ingest` into the wiki pages the
     concurrent session is mid-edit on. They need `cleargate gate check` + `wiki ingest` once that
     session parks.
  7. The Developer's report misnames `resolveLocalItem` as `findItemByIdOrRemoteId`. No such
     symbol exists in push.ts. Cosmetic; the finding it carries was correct and is now filed.
```
