/**
 * 关系图共享类型定义
 */

/**
 * 关系类型
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
 * 性别类型
 */
export type Gender = 'male' | 'female' | 'other' | 'unknown'

/**
 * 节点样式类型
 */
export type NodeStyleType = 'circle' | 'card'

/**
 * 关系图视图状态
 */
export interface GraphViewState {
  zoom: number
  centerX: number
  centerY: number
}

/**
 * 关系图节点（人物）
 */
export interface RelationshipNode {
  id: string
  name: string
  gender: Gender
  description?: string
  avatar?: string
  color: string
  linkedTypeId?: string
  linkedEntryId?: string
  x?: number
  y?: number
  createdAt: string
  updatedAt: string
}

/**
 * 关系图边（关系）
 */
export interface RelationshipEdge {
  id: string
  source: string
  target: string
  relationTypeId: string
  label?: string
  createdAt: string
  updatedAt: string
}

/**
 * 关系图元数据
 */
export interface RelationshipGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  linkedVocabularyTypes: string[]
  customRelationTypes: RelationType[]
  nodeStyle: NodeStyleType
  nodeCount: number
  edgeCount: number
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
