/**
 * Vitest unit test for IconButton component — STORY-006-01
 * Gherkin: "Vitest harness wired"
 * Asserts aria-label presence and btn-circle class.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import IconButton from '../../src/lib/components/IconButton.svelte';

describe('IconButton', () => {
  it('renders with the required aria-label attribute', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Test action' },
    });
    const button = getByRole('button', { name: 'Test action' });
    expect(button).toBeTruthy();
    expect(button.getAttribute('aria-label')).toBe('Test action');
  });

  it('has btn-circle class for circular shape (Design Guide §6.4)', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Circular button' },
    });
    const button = getByRole('button', { name: 'Circular button' });
    expect(button.classList.contains('btn-circle')).toBe(true);
  });

  it('has bg-base-200 resting state class (Design Guide §6.4)', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Icon button resting state' },
    });
    const button = getByRole('button', { name: 'Icon button resting state' });
    expect(button.classList.contains('bg-base-200')).toBe(true);
  });

  it('renders as button type by default', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Default type' },
    });
    const button = getByRole('button', { name: 'Default type' });
    expect(button.getAttribute('type')).toBe('button');
  });
});
