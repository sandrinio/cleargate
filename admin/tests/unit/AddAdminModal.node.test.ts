import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for AddAdminModal — STORY-006-09
 *
 * Gherkin scenarios covered:
 *   - Handle validation: invalid chars → inline error, POST not called
 *   - Valid handle: form submits successfully
 *   - Server error surfaces inline
 */
import { render, fireEvent } from '@testing-library/svelte';
import AddAdminModal from '../../src/lib/components/AddAdminModal.svelte';

describe('AddAdminModal', () => {
  test('Scenario: Handle validation — invalid characters show inline error', async () => {
    const onadd = mock.fn(() => Promise.resolve(undefined));
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: mock.fn(),
        onadd,
      },
    });

    const input = getByTestId('handle-input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'invalid handle with spaces!' } });

    const error = getByTestId('handle-error');
    assert.ok(String(error.textContent).includes('Invalid GitHub handle'));
    assert.strictEqual(onadd.mock.calls.length, 0);
  });

  test('Scenario: Handle validation — empty handle shows required error', async () => {
    const onadd = mock.fn(() => Promise.resolve(undefined));
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: mock.fn(),
        onadd,
      },
    });

    const input = getByTestId('handle-input') as HTMLInputElement;
    // Clear and blur to trigger validation
    await fireEvent.input(input, { target: { value: '' } });

    const error = getByTestId('handle-error');
    assert.ok(String(error.textContent).includes('required'));
  });

  test('Scenario: Valid handle — form calls onadd with handle and is_root', async () => {
    let resolveAdd: () => void;
    const onadd = mock.fn(() => 
      new Promise<void>((resolve) => { resolveAdd = resolve; })
    );
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: mock.fn(),
        onadd,
      },
    });

    const input = getByTestId('handle-input') as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'octocat' } });

    const submitBtn = getByTestId('submit-btn') as HTMLButtonElement;
    await fireEvent.click(submitBtn);

    assert.deepStrictEqual(onadd.mock.calls[onadd.mock.calls.length - 1]?.arguments, ['octocat', false]);
    resolveAdd!();
  });

  test('Scenario: GitHub user not found — server error surfaced inline', async () => {
    const onadd = mock.fn(() => Promise.reject(new Error('GitHub user not found')));
    const { getByTestId } = render(AddAdminModal, {
      props: {
        open: true,
        onclose: mock.fn(),
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
    assert.ok(String(serverError.textContent).includes('GitHub user not found'));
  });
});
