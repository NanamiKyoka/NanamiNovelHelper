import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import JSON5 from 'json5'
import { createLogger } from '../utils/logger'

export abstract class ServiceCore {
  protected projectPath: string | null = null
  protected dataDir: string | null = null

  protected logger = createLogger(this.constructor.name)

  protected readonly PROJECT_META_DIR = '.novelhelper'
  protected readonly DATA_DIR = 'data'

  protected generateId(): string {
    return uuidv4()
  }

  protected getTimestamp(): string {
    return new Date().toISOString()
  }

  protected ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true })
    }
  }

  protected async ensureDirAsync(dirPath: string): Promise<void> {
    try {
      await fs.promises.access(dirPath)
    } catch {
      await fs.promises.mkdir(dirPath, { recursive: true })
    }
  }

  protected ensureDirectories(): void {
    if (!this.dataDir) return
    this.ensureDir(this.dataDir)
  }

  protected async ensureDirectoriesAsync(): Promise<void> {
    if (!this.dataDir) return
    await this.ensureDirAsync(this.dataDir)
  }

  protected readJson5File<T>(filePath: string): T | null {
    if (!fs.existsSync(filePath)) return null
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON5.parse(content) as T
    } catch (error) {
      this.logger.error(`Failed to read JSON5 file: ${filePath}`, error)
      return null
    }
  }

  protected async readJson5FileAsync<T>(filePath: string): Promise<T | null> {
    try {
      await fs.promises.access(filePath)
    } catch {
      return null
    }
    try {
      const content = await fs.promises.readFile(filePath, 'utf-8')
      return JSON5.parse(content) as T
    } catch (error) {
      this.logger.error(`Failed to read JSON5 file: ${filePath}`, error)
      return null
    }
  }

  protected writeJson5File<T>(filePath: string, data: T): void {
    const dir = path.dirname(filePath)
    this.ensureDir(dir)
    fs.writeFileSync(filePath, JSON5.stringify(data, null, 2), 'utf-8')
  }

  protected async writeJson5FileAsync<T>(filePath: string, data: T): Promise<void> {
    const dir = path.dirname(filePath)
    await this.ensureDirAsync(dir)
    await fs.promises.writeFile(filePath, JSON5.stringify(data, null, 2), 'utf-8')
  }

  protected checkInitialized(): boolean {
    return this.dataDir !== null
  }

  reset(): void {
    this.projectPath = null
    this.dataDir = null
  }
}
