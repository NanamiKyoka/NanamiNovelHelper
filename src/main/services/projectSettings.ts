/**
 * 项目设置服务
 *
 * 存储位置：项目根目录/.novelhelper/settings.json5
 * 存储格式：JSON5（支持注释和尾随逗号，便于用户手动编辑）
 *
 * 设计决策：
 * 1. 防抖保存：延迟 500ms 写入，避免频繁 IO
 * 2. 增量合并：支持部分更新，自动深度合并
 * 3. 默认值继承：新设置项自动获得默认值，确保向后兼容
 */

import * as fs from 'fs'
import * as path from 'path'
import JSON5 from 'json5'
import {
  ProjectSettings,
  ProjectEditorSettings,
  ProjectHighlightSettings,
  ProjectBackupSettings,
  BadgeVisibility,
  BadgeType,
  SidebarBadgeVisibility,
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_BADGE_ORDER,
  DEFAULT_SIDEBAR_BADGE_VISIBILITY,
  DEFAULT_SIDEBAR_BADGE_ORDER
} from '../types/settings'
import { PROJECT_META_DIR, PROJECT_SETTINGS_FILE } from '../types/project'

/** 防抖计时器（模块级变量避免内存泄漏） */
let saveTimer: NodeJS.Timeout | null = null

class ProjectSettingsService {
  private projectPath: string | null = null
  private settingsPath: string | null = null
  private settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS
  private pendingChanges: Partial<ProjectSettings> = {}
  private saveDelay = 500

  /** 初始化服务，随项目打开调用 */
  init(projectPath: string): void {
    this.projectPath = projectPath
    this.settingsPath = path.join(projectPath, PROJECT_META_DIR, PROJECT_SETTINGS_FILE)
    this.loadSettings()
  }

  /**
   * 加载设置，自动填充缺失字段为默认值（向后兼容）
   */
  private loadSettings(): void {
    if (!this.settingsPath || !fs.existsSync(this.settingsPath)) {
      this.settings = { ...DEFAULT_PROJECT_SETTINGS }
      return
    }

    try {
      const content = fs.readFileSync(this.settingsPath, 'utf-8')
      const saved = JSON5.parse(content)
      this.settings = {
        editor: { ...DEFAULT_PROJECT_SETTINGS.editor, ...saved.editor },
        highlight: { ...DEFAULT_PROJECT_SETTINGS.highlight, ...saved.highlight },
        autoCreateVocabularyFile: saved.autoCreateVocabularyFile ?? DEFAULT_PROJECT_SETTINGS.autoCreateVocabularyFile,
        backup: { ...DEFAULT_PROJECT_SETTINGS.backup, ...saved.backup },
        badgeVisibility: { ...DEFAULT_PROJECT_SETTINGS.badgeVisibility, ...saved.badgeVisibility },
        badgeOrder: this.validateBadgeOrder(saved.badgeOrder),
        sidebarBadgeVisibility: { ...DEFAULT_SIDEBAR_BADGE_VISIBILITY, ...saved.sidebarBadgeVisibility },
        sidebarBadgeOrder: this.validateSidebarBadgeOrder(saved.sidebarBadgeOrder),
        showHiddenFiles: saved.showHiddenFiles ?? DEFAULT_PROJECT_SETTINGS.showHiddenFiles,
        expandedFolders: saved.expandedFolders ?? DEFAULT_PROJECT_SETTINGS.expandedFolders,
        hiddenItems: saved.hiddenItems ?? DEFAULT_PROJECT_SETTINGS.hiddenItems
      }
    } catch (error) {
      console.error('Failed to load project settings:', error)
      this.settings = { ...DEFAULT_PROJECT_SETTINGS }
    }
  }

  /**
   * 验证徽章顺序：过滤无效类型 + 补充缺失徽章
   * 确保旧配置不丢失，新徽章能自动出现
   */
  private validateBadgeOrder(order: unknown): BadgeType[] {
    if (!Array.isArray(order)) {
      return [...DEFAULT_BADGE_ORDER]
    }
    const validOrder = order.filter((b): b is BadgeType => DEFAULT_BADGE_ORDER.includes(b))
    const missingBadges = DEFAULT_BADGE_ORDER.filter(b => !validOrder.includes(b))
    return [...validOrder, ...missingBadges]
  }

  private validateSidebarBadgeOrder(order: unknown): string[] {
    if (!Array.isArray(order)) {
      return [...DEFAULT_SIDEBAR_BADGE_ORDER]
    }
    const validOrder = order.filter((b): b is string => DEFAULT_SIDEBAR_BADGE_ORDER.includes(b))
    const missingBadges = DEFAULT_SIDEBAR_BADGE_ORDER.filter(b => !validOrder.includes(b))
    return [...validOrder, ...missingBadges]
  }

  private saveSettingsSync(): void {
    if (!this.settingsPath) return

    const dir = path.dirname(this.settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    if (Object.keys(this.pendingChanges).length > 0) {
      this.settings = this.mergeSettings(this.settings, this.pendingChanges)
      this.pendingChanges = {}
    }

    fs.writeFileSync(this.settingsPath, JSON5.stringify(this.settings, null, 2), 'utf-8')
  }

  /**
   * 防抖保存：用户连续修改时只执行最后一次写入
   * 500ms 是平衡 IO 性能和数据安全的折中值
   */
  private debouncedSave(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
    }
    saveTimer = setTimeout(() => {
      this.saveSettingsSync()
      saveTimer = null
    }, this.saveDelay)
  }

  /** 深度合并：只更新传入字段，保留其他属性 */
  private mergeSettings(target: ProjectSettings, source: Partial<ProjectSettings>): ProjectSettings {
    const result = { ...target }
    
    if (source.editor) result.editor = { ...target.editor, ...source.editor }
    if (source.highlight) result.highlight = { ...target.highlight, ...source.highlight }
    if (source.backup) result.backup = { ...target.backup, ...source.backup }
    if (source.autoCreateVocabularyFile !== undefined) result.autoCreateVocabularyFile = source.autoCreateVocabularyFile
    if (source.badgeVisibility) result.badgeVisibility = { ...target.badgeVisibility, ...source.badgeVisibility }
    if (source.badgeOrder) result.badgeOrder = source.badgeOrder
    if (source.sidebarBadgeVisibility) result.sidebarBadgeVisibility = { ...target.sidebarBadgeVisibility, ...source.sidebarBadgeVisibility }
    if (source.sidebarBadgeOrder) result.sidebarBadgeOrder = source.sidebarBadgeOrder
    if (source.showHiddenFiles !== undefined) result.showHiddenFiles = source.showHiddenFiles
    if (source.expandedFolders !== undefined) result.expandedFolders = source.expandedFolders
    if (source.hiddenItems !== undefined) result.hiddenItems = source.hiddenItems
    
    return result
  }

  getAll(): ProjectSettings {
    return { ...this.settings }
  }

  update(settings: Partial<ProjectSettings>): ProjectSettings {
    this.pendingChanges = { ...this.pendingChanges, ...settings }
    this.debouncedSave()
    return this.mergeSettings(this.settings, this.pendingChanges)
  }

  saveNow(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    this.saveSettingsSync()
  }

  reset(): ProjectSettings {
    this.settings = { ...DEFAULT_PROJECT_SETTINGS }
    this.pendingChanges = {}
    this.saveSettingsSync()
    return this.settings
  }

  // 编辑器设置
  getEditorSettings(): ProjectEditorSettings {
    return { ...this.settings.editor }
  }

  updateEditorSettings(settings: Partial<ProjectEditorSettings>): ProjectEditorSettings {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ editor: { ...currentSettings.editor, ...settings } }).editor
  }

  // 高亮设置
  getHighlightSettings(): ProjectHighlightSettings {
    return { ...this.settings.highlight }
  }

  updateHighlightSettings(settings: Partial<ProjectHighlightSettings>): ProjectHighlightSettings {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ highlight: { ...currentSettings.highlight, ...settings } }).highlight
  }

  // 备份设置
  getBackupSettings(): ProjectBackupSettings {
    return { ...this.settings.backup }
  }

  updateBackupSettings(settings: Partial<ProjectBackupSettings>): ProjectBackupSettings {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ backup: { ...currentSettings.backup, ...settings } }).backup
  }

  getAutoCreateVocabularyFile(): boolean {
    return this.settings.autoCreateVocabularyFile
  }

  setAutoCreateVocabularyFile(value: boolean): void {
    this.update({ autoCreateVocabularyFile: value })
  }

  // 徽章设置
  getBadgeVisibility(): BadgeVisibility {
    return { ...this.settings.badgeVisibility }
  }

  updateBadgeVisibility(settings: Partial<BadgeVisibility>): BadgeVisibility {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ badgeVisibility: { ...currentSettings.badgeVisibility, ...settings } }).badgeVisibility
  }

  getBadgeOrder(): BadgeType[] {
    return [...this.settings.badgeOrder]
  }

  updateBadgeOrder(order: BadgeType[]): BadgeType[] {
    const validatedOrder = this.validateBadgeOrder(order)
    return this.update({ badgeOrder: validatedOrder }).badgeOrder
  }

  // 文件树设置
  getShowHiddenFiles(): boolean {
    return this.settings.showHiddenFiles
  }

  setShowHiddenFiles(value: boolean): void {
    this.update({ showHiddenFiles: value })
  }

  getExpandedFolders(): string[] {
    return [...this.settings.expandedFolders]
  }

  setExpandedFolders(folders: string[]): void {
    this.update({ expandedFolders: folders })
  }

  getHiddenItems(): string[] {
    return [...this.settings.hiddenItems]
  }

  setHiddenItems(items: string[]): void {
    this.update({ hiddenItems: items })
  }

  // 左侧边栏徽章入口
  getSidebarBadgeVisibility(): SidebarBadgeVisibility {
    return { ...this.settings.sidebarBadgeVisibility }
  }

  updateSidebarBadgeVisibility(settings: Partial<SidebarBadgeVisibility>): SidebarBadgeVisibility {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ sidebarBadgeVisibility: { ...currentSettings.sidebarBadgeVisibility, ...settings } }).sidebarBadgeVisibility
  }

  getSidebarBadgeOrder(): string[] {
    return [...this.settings.sidebarBadgeOrder]
  }

  setSidebarBadgeOrder(order: string[]): string[] {
    const validatedOrder = this.validateSidebarBadgeOrder(order)
    return this.update({ sidebarBadgeOrder: validatedOrder }).sidebarBadgeOrder
  }
}

export const projectSettingsService = new ProjectSettingsService()