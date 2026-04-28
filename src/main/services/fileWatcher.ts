/**
 * 文件监听服务
 * 监听项目目录的文件变化，通知渲染进程刷新
 */

import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow } from 'electron'
import { ServiceCore } from './service-core'

interface WatchOptions {
  ignored?: string[]
  debounceMs?: number
}

interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink'
  path: string
}

class FileWatcherService extends ServiceCore {
  private watcher: fs.FSWatcher | null = null
  private watchedPath: string | null = null
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map()
  private pendingEvents: Map<string, FileChangeEvent> = new Map()
  private mainWindow: BrowserWindow | null = null
  private paused: boolean = false
  private defaultOptions: WatchOptions = {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store',
      '**/Thumbs.db'
    ],
    debounceMs: 300
  }

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  start(projectPath: string, options?: WatchOptions): boolean {
    if (this.watcher) {
      this.stop()
    }

    if (!fs.existsSync(projectPath)) {
      this.logger.error(`项目路径不存在: ${projectPath}`)
      return false
    }

    this.watchedPath = projectPath
    const opts = { ...this.defaultOptions, ...options }

    try {
      this.watcher = fs.watch(
        projectPath,
        {
          recursive: true,
          encoding: 'utf-8'
        },
        (eventType, filename) => {
          if (!filename) return

          const filePath = path.join(projectPath, filename)

          if (this.shouldIgnore(filePath, opts.ignored || [])) {
            return
          }

          this.handleFileEvent(eventType, filePath, filename)
        }
      )

      this.watcher.on('error', error => {
        this.logger.error('文件监听错误:', error)
      })

      this.logger.info(`开始监听项目目录: ${projectPath}`)
      return true
    } catch (error) {
      this.logger.error('启动文件监听失败:', error)
      return false
    }
  }

  stop(): void {
    if (this.watcher) {
      this.watcher.close()
      this.watcher = null
      this.logger.info('文件监听已停止')
    }

    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
    this.pendingEvents.clear()
    this.watchedPath = null
  }

  isWatching(): boolean {
    return this.watcher !== null
  }

  getWatchedPath(): string | null {
    return this.watchedPath
  }

  private shouldIgnore(filePath: string, ignored: string[]): boolean {
    const normalizedPath = filePath.replace(/\\/g, '/')

    for (const pattern of ignored) {
      const normalizedPattern = pattern.replace(/\\/g, '/')
      if (normalizedPattern.includes('**')) {
        const regexPattern = normalizedPattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
        if (new RegExp(regexPattern).test(normalizedPath)) {
          return true
        }
      } else if (normalizedPath.includes(normalizedPattern.replace('*', ''))) {
        return true
      }
    }

    return false
  }

  private handleFileEvent(eventType: string, filePath: string, _filename: string): void {
    if (this.paused) return

    let type: FileChangeEvent['type']

    if (eventType === 'rename') {
      if (fs.existsSync(filePath)) {
        type = 'add'
      } else {
        type = 'unlink'
      }
    } else {
      type = 'change'
    }

    const event: FileChangeEvent = { type, path: filePath }

    this.pendingEvents.set(filePath, event)

    const existingTimer = this.debounceTimers.get(filePath)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    const timer = setTimeout(() => {
      const pendingEvent = this.pendingEvents.get(filePath)
      if (pendingEvent) {
        this.notifyRenderer(pendingEvent)
        this.pendingEvents.delete(filePath)
      }
      this.debounceTimers.delete(filePath)
    }, this.defaultOptions.debounceMs)

    this.debounceTimers.set(filePath, timer)
  }

  private notifyRenderer(event: FileChangeEvent): void {
    if (this.paused) return
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('file-change', event)
    }
  }

  pause(): void {
    this.paused = true
  }

  resume(): void {
    this.paused = false
    this.pendingEvents.clear()
    this.debounceTimers.forEach(timer => clearTimeout(timer))
    this.debounceTimers.clear()
  }

  isPaused(): boolean {
    return this.paused
  }
}

export const fileWatcherService = new FileWatcherService()
