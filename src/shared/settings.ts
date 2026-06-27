/**
 * 设置类型定义（共享）
 *
 * 全局设置（跨项目共享，存 Tauri Store）和项目设置（跟随项目，存 .novelhelper/settings.json5）
 * 所有设置项都有默认值，避免 undefined 导致运行时错误
 */

import { DEFAULT_COLORS, THEME_COLOR_OPTIONS } from './constants/colors'
import { WritingGoalConfig } from './writing-goal'

// ============ 主题相关 ============

export type ThemeMode = 'light' | 'dark' | 'system'

export interface GlobalThemeConfig {
  mode: ThemeMode
  primaryColor: string
  fontSize: number
  fontFamily: string
}

export const DEFAULT_GLOBAL_THEME: GlobalThemeConfig = {
  mode: 'light',
  primaryColor: DEFAULT_COLORS.primary,
  fontSize: 14,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
}

// ============ 窗口状态 ============

export interface WindowState {
  isMaximized: boolean
  x?: number
  y?: number
  width: number
  height: number
}

export const DEFAULT_WINDOW_STATE: WindowState = {
  isMaximized: false,
  width: 1400,
  height: 900
}

// ============ 语言 ============

export type Language = 'zh-CN' | 'en-US' | 'ja-JP'

// ============ 徽章可见性 ============

export interface BadgeVisibility {
  vocabulary: boolean
  sensitive: boolean
  randomName: boolean
  relationship: boolean
  timeline: boolean
  sequenceChart: boolean
  organization: boolean
  map: boolean
}

export type BadgeType =
  | 'vocabulary'
  | 'sensitive'
  | 'randomName'
  | 'relationship'
  | 'timeline'
  | 'sequenceChart'
  | 'organization'
  | 'map'

export const DEFAULT_BADGE_ORDER: BadgeType[] = [
  'vocabulary',
  'sensitive',
  'randomName',
  'relationship',
  'timeline',
  'sequenceChart',
  'organization',
  'map',
]

export const DEFAULT_BADGE_VISIBILITY: BadgeVisibility = {
  vocabulary: true,
  sensitive: true,
  randomName: true,
  relationship: true,
  timeline: true,
  sequenceChart: true,
  organization: true,
  map: true,
}

// ============ 侧边栏徽章可见性 ============

/** 左侧边栏徽章入口可见性（仅包含有全屏功能的徽章） */
export interface SidebarBadgeVisibility {
  vocabulary: boolean
  sensitive: boolean
  relationship: boolean
  timeline: boolean
  sequenceChart: boolean
  organization: boolean
  map: boolean
  aiAssistant: boolean
  writingGoal: boolean
}

export const DEFAULT_SIDEBAR_BADGE_VISIBILITY: SidebarBadgeVisibility = {
  vocabulary: true,
  sensitive: true,
  relationship: true,
  timeline: true,
  sequenceChart: true,
  organization: true,
  map: true,
  aiAssistant: true,
  writingGoal: true
}

export const DEFAULT_SIDEBAR_BADGE_ORDER = [
  'vocabulary',
  'sensitive',
  'relationship',
  'timeline',
  'sequenceChart',
  'organization',
  'map',
  'aiAssistant',
  'writingGoal'
]

// ============ 全局布局设置 ============

/**
 * 全局布局设置
 * 控制界面布局偏好，跨项目共享
 */
export interface GlobalLayoutSettings {
  badgeVisibility: BadgeVisibility
  badgeOrder: BadgeType[]
  sidebarBadgeVisibility: SidebarBadgeVisibility
  sidebarBadgeOrder: string[]
  showHiddenFiles: boolean
}

export const DEFAULT_GLOBAL_LAYOUT_SETTINGS: GlobalLayoutSettings = {
  badgeVisibility: DEFAULT_BADGE_VISIBILITY,
  badgeOrder: DEFAULT_BADGE_ORDER,
  sidebarBadgeVisibility: DEFAULT_SIDEBAR_BADGE_VISIBILITY,
  sidebarBadgeOrder: DEFAULT_SIDEBAR_BADGE_ORDER,
  showHiddenFiles: false
}

// ============ 全局设置 ============

/**
 * 全局设置
 * 存储在 Tauri Store，路径：
 * - Windows: %APPDATA%/NanamiNovelHelper/
 * - macOS: ~/Library/Application Support/NanamiNovelHelper/
 * - Linux: ~/.configNanamiNovelHelper/
 */
export interface GlobalSettings {
  theme: GlobalThemeConfig
  window: WindowState
  language: Language
  sidebarWidth: number
  rightSidebarWidth: number
  showWelcome: boolean
  layout: GlobalLayoutSettings
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  theme: DEFAULT_GLOBAL_THEME,
  window: DEFAULT_WINDOW_STATE,
  language: 'zh-CN',
  sidebarWidth: 280,
  rightSidebarWidth: 400,
  showWelcome: true,
  layout: DEFAULT_GLOBAL_LAYOUT_SETTINGS
}

// ============ 项目编辑器设置 ============

export interface ProjectEditorSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  autoSaveInterval: number // 毫秒，0 表示禁用
  enablePreviewMode: boolean
}

export const DEFAULT_PROJECT_EDITOR_SETTINGS: ProjectEditorSettings = {
  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  paragraphSpacing: 0.5,
  autoSaveInterval: 30000,
  enablePreviewMode: false
}

// ============ 项目高亮设置 ============

export interface ProjectHighlightSettings {
  vocabularyHighlight: boolean
  sensitiveWordCheck: boolean
}

export const DEFAULT_PROJECT_HIGHLIGHT_SETTINGS: ProjectHighlightSettings = {
  vocabularyHighlight: true,
  sensitiveWordCheck: true
}

// ============ 项目备份设置 ============

export interface ProjectBackupSettings {
  enabled: boolean
  maxCount: number
}

export const DEFAULT_PROJECT_BACKUP_SETTINGS: ProjectBackupSettings = {
  enabled: true,
  maxCount: 10
}

// ============ 项目设置 ============

/**
 * 项目级设置
 * 存储位置：项目根目录/.novelhelper/settings.json5
 * 使用 JSON5 格式支持注释，便于版本控制和团队共享
 * 注意：敏感信息（如 API Key）不应存储在此文件中
 */
export interface ProjectSettings {
  editor: ProjectEditorSettings
  highlight: ProjectHighlightSettings
  autoCreateVocabularyFile: boolean
  backup: ProjectBackupSettings
  expandedFolders: string[] | null
  hiddenItems: string[]
  customChunkTypes: CustomChunkType[]
  writingGoal?: WritingGoalConfig
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  editor: DEFAULT_PROJECT_EDITOR_SETTINGS,
  highlight: DEFAULT_PROJECT_HIGHLIGHT_SETTINGS,
  autoCreateVocabularyFile: false,
  backup: DEFAULT_PROJECT_BACKUP_SETTINGS,
  expandedFolders: null,
  hiddenItems: [],
  customChunkTypes: []
}

// ============ 备份信息 ============

export interface BackupInfo {
  filename: string
  createdAt: string
  size: number
}

// ============ 自定义板块类型 ============

export interface CustomChunkType {
  id: string
  name: string
  icon: string
  color: string
  description: string
  createdAt: string
  updatedAt: string
}

// ============ 预设颜色 ============

export interface PresetColor {
  name: string
  value: string
}

// 预设颜色列表（从共享常量导入）
export const PRESET_COLORS: PresetColor[] = [...THEME_COLOR_OPTIONS]
