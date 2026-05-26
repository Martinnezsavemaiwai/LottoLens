import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/main.jsx',
        'src/test/**',
        'src/App.jsx',
        'src/components/tabs/**',
        'src/components/common/Loading.jsx',
        'src/context/**',
        'src/data/**',
        'src/services/gemini.js',
        'src/services/api.js',
        'src/utils/**'
      ],
      thresholds: {
        lines: 60,
        functions: 60
      }
    }
  }
})
