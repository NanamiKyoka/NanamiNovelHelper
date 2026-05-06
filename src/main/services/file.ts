/**
 * 文件系统服务
 * 提供文件 CRUD 操作
 */

import { shell } from 'electron'
import { existsSync, realpathSync } from 'fs'
import {
  readFile,
  writeFile,
  mkdir,
  readdir,
  stat,
  unlink,
  rmdir,
  rename,
  copyFile,
  rm
} from 'fs/promises'
import { join, relative, dirname, basename, extname, resolve, normalize, sep } from 'path'
import { FileNode } from '../types/file'
import { createLogger } from '../utils/logger'

/**
 * 排序选项
 */
export interface SortOptions {
  field: 'name' | 'modified'
  order: 'asc' | 'desc'
}

/**
 * 文件系统服务
 */
function isPathInProjectInternal(absolutePath: string, projectPath: string | null): boolean {
  if (!projectPath) return false

  try {
    const normalizedPath = normalize(absolutePath)
    const normalizedProject = normalize(projectPath)

    if (!existsSync(normalizedPath)) {
      const relativePath = relative(normalizedProject, normalizedPath)
      return !relativePath.startsWith('..') && !relativePath.startsWith('/')
    }

    const realPath = realpathSync(normalizedPath)
    const realProject = realpathSync(normalizedProject)

    const relativePath = relative(realProject, realPath)

    return (
      !relativePath.startsWith('..') &&
      !relativePath.startsWith('/') &&
      !relativePath.startsWith('\\')
    )
  } catch {
    return false
  }
}

class FileService {
  private currentProjectPath: string | null = null
  private logger = createLogger('FileService')

  init(projectPath: string): void {
    this.currentProjectPath = projectPath
  }

  getProjectPath(): string | null {
    return this.currentProjectPath
  }

  private isPathInProject(absolutePath: string): boolean {
    return isPathInProjectInternal(absolutePath, this.currentProjectPath)
  }

  isPathInProjectPublic(absolutePath: string): boolean {
    return isPathInProjectInternal(absolutePath, this.currentProjectPath)
  }

  safeResolvePathExport(inputPath: string): string {
    return this.safeResolvePath(inputPath)
  }

  /**
   * 安全解析路径，防止路径遍历攻击
   */
  private safeResolvePath(inputPath: string): string {
    if (!this.currentProjectPath) {
      throw new Error('没有打开的项目')
    }

    const normalizedInput = inputPath.replace(/[/\\]/g, sep)

    if (normalizedInput.match(/^[A-Za-z]:/) || normalizedInput.startsWith(sep)) {
      const resolved = resolve(normalizedInput)
      if (!this.isPathInProject(resolved)) {
        throw new Error('路径不在项目目录内')
      }
      return resolved
    }

    const resolved = resolve(this.currentProjectPath, normalizedInput)
    if (!this.isPathInProject(resolved)) {
      throw new Error('路径不在项目目录内')
    }

    return resolved
  }

  /**
   * 检查文件/目录是否存在
   */
  async exists(path: string): Promise<boolean> {
    const absolutePath = this.safeResolvePath(path)
    return existsSync(absolutePath)
  }

  /**
   * 读取文件内容
   */
  async readFile(path: string, encoding: BufferEncoding = 'utf-8'): Promise<string> {
    const absolutePath = this.safeResolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`文件不存在: ${path}`)
    }

    const stats = await stat(absolutePath)
    if (stats.isDirectory()) {
      throw new Error(`路径是目录，不是文件: ${path}`)
    }

    return readFile(absolutePath, encoding)
  }

  /**
   * 写入文件
   */
  async writeFile(
    path: string,
    content: string,
    options: { encoding?: BufferEncoding; createParentDir?: boolean } = {}
  ): Promise<void> {
    const { encoding = 'utf-8', createParentDir = true } = options
    const absolutePath = this.safeResolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (createParentDir) {
      const parentDir = dirname(absolutePath)
      if (!existsSync(parentDir)) {
        await mkdir(parentDir, { recursive: true })
      }
    }

    await writeFile(absolutePath, content, encoding)
  }

  /**
   * 创建目录
   */
  async mkdir(path: string, recursive: boolean = true): Promise<void> {
    const absolutePath = this.safeResolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (existsSync(absolutePath)) {
      throw new Error(`目录已存在: ${path}`)
    }

    await mkdir(absolutePath, { recursive })
  }

  /**
   * 删除文件或目录
   */
  async delete(
    path: string,
    options: { recursive?: boolean; useTrash?: boolean } = {}
  ): Promise<void> {
    const { recursive = false, useTrash = true } = options
    const absolutePath = this.safeResolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`路径不存在: ${path}`)
    }

    const stats = await stat(absolutePath)

    if (useTrash) {
      try {
        await shell.trashItem(absolutePath)
        return
      } catch {
        this.logger.warn('移入回收站失败，使用永久删除')
      }
    }

    if (stats.isDirectory()) {
      if (recursive) {
        await rm(absolutePath, { recursive: true, force: true })
      } else {
        const items = await readdir(absolutePath)
        if (items.length > 0) {
          throw new Error(`目录不为空: ${path}`)
        }
        await rmdir(absolutePath)
      }
    } else {
      await unlink(absolutePath)
    }
  }

  /**
   * 重命名/移动文件或目录
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    const absoluteOldPath = this.safeResolvePath(oldPath)
    const absoluteNewPath = this.safeResolvePath(newPath)

    if (!this.isPathInProject(absoluteOldPath) || !this.isPathInProject(absoluteNewPath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absoluteOldPath)) {
      throw new Error(`源路径不存在: ${oldPath}`)
    }

    if (absoluteOldPath === absoluteNewPath) {
      return
    }

    if (existsSync(absoluteNewPath)) {
      throw new Error(`目标路径已存在: ${newPath}`)
    }

    const parentDir = dirname(absoluteNewPath)
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true })
    }

    await rename(absoluteOldPath, absoluteNewPath)
  }

  /**
   * 复制文件或目录
   */
  async copy(source: string, destination: string, overwrite: boolean = false): Promise<void> {
    const absoluteSource = this.safeResolvePath(source)
    const absoluteDestination = this.safeResolvePath(destination)

    if (!this.isPathInProject(absoluteSource) || !this.isPathInProject(absoluteDestination)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absoluteSource)) {
      throw new Error(`源路径不存在: ${source}`)
    }

    if (existsSync(absoluteDestination) && !overwrite) {
      throw new Error(`目标路径已存在: ${destination}`)
    }

    const parentDir = dirname(absoluteDestination)
    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true })
    }

    const stats = await stat(absoluteSource)

    if (stats.isDirectory()) {
      await this.copyDirectory(absoluteSource, absoluteDestination, overwrite)
    } else {
      await copyFile(absoluteSource, absoluteDestination)
    }
  }

  private async copyDirectory(
    source: string,
    destination: string,
    overwrite: boolean
  ): Promise<void> {
    if (!existsSync(destination)) {
      await mkdir(destination, { recursive: true })
    }

    const items = await readdir(source, { withFileTypes: true })

    for (const item of items) {
      const sourcePath = join(source, item.name)
      const destPath = join(destination, item.name)

      if (item.isDirectory()) {
        await this.copyDirectory(sourcePath, destPath, overwrite)
      } else {
        if (!existsSync(destPath) || overwrite) {
          await copyFile(sourcePath, destPath)
        }
      }
    }
  }

  /**
   * 列出目录内容
   */
  async listDir(
    path: string,
    options: { recursive?: boolean; includeHidden?: boolean } = {}
  ): Promise<FileNode[]> {
    const { recursive = false, includeHidden = false } = options
    const absolutePath = this.safeResolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`目录不存在: ${path}`)
    }

    const stats = await stat(absolutePath)
    if (!stats.isDirectory()) {
      throw new Error(`路径不是目录: ${path}`)
    }

    return this.scanDirectory(absolutePath, recursive, includeHidden)
  }

  private async scanDirectory(
    dirPath: string,
    recursive: boolean,
    includeHidden: boolean,
    sortOptions?: SortOptions,
    hiddenItems?: string[]
  ): Promise<FileNode[]> {
    const items = await readdir(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    for (const item of items) {
      if (!includeHidden && item.name.startsWith('.')) {
        continue
      }

      const absolutePath = join(dirPath, item.name)
      const relativePath = this.currentProjectPath
        ? relative(this.currentProjectPath, absolutePath)
        : absolutePath

      if (hiddenItems && hiddenItems.includes(relativePath)) {
        continue
      }

      const stats = await stat(absolutePath)
      const isDirectory = item.isDirectory()

      const node: FileNode = {
        key: relativePath,
        name: item.name,
        path: relativePath,
        isDirectory,
        extension: isDirectory ? undefined : extname(item.name),
        size: stats.size,
        modifiedAt: stats.mtime.toISOString()
      }

      if (recursive && isDirectory) {
        node.children = await this.scanDirectory(
          absolutePath,
          recursive,
          includeHidden,
          sortOptions,
          hiddenItems
        )
      }

      nodes.push(node)
    }

    return this.sortNodes(nodes, sortOptions)
  }

  /**
   * 对文件节点进行排序
   */
  private sortNodes(nodes: FileNode[], sortOptions?: SortOptions): FileNode[] {
    const { field = 'name', order = 'asc' } = sortOptions || {}

    return nodes.sort((a, b) => {
      // 目录始终在前
      if (a.isDirectory !== b.isDirectory) {
        return a.isDirectory ? -1 : 1
      }

      let comparison = 0

      if (field === 'name') {
        // 使用中文拼音排序
        comparison = a.name.localeCompare(b.name, 'zh-CN')
      } else if (field === 'modified') {
        // 按修改时间排序
        const timeA = a.modifiedAt ? new Date(a.modifiedAt).getTime() : 0
        const timeB = b.modifiedAt ? new Date(b.modifiedAt).getTime() : 0
        comparison = timeA - timeB
      }

      return order === 'desc' ? -comparison : comparison
    })
  }

  /**
   * 获取文件树
   */
  async getFileTree(
    includeHidden: boolean = false,
    sortOptions?: SortOptions,
    hiddenItems?: string[]
  ): Promise<FileNode[]> {
    if (!this.currentProjectPath) {
      throw new Error('没有打开的项目')
    }

    return this.scanDirectory(
      this.currentProjectPath,
      true,
      includeHidden,
      sortOptions,
      hiddenItems
    )
  }

  async getFileInfo(path: string): Promise<FileNode> {
    const absolutePath = this.safeResolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`路径不存在: ${path}`)
    }

    const stats = await stat(absolutePath)
    const relativePath = this.currentProjectPath
      ? relative(this.currentProjectPath, absolutePath)
      : absolutePath

    return {
      key: relativePath,
      name: basename(absolutePath),
      path: relativePath,
      isDirectory: stats.isDirectory(),
      extension: stats.isDirectory() ? undefined : extname(absolutePath),
      size: stats.size,
      modifiedAt: stats.mtime.toISOString()
    }
  }
}

// 导出单例
export const fileService = new FileService()
