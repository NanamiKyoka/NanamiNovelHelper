import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { useBadgeConfigStore } from '@stores/badgeConfigStore'
import { type BadgeType } from '@types/badge'
import styles from './DraggableBadgeContainer.module.css'

// 长按时间阈值（毫秒）
const LONG_PRESS_THRESHOLD = 300

interface BadgeItem {
  id: BadgeType
  content: ReactNode  // 徽章内容（可以是任意 React 节点）
}

interface DraggableBadgeContainerProps {
  badges: BadgeItem[]
}

function DraggableBadgeContainer({ badges }: DraggableBadgeContainerProps): JSX.Element {
  const { badgeOrder, moveBadge, loadConfig, isLoaded } = useBadgeConfigStore()
  
  // 使用 ref 跟踪拖动状态，避免闭包问题
  const isDraggingRef = useRef(false)
  const draggedIndexRef = useRef<number | null>(null)
  const dragOverIndexRef = useRef<number | null>(null)
  
  // UI 状态（用于渲染）
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 加载配置
  useEffect(() => {
    if (!isLoaded) {
      loadConfig()
    }
  }, [isLoaded, loadConfig])

  // 按 badgeOrder 排序 badges
  const sortedBadges = [...badges].sort((a, b) => {
    const indexA = badgeOrder.indexOf(a.id)
    const indexB = badgeOrder.indexOf(b.id)
    return indexA - indexB
  })

  // 清除长按计时器
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  // 更新拖动目标
  const updateDragOver = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current || !containerRef.current) return
    
    const element = document.elementFromPoint(clientX, clientY)
    const badgeElements = containerRef.current.querySelectorAll('[data-badge-index]')
    
    badgeElements.forEach((el, idx) => {
      if (el === element || el.contains(element)) {
        if (dragOverIndexRef.current !== idx) {
          dragOverIndexRef.current = idx
          setDragOverIndex(idx)
        }
      }
    })
  }, [])

  // 完成拖动
  const finishDrag = useCallback(() => {
    clearLongPressTimer()
    
    if (isDraggingRef.current && 
        draggedIndexRef.current !== null && 
        dragOverIndexRef.current !== null && 
        draggedIndexRef.current !== dragOverIndexRef.current) {
      moveBadge(draggedIndexRef.current, dragOverIndexRef.current)
    }

    // 重置所有状态
    isDraggingRef.current = false
    draggedIndexRef.current = null
    dragOverIndexRef.current = null
    
    setIsDragging(false)
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [clearLongPressTimer, moveBadge])

  // 开始长按检测
  const startLongPressDetection = useCallback((index: number) => {
    clearLongPressTimer()
    
    longPressTimerRef.current = setTimeout(() => {
      // 设置 ref 和 state
      isDraggingRef.current = true
      draggedIndexRef.current = index
      
      setIsDragging(true)
      setDraggedIndex(index)
    }, LONG_PRESS_THRESHOLD)
  }, [clearLongPressTimer])

  // 处理触摸开始
  const handleTouchStart = useCallback((e: React.TouchEvent, index: number) => {
    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    startLongPressDetection(index)
  }, [startLongPressDetection])

  // 处理触摸移动
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y)

    // 移动超过阈值则取消长按（在拖动开始前）
    if (!isDraggingRef.current && (deltaX > 10 || deltaY > 10)) {
      clearLongPressTimer()
      touchStartPosRef.current = null
      return
    }

    // 如果正在拖动，更新拖动目标
    if (isDraggingRef.current) {
      updateDragOver(touch.clientX, touch.clientY)
    }
  }, [clearLongPressTimer, updateDragOver])

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    touchStartPosRef.current = null
    finishDrag()
  }, [finishDrag])

  // 处理鼠标按下
  const handleMouseDown = useCallback((e: React.MouseEvent, index: number) => {
    // 只响应左键
    if (e.button !== 0) return
    
    e.preventDefault()
    startLongPressDetection(index)
    
    // 注册全局事件
    const handleGlobalMouseMove = (moveEvent: MouseEvent): void => {
      updateDragOver(moveEvent.clientX, moveEvent.clientY)
    }

    const handleGlobalMouseUp = (): void => {
      finishDrag()
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [startLongPressDetection, updateDragOver, finishDrag])

  return (
    <div 
      ref={containerRef}
      className={`${styles.container} ${isDragging ? styles.dragging : ''}`}
    >
      {sortedBadges.map((badge, index) => {
        const isBeingDragged = isDragging && draggedIndex === index
        const isDragOver = isDragging && dragOverIndex === index && draggedIndex !== index
        
        return (
          <div
            key={badge.id}
            data-badge-index={index}
            className={`
              ${styles.badgeWrapper}
              ${isBeingDragged ? styles.dragged : ''}
              ${isDragOver ? styles.dragOver : ''}
            `}
            onTouchStart={(e) => handleTouchStart(e, index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={(e) => handleMouseDown(e, index)}
          >
            {badge.content}
          </div>
        )
      })}
      
      {isDragging && (
        <div className={styles.dragHint}>
          松开保存排序
        </div>
      )}
    </div>
  )
}

export default DraggableBadgeContainer