import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the repo name so asset URLs resolve on GitHub Pages
// (served from https://<user>.github.io/harmony-maker/)
export default defineConfig({
  base: '/harmony-maker/',
  plugins: [react()],
  build: {
    // Emit .vite/manifest.json so scripts/check-bundle-budget.mjs can walk
    // the eager (statically imported) chunk graph.
    manifest: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['tests/setup.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,jsx}'],
    },
  },
})
