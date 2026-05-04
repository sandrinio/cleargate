# Script Incident Corpus Analysis
## CR-057: run_script.sh Self-Repair — DOCS-MODE Findings

**Produced:** 2026-05-04  
**Sprint:** SPRINT-25  
**Author:** Developer (CR-057)

---

## Summary

CR-046 §0.5 Q3 deferred `run_script.sh` self-repair to a future CR pending real incident-corpus data. CR-057 closes that question by examining the SPRINT-23 + SPRINT-24 incident corpus and applying the threshold criterion from CR-057 §0.5 Q1: **"≥2 occurrences per (command, exit_code, stderr_signature) pattern"** required for CODE-MODE.

**Verdict: DOCS-MODE — no recurring pattern meets the CODE-MODE threshold.**

---

## Corpus Tally

Total incidents: **3** (SPRINT-23: 0 incidents — directory does not exist; SPRINT-24: 3 incidents).

### Per-Incident Classification Table

| Incident ID | Command | exit_code | stderr_signature | Classification | Recurrence |
|---|---|---|---|---|---|
| `20260504T152431Z-c302f99467bf` | `node .cleargate/scripts/validate_state.mjs SPRINT-24` | `1` | `"Multiple state.json files found; specify --state-file:"` | **usage-error** | 1 |
| `20260504T152438Z-d601cc99091d` | `totally_nonexistent_9999.mjs` | `127` | `"totally_nonexistent_9999.mjs: command not found"` | **synthetic-test** | 1 |
| `20260504T152459Z-d72e814a1ea4` | `validate_state.mjs SPRINT-24` | `127` | `"validate_state.mjs: command not found"` (via `/tmp/run_script_noshim.sh`) | **synthetic-test** | 1 |

### Pattern Frequency Table

| (command, exit_code, stderr_signature) triple | Real occurrences | Synthetic occurrences | Total | CODE-MODE eligible? |
|---|---|---|---|---|
| `(*validate_state.mjs*, 1, "Multiple state.json files found*")` | 1 | 0 | 1 | No (< 2 real) |
| `(*, 127, "*command not found")` | 0 | 2 | 2 | No (all synthetic) |

---

## Classification Rationale

**Incident 1 — usage-error:**  
`validate_state.mjs SPRINT-24` returned exit code 1 with stderr `"Multiple state.json files found; specify --state-file:"`. This is not a flaky or transient failure — it is deterministic behavior when the script is invoked without a `--state-file` path in a repo containing multiple `state.json` files. The script behaves correctly; the caller omitted a required argument. A retry would produce the same error. Self-repair cannot address this pattern: the fix is to invoke the script with `--state-file <path>`.

**Incident 2 — synthetic-test:**  
`totally_nonexistent_9999.mjs` was invoked as a deliberate test fixture to verify that `run_script.sh` captures exit-127 correctly (part of CR-046 / CR-052 Red test coverage). The command name `totally_nonexistent_9999.mjs` is an unambiguous test artifact. Not a real failure.

**Incident 3 — synthetic-test:**  
`validate_state.mjs SPRINT-24` was invoked via `/tmp/run_script_noshim.sh` — a tmp copy of the wrapper constructed without the PATH-shim that makes `.cleargate/scripts/` commands resolvable. This is the "noshim" fixture from the wrapper-interface integration test (CR-052 `#wrapper #e2e-test-pattern`). The `command not found` error is the expected outcome of the test. Not a real failure.

---

## Decision: No Self-Repair Shipped

The corpus fails the CODE-MODE threshold on all three axes:

1. **No pattern recurs ≥2× in real failures.** The one real failure (incident 1) appears exactly once.
2. **The exit-127 pair is entirely synthetic.** Including synthetic test artifacts in the recurrence count would force a CODE-MODE branch built on noise, producing a retry pattern that fires against deliberate test fixtures and never against real-world failures.
3. **The sole real failure is a usage error.** `validate_state.mjs` rejecting an ambiguous invocation is correct, deterministic behavior. Retrying the same invocation would loop identically. Self-repair cannot fix a missing required argument.

Per CR-057 §1: "If investigation shows no recurring patterns: NO code change; document corpus analysis in knowledge doc; scope-cut to docs-only."

**No changes to `run_script.sh`. No changes to `script-incident.ts`. No new sibling script.**

---

## CR-046 §0.5 Q3 — Closure

CR-046 §0.5 Q3 (SPRINT-23) deferred self-repair with the rationale: "self-repair without observed failure data is speculative scope." CR-057 (SPRINT-25) formally closes Q3:

> **CR-057 verdict (2026-05-04):** Corpus contains 3 incidents (SPRINT-23: 0; SPRINT-24: 3). No real-failure pattern recurred ≥2×. DOCS-MODE shipped. Self-repair deferred indefinitely per revisit-trigger below.

This note supersedes the open-question status of CR-046 §0.5 Q3. The authoritative record lives in this knowledge document; no edit to the archived CR-046 file is required (archive-immutability preserved — per M2 plan §Open hook 2 recommendation, protocol-level documentation was chosen over archive-file edits).

---

## Revisit Trigger

Self-repair should be revisited when **either** of the following conditions is met:

- **Corpus size threshold:** Total real-failure incidents across all sprint runs exceeds **20**, OR
- **Pattern recurrence threshold:** Any single `(command, exit_code, stderr_signature)` triple appears in **≥2 real-failure** incidents across **≥2 sprints**.

Until then, `run_script.sh` continues to capture, report, and propagate exit codes without self-repair — consistent with the CR-046 v1 design intent.

---

## Files Changed by CR-057

- **NEW:** `.cleargate/knowledge/script-incident-corpus-analysis.md` (this file)
- **No code changes.** `run_script.sh`, `script-incident.ts`, and canonical mirrors are unchanged.

---

*CR-057 investigation complete. CR-046 §0.5 Q3 formally closed.*
