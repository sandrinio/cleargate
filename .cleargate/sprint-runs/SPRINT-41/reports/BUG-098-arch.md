# BUG-098 architect post-flight (live, integrated tree)

role: architect

```
VERDICT: PASS
TREE: cli <cw> 9b2abf0 (Dev 9970c10 + integrate of cli main 984e8d5); outer <ow> 0a91f267 + 2 uncommitted twins (cmp-equal)
BLOCKING: none
REQUIRED BEFORE DEVOPS (rule 21, process not defect): re-integrate. cli main moved 984e8d5 -> 6fc13d2 (CR-124) and sprint/S-41 moved to 01fd3bbc after this integrate. Forecast: one tail conflict in test/helpers/init-fixture.ts only; outer merge clean.
```

Sprint goal served: "freshly scaffolded work items stop corrupting and start gating". On 9b2abf0, all 6 TS writers and the dedupe script write only inside the located span. None of them writes a file whose framing the locator rejects, or whose YAML is malformed. `parent-approved` now reads `<instructions>`-led initiative and proposal parents. A key that appears only inside `<instructions>` never passes the gate.

Independent evidence, beyond the reports:
- Solo reruns in `<cw>`, all green: `sprint-frontmatter-fence` 5/5, `lifecycle-reconcile-fence` 2/2, `frontmatter-yaml-splice` 4/4, `doctor-fence` 3/3, `gate-unit` 30/30, `scripts-fence-bug098` 4/4, `test_prep_reporter_context` 2/2, `dedupe-frontmatter` 5/5.
- Four tsx probes in the session scratchpad, since deleted: writer edge cases, a writer old-vs-new diff against a `git archive 984e8d5` copy, the parent-approved gate matrix on base and on BUG-098, and the 2.6d and audit-status behaviour.
- `<cw>` and `<ow>` git status is unchanged from dispatch start: `<ow>` still shows only the 2 twins.

## Check 1: the writers

The plan's list is confirmed: sites 2, 3, 4, 5, 11 and 12 are the 6 TS writers (`M5-fixwave.md` site table). Site 15 (`dedupe_frontmatter.mjs`) reads and writes, so it is checked as a seventh writer.

| # | Writer (9b2abf0) | Write path | Bytes outside span | Locator throw | Malformed YAML |
|---|---|---|---|---|---|
| 2 | `--allow-drift` waiver, `sprint.ts:403-417` | `rewriteFrontmatter` → `withFrontmatterYaml` (`:835`); writes only if the result differs (`:417`) | S1/S2 exact bytes; QA live smoke on real templates | `framingError` → `raw`, no write (`:779`, `:833`); QA live sha256-identical | `span && !parseOk` → `raw` (`:837`); S5 |
| 3 | `stampFile`, `sprint.ts:864-870`, archive loop `:1168-1173` | `rewriteFrontmatter` | S6; my probe: preamble, BOM and body identical | returns `raw`, but the caller still writes the same bytes and archives. See follow-up 1 | returns `raw`, same caller note |
| 4 | `stampSprintClose`, `sprint.ts:883-912` | `rewriteFrontmatter`; `didChange:false` and no write when the result is unchanged (`:906-909`) | S3; probe on LF, CRLF, BOM, BOM-led, mixed EOL, no trailing EOL, empty block: all `outsideOk=true` | probe on unterminated `<instructions>` and unterminated header: `didChange:false`, bytes unchanged | probe: `didChange:false`, bytes unchanged |
| 5 | `setFrontmatterFieldAtomic` (2.6d), `lifecycle-reconcile.ts:781-804` | `withFrontmatterYaml` (`:800`), tmp+rename (`:801-803`) | L1/L2 whole-file compare; probe: the decoy inside `<instructions>` is untouched | `null` or a throw → `No frontmatter in` (`:791`), no write | n/a: this is line surgery with no YAML parse, as the plan pinned |
| 11 | `upsertFrontmatterField`, `contradict.ts:502-531` | `withFrontmatterYaml` (`:530`) | C1 whole-file compare | returns `raw` (`:504-509`). The caller `stampContradictSha` still writes the same bytes (`:488`), as it did before this item | n/a: line surgery |
| 12 | `applyStatusFix`, `wiki-audit-status.ts:256-278` | `withFrontmatterYaml` (`:277`); returns `raw` when nothing was replaced (`:275`) | W1 whole-file compare | returns `raw` (`:258-262`). The caller writes the same bytes (`:243`) | n/a: line surgery |
| 15 | `dedupe_frontmatter.mjs:64-77`, rebuild `:200-216` | splices `raw.slice(0,yamlStart) + cleaned + raw.slice(yamlEnd)`; writes only when the result differs (`:210`) | DD1/DD2 whole-file compare | `parseFmLines` → `null` → skipped (`:66-71`) | n/a: line surgery |

- **Old vs new, `---`-led, probe on `stampSprintClose`:**
  - LF with one blank line: byte-identical to 984e8d5.
  - LF with two blank lines: byte-identical.
  - LF with no blank line: the separator is now preserved. This is the plan's deliberate change.
  - Malformed YAML: 984e8d5 replaced the block with two keys, losing data. 9b2abf0 does not write.
  - CRLF: 984e8d5 planted a phantom LF block, because `lines[0] !== '---'` fails on `---\r`. 9b2abf0 splices CRLF in place.
  - So the invariant also closes two data-loss paths on `---`-led files.
- **No-frontmatter fallback.** `rewriteFrontmatter`'s `!span` branch (`:838`) still writes a block at offset 0. My probe on an `<instructions>`-led file with no frontmatter at all showed that block in front of `<instructions>`. That is the pinned "only block" fallback, and the locator then finds it, so it is not a phantom that hides a real block.
- **Comments inside the span.** The sprint.ts writers re-dump the YAML (`dumpFrontmatterYaml`, `:800-810`), which drops inline `#` comments inside the span. This behaviour already existed for `---`-led files. It now reaches `<instructions>`-led templates, which carry comments: Sprint Plan Template frontmatter lines 41-44 and 66-68. See follow-up 4. It does not affect the invariant, which covers bytes outside the span.

## Check 2: readers and K1–K6

Every reader site locates the frontmatter first, then reads the located YAML:
- `sprint.ts:777/785` (`parseFileFrontmatter`; readers at `:313`, `:638`, `:1023`, `:1088`);
- `readiness-predicates.ts:440/442`;
- `doctor.ts:266`, then `frontmatterYaml` (runHookHealth);
- `doctor.ts:898` (runPricing), then `parseFrontmatter` as before;
- `slug.ts:166/171`;
- `intake.ts:268/273`;
- `frontmatter-merge.ts:93` goes through `parseFrontmatter`, which calls `locateFrontmatter` itself (`parse-frontmatter.ts:15,25`);
- scripts: `prep_reporter_context.mjs:91`, `dedupe_frontmatter.mjs:67`.

| K | Result |
|---|---|
| K1 | 8 TS files import from `frontmatter-locator` (`sprint.ts:54-59`, `lifecycle-reconcile.ts:23-28`, `readiness-predicates.ts:8`, `doctor.ts:14`, `slug.ts:14`, `contradict.ts:16-21`, `wiki-audit-status.ts:6-11`, `intake.ts:26`). `frontmatter-merge.ts` routes through `parseFrontmatter`, which is what the pinned "delete the guard" asked for. The helpers are defined at `frontmatter-locator.ts:135-147`, verbatim from the pinned shape. No private fence scan remains. |
| K2 | The FW-A17 grep over the 10 files hits only `frontmatter-locator.ts:8`, the existing BUG-067 doc comment. A broader grep over `src/` leaves only LEAVE sites: `page-schema.ts:117`, `code-map/page-schema.ts:89`, `push.ts:235`, `merge-ui.ts:33`, plus a comment at `stamp.ts:116`. |
| K3 | `trimStart().startsWith('---')` appears 0 times in `doctor.ts`. |
| K4 | `sprint.ts:833`, `if (parsed.framingError) return raw;`, is the first statement of `rewriteFrontmatter`. |
| K5 | `prep_reporter_context.mjs:48` and `dedupe_frontmatter.mjs:24` import `locateFrontmatterFence` from `./assert_story_files.mjs`. Dedupe is 755 in canonical (index `100755`) and in the live working copy. |
| K6 | `git diff --name-only ca18c73 9970c10` lists exactly the 12 allow-listed paths. `984e8d5..9b2abf0` gives 26 files: those 12, the 13 QA-Red test files and `init-fixture.ts`. |

## Check 3: `parent-approved` semantics

The change is at `readiness-predicates.ts:435-462`. The line parser is unchanged; only its input changed, from `lines.slice(1, closeIdx)` to `frontmatterYaml(raw, span).split('\n')`. I ran the gate matrix with `gateCheckHandler` and the `OR_GROUP_GATES_DOC` shape. Every case was evaluated.

| Parent fixture | 984e8d5 | 9b2abf0 | Expected |
|---|---|---|---|
| `---`-led `approved: true` | PASS | PASS | PASS |
| `---`-led `approved: false` | FAIL | FAIL | FAIL |
| `---`-led `status: "Triaged"` | PASS | PASS | PASS |
| `---`-led CRLF `approved: true` | FAIL | PASS | PASS (a false negative before) |
| `<instructions>`-led `approved: true` (decoy `false` in the example) | FAIL | PASS | PASS |
| `<instructions>`-led `Triaged` (decoy `Draft`) | FAIL | PASS | PASS |
| `approved: true` only in `<instructions>`, real header `false` | FAIL | FAIL | FAIL |
| `Triaged` only in `<instructions>`, real header `Draft` | FAIL | FAIL | FAIL |
| `approved: true` and `Triaged` only in `<instructions>`, real header lacks both | FAIL | FAIL | FAIL |
| `approved: true` in `<instructions>` and body, no real header | FAIL | FAIL | FAIL |
| unterminated `<instructions>` | FAIL | FAIL | FAIL (a throw lands in the outer catch → `{}`) |

- LF `---`-led behaviour is unchanged. `<instructions>`-led parents are now correct. No key inside `<instructions>` produces a false pass.
- R1/R2 kill first-fence and last-wins mutants. They cannot kill an "any line in the whole file" mutant. The shipped code is structurally locator-only (K1/K2), and the expect-FAIL rows above pin that behaviour.
- The second caller, `readiness-predicates.ts:880`, reads `---`-led wiki pages, so its semantics are unchanged.

## Check 4: scripts vs live twins; coupling with BUG-090

- **cmp.** `cmp <ow>/.cleargate/scripts/{prep_reporter_context,dedupe_frontmatter}.mjs` against `<cw>/scaffold/core/.cleargate/scripts/…`: both identical.
  - sha256: `6b3cf683…36a2` and `831b7c27…3fed`, matching the Dev report.
  - Modes: dedupe 755 on both sides; prep_reporter 644 on both sides (index `100644`). The integrate report's "both 755" note is wrong. QA already corrected it, and it has no consequence.
- **Coupling.** `<ow>`'s live `assert_story_files.mjs`, `close_sprint.mjs` and `lib/work-item-id.mjs` are cmp-equal to canonical, and the live export exists (grep count 1).
  - `assert_story_files.mjs` is safe to import: its `main()` sits behind `isMain` (`:401-402`, BUG-041), and its only non-node import is `./lib/work-item-id.mjs` (`:110`), which ships with it.
  - Link witnesses from `<ow>`: prep_reporter prints usage and exits 2; `dedupe --dry-run <empty dir>` prints `Dedupe complete: 0 would-rewrite, 0 skipped, 0 errors.` and exits 0.
- **Merge order.** BUG-090 is already on `sprint/S-41`: `git show sprint/S-41:.cleargate/scripts/assert_story_files.mjs` carries the export. BUG-098 does not touch `close_sprint.mjs` or `assert_story_files.mjs` (the diff is empty).
- **Shared locator.** The ESM pair uses BUG-090's parity-tested JS port. That is the shared locator, not a copy.

## Check 5: interaction with the BUG-090 post-flight follow-ups

**Follow-up 1** ("2.6c phantom-led parent no-op write still archives and logs Completed"). **Left, not worsened; incidence reduced.**
- The defect lives in `close_sprint.mjs` `setFrontmatterStatusAtomic` (`:607`) and its caller (`:649-676`). BUG-098 does not touch that file.
- BUG-098 closes the measured source of phantom-led sprint plans. The `--allow-drift` waiver planted a phantom holding only `context_source`, which is exactly the P2 no-`status` signature.
- `stampSprintClose` and `stampFile` also no longer plant phantoms, on `<instructions>`-led or CRLF files. Existing phantom-led files are not repaired.
- There is a TS sibling of the same class, now narrowed. `stampFile` returns `raw` for malformed YAML or framing, yet the archive loop (`sprint.ts:1168-1173`) still writes, moves the file and logs `archived:` with no stamp. Before this item, the same inputs were corrupted: the block was replaced, or a phantom was planted. Now the bytes are preserved but the archive is silent. See follow-up 1.
- On a phantom-led story, 2.6d `setFrontmatterFieldAtomic` appends `status`/`approved` into the phantom and archives it while the real block keeps `Draft` (probe). The old regex matched the phantom at offset 0 too, so this is unchanged.

**Follow-up 2** ("one malformed parent aborts all remaining 2.6c flips"). **Left in 2.6c. The TS 2.6d sibling is narrowed, not fixed.**
- `setFrontmatterFieldAtomic` throws for malformed framing (`lifecycle-reconcile.ts:791`). The loop (`:884-935`) has no per-story catch. The throw reaches `close_sprint.mjs:586-587` ("Step 2.6d warning: same-sprint backsync unavailable"), and every later story is skipped.
- Probe: a malformed story first in state.json left the following well-formed `<instructions>`-led story unflipped.
- Before BUG-098, every `<instructions>`-led story triggered this. Now only malformed framing does.

Both remain follow-ups; see the list below.

## Check 6: deviation rulings

| # | Source | Deviation | Ruling | Architectural reason (file:line) |
|---|---|---|---|---|
| 1 | Dev | An empty YAML block parses with `parseOk:true` | **ACCEPT** | An empty block is an empty mapping, not malformed input. The pinned wording would have made a fresh `---\n---` block unstampable forever. `sprint.ts:786`; probe "empty" stamps inside the span. Residue: `~` and comment-only YAML are still `parseOk:false` (probe: `didChange:false`), while `parseFrontmatter` maps null to `{}` (`parse-frontmatter.ts:48-50`). See follow-up 3 |
| 2 | Dev | The waiver write is skipped when unchanged | **ACCEPT** | This is stronger than the plan on "never writes". It applies the `stampSprintClose` equality rule to the waiver. `sprint.ts:416-417` |
| 3 | Dev | `applyStatusFix` returns `raw` when no `status:` line was replaced | **ACCEPT** | `withFrontmatterYaml` rejoins lines with `span.eol`, so splicing a mixed-EOL block is not an identity (probe: mixed-EOL round trip `false`). Skipping the no-op keeps those bytes. `wiki-audit-status.ts:275` |
| 4 | Dev | `upsertFrontmatterField` treats empty YAML as zero lines | **ACCEPT** | `''.split('\n')` gives `['']`, and a push would then emit a leading blank YAML line. This matches the old insert-before-closer behaviour. `contradict.ts:512,527-530` |
| 5 | Dev | Task Breakdown not ticked during the build | **ACCEPT** | The item file is owned by `sprint/S-41` (rule 21, orchestrator ticks after QA-Verify). The build forbids outer writes |
| 6 | Dev (inside the TPV brief) | Removed BUG-090's two double blank lines in doctor.ts | **ACCEPT** | This is BUG-090 follow-up 3, named in the TPV Developer brief. The `doctor.ts` hunks at `:776` and `:1071` are whitespace only |
| 7 | Integrate | Ticked Task Breakdown rows in `<ow>`, which also touched `wiki/bugs/BUG-098.md` and `wiki/log.md` | **REJECT (moot)** | A story-branch copy of a `sprint/S-41`-owned item conflicts at the outer merge, and it fires live ingest hooks in the worktree. The cited authority is wrong: FW-A17 item 6 is the K-gate list. The tick came from the Dev report's hand-off step 6. The orchestrator reverted it, and I verified that `<ow>` status is exactly the 2 twins. No action needed |
| 8 | Integrate report | Says "both scripts 755" | Correction only | Measured: prep_reporter 644 on both sides (index `100644`). No behavioural impact |

## Check 7: forward risk and merge-lane forecast

**cli re-sync (required, rule 21).**
- `git merge-tree 6fc13d2 9b2abf0` shows exactly one conflict: `test/helpers/init-fixture.ts`.
- CR-124's 11 other files (`CHANGELOG.md`, enforcement.md, `launch_wave.mjs`, Sprint Plan Template, 3 architect agents, SKILL, 3 tests) are disjoint from BUG-098's 25.
- The conflict is two interleaved tail hunks, because git aligns on the shared `: h; }, }, {` lines.
- Resolution (TPV int-B, rule 21):
  1. Keep main's 19 rows verbatim: -06, -07, -10 ×3, BUG-085 ×2, BUG-090 ×5, CR-124 ×6, and the shared STORY-058-11+CR-124 row.
  2. Append BUG-098's block, cut from the `  // ── BUG-098` header comment through its last `  },`.
  3. That gives 21 rows.
- Afterwards: rebuild the worktree, typecheck, run the 12 make-green files, e2e 1/1, and the M2 pair 5/5 + 15/15 (CR-124 and BUG-098 rows are both `scenarios: 'all'`), then `build-codex-payload --check`.
- **Carry-over condition for this verdict:** `git diff 9b2abf0 <re-integrate> -- src scaffold` must show only CR-124's files. BUG-098's src and scaffold bytes must be unchanged.

**Outer re-merge.**
- `git merge-tree sprint/S-41 0a91f267` is clean. CR-124's live twins (enforcement.md, `launch_wave.mjs`, Sprint Plan Template) do not overlap BUG-098's two twins.
- After the merge, run `cp` + `cmp` again from the re-integrated canonical.

**DevOps counts.** D4 becomes CR-124's post-merge total **+27**, not "T090+27". The replan supersession ("previous merge's total plus the item's own delta") already covers this. The payload diff still lists exactly the 2 scripts plus `MANIFEST.json`, as long as the pre-merge snapshot is taken immediately before the merge.

**-11 and -12.**
- File overlap with BUG-098 is `init-fixture.ts` only. I intersected each branch's diff from its merge-base (-11 from 984e8d5, -12 from d0f0d95) with BUG-098's 26 files.
- -12's `build-codex-payload.mjs`, `launch_wave.mjs`, codex hooks and agents do not intersect.
- `init-host-snapshot.red` compares path sets only, and BUG-098 adds no files.
- Both branches already conflict at the tail against `6fc13d2` (merge-tree). After BUG-098 lands, the tail gains 2 more main rows, and the same rule applies: upstream rows first, then the item's rows, deleting any identical shared row.
- BUG-098's rows are changed-file rows, so -11's added-file `captureOrCompare` extension does not reach them.
- **Plan correction.** The M5-fixwave collision note says the `gate check` hook path is untouched. It is touched: `readiness-predicates.ts` backs `parent-approved`. -11's 9-hook parity runs frozen and current hooks against the same dist, so both sides see the same change and parity holds. `runHookHealth` runs only in default doctor mode (`doctor.ts:1171-1172`), never in `--session-start`.
- -12 must re-run `build-codex-payload --check` after its own re-sync. It was exit 0 on 9b2abf0.

## Non-blocking follow-ups

1. **Silent unstamped archive.** When `stampFile` returns the input unchanged (malformed YAML or framing), `sprintArchiveHandler` still writes, moves the file and logs `archived:` (`sprint.ts:1168-1173`). Fix shape: skip or warn when the stamped text equals the raw text. Fold this into the fix for BUG-090 follow-up 1, which is the same class in 2.6c.
2. **2.6d abort-all.** Add a per-story try/catch in `reconcileCurrentSprintStories` (`lifecycle-reconcile.ts:884-935`) with a distinct "unreadable frontmatter framing" message. That localizes one malformed story. This pairs with BUG-090 follow-up 2 (2.6c).
3. **`parseFileFrontmatter` null/comment-only YAML.** It gives `parseOk:false`, so the block cannot be stamped. Align it with `parseFrontmatter`'s `null → {}`: set `parsed == null` → `fm:{}`, `parseOk:true` at `sprint.ts:787-795`.
4. **Comment loss inside the span.** The sprint.ts writers drop template inline comments through `yaml.dump`. This already happened for `---`-led files and now reaches fresh `<instructions>`-led items. Converting the waiver and stamps to line surgery (the contradict/audit pattern) would keep the comments. It is out of BUG-098's pinned shape.
5. **audit-status preview.** The `--fix` preview lines read the first `status:` in the whole file (`wiki-audit-status.ts:237-238`). On an `<instructions>`-led item whose example carries `status:`, both the `-` and `+` lines show the example (probe: `-status: "DECOY"` and `+status: "DECOY"`). The write itself is correct. Fix: derive both lines from the located YAML.
6. **Census residue in scripts, both inert today.**
   - `prep_qa_context.mjs:124` `parseFrontmatter` is an offset-0 regex with no caller (dead code).
   - `prefill_report.mjs:41` reads sprint reports, which are `---`-led by construction (the `push.ts:235` LEAVE class).
   - Delete the dead parser, or port it, when those files are next touched.
7. **Correction card at DevOps D9 (after the merge, not before).**
   - FLASHCARD lines 124, 125, 126 and 140 describe positional-read defects that this item fixes.
   - Line 125's residue (a malformed-only abort-all) moves to follow-up 2.
   - The card is in the YAML below, flagged for post-merge recording.

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked. Commands were read-only `git` (`diff`, `show`, `merge-tree`, `ls-files`, `log`), `cmp`, `stat`, `shasum`, solo `npm run test:file` in `<cw>`, two link-witness `node` runs from `<ow>`, and tsx probes in the session scratchpad, deleted afterwards. I made no commit, no stash, no build, no edit in either worktree or in the cli main checkout. This report is the only file written.

```yaml
flashcards_flagged:
  - "2026-09-26 · #frontmatter #sprint-init · sprint.ts waiver/stamp writers re-dump the located YAML via yaml.dump: template inline # comments are dropped."
  - "2026-09-26 · #frontmatter #wiki · audit-status --fix preview greps the first status: in the WHOLE file; <instructions> example lines are shown."
  - "2026-09-26 · #frontmatter #locator · withFrontmatterYaml rejoins lines with span.eol: a mixed-EOL block is no identity splice; skip no-op writes."
  - "2026-09-26 · #frontmatter #close · 2.6d: a malformed-framing Done story throws out of the loop; every later story in state.json stays unflipped."
  - "2026-09-26 · #review #test-harness · Old-vs-new diff: git archive <base> src into scratch, symlink node_modules, import both trees from one tsx .mts."
  - "2026-09-26 · #frontmatter #correction · BUG-098 merged: sprint.ts writers, 2.6d, parent-approved, slug, intake, doctor, 2 scripts read past <instructions>."  # record at DevOps D9 (post-merge); marks lines 124/125/126/140 stale
```
