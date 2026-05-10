import { useState, useCallback, useMemo } from 'react'
import { Button, Empty, Spin, Modal, App } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { useThemeStore } from '@stores/themeStore'
import { useCanvasInteraction } from '@hooks/useCanvasInteraction'
import { ChunkNode } from './ChunkNode'
import type { ChunkConnection } from '@renderer/types/map'
import {
  hexToPixel,
  pixelToHex,
  getHexCorners,
  getHexEdgeCenter,
  HEX_SIZE
} from '@renderer/types/map'
import type { HexPoint } from '@renderer/types/map'
import styles from './WorldCanvas.module.css'

interface WorldCanvasProps {
  onChunkDoubleClick: (chunkId: string) => void
  onChunkEdit?: (chunkId: string) => void
}

export function WorldCanvas({ onChunkDoubleClick, onChunkEdit }: WorldCanvasProps) {
  const { message } = App.useApp()

  const currentMap = useMapStore(state => state.currentMap)
  const zoom = useMapStore(state => state.zoom)
  const panX = useMapStore(state => state.panX)
  const panY = useMapStore(state => state.panY)
  const setZoom = useMapStore(state => state.setZoom)
  const setPan = useMapStore(state => state.setPan)
  const resetView = useMapStore(state => state.resetView)
  const selectedConnectionId = useMapStore(state => state.selectedConnectionId)
  const selectConnection = useMapStore(state => state.selectConnection)
  const tool = useMapStore(state => state.tool)
  const moveChunkToHex = useMapStore(state => state.moveChunkToHex)
  const selectChunk = useMapStore(state => state.selectChunk)
  const isLoading = useMapStore(state => state.isLoading)
  const isHexOccupied = useMapStore(state => state.isHexOccupied)
  const deleteChunk = useMapStore(state => state.deleteChunk)
  const duplicateChunk = useMapStore(state => state.duplicateChunk)
  const isConnecting = useMapStore(state => state.isConnecting)
  const connectingFrom = useMapStore(state => state.connectingFrom)
  const startConnecting = useMapStore(state => state.startConnecting)
  const connectChunks = useMapStore(state => state.connectChunks)
  const cancelConnecting = useMapStore(state => state.cancelConnecting)

  const { containerRef, isPanning, isSpacePressed } = useCanvasInteraction({
    zoom,
    panX,
    panY,
    setZoom,
    setPan
  })

  const { isDark } = useThemeStore()

  const [draggingChunkId, setDraggingChunkId] = useState<string | null>(null)
  const [dragStartHex, setDragStartHex] = useState<HexPoint | null>(null)

  const chunks = useMemo(() => currentMap?.data?.chunks || [], [currentMap?.data?.chunks])
  const connections = useMemo(
    () => currentMap?.data?.connections || [],
    [currentMap?.data?.connections]
  )

  const handleChunkDrag = useCallback(
    (e: React.MouseEvent) => {
      if (!draggingChunkId) return

      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return

      const x = (e.clientX - rect.left - panX) / zoom
      const y = (e.clientY - rect.top - panY) / zoom

      const hexPosition = pixelToHex({ x, y })

      if (
        !isHexOccupied(hexPosition) ||
        (dragStartHex && hexPosition.q === dragStartHex.q && hexPosition.r === dragStartHex.r)
      ) {
        moveChunkToHex(draggingChunkId, hexPosition)
      }
    },
    [draggingChunkId, dragStartHex, panX, panY, zoom, moveChunkToHex, isHexOccupied, containerRef]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (draggingChunkId) {
        handleChunkDrag(e)
      }
    },
    [draggingChunkId, handleChunkDrag]
  )

  const handleMouseUp = useCallback(() => {
    setDraggingChunkId(null)
    setDragStartHex(null)
  }, [])

  const handleChunkDragStart = useCallback(
    (chunkId: string, _e: React.MouseEvent) => {
      if (tool !== 'select' || isPanning) return

      const chunk = chunks.find(c => c.id === chunkId)
      if (!chunk) return

      setDraggingChunkId(chunkId)
      setDragStartHex(chunk.hexPosition)
      selectChunk(chunkId)
    },
    [tool, chunks, selectChunk, isPanning]
  )

  const handleConnectionClick = useCallback(
    (connectionId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      selectConnection(connectionId)
    },
    [selectConnection]
  )

  const handleCanvasClick = useCallback(() => {
    selectChunk(null)
    selectConnection(null)
  }, [selectChunk, selectConnection])

  const handleChunkDelete = useCallback(
    (chunkId: string) => {
      const chunk = chunks.find(c => c.id === chunkId)
      Modal.confirm({
        title: '确认删除',
        content: `确定要删除板块「${chunk?.name || ''}」吗？相关的连接也会被删除。`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: () => {
          deleteChunk(chunkId)
          message.success('板块已删除')
        }
      })
    },
    [chunks, deleteChunk, message]
  )

  const handleChunkDuplicate = useCallback(
    (chunkId: string) => {
      const newChunk = duplicateChunk(chunkId)
      if (newChunk) {
        message.success(`已复制为「${newChunk.name}」`)
      }
    },
    [duplicateChunk, message]
  )

  const handleChunkEdit = useCallback(
    (chunkId: string) => {
      selectChunk(chunkId)
      onChunkEdit?.(chunkId)
    },
    [selectChunk, onChunkEdit]
  )

  const handleStartConnecting = useCallback(
    (chunkId: string) => {
      if (isConnecting && connectingFrom?.chunkId === chunkId) {
        cancelConnecting()
        return
      }

      if (isConnecting && connectingFrom && connectingFrom.chunkId !== chunkId) {
        const connection = connectChunks(connectingFrom.chunkId, chunkId)
        if (connection) {
          message.success('连接已创建')
        } else {
          message.warning('无法创建连接')
        }
        return
      }

      const chunk = chunks.find(c => c.id === chunkId)
      if (chunk) {
        startConnecting(chunkId, 0)
        message.info('请点击另一个板块完成连接')
      }
    },
    [
      isConnecting,
      connectingFrom,
      startConnecting,
      connectChunks,
      cancelConnecting,
      chunks,
      message
    ]
  )

  const renderConnection = (connection: ChunkConnection) => {
    const sourceChunk = chunks.find(c => c.id === connection.sourceChunkId)
    const targetChunk = chunks.find(c => c.id === connection.targetChunkId)

    if (!sourceChunk || !targetChunk) return null

    const startPoint = getHexEdgeCenter(sourceChunk, connection.sourceEdge)
    const endPoint = getHexEdgeCenter(targetChunk, connection.targetEdge)

    const midX = (startPoint.x + endPoint.x) / 2
    const midY = (startPoint.y + endPoint.y) / 2

    let pathD: string
    if (connection.style === 'curved') {
      const dx = endPoint.x - startPoint.x
      const dy = endPoint.y - startPoint.y
      const perpX = -dy * 0.3
      const perpY = dx * 0.3

      const cp1x = midX + perpX
      const cp1y = midY + perpY

      pathD = `M ${startPoint.x} ${startPoint.y} Q ${cp1x} ${cp1y} ${endPoint.x} ${endPoint.y}`
    } else {
      pathD = `M ${startPoint.x} ${startPoint.y} L ${endPoint.x} ${endPoint.y}`
    }

    const isSelected = connection.id === selectedConnectionId
    const strokeDasharray =
      connection.style === 'dashed' ? '8,4' : connection.style === 'dotted' ? '2,4' : 'none'

    return (
      <g key={connection.id} onClick={e => handleConnectionClick(connection.id, e)}>
        <path
          d={pathD}
          className={`${styles.connectionLine} ${isSelected ? styles.connectionLineSelected : ''}`}
          stroke={connection.color}
          strokeWidth={connection.lineWidth}
          strokeDasharray={strokeDasharray}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
        />
        {connection.label && (
          <text x={midX} y={midY - 10} className={styles.connectionLabel} textAnchor="middle">
            {connection.label}
          </text>
        )}
      </g>
    )
  }

  const renderHexGrid = () => {
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    const hexes: JSX.Element[] = []

    const minQ = Math.min(...chunks.map(c => c.hexPosition.q), -5) - 2
    const maxQ = Math.max(...chunks.map(c => c.hexPosition.q), 5) + 2
    const minR = Math.min(...chunks.map(c => c.hexPosition.r), -5) - 2
    const maxR = Math.max(...chunks.map(c => c.hexPosition.r), 5) + 2

    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        const center = hexToPixel({ q, r })
        const corners = getHexCorners(center, HEX_SIZE)

        const pathD =
          corners.map((corner, i) => `${i === 0 ? 'M' : 'L'} ${corner.x} ${corner.y}`).join(' ') +
          ' Z'

        hexes.push(
          <path key={`hex-${q}-${r}`} d={pathD} fill="none" stroke={gridColor} strokeWidth={1} />
        )
      }
    }

    return (
      <svg className={styles.grid} style={{ width: '100%', height: '100%' }}>
        {hexes}
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
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ cursor: isPanning ? 'grabbing' : isSpacePressed ? 'grab' : 'default' }}
    >
      <div
        className={styles.canvasContainer}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {renderHexGrid()}

        <svg className={styles.connectionsLayer}>{connections.map(renderConnection)}</svg>

        <div className={styles.chunksLayer}>
          {chunks.map(chunk => (
            <ChunkNode
              key={chunk.id}
              chunk={chunk}
              isSelected={useMapStore.getState().selectedChunkId === chunk.id}
              onDragStart={e => handleChunkDragStart(chunk.id, e)}
              onDoubleClick={() => onChunkDoubleClick(chunk.id)}
              onDelete={() => handleChunkDelete(chunk.id)}
              onEdit={() => handleChunkEdit(chunk.id)}
              onDuplicate={() => handleChunkDuplicate(chunk.id)}
              onStartConnecting={() => handleStartConnecting(chunk.id)}
              isConnectingMode={isConnecting}
              isConnectingFrom={connectingFrom?.chunkId === chunk.id}
            />
          ))}
        </div>

        {chunks.length === 0 && (
          <div className={styles.emptyState}>
            <Empty
              description={
                <>
                  <h3>空的地图</h3>
                  <p>从右侧图库点击板块开始创建</p>
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
        <Button className={styles.zoomButton} icon={<ReloadOutlined />} onClick={resetView} />
      </div>
    </div>
  )
}
