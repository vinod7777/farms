import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    react()
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portal: resolve(__dirname, 'portal.html')
      }
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost/farm',
        changeOrigin: true,
      }
    }
  }
})
