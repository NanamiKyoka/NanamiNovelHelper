/**
 * 事序图 IPC 处理器
 */

import { ipcMain, dialog } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import { sequenceChartService } from '../services/sequence-chart'
import { projectService } from '../services/project'
import { validateParams } from '../utils/validation'
import {
  SequenceChart,
  SequenceChartMeta,
  SequenceEvent,
  CreateSequenceChartOptions,
  UpdateSequenceChartOptions,
  CreateSequenceEventOptions,
  UpdateSequenceEventOptions,
  SequenceEventType
} from '../types/sequence-chart'

/**
 * 注册事序图 IPC 处理器
 */
export function registerSequenceChartHandlers(): void {
  // ============================================
  // 事序图管理
  // ============================================

  /**
   * 获取所有事序图列表
   */
  ipcMain.handle('sequenceChart:getList', (): SequenceChartMeta[] => {
    const project = projectService.getCurrentProject()
    if (!project) return []
    sequenceChartService.init(project.path)
    return sequenceChartService.getList()
  })

  /**
   * 获取单个事序图详情
   */
  ipcMain.handle('sequenceChart:get', (_, chartId: string): SequenceChart | null => {
    validateParams('sequenceChart:get').nonEmptyString(chartId, 'chartId').validate()
    const project = projectService.getCurrentProject()
    if (!project) return null
    sequenceChartService.init(project.path)
    return sequenceChartService.get(chartId)
  })

  ipcMain.handle(
    'sequenceChart:create',
    (_, options: CreateSequenceChartOptions): SequenceChart => {
      validateParams('sequenceChart:create')
        .object(options, 'options')
        .nonEmptyString((options as Record<string, unknown>).name as string, 'options.name')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) throw new Error('没有打开的项目')
      sequenceChartService.init(project.path)
      return sequenceChartService.createChart(options)
    }
  )

  ipcMain.handle(
    'sequenceChart:update',
    (_, chartId: string, updates: UpdateSequenceChartOptions): SequenceChart | null => {
      validateParams('sequenceChart:update')
        .nonEmptyString(chartId, 'chartId')
        .object(updates, 'updates')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.updateChart(chartId, updates)
    }
  )

  ipcMain.handle('sequenceChart:delete', (_, chartId: string): boolean => {
    validateParams('sequenceChart:delete').nonEmptyString(chartId, 'chartId').validate()
    const project = projectService.getCurrentProject()
    if (!project) return false
    sequenceChartService.init(project.path)
    return sequenceChartService.delete(chartId)
  })

  // ============================================
  // 事件管理
  // ============================================

  /**
   * 添加事件
   */
  ipcMain.handle(
    'sequenceChart:addEvent',
    (_, chartId: string, event: CreateSequenceEventOptions): SequenceEvent | null => {
      validateParams('sequenceChart:addEvent')
        .nonEmptyString(chartId, 'chartId')
        .object(event, 'event')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.addEvent(chartId, event)
    }
  )

  ipcMain.handle(
    'sequenceChart:updateEvent',
    (
      _,
      chartId: string,
      eventId: string,
      updates: UpdateSequenceEventOptions
    ): SequenceEvent | null => {
      validateParams('sequenceChart:updateEvent')
        .nonEmptyString(chartId, 'chartId')
        .nonEmptyString(eventId, 'eventId')
        .object(updates, 'updates')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.updateEvent(chartId, eventId, updates)
    }
  )

  ipcMain.handle('sequenceChart:deleteEvent', (_, chartId: string, eventId: string): boolean => {
    validateParams('sequenceChart:deleteEvent')
      .nonEmptyString(chartId, 'chartId')
      .nonEmptyString(eventId, 'eventId')
      .validate()
    const project = projectService.getCurrentProject()
    if (!project) return false
    sequenceChartService.init(project.path)
    return sequenceChartService.deleteEvent(chartId, eventId)
  })

  ipcMain.handle(
    'sequenceChart:batchDeleteEvents',
    (_, chartId: string, eventIds: string[]): number => {
      validateParams('sequenceChart:batchDeleteEvents')
        .nonEmptyString(chartId, 'chartId')
        .stringArray(eventIds, 'eventIds')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return 0
      sequenceChartService.init(project.path)
      return sequenceChartService.batchDeleteEvents(chartId, eventIds)
    }
  )

  ipcMain.handle(
    'sequenceChart:moveEvent',
    (_, chartId: string, eventId: string, newOrder: number): SequenceEvent[] | null => {
      validateParams('sequenceChart:moveEvent')
        .nonEmptyString(chartId, 'chartId')
        .nonEmptyString(eventId, 'eventId')
        .number(newOrder, 'newOrder')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.moveEvent(chartId, eventId, newOrder)
    }
  )

  ipcMain.handle(
    'sequenceChart:updateEventTime',
    (
      _,
      chartId: string,
      eventId: string,
      cellStart: number,
      cellEnd: number
    ): SequenceEvent | null => {
      validateParams('sequenceChart:updateEventTime')
        .nonEmptyString(chartId, 'chartId')
        .nonEmptyString(eventId, 'eventId')
        .number(cellStart, 'cellStart')
        .number(cellEnd, 'cellEnd')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.updateEventTime(chartId, eventId, cellStart, cellEnd)
    }
  )

  ipcMain.handle(
    'sequenceChart:updateEvents',
    (_, chartId: string, events: SequenceEvent[]): SequenceChart | null => {
      validateParams('sequenceChart:updateEvents')
        .nonEmptyString(chartId, 'chartId')
        .array(events, 'events')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.updateEvents(chartId, events)
    }
  )

  // ============================================
  // 事件类型管理
  // ============================================

  /**
   * 获取事件类型列表
   */
  ipcMain.handle('sequenceChart:getEventTypes', (_, chartId: string): SequenceEventType[] => {
    validateParams('sequenceChart:getEventTypes').nonEmptyString(chartId, 'chartId').validate()
    const project = projectService.getCurrentProject()
    if (!project) return []
    sequenceChartService.init(project.path)
    return sequenceChartService.getEventTypes(chartId)
  })

  ipcMain.handle(
    'sequenceChart:addEventType',
    (
      _,
      chartId: string,
      type: Omit<SequenceEventType, 'id' | 'isBuiltIn' | 'order'>
    ): SequenceEventType | null => {
      validateParams('sequenceChart:addEventType')
        .nonEmptyString(chartId, 'chartId')
        .object(type, 'type')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.addEventType(chartId, type)
    }
  )

  ipcMain.handle(
    'sequenceChart:updateEventType',
    (
      _,
      chartId: string,
      typeId: string,
      updates: Partial<SequenceEventType>
    ): SequenceEventType | null => {
      validateParams('sequenceChart:updateEventType')
        .nonEmptyString(chartId, 'chartId')
        .nonEmptyString(typeId, 'typeId')
        .object(updates, 'updates')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.updateEventType(chartId, typeId, updates)
    }
  )

  ipcMain.handle('sequenceChart:deleteEventType', (_, chartId: string, typeId: string): boolean => {
    validateParams('sequenceChart:deleteEventType')
      .nonEmptyString(chartId, 'chartId')
      .nonEmptyString(typeId, 'typeId')
      .validate()
    const project = projectService.getCurrentProject()
    if (!project) return false
    sequenceChartService.init(project.path)
    return sequenceChartService.deleteEventType(chartId, typeId)
  })

  // ============================================
  // 缩略图
  // ============================================

  /**
   * 保存缩略图
   */
  ipcMain.handle(
    'sequenceChart:saveThumbnail',
    (_, chartId: string, dataUrl: string): string | null => {
      validateParams('sequenceChart:saveThumbnail')
        .nonEmptyString(chartId, 'chartId')
        .nonEmptyString(dataUrl, 'dataUrl')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null
      sequenceChartService.init(project.path)
      return sequenceChartService.saveThumbnail(chartId, dataUrl)
    }
  )

  ipcMain.handle('sequenceChart:getThumbnailPath', (_, chartId: string): string | null => {
    validateParams('sequenceChart:getThumbnailPath').nonEmptyString(chartId, 'chartId').validate()
    const project = projectService.getCurrentProject()
    if (!project) return null
    sequenceChartService.init(project.path)
    return sequenceChartService.getThumbnailFullPath(chartId)
  })

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导出事序图为 JSON
   */
  ipcMain.handle('sequenceChart:export', (_, chartId: string): string | null => {
    validateParams('sequenceChart:export').nonEmptyString(chartId, 'chartId').validate()
    const project = projectService.getCurrentProject()
    if (!project) return null
    sequenceChartService.init(project.path)
    return sequenceChartService.exportItem(chartId)
  })

  ipcMain.handle('sequenceChart:exportMarkdown', (_, chartId: string): string | null => {
    validateParams('sequenceChart:exportMarkdown').nonEmptyString(chartId, 'chartId').validate()
    const project = projectService.getCurrentProject()
    if (!project) return null
    sequenceChartService.init(project.path)
    return sequenceChartService.exportChartAsMarkdown(chartId)
  })

  ipcMain.handle('sequenceChart:import', (_, jsonContent: string): SequenceChart | null => {
    validateParams('sequenceChart:import').nonEmptyString(jsonContent, 'jsonContent').validate()
    const project = projectService.getCurrentProject()
    if (!project) return null
    sequenceChartService.init(project.path)
    return sequenceChartService.importItem(jsonContent)
  })

  /**
   * 显示导出对话框
   */
  ipcMain.handle(
    'sequenceChart:showExportDialog',
    async (_, chartName: string, format?: 'json' | 'markdown'): Promise<string | null> => {
      validateParams('sequenceChart:showExportDialog')
        .nonEmptyString(chartName, 'chartName')
        .validate()
      const project = projectService.getCurrentProject()
      if (!project) return null

      const defaultPath = path.join(
        path.dirname(project.path),
        `${chartName}.${format === 'markdown' ? 'md' : 'json5'}`
      )

      const result = await dialog.showSaveDialog({
        title: '导出事序图',
        defaultPath,
        filters: [
          {
            name: format === 'markdown' ? 'Markdown' : 'JSON5',
            extensions: [format === 'markdown' ? 'md' : 'json5']
          },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (result.canceled || !result.filePath) {
        return null
      }

      return result.filePath
    }
  )

  /**
   * 显示导入对话框
   */
  ipcMain.handle('sequenceChart:showImportDialog', async (): Promise<string | null> => {
    const project = projectService.getCurrentProject()
    if (!project) return null

    const result = await dialog.showOpenDialog({
      title: '导入事序图',
      defaultPath: path.dirname(project.path),
      filters: [
        { name: 'JSON5', extensions: ['json5', 'json'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  /**
   * 保存导出文件
   */
  ipcMain.handle(
    'sequenceChart:saveExportFile',
    (_, filePath: string, content: string): boolean => {
      validateParams('sequenceChart:saveExportFile')
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

  /**
   * 读取导入文件
   */
  ipcMain.handle('sequenceChart:readImportFile', (_, filePath: string): string | null => {
    validateParams('sequenceChart:readImportFile').nonEmptyString(filePath, 'filePath').validate()
    try {
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error) {
      console.error('Failed to read import file:', error)
      return null
    }
  })

  /**
   * 重新排序事序图
   */
  ipcMain.handle('sequenceChart:reorderCharts', (_, chartIds: string[]): boolean => {
    const project = projectService.getCurrentProject()
    if (!project) return false
    sequenceChartService.init(project.path)
    return sequenceChartService.reorderCharts(chartIds)
  })
}
