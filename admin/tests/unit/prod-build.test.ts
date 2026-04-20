/**
 * Prod-build test — STORY-006-01 QA kickback fix
 * Asserts `npm run build` exits 0 and adapter-node artifact is present.
 *
 * Runs via vitest (tests/unit/**) — Option A per QA kickback spec.
 * Timeout: 90 s (build can take 60-70 s on first run).
 */
import { spawnSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { describe, it, expect } from 'vitest';

const ADMIN_DIR = resolve(import.meta.dirname, '../..');
const BUILD_DIR = join(ADMIN_DIR, 'build');

describe('Production build', () => {
  it(
    'exits 0 and produces adapter-node server entry',
    () => {
      // Run the build from the admin package directory
      const result = spawnSync('npm', ['run', 'build'], {
        cwd: ADMIN_DIR,
        encoding: 'utf-8',
        timeout: 90_000,
        env: {
          ...process.env,
          // Suppress CSRF origin requirement during build
          CLEARGATE_ADMIN_ORIGIN: 'http://localhost:3000',
        },
      });

      // Assert exit code 0
      if (result.status !== 0) {
        // Surface build stderr for diagnosis
        throw new Error(
          `Build failed with exit code ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
        );
      }
      expect(result.status).toBe(0);

      // Assert adapter-node entry file exists
      // @sveltejs/adapter-node outputs build/index.js as the server entry
      const serverEntry = join(BUILD_DIR, 'index.js');
      expect(
        existsSync(serverEntry),
        `adapter-node server entry not found at ${serverEntry}. build/ contents: ${existsSync(BUILD_DIR) ? readdirSync(BUILD_DIR).join(', ') : '(dir missing)'}`,
      ).toBe(true);
    },
    90_000, // vitest per-test timeout
  );
});
