import { useRef, useState, useCallback, useEffect } from 'react'
import { Button, Empty, Spin } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, ReloadOutlined, SparklesOutlined } from '@ant-design/icons'
import { useMapStore } from '@stores/mapStore'
import { useThemeStore } from '@stores/themeStore'
import { ElementNode } from './ElementNode'
import type { Point, MapElement } from '@renderer/types/map'
import styles from './InnerCanvas.module.css'

interface InnerCanvasProps {
  onElementDoubleClick: (elementId: string, elementName: string) => void
}

export function InnerCanvas({ onElementDoubleClick }: InnerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState<Point>({ x: 0, y: 0 })
  
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
  const moveElement = useMapStore(state => state.moveElement)
  const isAiGenerating = useMapStore(state => state.isAiGenerating)
  const aiFillChunk = useMapStore(state => state.aiFillChunk)
  
  const { isDark } = useThemeStore()
  
  const [draggingElementId, setDraggingElementId] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 })
  
  const elements = getCurrentElements()
  const currentLevel = viewStack[viewStack.length - 1]
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
    if (e.button === 1) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - panX, y: e.clientY - panY })
    }
  }, [panX, panY])
  
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      setPan(e.clientX - panStart.x, e.clientY - panStart.y)
    }
    
    if (draggingElementId) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const x = (e.clientX - rect.left - panX) / zoom - dragOffset.x
        const y = (e.clientY - rect.top - panY) / zoom - dragOffset.y
        moveElement(draggingElementId, { x, y })
      }
    }
  }, [isPanning, panStart, setPan, draggingElementId, dragOffset, moveElement, zoom, panX, panY])
  
  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
    setDraggingElementId(null)
  }, [])
  
  const handleElementDragStart = useCallback((elementId: string, e: React.MouseEvent, elementPosition: Point) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const mouseX = (e.clientX - rect.left - panX) / zoom
    const mouseY = (e.clientY - rect.top - panY) / zoom
    
    setDraggingElementId(elementId)
    setDragOffset({ x: mouseX - elementPosition.x, y: mouseY - elementPosition.y })
  }, [panX, panY, zoom])
  
  const handleCanvasClick = useCallback(() => {
    selectElement(null)
  }, [selectElement])
  
  const handleAiFill = async () => {
    if (currentLevel.type === 'chunk') {
      await aiFillChunk(currentLevel.id)
    }
  }
  
  const renderGrid = () => {
    if (!showGrid) return null
    
    const gridColor = isDark ? '#333' : '#ddd'
    const width = 800
    const height = 600
    
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
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleCanvasClick}
      style={{ cursor: isPanning ? 'grabbing' : 'default' }}
    >
      <div
        className={styles.canvasContainer}
        style={{
          transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
          transformOrigin: '0 0'
        }}
      >
        {renderGrid()}
        
        <div className={styles.elementsLayer}>
          {elements.map(element => (
            <ElementNode
              key={element.id}
              element={element}
              isSelected={selectedElementId === element.id}
              onSelect={() => selectElement(element.id)}
              onDragStart={(e) => handleElementDragStart(element.id, e, element.position)}
              onDoubleClick={() => onElementDoubleClick(element.id, element.name)}
            />
          ))}
        </div>
        
        {elements.length === 0 && (
          <div className={styles.emptyState}>
            <Empty
              description={
                <>
                  <h3>空的区域</h3>
                  <p>从右侧面板添加元素，或使用 AI 自动填充</p>
                  {currentLevel.type === 'chunk' && (
                    <Button
                      type="primary"
                      icon={<SparklesOutlined />}
                      onClick={handleAiFill}
                      loading={isAiGenerating}
                      className={styles.aiFillButton}
                    >
                      AI 自动填充
                    </Button>
                  )}
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
