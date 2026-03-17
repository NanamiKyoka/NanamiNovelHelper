/**
 * 全局设置类型定义
 */

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 全局主题配置
 */
export interface GlobalThemeConfig {
  /** 主题模式 */
  mode: ThemeMode
  /** 主题色 */
  primaryColor: string
  /** 字体大小 */
  fontSize: number
  /** 字体族 */
  fontFamily: string
}

/**
 * 默认全局主题配置
 */
export const DEFAULT_GLOBAL_THEME: GlobalThemeConfig = {
  mode: 'light',
  primaryColor: '#1890ff',
  fontSize: 14,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
}

/**
 * 窗口状态
 */
export interface WindowState {
  /** 是否最大化 */
  isMaximized: boolean
  /** 窗口 X 坐标 */
  x?: number
  /** 窗口 Y 坐标 */
  y?: number
  /** 窗口宽度 */
  width: number
  /** 窗口高度 */
  height: number
}

/**
 * 默认窗口状态
 */
export const DEFAULT_WINDOW_STATE: WindowState = {
  isMaximized: false,
  width: 1280,
  height: 800
}

/**
 * 语言设置
 */
export type Language = 'zh-CN' | 'en-US' | 'ja-JP'

/**
 * 全局设置
 */
export interface GlobalSettings {
  /** 主题配置 */
  theme: GlobalThemeConfig
  /** 窗口状态 */
  window: WindowState
  /** 语言设置 */
  language: Language
  /** 侧边栏宽度 */
  sidebarWidth: number
  /** 是否显示欢迎页面 */
  showWelcome: boolean
}

/**
 * 默认全局设置
 */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  theme: DEFAULT_GLOBAL_THEME,
  window: DEFAULT_WINDOW_STATE,
  language: 'zh-CN',
  sidebarWidth: 260,
  showWelcome: true
}

/**
 * 项目级编辑器设置
 */
export interface ProjectEditorSettings {
  /** 字体族 */
  fontFamily: string
  /** 字体大小 */
  fontSize: number
  /** 行高 */
  lineHeight: number
  /** 字间距 */
  letterSpacing: number
  /** 段落间距 */
  paragraphSpacing: number
  /** 视图模式 */
  viewMode: 'wysiwyg' | 'split'
  /** 工具栏模式 */
  toolbarMode: 'fixed' | 'floating'
  /** 是否显示工具栏 */
  showToolbar: boolean
  /** 自动保存间隔（毫秒，0 表示禁用） */
  autoSaveInterval: number
  /** 自动换行 */
  wordWrap: boolean
  /** 显示行号 */
  showLineNumbers: boolean
  /** Tab 宽度 */
  tabSize: number
  /** 拼写检查 */
  spellCheck: boolean
  /** 启用预览模式 */
  enablePreviewMode: boolean
}

/**
 * 默认项目级编辑器设置
 */
export const DEFAULT_PROJECT_EDITOR_SETTINGS: ProjectEditorSettings = {
  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  paragraphSpacing: 0.5,
  viewMode: 'wysiwyg',
  toolbarMode: 'fixed',
  showToolbar: true,
  autoSaveInterval: 30000,
  wordWrap: true,
  showLineNumbers: false,
  tabSize: 2,
  spellCheck: false,
  enablePreviewMode: false
}

/**
 * 项目级高亮设置
 */
export interface ProjectHighlightSettings {
  /** 词汇高亮开关 */
  vocabularyHighlight: boolean
  /** 敏感词检测开关 */
  sensitiveWordCheck: boolean
}

/**
 * 默认项目级高亮设置
 */
export const DEFAULT_PROJECT_HIGHLIGHT_SETTINGS: ProjectHighlightSettings = {
  vocabularyHighlight: true,
  sensitiveWordCheck: true
}

/**
 * 项目级备份设置
 */
export interface ProjectBackupSettings {
  /** 是否启用备份 */
  enabled: boolean
  /** 最大备份数量 */
  maxCount: number
}

/**
 * 默认项目级备份设置
 */
export const DEFAULT_PROJECT_BACKUP_SETTINGS: ProjectBackupSettings = {
  enabled: true,
  maxCount: 10
}

/**
 * 徽章可见性设置
 */
export interface BadgeVisibility {
  /** 词汇查询徽章 */
  vocabulary: boolean
  /** 敏感词徽章 */
  sensitive: boolean
  /** 随机起名徽章 */
  randomName: boolean
  /** 关系图徽章 */
  relationship: boolean
  /** 时间线徽章 */
  timeline: boolean
  /** 事序图徽章 */
  sequenceChart: boolean
  /** 组织架构徽章 */
  organization: boolean
  /** 终端徽章 */
  terminal: boolean
}

/**
 * 徽章类型
 */
export type BadgeType = 'vocabulary' | 'sensitive' | 'randomName' | 'relationship' | 'timeline' | 'sequenceChart' | 'organization' | 'terminal'

/**
 * 默认徽章顺序
 */
export const DEFAULT_BADGE_ORDER: BadgeType[] = [
  'vocabulary',
  'sensitive',
  'randomName',
  'relationship',
  'timeline',
  'sequenceChart',
  'organization',
  'terminal'
]

/**
 * 默认徽章可见性设置
 */
export const DEFAULT_BADGE_VISIBILITY: BadgeVisibility = {
  vocabulary: true,
  sensitive: true,
  randomName: true,
  relationship: true,
  timeline: true,
  sequenceChart: true,
  organization: true,
  terminal: true
}

/**
 * 项目级设置
 */
export interface ProjectSettings {
  /** 编辑器设置 */
  editor: ProjectEditorSettings
  /** 高亮设置 */
  highlight: ProjectHighlightSettings
  /** 自动创建词汇文件 */
  autoCreateVocabularyFile: boolean
  /** 备份设置 */
  backup: ProjectBackupSettings
  /** 徽章可见性 */
  badgeVisibility: BadgeVisibility
  /** 徽章顺序 */
  badgeOrder: BadgeType[]
  /** 显示隐藏文件（以.开头的文件/目录） */
  showHiddenFiles: boolean
}

/**
 * 默认项目级设置
 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  editor: DEFAULT_PROJECT_EDITOR_SETTINGS,
  highlight: DEFAULT_PROJECT_HIGHLIGHT_SETTINGS,
  autoCreateVocabularyFile: false,
  backup: DEFAULT_PROJECT_BACKUP_SETTINGS,
  badgeVisibility: DEFAULT_BADGE_VISIBILITY,
  badgeOrder: DEFAULT_BADGE_ORDER,
  showHiddenFiles: false
}

/**
 * 加密的敏感信息
 */
export interface EncryptedKeys {
  /** API Keys（加密存储） */
  apiKeys: Record<string, string>
  /** 加密 IV */
  iv?: string
}
