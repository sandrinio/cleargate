---
cr_id: CR-113
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
area: planning-layer
status: Draft
approved: false
context_source: "Filed 2026-08-28 by the BUG-043 post-flight Architect, discharging the follow-up the Bug's own §4 deferred ('Unifying them is desirable and is the BUG-041 pattern, but is deferred so this fix stays minimal; note it for a follow-up CR'). Every claim below was measured against cleargate-cli @ 1e01ea0, not read: three bounded-marker grammars enumerated by grep, the third (root-gitignore.ts:41) verified unanchored and live, and the divergence window measured by TPV as 6 red tests at the S1 intermediate. Grounding: cleargate-cli/src/lib/claude-md-surgery.ts:12, cleargate-cli/src/init/inject-claude-md.ts:23, cleargate-cli/src/init/root-gitignore.ts:41 and :107-108."
created_at: 2026-08-28T00:00:00Z
updated_at: 2026-08-28T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: 1e01ea0
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
  last_gate_check: 2026-08-28T18:34:23Z
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

# CR-113: One bounded-marker grammar

## 0.5 Open Questions

- **Question:** Does unification mean one shared *module* (a `bounded-block.ts` that both CLAUDE.md
  modules and `root-gitignore.ts` call with their own marker pair), or one shared *builder* (a
  `makeBlockRegex(start, end)` factory that each module calls at its own top level)?
- **Recommended:** A builder plus a small operation set. The three call sites do not want the same
  *function* — `claude-md-surgery` needs a capture group, `inject-claude-md` needs `match[0]`, and
  `root-gitignore` needs neither and has different markers. They want the same *pattern
  construction* and the same *anchoring rule*. A factory delivers that with no call-site rewrite;
  a single shared `readBlock` would force all three into one shape they do not share.
- **Human decision:** {populated during Brief review}

- **Question:** Is anchoring `root-gitignore.ts`'s `ROOT_BLOCK_REGEX` a behaviour change that needs
  its own acceptance, or does it ride along?
- **Recommended:** It needs its own acceptance and its own red test. It is the same live defect
  BUG-043 Defect B fixed for `CLAUDE.md`, on a different marker pair, in a file `cleargate init`
  writes into every user repo — and it is currently unpinned by any test. Riding along on a
  refactor is how a behaviour change ships without a witness.
- **Human decision:** {populated during Brief review}

## 1. The Context Override (Old vs. New)

**Obsolete Logic (What to Remove / Forget):**

- Forget "there are two `BLOCK_REGEX` constants and that is fine because they are equivalent."
  There are **three** bounded-marker grammars in `cleargate-cli/src`, not two, and the third is
  **not** equivalent — it is the pre-BUG-043 unanchored greedy shape.
- Forget the comment at `root-gitignore.ts:36-40`, which justifies its greedy regex by saying it
  *"mirrors inject-claude-md's rationale."* That rationale changed on 2026-08-28: BUG-043 anchored
  both CLAUDE.md grammars to line-alone markers and left this one behind. The comment now cites a
  precedent that no longer exists.
- Forget that the shared-corpus equivalence test closes the duplication. It is a **detector**, not
  a fix, and it covers only two of the three copies — it runs `claude-md-surgery` against
  `inject-claude-md` and never sees `root-gitignore`.

**New Logic (The New Truth):**

- **One grammar construction, three call sites.** A single exported builder owns the anchoring
  rule — markers alone on their own line, horizontal-whitespace tolerant, greedy body — and every
  bounded-marker region in the CLI derives its pattern from it. No module re-types `^…[ \t]*$`.
- **`root-gitignore.ts` adopts the anchored grammar.** A user `.gitignore` that mentions
  `# <<< cleargate <<<` in a comment below the managed block currently loses every byte between
  the real marker and that mention on the next `cleargate init`. That is BUG-043 Defect B,
  unfixed, in a file the installer writes.
- **The equivalence corpus covers all three.** Adding a fourth marker pair must be a one-row edit
  to a table, not a fourth grammar.

## 2. Blast Radius & Invalidation

- [ ] Invalidate/Update Bug: [[BUG-043]] — **no reversal.** BUG-043 shipped the anchored grammar
  and the shared-corpus pin; this CR is the follow-up its own §4 named. BUG-043's `NOT_ANCHORED`
  guard, its guard ordering, and both error message strings are load-bearing and must survive
  byte-identical (three existing tests assert them verbatim at
  `cleargate-cli/test/lib/claude-md-surgery.node.test.ts:168`, `:175`, `:204`).
- [ ] Invalidate/Update CR: [[CR-105]] — **sequencing only, no scope change.** CR-105 rewrites
  `injectClaudeMd`'s body and consumes `BLOCK_REGEX` from the same module. Land this CR **after**
  CR-105 merges, or the two edits collide inside one function. Neither invalidates the other.
- [ ] Invalidate/Update Bug: [[BUG-041]] — no change; this is the same *class* (duplicated
  grammar, silently divergent) on a different subject (bounded markers, not work-item IDs). BUG-041
  fixed IDs and shipped `check:no-inline-id-regex`; that gate does not see marker regexes.
- [ ] Downstream repos: `root-gitignore.ts`'s anchoring is a behaviour change every install
  receives on its next `cleargate init`. A `.gitignore` whose markers are indented, or which
  quotes a marker inline, stops matching and the block is appended rather than replaced. Bounded
  and loud is the intended direction; it must be stated in the release note.
- [ ] Database schema impacts? No — no runtime or persistence surface.

## Existing Surfaces

> L1 reuse audit. List source-tree implementations this CR extends or modifies. Cite file:line.

- **Surface:** `cleargate-cli/src/lib/claude-md-surgery.ts:12` — `BLOCK_REGEX`, anchored and greedy
  with a capture group for the body. Consumed by `readBlock` (`:29`), `writeBlock` (`:46`, `:49`),
  `removeBlock` (`:63`, `:66`) and exported indirectly via `hasAnchoredBlock` (`:20`).
- **Surface:** `cleargate-cli/src/init/inject-claude-md.ts:23` — `BLOCK_REGEX`, the same anchored
  greedy pattern **without** the capture group; `extractBlock` returns `match[0]`.
- **Surface:** `cleargate-cli/src/init/root-gitignore.ts:41` — `ROOT_BLOCK_REGEX`, markers
  `# >>> cleargate >>>` / `# <<< cleargate <<<` (`:32`, `:34`). **Unanchored and greedy** — the
  pre-BUG-043 shape. Used at `:107` (`test`) and `:108` (`replace`), the identical
  test-then-replace pair BUG-043 hardened in `writeBlock`/`removeBlock`.
- **Surface:** `cleargate-cli/src/lib/claude-md-surgery.ts:20` — `hasAnchoredBlock`, the predicate
  BUG-043 introduced so tests could probe the grammar without exporting a mutable `RegExp`. The
  builder must keep this export shape; `cleargate-cli/test/commands/init.node.test.ts` imports it by name.
- **Surface:** `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:258` — the
  shared-corpus equivalence loop over 9 fixtures, comparing `hasAnchoredBlock` against
  `extractBlock`. This is the corpus the third marker pair joins.
- **Surface:** `cleargate-cli/test/commands/init-root-gitignore.node.test.ts` — the only existing
  coverage of the third grammar. It does not exercise a quoted or indented marker.
- **Why this CR extends rather than rebuilds:** all three grammars, both marker-constant pairs, the
  guard idiom, the equivalence corpus and its `countAnchoredLines` helper already exist. The change
  is to derive three patterns from one construction instead of three literals, and to bring the
  third call site up to the rule the other two already follow. No new file format, no new marker,
  no new public API beyond one builder.

## Prior work

- [[BUG-043]] — anchored both CLAUDE.md grammars and shipped the shared-corpus pin; its §4
  explicitly defers this unification to "a follow-up CR." This is that CR.
- [[BUG-041]] — the duplicated-parser precedent (fourteen work-item-ID grammars, three divergent).
  Same failure class, different subject.
- [[CR-105]] — edits `injectClaudeMd` one wave after BUG-043; must merge before this CR.
- [[BUG-060]] — filed by the same M3 planning pass; unrelated subject (hardcoded test paths).
- `grep -rln "BLOCK_REGEX\|ROOT_BLOCK_REGEX" .cleargate/delivery/{pending-sync,archive}` returns
  only BUG-043, CR-105 and SPRINT-39. No prior item proposes unifying the marker grammars.

## 3. Execution Sandbox

**Modify:**

- `cleargate-cli/src/lib/` — new module owning the builder (name at the Developer's discretion;
  `bounded-block.ts` is the obvious one). Exports the pattern factory and nothing else.
- `cleargate-cli/src/lib/claude-md-surgery.ts:12` — derive `BLOCK_REGEX` from the builder. Keep
  the capture group, keep `NOT_ANCHORED` (`:14`) and both `includes` guards and their exact message
  strings, keep guard order (`includes` START, `includes` END, then the regex guard).
- `cleargate-cli/src/init/inject-claude-md.ts:23` — derive `BLOCK_REGEX` from the same builder.
- `cleargate-cli/src/init/root-gitignore.ts:41` — derive `ROOT_BLOCK_REGEX` from the builder,
  **anchored**. Rewrite the `:36-40` comment: it currently justifies the shape by citing
  `inject-claude-md`'s greedy rationale, which BUG-043 superseded.
- `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts:258` — widen the shared-corpus
  equivalence loop to a third marker pair.
- `cleargate-cli/test/commands/init-root-gitignore.node.test.ts` — add the inline-quoted-marker and
  indented-marker cases the file does not currently carry.
- New `*.node.test.ts` under `cleargate-cli/test/` for the builder itself.
- `cleargate-cli/CHANGELOG.md` — `root-gitignore` anchoring is user-visible.

**Do NOT modify:**

- The two `NOT_ANCHORED` guards or either `includes` guard message in `claude-md-surgery.ts` —
  three existing tests assert those strings verbatim, and TPV R8 measured that hoisting the third
  guard above the two `includes` guards reds fixture `F`.
- `cleargate-cli/test/scripts/build-manifest.node.test.ts:258-261` — unrelated; pins `classifyPath('CLAUDE.md')`.
- Fixture `H` in `claude-md-anchoring.red.node.test.ts` — it pins an accepted known limitation and
  is the sole fixture that discriminates greedy from non-greedy retention (TPV R6).

## Task Breakdown

- [ ] Enumerate every bounded-marker grammar in `cleargate-cli/src` by grep; confirm the census is three and record it in the Developer report
- [ ] Add the builder module under `cleargate-cli/src/lib/`, exporting one pattern factory parameterised by marker pair and capture-group presence
- [ ] Write the builder's own unit test: anchoring, `[ \t]*` tolerance, CRLF, greedy retention, capture-group presence
- [ ] Derive `claude-md-surgery.ts:12`'s `BLOCK_REGEX` from the builder; leave both `includes` guards, `NOT_ANCHORED`, and guard order untouched
- [ ] Derive `inject-claude-md.ts:23`'s `BLOCK_REGEX` from the builder
- [ ] Confirm the two CLAUDE.md grammars are still byte-equivalent modulo the capture group by running the shared-corpus equivalence loop
- [ ] Derive `root-gitignore.ts:41`'s `ROOT_BLOCK_REGEX` from the builder, anchored; rewrite the `:36-40` comment so it no longer cites the superseded greedy rationale
- [ ] Add red tests to `init-root-gitignore.node.test.ts` for an inline-quoted marker and an indented marker below the managed block
- [ ] Widen the shared-corpus equivalence loop to cover the third marker pair
- [ ] Run `npm --prefix cleargate-cli run typecheck` and `npm --prefix cleargate-cli test` by hand and report both numbers — `cleargate-cli` commits are ungated
- [ ] Add the CHANGELOG entry naming the `root-gitignore` behaviour change

## 4. Verification Protocol

**Command/Test:** `npm --prefix cleargate-cli test`

New logic proven:

- The builder's own test asserts, for an arbitrary marker pair: an inline-quoted marker is not a
  candidate match; a marker line with trailing spaces or tabs still matches; a CRLF fixture matches
  and the captured body retains its `\r`; the body match is greedy.
- `grep -c` over `cleargate-cli/src` for a hand-written `<!-- CLEARGATE:START -->` or
  `# >>> cleargate >>>` inside a `RegExp` literal returns **zero** outside the builder module.
- `root-gitignore`'s `updateRootGitignore` leaves a `.gitignore` byte-identical when a comment
  below the managed block quotes `# <<< cleargate <<<` inline — today that comment extends the
  greedy match and the text between is destroyed.
- The shared-corpus equivalence loop passes over three marker pairs, not two.

Old logic evicted:

- No module outside the builder constructs a bounded-marker `RegExp`.
- `root-gitignore.ts` carries no unanchored `[\s\S]*` between literal markers.
- The `:36-40` comment no longer claims to mirror `inject-claude-md`'s greedy rationale.

Regression, all must stay green:

- `cleargate-cli/test/lib/claude-md-surgery.node.test.ts` — 10/10, including the three verbatim message
  assertions at `:168`, `:175`, `:204`.
- `cleargate-cli/test/lib/claude-md-anchoring.red.node.test.ts` — 27/27, including fixture `H` unchanged.
- `cleargate-cli/test/commands/upgrade-claude-md.red.node.test.ts` — 4/4.
- `cleargate-cli/test/commands/init.node.test.ts`, `cleargate-cli/test/commands/init-root-gitignore.node.test.ts` — full green.

---

## Context Source

> Discovery audit. Populated from the approved Epic, verified codebase grounding, and recorded direct approval.

**context_source:** Filed by the BUG-043 post-flight Architect on 2026-08-28, discharging the
follow-up BUG-043 §4 deferred by name. The third grammar (`root-gitignore.ts:41`) was found by
census, not by reading the Bug — BUG-043's own §4 mentions it only as "out of scope," and the M3
milestone plan's N7 says "note it in the report as the next instance of the class; do not touch
it." This CR is where it gets touched. Not yet human-approved.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] "Obsolete Logic" to be evicted is explicitly declared.
- [x] All impacted downstream Epics/Stories are identified and reverted to 🔴 High Ambiguity.
- [x] Execution Sandbox contains exact file paths.
- [x] Verification command is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
- [x] Existing Surfaces cites at least one source-tree path the CR extends.

**Held at 🟡 deliberately.** Five of six criteria are met literally. The sixth is human approval,
which an Architect cannot grant itself, and both §0.5 Open Questions are unresolved — the
module-vs-builder shape and whether `root-gitignore` anchoring rides along or gets its own
acceptance are decisions for the human, not defaults for a Developer to pick.
