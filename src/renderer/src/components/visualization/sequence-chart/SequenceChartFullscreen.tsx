/**
 * 事序图全屏编辑器
 * 51mazi 风格的甘特图时间事件管理编辑器
 * 支持：拖动移动事件、拖动边缘调整时长、拖拽排序事件行
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  Button,
  Input,
  Slider,
  Modal,
  Spin,
  App,
  Tooltip,
  InputNumber,
  Dropdown,
  ColorPicker,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  LeftOutlined,
  RightOutlined,
  ExpandOutlined,
  EditOutlined,
  SearchOutlined,
  UndoOutlined,
  RedoOutlined,
} from '@ant-design/icons'
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import { useUIStore } from '@stores/uiStore'
import type { SequenceEvent } from '@shared/sequence-chart'
import styles from './SequenceChartFullscreen.module.css'

const { TextArea } = Input

interface SequenceChartFullscreenProps {
  chartId: string
  onBack: () => void
}

// 拖拽类型
type DragType = 'move' | 'resize-left' | 'resize-right' | null

function SequenceChartFullscreen({ chartId, onBack }: SequenceChartFullscreenProps): JSX.Element {
  const { message } = App.useApp()

  const {
    currentChart,
    isLoading,
    leftPanelCollapsed,
    loadChart,
    addEvent,
    updateEvent,
    deleteEvent,
    updateEventTime,
    updateAxisConfig,
    toggleLeftPanel,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useSequenceChartStore()
  
  const setFullscreenMode = useUIStore((state) => state.setFullscreenMode)
  const exitFullscreen = useUIStore((state) => state.exitFullscreen)

  // 设置全屏模式，卸载时退出
  useEffect(() => {
    setFullscreenMode('sequenceChart')
    return () => exitFullscreen()
  }, [setFullscreenMode, exitFullscreen])

  // 加载数据
  useEffect(() => {
    loadChart(chartId)
  }, [chartId, loadChart])

  // 左右面板垂直滚动同步
  useEffect(() => {
    const leftEl = leftContentRef.current
    const rightEl = timelineBodyRef.current
    if (!leftEl || !rightEl) return

    const syncLeftToRight = () => {
      if (isSyncingScroll.current) return
      isSyncingScroll.current = true
      rightEl.scrollTop = leftEl.scrollTop
      isSyncingScroll.current = false
    }

    const syncRightToLeft = () => {
      if (isSyncingScroll.current) return
      isSyncingScroll.current = true
      leftEl.scrollTop = rightEl.scrollTop
      isSyncingScroll.current = false
    }

    leftEl.addEventListener('scroll', syncLeftToRight)
    rightEl.addEventListener('scroll', syncRightToLeft)
    return () => {
      leftEl.removeEventListener('scroll', syncLeftToRight)
      rightEl.removeEventListener('scroll', syncRightToLeft)
    }
  }, [currentChart])

  // 弹窗状态
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [expandModalVisible, setExpandModalVisible] = useState(false)
  const [editingEvent, setEditingEvent] = useState<SequenceEvent | null>(null)

  // 新事件表单
  const [newEventTitle, setNewEventTitle] = useState('')
  const [newEventDescription, setNewEventDescription] = useState('')
  const [newEventStart, setNewEventStart] = useState(1)
  const [newEventEnd, setNewEventEnd] = useState(3)
  const [newEventProgress, setNewEventProgress] = useState(0)
  const [newEventColor, setNewEventColor] = useState('#409EFF')
  const [expandCellCount, setExpandCellCount] = useState(100)
  const [editingLabelPos, setEditingLabelPos] = useState<number | null>(null)
  const [editingLabelText, setEditingLabelText] = useState('')

  // 拖拽状态
  const [dragType, setDragType] = useState<DragType>(null)
  const [draggingEvent, setDraggingEvent] = useState<SequenceEvent | null>(null)
  const [eventSearchKeyword, setEventSearchKeyword] = useState('')
  const [dragStartX, setDragStartX] = useState(0)
  const [originalStart, setOriginalStart] = useState(1)
  const [originalEnd, setOriginalEnd] = useState(10)
  const [hasMoved, setHasMoved] = useState(false)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    type: 'event' | 'cell' | null
    targetId: string | null
    cellIndex?: number
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    targetId: null,
  })

  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const leftContentRef = useRef<HTMLDivElement>(null)
  const isSyncingScroll = useRef(false)
  const cellWidth = 40

  // 添加事件
  const handleAddEvent = async () => {
    if (!newEventTitle.trim()) {
      message.warning('请输入事件简介')
      return
    }
    const result = await addEvent({
      title: newEventTitle.trim(),
      description: newEventDescription,
      timeInfo: { cellStart: newEventStart, cellEnd: newEventEnd },
      progress: newEventProgress,
      color: newEventColor,
    })
    if (result) {
      message.success('添加成功')
      setAddModalVisible(false)
      resetAddForm()
    }
  }

  const resetAddForm = () => {
    setNewEventTitle('')
    setNewEventDescription('')
    setNewEventStart(1)
    setNewEventEnd(3)
    setNewEventProgress(0)
    setNewEventColor('#409EFF')
  }

  // 双击网格空白区域快速添加事件
  const handleGridDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left + (timelineBodyRef.current?.scrollLeft || 0)
    const cellIndex = Math.floor(x / cellWidth) + 1
    const maxCell = currentChart?.axisConfig.initialCellCount || 50
    if (cellIndex < 1 || cellIndex > maxCell) return
    setNewEventStart(cellIndex)
    setNewEventEnd(Math.min(cellIndex + 2, maxCell))
    setNewEventTitle('')
    setNewEventDescription('')
    setNewEventProgress(0)
    setAddModalVisible(true)
  }, [currentChart])

  // 进度条拖拽调整
  const handleProgressDragStart = useCallback((e: React.MouseEvent, event: SequenceEvent) => {
    e.preventDefault()
    const trackEl = e.currentTarget as HTMLDivElement
    const updateProgress = (clientX: number) => {
      const rect = trackEl.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
      const newProgress = Math.round(ratio * 100)
      if (newProgress !== event.progress) {
        updateEvent(event.id, { progress: newProgress })
      }
    }
    const onMouseMove = (ev: MouseEvent) => updateProgress(ev.clientX)
    const onMouseUp = (ev: MouseEvent) => {
      updateProgress(ev.clientX)
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [updateEvent])

  // 更新事件
  const handleUpdateEvent = async () => {
    if (!editingEvent?.title.trim()) {
      message.warning('请输入事件简介')
      return
    }
    await updateEvent(editingEvent.id, {
      title: editingEvent.title.trim(),
      description: editingEvent.description,
      progress: editingEvent.progress,
      color: editingEvent.color,
    })
    setEditModalVisible(false)
    setEditingEvent(null)
    message.success('更新成功')
  }

  // 扩展单元格
  const handleExpandCells = async () => {
    if (!currentChart) return
    const currentCount = currentChart.axisConfig.initialCellCount
    const newTotal = currentCount + expandCellCount
    if (newTotal > currentChart.axisConfig.maxCellCount) {
      message.error(`超过最大限制 ${currentChart.axisConfig.maxCellCount}`)
      return
    }
    await updateAxisConfig({ initialCellCount: newTotal })
    setExpandModalVisible(false)
    setExpandCellCount(100)
    message.success(`扩展到 ${newTotal} 格`)
  }

  // 标签编辑
  const handleLabelDoubleClick = useCallback((position: number) => {
    const existing = currentChart?.axisConfig.timeLabels?.find(l => l.position === position)
    setEditingLabelPos(position)
    setEditingLabelText(existing?.label || '')
  }, [currentChart?.axisConfig.timeLabels])

  const handleLabelSave = useCallback(async () => {
    if (editingLabelPos === null || !currentChart) return
    const existingLabels = currentChart.axisConfig.timeLabels || []
    let newLabels: Array<{ position: number; label: string }>
    if (editingLabelText.trim() === '') {
      newLabels = existingLabels.filter(l => l.position !== editingLabelPos)
    } else {
      const idx = existingLabels.findIndex(l => l.position === editingLabelPos)
      if (idx >= 0) {
        newLabels = [...existingLabels]
        newLabels[idx] = { position: editingLabelPos, label: editingLabelText.trim() }
      } else {
        newLabels = [...existingLabels, { position: editingLabelPos, label: editingLabelText.trim() }]
      }
    }
    await updateAxisConfig({ timeLabels: newLabels })
    setEditingLabelPos(null)
    setEditingLabelText('')
  }, [editingLabelPos, editingLabelText, currentChart, updateAxisConfig])

  // 开始拖拽
  const startDrag = useCallback((e: React.MouseEvent, event: SequenceEvent, type: DragType) => {
    e.preventDefault()
    e.stopPropagation()
    setDragType(type)
    setDraggingEvent({ ...event })
    setDragStartX(e.clientX)
    setOriginalStart(event.timeInfo.cellStart || 1)
    setOriginalEnd(event.timeInfo.cellEnd || 10)
    setHasMoved(false)
  }, [])

  // 处理拖拽
  useEffect(() => {
    if (!dragType || !draggingEvent) return

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX
      if (Math.abs(deltaX) < 3) return
      setHasMoved(true)

      const deltaCells = Math.round(deltaX / cellWidth)
      const maxCell = currentChart?.axisConfig.initialCellCount || 100

      let newStart = originalStart
      let newEnd = originalEnd

      if (dragType === 'move') {
        // 整体移动，保持时长不变
        const duration = originalEnd - originalStart + 1
        newStart = Math.max(1, Math.min(maxCell - duration + 1, originalStart + deltaCells))
        newEnd = newStart + duration - 1
      } else if (dragType === 'resize-left') {
        // 拖动左边缘，调整起始位置
        newStart = Math.max(1, Math.min(originalEnd - 1, originalStart + deltaCells))
      } else if (dragType === 'resize-right') {
        // 拖动右边缘，调整结束位置
        newEnd = Math.max(originalStart + 1, Math.min(maxCell, originalEnd + deltaCells))
      }

      setDraggingEvent(prev => prev ? {
        ...prev,
        timeInfo: { ...prev.timeInfo, cellStart: newStart, cellEnd: newEnd }
      } : null)
    }

    const handleMouseUp = async () => {
      if (draggingEvent && hasMoved) {
        const newStart = draggingEvent.timeInfo.cellStart || 1
        const newEnd = draggingEvent.timeInfo.cellEnd || 10
        if (newStart !== originalStart || newEnd !== originalEnd) {
          await updateEventTime(draggingEvent.id, newStart, newEnd)
          message.success(`事件调整为 ${newStart}-${newEnd}`)
        }
      }
      setDragType(null)
      setDraggingEvent(null)
      setHasMoved(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragType, draggingEvent, dragStartX, originalStart, originalEnd, hasMoved, currentChart, cellWidth, updateEventTime, message])

  // 获取事件条样式
  const getEventBarStyle = useCallback((event: SequenceEvent, lane: number = 0): React.CSSProperties => {
    const start = event.timeInfo.cellStart || 1
    const end = event.timeInfo.cellEnd || 10
    const color = event.color || '#409EFF'
    return {
      left: `${(start - 1) * cellWidth}px`,
      width: `${(end - start + 1) * cellWidth}px`,
      top: `${2 + lane * 20}px`,
      height: lane > 0 ? '18px' : '36px',
      background: `linear-gradient(135deg, ${color} 0%, ${adjustBrightness(color, -20)} 100%)`,
    }
  }, [cellWidth])

  // 计算重叠事件的层级分配
  const eventLanes = useMemo(() => {
    if (!currentChart) return new Map<string, number>()
    const lanes = new Map<string, number>()
    const sorted = [...currentChart.events].sort((a, b) => {
      const aStart = a.timeInfo.cellStart || 1
      const bStart = b.timeInfo.cellStart || 1
      return aStart - bStart || (a.timeInfo.cellEnd || 1) - (b.timeInfo.cellEnd || 1)
    })
    const laneEnds: number[] = []

    for (const event of sorted) {
      const start = event.timeInfo.cellStart || 1
      let assignedLane = -1
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] < start) {
          assignedLane = i
          break
        }
      }
      if (assignedLane === -1) {
        assignedLane = laneEnds.length
        laneEnds.push(0)
      }
      lanes.set(event.id, assignedLane)
      laneEnds[assignedLane] = event.timeInfo.cellEnd || 1
    }

    return lanes
  }, [currentChart])

  // 调整颜色亮度
  const adjustBrightness = (hex: string, percent: number): string => {
    const num = parseInt(hex.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = Math.min(255, Math.max(0, (num >> 16) + amt))
    const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00ff) + amt))
    const B = Math.min(255, Math.max(0, (num & 0x0000ff) + amt))
    return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)
  }

  // 右键菜单处理
  const handleEventContextMenu = (e: React.MouseEvent, event: SequenceEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'event',
      targetId: event.id,
    })
  }

  const handleCellContextMenu = (e: React.MouseEvent, cellIndex: number) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      type: 'cell',
      targetId: null,
      cellIndex,
    })
  }

  // 事件右键菜单项
  const getEventContextMenuItems = (eventId: string): MenuProps['items'] => [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑',
      onClick: () => {
        const event = currentChart?.events.find(e => e.id === eventId)
        if (event) {
          setEditingEvent(event)
          setEditModalVisible(true)
        }
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除',
      danger: true,
      onClick: async () => {
        await deleteEvent(eventId)
        setContextMenu(prev => ({ ...prev, visible: false }))
        message.success('删除成功')
      },
    },
  ]

  // 单元格右键菜单项
  const getCellContextMenuItems = (cellIndex: number): MenuProps['items'] => [
    {
      key: 'addEvent',
      icon: <PlusOutlined />,
      label: '在此处添加事件',
      onClick: () => {
        setNewEventStart(cellIndex + 1)
        setNewEventEnd(cellIndex + 3)
        setAddModalVisible(true)
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
  ]

  // 渲染时间轴标签（每格一个）
  const renderTimelineLabels = () => {
    const cellCount = currentChart?.axisConfig.initialCellCount || 100
    const timeLabels = currentChart?.axisConfig.timeLabels
    return Array.from({ length: cellCount }, (_, i) => {
      const position = i + 1
      const customLabel = timeLabels?.find(l => l.position === position)
      if (editingLabelPos === position) {
        return (
          <div key={position} className={styles.timeCell} style={{ width: cellWidth }}>
            <Input
              size="small"
              value={editingLabelText}
              onChange={e => setEditingLabelText(e.target.value)}
              onBlur={handleLabelSave}
              onPressEnter={handleLabelSave}
              autoFocus
              style={{ width: cellWidth - 8, fontSize: 11 }}
              placeholder={`${position}`}
            />
          </div>
        )
      }
      return (
        <Tooltip key={position} title="双击编辑标签">
          <div
            className={styles.timeCell}
            style={{ width: cellWidth, cursor: 'pointer' }}
            onDoubleClick={() => handleLabelDoubleClick(position)}
          >
            {customLabel ? customLabel.label : position}
          </div>
        </Tooltip>
      )
    })
  }

  // 渲染网格单元格
  const renderGridCells = () => {
    const cellCount = currentChart?.axisConfig.initialCellCount || 100
    return Array.from({ length: cellCount }, (_, i) => (
      <div
        key={i + 1}
        className={styles.gridCell}
        style={{ width: cellWidth }}
        onContextMenu={(e) => handleCellContextMenu(e, i)}
      />
    ))
  }

  if (isLoading) {
    return <div className={styles.container}><div className={styles.loading}><Spin size="large" /></div></div>
  }

  if (!currentChart) {
    return <div className={styles.container}><div className={styles.emptyState}><span>事序图不存在</span><Button onClick={onBack}>返回列表</Button></div></div>
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInputFocused = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
      if (isInputFocused) return

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            message.success('已自动保存')
            break
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
        }
      } else {
        switch (e.key) {
          case 'Escape':
            if (addModalVisible) {
              setAddModalVisible(false)
              resetAddForm()
            } else if (editModalVisible) {
              setEditModalVisible(false)
              setEditingEvent(null)
            } else if (expandModalVisible) {
              setExpandModalVisible(false)
            } else if (contextMenu.visible) {
              setContextMenu(prev => ({ ...prev, visible: false }))
            }
            break
          case 'Delete':
          case 'Backspace':
            if (editingEvent && editModalVisible) return
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [addModalVisible, editModalVisible, expandModalVisible, contextMenu.visible, editingEvent, message, undo, redo])

  // 合并拖拽中的实时状态
  const displayEvents = currentChart.events.map(e => 
    draggingEvent?.id === e.id ? draggingEvent : e
  )

  // 事件搜索过滤
  const filteredEvents = useMemo(() => {
    if (!eventSearchKeyword.trim()) return displayEvents
    const keyword = eventSearchKeyword.trim().toLowerCase()
    return displayEvents.filter(e =>
      e.title.toLowerCase().includes(keyword) ||
      (e.description && e.description.toLowerCase().includes(keyword))
    )
  }, [displayEvents, eventSearchKeyword])

  // 时间冲突检测
  const conflictEventIds = useMemo(() => {
    const conflicts = new Set<string>()
    const events = displayEvents
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i]
        const b = events[j]
        const aStart = a.timeInfo.cellStart
        const aEnd = a.timeInfo.cellEnd
        const bStart = b.timeInfo.cellStart
        const bEnd = b.timeInfo.cellEnd
        if (aStart <= bEnd && bStart <= aEnd) {
          conflicts.add(a.id)
          conflicts.add(b.id)
        }
      }
    }
    return conflicts
  }, [displayEvents])

  return (
    <div className={styles.container}>
      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
          <h3 className={styles.chartTitle}>{currentChart.name}</h3>
        </div>
        <div className={styles.toolbarRight}>
          <Button icon={<UndoOutlined />} disabled={!canUndo()} onClick={undo} />
          <Button icon={<RedoOutlined />} disabled={!canRedo()} onClick={redo} />
          <Input
            placeholder="搜索事件..."
            prefix={<SearchOutlined />}
            size="small"
            value={eventSearchKeyword}
            onChange={(e) => setEventSearchKeyword(e.target.value)}
            allowClear
            style={{ width: 160 }}
          />
          <Button icon={<ExpandOutlined />} onClick={() => setExpandModalVisible(true)}>扩展单元格</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalVisible(true)}>添加事件</Button>
        </div>
      </div>

      {/* 甘特图主体 */}
      <div className={styles.ganttTable}>
        <div className={styles.tableBody}>
          {/* 左侧事件列表 */}
          <div className={`${styles.tableLeft} ${leftPanelCollapsed ? styles.collapsed : ''}`}>
            <div className={styles.leftHeader}>
              <div className={styles.colIndex}>序号</div>
              <div className={styles.colIntro}>简介</div>
              <div className={styles.colProgress}>进度</div>
            </div>
            <div className={styles.leftContent} ref={leftContentRef}>
              {currentChart.events.length === 0 ? (
                <div className={styles.emptyEvents}>
                  <span>暂无事件</span>
                  <span>双击右侧网格或点击"添加事件"创建</span>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className={styles.emptyEvents}>
                  <span>未找到匹配事件</span>
                </div>
              ) : (
                filteredEvents.map(event => (
                  <div key={event.id} className={styles.eventRow}>
                    <div className={styles.colIndex}>{event.order + 1}</div>
                    <div className={styles.colIntro}>
                      <Tooltip title={event.title}><span className={styles.introText}>{event.title}</span></Tooltip>
                    </div>
                    <div className={styles.colProgress}>
                      <div
                        className={styles.progressTrack}
                        onMouseDown={(e) => handleProgressDragStart(e, event)}
                      >
                        <div className={styles.progressFill} style={{ width: `${event.progress}%` }} />
                        <span className={styles.progressLabel}>{event.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 切换按钮 */}
          <div className={styles.toggleButton} onClick={toggleLeftPanel}>
            {leftPanelCollapsed ? <RightOutlined /> : <LeftOutlined />}
          </div>

          {/* 右侧时间轴 */}
          <div className={styles.tableRight}>
            <div className={styles.rightContent} ref={timelineBodyRef}>
              {/* 时间标签行 */}
              <div className={styles.rightHeader}>{renderTimelineLabels()}</div>
              {/* 背景网格 */}
              <div className={styles.gridBackground} onDoubleClick={handleGridDoubleClick}>
                {filteredEvents.map(event => (
                  <div key={event.id} className={styles.gridRow}>{renderGridCells()}</div>
                ))}
              </div>

              {/* 事件条层 */}
              <div className={styles.eventsLayer}>
                {filteredEvents.map(event => (
                  <div key={event.id} className={styles.eventBarContainer} style={{ height: `${40 + (eventLanes.get(event.id) || 0) * 20}px` }}>
                    <Tooltip title={`${event.title} (${event.timeInfo.cellStart}-${event.timeInfo.cellEnd})${conflictEventIds.has(event.id) ? ' ⚠ 时间冲突' : ''}`} placement="top">
                      <div
                        className={`${styles.eventBar} ${draggingEvent?.id === event.id ? styles.dragging : ''} ${conflictEventIds.has(event.id) ? styles.conflict : ''}`}
                        style={getEventBarStyle(event, eventLanes.get(event.id) || 0)}
                        onContextMenu={(e) => handleEventContextMenu(e, event)}
                      >
                        {draggingEvent?.id === event.id && (
                          <div className={styles.dragHint}>
                            {event.timeInfo.cellStart} → {event.timeInfo.cellEnd}
                          </div>
                        )}
                        {/* 左边缘拖拽手柄 */}
                        <div
                          className={`${styles.resizeHandle} ${styles.resizeHandleLeft}`}
                          onMouseDown={(e) => startDrag(e, event, 'resize-left')}
                        />
                        {/* 进度条 */}
                        <div className={styles.eventProgress} style={{ width: `${event.progress}%` }} />
                        {/* 事件标签 */}
                        <span
                          className={styles.eventLabel}
                          onMouseDown={(e) => startDrag(e, event, 'move')}
                        >
                          {event.title}
                        </span>
                        {/* 右边缘拖拽手柄 */}
                        <div
                          className={`${styles.resizeHandle} ${styles.resizeHandleRight}`}
                          onMouseDown={(e) => startDrag(e, event, 'resize-right')}
                        />
                      </div>
                    </Tooltip>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 添加事件弹窗 */}
      <Modal title="添加事件" open={addModalVisible} onCancel={() => { setAddModalVisible(false); resetAddForm(); }} onOk={handleAddEvent} okText="添加" cancelText="取消" zIndex={10000}>
        <div className={styles.formItem}>
          <label className={styles.formLabel}>简介 *</label>
          <Input placeholder="事件简介" value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} maxLength={30} showCount />
        </div>
        <div className={styles.formItem}>
          <label className={styles.formLabel}>详情</label>
          <TextArea placeholder="事件详情" value={newEventDescription} onChange={e => setNewEventDescription(e.target.value)} rows={3} maxLength={200} showCount />
        </div>
        <div className={styles.formItem}>
          <label className={styles.formLabel}>进度</label>
          <Slider value={newEventProgress} onChange={setNewEventProgress} min={0} max={100} />
        </div>
        <div className={styles.formItem}>
          <label className={styles.formLabel}>颜色</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            {['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#722ed1', '#13c2c2', '#eb2f96'].map(c => (
              <div
                key={c}
                onClick={() => setNewEventColor(c)}
                style={{
                  width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer',
                  border: newEventColor === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                  boxShadow: newEventColor === c ? '0 0 4px rgba(0,0,0,0.3)' : 'none',
                }}
              />
            ))}
            <ColorPicker
              size="small"
              value={newEventColor}
              onChange={(color) => setNewEventColor(color.toHexString())}
            />
          </div>
        </div>
        <div className={styles.formItem}>
          <label className={styles.formLabel}>时间范围</label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <InputNumber min={1} max={currentChart.axisConfig.initialCellCount} value={newEventStart} onChange={v => setNewEventStart(v || 1)} />
            <span>至</span>
            <InputNumber min={newEventStart} max={currentChart.axisConfig.initialCellCount} value={newEventEnd} onChange={v => setNewEventEnd(v || newEventStart)} />
          </div>
          <div className={styles.formTip}>当前范围：{newEventEnd - newEventStart + 1} 格</div>
        </div>
      </Modal>

      {/* 编辑事件弹窗 */}
      <Modal
        title="编辑事件"
        open={editModalVisible}
        onCancel={() => { setEditModalVisible(false); setEditingEvent(null); }}
        footer={
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button onClick={() => setEditModalVisible(false)}>取消</Button>
            <Button type="primary" onClick={handleUpdateEvent}>保存</Button>
          </div>
        }
        zIndex={10000}
      >
        {editingEvent && (
          <>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>简介 *</label>
              <Input value={editingEvent.title} onChange={e => setEditingEvent({ ...editingEvent, title: e.target.value })} maxLength={30} showCount />
            </div>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>详情</label>
              <TextArea value={editingEvent.description || ''} onChange={e => setEditingEvent({ ...editingEvent, description: e.target.value })} rows={3} maxLength={200} showCount />
            </div>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>进度</label>
              <Slider value={editingEvent.progress} onChange={v => setEditingEvent({ ...editingEvent, progress: v })} min={0} max={100} />
            </div>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>时间范围</label>
              <div style={{ color: 'var(--text-secondary)' }}>
                {editingEvent.timeInfo.cellStart} - {editingEvent.timeInfo.cellEnd}（共 {editingEvent.timeInfo.cellEnd! - editingEvent.timeInfo.cellStart! + 1} 格）
              </div>
              <div className={styles.formTip}>提示：在时间轴上拖动事件条边缘可调整时间范围</div>
            </div>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>颜色</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399', '#722ed1', '#13c2c2', '#eb2f96'].map(c => (
                  <div
                    key={c}
                    onClick={() => setEditingEvent({ ...editingEvent, color: c })}
                    style={{
                      width: 24, height: 24, borderRadius: 4, background: c, cursor: 'pointer',
                      border: editingEvent.color === c ? '2px solid var(--text-primary)' : '2px solid transparent',
                      boxShadow: editingEvent.color === c ? '0 0 4px rgba(0,0,0,0.3)' : 'none',
                    }}
                  />
                ))}
                <ColorPicker
                  value={editingEvent.color || '#409EFF'}
                  onChange={(color) => setEditingEvent({ ...editingEvent, color: color.toHexString() })}
                  showText
                />
              </div>
            </div>
          </>
        )}
      </Modal>

      {/* 扩展单元格弹窗 */}
      <Modal title="扩展单元格数量" open={expandModalVisible} onCancel={() => setExpandModalVisible(false)} onOk={handleExpandCells} okText="确认" cancelText="取消" zIndex={10000}>
        <div className={styles.formItem}>
          <label className={styles.formLabel}>扩展数量</label>
          <InputNumber min={10} max={500} value={expandCellCount} onChange={v => setExpandCellCount(v || 100)} style={{ width: '100%' }} />
          <div className={styles.formTip}>
            当前：{currentChart.axisConfig.initialCellCount} 格 → 扩展后：{currentChart.axisConfig.initialCellCount + expandCellCount} 格
          </div>
        </div>
      </Modal>

      {/* 右键菜单 */}
      <Dropdown
        menu={{
          items: contextMenu.type === 'event' && contextMenu.targetId
            ? getEventContextMenuItems(contextMenu.targetId)
            : contextMenu.type === 'cell' && contextMenu.cellIndex !== undefined
              ? getCellContextMenuItems(contextMenu.cellIndex)
              : [],
        }}
        open={contextMenu.visible}
        onOpenChange={(open) => {
          if (!open) {
            setContextMenu(prev => ({ ...prev, visible: false }))
          }
        }}
        overlayStyle={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 10001,
        }}
      >
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }} />
      </Dropdown>
    </div>
  )
}

export default SequenceChartFullscreen