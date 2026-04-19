import { useMemo } from 'react'
import * as Icons from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { CHUNK_TYPE_CONFIG, checkHexEdgeCompatibility, hexToPixel, getHexCorners, HEX_SIZE, HEX_EDGE_NAMES } from '@renderer/types/map'
import type { Chunk, HexEdge, Point } from '@renderer/types/map'
import styles from './ChunkNode.module.css'

interface ChunkNodeProps {
  chunk: Chunk
  isSelected: boolean
  isConnecting: boolean
  connectingFrom: { chunkId: string; edge: HexEdge } | null
  onDragStart: (e: React.MouseEvent) => void
  onEdgeClick: (chunkId: string, edge: HexEdge) => void
  onDoubleClick: () => void
}

export function ChunkNode({
  chunk,
  isSelected,
  isConnecting,
  connectingFrom,
  onDragStart,
  onEdgeClick,
  onDoubleClick
}: ChunkNodeProps) {
  const currentMap = useMapStore(state => state.currentMap)
  
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
  
  const getEdgeCompatibility = (edge: HexEdge): 'compatible' | 'incompatible' | 'neutral' => {
    if (!isConnecting || !connectingFrom) return 'neutral'
    if (connectingFrom.chunkId === chunk.id) return 'neutral'
    
    const sourceChunk = currentMap?.data.chunks.find(c => c.id === connectingFrom.chunkId)
    if (!sourceChunk) return 'neutral'
    
    const isCompatible = checkHexEdgeCompatibility(sourceChunk, connectingFrom.edge, chunk, edge)
    return isCompatible ? 'compatible' : 'incompatible'
  }
  
  const getEdgeHandlePosition = (edge: HexEdge): Point => {
    const corner1 = hexCorners[edge]
    const corner2 = hexCorners[(edge + 1) % 6]
    return {
      x: (corner1.x + corner2.x) / 2,
      y: (corner1.y + corner2.y) / 2
    }
  }
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDragStart(e)
  }
  
  const handleEdgeMouseDown = (edge: HexEdge, e: React.MouseEvent) => {
    e.stopPropagation()
    onEdgeClick(chunk.id, edge)
  }
  
  const edgeHandles = [0, 1, 2, 3, 4, 5] as HexEdge[]
  
  return (
    <div
      className={`${styles.chunkNode} ${isSelected ? styles.chunkNodeSelected : ''} ${isConnecting ? styles.isConnecting : ''}`}
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
      
      <div className={styles.edgeHandles}>
        {edgeHandles.map(edge => {
          const pos = getEdgeHandlePosition(edge)
          const isActive = connectingFrom?.chunkId === chunk.id && connectingFrom?.edge === edge
          const compatibility = getEdgeCompatibility(edge)
          
          return (
            <div
              key={edge}
              className={`${styles.edgeHandle} ${
                isActive 
                  ? styles.edgeHandleActive 
                  : compatibility === 'compatible' 
                    ? styles.edgeHandleCompatible 
                    : compatibility === 'incompatible' 
                      ? styles.edgeHandleIncompatible 
                      : ''
              }`}
              style={{
                left: pos.x - (centerPosition.x - HEX_SIZE) - 6,
                top: pos.y - (centerPosition.y - HEX_SIZE) - 6
              }}
              onMouseDown={(e) => handleEdgeMouseDown(edge, e)}
              title={HEX_EDGE_NAMES[edge]}
            />
          )
        })}
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
