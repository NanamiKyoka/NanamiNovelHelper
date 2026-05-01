import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getCssVar, getThemeColor, themeColors } from '@utils/theme'

describe('theme utils', () => {
  const cssVars: Record<string, string> = {}

  beforeEach(() => {
    vi.spyOn(window, 'getComputedStyle').mockImplementation(() => {
      return {
        getPropertyValue: (prop: string) => cssVars[prop] || ''
      } as unknown as CSSStyleDeclaration
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.keys(cssVars).forEach(key => delete cssVars[key])
  })

  describe('getCssVar', () => {
    it('应该返回CSS变量值', () => {
      cssVars['--color-primary'] = '#1890ff'
      const value = getCssVar('--color-primary')
      expect(value).toBe('#1890ff')
    })

    it('未设置的变量应返回空字符串', () => {
      const value = getCssVar('--nonexistent-var')
      expect(value).toBe('')
    })
  })

  describe('getThemeColor', () => {
    it('应该返回主题色值', () => {
      cssVars['--color-primary'] = '#1890ff'
      const value = getThemeColor('--color-primary')
      expect(value).toBe('#1890ff')
    })
  })

  describe('themeColors', () => {
    it('textPrimary应返回CSS变量值', () => {
      cssVars['--text-primary'] = '#333'
      expect(themeColors.textPrimary).toBe('#333')
    })

    it('bgBase应返回CSS变量值', () => {
      cssVars['--bg-base'] = '#fff'
      expect(themeColors.bgBase).toBe('#fff')
    })

    it('colorPrimary应返回CSS变量值', () => {
      cssVars['--color-primary'] = '#1890ff'
      expect(themeColors.colorPrimary).toBe('#1890ff')
    })

    it('未设置的变量应返回空字符串', () => {
      expect(themeColors.textSecondary).toBe('')
    })
  })
})
