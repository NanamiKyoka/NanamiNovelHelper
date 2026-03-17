/**
 * 设置状态管理
 * 
 * 统一管理全局设置和项目设置
 * - 全局设置：存储在 electron-store（用户应用目录）
 * - 项目设置：存储在项目目录下的 .novelhelper/settings.json5
 */

import { create } from 'zustand'
import type {
  GlobalSettings,
  GlobalThemeConfig,
  WindowState,
  Language,
  ProjectSettings,
  ProjectEditorSettings,
  ProjectHighlightSettings,
  ProjectBackupSettings,
  BackupInfo,
  BadgeVisibility
} from '@types/settings'
import {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_PROJECT_SETTINGS
} from '@types/settings'

// 类型定义

interface SettingsState {
  // 加载状态
  isLoading: boolean
  isInitialized: boolean
  
  // 全局设置
  globalSettings: GlobalSettings
  
  // 项目设置
  projectSettings: ProjectSettings | null
  hasProject: boolean
  
  // 操作：全局设置
  initGlobalSettings: () => Promise<void>
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => Promise<void>
  resetGlobalSettings: () => Promise<void>
  
  // 操作：主题
  setThemeMode: (mode: GlobalThemeConfig['mode']) => Promise<void>
  setPrimaryColor: (color: string) => Promise<void>
  setFontSize: (size: number) => Promise<void>
  setFontFamily: (family: string) => Promise<void>
  
  // 操作：窗口状态
  setWindowState: (state: Partial<WindowState>) => Promise<void>
  
  // 操作：语言
  setLanguage: (language: Language) => Promise<void>
  
  // 操作：侧边栏
  setSidebarWidth: (width: number) => Promise<void>
  
  // 操作：欢迎页
  setShowWelcome: (show: boolean) => Promise<void>
  
  // 操作：项目设置
  initProjectSettings: () => Promise<void>
  clearProjectSettings: () => void
  updateProjectSettings: (settings: Partial<ProjectSettings>) => Promise<void>
  resetProjectSettings: () => Promise<void>
  
  // 操作：项目编辑器设置
  updateEditorSettings: (settings: Partial<ProjectEditorSettings>) => Promise<void>
  
  // 操作：项目高亮设置
  updateHighlightSettings: (settings: Partial<ProjectHighlightSettings>) => Promise<void>
  
  // 操作：项目备份设置
  updateBackupSettings: (settings: Partial<ProjectBackupSettings>) => Promise<void>
  
  // 操作：徽章可见性设置
  updateBadgeVisibility: (settings: Partial<BadgeVisibility>) => Promise<void>
  
  // 操作：API Key
  getApiKey: (keyName: string) => Promise<string | null>
  setApiKey: (keyName: string, value: string) => Promise<void>
  deleteApiKey: (keyName: string) => Promise<void>
  
  // 操作：备份
  createBackup: () => Promise<string | null>
  listBackups: () => Promise<BackupInfo[]>
  restoreBackup: (filename: string) => Promise<boolean>
  deleteBackup: (filename: string) => Promise<boolean>
  exportBackup: (filename: string) => Promise<string | null>
  importBackup: () => Promise<string | null>
  
  // 工具方法
  getResolvedThemeMode: () => 'light' | 'dark'
}

// 辅助函数

/**
 * 获取系统主题
 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// Store

export const useSettingsStore = create<SettingsState>((set, get) => ({
  // 初始状态
  isLoading: false,
  isInitialized: false,
  globalSettings: DEFAULT_GLOBAL_SETTINGS,
  projectSettings: null,
  hasProject: false,

  // 全局设置操作

  initGlobalSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.electron.settings.global.getAll()
      set({
        globalSettings: settings,
        isInitialized: true,
        isLoading: false
      })
    } catch (error) {
      console.error('Failed to init global settings:', error)
      set({
        globalSettings: DEFAULT_GLOBAL_SETTINGS,
        isInitialized: true,
        isLoading: false
      })
    }
  },
  
  updateGlobalSettings: async (updates) => {
    try {
      const settings = await window.electron.settings.global.update(updates)
      set({ globalSettings: settings })
    } catch (error) {
      console.error('Failed to update global settings:', error)
      throw error
    }
  },
  
  resetGlobalSettings: async () => {
    try {
      const settings = await window.electron.settings.global.reset()
      set({ globalSettings: settings })
    } catch (error) {
      console.error('Failed to reset global settings:', error)
      throw error
    }
  },

  // 主题操作

  setThemeMode: async (mode) => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, mode }
    await get().updateGlobalSettings({ theme: newTheme })
  },
  
  setPrimaryColor: async (primaryColor) => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, primaryColor }
    await get().updateGlobalSettings({ theme: newTheme })
  },
  
  setFontSize: async (fontSize) => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, fontSize }
    await get().updateGlobalSettings({ theme: newTheme })
  },
  
  setFontFamily: async (fontFamily) => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, fontFamily }
    await get().updateGlobalSettings({ theme: newTheme })
  },

  // 窗口状态操作

  setWindowState: async (state) => {
    const { globalSettings } = get()
    const newWindow = { ...globalSettings.window, ...state }
    await get().updateGlobalSettings({ window: newWindow })
  },

  // 语言操作

  setLanguage: async (language) => {
    await window.electron.settings.global.setLanguage(language)
    const { globalSettings } = get()
    set({ globalSettings: { ...globalSettings, language } })
  },

  // 侧边栏操作

  setSidebarWidth: async (sidebarWidth) => {
    await window.electron.settings.global.setSidebarWidth(sidebarWidth)
    const { globalSettings } = get()
    set({ globalSettings: { ...globalSettings, sidebarWidth } })
  },

  // 欢迎页操作

  setShowWelcome: async (showWelcome) => {
    await get().updateGlobalSettings({ showWelcome })
  },

  // 项目设置操作

  initProjectSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.electron.settings.project.getAll()
      set({
        projectSettings: settings,
        hasProject: true,
        isLoading: false
      })
    } catch (error) {
      console.error('Failed to init project settings:', error)
      set({
        projectSettings: DEFAULT_PROJECT_SETTINGS,
        hasProject: true,
        isLoading: false
      })
    }
  },
  
  clearProjectSettings: () => {
    set({
      projectSettings: null,
      hasProject: false
    })
  },
  
  updateProjectSettings: async (updates) => {
    try {
      const settings = await window.electron.settings.project.update(updates)
      set({ projectSettings: settings })
    } catch (error) {
      console.error('Failed to update project settings:', error)
      throw error
    }
  },
  
  resetProjectSettings: async () => {
    try {
      const settings = await window.electron.settings.project.reset()
      set({ projectSettings: settings })
    } catch (error) {
      console.error('Failed to reset project settings:', error)
      throw error
    }
  },

  // 项目编辑器设置操作

  updateEditorSettings: async (updates) => {
    const { projectSettings } = get()
    if (!projectSettings) return
    
    const newEditor = { ...projectSettings.editor, ...updates }
    await get().updateProjectSettings({ editor: newEditor })
  },

  // 项目高亮设置操作

  updateHighlightSettings: async (updates) => {
    const { projectSettings } = get()
    if (!projectSettings) return
    
    const newHighlight = { ...projectSettings.highlight, ...updates }
    await get().updateProjectSettings({ highlight: newHighlight })
  },

  // 项目备份设置操作

  updateBackupSettings: async (updates) => {
    const { projectSettings } = get()
    if (!projectSettings) return
    
    const newBackup = { ...projectSettings.backup, ...updates }
    await get().updateProjectSettings({ backup: newBackup })
  },

  // 徽章可见性设置操作

  updateBadgeVisibility: async (updates) => {
    try {
      const newBadgeVisibility = await window.electron.settings.project.updateBadgeVisibility(updates)
      const { projectSettings } = get()
      if (projectSettings) {
        set({ projectSettings: { ...projectSettings, badgeVisibility: newBadgeVisibility } })
      }
    } catch (error) {
      console.error('Failed to update badge visibility:', error)
      throw error
    }
  },

  // API Key 操作

  getApiKey: async (keyName) => {
    return await window.electron.settings.global.getApiKey(keyName)
  },
  
  setApiKey: async (keyName, value) => {
    await window.electron.settings.global.setApiKey(keyName, value)
  },
  
  deleteApiKey: async (keyName) => {
    await window.electron.settings.global.deleteApiKey(keyName)
  },

  // 备份操作

  createBackup: async () => {
    return await window.electron.backup.create()
  },
  
  listBackups: async () => {
    return await window.electron.backup.list()
  },
  
  restoreBackup: async (filename) => {
    return await window.electron.backup.restore(filename)
  },
  
  deleteBackup: async (filename) => {
    return await window.electron.backup.delete(filename)
  },
  
  exportBackup: async (filename) => {
    return await window.electron.backup.export(filename)
  },
  
  importBackup: async () => {
    return await window.electron.backup.import()
  },

  // 工具方法

  getResolvedThemeMode: () => {
    const { globalSettings } = get()
    if (globalSettings.theme.mode === 'system') {
      return getSystemTheme()
    }
    return globalSettings.theme.mode
  }
}))

// 系统主题监听

if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    const state = useSettingsStore.getState()
    if (state.globalSettings.theme.mode === 'system') {
      // 触发重新计算
      useSettingsStore.setState({ globalSettings: { ...state.globalSettings } })
    }
  })
}
