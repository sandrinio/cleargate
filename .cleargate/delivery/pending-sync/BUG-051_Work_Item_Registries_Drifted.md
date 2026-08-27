---
bug_id: BUG-051
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — direct source reading of cleargate-cli/src during EPIC-054 wave-3 preflight; no prior approval, filed for triage
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: cleargate@0.24.2
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-27T13:38:55Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-051: Work-item type and wiki bucket registries have silently drifted apart

### Open Questions

- **Question:** Is `cleargate push` the intended path for an initiative, or are initiatives only ever pushed via the `cleargate_push_item` MCP tool? If the CLI path is intended, §1(c) is P1-High, not P2-Medium.
- **Recommended:** Treat as P2 until confirmed. The CLI `push` hard-errors rather than mis-typing, so it fails loudly; the sync mis-typing in §1(d) is the silent one and is the reason this is filed at all.
- **Human decision:** {populated during Brief review}

- **Question:** Should the fix unify the registries, or just re-sync them in place?
- **Recommended:** Unify. Re-syncing in place restores correctness for exactly as long as it takes the next type or bucket to be added. Two of the three type maps are module-private, so nothing can even detect the next drift.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** ClearGate has one registry per concept. Adding a work-item type or a wiki bucket updates one list, and every surface that consumes it agrees.

**Actual Behavior:** There are at least three independent frontmatter-key-to-type maps and fourteen independent wiki-bucket lists. They already disagree with each other, in production, today — before any new type is added.

**(a) Three type maps, three different answers.**

| Map | story | epic | proposal | cr | bug | initiative | sprint | hotfix |
|---|---|---|---|---|---|---|---|---|
| `src/lib/work-item-type.ts:14` `FM_KEY_MAP` (canonical) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `src/lib/sync/work-items.ts:149` `typeMap` (private) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| `src/commands/push.ts:507` `typeMap` (private) | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |

`push.ts` knows `sprint_id` but not `initiative_id`. `sync/work-items.ts` knows `initiative_id` but not `sprint_id`. Neither knows `hotfix_id`. Only `work-item-type.ts` is complete.

**(b) `cleargate wiki lint` cannot see initiative pages.** `src/wiki/load-wiki.ts:13` declares
`BUCKET_DIRS = ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']` — no `initiatives`.
`loadWikiPages()` is consumed by exactly one caller, `src/commands/wiki-lint.ts:66`, so every page under
`.cleargate/wiki/initiatives/` is silently excluded from linting.

**(c) `product-state.md` under-reports and cannot report initiatives at all.** Three separate sites must agree
and none of them carries `initiatives`:
- `src/wiki/synthesis/product-state.ts:36` — the `buckets` array, which drives `active_*` / `shipped_*`.
- `src/wiki/synthesis/product-state.ts:48-53` — a *hand-written* `total_*` block, not derived from `buckets`.
- `templates/synthesis/product-state.md:8-13` — the summary table, a hardcoded mustache row per bucket.

Because the template row is hardcoded, adding a bucket to the code alone renders nothing.

**(d) `cleargate sync work-items` mis-types sprints and hotfixes as stories.** `getItemType`
(`src/lib/sync/work-items.ts:148`) falls through its `typeMap`, then through a prefix if-chain that lacks
`SPRINT-` and `INITIATIVE-`, and ends at `return 'story'` — a silent default, not an error.

## 2. Reproduction Protocol

All steps are read-only and run from the repo root. No network, no membership required.

- **(b)** `sed -n '13p' cleargate-cli/src/wiki/load-wiki.ts` → observe `initiatives` absent from `BUCKET_DIRS`.
  Confirm the pages it should have found: `ls .cleargate/wiki/initiatives/` → `INITIATIVE-001.md`.
  Confirm the single consumer: `grep -rn "loadWikiPages" cleargate-cli/src/` → only `wiki-lint.ts:66`.
- **(c)** `sed -n '5,14p' .cleargate/wiki/product-state.md` → the Summary table lists Epics, Sprints,
  Proposals, CRs, Bugs. There is no Initiatives row, though `.cleargate/wiki/initiatives/INITIATIVE-001.md`
  exists and is ingested (it *does* appear in `.cleargate/wiki/index.md:30`).
- **(a)/(d)** `sed -n '148,168p' cleargate-cli/src/lib/sync/work-items.ts` and
  `sed -n '506,519p' cleargate-cli/src/commands/push.ts` → compare both against
  `sed -n '14,37p' cleargate-cli/src/lib/work-item-type.ts`.

## 3. Evidence & Context

```
$ sed -n '5,14p' .cleargate/wiki/product-state.md
## Summary

| Type | Total | Active | Shipped |
|------|-------|--------|---------|
| Epics | 46 | 0 | 32 |
| Sprints | 39 | 1 | 33 |
| Proposals | 16 | 0 | 14 |
| CRs | 107 | 0 | 82 |
| Bugs | 42 | 0 | 25 |
                        <-- no Initiatives row

$ ls .cleargate/wiki/initiatives/
INITIATIVE-001.md

$ grep -n "INITIATIVE" .cleargate/wiki/index.md
30:- [[INITIATIVE-001]] (initiative) — In Triage — Broker / Rendezvous Plane ...

$ sed -n '13p' cleargate-cli/src/wiki/load-wiki.ts
const BUCKET_DIRS = ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics'];

$ sed -n '161,168p' cleargate-cli/src/lib/sync/work-items.ts
  const cgId = typeof fm['cleargate_id'] === 'string' ? (fm['cleargate_id'] as string) : '';
  if (cgId.startsWith('STORY-')) return 'story';
  if (cgId.startsWith('EPIC-')) return 'epic';
  if (cgId.startsWith('PROPOSAL-')) return 'proposal';
  if (cgId.startsWith('CR-')) return 'cr';
  if (cgId.startsWith('BUG-')) return 'bug';
  if (cgId.startsWith('HOTFIX-')) return 'hotfix';
  return 'story';                        <-- a sprint or initiative lands here
```

**Why this was not caught.** Two of the three type maps are declared `Record<string, string>` inside a
function body and are never exported. Adding a member to the `WorkItemType` union therefore produces **no**
typecheck pressure on them. The one place that *is* compiler-forced — `WORK_ITEM_TRANSITIONS`, typed
`Record<WorkItemType, string[]>` — created a false sense that registration is self-enforcing. It enforces
exactly one of the six sites.

**Why it matters now.** This is the [[BUG-041]] divergence class, one layer up. BUG-041 unified the ID
*grammar*; it did not touch the type and bucket *registries*, which is why they were free to drift after it
shipped.

### 3.1 Re-measured 2026-08-27 against STORY-054-04's commits — seven corrections, one new drift row

> Appended by the Architect post-flight pass on STORY-054-04 (outer `de75fd34`, `cleargate-cli`
> `a52134b5`; both awaiting DevOps merge at the time of writing). **Evidence only** — no scope change, no frontmatter change, no gate criterion
> checked. Everything below was executed against the tree, not recalled.

**(i) The count in §1 is now low.** "Fourteen independent wiki-bucket lists" predates 054-04's
enumeration. Measured today: **fifteen** live bucket-name sites — thirteen now carry `spikes`
(eleven in `cleargate-cli`, plus both `config.yml` `wiki.ingest_buckets` allowlists), two
deliberately do not (see (v)). A **sixteenth** is prose:
`cleargate-planning/.cleargate/config.example.yml:10` reads
`# Valid buckets: epics | stories | sprints | proposals | initiatives | crs | bugs` — stale in two
directions, omitting both `spikes` and `topics`. It is a commented reference list nothing parses,
i.e. the same "prose states a fact no test checks" class as the rest of this bug.

**(ii) §1(b) and the §3 evidence block are one element short.** `src/wiki/load-wiki.ts:13` now reads
`['epics','stories','sprints','proposals','crs','bugs','topics','spikes']`. A fixer running the §2
repro (`sed -n '13p' cleargate-cli/src/wiki/load-wiki.ts`) gets a line that does not match the quoted
evidence and could conclude the defect was already fixed. **The substantive claim is unchanged and
still true: `initiatives` is still absent, and `loadWikiPages` is still consumed only by
`wiki-lint.ts:66`, so initiative pages are still unlinted.**

**(iii) §1(c) is strengthened, not weakened.** All three product-state sites
(`src/wiki/synthesis/product-state.ts` `buckets`, its hand-written `total_*` block, and
`templates/synthesis/product-state.md`'s mustache table) gained `spikes` and still lack
`initiatives`. STORY-054-04 is a worked demonstration of the claim: adding one bucket required all
three edits, and omitting the mustache row alone would have rendered nothing at all.

**(iv) §5's two open premises are both settled — this is the most important correction here.**
§5 says *"the test does not exist yet; writing it is part of the fix"* and poses the
export-the-constants vs parse-the-source fork as an open decision. Both are resolved by `a52134b5`:

- `cleargate-cli/test/wiki/bucket-registry-parity.red.node.test.ts` **exists** and is picked up by the
  default runner glob.
- It took the **parse-source-text** fork. **No private constant was exported** — the half-unification
  this bug warns about did not start.
- Its `KNOWN_BUCKET_GAPS` table is exactly this bug's §1(b)+(c), enumerated as five rows, each
  carrying a reason string citing `BUG-051`:
  `initiatives` × {`load-wiki.BUCKET_DIRS`, `product-state.buckets`, `product-state.total_*`,
  `synthesis-template.mustache`} and `stories` × `synthesis-template.mustache`.
- P2 collects **every** finding and names the specific site by label — which is precisely what §5
  says a correct test must do.

**Consequence for whoever fixes this bug: the fix is materially smaller than the bug describes.**
It is *close the five gaps, delete the five rows, and delete the size assertion with them* — not
*write a parity test from scratch*. A fixer who follows §5 literally writes a **second** parity
test, which would be the sixteenth list and the exact defect this bug exists to end.

**Recommended DoD sentence for §5 (not applied here — scope):** *"`KNOWN_BUCKET_GAPS` drops 5 → 0
and the table, P3 and P4 are deleted with it."* Without an exit condition owned by this bug, the
size assertion resists growth and shrinkage symmetrically and 5 stays 5 indefinitely.

**(v) One new drift row, deliberate and correctly out of 054-04's scope.** `spikes` is absent from:

- `src/lib/wiki/contradict.ts:313` `getBucketFromId` — a `SPIKE-` id falls through to `topics`.
  **`contradict.ts` is not in §4's Modify list; it should be.** Measured blast radius, so the fixer
  does not have to re-derive it: `preparePhase4`'s SHA-idempotency probe (`:88-96`) looks for
  `wiki/topics/SPIKE-NNN.md`, never finds it, and **never skips** — Phase 4 re-prepares on every
  ingest of an unchanged spike charter; the neighborhood lookups at `:345`, `:353`, `:365` miss real
  spike pages. **No phantom page is created** — `stampContradictSha` (`:478-486`) reads before
  writing and swallows ENOENT, so the mis-resolved write is a no-op. Wasted work and thinner
  context, not a corrupt artifact.
- `src/lib/wiki-comments-render.ts:33` `resolveBucket` / `:45` `getPrimaryId` — already listed in §4.
  A spike's frontmatter yields `null`, so `renderComments` early-returns (`:118-120`) and comments
  are silently unrouted. Unreachable until `push.ts` can type a spike (STORY-054-02).

**(vi) Adjacent measured fact, NOT introduced by 054-04, corroborating the class.**
`derive-bucket.ts` `PREFIX_MAP` has **no `HOTFIX-` row**, so `deriveBucket('HOTFIX-001_x.md')`
throws (`:73`). `wiki build` swallows it and skips the file silently (`src/wiki/scan.ts:59-64`);
`wiki ingest` prints and `exit(1)` (`src/commands/wiki-ingest.ts:128-139`). Hotfixes are therefore
invisible to the wiki today. Relevant to `CR-108`, which will make hotfix items easier to create.

**(vii) §5's named command does not filter.** `npm --prefix cleargate-cli test -- <file>` silently
ignores the trailing path (`scripts/run-default-tests.mjs:23` hardcodes its glob and never reads
`process.argv`) and runs the full suite. The working form is
`npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/<path>`.

**Left for the human, deliberately not decided here:** whether this bug's severity should rise now
that part of its fix is already built; whether the `contradict.ts` gap should be closed inside
STORY-054-02; and whether the Ambiguity-Gate criterion *"Verification command (failing test) is
provided"* is now satisfied by the shipped parity test. **That box is left unchecked** — checking it
would flip a quarantined item toward 🟢 by interpretation, which is the human's call.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/lib/work-item-type.ts` — the canonical map; likely the export point for a unified registry.
- `cleargate-cli/src/lib/sync/work-items.ts` (:148-169)
- `cleargate-cli/src/commands/push.ts` (:506-519)
- `cleargate-cli/src/wiki/load-wiki.ts` (:13)
- `cleargate-cli/src/wiki/synthesis/product-state.ts` (:36, :48-53)
- `cleargate-cli/templates/synthesis/product-state.md` (:8-13)
- `cleargate-cli/src/lib/wiki-comments-render.ts` (:33-41, :46) — `resolveBucket` and `getPrimaryId` also
  lack `sprint`, `initiative`, and `hotfix`; comments on those pages resolve to `null`.

**Explicitly NOT in scope:** `cleargate-cli/src/lib/readiness-predicates.ts` — frozen for the duration of the
active sprint by its Cross-Cutting Rule 3.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test -- test/lib/registry-parity.node.test.ts`

The test does not exist yet; writing it is part of the fix. Note the constraint that makes this bug
self-concealing: **two of the three type maps are module-private, so a parity test cannot reach them by
import.** The fix must therefore either export them or the test must read and parse the source text — and
that choice should be made deliberately, because it is the same fork STORY-054-05 faced for `evalSection`.

A correct test asserts, for every registered work-item type and every wiki bucket, that the name appears in
*all* registries — and names the specific registry that is missing it, not merely that a mismatch exists.

---

## Prior work

> Duplicate-check evidence, enforced by the `prior-work-recorded` readiness predicate.

- [[BUG-041]] — the precedent and the same divergence class: ten independent ID-shape assumptions, three of
  which parsed the same input three ways. Fixed the ID *grammar*; did not touch these registries.
- [[CR-030]] — made `initiative` a first-class type and added it to several lists. This is the change whose
  incompleteness is now visible: it reached `derive-bucket.ts`, `work-item-type.ts` and `contradict.ts`, but
  not `load-wiki.ts`, `product-state.ts`, the product-state template, or `push.ts`.
- [[CR-103]] — unified two drifted wiki page builders and two drifted index row schemas. Adjacent and
  same-spirit, but explicitly did not touch the bucket constants.
- [[STORY-054-04]] — §1.3 defers "unifying the bucket lists into one exported constant" to "a follow-up CR".
  A wiki query confirms **that CR was never filed**; this bug is the evidence it needs, and its §1.5 risk
  ("a fifth bucket list exists somewhere ungrepped") is now measured: there are fourteen.

## Context Source

> Discovery audit.

**context_source:** verified codebase grounding — direct reading of `cleargate-cli/src` during wave-3
preflight for EPIC-054. Every claim above was checked against source and, where observable, against the
compiled wiki output. No prior epic approval; filed for triage.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [ ] Verification command (failing test) is provided. — the command is named but the test does not exist,
      and the import-reachability question above must be answered before it can be written.
- [ ] `approved: true` is set in the YAML frontmatter.
