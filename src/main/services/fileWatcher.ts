import * as path from 'path'
import { BrowserWindow } from 'electron'
import chokidar, { type FSWatcher } from 'chokidar'
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

class FileWatcherService extends ServiceCore {
  private watcher: FSWatcher | null = null
  private watchedPath: string | null = null
  private mainWindow: BrowserWindow | null = null

  private paused = false
  private operationCount = 0

  private pendingEvents: Map<string, FileChangeEvent> = new Map()
  private batchTimer: ReturnType<typeof setTimeout> | null = null
  private batchDebounceMs = 500

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window
  }

  start(projectPath: string): boolean {
    if (this.watcher) {
      this.stop()
    }

    this.watchedPath = projectPath

    try {
      this.watcher = chokidar.watch(projectPath, {
        ignored: [
          /(^|[/\\])\../,
          '**/node_modules/**',
          '**/.git/objects/**',
          '**/.git/refs/**',
          '**/.git/logs/**',
          '**/dist/**',
          '**/build/**'
        ],
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        },
        usePolling: false,
        depth: undefined
      })

      this.watcher.on('add', filePath => this.handleFileEvent('add', filePath))
      this.watcher.on('change', filePath => this.handleFileEvent('change', filePath))
      this.watcher.on('unlink', filePath => this.handleFileEvent('unlink', filePath))

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
      this.watcher.close().catch(err => {
        this.logger.error('关闭文件监听失败:', err)
      })
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

  private handleFileEvent(type: FileChangeEvent['type'], filePath: string): void {
    if (this.paused) return

    const normalizedPath = path.normalize(filePath)

    const existing = this.pendingEvents.get(normalizedPath)
    if (existing) {
      if (existing.type === 'add' && type === 'unlink') {
        this.pendingEvents.delete(normalizedPath)
      } else if (existing.type === 'unlink' && type === 'add') {
        existing.type = 'change'
      } else {
        existing.type = type
      }
    } else {
      this.pendingEvents.set(normalizedPath, { type, path: normalizedPath })
    }

    this.scheduleBatch()
  }

  private scheduleBatch(): void {
    if (this.batchTimer) return

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null
      this.flushBatch()
    }, this.batchDebounceMs)
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
