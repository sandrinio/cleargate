# BUG-090 Architect post-flight (live) on the integrated tree

role: architect

```
VERDICT: PASS
SUBJECT: cli story/BUG-090 @ 2e63854 (integrate merge of main c5a311e over Dev f31c684); outer .worktrees/BUG-090 @ 398dfac3 + 5 uncommitted twins
C4_FREEZE: intact. contract/S-41-fence = f31c684; git diff f31c684 2e63854 -- assert_story_files.mjs is empty
BLOCKING_FINDINGS: none
```

Sprint goal served: "freshly scaffolded work items ... start gating". On the integrated tree, an `<instructions>`-led story that was scaffolded and then approved passes `init_sprint.mjs` (I1/I2 2/2). Close Steps 2.6c and 2.9 read fences behind `<instructions>` with byte-exact writes. The Step-2.9 census over the real corpus is unchanged.

Scope of this pass: read-only. I ran solo `npm run test:file` from `<cw>`, plus scratch fixtures under the session scratchpad (`arch090/`, `splice-runs/`). I made no commit, stash, build, prebuild or harness run. `<cw>` `git status --porcelain` is empty before and after. `<ow>` shows exactly the 5 twins before and after.

## Check 1: census parity (shipped JS port against the TS locator)

- **Side-by-side read.**
  - `scaffold/core/.cleargate/scripts/assert_story_files.mjs:157-244` (`linesOf`, `isFenceStart`, `locateFrontmatterFence`) against `src/lib/frontmatter-locator.ts:37-121`.
  - Mechanical check: I stripped the TS type annotations and non-null `!` from both, removed comments and blank lines, then ran `diff`. **Exit 0, no hunks.** So the port is token-identical, not just test-equivalent.
- **Framing rules, each at the same line in both files:**

  | Rule | JS | TS |
  |---|---|---|
  | `<instructions>` / `</instructions>` exact-line (`===`) | `:211,214` | `:88,91` |
  | Markdown fence opener `/^ {0,3}(`{3,}\|~{3,})/` (0–3 space indent) | `:178` | `:58` |
  | Closer `/^ {0,3}(`+\|~+)\s*$/` with the same char and length `>=` | `:206-207` | `:83-84` |
  | Header opener/closer strict `=== '---'` (so `--- `, `----` and `  ---` are not fences) | `:223,228` | `:100,105` |
  | BOM stripped on line 0 only, `start` +1 | `:201,230` | `:78,107` |
  | Unterminated EOL-less opener throws | `:224` | `:101` |
  | Three throw messages, byte-identical | `:224,238,241,242` | `:101,115,118,119` |

  `grep` for the U+FEFF bytes hits exactly `:201,230` (JS) and `:78,107` (TS).
- **Parity test, solo from `<cw>`:** `test/scripts/frontmatter-fence-parity.red.node.test.ts` gives **21/21** (F1–F21, including the FW-A16 additions F14–F21).
  - It imports the real canonical script through `canonicalPath()` (`:44-45`) and the real TS module (`:49`), so neither side is a copy.

## Check 2: splice correctness (Step 2.6c write path, `close_sprint.mjs:607-616`)

- **Code.** The splice follows the plan (a) pin exactly.
  - `fenceYaml` (`:255-264`) returns `null` on a throw or on null.
  - `setFrontmatterStatusAtomic` throws `No frontmatter in …` before any `writeFileSync` (`:610`).
  - It splices `raw.slice(0, yamlStart) + newFm + raw.slice(yamlEnd)` (`:612`), then writes a tmp file and renames it.
  - No `^---` regex or `fm[1]` remains in the file. Base sites `:250/:587/:1035/:1053` are all replaced (`readFmStatus :267-277`, `parseFrontmatterFields :1057-1066`, `parseDeferredVerifications :1075-1078`).
- **CRLF.** The splice never inserts a line, so `span.eol` is not needed. The one-line replace `/^status:.*$/m` keeps CRLF because JS `.` and m-flag `$` both stop before `\r`. Measured, not inferred.
- **End-to-end runs of the real canonical script**, which is cmp-identical to the `<ow>` twin, with the plan's `walkActiveParents` stub:

  | Fixture | Result |
  |---|---|
  | S1: CRLF, `<instructions>`-led, col-0 `status: "Draft"` inside the preamble | flipped and archived. Bytes `===` the original with only the fence's `status: "Active"` changed. 14/14 CRLF kept, 0 bare LF, preamble byte-identical |
  | S4: BOM + `---`-led | bytes `===` expected; BOM kept |
  | S2: unterminated `<instructions>` (locator throws) | `Step 2.6c warning: parent rollup unavailable: No frontmatter in …`. Pending bytes unchanged, not archived, 0 `.tmp.` leftovers |
  | S3: no frontmatter (null) | same warning; bytes unchanged, not archived |
  | S5: CRLF `<instructions>`-led already-Completed (no-op path via `readFmStatus`) | archived byte-identical |

- **Sealed coverage.** `close-sprint-fence.red.node.test.ts` gives **4/4** solo. It has no CRLF case, which is why I ran S1/S5.
- **Corpus write-equivalence, in memory, no writes.** For all 553 `---`-led delivery files, the old `raw.replace(fm[1], …)` and the shipped splice give **identical bytes (553/553)**. For the 5 `<instructions>`-led files, the bytes outside the YAML span are preserved (5/5).

## Check 3: no-new-file rule

- `git -C <cw> diff --name-status c5a311e 2e63854 -- scaffold/` lists 5 `M` and no `A` or `D`. An AD filter over `scaffold/`, `copy-planning-payload.mjs`, `scaffold-layout.mjs` and `manifest-builder.ts` is empty.
- `git ls-tree` of `scaffold/core` has 66 files at both commits. `--summary` shows no mode change, and all 5 files are 644.
- Worktree build: `templates/cleargate-planning` holds **80** payload files plus `MANIFEST.json` (74 entries). The 5 payload copies are cmp-equal to canonical.

## Check 4: import coupling

- Canonical and `<ow>` `close_sprint.mjs:85` read `import { locateFrontmatterFence } from './assert_story_files.mjs';`. The file sits in the same directory in both trees, so the relative path is correct.
- `assert_story_files.mjs` has one transitive import, `./lib/work-item-id.mjs` (`:110`). It is present and cmp-equal in live `<ow>`, canonical and payload.
- The `isMain` guard (`:337-338`) prevents `main()` on import.
- **Link witnesses: all print usage and exit 2, with no SyntaxError.**
  - `(cd <ow> && node .cleargate/scripts/close_sprint.mjs)`
  - the same command by absolute path from `/private/tmp`
  - `(cd <ow> && node .cleargate/scripts/assert_story_files.mjs)`
  - canonical `close_sprint.mjs`
  - payload `close_sprint.mjs`
- **Target-repo coupling.** The payload MANIFEST gives `assert_story_files.mjs`, `close_sprint.mjs` and `lib/work-item-id.mjs` all `script / always / core`, so `upgrade` moves the pair together. The templates are `merge-3way`.

## Check 5: `approveProbeStory` consumers and `approved:` in templates

- **The flip** (`scripts/clean-room/probe-items.mjs:69-75`) matches the pinned shape exactly: status anchor first, more than one `^approved:` throws, exactly one is flipped in place, none gets the legacy insert.
- **Templates.** One bare `approved: false` directly after `status:`: `epic.md:44`, `story.md:75`, `hotfix.md:36`. No column-0 `approved:` exists inside any `<instructions>` block. The hotfix `:112` mention is a `- [ ]` bullet.
- **Consumers on the integrated tree** (including -10 pass C/D brought in by the merge):

  | Consumer | Call | Agrees? |
  |---|---|---|
  | `claude-baseline.mjs:285` | `approveProbeStory(raw)`, instructions intact | yes: flips the scaffolded key |
  | `codex-hooks.mjs:372` | `approveProbeStory(stripInstructionsBlock(raw))` | yes: `stripInstructionsBlock` (`:87-100`) removes only the block, and the key survives |
  | `codex-hooks-harness.red` R-X5 | strip, then approve, then `runCanEdit` allowed | 2/2 solo |
  | `clean-room-evidence.red` E5 | E5-1 (epic `approved_by/at` after `status:`), E5-4 (`/^status: .*\napproved: true$/m`), E5-6 | 6/6 solo |
  | `template-approved-key.red` | T1–T7 | 7/7 solo |
  | `sprint-init-fresh-install.red.integration` | `new` gives one `approved: false`; flip; `init_sprint.mjs` in the room | 2/2 solo |
  | -13 (unbuilt) | `M6.md:692,770,1493` say "approval stays `approveProbeStory`" and "must not add a second `approved:` line" | consistent; see follow-up 4 for the stale `M6.md:954` wording |

- **The other (b) consumers.**
  - `push.ts:271-279` is the pinned (c) block verbatim. The false-path text is byte-identical.
  - `doctor.ts` numstat is `0 2`. The two deleted sniffs sat in `runSessionStart` and `runCanEdit`. The remaining sniff is `:887` `runPricing`, which is BUG-098's. The `parseFrontmatter` throw on no fence (`src/wiki/parse-frontmatter.ts:25-28`) lands in the existing `catch { continue; }` (`doctor.ts:774-778`, `:1057-1061`).
  - Unchanged as ruled: `sync.ts:478` `=== true`; `lifecycle-reconcile.ts:777/912`, which stays positional and is BUG-098's; and `new.ts`, which passes the key through (witnessed by I1).

## Check 6: Step-2.9 equivalence census (shipped `<ow>` script, read-only)

This ran as `(cd <ow> && node --input-type=module -e …)`. It imports `./.cleargate/scripts/assert_story_files.mjs` and slices the **shipped** `fenceYaml`, `parseFrontmatterFields` and `parseDeferredVerifications` source text out of `<ow>/.cleargate/scripts/close_sprint.mjs`, with no re-typing. It compares them against the base `c5a311e` parsers over `OUTER/.cleargate/delivery/{pending-sync,archive}/*.md`.

| Measure | Value |
|---|---|
| files | 558 |
| `locateFrontmatterFence` throws | **0** |
| nulls | 0 |
| old `^---\n` hits | 553 |
| `---`-led field-map diffs, old vs new | 0 |
| `---`-led deferred-entry diffs | 0 |
| SPRINT-41 deferred set (new) | **[STORY-058-09, STORY-058-10, STORY-058-13]** |
| SPRINT-41 deferred set (old) | identical, entries identical |

There is no delta against the plan. The three items are still `---`-led, with unquoted `sprint_cleargate_id: SPRINT-41`, and their `blocks: close` commands point at the `claude-baseline` / `codex-hooks` / `codex-loop` `check --write-result` paths.

## Check 7: C4 contract freeze

- `git -C <cw> diff f31c684 2e63854 -- scaffold/core/.cleargate/scripts/assert_story_files.mjs` is **empty**.
- `git diff --stat f31c684 2e63854` over all 16 BUG-090 files is empty too. The integrate merge changed only upstream files: 5 `scripts/clean-room/*.mjs`, `init-fixture.ts`, and the new `init-fixture-cleanup.red`.
- `contract/S-41-fence` resolves to `f31c684`, and `story/BUG-098` tips at `f31c684`. BUG-098 builds on exactly the shipped interface:
  - `locateFrontmatterFence(raw) → {start,end,yamlStart,yamlEnd,eol} | null` with the 3 messages;
  - `assertWorkItemApproved(filePath) → {approved, has_heading}`;
  - the 5 rows.
- No SHA needs recording in sprint §4 under the contract change rule.

## Deviations (BUG-090-dev.md `plan_deviations`, plus the integrate report, which declares none)

| # | Deviation | Ruling | Architectural reason (file:line) |
|---|---|---|---|
| 1 | `assertWorkItemApproved` keeps the two-line `approvedMatch` form instead of plan (a)'s one-line `.test()` | **ACCEPT** | FW-A16 K-gate 2 (plan `M5-fixwave.md:1206`) supersedes the (a) snippet. The shipped `assert_story_files.mjs:280` is `grep -xF`-identical to base `:168`, and the semantics are identical. The fail-closed path is intact: `span=null` on a throw (`:269-274`), and A10 is green |
| 2 | Twins copied before the cli commit | **ACCEPT** | Moot at integration. Rule 21 discarded the build copies and re-derived them from the integrated canonical (integrate report §4). I re-ran `cmp` on the 5 `<ow>` twins against `<cw>` canonical: all identical |
| obs | Two consecutive blank lines left at `doctor.ts:771-772` and `:1054-1055` | **ACCEPT** (cosmetic) | K-gate 1 pins numstat to exactly `0 2`, so removing the residue would break the gate. See follow-up 3 |

## Non-blocking follow-ups

1. **2.6c phantom-led parent.** `setFrontmatterStatusAtomic` never checks that a `status:` line was replaced.
   - On a P2 phantom-led parent (the BUG-067 signature), the located block has no `status:`. The write is a no-op, yet the caller (`close_sprint.mjs:649-676`) archives the file and logs `→ Completed` while the real `status: Active` stays.
   - Measured byte-identical on base `c5a311e`, so this is pre-existing and not a regression.
   - Fix shape: throw when `fieldRx` does not match. Route it to BUG-098 or a new bug.
2. **2.6c failure behaviour.** A malformed-framing parent (the locator throws) surfaces as `No frontmatter in …`, and one bad parent aborts every remaining flip through the outer catch (`:716-718`). The plan pinned this as "unchanged". A per-parent try/catch with a distinct "unreadable frontmatter framing" message would localize the failure.
3. **Blank-line residue.** Drop the two blank lines in `doctor.ts` during BUG-098, which already edits `doctor.ts` at `:887`.
4. **Stale -13 plan wording.** `M6.md:954` says `assert_story_files.mjs`'s regex (`/^---\r?\n/`). After this merge it is `locateFrontmatterFence`. -13 QA-Red must not pin the old regex, and `M6.md:1493` already carries the flip.
5. **Correction card after the DevOps merge, not before.** The orchestrator adds one correction card at D9. Several FLASHCARD lines turn stale once this lands:
   - "Step 2.6c 'no-op' silently skips archiving an `<instructions>`-led Completed parent";
   - "assert_story_files' offset-0 regex approves a `----`-closed block";
   - "assert_story_files.mjs:162 anchors ^--- at offset 0";
   - "doctor runCanEdit/runSessionStart skip `<instructions>`-led items".
6. **Merge-lane reminder.** The 5 twins land in ONE outer commit, because `close_sprint.mjs` fails ESM link without the new export. After D2, `node .cleargate/scripts/close_sprint.mjs` in the outer main checkout must print usage and exit 2.
7. **Outer main checkout.** It shows `M` on about 30 `delivery/pending-sync/*` files. Those were present at dispatch start (another lane's merge-lane full-suite back-sync). This pass only read them for the census and wrote nothing there except this report.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked. Every command was a read, a solo `npm run test:file` from `<cw>`, or a node probe against fixtures in the session scratchpad.

```yaml
flashcards_flagged:
  - "2026-09-26 · #close-gate #frontmatter · 2.6c flips a phantom-led parent as a no-op write (no status in phantom) yet archives it and logs Completed."
  - "2026-09-26 · #close-gate #frontmatter · close_sprint 2.6c: one parent whose framing throws aborts every remaining flip, logged as 'No frontmatter'."
  - "2026-09-26 · #frontmatter #crlf · JS . and m-flag $ stop before \\r: a one-line replace in a CRLF YAML slice keeps CRLF; span.eol not needed."
  - "2026-09-26 · #review #locator · Port-parity review: strip TS types and non-null !, then diff bodies; an empty diff backs the fixture table."
```
