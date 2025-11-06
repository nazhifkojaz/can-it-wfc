import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base URL for GitHub Pages deployment
  // For user/org pages (username.github.io), use '/'
  // For project pages (username.github.io/repo-name), use '/repo-name/'
  base: process.env.VITE_BASE_URL || '/can-it-wfc',
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist', // Changed from 'build' to 'dist' (Vite default)
    sourcemap: false, // Disable sourcemaps in production
  },
})
