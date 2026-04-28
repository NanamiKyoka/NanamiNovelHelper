/**
 * 图片上传组件
 * 支持文件选择、拖拽、粘贴上传
 */

import { useState, useRef, useCallback, useEffect } from 'react'
import { Button, message, Spin, Image } from 'antd'
import { PictureOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons'
import type { ImageFieldConfig } from '@shared/vocabulary'
import styles from './ImageUpload.module.css'

interface ImageUploadProps {
  /** 图片值：相对路径或 Base64 */
  value?: string
  /** 变化回调 */
  onChange?: (value: string) => void
  /** 字段配置 */
  config?: ImageFieldConfig
  /** 是否禁用 */
  disabled?: boolean
}

// 默认配置
const DEFAULT_CONFIG: Required<ImageFieldConfig> = {
  maxSize: 5 * 1024 * 1024, // 5MB
  allowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
  maxWidth: 1920,
  maxHeight: 1080,
  quality: 85
}

function ImageUpload({ value, onChange, config, disabled }: ImageUploadProps): JSX.Element {
  const [loading, setLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  // 加载图片预览
  useEffect(() => {
    if (!value) {
      setPreviewUrl('')
      return
    }

    // 如果是 Base64，直接使用
    if (value.startsWith('data:')) {
      setPreviewUrl(value)
      return
    }

    // 如果是文件路径，读取为 Base64
    const loadPreview = async (): Promise<void> => {
      try {
        const base64 = await window.electron.image.readAsBase64(value)
        setPreviewUrl(base64)
      } catch (error) {
        console.error('Failed to load image preview:', error)
        setPreviewUrl('')
      }
    }
    loadPreview()
  }, [value])

  // 处理文件上传
  const handleUpload = useCallback(
    async (file: File): Promise<void> => {
      if (disabled) return

      // 检查格式
      const ext = file.name.split('.').pop()?.toLowerCase() || ''
      if (!finalConfig.allowedFormats.includes(ext)) {
        message.error(`不支持的图片格式: ${ext}`)
        return
      }

      // 检查大小
      if (file.size > finalConfig.maxSize) {
        message.error(
          `图片大小超出限制: ${(file.size / 1024 / 1024).toFixed(2)}MB > ${(finalConfig.maxSize / 1024 / 1024).toFixed(2)}MB`
        )
        return
      }

      setLoading(true)
      try {
        // 读取文件为 Base64
        const reader = new FileReader()
        reader.onload = async e => {
          const base64 = e.target?.result as string
          try {
            // 上传到主进程处理（压缩、保存）
            const result = await window.electron.image.uploadFromBase64(base64, {
              maxSize: finalConfig.maxSize,
              allowedFormats: finalConfig.allowedFormats,
              maxWidth: finalConfig.maxWidth,
              maxHeight: finalConfig.maxHeight,
              quality: finalConfig.quality
            })
            onChange?.(result.path)
            message.success('图片上传成功')
          } catch (error) {
            console.error('Failed to upload image:', error)
            message.error('图片上传失败')
          } finally {
            setLoading(false)
          }
        }
        reader.onerror = () => {
          message.error('读取文件失败')
          setLoading(false)
        }
        reader.readAsDataURL(file)
      } catch (error) {
        console.error('Failed to upload image:', error)
        message.error('图片上传失败')
        setLoading(false)
      }
    },
    [disabled, finalConfig, onChange]
  )

  // 文件输入变化
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
    // 重置 input 以允许重复选择同一文件
    e.target.value = ''
  }

  // 拖拽事件处理
  const handleDragOver = (e: React.DragEvent): void => {
    e.preventDefault()
    if (!disabled) {
      setDragOver(true)
    }
  }

  const handleDragLeave = (e: React.DragEvent): void => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent): void => {
    e.preventDefault()
    setDragOver(false)
    if (disabled) return

    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) {
      handleUpload(file)
    }
  }

  // 粘贴事件处理
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent): void => {
      if (disabled) return

      // 检查是否在当前组件内聚焦
      if (!containerRef.current?.contains(document.activeElement)) {
        return
      }

      const items = e.clipboardData?.items
      if (!items) return

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            handleUpload(file)
            e.preventDefault()
            break
          }
        }
      }
    }

    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [disabled, handleUpload])

  // 删除图片
  const handleDelete = async (): Promise<void> => {
    if (value && !value.startsWith('data:')) {
      try {
        await window.electron.image.delete(value)
      } catch (error) {
        console.error('Failed to delete image:', error)
      }
    }
    onChange?.('')
  }

  // 打开文件选择对话框
  const handleSelectFromDialog = async (): Promise<void> => {
    if (disabled) return
    setLoading(true)
    try {
      const result = await window.electron.image.selectAndUpload({
        maxSize: finalConfig.maxSize,
        allowedFormats: finalConfig.allowedFormats,
        maxWidth: finalConfig.maxWidth,
        maxHeight: finalConfig.maxHeight,
        quality: finalConfig.quality
      })
      if (result) {
        onChange?.(result.path)
        message.success('图片上传成功')
      }
    } catch (error) {
      console.error('Failed to select image:', error)
      message.error('图片选择失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${dragOver ? styles.dragOver : ''} ${disabled ? styles.disabled : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      tabIndex={0}
    >
      {loading && (
        <div className={styles.loading}>
          <Spin />
        </div>
      )}

      {value && previewUrl ? (
        // 已上传图片
        <div className={styles.preview}>
          <Image
            src={previewUrl}
            alt="预览"
            className={styles.image}
            wrapperClassName={styles.imageWrapper}
            placeholder
          />
          <div className={styles.actions}>
            <Button
              size="small"
              icon={<UploadOutlined />}
              onClick={handleSelectFromDialog}
              disabled={disabled}
            >
              更换
            </Button>
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={handleDelete}
              disabled={disabled}
            >
              删除
            </Button>
          </div>
        </div>
      ) : (
        // 上传区域
        <div className={styles.uploadArea}>
          <PictureOutlined className={styles.icon} />
          <p className={styles.text}>拖拽图片到此处</p>
          <p className={styles.hint}>或粘贴 / 点击选择</p>
          <div className={styles.buttons}>
            <Button
              type="primary"
              size="small"
              onClick={handleSelectFromDialog}
              disabled={disabled}
            >
              选择图片
            </Button>
          </div>
          <p className={styles.formats}>
            支持: {finalConfig.allowedFormats.join(', ').toUpperCase()} | 最大:{' '}
            {(finalConfig.maxSize / 1024 / 1024).toFixed(0)}MB
          </p>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}

export default ImageUpload
