/**
 * Unit tests for /projects/new form validation logic — STORY-006-03
 *
 * Tests client-side validation rules for the new project form:
 * - Name: required, max 100 chars
 *
 * Note: The server does NOT have a slug field (M3 blueprint override).
 * All validation here is purely client-side.
 */
import { describe, it, expect } from 'vitest';

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
