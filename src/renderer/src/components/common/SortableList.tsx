/**
 * 可复用的拖拽排序列表组件
 * 基于 @dnd-kit 实现
 */

import { useState, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSortable } from '@dnd-kit/sortable'
import { HolderOutlined } from '@ant-design/icons'
import styles from './SortableList.module.css'

export type SortStrategy = 'vertical' | 'horizontal' | 'rect'

export interface SortableItem {
  id: string
  [key: string]: unknown
}

interface SortableItemProps {
  id: string
  children: React.ReactNode
  disabled?: boolean
  dragHandle?: boolean
}

/**
 * 单个可排序项
 */
function SortableItem({ id, children, disabled, dragHandle }: SortableItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.sortableItem}>
      {dragHandle && (
        <div className={styles.dragHandle} {...attributes} {...listeners}>
          <HolderOutlined />
        </div>
      )}
      <div className={styles.itemContent} {...(!dragHandle ? attributes : {})} {...(!dragHandle ? listeners : {})}>
        {children}
      </div>
    </div>
  )
}

interface SortableOverlayItemProps {
  children: React.ReactNode
}

/**
 * 拖拽覆盖层
 */
function SortableOverlayItem({ children }: SortableOverlayItemProps): JSX.Element {
  return (
    <div className={styles.overlayItem}>
      {children}
    </div>
  )
}

interface SortableListProps<T extends SortableItem> {
  items: T[]
  onReorder: (items: T[]) => void
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor?: (item: T) => string
  strategy?: SortStrategy
  disabled?: boolean
  dragHandle?: boolean
  className?: string
}

/**
 * 可排序列表组件
 */
function SortableList<T extends SortableItem>({
  items,
  onReorder,
  renderItem,
  keyExtractor = (item) => item.id,
  strategy = 'vertical',
  disabled = false,
  dragHandle = false,
  className
}: SortableListProps<T>): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null)

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

  const itemIds = useMemo(() => items.map(keyExtractor), [items, keyExtractor])

  const getStrategy = () => {
    switch (strategy) {
      case 'horizontal':
        return horizontalListSortingStrategy
      case 'rect':
        return rectSortingStrategy
      default:
        return verticalListSortingStrategy
    }
  }

  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((item) => keyExtractor(item) === active.id)
      const newIndex = items.findIndex((item) => keyExtractor(item) === over.id)

      const newItems = arrayMove(items, oldIndex, newIndex)
      onReorder(newItems)
    }

    setActiveId(null)
  }

  const activeItem = activeId ? items.find((item) => keyExtractor(item) === activeId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={getStrategy()}>
        <div className={`${styles.sortableList} ${className || ''}`}>
          {items.map((item, index) => (
            <SortableItem
              key={keyExtractor(item)}
              id={keyExtractor(item)}
              disabled={disabled}
              dragHandle={dragHandle}
            >
              {renderItem(item, index)}
            </SortableItem>
          ))}
        </div>
      </SortableContext>

      <DragOverlay>
        {activeItem ? (
          <SortableOverlayItem>
            {renderItem(activeItem, items.indexOf(activeItem))}
          </SortableOverlayItem>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

export default SortableList
