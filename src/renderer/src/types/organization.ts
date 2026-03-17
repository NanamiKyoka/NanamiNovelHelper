/**
 * 组织架构图类型定义
 */

/**
 * 节点显示样式
 */
export type OrganizationNodeStyle = 'simple' | 'card'

/**
 * 组织架构图节点数据
 */
export interface OrganizationNode {
  id: string
  name: string
  parentId?: string
  description?: string
  color: string
  linkedTypeId?: string
  linkedEntryId?: string
  order: number
  collapsed?: boolean
  createdAt: string
  updatedAt: string
}

/**
 * 组织架构图视图状态
 */
export interface OrganizationViewState {
  zoom: number
  centerX: number
  centerY: number
  expandedNodeIds?: string[]
}

/**
 * 组织架构图元数据
 */
export interface OrganizationGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  linkedVocabularyTypes: string[]
  nodeStyle: OrganizationNodeStyle
  nodeCount: number
  viewState?: OrganizationViewState
  createdAt: string
  updatedAt: string
}

/**
 * 完整的组织架构图数据
 */
export interface OrganizationGraph extends OrganizationGraphMeta {
  nodes: OrganizationNode[]
}

/**
 * 创建组织架构图选项
 */
export interface CreateOrganizationGraphOptions {
  name: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: OrganizationNodeStyle
  createRootNode?: boolean
  rootNodeName?: string
}

/**
 * 更新组织架构图选项
 */
export interface UpdateOrganizationGraphOptions {
  name?: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: OrganizationNodeStyle
  nodes?: OrganizationNode[]
  viewState?: OrganizationViewState
}

/**
 * 创建节点选项
 */
export interface CreateOrganizationNodeOptions {
  name: string
  parentId?: string
  description?: string
  color?: string
  linkedTypeId?: string
  linkedEntryId?: string
}

/**
 * 更新节点选项
 */
export interface UpdateOrganizationNodeOptions {
  name?: string
  parentId?: string
  description?: string
  color?: string
  linkedTypeId?: string
  linkedEntryId?: string
  order?: number
  collapsed?: boolean
}

/**
 * 节点预设颜色
 */
export const ORGANIZATION_NODE_COLORS: string[] = [
  '#1890ff',
  '#52c41a',
  '#faad14',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#fa541c',
  '#2f54eb',
  '#a0d911',
  '#f5222d',
]
