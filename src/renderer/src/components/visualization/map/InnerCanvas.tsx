import { useState, useCallback, useMemo } from 'react'
import { Button, Empty, Spin, Modal, App } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, ReloadOutlined } from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { useThemeStore } from '@stores/themeStore'
import { useCanvasInteraction } from '@hooks/useCanvasInteraction'
import { ElementNode } from './ElementNode'
import { 
  hexToPixel, 
  pixelToHex, 
  getHexCorners, 
  HEX_SIZE,
  type HexPoint 
} from '@renderer/types/map'
import styles from './InnerCanvas.module.css'

interface InnerCanvasProps {
  onElementDoubleClick: (elementId: string, elementName: string) => void
  onElementEdit?: (elementId: string) => void
}

export function InnerCanvas({ onElementDoubleClick, onElementEdit }: InnerCanvasProps) {
  const { message } = App.useApp()
  
  const currentMap = useMapStore(state => state.currentMap)
  const viewStack = useMapStore(state => state.viewStack)
  const getCurrentElements = useMapStore(state => state.getCurrentElements)
  const zoom = useMapStore(state => state.zoom)
  const panX = useMapStore(state => state.panX)
  const panY = useMapStore(state => state.panY)
  const setZoom = useMapStore(state => state.setZoom)
  const setPan = useMapStore(state => state.setPan)
  const resetView = useMapStore(state => state.resetView)
  const selectedElementId = useMapStore(state => state.selectedElementId)
  const selectElement = useMapStore(state => state.selectElement)
  const moveElementToHex = useMapStore(state => state.moveElementToHex)
  const deleteElement = useMapStore(state => state.deleteElement)
  
  const { containerRef, isPanning, isSpacePressed } = useCanvasInteraction({
    zoom,
    panX,
    panY,
    setZoom,
    setPan
  })
  
  const { isDark } = useThemeStore()
  
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null)
  
  const elements = getCurrentElements()
  const currentLevel = viewStack[viewStack.length - 1]
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingElementId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = (e.clientX - rect.left - panX) / zoom
        const y = (e.clientY - rect.top - panY) / zoom
        const hexPosition = pixelToHex({ x, y })
        moveElementToHex(draggingElementId, hexPosition)
      }
    }
  }, [draggingElementId, moveElementToHex, zoom, panX, panY])
  
  const handleMouseUp = useCallback(() => {
    setDraggingElementId(null)
  }, [])
  
  const handleElementDragStart = useCallback((elementId: string) => {
    if (isPanning) return
    setDraggingElementId(elementId)
  }, [isPanning])
  
  const handleCanvasClick = useCallback(() => {
    selectElement(null)
  }, [selectElement])
  
  const handleElementDelete = useCallback((elementId: string) => {
    const element = elements.find(e => e.id === elementId)
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除元素「${element?.name || ''}」吗？`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: () => {
        deleteElement(elementId)
        message.success('元素已删除')
      }
    })
  }, [elements, deleteElement, message])
  
  const handleElementEdit = useCallback((elementId: string) => {
    selectElement(elementId)
    onElementEdit?.(elementId)
  }, [selectElement, onElementEdit])
  
  const renderHexGrid = useMemo(() => {
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
    const hexes: JSX.Element[] = []
    
    const minQ = Math.min(...elements.map(e => e.hexPosition.q), -5) - 2
    const maxQ = Math.max(...elements.map(e => e.hexPosition.q), 5) + 2
    const minR = Math.min(...elements.map(e => e.hexPosition.r), -5) - 2
    const maxR = Math.max(...elements.map(e => e.hexPosition.r), 5) + 2
    
    for (let q = minQ; q <= maxQ; q++) {
      for (let r = minR; r <= maxR; r++) {
        const center = hexToPixel({ q, r })
        const corners = getHexCorners(center, HEX_SIZE)
        
        const pathD = corners
          .map((corner, i) => `${i === 0 ? 'M' : 'L'} ${corner.x} ${corner.y}`)
          .join(' ') + ' Z'
        
        hexes.push(
          <path
            key={`hex-${q}-${r}`}
            d={pathD}
            fill="none"
            stroke={gridColor}
            strokeWidth={1}
          />
        )
      }
    }
    
    return (
      <svg className={styles.grid} style={{ width: '100%', height: '100%' }}>
        {hexes}
      </svg>
    )
  }, [isDark, elements])
  
  if (!currentMap) {
    return (
      <div className={styles.innerCanvas}>
        <div className={styles.emptyState}>
          <Spin size="large" />
        </div>
      </div>
    )
  }
  
  return (
    <div
      ref={containerRef}
      className={styles.innerCanvas}
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
        {renderHexGrid}
        
        <div className={styles.elementsLayer}>
          {elements.map(element => (
            <ElementNode
              key={element.id}
              element={element}
              isSelected={selectedElementId === element.id}
              onSelect={() => selectElement(element.id)}
              onDragStart={() => handleElementDragStart(element.id)}
              onDoubleClick={() => onElementDoubleClick(element.id, element.name)}
              onDelete={() => handleElementDelete(element.id)}
              onEdit={() => handleElementEdit(element.id)}
            />
          ))}
        </div>
        
        {elements.length === 0 && (
          <div className={styles.emptyState}>
            <Empty
              description={
                <>
                  <h3>空的区域</h3>
                  <p>从右侧面板添加元素</p>
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
