---
bug_id: BUG-064
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Draft
severity: P2-Medium
reporter: orchestrator
approved: false
area: planning-layer
context_source: verified codebase grounding — hit live while amending CR-107 during SPRINT-39 wave 10; the predicate source was read directly at cleargate-cli/src/lib/readiness-predicates.ts:936 and the extraction reproduced standalone against the same regex; no prior approval, filed for triage
created_at: 2026-08-29T00:00:00Z
updated_at: 2026-08-29T00:00:00Z
created_at_version: cleargate@0.24.2
updated_at_version: aaabd9ef-dirty
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
  last_gate_check: 2026-08-29T10:20:45Z
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

# BUG-064: `existing-surfaces-verified` invents a phantom path from any dot-directory citation and blocks the gate on it

## 1. The Anomaly (Expected vs. Actual)

`existing-surfaces-verified` extracts path-shaped substrings from `## Existing Surfaces`
and fails the gate for any that do not exist on disk. Its extractor
(`cleargate-cli/src/lib/readiness-predicates.ts:936`) requires every path to end in a
file extension:

```js
const PATH_RE = /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_./-]*\.[a-zA-Z]{1,5}(?::[a-zA-Z0-9_]+)?/g;
```

A **dot-directory segment** satisfies `\.[a-zA-Z]{1,5}` just as well as a file extension
does. So when a citation names a *directory* under a dot-directory, the regex backtracks
to the dot-directory's own leading dot, caps the "extension" at five characters, and
emits a string the author never wrote.

**Expected:** citing `cleargate-planning/.cleargate/scripts/test/` either resolves to that
directory (it exists) or is not treated as a path at all.

**Actual:** the extractor emits **`cleargate-planning/.clear`**, that phantom fails
`fs.existsSync`, and the gate reports:

```
❌ existing-surfaces-verified: cited paths do not exist on disk: cleargate-planning/.clear
```

`cleargate-planning/.clear` appears **nowhere in the document**. The author is told a path
they never wrote is missing, with no indication of which real citation produced it.

The same mangling hits ordinary **dotfile** citations, which are files, not directories:
`cleargate-cli/.gitignore` becomes `cleargate-cli/.gitig`.

## 2. Reproduction Protocol

1. **Reproduce the extraction standalone against the shipped regex.** Deterministic, no fixtures.

```bash
node -e '
const PATH_RE = /[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.\/-]*\.[a-zA-Z]{1,5}(?::[a-zA-Z0-9_]+)?/g;
for (const c of [
  "cleargate-planning/.cleargate/scripts/test/",
  "cleargate-planning/.claude/agents/",
  "cleargate-cli/.github/workflows/",
  "cleargate-cli/.gitignore",
  ".cleargate/delivery/pending-sync/",
]) console.log(c.padEnd(46), "->", JSON.stringify(c.match(PATH_RE)));
'
#   cleargate-planning/.cleargate/scripts/test/   -> ["cleargate-planning/.clear"]
#   cleargate-planning/.claude/agents/            -> ["cleargate-planning/.claud"]
#   cleargate-cli/.github/workflows/              -> ["cleargate-cli/.githu"]
#   cleargate-cli/.gitignore                      -> ["cleargate-cli/.gitig"]
#   .cleargate/delivery/pending-sync/             -> null
```

2. **Confirm the real directories exist**, so the gate failure is pure extraction error and not a genuine missing surface.

```bash
for p in cleargate-planning/.cleargate/scripts/test cleargate-planning/.claude/agents; do
  [ -e "$p" ] && echo "EXISTS $p" || echo "MISSING $p"
done
#   EXISTS cleargate-planning/.cleargate/scripts/test
#   EXISTS cleargate-planning/.claude/agents
```

3. **Reproduce end-to-end through the gate.** Add one line to any CR's `## Existing Surfaces` section citing a dot-directory, then run the gate. Removing that one citation restores a 9/9 pass with no other change.

```bash
node cleargate-cli/dist/cli.js gate check .cleargate/delivery/pending-sync/CR-107_Sprint_Merge_Requires_PR.md -v
#   ❌ existing-surfaces-verified: cited paths do not exist on disk: cleargate-planning/.clear
```

4. **Confirm the reported string appears nowhere in the document** — this is the diagnostic half of the defect. The only hit is the `cached_gate_result` block the gate itself just wrote.

```bash
command grep -n 'cleargate-planning/\.clear' .cleargate/delivery/pending-sync/CR-107_Sprint_Merge_Requires_PR.md
```

5. **Measure the corpus blast radius** — how many drafted items already cite a dot-directory inside a prefixed path.

```bash
command grep -rlE '`[A-Za-z0-9_.-]+/\.[a-z]+/' .cleargate/delivery/pending-sync/*.md | wc -l
```

## 3. Evidence & Context

- The phantom is **deterministic and silent about its own origin**. The failure detail
  names `cleargate-planning/.clear`; nothing in the message connects it to the real
  citation, and grepping the document for the reported string finds only the frontmatter
  `cached_gate_result` the gate itself just wrote.
- **`.cleargate/` and `.claude/` are the two most-cited directories in this framework.**
  Every citation of the form `<repo>/.cleargate/...` or `<repo>/.claude/...` that does not
  terminate in a real file extension is affected. The meta-repo's own dogfood split makes
  `cleargate-planning/.claude/**` and `cleargate-planning/.cleargate/**` routine citations.
- A **bare** dot-directory path is safe: `.cleargate/delivery/pending-sync/` matches
  nothing, because `PATH_RE` needs a `/`-terminated segment *before* the dot-segment. The
  defect requires a preceding path component — which is exactly the cross-tree form the
  dogfood split forces.
- Dotfile citations are mangled too (`.gitignore` -> `.gitig`), so the defect is not
  confined to directories.
- The comment above `PATH_RE` (`:931-935`) states the intent: *"Requires at least one '/'
  separator before the extension — rejects bare filenames (init.ts), dotted code
  references (state.execution_mode), and bare dotfiles (.gitignore)."* It rejects a
  **bare** dotfile; it does not consider a **prefixed** one, and it never considers a
  dot-directory in the middle of a path.
- Failure mode class: a derived value that is **wrong rather than absent**, so nothing
  raises at the point of error and the diagnostic points away from the cause — the same
  shape as [[BUG-042]], [[BUG-048]] and [[BUG-063]].

## 4. Execution Sandbox (Suspected Blast Radius)

- `cleargate-cli/src/lib/readiness-predicates.ts` — `PATH_RE` at `:936` and the
  extraction/dedup at `:937-940`. This is the only surface that needs to change.
- `cleargate-cli/test/` — regression coverage for the dot-directory and dotfile forms.

**Do NOT modify:** the existence check, the sandbox check, or the sentinel-phrase branch.
The bug is entirely in extraction; the rest of the predicate is correct.

**Interaction:** [[BUG-062]] covers blind edges in the *collision* surface extractor. This
is a different extractor in a different file with a different regex; they share a family
but not a code path. Fixing one does not fix the other.

## 5. Verification Protocol (The Failing Test)

**Command:** `npm --prefix cleargate-cli test`

1. **The failing test.** A `## Existing Surfaces` section citing
   `cleargate-planning/.cleargate/scripts/test/` passes the predicate. **Must fail against
   the current tree**, where it yields `cleargate-planning/.clear`.
2. A citation of `cleargate-planning/.claude/agents/architect-synth.md` — a real file
   *under* a dot-directory — still resolves to that exact path and still passes. Guards
   against a fix that discards dot-segments wholesale.
3. `cleargate-cli/.gitignore` resolves to `cleargate-cli/.gitignore`, not `…/.gitig`.
4. A genuinely missing path still fails, and the reported string is the path **as written
   in the document** — never a substring of it. This is the diagnostic half of the defect
   and needs its own assertion.
5. Regression: every currently-green item in `.cleargate/delivery/pending-sync/` stays
   green. Run the gate across the corpus before and after and diff the pass/fail sets.

**Note on acceptance:** a fix that merely makes the phantom *exist* (e.g. by resolving
directories) is not sufficient — criterion 4 is what stops the next reader from spending
the diagnosis time this bug cost. The reported path must be the author's text.

## Prior work

- `cleargate wiki query "readiness predicate path extraction existing surfaces"` → **none found**.
- [[BUG-063]] — `check:no-inline-id-regex` misses every capture-group form. Same family:
  a regex-driven gate whose pattern silently mis-handles the common shape. Filed one day
  earlier, from the same sprint.
- [[BUG-062]] — collision extractor blind edges and prose. Sibling extractor defect, different file.
- [[BUG-042]], [[BUG-048]] — silently-wrong derived values; this is the same failure class.
- [[CR-107]] — the item that hit this live; its F5 clause was rewritten to route around the
  defect rather than wait on the fix.
- No prior item covers `readiness-predicates.ts` path extraction.

## Context Source

**context_source:** Hit live on 2026-08-29 while recording M4 finding F5 into [[CR-107]]'s
`## Existing Surfaces` section during SPRINT-39 wave 10. The gate flipped from 9/9 to a
failure naming a path absent from the document; `readiness-predicates.ts:936` was read
directly and the extraction reproduced standalone against the same regex. CR-107 was
unblocked by rephrasing the citation, so this bug blocks nothing today — it is filed
because the next author to cite a dot-directory will lose the same diagnosis time.

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟡 Medium Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [ ] `approved: true` is set in the YAML frontmatter.
