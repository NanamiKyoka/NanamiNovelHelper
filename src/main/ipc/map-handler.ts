/**
 * 地图相关 IPC 处理器
 * 
 * 新版：支持多边形板块、连接、标注
 */

import { ipcMain, dialog } from 'electron'
import { mapService } from '../services/map'
import type {
  Map,
  MapMeta,
  CreateMapOptions,
  UpdateMapOptions
} from '../types/map'

/**
 * 注册地图相关 IPC 处理器
 */
export function registerMapHandlers(): void {
  // ============================================
  // 地图管理
  // ============================================

  // 获取地图列表
  ipcMain.handle('map:getList', (): MapMeta[] => {
    return mapService.getList()
  })

  // 获取单个地图
  ipcMain.handle('map:get', (_, mapId: string): Map | null => {
    return mapService.get(mapId)
  })

  // 创建地图
  ipcMain.handle('map:create', (_, options: CreateMapOptions): Map => {
    return mapService.createMap(options)
  })

  // 更新地图
  ipcMain.handle('map:update', (_, mapId: string, updates: UpdateMapOptions): Map | null => {
    return mapService.updateMap(mapId, updates)
  })

  // 删除地图
  ipcMain.handle('map:delete', (_, mapId: string): boolean => {
    return mapService.delete(mapId)
  })

  // ============================================
  // 缩略图
  // ============================================

  // 保存缩略图
  ipcMain.handle('map:saveThumbnail', (_, mapId: string, dataUrl: string): string | null => {
    return mapService.saveThumbnail(mapId, dataUrl)
  })

  // 获取缩略图路径
  ipcMain.handle('map:getThumbnailPath', (_, mapId: string): string | null => {
    return mapService.getThumbnailFullPath(mapId)
  })

  // ============================================
  // 导入导出
  // ============================================

  // 导出地图
  ipcMain.handle('map:export', (_, mapId: string): string | null => {
    return mapService.exportItem(mapId)
  })

  // 导入地图
  ipcMain.handle('map:import', (_, jsonContent: string): Map | null => {
    return mapService.importItem(jsonContent)
  })

  // 显示导出对话框
  ipcMain.handle('map:showExportDialog', async (_, mapName: string): Promise<string | null> => {
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

  // 显示导入对话框
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

  // 重新排序地图
  ipcMain.handle('map:reorderMaps', (_, mapIds: string[]): boolean => {
    return mapService.reorderMaps(mapIds)
  })
}