/**
 * 组织架构图预览组件（只读模式）
 * 基于 AntV G6 v5 实现
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { Button, Empty, Spin, Typography, theme, Tooltip } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, EditOutlined, ExpandOutlined, TeamOutlined } from '@ant-design/icons'
import { Graph } from '@antv/g6'
import { useOrganizationStore } from '@stores/organizationStore'
import type { OrganizationNode, OrganizationNodeStyle } from '@types/organization'
import styles from './OrganizationGraphPreview.module.css'

const { Title } = Typography

interface OrganizationGraphPreviewProps {
  graphId: string
  onClose: () => void
  onEnterEditMode: () => void
}

// 计算树形布局位置
function calculateTreePositions(
  nodes: OrganizationNode[],
  nodeWidth: number,
  nodeHeight: number,
  hGap: number,
  vGap: number
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>()
  
  // 构建父子关系映射
  const childrenMap = new Map<string | undefined, OrganizationNode[]>()
  nodes.forEach(node => {
    const parentId = node.parentId || undefined
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, [])
    }
    childrenMap.get(parentId)!.push(node)
  })
  
  // 按 order 排序
  childrenMap.forEach(children => {
    children.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  })
  
  // 计算每个节点的子树宽度
  const getSubtreeWidth = (nodeId: string | undefined): number => {
    const children = childrenMap.get(nodeId) || []
    if (children.length === 0) {
      return nodeWidth
    }
    const childrenWidth = children.reduce((sum, child) => sum + getSubtreeWidth(child.id) + hGap, -hGap)
    return Math.max(nodeWidth, childrenWidth)
  }
  
  // 递归设置位置
  const setPositions = (nodeId: string | undefined, x: number, y: number) => {
    const children = childrenMap.get(nodeId) || []
    
    if (nodeId) {
      positions.set(nodeId, { x, y })
    }
    
    if (children.length > 0) {
      let currentX = x - (getSubtreeWidth(nodeId) - nodeWidth) / 2
      
      children.forEach(child => {
        const childWidth = getSubtreeWidth(child.id)
        const childX = currentX + (childWidth - nodeWidth) / 2
        setPositions(child.id, childX, y + nodeHeight + vGap)
        currentX += childWidth + hGap
      })
    }
  }
  
  // 获取根节点
  const rootNodes = childrenMap.get(undefined) || []
  
  if (rootNodes.length === 0) {
    return positions
  }
  
  // 计算总宽度
  const totalWidth = rootNodes.reduce((sum, node) => sum + getSubtreeWidth(node.id) + hGap, -hGap)
  let startX = 400 - totalWidth / 2
  
  rootNodes.forEach(node => {
    const nodeWidth_ = getSubtreeWidth(node.id)
    setPositions(node.id, startX + (nodeWidth_ - nodeWidth) / 2, 50)
    startX += nodeWidth_ + hGap
  })
  
  return positions
}

function OrganizationGraphPreview({
  graphId,
  onClose,
  onEnterEditMode,
}: OrganizationGraphPreviewProps): JSX.Element {
  const { token } = theme.useToken()

  const {
    currentGraph,
    isLoading,
    loadGraph,
  } = useOrganizationStore()

  const graphRef = useRef<Graph | null>(null)
  const [zoom, setZoom] = useState(1)
  const [graphReady, setGraphReady] = useState(false)
  const [nodeStyle, setNodeStyle] = useState<OrganizationNodeStyle>('simple')

  // 加载组织架构图数据
  useEffect(() => {
    loadGraph(graphId)
  }, [graphId, loadGraph])

  // 使用 callback ref 来初始化图
  const containerRef = useCallback((container: HTMLDivElement | null) => {
    if (!container) return
    if (graphRef.current) return

    setTimeout(() => {
      const width = container.clientWidth
      const height = container.clientHeight

      if (width === 0 || height === 0) return

      const nodeSize = nodeStyle === 'card' ? [180, 70] : [120, 40]
      const nodeRadius = nodeStyle === 'card' ? 8 : 4

      const graph = new Graph({
        container,
        width,
        height,
        autoFit: 'view',
        padding: 20,
        data: { nodes: [], edges: [] },

        node: {
          type: 'rect',
          style: {
            size: nodeSize,
            fill: (d: any) => d.style?.fill || token.colorPrimary,
            stroke: (d: any) => d.style?.stroke || token.colorPrimary,
            lineWidth: 2,
            radius: nodeRadius,
            cursor: 'default',
            labelText: (d: any) => {
              if (nodeStyle === 'card' && d.data?.description) {
                return `${d.data.label}\n${d.data.description}`
              }
              return d.data?.label || ''
            },
            labelFill: '#ffffff',
            labelFontSize: nodeStyle === 'card' ? 13 : 13,
            labelFontWeight: nodeStyle === 'card' ? '600' : '500',
            labelPlacement: 'center',
            labelMaxWidth: nodeStyle === 'card' ? 160 : 100,
            labelLineHeight: nodeStyle === 'card' ? 18 : 16,
            labelWordWrap: true,
          },
          state: {
            hover: {
              lineWidth: 3,
            },
          },
        },

        edge: {
          type: 'polyline',
          style: {
            stroke: '#999999',
            lineWidth: 2,
            endArrow: false,
          },
          state: {
            hover: { lineWidth: 3 },
          },
        },

        behaviors: [
          'drag-canvas',
          'zoom-canvas',
        ],
      })

      graphRef.current = graph

      graph.render().then(() => {
        setGraphReady(true)
      }).catch(() => {})
    }, 100)
  }, [token.colorPrimary, nodeStyle])

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

    const nodeW = nodeStyle === 'card' ? 180 : 120
    const nodeH = nodeStyle === 'card' ? 70 : 40
    const vGap = nodeStyle === 'card' ? 60 : 50
    const positions = calculateTreePositions(currentGraph.nodes, nodeW, nodeH, 30, vGap)

    // 转换节点数据
    const nodes = currentGraph.nodes.map((node) => {
      const pos = positions.get(node.id) || { x: 100, y: 100 }
      return {
        id: node.id,
        data: {
          label: node.name,
          description: node.description,
        },
        style: {
          fill: node.color || token.colorPrimary,
          stroke: node.color || token.colorPrimary,
          x: pos.x,
          y: pos.y,
        },
      }
    })

    // 转换边数据
    const edges = currentGraph.nodes
      .filter(n => n.parentId)
      .map((node) => ({
        id: `edge-${node.id}`,
        source: node.parentId!,
        target: node.id,
      }))

    graph.setData({ nodes, edges })
    graph.render().then(() => {
      if (!graph.destroyed && nodes.length > 0) {
        graph.fitView(40)
        setZoom(graph.getZoom())
      }
    }).catch(() => {})
  }, [currentGraph, graphReady, nodeStyle, token.colorPrimary])

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
          <Empty description="组织架构图不存在" />
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
        <span><TeamOutlined /> 节点: {currentGraph.nodeCount}</span>
      </div>
    </div>
  )
}

export default OrganizationGraphPreview
