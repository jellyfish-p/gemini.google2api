// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-07-01',
  srcDir: 'app/',
  ssr: true,
  devtools: { enabled: false },
  modules: ['@nuxt/ui', '@nuxtjs/i18n'],
  css: ['~/assets/css/main.css'],
  colorMode: {
    preference: 'light',
    fallback: 'light',
  },
  i18n: {
    defaultLocale: 'zh-CN',
    strategy: 'no_prefix',
    langDir: 'locales',
    locales: [
      { code: 'zh-CN', language: 'zh-CN', name: '简体中文', file: 'zh-CN.ts' },
      { code: 'en-US', language: 'en-US', name: 'English', file: 'en-US.ts' },
    ],
  },
  nitro: {
    experimental: {
      openAPI: false,
    },
  },
  runtimeConfig: {
    configPath: '',
  },
  vite: {
    optimizeDeps: {
      include: ['better-sqlite3'],
    },
  },
  typescript: {
    strict: true,
    typeCheck: false,
  },
})
