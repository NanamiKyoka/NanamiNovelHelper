/**
 * 设置相关类型定义
 */

// ============================================
// 全局设置
// ============================================

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system'

/**
 * 全局主题配置
 */
export interface GlobalThemeConfig {
  mode: ThemeMode
  primaryColor: string
  fontSize: number
  fontFamily: string
}

/**
 * 窗口状态
 */
export interface WindowState {
  isMaximized: boolean
  x?: number
  y?: number
  width: number
  height: number
}

/**
 * 语言选项
 */
export type Language = 'zh-CN' | 'en-US' | 'ja-JP'

/**
 * 全局设置
 */
export interface GlobalSettings {
  theme: GlobalThemeConfig
  window: WindowState
  language: Language
  sidebarWidth: number
  showWelcome: boolean
}

/**
 * 默认全局设置
 */
export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  theme: {
    mode: 'light',
    primaryColor: '#1890ff',
    fontSize: 14,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
  },
  window: {
    isMaximized: false,
    width: 1400,
    height: 900
  },
  language: 'zh-CN',
  sidebarWidth: 280,
  showWelcome: true
}

// ============================================
// 项目设置
// ============================================

/**
 * 视图模式
 */
export type ViewMode = 'wysiwyg' | 'split'

/**
 * 工具栏模式
 */
export type ToolbarMode = 'fixed' | 'floating'

/**
 * 项目编辑器设置
 */
export interface ProjectEditorSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  viewMode: ViewMode
  toolbarMode: ToolbarMode
  showToolbar: boolean
  autoSaveInterval: number
  wordWrap: boolean
  showLineNumbers: boolean
  tabSize: number
  spellCheck: boolean
  enablePreviewMode: boolean
}

/**
 * 默认项目编辑器设置
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
 * 项目高亮设置
 */
export interface ProjectHighlightSettings {
  vocabularyHighlight: boolean
  sensitiveWordCheck: boolean
}

/**
 * 默认项目高亮设置
 */
export const DEFAULT_PROJECT_HIGHLIGHT_SETTINGS: ProjectHighlightSettings = {
  vocabularyHighlight: true,
  sensitiveWordCheck: true
}

/**
 * 项目备份设置
 */
export interface ProjectBackupSettings {
  enabled: boolean
  maxCount: number
}

/**
 * 默认项目备份设置
 */
export const DEFAULT_PROJECT_BACKUP_SETTINGS: ProjectBackupSettings = {
  enabled: true,
  maxCount: 10
}

/**
 * 徽章可见性配置
 */
export interface BadgeVisibility {
  vocabulary: boolean
  sensitive: boolean
  randomName: boolean
  relationship: boolean
  timeline: boolean
  sequenceChart: boolean
  organization: boolean
  terminal: boolean
}

/**
 * 默认徽章可见性配置
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
 * 项目设置
 */
export interface ProjectSettings {
  editor: ProjectEditorSettings
  highlight: ProjectHighlightSettings
  autoCreateVocabularyFile: boolean
  backup: ProjectBackupSettings
  badgeVisibility: BadgeVisibility
  /** 显示隐藏文件（以.开头的文件/目录） */
  showHiddenFiles?: boolean
  /** 用户自定义隐藏的文件/文件夹路径列表（相对路径） */
  hiddenItems?: string[]
}

/**
 * 默认项目设置
 */
export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  editor: DEFAULT_PROJECT_EDITOR_SETTINGS,
  highlight: DEFAULT_PROJECT_HIGHLIGHT_SETTINGS,
  autoCreateVocabularyFile: false,
  backup: DEFAULT_PROJECT_BACKUP_SETTINGS,
  badgeVisibility: DEFAULT_BADGE_VISIBILITY,
  showHiddenFiles: false,
  hiddenItems: []
}

// ============================================
// 备份信息
// ============================================

/**
 * 备份信息
 */
export interface BackupInfo {
  filename: string
  createdAt: string
  size: number
}

// ============================================
// 预设颜色
// ============================================

/**
 * 预设主色
 */
export interface PresetColor {
  name: string
  value: string
}

export const PRESET_COLORS: PresetColor[] = [
  { name: '极光蓝', value: '#1890ff' },
  { name: '薄暮红', value: '#f5222d' },
  { name: '火山橘', value: '#fa8c16' },
  { name: '日暮黄', value: '#fadb14' },
  { name: '极光绿', value: '#52c41a' },
  { name: '明青', value: '#13c2c2' },
  { name: '酱紫', value: '#722ed1' },
  { name: '法式洋红', value: '#eb2f96' },
  { name: '深空灰', value: '#595959' }
]
