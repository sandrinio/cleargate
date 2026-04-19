/**
 * conflict-detector.ts — STORY-010-03
 *
 * Pure classifier for local-vs-remote sync conflicts.
 * Implements the 8-state PROP-007 §2.3 matrix + explicit 9th "unknown" fallthrough.
 *
 * No I/O. No imports from node:fs, node:child_process, node:os.
 * No imports from commands/ or bin/.
 */

// ─── Public types ─────────────────────────────────────────────────────────────

export type ConflictState =
  | 'no-change'
  | 'local-only'              // local content edit, no remote change
  | 'remote-only'             // remote status/metadata change, local untouched
  | 'content-content'         // both bodies diverged since last sync
  | 'content-status'          // local body + remote status
  | 'status-status'           // both statuses diverged
  | 'local-delete-remote-edit'
  | 'remote-delete-local-edit'
  | 'unknown';                // R3: explicit fallthrough — never silently wrong

export type Resolution =
  | 'push'
  | 'pull'
  | 'merge'           // three-way merge prompt
  | 'merge-silent'    // content+status: no prompt, apply both sides
  | 'remote-wins'     // status+status: silent remote takes, log conflict-remote-wins
  | 'refuse'          // halt, surface to human
  | 'halt';           // unknown state — halt sync with explicit message

export interface LocalSnapshot {
  updated_at: string;
  body_sha: string;
  status: string;
  deleted: boolean;
}

export interface RemoteSnapshot {
  updated_at: string;
  body_sha: string;
  status: string;
  deleted: boolean;
}

export interface SinceLastSync {
  last_pushed_at: string | null;
  last_pulled_at: string | null;
  last_remote_update: string | null;   // ISO-8601 string or null; opaque per M1 lock
  last_body_sha: string | null;        // sha at last successful sync (merge-base)
  last_synced_status: string | null;   // status recorded at last successful sync (rule 6)
}

export interface Classification {
  state: ConflictState;
  resolution: Resolution;
  reason: string;  // human-readable; used for sync-log detail + halt messages
}

// ─── Classifier ───────────────────────────────────────────────────────────────

/**
 * classify — pure function; maps a (local, remote, since) triple to a Classification.
 *
 * Decision table follows PROP-007 §2.3 + M2 plan "8-state + 9th fallthrough" exactly.
 * States are evaluated in priority order; first match wins.
 */
export function classify(
  local: LocalSnapshot,
  remote: RemoteSnapshot,
  since: SinceLastSync,
): Classification {
  const baseSha = since.last_body_sha ?? '';
  const lastPulled = since.last_pulled_at ?? '0';
  const lastPushed = since.last_pushed_at ?? '0';

  // Rule 7 — local-delete-remote-edit (check deletes first — highest priority)
  if (local.deleted && remote.updated_at > lastPulled) {
    return {
      state: 'local-delete-remote-edit',
      resolution: 'refuse',
      reason: 'local deletion conflicts with remote edit',
    };
  }

  // Rule 8 — remote-delete-local-edit
  if (remote.deleted && local.updated_at > lastPushed) {
    return {
      state: 'remote-delete-local-edit',
      resolution: 'refuse',
      reason: 'remote deletion conflicts with local edit',
    };
  }

  // Rule 1 — no-change: bodies and status are identical at sync base; nothing deleted
  if (
    local.body_sha === baseSha &&
    remote.body_sha === baseSha &&
    local.status === remote.status &&
    !local.deleted &&
    !remote.deleted
  ) {
    return {
      state: 'no-change',
      resolution: 'pull',
      reason: 'no change since last sync',
    };
  }

  // Rule 4 — content-content: both bodies diverged
  if (
    local.body_sha !== baseSha &&
    remote.body_sha !== baseSha &&
    !local.deleted &&
    !remote.deleted
  ) {
    return {
      state: 'content-content',
      resolution: 'merge',
      reason: 'both bodies diverged — three-way merge required',
    };
  }

  // Rule 5 — content-status: local body changed + remote status changed, bodies otherwise aligned
  if (
    local.body_sha !== baseSha &&
    remote.body_sha === baseSha &&
    remote.status !== local.status
  ) {
    return {
      state: 'content-status',
      resolution: 'merge-silent',
      reason: 'local body edit + remote status change — merged without prompt',
    };
  }

  // Rule 2 — local-only: local content edited, remote unchanged, same status
  if (
    local.body_sha !== baseSha &&
    remote.body_sha === baseSha &&
    remote.status === local.status &&
    !remote.deleted
  ) {
    return {
      state: 'local-only',
      resolution: 'push',
      reason: 'local content edit only',
    };
  }

  // Rule 6 — status-status: both sides changed status since last sync
  // Requires since.last_synced_status to distinguish from remote-only.
  if (
    local.body_sha === baseSha &&
    remote.body_sha === baseSha &&
    local.status !== remote.status &&
    since.last_synced_status !== null &&
    local.status !== since.last_synced_status &&
    remote.status !== since.last_synced_status
  ) {
    return {
      state: 'status-status',
      resolution: 'remote-wins',
      reason: 'status diverged on both sides; remote authoritative',
    };
  }

  // Rule 3 — remote-only: local body unchanged, remote status or metadata changed
  if (
    local.body_sha === baseSha &&
    (remote.status !== local.status || remote.updated_at > lastPulled)
  ) {
    return {
      state: 'remote-only',
      resolution: 'pull',
      reason: 'remote status/metadata change only',
    };
  }

  // Rule 9 — unknown fallthrough (R3): explicitly refuse to guess
  return {
    state: 'unknown',
    resolution: 'halt',
    reason:
      'conflict shape not recognized — please resolve manually and file a ClearGate bug with this sync-log entry',
  };
}
