<template>
  <div class="mx-auto max-w-2xl">
    <UCard class="shadow-sm ring-1 ring-slate-200/50">
      <template #header>
        <div>
          <h3 class="font-semibold">{{ t('settings.title') }}</h3>
          <p class="text-sm text-slate-500">{{ t('settings.description') }}</p>
        </div>
      </template>

      <div class="grid gap-5">
        <UFormField :label="t('settings.globalProxy')" :help="t('settings.globalProxyHelp')">
          <UInput
            v-model="settingsForm.global_proxy"
            icon="i-lucide-network"
            placeholder="socks5://127.0.0.1:1080"
          />
        </UFormField>

        <UFormField :label="t('settings.poolStrategy')">
          <USelect v-model="settingsForm.pool_strategy" :items="poolStrategyItems" class="w-full" />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton icon="i-lucide-save" @click="saveSettings">{{ t('settings.save') }}</UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin', ssr: false })

const { settingsForm, loadSettings, saveSettings } = useAdminState()
const { t } = useI18n()
const poolStrategyItems = ['round-robin', 'least-used', 'random']

onMounted(loadSettings)
</script>
