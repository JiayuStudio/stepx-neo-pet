import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ base: './', publicDir: false, plugins: [react()], build: { outDir: '../app/assets/web', emptyOutDir: true, chunkSizeWarningLimit: 1600, sourcemap: false } })
