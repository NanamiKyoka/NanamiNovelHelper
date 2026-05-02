/**
 * 主题状态管理
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ThemeConfig, ThemeMode } from '@types/theme'
import { DEFAULT_THEME } from '@types/theme'
import { getSystemTheme, resolveThemeMode, onSystemThemeChange } from '@utils/theme'

interface ThemeState {
  config: ThemeConfig
  resolvedMode: 'light' | 'dark'

  setMode: (mode: ThemeMode) => void
  setPrimaryColor: (color: string) => void
  setFontSize: (size: number) => void
  setFontFamily: (family: string) => void
  resetTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      config: DEFAULT_THEME,
      resolvedMode: resolveThemeMode(DEFAULT_THEME.mode),

      setMode: mode => {
        set({
          config: { ...get().config, mode },
          resolvedMode: resolveThemeMode(mode)
        })
      },

      setPrimaryColor: primaryColor => {
        set({
          config: { ...get().config, primaryColor }
        })
      },

      setFontSize: fontSize => {
        set({
          config: { ...get().config, fontSize }
        })
      },

      setFontFamily: fontFamily => {
        set({
          config: { ...get().config, fontFamily }
        })
      },

      resetTheme: () => {
        set({
          config: DEFAULT_THEME,
          resolvedMode: resolveThemeMode(DEFAULT_THEME.mode)
        })
      }
    }),
    {
      name: 'nanami-theme',
      partialize: state => ({ config: state.config }),
      onRehydrateStorage: () => state => {
        if (state) {
          state.resolvedMode = resolveThemeMode(state.config.mode)
        }
      }
    }
  )
)

onSystemThemeChange(isDark => {
  const state = useThemeStore.getState()
  if (state.config.mode === 'system') {
    useThemeStore.setState({ resolvedMode: isDark ? 'dark' : 'light' })
  }
})
