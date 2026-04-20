/**
 * Unit tests for /projects/new form validation logic — STORY-006-03
 *
 * Tests client-side validation rules for the new project form:
 * - Name: required, max 100 chars
 *
 * Note: The server does NOT have a slug field (M3 blueprint override).
 * All validation here is purely client-side.
 *
 * QA kickback: also tests envelope mismatch fix — bare ProjectDto parse + redirect URL.
 */
import { describe, it, expect, vi } from 'vitest';
import { ProjectSchema } from 'cleargate/admin-api';

// Inline the validation logic matching new/+page.svelte
const NAME_MAX = 100;

function validateName(value: string): string | null {
  if (!value.trim()) return 'Project name is required';
  if (value.length > NAME_MAX) return `Name must be ${NAME_MAX} characters or fewer`;
  return null;
}

describe('new project form validation', () => {
  describe('name field', () => {
    it('returns error for empty name', () => {
      expect(validateName('')).toBe('Project name is required');
    });

    it('returns error for whitespace-only name', () => {
      expect(validateName('   ')).toBe('Project name is required');
    });

    it('returns null for valid short name', () => {
      expect(validateName('My Project')).toBeNull();
    });

    it('returns null for name at exactly 100 chars', () => {
      const exactly100 = 'a'.repeat(100);
      expect(validateName(exactly100)).toBeNull();
    });

    it('returns error for name exceeding 100 chars', () => {
      const over100 = 'a'.repeat(101);
      expect(validateName(over100)).toBe(`Name must be ${NAME_MAX} characters or fewer`);
    });

    it('returns null for name with 1 char', () => {
      expect(validateName('x')).toBeNull();
    });

    it('returns null for name with unicode characters', () => {
      expect(validateName('Проект Α')).toBeNull();
    });
  });

  describe('form submission guard', () => {
    function validateAll(name: string): boolean {
      return validateName(name) === null;
    }

    it('blocks submission when name is empty', () => {
      expect(validateAll('')).toBe(false);
    });

    it('allows submission with valid name', () => {
      expect(validateAll('Valid project')).toBe(true);
    });

    it('blocks submission when name is too long', () => {
      expect(validateAll('x'.repeat(101))).toBe(false);
    });
  });
});

/**
 * Fix 1 (QA kickback) — envelope mismatch test.
 *
 * POST /admin-api/v1/projects returns a BARE ProjectDto, not { project: ProjectDto }.
 * Confirmed via mcp/src/admin-api/projects.ts:92-93:
 *   reply.code(201).send(toDto(project!))
 *
 * Previously the page used z.object({ project: ProjectSchema }).strict() which threw ZodError
 * on the bare response, causing the toast "Failed to create project" and skipping goto().
 * Fix: use ProjectSchema directly + redirect to /projects/<res.id> (not res.project.id).
 */
describe('POST /projects response schema — envelope mismatch fix (QA kickback)', () => {
  // Mirror the corrected schema from +page.svelte (bare ProjectSchema, no envelope)
  const NewProjectResponseSchema = ProjectSchema;

  const bareProjectDto = {
    id: 'uuid-abc-123',
    name: 'My New Project',
    created_by: 'admin-handle',
    created_at: new Date().toISOString(),
    deleted_at: null,
  };

  it('Scenario: bare ProjectDto parses correctly with ProjectSchema (no envelope)', () => {
    // Must not throw — if the old { project: ... } envelope schema were used, this would throw
    const result = NewProjectResponseSchema.parse(bareProjectDto);
    expect(result.id).toBe('uuid-abc-123');
    expect(result.name).toBe('My New Project');
  });

  it('Scenario: { project: ... } envelope correctly FAILS ProjectSchema (proves envelope is absent)', () => {
    // The server does NOT wrap in { project: ... } — this assertion documents the wire format
    const wrapped = { project: bareProjectDto };
    const parsed = NewProjectResponseSchema.safeParse(wrapped);
    expect(parsed.success).toBe(false);
  });

  it('Scenario: redirect URL uses res.id not res.project.id after successful parse', () => {
    // Simulate what the page does after mcpClient.post() returns
    const capturedGotos: string[] = [];
    const fakeGoto = (url: string) => { capturedGotos.push(url); };

    const res = NewProjectResponseSchema.parse(bareProjectDto);
    // Corrected: goto(`/projects/${res.id}`) — not res.project.id
    fakeGoto(`/projects/${res.id}`);

    expect(capturedGotos).toHaveLength(1);
    expect(capturedGotos[0]).toBe(`/projects/${bareProjectDto.id}`);
  });

  it('Scenario: mcpClient.post returning bare ProjectDto drives correct redirect', async () => {
    // Unit-test the integration: mock mcpClient.post, simulate the page handleSubmit logic
    const fakePost = vi.fn().mockResolvedValue(bareProjectDto);
    const capturedGotos: string[] = [];
    const fakeGoto = (url: string) => { capturedGotos.push(url); };

    // Replicate the corrected handleSubmit core logic
    const res = await fakePost('/projects', { name: 'My New Project' }, NewProjectResponseSchema);
    const parsed = NewProjectResponseSchema.parse(res);
    fakeGoto(`/projects/${parsed.id}`);

    expect(fakePost).toHaveBeenCalledOnce();
    expect(capturedGotos[0]).toBe('/projects/uuid-abc-123');
  });
});
