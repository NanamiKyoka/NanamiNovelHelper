/**
 * 地图编辑器类型定义
 * 
 * 设计理念：
 * - 世界视图：板块（Chunk）宏观编辑，支持拖拽、吸附、连接
 * - 钻取模式：板块内部编辑，支持无限嵌套
 * - AI 辅助：自然语言生成、智能建议
 */

// ============================================
// 基础类型
// ============================================

export interface Point {
  x: number
  y: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

// ============================================
// 板块类型定义
// ============================================

export type ChunkType = 
  | 'city' 
  | 'village' 
  | 'forest' 
  | 'desert' 
  | 'mountain' 
  | 'ocean' 
  | 'river' 
  | 'lake'
  | 'swamp'
  | 'grassland'
  | 'snowland'
  | 'volcano'
  | 'cave'
  | 'dungeon'
  | 'ruins'
  | 'castle'
  | 'temple'
  | 'tower'
  | 'island'
  | 'underground'
  | 'sky'
  | 'custom'

export const CHUNK_TYPE_CONFIG: Record<ChunkType, {
  label: string
  icon: string
  defaultColor: string
  description: string
}> = {
  city: { label: '城市', icon: 'City', defaultColor: '#4a9eff', description: '繁华的城市' },
  village: { label: '村庄', icon: 'Home', defaultColor: '#8bc34a', description: '宁静的村庄' },
  forest: { label: '森林', icon: 'Tree', defaultColor: '#2e7d32', description: '茂密的森林' },
  desert: { label: '沙漠', icon: 'Sun', defaultColor: '#ff9800', description: '广袤的沙漠' },
  mountain: { label: '山脉', icon: 'Terrain', defaultColor: '#795548', description: '巍峨的山脉' },
  ocean: { label: '海洋', icon: 'Waves', defaultColor: '#1565c0', description: '辽阔的海洋' },
  river: { label: '河流', icon: 'Water', defaultColor: '#29b6f6', description: '蜿蜒的河流' },
  lake: { label: '湖泊', icon: 'WaterDrop', defaultColor: '#4fc3f7', description: '平静的湖泊' },
  swamp: { label: '沼泽', icon: 'Grass', defaultColor: '#558b2f', description: '危险的沼泽' },
  grassland: { label: '草原', icon: 'Landscape', defaultColor: '#81c784', description: '广阔的草原' },
  snowland: { label: '雪原', icon: 'AcUnit', defaultColor: '#e3f2fd', description: '寒冷的雪原' },
  volcano: { label: '火山', icon: 'LocalFireDepartment', defaultColor: '#d32f2f', description: '活跃的火山' },
  cave: { label: '洞穴', icon: 'DarkMode', defaultColor: '#424242', description: '神秘的洞穴' },
  dungeon: { label: '地下城', icon: 'Castle', defaultColor: '#6a1b9a', description: '危险的地下城' },
  ruins: { label: '遗迹', icon: 'AccountBalance', defaultColor: '#8d6e63', description: '古老的遗迹' },
  castle: { label: '城堡', icon: 'Fort', defaultColor: '#5d4037', description: '宏伟的城堡' },
  temple: { label: '神殿', icon: 'TempleBuddhist', defaultColor: '#ffd54f', description: '神圣的神殿' },
  tower: { label: '塔楼', icon: 'Tower', defaultColor: '#78909c', description: '高耸的塔楼' },
  island: { label: '岛屿', icon: 'Island', defaultColor: '#26a69a', description: '孤立的岛屿' },
  underground: { label: '地下世界', icon: 'ExpandMore', defaultColor: '#37474f', description: '黑暗的地下世界' },
  sky: { label: '天空', icon: 'Cloud', defaultColor: '#90caf9', description: '漂浮的天空领域' },
  custom: { label: '自定义', icon: 'HelpOutline', defaultColor: '#9e9e9e', description: '自定义类型' }
}

// ============================================
// 边缘连接类型
// ============================================

export type EdgePosition = 'top' | 'right' | 'bottom' | 'left'

export interface EdgeConnection {
  edge: EdgePosition
  allowedTypes: ChunkType[]
}

// ============================================
// 板块（Chunk）定义
// ============================================

export interface Chunk {
  id: string
  type: 'chunk'
  
  name: string
  description: string
  chunkType: ChunkType
  customTypeName?: string
  
  position: Point
  size: Size
  
  icon: string
  color: string
  
  edges: {
    top: EdgeConnection
    right: EdgeConnection
    bottom: EdgeConnection
    left: EdgeConnection
  }
  
  children: MapElement[]
  
  createdAt: number
  updatedAt: number
}

// ============================================
// 内部元素定义（支持嵌套）
// ============================================

export type ElementType = 
  | 'building'
  | 'shop'
  | 'house'
  | 'inn'
  | 'tavern'
  | 'temple'
  | 'gate'
  | 'road'
  | 'bridge'
  | 'tree'
  | 'rock'
  | 'water'
  | 'npc'
  | 'monster'
  | 'treasure'
  | 'trap'
  | 'portal'
  | 'landmark'
  | 'custom'

export const ELEMENT_TYPE_CONFIG: Record<ElementType, {
  label: string
  icon: string
  defaultColor: string
  description: string
  canHaveChildren: boolean
}> = {
  building: { label: '建筑', icon: 'Apartment', defaultColor: '#607d8b', description: '大型建筑', canHaveChildren: true },
  shop: { label: '商店', icon: 'Store', defaultColor: '#ff9800', description: '商店', canHaveChildren: true },
  house: { label: '房屋', icon: 'Home', defaultColor: '#8d6e63', description: '普通房屋', canHaveChildren: true },
  inn: { label: '旅馆', icon: 'Hotel', defaultColor: '#795548', description: '旅馆', canHaveChildren: true },
  tavern: { label: '酒馆', icon: 'LocalBar', defaultColor: '#a1887f', description: '酒馆', canHaveChildren: true },
  temple: { label: '神殿', icon: 'TempleBuddhist', defaultColor: '#ffd54f', description: '神殿', canHaveChildren: true },
  gate: { label: '大门', icon: 'DoorFront', defaultColor: '#5d4037', description: '大门', canHaveChildren: false },
  road: { label: '道路', icon: 'AltRoute', defaultColor: '#9e9e9e', description: '道路', canHaveChildren: false },
  bridge: { label: '桥梁', icon: 'Bridge', defaultColor: '#78909c', description: '桥梁', canHaveChildren: false },
  tree: { label: '树木', icon: 'Park', defaultColor: '#4caf50', description: '树木', canHaveChildren: false },
  rock: { label: '岩石', icon: 'Landscape', defaultColor: '#795548', description: '岩石', canHaveChildren: false },
  water: { label: '水域', icon: 'Water', defaultColor: '#2196f3', description: '水域', canHaveChildren: false },
  npc: { label: 'NPC', icon: 'Person', defaultColor: '#9c27b0', description: 'NPC角色', canHaveChildren: false },
  monster: { label: '怪物', icon: 'Pets', defaultColor: '#f44336', description: '怪物', canHaveChildren: false },
  treasure: { label: '宝箱', icon: 'Inventory', defaultColor: '#ffc107', description: '宝箱', canHaveChildren: false },
  trap: { label: '陷阱', icon: 'Warning', defaultColor: '#ff5722', description: '陷阱', canHaveChildren: false },
  portal: { label: '传送门', icon: 'TripOrigin', defaultColor: '#e91e63', description: '传送门', canHaveChildren: false },
  landmark: { label: '地标', icon: 'Place', defaultColor: '#00bcd4', description: '地标', canHaveChildren: false },
  custom: { label: '自定义', icon: 'HelpOutline', defaultColor: '#9e9e9e', description: '自定义元素', canHaveChildren: true }
}

export interface MapElement {
  id: string
  type: 'element'
  
  name: string
  description: string
  elementType: ElementType
  customTypeName?: string
  
  position: Point
  size: Size
  
  icon: string
  color: string
  
  children: MapElement[]
  
  createdAt: number
  updatedAt: number
}

// ============================================
// 连接线定义
// ============================================

export type ConnectionStyle = 'solid' | 'dashed' | 'dotted' | 'curved'

export interface ChunkConnection {
  id: string
  type: 'connection'
  
  sourceChunkId: string
  sourceEdge: EdgePosition
  targetChunkId: string
  targetEdge: EdgePosition
  
  style: ConnectionStyle
  color: string
  lineWidth: number
  
  label?: string
  description?: string
  
  isAiSuggested: boolean
}

// ============================================
// 视图层级定义
// ============================================

export interface ViewLevel {
  type: 'world' | 'chunk' | 'element'
  id: string
  name: string
}

// ============================================
// 地图数据
// ============================================

export interface MapData {
  chunks: Chunk[]
  connections: ChunkConnection[]
  
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  gridSize: number
  showGrid: boolean
}

export interface MapMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  
  chunkCount: number
  connectionCount: number
  
  createdAt: string
  updatedAt: string
}

export interface Map extends MapMeta {
  data: MapData
}

// ============================================
// 编辑器状态
// ============================================

export type EditorTool = 'select' | 'pan' | 'connect' | 'delete'

export interface EditorState {
  tool: EditorTool
  selectedChunkId: string | null
  selectedElementId: string | null
  selectedConnectionId: string | null
  
  zoom: number
  panX: number
  panY: number
  
  viewStack: ViewLevel[]
  
  isDragging: boolean
  isConnecting: boolean
  connectingFrom: { chunkId: string; edge: EdgePosition } | null
  
  snapEnabled: boolean
  snapThreshold: number
}

// ============================================
// AI 相关类型
// ============================================

export interface AiGenerateChunkRequest {
  description: string
  position?: Point
}

export interface AiGenerateChunkResponse {
  name: string
  chunkType: ChunkType
  description: string
  edges: {
    top: ChunkType[]
    right: ChunkType[]
    bottom: ChunkType[]
    left: ChunkType[]
  }
}

export interface AiConnectionSuggestionRequest {
  sourceChunkId: string
  sourceEdge: EdgePosition
  targetChunkId: string
  targetEdge: EdgePosition
}

export interface AiConnectionSuggestionResponse {
  canConnect: boolean
  suggestion?: {
    type: 'direct' | 'transition'
    transitionChunk?: AiGenerateChunkResponse
    reason: string
  }
}

export interface AiFillChunkRequest {
  chunkId: string
}

export interface AiFillChunkResponse {
  elements: Array<{
    name: string
    elementType: ElementType
    position: Point
    size: Size
    description: string
  }>
}

// ============================================
// 创建/更新选项
// ============================================

export interface CreateChunkOptions {
  name?: string
  description?: string
  chunkType: ChunkType
  customTypeName?: string
  position: Point
  size?: Size
  icon?: string
  color?: string
  edges?: Partial<Chunk['edges']>
}

export interface UpdateChunkOptions {
  name?: string
  description?: string
  chunkType?: ChunkType
  customTypeName?: string
  position?: Point
  size?: Size
  icon?: string
  color?: string
  edges?: Partial<Chunk['edges']>
}

export interface CreateElementOptions {
  name?: string
  description?: string
  elementType: ElementType
  customTypeName?: string
  position: Point
  size?: Size
  icon?: string
  color?: string
}

export interface UpdateElementOptions {
  name?: string
  description?: string
  elementType?: ElementType
  customTypeName?: string
  position?: Point
  size?: Size
  icon?: string
  color?: string
}

export interface CreateConnectionOptions {
  sourceChunkId: string
  sourceEdge: EdgePosition
  targetChunkId: string
  targetEdge: EdgePosition
  style?: ConnectionStyle
  color?: string
  lineWidth?: number
  label?: string
  description?: string
  isAiSuggested?: boolean
}

export interface UpdateConnectionOptions {
  style?: ConnectionStyle
  color?: string
  lineWidth?: number
  label?: string
  description?: string
}

export interface CreateMapOptions {
  name: string
  description?: string
  canvasWidth?: number
  canvasHeight?: number
  backgroundColor?: string
}

export interface UpdateMapOptions {
  name?: string
  description?: string
  thumbnail?: string
  data?: MapData
}

// ============================================
// 历史记录
// ============================================

export interface HistoryEntry {
  id: string
  timestamp: number
  action: string
  description: string
  snapshot: MapData
}

// ============================================
// 默认值
// ============================================

export const DEFAULT_CHUNK_SIZE: Size = { width: 120, height: 100 }
export const DEFAULT_ELEMENT_SIZE: Size = { width: 60, height: 60 }
export const DEFAULT_CANVAS_WIDTH = 2000
export const DEFAULT_CANVAS_HEIGHT = 1500
export const DEFAULT_BACKGROUND_COLOR = '#1a1a2e'
export const DEFAULT_GRID_SIZE = 20
export const DEFAULT_SNAP_THRESHOLD = 15
export const DEFAULT_CONNECTION_COLOR = '#ffffff'
export const DEFAULT_CONNECTION_LINE_WIDTH = 2

// ============================================
// 辅助函数
// ============================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createDefaultEdges(chunkType: ChunkType): Chunk['edges'] {
  const allTypes: ChunkType[] = [
    'city', 'village', 'forest', 'desert', 'mountain', 'ocean', 'river', 'lake',
    'swamp', 'grassland', 'snowland', 'volcano', 'cave', 'dungeon', 'ruins',
    'castle', 'temple', 'tower', 'island', 'underground', 'sky', 'custom'
  ]
  
  const compatibleTypes = getCompatibleTypes(chunkType)
  
  return {
    top: { edge: 'top', allowedTypes: compatibleTypes || allTypes },
    right: { edge: 'right', allowedTypes: compatibleTypes || allTypes },
    bottom: { edge: 'bottom', allowedTypes: compatibleTypes || allTypes },
    left: { edge: 'left', allowedTypes: compatibleTypes || allTypes }
  }
}

function getCompatibleTypes(chunkType: ChunkType): ChunkType[] | null {
  const compatibilityMap: Partial<Record<ChunkType, ChunkType[]>> = {
    city: ['city', 'village', 'forest', 'grassland', 'mountain', 'river', 'lake'],
    village: ['city', 'village', 'forest', 'grassland', 'mountain', 'river', 'lake'],
    forest: ['city', 'village', 'forest', 'mountain', 'river', 'lake', 'grassland', 'cave'],
    desert: ['desert', 'mountain', 'ruins', 'cave', 'grassland'],
    mountain: ['city', 'village', 'forest', 'desert', 'mountain', 'cave', 'dungeon', 'snowland'],
    ocean: ['ocean', 'island', 'river', 'coast'],
    river: ['city', 'village', 'forest', 'mountain', 'ocean', 'lake', 'grassland'],
    lake: ['city', 'village', 'forest', 'mountain', 'river', 'grassland'],
    grassland: ['city', 'village', 'forest', 'desert', 'mountain', 'river', 'lake'],
    dungeon: ['mountain', 'cave', 'ruins', 'underground'],
    cave: ['forest', 'mountain', 'desert', 'dungeon', 'underground'],
    ruins: ['desert', 'forest', 'grassland', 'dungeon', 'cave'],
    underground: ['cave', 'dungeon', 'mountain'],
    sky: ['sky', 'mountain', 'tower'],
    island: ['ocean', 'beach'],
  }
  
  return compatibilityMap[chunkType] || null
}

export function createDefaultChunk(options: CreateChunkOptions): Chunk {
  const now = Date.now()
  const config = CHUNK_TYPE_CONFIG[options.chunkType]
  
  return {
    id: generateId(),
    type: 'chunk',
    name: options.name || `未命名${config.label}`,
    description: options.description || config.description,
    chunkType: options.chunkType,
    customTypeName: options.customTypeName,
    position: options.position,
    size: options.size || DEFAULT_CHUNK_SIZE,
    icon: options.icon || config.icon,
    color: options.color || config.defaultColor,
    edges: options.edges ? {
      top: { ...createDefaultEdges(options.chunkType).top, ...options.edges.top },
      right: { ...createDefaultEdges(options.chunkType).right, ...options.edges.right },
      bottom: { ...createDefaultEdges(options.chunkType).bottom, ...options.edges.bottom },
      left: { ...createDefaultEdges(options.chunkType).left, ...options.edges.left }
    } : createDefaultEdges(options.chunkType),
    children: [],
    createdAt: now,
    updatedAt: now
  }
}

export function createDefaultElement(options: CreateElementOptions): MapElement {
  const now = Date.now()
  const config = ELEMENT_TYPE_CONFIG[options.elementType]
  
  return {
    id: generateId(),
    type: 'element',
    name: options.name || `未命名${config.label}`,
    description: options.description || config.description,
    elementType: options.elementType,
    customTypeName: options.customTypeName,
    position: options.position,
    size: options.size || DEFAULT_ELEMENT_SIZE,
    icon: options.icon || config.icon,
    color: options.color || config.defaultColor,
    children: [],
    createdAt: now,
    updatedAt: now
  }
}

export function createDefaultConnection(options: CreateConnectionOptions): ChunkConnection {
  return {
    id: generateId(),
    type: 'connection',
    sourceChunkId: options.sourceChunkId,
    sourceEdge: options.sourceEdge,
    targetChunkId: options.targetChunkId,
    targetEdge: options.targetEdge,
    style: options.style || 'solid',
    color: options.color || DEFAULT_CONNECTION_COLOR,
    lineWidth: options.lineWidth ?? DEFAULT_CONNECTION_LINE_WIDTH,
    label: options.label,
    description: options.description,
    isAiSuggested: options.isAiSuggested || false
  }
}

export function createDefaultMapData(): MapData {
  return {
    chunks: [],
    connections: [],
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    canvasHeight: DEFAULT_CANVAS_HEIGHT,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    gridSize: DEFAULT_GRID_SIZE,
    showGrid: true
  }
}

export function getEdgePosition(chunk: Chunk, edge: EdgePosition): Point {
  const { position, size } = chunk
  switch (edge) {
    case 'top':
      return { x: position.x + size.width / 2, y: position.y }
    case 'right':
      return { x: position.x + size.width, y: position.y + size.height / 2 }
    case 'bottom':
      return { x: position.x + size.width / 2, y: position.y + size.height }
    case 'left':
      return { x: position.x, y: position.y + size.height / 2 }
  }
}

export function checkEdgeCompatibility(
  sourceChunk: Chunk,
  sourceEdge: EdgePosition,
  targetChunk: Chunk,
  targetEdge: EdgePosition
): boolean {
  const sourceAllowed = sourceChunk.edges[sourceEdge].allowedTypes
  const targetAllowed = targetChunk.edges[targetEdge].allowedTypes
  
  return sourceAllowed.includes(targetChunk.chunkType) && 
         targetAllowed.includes(sourceChunk.chunkType)
}

export function findElementById(
  elements: MapElement[],
  id: string
): MapElement | null {
  for (const element of elements) {
    if (element.id === id) return element
    if (element.children.length > 0) {
      const found = findElementById(element.children, id)
      if (found) return found
    }
  }
  return null
}

export function updateElementInTree(
  elements: MapElement[],
  id: string,
  updates: Partial<MapElement>
): MapElement[] {
  return elements.map(element => {
    if (element.id === id) {
      return { ...element, ...updates, updatedAt: Date.now() }
    }
    if (element.children.length > 0) {
      return {
        ...element,
        children: updateElementInTree(element.children, id, updates)
      }
    }
    return element
  })
}

export function deleteElementFromTree(
  elements: MapElement[],
  id: string
): MapElement[] {
  return elements
    .filter(element => element.id !== id)
    .map(element => ({
      ...element,
      children: deleteElementFromTree(element.children, id)
    }))
}

export function getParentPath(
  elements: MapElement[],
  targetId: string,
  path: MapElement[] = []
): MapElement[] | null {
  for (const element of elements) {
    if (element.id === targetId) {
      return path
    }
    if (element.children.length > 0) {
      const result = getParentPath(element.children, targetId, [...path, element])
      if (result) return result
    }
  }
  return null
}
