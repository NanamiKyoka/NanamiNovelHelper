/**
 * 组织架构图相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import { organizationService } from '../services/organization'
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
    return organizationService.getGraphList()
  })

  // 获取单个组织架构图
  ipcMain.handle('organization:get', (_, graphId: string): OrganizationGraph | null => {
    return organizationService.getGraph(graphId)
  })

  // 创建组织架构图
  ipcMain.handle('organization:create', (_, options: CreateOrganizationGraphOptions): OrganizationGraph => {
    return organizationService.createGraph(options)
  })

  // 更新组织架构图
  ipcMain.handle('organization:update', (_, graphId: string, updates: UpdateOrganizationGraphOptions): OrganizationGraph | null => {
    return organizationService.updateGraph(graphId, updates)
  })

  // 删除组织架构图
  ipcMain.handle('organization:delete', (_, graphId: string): boolean => {
    return organizationService.deleteGraph(graphId)
  })

  // ============================================
  // 节点管理
  // ============================================

  // 添加节点
  ipcMain.handle('organization:addNode', (_, graphId: string, options: CreateOrganizationNodeOptions): OrganizationNode | null => {
    return organizationService.addNode(graphId, options)
  })

  // 更新节点
  ipcMain.handle('organization:updateNode', (_, graphId: string, nodeId: string, updates: UpdateOrganizationNodeOptions): OrganizationNode | null => {
    return organizationService.updateNode(graphId, nodeId, updates)
  })

  // 删除节点
  ipcMain.handle('organization:deleteNode', (_, graphId: string, nodeId: string): boolean => {
    return organizationService.deleteNode(graphId, nodeId)
  })

  // 移动节点
  ipcMain.handle('organization:moveNode', (_, graphId: string, nodeId: string, newParentId: string | undefined): OrganizationNode | null => {
    return organizationService.moveNode(graphId, nodeId, newParentId)
  })

  // 获取子节点
  ipcMain.handle('organization:getChildren', (_, graphId: string, parentId: string | undefined): OrganizationNode[] => {
    return organizationService.getChildren(graphId, parentId)
  })

  // 获取子孙节点
  ipcMain.handle('organization:getDescendants', (_, graphId: string, nodeId: string): OrganizationNode[] => {
    return organizationService.getDescendants(graphId, nodeId)
  })

  // 获取祖先节点
  ipcMain.handle('organization:getAncestors', (_, graphId: string, nodeId: string): OrganizationNode[] => {
    return organizationService.getAncestors(graphId, nodeId)
  })

  // ============================================
  // 缩略图
  // ============================================

  // 保存缩略图
  ipcMain.handle('organization:saveThumbnail', (_, graphId: string, dataUrl: string): string | null => {
    return organizationService.saveThumbnail(graphId, dataUrl)
  })

  // 获取缩略图路径
  ipcMain.handle('organization:getThumbnailPath', (_, graphId: string): string | null => {
    return organizationService.getThumbnailPath_(graphId)
  })

  // ============================================
  // 导入导出
  // ============================================

  // 导出组织架构图
  ipcMain.handle('organization:export', (_, graphId: string): string | null => {
    return organizationService.exportGraph(graphId)
  })

  // 导入组织架构图
  ipcMain.handle('organization:import', (_, jsonContent: string): OrganizationGraph | null => {
    return organizationService.importGraph(jsonContent)
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
}
