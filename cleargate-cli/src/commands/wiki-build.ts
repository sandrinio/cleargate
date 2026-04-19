import * as fs from 'node:fs';
import * as path from 'node:path';
import { scanRawItems, type RawItem } from '../wiki/scan.js';
import { getGitSha, type GitRunner } from '../wiki/git-sha.js';
import { serializePage, type WikiPage } from '../wiki/page-schema.js';
import { compile as compileActiveSprint } from '../wiki/synthesis/active-sprint.js';
import { compile as compileOpenGates } from '../wiki/synthesis/open-gates.js';
import { compile as compileProductState } from '../wiki/synthesis/product-state.js';
import { compile as compileRoadmap } from '../wiki/synthesis/roadmap.js';

export interface WikiBuildOptions {
  /** Test seam: working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Test seam: frozen ISO timestamp for last_ingest field (defaults to new Date().toISOString()) */
  now?: () => string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
  /** Test seam: forwarded to getGitSha */
  gitRunner?: GitRunner;
}

const BUCKET_ORDER = ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics'] as const;
const BUCKET_LABELS: Record<string, string> = {
  epics: 'Epics',
  stories: 'Stories',
  sprints: 'Sprints',
  proposals: 'Proposals',
  crs: 'CRs',
  bugs: 'Bugs',
  topics: 'Topics',
};

export async function wikiBuildHandler(opts: WikiBuildOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const now = opts.now ?? (() => new Date().toISOString());
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const gitRunner = opts.gitRunner;

  const deliveryRoot = path.join(cwd, '.cleargate', 'delivery');
  const wikiRoot = path.join(cwd, '.cleargate', 'wiki');

  if (!fs.existsSync(deliveryRoot)) {
    stderr(`wiki build: .cleargate/delivery/ not found at ${deliveryRoot}\n`);
    exit(1);
    return;
  }

  // Ensure wiki directory structure exists
  for (const bucket of BUCKET_ORDER) {
    fs.mkdirSync(path.join(wikiRoot, bucket), { recursive: true });
  }

  // Step 2: scan raw items
  const items = scanRawItems(deliveryRoot, cwd);

  // Step 3: write per-item wiki pages
  const timestamp = now();
  let pagesWritten = 0;

  for (const item of items) {
    const sha = getGitSha(item.rawPath, gitRunner) ?? '';

    const parent = buildParentRef(item.fm);
    const children = buildChildrenRefs(item.fm);

    const wikiPage: WikiPage = {
      type: item.type,
      id: item.id,
      parent,
      children,
      status: String(item.fm['status'] ?? ''),
      remote_id: String(item.fm['remote_id'] ?? ''),
      raw_path: item.rawPath,
      last_ingest: timestamp,
      last_ingest_commit: sha,
      repo: item.repo,
    };

    const body = buildPageBody(item, wikiPage);
    const content = serializePage(wikiPage, body);

    const pageDir = path.join(wikiRoot, item.bucket);
    fs.mkdirSync(pageDir, { recursive: true });
    fs.writeFileSync(path.join(pageDir, `${item.id}.md`), content, 'utf8');
    pagesWritten++;
  }

  // Step 4: build index.md
  const indexContent = buildIndex(items);
  fs.writeFileSync(path.join(wikiRoot, 'index.md'), indexContent, 'utf8');

  // Step 5: build log.md
  const logContent = buildLog(items, timestamp);
  fs.writeFileSync(path.join(wikiRoot, 'log.md'), logContent, 'utf8');

  // Step 6: write synthesis pages
  fs.writeFileSync(path.join(wikiRoot, 'active-sprint.md'), compileActiveSprint(items), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'open-gates.md'), compileOpenGates(items), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'product-state.md'), compileProductState(items), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'roadmap.md'), compileRoadmap(items), 'utf8');

  // Step 7: report
  stdout(`wiki build: OK (${pagesWritten} pages written)\n`);
}

function buildParentRef(fm: Record<string, unknown>): string {
  const raw = fm['parent_epic_ref'] ?? fm['parent'] ?? '';
  const s = String(raw);
  if (!s) return '';
  if (s.startsWith('[[') && s.endsWith(']]')) return s;
  return `[[${s}]]`;
}

function buildChildrenRefs(fm: Record<string, unknown>): string[] {
  const raw = fm['children'];
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr.map((c) => {
    const s = String(c);
    if (s.startsWith('[[') && s.endsWith(']]')) return s;
    return `[[${s}]]`;
  });
}

function buildPageBody(item: RawItem, page: WikiPage): string {
  const title = String(item.fm['title'] ?? item.id);
  const summary = String(item.fm['description'] ?? item.body.split('\n')[0] ?? 'No summary available.').slice(0, 200);

  const blastParts: string[] = [];
  if (page.parent) blastParts.push(page.parent);
  for (const child of page.children) blastParts.push(child);

  const blastLine = blastParts.length > 0 ? blastParts.join(', ') : 'None.';

  return [
    `# ${item.id}: ${title}`,
    '',
    summary,
    '',
    '## Blast radius',
    `Affects: ${blastLine}`,
    '',
    '## Open questions',
    'None.',
    '',
  ].join('\n');
}

function buildIndex(items: RawItem[]): string {
  const lines: string[] = [
    '# Wiki Index',
    '',
    '> Auto-generated by `cleargate wiki build`. Do not edit manually.',
    '',
    '| ID | Type | Status | Raw Path |',
    '|---|---|---|---|',
  ];

  if (items.length === 0) {
    lines.push('| _(no items)_ | — | — | — |');
    lines.push('');
  } else {
    // Group by bucket in canonical order
    for (const bucket of BUCKET_ORDER) {
      const bucketItems = items.filter((i) => i.bucket === bucket);
      if (bucket === 'topics') continue; // topics written by query --persist only

      lines.push('', `## ${BUCKET_LABELS[bucket]}`, '');

      if (bucketItems.length === 0) {
        lines.push('_No items._');
      } else {
        for (const item of bucketItems) {
          const status = String(item.fm['status'] ?? '');
          lines.push(`| [[${item.id}]] | ${item.type} | ${status} | ${item.rawPath} |`);
        }
      }
    }
    lines.push('');
  }

  return lines.join('\n');
}

function buildLog(items: RawItem[], timestamp: string): string {
  if (items.length === 0) {
    return '# Wiki Event Log\n\n';
  }

  const entries = items.map((item) =>
    [
      `- timestamp: "${timestamp}"`,
      `  actor: "cleargate wiki build"`,
      `  action: "create"`,
      `  target: "${item.id}"`,
      `  path: "${item.rawPath}"`,
    ].join('\n'),
  );

  return ['# Wiki Event Log', '', ...entries, ''].join('\n');
}
