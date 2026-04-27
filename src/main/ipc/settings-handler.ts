/**
 * 设置相关 IPC 处理器
 *
 * 设计说明：
 * - 全局设置：跨项目共享，存储在 electron-store
 * - 项目设置：跟随项目，存储在 .novelhelper/settings.json5
 * - API Key：使用 safeStorage 加密存储
 *
 * 命名约定：IPC 通道遵循 `模块:子模块:操作` 格式
 */

import { ipcMain, dialog } from 'electron'
import { globalSettingsService } from '../services/globalSettings'
import { projectSettingsService } from '../services/projectSettings'
import { backupService } from '../services/backup'
import { validateParams } from '../utils/validation'
import type { GlobalSettings, ProjectSettings, BadgeVisibility, BadgeType, SidebarBadgeVisibility, GlobalLayoutSettings } from '../types/settings'

/**
 * 注册设置相关 IPC 处理器
 * 必须在应用启动时调用，否则渲染进程无法访问设置 API
 */
export function registerSettingsHandlers(): void {
  // ============================================
  // 全局设置（跨项目共享，存储在 electron-store）
  // ============================================

  ipcMain.handle('settings:global:getAll', (): GlobalSettings => {
    return globalSettingsService.getAll()
  })

  ipcMain.handle('settings:global:update', (_, settings: Partial<GlobalSettings>): GlobalSettings => {
    validateParams('settings:global:update').object(settings, 'settings').validate()
    return globalSettingsService.update(settings)
  })

  ipcMain.handle('settings:global:reset', (): GlobalSettings => {
    return globalSettingsService.reset()
  })

  ipcMain.handle('settings:global:getTheme', () => {
    return globalSettingsService.getTheme()
  })

  ipcMain.handle('settings:global:updateTheme', (_, theme) => {
    validateParams('settings:global:updateTheme').object(theme, 'theme').validate()
    return globalSettingsService.updateTheme(theme)
  })

  ipcMain.handle('settings:global:getWindowState', () => {
    return globalSettingsService.getWindowState()
  })

  ipcMain.handle('settings:global:updateWindowState', (_, state) => {
    validateParams('settings:global:updateWindowState').object(state, 'state').validate()
    return globalSettingsService.updateWindowState(state)
  })

  ipcMain.handle('settings:global:getLanguage', () => {
    return globalSettingsService.getLanguage()
  })

  ipcMain.handle('settings:global:setLanguage', (_, language) => {
    validateParams('settings:global:setLanguage').nonEmptyString(language, 'language').validate()
    globalSettingsService.setLanguage(language)
  })

  ipcMain.handle('settings:global:getSidebarWidth', () => {
    return globalSettingsService.getSidebarWidth()
  })

  ipcMain.handle('settings:global:setSidebarWidth', (_, width: number) => {
    validateParams('settings:global:setSidebarWidth').number(width, 'width').validate()
    globalSettingsService.setSidebarWidth(width)
  })

  // ============================================
  // 全局布局设置
  // ============================================

  ipcMain.handle('settings:global:getLayout', (): GlobalLayoutSettings => {
    return globalSettingsService.getLayout()
  })

  ipcMain.handle('settings:global:updateLayout', (_, layout: Partial<GlobalLayoutSettings>): GlobalLayoutSettings => {
    validateParams('settings:global:updateLayout').object(layout, 'layout').validate()
    return globalSettingsService.updateLayout(layout)
  })

  ipcMain.handle('settings:global:getBadgeVisibility', (): BadgeVisibility => {
    return globalSettingsService.getBadgeVisibility()
  })

  ipcMain.handle('settings:global:updateBadgeVisibility', (_, settings: Partial<BadgeVisibility>): BadgeVisibility => {
    validateParams('settings:global:updateBadgeVisibility').object(settings, 'settings').validate()
    return globalSettingsService.updateBadgeVisibility(settings)
  })

  ipcMain.handle('settings:global:getBadgeOrder', (): BadgeType[] => {
    return globalSettingsService.getBadgeOrder()
  })

  ipcMain.handle('settings:global:updateBadgeOrder', (_, order: BadgeType[]): BadgeType[] => {
    validateParams('settings:global:updateBadgeOrder').array(order, 'order').validate()
    return globalSettingsService.updateBadgeOrder(order)
  })

  ipcMain.handle('settings:global:getSidebarBadgeVisibility', (): SidebarBadgeVisibility => {
    return globalSettingsService.getSidebarBadgeVisibility()
  })

  ipcMain.handle('settings:global:updateSidebarBadgeVisibility', (_, settings: Partial<SidebarBadgeVisibility>): SidebarBadgeVisibility => {
    validateParams('settings:global:updateSidebarBadgeVisibility').object(settings, 'settings').validate()
    return globalSettingsService.updateSidebarBadgeVisibility(settings)
  })

  ipcMain.handle('settings:global:getSidebarBadgeOrder', (): string[] => {
    return globalSettingsService.getSidebarBadgeOrder()
  })

  ipcMain.handle('settings:global:updateSidebarBadgeOrder', (_, order: string[]): string[] => {
    validateParams('settings:global:updateSidebarBadgeOrder').stringArray(order, 'order').validate()
    return globalSettingsService.updateSidebarBadgeOrder(order)
  })

  ipcMain.handle('settings:global:getShowHiddenFiles', (): boolean => {
    return globalSettingsService.getShowHiddenFiles()
  })

  ipcMain.handle('settings:global:setShowHiddenFiles', (_, value: boolean): void => {
    validateParams('settings:global:setShowHiddenFiles').boolean(value, 'value').validate()
    globalSettingsService.setShowHiddenFiles(value)
  })

  // ============================================
  // API Key（加密存储，部分 Linux 发行版可能不支持加密）
  // ============================================

  ipcMain.handle('settings:global:getApiKey', (_, keyName: string): string | null => {
    validateParams('settings:global:getApiKey').nonEmptyString(keyName, 'keyName').validate()
    return globalSettingsService.getApiKey(keyName)
  })

  ipcMain.handle('settings:global:setApiKey', (_, keyName: string, value: string) => {
    validateParams('settings:global:setApiKey').nonEmptyString(keyName, 'keyName').string(value, 'value').validate()
    globalSettingsService.setApiKey(keyName, value)
  })

  ipcMain.handle('settings:global:deleteApiKey', (_, keyName: string) => {
    validateParams('settings:global:deleteApiKey').nonEmptyString(keyName, 'keyName').validate()
    globalSettingsService.deleteApiKey(keyName)
  })

  ipcMain.handle('settings:global:getApiKeyNames', (): string[] => {
    return globalSettingsService.getApiKeyNames()
  })

  ipcMain.handle('settings:global:isEncryptionAvailable', (): boolean => {
    return globalSettingsService.isEncryptionAvailable()
  })

  // ============================================
  // 项目设置（存储在项目目录，便于版本控制和团队共享）
  // 前置条件：必须先打开项目
  // ============================================

  ipcMain.handle('settings:project:getAll', (): ProjectSettings => {
    return projectSettingsService.getAll()
  })

  ipcMain.handle('settings:project:update', (_, settings: Partial<ProjectSettings>): ProjectSettings => {
    validateParams('settings:project:update').object(settings, 'settings').validate()
    return projectSettingsService.update(settings)
  })

  ipcMain.handle('settings:project:saveNow', () => {
    projectSettingsService.saveNow()
  })

  ipcMain.handle('settings:project:reset', (): ProjectSettings => {
    return projectSettingsService.reset()
  })

  ipcMain.handle('settings:project:getEditor', () => {
    return projectSettingsService.getEditorSettings()
  })

  ipcMain.handle('settings:project:updateEditor', (_, settings) => {
    validateParams('settings:project:updateEditor').object(settings, 'settings').validate()
    return projectSettingsService.updateEditorSettings(settings)
  })

  ipcMain.handle('settings:project:getHighlight', () => {
    return projectSettingsService.getHighlightSettings()
  })

  ipcMain.handle('settings:project:updateHighlight', (_, settings) => {
    validateParams('settings:project:updateHighlight').object(settings, 'settings').validate()
    return projectSettingsService.updateHighlightSettings(settings)
  })

  ipcMain.handle('settings:project:getBackup', () => {
    return projectSettingsService.getBackupSettings()
  })

  ipcMain.handle('settings:project:updateBackup', (_, settings) => {
    validateParams('settings:project:updateBackup').object(settings, 'settings').validate()
    return projectSettingsService.updateBackupSettings(settings)
  })

  ipcMain.handle('settings:project:getExpandedFolders', (): string[] | null => {
    return projectSettingsService.getExpandedFolders()
  })

  ipcMain.handle('settings:project:setExpandedFolders', (_, folders: string[]): void => {
    validateParams('settings:project:setExpandedFolders').stringArray(folders, 'folders').validate()
    projectSettingsService.setExpandedFolders(folders)
  })

  ipcMain.handle('settings:project:getHiddenItems', (): string[] => {
    return projectSettingsService.getHiddenItems()
  })

  ipcMain.handle('settings:project:setHiddenItems', (_, items: string[]): void => {
    validateParams('settings:project:setHiddenItems').stringArray(items, 'items').validate()
    projectSettingsService.setHiddenItems(items)
  })

  // ============================================
  // 备份管理
  // 存储位置：.novelhelper/backups/
  // 格式：.nhbak（ZIP 压缩包）
  // 恢复时完全覆盖项目文件
  // ============================================

  ipcMain.handle('backup:create', async (): Promise<string | null> => {
    return backupService.createBackup()
  })

  ipcMain.handle('backup:list', () => {
    return backupService.listBackups()
  })

  ipcMain.handle('backup:restore', async (_, filename: string): Promise<boolean> => {
    validateParams('backup:restore').nonEmptyString(filename, 'filename').validate()
    return backupService.restoreBackup(filename)
  })

  ipcMain.handle('backup:delete', (_, filename: string): boolean => {
    validateParams('backup:delete').nonEmptyString(filename, 'filename').validate()
    return backupService.deleteBackup(filename)
  })

  ipcMain.handle('backup:export', async (_, filename: string): Promise<string | null> => {
    validateParams('backup:export').nonEmptyString(filename, 'filename').validate()
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
    'settings:global:getLayout',
    'settings:global:updateLayout',
    'settings:global:getBadgeVisibility',
    'settings:global:updateBadgeVisibility',
    'settings:global:getBadgeOrder',
    'settings:global:updateBadgeOrder',
    'settings:global:getSidebarBadgeVisibility',
    'settings:global:updateSidebarBadgeVisibility',
    'settings:global:getSidebarBadgeOrder',
    'settings:global:updateSidebarBadgeOrder',
    'settings:global:getShowHiddenFiles',
    'settings:global:setShowHiddenFiles',
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
    'settings:project:getExpandedFolders',
    'settings:project:setExpandedFolders',
    'settings:project:getHiddenItems',
    'settings:project:setHiddenItems',
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
