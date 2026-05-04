role: architect

# CR-048 Architect Post-Flight Review — Orphan Drift Cleanup + Reconciler Hardening

**CR:** CR-048
**Worktree:** `.worktrees/CR-048/`
**Commit SHA:** `39bb099` (manual-commit by orchestrator post Dev-session timeout)
**Lane:** standard (per SDR upgrade — size cap fail, multi-acceptance, multi-subsystem)
**Mode:** post-flight architectural review (read-only, plan-only output)
**Date:** 2026-05-04

---

## 1. Architectural Drift from M1

**M1 §CR-048 spec at `plans/M1.md:300–306`:**
- `reconcileCrossSprintOrphans()` inserted after `reconcileLifecycle()` end (L358), before `reconcileDecomposition()` (L367) — `+60 LOC` est.
- `close_sprint.mjs` "Step 2.6 wiring": _"Existing close pipeline calls `reconcileLifecycle()` at Step 2.6. Add a parallel call to `reconcileCrossSprintOrphans()`; merge drift lists into the same printed report."_

**Actual landing:**
- `reconcileCrossSprintOrphans()` at `cleargate-cli/src/lib/lifecycle-reconcile.ts:399–523` — **+125 LOC of function body (165 LOC including types and JSDoc)**. Position correct (between `reconcileLifecycle` at L232–358 and `reconcileDecomposition` at L532).
- `close_sprint.mjs` integration: **NEW Step 2.6b at L354–407**, structurally parallel to Step 2.6 but a separate try/catch block — NOT a "merge into Step 2.6" as M1 phrased.

**Drift items:**

| # | Drift | M1 said | Actual | Justified? |
|---|---|---|---|---|
| 1 | Integration topology | "Add a parallel call … merge drift lists into the same printed report" (suggesting merged invocation under Step 2.6) | NEW Step 2.6b with its own try/catch, dynamic import, env-bypass branch, v2/v1 split | **YES** — see §4 below. Step 2.6b is a separate, observable lifecycle gate; merging into 2.6 would have hidden orphan failures behind generic "Step 2.6 FAILED" output. The Dev report flags this explicitly ("Out-of-M1 addition") and frames it as equivalent intent — accurate framing. |
| 2 | LOC count | +60 estimate | +165 actual (function + types + comments) | **YES** — M1 LOC was a sketch estimate; actual code includes tolerance for missing `state.json` fields, ID-extraction path that handles `_` separator (called out as nontrivial in code comment at L440–441), pendingMap construction, dedup via `flagged` Set, and full JSDoc. None of this is bloat. |
| 3 | Out-of-scope adds | M1 named only `lifecycle-reconcile.ts` + `close_sprint.mjs` + 8 file moves + 1 NEW test file | Same files (no surface drift) | **N/A** — no surface drift |
| 4 | `clean` counter semantics | M1 spec: `{ drift: OrphanDriftItem[]; clean: number }` (clean = healthy items count) | Code at L517: `clean++` increments **on each drift push** (i.e. `clean` mirrors `drift.length`) | **MINOR DRIFT — non-blocking.** Field is currently dead-weight (caller in close_sprint.mjs only reads `orphanResult.drift.length`); semantic confusion is contained. Flag for next sprint cleanup, do not block CR-048 close. |

**Verdict on drift:** Step 2.6b addition is justified and well-executed. `clean` counter semantic mismatch is a minor cosmetic issue worth a flashcard but not a blocker.

---

## 2. Reconciler Design Soundness

**Active-sprint exclusion (load-bearing safety check) verified:**

- `.active` sentinel read at `lifecycle-reconcile.ts:407–411` via `fs.readFileSync(path.join(sprintRunsRoot, '.active'), 'utf8').trim()`.
- Try/catch tolerates absent sentinel — `activeSprintId = null` fallback (L409–411 catch block).
- Active sprint exclusion applied at L484: `if (activeSprintId && sprintDir === activeSprintId) continue;`.
- Verified by Scenario 2 of Red tests (`lifecycle-reconciler-orphan.red.node.test.ts`): "no false-positive on legitimately Ready items + state Ready in active sprint" → `drift.length === 0`.

**Multi-sprint scope verified:**

- All sub-directories under `sprintRunsRoot` enumerated at L461–475 (filter for directories, exclude hidden).
- For each sprint dir: read `state.json`, extract `stories` map, iterate each entry. Drift-flag if pending-sync ID has a non-terminal status AND the sprint's state.json shows TERMINAL_STATE_JSON (`Done`, `Escalated`, `Parking Lot`).
- Dedup via `flagged` Set at L479 + L500: first sprint that shows Done wins, prevents double-counting if an ID appears in multiple closed sprints' state.json.

**Other design points:**

- Scope limiter for `.script-incidents/` (per SDR §2.5 soft flag 1): satisfied — `pendingFiles` filter at L417–419 excludes hidden files (`!f.startsWith('.')`) and only matches `.endsWith('.md')`. Subdirectory `.script-incidents/` is naturally skipped (`fs.readdirSync` returns the dir name, but the `.endsWith('.md')` filter rejects it).
- ID extraction uses prefix-before-`_`-or-`.` at L442–445 — correct for `CR-031_*.md` filenames; comment at L440–441 explains `\b` word-boundary rationale (`_` is a word char, so the existing `ID_PATTERN` would not fire between digit and underscore).
- Tolerance for missing `sprint_status` field in old state.json files (called out as risk in M1) — function does not require that field at all. It treats every non-active sprint as "closed for orphan-detection purposes," which is the safest reading. **Mitigation matches M1 §Risks #1.**

**Soundness verdict: SOUND.**

---

## 3. Edge Cases

**Q: What if `.active` is missing?**
A: `activeSprintId = null` (catch block at L409–411). Function then scans **every** sprint dir without exclusion. **CONCERN:** If `.active` is missing during a normal close (e.g. test fixture forgot to write it), every active-sprint Ready-item that should be excluded gets flagged as drift. Mitigation: in normal use `.active` is written by `init_sprint.mjs` at sprint start; the only realistic absence is in test fixtures, which the Red tests cover. **NOT BLOCKING** — behavior is conservative-fail-loud (flag too much, never flag too little).

**Q: What if a CR appears in multiple closed sprints' state.json (transferred mid-sprint)?**
A: Dedup via `flagged` Set at L479+L500 ensures first sprint that shows Done wins. Subsequent sprints' entries for the same ID are skipped (L500: `if (flagged.has(id)) continue`). Drift report will cite only the first-encountered sprint as `state_json_sprint` — slight loss of provenance fidelity, but no double-counting, no false-positive multiplication.

**Q: What if state.json has a non-`stories` shape (legacy format)?**
A: L495–496: `const stories = stateJson['stories'] as ... | undefined; if (!stories || typeof stories !== 'object') continue;` — graceful skip. Legacy state.json files just don't contribute to drift detection.

**Q: What if a story entry lacks the `state` field?**
A: L505: `const stateInJson = storyEntry?.state ?? '';` — empty string falls outside TERMINAL_STATE_JSON Set, so no drift flag. Safe.

**Q: What if `sprintRunsRoot` doesn't exist?**
A: L473–474 catch returns empty `sprintDirs` array; main loop is no-op; function returns `{ drift: [], clean: 0 }`. Safe.

**Q: `pending-sync/` doesn't exist?**
A: L420–422 catch sets `pendingFiles = []`; map empty; early return at L456–458. Safe.

**Edge cases verdict: HANDLED.**

---

## 4. Step 2.6b Wiring — Consistency with Other Step 2.x Patterns

Audited Step 2.5 / 2.6 / 2.7 / 2.8 in `close_sprint.mjs` for pattern adherence.

**Pattern fingerprint for a "full" Step 2.x:**
1. Stdout banner: `Step 2.X: <action>...\n`
2. Test-seam env bypass: `CLEARGATE_SKIP_<name>_CHECK=1` skip-branch + skip-banner
3. Try/catch wrapping main work, with stderr warn-only on unexpected failure
4. v2 hard-block branch (`if (isV2) { process.exit(1); }`) + v1 warn-only branch
5. Skip-banner if a precondition is missing (e.g. CLI binary absent)

**Step 2.6b at L354–407:**

| Pattern element | Step 2.6 (existing) | Step 2.6b (new) | Step 2.7 (existing) | Match? |
|---|---|---|---|---|
| Stdout banner | yes (L299) | yes (L359) | yes (L415) | yes |
| Env-skip seam | `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` (L300) | **same** `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` (L360, L406) | `CLEARGATE_SKIP_WORKTREE_CHECK=1` (L417) | **PARTIAL** — Step 2.6b reuses Step 2.6's env name. See note below. |
| Try/catch | yes (L302–351) | yes (L361–404) | yes | yes |
| v2 hard-block + v1 warn | yes (L337–344) | yes (L384–392) | yes (L450+ branch) | yes |
| Skip-banner if precondition missing | yes (L346) | yes (L397, L400) | yes | yes |
| Dynamic import w/ `.catch(() => null)` | yes (L304–306 pattern) | yes (L365–367) | n/a | yes |

**Note on env-bypass naming:** Step 2.6b reuses `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` (the same flag that skips Step 2.6) rather than introducing a new `CLEARGATE_SKIP_ORPHAN_CHECK=1`. This is **intentional and correct** — both 2.6 and 2.6b are "lifecycle reconciliation" semantically; a test that wants to skip lifecycle should skip both. If a future test wants finer-grained control it can be added. The script header comments (L37) document `CLEARGATE_SKIP_LIFECYCLE_CHECK=1 — skip Step 2.6` but **do NOT mention Step 2.6b is also covered** — minor doc-drift to flag for cleanup.

**Wiring verdict: CONSISTENT.** All 5 pattern elements match adjacent Step 2.x blocks. The env-flag reuse is justified by semantic alignment. The header-comment doc-drift is a 1-line cleanup item, non-blocking.

---

## 5. Mirror Parity

**Audited:**

```
diff .cleargate/scripts/close_sprint.mjs cleargate-planning/.cleargate/scripts/close_sprint.mjs
→ exit 0, empty diff
```

**Verdict:** byte-identical. Mirror parity OK. (`lifecycle-reconcile.ts` is cli-internal — no canonical mirror required, distribution via npm pack.)

---

## 6. Sprint-Goal Advancement

**Goal clause (verbatim):** _"lifecycle reconciler catches cross-sprint orphan drift that SPRINT-21's close missed"_

**Delivery against the clause:**
- ✅ **Cross-sprint detection rule shipped** — `reconcileCrossSprintOrphans()` walks every closed sprint's state.json and flags pending-sync items that are Done elsewhere.
- ✅ **The rule will run on close** — Step 2.6b in `close_sprint.mjs` invokes the function during every sprint close (under v2: hard-block on drift; under v1: warn).
- ✅ **The 8-orphan SPRINT-21 cleanup completed mechanically** — all 8 CRs moved to archive with `status: Done`.
- ✅ **Regression prevention** — Red tests cover the exact pattern that bit SPRINT-21 (Done in closed sprint + Ready in pending-sync = drift).

**Goal clause delivered: YES.** SPRINT-23 close on Gate 4 will dogfood Step 2.6b — the first live exercise of this rule.

---

## 7. Verdict

**ARCH: APPROVED**

CR-048 ships clean. The Step 2.6b addition is a structurally appropriate equivalent of M1's "wire into reconcileLifecycle()" — and arguably better (separate observable gate, separate exit-code, dynamic import isolated from Step 2.6 failure modes). All 6 acceptance criteria PASS per QA-Verify; all reconciler edge cases handled with conservative fail-loud semantics. Mirror parity byte-identical. Sprint goal clause delivered.

Two minor non-blocking cleanup items for next sprint:
1. `clean` counter in `ReconcileOrphansResult` increments on drift-push at L517 — should mirror "healthy items" semantics (or be removed if dead).
2. `close_sprint.mjs` header comment at L37 should note `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` also skips Step 2.6b.

---

## Acceptance Signal

```
ARCH: APPROVED
DRIFT_FROM_M1: [Step 2.6b as separate gate (justified — observable lifecycle step), function +165 LOC vs estimated +60 (justified — JSDoc + edge-case tolerance), `clean` counter semantics mismatch (minor non-blocking — flashcard-flagged)]
RECONCILER_SOUND: yes
EDGE_CASES_HANDLED: yes
STEP_2_6B_CONSISTENT: yes
MIRROR_PARITY: ok
GOAL_ADVANCEMENT: clause delivered — cross-sprint orphan drift rule shipped + wired into close pipeline + SPRINT-21's 8 orphans archived as proof
flashcards_flagged:
  - #lifecycle #reconciler #counter-semantics · `clean` field in `ReconcileOrphansResult` increments on drift, not on healthy — caller currently ignores it but field name implies opposite. Future cleanup: rename or remove.
  - #close-sprint #env-flags #doc-drift · `CLEARGATE_SKIP_LIFECYCLE_CHECK=1` skips both Step 2.6 AND Step 2.6b but header comment at close_sprint.mjs:37 only mentions 2.6.
  - #step-2-x #pattern · Step 2.x blocks in close_sprint.mjs share a 5-element fingerprint (banner, env-skip, try/catch, v2/v1 split, precondition skip-banner). Step 2.6b matches verbatim — useful pattern reference for future close-pipeline gates.
```
