<script lang="ts">
  /**
   * Settings — STORY-006-09
   *
   * Root-only admin user management page.
   * Client-side fetching via mcp-client.ts (no +page.server.ts per M5 decision).
   *
   * If is_root is false → renders 403 banner.
   * If is_root is true → renders AdminUsersTable + AddAdminModal.
   */
  import { onMount } from 'svelte';
  import {
    AdminUsersListResponseSchema,
    AdminUserSchema,
    UsersMeResponseSchema,
  } from 'cleargate/admin-api';
  import type { AdminUser } from 'cleargate/admin-api';
  import { get, post, patch, del } from '$lib/mcp-client.js';
  import { toastStore } from '$lib/stores/toast.svelte.js';
  import { setCurrentUser } from '$lib/stores/current-user.js';
  import AdminUsersTable from '$lib/components/AdminUsersTable.svelte';
  import AddAdminModal from '$lib/components/AddAdminModal.svelte';
  import EmptyState from '$lib/components/EmptyState.svelte';
  import { UserCog } from 'lucide-svelte';

  type LoadState = 'loading' | 'loaded' | 'forbidden' | 'error';

  let loadState: LoadState = $state('loading');
  let adminUsers: AdminUser[] = $state([]);
  let showAddModal = $state(false);
  let currentUserId: string | null = $state(null);

  async function load() {
    loadState = 'loading';
    try {
      // First: get own profile to determine is_root
      const me = await get('/users/me', UsersMeResponseSchema);
      setCurrentUser({ id: me.id, github_handle: me.github_handle, is_root: me.is_root });
      currentUserId = me.id;

      if (!me.is_root) {
        loadState = 'forbidden';
        return;
      }

      // Load admin users list
      const data = await get('/admin-users', AdminUsersListResponseSchema);
      adminUsers = data.admin_users;
      loadState = 'loaded';
    } catch (err: unknown) {
      const e = err as { message?: string };
      toastStore.error(e.message ?? 'Failed to load settings');
      loadState = 'error';
    }
  }

  onMount(() => {
    load();
  });

  async function handleAddAdmin(github_handle: string, is_root: boolean) {
    try {
      const newUser = await post('/admin-users', { github_handle, is_root }, AdminUserSchema);
      adminUsers = [...adminUsers, newUser];
      toastStore.success(`Added @${github_handle} as admin`);
      showAddModal = false;
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 409) {
        throw new Error('Already an admin');
      } else if (e.status === 422) {
        throw new Error('GitHub user not found');
      } else {
        throw err;
      }
    }
  }

  async function handleToggleRoot(user: AdminUser) {
    try {
      const updated = await patch(
        `/admin-users/${user.id}`,
        { is_root: !user.is_root },
        AdminUserSchema,
      );
      adminUsers = adminUsers.map((u) => (u.id === updated.id ? updated : u));
      toastStore.success(
        updated.is_root ? `Granted root to @${user.github_handle}` : `Revoked root from @${user.github_handle}`
      );
    } catch (err: unknown) {
      const e = err as { message?: string };
      toastStore.error(e.message ?? 'Failed to update admin');
    }
  }

  async function handleDisable(user: AdminUser) {
    try {
      await del(`/admin-users/${user.id}`);
      // Refresh to get updated disabled_at
      const data = await get('/admin-users', AdminUsersListResponseSchema);
      adminUsers = data.admin_users;
      toastStore.success(`Disabled @${user.github_handle}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toastStore.error(e.message ?? 'Failed to disable admin');
    }
  }

  async function handleEnable(user: AdminUser) {
    try {
      const updated = await patch(
        `/admin-users/${user.id}`,
        { disabled_at: null },
        AdminUserSchema,
      );
      adminUsers = adminUsers.map((u) => (u.id === updated.id ? updated : u));
      toastStore.success(`Re-enabled @${user.github_handle}`);
    } catch (err: unknown) {
      const e = err as { message?: string };
      toastStore.error(e.message ?? 'Failed to enable admin');
    }
  }
</script>

<!-- Page header -->
<div class="mb-6 flex items-center justify-between">
  <div>
    <h1 class="text-2xl font-bold text-base-content">Settings</h1>
    <p class="text-sm text-[#6B7280] mt-1">Manage admin users</p>
  </div>
  {#if loadState === 'loaded'}
    <button
      type="button"
      class="btn btn-primary rounded-full"
      onclick={() => { showAddModal = true; }}
    >
      Add admin
    </button>
  {/if}
</div>

{#if loadState === 'loading'}
  <!-- Loading skeleton -->
  <div class="bg-base-100 rounded-3xl shadow-card p-6">
    <div class="animate-pulse space-y-4">
      <div class="h-4 bg-base-200 rounded w-1/4"></div>
      <div class="h-10 bg-base-200 rounded"></div>
      <div class="h-10 bg-base-200 rounded"></div>
    </div>
  </div>

{:else if loadState === 'forbidden'}
  <!-- 403 — Root admin required -->
  <div
    class="bg-base-100 rounded-3xl shadow-card p-8 text-center"
    role="alert"
    aria-label="Root admin required"
    data-testid="forbidden-banner"
  >
    <div class="flex flex-col items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-error/10 flex items-center justify-center">
        <UserCog size={32} class="text-error" aria-hidden="true" />
      </div>
      <h2 class="text-xl font-semibold text-base-content">Root admin required</h2>
      <p class="text-sm text-[#6B7280] max-w-sm">
        Only root admins can access Settings. Contact your root admin to get access.
      </p>
      <a href="/" class="btn btn-ghost rounded-full">Go to Dashboard</a>
    </div>
  </div>

{:else if loadState === 'error'}
  <!-- Error state -->
  <div class="bg-base-100 rounded-3xl shadow-card p-6">
    <EmptyState
      headline="Failed to load settings"
      supporting="Check your connection and try again."
    />
    <div class="flex justify-center mt-4">
      <button type="button" class="btn btn-primary rounded-full" onclick={load}>
        Retry
      </button>
    </div>
  </div>

{:else if loadState === 'loaded'}
  <!-- Admin users table -->
  <AdminUsersTable
    users={adminUsers}
    {currentUserId}
    ontoggleroot={handleToggleRoot}
    ondisable={handleDisable}
    onenable={handleEnable}
  />

  {#if adminUsers.length === 0}
    <EmptyState
      headline="No admins yet — something is wrong"
      supporting="The admin_users table is empty. Contact engineering."
    />
  {/if}
{/if}

<!-- Add admin modal -->
<AddAdminModal
  open={showAddModal}
  onclose={() => { showAddModal = false; }}
  onadd={handleAddAdmin}
/>
