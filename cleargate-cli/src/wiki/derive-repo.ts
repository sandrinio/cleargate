import type { RepoTag } from './page-schema.js';

/**
 * A1 helper: derive the `repo` tag from a raw file path prefix.
 * Mapping is per §10.4 field notes.
 */
export function deriveRepo(rawPath: string): RepoTag {
  if (rawPath.startsWith('cleargate-cli/')) return 'cli';
  if (rawPath.startsWith('mcp/')) return 'mcp';
  if (rawPath.startsWith('.cleargate/') || rawPath.startsWith('cleargate-planning/')) return 'planning';
  throw new Error(`cannot derive repo for path: ${rawPath}`);
}
