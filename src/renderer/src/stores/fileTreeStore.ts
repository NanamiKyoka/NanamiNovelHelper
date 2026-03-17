/**
 * 文件树状态管理
 */

import { create } from 'zustand'
import type { FileNodeData, FlattenedNode, ClipboardState, SortMode, SortField, SortOrder, SortOptions } from '@types/fileTree'

interface FileTreeState {
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
  sortOptions: SortOptions
  
  // Actions
  loadTree: () => Promise<void>
  refreshTree: () => Promise<void>
  toggleExpand: (key: string) => void
  expandAll: () => void
  collapseAll: () => void
  expandToPath: (path: string) => Promise<void>
  select: (key: string, mode?: 'single' | 'toggle' | 'range') => void
  selectAll: () => void
  clearSelection: () => void
  setFocusedKey: (key: string | null) => void
  startRename: (key: string) => void
  finishRename: (newName: string) => Promise<void>
  cancelEdit: () => void
  startNewItem: (parentKey: string | null, type: 'file' | 'folder') => void
  finishNewItem: (name: string) => Promise<void>
  deleteItems: (keys: string[], permanent: boolean) => Promise<void>
  copyItems: (keys: string[]) => void
  cutItems: (keys: string[]) => void
  paste: (targetKey: string | null) => Promise<void>
  search: (pattern: string) => void
  clearSearch: () => void
  setSortMode: (mode: SortMode) => void
  toggleSortOrder: () => void
  findNode: (key: string) => FileNodeData | null
  getParentNode: (key: string) => FileNodeData | null
  getFlattenedNodes: () => FlattenedNode[]
}

/**
 * 递归查找节点
 */
function findNodeRecursive(nodes: FileNodeData[], key: string): FileNodeData | null {
  for (const node of nodes) {
    if (node.key === key) return node
    if (node.children) {
      const found = findNodeRecursive(node.children, key)
      if (found) return found
    }
  }
  return null
}

/**
 * 递归查找父节点
 */
function findParentNodeRecursive(nodes: FileNodeData[], key: string, parent: FileNodeData | null = null): FileNodeData | null {
  for (const node of nodes) {
    if (node.key === key) return parent
    if (node.children) {
      const found = findParentNodeRecursive(node.children, key, node)
      if (found !== undefined) return found
    }
  }
  return undefined as unknown as FileNodeData | null
}

/**
 * 递归收集所有节点 key
 */
function collectAllKeys(nodes: FileNodeData[]): string[] {
  const keys: string[] = []
  for (const node of nodes) {
    if (node.isDirectory) {
      keys.push(node.key)
      if (node.children) {
        keys.push(...collectAllKeys(node.children))
      }
    }
  }
  return keys
}

/**
 * 扁平化树（用于虚拟滚动）
 */
function flattenTree(
  nodes: FileNodeData[], 
  expandedKeys: Set<string>, 
  filteredKeys: Set<string> | null,
  newItemParent: string | null,
  newItemType: 'file' | 'folder',
  newItemName: string,
  depth = 0
): FlattenedNode[] {
  const result: FlattenedNode[] = []
  
  // 根目录新建项（newItemParent === null）
  if (newItemParent === null && depth === 0 && newItemName) {
    result.push({
      node: {
        key: '__new_item__',
        name: newItemName,
        path: '',
        isDirectory: newItemType === 'folder',
        isNewItem: true,
        newItemType
      } as any,
      depth: 0,
      id: '__new_item__'
    })
  }
  
  for (const node of nodes) {
    // 如果有过滤，检查是否匹配
    if (filteredKeys && !filteredKeys.has(node.key)) {
      continue
    }
    
    result.push({
      node,
      depth,
      id: node.key
    })
    
    // 如果是目录，处理子节点和新建项
    if (node.isDirectory && node.children) {
      // 如果新建项的父节点是当前节点，在子节点之前插入新建项
      if (newItemParent === node.key && newItemName) {
        // 确保目录展开
        if (!expandedKeys.has(node.key)) {
          // 目录未展开，但需要显示新建项，所以展开它
          expandedKeys = new Set([...expandedKeys, node.key])
        }
        
        // 在子节点之前插入新建项
        result.push({
          node: {
            key: '__new_item__',
            name: newItemName,
            path: '',
            isDirectory: newItemType === 'folder',
            isNewItem: true,
            newItemType
          } as any,
          depth: depth + 1,
          id: '__new_item__'
        })
      }
      
      // 如果目录展开，递归添加子节点
      if (expandedKeys.has(node.key)) {
        const children = flattenTree(node.children, expandedKeys, filteredKeys, newItemParent, newItemType, newItemName, depth + 1)
        result.push(...children)
      }
    }
  }
  
  return result
}

/**
 * 搜索匹配的节点
 */
function searchNodes(nodes: FileNodeData[], pattern: string, parentMatch = false): Set<string> {
  const matches = new Set<string>()
  const lowerPattern = pattern.toLowerCase()
  
  for (const node of nodes) {
    const nameMatch = node.name.toLowerCase().includes(lowerPattern)
    const pathMatch = node.path.toLowerCase().includes(lowerPattern)
    
    // 自己匹配或者父节点匹配
    if (nameMatch || pathMatch || parentMatch) {
      matches.add(node.key)
      
      // 如果是目录，递归添加所有子节点
      if (node.children) {
        const childMatches = searchNodes(node.children, pattern, true)
        childMatches.forEach(k => matches.add(k))
      }
    } else if (node.children) {
      // 检查子节点是否有匹配
      const childMatches = searchNodes(node.children, pattern, false)
      if (childMatches.size > 0) {
        matches.add(node.key)
        childMatches.forEach(k => matches.add(k))
      }
    }
  }
  
  return matches
}

/**
 * 解析排序模式字符串
 */
function parseSortMode(mode: SortMode): SortOptions {
  const [field, order] = mode.split('-') as [SortField, SortOrder]
  return { field, order }
}

/**
 * 将排序选项转换为排序模式字符串
 */
function toSortMode(options: SortOptions): SortMode {
  return `${options.field}-${options.order}` as SortMode
}

export const useFileTreeStore = create<FileTreeState>((set, get) => ({
  roots: [],
  loading: false,
  error: null,
  expandedKeys: new Set(),
  selectedKeys: new Set(),
  focusedKey: null,
  editingKey: null,
  editingName: '',
  newItemParent: null,
  newItemType: 'file',
  newItemName: '',
  clipboard: null,
  searchPattern: '',
  filteredKeys: null,
  sortMode: 'name-asc',
  sortOptions: { field: 'name', order: 'asc' },
  
  loadTree: async () => {
    const { sortOptions } = get()
    set({ loading: true, error: null })
    try {
      // 从设置中获取是否显示隐藏文件
      const showHiddenFiles = await window.electron.settings.project.getShowHiddenFiles()
      const tree = await window.electron.file.getTree(showHiddenFiles, sortOptions)
      // 默认展开根目录
      const rootKeys = tree.filter(n => n.isDirectory).map(n => n.key)
      set({ 
        roots: tree, 
        loading: false,
        expandedKeys: new Set(rootKeys)
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载文件树失败'
      set({ loading: false, error: errorMessage })
    }
  },
  
  refreshTree: async () => {
    const { loadTree } = get()
    await loadTree()
  },
  
  toggleExpand: (key) => {
    set(state => {
      const next = new Set(state.expandedKeys)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return { expandedKeys: next }
    })
  },
  
  expandAll: () => {
    const { roots } = get()
    set({ expandedKeys: new Set(collectAllKeys(roots)) })
  },
  
  collapseAll: () => {
    set({ expandedKeys: new Set() })
  },
  
  expandToPath: async (path) => {
    // 展开到指定路径
    const parts = path.split('/').filter(Boolean)
    const keysToExpand: string[] = []
    
    let currentPath = ''
    for (let i = 0; i < parts.length - 1; i++) {
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
      keysToExpand.push(currentPath)
    }
    
    set(state => ({
      expandedKeys: new Set([...state.expandedKeys, ...keysToExpand])
    }))
  },
  
  select: (key, mode = 'single') => {
    set(state => {
      if (mode === 'toggle') {
        const next = new Set(state.selectedKeys)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        return { selectedKeys: next, focusedKey: key }
      } else {
        return { selectedKeys: new Set([key]), focusedKey: key }
      }
    })
  },
  
  selectAll: () => {
    const { getFlattenedNodes } = get()
    const nodes = getFlattenedNodes()
    set({ selectedKeys: new Set(nodes.map(n => n.id)) })
  },
  
  clearSelection: () => {
    set({ selectedKeys: new Set(), focusedKey: null })
  },
  
  setFocusedKey: (key) => {
    set({ focusedKey: key })
  },
  
  startRename: (key) => {
    const node = get().findNode(key)
    if (node) {
      set({ editingKey: key, editingName: node.name })
    }
  },
  
  finishRename: async (newName) => {
    const { editingKey, roots, findNode, refreshTree } = get()
    if (!editingKey || !newName.trim()) {
      set({ editingKey: null, editingName: '' })
      return
    }
    
    const node = findNode(editingKey)
    if (!node) {
      set({ editingKey: null, editingName: '' })
      return
    }
    
    // 计算新路径
    const pathParts = node.path.split('/')
    pathParts[pathParts.length - 1] = newName.trim()
    const newPath = pathParts.join('/')
    
    try {
      await window.electron.file.rename(node.path, newPath)
      set({ editingKey: null, editingName: '' })
      await refreshTree()
    } catch (error) {
      throw error
    }
  },
  
  cancelEdit: () => {
    set({ editingKey: null, editingName: '', newItemParent: null, newItemName: '' })
  },
  
  startNewItem: (parentKey, type) => {
    set({
      newItemParent: parentKey,
      newItemType: type,
      newItemName: type === 'file' ? '新建文件.md' : '新建文件夹'
    })
    
    // 如果父节点是目录，确保展开
    if (parentKey) {
      set(state => ({
        expandedKeys: new Set([...state.expandedKeys, parentKey])
      }))
    }
  },
  
  finishNewItem: async (name) => {
    const { newItemParent, newItemType, refreshTree } = get()
    if (!name.trim()) {
      set({ newItemParent: null, newItemName: '' })
      return
    }
    
    const parentPath = newItemParent || ''
    const newPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim()
    
    try {
      if (newItemType === 'folder') {
        await window.electron.file.mkdir(newPath, true)
      } else {
        await window.electron.file.write(newPath, '', { createParentDir: true })
      }
      set({ newItemParent: null, newItemName: '' })
      await refreshTree()
    } catch (error) {
      throw error
    }
  },
  
  deleteItems: async (keys, permanent) => {
    const { findNode, refreshTree, clearSelection } = get()
    const nodes = keys.map(k => findNode(k)).filter(Boolean) as FileNodeData[]
    
    for (const node of nodes) {
      await window.electron.file.delete(node.path, {
        recursive: true,
        useTrash: !permanent
      })
    }
    
    clearSelection()
    await refreshTree()
  },
  
  copyItems: (keys) => {
    const { findNode } = get()
    const nodes = keys.map(k => findNode(k)).filter(Boolean) as FileNodeData[]
    set({ clipboard: { nodes, operation: 'copy' } })
  },
  
  cutItems: (keys) => {
    const { findNode } = get()
    const nodes = keys.map(k => findNode(k)).filter(Boolean) as FileNodeData[]
    set({ clipboard: { nodes, operation: 'cut' } })
  },
  
  paste: async (targetKey) => {
    const { clipboard, findNode, refreshTree } = get()
    if (!clipboard || clipboard.nodes.length === 0) return
    
    const targetNode = targetKey ? findNode(targetKey) : null
    const targetPath = targetNode?.isDirectory ? targetNode.path : ''
    
    for (const node of clipboard.nodes) {
      const destination = targetPath ? `${targetPath}/${node.name}` : node.name
      
      if (clipboard.operation === 'copy') {
        await window.electron.file.copy(node.path, destination, false)
      } else {
        await window.electron.file.rename(node.path, destination)
      }
    }
    
    // 如果是剪切，清空剪贴板
    if (clipboard.operation === 'cut') {
      set({ clipboard: null })
    }
    
    await refreshTree()
  },
  
  search: (pattern) => {
    const { roots } = get()
    if (!pattern.trim()) {
      set({ searchPattern: '', filteredKeys: null })
      return
    }
    
    const matches = searchNodes(roots, pattern)
    set({ 
      searchPattern: pattern, 
      filteredKeys: matches,
      // 展开所有匹配的父节点
      expandedKeys: new Set([...get().expandedKeys, ...matches])
    })
  },
  
  clearSearch: () => {
    set({ searchPattern: '', filteredKeys: null })
  },
  
  setSortMode: (mode) => {
    const sortOptions = parseSortMode(mode)
    set({ sortMode: mode, sortOptions })
  },
  
  toggleSortOrder: () => {
    const { sortOptions, sortMode } = get()
    const newOrder: SortOrder = sortOptions.order === 'asc' ? 'desc' : 'asc'
    const newSortOptions: SortOptions = { ...sortOptions, order: newOrder }
    set({ 
      sortMode: toSortMode(newSortOptions), 
      sortOptions: newSortOptions 
    })
  },
  
  findNode: (key) => {
    const { roots } = get()
    return findNodeRecursive(roots, key)
  },
  
  getParentNode: (key) => {
    const { roots } = get()
    return findParentNodeRecursive(roots, key) ?? null
  },
  
  getFlattenedNodes: () => {
    const { roots, expandedKeys, filteredKeys, newItemParent, newItemType, newItemName } = get()
    return flattenTree(roots, expandedKeys, filteredKeys, newItemParent, newItemType, newItemName)
  }
}))

export default useFileTreeStore
