import { useMemo } from 'react'
import * as Icons from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { CHUNK_TYPE_CONFIG, checkEdgeCompatibility } from '@renderer/types/map'
import type { Chunk, EdgePosition } from '@renderer/types/map'
import styles from './ChunkNode.module.css'

interface ChunkNodeProps {
  chunk: Chunk
  isSelected: boolean
  isConnecting: boolean
  connectingFrom: { chunkId: string; edge: EdgePosition } | null
  onDragStart: (e: React.MouseEvent) => void
  onEdgeClick: (chunkId: string, edge: EdgePosition) => void
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
  
  const getEdgeCompatibility = (edge: EdgePosition): 'compatible' | 'incompatible' | 'neutral' => {
    if (!isConnecting || !connectingFrom) return 'neutral'
    if (connectingFrom.chunkId === chunk.id) return 'neutral'
    
    const sourceChunk = currentMap?.data.chunks.find(c => c.id === connectingFrom.chunkId)
    if (!sourceChunk) return 'neutral'
    
    const isCompatible = checkEdgeCompatibility(sourceChunk, connectingFrom.edge, chunk, edge)
    return isCompatible ? 'compatible' : 'incompatible'
  }
  
  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDragStart(e)
  }
  
  const handleEdgeMouseDown = (edge: EdgePosition, e: React.MouseEvent) => {
    e.stopPropagation()
    onEdgeClick(chunk.id, edge)
  }
  
  return (
    <div
      className={`${styles.chunkNode} ${isSelected ? styles.chunkNodeSelected : ''} ${isConnecting ? styles.isConnecting : ''}`}
      style={{
        left: chunk.position.x,
        top: chunk.position.y,
        width: chunk.size.width,
        height: chunk.size.height,
        backgroundColor: chunk.color,
        color: getContrastColor(chunk.color)
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={onDoubleClick}
    >
      <div className={styles.chunkIcon}>
        <IconComponent style={{ fontSize: 32 }} />
      </div>
      <div className={styles.chunkName}>{chunk.name}</div>
      {chunk.chunkType !== 'custom' && (
        <div className={styles.chunkType}>{config.label}</div>
      )}
      
      <div className={styles.edgeHandles}>
        <div
          className={`${styles.edgeHandle} ${styles.edgeHandleTop} ${
            connectingFrom?.chunkId === chunk.id && connectingFrom?.edge === 'top' 
              ? styles.edgeHandleActive 
              : getEdgeCompatibility('top') === 'compatible' 
                ? styles.edgeHandleCompatible 
                : getEdgeCompatibility('top') === 'incompatible' 
                  ? styles.edgeHandleIncompatible 
                  : ''
          }`}
          onMouseDown={(e) => handleEdgeMouseDown('top', e)}
        />
        <div
          className={`${styles.edgeHandle} ${styles.edgeHandleRight} ${
            connectingFrom?.chunkId === chunk.id && connectingFrom?.edge === 'right' 
              ? styles.edgeHandleActive 
              : getEdgeCompatibility('right') === 'compatible' 
                ? styles.edgeHandleCompatible 
                : getEdgeCompatibility('right') === 'incompatible' 
                  ? styles.edgeHandleIncompatible 
                  : ''
          }`}
          onMouseDown={(e) => handleEdgeMouseDown('right', e)}
        />
        <div
          className={`${styles.edgeHandle} ${styles.edgeHandleBottom} ${
            connectingFrom?.chunkId === chunk.id && connectingFrom?.edge === 'bottom' 
              ? styles.edgeHandleActive 
              : getEdgeCompatibility('bottom') === 'compatible' 
                ? styles.edgeHandleCompatible 
                : getEdgeCompatibility('bottom') === 'incompatible' 
                  ? styles.edgeHandleIncompatible 
                  : ''
          }`}
          onMouseDown={(e) => handleEdgeMouseDown('bottom', e)}
        />
        <div
          className={`${styles.edgeHandle} ${styles.edgeHandleLeft} ${
            connectingFrom?.chunkId === chunk.id && connectingFrom?.edge === 'left' 
              ? styles.edgeHandleActive 
              : getEdgeCompatibility('left') === 'compatible' 
                ? styles.edgeHandleCompatible 
                : getEdgeCompatibility('left') === 'incompatible' 
                  ? styles.edgeHandleIncompatible 
                  : ''
          }`}
          onMouseDown={(e) => handleEdgeMouseDown('left', e)}
        />
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
