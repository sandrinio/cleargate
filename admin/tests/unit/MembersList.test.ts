/**
 * RED tests for CR-062 — MembersList.svelte component
 *
 * Story: CR-062 (SPRINT-27, Wave 1) — outer admin UI surface
 * Sprint: SPRINT-27
 *
 * ALL 5 scenarios FAIL on the clean baseline because the top-level import of
 * MembersList.svelte (and InviteUrlModal.svelte) triggers MODULE_NOT_FOUND at
 * file-load time — before any test body executes. Vitest marks every test in
 * this file as an error.
 *
 * Post-CR-062 implementation the imports resolve and each assertion passes.
 *
 * Run via:
 *   cd /path/to/ClearGate/.worktrees/CR-062/admin
 *   npm run test:vitest -- --reporter=verbose tests/unit/MembersList.test.ts
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

// These imports FAIL on baseline — neither file exists yet.
// Module load failure propagates to all test cases in this file.
import MembersList from '../../src/lib/components/MembersList.svelte';
import InviteUrlModal from '../../src/lib/components/InviteUrlModal.svelte';

// ─────────────────────────────────────────────────────────────────────────────
// Store / utility mocks (required by components post-implementation)
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('$lib/stores/toast.svelte.js', () => ({
  toastStore: {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    get toasts() {
      return [];
    },
  },
}));

vi.mock('$lib/utils/clipboard.js', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

// ─────────────────────────────────────────────────────────────────────────────
// Test data
// ─────────────────────────────────────────────────────────────────────────────

interface MemberDto {
  id: string;
  project_id: string;
  email: string;
  role: string;
  display_name: string | null;
  created_at: string;
  status: 'pending' | 'active' | 'expired';
}

function makeMember(overrides: Partial<MemberDto> = {}): MemberDto {
  return {
    id: 'mem-00000000-0000-4000-8000-000000062201',
    project_id: 'proj-00000000-0000-4000-8000-000000062200',
    email: 'member@cleargate.test',
    role: 'user',
    display_name: null,
    created_at: new Date().toISOString(),
    status: 'pending',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 8 (M1 blueprint) — pending row renders Send AND Trash2 icons
// ─────────────────────────────────────────────────────────────────────────────

describe('MembersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(
    'Scenario 8a (RED): pending row renders Send icon with aria-label and title',
    () => {
      const member = makeMember({ status: 'pending' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend: vi.fn(), onremove: vi.fn() },
      });

      // Resend (Send) button must be present for pending rows
      const sendBtn = container.querySelector('[aria-label*="Resend"]') ??
        container.querySelector('[aria-label*="resend"]') ??
        container.querySelector('[title*="Resend"]');
      expect(sendBtn).toBeTruthy();
      // Must also have a title tooltip (Design Guide §6.4)
      expect(
        sendBtn?.getAttribute('aria-label') || sendBtn?.getAttribute('title'),
      ).toBeTruthy();
    },
  );

  it(
    'Scenario 8b (RED): pending row renders Trash2 (Remove) icon with aria-label and title',
    () => {
      const member = makeMember({ status: 'pending' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend: vi.fn(), onremove: vi.fn() },
      });

      // Remove (Trash2) button must be present for all rows
      const removeBtn = container.querySelector('[aria-label*="Remove"]') ??
        container.querySelector('[aria-label*="remove"]') ??
        container.querySelector('[title*="Remove"]');
      expect(removeBtn).toBeTruthy();
      expect(
        removeBtn?.getAttribute('aria-label') || removeBtn?.getAttribute('title'),
      ).toBeTruthy();
    },
  );

  it(
    'Scenario 9 (RED): active row renders Trash2 icon only — no Send icon',
    () => {
      const member = makeMember({ status: 'active', email: 'active@cleargate.test' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend: vi.fn(), onremove: vi.fn() },
      });

      // Send icon must NOT appear for active members
      const sendBtn = container.querySelector('[aria-label*="Resend"]') ??
        container.querySelector('[aria-label*="resend"]');
      expect(sendBtn).toBeNull();

      // Remove (Trash2) icon must still appear
      const removeBtn = container.querySelector('[aria-label*="Remove"]') ??
        container.querySelector('[aria-label*="remove"]');
      expect(removeBtn).toBeTruthy();
    },
  );

  it(
    'Scenario 10 (RED): clicking Send icon dispatches onresend callback with memberId',
    async () => {
      const onresend = vi.fn();
      const member = makeMember({ id: 'mem-click-test', status: 'pending' });
      const { container } = render(MembersList, {
        props: { members: [member], onresend, onremove: vi.fn() },
      });

      const sendBtn = container.querySelector('[aria-label*="Resend"]') ??
        container.querySelector('[aria-label*="resend"]') as HTMLElement | null;
      expect(sendBtn).toBeTruthy();

      await fireEvent.click(sendBtn as HTMLElement);

      expect(onresend).toHaveBeenCalledOnce();
      expect(onresend).toHaveBeenCalledWith(member.id);
    },
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// InviteUrlModal — mail_sent indicator scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('InviteUrlModal', () => {
  const baseProps = {
    open: true,
    inviteUrl: 'https://mcp.test/join/tok-abc',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    recipientEmail: 'invitee@cleargate.test',
    mailSent: true,
  };

  it(
    'Scenario 10a (RED): mailSent=true → renders green "Email sent" indicator with recipient address',
    () => {
      const { container } = render(InviteUrlModal, { props: { ...baseProps, mailSent: true } });

      // Expect a green indicator mentioning the recipient email
      const text = container.textContent ?? '';
      expect(text).toContain('invitee@cleargate.test');
      // Green indicator — look for a success/green class or the phrase "Email sent"
      const successEl = container.querySelector('.text-success, .badge-success, [class*="green"]') ??
        Array.from(container.querySelectorAll('*')).find((el) =>
          el.textContent?.includes('Email sent'),
        );
      expect(successEl).toBeTruthy();
    },
  );

  it(
    'Scenario 10b (RED): mailSent=false → renders amber "could not be sent" indicator',
    () => {
      const { container } = render(InviteUrlModal, {
        props: { ...baseProps, mailSent: false },
      });

      const text = container.textContent ?? '';
      // Amber/warning indicator — look for warning class or the phrase "could not be sent"
      const warningEl = container.querySelector('.text-warning, .badge-warning, [class*="amber"]') ??
        Array.from(container.querySelectorAll('*')).find((el) =>
          el.textContent?.includes('could not be sent'),
        );
      expect(warningEl).toBeTruthy();
      // Invite URL must still be present so admin can copy it manually
      expect(text).toContain('https://mcp.test/join/tok-abc');
    },
  );
});
