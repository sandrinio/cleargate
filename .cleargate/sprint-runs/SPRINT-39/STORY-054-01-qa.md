# STORY-054-01 QA-Verify — Spike Charter Template

**QA: KICKBACK** (round 1)

## Method

Worktree: `.worktrees/STORY-054-01`, commit `85473ffb`. Diff confirmed two files
(`.cleargate/templates/spike.md` + `cleargate-planning/` mirror), byte-identical,
no code touched. Authoritative story read from main checkout
(`.cleargate/delivery/pending-sync/STORY-054-01_Spike_Charter_Template.md`) per
dispatch — the worktree copy is stale (missing Requirement 7). All items already
verified by the orchestrator (7 headings, invariants 1-7, frontmatter shape,
gated-heading-no-parenthetical) were NOT re-derived; this report covers only the
six items assigned as "your job."

## 1. Prior-work sentinel vocabulary

`## Prior work` in `spike.md` (lines 138-145) is a **byte-for-byte copy** of
`Bug.md`'s `## Prior work` block (lines 108-115), diffed and confirmed identical
except line numbers. `readiness-gates.md` Predicate Vocabulary entry 8
(`prior-work-recorded`) accepts: a `[[WORK-ITEM-ID]]` wikilink, or one of
`none found` / `no prior work` / a standalone `none`. The shipped template's
unfilled placeholder line
(`- <replace with related-work wikilinks, or an explicit empty-result sentinel>`)
correctly does **not** satisfy any accepted sentinel — this is expected per the
predicate's own doc comment ("the scaffolded body is deliberately token-free").
Gate wiring for `spike` is explicitly out of scope for this story (§1.3), so the
raw template is never evaluated against this predicate directly; an authored
instance that fills in a real wikilink or sentinel will pass. **Sound.**

## 2. §1/§2/§4/§5 `declared-item` score on the SHIPPED (unedited) template

Ran the real, exported `evaluate()` from `cleargate-cli/src/lib/readiness-predicates.ts`
(read-only import, frozen file untouched) against the shipped body, one
`section(N) has ≥1 declared-item` predicate per gated section (index per the
story's own §1.2 Requirement 7 table):

| Section | Position | Gated by 054-02? | declared-item count (shipped) |
|---|---|---|---|
| The Question | 1 | yes | **1** |
| Timebox & Kill Criteria | 2 | yes | **2** |
| Decision Unblocked | 3 | no | 0 |
| Decision Log | 4 | yes | **0 (correct)** |
| Outcome & Spawned Items | 5 | yes | **1** |

Only §4 scores 0 as required. §1, §2, §5 — every OTHER gated section — score ≥1
on a completely unfilled template. Root cause, confirmed line-by-line
(`countDeclaredItems`'s definition-list-term regex,
`^(\*{1,2}|_{1,2})?[A-Z][^|*\n]*(\*{1,2}|_{1,2})?:`, matches any line that starts
with an uppercase letter and contains a colon before any `|`/`*`, bold or not):

- §1: `"The question as drafted must be falsifiable: a reader unfamiliar with the surrounding"` — the guidance sentence's own colon trips it.
- §2: `"**Timebox:** State a wall-clock..."` and `"**Kill criteria:** State the condition..."` — two bold-label lines, the exact BUG-050 shape.
- §5: `"State the concluding verdict here: the answer to Section 1's question, or the reason"` — same mid-sentence-colon trap.

Per the dispatch's own instruction: *"If any gated section scores ≥1 as shipped,
054-02's gate is born vacuous and that is a kick-back."* Three of four do. Whatever
criteria STORY-054-02 attaches to §1/§2/§5 (`declared-item ≥1`, the only shape this
predicate family offers for prose sections) will pass on a charter that was never
filled in — the exact defect this sprint's BUG-042/BUG-050/STORY-054-05 line of
work exists to prevent, landing in the very template that line of work was meant
to protect. The fix is authoring (rewrap the guidance prose so no line starts with
a capital letter and carries a colon before the next `|`/`*`), not a predicate
change — `countDeclaredItems` is frozen and BUG-050 is quarantined sprint-wide.

## 3. Scenario 2 — inversion survives instruction-stripping

Body (post `</instructions>`, in the rendered `## ClearGate Ambiguity Gate` block,
lines 154-157): *"This gate is inverted relative to every other template in this
directory. Reaching green here does NOT mean the answer to Section 1 is known —
it means the question is sharp, the timebox is set, and the kill criteria are
falsifiable enough that bounded discovery can safely start."* Unambiguous, correctly
communicates the inversion to a reader who never sees `<instructions>`. **Pass.**

## 4. Scenario 3 — conclusion hands off

§5 (lines 129-136): *"Record every resulting work item as a `spawned_items` entry
in the frontmatter above, using its canonical id... move this file to
`.cleargate/delivery/archive/`, mirroring the Initiative lifecycle."* Names
`spawned_items` and instructs the archive move. **Pass.**

## 5. Semantic quality

The guidance prose is substantively strong and would produce a bounded charter if
followed: §1 demands a falsifiable, single, non-plural question and explicitly
rejects open-ended-investigation phrasing; §2 demands a concrete wall-clock/
working-day bound or explicit start/end pair AND warns that a kill criterion that
"can never actually trigger during the timebox" is decorative — not boilerplate,
an actual falsifiability check; §3 requires naming both the decision and who is
waiting. This is the same prose flagged in item 2 above — the sentences that make
the guidance concrete are exactly the ones tripping the frozen regex. The template
teaches the right thing; it just isn't gate-safe yet.

## 6. Reuse fidelity vs `initiative.md`

Key-for-key diff of the sync-attribution block: `created_at`, `updated_at`,
`created_at_version`, `updated_at_version`, `server_pushed_at_version`,
`draft_tokens{input,output,cache_read,cache_creation,model,sessions}`,
`cached_gate_result{pass,failing_criteria,last_gate_check}`, `pushed_by`,
`pushed_at`, `last_pulled_by`, `last_pulled_at`, `last_remote_update`, `source`,
`last_synced_status`, `last_synced_body_sha` — identical set, identical order,
identical sub-key structure in both files. Only the two blessed deviations differ
in value (`created_at_version`/`updated_at_version` = `"strategy-phase-pre-init"`
vs `"cleargate@{semver}"`, already confirmed sound in dispatch). **Full parity.**

## Verdict

Kick back on item 2 only — the other five items are sound. Specific criterion:
§1.2 Requirement 7's own table marks §1/§2/§5 as sections 054-02 will gate, and the
shipped prose in those three sections scores ≥1 `declared-item` unedited, which
makes any `≥1 declared-item` criterion attached to them vacuous per the BUG-050
mechanism. Rewrap the guidance prose in §1, §2, §5 so no line both (a) starts with
an uppercase letter (bold-marker or plain) and (b) contains a colon before the next
`|` or `*` character — verify against the real predicate, not by eye, before
resubmitting.
