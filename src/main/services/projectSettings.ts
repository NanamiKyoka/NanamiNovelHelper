/**
 * 项目设置服务
 * 管理项目级设置（存储在 .novelhelper/settings.json5）
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
  DEFAULT_PROJECT_SETTINGS,
  DEFAULT_BADGE_ORDER
} from '../types/settings'
import { PROJECT_META_DIR, PROJECT_SETTINGS_FILE } from '../types/project'

/**
 * 防抖保存计时器
 */
let saveTimer: NodeJS.Timeout | null = null

/**
 * 项目设置服务
 */
class ProjectSettingsService {
  private projectPath: string | null = null
  private settingsPath: string | null = null
  private settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS
  private pendingChanges: Partial<ProjectSettings> = {}
  private saveDelay: number = 500 // 默认防抖延迟

  /**
   * 初始化服务
   */
  init(projectPath: string): void {
    this.projectPath = projectPath
    this.settingsPath = path.join(projectPath, PROJECT_META_DIR, PROJECT_SETTINGS_FILE)
    this.loadSettings()
  }

  /**
   * 加载项目设置
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
        showHiddenFiles: saved.showHiddenFiles ?? DEFAULT_PROJECT_SETTINGS.showHiddenFiles
      }
    } catch (error) {
      console.error('Failed to load project settings:', error)
      this.settings = { ...DEFAULT_PROJECT_SETTINGS }
    }
  }

  /**
   * 验证并修复徽章顺序
   */
  private validateBadgeOrder(order: unknown): BadgeType[] {
    if (!Array.isArray(order)) {
      return [...DEFAULT_BADGE_ORDER]
    }
    // 过滤出有效的徽章类型
    const validOrder = order.filter((b): b is BadgeType => DEFAULT_BADGE_ORDER.includes(b))
    // 添加缺失的徽章
    const missingBadges = DEFAULT_BADGE_ORDER.filter(b => !validOrder.includes(b))
    return [...validOrder, ...missingBadges]
  }

  /**
   * 保存项目设置（同步）
   */
  private saveSettingsSync(): void {
    if (!this.settingsPath) return

    // 确保目录存在
    const dir = path.dirname(this.settingsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // 合并待保存的更改
    if (Object.keys(this.pendingChanges).length > 0) {
      this.settings = this.mergeSettings(this.settings, this.pendingChanges)
      this.pendingChanges = {}
    }

    fs.writeFileSync(this.settingsPath, JSON5.stringify(this.settings, null, 2), 'utf-8')
  }

  /**
   * 防抖保存
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

  /**
   * 合并设置（深度合并）
   */
  private mergeSettings(target: ProjectSettings, source: Partial<ProjectSettings>): ProjectSettings {
    const result = { ...target }
    
    if (source.editor) {
      result.editor = { ...target.editor, ...source.editor }
    }
    if (source.highlight) {
      result.highlight = { ...target.highlight, ...source.highlight }
    }
    if (source.backup) {
      result.backup = { ...target.backup, ...source.backup }
    }
    if (source.autoCreateVocabularyFile !== undefined) {
      result.autoCreateVocabularyFile = source.autoCreateVocabularyFile
    }
    if (source.badgeVisibility) {
      result.badgeVisibility = { ...target.badgeVisibility, ...source.badgeVisibility }
    }
    if (source.badgeOrder) {
      result.badgeOrder = source.badgeOrder
    }
    if (source.showHiddenFiles !== undefined) {
      result.showHiddenFiles = source.showHiddenFiles
    }
    
    return result
  }

  /**
   * 获取所有设置
   */
  getAll(): ProjectSettings {
    return { ...this.settings }
  }

  /**
   * 更新设置（带防抖）
   */
  update(settings: Partial<ProjectSettings>): ProjectSettings {
    this.pendingChanges = { ...this.pendingChanges, ...settings }
    this.debouncedSave()
    return this.mergeSettings(this.settings, this.pendingChanges)
  }

  /**
   * 立即保存所有更改
   */
  saveNow(): void {
    if (saveTimer) {
      clearTimeout(saveTimer)
      saveTimer = null
    }
    this.saveSettingsSync()
  }

  /**
   * 重置为默认设置
   */
  reset(): ProjectSettings {
    this.settings = { ...DEFAULT_PROJECT_SETTINGS }
    this.pendingChanges = {}
    this.saveSettingsSync()
    return this.settings
  }

  // ============================================
  // 编辑器设置
  // ============================================

  /**
   * 获取编辑器设置
   */
  getEditorSettings(): ProjectEditorSettings {
    return { ...this.settings.editor }
  }

  /**
   * 更新编辑器设置
   */
  updateEditorSettings(settings: Partial<ProjectEditorSettings>): ProjectEditorSettings {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ editor: { ...currentSettings.editor, ...settings } }).editor
  }

  // ============================================
  // 高亮设置
  // ============================================

  /**
   * 获取高亮设置
   */
  getHighlightSettings(): ProjectHighlightSettings {
    return { ...this.settings.highlight }
  }

  /**
   * 更新高亮设置
   */
  updateHighlightSettings(settings: Partial<ProjectHighlightSettings>): ProjectHighlightSettings {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ highlight: { ...currentSettings.highlight, ...settings } }).highlight
  }

  // ============================================
  // 备份设置
  // ============================================

  /**
   * 获取备份设置
   */
  getBackupSettings(): ProjectBackupSettings {
    return { ...this.settings.backup }
  }

  /**
   * 更新备份设置
   */
  updateBackupSettings(settings: Partial<ProjectBackupSettings>): ProjectBackupSettings {
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ backup: { ...currentSettings.backup, ...settings } }).backup
  }

  // ============================================
  // 其他设置
  // ============================================

  /**
   * 获取自动创建词汇文件设置
   */
  getAutoCreateVocabularyFile(): boolean {
    return this.settings.autoCreateVocabularyFile
  }

  /**
   * 设置自动创建词汇文件
   */
  setAutoCreateVocabularyFile(value: boolean): void {
    this.update({ autoCreateVocabularyFile: value })
  }

  // ============================================
  // 徽章可见性设置
  // ============================================

  /**
   * 获取徽章可见性设置
   */
  getBadgeVisibility(): BadgeVisibility {
    return { ...this.settings.badgeVisibility }
  }

  /**
   * 更新徽章可见性设置
   */
  updateBadgeVisibility(settings: Partial<BadgeVisibility>): BadgeVisibility {
    // 先获取合并后的最新设置（包含待保存的更改）
    const currentSettings = this.mergeSettings(this.settings, this.pendingChanges)
    return this.update({ badgeVisibility: { ...currentSettings.badgeVisibility, ...settings } }).badgeVisibility
  }

  // ============================================
  // 徽章顺序设置
  // ============================================

  /**
   * 获取徽章顺序
   */
  getBadgeOrder(): BadgeType[] {
    return [...this.settings.badgeOrder]
  }

  /**
   * 更新徽章顺序
   */
  updateBadgeOrder(order: BadgeType[]): BadgeType[] {
    const validatedOrder = this.validateBadgeOrder(order)
    return this.update({ badgeOrder: validatedOrder }).badgeOrder
  }

  // ============================================
  // 显示隐藏文件设置
  // ============================================

  /**
   * 获取显示隐藏文件设置
   */
  getShowHiddenFiles(): boolean {
    return this.settings.showHiddenFiles
  }

  /**
   * 设置显示隐藏文件
   */
  setShowHiddenFiles(value: boolean): void {
    this.update({ showHiddenFiles: value })
  }
}

// 单例导出
export const projectSettingsService = new ProjectSettingsService()
