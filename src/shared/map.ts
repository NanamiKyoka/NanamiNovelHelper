/**
 * 地图相关类型定义（共享）
 * 
 * 设计理念：网格拼图式地图编辑器
 * - 支持自由多边形板块绘制
 * - 板块之间可以建立连接关系
 * - 每个板块可携带丰富的元数据
 */

// ============================================
// 基础类型
// ============================================

/**
 * 点坐标
 */
export interface Point {
  x: number
  y: number
}

/**
 * 矩形区域
 */
export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

// ============================================
// 地图板块（多边形区域）
// ============================================

/**
 * 地图板块
 */
export interface MapRegion {
  id: string
  type: 'region'
  
  // 几何属性
  vertices: Point[]  // 多边形顶点坐标
  center: Point      // 中心点（自动计算）
  
  // 元数据
  name: string
  description: string
  color: string        // 填充颜色
  icon?: string        // 图标名称或 URL
  image?: string       // 背景图片 URL 或 base64
  
  // 样式
  borderColor: string
  borderWidth: number
  opacity: number      // 0-1
  
  // 层级
  zIndex: number
  
  // 时间戳
  createdAt: number
  updatedAt: number
}

/**
 * 创建板块选项
 */
export interface CreateRegionOptions {
  vertices: Point[]
  name?: string
  description?: string
  color?: string
  icon?: string
  borderColor?: string
  borderWidth?: number
  opacity?: number
}

/**
 * 更新板块选项
 */
export interface UpdateRegionOptions {
  vertices?: Point[]
  name?: string
  description?: string
  color?: string
  icon?: string
  image?: string
  borderColor?: string
  borderWidth?: number
  opacity?: number
  zIndex?: number
}

// ============================================
// 板块连接
// ============================================

/**
 * 连接类型
 */
export type ConnectionType = 'land' | 'water' | 'portal' | 'custom'

/**
 * 线条样式
 */
export type LineStyle = 'solid' | 'dashed' | 'dotted'

/**
 * 板块连接
 */
export interface RegionConnection {
  id: string
  type: 'connection'
  
  // 连接的板块
  sourceId: string
  targetId: string
  
  // 连接类型
  connectionType: ConnectionType
  customTypeName?: string
  
  // 样式
  color: string
  lineWidth: number
  lineStyle: LineStyle
  
  // 连接路径（可选，用于曲线连接的控制点）
  controlPoints?: Point[]
  
  // 元数据
  name?: string
  description?: string
}

/**
 * 创建连接选项
 */
export interface CreateConnectionOptions {
  sourceId: string
  targetId: string
  connectionType?: ConnectionType
  customTypeName?: string
  color?: string
  lineWidth?: number
  lineStyle?: LineStyle
  name?: string
  description?: string
}

/**
 * 更新连接选项
 */
export interface UpdateConnectionOptions {
  connectionType?: ConnectionType
  customTypeName?: string
  color?: string
  lineWidth?: number
  lineStyle?: LineStyle
  controlPoints?: Point[]
  name?: string
  description?: string
}

// ============================================
// 地图标注
// ============================================

/**
 * 地图标注（文本、图标等）
 */
export interface MapAnnotation {
  id: string
  type: 'annotation'
  
  // 位置
  position: Point
  
  // 内容
  text?: string
  icon?: string
  
  // 样式
  fontSize: number
  fontFamily: string
  color: string
  rotation: number  // 角度
  
  // 层级
  zIndex: number
}

/**
 * 创建标注选项
 */
export interface CreateAnnotationOptions {
  position: Point
  text?: string
  icon?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  rotation?: number
}

/**
 * 更新标注选项
 */
export interface UpdateAnnotationOptions {
  position?: Point
  text?: string
  icon?: string
  fontSize?: number
  fontFamily?: string
  color?: string
  rotation?: number
  zIndex?: number
}

// ============================================
// 地图数据
// ============================================

/**
 * 地图数据（完整）
 */
export interface MapData {
  // 画布设置
  canvasWidth: number
  canvasHeight: number
  backgroundColor: string
  
  // 网格设置
  showGrid: boolean
  gridSize: number
  gridColor: string
  
  // 元素
  regions: MapRegion[]
  connections: RegionConnection[]
  annotations: MapAnnotation[]
}

/**
 * 地图元数据
 */
export interface MapMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  
  // 统计信息
  regionCount: number
  connectionCount: number
  annotationCount: number
  
  // 时间戳
  createdAt: string
  updatedAt: string
}

/**
 * 完整地图数据（包含元数据）
 */
export interface Map extends MapMeta {
  data: MapData
}

/**
 * 创建地图选项
 */
export interface CreateMapOptions {
  name: string
  description?: string
  canvasWidth?: number
  canvasHeight?: number
  backgroundColor?: string
}

/**
 * 更新地图选项
 */
export interface UpdateMapOptions {
  name?: string
  description?: string
  thumbnail?: string
  data?: MapData
}

// ============================================
// 编辑器状态
// ============================================

/**
 * 编辑工具类型
 */
export type MapTool = 
  | 'select'       // 选择工具
  | 'pan'          // 平移视图
  | 'draw'         // 绘制板块
  | 'edit-vertex'  // 编辑顶点
  | 'connect'      // 连接工具
  | 'annotate'     // 标注工具
  | 'delete'       // 删除工具

/**
 * 编辑器状态
 */
export interface EditorState {
  // 当前工具
  tool: MapTool
  
  // 选中的元素 ID
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
}

/**
 * 历史记录条目
 */
export interface HistoryEntry {
  id: string
  timestamp: number
  action: string
  description: string
  // 使用快照方式
  snapshot: MapData
}

// ============================================
// 默认值
// ============================================

export const DEFAULT_REGION_COLOR = '#4a9eff'
export const DEFAULT_REGION_BORDER_COLOR = '#2d7dd2'
export const DEFAULT_REGION_BORDER_WIDTH = 2
export const DEFAULT_REGION_OPACITY = 0.7

export const DEFAULT_CONNECTION_COLOR = '#ffffff'
export const DEFAULT_CONNECTION_LINE_WIDTH = 2
export const DEFAULT_CONNECTION_LINE_STYLE: LineStyle = 'solid'

export const DEFAULT_CANVAS_WIDTH = 1920
export const DEFAULT_CANVAS_HEIGHT = 1080
export const DEFAULT_BACKGROUND_COLOR = '#1a1a2e'
export const DEFAULT_GRID_SIZE = 50
export const DEFAULT_GRID_COLOR = '#333344'

export const DEFAULT_ANNOTATION_FONT_SIZE = 14
export const DEFAULT_ANNOTATION_FONT_FAMILY = 'system-ui, sans-serif'
export const DEFAULT_ANNOTATION_COLOR = '#ffffff'

// ============================================
// 辅助函数
// ============================================

/**
 * 计算多边形中心点
 */
export function calculateCenter(vertices: Point[]): Point {
  if (vertices.length === 0) return { x: 0, y: 0 }
  
  const sum = vertices.reduce(
    (acc, v) => ({ x: acc.x + v.x, y: acc.y + v.y }),
    { x: 0, y: 0 }
  )
  
  return {
    x: sum.x / vertices.length,
    y: sum.y / vertices.length
  }
}

/**
 * 计算多边形包围盒
 */
export function calculateBoundingBox(vertices: Point[]): Rect {
  if (vertices.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 }
  }
  
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  
  for (const v of vertices) {
    minX = Math.min(minX, v.x)
    minY = Math.min(minY, v.y)
    maxX = Math.max(maxX, v.x)
    maxY = Math.max(maxY, v.y)
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * 判断点是否在多边形内（射线法）
 */
export function isPointInPolygon(point: Point, vertices: Point[]): boolean {
  if (vertices.length < 3) return false
  
  let inside = false
  const n = vertices.length
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x
    const yi = vertices[i].y
    const xj = vertices[j].x
    const yj = vertices[j].y
    
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * 创建默认的板块
 */
export function createDefaultRegion(options: CreateRegionOptions): MapRegion {
  const now = Date.now()
  return {
    id: generateId(),
    type: 'region',
    vertices: options.vertices,
    center: calculateCenter(options.vertices),
    name: options.name || '未命名区域',
    description: options.description || '',
    color: options.color || DEFAULT_REGION_COLOR,
    icon: options.icon,
    borderColor: options.borderColor || DEFAULT_REGION_BORDER_COLOR,
    borderWidth: options.borderWidth ?? DEFAULT_REGION_BORDER_WIDTH,
    opacity: options.opacity ?? DEFAULT_REGION_OPACITY,
    zIndex: 0,
    createdAt: now,
    updatedAt: now
  }
}

/**
 * 创建默认的连接
 */
export function createDefaultConnection(options: CreateConnectionOptions): RegionConnection {
  return {
    id: generateId(),
    type: 'connection',
    sourceId: options.sourceId,
    targetId: options.targetId,
    connectionType: options.connectionType || 'land',
    customTypeName: options.customTypeName,
    color: options.color || DEFAULT_CONNECTION_COLOR,
    lineWidth: options.lineWidth ?? DEFAULT_CONNECTION_LINE_WIDTH,
    lineStyle: options.lineStyle || DEFAULT_CONNECTION_LINE_STYLE,
    name: options.name,
    description: options.description
  }
}

/**
 * 创建默认的标注
 */
export function createDefaultAnnotation(options: CreateAnnotationOptions): MapAnnotation {
  return {
    id: generateId(),
    type: 'annotation',
    position: options.position,
    text: options.text || '',
    icon: options.icon,
    fontSize: options.fontSize || DEFAULT_ANNOTATION_FONT_SIZE,
    fontFamily: options.fontFamily || DEFAULT_ANNOTATION_FONT_FAMILY,
    color: options.color || DEFAULT_ANNOTATION_COLOR,
    rotation: options.rotation || 0,
    zIndex: 0
  }
}

/**
 * 创建默认的地图数据
 */
export function createDefaultMapData(): MapData {
  return {
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    canvasHeight: DEFAULT_CANVAS_HEIGHT,
    backgroundColor: DEFAULT_BACKGROUND_COLOR,
    showGrid: true,
    gridSize: DEFAULT_GRID_SIZE,
    gridColor: DEFAULT_GRID_COLOR,
    regions: [],
    connections: [],
    annotations: []
  }
}