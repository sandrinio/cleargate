# STORY-063-01: Architect post-flight (role: architect)

**Inputs**
- Developer commit `63c5018` on `story/STORY-063-01` (cleargate-cli).
- QA-Red commit `aa05d38`.
- Base `main` `455de32`.
- Plan: `plans/M1.md`, sections C1 and STORY-063-01.

**Why this ran:** the pre-gate scan was not run (it cannot see cli branches; orchestrator decision 2), so the safeguard required a live dispatch.

**Verdict: ARCH: PASS**

## What I ran (read-only)

| Command | Result |
|---|---|
| `node --test --import tsx/esm` on 4 files: `contradict-commit.red`, `contradict-commit-cli.red.integration`, `contradict.node`, `contradict-cli.node` | exit 0, all pass |
| `npx tsc --noEmit` | exit 0 |
| `node scripts/check-no-inline-id-regex.mjs` | exit 0 ("no inline work-item-id regexes") |
| A probe script (scratchpad) comparing `getBucketFromId` old vs. new on 20 inputs, plus hash, skip-reason and parse edge cases | see checks 1, 5 and 7 |

## Checks

### 1. Frozen contracts C1.1–C1.7: exact
- **C1.1** `contradictContentHash` (`src/lib/wiki/contradict.ts:72-76`):
  - Computes `body = span === null ? raw : raw.slice(span.end)`, then `createHash('sha256').update(body,'utf8').digest('hex')`.
  - `span.end` is `close.end` (`frontmatter-locator.ts:108`), which is the offset just after the closing `---` text. So the closing fence's EOL is the first byte of the body, as the plan specifies.
  - No normalization and no try/catch, so locator errors propagate.
  - The probe confirmed:
    - A change to the `<instructions>` preamble leaves the hash unchanged.
    - A BOM leaves the hash unchanged.
    - CRLF and trailing blank lines change the hash (no normalization or trimming).
    - An unclosed fence throws `locateFrontmatter: missing closing ---`.
  - The known-value vector holds. Independently, `printf '\n\nBody\n' | shasum -a 256` gives `df3f92281eb64a3ad584808458c0b482621ee9cde0b56c8cee01f11ca1cbe0a7`, which equals the `test/wiki/contradict-commit.red.node.test.ts:447` literal.
- **C1.2** `phase4SkipReason` (`:79-84`): returns `status=<s>`, else `approved=true` only for a strict `=== true`, else `null`. `preparePhase4` calls it first (`:180-183`), replacing the old inline filter.
- **C1.3** `parseFindings` (`:93-152`) behaves as the plan specifies:
  - JSON is tried first and must be an array.
  - It validates `neighbor` and `claim` per entry, and `draft` when present.
  - Text mode uses the plan's two regexes and rejects a summary count that does not match the parsed lines.
  - `[[ ]]` is stripped in both modes. Claim length is not enforced.
  - Empty input throws. All failures throw, so there is no partial return.
- **C1.4** `collectNeighborhood` is exported (`:420`). The body is unchanged.
- **C1.5** see check 5.
- **C1.6** `wikiContradictCommitHandler(opts: WikiContradictCommitOptions)` (`src/commands/wiki-contradict.ts:193`). Its fields are exactly `filePath`, `findingsPath?`, `stdin?`, `cwd?`, `now?`, `stdout?`, `stderr?` and `exit?`.
- **C1.7** `wiki contradict-commit <file>` with `--findings <file>` (`src/cli.ts:320-329`).

### 2. No second hash or status filter: confirmed
- `command grep createHash|PHASE4_TRIGGER_STATUSES|phase4SkipReason src/` finds the contradiction hash in `contradict.ts` only. The other `createHash` sites are unrelated and pre-existing: `dashboard/plan.ts`, `lib/sha256.ts`, `manifest-builder.ts`, `sync/work-items.ts`, `sprint-scope.ts`.
- Both callers use `contradictContentHash`:
  - `wiki-ingest.ts:338`
  - `wiki-contradict.ts:121` (prepare) and `:217` (commit)
- The status filter exists only in `phase4SkipReason`.

### 3. `wiki-ingest.ts` hunk: confined to Phase 4
- The diff touches only the import block (`:40`, `:42`) and Step 9 (`:333-354`).
- Ingest drift still uses the git SHA: `currentSha = getGitSha(...)` at `:191` feeds the no-op guard at `:205-230` unchanged.
- If the hash throws, Phase 4 is skipped with reason `frontmatter-unlocatable`, per the plan's belt-and-braces rule.
- The carry-forward of `last_contradict_sha` (`:242`, `:266`) is untouched.

### 4. `cli.ts` registration: correct
- The import at `:14` is extended in place.
- `contradict-commit` sits directly after the `contradict` block and before `const gate = program`.
- Help step 2 is rewritten at `:307-309`.
- No existing registration moved.

### 5. G2 and the `getBucketFromId` delegation: no regression on reachable inputs

| Input | Old | New | Note |
|---|---|---|---|
| `SPIKE-007` | `topics` | `spikes` | Intended (G2) |
| `HOTFIX-001`, `TOPIC-x`, `sales-pitch`, `''`, `epic-1`, `_EPIC-1`, `contradictions` | `topics` | `topics` | Unknown prefixes still default to `topics` |
| `EPIC`, `STORY`, `SPRINT`, `PROPOSAL`, `INITIATIVE`, `CR`, `BUG` ids, including hyphenated stems, `_name` and `.md` | same bucket | same bucket | Unchanged |
| `x/EPIC-1` | `topics` | `epics` | Differs, but unreachable (see below) |
| `EPIC-1/` | `epics` | `topics` | Differs, but unreachable (see below) |

Why the two slash-containing differences are unreachable:
- `extractIdMentions` (`contradict.ts:503`, `[A-Z][A-Z0-9-]+`) cannot yield `/`, `_` or `.`.
- `draftId` / `id` always come from `deriveBucket(basename).id`.
- For free-form `parent` / `children`, `addPath` requires `fs.existsSync(<bucket>/<id>.md)`, and a path containing a slash exists under neither bucket.

The prefix table now lives only in `derive-bucket.ts:9-18`.

### 6. Dependencies and unrelated edits: none
- No `package.json` or lock-file change.
- Branch diff: 4 `src` files from the plan, the 3 QA-Red test files, and one test deviation.
- The deviation: `test/wiki/contradict-cli.node.test.ts:310-316` pinned the old `FAKE_SHA` raw stamp. My plan's supersede list missed it. The Developer computes `contradictContentHash` before the run and asserts equality. That is the same assertion, not a weaker one. **Accepted.**
- QA-Red's immutable red files are unchanged between `aa05d38` and `63c5018`.
- `getGitSha`, `spawnSync` and `defaultGitRunner` were removed from `wiki-contradict.ts` (plan step 5). tsc is clean.

### 7. R3 all-or-nothing: satisfied
The handler validates every input before the first write, in this order (`wiki-contradict.ts:193-262`):
1. File exists.
2. `deriveBucket` succeeds.
3. The raw file reads, `locateFrontmatter` is non-null, `parseFrontmatter` succeeds, and the hash computes.
4. The wiki page exists and `parsePage` succeeds.
5. The findings source resolves: `--findings` wins, then `stdin`; a TTY with neither fails.
6. `parseFindings` succeeds.

Only after that does it run `collectNeighborhood` (read-only, with internal try/catch) and `commitPhase4Findings`.

Why the stamps cannot silently no-op after the `contradictions.md` append:
- The page passed `parsePage`, which requires a `---` on line 0 and a closing fence (`page-schema.ts:115-122`). That implies `locateFrontmatter` finds the same span.
- The raw file passed `locateFrontmatter` non-null.
- The page path used for stamping is the validated path (same `getBucketFromId(id)`).

The probe confirmed that all 7 malformed inputs throw with the problem named, and that `[]` and `contradiction-check: no findings` are valid.

## Non-blocking findings (no bounce)

**N1. Four stale "Git SHA" doc comments** now describe a content hash:
- `src/lib/wiki/contradict.ts:56` (`Phase4Ready.ingestSha`)
- `src/lib/wiki/contradict.ts:231` (`CommitPhase4Opts.ingestSha`)
- `src/lib/wiki/contradict.ts:312` (`RunPhase4Opts.currentSha`)
- `src/commands/wiki-contradict.ts:51` (`gitRunner` "forwarded to getGitSha")

These are comment-only with no runtime effect. **Decision:** carry them into STORY-063-02's docs-match-code scope as a 4-line comment fix. Add it to 02's dispatch.

**N2. Fail-inside-try in the commit handler** (`wiki-contradict.ts:225`): `return fail(...)` is called inside the `try`.
- With a throwing `exit` seam (the tests), the catch at `:231` reports a second "cannot read …" line.
- In production `process.exit` never returns, so there is no effect. The tests check `includes`, so they stay green.
- No action.

**N3. Zero-based entry index:** `parseFindings` names JSON entries from 0 (`entry 0: missing claim`). The plan's "entry 1" was an example, not a contract. No action.

**N4. The hash is computed at commit time, not taken from the prepare-time `phase4:` `ingestSha`.**
- If the body is edited between `wiki contradict` and `contradict-commit`, the stamp certifies the edited body.
- This is the plan's design (C1.6 step 3), not a deviation. It is a candidate refinement for M2: an optional `--expect-sha` from the `phase4:` JSON.

**Cross-story note for 07:**
- C1.1 depends on `locateFrontmatter`'s preamble rules (it skips `<instructions>` blocks, Markdown fences and a BOM).
- A plain-Node re-implementation that takes "the first `---` line" mis-hashes any templated draft whose preamble contains `---`.
- 07 must mirror the locator rules, and must pin a second vector with an `<instructions>` preamble containing a `---` line, in addition to the plain vector.

## Process note
- I ran `git checkout 63c5018` once to inspect. That detached HEAD.
- I restored it at once with `git checkout -`. The checkout is back on `story/STORY-063-01` @ `63c5018` with a clean tree, and no files changed.

## Script Incidents
None.
- Verification commands (`tsc`, `node --test`, the guard script) ran directly in the cli checkout.
- `run_script.sh` targets outer-repo sprint scripts and was not applicable.
