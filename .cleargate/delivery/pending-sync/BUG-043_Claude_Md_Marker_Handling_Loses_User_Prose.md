---
bug_id: BUG-043
parent_ref: EPIC-054
parent_cleargate_id: "EPIC-054"
sprint_cleargate_id: "SPRINT-39"
carry_over: false
area: planning-layer
status: Draft
severity: P1-High
reporter: sandrinio
approved: true
context_source: "Discovered 2026-08-25 while answering how cleargate rewrites CLAUDE.md. Both defects verified by executing the shipped functions directly (tsx against cleargate-cli/src), not by code reading alone; raw transcripts in §3. Grounding: cleargate-cli/src/init/inject-claude-md.ts:18 (BLOCK_REGEX), :44-52 (injectClaudeMd), cleargate-cli/src/lib/claude-md-surgery.ts:7 (BLOCK_REGEX), :22-33 (writeBlock), cleargate-cli/src/commands/upgrade.ts:364-378 (take-theirs branch)."
created_at: 2026-08-25T13:30:00Z
updated_at: 2026-08-25T20:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: dff83bd3-dirty
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
  last_gate_check: 2026-08-25T20:00:00Z
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

# BUG-043: CLAUDE.md marker handling loses user prose — two ways

### Open Questions

- **Question:** Should `upgrade` adopt `init`'s append-on-missing-marker behaviour, or refuse and tell the user to run `init`?
- **Recommended:** Refuse with a named error. `init` is the install path and appending is correct there; `upgrade` is a merge path where a missing marker means the file is not in a state the merge understands. Silently rewriting the whole file is the one option that must go.
- **Human decision:** **Refuse with a named error** (2026-08-26). `upgrade` halts on that file, states that no `<!-- CLEARGATE:START -->` marker was present, and directs the user to `cleargate init`. Other files in the run continue; the run does not fail. Both routes to the current full overwrite — the `ourBlock === null` branch and the `catch` — are replaced by this refusal. No code path may substitute the payload for a user's file.

- **Question:** Should the greedy regex be narrowed, or should the markers be made harder to collide with?
- **Recommended:** Anchor the match to markers that sit alone on their own line (`^<!-- CLEARGATE:END -->$`). Prose that quotes the marker inline — which the block's own text does, deliberately — stops matching, so greedy becomes safe rather than merely tolerated.
- **Human decision:** **Anchor the markers to their own line** (2026-08-26). `BLOCK_REGEX` becomes `/^<!-- CLEARGATE:START -->$[\s\S]*^<!-- CLEARGATE:END -->$/m` in both modules. Greedy is retained — the block's own body quotes both markers inline and must keep doing so — but an inline quote is no longer a candidate match, so prose may reference the markers freely.

  **Precondition verified 2026-08-26:** the real markers are alone on their lines in both trees (root `CLAUDE.md` L129/L186, canonical L7/L64 — nothing between the marker and end-of-line), and both files are LF-only. The inline quotes (root L178, canonical L56) carry prose before them and correctly stop matching.

  **New failure mode this introduces, and it must be handled:** `$` under the `m` flag does not match before a `\r`, so a CRLF-converted `CLAUDE.md` — or a marker line with trailing whitespace — silently stops matching and the block is treated as absent. Combined with the Q1 decision that is a refusal rather than data loss, which is the safe direction, but the fix must normalise line endings and trim trailing whitespace on the marker line before matching, and the test suite must cover a CRLF fixture.

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** Rewriting the ClearGate block in a target repo's `CLAUDE.md` should never destroy content the user wrote. `init` and `upgrade` should agree on what to do when the markers are absent.

**Actual Behavior:** Two independent defects, both silent, both losing user content.

**Defect A — `init` and `upgrade` do opposite things when markers are missing.**
`init` (`inject-claude-md.ts:50`) appends the block and preserves everything. `upgrade` (`upgrade.ts:364-378`) reaches `readBlock(ours) === null`, falls into the branch commented *"No block in ours — full overwrite"*, and sets `mergedContent = theirs` — **the user's entire CLAUDE.md is replaced by the payload.** The surrounding `catch` does the same thing, and `writeBlock` throws precisely on a missing marker, so both routes to the failure converge on full overwrite. Identical input, opposite outcome, and the destructive one is the merge path whose entire stated purpose is *"leaving user prose intact"* (`upgrade.ts:12-13`).

**Defect B — the greedy regex eats prose between a quoted END marker and the real one.**
`BLOCK_REGEX` matches from the first `CLEARGATE:START` to the **last** `CLEARGATE:END`. That is deliberate: the block's own body quotes both markers inline (`CLAUDE.md:178`), and a non-greedy match would truncate the block there. The unhandled consequence is that any `<!-- CLEARGATE:END -->` a user writes *below* the block extends the match, so everything between the real END and that later mention is consumed on the next rewrite. The line is not merely deleted — it is left mangled, with the tail fragment fused onto the marker.

Loss is bounded: only text between the real END and the last stray END is affected, and content after the final END survives. It is silent in both cases — no warning, no diff, no non-zero exit.

## 2. Reproduction Protocol

1. Create a `CLAUDE.md` containing user prose and a well-formed ClearGate block.
2. Confirm the normal path is safe: run `injectClaudeMd(existing, newBlock)` and observe prose above and below the block is preserved.
3. **Defect A:** take a `CLAUDE.md` with user prose and **no** markers. Call `injectClaudeMd` — observe the block is appended and prose survives.
4. Call `readBlock` on the same content — observe it returns `null`. Call `writeBlock` — observe it throws `CLAUDE.md is missing <!-- CLEARGATE:START --> marker`.
5. Trace `upgrade.ts:364-378` with those two results: `ourBlock === null` and `theirBlock !== null` selects `mergedContent = theirs`, and the `catch` selects the same. Both discard the user's file.
6. **Defect B:** build a `CLAUDE.md` whose body is a valid block, followed by a line quoting `<!-- CLEARGATE:END -->` in prose, followed by more user text.
7. Call `injectClaudeMd` with a replacement block.
8. Observe the prose line preceding the quoted marker is gone and the remainder is fused onto the injected block's END marker.

## 3. Evidence & Context

Probes run 2026-08-25 against `cleargate-cli/src` via `tsx`. Raw output:

```
--- 1. normal update: block replaced in place, user prose kept ---
"# My Project\n\nMy own rules.\n\n<!-- CLEARGATE:START -->\nNEW SCAFFOLD v2\n<!-- CLEARGATE:END -->\n\n## My footer\n"

--- 2. NO markers + init  → appends, user prose PRESERVED ---
"# My Project\n\nMy own rules.\n\n<!-- CLEARGATE:START -->\nNEW SCAFFOLD v2\n<!-- CLEARGATE:END -->\n"

--- 3. NO markers + upgrade surgery → readBlock returns null ---
readBlock(noMarkers) = null
writeBlock THREW: CLAUDE.md is missing <!-- CLEARGATE:START --> marker

--- 4. GREEDY hazard: user prose between a stray END mention and the real END ---
input:  "# Proj\n\n[START]\nscaffold\n[END]\n\nI documented the [END] marker here.\n\nIMPORTANT USER PROSE\n"
output: "# Proj\n\n[START]\nNEW SCAFFOLD v2\n[END] marker here.\n\nIMPORTANT USER PROSE\n"
```

In probe 4 the text `I documented the ` is destroyed and ` marker here.` is fused onto the END marker. `IMPORTANT USER PROSE` survives because it follows the final END.

The destructive branch in `upgrade.ts`:

```
if (ourBlock !== null && theirBlock !== null) {
  mergedContent = writeBlock(ours, theirBlock);
} else if (theirBlock !== null) {
  // No block in ours — full overwrite
  mergedContent = theirs;
}
} catch {
  // Surgery failed — fall back to full overwrite
  mergedContent = theirs;
}
```

Preconditions for Defect A: the file must be classified as drifted and the operator must choose take-theirs. It is not every upgrade — but nothing warns that the choice is destructive rather than surgical.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/src/init/inject-claude-md.ts` — `BLOCK_REGEX` (:18) and `injectClaudeMd` (:41).
- `cleargate-cli/src/lib/claude-md-surgery.ts` — `BLOCK_REGEX` (:7), `readBlock`, `writeBlock`, `removeBlock`.
- `cleargate-cli/src/commands/upgrade.ts` — the take-theirs branch (:361-378).
- New `*.node.test.ts` under `cleargate-cli/test/`.

**§4 AMENDMENT (orchestrator, 2026-08-28 — M2 post-flight audit).** Three sites were missing.
This sprint is **5-for-5 on surface declarations being wrong or incomplete**; treat the list
above as a starting point, not a boundary.

| # | Site | Why it is not optional |
|---|---|---|
| 1 | `cleargate-cli/src/lib/drift-check.ts` | Imports `readBlock` (`:16`) and calls it at `:111` and `:118`. The original §4 explicitly cleared `uninstall.ts` as inheriting-for-free **and missed the one consumer whose behaviour actually shifts under anchoring**: a CRLF or trailing-whitespace marker makes `readBlock` return null, and `doctor --drift` then reports `claude-md-block-mismatch`. Asymmetric omission — the file that needed clearing was cleared, the file that needed changing was not named. |
| 2 | `cleargate-cli/test/lib/claude-md-surgery.node.test.ts` | Owns today's behaviour, including the greedy prose-mention case at `:126`. **`:211-218` hardcodes an absolute path to this machine** (`/Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md`) — verified. Any fix must keep it green, and it is worth noting the portability defect separately. |
| 3 | `cleargate-cli/test/commands/init.node.test.ts:263-278` | Carries **its own copy** of the old greedy regex. A fix that changes only `src/` leaves a second, divergent grammar asserting the old behaviour — the BUG-041 shape this bug's own §4 already warns about. |

**Measured, and this is the load-bearing part for the Developer:** anchoring breaks **zero** of
these. Both regexes were patched to `/^…$/m` in an out-of-tree mirror and the six default-tier
files that touch `CLAUDE.md` ran **90 tests / 88 pass / 0 fail / 2 skipped** *both before and
after*. **Green-to-green is not evidence of inertness** — Defect A is untested entirely: no
`test/commands/upgrade*` file mentions `CLAUDE.md` at all. The new test this bug requires is
what will first exercise it.

**Explicitly NOT in scope:**
- Relocating the block to the top of the file — that is a deliberate behaviour change, owned by CR-105.
- `cleargate-cli/src/commands/uninstall.ts` — it calls `removeBlock` and inherits the regex fix for free; no separate change.
- The two `BLOCK_REGEX` definitions are duplicated across the two modules. Unifying them is desirable and is the BUG-041 pattern, but is deferred so this fix stays minimal; note it for a follow-up CR.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

The locking test must cover both defects and fail before the fix:

- **Defect A:** given content with no markers, assert `upgrade`'s CLAUDE.md path does **not** produce output equal to `theirs`. It must either preserve the user's content or raise a named error — never silently substitute the payload.
- **Defect B:** given the probe-4 input, assert the output still contains the exact string `I documented the ` and that no user line is fused onto a marker.
- **Regression:** the normal path (probe 1) must remain byte-identical to today's behaviour, and `uninstall`'s `removeBlock` must still strip a well-formed block cleanly.

---

## Prior work

- [[EPIC-054]] — parent epic. This Bug is scoped into SPRINT-39 alongside it because both touch scaffold-integrity surfaces.
- [[CR-105]] — moves the block to the top of `CLAUDE.md` for prefix-cache stability. It depends on this Bug: relocation means remove-then-prepend, which runs the greedy regex over the file deliberately, so Defect B must be fixed first or the relocation makes the data loss more likely rather than less.
- [[BUG-042]] — same sprint, same class: a silent, green-looking failure in a correctness surface.
- [[BUG-041]] — the duplicated-parser precedent. Two `BLOCK_REGEX` constants in two modules is the same shape; noted, deferred.
- No prior item reports CLAUDE.md content loss. `cleargate wiki query` returned no matches for CLAUDE.md marker handling.

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** Discovered 2026-08-25 answering a direct question about how `cleargate` rewrites `CLAUDE.md`. Both defects verified by executing the shipped functions rather than by reading them; transcripts in §3. Grounded in `cleargate-cli/src/init/inject-claude-md.ts`, `cleargate-cli/src/lib/claude-md-surgery.ts`, and `cleargate-cli/src/commands/upgrade.ts`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.

**Signed off 2026-08-26.** All five criteria met literally, and both Open Questions carry recorded human decisions: `upgrade` refuses with a named error on a missing marker, and the markers are anchored to their own line. The refusal decision also settles the interaction with [[CR-105]] — since `upgrade` will not act on a file with no block, CR-105's relocation applies only where the markers are present.
