/**
 * Unit tests for ConfirmDialog component — STORY-006-04
 *
 * Scenarios covered:
 *   - Dialog renders when open=true, hidden when open=false
 *   - onconfirm callback fires when Confirm is clicked
 *   - onclose callback fires when Cancel is clicked
 *   - confirmVariant='danger' uses btn-error class (DG §6.7)
 *   - confirmVariant='default' uses btn-primary class (DG §6.7)
 *   - confirmLabel prop customises button text
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import ConfirmDialog from '../../src/lib/components/ConfirmDialog.svelte';

const baseProps = {
  open: true,
  title: 'Delete this?',
  message: 'This action cannot be undone.',
  onclose: () => {},
  onconfirm: () => {},
};

describe('ConfirmDialog', () => {
  it('renders the title and message when open=true', () => {
    const { getByText } = render(ConfirmDialog, { props: baseProps });
    expect(getByText('Delete this?')).toBeTruthy();
    expect(getByText('This action cannot be undone.')).toBeTruthy();
  });

  it('does not render content when open=false', () => {
    const { queryByText } = render(ConfirmDialog, {
      props: { ...baseProps, open: false },
    });
    expect(queryByText('Delete this?')).toBeNull();
  });

  it('calls onconfirm when the confirm button is clicked', async () => {
    const onconfirm = vi.fn();
    const onclose = vi.fn();
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, onconfirm, onclose },
    });
    await fireEvent.click(getByText('Confirm'));
    expect(onconfirm).toHaveBeenCalledOnce();
  });

  it('calls onclose when Cancel is clicked', async () => {
    const onclose = vi.fn();
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, onclose },
    });
    await fireEvent.click(getByText('Cancel'));
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('also calls onclose after confirm (dialog auto-closes)', async () => {
    const onconfirm = vi.fn();
    const onclose = vi.fn();
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, onconfirm, onclose },
    });
    await fireEvent.click(getByText('Confirm'));
    expect(onclose).toHaveBeenCalledOnce();
  });

  it('uses btn-error class for danger variant (DG §6.7)', () => {
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, confirmVariant: 'danger', confirmLabel: 'Delete' },
    });
    const btn = getByText('Delete');
    expect(btn.classList.contains('btn-error')).toBe(true);
  });

  it('uses btn-primary class for default variant (DG §6.7)', () => {
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, confirmVariant: 'default', confirmLabel: 'Confirm' },
    });
    const btn = getByText('Confirm');
    expect(btn.classList.contains('btn-primary')).toBe(true);
  });

  it('renders custom confirmLabel text', () => {
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, confirmLabel: 'Yes, remove it' },
    });
    expect(getByText('Yes, remove it')).toBeTruthy();
  });
});
