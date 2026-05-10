/**
 * 徽章配置状态管理
 * 管理右侧徽章的显示顺序（全局设置）
 */

import { create } from 'zustand'
import { DEFAULT_BADGE_ORDER, type BadgeType } from '@types/badge'

interface BadgeConfigState {
  badgeOrder: BadgeType[]
  isLoading: boolean
  isLoaded: boolean

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
    set({ isLoading: true })

    try {
      const badgeOrder = await window.api.settings.global.getBadgeOrder()

      if (badgeOrder && Array.isArray(badgeOrder) && badgeOrder.length > 0) {
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
      await window.api.settings.global.updateBadgeOrder(order)
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
