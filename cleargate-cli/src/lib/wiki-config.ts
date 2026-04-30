/**
 * STORY-015-03: Per-repo wiki configuration loader.
 * STORY-018-03: Extended to include `gates` map.
 * CR-002: Extended to include `bucket_pagination_ceiling` for configurable pagination threshold.
 *
 * Reads `.cleargate/config.yml` from the repo root.
 * Single responsibility: surface `wiki.index_token_ceiling`, `wiki.bucket_pagination_ceiling`,
 * and `gates` map. Missing file → defaults. Malformed YAML → throws with file path in message.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import yaml from 'js-yaml';

export interface GatesConfig {
  precommit?: string;
  test?: string;
  typecheck?: string;
  lint?: string;
}

export interface WikiConfig {
  wiki: {
    index_token_ceiling: number;
    /** Maximum entries per bucket before pagination-needed fires. Default: 50. */
    bucket_pagination_ceiling: number;
  };
  gates: GatesConfig;
}

const DEFAULT_INDEX_TOKEN_CEILING = 8000;
const DEFAULT_BUCKET_PAGINATION_CEILING = 50;

/**
 * Load per-repo wiki config from `<repoRoot>/.cleargate/config.yml`.
 * Returns defaults when file is absent.
 * Throws a descriptive error on malformed YAML.
 */
export function loadWikiConfig(repoRoot: string): WikiConfig {
  const configPath = path.join(repoRoot, '.cleargate', 'config.yml');

  if (!fs.existsSync(configPath)) {
    return {
      wiki: {
        index_token_ceiling: DEFAULT_INDEX_TOKEN_CEILING,
        bucket_pagination_ceiling: DEFAULT_BUCKET_PAGINATION_CEILING,
      },
      gates: {},
    };
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
  const paginationCeiling = extractPaginationCeiling(parsed);
  const gates = extractGates(parsed);

  return {
    wiki: {
      index_token_ceiling: ceiling,
      bucket_pagination_ceiling: paginationCeiling,
    },
    gates,
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

function extractPaginationCeiling(parsed: unknown): number {
  if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return DEFAULT_BUCKET_PAGINATION_CEILING;
  }

  const root = parsed as Record<string, unknown>;
  const wiki = root['wiki'];

  if (wiki === null || wiki === undefined || typeof wiki !== 'object' || Array.isArray(wiki)) {
    return DEFAULT_BUCKET_PAGINATION_CEILING;
  }

  const wikiObj = wiki as Record<string, unknown>;
  const ceiling = wikiObj['bucket_pagination_ceiling'];

  if (typeof ceiling === 'number' && Number.isFinite(ceiling) && ceiling > 0) {
    return ceiling;
  }

  return DEFAULT_BUCKET_PAGINATION_CEILING;
}

function extractGates(parsed: unknown): GatesConfig {
  if (parsed === null || parsed === undefined || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  const root = parsed as Record<string, unknown>;
  const gates = root['gates'];

  if (gates === null || gates === undefined || typeof gates !== 'object' || Array.isArray(gates)) {
    return {};
  }

  const gatesObj = gates as Record<string, unknown>;
  const result: GatesConfig = {};

  if (typeof gatesObj['precommit'] === 'string') result.precommit = gatesObj['precommit'];
  if (typeof gatesObj['test'] === 'string') result.test = gatesObj['test'];
  if (typeof gatesObj['typecheck'] === 'string') result.typecheck = gatesObj['typecheck'];
  if (typeof gatesObj['lint'] === 'string') result.lint = gatesObj['lint'];

  return result;
}
