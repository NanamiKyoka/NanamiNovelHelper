/**
 * 关系图类型定义
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

/**
 * 内置关系类型
 */
export const BUILTIN_RELATION_TYPES: RelationType[] = [
  { id: 'family', name: '家人', color: '#ff4d4f', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 1 },
  { id: 'friend', name: '朋友', color: '#52c41a', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 2 },
  { id: 'lover', name: '恋人', color: '#eb2f96', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 3 },
  { id: 'enemy', name: '敌人', color: '#722ed1', lineStyle: 'dashed', lineWidth: 2, isBuiltIn: true, order: 4 },
  { id: 'colleague', name: '同事', color: '#1890ff', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 5 },
  { id: 'neighbor', name: '邻居', color: '#13c2c2', lineStyle: 'dotted', lineWidth: 1, isBuiltIn: true, order: 6 },
  { id: 'classmate', name: '同学', color: '#faad14', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 7 },
  { id: 'master-disciple', name: '师徒', color: '#fa541c', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 8 },
  { id: 'rival', name: '竞争对手', color: '#2f54eb', lineStyle: 'dashed', lineWidth: 1, isBuiltIn: true, order: 9 },
  { id: 'acquaintance', name: '熟人', color: '#8c8c8c', lineStyle: 'dotted', lineWidth: 1, isBuiltIn: true, order: 10 },
]

/**
 * 性别配置
 */
export const GENDER_CONFIG: Record<Gender, { label: string; color: string }> = {
  male: { label: '男', color: '#1890ff' },
  female: { label: '女', color: '#eb2f96' },
  other: { label: '其他', color: '#722ed1' },
  unknown: { label: '未知', color: '#8c8c8c' },
}
