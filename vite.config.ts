import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8'))

export default defineConfig({
  plugins: [react()],
  root: 'src/renderer',
  publicDir: 'public',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version)
  },
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
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log']
      }
    },
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'src/renderer/index.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('react/') || id.includes('react-router')) {
              return 'vendor-react'
            }
            if (id.includes('antd') || id.includes('@ant-design')) {
              return 'vendor-antd'
            }
            if (id.includes('@tiptap')) {
              return 'vendor-editor'
            }
            if (id.includes('@codemirror') || id.includes('@lezer')) {
              return 'vendor-codemirror'
            }
            if (id.includes('@antv')) {
              return 'vendor-graph'
            }
            if (id.includes('pixi')) {
              return 'vendor-pixi'
            }
          }
        }
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
