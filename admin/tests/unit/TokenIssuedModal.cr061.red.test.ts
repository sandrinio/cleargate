/**
 * QA-Red tests — CR-061: TokenIssuedModal 3-tab connection snippet
 *
 * RED PHASE: These tests MUST FAIL against the current TokenIssuedModal.svelte
 * because the modal has no tabs, no snippet sections, and no tab-switching state.
 *
 * IMMUTABLE after Red phase — do NOT edit to make them pass by weakening assertions.
 * Developer must implement the 3-tab snippet UI in TokenIssuedModal.svelte to turn
 * these green.
 *
 * Scenarios (per M3.md Test shape + CR-061 §4):
 *   R1. Default tab on open is HTTP JSON; JSON snippet visible with PUBLIC_MCP_URL + Bearer token
 *   R2. Clicking "curl test" tab switches; curl snippet contains curl, -X POST, Bearer, tools/list
 *   R3. Clicking "Claude Desktop (stdio)" tab; stdio snippet contains literal CLEARGATE_SERVICE_TOKEN
 *   R4. stdio snippet contains "cleargate" command and "mcp" + "serve" args
 *   R5. Copy-JSON button calls copyToClipboard with JSON snippet; toast = 'Copied to clipboard'
 *   R6. Copy-curl + copy-stdio buttons fire respective copyToClipboard calls
 *   R7. No plaintext leak after close — snippets + token absent from localStorage/sessionStorage
 *   R8. Footer line contains "npx cleargate init" and ".cleargate/delivery/pending-sync/"
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, screen, waitFor } from '@testing-library/svelte';

// ---------------------------------------------------------------------------
// Hoisted captured callbacks (mirrors pattern from existing test file)
// ---------------------------------------------------------------------------
const { navigateCallbacks } = vi.hoisted(() => {
  const navigateCallbacks: Array<(nav: { cancel: () => void }) => void> = [];
  return { navigateCallbacks };
});

// Mock $app/navigation — identical to existing test file
vi.mock('$app/navigation', () => ({
  beforeNavigate: vi.fn((cb: (nav: { cancel: () => void }) => void) => {
    navigateCallbacks.push(cb);
  }),
  goto: vi.fn(),
}));

// Mock $env/dynamic/public — must be hoisted before component import
// Per M3.md: "Pin PUBLIC_MCP_URL mock to 'https://mcp.example.test'"
vi.mock('$env/dynamic/public', () => ({
  env: { PUBLIC_MCP_URL: 'https://mcp.example.test' },
}));

// Mock clipboard utility
vi.mock('$lib/utils/clipboard.js', () => ({
  copyToClipboard: vi.fn().mockResolvedValue(true),
}));

// Mock toast store
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

import { copyToClipboard } from '$lib/utils/clipboard.js';
import { toastStore } from '$lib/stores/toast.svelte.js';
import TokenIssuedModal from '../../src/lib/components/TokenIssuedModal.svelte';

const mockCopy = copyToClipboard as unknown as ReturnType<typeof vi.fn>;
const mockToast = toastStore as unknown as { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };

// The test secret must start with 'cg_test_' so the stdio snippet regex /"CLEARGATE_SERVICE_TOKEN":\s*"cg_test_/ matches
const SECRET_TOKEN = 'cg_test_abc123_red_test_value_xyz';

const baseProps = {
  open: true,
  plaintext: SECRET_TOKEN,
  onclose: vi.fn(),
};

describe('TokenIssuedModal CR-061 RED — 3-tab snippet (MUST FAIL until implemented)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    navigateCallbacks.length = 0;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // R1: Default tab is HTTP JSON; JSON snippet visible with correct content
  it('R1: default tab on open is JSON; JSON snippet contains PUBLIC_MCP_URL + Bearer token', () => {
    const { container } = render(TokenIssuedModal, { props: baseProps });

    // Tab strip: must have a tab with role="tab" and name matching /http/i selected by default
    const tabs = container.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBeGreaterThanOrEqual(3);

    const httpTab = Array.from(tabs).find((t) =>
      /http/i.test(t.textContent ?? ''),
    );
    expect(httpTab).toBeTruthy();
    expect(httpTab?.getAttribute('aria-selected')).toBe('true');

    // JSON snippet panel must be visible and contain the URL + bearer token
    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel).toBeTruthy();
    const panelText = tabpanel?.textContent ?? '';
    expect(panelText).toContain('https://mcp.example.test');
    expect(panelText).toContain('Authorization');
    expect(panelText).toContain(`Bearer ${SECRET_TOKEN}`);
  });

  // R2: Clicking curl tab shows curl snippet with required strings
  it('R2: clicking "curl" tab switches activeTab; curl snippet contains curl -X POST + Bearer + tools/list', async () => {
    const { container } = render(TokenIssuedModal, { props: baseProps });

    const tabs = container.querySelectorAll('[role="tab"]');
    const curlTab = Array.from(tabs).find((t) =>
      /curl/i.test(t.textContent ?? ''),
    );
    expect(curlTab).toBeTruthy();

    await fireEvent.click(curlTab!);

    const tabpanel = container.querySelector('[role="tabpanel"]');
    const panelText = tabpanel?.textContent ?? '';
    expect(panelText).toContain('curl');
    expect(panelText).toContain('-X POST');
    expect(panelText).toContain(`Bearer ${SECRET_TOKEN}`);
    expect(panelText).toContain('tools/list');
  });

  // R3: Clicking Claude Desktop tab; stdio snippet contains literal CLEARGATE_SERVICE_TOKEN
  it('R3: clicking "Claude Desktop" tab shows stdio snippet with literal CLEARGATE_SERVICE_TOKEN property', async () => {
    const { container } = render(TokenIssuedModal, { props: baseProps });

    const tabs = container.querySelectorAll('[role="tab"]');
    const stdioTab = Array.from(tabs).find((t) =>
      /claude desktop|stdio/i.test(t.textContent ?? ''),
    );
    expect(stdioTab).toBeTruthy();

    await fireEvent.click(stdioTab!);

    const tabpanel = container.querySelector('[role="tabpanel"]');
    const panelText = tabpanel?.textContent ?? '';
    // The literal string "CLEARGATE_SERVICE_TOKEN" must appear as a JSON key
    expect(panelText).toContain('"CLEARGATE_SERVICE_TOKEN"');
    // Value must be the interpolated token
    expect(panelText).toMatch(/"CLEARGATE_SERVICE_TOKEN":\s*"cg_test_/);
  });

  // R4: stdio snippet contains cleargate command and mcp + serve args
  it('R4: stdio snippet contains "cleargate" command and "mcp", "serve" args', async () => {
    const { container } = render(TokenIssuedModal, { props: baseProps });

    const tabs = container.querySelectorAll('[role="tab"]');
    const stdioTab = Array.from(tabs).find((t) =>
      /claude desktop|stdio/i.test(t.textContent ?? ''),
    );
    await fireEvent.click(stdioTab!);

    const tabpanel = container.querySelector('[role="tabpanel"]');
    const panelText = tabpanel?.textContent ?? '';
    expect(panelText).toMatch(/"command":\s*"cleargate"/);
    expect(panelText).toMatch(/"args":\s*\[\s*"mcp",\s*"serve"\s*\]/);
  });

  // R5: Copy button on JSON tab calls copyToClipboard with the JSON snippet body; toast correct
  it('R5: copy-JSON button calls copyToClipboard with JSON snippet; toast is "Copied to clipboard"', async () => {
    mockCopy.mockResolvedValue(true);
    const { container } = render(TokenIssuedModal, { props: baseProps });

    // Default tab is JSON — find the snippet copy button (aria-label should be "Copy snippet" or similar,
    // distinct from "Copy token". If the component uses a separate copy handler per tab, it fires mockCopy.)
    // Per M3 blueprint: each tab has a copy button that copies the matching snippet.
    // We look for the active tabpanel's copy button.
    const tabpanel = container.querySelector('[role="tabpanel"]');
    expect(tabpanel).toBeTruthy();

    // The copy button inside the tabpanel
    const copyBtn = tabpanel?.querySelector('button[aria-label*="opy"]') ??
      tabpanel?.querySelector('button');
    expect(copyBtn).toBeTruthy();

    await fireEvent.click(copyBtn!);

    await waitFor(() => {
      expect(mockCopy).toHaveBeenCalled();
    });
    const copyArg = mockCopy.mock.calls[0]?.[0] as string;
    // The JSON snippet must contain the URL and Authorization header
    expect(copyArg).toContain('https://mcp.example.test');
    expect(copyArg).toContain('Authorization');
    expect(copyArg).toContain(SECRET_TOKEN);
    // Toast must be exactly 'Copied to clipboard' and must NOT contain the token
    await waitFor(() => {
      expect(mockToast.success).toHaveBeenCalledWith('Copied to clipboard');
    });
    const toastMsg = mockToast.success.mock.calls[0]?.[0] as string;
    expect(toastMsg).not.toContain(SECRET_TOKEN);
  });

  // R6: Copy buttons on curl and stdio tabs also fire copyToClipboard
  it('R6: copy-curl and copy-stdio buttons fire copyToClipboard with respective snippet bodies', async () => {
    mockCopy.mockResolvedValue(true);
    const { container } = render(TokenIssuedModal, { props: baseProps });

    const tabs = container.querySelectorAll('[role="tab"]');

    // Click curl tab, then copy
    const curlTab = Array.from(tabs).find((t) => /curl/i.test(t.textContent ?? ''));
    await fireEvent.click(curlTab!);
    const curlPanel = container.querySelector('[role="tabpanel"]');
    const curlCopyBtn = curlPanel?.querySelector('button[aria-label*="opy"]') ??
      curlPanel?.querySelector('button');
    await fireEvent.click(curlCopyBtn!);
    await waitFor(() => expect(mockCopy).toHaveBeenCalled());
    const curlArg = mockCopy.mock.calls.at(-1)?.[0] as string;
    expect(curlArg).toContain('curl');
    expect(curlArg).toContain(SECRET_TOKEN);

    vi.clearAllMocks();
    mockCopy.mockResolvedValue(true);

    // Click stdio tab, then copy
    const stdioTab = Array.from(tabs).find((t) => /claude desktop|stdio/i.test(t.textContent ?? ''));
    await fireEvent.click(stdioTab!);
    const stdioPanel = container.querySelector('[role="tabpanel"]');
    const studioCopyBtn = stdioPanel?.querySelector('button[aria-label*="opy"]') ??
      stdioPanel?.querySelector('button');
    await fireEvent.click(studioCopyBtn!);
    await waitFor(() => expect(mockCopy).toHaveBeenCalled());
    const stdioArg = mockCopy.mock.calls.at(-1)?.[0] as string;
    expect(stdioArg).toContain('CLEARGATE_SERVICE_TOKEN');
    expect(stdioArg).toContain(SECRET_TOKEN);
  });

  // R7: No plaintext leak after close — snippets visible during open, token zeroed after close
  // The storage-leak invariant from STORY-006-05 extends to snippet bodies:
  // snippets render the token during open but the component must NOT write them to storage.
  // This Red test asserts (a) all 3 snippets are visible during open (fails: no tabs yet)
  // and (b) after close the rendered content no longer exposes the token.
  it('R7: all 3 tab panels render the token during open; after close token is absent from DOM', async () => {
    const onclose = vi.fn();
    const { container, getByLabelText } = render(TokenIssuedModal, {
      props: { ...baseProps, onclose },
    });

    // During open: switch through all 3 tabs and confirm each panel shows the token
    const tabs = container.querySelectorAll('[role="tab"]');
    // FAILS: no tabs exist yet (count=0, expect >=3)
    expect(tabs.length).toBeGreaterThanOrEqual(3);

    // HTTP JSON panel: active by default — must show token in snippet
    const jsonPanel = container.querySelector('[role="tabpanel"]');
    expect(jsonPanel?.textContent).toContain(SECRET_TOKEN);

    // curl panel
    const curlTab = Array.from(tabs).find((t) => /curl/i.test(t.textContent ?? ''));
    await fireEvent.click(curlTab!);
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain(SECRET_TOKEN);

    // stdio panel
    const stdioTab = Array.from(tabs).find((t) => /claude desktop|stdio/i.test(t.textContent ?? ''));
    await fireEvent.click(stdioTab!);
    expect(container.querySelector('[role="tabpanel"]')?.textContent).toContain(SECRET_TOKEN);

    // Close: tick checkbox + click Close
    const checkbox = getByLabelText(/i've saved it/i);
    await fireEvent.click(checkbox);
    const closeBtn = Array.from(container.querySelectorAll('button'))
      .find((b) => /^Close$/i.test(b.textContent?.trim() ?? ''));
    await fireEvent.click(closeBtn!);

    // After close: the dialog is gone OR plaintext is zeroed — token absent from DOM
    await waitFor(() => {
      const text = container.textContent ?? '';
      expect(text).not.toContain(SECRET_TOKEN);
    });
  });

  // R8: Footer line contains the npx cleargate init and pending-sync path literals
  it('R8: footer contains "npx cleargate init" and ".cleargate/delivery/pending-sync/"', () => {
    const { container } = render(TokenIssuedModal, { props: baseProps });
    const fullText = container.textContent ?? '';
    expect(fullText).toContain('npx cleargate init');
    expect(fullText).toContain('.cleargate/delivery/pending-sync/');
  });
});
