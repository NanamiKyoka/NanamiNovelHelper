import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  publicDir: 'public',
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src'),
      '@components': resolve('src/renderer/src/components'),
      '@stores': resolve('src/renderer/src/stores'),
      '@services': resolve('src/renderer/src/services'),
      '@hooks': resolve('src/renderer/src/hooks'),
      '@utils': resolve('src/renderer/src/utils'),
      '@types': resolve('src/renderer/src/types'),
      '@constants': resolve('src/renderer/src/constants'),
      '@shared': resolve('src/shared')
    }
  },
  build: {
    outDir: resolve(__dirname, 'out/renderer'),
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/renderer/index.html'),
        terminal: resolve(__dirname, 'src/renderer/terminal.html')
      }
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly'
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  clearScreen: false
})
