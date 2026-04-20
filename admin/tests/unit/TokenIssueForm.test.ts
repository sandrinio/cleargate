/**
 * TokenIssueForm unit tests — STORY-006-05
 *
 * Scenarios:
 *   1. Name validation: "ab" (2 chars) shows error, POST not called
 *   2. Name validation: 80-char name is valid (boundary)
 *   3. Name validation: 81-char name shows error, POST not called
 *   4. Member select is populated from memberOptions prop
 *   5. Submit calls mcpClient.post with correct payload shape (name, member_id, expires_at)
 *   6. Expiration radio defaults to 30d
 *   7. "Never" expiration omits expires_at from body
 *   8. onissued callback is called with the server response
 *   9. Server error shows inline retry banner; onissued NOT called
 *  10. Schema drift (empty token field) shows error; onissued NOT called
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, waitFor } from '@testing-library/svelte';

// Mock mcp-client
vi.mock('../../src/lib/mcp-client.js', () => ({
  post: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
  exchange: vi.fn(),
  signOut: vi.fn(),
  getAdminToken: vi.fn(() => 'mock-token'),
  _setBaseUrl: vi.fn(),
  _setFetch: vi.fn(),
  _resetState: vi.fn(),
  mcpClient: {
    get: vi.fn(),
    post: vi.fn(),
    del: vi.fn(),
    exchange: vi.fn(),
    signOut: vi.fn(),
  },
}));

// Mock toast store
vi.mock('$lib/stores/toast.js', () => ({
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
import TokenIssueForm from '../../src/lib/components/TokenIssueForm.svelte';

const mockPost = post as ReturnType<typeof vi.fn>;

const mockMemberOptions = [
  { id: 'mem-001', email: 'alice@example.com' },
  { id: 'mem-002', email: 'bob@example.com' },
];

const mockTokenIssued = {
  id: 'tok-123',
  member_id: 'mem-001',
  name: 'ci-bot',
  created_at: new Date().toISOString(),
  expires_at: null,
  last_used_at: null,
  revoked_at: null,
  token: 'cg_plaintext_abc123',
};

const baseProps = {
  open: true,
  projectId: 'proj-abc',
  memberOptions: mockMemberOptions,
  onissued: vi.fn(),
  onclose: vi.fn(),
};

describe('TokenIssueForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Scenario 1: Short name shows error
  it('name "ab" (2 chars) shows validation error and POST is not called', async () => {
    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, { props: baseProps });

    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: 'ab' } });

    // Use getByRole to disambiguate from the heading
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/3-80 characters/i)).toBeTruthy();
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  // Scenario 2: 80-char name is valid (boundary)
  it('name with exactly 80 chars passes validation', async () => {
    mockPost.mockResolvedValue(mockTokenIssued);
    const { getByLabelText, getByRole } = render(TokenIssueForm, { props: baseProps });

    const name80 = 'a'.repeat(80);
    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: name80 } });

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });
  });

  // Scenario 3: 81-char name shows error
  it('name with 81 chars shows validation error', async () => {
    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, { props: baseProps });

    const name81 = 'a'.repeat(81);
    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: name81 } });

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/3-80 characters/i)).toBeTruthy();
    });
    expect(mockPost).not.toHaveBeenCalled();
  });

  // Scenario 4: Member select is populated
  it('member select is populated from memberOptions', () => {
    const { getByLabelText } = render(TokenIssueForm, { props: baseProps });
    const select = getByLabelText(/member/i) as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(select.options.length).toBe(2);
    expect(select.options[0]!.text).toBe('alice@example.com');
    expect(select.options[1]!.text).toBe('bob@example.com');
  });

  // Scenario 5: Submit calls post with correct payload
  it('submit calls mcpClient.post with { member_id, name, expires_at }', async () => {
    mockPost.mockResolvedValue(mockTokenIssued);
    const { getByLabelText, getByRole } = render(TokenIssueForm, { props: baseProps });

    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: 'ci-bot' } });

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    const [path, body] = mockPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(path).toBe('/projects/proj-abc/tokens');
    expect(body.name).toBe('ci-bot');
    expect(body.member_id).toBe('mem-001'); // first option selected by default
    // 30d default means expires_at should be present
    expect(body.expires_at).toBeDefined();
  });

  // Scenario 6: Default expiry is 30d
  it('expiration radio defaults to 30 days', () => {
    const { container } = render(TokenIssueForm, { props: baseProps });
    const radios = container.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    const checked = Array.from(radios).find((r) => r.checked);
    expect(checked).toBeTruthy();
    expect(checked!.value).toBe('30d');
  });

  // Scenario 7: "Never" expiration omits expires_at
  it('"Never" expiration sends body without expires_at', async () => {
    mockPost.mockResolvedValue(mockTokenIssued);
    const { getByLabelText, getByRole, container } = render(TokenIssueForm, { props: baseProps });

    const nameInput = getByLabelText(/token name/i);
    await fireEvent.input(nameInput, { target: { value: 'never-bot' } });

    // Select "Never" radio
    const radios = container.querySelectorAll('input[type="radio"]') as NodeListOf<HTMLInputElement>;
    const neverRadio = Array.from(radios).find((r) => r.value === 'never');
    expect(neverRadio).toBeTruthy();
    await fireEvent.click(neverRadio!);

    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalled();
    });

    const [, body] = mockPost.mock.calls[0] as [string, Record<string, unknown>];
    expect(body.expires_at).toBeUndefined();
  });

  // Scenario 8: onissued is called with server response
  it('onissued callback is called with the full server response', async () => {
    mockPost.mockResolvedValue(mockTokenIssued);
    const onissued = vi.fn();
    const { getByLabelText, getByRole } = render(TokenIssueForm, {
      props: { ...baseProps, onissued },
    });

    await fireEvent.input(getByLabelText(/token name/i), { target: { value: 'test-token' } });
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onissued).toHaveBeenCalledWith(mockTokenIssued);
    });
  });

  // Scenario 9: Server error shows retry banner; onissued not called
  it('server error shows inline retry banner and onissued is NOT called', async () => {
    mockPost.mockRejectedValue(new Error('Internal server error'));
    const onissued = vi.fn();
    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, {
      props: { ...baseProps, onissued },
    });

    await fireEvent.input(getByLabelText(/token name/i), { target: { value: 'failing-bot' } });
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/internal server error/i)).toBeTruthy();
    });
    expect(onissued).not.toHaveBeenCalled();
  });

  // Scenario 10: Schema drift guard — empty token triggers error
  it('schema drift guard: empty token field shows error and onissued is NOT called', async () => {
    // Empty string triggers the guard: if (!result.token) throw ...
    mockPost.mockResolvedValue({ ...mockTokenIssued, token: '' });
    const onissued = vi.fn();

    const { getByLabelText, getByRole, getByText } = render(TokenIssueForm, {
      props: { ...baseProps, onissued },
    });

    await fireEvent.input(getByLabelText(/token name/i), { target: { value: 'drift-bot' } });
    const submitBtn = getByRole('button', { name: 'Issue token' });
    await fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(getByText(/schema drift/i)).toBeTruthy();
    });
    expect(onissued).not.toHaveBeenCalled();
  });
});
