/**
 * 时间线相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { timelineService } from '../services/timeline'
import { validateParams } from '../utils/validation'
import type {
  Timeline,
  TimelineMeta,
  TimelineNode,
  CreateTimelineOptions,
  UpdateTimelineOptions
} from '../types/timeline'

/**
 * 注册时间线相关 IPC 处理器
 */
export function registerTimelineHandlers(): void {
  // ============================================
  // 时间线管理
  // ============================================

  // 获取时间线列表
  ipcMain.handle('timeline:getList', (): TimelineMeta[] => {
    return timelineService.getList()
  })

  // 获取单个时间线
  ipcMain.handle('timeline:get', (_, timelineId: string): Timeline | null => {
    validateParams('timeline:get').nonEmptyString(timelineId, 'timelineId').validate()
    return timelineService.get(timelineId)
  })

  ipcMain.handle('timeline:create', (_, options: CreateTimelineOptions): Timeline => {
    validateParams('timeline:create')
      .object(options, 'options')
      .nonEmptyString((options as Record<string, unknown>).name as string, 'options.name')
      .validate()
    return timelineService.createTimeline(options)
  })

  ipcMain.handle(
    'timeline:update',
    (_, timelineId: string, updates: UpdateTimelineOptions): Timeline | null => {
      validateParams('timeline:update')
        .nonEmptyString(timelineId, 'timelineId')
        .object(updates, 'updates')
        .validate()
      return timelineService.updateTimeline(timelineId, updates)
    }
  )

  ipcMain.handle('timeline:delete', (_, timelineId: string): boolean => {
    validateParams('timeline:delete').nonEmptyString(timelineId, 'timelineId').validate()
    return timelineService.delete(timelineId)
  })

  // ============================================
  // 节点管理
  // ============================================

  // 添加节点
  ipcMain.handle(
    'timeline:addNode',
    (
      _,
      timelineId: string,
      node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt' | 'order'>
    ): TimelineNode | null => {
      validateParams('timeline:addNode')
        .nonEmptyString(timelineId, 'timelineId')
        .object(node, 'node')
        .validate()
      return timelineService.addNode(timelineId, node)
    }
  )

  ipcMain.handle(
    'timeline:updateNode',
    (
      _,
      timelineId: string,
      nodeId: string,
      updates: Partial<TimelineNode>
    ): TimelineNode | null => {
      validateParams('timeline:updateNode')
        .nonEmptyString(timelineId, 'timelineId')
        .nonEmptyString(nodeId, 'nodeId')
        .object(updates, 'updates')
        .validate()
      return timelineService.updateNode(timelineId, nodeId, updates)
    }
  )

  ipcMain.handle('timeline:deleteNode', (_, timelineId: string, nodeId: string): boolean => {
    validateParams('timeline:deleteNode')
      .nonEmptyString(timelineId, 'timelineId')
      .nonEmptyString(nodeId, 'nodeId')
      .validate()
    return timelineService.deleteNode(timelineId, nodeId)
  })

  ipcMain.handle(
    'timeline:batchDeleteNodes',
    (_, timelineId: string, nodeIds: string[]): number => {
      validateParams('timeline:batchDeleteNodes')
        .nonEmptyString(timelineId, 'timelineId')
        .stringArray(nodeIds, 'nodeIds')
        .validate()
      return timelineService.batchDeleteNodes(timelineId, nodeIds)
    }
  )

  ipcMain.handle(
    'timeline:moveNode',
    (_, timelineId: string, nodeId: string, newOrder: number): TimelineNode[] | null => {
      validateParams('timeline:moveNode')
        .nonEmptyString(timelineId, 'timelineId')
        .nonEmptyString(nodeId, 'nodeId')
        .number(newOrder, 'newOrder')
        .validate()
      return timelineService.moveNode(timelineId, nodeId, newOrder)
    }
  )

  ipcMain.handle(
    'timeline:batchMoveNodes',
    (_, timelineId: string, nodeIds: string[], targetOrder: number): TimelineNode[] | null => {
      validateParams('timeline:batchMoveNodes')
        .nonEmptyString(timelineId, 'timelineId')
        .stringArray(nodeIds, 'nodeIds')
        .number(targetOrder, 'targetOrder')
        .validate()
      return timelineService.batchMoveNodes(timelineId, nodeIds, targetOrder)
    }
  )

  ipcMain.handle(
    'timeline:updateNodes',
    (_, timelineId: string, nodes: TimelineNode[]): Timeline | null => {
      validateParams('timeline:updateNodes')
        .nonEmptyString(timelineId, 'timelineId')
        .array(nodes, 'nodes')
        .validate()
      return timelineService.updateTimeline(timelineId, { nodes })
    }
  )

  // ============================================
  // 分支管理
  // ============================================

  // 创建分支时间线
  ipcMain.handle(
    'timeline:createBranch',
    (_, parentTimelineId: string, branchFromNodeId: string, name?: string): Timeline | null => {
      validateParams('timeline:createBranch')
        .nonEmptyString(parentTimelineId, 'parentTimelineId')
        .nonEmptyString(branchFromNodeId, 'branchFromNodeId')
        .validate()
      return timelineService.createBranchTimeline(parentTimelineId, branchFromNodeId, name)
    }
  )

  ipcMain.handle(
    'timeline:mergeBranch',
    (_, branchTimelineId: string, targetTimelineId: string, targetNodeId?: string): boolean => {
      validateParams('timeline:mergeBranch')
        .nonEmptyString(branchTimelineId, 'branchTimelineId')
        .nonEmptyString(targetTimelineId, 'targetTimelineId')
        .validate()
      return timelineService.mergeBranchTimeline(branchTimelineId, targetTimelineId, targetNodeId)
    }
  )

  ipcMain.handle('timeline:getBranches', (_, parentTimelineId: string): TimelineMeta[] => {
    validateParams('timeline:getBranches')
      .nonEmptyString(parentTimelineId, 'parentTimelineId')
      .validate()
    return timelineService.getBranchTimelines(parentTimelineId)
  })

  ipcMain.handle('timeline:getBranchSourceNode', (_, timelineId: string): TimelineNode | null => {
    validateParams('timeline:getBranchSourceNode')
      .nonEmptyString(timelineId, 'timelineId')
      .validate()
    return timelineService.getBranchSourceNode(timelineId)
  })

  // ============================================
  // 缩略图
  // ============================================

  // 保存缩略图
  ipcMain.handle(
    'timeline:saveThumbnail',
    (_, timelineId: string, dataUrl: string): string | null => {
      validateParams('timeline:saveThumbnail')
        .nonEmptyString(timelineId, 'timelineId')
        .nonEmptyString(dataUrl, 'dataUrl')
        .validate()
      return timelineService.saveThumbnail(timelineId, dataUrl)
    }
  )

  ipcMain.handle('timeline:getThumbnailPath', (_, timelineId: string): string | null => {
    validateParams('timeline:getThumbnailPath').nonEmptyString(timelineId, 'timelineId').validate()
    return timelineService.getThumbnailFullPath(timelineId)
  })

  // ============================================
  // 导入导出
  // ============================================

  // 导出时间线为 JSON5
  ipcMain.handle('timeline:export', (_, timelineId: string): string | null => {
    validateParams('timeline:export').nonEmptyString(timelineId, 'timelineId').validate()
    return timelineService.exportItem(timelineId)
  })

  ipcMain.handle('timeline:exportMarkdown', (_, timelineId: string): string | null => {
    validateParams('timeline:exportMarkdown').nonEmptyString(timelineId, 'timelineId').validate()
    return timelineService.exportTimelineAsMarkdown(timelineId)
  })

  ipcMain.handle('timeline:import', (_, jsonContent: string): Timeline | null => {
    validateParams('timeline:import').nonEmptyString(jsonContent, 'jsonContent').validate()
    return timelineService.importItem(jsonContent)
  })

  // 显示导出对话框
  ipcMain.handle(
    'timeline:showExportDialog',
    async (
      _,
      timelineName: string,
      format: 'json' | 'markdown' = 'json'
    ): Promise<string | null> => {
      const extension = format === 'markdown' ? 'md' : 'json5'
      const filterName = format === 'markdown' ? 'Markdown 文件' : 'JSON5 文件'

      const result = await dialog.showSaveDialog({
        title: '导出时间线',
        defaultPath: `${timelineName}.${extension}`,
        filters: [
          { name: filterName, extensions: [extension] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })
      return result.canceled ? null : result.filePath
    }
  )

  // 显示导入对话框
  ipcMain.handle('timeline:showImportDialog', async (): Promise<string | null> => {
    const result = await dialog.showOpenDialog({
      title: '导入时间线',
      filters: [
        { name: 'JSON5 文件', extensions: ['json5'] },
        { name: 'JSON 文件', extensions: ['json'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 保存导出文件
  ipcMain.handle(
    'timeline:saveExportFile',
    async (_, filePath: string, content: string): Promise<boolean> => {
      validateParams('timeline:saveExportFile')
        .nonEmptyString(filePath, 'filePath')
        .string(content, 'content')
        .validate()
      try {
        fs.writeFileSync(filePath, content, 'utf-8')
        return true
      } catch (error) {
        console.error('Failed to save export file:', error)
        return false
      }
    }
  )

  ipcMain.handle('timeline:readImportFile', async (_, filePath: string): Promise<string | null> => {
    validateParams('timeline:readImportFile').nonEmptyString(filePath, 'filePath').validate()
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error) {
      console.error('Failed to read import file:', error)
      return null
    }
  })

  ipcMain.handle('timeline:reorder', (_, timelineIds: string[]): boolean => {
    validateParams('timeline:reorder').stringArray(timelineIds, 'timelineIds').validate()
    return timelineService.reorderTimelines(timelineIds)
  })
}
