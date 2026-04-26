/**
 * 文件树组件 - VSCode 风格
 * 支持：虚拟滚动、右键菜单、拖拽、键盘导航、内联重命名
 */

import { useCallback, useEffect, useRef, useMemo, memo } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Button,
  Empty,
  Input,
  Tooltip,
  App,
  Spin,
  Dropdown
} from 'antd'
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
import type { SortMode } from '@types/fileTree'
import styles from './FileTree.module.css'

const { Text } = Typography
import { Typography } from 'antd'

const SEARCH_DEBOUNCE_MS = 200

function stripHtmlTags(html: string): string {
  let text = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<h[1-6][^>]*>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<blockquote[^>]*>/gi, '\n')
    .replace(/<\/blockquote>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\s+|\s+$/g, '')
  
  return text
}

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
  onToggleExpand: () => void
  onSelect: (e: React.MouseEvent) => void
  onDoubleClick: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onRenameChange: (name: string) => void
  onRenameFinish: () => void
  onRenameCancel: () => void
  getContextMenu: () => MenuProps['items']
}

const TreeNode = memo(function TreeNode({
  node,
  depth,
  isExpanded,
  isSelected,
  isEditing,
  editingName,
  onToggleExpand,
  onSelect,
  onDoubleClick,
  onContextMenu,
  onRenameChange,
  onRenameFinish,
  onRenameCancel,
  getContextMenu
}: TreeNodeProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isCanceling = useRef(false)
  
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
      // 开始新的编辑时重置取消标志
      isCanceling.current = false
    }
  }, [isEditing])
  
  return (
    <Dropdown
      menu={{ items: getContextMenu() }}
      trigger={['contextMenu']}
    >
      <div
        className={`${styles.treeNode} ${isSelected ? styles.selected : ''}`}
        style={{ paddingLeft: depth * 16 + 8 }}
        onClick={onSelect}
        onDoubleClick={onDoubleClick}
        onContextMenu={onContextMenu}
      >
        {/* 展开/折叠箭头 */}
        <span 
          className={`${styles.arrow} ${isExpanded ? styles.expanded : ''} ${!node.isDirectory ? styles.hidden : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            if (node.isDirectory) {
              onToggleExpand()
            }
          }}
        >
          <RightOutlined />
        </span>
        
        {/* 图标 */}
        <span className={styles.icon}>
          {getFileIcon(node.name, node.isDirectory, isExpanded)}
        </span>
        
        {/* 名称 */}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            className={styles.editInput}
            value={editingName}
            onChange={(e) => onRenameChange(e.target.value)}
            onBlur={() => {
              // 如果是 Escape 取消触发的 blur，不执行 finish
              if (isCanceling.current) {
                return
              }
              onRenameFinish()
            }}
            onKeyDown={(e) => {
              // Ctrl+Space 用于切换输入法，不阻止事件传播
              if (e.key === ' ' && (e.ctrlKey || e.metaKey)) {
                return // 让事件正常冒泡，输入法可以捕获
              }
              
              // 只对需要处理的按键阻止冒泡
              if (e.key === 'Enter') {
                e.stopPropagation()
                onRenameFinish()
              } else if (e.key === 'Escape') {
                e.stopPropagation()
                isCanceling.current = true // 标记正在取消，防止 blur 触发 finish
                onRenameCancel()
              }
            }}
          />
        ) : (
          <span className={styles.name}>{node.name}</span>
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

const NewItem = memo(function NewItem({ type, depth, name, onChange, onFinish, onCancel }: NewItemProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const isCanceling = useRef(false)
  
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [])
  
  return (
    <div className={styles.treeNode} style={{ paddingLeft: depth * 16 + 8 }}>
      <span className={`${styles.arrow} ${styles.hidden}`}>
        <RightOutlined />
      </span>
      <span className={styles.icon}>
        {type === 'folder' ? <FolderOutlined /> : <FileTextOutlined style={{ color: 'var(--color-primary)' }} />}
      </span>
      <input
        ref={inputRef}
        type="text"
        className={styles.editInput}
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => {
          // 如果是 Escape 取消触发的 blur，不执行 finish
          if (isCanceling.current) {
            return
          }
          onFinish(true)
        }}
        onKeyDown={(e) => {
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
  const currentProject = useProjectStore((state) => state.currentProject)
  const openCreateProjectModal = useUIStore((state) => state.openCreateProjectModal)
  const openOpenProjectModal = useUIStore((state) => state.openOpenProjectModal)
  const openFile = useEditorStore((state) => state.openFile)
  
  // 文件树 Store
  const {
    roots,
    loading,
    error,
    expandedKeys,
    selectedKeys,
    focusedKey,
    editingKey,
    editingName,
    newItemParent,
    newItemType,
    newItemName,
    clipboard,
    searchPattern,
    filteredKeys,
    sortMode,
    sortOptions,
    loadTree,
    refreshTree,
    toggleExpand,
    select,
    clearSelection,
    startRename,
    finishRename,
    cancelEdit,
    startNewItem,
    finishNewItem,
    deleteItems,
    copyItems,
    cutItems,
    paste,
    search,
    setSortMode,
    toggleSortOrder,
    findNode,
    getFlattenedNodes
  } = useFileTreeStore()
  
  const treeRef = useRef<HTMLDivElement>(null)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // 防抖搜索
  const debouncedSearch = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      search(value)
    }, SEARCH_DEBOUNCE_MS)
  }, [search])
  
  // 扁平化的节点列表（用于虚拟滚动）
  const flattenedNodes = useMemo(() => getFlattenedNodes(), [roots, expandedKeys, filteredKeys, newItemParent, newItemType, newItemName])
  
  // 虚拟滚动
  const virtualizer = useVirtualizer({
    count: flattenedNodes.length,
    getScrollElement: () => treeRef.current,
    estimateSize: () => 22, // 行高
    overscan: 10,
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
  }, [sortMode])
  
  // 清理搜索定时器
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])
  
  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在编辑，不处理快捷键
      if (editingKey || newItemParent !== null) return
      
      // 检查当前焦点是否在输入元素或编辑器中
      const activeElement = document.activeElement
      const isInputFocused = activeElement instanceof HTMLElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable ||
        activeElement.closest('.ProseMirror') ||
        activeElement.closest('[contenteditable="true"]')
      )
      
      // 如果焦点在输入元素或编辑器中，不处理任何快捷键（让编辑器/浏览器原生处理）
      if (isInputFocused) {
        return
      }
      
      const selectedArray = Array.from(selectedKeys)
      
      // 方向键导航
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIndex = flattenedNodes.findIndex(n => n.id === focusedKey)
        if (currentIndex > 0) {
          const prevNode = flattenedNodes[currentIndex - 1]
          select(prevNode.id)
        }
      }
      
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        const currentIndex = flattenedNodes.findIndex(n => n.id === focusedKey)
        if (currentIndex < flattenedNodes.length - 1) {
          const nextNode = flattenedNodes[currentIndex + 1]
          select(nextNode.id)
        }
      }
      
      // ArrowLeft: 折叠或跳转到父节点
      if (e.key === 'ArrowLeft' && focusedKey) {
        e.preventDefault()
        if (expandedKeys.has(focusedKey)) {
          toggleExpand(focusedKey)
        } else {
          const parent = useFileTreeStore.getState().getParentNode(focusedKey)
          if (parent) {
            select(parent.key)
          }
        }
      }
      
      // ArrowRight: 展开或跳转到第一个子节点
      if (e.key === 'ArrowRight' && focusedKey) {
        e.preventDefault()
        const node = findNode(focusedKey)
        if (node?.isDirectory) {
          if (!expandedKeys.has(focusedKey)) {
            toggleExpand(focusedKey)
          } else if (node.children && node.children.length > 0) {
            select(node.children[0].key)
          }
        }
      }
      
      // Home/End
      if (e.key === 'Home' && flattenedNodes.length > 0) {
        e.preventDefault()
        select(flattenedNodes[0].id)
      }
      
      if (e.key === 'End' && flattenedNodes.length > 0) {
        e.preventDefault()
        select(flattenedNodes[flattenedNodes.length - 1].id)
      }
      
      // F2 - 重命名
      if (e.key === 'F2' && selectedArray.length === 1) {
        e.preventDefault()
        startRename(selectedArray[0])
      }
      
      // Delete - 删除
      if (e.key === 'Delete' && selectedArray.length > 0) {
        e.preventDefault()
        confirmDelete(selectedArray, !e.shiftKey)
      }
      
      // Ctrl+C - 复制
      if (e.key === 'c' && (e.ctrlKey || e.metaKey) && selectedArray.length > 0) {
        e.preventDefault()
        copyItems(selectedArray)
        message.success(`已复制 ${selectedArray.length} 个项目`)
      }
      
      // Ctrl+X - 剪切
      if (e.key === 'x' && (e.ctrlKey || e.metaKey) && selectedArray.length > 0) {
        e.preventDefault()
        cutItems(selectedArray)
        message.success(`已剪切 ${selectedArray.length} 个项目`)
      }
      
      // Ctrl+V - 粘贴
      if (e.key === 'v' && (e.ctrlKey || e.metaKey) && clipboard) {
        e.preventDefault()
        handlePaste(selectedArray[0])
      }
      
      // Ctrl+N - 新建文件
      if (e.key === 'n' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault()
        const targetKey = selectedArray[0]
        const targetNode = targetKey ? findNode(targetKey) : null
        startNewItem(targetNode?.isDirectory ? targetKey : (targetNode ? useFileTreeStore.getState().getParentNode(targetKey)?.key ?? null : null), 'file')
      }
      
      // Ctrl+Shift+N - 新建文件夹
      if (e.key === 'N' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
        e.preventDefault()
        const targetKey = selectedArray[0]
        const targetNode = targetKey ? findNode(targetKey) : null
        startNewItem(targetNode?.isDirectory ? targetKey : (targetNode ? useFileTreeStore.getState().getParentNode(targetKey)?.key ?? null : null), 'folder')
      }
    }
    
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedKeys, focusedKey, editingKey, newItemParent, clipboard, flattenedNodes, expandedKeys])
  
  // 确认删除
  const confirmDelete = useCallback((keys: string[], useTrash: boolean) => {
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
  }, [modal, message, deleteItems])
  
  // 粘贴处理
  const handlePaste = useCallback(async (targetKey: string | null) => {
    try {
      await paste(targetKey)
      message.success(`已粘贴 ${clipboard?.nodes.length || 0} 个项目`)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '粘贴失败'
      message.error(errorMessage)
    }
  }, [paste, clipboard, message])
  
  // 导出 .novel 文件为 TXT
  const handleExportNovel = useCallback(async (node: typeof flattenedNodes[0]['node']) => {
    try {
      const content = await window.electron.file.readFile(node.path)
      if (!content) {
        message.warning('文件内容为空')
        return
      }

      const baseName = node.name.replace(/\.[^.]+$/, '')
      const filePath = await window.electron.file.showSaveDialog({
        title: '导出为纯文本',
        defaultPath: `${baseName}.txt`,
        filters: [
          { name: '文本文件', extensions: ['txt'] },
          { name: '所有文件', extensions: ['*'] }
        ]
      })

      if (!filePath) return

      const plainText = stripHtmlTags(content)
      const success = await window.electron.file.exportTxt(filePath, plainText)
      
      if (success) {
        message.success('导出成功')
      } else {
        message.error('导出失败')
      }
    } catch (error) {
      console.error('Export failed:', error)
      message.error('导出失败')
    }
  }, [message])
  
  // 获取节点上下文菜单
  const getNodeContextMenu = useCallback((node: typeof flattenedNodes[0]['node']): MenuProps['items'] => {
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
      items.push(
        {
          key: 'paste',
          icon: <span>📥</span>,
          label: `粘贴 (${clipboard.nodes.length} 个项目)`,
          onClick: () => handlePaste(node.isDirectory ? node.key : null)
        }
      )
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
  }, [startNewItem, startRename, copyItems, cutItems, clipboard, handlePaste, confirmDelete, message, handleExportNovel])
  
  // 空白处上下文菜单
  const emptyAreaContextMenu: MenuProps['items'] = useMemo(() => [
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
    },
    { type: 'divider' },
    {
      key: 'refresh',
      icon: <ReloadOutlined />,
      label: '刷新',
      onClick: refreshTree
    }
  ], [startNewItem, refreshTree])
  
  // 打开文件
  const handleOpenFile = useCallback(async (node: typeof flattenedNodes[0]['node']) => {
    try {
      await openFile(node.path, node.name)
    } catch (error) {
      console.error('Failed to open file:', error)
      message.error(`打开文件失败: ${node.name}`)
    }
  }, [openFile, message])
  
  // 双击处理
  const handleDoubleClick = useCallback((node: typeof flattenedNodes[0]['node']) => {
    if (node.isDirectory) {
      toggleExpand(node.key)
    } else {
      openFile(node.path, node.name)
    }
  }, [toggleExpand, openFile])
  
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
                <Button 
                  icon={<FolderOpenOutlined />} 
                  block
                  onClick={openOpenProjectModal}
                >
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
      <div className={styles.toolbar} onClick={(e) => e.stopPropagation()}>
        <Input
          placeholder="搜索文件"
          value={searchPattern}
          onChange={(e) => debouncedSearch(e.target.value)}
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
          <Tooltip title={sortOptions.field === 'name' 
            ? `按名称排序 (${sortOptions.order === 'asc' ? '升序' : '降序'})` 
            : `按修改时间排序 (${sortOptions.order === 'asc' ? '升序' : '降序'})`}>
            <Button
              type="text"
              size="small"
              icon={sortOptions.field === 'name' 
                ? (sortOptions.order === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />)
                : (sortOptions.order === 'asc' ? <FieldTimeOutlined /> : <FieldTimeOutlined style={{ transform: 'scaleY(-1)' }} />)
              }
              onClick={() => {
                if (sortOptions.field === 'name') {
                  setSortMode(`modified-${sortOptions.order}` as SortMode)
                } else {
                  setSortMode(`name-${sortOptions.order}` as SortMode)
                }
              }}
              onContextMenu={(e) => {
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
      <Dropdown
        menu={{ items: emptyAreaContextMenu }}
        trigger={['contextMenu']}
      >
        <div 
          ref={treeRef}
          className={styles.content}
          onClick={() => clearSelection()}
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
              {virtualizer.getVirtualItems().map((virtualItem) => {
                const { node, depth } = flattenedNodes[virtualItem.index]
                
                // 检查是否是新建项节点
                if ((node as any).isNewItem) {
                  return (
                    <div
                      key={virtualItem.key}
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: virtualItem.size,
                        transform: `translateY(${virtualItem.start}px)`,
                      }}
                    >
                      <NewItem
                        type={(node as any).newItemType}
                        depth={depth}
                        name={newItemName}
                        onChange={(name) => useFileTreeStore.setState({ newItemName: name })}
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
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <TreeNode
                      node={node}
                      depth={depth}
                      isExpanded={isExpanded}
                      isSelected={isSelected}
                      isEditing={isEditing}
                      editingName={editingName}
                      onToggleExpand={() => toggleExpand(node.key)}
                      onSelect={(e) => {
                        e.stopPropagation()
                        select(node.key, e.ctrlKey || e.metaKey ? 'toggle' : 'single')
                        if (!node.isDirectory) {
                          handleOpenFile(node)
                        }
                      }}
                      onDoubleClick={() => handleDoubleClick(node)}
                      onContextMenu={(e) => {
                        e.stopPropagation()
                        if (!selectedKeys.has(node.key)) {
                          select(node.key)
                        }
                      }}
                      onRenameChange={(name) => useFileTreeStore.setState({ editingName: name })}
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