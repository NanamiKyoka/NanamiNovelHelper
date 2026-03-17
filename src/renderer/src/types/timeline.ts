/**
 * 时间线管理类型定义
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
  /** 现实时间 (ISO 格式字符串) */
  datetime?: string
  /** 章节引用 ID */
  chapterId?: string
  /** 章节标题 */
  chapterTitle?: string
  /** 自定义时间标签 */
  customLabel?: string
  /** 排序用的数值（自动计算或手动设置） */
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
  /** 词汇类型 ID */
  typeId?: string
  /** 头像/颜色 */
  color?: string
  avatar?: string
}

/**
 * 章节引用
 */
export interface ChapterRef {
  id: string
  title: string
  /** 文件相对路径 */
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
  /** 时间信息 */
  timeInfo: TimeInfo
  /** 关联角色列表 */
  characters: CharacterRef[]
  /** 关联章节 */
  chapter?: ChapterRef
  /** 节点颜色 */
  color?: string
  /** 排序顺序 */
  order: number
  /** 是否为分支点 */
  isBranchPoint?: boolean
  /** 分支出的时间线 ID */
  branchedTimelineIds?: string[]
  createdAt: string
  updatedAt: string
}

// ============================================
// 分支信息定义
// ============================================

/**
 * 分支类型
 */
export type BranchType = 'main' | 'branch'

/**
 * 分支信息
 */
export interface BranchInfo {
  /** 分支类型 */
  type: BranchType
  /** 父时间线 ID（仅分支时间线有） */
  parentTimelineId?: string
  /** 分支起始节点 ID（从哪个节点分支出去） */
  branchFromNodeId?: string
  /** 合并目标时间线 ID */
  mergeToTimelineId?: string
  /** 合并目标节点 ID */
  mergeToNodeId?: string
  /** 分支标签（用于显示分支来源） */
  branchLabel?: string
}

// ============================================
// 时间线定义
// ============================================

/**
 * 时间线元数据
 */
export interface TimelineMeta {
  id: string
  name: string
  description?: string
  /** 缩略图文件名 */
  thumbnail?: string
  /** 分支信息 */
  branchInfo: BranchInfo
  /** 节点数量 */
  nodeCount: number
  /** 标签（用于分类） */
  tags?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * 完整的时间线数据
 */
export interface Timeline extends TimelineMeta {
  nodes: TimelineNode[]
}

// ============================================
// 创建和更新选项
// ============================================

/**
 * 创建时间线选项
 */
export interface CreateTimelineOptions {
  name: string
  description?: string
  tags?: string[]
  /** 分支信息 */
  branchInfo?: BranchInfo
}

/**
 * 更新时间线选项
 */
export interface UpdateTimelineOptions {
  name?: string
  description?: string
  tags?: string[]
  nodes?: TimelineNode[]
  thumbnail?: string
  branchInfo?: BranchInfo
}

/**
 * 创建节点选项
 */
export interface CreateNodeOptions {
  title: string
  description?: string
  timeInfo?: TimeInfo
  characters?: CharacterRef[]
  chapter?: ChapterRef
  color?: string
  order?: number
}

/**
 * 更新节点选项
 */
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
// 撤销重做定义
// ============================================

/**
 * 操作类型
 */
export type TimelineActionType = 
  | 'create_timeline'
  | 'delete_timeline'
  | 'update_timeline'
  | 'create_node'
  | 'delete_node'
  | 'update_node'
  | 'move_node'
  | 'batch_delete_nodes'
  | 'batch_move_nodes'

/**
 * 撤销重做操作记录
 */
export interface TimelineHistoryAction {
  type: TimelineActionType
  /** 时间线 ID */
  timelineId: string
  /** 操作前的数据 */
  beforeData?: unknown
  /** 操作后的数据 */
  afterData?: unknown
  /** 时间戳 */
  timestamp: number
  /** 描述 */
  description: string
}

// ============================================
// 批量操作定义
// ============================================

/**
 * 批量操作选项
 */
export interface BatchOperationOptions {
  /** 节点 ID 列表 */
  nodeIds: string[]
  /** 操作类型 */
  operation: 'delete' | 'move' | 'copy' | 'updateColor'
  /** 移动目标位置（仅 move 操作） */
  targetOrder?: number
  /** 目标时间线 ID（仅 copy 操作） */
  targetTimelineId?: string
  /** 颜色值（仅 updateColor 操作） */
  color?: string
}

// ============================================
// 导入导出定义
// ============================================

/**
 * 导出格式
 */
export type ExportFormat = 'json' | 'markdown' | 'image'

/**
 * 导出选项
 */
export interface ExportOptions {
  format: ExportFormat
  /** 包含缩略图（仅 json 格式） */
  includeThumbnail?: boolean
  /** 图片格式（仅 image 格式） */
  imageFormat?: 'png' | 'jpeg'
  /** 图片质量（仅 jpeg 格式） */
  imageQuality?: number
}

/**
 * 导出结果
 */
export interface ExportResult {
  success: boolean
  /** 文件路径（保存到文件时） */
  filePath?: string
  /** 数据内容（内存导出时） */
  content?: string
  /** 错误信息 */
  error?: string
}

// ============================================
// 缩略图定义
// ============================================

/**
 * 缩略图生成选项
 */
export interface ThumbnailOptions {
  width: number
  height: number
  /** 背景色 */
  backgroundColor?: string
  /** 是否显示节点详情 */
  showDetails?: boolean
}

// ============================================
// 视图模式定义
// ============================================

/**
 * 视图模式
 */
export type TimelineViewMode = 'list' | 'preview' | 'editor'

/**
 * 列表排序方式
 */
export type TimelineSortBy = 'createdAt' | 'updatedAt' | 'name' | 'nodeCount'

/**
 * 列表排序顺序
 */
export type TimelineSortOrder = 'asc' | 'desc'

// ============================================
// 默认颜色配置
// ============================================

/**
 * 默认节点颜色列表
 */
export const DEFAULT_NODE_COLORS = [
  '#1890ff', // 蓝色
  '#52c41a', // 绿色
  '#faad14', // 金色
  '#eb2f96', // 粉色
  '#722ed1', // 紫色
  '#13c2c2', // 青色
  '#fa541c', // 橙色
  '#2f54eb', // 靛蓝
]

/**
 * 时间线默认颜色
 */
export const DEFAULT_TIMELINE_COLOR = '#1890ff'
