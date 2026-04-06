/**
 * 统一颜色常量定义
 * 
 * 所有颜色值应从此文件导入，避免硬编码
 */

/**
 * 主题色配置
 */
export const THEME_COLORS = {
  // 主色调
  primary: '#1890ff',      // 极光蓝
  danger: '#f5222d',       // 薄暮红
  warning: '#fa8c16',      // 火山橘
  success: '#52c41a',      // 极光绿
  info: '#13c2c2',         // 明青
  
  // 扩展色
  purple: '#722ed1',       // 酱紫
  magenta: '#eb2f96',      // 法式洋红
  yellow: '#fadb14',       // 日暮黄
  grey: '#595959',         // 深空灰
} as const

/**
 * 可选主题色列表（用于设置界面）
 */
export const THEME_COLOR_OPTIONS = [
  { name: '极光蓝', value: '#1890ff' },
  { name: '薄暮红', value: '#f5222d' },
  { name: '火山橘', value: '#fa8c16' },
  { name: '日暮黄', value: '#fadb14' },
  { name: '极光绿', value: '#52c41a' },
  { name: '明青', value: '#13c2c2' },
  { name: '酱紫', value: '#722ed1' },
  { name: '法式洋红', value: '#eb2f96' },
  { name: '深空灰', value: '#595959' },
] as const

/**
 * 语义化颜色
 */
export const SEMANTIC_COLORS = {
  // 性别
  gender: {
    male: '#1890ff',
    female: '#eb2f96',
    other: '#722ed1',
    unknown: '#8c8c8c',
  },
  
  // 优先级/严重程度
  severity: {
    low: '#52c41a',
    medium: '#faad14',
    high: '#fa8c16',
    critical: '#f5222d',
  },
  
  // 高亮级别
  highlight: {
    low: '#faad14',
    medium: '#fa8c16',
    high: '#f5222d',
    critical: '#a8071a',
  },
} as const

/**
 * 默认颜色值
 */
export const DEFAULT_COLORS = {
  primary: '#1890ff',
  event: '#1890ff',
  timeline: '#1890ff',
  node: '#1890ff',
  background: '#ffffff',
} as const

/**
 * 图表调色板
 * 用于可视化图表中的节点颜色
 */
export const CHART_PALETTE = [
  '#1890ff', // 蓝色
  '#52c41a', // 绿色
  '#faad14', // 金色
  '#eb2f96', // 粉色
  '#722ed1', // 紫色
  '#13c2c2', // 青色
  '#fa541c', // 橙色
  '#2f54eb', // 极客蓝
  '#a0d911', // 明青
  '#f5222d', // 薄暮
] as const

/**
 * 扩展调色板（更多颜色选择）
 */
export const EXTENDED_PALETTE = [
  '#ff6b6b',
  '#ff8e72',
  '#ffa94d',
  '#ffd93d',
  '#6bcb77',
  '#38a3a5',
  '#00c2a8',
  '#2d9cdb',
  '#4d96ff',
  '#6c5ce7',
  '#845ec2',
  '#b39cd0',
  '#e056fd',
  '#f368e0',
] as const

/**
 * 中性色
 */
export const NEUTRAL_COLORS = {
  white: '#ffffff',
  black: '#000000',
  dark: '#262626',
  grey: '#8c8c8c',
  lightGrey: '#bfbfbf',
  border: '#d9d9d9',
} as const

/**
 * 类型定义
 */
export type ThemeColorKey = keyof typeof THEME_COLORS
export type SemanticColorCategory = keyof typeof SEMANTIC_COLORS
