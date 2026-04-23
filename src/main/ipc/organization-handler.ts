/**
 * 组织架构图相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import { organizationService } from '../services/organization'
import { validateParams } from '../utils/validation'
import type {
  OrganizationGraph,
  OrganizationGraphMeta,
  OrganizationNode,
  CreateOrganizationGraphOptions,
  UpdateOrganizationGraphOptions,
  CreateOrganizationNodeOptions,
  UpdateOrganizationNodeOptions
} from '../types/organization'

/**
 * 注册组织架构图相关 IPC 处理器
 */
export function registerOrganizationHandlers(): void {
  // ============================================
  // 组织架构图管理
  // ============================================

  // 获取组织架构图列表
  ipcMain.handle('organization:getList', (): OrganizationGraphMeta[] => {
    return organizationService.getList()
  })

  // 获取单个组织架构图
  ipcMain.handle('organization:get', (_, graphId: string): OrganizationGraph | null => {
    validateParams('organization:get').nonEmptyString(graphId, 'graphId').validate()
    return organizationService.get(graphId)
  })

  ipcMain.handle('organization:create', (_, options: CreateOrganizationGraphOptions): OrganizationGraph => {
    validateParams('organization:create')
      .object(options, 'options')
      .nonEmptyString((options as Record<string, unknown>).name as string, 'options.name')
      .validate()
    return organizationService.createGraph(options)
  })

  ipcMain.handle('organization:update', (_, graphId: string, updates: UpdateOrganizationGraphOptions): OrganizationGraph | null => {
    validateParams('organization:update').nonEmptyString(graphId, 'graphId').object(updates, 'updates').validate()
    return organizationService.updateGraph(graphId, updates)
  })

  ipcMain.handle('organization:delete', (_, graphId: string): boolean => {
    validateParams('organization:delete').nonEmptyString(graphId, 'graphId').validate()
    return organizationService.delete(graphId)
  })

  // ============================================
  // 节点管理
  // ============================================

  // 添加节点
  ipcMain.handle('organization:addNode', (_, graphId: string, options: CreateOrganizationNodeOptions): OrganizationNode | null => {
    validateParams('organization:addNode').nonEmptyString(graphId, 'graphId').object(options, 'options').validate()
    return organizationService.addNode(graphId, options)
  })

  ipcMain.handle('organization:updateNode', (_, graphId: string, nodeId: string, updates: UpdateOrganizationNodeOptions): OrganizationNode | null => {
    validateParams('organization:updateNode').nonEmptyString(graphId, 'graphId').nonEmptyString(nodeId, 'nodeId').object(updates, 'updates').validate()
    return organizationService.updateNode(graphId, nodeId, updates)
  })

  ipcMain.handle('organization:deleteNode', (_, graphId: string, nodeId: string): boolean => {
    validateParams('organization:deleteNode').nonEmptyString(graphId, 'graphId').nonEmptyString(nodeId, 'nodeId').validate()
    return organizationService.deleteNode(graphId, nodeId)
  })

  ipcMain.handle('organization:moveNode', (_, graphId: string, nodeId: string, newParentId: string | undefined): OrganizationNode | null => {
    validateParams('organization:moveNode').nonEmptyString(graphId, 'graphId').nonEmptyString(nodeId, 'nodeId').validate()
    return organizationService.moveNode(graphId, nodeId, newParentId)
  })

  ipcMain.handle('organization:getChildren', (_, graphId: string, parentId: string | undefined): OrganizationNode[] => {
    validateParams('organization:getChildren').nonEmptyString(graphId, 'graphId').validate()
    return organizationService.getChildren(graphId, parentId)
  })

  ipcMain.handle('organization:getDescendants', (_, graphId: string, nodeId: string): OrganizationNode[] => {
    validateParams('organization:getDescendants').nonEmptyString(graphId, 'graphId').nonEmptyString(nodeId, 'nodeId').validate()
    return organizationService.getDescendants(graphId, nodeId)
  })

  ipcMain.handle('organization:getAncestors', (_, graphId: string, nodeId: string): OrganizationNode[] => {
    validateParams('organization:getAncestors').nonEmptyString(graphId, 'graphId').nonEmptyString(nodeId, 'nodeId').validate()
    return organizationService.getAncestors(graphId, nodeId)
  })

  // ============================================
  // 缩略图
  // ============================================

  // 保存缩略图
  ipcMain.handle('organization:saveThumbnail', (_, graphId: string, dataUrl: string): string | null => {
    validateParams('organization:saveThumbnail').nonEmptyString(graphId, 'graphId').nonEmptyString(dataUrl, 'dataUrl').validate()
    return organizationService.saveThumbnail(graphId, dataUrl)
  })

  ipcMain.handle('organization:getThumbnailPath', (_, graphId: string): string | null => {
    validateParams('organization:getThumbnailPath').nonEmptyString(graphId, 'graphId').validate()
    return organizationService.getThumbnailFullPath(graphId)
  })

  // ============================================
  // 导入导出
  // ============================================

  // 导出组织架构图
  ipcMain.handle('organization:export', (_, graphId: string): string | null => {
    validateParams('organization:export').nonEmptyString(graphId, 'graphId').validate()
    return organizationService.exportItem(graphId)
  })

  ipcMain.handle('organization:import', (_, jsonContent: string): OrganizationGraph | null => {
    validateParams('organization:import').nonEmptyString(jsonContent, 'jsonContent').validate()
    return organizationService.importItem(jsonContent)
  })

  // 显示导出对话框
  ipcMain.handle('organization:showExportDialog', async (_, graphName: string): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      title: '导出组织架构图',
      defaultPath: `${graphName}.json5`,
      filters: [
        { name: 'JSON5 文件', extensions: ['json5'] },
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePath
  })

  // 显示导入对话框
  ipcMain.handle('organization:showImportDialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: '导入组织架构图',
      filters: [
        { name: 'JSON5 文件', extensions: ['json5'] },
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 重新排序组织架构图列表
  ipcMain.handle('organization:reorderGraphs', (_, graphIds: string[]): boolean => {
    validateParams('organization:reorderGraphs').stringArray(graphIds, 'graphIds').validate()
    return organizationService.reorderGraphs(graphIds)
  })
}
