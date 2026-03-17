/**
 * 徽章配置状态管理
 * 管理右侧徽章的显示顺序
 */

import { create } from 'zustand'
import { DEFAULT_BADGE_ORDER, type BadgeType } from '@types/badge'
import { useProjectStore } from './projectStore'

interface BadgeConfigState {
  // 徽章顺序
  badgeOrder: BadgeType[]
  // 是否正在加载
  isLoading: boolean
  // 是否已加载
  isLoaded: boolean

  // Actions
  loadConfig: () => Promise<void>
  saveConfig: (order: BadgeType[]) => Promise<void>
  setBadgeOrder: (order: BadgeType[]) => void
  moveBadge: (fromIndex: number, toIndex: number) => void
}

export const useBadgeConfigStore = create<BadgeConfigState>((set, get) => ({
  badgeOrder: [...DEFAULT_BADGE_ORDER],
  isLoading: false,
  isLoaded: false,

  loadConfig: async () => {
    const project = useProjectStore.getState().currentProject
    if (!project) {
      set({ badgeOrder: [...DEFAULT_BADGE_ORDER], isLoaded: true })
      return
    }

    set({ isLoading: true })

    try {
      // 使用 IPC 调用获取徽章顺序
      const badgeOrder = await window.electron.settings.project.getBadgeOrder()
      
      // 验证徽章顺序
      if (badgeOrder && Array.isArray(badgeOrder) && badgeOrder.length > 0) {
        // 确保所有默认徽章都在列表中
        const validOrder = badgeOrder.filter(b => DEFAULT_BADGE_ORDER.includes(b))
        const missingBadges = DEFAULT_BADGE_ORDER.filter(b => !validOrder.includes(b))
        const finalOrder = [...validOrder, ...missingBadges]
        set({ badgeOrder: finalOrder, isLoaded: true, isLoading: false })
      } else {
        set({ badgeOrder: [...DEFAULT_BADGE_ORDER], isLoaded: true, isLoading: false })
      }
    } catch (error) {
      console.error('加载徽章配置失败:', error)
      set({ badgeOrder: [...DEFAULT_BADGE_ORDER], isLoaded: true, isLoading: false })
    }
  },

  saveConfig: async (order: BadgeType[]) => {
    try {
      // 使用 IPC 调用保存徽章顺序
      await window.electron.settings.project.setBadgeOrder(order)
      set({ badgeOrder: order })
    } catch (error) {
      console.error('保存徽章配置失败:', error)
    }
  },

  setBadgeOrder: (order: BadgeType[]) => {
    set({ badgeOrder: order })
    get().saveConfig(order)
  },

  moveBadge: (fromIndex: number, toIndex: number) => {
    const { badgeOrder, saveConfig } = get()
    const newOrder = [...badgeOrder]
    const [removed] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, removed)
    set({ badgeOrder: newOrder })
    saveConfig(newOrder)
  }
}))
