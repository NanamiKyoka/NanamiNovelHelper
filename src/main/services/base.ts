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

export interface BaseServiceConfig {
  dataSubDir: string
  fileExtension?: string
  useDataSubDir?: boolean
}

export interface BaseEntity {
  id: string
  createdAt: string
  updatedAt: string
}

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

  protected getEntityPath(id: string): string {
    return path.join(this.dataDir!, `${id}${this.config.fileExtension}`)
  }

  protected getThumbnailPath(id: string): string {
    return path.join(this.dataDir!, `${id}.png`)
  }

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
          this.logger.error(`加载 ${file} 失败`, error)
        }
      }
    }

    return this.sortItems(items)
  }

  async getListAsync(): Promise<M[]> {
    if (!this.dataDir) return []

    try {
      await fs.promises.access(this.dataDir)
    } catch {
      return []
    }

    const files = await fs.promises.readdir(this.dataDir)
    const items: M[] = []

    for (const file of files) {
      if (file.endsWith(this.config.fileExtension)) {
        try {
          const filePath = path.join(this.dataDir, file)
          const content = await fs.promises.readFile(filePath, 'utf-8')
          const item = this.parseEntity(content)
          if (item) {
            items.push(this.toMetadata(item))
          }
        } catch (error) {
          this.logger.error(`加载 ${file} 失败`, error)
        }
      }
    }

    return this.sortItems(items)
  }

  get(id: string): T | null {
    const filePath = this.getEntityPath(id)
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return this.parseEntity(content)
    } catch (error) {
      this.logger.error(`加载条目 ${id} 失败`, error)
      return null
    }
  }

  async getAsync(id: string): Promise<T | null> {
    const filePath = this.getEntityPath(id)
    try {
      await fs.promises.access(filePath)
    } catch {
      return null
    }

    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return this.parseEntity(content)
    } catch (error) {
      this.logger.error(`加载条目 ${id} 失败`, error)
      return null
    }
  }

  protected save(item: T): void {
    const filePath = this.getEntityPath(item.id)
    const content = this.serializeEntity(item)
    fs.writeFileSync(filePath, content, 'utf-8')
  }

  protected async saveAsync(item: T): Promise<void> {
    const filePath = this.getEntityPath(item.id)
    const content = this.serializeEntity(item)
    await fs.promises.writeFile(filePath, content, 'utf-8')
  }

  delete(id: string): boolean {
    const filePath = this.getEntityPath(id)
    if (!fs.existsSync(filePath)) {
      return false
    }

    try {
      fs.unlinkSync(filePath)

      const thumbnailPath = this.getThumbnailPath(id)
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath)
      }

      return true
    } catch (error) {
      this.logger.error(`删除条目 ${id} 失败`, error)
      return false
    }
  }

  async deleteAsync(id: string): Promise<boolean> {
    const filePath = this.getEntityPath(id)
    try {
      await fs.promises.access(filePath)
    } catch {
      return false
    }

    try {
      await fs.promises.unlink(filePath)

      const thumbnailPath = this.getThumbnailPath(id)
      try {
        await fs.promises.access(thumbnailPath)
        await fs.promises.unlink(thumbnailPath)
      } catch {
        // 缩略图不存在，忽略
      }

      return true
    } catch (error) {
      this.logger.error(`删除条目 ${id} 失败`, error)
      return false
    }
  }

  protected abstract parseEntity(content: string): T | null

  protected abstract serializeEntity(item: T): string

  protected abstract toMetadata(item: T): M

  protected abstract sortItems(items: M[]): M[]

  saveThumbnail(id: string, dataUrl: string): string | null {
    try {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      const thumbnailPath = this.getThumbnailPath(id)
      fs.writeFileSync(thumbnailPath, buffer)

      return thumbnailPath
    } catch (error) {
      this.logger.error(`保存条目 ${id} 缩略图失败`, error)
      return null
    }
  }

  async saveThumbnailAsync(id: string, dataUrl: string): Promise<string | null> {
    try {
      const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(base64Data, 'base64')

      const thumbnailPath = this.getThumbnailPath(id)
      await fs.promises.writeFile(thumbnailPath, buffer)

      return thumbnailPath
    } catch (error) {
      this.logger.error(`保存条目 ${id} 缩略图失败`, error)
      return null
    }
  }

  getThumbnailFullPath(id: string): string | null {
    const thumbnailPath = this.getThumbnailPath(id)
    if (fs.existsSync(thumbnailPath)) {
      return thumbnailPath
    }
    return null
  }

  async getThumbnailFullPathAsync(id: string): Promise<string | null> {
    const thumbnailPath = this.getThumbnailPath(id)
    try {
      await fs.promises.access(thumbnailPath)
      return thumbnailPath
    } catch {
      return null
    }
  }

  exportItem(id: string): string | null {
    const item = this.get(id)
    if (!item) return null

    return this.serializeEntity(item)
  }

  async exportItemAsync(id: string): Promise<string | null> {
    const item = await this.getAsync(id)
    if (!item) return null

    return this.serializeEntity(item)
  }

  importItem(jsonContent: string): T | null {
    try {
      const item = this.parseEntity(jsonContent)
      if (!item) return null

      item.id = this.generateId()
      item.createdAt = this.getTimestamp()
      item.updatedAt = this.getTimestamp()

      this.save(item)
      return item
    } catch (error) {
      this.logger.error('导入条目失败', error)
      return null
    }
  }

  async importItemAsync(jsonContent: string): Promise<T | null> {
    try {
      const item = this.parseEntity(jsonContent)
      if (!item) return null

      item.id = this.generateId()
      item.createdAt = this.getTimestamp()
      item.updatedAt = this.getTimestamp()

      await this.saveAsync(item)
      return item
    } catch (error) {
      this.logger.error('导入条目失败', error)
      return null
    }
  }
}
