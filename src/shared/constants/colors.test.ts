import { describe, it, expect } from 'vitest'
import {
  THEME_COLORS,
  THEME_COLOR_OPTIONS,
  SEMANTIC_COLORS,
  DEFAULT_COLORS,
  CHART_PALETTE,
  EXTENDED_PALETTE,
  NEUTRAL_COLORS
} from './colors'

describe('colors constants', () => {
  describe('THEME_COLORS', () => {
    it('应该包含所有主色调', () => {
      expect(THEME_COLORS.primary).toBe('#1890ff')
      expect(THEME_COLORS.danger).toBe('#f5222d')
      expect(THEME_COLORS.warning).toBe('#fa8c16')
      expect(THEME_COLORS.success).toBe('#52c41a')
      expect(THEME_COLORS.info).toBe('#13c2c2')
    })

    it('应该包含扩展色', () => {
      expect(THEME_COLORS.purple).toBe('#722ed1')
      expect(THEME_COLORS.magenta).toBe('#eb2f96')
      expect(THEME_COLORS.yellow).toBe('#fadb14')
      expect(THEME_COLORS.grey).toBe('#595959')
    })

    it('所有颜色值应该是有效的十六进制格式', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/
      Object.values(THEME_COLORS).forEach(color => {
        expect(color).toMatch(hexPattern)
      })
    })
  })

  describe('THEME_COLOR_OPTIONS', () => {
    it('应该有9个可选主题色', () => {
      expect(THEME_COLOR_OPTIONS).toHaveLength(9)
    })

    it('每个选项应有name和value', () => {
      THEME_COLOR_OPTIONS.forEach(option => {
        expect(option).toHaveProperty('name')
        expect(option).toHaveProperty('value')
        expect(typeof option.name).toBe('string')
        expect(option.value).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })

    it('选项的value应与THEME_COLORS对应', () => {
      const values = THEME_COLOR_OPTIONS.map(o => o.value)
      expect(values).toContain(THEME_COLORS.primary)
      expect(values).toContain(THEME_COLORS.danger)
      expect(values).toContain(THEME_COLORS.success)
    })
  })

  describe('SEMANTIC_COLORS', () => {
    it('应该包含性别颜色', () => {
      expect(SEMANTIC_COLORS.gender.male).toBeDefined()
      expect(SEMANTIC_COLORS.gender.female).toBeDefined()
      expect(SEMANTIC_COLORS.gender.other).toBeDefined()
      expect(SEMANTIC_COLORS.gender.unknown).toBeDefined()
    })

    it('应该包含严重程度颜色', () => {
      expect(SEMANTIC_COLORS.severity.low).toBeDefined()
      expect(SEMANTIC_COLORS.severity.medium).toBeDefined()
      expect(SEMANTIC_COLORS.severity.high).toBeDefined()
      expect(SEMANTIC_COLORS.severity.critical).toBeDefined()
    })

    it('应该包含高亮级别颜色', () => {
      expect(SEMANTIC_COLORS.highlight.low).toBeDefined()
      expect(SEMANTIC_COLORS.highlight.medium).toBeDefined()
      expect(SEMANTIC_COLORS.highlight.high).toBeDefined()
      expect(SEMANTIC_COLORS.highlight.critical).toBeDefined()
    })

    it('所有颜色值应该是有效的十六进制格式', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/
      const flattenColors = (obj: Record<string, unknown>): string[] => {
        return Object.values(obj).flatMap(v =>
          typeof v === 'string' ? [v] : flattenColors(v as Record<string, unknown>)
        )
      }
      flattenColors(SEMANTIC_COLORS as unknown as Record<string, unknown>).forEach(color => {
        expect(color).toMatch(hexPattern)
      })
    })
  })

  describe('DEFAULT_COLORS', () => {
    it('应该包含默认颜色', () => {
      expect(DEFAULT_COLORS.primary).toBe('#1890ff')
      expect(DEFAULT_COLORS.event).toBe('#1890ff')
      expect(DEFAULT_COLORS.timeline).toBe('#1890ff')
      expect(DEFAULT_COLORS.node).toBe('#1890ff')
      expect(DEFAULT_COLORS.background).toBe('#ffffff')
    })
  })

  describe('CHART_PALETTE', () => {
    it('应该有10个调色板颜色', () => {
      expect(CHART_PALETTE).toHaveLength(10)
    })

    it('所有颜色值应该是有效的十六进制格式', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/
      CHART_PALETTE.forEach(color => {
        expect(color).toMatch(hexPattern)
      })
    })

    it('颜色不应重复', () => {
      const unique = new Set(CHART_PALETTE)
      expect(unique.size).toBe(CHART_PALETTE.length)
    })
  })

  describe('EXTENDED_PALETTE', () => {
    it('应该有14个扩展调色板颜色', () => {
      expect(EXTENDED_PALETTE).toHaveLength(14)
    })

    it('所有颜色值应该是有效的十六进制格式', () => {
      const hexPattern = /^#[0-9a-fA-F]{6}$/
      EXTENDED_PALETTE.forEach(color => {
        expect(color).toMatch(hexPattern)
      })
    })
  })

  describe('NEUTRAL_COLORS', () => {
    it('应该包含中性色', () => {
      expect(NEUTRAL_COLORS.white).toBe('#ffffff')
      expect(NEUTRAL_COLORS.black).toBe('#000000')
      expect(NEUTRAL_COLORS.dark).toBe('#262626')
      expect(NEUTRAL_COLORS.grey).toBe('#8c8c8c')
      expect(NEUTRAL_COLORS.lightGrey).toBe('#bfbfbf')
      expect(NEUTRAL_COLORS.border).toBe('#d9d9d9')
    })
  })
})
