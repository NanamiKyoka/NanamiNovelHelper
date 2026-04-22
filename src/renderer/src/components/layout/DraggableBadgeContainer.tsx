import { useState, useRef, useCallback, useEffect, type ReactNode } from 'react'
import { useBadgeConfigStore } from '@stores/badgeConfigStore'
import { type BadgeType } from '@types/badge'
import styles from './DraggableBadgeContainer.module.css'

const LONG_PRESS_THRESHOLD = 300
const MOVE_CANCEL_THRESHOLD = 10

interface BadgeItem {
  id: BadgeType
  content: ReactNode
}

interface DragGhostPosition {
  x: number
  y: number
}

interface DropIndicator {
  index: number
  position: 'before' | 'after'
}

function DraggableBadgeContainer({ badges }: DraggableBadgeContainerProps): JSX.Element {
  const { badgeOrder, moveBadge, loadConfig, isLoaded } = useBadgeConfigStore()
  
  const isDraggingRef = useRef(false)
  const draggedIndexRef = useRef<number | null>(null)
  const dropIndicatorRef = useRef<DropIndicator | null>(null)
  
  const [isDragging, setIsDragging] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [ghostPosition, setGhostPosition] = useState<DragGhostPosition | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const [previewOrder, setPreviewOrder] = useState<BadgeType[]>([])
  const [ghostElement, setGhostElement] = useState<ReactNode | null>(null)
  
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const badgeRefsRef = useRef<Map<number, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!isLoaded) {
      loadConfig()
    }
  }, [isLoaded, loadConfig])

  const sortedBadges = [...badges].sort((a, b) => {
    const indexA = badgeOrder.indexOf(a.id)
    const indexB = badgeOrder.indexOf(b.id)
    return indexA - indexB
  })

  const displayBadges = isDragging && previewOrder.length > 0
    ? previewOrder.map(id => sortedBadges.find(b => b.id === id)!).filter(Boolean)
    : sortedBadges

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const calculateDropPosition = useCallback((clientY: number): DropIndicator | null => {
    if (!containerRef.current) return null
    
    const badgeElements = Array.from(badgeRefsRef.current.entries())
      .sort((a, b) => a[0] - b[0])
    
    if (badgeElements.length === 0) return null
    
    for (const [index, element] of badgeElements) {
      const rect = element.getBoundingClientRect()
      const midY = rect.top + rect.height / 2
      
      if (clientY < midY) {
        return { index, position: 'before' }
      }
    }
    
    return { index: badgeElements.length - 1, position: 'after' }
  }, [])

  const updatePreviewOrder = useCallback((fromIndex: number, dropInfo: DropIndicator) => {
    const currentOrder = sortedBadges.map(b => b.id)
    const toIndex = dropInfo.position === 'before' 
      ? dropInfo.index 
      : dropInfo.index + 1
    
    if (fromIndex === toIndex || fromIndex === toIndex - 1 && dropInfo.position === 'after') {
      setPreviewOrder(currentOrder)
      return
    }
    
    const newOrder = [...currentOrder]
    const [removed] = newOrder.splice(fromIndex, 1)
    
    let insertIndex = toIndex
    if (fromIndex < toIndex) {
      insertIndex = toIndex - 1
    }
    
    newOrder.splice(insertIndex, 0, removed)
    setPreviewOrder(newOrder)
  }, [sortedBadges])

  const updateDragPosition = useCallback((clientX: number, clientY: number) => {
    if (!isDraggingRef.current) return
    
    setGhostPosition({ x: clientX, y: clientY })
    
    const newDropIndicator = calculateDropPosition(clientY)
    
    if (newDropIndicator && 
        (dropIndicatorRef.current?.index !== newDropIndicator.index || 
         dropIndicatorRef.current?.position !== newDropIndicator.position)) {
      dropIndicatorRef.current = newDropIndicator
      setDropIndicator(newDropIndicator)
      
      if (draggedIndexRef.current !== null) {
        updatePreviewOrder(draggedIndexRef.current, newDropIndicator)
      }
    }
  }, [calculateDropPosition, updatePreviewOrder])

  const finishDrag = useCallback(() => {
    clearLongPressTimer()
    
    if (isDraggingRef.current && 
        draggedIndexRef.current !== null && 
        dropIndicatorRef.current !== null) {
      const fromIndex = draggedIndexRef.current
      const toIndex = dropIndicatorRef.current.position === 'before'
        ? dropIndicatorRef.current.index
        : dropIndicatorRef.current.index + 1
      
      if (fromIndex !== toIndex) {
        if (fromIndex < toIndex) {
          moveBadge(fromIndex, toIndex - 1)
        } else {
          moveBadge(fromIndex, toIndex)
        }
      }
    }

    isDraggingRef.current = false
    draggedIndexRef.current = null
    dropIndicatorRef.current = null
    
    setIsDragging(false)
    setDraggedIndex(null)
    setGhostPosition(null)
    setDropIndicator(null)
    setPreviewOrder([])
    setGhostElement(null)
  }, [clearLongPressTimer, moveBadge])

  const startLongPressDetection = useCallback((index: number, element: ReactNode) => {
    clearLongPressTimer()
    
    longPressTimerRef.current = setTimeout(() => {
      isDraggingRef.current = true
      draggedIndexRef.current = index
      
      setIsDragging(true)
      setDraggedIndex(index)
      setGhostElement(element)
      setPreviewOrder(sortedBadges.map(b => b.id))
    }, LONG_PRESS_THRESHOLD)
  }, [clearLongPressTimer, sortedBadges])

  const handleTouchStart = useCallback((e: React.TouchEvent, index: number, element: ReactNode) => {
    const touch = e.touches[0]
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
    startLongPressDetection(index, element)
  }, [startLongPressDetection])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStartPosRef.current) return

    const touch = e.touches[0]
    const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x)
    const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y)

    if (!isDraggingRef.current && (deltaX > MOVE_CANCEL_THRESHOLD || deltaY > MOVE_CANCEL_THRESHOLD)) {
      clearLongPressTimer()
      touchStartPosRef.current = null
      return
    }

    if (isDraggingRef.current) {
      e.preventDefault()
      updateDragPosition(touch.clientX, touch.clientY)
    }
  }, [clearLongPressTimer, updateDragPosition])

  const handleTouchEnd = useCallback(() => {
    touchStartPosRef.current = null
    finishDrag()
  }, [finishDrag])

  const handleMouseDown = useCallback((e: React.MouseEvent, index: number, element: ReactNode) => {
    if (e.button !== 0) return
    
    e.preventDefault()
    startLongPressDetection(index, element)

    const handleGlobalMouseMove = (moveEvent: MouseEvent): void => {
      if (isDraggingRef.current) {
        updateDragPosition(moveEvent.clientX, moveEvent.clientY)
      }
    }

    const handleGlobalMouseUp = (): void => {
      finishDrag()
      document.removeEventListener('mousemove', handleGlobalMouseMove)
      document.removeEventListener('mouseup', handleGlobalMouseUp)
    }

    document.addEventListener('mousemove', handleGlobalMouseMove)
    document.addEventListener('mouseup', handleGlobalMouseUp)
  }, [startLongPressDetection, updateDragPosition, finishDrag])

  const setBadgeRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    if (el) {
      badgeRefsRef.current.set(index, el)
    } else {
      badgeRefsRef.current.delete(index)
    }
  }, [])

  const getDropIndicatorStyle = useCallback((): React.CSSProperties => {
    if (!dropIndicator || !containerRef.current) return {}
    
    const element = badgeRefsRef.current.get(dropIndicator.index)
    if (!element) return {}
    
    const rect = element.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    
    return {
      top: dropIndicator.position === 'before' 
        ? rect.top - containerRect.top - 4
        : rect.bottom - containerRect.top + 4,
      left: rect.left - containerRect.left,
      width: rect.width
    }
  }, [dropIndicator])

  return (
    <div 
      ref={containerRef}
      className={`${styles.container} ${isDragging ? styles.dragging : ''}`}
      onTouchMove={isDragging ? handleTouchMove : undefined}
      onTouchEnd={isDragging ? handleTouchEnd : undefined}
      onTouchCancel={isDragging ? handleTouchEnd : undefined}
    >
      {displayBadges.map((badge, index) => {
        const isBeingDragged = isDragging && draggedIndex === index
        
        return (
          <div
            key={badge.id}
            ref={setBadgeRef(index)}
            data-badge-index={index}
            className={`${styles.badgeWrapper} ${isBeingDragged ? styles.dragged : ''}`}
            onTouchStart={(e) => handleTouchStart(e, index, badge.content)}
            onMouseDown={(e) => handleMouseDown(e, index, badge.content)}
          >
            {badge.content}
          </div>
        )
      })}
      
      {isDragging && dropIndicator && (
        <div 
          className={styles.dropIndicator}
          style={getDropIndicatorStyle()}
        />
      )}
      
      {isDragging && ghostPosition && ghostElement && (
        <div 
          className={styles.dragGhost}
          style={{
            left: ghostPosition.x,
            top: ghostPosition.y
          }}
        >
          {ghostElement}
        </div>
      )}
      
      {isDragging && (
        <div className={styles.dragHint}>
          松开保存排序
        </div>
      )}
    </div>
  )
}

interface DraggableBadgeContainerProps {
  badges: BadgeItem[]
}

export default DraggableBadgeContainer
