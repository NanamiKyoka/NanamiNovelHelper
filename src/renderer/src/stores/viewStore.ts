/**
 * 视图系统状态管理
 *
 * 管理所有注册视图的位置（主/辅侧边栏）、激活状态、排序。
 * 位置配置持久化通过 window.api.settings.global 完成。
 */

import { create } from 'zustand'
import type { ViewDefinition, ViewConfig, ViewLocation } from '@types/view'

interface ViewStoreState {
  /** 所有已注册的视图定义（id → ViewDefinition） */
  viewDefs: Record<string, ViewDefinition>

  /** 当前主侧边栏激活的视图 id */
  activePrimaryId: string | null

  /** 当前辅助侧边栏激活的视图 id */
  activeSecondaryId: string | null

  /** 辅助侧边栏是否展开 */
  secondaryVisible: boolean

  /** 辅助侧边栏宽度（默认 320px） */
  secondaryWidth: number

  /** 运行时视图位置配置 */
  viewConfig: ViewConfig

  /** 是否已从持久化存储加载配置 */
  configLoaded: boolean

  /** 注册一组视图定义 */
  registerViews: (defs: ViewDefinition[]) => void

  /** 获取主侧边栏视图 */
  getPrimaryViews: () => ViewDefinition[]

  /** 获取辅助侧边栏视图 */
  getSecondaryViews: () => ViewDefinition[]

  /** 获取 ActivityBar 所有视图 */
  getAllViews: () => ViewDefinition[]

  /** 设置主侧边栏激活视图 */
  setActivePrimary: (id: string) => void

  /** 设置辅助侧边栏激活视图并展开 */
  setActiveSecondary: (id: string) => void

  /** 切换辅助侧边栏展开/折叠 */
  toggleSecondary: () => void

  /** 展开辅助侧边栏 */
  showSecondary: () => void

  /** 将视图移动到指定位置 */
  moveView: (viewId: string, toLocation: ViewLocation) => void

  /** 重排侧边栏内的视图顺序 */
  reorderViews: (location: ViewLocation, orderedIds: string[]) => void

  /** 设置辅助侧边栏宽度 */
  setSecondaryWidth: (width: number) => void

  /** 从持久化存储加载配置 */
  loadConfig: () => Promise<void>

  /** 保存配置到持久化存储 */
  saveConfig: () => Promise<void>
}

function buildDefaultConfig(defs: ViewDefinition[]): ViewConfig {
  const primary = defs
    .filter(d => d.defaultLocation === 'primary')
    .sort((a, b) => a.order - b.order)
    .map(d => d.id)

  const secondary = defs
    .filter(d => d.defaultLocation === 'secondary')
    .sort((a, b) => a.order - b.order)
    .map(d => d.id)

  return { primary, secondary }
}

export const useViewStore = create<ViewStoreState>((set, get) => ({
  viewDefs: {},
  activePrimaryId: null,
  activeSecondaryId: null,
  secondaryVisible: false,
  secondaryWidth: 320,
  viewConfig: { primary: [], secondary: [] },
  configLoaded: false,

  registerViews: (defs: ViewDefinition[]) => {
    const map: Record<string, ViewDefinition> = {}
    for (const d of defs) {
      map[d.id] = d
    }

    const currentConfig = get().viewConfig
    const hasConfig = currentConfig.primary.length > 0 || currentConfig.secondary.length > 0
    const config = hasConfig ? currentConfig : buildDefaultConfig(defs)

    const activePrimary = config.primary.length > 0 ? config.primary[0] : null
    const activeSecondary = config.secondary.length > 0 ? config.secondary[0] : null

    set({
      viewDefs: map,
      viewConfig: config,
      activePrimaryId: activePrimary,
      activeSecondaryId: activeSecondary
    })
  },

  getPrimaryViews: () => {
    const { viewDefs, viewConfig } = get()
    return viewConfig.primary
      .map(id => viewDefs[id])
      .filter((d): d is ViewDefinition => d != null)
  },

  getSecondaryViews: () => {
    const { viewDefs, viewConfig } = get()
    return viewConfig.secondary
      .map(id => viewDefs[id])
      .filter((d): d is ViewDefinition => d != null)
  },

  getAllViews: () => {
    const { viewDefs, viewConfig } = get()
    const allIds = [...viewConfig.primary, ...viewConfig.secondary]
    return allIds
      .map(id => viewDefs[id])
      .filter((d): d is ViewDefinition => d != null)
  },

  setActivePrimary: (id: string) => {
    set({ activePrimaryId: id })
  },

  setActiveSecondary: (id: string) => {
    set({ activeSecondaryId: id, secondaryVisible: true })
  },

  toggleSecondary: () => {
    set(state => ({ secondaryVisible: !state.secondaryVisible }))
  },

  showSecondary: () => {
    set({ secondaryVisible: true })
  },

  moveView: (viewId: string, toLocation: ViewLocation) => {
    const { viewConfig } = get()
    const newConfig = { ...viewConfig }

    newConfig.primary = newConfig.primary.filter(id => id !== viewId)
    newConfig.secondary = newConfig.secondary.filter(id => id !== viewId)

    if (toLocation === 'primary') {
      newConfig.primary = [...newConfig.primary, viewId]
    } else {
      newConfig.secondary = [...newConfig.secondary, viewId]
    }

    set({ viewConfig: newConfig })
    get().saveConfig()
  },

  reorderViews: (location: ViewLocation, orderedIds: string[]) => {
    const { viewConfig } = get()
    const newConfig = { ...viewConfig }

    if (location === 'primary') {
      newConfig.primary = orderedIds
    } else {
      newConfig.secondary = orderedIds
    }

    set({ viewConfig: newConfig })
    get().saveConfig()
  },

  setSecondaryWidth: (width: number) => {
    set({ secondaryWidth: Math.max(300, Math.min(800, width)) })
  },

  loadConfig: async () => {
    try {
      const raw = await window.api.settings.global.getViewConfig()
      const config = raw as ViewConfig | undefined

      if (config?.primary && config?.secondary) {
        set({ viewConfig: config, configLoaded: true })
        const viewDefs = get().viewDefs
        if (Object.keys(viewDefs).length > 0) {
          const activePrimary = config.primary.length > 0 ? config.primary[0] : null
          const activeSecondary = config.secondary.length > 0 ? config.secondary[0] : null
          set({ activePrimaryId: activePrimary, activeSecondaryId: activeSecondary })
        }
      } else {
        set({ configLoaded: true })
      }
    } catch {
      set({ configLoaded: true })
    }
  },

  saveConfig: async () => {
    try {
      const { viewConfig } = get()
      await window.api.settings.global.updateViewConfig(
        viewConfig as { primary: string[]; secondary: string[] }
      )
    } catch {
      // ignore
    }
  }
}))
