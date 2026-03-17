/**
 * 关系图相关类型定义
 */

// ============================================
// 关系类型定义
// ============================================

/**
 * 内置关系类型
 */
export type BuiltinRelationType = 
  | 'family'      // 亲情
  | 'friendship'  // 友情
  | 'love'        // 爱情
  | 'enemy'       // 敌对
  | 'master'      // 师徒
  | 'superior'    // 上下级
  | 'ally'        // 同盟
  | 'rival'       // 对手
  | 'colleague'   // 同事
  | 'neighbor'    // 邻居

/**
 * 关系类型定义
 */
export interface RelationType {
  id: string
  name: string
  color: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  lineWidth: number
  isBuiltIn: boolean
  order: number
}

/**
 * 内置关系类型配置
 */
export const BUILTIN_RELATION_TYPES: RelationType[] = [
  { id: 'family', name: '亲情', color: '#f5222d', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 0 },
  { id: 'friendship', name: '友情', color: '#52c41a', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 1 },
  { id: 'love', name: '爱情', color: '#eb2f96', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 2 },
  { id: 'enemy', name: '敌对', color: '#262626', lineStyle: 'dashed', lineWidth: 2, isBuiltIn: true, order: 3 },
  { id: 'master', name: '师徒', color: '#722ed1', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 4 },
  { id: 'superior', name: '上下级', color: '#1890ff', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 5 },
  { id: 'ally', name: '同盟', color: '#13c2c2', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 6 },
  { id: 'rival', name: '对手', color: '#fa8c16', lineStyle: 'dashed', lineWidth: 2, isBuiltIn: true, order: 7 },
  { id: 'colleague', name: '同事', color: '#8c8c8c', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 8 },
  { id: 'neighbor', name: '邻居', color: '#bfbfbf', lineStyle: 'dotted', lineWidth: 1, isBuiltIn: true, order: 9 }
]

// ============================================
// 节点定义
// ============================================

/**
 * 节点样式类型
 */
export type NodeStyleType = 'circle' | 'card'

/**
 * 性别
 */
export type Gender = 'male' | 'female' | 'other' | 'unknown'

/**
 * 关系图节点数据
 */
export interface RelationshipNode {
  id: string
  name: string
  gender: Gender
  description?: string
  avatar?: string
  color: string
  // 关联的词汇类型 ID
  linkedTypeId?: string
  // 关联的词汇条目 ID
  linkedEntryId?: string
  // 位置信息（用于布局）
  x?: number
  y?: number
  createdAt: string
  updatedAt: string
}

// ============================================
// 边（关系）定义
// ============================================

/**
 * 关系图边数据
 */
export interface RelationshipEdge {
  id: string
  source: string    // 起始节点 ID
  target: string    // 目标节点 ID
  relationTypeId: string
  label?: string    // 自定义关系描述
  createdAt: string
  updatedAt: string
}

// ============================================
// 关系图定义
// ============================================

/**
 * 关系图视图状态
 */
export interface GraphViewState {
  zoom: number
  centerX: number
  centerY: number
}

/**
 * 关系图元数据
 */
export interface RelationshipGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string  // 缩略图文件名
  // 关联的词汇类型 ID 列表
  linkedVocabularyTypes: string[]
  // 自定义关系类型
  customRelationTypes: RelationType[]
  // 节点样式
  nodeStyle: NodeStyleType
  nodeCount: number
  edgeCount: number
  // 视图状态
  viewState?: GraphViewState
  createdAt: string
  updatedAt: string
}

/**
 * 完整的关系图数据
 */
export interface RelationshipGraph extends RelationshipGraphMeta {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
}

/**
 * 创建关系图选项
 */
export interface CreateRelationshipGraphOptions {
  name: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: NodeStyleType
}

/**
 * 更新关系图选项
 */
export interface UpdateRelationshipGraphOptions {
  name?: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: NodeStyleType
  nodes?: RelationshipNode[]
  edges?: RelationshipEdge[]
  customRelationTypes?: RelationType[]
  viewState?: GraphViewState
}

// ============================================
// 缩略图
// ============================================

/**
 * 缩略图生成选项
 */
export interface ThumbnailOptions {
  width: number
  height: number
  quality: number
}
