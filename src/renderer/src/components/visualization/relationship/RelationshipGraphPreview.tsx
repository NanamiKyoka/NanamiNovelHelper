/**
 * 关系图预览组件（只读模式）
 * 基于 AntV G6 v5 重新开发
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Empty, Spin, Typography, theme, Tooltip } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, EditOutlined, ExpandOutlined } from '@ant-design/icons'
import { Graph } from '@antv/g6'
import { useRelationshipStore } from '@stores/relationshipStore'
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
  onEnterEditMode,
}: RelationshipGraphPreviewProps): JSX.Element {
  const { token } = theme.useToken()
  const isDarkMode = token.colorBgContainer === '#141414' ||
                     token.colorBgContainer === '#1f1f1f' ||
                     token.colorTextBase === '#fff'

  const {
    currentGraph,
    isLoading,
    loadGraph,
  } = useRelationshipStore()

  const graphRef = useRef<Graph | null>(null)
  const [zoom, setZoom] = useState(1)
  const [graphReady, setGraphReady] = useState(false)

  // 获取所有关系类型
  const relationTypes: RelationType[] = currentGraph?.customRelationTypes
    ? [...BUILTIN_RELATION_TYPES, ...currentGraph.customRelationTypes]
    : [...BUILTIN_RELATION_TYPES]

  // 加载关系图数据
  useEffect(() => {
    loadGraph(graphId)
  }, [graphId, loadGraph])

  // 使用 callback ref 来初始化图
  const containerRef = useCallback((container: HTMLDivElement | null) => {
    if (!container) return

    // 如果已经有图实例，不重复创建
    if (graphRef.current) return

    // 使用 setTimeout 确保容器有尺寸
    setTimeout(() => {
      const width = container.clientWidth
      const height = container.clientHeight

      if (width === 0 || height === 0) return

      // 主题相关颜色
      const nodeLabelColor = isDarkMode ? '#e0e0e0' : '#333333'
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
            fill: (d: any) => d.style?.fill || '#1890ff',
            stroke: (d: any) => d.style?.stroke || '#1890ff',
            lineWidth: 2,
            cursor: 'pointer',
            labelText: (d: any) => d.data?.label || '',
            labelFill: '#ffffff',
            labelFontSize: 11,
            labelFontWeight: '500',
            labelPlacement: 'center',
            labelMaxWidth: 40,
            labelWordWrap: true,
          },
          state: {
            selected: {
              lineWidth: 3,
              shadowColor: '#1890ff',
              shadowBlur: 10,
            },
            hover: {
              lineWidth: 3,
            },
          },
        },

        // 边配置
        edge: {
          type: 'quadratic',
          style: {
            stroke: (d: any) => d.style?.stroke || '#999999',
            lineWidth: (d: any) => d.style?.lineWidth || 2,
            endArrow: true,
            endArrowSize: 8,
            endArrowFill: (d: any) => d.style?.stroke || '#999999',
            endArrowStroke: (d: any) => d.style?.stroke || '#999999',
            cursor: 'pointer',
            labelText: (d: any) => d.data?.label || '',
            labelFill: edgeLabelColor,
            labelFontSize: 10,
            labelBackground: true,
            labelBackgroundFill: labelBgColor,
            labelBackgroundOpacity: 0.9,
            labelBackgroundPadding: [2, 4, 2, 4],
          },
          state: {
            selected: {
              lineWidth: 3,
            },
            hover: {
              lineWidth: 3,
            },
          },
        },

        // 交互行为
        behaviors: [
          'drag-canvas',
          'zoom-canvas',
        ],
      })

      graphRef.current = graph

      // 渲染
      graph.render().then(() => {
        setGraphReady(true)
      }).catch(() => {
        // 忽略错误
      })
    }, 100)
  }, [isDarkMode])

  // 清理
  useEffect(() => {
    return () => {
      if (graphRef.current && !graphRef.current.destroyed) {
        graphRef.current.destroy()
        graphRef.current = null
      }
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
      const styleData: any = {
        fill: node.color || '#1890ff',
        stroke: node.color || '#1890ff',
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
          label: node.name,
        },
        style: styleData,
      }
    })

    // 转换边数据
    const edges = (currentGraph.edges || []).map((edge) => {
      const relationType = relationTypes.find(t => t.id === edge.relationTypeId)
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: {
          label: relationType?.name || edge.label || '',
        },
        style: {
          stroke: relationType?.color || '#999999',
          lineWidth: relationType?.lineWidth || 2,
        },
      }
    })

    // 设置数据并渲染
    graph.setData({ nodes, edges })
    graph.render().then(() => {
      if (!graph.destroyed && nodes.length > 0) {
        graph.fitView(40)
        setZoom(graph.getZoom())
      }
    }).catch(() => {
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
          <Button onClick={onClose}>返回</Button>
          <Title level={5} className={styles.title}>{currentGraph.name}</Title>
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
        <div ref={containerRef} className={styles.canvas} />
      </div>

      {/* 底部统计 */}
      <div className={styles.statsBar}>
        <span>人物: {currentGraph.nodeCount}</span>
        <span>关系: {currentGraph.edgeCount}</span>
      </div>
    </div>
  )
}

export default RelationshipGraphPreview
