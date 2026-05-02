/**
 * 高亮词汇悬浮卡片组件
 * 参考 novel-helper 的悬浮提示实现
 */

import { useMemo, useEffect, useRef, useState } from 'react'
import { Card, Tag, Typography, Divider } from 'antd'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useSensitiveStore } from '@stores/sensitiveStore'
import { useHighlightService } from '@services/highlightService'
import type { VocabularyType } from '@shared/vocabulary'
import type { HoverCardConfig } from '@shared/highlight'
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
function formatFieldValue(value: string | string[] | undefined): string {
  if (!value) return '-'
  if (Array.isArray(value)) {
    return value.length > 0 ? value.join(', ') : '-'
  }
  return value
}

/**
 * 获取字段显示名称
 */
function getFieldDisplayName(fieldId: string, type: VocabularyType | undefined): string {
  if (!type) return fieldId
  const field = type.fields.find(f => f.id === fieldId)
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
      if (typeConfig && typeConfig.fields && typeConfig.fields.length > 0) {
        return typeConfig.fields
      }
    }

    // 默认显示该类型的所有自定义字段（排除内置的 name 和 type）
    return vocabularyType.fields.filter(f => !['name', 'type'].includes(f.id)).map(f => f.id)
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
            if (!value || (Array.isArray(value) && value.length === 0)) return null

            return (
              <div key={fieldId} className={styles.fieldRow}>
                <Text type="secondary" className={styles.label}>
                  {getFieldDisplayName(fieldId, vocabularyType)}:
                </Text>
                <Text>{formatFieldValue(value)}</Text>
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
