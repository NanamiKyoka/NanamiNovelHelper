/**
 * 关系图相关类型定义
 * 从共享类型重新导出，避免重复定义
 */

// 从 shared 目录重新导出所有类型
export {
  RelationType,
  Gender,
  NodeStyleType,
  GraphViewState,
  RelationshipNode,
  RelationshipEdge,
  RelationshipGraphMeta,
  RelationshipGraph,
  CreateRelationshipGraphOptions,
  UpdateRelationshipGraphOptions
} from '../../shared/relationship'

// 从 shared 目录重新导出内置关系类型
export { BUILTIN_RELATION_TYPES } from '../../shared/constants'
export type { BuiltinRelationTypeId } from '../../shared/constants'

// ============================================
// Main 进程专用类型
// ============================================

/**
 * 缩略图生成选项
 */
export interface ThumbnailOptions {
  width: number
  height: number
  quality: number
}
