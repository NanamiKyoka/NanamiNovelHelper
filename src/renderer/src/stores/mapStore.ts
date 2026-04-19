/**
 * 地图编辑器状态管理
 * 
 * 功能：
 * - 地图管理（CRUD）
 * - 板块操作（CRUD、移动、吸附）
 * - 内部元素操作（CRUD、嵌套）
 * - 连接操作
 * - 视图层级管理（钻取模式）
 * - 历史记录（撤销/重做）
 * - AI 辅助功能
 */

import { create } from 'zustand'
import { createErrorHandler } from '@utils/error'
import type {
  Map,
  MapMeta,
  MapData,
  Chunk,
  MapElement,
  ChunkConnection,
  ViewLevel,
  EditorTool,
  EdgePosition,
  Point,
  CreateChunkOptions,
  UpdateChunkOptions,
  CreateElementOptions,
  UpdateElementOptions,
  CreateConnectionOptions,
  UpdateConnectionOptions,
  CreateMapOptions,
  UpdateMapOptions,
  HistoryEntry,
  AiGenerateChunkResponse,
  AiConnectionSuggestionResponse,
  AiFillChunkResponse,
  ChunkType,
  ElementType
} from '@renderer/types/map'
import {
  generateId,
  createDefaultChunk,
  createDefaultElement,
  createDefaultConnection,
  createDefaultMapData,
  checkEdgeCompatibility,
  findElementById,
  updateElementInTree,
  deleteElementFromTree,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_ELEMENT_SIZE,
  DEFAULT_SNAP_THRESHOLD
} from '@renderer/types/map'

const handleError = createErrorHandler('[MapStore]')

// ============================================
// 历史记录管理
// ============================================

const MAX_HISTORY_SIZE = 50

interface HistoryManager {
  history: HistoryEntry[]
  index: number
  push: (action: string, description: string, snapshot: MapData) => void
  undo: () => HistoryEntry | null
  redo: () => HistoryEntry | null
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
}

const createHistoryManager = (): HistoryManager => {
  let history: HistoryEntry[] = []
  let index = -1
  
  return {
    history,
    index,
    push: (action: string, description: string, snapshot: MapData) => {
      history = history.slice(0, index + 1)
      history.push({
        id: generateId(),
        timestamp: Date.now(),
        action,
        description,
        snapshot: JSON.parse(JSON.stringify(snapshot))
      })
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
  // 地图数据
  maps: MapMeta[]
  currentMap: Map | null
  isLoading: boolean
  error: string | null
  
  // 编辑器状态
  tool: EditorTool
  selectedChunkId: string | null
  selectedElementId: string | null
  selectedConnectionId: string | null
  
  // 视图状态
  zoom: number
  panX: number
  panY: number
  
  // 视图层级（钻取模式）
  viewStack: ViewLevel[]
  
  // 连接绘制状态
  isConnecting: boolean
  connectingFrom: { chunkId: string; edge: EdgePosition } | null
  
  // 吸附设置
  snapEnabled: boolean
  snapThreshold: number
  
  // 历史记录
  historyManager: HistoryManager
  canUndo: boolean
  canRedo: boolean
  
  // AI 状态
  isAiGenerating: boolean
  aiSuggestion: AiConnectionSuggestionResponse | null
  
  // 地图管理方法
  loadList: () => Promise<void>
  loadMap: (mapId: string) => Promise<void>
  createMap: (options: CreateMapOptions) => Promise<Map | null>
  updateMap: (mapId: string, updates: UpdateMapOptions) => Promise<void>
  deleteMap: (mapId: string) => Promise<boolean>
  clearCurrentMap: () => void
  
  // 板块操作方法
  addChunk: (options: CreateChunkOptions) => Chunk | null
  updateChunk: (chunkId: string, updates: UpdateChunkOptions) => void
  deleteChunk: (chunkId: string) => void
  moveChunk: (chunkId: string, position: Point) => void
  duplicateChunk: (chunkId: string) => Chunk | null
  
  // 内部元素操作方法
  addElement: (parentChunkId: string, parentElementId: string | null, options: CreateElementOptions) => MapElement | null
  updateElement: (elementId: string, updates: UpdateElementOptions) => void
  deleteElement: (elementId: string) => void
  moveElement: (elementId: string, position: Point) => void
  
  // 连接操作方法
  addConnection: (options: CreateConnectionOptions) => ChunkConnection | null
  updateConnection: (connectionId: string, updates: UpdateConnectionOptions) => void
  deleteConnection: (connectionId: string) => void
  
  // 编辑器状态方法
  setTool: (tool: EditorTool) => void
  selectChunk: (chunkId: string | null) => void
  selectElement: (elementId: string | null) => void
  selectConnection: (connectionId: string | null) => void
  clearSelection: () => void
  
  // 视图控制
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  resetView: () => void
  
  // 视图层级方法
  enterChunk: (chunkId: string) => void
  enterElement: (elementId: string, elementName: string) => void
  exitLevel: () => void
  goToLevel: (levelIndex: number) => void
  getCurrentElements: () => MapElement[]
  
  // 连接绘制方法
  startConnecting: (chunkId: string, edge: EdgePosition) => void
  finishConnecting: (targetChunkId: string, targetEdge: EdgePosition) => ChunkConnection | null
  cancelConnecting: () => void
  
  // 吸附方法
  setSnapEnabled: (enabled: boolean) => void
  findSnapPoint: (position: Point, excludeChunkId?: string) => Point | null
  
  // 历史记录方法
  undo: () => void
  redo: () => void
  saveToHistory: (action: string, description: string) => void
  
  // 保存与同步
  saveCurrentMap: () => Promise<void>
  
  // 辅助方法
  getMapById: (mapId: string) => MapMeta | undefined
  getChunkById: (chunkId: string) => Chunk | undefined
  getElementById: (elementId: string) => MapElement | null
  getConnectionById: (connectionId: string) => ChunkConnection | undefined
  clearData: () => void
  setMaps: (maps: MapMeta[]) => void
  reorderMaps: (mapIds: string[]) => Promise<boolean>
  
  // 缩略图
  saveThumbnail: (dataUrl: string) => Promise<void>
  
  // 导入导出
  exportMap: (mapId: string) => Promise<string | null>
  importMap: (jsonContent: string) => Promise<Map | null>
  
  // AI 方法
  aiGenerateChunk: (description: string, position?: Point) => Promise<Chunk | null>
  aiGetConnectionSuggestion: (sourceChunkId: string, sourceEdge: EdgePosition, targetChunkId: string, targetEdge: EdgePosition) => Promise<AiConnectionSuggestionResponse | null>
  aiFillChunk: (chunkId: string) => Promise<MapElement[] | null>
  clearAiSuggestion: () => void
}

// ============================================
// Store 实现
// ============================================

const historyManager = createHistoryManager()

export const useMapStore = create<MapState>((set, get) => ({
  // 初始状态
  maps: [],
  currentMap: null,
  isLoading: false,
  error: null,
  
  tool: 'select',
  selectedChunkId: null,
  selectedElementId: null,
  selectedConnectionId: null,
  
  zoom: 1,
  panX: 0,
  panY: 0,
  
  viewStack: [{ type: 'world', id: 'world', name: '世界视图' }],
  
  isConnecting: false,
  connectingFrom: null,
  
  snapEnabled: true,
  snapThreshold: DEFAULT_SNAP_THRESHOLD,
  
  historyManager,
  canUndo: false,
  canRedo: false,
  
  isAiGenerating: false,
  aiSuggestion: null,
  
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
        tool: 'select',
        selectedChunkId: null,
        selectedElementId: null,
        selectedConnectionId: null,
        zoom: 1,
        panX: 0,
        panY: 0,
        viewStack: [{ type: 'world', id: 'world', name: '世界视图' }],
        isConnecting: false,
        connectingFrom: null
      })
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
      return success
    } catch (error) {
      const message = handleError(error, { fallbackMessage: '删除地图失败' })
      set({ error: message, isLoading: false })
      return false
    }
  },
  
  clearCurrentMap: () => {
    set({ 
      currentMap: null,
      tool: 'select',
      selectedChunkId: null,
      selectedElementId: null,
      selectedConnectionId: null,
      viewStack: [{ type: 'world', id: 'world', name: '世界视图' }],
      isConnecting: false,
      connectingFrom: null
    })
    historyManager.clear()
    set({ canUndo: false, canRedo: false })
  },
  
  // ============================================
  // 板块操作方法
  // ============================================
  
  addChunk: (options: CreateChunkOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const chunk = createDefaultChunk(options)
    const newData: MapData = {
      ...currentMap.data,
      chunks: [...currentMap.data.chunks, chunk]
    }
    
    get().saveToHistory('addChunk', `创建板块: ${chunk.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: newData,
        chunkCount: newData.chunks.length,
        updatedAt: new Date().toISOString()
      }
    })
    
    return chunk
  },
  
  updateChunk: (chunkId: string, updates: UpdateChunkOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const chunkIndex = currentMap.data.chunks.findIndex(c => c.id === chunkId)
    if (chunkIndex === -1) return
    
    const oldChunk = currentMap.data.chunks[chunkIndex]
    const updatedChunk: Chunk = {
      ...oldChunk,
      ...updates,
      updatedAt: Date.now()
    }
    
    const newChunks = [...currentMap.data.chunks]
    newChunks[chunkIndex] = updatedChunk
    
    get().saveToHistory('updateChunk', `更新板块: ${updatedChunk.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          chunks: newChunks
        },
        updatedAt: new Date().toISOString()
      }
    })
  },
  
  deleteChunk: (chunkId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const chunk = currentMap.data.chunks.find(c => c.id === chunkId)
    if (!chunk) return
    
    const remainingConnections = currentMap.data.connections.filter(
      c => c.sourceChunkId !== chunkId && c.targetChunkId !== chunkId
    )
    
    const newChunks = currentMap.data.chunks.filter(c => c.id !== chunkId)
    
    get().saveToHistory('deleteChunk', `删除板块: ${chunk.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          chunks: newChunks,
          connections: remainingConnections
        },
        chunkCount: newChunks.length,
        connectionCount: remainingConnections.length,
        updatedAt: new Date().toISOString()
      },
      selectedChunkId: null
    })
  },
  
  moveChunk: (chunkId: string, position: Point) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const chunkIndex = currentMap.data.chunks.findIndex(c => c.id === chunkId)
    if (chunkIndex === -1) return
    
    const chunk = currentMap.data.chunks[chunkIndex]
    let finalPosition = position
    
    if (get().snapEnabled) {
      const snapPoint = get().findSnapPoint(position, chunkId)
      if (snapPoint) {
        finalPosition = snapPoint
      }
    }
    
    const updatedChunk: Chunk = {
      ...chunk,
      position: finalPosition,
      updatedAt: Date.now()
    }
    
    const newChunks = [...currentMap.data.chunks]
    newChunks[chunkIndex] = updatedChunk
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          chunks: newChunks
        },
        updatedAt: new Date().toISOString()
      }
    })
  },
  
  duplicateChunk: (chunkId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const chunk = currentMap.data.chunks.find(c => c.id === chunkId)
    if (!chunk) return null
    
    const newChunk: Chunk = {
      ...JSON.parse(JSON.stringify(chunk)),
      id: generateId(),
      name: `${chunk.name} (副本)`,
      position: {
        x: chunk.position.x + 20,
        y: chunk.position.y + 20
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    
    const newData: MapData = {
      ...currentMap.data,
      chunks: [...currentMap.data.chunks, newChunk]
    }
    
    get().saveToHistory('duplicateChunk', `复制板块: ${newChunk.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: newData,
        chunkCount: newData.chunks.length,
        updatedAt: new Date().toISOString()
      }
    })
    
    return newChunk
  },
  
  // ============================================
  // 内部元素操作方法
  // ============================================
  
  addElement: (parentChunkId: string, parentElementId: string | null, options: CreateElementOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const chunkIndex = currentMap.data.chunks.findIndex(c => c.id === parentChunkId)
    if (chunkIndex === -1) return null
    
    const element = createDefaultElement(options)
    const chunk = currentMap.data.chunks[chunkIndex]
    
    if (parentElementId) {
      const updatedChildren = [...chunk.children]
      const addToParent = (elements: MapElement[]): MapElement[] => {
        return elements.map(el => {
          if (el.id === parentElementId) {
            return { ...el, children: [...el.children, element] }
          }
          if (el.children.length > 0) {
            return { ...el, children: addToParent(el.children) }
          }
          return el
        })
      }
      chunk.children = addToParent(updatedChildren)
    } else {
      chunk.children = [...chunk.children, element]
    }
    
    const newChunks = [...currentMap.data.chunks]
    newChunks[chunkIndex] = { ...chunk, updatedAt: Date.now() }
    
    get().saveToHistory('addElement', `添加元素: ${element.name}`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          chunks: newChunks
        },
        updatedAt: new Date().toISOString()
      }
    })
    
    return element
  },
  
  updateElement: (elementId: string, updates: UpdateElementOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const newChunks = currentMap.data.chunks.map(chunk => {
      const updatedChildren = updateElementInTree(chunk.children, elementId, updates)
      if (updatedChildren !== chunk.children) {
        return { ...chunk, children: updatedChildren, updatedAt: Date.now() }
      }
      return chunk
    })
    
    get().saveToHistory('updateElement', `更新元素`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          chunks: newChunks
        },
        updatedAt: new Date().toISOString()
      }
    })
  },
  
  deleteElement: (elementId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const newChunks = currentMap.data.chunks.map(chunk => {
      const updatedChildren = deleteElementFromTree(chunk.children, elementId)
      if (updatedChildren.length !== chunk.children.length || 
          JSON.stringify(updatedChildren) !== JSON.stringify(chunk.children)) {
        return { ...chunk, children: updatedChildren, updatedAt: Date.now() }
      }
      return chunk
    })
    
    get().saveToHistory('deleteElement', `删除元素`)
    
    set({
      currentMap: {
        ...currentMap,
        data: {
          ...currentMap.data,
          chunks: newChunks
        },
        updatedAt: new Date().toISOString()
      },
      selectedElementId: null
    })
  },
  
  moveElement: (elementId: string, position: Point) => {
    get().updateElement(elementId, { position })
  },
  
  // ============================================
  // 连接操作方法
  // ============================================
  
  addConnection: (options: CreateConnectionOptions) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const exists = currentMap.data.connections.some(
      c => (c.sourceChunkId === options.sourceChunkId && c.targetChunkId === options.targetChunkId) ||
           (c.sourceChunkId === options.targetChunkId && c.targetChunkId === options.sourceChunkId)
    )
    if (exists) return null
    
    const connection = createDefaultConnection(options)
    const newData: MapData = {
      ...currentMap.data,
      connections: [...currentMap.data.connections, connection]
    }
    
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
    
    const updatedConnection: ChunkConnection = {
      ...currentMap.data.connections[connectionIndex],
      ...updates
    }
    
    const newConnections = [...currentMap.data.connections]
    newConnections[connectionIndex] = updatedConnection
    
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
  // 编辑器状态方法
  // ============================================
  
  setTool: (tool: EditorTool) => {
    set({ 
      tool,
      isConnecting: tool === 'connect',
      connectingFrom: null
    })
  },
  
  selectChunk: (chunkId: string | null) => {
    set({ 
      selectedChunkId: chunkId,
      selectedElementId: null,
      selectedConnectionId: null
    })
  },
  
  selectElement: (elementId: string | null) => {
    set({ 
      selectedChunkId: null,
      selectedElementId: elementId,
      selectedConnectionId: null
    })
  },
  
  selectConnection: (connectionId: string | null) => {
    set({ 
      selectedChunkId: null,
      selectedElementId: null,
      selectedConnectionId: connectionId
    })
  },
  
  clearSelection: () => {
    set({
      selectedChunkId: null,
      selectedElementId: null,
      selectedConnectionId: null
    })
  },
  
  // ============================================
  // 视图控制
  // ============================================
  
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
  
  // ============================================
  // 视图层级方法
  // ============================================
  
  enterChunk: (chunkId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const chunk = currentMap.data.chunks.find(c => c.id === chunkId)
    if (!chunk) return
    
    set(state => ({
      viewStack: [...state.viewStack, { type: 'chunk', id: chunkId, name: chunk.name }],
      selectedChunkId: null,
      selectedElementId: null,
      selectedConnectionId: null
    }))
  },
  
  enterElement: (elementId: string, elementName: string) => {
    set(state => ({
      viewStack: [...state.viewStack, { type: 'element', id: elementId, name: elementName }],
      selectedChunkId: null,
      selectedElementId: null,
      selectedConnectionId: null
    }))
  },
  
  exitLevel: () => {
    set(state => {
      if (state.viewStack.length <= 1) return state
      const newStack = state.viewStack.slice(0, -1)
      return {
        viewStack: newStack,
        selectedChunkId: null,
        selectedElementId: null,
        selectedConnectionId: null
      }
    })
  },
  
  goToLevel: (levelIndex: number) => {
    set(state => {
      if (levelIndex < 0 || levelIndex >= state.viewStack.length) return state
      return {
        viewStack: state.viewStack.slice(0, levelIndex + 1),
        selectedChunkId: null,
        selectedElementId: null,
        selectedConnectionId: null
      }
    })
  },
  
  getCurrentElements: () => {
    const currentMap = get().currentMap
    const viewStack = get().viewStack
    
    if (!currentMap) return []
    
    if (viewStack.length === 1) return []
    
    const currentLevel = viewStack[viewStack.length - 1]
    
    if (currentLevel.type === 'chunk') {
      const chunk = currentMap.data.chunks.find(c => c.id === currentLevel.id)
      return chunk?.children || []
    }
    
    if (currentLevel.type === 'element') {
      const element = findElementById(
        currentMap.data.chunks.flatMap(c => c.children),
        currentLevel.id
      )
      return element?.children || []
    }
    
    return []
  },
  
  // ============================================
  // 连接绘制方法
  // ============================================
  
  startConnecting: (chunkId: string, edge: EdgePosition) => {
    set({
      isConnecting: true,
      connectingFrom: { chunkId, edge },
      tool: 'connect'
    })
  },
  
  finishConnecting: (targetChunkId: string, targetEdge: EdgePosition) => {
    const { connectingFrom, currentMap } = get()
    if (!connectingFrom || !currentMap) {
      set({ isConnecting: false, connectingFrom: null })
      return null
    }
    
    if (connectingFrom.chunkId === targetChunkId) {
      set({ isConnecting: false, connectingFrom: null })
      return null
    }
    
    const sourceChunk = currentMap.data.chunks.find(c => c.id === connectingFrom.chunkId)
    const targetChunk = currentMap.data.chunks.find(c => c.id === targetChunkId)
    
    if (!sourceChunk || !targetChunk) {
      set({ isConnecting: false, connectingFrom: null })
      return null
    }
    
    const isCompatible = checkEdgeCompatibility(
      sourceChunk, connectingFrom.edge,
      targetChunk, targetEdge
    )
    
    if (!isCompatible) {
      set({ isConnecting: false, connectingFrom: null })
      return null
    }
    
    const connection = get().addConnection({
      sourceChunkId: connectingFrom.chunkId,
      sourceEdge: connectingFrom.edge,
      targetChunkId,
      targetEdge
    })
    
    set({ isConnecting: false, connectingFrom: null })
    return connection
  },
  
  cancelConnecting: () => {
    set({ isConnecting: false, connectingFrom: null })
  },
  
  // ============================================
  // 吸附方法
  // ============================================
  
  setSnapEnabled: (enabled: boolean) => {
    set({ snapEnabled: enabled })
  },
  
  findSnapPoint: (position: Point, excludeChunkId?: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const threshold = get().snapThreshold
    const chunks = currentMap.data.chunks.filter(c => c.id !== excludeChunkId)
    
    for (const chunk of chunks) {
      const edges: EdgePosition[] = ['top', 'right', 'bottom', 'left']
      
      for (const edge of edges) {
        let snapPoint: Point
        
        switch (edge) {
          case 'top':
            snapPoint = { x: chunk.position.x + chunk.size.width / 2, y: chunk.position.y }
            break
          case 'right':
            snapPoint = { x: chunk.position.x + chunk.size.width, y: chunk.position.y + chunk.size.height / 2 }
            break
          case 'bottom':
            snapPoint = { x: chunk.position.x + chunk.size.width / 2, y: chunk.position.y + chunk.size.height }
            break
          case 'left':
            snapPoint = { x: chunk.position.x, y: chunk.position.y + chunk.size.height / 2 }
            break
        }
        
        const distance = Math.sqrt(
          Math.pow(position.x - snapPoint.x, 2) + 
          Math.pow(position.y - snapPoint.y, 2)
        )
        
        if (distance < threshold) {
          return snapPoint
        }
      }
    }
    
    return null
  },
  
  // ============================================
  // 历史记录方法
  // ============================================
  
  undo: () => {
    const entry = historyManager.undo()
    if (entry && get().currentMap) {
      set(state => ({
        currentMap: state.currentMap ? {
          ...state.currentMap,
          data: entry.snapshot,
          updatedAt: new Date().toISOString()
        } : null,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo()
      }))
    }
  },
  
  redo: () => {
    const entry = historyManager.redo()
    if (entry && get().currentMap) {
      set(state => ({
        currentMap: state.currentMap ? {
          ...state.currentMap,
          data: entry.snapshot,
          updatedAt: new Date().toISOString()
        } : null,
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo()
      }))
    }
  },
  
  saveToHistory: (action: string, description: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    historyManager.push(action, description, currentMap.data)
    set({ canUndo: historyManager.canUndo(), canRedo: historyManager.canRedo() })
  },
  
  // ============================================
  // 保存与同步
  // ============================================
  
  saveCurrentMap: async () => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    try {
      await window.electron.map.update(currentMap.id, { data: currentMap.data })
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
  
  getChunkById: (chunkId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return undefined
    return currentMap.data.chunks.find(c => c.id === chunkId)
  },
  
  getElementById: (elementId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    return findElementById(
      currentMap.data.chunks.flatMap(c => c.children),
      elementId
    )
  },
  
  getConnectionById: (connectionId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return undefined
    return currentMap.data.connections.find(c => c.id === connectionId)
  },
  
  clearData: () => {
    set({
      maps: [],
      currentMap: null,
      tool: 'select',
      selectedChunkId: null,
      selectedElementId: null,
      selectedConnectionId: null,
      viewStack: [{ type: 'world', id: 'world', name: '世界视图' }],
      isConnecting: false,
      connectingFrom: null
    })
    historyManager.clear()
    set({ canUndo: false, canRedo: false })
  },
  
  setMaps: (maps: MapMeta[]) => {
    set({ maps })
  },
  
  reorderMaps: async (mapIds: string[]) => {
    set({ isLoading: true })
    try {
      const reorderedMaps = mapIds
        .map(id => get().maps.find(m => m.id === id))
        .filter((m): m is MapMeta => m !== undefined)
      
      set({ maps: reorderedMaps, isLoading: false })
      return true
    } catch (error) {
      handleError(error, { fallbackMessage: '重排序失败' })
      set({ isLoading: false })
      return false
    }
  },
  
  // ============================================
  // 缩略图
  // ============================================
  
  saveThumbnail: async (dataUrl: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    try {
      const thumbnailPath = await window.electron.map.saveThumbnail(currentMap.id, dataUrl)
      if (thumbnailPath) {
        set(state => ({
          currentMap: state.currentMap ? {
            ...state.currentMap,
            thumbnail: thumbnailPath
          } : null
        }))
        await get().loadList()
      }
    } catch (error) {
      handleError(error, { fallbackMessage: '保存缩略图失败' })
    }
  },
  
  // ============================================
  // 导入导出
  // ============================================
  
  exportMap: async (mapId: string) => {
    try {
      const filePath = await window.electron.map.exportMap(mapId)
      return filePath
    } catch (error) {
      handleError(error, { fallbackMessage: '导出地图失败' })
      return null
    }
  },
  
  importMap: async (jsonContent: string) => {
    try {
      const map = await window.electron.map.importMap(jsonContent)
      if (map) {
        await get().loadList()
      }
      return map
    } catch (error) {
      handleError(error, { fallbackMessage: '导入地图失败' })
      return null
    }
  },
  
  // ============================================
  // AI 方法
  // ============================================
  
  aiGenerateChunk: async (description: string, position?: Point) => {
    set({ isAiGenerating: true })
    
    try {
      const response = await window.electron.ai.generateChunk({ description })
      
      const chunk = get().addChunk({
        name: response.name,
        description: response.description,
        chunkType: response.chunkType,
        position: position || { x: 400, y: 300 },
        edges: {
          top: { edge: 'top', allowedTypes: response.edges.top },
          right: { edge: 'right', allowedTypes: response.edges.right },
          bottom: { edge: 'bottom', allowedTypes: response.edges.bottom },
          left: { edge: 'left', allowedTypes: response.edges.left }
        }
      })
      
      set({ isAiGenerating: false })
      return chunk
    } catch (error) {
      handleError(error, { fallbackMessage: 'AI 生成板块失败' })
      set({ isAiGenerating: false })
      return null
    }
  },
  
  aiGetConnectionSuggestion: async (
    sourceChunkId: string,
    sourceEdge: EdgePosition,
    targetChunkId: string,
    targetEdge: EdgePosition
  ) => {
    set({ isAiGenerating: true })
    
    try {
      const response = await window.electron.ai.connectionSuggestion({
        sourceChunkId,
        sourceEdge,
        targetChunkId,
        targetEdge
      })
      
      set({ isAiGenerating: false, aiSuggestion: response })
      return response
    } catch (error) {
      handleError(error, { fallbackMessage: 'AI 获取连接建议失败' })
      set({ isAiGenerating: false })
      return null
    }
  },
  
  aiFillChunk: async (chunkId: string) => {
    set({ isAiGenerating: true })
    
    try {
      const response = await window.electron.ai.fillChunk({ chunkId })
      
      const elements: MapElement[] = []
      
      for (const elem of response.elements) {
        const element = get().addElement(chunkId, null, {
          name: elem.name,
          description: elem.description,
          elementType: elem.elementType,
          position: elem.position,
          size: elem.size
        })
        if (element) elements.push(element)
      }
      
      set({ isAiGenerating: false })
      return elements
    } catch (error) {
      handleError(error, { fallbackMessage: 'AI 填充板块失败' })
      set({ isAiGenerating: false })
      return null
    }
  },
  
  clearAiSuggestion: () => {
    set({ aiSuggestion: null })
  }
}))
