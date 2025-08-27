import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(async () => {
  const tailwindcss = await import('@tailwindcss/vite').then((mod) => mod.default)
  
  return {
    plugins: [
      react(),
      tailwindcss(),
    ],
  base: './',
  build: {
    outDir: 'dist'
  },
    server: {
      port: 5175,
      host: 'localhost',
      strictPort: true
    }
  }
})