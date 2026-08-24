# Session Handoff — 2026-08-06

Off-sprint planning session. Two epics and one CR reached 🟢. Read the **Correction** section first;
it revises verdicts given earlier in the session that a parallel branch has since disproven.

---

## 1. Correction — preflight verdicts I got wrong

Earlier in this session I evaluated three claims about `cleargate sprint preflight` and reported that
none held as stated. A parallel session was concurrently fixing all three. Commit `f712b962`
(this repo, 13:24 +0400) and `e556336` on `cleargate-cli` branch `fix/preflight-idempotence-and-scope`
land those fixes.

| Claim | What I said | What is actually true |
|---|---|---|
| **3 — readiness scan covers deferred/archived IDs named in the plan** | "False — extraction is scoped to `## 1. Consolidated Deliverables`." | **Substantively TRUE.** `f712b962`'s own comment: *"before this filter existed, every ID named in such a table was scanned as though it were selected, so documenting a deferral produced spurious 'file not found' / 'not ready' preflight failures."* Scoping to §1 is technically right and beside the point — §1's **sub-sections** name deferred work, and those were scanned. |
| **2 — preflight disagrees with `gate check`** | "Not reproducible; Step 0 shells out the identical command so they cannot disagree at the same moment." | **Mechanism was real and I had the evidence in hand.** `e556336` is titled *"stop the transition oscillation that made preflight unusable."* Transition auto-detection is content/state dependent — I watched EPIC-052 flip from `ready-for-coding` (6 criteria) to `ready-for-decomposition` (12 criteria) between two runs and logged it as a curiosity instead of recognising it as the disagreement mechanism. |
| **1 — not idempotent** | "False; `writeCachedGate` has a structural idempotency guard, converges after one commit." | The guard at `frontmatter-cache.ts:78-92` is real and I verified it. But the branch is literally named `preflight-idempotence-...`, so idempotence remained a live problem. Treat my "converges" as unproven. |

**Why I got it wrong, for the next agent:** I tested claim 3 against `SPRINT-09`, whose heading is
`## Consolidated Deliverables` — no `1.` — so the regex `/^## 1\.? Consolidated Deliverables\b/m`
never matched and extraction returned `[]`. The sample never exercised the code path. I then read
"couldn't reproduce" as "claim is false." **A non-reproducing sample disproves nothing.** Pick a
sample that provably exercises the path, or say the test was inconclusive.

**Still open and worth filing** (not addressed by either commit, verified by hand):

- `assert_story_files.mjs` requires the literal `1` in the §1 heading. `SPRINT-09` has
  `## Consolidated Deliverables`, so extraction silently returns `[]`, Check 5 validates nothing but
  the sprint plan itself, and preflight reports a pass. A gate that doesn't gate.
- Step 0 skips on *archive-path **OR** terminal status*; Check 5 skips on *terminal status only*. An
  archived item with a non-terminal status is never refreshed but is still evaluated, so it can fail
  as `no cached_gate_result` / stale.

---

## 2. What reached 🟢 this session

| Item | Gate | Summary |
|---|---|---|
| **CR-103** Wiki Page & Index Fidelity | ✅ 8/8 `cr.ready-to-apply` | One shared page builder; marked truncation at 1200 chars; delete the fabricated `## Open questions`; resolve titles from body H1; one index schema; surface lifecycle drift. |
| **EPIC-052** Requirement-Level Grounding | ✅ 12/12 `epic.ready-for-decomposition` | `## Grounding` table as contract across all five templates; `grounding-recorded` predicate; locking-test execution in lint; story digests; relevance judge. 6 workstreams. |
| **EPIC-053** Downstream DB Collision Detection | ✅ 12/12 `epic.ready-for-decomposition` | Fail-safe polarity for the DB axis + a three-rung detection ladder so downstream repos get real collision protection. 6 workstreams. |

Neither epic is decomposed. **Next step is cutting stories** — EPIC-053 → 7, EPIC-052 → 7–9 (D2 widened
it to five templates). Run the Granularity Rubric at decomposition.

Decision records live in each epic's `## Resolved Decisions` section (D1–D7 each). All owner
questions are answered; `## 6. AI Interrogation Loop` is empty in both by design, so the
`interrogation-resolved` criterion evaluates literally.

---

## 3. Framework defects found and verified by hand

Each was confirmed by reading source, not inferred. Several are not yet filed.

**Fixed this session:**
- `interrogation-resolved` checked for the literal `Unresolved`, but `epic.md` shipped the placeholder
  `{Waiting for user}` — so the criterion **could never fail** for any template-authored epic.
  Fixed in `.cleargate/templates/epic.md` + canonical mirror; the placeholder now carries the token.
  Verified: EPIC-052 with 7 open questions went from passing to failing.

**Found, not filed:**
- **Wiki page bodies are a 200-char `slice()`.** `wiki-ingest.ts:467`, `wiki-build.ts:251` — two
  *different* truncation algorithms, so the same item renders differently depending on which command
  ran last. Owned by CR-103.
- **No template defines `title:`.** Every wiki page's H1 has always been `# <ID>: <ID>` for ~150 pages,
  which is why `index.md` carries no titles and `wiki query` (a grep over that index) can't match a
  topic word. Owned by CR-103.
- **Two incompatible index schemas.** `wiki-build.ts:357` writes bullets; `wiki-ingest.ts:539` writes
  table rows; the parser at `:616` can't read what `build` wrote. Owned by CR-103.
- **Wave packing is prose, not code.** The five-clause predicate, the packing algorithm, and the
  "trailing serial wave" rule exist only in `.claude/agents/architect-synth.md`. `launch_wave.mjs`
  imports only `node:crypto` — no `fs` — so it *cannot* read `waves.json`; it receives a parsed wave
  object and reads only `wave.stories`. `init_sprint.mjs:160-171` extracts only `lane_assignments`.
  Nothing validates `waves.json`.
- **`dep_predecessors` has no producer.** No agent, skill, template, or gate ever instructs anyone to
  write it. `git log -S dep_predecessors` across every template path: zero commits, ever. So clause
  5's "topological sort" runs on an edgeless graph for ClearGate's own work.
- **Wave placement rule contradicts itself.** `architect-synth.md:62` sends every fail-safe-serialized
  story to a *trailing* wave, but SPRINT-35 placed `STORY-046-01` in **wave1** — *"serialized as the
  foundation all other stories depend on"* — and SPRINT-38 correctly placed `STORY-051-09` last
  because it deletes a file an earlier story edited. Placement should be dependency-derived, not
  category-derived. **Worth a CR; not filed.**
- **No work-item ID allocator.** `cleargate story` exposes only `start`/`complete`; no next-id surface
  exists in `cleargate-cli/src`. Evidence it is needed: this session drafted a new EPIC-051 **on top of
  the archived EPIC-051**, clobbering its wiki page, because the free-ID scan covered `pending-sync/`
  for epics but only `archive/` for CRs and Bugs. Repaired by renumbering to EPIC-052 and rebuilding
  the wiki. **BUG-041 is free; not filed.**

---

## 4. Proposed sprint composition (decided, not written to a sprint plan)

Nine items in three waves. Waves are the serialization boundary — parallelism happens *inside* a
wave, and `launch_wave.mjs` consolidates at a serial barrier before advancing.

| Wave | Stories | Note |
|---|---|---|
| 1 | CR-103, STORY-031-01, STORY-031-02, CR-085 | Verified-disjoint file surfaces |
| 2 | EPIC-052 WS1, WS2 | Depends on CR-103 merging |
| 3 | EPIC-052 WS3 Tier 1, WS3 Tier 2, WS5 | Depends on the contract existing |

Deliberately deferred from the first sprint: EPIC-052 WS4 (digests) and WS6 (relevance judge).
EPIC-031/STORY-031-01/02 currently **fail** their gates and need gate work before `sprint init`.

Two proposals were evaluated and **rejected**, with reasons recorded so they aren't re-litigated:

- **Running waves in parallel** — the wave boundary *is* the isolation mechanism; `sprint/S-NN` is a
  single-writer axis, and wave-2 worktrees branch from it before wave-1 merges land.
- **Speculative parallel execution + cherry-pick reconciliation** — merges text, not intent. Works for
  clause-2 file collisions; fails silently on clause-5 dependency edges, where two developers guess at
  an interface and the merge is clean while the system is wrong. Amplified here because QA-Red writes
  the failing test first and `*.red.node.test.ts` is immutable to the Developer, so a wrong guess
  becomes a locked spec.

---

## 5. Environment gotchas that cost time

- **`grep` is a gitignore-aware shim.** `.claude/`, `cleargate-cli/`, `mcp/`, and `admin/` are all
  gitignored here, so a plain `grep -r` returns **zero hits in the directories that matter**. Use
  `command grep` or `find | xargs grep`. Two independent verifier agents hit this and nearly
  concluded that cited files did not exist.
- **Ultracode workflows returned a high dispute rate.** In the second workflow, 4 of 5 finders were
  refuted on adversarial review and one verifier died on an API error. Every load-bearing claim in
  EPIC-053 was re-verified by hand before being written down. Treat synthesis output as a lead, not a
  finding.

---

## 6. Immediate next actions

1. **Decompose EPIC-053** into STORY-053-01…07 (order given in its decomposition note).
2. **Decompose EPIC-052** into 7–9 stories; D2 added Bug + Initiative templates to WS1's surface.
3. **File the ID allocator** as BUG-041 — the collision is real and reproducible.
4. **File the wave-placement CR** — replace blanket "trailing" with dependency-derived placement.
5. **File the two open preflight defects** from §1.
6. Gate-fix EPIC-031 / STORY-031-01 / STORY-031-02 if Wave 1 is to include them.
