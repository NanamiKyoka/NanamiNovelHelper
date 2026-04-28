/**
 * 关系图相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import { relationshipService } from '../services/relationship'
import { validateParams } from '../utils/validation'
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
    return relationshipService.getList()
  })

  // 获取单个关系图
  ipcMain.handle('relationship:get', (_, graphId: string): RelationshipGraph | null => {
    validateParams('relationship:get').nonEmptyString(graphId, 'graphId').validate()
    return relationshipService.get(graphId)
  })

  ipcMain.handle(
    'relationship:create',
    (_, options: CreateRelationshipGraphOptions): RelationshipGraph => {
      validateParams('relationship:create')
        .object(options, 'options')
        .nonEmptyString((options as Record<string, unknown>).name as string, 'options.name')
        .validate()
      return relationshipService.createGraph(options)
    }
  )

  ipcMain.handle(
    'relationship:update',
    (_, graphId: string, updates: UpdateRelationshipGraphOptions): RelationshipGraph | null => {
      validateParams('relationship:update')
        .nonEmptyString(graphId, 'graphId')
        .object(updates, 'updates')
        .validate()
      return relationshipService.updateGraph(graphId, updates)
    }
  )

  ipcMain.handle('relationship:delete', (_, graphId: string): boolean => {
    validateParams('relationship:delete').nonEmptyString(graphId, 'graphId').validate()
    return relationshipService.delete(graphId)
  })

  // ============================================
  // 节点管理
  // ============================================

  // 添加节点
  ipcMain.handle(
    'relationship:addNode',
    (
      _,
      graphId: string,
      node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>
    ): RelationshipNode | null => {
      validateParams('relationship:addNode')
        .nonEmptyString(graphId, 'graphId')
        .object(node, 'node')
        .validate()
      return relationshipService.addNode(graphId, node)
    }
  )

  ipcMain.handle(
    'relationship:updateNode',
    (
      _,
      graphId: string,
      nodeId: string,
      updates: Partial<RelationshipNode>
    ): RelationshipNode | null => {
      validateParams('relationship:updateNode')
        .nonEmptyString(graphId, 'graphId')
        .nonEmptyString(nodeId, 'nodeId')
        .object(updates, 'updates')
        .validate()
      return relationshipService.updateNode(graphId, nodeId, updates)
    }
  )

  ipcMain.handle('relationship:deleteNode', (_, graphId: string, nodeId: string): boolean => {
    validateParams('relationship:deleteNode')
      .nonEmptyString(graphId, 'graphId')
      .nonEmptyString(nodeId, 'nodeId')
      .validate()
    return relationshipService.deleteNode(graphId, nodeId)
  })

  // ============================================
  // 边管理
  // ============================================

  // 添加边
  ipcMain.handle(
    'relationship:addEdge',
    (
      _,
      graphId: string,
      edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>
    ): RelationshipEdge | null => {
      validateParams('relationship:addEdge')
        .nonEmptyString(graphId, 'graphId')
        .object(edge, 'edge')
        .validate()
      return relationshipService.addEdge(graphId, edge)
    }
  )

  ipcMain.handle(
    'relationship:updateEdge',
    (
      _,
      graphId: string,
      edgeId: string,
      updates: Partial<RelationshipEdge>
    ): RelationshipEdge | null => {
      validateParams('relationship:updateEdge')
        .nonEmptyString(graphId, 'graphId')
        .nonEmptyString(edgeId, 'edgeId')
        .object(updates, 'updates')
        .validate()
      return relationshipService.updateEdge(graphId, edgeId, updates)
    }
  )

  ipcMain.handle('relationship:deleteEdge', (_, graphId: string, edgeId: string): boolean => {
    validateParams('relationship:deleteEdge')
      .nonEmptyString(graphId, 'graphId')
      .nonEmptyString(edgeId, 'edgeId')
      .validate()
    return relationshipService.deleteEdge(graphId, edgeId)
  })

  // ============================================
  // 关系类型管理
  // ============================================

  // 获取关系类型
  ipcMain.handle('relationship:getRelationTypes', (_, graphId: string): RelationType[] => {
    validateParams('relationship:getRelationTypes').nonEmptyString(graphId, 'graphId').validate()
    return relationshipService.getRelationTypes(graphId)
  })

  ipcMain.handle(
    'relationship:addRelationType',
    (
      _,
      graphId: string,
      type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>
    ): RelationType | null => {
      validateParams('relationship:addRelationType')
        .nonEmptyString(graphId, 'graphId')
        .object(type, 'type')
        .validate()
      return relationshipService.addCustomRelationType(graphId, type)
    }
  )

  ipcMain.handle(
    'relationship:updateRelationType',
    (_, graphId: string, typeId: string, updates: Partial<RelationType>): RelationType | null => {
      validateParams('relationship:updateRelationType')
        .nonEmptyString(graphId, 'graphId')
        .nonEmptyString(typeId, 'typeId')
        .object(updates, 'updates')
        .validate()
      return relationshipService.updateCustomRelationType(graphId, typeId, updates)
    }
  )

  ipcMain.handle(
    'relationship:deleteRelationType',
    (_, graphId: string, typeId: string): boolean => {
      validateParams('relationship:deleteRelationType')
        .nonEmptyString(graphId, 'graphId')
        .nonEmptyString(typeId, 'typeId')
        .validate()
      return relationshipService.deleteCustomRelationType(graphId, typeId)
    }
  )

  // ============================================
  // 缩略图
  // ============================================

  // 保存缩略图
  ipcMain.handle(
    'relationship:saveThumbnail',
    (_, graphId: string, dataUrl: string): string | null => {
      validateParams('relationship:saveThumbnail')
        .nonEmptyString(graphId, 'graphId')
        .nonEmptyString(dataUrl, 'dataUrl')
        .validate()
      return relationshipService.saveThumbnail(graphId, dataUrl)
    }
  )

  ipcMain.handle('relationship:getThumbnailPath', (_, graphId: string): string | null => {
    validateParams('relationship:getThumbnailPath').nonEmptyString(graphId, 'graphId').validate()
    return relationshipService.getThumbnailFullPath(graphId)
  })

  // ============================================
  // 导入导出
  // ============================================

  // 导出关系图
  ipcMain.handle('relationship:export', (_, graphId: string): string | null => {
    validateParams('relationship:export').nonEmptyString(graphId, 'graphId').validate()
    return relationshipService.exportItem(graphId)
  })

  ipcMain.handle('relationship:import', (_, jsonContent: string): RelationshipGraph | null => {
    validateParams('relationship:import').nonEmptyString(jsonContent, 'jsonContent').validate()
    return relationshipService.importItem(jsonContent)
  })

  // 显示导出对话框
  ipcMain.handle(
    'relationship:showExportDialog',
    async (_, graphName: string): Promise<string | null> => {
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
    }
  )

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

  // 重新排序关系图
  ipcMain.handle('relationship:reorderGraphs', (_, graphIds: string[]): boolean => {
    validateParams('relationship:reorderGraphs').stringArray(graphIds, 'graphIds').validate()
    return relationshipService.reorderGraphs(graphIds)
  })
}
