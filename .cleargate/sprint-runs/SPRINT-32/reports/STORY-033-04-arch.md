role: architect

# STORY-033-04 — Architect POST-FLIGHT Review (CAPSTONE)

**Verdict:** ARCH: PASS
**Story:** STORY-033-04 Wave Execution + Barrier (EPIC-033 capstone, L3, v2 standard lane)
**Commit:** fbc4bd8f
**Reviewed:** 2026-05-29 · worktree `.worktrees/STORY-033-04` (branch `story/STORY-033-04`, cut from `sprint/S-32` tip `fab5a89c` — contains 033-02 + 033-03 merges)

---

## One-line verdict

ARCH: PASS — all six review axes clear; the three-story integration contract (waves.json → launch_wave → RUN_ID barrier ledger) traces end-to-end with no seam mismatch.

---

## 1. Blueprint conformance — PASS

| §1.2 requirement | Evidence | Status |
|---|---|---|
| `launch_wave.mjs` drives `parallel()` of per-story segments, mints per-thunk RUN_ID, exports validator | `launch_wave.mjs:97` (`mintRunId`), `:231` (`validateVerdicts`), `:275` (`launchWave`) | ✅ |
| Verdict = discriminated union; `blocker` required iff `verdict != GREEN`; malformed → Error naming `storyId` | `:204-216` (blocker-required-iff-non-GREEN), `:243-247` (offending `storyId` named) | ✅ |
| ClearGate-managed `.worktrees/STORY-X` via bash, NOT Workflow isolation | `worktreeAddCommand` `:118-121` emits `git worktree add .worktrees/STORY-X -b story/STORY-X <sprintBranch>` | ✅ |
| Orchestrator-set `SKIP_FLASHCARD_GATE=1` (write-gate only), restore at barrier | SKILL.md §C.0.1 step 1 + step 6 + §C.9 between-wave block | ✅ |
| SKILL.md Phase C rewrite: §C.0 mode selector, §C.0.1 wave launch, §C.7 serial merge, §C.9 between-wave gate, resumeFromRunId, idempotent segments | All present in canonical SKILL.md diff | ✅ |
| Kill-switch `execution_mode: v2-serial` / `CLEARGATE_PARALLEL_WAVES=off` | `shouldRunParallel` `:137-141`; SKILL.md §C.0 table | ✅ |
| Protocol §23 "Parallel-Wave Execution Contract" (schema, RUN_ID invariant, barrier/serial-merge, §22 inheritance) | protocol `:827` §23.1-23.4 | ✅ |
| Enforcement §1.6 (per-worktree `.git` index + serial barrier merge) | enforcement `:99` §1.6 | ✅ |

Tests: 23/23 pass (`cleargate-cli/test/scripts/wave-execution-barrier.red.node.test.ts`). U1–U4 validator units cover accept / missing-tokens / non-GREEN-without-blocker (BLOCKED **and** ESCALATED) / storyId-named-on-failure. C1–C6 cover the six Gherkin scenarios via doc + export assertions. §4.1 minimums (4 unit + 6 acceptance) met.

## 2. INTEGRATION CORRECTNESS — PASS (the whole point of EPIC-033)

End-to-end trace across the three merged stories, verified against the actual merged source in this worktree:

**Seam A — waves.json (033-03 producer → 033-04 consumer):**
- Producer `cleargate-planning/.claude/agents/architect-synth.md:71-92` emits `waves.json` = `{ sprint, generated_at, waves: [{ wave, stories[], parallel, rationale }] }`, written to `.cleargate/sprint-runs/<id>/plans/waves.json`.
- Consumer `launch_wave.mjs:270` JSDoc declares `args.wave: { wave: string, stories: string[], parallel: boolean }`; body reads `wave.stories` (`:276`). **Exact match** — launchWave consumes one element of the `waves[]` array; it ignores the optional `rationale` (harmless). The tiny-sprint floor (architect-synth `:48`) always emits `waves.json` with `parallel:false`, so 033-04 never special-cases file absence. ✅

**Seam B — RUN_ID barrier ledger (033-04 producer → 033-02 writer):**
- 033-04 mints `runId` per segment (`mintRunId` `:97`) and the verdict carries `runId` + `tokens` (`:38-43`).
- The barrier sets `RUN_ID` env → `write_dispatch.sh:125,133` stamps `.run_id` into the dispatch marker → `token-ledger.sh:193` reads `.run_id`, `:481-490` keys `.session-totals.json` **by run_id**, `:507-516` no-op-dedup guard (`grep "run_id":"<id>"` already in ledger → skip second row), `:518-528` ESCALATED guard (zero tokens → no row). **Exact match** to 033-04's invariants: ESCALATED → no ledger row; RUN_ID is the dedup key; one row per (storyId, run_id), idempotent. ✅
- Field-name seam: verdict uses camelCase `runId`; the ledger uses JSON `run_id`. The translation point is the Orchestrator's barrier step (`RUN_ID` env → marker). 033-02 owns that write; 033-04 correctly performs **zero** ledger writes itself (verified: `launch_wave.mjs` has no `appendFile`/`writeFileSync`/`session-totals`/`token-ledger` write — only doc comments citing 033-02 ownership). Clean scope boundary. ✅

No seam mismatch found. The capability is wired correctly across all three stories.

## 3. Spike-fidelity — PASS

All four settled spike facts (STORY-033-01-spike-result.md decisions 1–4) are honored:
- Barrier-writer attribution from `verdict.tokens` keyed by RUN_ID (not per-agent SubagentStop) — verified via Seam B above; documented protocol §23.2.
- ClearGate-managed worktrees via bash off `sprint/S-NN` (not Workflow `isolation:'worktree'`) — `worktreeAddCommand:118`.
- Orchestrator-set `SKIP_FLASHCARD_GATE=1` (write-gate only, reading unaffected) — SKILL.md §C.9; launcher header `:21-22`.
- `resumeFromRunId` complete-then-resume; GREEN short-circuit zero new ledger rows; idempotent segments — SKILL.md §C.0.1 step 6 + idempotent-segments para.
- SubagentStop=orchestrator-transcript → barrier-written attribution — protocol §23.2 RUN_ID invariant.

## 4. Kill-switch — PASS (no half-state)

`shouldRunParallel` (`:137-141`) is fail-safe-to-serial: `CLEARGATE_PARALLEL_WAVES=off` → false; `v2-serial` → false; returns `executionMode === 'v2-parallel'` otherwise. Every other input (`v1`, `v2`, `undefined`, typo) → **false (serial)**. The ONLY true path is explicit `v2-parallel` with no off-override. Smoke-confirmed live: `shouldRunParallel('v1')=false`, `('v2-parallel',{})=true`, `('v2-parallel',{off})=false`, `(undefined,{})=false`. SKILL.md §C.0 kill-switch contract states "zero behavior change — no launch_wave.mjs invocation"; the serial path routes to the existing §C.1–§C.9 loop verbatim. No half-state.

## 5. §22 canonical-protocol gap — PASS (additive, not clobbered)

- §22 intact at protocol working `:786`; §23 appended additively at `:827`. §22 not modified.
- §23 block extracted from BOTH working and `cleargate-planning/.cleargate/knowledge/cleargate-protocol.md` → **byte-identical** (diff empty). 033-04 added §23 to both mirrors; it did NOT reconcile or clobber the pre-existing §22 divergence.
- The working↔canonical protocol diff is entirely the pre-existing **§22 presence delta** (§22 in working, absent in canonical) introduced by SPRINT-30 STORY-071-01 — confirmed via line-range diff (the whole-block shift originates at §22). This is a **Gate-4 remediation item, not this story's responsibility** — correctly documented in the Dev commit message and the QA report. Recommend Gate-4: add §22 to the canonical mirror before merging `sprint/S-32` → `main`.

Mirror parity (this story's surfaces, all PASS):
- `launch_wave.mjs`: working == canonical == cli-payload.
- enforcement.md: working == canonical (full parity).
- SKILL.md: canonical == cli-payload (prebuild ran).
- protocol.md §23: working == canonical (only the inherited §22 delta differs).

## 6. ADR violations — PASS

- No new dependency: `package.json` not in the commit; `launch_wave.mjs` imports only `node:crypto`.
- node:test only: no vitest reference in launcher or tests; test file is `*.red.node.test.ts`, run via `node --test --import tsx/esm`.
- EPIC-027 boundary: no PM-tool SDK import in `launch_wave.mjs`.

---

## Script Incidents
None. No `run_script.sh`-wrapped invocation failed during review (test run was a direct read-only `node --test` against the validator surface).

## Recommendation
**Merge.** This is a clean capstone. One Gate-4 follow-up (NOT a merge blocker for this story): reconcile the SPRINT-30 §22 canonical-mirror gap before `sprint/S-32` → `main`. Flashcard recorded: `#workflow #parallel #integration #run_id` (EPIC-033 wave seam trace).
