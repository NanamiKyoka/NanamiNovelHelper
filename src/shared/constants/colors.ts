/**
 * 统一颜色常量定义
 *
 * 所有颜色值应从此文件导入，避免硬编码
 *
 * 命名规范：
 * - THEME_COLORS: 调色板颜色（用于数据可视化、词汇类型等场景的配色），键名使用颜色名而非语义名
 * - FUNCTIONAL_COLORS: 功能色（与 CSS --color-* 变量对齐，用于 UI 状态反馈）
 * - SEMANTIC_COLORS: 语义化颜色（性别、严重程度等特定业务场景）
 */

/**
 * 调色板颜色配置
 * 用于数据可视化、词汇类型配色等场景，键名使用颜色名
 */
export const THEME_COLORS = {
  primary: '#1890ff',
  red: '#f5222d',
  orange: '#fa8c16',
  success: '#52c41a',
  cyan: '#13c2c2',

  purple: '#722ed1',
  magenta: '#eb2f96',
  yellow: '#fadb14',
  grey: '#595959'
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
  { name: '深空灰', value: '#595959' }
] as const

/**
 * 功能色（与 CSS --color-* 变量对齐）
 * 用于 UI 状态反馈，如错误提示、警告信息等
 */
export const FUNCTIONAL_COLORS = {
  error: '#ff4d4f',
  errorBg: '#fff2f0',
  warning: '#faad14',
  warningBg: '#fffbe6',
  success: '#52c41a',
  successBg: '#f6ffed',
  info: '#1890ff',
  infoBg: '#e6f7ff'
} as const

/**
 * 语义化颜色
 */
export const SEMANTIC_COLORS = {
  gender: {
    male: '#1890ff',
    female: '#eb2f96',
    other: '#722ed1',
    unknown: '#8c8c8c'
  },

  severity: {
    low: '#faad14',
    medium: '#fa8c16',
    high: '#f5222d',
    critical: '#a8071a'
  }
} as const

/**
 * 中性色
 */
export const NEUTRAL_COLORS = {
  white: '#ffffff',
  black: '#000000',
  dark: '#262626',
  grey: '#8c8c8c',
  lightGrey: '#bfbfbf',
  border: '#d9d9d9'
} as const

/**
 * 默认颜色值
 */
export const DEFAULT_COLORS = {
  primary: THEME_COLORS.primary,
  event: THEME_COLORS.primary,
  timeline: THEME_COLORS.primary,
  node: THEME_COLORS.primary,
  background: NEUTRAL_COLORS.white
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
  '#a0d911', // 黄绿色
  '#f5222d' // 红色
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
  '#f368e0'
] as const

/**
 * 终端主题配色（VS Code 风格）
 */
export const TERMINAL_THEMES = {
  dark: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#ffffff',
    cursorAccent: '#000000',
    selectionBackground: '#264f78',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5'
  },
  light: {
    background: '#ffffff',
    foreground: '#333333',
    cursor: '#000000',
    cursorAccent: '#ffffff',
    selectionBackground: '#add6ff',
    black: '#000000',
    red: '#cd3131',
    green: '#00bc00',
    yellow: '#949800',
    blue: '#0451a5',
    magenta: '#bc05bc',
    cyan: '#0598bc',
    white: '#555555',
    brightBlack: '#666666',
    brightRed: '#cd3131',
    brightGreen: '#14ce14',
    brightYellow: '#b5ba00',
    brightBlue: '#0451a5',
    brightMagenta: '#bc05bc',
    brightCyan: '#0598bc',
    brightWhite: '#a5a5a5'
  }
} as const

/**
 * 类型定义
 */
export type ThemeColorKey = keyof typeof THEME_COLORS
export type SemanticColorCategory = keyof typeof SEMANTIC_COLORS
