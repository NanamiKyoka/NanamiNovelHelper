/**
 * 项目相关类型定义（主进程专用）
 * 
 * 基础类型从 @shared 导入，此文件仅包含主进程专用的扩展类型
 */

// 从共享类型重新导出
export {
  // 类型
  Project,
  CreateProjectOptions,
  RecentProject,
  ProjectDirectoryType,
  ProjectDirectoryConfig,
  ProjectTemplateType,
  ProjectTemplateConfig,
  PresetVocabularyType,
  PresetVocabularyConfig,
  PresetVocabularyWizardConfig,
  FileType,
  // 常量
  PROJECT_CONFIG_FILE,
  PROJECT_META_DIR,
  PROJECT_SETTINGS_FILE,
  VOCABULARY_DIR,
  VOCABULARY_TYPES_FILE,
  VOCABULARY_DEFAULT_DIR,
  VOCABULARY_DETAILS_DIR,
  SENSITIVE_WORDS_FILE,
  BACKUP_DIR,
  IMAGES_DIR,
  ENCRYPTED_KEYS_FILE,
  DEFAULT_DIRECTORIES,
  DEFAULT_TEMPLATES,
  PRESET_VOCABULARY_TYPES,
  DEFAULT_PRESET_VOCABULARY,
} from '@shared/project'

// ============================================
// 主进程专用类型
// ============================================

import type { VocabularyType, VocabularyEntry, SensitiveWord } from '@shared/vocabulary'
import type { HighlightConfig } from '@shared/highlight'
import type { Project } from '@shared/project'

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
 * 文件节点（简化版，用于初始化数据）
 */
export interface FileNode {
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
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

// 从 settings 导入（避免循环依赖）
import type { ProjectSettings } from './settings'