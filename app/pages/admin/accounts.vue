<template>
  <div class="grid gap-6 xl:grid-cols-[400px_1fr]">
    <div class="space-y-6">
      <UCard class="shadow-sm ring-1 ring-slate-200/50">
        <template #header>
          <div class="flex items-center justify-between gap-3">
            <div>
              <h3 class="font-semibold">{{ editingAccount ? t('accounts.editTitle', { id: editingAccount.id }) : t('accounts.newTitle') }}</h3>
              <p class="text-sm text-slate-500">{{ t('accounts.description') }}</p>
            </div>
            <UButton
              v-if="editingAccount"
              color="neutral"
              variant="ghost"
              icon="i-lucide-x"
              @click="resetAccountForm"
            />
          </div>
        </template>

        <div class="space-y-4">
          <UFormField :label="t('accounts.name')" required>
            <UInput v-model="accountForm.name" :placeholder="t('accounts.namePlaceholder')" icon="i-lucide-user" />
          </UFormField>
          <UFormField label="__Secure-1PSID" required>
            <UInput v-model="accountForm.secure_1psid" :placeholder="t('accounts.cookiePlaceholder')" icon="i-lucide-cookie" />
          </UFormField>
          <UFormField label="__Secure-1PSIDTS">
            <UInput v-model="accountForm.secure_1psidts" :placeholder="t('accounts.cookiePlaceholder')" icon="i-lucide-cookie" />
          </UFormField>
          <UFormField :label="t('accounts.proxy')">
            <UInput v-model="accountForm.proxy" :placeholder="t('accounts.proxyPlaceholder')" icon="i-lucide-network" />
          </UFormField>
          <UFormField :label="t('accounts.active')">
            <USelect v-model="accountForm.is_active" :items="activeItems" class="w-full" />
          </UFormField>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton color="neutral" variant="ghost" @click="resetAccountForm">{{ t('common.clear') }}</UButton>
            <UButton :icon="editingAccount ? 'i-lucide-save' : 'i-lucide-plus'" @click="saveAccount">
              {{ editingAccount ? t('common.update') : t('common.create') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </div>

    <UCard class="min-w-0 shadow-sm ring-1 ring-slate-200/50">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <h3 class="font-semibold">{{ t('accounts.title') }}</h3>
            <p class="text-sm text-slate-500">{{ t('accounts.tableDescription') }}</p>
          </div>
          <UBadge color="neutral" variant="soft">{{ t('common.accountsCount', { count: accounts.length }) }}</UBadge>
        </div>
      </template>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[900px] text-left text-sm">
          <thead class="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th class="px-4 py-3.5 font-semibold">ID</th>
              <th class="px-4 py-3.5 font-semibold">{{ t('table.name') }}</th>
              <th class="px-4 py-3.5 font-semibold">{{ t('table.proxy') }}</th>
              <th class="px-4 py-3.5 font-semibold">{{ t('table.status') }}</th>
              <th class="px-4 py-3.5 font-semibold">{{ t('table.requests') }}</th>
              <th class="px-4 py-3.5 font-semibold">{{ t('table.tokens') }}</th>
              <th class="px-4 py-3.5 font-semibold">{{ t('table.lastUsed') }}</th>
              <th class="px-4 py-3.5 text-right font-semibold">{{ t('common.actions') }}</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="a in accounts" :key="a.id" class="transition hover:bg-slate-50" :class="{ 'opacity-60': !a.is_active }">
              <td class="px-4 py-3.5 text-slate-500 tabular-nums">{{ a.id }}</td>
              <td class="px-4 py-3.5 font-medium">{{ a.name }}</td>
              <td class="max-w-[200px] truncate px-4 py-3.5 font-mono text-xs text-slate-500">{{ a.proxy || '-' }}</td>
              <td class="px-4 py-3.5">
                <UBadge :color="a.is_active ? 'success' : 'error'" variant="soft">
                  {{ a.is_active ? t('common.active') : t('common.inactive') }}
                </UBadge>
              </td>
              <td class="px-4 py-3.5 tabular-nums">{{ a.total_requests }}</td>
              <td class="px-4 py-3.5 tabular-nums">{{ a.total_tokens }}</td>
              <td class="whitespace-nowrap px-4 py-3.5 text-slate-500">{{ a.last_used_at || t('common.never') }}</td>
              <td class="px-4 py-3.5">
                <div class="flex justify-end gap-2">
                  <UButton size="xs" color="neutral" variant="outline" icon="i-lucide-pencil" @click="editAccount(a)">
                    {{ t('common.edit') }}
                  </UButton>
                  <UButton size="xs" color="error" variant="soft" icon="i-lucide-trash-2" @click="deleteAccount(a.id)">
                    {{ t('common.delete') }}
                  </UButton>
                </div>
              </td>
            </tr>
            <tr v-if="accounts.length === 0">
              <td colspan="8" class="px-4 py-12 text-center text-slate-400">{{ t('accounts.empty') }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false })

const {
  accounts,
  editingAccount,
  accountForm,
  resetAccountForm,
  saveAccount,
  editAccount,
  deleteAccount,
  loadData,
} = useAdminState()
const { t } = useI18n()

const activeItems = computed(() => [
  { label: t('common.active'), value: 1 },
  { label: t('common.inactive'), value: 0 },
])

onMounted(loadData)
</script>
