# BUG-068 — Architect Post-Flight Review (§C.6)

`role: architect`

**Sprint:** SPRINT-40 · **Milestone:** M1 · **Wave:** 1
**Branch:** `story/BUG-068` @ `6b121b96` · **Base:** `82a4d323` (sprint/S-40 tip)
**Worktree:** `/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/BUG-068`
**Reviewed:** 2026-09-02 · **Plan under review:** `.cleargate/sprint-runs/SPRINT-40/plans/M1.md` (my own)

---

## VERDICT

**ARCH: PASS**

The implementation matches the M1.md §3.2 decided change shape verbatim — no drift, no
undeclared surface, no scope creep. `token-ledger.sh` is byte-identical, so the §2 partition and
every line number in it hold exactly for wave 2. The single pre-gate FAIL is confirmed
environmental **and I found no second cause**.

PASS is conditional on **nothing in BUG-068's diff**. It is unconditional. But four findings below
change what the *wave-2* Developer must be told, and three of them make M1.md §4 wrong as written.
I have amended the plan (§8 appended, pointer inserted under §4) rather than leaving the correction
in a report the wave-2 Developer does not read.

---

## Task 1 — the typecheck FAIL: diagnosis CONFIRMED, and challenged on four independent grounds

You asked to have this challenged rather than rubber-stamped. I tried to break the environmental
explanation and could not. Four measurements, any one of which is sufficient:

**1. Reproduced, with the error text.** Run in the worktree:

```
$ npm --prefix cleargate-cli run typecheck
npm error code ENOENT
npm error path .../.worktrees/BUG-068/cleargate-cli/package.json
npm error errno -2
EXIT=254
```

`254` is npm's own exit code for a failed command, emitted **before any compiler is spawned**.
`tsc` exits `0`, `1`, or `2` — it can never produce `254`. There is no compile in this failure.

**2. The identical command passes in the main checkout.** Same command, cwd
`/Users/ssuladze/Documents/Dev/ClearGate`: `EXIT=0`, `> cleargate@0.25.0 typecheck` / `> tsc --noEmit`.
So `cleargate-cli`'s real TypeScript is clean *today*. The 254 is not masking a latent type error —
there is no type error to mask.

**3. The check is structurally inapplicable to this repo's tracked content.** In the worktree:

| Measurement | Value |
|---|---|
| `git ls-files \| grep -cE '\.(ts\|tsx)$'` | **0** |
| `ls tsconfig*.json` (worktree root) | no matches |
| `git ls-files cleargate-cli \| wc -l` | **0** |
| `git check-ignore -v cleargate-cli` | `.gitignore:63:/cleargate-cli/` |

The meta-repo tracks **zero** TypeScript files. `git worktree add` cannot materialise
`cleargate-cli/` because it is gitignored and is an independent nested git repo
(`cleargate-cli/.git` exists). The failure is path-based and content-independent: it fires for every
story in this sprint, for every diff, including the empty diff.

**4. The gate's own logic confirms it is unconditional.** `pre_gate_runner.sh:208-219`:

```bash
if [[ -n "$typecheck_cmd" && -f "${WORKTREE}/package.json" ]]; then
  cd "$WORKTREE" && eval "$typecheck_cmd" > /dev/null 2>&1 || tc_exit=$?
```

The guard tests for the **worktree root** `package.json` (present — it is the meta-repo's
`cleargate-planning` stub with a single `check:no-pm-sdk` script), then evals a command that reaches
into a directory the guard never checks. There is no path by which diff content reaches this
result. Config source is `.cleargate/scripts/gate-checks.json:10` (mirroring `config.yml:28`).

**No second cause found. Nothing else is being hidden by this flag.**

I also checked whether the 254 could poison the three PASSes. `pre_gate_runner.sh:210` does a
**non-subshell** `cd "$WORKTREE"` (contrast the QA-mode form at `:85`, which is correctly
subshelled), so the cwd leaks into the rest of `run_arch`. Harmless here: every subsequent check
uses an absolute path (`${WORKTREE}/package.json`, `git -C "$WORKTREE"`, `find "$WORKTREE"`,
`node "${lint_script}" "${WORKTREE}"`, `CONFIG_YML` derived from `SCRIPT_DIR`). The
`new_deps` / `stray_env_files` / `qa_red_lint` PASSes are trustworthy. Worth a hygiene CR someday;
not this sprint.

**Waiving this a third time is correct.** The standing remedy — not for now — is to make
`gate-checks.json`'s `arch.typecheck`/`qa.typecheck` empty for this repo, which routes to the
`INFO: skipped (no package.json or cmd empty)` branch at `:218` and stops manufacturing a FAIL that
forces a non-removable Architect dispatch on every story. That is a config change, out of BUG-068's
surface, and it is the orchestrator's call.

---

## Task 2 — post-flight review of the merged-ready branch

### 2.1 Does the implementation match the plan?

**Yes — verbatim, all three surfaces. No drift.**

| Plan | Surface | Result |
|---|---|---|
| §3.2(a) | `pre-tool-use-task.sh` accept-predicate | Shipped **character-for-character** as decided, including the `case`/`esac` form, the `SUBAGENT_TYPE_PROBE` name, and the exact `printf` format string. |
| §3.2(b) | `pending-task-sentinel.sh` `IS_AGENT_SPAWN`, computed once, both guards | Shipped as decided. Barrier at `:64` now reads `IS_AGENT_SPAWN`; the two bypass conditions are byte-unchanged. `:167` reuses the variable and **deletes** the redundant second `jq` read of `tool_name` — an improvement the plan asked for. |
| §3.2(c) | `settings.json:15` `"Task"` → `"Task\|Agent"` | Shipped. Sibling matchers (`Edit\|Write` `:28`, `AskUserQuestion` `:37`, PostToolUse `:48`) byte-unchanged; file is valid JSON. |

**Files touched (`git diff --name-status 82a4d323..HEAD`):** exactly the three declared surfaces,
the BUG-068 story file (Task Breakdown ticks + a frontmatter `draft_tokens` relocation), the QA-Red
test, and the four wiki artefacts from the orchestrator's separate `6b121b96`. **No undeclared
file.** The fourth declared surface — `token-ledger.sh`, listed in the bug's §4 sandbox as an
*inspection* obligation — received zero edits, exactly as §2 required.

Structural checks I ran: `bash -n` clean on all three hooks; `JSON.parse` clean on `settings.json`;
ordering verified (`mkdir -p LOG_DIR` `:39` → `HOOK_LOG` `:40` → `TS` `:43` → rejection `printf`
`:55`, so the log write cannot fail on a fresh repo); `set -u` only, no `set -e`, so the
`*) [[ -n ... ]] && IS_AGENT_SPAWN=1` branch returning 1 cannot abort the script. Direct-invocation
smoke on a `mktemp -d` fixture: `Bash` payload → exit 0, log line
`no marker: rejected tool_name=Bash (not Task/Agent, no tool_input.subagent_type)`, no sentinel
written.

The header prose corrections in both hooks (the `PreToolUse:Task` → `PreToolUse:Task|Agent` sweep,
and the new BUG-068 provenance blocks) are the ones §3.2 asked for. The `.red.sh` spec is
byte-unchanged since `7029e212` (blob `a987ff6a` at both commits) despite the immutability gate not
covering it — the honour-system held.

### 2.2 Is the `token-ledger.sh` partition intact, and does it hold for wave 2?

**Yes on both. Verified by blob identity, not by inspection.**

```
token-ledger.sh @ 82a4d323 (base) : 1b4b280cbc8adb39d73a7f01de3e779d5252db0e
token-ledger.sh @ 6b121b96 (HEAD) : 1b4b280cbc8adb39d73a7f01de3e779d5252db0e   SAME
```

BUG-068 owns **zero lines** in that file, as §2 decided, and Sc4.2/Sc4.3 went green as a pure
consequence of the marker returning — the plan's central prediction, confirmed.

Because the blob is identical, every line number in §2's region table holds exactly. Wave 2 can take
`302-461` cleanly:

- `:302` is the `# --- resolve agent_type and work_item_id ---` header; `:461` is the closing `fi`
  of the outer `if [[ -z "${AGENT_TYPE}" ]]`. I proved the region is self-contained mechanically —
  excising `302-461` and running `bash -n` on the remainder is **syntax-clean**, so it is
  brace-balanced and safely replaceable wholesale.
- `:463-467` (`STORY_ID` derivation) and `:469+` are untouched and sit outside the region.

**`BANNER_SKIP_RE` is unaffected and its `:158` reference survives.** Four references measured on
the merged tip: `:62` (definition), **`:158` (the BUG-029 tuple-match — outside the edit region)**,
`:420`+`:421` (comment) and `:422`, `:442` (all inside `302-461`). §4.3's "KEEP `BANNER_SKIP_RE`"
instruction is correct as written and needs no revision.

**Wave-2 cut requirement (unchanged, restating because it is load-bearing):** BUG-069's worktree
must be cut from a base that already contains BUG-068's merge, per §6 risk 6. Merge-base of
`story/BUG-068` and `sprint/S-40` is still `82a4d323`, i.e. **not yet merged** at review time.

### 2.3 Architectural consequences of the accept-predicate that M1.md did not anticipate

Four. Three of them make M1.md §4 wrong for wave 2, so I amended the plan (§8) rather than only
reporting them. **None is a defect in BUG-068's diff.** Full detail in `plans/M1.md` §8.1-§8.5;
summarised here.

**(a) The ALLOW_LIST gap does not produce `unattributed` rows — my own §3.5/§6.3/§7.1 conclusion
was wrong.** The two hooks are not symmetric. `pre-tool-use-task.sh:79-83` gates the *dispatch
marker* on a 5-name `ALLOW_LIST`; `pending-task-sentinel.sh` has **no allow-list at all**
(`grep -c ALLOW` → 0) and writes a sentinel for every spawn passing `IS_AGENT_SPAWN`.
`token-ledger.sh:249-257` reads that sentinel as second-priority attribution. So post-068 a `devops`
dispatch gets **no marker but a correctly-attributed sentinel**, and post-069 its row reads
`agent_type: "devops"`, not `"unattributed"`. The gap costs the BUG-029 tuple-match (parallel-wave
disambiguation), not attribution.

This also downgrades open decision 1: the "permanent hole in the ledger" framing — in the plan and
in today's flashcard — overstates it. Option (c) *accept the gap* is now clearly the right call for
this sprint. Corrected card appended.

**(b) The refusal predicate must reject the literal `"unknown"`, not only the empty string.**
`pending-task-sentinel.sh:173` defaults `agent_type` to the **string** `"unknown"`, and
`IS_AGENT_SPAWN` is satisfied by `tool_name ∈ {Task, Agent}` alone — so a spawn with no
`subagent_type` writes a non-empty `"unknown"`. §4.3's `if [[ -z "${AGENT_TYPE}" ]]` never fires and
the row ships `agent_type: "unknown"` — the exact fake attribution BUG-069 exists to kill, arriving
through the one source §4.3 treats as unconditional ground truth. §8.2 changes the guard to
`[[ -z "${AGENT_TYPE}" || "${AGENT_TYPE}" == "unknown" ]]` and adds a fifth red test to §4.5.
A `-z`-only implementation would otherwise have scored identically to a correct one.

**(c) Stale-sentinel inheritance survives BUG-069 as planned, and is newly live post-068.** The two
ground-truth files are claimed asymmetrically: the dispatch marker is renamed to `.processed-$$` at
`:213-214` **before** being read, but the sentinel only at `:471-473` — **after** the
`USAGE_JSON`-empty early exit at `:299`. I measured `:299` reachable on an *existing* transcript: a
truncated final JSONL line (what a concurrently-appended transcript looks like) makes `jq -cs` fail
and emit nothing. On that path the marker is destroyed (renamed out of the `.dispatch-*.json` glob,
never deleted) while the sentinel survives — so the **next** dispatch's
`ls -t .pending-task-*.json | head -1` inherits the **previous** dispatch's attribution. That is
"copy the previous dispatch's attribution" reaching the row through `SENTINEL_*`, where BUG-069's
refusal cannot see it. No sweeper removes orphaned `.processed-*` files. Dormant before BUG-068
(neither file was ever written in this build); live from the merge onward. **Explicitly fenced out
of BUG-069's scope** in §8.3 — different defect class, different lines, wants its own red test.
Escalated as open decision 4.

**(d) The hook-level rename-proofing is unreachable through the settings.json route.** Both hooks
share the single `"matcher": "Task|Agent"` block at `settings.json:14-26`, and the matcher is the
outer gate — a non-matching tool name never reaches either hook. So the predicate's third disjunct
(`subagent_type` present under some other tool name) is dead through the settings route, and the
next host rename is stopped at `settings.json:15`, not at the hook. **Rename-proofing lives in the
matcher; the hook predicate is defence-in-depth for direct invocation and tests.** The operational
consequence: `sprint-context.md` §Goal Acceptance Check **item 2's "including a line for a rejected
tool name" clause will most likely never be satisfied in the live log**, because no rejected tool
name can route to the hook. Sc3 passes only because the test pipes a `Bash` payload directly. Do
not read the missing line at Gate 4 as a failed fix — the path is proven, by direct invocation and
by Sc3.1/Sc3.2. Escalated as open decision 5 with two options in §8.4.

---

## Plan amendments made (Architect-owned, appended never rewritten)

1. `.cleargate/sprint-runs/SPRINT-40/plans/M1.md` — appended **§8** (§8.1-§8.5), 5 subsections.
   Supersedes §4.1 "May NOT assume" bullet 1 and §4.3's `agent_type` guard. All prior text
   preserved.
2. Same file — inserted a 3-line pointer immediately under the `## 4. Per-story blueprint — BUG-069`
   heading so a Developer reading §4 top-down cannot miss §8. This is the failure mode from
   FLASHCARD `#worktree #planning #danger` (2026-08-27): an amendment the Developer never sees.
3. `.cleargate/sprint-runs/SPRINT-40/sprint-context.md` — two `## Mid-Sprint Amendments` rows
   (`CR:approach-change`, wave-2 only; and the Goal Acceptance Check item 2 flag).

**Timing note:** these are safe to land now precisely because BUG-069's worktree has not been cut.
Had it been cut, the amendment would have been invisible to its Developer and I would have had to
route it through the dispatch text instead.

---

## Out of scope — confirmed as recorded orchestrator decisions, not defects

Re-verified, no objection to any:

- **`ALLOW_LIST` covers 5 of 11 roles → follow-on CR.** Endorsed, and finding (a) **reduces** its
  severity: the affected roles are still attributed via the sentinel. Recommend the follow-on CR be
  written against the tuple-match precision loss, not against "missing attribution".
- **Task Breakdown row 5 unticked → post-merge orchestrator step.** Correct. Verified the live
  instance is still unfixed: `.claude/settings.json:15` is `"matcher": "Task"`, and all three hook
  blobs differ from canonical (`token-ledger.sh` is the one that matches — as it must). The M1.md §5
  per-file re-sync recipe stands unchanged.
- **`.red.sh` outside the immutability hook → deferred.** Correct, and the discipline held: blob
  `a987ff6a` unchanged across both commits.

---

## Open decisions for orchestrator

1. **(new, wave-2 blocking-ish)** Adopt M1.md §8.2's `"unknown"` guard and the fifth red test before
   QA-Red is dispatched for BUG-069. Without it the story's own acceptance is defeatable.
2. **(new, §8.5 item 4)** Where does the sentinel-claim lifecycle asymmetry (§8.3) go? Recommend a
   follow-on bug, not a BUG-069 scope-change.
3. **(new, §8.5 item 5)** How is Goal Acceptance Check item 2 settled at Gate 4? Recommend restating
   it as satisfied by Sc3.1/Sc3.2 rather than by a live-log line that cannot appear.
4. **(standing, mine)** `gate-checks.json` `arch.typecheck`/`qa.typecheck` manufacture a FAIL on
   every story in this sprint and therefore force the non-removable Architect dispatch every time.
   Emptying both keys routes to the `INFO: skipped` branch. Out of any current story's surface.

---

## Script Incidents

None. No wrapped script was invoked during this review — all measurements were read-only
`git`/`grep`/`bash -n`/`jq` probes plus two direct hook invocations against `mktemp -d` fixtures.

## Flashcards recorded

Four, all `#hooks`-tagged, appended to `.cleargate/FLASHCARD.md`. One is an explicit partial
correction of the 2026-09-01 ALLOW_LIST card written during M1 planning.
