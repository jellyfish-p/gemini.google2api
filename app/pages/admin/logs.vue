<template>
  <UCard class="shadow-sm ring-1 ring-slate-200/50">
    <template #header>
      <div class="flex items-center justify-between">
        <div>
          <h3 class="font-semibold">{{ t('logs.title') }}</h3>
          <p class="text-sm text-slate-500">{{ t('logs.description') }}</p>
        </div>
        <UBadge color="neutral" variant="soft">{{ t('common.rows', { count: logs.length }) }}</UBadge>
      </div>
    </template>
    <AdminLogsTable :logs="logs" />
  </UCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false })

const { logs, loadData } = useAdminState()
const { t } = useI18n()

onMounted(loadData)
</script>
