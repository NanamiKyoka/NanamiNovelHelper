/**
 * 文件树组件 - VSCode 风格
 * 支持：虚拟滚动、右键菜单、拖拽、键盘导航、内联重命名
 */

import { useCallback, useEffect, useRef, useMemo, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Button, Empty, Input, Tooltip, App, Spin, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  FolderOpenOutlined,
  FolderOutlined,
  FileOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  FolderAddOutlined,
  FileAddOutlined,
  RightOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  FieldTimeOutlined,
  ExportOutlined
} from '@ant-design/icons'
import { useProjectStore } from '@stores/projectStore'
import { useUIStore } from '@stores/uiStore'
import { useEditorStore } from '@stores/editorStore'
import { useFileTreeStore } from '@stores/fileTreeStore'
import { useGitStore } from '@stores/gitStore'
import { stripHtmlTags } from '@utils/html'
import type { SortMode, FileNodeData } from '@types/fileTree'
import styles from './FileTree.module.css'

interface NewItemNode extends FileNodeData {
  isNewItem: true
  newItemType: 'file' | 'folder'
}

const { Text } = Typography
import { Typography } from 'antd'

const SEARCH_DEBOUNCE_MS = 200

// 文件图标映射
const getFileIcon = (name: string, isDirectory: boolean, isExpanded?: boolean): React.ReactNode => {
  if (isDirectory) {
    return isExpanded ? <FolderOpenOutlined /> : <FolderOutlined />
  }

  const ext = name.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'novel':
      return <FileTextOutlined style={{ color: 'var(--color-primary)' }} />
    case 'txt':
      return <FileTextOutlined style={{ color: 'var(--color-success)' }} />
    case 'json':
    case 'json5':
    case 'yaml':
    case 'yml':
      return <FileOutlined style={{ color: 'var(--color-warning)' }} />
    default:
      return <FileOutlined />
  }
}

// 节点渲染组件
interface TreeNodeProps {
  node: {
    key: string
    name: string
    path: string
    isDirectory: boolean
  }
  depth: number
  isExpanded: boolean
  isSelected: boolean
  isEditing: boolean
  editingName: string
  gitStatus: string | undefined
  onToggleExpand: () => void
  onSelect: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onRenameChange: (name: string) => void
  onRenameFinish: () => void
  onRenameCancel: () => void
  getContextMenu: () => MenuProps['items']
  onMouseDown: () => void
}

function getGitStatusColor(status: string | undefined): string | undefined {
  if (!status) return undefined
  const isStaged = status.startsWith('S')
  const code = isStaged ? status.slice(1) : status
  switch (code) {
    case 'M':
      return isStaged ? 'var(--git-color-stageModified)' : 'var(--git-color-modified)'
    case 'A':
      return 'var(--git-color-added)'
    case 'D':
      return isStaged ? 'var(--git-color-stageDeleted)' : 'var(--git-color-deleted)'
    case 'R':
      return 'var(--git-color-renamed)'
    case 'C':
      return 'var(--git-color-added)'
    case '?':
      return 'var(--git-color-untracked)'
    case '!':
      return 'var(--git-color-ignored)'
    default:
      return undefined
  }
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  isExpanded,
  isSelected,
  isEditing,
  editingName,
  gitStatus,
  onToggleExpand,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onRenameChange,
  onRenameFinish,
  onRenameCancel,
  getContextMenu,
  onMouseDown
}: TreeNodeProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isCanceling = useRef(false)
  const hasSelected = useRef(false)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      if (!hasSelected.current) {
        const dotIndex = node.name.lastIndexOf('.')
        if (dotIndex > 0 && !node.isDirectory) {
          inputRef.current.setSelectionRange(0, dotIndex)
        } else {
          inputRef.current.select()
        }
        hasSelected.current = true
      }
      isCanceling.current = false
    }
    if (!isEditing) {
      hasSelected.current = false
    }
  }, [isEditing, node.name, node.isDirectory])

  return (
    <Dropdown menu={{ items: getContextMenu() }} trigger={['contextMenu']}>
      <div
        className={`${styles.treeNode} ${isSelected ? styles.selected : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onMouseDown={onMouseDown}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        {/* 展开/折叠箭头 */}
        <span
          className={`${styles.arrow} ${isExpanded ? styles.expanded : ''} ${!node.isDirectory ? styles.hidden : ''}`}
          onClick={e => {
            e.stopPropagation()
            if (node.isDirectory) {
              onToggleExpand()
            }
          }}
        >
          <RightOutlined />
        </span>

        {/* 图标 */}
        <span className={styles.icon}>{getFileIcon(node.name, node.isDirectory, isExpanded)}</span>

        {/* 名称 */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className={styles.editInput}
            value={editingName}
            onChange={e => onRenameChange(e.target.value)}
            onBlur={() => {
              if (isCanceling.current) {
                return
              }
              onRenameFinish()
            }}
            onKeyDown={e => {
              if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
                return
              }

              if (e.key === 'Enter') {
                e.stopPropagation()
                onRenameFinish()
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                isCanceling.current = true
                onRenameCancel()
              }
            }}
          />
        ) : (
          <span className={styles.name} style={{ color: getGitStatusColor(gitStatus) }}>
            {node.name}
          </span>
        )}
      </div>
    </Dropdown>
  )
})

// 新建项组件
interface NewItemProps {
  type: 'file' | 'folder'
  depth: number
  name: string
  onChange: (name: string) => void
  onFinish: (isBlur?: boolean) => void
  onCancel: () => void
}

const NewItem = memo(function NewItem({
  type,
  depth,
  name,
  onChange,
  onFinish,
  onCancel
}: NewItemProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isCanceling = useRef(false)
  const hasSelected = useRef(false)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      if (!hasSelected.current) {
        if (type === 'file') {
          const dotIndex = name.lastIndexOf('.')
          if (dotIndex > 0) {
            inputRef.current.setSelectionRange(0, dotIndex)
          } else {
            inputRef.current.select()
          }
        } else {
          inputRef.current.select()
        }
        hasSelected.current = true
      }
    }
  }, [type, name])

  return (
    <div className={styles.treeNode} style={{ paddingLeft: depth * 16 + 8 }}>
      <span className={`${styles.arrow} ${styles.hidden}`}>
        <RightOutlined />
      </span>
      <span className={styles.icon}>
        {type === 'folder' ? (
          <FolderOutlined />
        ) : (
          <FileTextOutlined style={{ color: 'var(--color-primary)' }} />
        )}
      </span>
      <input
        ref={inputRef}
        type="text"
        className={styles.editInput}
        value={name}
        onChange={e => onChange(e.target.value)}
        onBlur={() => {
          // 如果是 Escape 取消触发的 blur，不执行 finish
          if (isCanceling.current) {
            return
          }
          onFinish(true)
        }}
        onKeyDown={e => {
          // Ctrl+Space 用于切换输入法，不阻止事件传播
          if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
            return // 让事件正常冒泡，输入法可以捕获
          }

          // 只对需要处理的按键阻止冒泡
          if (e.key === 'Enter') {
            e.stopPropagation()
            onFinish(false) // Enter 触发，非 blur
          } else if (e.key === 'Escape') {
            e.stopPropagation()
            isCanceling.current = true // 标记正在取消，防止 blur 触发 finish
            onCancel()
          }
        }}
      />
    </div>
  )
})

function FileTree(): JSX.Element {
  const { message, modal } = App.useApp()
  const currentProject = useProjectStore(state => state.currentProject)
  const openCreateProjectModal = useUIStore(state => state.openCreateProjectModal)
  const openOpenProjectModal = useUIStore(state => state.openOpenProjectModal)
  const openFile = useEditorStore(state => state.openFile)

  const roots = useFileTreeStore(state => state.roots)
  const loading = useFileTreeStore(state => state.loading)
  const error = useFileTreeStore(state => state.error)
  const expandedKeys = useFileTreeStore(state => state.expandedKeys)
  const selectedKeys = useFileTreeStore(state => state.selectedKeys)
  const focusedKey = useFileTreeStore(state => state.focusedKey)
  const editingKey = useFileTreeStore(state => state.editingKey)
  const editingName = useFileTreeStore(state => state.editingName)
  const newItemParent = useFileTreeStore(state => state.newItemParent)
  const newItemType = useFileTreeStore(state => state.newItemType)
  const newItemName = useFileTreeStore(state => state.newItemName)
  const clipboard = useFileTreeStore(state => state.clipboard)
  const searchPattern = useFileTreeStore(state => state.searchPattern)
  const filteredKeys = useFileTreeStore(state => state.filteredKeys)
  const sortMode = useFileTreeStore(state => state.sortMode)
  const sortOptions = useFileTreeStore(state => state.sortOptions)
  const gitStatus = useFileTreeStore(state => state.gitStatus)

  const loadTree = useFileTreeStore(state => state.loadTree)
  const refreshTree = useFileTreeStore(state => state.refreshTree)
  const toggleExpand = useFileTreeStore(state => state.toggleExpand)
  const select = useFileTreeStore(state => state.select)
  const clearSelection = useFileTreeStore(state => state.clearSelection)
  const setFocusedKey = useFileTreeStore(state => state.setFocusedKey)
  const startRename = useFileTreeStore(state => state.startRename)
  const finishRename = useFileTreeStore(state => state.finishRename)
  const cancelEdit = useFileTreeStore(state => state.cancelEdit)
  const startNewItem = useFileTreeStore(state => state.startNewItem)
  const finishNewItem = useFileTreeStore(state => state.finishNewItem)
  const deleteItems = useFileTreeStore(state => state.deleteItems)
  const copyItems = useFileTreeStore(state => state.copyItems)
  const cutItems = useFileTreeStore(state => state.cutItems)
  const paste = useFileTreeStore(state => state.paste)
  const search = useFileTreeStore(state => state.search)
  const setSortMode = useFileTreeStore(state => state.setSortMode)
  const toggleSortOrder = useFileTreeStore(state => state.toggleSortOrder)
  const findNode = useFileTreeStore(state => state.findNode)
  const getFlattenedNodes = useFileTreeStore(state => state.getFlattenedNodes)

  const treeRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const typeNavigationRef = useRef<{ pattern: string; timer: NodeJS.Timeout | null }>({
    pattern: '',
    timer: null
  })

  // 防抖搜索
  const debouncedSearch = useCallback(
    (value: string) => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      searchTimeoutRef.current = setTimeout(() => {
        search(value)
      }, SEARCH_DEBOUNCE_MS)
    },
    [search]
  )

  // 扁平化的节点列表（用于虚拟滚动）
  const flattenedNodes = useMemo(
    () => getFlattenedNodes(),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- roots/expandedKeys/filteredKeys/newItem* are read indirectly via getFlattenedNodes()
    [roots, expandedKeys, filteredKeys, newItemParent, newItemType, newItemName, getFlattenedNodes]
  )

  // 虚拟滚动
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => treeRef.current,
    estimateSize: () => 22, // 行高
    overscan: 10
  })

  // 项目变化时加载文件树
  useEffect(() => {
    if (currentProject) {
      loadTree()
    }
  }, [currentProject, loadTree])

  // 排序变化时重新加载文件树
  useEffect(() => {
    if (currentProject) {
      refreshTree()
    }
  }, [sortMode, currentProject, refreshTree])

  // 清理搜索定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // 确认删除
  const confirmDelete = useCallback(
    (keys: string[], useTrash: boolean) => {
      modal.confirm({
        title: useTrash ? '删除确认' : '永久删除',
        content: useTrash
          ? `确定要将 ${keys.length} 个项目移至回收站吗？`
          : `确定要永久删除 ${keys.length} 个项目吗？此操作不可撤销。`,
        okText: useTrash ? '删除' : '永久删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          try {
            await deleteItems(keys, !useTrash)
            message.success(useTrash ? '已移至回收站' : '已永久删除')
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : '删除失败'
            message.error(errorMessage)
          }
        }
      })
    },
    [modal, message, deleteItems]
  )

  // 粘贴处理
  const handlePaste = useCallback(
    async (targetKey: string | null) => {
      try {
        await paste(targetKey)
        message.success(`已粘贴 ${clipboard?.nodes?.length || 0} 个项目`)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '粘贴失败'
        message.error(errorMessage)
      }
    },
    [paste, clipboard, message]
  )

  // 打开文件
  const handleOpenFile = useCallback(
    async (node: (typeof flattenedNodes)[0]['node']) => {
      try {
        await openFile(node.path, node.name)
      } catch (error) {
        console.error('Failed to open file:', error)
        message.error(`打开文件失败: ${node.name}`)
      }
    },
    [openFile, message]
  )

  // 键盘导航 - 绑定在文件树容器上，只有获得焦点时才响应
  useEffect(() => {
    const el = treeRef.current
    if (!el) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (editingKey || newItemParent !== undefined) return

      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return
      }

      const selectedArray = Array.from(selectedKeys)
      const ctrlOrCmd = e.ctrlKey || e.metaKey

      // ---- 方向键导航 ----
      if (e.key === 'ArrowUp' && !ctrlOrCmd) {
        e.preventDefault()
        e.stopPropagation()
        const currentIndex = flattenedNodes.findIndex(n => n.id === focusedKey)
        if (currentIndex > 0) {
          select(flattenedNodes[currentIndex - 1].id)
        } else if (currentIndex === -1 && flattenedNodes.length > 0) {
          select(flattenedNodes[0].id)
        }
        return
      }

      if (e.key === 'ArrowDown' && !ctrlOrCmd) {
        e.preventDefault()
        e.stopPropagation()
        const currentIndex = flattenedNodes.findIndex(n => n.id === focusedKey)
        if (currentIndex < flattenedNodes.length - 1) {
          select(flattenedNodes[currentIndex + 1].id)
        } else if (currentIndex === -1 && flattenedNodes.length > 0) {
          select(flattenedNodes[0].id)
        }
        return
      }

      // ArrowLeft: 折叠或跳转到父节点
      if (e.key === 'ArrowLeft' && !ctrlOrCmd) {
        e.preventDefault()
        e.stopPropagation()
        if (!focusedKey) return
        if (expandedKeys.has(focusedKey)) {
          toggleExpand(focusedKey)
        } else {
          const parent = useFileTreeStore.getState().getParentNode(focusedKey)
          if (parent) {
            select(parent.key)
          }
        }
        return
      }

      // ArrowRight: 展开或跳转到第一个子节点
      if (e.key === 'ArrowRight' && !ctrlOrCmd) {
        e.preventDefault()
        e.stopPropagation()
        if (!focusedKey) return
        const node = findNode(focusedKey)
        if (node?.isDirectory) {
          if (!expandedKeys.has(focusedKey)) {
            toggleExpand(focusedKey)
          } else if (node.children && node.children.length > 0) {
            select(node.children[0].key)
          }
        }
        return
      }

      // Home
      if (e.key === 'Home') {
        e.preventDefault()
        e.stopPropagation()
        if (flattenedNodes.length > 0) {
          select(flattenedNodes[0].id)
        }
        return
      }

      // End
      if (e.key === 'End') {
        e.preventDefault()
        e.stopPropagation()
        if (flattenedNodes.length > 0) {
          select(flattenedNodes[flattenedNodes.length - 1].id)
        }
        return
      }

      // PageUp
      if (e.key === 'PageUp') {
        e.preventDefault()
        e.stopPropagation()
        const currentIndex = flattenedNodes.findIndex(n => n.id === focusedKey)
        if (currentIndex > 0) {
          const pageSize = Math.max(1, Math.floor(el.clientHeight / 22))
          const targetIndex = Math.max(0, currentIndex - pageSize)
          select(flattenedNodes[targetIndex].id)
          virtualizer.scrollToIndex(targetIndex, { align: 'start' })
        }
        return
      }

      // PageDown
      if (e.key === 'PageDown') {
        e.preventDefault()
        e.stopPropagation()
        const currentIndex = flattenedNodes.findIndex(n => n.id === focusedKey)
        if (currentIndex < flattenedNodes.length - 1) {
          const pageSize = Math.max(1, Math.floor(el.clientHeight / 22))
          const targetIndex = Math.min(flattenedNodes.length - 1, currentIndex + pageSize)
          select(flattenedNodes[targetIndex].id)
          virtualizer.scrollToIndex(targetIndex, { align: 'start' })
        }
        return
      }

      // ---- F2 / Enter - 重命名 ----
      if (e.key === 'F2' && selectedArray.length === 1) {
        e.preventDefault()
        e.stopPropagation()
        startRename(selectedArray[0])
        return
      }

      // ---- Delete - 删除 ----
      if (e.key === 'Delete' && selectedArray.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        confirmDelete(selectedArray, !e.shiftKey)
        return
      }

      // ---- Ctrl+C - 复制 ----
      if (e.key === 'c' && ctrlOrCmd && selectedArray.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        copyItems(selectedArray)
        message.success(`已复制 ${selectedArray.length} 个项目`)
        return
      }

      // ---- Ctrl+X - 剪切 ----
      if (e.key === 'x' && ctrlOrCmd && selectedArray.length > 0) {
        e.preventDefault()
        e.stopPropagation()
        cutItems(selectedArray)
        message.success(`已剪切 ${selectedArray.length} 个项目`)
        return
      }

      // ---- Ctrl+V - 粘贴 ----
      if (e.key === 'v' && ctrlOrCmd && clipboard) {
        e.preventDefault()
        e.stopPropagation()
        const targetKey = selectedArray[0]
        const targetNode = targetKey ? findNode(targetKey) : null
        if (targetNode?.isDirectory) {
          handlePaste(targetKey)
        } else if (targetNode) {
          const parentKey = useFileTreeStore.getState().getParentNode(targetKey)?.key ?? null
          handlePaste(parentKey)
        } else {
          handlePaste(null)
        }
        return
      }

      // ---- Ctrl+A - 全选 ----
      if (e.key === 'a' && ctrlOrCmd) {
        e.preventDefault()
        e.stopPropagation()
        useFileTreeStore.getState().selectAll()
        return
      }

      // ---- Escape - 取消选择 / 取消剪切 ----
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (clipboard?.operation === 'cut') {
          useFileTreeStore.setState({ clipboard: null })
          message.info('已取消剪切')
        } else if (selectedKeys.size > 0) {
          clearSelection()
        }
        return
      }

      // ---- Space - 切换展开/折叠（VSCode 行为） ----
      if (e.key === ' ' && !ctrlOrCmd) {
        e.preventDefault()
        e.stopPropagation()
        if (focusedKey) {
          const node = findNode(focusedKey)
          if (node?.isDirectory) {
            toggleExpand(focusedKey)
          }
        }
        return
      }

      // ---- Enter - 打开文件 / 切换目录展开 ----
      if (e.key === 'Enter' && !ctrlOrCmd) {
        e.preventDefault()
        e.stopPropagation()
        if (focusedKey) {
          const node = findNode(focusedKey)
          if (node?.isDirectory) {
            toggleExpand(focusedKey)
          } else if (node) {
            handleOpenFile(node).then(() => {
              requestAnimationFrame(() => {
                treeRef.current?.focus({ preventScroll: true })
              })
            })
          }
        }
        return
      }

      // ---- Ctrl+N - 新建文件 ----
      if (e.key === 'n' && ctrlOrCmd && !e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        const targetKey = selectedArray[0]
        const targetNode = targetKey ? findNode(targetKey) : null
        startNewItem(
          targetNode?.isDirectory
            ? targetKey
            : targetNode
              ? (useFileTreeStore.getState().getParentNode(targetKey)?.key ?? null)
              : null,
          'file'
        )
        return
      }

      // ---- Ctrl+Shift+N - 新建文件夹 ----
      if (e.key === 'N' && ctrlOrCmd && e.shiftKey) {
        e.preventDefault()
        e.stopPropagation()
        const targetKey = selectedArray[0]
        const targetNode = targetKey ? findNode(targetKey) : null
        startNewItem(
          targetNode?.isDirectory
            ? targetKey
            : targetNode
              ? (useFileTreeStore.getState().getParentNode(targetKey)?.key ?? null)
              : null,
          'folder'
        )
        return
      }

      // ---- Type Navigation: 按首字母快速定位 ----
      if (!ctrlOrCmd && !e.altKey && e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
        e.preventDefault()
        e.stopPropagation()
        const nav = typeNavigationRef.current
        nav.pattern += e.key.toLowerCase()

        if (nav.timer) {
          clearTimeout(nav.timer)
        }
        nav.timer = setTimeout(() => {
          nav.pattern = ''
        }, 800)

        const currentIndex = flattenedNodes.findIndex(n => n.id === focusedKey)
        const startIdx = currentIndex >= 0 ? currentIndex : 0

        for (let i = 1; i <= flattenedNodes.length; i++) {
          const idx = (startIdx + i) % flattenedNodes.length
          const name = flattenedNodes[idx].node.name.toLowerCase()
          if (name.startsWith(nav.pattern)) {
            select(flattenedNodes[idx].id)
            virtualizer.scrollToIndex(idx, { align: 'auto' })
            break
          }
        }
        return
      }
    }

    el.addEventListener('keydown', handleKeyDown)
    return () => el.removeEventListener('keydown', handleKeyDown)
  }, [
    selectedKeys,
    focusedKey,
    editingKey,
    newItemParent,
    clipboard,
    flattenedNodes,
    expandedKeys,
    confirmDelete,
    copyItems,
    cutItems,
    findNode,
    handlePaste,
    message,
    select,
    clearSelection,
    startNewItem,
    startRename,
    toggleExpand,
    handleOpenFile,
    virtualizer
  ])

  // 导出 .novel 文件为 TXT
  const handleExportNovel = useCallback(
    async (node: (typeof flattenedNodes)[0]['node']) => {
      try {
        const content = await window.api.file.read(node.path)
        if (!content) {
          message.warning('文件内容为空')
          return
        }

        const baseName = node.name.replace(/\.[^.]+$/, '')
        const filePath = await window.api.file.showSaveDialog({
          title: '导出为纯文本',
          defaultPath: `${baseName}.txt`,
          filters: [
            { name: '文本文件', extensions: ['txt'] },
            { name: '所有文件', extensions: ['*'] }
          ]
        })

        if (!filePath) return

        const plainText = stripHtmlTags(content)
        const success = await window.api.file.exportTxt(filePath, plainText)

        if (success) {
          message.success('导出成功')
        } else {
          message.error('导出失败')
        }
      } catch (error) {
        console.error('Export failed:', error)
        message.error('导出失败')
      }
    },
    [message]
  )

  // 获取节点上下文菜单
  const getNodeContextMenu = useCallback(
    (node: (typeof flattenedNodes)[0]['node']): MenuProps['items'] => {
      const items: MenuProps['items'] = []

      if (node.isDirectory) {
        items.push(
          {
            key: 'newFile',
            icon: <FileAddOutlined />,
            label: '新建文件',
            onClick: () => startNewItem(node.key, 'file')
          },
          {
            key: 'newFolder',
            icon: <FolderAddOutlined />,
            label: '新建文件夹',
            onClick: () => startNewItem(node.key, 'folder')
          },
          { type: 'divider' }
        )
      }

      items.push(
        {
          key: 'rename',
          icon: <span>✏️</span>,
          label: '重命名',
          onClick: () => startRename(node.key)
        },
        {
          key: 'copy',
          icon: <span>📋</span>,
          label: '复制',
          onClick: () => {
            copyItems([node.key])
            message.success('已复制')
          }
        },
        {
          key: 'cut',
          icon: <span>✂️</span>,
          label: '剪切',
          onClick: () => {
            cutItems([node.key])
            message.success('已剪切')
          }
        }
      )

      if (clipboard && clipboard.nodes.length > 0) {
        items.push({
          key: 'paste',
          icon: <span>📥</span>,
          label: `粘贴 (${clipboard.nodes.length} 个项目)`,
          onClick: () => handlePaste(node.isDirectory ? node.key : null)
        })
      }

      // 检查是否是 .novel 文件，添加导出选项
      const ext = node.name.split('.').pop()?.toLowerCase()
      if (!node.isDirectory && ext === 'novel') {
        items.push(
          { type: 'divider' },
          {
            key: 'exportTxt',
            icon: <ExportOutlined />,
            label: '导出为 TXT',
            onClick: () => handleExportNovel(node)
          }
        )
      }

      // 检查是否有 git 变更，添加打开差异选项
      const nodeGitStatus = gitStatus.get(node.path)
      if (!node.isDirectory && nodeGitStatus) {
        const code = nodeGitStatus.startsWith('S') ? nodeGitStatus.slice(1) : nodeGitStatus
        if (code !== '!' && code !== '?') {
          items.push(
            { type: 'divider' },
            {
              key: 'openDiff',
              icon: <span>📊</span>,
              label: '打开差异',
              onClick: async () => {
                const isStaged = nodeGitStatus.startsWith('S')
                const diff = await useGitStore.getState().getDiff(node.path, isStaged)
                if (diff) {
                  useEditorStore.getState().openDiff(node.path, node.name, diff)
                } else {
                  message.warning('无法获取差异')
                }
              }
            }
          )
        }
      }

      items.push(
        { type: 'divider' },
        {
          key: 'delete',
          icon: <span>🗑️</span>,
          label: '删除',
          danger: true,
          onClick: () => confirmDelete([node.key], true)
        }
      )

      return items
    },
    [
      startNewItem,
      startRename,
      copyItems,
      cutItems,
      clipboard,
      handlePaste,
      confirmDelete,
      message,
      handleExportNovel,
      gitStatus
    ]
  )

  const emptyAreaContextMenu: MenuProps['items'] = useMemo(() => {
    const items: MenuProps['items'] = [
      {
        key: 'newFile',
        icon: <FileAddOutlined />,
        label: '新建文件',
        onClick: () => startNewItem(null, 'file')
      },
      {
        key: 'newFolder',
        icon: <FolderAddOutlined />,
        label: '新建文件夹',
        onClick: () => startNewItem(null, 'folder')
      }
    ]

    if (clipboard && clipboard.nodes.length > 0) {
      items.push({ type: 'divider' })
      items.push({
        key: 'paste',
        icon: <span>📥</span>,
        label: `粘贴 (${clipboard.nodes.length} 个项目)`,
        onClick: () => handlePaste(null)
      })
    }

    items.push({ type: 'divider' })
    items.push({
      key: 'refresh',
      icon: <ReloadOutlined />,
      label: '刷新',
      onClick: refreshTree
    })

    return items
  }, [startNewItem, refreshTree, clipboard, handlePaste])

  // 双击处理
  const handleDoubleClick = useCallback(
    (node: (typeof flattenedNodes)[0]['node']) => {
      if (node.isDirectory) {
        toggleExpand(node.key)
      } else {
        openFile(node.path, node.name)
      }
    },
    [toggleExpand, openFile]
  )

  // 工具栏操作
  const handleNewFile = useCallback(() => {
    const selectedArray = Array.from(selectedKeys)
    const targetKey = selectedArray[0]
    const targetNode = targetKey ? findNode(targetKey) : null
    startNewItem(targetNode?.isDirectory ? targetKey : null, 'file')
  }, [selectedKeys, findNode, startNewItem])

  const handleNewFolder = useCallback(() => {
    const selectedArray = Array.from(selectedKeys)
    const targetKey = selectedArray[0]
    const targetNode = targetKey ? findNode(targetKey) : null
    startNewItem(targetNode?.isDirectory ? targetKey : null, 'folder')
  }, [selectedKeys, findNode, startNewItem])

  // 没有项目
  if (!currentProject) {
    return (
      <div className={styles.emptyState}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div className={styles.emptyContent}>
              <Text type="secondary">没有打开的项目</Text>
              <div className={styles.emptyActions}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  block
                  onClick={openCreateProjectModal}
                >
                  新建项目
                </Button>
                <Button icon={<FolderOpenOutlined />} block onClick={openOpenProjectModal}>
                  打开项目
                </Button>
              </div>
            </div>
          }
        />
      </div>
    )
  }

  return (
    <div className={styles.fileTree}>
      {/* 工具栏 */}
      <div className={styles.toolbar} onClick={e => e.stopPropagation()}>
        <Input
          placeholder="搜索文件"
          value={searchPattern}
          onChange={e => debouncedSearch(e.target.value)}
          prefix={<SearchOutlined className={styles.searchIcon} />}
          allowClear
          size="small"
          className={styles.searchInput}
        />
        <div className={styles.toolbarActions}>
          <Tooltip title="新建文件 (Ctrl+N)">
            <Button
              type="text"
              size="small"
              icon={<FileAddOutlined />}
              onClick={handleNewFile}
              className={styles.toolbarBtn}
            />
          </Tooltip>
          <Tooltip title="新建文件夹 (Ctrl+Shift+N)">
            <Button
              type="text"
              size="small"
              icon={<FolderAddOutlined />}
              onClick={handleNewFolder}
              className={styles.toolbarBtnSecondary}
            />
          </Tooltip>
          <Tooltip
            title={
              sortOptions.field === 'name'
                ? `按名称排序 (${sortOptions.order === 'asc' ? '升序' : '降序'})`
                : `按修改时间排序 (${sortOptions.order === 'asc' ? '升序' : '降序'})`
            }
          >
            <Button
              type="text"
              size="small"
              icon={
                sortOptions.field === 'name' ? (
                  sortOptions.order === 'asc' ? (
                    <SortAscendingOutlined />
                  ) : (
                    <SortDescendingOutlined />
                  )
                ) : sortOptions.order === 'asc' ? (
                  <FieldTimeOutlined />
                ) : (
                  <FieldTimeOutlined style={{ transform: 'scaleY(-1)' }} />
                )
              }
              onClick={() => {
                if (sortOptions.field === 'name') {
                  setSortMode(`modified-${sortOptions.order}` as SortMode)
                } else {
                  setSortMode(`name-${sortOptions.order}` as SortMode)
                }
              }}
              onContextMenu={e => {
                e.preventDefault()
                toggleSortOrder()
              }}
              className={styles.toolbarBtnSecondary}
            />
          </Tooltip>
          <Tooltip title="刷新">
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={refreshTree}
              loading={loading}
              className={styles.toolbarBtnTertiary}
            />
          </Tooltip>
        </div>
      </div>

      {/* 文件树内容（虚拟滚动） */}
      <Dropdown menu={{ items: emptyAreaContextMenu }} trigger={['contextMenu']}>
        <div
          ref={treeRef}
          className={styles.content}
          tabIndex={0}
          onClick={() => {
            clearSelection()
            treeRef.current?.focus()
          }}
          onFocus={() => {
            if (!focusedKey && flattenedNodes.length > 0) {
              setFocusedKey(flattenedNodes[0].id)
            }
          }}
        >
          {loading ? (
            <div style={{ textAlign: 'center', padding: 20 }}>
              <Spin />
            </div>
          ) : error ? (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--color-error)' }}>
              {error}
            </div>
          ) : (
            <div
              style={{
                height: virtualizer.getTotalSize(),
                width: '100%',
                position: 'relative'
              }}
            >
              {virtualizer.getVirtualItems().map(virtualItem => {
                const { node, depth } = flattenedNodes[virtualItem.index]

                // 检查是否是新建项节点
                if ((node as NewItemNode).isNewItem) {
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: virtualItem.size,
                        transform: `translateY(${virtualItem.start}px)`
                      }}
                    >
                      <NewItem
                        type={(node as NewItemNode).newItemType}
                        depth={depth}
                        name={newItemName}
                        onChange={name => useFileTreeStore.setState({ newItemName: name })}
                        onFinish={async (isBlur = false) => {
                          const currentName = useFileTreeStore.getState().newItemName
                          try {
                            await finishNewItem(currentName, isBlur)
                            // 只有成功创建时才显示消息
                            if (currentName.trim() && !isBlur) {
                              message.success('创建成功')
                            }
                          } catch (error) {
                            const errorMessage = error instanceof Error ? error.message : '创建失败'
                            message.error(errorMessage)
                          }
                        }}
                        onCancel={cancelEdit}
                      />
                    </div>
                  )
                }

                const isExpanded = expandedKeys.has(node.key)
                const isSelected = selectedKeys.has(node.key)
                const isEditing = editingKey === node.key

                return (
                  <div
                    key={virtualItem.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: virtualItem.size,
                      transform: `translateY(${virtualItem.start}px)`
                    }}
                  >
                    <TreeNode
                      node={node}
                      depth={depth}
                      isExpanded={isExpanded}
                      isSelected={isSelected}
                      isEditing={isEditing}
                      editingName={editingName}
                      gitStatus={gitStatus.get(node.path)}
                      onToggleExpand={() => toggleExpand(node.key)}
                      onSelect={e => {
                        e.stopPropagation()
                        select(node.key, e.ctrlKey || e.metaKey ? 'toggle' : 'single')
                        if (!node.isDirectory) {
                          handleOpenFile(node).then(() => {
                            requestAnimationFrame(() => {
                              treeRef.current?.focus({ preventScroll: true })
                            })
                          })
                        }
                      }}
                      onDoubleClick={() => handleDoubleClick(node)}
                      onContextMenu={e => {
                        e.stopPropagation()
                        if (!selectedKeys.has(node.key)) {
                          select(node.key)
                        }
                      }}
                      onMouseDown={() => {
                        if (!treeRef.current?.contains(document.activeElement)) {
                          treeRef.current?.focus({ preventScroll: true })
                        }
                      }}
                      onRenameChange={name => useFileTreeStore.setState({ editingName: name })}
                      onRenameFinish={async () => {
                        try {
                          await finishRename(editingName)
                          message.success('重命名成功')
                        } catch (error) {
                          const errorMessage = error instanceof Error ? error.message : '重命名失败'
                          message.error(errorMessage)
                        }
                      }}
                      onRenameCancel={cancelEdit}
                      getContextMenu={() => getNodeContextMenu(node)}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Dropdown>
    </div>
  )
}

export default FileTree
