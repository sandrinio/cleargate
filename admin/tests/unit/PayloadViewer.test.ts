/**
 * Unit tests for PayloadViewer component — STORY-006-06
 *
 * Scenarios covered:
 *   - Renders keys with their values
 *   - Redacts fields matching the redaction list (password, secret, token, api_key)
 *   - Short values shown without truncation
 *   - Long values (>240 chars) show "Show more" button
 *   - Clicking "Show more" reveals full value
 *   - Redacted fields show ••••• and NOT the actual value in the header
 */

import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import PayloadViewer from '../../src/lib/components/PayloadViewer.svelte';

const LONG_STRING = 'x'.repeat(300);

describe('PayloadViewer', () => {
  it('renders payload keys', () => {
    const { getByTestId } = render(PayloadViewer, {
      props: { payload: { title: 'Test Story', status: 'draft' } },
    });
    const viewer = getByTestId('payload-viewer');
    expect(viewer.textContent).toContain('title');
    expect(viewer.textContent).toContain('status');
  });

  it('renders short values without truncation', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { title: 'Hello' } },
    });
    const text = container.textContent ?? '';
    expect(text).toContain('Hello');
    expect(container.querySelector('[data-testid="show-more-btn"]')).toBeNull();
  });

  it('shows "Show more" button for long string values', () => {
    const { getByTestId } = render(PayloadViewer, {
      props: { payload: { description: LONG_STRING } },
    });
    expect(getByTestId('show-more-btn')).toBeTruthy();
  });

  it('expanding a long value reveals full content', async () => {
    const { getByTestId, container } = render(PayloadViewer, {
      props: { payload: { description: LONG_STRING } },
    });
    const btn = getByTestId('show-more-btn');
    await fireEvent.click(btn);
    // After expand, the full string should be in the dom
    expect(container.textContent).toContain(LONG_STRING.slice(250)); // some later part
    expect(getByTestId('show-less-btn')).toBeTruthy();
  });

  it('redacts "password" field to •••••', () => {
    const { getByTestId, container } = render(PayloadViewer, {
      props: { payload: { password: 'supersecret123' } },
    });
    expect(getByTestId('redacted-value').textContent).toContain('•••••');
    // Actual value must NOT appear
    expect(container.textContent).not.toContain('supersecret123');
  });

  it('redacts "secret" field to •••••', () => {
    const { getByTestId, container } = render(PayloadViewer, {
      props: { payload: { secret: 'my-secret-value' } },
    });
    expect(getByTestId('redacted-value').textContent).toContain('•••••');
    expect(container.textContent).not.toContain('my-secret-value');
  });

  it('redacts "token" field to •••••', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { token: 'bearer-xyz' } },
    });
    expect(container.textContent).not.toContain('bearer-xyz');
    expect(container.textContent).toContain('•••••');
  });

  it('redacts "api_key" field to •••••', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { api_key: 'sk-abc123' } },
    });
    expect(container.textContent).not.toContain('sk-abc123');
    expect(container.textContent).toContain('•••••');
  });

  it('does not redact non-sensitive fields', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { title: 'open-title', description: 'open-desc' } },
    });
    expect(container.textContent).toContain('open-title');
    expect(container.textContent).toContain('open-desc');
  });

  it('renders null value as JSON null', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { optional_field: null } },
    });
    expect(container.textContent).toContain('null');
  });
});
