/**
 * Unit tests for MultiSelect — STORY-006-07
 *
 * Scenarios:
 *   - Renders placeholder when nothing selected
 *   - Opens dropdown on trigger click; closes on Escape key
 *   - Renders options in the dropdown
 *   - Clicking an option adds it to selection (onchange called)
 *   - Clicking a selected option removes it (onchange called)
 *   - Shows count label when multiple selected
 *   - Shows single item label when one selected
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import MultiSelect from '../../src/lib/components/MultiSelect.svelte';

const OPTIONS = [
  { value: 'uuid-001', label: 'alice@example.com' },
  { value: 'uuid-002', label: 'bob@example.com' },
  { value: 'uuid-003', label: 'carol@example.com' },
];

describe('MultiSelect', () => {
  it('renders placeholder when nothing selected', () => {
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, placeholder: 'All actors' },
    });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.textContent?.trim()).toContain('All actors');
  });

  it('dropdown is not visible initially', () => {
    const { queryByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    expect(queryByTestId('multiselect-dropdown')).toBeNull();
  });

  it('opens dropdown when trigger is clicked', async () => {
    const { getByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    expect(getByTestId('multiselect-dropdown')).toBeTruthy();
  });

  it('renders all options in the dropdown', async () => {
    const { getByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    for (const opt of OPTIONS) {
      expect(getByTestId(`multiselect-option-${opt.value}`)).toBeTruthy();
    }
  });

  it('clicking an option calls onchange with that value added', async () => {
    const onchange = vi.fn();
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: [], onchange },
    });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    await fireEvent.click(getByTestId('multiselect-option-uuid-001'));
    expect(onchange).toHaveBeenCalledOnce();
    expect(onchange.mock.calls[0][0]).toContain('uuid-001');
  });

  it('clicking a selected option calls onchange with that value removed', async () => {
    const onchange = vi.fn();
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: ['uuid-001'], onchange },
    });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    await fireEvent.click(getByTestId('multiselect-option-uuid-001'));
    expect(onchange).toHaveBeenCalledOnce();
    expect(onchange.mock.calls[0][0]).not.toContain('uuid-001');
  });

  it('shows single item label when one option is selected', () => {
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: ['uuid-001'] },
    });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.textContent?.trim()).toContain('alice@example.com');
  });

  it('shows count label when multiple options are selected', () => {
    const { getByTestId } = render(MultiSelect, {
      props: { options: OPTIONS, selected: ['uuid-001', 'uuid-002'] },
    });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.textContent?.trim()).toContain('2 selected');
  });

  it('closes dropdown on Escape key', async () => {
    const { getByTestId, queryByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    // Open
    await fireEvent.click(getByTestId('multiselect-trigger'));
    expect(getByTestId('multiselect-dropdown')).toBeTruthy();
    // Press Escape via svelte:window keydown
    await fireEvent.keyDown(window, { key: 'Escape' });
    expect(queryByTestId('multiselect-dropdown')).toBeNull();
  });

  it('shows "No options" message when options array is empty', async () => {
    const { getByTestId, getByText } = render(MultiSelect, { props: { options: [] } });
    await fireEvent.click(getByTestId('multiselect-trigger'));
    expect(getByText('No options')).toBeTruthy();
  });

  it('sets aria-expanded to true when open, false when closed', async () => {
    const { getByTestId } = render(MultiSelect, { props: { options: OPTIONS } });
    const trigger = getByTestId('multiselect-trigger');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });
});
