<template>
  <div class="space-y-6">
    <section class="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
      <UCard class="shadow-sm ring-1 ring-slate-200/50">
        <template #header>
          <div class="flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-slate-900">{{ t('overview.title') }}</h3>
              <p class="mt-1 text-sm text-slate-500">{{ t('overview.description') }}</p>
            </div>
            <UBadge color="primary" variant="soft" class="shrink-0">{{ t('overview.badge') }}</UBadge>
          </div>
        </template>

        <div class="grid gap-4 text-sm text-slate-600 md:grid-cols-2">
          <div class="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 transition hover:border-slate-300 hover:shadow-sm">
            <div class="mb-2 flex items-center gap-2 font-medium text-slate-900">
              <div class="flex h-7 w-7 items-center justify-center rounded-md bg-amber-50 text-amber-600">
                <UIcon name="i-lucide-key-round" class="size-3.5" />
              </div>
              {{ t('overview.configKeysTitle') }}
            </div>
            <p class="leading-relaxed">{{ t('overview.configKeysDescription') }}</p>
          </div>
          <div class="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 transition hover:border-slate-300 hover:shadow-sm">
            <div class="mb-2 flex items-center gap-2 font-medium text-slate-900">
              <div class="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                <UIcon name="i-lucide-database" class="size-3.5" />
              </div>
              {{ t('overview.sqliteTitle') }}
            </div>
            <p class="leading-relaxed">{{ t('overview.sqliteDescription') }}</p>
          </div>
        </div>
      </UCard>

      <UCard class="shadow-sm ring-1 ring-slate-200/50">
        <template #header>
          <h3 class="font-semibold text-slate-900">{{ t('overview.quickActions') }}</h3>
        </template>

        <div class="grid gap-2.5">
          <UButton to="/admin/keys" icon="i-lucide-plus" class="justify-start" block>
            {{ t('overview.manageKeys') }}
          </UButton>
          <UButton to="/admin/accounts" icon="i-lucide-user-plus" color="neutral" variant="soft" class="justify-start" block>
            {{ t('overview.manageAccounts') }}
          </UButton>
          <UButton to="/admin/settings" icon="i-lucide-settings-2" color="neutral" variant="soft" class="justify-start" block>
            {{ t('overview.openSettings') }}
          </UButton>
        </div>
      </UCard>
    </section>

    <div class="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <UCard
        v-for="metric in metrics"
        :key="metric.label"
        class="shadow-sm ring-1 ring-slate-200/50 transition hover:shadow-md"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="text-sm text-slate-500">{{ metric.label }}</div>
            <div class="mt-1.5 text-3xl font-bold tabular-nums tracking-tight text-slate-900">{{ metric.value }}</div>
          </div>
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
            :class="metric.color"
          >
            <UIcon :name="metric.icon" class="size-5" />
          </div>
        </div>
      </UCard>
    </div>

    <UCard class="shadow-sm ring-1 ring-slate-200/50">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold text-slate-900">{{ t('overview.recentUsage') }}</h3>
            <p class="text-sm text-slate-500">{{ t('overview.recentUsageDescription') }}</p>
          </div>
          <UBadge color="neutral" variant="soft">{{ t('common.rows', { count: logs.length }) }}</UBadge>
        </div>
      </template>
      <AdminLogsTable :logs="logs" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false })

const { stats, logs, loadData } = useAdminState()
const { t } = useI18n()
const tokensK = computed(() => Math.round(stats.value.totalTokens / 1000))
const metrics = computed(() => [
  { label: t('overview.metrics.keys'), value: `${stats.value.activeKeys} / ${stats.value.totalKeys}`, icon: 'i-lucide-key-round', color: 'bg-gradient-to-br from-amber-500 to-amber-600' },
  { label: t('overview.metrics.accounts'), value: `${stats.value.activeAccounts} / ${stats.value.totalAccounts}`, icon: 'i-lucide-users', color: 'bg-gradient-to-br from-blue-500 to-blue-600' },
  { label: t('overview.metrics.requests'), value: stats.value.totalRequests.toLocaleString(), icon: 'i-lucide-arrow-left-right', color: 'bg-gradient-to-br from-emerald-500 to-emerald-600' },
  { label: t('overview.metrics.tokens'), value: `${tokensK.value.toLocaleString()}K`, icon: 'i-lucide-binary', color: 'bg-gradient-to-br from-violet-500 to-violet-600' },
])

onMounted(loadData)
</script>
