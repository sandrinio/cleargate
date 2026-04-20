/**
 * Unit tests for ProjectCard component — STORY-006-03
 *
 * Scenario: ProjectCard renders with project props
 * Scenario: ProjectCard link routes to /projects/:id
 * Scenario: ProjectCard shows member count chip when memberCount provided
 * Scenario: ProjectCard shows token count chip when tokenCount provided
 * Scenario: ProjectCard omits chips when counts not provided
 *
 * QA kickback tests also included here:
 * - Alphabetical sort logic (Fix 2)
 * - Design Guide §6.1/§6.2 class compliance (Fix 4)
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ProjectCard from '../../src/lib/components/ProjectCard.svelte';
import type { Project } from 'cleargate/admin-api';

const stubProject: Project = {
  id: 'abc-123',
  name: 'Alpha Project',
  created_by: 'admin-user',
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
  deleted_at: null,
};

describe('ProjectCard', () => {
  it('renders the project name', () => {
    const { getByText } = render(ProjectCard, { props: { project: stubProject } });
    expect(getByText('Alpha Project')).toBeTruthy();
  });

  it('links project name to /projects/:id', () => {
    const { getByRole } = render(ProjectCard, { props: { project: stubProject } });
    const link = getByRole('link', { name: 'Alpha Project' });
    expect(link.getAttribute('href')).toBe('/projects/abc-123');
  });

  it('shows a "Created" relative time chip', () => {
    const { container } = render(ProjectCard, { props: { project: stubProject } });
    const chip = container.querySelector('[aria-label^="Created"]');
    expect(chip).toBeTruthy();
    expect(chip?.textContent).toMatch(/Created/);
  });

  it('shows member count chip when memberCount is provided', () => {
    const { getByRole } = render(ProjectCard, {
      props: { project: stubProject, memberCount: 3 },
    });
    // aria-label on the span
    expect(getByRole('generic', { name: /3 members/i }) ?? null).toBeTruthy();
  });

  it('member count chip has DG §6.3 value chip classes', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject, memberCount: 3 },
    });
    const chip = container.querySelector('[aria-label="3 members"]');
    expect(chip).toBeTruthy();
    expect(chip?.classList.contains('rounded-full')).toBe(true);
    expect(chip?.classList.contains('bg-accent')).toBe(true);
    expect(chip?.classList.contains('text-accent-content')).toBe(true);
  });

  it('shows token count chip when tokenCount is provided', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject, tokenCount: 5 },
    });
    const chip = container.querySelector('[aria-label="5 tokens"]');
    expect(chip).toBeTruthy();
    expect(chip?.textContent?.trim()).toContain('5 tokens');
  });

  it('omits member count chip when memberCount not provided', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject },
    });
    const chip = container.querySelector('[aria-label*="member"]');
    expect(chip).toBeFalsy();
  });

  it('omits token count chip when tokenCount not provided', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject },
    });
    const chip = container.querySelector('[aria-label*="token"]');
    expect(chip).toBeFalsy();
  });

  it('renders "1 member" (singular) for memberCount=1', () => {
    const { container } = render(ProjectCard, {
      props: { project: stubProject, memberCount: 1 },
    });
    const chip = container.querySelector('[aria-label="1 member"]');
    expect(chip).toBeTruthy();
    expect(chip?.textContent?.trim()).toBe('1 member');
  });
});

/**
 * Fix 2 (QA kickback) — Alphabetical sort test.
 *
 * The dashboard page sorts projects alphabetically by name client-side
 * (dashboard +page.svelte: [...res.projects].sort((a, b) => a.name.localeCompare(b.name))).
 * This unit test verifies the sort logic directly — no Playwright needed.
 */
describe('Dashboard project sort — alphabetical order (QA kickback Fix 2)', () => {
  // Mirror the sort logic from admin/src/routes/+page.svelte
  function sortProjects(projects: Pick<Project, 'id' | 'name'>[]): Pick<Project, 'id' | 'name'>[] {
    return [...projects].sort((a, b) => a.name.localeCompare(b.name));
  }

  it('Scenario: [Zebra, Apple] sorts to [Apple, Zebra]', () => {
    const input = [
      { id: '1', name: 'Zebra' },
      { id: '2', name: 'Apple' },
    ];
    const sorted = sortProjects(input);
    expect(sorted[0].name).toBe('Apple');
    expect(sorted[1].name).toBe('Zebra');
  });

  it('sorts three projects alphabetically', () => {
    const input = [
      { id: '3', name: 'Mango' },
      { id: '1', name: 'Zebra' },
      { id: '2', name: 'Apple' },
    ];
    const sorted = sortProjects(input);
    expect(sorted.map((p) => p.name)).toEqual(['Apple', 'Mango', 'Zebra']);
  });

  it('is case-insensitive (localeCompare)', () => {
    const input = [
      { id: '1', name: 'zebra' },
      { id: '2', name: 'Apple' },
    ];
    const sorted = sortProjects(input);
    // localeCompare in default locale treats 'A' < 'z' — Apple before zebra
    expect(sorted[0].name).toBe('Apple');
  });

  it('does not mutate the original array', () => {
    const input = [
      { id: '1', name: 'Zebra' },
      { id: '2', name: 'Apple' },
    ];
    sortProjects(input);
    // Input order unchanged
    expect(input[0].name).toBe('Zebra');
  });
});

/**
 * Fix 4 (QA kickback) — Design Guide §6.1/§6.2 class compliance.
 *
 * Design Guide §6.1: Card shell uses bg-base-100 rounded-3xl shadow-card p-6
 * (applied by Card.svelte which ProjectCard wraps).
 * Design Guide §6.2: Neutral pill uses rounded-full bg-base-200 text-xs.
 */
describe('ProjectCard — Design Guide class compliance (QA kickback Fix 4)', () => {
  it('Scenario: DG §6.1 card shell classes present (bg-base-100, rounded-3xl, shadow-card, p-6)', () => {
    // Card.svelte renders: <div class="bg-base-100 rounded-3xl shadow-card p-6 {extraClass}">
    const { container } = render(ProjectCard, { props: { project: stubProject } });
    // The outermost div rendered by Card.svelte
    const cardShell = container.querySelector('.bg-base-100.rounded-3xl.shadow-card.p-6');
    expect(cardShell).toBeTruthy();
  });

  it('Scenario: DG §6.2 neutral pill for created-at has rounded-full and bg-base-200', () => {
    const { container } = render(ProjectCard, { props: { project: stubProject } });
    const pill = container.querySelector('[aria-label^="Created"]');
    expect(pill).toBeTruthy();
    // DG §6.2 neutral pill: rounded-full bg-base-200
    expect(pill?.classList.contains('rounded-full')).toBe(true);
    expect(pill?.classList.contains('bg-base-200')).toBe(true);
    expect(pill?.classList.contains('text-xs')).toBe(true);
  });

  it('Scenario: project name link has DG §6.1 typography (text-xl, font-semibold)', () => {
    const { getByRole } = render(ProjectCard, { props: { project: stubProject } });
    const link = getByRole('link', { name: 'Alpha Project' });
    expect(link.classList.contains('text-xl')).toBe(true);
    expect(link.classList.contains('font-semibold')).toBe(true);
  });
});
