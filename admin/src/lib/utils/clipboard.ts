/**
 * clipboard.ts — Clipboard utility — STORY-006-05
 *
 * copyToClipboard(text):
 *   Primary: navigator.clipboard.writeText (requires HTTPS or localhost)
 *   Fallback: hidden textarea + document.execCommand('copy') for insecure contexts
 *
 * Returns true on success, false on failure (does NOT throw).
 *
 * SECURITY NOTE: the plaintext token must NEVER be logged, stored, or spread
 * into any persistent medium. This function only writes to the OS clipboard
 * and does not store the value anywhere.
 */

/**
 * Copy text to the clipboard.
 * Uses navigator.clipboard if available; falls back to textarea execCommand.
 * Returns true on success, false on failure.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  // Primary path: Clipboard API (requires HTTPS or localhost)
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to textarea fallback
    }
  }

  // Fallback path: hidden textarea + execCommand (insecure origins / older browsers)
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    // Move off-screen so it's not visible
    textarea.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0;pointer-events:none;';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
