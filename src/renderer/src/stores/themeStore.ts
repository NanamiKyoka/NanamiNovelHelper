/**
 * 主题状态管理
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeConfig, ThemeMode } from '@types/theme'
import { DEFAULT_THEME } from '@types/theme'

interface ThemeState {
  config: ThemeConfig
  // 实际使用的模式（解析 system 后的实际值）
  resolvedMode: 'light' | 'dark'
  
  // Actions
  setMode: (mode: ThemeMode) => void
  setPrimaryColor: (color: string) => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  resetTheme: () => void
}

// 获取系统主题
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

// 解析主题模式
const resolveMode = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    return getSystemTheme()
  }
  return mode
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_THEME,
      resolvedMode: resolveMode(DEFAULT_THEME.mode),

      setMode: (mode) => {
        set({
          config: { ...get().config, mode },
          resolvedMode: resolveMode(mode)
        })
      },

      setPrimaryColor: (primaryColor) => {
        set({
          config: { ...get().config, primaryColor }
        })
      },

      setFontSize: (fontSize) => {
        set({
          config: { ...get().config, fontSize }
        })
      },

      setFontFamily: (fontFamily) => {
        set({
          config: { ...get().config, fontFamily }
        })
      },

      resetTheme: () => {
        set({
          config: DEFAULT_THEME,
          resolvedMode: resolveMode(DEFAULT_THEME.mode)
        })
      }
    }),
    {
      name: 'nanami-theme',
      partialize: (state) => ({ config: state.config }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // 重新计算 resolvedMode
          state.resolvedMode = resolveMode(state.config.mode)
        }
      }
    }
  )
)

// 监听系统主题变化
if (typeof window !== 'undefined') {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', (e) => {
    const state = useThemeStore.getState()
    if (state.config.mode === 'system') {
      useThemeStore.setState({ resolvedMode: e.matches ? 'dark' : 'light' })
    }
  })
}
