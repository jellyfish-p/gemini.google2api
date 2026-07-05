<template>
  <div class="overflow-x-auto">
    <table class="w-full min-w-[820px] text-left text-sm">
      <thead class="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
        <tr>
          <th class="px-4 py-3.5 font-semibold">{{ t('table.time') }}</th>
          <th class="px-4 py-3.5 font-semibold">{{ t('table.account') }}</th>
          <th class="px-4 py-3.5 font-semibold">{{ t('table.key') }}</th>
          <th class="px-4 py-3.5 font-semibold">{{ t('table.model') }}</th>
          <th class="px-4 py-3.5 font-semibold">{{ t('table.prompt') }}</th>
          <th class="px-4 py-3.5 font-semibold">{{ t('table.completion') }}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="l in logs" :key="l.id" class="transition hover:bg-slate-50">
          <td class="whitespace-nowrap px-4 py-3.5 text-slate-600 tabular-nums">{{ l.created_at }}</td>
          <td class="px-4 py-3.5">{{ l.account_name || '-' }}</td>
          <td class="px-4 py-3.5">{{ l.key_name || '-' }}</td>
          <td class="px-4 py-3.5 font-mono text-xs text-slate-600">{{ l.model || '-' }}</td>
          <td class="px-4 py-3.5 tabular-nums">{{ l.prompt_tokens }}</td>
          <td class="px-4 py-3.5 tabular-nums">{{ l.completion_tokens }}</td>
        </tr>
        <tr v-if="logs.length === 0">
          <td colspan="6" class="px-4 py-12 text-center text-slate-400">{{ t('logs.empty') }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
type UsageLog = {
  id: number
  created_at: string
  account_name?: string | null
  key_name?: string | null
  model?: string | null
  prompt_tokens: number
  completion_tokens: number
}

defineProps<{ logs: UsageLog[] }>()
const { t } = useI18n()
</script>
