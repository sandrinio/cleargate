# Field-upgrade acceptance gate — cleargate 0.30.1 (M1.md §R R4)

Release candidate 1: scratch build of cli `main` at `2da466a` (`release(cleargate): v0.30.1`), `--version` 0.30.1 — 107/107 (results below).
Release candidate 2 (final): `main` at `dbccc79`, after BUG-123-F2 (qualified question forms) — 107/107 again, and the four built-CLI integration reds 20/20.
Source: a pristine copy of the field repo as it was at 0.28.0 (30 dirty entries, not modified).
Rooms: `$G/r0` (pristine), `$G/r1` (seeded: a user PostToolUse hook, a user command inside the `Edit|Write` PreToolUse matcher, `qa.test=make check`, `qa.typecheck=make lint`; full chain), `$G/r2` (seeded, `init` only). Every command ran with stdin at end of input unless the step says otherwise.

Earlier runs on the way: on `main` before U3 merged, 95/107 (the 12 failures were all BUG-123/124 checks, plus one script defect in the gate itself — inline CLEARGATE markers — fixed in the script); on `main` at `4d0e93e`, 107/107.

Known and not judged: `init` after `upgrade` adds one line to `.cleargate/.gitignore` (init bootstrap) and changes the `gate-checks.json` snapshot hash (BUG-091). Both are outside 0.30.1.

```
version=0.30.1 pkg_generated_at=2026-11-13T00:29:59.020Z pkg_settings_sha=82fcd1edc3fb4cb7dcb7548218f1c16b39a46a9e0423e3f3e8eaef9a90c32b06
PASS  R0 upgrade </dev/null exits 0
PASS  R0 prints [upgrade] complete.
PASS  R0 no keep-mine prompt
PASS  R0 [take] unchanged-locally lines (10) = dry-run upstream-changed merge-3way (10)
PASS  R0 snapshot cleargate_version=0.30.1
PASS  R0 snapshot pin_version=0.30.1
PASS  R0 installed_at kept
PASS  R0 generated_at = package
PASS  R0 upgraded_at set
PASS  R0 session-start pin 0.30.1
PASS  R0 field Stop hook kept
PASS  R0 gate line
PASS  R0 dry2 no pin-aware user-modified
PASS  R0 dry2 settings clean
PASS  R1.1 dry-run exits 0
PASS  R1.1 dry-run wrote nothing
PASS  R1.1 settings both-changed
PASS  R1.1 gate line
PASS  R1.1 mcp repin line
PASS  R1.1 block-refresh line
PASS  R1.1 config.example line
PASS  R1.1 no pin-aware user-modified
PASS  R1.2 no-tty exits 2
PASS  R1.2 refusal text
PASS  R1.2 names settings.json
PASS  R1.2 wrote nothing
PASS  R1.2 no [always]/[pin] line
PASS  R1.3 --yes exits 0
PASS  R1.3 complete
PASS  R1.3 093 user PostToolUse hook once
PASS  R1.3 093 user hook in CG matcher once
PASS  R1.3 093 field Stop hook once
PASS  R1.3 093 CG command set = payload
PASS  R1.3 121 qa.test kept
PASS  R1.3 121 qa.typecheck kept
PASS  R1.3 121 arch.typecheck detected
PASS  R1.3 121 gate line
PASS  R1.3 122 snapshot settings sha = package
PASS  R1.3 122 versions
PASS  R1.3 122 installed_at kept
PASS  R1.3 122 generated_at = package
PASS  R1.3 122 upgraded_at set
PASS  R1.3 122 dedupe_frontmatter 755
PASS  R1.3 095 mcp pin
PASS  R1.3 095 block = payload block
PASS  R1.3 095 CLAUDE.md user text unchanged
PASS  R1.3 095 config.example = payload
PASS  R1.3 095 restart warning lists settings.json
PASS  R1.3 095 restart warning lists .mcp.json
PASS  R1.4 dry2 settings clean
PASS  R1.4 dry2 no mcp line
PASS  R1.4 dry2 no block line
PASS  R1.4 dry2 no config.example line
PASS  R1.4 dry2 gate line all kept
PASS  R1.4 only gate-checks non-clean
PASS  R1.5 verify-install exits 0
PASS  R1.6 init exits 0
PASS  R1.6 init skipped gate-checks
PASS  R1.6 init no gate line
PASS  R1.6 no mode change
PASS  R1.6 only install-manifest differs (see r1-init-diff.txt)
PASS  R1.6 installed_at unchanged
PASS  R1.6 snapshot files[] unchanged except gate-checks hash (BUG-091)
PASS  R1.7 dry3 settings clean
PASS  R1.8 wiki build exits 0
PASS  R1.8 124 no archive expand links
PASS  R1.8 125 SPRINT-02 children has EPIC-002
PASS  R1.8 125 SPRINT-02 children has STORY-002-11
PASS  R1.8 125 SPRINT-02 Dates not scheduled
PASS  R1.8 125 EPIC-002 SPRINT-02 (planned)
PASS  R1.8 125 index EPIC-002 row
PASS  R1.8 125 index SPRINT-02 row
PASS  R1.8 125 no sprint page has Sprint:
PASS  R1.8 123 decisions line no .;
PASS  R1.8 123 decisions line no bare Accepted the recommendation
PASS  R1.8 124 Waiting has 'open questions in'
PASS  R1.8 124 Waiting 12 drafts never checked
PASS  R1.8 124 Last closed no '— carried'
PASS  R1.8 123 lint decisions-unrecognised EPIC-002
PASS  R1.9 124 doctor no line names SPRINT-02 file
PASS  R1.9 124 one gate check failing line for STORY-002-01
PASS  R1.9 124 one hook failure line for STORY-002-02
PASS  R1.9 124 exactly one hook failure
PASS  R1.10 oracle compare exits 0
PASS  R1.10 no mismatch
PASS  R1.10 Release label is dir basename
PASS  R1.11 126 contradict exits 0
PASS  R1.11 126 draftWikiPath is raw file
PASS  R1.11 126 prompt names raw file
PASS  R1.11 126 no wiki/stories
PASS  R1.11 126 contradict-commit exits 0
PASS  R1.11 126 stamped
PASS  R1.11 126 raw has last_contradict_sha
PASS  R1.11 126 still no wiki/stories
PASS  R1.11 126 rerun sha-idempotent
PASS  R1.11 124 11 drafts never checked
PASS  R2 init exits 0
PASS  R2 init gate line
PASS  R2 no Skipped (exists) gate-checks
PASS  R2 qa.test kept
PASS  R2 qa.typecheck kept
PASS  R2 installed_at kept
PASS  R2 upgraded_at set
PASS  R2 generated_at = package
PASS  R2 dry settings clean
PASS  R2 user hooks kept
PASS  SRC fingerprint unchanged
rooms: $G
pass=107
fail=0
```
