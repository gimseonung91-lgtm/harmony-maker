import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base must match the repo name so asset URLs resolve on GitHub Pages
// (served from https://<user>.github.io/harmony-maker/)
export default defineConfig({
  base: '/harmony-maker/',
  plugins: [react()],
})
