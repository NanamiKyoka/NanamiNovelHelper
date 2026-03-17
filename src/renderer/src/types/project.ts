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
  /** 是否选中 */
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
  /** 是否选中 */
  selected: boolean
}

/**
 * 预设词汇类型
 */
export type PresetVocabularyType = 'character' | 'location' | 'organization' | 'item' | 'magic' | 'event'

/**
 * 预设词汇配置
 */
export interface PresetVocabularyConfig {
  /** 类型 ID */
  type: PresetVocabularyType
  /** 类型名称 */
  name: string
  /** 图标 */
  icon: string
  /** 是否选中 */
  selected: boolean
}

/**
 * 默认目录配置（移除了设定目录）
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
  { type: 'worldSetting', name: '世界观设定模板', selected: true },
  { type: 'readme', name: 'README', selected: true }
]

/**
 * 预设词汇类型配置
 */
export const PRESET_VOCABULARY_TYPES: PresetVocabularyConfig[] = [
  { type: 'character', name: '角色', icon: 'UserOutlined', selected: true },
  { type: 'location', name: '地点', icon: 'EnvironmentOutlined', selected: true },
  { type: 'organization', name: '组织', icon: 'TeamOutlined', selected: false },
  { type: 'item', name: '道具', icon: 'GiftOutlined', selected: false },
  { type: 'magic', name: '魔法/技能', icon: 'ThunderboltOutlined', selected: false },
  { type: 'event', name: '事件', icon: 'CalendarOutlined', selected: false }
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
  /** 预设词汇类型列表 */
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
 * 文件类型
 */
export type FileType = 'chapter' | 'character' | 'setting' | 'note' | 'outline'