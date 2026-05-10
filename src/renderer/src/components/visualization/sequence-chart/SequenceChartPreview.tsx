/**
 * 事序图预览组件（只读模式）
 * 甘特图风格的时间事件管理预览
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button, Empty, Spin, Typography, theme, Tooltip, App } from 'antd'
import { EditOutlined, HolderOutlined, CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons'
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
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import type { SequenceEvent } from '@shared/sequence-chart'
import { BUILT_IN_EVENT_TYPES } from '@shared/sequence-chart'
import { getThemeColor } from '@utils/theme'
import { safeNumberToString, safeNumber, safeSubtract, safeAdd } from '@utils/number'
import styles from './SequenceChartPreview.module.css'

const { Title, Text } = Typography

interface SequenceChartPreviewProps {
  chartId: string
  onClose: () => void
  onEnterEditMode: () => void
}

// 可排序的事件行组件（左侧列表）
interface SortableEventRowProps {
  event: SequenceEvent
  index: number
  isEditMode: boolean
  getEventColor: (event: SequenceEvent) => string
}

function SortableEventRow({
  event,
  index,
  isEditMode,
  getEventColor
}: SortableEventRowProps): JSX.Element {
  const { token } = theme.useToken()

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
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
      className={`${styles.eventRowWrapper}${isEditMode ? ` ${styles.editing}` : ''}`}
    >
      <div className={styles.eventRow}>
        {/* 拖拽手柄 */}
        {isEditMode && (
          <div className={styles.dragHandle} {...attributes} {...listeners}>
            <HolderOutlined style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} />
          </div>
        )}
        <span className={styles.colIndex} style={{ color: token.colorTextSecondary }}>
          {index + 1}
        </span>
        <span className={styles.colTitle}>
          <span
            className={styles.eventColorDot}
            style={{ backgroundColor: getEventColor(event) }}
          />
          <span className={styles.eventTitleText}>{event.title}</span>
        </span>
      </div>
    </div>
  )
}

function SequenceChartPreview({
  chartId,
  onClose,
  onEnterEditMode
}: SequenceChartPreviewProps): JSX.Element {
  const { message } = App.useApp()

  const { currentChart, isLoading, loadChart, moveEvent } = useSequenceChartStore()

  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const eventListBodyRef = useRef<HTMLDivElement>(null)

  // 编辑模式状态
  const [isEditMode, setIsEditMode] = useState(false)

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

  // 加载数据
  useEffect(() => {
    loadChart(chartId)
  }, [chartId, loadChart])

  // 获取事件类型列表
  const eventTypes = useMemo(() => {
    return currentChart
      ? [...BUILT_IN_EVENT_TYPES, ...(currentChart.customEventTypes || [])]
      : BUILT_IN_EVENT_TYPES
  }, [currentChart])

  // 获取事件类型颜色
  const getEventColor = useCallback(
    (event: SequenceEvent): string => {
      if (event.color) return event.color
      const type = eventTypes.find(t => t.id === event.eventTypeId)
      return type?.color || getThemeColor('--color-primary')
    },
    [eventTypes]
  )

  // 计算单元格位置
  const cellWidth = 40

  // 计算时间轴范围
  const timeRange = useMemo(() => {
    if (!currentChart?.events?.length) {
      return { minCell: 1, maxCell: 50 }
    }

    let maxCell = 50
    currentChart.events.forEach(event => {
      const cellEnd = safeNumber(event.timeInfo?.cellEnd, 0)
      if (cellEnd > maxCell) {
        maxCell = cellEnd
      }
    })

    return { minCell: 1, maxCell: safeAdd(maxCell, 10, 60) }
  }, [currentChart])

  // 按 order 排序的事件（用于拖拽排序）
  const sortedEvents = useMemo(() => {
    if (!currentChart?.events) return []
    return [...currentChart.events].sort((a, b) => a.order - b.order)
  }, [currentChart])

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])

  // 拖拽结束
  const handleDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = sortedEvents.findIndex(e => e.id === active.id)
        const newIndex = sortedEvents.findIndex(e => e.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // 创建新排序的事件数组
          const newEvents = arrayMove(sortedEvents, oldIndex, newIndex).map((evt, index) => ({
            ...evt,
            order: index
          }))

          // 调用 moveEvent 更新顺序
          try {
            // 使用第一个需要移动的事件来触发后端更新
            const movedEvent = newEvents.find(e => e.id === active.id)
            if (movedEvent) {
              await moveEvent(movedEvent.id, newIndex)
            }
          } catch (error) {
            console.error('Failed to update events order:', error)
            message.error('排序失败')
          }
        }
      }

      setActiveId(null)
    },
    [sortedEvents, moveEvent, message]
  )

  // 当前拖拽的事件
  const activeEvent = activeId ? sortedEvents.find(e => e.id === activeId) : null

  // 切换编辑模式
  const toggleEditMode = useCallback((): void => {
    setIsEditMode(prev => !prev)
  }, [])

  // 同步滚动：左侧事件列表和右侧时间轴垂直滚动同步
  const handleTimelineScroll = useCallback((_e: React.UIEvent<HTMLDivElement>) => {
    if (eventListBodyRef.current && timelineBodyRef.current) {
      eventListBodyRef.current.scrollTop = timelineBodyRef.current.scrollTop
    }
  }, [])

  const handleEventListScroll = useCallback((_e: React.UIEvent<HTMLDivElement>) => {
    if (eventListBodyRef.current && timelineBodyRef.current) {
      timelineBodyRef.current.scrollTop = eventListBodyRef.current.scrollTop
    }
  }, [])

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!currentChart) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Empty description="事序图不存在" />
          <Button onClick={onClose}>返回列表</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 顶部工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button icon={<ArrowLeftOutlined />} onClick={onClose}>
            返回
          </Button>
          <Title level={5} className={styles.title}>
            {currentChart.name}
          </Title>
        </div>
        <div className={styles.toolbarRight}>
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
        </div>
      </div>

      {/* 编辑模式提示 */}
      {isEditMode && (
        <div className={styles.editModeHint}>
          <HolderOutlined />
          <Text>拖拽事件左侧的手柄调整顺序</Text>
        </div>
      )}

      {/* 主内容区 */}
      <div className={styles.main}>
        {/* 左侧事件列表 */}
        <div className={styles.eventList}>
          <div className={styles.eventListHeader}>
            <span className={styles.colIndex}>#</span>
            <span className={styles.colTitle}>事件</span>
          </div>
          <div
            className={styles.eventListBody}
            ref={eventListBodyRef}
            onScroll={handleEventListScroll}
          >
            {sortedEvents.length === 0 ? (
              <div className={styles.emptyList}>暂无事件</div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sortedEvents.map(e => e.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {sortedEvents.map((event, index) => (
                    <SortableEventRow
                      key={event.id}
                      event={event}
                      index={index}
                      isEditMode={isEditMode}
                      getEventColor={getEventColor}
                    />
                  ))}
                </SortableContext>

                {/* 拖拽覆盖层 */}
                <DragOverlay>
                  {activeEvent ? (
                    <div className={styles.dragOverlay}>
                      <span
                        className={styles.eventColorDot}
                        style={{ backgroundColor: getEventColor(activeEvent) }}
                      />
                      <span className={styles.eventTitleText}>{activeEvent.title}</span>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </div>

        {/* 右侧时间轴 */}
        <div className={styles.timeline}>
          <div
            className={styles.timelineBody}
            ref={timelineBodyRef}
            onScroll={handleTimelineScroll}
          >
            {/* 时间轴标签 - 放入可滚动容器内 */}
            <div className={styles.timelineHeader}>
              <div
                className={styles.timelineLabels}
                style={{ width: safeAdd(safeSubtract(timeRange.maxCell, timeRange.minCell), 1) * cellWidth }}
              >
                {Array.from({ length: safeAdd(safeSubtract(timeRange.maxCell, timeRange.minCell), 1) }, (_, i) => (
                  <div key={i} className={styles.timelineLabel} style={{ width: cellWidth }}>
                    {safeAdd(timeRange.minCell, i)}
                  </div>
                ))}
              </div>
            </div>
            <div
              className={styles.timelineGrid}
              style={{ width: safeAdd(safeSubtract(timeRange.maxCell, timeRange.minCell), 1) * cellWidth }}
            >
              {/* 渲染事件行 */}
              {sortedEvents.map(event => {
                const color = getEventColor(event)
                const startCell = safeSubtract(safeNumber(event.timeInfo?.cellStart, 1), timeRange.minCell)
                const endCell = safeSubtract(safeNumber(event.timeInfo?.cellEnd, 10), timeRange.minCell)
                const left = startCell * cellWidth
                const width = safeAdd(safeSubtract(endCell, startCell), 1) * cellWidth

                return (
                  <div key={event.id} className={styles.timelineRow}>
                    {/* 网格线 */}
                    {Array.from({ length: safeAdd(safeSubtract(timeRange.maxCell, timeRange.minCell), 1) }, (_, i) => (
                      <div
                        key={i}
                        className={styles.timelineCell}
                        style={{ left: i * cellWidth, width: cellWidth }}
                      />
                    ))}
                    {/* 事件条 */}
                    <Tooltip
                      title={`${event.title} (${safeNumberToString(event.timeInfo?.cellStart)}-${safeNumberToString(event.timeInfo?.cellEnd)})`}
                    >
                      <div
                        className={styles.eventBar}
                        style={{
                          left,
                          width: Math.max(width - 4, 20),
                          backgroundColor: color
                        }}
                      >
                        <span className={styles.eventBarText}>{event.title}</span>
                      </div>
                    </Tooltip>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 底部统计 */}
      <div className={styles.statsBar}>
        <span>事件数: {currentChart.events?.length || 0}</span>
        <span>时间跨度: {safeAdd(safeSubtract(timeRange.maxCell, timeRange.minCell), 1)} 格</span>
      </div>
    </div>
  )
}

export default SequenceChartPreview
