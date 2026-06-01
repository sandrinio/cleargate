---
story_id: STORY-043-08
sprint_id: SPRINT-33
author: architect
mode: post-flight
created_at: 2026-06-01T16:10:00Z
---

# STORY-043-08 Architect Post-Flight Review — Conditional Architect Re-Entries

role: architect

## Verdict

ARCH-POSTFLIGHT: FAIL

Two defects block PASS: (1) an internal §C.6 ↔ §C.7 contradiction that deadlocks the
very clean path this story authorizes, and (2) an off-by-one dispatch-math error present
in BOTH edited files. Neither is an adversarial-core safety hole — the safeguard is
airtight — but check #3 and check #4 from the dispatch brief both fail, and #3 is
reachable (it halts the clean-path merge).

---

## Check 1 — ADR / adversarial-core invariant (highest priority): PASS

Verified by reading the script contract directly, not by trusting the QA report.

`pre_gate_runner.sh` documented exit contract (`pre_gate_runner.sh:5-8`), confirmed
against the code:
- **exit 0** — `OVERALL_EXIT` initialized 0 (`:68`), never flipped, returned at `:371`. Genuinely clean.
- **exit 1** — any check FAIL flips `OVERALL_EXIT=1` (typecheck `:210`, new_deps `:240`, stray_env `:269`), returned at `:371`.
- **exit 2** — scan-could-not-run: bad args (`:24`), unknown mode (`:33`), missing worktree (`:41`), missing/failed gate-config (`:53`/`:58`). All `exit 2` fire BEFORE `OVERALL_EXIT` is evaluated. Additionally `set -euo pipefail` (`:9`) means any unhandled mid-script crash propagates non-zero.

The edited §C.3.5 (SKILL.md:296-299) and §C.6 (SKILL.md:394-397) both gate the skip on
**exit 0 with no flags only**, and explicitly route **exit 1 OR exit 2 → dispatch live
Architect**. This matches the script's real semantics. There is NO reachable path where a
RISKY story skips the Architect:
- A broken scanner (`exit 2`) is treated as a flag ("fail toward dispatching, never toward skipping") → dispatch. Not silently skipped. The specific hole the brief warned about (exit-2-treated-as-clean) does NOT exist.
- Any flag (demotion / arch_bounce / surface-drift / new-deps / structural) → exit 1 → dispatch.
- Fast lane is handled upstream in the script itself (`:334-368`): a clean fast-lane scan auto-sets `Architect Passed` and exits 0; a failing fast-lane scan auto-demotes and exits non-zero. Consistent with the unchanged "lane: fast skips" prose.

The 5-agent split is preserved: the skip only removes the Architect on a PROVEN-clean
scan. Invariant intact.

## Check 2 — Safeguard verbatim + non-removable, both files: PASS

Identical safeguard blockquote present and marked non-removable at three locations:
- SKILL.md §C.3.5 — `:301`
- SKILL.md §C.6 — `:399`
- architect.md Mode: Post-Flight — `:134`

All six required keywords present verbatim in all three: `demotion`, `arch_bounce`,
`surface drift`, `new-deps`, `structural issue`, `exit-2 (scan-could-not-run)`, plus the
"fail toward dispatching, never toward skipping" rule. Byte-consistent across the three
copies.

## Check 3 — Internal consistency §C.6 ↔ §C.7: FAIL (reachable contradiction)

This is the contradiction the brief asked me to hunt for, and it is present and
**reachable** — it halts the clean path this story creates.

§C.6 now skips the Architect post-flight entirely on a clean scan → **no
`STORY-NNN-NN-arch.md` is produced** on the clean path. But §C.7 still asserts that report
is unconditionally required for every v2 standard-lane story, in THREE places left
un-amended by 043-08:

1. **SKILL.md:413** — required-reports table row: `| STORY-NNN-NN-arch.md | v2 standard-lane only |`. No clean-scan caveat.
2. **SKILL.md:444** — DevOps dispatch context-pack: `- {STORY-ID}-arch.md   ✓ (v2 standard lane only)`.
3. **SKILL.md:447** — DevOps ACTION step 1: **"Verify all required reports exist; halt if any missing."**

Read literally: a clean standard-lane story arrives at §C.7 with no arch.md (correctly,
per §C.6), and DevOps step-1 "halt if any missing" trips on the absent arch.md → the
clean path deadlocks at merge. This is precisely the contradiction flagged in the
dispatch.

Mitigating note (why it is FAIL-fixable, not FAIL-catastrophic): the prose halt rule at
**SKILL.md:416** names only `dev.md` and `qa.md` as the hard "do not dispatch DevOps with
missing reports" gate — arch.md is conspicuously absent from that sentence. So the
strongest halt sentence does not literally bite. But the table (:413), the context-pack
(:444), and the DevOps ACTION (:447 "all required reports") all still say arch.md is
required for every v2 standard-lane story. That is an internal contradiction with §C.6.

**Required fix:** amend SKILL.md:413, :444, and :447 to make arch.md conditional —
e.g. table row `| STORY-NNN-NN-arch.md | v2 standard-lane only, AND only when the pre-gate
scan flagged (Architect was dispatched) |`, and the DevOps step-1 verification must not
halt on a missing arch.md when the §C.6 scan was clean. The §C.6 edit and the §C.7
prerequisites must agree on when arch.md exists.

(For completeness: §C.0 / §8 rework counters are NOT in conflict — `arch_bounces`
increments only on `Architect: FAIL` (SKILL.md:645, :318, architect.md:132), which can
only fire when the Architect is actually dispatched. The clean path produces no dispatch,
hence no bounce. No contradiction there.)

## Check 4 — 6→5 dispatch math: FAIL (off-by-one, in both files)

The stated math is wrong in both files, and the two files justify the same "5" via
incompatible reasoning.

Baseline (always-on standard lane, pre-conditional):
`QA-Red → TPV(Architect) → Developer → QA-Verify → Architect-post-flight → DevOps` = **6**.

architect.md:130 claims the fully-clean path is "5 (QA-Red → Developer → QA-Verify →
DevOps, with **both** TPV **and** post-flight omitted)." If both Architect re-entries are
omitted, 6 − 2 = **4**, not 5. The parenthetical itself lists only four agents (QA-Red,
Developer, QA-Verify, DevOps) but labels them "5" — a literal off-by-one.

SKILL.md:396 claims "5 (QA-Red → TPV-skipped-or-clean → Developer → QA-Verify → DevOps)."
This counts a "TPV-skipped" slot as one of the five — i.e. it counts a non-dispatch as a
dispatch. Actual agent dispatches on the clean path: 4.

So the true fully-clean count is **4 dispatches** (QA-Red, Developer, QA-Verify, DevOps).
"5" would only be correct if exactly ONE Architect re-entry were removed — but §C.3.5
(clean) ALSO skips TPV, so on a fully clean scan BOTH are removed.

Note the dispatch brief's own framing ("QA-Red → TPV → Dev → QA-Verify → DevOps = 5") is
itself the seed of the confusion: it leaves TPV in the clean path, but §C.3.5 explicitly
skips TPV on a clean scan too. The clean path has no TPV.

**Required fix:** change "from 6 dispatches to 5" → "from 6 dispatches to 4" in BOTH
architect.md:130 and SKILL.md:396, and make the agent lists count only actual dispatches
(drop the "TPV-skipped-or-clean" pseudo-slot from the SKILL.md list). Alternatively, if
the intended optimization was post-flight-only (TPV always runs), then §C.3.5's
conditional-TPV edit is itself out of scope — but the safeguard text and §C.3.5 clearly
intend both to be conditional, so the count should be 4.

## Check 5 — Scope: PASS (with one minor flag)

Diff is confined to the three intended surfaces:
- SKILL.md §C.3.5 (TPV gate) + §C.6 (Architect pass) — the only loop sections touched.
- architect.md Mode: TPV header sentence + new Mode: Post-Flight section.

No ADR, worktree mechanics, gate semantics, merge-serial-barrier, flashcard gate, or
rework-counter logic was rewritten. `pre_gate_runner.sh` is unchanged (this story is
SKILL/agent prose only). Confirmed in scope.

**Minor flag (not blocking):** architect.md:228 "What you are NOT … pre-flight only,
post-flight is QA's job" now sits in mild tension with the new `## Mode: Post-Flight`
section the story added (the Architect now *does* have a post-flight mode). Per FLASHCARD
2026-06-01 `#architect-md #post-flight`, line 228 was the sole prior post-flight reference.
The new mode is pre-gate-flag remediation, not code review, so "code review is QA's job"
survives in spirit — but a one-clause caveat on :228 ("post-flight *code review* is QA's
job; Architect post-flight is pre-gate-flag remediation only") would remove the residual
contradiction. Recommended, not required for PASS.

---

## ISSUES

1. **§C.6 ↔ §C.7 contradiction (reachable, must-fix):** §C.6 skips the Architect (no
   arch.md) on a clean scan, but §C.7 still lists `STORY-NNN-NN-arch.md` as unconditionally
   required for v2 standard lane at SKILL.md:413, :444, and the DevOps "halt if any missing"
   ACTION at :447. A clean-path story deadlocks DevOps step 1. (The strongest halt sentence
   at :416 names only dev.md/qa.md, which softens but does not resolve the table/context-pack/
   ACTION assertions.)
2. **Dispatch-math off-by-one (must-fix, both files):** "6 → 5" is wrong; the fully-clean
   path with both TPV and post-flight skipped is **4** dispatches. architect.md:130 lists 4
   agents but says 5; SKILL.md:396 counts a "TPV-skipped" pseudo-slot toward the 5.
3. **(Minor, optional)** architect.md:228 "post-flight is QA's job" now mildly contradicts
   the added Mode: Post-Flight section.

No exit-2-treated-as-clean hole exists (Check 1 PASS). The safeguard is airtight and
verbatim in all three locations (Check 2 PASS).

## GATE4_NOTES

Live `/.claude/` re-sync is required at sprint close (currently Gate-4-deferred per M3 SDR
§2.3, confirmed by QA report). Both edited files have live-drift:
- `cleargate-planning/.claude/skills/sprint-execution/SKILL.md` (canonical) edited; live `/.claude/skills/sprint-execution/SKILL.md` NOT updated.
- `cleargate-planning/.claude/agents/architect.md` (canonical) edited; live `/.claude/agents/architect.md` NOT updated.

Re-sync order at Gate 4 (per FLASHCARD 2026-06-01 `#dogfood #scaffold #sync-order`):
run `npm run prebuild` (regenerates the cleargate-cli payload from canonical) FIRST, THEN
`cleargate init` (rewrites live `/.claude/` from the PAYLOAD). Running `cleargate init`
before `prebuild` would re-sync live from a STALE payload (BUG-024 class). MANIFEST.json
sha256 hashes were already regenerated by prebuild per the QA report — verify they cover
both edited files at close.

IMPORTANT: the two must-fix defects above should be corrected in canonical BEFORE the
Gate-4 prebuild+init, so the live instance never ships the off-by-one count or the
§C.6↔§C.7 deadlock.

## flashcards_flagged

- "2026-06-01 · #skill-md #dispatch-count #post-flight · Conditional-Architect skip removes BOTH TPV (§C.3.5) and post-flight (§C.6) on a clean scan — fully-clean standard lane is 4 dispatches (QA-Red/Dev/QA-Verify/DevOps), NOT 5; don't count a skipped slot as a dispatch. [SPRINT-33 043-08 postflight]"
- "2026-06-01 · #skill-md #merge-prereq #arch-md · making the Architect post-flight conditional (§C.6) requires loosening §C.7's required-reports table + DevOps 'halt if any missing' — arch.md only exists when the pre-gate scan flagged; otherwise clean-path merge deadlocks. [SPRINT-33 043-08 postflight]"

---

## FINAL-CONFIRM (Post-Flight Re-Verify) — 2026-06-01

role: architect

ARCH-POSTFLIGHT: PASS

Both prior-FAIL defects are fixed in canonical; no new contradiction introduced. Read-only re-verify of the edited SKILL.md §C.6/§C.7 + architect.md.

### Re-check 1 — §C.6 ↔ §C.7 consistency (the serious deadlock): RESOLVED
The arch.md conditional caveat is now present and internally consistent in ALL THREE §C.7 locations, all keyed to the same §C.6 skip condition (clean scan = exit 0, no flags → no Architect dispatched → no arch.md):
- Table (SKILL.md:413): `v2 standard-lane only, AND only when the §C.6 pre-gate scan flagged (Architect post-flight was dispatched); absent on a clean-scan story`.
- DevOps context-pack (SKILL.md:444): `✓ (v2 standard lane only, AND only when pre-gate scan flagged — absent if Architect was not dispatched)`.
- DevOps ACTION step 1 (SKILL.md:447): `halt if any missing. Exception: arch.md is required ONLY when the §C.6 pre-gate scan flagged (Architect was dispatched); a clean-scan story legitimately has no arch.md and must NOT halt.`
No remaining path where a clean standard-lane story (no arch.md) halts at DevOps step 1. Equivalence holds: arch.md exists ⟺ scan flagged ⟺ Architect dispatched.

### Re-check 2 — dispatch count accurate: RESOLVED
Fully-clean = 4 (QA-Red → Developer → QA-Verify → DevOps); one re-entry = 5; both flag = 6. Stated correctly and consistently:
- SKILL.md:394 header gradient: `dispatches ≤4 agents, not 6; ≤5 when one re-entry fires; 6 when both flag`.
- SKILL.md:396: `from 6 dispatches to 4 (QA-Red → Developer → QA-Verify → DevOps — both §C.3.5 TPV and §C.6 post-flight skipped...)` — count of 4, list of 4.
- architect.md:130: `from 6 dispatches to 4 (QA-Red → Developer → QA-Verify → DevOps...)` — count of 4, list of 4.
Grep for residual flat-5 phrasing (`6→5`, `to 5`, `5 dispatches`) returns NO RESIDUAL FLAT-5 FOUND.

### Re-check 3 — no NEW contradiction introduced: PASS
- dev.md (SKILL.md:411 "Always") and qa.md (:412 "Always, unless lane=fast") stay UNCONDITIONAL; the hard halt at :416 names only dev.md/qa.md; ACTION step-1 exception is scoped to arch.md only. The conditional arch.md does not loosen the other report prerequisites.
- architect.md:228 reconcile (`QA-Verify owns acceptance verification; the Architect ## Mode: Post-Flight owns conditional structural review ... spawned only when the §C.6 pre-gate scan flagged`) is consistent with Mode: Post-Flight (architect.md:128-136) — it scopes Architect post-flight to flagged-path structural review, not acceptance/code-review. The prior "post-flight is QA's job" soft contradiction is gone without contradicting Mode: Post-Flight.

### Re-check 4 — safeguard airtight + verbatim, both files: PASS (survived edit)
Byte-identical at SKILL.md:301 (§C.3.5), SKILL.md:399 (§C.6), architect.md:134 (Mode: Post-Flight). All six keywords (demotion, arch_bounce, surface drift, new-deps, structural issue, exit-2 scan-could-not-run) + "fail toward dispatching, never toward skipping" + "removes the Architect ONLY on a proven-clean scan" present in all three. No reachable RISKY-skip / exit-2-as-clean hole.

### Re-check 5 — scope: PASS
Changes since FAIL confined to: SKILL.md §C.6 count line (:394, :396) + §C.7 arch.md prereqs (:413, :444, :447); architect.md:130 (count) + :228 (reconcile). §C.3.5 conditional-TPV logic, the §C.6 conditional dispatch logic, and the safeguard text are untouched. No adversarial-core, gate-semantics, or rework-counter logic altered. `pre_gate_runner.sh` unchanged (SKILL/agent prose only).

## ISSUES
none

## GATE4_NOTES
Live `/.claude/` re-sync required at Gate 4 — both canonical files are edited, live is stale (drift confirmed, deferred per M3 SDR §2.3). Re-sync order (FLASHCARD 2026-06-01 `#dogfood #scaffold #sync-order`): run `npm run prebuild` FIRST (regenerates the cleargate-cli payload from canonical), THEN `cleargate init` (rewrites live `/.claude/` from the PAYLOAD). `init` before `prebuild` re-syncs from a stale payload (BUG-024 class). Verify regenerated MANIFEST.json sha256 hashes cover both `SKILL.md` and `architect.md` at close. The corrected count + the §C.6↔§C.7 caveat are now in canonical, so the live instance will ship them once re-synced.

## flashcards_flagged (final)
- "2026-06-01 · #skill-md #dispatch-count #post-flight · Fully-clean standard lane = 4 dispatches (QA-Red/Dev/QA-Verify/DevOps); one re-entry = 5; both flag = 6. Never count a skipped TPV/post-flight slot as a dispatch. [SPRINT-33 043-08]"
- "2026-06-01 · #skill-md #merge-prereq #arch-md · Conditional Architect post-flight (§C.6) requires the arch.md caveat in ALL THREE §C.7 spots (table + DevOps context-pack + ACTION halt-rule); arch.md exists ⟺ scan flagged. Missing any one → clean-path merge deadlock. [SPRINT-33 043-08]"

If PASS, the story merges next.
