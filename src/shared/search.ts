/**
 * 搜索相关共享类型定义
 * 主进程和渲染进程共用
 */

// ============================================
// 搜索选项
// ============================================

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 搜索查询 */
  query: string
  /** 是否区分大小写 */
  caseSensitive?: boolean
  /** 全词匹配 */
  wholeWord?: boolean
  /** 使用正则表达式 */
  useRegex?: boolean
  /** 要包含的文件（glob 模式） */
  filesToInclude?: string
  /** 要排除的文件（glob 模式） */
  filesToExclude?: string
  /** 最大文件大小（字节） */
  maxFileSize?: number
  /** 最大结果数 */
  maxResults?: number
}

/**
 * 替换选项
 */
export interface ReplaceOptions {
  /** 是否区分大小写 */
  caseSensitive?: boolean
  /** 全词匹配 */
  wholeWord?: boolean
  /** 使用正则表达式 */
  useRegex?: boolean
  /** 替换所有匹配项 */
  replaceAll?: boolean
  /** 指定行号 */
  line?: number
  /** 指定列号 */
  column?: number
}

// ============================================
// 搜索结果
// ============================================

/**
 * 搜索匹配项
 */
export interface SearchMatch {
  /** 行号 */
  line: number
  /** 列号 */
  column: number
  /** 匹配的文本 */
  matchText: string
  /** 整行文本 */
  lineText: string
  /** 匹配前的上下文 */
  contextBefore: string
  /** 匹配后的上下文 */
  contextAfter: string
}

/**
 * 文件搜索结果
 */
export interface FileSearchResult {
  /** 文件路径 */
  filePath: string
  /** 文件名 */
  fileName: string
  /** 匹配项列表 */
  matches: SearchMatch[]
}

/**
 * 搜索结果
 */
export interface SearchResult {
  /** 是否成功 */
  success: boolean
  /** 结果列表 */
  results: FileSearchResult[]
  /** 总匹配数 */
  totalMatches: number
  /** 搜索的文件数 */
  filesSearched: number
  /** 错误信息 */
  error?: string
}
