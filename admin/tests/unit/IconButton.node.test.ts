/**
 * Vitest unit test for IconButton component — STORY-006-01
 * Converted to node:test — STORY-028-07
 * Gherkin: "Vitest harness wired"
 * Asserts aria-label presence and btn-circle class.
 */
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { render } from '@testing-library/svelte';
import IconButton from '../../src/lib/components/IconButton.svelte';

describe('IconButton', () => {
  test('renders with the required aria-label attribute', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Test action' },
    });
    const button = getByRole('button', { name: 'Test action' });
    assert.ok(button);
    assert.strictEqual(button.getAttribute('aria-label'), 'Test action');
  });

  test('has btn-circle class for circular shape (Design Guide §6.4)', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Circular button' },
    });
    const button = getByRole('button', { name: 'Circular button' });
    assert.ok(button.classList.contains('btn-circle'));
  });

  test('has bg-base-200 resting state class (Design Guide §6.4)', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Icon button resting state' },
    });
    const button = getByRole('button', { name: 'Icon button resting state' });
    assert.ok(button.classList.contains('bg-base-200'));
  });

  test('renders as button type by default', () => {
    const { getByRole } = render(IconButton, {
      props: { 'aria-label': 'Default type' },
    });
    const button = getByRole('button', { name: 'Default type' });
    assert.strictEqual(button.getAttribute('type'), 'button');
  });
});
