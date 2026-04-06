/**
 * 关系图类型定义
 * 从共享类型重新导出
 */

export * from '@shared/relationship'

// 重新导出内置关系类型（分离值和类型导出）
export { BUILTIN_RELATION_TYPES } from '@shared/constants'
export type { BuiltinRelationTypeId } from '@shared/constants'

/**
 * 性别配置
 */
import type { Gender } from '@shared/relationship'

export const GENDER_CONFIG: Record<Gender, { label: string; color: string }> = {
  male: { label: '男', color: '#1890ff' },
  female: { label: '女', color: '#eb2f96' },
  other: { label: '其他', color: '#722ed1' },
  unknown: { label: '未知', color: '#8c8c8c' },
}