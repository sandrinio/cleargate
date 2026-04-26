/**
 * scaffold-cli-resolution.test.ts — BUG-006 + CR-009 contract
 *
 * `cleargate init` must produce hook scripts with a three-branch resolver:
 *   1. meta-repo-local dist (dogfood — fast path for the meta-repo)
 *   2. on-PATH binary (`npm i -g cleargate` / shim)
 *   3. pinned npx invocation (always works wherever Node is present — CR-009)
 *
 * The scripts must NOT silent-exit when no branch resolves (CR-009 replaced
 * the old BUG-006 `exit 0` silent-no-op with the npx tail-branch).
 *
 * Note: CR-009 intentionally places the dist check FIRST (not second as in
 * the pre-CR-009 BUG-006 resolver), because the dist path is the fastest
 * resolution path in the meta-repo dogfood case and is always absent in
 * non-dogfood repos (making it a safe first-check).
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { copyPayload } from '../../src/init/copy-payload.js';

const PAYLOAD_DIR = path.resolve(
  __dirname,
  '../../templates/cleargate-planning',
);

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-'));
  tmpDirs.push(dir);
  return dir;
}

const HOOKS_THAT_INVOKE_CLI = ['stamp-and-gate.sh', 'session-start.sh'];

describe('cleargate init scaffold — CLI resolution (BUG-006 + CR-009)', () => {
  it('CR-009: every CLI-invoking hook has a three-branch resolver (dist → PATH → npx)', () => {
    const tmp = makeTmpDir();
    // copyPayload without pinVersion leaves __CLEARGATE_VERSION__ placeholder intact
    // (that is expected in the template; init substitutes it at runtime)
    copyPayload(PAYLOAD_DIR, tmp, { force: true, pinVersion: '0.5.0' });

    for (const hookFile of HOOKS_THAT_INVOKE_CLI) {
      const body = fs.readFileSync(
        path.join(tmp, '.claude/hooks', hookFile),
        'utf8',
      );

      // Branch 1: dist check
      expect(body, `${hookFile} missing dist check`).toContain(
        'cleargate-cli/dist/cli.js',
      );

      // Branch 2: PATH check
      expect(body, `${hookFile} missing 'command -v cleargate' resolver`).toMatch(
        /command -v cleargate/,
      );

      // Branch 3: npx tail — must not be exit 0 (the old BUG-006 no-op)
      expect(body, `${hookFile} must not have silent exit 0 as fallback`).not.toMatch(
        /^else\s*\n\s*exit 0/m,
      );
      expect(body, `${hookFile} missing npx tail-branch`).toContain('npx -y');

      // Pin comment present (required by R-12 / sed-rewrite contract)
      expect(body, `${hookFile} missing cleargate-pin comment`).toContain(
        '# cleargate-pin:',
      );
    }
  });

  it('CR-009: dist branch appears before PATH branch in resolver chain', () => {
    const tmp = makeTmpDir();
    copyPayload(PAYLOAD_DIR, tmp, { force: true, pinVersion: '0.5.0' });

    for (const hookFile of HOOKS_THAT_INVOKE_CLI) {
      const body = fs.readFileSync(
        path.join(tmp, '.claude/hooks', hookFile),
        'utf8',
      );

      const distIdx = body.indexOf('cleargate-cli/dist/cli.js');
      const pathIdx = body.indexOf('command -v cleargate');

      expect(
        distIdx,
        `${hookFile}: dist branch must appear in file`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        pathIdx,
        `${hookFile}: PATH branch must appear in file`,
      ).toBeGreaterThanOrEqual(0);
      expect(
        distIdx,
        `${hookFile}: dist branch (idx ${distIdx}) must precede PATH branch (idx ${pathIdx})`,
      ).toBeLessThan(pathIdx);
    }
  });

  it('init payload does not bundle the CLI dist (target repos resolve via PATH or npx)', () => {
    const tmp = makeTmpDir();
    copyPayload(PAYLOAD_DIR, tmp, { force: true });
    expect(
      fs.existsSync(path.join(tmp, 'cleargate-cli', 'dist', 'cli.js')),
      'init payload must not ship the CLI dist into target repos',
    ).toBe(false);
  });
});
