/**
 * 地图编辑器状态管理
 * 
 * 功能：
 * - 地图管理（CRUD）
 * - 板块操作（CRUD、六边形网格布局）
 * - 内部元素操作（CRUD、嵌套）
 * - 连接操作
 * - 视图层级管理（钻取模式）
 * - 历史记录（撤销/重做）
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
  HexEdge,
  HexPoint,
  Point,
  CreateChunkOptions,
  UpdateChunkOptions,
  CreateElementOptions,
  UpdateElementOptions,
  CreateConnectionOptions,
  UpdateConnectionOptions,
  CreateMapOptions,
  UpdateMapOptions,
  HistoryEntry
} from '@renderer/types/map'
import {
  generateId,
  createDefaultChunk,
  createDefaultElement,
  createDefaultConnection,
  createDefaultMapData,
  hexToPixel,
  pixelToHex,
  hexDistance,
  getHexNeighbors,
  checkHexEdgeCompatibility,
  findBestEdges,
  findElementById,
  updateElementInTree,
  deleteElementFromTree,
  HEX_SIZE
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
  maps: MapMeta[]
  currentMap: Map | null
  isLoading: boolean
  error: string | null
  
  tool: EditorTool
  selectedChunkId: string | null
  selectedElementId: string | null
  selectedConnectionId: string | null
  
  zoom: number
  panX: number
  panY: number
  
  viewStack: ViewLevel[]
  
  isConnecting: boolean
  connectingFrom: { chunkId: string; edge: HexEdge } | null
  
  historyManager: HistoryManager
  canUndo: boolean
  canRedo: boolean
  
  loadList: () => Promise<void>
  loadMap: (mapId: string) => Promise<void>
  createMap: (options: CreateMapOptions) => Promise<Map | null>
  updateMap: (mapId: string, updates: UpdateMapOptions) => Promise<void>
  deleteMap: (mapId: string) => Promise<boolean>
  clearCurrentMap: () => void
  
  addChunk: (options: CreateChunkOptions) => Chunk | null
  updateChunk: (chunkId: string, updates: UpdateChunkOptions) => void
  deleteChunk: (chunkId: string) => void
  moveChunkToHex: (chunkId: string, hexPosition: HexPoint) => void
  duplicateChunk: (chunkId: string) => Chunk | null
  
  addElement: (parentChunkId: string, parentElementId: string | null, options: CreateElementOptions) => MapElement | null
  updateElement: (elementId: string, updates: UpdateElementOptions) => void
  deleteElement: (elementId: string) => void
  moveElementToHex: (elementId: string, hexPosition: HexPoint) => void
  findNearestEmptyHexForElement: (parentChunkId: string, parentElementId: string | null) => HexPoint | null
  
  addConnection: (options: CreateConnectionOptions) => ChunkConnection | null
  connectChunks: (sourceChunkId: string, targetChunkId: string) => ChunkConnection | null
  updateConnection: (connectionId: string, updates: UpdateConnectionOptions) => void
  deleteConnection: (connectionId: string) => void
  
  setTool: (tool: EditorTool) => void
  selectChunk: (chunkId: string | null) => void
  selectElement: (elementId: string | null) => void
  selectConnection: (connectionId: string | null) => void
  clearSelection: () => void
  
  setZoom: (zoom: number) => void
  setPan: (panX: number, panY: number) => void
  resetView: () => void
  
  enterChunk: (chunkId: string) => void
  enterElement: (elementId: string, elementName: string) => void
  exitLevel: () => void
  goToLevel: (levelIndex: number) => void
  getCurrentElements: () => MapElement[]
  
  startConnecting: (chunkId: string, edge: HexEdge) => void
  finishConnecting: (targetChunkId: string, targetEdge: HexEdge) => ChunkConnection | null
  cancelConnecting: () => void
  
  findNearestEmptyHex: (around: HexPoint) => HexPoint | null
  isHexOccupied: (hex: HexPoint) => boolean
  
  undo: () => void
  redo: () => void
  saveToHistory: (action: string, description: string) => void
  
  saveCurrentMap: () => Promise<void>
  
  getMapById: (mapId: string) => MapMeta | undefined
  getChunkById: (chunkId: string) => Chunk | undefined
  getElementById: (elementId: string) => MapElement | null
  getConnectionById: (connectionId: string) => ChunkConnection | undefined
  clearData: () => void
  setMaps: (maps: MapMeta[]) => void
  reorderMaps: (mapIds: string[]) => Promise<boolean>
  
  saveThumbnail: (dataUrl: string) => Promise<void>
  
  exportMap: (mapId: string) => Promise<string | null>
  importMap: (jsonContent: string) => Promise<Map | null>
}

// ============================================
// Store 实现
// ============================================

const historyManager = createHistoryManager()

export const useMapStore = create<MapState>((set, get) => ({
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
  
  historyManager,
  canUndo: false,
  canRedo: false,
  
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
  
  moveChunkToHex: (chunkId: string, hexPosition: HexPoint) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const chunkIndex = currentMap.data.chunks.findIndex(c => c.id === chunkId)
    if (chunkIndex === -1) return
    
    const chunk = currentMap.data.chunks[chunkIndex]
    
    const existingChunk = currentMap.data.chunks.find(
      c => c.id !== chunkId && c.hexPosition.q === hexPosition.q && c.hexPosition.r === hexPosition.r
    )
    if (existingChunk) return
    
    const updatedChunk: Chunk = {
      ...chunk,
      hexPosition,
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
    
    const newHexPosition = get().findNearestEmptyHex(chunk.hexPosition)
    if (!newHexPosition) return null
    
    const newChunk: Chunk = {
      ...JSON.parse(JSON.stringify(chunk)),
      id: generateId(),
      name: `${chunk.name} (副本)`,
      hexPosition: newHexPosition,
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
  
  moveElementToHex: (elementId: string, hexPosition: HexPoint) => {
    get().updateElement(elementId, { hexPosition })
  },
  
  findNearestEmptyHexForElement: (parentChunkId: string, parentElementId: string | null) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const chunk = currentMap.data.chunks.find(c => c.id === parentChunkId)
    if (!chunk) return null
    
    let elements: MapElement[]
    if (parentElementId) {
      const parentElement = findElementById(chunk.children, parentElementId)
      elements = parentElement?.children || []
    } else {
      elements = chunk.children
    }
    
    const occupiedHexes = new Set(
      elements.map(e => `${e.hexPosition.q},${e.hexPosition.r}`)
    )
    
    const startHex: HexPoint = { q: 0, r: 0 }
    if (!occupiedHexes.has(`${startHex.q},${startHex.r}`)) {
      return startHex
    }
    
    for (let distance = 1; distance <= 10; distance++) {
      const neighbors = getHexNeighbors(startHex)
      for (const neighbor of neighbors) {
        if (!occupiedHexes.has(`${neighbor.q},${neighbor.r}`)) {
          return neighbor
        }
      }
    }
    
    return null
  },
  
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
  
  connectChunks: (sourceChunkId: string, targetChunkId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    if (sourceChunkId === targetChunkId) return null
    
    const exists = currentMap.data.connections.some(
      c => (c.sourceChunkId === sourceChunkId && c.targetChunkId === targetChunkId) ||
           (c.sourceChunkId === targetChunkId && c.targetChunkId === sourceChunkId)
    )
    if (exists) return null
    
    const sourceChunk = currentMap.data.chunks.find(c => c.id === sourceChunkId)
    const targetChunk = currentMap.data.chunks.find(c => c.id === targetChunkId)
    
    if (!sourceChunk || !targetChunk) return null
    
    const bestEdges = findBestEdges(sourceChunk, targetChunk)
    if (!bestEdges) return null
    
    return get().addConnection({
      sourceChunkId,
      sourceEdge: bestEdges.sourceEdge,
      targetChunkId,
      targetEdge: bestEdges.targetEdge
    })
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
  
  setTool: (tool: EditorTool) => {
    set({ tool })
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
      selectedElementId: elementId, 
      selectedChunkId: null, 
      selectedConnectionId: null 
    })
  },
  
  selectConnection: (connectionId: string | null) => {
    set({ 
      selectedConnectionId: connectionId, 
      selectedChunkId: null, 
      selectedElementId: null 
    })
  },
  
  clearSelection: () => {
    set({ 
      selectedChunkId: null, 
      selectedElementId: null, 
      selectedConnectionId: null 
    })
  },
  
  setZoom: (zoom: number) => {
    set({ zoom: Math.max(0.1, Math.min(3, zoom)) })
  },
  
  setPan: (panX: number, panY: number) => {
    set({ panX, panY })
  },
  
  resetView: () => {
    set({ zoom: 1, panX: 0, panY: 0 })
  },
  
  enterChunk: (chunkId: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    const chunk = currentMap.data.chunks.find(c => c.id === chunkId)
    if (!chunk) return
    
    const viewStack = get().viewStack
    set({
      viewStack: [...viewStack, { type: 'chunk', id: chunkId, name: chunk.name }],
      selectedElementId: null
    })
  },
  
  enterElement: (elementId: string, elementName: string) => {
    const viewStack = get().viewStack
    set({
      viewStack: [...viewStack, { type: 'element', id: elementId, name: elementName }],
      selectedElementId: null
    })
  },
  
  exitLevel: () => {
    const viewStack = get().viewStack
    if (viewStack.length > 1) {
      set({ 
        viewStack: viewStack.slice(0, -1),
        selectedElementId: null,
        selectedChunkId: null
      })
    }
  },
  
  goToLevel: (levelIndex: number) => {
    const viewStack = get().viewStack
    if (levelIndex >= 0 && levelIndex < viewStack.length) {
      set({ 
        viewStack: viewStack.slice(0, levelIndex + 1),
        selectedElementId: null,
        selectedChunkId: null
      })
    }
  },
  
  getCurrentElements: () => {
    const currentMap = get().currentMap
    const viewStack = get().viewStack
    
    if (!currentMap || viewStack.length === 0) return []
    
    const currentLevel = viewStack[viewStack.length - 1]
    
    if (currentLevel.type === 'world') {
      return []
    }
    
    if (currentLevel.type === 'chunk') {
      const chunk = currentMap.data.chunks.find(c => c.id === currentLevel.id)
      return chunk ? chunk.children : []
    }
    
    if (currentLevel.type === 'element') {
      const element = findElementById(
        currentMap.data.chunks.flatMap(c => c.children),
        currentLevel.id
      )
      return element ? element.children : []
    }
    
    return []
  },
  
  startConnecting: (chunkId: string, edge: HexEdge) => {
    set({ 
      isConnecting: true, 
      connectingFrom: { chunkId, edge },
      tool: 'connect'
    })
  },
  
  finishConnecting: (targetChunkId: string, targetEdge: HexEdge) => {
    const { connectingFrom, currentMap } = get()
    
    if (!connectingFrom || !currentMap) {
      get().cancelConnecting()
      return null
    }
    
    if (connectingFrom.chunkId === targetChunkId) {
      get().cancelConnecting()
      return null
    }
    
    const sourceChunk = currentMap.data.chunks.find(c => c.id === connectingFrom.chunkId)
    const targetChunk = currentMap.data.chunks.find(c => c.id === targetChunkId)
    
    if (!sourceChunk || !targetChunk) {
      get().cancelConnecting()
      return null
    }
    
    const isCompatible = checkHexEdgeCompatibility(
      sourceChunk,
      connectingFrom.edge,
      targetChunk,
      targetEdge
    )
    
    if (!isCompatible) {
      get().cancelConnecting()
      return null
    }
    
    const connection = get().addConnection({
      sourceChunkId: connectingFrom.chunkId,
      sourceEdge: connectingFrom.edge,
      targetChunkId,
      targetEdge
    })
    
    set({ isConnecting: false, connectingFrom: null, tool: 'select' })
    
    return connection
  },
  
  cancelConnecting: () => {
    set({ isConnecting: false, connectingFrom: null, tool: 'select' })
  },
  
  findNearestEmptyHex: (around: HexPoint) => {
    const currentMap = get().currentMap
    if (!currentMap) return null
    
    const occupiedHexes = new Set(
      currentMap.data.chunks.map(c => `${c.hexPosition.q},${c.hexPosition.r}`)
    )
    
    if (!occupiedHexes.has(`${around.q},${around.r}`)) {
      return around
    }
    
    for (let distance = 1; distance <= 10; distance++) {
      const neighbors = getHexNeighbors(around)
      for (const neighbor of neighbors) {
        if (!occupiedHexes.has(`${neighbor.q},${neighbor.r}`)) {
          return neighbor
        }
      }
    }
    
    return null
  },
  
  isHexOccupied: (hex: HexPoint) => {
    const currentMap = get().currentMap
    if (!currentMap) return false
    
    return currentMap.data.chunks.some(
      c => c.hexPosition.q === hex.q && c.hexPosition.r === hex.r
    )
  },
  
  undo: () => {
    const entry = historyManager.undo()
    if (entry && get().currentMap) {
      set({
        currentMap: {
          ...get().currentMap!,
          data: entry.snapshot,
          updatedAt: new Date().toISOString()
        },
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo()
      })
    }
  },
  
  redo: () => {
    const entry = historyManager.redo()
    if (entry && get().currentMap) {
      set({
        currentMap: {
          ...get().currentMap!,
          data: entry.snapshot,
          updatedAt: new Date().toISOString()
        },
        canUndo: historyManager.canUndo(),
        canRedo: historyManager.canRedo()
      })
    }
  },
  
  saveToHistory: (action: string, description: string) => {
    const currentMap = get().currentMap
    if (currentMap) {
      historyManager.push(action, description, currentMap.data)
      set({ 
        canUndo: historyManager.canUndo(), 
        canRedo: historyManager.canRedo() 
      })
    }
  },
  
  saveCurrentMap: async () => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    try {
      await window.electron.map.update(currentMap.id, {
        data: currentMap.data,
        updatedAt: new Date().toISOString()
      })
    } catch (error) {
      handleError(error, { fallbackMessage: '保存地图失败' })
    }
  },
  
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
    
    for (const chunk of currentMap.data.chunks) {
      const element = findElementById(chunk.children, elementId)
      if (element) return element
    }
    
    return null
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
      connectingFrom: null
    })
    historyManager.clear()
    set({ canUndo: false, canRedo: false })
  },
  
  setMaps: (maps: MapMeta[]) => {
    set({ maps })
  },
  
  reorderMaps: async (mapIds: string[]) => {
    try {
      const success = await window.electron.map.reorder(mapIds)
      if (success) {
        const reorderedMaps = mapIds
          .map(id => get().maps.find(m => m.id === id))
          .filter((m): m is MapMeta => m !== undefined)
        set({ maps: reorderedMaps })
      }
      return success
    } catch (error) {
      handleError(error, { fallbackMessage: '重新排序失败' })
      return false
    }
  },
  
  saveThumbnail: async (dataUrl: string) => {
    const currentMap = get().currentMap
    if (!currentMap) return
    
    try {
      await window.electron.map.update(currentMap.id, { thumbnail: dataUrl })
      set({
        currentMap: {
          ...currentMap,
          thumbnail: dataUrl
        }
      })
      await get().loadList()
    } catch (error) {
      handleError(error, { fallbackMessage: '保存缩略图失败' })
    }
  },
  
  exportMap: async (mapId: string) => {
    try {
      const map = await window.electron.map.get(mapId)
      if (map) {
        return JSON.stringify(map, null, 2)
      }
      return null
    } catch (error) {
      handleError(error, { fallbackMessage: '导出地图失败' })
      return null
    }
  },
  
  importMap: async (jsonContent: string) => {
    try {
      const mapData = JSON.parse(jsonContent)
      const newMap = await window.electron.map.create({
        name: mapData.name,
        description: mapData.description,
        canvasWidth: mapData.data?.canvasWidth,
        canvasHeight: mapData.data?.canvasHeight,
        backgroundColor: mapData.data?.backgroundColor
      })
      
      if (newMap && mapData.data) {
        const updatedMap = await window.electron.map.update(newMap.id, {
          data: mapData.data
        })
        await get().loadList()
        return updatedMap
      }
      
      return newMap
    } catch (error) {
      handleError(error, { fallbackMessage: '导入地图失败' })
      return null
    }
  }
}))
