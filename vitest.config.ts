import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'happy-dom',
    include: ['tests/unit/**/*.{test,spec}.ts', 'app/**/*.{test,spec}.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**'],
  },
})
