/**
 * 文件系统相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import path from 'path'
import { writeFile } from 'fs/promises'
import { fileService, SortOptions } from '../services/file'
import { validateParams } from '../utils/validation'

/**
 * 注册文件系统相关 IPC 处理器
 */
export function registerFileHandlers(): void {
  // 检查文件/目录是否存在
  ipcMain.handle('file:exists', async (_, path: string): Promise<boolean> => {
    try {
      // 参数验证
      validateParams('file:exists ').nonEmptyString(path, 'path').validate()
      return await fileService.exists(path)
    } catch (error) {
      console.error('Failed to check file exists:', error)
      throw error
    }
  })

  // 读取文件
  ipcMain.handle(
    'file:read',
    async (_, path: string, encoding?: BufferEncoding): Promise<string> => {
      try {
        // 参数验证
        validateParams('file:read ').nonEmptyString(path, 'path').validate()
        return await fileService.readFile(path, encoding)
      } catch (error) {
        console.error('Failed to read file:', error)
        throw error
      }
    }
  )

  // 写入文件
  ipcMain.handle(
    'file:write',
    async (
      _,
      path: string,
      content: string,
      options?: {
        encoding?: BufferEncoding
        createParentDir?: boolean
      }
    ): Promise<void> => {
      try {
        // 参数验证
        validateParams('file:write ')
          .nonEmptyString(path, 'path')
          .custom(() => {
            if (typeof content !== 'string') {
              throw new Error('content 必须是字符串')
            }
          })
          .validate()
        await fileService.writeFile(path, content, options)
      } catch (error) {
        console.error('Failed to write file:', error)
        throw error
      }
    }
  )

  // 创建目录
  ipcMain.handle('file:mkdir', async (_, path: string, recursive?: boolean): Promise<void> => {
    try {
      // 参数验证
      validateParams('file:mkdir ').nonEmptyString(path, 'path').validate()
      await fileService.mkdir(path, recursive)
    } catch (error) {
      console.error('Failed to create directory:', error)
      throw error
    }
  })

  // 删除文件或目录
  ipcMain.handle(
    'file:delete',
    async (
      _,
      path: string,
      options?: {
        recursive?: boolean
        useTrash?: boolean
      }
    ): Promise<void> => {
      try {
        // 参数验证
        validateParams('file:delete ').nonEmptyString(path, 'path').validate()
        await fileService.delete(path, options)
      } catch (error) {
        console.error('Failed to delete:', error)
        throw error
      }
    }
  )

  // 重命名
  ipcMain.handle('file:rename', async (_, oldPath: string, newPath: string): Promise<void> => {
    try {
      // 参数验证
      validateParams('file:rename ')
        .nonEmptyString(oldPath, 'oldPath')
        .nonEmptyString(newPath, 'newPath')
        .validate()
      await fileService.rename(oldPath, newPath)
    } catch (error) {
      console.error('Failed to rename:', error)
      throw error
    }
  })

  // 复制
  ipcMain.handle(
    'file:copy',
    async (_, source: string, destination: string, overwrite?: boolean): Promise<void> => {
      try {
        // 参数验证
        validateParams('file:copy ')
          .nonEmptyString(source, 'source')
          .nonEmptyString(destination, 'destination')
          .validate()
        await fileService.copy(source, destination, overwrite)
      } catch (error) {
        console.error('Failed to copy:', error)
        throw error
      }
    }
  )

  // 列出目录
  ipcMain.handle(
    'file:list',
    async (
      _,
      path: string,
      options?: {
        recursive?: boolean
        includeHidden?: boolean
      }
    ): Promise<ReturnType<typeof fileService.listDir>> => {
      try {
        // 参数验证
        validateParams('file:list ').nonEmptyString(path, 'path').validate()
        return await fileService.listDir(path, options)
      } catch (error) {
        console.error('Failed to list directory:', error)
        throw error
      }
    }
  )

  // 获取文件树
  ipcMain.handle(
    'file:get-tree',
    async (
      _,
      includeHidden?: boolean,
      sortOptions?: SortOptions,
      hiddenItems?: string[]
    ): Promise<ReturnType<typeof fileService.getFileTree>> => {
      try {
        return await fileService.getFileTree(includeHidden, sortOptions, hiddenItems)
      } catch (error) {
        console.error('Failed to get file tree:', error)
        throw error
      }
    }
  )

  // 获取文件信息
  ipcMain.handle(
    'file:get-info',
    async (_, path: string): Promise<ReturnType<typeof fileService.getFileInfo>> => {
      try {
        // 参数验证
        validateParams('file:get-info ').nonEmptyString(path, 'path').validate()
        return await fileService.getFileInfo(path)
      } catch (error) {
        console.error('Failed to get file info:', error)
        throw error
      }
    }
  )

  // Path API 处理器
  // 解析路径
  ipcMain.handle('path:resolve', async (_, pathSegments: string[]): Promise<string> => {
    try {
      if (!pathSegments.every(s => typeof s === 'string' && s.length < 500)) {
        throw new Error('无效的路径参数')
      }
      const resolved = path.resolve(...pathSegments)
      if (fileService.isPathInProjectPublic(resolved)) {
        return resolved
      }
      return path.basename(resolved)
    } catch (error) {
      console.error('Failed to resolve path:', error)
      throw error
    }
  })

  // 获取路径基础名称
  ipcMain.handle('path:basename', async (_, filePath: string): Promise<string> => {
    try {
      validateParams('path:basename ').nonEmptyString(filePath, 'path').validate()
      return path.basename(filePath)
    } catch (error) {
      console.error('Failed to get basename:', error)
      throw error
    }
  })

  // 获取目录名
  ipcMain.handle('path:dirname', async (_, filePath: string): Promise<string> => {
    try {
      validateParams('path:dirname ').nonEmptyString(filePath, 'path').validate()
      return path.dirname(filePath)
    } catch (error) {
      console.error('Failed to get dirname:', error)
      throw error
    }
  })

  // 连接路径
  ipcMain.handle('path:join', async (_, pathSegments: string[]): Promise<string> => {
    try {
      if (!pathSegments.every(s => typeof s === 'string' && s.length < 500)) {
        throw new Error('无效的路径参数')
      }
      const joined = path.join(...pathSegments)
      if (fileService.isPathInProjectPublic(joined)) {
        return joined
      }
      return path.basename(joined)
    } catch (error) {
      console.error('Failed to join paths:', error)
      throw error
    }
  })

  // 获取相对路径
  ipcMain.handle('path:relative', async (_, from: string, to: string): Promise<string> => {
    try {
      validateParams('path:relative ')
        .nonEmptyString(from, 'from')
        .nonEmptyString(to, 'to')
        .validate()
      return path.relative(from, to)
    } catch (error) {
      console.error('Failed to get relative path:', error)
      throw error
    }
  })

  // 显示保存对话框
  ipcMain.handle(
    'file:showSaveDialog',
    async (
      _,
      options: {
        title?: string
        defaultPath?: string
        filters?: Array<{ name: string; extensions: string[] }>
      }
    ): Promise<string | null> => {
      try {
        const result = await dialog.showSaveDialog({
          title: options.title || '保存文件',
          defaultPath: options.defaultPath,
          filters: options.filters || [{ name: '所有文件', extensions: ['*'] }]
        })
        return result.canceled ? null : result.filePath
      } catch (error) {
        console.error('Failed to show save dialog:', error)
        throw error
      }
    }
  )

  // 导出纯文本文件
  ipcMain.handle(
    'file:exportTxt',
    async (_, filePath: string, content: string): Promise<boolean> => {
      try {
        validateParams('file:exportTxt')
          .nonEmptyString(filePath, 'filePath')
          .string(content, 'content')
          .validate()
        const absolutePath = fileService.safeResolvePathExport(filePath)
        if (!fileService.isPathInProjectPublic(absolutePath)) {
          throw new Error('导出路径不在项目目录内')
        }
        await writeFile(absolutePath, content, 'utf-8')
        return true
      } catch (error) {
        console.error('Failed to export txt file:', error)
        throw error
      }
    }
  )
}
