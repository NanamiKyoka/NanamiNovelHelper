/**
 * 关系图预览组件（只读模式）
 * 基于 AntV G6 v5 重新开发
 */

import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Button, Empty, Spin, Typography, theme, Tooltip, Dropdown, App } from 'antd'
import type { MenuProps } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  EditOutlined,
  ExpandOutlined,
  ArrowLeftOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { Graph } from '@antv/g6'
import type { NodeData, EdgeData } from '@antv/g6'
import { useRelationshipStore } from '@stores/relationshipStore'
import { getThemeColor } from '@utils/theme'
import { BUILTIN_RELATION_TYPES, type RelationType } from '@types/relationship'
import styles from './RelationshipGraphPreview.module.css'

const { Title } = Typography

interface RelationshipGraphPreviewProps {
  graphId: string
  onClose: () => void
  onEnterEditMode: () => void
}

function RelationshipGraphPreview({
  graphId,
  onClose,
  onEnterEditMode
}: RelationshipGraphPreviewProps): JSX.Element {
  const { token } = theme.useToken()
  const { message: _message } = App.useApp()
  const isDarkMode =
    token.colorBgContainer === '#141414' ||
    token.colorBgContainer === '#1f1f1f' ||
    token.colorTextBase === '#fff'

  const { currentGraph, isLoading, loadGraph } = useRelationshipStore()

  const graphRef = useRef<Graph | null>(null)
  const [zoom, setZoom] = useState(1)
  const [graphReady, setGraphReady] = useState(false)

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
  }>({ visible: false, x: 0, y: 0 })

  // 获取所有关系类型
  const relationTypes: RelationType[] = useMemo(
    () =>
      currentGraph?.customRelationTypes
        ? [...BUILTIN_RELATION_TYPES, ...currentGraph.customRelationTypes]
        : [...BUILTIN_RELATION_TYPES],
    [currentGraph?.customRelationTypes]
  )

  // 加载关系图数据
  useEffect(() => {
    loadGraph(graphId)
  }, [graphId, loadGraph])

  // 使用 callback ref 来初始化图
  const containerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) return

      // 如果已经有图实例，不重复创建
      if (graphRef.current) return

      const tryInit = (retries: number) => {
        const width = container.clientWidth
        const height = container.clientHeight

        if (width === 0 || height === 0) {
          if (retries > 0) {
            requestAnimationFrame(() => tryInit(retries - 1))
          }
          return
        }

        // 主题相关颜色
        const primaryColor = getThemeColor('--color-primary')
        const edgeLabelColor = isDarkMode ? '#b0b0b0' : '#666666'
        const labelBgColor = isDarkMode ? '#1f1f1f' : '#ffffff'

        // 创建图实例 - 不使用力导向布局，使用固定位置
        const graph = new Graph({
          container,
          width,
          height,
          autoFit: 'view',
          padding: 20,
          data: { nodes: [], edges: [] },

          // 节点配置
          node: {
            type: 'circle',
            style: {
              size: 50,
              fill: (d: NodeData) => d.style?.fill || primaryColor,
              stroke: (d: NodeData) => d.style?.stroke || primaryColor,
              lineWidth: 2,
              cursor: 'pointer',
              labelText: (d: NodeData) => (d.data?.label as string) || '',
              labelFill: '#ffffff',
              labelFontSize: 11,
              labelFontWeight: '500',
              labelPlacement: 'center',
              labelMaxWidth: 40,
              labelWordWrap: true
            },
            state: {
              selected: {
                lineWidth: 3,
                shadowColor: primaryColor,
                shadowBlur: 10
              },
              hover: {
                lineWidth: 3
              }
            }
          },

          // 边配置
          edge: {
            type: 'quadratic',
            style: {
              stroke: (d: EdgeData) => d.style?.stroke || '#999999',
              lineWidth: (d: EdgeData) => d.style?.lineWidth || 2,
              endArrow: true,
              endArrowSize: 8,
              endArrowFill: (d: EdgeData) => d.style?.stroke || '#999999',
              endArrowStroke: (d: EdgeData) => d.style?.stroke || '#999999',
              cursor: 'pointer',
              labelText: (d: EdgeData) => (d.data?.label as string) || '',
              labelFill: edgeLabelColor,
              labelFontSize: 10,
              labelBackground: true,
              labelBackgroundFill: labelBgColor,
              labelBackgroundOpacity: 0.9,
              labelBackgroundPadding: [2, 4, 2, 4]
            },
            state: {
              selected: {
                lineWidth: 3
              },
              hover: {
                lineWidth: 3
              }
            }
          },

          // 交互行为
          behaviors: ['drag-canvas', 'zoom-canvas']
        })

        graphRef.current = graph

        // 渲染
        graph
          .render()
          .then(() => {
            if (!graph.destroyed) {
              setGraphReady(true)
            }
          })
          .catch(() => {
            // 忽略错误
          })
      }

      // 开始初始化尝试，最多重试 20 次
      tryInit(20)
    },
    [isDarkMode]
  )

  // 清理
  useEffect(() => {
    return () => {
      // 延迟销毁，让新组件有时间初始化
      setTimeout(() => {
        if (graphRef.current && !graphRef.current.destroyed) {
          graphRef.current.destroy()
          graphRef.current = null
        }
      }, 0)
    }
  }, [])

  // 更新数据
  useEffect(() => {
    const graph = graphRef.current
    if (!graph || graph.destroyed || !currentGraph || !graphReady) return

    if (!currentGraph.nodes || currentGraph.nodes.length === 0) return

    // 计算是否有位置数据
    const hasPositions = currentGraph.nodes.some(n => n.x !== undefined && n.y !== undefined)

    // 转换节点数据 - 包含位置
    const nodes = currentGraph.nodes.map((node, index) => {
      const styleData: Record<string, unknown> = {
        fill: node.color || getThemeColor('--color-primary'),
        stroke: node.color || getThemeColor('--color-primary')
      }

      // 如果有位置数据，使用固定位置；否则使用网格布局
      if (node.x !== undefined && node.y !== undefined) {
        styleData.x = node.x
        styleData.y = node.y
      } else if (!hasPositions) {
        // 新节点没有位置时，使用简单的网格布局
        const cols = Math.ceil(Math.sqrt(currentGraph.nodes.length))
        const row = Math.floor(index / cols)
        const col = index % cols
        styleData.x = 100 + col * 120
        styleData.y = 100 + row * 120
      }

      return {
        id: node.id,
        data: {
          label: node.name
        },
        style: styleData
      }
    })

    // 转换边数据
    const edges = (currentGraph.edges || []).map(edge => {
      const relationType = relationTypes.find(t => t.id === edge.relationTypeId)
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: {
          label: relationType?.name || edge.label || ''
        },
        style: {
          stroke: relationType?.color || '#999999',
          lineWidth: relationType?.lineWidth || 2
        }
      }
    })

    // 设置数据并渲染
    graph.setData({ nodes, edges })
    graph
      .render()
      .then(() => {
        if (!graph.destroyed && nodes.length > 0) {
          graph.fitView(40)
          setZoom(graph.getZoom())
        }
      })
      .catch(() => {
        // 忽略错误
      })
  }, [currentGraph, relationTypes, graphReady])

  // 缩放控制
  const handleZoomIn = () => {
    if (graphRef.current && !graphRef.current.destroyed) {
      const currentZoom = graphRef.current.getZoom()
      const newZoom = Math.min(currentZoom * 1.2, 3)
      graphRef.current.zoomTo(newZoom)
      setZoom(newZoom)
    }
  }

  const handleZoomOut = () => {
    if (graphRef.current && !graphRef.current.destroyed) {
      const currentZoom = graphRef.current.getZoom()
      const newZoom = Math.max(currentZoom / 1.2, 0.3)
      graphRef.current.zoomTo(newZoom)
      setZoom(newZoom)
    }
  }

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY })
  }, [])

  const handleResetView = useCallback(() => {
    if (!graphRef.current || graphRef.current.destroyed) return
    graphRef.current.zoomTo(1)
    const canvas = graphRef.current.getCanvas()
    const width = canvas.getConfig().width || 800
    const height = canvas.getConfig().height || 600
    graphRef.current.translate(width / 2, height / 2)
    setZoom(1)
    setContextMenu(prev => ({ ...prev, visible: false }))
  }, [])

  const canvasContextMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '进入编辑模式',
      onClick: () => {
        onEnterEditMode()
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    },
    { type: 'divider' },
    {
      key: 'fitView',
      icon: <ExpandOutlined />,
      label: '适应画布',
      onClick: () => {
        handleFitView()
        setContextMenu(prev => ({ ...prev, visible: false }))
      }
    },
    {
      key: 'resetView',
      icon: <ReloadOutlined />,
      label: '重置视图',
      onClick: handleResetView
    }
  ]
  const handleFitView = () => {
    if (graphRef.current && !graphRef.current.destroyed) {
      graphRef.current.fitView(40)
      setZoom(graphRef.current.getZoom())
    }
  }

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (!currentGraph) {
    return (
      <div className={styles.container}>
        <div className={styles.emptyState}>
          <Empty description="关系图不存在" />
          <Button onClick={onClose}>返回列表</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 顶部工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button icon={<ArrowLeftOutlined />} onClick={onClose}>
            返回
          </Button>
          <Title level={5} className={styles.title}>
            {currentGraph.name}
          </Title>
        </div>
        <div className={styles.toolbarRight}>
          <div className={styles.zoomControls}>
            <Tooltip title="缩小">
              <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} size="small" />
            </Tooltip>
            <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
            <Tooltip title="放大">
              <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} size="small" />
            </Tooltip>
            <Tooltip title="适应画布">
              <Button icon={<ExpandOutlined />} onClick={handleFitView} size="small" />
            </Tooltip>
          </div>
          <Button type="primary" icon={<EditOutlined />} onClick={onEnterEditMode}>
            编辑
          </Button>
        </div>
      </div>

      {/* 画布区域 */}
      <div className={styles.canvasContainer}>
        <div ref={containerRef} className={styles.canvas} onContextMenu={handleCanvasContextMenu} />
      </div>

      <Dropdown
        menu={{ items: canvasContextMenuItems }}
        open={contextMenu.visible}
        onOpenChange={open => {
          if (!open) setContextMenu(prev => ({ ...prev, visible: false }))
        }}
        overlayStyle={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 10001
        }}
      >
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }} />
      </Dropdown>

      {/* 底部统计 */}
      <div className={styles.statsBar}>
        <span>人物: {currentGraph.nodeCount}</span>
        <span>关系: {currentGraph.edgeCount}</span>
      </div>
    </div>
  )
}

export default RelationshipGraphPreview
