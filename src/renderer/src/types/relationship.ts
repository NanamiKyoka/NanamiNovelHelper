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
import { SEMANTIC_COLORS } from '@shared/constants/colors'

export const GENDER_CONFIG: Record<Gender, { label: string; color: string }> = {
  male: { label: '男', color: SEMANTIC_COLORS.gender.male },
  female: { label: '女', color: SEMANTIC_COLORS.gender.female },
  other: { label: '其他', color: SEMANTIC_COLORS.gender.other },
  unknown: { label: '未知', color: SEMANTIC_COLORS.gender.unknown }
}
