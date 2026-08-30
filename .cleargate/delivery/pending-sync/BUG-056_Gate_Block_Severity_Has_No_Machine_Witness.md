---
bug_id: BUG-056
parent_ref: EPIC-043
parent_cleargate_id: "EPIC-043"
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: architect
approved: false
area: planning-layer
context_source: verified codebase grounding — discovered by the STORY-054-02 TPV pass (SPRINT-39 wave 4) and blast-radius-measured by the STORY-054-02 Architect post-flight; no prior approval, filed for triage
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 3a114e9c-dirty
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# BUG-056: Every gate block's declared severity can be flipped with the whole suite still green

### Open Questions

- **Question:** Fixture-pinned severity (one row per block, like `EXPECTED_HEADINGS`) or a doctrine-derived rule ("`proposal`/`initiative`/`spike` are advisory, all others enforcing")?
- **Recommended:** Fixture. A derived rule re-encodes the doctrine in a second place and drifts the same way the thing it guards does; a per-block fixture row makes any change to a severity a visible, deliberate two-file edit — exactly the shape [[STORY-054-05]] already proved out for `section(N)`.
- **Human decision:** {populated during Brief review}

- **Question:** Should the pin live in the existing `gate-section-index-pinning.node.test.ts` or a new file?
- **Recommended:** The existing file. It already parses every fenced block out of the real `readiness-gates.md` (`loadGateBlocksFromText`, `:144-167`) and already narrows on `'severity' in block` — the parse work is done and reused, and a new file would be a second reader of the same document.
- **Human decision:** {populated during Brief review}

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** `severity: enforcing` on a gate block in `.cleargate/knowledge/readiness-gates.md` is a load-bearing declaration — it is the difference between `cleargate gate check` exiting 1 and exiting 0. Changing it should require a deliberate, visible edit that a test observes.

**Actual Behavior:** No test anywhere reads the **value** of `severity` for any block in the real registry. Editing `severity: enforcing` to `severity: advisory` on the `story.ready-for-execution` block — the single hardest gate in ClearGate — leaves the entire 2516-test `cleargate-cli` suite green.

**Precisely what is and is not covered.** The distinction matters, because "severity is untested" is the wrong summary and would send a fixer to write a test that already exists:

| Thing | Witnessed? | Where |
|---|---|---|
| The severity **routing mechanism** (enforcing → `exit(1)` + `❌`; advisory → exit 0 + `⚠ … (advisory)`) | **yes** | `cleargate-cli/test/commands/gate-unit.node.test.ts:410` and `:448` — but against a **synthetic inline registry** (`GATES_DOC`, `:142-215`), never the real document |
| The **presence** of a `severity` key on every real block | **yes** | `test/lib/readiness-predicates.node.test.ts:723` (`assert.ok('severity' in block)`) and `test/docs/gate-section-index-pinning.node.test.ts:161` (a type-narrowing guard) |
| The **value** of `severity` on any real block | **no** | nowhere |

So the machinery is proven to respond to severity, and the registry is proven to declare *a* severity — and nothing connects the two.

**Why the usual backstop misses it.** `gate.ts` writes `cached_gate_result` (`src/commands/gate.ts:305`) **before** the severity exit routing (`:331`). Any test that asserts on `cached_gate_result.pass` / `.failing_criteria` — which is how nearly every gate test is written, including all four spike scenarios added by STORY-054-02 — sees byte-identical output whichever severity the block carries. Severity is observable only through the exit code and the stdout glyph, and no test reads those against the real registry.

**Blast radius, measured 2026-08-27 at `3a114e9c`.** `.cleargate/knowledge/readiness-gates.md` holds **11** gate blocks. **7 are `enforcing`**, **4 are `advisory`**. All 11 are unpinned:

| Block | Line | Declared severity | Value pinned? |
|---|---|---|---|
| `proposal.ready-for-decomposition` | :75 | advisory | no |
| `epic.ready-for-decomposition` | :88 | enforcing | no |
| `epic.ready-for-coding` | :121 | enforcing | no |
| `story.ready-for-execution` | :140 | enforcing | no |
| `cr.ready-to-apply` | :169 | enforcing | no |
| `bug.ready-for-fix` | :192 | enforcing | no |
| `sprint.ready-for-execution` | :211 | enforcing | no |
| `initiative.ready-for-decomposition` | :224 | advisory | no |
| `hotfix.ready-for-merge` | :237 | enforcing | no |
| `spike.ready-to-investigate` | :254 | advisory | no |
| `spike.ready-to-conclude` | :269 | advisory | no |

**All eleven are correct as declared today.** Nothing is currently mis-set. This is a latent coverage hole, not a live mis-declaration — which is why it is P2 and not P1. The severe direction is `enforcing → advisory`: it silently disarms a hard gate, and the symptom is the absence of a failure, so it would be discovered by a bad item shipping rather than by a red test.

**Second-order consequence, for the doctrine writers.** `.claude/hooks/stamp-and-gate.sh` re-emits gate findings to the agent only when `cleargate gate check` exits non-zero, and it greps for `^❌`. An advisory gate exits 0 and emits `⚠`, so **advisory findings never reach the agent's chat channel** — they land in `.cleargate/hook-log/` only. This is pre-existing for `proposal` and `initiative` and is now inherited by `spike`. It is stated here so nobody writes "author a spike and the hook tells you what is failing" into doctrine prose.

## 2. Reproduction Protocol

All steps are read-only. Step 4 is a temporary local mutation that must be reverted.

- Enumerate the registry and its severities: `grep -n '^- work_item_type:\|^  transition:\|^  severity:' .cleargate/knowledge/readiness-gates.md` → 11 blocks, 7 `enforcing`, 4 `advisory`.
- Search every reader of that document for a value assertion: `grep -rn "severity" cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts cleargate-cli/test/lib/readiness-predicates.node.test.ts cleargate-cli/test/lib/work-item-type-spike.node.test.ts` → three hits, all either a TypeScript type annotation (`:141`), a narrowing guard (`:161`), or a presence check (`:723`). No hit compares against `'advisory'` or `'enforcing'`.
- Confirm the only value assertions in the repo run against a synthetic document: `sed -n '142,215p' cleargate-cli/test/commands/gate-unit.node.test.ts` — the inline `GATES_DOC` those scenarios use, which is passed to the handler via the `gatesDocPath` seam and is not the real registry.
- Mutate one block locally: change `severity: enforcing` to `severity: advisory` at `.cleargate/knowledge/readiness-gates.md:140` (`story.ready-for-execution`), then run `npm --prefix cleargate-cli test`. Observe the suite stays at its baseline (`2516/2514/1/1`; the single failure is the pre-existing `sync.node.test.ts` network case). **Revert the mutation** with `git checkout -- .cleargate/knowledge/readiness-gates.md`.
- Observe the concealment mechanism: `sed -n '298,335p' cleargate-cli/src/commands/gate.ts` — `writeCachedGate` at `:305`, severity exit routing at `:331`. Every assertion on `cached_gate_result` is written before severity is consulted.

## 3. Evidence & Context

```
$ grep -c '^- work_item_type:' .cleargate/knowledge/readiness-gates.md
11
$ grep -c '^  severity: enforcing' .cleargate/knowledge/readiness-gates.md
7
$ grep -c '^  severity: advisory' .cleargate/knowledge/readiness-gates.md
4

$ sed -n '721,725p' cleargate-cli/test/lib/readiness-predicates.node.test.ts
    for (const block of parsed) {
      assert.ok('work_item_type' in (block));
      assert.ok('transition' in (block));
      assert.ok('severity' in (block));        <-- presence, never value
      assert.ok('criteria' in (block));

$ sed -n '158,163p' cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts
      'work_item_type' in block &&
      'transition' in block &&
      'severity' in block &&                   <-- type-narrowing guard, never value
      'criteria' in block

$ sed -n '303,306p' cleargate-cli/src/commands/gate.ts
  };
  await writeCachedGate(absPath, cacheResult, { now: nowFn });   <-- :305

$ sed -n '330,334p' cleargate-cli/src/commands/gate.ts
  // Severity-based exit routing
  if (!overallPass && !isAdvisory) {
    return exitFn(1);                                            <-- :332
  }
```

FLASHCARD 2026-08-27 `#gate #test-harness #danger` records the mechanism; this bug records the blast radius and gives it an owner.

## 4. Execution Sandbox (Suspected Blast Radius)

**Investigate / Modify:**
- `cleargate-cli/test/fixtures/gate-section-index/expected-headings.ts` — add a sibling export, e.g. `EXPECTED_SEVERITY: Record<string, 'advisory' | 'enforcing'>` keyed `<work_item_type>.<transition>`, 11 rows. Same anti-tampering banner as the existing fixture (`:20-32`).
- `cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts` — one new scenario asserting every parsed block's severity against the fixture, plus a both-ways closure (no unpinned block, no orphan fixture row) and a size assertion, mirroring `S5`/`S6`.

**Explicitly NOT in scope:**
- `cleargate-cli/src/commands/gate.ts` — the routing is correct and already covered by `gate-unit.node.test.ts` Scenarios 2 and 3. Do not reorder `writeCachedGate` relative to the severity check; `cached_gate_result` must be written whether or not the gate blocks.
- `cleargate-cli/src/lib/readiness-predicates.ts` — unrelated, and frozen while SPRINT-39 is active.
- `.cleargate/knowledge/readiness-gates.md` — **no severity value changes**. All 11 are correct; this bug adds a pin, it does not re-declare anything.
- `.claude/hooks/stamp-and-gate.sh` — the advisory-findings-invisible-to-the-agent behaviour noted in §1 is real but is a separate DX item, not this bug.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/docs/gate-section-index-pinning.node.test.ts`

The test proves the bug by mutation, not by construction — the same discipline `S3a`/`S3b` already use in that file:

- With the fixture in place and the tree unmodified: green, 11 severities matched.
- Flip `readiness-gates.md:140` to `severity: advisory` and re-run: the new scenario must go red and must name the block — `story.ready-for-execution: severity "advisory", expected "enforcing"`. Anything that merely reports "a mismatch exists" is insufficient; the failure has to name which of eleven.
- Delete a fixture row and re-run: red on the unpinned block. Add an orphan row and re-run: red on the orphan. Both directions closed, or the pin degrades to a subset check.

Revert every mutation before committing.

---

## Prior work

- [[STORY-054-05]] — built `EXPECTED_HEADINGS`, the exact fixture-pin shape this bug asks for, for `section(N)` indices. This is that pattern applied to the one other load-bearing field in the same YAML blocks.
- [[STORY-054-02]] — the story whose TPV pass discovered the hole, by measuring that flipping both new spike blocks to `enforcing` left all 12 of its tests green. Not caused by that story; it affects all 11 blocks and predates it.
- [[BUG-042]] — the precedent for a `readiness-gates.md` field being silently wrong and presenting as a green pass. Same document, same failure signature, different field.
- [[BUG-054]] — measures that 9 of 12 pinnable `section(N)` criteria pass on their own blank template. Adjacent: both are "the registry declares something nothing checks."
- [[BUG-050]] — the `countDeclaredItems` fail-open. Same family, different layer.

## Context Source

**context_source:** verified codebase grounding — `readiness-gates.md`, `gate.ts`, and all four test files that read the real registry were read directly at `3a114e9c` / cli `32eaaa0`. The green-on-flip result for the two spike blocks was measured by the STORY-054-02 TPV pass; the 11-block enumeration and the enforcing/advisory split were measured by the Architect post-flight.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
