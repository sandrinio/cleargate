/**
 * STORY-015-03: Per-repo wiki configuration loader.
 *
 * Reads `.cleargate/config.yml` from the repo root.
 * Single responsibility: surface `wiki.index_token_ceiling`.
 * Missing file → defaults. Malformed YAML → throws with file path in message.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';

export interface WikiConfig {
  wiki: {
    index_token_ceiling: number;
  };
}

const DEFAULT_INDEX_TOKEN_CEILING = 8000;

/**
 * Load per-repo wiki config from `<repoRoot>/.cleargate/config.yml`.
 * Returns defaults when file is absent.
 * Throws a descriptive error on malformed YAML.
 */
export function loadWikiConfig(repoRoot: string): WikiConfig {
  const configPath = path.join(repoRoot, '.cleargate', 'config.yml');

  if (!fs.existsSync(configPath)) {
    return { wiki: { index_token_ceiling: DEFAULT_INDEX_TOKEN_CEILING } };
  }

  let raw: string;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    throw new Error(`Failed to read ${configPath}: ${String(err)}`);
  }

  let parsed: unknown;
  try {
    parsed = yaml.load(raw, { schema: yaml.CORE_SCHEMA });
  } catch (err) {
    throw new Error(`Malformed YAML in ${configPath}: ${String(err)}`);
  }

  const ceiling = extractCeiling(parsed);

  return {
    wiki: {
      index_token_ceiling: ceiling,
    },
  };
}

function extractCeiling(parsed: unknown): number {
  if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return DEFAULT_INDEX_TOKEN_CEILING;
  }

  const root = parsed as Record<string, unknown>;
  const wiki = root['wiki'];

  if (wiki === null || wiki === undefined || typeof wiki !== 'object' || Array.isArray(wiki)) {
    return DEFAULT_INDEX_TOKEN_CEILING;
  }

  const wikiObj = wiki as Record<string, unknown>;
  const ceiling = wikiObj['index_token_ceiling'];

  if (typeof ceiling === 'number' && Number.isFinite(ceiling) && ceiling > 0) {
    return ceiling;
  }

  return DEFAULT_INDEX_TOKEN_CEILING;
}
