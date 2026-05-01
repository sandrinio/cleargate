// CR-023 SPRINT-17 cleanup: process isolation prevents the worker leaks observed
// in SPRINT-17 (FLASHCARD 2026-05-01 #qa #vitest #npx + 2026-05-01 #vitest #leak
// #posttest + 2026-05-01 #worktree #vitest #cleanup). Forks pool spawns child
// processes per test file, exits cleanly on completion, and does not contend on
// shared tinypool worker state across the close-sprint test suite.
//
// SPRINT-19 worker cap: minForks/maxForks=2 caps the pool at 2 child Node
// processes (default = CPU count, ~9 on Apple Silicon). Each fork carries a
// full V8 + esbuild + fixture heap (~400MB). During parallel sprint waves
// (3 dev/QA agents simultaneously) uncapped pools peak at ~10GB and choke
// laptop-bound orchestrators. The cap drops peak ~75% with ~20% slower
// wall-clock — net win for laptop usage. CI with plentiful RAM may override
// via VITEST_MAX_FORKS or remove this block.
import { defineConfig } from 'vitest/config';

const maxForks = Number(process.env.VITEST_MAX_FORKS ?? 2);

export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        minForks: 1,
        maxForks,
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/_archive/**',
    ],
  },
});
