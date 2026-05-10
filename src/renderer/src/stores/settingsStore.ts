/**
 * 设置状态管理
 * 全局设置存 Tauri Store，项目设置存 .novelhelper/settings.json5
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
  SidebarBadgeVisibility,
  GlobalLayoutSettings,
  CustomChunkType
} from '@shared/settings'
import { DEFAULT_GLOBAL_SETTINGS, DEFAULT_PROJECT_SETTINGS } from '@shared/settings'
import { getSystemTheme, onSystemThemeChange } from '@utils/theme'

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
  // 全局布局设置
  updateLayoutSettings: (layout: Partial<GlobalLayoutSettings>) => Promise<void>
  updateBadgeVisibility: (settings: Partial<BadgeVisibility>) => Promise<void>
  updateSidebarBadgeVisibility: (settings: Partial<SidebarBadgeVisibility>) => Promise<void>
  updateSidebarBadgeOrder: (order: string[]) => Promise<void>
  setShowHiddenFiles: (show: boolean) => Promise<void>
  // 项目设置
  initProjectSettings: () => Promise<void>
  clearProjectSettings: () => void
  updateProjectSettings: (settings: Partial<ProjectSettings>) => Promise<void>
  resetProjectSettings: () => Promise<void>
  updateEditorSettings: (settings: Partial<ProjectEditorSettings>) => Promise<void>
  updateHighlightSettings: (settings: Partial<ProjectHighlightSettings>) => Promise<void>
  updateBackupSettings: (settings: Partial<ProjectBackupSettings>) => Promise<void>
  // 自定义板块类型
  addCustomChunkType: (chunkType: Omit<CustomChunkType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<CustomChunkType | null>
  updateCustomChunkType: (id: string, updates: Partial<Omit<CustomChunkType, 'id' | 'createdAt'>>) => Promise<void>
  deleteCustomChunkType: (id: string) => Promise<void>
  // API Key
  getApiKey: (keyName: string) => Promise<string | null>
  setApiKey: (keyName: string, value: string) => Promise<void>
  deleteApiKey: (keyName: string) => Promise<void>
  // 备份
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  isLoading: false,
  isInitialized: false,
  globalSettings: DEFAULT_GLOBAL_SETTINGS,
  projectSettings: null,
  hasProject: false,

  initGlobalSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.settings.global.getAll()
      set({
        globalSettings: settings && typeof settings === 'object' ? { ...DEFAULT_GLOBAL_SETTINGS, ...settings } : DEFAULT_GLOBAL_SETTINGS,
        isInitialized: true,
        isLoading: false
      })
    } catch (error) {
      console.error('Failed to init global settings:', error)
      set({ globalSettings: DEFAULT_GLOBAL_SETTINGS, isInitialized: true, isLoading: false })
    }
  },

  updateGlobalSettings: async updates => {
    try {
      const settings = await window.api.settings.global.update(updates)
      set({ globalSettings: settings })
    } catch (error) {
      console.error('Failed to update global settings:', error)
      throw error
    }
  },

  resetGlobalSettings: async () => {
    try {
      const settings = await window.api.settings.global.reset()
      set({ globalSettings: settings })
    } catch (error) {
      console.error('Failed to reset global settings:', error)
      throw error
    }
  },

  setThemeMode: async mode => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, mode }
    await get().updateGlobalSettings({ theme: newTheme })
  },

  setPrimaryColor: async primaryColor => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, primaryColor }
    await get().updateGlobalSettings({ theme: newTheme })
  },

  setFontSize: async fontSize => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, fontSize }
    await get().updateGlobalSettings({ theme: newTheme })
  },

  setFontFamily: async fontFamily => {
    const { globalSettings } = get()
    const newTheme = { ...globalSettings.theme, fontFamily }
    await get().updateGlobalSettings({ theme: newTheme })
  },

  setWindowState: async state => {
    const { globalSettings } = get()
    const newWindow = { ...globalSettings.window, ...state }
    await get().updateGlobalSettings({ window: newWindow })
  },

  setLanguage: async language => {
    await window.api.settings.global.setLanguage(language)
    const { globalSettings } = get()
    set({ globalSettings: { ...globalSettings, language } })
  },

  setSidebarWidth: async sidebarWidth => {
    await window.api.settings.global.setSidebarWidth(sidebarWidth)
    const { globalSettings } = get()
    set({ globalSettings: { ...globalSettings, sidebarWidth } })
  },

  setShowWelcome: async showWelcome => {
    await get().updateGlobalSettings({ showWelcome })
  },

  // 全局布局设置
  updateLayoutSettings: async layout => {
    try {
      const newLayout = await window.api.settings.global.updateLayout(layout)
      const { globalSettings } = get()
      set({ globalSettings: { ...globalSettings, layout: newLayout } })
    } catch (error) {
      console.error('Failed to update layout settings:', error)
      throw error
    }
  },

  updateBadgeVisibility: async updates => {
    try {
      const newBadgeVisibility =
        await window.api.settings.global.updateBadgeVisibility(updates)
      const { globalSettings } = get()
      set({
        globalSettings: {
          ...globalSettings,
          layout: { ...globalSettings.layout, badgeVisibility: newBadgeVisibility }
        }
      })
    } catch (error) {
      console.error('Failed to update badge visibility:', error)
      throw error
    }
  },

  updateSidebarBadgeVisibility: async updates => {
    try {
      const newSidebarBadgeVisibility =
        await window.api.settings.global.updateSidebarBadgeVisibility(updates)
      const { globalSettings } = get()
      set({
        globalSettings: {
          ...globalSettings,
          layout: { ...globalSettings.layout, sidebarBadgeVisibility: newSidebarBadgeVisibility }
        }
      })
    } catch (error) {
      console.error('Failed to update sidebar badge visibility:', error)
      throw error
    }
  },

  updateSidebarBadgeOrder: async order => {
    try {
      const newOrder = await window.api.settings.global.updateSidebarBadgeOrder(order)
      const { globalSettings } = get()
      set({
        globalSettings: {
          ...globalSettings,
          layout: { ...globalSettings.layout, sidebarBadgeOrder: newOrder }
        }
      })
    } catch (error) {
      console.error('Failed to update sidebar badge order:', error)
      throw error
    }
  },

  setShowHiddenFiles: async show => {
    try {
      await window.api.settings.global.setShowHiddenFiles(show)
      const { globalSettings } = get()
      set({
        globalSettings: {
          ...globalSettings,
          layout: { ...globalSettings.layout, showHiddenFiles: show }
        }
      })
    } catch (error) {
      console.error('Failed to set show hidden files:', error)
      throw error
    }
  },

  initProjectSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await window.api.settings.project.getAll()
      const mergedSettings = settings && typeof settings === 'object' 
        ? { 
            ...DEFAULT_PROJECT_SETTINGS, 
            ...settings,
            customChunkTypes: settings.customChunkTypes ?? DEFAULT_PROJECT_SETTINGS.customChunkTypes
          } 
        : DEFAULT_PROJECT_SETTINGS
      set({
        projectSettings: mergedSettings,
        hasProject: true,
        isLoading: false
      })
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
    set({ 
      projectSettings: settings || DEFAULT_PROJECT_SETTINGS, 
      hasProject: true 
    })
  },

  updateProjectSettings: async updates => {
    try {
      const { projectSettings } = get()
      const settings = await window.api.settings.project.update(updates)
      
      const mergedSettings = {
        ...DEFAULT_PROJECT_SETTINGS,
        ...settings,
        customChunkTypes: Array.isArray(settings.customChunkTypes) 
          ? settings.customChunkTypes 
          : projectSettings?.customChunkTypes ?? []
      }
      
      set({ projectSettings: mergedSettings })
    } catch (error) {
      console.error('Failed to update project settings:', error)
      throw error
    }
  },

  resetProjectSettings: async () => {
    try {
      const settings = await window.api.settings.project.reset()
      set({ projectSettings: settings })
    } catch (error) {
      console.error('Failed to reset project settings:', error)
      throw error
    }
  },

  updateEditorSettings: async updates => {
    const { projectSettings } = get()
    if (!projectSettings) return
    const newEditor = { ...projectSettings.editor, ...updates }
    await get().updateProjectSettings({ editor: newEditor })
  },

  updateHighlightSettings: async updates => {
    const { projectSettings } = get()
    if (!projectSettings) return
    const newHighlight = { ...projectSettings.highlight, ...updates }
    await get().updateProjectSettings({ highlight: newHighlight })
  },

  updateBackupSettings: async updates => {
    const { projectSettings } = get()
    if (!projectSettings) return
    const newBackup = { ...projectSettings.backup, ...updates }
    await get().updateProjectSettings({ backup: newBackup })
  },

  addCustomChunkType: async chunkTypeData => {
    const { projectSettings } = get()
    if (!projectSettings) return null

    const now = new Date().toISOString()
    const newChunkType: CustomChunkType = {
      ...chunkTypeData,
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now
    }

    const newCustomChunkTypes = [...projectSettings.customChunkTypes, newChunkType]
    await get().updateProjectSettings({ customChunkTypes: newCustomChunkTypes })
    return newChunkType
  },

  updateCustomChunkType: async (id, updates) => {
    const { projectSettings } = get()
    if (!projectSettings) return

    const newCustomChunkTypes = projectSettings.customChunkTypes.map(ct =>
      ct.id === id ? { ...ct, ...updates, updatedAt: new Date().toISOString() } : ct
    )
    await get().updateProjectSettings({ customChunkTypes: newCustomChunkTypes })
  },

  deleteCustomChunkType: async id => {
    const { projectSettings } = get()
    if (!projectSettings) return

    const newCustomChunkTypes = projectSettings.customChunkTypes.filter(ct => ct.id !== id)
    await get().updateProjectSettings({ customChunkTypes: newCustomChunkTypes })
  },

  getApiKey: async keyName => {
    return await window.api.settings.global.getApiKey(keyName)
  },

  setApiKey: async (keyName, value) => {
    await window.api.settings.global.setApiKey(keyName, value)
  },

  deleteApiKey: async keyName => {
    await window.api.settings.global.deleteApiKey(keyName)
  },

  createBackup: async () => {
    return await window.api.backup.create()
  },

  listBackups: async () => {
    return await window.api.backup.list()
  },

  restoreBackup: async filename => {
    return await window.api.backup.restore(filename)
  },

  deleteBackup: async filename => {
    return await window.api.backup.delete(filename)
  },

  exportBackup: async filename => {
    return await window.api.backup.export(filename)
  },

  importBackup: async () => {
    return await window.api.backup.import()
  },

  getResolvedThemeMode: () => {
    const { globalSettings } = get()
    if (globalSettings.theme.mode === 'system') {
      return getSystemTheme()
    }
    return globalSettings.theme.mode
  }
}))

onSystemThemeChange(() => {
  const state = useSettingsStore.getState()
  if (state.globalSettings.theme.mode === 'system') {
    useSettingsStore.setState({ globalSettings: { ...state.globalSettings } })
  }
})
