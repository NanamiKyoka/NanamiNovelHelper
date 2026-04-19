import { useRef, useState, useCallback, useEffect } from 'react'
import { Button, Empty, Spin } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { useThemeStore } from '@stores/themeStore'
import { ChunkNode } from './ChunkNode'
import type { Chunk, ChunkConnection, Point, EdgePosition } from '@renderer/types/map'
import { getEdgePosition } from '@renderer/types/map'
import styles from './WorldCanvas.module.css'

interface WorldCanvasProps {
  onChunkDoubleClick: (chunkId: string) => void
}

export function WorldCanvas({ onChunkDoubleClick }: WorldCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  
  const currentMap = useMapStore(state => state.currentMap)
  const zoom = useMapStore(state => state.zoom)
  const panX = useMapStore(state => state.panX)
  const panY = useMapStore(state => state.panY)
  const setZoom = useMapStore(state => state.setZoom)
  const setPan = useMapStore(state => state.setPan)
  const resetView = useMapStore(state => state.resetView)
  const isConnecting = useMapStore(state => state.isConnecting)
  const connectingFrom = useMapStore(state => state.connectingFrom)
  const finishConnecting = useMapStore(state => state.finishConnecting)
  const cancelConnecting = useMapStore(state => state.cancelConnecting)
  const selectedConnectionId = useMapStore(state => state.selectedConnectionId)
  const selectConnection = useMapStore(state => state.selectConnection)
  const tool = useMapStore(state => state.tool)
  const moveChunk = useMapStore(state => state.moveChunk)
  const selectChunk = useMapStore(state => state.selectChunk)
  const isLoading = useMapStore(state => state.isLoading)
  
  const { isDark } = useThemeStore()
  
  const [tempConnectionEnd, setTempConnectionEnd] = useState<Point | null>(null)
  const [draggingChunkId, setDraggingChunkId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  
  const chunks = currentMap?.data.chunks || []
  const connections = currentMap?.data.connections || []
  const gridSize = currentMap?.data.gridSize || 20
  const showGrid = currentMap?.data.showGrid ?? true
  
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(zoom + delta)
    } else {
      setPan(panX - e.deltaX, panY - e.deltaY)
    }
  }, [zoom, panX, panY, setZoom, setPan])
  
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    
    container.addEventListener('wheel', handleWheel, { passive: false })
    return () => container.removeEventListener('wheel', handleWheel)
  }, [handleWheel])
  
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && tool === 'pan')) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
    }
  }, [panX, panY, tool])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y)
    }
    
    if (isConnecting && connectingFrom) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = (e.clientX - rect.left - panX) / zoom
        const y = (e.clientY - rect.top - panY) / zoom
        setTempConnectionEnd({ x, y })
      }
    }
    
    if (draggingChunkId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = (e.clientX - rect.left - panX) / zoom - dragOffset.x
        const y = (e.clientY - rect.top - panY) / zoom - dragOffset.y
        moveChunk(draggingChunkId, { x, y })
      }
    }
  }, [isPanning, panStart, setPan, isConnecting, connectingFrom, zoom, panX, panY, draggingChunkId, dragOffset, moveChunk])
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    if (isConnecting) {
      cancelConnecting()
      setTempConnectionEnd(null)
    }
    setDraggingChunkId(null)
  }, [isConnecting, cancelConnecting])
  
  const handleChunkDragStart = useCallback((chunkId: string, e: React.MouseEvent, chunkPosition: Point) => {
    if (tool !== 'select') return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const mouseX = (e.clientX - rect.left - panX) / zoom
    const mouseY = (e.clientY - rect.top - panY) / zoom
    
    setDraggingChunkId(chunkId)
    setDragOffset({ x: mouseX - chunkPosition.x, y: mouseY - chunkPosition.y })
    selectChunk(chunkId)
  }, [tool, panX, panY, zoom, selectChunk])
  
  const handleEdgeClick = useCallback((chunkId: string, edge: EdgePosition) => {
    if (!isConnecting) {
      useMapStore.getState().startConnecting(chunkId, edge)
    } else if (connectingFrom) {
      if (connectingFrom.chunkId !== chunkId) {
        finishConnecting(chunkId, edge)
      }
      setTempConnectionEnd(null)
    }
  }, [isConnecting, connectingFrom, finishConnecting])
  
  const handleConnectionClick = useCallback((connectionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    selectConnection(connectionId)
  }, [selectConnection])
  
  const handleCanvasClick = useCallback(() => {
    selectChunk(null)
    selectConnection(null)
  }, [selectChunk, selectConnection])
  
  const renderConnection = (connection: ChunkConnection) => {
    const sourceChunk = chunks.find(c => c.id === connection.sourceChunkId)
    const targetChunk = chunks.find(c => c.id === connection.targetChunkId)
    
    if (!sourceChunk || !targetChunk) return null
    
    const startPoint = getEdgePosition(sourceChunk, connection.sourceEdge)
    const endPoint = getEdgePosition(targetChunk, connection.targetEdge)
    
    const midX = (startPoint.x + endPoint.x) / 2
    const midY = (startPoint.y + endPoint.y) / 2
    
    const controlOffset = 50
    let cp1x = startPoint.x
    let cp1y = startPoint.y
    let cp2x = endPoint.x
    let cp2y = endPoint.y
    
    if (connection.style === 'curved') {
      const dx = endPoint.x - startPoint.x
      const dy = endPoint.y - startPoint.y
      const perpX = -dy * 0.3
      const perpY = dx * 0.3
      
      cp1x = midX + perpX
      cp1y = midY + perpY
      cp2x = midX + perpX
      cp2y = midY + perpY
    }
    
    const pathD = connection.style === 'curved'
      ? `M ${startPoint.x} ${startPoint.y} Q ${cp1x} ${cp1y} ${endPoint.x} ${endPoint.y}`
      : `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`
    
    const isSelected = connection.id === selectedConnectionId
    const strokeDasharray = connection.style === 'dashed' ? '8,4' : connection.style === 'dotted' ? '2,4' : 'none'
    
    return (
      <g key={connection.id} onClick={(e) => handleConnectionClick(connection.id, e)}>
        <path
          d={pathD}
          className={`${styles.connectionLine} ${isSelected ? styles.connectionLineSelected : ''}`}
          stroke={connection.color}
          strokeWidth={connection.lineWidth}
          strokeDasharray={strokeDasharray}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        />
        {connection.label && (
          <text
            x={midX}
            y={midY - 10}
            className={styles.connectionLabel}
            textAnchor="middle"
          >
            {connection.label}
          </text>
        )}
      </g>
    )
  }
  
  const renderTempConnection = () => {
    if (!isConnecting || !connectingFrom || !tempConnectionEnd) return null
    
    const sourceChunk = chunks.find(c => c.id === connectingFrom.chunkId)
    if (!sourceChunk) return null
    
    const startPoint = getEdgePosition(sourceChunk, connectingFrom.edge)
    
    return (
      <path
        d={`M ${startPoint.x} ${startPoint.y} L ${tempConnectionEnd.x} ${tempConnectionEnd.y}`}
        className={`${styles.connectionLine} ${styles.tempConnection}`}
        strokeWidth={2}
      />
    )
  }
  
  const renderGrid = () => {
    if (!showGrid) return null
    
    const gridColor = isDark ? '#333' : '#ddd'
    const width = currentMap?.data.canvasWidth || 2000
    const height = currentMap?.data.canvasHeight || 1500
    
    const lines = []
    for (let x = 0; x <= width; x += gridSize) {
      lines.push(
        <line
          key={`v-${x}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke={gridColor}
          strokeWidth={0.5}
        />
      )
    }
    for (let y = 0; y <= height; y += gridSize) {
      lines.push(
        <line
          key={`h-${y}`}
          x1={0}
          y1={y}
          x2={width}
          y2={y}
          stroke={gridColor}
          strokeWidth={0.5}
        />
      )
    }
    
    return (
      <svg className={styles.grid} width={width} height={height}>
        {lines}
      </svg>
    )
  }
  
  if (isLoading) {
    return (
      <div className={styles.worldCanvas}>
        <div className={styles.emptyState}>
          <Spin size="large" />
        </div>
      </div>
    )
  }
  
  return (
    <div
      ref={containerRef}
      className={styles.worldCanvas}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ cursor: isPanning ? 'grabbing' : tool === 'pan' ? 'grab' : 'default' }}
    >
      <div
        className={styles.canvasContainer}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {renderGrid()}
        
        <svg className={styles.connectionsLayer}>
          {connections.map(renderConnection)}
          {renderTempConnection()}
        </svg>
        
        <div className={styles.chunksLayer}>
          {chunks.map(chunk => (
            <ChunkNode
              key={chunk.id}
              chunk={chunk}
              isSelected={useMapStore.getState().selectedChunkId === chunk.id}
              isConnecting={isConnecting}
              connectingFrom={connectingFrom}
              onDragStart={(e) => handleChunkDragStart(chunk.id, e, chunk.position)}
              onEdgeClick={handleEdgeClick}
              onDoubleClick={() => onChunkDoubleClick(chunk.id)}
            />
          ))}
        </div>
        
        {chunks.length === 0 && (
          <div className={styles.emptyState}>
            <Empty
              description={
                <>
                  <h3>空的地图</h3>
                  <p>从右侧图库拖拽板块到画布，或使用 AI 生成</p>
                </>
              }
            />
          </div>
        )}
      </div>
      
      <div className={styles.zoomControls}>
        <Button
          className={styles.zoomButton}
          icon={<ZoomOutOutlined />}
          onClick={() => setZoom(zoom - 0.1)}
        />
        <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
        <Button
          className={styles.zoomButton}
          icon={<ZoomInOutlined />}
          onClick={() => setZoom(zoom + 0.1)}
        />
        <Button
          className={styles.zoomButton}
          icon={<ReloadOutlined />}
          onClick={resetView}
        />
      </div>
    </div>
  )
}
