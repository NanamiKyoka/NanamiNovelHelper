/**
 * 关系图相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import { relationshipService } from '../services/relationship'
import type {
  RelationshipGraph,
  RelationshipGraphMeta,
  RelationshipNode,
  RelationshipEdge,
  RelationType,
  CreateRelationshipGraphOptions,
  UpdateRelationshipGraphOptions
} from '../types/relationship'

/**
 * 注册关系图相关 IPC 处理器
 */
export function registerRelationshipHandlers(): void {
  // ============================================
  // 关系图管理
  // ============================================

  // 获取关系图列表
  ipcMain.handle('relationship:getList', (): RelationshipGraphMeta[] => {
    return relationshipService.getGraphList()
  })

  // 获取单个关系图
  ipcMain.handle('relationship:get', (_, graphId: string): RelationshipGraph | null => {
    return relationshipService.getGraph(graphId)
  })

  // 创建关系图
  ipcMain.handle('relationship:create', (_, options: CreateRelationshipGraphOptions): RelationshipGraph => {
    return relationshipService.createGraph(options)
  })

  // 更新关系图
  ipcMain.handle('relationship:update', (_, graphId: string, updates: UpdateRelationshipGraphOptions): RelationshipGraph | null => {
    return relationshipService.updateGraph(graphId, updates)
  })

  // 删除关系图
  ipcMain.handle('relationship:delete', (_, graphId: string): boolean => {
    return relationshipService.deleteGraph(graphId)
  })

  // ============================================
  // 节点管理
  // ============================================

  // 添加节点
  ipcMain.handle('relationship:addNode', (_, graphId: string, node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>): RelationshipNode | null => {
    return relationshipService.addNode(graphId, node)
  })

  // 更新节点
  ipcMain.handle('relationship:updateNode', (_, graphId: string, nodeId: string, updates: Partial<RelationshipNode>): RelationshipNode | null => {
    return relationshipService.updateNode(graphId, nodeId, updates)
  })

  // 删除节点
  ipcMain.handle('relationship:deleteNode', (_, graphId: string, nodeId: string): boolean => {
    return relationshipService.deleteNode(graphId, nodeId)
  })

  // ============================================
  // 边管理
  // ============================================

  // 添加边
  ipcMain.handle('relationship:addEdge', (_, graphId: string, edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>): RelationshipEdge | null => {
    return relationshipService.addEdge(graphId, edge)
  })

  // 更新边
  ipcMain.handle('relationship:updateEdge', (_, graphId: string, edgeId: string, updates: Partial<RelationshipEdge>): RelationshipEdge | null => {
    return relationshipService.updateEdge(graphId, edgeId, updates)
  })

  // 删除边
  ipcMain.handle('relationship:deleteEdge', (_, graphId: string, edgeId: string): boolean => {
    return relationshipService.deleteEdge(graphId, edgeId)
  })

  // ============================================
  // 关系类型管理
  // ============================================

  // 获取关系类型
  ipcMain.handle('relationship:getRelationTypes', (_, graphId: string): RelationType[] => {
    return relationshipService.getRelationTypes(graphId)
  })

  // 添加自定义关系类型
  ipcMain.handle('relationship:addRelationType', (_, graphId: string, type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>): RelationType | null => {
    return relationshipService.addCustomRelationType(graphId, type)
  })

  // 更新自定义关系类型
  ipcMain.handle('relationship:updateRelationType', (_, graphId: string, typeId: string, updates: Partial<RelationType>): RelationType | null => {
    return relationshipService.updateCustomRelationType(graphId, typeId, updates)
  })

  // 删除自定义关系类型
  ipcMain.handle('relationship:deleteRelationType', (_, graphId: string, typeId: string): boolean => {
    return relationshipService.deleteCustomRelationType(graphId, typeId)
  })

  // ============================================
  // 缩略图
  // ============================================

  // 保存缩略图
  ipcMain.handle('relationship:saveThumbnail', (_, graphId: string, dataUrl: string): string | null => {
    return relationshipService.saveThumbnail(graphId, dataUrl)
  })

  // 获取缩略图路径
  ipcMain.handle('relationship:getThumbnailPath', (_, graphId: string): string | null => {
    return relationshipService.getThumbnailPath_(graphId)
  })

  // ============================================
  // 导入导出
  // ============================================

  // 导出关系图
  ipcMain.handle('relationship:export', (_, graphId: string): string | null => {
    return relationshipService.exportGraph(graphId)
  })

  // 导入关系图
  ipcMain.handle('relationship:import', (_, jsonContent: string): RelationshipGraph | null => {
    return relationshipService.importGraph(jsonContent)
  })

  // 显示导出对话框
  ipcMain.handle('relationship:showExportDialog', async (_, graphName: string): Promise<string | null> => {
    const result = await dialog.showSaveDialog({
      title: '导出关系图',
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
  ipcMain.handle('relationship:showImportDialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: '导入关系图',
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
