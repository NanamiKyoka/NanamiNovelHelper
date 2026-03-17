/**
 * 事序图类型定义（主进程）
 */

// ============================================
// 时间格式定义（混合模式）
// ============================================

export type SequenceTimeFormat = 'cell' | 'datetime' | 'chapter'

export interface SequenceTimeInfo {
  format: SequenceTimeFormat
  cellStart?: number
  cellEnd?: number
  datetimeStart?: string
  datetimeEnd?: string
  chapterStartId?: string
  chapterStartTitle?: string
  chapterEndId?: string
  chapterEndTitle?: string
}

// ============================================
// 关联引用定义
// ============================================

export interface SequenceCharacterRef {
  id: string
  name: string
  typeId?: string
  color?: string
  avatar?: string
}

export interface SequenceChapterRef {
  id: string
  title: string
  path: string
}

export interface SequenceLocationRef {
  id: string
  name: string
  typeId?: string
  color?: string
}

// ============================================
// 事件类型定义
// ============================================

export interface SequenceEventType {
  id: string
  name: string
  color: string
  icon?: string
  isBuiltIn: boolean
  order: number
}

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

export interface SequenceEvent {
  id: string
  order: number
  title: string
  description?: string
  timeInfo: SequenceTimeInfo
  progress: number
  eventTypeId: string
  color?: string
  characters: SequenceCharacterRef[]
  chapter?: SequenceChapterRef
  location?: SequenceLocationRef
  createdAt: string
  updatedAt: string
}

// ============================================
// 事序图定义
// ============================================

export interface TimelineAxisConfig {
  defaultFormat: SequenceTimeFormat
  cellWidth: number
  initialCellCount: number
  minCellCount: number
  maxCellCount: number
  autoExtend: boolean
  timeLabels?: Array<{ position: number; label: string }>
}

export interface SequenceChartMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  axisConfig: TimelineAxisConfig
  customEventTypes: SequenceEventType[]
  eventCount: number
  tags?: string[]
  createdAt: string
  updatedAt: string
}

export interface SequenceChart extends SequenceChartMeta {
  events: SequenceEvent[]
}

// ============================================
// 创建和更新选项
// ============================================

export interface CreateSequenceChartOptions {
  name: string
  description?: string
  tags?: string[]
  axisConfig?: Partial<TimelineAxisConfig>
}

export interface UpdateSequenceChartOptions {
  name?: string
  description?: string
  tags?: string[]
  events?: SequenceEvent[]
  thumbnail?: string
  axisConfig?: Partial<TimelineAxisConfig>
  customEventTypes?: SequenceEventType[]
}

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
// 默认配置
// ============================================

export const DEFAULT_AXIS_CONFIG: TimelineAxisConfig = {
  defaultFormat: 'cell',
  cellWidth: 40,
  initialCellCount: 100,
  minCellCount: 50,
  maxCellCount: 1000,
  autoExtend: true
}

export const DEFAULT_EVENT_COLOR = '#1890ff'

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
