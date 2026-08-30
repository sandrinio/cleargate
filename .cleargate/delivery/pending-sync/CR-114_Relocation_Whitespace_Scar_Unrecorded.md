---
cr_id: CR-114
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
approved: false
context_source: "Filed 2026-08-29 by the CR-105 / M3-close post-flight Architect. The behaviour was first identified by the CR-105 TPV ruling T8 ('the blank-line scar is EXPECTED. Do not report every byte preserved.') and independently re-reproduced for this item against cleargate-cli @ 45816b9 by executing the shipped injectClaudeMd through tsx: input '# Proj\\n\\nSTART...END\\n\\nFooter.\\n' yields 'START...END\\n\\n# Proj\\n\\n\\n\\nFooter.\\n' — a 3-blank-line run where the source had 1 — and a second application is byte-identical, so it does not accumulate. Grounding: cleargate-cli/src/init/inject-claude-md.ts:55-57 (the strip-and-trim), cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts:135-140 (the one fixture that exercises the shape and asserts nothing about the remainder), cleargate-cli/CHANGELOG.md:9."
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 45816b9
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
  last_gate_check: 2026-08-28T21:43:20Z
  transition: ready-to-apply
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# CR-114: Record the relocation whitespace scar where a reader will find it

## 0.5 Open Questions

- **Question:** Document the scar, or remove it?
- **Recommended:** **Document and pin it. Do not remove it.** Removing it means collapsing a blank
  run inside a file the user owns, and the only cheap implementation — a global
  `replace(/\n{3,}/g, '\n\n')` on the stripped remainder — rewrites blank runs the user authored
  everywhere else in the file. That is a whole-file whitespace mutation on a write path whose entire
  purpose is not touching user bytes, which is the harm class [[BUG-043]] closed and which its N1
  ruling explicitly refused ("tolerance goes in the pattern, not in a mutation of the file"). A
  targeted collapse confined to the strip site is implementable (strip to a sentinel, collapse only
  around the sentinel, restore) but is more machinery than a cosmetic doubled blank line justifies.
- **Human decision:** {populated during Brief review}

- **Question:** Is the `CHANGELOG.md:9` sentence — *"your content is preserved and moves below the
  block, it is not touched or reordered otherwise"* — inaccurate enough to reword?
- **Recommended:** Yes, minimally. The sentence is true about *content* and false about
  *whitespace*, and a user who diffs a mid-file-block `CLAUDE.md` after the relocating run sees a
  changed line count and a doubled blank line the sentence did not lead them to expect. One
  subordinate clause fixes it. This is not a retraction of the entry; the wording constraint T8
  imposed ("never say byte-identical") was correctly honoured and stays honoured.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget that the strip-and-prepend is a pure move for every input shape. It is a pure move only
  when the existing block sits at a file boundary. This repo's own root `CLAUDE.md` was such a case
  — its block was the last 58 lines, so the scar trimmed away — and reading that one witness as the
  general behaviour is the specific mistake this item exists to prevent.
- Forget that a green suite proves the remainder is untouched. Measured: the one fixture that feeds
  a mid-file block, `claude-md-block-leads.red.node.test.ts:135-140` (scenario 5), asserts only
  `includes('NEW')` and `!includes('OLD')`. It exercises the scar on every run and asserts nothing
  about it. Silence is not coverage.

**New Logic (The New Truth):**

- **The scar is deliberate, bounded and idempotent, and it is written down where a reader meets the
  code.** `injectClaudeMd` strips the block with `replace(BLOCK_REGEX, '')` and trims only the two
  ends of the remainder (`inject-claude-md.ts:55-56`). A block that sat mid-file therefore leaves a
  three-newline gap at its former position. A second application is byte-identical, so the gap does
  not grow. All three facts belong in a comment beside the line that causes them.
- **The behaviour has a test that names it.** Scenario 5's fixture already produces the scar; it
  gains one assertion pinning the remainder's exact shape and a title that says so. A later change
  that silently starts collapsing whitespace then reds a test whose title explains why.
- **The user-facing sentence distinguishes content from whitespace.** Content is preserved and
  reordered only by the block move; a single blank line may be added where the block used to sit.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update CR: [[CR-105]] — **no reversal, no behaviour change.** CR-105 shipped the
  remove-then-prepend contract and it is correct as specified. This item adds a comment, one test
  assertion and one CHANGELOG clause. `injectClaudeMd`'s return values are byte-identical before
  and after under the recommended route.
- [ ] Invalidate/Update Bug: [[BUG-043]] — no interaction. `BLOCK_REGEX`, `hasAnchoredBlock`, the
  `NOT_ANCHORED` guard and both guard messages are untouched.
- [ ] Invalidate/Update Bug: [[BUG-061]] — adjacent but distinct. BUG-061 is about the greedy match
  consuming user prose; this is about whitespace left behind after a correct match. Neither blocks
  the other, and they touch the same function, so whichever lands second rebases onto the first.
- [ ] Invalidate/Update CR: [[CR-113]] — no interaction; that item owns grammar unification, not
  the strip semantics.
- [ ] Downstream repos: none. No observable behaviour changes for any install under the recommended
  route. Every repo whose `CLAUDE.md` block sits mid-file already receives the scar today, from
  cleargate 0.25.x onward, whether or not this item ships.
- [ ] Database schema impacts? No — no runtime or persistence surface.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:55-57` — the three lines that produce the
  scar: `const stripped = BLOCK_REGEX.test(existing) ? existing.replace(BLOCK_REGEX, '') : existing;`
  then `const rest = stripped.trim();` then the two-branch return. `.trim()` acts on the string ends
  only; the interior gap survives. The comment block above at `:51-54` explains the relocation
  rationale and says nothing about the remainder.
- **Surface:** `cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts:135-140` — scenario 5,
  fixture `` `# Proj\n\n${OLD_BLOCK}\n\nFooter.\n` ``. The only mid-file-block fixture in the file.
  Two assertions, both about block body substitution, none about the surviving prose.
- **Surface:** `cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts:104,120` — the
  idempotence scenario, which already asserts "no growth of blank lines" on the already-at-top
  shape. This is the assertion the mid-file shape lacks and the natural pattern to copy.
- **Surface:** `cleargate-cli/CHANGELOG.md:9` — the CR-105 `### Changed` entry, whose clause *"it is
  not touched or reordered otherwise"* is the user-facing statement this item qualifies.
- **Surface:** `cleargate-cli/src/lib/claude-md-surgery.ts` — `removeBlock` performs the same
  `replace(BLOCK_REGEX, '')` and returns the result without trimming, so `uninstall.ts:437` leaves
  the same gap. Cited to record that it was checked: it is the same class, out of scope here, and
  named in `## 3` as a read-only observation rather than an edit.

## Prior work

- [[CR-105]] — shipped the remove-then-prepend contract this item documents. Its TPV ruling T8 is
  the first recording of the behaviour and currently the only one.
- [[BUG-043]] — established the rule this item's Recommended route obeys: never mutate bytes the
  user owns in order to make a match tidier.
- [[BUG-061]] — the other residual left by the same function, filed by the BUG-043 post-flight.
- [[STORY-054-07]] — the sprint's own thesis, that an instruction living only in an agent's
  transient ruling text is not a record. This item is a direct application of it.
- `cleargate wiki query` was not run: `.cleargate/wiki/**` is held by a concurrent session for the
  duration of SPRINT-39 wave 9 and the command is forbidden by this dispatch. Substituted a grep
  over `.cleargate/delivery/{pending-sync,archive}` and `.cleargate/FLASHCARD.md` for
  `blank line|whitespace|trim|scar` in a `CLAUDE.md` context — none found beyond the four items
  above. Re-run the wiki query at Brief review before promotion.

## 3. Execution Sandbox

**Modify:**
- `cleargate-cli/src/init/inject-claude-md.ts` — append three sentences to the comment at `:51-54`,
  beside `const rest = stripped.trim();`: that a mid-file block leaves a three-newline gap at its
  former position, that this is accepted rather than overlooked, and that it is idempotent. No code
  change under the recommended route.
- `cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts` — retitle scenario 5 to name the
  mid-file case, and add one assertion pinning the exact remainder produced by the shipped code.
- `cleargate-cli/CHANGELOG.md` — qualify the one clause in the CR-105 entry. Append to the existing
  `## Unreleased` section; do not open a second one.

**Do NOT modify:**
- `cleargate-cli/src/lib/claude-md-surgery.ts` — `removeBlock` leaves the same gap and that is a
  separate surface with a separate consumer (`uninstall.ts:437`). Out of scope; recorded here so the
  next reader does not treat its absence as an oversight.
- `cleargate-cli/src/commands/init.ts`, `cleargate-cli/src/commands/upgrade.ts` — the relocation
  notice and the latent take-theirs branch are unaffected.
- `cleargate-cli/package.json` — the version bump belongs to the release lane.
- `CLAUDE.md` / `cleargate-planning/CLAUDE.md` — this item changes no bounded-block text, so the
  two-tree hash coupling at `drift-check.ts:118-128` is not engaged.

## Task Breakdown

- [ ] Re-reproduce the scar against the then-current `injectClaudeMd` before writing the comment, so
      the recorded shape is measured rather than copied from this item.
- [ ] Append the three-sentence comment beside `inject-claude-md.ts:56`.
- [ ] Retitle scenario 5 and add the remainder assertion; confirm it is red under a
      whitespace-collapsing mutant and green under the shipped code.
- [ ] Qualify the `CHANGELOG.md` clause under the existing `## Unreleased` heading.
- [ ] Run `npm --prefix cleargate-cli run typecheck` and the full suite by hand and report both
      numbers: `cleargate-cli` has zero installed git hooks, so no commit there is gated.

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli exec -- tsx --test cleargate-cli/test/init/claude-md-block-leads.red.node.test.ts`

New logic proven:
- Given `` `# Proj\n\n<block>\n\nFooter.\n` ``, `injectClaudeMd` returns
  `` `<block>\n\n# Proj\n\n\n\nFooter.\n` `` — asserted as an exact string, so the scar is pinned
  rather than described.
- A second application of `injectClaudeMd` to that output is byte-identical, so the gap is proven
  non-accumulating rather than assumed to be.
- Every non-empty line of the input's user prose appears in the output, in the same relative order.

Old logic evicted:
- Assert that scenario 5 no longer passes on a mutant that collapses the remainder's blank runs: the
  exact-string assertion must fail under `stripped.replace(/\n{3,}/g, '\n\n').trim()`. A test that
  only checks prose survival goes green under that mutant and therefore proves nothing.
- Assert the full suite total is unchanged apart from the retitle: this item adds one assertion to an
  existing test and no new test file, so `tests` must not move.

---

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** CR-105 post-flight (M3 close), 2026-08-29. The behaviour was surfaced by the
CR-105 TPV ruling T8 and re-reproduced independently for this item by executing the shipped
`injectClaudeMd` from `cleargate-cli` @ `45816b9` through `tsx` against a mid-file-block fixture.
The census of where the behaviour is currently recorded was run against the shipped tree: absent
from `src/`, absent from every test title and assertion, absent from `CHANGELOG.md`, absent from the
CR-105 work item. It exists only in `.cleargate/sprint-runs/SPRINT-39/plans/M3.md` T8 and
`CR-105-tpv.md`, both of which are sprint-scoped artefacts.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] Both `## 0.5` questions carry a recorded human decision. Document-versus-fix is a real choice
      with a real cost on each side, and the Architect's recommendation is not a substitute for it.
- [ ] `cleargate wiki query` re-run and its result recorded in `## Prior work`. The wiki was held by
      a concurrent session at filing time and a grep was substituted; that substitution is stated
      rather than hidden, and the box stays unchecked until the real query runs.
