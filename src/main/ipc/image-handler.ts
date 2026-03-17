/**
 * 图片 IPC 处理器
 */

import { ipcMain } from 'electron'
import { imageService, ImageUploadResult } from '../services/image'
import { projectService } from '../services/project'
import { ImageFieldConfig } from '../types/vocabulary'

/**
 * 注册图片相关 IPC 处理器
 */
export function registerImageHandlers(): void {
  // 从 Base64 上传图片
  ipcMain.handle('image:uploadFromBase64', async (_event, base64Data: string, config?: ImageFieldConfig): Promise<ImageUploadResult> => {
    try {
      const project = projectService.getCurrentProject()
      if (!project) {
        throw new Error('没有打开的项目')
      }
      return await imageService.uploadFromBase64(project.path, base64Data, config)
    } catch (error) {
      console.error('Failed to upload image from base64:', error)
      throw error
    }
  })

  // 从文件路径上传图片
  ipcMain.handle('image:uploadFromFile', async (_event, filePath: string, config?: ImageFieldConfig): Promise<ImageUploadResult> => {
    try {
      const project = projectService.getCurrentProject()
      if (!project) {
        throw new Error('没有打开的项目')
      }
      return await imageService.uploadFromFile(project.path, filePath, config)
    } catch (error) {
      console.error('Failed to upload image from file:', error)
      throw error
    }
  })

  // 显示选择图片对话框并上传
  ipcMain.handle('image:selectAndUpload', async (_event, config?: ImageFieldConfig): Promise<ImageUploadResult | null> => {
    try {
      const project = projectService.getCurrentProject()
      if (!project) {
        throw new Error('没有打开的项目')
      }

      const filePath = await imageService.showOpenDialog()
      if (!filePath) {
        return null
      }

      return await imageService.uploadFromFile(project.path, filePath, config)
    } catch (error) {
      console.error('Failed to select and upload image:', error)
      throw error
    }
  })

  // 删除图片
  ipcMain.handle('image:delete', async (_event, imagePath: string): Promise<void> => {
    try {
      const project = projectService.getCurrentProject()
      if (!project) {
        throw new Error('没有打开的项目')
      }
      await imageService.deleteImage(project.path, imagePath)
    } catch (error) {
      console.error('Failed to delete image:', error)
      throw error
    }
  })

  // 读取图片为 Base64
  ipcMain.handle('image:readAsBase64', async (_event, imagePath: string): Promise<string> => {
    try {
      const project = projectService.getCurrentProject()
      if (!project) {
        throw new Error('没有打开的项目')
      }
      return await imageService.readAsBase64(project.path, imagePath)
    } catch (error) {
      console.error('Failed to read image as base64:', error)
      throw error
    }
  })

  // 检查图片是否存在
  ipcMain.handle('image:exists', (_event, imagePath: string): boolean => {
    try {
      const project = projectService.getCurrentProject()
      if (!project) {
        return false
      }
      return imageService.imageExists(project.path, imagePath)
    } catch (error) {
      console.error('Failed to check image exists:', error)
      return false
    }
  })

  // 获取图片完整路径
  ipcMain.handle('image:getFullPath', (_event, imagePath: string): string => {
    try {
      const project = projectService.getCurrentProject()
      if (!project) {
        throw new Error('没有打开的项目')
      }
      return imageService.getFullImagePath(project.path, imagePath)
    } catch (error) {
      console.error('Failed to get image full path:', error)
      throw error
    }
  })
}
