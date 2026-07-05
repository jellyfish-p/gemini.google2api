<template>
  <main class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100/60 text-slate-900">
    <section v-if="!authenticated" class="relative flex min-h-screen items-center justify-center px-4 py-10">
      <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -left-40 -top-40 h-80 w-80 rounded-full bg-primary-100/40 blur-3xl" />
        <div class="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-primary-100/30 blur-3xl" />
      </div>
      <UCard class="relative w-full max-w-md shadow-xl shadow-slate-200/60 ring-1 ring-slate-200/50">
        <template #header>
          <div class="space-y-1">
            <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 shadow-sm ring-1 ring-white/20">
              <UIcon name="i-lucide-shield-check" class="size-6 text-white" />
            </div>
            <h1 class="pt-4 text-xl font-semibold text-slate-900">{{ t('admin.title') }}</h1>
            <p class="text-sm text-slate-500">{{ t('admin.signInDescription') }}</p>
          </div>
        </template>
        <form class="space-y-4" @submit.prevent="doLogin">
          <UFormField :label="t('admin.password')" required>
            <UInput
              v-model="password"
              type="password"
              size="lg"
              icon="i-lucide-lock-keyhole"
              :placeholder="t('admin.passwordPlaceholder')"
              autocomplete="current-password"
            />
          </UFormField>
          <UAlert
            v-if="error"
            color="error"
            variant="soft"
            icon="i-lucide-circle-alert"
            :description="error"
          />
          <UButton type="submit" block size="lg" icon="i-lucide-log-in" :loading="loading">
            {{ t('common.login') }}
          </UButton>
        </form>
      </UCard>
    </section>

    <section v-else class="flex h-screen overflow-hidden">
      <transition name="fade">
        <div
          v-if="mobileSidebarOpen"
          class="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          @click="mobileSidebarOpen = false"
        />
      </transition>

      <transition name="slide">
        <aside
          v-show="mobileSidebarOpen || true"
          class="fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white lg:static lg:flex"
          :class="mobileSidebarOpen ? 'flex' : 'hidden lg:flex'"
        >
          <div class="bg-gradient-to-br from-primary-600 via-primary-600 to-primary-500 px-5 py-5">
            <NuxtLink to="/admin" class="flex items-center gap-3">
              <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-white backdrop-blur-sm ring-1 ring-white/20">
                <UIcon name="i-lucide-gem" class="size-5" />
              </div>
              <div>
                <div class="text-sm font-semibold text-white">{{ t('admin.brand') }}</div>
                <div class="text-xs text-primary-200">{{ t('admin.brandSubtitle') }}</div>
              </div>
            </NuxtLink>
          </div>

          <nav class="flex-1 overflow-y-auto px-2 py-4">
            <div class="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{{ t('admin.quickJump') }}</div>
            <NuxtLink
              v-for="item in navItems"
              :key="item.to"
              :to="item.to"
              class="group mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150"
              :class="isActive(item.to)
                ? 'bg-primary-50 text-primary-700 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'"
              :aria-current="isActive(item.to) ? 'page' : undefined"
              @click="mobileSidebarOpen = false"
            >
              <div
                class="flex h-8 w-8 items-center justify-center rounded-md transition-all duration-150"
                :class="isActive(item.to)
                  ? 'bg-primary-100 text-primary-600 shadow-sm'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'"
              >
                <UIcon :name="item.icon" class="size-4" />
              </div>
              <span>{{ item.label }}</span>
            </NuxtLink>
          </nav>

          <div class="border-t border-slate-100 p-3">
            <div class="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div class="mb-2.5 flex items-center gap-2">
                <div class="h-2 w-2 rounded-full" :class="poolOnline ? 'bg-green-500 shadow-sm shadow-green-200' : 'bg-red-400'" />
                <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">{{ t('admin.poolStatus') }}</span>
              </div>
              <div class="flex items-center justify-between text-sm">
                <span class="text-slate-500">{{ t('admin.accounts') }}</span>
                <span class="font-semibold tabular-nums">{{ stats.activeAccounts }}<span class="text-slate-400 font-normal"> / {{ stats.totalAccounts }}</span></span>
              </div>
              <UButton color="neutral" variant="soft" icon="i-lucide-log-out" block size="sm" class="mt-3" @click="doLogout">
                {{ t('common.logout') }}
              </UButton>
            </div>
          </div>
        </aside>
      </transition>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="sticky top-0 z-30 border-b border-slate-200/80 bg-white/75 px-4 py-3 backdrop-blur-xl lg:px-8">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <UButton color="neutral" variant="ghost" icon="i-lucide-menu" class="lg:hidden" @click="mobileSidebarOpen = true" />
              <div class="hidden items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 md:flex">
                <UIcon name="i-lucide-layout-dashboard" class="size-3.5" />
                {{ t('admin.console') }}
              </div>
              <div class="hidden h-4 w-px bg-slate-200 md:block" />
              <h2 class="text-lg font-semibold text-slate-900 md:text-xl">{{ currentNavLabel }}</h2>
            </div>

            <div class="flex items-center gap-2">
              <div class="flex gap-1 overflow-x-auto md:hidden">
                <UButton
                  v-for="item in navItems"
                  :key="item.to"
                  size="sm"
                  :to="item.to"
                  :variant="isActive(item.to) ? 'solid' : 'ghost'"
                  :color="isActive(item.to) ? 'primary' : 'neutral'"
                  :icon="item.icon"
                  class="!px-2"
                />
              </div>
              <USelect
                v-model="locale"
                :items="localeItems"
                class="w-28 shrink-0"
                :aria-label="t('admin.language')"
                @update:model-value="setLocale"
              />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-refresh-cw"
                size="sm"
                @click="refreshCurrent"
              >
                {{ t('common.refresh') }}
              </UButton>
            </div>
          </div>
        </header>

        <div class="flex-1 overflow-y-auto px-4 py-6 lg:px-8">
          <div class="mx-auto max-w-7xl">
            <slot />
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
type AdminNavItem = {
  label: string
  to: string
  icon: string
}

const route = useRoute()
const { t, locale, locales, setLocale } = useI18n()
const {
  password,
  loading,
  error,
  authenticated,
  initialized,
  stats,
  checkSession,
  doLogin,
  doLogout,
  loadData,
  loadSettings,
} = useAdminState()

const mobileSidebarOpen = ref(false)
const refreshing = ref(false)

const navItems = computed<AdminNavItem[]>(() => [
  { label: t('admin.nav.overview'), to: '/admin', icon: 'i-lucide-house' },
  { label: t('admin.nav.settings'), to: '/admin/settings', icon: 'i-lucide-settings-2' },
  { label: t('admin.nav.keys'), to: '/admin/keys', icon: 'i-lucide-key-round' },
  { label: t('admin.nav.accounts'), to: '/admin/accounts', icon: 'i-lucide-users' },
  { label: t('admin.nav.logs'), to: '/admin/logs', icon: 'i-lucide-scroll-text' },
])

const localeItems = computed(() => locales.value.map((item) => ({
  label: typeof item === 'string' ? item : item.name || item.code,
  value: typeof item === 'string' ? item : item.code,
})))

const currentNavLabel = computed(() => navItems.value.find((item) => isActive(item.to))?.label || t('admin.nav.overview'))

const poolOnline = computed(() => stats.value.activeAccounts > 0)

function isActive(to: string): boolean {
  if (to === '/admin') return route.path === '/admin'
  return route.path === to || route.path.startsWith(`${to}/`)
}

async function refreshCurrent() {
  refreshing.value = true
  try {
    if (route.path === '/admin/settings') {
      await loadSettings()
    } else {
      await loadData()
    }
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  if (!initialized.value) checkSession()
})
</script>
