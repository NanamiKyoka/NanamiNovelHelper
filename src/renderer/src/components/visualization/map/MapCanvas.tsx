/**
 * 地图画布组件 - 基于 PixiJS
 *
 * 功能：
 * - 渲染多边形板块
 * - 渲染连接线
 * - 渲染标注
 * - 支持缩放、平移
 * - 支持多边形绘制
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { Application, Container, Graphics, Text, FederatedPointerEvent, Color } from 'pixi.js'
// 导入 unsafe-eval 支持以解决 Electron 环境下的 CSP 限制
import 'pixi.js/unsafe-eval'
import { useMapStore } from '@renderer/stores/mapStore'
import { useThemeStore } from '@renderer/stores/themeStore'
import type { MapData, Point } from '@renderer/types/map'
import styles from './MapCanvas.module.css'

interface MapCanvasProps {
  onSave?: () => void
}

// 顶点吸附距离阈值（像素）
const VERTEX_SNAP_DISTANCE = 15

export function MapCanvas({ onSave }: MapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const appRef = useRef<Application | null>(null)
  const layersRef = useRef<{
    grid: Graphics
    regions: Container
    connections: Graphics
    annotations: Container
    drawing: Graphics
  } | null>(null)
  const isInitializedRef = useRef(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const isPanningRef = useRef(false)
  const panStartRef = useRef<Point>({ x: 0, y: 0 })

  // 从 store 获取状态
  const currentMap = useMapStore(state => state.currentMap)
  const tool = useMapStore(state => state.tool)
  const zoom = useMapStore(state => state.zoom)
  const panX = useMapStore(state => state.panX)
  const panY = useMapStore(state => state.panY)
  const selectedRegionId = useMapStore(state => state.selectedRegionId)
  const isDrawing = useMapStore(state => state.isDrawing)
  const drawingVertices = useMapStore(state => state.drawingVertices)
  const connectingFromId = useMapStore(state => state.connectingFromId)

  // 从 store 获取方法
  const setZoom = useMapStore(state => state.setZoom)
  const setPan = useMapStore(state => state.setPan)
  const selectRegion = useMapStore(state => state.selectRegion)
  const addDrawingVertex = useMapStore(state => state.addDrawingVertex)
  const finishDrawing = useMapStore(state => state.finishDrawing)
  const cancelDrawing = useMapStore(state => state.cancelDrawing)
  const startConnecting = useMapStore(state => state.startConnecting)
  const finishConnecting = useMapStore(state => state.finishConnecting)
  const cancelConnecting = useMapStore(state => state.cancelConnecting)
  const moveRegion = useMapStore(state => state.moveRegion)
  const deleteRegion = useMapStore(state => state.deleteRegion)
  const saveCurrentMap = useMapStore(state => state.saveCurrentMap)

  // 获取主题
  const resolvedMode = useThemeStore(state => state.resolvedMode)

  // 获取主题对应的背景色
  const getThemeBackgroundColor = useCallback(() => {
    if (resolvedMode === 'light') {
      return '#f5f5f5'
    }
    return '#1e1e2e'
  }, [resolvedMode])

  const getThemeBgRef = useRef(getThemeBackgroundColor)
  getThemeBgRef.current = getThemeBackgroundColor

  // 初始化 PixiJS Application
  useEffect(() => {
    if (!canvasRef.current || isInitializedRef.current) return

    const initApp = async () => {
      try {
        const app = new Application()

        await app.init({
          background: getThemeBgRef.current(),
          resizeTo: canvasRef.current!,
          antialias: true,
          resolution: window.devicePixelRatio || 1,
          autoDensity: true
        })

        canvasRef.current!.appendChild(app.canvas)
        appRef.current = app
        isInitializedRef.current = true

        // 创建图层
        const gridLayer = new Graphics()
        gridLayer.label = 'grid'

        const regionsLayer = new Container()
        regionsLayer.label = 'regions'

        const connectionsLayer = new Graphics()
        connectionsLayer.label = 'connections'

        const annotationsLayer = new Container()
        annotationsLayer.label = 'annotations'

        const drawingLayer = new Graphics()
        drawingLayer.label = 'drawing'

        app.stage.addChild(gridLayer)
        app.stage.addChild(connectionsLayer)
        app.stage.addChild(regionsLayer)
        app.stage.addChild(annotationsLayer)
        app.stage.addChild(drawingLayer)

        layersRef.current = {
          grid: gridLayer,
          regions: regionsLayer,
          connections: connectionsLayer,
          annotations: annotationsLayer,
          drawing: drawingLayer
        }

        // 设置交互 - 使用整个 stage 的 hitArea
        app.stage.eventMode = 'static'
        // 设置 hitArea 为整个可见区域
        app.stage.hitArea = app.screen
      } catch (error) {
        console.error('[MapCanvas] Failed to initialize PixiJS:', error)
      }
    }

    initApp()

    return () => {
      if (appRef.current) {
        try {
          appRef.current.destroy(true, { children: true })
        } catch {
          // 忽略销毁时的错误
        }
        appRef.current = null
        layersRef.current = null
        isInitializedRef.current = false
      }
    }
  }, [])

  // 主题变化时更新背景色
  useEffect(() => {
    if (!appRef.current || !isInitializedRef.current) return
    const bgColor = getThemeBackgroundColor()
    // PixiJS v8 使用 Color 对象设置背景色
    appRef.current.renderer.background.color = new Color(bgColor)
  }, [resolvedMode, getThemeBackgroundColor])

  // 渲染网格
  const renderGrid = useCallback((data: MapData) => {
    if (!layersRef.current || !appRef.current) return
    const { grid } = layersRef.current

    grid.clear()

    if (!data.showGrid) return

    const { canvasWidth, canvasHeight, gridSize, gridColor } = data

    // 解析颜色
    const color = parseInt(gridColor.replace('#', ''), 16)

    // 绘制垂直线
    for (let x = 0; x <= canvasWidth; x += gridSize) {
      grid.moveTo(x, 0)
      grid.lineTo(x, canvasHeight)
      grid.stroke({ color, width: 1, alpha: 0.3 })
    }

    // 绘制水平线
    for (let y = 0; y <= canvasHeight; y += gridSize) {
      grid.moveTo(0, y)
      grid.lineTo(canvasWidth, y)
      grid.stroke({ color, width: 1, alpha: 0.3 })
    }
  }, [])

  // 渲染单个板块
  const renderRegion = useCallback(
    (
      region: {
        id: string
        vertices: Point[]
        center: Point
        name: string
        color: string
        borderColor: string
        borderWidth: number
        opacity: number
      },
      isSelected: boolean
    ) => {
      const graphics = new Graphics()
      graphics.label = `region-${region.id}`

      const { vertices, color, borderColor, borderWidth, opacity, name, center } = region

      if (vertices.length < 3) return graphics

      // 解析颜色
      const fillColor = parseInt(color.replace('#', ''), 16)
      const strokeColor = parseInt(borderColor.replace('#', ''), 16)

      // 绘制多边形
      graphics.beginPath()
      graphics.moveTo(vertices[0].x, vertices[0].y)
      for (let i = 1; i < vertices.length; i++) {
        graphics.lineTo(vertices[i].x, vertices[i].y)
      }
      graphics.closePath()

      graphics.fill({ color: fillColor, alpha: opacity })
      graphics.stroke({
        color: isSelected ? 0xffffff : strokeColor,
        width: isSelected ? borderWidth + 2 : borderWidth
      })

      // 选中时绘制高亮边框
      if (isSelected) {
        graphics.stroke({ color: 0xffffff, width: 2, alpha: 0.8 })
      }

      // 绘制名称
      if (name && center) {
        const textColor = resolvedMode === 'light' ? 0x333333 : 0xffffff
        const text = new Text({
          text: name,
          style: {
            fontFamily: 'system-ui, sans-serif',
            fontSize: 14,
            fill: textColor,
            fontWeight: 'bold',
            dropShadow: {
              color: resolvedMode === 'light' ? 0xffffff : 0x000000,
              alpha: 0.5,
              blur: 2,
              distance: 1
            }
          }
        })
        text.anchor.set(0.5)
        text.position.set(center.x, center.y)
        graphics.addChild(text)
      }

      return graphics
    },
    [resolvedMode]
  )

  // 渲染所有板块
  const renderRegions = useCallback(
    (data: MapData) => {
      if (!layersRef.current) return
      const { regions: regionsLayer } = layersRef.current

      // 清除旧的板块
      regionsLayer.removeChildren()

      // 按 zIndex 排序
      const sortedRegions = [...data.regions].sort((a, b) => a.zIndex - b.zIndex)

      // 渲染每个板块
      for (const region of sortedRegions) {
        const isSelected = region.id === selectedRegionId
        const graphics = renderRegion(region, isSelected)

        // 设置交互
        graphics.eventMode = 'static'
        graphics.cursor = tool === 'select' ? 'move' : tool === 'draw' ? 'crosshair' : 'pointer'

        // 拖拽状态（使用闭包保存）
        let isDragging = false
        let dragStart: Point | null = null

        // 合并点击和拖拽事件
        graphics.on('pointerdown', (e: FederatedPointerEvent) => {
          e.stopPropagation()

          if (tool === 'select') {
            // 选择并准备拖拽
            selectRegion(region.id)
            isDragging = true
            dragStart = { x: e.globalX, y: e.globalY }
          } else if (tool === 'connect') {
            if (connectingFromId === null) {
              startConnecting(region.id)
            } else if (connectingFromId !== region.id) {
              finishConnecting(region.id)
            }
          } else if (tool === 'draw') {
            // 绘制模式下不处理板块点击
          }
        })

        graphics.on('pointermove', (e: FederatedPointerEvent) => {
          if (isDragging && dragStart && tool === 'select') {
            const dx = e.globalX - dragStart.x
            const dy = e.globalY - dragStart.y
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
              moveRegion(region.id, dx, dy)
              dragStart = { x: e.globalX, y: e.globalY }
            }
          }
        })

        graphics.on('pointerup', () => {
          isDragging = false
          dragStart = null
        })

        // 确保鼠标离开板块时也能结束拖拽
        graphics.on('pointerupoutside', () => {
          isDragging = false
          dragStart = null
        })

        regionsLayer.addChild(graphics)
      }
    },
    [
      selectedRegionId,
      tool,
      connectingFromId,
      selectRegion,
      startConnecting,
      finishConnecting,
      moveRegion,
      renderRegion
    ]
  )

  // 渲染连接线
  const renderConnections = useCallback((data: MapData) => {
    if (!layersRef.current) return
    const { connections: connectionsLayer } = layersRef.current
    const selectedConnectionId = useMapStore.getState().selectedConnectionId

    connectionsLayer.clear()

    for (const connection of data.connections) {
      const sourceRegion = data.regions.find(r => r.id === connection.sourceId)
      const targetRegion = data.regions.find(r => r.id === connection.targetId)

      if (!sourceRegion || !targetRegion) continue

      const start = sourceRegion.center
      const end = targetRegion.center

      if (!start || !end) continue

      // 解析颜色
      const color = parseInt(connection.color.replace('#', ''), 16)

      // 绘制连接线
      connectionsLayer.moveTo(start.x, start.y)
      connectionsLayer.lineTo(end.x, end.y)

      // 线条样式
      const width = connection.lineWidth
      const alpha = connection.id === selectedConnectionId ? 1 : 0.6

      connectionsLayer.stroke({ color, width, alpha })
    }
  }, [])

  // 渲染标注
  const renderAnnotations = useCallback((data: MapData) => {
    if (!layersRef.current) return
    const { annotations: annotationsLayer } = layersRef.current

    annotationsLayer.removeChildren()

    for (const annotation of data.annotations) {
      if (!annotation.text) continue

      const color = parseInt(annotation.color.replace('#', ''), 16)

      const text = new Text({
        text: annotation.text,
        style: {
          fontFamily: annotation.fontFamily,
          fontSize: annotation.fontSize,
          fill: color
        }
      })

      text.position.set(annotation.position.x, annotation.position.y)
      text.rotation = (annotation.rotation * Math.PI) / 180

      annotationsLayer.addChild(text)
    }
  }, [])

  // 渲染绘制中的多边形
  const renderDrawing = useCallback(() => {
    if (!layersRef.current || !appRef.current) return
    const { drawing } = layersRef.current

    drawing.clear()

    if (drawingVertices.length === 0) return

    // 绘制已有的线段
    drawing.moveTo(drawingVertices[0].x, drawingVertices[0].y)
    for (let i = 1; i < drawingVertices.length; i++) {
      drawing.lineTo(drawingVertices[i].x, drawingVertices[i].y)
    }

    // 绘制线条
    const lineColor = resolvedMode === 'light' ? 0x1890ff : 0x4a9eff
    drawing.stroke({ color: lineColor, width: 2 })

    // 绘制顶点
    const vertexColor = resolvedMode === 'light' ? 0x1890ff : 0xffffff
    const firstVertexColor = 0x52c41a // 绿色表示第一个顶点（可点击闭合）

    for (let i = 0; i < drawingVertices.length; i++) {
      const vertex = drawingVertices[i]
      // 如果有3个以上顶点，第一个顶点用绿色高亮表示可以点击闭合
      const isFirstVertex = i === 0 && drawingVertices.length >= 3
      const radius = isFirstVertex ? 8 : 4

      drawing.circle(vertex.x, vertex.y, radius)
      drawing.fill({ color: isFirstVertex ? firstVertexColor : vertexColor })

      // 第一个顶点添加外圈
      if (isFirstVertex) {
        drawing.circle(vertex.x, vertex.y, 12)
        drawing.stroke({ color: firstVertexColor, width: 2, alpha: 0.5 })
      }
    }
  }, [drawingVertices, resolvedMode])

  // 当地图数据变化时重新渲染
  useEffect(() => {
    if (!currentMap?.data || !layersRef.current || !appRef.current) return

    const data = currentMap.data

    // 渲染各图层
    renderGrid(data)
    renderConnections(data)
    renderRegions(data)
    renderAnnotations(data)
    renderDrawing()
  }, [
    currentMap,
    selectedRegionId,
    renderGrid,
    renderRegions,
    renderConnections,
    renderAnnotations,
    renderDrawing
  ])

  // 更新视图变换
  useEffect(() => {
    if (!appRef.current) return

    appRef.current.stage.scale.set(zoom)
    appRef.current.stage.position.set(panX, panY)
  }, [zoom, panX, panY])

  // 计算两点之间的距离
  const getDistance = (p1: Point, p2: Point): number => {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  // 处理画布事件
  useEffect(() => {
    if (!appRef.current || !isInitializedRef.current) return

    const app = appRef.current
    const canvas = app.canvas

    // 鼠标滚轮缩放
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? 0.9 : 1.1
      const newZoom = zoom * delta
      setZoom(newZoom)
    }

    // 鼠标按下
    const handlePointerDown = (e: FederatedPointerEvent) => {
      // 将屏幕坐标转换为画布坐标
      const localPos = {
        x: (e.globalX - panX) / zoom,
        y: (e.globalY - panY) / zoom
      }

      if (tool === 'draw') {
        // 检查是否点击了第一个顶点（闭合多边形）
        if (drawingVertices.length >= 3) {
          const firstVertex = drawingVertices[0]
          const distance = getDistance(localPos, firstVertex)

          // 如果点击位置接近第一个顶点，完成绘制（闭合多边形）
          if (distance < VERTEX_SNAP_DISTANCE / zoom) {
            finishDrawing()
            return
          }
        }

        // 否则添加新顶点
        addDrawingVertex(localPos)
      }

      // 空格键拖拽平移
      if (isSpacePressed) {
        isPanningRef.current = true
        panStartRef.current = { x: e.globalX, y: e.globalY }
        if (appRef.current) {
          appRef.current.stage.cursor = 'grabbing'
        }
      }
    }

    // 鼠标移动
    const handlePointerMove = (e: FederatedPointerEvent) => {
      if (isPanningRef.current) {
        const newPanX = panX + e.movementX
        const newPanY = panY + e.movementY
        setPan(newPanX, newPanY)
      }
    }

    // 鼠标释放
    const handlePointerUp = () => {
      isPanningRef.current = false
      if (appRef.current && !isSpacePressed) {
        appRef.current.stage.cursor = 'default'
      }
    }

    // 鼠标双击 - 完成绘制
    const handleDoubleClick = () => {
      if (tool === 'draw' && drawingVertices.length >= 3) {
        finishDrawing()
      }
    }

    // 键盘事件
    const handleKeyDown = (e: KeyboardEvent) => {
      // 空格键 - 开始平移
      if (e.code === 'Space' && !e.repeat) {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          e.preventDefault()
          setIsSpacePressed(true)
          if (appRef.current) {
            appRef.current.stage.cursor = 'grab'
          }
        }
      }
      // Enter - 完成绘制
      if (e.key === 'Enter' && tool === 'draw' && drawingVertices.length >= 3) {
        finishDrawing()
      }
      // Escape - 取消绘制
      if (e.key === 'Escape') {
        if (isDrawing) {
          cancelDrawing()
        }
        if (connectingFromId) {
          cancelConnecting()
        }
      }
      // Delete - 删除选中
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedRegionId) {
          deleteRegion(selectedRegionId)
        }
      }
      // Ctrl+S - 保存
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault()
        saveCurrentMap()
        onSave?.()
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false)
        isPanningRef.current = false
        if (appRef.current) {
          appRef.current.stage.cursor = 'default'
        }
      }
    }

    // 绑定事件
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    app.stage.on('pointerdown', handlePointerDown)
    app.stage.on('pointermove', handlePointerMove)
    app.stage.on('pointerup', handlePointerUp)
    app.stage.on('pointerupoutside', handlePointerUp)
    canvas.addEventListener('dblclick', handleDoubleClick)
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      // 检查 canvas 是否仍然存在
      if (canvas && canvas.parentNode) {
        canvas.removeEventListener('wheel', handleWheel)
        canvas.removeEventListener('dblclick', handleDoubleClick)
      }
      if (appRef.current) {
        appRef.current.stage.off('pointerdown', handlePointerDown)
        appRef.current.stage.off('pointermove', handlePointerMove)
        appRef.current.stage.off('pointerup', handlePointerUp)
        appRef.current.stage.off('pointerupoutside', handlePointerUp)
      }
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [
    tool,
    zoom,
    panX,
    panY,
    isDrawing,
    connectingFromId,
    selectedRegionId,
    drawingVertices,
    isSpacePressed,
    setZoom,
    setPan,
    addDrawingVertex,
    finishDrawing,
    cancelDrawing,
    startConnecting,
    finishConnecting,
    cancelConnecting,
    deleteRegion,
    saveCurrentMap,
    onSave
  ])

  return <div ref={canvasRef} className={styles.canvasContainer} />
}
