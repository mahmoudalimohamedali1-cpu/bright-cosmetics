import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // The API (server/) runs on 8787 in dev; see `npm run dev`.
    proxy: { '/api': 'http://localhost:8787' },
  },
})
