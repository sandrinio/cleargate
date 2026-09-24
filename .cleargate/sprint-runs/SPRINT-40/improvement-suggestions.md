# Improvement Suggestions — SPRINT-40


## Trends

Trends: 26 closed sprints visible — full analysis deferred to CR-027.

## Skill Creation Candidates

<!-- generated-by: suggest_improvements.mjs --skill-candidates -->

_No candidates detected this sprint._

## FLASHCARD Cleanup Candidates

<!-- generated-by: suggest_improvements.mjs --flashcard-cleanup -->

### CAND-SPRINT-40-F01: A removal assertion can pass at baseline via COLLATERAL dele
<!-- hash:cf1bf5 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-09-02 · #qa #red-test #danger · A removal assertion can pass at baseline via COLLATERAL deletion: `uninstall --remove all` nukes `.cleargate/` wholesale, so "the unregistered file is gone" proved nothing about registration. Also `script` is absent from uninstall's `FRAMEWORK_TIERS` (uninstall.ts:46) — a script-tier row is never removed BY TIER at all. Pick a tier the code actually enumerates, and always run the pre-fix baseline. [BUG-084]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-40-F02: `npm test` in cleargate-cli WRITES INTO THE REAL `.cleargate
<!-- hash:2c4dc4 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-09-02 · #test-harness #danger #release · `npm test` in cleargate-cli WRITES INTO THE REAL `.cleargate/delivery/` tree: a close-pipeline fixture ran without a `CLEARGATE_REPO_ROOT` override and back-synced 10 live work items, stamping `sprint_cleargate_id: "SPRINT-01"` and copying the template placeholder `EPIC-NNN | STORY-NNN-NN` into `parent_cleargate_id`. It recurs on every run, including the one inside `prepublishOnly`. Diff and revert the delivery tree after any test run; never `git add -A` near a release. [v0.26.0 release]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-40-F03: A canonical-only fix leaves the meta-repo's LIVE `.cleargate
<!-- hash:8dbc7a -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-09-02 · #dogfood-split #release #danger · A canonical-only fix leaves the meta-repo's LIVE `.cleargate/scripts/` stale, and three mirror-parity locks (STORY-066-02 S5, CR-064 S3, CR-063 S14) go red against it — which blocks `npm publish` outright, since `prepublishOnly` gates on `npm test`. The parity locks are the dogfood-split rule's enforcement arm: sync live as part of the fix commit, not at release time. [v0.26.0 release]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

### CAND-SPRINT-40-F04: A behaviour fix that deliberately changes a contract leaves 
<!-- hash:303e08 -->

**Category:** resolved
**Reason:** keyword found in a prior §6 Tooling section
**Original entry:** `2026-09-02 · #test-harness #qa · A behaviour fix that deliberately changes a contract leaves the OLD contract's tests red, and they are not flakes — BUG-069 (no inference) and BUG-083 (2.6c archives) each left one. Invert the assertion where the file is editable; where it is a sealed `.red.` file, `{ skip: '<reason>' }` it and re-establish the coverage in a new sibling test. Budget for this in the same sprint as the fix. [v0.26.0 release]`
**Suggested action:** approve to remove via `cleargate flashcard prune` (run /improve)

---

## Trends

Trends: 26 closed sprints visible — full analysis deferred to CR-027.
