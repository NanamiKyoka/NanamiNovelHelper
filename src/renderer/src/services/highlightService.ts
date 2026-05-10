/**
 * 词汇高亮服务
 * 管理词汇模式、配置和高亮自动机
 */

import { create } from 'zustand'
import { AhoCorasick, createAhoCorasick } from './ahoCorasick'
import { THEME_COLORS } from '@shared/constants/colors'
import type {
  HighlightConfig,
  HighlightPattern,
  HighlightMatch,
  HoverCardConfig
} from '@shared/highlight'
import type { VocabularyEntry, VocabularyType } from '@shared/vocabulary'
import type { SensitiveWord } from '@shared/sensitive'
import { DEFAULT_HIGHLIGHT_CONFIG } from '@shared/highlight'

function deepMerge<T extends Record<string, unknown>>(base: T, overlay: Record<string, unknown>): T {
  const result = { ...base } as Record<string, unknown>
  for (const key of Object.keys(overlay)) {
    const baseVal = result[key]
    const overlayVal = overlay[key]
    if (overlayVal == null) {
      continue
    }
    if (
      baseVal && overlayVal &&
      typeof baseVal === 'object' && typeof overlayVal === 'object' &&
      !Array.isArray(baseVal) && !Array.isArray(overlayVal)
    ) {
      result[key] = deepMerge(baseVal as Record<string, unknown>, overlayVal as Record<string, unknown>)
    } else {
      result[key] = overlayVal
    }
  }
  return result as T
}

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
  getEffectivePattern: (
    entryId: string,
    typeId: string
  ) => {
    enabled: boolean
    matchMode: 'wholeWord' | 'partial'
    caseSensitive: boolean
    color: string | null
  }
  // 批量设置方法（用于聚合接口）
  setConfig: (config: HighlightConfig | null | undefined) => void
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
      const mergedConfig = deepMerge(DEFAULT_HIGHLIGHT_CONFIG, (config && typeof config === 'object') ? config : {})
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
  saveConfig: async config => {
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
  updateConfig: updates => {
    set(state => ({
      config: { ...state.config, ...updates },
      // 如果更新中包含 hoverCard，同步更新
      ...(updates.hoverCard
        ? { hoverCardConfig: { ...state.hoverCardConfig, ...updates.hoverCard } }
        : {})
    }))
  },

  // 更新悬浮卡片配置
  updateHoverCardConfig: hoverCardUpdates => {
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
    const { config, automaton } = get()
    const patterns: HighlightPattern[] = []
    const typeMap = new Map(types.map(t => [t.id, t]))
    const typeOverrides = config.typeOverrides || []
    const entryOverrides = config.entryOverrides || []
    const matchConfig = config.match || DEFAULT_HIGHLIGHT_CONFIG.match

    for (const entry of entries) {
      const type = typeMap.get(entry.typeId)
      const typeOverride = typeOverrides.find(o => o.typeId === entry.typeId)
      const entryOverride = entryOverrides.find(o => o.entryId === entry.id)

      if (typeOverride && !typeOverride.enabled) continue
      if (entryOverride && entryOverride.enabled === false) continue

      const effective = get().getEffectivePattern(entry.id, entry.typeId)

      patterns.push({
        id: entry.id,
        name: entry.name,
        aliases: entry.aliases || [],
        color: effective.color || entry.color || type?.color || THEME_COLORS.primary,
        typeId: entry.typeId,
        matchMode: effective.matchMode,
        caseSensitive: effective.caseSensitive,
        isSensitive: false,
        priority: 10
      })
    }

    if (matchConfig.sensitiveWordHighlight) {
      for (const word of sensitiveWords) {
        const color = (matchConfig.sensitiveWordColors || {})[word.severity] || '#f5222d'

        patterns.push({
          id: word.id,
          name: word.name,
          aliases: word.aliases || [],
          color,
          typeId: 'sensitive',
          matchMode: matchConfig.matchMode,
          caseSensitive: matchConfig.caseSensitive,
          isSensitive: true,
          severity: word.severity,
          priority: 100
        })
      }
    }

    const prevPatterns = get().patterns
    const prevPatternIds = new Set(prevPatterns.map(p => p.id))
    const newPatternIds = new Set(patterns.map(p => p.id))

    const hasChanges =
      prevPatternIds.size !== newPatternIds.size ||
      patterns.some(p => {
        const prev = prevPatterns.find(pp => pp.id === p.id)
        return (
          !prev || prev.name !== p.name || prev.color !== p.color || prev.matchMode !== p.matchMode
        )
      })

    if (!hasChanges && automaton && automaton.isBuilt()) {
      return
    }

    set({ patterns })
    get().rebuildAutomaton()
  },

  // 重建自动机
  rebuildAutomaton: () => {
    const { patterns, config, automaton } = get()
    if (patterns.length === 0) {
      set({ automaton: null })
      return
    }

    if (automaton && automaton.isBuilt()) {
      automaton.clear()
      automaton.addPatterns(patterns)
      automaton.build()
    } else {
      const newAutomaton = createAhoCorasick(patterns, (config.match || DEFAULT_HIGHLIGHT_CONFIG.match).caseSensitive)
      set({ automaton: newAutomaton })
    }
  },

  // 清空模式
  clearPatterns: () => {
    set({ patterns: [], automaton: null })
  },

  // 查找匹配
  findMatches: (text, filePath) => {
    const { automaton, config } = get()
    const scopeConfig = config.scope || DEFAULT_HIGHLIGHT_CONFIG.scope
    const matchConfig = config.match || DEFAULT_HIGHLIGHT_CONFIG.match

    if (filePath && !get().isFileInScope(filePath)) {
      return []
    }

    if (!automaton || !scopeConfig.enabled) {
      return []
    }

    return automaton.searchHighlights(text, {
      wholeWord: matchConfig.matchMode === 'wholeWord'
    })
  },

  isFileInScope: filePath => {
    const { config } = get()
    const scopeConfig = config.scope || DEFAULT_HIGHLIGHT_CONFIG.scope

    if (!scopeConfig.enabled) return false

    const normalizedPath = filePath.replace(/\\/g, '/')

    const ext = normalizedPath.split('.').pop()?.toLowerCase()
    if (ext && (scopeConfig.excludeExtensions || []).includes(ext)) {
      return false
    }

    const normalizedExcludeFiles = (scopeConfig.excludeFiles || []).map(f => f.replace(/\\/g, '/'))
    if (normalizedExcludeFiles.includes(normalizedPath)) {
      return false
    }

    const normalizedExcludeDirs = (scopeConfig.excludeDirectories || []).map(d => d.replace(/\\/g, '/'))
    for (const dir of normalizedExcludeDirs) {
      if (normalizedPath.startsWith(dir + '/')) {
        return false
      }
    }

    if ((scopeConfig.includeDirectories || []).length > 0) {
      const normalizedIncludeDirs = (scopeConfig.includeDirectories || []).map(d => d.replace(/\\/g, '/'))
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
    const matchConfig = config.match || DEFAULT_HIGHLIGHT_CONFIG.match

    const entryOverride = (config.entryOverrides || []).find(o => o.entryId === entryId)
    const typeOverride = (config.typeOverrides || []).find(o => o.typeId === typeId)

    return {
      enabled: entryOverride?.enabled ?? typeOverride?.enabled ?? true,
      matchMode: entryOverride?.matchMode ?? typeOverride?.matchMode ?? matchConfig.matchMode,
      caseSensitive:
        entryOverride?.caseSensitive ?? typeOverride?.caseSensitive ?? matchConfig.caseSensitive,
      color: entryOverride?.color ?? null
    }
  },

  // 批量设置配置（用于聚合接口）
  setConfig: (config: HighlightConfig | null | undefined) => {
    const mergedConfig = config ? deepMerge(DEFAULT_HIGHLIGHT_CONFIG, config as Record<string, unknown>) : DEFAULT_HIGHLIGHT_CONFIG
    set({
      config: mergedConfig,
      hoverCardConfig: mergedConfig.hoverCard || DEFAULT_HIGHLIGHT_CONFIG.hoverCard,
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
