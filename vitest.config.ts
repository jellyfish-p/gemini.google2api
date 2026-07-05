import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        target: 'ES2022',
        module: 'ESNext',
        moduleResolution: 'Bundler',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
      },
    },
  },
})
