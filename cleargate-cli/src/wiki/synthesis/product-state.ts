import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { RawItem } from '../scan.js';
import { renderTemplate } from './render.js';

/**
 * Compile the product-state synthesis page.
 * Loads template from templates/synthesis/product-state.md.
 *
 * Shipped = items in archive/ subdir (rawPath contains '/archive/')
 * Active  = status is Active, In Progress, or 🟢-prefixed
 */
export function compile(state: RawItem[], templateDir?: string): string {
  const tplDir = templateDir ?? resolveDefaultTemplateDir();
  const tpl = fs.readFileSync(path.join(tplDir, 'product-state.md'), 'utf8');

  function countBucket(bucket: string) {
    return state.filter((i) => i.bucket === bucket);
  }

  function isShipped(item: RawItem) {
    return item.rawPath.includes('/archive/');
  }

  function isActive(item: RawItem) {
    const status = String(item.fm['status'] ?? '');
    return (
      status === 'Active' ||
      status === 'In Progress' ||
      status.startsWith('🟢') ||
      status === '🟡 in-flight'
    );
  }

  const buckets = ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs'];

  function countFor(bucket: string, predicate: (i: RawItem) => boolean): number {
    return countBucket(bucket).filter(predicate).length;
  }

  const epics = countBucket('epics');
  const activeEpicsList = epics.filter(isActive);
  const shippedItems = state.filter(isShipped);

  const data: Record<string, unknown> = {
    // Totals
    total_epics: epics.length,
    total_stories: countBucket('stories').length,
    total_sprints: countBucket('sprints').length,
    total_proposals: countBucket('proposals').length,
    total_crs: countBucket('crs').length,
    total_bugs: countBucket('bugs').length,

    // Active counts (per bucket)
    ...Object.fromEntries(buckets.map((b) => [`active_${b}`, countFor(b, isActive)])),

    // Shipped counts (per bucket)
    ...Object.fromEntries(buckets.map((b) => [`shipped_${b}`, countFor(b, isShipped)])),

    // Active epics list
    active_epics_list: activeEpicsList.map((i) => ({
      id: i.id,
      status: String(i.fm['status'] ?? ''),
    })),
    no_active_epics: activeEpicsList.length === 0 ? [{}] : [],

    // Shipped items list
    shipped_items: shippedItems.map((i) => ({
      id: i.id,
      bucket: i.bucket,
      status: String(i.fm['status'] ?? ''),
    })),
    no_shipped: shippedItems.length === 0 ? [{}] : [],
  };

  return renderTemplate(tpl, data);
}

function resolveDefaultTemplateDir(): string {
  // Bundle: dist/cli.js → __dirname = dist/, .. = package root → templates/synthesis ✓
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '..', 'templates', 'synthesis');
}
