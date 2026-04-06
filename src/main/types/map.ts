/**
 * 地图相关类型定义（主进程）
 * 
 * 从 shared 导入所有类型，保持类型一致性
 */

export type {
  Point,
  Rect,
  MapRegion,
  CreateRegionOptions,
  UpdateRegionOptions,
  ConnectionType,
  LineStyle,
  RegionConnection,
  CreateConnectionOptions,
  UpdateConnectionOptions,
  MapAnnotation,
  CreateAnnotationOptions,
  UpdateAnnotationOptions,
  MapData,
  MapMeta,
  Map,
  CreateMapOptions,
  UpdateMapOptions,
  MapTool,
  EditorState,
  HistoryEntry
} from '../../shared/map'

export {
  DEFAULT_REGION_COLOR,
  DEFAULT_REGION_BORDER_COLOR,
  DEFAULT_REGION_BORDER_WIDTH,
  DEFAULT_REGION_OPACITY,
  DEFAULT_CONNECTION_COLOR,
  DEFAULT_CONNECTION_LINE_WIDTH,
  DEFAULT_CONNECTION_LINE_STYLE,
  DEFAULT_CANVAS_WIDTH,
  DEFAULT_CANVAS_HEIGHT,
  DEFAULT_BACKGROUND_COLOR,
  DEFAULT_GRID_SIZE,
  DEFAULT_GRID_COLOR,
  DEFAULT_ANNOTATION_FONT_SIZE,
  DEFAULT_ANNOTATION_FONT_FAMILY,
  DEFAULT_ANNOTATION_COLOR,
  calculateCenter,
  calculateBoundingBox,
  isPointInPolygon,
  generateId,
  createDefaultRegion,
  createDefaultConnection,
  createDefaultAnnotation,
  createDefaultMapData
} from '../../shared/map'
