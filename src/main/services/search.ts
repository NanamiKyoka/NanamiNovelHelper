/**
 * 文件内容搜索服务
 * 支持文本搜索、正则匹配、文件过滤
 */

import * as fs from 'fs'
import * as path from 'path'
import { minimatch } from 'minimatch'
import { Errors } from '../../shared/errors'
import { isPathWithinDirectory } from '../../main/utils/pathSecurity'

/**
 * 搜索选项
 */
export interface SearchOptions {
  /** 搜索文本 */
  query: string
  /** 区分大小写 */
  caseSensitive?: boolean
  /** 全词匹配 */
  wholeWord?: boolean
  /** 使用正则表达式 */
  useRegex?: boolean
  /** 要包含的文件（glob 模式，逗号分隔） */
  filesToInclude?: string
  /** 要排除的文件（glob 模式，逗号分隔） */
  filesToExclude?: string
  /** 最大文件大小（字节），超过则跳过 */
  maxFileSize?: number
  /** 最大结果数 */
  maxResults?: number
}

/**
 * 单个匹配项
 */
export interface SearchMatch {
  /** 行号（从 1 开始） */
  line: number
  /** 列号（从 1 开始） */
  column: number
  /** 匹配文本 */
  matchText: string
  /** 行内容 */
  lineText: string
  /** 上下文（匹配前的文本） */
  contextBefore: string
  /** 上下文（匹配后的文本） */
  contextAfter: string
}

/**
 * 文件搜索结果
 */
export interface FileSearchResult {
  /** 文件路径（相对项目根目录） */
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
  /** 搜索结果列表 */
  results: FileSearchResult[]
  /** 总匹配数 */
  totalMatches: number
  /** 搜索的文件数 */
  filesSearched: number
  /** 错误信息 */
  error?: string
}

/**
 * 默认排除的目录和文件
 */
const HTML_EXTENSIONS = new Set(['.novel', '.html', '.htm'])

function isHtmlFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase()
  return HTML_EXTENSIONS.has(ext)
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

const DEFAULT_EXCLUDES = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.novelhelper/**',
  '**/dist/**',
  '**/out/**',
  '**/.DS_Store',
  '**/Thumbs.db'
]

/**
 * 默认包含的文件类型
 */
const DEFAULT_INCLUDES = [
  '**/*.novel',
  '**/*.txt',
  '**/*.json',
  '**/*.json5',
  '**/*.yaml',
  '**/*.yml',
  '**/*.js',
  '**/*.ts',
  '**/*.jsx',
  '**/*.tsx',
  '**/*.css',
  '**/*.html'
]

/**
 * 搜索服务
 */
class SearchService {
  private currentProjectPath: string | null = null

  /**
   * 初始化服务
   */
  init(projectPath: string): void {
    this.currentProjectPath = projectPath
  }

  /**
   * 清理服务
   */
  clear(): void {
    this.currentProjectPath = null
  }

  /**
   * 执行搜索
   */
  async search(options: SearchOptions): Promise<SearchResult> {
    if (!this.currentProjectPath) {
      return {
        success: false,
        results: [],
        totalMatches: 0,
        filesSearched: 0,
        error: Errors.projectNotOpen('SearchService').message
      }
    }

    if (!options.query.trim()) {
      return {
        success: true,
        results: [],
        totalMatches: 0,
        filesSearched: 0
      }
    }

    const {
      query,
      caseSensitive = false,
      wholeWord = false,
      useRegex = false,
      filesToInclude = '',
      filesToExclude = '',
      maxFileSize = 1024 * 1024,
      maxResults = 1000
    } = options

    try {
      const regex = this.buildSearchRegex(query, { caseSensitive, wholeWord, useRegex })

      const parsedIncludes = this.parsePatterns(filesToInclude)
      const includePatterns = parsedIncludes.length > 0 ? parsedIncludes : DEFAULT_INCLUDES
      const excludePatterns = [...DEFAULT_EXCLUDES, ...this.parsePatterns(filesToExclude)]

      const filesToSearch = await this.collectFiles(includePatterns, excludePatterns)

      const results: FileSearchResult[] = []
      let totalMatches = 0
      let filesSearched = 0

      for (const filePath of filesToSearch) {
        if (totalMatches >= maxResults) break

        const result = await this.searchFile(
          filePath,
          regex,
          maxFileSize,
          maxResults - totalMatches
        )
        filesSearched++

        if (result && result.matches.length > 0) {
          results.push(result)
          totalMatches += result.matches.length
        }
      }

      return {
        success: true,
        results,
        totalMatches,
        filesSearched
      }
    } catch (error) {
      return {
        success: false,
        results: [],
        totalMatches: 0,
        filesSearched: 0,
        error: error instanceof Error ? error.message : '搜索失败'
      }
    }
  }

  /**
   * 构建搜索正则表达式
   */
  private buildSearchRegex(
    query: string,
    options: { caseSensitive: boolean; wholeWord: boolean; useRegex: boolean }
  ): RegExp {
    const { caseSensitive, wholeWord, useRegex } = options

    let pattern: string

    if (useRegex) {
      if (query.length > 500) {
        throw Errors.invalidArgument('正则表达式长度不能超过 500 个字符', 'SearchService')
      }
      pattern = query
    } else {
      pattern = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

      if (wholeWord) {
        pattern = `\\b${pattern}\\b`
      }
    }

    const flags = caseSensitive ? 'g' : 'gi'
    try {
      return new RegExp(pattern, flags)
    } catch {
      throw Errors.invalidArgument(`无效的正则表达式: ${query}`, 'SearchService')
    }
  }

  /**
   * 解析 glob 模式字符串
   */
  private parsePatterns(patternsStr: string): string[] {
    if (!patternsStr.trim()) return []

    return patternsStr
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
  }

  /**
   * 收集要搜索的文件
   */
  private async collectFiles(
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<string[]> {
    if (!this.currentProjectPath) return []

    const files: string[] = []
    await this.walkDirectory(this.currentProjectPath, files, includePatterns, excludePatterns)
    return files
  }

  /**
   * 递归遍历目录
   */
  private async walkDirectory(
    dirPath: string,
    files: string[],
    includePatterns: string[],
    excludePatterns: string[]
  ): Promise<void> {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)
      const relativePath = path.relative(this.currentProjectPath!, fullPath)

      // 检查是否被排除
      if (this.matchesPatterns(relativePath, excludePatterns)) {
        continue
      }

      if (entry.isDirectory()) {
        await this.walkDirectory(fullPath, files, includePatterns, excludePatterns)
      } else if (entry.isFile()) {
        // 检查是否匹配包含模式
        if (this.matchesPatterns(relativePath, includePatterns)) {
          files.push(relativePath)
        }
      }
    }
  }

  /**
   * 检查路径是否匹配任意 glob 模式
   */
  private matchesPatterns(filePath: string, patterns: string[]): boolean {
    // 统一路径分隔符为正斜杠（minimatch 需要）
    const normalizedPath = filePath.split(path.sep).join('/')

    for (const pattern of patterns) {
      if (minimatch(normalizedPath, pattern, { dot: true })) {
        return true
      }
    }
    return false
  }

  /**
   * 搜索单个文件
   */
  private async searchFile(
    relativePath: string,
    regex: RegExp,
    maxFileSize: number,
    maxMatches: number
  ): Promise<FileSearchResult | null> {
    if (!this.currentProjectPath) return null

    const fullPath = path.join(this.currentProjectPath, relativePath)

    if (!isPathWithinDirectory(fullPath, this.currentProjectPath)) {
      return null
    }

    try {
      // 检查文件大小
      const stats = fs.statSync(fullPath)
      if (stats.size > maxFileSize) {
        return null
      }

      // 读取文件内容
      const content = fs.readFileSync(fullPath, 'utf-8')

      // 重置正则表达式的 lastIndex
      regex.lastIndex = 0

      const matches: SearchMatch[] = []
      const lines = content.split('\n')
      const shouldStripHtml = isHtmlFile(relativePath)

      for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        if (matches.length >= maxMatches) break

        let lineText = lines[lineIndex]
        const lineNumber = lineIndex + 1

        if (shouldStripHtml) {
          lineText = stripHtmlTags(lineText)
        }

        if (!lineText.trim()) continue

        let match: RegExpExecArray | null
        regex.lastIndex = 0

        while ((match = regex.exec(lineText)) !== null && matches.length < maxMatches) {
          const matchText = match[0]
          const column = match.index + 1
          const contextLength = 30

          matches.push({
            line: lineNumber,
            column,
            matchText,
            lineText: lineText.trim(),
            contextBefore: lineText.substring(
              Math.max(0, match.index - contextLength),
              match.index
            ),
            contextAfter: lineText.substring(
              match.index + matchText.length,
              Math.min(lineText.length, match.index + matchText.length + contextLength)
            )
          })

          if (!regex.global) break
        }
      }

      if (matches.length === 0) {
        return null
      }

      return {
        filePath: relativePath,
        fileName: path.basename(relativePath),
        matches
      }
    } catch (_error) {
      return null
    }
  }

  /**
   * 替换文件内容
   */
  async replace(
    filePath: string,
    searchQuery: string,
    replaceText: string,
    options: {
      caseSensitive?: boolean
      wholeWord?: boolean
      useRegex?: boolean
      replaceAll?: boolean
      line?: number
      column?: number
    }
  ): Promise<{ success: boolean; error?: string; replacements?: number }> {
    if (!this.currentProjectPath) {
      return { success: false, error: Errors.projectNotOpen('SearchService').message }
    }

    const fullPath = path.join(this.currentProjectPath, filePath)

    if (!isPathWithinDirectory(fullPath, this.currentProjectPath)) {
      return { success: false, error: '文件路径不在项目目录内' }
    }

    try {
      let content = fs.readFileSync(fullPath, 'utf-8')
      const {
        caseSensitive = false,
        wholeWord = false,
        useRegex = false,
        replaceAll = true,
        line,
        column
      } = options

      const regex = this.buildSearchRegex(searchQuery, { caseSensitive, wholeWord, useRegex })

      let replacements = 0

      if (replaceAll) {
        if (isHtmlFile(filePath)) {
          let count = 0
          const newContent = content.replace(
            /(<[^>]*>)|([^<]+)/g,
            (fullMatch, tagMatch, textMatch) => {
              if (tagMatch) return tagMatch
              regex.lastIndex = 0
              const replaced = textMatch.replace(regex, () => {
                count++
                return replaceText
              })
              return replaced
            }
          )
          replacements = count
          content = newContent
        } else {
          const newContent = content.replace(regex, replaceText)
          replacements = (content.match(regex) || []).length
          content = newContent
        }
      } else if (line !== undefined && column !== undefined) {
        const lines = content.split('\n')
        const targetLine = lines[line - 1]
        if (targetLine) {
          regex.lastIndex = 0
          const newLine = targetLine.replace(regex, (match, offset) => {
            if (offset + 1 === column) {
              replacements = 1
              return replaceText
            }
            return match
          })
          lines[line - 1] = newLine
          content = lines.join('\n')
        }
      }

      if (replacements > 0) {
        fs.writeFileSync(fullPath, content, 'utf-8')
      }

      return { success: true, replacements }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '替换失败'
      }
    }
  }
}

// 导出单例
export const searchService = new SearchService()
