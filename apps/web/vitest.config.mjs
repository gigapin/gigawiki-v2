import { fileURLToPath } from 'node:url'

export default {
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@shared': fileURLToPath(new URL('../../packages/shared/src', import.meta.url)),
    },
  },
  test: { environment: 'node', globals: true, include: ['tests/**/*.test.mjs'] },
}
