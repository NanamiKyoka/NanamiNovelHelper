/**
 * 关系图全屏编辑器
 * 基于 AntV G6 v5 重新开发
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import {
  Typography,
  Button,
  Input,
  Select,
  Modal,
  App,
  Empty,
  Spin,
  ColorPicker,
  theme,
  Tooltip,
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
  UserOutlined,
  HeartOutlined,
  EditOutlined,
  TeamOutlined,
  SettingOutlined,
  ExpandOutlined,
} from '@ant-design/icons'
import { Graph } from '@antv/g6'
import { useRelationshipStore } from '@stores/relationshipStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useUIStore } from '@stores/uiStore'
import {
  BUILTIN_RELATION_TYPES,
  type RelationshipNode,
  type RelationshipEdge,
  type RelationType,
  type Gender,
} from '@types/relationship'
import styles from './RelationshipGraphFullscreen.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface RelationshipGraphFullscreenProps {
  graphId: string
  onBack: () => void
}

interface NodeModalState {
  visible: boolean
  mode: 'create' | 'edit'
  node: Partial<RelationshipNode> | null
}

interface EdgeModalState {
  visible: boolean
  mode: 'create' | 'edit'
  edge: Partial<RelationshipEdge> | null
}

interface RelationTypeModalState {
  visible: boolean
  editingType: RelationType | null
  name: string
  color: string
}

function RelationshipGraphFullscreen({
  graphId,
  onBack,
}: RelationshipGraphFullscreenProps): JSX.Element {
  const { token } = theme.useToken()
  const { message } = App.useApp()
  const isDarkMode = token.colorBgContainer === '#141414' ||
                     token.colorBgContainer === '#1f1f1f' ||
                     token.colorTextBase === '#fff'

  const {
    currentGraph,
    isLoading,
    loadGraph,
    addNode,
    updateNode,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    saveThumbnail,
    updateGraph,
  } = useRelationshipStore()

  const { entries: vocabularyEntries, types: vocabularyTypes, loadEntries, loadTypes } = useVocabularyStore()
  
  const setFullscreenMode = useUIStore((state) => state.setFullscreenMode)
  const exitFullscreen = useUIStore((state) => state.exitFullscreen)

  // 设置全屏模式，卸载时退出
  useEffect(() => {
    setFullscreenMode('relationship')
    return () => exitFullscreen()
  }, [setFullscreenMode, exitFullscreen])

  const graphRef = useRef<Graph | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [graphReady, setGraphReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [selectFromVocabulary, setSelectFromVocabulary] = useState(false)

  const [nodeModal, setNodeModal] = useState<NodeModalState>({
    visible: false,
    mode: 'create',
    node: null,
  })

  const [edgeModal, setEdgeModal] = useState<EdgeModalState>({
    visible: false,
    mode: 'create',
    edge: null,
  })

  const [relationTypeModal, setRelationTypeModal] = useState<RelationTypeModalState>({
    visible: false,
    editingType: null,
    name: '',
    color: '#1890ff',
  })

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    type: 'node' | 'edge' | 'canvas' | null
    targetId: string | null
    canvasX?: number
    canvasY?: number
  }>({
    visible: false,
    x: 0,
    y: 0,
    type: null,
    targetId: null,
  })

  const relationTypes: RelationType[] = useMemo(() => {
    const customTypes = currentGraph?.customRelationTypes || []
    return [...BUILTIN_RELATION_TYPES, ...customTypes]
  }, [currentGraph?.customRelationTypes])

  const linkedEntries = useMemo(() => {
    if (!currentGraph?.linkedVocabularyTypes?.length) return []
    return vocabularyEntries.filter(e =>
      currentGraph.linkedVocabularyTypes.includes(e.typeId)
    )
  }, [vocabularyEntries, currentGraph?.linkedVocabularyTypes])

  // 加载关系图
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

  // 使用 callback ref 来初始化图
  const containerRef = useCallback((container: HTMLDivElement | null) => {
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

      // 确保容器内没有残留的 canvas 元素
      const existingCanvas = container.querySelector('canvas')
      if (existingCanvas) {
        existingCanvas.remove()
      }

      const nodeLabelColor = isDarkMode ? '#e0e0e0' : '#333333'
      const edgeLabelColor = isDarkMode ? '#b0b0b0' : '#666666'
      const labelBgColor = isDarkMode ? '#1f1f1f' : '#ffffff'

      const graph = new Graph({
        container,
        width,
        height,
        data: { nodes: [], edges: [] },

        node: {
          type: 'circle',
          style: {
            size: 70,
            fill: (d: any) => d.style?.fill || '#1890ff',
            stroke: (d: any) => d.style?.stroke || '#1890ff',
            lineWidth: 3,
            cursor: 'pointer',
            labelText: (d: any) => d.data?.label || '',
            labelFill: '#ffffff',
            labelFontSize: 14,
            labelFontWeight: '500',
            labelPlacement: 'center',
            labelMaxWidth: 60,
            labelWordWrap: true,
          },
          state: {
            selected: {
              lineWidth: 4,
              shadowColor: token.colorPrimary,
              shadowBlur: 15,
            },
            hover: {
              lineWidth: 4,
            },
          },
        },

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
            labelFontSize: 12,
            labelBackground: true,
            labelBackgroundFill: labelBgColor,
            labelBackgroundOpacity: 0.9,
            labelBackgroundPadding: [2, 4, 2, 4],
          },
          state: {
            selected: { lineWidth: 3 },
            hover: { lineWidth: 3 },
          },
        },

        behaviors: [
          'drag-canvas',
          'zoom-canvas',
          'drag-element',
          'click-select',
        ],
      })

      graphRef.current = graph

      graph.on('node:click', (evt: any) => {
        setSelectedNodeId(evt.target.id)
        setSelectedEdgeId(null)
      })

      graph.on('edge:click', (evt: any) => {
        setSelectedEdgeId(evt.target.id)
        setSelectedNodeId(null)
      })

      graph.on('canvas:click', () => {
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
        setContextMenu(prev => ({ ...prev, visible: false }))
      })

      graph.on('node:contextmenu', (evt: any) => {
        evt.preventDefault?.()
        const nodeId = evt.target.id
        setSelectedNodeId(nodeId)
        setSelectedEdgeId(null)
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

      graph.on('edge:contextmenu', (evt: any) => {
        evt.preventDefault?.()
        const edgeId = evt.target.id
        setSelectedEdgeId(edgeId)
        setSelectedNodeId(null)
        const clientX = evt.client?.x ?? evt.canvasX
        const clientY = evt.client?.y ?? evt.canvasY
        setContextMenu({
          visible: true,
          x: clientX,
          y: clientY,
          type: 'edge',
          targetId: edgeId,
        })
      })

      graph.on('canvas:contextmenu', (evt: any) => {
        evt.preventDefault?.()
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
        const clientX = evt.client?.x ?? evt.canvasX
        const clientY = evt.client?.y ?? evt.canvasY
        setContextMenu({
          visible: true,
          x: clientX,
          y: clientY,
          type: 'canvas',
          targetId: null,
          canvasX: evt.canvasX,
          canvasY: evt.canvasY,
        })
      })

      graph.on('node:dragend', async (evt: any) => {
        const nodeId = evt.target.id
        const nodeData = graph.getNodeData(nodeId)
        if (nodeData && nodeData.style) {
          const { x, y } = nodeData.style
          if (x !== undefined && y !== undefined) {
            await updateNode(nodeId, { x, y })
          }
        }
      })

      graph.render().then(() => {
        setGraphReady(true)
      }).catch((error) => {
        console.error('Failed to render relationship graph:', error)
        message.error('关系图渲染失败，请刷新重试')
      })
    }

    // 延迟初始化，确保预览组件的清理完成
    setTimeout(() => {
      tryInit(20)
    }, 50)
  }, [isDarkMode, token.colorPrimary, updateNode, message])

  // 清理 - 保存视图状态并销毁图形
  useEffect(() => {
    return () => {
      // 延迟销毁，让新组件有时间初始化
      setTimeout(() => {
        const graph = graphRef.current
        if (graph && !graph.destroyed) {
          try {
            const zoom = graph.getZoom()
            const canvas = graph.getCanvas()
            const width = canvas.getConfig().width || 800
            const height = canvas.getConfig().height || 600
            const center = graph.getCoordinateByCanvas([width / 2, height / 2])
            const viewState = {
              zoom,
              centerX: center[0],
              centerY: center[1],
            }
            useRelationshipStore.getState().updateGraph(graphId, { viewState })
          } catch {
            // 忽略销毁时的错误
          }
          graph.destroy()
          graphRef.current = null
        }
      }, 0)
    }
  }, [graphId])

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
      
      if (node.x !== undefined && node.y !== undefined) {
        styleData.x = node.x
        styleData.y = node.y
      } else if (!hasPositions) {
        // 新节点没有位置时，使用简单的网格布局
        const cols = Math.ceil(Math.sqrt(currentGraph.nodes.length))
        const row = Math.floor(index / cols)
        const col = index % cols
        styleData.x = 100 + col * 150
        styleData.y = 100 + row * 150
      }

      return {
        id: node.id,
        data: { label: node.name },
        style: styleData,
      }
    })

    const edges = currentGraph.edges.map((edge) => {
      const relationType = relationTypes.find(t => t.id === edge.relationTypeId)
      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        data: { label: relationType?.name || edge.label || '' },
        style: {
          stroke: relationType?.color || '#999999',
          lineWidth: relationType?.lineWidth || 2,
        },
      }
    })

    graph.setData({ nodes, edges })
    graph.render().then(() => {
      if (!graph.destroyed && nodes.length > 0) {
        // 恢复视图状态或使用默认值
        const savedViewState = currentGraph.viewState
        if (savedViewState) {
          // 先设置缩放，再移动到保存的位置
          graph.zoomTo(savedViewState.zoom)
          // 获取 canvas 尺寸
          const canvas = graph.getCanvas()
          const width = canvas.getConfig().width || 800
          const height = canvas.getConfig().height || 600
          // 计算需要移动的距离，使 savedViewState 中心点位于视口中心
          const currentCenter = graph.getCoordinateByCanvas([width / 2, height / 2])
          const dx = savedViewState.centerX - currentCenter[0]
          const dy = savedViewState.centerY - currentCenter[1]
          graph.translate(dx, dy)
          setZoom(savedViewState.zoom)
        } else {
          setZoom(1)
        }
      }
    }).catch((error) => {
      console.error('Failed to update relationship graph data:', error)
      // 不显示错误提示，因为可能是快速切换导致的正常取消
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

  const handleAddNode = () => {
    setSelectFromVocabulary(false)
    setNodeModal({ visible: true, mode: 'create', node: { name: '', gender: 'unknown', color: '#1890ff' } })
  }

  const handleAddFromVocabulary = () => {
    setSelectFromVocabulary(true)
    setNodeModal({ visible: true, mode: 'create', node: { name: '', gender: 'unknown', color: '#1890ff' } })
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
          color: entry.color || type?.color || '#1890ff',
          linkedTypeId: entry.typeId,
          linkedEntryId: entry.id,
          description: entry.description,
        },
      }))
      setSelectFromVocabulary(false)
    }
  }

  const handleEditSelectedNode = () => {
    if (!selectedNodeId) return
    const node = currentGraph?.nodes.find((n) => n.id === selectedNodeId)
    if (node) {
      setSelectFromVocabulary(false)
      setNodeModal({ visible: true, mode: 'edit', node: { ...node } })
    }
  }

  const handleDeleteSelectedNode = async () => {
    if (!selectedNodeId) return
    await deleteNode(selectedNodeId)
    setSelectedNodeId(null)
  }

  const handleAddEdge = () => {
    if (!currentGraph?.nodes.length) {
      message.warning('请先添加人物节点')
      return
    }
    setEdgeModal({
      visible: true,
      mode: 'create',
      edge: { source: selectedNodeId || undefined, target: undefined, relationTypeId: relationTypes[0]?.id },
    })
  }

  const handleEditSelectedEdge = () => {
    if (!selectedEdgeId) return
    const edge = currentGraph?.edges.find((e) => e.id === selectedEdgeId)
    if (edge) {
      setEdgeModal({ visible: true, mode: 'edit', edge: { ...edge } })
    }
  }

  const handleDeleteSelectedEdge = async () => {
    if (!selectedEdgeId) return
    await deleteEdge(selectedEdgeId)
    setSelectedEdgeId(null)
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleSaveNode = async () => {
    if (!nodeModal.node?.name?.trim()) {
      message.warning('请输入人物名称')
      return
    }

    if (nodeModal.mode === 'create') {
      await addNode({
        name: nodeModal.node.name.trim(),
        gender: nodeModal.node.gender || 'unknown',
        description: nodeModal.node.description,
        color: nodeModal.node.color || '#1890ff',
        linkedTypeId: nodeModal.node.linkedTypeId,
        linkedEntryId: nodeModal.node.linkedEntryId,
        x: nodeModal.node.x,
        y: nodeModal.node.y,
      })
      setNodeModal({ visible: false, mode: 'create', node: null })
    } else if (nodeModal.mode === 'edit' && nodeModal.node.id) {
      await updateNode(nodeModal.node.id, {
        name: nodeModal.node.name.trim(),
        gender: nodeModal.node.gender,
        description: nodeModal.node.description,
        color: nodeModal.node.color,
      })
      setNodeModal({ visible: false, mode: 'edit', node: null })
    }
  }

  const handleSaveEdge = async () => {
    if (!edgeModal.edge?.source || !edgeModal.edge?.target) {
      message.warning('请选择起点和终点')
      return
    }
    if (!edgeModal.edge?.relationTypeId) {
      message.warning('请选择关系类型')
      return
    }

    if (edgeModal.mode === 'create') {
      await addEdge({
        source: edgeModal.edge.source,
        target: edgeModal.edge.target,
        relationTypeId: edgeModal.edge.relationTypeId,
        label: edgeModal.edge.label,
      })
      setEdgeModal({ visible: false, mode: 'create', edge: null })
    } else if (edgeModal.mode === 'edit' && edgeModal.edge.id) {
      await updateEdge(edgeModal.edge.id, {
        relationTypeId: edgeModal.edge.relationTypeId,
        label: edgeModal.edge.label,
      })
      setEdgeModal({ visible: false, mode: 'edit', edge: null })
    }
  }

  const handleOpenRelationTypeSettings = () => {
    setRelationTypeModal({ visible: true, editingType: null, name: '', color: '#1890ff' })
  }

  const handleAddRelationType = async () => {
    if (!relationTypeModal.name.trim()) {
      message.warning('请输入关系类型名称')
      return
    }

    const newType: RelationType = {
      id: `custom-${Date.now()}`,
      name: relationTypeModal.name.trim(),
      color: relationTypeModal.color,
      lineStyle: 'solid',
      lineWidth: 2,
      isBuiltIn: false,
      order: relationTypes.length + 1,
    }

    const customTypes = currentGraph?.customRelationTypes || []
    await updateGraph({ customRelationTypes: [...customTypes, newType] })
    setRelationTypeModal({ visible: false, editingType: null, name: '', color: '#1890ff' })
    message.success('关系类型已添加')
  }

  const selectedNode = selectedNodeId ? currentGraph?.nodes.find((n) => n.id === selectedNodeId) : null
  const selectedEdge = selectedEdgeId ? currentGraph?.edges.find((e) => e.id === selectedEdgeId) : null

  // 右键菜单项定义（精简版：只保留编辑和删除）
  const nodeContextMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑节点',
      onClick: () => {
        if (selectedNode) {
          setNodeModal({ visible: true, mode: 'edit', node: { ...selectedNode } })
        }
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除节点',
      danger: true,
      onClick: async () => {
        if (selectedNodeId) {
          await deleteNode(selectedNodeId)
          setSelectedNodeId(null)
          message.success('节点已删除')
        }
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
  ]

  const edgeContextMenuItems: MenuProps['items'] = [
    {
      key: 'edit',
      icon: <EditOutlined />,
      label: '编辑关系',
      onClick: () => {
        if (selectedEdge) {
          setEdgeModal({ visible: true, mode: 'edit', edge: { ...selectedEdge } })
        }
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: '删除关系',
      danger: true,
      onClick: async () => {
        if (selectedEdgeId) {
          await deleteEdge(selectedEdgeId)
          setSelectedEdgeId(null)
          message.success('关系已删除')
        }
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
  ]

  const canvasContextMenuItems: MenuProps['items'] = [
    {
      key: 'addNode',
      icon: <PlusOutlined />,
      label: '添加人物',
      onClick: () => {
        setNodeModal({
          visible: true,
          mode: 'create',
          node: {
            name: '',
            gender: 'unknown',
            color: '#1890ff',
            x: contextMenu.canvasX,
            y: contextMenu.canvasY,
          },
        })
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
    {
      key: 'addEdge',
      icon: <HeartOutlined />,
      label: '添加关系',
      onClick: () => {
        if (!currentGraph?.nodes.length) {
          message.warning('请先添加人物节点')
          setContextMenu(prev => ({ ...prev, visible: false }))
          return
        }
        setEdgeModal({
          visible: true,
          mode: 'create',
          edge: { source: undefined, target: undefined, relationTypeId: relationTypes[0]?.id },
        })
        setContextMenu(prev => ({ ...prev, visible: false }))
      },
    },
  ]

  // 关闭右键菜单
  const handleCloseContextMenu = () => {
    setContextMenu(prev => ({ ...prev, visible: false }))
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
        <div className={styles.loading}>
          <Empty description="关系图不存在" />
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
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
            <UserOutlined /> {currentGraph.nodeCount} 人物
            <HeartOutlined style={{ marginLeft: 16 }} /> {currentGraph.edgeCount} 关系
          </span>
        </div>

        <div className={styles.toolbarCenter}>
          <Button icon={<PlusOutlined />} onClick={handleAddNode}>添加人物</Button>
          <Button icon={<HeartOutlined />} onClick={handleAddEdge}>添加关系</Button>
          {linkedEntries.length > 0 && (
            <Button icon={<TeamOutlined />} onClick={handleAddFromVocabulary}>从词库添加</Button>
          )}
          <Button icon={<SettingOutlined />} onClick={handleOpenRelationTypeSettings}>关系类型</Button>
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
          <span>右键添加人物或编辑节点 | 拖拽移动位置会自动保存</span>
        </div>
      </div>

      {/* 节点编辑模态框 */}
      <Modal
        title={nodeModal.mode === 'create' ? '添加人物' : '编辑人物'}
        open={nodeModal.visible}
        onCancel={() => {
          setNodeModal({ visible: false, mode: 'create', node: null })
          setSelectFromVocabulary(false)
        }}
        onOk={handleSaveNode}
        okText="保存"
        cancelText="取消"
        width={480}
        zIndex={10000}
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
                  placeholder="输入人物名称"
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
                <label className={styles.formLabel}>性别</label>
                <div className={styles.genderOptions}>
                  {(['male', 'female', 'other', 'unknown'] as Gender[]).map((g) => (
                    <div
                      key={g}
                      className={`${styles.genderOption} ${nodeModal.node?.gender === g ? styles.genderOptionSelected : ''}`}
                      onClick={() => setNodeModal((prev) => ({ ...prev, node: { ...prev.node, gender: g } }))}
                    >
                      {g === 'male' ? '男' : g === 'female' ? '女' : g === 'other' ? '其他' : '未知'}
                    </div>
                  ))}
                </div>
              </div>

              <div className={styles.formItem}>
                <label className={styles.formLabel}>描述</label>
                <TextArea
                  placeholder="输入人物描述（可选）"
                  value={nodeModal.node?.description || ''}
                  onChange={(e) => setNodeModal((prev) => ({ ...prev, node: { ...prev.node, description: e.target.value } }))}
                  rows={3}
                  maxLength={200}
                />
              </div>

              <div className={styles.formItem}>
                <label className={styles.formLabel}>颜色</label>
                <ColorPicker
                  value={nodeModal.node?.color || '#1890ff'}
                  onChange={(color) => setNodeModal((prev) => ({ ...prev, node: { ...prev.node, color: color.toHexString() } }))}
                  showText
                />
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* 边编辑模态框 */}
      <Modal
        title={edgeModal.mode === 'create' ? '添加关系' : '编辑关系'}
        open={edgeModal.visible}
        onCancel={() => setEdgeModal({ visible: false, mode: 'create', edge: null })}
        onOk={handleSaveEdge}
        okText="保存"
        cancelText="取消"
        width={480}
        zIndex={10000}
      >
        <div className={styles.modalContent}>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>起点</label>
            <Select
              value={edgeModal.edge?.source}
              onChange={(v) => setEdgeModal((prev) => ({ ...prev, edge: { ...prev.edge, source: v } }))}
              placeholder="选择起点人物"
              options={currentGraph?.nodes.map(n => ({ value: n.id, label: n.name }))}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>终点</label>
            <Select
              value={edgeModal.edge?.target}
              onChange={(v) => setEdgeModal((prev) => ({ ...prev, edge: { ...prev.edge, target: v } }))}
              placeholder="选择终点人物"
              options={currentGraph?.nodes.map(n => ({ value: n.id, label: n.name }))}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>关系类型</label>
            <div className={styles.relationTypeList}>
              {relationTypes.map((type) => (
                <div
                  key={type.id}
                  className={`${styles.relationTypeItem} ${edgeModal.edge?.relationTypeId === type.id ? styles.relationTypeSelected : ''}`}
                  style={{ backgroundColor: type.color }}
                  onClick={() => setEdgeModal((prev) => ({ ...prev, edge: { ...prev.edge, relationTypeId: type.id } }))}
                >
                  {type.name}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>备注（可选）</label>
            <Input
              placeholder="输入关系备注"
              value={edgeModal.edge?.label || ''}
              onChange={(e) => setEdgeModal((prev) => ({ ...prev, edge: { ...prev.edge, label: e.target.value } }))}
              maxLength={50}
            />
          </div>
        </div>
      </Modal>

      {/* 关系类型设置模态框 */}
      <Modal
        title="添加自定义关系类型"
        open={relationTypeModal.visible}
        onCancel={() => setRelationTypeModal({ visible: false, editingType: null, name: '', color: '#1890ff' })}
        onOk={handleAddRelationType}
        okText="添加"
        cancelText="取消"
        zIndex={10000}
      >
        <div className={styles.modalContent}>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>类型名称 *</label>
            <Input
              placeholder="输入关系类型名称"
              value={relationTypeModal.name}
              onChange={(e) => setRelationTypeModal(prev => ({ ...prev, name: e.target.value }))}
              maxLength={20}
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>颜色</label>
            <ColorPicker
              value={relationTypeModal.color}
              onChange={(color) => setRelationTypeModal(prev => ({ ...prev, color: color.toHexString() }))}
              showText
            />
          </div>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>现有关系类型</label>
            <div className={styles.relationTypeList}>
              {relationTypes.map((type) => (
                <div key={type.id} className={styles.relationTypeItem} style={{ backgroundColor: type.color }}>
                  {type.name} {type.isBuiltIn ? '(内置)' : ''}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      {/* 右键菜单 */}
      <Dropdown
        menu={{
          items:
            contextMenu.type === 'node'
              ? nodeContextMenuItems
              : contextMenu.type === 'edge'
                ? edgeContextMenuItems
                : canvasContextMenuItems,
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
          zIndex: 10001,
        }}
      >
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }} />
      </Dropdown>
    </div>
  )
}

export default RelationshipGraphFullscreen
