/**
 * 文件系统相关 IPC 处理器
 */

import { ipcMain } from 'electron'
import { fileService, SortOptions } from '../services/file'

/**
 * 注册文件系统相关 IPC 处理器
 */
export function registerFileHandlers(): void {
  // 检查文件/目录是否存在
  ipcMain.handle('file:exists', async (_, path: string): Promise<boolean> => {
    try {
      return fileService.exists(path)
    } catch (error) {
      console.error('Failed to check file exists:', error)
      throw error
    }
  })

  // 读取文件
  ipcMain.handle('file:read', async (_, path: string, encoding?: BufferEncoding): Promise<string> => {
    try {
      return fileService.readFile(path, encoding)
    } catch (error) {
      console.error('Failed to read file:', error)
      throw error
    }
  })

  // 写入文件
  ipcMain.handle('file:write', async (_, path: string, content: string, options?: {
    encoding?: BufferEncoding
    createParentDir?: boolean
  }): Promise<void> => {
    try {
      fileService.writeFile(path, content, options)
    } catch (error) {
      console.error('Failed to write file:', error)
      throw error
    }
  })

  // 创建目录
  ipcMain.handle('file:mkdir', async (_, path: string, recursive?: boolean): Promise<void> => {
    try {
      fileService.mkdir(path, recursive)
    } catch (error) {
      console.error('Failed to create directory:', error)
      throw error
    }
  })

  // 删除文件或目录
  ipcMain.handle('file:delete', async (_, path: string, options?: {
    recursive?: boolean
    useTrash?: boolean
  }): Promise<void> => {
    try {
      await fileService.delete(path, options)
    } catch (error) {
      console.error('Failed to delete:', error)
      throw error
    }
  })

  // 重命名
  ipcMain.handle('file:rename', async (_, oldPath: string, newPath: string): Promise<void> => {
    try {
      fileService.rename(oldPath, newPath)
    } catch (error) {
      console.error('Failed to rename:', error)
      throw error
    }
  })

  // 复制
  ipcMain.handle('file:copy', async (_, source: string, destination: string, overwrite?: boolean): Promise<void> => {
    try {
      fileService.copy(source, destination, overwrite)
    } catch (error) {
      console.error('Failed to copy:', error)
      throw error
    }
  })

  // 列出目录
  ipcMain.handle('file:list', async (_, path: string, options?: {
    recursive?: boolean
    includeHidden?: boolean
  }): Promise<ReturnType<typeof fileService.listDir>> => {
    try {
      return fileService.listDir(path, options)
    } catch (error) {
      console.error('Failed to list directory:', error)
      throw error
    }
  })

  // 获取文件树
  ipcMain.handle('file:get-tree', async (_, includeHidden?: boolean, sortOptions?: SortOptions, hiddenItems?: string[]): Promise<ReturnType<typeof fileService.getFileTree>> => {
    try {
      return fileService.getFileTree(includeHidden, sortOptions, hiddenItems)
    } catch (error) {
      console.error('Failed to get file tree:', error)
      throw error
    }
  })

  // 获取文件信息
  ipcMain.handle('file:get-info', async (_, path: string): Promise<ReturnType<typeof fileService.getFileInfo>> => {
    try {
      return fileService.getFileInfo(path)
    } catch (error) {
      console.error('Failed to get file info:', error)
      throw error
    }
  })
}
