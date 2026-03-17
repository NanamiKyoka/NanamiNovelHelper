/**
 * 设置相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import { globalSettingsService } from '../services/globalSettings'
import { projectSettingsService } from '../services/projectSettings'
import { backupService } from '../services/backup'
import type { GlobalSettings, ProjectSettings, BadgeVisibility, BadgeType } from '../types/settings'

/**
 * 注册设置相关 IPC 处理器
 */
export function registerSettingsHandlers(): void {
  // ============================================
  // 全局设置
  // ============================================

  // 获取所有全局设置
  ipcMain.handle('settings:global:getAll', (): GlobalSettings => {
    return globalSettingsService.getAll()
  })

  // 更新全局设置
  ipcMain.handle('settings:global:update', (_, settings: Partial<GlobalSettings>): GlobalSettings => {
    return globalSettingsService.update(settings)
  })

  // 重置全局设置
  ipcMain.handle('settings:global:reset', (): GlobalSettings => {
    return globalSettingsService.reset()
  })

  // 获取主题配置
  ipcMain.handle('settings:global:getTheme', () => {
    return globalSettingsService.getTheme()
  })

  // 更新主题配置
  ipcMain.handle('settings:global:updateTheme', (_, theme) => {
    return globalSettingsService.updateTheme(theme)
  })

  // 获取窗口状态
  ipcMain.handle('settings:global:getWindowState', () => {
    return globalSettingsService.getWindowState()
  })

  // 更新窗口状态
  ipcMain.handle('settings:global:updateWindowState', (_, state) => {
    return globalSettingsService.updateWindowState(state)
  })

  // 获取语言设置
  ipcMain.handle('settings:global:getLanguage', () => {
    return globalSettingsService.getLanguage()
  })

  // 设置语言
  ipcMain.handle('settings:global:setLanguage', (_, language) => {
    globalSettingsService.setLanguage(language)
  })

  // 获取侧边栏宽度
  ipcMain.handle('settings:global:getSidebarWidth', () => {
    return globalSettingsService.getSidebarWidth()
  })

  // 设置侧边栏宽度
  ipcMain.handle('settings:global:setSidebarWidth', (_, width: number) => {
    globalSettingsService.setSidebarWidth(width)
  })

  // ============================================
  // API Key 管理
  // ============================================

  // 获取 API Key
  ipcMain.handle('settings:global:getApiKey', (_, keyName: string): string | null => {
    return globalSettingsService.getApiKey(keyName)
  })

  // 设置 API Key
  ipcMain.handle('settings:global:setApiKey', (_, keyName: string, value: string) => {
    globalSettingsService.setApiKey(keyName, value)
  })

  // 删除 API Key
  ipcMain.handle('settings:global:deleteApiKey', (_, keyName: string) => {
    globalSettingsService.deleteApiKey(keyName)
  })

  // 获取所有 API Key 名称
  ipcMain.handle('settings:global:getApiKeyNames', (): string[] => {
    return globalSettingsService.getApiKeyNames()
  })

  // 检查加密是否可用
  ipcMain.handle('settings:global:isEncryptionAvailable', (): boolean => {
    return globalSettingsService.isEncryptionAvailable()
  })

  // ============================================
  // 项目设置
  // ============================================

  // 获取所有项目设置
  ipcMain.handle('settings:project:getAll', (): ProjectSettings => {
    return projectSettingsService.getAll()
  })

  // 更新项目设置
  ipcMain.handle('settings:project:update', (_, settings: Partial<ProjectSettings>): ProjectSettings => {
    return projectSettingsService.update(settings)
  })

  // 立即保存项目设置
  ipcMain.handle('settings:project:saveNow', () => {
    projectSettingsService.saveNow()
  })

  // 重置项目设置
  ipcMain.handle('settings:project:reset', (): ProjectSettings => {
    return projectSettingsService.reset()
  })

  // 获取编辑器设置
  ipcMain.handle('settings:project:getEditor', () => {
    return projectSettingsService.getEditorSettings()
  })

  // 更新编辑器设置
  ipcMain.handle('settings:project:updateEditor', (_, settings) => {
    return projectSettingsService.updateEditorSettings(settings)
  })

  // 获取高亮设置
  ipcMain.handle('settings:project:getHighlight', () => {
    return projectSettingsService.getHighlightSettings()
  })

  // 更新高亮设置
  ipcMain.handle('settings:project:updateHighlight', (_, settings) => {
    return projectSettingsService.updateHighlightSettings(settings)
  })

  // 获取备份设置
  ipcMain.handle('settings:project:getBackup', () => {
    return projectSettingsService.getBackupSettings()
  })

  // 更新备份设置
  ipcMain.handle('settings:project:updateBackup', (_, settings) => {
    return projectSettingsService.updateBackupSettings(settings)
  })

  // 获取徽章可见性设置
  ipcMain.handle('settings:project:getBadgeVisibility', (): BadgeVisibility => {
    return projectSettingsService.getBadgeVisibility()
  })

  // 更新徽章可见性设置
  ipcMain.handle('settings:project:updateBadgeVisibility', (_, settings: Partial<BadgeVisibility>): BadgeVisibility => {
    return projectSettingsService.updateBadgeVisibility(settings)
  })

  // 获取徽章顺序
  ipcMain.handle('settings:project:getBadgeOrder', (): BadgeType[] => {
    return projectSettingsService.getBadgeOrder()
  })

  // 更新徽章顺序
  ipcMain.handle('settings:project:updateBadgeOrder', (_, order: BadgeType[]): BadgeType[] => {
    return projectSettingsService.updateBadgeOrder(order)
  })

  // 获取显示隐藏文件设置
  ipcMain.handle('settings:project:getShowHiddenFiles', (): boolean => {
    return projectSettingsService.getShowHiddenFiles()
  })

  // 设置显示隐藏文件
  ipcMain.handle('settings:project:setShowHiddenFiles', (_, value: boolean): void => {
    projectSettingsService.setShowHiddenFiles(value)
  })

  // ============================================
  // 备份管理
  // ============================================

  // 创建备份
  ipcMain.handle('backup:create', async (): Promise<string | null> => {
    return backupService.createBackup()
  })

  // 获取备份列表
  ipcMain.handle('backup:list', () => {
    return backupService.listBackups()
  })

  // 恢复备份
  ipcMain.handle('backup:restore', async (_, filename: string): Promise<boolean> => {
    return backupService.restoreBackup(filename)
  })

  // 删除备份
  ipcMain.handle('backup:delete', (_, filename: string): boolean => {
    return backupService.deleteBackup(filename)
  })

  // 导出备份
  ipcMain.handle('backup:export', async (_, filename: string): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      title: '导出备份',
      defaultPath: filename,
      filters: [
        { name: 'Nanami 备份文件', extensions: ['nhbak'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })

    if (result.canceled || !result.filePath) {
      return null
    }

    const success = await backupService.exportBackup(filename, result.filePath)
    return success ? result.filePath : null
  })

  // 导入备份
  ipcMain.handle('backup:import', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: '导入备份',
      filters: [
        { name: 'Nanami 备份文件', extensions: ['nhbak'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return backupService.importBackup(result.filePaths[0])
  })
}

/**
 * 移除设置相关 IPC 处理器
 */
export function unregisterSettingsHandlers(): void {
  const channels = [
    'settings:global:getAll',
    'settings:global:update',
    'settings:global:reset',
    'settings:global:getTheme',
    'settings:global:updateTheme',
    'settings:global:getWindowState',
    'settings:global:updateWindowState',
    'settings:global:getLanguage',
    'settings:global:setLanguage',
    'settings:global:getSidebarWidth',
    'settings:global:setSidebarWidth',
    'settings:global:getApiKey',
    'settings:global:setApiKey',
    'settings:global:deleteApiKey',
    'settings:global:getApiKeyNames',
    'settings:global:isEncryptionAvailable',
    'settings:project:getAll',
    'settings:project:update',
    'settings:project:saveNow',
    'settings:project:reset',
    'settings:project:getEditor',
    'settings:project:updateEditor',
    'settings:project:getHighlight',
    'settings:project:updateHighlight',
    'settings:project:getBackup',
    'settings:project:updateBackup',
    'settings:project:getBadgeVisibility',
    'settings:project:updateBadgeVisibility',
    'settings:project:getBadgeOrder',
    'settings:project:updateBadgeOrder',
    'backup:create',
    'backup:list',
    'backup:restore',
    'backup:delete',
    'backup:export',
    'backup:import'
  ]

  for (const channel of channels) {
    ipcMain.removeHandler(channel)
  }
}