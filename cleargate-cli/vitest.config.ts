// CR-023 SPRINT-17 cleanup: process isolation prevents the worker leaks observed
// in SPRINT-17 (FLASHCARD 2026-05-01 #qa #vitest #npx + 2026-05-01 #vitest #leak
// #posttest + 2026-05-01 #worktree #vitest #cleanup). Forks pool spawns child
// processes per test file, exits cleanly on completion, and does not contend on
// shared tinypool worker state across the close-sprint test suite.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    pool: 'forks',
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/_archive/**',
    ],
  },
});
