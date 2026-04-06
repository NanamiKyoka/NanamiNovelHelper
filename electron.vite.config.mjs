import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin(),
      // 复制 builtin-skills 到输出目录
      {
        name: 'copy-builtin-skills',
        writeBundle() {
          const srcDir = resolve(__dirname, 'src/main/builtin-skills')
          const destDir = resolve(__dirname, 'out/main/builtin-skills')
          
          if (fs.existsSync(srcDir)) {
            // 递归复制目录
            const copyDir = (src, dest) => {
              if (!fs.existsSync(dest)) {
                fs.mkdirSync(dest, { recursive: true })
              }
              const entries = fs.readdirSync(src, { withFileTypes: true })
              for (const entry of entries) {
                const srcPath = resolve(src, entry.name)
                const destPath = resolve(dest, entry.name)
                if (entry.isDirectory()) {
                  copyDir(srcPath, destPath)
                } else {
                  fs.copyFileSync(srcPath, destPath)
                }
              }
            }
            copyDir(srcDir, destDir)
            console.log('Copied builtin-skills to out/main/')
          }
        }
      }
    ],
    resolve: {
      alias: {
        '@main': resolve('src/main'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.ts')
        },
        external: ['chokidar']
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@preload': resolve('src/preload'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react()],
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
    }
  }
})
