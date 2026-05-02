/**
 * 时间线预览组件
 * 以只读模式展示时间线，可进入编辑模式
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Typography, Button, Spin, App, Tag, Empty, Input } from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  ClockCircleOutlined,
  BranchesOutlined,
  UserOutlined,
  FileTextOutlined,
  CalendarOutlined,
  TagOutlined,
  HolderOutlined,
  CheckOutlined,
  CameraOutlined
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useTimelineStore } from '@stores/timelineStore'
import { useEditorStore } from '@stores/editorStore'
import { useUIStore } from '@stores/uiStore'
import { THEME_COLORS, NEUTRAL_COLORS } from '@shared/constants/colors'
import type { TimelineNode, TimeInfo } from '@renderer/types/timeline'
import styles from './TimelinePreview.module.css'

const { Text, Title } = Typography

// 可排序的时间线节点组件
interface SortableTimelineItemProps {
  node: TimelineNode
  index: number
  totalCount: number
  isEditMode: boolean
  editingField: { nodeId: string; field: 'title' | 'description' } | null
  onStartEdit: (nodeId: string, field: 'title' | 'description') => void
  onFinishEdit: (nodeId: string, field: 'title' | 'description', value: string) => void
  onEditChange: (value: string) => void
  editValue: string
  onChapterClick: (path: string, title: string) => void
  formatTimeInfo: (timeInfo: TimeInfo) => string
  getTimeIcon: (format: string) => JSX.Element
}

function SortableTimelineItem({
  node,
  index,
  totalCount,
  isEditMode,
  editingField,
  onStartEdit,
  onFinishEdit,
  onEditChange,
  editValue,
  onChapterClick,
  formatTimeInfo,
  getTimeIcon
}: SortableTimelineItemProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
    disabled: !isEditMode
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
      className={`${styles.timelineItemWrapper}${isEditMode ? ` ${styles.editing}` : ''}`}
      data-node-id={node.id}
    >
      {/* 拖拽手柄 */}
      {isEditMode && (
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          <HolderOutlined style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} />
        </div>
      )}
      <div className={styles.timelineItem}>
        <div className={styles.timelineLine}>
          <div
            className={`${styles.timelineDot} ${node.isBranchPoint ? styles.branchDot : ''}`}
            style={{ backgroundColor: node.color || 'var(--color-primary)' }}
          />
          {index < totalCount - 1 && <div className={styles.timelineConnector} />}
        </div>
        <div className={styles.timelineContent}>
          <div className={styles.nodeHeader}>
            {editingField?.nodeId === node.id && editingField.field === 'title' ? (
              <Input
                size="small"
                value={editValue}
                onChange={e => onEditChange(e.target.value)}
                onBlur={() => onFinishEdit(node.id, 'title', editValue)}
                onPressEnter={() => onFinishEdit(node.id, 'title', editValue)}
                autoFocus
                style={{ flex: 1, fontWeight: 600 }}
              />
            ) : (
              <Text
                strong
                className={styles.nodeTitle}
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onStartEdit(node.id, 'title')}
              >
                {node.title}
              </Text>
            )}
            {node.timeInfo && (
              <div className={styles.nodeTime}>
                {getTimeIcon(node.timeInfo.format)}
                <Text type="secondary">{formatTimeInfo(node.timeInfo)}</Text>
              </div>
            )}
          </div>

          {editingField?.nodeId === node.id && editingField.field === 'description' ? (
            <Input.TextArea
              size="small"
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onBlur={() => onFinishEdit(node.id, 'description', editValue)}
              onPressEnter={() => onFinishEdit(node.id, 'description', editValue)}
              autoFocus
              rows={2}
              style={{ marginTop: 4 }}
            />
          ) : (
            node.description && (
              <div
                className={styles.nodeDescription}
                style={{ cursor: 'pointer' }}
                onDoubleClick={() => onStartEdit(node.id, 'description')}
              >
                {node.description}
              </div>
            )
          )}

          {/* 关联角色 */}
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

          {/* 关联章节 */}
          {node.chapter && (
            <div
              className={styles.nodeChapter}
              style={{ cursor: 'pointer' }}
              onClick={() => onChapterClick(node.chapter!.path, node.chapter!.title)}
              title="点击跳转到章节"
            >
              <FileTextOutlined />
              <Text type="secondary" style={{ textDecoration: 'underline' }}>
                {node.chapter.title}
              </Text>
            </div>
          )}

          {/* 分支标记 */}
          {node.isBranchPoint &&
            node.branchedTimelineIds &&
            node.branchedTimelineIds.length > 0 && (
              <div className={styles.branchMark}>
                <BranchesOutlined style={{ color: THEME_COLORS.purple }} />
                <Text style={{ color: THEME_COLORS.purple }}>{node.branchedTimelineIds.length} 个分支</Text>
                {node.branchedTimelineIds.map((id, idx) => (
                  <Tag key={id} color="purple" style={{ margin: 0, fontSize: 11 }}>
                    分支 {idx + 1}
                  </Tag>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  )
}

interface TimelinePreviewProps {
  timelineId: string
  onClose: () => void
  onEnterEditMode: () => void
}

function TimelinePreview({
  timelineId,
  onClose,
  onEnterEditMode
}: TimelinePreviewProps): JSX.Element {
  const { message } = App.useApp()

  const { currentTimeline, isLoading, loadTimeline, updateNodesOrder, updateNode } =
    useTimelineStore()
  const { openFile } = useEditorStore()
  const { exitFullscreen } = useUIStore()

  // 章节跳转处理
  const handleChapterClick = useCallback(
    async (path: string, title: string) => {
      try {
        await openFile(path, title)
        exitFullscreen()
      } catch (_error) {
        message.error('无法打开章节文件')
      }
    },
    [openFile, exitFullscreen, message]
  )

  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false)

  // 行内快速编辑状态
  const [editingField, setEditingField] = useState<{
    nodeId: string
    field: 'title' | 'description'
  } | null>(null)
  const [editValue, setEditValue] = useState('')

  // 导出用ref
  const contentRef = useRef<HTMLDivElement>(null)

  // 导出为图片
  const handleExportImage = useCallback(async () => {
    if (!contentRef.current) return
    try {
      const element = contentRef.current
      const canvas = document.createElement('canvas')
      const rect = element.getBoundingClientRect()
      const scale = 2
      canvas.width = rect.width * scale
      canvas.height = rect.height * scale
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(scale, scale)
      ctx.fillStyle =
        getComputedStyle(document.documentElement).getPropertyValue('--bg-primary').trim() ||
        NEUTRAL_COLORS.white
      ctx.fillRect(0, 0, rect.width, rect.height)

      const svgData = new XMLSerializer().serializeToString(
        new DOMParser().parseFromString(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${rect.width}" height="${rect.height}">
            <foreignObject width="100%" height="100%">
              <div xmlns="http://www.w3.org/1999/xhtml">${element.outerHTML}</div>
            </foreignObject>
          </svg>`,
          'image/svg+xml'
        ).documentElement
      )
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, rect.width, rect.height)
        URL.revokeObjectURL(url)
        const link = document.createElement('a')
        link.download = `${currentTimeline?.name || '时间线'}.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
        message.success('导出成功')
      }
      img.onerror = () => {
        URL.revokeObjectURL(url)
        message.error('导出失败，请尝试截图工具')
      }
      img.src = url
    } catch {
      message.error('导出失败')
    }
  }, [currentTimeline?.name, message])

  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)

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

  // 加载时间线数据
  useEffect(() => {
    loadTimeline(timelineId)
  }, [timelineId, loadTimeline])

  // 格式化时间信息
  const formatTimeInfo = useCallback((timeInfo: TimeInfo): string => {
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
  }, [])

  // 获取时间类型的图标
  const getTimeIcon = useCallback((format: string) => {
    switch (format) {
      case 'datetime':
        return <CalendarOutlined />
      case 'chapter':
        return <FileTextOutlined />
      default:
        return <TagOutlined />
    }
  }, [])

  // 按顺序排序节点 - 使用 useMemo 优化
  const sortedNodes: TimelineNode[] = useMemo(() => {
    return currentTimeline ? [...currentTimeline.nodes].sort((a, b) => a.order - b.order) : []
  }, [currentTimeline])

  // 因果连线相关
  const [nodePositions, setNodePositions] = useState<Map<string, DOMRect>>(new Map())

  const causalLines = useMemo(() => {
    const lines: Array<{ from: DOMRect; to: DOMRect; label?: string }> = []
    for (const node of sortedNodes) {
      if (!node.causalLinks || node.causalLinks.length === 0) continue
      const fromRect = nodePositions.get(node.id)
      if (!fromRect) continue
      for (const link of node.causalLinks) {
        const toRect = nodePositions.get(link.targetId)
        if (!toRect) continue
        lines.push({ from: fromRect, to: toRect, label: link.label })
      }
    }
    return lines
  }, [sortedNodes, nodePositions])

  useEffect(() => {
    if (!contentRef.current) return
    const containerRect = contentRef.current.getBoundingClientRect()
    const positions = new Map<string, DOMRect>()
    for (const node of sortedNodes) {
      const el = contentRef.current.querySelector(`[data-node-id="${node.id}"]`)
      if (el) {
        const rect = el.getBoundingClientRect()
        positions.set(
          node.id,
          new DOMRect(
            rect.left - containerRect.left,
            rect.top - containerRect.top,
            rect.width,
            rect.height
          )
        )
      }
    }
    setNodePositions(positions)
  }, [sortedNodes, isEditMode])

  // 行内快速编辑处理
  const handleStartEdit = useCallback(
    (nodeId: string, field: 'title' | 'description') => {
      const node = sortedNodes.find(n => n.id === nodeId)
      if (node) {
        setEditingField({ nodeId, field })
        setEditValue(field === 'title' ? node.title : node.description || '')
      }
    },
    [sortedNodes]
  )

  const handleFinishEdit = useCallback(
    async (nodeId: string, field: 'title' | 'description', value: string) => {
      if (editingField?.nodeId === nodeId && editingField.field === field) {
        const trimmedValue = value.trim()
        if (field === 'title' && !trimmedValue) {
          message.warning('标题不能为空')
          setEditingField(null)
          return
        }
        const node = sortedNodes.find(n => n.id === nodeId)
        if (node) {
          const originalValue = field === 'title' ? node.title : node.description || ''
          if (trimmedValue !== originalValue) {
            await updateNode(nodeId, { [field]: trimmedValue })
            message.success('已更新')
          }
        }
      }
      setEditingField(null)
      setEditValue('')
    },
    [editingField, sortedNodes, updateNode, message]
  )

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = sortedNodes.findIndex(n => n.id === active.id)
        const newIndex = sortedNodes.findIndex(n => n.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // 创建新排序的节点数组
          const newNodes = arrayMove(sortedNodes, oldIndex, newIndex).map((node, index) => ({
            ...node,
            order: index
          }))

          // 调用 updateNodesOrder 更新顺序
          try {
            await updateNodesOrder(newNodes)
          } catch (error) {
            console.error('Failed to update nodes order:', error)
            message.error('排序失败')
          }
        }
      }

      setActiveId(null)
    },
    [sortedNodes, updateNodesOrder, message]
  )

  // 当前拖拽的节点
  const activeNode = activeId ? sortedNodes.find(n => n.id === activeId) : null

  // 切换编辑模式
  const toggleEditMode = useCallback((): void => {
    setIsEditMode(prev => !prev)
  }, [])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spin />
        </div>
      </div>
    )
  }

  if (!currentTimeline) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <Empty description="时间线不存在" />
          <Button onClick={onClose}>返回列表</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={onClose}>
            返回
          </Button>
          <div className={styles.title}>
            <Title level={5} style={{ margin: 0 }}>
              {currentTimeline.name}
            </Title>
            {currentTimeline.branchInfo.type === 'branch' && (
              <Tag color="blue" icon={<BranchesOutlined />}>
                分支
              </Tag>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isEditMode && (
            <Button icon={<CheckOutlined />} onClick={toggleEditMode}>
              完成排序
            </Button>
          )}
          {!isEditMode && (
            <Button icon={<HolderOutlined />} onClick={toggleEditMode}>
              排序
            </Button>
          )}
          <Button type="primary" icon={<EditOutlined />} onClick={onEnterEditMode}>
            编辑
          </Button>
          <Button icon={<CameraOutlined />} onClick={handleExportImage}>
            导出图片
          </Button>
        </div>
      </div>

      {/* 编辑模式提示 */}
      {isEditMode && (
        <div className={styles.editModeHint}>
          <HolderOutlined />
          <Text>拖拽节点左侧的手柄调整顺序</Text>
        </div>
      )}

      {/* 描述 */}
      {currentTimeline.description && (
        <div className={styles.description}>{currentTimeline.description}</div>
      )}

      {/* 时间线主体 */}
      <div className={styles.content} ref={contentRef} style={{ position: 'relative' }}>
        {causalLines.length > 0 && (
          <svg
            className={styles.causalSvg}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 1
            }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="8"
                markerHeight="6"
                refX="8"
                refY="3"
                orient="auto"
              >
                <polygon points="0 0, 8 3, 0 6" fill={THEME_COLORS.purple} />
              </marker>
            </defs>
            {causalLines.map((line, idx) => {
              const fromX = line.from.left + line.from.width / 2
              const fromY = line.from.top + line.from.height
              const toX = line.to.left + line.to.width / 2
              const toY = line.to.top
              const midY = (fromY + toY) / 2
              return (
                <g key={idx}>
                  <path
                    d={`M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`}
                    stroke={THEME_COLORS.purple}
                    strokeWidth="2"
                    strokeDasharray="6 3"
                    fill="none"
                    markerEnd="url(#arrowhead)"
                    opacity="0.6"
                  />
                  {line.label && (
                    <text
                      x={(fromX + toX) / 2}
                      y={midY}
                      textAnchor="middle"
                      fill={THEME_COLORS.purple}
                      fontSize="11"
                      opacity="0.8"
                    >
                      {line.label}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        )}
        {sortedNodes.length === 0 ? (
          <div className={styles.emptyNodes}>
            <ClockCircleOutlined className={styles.emptyIcon} />
            <Text type="secondary">暂无节点，点击编辑添加</Text>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedNodes.map(n => n.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className={styles.timeline}>
                {sortedNodes.map((node, index) => (
                  <SortableTimelineItem
                    key={node.id}
                    node={node}
                    index={index}
                    totalCount={sortedNodes.length}
                    isEditMode={isEditMode}
                    editingField={editingField}
                    onStartEdit={handleStartEdit}
                    onFinishEdit={handleFinishEdit}
                    onEditChange={setEditValue}
                    editValue={editValue}
                    onChapterClick={handleChapterClick}
                    formatTimeInfo={formatTimeInfo}
                    getTimeIcon={getTimeIcon}
                  />
                ))}
              </div>
            </SortableContext>

            {/* 拖拽覆盖层 */}
            <DragOverlay>
              {activeNode ? (
                <div className={styles.dragOverlay}>
                  <div className={styles.nodeHeader}>
                    <Text strong className={styles.nodeTitle}>
                      {activeNode.title}
                    </Text>
                    {activeNode.timeInfo && (
                      <div className={styles.nodeTime}>
                        {getTimeIcon(activeNode.timeInfo.format)}
                        <Text type="secondary">{formatTimeInfo(activeNode.timeInfo)}</Text>
                      </div>
                    )}
                  </div>
                  {activeNode.description && (
                    <div className={styles.nodeDescription}>{activeNode.description}</div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}

export default TimelinePreview
