# STORY-054-05 — Developer report

role: developer

## Execution route

`cleargate-cli/` (own git repo, gitignored in the outer meta-repo — no worktree, per M0
plan R7 / BUG-046). Worked in `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli` on
`story/STORY-054-05`, cut from QA-Red's commit `7778722`. Reads targeted `../` (the
meta-repo) for the canonical tree, per the promoted test file's own header.

## D1 — Promotion by `git mv`

```
git mv test/docs/gate-section-index-pinning.red.node.test.ts test/docs/gate-section-index-pinning.node.test.ts
```

No file remains at the `.red.` name. Matches R11's contractual path
(`readiness-gates.md:36`) and satisfies S7.

## D2 — Fixture (`test/fixtures/gate-section-index/expected-headings.ts`)

All 12 rows, exactly as authored (hand-read off `readiness-gates.md`'s `section(N)` +
each template's heading text — never off a resolver run; independently confirmed via a
scratch script importing the real `parsePredicate`, see Verification below):

| Key | Value |
|---|---|
| `epic.scope-in-populated` | `## 2. Scope Boundaries` |
| `epic.affected-files-declared` | `## 4. Technical Grounding (The "Shadow Spec")` |
| `story.implementation-files-declared` | `## 3. The Implementation Guide` |
| `story.dod-declared` | `## 4. Quality Gates` |
| `cr.blast-radius-populated` | `## 2. Blast Radius & Invalidation` |
| `cr.sandbox-paths-declared` | `## 3. Execution Sandbox` |
| `bug.repro-steps-deterministic` | `## 2. Reproduction Protocol` |
| `initiative.user-flow-populated` | `## 1. User Flow` |
| `initiative.success-criteria-populated` | `## 5. Success Criteria` |
| `hotfix.anomaly-populated` | `## 1. Anomaly` |
| `hotfix.files-touched-declared` | `## 2. Files Touched` |
| `hotfix.verification-steps-nonempty` | `## 3. Verification Steps` |

No `spike` row added (STORY-054-01 not landed). Comment budget: file header (3
invariants: hand-written/never-derived, full heading line, edit obligation) + exactly 7
inline row comments (epic ×2, cr ×2, hotfix ×3 — the rows where printed ordinal ≠ index),
3 of which cite BUG-042 by name (`epic.affected-files-declared`,
`cr.blast-radius-populated`, `cr.sandbox-paths-declared` — the three corrections it
actually made). The T5 trap (`epic.affected-files-declared` → `## 4. Technical Grounding
(The "Shadow Spec")`, single-quoted TS string for the embedded double quotes) landed as
specified and is covered by S1b.

## D3 / D4 — S3 → S3a + S3b

**S3a** (rename only, `findings[0].message` assertion added):
```
cr.sandbox-paths-declared: section(6) in CR.md resolves to "## Prior work", expected "## 3. Execution Sandbox"
```

**S3b (new).** Finding, before implementing: the TPV ruling block T3 in `plans/M0.md`
does **not** contain the S3b code or message strings the dispatch said were "given there
in full" — verified by `grep -c "S3b" plans/M0.md` (0 hits) across the full 429-line file
and by reading T3 in its entirety (prose only: "the resolution is a second insertion
point, not a changed one... Empirically verified against the canonical tree"). Rather
than halt the whole story over a mis-cited pointer, I derived S3b independently from T3's
prose requirement ("shifts two criteria at once") plus the Failure-message contract that
**is** given verbatim in the plan (§Test shape), then verified the exact output by
importing the real `parsePredicate` via `tsx` and running the checker's own logic against
the real canonical `CR.md` (script + output below). This is the same "verified by
execution" discipline TPV used throughout the plan, not a guess.

Insertion point: immediately after `## 1. The Context Override (Old vs. New)` (before
`## 2. Blast Radius & Invalidation`, i.e. earlier than S3a's point) — the only point that
shifts both BUG-042-corrected CR criteria. Two findings, message-asserted exactly:
```
cr.blast-radius-populated: section(3) in CR.md resolves to "## 9. Task Breakdown", expected "## 2. Blast Radius & Invalidation"
cr.sandbox-paths-declared: section(6) in CR.md resolves to "## Prior work", expected "## 3. Execution Sandbox"
```
`findings.length === 2` — the shape S3a alone cannot distinguish a truncating checker
from an exhaustive one.

## D5 — File header rewrite

Replaced `RED PHASE` / "8 of 13" language with the green-state description (14 test()
cases, all green), stated S2/S3a/S3b/S5 are permanent mutation guards (not transient
red), kept the "why in-memory, not tmpdir" pointer (the block itself, further down the
file, was untouched) and added the "why canonical, not live/payload" rationale verbatim
from the M0 plan's §Test shape (it did not previously exist anywhere in this file — only
in the plan doc), and added the T2 edit-obligation note (`TEMPLATE_FOR` in this file +
`expected-headings.ts`, both required).

## D6 — Additive only / scope

No existing assertion deleted, weakened, or re-scoped beyond the sanctioned S3→S3a
rename. No extraction to `test/helpers/` (T1). `readiness-predicates.ts` untouched.
`cleargate-cli/src/**` diff is empty for the whole branch (`git diff main..HEAD --stat --
src/` → no output).

## D7 — S1b

Green on first authoring, as TPV predicted — no escalation needed. Confirmed both by the
in-suite run and by an independent script that imports the real, exported
`parsePredicate` (not reimplemented) and runs the checker's own resolution logic against
the real canonical tree: `S1b findings (should be empty): []`, `criteria count: 14
pinnable: 12`.

## Verification

`npm --prefix cleargate-cli run typecheck` — clean, exit 0, no output.

Isolated file run (`npx tsx --test ... test/docs/gate-section-index-pinning.node.test.ts`):
```
tests 14
pass 14
fail 0
skipped 0
```
All 13 QA-Red-authored cases plus S3b pass; S7 goes green automatically on the D1 rename.

Fixture-removed regression check (mandatory, non-trivial logic): moved
`expected-headings.ts` aside and reran — `S1b`, `S2a/b/c`, `S3a`, `S3b`, `S5a`, `S5b` all
fail with the `requireFixture()` diagnostic (`expected-headings.ts not found...`); moved
the fixture back — full green again. Confirms the new tests are not vacuous.

`npm --prefix cleargate-cli test` (full suite): `tests 2493, pass 2491, fail 1, skipped
1`. The one failure — `test/commands/sync.node.test.ts` "exits 2 when no MCP URL or token
is configured" — is unrelated: it expects a config-error message but this sandbox has no
outbound network (`curl --max-time 3 https://cleargate-mcp.soula.ge/` → unreachable, exit
`000`), so the CLI reports `fetch failed` before it can reach the assertion under test.
Confirmed pre-existing/environmental, not introduced by this story: my diff touches only
`test/docs/gate-section-index-pinning.node.test.ts` and
`test/fixtures/gate-section-index/expected-headings.ts`; `sync.node.test.ts` is untouched
and its failure has nothing to do with gate-index resolution.

## Commit

`c79f615` on `story/STORY-054-05`:
`feat(EPIC-054): STORY-054-05 pin every gated section index to the heading it names`

No `--no-verify`. Pre-commit hooks ran clean (the surface-gate rename was accepted as the
sanctioned promotion path; no `SKIP_RED_GATE` needed).

STATUS=done
