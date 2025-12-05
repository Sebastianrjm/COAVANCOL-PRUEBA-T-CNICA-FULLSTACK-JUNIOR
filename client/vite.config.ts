import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy `/api` calls to the local backend for convenience
      '/api': 'http://localhost:4000'
    }
  }
})