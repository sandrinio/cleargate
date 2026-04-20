/**
 * Relative time formatter — STORY-006-03
 *
 * Returns human-readable strings: "just now", "N min ago", "N hours ago",
 * "N days ago", or "on YYYY-MM-DD" for anything > 30 days.
 *
 * Pure function; accepts an optional `now` seam for deterministic tests.
 */

/**
 * Format a date as a relative time string.
 * @param date - ISO string or Date object
 * @param now - reference point for computing delta (defaults to Date.now())
 */
export function relative(date: string | Date, now: Date = new Date()): string {
  const then = typeof date === 'string' ? new Date(date) : date;
  const diffMs = now.getTime() - then.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) {
    return 'just now';
  }

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) {
    return `${diffMin} min ago`;
  }

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) {
    return `${diffHr} ${diffHr === 1 ? 'hour' : 'hours'} ago`;
  }

  const diffDays = Math.floor(diffHr / 24);
  if (diffDays <= 30) {
    return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }

  // > 30 days — render calendar date
  const y = then.getFullYear();
  const m = String(then.getMonth() + 1).padStart(2, '0');
  const d = String(then.getDate()).padStart(2, '0');
  return `on ${y}-${m}-${d}`;
}
