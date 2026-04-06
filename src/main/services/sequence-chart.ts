/**
 * 事序图服务
 * 负责事序图的 CRUD 操作、事件管理和缩略图生成
 */

import JSON5 from 'json5'
import {
  SequenceChart,
  SequenceChartMeta,
  SequenceEvent,
  CreateSequenceChartOptions,
  UpdateSequenceChartOptions,
  CreateSequenceEventOptions,
  UpdateSequenceEventOptions,
  TimelineAxisConfig,
  SequenceEventType,
  DEFAULT_AXIS_CONFIG,
  BUILT_IN_EVENT_TYPES,
  EVENT_COLORS
} from '../types/sequence-chart'
import { BaseService } from './base'

/**
 * 默认事件类型颜色
 */
const DEFAULT_EVENT_TYPE_ID = 'other'

/**
 * 事序图服务
 * 继承 BaseService 实现通用 CRUD 操作
 */
class SequenceChartService extends BaseService<SequenceChart, SequenceChartMeta> {
  constructor() {
    super({ dataSubDir: 'sequence-charts' })
  }

  // ============================================
  // BaseService 抽象方法实现
  // ============================================

  protected parseEntity(content: string): SequenceChart | null {
    try {
      return JSON5.parse(content) as SequenceChart
    } catch {
      return null
    }
  }

  protected serializeEntity(item: SequenceChart): string {
    return JSON5.stringify(item, null, 2)
  }

  protected toMetadata(item: SequenceChart): SequenceChartMeta {
    // 获取缩略图完整路径
    let thumbnailPath: string | undefined = undefined
    if (item.thumbnail) {
      const fullPath = this.getThumbnailFullPath(item.id)
      if (fullPath) {
        thumbnailPath = fullPath
      }
    }

    return {
      id: item.id,
      name: item.name,
      description: item.description,
      thumbnail: thumbnailPath,
      axisConfig: item.axisConfig,
      customEventTypes: item.customEventTypes || [],
      eventCount: item.events.length,
      tags: item.tags,
      order: item.order ?? 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt
    }
  }

  protected sortItems(items: SequenceChartMeta[]): SequenceChartMeta[] {
    // 按更新时间排序
    return items.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
  }

  // ============================================
  // 事序图管理
  // ============================================

  /**
   * 创建事序图
   */
  createChart(options: CreateSequenceChartOptions): SequenceChart {
    const now = this.getTimestamp()
    const chartId = this.generateId()

    // 获取当前最大 order
    const existingCharts = this.getList()
    const maxOrder = existingCharts.length > 0
      ? Math.max(...existingCharts.map(c => c.order ?? 0))
      : -1

    const axisConfig: TimelineAxisConfig = {
      ...DEFAULT_AXIS_CONFIG,
      ...options.axisConfig
    }

    const chart: SequenceChart = {
      id: chartId,
      name: options.name.trim(),
      description: options.description,
      thumbnail: undefined,
      axisConfig,
      customEventTypes: [],
      events: [],
      eventCount: 0,
      tags: options.tags || [],
      order: maxOrder + 1,
      createdAt: now,
      updatedAt: now
    }

    this.save(chart)
    return chart
  }

  /**
   * 更新事序图
   */
  updateChart(chartId: string, updates: UpdateSequenceChartOptions): SequenceChart | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const now = this.getTimestamp()

    const updatedChart: SequenceChart = {
      ...chart,
      ...updates,
      id: chart.id,
      createdAt: chart.createdAt,
      updatedAt: now
    }

    // 更新事件计数
    if (updates.events !== undefined) {
      updatedChart.eventCount = updates.events.length
    }

    // 合并轴配置
    if (updates.axisConfig) {
      updatedChart.axisConfig = {
        ...chart.axisConfig,
        ...updates.axisConfig
      }
    }

    this.save(updatedChart)
    return updatedChart
  }

  // ============================================
  // 事件管理
  // ============================================

  /**
   * 添加事件
   */
  addEvent(
    chartId: string,
    event: CreateSequenceEventOptions
  ): SequenceEvent | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const now = this.getTimestamp()

    // 计算时间信息
    const timeInfo = {
      format: event.timeInfo?.format || chart.axisConfig.defaultFormat,
      cellStart: event.timeInfo?.cellStart ?? 1,
      cellEnd: event.timeInfo?.cellEnd ?? 10,
      datetimeStart: event.timeInfo?.datetimeStart,
      datetimeEnd: event.timeInfo?.datetimeEnd,
      chapterStartId: event.timeInfo?.chapterStartId,
      chapterStartTitle: event.timeInfo?.chapterStartTitle,
      chapterEndId: event.timeInfo?.chapterEndId,
      chapterEndTitle: event.timeInfo?.chapterEndTitle
    }

    // 获取颜色
    let color = event.color
    if (!color) {
      // 使用 51mazi 风格的颜色循环
      color = EVENT_COLORS[chart.events.length % EVENT_COLORS.length]
    }

    const newEvent: SequenceEvent = {
      id: this.generateId(),
      order: chart.events.length,
      title: event.title.trim(),
      description: event.description,
      timeInfo,
      progress: event.progress ?? 0,
      eventTypeId: event.eventTypeId || DEFAULT_EVENT_TYPE_ID,
      color,
      characters: event.characters || [],
      chapter: event.chapter,
      location: event.location,
      createdAt: now,
      updatedAt: now
    }

    chart.events.push(newEvent)
    chart.eventCount = chart.events.length
    chart.updatedAt = now

    // 检查是否需要扩展时间轴
    if (chart.axisConfig.autoExtend && timeInfo.cellEnd) {
      const currentMax = chart.axisConfig.initialCellCount
      if (timeInfo.cellEnd >= currentMax - 10) {
        chart.axisConfig.initialCellCount = Math.min(
          timeInfo.cellEnd + 50,
          chart.axisConfig.maxCellCount
        )
      }
    }

    this.save(chart)
    return newEvent
  }

  /**
   * 更新事件
   */
  updateEvent(
    chartId: string,
    eventId: string,
    updates: UpdateSequenceEventOptions
  ): SequenceEvent | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const eventIndex = chart.events.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return null

    const now = this.getTimestamp()
    const existingEvent = chart.events[eventIndex]

    // 合并时间信息
    const updatedTimeInfo = {
      ...existingEvent.timeInfo,
      ...updates.timeInfo
    }

    chart.events[eventIndex] = {
      ...existingEvent,
      ...updates,
      timeInfo: updatedTimeInfo,
      id: existingEvent.id,
      createdAt: existingEvent.createdAt,
      updatedAt: now
    }

    chart.updatedAt = now
    this.save(chart)
    return chart.events[eventIndex]
  }

  /**
   * 删除事件
   */
  deleteEvent(chartId: string, eventId: string): boolean {
    const chart = this.get(chartId)
    if (!chart) return false

    const eventIndex = chart.events.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return false

    const now = this.getTimestamp()

    // 删除事件
    chart.events.splice(eventIndex, 1)
    chart.eventCount = chart.events.length

    // 重新排序
    chart.events.forEach((event, index) => {
      event.order = index
    })

    chart.updatedAt = now
    this.save(chart)
    return true
  }

  /**
   * 批量删除事件
   */
  batchDeleteEvents(chartId: string, eventIds: string[]): number {
    const chart = this.get(chartId)
    if (!chart) return 0

    const now = this.getTimestamp()
    const deletedCount = chart.events.length

    // 过滤掉要删除的事件
    chart.events = chart.events.filter(e => !eventIds.includes(e.id))
    chart.eventCount = chart.events.length

    // 重新排序
    chart.events.forEach((event, index) => {
      event.order = index
    })

    chart.updatedAt = now
    this.save(chart)

    return deletedCount - chart.events.length
  }

  /**
   * 移动事件（改变顺序）
   */
  moveEvent(
    chartId: string,
    eventId: string,
    newOrder: number
  ): SequenceEvent[] | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const eventIndex = chart.events.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return null

    const now = this.getTimestamp()
    const event = chart.events[eventIndex]

    // 移除事件
    chart.events.splice(eventIndex, 1)

    // 在新位置插入
    chart.events.splice(newOrder, 0, event)

    // 重新排序
    chart.events.forEach((e, index) => {
      e.order = index
      e.updatedAt = now
    })

    chart.updatedAt = now
    this.save(chart)
    return chart.events
  }

  /**
   * 更新事件的时间位置（拖拽调整时间）
   */
  updateEventTime(
    chartId: string,
    eventId: string,
    cellStart: number,
    cellEnd: number
  ): SequenceEvent | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const eventIndex = chart.events.findIndex(e => e.id === eventId)
    if (eventIndex === -1) return null

    const now = this.getTimestamp()

    chart.events[eventIndex].timeInfo.cellStart = cellStart
    chart.events[eventIndex].timeInfo.cellEnd = cellEnd
    chart.events[eventIndex].updatedAt = now

    // 检查是否需要扩展时间轴
    if (chart.axisConfig.autoExtend) {
      const currentMax = chart.axisConfig.initialCellCount
      if (cellEnd >= currentMax - 10) {
        chart.axisConfig.initialCellCount = Math.min(
          cellEnd + 50,
          chart.axisConfig.maxCellCount
        )
      }
    }

    chart.updatedAt = now
    this.save(chart)
    return chart.events[eventIndex]
  }

  /**
   * 更新所有事件（批量更新）
   */
  updateEvents(chartId: string, events: SequenceEvent[]): SequenceChart | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const now = this.getTimestamp()

    chart.events = events.map((e, index) => ({
      ...e,
      order: index,
      updatedAt: now
    }))
    chart.eventCount = events.length
    chart.updatedAt = now

    this.save(chart)
    return chart
  }

  // ============================================
  // 事件类型管理
  // ============================================

  /**
   * 获取事件类型（包含内置和自定义）
   */
  private getEventType(chart: SequenceChart, typeId: string): SequenceEventType | undefined {
    // 先查自定义类型
    const customType = chart.customEventTypes?.find(t => t.id === typeId)
    if (customType) return customType

    // 再查内置类型
    return BUILT_IN_EVENT_TYPES.find(t => t.id === typeId)
  }

  /**
   * 获取所有事件类型
   */
  getEventTypes(chartId: string): SequenceEventType[] {
    const chart = this.get(chartId)
    if (!chart) return BUILT_IN_EVENT_TYPES

    const customTypes = chart.customEventTypes || []

    // 合并内置类型和自定义类型，按 order 排序
    return [...BUILT_IN_EVENT_TYPES, ...customTypes]
      .sort((a, b) => a.order - b.order)
  }

  /**
   * 添加自定义事件类型
   */
  addEventType(
    chartId: string,
    type: Omit<SequenceEventType, 'id' | 'isBuiltIn' | 'order'>
  ): SequenceEventType | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const now = this.getTimestamp()
    const newType: SequenceEventType = {
      ...type,
      id: this.generateId(),
      isBuiltIn: false,
      order: (chart.customEventTypes?.length || 0) + BUILT_IN_EVENT_TYPES.length
    }

    if (!chart.customEventTypes) {
      chart.customEventTypes = []
    }
    chart.customEventTypes.push(newType)
    chart.updatedAt = now

    this.save(chart)
    return newType
  }

  /**
   * 更新自定义事件类型
   */
  updateEventType(
    chartId: string,
    typeId: string,
    updates: Partial<SequenceEventType>
  ): SequenceEventType | null {
    const chart = this.get(chartId)
    if (!chart) return null

    const typeIndex = chart.customEventTypes?.findIndex(t => t.id === typeId)
    if (typeIndex === undefined || typeIndex === -1) return null

    const now = this.getTimestamp()
    chart.customEventTypes![typeIndex] = {
      ...chart.customEventTypes![typeIndex],
      ...updates,
      id: chart.customEventTypes![typeIndex].id,
      isBuiltIn: false
    }

    chart.updatedAt = now
    this.save(chart)
    return chart.customEventTypes![typeIndex]
  }

  /**
   * 删除自定义事件类型
   */
  deleteEventType(chartId: string, typeId: string): boolean {
    const chart = this.get(chartId)
    if (!chart) return false

    const typeIndex = chart.customEventTypes?.findIndex(t => t.id === typeId)
    if (typeIndex === undefined || typeIndex === -1) return false

    const now = this.getTimestamp()
    chart.customEventTypes!.splice(typeIndex, 1)
    chart.updatedAt = now

    this.save(chart)
    return true
  }

  // ============================================
  // 缩略图（扩展基类方法）
  // ============================================

  /**
   * 保存缩略图（扩展基类方法以更新元数据）
   */
  override saveThumbnail(chartId: string, dataUrl: string): string | null {
    const result = super.saveThumbnail(chartId, dataUrl)
    if (result) {
      // 更新事序图元数据
      const chart = this.get(chartId)
      if (chart) {
        chart.thumbnail = `${chartId}.png`
        this.save(chart)
      }
    }
    return result
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导入事序图（覆盖基类方法）
   */
  override importItem(jsonContent: string): SequenceChart | null {
    try {
      const chart = JSON5.parse(jsonContent) as SequenceChart

      // 生成新 ID
      const newId = this.generateId()
      const now = this.getTimestamp()

      const importedChart: SequenceChart = {
        ...chart,
        id: newId,
        name: `${chart.name} (导入)`,
        createdAt: now,
        updatedAt: now,
        thumbnail: undefined
      }

      this.save(importedChart)
      return importedChart
    } catch (error) {
      this.logger.error('Failed to import sequence chart', error)
      return null
    }
  }

  /**
   * 导出事序图为 Markdown
   */
  exportChartAsMarkdown(chartId: string): string | null {
    const chart = this.get(chartId)
    if (!chart) return null

    let md = `# ${chart.name}\n\n`

    if (chart.description) {
      md += `${chart.description}\n\n`
    }

    if (chart.tags && chart.tags.length > 0) {
      md += `标签: ${chart.tags.join(', ')}\n\n`
    }

    md += `---\n\n`

    // 按时间顺序输出事件
    const sortedEvents = [...chart.events].sort((a, b) => {
      const startA = a.timeInfo.cellStart || 0
      const startB = b.timeInfo.cellStart || 0
      return startA - startB
    })

    for (const event of sortedEvents) {
      md += `## ${event.order + 1}. ${event.title}\n\n`

      // 时间信息
      let timeStr = ''
      switch (event.timeInfo.format) {
        case 'cell':
          timeStr = `单元格 ${event.timeInfo.cellStart} - ${event.timeInfo.cellEnd}`
          break
        case 'datetime':
          if (event.timeInfo.datetimeStart && event.timeInfo.datetimeEnd) {
            timeStr = `${event.timeInfo.datetimeStart} ~ ${event.timeInfo.datetimeEnd}`
          } else {
            timeStr = event.timeInfo.datetimeStart || event.timeInfo.datetimeEnd || ''
          }
          break
        case 'chapter':
          if (event.timeInfo.chapterStartTitle) {
            timeStr = event.timeInfo.chapterEndTitle
              ? `${event.timeInfo.chapterStartTitle} ~ ${event.timeInfo.chapterEndTitle}`
              : event.timeInfo.chapterStartTitle
          }
          break
      }
      if (timeStr) {
        md += `**时间**: ${timeStr}\n\n`
      }

      // 进度
      md += `**进度**: ${event.progress}%\n\n`

      // 关联角色
      if (event.characters && event.characters.length > 0) {
        const charNames = event.characters.map(c => c.name).join(', ')
        md += `**角色**: ${charNames}\n\n`
      }

      // 关联地点
      if (event.location) {
        md += `**地点**: ${event.location.name}\n\n`
      }

      // 关联章节
      if (event.chapter) {
        md += `**章节**: [${event.chapter.title}](${event.chapter.path})\n\n`
      }

      // 描述
      if (event.description) {
        md += `${event.description}\n\n`
      }

      md += `---\n\n`
    }

    return md
  }

  /**
   * 重新排序事序图
   */
  reorderCharts(chartIds: string[]): boolean {
    try {
      chartIds.forEach((chartId, index) => {
        const chart = this.get(chartId)
        if (chart) {
          chart.order = index
          chart.updatedAt = this.getTimestamp()
          this.save(chart)
        }
      })
      return true
    } catch (error) {
      this.logger.error('Failed to reorder sequence charts', error)
      return false
    }
  }
}

// 单例导出
export const sequenceChartService = new SequenceChartService()