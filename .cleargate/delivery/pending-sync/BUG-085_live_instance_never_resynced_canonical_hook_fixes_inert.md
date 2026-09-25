---
bug_id: BUG-085
parent_ref: ""
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Ready
severity: P1-High
reporter: sandrinio
area: scaffold-hooks
approved: true
approved_by: sandrinio
approved_at: 2026-09-11T22:19:09Z
ambiguity: 🟢 Low
context_source: "Direct owner request 2026-09-04 during a token-efficiency investigation. Measured grounding: the live /.claude/ instance in this repo diverges from cleargate-planning/.claude/ across 8 files, which makes BUG-068's and BUG-069's shipped fixes inert in the repo that filed them. Evidence in §3 is machine-collected from this working tree, not recalled."
created_at: 2026-09-04T00:00:00Z
updated_at: 2026-09-11T22:25:54Z
created_at_version: cleargate@0.26.1
updated_at_version: 11c29fd3-dirty
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-09-11T22:29:13Z
  transition: ready-for-fix
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
draft_tokens:
  input: 0
  output: 0
  cache_creation: 0
  cache_read: 0
  model: claude-opus-5-5
  last_stamp: 2026-09-25T09:51:56Z
  sessions:
    - session: 75d958ba-2473-408d-b4db-e15b774ad28f
      model: claude-opus-5-5
      input: 0
      output: 0
      cache_read: 0
      cache_creation: 0
      ts: 2026-09-25T04:41:52Z
---

# BUG-085: Canonical `.claude/` fixes never reach the live instance, and nothing detects it — BUG-068's own fix is inert in the repo that filed it

**Milestones:** M0 targeted re-sync after BUG-089's repair, with a new Claude session and live denial/attribution checks; M3 durable meta-repo drift detection against the relocated canonical layout. Do not mark the whole bug Done after re-sync alone.

**Re-declared 2026-09-25** (M1.md §D4 + STORY-058-01-arch.md §5): canonical paths → `cleargate-cli/scaffold/{core,hosts/claude}/**` (`.claude/**` under `scaffold/hosts/claude/`, `.cleargate/**` under `scaffold/core/`, plus `scaffold/hosts/claude/CLAUDE.md`). `cleargate-planning/` is now a frozen, deprecated snapshot (see `cleargate-planning/DEPRECATED.md`), no longer canonical. Starts only after STORY-058-02 merges, since it reads canonical through `cleargate-cli/test/helpers/scaffold-roots.ts` (created by -02). The hook-file edits and the drift-check/doctor code land on the cli-repo story branch; the CLAUDE.md fix stays outer (meta-repo).

### Resolved Decisions

- **Q1 — Auto-heal or detect-and-warn?** Should the live instance be rewritten automatically when
  drift is detected, or should drift only be *reported* and left for the human to resolve?
  **Recommended: detect-and-warn.** The live instance is per-machine and is a legitimate debugging
  surface — an agent silently overwriting it destroys in-flight local edits with no record.
  [[CR-115]] already established the "announce before you overwrite" principle for `cleargate
  upgrade`; auto-heal contradicts it. **Approved: detect-and-warn; no automatic overwrite.**
- **Q2 — Meta-repo only, or does the check ship to target repos?** A target repo has no
  `cleargate-cli/scaffold/` directory (nor the deprecated `cleargate-planning/` one), so it has no canonical tree to diff against; its only baseline is
  `.cleargate/.install-manifest.json`. **Recommended: meta-repo scope only this sprint**, and file
  the target-repo variant (manifest-hash drift) separately once the meta-repo check has a shape.
  **Approved: meta-repo scope only this sprint; target-repo manifest-hash checks remain deferred.**

## 1. The Anomaly (Expected vs. Actual)

**Expected:** when a defect in a scaffold hook is fixed in canonical
(`cleargate-cli/scaffold/hosts/claude/.claude/**`) and its work item is marked `Completed`, the fix is in effect in
this repo's running agent loop — or, failing that, *something* reports that it is not.

**Actual:** the fix is not in effect, and nothing reports it. The live `/.claude/` instance is a
per-machine, fully-gitignored copy that is only rewritten by an explicit `cleargate init` or a manual
hand-port. There is no drift check anywhere — not in `cleargate doctor`, not at `SessionStart`, not
at sprint close.

The concrete instance: [[BUG-068]] (`P0-Critical`, `status: Completed`, `state.json: Done` in
SPRINT-40) fixed the dispatch hooks to accept the host build's renamed dispatch tool. The fix landed
in canonical. The live hook was never rewritten, so it still hard-rejects every dispatch:

```
cleargate-planning/.claude/settings.json   PreToolUse matcher = "Task|Agent"   ← fixed
.claude/settings.json                      PreToolUse matcher = "Task"         ← live, unfixed
.claude/hooks/pre-tool-use-task.sh:45      [[ "${TOOL_NAME}" != "Task" ]] && exit   ← live, unfixed
```

Consequence: no dispatch marker and no sentinel is written for any agent spawn in this repo, so
[[BUG-069]]'s fallback path runs for every row and the token ledger — the instrument the Reporter
and every cost decision depend on — attributes essentially all spend to a single agent role.

**This is the second occurrence of the identical failure on the identical surface.** CLAUDE.md
already records the first, verbatim: *"BUG-024 shipped its own fix while still running with the buggy
hook — the CR-026 PreToolUse:Task hook landed in canonical but the live `/.claude/settings.json` was
never rewired, so the dispatch markers continued to mis-attribute for the rest of SPRINT-20."* The
documented mitigation is a prose reminder to humans in CLAUDE.md. It has now failed twice.

## 2. Reproduction Protocol

Deterministic, from a clean checkout of this repo at `main`. No sprint state required.

1. **Show the live matcher:**
   ```bash
   python3 -c "import json;d=json.load(open('.claude/settings.json'));print([b.get('matcher') for b in d['hooks']['PreToolUse']])"
   ```
   → `['Task', 'Edit|Write', 'AskUserQuestion']`

2. **Show the canonical matcher:**
   ```bash
   python3 -c "import json;d=json.load(open('cleargate-planning/.claude/settings.json'));print([b.get('matcher') for b in d['hooks']['PreToolUse']])"
   ```
   → `['Task|Agent', 'Edit|Write', 'AskUserQuestion']`

3. **Show the live guard still rejecting:**
   ```bash
   sed -n '45p' .claude/hooks/pre-tool-use-task.sh
   ```
   → `if [[ "${TOOL_NAME}" != "Task" ]]; then`

4. **Show the full drift surface:**
   ```bash
   diff -rq .claude cleargate-planning/.claude
   ```
   → 8 differing files (§3).

5. **Show that the guarding test cannot catch it:**
   ```bash
   bash .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh   # 10/10 PASS, exit 0
   sed -n '46,64p' .cleargate/scripts/test/bug068_dispatch_tool_name.red.sh
   ```
   → the test pins `HOOKS_DIR="${REPO_ROOT}/cleargate-planning/.claude/hooks"` and its own comment at
   line 46 states it targets canonical *"(never the live gitignored .claude/)"*. The suite is green
   while the running system is broken.

6. **Show the downstream corruption:**
   ```bash
   python3 -c "
   import json,collections
   r=[json.loads(l) for l in open('.cleargate/sprint-runs/SPRINT-40/token-ledger.jsonl') if l.strip()]
   print(collections.Counter(x.get('agent_type') for x in r))
   print('empty sentinels:', sum(1 for x in r if not x.get('sentinel_started_at')), '/', len(r))"
   ```
   → `Counter({'architect': 311, 'qa': 5, 'developer': 3, 'devops': 3, 'reporter': 1})`,
   `empty sentinels: 323 / 323`.

**Edge condition that makes this invisible:** every artifact a human would check to catch this
reports healthy. The work items read `Completed`. `state.json` reads `Done`. The red test passes.
`git status` shows nothing, because `/.claude/` is fully untracked as of [[CR-099]]. The only
observable is the semantic content of the ledger, which no gate inspects.

## 3. Evidence & Context

**Full drift surface** — `diff -rq .claude cleargate-planning/.claude`, collected 2026-09-04:

| File | Changed lines (`diff` `<`/`>` count) |
|---|---|
| `hooks/token-ledger.sh` | **218** |
| `hooks/pre-tool-use-task.sh` | 32 |
| `hooks/pending-task-sentinel.sh` | 24 |
| `hooks/stamp-and-gate.sh` | 4 |
| `hooks/session-start.sh` | 4 |
| `settings.json` | 2 |
| `hooks/pre-edit-gate.sh` | 2 |
| `agents/reporter.md` | 2 |

Live-only entries (expected, not drift): `scheduled_tasks.lock`, `settings.local.json`, `worktrees/`.

**Canonical carries the BUG-068 fix explicitly** — `cleargate-planning/.claude/hooks/pre-tool-use-task.sh`:

```
  2: # pre-tool-use-task.sh — PreToolUse:Task|Agent hook.
 12: # BUG-068: the host build renamed the dispatch tool from "Task" to "Agent",
 52:   Task|Agent) ;;
```

Live equivalent, same file, still pre-fix:

```
  2: # pre-tool-use-task.sh — PreToolUse:Task hook.
 45: if [[ "${TOOL_NAME}" != "Task" ]]; then
 46:   # Not a Task spawn — nothing to do; exit silently.
```

**Ledger corruption, whole corpus** (37 sprint ledgers, 4,250 rows):

- 3,895 rows carry `agent_type: "architect"`; **3,892 of them have `sentinel_started_at: ""`**. Only
  3 rows in the entire corpus carry a populated sentinel.
- Ratio is 3,757 `architect` : 139 `developer`. The Architect agent spec runs *once per milestone*
  and writes only a plan file; the Developer runs once per story. The ratio is inverted by ~27x.
- SPRINT-40's 323 rows resolve to only **4 distinct `session_id`s**, and **309 of them belong to a
  single session** whose `turns` field climbs monotonically 212 → 1,255. No subagent runs 1,255
  turns: these are the main orchestrator session's own `SubagentStop` fires, recorded as agent rows.
- Roughly 60% of rows carry an all-zero `delta`, so any *per-dispatch* statistic derived from this
  file is meaningless. (Row `delta`s are genuinely incremental and do sum to `session_total`, so
  corpus-level totals remain sound; it is the attribution and the per-dispatch denominator that are
  destroyed, not the arithmetic.)

**Status of the upstream fixes** (raw files, source of truth):

- `.cleargate/delivery/archive/BUG-068_dispatch_hooks_gate_on_task_tool_name.md` → `status: Completed`, `severity: P0-Critical`
- `.cleargate/delivery/archive/BUG-069_ledger_fallback_inherits_prior_attribution.md` → `status: Completed`, `severity: P1-High`
- `.cleargate/sprint-runs/SPRINT-40/state.json` → `BUG-068: Done`, `BUG-069: Done`

*(Note: `.cleargate/wiki/bugs/BUG-068.md` and `BUG-069.md` both still read `status: "In Fix"` — a
separate, minor wiki-vs-raw drift. Raw wins per CLAUDE.md. Not in scope here; flagged so the next
reader is not misled by the wiki page.)*

## 4. Execution Sandbox (Suspected Blast Radius)

**In scope — investigate and change:**

- The live .claude/** instance (gitignored, per-machine) — the drifted copy; 8 files listed in §3.
  It is inventoried and, per Task Breakdown, backed up and re-synced from canonical as this bug's
  M0 operational step — inspected and rewritten by that step, not part of this story's tracked
  commit surface.
- `cleargate-cli/scaffold/hosts/claude/.claude/**` + `cleargate-cli/scaffold/core/.cleargate/**` + `cleargate-cli/scaffold/hosts/claude/CLAUDE.md` — canonical; the comparison baseline and the tree this bug's
  commit actually touches. On the cli-repo story branch.
- `cleargate-cli/src/commands/doctor.ts:268-271` — most likely home for a `canonical ↔ live` parity check.
- `cleargate-cli/src/lib/drift-check.ts:143-160` — `canonicalRoot = cwd/cleargate-planning` composes instead from `cwd/cleargate-cli/scaffold/{core,hosts/claude}` (reuse `composePayload` from `cleargate-cli/src/lib/scaffold-layout.mjs` with a unique temp dir cleaned in `finally`, or compare per root without composing: live `.claude/**` vs `scaffold/hosts/claude/.claude/**`, live `.cleargate/**` vs `scaffold/core/.cleargate/**`); skipped when absent.
- `cleargate-cli/scaffold/hosts/claude/.claude/hooks/session-start.sh` — candidate surface for a drift banner line
  (the live mirror is re-synced from this at the M0 step, not edited directly). On the cli-repo story branch.
- `.cleargate/scripts/test/bug068_dispatch_tool_name.red.sh` — lines 46 and 61-64, the canonical-only
  pin that let this through; needs either a live-mode variant or an explicit recorded limitation.
  Repoint `HOOKS_DIR` from `cleargate-planning/.claude/hooks` to `cleargate-cli/scaffold/hosts/claude/.claude/hooks`.
- `CLAUDE.md` → *Dogfood split — canonical vs live* — the prose mitigation that has now failed twice.
  Rebase this extension onto -01's rewrite (already merged) and add the three stale-sentence fixes
  from STORY-058-01-arch.md §3: (a) the intro line's *"scaffold canonical at `cleargate-planning/`"*
  → the two-repo scaffold roots; (b) both re-sync sentences' bare `cleargate init` → `node cleargate-cli/dist/cli.js init`
  (post-BD dist rebuild — bare `cleargate` resolves to the published global install, not this repo's
  composed payload); (c) the deprecated-snapshot bullet's incomplete reader list — add the ~85 cli
  tests and `manifest.ts`/changelog/check scripts (owned by -02) alongside this bug's own
  `drift-check.ts:143-160` and the doctor text. Stays outer (meta-repo), not cli.
- **M0-step follow-up (amended 2026-09-25, orchestrator):** `cleargate-cli/test/hooks/pre-tool-use-task.node.test.ts`,
  `test/hooks/token-ledger-attribution.node.test.ts`, `test/hooks/token-ledger-regression.node.test.ts`. Their
  `HOOK_PATH` read the outer repo's per-machine LIVE `.claude/hooks/*` and pinned the pre-BUG-068/069 contracts,
  so the M0 re-sync turned 11 of them red on cli main. They are repointed at canonical
  (`CLEARGATE_META_ROOT`-aware) and updated to the BUG-068/069 contracts — the propagation consequence of this
  bug's own re-sync, not a change to the BUG-068/069 logic.

**Explicitly out of scope — do not touch:**

- The BUG-068 / BUG-069 fixes themselves. They are correct in canonical; this bug is about
  propagation, not about their logic.
- `cleargate-cli/templates/cleargate-planning/.claude/**` (npm payload). It is regenerated
  byte-identically by `prebuild`; it is not a second source of truth and is not drifted.
- End-user target repos. Their comparison baseline is an install manifest, not this meta-repo's canonical tree. A target-repo manifest-hash check is deferred; this scope decision is not a claim that user installs can never drift.

## Task Breakdown

- [ ] Write the failing check: compare `.claude/**` against `cleargate-cli/scaffold/hosts/claude/.claude/**` (and `.cleargate/**` against `cleargate-cli/scaffold/core/.cleargate/**`), ignoring the three known live-only entries (`scheduled_tasks.lock`, `settings.local.json`, `worktrees/`); assert exit non-zero. It must fail today on all 8 files.
- [x] Owner chose detect-and-warn and meta-repo-only scope; decisions recorded in Context Source.
- [ ] Wire the check into `cleargate doctor` with a distinct exit code, per the doctor exit-code taxonomy in `.cleargate/knowledge/cleargate-enforcement.md`.
- [ ] Surface one drift line in the `SessionStart` banner when the check fails, alongside the existing `ClearGate state:` line.
- [x] After BUG-089's repair, inventory current drift, back up each exact live file before a targeted re-sync (or reviewed force install), preserve machine-local additions, and verify matching hashes. Plain init can preserve divergent files and is not proof of re-sync. Start a new Claude session before the live checks. *(Done at SPRINT-41 barrier B0, 2026-09-25: `sprint-runs/SPRINT-41/b0-live-resync.mjs --apply`, backup + hashes + fresh headless sessions — `reports/BUG-085-b0-proof.md`.)*
- [x] Re-run the §2 step-6 ledger probe after a real agent dispatch; confirm a non-empty `sentinel_started_at` and a correct `agent_type`. *(B0 case D2: a real `qa` dispatch in a fresh session wrote `agent_type: qa`, `sentinel_started_at: 2026-09-25T03:48:13Z`.)*
- [ ] Replace the CLAUDE.md prose reminder with a pointer to the mechanical check.

## 5. Verification Protocol (The Failing Test)

**Red (must fail before the fix):**

1. `cleargate doctor` (or the new parity check invoked directly) exits non-zero and names all 8
   drifted files. Today no such check exists, so this test cannot even be written against the current
   surface — that absence *is* the defect.
2. A live-mode run of the BUG-068 scenario — the existing red test re-pointed at `.claude/hooks/`
   rather than `cleargate-cli/scaffold/hosts/claude/.claude/hooks/` — fails at the dispatch-marker assertion, proving
   the live hook rejects the spawn.

**Green (must pass after the fix):**

3. The parity check exits 0 after re-sync, and continues to exit 0 across the three known live-only
   entries (they must be excluded, not flagged).
4. Re-running (2) against the re-synced live instance passes all scenarios.
5. A real agent dispatch in this repo produces a ledger row with a **non-empty**
   `sentinel_started_at` and an `agent_type` matching the dispatched role. Per the SPRINT-40
   flashcard, assert a **specific value on a specific row** — a distinct-count assertion over
   `agent_type` is satisfied by the very fabrication it exists to detect.
6. Regression guard: mutating any one canonical hook without re-syncing makes the parity check fail.

## Prior work

- [[BUG-068]] — *Every PreToolUse dispatch hook gates on the tool name `Task`; this build spawns with `Agent`.* `Completed` in SPRINT-40. **This bug is the reason BUG-068's fix is not in effect.** Not a duplicate: BUG-068 fixed the guard, BUG-085 is about the fix never reaching the running instance.
- [[BUG-069]] — *The token ledger's no-marker fallback inherits the previous row's attribution.* `Completed` in SPRINT-40. Its fallback path is what runs on every row because of this bug.
- [[BUG-024]] — *Token-Ledger Attribution Spike (SubagentStop misroutes 100% of rows).* `Completed`. The **first** occurrence of this exact canonical-vs-live failure, recorded in CLAUDE.md.
- [[CR-026]] — the `PreToolUse:Task` hook whose canonical-only landing caused the BUG-024 incident.
- [[CR-099]] — *The Dogfood Split Does Not Match What CLAUDE.md Says It Is.* `Completed`. Adjacent and complementary: CR-099 settled **tracking** (untracked `token-ledger.sh`, payload docs) and explicitly names "that gap is what let a stale hook run for an unknown period" — but it added **no drift detection**. BUG-085 is the detection CR-099 left open.
- [[CR-115]] — *`cleargate upgrade` announces what it is about to overwrite.* `Approved`. Sets the precedent that bears directly on Q1.
- [[STORY-033-02]] — *Parallel-Spawn Ledger Attribution (RUN_ID barrier-writer).* `Completed`. Earlier attribution work on the same hook; no overlap with propagation.

## Context Source

Direct owner request, 2026-09-04, arising from a token-efficiency investigation that measured the
wiki at ~1,670 tokens per session against 7.4B lifetime corpus tokens and found the token ledger
unable to attribute the difference. Root-causing the ledger led to the canonical/live drift.

All §3 evidence is machine-collected from this working tree on 2026-09-04. Prior-work search covered
`.cleargate/wiki/**`, `.cleargate/delivery/pending-sync/**`, `.cleargate/delivery/archive/**`, and
`.cleargate/FLASHCARD.md`; the eight related items above were found and are cited rather than
duplicated.

**Owner decisions:** sandrinio approved detect-and-warn, meta-repo-only scope, and M0 re-sync/M3 durable-check sequencing on 2026-09-11T22:19:09Z through “continue please” after the decision brief. The Architect must still review the cross-milestone execution plan before implementation.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity** — the owner's product choices are resolved; implementation and the sprint's Architect placement review remain pending.

- [x] The defect is reproduced deterministically from a clean checkout (§2, six numbered steps, all
      machine-verified 2026-09-04).
- [x] Expected vs. actual behaviour is stated without paraphrase, with file:line citations.
- [x] Evidence is raw and machine-collected, not recalled (§3).
- [x] Blast radius names exact in-scope and out-of-scope paths (§4).
- [x] Prior work is checked and recorded with `[[ID]]` citations, and the nearest neighbours
      ([[BUG-068]], [[CR-099]]) are distinguished from this item rather than merged into it.
- [x] Severity is justified: it silently nullifies a shipped `P0-Critical` fix and corrupts the
      telemetry every cost decision reads, but is scoped to the meta-repo and does not reach
      end-user installs.
- [x] A failing test is specified that must be red before the fix and green after (§5).
- [x] **Q1 is resolved** — detect-and-warn, with explicit backed-up re-sync and no silent overwrite.
- [x] **Q2 is resolved** — meta-repo-only check, using the post-relocation canonical baseline.
- [x] `approved: true` is set in the YAML frontmatter.

> Approval resolves scope, not execution evidence. Keep this bug open until both the M0 live re-sync proof and the M3 durable check are complete.
