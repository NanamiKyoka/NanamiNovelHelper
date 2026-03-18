/**
 * 词汇高亮服务
 * 管理词汇模式、配置和高亮自动机
 */

import { create } from 'zustand'
import { AhoCorasick, createAhoCorasick } from './ahoCorasick'
import type {
  HighlightConfig,
  HighlightPattern,
  HighlightMatch,
  VocabularyMatchOverride,
  VocabularyTypeMatchOverride,
  HoverCardConfig
} from '@types/highlight'
import type { VocabularyEntry, VocabularyType } from '@types/vocabulary'
import type { SensitiveWord } from '@types/sensitive'
import {
  DEFAULT_HIGHLIGHT_CONFIG
} from '@types/highlight'

interface HighlightServiceState {
  /** 高亮配置 */
  config: HighlightConfig
  /** 悬浮卡片配置 */
  hoverCardConfig: HoverCardConfig
  /** 词汇模式列表 */
  patterns: HighlightPattern[]
  /** AC 自动机实例 */
  automaton: AhoCorasick | null
  /** 是否已初始化 */
  initialized: boolean
  /** 是否正在加载 */
  loading: boolean
  /** 错误信息 */
  error: string | null
  
  // 配置操作
  loadConfig: () => Promise<void>
  saveConfig: (config: Partial<HighlightConfig>) => Promise<void>
  updateConfig: (updates: Partial<HighlightConfig>) => void
  updateHoverCardConfig: (config: Partial<HoverCardConfig>) => void
  
  // 模式管理
  buildPatterns: (
    entries: VocabularyEntry[],
    types: VocabularyType[],
    sensitiveWords: SensitiveWord[]
  ) => void
  rebuildAutomaton: () => void
  clearPatterns: () => void
  
  // 匹配操作
  findMatches: (text: string, filePath?: string) => HighlightMatch[]
  
  // 辅助方法
  isFileInScope: (filePath: string) => boolean
  getEffectivePattern: (entryId: string, typeId: string) => {
    enabled: boolean
    matchMode: 'wholeWord' | 'partial'
    caseSensitive: boolean
    color: string | null
  }
  // 批量设置方法（用于聚合接口）
  setConfig: (config: HighlightConfig) => void
}

/**
 * 高亮服务 Store
 */
export const useHighlightService = create<HighlightServiceState>((set, get) => ({
  config: DEFAULT_HIGHLIGHT_CONFIG,
  hoverCardConfig: DEFAULT_HIGHLIGHT_CONFIG.hoverCard,
  patterns: [],
  automaton: null,
  initialized: false,
  loading: false,
  error: null,

  // 加载配置
  loadConfig: async () => {
    set({ loading: true, error: null })
    try {
      const config = await window.electron.highlight.loadConfig()
      const mergedConfig = { ...DEFAULT_HIGHLIGHT_CONFIG, ...config }
      set({ 
        config: mergedConfig, 
        hoverCardConfig: mergedConfig.hoverCard || DEFAULT_HIGHLIGHT_CONFIG.hoverCard,
        loading: false, 
        initialized: true 
      })
    } catch (error) {
      console.error('Failed to load highlight config:', error)
      set({ 
        config: DEFAULT_HIGHLIGHT_CONFIG, 
        hoverCardConfig: DEFAULT_HIGHLIGHT_CONFIG.hoverCard,
        loading: false, 
        initialized: true,
        error: '加载配置失败'
      })
    }
  },

  // 保存配置
  saveConfig: async (config) => {
    try {
      const newConfig = { ...get().config, ...config }
      await window.electron.highlight.saveConfig(newConfig)
      set({ config: newConfig })
    } catch (error) {
      console.error('Failed to save highlight config:', error)
      throw error
    }
  },

  // 更新配置（本地）
  updateConfig: (updates) => {
    set(state => ({
      config: { ...state.config, ...updates },
      // 如果更新中包含 hoverCard，同步更新
      ...(updates.hoverCard ? { hoverCardConfig: { ...state.hoverCardConfig, ...updates.hoverCard } } : {})
    }))
  },

  // 更新悬浮卡片配置
  updateHoverCardConfig: (hoverCardUpdates) => {
    set(state => {
      const newHoverCardConfig = { ...state.hoverCardConfig, ...hoverCardUpdates }
      return {
        hoverCardConfig: newHoverCardConfig,
        config: { ...state.config, hoverCard: newHoverCardConfig }
      }
    })
  },

  // 构建模式列表
  buildPatterns: (entries, types, sensitiveWords) => {
    const { config } = get()
    const patterns: HighlightPattern[] = []
    const typeMap = new Map(types.map(t => [t.id, t]))

    // 处理普通词汇
    for (const entry of entries) {
      const type = typeMap.get(entry.typeId)
      const typeOverride = config.typeOverrides.find(o => o.typeId === entry.typeId)
      const entryOverride = config.entryOverrides.find(o => o.entryId === entry.id)

      // 检查是否启用
      if (typeOverride && !typeOverride.enabled) continue
      if (entryOverride && entryOverride.enabled === false) continue

      // 获取有效配置
      const effective = get().getEffectivePattern(entry.id, entry.typeId)

      patterns.push({
        id: entry.id,
        name: entry.name,
        aliases: entry.aliases || [],
        color: effective.color || entry.color || type?.color || '#1890ff',
        typeId: entry.typeId,
        matchMode: effective.matchMode,
        caseSensitive: effective.caseSensitive,
        isSensitive: false,
        priority: 10
      })
    }

    // 处理敏感词
    if (config.match.sensitiveWordHighlight) {
      for (const word of sensitiveWords) {
        const color = config.match.sensitiveWordColors[word.severity] || '#f5222d'
        
        patterns.push({
          id: word.id,
          name: word.name,
          aliases: word.aliases || [],
          color,
          typeId: 'sensitive',
          matchMode: config.match.matchMode,
          caseSensitive: config.match.caseSensitive,
          isSensitive: true,
          severity: word.severity,
          priority: 100 // 敏感词优先级最高
        })
      }
    }

    set({ patterns })
    get().rebuildAutomaton()
  },

  // 重建自动机
  rebuildAutomaton: () => {
    const { patterns, config } = get()
    if (patterns.length === 0) {
      set({ automaton: null })
      return
    }

    const automaton = createAhoCorasick(patterns, config.match.caseSensitive)
    set({ automaton })
  },

  // 清空模式
  clearPatterns: () => {
    set({ patterns: [], automaton: null })
  },

  // 查找匹配
  findMatches: (text, filePath) => {
    const { automaton, config } = get()
    
    // 检查文件是否在范围内
    if (filePath && !get().isFileInScope(filePath)) {
      return []
    }

    if (!automaton || !config.scope.enabled) {
      return []
    }

    return automaton.searchHighlights(text, {
      wholeWord: config.match.matchMode === 'wholeWord'
    })
  },

  // 检查文件是否在范围内
  isFileInScope: (filePath) => {
    const { config } = get()
    
    if (!config.scope.enabled) return false

    // 统一路径分隔符为正斜杠，避免 Windows/Linux 差异
    const normalizedPath = filePath.replace(/\\/g, '/')

    // 检查排除的扩展名
    const ext = normalizedPath.split('.').pop()?.toLowerCase()
    if (ext && config.scope.excludeExtensions.includes(ext)) {
      return false
    }

    // 检查排除的文件（统一分隔符后比较）
    const normalizedExcludeFiles = config.scope.excludeFiles.map(f => f.replace(/\\/g, '/'))
    if (normalizedExcludeFiles.includes(normalizedPath)) {
      return false
    }

    // 检查排除的目录（统一分隔符后比较）
    const normalizedExcludeDirs = config.scope.excludeDirectories.map(d => d.replace(/\\/g, '/'))
    for (const dir of normalizedExcludeDirs) {
      if (normalizedPath.startsWith(dir + '/')) {
        return false
      }
    }

    // 如果有包含目录，检查是否在其中
    if (config.scope.includeDirectories.length > 0) {
      const normalizedIncludeDirs = config.scope.includeDirectories.map(d => d.replace(/\\/g, '/'))
      let inIncludeDir = false
      for (const dir of normalizedIncludeDirs) {
        if (normalizedPath.startsWith(dir + '/')) {
          inIncludeDir = true
          break
        }
      }
      if (!inIncludeDir) return false
    }

    return true
  },

  // 获取词汇的有效配置
  getEffectivePattern: (entryId, typeId) => {
    const { config } = get()
    
    const entryOverride = config.entryOverrides.find(o => o.entryId === entryId)
    const typeOverride = config.typeOverrides.find(o => o.typeId === typeId)

    return {
      enabled: entryOverride?.enabled ?? (typeOverride?.enabled ?? true),
      matchMode: entryOverride?.matchMode ?? (typeOverride?.matchMode ?? config.match.matchMode),
      caseSensitive: entryOverride?.caseSensitive ?? (typeOverride?.caseSensitive ?? config.match.caseSensitive),
      color: entryOverride?.color ?? null
    }
  },

  // 批量设置配置（用于聚合接口）
  setConfig: (config: HighlightConfig) => {
    set({
      config,
      hoverCardConfig: config.hoverCard || DEFAULT_HIGHLIGHT_CONFIG.hoverCard,
      initialized: true,
      loading: false,
      error: null
    })
  }
}))

/**
 * 初始化高亮服务
 */
export async function initHighlightService(): Promise<void> {
  await useHighlightService.getState().loadConfig()
}

/**
 * 更新词汇模式
 */
export function updateHighlightPatterns(
  entries: VocabularyEntry[],
  types: VocabularyType[],
  sensitiveWords: SensitiveWord[]
): void {
  useHighlightService.getState().buildPatterns(entries, types, sensitiveWords)
}

/**
 * 查找文本中的高亮匹配
 */
export function findHighlightMatches(text: string, filePath?: string): HighlightMatch[] {
  return useHighlightService.getState().findMatches(text, filePath)
}

export default useHighlightService
