/**
 * 时间线相关 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import { timelineService } from '../services/timeline'
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
    return timelineService.get(timelineId)
  })

  // 创建时间线
  ipcMain.handle('timeline:create', (_, options: CreateTimelineOptions): Timeline => {
    return timelineService.createTimeline(options)
  })

  // 更新时间线
  ipcMain.handle('timeline:update', (_, timelineId: string, updates: UpdateTimelineOptions): Timeline | null => {
    return timelineService.updateTimeline(timelineId, updates)
  })

  // 删除时间线
  ipcMain.handle('timeline:delete', (_, timelineId: string): boolean => {
    return timelineService.delete(timelineId)
  })

  // ============================================
  // 节点管理
  // ============================================

  // 添加节点
  ipcMain.handle('timeline:addNode', (_, timelineId: string, node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt' | 'order'>): TimelineNode | null => {
    return timelineService.addNode(timelineId, node)
  })

  // 更新节点
  ipcMain.handle('timeline:updateNode', (_, timelineId: string, nodeId: string, updates: Partial<TimelineNode>): TimelineNode | null => {
    return timelineService.updateNode(timelineId, nodeId, updates)
  })

  // 删除节点
  ipcMain.handle('timeline:deleteNode', (_, timelineId: string, nodeId: string): boolean => {
    return timelineService.deleteNode(timelineId, nodeId)
  })

  // 批量删除节点
  ipcMain.handle('timeline:batchDeleteNodes', (_, timelineId: string, nodeIds: string[]): number => {
    return timelineService.batchDeleteNodes(timelineId, nodeIds)
  })

  // 移动节点
  ipcMain.handle('timeline:moveNode', (_, timelineId: string, nodeId: string, newOrder: number): TimelineNode[] | null => {
    return timelineService.moveNode(timelineId, nodeId, newOrder)
  })

  // 批量移动节点
  ipcMain.handle('timeline:batchMoveNodes', (_, timelineId: string, nodeIds: string[], targetOrder: number): TimelineNode[] | null => {
    return timelineService.batchMoveNodes(timelineId, nodeIds, targetOrder)
  })

  // 更新所有节点（用于拖拽排序后保存）
  ipcMain.handle('timeline:updateNodes', (_, timelineId: string, nodes: TimelineNode[]): Timeline | null => {
    return timelineService.updateTimeline(timelineId, { nodes })
  })

  // ============================================
  // 分支管理
  // ============================================

  // 创建分支时间线
  ipcMain.handle('timeline:createBranch', (_, parentTimelineId: string, branchFromNodeId: string, name?: string): Timeline | null => {
    return timelineService.createBranchTimeline(parentTimelineId, branchFromNodeId, name)
  })

  // 合并分支时间线
  ipcMain.handle('timeline:mergeBranch', (_, branchTimelineId: string, targetTimelineId: string, targetNodeId?: string): boolean => {
    return timelineService.mergeBranchTimeline(branchTimelineId, targetTimelineId, targetNodeId)
  })

  // 获取时间线的所有分支
  ipcMain.handle('timeline:getBranches', (_, parentTimelineId: string): TimelineMeta[] => {
    return timelineService.getBranchTimelines(parentTimelineId)
  })

  // 获取分支来源节点
  ipcMain.handle('timeline:getBranchSourceNode', (_, timelineId: string): TimelineNode | null => {
    return timelineService.getBranchSourceNode(timelineId)
  })

  // ============================================
  // 缩略图
  // ============================================

  // 保存缩略图
  ipcMain.handle('timeline:saveThumbnail', (_, timelineId: string, dataUrl: string): string | null => {
    return timelineService.saveThumbnail(timelineId, dataUrl)
  })

  // 获取缩略图路径
  ipcMain.handle('timeline:getThumbnailPath', (_, timelineId: string): string | null => {
    return timelineService.getThumbnailFullPath(timelineId)
  })

  // ============================================
  // 导入导出
  // ============================================

  // 导出时间线为 JSON5
  ipcMain.handle('timeline:export', (_, timelineId: string): string | null => {
    return timelineService.exportItem(timelineId)
  })

  // 导出时间线为 Markdown
  ipcMain.handle('timeline:exportMarkdown', (_, timelineId: string): string | null => {
    return timelineService.exportTimelineAsMarkdown(timelineId)
  })

  // 导入时间线
  ipcMain.handle('timeline:import', (_, jsonContent: string): Timeline | null => {
    return timelineService.importItem(jsonContent)
  })

  // 显示导出对话框
  ipcMain.handle('timeline:showExportDialog', async (_, timelineName: string, format: 'json' | 'markdown' = 'json'): Promise<string | null> => {
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
  })

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
  ipcMain.handle('timeline:saveExportFile', async (_, filePath: string, content: string): Promise<boolean> => {
    try {
      fs.writeFileSync(filePath, content, 'utf-8')
      return true
    } catch (error) {
      console.error('Failed to save export file:', error)
      return false
    }
  })

  // 读取导入文件
  ipcMain.handle('timeline:readImportFile', async (_, filePath: string): Promise<string | null> => {
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error) {
      console.error('Failed to read import file:', error)
      return null
    }
  })

  // 重新排序时间线列表
  ipcMain.handle('timeline:reorder', (_, timelineIds: string[]): boolean => {
    return timelineService.reorderTimelines(timelineIds)
  })
}
