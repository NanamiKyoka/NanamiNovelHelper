/**
 * 主题类型定义
 */

// 主题模式
export type ThemeMode = 'light' | 'dark' | 'system'

// 预设主色
export interface PresetColor {
  name: string
  value: string
}

export const PRESET_COLORS: PresetColor[] = [
  { name: '极光蓝', value: '#1890ff' },
  { name: '薄暮红', value: '#f5222d' },
  { name: '火山橘', value: '#fa8c16' },
  { name: '日暮黄', value: '#fadb14' },
  { name: '极光绿', value: '#52c41a' },
  { name: '明青', value: '#13c2c2' },
  { name: '酱紫', value: '#722ed1' },
  { name: '法式洋红', value: '#eb2f96' },
  { name: '深空灰', value: '#595959' }
]

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
  primaryColor: '#1890ff',
  fontSize: 14,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
}
