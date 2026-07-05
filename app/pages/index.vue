<template>
  <main class="min-h-screen bg-linear-to-b from-slate-50 to-white px-6 py-16">
    <UContainer>
      <UCard class="shadow-lg shadow-slate-200/50 ring-1 ring-slate-200/50">
        <template #header>
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-3">
                <div
                  class="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-primary-500 to-primary-600 text-white shadow-sm">
                  <UIcon name="i-lucide-gem" class="size-5" />
                </div>
                <h1 class="text-2xl font-bold text-slate-900">Gemini Google2API</h1>
              </div>
              <p class="mt-2 text-sm text-slate-500">{{ t('home.subtitle') }}</p>
            </div>
            <UButton to="/admin" icon="i-lucide-layout-dashboard">{{ t('common.admin') }}</UButton>
          </div>
        </template>

        <div class="grid gap-3 sm:grid-cols-3">
          <UButton to="/api/health" variant="soft" color="neutral" icon="i-lucide-heart-pulse" class="justify-start"
            block>
            {{ t('home.health') }}
          </UButton>
          <UButton to="/api/v1/models" variant="soft" color="neutral" icon="i-lucide-boxes" class="justify-start" block>
            {{ t('home.openaiModels') }}
          </UButton>
          <UButton to="/api/v1beta/models" variant="soft" color="neutral" icon="i-lucide-sparkles" class="justify-start"
            block>
            {{ t('home.geminiModels') }}
          </UButton>
        </div>
      </UCard>
    </UContainer>
    <NuxtPage />
  </main>
</template>

<script setup lang="ts">
const { t } = useI18n()
</script>
