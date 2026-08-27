---
bug_id: BUG-047
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Triaged
severity: P1-High
reporter: sandrinio
approved: true
context_source: verified empirically during SPRINT-39 preflight 2026-08-25 — gate check confirmed not to advance last_gate_check on an unchanged verdict; restoreIfOnlyTimestampMoved (sprint.ts:1719-1732) documented as the deliberate guard; no --force flag exists on gate check
created_at: 2026-08-25T21:32:29Z
updated_at: 2026-08-25T21:32:29Z
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
  last_gate_check: 2026-08-25T21:32:29Z
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

# BUG-047: `cleargate stamp` permanently wedges an item's preflight readiness

### Open Questions

- **Question:** Advance `last_gate_check` always, or add `gate check --force`?
- **Recommended:** Compare on **verdict identity plus input mtime**, not on rendered-text equality. The restore guard exists to stop `last_gate_check` thrash from dirtying `main` (a real problem, CR-038). Advancing the stamp only when the item's own `updated_at` has moved past it fixes the deadlock without reintroducing thrash.
- **Human decision:** Unresolved — replace this entire line with the human's decision.

## 1. The Anomaly (Expected vs. Actual)

**Expected:** Editing a work item and stamping it (the documented workflow — CLAUDE.md instructs `cleargate stamp` after edits) leaves it preflight-ready once its gate still passes.

**Actual:** The item is reported `(stale)` by `cleargate sprint preflight` Check 5 **forever**, and no supported command clears it.

Two rules combine into a deadlock:

- **Check 5 staleness rule** (`sprint.ts`): `last_gate_check < updated_at` → `stale` → preflight hard-blocks.
- **Restore guard** (`sprint.ts:1719-1732`, `restoreIfOnlyTimestampMoved`): if a `gate check` changes *only* `last_gate_check`, the file is rewritten back to its original. Deliberate, per CR-038, to stop stamp thrash dirtying `main`.

So once `updated_at` moves past `last_gate_check` — which `cleargate stamp` does by design — the only thing that could close the gap is a new `last_gate_check`, and the guard refuses to write one while the verdict is unchanged. `gate check` has **no** `--force` or `--refresh` flag.

**Recovery today requires either** hand-editing `updated_at` or `last_gate_check` in frontmatter (writing a machine field by hand), **or** deliberately breaking then restoring the item so the verdict flips twice. Both are workarounds, not supported paths.

**Why P1-High:** it blocks sprint kickoff, the blessed edit workflow is the trigger, and the failure message (`stale`) points at nothing actionable — the suggested remedy, `cleargate gate check <file> -v`, is precisely the command that cannot fix it.

## 2. Reproduction Protocol

1. Take any non-terminal work item in `pending-sync/` whose gate passes.
2. `node cleargate-cli/dist/cli.js gate check <file>` — note `last_gate_check: T1`.
3. `node cleargate-cli/dist/cli.js stamp <file>` — `updated_at` becomes `T2 > T1`.
4. `node cleargate-cli/dist/cli.js gate check <file>` again.
   **Observed:** `last_gate_check` is still `T1`. **Expected:** `T2` or later.
5. `node cleargate-cli/dist/cli.js sprint preflight <sprint-id>`.
   **Observed:** the item is listed `(stale)`; Check 5 fails. Repeating steps 4–5 never clears it.

**Edge conditions:** items in `archive/` are skipped by Step 0 and unaffected. Terminal-status items are skipped by Check 5 and unaffected. The deadlock applies only to non-terminal items in `pending-sync/` — i.e. exactly the sprint-scoped set.

## 3. Evidence & Context

Observed live during SPRINT-39 preflight, 2026-08-25:

```
before: last_gate_check: 2026-08-25T20:50:14Z
$ cleargate gate check CR-106_Execution_State_Event_Log.md
✅ cr.ready-to-apply passed (8 criteria)
after:  last_gate_check: 2026-08-25T20:50:14Z      <-- unchanged
updated_at: 2026-08-25T21:29:31Z                   <-- ahead
```

```
✗ Per-item readiness gates: 12/19 items not ready
   - BUG-042 (stale) ... - SPRINT-39 (stale)
   Run: cleargate gate check <file> -v   for each     <-- cannot fix it
```

The guard, verbatim (`sprint.ts:1719-1732`):

```ts
function restoreIfOnlyTimestampMoved(absPath: string, original: string): void {
  const after = fs.readFileSync(absPath, 'utf8');
  if (after === original) return;
  if (withoutGateTimestamp(after) === withoutGateTimestamp(original)) {
    fs.writeFileSync(absPath, original, 'utf8');   // reverts the new stamp
  }
}
```

`cleargate gate check --help` lists only `-v`, `--transition`, `-h` — no force path.

**Workaround applied to unblock SPRINT-39:** `updated_at` was realigned to each item's `last_gate_check` across 38 files. That is a hand-write of a machine field — the class of edit [[CR-108]] and [[CR-109]] exist to eliminate.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / modify:**
- `cleargate-cli/src/commands/sprint.ts` — `restoreIfOnlyTimestampMoved`, `checkPerItemReadinessGates` staleness comparison.
- `cleargate-cli/src/commands/gate.ts` — cache-write path (the same non-advance is observable outside preflight).
- `cleargate-cli/test/` — regression test.

**Do NOT modify:** `stamp-frontmatter.ts` (its behaviour is correct), the readiness predicates, or the criteria definitions.

**Blast radius:** Check 5 gates every sprint kickoff. A fix that advances `last_gate_check` too eagerly reintroduces the CR-038 thrash that dirties `main` and fails Check 4 — the two checks must be satisfied simultaneously.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

1. **The failing test.** gate check → stamp → gate check → assert `last_gate_check >= updated_at`. **Must fail against the current tree.**
2. Preflight Check 5 passes for a stamped-then-re-gated item.
3. **Anti-thrash guard (CR-038 regression).** Two consecutive `gate check` runs with no intervening edit leave the file byte-identical — `main` does not go dirty.
4. An item whose verdict genuinely changes still writes both the new verdict and a new stamp.
5. Archived and terminal-status items remain skipped.

## Prior work

- `cleargate wiki query "gate cache stale preflight stamp"` → **none found**.
- CR-038 — introduced the Step 0 refresh and the restore guard to stop stamp thrash dirtying `main`. This bug is that guard's unintended interaction with CR-027's staleness rule; the fix must preserve CR-038's intent.
- CR-027 — introduced the per-item readiness check that reads the cache.
- [[CR-108]] / [[CR-109]] — machine-field ownership. Related theme: the workaround required hand-writing a machine field, which is what those two exist to prevent.

## Context Source

**context_source:** Reproduced live during SPRINT-39 preflight on 2026-08-25; the non-advance was confirmed by direct before/after observation, the guard read in source, and the absence of a force flag confirmed from `--help`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.

> 🟡: the §Open Questions fix-shape decision is unresolved. Reproduction and evidence are complete; only the remedy is open.
