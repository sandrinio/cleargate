/**
 * wrap-script.ts — Shared test helper for end-to-end wrapper invocation tests.
 *
 * CR-052: Promotes the inline tmpdir-spawnSync pattern from
 * run-script-wrapper-backcompat.node.test.ts into a reusable helper.
 *
 * Usage:
 *   import { wrapScript } from '../helpers/wrap-script.js';
 *
 *   const result = await wrapScript({
 *     wrapper: LIVE_WRAPPER,
 *     args: ['true'],
 *     env: { AGENT_TYPE: 'developer', WORK_ITEM_ID: 'CR-052' },
 *   });
 *
 *   // result.exitCode, result.stdout, result.stderr, result.incidentJson
 *
 * See CR-052 §4 for full acceptance criteria.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

import { isScriptIncident } from '../../src/lib/script-incident.js';
import type { ScriptIncident } from '../../src/lib/script-incident.js';

export type { ScriptIncident };

export interface WrapScriptOptions {
  /** Absolute path to the run_script.sh wrapper (typically the live one). */
  wrapper: string;

  /** Args passed AFTER the wrapper script (forwarded to the wrapped command). */
  args: string[];

  /**
   * Optional fixture files to write into the tmpdir before exec.
   * Map of relative path → file content.
   * Example: { '.cleargate/sprint-runs/.active': 'SPRINT-TEST\n' }
   */
  fixtures?: Record<string, string>;

  /**
   * Optional additional env vars merged onto process.env.
   * NODE_TEST_CONTEXT is always scrubbed per FLASHCARD #node-test #child-process.
   */
  env?: Record<string, string>;

  /**
   * Optional test-side callback invoked with the tmpdir path BEFORE cleanup.
   * Use to capture the tmpdir path for post-call existence assertions.
   */
  _tmpdirCallback?: (tmpdirPath: string) => void;
}

export interface WrapScriptResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  /** Parsed ScriptIncident if an incident JSON file was written; undefined on success. */
  incidentJson?: ScriptIncident;
}

/**
 * Execute run_script.sh in an isolated tmpdir and return structured results.
 *
 * Lifecycle:
 *   1. Create fresh tmpdir via fs.mkdtempSync.
 *   2. Copy wrapper into tmpdir/.cleargate/scripts/run_script.sh so SCRIPT_DIR
 *      resolution works for the back-compat shim (CR-046).
 *   3. Write any fixture files into tmpdir.
 *   4. Spawn `bash <copied-wrapper> [args]` via spawnSync (synchronous).
 *   5. Post-exec, scan <tmpdir>/.cleargate/sprint-runs/<active>/.script-incidents/
 *      (or _off-sprint/.script-incidents/) for JSON files; parse the first match.
 *   6. Call _tmpdirCallback(tmpdir) if provided, BEFORE cleanup.
 *   7. Cleanup tmpdir in finally block (even on error).
 */
export async function wrapScript(opts: WrapScriptOptions): Promise<WrapScriptResult> {
  const { wrapper, args, fixtures, env: extraEnv, _tmpdirCallback } = opts;

  // 1. Create fresh tmpdir — use fs.realpathSync to resolve macOS /var/folders symlink
  //    so SCRIPT_DIR in run_script.sh (which uses `cd "$(dirname ...)" && pwd`) matches.
  const rawTmpdir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-wrap-script-'));
  const tmpdir = fs.realpathSync(rawTmpdir);

  try {
    // 2. Copy wrapper into tmpdir/.cleargate/scripts/run_script.sh
    //    so SCRIPT_DIR in the wrapper resolves to this tmpdir's scripts dir.
    const scriptsDir = path.join(tmpdir, '.cleargate', 'scripts');
    fs.mkdirSync(scriptsDir, { recursive: true });
    const tmpWrapper = path.join(scriptsDir, 'run_script.sh');
    fs.copyFileSync(wrapper, tmpWrapper);
    fs.chmodSync(tmpWrapper, 0o755);

    // 3. Write fixture files into tmpdir
    if (fixtures) {
      for (const [relPath, content] of Object.entries(fixtures)) {
        const absPath = path.join(tmpdir, relPath);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, content, 'utf8');
      }
    }

    // 4. Build env: process.env + extraEnv, with NODE_TEST_CONTEXT scrubbed
    //    and ORCHESTRATOR_PROJECT_DIR pointing at tmpdir.
    //    FLASHCARD 2026-05-04 #node-test #child-process: delete NODE_TEST_CONTEXT
    //    to avoid nested tsx --test invocations silently skipping.
    const mergedEnv: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ORCHESTRATOR_PROJECT_DIR: tmpdir,
      ...(extraEnv ?? {}),
    };
    delete mergedEnv['NODE_TEST_CONTEXT'];

    // 5. Spawn: bash <copied-wrapper> [args] synchronously
    const spawnResult = spawnSync('bash', [tmpWrapper, ...args], {
      encoding: 'utf8',
      timeout: 30_000,
      env: mergedEnv,
    });

    const exitCode = spawnResult.status ?? -1;
    const stdout = spawnResult.stdout ?? '';
    const stderr = spawnResult.stderr ?? '';

    // 6. Post-exec: scan for incident JSON files.
    //    On success the wrapper writes nothing; on failure it writes to:
    //      <ORCHESTRATOR_PROJECT_DIR>/.cleargate/sprint-runs/<active>/.script-incidents/
    //    or _off-sprint if no .active sentinel.
    let incidentJson: ScriptIncident | undefined;
    const sprintRunsDir = path.join(tmpdir, '.cleargate', 'sprint-runs');

    if (fs.existsSync(sprintRunsDir)) {
      // Walk one level deep in sprint-runs for any .script-incidents subdir
      let entries: string[] = [];
      try {
        entries = fs.readdirSync(sprintRunsDir);
      } catch {
        // If directory can't be read, skip
      }

      for (const entry of entries) {
        if (incidentJson) break; // found one, stop searching
        const incidentsDir = path.join(sprintRunsDir, entry, '.script-incidents');
        if (!fs.existsSync(incidentsDir)) continue;

        let jsonFiles: string[] = [];
        try {
          jsonFiles = fs.readdirSync(incidentsDir).filter((f) => f.endsWith('.json'));
        } catch {
          continue;
        }

        for (const jsonFile of jsonFiles) {
          try {
            const raw = fs.readFileSync(path.join(incidentsDir, jsonFile), 'utf8');
            const parsed: unknown = JSON.parse(raw);
            if (isScriptIncident(parsed)) {
              incidentJson = parsed;
              break;
            }
          } catch {
            // Ignore malformed JSON files
          }
        }
      }
    }

    // 7. Call _tmpdirCallback BEFORE cleanup so callers can inspect the path
    if (_tmpdirCallback) {
      _tmpdirCallback(tmpdir);
    }

    return { exitCode, stdout, stderr, incidentJson };
  } finally {
    // Cleanup: remove tmpdir even if an error occurred (finally is always executed)
    fs.rmSync(tmpdir, { recursive: true, force: true });
  }
}
