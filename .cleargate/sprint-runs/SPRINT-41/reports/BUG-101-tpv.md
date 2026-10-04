role: architect

# BUG-101 TPV report (SPRINT-41 M7)

```
TPV: REJECTED — test-only re-seal, count unchanged
SEALED: cli story/BUG-101 @ 59da7707868d4c1ea834c0998265212ebf7c41cd (base main f0c33f7)
RESEAL_PATCH: reports/BUG-101-tpv-reseal.patch (also embedded below, byte-identical)
RESEAL_SHA256: a185dfc58e6726d3b94b4b7c5f6d3e5fad8c44ea550eeba84759471014c6b09b
RESEAL_SCOPE: 1 file (test/hooks/codex-dispatch-attribution.red.node.test.ts), +105/-7; git apply --check clean on <cw> @ 59da770 (read-only); 0 CR bytes; no src/scaffold/script/helper/fixture change; Test 31 and init-fixture.ts untouched
COUNTS_AFTER_RESEAL: 6 tests in the new file (5 red + 1 already-green anchor at the seal, same as sealed); Test 31 file 3 (1 red / 2 green); D4 +6 unchanged (3659 / 3657 after -13)
MUTANTS: sealed suite kills 22/37; re-sealed suite kills 36/37; the survivor is the non-atomic claim, which no serial test can observe
PLAN_AMENDMENT: "## Amendments to append to M7.md" below (TPV101-A1..A4)
ARCH_BOUNCE: yes — orchestrator runs update_state.mjs BUG-101 --arch-bounce, then routes to QA-Red with the patch
```

## Verdict in one paragraph

The seal is wired correctly:
- every import resolves;
- the hook is spawned from the canonical path, with `lib/harness.sh` as a real sibling;
- the counts reproduce exactly (5 red + 1 anchor; Test 31 red, Tests 32 and 33 green);
- every red fails for the right reason;
- the `init-fixture.ts` refusal hash equals the measured pre-fix hash.

A plan-conformant prototype turns both red files green and keeps every regression witness green. The M2 pair turns from 5/5 red to 20/20 green on the prototype's new hook bytes.

The seal is still **vacuous on the rule that matters most, the source order.** Each sealed case exercises one source alone. As a result, 14 of the 30 codex-branch mutants pass the sealed file, including:
- marker before `task_name`, and message before `task_name` or marker;
- oldest marker first;
- stopping at the newest marker instead of skipping past other types;
- preferring a marker that matches `session_id`;
- no consumption on a `task_name` hit, or consuming the wrong marker;
- leaving the claimed marker parked as `.json.claimed.N`;
- a case-sensitive match, dropping `sprint`, or dropping the word boundary.

QA-Red's own flag (consume on a `task_name` hit) is one of these gaps, and it matters for behaviour, not only hygiene. See TPV101-A2.

The re-seal adds sub-cases inside T1, T2 and T5, plus one payload field in T6. It adds no tests, and it kills 36/37 mutants.

## Reproduced counts

Scratch: `/private/tmp/cg-s41-tpv101-20260927T085502Z`. Setup:
- `git clone --no-hardlinks <cw>`, checked out at `59da770`;
- `node_modules` symlinked from the cli main checkout;
- `npm run prebuild` exited 0.

| Tree | `codex-dispatch-attribution.red` | `codex-sprint-execution-render.red` | M2 pair (`CLEARGATE_INIT_BASELINE`, compare only) |
|---|---|---|---|
| `59da770` sealed | 1/6 (T1–T5 red, T6 green) | 2/3 (Test 31 red) | claude-adapter 0/5: `<BUG-101 sentinel delta not landed: canonical still 162a1b17…58ab>` |
| sealed + re-seal | 1/6 (T1–T5 red, T6 green) | 2/3 | same |
| prototype + sealed tests | 6/6 | 3/3 | 20/20 (claude-adapter 5 + init-host-parity 15) |
| prototype + re-seal | 6/6, three runs in a row with no flake | 3/3 | 20/20 |

Why each test is red at the seal (checked against assertion output):
- **T1 and T2:** `work_item_id` is `''` where `STORY-001-01` is expected. The ciphertext never matches, and the baseline has no `task_name` or marker source.
- **T3, T4 and T5:** the `source=` field is `null`. The id is already correct at the baseline.

`BUG101_SENTINEL_PRE` (`162a1b17…58ab`) was re-measured on `59da770`. It equals `sed 's/__CLEARGATE_VERSION__/0.0.0-m2/g' <canonical sentinel> | shasum -a 256`. The prototype's hash is `e9022ed1…0464`. It is not in the refusal chain, so `bug085SentinelCurrentHash()` returns it and the M2 row passes. Any Developer bytes that differ from the four refused hashes compose the same way.

## Conformance table (M7 §3 BUG-101, errata E1, E3, E4, E15; OD-M7-3)

| # | Plan rule | Sealed coverage | Verdict | Re-seal |
|---|---|---|---|---|
| 1 | Source 1: `task_name` → normalised id, `source=task_name` | T1 | covered | — |
| 2 | `task_name` regex: case-insensitive, includes `sprint`, `(^\|[_/-])` boundary | none (only lowercase `story_…`) | **gap** (M13, M14, M17 survive) | T1-C `SPRINT_01_REPORTER` → `SPRINT-01`; T5-B `history_12_debug_3` → no id |
| 3 | A `task_name` hit consumes one fresh marker with the same `work_item_id` **and** `agent_type` | none (QA-Red flag) | **gap** (M09, M10, M10b survive) | T1-B |
| 4 | Order: `task_name` before marker | none (T1 has no marker) | **gap** (M08 survives) | T1-B (a newer same-type marker for another id) |
| 5 | Order: `task_name` before message | none (T1's message is ciphertext) | **gap** (M06 survives) | T1-B (a plaintext message naming `STORY-002-02`) |
| 6 | Source 2: claim, read, `rm` | T2 | partial: the `.json` filter misses a claim parked as `.json.claimed.N` (M11 survives) | T2 checks every `.dispatch-*` entry |
| 7 | E4: newest mtime first | none (single marker) | **gap** (M02 survives) | T2-B |
| 8 | E4: within 10 minutes | T3-A (15 min) | covered for a missing or too-wide window (M03, M20); a 1-minute window (M21) survives | T2-B / T1-B markers at 1–4 minutes |
| 9 | E4: `agent_type` equal; skip past other types | T3-B (one wrong-type marker) | partial (M04 killed; M12 "newest only" survives) | T2-B (a newer architect marker must be skipped) |
| 10 | E4: never `session_id` | T2 (marker session differs from payload) | partial (M01 killed; M22 "prefer a session match" survives) | T2-B (the older same-type marker carries the payload's own `session_id` and must lose) |
| 11 | Order: marker before message | none (T2's message is ciphertext) | **gap** (M06 survives) | T2-B (a plaintext message naming `STORY-003-03`) |
| 12 | Source 3: message regex (scripted provider) | T4, T3 | covered | — |
| 13 | Source 4: `''`, sentinel written, exit 0, `source=none` | T5 | covered | — |
| 14 | ` source=` on the codex printf only | T1–T5 / T6 | covered | — |
| 15 | Claude path unchanged (E1 Gherkin 4) | T6, Test 40 R-H4, `hooks-claude-parity` | partial (a hoisted `task_name` on the Claude path, C03, survives) | T6's Claude payload carries `task_name: 'story_555_55_qa'`, which must be ignored |
| 16 | R4 text (I16 render half, OD-M7-3) | Test 31 | covered, verbatim with the plan | — |
| 17 | R5 cells | Test 31 | covered, verbatim (no `\|` remains in the new cell, so no JS escaping is needed) | — |
| 18 | E1: fix in the Claude file's codex branch plus `gen:codex`; generated copies never hand-edited | Tests spawn the canonical file; a stale `.codex` copy fails `codex-payload.red` Test 19, render Test 33 and `--check` (G01, measured) | covered; no test forces a hand edit | — |
| 19 | `init-fixture` refusal chain (M3-A54) | `BUG101_SENTINEL_PRE` | covered; composes (above) | — |
| 20 | Count 6, D4 +6 | 6 | covered | unchanged |
| — | Plan: "Copy `lib/harness.sh` beside the hook" | The canonical file is spawned in place; `lib/harness.sh` is its real sibling | equivalent; accepted (TPV101-A4) | — |
| — | Unclaimed markers are never deleted | T3 (stale and other-type markers survive), T6 | covered; plan-faithful (TPV101-A3) | T1-B / T2-B extend it to other-id markers |

## Prototype (scratch only)

The minimal plan-conformant build:
- **Hook:** `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh` changes only in its codex branch (+50/−2 lines). The Claude printf and the Claude jq shape are byte-unchanged.
- **Render:** `scripts/build-codex-payload.mjs` R4 and R5 are set to Test 31's constants.
- **Regeneration:** `npm run gen:codex` regenerated `.codex/hooks/pending-task-sentinel.sh` and `core/.agents/skills/sprint-execution/SKILL.md`.

| Run | Result |
|---|---|
| both red files, sealed | 9/9 |
| both red files, re-sealed | 9/9 |
| `codex-hooks-harness.red` | 91/91 |
| `codex-hook-scripts.red` | 18/18 |
| `pending-task-sentinel-cards.red` | 13/13 |
| `flashcard-gate-parity.red` | 14/14 |
| `hooks-claude-parity.red.integration` | 19/19 |
| `codex-payload.red` | 14/14 |
| **combined final run** | **178/178** |
| `build-codex-payload.mjs --check` | exit 0 |
| `npm run typecheck` | exit 0 |
| M2 pair | 20/20 |
| 11 other files that name the sentinel (`hooks-snapshots`, `hook-signal.red`, `run-id-ledger-attribution.red`, `harness-shim.red`, `clean-room-evidence.red`, `scaffold-relocation.red`, `parallel-dispatch.red`, `init-codex.red`, `codex-payload.red`, `autonomy-contract.red`, `contract-first-dag-text.red`) | 175/199 both before and after the prototype, with identical failure sets (56 lines, `diff` empty). The 24 failures come from the scratch environment: no outer meta-repo docs beside the clone. They are not fallout. |

Reference shape (non-binding; it passes everything above on macOS `/bin/bash` 3.2.57):

```bash
  WORK_ITEM_ID=""
  WORK_ITEM_SOURCE="none"
  if [[ "${HOST}" == "codex" ]]; then
    claim_dispatch_marker() {             # $1 = required work_item_id, or "" for any
      local want="$1" m at wi claimed
      local cands=()
      while IFS= read -r m || [[ -n "${m}" ]]; do
        [[ -n "${m}" ]] && cands+=("${m}")
      done < <(find "${SPRINT_DIR}" -maxdepth 1 -type f -name '.dispatch-*.json' -mmin -10 2>/dev/null)
      [[ "${#cands[@]}" -gt 0 ]] || return 1   # an empty `ls -t` would list the cwd
      while IFS= read -r m || [[ -n "${m}" ]]; do
        [[ -f "${m}" ]] || continue
        at="$(jq -r '.agent_type // empty' "${m}" 2>/dev/null)"
        [[ "${at}" == "${AGENT_TYPE}" ]] || continue          # skip, never stop
        wi="$(jq -r '.work_item_id // empty' "${m}" 2>/dev/null)"
        [[ -n "${want}" && "${wi}" != "${want}" ]] && continue
        claimed="${m}.claimed.$$"
        mv "${m}" "${claimed}" 2>/dev/null || continue         # one racer wins
        wi="$(jq -r '.work_item_id // empty' "${claimed}" 2>/dev/null)"
        rm -f "${claimed}"
        printf '%s' "${wi}"; return 0
      done < <(ls -t "${cands[@]}" 2>/dev/null)                 # newest mtime first
      return 1
    }
    TASK_NAME="$(printf '%s' "${INPUT}" | jq -r '.tool_input.task_name // empty')"
    TASK_ID="$(printf '%s' "${TASK_NAME}" | grep -oiE '(^|[_/-])(story|epic|cr|bug|proposal|sprint)[-_]?[0-9]+([-_][0-9]+)?' \
      | head -1 | sed -E 's#^[_/-]##' | tr 'abcdefghijklmnopqrstuvwxyz_' 'ABCDEFGHIJKLMNOPQRSTUVWXYZ-')"
    if [[ -n "${TASK_ID}" ]]; then
      WORK_ITEM_ID="${TASK_ID}"; WORK_ITEM_SOURCE="task_name"
      claim_dispatch_marker "${TASK_ID}" >/dev/null || true
    else
      MARKER_ID="$(claim_dispatch_marker "")"
      [[ -n "${MARKER_ID}" ]] && { WORK_ITEM_ID="${MARKER_ID}"; WORK_ITEM_SOURCE="marker"; }
    fi
  fi
  if [[ -z "${WORK_ITEM_ID}" ]]; then
    # existing :329-332 extraction, unchanged (Claude always lands here)
    [[ -n "${WORK_ITEM_ID}" ]] && WORK_ITEM_SOURCE="message"
  fi
```

## Mutant table

Each mutant is planted once on the prototype. The numbers are measured, not reasoned:
- the sealed and re-sealed attribution files were run against every hook mutant;
- the Claude-path mutants were also run against `codex-hook-scripts.red` and `hooks-claude-parity`;
- the render mutants were run against `codex-sprint-execution-render.red`.

| ID | Mutant | Sealed kills | Re-sealed kills |
|---|---|---|---|
| M01 | marker must match the payload `session_id` | T2 | T1, T2 |
| M02 | oldest marker first (`ls -tr`) | — | T2 |
| M03 | no 10-minute window | T3 | T3 |
| M04 | `agent_type` ignored | T3 | T1, T2, T3 |
| M05 | `task_name` never read | T1 | T1 |
| M06 | plaintext message before `task_name` / marker | — | T1, T2 |
| M07a | raw message taken as the id when the regex misses | T5 | T5 |
| M07b | raw (encrypted) message read first as the id | T1–T5 | T1–T5 |
| M08 | marker before `task_name` | — | T1 |
| M09 | a `task_name` hit consumes no marker | — | T1 |
| M10 | a `task_name` hit consumes any same-type marker | — | T1 |
| M10b | a `task_name` hit consumes a same-id marker of any type | — | T1 |
| M11 | claimed marker parked (`.claimed.N` never removed) | — | T1, T2 |
| M11b | claim copies and never consumes | T2 | T1, T2 |
| M12 | newest marker only (stops at an other-type marker) | — | T1, T2 |
| M13 | no `(^\|[_/-])` boundary | — | T5 |
| M14 | case-sensitive match | — | T1 |
| M15 | no `_` → `-` normalisation | T1 | T1 |
| M16 | no upper-casing | T1 | T1 |
| M17 | `sprint` dropped from the prefix list | — | T1 |
| M18 | marker hit logged as `task_name` | T2 | T2 |
| M19 | `task_name` hit logged as `none` | T1 | T1 |
| M20 | 60-minute window | T3 | T3 |
| M21 | 1-minute window | — | T1, T2 |
| M22 | a marker matching `session_id` is preferred | — | T2 |
| M23 | no sentinel when there is no id | T5 | T5 |
| M24 | exit 1 when there is no id | T5 | T5 |
| M25 | codex message fallback dropped | T3, T4 | T3, T4 |
| M26 | stale markers swept (unplanned deletion) | T3 | T3 |
| M27 | non-atomic claim (read, then `rm`, no `mv`) | — | — (equivalent under serial tests; see below) |
| C01 | the codex source order also runs on the Claude path | T6 | T6 |
| C02 | the Claude printf gains `source=` | T6, Test 40 R-H4 | T6, Test 40 R-H4 |
| C03 | the Claude path reads `task_name` (hoisted) | — | T6 |
| C04 | the Claude sentinel gains a `source` field | Test 40 R-H4 | Test 40 R-H4 |
| R01 | R4 left at the old "Per-story gate" text | Test 31, 33 | Test 31, 33 |
| R02 | R5 spawn row without `task_name` | Test 31, 33 | Test 31, 33 |
| R03 | R5 `write_dispatch.sh` row left at "skip the fallback" | Test 31, 33 | Test 31, 33 |
| G01 | canonical fixed but `gen:codex` not run (stale `.codex` copy) | `codex-payload.red` Test 19 + 2, render Test 33, `--check` exit 1 | same |

**Totals:**
- **Sealed:** 22/37. That is 16/30 codex branch, 3/4 Claude path and 3/3 render.
- **Re-sealed:** 36/37. That is 29/30, 4/4 and 3/3.
- G01 is killed by both suites (outside the 37).

**M27 survivor.** The `mv` claim guarantees that two concurrent same-type dispatches never claim one marker. A serial test cannot observe that property, and a race harness would pass or fail by timing. It stays as a brief item: the Developer must use `mv` as the claim.

## Re-seal patch (test-only, against `59da770`)

- Scope: `test/hooks/codex-dispatch-attribution.red.node.test.ts` only, +105/−7.
- sha256 `a185dfc58e6726d3b94b4b7c5f6d3e5fad8c44ea550eeba84759471014c6b09b`.
- The same bytes are in `reports/BUG-101-tpv-reseal.patch`.

Extract the embedded copy with:

`awk '/^```diff BUG-101-tpv-reseal$/{f=1;next} f&&/^```$/{exit} f' reports/BUG-101-tpv.md > /tmp/bug101.patch`

The extracted file's sha256 must equal the value above.

What the patch changes:
1. **`writeMarker`.** The filename epoch now follows the marker's age, as `write_dispatch.sh` stamps it. Newest-by-mtime and newest-by-filename then agree, so multi-marker cases are deterministic under either ordering.
2. **`dispatchEntries()`.** This new helper returns every `.dispatch-*` entry. The consumption checks now catch a parked claim.
3. **T1-B.** Uses a newer `{STORY-999-99, qa}` marker, a `{STORY-001-01, architect}` marker, its own `{STORY-001-01, qa}` marker, and a plaintext message naming `STORY-002-02`. Expected: `STORY-001-01`, `source=task_name`, only its own marker deleted.
4. **T1-C.** `SPRINT_01_REPORTER` → `SPRINT-01`.
5. **T2.** Checks strict deletion.
6. **T2-B.** Uses a newer architect marker, a newest qa marker (`STORY-002-02`), an older qa marker carrying the payload's `session_id`, and a plaintext message naming `STORY-003-03`. Expected: `STORY-002-02`, `source=marker`, exactly that marker deleted.
7. **T5-B.** `history_12_debug_3` carries no id.
8. **T6.** The Claude payload carries a `task_name` that must be ignored.

QA-Red's 3-point gate:
1. the patch sha256 matches;
2. `git apply --check` is clean on `59da770`;
3. the staged file list equals the one test file.

Then re-measure: 5 red + 1 green in that file, and Test 31 still 1 red / 2 green.

```diff BUG-101-tpv-reseal
diff --git a/test/hooks/codex-dispatch-attribution.red.node.test.ts b/test/hooks/codex-dispatch-attribution.red.node.test.ts
index 518a8e4..4a76d9c 100644
--- a/test/hooks/codex-dispatch-attribution.red.node.test.ts
+++ b/test/hooks/codex-dispatch-attribution.red.node.test.ts
@@ -80,7 +80,10 @@ function writeMarker(
   sprintDir: string,
   opts: { workItemId: string; agentType: string; ageMinutesAgo?: number; sessionId?: string },
 ): string {
-  const epoch = Math.floor(Date.now() / 1000);
+  // TPV (BUG-101): the filename epoch is the marker's own (aged) write time, as
+  // write_dispatch.sh stamps it, so newest-by-mtime and newest-by-filename agree
+  // and a multi-marker test is deterministic under either ordering.
+  const epoch = Math.floor((Date.now() - (opts.ageMinutesAgo ?? 0) * 60_000) / 1000);
   const rand = Math.floor(Math.random() * 100000);
   const p = path.join(sprintDir, `.dispatch-${epoch}-${process.pid}-${rand}.json`);
   const body = {
@@ -100,6 +103,11 @@ function dispatchMarkers(sprintDir: string): string[] {
   return fs.readdirSync(sprintDir).filter((n) => n.startsWith('.dispatch-') && n.endsWith('.json'));
 }
 
+/** Every `.dispatch-*` entry, whatever its suffix: a consumed marker is deleted (plan: mv to a claim name, read, rm), never parked. */
+function dispatchEntries(sprintDir: string): string[] {
+  return fs.readdirSync(sprintDir).filter((n) => n.startsWith('.dispatch-')).sort();
+}
+
 function codexSentinels(sprintDir: string): string[] {
   return fs.readdirSync(sprintDir).filter((n) => n.startsWith('.pending-codex-task-'));
 }
@@ -159,7 +167,7 @@ function codexPayload(taskName: string, agentType: string, message: string): unk
 
 // ── T1: the work item comes from task_name, even with an encrypted message ──
 
-test('T1: task_name "story_001_01_qa" plus a ciphertext message -> STORY-001-01, source=task_name', () => {
+test('T1: task_name "story_001_01_qa" plus a ciphertext message -> STORY-001-01, source=task_name; task_name outranks markers and the message, consumes its own marker only; SPRINT_01_REPORTER -> SPRINT-01', () => {
   const { root, sprintDir } = mkRoom();
   try {
     const r = invoke(root, 'codex', codexPayload('story_001_01_qa', 'qa', CIPHERTEXT));
@@ -173,11 +181,55 @@ test('T1: task_name "story_001_01_qa" plus a ciphertext message -> STORY-001-01,
   } finally {
     fs.rmSync(root, { recursive: true, force: true });
   }
+  // TPV sub-case B (plan "Source order" 1): task_name is the first source — it beats a
+  // newer same-type marker and a plaintext message naming other ids — and a task_name hit
+  // consumes exactly one fresh marker with the SAME work_item_id AND agent_type.
+  {
+    const { root, sprintDir } = mkRoom('SPRINT-BUG101T1B');
+    try {
+      const otherId = writeMarker(sprintDir, { workItemId: 'STORY-999-99', agentType: 'qa', ageMinutesAgo: 1 });
+      const otherType = writeMarker(sprintDir, { workItemId: 'STORY-001-01', agentType: 'architect', ageMinutesAgo: 2 });
+      const own = writeMarker(sprintDir, { workItemId: 'STORY-001-01', agentType: 'qa', ageMinutesAgo: 3 });
+      const r = invoke(root, 'codex', codexPayload('story_001_01_qa', 'qa', 'STORY=002-02 plaintext brief'));
+      assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
+      const sentinels = codexSentinels(sprintDir);
+      assert.equal(sentinels.length, 1);
+      const sentinel = JSON.parse(fs.readFileSync(path.join(sprintDir, sentinels[0]!), 'utf8')) as Record<string, unknown>;
+      assert.equal(sentinel.work_item_id, 'STORY-001-01', 'task_name outranks a newer same-type marker (STORY-999-99) and the message (STORY-002-02)');
+      const line = wroteSentinelLine(root, 'SPRINT-BUG101T1B');
+      assert.equal(sourceField(line), 'task_name', `expected source=task_name, got: ${JSON.stringify(line)}`);
+      assert.deepEqual(
+        dispatchEntries(sprintDir),
+        [path.basename(otherId), path.basename(otherType)].sort(),
+        'a task_name hit consumes its own {STORY-001-01, qa} marker (no orphan pile-up) and leaves the other-id and other-type markers untouched',
+      );
+      assert.ok(!fs.existsSync(own), 'the matching marker must be deleted');
+    } finally {
+      fs.rmSync(root, { recursive: true, force: true });
+    }
+  }
+  // TPV sub-case C (plan "Source order" 1): the match is case-insensitive and covers a
+  // sprint-level dispatch (R5: `sprint_01_reporter` -> SPRINT-01).
+  {
+    const { root, sprintDir } = mkRoom('SPRINT-BUG101T1C');
+    try {
+      const r = invoke(root, 'codex', codexPayload('SPRINT_01_REPORTER', 'reporter', CIPHERTEXT));
+      assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
+      const sentinels = codexSentinels(sprintDir);
+      assert.equal(sentinels.length, 1);
+      const sentinel = JSON.parse(fs.readFileSync(path.join(sprintDir, sentinels[0]!), 'utf8')) as Record<string, unknown>;
+      assert.equal(sentinel.work_item_id, 'SPRINT-01', 'an upper-case sprint-level task_name normalises to SPRINT-01');
+      const line = wroteSentinelLine(root, 'SPRINT-BUG101T1C');
+      assert.equal(sourceField(line), 'task_name', `expected source=task_name, got: ${JSON.stringify(line)}`);
+    } finally {
+      fs.rmSync(root, { recursive: true, force: true });
+    }
+  }
 });
 
 // ── T2: the work item comes from a fresh, agent_type-matching dispatch marker ─
 
-test('T2: a fresh {STORY-001-01, qa} marker plus task_name "qa_verify" -> id from the marker, marker consumed, source=marker', () => {
+test('T2: a fresh {STORY-001-01, qa} marker plus task_name "qa_verify" -> id from the marker, marker consumed, source=marker; the newest same-type fresh marker wins, never by session_id, and beats the message', () => {
   const { root, sprintDir } = mkRoom();
   try {
     writeMarker(sprintDir, { workItemId: 'STORY-001-01', agentType: 'qa' });
@@ -187,12 +239,41 @@ test('T2: a fresh {STORY-001-01, qa} marker plus task_name "qa_verify" -> id fro
     assert.equal(sentinels.length, 1, `expected exactly one codex sentinel; got: ${JSON.stringify(sentinels)}`);
     const sentinel = JSON.parse(fs.readFileSync(path.join(sprintDir, sentinels[0]!), 'utf8')) as Record<string, unknown>;
     assert.equal(sentinel.work_item_id, 'STORY-001-01', 'the id must come from the marker (task_name has none, message is ciphertext)');
-    assert.deepEqual(dispatchMarkers(sprintDir), [], 'the claimed marker must be consumed (deleted), not left to pile up');
+    assert.deepEqual(dispatchEntries(sprintDir), [], 'the claimed marker must be consumed (deleted, under no other name), not left to pile up');
     const line = wroteSentinelLine(root, 'SPRINT-BUG101');
     assert.equal(sourceField(line), 'marker', `expected source=marker on the log line, got: ${JSON.stringify(line)}`);
   } finally {
     fs.rmSync(root, { recursive: true, force: true });
   }
+  // TPV sub-case B (E4 ruling): newest mtime first among fresh markers whose agent_type
+  // equals the spawn's — a newer other-type marker is skipped, not a stop — and session_id
+  // is never compared: the older same-type marker carries the spawn's own session_id and
+  // still loses. A claimable marker also outranks a plaintext message (source 2 before 3).
+  {
+    const { root, sprintDir } = mkRoom('SPRINT-BUG101T2B');
+    try {
+      const payload = codexPayload('qa_verify', 'qa', 'STORY=003-03 plaintext brief') as { session_id: string };
+      const newestOtherType = writeMarker(sprintDir, { workItemId: 'STORY-777-77', agentType: 'architect', ageMinutesAgo: 1 });
+      const newestSameType = writeMarker(sprintDir, { workItemId: 'STORY-002-02', agentType: 'qa', ageMinutesAgo: 2 });
+      const olderSameSession = writeMarker(sprintDir, { workItemId: 'STORY-001-01', agentType: 'qa', ageMinutesAgo: 4, sessionId: payload.session_id });
+      const r = invoke(root, 'codex', payload);
+      assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
+      const sentinels = codexSentinels(sprintDir);
+      assert.equal(sentinels.length, 1);
+      const sentinel = JSON.parse(fs.readFileSync(path.join(sprintDir, sentinels[0]!), 'utf8')) as Record<string, unknown>;
+      assert.equal(sentinel.work_item_id, 'STORY-002-02', 'the newest fresh qa marker wins: not the older session-matching one, not the newer architect one, not the message');
+      const line = wroteSentinelLine(root, 'SPRINT-BUG101T2B');
+      assert.equal(sourceField(line), 'marker', `expected source=marker, got: ${JSON.stringify(line)}`);
+      assert.ok(!fs.existsSync(newestSameType), 'the claimed marker must be deleted');
+      assert.deepEqual(
+        dispatchEntries(sprintDir),
+        [path.basename(newestOtherType), path.basename(olderSameSession)].sort(),
+        'exactly one marker is consumed per dispatch; the others stay for later dispatches',
+      );
+    } finally {
+      fs.rmSync(root, { recursive: true, force: true });
+    }
+  }
 });
 
 // ── T3: a stale or wrong-agent_type marker is never claimed; falls through ──
@@ -256,7 +337,7 @@ test('T4: a plaintext message ("STORY=001-01 …") still attributes, with no mar
 
 // ── T5: no source at all -> empty work_item_id, no crash, exit 0 ────────────
 
-test('T5: no task_name id, no marker, no message id -> work_item_id "", sentinel still written, exit 0, source=none', () => {
+test('T5: no task_name id, no marker, no message id -> work_item_id "", sentinel still written, exit 0, source=none; a prefix inside a word is not an id', () => {
   const { root, sprintDir } = mkRoom();
   try {
     const r = invoke(root, 'codex', codexPayload('noop_task', 'qa', 'no identifiable reference here'));
@@ -270,6 +351,23 @@ test('T5: no task_name id, no marker, no message id -> work_item_id "", sentinel
   } finally {
     fs.rmSync(root, { recursive: true, force: true });
   }
+  // TPV sub-case B (plan regex `(^|[_/-])(story|…|bug|…)`): "history_12" and "debug_3" hold
+  // `story_12` and `bug_3` only inside words, so they carry no id.
+  {
+    const { root, sprintDir } = mkRoom('SPRINT-BUG101T5B');
+    try {
+      const r = invoke(root, 'codex', codexPayload('history_12_debug_3', 'qa', 'no identifiable reference here'));
+      assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
+      const sentinels = codexSentinels(sprintDir);
+      assert.equal(sentinels.length, 1);
+      const sentinel = JSON.parse(fs.readFileSync(path.join(sprintDir, sentinels[0]!), 'utf8')) as Record<string, unknown>;
+      assert.equal(sentinel.work_item_id, '', 'a prefix inside a word (history_12, debug_3) is not a work-item id');
+      const line = wroteSentinelLine(root, 'SPRINT-BUG101T5B');
+      assert.equal(sourceField(line), 'none', `expected source=none, got: ${JSON.stringify(line)}`);
+    } finally {
+      fs.rmSync(root, { recursive: true, force: true });
+    }
+  }
 });
 
 // ── T6 [ALREADY-GREEN ANCHOR]: the Claude path is unchanged ─────────────────
@@ -284,14 +382,14 @@ test('[ALREADY-GREEN ANCHOR] T6: Claude path — the prompt id is used, a fresh
       cwd: root,
       hook_event_name: 'PreToolUse',
       tool_name: 'Agent',
-      tool_input: { subagent_type: 'qa', prompt: 'STORY=001-01 do the thing' },
+      tool_input: { subagent_type: 'qa', prompt: 'STORY=001-01 do the thing', task_name: 'story_555_55_qa' },
     };
     const r = invoke(root, 'claude', payload);
     assert.equal(r.status, 0, `stdout: ${r.stdout}\nstderr: ${r.stderr}`);
     const sentinels = claudeSentinels(sprintDir);
     assert.equal(sentinels.length, 1, `expected exactly one claude sentinel; got: ${JSON.stringify(sentinels)}`);
     const sentinel = JSON.parse(fs.readFileSync(path.join(sprintDir, sentinels[0]!), 'utf8')) as Record<string, unknown>;
-    assert.equal(sentinel.work_item_id, 'STORY-001-01', 'the Claude path reads the prompt, never a marker');
+    assert.equal(sentinel.work_item_id, 'STORY-001-01', 'the Claude path reads the prompt, never a marker or a task_name');
     assert.ok(fs.existsSync(markerPath), 'the Claude path must never consume a dispatch marker');
     const line = wroteSentinelLine(root, 'SPRINT-BUG101');
     assert.equal(sourceField(line), null, `the Claude printf must carry no source= field at all, got: ${JSON.stringify(line)}`);
```

## Developer brief

**Binding:** M7 §3 BUG-101, errata E1/E3/E4/E15, OD-M7-3, and TPV101-A1..A4 below. Precedence: the plan and these amendments, then the bug file.

**Files (cli worktree, `story/BUG-101`):**
1. `scaffold/hosts/claude/.claude/hooks/pending-task-sentinel.sh`, codex branch only:
   - the new source order goes between the `AGENT_TYPE`/`PROMPT` block (`:321-327`) and the extraction (`:329-332`);
   - the codex printf (`:375-376`) appends ` source=%s`.
   - The Claude printf (`:388-389`) and the Claude jq object (`:385`) stay byte-identical. Test 40 R-H4 compares Claude-shaped runs and written files against the frozen `hooks-pre-058-10` copies (C02 and C04 above).
2. `scripts/build-codex-payload.mjs`: set `CODEX_SKILL_REPLACEMENTS.R4` (`:283`) and `.R5` (`:284`) to the exact strings of Test 31's `R4`/`R5` constants (sealed, verbatim with M7 §3).
3. `npm run gen:codex`. It rewrites `scaffold/hosts/codex/.codex/hooks/pending-task-sentinel.sh` (mode 0755) and `scaffold/core/.agents/skills/sprint-execution/SKILL.md`. Never hand-edit either one. `node scripts/build-codex-payload.mjs --check` must exit 0.
4. `CHANGELOG.md`: one `### Fixed` line.

Do not touch: `token-ledger.sh`, `scripts/clean-room/**`, `test/**` (route any test change to QA-Red), `init-fixture.ts`.

**Pinned behaviours (codex branch):**
1. **`task_name`.**
   - Read `.tool_input.task_name`.
   - Match `grep -oiE '(^|[_/-])(story|epic|cr|bug|proposal|sprint)[-_]?[0-9]+([-_][0-9]+)?'`, take the first match, strip one leading `[_/-]`, upper-case it and map `_` to `-`.
   - Set `source=task_name`.
   - On a hit, consume exactly one fresh marker whose `work_item_id` equals that id **and** whose `agent_type` equals `AGENT_TYPE`: the newest such marker. Leave every other marker in place.
2. **Marker claim.**
   - Candidates: `find "$SPRINT_DIR" -maxdepth 1 -type f -name '.dispatch-*.json' -mmin -10`.
   - Guard the empty list: `ls -t` with no operands lists the cwd.
   - Order candidates newest mtime first. Take the first whose `.agent_type` equals `AGENT_TYPE`; skip past other types, never stop at them.
   - Claim with `mv "$m" "$m.claimed.$$"`, then read `work_item_id`, then `rm -f`. The claim must be `mv`, which the M27 note above requires.
   - Set `source=marker`.
   - Never read or compare `session_id`.
3. **Message.** Use the existing regex over `PROMPT` (`.tool_input.prompt // .tool_input.message`) and set `source=message`.
4. **None.** Write `work_item_id ""` and `source=none`, still write the sentinel, and exit 0.
5. **No other deletions.** Stale (≥10 min), other-type and other-id markers are never deleted or renamed (TPV101-A3).
6. **Bash 3.2 rules.** macOS `/bin/bash` 3.2 under `set -u`:
   - no `mapfile` and no associative arrays;
   - count-guard arrays before `"${a[@]}"`;
   - `while IFS= read -r x || [[ -n "${x}" ]]`;
   - `tr` with explicit letter lists, or `tr '[:lower:]' '[:upper:]' | tr '_' '-'`.

**Run before handing to QA-Verify:**
- `npm run typecheck`;
- `npm run test:file -- test/hooks/codex-dispatch-attribution.red.node.test.ts test/scripts/codex-sprint-execution-render.red.node.test.ts` (9/9);
- the witnesses: `codex-hooks-harness.red` 91, `codex-hook-scripts.red` 18, `pending-task-sentinel-cards.red` 13, `flashcard-gate-parity.red` 14, `codex-payload.red` 14, and `hooks-claude-parity.red.integration` 19 (run solo via `test:file`);
- `--check` exit 0.

QA-Verify (harness lane) adds, per M7 §3:
- test 46 with `CLEARGATE_CODEX_BIN=<pinned>`;
- one scripted codex-loop reproduction.

## Amendments to append to M7.md

```markdown
## Amendments from TPV (BUG-101, 2026-09-27; role: architect; append-only)

- **TPV101-A1 (tests; count unchanged).** §3 BUG-101 "Tests" is amended by the re-seal `reports/BUG-101-tpv-reseal.patch` (sha256 `a185dfc58e6726d3b94b4b7c5f6d3e5fad8c44ea550eeba84759471014c6b09b`), sub-cases only:
  - T1-B: `task_name` outranks a newer same-type marker and a plaintext message; a `task_name` hit consumes exactly its own `{id, agent_type}` marker and leaves other-id and other-type markers.
  - T1-C: `SPRINT_01_REPORTER` → `SPRINT-01` (case-insensitive, sprint prefix).
  - T2: the claimed marker is deleted, not parked as `.json.claimed.N`.
  - T2-B: the newest fresh same-type marker wins over an older one that carries the spawn's own `session_id`; a newer other-type marker is skipped, not a stop; a claimable marker outranks a plaintext message.
  - T5-B: `history_12_debug_3` carries no id (the `(^|[_/-])` boundary).
  - T6: a Claude payload's `task_name` is ignored.
  - Still 6 tests; D4 +6 unchanged. The sealed suite killed 22/37 plausible wrong builds; the re-sealed suite kills 36/37 (the survivor is the non-atomic claim, which no serial test can observe).
- **TPV101-A2 (QA-Red flag resolved: consume on a task_name hit is binding and tested, T1-B).** R5 keeps `write_dispatch.sh` as an optional fallback, which the orchestrator may run beside `task_name`. An unconsumed marker would stay claimable for 10 minutes. A later same-type dispatch whose `task_name` carries no id would then claim it and be mis-attributed (R-2).
- **TPV101-A3 (no unplanned deletions).** The codex branch deletes only:
  - the marker it claims (source 2);
  - the one marker it consumes on a `task_name` hit (source 1).
  Stale (≥10 min), other-type and other-id markers are never deleted or renamed; there is no sweep. Pruning stale markers stays with FU-9.
- **TPV101-A4 (wiring).** The sealed file spawns the canonical hook in place, where `lib/harness.sh` is already a real sibling. That satisfies §3's "copy `lib/harness.sh` beside the hook" without a copy.
```

## Orchestrator actions

1. Run `bash .cleargate/scripts/run_script.sh update_state.mjs BUG-101 --arch-bounce`, which is the TPV REJECTED route.
2. Commit this report, `reports/BUG-101-tpv-reseal.patch` and the M7 amendment on `sprint/S-41` as a chore (`SKIP_SURFACE_GATE=1`, rule 17).
3. Dispatch QA-Red:
   - apply the patch on `<cw>` @ `59da770` with the 3-point gate;
   - re-measure 5 red + 1 green in the file, and Test 31 at 1 red / 2 green;
   - commit `qa-red(BUG-101): TPV re-seal …`.
4. Dispatch the Developer with the brief above.

## Script Incidents

None. `run_script.sh` was not invoked.

## Scratch and git status

- **Scratch.** Scratch `/private/tmp/cg-s41-tpv101-20260927T085502Z` holds the clone, the prototype, the mutant runner and a `find -mmin` probe. It is removed by exact path at the end of this dispatch.
- **Checkouts.**
  - `<cw>` `git status --porcelain` was empty before and after; HEAD is still `59da770`. The only `<cw>` interactions were reads, the scratch clone *from* it, and a read-only `git apply --check`.
  - The outer checkout was written only for this report and the patch file.
  - `/private/tmp/cg-s41-m2-init-baseline` was read only, in compare mode.
- **No commits.** Nothing was committed or stashed in any real checkout.
- **Credentials.** No codex binary was run; `~/.codex`, `CODEX_HOME` and auth files were not touched.

flashcards_flagged:
  - "2026-09-27 · #tpv #test-harness · One-source-per-case reds leave source ORDER unpinned; add a case where every source names a different id."
  - "2026-09-27 · #tpv #test-harness · A 'marker consumed' check filtered on *.json misses one parked as x.json.claimed.N; match the prefix."
  - "2026-09-27 · #bash #hooks · ls -t with an empty operand list lists the cwd; collect find hits in an array and guard the count first."
  - "2026-09-27 · #tpv #markers · Multi-marker fixtures: stamp the filename epoch with the aged time so mtime and name order agree."
