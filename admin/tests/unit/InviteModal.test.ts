/**
 * Unit tests for InviteModal component — STORY-006-04
 *
 * Scenarios covered:
 *   - Form phase renders when modal opens
 *   - Submit button is disabled when email is empty (validation)
 *   - Submit button is disabled when email is malformed
 *   - Submit button is enabled with valid email
 *   - POST is called with { email, role } on submit (mocked)
 *   - On success, modal switches to URL phase and shows invite_url
 *   - URL phase shows a Copy button
 *   - No "Resend invite" button exists (per orchestrator decision)
 *   - On 409, inline error "Already a member" is shown
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';

// Mock mcp-client before importing the component
vi.mock('../../src/lib/mcp-client.js', () => ({
  get: vi.fn(),
  post: vi.fn(),
  getAdminToken: vi.fn(() => 'mock-token'),
  exchange: vi.fn(),
  signOut: vi.fn(),
  _setBaseUrl: vi.fn(),
  _setFetch: vi.fn(),
  _resetState: vi.fn(),
  mcpClient: { get: vi.fn(), post: vi.fn(), exchange: vi.fn(), signOut: vi.fn() },
}));

// Mock toast store — $state rune can't be instantiated outside Svelte in vitest
vi.mock('$lib/stores/toast.svelte.js', () => ({
  toastStore: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    get toasts() { return []; },
  },
}));

import { post } from '../../src/lib/mcp-client.js';
import InviteModal from '../../src/lib/components/InviteModal.svelte';

const mockPost = post as ReturnType<typeof vi.fn>;

const baseProps = {
  open: true,
  onclose: () => {},
  projectId: 'proj-123',
  projectName: 'Test Project',
};

const mockInviteResponse = {
  member: {
    id: 'mem-1',
    project_id: 'proj-123',
    email: 'alice@example.com',
    role: 'user',
    created_at: new Date().toISOString(),
    status: 'pending',
    display_name: null,
  },
  invite_url: 'https://mcp.cleargate.example/join/abc123',
  invite_token: 'abc123',
  invite_expires_in: 86400,
};

describe('InviteModal', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('renders email + role form on open', () => {
    const { getByLabelText } = render(InviteModal, { props: baseProps });
    expect(getByLabelText('Email address')).toBeTruthy();
    expect(getByLabelText('Role')).toBeTruthy();
  });

  it('submit button is disabled when email is empty', () => {
    const { getByText } = render(InviteModal, { props: baseProps });
    const btn = getByText('Send invite') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('submit button is disabled when email is malformed', async () => {
    const { getByLabelText, getByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'not-an-email' } });
    const btn = getByText('Send invite') as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  it('submit button is enabled with valid email', async () => {
    const { getByLabelText, getByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });
    const btn = getByText('Send invite') as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
  });

  it('calls POST with { email, role } on submit', async () => {
    mockPost.mockResolvedValueOnce(mockInviteResponse);

    const { getByLabelText, getByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/projects/proj-123/members',
        { email: 'alice@example.com', role: 'user' },
        expect.anything()
      );
    });
  });

  it('switches to URL phase and shows invite_url on success', async () => {
    mockPost.mockResolvedValueOnce(mockInviteResponse);

    const { getByLabelText, getByDisplayValue } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(getByDisplayValue('https://mcp.cleargate.example/join/abc123')).toBeTruthy();
    });
  });

  it('shows Copy button in URL phase', async () => {
    mockPost.mockResolvedValueOnce(mockInviteResponse);

    const { getByLabelText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    await waitFor(() => {
      expect(getByLabelText('Copy invite URL')).toBeTruthy();
    });
  });

  it('shows inline error "Already a member" on 409', async () => {
    const err = Object.assign(new Error('409'), { status: 409 });
    mockPost.mockRejectedValueOnce(err);

    const { getByLabelText, findByText } = render(InviteModal, { props: baseProps });
    const emailInput = getByLabelText('Email address') as HTMLInputElement;
    await fireEvent.input(emailInput, { target: { value: 'alice@example.com' } });

    const form = emailInput.closest('form')!;
    await fireEvent.submit(form);

    const errMsg = await findByText('Already a member of this project');
    expect(errMsg).toBeTruthy();
  });

  it('has NO resend invite button (per orchestrator decision)', () => {
    const { queryByText } = render(InviteModal, { props: baseProps });
    // Neither in form phase nor URL phase should a "Resend" button exist
    expect(queryByText(/resend/i)).toBeNull();
  });
});
