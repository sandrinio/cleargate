# STORY-054-01 — Developer report

role: developer

## Execution route

Outer repo only, `.worktrees/STORY-054-01/`, branch `story/STORY-054-01` off
`sprint/S-39`. Two new files, one commit. No `cleargate-cli` checkout touched (forbidden
for this story per the M1 plan's R14 refusal — the `TEMPLATE_FOR` row belongs to
STORY-054-02).

## Schema decision followed

`sprint-context.md` §Mid-Sprint Amendments `2026-08-27 · M1/decision-1` overrules the
M1 plan's six-row schema table: `## Prior work` ships at position 6, `## ClearGate
Ambiguity Gate` moves to position 7. I followed the dispatch's seven-row table exactly.
Note: the story file itself (`STORY-054-01_Spike_Charter_Template.md` §1.2) still only
enumerates Requirements 1-6 in its raw text — the "Requirement 7" the dispatch refers to
is recorded in the sprint-context.md amendment log, not literally written into the
story's own §1.2 body. I treated the dispatch + amendment log as authoritative (both
independently corroborate the same seven-heading table with matching rationale) rather
than blocking on the story file's lagging text. QA should not be surprised the story
file doesn't literally say "Requirement 7" anywhere.

## Content design choices (not fully specified by the plan)

- **Placeholder discipline.** Plan + dispatch both require *only* `{ID}`/`{SLUG}`/`{ISO}`.
  `initiative.md`'s sync-attribution block uses `"cleargate@{semver}"` for
  `created_at_version`/`updated_at_version`, which would violate that rule if copied
  literally. Followed the majority convention instead (`CR.md`, `epic.md`, `Bug.md`,
  `story.md`, `Sprint Plan Template.md` all use the literal string
  `"strategy-phase-pre-init"`) — no placeholder token, same shape.
- **`spike_id: "{ID}"` (bare, no `SPIKE-` literal prefix).** Verified in
  `cleargate-cli/src/commands/hotfix.ts:166` that the `{ID}` substitution value
  (`idStr`) already carries the type prefix (`HOTFIX-003`) before replacement — mirrors
  `hotfix_id: "{ID}"` exactly, so a future `spike new` allocator following the same
  pattern renders `spike_id: "SPIKE-004"` without doubling the prefix.
  `# {ID}: {SLUG}` in the H1 follows the same logic.
- **`status` terminal value is `"Completed"`, not `"Concluded"`.** The story's own
  vocabulary uses "conclude"/`concluded_at` for the spike-specific lifecycle event (kept
  verbatim as the frontmatter key name and in §5 prose), but the sprint-wide unified
  status vocabulary (CR-067, one terminal status only) governs the `status` enum value
  itself, so the lifecycle comment reads `Draft → In Progress → Completed`.
- **Bullets avoided in *all* of §1-§5**, not just the four sections the invariant names
  (§1, §2, §4, §5 — §3 "Decision Unblocked" is technically ungated by that invariant).
  Simpler to hold one rule for the whole numbered range than exploit the one-section gap.
- **`context_source` and `area`** are not shipped by any existing template with a live
  value (`area` appears in zero shipped templates today), but the plan's Frontmatter
  section explicitly names both for `spike.md`. Shipped `context_source` with the same
  boilerplate default string CR.md/Bug.md/story.md use; shipped `area: null` with a
  one-line comment since there is no established default value to copy.
- **No `### Open Questions` sub-heading.** Not in the seven-row table and not required by
  any of §1.2's six requirements; omitted rather than risk an eighth `## `-adjacent
  heading pattern precedent for a future story to misread.

## Invariant self-check (mechanical, not eyeballed)

```
grep -c '^## ' spike.md                        → 7
grep -n '^## ' spike.md                          → the 7 rows, exact order, exact text
grep -n '^---[ \t]*$' spike.md                   → lines 49, 86, 147 — all after </instructions> (line 47)
grep -n 'TBD' spike.md                           → no matches
grep -nE 'SPRINT-[0-9]' spike.md                 → no matches
grep -n '__CLEARGATE_VERSION__' spike.md          → no matches
grep -n 'sprint_cleargate_id\|carry_over' spike.md → no matches (both omitted, not null)
grep -no '{[^}]*}' spike.md | sort -u             → {ID}, {SLUG}, {ISO} only
grep -n '```' spike.md                            → no code fences at all
sed -n '90,137p' spike.md | grep -n '^\s*- '      → no matches (zero bullets across §1-§5)
awk 'NR>47' spike.md | grep -i invert             → hits at the rendered Ambiguity Gate body (line 107),
                                                       confirming the inversion survives instruction-stripping
diff .cleargate/templates/spike.md cleargate-planning/.cleargate/templates/spike.md → empty
```

§4 Decision Log ships as `| Round | Date | Finding | Confidence |` header +
`|---|---|---|---|` separator + zero data rows — read by eye, confirmed no line after the
separator before the next `## ` heading.

## Surface check

`git status --short` before commit showed exactly the two new template files; no
`cleargate-cli/**` path, no `cleargate-planning/MANIFEST.json`. Commit went through the
outer repo's pre-commit hook with no bypass.

## Gotchas confirmed against code

- `.cleargate/templates/**` is not matched by `stamp-and-gate.sh:22` — writing the two
  files produced no stamp, no gate check, no ingest log line. Confirmed expected (plan's
  own Gotchas section) — not a defect, not silence to chase.
- `hotfix.ts:166,180-182` re-verified directly: `{ID}` substitution value already
  contains the `TYPE-NNN` prefix; `{SLUG}` and `{ISO}` substituted independently. No
  other placeholder token is read by that code path today (CR-108 not yet landed), so
  `spike.md` carrying only those three tokens is the minimum requirement for a future
  generalised allocator to render it unchanged.

## Flashcards

None recorded — no new surprise beyond what the plan/dispatch/flashcards already
anticipated. The placeholder-token vs. `initiative.md`'s `{semver}` tension and the
status-vocabulary interaction were both resolvable from existing conventions without a
new lesson worth a card.
