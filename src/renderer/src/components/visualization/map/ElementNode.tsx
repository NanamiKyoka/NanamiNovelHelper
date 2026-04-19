import { useMemo } from 'react'
import * as Icons from '@ant-design/icons'
import { ELEMENT_TYPE_CONFIG } from '@renderer/types/map'
import type { MapElement, ElementType } from '@renderer/types/map'
import styles from './ElementNode.module.css'

interface ElementNodeProps {
  element: MapElement
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}

export function ElementNode({
  element,
  isSelected,
  onSelect,
  onDragStart,
  onDoubleClick
}: ElementNodeProps) {
  const config = ELEMENT_TYPE_CONFIG[element.elementType]
  
  const IconComponent = useMemo(() => {
    const iconName = element.icon || config.icon
    return (Icons as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>)[iconName] || Icons.QuestionCircleOutlined
  }, [element.icon, config.icon])
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
    onDragStart(e)
  }
  
  return (
    <div
      className={`${styles.elementNode} ${isSelected ? styles.elementNodeSelected : ''}`}
      style={{
        left: element.position.x,
        top: element.position.y,
        width: element.size.width,
        height: element.size.height,
        backgroundColor: element.color,
        color: getContrastColor(element.color)
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className={styles.elementIcon}>
        <IconComponent style={{ fontSize: 24 }} />
      </div>
      <div className={styles.elementName}>{element.name}</div>
      {element.elementType !== 'custom' && (
        <div className={styles.elementType}>{config.label}</div>
      )}
      
      {element.children.length > 0 && (
        <div className={styles.hasChildrenBadge}>
          {element.children.length}
        </div>
      )}
      
      {config.canHaveChildren && (
        <div className={styles.enterHint}>双击进入</div>
      )}
    </div>
  )
}

function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
