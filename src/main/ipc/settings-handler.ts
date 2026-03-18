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
import type { GlobalSettings, ProjectSettings, BadgeVisibility, BadgeType, SidebarBadgeVisibility } from '../types/settings'

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
    return globalSettingsService.update(settings)
  })

  ipcMain.handle('settings:global:reset', (): GlobalSettings => {
    return globalSettingsService.reset()
  })

  ipcMain.handle('settings:global:getTheme', () => {
    return globalSettingsService.getTheme()
  })

  ipcMain.handle('settings:global:updateTheme', (_, theme) => {
    return globalSettingsService.updateTheme(theme)
  })

  ipcMain.handle('settings:global:getWindowState', () => {
    return globalSettingsService.getWindowState()
  })

  ipcMain.handle('settings:global:updateWindowState', (_, state) => {
    return globalSettingsService.updateWindowState(state)
  })

  ipcMain.handle('settings:global:getLanguage', () => {
    return globalSettingsService.getLanguage()
  })

  ipcMain.handle('settings:global:setLanguage', (_, language) => {
    globalSettingsService.setLanguage(language)
  })

  ipcMain.handle('settings:global:getSidebarWidth', () => {
    return globalSettingsService.getSidebarWidth()
  })

  ipcMain.handle('settings:global:setSidebarWidth', (_, width: number) => {
    globalSettingsService.setSidebarWidth(width)
  })

  // ============================================
  // API Key（加密存储，部分 Linux 发行版可能不支持加密）
  // ============================================

  ipcMain.handle('settings:global:getApiKey', (_, keyName: string): string | null => {
    return globalSettingsService.getApiKey(keyName)
  })

  ipcMain.handle('settings:global:setApiKey', (_, keyName: string, value: string) => {
    globalSettingsService.setApiKey(keyName, value)
  })

  ipcMain.handle('settings:global:deleteApiKey', (_, keyName: string) => {
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
    return projectSettingsService.updateEditorSettings(settings)
  })

  ipcMain.handle('settings:project:getHighlight', () => {
    return projectSettingsService.getHighlightSettings()
  })

  ipcMain.handle('settings:project:updateHighlight', (_, settings) => {
    return projectSettingsService.updateHighlightSettings(settings)
  })

  ipcMain.handle('settings:project:getBackup', () => {
    return projectSettingsService.getBackupSettings()
  })

  ipcMain.handle('settings:project:updateBackup', (_, settings) => {
    return projectSettingsService.updateBackupSettings(settings)
  })

  ipcMain.handle('settings:project:getBadgeVisibility', (): BadgeVisibility => {
    return projectSettingsService.getBadgeVisibility()
  })

  ipcMain.handle('settings:project:updateBadgeVisibility', (_, settings: Partial<BadgeVisibility>): BadgeVisibility => {
    return projectSettingsService.updateBadgeVisibility(settings)
  })

  ipcMain.handle('settings:project:getBadgeOrder', (): BadgeType[] => {
    return projectSettingsService.getBadgeOrder()
  })

  ipcMain.handle('settings:project:updateBadgeOrder', (_, order: BadgeType[]): BadgeType[] => {
    return projectSettingsService.updateBadgeOrder(order)
  })

  ipcMain.handle('settings:project:getSidebarBadgeVisibility', (): SidebarBadgeVisibility => {
    return projectSettingsService.getSidebarBadgeVisibility()
  })

  ipcMain.handle('settings:project:updateSidebarBadgeVisibility', (_, settings: Partial<SidebarBadgeVisibility>): SidebarBadgeVisibility => {
    return projectSettingsService.updateSidebarBadgeVisibility(settings)
  })

  ipcMain.handle('settings:project:getSidebarBadgeOrder', (): string[] => {
    return projectSettingsService.getSidebarBadgeOrder()
  })

  ipcMain.handle('settings:project:setSidebarBadgeOrder', (_, order: string[]): string[] => {
    return projectSettingsService.setSidebarBadgeOrder(order)
  })

  ipcMain.handle('settings:project:getShowHiddenFiles', (): boolean => {
    return projectSettingsService.getShowHiddenFiles()
  })

  ipcMain.handle('settings:project:setShowHiddenFiles', (_, value: boolean): void => {
    projectSettingsService.setShowHiddenFiles(value)
  })

  ipcMain.handle('settings:project:getExpandedFolders', (): string[] => {
    return projectSettingsService.getExpandedFolders()
  })

  ipcMain.handle('settings:project:setExpandedFolders', (_, folders: string[]): void => {
    projectSettingsService.setExpandedFolders(folders)
  })

  ipcMain.handle('settings:project:getHiddenItems', (): string[] => {
    return projectSettingsService.getHiddenItems()
  })

  ipcMain.handle('settings:project:setHiddenItems', (_, items: string[]): void => {
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
    return backupService.restoreBackup(filename)
  })

  ipcMain.handle('backup:delete', (_, filename: string): boolean => {
    return backupService.deleteBackup(filename)
  })

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
    'settings:project:getSidebarBadgeVisibility',
    'settings:project:updateSidebarBadgeVisibility',
    'settings:project:getSidebarBadgeOrder',
    'settings:project:setSidebarBadgeOrder',
    'settings:project:getShowHiddenFiles',
    'settings:project:setShowHiddenFiles',
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
