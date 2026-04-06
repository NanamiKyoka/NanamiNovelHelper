/**
 * 时间线列表组件
 * 展示所有时间线，支持创建、编辑、删除、导入导出、拖拽排序
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Typography,
  Button,
  Card,
  Modal,
  App,
  Input,
  Spin,
  Tag,
} from 'antd'
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
  FileTextOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTimelineStore } from '@stores/timelineStore'
import type { TimelineMeta } from '@types/timeline'
import styles from './TimelineList.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface TimelineListProps {
  onSelectTimeline: (timelineId: string) => void
}

// 右键菜单位置
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  timeline: TimelineMeta | null
}

// 可排序的卡片组件
interface SortableCardProps {
  timeline: TimelineMeta
  onContextMenu: (e: React.MouseEvent, timeline: TimelineMeta) => void
  onDoubleClick: (timelineId: string) => void
  getLocalUrl: (filePath: string) => string
  getBranchTypeTag: (timeline: TimelineMeta) => React.ReactNode
}

function SortableCard({
  timeline,
  onContextMenu,
  onDoubleClick,
  getLocalUrl,
  getBranchTypeTag,
}: SortableCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: timeline.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.sortableCardWrapper}
    >
      <Card
        className={styles.timelineCard}
        onContextMenu={(e) => onContextMenu(e, timeline)}
        onDoubleClick={() => onDoubleClick(timeline.id)}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.thumbnail}>
          {timeline.thumbnail ? (
            <img
              src={getLocalUrl(timeline.thumbnail)}
              alt={timeline.name}
              className={styles.thumbnailImage}
            />
          ) : (
            <ClockCircleOutlined className={styles.thumbnailPlaceholder} />
          )}
          {/* 拖拽手柄 */}
          <div
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
          >
            <HolderOutlined />
          </div>
          {getBranchTypeTag(timeline)}
        </div>
        <div className={styles.cardBody}>
          <div className={styles.timelineName}>{timeline.name}</div>
          {timeline.description && (
            <div className={styles.timelineDescription}>{timeline.description}</div>
          )}
          <div className={styles.timelineStats}>
            <span className={styles.stat}>
              <FileTextOutlined />
              {timeline.nodeCount} 节点
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

function TimelineList({ onSelectTimeline }: TimelineListProps): JSX.Element {
  const { modal, message } = App.useApp()

  const {
    timelines,
    isLoading,
    error,
    loadList,
    createTimeline,
    deleteTimeline,
    exportTimeline,
    exportTimelineAsMarkdown,
    importTimeline,
    reorderTimelines,
  } = useTimelineStore()

  // 创建模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newTimelineName, setNewTimelineName] = useState('')
  const [newTimelineDescription, setNewTimelineDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    timeline: null,
  })

  const contextMenuRef = useRef<HTMLDivElement>(null)

  // DnD 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 加载列表
  useEffect(() => {
    loadList()
  }, [loadList])

  // 将本地路径转换为 local:// URL
  const getLocalUrl = (filePath: string): string => {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const encodedPath = encodeURIComponent(normalizedPath)
    return `local://file/${encodedPath}`
  }

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.visible])

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, timeline: TimelineMeta) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      timeline,
    })
  }, [])

  // 创建新时间线
  const handleCreate = async () => {
    if (!newTimelineName.trim()) {
      message.warning('请输入时间线名称')
      return
    }

    setIsCreating(true)
    try {
      const timeline = await createTimeline({
        name: newTimelineName.trim(),
        description: newTimelineDescription.trim() || undefined,
      })
      if (timeline) {
        message.success('创建成功')
        setCreateModalVisible(false)
        setNewTimelineName('')
        setNewTimelineDescription('')
        onSelectTimeline(timeline.id)
      }
    } finally {
      setIsCreating(false)
    }
  }

  // 删除时间线
  const handleDelete = (timeline: TimelineMeta) => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
    modal.confirm({
      title: '确定要删除这个时间线吗？',
      content: `将删除「${timeline.name}」，删除后无法恢复。${
        timeline.branchInfo.type === 'main'
          ? '\n注意：该时间线下的分支时间线不会被删除，但会失去关联。'
          : ''
      }`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteTimeline(timeline.id)
          message.success('删除成功')
        } catch {
          message.error('删除失败')
        }
      },
    })
  }

  // 导出时间线
  const handleExport = async (timeline: TimelineMeta, format: 'json' | 'markdown' = 'json') => {
    try {
      const filePath = await window.electron.timeline.showExportDialog(timeline.name, format)
      if (filePath) {
        const content =
          format === 'markdown'
            ? await exportTimelineAsMarkdown(timeline.id)
            : await exportTimeline(timeline.id)
        if (content) {
          await window.electron.timeline.saveExportFile(filePath, content)
          message.success('导出成功')
        }
      }
    } catch {
      message.error('导出失败')
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // 导入时间线
  const handleImport = async () => {
    try {
      const filePath = await window.electron.timeline.showImportDialog()
      if (filePath) {
        const content = await window.electron.timeline.readImportFile(filePath)
        if (content) {
          const timeline = await importTimeline(content)
          if (timeline) {
            message.success('导入成功')
          }
        }
      }
    } catch {
      message.error('导入失败')
    }
  }

  // 双击打开
  const handleDoubleClick = (timelineId: string) => {
    onSelectTimeline(timelineId)
  }

  // 获取分支类型标签
  const getBranchTypeTag = (timeline: TimelineMeta) => {
    if (timeline.branchInfo.type === 'branch') {
      return (
        <Tag color="blue" className={styles.branchTag}>
          <BranchesOutlined /> 分支
        </Tag>
      )
    }
    return null
  }

  // 拖拽结束
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = timelines.findIndex((t) => t.id === active.id)
        const newIndex = timelines.findIndex((t) => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // 乐观更新：先本地排序
          const newTimelines = arrayMove(timelines, oldIndex, newIndex)
          const newTimelineIds = newTimelines.map((t) => t.id)

          // 保存到后端
          const success = await reorderTimelines(newTimelineIds)
          if (!success) {
            message.error('排序保存失败')
          }
        }
      }
    },
    [timelines, reorderTimelines, message]
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ClockCircleOutlined />
          <Title level={5} style={{ margin: 0 }}>
            时间线
          </Title>
          <Text type="secondary">({timelines.length})</Text>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<ImportOutlined />} onClick={handleImport}>
            导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
            新建
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <Spin />
          </div>
        ) : timelines.length === 0 ? (
          <div className={styles.emptyState}>
            <ClockCircleOutlined className={styles.emptyIcon} />
            <Text>暂无时间线</Text>
            <Text type="secondary">点击"新建"创建第一个时间线</Text>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={timelines.map((t) => t.id)} strategy={rectSortingStrategy}>
              <div className={styles.grid}>
                {timelines.map((timeline) => (
                  <SortableCard
                    key={timeline.id}
                    timeline={timeline}
                    onContextMenu={handleContextMenu}
                    onDoubleClick={handleDoubleClick}
                    getLocalUrl={getLocalUrl}
                    getBranchTypeTag={getBranchTypeTag}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && contextMenu.timeline && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              onSelectTimeline(contextMenu.timeline!.id)
              setContextMenu((prev) => ({ ...prev, visible: false }))
            }}
          >
            <EditOutlined />
            <span>编辑</span>
          </div>
          <div className={styles.contextMenuSubmenu}>
            <ExportOutlined />
            <span>导出</span>
            <div className={styles.contextMenuSubmenuItems}>
              <div
                className={styles.contextMenuItem}
                onClick={() => handleExport(contextMenu.timeline!, 'json')}
              >
                导出为 JSON
              </div>
              <div
                className={styles.contextMenuItem}
                onClick={() => handleExport(contextMenu.timeline!, 'markdown')}
              >
                导出为 Markdown
              </div>
            </div>
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={() => handleDelete(contextMenu.timeline!)}
          >
            <DeleteOutlined />
            <span>删除</span>
          </div>
        </div>
      )}

      {/* 创建模态框 */}
      <Modal
        title="创建时间线"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreate}
        confirmLoading={isCreating}
        okText="创建"
        cancelText="取消"
      >
        <div className={styles.modalContent}>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>名称 *</label>
            <Input
              placeholder="输入时间线名称"
              value={newTimelineName}
              onChange={(e) => setNewTimelineName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              placeholder="输入时间线描述（可选）"
              value={newTimelineDescription}
              onChange={(e) => setNewTimelineDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default TimelineList