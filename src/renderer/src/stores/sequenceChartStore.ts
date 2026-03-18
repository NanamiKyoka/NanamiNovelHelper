/**
 * 事序图状态管理
 */

import { create } from 'zustand'
import type {
  SequenceChart,
  SequenceChartMeta,
  SequenceEvent,
  SequenceEventType,
  SequenceTimeInfo,
  SequenceCharacterRef,
  SequenceChapterRef,
  SequenceLocationRef,
  TimelineAxisConfig,
  CreateSequenceChartOptions,
  UpdateSequenceChartOptions,
  CreateSequenceEventOptions,
  UpdateSequenceEventOptions,
  SequenceChartViewMode,
  DragState,
  ZOOM_LEVELS
} from '../types/sequence-chart'

interface SequenceChartState {
  // 状态
  charts: SequenceChartMeta[]
  currentChart: SequenceChart | null
  isLoading: boolean
  error: string | null

  // 视图状态
  viewMode: SequenceChartViewMode
  zoomScale: number
  leftPanelCollapsed: boolean

  // 拖拽状态
  dragState: DragState

  // 选择状态
  selectedEventIds: string[]
  hoveredEventId: string | null

  // 编辑状态
  editingEventId: string | null

  // 事序图管理
  loadList: () => Promise<void>
  loadChart: (chartId: string) => Promise<void>
  createChart: (options: CreateSequenceChartOptions) => Promise<SequenceChart | null>
  updateChart: (chartId: string, updates: UpdateSequenceChartOptions) => Promise<void>
  deleteChart: (chartId: string) => Promise<void>
  clearCurrentChart: () => void

  // 事件管理
  addEvent: (event: CreateSequenceEventOptions) => Promise<SequenceEvent | null>
  updateEvent: (eventId: string, updates: UpdateSequenceEventOptions) => Promise<void>
  deleteEvent: (eventId: string) => Promise<void>
  batchDeleteEvents: (eventIds: string[]) => Promise<number>
  moveEvent: (eventId: string, newOrder: number) => Promise<void>
  updateEventTime: (eventId: string, cellStart: number, cellEnd: number) => Promise<void>
  updateEvents: (events: SequenceEvent[]) => Promise<void>

  // 事件类型管理
  getEventTypes: () => SequenceEventType[]
  addEventType: (type: Omit<SequenceEventType, 'id' | 'isBuiltIn' | 'order'>) => Promise<SequenceEventType | null>
  updateEventType: (typeId: string, updates: Partial<SequenceEventType>) => Promise<void>
  deleteEventType: (typeId: string) => Promise<void>

  // 视图控制
  setViewMode: (mode: SequenceChartViewMode) => void
  setZoomScale: (scale: number) => void
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  toggleLeftPanel: () => void

  // 拖拽控制
  startDrag: (dragType: DragState['dragType'], eventId: string, startX: number, startY: number) => void
  updateDrag: (currentX: number, currentY: number) => void
  endDrag: () => void
  cancelDrag: () => void

  // 选择管理
  selectEvent: (eventId: string, multi?: boolean) => void
  deselectEvent: (eventId: string) => void
  selectAllEvents: () => void
  clearSelection: () => void
  setHoveredEvent: (eventId: string | null) => void

  // 编辑管理
  setEditingEvent: (eventId: string | null) => void

  // 缩略图
  saveThumbnail: (dataUrl: string) => Promise<void>

  // 导入导出
  exportChart: (chartId: string) => Promise<string | null>
  exportChartAsMarkdown: (chartId: string) => Promise<string | null>
  importChart: (jsonContent: string) => Promise<SequenceChart | null>

  // 时间轴管理
  updateAxisConfig: (config: Partial<TimelineAxisConfig>) => Promise<void>
  extendAxis: (newCellCount: number) => Promise<void>

  // 辅助方法
  getEventById: (eventId: string) => SequenceEvent | undefined
  getEventsByCellRange: (cellStart: number, cellEnd: number) => SequenceEvent[]
  getEventTypeById: (typeId: string) => SequenceEventType | undefined
  clearData: () => void
  // 批量设置方法（用于聚合接口）
  setCharts: (charts: SequenceChartMeta[]) => void
}

export const useSequenceChartStore = create<SequenceChartState>((set, get) => ({
  // 初始状态
  charts: [],
  currentChart: null,
  isLoading: false,
  error: null,

  // 视图状态
  viewMode: 'list',
  zoomScale: 1,
  leftPanelCollapsed: false,

  // 拖拽状态
  dragState: {
    isDragging: false,
    dragType: null,
    eventId: null,
    startX: 0,
    startY: 0
  },

  // 选择状态
  selectedEventIds: [],
  hoveredEventId: null,

  // 编辑状态
  editingEventId: null,

  // 事序图管理
  loadList: async () => {
    set({ isLoading: true, error: null })
    try {
      const charts = await window.electron.sequenceChart.getList()
      set({ charts, isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载事序图列表失败'
      console.error('Failed to load sequence charts:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  loadChart: async (chartId: string) => {
    set({ isLoading: true, error: null })
    try {
      const chart = await window.electron.sequenceChart.get(chartId)
      set({ currentChart: chart, isLoading: false, selectedEventIds: [], editingEventId: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载事序图失败'
      console.error('Failed to load sequence chart:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  createChart: async (options: CreateSequenceChartOptions) => {
    set({ isLoading: true, error: null })
    try {
      const chart = await window.electron.sequenceChart.create(options)
      set((state) => ({
        charts: [
          {
            id: chart.id,
            name: chart.name,
            description: chart.description,
            thumbnail: chart.thumbnail,
            axisConfig: chart.axisConfig,
            customEventTypes: chart.customEventTypes,
            eventCount: chart.eventCount,
            tags: chart.tags,
            createdAt: chart.createdAt,
            updatedAt: chart.updatedAt,
          },
          ...state.charts,
        ],
        currentChart: chart,
        isLoading: false,
      }))
      return chart
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '创建事序图失败'
      console.error('Failed to create sequence chart:', error)
      set({ isLoading: false, error: errorMessage })
      return null
    }
  },

  updateChart: async (chartId: string, updates: UpdateSequenceChartOptions) => {
    try {
      const updatedChart = await window.electron.sequenceChart.update(chartId, updates)
      if (updatedChart) {
        set((state) => ({
          charts: state.charts.map((c) =>
            c.id === chartId
              ? {
                  ...c,
                  name: updatedChart.name,
                  description: updatedChart.description,
                  thumbnail: updatedChart.thumbnail,
                  axisConfig: updatedChart.axisConfig,
                  customEventTypes: updatedChart.customEventTypes,
                  eventCount: updatedChart.eventCount,
                  tags: updatedChart.tags,
                  updatedAt: updatedChart.updatedAt,
                }
              : c
          ),
          currentChart:
            state.currentChart?.id === chartId ? updatedChart : state.currentChart,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新事序图失败'
      console.error('Failed to update sequence chart:', error)
      set({ error: errorMessage })
    }
  },

  deleteChart: async (chartId: string) => {
    try {
      const success = await window.electron.sequenceChart.delete(chartId)
      if (success) {
        set((state) => ({
          charts: state.charts.filter((c) => c.id !== chartId),
          currentChart:
            state.currentChart?.id === chartId ? null : state.currentChart,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除事序图失败'
      console.error('Failed to delete sequence chart:', error)
      set({ error: errorMessage })
    }
  },

  clearCurrentChart: () => {
    set({ currentChart: null, selectedEventIds: [], editingEventId: null })
  },

  // 事件管理
  addEvent: async (event: CreateSequenceEventOptions) => {
    const { currentChart } = get()
    if (!currentChart) return null

    try {
      const newEvent = await window.electron.sequenceChart.addEvent(currentChart.id, event)
      if (newEvent) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                events: [...state.currentChart.events, newEvent],
                eventCount: state.currentChart.eventCount + 1,
                axisConfig: newEvent.timeInfo.cellEnd && 
                  newEvent.timeInfo.cellEnd >= state.currentChart.axisConfig.initialCellCount - 10
                  ? {
                      ...state.currentChart.axisConfig,
                      initialCellCount: Math.min(
                        newEvent.timeInfo.cellEnd + 50,
                        state.currentChart.axisConfig.maxCellCount
                      )
                    }
                  : state.currentChart.axisConfig
              }
            : null,
        }))
      }
      return newEvent
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加事件失败'
      console.error('Failed to add event:', error)
      set({ error: errorMessage })
      return null
    }
  },

  updateEvent: async (eventId: string, updates: UpdateSequenceEventOptions) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const updatedEvent = await window.electron.sequenceChart.updateEvent(
        currentChart.id,
        eventId,
        updates
      )
      if (updatedEvent) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                events: state.currentChart.events.map((e) =>
                  e.id === eventId ? updatedEvent : e
                ),
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新事件失败'
      console.error('Failed to update event:', error)
      set({ error: errorMessage })
    }
  },

  deleteEvent: async (eventId: string) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const success = await window.electron.sequenceChart.deleteEvent(currentChart.id, eventId)
      if (success) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                events: state.currentChart.events.filter((e) => e.id !== eventId),
                eventCount: state.currentChart.eventCount - 1,
              }
            : null,
          selectedEventIds: state.selectedEventIds.filter((id) => id !== eventId),
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除事件失败'
      console.error('Failed to delete event:', error)
      set({ error: errorMessage })
    }
  },

  batchDeleteEvents: async (eventIds: string[]) => {
    const { currentChart } = get()
    if (!currentChart) return 0

    try {
      const deletedCount = await window.electron.sequenceChart.batchDeleteEvents(
        currentChart.id,
        eventIds
      )
      if (deletedCount > 0) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                events: state.currentChart.events.filter((e) => !eventIds.includes(e.id)),
                eventCount: state.currentChart.eventCount - deletedCount,
              }
            : null,
          selectedEventIds: [],
        }))
      }
      return deletedCount
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量删除事件失败'
      console.error('Failed to batch delete events:', error)
      set({ error: errorMessage })
      return 0
    }
  },

  moveEvent: async (eventId: string, newOrder: number) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const updatedEvents = await window.electron.sequenceChart.moveEvent(
        currentChart.id,
        eventId,
        newOrder
      )
      if (updatedEvents) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                events: updatedEvents,
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '移动事件失败'
      console.error('Failed to move event:', error)
      set({ error: errorMessage })
    }
  },

  updateEventTime: async (eventId: string, cellStart: number, cellEnd: number) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const updatedEvent = await window.electron.sequenceChart.updateEventTime(
        currentChart.id,
        eventId,
        cellStart,
        cellEnd
      )
      if (updatedEvent) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                events: state.currentChart.events.map((e) =>
                  e.id === eventId ? updatedEvent : e
                ),
                // 自动扩展时间轴
                axisConfig: cellEnd >= state.currentChart.axisConfig.initialCellCount - 10
                  ? {
                      ...state.currentChart.axisConfig,
                      initialCellCount: Math.min(
                        cellEnd + 50,
                        state.currentChart.axisConfig.maxCellCount
                      )
                    }
                  : state.currentChart.axisConfig
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新事件时间失败'
      console.error('Failed to update event time:', error)
      set({ error: errorMessage })
    }
  },

  updateEvents: async (events: SequenceEvent[]) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const updatedChart = await window.electron.sequenceChart.updateEvents(
        currentChart.id,
        events
      )
      if (updatedChart) {
        set({ currentChart: updatedChart })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新事件失败'
      console.error('Failed to update events:', error)
      set({ error: errorMessage })
    }
  },

  // 事件类型管理
  getEventTypes: () => {
    const { currentChart } = get()
    if (!currentChart) return []

    const builtInTypes: SequenceEventType[] = [
      { id: 'battle', name: '战斗', color: '#ff4d4f', isBuiltIn: true, order: 0 },
      { id: 'dialogue', name: '对话', color: '#1890ff', isBuiltIn: true, order: 1 },
      { id: 'travel', name: '旅行', color: '#52c41a', isBuiltIn: true, order: 2 },
      { id: 'romance', name: '感情', color: '#eb2f96', isBuiltIn: true, order: 3 },
      { id: 'mystery', name: '悬疑', color: '#722ed1', isBuiltIn: true, order: 4 },
      { id: 'daily', name: '日常', color: '#faad14', isBuiltIn: true, order: 5 },
      { id: 'conflict', name: '冲突', color: '#fa541c', isBuiltIn: true, order: 6 },
      { id: 'revelation', name: '揭秘', color: '#13c2c2', isBuiltIn: true, order: 7 },
      { id: 'death', name: '死亡', color: '#595959', isBuiltIn: true, order: 8 },
      { id: 'other', name: '其他', color: '#8c8c8c', isBuiltIn: true, order: 9 }
    ]

    const customTypes = currentChart.customEventTypes || []
    return [...builtInTypes, ...customTypes].sort((a, b) => a.order - b.order)
  },

  addEventType: async (type: Omit<SequenceEventType, 'id' | 'isBuiltIn' | 'order'>) => {
    const { currentChart } = get()
    if (!currentChart) return null

    try {
      const newType = await window.electron.sequenceChart.addEventType(currentChart.id, type)
      if (newType) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                customEventTypes: [...(state.currentChart.customEventTypes || []), newType],
              }
            : null,
        }))
      }
      return newType
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '添加事件类型失败'
      console.error('Failed to add event type:', error)
      set({ error: errorMessage })
      return null
    }
  },

  updateEventType: async (typeId: string, updates: Partial<SequenceEventType>) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const updatedType = await window.electron.sequenceChart.updateEventType(
        currentChart.id,
        typeId,
        updates
      )
      if (updatedType) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                customEventTypes: state.currentChart.customEventTypes.map((t) =>
                  t.id === typeId ? updatedType : t
                ),
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新事件类型失败'
      console.error('Failed to update event type:', error)
      set({ error: errorMessage })
    }
  },

  deleteEventType: async (typeId: string) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const success = await window.electron.sequenceChart.deleteEventType(currentChart.id, typeId)
      if (success) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                customEventTypes: state.currentChart.customEventTypes.filter((t) => t.id !== typeId),
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '删除事件类型失败'
      console.error('Failed to delete event type:', error)
      set({ error: errorMessage })
    }
  },

  // 视图控制
  setViewMode: (mode: SequenceChartViewMode) => {
    set({ viewMode: mode })
  },

  setZoomScale: (scale: number) => {
    const clampedScale = Math.max(0.25, Math.min(2, scale))
    set({ zoomScale: clampedScale })
  },

  zoomIn: () => {
    const { zoomScale } = get()
    const nextLevel = ZOOM_LEVELS.find((l) => l.scale > zoomScale)
    if (nextLevel) {
      set({ zoomScale: nextLevel.scale })
    }
  },

  zoomOut: () => {
    const { zoomScale } = get()
    const prevLevel = [...ZOOM_LEVELS].reverse().find((l) => l.scale < zoomScale)
    if (prevLevel) {
      set({ zoomScale: prevLevel.scale })
    }
  },

  resetZoom: () => {
    set({ zoomScale: 1 })
  },

  toggleLeftPanel: () => {
    set((state) => ({ leftPanelCollapsed: !state.leftPanelCollapsed }))
  },

  // 拖拽控制
  startDrag: (dragType, eventId, startX, startY) => {
    const { currentChart } = get()
    if (!currentChart) return

    const event = currentChart.events.find(e => e.id === eventId)
    set({
      dragState: {
        isDragging: true,
        dragType,
        eventId,
        startX,
        startY,
        originalCellStart: event?.timeInfo.cellStart,
        originalCellEnd: event?.timeInfo.cellEnd,
        originalOrder: event?.order
      }
    })
  },

  updateDrag: (currentX, currentY) => {
    // 拖拽过程中的实时更新由组件处理
  },

  endDrag: () => {
    set({
      dragState: {
        isDragging: false,
        dragType: null,
        eventId: null,
        startX: 0,
        startY: 0
      }
    })
  },

  cancelDrag: () => {
    set({
      dragState: {
        isDragging: false,
        dragType: null,
        eventId: null,
        startX: 0,
        startY: 0
      }
    })
  },

  // 选择管理
  selectEvent: (eventId: string, multi = false) => {
    if (multi) {
      set((state) => ({
        selectedEventIds: state.selectedEventIds.includes(eventId)
          ? state.selectedEventIds.filter((id) => id !== eventId)
          : [...state.selectedEventIds, eventId],
      }))
    } else {
      set({ selectedEventIds: [eventId] })
    }
  },

  deselectEvent: (eventId: string) => {
    set((state) => ({
      selectedEventIds: state.selectedEventIds.filter((id) => id !== eventId),
    }))
  },

  selectAllEvents: () => {
    const { currentChart } = get()
    if (!currentChart) return
    set({ selectedEventIds: currentChart.events.map((e) => e.id) })
  },

  clearSelection: () => {
    set({ selectedEventIds: [] })
  },

  setHoveredEvent: (eventId: string | null) => {
    set({ hoveredEventId: eventId })
  },

  // 编辑管理
  setEditingEvent: (eventId: string | null) => {
    set({ editingEventId: eventId })
  },

  // 缩略图
  saveThumbnail: async (dataUrl: string) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const thumbnailPath = await window.electron.sequenceChart.saveThumbnail(
        currentChart.id,
        dataUrl
      )
      if (thumbnailPath) {
        set((state) => ({
          currentChart: state.currentChart
            ? { ...state.currentChart, thumbnail: thumbnailPath }
            : null,
          charts: state.charts.map((c) =>
            c.id === currentChart.id ? { ...c, thumbnail: thumbnailPath } : c
          ),
        }))
      }
    } catch (error) {
      console.error('Failed to save thumbnail:', error)
    }
  },

  // 导入导出
  exportChart: async (chartId: string) => {
    try {
      return await window.electron.sequenceChart.export(chartId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出事序图失败'
      console.error('Failed to export sequence chart:', error)
      set({ error: errorMessage })
      return null
    }
  },

  exportChartAsMarkdown: async (chartId: string) => {
    try {
      return await window.electron.sequenceChart.exportMarkdown(chartId)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导出事序图为 Markdown 失败'
      console.error('Failed to export sequence chart as markdown:', error)
      set({ error: errorMessage })
      return null
    }
  },

  importChart: async (jsonContent: string) => {
    try {
      const chart = await window.electron.sequenceChart.import(jsonContent)
      if (chart) {
        set((state) => ({
          charts: [
            {
              id: chart.id,
              name: chart.name,
              description: chart.description,
              thumbnail: chart.thumbnail,
              axisConfig: chart.axisConfig,
              customEventTypes: chart.customEventTypes,
              eventCount: chart.eventCount,
              tags: chart.tags,
              createdAt: chart.createdAt,
              updatedAt: chart.updatedAt,
            },
            ...state.charts,
          ],
        }))
      }
      return chart
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '导入事序图失败'
      console.error('Failed to import sequence chart:', error)
      set({ error: errorMessage })
      return null
    }
  },

  // 时间轴管理
  updateAxisConfig: async (config: Partial<TimelineAxisConfig>) => {
    const { currentChart } = get()
    if (!currentChart) return

    try {
      const updatedChart = await window.electron.sequenceChart.update(currentChart.id, {
        axisConfig: config
      })
      if (updatedChart) {
        set((state) => ({
          currentChart: state.currentChart
            ? {
                ...state.currentChart,
                axisConfig: {
                  ...state.currentChart.axisConfig,
                  ...config
                }
              }
            : null,
        }))
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '更新时间轴配置失败'
      console.error('Failed to update axis config:', error)
      set({ error: errorMessage })
    }
  },

  extendAxis: async (newCellCount: number) => {
    const { currentChart } = get()
    if (!currentChart) return

    if (newCellCount <= currentChart.axisConfig.initialCellCount) return
    if (newCellCount > currentChart.axisConfig.maxCellCount) return

    await get().updateAxisConfig({ initialCellCount: newCellCount })
  },

  // 辅助方法
  getEventById: (eventId: string) => {
    const { currentChart } = get()
    return currentChart?.events.find((e) => e.id === eventId)
  },

  getEventsByCellRange: (cellStart: number, cellEnd: number) => {
    const { currentChart } = get()
    if (!currentChart) return []

    return currentChart.events.filter((event) => {
      const start = event.timeInfo.cellStart || 0
      const end = event.timeInfo.cellEnd || 0
      return start <= cellEnd && end >= cellStart
    })
  },

  getEventTypeById: (typeId: string) => {
    const types = get().getEventTypes()
    return types.find(t => t.id === typeId)
  },

  clearData: () => {
    set({
      charts: [],
      currentChart: null,
      isLoading: false,
      error: null,
      viewMode: 'list',
      zoomScale: 1,
      leftPanelCollapsed: false,
      dragState: {
        isDragging: false,
        dragType: null,
        eventId: null,
        startX: 0,
        startY: 0
      },
      selectedEventIds: [],
      hoveredEventId: null,
      editingEventId: null,
    })
  },

  // 批量设置数据（用于聚合接口）
  setCharts: (charts: SequenceChartMeta[]) => {
    set({ charts, isLoading: false, error: null })
  },
}))
