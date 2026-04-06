/**
 * 敏感词类型定义
 * 主进程和渲染进程共用
 */

import { SEMANTIC_COLORS } from './constants/colors'

/**
 * 敏感词
 */
export interface SensitiveWord {
  id: string
  name: string // 敏感词
  aliases: string[] // 变体/别名
  category: string // 分类：政治、暴力、色情、违禁品、其他
  severity: 'low' | 'medium' | 'high' | 'critical' // 严重程度
  suggestion?: string // 替换建议
  description?: string // 说明
  order: number // 排序序号
  createdAt: string
  updatedAt: string
}

/**
 * 敏感词分类选项
 */
export const SENSITIVE_CATEGORIES = [
  { value: '政治', label: '政治' },
  { value: '暴力', label: '暴力' },
  { value: '色情', label: '色情' },
  { value: '违禁品', label: '违禁品' },
  { value: '其他', label: '其他' }
]

/**
 * 严重程度选项
 */
export const SEVERITY_LEVELS = [
  { value: 'low', label: '低', color: SEMANTIC_COLORS.severity.low },
  { value: 'medium', label: '中', color: SEMANTIC_COLORS.severity.medium },
  { value: 'high', label: '高', color: SEMANTIC_COLORS.severity.high },
  { value: 'critical', label: '严重', color: SEMANTIC_COLORS.severity.critical }
]
