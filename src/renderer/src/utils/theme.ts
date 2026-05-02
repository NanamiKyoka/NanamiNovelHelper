/**
 * 主题相关工具函数
 */

import type { ThemeMode } from '@types/theme'

export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'light'
}

export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  if (mode === 'system') {
    return getSystemTheme()
  }
  return mode
}

export function onSystemThemeChange(callback: (isDark: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (e: MediaQueryListEvent) => callback(e.matches)
  mediaQuery.addEventListener('change', handler)
  return () => mediaQuery.removeEventListener('change', handler)
}

export type ThemeColorVar =
  | '--text-primary'
  | '--text-secondary'
  | '--text-tertiary'
  | '--text-quaternary'
  | '--text-placeholder'
  | '--text-disabled'
  | '--bg-base'
  | '--bg-container'
  | '--bg-elevated'
  | '--bg-surface'
  | '--bg-muted'
  | '--border-primary'
  | '--border-secondary'
  | '--border-tertiary'
  | '--color-primary'
  | '--color-primary-hover'
  | '--color-primary-active'
  | '--color-primary-bg'
  | '--color-primary-bg-hover'
  | '--color-primary-border'
  | '--color-success'
  | '--color-success-bg'
  | '--color-warning'
  | '--color-warning-bg'
  | '--color-error'
  | '--color-error-bg'
  | '--color-info'
  | '--color-info-bg'
  | '--hover-bg'
  | '--active-bg'

export function getCssVar(varName: ThemeColorVar | string): string {
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim()
}

export function getThemeColor(varName: ThemeColorVar): string {
  return getCssVar(varName)
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  }
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6
        break
      case g:
        h = ((b - r) / d + 2) / 6
        break
      case b:
        h = ((r - g) / d + 4) / 6
        break
    }
  }

  return { h: h * 360, s: s * 100, l: l * 100 }
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

export interface PrimaryColorVariants {
  primary: string
  hover: string
  active: string
  bg: string
  bgHover: string
  border: string
  focusBg: string
  shadowFocus: string
}

export function generatePrimaryColorVariants(
  primaryHex: string,
  isDark: boolean
): PrimaryColorVariants {
  const rgb = hexToRgb(primaryHex)
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b)

  const hover = hslToHex(hsl.h, hsl.s, Math.min(hsl.l + 10, 90))
  const active = hslToHex(hsl.h, hsl.s, Math.max(hsl.l - 10, 10))

  let bg: string
  let bgHover: string
  let border: string
  let focusBg: string
  let shadowFocus: string

  if (isDark) {
    bg = hslToHex(hsl.h, Math.min(hsl.s, 40), 12)
    bgHover = hslToHex(hsl.h, Math.min(hsl.s, 50), 18)
    border = hslToHex(hsl.h, Math.min(hsl.s, 50), 25)
    focusBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
    shadowFocus = `0 0 0 2px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.35)`
  } else {
    bg = hslToHex(hsl.h, Math.min(hsl.s, 80), 97)
    bgHover = hslToHex(hsl.h, Math.min(hsl.s, 80), 92)
    border = hslToHex(hsl.h, Math.min(hsl.s, 70), 80)
    focusBg = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.1)`
    shadowFocus = `0 0 0 2px rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`
  }

  return {
    primary: primaryHex,
    hover,
    active,
    bg,
    bgHover,
    border,
    focusBg,
    shadowFocus
  }
}

export function applyPrimaryColorToRoot(primaryHex: string, isDark: boolean): void {
  const root = document.documentElement
  const variants = generatePrimaryColorVariants(primaryHex, isDark)

  root.style.setProperty('--color-primary', variants.primary)
  root.style.setProperty('--color-primary-hover', variants.hover)
  root.style.setProperty('--color-primary-active', variants.active)
  root.style.setProperty('--color-primary-bg', variants.bg)
  root.style.setProperty('--color-primary-bg-hover', variants.bgHover)
  root.style.setProperty('--color-primary-border', variants.border)
  root.style.setProperty('--color-info', variants.primary)
  root.style.setProperty('--color-info-bg', variants.bg)
  root.style.setProperty('--focus-bg', variants.focusBg)
  root.style.setProperty('--shadow-focus', variants.shadowFocus)
  root.style.setProperty('--ant-color-primary', variants.primary)
  root.style.setProperty('--ant-color-primary-hover', variants.hover)
  root.style.setProperty('--ant-color-primary-bg', variants.bg)
  root.style.setProperty('--ant-color-primary-border', variants.border)
}

export const themeColors = {
  get textPrimary() {
    return getThemeColor('--text-primary')
  },
  get textSecondary() {
    return getThemeColor('--text-secondary')
  },
  get textTertiary() {
    return getThemeColor('--text-tertiary')
  },
  get textQuaternary() {
    return getThemeColor('--text-quaternary')
  },
  get bgBase() {
    return getThemeColor('--bg-base')
  },
  get bgContainer() {
    return getThemeColor('--bg-container')
  },
  get bgElevated() {
    return getThemeColor('--bg-elevated')
  },
  get borderPrimary() {
    return getThemeColor('--border-primary')
  },
  get borderSecondary() {
    return getThemeColor('--border-secondary')
  },
  get colorPrimary() {
    return getThemeColor('--color-primary')
  },
  get colorPrimaryHover() {
    return getThemeColor('--color-primary-hover')
  },
  get colorPrimaryBg() {
    return getThemeColor('--color-primary-bg')
  },
  get colorSuccess() {
    return getThemeColor('--color-success')
  },
  get colorSuccessBg() {
    return getThemeColor('--color-success-bg')
  },
  get colorWarning() {
    return getThemeColor('--color-warning')
  },
  get colorWarningBg() {
    return getThemeColor('--color-warning-bg')
  },
  get colorError() {
    return getThemeColor('--color-error')
  },
  get colorErrorBg() {
    return getThemeColor('--color-error-bg')
  },
  get colorInfo() {
    return getThemeColor('--color-info')
  },
  get colorInfoBg() {
    return getThemeColor('--color-info-bg')
  },
  get hoverBg() {
    return getThemeColor('--hover-bg')
  },
  get activeBg() {
    return getThemeColor('--active-bg')
  }
}
