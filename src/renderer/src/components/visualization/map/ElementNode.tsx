import { useMemo } from 'react'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import * as Icons from '@ant-design/icons'
import { ELEMENT_TYPE_CONFIG, hexToPixel, getHexCorners, HEX_SIZE } from '@renderer/types/map'
import type { MapElement } from '@renderer/types/map'
import { getThemeColor } from '@utils/theme'
import styles from './ElementNode.module.css'

interface ElementNodeProps {
  element: MapElement
  isSelected: boolean
  onSelect: () => void
  onDragStart: () => void
  onDoubleClick: () => void
  onDelete?: () => void
  onEdit?: () => void
}

export function ElementNode({
  element,
  isSelected,
  onSelect,
  onDragStart,
  onDoubleClick,
  onDelete,
  onEdit
}: ElementNodeProps) {
  const config = ELEMENT_TYPE_CONFIG[element.elementType]

  const IconComponent = useMemo(() => {
    const iconName = element.icon || config.icon
    return (
      (Icons as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>)[iconName] ||
      Icons.QuestionCircleOutlined
    )
  }, [element.icon, config.icon])

  const centerPosition = useMemo(() => {
    return hexToPixel(element.hexPosition)
  }, [element.hexPosition])

  const hexCorners = useMemo(() => {
    return getHexCorners(centerPosition, HEX_SIZE)
  }, [centerPosition])

  const hexPath = useMemo(() => {
    return (
      hexCorners.map((corner, i) => `${i === 0 ? 'M' : 'L'} ${corner.x} ${corner.y}`).join(' ') +
      ' Z'
    )
  }, [hexCorners])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSelect()
    onDragStart()
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      label: '编辑',
      icon: <Icons.EditOutlined />,
      onClick: onEdit
    },
    { type: 'divider' },
    {
      key: 'delete',
      label: '删除',
      icon: <Icons.DeleteOutlined />,
      danger: true,
      onClick: onDelete
    }
  ]

  return (
    <Dropdown menu={{ items: contextMenuItems }} trigger={['contextMenu']}>
      <div
        className={`${styles.elementNode} ${isSelected ? styles.elementNodeSelected : ''}`}
        style={{
          left: centerPosition.x - HEX_SIZE,
          top: centerPosition.y - HEX_SIZE,
          width: HEX_SIZE * 2,
          height: HEX_SIZE * 2
        }}
        onMouseDown={handleMouseDown}
        onDoubleClick={onDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <svg
          className={styles.hexShape}
          viewBox={`${centerPosition.x - HEX_SIZE} ${centerPosition.y - HEX_SIZE} ${HEX_SIZE * 2} ${HEX_SIZE * 2}`}
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: HEX_SIZE * 2,
            height: HEX_SIZE * 2
          }}
        >
          <path
            d={hexPath}
            fill={element.color}
            stroke={isSelected ? getThemeColor('--color-primary') : 'rgba(255,255,255,0.3)'}
            strokeWidth={isSelected ? 3 : 1}
          />
        </svg>

        <div className={styles.elementContent} style={{ color: getContrastColor(element.color) }}>
          <div className={styles.elementIcon}>
            <IconComponent style={{ fontSize: 20 }} />
          </div>
          <div className={styles.elementName}>{element.name}</div>
        </div>

        {element.children.length > 0 && (
          <div className={styles.hasChildrenBadge}>{element.children.length}</div>
        )}

        {config.canHaveChildren && <div className={styles.enterHint}>双击进入</div>}
      </div>
    </Dropdown>
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
