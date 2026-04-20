/**
 * Unit tests for AddAdminModal — STORY-006-09
 *
 * Gherkin scenarios covered:
 *   - Handle validation: invalid chars → inline error, POST not called
 *   - Valid handle: form submits successfully
 *   - Server error surfaces inline
 */
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import AddAdminModal from '../../src/lib/components/AddAdminModal.svelte';

describe('AddAdminModal', () => {
  it('Scenario: Handle validation — invalid characters show inline error', async () => {
    const onadd = vi.fn();
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: vi.fn(),
        onadd,
      },
    });

    const input = getByTestId('handle-input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'invalid handle with spaces!' } });

    const error = getByTestId('handle-error');
    expect(error.textContent).toContain('Invalid GitHub handle');
    expect(onadd).not.toHaveBeenCalled();
  });

  it('Scenario: Handle validation — empty handle shows required error', async () => {
    const onadd = vi.fn();
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: vi.fn(),
        onadd,
      },
    });

    const input = getByTestId('handle-input') as HTMLInputElement;
    // Clear and blur to trigger validation
    await fireEvent.input(input, { target: { value: '' } });

    const error = getByTestId('handle-error');
    expect(error.textContent).toContain('required');
  });

  it('Scenario: Valid handle — form calls onadd with handle and is_root', async () => {
    let resolveAdd: () => void;
    const onadd = vi.fn().mockReturnValue(
      new Promise<void>((resolve) => { resolveAdd = resolve; })
    );
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: vi.fn(),
        onadd,
      },
    });

    const input = getByTestId('handle-input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'octocat' } });

    const submitBtn = getByTestId('submit-btn') as HTMLButtonElement;
    await fireEvent.click(submitBtn);

    expect(onadd).toHaveBeenCalledWith('octocat', false);
    resolveAdd!();
  });

  it('Scenario: GitHub user not found — server error surfaced inline', async () => {
    const onadd = vi.fn().mockRejectedValue(new Error('GitHub user not found'));
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: vi.fn(),
        onadd,
      },
    });

    const input = getByTestId('handle-input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'unknown-user-xyz' } });

    const submitBtn = getByTestId('submit-btn') as HTMLButtonElement;
    await fireEvent.click(submitBtn);

    // Wait for async rejection
    await new Promise((r) => setTimeout(r, 50));

    const serverError = getByTestId('server-error');
    expect(serverError.textContent).toContain('GitHub user not found');
  });
});
