/**
 * Unit tests for ProjectCard component — STORY-006-03
 *
 * Scenario: ProjectCard renders with project props
 * Scenario: ProjectCard link routes to /projects/:id
 * Scenario: ProjectCard shows member count chip when memberCount provided
 * Scenario: ProjectCard shows token count chip when tokenCount provided
 * Scenario: ProjectCard omits chips when counts not provided
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
