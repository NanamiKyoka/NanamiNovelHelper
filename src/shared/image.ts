/**
 * 图片相关共享类型定义
 * 主进程和渲染进程共用
 */

// ============================================
// 图片配置
// ============================================

/**
 * 图片字段配置
 */
export interface ImageFieldConfig {
  /** 最大文件大小（字节），默认 5MB */
  maxSize?: number
  /** 允许的图片格式，默认 ['jpg', 'jpeg', 'png', 'gif', 'webp'] */
  allowedFormats?: string[]
  /** 最大宽度（像素），超过则压缩，默认 1920 */
  maxWidth?: number
  /** 最大高度（像素），超过则压缩，默认 1080 */
  maxHeight?: number
  /** 压缩质量（0-100），默认 85 */
  quality?: number
}

// ============================================
// 图片上传结果
// ============================================

/**
 * 图片上传结果
 */
export interface ImageUploadResult {
  /** 图片相对路径 */
  path: string
  /** 原始文件名 */
  originalName: string
  /** 文件大小（字节） */
  size: number
  /** 图片宽度 */
  width: number
  /** 图片高度 */
  height: number
  /** 图片格式 */
  format: string
}
