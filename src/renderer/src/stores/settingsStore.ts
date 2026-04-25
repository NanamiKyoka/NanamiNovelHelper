/**
 * 设置状态管理
 * 全局设置存 electron-store，项目设置存 .novelhelper/settings.json5
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
  BadgeVisibility,
  SidebarBadgeVisibility
} from '@shared/settings'
import {
  DEFAULT_GLOBAL_SETTINGS,
  DEFAULT_PROJECT_SETTINGS
} from '@shared/settings'

interface SettingsState {
  isLoading: boolean
  isInitialized: boolean
  globalSettings: GlobalSettings
  projectSettings: ProjectSettings | null
  hasProject: boolean
  
  initGlobalSettings: () => Promise<void>
  updateGlobalSettings: (settings: Partial<GlobalSettings>) => Promise<void>
  resetGlobalSettings: () => Promise<void>
  setThemeMode: (mode: GlobalThemeConfig['mode']) => Promise<void>
  setPrimaryColor: (color: string) => Promise<void>
  setFontSize: (size: number) => Promise<void>
  setFontFamily: (family: string) => Promise<void>
  setWindowState: (state: Partial<WindowState>) => Promise<void>
  setLanguage: (language: Language) => Promise<void>
  setSidebarWidth: (width: number) => Promise<void>
  setShowWelcome: (show: boolean) => Promise<void>
  initProjectSettings: () => Promise<void>
  clearProjectSettings: () => void
  updateProjectSettings: (settings: Partial<ProjectSettings>) => Promise<void>
  resetProjectSettings: () => Promise<void>
  updateEditorSettings: (settings: Partial<ProjectEditorSettings>) => Promise<void>
  updateHighlightSettings: (settings: Partial<ProjectHighlightSettings>) => Promise<void>
  updateBackupSettings: (settings: Partial<ProjectBackupSettings>) => Promise<void>
  updateBadgeVisibility: (settings: Partial<BadgeVisibility>) => Promise<void>
  updateSidebarBadgeVisibility: (settings: Partial<SidebarBadgeVisibility>) => Promise<void>
  updateSidebarBadgeOrder: (order: string[]) => Promise<void>
  getApiKey: (keyName: string) => Promise<string | null>
  setApiKey: (keyName: string, value: string) => Promise<void>
  deleteApiKey: (keyName: string) => Promise<void>
  createBackup: () => Promise<string | null>
  listBackups: () => Promise<BackupInfo[]>
  restoreBackup: (filename: string) => Promise<boolean>
  deleteBackup: (filename: string) => Promise<boolean>
  exportBackup: (filename: string) => Promise<string | null>
  // 批量设置方法（用于聚合接口）
  setProjectSettings: (settings: ProjectSettings) => void
  importBackup: () => Promise<string | null>
  getResolvedThemeMode: () => 'light' | 'dark'
}

/** 获取系统主题偏好 */
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isLoading: false,
  isInitialized: false,
  globalSettings: DEFAULT_GLOBAL_SETTINGS,
  projectSettings: null,
  hasProject: false,

  initGlobalSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.electron.settings.global.getAll()
      set({ globalSettings: settings, isInitialized: true, isLoading: false })
    } catch (error) {
      console.error('Failed to init global settings:', error)
      set({ globalSettings: DEFAULT_GLOBAL_SETTINGS, isInitialized: true, isLoading: false })
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

  setWindowState: async (state) => {
    const { globalSettings } = get()
    const newWindow = { ...globalSettings.window, ...state }
    await get().updateGlobalSettings({ window: newWindow })
  },

  setLanguage: async (language) => {
    await window.electron.settings.global.setLanguage(language)
    const { globalSettings } = get()
    set({ globalSettings: { ...globalSettings, language } })
  },

  setSidebarWidth: async (sidebarWidth) => {
    await window.electron.settings.global.setSidebarWidth(sidebarWidth)
    const { globalSettings } = get()
    set({ globalSettings: { ...globalSettings, sidebarWidth } })
  },

  setShowWelcome: async (showWelcome) => {
    await get().updateGlobalSettings({ showWelcome })
  },

  initProjectSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.electron.settings.project.getAll()
      set({ projectSettings: settings, hasProject: true, isLoading: false })
    } catch (error) {
      console.error('Failed to init project settings:', error)
      set({ projectSettings: DEFAULT_PROJECT_SETTINGS, hasProject: true, isLoading: false })
    }
  },
  
  clearProjectSettings: () => {
    set({ projectSettings: null, hasProject: false })
  },

  // 批量设置项目设置（用于聚合接口）
  setProjectSettings: (settings: ProjectSettings) => {
    set({ projectSettings: settings, hasProject: true })
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

  updateEditorSettings: async (updates) => {
    const { projectSettings } = get()
    if (!projectSettings) return
    const newEditor = { ...projectSettings.editor, ...updates }
    await get().updateProjectSettings({ editor: newEditor })
  },

  updateHighlightSettings: async (updates) => {
    const { projectSettings } = get()
    if (!projectSettings) return
    const newHighlight = { ...projectSettings.highlight, ...updates }
    await get().updateProjectSettings({ highlight: newHighlight })
  },

  updateBackupSettings: async (updates) => {
    const { projectSettings } = get()
    if (!projectSettings) return
    const newBackup = { ...projectSettings.backup, ...updates }
    await get().updateProjectSettings({ backup: newBackup })
  },

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

  updateSidebarBadgeVisibility: async (updates) => {
    try {
      const newSidebarBadgeVisibility = await window.electron.settings.project.updateSidebarBadgeVisibility(updates)
      const { projectSettings } = get()
      if (projectSettings) {
        set({ projectSettings: { ...projectSettings, sidebarBadgeVisibility: newSidebarBadgeVisibility } })
      }
    } catch (error) {
      console.error('Failed to update sidebar badge visibility:', error)
      throw error
    }
  },

  updateSidebarBadgeOrder: async (order) => {
    try {
      await window.electron.settings.project.setSidebarBadgeOrder(order)
      const { projectSettings } = get()
      if (projectSettings) {
        set({ projectSettings: { ...projectSettings, sidebarBadgeOrder: order } })
      }
    } catch (error) {
      console.error('Failed to update sidebar badge order:', error)
      throw error
    }
  },

  getApiKey: async (keyName) => {
    return await window.electron.settings.global.getApiKey(keyName)
  },
  
  setApiKey: async (keyName, value) => {
    await window.electron.settings.global.setApiKey(keyName, value)
  },
  
  deleteApiKey: async (keyName) => {
    await window.electron.settings.global.deleteApiKey(keyName)
  },

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

  getResolvedThemeMode: () => {
    const { globalSettings } = get()
    if (globalSettings.theme.mode === 'system') {
      return getSystemTheme()
    }
    return globalSettings.theme.mode
  }
}))

// 监听系统主题变化，自动更新
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (_e) => {
    const state = useSettingsStore.getState()
    if (state.globalSettings.theme.mode === 'system') {
      useSettingsStore.setState({ globalSettings: { ...state.globalSettings } })
    }
  })
}