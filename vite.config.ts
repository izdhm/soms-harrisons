import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    env: {
      VITE_API_BASE_URL: 'https://api.test/sales-orders',
      VITE_API_KEY: 'test-key',
    },
  },
})
