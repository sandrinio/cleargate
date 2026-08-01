---
bug_id: BUG-038
parent_ref: EPIC-043
parent_cleargate_id: EPIC-043
sprint_cleargate_id: null
carry_over: false
status: Completed
severity: P3-Low
reporter: sandrinio
approved: true
area: cli
context_source: verified codebase grounding — grepped a clean install produced by published cleargate 0.19.0 and 0.20.0; cross-checked against the substitution allowlist and MANIFEST.json
created_at: 2026-08-01T00:00:00Z
updated_at: 2026-08-01T00:00:00Z
created_at_version: 0.20.0
updated_at_version: 0.20.0
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-01T19:58:11Z
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id BUG-038
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-08-01T19:58:10Z
  sessions: []
---

# BUG-038: `pre-edit-gate.sh` Ships With an Unsubstituted `__CLEARGATE_VERSION__`

## 1. The Anomaly (Expected vs. Actual)

**Expected Behavior:** every `__CLEARGATE_VERSION__` placeholder in an installed hook is replaced with the real version, by `init` and again by `upgrade`.

**Actual Behavior:** `.claude/hooks/pre-edit-gate.sh` carries the placeholder at line 107 and **neither command ever substitutes it**. It is the literal string `__CLEARGATE_VERSION__` in every install on disk today. If that branch is reached, the hook runs `npx -y cleargate@__CLEARGATE_VERSION__`, which cannot resolve.

Two independent gates both miss it:

- `src/init/copy-payload.ts` — `HOOK_FILES_WITH_PIN` lists only `stamp-and-gate.sh` and `session-start.sh`.
- `cleargate-planning/MANIFEST.json` — `pre-edit-gate.sh` is `overwrite_policy: "always"`, not `"pin-aware"`. The comment above `HOOK_FILES_WITH_PIN` names `overwrite_policy: 'pin-aware'` as *the authoritative marker for WHICH files need substitution*, so `upgrade` skips it too.

The allowlist and the manifest agree with each other and both disagree with the file.

## 2. Reproduction Protocol

1. In any clean directory: `npm i -D cleargate@0.20.0 && npx cleargate init`
2. `grep -rn "__CLEARGATE_VERSION__" .claude/`
3. **Observe:** `.claude/hooks/pre-edit-gate.sh:107:    HOOK_PIN="__CLEARGATE_VERSION__"`
4. `npx cleargate upgrade --yes`, then repeat step 2 — the placeholder is still there.

Contrast with `session-start.sh:5`, which correctly reads `# cleargate-pin: 0.20.0`.

## 3. Evidence & Context

The placeholder sits in the third branch of the CLI resolver, as a fallback within a fallback:

```bash
else
  # Read pinned version from stamp-and-gate.sh
  HOOK_PIN=""
  HOOK_SH="${REPO_ROOT}/.claude/hooks/stamp-and-gate.sh"
  if [ -f "${HOOK_SH}" ]; then
    HOOK_PIN=$(grep -oP '(?<=# cleargate-pin: )[\S]+' "${HOOK_SH}" 2>/dev/null || \
               grep -oE 'cleargate@[^"]+' "${HOOK_SH}" 2>/dev/null | head -1 | sed 's/.*@//' || true)
  fi
  if [ -z "${HOOK_PIN}" ]; then
    HOOK_PIN="__CLEARGATE_VERSION__"        # ← never substituted
  fi
  CG=(npx -y "cleargate@${HOOK_PIN}")
fi
```

**Why this is P3 and not P1.** Reaching the broken line needs three things at once: no `cleargate-cli/dist/cli.js` (branch 1), no `cleargate` on PATH (branch 2), *and* `stamp-and-gate.sh` missing or unparseable. In a normal install `stamp-and-gate.sh` is present and correctly pinned, so `HOOK_PIN` is non-empty and the placeholder is never used. It is a latent trap, not a live failure.

**A second, sharper defect on line 103.** `grep -oP` is PCRE and **BSD/macOS grep does not support it** — it exits with `grep: invalid option -- P`, verified on this machine. So on macOS the primary parse *always* fails and the result depends entirely on the `||` fallback (`grep -oE 'cleargate@[^"]+'`), which happens to work because `stamp-and-gate.sh` also contains `cleargate@<version>` in its npx line. The intended parse has never run on macOS. If the `npx` line were ever removed from `stamp-and-gate.sh`, both parses would fail and the unsubstituted placeholder would go live.

## 4. Execution Sandbox (Suspected Blast Radius)

**Modified:**
- `cleargate-cli/scripts/build-manifest.ts` — `.claude/hooks/pre-edit-gate.sh` added to the pin-aware rules; `MANIFEST.json` regenerated. `upgrade` now substitutes it.
- `cleargate-cli/src/init/copy-payload.ts` — **`HOOK_FILES_WITH_PIN` deleted entirely.** Rather than adding a third entry to a list that had already fallen out of sync once, init now substitutes wherever the placeholder appears: `if (opts.pinVersion && srcContent.includes(PIN_PLACEHOLDER))`. The placeholder is a deliberate sentinel, so any payload file carrying it wants substitution by definition, and no list can drift. `Buffer.includes` is checked before decoding, so binary payload files are never round-tripped through utf8.
- `cleargate-planning/.claude/hooks/pre-edit-gate.sh` — **both** PCRE parses replaced with portable `sed`.

**A second `grep -oP` was found by the regression test, not by reading.** The original filing named line 103. Line 139 had the same defect, parsing `blocked: <reason>` out of doctor output — also PCRE, also never executed on macOS. The test swept every payload hook; those two were the only occurrences.

**Out of scope:** the resolver's three-branch structure, which is correct and shared by every hook.

## 5. Verification Protocol (The Failing Test)

**Command:** `cd cleargate-cli && npm test`

New file `test/docs/pin-placeholder-coverage.node.test.ts`, 4 tests — the stronger guard, as suggested. It reads the **canonical payload** and asserts every file containing `PIN_PLACEHOLDER` is `pin-aware` in `MANIFEST.json`, so it fails when someone adds the placeholder to a new hook rather than after that hook ships broken. Plus: init keeps no allowlist, and no payload hook invokes `grep -oP` (comment lines stripped first, since the fix documents why it was wrong).

Suite: **2328 pass / 0 fail / 1 skipped**, typecheck clean.

The snapshot lock `pre-edit-gate.bug-038.sh` shows the fix in the artifact: line 107 renders as `HOOK_PIN="0.5.0"` where the `cr-008` lock had the literal placeholder.

---

## Prior work

- [[CR-009]] — introduced the three-branch resolver and the `__CLEARGATE_VERSION__` pin mechanism these hooks share.
- [[CR-088]] — *Upgrade Pin And Prune*: taught `upgrade` to substitute the pin, and established `overwrite_policy: 'pin-aware'` as the authoritative marker. Verified working for the two files it covers; this bug is the third file that was never added to either list.
- [[BUG-037]] — filed from the same dogfood run. Same shape: a file whose install-time treatment and upgrade-time classification disagree.
- No prior item audits the pin allowlist against the files that actually carry the placeholder.

## Context Source

**context_source:** verified codebase grounding. Found while inventorying a clean `cleargate init` in a throwaway repo — grepped the installed `.claude/` for unsubstituted placeholders, then traced why by reading `HOOK_FILES_WITH_PIN` and the manifest entry. The `grep -oP` incompatibility was observed directly in this shell earlier in the same session. No PM-tool or remote input.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity — deterministic repro, root cause identified, fix location named**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Fix):
- [x] Reproduction steps are 100% deterministic.
- [x] Actual vs. Expected behavior is explicitly defined.
- [x] Raw error logs/evidence are attached.
- [x] Verification command (failing test) is provided.
- [x] `approved: true` is set in the YAML frontmatter.
