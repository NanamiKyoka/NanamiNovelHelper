/**
 * 时间线全屏编辑器
 * 纵向时间轴布局，支持节点编辑、拖拽排序、分支管理等
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Typography,
  Button,
  Input,
  Select,
  App,
  Spin,
  Tag,
  Tooltip,
  DatePicker,
  Dropdown,
  Drawer,
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TagOutlined,
  CheckOutlined,
  MenuOutlined,
  ClockCircleOutlined,
  EditOutlined
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTimelineStore } from '@stores/timelineStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useUIStore } from '@stores/uiStore'
import { getThemeColor } from '@utils/theme'
import { THEME_COLORS, CHART_PALETTE } from '@shared/constants/colors'
import type { TimelineNode, TimeInfo, CharacterRef } from '@types/timeline'
import type { MenuProps } from 'antd'
import styles from './TimelineFullscreen.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface TimelineFullscreenProps {
  timelineId: string
  onBack: () => void
}

// 节点编辑弹窗状态
interface NodeEditState {
  visible: boolean
  node: Partial<TimelineNode> | null
  isNew: boolean
}

// 可排序节点组件
interface SortableTimelineNodeProps {
  node: TimelineNode
  index: number
  totalCount: number
  isBatchMode: boolean
  isSelected: boolean
  onToggleSelect: (shiftKey: boolean) => void
  onContextMenu: (e: React.MouseEvent) => void
  onEdit: () => void
  formatTimeInfo: (timeInfo: TimeInfo) => string
  getTimeIcon: (format: string) => JSX.Element
}

function SortableTimelineNode({
  node,
  index,
  totalCount,
  isBatchMode,
  isSelected,
  onToggleSelect,
  onContextMenu,
  onEdit,
  formatTimeInfo,
  getTimeIcon
}: SortableTimelineNodeProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: isBatchMode
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.timelineItem} ${isSelected ? styles.selected : ''}`}
      onClick={() => isBatchMode && onToggleSelect(false)}
      onContextMenu={onContextMenu}
    >
      <div className={styles.timelineLine}>
        <div className={styles.timelineDot} style={{ backgroundColor: node.color || 'var(--color-primary)' }} />
        {index < totalCount - 1 && <div className={styles.timelineConnector} />}
      </div>
      <div className={styles.timelineContent}>
        <div className={styles.nodeHeader}>
          <div className={styles.nodeTitleRow}>
            <Text strong className={styles.nodeTitle}>
              {node.title}
            </Text>
            {node.isBranchPoint && <Tag color="blue">分支点</Tag>}
          </div>
          <div className={styles.nodeActions}>
            {!isBatchMode && (
              <>
                <span {...attributes} {...listeners} style={{ cursor: 'grab' }}>
                  <MenuOutlined style={{ color: 'var(--text-tertiary)' }} />
                </span>
                <Button type="text" size="small" icon={<EditOutlined />} onClick={onEdit} />
              </>
            )}
            {isBatchMode && isSelected && <CheckOutlined className={styles.checkIcon} />}
          </div>
        </div>
        {node.timeInfo && formatTimeInfo(node.timeInfo) && (
          <div className={styles.nodeTime}>
            {getTimeIcon(node.timeInfo.format)}
            <Text type="secondary">{formatTimeInfo(node.timeInfo)}</Text>
          </div>
        )}
        {node.description && <div className={styles.nodeDescription}>{node.description}</div>}
        {node.characters && node.characters.length > 0 && (
          <div className={styles.nodeCharacters}>
            <UserOutlined />
            <div className={styles.characterList}>
              {node.characters.map(char => (
                <Tag key={char.id} color={char.color || 'default'}>
                  {char.name}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {node.tags && node.tags.length > 0 && (
          <div className={styles.nodeTags}>
            {node.tags.map(tag => (
              <Tag key={tag} color="blue" style={{ fontSize: 11 }}>
                {tag}
              </Tag>
            ))}
          </div>
        )}
        {node.chapter && (
          <div className={styles.nodeChapter}>
            <FileTextOutlined />
            <Text type="secondary">{node.chapter.title}</Text>
          </div>
        )}
      </div>
    </div>
  )
}

function TimelineFullscreen({ timelineId, onBack }: TimelineFullscreenProps): JSX.Element {
  const { token } = theme.useToken()
  const { modal, message } = App.useApp()
  const isDarkMode =
    token.colorBgContainer === '#141414' ||
    token.colorBgContainer === '#1f1f1f' ||
    token.colorTextBase === '#fff'

  const {
    currentTimeline,
    isLoading,
    loadTimeline,
    addNode,
    updateNode,
    deleteNode,
    moveNode,
    batchDeleteNodes,
    undo,
    redo,
    canUndo,
    canRedo,
    saveThumbnail
  } = useTimelineStore()

  const { types: vocabularyTypes, loadTypes, entries, loadEntries } = useVocabularyStore()

  const setFullscreenMode = useUIStore(state => state.setFullscreenMode)
  const exitFullscreen = useUIStore(state => state.exitFullscreen)

  // 设置全屏模式，卸载时退出
  useEffect(() => {
    setFullscreenMode('timeline')
    return () => exitFullscreen()
  }, [setFullscreenMode, exitFullscreen])

  // 视图状态
  const [zoom, setZoom] = useState(1)
  const contentRef = useRef<HTMLDivElement>(null)

  // Ctrl+滚轮缩放
  useEffect(() => {
    const contentEl = contentRef.current
    if (!contentEl) return

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        setZoom(prev => Math.min(Math.max(prev + delta, 0.3), 3))
      }
    }

    contentEl.addEventListener('wheel', handleWheel, { passive: false })
    return () => contentEl.removeEventListener('wheel', handleWheel)
  }, [])

  // 节点编辑弹窗状态
  const [nodeEdit, setNodeEdit] = useState<NodeEditState>({
    visible: false,
    node: null,
    isNew: false
  })

  // 批量选择状态
  const [selectedNodes, setSelectedNodes] = useState<string[]>([])
  const [isBatchMode, setIsBatchMode] = useState(false)
  const lastSelectedNodeId = useRef<string | null>(null)

  // 拖拽状态
  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    nodeId: string | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null
  })

  // 初始化
  useEffect(() => {
    loadTimeline(timelineId)
    loadTypes()
  }, [timelineId, loadTimeline, loadTypes])

  // 加载词汇条目 - 只加载一次
  useEffect(() => {
    if (vocabularyTypes.length > 0) {
      vocabularyTypes.forEach(type => {
        loadEntries(type.id)
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabularyTypes.length])

  // 生成缩略图 - 使用防抖，避免频繁生成
  const generateThumbnail = useCallback(() => {
    if (!currentTimeline) return

    const canvas = document.createElement('canvas')
    canvas.width = 200
    canvas.height = 120
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 绘制背景
    ctx.fillStyle = getThemeColor('--bg-primary')
    ctx.fillRect(0, 0, 200, 120)

    const nodes = currentTimeline.nodes.slice().sort((a, b) => a.order - b.order)
    const nodeCount = Math.min(nodes.length, 5)
    const spacing = 100 / (nodeCount + 1)

    ctx.strokeStyle = getThemeColor('--border-primary')
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(20, 60)
    ctx.lineTo(180, 60)
    ctx.stroke()

    nodes.slice(0, 5).forEach((node, i) => {
      const x = 20 + spacing * (i + 1) * 1.6
      ctx.beginPath()
      ctx.arc(x, 60, 4, 0, Math.PI * 2)
      ctx.fillStyle = node.color || getThemeColor('--color-primary')
      ctx.fill()
    })

    const dataUrl = canvas.toDataURL('image/png')
    saveThumbnail(dataUrl)
  }, [currentTimeline, isDarkMode, saveThumbnail])

  // 缩略图生成 - 延迟执行
  const currentTimelineRef = useRef(currentTimeline)
  currentTimelineRef.current = currentTimeline

  useEffect(() => {
    if (!currentTimelineRef.current) return
    const timer = setTimeout(generateThumbnail, 500)
    return () => clearTimeout(timer)
  }, [currentTimeline?.nodes?.length, generateThumbnail])

  // 按顺序排序节点 - 只依赖 nodes 数组
  const sortedNodes: TimelineNode[] = useMemo(() => {
    if (!currentTimeline?.nodes) return []
    return [...currentTimeline.nodes].sort((a, b) => a.order - b.order)
  }, [currentTimeline?.nodes])

  // 打开新增节点弹窗
  const handleAddNode = useCallback(() => {
    const nodes = currentTimeline?.nodes || []
    const maxOrder = nodes.length > 0 ? Math.max(...nodes.map(n => n.order)) : -1
    setNodeEdit({
      visible: true,
      node: {
        title: '',
        description: '',
        timeInfo: {
          format: 'custom'
        },
        characters: [],
        order: maxOrder + 1,
        color: getThemeColor('--color-primary')
      },
      isNew: true
    })
  }, [currentTimeline?.nodes])

  // 快速添加模板
  const handleQuickAdd = useCallback(
    async (template: { title: string; description: string; color: string }) => {
      const nodes = currentTimeline?.nodes || []
      const maxOrder = nodes.length > 0 ? Math.max(...nodes.map(n => n.order)) : -1
      await addNode({
        title: template.title,
        description: template.description,
        timeInfo: { format: 'custom' },
        characters: [],
        order: maxOrder + 1,
        color: template.color
      })
      message.success(`已添加: ${template.title}`)
    },
    [currentTimeline?.nodes, addNode, message]
  )

  const quickAddMenu: MenuProps['items'] = useMemo(
    () => [
      { key: 'event', label: '事件节点', icon: <ClockCircleOutlined /> },
      { key: 'turning', label: '转折点', icon: <EditOutlined /> },
      { key: 'climax', label: '高潮', icon: <TagOutlined /> },
      { key: 'ending', label: '结局', icon: <CheckOutlined /> },
      { type: 'divider' },
      { key: 'custom', label: '自定义...', icon: <PlusOutlined /> }
    ],
    []
  )

  const handleQuickAddClick: MenuProps['onClick'] = useCallback(
    info => {
      const templates: Record<string, { title: string; description: string; color: string }> = {
        event: { title: '新事件', description: '', color: getThemeColor('--color-primary') },
        turning: { title: '转折点', description: '故事方向发生重大变化', color: THEME_COLORS.orange },
        climax: { title: '高潮', description: '故事的紧张巅峰', color: THEME_COLORS.red },
        ending: { title: '结局', description: '', color: THEME_COLORS.success }
      }
      if (info.key === 'custom') {
        handleAddNode()
      } else if (templates[info.key]) {
        handleQuickAdd(templates[info.key])
      }
    },
    [handleAddNode, handleQuickAdd]
  )

  // 打开编辑节点弹窗
  const handleEditNode = useCallback((node: TimelineNode) => {
    setNodeEdit({
      visible: true,
      node: { ...node },
      isNew: false
    })
  }, [])

  // 保存节点
  const handleSaveNode = async () => {
    if (!nodeEdit.node?.title?.trim()) {
      message.warning('请输入节点标题')
      return
    }

    if (nodeEdit.isNew) {
      await addNode({
        title: nodeEdit.node.title.trim(),
        description: nodeEdit.node.description,
        timeInfo: nodeEdit.node.timeInfo || { format: 'custom' },
        characters: nodeEdit.node.characters || [],
        chapter: nodeEdit.node.chapter,
        color: nodeEdit.node.color || getThemeColor('--color-primary'),
        order: nodeEdit.node.order || 0,
        isBranchPoint: nodeEdit.node.isBranchPoint,
        tags: nodeEdit.node.tags,
        causalLinks: nodeEdit.node.causalLinks
      })
    } else if (nodeEdit.node.id) {
      await updateNode(nodeEdit.node.id, nodeEdit.node as Partial<TimelineNode>)
    }

    setNodeEdit({ visible: false, node: null, isNew: false })
  }

  // 删除节点
  const handleDeleteNode = async (nodeId: string) => {
    await deleteNode(nodeId)
    setSelectedNodes(prev => prev.filter(id => id !== nodeId))
  }

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedNodes.length === 0) return
    modal.confirm({
      title: `确定要删除选中的 ${selectedNodes.length} 个节点吗？`,
      content: '删除后无法恢复',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        await batchDeleteNodes(selectedNodes)
        setSelectedNodes([])
        setIsBatchMode(false)
      }
    })
  }, [selectedNodes, modal, batchDeleteNodes])

  // 拖拽开始
  // DnD 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // DnD 拖拽结束
  const handleDndDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveDragId(null)
      if (!over || active.id === over.id) return
      await moveNode(active.id as string, over.id as string)
    },
    [moveNode]
  )

  const handleDndDragStart = useCallback((event: DragEndEvent) => {
    setActiveDragId(event.active.id as string)
  }, [])

  // 切换批量选择模式
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode)
    setSelectedNodes([])
  }

  // 选择/取消选择节点（支持Shift范围选择）
  const toggleNodeSelection = (nodeId: string, shiftKey: boolean = false) => {
    if (shiftKey && lastSelectedNodeId.current) {
      const startIdx = sortedNodes.findIndex(n => n.id === lastSelectedNodeId.current)
      const endIdx = sortedNodes.findIndex(n => n.id === nodeId)
      if (startIdx !== -1 && endIdx !== -1) {
        const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx]
        const rangeIds = sortedNodes.slice(from, to + 1).map(n => n.id)
        setSelectedNodes(prev => {
          const newSet = new Set(prev)
          rangeIds.forEach(id => newSet.add(id))
          return Array.from(newSet)
        })
        lastSelectedNodeId.current = nodeId
        return
      }
    }

    setSelectedNodes(prev =>
      prev.includes(nodeId) ? prev.filter(id => id !== nodeId) : [...prev, nodeId]
    )
    lastSelectedNodeId.current = nodeId
  }

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev + 0.1, 2))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev - 0.1, 0.5))
  }, [])

  const handleZoomReset = useCallback(() => {
    setZoom(1)
  }, [])

  // 格式化时间信息
  const formatTimeInfo = (timeInfo?: TimeInfo): string => {
    if (!timeInfo) return ''
    switch (timeInfo.format) {
      case 'datetime':
        return timeInfo.datetime || ''
      case 'chapter':
        return timeInfo.chapterTitle || ''
      case 'custom':
        return timeInfo.customLabel || ''
      default:
        return ''
    }
  }

  // 获取时间类型的图标
  const getTimeIcon = (format?: string) => {
    switch (format) {
      case 'datetime':
        return <CalendarOutlined />
      case 'chapter':
        return <FileTextOutlined />
      default:
        return <TagOutlined />
    }
  }

  // 获取节点操作菜单（精简版：只保留编辑和删除）
  const getNodeContextMenu = (node: TimelineNode): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => {
        handleEditNode(node)
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: () =>
        modal.confirm({
          title: '确定要删除这个节点吗？',
          content: `将删除「${node.title}」，删除后无法恢复`,
          okText: '删除',
          okButtonProps: { danger: true },
          cancelText: '取消',
          onOk: () => handleDeleteNode(node.id)
        })
    }
  ]

  // 处理右键菜单
  const handleContextMenu = (e: React.MouseEvent, node: TimelineNode) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      nodeId: node.id
    })
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isInputFocused) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case 'y':
            e.preventDefault()
            redo()
            break
          case 'a':
            e.preventDefault()
            if (isBatchMode) {
              setSelectedNodes(sortedNodes.map(n => n.id))
            }
            break
          case 's':
            e.preventDefault()
            message.success('已自动保存')
            break
        }
      } else {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            if (selectedNodes.length > 0 && isBatchMode) {
              e.preventDefault()
              handleBatchDelete()
            }
            break
          case 'Escape':
            if (nodeEdit.visible) {
              setNodeEdit({ visible: false, node: null, isNew: false })
            } else if (contextMenu.visible) {
              setContextMenu(prev => ({ ...prev, visible: false }))
            } else if (isBatchMode) {
              setIsBatchMode(false)
              setSelectedNodes([])
            }
            break
          case '+':
          case '=':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              handleZoomIn()
            }
            break
          case '-':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              handleZoomOut()
            }
            break
          case '0':
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault()
              handleZoomReset()
            }
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [
    undo,
    redo,
    isBatchMode,
    sortedNodes,
    selectedNodes,
    nodeEdit.visible,
    contextMenu.visible,
    handleBatchDelete,
    handleZoomIn,
    handleZoomOut,
    handleZoomReset,
    message
  ])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spin size="large" />
          <Text type="secondary">加载中...</Text>
        </div>
      </div>
    )
  }

  if (!currentTimeline) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Text type="secondary">时间线不存在</Text>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 顶部工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
          <Title level={4} className={styles.title}>
            {currentTimeline.name}
          </Title>
          <span className={styles.stats}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />
            {sortedNodes.length} 个节点
          </span>
        </div>

        <div className={styles.toolbarCenter}>
          <Tooltip title="撤销 (Ctrl+Z)">
            <Button icon={<UndoOutlined />} disabled={!canUndo} onClick={undo} />
          </Tooltip>
          <Tooltip title="重做 (Ctrl+Y)">
            <Button icon={<RedoOutlined />} disabled={!canRedo} onClick={redo} />
          </Tooltip>
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.zoomControls}>
            <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
            <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            <Button size="small" onClick={handleZoomReset}>
              重置
            </Button>
          </div>

          {isBatchMode ? (
            <>
              <Text type="secondary">已选 {selectedNodes.length} 项</Text>
              <Button danger onClick={handleBatchDelete} disabled={selectedNodes.length === 0}>
                删除选中
              </Button>
              <Button onClick={toggleBatchMode}>取消选择</Button>
            </>
          ) : (
            <>
              <Button icon={<MenuOutlined />} onClick={toggleBatchMode}>
                批量操作
              </Button>
              <Dropdown
                menu={{ items: quickAddMenu, onClick: handleQuickAddClick }}
                trigger={['click']}
              >
                <Button icon={<PlusOutlined />}>快速添加</Button>
              </Dropdown>
              <Button type="primary" onClick={handleAddNode}>
                自定义节点
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 时间线主体 */}
      <div
        className={styles.content}
        ref={contentRef}
        style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
      >
        {sortedNodes.length === 0 ? (
          <div className={styles.emptyNodes}>
            <ClockCircleOutlined className={styles.emptyIcon} />
            <Text type="secondary">暂无节点</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNode}>
              添加第一个节点
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDndDragStart}
            onDragEnd={handleDndDragEnd}
          >
            <SortableContext
              items={sortedNodes.map(n => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.timeline}>
                {sortedNodes.map((node, index) => (
                  <SortableTimelineNode
                    key={node.id}
                    node={node}
                    index={index}
                    totalCount={sortedNodes.length}
                    isBatchMode={isBatchMode}
                    isSelected={selectedNodes.includes(node.id)}
                    onToggleSelect={shiftKey => toggleNodeSelection(node.id, shiftKey)}
                    onContextMenu={e => handleContextMenu(e, node)}
                    onEdit={() => handleEditNode(node)}
                    formatTimeInfo={formatTimeInfo}
                    getTimeIcon={getTimeIcon}
                  />
                ))}

                {!isBatchMode && (
                  <div className={styles.addNodeButton}>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={handleAddNode} block>
                      添加节点
                    </Button>
                  </div>
                )}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (
                <div
                  style={{
                    opacity: 0.5,
                    padding: '8px 12px',
                    background: 'var(--bg-surface)',
                    borderRadius: 8
                  }}
                >
                  <Text strong>{sortedNodes.find(n => n.id === activeDragId)?.title}</Text>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {/* 节点编辑抽屉 */}
      <Drawer
        title={nodeEdit.isNew ? '添加节点' : '编辑节点'}
        open={nodeEdit.visible}
        onClose={() => setNodeEdit({ visible: false, node: null, isNew: false })}
        width={480}
        extra={
          <Button type="primary" onClick={handleSaveNode}>
            保存
          </Button>
        }
      >
        <div className={styles.drawerContent}>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>标题 *</label>
            <Input
              placeholder="输入节点标题"
              value={nodeEdit.node?.title || ''}
              onChange={e =>
                setNodeEdit(prev => ({
                  ...prev,
                  node: { ...prev.node, title: e.target.value }
                }))
              }
              maxLength={100}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              placeholder="输入节点描述"
              value={nodeEdit.node?.description || ''}
              onChange={e =>
                setNodeEdit(prev => ({
                  ...prev,
                  node: { ...prev.node, description: e.target.value }
                }))
              }
              rows={3}
              maxLength={500}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>时间信息</label>
            <Select
              value={nodeEdit.node?.timeInfo?.format || 'custom'}
              onChange={value =>
                setNodeEdit(prev => ({
                  ...prev,
                  node: {
                    ...prev.node,
                    timeInfo: { ...prev.node?.timeInfo, format: value }
                  }
                }))
              }
              options={[
                { label: '自定义标签', value: 'custom' },
                { label: '日期时间', value: 'datetime' },
                { label: '章节引用', value: 'chapter' }
              ]}
              style={{ width: '100%', marginBottom: 8 }}
            />
            {nodeEdit.node?.timeInfo?.format === 'datetime' && (
              <DatePicker
                showTime
                value={nodeEdit.node?.timeInfo?.datetime}
                onChange={date =>
                  setNodeEdit(prev => ({
                    ...prev,
                    node: {
                      ...prev.node,
                      timeInfo: {
                        ...prev.node?.timeInfo,
                        datetime: date?.toISOString()
                      }
                    }
                  }))
                }
                style={{ width: '100%' }}
              />
            )}
            {nodeEdit.node?.timeInfo?.format === 'custom' && (
              <Input
                placeholder="输入自定义时间标签，如：第一纪元、三年前"
                value={nodeEdit.node?.timeInfo?.customLabel || ''}
                onChange={e =>
                  setNodeEdit(prev => ({
                    ...prev,
                    node: {
                      ...prev.node,
                      timeInfo: {
                        ...prev.node?.timeInfo,
                        customLabel: e.target.value
                      }
                    }
                  }))
                }
              />
            )}
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>关联角色</label>
            <Select
              mode="multiple"
              placeholder="选择关联的角色"
              value={nodeEdit.node?.characters?.map(c => c.id) || []}
              onChange={ids => {
                const selectedChars = ids.map(id => {
                  const entry = Object.values(entries)
                    .flat()
                    .find(e => e.id === id)
                  return {
                    id,
                    name: entry?.name || '',
                    color: entry?.color
                  } as CharacterRef
                })
                setNodeEdit(prev => ({
                  ...prev,
                  node: { ...prev.node, characters: selectedChars }
                }))
              }}
              options={Object.values(entries)
                .flat()
                .map(e => ({ label: e.name, value: e.id }))}
              style={{ width: '100%' }}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>标签</label>
            <Select
              mode="tags"
              placeholder="输入标签后按回车添加"
              value={nodeEdit.node?.tags || []}
              onChange={tags =>
                setNodeEdit(prev => ({
                  ...prev,
                  node: { ...prev.node, tags }
                }))
              }
              style={{ width: '100%' }}
              tokenSeparators={[',']}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>节点颜色</label>
            <div className={styles.colorPicker}>
              {CHART_PALETTE.map(
                color => (
                  <div
                    key={color}
                    className={`${styles.colorOption} ${
                      nodeEdit.node?.color === color ? styles.colorSelected : ''
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      setNodeEdit(prev => ({
                        ...prev,
                        node: { ...prev.node, color }
                      }))
                    }
                  />
                )
              )}
            </div>
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>分支设置</label>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={nodeEdit.node?.isBranchPoint || false}
                onChange={e =>
                  setNodeEdit(prev => ({
                    ...prev,
                    node: { ...prev.node, isBranchPoint: e.target.checked }
                  }))
                }
              />
              <span>标记为分支点</span>
            </label>
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>因果关系</label>
            <Select
              mode="multiple"
              placeholder="选择此节点导致的结果节点"
              value={nodeEdit.node?.causalLinks?.map(l => l.targetId) || []}
              onChange={targetIds => {
                const links = targetIds.map(id => ({ targetId: id }))
                setNodeEdit(prev => ({
                  ...prev,
                  node: { ...prev.node, causalLinks: links }
                }))
              }}
              options={sortedNodes
                .filter(n => n.id !== nodeEdit.node?.id)
                .map(n => ({ label: n.title, value: n.id }))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </Drawer>

      {/* 右键菜单 */}
      <Dropdown
        menu={{
          items: contextMenu.nodeId
            ? getNodeContextMenu(sortedNodes.find(n => n.id === contextMenu.nodeId)!)
            : []
        }}
        open={contextMenu.visible}
        onOpenChange={open => {
          if (!open) {
            setContextMenu(prev => ({ ...prev, visible: false }))
          }
        }}
        overlayStyle={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 10001
        }}
      >
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }} />
      </Dropdown>
    </div>
  )
}

export default TimelineFullscreen
