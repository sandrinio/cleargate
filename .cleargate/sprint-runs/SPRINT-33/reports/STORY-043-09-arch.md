# STORY-043-09 Architect Post-Flight Review

role: architect
Mode: POST-FLIGHT REVIEW (cross-repo, read-only, adversarial)
Story: STORY-043-09 — CLI surface hygiene
Date: 2026-06-01
cli branch: story/STORY-043-09 @ 0140b3a (accb65a impl + 3b0ba43 red-correction + 0140b3a comment-removal)
outer (uncommitted): `.cleargate/scripts/write_dispatch.sh` + canonical mirror + canonical SKILL.md

---

ARCH-POSTFLIGHT: FAIL

ISSUES:
- **(FAIL — write_dispatch.sh fallback false-skip, highest-priority adversarial check 1a)** The
  new guard (`.cleargate/scripts/write_dispatch.sh:86-97`) early-exits no-op when it finds *any*
  unconsumed `pre-tool-use-task.sh` auto-marker whose `session_id == CLAUDE_SESSION_ID`. It does
  **not** correlate the marker to the *current* spawn — no PID, no `spawned_at` freshness, no
  per-spawn key. The orchestrator's `CLAUDE_SESSION_ID` is **stable for the whole session**, and
  pre-tool-use-task.sh stamps *every* auto-marker with that same `session_id`
  (`pre-tool-use-task.sh:98-102`). So the guard's real predicate is: "does ANY leftover auto-marker
  from this session exist?" — which is the wrong question.

  **Confirmed empirically** (false-skip reproduction): seeded one prior-spawn auto-marker
  (`work_item_id=STORY-AAA-01`, `writer=pre-tool-use-task.sh@…`, same session_id), then invoked
  `write_dispatch.sh CR-099 architect` for a *different* current spawn → exit 0, **no marker
  written for CR-099**. Result: `>>> NO MARKER for CR-099 — FALSE-SKIP CONFIRMED <<<`.

  **Why this is realizable, not theoretical:** SKILL.md invokes `write_dispatch.sh` as the
  per-dispatch fallback before *every* `Agent` spawn (SKILL.md:182, 262, 307, 329, 362, 428, 601 —
  architect/qa/developer/devops/reporter). The fallback is specifically for spawns the auto-hook
  cannot attribute — e.g. an Architect milestone dispatch keyed `M<N>` (SKILL.md:182), which the
  auto-hook regex (`pre-tool-use-task.sh:82` — STORY|BUG|EPIC|CR|PROPOSAL|HOTFIX only) does **not**
  match, so the auto-hook writes nothing for the current spawn and the manual call is the *sole*
  attribution path. If a *prior* spawn's auto-marker is still in the dir when that fallback runs —
  because its SubagentStop has not yet consumed+deleted it (token-ledger.sh:585-587), or a
  parallel wave left siblings, or token-ledger.sh hit its `mv` race / `MATCH_COUNT>1` branch
  (token-ledger.sh:172-175, 204) and left a marker — the guard false-skips and the **current
  fallback spawn gets zero marker**. Token-ledger then drops to the transcript-grep heuristic
  (token-ledger.sh:282-399), the exact unreliability CR-026 was built to eliminate (BUG-024 §3.1
  Defect 3). Per the dispatch brief this is *worse than a duplicate*: a duplicate is a tuple-match
  / newest-file resolvable nuisance; a missing marker silently mis-attributes.

  Note: the code comment claims "Fail toward writing when unsure (a duplicate is harmless; a
  missing marker breaks attribution)" — but the implementation does the **opposite**: it fails
  toward *skipping* on the mere presence of a stale same-session marker, producing the
  missing-marker outcome the comment says it avoids. The "exactly one marker per pending spawn"
  invariant is **not** preserved across the auto-path + fallback-path combination: a stale
  unconsumed auto-marker makes the fallback contribute zero, so the current spawn ends with a
  marker count attributable to it of 0.

  **Required fix direction (for re-spec):** the guard must match the *current spawn*, not the
  session. Options: (a) match on `work_item_id == $1 AND agent_type == $2 AND writer prefix` (the
  auto-hook already embeds work_item_id) — skip only when a marker for THIS work-item+agent exists;
  or (b) add a freshness bound (`spawned_at` within N seconds of now) so stale prior-spawn markers
  cannot trigger a skip; or (c) drop the guard entirely and rely on token-ledger's existing
  tuple-match + consume-and-delete (a duplicate auto+manual marker for the same work-item is
  already deduped by the SubagentStop consumer, so the skip optimization buys little against the
  attribution risk it introduces). Option (a) is the minimal correct change.

- Checks 1b and 1c are **subsumed** by the above: (1b) when the auto-hook did not run / wrote no
  marker for the current spawn but a *different* session marker is absent, the guard correctly
  falls through and writes — that path is fine; the failure is specifically the *stale same-session*
  marker. (1c) the one-marker invariant is broken as described.

GATE4_NOTES:
- **dist rebuild required (cli repo):** the 8 `hidden: true` flags + orphan delete + stub-label
  removal live in `cleargate-cli/src/cli.ts`; `dist/cli.js` must be refreshed via `npm run build`
  in `cleargate-cli/` before publish — same stale-dist class as FLASHCARD 043-07. tsx `--test`
  stays green on a stale dist; verify `dist/cli.js` mtime ≥ `src/cli.ts` mtime at Gate 4.
- **live SKILL.md re-sync required:** canonical `cleargate-planning/.claude/skills/sprint-execution/SKILL.md`
  == payload (prebuild-synced, byte-identical confirmed), but live `/.claude/skills/sprint-execution/SKILL.md`
  DIFFERS (expected Gate-4-deferred). Re-sync live via `cleargate init` (after `npm run prebuild`)
  or hand-port — but only AFTER the write_dispatch.sh guard is corrected, since the SKILL.md prose
  ("if a same-session auto-marker … already exists … it exits 0 without writing a duplicate")
  documents the buggy session-scoped semantics. The prose and the fix must land together.
- **outer write_dispatch.sh uncommitted** on `main` working tree (×2: `.cleargate/scripts/` +
  `cleargate-planning/.cleargate/scripts/`). Both byte-identical (confirmed). Do not commit the
  guard as-is — it carries the false-skip.

flashcards_flagged:
  - "2026-06-01 · #dispatch #marker #write_dispatch · write_dispatch.sh fallback guard (043-09) matches ANY unconsumed same-session pre-tool-use-task.sh marker — NOT the current spawn; a stale prior-spawn auto-marker (Stop hook not yet fired / parallel-wave / mv-race leftover) false-skips, leaving the CURRENT manual-fallback spawn with NO marker. session_id is stable per orchestrator session so it cannot disambiguate spawns. [SPRINT-33 043-09 postflight FAIL]"

---

## Per-check verdict

### 1. write_dispatch.sh fallback correctness (adversarial) — **FAIL**
See ISSUES above. False-skip on stale same-session auto-marker confirmed by reproduction. Guard is
session-scoped, not spawn-scoped; comment's stated fail-safe direction is inverted in code.

### 2. hidden:true correctness — **PASS**
All 8 plumbing commands carry `{ hidden: true }` as the Commander **2nd arg** to `.command(name, opts)`
(cli.ts:168, 187, 284, 292, 352, 429, 442, 454) — correct Commander usage, not a mis-placed 3rd arg.
No `.command(name, desc, {hidden})` 3-arg misuse exists (grep returned 0). Every hidden command
retains its `.description()` + `.action()` handler immediately after (verified inline; QA Scenario B
8/8 confirms callability). No handler lost. The 3b0ba43 red-correction anchors detection at
`.command(` (comment-independent) and 0140b3a removed the test-appeasement comments — `grep -c
"hidden plumbing:"` → 0. Clean.

### 3. Orphan delete safety — **PASS**
`cleargate-cli/src/lib/triage-classifier.ts` + `cleargate-cli/test/lib/triage-classifier.red.node.test.ts`
both gone (working tree confirms `No such file`). Dangling-ref grep across src/test/canonical/knowledge
returns only two **benign** hits: (a) `cli-surface-hygiene.red.node.test.ts` — Scenario D asserts the
file does NOT exist (correct negative reference); (b) `mid-sprint-triage-rubric.md` — different doc,
substring collision on "triage", not a code ref. §C.10 of SKILL.md now points at
`.cleargate/knowledge/mid-sprint-triage-rubric.md`, which **exists** in all 4 copies (8357 bytes;
canonical + payload + dist + outer) — coherent, no new dangling ref. The 4 zero-caller libs
(frontmatter-merge, ledger, pricing, script-incident) are correctly **retained** (all present;
test-referenced, not dead code).

### 4. SKILL.md scope (3rd-in-chain after 08) — **PASS**
09's edits (dispatch-marker fallback prose at SKILL.md:82-99 + §C.10 at 511-513) do **not** clobber
08's conditional-Architect content: §C.3.5 TPV Gate (288), §C.6 Architect Pass w/ clean-scan skip
(385, 401), §C.7 Story Merge + arch.md conditional-presence rules (406, 418, 453, 475) all intact and
coherent. Registration constraint + §C.7 DevOps Escape Hatch present. No regression to 08.
(Caveat: the fallback prose at :99 documents the buggy session-scoped semantics — must be corrected
alongside the write_dispatch.sh fix; see GATE4_NOTES.)

### 5. Mirror integrity — **PASS (with the script-content caveat from check 1)**
- write_dispatch.sh ×2 (`.cleargate/scripts/` vs `cleargate-planning/.cleargate/scripts/`): BYTE-IDENTICAL.
- canonical SKILL.md vs payload (`cleargate-cli/templates/...`): BYTE-IDENTICAL (prebuild-synced).
- live SKILL.md DIFFERS from canonical — expected Gate-4-deferred re-sync.
Mirrors are in sync; the content they mirror carries the check-1 defect.

---

## Disposition
Route back to Developer (re-launch) with the check-1 fix direction: make the guard spawn-scoped
(match `work_item_id` + `agent_type`, or add `spawned_at` freshness), update the SKILL.md prose to
match, re-prebuild + re-sync live. The QA-Red suite (`write-dispatch-fallback.red.node.test.ts`)
asserts only the *single-prior-marker-same-spawn* and *no-prior-marker* cases — it does NOT cover the
stale-prior-spawn / different-work-item case, so it passes against the buggy guard. The fix should
add a Red scenario: "auto-marker for a DIFFERENT work_item_id present → write_dispatch.sh STILL
writes a marker for the current work_item_id". Not a QA-Red bounce (the existing tests are correct as
far as they go); a coverage-gap to close with the fix.

---

## FINAL-CONFIRM (re-verify after fix)

role: architect
Mode: POST-FLIGHT RE-VERIFY (read-only, sandbox-only)
Date: 2026-06-01
State re-verified: `.cleargate/scripts/write_dispatch.sh` guard now spawn-scoped (work_item_id==$1 AND agent_type==$2 AND session_id==CLAUDE_SESSION_ID AND writer prefix `pre-tool-use-task.sh*`). Outer working-tree change vs HEAD = +28 lines (guard block only). cli.ts untouched (empty diff vs HEAD).

ARCH-POSTFLIGHT: PASS

ISSUES: none

Detail (each dispatch confirm item):

1. **False-skip closed (the original FAIL).** `write-dispatch-fallback.red.node.test.ts` → 16/16 pass (Scenario 3 stale-DIFFERENT-work-item + Scenario 4 same-work-item-DIFFERENT-agent both green). Re-derived in sandbox: seeded a `pre-tool-use-task.sh` auto-marker for `STORY-X/architect` (same session), invoked `write_dispatch.sh CR-099 architect` → marker WRITTEN (count 1→2). The session-only predicate is gone; the guard now skips only on the exact (work_item, agent, session, auto-writer) tuple. The exact reproduction that produced ">>> NO MARKER for CR-099 — FALSE-SKIP CONFIRMED <<<" now writes.

2. **No NEW false-skip / attribution-loss edge.**
   - (a) Re-dispatch of the SAME work_item+agent with an UNCONSUMED prior auto-marker → SKIP (sandbox: STORY-X/architect, count 1→1). This is **acceptable, not attribution loss**: the retained marker carries the same (work_item_id, agent_type, session_id) tuple, so token-ledger.sh attributes the second spawn's tokens to the correct (work_item, agent) bucket — the ledger keys on the tuple, not per-spawn. Only spawn-level granularity collapses (two same-story architect re-entries → one marker); the attribution total is correct. This is the legit-dedup branch operating on a stale-but-tuple-matching marker.
   - (b) Fail-toward-writing on malformed/missing-field markers — confirmed WRITE (safe) in all three sub-cases: non-JSON marker (jq parse fails → `2>/dev/null || true` → empty fields → no tuple match → WRITE, count→2); empty `{}` (empty fields never match real ids → WRITE); marker written by `write_dispatch.sh` itself (writer prefix ≠ `pre-tool-use-task.sh` → WRITE, guard de-dups only AUTO markers). Cross-session same-tuple marker (session_id mismatch) also WRITES. Every uncertainty path errs toward writing.

3. **No NEW duplicate regression.** True same-spawn auto-marker (work_item_id=STORY-043-09 + agent_type=architect + session_id match + `pre-tool-use-task.sh` writer) → SKIP no-op (sandbox count 1→1). Legit dedup intact; the guard still suppresses the genuine auto+manual duplicate it was built to suppress.

4. **Mirror integrity.** All three copies BYTE-IDENTICAL — sha256 `c103ff5e33263c72de81ba80c23857265f89f316f963025aebdf9ffa5ad1b361` for `.cleargate/scripts/write_dispatch.sh`, `cleargate-planning/.cleargate/scripts/write_dispatch.sh`, and `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/write_dispatch.sh` (prebuild-synced). MANIFEST.json updated for exactly two entries: write_dispatch.sh (new sha c103ff5e…) + SKILL.md (new sha 3d820547…) — no other payload drift.

5. **Scope clean.** Only two surfaces changed vs HEAD: (a) write_dispatch.sh guard block (+28 lines, no edits elsewhere in the file); (b) SKILL.md prose (dispatch-marker section reworded "write before every spawn" → "written automatically… fallback only" + idempotency note; plus adjacent triage-classifier prose cleanup replacing a stale `classify()`/`triage-classifier.ts` import reference with the rubric-doc — both documentation, no executable logic). cli.ts hidden:true flags + orphan delete (triage-classifier.ts/.test.ts) UNTOUCHED (empty diff vs HEAD; deletions already landed pre-fix on story/STORY-043-09).

GATE4_NOTES:
- **write_dispatch.sh is TRACKED** under `.cleargate/scripts/` — it goes live on **merge**, not via a Gate-4 manual re-sync. The live working-tree copy already == the fix. No `cleargate init` needed for the script.
- **dist rebuild still required (cli repo):** the 8 `hidden:true` flags + orphan delete live in `cleargate-cli/src/cli.ts`; `dist/cli.js` must be refreshed via `npm run build` in `cleargate-cli/` before publish (tsx `--test` stays green on stale dist — FLASHCARD 043-07). Verify `dist/cli.js` mtime ≥ `src/cli.ts` mtime at Gate 4. Unchanged from the FAIL report; not a 043-09 regression.
- **live SKILL.md re-sync still required (Gate-4-deferred):** canonical == payload (byte-identical confirmed), but live `/.claude/skills/sprint-execution/SKILL.md` DIFFERS (gitignored, per-machine). Re-sync via `cleargate init` (after `npm run prebuild`) or hand-port at Gate 4. The prose now documents the CORRECTED spawn-scoped semantics, so prose + fix land together — the FAIL-report concern ("prose documents buggy session-scoped semantics") is resolved.

flashcards_flagged:
  - "2026-06-01 · #dispatch #marker #write_dispatch · write_dispatch.sh guard FIXED (043-09 re-verify): skip now requires exact tuple work_item_id==$1 AND agent_type==$2 AND session_id==CLAUDE_SESSION_ID AND writer prefix pre-tool-use-task.sh*; else WRITE. Fails toward writing on jq-parse fail / malformed / empty / non-auto-writer marker. Same work_item+agent re-dispatch still de-dups (tuple-keyed ledger attribution preserved). [SPRINT-33 043-09 PASS]"

## Disposition
PASS. The false-skip that caused the FAIL is closed; no new false-skip or attribution-loss edge introduced; legit dedup intact; mirrors byte-identical; scope confined to guard logic + SKILL prose. Story merges next. The FAIL-report's required fix direction (Option (a): match work_item_id + agent_type) was implemented exactly, and the coverage-gap Red scenario it asked for (different-work-item must still write) is present as Scenario 3 (+ Scenario 4 for different-agent).
