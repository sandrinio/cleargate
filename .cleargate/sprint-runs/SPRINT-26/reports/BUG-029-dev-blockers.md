## Test-Pattern
Scenario 2 Test 1 (`two sentinel writes at the same TURN_INDEX produce two distinct files`) writes both sentinel A and sentinel B to the IDENTICAL path (`path.join(env.sprintDir, '.pending-task-0.json')`) then asserts `sentinelFiles.length === 2` — which can never be true after writing to the same path twice from an empty directory regardless of any hook implementation change.

## Spec-Gap
The test purports to verify that two parallel writes at the same TURN_INDEX produce distinct files, but it simulates this by writing directly to `oldNameA = oldNameB = '.pending-task-0.json'` (not by invoking the hook), making the assertion structurally untestable: the only way to produce 2 distinct files would require either (a) the test using a uniquified naming scheme itself, or (b) a pre-existing sentinel file with a different name already in `env.sprintDir` — neither of which is possible given the test's `before()` creates a fresh empty tmpDir.

## Environment
N/A — the issue is in the Red test specification, not in environment configuration or missing dependencies.
