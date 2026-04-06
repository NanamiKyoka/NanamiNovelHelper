/**
 * 地图状态管理
 * 
 * 新版：支持多边形板块、连接、标注
 */

import { create } from 'zustand'
import { createErrorHandler } from '@utils/error'
import type {
  Map,
  MapMeta,
  MapData,
  MapRegion,
  RegionConnection,
  MapAnnotation,
  CreateMapOptions,
  UpdateMapOptions,
  CreateRegionOptions,
  UpdateRegionOptions,
  CreateConnectionOptions,
  UpdateConnectionOptions,
  CreateAnnotationOptions,
  UpdateAnnotationOptions,
  MapTool,
  HistoryEntry,
  Point
} from '@renderer/types/map'
import {
  generateId,
  createDefaultRegion,
  createDefaultConnection,
  createDefaultAnnotation,
  createDefaultMapData
} from '@renderer/types/map'

const handleError = createErrorHandler('[MapStore]')

// ============================================
// 历史记录管理
// ============================================

const MAX_HISTORY_SIZE = 50

interface HistoryManager {
  history: HistoryEntry[]
  index: number
  
  // 添加快照
  push: (action: string, description: string, snapshot: MapData) => void
  
  // 撤销
  undo: () => HistoryEntry | null
  
  // 重做
  redo: () => HistoryEntry | null
  
  // 是否可以撤销/重做
  canUndo: () => boolean
  canRedo: () => boolean
  
  // 清空
  clear: () => void
}

const createHistoryManager = (): HistoryManager => {
  let history: HistoryEntry[] = []
  let index = -1
  
  return {
    history,
    index,
    
    push: (action: string, description: string, snapshot: MapData) => {
      // 清除当前位置之后的历史
      history = history.slice(0, index + 1)
      
      // 添加新快照
      history.push({
        id: generateId(),
        timestamp: Date.now(),
        action,
        description,
        snapshot: JSON.parse(JSON.stringify(snapshot)) // 深拷贝
      })
      
      // 限制历史大小
      if (history.length > MAX_HISTORY_SIZE) {
        history = history.slice(-MAX_HISTORY_SIZE)
      }
      
      index = history.length - 1
    },
    
    undo: () => {
      if (index > 0) {
        index--
        return history[index]
      }
      return null
    },
    
    redo: () => {
      if (index < history.length - 1) {
        index++
        return history[index]
      }
      return null
    },
    
    canUndo: () => index > 0,
    canRedo: () => index < history.length - 1,
    
    clear: () => {
      history = []
      index = -1
    }
  }
}

// ============================================
// 状态定义
// ============================================

interface MapState {
  // ============================================
  // 地图数据
  // ============================================
  
  // 地图列表
  maps: MapMeta[]
  
  // 当前编辑的地图
  currentMap: Map | null
  
  // 加载状态
  isLoading: boolean
  error: string | null
  
  // ============================================
  // 编辑器状态
  // ============================================
  
  // 当前工具
  tool: MapTool
  
  // 选中的元素
  selectedRegionId: string | null
  selectedConnectionId: string | null
  selectedAnnotationId: string | null
  
  // 视图状态
  zoom: number
  panX: number
  panY: number
  
  // 绘制状态
  isDrawing: boolean
  drawingVertices: Point[]
  
  // 连接绘制状态
  connectingFromId: string | null
  
  // 历史记录
  historyManager: HistoryManager
  canUndo: boolean
  canRedo: boolean
  
  // ============================================
  // 地图管理方法
  // ============================================
  
  loadList: () => Promise<void>
  loadMap: (mapId: string) => Promise<void>
  createMap: (options: CreateMapOptions) => Promise<Map | null>
  updateMap: (mapId: string, updates: UpdateMapOptions) => Promise<void>
  deleteMap: (mapId: string) => Promise<void>
  clearCurrentMap: () => void
  
  // ============================================
  // 板块操作方法
  // ============================================
  
  addRegion: (options: CreateRegionOptions) => MapRegion | null
  updateRegion: (regionId: string, updates: UpdateRegionOptions) => void
  deleteRegion: (regionId: string) => void
  moveRegion: (regionId: string, deltaX: number, deltaY: number) => void
  
  // ============================================
  // 连接操作方法
  // ============================================
  
  addConnection: (options: CreateConnectionOptions) => RegionConnection | null
  updateConnection: (connectionId: string, updates: UpdateConnectionOptions) => void
  deleteConnection: (connectionId: string) => void
  
  // ============================================
  // 标注操作方法
  // ============================================
  
  addAnnotation: (options: CreateAnnotationOptions) => MapAnnotation | null
  updateAnnotation: (annotationId: string, updates: UpdateAnnotationOptions) => void
  deleteAnnotation: (annotationId: string) => void
  
  // ============================================
  // 编辑器状态方法
  // ============================================
  
  setTool: (tool: MapTool) => void
  selectRegion: (regionId: string | null) => void
  selectConnection: (connectionId: string | null) => void
  selectAnnotation: (annotationId: string | null) => void
  clearSelection: () => void
  
  // 视图控制
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  resetView: () => void
  
  // 绘制状态
  startDrawing: () => void
  addDrawingVertex: (point: Point) => void
  finishDrawing: () => MapRegion | null
  cancelDrawing: () => void
  
  // 连接绘制状态
  startConnecting: (regionId: string) => void
  finishConnecting: (targetId: string) => RegionConnection | null
  cancelConnecting: () => void
  
  // ============================================
  // 历史记录方法
  // ============================================
  
  undo: () => void
  redo: () => void
  saveToHistory: (action: string, description: string) => void
  
  // ============================================
  // 保存与同步
  // ============================================
  
  saveCurrentMap: () => Promise<void>
  
  // ============================================
  // 辅助方法
  // ============================================
  
  getMapById: (mapId: string) => MapMeta | undefined
  getRegionById: (regionId: string) => MapRegion | undefined
  clearData: () => void
  setMaps: (maps: MapMeta[]) => void
  reorderMaps: (mapIds: string[]) => Promise<boolean>
  
  // 缩略图
  saveThumbnail: (dataUrl: string) => Promise<void>
  
  // 导入导出
  exportMap: (mapId: string) => Promise<string | null>
  importMap: (jsonContent: string) => Promise<Map | null>
}

// ============================================
// Store 实现
// ============================================

const historyManager = createHistoryManager()

export const useMapStore = create<MapState>((set, get) => ({
  // ============================================
  // 初始状态
  // ============================================
  
  maps: [],
  currentMap: null,
  isLoading: false,
  error: null,
  
  tool: 'select',
  selectedRegionId: null,
  selectedConnectionId: null,
  selectedAnnotationId: null,
  
  zoom: 1,
  panX: 0,
  panY: 0,
  
  isDrawing: false,
  drawingVertices: [],
  connectingFromId: null,
  
  historyManager,
  canUndo: false,
  canRedo: false,
  
  // ============================================
  // 地图管理方法
  // ============================================
  
  loadList: async () => {
    set({ isLoading: true, error: null })
    try {
      const maps = await window.electron.map.getList()
      set({ maps, isLoading: false })
    } catch (error) {
      const message = handleError(error, { fallbackMessage: '加载地图列表失败' })
      set({ error: message, isLoading: false })
    }
  },
  
  loadMap: async (mapId: string) => {
    set({ isLoading: true, error: null })
    try {
      const map = await window.electron.map.get(mapId)
      set({ 
        currentMap: map, 
        isLoading: false,
        // 重置编辑器状态
        tool: 'select',
        selectedRegionId: null,
        selectedConnectionId: null,
        selectedAnnotationId: null,
        zoom: 1,
        panX: 0,
        panY: 0,
        isDrawing: false,
        drawingVertices: [],
        connectingFromId: null
      })
      // 清空历史记录
      historyManager.clear()
      set({ canUndo: false, canRedo: false })
    } catch (error) {
      const message = handleError(error, { fallbackMessage: '加载地图失败' })
      set({ error: message, isLoading: false })
    }
  },
  
  createMap: async (options: CreateMapOptions) => {
    set({ isLoading: true, error: null })
    try {
      const newMap = await window.electron.map.create(options)
      await get().loadList()
      set({ isLoading: false })
      return newMap
    } catch (error) {
      const message = handleError(error, { fallbackMessage: '创建地图失败' })
      set({ error: message, isLoading: false })
      return null
    }
  },
  
  updateMap: async (mapId: string, updates: UpdateMapOptions) => {
    set({ isLoading: true, error: null })
    try {
      const updatedMap = await window.electron.map.update(mapId, updates)
      if (updatedMap) {
        set({ currentMap: updatedMap })
        await get().loadList()
      }
      set({ isLoading: false })
    } catch (error) {
      const message = handleError(error, { fallbackMessage: '更新地图失败' })
      set({ error: message, isLoading: false })
    }
  },
  
  deleteMap: async (mapId: string) => {
    set({ isLoading: true, error: null })
    try {
      const success = await window.electron.map.delete(mapId)
      if (success) {
        if (get().currentMap?.id === mapId) {
          set({ currentMap: null })
        }
        await get().loadList()
      }
      set({ isLoading: false })
    } catch (error) {
      const message = handleError(error, { fallbackMessage: '删除地图失败' })
      set({ error: message, isLoading: false })
    }
  },
  
  clearCurrentMap: () => {
    set({ 
      currentMap: null,
      tool: 'select',
      selectedRegionId: null,
      selectedConnectionId: null,
      selectedAnnotationId: null,
      isDrawing: false,
      drawingVertices: [],
      connectingFromId: null
    })
    historyManager.clear()
    set({ canUndo: false, canRedo: false })
  },
  
  // ============================================
  // 板块操作方法
  // ============================================
  
  addRegion: (options: CreateRegionOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const region = createDefaultRegion(options)
    const newData: MapData = {
      ...currentMap.data,
      regions: [...currentMap.data.regions, region]
    }
    
    // 保存到历史
    get().saveToHistory('addRegion', `创建板块: ${region.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: newData,
        regionCount: newData.regions.length,
        updatedAt: new Date().toISOString()
      }
    })
    
    return region
  },
  
  updateRegion: (regionId: string, updates: UpdateRegionOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const regionIndex = currentMap.data.regions.findIndex(r => r.id === regionId)
    if (regionIndex === -1) return
    
    const oldRegion = currentMap.data.regions[regionIndex]
    const updatedRegion: MapRegion = {
      ...oldRegion,
      ...updates,
      updatedAt: Date.now()
    }
    
    // 如果顶点改变，重新计算中心点
    if (updates.vertices) {
      const { calculateCenter } = require('@renderer/types/map')
      updatedRegion.center = calculateCenter(updates.vertices)
    }
    
    const newRegions = [...currentMap.data.regions]
    newRegions[regionIndex] = updatedRegion
    
    // 保存到历史
    get().saveToHistory('updateRegion', `更新板块: ${updatedRegion.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          regions: newRegions
        },
        updatedAt: new Date().toISOString()
      }
    })
  },
  
  deleteRegion: (regionId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const region = currentMap.data.regions.find(r => r.id === regionId)
    if (!region) return
    
    // 同时删除相关的连接
    const remainingConnections = currentMap.data.connections.filter(
      c => c.sourceId !== regionId && c.targetId !== regionId
    )
    
    const newRegions = currentMap.data.regions.filter(r => r.id !== regionId)
    
    // 保存到历史
    get().saveToHistory('deleteRegion', `删除板块: ${region.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          regions: newRegions,
          connections: remainingConnections
        },
        regionCount: newRegions.length,
        connectionCount: remainingConnections.length,
        updatedAt: new Date().toISOString()
      },
      selectedRegionId: null
    })
  },
  
  moveRegion: (regionId: string, deltaX: number, deltaY: number) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const regionIndex = currentMap.data.regions.findIndex(r => r.id === regionId)
    if (regionIndex === -1) return
    
    const region = currentMap.data.regions[regionIndex]
    const newVertices = region.vertices.map(v => ({
      x: v.x + deltaX,
      y: v.y + deltaY
    }))
    
    const { calculateCenter } = require('@renderer/types/map')
    const newCenter = calculateCenter(newVertices)
    
    const updatedRegion: MapRegion = {
      ...region,
      vertices: newVertices,
      center: newCenter,
      updatedAt: Date.now()
    }
    
    const newRegions = [...currentMap.data.regions]
    newRegions[regionIndex] = updatedRegion
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          regions: newRegions
        },
        updatedAt: new Date().toISOString()
      }
    })
  },
  
  // ============================================
  // 连接操作方法
  // ============================================
  
  addConnection: (options: CreateConnectionOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    // 检查是否已存在相同连接
    const exists = currentMap.data.connections.some(
      c => (c.sourceId === options.sourceId && c.targetId === options.targetId) ||
           (c.sourceId === options.targetId && c.targetId === options.sourceId)
    )
    if (exists) return null
    
    const connection = createDefaultConnection(options)
    const newData: MapData = {
      ...currentMap.data,
      connections: [...currentMap.data.connections, connection]
    }
    
    // 保存到历史
    get().saveToHistory('addConnection', `创建连接`)
    
    set({
      currentMap: {
        ...currentMap,
        data: newData,
        connectionCount: newData.connections.length,
        updatedAt: new Date().toISOString()
      }
    })
    
    return connection
  },
  
  updateConnection: (connectionId: string, updates: UpdateConnectionOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const connectionIndex = currentMap.data.connections.findIndex(c => c.id === connectionId)
    if (connectionIndex === -1) return
    
    const updatedConnection: RegionConnection = {
      ...currentMap.data.connections[connectionIndex],
      ...updates
    }
    
    const newConnections = [...currentMap.data.connections]
    newConnections[connectionIndex] = updatedConnection
    
    // 保存到历史
    get().saveToHistory('updateConnection', `更新连接`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          connections: newConnections
        },
        updatedAt: new Date().toISOString()
      }
    })
  },
  
  deleteConnection: (connectionId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const newConnections = currentMap.data.connections.filter(c => c.id !== connectionId)
    
    // 保存到历史
    get().saveToHistory('deleteConnection', `删除连接`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          connections: newConnections
        },
        connectionCount: newConnections.length,
        updatedAt: new Date().toISOString()
      },
      selectedConnectionId: null
    })
  },
  
  // ============================================
  // 标注操作方法
  // ============================================
  
  addAnnotation: (options: CreateAnnotationOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const annotation = createDefaultAnnotation(options)
    const newData: MapData = {
      ...currentMap.data,
      annotations: [...currentMap.data.annotations, annotation]
    }
    
    // 保存到历史
    get().saveToHistory('addAnnotation', `创建标注`)
    
    set({
      currentMap: {
        ...currentMap,
        data: newData,
        annotationCount: newData.annotations.length,
        updatedAt: new Date().toISOString()
      }
    })
    
    return annotation
  },
  
  updateAnnotation: (annotationId: string, updates: UpdateAnnotationOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const annotationIndex = currentMap.data.annotations.findIndex(a => a.id === annotationId)
    if (annotationIndex === -1) return
    
    const updatedAnnotation: MapAnnotation = {
      ...currentMap.data.annotations[annotationIndex],
      ...updates
    }
    
    const newAnnotations = [...currentMap.data.annotations]
    newAnnotations[annotationIndex] = updatedAnnotation
    
    // 保存到历史
    get().saveToHistory('updateAnnotation', `更新标注`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          annotations: newAnnotations
        },
        updatedAt: new Date().toISOString()
      }
    })
  },
  
  deleteAnnotation: (annotationId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const newAnnotations = currentMap.data.annotations.filter(a => a.id !== annotationId)
    
    // 保存到历史
    get().saveToHistory('deleteAnnotation', `删除标注`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          annotations: newAnnotations
        },
        annotationCount: newAnnotations.length,
        updatedAt: new Date().toISOString()
      },
      selectedAnnotationId: null
    })
  },
  
  // ============================================
  // 编辑器状态方法
  // ============================================
  
  setTool: (tool: MapTool) => {
    set({ 
      tool,
      // 切换到绘制工具时自动开始绘制
      isDrawing: tool === 'draw',
      drawingVertices: [],
      connectingFromId: null
    })
  },
  
  selectRegion: (regionId: string | null) => {
    set({ 
      selectedRegionId: regionId,
      selectedConnectionId: null,
      selectedAnnotationId: null
    })
  },
  
  selectConnection: (connectionId: string | null) => {
    set({ 
      selectedRegionId: null,
      selectedConnectionId: connectionId,
      selectedAnnotationId: null
    })
  },
  
  selectAnnotation: (annotationId: string | null) => {
    set({ 
      selectedRegionId: null,
      selectedConnectionId: null,
      selectedAnnotationId: annotationId
    })
  },
  
  clearSelection: () => {
    set({
      selectedRegionId: null,
      selectedConnectionId: null,
      selectedAnnotationId: null
    })
  },
  
  // 视图控制
  setZoom: (zoom: number) => {
    const clampedZoom = Math.max(0.1, Math.min(5, zoom))
    set({ zoom: clampedZoom })
  },
  
  setPan: (panX: number, panY: number) => {
    set({ panX, panY })
  },
  
  resetView: () => {
    set({ zoom: 1, panX: 0, panY: 0 })
  },
  
  // 绘制状态
  startDrawing: () => {
    set({ 
      isDrawing: true, 
      drawingVertices: [],
      tool: 'draw'
    })
  },
  
  addDrawingVertex: (point: Point) => {
    set(state => ({
      drawingVertices: [...state.drawingVertices, point]
    }))
  },
  
  finishDrawing: () => {
    const vertices = get().drawingVertices
    if (vertices.length < 3) {
      set({ isDrawing: false, drawingVertices: [] })
      return null
    }
    
    const region = get().addRegion({ vertices })
    set({ isDrawing: false, drawingVertices: [] })
    
    if (region) {
      get().selectRegion(region.id)
    }
    
    return region
  },
  
  cancelDrawing: () => {
    set({ isDrawing: false, drawingVertices: [] })
  },
  
  // 连接绘制状态
  startConnecting: (regionId: string) => {
    set({ 
      connectingFromId: regionId,
      tool: 'connect'
    })
  },
  
  finishConnecting: (targetId: string) => {
    const sourceId = get().connectingFromId
    if (!sourceId || sourceId === targetId) {
      set({ connectingFromId: null })
      return null
    }
    
    const connection = get().addConnection({
      sourceId,
      targetId
    })
    
    set({ connectingFromId: null })
    
    if (connection) {
      get().selectConnection(connection.id)
    }
    
    return connection
  },
  
  cancelConnecting: () => {
    set({ connectingFromId: null })
  },
  
  // ============================================
  // 历史记录方法
  // ============================================
  
  undo: () => {
    const entry = historyManager.undo()
    if (entry) {
      const currentMap = get().currentMap
      if (currentMap) {
        set({
          currentMap: {
            ...currentMap,
            data: JSON.parse(JSON.stringify(entry.snapshot)),
            updatedAt: new Date().toISOString()
          },
          canUndo: historyManager.canUndo(),
          canRedo: historyManager.canRedo()
        })
      }
    }
  },
  
  redo: () => {
    const entry = historyManager.redo()
    if (entry) {
      const currentMap = get().currentMap
      if (currentMap) {
        set({
          currentMap: {
            ...currentMap,
            data: JSON.parse(JSON.stringify(entry.snapshot)),
            updatedAt: new Date().toISOString()
          },
          canUndo: historyManager.canUndo(),
          canRedo: historyManager.canRedo()
        })
      }
    }
  },
  
  saveToHistory: (action: string, description: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    historyManager.push(action, description, currentMap.data)
    set({
      canUndo: historyManager.canUndo(),
      canRedo: historyManager.canRedo()
    })
  },
  
  // ============================================
  // 保存与同步
  // ============================================
  
  saveCurrentMap: async () => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    try {
      await window.electron.map.update(currentMap.id, { data: currentMap.data })
      await get().loadList()
    } catch (error) {
      handleError(error, { fallbackMessage: '保存地图失败' })
    }
  },
  
  // ============================================
  // 辅助方法
  // ============================================
  
  getMapById: (mapId: string) => {
    return get().maps.find(m => m.id === mapId)
  },
  
  getRegionById: (regionId: string) => {
    return get().currentMap?.data.regions.find(r => r.id === regionId)
  },
  
  clearData: () => {
    set({ 
      maps: [], 
      currentMap: null, 
      isLoading: false, 
      error: null,
      tool: 'select',
      selectedRegionId: null,
      selectedConnectionId: null,
      selectedAnnotationId: null,
      zoom: 1,
      panX: 0,
      panY: 0,
      isDrawing: false,
      drawingVertices: [],
      connectingFromId: null
    })
    historyManager.clear()
    set({ canUndo: false, canRedo: false })
  },
  
  setMaps: (maps: MapMeta[]) => {
    set({ maps })
  },
  
  reorderMaps: async (mapIds: string[]) => {
    try {
      return await window.electron.map.reorderMaps(mapIds)
    } catch (error) {
      handleError(error, { fallbackMessage: '重新排序地图失败' })
      return false
    }
  },
  
  saveThumbnail: async (dataUrl: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    try {
      await window.electron.map.saveThumbnail(currentMap.id, dataUrl)
      await get().loadList()
    } catch (error) {
      handleError(error, { fallbackMessage: '保存缩略图失败' })
    }
  },
  
  exportMap: async (mapId: string) => {
    try {
      return await window.electron.map.export(mapId)
    } catch (error) {
      handleError(error, { fallbackMessage: '导出地图失败' })
      return null
    }
  },
  
  importMap: async (jsonContent: string) => {
    try {
      const importedMap = await window.electron.map.import(jsonContent)
      if (importedMap) {
        await get().loadList()
      }
      return importedMap
    } catch (error) {
      handleError(error, { fallbackMessage: '导入地图失败' })
      return null
    }
  }
}))