/**
 * Service 基类
 * 
 * 提供通用的文件操作、目录管理和 CRUD 方法，减少 Service 层的重复代码
 * 继承 ServiceCore 获得路径管理、ID 生成、JSON5 读写等基础能力
 */

import * as fs from 'fs'
import * as path from 'path'
import JSON5 from 'json5'
import { ServiceCore } from './service-core'
import {
  ServiceError,
  ErrorCode,
  Errors,
  ensureInitialized,
  handleError,
  handleErrorAsync
} from '../../shared/errors'

/**
 * Service 基础配置
 */
export interface BaseServiceConfig {
  /** 数据子目录名（相对于 data 目录） */
  dataSubDir: string
  /** 文件扩展名（默认 .json5） */
  fileExtension?: string
  /** 是否在 data 子目录下（默认 true） */
  useDataSubDir?: boolean
}

/**
 * 可持久化实体的基础接口
 */
export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

/**
 * Service 基类
 * 
 * 提供通用的项目管理、文件操作和 CRUD 方法
 */
export abstract class BaseService<T extends BaseEntity, M = Omit<T, 'nodes' | 'edges' | 'events' | 'data'>> extends ServiceCore {
  protected config: Required<BaseServiceConfig>

  constructor(config: BaseServiceConfig) {
    super()
    this.config = {
      fileExtension: '.json5',
      useDataSubDir: true,
      ...config
    }
  }

  /**
   * 初始化服务
   * @param projectPath 项目路径
   * @param metaDir 元数据目录名（默认 .novelhelper）
   */
  init(projectPath: string, metaDir?: string): void {
    this.projectPath = projectPath
    const meta = metaDir || this.PROJECT_META_DIR

    if (this.config.useDataSubDir) {
      this.dataDir = path.join(projectPath, meta, this.DATA_DIR, this.config.dataSubDir)
    } else {
      this.dataDir = path.join(projectPath, meta, this.config.dataSubDir)
    }

    this.ensureDirectories()
  }

  /**
   * 获取实体文件路径
   */
  protected getEntityPath(id: string): string {
    return path.join(this.dataDir!, `${id}${this.config.fileExtension}`)
  }

  /**
   * 获取缩略图路径
   */
  protected getThumbnailPath(id: string): string {
    return path.join(this.dataDir!, `${id}.png`)
  }

  // ============================================
  // 通用 CRUD 方法
  // ============================================

  /**
   * 获取所有实体列表
   */
  getList(): M[] {
    if (!this.dataDir || !fs.existsSync(this.dataDir)) {
      return []
    }

    const files = fs.readdirSync(this.dataDir)
    const items: M[] = []

    for (const file of files) {
      if (file.endsWith(this.config.fileExtension)) {
        try {
          const filePath = path.join(this.dataDir, file)
          const content = fs.readFileSync(filePath, 'utf-8')
          const item = this.parseEntity(content)
          if (item) {
            items.push(this.toMetadata(item))
          }
        } catch (error) {
          this.logger.error(`Failed to load ${file}`, error)
        }
      }
    }

    return this.sortItems(items)
  }

  /**
   * 获取单个实体
   */
  get(id: string): T | null {
    const filePath = this.getEntityPath(id)
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return this.parseEntity(content)
    } catch (error) {
      this.logger.error(`Failed to load entity ${id}`, error)
      return null
    }
  }

  /**
   * 保存实体
   */
  protected save(item: T): void {
    const filePath = this.getEntityPath(item.id)
    const content = this.serializeEntity(item)
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  /**
   * 删除实体
   */
  delete(id: string): boolean {
    const filePath = this.getEntityPath(id)
    if (!fs.existsSync(filePath)) {
      return false
    }

    try {
      fs.unlinkSync(filePath)

      // 删除缩略图
      const thumbnailPath = this.getThumbnailPath(id)
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath)
      }

      return true
    } catch (error) {
      this.logger.error(`Failed to delete entity ${id}`, error)
      return false
    }
  }

  // ============================================
  // 抽象方法 - 子类必须实现
  // ============================================

  /**
   * 解析实体内容
   */
  protected abstract parseEntity(content: string): T | null

  /**
   * 序列化实体
   */
  protected abstract serializeEntity(item: T): string

  /**
   * 转换为元数据
   */
  protected abstract toMetadata(item: T): M

  /**
   * 排序列表
   */
  protected abstract sortItems(items: M[]): M[]

  // ============================================
  // 缩略图管理
  // ============================================

  /**
   * 保存缩略图
   */
  saveThumbnail(id: string, dataUrl: string): string | null {
    try {
      // 移除 data URL 前缀
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      const thumbnailPath = this.getThumbnailPath(id)
      fs.writeFileSync(thumbnailPath, buffer)

      return thumbnailPath
    } catch (error) {
      this.logger.error(`Failed to save thumbnail for ${id}`, error)
      return null
    }
  }

  /**
   * 获取缩略图完整路径
   */
  getThumbnailFullPath(id: string): string | null {
    const thumbnailPath = this.getThumbnailPath(id)
    if (fs.existsSync(thumbnailPath)) {
      return thumbnailPath
    }
    return null
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导出实体为 JSON 字符串
   */
  exportItem(id: string): string | null {
    const item = this.get(id)
    if (!item) return null

    return this.serializeEntity(item)
  }

  /**
   * 导入实体（基础实现，子类可覆盖）
   */
  importItem(jsonContent: string): T | null {
    try {
      const item = this.parseEntity(jsonContent)
      if (!item) return null

      // 生成新 ID 和时间戳
      item.id = this.generateId()
      item.createdAt = this.getTimestamp()
      item.updatedAt = this.getTimestamp()

      this.save(item)
      return item
    } catch (error) {
      this.logger.error('Failed to import item', error)
      return null
    }
  }
}
