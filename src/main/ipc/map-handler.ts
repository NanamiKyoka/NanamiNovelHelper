/**
 * 地图相关 IPC 处理器
 *
 * 新版：支持多边形板块、连接、标注
 */

import { ipcMain, dialog } from 'electron'
import { mapService } from '../services/map'
import { validateParams } from '../utils/validation'
import type { Map, MapMeta, CreateMapOptions, UpdateMapOptions } from '../types/map'

export function registerMapHandlers(): void {
  // ============================================
  // 地图管理
  // ============================================

  ipcMain.handle('map:getList', (): MapMeta[] => {
    return mapService.getList()
  })

  ipcMain.handle('map:get', (_, mapId: string): Map | null => {
    validateParams('map:get').nonEmptyString(mapId, 'mapId').validate()
    return mapService.get(mapId)
  })

  ipcMain.handle('map:create', (_, options: CreateMapOptions): Map => {
    validateParams('map:create')
      .object(options, 'options')
      .nonEmptyString((options as Record<string, unknown>).name as string, 'options.name')
      .validate()
    return mapService.createMap(options)
  })

  ipcMain.handle('map:update', (_, mapId: string, updates: UpdateMapOptions): Map | null => {
    validateParams('map:update')
      .nonEmptyString(mapId, 'mapId')
      .object(updates, 'updates')
      .validate()
    return mapService.updateMap(mapId, updates)
  })

  ipcMain.handle('map:delete', (_, mapId: string): boolean => {
    validateParams('map:delete').nonEmptyString(mapId, 'mapId').validate()
    return mapService.delete(mapId)
  })

  // ============================================
  // 缩略图
  // ============================================

  ipcMain.handle('map:saveThumbnail', (_, mapId: string, dataUrl: string): string | null => {
    validateParams('map:saveThumbnail')
      .nonEmptyString(mapId, 'mapId')
      .nonEmptyString(dataUrl, 'dataUrl')
      .validate()
    return mapService.saveThumbnail(mapId, dataUrl)
  })

  ipcMain.handle('map:getThumbnailPath', (_, mapId: string): string | null => {
    validateParams('map:getThumbnailPath').nonEmptyString(mapId, 'mapId').validate()
    return mapService.getThumbnailFullPath(mapId)
  })

  // ============================================
  // 导入导出
  // ============================================

  ipcMain.handle('map:export', (_, mapId: string): string | null => {
    validateParams('map:export').nonEmptyString(mapId, 'mapId').validate()
    return mapService.exportItem(mapId)
  })

  ipcMain.handle('map:import', (_, jsonContent: string): Map | null => {
    validateParams('map:import').nonEmptyString(jsonContent, 'jsonContent').validate()
    return mapService.importItem(jsonContent)
  })

  ipcMain.handle('map:showExportDialog', async (_, mapName: string): Promise<string | null> => {
    validateParams('map:showExportDialog').nonEmptyString(mapName, 'mapName').validate()
    const result = await dialog.showSaveDialog({
      title: '导出地图',
      defaultPath: `${mapName}.json5`,
      filters: [
        { name: 'JSON5 文件', extensions: ['json5'] },
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePath
  })

  ipcMain.handle('map:showImportDialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: '导入地图',
      filters: [
        { name: 'JSON5 文件', extensions: ['json5'] },
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('map:reorderMaps', (_, mapIds: string[]): boolean => {
    validateParams('map:reorderMaps').stringArray(mapIds, 'mapIds').validate()
    return mapService.reorderMaps(mapIds)
  })
}
