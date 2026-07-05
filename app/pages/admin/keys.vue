<template>
  <UCard class="shadow-sm ring-1 ring-slate-200/50">
    <template #header>
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 class="font-semibold">{{ t('keys.title') }}</h3>
          <p class="text-sm text-slate-500">{{ t('keys.description') }}</p>
        </div>
        <div class="flex gap-2">
          <UInput v-model="newKeyName" :placeholder="t('keys.placeholder')" icon="i-lucide-key-round" />
          <UButton icon="i-lucide-plus" @click="createKey">{{ t('common.generate') }}</UButton>
        </div>
      </div>
    </template>

    <div class="overflow-x-auto">
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
          <tr>
            <th class="px-4 py-3.5 font-semibold">ID</th>
            <th class="px-4 py-3.5 font-semibold">{{ t('table.key') }}</th>
            <th class="px-4 py-3.5 font-semibold">{{ t('table.name') }}</th>
            <th class="px-4 py-3.5 font-semibold">{{ t('table.source') }}</th>
            <th class="px-4 py-3.5 font-semibold">{{ t('table.created') }}</th>
            <th class="px-4 py-3.5 text-right font-semibold">{{ t('common.actions') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="k in keys" :key="k.id" class="transition hover:bg-slate-50">
            <td class="px-4 py-3.5 text-slate-500 tabular-nums">{{ k.id }}</td>
            <td class="px-4 py-3.5">
              <code class="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-700">{{ k.key.slice(0, 8) }}...{{ k.key.slice(-8) }}</code>
            </td>
            <td class="px-4 py-3.5">{{ k.name || '-' }}</td>
            <td class="px-4 py-3.5">
              <UBadge color="success" variant="soft">config.toml</UBadge>
            </td>
            <td class="px-4 py-3.5 text-slate-500 tabular-nums">{{ k.created_at?.slice(0, 10) || '-' }}</td>
            <td class="px-4 py-3.5">
              <div class="flex justify-end gap-2">
                <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="deleteKey(k.id)">
                  {{ t('common.delete') }}
                </UButton>
              </div>
            </td>
          </tr>
          <tr v-if="keys.length === 0">
            <td colspan="6" class="px-4 py-12 text-center text-slate-400">{{ t('keys.empty') }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false })

const { keys, newKeyName, createKey, deleteKey, loadData } = useAdminState()
const { t } = useI18n()

onMounted(loadData)
</script>
