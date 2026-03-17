/**
 * 文件树类型定义
 */

/**
 * 文件节点数据（来自后端）
 */
export interface FileNodeData {
  key: string
  name: string
  path: string
  isDirectory: boolean
  children?: FileNodeData[]
  extension?: string
  size?: number
  modifiedAt?: string
}

/**
 * 扁平化的树节点（用于虚拟列表）
 */
export interface FlattenedNode {
  /** 原始节点数据 */
  node: FileNodeData
  /** 嵌套深度 */
  depth: number
  /** 唯一标识 */
  id: string
}

/**
 * 剪贴板状态
 */
export interface ClipboardState {
  nodes: FileNodeData[]
  operation: 'copy' | 'cut'
}

/**
 * 拖拽位置
 */
export type DropPosition = 'before' | 'over' | 'after'

/**
 * 拖拽状态
 */
export interface DragState {
  isDragging: boolean
  draggedKeys: Set<string>
  dropTarget: string | null
  dropPosition: DropPosition
}

/**
 * 排序字段
 */
export type SortField = 'name' | 'modified'

/**
 * 排序顺序
 */
export type SortOrder = 'asc' | 'desc'

/**
 * 排序模式（组合字段和顺序）
 */
export type SortMode = `${SortField}-${SortOrder}`

/**
 * 排序选项接口
 */
export interface SortOptions {
  field: SortField
  order: SortOrder
}

/**
 * 文件树状态
 */
export interface FileTreeState {
  // 数据
  roots: FileNodeData[]
  loading: boolean
  error: string | null
  
  // UI 状态
  expandedKeys: Set<string>
  selectedKeys: Set<string>
  focusedKey: string | null
  
  // 编辑状态
  editingKey: string | null
  editingName: string
  newItemParent: string | null
  newItemType: 'file' | 'folder'
  newItemName: string
  
  // 剪贴板
  clipboard: ClipboardState | null
  
  // 搜索
  searchPattern: string
  filteredKeys: Set<string> | null
  
  // 排序
  sortMode: SortMode
}

/**
 * 文件树操作
 */
export interface FileTreeActions {
  // 数据加载
  loadTree: () => Promise<void>
  refreshTree: () => Promise<void>
  
  // 展开/折叠
  toggleExpand: (key: string) => void
  expandAll: () => void
  collapseAll: () => void
  expandToPath: (path: string) => void
  
  // 选择
  select: (key: string, mode?: 'single' | 'toggle' | 'range') => void
  selectAll: () => void
  clearSelection: () => void
  setFocusedKey: (key: string | null) => void
  
  // 编辑
  startRename: (key: string) => void
  finishRename: (newName: string) => Promise<void>
  cancelEdit: () => void
  startNewItem: (parentKey: string | null, type: 'file' | 'folder') => void
  finishNewItem: (name: string) => Promise<void>
  
  // 文件操作
  deleteItems: (keys: string[], permanent: boolean) => Promise<void>
  copyItems: (keys: string[]) => void
  cutItems: (keys: string[]) => void
  paste: (targetKey: string | null) => Promise<void>
  
  // 搜索
  search: (pattern: string) => void
  clearSearch: () => void
  
  // 排序
  setSortMode: (mode: SortMode) => void
  
  // 工具方法
  findNode: (key: string) => FileNodeData | null
  getParentNode: (key: string) => FileNodeData | null
  getFlattenedNodes: () => FlattenedNode[]
}
