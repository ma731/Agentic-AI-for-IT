import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Dev server proxies /api to the FastAPI backend so the frontend can run "live"
// without CORS config. With no backend running, the app falls back to the baked
// Friday Cascade stream (see src/cascade.js) — so it always demos.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})
