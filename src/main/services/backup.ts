/**
 * 备份服务
 * 提供项目配置的全量备份功能
 */

import * as fs from 'fs'
import * as path from 'path'
import * as zlib from 'zlib'
import { promisify } from 'util'
import { PROJECT_META_DIR, BACKUP_DIR } from '../types/project'
import { projectSettingsService } from './projectSettings'
import { handleError, handleErrorAsync } from '../../shared/errors'

const gzip = promisify(zlib.gzip)
const gunzip = promisify(zlib.gunzip)

/**
 * 备份信息
 */
export interface BackupInfo {
  /** 备份文件名 */
  filename: string
  /** 备份时间 */
  createdAt: string
  /** 文件大小（字节） */
  size: number
}

/**
 * 备份服务
 */
class BackupService {
  private projectPath: string | null = null
  private backupDir: string | null = null

  /**
   * 初始化服务
   */
  init(projectPath: string): void {
    this.projectPath = projectPath
    this.backupDir = path.join(projectPath, PROJECT_META_DIR, BACKUP_DIR)
    this.ensureBackupDir()
  }

  /**
   * 确保备份目录存在
   */
  private ensureBackupDir(): void {
    if (!this.backupDir) return
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true })
    }
  }

  /**
   * 检查备份是否启用
   */
  isEnabled(): boolean {
    try {
      const settings = projectSettingsService.getBackupSettings()
      return settings.enabled
    } catch {
      return true
    }
  }

  /**
   * 获取最大备份数量
   */
  getMaxCount(): number {
    try {
      const settings = projectSettingsService.getBackupSettings()
      return settings.maxCount
    } catch {
      return 10
    }
  }

  /**
   * 创建备份
   * @returns 备份文件名，如果备份未启用则返回 null
   */
  async createBackup(): Promise<string | null> {
    if (!this.isEnabled() || !this.projectPath || !this.backupDir) {
      return null
    }

    return handleErrorAsync(async () => {
      this.ensureBackupDir()

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `${timestamp}.nhbak`
      const backupPath = path.join(this.backupDir!, filename)

      const configDir = path.join(this.projectPath!, PROJECT_META_DIR)
      const configData: Record<string, string> = {}

      const collectFiles = (dir: string, basePath: string = ''): void => {
        const items = fs.readdirSync(dir, { withFileTypes: true })
        for (const item of items) {
          if (item.name === BACKUP_DIR) continue
          
          const fullPath = path.join(dir, item.name)
          const relativePath = basePath ? `${basePath}/${item.name}` : item.name

          if (item.isDirectory()) {
            collectFiles(fullPath, relativePath)
          } else if (item.isFile()) {
            const content = handleError(() => fs.readFileSync(fullPath, 'utf-8'), {
              module: 'BackupService',
              operation: `readFile:${relativePath}`,
              log: false,
            })
            if (content) {
              configData[relativePath] = content
            }
          }
        }
      }

      collectFiles(configDir)

      const jsonStr = JSON.stringify(configData)
      const compressed = await gzip(Buffer.from(jsonStr, 'utf-8'))
      
      fs.writeFileSync(backupPath, compressed)

      this.cleanupOldBackups()

      return filename
    }, { module: 'BackupService', operation: 'createBackup' })
  }

  /**
   * 恢复备份
   */
  async restoreBackup(filename: string): Promise<boolean> {
    if (!this.projectPath || !this.backupDir) {
      return false
    }

    const backupPath = path.join(this.backupDir, filename)
    if (!fs.existsSync(backupPath)) {
      return false
    }

    return handleErrorAsync(async () => {
      const compressed = fs.readFileSync(backupPath)
      const decompressed = await gunzip(compressed)
      const configData = JSON.parse(decompressed.toString('utf-8'))

      const configDir = path.join(this.projectPath!, PROJECT_META_DIR)
      
      for (const [relativePath, content] of Object.entries(configData)) {
        const fullPath = path.join(configDir, relativePath)
        const dir = path.dirname(fullPath)
        
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true })
        }
        
        fs.writeFileSync(fullPath, content as string, 'utf-8')
      }

      return true
    }, { module: 'BackupService', operation: 'restoreBackup', defaultValue: false }) ?? false
  }

  /**
   * 获取所有备份列表
   */
  listBackups(): BackupInfo[] {
    if (!this.backupDir || !fs.existsSync(this.backupDir)) {
      return []
    }

    const files = fs.readdirSync(this.backupDir, { withFileTypes: true })
    
    return files
      .filter(f => f.isFile() && f.name.endsWith('.nhbak'))
      .map(f => {
        const stat = fs.statSync(path.join(this.backupDir!, f.name))
        return {
          filename: f.name,
          createdAt: stat.birthtime.toISOString(),
          size: stat.size
        }
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)) // 按时间倒序
  }

  /**
   * 删除备份
   */
  deleteBackup(filename: string): boolean {
    if (!this.backupDir) return false

    const backupPath = path.join(this.backupDir, filename)
    if (!fs.existsSync(backupPath)) return false

    return handleError(() => {
      fs.unlinkSync(backupPath)
      return true
    }, { module: 'BackupService', operation: 'deleteBackup', defaultValue: false }) ?? false
  }

  /**
   * 清理旧备份，保留最新的 N 个
   */
  private cleanupOldBackups(): void {
    const maxCount = this.getMaxCount()
    const backups = this.listBackups()

    if (backups.length <= maxCount) return

    // 删除最旧的备份
    const toDelete = backups.slice(maxCount)
    for (const backup of toDelete) {
      this.deleteBackup(backup.filename)
    }
  }

  /**
   * 导出备份到指定路径
   */
  async exportBackup(filename: string, exportPath: string): Promise<boolean> {
    if (!this.backupDir) return false

    const backupPath = path.join(this.backupDir, filename)
    if (!fs.existsSync(backupPath)) return false

    return handleError(() => {
      fs.copyFileSync(backupPath, exportPath)
      return true
    }, { module: 'BackupService', operation: 'exportBackup', defaultValue: false }) ?? false
  }

  async importBackup(importPath: string): Promise<string | null> {
    if (!this.backupDir || !fs.existsSync(importPath)) return null

    this.ensureBackupDir()

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const filename = `${timestamp}.nhbak`
    const backupPath = path.join(this.backupDir, filename)

    return handleError(() => {
      fs.copyFileSync(importPath, backupPath)
      this.cleanupOldBackups()
      return filename
    }, { module: 'BackupService', operation: 'importBackup' })
  }
}

// 单例导出
export const backupService = new BackupService()
