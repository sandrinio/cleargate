# Test CLAUDE.md Fixture

This file is a fixture for testing the GREEDY regex edge case.
See FLASHCARD 2026-04-19 #init #inject-claude-md #regex.

<!-- CLEARGATE:START -->
## ClearGate Planning Framework

This is the actual ClearGate block content.

**Project overrides.** Content OUTSIDE this `<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->` block takes precedence where it conflicts with ClearGate defaults.

This line MUST be included in the returned body — a non-greedy regex would
stop at the inline <!-- CLEARGATE:END --> marker above instead of the real one.

More content after the prose mention to confirm we got the full block.
<!-- CLEARGATE:END -->

This content is AFTER the block and must not be included.
