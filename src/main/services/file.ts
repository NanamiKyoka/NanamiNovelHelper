/**
 * 文件系统服务
 * 提供文件 CRUD 操作
 */

import { app, shell } from 'electron'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
  statSync,
  unlinkSync,
  rmdirSync,
  renameSync,
  copyFileSync,
  rmSync,
  stat
} from 'fs'
import { join, relative, dirname, basename, extname, resolve } from 'path'
import { FileNode } from '../types/file'

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
class FileService {
  private currentProjectPath: string | null = null

  /**
   * 初始化文件服务
   */
  init(projectPath: string): void {
    this.currentProjectPath = projectPath
  }

  /**
   * 获取当前项目路径
   */
  getProjectPath(): string | null {
    return this.currentProjectPath
  }

  /**
   * 解析路径（支持相对路径和绝对路径）
   */
  private resolvePath(path: string): string {
    if (!this.currentProjectPath) {
      throw new Error('没有打开的项目')
    }

    // 统一路径分隔符为当前平台的格式
    const normalizedPath = path.replace(/[/\\]/g, require('path').sep)

    // 如果是绝对路径，直接使用
    // Windows: E:\... 或 E:/...
    // Unix: /...
    if (path.match(/^[A-Za-z]:/) || path.startsWith('/')) {
      return normalizedPath
    }

    // 相对路径，相对于项目根目录
    return join(this.currentProjectPath, normalizedPath)
  }

  /**
   * 检查路径是否在项目目录内（安全检查）
   */
  private isPathInProject(absolutePath: string): boolean {
    if (!this.currentProjectPath) return false
    const relativePath = relative(this.currentProjectPath, absolutePath)
    return !relativePath.startsWith('..') && !relativePath.startsWith('/')
  }

  /**
   * 检查文件/目录是否存在
   */
  exists(path: string): boolean {
    const absolutePath = this.resolvePath(path)
    return existsSync(absolutePath)
  }

  /**
   * 读取文件内容
   */
  readFile(path: string, encoding: BufferEncoding = 'utf-8'): string {
    const absolutePath = this.resolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`文件不存在: ${path}`)
    }

    const stats = statSync(absolutePath)
    if (stats.isDirectory()) {
      throw new Error(`路径是目录，不是文件: ${path}`)
    }

    return readFileSync(absolutePath, encoding)
  }

  /**
   * 写入文件
   */
  writeFile(
    path: string,
    content: string,
    options: { encoding?: BufferEncoding; createParentDir?: boolean } = {}
  ): void {
    const { encoding = 'utf-8', createParentDir = true } = options
    const absolutePath = this.resolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    // 创建父目录
    if (createParentDir) {
      const parentDir = dirname(absolutePath)
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true })
      }
    }

    writeFileSync(absolutePath, content, encoding)
  }

  /**
   * 创建目录
   */
  mkdir(path: string, recursive: boolean = true): void {
    const absolutePath = this.resolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (existsSync(absolutePath)) {
      throw new Error(`目录已存在: ${path}`)
    }

    mkdirSync(absolutePath, { recursive })
  }

  /**
   * 删除文件或目录
   */
  async delete(path: string, options: { recursive?: boolean; useTrash?: boolean } = {}): Promise<void> {
    const { recursive = false, useTrash = true } = options
    const absolutePath = this.resolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`路径不存在: ${path}`)
    }

    const stats = statSync(absolutePath)

    // 尝试使用回收站
    if (useTrash) {
      try {
        await shell.trashItem(absolutePath)
        return
      } catch {
        // 如果回收站失败，继续使用永久删除
        console.warn('移入回收站失败，使用永久删除')
      }
    }

    // 永久删除
    if (stats.isDirectory()) {
      if (recursive) {
        rmSync(absolutePath, { recursive: true, force: true })
      } else {
        const items = readdirSync(absolutePath)
        if (items.length > 0) {
          throw new Error(`目录不为空: ${path}`)
        }
        rmdirSync(absolutePath)
      }
    } else {
      unlinkSync(absolutePath)
    }
  }

  /**
   * 重命名/移动文件或目录
   */
  rename(oldPath: string, newPath: string): void {
    const absoluteOldPath = this.resolvePath(oldPath)
    const absoluteNewPath = this.resolvePath(newPath)

    if (!this.isPathInProject(absoluteOldPath) || !this.isPathInProject(absoluteNewPath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absoluteOldPath)) {
      throw new Error(`源路径不存在: ${oldPath}`)
    }

    if (existsSync(absoluteNewPath)) {
      throw new Error(`目标路径已存在: ${newPath}`)
    }

    // 确保目标父目录存在
    const parentDir = dirname(absoluteNewPath)
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true })
    }

    renameSync(absoluteOldPath, absoluteNewPath)
  }

  /**
   * 复制文件或目录
   */
  copy(source: string, destination: string, overwrite: boolean = false): void {
    const absoluteSource = this.resolvePath(source)
    const absoluteDestination = this.resolvePath(destination)

    if (!this.isPathInProject(absoluteSource) || !this.isPathInProject(absoluteDestination)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absoluteSource)) {
      throw new Error(`源路径不存在: ${source}`)
    }

    if (existsSync(absoluteDestination) && !overwrite) {
      throw new Error(`目标路径已存在: ${destination}`)
    }

    // 确保目标父目录存在
    const parentDir = dirname(absoluteDestination)
    if (!existsSync(parentDir)) {
      mkdirSync(parentDir, { recursive: true })
    }

    const stats = statSync(absoluteSource)

    if (stats.isDirectory()) {
      // 递归复制目录
      this.copyDirectory(absoluteSource, absoluteDestination, overwrite)
    } else {
      copyFileSync(absoluteSource, absoluteDestination)
    }
  }

  /**
   * 递归复制目录
   */
  private copyDirectory(source: string, destination: string, overwrite: boolean): void {
    if (!existsSync(destination)) {
      mkdirSync(destination, { recursive: true })
    }

    const items = readdirSync(source, { withFileTypes: true })

    for (const item of items) {
      const sourcePath = join(source, item.name)
      const destPath = join(destination, item.name)

      if (item.isDirectory()) {
        this.copyDirectory(sourcePath, destPath, overwrite)
      } else {
        if (!existsSync(destPath) || overwrite) {
          copyFileSync(sourcePath, destPath)
        }
      }
    }
  }

  /**
   * 列出目录内容
   */
  listDir(
    path: string,
    options: { recursive?: boolean; includeHidden?: boolean } = {}
  ): FileNode[] {
    const { recursive = false, includeHidden = false } = options
    const absolutePath = this.resolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`目录不存在: ${path}`)
    }

    const stats = statSync(absolutePath)
    if (!stats.isDirectory()) {
      throw new Error(`路径不是目录: ${path}`)
    }

    return this.scanDirectory(absolutePath, recursive, includeHidden)
  }

  /**
   * 扫描目录
   */
  private scanDirectory(
    dirPath: string,
    recursive: boolean,
    includeHidden: boolean,
    sortOptions?: SortOptions
  ): FileNode[] {
    const items = readdirSync(dirPath, { withFileTypes: true })
    const nodes: FileNode[] = []

    for (const item of items) {
      // 跳过隐藏文件
      if (!includeHidden && item.name.startsWith('.')) {
        continue
      }

      const absolutePath = join(dirPath, item.name)
      const relativePath = this.currentProjectPath
        ? relative(this.currentProjectPath, absolutePath)
        : absolutePath

      const stats = statSync(absolutePath)
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
        node.children = this.scanDirectory(absolutePath, recursive, includeHidden, sortOptions)
      }

      nodes.push(node)
    }

    // 排序：目录在前，然后按指定字段排序
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
  getFileTree(includeHidden: boolean = false, sortOptions?: SortOptions): FileNode[] {
    if (!this.currentProjectPath) {
      throw new Error('没有打开的项目')
    }

    return this.scanDirectory(this.currentProjectPath, true, includeHidden, sortOptions)
  }

  /**
   * 获取文件信息
   */
  getFileInfo(path: string): FileNode {
    const absolutePath = this.resolvePath(path)

    if (!this.isPathInProject(absolutePath)) {
      throw new Error('路径不在项目目录内')
    }

    if (!existsSync(absolutePath)) {
      throw new Error(`路径不存在: ${path}`)
    }

    const stats = statSync(absolutePath)
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
