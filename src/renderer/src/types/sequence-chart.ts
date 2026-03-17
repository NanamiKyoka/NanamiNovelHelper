/**
 * 事序图管理类型定义
 * 甘特图风格的时间事件管理
 */

// ============================================
// 时间格式定义（混合模式）
// ============================================

/**
 * 时间格式类型
 */
export type SequenceTimeFormat = 'cell' | 'datetime' | 'chapter'

/**
 * 时间信息
 */
export interface SequenceTimeInfo {
  format: SequenceTimeFormat
  /** 单元格位置（cell 模式） */
  cellStart?: number
  cellEnd?: number
  /** 现实时间 (ISO 格式字符串, datetime 模式) */
  datetimeStart?: string
  datetimeEnd?: string
  /** 章节引用 ID (chapter 模式) */
  chapterStartId?: string
  chapterStartTitle?: string
  chapterEndId?: string
  chapterEndTitle?: string
}

// ============================================
// 关联引用定义
// ============================================

/**
 * 角色引用
 */
export interface SequenceCharacterRef {
  id: string
  name: string
  typeId?: string
  color?: string
  avatar?: string
}

/**
 * 章节引用
 */
export interface SequenceChapterRef {
  id: string
  title: string
  path: string
}

/**
 * 地点引用
 */
export interface SequenceLocationRef {
  id: string
  name: string
  typeId?: string
  color?: string
}

// ============================================
// 事件类型定义
// ============================================

/**
 * 事件类型（用于自动颜色分配）
 */
export interface SequenceEventType {
  id: string
  name: string
  color: string
  icon?: string
  isBuiltIn: boolean
  order: number
}

/**
 * 内置事件类型
 */
export const BUILT_IN_EVENT_TYPES: SequenceEventType[] = [
  { id: 'battle', name: '战斗', color: '#ff4d4f', isBuiltIn: true, order: 0 },
  { id: 'dialogue', name: '对话', color: '#1890ff', isBuiltIn: true, order: 1 },
  { id: 'travel', name: '旅行', color: '#52c41a', isBuiltIn: true, order: 2 },
  { id: 'romance', name: '感情', color: '#eb2f96', isBuiltIn: true, order: 3 },
  { id: 'mystery', name: '悬疑', color: '#722ed1', isBuiltIn: true, order: 4 },
  { id: 'daily', name: '日常', color: '#faad14', isBuiltIn: true, order: 5 },
  { id: 'conflict', name: '冲突', color: '#fa541c', isBuiltIn: true, order: 6 },
  { id: 'revelation', name: '揭秘', color: '#13c2c2', isBuiltIn: true, order: 7 },
  { id: 'death', name: '死亡', color: '#595959', isBuiltIn: true, order: 8 },
  { id: 'other', name: '其他', color: '#8c8c8c', isBuiltIn: true, order: 9 }
]

// ============================================
// 事件定义
// ============================================

/**
 * 事序图事件
 */
export interface SequenceEvent {
  id: string
  /** 事件序号 */
  order: number
  /** 事件名称/简介 */
  title: string
  /** 事件详情 */
  description?: string
  /** 时间信息 */
  timeInfo: SequenceTimeInfo
  /** 进度 (0-100) */
  progress: number
  /** 事件类型 ID */
  eventTypeId: string
  /** 颜色（可手动覆盖类型颜色） */
  color?: string
  /** 关联角色 */
  characters: SequenceCharacterRef[]
  /** 关联章节 */
  chapter?: SequenceChapterRef
  /** 关联地点 */
  location?: SequenceLocationRef
  createdAt: string
  updatedAt: string
}

// ============================================
// 事序图定义
// ============================================

/**
 * 时间轴配置
 */
export interface TimelineAxisConfig {
  /** 时间格式 */
  defaultFormat: SequenceTimeFormat
  /** 单元格宽度 (px) */
  cellWidth: number
  /** 初始单元格数量 */
  initialCellCount: number
  /** 最小单元格数量 */
  minCellCount: number
  /** 最大单元格数量 */
  maxCellCount: number
  /** 是否自动扩展 */
  autoExtend: boolean
  /** 时间刻度标签 */
  timeLabels?: Array<{ position: number; label: string }>
}

/**
 * 事序图元数据
 */
export interface SequenceChartMeta {
  id: string
  name: string
  description?: string
  /** 缩略图文件名 */
  thumbnail?: string
  /** 时间轴配置 */
  axisConfig: TimelineAxisConfig
  /** 自定义事件类型 */
  customEventTypes: SequenceEventType[]
  /** 事件数量 */
  eventCount: number
  /** 标签 */
  tags?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * 完整的事序图数据
 */
export interface SequenceChart extends SequenceChartMeta {
  events: SequenceEvent[]
}

// ============================================
// 创建和更新选项
// ============================================

/**
 * 创建事序图选项
 */
export interface CreateSequenceChartOptions {
  name: string
  description?: string
  tags?: string[]
  axisConfig?: Partial<TimelineAxisConfig>
}

/**
 * 更新事序图选项
 */
export interface UpdateSequenceChartOptions {
  name?: string
  description?: string
  tags?: string[]
  events?: SequenceEvent[]
  thumbnail?: string
  axisConfig?: Partial<TimelineAxisConfig>
  customEventTypes?: SequenceEventType[]
}

/**
 * 创建事件选项
 */
export interface CreateSequenceEventOptions {
  title: string
  description?: string
  timeInfo?: Partial<SequenceTimeInfo>
  progress?: number
  eventTypeId?: string
  color?: string
  characters?: SequenceCharacterRef[]
  chapter?: SequenceChapterRef
  location?: SequenceLocationRef
}

/**
 * 更新事件选项
 */
export interface UpdateSequenceEventOptions {
  title?: string
  description?: string
  timeInfo?: Partial<SequenceTimeInfo>
  progress?: number
  eventTypeId?: string
  color?: string
  characters?: SequenceCharacterRef[]
  chapter?: SequenceChapterRef
  location?: SequenceLocationRef
  order?: number
}

// ============================================
// 视图模式定义
// ============================================

/**
 * 视图模式
 */
export type SequenceChartViewMode = 'list' | 'preview' | 'editor'

/**
 * 缩放级别
 */
export interface ZoomLevel {
  /** 缩放比例 (0.25 - 2.0) */
  scale: number
  /** 预设名称 */
  name: string
}

/**
 * 预设缩放级别
 */
export const ZOOM_LEVELS: ZoomLevel[] = [
  { scale: 0.25, name: '25%' },
  { scale: 0.5, name: '50%' },
  { scale: 0.75, name: '75%' },
  { scale: 1, name: '100%' },
  { scale: 1.25, name: '125%' },
  { scale: 1.5, name: '150%' },
  { scale: 2, name: '200%' }
]

// ============================================
// 拖拽定义
// ============================================

/**
 * 拖拽类型
 */
export type DragType = 'move' | 'resize-start' | 'resize-end' | 'reorder'

/**
 * 拖拽状态
 */
export interface DragState {
  isDragging: boolean
  dragType: DragType | null
  eventId: string | null
  startX: number
  startY: number
  originalCellStart?: number
  originalCellEnd?: number
  originalOrder?: number
}

// ============================================
// 导入导出定义
// ============================================

/**
 * 导出格式
 */
export type SequenceExportFormat = 'json' | 'markdown' | 'image'

/**
 * 导出选项
 */
export interface SequenceExportOptions {
  format: SequenceExportFormat
  /** 包含缩略图 */
  includeThumbnail?: boolean
  /** 图片格式 */
  imageFormat?: 'png' | 'jpeg'
}

// ============================================
// 默认配置
// ============================================

/**
 * 默认时间轴配置
 */
export const DEFAULT_AXIS_CONFIG: TimelineAxisConfig = {
  defaultFormat: 'cell',
  cellWidth: 40,
  initialCellCount: 100,
  minCellCount: 50,
  maxCellCount: 1000,
  autoExtend: true
}

/**
 * 默认事件颜色（当没有类型时使用）
 */
export const DEFAULT_EVENT_COLOR = '#1890ff'

/**
 * 事件颜色列表（51mazi 风格）
 */
export const EVENT_COLORS = [
  '#ff6b6b',
  '#ff8e72',
  '#ffa94d',
  '#ffd93d',
  '#6bcb77',
  '#38a3a5',
  '#00c2a8',
  '#2d9cdb',
  '#4d96ff',
  '#6c5ce7',
  '#845ec2',
  '#b39cd0',
  '#e056fd',
  '#f368e0'
]
