import { create } from 'zustand'
import type {
  FileNodeData,
  FlattenedNode,
  ClipboardState,
  SortMode,
  SortField,
  SortOrder,
  SortOptions
} from '@types/fileTree'

interface NewItemNode extends FileNodeData {
  isNewItem: true
  newItemType: 'file' | 'folder'
}

let saveExpandedFoldersTimer: ReturnType<typeof setTimeout> | null = null

interface FileTreeState {
  roots: FileNodeData[]
  loading: boolean
  error: string | null

  expandedKeys: Set<string>
  selectedKeys: Set<string>
  focusedKey: string | null

  editingKey: string | null
  editingName: string
  newItemParent: string | null | undefined
  newItemType: 'file' | 'folder'
  newItemName: string

  clipboard: ClipboardState | null

  searchPattern: string
  filteredKeys: Set<string> | null

  sortMode: SortMode
  sortOptions: SortOptions

  gitStatus: Map<string, string>

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
  finishNewItem: (name: string, isBlur?: boolean) => Promise<void>
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
  updateGitStatus: (changes: { path: string; statusShort: string; staged: boolean }[]) => void
  setData: (
    roots: FileNodeData[],
    expandedFolders: string[] | null,
    showHiddenFiles: boolean,
    hiddenItems: string[]
  ) => void
  clearFileTreeData: () => void
}

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

function findParentNodeRecursive(
  nodes: FileNodeData[],
  key: string,
  parent: FileNodeData | null = null
): FileNodeData | null {
  for (const node of nodes) {
    if (node.key === key) return parent
    if (node.children) {
      const found = findParentNodeRecursive(node.children, key, node)
      if (found !== undefined) return found
    }
  }
  return undefined as unknown as FileNodeData | null
}

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

function flattenTree(
  nodes: FileNodeData[],
  expandedKeys: Set<string>,
  filteredKeys: Set<string> | null,
  newItemParent: string | null | undefined,
  newItemType: 'file' | 'folder',
  newItemName: string,
  depth = 0
): FlattenedNode[] {
  const result: FlattenedNode[] = []

  if (newItemParent === null && depth === 0) {
    result.push({
      node: {
        key: '__new_item__',
        name: newItemName,
        path: '',
        isDirectory: newItemType === 'folder',
        isNewItem: true,
        newItemType
      } as NewItemNode,
      depth: 0,
      id: '__new_item__'
    })
  }

  for (const node of nodes) {
    if (filteredKeys && !filteredKeys.has(node.key)) {
      continue
    }

    result.push({
      node,
      depth,
      id: node.key
    })

    if (node.isDirectory && node.children) {
      if (newItemParent === node.key) {
        if (!expandedKeys.has(node.key)) {
          expandedKeys = new Set([...expandedKeys, node.key])
        }

        result.push({
          node: {
            key: '__new_item__',
            name: newItemName,
            path: '',
            isDirectory: newItemType === 'folder',
            isNewItem: true,
            newItemType
          } as NewItemNode,
          depth: depth + 1,
          id: '__new_item__'
        })
      }

      if (expandedKeys.has(node.key)) {
        const children = flattenTree(
          node.children,
          expandedKeys,
          filteredKeys,
          newItemParent,
          newItemType,
          newItemName,
          depth + 1
        )
        result.push(...children)
      }
    }
  }

  return result
}

function searchNodes(nodes: FileNodeData[], pattern: string, parentMatch = false): Set<string> {
  const matches = new Set<string>()
  const lowerPattern = pattern.toLowerCase()

  for (const node of nodes) {
    const nameMatch = node.name.toLowerCase().includes(lowerPattern)
    const pathMatch = node.path.toLowerCase().includes(lowerPattern)

    if (nameMatch || pathMatch || parentMatch) {
      matches.add(node.key)

      if (node.children) {
        const childMatches = searchNodes(node.children, pattern, true)
        childMatches.forEach(k => matches.add(k))
      }
    } else if (node.children) {
      const childMatches = searchNodes(node.children, pattern, false)
      if (childMatches.size > 0) {
        matches.add(node.key)
        childMatches.forEach(k => matches.add(k))
      }
    }
  }

  return matches
}

function parseSortMode(mode: SortMode): SortOptions {
  const [field, order] = mode.split('-') as [SortField, SortOrder]
  return { field, order }
}

function toSortMode(options: SortOptions): SortMode {
  return `${options.field}-${options.order}` as SortMode
}

function debouncedSaveExpandedFolders(expandedKeys: Set<string>) {
  if (saveExpandedFoldersTimer) {
    clearTimeout(saveExpandedFoldersTimer)
  }
  saveExpandedFoldersTimer = setTimeout(() => {
    window.electron.settings.project.setExpandedFolders(Array.from(expandedKeys))
    saveExpandedFoldersTimer = null
  }, 500)
}

export const useFileTreeStore = create<FileTreeState>((set, get) => {
  let treeRefreshing = false
  let needsTreeRefresh = false

  return {
    roots: [],
    loading: false,
    error: null,
    expandedKeys: new Set(),
    selectedKeys: new Set(),
    focusedKey: null,
    editingKey: null,
    editingName: '',
    newItemParent: undefined,
    newItemType: 'file',
    newItemName: '',
    clipboard: null,
    searchPattern: '',
    filteredKeys: null,
    sortMode: 'name-asc',
    sortOptions: { field: 'name', order: 'asc' },
    gitStatus: new Map(),

    loadTree: async () => {
      const { sortOptions } = get()
      set({ loading: true, error: null })
      try {
        const showHiddenFiles = await window.electron.settings.global.getShowHiddenFiles()
        const hiddenItems = await window.electron.settings.project.getHiddenItems()
        const tree = await window.electron.file.getTree(showHiddenFiles, sortOptions, hiddenItems)

        const savedExpandedFolders = await window.electron.settings.project.getExpandedFolders()

        let expandedKeys: Set<string>
        if (savedExpandedFolders === null) {
          expandedKeys = new Set(tree.filter(n => n.isDirectory).map(n => n.key))
        } else {
          expandedKeys = new Set(savedExpandedFolders)
        }

        set({
          roots: tree,
          loading: false,
          expandedKeys
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '加载文件树失败'
        set({ loading: false, error: errorMessage })
      }
    },

    refreshTree: async () => {
      if (treeRefreshing) {
        needsTreeRefresh = true
        return
      }
      treeRefreshing = true
      try {
        do {
          needsTreeRefresh = false
          const { sortOptions } = get()
          const showHiddenFiles = await window.electron.settings.global.getShowHiddenFiles()
          const hiddenItems = await window.electron.settings.project.getHiddenItems()
          const tree = await window.electron.file.getTree(showHiddenFiles, sortOptions, hiddenItems)
          set(state => ({
            roots: tree,
            loading: false,
            error: null,
            expandedKeys: state.expandedKeys
          }))
        } while (needsTreeRefresh)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '刷新文件树失败'
        set({ loading: false, error: errorMessage })
      } finally {
        treeRefreshing = false
      }
    },

    toggleExpand: key => {
      set(state => {
        const next = new Set(state.expandedKeys)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.add(key)
        }
        debouncedSaveExpandedFolders(next)
        return { expandedKeys: next }
      })
    },

    expandAll: () => {
      const { roots } = get()
      const expandedKeys = new Set(collectAllKeys(roots))
      set({ expandedKeys })
      debouncedSaveExpandedFolders(expandedKeys)
    },

    collapseAll: () => {
      const expandedKeys = new Set<string>()
      set({ expandedKeys })
      debouncedSaveExpandedFolders(expandedKeys)
    },

    expandToPath: async path => {
      const parts = path.split(/[/\\]/).filter(Boolean)
      const keysToExpand: string[] = []

      let currentPath = ''
      for (let i = 0; i < parts.length - 1; i++) {
        currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]
        keysToExpand.push(currentPath)
      }

      set(state => {
        const expandedKeys = new Set([...state.expandedKeys, ...keysToExpand])
        debouncedSaveExpandedFolders(expandedKeys)
        return { expandedKeys }
      })
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

    setFocusedKey: key => {
      set({ focusedKey: key })
    },

    startRename: key => {
      const node = get().findNode(key)
      if (node) {
        set({ editingKey: key, editingName: node.name })
      }
    },

    finishRename: async newName => {
      const { editingKey, findNode, refreshTree } = get()
      if (!editingKey || !newName.trim()) {
        set({ editingKey: null, editingName: '' })
        return
      }

      const node = findNode(editingKey)
      if (!node) {
        set({ editingKey: null, editingName: '' })
        return
      }

      const pathParts = node.path.split(/[/\\]/)
      pathParts[pathParts.length - 1] = newName.trim()
      const newPath = pathParts.join('/')

      await window.electron.file.rename(node.path, newPath)
      set({ editingKey: null, editingName: '' })
      await refreshTree()

      const { useEditorStore } = await import('./editorStore')
      const { useGitStore } = await import('./gitStore')
      useEditorStore.getState().updateTabPath(node.path, newPath, newName.trim())
      useGitStore.getState().scheduleRefresh()
    },

    cancelEdit: () => {
      set({ editingKey: null, editingName: '', newItemParent: undefined, newItemName: '' })
    },

    startNewItem: (parentKey, type) => {
      set({
        newItemParent: parentKey,
        newItemType: type,
        newItemName: type === 'file' ? '新建文件.novel' : '新建文件夹'
      })

      if (parentKey) {
        set(state => {
          const expandedKeys = new Set([...state.expandedKeys, parentKey])
          debouncedSaveExpandedFolders(expandedKeys)
          return { expandedKeys }
        })
      }
    },

    finishNewItem: async (name, _isBlur = false) => {
      const { newItemParent, newItemType, refreshTree } = get()

      if (!name.trim()) {
        set({ newItemParent: undefined, newItemName: '' })
        return
      }

      const parentPath = newItemParent || ''
      const newPath = parentPath ? `${parentPath}/${name.trim()}` : name.trim()

      if (newItemType === 'folder') {
        await window.electron.file.mkdir(newPath, true)
      } else {
        await window.electron.file.write(newPath, '', { createParentDir: true })
      }
      set({ newItemParent: undefined, newItemName: '' })
      await refreshTree()

      const { useGitStore } = await import('./gitStore')
      useGitStore.getState().scheduleRefresh()
    },

    deleteItems: async (keys, permanent) => {
      const { findNode, refreshTree, clearSelection } = get()
      const nodes = keys.map(k => findNode(k)).filter(Boolean) as FileNodeData[]

      const deletedPaths = nodes.map(n => n.path)

      for (const node of nodes) {
        await window.electron.file.delete(node.path, {
          recursive: true,
          useTrash: !permanent
        })
      }

      clearSelection()
      await refreshTree()

      const { useEditorStore } = await import('./editorStore')
      const { useGitStore } = await import('./gitStore')
      useEditorStore.getState().closeTabsByPaths(deletedPaths)
      useGitStore.getState().scheduleRefresh()
    },

    copyItems: keys => {
      const { findNode } = get()
      const nodes = keys.map(k => findNode(k)).filter(Boolean) as FileNodeData[]
      set({ clipboard: { nodes, operation: 'copy' } })
    },

    cutItems: keys => {
      const { findNode } = get()
      const nodes = keys.map(k => findNode(k)).filter(Boolean) as FileNodeData[]
      set({ clipboard: { nodes, operation: 'cut' } })
    },

    paste: async targetKey => {
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

      if (clipboard.operation === 'cut') {
        set({ clipboard: null })
      }

      await refreshTree()

      const { useGitStore } = await import('./gitStore')
      useGitStore.getState().scheduleRefresh()
    },

    search: pattern => {
      const { roots } = get()
      if (!pattern.trim()) {
        set({ searchPattern: '', filteredKeys: null })
        return
      }

      const matches = searchNodes(roots, pattern)
      const expandedKeys = new Set([...get().expandedKeys, ...matches])
      set({
        searchPattern: pattern,
        filteredKeys: matches,
        expandedKeys
      })
      debouncedSaveExpandedFolders(expandedKeys)
    },

    clearSearch: () => {
      set({ searchPattern: '', filteredKeys: null })
    },

    setSortMode: mode => {
      const sortOptions = parseSortMode(mode)
      set({ sortMode: mode, sortOptions })
    },

    toggleSortOrder: () => {
      const { sortOptions } = get()
      const newOrder: SortOrder = sortOptions.order === 'asc' ? 'desc' : 'asc'
      const newSortOptions: SortOptions = { ...sortOptions, order: newOrder }
      set({
        sortMode: toSortMode(newSortOptions),
        sortOptions: newSortOptions
      })
    },

    findNode: key => {
      const { roots } = get()
      return findNodeRecursive(roots, key)
    },

    getParentNode: key => {
      const { roots } = get()
      return findParentNodeRecursive(roots, key) ?? null
    },

    getFlattenedNodes: () => {
      const { roots, expandedKeys, filteredKeys, newItemParent, newItemType, newItemName } = get()
      return flattenTree(roots, expandedKeys, filteredKeys, newItemParent, newItemType, newItemName)
    },

    updateGitStatus: (changes: { path: string; statusShort: string; staged: boolean }[]) => {
      const newStatus = new Map<string, string>()
      const isWindows = window.electron.platform === 'win32'
      const normalizePath = (p: string) => (isWindows ? p.replace(/\//g, '\\') : p)

      const statusPriority: Record<string, number> = {
        M: 5,
        A: 4,
        D: 3,
        R: 2,
        C: 2,
        '?': 1,
        '!': 0
      }
      const dirStatusMap = new Map<
        string,
        { statusShort: string; staged: boolean; priority: number }
      >()

      for (const change of changes) {
        const prefix = change.staged ? 'S' : ''
        const normalizedPath = normalizePath(change.path)
        newStatus.set(normalizedPath, `${prefix}${change.statusShort}`)

        const parts = normalizedPath.split(isWindows ? '\\' : '/')
        for (let i = 1; i < parts.length; i++) {
          const dirPath = parts.slice(0, i).join(isWindows ? '\\' : '/')
          const priority = (statusPriority[change.statusShort] || 0) + (change.staged ? 10 : 0)
          const existing = dirStatusMap.get(dirPath)
          if (!existing || priority > existing.priority) {
            dirStatusMap.set(dirPath, {
              statusShort: change.statusShort,
              staged: change.staged,
              priority
            })
          }
        }
      }

      for (const [dirPath, dirStatus] of dirStatusMap) {
        if (!newStatus.has(dirPath)) {
          const prefix = dirStatus.staged ? 'S' : ''
          newStatus.set(dirPath, `${prefix}${dirStatus.statusShort}`)
        }
      }

      set({ gitStatus: newStatus })
    },

    setData: (
      roots: FileNodeData[],
      expandedFolders: string[] | null,
      _showHiddenFiles: boolean,
      _hiddenItems: string[]
    ) => {
      let expandedKeys: Set<string>
      if (expandedFolders === null) {
        expandedKeys = new Set(roots.filter(n => n.isDirectory).map(n => n.key))
      } else {
        expandedKeys = new Set(expandedFolders)
      }

      set({
        roots,
        expandedKeys,
        loading: false,
        error: null
      })
    },

    clearFileTreeData: () => {
      set({
        roots: [],
        expandedKeys: new Set(),
        selectedKeys: new Set(),
        focusedKey: null,
        editingKey: null,
        editingName: '',
        newItemParent: undefined,
        newItemType: 'file',
        newItemName: '',
        clipboard: null,
        searchPattern: '',
        filteredKeys: null,
        loading: false,
        error: null,
        gitStatus: new Map()
      })
    }
  }
})

export default useFileTreeStore
