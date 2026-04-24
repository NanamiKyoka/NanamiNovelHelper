/**
 * 图片管理服务
 * 负责图片的上传、压缩、存储等
 */

import { join, extname } from 'path'
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import sharp from 'sharp'
import { dialog } from 'electron'
import {
  PROJECT_META_DIR,
  IMAGES_DIR
} from '../types/project'
import { ImageFieldConfig } from '../types/vocabulary'

/**
 * 默认图片配置
 */
const DEFAULT_IMAGE_CONFIG: Required<ImageFieldConfig> = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85
}

/**
 * 上传结果
 */
export interface ImageUploadResult {
  /** 存储路径（相对于项目根目录） */
  path: string
  /** 原始文件名 */
  originalName: string
  /** 文件大小（字节） */
  size: number
  /** 图片宽度 */
  width: number
  /** 图片高度 */
  height: number
  /** 格式 */
  format: string
}

/**
 * 图片服务
 */
class ImageService {
  /**
   * 获取图片存储目录路径
   */
  private getImagesDir(projectPath: string): string {
    return join(projectPath, PROJECT_META_DIR, IMAGES_DIR)
  }

  /**
   * 确保图片目录存在
   */
  private ensureImagesDir(projectPath: string): string {
    const imagesDir = this.getImagesDir(projectPath)
    if (!existsSync(imagesDir)) {
      mkdirSync(imagesDir, { recursive: true })
    }
    return imagesDir
  }

  /**
   * 从 Base64 上传图片
   * @param projectPath 项目路径
   * @param base64Data Base64 数据（可含 data:image/xxx;base64, 前缀）
   * @param config 图片配置
   */
  async uploadFromBase64(
    projectPath: string,
    base64Data: string,
    config?: ImageFieldConfig
  ): Promise<ImageUploadResult> {
    const finalConfig = { ...DEFAULT_IMAGE_CONFIG, ...config }

    // 解析 Base64 数据
    let data: string
    let format: string

    if (base64Data.startsWith('data:')) {
      // 解析 data URL
      const match = base64Data.match(/^data:image\/(\w+);base64,(.+)$/)
      if (!match) {
        throw new Error('无效的图片数据格式')
      }
      format = match[1].toLowerCase()
      data = match[2]
    } else {
      // 纯 Base64，默认 PNG
      data = base64Data
      format = 'png'
    }

    // 检查格式
    if (!finalConfig.allowedFormats.includes(format)) {
      throw new Error(`不支持的图片格式: ${format}。允许的格式: ${finalConfig.allowedFormats.join(', ')}`)
    }

    // 解码 Base64
    const buffer = Buffer.from(data, 'base64')

    // 检查大小
    if (buffer.length > finalConfig.maxSize) {
      throw new Error(`图片大小超出限制: ${(buffer.length / 1024 / 1024).toFixed(2)}MB > ${(finalConfig.maxSize / 1024 / 1024).toFixed(2)}MB`)
    }

    // 处理图片（压缩、调整尺寸）
    return await this.processAndSave(projectPath, buffer, format, finalConfig)
  }

  /**
   * 从文件路径上传图片
   * @param projectPath 项目路径
   * @param filePath 文件路径
   * @param config 图片配置
   */
  async uploadFromFile(
    projectPath: string,
    filePath: string,
    config?: ImageFieldConfig
  ): Promise<ImageUploadResult> {
    const finalConfig = { ...DEFAULT_IMAGE_CONFIG, ...config }

    // 获取扩展名
    const ext = extname(filePath).toLowerCase().slice(1)
    const format = ext === 'jpg' ? 'jpeg' : ext

    // 检查格式
    if (!finalConfig.allowedFormats.includes(format) && !finalConfig.allowedFormats.includes(ext)) {
      throw new Error(`不支持的图片格式: ${ext}。允许的格式: ${finalConfig.allowedFormats.join(', ')}`)
    }

    // 读取文件
    const buffer = readFileSync(filePath)

    // 检查大小
    if (buffer.length > finalConfig.maxSize) {
      throw new Error(`图片大小超出限制: ${(buffer.length / 1024 / 1024).toFixed(2)}MB > ${(finalConfig.maxSize / 1024 / 1024).toFixed(2)}MB`)
    }

    return await this.processAndSave(projectPath, buffer, format, finalConfig, filePath)
  }

  /**
   * 处理并保存图片
   */
  private async processAndSave(
    projectPath: string,
    buffer: Buffer,
    format: string,
    config: Required<ImageFieldConfig>,
    originalPath?: string
  ): Promise<ImageUploadResult> {
    // 确保目录存在
    const imagesDir = this.ensureImagesDir(projectPath)

    // 使用 sharp 处理图片
    let image = sharp(buffer)
    const metadata = await image.metadata()

    // 计算是否需要缩放
    let needsResize = false
    let width = metadata.width || 0
    let height = metadata.height || 0

    if (width > config.maxWidth || height > config.maxHeight) {
      needsResize = true
    }

    // 缩放图片
    if (needsResize) {
      image = image.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
    }

    // 根据格式设置质量
    const outputFormat = format === 'gif' ? 'png' : format as 'jpeg' | 'png' | 'webp'
    const outputExt = format === 'gif' ? 'png' : format

    if (outputFormat === 'jpeg') {
      image = image.jpeg({ quality: config.quality })
    } else if (outputFormat === 'webp') {
      image = image.webp({ quality: config.quality })
    } else {
      image = image.png({ compressionLevel: 6 })
    }

    // 生成文件名
    const filename = `${uuidv4()}.${outputExt}`
    const fullPath = join(imagesDir, filename)

    // 保存文件
    await image.toFile(fullPath)

    // 获取处理后的图片信息
    const processedMetadata = await sharp(fullPath).metadata()
    const stats = await sharp(fullPath).stats()

    return {
      path: `${PROJECT_META_DIR}/${IMAGES_DIR}/${filename}`,
      originalName: originalPath ? originalPath.split(/[/\\]/).pop() || filename : filename,
      size: stats.size || 0,
      width: processedMetadata.width || 0,
      height: processedMetadata.height || 0,
      format: outputExt
    }
  }

  /**
   * 删除图片
   * @param projectPath 项目路径
   * @param imagePath 图片路径（相对于项目根目录）
   */
  async deleteImage(projectPath: string, imagePath: string): Promise<void> {
    const fullPath = join(projectPath, imagePath)
    if (existsSync(fullPath)) {
      unlinkSync(fullPath)
    }
  }

  /**
   * 获取图片的完整路径
   * @param projectPath 项目路径
   * @param imagePath 图片路径（相对于项目根目录）
   */
  getFullImagePath(projectPath: string, imagePath: string): string {
    // 如果是 Base64 数据，直接返回
    if (imagePath.startsWith('data:')) {
      return imagePath
    }
    return join(projectPath, imagePath)
  }

  /**
   * 检查图片是否存在
   * @param projectPath 项目路径
   * @param imagePath 图片路径（相对于项目根目录）
   */
  imageExists(projectPath: string, imagePath: string): boolean {
    // Base64 数据总是存在
    if (imagePath.startsWith('data:')) {
      return true
    }
    return existsSync(join(projectPath, imagePath))
  }

  /**
   * 显示选择图片对话框
   */
  async showOpenDialog(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择图片',
      properties: ['openFile'],
      filters: [
        { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] }
      ]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  /**
   * 读取图片为 Base64
   * @param projectPath 项目路径
   * @param imagePath 图片路径（相对于项目根目录）
   */
  async readAsBase64(projectPath: string, imagePath: string): Promise<string> {
    // 如果已经是 Base64，直接返回
    if (imagePath.startsWith('data:')) {
      return imagePath
    }

    const fullPath = join(projectPath, imagePath)
    if (!existsSync(fullPath)) {
      throw new Error('图片文件不存在')
    }

    const buffer = readFileSync(fullPath)
    const ext = extname(imagePath).toLowerCase().slice(1)
    const mimeType = ext === 'jpg' ? 'jpeg' : ext

    return `data:image/${mimeType};base64,${buffer.toString('base64')}`
  }
}

// 导出单例
export const imageService = new ImageService()
