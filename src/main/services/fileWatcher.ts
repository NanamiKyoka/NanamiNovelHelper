import * as fs from 'fs'
import * as path from 'path'
import { BrowserWindow } from 'electron'
import { ServiceCore } from './service-core'

export interface FileChangeEvent {
  type: 'add' | 'change' | 'unlink'
  path: string
}

export interface BatchFileChangeEvent {
  changes: FileChangeEvent[]
  timestamp: number
}

export interface BulkOperationEndEvent {
  type: 'bulk-operation-end'
  timestamp: number
}

interface WatchOptions {
  ignored?: string[]
  batchDebounceMs?: number
}

class FileWatcherService extends ServiceCore {
  private watcher: fs.FSWatcher | null = null
  private watchedPath: string | null = null
  private mainWindow: BrowserWindow | null = null

  private paused = false
  private operationCount = 0

  private pendingEvents: Map<string, FileChangeEvent> = new Map()
  private batchTimer: ReturnType<typeof setTimeout> | null = null

  private defaultOptions: WatchOptions = {
    ignored: [
      '**/node_modules/**',
      '**/.git/objects/**',
      '**/.git/refs/**',
      '**/.git/logs/**',
      '**/dist/**',
      '**/build/**',
      '**/.DS_Store',
      '**/Thumbs.db'
    ],
    batchDebounceMs: 500
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

          this.handleFileEvent(eventType, filePath)
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

    this.flushBatch()
    this.pendingEvents.clear()
    this.watchedPath = null
  }

  isWatching(): boolean {
    return this.watcher !== null
  }

  getWatchedPath(): string | null {
    return this.watchedPath
  }

  pause(): void {
    this.paused = true
    this.operationCount++
  }

  resume(): void {
    this.operationCount = Math.max(0, this.operationCount - 1)
    if (this.operationCount === 0) {
      this.paused = false
      this.pendingEvents.clear()
      this.flushBatch()
      this.notifyBulkOperationEnd()
    }
  }

  isPaused(): boolean {
    return this.paused
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

  private handleFileEvent(eventType: string, filePath: string): void {
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

    const existing = this.pendingEvents.get(filePath)
    if (existing) {
      if (existing.type === 'add' && type === 'unlink') {
        this.pendingEvents.delete(filePath)
      } else if (existing.type === 'unlink' && type === 'add') {
        existing.type = 'change'
      } else {
        existing.type = type
      }
    } else {
      this.pendingEvents.set(filePath, { type, path: filePath })
    }

    this.scheduleBatch()
  }

  private scheduleBatch(): void {
    if (this.batchTimer) return

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null
      this.flushBatch()
    }, this.defaultOptions.batchDebounceMs)
  }

  private flushBatch(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.pendingEvents.size === 0) return

    const changes = Array.from(this.pendingEvents.values())
    this.pendingEvents.clear()

    this.notifyRenderer({
      changes,
      timestamp: Date.now()
    })
  }

  private notifyRenderer(event: BatchFileChangeEvent): void {
    if (this.paused) return
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('file-change', event)
    }
  }

  private notifyBulkOperationEnd(): void {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('file-change', {
        type: 'bulk-operation-end',
        timestamp: Date.now()
      } as BulkOperationEndEvent)
    }
  }
}

export const fileWatcherService = new FileWatcherService()
