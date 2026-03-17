/**
 * 事序图预览组件（只读模式）
 * 甘特图风格的时间事件管理预览
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Button, Empty, Spin, Typography, theme, Tooltip, App } from 'antd'
import { EditOutlined } from '@ant-design/icons'
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import type { SequenceEvent, SequenceEventType } from '@types/sequence-chart'
import styles from './SequenceChartPreview.module.css'

const { Title } = Typography

interface SequenceChartPreviewProps {
  chartId: string
  onClose: () => void
  onEnterEditMode: () => void
}

// 内置事件类型
const BUILT_IN_EVENT_TYPES: SequenceEventType[] = [
  { id: 'battle', name: '战斗', color: '#ff4d4f', isBuiltIn: true, order: 0 },
  { id: 'dialogue', name: '对话', color: '#1890ff', isBuiltIn: true, order: 1 },
  { id: 'travel', name: '旅行', color: '#52c41a', isBuiltIn: true, order: 2 },
  { id: 'romance', name: '感情', color: '#eb2f96', isBuiltIn: true, order: 3 },
  { id: 'mystery', name: '悬疑', color: '#722ed1', isBuiltIn: true, order: 4 },
  { id: 'daily', name: '日常', color: '#faad14', isBuiltIn: true, order: 5 },
  { id: 'conflict', name: '冲突', color: '#fa541c', isBuiltIn: true, order: 6 },
  { id: 'revelation', name: '揭秘', color: '#13c2c2', isBuiltIn: true, order: 7 },
  { id: 'death', name: '死亡', color: '#595959', isBuiltIn: true, order: 8 },
  { id: 'other', name: '其他', color: '#8c8c8c', isBuiltIn: true, order: 9 },
]

function SequenceChartPreview({
  chartId,
  onClose,
  onEnterEditMode,
}: SequenceChartPreviewProps): JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()

  const {
    currentChart,
    isLoading,
    loadChart,
  } = useSequenceChartStore()

  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const eventListBodyRef = useRef<HTMLDivElement>(null)

  // 加载数据
  useEffect(() => {
    loadChart(chartId)
  }, [chartId, loadChart])

  // 获取事件类型列表
  const eventTypes = useMemo(() => {
    return currentChart ? [...BUILT_IN_EVENT_TYPES, ...(currentChart.customEventTypes || [])] : BUILT_IN_EVENT_TYPES
  }, [currentChart])

  // 获取事件类型颜色
  const getEventColor = useCallback((event: SequenceEvent): string => {
    if (event.color) return event.color
    const type = eventTypes.find(t => t.id === event.eventTypeId)
    return type?.color || '#1890ff'
  }, [eventTypes])

  // 计算单元格位置
  const cellWidth = 40

  // 计算时间轴范围
  const timeRange = useMemo(() => {
    if (!currentChart?.events.length) {
      return { minCell: 1, maxCell: 50 }
    }
    
    let maxCell = 50
    currentChart.events.forEach(event => {
      if (event.timeInfo.cellEnd > maxCell) {
        maxCell = event.timeInfo.cellEnd
      }
    })
    
    return { minCell: 1, maxCell: maxCell + 10 }
  }, [currentChart])

  // 按起始位置排序的事件
  const sortedEvents = useMemo(() => {
    if (!currentChart?.events) return []
    return [...currentChart.events].sort((a, b) => {
      const aStart = a.timeInfo.cellStart || 1
      const bStart = b.timeInfo.cellStart || 1
      return aStart - bStart
    })
  }, [currentChart])

  // 同步滚动：左侧事件列表和右侧时间轴垂直滚动同步
  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (eventListBodyRef.current && timelineBodyRef.current) {
      eventListBodyRef.current.scrollTop = timelineBodyRef.current.scrollTop
    }
  }, [])

  const handleEventListScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
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
          <Button onClick={onClose}>返回</Button>
          <Title level={5} className={styles.title}>{currentChart.name}</Title>
        </div>
        <div className={styles.toolbarRight}>
          <Button type="primary" icon={<EditOutlined />} onClick={onEnterEditMode}>
            编辑
          </Button>
        </div>
      </div>

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
            {sortedEvents.map((event, index) => (
              <div key={event.id} className={styles.eventRow}>
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
            ))}
            {sortedEvents.length === 0 && (
              <div className={styles.emptyList}>
                暂无事件
              </div>
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
              <div className={styles.timelineLabels} style={{ width: (timeRange.maxCell - timeRange.minCell + 1) * cellWidth }}>
                {Array.from({ length: timeRange.maxCell - timeRange.minCell + 1 }, (_, i) => (
                  <div
                    key={i}
                    className={styles.timelineLabel}
                    style={{ width: cellWidth }}
                  >
                    {timeRange.minCell + i}
                  </div>
                ))}
              </div>
            </div>
            <div
              className={styles.timelineGrid}
              style={{ width: (timeRange.maxCell - timeRange.minCell + 1) * cellWidth }}
            >
              {/* 渲染事件行 */}
              {sortedEvents.map((event) => {
                const color = getEventColor(event)
                const startCell = (event.timeInfo.cellStart || 1) - timeRange.minCell
                const endCell = (event.timeInfo.cellEnd || 10) - timeRange.minCell
                const left = startCell * cellWidth
                const width = (endCell - startCell + 1) * cellWidth

                return (
                  <div key={event.id} className={styles.timelineRow}>
                    {/* 网格线 */}
                    {Array.from({ length: timeRange.maxCell - timeRange.minCell + 1 }, (_, i) => (
                      <div
                        key={i}
                        className={styles.timelineCell}
                        style={{ left: i * cellWidth, width: cellWidth }}
                      />
                    ))}
                    {/* 事件条 */}
                    <Tooltip title={`${event.title} (${event.timeInfo.cellStart}-${event.timeInfo.cellEnd})`}>
                      <div
                        className={styles.eventBar}
                        style={{
                          left,
                          width: Math.max(width - 4, 20),
                          backgroundColor: color,
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
        <span>事件数: {currentChart.events.length}</span>
        <span>时间跨度: {timeRange.maxCell - timeRange.minCell + 1} 格</span>
      </div>
    </div>
  )
}

export default SequenceChartPreview
