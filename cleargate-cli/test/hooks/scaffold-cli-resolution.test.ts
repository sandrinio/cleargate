/**
 * scaffold-cli-resolution.test.ts — BUG-006 contract
 *
 * `cleargate init` must produce hook scripts that resolve the cleargate CLI
 * via PATH first, falling back to a meta-repo-local dist only as a dogfood
 * convenience. They must NOT bare-reference `${REPO_ROOT}/cleargate-cli/dist/cli.js`
 * — that path does not exist in any downstream repo bootstrapped via `cleargate init`.
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

describe('cleargate init scaffold — CLI resolution (BUG-006)', () => {
  it('every CLI-invoking hook prefers an on-PATH cleargate before any dist fallback', () => {
    const tmp = makeTmpDir();
    copyPayload(PAYLOAD_DIR, tmp, { force: true });

    for (const hookFile of HOOKS_THAT_INVOKE_CLI) {
      const body = fs.readFileSync(
        path.join(tmp, '.claude/hooks', hookFile),
        'utf8',
      );

      // Resolver must consult PATH.
      expect(body, `${hookFile} missing 'command -v cleargate' resolver`).toMatch(
        /command -v cleargate/,
      );

      // The dist path may appear ONLY inside the elif fallback — never as a
      // bare top-level invocation. We assert that any `cleargate-cli/dist/cli.js`
      // mention is preceded somewhere earlier in the file by `command -v cleargate`.
      const distRefs = [
        ...body.matchAll(/cleargate-cli\/dist\/cli\.js/g),
      ];
      if (distRefs.length > 0) {
        const firstDistIdx = distRefs[0].index ?? 0;
        const resolverIdx = body.indexOf('command -v cleargate');
        expect(
          resolverIdx,
          `${hookFile}: 'command -v cleargate' must appear before any dist reference`,
        ).toBeGreaterThanOrEqual(0);
        expect(
          resolverIdx,
          `${hookFile}: 'command -v cleargate' (idx ${resolverIdx}) must precede first dist ref (idx ${firstDistIdx})`,
        ).toBeLessThan(firstDistIdx);
      }
    }
  });

  it('init payload does not bundle the CLI dist (target repos resolve via PATH or fallback)', () => {
    const tmp = makeTmpDir();
    copyPayload(PAYLOAD_DIR, tmp, { force: true });
    expect(
      fs.existsSync(path.join(tmp, 'cleargate-cli', 'dist', 'cli.js')),
      'init payload must not ship the CLI dist into target repos',
    ).toBe(false);
  });
});
