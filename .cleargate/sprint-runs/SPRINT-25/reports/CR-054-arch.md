---
report_type: arch
cr_id: CR-054
sprint_id: SPRINT-25
authored_by: architect
authored_at: 2026-05-05T00:00:00Z
mode: post-flight
verdict: PASS
---

# CR-054 Architect Post-Flight Report

role: architect

## Verdict

ARCHITECT: PASS

## M1 File-Surface Adherence

The M1 plan (line 43) declared the four-file surface for CR-054:

1. `.cleargate/scripts/run_script.sh` (live, L113-124 `_truncate_stream`)
2. `cleargate-planning/.cleargate/scripts/run_script.sh` (canonical mirror)
3. `cleargate-cli/src/lib/script-incident.ts` (L14-23 JSDoc)
4. `cleargate-cli/test/scripts/run-script-utf8-truncation.red.node.test.ts` (NEW)

`git show --stat 11ed7ff` confirms exactly these files plus the staged `cleargate-planning/MANIFEST.json` regen. Zero scope drift; zero unintended surfaces.

## Mirror Parity Invariant

`diff .cleargate/scripts/run_script.sh cleargate-planning/.cleargate/scripts/run_script.sh` returns empty (verified live in worktree at HEAD `11ed7ff`). FLASHCARD 2026-04-19 #wiki #protocol #mirror compliance: clean.

MIRROR_PARITY: clean

## MANIFEST Regen

`cleargate-planning/MANIFEST.json` is in the file list of commit `11ed7ff` (4 files modified, including MANIFEST). Dev report confirms `npm run prebuild` regenerated 65-file SHA set. FLASHCARD 2026-05-01 #manifest #prebuild compliance: clean.

MANIFEST_REGEN: staged

## Architectural Soundness

### `head -c` vs alternatives

`head -c N` is the right primitive. Reviewed against §0.5 Q1 alternatives:

- **`dd bs=1 count=N`** — works but is 10-100x slower for 4KB on macOS bash 3.2 (each byte = one syscall in `bs=1` mode). Rejected.
- **Node helper (`_truncate_stream.mjs`)** — would add a fork-exec per `run_script.sh` invocation just to achieve byte truncation; doubles wrapper hot-path cost for a cosmetic clean-boundary improvement. Rejected per Q2 default.
- **`printf | iconv`** — inappropriate; iconv is for re-encoding, not truncation; would need a pipe-and-counter shim that's larger than the original bug.

`head -c N` is POSIX, available everywhere bash runs (no GNU coreutils dependency triggered — macOS BSD `head` also accepts `-c`), and operates on raw bytes by definition. Correct choice.

### Suffix-append condition

The Dev correctly gated `TRUNCATION_SUFFIX` emission on `wc -c < "$file"` rather than blindly appending. Implementation at `run_script.sh:120-127`:

```bash
file_bytes="$(wc -c < "$file")"
if [[ $file_bytes -le $MAX_BYTES ]]; then
  head -c "$MAX_BYTES" "$file"
else
  printf '%s' "$(head -c "$MAX_BYTES" "$file")${TRUNCATION_SUFFIX}"
fi
```

This matches the Red test scenario 2 (ASCII parity) — short ASCII payloads pass through without spurious `... [truncated]` injection. The `wc -c < "$file"` form (input redirection, no filename echo) is correct for byte counts on both BSD and GNU. Architecturally sound.

### JSDoc clarity

`script-incident.ts:14-31` (post-patch) communicates the byte-count + partial-char trade-off with concrete arithmetic ("4096 cyrillic chars × 2 bytes/char = 8192 bytes") and the round-trip-safe rationale ("Node.js escapes incomplete sequences, producing valid JSON that round-trips through JSON.parse without error"). Total-field byte calculation explicit at L29-30. JSDoc on `TRUNCATION_SUFFIX` (L34-37) flags ASCII-only — relevant invariant for the L29 arithmetic. Documentation is load-bearing and accurate.

## Acceptance Coverage Cross-Check

QA reported 6/6; spot-checked 3:

- **AC-1** (head -c primitive): verified in source at L123, L126.
- **AC-3** (Red test exists, uses wrapScript, asserts byteLength): verified file present, imports `wrapScript` from `../helpers/wrap-script.js`, asserts `Buffer.byteLength(incident.stderr, 'utf8')`. FLASHCARD 2026-05-04 #wrapper #e2e-test-pattern compliance: clean.
- **AC-5** (mirror parity): re-verified above.

QA-Red immutability: `git diff 0a395dc 11ed7ff --stat` shows the test file is NOT in the dev-commit diff. Test file was written at QA-Red and unchanged through Dev. Red→Green contract honored.

## Architectural Risks

None surfaced. The change is a 1-function refactor with byte-count semantics replacing char-count semantics; no API surface impact, no caller migration required.

## flashcards_flagged

None. The architectural decisions for this CR were already pre-recorded:

- 2026-05-04 #wrapper #char-vs-byte (the bug)
- 2026-05-04 #wrapper #e2e-test-pattern (the test pattern)
- 2026-04-19 #wiki #protocol #mirror (mirror parity)
- 2026-05-01 #manifest #prebuild (MANIFEST regen)

All four were honored in Dev's implementation. No new flashcard worth recording — `head -c N` is canonical POSIX and the Q1 default selection logic was already documented in the CR-054 Brief.

## Summary Block

```
ARCHITECT: PASS
M1_ADHERENCE: All 4 declared surfaces touched + MANIFEST regen staged in same commit; zero scope drift.
MIRROR_PARITY: clean
MANIFEST_REGEN: staged
flashcards_flagged: []
```
