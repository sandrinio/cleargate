# STORY-066-19 QA-Verify

QA: PASS. Typecheck clean; 9 files, 42 tests pass (0 fail, 0 skip); prebuild 0.
Real go1.27.3 probes (evidence/STORY-066-19/): undefined TopN seals clean (scan_exit 0, scan_exit_raw 1, expected_red names line, no typecheck flag, exit 0); type mismatch, redeclaration, wrong-arity all keep flags:["typecheck"], exit 1; relative --worktree from inside the worktree resolves via main checkout; missing path exits 2 naming both paths.
Surface: bf21e96..85b8276 = seal_red.mjs + 3 test files; 85b8276 touches only seal_red.mjs.
Advisory: go vet reports only the first type error per package, so an undefined TopN ahead of a real error in the same file seals expected-red (p5-mixed); the real error surfaces at the Developer's first compile (Red-Test route). Inherent to vet output, not the classifier.
