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
  targetId: BadgeType
  position: 'before' | 'after'
}

function DraggableBadgeContainer({ badges }: DraggableBadgeContainerProps): JSX.Element {
  const { badgeOrder, setBadgeOrder, loadConfig, isLoaded } = useBadgeConfigStore()

  const isDraggingRef = useRef(false)
  const draggedIdRef = useRef<BadgeType | null>(null)
  const dropIndicatorRef = useRef<DropIndicator | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [draggedId, setDraggedId] = useState<BadgeType | null>(null)
  const [ghostPosition, setGhostPosition] = useState<DragGhostPosition | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const [previewOrder, setPreviewOrder] = useState<BadgeType[]>([])
  const [ghostElement, setGhostElement] = useState<ReactNode | null>(null)

  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const badgeRefsRef = useRef<Map<BadgeType, HTMLDivElement>>(new Map())

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

  const displayBadges =
    isDragging && previewOrder.length > 0
      ? previewOrder.map(id => sortedBadges.find(b => b.id === id)!).filter(Boolean)
      : sortedBadges

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const calculateDropPosition = useCallback(
    (clientY: number): DropIndicator | null => {
      if (!containerRef.current) return null

      const visibleBadges = displayBadges
      if (visibleBadges.length === 0) return null

      for (const badge of visibleBadges) {
        const element = badgeRefsRef.current.get(badge.id)
        if (!element) continue

        const rect = element.getBoundingClientRect()
        const midY = rect.top + rect.height / 2

        if (clientY < midY) {
          return { targetId: badge.id, position: 'before' }
        }
      }

      const lastBadge = visibleBadges[visibleBadges.length - 1]
      return { targetId: lastBadge.id, position: 'after' }
    },
    [displayBadges]
  )

  const calculateNewOrder = useCallback(
    (currentOrder: BadgeType[], draggedId: BadgeType, dropInfo: DropIndicator): BadgeType[] => {
      const fromIndex = currentOrder.indexOf(draggedId)
      const targetIndex = currentOrder.indexOf(dropInfo.targetId)

      if (fromIndex === -1 || targetIndex === -1) return currentOrder

      const newOrder = [...currentOrder]
      newOrder.splice(fromIndex, 1)

      let insertIndex = targetIndex
      if (fromIndex < targetIndex) {
        insertIndex = dropInfo.position === 'before' ? targetIndex - 1 : targetIndex
      } else {
        insertIndex = dropInfo.position === 'before' ? targetIndex : targetIndex + 1
      }

      insertIndex = Math.max(0, Math.min(insertIndex, newOrder.length))
      newOrder.splice(insertIndex, 0, draggedId)

      return newOrder
    },
    []
  )

  const updateDragPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!isDraggingRef.current || !draggedIdRef.current) return

      setGhostPosition({ x: clientX, y: clientY })

      const newDropIndicator = calculateDropPosition(clientY)

      if (
        newDropIndicator &&
        (dropIndicatorRef.current?.targetId !== newDropIndicator.targetId ||
          dropIndicatorRef.current?.position !== newDropIndicator.position)
      ) {
        dropIndicatorRef.current = newDropIndicator
        setDropIndicator(newDropIndicator)

        const currentOrder = previewOrder.length > 0 ? previewOrder : badgeOrder
        const newPreviewOrder = calculateNewOrder(
          currentOrder,
          draggedIdRef.current,
          newDropIndicator
        )
        setPreviewOrder(newPreviewOrder)
      }
    },
    [calculateDropPosition, calculateNewOrder, previewOrder, badgeOrder]
  )

  const finishDrag = useCallback(() => {
    clearLongPressTimer()

    if (isDraggingRef.current && draggedIdRef.current && dropIndicatorRef.current) {
      const newOrder = calculateNewOrder(badgeOrder, draggedIdRef.current, dropIndicatorRef.current)

      const isOrderChanged = newOrder.some((id, index) => id !== badgeOrder[index])
      if (isOrderChanged) {
        setBadgeOrder(newOrder)
      }
    }

    isDraggingRef.current = false
    draggedIdRef.current = null
    dropIndicatorRef.current = null

    setIsDragging(false)
    setDraggedId(null)
    setGhostPosition(null)
    setDropIndicator(null)
    setPreviewOrder([])
    setGhostElement(null)
  }, [clearLongPressTimer, calculateNewOrder, badgeOrder, setBadgeOrder])

  const startLongPressDetection = useCallback(
    (id: BadgeType, element: ReactNode) => {
      clearLongPressTimer()

      longPressTimerRef.current = setTimeout(() => {
        isDraggingRef.current = true
        draggedIdRef.current = id

        setIsDragging(true)
        setDraggedId(id)
        setGhostElement(element)
        setPreviewOrder([...badgeOrder])
      }, LONG_PRESS_THRESHOLD)
    },
    [clearLongPressTimer, badgeOrder]
  )

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, id: BadgeType, element: ReactNode) => {
      const touch = e.touches[0]
      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY }
      startLongPressDetection(id, element)
    },
    [startLongPressDetection]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPosRef.current) return

      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStartPosRef.current.x)
      const deltaY = Math.abs(touch.clientY - touchStartPosRef.current.y)

      if (
        !isDraggingRef.current &&
        (deltaX > MOVE_CANCEL_THRESHOLD || deltaY > MOVE_CANCEL_THRESHOLD)
      ) {
        clearLongPressTimer()
        touchStartPosRef.current = null
        return
      }

      if (isDraggingRef.current) {
        e.preventDefault()
        updateDragPosition(touch.clientX, touch.clientY)
      }
    },
    [clearLongPressTimer, updateDragPosition]
  )

  const handleTouchEnd = useCallback(() => {
    touchStartPosRef.current = null
    finishDrag()
  }, [finishDrag])

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, id: BadgeType, element: ReactNode) => {
      if (e.button !== 0) return

      e.preventDefault()
      startLongPressDetection(id, element)

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
    },
    [startLongPressDetection, updateDragPosition, finishDrag]
  )

  const setBadgeRef = useCallback(
    (id: BadgeType) => (el: HTMLDivElement | null) => {
      if (el) {
        badgeRefsRef.current.set(id, el)
      } else {
        badgeRefsRef.current.delete(id)
      }
    },
    []
  )

  const getDropIndicatorStyle = useCallback((): React.CSSProperties => {
    if (!dropIndicator || !containerRef.current) return {}

    const element = badgeRefsRef.current.get(dropIndicator.targetId)
    if (!element) return {}

    const rect = element.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()

    return {
      top:
        dropIndicator.position === 'before'
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
      {displayBadges.map(badge => {
        const isBeingDragged = isDragging && draggedId === badge.id

        return (
          <div
            key={badge.id}
            ref={setBadgeRef(badge.id)}
            data-badge-id={badge.id}
            className={`${styles.badgeWrapper} ${isBeingDragged ? styles.dragged : ''}`}
            onTouchStart={e => handleTouchStart(e, badge.id, badge.content)}
            onMouseDown={e => handleMouseDown(e, badge.id, badge.content)}
          >
            {badge.content}
          </div>
        )
      })}

      {isDragging && dropIndicator && (
        <div className={styles.dropIndicator} style={getDropIndicatorStyle()} />
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

      {isDragging && <div className={styles.dragHint}>松开保存排序</div>}
    </div>
  )
}

interface DraggableBadgeContainerProps {
  badges: BadgeItem[]
}

export default DraggableBadgeContainer
