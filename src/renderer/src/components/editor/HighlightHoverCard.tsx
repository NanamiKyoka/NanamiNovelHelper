/**
 * 高亮词汇悬浮卡片组件
 * 参考 novel-helper 的悬浮提示实现
 */

import { useMemo, useEffect, useRef, useState } from 'react'
import { Card, Tag, Typography, Divider } from 'antd'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useSensitiveStore } from '@stores/sensitiveStore'
import { useHighlightService } from '@services/highlightService'
import type { VocabularyType, FieldDefinition } from '@shared/vocabulary'
import type { HoverCardConfig, HoverCardFieldConfig } from '@shared/highlight'
import styles from './HighlightHoverCard.module.css'

const { Text } = Typography

interface HighlightHoverCardProps {
  /** 词汇条目 ID */
  entryId: string
  /** 是否为敏感词 */
  isSensitive?: boolean
  /** 敏感词严重程度 */
  severity?: string
  /** 悬浮卡片配置 */
  config?: HoverCardConfig
  /** 定位位置 */
  position: { x: number; y: number }
  /** 是否显示 */
  visible: boolean
  /** 关闭回调 */
  onClose?: () => void
}

/**
 * 格式化字段值显示
 */
function formatFieldValue(value: unknown): string {
  if (value === undefined || value === null) return '-'
  // 处理 ColorPicker 对象
  if (typeof value === 'object' && !Array.isArray(value)) {
    const colorObj = value as {
      toHexString?: () => string
      metaColor?: { toHexString?: () => string }
    }
    if (colorObj.toHexString) {
      return colorObj.toHexString()
    }
    if (colorObj.metaColor?.toHexString) {
      return colorObj.metaColor.toHexString()
    }
    return '-'
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '-'
  }
  if (typeof value === 'string') {
    return value || '-'
  }
  return String(value)
}

/**
 * 检查值是否为颜色对象或颜色字符串
 */
function isColorValue(value: unknown): boolean {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
    return true
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const colorObj = value as {
      toHexString?: () => string
      metaColor?: { toHexString?: () => string }
    }
    return !!(colorObj.toHexString || colorObj.metaColor?.toHexString)
  }
  return false
}

/**
 * 获取颜色字符串
 */
function getColorString(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const colorObj = value as {
      toHexString?: () => string
      metaColor?: { toHexString?: () => string }
    }
    if (colorObj.toHexString) return colorObj.toHexString()
    if (colorObj.metaColor?.toHexString) return colorObj.metaColor.toHexString()
  }
  return '#000000'
}

/**
 * 获取字段定义
 */
function getFieldDefinition(fieldId: string, type: VocabularyType | undefined): FieldDefinition | undefined {
  if (!type) return undefined
  return (type.fields || []).find(f => f.id === fieldId)
}

/**
 * 获取字段显示名称
 */
function getFieldDisplayName(fieldId: string, type: VocabularyType | undefined): string {
  if (!type) return fieldId
  const field = (type.fields || []).find(f => f.id === fieldId)
  return field?.name || fieldId
}

/**
 * 悬浮卡片组件
 */
export function HighlightHoverCard({
  entryId,
  isSensitive = false,
  config,
  position,
  visible
}: HighlightHoverCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [adjustedPosition, setAdjustedPosition] = useState(position)

  // 获取词汇数据
  const { findEntry, findType } = useVocabularyStore()
  const { findWord } = useSensitiveStore()
  const { hoverCardConfig } = useHighlightService()

  // 使用传入的配置或 store 中的配置
  const activeConfig = config || hoverCardConfig || { enabled: true, delay: 300, typeConfigs: [] }

  // 查找词汇条目或敏感词
  const entry = useMemo(() => {
    if (isSensitive) return null
    return findEntry(entryId)
  }, [entryId, isSensitive, findEntry])

  const sensitiveWord = useMemo(() => {
    if (!isSensitive) return null
    return findWord(entryId)
  }, [entryId, isSensitive, findWord])

  // 获取词汇类型
  const vocabularyType = useMemo(() => {
    if (!entry) return null
    return findType(entry.typeId)
  }, [entry, findType])

  // 获取该类型的字段显示配置
  const fieldConfig = useMemo((): string[] => {
    if (!vocabularyType) return []

    // 如果有配置，使用配置的字段列表
    if (activeConfig.typeConfigs) {
      const typeConfig = activeConfig.typeConfigs.find(tc => tc.typeId === vocabularyType.id)
      // 如果存在该类型的配置（即使 fields 为空），使用配置值
      if (typeConfig) {
        if (!typeConfig.fields || typeConfig.fields.length === 0) {
          // 配置存在但 fields 为空，表示用户不想显示任何字段
          return []
        }
        // 检查 fields 是 string[] 还是 HoverCardFieldConfig[]
        const firstField = typeConfig.fields[0]
        if (typeof firstField === 'string') {
          return typeConfig.fields as string[]
        } else {
          // HoverCardFieldConfig[] 类型，提取 visible 为 true 的 fieldId
          return (typeConfig.fields as HoverCardFieldConfig[])
            .filter(f => f.visible)
            .sort((a, b) => a.order - b.order)
            .map(f => f.fieldId)
        }
      }
    }

    // 只有当配置中不存在该类型的配置时，才使用默认值
    return (vocabularyType.fields || []).filter(f => !['name', 'type'].includes(f.id)).map(f => f.id)
  }, [vocabularyType, activeConfig.typeConfigs])

  // 调整位置，确保不超出视口
  useEffect(() => {
    if (!visible || !cardRef.current) {
      setAdjustedPosition(position)
      return
    }

    const rect = cardRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let x = position.x + 10
    let y = position.y + 10

    // 右侧超出
    if (x + rect.width > viewportWidth - 20) {
      x = position.x - rect.width - 10
    }

    // 底部超出
    if (y + rect.height > viewportHeight - 20) {
      y = position.y - rect.height - 10
    }

    // 确保不超出左侧和顶部
    x = Math.max(10, x)
    y = Math.max(10, y)

    setAdjustedPosition({ x, y })
  }, [visible, position])

  if (!visible) return null
  if (!activeConfig.enabled) return null

  // 渲染敏感词卡片
  if (isSensitive && sensitiveWord) {
    return (
      <div
        ref={cardRef}
        className={styles.hoverCard}
        style={{
          left: adjustedPosition.x,
          top: adjustedPosition.y
        }}
      >
        <Card size="small" className={styles.card} styles={{ body: { padding: '8px 12px' } }}>
          <div className={styles.header}>
            <Text strong className={styles.name}>
              {sensitiveWord.name}
            </Text>
            <Tag color={getSeverityColor(sensitiveWord.severity)}>
              {getSeverityText(sensitiveWord.severity)}
            </Tag>
          </div>

          {sensitiveWord.category && (
            <div className={styles.fieldRow}>
              <Text type="secondary" className={styles.label}>
                类别:
              </Text>
              <Text>{sensitiveWord.category}</Text>
            </div>
          )}

          {sensitiveWord.suggestion && (
            <div className={styles.fieldRow}>
              <Text type="secondary" className={styles.label}>
                建议:
              </Text>
              <Text className={styles.suggestion}>{sensitiveWord.suggestion}</Text>
            </div>
          )}

          {sensitiveWord.description && (
            <div className={styles.fieldRow}>
              <Text type="secondary" className={styles.label}>
                说明:
              </Text>
              <Text className={styles.description}>{sensitiveWord.description}</Text>
            </div>
          )}
        </Card>
      </div>
    )
  }

  // 渲染词汇卡片
  if (!entry) return null

  return (
    <div
      ref={cardRef}
      className={styles.hoverCard}
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      <Card size="small" className={styles.card} styles={{ body: { padding: '8px 12px' } }}>
        {/* 标题行 */}
        <div className={styles.header}>
          <Text strong className={styles.name}>
            {entry.name}
          </Text>
          <div
            className={styles.colorIndicator}
            style={{
              backgroundColor: entry.color || vocabularyType?.color || 'var(--color-primary)'
            }}
          />
          {vocabularyType && <Tag color={vocabularyType.color}>{vocabularyType.name}</Tag>}
        </div>

        {/* 别名 - 根据配置显示 */}
        {fieldConfig.includes('aliases') && entry.aliases && entry.aliases.length > 0 && (
          <div className={styles.fieldRow}>
            <Text type="secondary" className={styles.label}>
              别名:
            </Text>
            <Text>{entry.aliases.join(', ')}</Text>
          </div>
        )}

        {/* 配置的字段（排除内置字段，它们单独处理） */}
        {fieldConfig
          .filter(
            fieldId =>
              !['name', 'type', 'description', 'aliases', 'tags', 'color'].includes(fieldId)
          )
          .map(fieldId => {
            const value = entry.fields[fieldId]
            if (value === undefined || value === null) return null
            if (Array.isArray(value) && value.length === 0) return null

            const fieldDef = getFieldDefinition(fieldId, vocabularyType)
            const isColor = fieldDef?.type === 'color' || isColorValue(value)

            return (
              <div key={fieldId} className={styles.fieldRow}>
                <Text type="secondary" className={styles.label}>
                  {getFieldDisplayName(fieldId, vocabularyType)}:
                </Text>
                {isColor ? (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      backgroundColor: getColorString(value),
                      borderRadius: 4,
                      border: '1px solid #d9d9d9'
                    }}
                  />
                ) : (
                  <Text>{formatFieldValue(value)}</Text>
                )}
              </div>
            )
          })}

        {/* 标签 - 根据配置显示 */}
        {fieldConfig.includes('tags') && entry.tags && entry.tags.length > 0 && (
          <div className={styles.tagsRow}>
            {entry.tags.map((tag, index) => (
              <Tag key={index} className={styles.tag}>
                {tag}
              </Tag>
            ))}
          </div>
        )}

        {/* 描述 - 根据配置显示 */}
        {fieldConfig.includes('description') && entry.description && (
          <>
            <Divider className={styles.divider} />
            <Text className={styles.description}>{entry.description}</Text>
          </>
        )}
      </Card>
    </div>
  )
}

/**
 * 获取严重程度颜色
 */
function getSeverityColor(severity: string): string {
  const colors: Record<string, string> = {
    low: 'default',
    medium: 'warning',
    high: 'error',
    critical: 'magenta'
  }
  return colors[severity] || 'default'
}

/**
 * 获取严重程度文本
 */
function getSeverityText(severity: string): string {
  const texts: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    critical: '严重'
  }
  return texts[severity] || severity
}

export default HighlightHoverCard
