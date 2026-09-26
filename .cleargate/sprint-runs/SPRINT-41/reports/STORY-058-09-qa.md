role: qa

STORY: STORY-058-09

QA: PASS-PENDING-SMOKE

## Why PASS-PENDING-SMOKE, not plain PASS

Verdict decision order (CR-081 x CR-082), step (a): the story's own frontmatter carries a `deferred_verification`
entry whose `command` is `claude-baseline.mjs check --evidence … --write-result .../deferred-verify/STORY-058-09.json`,
`blocks: close`. Per M4-A18/J10.6, that exact `--write-result` invocation is intentionally NOT run at this QA pass —
it is reserved for the RS-CLOSE boundary step, run once after every remaining cli-touching item (-10..-13) has
merged, because a later `src/**`/`scaffold/**` change invalidates today's `artifact_inputs` and a green file written
now could go stale unnoticed. My own dispatch text confirms this scoping ("Do NOT pass `--write-result`"). Every
OTHER static scenario in §2.1 passes (see coverage map below), so per the composed rule this is the textbook
PASS-PENDING-SMOKE case: the story merges to the sprint branch, but Step 2.9 at sprint-close still gates full Done.

## Subject verified

- cli `story/STORY-058-09` @ `7ce56a23a5a37ed948ba26641f219ac6cfffff5f` — clean, only pre-existing untracked `cleargate-0.25.0.tgz`.
- outer `.worktrees/STORY-058-09` `story/STORY-058-09` @ `22c1e557c7546363ac73bbec3c6dedadbac62940` — clean.
- Left-in-place container `/Users/ssuladze/Documents/Dev/cg-cleanroom-20260926T064145Z-claude` + both session dirs — read-only audited, untouched.

## Counts table

| File | Expected | Measured (SOLO) |
|---|---|---|
| `npm run typecheck` (cli) | exit 0 | exit 0 |
| `test/scripts/clean-room-evidence.red.node.test.ts` | 60/60 pass | 60 tests, 60 pass, 0 fail |
| `test/e2e/clean-room-claude-baseline.red.integration.node.test.ts` | 13/13 pass | 13 tests, 13 pass, 0 fail (~12.8s wall) |

TESTS: 73 passed, 0 failed, 0 skipped (both -09 files, full suite not re-run — lane is `standard` two-repo per the
Cross-Cutting Rules; rule-16 sweep below substitutes for the full-suite pass on the doc-touching surface).

## Scope / constraint audit (J1-J13)

- **J1 scope.** `git diff --stat` of the Dev's own cli commit `7ce56a2` (parent `6c5a4c5`, the QA-Red re-seal tip)
  touches exactly `scripts/clean-room/{claude-baseline,evidence,probe-items}.mjs`, 1426 insertions, 0 deletions —
  no `src/`, `scaffold/`, `package.json`, no build config. Outer commit `dffb117d..22c1e557` touches exactly
  `.cleargate/knowledge/clean-room-verification.md` + `.cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md`
  (67 insertions / 6 deletions) — no third file. The Dev report's own commit is *not* in that diff (orchestrator
  override of J12, per dispatch preflight — expected, not a finding).
- **No `src/**/*.ts` imports.** `command grep -n "^import"` on all three scripts shows only `node:*` builtins plus
  `probe-items.mjs` importing from `claude-baseline.mjs` — confirmed no cli `src/` import.
- **Literal ids, no regex.** `EPIC-001`, `STORY-001-01`, `SPRINT-01`, `cleanroom-probe` all appear as literal
  strings in `probe-items.mjs`/`claude-baseline.mjs`; no `\d`/`[0-9]` id-matching pattern found.
- **J2 exports.** `evidence.mjs` exports exactly the blueprint list plus `identityVerdict`, `GATING_CHECKS`,
  `NON_GATING_CHECKS` (Dev's own addition, flagged in the dev report, harmless additive export), `decideRun`,
  `defaultContainerProbes`. `probe-items.mjs` exports `authorProbeEpic`, `approveProbeStory`, `declareProbeSprint`,
  `PROBE_EDIT`. Matches J2.
- **J4 violation strings** — `missing in other: `, `differs (sha): `, `differs (mode): `, `Claude-observable extra: `,
  `unexpected top-level in no-flag install: ` all present verbatim in `evidence.mjs`.
- **J5 env scrub + explicit cwd.** `SCRUB_RE = /^(CLAUDE|CLEARGATE_|SKIP_)/` plus an explicit `ORCHESTRATOR_PROJECT_DIR`
  drop, confirmed at `claude-baseline.mjs:52-59`. Every `spawnSync`/`execFileSync` call inspected carries an explicit
  `cwd` (room or container subpath); none relies on an inherited cwd.
- **J6 `check`.** Exit 0 (PASS) / 1 (FAIL) / 2 (usage — missing `--evidence`) confirmed by reading `checkCommand`;
  `--write-result` writes exactly `{ story, command, ran_at, exit_code, status: 'green'|'red', reason }`, creating
  the directory. Matches CR-082 shape.
- **M4-A26 `GATING_CHECKS`/`NON_GATING_CHECKS`.** Live-imported and printed — exact match to the plan's frozen lists
  (11 gating ids incl. `room-isolation`/`hook-identity`; 5 non-gating incl. `active-sprint`/`verify-install-all-plain`).
- **M4-A27 `mcp-connect` detail.** Evidence row reads `cleargate: status=connected source=project; non-project
  entries: 4` for both columns — byte-exact to the pinned format.

## Byte-neutral artifact-inputs proof

```
(cd cleargate-cli && node -e '...computeArtifactInputs(cwd,"main") vs (cwd,"story/STORY-058-09")...')
a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12 a7e231b9a535f39d163c99f25bd538c53c4c856a2f4d36b25bc0daf5ecd10d12 true
```
Exit 0. Matches TPV's measured value exactly. Confirms the cli commit packs nothing new (scripts/ is outside
`package.json`'s `files` list — verified directly).

## `check` outputs

```
$ (cd .worktrees/STORY-058-09 && node .../claude-baseline.mjs check --evidence .cleargate/sprint-runs/SPRINT-41/clean-room-evidence.md)
claude-baseline check: PASS (ref=main, last run #1, artifact_inputs a7e231b9…0d12)
exit=0

$ (same, --ref story/STORY-058-09)
claude-baseline check: PASS (ref=story/STORY-058-09, last run #1, artifact_inputs a7e231b9…0d12)
exit=0
```

**Fail-closed proof** (scratch copy only, real evidence file never touched): copied the real evidence file to
`/private/tmp/qa-058-09-<pid>/evidence-fail.md`, appended a hand-written `## Run 2` section with `- result: FAIL`
and a dummy `artifact_inputs`. Result:
```
claude-baseline check: FAIL (ref=main) — last run (#2) result is FAIL
exit=1
```
Scratch dir removed afterward. Confirms `checkEvidence` reads the LAST `## Run` section and fails closed.

## Container audit (read-only)

- `gate-check.log` last line, both rooms: `stamp=0 gate=0 ingest=0 file=…/EPIC-001_cleanroom_probe.md` — repo-noflag
  `06:42:17Z`, repo-all `06:42:52Z`. Confirmed on disk.
- `.cleargate/wiki/epics/EPIC-001.md` exists in both rooms (1360 bytes each).
- `_off-sprint/token-ledger.jsonl` in both rooms carries an `"agent_type":"qa"` row (noflag session
  `ef07f7fc-...`, all session `0d00f932-...`), each pointing at a real transcript path under the two named
  session dirs.
- STORY-001-01's frontmatter in `repo-noflag` has `approved: true` (the `approveProbeStory` edit applied), yet
  `sprint-init` still exits 1 with `UNAPPROVED (1): STORY-001-01` — the exact BUG-090 repro (frontmatter-at-offset-0
  anchoring in `assert_story_files.mjs:162`, not a real approval gap).
- Session transcripts (`~/.claude/projects/…-repo-{noflag,all}/`) show `hook_success` attachments for
  `SessionStart:startup` (both the `CG_IDENTITY …` line and `ClearGate state: pre-member …`), an `agent_listing_delta`
  and `skill_listing`, and a `PostToolUse:Edit` `hook_additional_context` naming the modified EPIC-001 file — matches
  the claimed verdicts.
- The harness's own captured streams (`evidence/noflag.S1.stream.jsonl`, `.S2.stream.jsonl`) show, independently of
  the transcripts: `SessionStart:startup` exit 0 (x2 lines), `PreToolUse:Edit` exit 0, `PostToolUse:Edit` exit 0 (S1);
  `system/init` with 16 agents / 21 skills (⊇ the 11 ClearGate agents / 3 skills), two `PreToolUse:Agent` exit 0,
  one `SubagentStop` exit 0 (S2).
- S1/S2 prompt strings in `.cleargate/knowledge/clean-room-verification.md` §5 are byte-identical (modulo the
  `<abs epic path>` placeholder vs. the real interpolated path) to the `s1Prompt`/`s2Prompt` template literals in
  `claude-baseline.mjs:316,328`.

## Rule-16 (`CLEARGATE_META_ROOT`) spot-check (3 files)

| File | Result |
|---|---|
| `test/docs/clean-room-verification-doc.red.node.test.ts` | 9/9 pass (required by dispatch) |
| `test/wiki/bucket-registry-parity.red.node.test.ts` | 11/11 pass |
| `test/scripts/close-sprint-assume-ack-guard.node.test.ts` | 18/20 pass, 2 fail — both `ENOENT` on `<worktree>/cleargate-cli/src/{cli.ts,commands/sprint.ts}`, the flashcarded "no gitignored `cleargate-cli/` inside an outer worktree" case (2026-09-26 `#test-harness #worktree`), matches Dev's own report exactly. Not a regression. |

All three match the Dev's rule-16 sweep exactly; no new regression found.

## Gherkin -> test / evidence coverage map

| Scenario (§2.1) | Test(s) | Run 1 evidence |
|---|---|---|
| 1. No-flag install reproduces the Claude baseline | e2e A1-A5, A4b (mechanical subset); unit E1/E2 (verdict logic) | `session-start`, `pre-tool-use`, `post-tool-use`, `agents-skills`, `doctor` = PASS, no-flag column |
| 2. `--host all` leaves Claude behavior unchanged | e2e B1-B6 | `--host all` column all PASS/N-A matching no-flag; `tree-comparison` PASS; `verify-install-all-plain` PASS |
| 3. The automated subset states its own limits | e2e A5 | n/a (diagnostic-only); measured: prints 8 `NOT COVERED` ids, non-empty |
| 4. Evidence gates sprint close | unit E3 (`checkEvidence`); story frontmatter `deferred_verification` (B1) | `check` exit 0 (both refs) confirmed above; final gating write deferred to RS-CLOSE by design (see verdict rationale) |

ACCEPTANCE_COVERAGE: 4 of 4 Gherkin scenarios have matching tests/evidence.
MISSING: none.

Goal Acceptance Check mapping (sprint-context.md conditions 2-3) is present verbatim in the evidence file's own
`### Goal Acceptance Check mapping` section and matches the actual PASS rows.

DoD (§4.2): all four checked items are satisfied — §4.1 minimums met (60 unit-helper tests beyond the stated
minimums; e2e B3/B6 satisfy the 1 required integration test; Scenario A/B satisfy the 2 required e2e tests); all
§2.1 Gherkin covered; Architect review passed via the TPV reject -> binding re-seal -> exact-count-match cycle
(no separate `-arch.md` exists for -09 — the TPV report itself, `role: architect`, is the review artifact, and the
re-seal's measured counts match its own "Expected counts after the re-seal" table exactly); the two rooms are
genuinely separate directories (B1 e2e test PASS, confirmed independently via `ls` on the left-in-place container);
the evidence artifact exists and the frontmatter's `deferred_verification` block matches B1.

## Orchestrator observations (O1-O3)

**O1 - malformed evidence table rows.** Confirmed by direct read: the `sprint-init` row's Evidence cell contains a
literal newline (`UNAPPROVED (1): STORY-001-01\nERROR: sprint init blocked …`), and three rows
(`claude.live.mcp-connect`, `sprint-init`, `active-sprint`) join `noflag: … | all: …` with a literal ` | ` inside
what should be a single Evidence cell — both defects will visibly break table rendering (extra phantom columns,
a row that splits across lines) in any standard markdown renderer. Checked against the contract: neither the story
text, M4 plan, nor M4-A26 pins "well-formed GFM table" as a machine-checked requirement — the plan's own template
(`plans/M4.md:547-549`) shows only column headers, no per-cell escaping rule. `checkEvidence` is unaffected: it
reads only `^## Run (\d+) — `, `^- result: (PASS|FAIL)$`, `^- artifact_inputs: ([0-9a-f]{64})$` — all *above* the
table — confirmed by re-reading `checkEvidence`'s source and by the fact my own `check` invocations above parsed
this exact file cleanly both times. **Verdict: remediation-worthy minor, not blocking.** This is a durable,
append-only, human-read artifact (re-appended at RS-4, RS-5, RS-CLOSE) whose readability degrades with every
malformed row; recommend a follow-up (escape literal `|` as `\|` and newlines as `<br>` or a literal `\n` inside
Evidence cells) before the RS-4 re-run appends a second row in the same broken shape.

**O2 - `active-sprint` row implementation vs. J5's parenthetical.** J5 glosses the row as "(whether
`.cleargate/sprint-runs/.active` exists after `sprint init`)" — a bare existence check. The Dev instead built a
synthetic sentinel drive (write `.active`, drive `pending-task-sentinel.sh` with a fabricated `PreToolUse:Agent`
input, assert no "unbound variable" and >=1 pending-task file, then restore prior state), matching the *earlier*,
more specific, and still-binding **M4-A2** amendment verbatim: "The e2e test's A4 gains a deterministic
active-sprint sentinel drive, and the evidence records `active_sprint` as INFO." Both texts are dated 2026-09-26
and both role: architect; M4-A2 is the technically grounded one (it exists specifically to witness BUG-085's V8
empty-array guard under a no-`.active` room, which a bare existence check cannot do). I read J5's parenthetical as
an imprecise compression of M4-A2 by the TPV author, not a supersession — nothing in the TPV report's "Where these
[amendments M4-A24..A32] disagree with the blueprint above or with M4-A15..A23, these win" scopes to J5's own
prose gloss overriding a *different*, more specific prior amendment it doesn't cite or contradict on the merits.
The Dev self-flagged this transparently (`orchestrator_confirmed: false`) rather than silently picking a reading,
which is the correct QA-Red/Dev posture under this protocol. **Verdict: not a violation — conformant with the more
specific binding M4-A2 amendment; informational, no bounce.**

**O3 - main-checkout doc byte-identity.** `git -C /Users/ssuladze/Documents/Dev/ClearGate diff --quiet HEAD --
.cleargate/knowledge/clean-room-verification.md` exits 0, `git status` on that path is empty. **Confirmed clean** —
the Dev's self-reported mis-targeted-then-reverted edit left no residue in the main checkout.

## Findings

| # | Severity | Description |
|---|---|---|
| F1 | Advisory (EPIC-054 WS7) | 7 of 8 `## Task Breakdown` rows remain `- [ ]` unchecked despite the underlying work being complete (scripts written, harness run, Run 1 appended, doc pointed at harness, e2e passing on committed HEAD) — only the pre-existing row 8 is `[x]`. Report per dispatch instruction; does not bounce the story alone. Recommend the checkboxes be ticked at merge/close. |
| F2 | Remediation-worthy minor | O1's malformed evidence-table rows (newline + unescaped `\|` inside Evidence cells) — see O1 above. Non-blocking; fix before RS-4 appends a second row. |

No blocking findings. No regressions. No scope violations.

REGRESSIONS: none.

VERDICT: Ship it as PASS-PENDING-SMOKE. The harness, its 60+13 tests, the scope/export/env/exit-code contracts
(J1-J13), the byte-neutral artifact-inputs proof, both `check` invocations (including the fail-closed scratch
probe), and an independent read-only audit of the left-in-place clean-room container and its two session
transcripts all confirm Run 1 is a genuine, non-vacuous PASS covering all 4 Gherkin scenarios and the full §4.2
DoD. The story is not marked plain PASS only because its own `deferred_verification` entry (the final
`--write-result` gating check) is by design deferred to the RS-CLOSE boundary step, per M4-A18/J10.6 and this
QA dispatch's own instruction not to pass `--write-result` here — that is intended sequencing, not a gap in this
story's work. Two non-blocking observations recorded (F1 Task Breakdown checkboxes, F2 evidence-table markdown
escaping) for cleanup at or before sprint close.

flashcards_flagged:
  - "2026-09-26 · #qa #clean-room #test-harness · A run-section table's Evidence cell with raw \\n or unescaped | breaks GFM rendering; checkEvidence still parses fine (it reads only the metadata lines above the table)."
  - "2026-09-26 · #qa #tpv #clean-room · Two same-day binding architect notes (M4-A2 vs TPV J5) can gloss the same row differently; the more specific/technically-grounded one wins when neither cites nor contradicts the other."

STATUS=done
