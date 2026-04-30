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
  /** Test seam: override directory for synthesis templates (default resolved via import.meta.url) */
  templateDir?: string;
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

/** Terminal statuses — items with these statuses go to the Archive section. */
const TERMINAL_STATUSES = new Set(['Completed', 'Done', 'Abandoned', 'Closed', 'Resolved']);

/**
 * Rollup threshold: if an active epic has >= ROLLUP_THRESHOLD active stories,
 * collapse them into a single summary line instead of individual rows.
 */
const ROLLUP_THRESHOLD = 3;

/**
 * Active index bucket order: epics → sprints → proposals → crs → bugs → orphan stories.
 * Topics always skipped (written by query --persist only).
 */
const ACTIVE_BUCKET_ORDER = ['epics', 'sprints', 'proposals', 'crs', 'bugs', 'stories'] as const;

export async function wikiBuildHandler(opts: WikiBuildOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const now = opts.now ?? (() => new Date().toISOString());
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const gitRunner = opts.gitRunner;
  const templateDir = opts.templateDir;

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
  fs.writeFileSync(path.join(wikiRoot, 'active-sprint.md'), compileActiveSprint(items, templateDir), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'open-gates.md'), compileOpenGates(items, templateDir), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'product-state.md'), compileProductState(items, templateDir), 'utf8');
  fs.writeFileSync(path.join(wikiRoot, 'roadmap.md'), compileRoadmap(items, templateDir), 'utf8');

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
  const header = [
    '# Wiki Index',
    '',
    '> Auto-generated by `cleargate wiki build`. Do not edit manually.',
    '',
  ];

  // Empty-delivery case
  if (items.length === 0) {
    return [
      ...header,
      '## Active',
      '',
      '_No active items._',
      '',
      '## Archive',
      '',
      '_No archived items._',
      '',
    ].join('\n');
  }

  // 1. Partition items into active and archived
  const active: RawItem[] = [];
  const archived: RawItem[] = [];
  for (const item of items) {
    const status = String(item.fm['status'] ?? '');
    if (TERMINAL_STATUSES.has(status)) {
      archived.push(item);
    } else {
      active.push(item);
    }
  }

  // 2. Build storiesByEpic: active stories grouped by parent epic id.
  //    Only include stories whose parent epic is itself active.
  const activeEpicIds = new Set(
    active.filter((i) => i.bucket === 'epics').map((i) => i.id),
  );
  const storiesByEpic = new Map<string, RawItem[]>();

  for (const item of active) {
    if (item.bucket !== 'stories') continue;
    const rawRef = String(item.fm['parent_epic_ref'] ?? '');
    // Strip [[ ]] wrappers if present
    const epicId = rawRef.startsWith('[[') && rawRef.endsWith(']]')
      ? rawRef.slice(2, -2)
      : rawRef;
    if (epicId && activeEpicIds.has(epicId)) {
      const list = storiesByEpic.get(epicId) ?? [];
      list.push(item);
      storiesByEpic.set(epicId, list);
    }
  }

  // Orphan active stories: no parent_epic_ref OR parent epic not active
  const orphanStories = active.filter((item) => {
    if (item.bucket !== 'stories') return false;
    const rawRef = String(item.fm['parent_epic_ref'] ?? '');
    const epicId = rawRef.startsWith('[[') && rawRef.endsWith(']]')
      ? rawRef.slice(2, -2)
      : rawRef;
    return !epicId || !activeEpicIds.has(epicId);
  });

  // 3. Emit ## Active section
  const activeLines: string[] = ['## Active', ''];

  for (const bucket of ACTIVE_BUCKET_ORDER) {
    if (bucket === 'stories') {
      // Orphan stories only
      const sorted = orphanStories.slice().sort((a, b) => a.id.localeCompare(b.id));
      for (const item of sorted) {
        const status = String(item.fm['status'] ?? '');
        activeLines.push(`- [[${item.id}]] (${item.type}) — ${status}`);
      }
    } else if (bucket === 'epics') {
      const epicItems = active
        .filter((i) => i.bucket === 'epics')
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));

      for (const epic of epicItems) {
        const status = String(epic.fm['status'] ?? '');
        activeLines.push(`- [[${epic.id}]] (${epic.type}) — ${status}`);

        // 4. Emit story rollup or individual rows under the epic
        const epicStories = (storiesByEpic.get(epic.id) ?? [])
          .slice()
          .sort((a, b) => a.id.localeCompare(b.id));

        if (epicStories.length >= ROLLUP_THRESHOLD) {
          // Build status breakdown: count per status, sort by count desc then status asc
          const counts = new Map<string, number>();
          for (const s of epicStories) {
            const st = String(s.fm['status'] ?? '');
            counts.set(st, (counts.get(st) ?? 0) + 1);
          }
          const breakdown = [...counts.entries()]
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([st, n]) => `${n} ${st}`)
            .join(' · ');
          // Extract epic numeric prefix for rollup label (e.g. EPIC-014 → 014)
          const epicNum = epic.id.replace(/^EPIC-/, '');
          activeLines.push(`  - STORY-${epicNum}-xx (${epicStories.length} stories) — ${breakdown}`);
        } else {
          for (const story of epicStories) {
            const st = String(story.fm['status'] ?? '');
            activeLines.push(`  - [[${story.id}]] (${story.type}) — ${st}`);
          }
        }
      }
    } else {
      const bucketItems = active
        .filter((i) => i.bucket === bucket)
        .slice()
        .sort((a, b) => a.id.localeCompare(b.id));

      for (const item of bucketItems) {
        const status = String(item.fm['status'] ?? '');
        activeLines.push(`- [[${item.id}]] (${item.type}) — ${status}`);
      }
    }
  }

  activeLines.push('');

  // 5. Emit ## Archive section — per-bucket summary only
  const archiveLines: string[] = ['## Archive', ''];
  // Bucket order for archive summary (excluding topics and stories — stories
  // don't get their own archive summary line per plan)
  const ARCHIVE_BUCKET_ORDER = ['epics', 'sprints', 'proposals', 'crs', 'bugs', 'stories'] as const;

  for (const bucket of ARCHIVE_BUCKET_ORDER) {
    const bucketArchived = archived.filter((i) => i.bucket === bucket);
    if (bucketArchived.length === 0) continue;

    // Count per status
    const counts = new Map<string, number>();
    for (const item of bucketArchived) {
      const st = String(item.fm['status'] ?? '');
      counts.set(st, (counts.get(st) ?? 0) + 1);
    }
    // Sort by count desc then status asc, omit zero-count statuses
    const parts = [...counts.entries()]
      .filter(([, n]) => n > 0)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([st, n]) => `${n} ${st}`)
      .join(' · ');

    const label = BUCKET_LABELS[bucket] ?? bucket;
    archiveLines.push(`- ${label}: ${parts} · [expand](archive/${bucket}.md)`);
  }

  archiveLines.push('');

  // 6. Emit ## Contradictions section — links to advisory log
  const contradictionLines: string[] = [
    '## Contradictions',
    '',
    'Advisory log of detected contradictions between wiki pages. Populated by ingest Phase 4.',
    '',
    'See [contradictions.md](contradictions.md) for the append-only finding log.',
    'Human applies `label: true-positive | false-positive | nitpick` per entry.',
    '',
  ];

  return [...header, ...activeLines, ...archiveLines, ...contradictionLines].join('\n');
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
