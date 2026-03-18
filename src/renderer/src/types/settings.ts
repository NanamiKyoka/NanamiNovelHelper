/**
 * 设置相关类型定义
 */

export type ThemeMode = 'light' | 'dark' | 'system'

export interface GlobalThemeConfig {
  mode: ThemeMode
  primaryColor: string
  fontSize: number
  fontFamily: string
}

export interface WindowState {
  isMaximized: boolean
  x?: number
  y?: number
  width: number
  height: number
}

export type Language = 'zh-CN' | 'en-US' | 'ja-JP'

export interface GlobalSettings {
  theme: GlobalThemeConfig
  window: WindowState
  language: Language
  sidebarWidth: number
  showWelcome: boolean
}

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

export type ViewMode = 'wysiwyg' | 'split'
export type ToolbarMode = 'fixed' | 'floating'

export interface ProjectEditorSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  viewMode: ViewMode
  toolbarMode: ToolbarMode
  showToolbar: boolean
  autoSaveInterval: number // 毫秒
  wordWrap: boolean
  showLineNumbers: boolean
  tabSize: number
  spellCheck: boolean
  enablePreviewMode: boolean
}

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

export interface ProjectHighlightSettings {
  vocabularyHighlight: boolean
  sensitiveWordCheck: boolean
}

export const DEFAULT_PROJECT_HIGHLIGHT_SETTINGS: ProjectHighlightSettings = {
  vocabularyHighlight: true,
  sensitiveWordCheck: true
}

export interface ProjectBackupSettings {
  enabled: boolean
  maxCount: number
}

export const DEFAULT_PROJECT_BACKUP_SETTINGS: ProjectBackupSettings = {
  enabled: true,
  maxCount: 10
}

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

/** 左侧边栏徽章入口可见性（仅包含有全屏功能的徽章） */
export interface SidebarBadgeVisibility {
  vocabulary: boolean
  sensitive: boolean
  relationship: boolean
  timeline: boolean
  sequenceChart: boolean
  organization: boolean
}

export const DEFAULT_SIDEBAR_BADGE_VISIBILITY: SidebarBadgeVisibility = {
  vocabulary: true,
  sensitive: true,
  relationship: true,
  timeline: true,
  sequenceChart: true,
  organization: true
}

export const DEFAULT_SIDEBAR_BADGE_ORDER = ['vocabulary', 'sensitive', 'relationship', 'timeline', 'sequenceChart', 'organization']

export interface ProjectSettings {
  editor: ProjectEditorSettings
  highlight: ProjectHighlightSettings
  autoCreateVocabularyFile: boolean
  backup: ProjectBackupSettings
  badgeVisibility: BadgeVisibility
  sidebarBadgeVisibility: SidebarBadgeVisibility
  sidebarBadgeOrder?: string[]
  showHiddenFiles?: boolean // 以.开头的文件/目录
  hiddenItems?: string[] // 用户自定义隐藏的文件/文件夹（相对路径）
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  editor: DEFAULT_PROJECT_EDITOR_SETTINGS,
  highlight: DEFAULT_PROJECT_HIGHLIGHT_SETTINGS,
  autoCreateVocabularyFile: false,
  backup: DEFAULT_PROJECT_BACKUP_SETTINGS,
  badgeVisibility: DEFAULT_BADGE_VISIBILITY,
  sidebarBadgeVisibility: DEFAULT_SIDEBAR_BADGE_VISIBILITY,
  sidebarBadgeOrder: [...DEFAULT_SIDEBAR_BADGE_ORDER],
  showHiddenFiles: false,
  hiddenItems: []
}

export interface BackupInfo {
  filename: string
  createdAt: string
  size: number
}

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