/**
 * 时间线管理 - 主进程类型定义
 */

// ============================================
// 时间格式定义
// ============================================

/**
 * 时间格式类型
 */
export type TimeFormat = 'datetime' | 'chapter' | 'custom'

/**
 * 时间信息
 */
export interface TimeInfo {
  format: TimeFormat
  datetime?: string
  chapterId?: string
  chapterTitle?: string
  customLabel?: string
  orderValue?: number
}

// ============================================
// 关联引用定义
// ============================================

/**
 * 角色引用
 */
export interface CharacterRef {
  id: string
  name: string
  typeId?: string
  color?: string
  avatar?: string
}

/**
 * 章节引用
 */
export interface ChapterRef {
  id: string
  title: string
  path: string
}

// ============================================
// 时间线节点定义
// ============================================

/**
 * 时间线节点
 */
export interface TimelineNode {
  id: string
  title: string
  description?: string
  timeInfo: TimeInfo
  characters: CharacterRef[]
  chapter?: ChapterRef
  color?: string
  order: number
  isBranchPoint?: boolean
  branchedTimelineIds?: string[]
  createdAt: string
  updatedAt: string
}

// ============================================
// 分支信息定义
// ============================================

export type BranchType = 'main' | 'branch'

export interface BranchInfo {
  type: BranchType
  parentTimelineId?: string
  branchFromNodeId?: string
  mergeToTimelineId?: string
  mergeToNodeId?: string
  branchLabel?: string
}

// ============================================
// 时间线定义
// ============================================

export interface TimelineMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  branchInfo: BranchInfo
  nodeCount: number
  tags?: string[]
  order: number
  createdAt: string
  updatedAt: string
}

export interface Timeline extends TimelineMeta {
  nodes: TimelineNode[]
}

// ============================================
// 创建和更新选项
// ============================================

export interface CreateTimelineOptions {
  name: string
  description?: string
  tags?: string[]
  branchInfo?: BranchInfo
}

export interface UpdateTimelineOptions {
  name?: string
  description?: string
  tags?: string[]
  nodes?: TimelineNode[]
  thumbnail?: string
  branchInfo?: BranchInfo
}

export interface CreateNodeOptions {
  title: string
  description?: string
  timeInfo?: TimeInfo
  characters?: CharacterRef[]
  chapter?: string
  color?: string
  order?: number
}

export interface UpdateNodeOptions {
  title?: string
  description?: string
  timeInfo?: TimeInfo
  characters?: CharacterRef[]
  chapter?: ChapterRef
  color?: string
  order?: number
  isBranchPoint?: boolean
  branchedTimelineIds?: string[]
}

// ============================================
// 缩略图
// ============================================

export interface ThumbnailOptions {
  width: number
  height: number
  backgroundColor?: string
  showDetails?: boolean
}
