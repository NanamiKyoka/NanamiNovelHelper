/**
 * 地图编辑器类型定义
 *
 * 设计理念：
 * - 世界视图：板块（Chunk）宏观编辑，六边形网格布局（类似文明六）
 * - 钻取模式：板块内部编辑，支持无限嵌套
 */

// ============================================
// 基础类型
// ============================================

export interface Point {
  x: number
  y: number
}

export interface HexPoint {
  q: number
  r: number
}

export interface Size {
  width: number
  height: number
}

export interface Rect extends Point, Size {}

// ============================================
// 六边形工具函数
// ============================================

export const HEX_SIZE = 50

export function hexToPixel(hex: HexPoint, size: number = HEX_SIZE): Point {
  const x = size * (Math.sqrt(3) * hex.q + (Math.sqrt(3) / 2) * hex.r)
  const y = size * ((3 / 2) * hex.r)
  return { x, y }
}

export function pixelToHex(point: Point, size: number = HEX_SIZE): HexPoint {
  const q = ((Math.sqrt(3) / 3) * point.x - (1 / 3) * point.y) / size
  const r = ((2 / 3) * point.y) / size
  return hexRound({ q, r })
}

export function hexRound(hex: HexPoint): HexPoint {
  const s = -hex.q - hex.r
  let rq = Math.round(hex.q)
  let rr = Math.round(hex.r)
  const rs = Math.round(s)

  const qDiff = Math.abs(rq - hex.q)
  const rDiff = Math.abs(rr - hex.r)
  const sDiff = Math.abs(rs - s)

  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs
  } else if (rDiff > sDiff) {
    rr = -rq - rs
  }

  return { q: rq, r: rr }
}

export function hexDistance(a: HexPoint, b: HexPoint): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2
}

export function getHexNeighbors(hex: HexPoint): HexPoint[] {
  const directions = [
    { q: 1, r: 0 },
    { q: 1, r: -1 },
    { q: 0, r: -1 },
    { q: -1, r: 0 },
    { q: -1, r: 1 },
    { q: 0, r: 1 }
  ]
  return directions.map(d => ({ q: hex.q + d.q, r: hex.r + d.r }))
}

export function getHexCorners(center: Point, size: number): Point[] {
  const corners: Point[] = []
  for (let i = 0; i < 6; i++) {
    const angleDeg = 60 * i - 30
    const angleRad = (Math.PI / 180) * angleDeg
    corners.push({
      x: center.x + size * Math.cos(angleRad),
      y: center.y + size * Math.sin(angleRad)
    })
  }
  return corners
}

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

export const CHUNK_TYPE_CONFIG: Record<
  ChunkType,
  {
    label: string
    icon: string
    defaultColor: string
    description: string
  }
> = {
  city: { label: '城市', icon: 'BankOutlined', defaultColor: '#4a9eff', description: '繁华的城市' },
  village: {
    label: '村庄',
    icon: 'HomeOutlined',
    defaultColor: '#8bc34a',
    description: '宁静的村庄'
  },
  forest: {
    label: '森林',
    icon: 'AimOutlined',
    defaultColor: '#2e7d32',
    description: '茂密的森林'
  },
  desert: {
    label: '沙漠',
    icon: 'SunOutlined',
    defaultColor: '#ff9800',
    description: '广袤的沙漠'
  },
  mountain: {
    label: '山脉',
    icon: 'VerticalAlignTopOutlined',
    defaultColor: '#795548',
    description: '巍峨的山脉'
  },
  ocean: {
    label: '海洋',
    icon: 'CloudOutlined',
    defaultColor: '#1565c0',
    description: '辽阔的海洋'
  },
  river: {
    label: '河流',
    icon: 'LineOutlined',
    defaultColor: '#29b6f6',
    description: '蜿蜒的河流'
  },
  lake: {
    label: '湖泊',
    icon: 'RadiusSettingOutlined',
    defaultColor: '#4fc3f7',
    description: '平静的湖泊'
  },
  swamp: {
    label: '沼泽',
    icon: 'BulbOutlined',
    defaultColor: '#558b2f',
    description: '危险的沼泽'
  },
  grassland: {
    label: '草原',
    icon: 'BorderOutlined',
    defaultColor: '#81c784',
    description: '广阔的草原'
  },
  snowland: {
    label: '雪原',
    icon: 'CloudOutlined',
    defaultColor: '#e3f2fd',
    description: '寒冷的雪原'
  },
  volcano: {
    label: '火山',
    icon: 'FireOutlined',
    defaultColor: '#d32f2f',
    description: '活跃的火山'
  },
  cave: {
    label: '洞穴',
    icon: 'CompassOutlined',
    defaultColor: '#424242',
    description: '神秘的洞穴'
  },
  dungeon: {
    label: '地下城',
    icon: 'AlertOutlined',
    defaultColor: '#6a1b9a',
    description: '危险的地下城'
  },
  ruins: {
    label: '遗迹',
    icon: 'HistoryOutlined',
    defaultColor: '#8d6e63',
    description: '古老的遗迹'
  },
  castle: {
    label: '城堡',
    icon: 'CrownOutlined',
    defaultColor: '#5d4037',
    description: '宏伟的城堡'
  },
  temple: {
    label: '神殿',
    icon: 'AlertTwoTone',
    defaultColor: '#ffd54f',
    description: '神圣的神殿'
  },
  tower: {
    label: '塔楼',
    icon: 'VerticalAlignTopOutlined',
    defaultColor: '#78909c',
    description: '高耸的塔楼'
  },
  island: {
    label: '岛屿',
    icon: 'GlobalOutlined',
    defaultColor: '#26a69a',
    description: '孤立的岛屿'
  },
  underground: {
    label: '地下世界',
    icon: 'DownOutlined',
    defaultColor: '#37474f',
    description: '黑暗的地下世界'
  },
  sky: {
    label: '天空',
    icon: 'CloudOutlined',
    defaultColor: '#90caf9',
    description: '漂浮的天空领域'
  },
  custom: {
    label: '自定义',
    icon: 'SettingOutlined',
    defaultColor: '#9e9e9e',
    description: '自定义类型'
  }
}

// ============================================
// 边缘连接类型（六边形有6个边）
// ============================================

export type HexEdge = 0 | 1 | 2 | 3 | 4 | 5

export const HEX_EDGE_NAMES: Record<HexEdge, string> = {
  0: '东',
  1: '东北',
  2: '西北',
  3: '西',
  4: '西南',
  5: '东南'
}

export interface HexEdgeConnection {
  edge: HexEdge
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

  hexPosition: HexPoint

  icon: string
  color: string

  edges: {
    0: HexEdgeConnection
    1: HexEdgeConnection
    2: HexEdgeConnection
    3: HexEdgeConnection
    4: HexEdgeConnection
    5: HexEdgeConnection
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

export const ELEMENT_TYPE_CONFIG: Record<
  ElementType,
  {
    label: string
    icon: string
    defaultColor: string
    description: string
    canHaveChildren: boolean
  }
> = {
  building: {
    label: '建筑',
    icon: 'BankOutlined',
    defaultColor: '#607d8b',
    description: '大型建筑',
    canHaveChildren: true
  },
  shop: {
    label: '商店',
    icon: 'ShopOutlined',
    defaultColor: '#ff9800',
    description: '商店',
    canHaveChildren: true
  },
  house: {
    label: '房屋',
    icon: 'HomeOutlined',
    defaultColor: '#8d6e63',
    description: '普通房屋',
    canHaveChildren: true
  },
  inn: {
    label: '旅馆',
    icon: 'HomeOutlined',
    defaultColor: '#795548',
    description: '旅馆',
    canHaveChildren: true
  },
  tavern: {
    label: '酒馆',
    icon: 'CoffeeOutlined',
    defaultColor: '#a1887f',
    description: '酒馆',
    canHaveChildren: true
  },
  temple: {
    label: '神殿',
    icon: 'AlertTwoTone',
    defaultColor: '#ffd54f',
    description: '神殿',
    canHaveChildren: true
  },
  gate: {
    label: '大门',
    icon: 'LoginOutlined',
    defaultColor: '#5d4037',
    description: '大门',
    canHaveChildren: false
  },
  road: {
    label: '道路',
    icon: 'LineOutlined',
    defaultColor: '#9e9e9e',
    description: '道路',
    canHaveChildren: false
  },
  bridge: {
    label: '桥梁',
    icon: 'ColumnWidthOutlined',
    defaultColor: '#78909c',
    description: '桥梁',
    canHaveChildren: false
  },
  tree: {
    label: '树木',
    icon: 'AimOutlined',
    defaultColor: '#4caf50',
    description: '树木',
    canHaveChildren: false
  },
  rock: {
    label: '岩石',
    icon: 'BorderOutlined',
    defaultColor: '#795548',
    description: '岩石',
    canHaveChildren: false
  },
  water: {
    label: '水域',
    icon: 'RadiusSettingOutlined',
    defaultColor: '#2196f3',
    description: '水域',
    canHaveChildren: false
  },
  npc: {
    label: 'NPC',
    icon: 'UserOutlined',
    defaultColor: '#9c27b0',
    description: 'NPC角色',
    canHaveChildren: false
  },
  monster: {
    label: '怪物',
    icon: 'BugOutlined',
    defaultColor: '#f44336',
    description: '怪物',
    canHaveChildren: false
  },
  treasure: {
    label: '宝箱',
    icon: 'GiftOutlined',
    defaultColor: '#ffc107',
    description: '宝箱',
    canHaveChildren: false
  },
  trap: {
    label: '陷阱',
    icon: 'WarningOutlined',
    defaultColor: '#ff5722',
    description: '陷阱',
    canHaveChildren: false
  },
  portal: {
    label: '传送门',
    icon: 'ApiOutlined',
    defaultColor: '#e91e63',
    description: '传送门',
    canHaveChildren: false
  },
  landmark: {
    label: '地标',
    icon: 'EnvironmentOutlined',
    defaultColor: '#00bcd4',
    description: '地标',
    canHaveChildren: false
  },
  custom: {
    label: '自定义',
    icon: 'SettingOutlined',
    defaultColor: '#9e9e9e',
    description: '自定义元素',
    canHaveChildren: true
  }
}

export interface MapElement {
  id: string
  type: 'element'

  name: string
  description: string
  elementType: ElementType
  customTypeName?: string

  hexPosition: HexPoint
  position?: Point

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
  sourceEdge: HexEdge
  targetChunkId: string
  targetEdge: HexEdge

  style: ConnectionStyle
  color: string
  lineWidth: number

  label?: string
  description?: string
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

export type EditorTool = 'select' | 'draw' | 'connect'

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
  connectingFrom: { chunkId: string; edge: HexEdge } | null
}

// ============================================
// 创建/更新选项
// ============================================

export interface CreateChunkOptions {
  name?: string
  description?: string
  chunkType: ChunkType
  customTypeName?: string
  hexPosition: HexPoint
  icon?: string
  color?: string
  edges?: Partial<Chunk['edges']>
}

export interface UpdateChunkOptions {
  name?: string
  description?: string
  chunkType?: ChunkType
  customTypeName?: string
  hexPosition?: HexPoint
  icon?: string
  color?: string
  edges?: Partial<Chunk['edges']>
}

export interface CreateElementOptions {
  name?: string
  description?: string
  elementType: ElementType
  customTypeName?: string
  hexPosition: HexPoint
  icon?: string
  color?: string
}

export interface UpdateElementOptions {
  name?: string
  description?: string
  elementType?: ElementType
  customTypeName?: string
  hexPosition?: HexPoint
  icon?: string
  color?: string
}

export interface CreateConnectionOptions {
  sourceChunkId: string
  sourceEdge: HexEdge
  targetChunkId: string
  targetEdge: HexEdge
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
  linkedVocabularyTypes?: string[]
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

export const DEFAULT_CANVAS_WIDTH = 2000
export const DEFAULT_CANVAS_HEIGHT = 1500
export const DEFAULT_BACKGROUND_COLOR = '#1a1a2e'
export const DEFAULT_CONNECTION_COLOR = '#ffffff'
export const DEFAULT_CONNECTION_LINE_WIDTH = 2

// ============================================
// 辅助函数
// ============================================

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

export function createDefaultHexEdges(chunkType: ChunkType): Chunk['edges'] {
  const allTypes: ChunkType[] = [
    'city',
    'village',
    'forest',
    'desert',
    'mountain',
    'ocean',
    'river',
    'lake',
    'swamp',
    'grassland',
    'snowland',
    'volcano',
    'cave',
    'dungeon',
    'ruins',
    'castle',
    'temple',
    'tower',
    'island',
    'underground',
    'sky',
    'custom'
  ]

  const compatibleTypes = getCompatibleTypes(chunkType)
  const allowedTypes = compatibleTypes || allTypes

  return {
    0: { edge: 0, allowedTypes },
    1: { edge: 1, allowedTypes },
    2: { edge: 2, allowedTypes },
    3: { edge: 3, allowedTypes },
    4: { edge: 4, allowedTypes },
    5: { edge: 5, allowedTypes }
  }
}

function getCompatibleTypes(chunkType: ChunkType): ChunkType[] | null {
  const compatibilityMap: Partial<Record<ChunkType, ChunkType[]>> = {
    city: ['city', 'village', 'forest', 'grassland', 'mountain', 'river', 'lake'],
    village: ['city', 'village', 'forest', 'grassland', 'mountain', 'river', 'lake'],
    forest: ['city', 'village', 'forest', 'mountain', 'river', 'lake', 'grassland', 'cave'],
    desert: ['desert', 'mountain', 'ruins', 'cave', 'grassland'],
    mountain: ['city', 'village', 'forest', 'desert', 'mountain', 'cave', 'dungeon', 'snowland'],
    ocean: ['ocean', 'island', 'river'],
    river: ['city', 'village', 'forest', 'mountain', 'ocean', 'lake', 'grassland'],
    lake: ['city', 'village', 'forest', 'mountain', 'river', 'grassland'],
    grassland: ['city', 'village', 'forest', 'desert', 'mountain', 'river', 'lake'],
    dungeon: ['mountain', 'cave', 'ruins', 'underground'],
    cave: ['forest', 'mountain', 'desert', 'dungeon', 'underground'],
    ruins: ['desert', 'forest', 'grassland', 'dungeon', 'cave'],
    underground: ['cave', 'dungeon', 'mountain'],
    sky: ['sky', 'mountain', 'tower'],
    island: ['ocean']
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
    hexPosition: options.hexPosition,
    icon: options.icon || config.icon,
    color: options.color || config.defaultColor,
    edges: options.edges
      ? {
          0: { ...createDefaultHexEdges(options.chunkType)[0], ...options.edges[0] },
          1: { ...createDefaultHexEdges(options.chunkType)[1], ...options.edges[1] },
          2: { ...createDefaultHexEdges(options.chunkType)[2], ...options.edges[2] },
          3: { ...createDefaultHexEdges(options.chunkType)[3], ...options.edges[3] },
          4: { ...createDefaultHexEdges(options.chunkType)[4], ...options.edges[4] },
          5: { ...createDefaultHexEdges(options.chunkType)[5], ...options.edges[5] }
        }
      : createDefaultHexEdges(options.chunkType),
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
    hexPosition: options.hexPosition,
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
    description: options.description
  }
}

export function createDefaultMapData(): MapData {
  return {
    chunks: [],
    connections: [],
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    canvasHeight: DEFAULT_CANVAS_HEIGHT,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    gridSize: HEX_SIZE,
    showGrid: false
  }
}

export function getHexEdgeCenter(chunk: Chunk, edge: HexEdge): Point {
  const center = hexToPixel(chunk.hexPosition)
  const corners = getHexCorners(center, HEX_SIZE)
  const corner1 = corners[edge]
  const corner2 = corners[(edge + 1) % 6]
  return {
    x: (corner1.x + corner2.x) / 2,
    y: (corner1.y + corner2.y) / 2
  }
}

export function checkHexEdgeCompatibility(
  sourceChunk: Chunk,
  sourceEdge: HexEdge,
  targetChunk: Chunk,
  targetEdge: HexEdge
): boolean {
  const sourceAllowed = sourceChunk.edges[sourceEdge].allowedTypes
  const targetAllowed = targetChunk.edges[targetEdge].allowedTypes

  return (
    sourceAllowed.includes(targetChunk.chunkType) && targetAllowed.includes(sourceChunk.chunkType)
  )
}

export function findBestEdges(
  sourceChunk: Chunk,
  targetChunk: Chunk
): { sourceEdge: HexEdge; targetEdge: HexEdge } | null {
  const sourceCenter = hexToPixel(sourceChunk.hexPosition)
  const targetCenter = hexToPixel(targetChunk.hexPosition)

  const dx = targetCenter.x - sourceCenter.x
  const dy = targetCenter.y - sourceCenter.y
  const angle = Math.atan2(dy, dx)

  const edgeAngle = (edge: HexEdge): number => {
    return (edge * Math.PI) / 3 + Math.PI / 6
  }

  let bestSourceEdge: HexEdge = 0
  let minDiff = Infinity

  for (let e = 0; e < 6; e++) {
    const diff = Math.abs(normalizeAngle(angle - edgeAngle(e as HexEdge)))
    if (diff < minDiff) {
      minDiff = diff
      bestSourceEdge = e as HexEdge
    }
  }

  const oppositeEdge = ((bestSourceEdge + 3) % 6) as HexEdge

  for (const targetEdge of [
    oppositeEdge,
    ((oppositeEdge + 1) % 6) as HexEdge,
    ((oppositeEdge + 5) % 6) as HexEdge
  ] as HexEdge[]) {
    if (checkHexEdgeCompatibility(sourceChunk, bestSourceEdge, targetChunk, targetEdge)) {
      return { sourceEdge: bestSourceEdge, targetEdge }
    }
  }

  for (let se = 0; se < 6; se++) {
    for (let te = 0; te < 6; te++) {
      if (checkHexEdgeCompatibility(sourceChunk, se as HexEdge, targetChunk, te as HexEdge)) {
        return { sourceEdge: se as HexEdge, targetEdge: te as HexEdge }
      }
    }
  }

  return null
}

export function normalizeMapData(raw: Record<string, unknown>): Map {
  const defaultData = createDefaultMapData()

  let data: MapData

  if (raw.data && typeof raw.data === 'object') {
    const rawData = raw.data as Record<string, unknown>
    data = {
      chunks: Array.isArray(rawData.chunks) ? rawData.chunks : defaultData.chunks,
      connections: Array.isArray(rawData.connections)
        ? rawData.connections
        : defaultData.connections,
      canvasWidth:
        typeof rawData.canvasWidth === 'number' ? rawData.canvasWidth : defaultData.canvasWidth,
      canvasHeight:
        typeof rawData.canvasHeight === 'number' ? rawData.canvasHeight : defaultData.canvasHeight,
      backgroundColor:
        typeof rawData.backgroundColor === 'string'
          ? rawData.backgroundColor
          : defaultData.backgroundColor,
      gridSize: typeof rawData.gridSize === 'number' ? rawData.gridSize : defaultData.gridSize,
      showGrid: typeof rawData.showGrid === 'boolean' ? rawData.showGrid : defaultData.showGrid
    }
  } else {
    data = {
      ...defaultData,
      chunks: Array.isArray(raw.nodes) ? raw.nodes : defaultData.chunks,
      connections: Array.isArray(raw.edges) ? raw.edges : defaultData.connections
    }
  }

  return {
    id: (raw.id as string) || '',
    name: (raw.name as string) || '',
    description: raw.description as string | undefined,
    thumbnail: raw.thumbnail as string | undefined,
    chunkCount: data.chunks.length,
    connectionCount: data.connections.length,
    createdAt: (raw.createdAt as string) || '',
    updatedAt: (raw.updatedAt as string) || '',
    data
  }
}

export function normalizeMapMeta(raw: Record<string, unknown>): MapMeta {
  return {
    id: (raw.id as string) || '',
    name: (raw.name as string) || '',
    description: raw.description as string | undefined,
    thumbnail: raw.thumbnail as string | undefined,
    chunkCount:
      typeof raw.chunkCount === 'number'
        ? raw.chunkCount
        : Array.isArray(raw.data?.chunks)
          ? (raw.data as Record<string, unknown[]>).chunks.length
          : typeof raw.nodeCount === 'number'
            ? raw.nodeCount
            : 0,
    connectionCount:
      typeof raw.connectionCount === 'number'
        ? raw.connectionCount
        : Array.isArray(raw.data?.connections)
          ? (raw.data as Record<string, unknown[]>).connections.length
          : typeof raw.edgeCount === 'number'
            ? raw.edgeCount
            : 0,
    createdAt: (raw.createdAt as string) || '',
    updatedAt: (raw.updatedAt as string) || ''
  }
}

function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI
  while (angle < -Math.PI) angle += 2 * Math.PI
  return Math.abs(angle)
}

export function findElementById(elements: MapElement[], id: string): MapElement | null {
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

export function deleteElementFromTree(elements: MapElement[], id: string): MapElement[] {
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
