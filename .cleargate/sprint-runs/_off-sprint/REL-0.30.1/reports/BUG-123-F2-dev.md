# BUG-123-F2 dev
STATUS: done
Files: src/wiki/extract-sections.ts (QUESTION_RE), scripts/brief-oracle.sh (procsec awk ERE). No other copy of the pattern (grep "AI Question" src scripts).
Pattern: Question(\s+\d+|\s*\([^)*]*\))? | Q\d+,\s*question, same :?\*\*:? tail.
Tests: typecheck clean; check:no-inline-id-regex clean; new red 11/11; all listed decisions/extract-sections/session-brief/brief-*/lint-checks-gate/doctor-session-brief files 0 fail (brief-oracle-edges 83, labels-oracle 11).
