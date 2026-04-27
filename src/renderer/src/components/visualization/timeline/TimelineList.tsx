/**
 * 时间线列表组件
 * 展示所有时间线，支持创建、编辑、删除、导入导出、拖拽排序
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Typography,
  Button,
  Card,
  Modal,
  App,
  Input,
  Spin,
  Tag,
  Dropdown,
} from 'antd'
import type { MenuProps } from 'antd'
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

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  timeline: TimelineMeta | null
}

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
    loadList,
    createTimeline,
    deleteTimeline,
    exportTimeline,
    exportTimelineAsMarkdown,
    importTimeline,
    reorderTimelines,
  } = useTimelineStore()

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newTimelineName, setNewTimelineName] = useState('')
  const [newTimelineDescription, setNewTimelineDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    timeline: null,
  })

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

  useEffect(() => {
    loadList()
  }, [loadList])

  const getLocalUrl = (filePath: string): string => {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const encodedPath = encodeURIComponent(normalizedPath)
    return `local://file/${encodedPath}`
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, timeline: TimelineMeta) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      timeline,
    })
  }, [])

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

  const handleDoubleClick = (timelineId: string) => {
    onSelectTimeline(timelineId)
  }

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

  const getContextMenuItems = useCallback((): MenuProps['items'] => {
    const timeline = contextMenu.timeline
    if (!timeline) return []

    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => {
          onSelectTimeline(timeline.id)
          setContextMenu((prev) => ({ ...prev, visible: false }))
        },
      },
      {
        key: 'export',
        icon: <ExportOutlined />,
        label: '导出',
        children: [
          {
            key: 'export-json',
            label: '导出为 JSON',
            onClick: () => handleExport(timeline, 'json'),
          },
          {
            key: 'export-markdown',
            label: '导出为 Markdown',
            onClick: () => handleExport(timeline, 'markdown'),
          },
        ],
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(timeline),
      },
    ]
  }, [contextMenu.timeline, onSelectTimeline, handleExport, handleDelete])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = timelines.findIndex((t) => t.id === active.id)
        const newIndex = timelines.findIndex((t) => t.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newTimelines = arrayMove(timelines, oldIndex, newIndex)
          const newTimelineIds = newTimelines.map((t) => t.id)

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
            <Text type="secondary">创建时间线来追踪故事中的事件发展</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
              创建第一个时间线
            </Button>
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

      {/* 右键菜单 - 使用 Ant Design Dropdown */}
      <Dropdown
        menu={{ items: getContextMenuItems() }}
        open={contextMenu.visible}
        onOpenChange={(open) => {
          if (!open) {
            setContextMenu((prev) => ({ ...prev, visible: false }))
          }
        }}
        overlayStyle={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 1050,
        }}
      >
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }} />
      </Dropdown>

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
