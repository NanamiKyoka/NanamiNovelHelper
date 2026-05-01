import { describe, it, expect, beforeEach } from 'vitest'
import { useHighlightService } from '@renderer/services/highlightService'
import { DEFAULT_HIGHLIGHT_CONFIG, type HighlightPattern } from '@shared/highlight'
import type { HighlightConfig } from '@shared/highlight'

describe('HighlightService - 辅助方法', () => {
  beforeEach(() => {
    useHighlightService.setState({
      config: DEFAULT_HIGHLIGHT_CONFIG,
      hoverCardConfig: DEFAULT_HIGHLIGHT_CONFIG.hoverCard,
      patterns: [],
      automaton: null,
      initialized: false,
      loading: false,
      error: null
    })
  })

  describe('isFileInScope', () => {
    it('scope未启用时应返回false', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: { ...DEFAULT_HIGHLIGHT_CONFIG.scope, enabled: false }
        }
      })
      const store = useHighlightService.getState()
      expect(store.isFileInScope('chapters/test.md')).toBe(false)
    })

    it('scope启用时应返回true', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: { ...DEFAULT_HIGHLIGHT_CONFIG.scope, enabled: true }
        }
      })
      const store = useHighlightService.getState()
      expect(store.isFileInScope('chapters/test.md')).toBe(true)
    })

    it('排除的扩展名应返回false', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: {
            ...DEFAULT_HIGHLIGHT_CONFIG.scope,
            enabled: true,
            excludeExtensions: ['json5', 'json']
          }
        }
      })
      const store = useHighlightService.getState()
      expect(store.isFileInScope('data/config.json5')).toBe(false)
      expect(store.isFileInScope('data/config.json')).toBe(false)
    })

    it('排除的文件应返回false', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: {
            ...DEFAULT_HIGHLIGHT_CONFIG.scope,
            enabled: true,
            excludeFiles: ['chapters/special.md']
          }
        }
      })
      const store = useHighlightService.getState()
      expect(store.isFileInScope('chapters/special.md')).toBe(false)
    })

    it('排除的目录应返回false', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: {
            ...DEFAULT_HIGHLIGHT_CONFIG.scope,
            enabled: true,
            excludeDirectories: ['data']
          }
        }
      })
      const store = useHighlightService.getState()
      expect(store.isFileInScope('data/config.json5')).toBe(false)
    })

    it('包含目录限制时不在目录内应返回false', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: {
            ...DEFAULT_HIGHLIGHT_CONFIG.scope,
            enabled: true,
            includeDirectories: ['chapters']
          }
        }
      })
      const store = useHighlightService.getState()
      expect(store.isFileInScope('notes/test.md')).toBe(false)
      expect(store.isFileInScope('chapters/test.md')).toBe(true)
    })

    it('应正确处理Windows路径分隔符', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: {
            ...DEFAULT_HIGHLIGHT_CONFIG.scope,
            enabled: true,
            excludeDirectories: ['data']
          }
        }
      })
      const store = useHighlightService.getState()
      expect(store.isFileInScope('data\\config.json5')).toBe(false)
    })
  })

  describe('getEffectivePattern', () => {
    it('无覆盖时应返回默认值', () => {
      const store = useHighlightService.getState()
      const result = store.getEffectivePattern('entry1', 'type1')
      expect(result.enabled).toBe(true)
      expect(result.matchMode).toBe(DEFAULT_HIGHLIGHT_CONFIG.match.matchMode)
      expect(result.caseSensitive).toBe(DEFAULT_HIGHLIGHT_CONFIG.match.caseSensitive)
      expect(result.color).toBeNull()
    })

    it('条目覆盖应优先于类型覆盖', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          entryOverrides: [
            {
              entryId: 'entry1',
              enabled: false,
              matchMode: 'partial',
              caseSensitive: true,
              color: '#ff0000'
            }
          ],
          typeOverrides: [
            { typeId: 'type1', enabled: true, matchMode: 'wholeWord', caseSensitive: false }
          ]
        }
      })
      const store = useHighlightService.getState()
      const result = store.getEffectivePattern('entry1', 'type1')
      expect(result.enabled).toBe(false)
      expect(result.matchMode).toBe('partial')
      expect(result.caseSensitive).toBe(true)
      expect(result.color).toBe('#ff0000')
    })

    it('类型覆盖应在无条目覆盖时生效', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          typeOverrides: [
            { typeId: 'type1', enabled: false, matchMode: 'partial', caseSensitive: true }
          ]
        }
      })
      const store = useHighlightService.getState()
      const result = store.getEffectivePattern('entry1', 'type1')
      expect(result.enabled).toBe(false)
      expect(result.matchMode).toBe('partial')
      expect(result.caseSensitive).toBe(true)
    })
  })

  describe('clearPatterns', () => {
    it('应该清空模式和自动机', () => {
      useHighlightService.setState({
        patterns: [
          {
            id: '1',
            name: 'test',
            aliases: [],
            color: '#000',
            typeId: 't1',
            matchMode: 'wholeWord' as const,
            caseSensitive: false,
            isSensitive: false,
            priority: 10
          }
        ] satisfies HighlightPattern[]
      })
      const store = useHighlightService.getState()
      store.clearPatterns()

      const state = useHighlightService.getState()
      expect(state.patterns).toEqual([])
      expect(state.automaton).toBeNull()
    })
  })

  describe('setConfig', () => {
    it('应该设置配置并更新状态', () => {
      const newConfig: HighlightConfig = {
        ...DEFAULT_HIGHLIGHT_CONFIG,
        scope: { ...DEFAULT_HIGHLIGHT_CONFIG.scope, enabled: false }
      }
      const store = useHighlightService.getState()
      store.setConfig(newConfig)

      const state = useHighlightService.getState()
      expect(state.config).toEqual(newConfig)
      expect(state.initialized).toBe(true)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('updateConfig', () => {
    it('应该合并更新配置', () => {
      const store = useHighlightService.getState()
      store.updateConfig({ scope: { ...DEFAULT_HIGHLIGHT_CONFIG.scope, enabled: false } })

      const state = useHighlightService.getState()
      expect(state.config.scope.enabled).toBe(false)
    })
  })

  describe('updateHoverCardConfig', () => {
    it('应该更新悬浮卡片配置', () => {
      const store = useHighlightService.getState()
      store.updateHoverCardConfig({ enabled: false })

      const state = useHighlightService.getState()
      expect(state.hoverCardConfig.enabled).toBe(false)
      expect(state.config.hoverCard.enabled).toBe(false)
    })
  })

  describe('findMatches', () => {
    it('scope未启用时应返回空数组', () => {
      useHighlightService.setState({
        config: {
          ...DEFAULT_HIGHLIGHT_CONFIG,
          scope: { ...DEFAULT_HIGHLIGHT_CONFIG.scope, enabled: false }
        }
      })
      const store = useHighlightService.getState()
      expect(store.findMatches('test text')).toEqual([])
    })

    it('无自动机时应返回空数组', () => {
      useHighlightService.setState({
        config: DEFAULT_HIGHLIGHT_CONFIG,
        automaton: null
      })
      const store = useHighlightService.getState()
      expect(store.findMatches('test text')).toEqual([])
    })
  })
})
