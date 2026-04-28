/**
 * 全局设置服务
 * 使用 electron-store 管理应用级设置
 */

import Store from 'electron-store'
import { safeStorage } from 'electron'
import {
  GlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
  WindowState,
  GlobalThemeConfig,
  Language,
  EncryptedKeys,
  GlobalLayoutSettings,
  BadgeVisibility,
  BadgeType,
  SidebarBadgeVisibility,
  DEFAULT_GLOBAL_LAYOUT_SETTINGS,
  DEFAULT_BADGE_ORDER,
  DEFAULT_SIDEBAR_BADGE_ORDER
} from '../types/settings'

/**
 * 全局设置存储
 */
const globalSettingsStore = new Store<GlobalSettings>({
  name: 'global-settings',
  defaults: DEFAULT_GLOBAL_SETTINGS
})

/**
 * 加密密钥存储
 */
const encryptedKeysStore = new Store<EncryptedKeys>({
  name: 'encrypted-keys',
  defaults: {
    apiKeys: {}
  }
})

/**
 * 全局设置服务
 */
class GlobalSettingsService {
  /**
   * 获取所有全局设置
   */
  getAll(): GlobalSettings {
    return globalSettingsStore.store
  }

  /**
   * 更新全局设置
   */
  update(settings: Partial<GlobalSettings>): GlobalSettings {
    globalSettingsStore.store = {
      ...globalSettingsStore.store,
      ...settings
    }
    return globalSettingsStore.store
  }

  /**
   * 重置为默认设置
   */
  reset(): GlobalSettings {
    globalSettingsStore.store = DEFAULT_GLOBAL_SETTINGS
    return globalSettingsStore.store
  }

  // 主题设置

  /**
   * 获取主题配置
   */
  getTheme(): GlobalThemeConfig {
    return globalSettingsStore.get('theme')
  }

  /**
   * 更新主题配置
   */
  updateTheme(theme: Partial<GlobalThemeConfig>): GlobalThemeConfig {
    const currentTheme = globalSettingsStore.get('theme')
    const newTheme = { ...currentTheme, ...theme }
    globalSettingsStore.set('theme', newTheme)
    return newTheme
  }

  // 窗口状态

  /**
   * 获取窗口状态
   */
  getWindowState(): WindowState {
    return globalSettingsStore.get('window')
  }

  /**
   * 更新窗口状态
   */
  updateWindowState(state: Partial<WindowState>): WindowState {
    const currentState = globalSettingsStore.get('window')
    const newState = { ...currentState, ...state }
    globalSettingsStore.set('window', newState)
    return newState
  }

  // 语言设置

  /**
   * 获取语言设置
   */
  getLanguage(): Language {
    return globalSettingsStore.get('language')
  }

  /**
   * 设置语言
   */
  setLanguage(language: Language): void {
    globalSettingsStore.set('language', language)
  }

  // 其他设置

  /**
   * 获取侧边栏宽度
   */
  getSidebarWidth(): number {
    return globalSettingsStore.get('sidebarWidth')
  }

  /**
   * 设置侧边栏宽度
   */
  setSidebarWidth(width: number): void {
    globalSettingsStore.set('sidebarWidth', width)
  }

  /**
   * 是否显示欢迎页面
   */
  getShowWelcome(): boolean {
    return globalSettingsStore.get('showWelcome')
  }

  /**
   * 设置是否显示欢迎页面
   */
  setShowWelcome(show: boolean): void {
    globalSettingsStore.set('showWelcome', show)
  }

  // 布局设置

  /**
   * 获取布局设置
   */
  getLayout(): GlobalLayoutSettings {
    return globalSettingsStore.get('layout')
  }

  /**
   * 更新布局设置
   */
  updateLayout(layout: Partial<GlobalLayoutSettings>): GlobalLayoutSettings {
    const currentLayout = globalSettingsStore.get('layout')
    const newLayout = { ...currentLayout, ...layout }
    globalSettingsStore.set('layout', newLayout)
    return newLayout
  }

  /**
   * 获取徽章可见性
   */
  getBadgeVisibility(): BadgeVisibility {
    return globalSettingsStore.get('layout').badgeVisibility
  }

  /**
   * 更新徽章可见性
   */
  updateBadgeVisibility(settings: Partial<BadgeVisibility>): BadgeVisibility {
    const layout = globalSettingsStore.get('layout')
    const newBadgeVisibility = { ...layout.badgeVisibility, ...settings }
    globalSettingsStore.set('layout', { ...layout, badgeVisibility: newBadgeVisibility })
    return newBadgeVisibility
  }

  /**
   * 获取徽章顺序
   */
  getBadgeOrder(): BadgeType[] {
    return globalSettingsStore.get('layout').badgeOrder
  }

  /**
   * 更新徽章顺序
   */
  updateBadgeOrder(order: BadgeType[]): BadgeType[] {
    const layout = globalSettingsStore.get('layout')
    const validatedOrder = this.validateBadgeOrder(order)
    globalSettingsStore.set('layout', { ...layout, badgeOrder: validatedOrder })
    return validatedOrder
  }

  /**
   * 获取侧边栏徽章可见性
   */
  getSidebarBadgeVisibility(): SidebarBadgeVisibility {
    return globalSettingsStore.get('layout').sidebarBadgeVisibility
  }

  /**
   * 更新侧边栏徽章可见性
   */
  updateSidebarBadgeVisibility(settings: Partial<SidebarBadgeVisibility>): SidebarBadgeVisibility {
    const layout = globalSettingsStore.get('layout')
    const newVisibility = { ...layout.sidebarBadgeVisibility, ...settings }
    globalSettingsStore.set('layout', { ...layout, sidebarBadgeVisibility: newVisibility })
    return newVisibility
  }

  /**
   * 获取侧边栏徽章顺序
   */
  getSidebarBadgeOrder(): string[] {
    return globalSettingsStore.get('layout').sidebarBadgeOrder
  }

  /**
   * 更新侧边栏徽章顺序
   */
  updateSidebarBadgeOrder(order: string[]): string[] {
    const layout = globalSettingsStore.get('layout')
    const validatedOrder = this.validateSidebarBadgeOrder(order)
    globalSettingsStore.set('layout', { ...layout, sidebarBadgeOrder: validatedOrder })
    return validatedOrder
  }

  /**
   * 获取是否显示隐藏文件
   */
  getShowHiddenFiles(): boolean {
    return globalSettingsStore.get('layout').showHiddenFiles
  }

  /**
   * 设置是否显示隐藏文件
   */
  setShowHiddenFiles(show: boolean): void {
    const layout = globalSettingsStore.get('layout')
    globalSettingsStore.set('layout', { ...layout, showHiddenFiles: show })
  }

  /**
   * 验证徽章顺序
   */
  private validateBadgeOrder(order: BadgeType[]): BadgeType[] {
    const validOrder = order.filter(b => DEFAULT_BADGE_ORDER.includes(b))
    const missingBadges = DEFAULT_BADGE_ORDER.filter(b => !validOrder.includes(b))
    return [...validOrder, ...missingBadges]
  }

  /**
   * 验证侧边栏徽章顺序
   */
  private validateSidebarBadgeOrder(order: string[]): string[] {
    const validOrder = order.filter(b => DEFAULT_SIDEBAR_BADGE_ORDER.includes(b))
    const missingBadges = DEFAULT_SIDEBAR_BADGE_ORDER.filter(b => !validOrder.includes(b))
    return [...validOrder, ...missingBadges]
  }

  // 敏感信息加密存储

  /**
   * 检查是否支持加密
   */
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable()
  }

  /**
   * 加密字符串
   */
  private encrypt(plaintext: string): string {
    if (!this.isEncryptionAvailable()) {
      // 如果不支持加密，返回 base64 编码（不安全，但作为后备）
      return Buffer.from(plaintext).toString('base64')
    }
    const encrypted = safeStorage.encryptString(plaintext)
    return encrypted.toString('base64')
  }

  /**
   * 解密字符串
   */
  private decrypt(ciphertext: string): string {
    if (!this.isEncryptionAvailable()) {
      // 如果不支持加密，尝试 base64 解码
      return Buffer.from(ciphertext, 'base64').toString('utf-8')
    }
    const buffer = Buffer.from(ciphertext, 'base64')
    return safeStorage.decryptString(buffer)
  }

  /**
   * 获取 API Key
   */
  getApiKey(keyName: string): string | null {
    const apiKeys = encryptedKeysStore.get('apiKeys')
    const encrypted = apiKeys[keyName]
    if (!encrypted) return null

    try {
      return this.decrypt(encrypted)
    } catch {
      return null
    }
  }

  /**
   * 设置 API Key
   */
  setApiKey(keyName: string, value: string): void {
    const apiKeys = encryptedKeysStore.get('apiKeys')
    apiKeys[keyName] = this.encrypt(value)
    encryptedKeysStore.set('apiKeys', apiKeys)
  }

  /**
   * 删除 API Key
   */
  deleteApiKey(keyName: string): void {
    const apiKeys = encryptedKeysStore.get('apiKeys')
    delete apiKeys[keyName]
    encryptedKeysStore.set('apiKeys', apiKeys)
  }

  /**
   * 获取所有 API Key 名称
   */
  getApiKeyNames(): string[] {
    const apiKeys = encryptedKeysStore.get('apiKeys')
    return Object.keys(apiKeys)
  }
}

// 单例导出
export const globalSettingsService = new GlobalSettingsService()
