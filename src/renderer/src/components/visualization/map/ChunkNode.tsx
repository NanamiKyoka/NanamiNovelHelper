import { useMemo } from 'react'
import * as Icons from '@ant-design/icons'
import { CHUNK_TYPE_CONFIG, hexToPixel, getHexCorners, HEX_SIZE } from '@renderer/types/map'
import type { Chunk } from '@renderer/types/map'
import styles from './ChunkNode.module.css'

interface ChunkNodeProps {
  chunk: Chunk
  isSelected: boolean
  onDragStart: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}

export function ChunkNode({
  chunk,
  isSelected,
  onDragStart,
  onDoubleClick
}: ChunkNodeProps) {
  const config = CHUNK_TYPE_CONFIG[chunk.chunkType]
  
  const IconComponent = useMemo(() => {
    const iconName = chunk.icon || config.icon
    return (Icons as Record<string, React.ComponentType<{ style?: React.CSSProperties }>>)[iconName] || Icons.QuestionCircleOutlined
  }, [chunk.icon, config.icon])
  
  const centerPosition = useMemo(() => {
    return hexToPixel(chunk.hexPosition)
  }, [chunk.hexPosition])
  
  const hexCorners = useMemo(() => {
    return getHexCorners(centerPosition, HEX_SIZE)
  }, [centerPosition])
  
  const hexPath = useMemo(() => {
    return hexCorners
      .map((corner, i) => `${i === 0 ? 'M' : 'L'} ${corner.x} ${corner.y}`)
      .join(' ') + ' Z'
  }, [hexCorners])
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDragStart(e)
  }
  
  return (
    <div
      className={`${styles.chunkNode} ${isSelected ? styles.chunkNodeSelected : ''}`}
      style={{
        left: centerPosition.x - HEX_SIZE,
        top: centerPosition.y - HEX_SIZE,
        width: HEX_SIZE * 2,
        height: HEX_SIZE * 2
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
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
          fill={chunk.color}
          stroke={isSelected ? '#1890ff' : 'rgba(255,255,255,0.3)'}
          strokeWidth={isSelected ? 3 : 1}
        />
      </svg>
      
      <div 
        className={styles.chunkContent}
        style={{ color: getContrastColor(chunk.color) }}
      >
        <div className={styles.chunkIcon}>
          <IconComponent style={{ fontSize: 24 }} />
        </div>
        <div className={styles.chunkName}>{chunk.name}</div>
      </div>
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
