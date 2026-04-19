/**
 * Centralized tmpdir fixture builder.
 * Future story tests (07, 08) import from here.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface FixtureItem {
  /** Where to place the file: 'pending-sync' | 'archive' */
  subdir: 'pending-sync' | 'archive';
  /** Filename, e.g. 'EPIC-001_My_Epic.md' */
  filename: string;
  /** Full content of the file (should include frontmatter) */
  content: string;
}

export interface Fixture {
  /** Root of the tmpdir (acts as repo root) */
  root: string;
  /** .cleargate/delivery/ */
  deliveryRoot: string;
  /** .cleargate/wiki/ */
  wikiRoot: string;
  cleanup: () => void;
}

/**
 * Build a tmpdir fixture with the given raw items.
 * Returns paths and a cleanup function.
 */
export function buildFixture(items: FixtureItem[]): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-wiki-test-'));
  const deliveryRoot = path.join(root, '.cleargate', 'delivery');
  const wikiRoot = path.join(root, '.cleargate', 'wiki');

  fs.mkdirSync(path.join(deliveryRoot, 'pending-sync'), { recursive: true });
  fs.mkdirSync(path.join(deliveryRoot, 'archive'), { recursive: true });
  fs.mkdirSync(wikiRoot, { recursive: true });

  for (const item of items) {
    const dir = path.join(deliveryRoot, item.subdir);
    fs.writeFileSync(path.join(dir, item.filename), item.content, 'utf8');
  }

  return {
    root,
    deliveryRoot,
    wikiRoot,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/** A minimal valid frontmatter content for an Epic */
export function epicContent(id: string, status = '🟢'): string {
  return `---
story_id: "${id}"
parent_epic_ref: ""
status: "${status}"
remote_id: ""
---

# ${id}: Test Epic

A test epic for unit testing.
`;
}

/** A minimal valid frontmatter content for a Story */
export function storyContent(id: string, epicRef: string, status = '🟢'): string {
  return `---
story_id: "${id}"
parent_epic_ref: "${epicRef}"
status: "${status}"
remote_id: ""
---

# ${id}: Test Story

A test story for unit testing.
`;
}

/** A minimal valid frontmatter content for a Sprint */
export function sprintContent(id: string, status = 'Active'): string {
  return `---
story_id: "${id}"
parent_epic_ref: ""
status: "${status}"
remote_id: ""
---

# ${id}: Test Sprint

A test sprint for unit testing.
`;
}

/** A minimal valid frontmatter content for a Proposal */
export function proposalContent(id: string, status = 'Draft'): string {
  return `---
story_id: "${id}"
parent_epic_ref: ""
status: "${status}"
remote_id: ""
approved: false
---

# ${id}: Test Proposal

A test proposal for unit testing.
`;
}
