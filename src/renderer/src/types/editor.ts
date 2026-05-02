/**
 * 编辑器相关类型定义
 */

/**
 * 打开的文件标签页
 */
export interface EditorTab {
  /** 唯一标识符 */
  id: string
  /** 文件路径 */
  path: string
  /** 文件名 */
  name: string
  /** 文件类型 */
  type: 'novel' | 'markdown' | 'text' | 'diff'
  /** 是否已修改 */
  isDirty: boolean
  /** 最后激活时间 */
  lastActiveAt: number
  /** Diff 数据（仅 type='diff' 时存在） */
  diffData?: import('@shared/git').GitFileDiff
}

/**
 * 编辑器设置
 */
export interface EditorSettings {
  /** 字体族 */
  fontFamily: string
  /** 字体大小 */
  fontSize: number
  /** 行高 */
  lineHeight: number
  /** 字间距 */
  letterSpacing: number
  /** 段落间距 */
  paragraphSpacing: number
  /** 自动保存间隔（毫秒，0 表示禁用） */
  autoSaveInterval: number
  /** 启用预览模式（VSCode 风格：单击预览，双击固定） */
  enablePreviewMode: boolean
}

/**
 * 默认编辑器设置
 */
export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
  fontSize: 16,
  lineHeight: 1.8,
  letterSpacing: 0,
  paragraphSpacing: 0.5,
  autoSaveInterval: 30000, // 30秒
  enablePreviewMode: false // 禁用预览模式，单击直接固定打开
}

/**
 * 快捷键配置
 */
export interface ShortcutConfig {
  /** 粗体 */
  bold: string
  /** 斜体 */
  italic: string
  /** 删除线 */
  strike: string
  /** 代码 */
  code: string
  /** 链接 */
  link: string
  /** 图片 */
  image: string
  /** 标题 1-6 */
  heading: [string, string, string, string, string, string]
  /** 有序列表 */
  orderedList: string
  /** 无序列表 */
  bulletList: string
  /** 任务列表 */
  taskList: string
  /** 引用 */
  blockquote: string
  /** 代码块 */
  codeBlock: string
  /** 表格 */
  table: string
  /** 保存 */
  save: string
  /** 查找 */
  find: string
  /** 替换 */
  replace: string
}

/**
 * 默认快捷键配置 (Typora 风格)
 */
export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  bold: 'Ctrl+B',
  italic: 'Ctrl+I',
  strike: 'Ctrl+Shift+`',
  code: 'Ctrl+`',
  link: 'Ctrl+K',
  image: 'Ctrl+Shift+I',
  heading: ['Ctrl+1', 'Ctrl+2', 'Ctrl+3', 'Ctrl+4', 'Ctrl+5', 'Ctrl+6'],
  orderedList: 'Ctrl+Shift+O',
  bulletList: 'Ctrl+Shift+U',
  taskList: 'Ctrl+Shift+X',
  blockquote: 'Ctrl+Shift+Q',
  codeBlock: 'Ctrl+Shift+C',
  table: 'Ctrl+T',
  save: 'Ctrl+S',
  find: 'Ctrl+F',
  replace: 'Ctrl+H'
}

/**
 * 字数统计（参考 Andrea-novel-helper 的统计算法）
 *
 * 统计规则：
 * - 中文字符（CJK）按字计算
 * - 英文按单词计算（连续的字母数字下划线为一个单词）
 * - 总字数 = CJK 字符数 + 英文单词数
 */
export interface WordCount {
  /** CJK 字符数（中日韩文字） */
  cjkChars: number
  /** ASCII 字符数 */
  asciiChars: number
  /** 英文单词数 */
  words: number
  /** 非空白字符数 */
  nonWSChars: number
  /** 非空白非标点字符数 */
  nonWSNoPunct: number
  /** 总字数（CJK 字符数 + 英文单词数） */
  total: number
  /** 行数 */
  lines: number
  /** 段落数（非空行） */
  paragraphs: number
}

/**
 * 光标位置
 */
export interface CursorPosition {
  /** 行号（从 1 开始） */
  line: number
  /** 列号（从 1 开始） */
  column: number
}

/**
 * 状态栏显示配置
 */
export interface StatusBarConfig {
  /** 显示字数 */
  showWordCount: boolean
  /** 显示字符数 */
  showCharacterCount: boolean
  /** 显示编码 */
  showEncoding: boolean
  /** 显示文件类型 */
  showFileType: boolean
}

/**
 * 默认状态栏配置
 */
export const DEFAULT_STATUS_BAR_CONFIG: StatusBarConfig = {
  showWordCount: true,
  showCharacterCount: true,
  showEncoding: true,
  showFileType: true
}

/**
 * 编辑器文件内容
 */
export interface EditorFileContent {
  /** 文件路径 */
  path: string
  /** 文件内容 */
  content: string
  /** 文件哈希（用于检测外部修改） */
  hash?: string
  /** 加载时间 */
  loadedAt: number
  /** 编辑器状态（包含历史记录），切换标签时保存/恢复 */
  editorState?: unknown
}
