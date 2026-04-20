/**
 * clipboard.ts unit tests — STORY-006-05
 *
 * Tests:
 *   1. copyToClipboard happy path via navigator.clipboard
 *   2. copyToClipboard fallback via document.execCommand when navigator.clipboard unavailable
 *   3. copyToClipboard failure path — returns false when both paths fail
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard } from '../../src/lib/utils/clipboard.js';

describe('copyToClipboard', () => {
  let originalNavigator: typeof navigator;
  let originalDocument: typeof document;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    originalDocument = globalThis.document;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('happy path: uses navigator.clipboard.writeText when available', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    const result = await copyToClipboard('secret-token');

    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith('secret-token');
    expect(result).toBe(true);
  });

  it('fallback path: uses document.execCommand when navigator.clipboard is absent', async () => {
    // Remove navigator.clipboard
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    // jsdom does not implement document.execCommand — define it
    const execCommand = vi.fn().mockReturnValue(true);
    Object.defineProperty(document, 'execCommand', {
      value: execCommand,
      writable: true,
      configurable: true,
    });

    const createElementSpy = vi.spyOn(document, 'createElement');
    const appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    const removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    // Create a textarea-like mock
    const fakeTextarea = {
      value: '',
      style: { cssText: '' },
      focus: vi.fn(),
      select: vi.fn(),
    } as unknown as HTMLTextAreaElement;

    createElementSpy.mockReturnValue(fakeTextarea);

    const result = await copyToClipboard('fallback-token');

    expect(appendChildSpy).toHaveBeenCalled();
    expect(fakeTextarea.value).toBe('fallback-token');
    expect(fakeTextarea.select).toHaveBeenCalled();
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(removeChildSpy).toHaveBeenCalled();
    expect(result).toBe(true);
  });

  it('failure path: returns false when navigator.clipboard.writeText throws and execCommand is unavailable', async () => {
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: { writeText } },
      writable: true,
      configurable: true,
    });

    // Also make execCommand throw
    vi.spyOn(document, 'createElement').mockImplementation(() => {
      throw new Error('DOM not available');
    });

    const result = await copyToClipboard('token');
    expect(result).toBe(false);
  });

  it('fallback path: returns false when execCommand returns false', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    // jsdom does not implement document.execCommand — define it returning false
    Object.defineProperty(document, 'execCommand', {
      value: vi.fn().mockReturnValue(false),
      writable: true,
      configurable: true,
    });

    const fakeTextarea = {
      value: '',
      style: { cssText: '' },
      focus: vi.fn(),
      select: vi.fn(),
    } as unknown as HTMLTextAreaElement;

    vi.spyOn(document, 'createElement').mockReturnValue(fakeTextarea);
    vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el);
    vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el);

    const result = await copyToClipboard('token');
    expect(result).toBe(false);
  });
});
