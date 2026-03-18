/**
 * 项目相关类型定义
 */

/**
 * 可创建的项目目录类型
 */
export type ProjectDirectoryType = 'content' | 'draft' | 'reference'

/**
 * 项目目录配置
 */
export interface ProjectDirectoryConfig {
  /** 目录类型 */
  type: ProjectDirectoryType
  /** 目录名称 */
  name: string
  /** 是否选中（用于 UI） */
  selected: boolean
}

/**
 * 可创建的模板类型
 */
export type ProjectTemplateType = 'chapter' | 'character' | 'worldSetting' | 'readme'

/**
 * 项目模板配置
 */
export interface ProjectTemplateConfig {
  /** 模板类型 */
  type: ProjectTemplateType
  /** 模板名称 */
  name: string
  /** 是否选中（用于 UI） */
  selected: boolean
}

/**
 * 默认目录配置
 */
export const DEFAULT_DIRECTORIES: ProjectDirectoryConfig[] = [
  { type: 'content', name: '内容', selected: true },
  { type: 'draft', name: '草稿', selected: true },
  { type: 'reference', name: '参考资料', selected: true }
]

/**
 * 默认模板配置
 */
export const DEFAULT_TEMPLATES: ProjectTemplateConfig[] = [
  { type: 'chapter', name: '章节模板', selected: true },
  { type: 'character', name: '人物卡模板', selected: true },
  { type: 'worldSetting', name: '设定模板', selected: true },
  { type: 'readme', name: 'README', selected: true }
]

/**
 * 预设词汇类型
 */
export type PresetVocabularyType = 'character' | 'location' | 'organization' | 'item' | 'magic' | 'event'

/**
 * 预设词汇类型配置
 */
export interface PresetVocabularyConfig {
  /** 类型 ID */
  type: PresetVocabularyType
  /** 类型名称 */
  name: string
  /** 是否选中（用于 UI） */
  selected: boolean
}

/**
 * 默认预设词汇类型配置
 */
export const DEFAULT_PRESET_VOCABULARY: PresetVocabularyConfig[] = [
  { type: 'character', name: '角色', selected: true },
  { type: 'location', name: '地点', selected: true },
  { type: 'organization', name: '组织', selected: false },
  { type: 'item', name: '道具', selected: false },
  { type: 'magic', name: '魔法/技能', selected: false },
  { type: 'event', name: '事件', selected: false }
]

/**
 * 项目配置
 */
export interface Project {
  /** 项目唯一标识 (UUID) */
  id: string
  /** 项目名称 */
  name: string
  /** 项目描述 */
  description?: string
  /** 作者 */
  author?: string
  /** 项目路径（绝对路径） */
  path: string
  /** 封面图片路径 */
  cover?: string
  /** 标签 */
  tags: string[]
  /** 创建时间 (ISO 8601) */
  createdAt: string
  /** 更新时间 (ISO 8601) */
  updatedAt: string
}

/**
 * 创建项目选项
 */
export interface CreateProjectOptions {
  /** 项目名称 */
  name: string
  /** 项目路径（父目录，项目会在此目录下创建子目录） */
  parentPath: string
  /** 项目描述 */
  description?: string
  /** 作者 */
  author?: string
  /** 标签 */
  tags?: string[]
  /** 要创建的目录类型列表 */
  directories?: ProjectDirectoryType[]
  /** 要创建的模板类型列表 */
  templates?: ProjectTemplateType[]
  /** 要创建的预设词汇类型列表 */
  presetVocabulary?: PresetVocabularyType[]
}

/**
 * 最近项目记录
 */
export interface RecentProject {
  /** 项目路径 */
  path: string
  /** 项目名称 */
  name: string
  /** 最后打开时间 (ISO 8601) */
  lastOpened: string
}

/**
 * 文件类型（用于创建文件时的类型选择）
 */
export type FileType = 'chapter' | 'character' | 'setting' | 'note' | 'outline'

/**
 * 项目配置文件名
 */
export const PROJECT_CONFIG_FILE = 'anhproject.md'

/**
 * 项目元数据目录名
 */
export const PROJECT_META_DIR = '.novelhelper'

/**
 * 项目设置文件名
 */
export const PROJECT_SETTINGS_FILE = 'settings.json5'

/**
 * 词汇目录名
 */
export const VOCABULARY_DIR = 'vocabulary'

/**
 * 词汇类型文件名
 */
export const VOCABULARY_TYPES_FILE = 'types.json5'

/**
 * 预设词汇类型目录名
 */
export const VOCABULARY_DEFAULT_DIR = 'default'

/**
 * 敏感词文件名
 */
export const SENSITIVE_WORDS_FILE = 'sensitive-words.json5'

/**
 * 备份目录名
 */
export const BACKUP_DIR = 'backup'

/**
 * 图片存储目录名
 */
export const IMAGES_DIR = 'images'

/**
 * 加密密钥文件名
 */
export const ENCRYPTED_KEYS_FILE = 'encrypted-keys.json'

// ============================================
// 项目初始化数据聚合类型
// ============================================

import type { VocabularyType, VocabularyEntry, SensitiveWord } from './vocabulary'
import type { HighlightConfig } from './highlight'
import type { ProjectSettings } from './settings'
import type { FileNode } from './file'

/**
 * 关系图元数据（用于列表显示）
 */
export interface RelationshipGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  linkedVocabularyTypes: string[]
  customRelationTypes: Array<{
    id: string
    name: string
    color: string
    lineStyle: 'solid' | 'dashed' | 'dotted'
    lineWidth: number
    isBuiltIn: boolean
    order: number
  }>
  nodeStyle: 'circle' | 'card'
  nodeCount: number
  edgeCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 时间线元数据
 */
export interface TimelineMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  branchInfo: {
    type: 'main' | 'branch'
    parentTimelineId?: string
    branchFromNodeId?: string
    mergeToTimelineId?: string
    mergeToNodeId?: string
    branchLabel?: string
  }
  nodeCount: number
  tags?: string[]
  createdAt: string
  updatedAt: string
}

/**
 * 事序图元数据
 */
export interface SequenceChartMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  axisConfig: {
    defaultFormat: 'cell' | 'datetime' | 'chapter'
    cellWidth: number
    initialCellCount: number
    minCellCount: number
    maxCellCount: number
    autoExtend: boolean
    timeLabels?: Array<{ position: number; label: string }>
  }
  customEventTypes: Array<{
    id: string
    name: string
    color: string
    icon?: string
    isBuiltIn: boolean
    order: number
  }>
  eventCount: number
  tags?: string[]
  createdAt: string
  updatedAt: string
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
  nodeStyle: 'simple' | 'card'
  nodeCount: number
  viewState?: {
    zoom: number
    centerX: number
    centerY: number
    expandedNodeIds?: string[]
  }
  createdAt: string
  updatedAt: string
}

/**
 * 文件树初始化数据
 */
export interface FileTreeInitData {
  tree: FileNode[]
  expandedFolders: string[]
  showHiddenFiles: boolean
  hiddenItems: string[]
}

/**
 * 项目初始化数据（聚合接口返回）
 * 一次性返回项目打开所需的所有数据，减少 IPC 调用次数
 */
export interface ProjectInitData {
  /** 项目信息 */
  project: Project
  /** 项目设置 */
  settings: ProjectSettings
  /** 词汇类型列表 */
  vocabularyTypes: VocabularyType[]
  /** 词汇条目列表（所有类型） */
  vocabularyEntries: VocabularyEntry[]
  /** 敏感词列表 */
  sensitiveWords: SensitiveWord[]
  /** 高亮配置 */
  highlightConfig: HighlightConfig
  /** 关系图列表 */
  relationshipGraphs: RelationshipGraphMeta[]
  /** 时间线列表 */
  timelines: TimelineMeta[]
  /** 事序图列表 */
  sequenceCharts: SequenceChartMeta[]
  /** 组织架构图列表 */
  organizationGraphs: OrganizationGraphMeta[]
  /** 文件树初始化数据 */
  fileTree: FileTreeInitData
}
