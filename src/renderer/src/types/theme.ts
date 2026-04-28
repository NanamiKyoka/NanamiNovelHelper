/**
 * 主题类型定义
 */

import { THEME_COLOR_OPTIONS, DEFAULT_COLORS } from '@shared/constants/colors'

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'system'

// 预设主色
export interface PresetColor {
  name: string
  value: string
}

// 预设颜色列表（从共享常量导入）
export const PRESET_COLORS: PresetColor[] = [...THEME_COLOR_OPTIONS]

// 主题配置
export interface ThemeConfig {
  mode: ThemeMode
  primaryColor: string
  fontSize: number
  fontFamily: string
}

// 默认主题配置
export const DEFAULT_THEME: ThemeConfig = {
  mode: 'light',
  primaryColor: DEFAULT_COLORS.primary,
  fontSize: 14,
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
}
