<script lang="ts">
  import '../app.css';
  import { page } from '$app/stores';
  import { Menu, Settings, Bell, LogOut } from 'lucide-svelte';
  import IconButton from '$lib/components/IconButton.svelte';
  import { signOut } from '$lib/mcp-client.js';

  let { children, data } = $props();

  let mobileMenuOpen = $state(false);
  let avatarMenuOpen = $state(false);

  const session = $derived(data?.session);
  const isAuthenticated = $derived(!!session);

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/projects', label: 'Projects' },
    { href: '/audit', label: 'Audit' },
  ];

  function isActive(href: string): boolean {
    if (href === '/') return $page.url.pathname === '/';
    return $page.url.pathname.startsWith(href);
  }

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }

  function toggleAvatarMenu() {
    avatarMenuOpen = !avatarMenuOpen;
  }

  async function handleSignOut() {
    // Cancel proactive refresh timer
    signOut();

    // POST to logout route (deletes Redis session + clears cookie)
    await fetch('/logout', { method: 'POST' });
    window.location.href = '/login';
  }
</script>

<!-- Top bar — 72px height, canvas background -->
<header class="fixed top-0 left-0 right-0 z-50 h-[72px] bg-base-300 border-b border-[#ECE8E1] flex items-center px-4 gap-4">
  <!-- Logo lockup -->
  <a href="/" class="flex items-center gap-2 flex-shrink-0">
    <div
      class="w-8 h-8 bg-primary rounded-[0.5rem] flex items-center justify-center"
      aria-hidden="true"
    >
      <span class="text-white text-xs font-bold">CG</span>
    </div>
    <span class="font-bold text-base text-base-content">ClearGate</span>
  </a>

  <!-- Center nav — desktop only -->
  <nav class="hidden lg:flex items-center gap-6 flex-1 justify-center" aria-label="Main navigation">
    {#each navLinks as link}
      <a
        href={link.href}
        class="text-sm font-medium transition-colors relative pb-1
          {isActive(link.href)
            ? 'text-base-content underline decoration-primary underline-offset-8 decoration-2'
            : 'text-[#6B7280] hover:text-base-content'}"
      >
        {link.label}
      </a>
    {/each}
  </nav>

  <!-- Right cluster -->
  <div class="ml-auto flex items-center gap-2">
    <!-- Search slot (placeholder) -->
    <div class="hidden md:flex items-center">
      <input
        type="search"
        placeholder="Search..."
        class="rounded-full bg-base-100 border border-[#ECE8E1] px-5 py-2.5 text-sm text-[#6B7280] placeholder:text-[#9CA3AF] focus:outline-none focus:border-primary w-48"
        aria-label="Search"
      />
    </div>

    <!-- Settings icon button -->
    <IconButton aria-label="Settings">
      <Settings size={18} />
    </IconButton>

    <!-- Notifications icon button -->
    <IconButton aria-label="Notifications">
      <Bell size={18} />
    </IconButton>

    <!-- Avatar / user menu -->
    {#if isAuthenticated && session}
      <div class="relative">
        <button
          type="button"
          class="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label="User menu — {session.user.github_handle}"
          aria-expanded={avatarMenuOpen}
          aria-haspopup="true"
          onclick={toggleAvatarMenu}
        >
          {#if session.user.avatar_url}
            <img
              src={session.user.avatar_url}
              alt="{session.user.github_handle}'s avatar"
              class="w-10 h-10 rounded-full object-cover"
            />
          {:else}
            <div class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <span class="text-sm font-semibold text-primary">
                {session.user.github_handle.slice(0, 1).toUpperCase()}
              </span>
            </div>
          {/if}
        </button>

        <!-- Avatar dropdown -->
        {#if avatarMenuOpen}
          <!-- Backdrop -->
          <div
            class="fixed inset-0 z-40"
            onclick={toggleAvatarMenu}
            onkeydown={(e) => e.key === 'Escape' && toggleAvatarMenu()}
            role="button"
            tabindex="-1"
            aria-label="Close user menu"
          ></div>

          <!-- Menu panel -->
          <div
            class="absolute right-0 top-12 z-50 w-56 bg-base-100 rounded-2xl shadow-card border border-[#ECE8E1] p-2"
            role="menu"
          >
            <!-- User info -->
            <div class="px-3 py-2 mb-1">
              <p class="text-sm font-medium text-base-content">@{session.user.github_handle}</p>
              {#if session.user.email}
                <p class="text-xs text-[#6B7280] truncate">{session.user.email}</p>
              {/if}
            </div>
            <div class="border-t border-[#ECE8E1] my-1"></div>

            <!-- Sign out -->
            <button
              type="button"
              class="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[#6B7280] hover:bg-base-200 hover:text-base-content transition-colors"
              role="menuitem"
              onclick={handleSignOut}
            >
              <LogOut size={16} aria-hidden="true" />
              Sign out
            </button>
          </div>
        {/if}
      </div>
    {:else}
      <!-- Unauthenticated avatar placeholder -->
      <div
        class="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"
        aria-label="User menu"
      >
        <span class="text-sm font-semibold text-primary">U</span>
      </div>
    {/if}

    <!-- Mobile menu button -->
    <div class="lg:hidden">
      <IconButton aria-label="Open navigation menu" onclick={toggleMobileMenu}>
        <Menu size={18} />
      </IconButton>
    </div>
  </div>
</header>

<!-- Mobile nav drawer -->
{#if mobileMenuOpen}
  <div
    class="fixed inset-0 z-40 lg:hidden"
    role="dialog"
    aria-modal="true"
    aria-label="Navigation menu"
  >
    <!-- Backdrop -->
    <div
      class="absolute inset-0 bg-[rgb(26_31_46_/_0.32)] backdrop-blur-sm"
      onclick={toggleMobileMenu}
      onkeydown={(e) => e.key === 'Escape' && toggleMobileMenu()}
      role="button"
      tabindex="-1"
      aria-label="Close navigation menu"
    ></div>

    <!-- Drawer panel -->
    <nav
      class="absolute top-[72px] left-0 right-0 bg-base-100 border-b border-[#ECE8E1] p-4 flex flex-col gap-2"
      aria-label="Mobile navigation"
    >
      {#each navLinks as link}
        <a
          href={link.href}
          onclick={toggleMobileMenu}
          class="text-sm font-medium px-4 py-3 rounded-xl transition-colors
            {isActive(link.href)
              ? 'bg-primary/10 text-primary'
              : 'text-[#6B7280] hover:bg-base-200 hover:text-base-content'}"
        >
          {link.label}
        </a>
      {/each}
    </nav>
  </div>
{/if}

<!-- Page layout: sidebar + main -->
<div class="flex pt-[72px] min-h-screen">
  <!-- Desktop sidebar -->
  <aside class="hidden lg:flex flex-col w-[240px] fixed top-[72px] left-4 bottom-4 z-30">
    <div class="flex-1 bg-base-100 shadow-card rounded-3xl p-4 flex flex-col gap-1 overflow-y-auto">
      <!-- Project switcher placeholder -->
      <div class="px-3 py-2 mb-2">
        <p class="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wide">Project</p>
        <p class="text-sm font-medium text-base-content mt-1">ClearGate</p>
      </div>

      <div class="border-t border-[#ECE8E1] my-2"></div>

      <!-- Nav stubs -->
      {#each navLinks as link}
        <a
          href={link.href}
          class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
            {isActive(link.href)
              ? 'bg-[#FBE4D9] text-primary'
              : 'text-[#6B7280] hover:bg-base-200 hover:text-base-content'}"
        >
          {link.label}
        </a>
      {/each}
    </div>
  </aside>

  <!-- Main content canvas -->
  <main class="flex-1 lg:ml-[256px] bg-base-300 min-h-full p-6">
    <div class="max-w-[1440px] mx-auto">
      {@render children()}
    </div>
  </main>
</div>
