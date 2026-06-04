/**
 * 组织架构图预览组件
 * 基于 AntV G6 v5 实现 Canvas 视图
 * 支持树形列表拖拽排序（编辑模式）
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Button, Empty, Spin, Typography, theme, Tooltip, App, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  EditOutlined,
  ExpandOutlined,
  TeamOutlined,
  HolderOutlined,
  CheckOutlined,
  UnorderedListOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { Graph } from '@antv/g6'
import type { NodeData } from '@antv/g6'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useOrganizationStore } from '@stores/organizationStore'
import type { OrganizationNode, OrganizationNodeStyle } from '@shared/organization'
import styles from './OrganizationGraphPreview.module.css'

const { Title, Text } = Typography

interface OrganizationGraphPreviewProps {
  graphId: string
  onClose: () => void
  onEnterEditMode: () => void
}

// 视图模式类型
type ViewMode = 'canvas' | 'list'

// 可排序的树节点组件
interface SortableTreeNodeProps {
  node: OrganizationNode
  depth: number
  isEditMode: boolean
  children: OrganizationNode[]
  allNodes: OrganizationNode[]
}

function SortableTreeNode({
  node,
  depth,
  isEditMode,
  children,
  allNodes
}: SortableTreeNodeProps): JSX.Element {
  const { token } = theme.useToken()
  const [expanded, setExpanded] = useState(true)
  const hasChildren = children.length > 0

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  // 缩进样式
  const indentStyle = {
    paddingLeft: depth * 24
  }

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={styles.treeNodeRow}
        style={{
          ...indentStyle,
          backgroundColor: isDragging ? token.colorBgTextHover : 'transparent'
        }}
      >
        {/* 展开/折叠按钮 */}
        {hasChildren ? (
          <span
            className={styles.expandBtn}
            onClick={() => setExpanded(!expanded)}
            style={{ marginRight: 4 }}
          >
            {expanded ? '▼' : '▶'}
          </span>
        ) : (
          <span style={{ width: 16, marginRight: 4 }} />
        )}

        {/* 拖拽手柄 */}
        {isEditMode && (
          <div className={styles.dragHandle} {...attributes} {...listeners}>
            <HolderOutlined style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} />
          </div>
        )}

        {/* 节点颜色标记 */}
        <div
          className={styles.nodeColor}
          style={{ backgroundColor: node.color || token.colorPrimary }}
        />

        {/* 节点名称 */}
        <span className={styles.nodeName}>{node.name}</span>

        {/* 节点描述 */}
        {node.description && (
          <Text type="secondary" className={styles.nodeDesc}>
            {node.description}
          </Text>
        )}
      </div>

      {/* 子节点 */}
      {expanded && hasChildren && (
        <div className={styles.treeNodeChildren}>
          {children
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(child => {
              const grandChildren = allNodes.filter(n => n.parentId === child.id)
              return (
                <SortableTreeNode
                  key={child.id}
                  node={child}
                  depth={depth + 1}
                  isEditMode={isEditMode}
                  children={grandChildren}
                  allNodes={allNodes}
                />
              )
            })}
        </div>
      )}
    </div>
  )
}

// 拖拽覆盖层节点
interface DragOverlayNodeProps {
  node: OrganizationNode
}

function DragOverlayNode({ node }: DragOverlayNodeProps): JSX.Element {
  const { token } = theme.useToken()

  return (
    <div className={styles.dragOverlayNode}>
      <div className={styles.dragHandle}>
        <HolderOutlined style={{ color: 'var(--text-tertiary)' }} />
      </div>
      <div
        className={styles.nodeColor}
        style={{ backgroundColor: node.color || token.colorPrimary }}
      />
      <span className={styles.nodeName}>{node.name}</span>
    </div>
  )
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
    const childrenWidth = children.reduce(
      (sum, child) => sum + getSubtreeWidth(child.id) + hGap,
      -hGap
    )
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
  onEnterEditMode
}: OrganizationGraphPreviewProps): JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()

  const { currentGraph, isLoading, loadGraph, updateNode } = useOrganizationStore()

  const graphRef = useRef<Graph | null>(null)
  const [zoom, setZoom] = useState(1)
  const [graphReady, setGraphReady] = useState(false)
  const [nodeStyle] = useState<OrganizationNodeStyle>('simple')

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('canvas')
  // 编辑模式（只在列表模式下可用）
  const [isEditMode, setIsEditMode] = useState(false)

  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
  }>({ visible: false, x: 0, y: 0 })

  // DnD 传感器
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // 加载组织架构图数据
  useEffect(() => {
    loadGraph(graphId)
  }, [graphId, loadGraph])

  // 获取所有节点和根节点
  const allNodes = useMemo(() => currentGraph?.nodes || [], [currentGraph?.nodes])
  const rootNodes = useMemo(() => {
    return allNodes.filter(n => !n.parentId).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [allNodes])

  // 当前拖拽的节点
  const activeNode = activeId ? allNodes.find(n => n.id === activeId) : null

  // 使用 callback ref 来初始化图
  const containerRef = useCallback(
    (container: HTMLDivElement | null) => {
      if (!container) return
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
              fill: (d: NodeData) => d.style?.fill || token.colorPrimary,
              stroke: (d: NodeData) => d.style?.stroke || token.colorPrimary,
              lineWidth: 2,
              radius: nodeRadius,
              cursor: 'default',
              labelText: (d: NodeData) => {
                if (nodeStyle === 'card' && d.data?.description) {
                  return `${d.data.label as string}\n${d.data.description as string}`
                }
                return (d.data?.label as string) || ''
              },
              labelFill: '#ffffff',
              labelFontSize: nodeStyle === 'card' ? 13 : 13,
              labelFontWeight: nodeStyle === 'card' ? '600' : '500',
              labelPlacement: 'center',
              labelMaxWidth: nodeStyle === 'card' ? 160 : 100,
              labelLineHeight: nodeStyle === 'card' ? 18 : 16,
              labelWordWrap: true
            },
            state: {
              hover: {
                lineWidth: 3
              }
            }
          },

          edge: {
            type: 'polyline',
            style: {
              stroke: '#999999',
              lineWidth: 2,
              endArrow: false
            },
            state: {
              hover: { lineWidth: 3 }
            }
          },

          behaviors: ['drag-canvas', 'zoom-canvas']
        })

        graphRef.current = graph

        graph
          .render()
          .then(() => {
            if (!graph.destroyed) {
              setGraphReady(true)
            }
          })
          .catch(error => {
            if (!graph.destroyed) {
              console.error('Failed to render organization graph preview:', error)
            }
          })
      }

      // 开始初始化尝试，最多重试 20 次（约 330ms）
      tryInit(20)
    },
    [token.colorPrimary, nodeStyle]
  )

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
    const nodes = currentGraph.nodes.map(node => {
      const pos = positions.get(node.id) || { x: 100, y: 100 }
      return {
        id: node.id,
        data: {
          label: node.name,
          description: node.description
        },
        style: {
          fill: node.color || token.colorPrimary,
          stroke: node.color || token.colorPrimary,
          x: pos.x,
          y: pos.y
        }
      }
    })

    // 转换边数据
    const edges = currentGraph.nodes
      .filter(n => n.parentId)
      .map(node => ({
        id: `edge-${node.id}`,
        source: node.parentId as string,
        target: node.id
      }))

    graph.setData({ nodes, edges })
    graph
      .render()
      .then(() => {
        if (!graph.destroyed && nodes.length > 0) {
          graph.fitView(40)
          setZoom(graph.getZoom())
        }
      })
      .catch(error => {
        console.error('Failed to update organization graph preview data:', error)
        // 预览模式下不显示错误提示
      })
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

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])

  // 拖拽结束 - 同级节点排序
  const handleDragEnd = useCallback(
    async (event: DragEndEvent): Promise<void> => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const activeNode = allNodes.find(n => n.id === active.id)
        const overNode = allNodes.find(n => n.id === over.id)

        // 只允许同级节点排序
        if (activeNode && overNode && activeNode.parentId === overNode.parentId) {
          const parentId = activeNode.parentId
          const siblings = allNodes
            .filter(n => n.parentId === parentId)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))

          const oldIndex = siblings.findIndex(s => s.id === active.id)
          const newIndex = siblings.findIndex(s => s.id === over.id)

          if (oldIndex !== -1 && newIndex !== -1) {
            // 重新排列同级节点
            const newSiblings = [...siblings]
            const [movedItem] = newSiblings.splice(oldIndex, 1)
            newSiblings.splice(newIndex, 0, movedItem)

            // 批量更新 order
            try {
              await Promise.all(
                newSiblings.map((sibling, index) => updateNode(sibling.id, { order: index }))
              )
              message.success('排序已保存')
            } catch (error) {
              console.error('Failed to reorder nodes:', error)
              message.error('排序保存失败')
            }
          }
        } else {
          message.warning('只能在同级节点之间排序')
        }
      }

      setActiveId(null)
    },
    [allNodes, updateNode, message]
  )

  // 切换视图模式时退出编辑模式
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode)
    if (mode === 'canvas') {
      setIsEditMode(false)
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
          <Button icon={<ArrowLeftOutlined />} onClick={onClose}>
            返回
          </Button>
          <Title level={5} className={styles.title}>
            {currentGraph.name}
          </Title>
        </div>
        <div className={styles.toolbarCenter}>
          <div className={styles.viewModeSwitch}>
            <Tooltip title="图形视图">
              <Button
                type={viewMode === 'canvas' ? 'primary' : 'text'}
                icon={<AppstoreOutlined />}
                onClick={() => handleViewModeChange('canvas')}
              />
            </Tooltip>
            <Tooltip title="列表视图">
              <Button
                type={viewMode === 'list' ? 'primary' : 'text'}
                icon={<UnorderedListOutlined />}
                onClick={() => handleViewModeChange('list')}
              />
            </Tooltip>
          </div>
        </div>
        <div className={styles.toolbarRight}>
          {viewMode === 'canvas' && (
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
          )}
          {viewMode === 'list' && (
            <>
              <Button
                type={isEditMode ? 'primary' : 'default'}
                icon={isEditMode ? <CheckOutlined /> : <EditOutlined />}
                onClick={() => setIsEditMode(!isEditMode)}
              >
                {isEditMode ? '完成' : '排序'}
              </Button>
            </>
          )}
          <Button type="primary" icon={<EditOutlined />} onClick={onEnterEditMode}>
            编辑
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      {viewMode === 'canvas' ? (
        <>
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
        </>
      ) : (
        <div className={styles.listContainer}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={allNodes.map(n => n.id)} strategy={verticalListSortingStrategy}>
              <div className={styles.treeList}>
                {rootNodes.length === 0 ? (
                  <div className={styles.emptyList}>
                    <Empty description="暂无节点" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  </div>
                ) : (
                  rootNodes.map(node => {
                    const children = allNodes.filter(n => n.parentId === node.id)
                    return (
                      <SortableTreeNode
                        key={node.id}
                        node={node}
                        depth={0}
                        isEditMode={isEditMode}
                        children={children}
                        allNodes={allNodes}
                      />
                    )
                  })
                )}
              </div>
            </SortableContext>

            <DragOverlay>{activeNode ? <DragOverlayNode node={activeNode} /> : null}</DragOverlay>
          </DndContext>

          {isEditMode && (
            <div className={styles.editHint}>
              <Text type="secondary">拖拽节点可调整同级顺序，跨级拖拽无效</Text>
            </div>
          )}
        </div>
      )}

      {/* 底部统计 */}
      <div className={styles.statsBar}>
        <span>
          <TeamOutlined /> 节点: {currentGraph.nodeCount}
        </span>
        {viewMode === 'list' && isEditMode && (
          <span style={{ color: token.colorPrimary }}>排序模式</span>
        )}
      </div>
    </div>
  )
}

export default OrganizationGraphPreview
