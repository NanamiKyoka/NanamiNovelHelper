/**
 * 主题相关工具函数
 */

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

export const themeColors = {
  get textPrimary() { return getThemeColor('--text-primary') },
  get textSecondary() { return getThemeColor('--text-secondary') },
  get textTertiary() { return getThemeColor('--text-tertiary') },
  get textQuaternary() { return getThemeColor('--text-quaternary') },
  get bgBase() { return getThemeColor('--bg-base') },
  get bgContainer() { return getThemeColor('--bg-container') },
  get bgElevated() { return getThemeColor('--bg-elevated') },
  get borderPrimary() { return getThemeColor('--border-primary') },
  get borderSecondary() { return getThemeColor('--border-secondary') },
  get colorPrimary() { return getThemeColor('--color-primary') },
  get colorPrimaryHover() { return getThemeColor('--color-primary-hover') },
  get colorPrimaryBg() { return getThemeColor('--color-primary-bg') },
  get colorSuccess() { return getThemeColor('--color-success') },
  get colorSuccessBg() { return getThemeColor('--color-success-bg') },
  get colorWarning() { return getThemeColor('--color-warning') },
  get colorWarningBg() { return getThemeColor('--color-warning-bg') },
  get colorError() { return getThemeColor('--color-error') },
  get colorErrorBg() { return getThemeColor('--color-error-bg') },
  get colorInfo() { return getThemeColor('--color-info') },
  get colorInfoBg() { return getThemeColor('--color-info-bg') },
  get hoverBg() { return getThemeColor('--hover-bg') },
  get activeBg() { return getThemeColor('--active-bg') },
}
