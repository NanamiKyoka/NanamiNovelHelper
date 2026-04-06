/**
 * 组织架构图相关类型定义
 * 主进程和渲染进程共享
 */

import { CHART_PALETTE } from './constants/colors'

/** 节点显示样式 */
export type OrganizationNodeStyle = 'simple' | 'card'

/** 组织架构图节点数据 */
export interface OrganizationNode {
  id: string
  name: string
  /** 父节点 ID（根节点为 undefined） */
  parentId?: string
  description?: string
  /** 节点颜色 */
  color: string
  /** 关联的词汇类型 ID */
  linkedTypeId?: string
  /** 关联的词汇条目 ID */
  linkedEntryId?: string
  /** 排序序号（同级节点排序） */
  order: number
  /** 是否折叠（隐藏子节点） */
  collapsed?: boolean
  createdAt: string
  updatedAt: string
}

/** 组织架构图视图状态 */
export interface OrganizationViewState {
  zoom: number
  centerX: number
  centerY: number
  /** 展开的节点 ID 列表 */
  expandedNodeIds?: string[]
}

/** 组织架构图元数据 */
export interface OrganizationGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  /** 关联的词汇类型 ID 列表 */
  linkedVocabularyTypes: string[]
  /** 节点显示样式 */
  nodeStyle: OrganizationNodeStyle
  nodeCount: number
  /** 视图状态 */
  viewState?: OrganizationViewState
  /** 排序序号 */
  order: number
  createdAt: string
  updatedAt: string
}

/** 完整的组织架构图数据 */
export interface OrganizationGraph extends OrganizationGraphMeta {
  nodes: OrganizationNode[]
}

/** 创建组织架构图选项 */
export interface CreateOrganizationGraphOptions {
  name: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: OrganizationNodeStyle
  /** 是否创建根节点 */
  createRootNode?: boolean
  rootNodeName?: string
}

/** 更新组织架构图选项 */
export interface UpdateOrganizationGraphOptions {
  name?: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: OrganizationNodeStyle
  nodes?: OrganizationNode[]
  viewState?: OrganizationViewState
}

/** 创建节点选项 */
export interface CreateOrganizationNodeOptions {
  name: string
  parentId?: string
  description?: string
  color?: string
  linkedTypeId?: string
  linkedEntryId?: string
}

/** 更新节点选项 */
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

/** 节点预设颜色（使用图表调色板） */
export const ORGANIZATION_NODE_COLORS: string[] = [...CHART_PALETTE]
