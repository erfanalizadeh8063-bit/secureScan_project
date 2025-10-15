import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // 👈 Cross-platform alias
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080', // در Dev محیط، به بک‌اند لوکال
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
