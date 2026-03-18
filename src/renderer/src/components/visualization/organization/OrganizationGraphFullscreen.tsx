/**
 * 组织架构图全屏编辑器
 * 基于 AntV G6 v5 实现
 * 完全参考 RelationshipGraphFullscreen 实现 - 不使用自动布局
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Typography,
  Button,
  Input,
  Modal,
  App,
  Empty,
  Spin,
  ColorPicker,
  theme,
  Tooltip,
  Segmented,
  Dropdown,
} from 'antd'
import type { MenuProps } from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  SaveOutlined,
  EditOutlined,
  ExpandOutlined,
  UserAddOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Graph } from '@antv/g6'
import { useOrganizationStore } from '@stores/organizationStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import type { OrganizationNode, OrganizationNodeStyle } from '@types/organization'
import styles from './OrganizationGraphFullscreen.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface OrganizationGraphFullscreenProps {
  graphId: string
  onBack: () => void
}

interface NodeModalState {
  visible: boolean
  mode: 'create' | 'edit'
  node: Partial<OrganizationNode> | null
  parentId?: string | null
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
  let startX = 400 - totalWidth / 2 // 从画布中心开始
  
  rootNodes.forEach(node => {
    const nodeWidth_ = getSubtreeWidth(node.id)
    setPositions(node.id, startX + (nodeWidth_ - nodeWidth) / 2, 50)
    startX += nodeWidth_ + hGap
  })
  
  return positions
}

function OrganizationGraphFullscreen({
  graphId,
  onBack,
}: OrganizationGraphFullscreenProps): JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()

  const {
    currentGraph,
    isLoading,
    loadGraph,
    addNode,
    updateNode,
    deleteNode,
    saveThumbnail,
  } = useOrganizationStore()

  const { entries: vocabularyEntries, types: vocabularyTypes, loadEntries, loadTypes } = useVocabularyStore()

  const graphRef = useRef<Graph | null>(null)
  const containerDomRef = useRef<HTMLDivElement | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [graphReady, setGraphReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [selectFromVocabulary, setSelectFromVocabulary] = useState(false)
  const [nodeStyle, setNodeStyle] = useState<OrganizationNodeStyle>('simple')

  const [nodeModal, setNodeModal] = useState<NodeModalState>({
    visible: false,
    mode: 'create',
    node: null,
    parentId: null,
  })

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    type: 'node' | 'canvas' | null
    targetId: string | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    targetId: null,
  })

  const linkedEntries = useMemo(() => {
    if (!currentGraph?.linkedVocabularyTypes?.length) return []
    return vocabularyEntries.filter(e =>
      currentGraph.linkedVocabularyTypes.includes(e.typeId)
    )
  }, [vocabularyEntries, currentGraph?.linkedVocabularyTypes])

  // 加载组织架构图
  useEffect(() => {
    loadGraph(graphId)
  }, [graphId, loadGraph])

  // 加载词汇类型和条目
  useEffect(() => {
    loadTypes()
  }, [loadTypes])

  useEffect(() => {
    if (currentGraph?.linkedVocabularyTypes?.length) {
      currentGraph.linkedVocabularyTypes.forEach((typeId) => {
        loadEntries(typeId)
      })
    }
  }, [currentGraph?.linkedVocabularyTypes, loadEntries])

  // 使用 callback ref 初始化 G6 - 完全参考关系图实现
  const containerRef = useCallback((container: HTMLDivElement | null) => {
    if (!container) return
    containerDomRef.current = container
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
        data: { nodes: [], edges: [] },

        node: {
          type: 'rect',
          style: {
            size: nodeSize,
            fill: (d: any) => d.style?.fill || token.colorPrimary,
            stroke: (d: any) => d.style?.stroke || token.colorPrimary,
            lineWidth: 2,
            radius: nodeRadius,
            cursor: 'pointer',
            // 卡片样式：显示名称和描述（换行）
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
            selected: {
              lineWidth: 3,
              shadowColor: token.colorPrimary,
              shadowBlur: 10,
            },
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
            selected: { lineWidth: 3 },
            hover: { lineWidth: 3 },
          },
        },

        behaviors: [
          'drag-canvas',
          'zoom-canvas',
          'click-select',
        ],
      })

      graphRef.current = graph

      // 事件绑定
      graph.on('node:click', (evt: any) => {
        setSelectedNodeId(evt.target.id)
      })

      graph.on('canvas:click', () => {
        setSelectedNodeId(null)
        setContextMenu(prev => ({ ...prev, visible: false }))
      })

      // 右键菜单事件 - 使用 G6 v5 原生事件
      graph.on('node:contextmenu', (evt: any) => {
        evt.preventDefault?.()
        const nodeId = evt.target.id
        setSelectedNodeId(nodeId)
        const clientX = evt.client?.x ?? evt.canvasX
        const clientY = evt.client?.y ?? evt.canvasY
        setContextMenu({
          visible: true,
          x: clientX,
          y: clientY,
          type: 'node',
          targetId: nodeId,
        })
      })

      graph.on('canvas:contextmenu', (evt: any) => {
        evt.preventDefault?.()
        setSelectedNodeId(null)
        const clientX = evt.client?.x ?? evt.canvasX
        const clientY = evt.client?.y ?? evt.canvasY
        setContextMenu({
          visible: true,
          x: clientX,
          y: clientY,
          type: 'canvas',
          targetId: null,
        })
      })

      graph.render().then(() => {
        setGraphReady(true)
      }).catch(() => {})
    }, 100)
  }, [nodeStyle, token.colorPrimary])

  // 清理 - 完全参考关系图实现
  useEffect(() => {
    return () => {
      if (graphRef.current && !graphRef.current.destroyed) {
        graphRef.current.destroy()
        graphRef.current = null
      }
    }
  }, [])

  // 更新数据 - 完全参考关系图实现
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
          description: node.description, // 卡片样式会显示描述
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
      if (!graph.destroyed) {
        // 不自动调整视图，像关系图一样保持默认
        setZoom(1)
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

  const handleSaveThumbnail = async () => {
    if (graphRef.current && !graphRef.current.destroyed) {
      try {
        const dataUrl = await graphRef.current.toDataURL()
        await saveThumbnail(dataUrl)
        message.success('缩略图已保存')
      } catch {
        message.error('保存缩略图失败')
      }
    }
  }

  // 添加节点
  const handleAddNode = (parentId: string | null = null) => {
    setSelectFromVocabulary(false)
    setNodeModal({
      visible: true,
      mode: 'create',
      node: { name: '', color: token.colorPrimary },
      parentId,
    })
  }

  const handleAddFromVocabulary = (parentId: string | null = null) => {
    setSelectFromVocabulary(true)
    setNodeModal({
      visible: true,
      mode: 'create',
      node: { name: '', color: token.colorPrimary },
      parentId,
    })
  }

  const handleSelectVocabularyEntry = (entryId: string) => {
    const entry = linkedEntries.find(e => e.id === entryId)
    if (entry) {
      const type = vocabularyTypes.find(t => t.id === entry.typeId)
      setNodeModal(prev => ({
        ...prev,
        node: {
          ...prev.node,
          name: entry.name,
          color: entry.color || type?.color || token.colorPrimary,
          linkedEntryId: entry.id,
          description: entry.description,
        },
      }))
      setSelectFromVocabulary(false)
    }
  }

  const handleEditNode = (nodeId: string) => {
    const node = currentGraph?.nodes.find((n) => n.id === nodeId)
    if (node) {
      setSelectFromVocabulary(false)
      setNodeModal({ visible: true, mode: 'edit', node: { ...node } })
    }
  }

  const handleEditSelectedNode = () => {
    if (!selectedNodeId) return
    handleEditNode(selectedNodeId)
  }

  const handleDeleteNode = async (nodeId: string) => {
    await deleteNode(nodeId)
    setSelectedNodeId(null)
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleDeleteSelectedNode = async () => {
    if (!selectedNodeId) return
    await handleDeleteNode(selectedNodeId)
  }

  const handleSaveNode = async () => {
    if (!nodeModal.node?.name?.trim()) {
      message.warning('请输入节点名称')
      return
    }

    if (nodeModal.mode === 'create') {
      await addNode({
        name: nodeModal.node.name.trim(),
        description: nodeModal.node.description,
        color: nodeModal.node.color || token.colorPrimary,
        parentId: nodeModal.parentId || undefined,
        linkedEntryId: nodeModal.node.linkedEntryId,
      })
      setNodeModal({ visible: false, mode: 'create', node: null, parentId: null })
    } else if (nodeModal.mode === 'edit' && nodeModal.node.id) {
      await updateNode(nodeModal.node.id, {
        name: nodeModal.node.name.trim(),
        description: nodeModal.node.description,
        color: nodeModal.node.color,
      })
      setNodeModal({ visible: false, mode: 'edit', node: null })
    }
  }

  // 右键菜单项
  const nodeContextMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑节点',
      onClick: () => {
        if (contextMenu.targetId) {
          handleEditNode(contextMenu.targetId)
          setContextMenu(prev => ({ ...prev, visible: false }))
        }
      },
    },
    {
      key: 'addChild',
      icon: <PlusOutlined />,
      label: '添加子节点',
      onClick: () => {
        if (contextMenu.targetId) {
          handleAddNode(contextMenu.targetId)
          setContextMenu(prev => ({ ...prev, visible: false }))
        }
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除节点',
      danger: true,
      onClick: () => {
        if (contextMenu.targetId) {
          handleDeleteNode(contextMenu.targetId)
        }
      },
    },
  ]

  const canvasContextMenuItems: MenuProps['items'] = [
    {
      key: 'addRoot',
      icon: <PlusOutlined />,
      label: '添加根节点',
      onClick: () => {
        handleAddNode(null)
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
  ]

  const selectedNode = selectedNodeId ? currentGraph?.nodes.find((n) => n.id === selectedNodeId) : null

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
        <div className={styles.loading}>
          <Empty description="组织架构图不存在" />
          <Button onClick={onBack}>返回</Button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
          <Title level={5} className={styles.title}>{currentGraph.name}</Title>
          <span className={styles.stats}>
            <TeamOutlined /> {currentGraph.nodeCount} 个节点
          </span>
        </div>

        <div className={styles.toolbarCenter}>
          <Segmented
            value={nodeStyle}
            onChange={(value) => setNodeStyle(value as OrganizationNodeStyle)}
            options={[
              { label: '简约', value: 'simple' },
              { label: '卡片', value: 'card' },
            ]}
          />
        </div>

        <div className={styles.toolbarCenter}>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleAddNode(null)}>
            添加根节点
          </Button>
          {selectedNode && (
            <>
              <Button icon={<PlusOutlined />} onClick={() => handleAddNode(selectedNodeId)}>
                添加子节点
              </Button>
              {linkedEntries.length > 0 && (
                <Button icon={<UserAddOutlined />} onClick={() => handleAddFromVocabulary(selectedNodeId)}>
                  从词库添加
                </Button>
              )}
            </>
          )}
        </div>

        <div className={styles.toolbarRight}>
          <div className={styles.zoomControls}>
            <Tooltip title="缩小">
              <Button icon={<ZoomOutOutlined />} onClick={handleZoomOut} />
            </Tooltip>
            <span className={styles.zoomLevel}>{Math.round(zoom * 100)}%</span>
            <Tooltip title="放大">
              <Button icon={<ZoomInOutlined />} onClick={handleZoomIn} />
            </Tooltip>
            <Tooltip title="适应画布">
              <Button icon={<ExpandOutlined />} onClick={handleFitView}>适应</Button>
            </Tooltip>
          </div>
          <Button icon={<SaveOutlined />} onClick={handleSaveThumbnail}>保存缩略图</Button>
        </div>
      </div>

      <div className={styles.canvasContainer}>
        <div ref={containerRef} className={styles.canvas} onContextMenu={(e) => e.preventDefault()} />

        <div className={styles.hints}>
          <span>右键添加节点或编辑 | 选中节点后可通过工具栏添加子节点</span>
        </div>
      </div>

      {/* 右键菜单 */}
      <Dropdown
        menu={{
          items: contextMenu.type === 'node' ? nodeContextMenuItems : canvasContextMenuItems,
        }}
        open={contextMenu.visible}
        onOpenChange={(open) => {
          if (!open) {
            setContextMenu(prev => ({ ...prev, visible: false }))
          }
        }}
        overlayStyle={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
        }}
      >
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }} />
      </Dropdown>

      {/* 节点编辑模态框 */}
      <Modal
        title={nodeModal.mode === 'create' ? '添加节点' : '编辑节点'}
        open={nodeModal.visible}
        onCancel={() => {
          setNodeModal({ visible: false, mode: 'create', node: null, parentId: null })
          setSelectFromVocabulary(false)
        }}
        onOk={handleSaveNode}
        okText="保存"
        cancelText="取消"
        width={480}
      >
        <div className={styles.modalContent}>
          {selectFromVocabulary && linkedEntries.length > 0 ? (
            <div className={styles.formItem}>
              <label className={styles.formLabel}>从词库选择</label>
              <div className={styles.vocabularyList}>
                {linkedEntries.map((entry) => {
                  const type = vocabularyTypes.find(t => t.id === entry.typeId)
                  return (
                    <div key={entry.id} className={styles.vocabularyItem} onClick={() => handleSelectVocabularyEntry(entry.id)}>
                      <div className={styles.vocabularyColor} style={{ backgroundColor: entry.color || type?.color }} />
                      <div className={styles.vocabularyInfo}>
                        <span className={styles.vocabularyName}>{entry.name}</span>
                        <span className={styles.vocabularyType}>{type?.name}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <Button type="link" onClick={() => setSelectFromVocabulary(false)} style={{ padding: '8px 0' }}>
                手动输入
              </Button>
            </div>
          ) : (
            <>
              <div className={styles.formItem}>
                <label className={styles.formLabel}>名称 *</label>
                <Input
                  placeholder="输入节点名称"
                  value={nodeModal.node?.name || ''}
                  onChange={(e) => setNodeModal((prev) => ({ ...prev, node: { ...prev.node, name: e.target.value } }))}
                  maxLength={30}
                />
                {linkedEntries.length > 0 && nodeModal.mode === 'create' && (
                  <Button type="link" onClick={() => setSelectFromVocabulary(true)} style={{ padding: '4px 0' }}>
                    从词库选择
                  </Button>
                )}
              </div>

              <div className={styles.formItem}>
                <label className={styles.formLabel}>描述</label>
                <TextArea
                  placeholder="输入节点描述（可选）"
                  value={nodeModal.node?.description || ''}
                  onChange={(e) => setNodeModal((prev) => ({ ...prev, node: { ...prev.node, description: e.target.value } }))}
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className={styles.formItem}>
                <label className={styles.formLabel}>颜色</label>
                <ColorPicker
                  value={nodeModal.node?.color || token.colorPrimary}
                  onChange={(color) => setNodeModal((prev) => ({ ...prev, node: { ...prev.node, color: color.toHexString() } }))}
                  showText
                />
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}

export default OrganizationGraphFullscreen
