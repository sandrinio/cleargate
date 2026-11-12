# STORY-063-06 Architect post-flight
ARCH: PASS

role: architect (post-flight). Read-only review of Developer commit d9e401e against red 656cb71 on `story/STORY-063-06` (cleargate-cli; base main 0f9aeee). Diff: `src/lib/wiki/unchecked-drafts.ts` (new, 79 lines), `src/commands/doctor.ts` (+10), and the gated `doctor-contradiction-alarm.red.integration.node.test.ts` (TPV A1–A3 only, under decision 15). The other two red files are untouched. No checkout edits, no build, no branch switch; the checkout stayed on `story/STORY-063-06` and clean. I ran two read-only `tsx` probes of the helper from a private `TMPDIR` (results below). I did not re-run the suite (Dev: 4088/0).

The code honours C6 and the 06 blueprint exactly. The verdict is PASS. Finding **S1** is a spec gap in the story's premise. The Developer cannot fix it inside C6, so it goes to the orchestrator and owner (see "Open decisions") and is not a Developer bounce. It must be decided before the 0.29.0 release notes are written, but it does not block the merge.

## Checks

### 1. C6 contract: PASS
- The exports match C6.1 exactly: `UncheckedDrafts {count, ids}` (`unchecked-drafts.ts:17-21`), `checkUncheckedDrafts(cwd, now)` (`:26`), `formatUncheckedDraftsLine(r)` (`:76`).
- `ids` holds ALL unchecked ids (`:73`). Only the formatter slices to 5 (`:78`, `MAX_NAMED` `:24`).
- Oldest first: ascending by `updated_at` epoch, with an id tie-break for determinism (`:72`).
- `count === 0` → `null` (`:77`).
- R4 text verbatim: I fed `{count:3, ids:[EPIC-070, CR-130, BUG-140]}` to the formatter and compared it with the story's R4 example (extracted by regex from the story file). The strings are byte-equal, including U+26A0 U+FE0F and the em dash. With 7 ids it prints `7` and the first five.
- The window is exclusive at both ends: `age > DAY_MS && age < 7*DAY_MS` (`:55`). It matches R2 and plan approach step 2, and future-dated items fall out.

### 2. No second copy of the filter or the hash: PASS
- Imports `contradictContentHash, phase4SkipReason` from `./contradict.js` (`:15`). The filter is called at `:51` and the hash at `:62`.
- The file contains no `createHash`, `PHASE4_TRIGGER_STATUSES`, `In Review`, `exec(`, `spawn` or `fetch(` (`command grep -c` = 0). The file never reads `Date.now`/`new Date`.
- Agreement with the ingest side, traced:
  - **Bucket.** `deriveBucket(filename)` plus `isBucketIngestable(…, loadWikiConfig(cwd).wiki.ingest_buckets)` is the same sequence ingest runs (`wiki-ingest.ts:140,162-163`).
  - **Frontmatter.** Both sides parse with the same `parseFrontmatter` (`wiki-ingest.ts:186`).
  - **Filter.** The same `phase4SkipReason` runs first in `preparePhase4` (`contradict.ts:180`).
  - **Page path.** `wiki/<deriveBucket(filename).bucket>/<id>.md` equals the path the stamp is written to, `getBucketFromId(id)` → `deriveBucket(id).bucket` (`contradict.ts:411-417`). Both use the same `PREFIX_MAP`.
  - **Stamp comparison.** "Unchecked when absent or ≠ hash" (`:62`) is the negation of `preparePhase4`'s idempotency test (`contradict.ts:186-196`). That test treats a falsy stamp as not idempotent, and so does `:62`, because `'' !== hash`.
- The one-line equality is the only logic that mirrors the other side. It is not a rule copy, and C6 did not ask for a shared predicate.

### 3. Placement, `outcome`, guard, `now`: PASS
- Import at `doctor.ts:31`. Block at `doctor.ts:680-687`, after the drift `if` (`:673-678`) and before the BUG-036 comment (`:689`) and `resolveActiveSprint` (`:702`). This is the R5 position, and the doctor red's `alarm === drift + 1` pin holds.
- `outcome` is never referenced in the block or the module. Hook-health mode and the `:755`-era pending-sync pass are untouched.
- `try { … } catch { /* informational only */ }` wraps both the scan and the formatter, so the banner cannot throw from this line.
- `now` is `cli?.now?.() ?? new Date()` (`:683`), using `DoctorCliOptions.now` (`doctor.ts:51`). `doctorHandler` threads `cli` into `runSessionStart` (`doctor.ts:1186`).

### 4. Malformed config: sound, nothing masked: PASS
- The catch covers exactly one expression (`unchecked-drafts.ts:36-41`). Everything `loadWikiConfig` throws comes from a read failure or malformed YAML (`wiki-config.ts:82-92`). Each of those also aborts every `wiki ingest` at `wiki-ingest.ts:162`, which sits outside any try, so Phase 4 cannot run anywhere. Alarming is the correct reading of that state.
- Side effect: with `buckets` unset, unapproved Draft **stories** in the window can also be named. That is acceptable noise while the whole pipeline is down.
- Per-file errors (`deriveBucket` throw, read error, malformed raw frontmatter) → skip (`:46-69`), as plan step 2 says. A malformed raw draft is reported at edit time by 063-02's `⚠️ wiki ingest failed` line, so skipping it here hides nothing.
- Page read/parse/hash errors → unchecked (`:57-65`), matching Gherkin 6.
- Observation (no action): the outer doctor catch (`doctor.ts:685-687`) would also hide a future regression in the helper itself, so the alarm could go silent. This is the same trade-off as the notifier (`doctor.ts:713-714`). The unit tests call the helper directly, so a broken helper still turns them red.

### 5. Performance: PASS
- **Bounded.** One `readdirSync` of `pending-sync/`, non-recursive (`:31`).
  - Bucket and ingestable checks run before any read (`:47-48`), so stories are never opened under this repo's config.
  - One `readFileSync` plus a js-yaml parse of the frontmatter block per ingestable file (`:49-50`).
  - The hash and the page read and parse run only for unapproved Draft/In Review items inside the window (`:57-62`).
  - `loadWikiConfig` runs once per scan. No git, no network.
- **Numbers.** Dev, `/usr/bin/time -p`, 20 runs, p95 base 360 → after 390 ms (**+30 ms**, load ~8; limit 100). TPV reference: +20 ms hrtime / +30 ms time. My in-process probe of the helper alone on this repo: 12–19 ms warm (78 ms on the first call, which includes tsx transpile).

### 6. J4 end to end: the channel works; two preconditions for 07
- **Channel.**
  - `scaffold/hosts/claude/.claude/hooks/session-start.sh:21` runs `"${CG[@]}" doctor --session-start || true`. Its stdout is inherited: no redirect, no `emit-context`. The script ends `exit 0` (`:98`), so doctor's exit 1/2 (blocked items or resolver) never reaches the host.
  - For Claude Code, SessionStart stdout on exit 0 becomes model context as plain text. This matches C2.1 (claude + SessionStart → plain lines) and M2 G-M2-25.
  - The alarm reaches the same `system/hook_response` `output` field (`hook_event: 'SessionStart'`) that `evidence.mjs:335-341` parses. The existing `claude.live.session-start` verdict (`evidence.mjs:359-363`) already proves that channel live for `^ClearGate state:`, which comes from the same doctor process.
  - Codex parity: `scaffold/hosts/codex/.codex/hooks/session-start.sh:21` makes the identical call.
- **CLI identity.** In a room, branch 1 (`<root>/cleargate-cli/dist/cli.js`, `session-start.sh:13`) is absent. Branch 2 (PATH) must resolve to the candidate tarball. Branch 3 (`npx cleargate@<pin>`, `:18`) would run the published CLI: 0.28.0 has no alarm, and 0.29.0 is not on the registry before §R step 9. 07 must install the tarball and pass the identity gate the baseline already uses (`claude-baseline.mjs:510-524`) before R6.
- **Seeding (blocking for R6, see S1).** `cleargate new epic|cr|bug` writes `updated_at: "2026-04-17T00:00:00Z"` (template literal: `templates/epic.md:54`, `CR.md:40`, `Bug.md:42`; `new.ts:317` substitutes only `{ISO}`). No hook or command in the seeding chain moves it. The R6 driver must explicitly write `updated_at` = wall clock − 48 h into the raw frontmatter, or the alarm prints nothing.

## Findings

**S1: spec gap (escalate to orchestrator/owner; not a Developer bounce).** The window key does not track edits. Story §1.4 bases the owner's decision on "raw `updated_at` (stamped on every Edit/Write by `stamp-tokens`)". That premise is false in the code:
- The PostToolUse chain is `stamp-tokens` → `gate check` → `wiki ingest` (`stamp-and-gate.sh:84-110`).
  - `stamp-tokens.ts` never writes `updated_at`. It writes `draft_tokens.last_stamp`, and even that is idempotent when the ledger holds no new rows (`:129-138`).
  - `writeCachedGate` preserves `updated_at` (`frontmatter-cache.ts:139-147`).
  - The only writer is `stampFrontmatter`. Its only callers are `cleargate stamp` (`stamp.ts:120,139`) and `sprint add|remove` (`sprint-scope.ts:586`). `scaffold/core/.cleargate/knowledge/cleargate-protocol.md:404` says the same: "updated on every `cleargate stamp`".
- `cleargate new` writes the template literal 2026-04-17 for epic/CR/Bug/story/sprint (only spike and hotfix use `{ISO}`).
- Evidence in this repo:
  - EPIC-052 was edited today (`git status` M), `draft_tokens.last_stamp: 2026-11-11T23:12:15Z`, `updated_at: 2026-08-06`.
  - This story file has `updated_at: 2026-04-17` (the template literal) but `last_gate_check: 2026-11-11T22:55:42Z`.
- Consequence: in an installed repo, a draft made with `cleargate new` and edited through Edit/Write never enters the window, so the alarm never names it. The story's goal ("find out within a day") holds only where an author hand-writes a current `updated_at`, as this meta-repo's agents often do. Gherkin 3 (stale stamp after an edit) is satisfied by fixtures, not by real edits. The code is correct to C6 and to the owner's decision; the decision rests on a mechanism that does not exist.
- See Open decision 1 for options.

**O1 (§R correctness, real data).** Probed with the branch helper against this repo:

| `now` | Result |
|---|---|
| 2026-11-12T12:00Z | 0 hits (the story's "0 today" is correct) |
| 2026-11-13T06:00Z | 4 hits: `CR-127, CR-128, CR-129, CR-130` |
| 2026-11-14T12:00Z | the same 4 |
| 2026-11-20T12:00Z | 0 |

- Cause: CR-127..130 are unapproved Drafts with a hand-typed `updated_at: 2026-11-12T00:00:00Z` and no stamp. They are true positives, not noise.
- The §R step 8 manual check "06: no alarm today" will be false from 2026-11-13T00:00:01Z until 2026-11-19T00:00Z unless those four are checked (`wiki contradict` + `contradict-commit`) or approved.

**O2 (stale flashcard).** `FLASHCARD.md:98` (2026-09-27 `#tpv #gate #cache`) says "stamp-and-gate writes updated_at and last_gate_check in one second". The current hook chain writes `last_gate_check` only (S1 evidence). Supersede the card; see the candidates below.

**O3 (template quirk that affects seeding).** `templates/CR.md:36` and `Bug.md:36` ship `status: "Draft | In Review | Approved | Completed"` verbatim. `phase4SkipReason` returns `status=Draft | …` for them, so both Phase 4 and the alarm skip a fresh CR or Bug until its author sets a real status. This is consistent on both sides and needs no change here, but 07 seeds must use epics (`epic.md:47` is a clean `"Draft"`).

## Carry-forwards

**To STORY-063-07 (R6 `claude.live.silent-drop-alarm`, model-free):**
1. Run the room's `bash .claude/hooks/session-start.sh` with **cwd = room**.
   - Doctor resolves its root from `process.cwd()` (`doctor.ts:1140`), not from the hook's `REPO_ROOT`.
   - `scrubbedEnv` strips `CLAUDE_*` (`claude-baseline.mjs:61-72`). Set `CLAUDE_PROJECT_DIR=<room>` explicitly so `cg_repo_root` and the sentinel and plan checks resolve the same way Claude Code would.
   - Add `CLEARGATE_NO_UPDATE_CHECK=1`. The notifier prints after the alarm, so it does not affect the line, but it makes a network call.
2. Assert CLI identity first: `command -v cleargate` must equal the tarball `binDir` (baseline identity gate). Otherwise branch 3's `npx` pin runs a CLI without the alarm.
3. Seed: `cleargate new epic` (status `"Draft"`, `approved: false`). After all text substitutions, write `updated_at: "<now − 48h, ISO, quoted>"` into the raw frontmatter.
   - `gate check` and `wiki build` do not touch `updated_at`, so their order relative to the back-date is free. 48 h leaves about five days of margin inside the window.
   - The draft must stay in `pending-sync/`. It must be neither the shell-move draft nor a draft the positive or negative session stamps.
   - Its page (from `wiki build`) must carry no `last_contradict_sha`.
4. Verdict: hook exit 0, and stdout matches `/^⚠️ contradiction check missing: \d+ recently edited draft\(s\) never checked — .*\b<ID>\b/m`.
   - Never pin a line index or the count. The stale-sentinel, `Load skill:`, sync-nudge and notifier lines vary.
   - Other seeds keep the template's 2026-04-17 date, so today they stay out of the window. Do not rely on that for the count.
5. Evidence wording: say "`updated_at` back-dated by the driver", not "edited 2 days ago" (S1). J4's "edited 1–7 days ago" cannot be produced in a room by editing.
6. `session-start.sh`'s first run writes `.cleargate/.sync-marker.json` into the room (`:56-59`). Account for it if any later step asserts a clean room tree.

**To §R (M1 release checklist):**
- Step 8 / story §2.2: replace "no alarm today" with "names exactly the unapproved Drafts whose `updated_at` is 24 h–7 d old and lack a matching stamp". From 2026-11-13 that is CR-127..130 unless they are checked first (O1). The live banner shows the line only after step 2's build, through branch 1 (`cleargate-cli/dist/cli.js`).
- Release notes / CHANGELOG: describe the key honestly ("drafts whose `updated_at` is 1–7 days old"), pending Open decision 1.

**To M2 / STORY-063-11 (session brief):**
- Do not absorb the alarm into `brief.md`.
  - The brief is clock-free and byte-identical between build and ingest (M2 11 scenario 9; `DoctorCliOptions.now` "is not read").
  - The alarm is clock-dependent (the window) and must stay a live doctor line.
  - It is also a different fact from D2(c): D2(c) counts unlabelled findings in `contradictions.md`, while 06 counts checks that never ran.
- 11's G-M2-24 restructure of the pending-sync tail and the brief printer go at the end of `runSessionStart`. Leave `doctor.ts:680-687` where it is: 06's doctor red pins `alarm === drift + 1`, and nothing may be inserted between the drift line and the alarm.
- Budget: EPIC-063 §3 Performance (2) is "`session-start.sh` adds p95 ≤ 100 ms **over today**" (pre-epic, 0.28.0), cumulative. M2 G6 baselines on a 0.29.0 scratch build, which already contains 06's +30 ms, so the epic total could reach about 130 ms. See Open decision 2.
- The alarm line adds about 60 tokens to SessionStart context, outside G5c's prefixed-line count. That is fine, but 11's always-loaded budget narrative should mention it.

**To the M1 plan (no action needed by 06):**
- G9 (`M1.md:958`) said 06's own 100 ms scenario binds. That still holds for 06, but the epic-level cumulative reading above applies to 11.

## Open decisions for orchestrator

1. **S1, the window key** (owner; decide before the 0.29.0 release notes). The options:
   - (a) Accept, and narrow the claim in docs and notes to "drafts whose `updated_at` is 1–7 days old". In installed repos the alarm then fires only where authors maintain `updated_at`.
   - (b) **Recommended default:** a follow-up `STORY-063-06-F1`. Switch `created_at`/`updated_at` in `templates/{epic,CR,Bug,story,Sprint Plan Template}.md` to `"{ISO}"`, which `new.ts:317` already substitutes.
     - Then every `cleargate new` draft that never gets its check is named on days 1–7 after creation. That is the regression J4 guards against.
     - Surface: canonical templates only, plus any test that pins the 2026-04-17 literal. No doctor change.
     - It does not make later edits move `updated_at`, so Gherkin 3 in production stays bound to `updated_at` being inside the window.
   - (c) Also have the PostToolUse chain move `updated_at` on a body change. This is broader: it changes `gate-stale` lint semantics (`lint-checks.ts:421-431`) and the sync conflict input (`conflict-detector.ts:172`). Not recommended inside EPIC-063.
   - (d) Re-key the window to `draft_tokens.last_stamp`. Rejected: it is idempotent when the ledger has no new rows (`stamp-tokens.ts:129-138`), so it does not track edits either.
2. **M2 G6 baseline:** measure 11 against 0.28.0 (the epic's "today"), or give 11 an allowance of 100 − 06's measured delta (≈ 70 ms) against 0.29.0.
3. **§R step 8 text** (O1): amend it as above, or run the contradiction check on CR-127..130 before the dogfood check.

## Script Incidents
None. No `run_script.sh` scripts were invoked. Read-only probes: `tsx` against `src/lib/wiki/unchecked-drafts.ts` from a private `TMPDIR`. Nothing was written to the checkout.

## Flashcard candidates
- `2026-11-12 · #frontmatter #wiki · updated_at moves only on explicit cleargate stamp; no hook moves it; epic/CR/Bug templates hardcode 2026-04-17.`
- `2026-11-12 · #gate #cache · Supersedes 2026-09-27 #tpv #gate #cache: stamp-and-gate writes last_gate_check only, never updated_at.`
- `2026-11-12 · #templates #clean-room · CR/Bug templates ship status "Draft | In Review | …" verbatim; Phase 4 skips it. Seed probes as epics.`
- `2026-11-12 · #perf #budget · EPIC-063 session-start ≤100 ms is over 0.28.0, cumulative; 06 spent ~30 ms. Later stories baseline 0.28.0.`
- Endorse the Dev/TPV pair: `#doctor #test-harness` (`CLEARGATE_NO_UPDATE_CHECK=1` for subprocess doctor) and `#doctor #perf` (exit 1 on this repo; compare exit codes across sides).
