<script lang="ts">
  /**
   * AdminUsersTable — STORY-006-09
   *
   * Renders the admin_users table per Design Guide §6.7.
   * Columns: Avatar + Handle | Role | Status | Added at | Actions
   *
   * Props:
   *   users: AdminUser[]          — list of admin users
   *   currentUserId: string|null  — calling admin's id (for self-protection)
   *   ontoggleroot                — callback to toggle is_root
   *   ondisable                   — callback to soft-disable
   *   onenable                    — callback to re-enable
   */
  import type { AdminUser } from 'cleargate/admin-api';
  import StatusPill from './StatusPill.svelte';
  import ConfirmDialog from './ConfirmDialog.svelte';
  import { formatTimestamp } from '$lib/utils/format-timestamp.js';

  interface Props {
    users: AdminUser[];
    currentUserId: string | null;
    ontoggleroot: (user: AdminUser) => Promise<void>;
    ondisable: (user: AdminUser) => Promise<void>;
    onenable: (user: AdminUser) => Promise<void>;
  }

  let { users, currentUserId, ontoggleroot, ondisable, onenable }: Props = $props();

  // Confirm dialog state
  let confirmOpen = $state(false);
  let confirmTitle = $state('');
  let confirmMessage = $state('');
  let confirmVariant: 'default' | 'danger' = $state('default');
  let confirmAction: (() => void) | null = $state(null);

  function openConfirm(title: string, message: string, variant: 'default' | 'danger', action: () => void) {
    confirmTitle = title;
    confirmMessage = message;
    confirmVariant = variant;
    confirmAction = action;
    confirmOpen = true;
  }

  function handleConfirm() {
    confirmAction?.();
  }

  function isSelf(user: AdminUser): boolean {
    return user.id === currentUserId;
  }

  function isDisabled(user: AdminUser): boolean {
    return user.disabled_at !== null;
  }

  function getAvatarUrl(user: AdminUser): string | null {
    if (!user.github_user_id) return null;
    return `https://avatars.githubusercontent.com/u/${user.github_user_id}?size=32`;
  }
</script>

<!--
  Design Guide §6.7: table
  - no outer border
  - border-b border-[#ECE8E1] row dividers
  - 56px row height
  - actions in last column
-->
<div class="bg-base-100 rounded-3xl shadow-card overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-[#ECE8E1]">
        <th class="px-4 py-3 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
          Handle
        </th>
        <th class="px-4 py-3 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
          Role
        </th>
        <th class="px-4 py-3 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
          Status
        </th>
        <th class="px-4 py-3 text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
          Added at
        </th>
        <th class="px-4 py-3 text-right text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">
          Actions
        </th>
      </tr>
    </thead>
    <tbody>
      {#each users as user (user.id)}
        <tr class="border-b border-[#ECE8E1] last:border-b-0" style="height: 56px;" data-testid="admin-row">
          <!-- Avatar + Handle -->
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              {#if getAvatarUrl(user)}
                <img
                  src={getAvatarUrl(user)!}
                  alt="{user.github_handle}'s avatar"
                  class="w-8 h-8 rounded-full object-cover"
                  loading="lazy"
                />
              {:else}
                <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span class="text-xs font-semibold text-primary">
                    {user.github_handle.slice(0, 1).toUpperCase()}
                  </span>
                </div>
              {/if}
              <span class="font-medium text-base-content">
                @{user.github_handle}
                {#if isSelf(user)}
                  <span class="text-xs text-[#9CA3AF] ml-1">(you)</span>
                {/if}
              </span>
            </div>
          </td>

          <!-- Role pill -->
          <td class="px-4 py-3">
            {#if user.is_root}
              <span class="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-primary/10 text-primary">
                Root
              </span>
            {:else}
              <span class="rounded-full text-xs font-semibold px-2.5 py-0.5 bg-base-200 text-[#6B7280]">
                Admin
              </span>
            {/if}
          </td>

          <!-- Status pill -->
          <td class="px-4 py-3">
            {#if isDisabled(user)}
              <StatusPill status="revoked" label="Disabled" />
            {:else}
              <StatusPill status="active" label="Active" />
            {/if}
          </td>

          <!-- Added at -->
          <td class="px-4 py-3 text-[#6B7280]">
            {formatTimestamp(user.created_at)}
          </td>

          <!-- Actions -->
          <td class="px-4 py-3">
            <div class="flex items-center justify-end gap-2">
              {#if isSelf(user)}
                <!-- Self — all actions disabled -->
                <span
                  class="text-xs text-[#9CA3AF] cursor-not-allowed"
                  title="You can't modify your own admin row"
                >
                  No actions
                </span>
              {:else if isDisabled(user)}
                <!-- Re-enable button -->
                <button
                  type="button"
                  class="btn btn-xs btn-ghost rounded-full"
                  onclick={() => openConfirm(
                    `Re-enable @${user.github_handle}`,
                    `Allow @${user.github_handle} to log in again?`,
                    'default',
                    () => onenable(user)
                  )}
                  data-testid="enable-btn"
                >
                  Enable
                </button>
              {:else}
                <!-- Toggle root -->
                <button
                  type="button"
                  class="btn btn-xs btn-ghost rounded-full"
                  onclick={() => openConfirm(
                    user.is_root ? `Revoke root from @${user.github_handle}` : `Grant root to @${user.github_handle}`,
                    user.is_root
                      ? `Revoke root privileges from @${user.github_handle}?`
                      : `Grant root privileges to @${user.github_handle}?`,
                    'default',
                    () => ontoggleroot(user)
                  )}
                  data-testid="toggle-root-btn"
                >
                  {user.is_root ? 'Revoke root' : 'Grant root'}
                </button>

                <!-- Disable button -->
                <button
                  type="button"
                  class="btn btn-xs btn-error btn-outline rounded-full"
                  onclick={() => openConfirm(
                    `Disable @${user.github_handle}`,
                    `Prevent @${user.github_handle} from logging in?`,
                    'danger',
                    () => ondisable(user)
                  )}
                  data-testid="disable-btn"
                >
                  Disable
                </button>
              {/if}
            </div>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<!-- Confirm dialog -->
<ConfirmDialog
  open={confirmOpen}
  onclose={() => { confirmOpen = false; }}
  onconfirm={handleConfirm}
  title={confirmTitle}
  message={confirmMessage}
  confirmVariant={confirmVariant}
/>
