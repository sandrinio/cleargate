# STORY-054-02 — QA-Red

**Verdict: WRITTEN.** Commit `8229109` on `cleargate-cli` branch `story/STORY-054-02`
(off cli `main`, at merge-base `db13a03`/`7833821`). Outer repo untouched (`git diff` on
the outer worktree shows zero change attributable to this pass — only pre-existing
hook-owned artifacts: `.session-totals.json`, `state.json`, `token-ledger.jsonl`,
`cleargate-planning/MANIFEST.json`).

Test file: `cleargate-cli/test/lib/work-item-type-spike.red.node.test.ts` (474 lines, 12
`test()`/`it()` cases across 4 `describe()` blocks).

---

## 1. Scope covered

(a) All four §2.1 Gherkin scenarios, plus the fifth the story's amendment adds (R21,
`push.ts`):
1. `detectWorkItemTypeFromFm({ spike_id: 'SPIKE-001' })` → `'spike'`
2. `detectWorkItemType('SPIKE-001')` → `'spike'`
3. Advisory `spike.ready-to-investigate` gate passes: §1 + §2 populated, §5 empty
4. Error case: §2 with 1 listed-item (not 2) reports `timebox-and-kill-criteria-set` by
   id, detail `section 2 has 1 listed-item (≥2 required)`
5. R21 — `cleargate push` on a spike charter resolves type to `'spike'` and reaches
   `push_item`, instead of the current `exit(1)` "cannot determine item type"

(b) Pin A (Architect post-flight §A3, non-vacuity guard) — 5 sub-assertions: the shipped
`spike.md` exists (hard precondition, R18/A6), and each of the four `section(N)` criteria
(`question-stated`, `timebox-and-kill-criteria-set`, `decision-log-populated`,
`outcome-declared`) FAILS against the unedited template.

(c) R24 — the prefix-collision guard: `detectWorkItemType('STORY-054-03_Spike-Doctrine.md')`
→ `'story'`, not `'spike'`.

Bonus (§4.1 "transitions map" unit-test bucket, content-only, not a count): `WORK_ITEM_TRANSITIONS['spike']`
deep-equals `['ready-to-investigate', 'ready-to-conclude']` once registered — a cast
matching `work-item-type-hotfix.red.node.test.ts:97`'s precedent, since `'spike'` is not
yet a member of the closed `WorkItemType` union.

## 2. Baseline — targeted run

`npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/lib/work-item-type-spike.red.node.test.ts`

```
tests 12 · suites 4 · pass 6 · fail 6 · cancelled 0 · skipped 0 · todo 0
```

**The 6 reds (to be cleared by the Developer's commit):**

| Test | Failure message |
|---|---|
| S1 `detectWorkItemTypeFromFm({ spike_id })` | `null !== 'spike'` — FM_KEY_MAP has no `spike_id` row |
| S2 `detectWorkItemType('SPIKE-001')` | `null !== 'spike'` — PREFIX_MAP has no `SPIKE-` row |
| transitions-content | `WORK_ITEM_TRANSITIONS["spike"] is undefined` |
| S3 (gate passes) | `gate exited with code 1` — stderr `unable to detect work-item type from frontmatter`; no `cached_gate_result` written at all (handler exits before evaluation) |
| S4 (gate error-by-id) | `cached_gate_result.pass is undefined, expected false` — same early-exit cause as S3 |
| R21 (push resolves spike) | `push_item was not called` — stderr `Error: cannot determine item type from frontmatter`, exit code 1 |

S3/S4 both red via the SAME mechanism (`detectWorkItemTypeFromFm` → `null` →
`gateCheckHandler` exits 1 before the gate-block lookup is ever reached), not via the gate
block being absent — both mechanisms are missing today (no registration, no gate block),
so this is still the correct red for an unregistered type.

**The 6 greens — PINS, not reds-to-be-cleared, must stay green after the fix:**

| Test | Why green today | What would turn it red |
|---|---|---|
| Pin A precondition (spike.md exists) | template shipped by STORY-054-01, merged | template deleted/moved |
| Pin A `question-stated` | §1 has 0 `- ` bullets (invariant 1) | §1 guidance rewritten as a bullet |
| Pin A `timebox-and-kill-criteria-set` | §2 has 0 `- ` bullets | §2's two bold-label paragraphs bulleted (verified mutation M3 in arch-postflight) |
| Pin A `decision-log-populated` | §4 is a table, 0 data rows | a Decision Log row added to the template itself (not to an authored instance) |
| Pin A `outcome-declared` | §5 has 0 `- ` bullets | §5 rewritten as a bullet, OR any `## ` heading above position 5 deleted (slides `## Prior work`'s 1 bullet into position 5 — verified mutation M1/M2) |
| R24 guard | PREFIX_MAP array-order scan hits `STORY-` before ever reaching (today, nonexistent) `SPIKE-` | Developer inserts `{ prefix: 'SPIKE-', type: 'spike' }` BEFORE the `STORY-` row instead of after `HOTFIX-` |

## 3. Full-suite regression sweep

`npm --prefix cleargate-cli test` (no `CLEARGATE_META_ROOT` override, full default suite,
`!test/**/*.integration.node.test.ts` + `!test/fixtures/**`):

```
tests 2516 · suites 878 · pass 2508 · fail 7 · skipped 1
```

Baseline (documented in sprint-context.md §Test Stack) was `2504 tests / 2502 pass / 1
fail / 1 skip`. Delta: **+12 tests, +6 pass, +6 fail, +0 skip** — exactly this file's 12
cases, 6 green pins + 6 red-to-clear, landing additively with zero effect on anything
else. The 7 failures list is exactly: `test/commands/sync.node.test.ts` (pre-existing,
`Error: cannot reach https://cleargate-mcp.soula.ge (fetch failed)` — no outbound network
in this sandbox, identical on `main`, not mine) + this file's 6. No other test anywhere in
the 878 suites regressed.

Also verified explicitly (still green, as expected since `src/` and `readiness-gates.md`
are untouched):
- `test/lib/work-item-type.node.test.ts` — `WORK_ITEM_TRANSITIONS has 8 entries total
  post-STORY-043-04` — still passes (still 8; this is the Developer's R20 edit, not mine).
- `test/docs/gate-section-index-pinning.node.test.ts` S1a/S1b/S6 — still `14` / `0
  findings` / `12` — still passes (registry untouched; this is the Developer's T2 edit,
  not mine).

## 4. Predicted Developer reds (do not pre-empt; Developer's commit clears these)

Once the Developer lands Commit A (registry) + Commit B (`work-item-type.ts` + T2 edits)
in one turn:
- `test/lib/work-item-type.node.test.ts:182` — `WORK_ITEM_TRANSITIONS has 8 entries` will
  read 8 actual vs. `assert.strictEqual(keys.length, 8)` once `spike` is added to the map
  — Developer bumps this assertion to 9 (R20), and the title + `:18` header comment.
- `gate-section-index-pinning.node.test.ts` S1a (`14`→`18`, `12`→`16`), S1b (4× "no
  template found for work_item_type spike" until `TEMPLATE_FOR.spike` + the fixture rows
  land), S5 (orphan-fixture-row direction, until the 4 rows exist), S6 (`12`→`16`) — all
  four go red the moment ONE of {registry, TEMPLATE_FOR+fixture} lands without the other
  (R19, no inert intermediate), and clear once BOTH commits are in.
- If the Developer runs the suite BETWEEN commit A and commit B, S1b's four "no template
  found" findings will suggest adding the four criteria to `KNOWN_UNPINNABLE` — that is
  the R19 trap; taking it trips S6's `size === 2` assertion instead. Not this story's job
  to prevent mechanically; flagged here as the documented hazard.

## 5. Constraints verified

- `git diff` on `cleargate-cli/src/` — empty (confirmed by direct `git diff --stat`).
- `test/docs/gate-section-index-pinning.node.test.ts`, `test/fixtures/gate-section-index/expected-headings.ts`,
  `test/lib/work-item-type.node.test.ts` — all three untouched (`git diff --stat` empty on
  each).
- `readiness-predicates.ts`, `work-item-id.ts` — read-only imports/greps only, zero diff.
- Outer repo: `.cleargate/templates/spike.md`, `.cleargate/knowledge/readiness-gates.md`,
  `.cleargate/knowledge/cleargate-protocol.md` and their `cleargate-planning/` mirrors are
  untouched and verified byte-identical live↔canonical (both pairs `diff`-empty) —
  confirms the Developer's Commit A starts from a clean, currently-synced baseline.
- No `run_script.sh` invocation was required for this pass (typecheck and test runs used
  the sanctioned direct commands per Cross-Cutting Rule 6 / sprint-context §Test Stack).
  No script incidents.

## 6. Notes for the Developer

- `cleargate-protocol.md:680-693`'s KNOWN_TYPES table today reads "8 entries" with 8 rows,
  ending `| \`sprint_report\` |` — confirmed by direct read. Requirement 5's placement
  instruction (insert the `spike` row immediately after that line, table→9 rows, heading
  →"(9 entries)") is unambiguous against the live file.
- `gatesDocPath` / `cwd` are explicit test seams on `gateCheckHandler` (`GateCliOptions`).
  My S3/S4 tests pass `cli.cwd = META_ROOT` explicitly rather than relying on the
  fixture-location walk-up, specifically to sidestep the
  FLASHCARD `#gate #worktree #test-harness #danger` hazard deterministically — the charter
  fixture itself lives in a plain `os.tmpdir()`, which is safe once `cwd` is supplied
  directly. Worth carrying forward as the pattern for any future gate-check test authored
  from the main checkout.
- Pin A intentionally reads the **live** tree (`.cleargate/templates/spike.md`, per the
  dispatch's literal wording), not canonical. The two are verified byte-identical today;
  this only matters if they are ever allowed to drift before a QA pass catches it.
