/**
 * 关系图列表组件
 * 展示所有关系图，支持创建、编辑、删除、导入导出、拖拽排序
 */

import { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Card, Modal, App, Input, Select, Spin, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  UserOutlined,
  HeartOutlined,
  HolderOutlined
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useRelationshipStore } from '@stores/relationshipStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import type { RelationshipGraphMeta } from '@types/relationship'
import styles from './RelationshipGraphList.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface RelationshipGraphListProps {
  onSelectGraph: (graphId: string) => void
}

// 可排序的卡片组件
interface SortableCardProps {
  graph: RelationshipGraphMeta
  getLocalUrl: (filePath: string) => string
  onContextMenu: (e: React.MouseEvent, graph: RelationshipGraphMeta) => void
  onClick: (graphId: string) => void
  onDoubleClick: (graphId: string) => void
}

function SortableCard({
  graph,
  getLocalUrl,
  onContextMenu,
  onClick,
  onDoubleClick
}: SortableCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: graph.id
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.sortableCardWrapper}>
      <Card
        className={styles.graphCard}
        onContextMenu={e => onContextMenu(e, graph)}
        onClick={() => onClick(graph.id)}
        onDoubleClick={() => onDoubleClick(graph.id)}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.thumbnail}>
          {graph.thumbnail ? (
            <img
              src={getLocalUrl(graph.thumbnail)}
              alt={graph.name}
              className={styles.thumbnailImage}
            />
          ) : (
            <TeamOutlined className={styles.thumbnailPlaceholder} />
          )}
          {/* 拖拽手柄 */}
          <div className={styles.dragHandle} {...attributes} {...listeners}>
            <HolderOutlined />
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.graphName}>{graph.name}</div>
          {graph.description && <div className={styles.graphDescription}>{graph.description}</div>}
          <div className={styles.graphStats}>
            <span className={styles.stat}>
              <UserOutlined />
              {graph.nodeCount}
            </span>
            <span className={styles.stat}>
              <HeartOutlined />
              {graph.edgeCount}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

function RelationshipGraphList({ onSelectGraph }: RelationshipGraphListProps): JSX.Element {
  const { modal, message } = App.useApp()

  const {
    graphs,
    isLoading,
    loadList,
    createGraph,
    deleteGraph,
    exportGraph,
    importGraph,
    reorderGraphs
  } = useRelationshipStore()

  const { types: vocabularyTypes, loadTypes } = useVocabularyStore()

  // 创建模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newGraphName, setNewGraphName] = useState('')
  const [newGraphDescription, setNewGraphDescription] = useState('')
  const [newGraphVocabularyTypes, setNewGraphVocabularyTypes] = useState<string[]>([])
  const [isCreating, setIsCreating] = useState(false)

  // 拖拽传感器配置
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // 需要移动 5px 才开始拖拽，避免误触
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    graph: RelationshipGraphMeta | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    graph: null
  })

  useEffect(() => {
    loadList()
    loadTypes()
  }, [loadList, loadTypes])

  const getLocalUrl = (filePath: string): string => {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const encodedPath = encodeURIComponent(normalizedPath)
    return `local://file/${encodedPath}`
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, graph: RelationshipGraphMeta) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      graph
    })
  }, [])

  // 创建新关系图
  const handleCreate = async () => {
    if (!newGraphName.trim()) {
      message.warning('请输入关系图名称')
      return
    }

    setIsCreating(true)
    try {
      const graph = await createGraph({
        name: newGraphName.trim(),
        description: newGraphDescription.trim() || undefined,
        linkedVocabularyTypes: newGraphVocabularyTypes
      })
      if (graph) {
        message.success('创建成功')
        setCreateModalVisible(false)
        setNewGraphName('')
        setNewGraphDescription('')
        setNewGraphVocabularyTypes([])
        onSelectGraph(graph.id)
      }
    } finally {
      setIsCreating(false)
    }
  }

  // 删除关系图
  const handleDelete = (graph: RelationshipGraphMeta) => {
    setContextMenu(prev => ({ ...prev, visible: false }))
    modal.confirm({
      title: '确定要删除这个关系图吗？',
      content: `将删除「${graph.name}」，删除后无法恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteGraph(graph.id)
          message.success('删除成功')
        } catch {
          message.error('删除失败')
        }
      }
    })
  }

  // 导出关系图
  const handleExport = async (graph: RelationshipGraphMeta) => {
    try {
      const filePath = await window.api.relationship.showExportDialog(graph.name)
      if (filePath) {
        const content = await exportGraph(graph.id)
        if (content) {
          await window.api.file.write(filePath, content, { encoding: 'utf-8' })
          message.success('导出成功')
        }
      }
    } catch {
      message.error('导出失败')
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const getContextMenuItems = useCallback((): MenuProps['items'] => {
    if (!contextMenu.graph) return []
    const graph = contextMenu.graph
    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => {
          onSelectGraph(graph.id)
          setContextMenu(prev => ({ ...prev, visible: false }))
        }
      },
      {
        key: 'export',
        icon: <ExportOutlined />,
        label: '导出',
        onClick: () => handleExport(graph)
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(graph)
      }
    ]
  }, [contextMenu.graph, onSelectGraph, handleDelete, handleExport])

  // 导入关系图
  const handleImport = async () => {
    try {
      const filePath = await window.api.relationship.showImportDialog()
      if (filePath) {
        const content = await window.api.file.read(filePath, 'utf-8')
        const graph = await importGraph(content)
        if (graph) {
          message.success('导入成功')
        }
      }
    } catch {
      message.error('导入失败')
    }
  }

  // 双击打开
  const handleDoubleClick = (graphId: string) => {
    onSelectGraph(graphId)
  }

  // 单击选中
  const handleClick = (_graphId: string) => {
    // 可以添加选中高亮效果
  }

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = graphs.findIndex(g => g.id === active.id)
        const newIndex = graphs.findIndex(g => g.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // 乐观更新：先本地排序
          const newGraphs = arrayMove(graphs, oldIndex, newIndex)
          const graphIds = newGraphs.map(g => g.id)

          // 保存到后端
          const success = await reorderGraphs(graphIds)
          if (!success) {
            message.error('排序保存失败')
          }
        }
      }
    },
    [graphs, reorderGraphs, message]
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <TeamOutlined />
          <Title level={5} style={{ margin: 0 }}>
            关系图
          </Title>
          <Text type="secondary">({graphs.length})</Text>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<ImportOutlined />} onClick={handleImport}>
            导入
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setCreateModalVisible(true)}
          >
            新建
          </Button>
        </div>
      </div>

      <div className={styles.content}>
        {isLoading ? (
          <div className={styles.emptyState}>
            <Spin />
          </div>
        ) : graphs.length === 0 ? (
          <div className={styles.emptyState}>
            <TeamOutlined className={styles.emptyIcon} />
            <Text>暂无关系图</Text>
            <Text type="secondary">点击"新建"创建第一个关系图</Text>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={graphs.map(g => g.id)} strategy={rectSortingStrategy}>
              <div className={styles.grid}>
                {graphs.map(graph => (
                  <SortableCard
                    key={graph.id}
                    graph={graph}
                    getLocalUrl={getLocalUrl}
                    onContextMenu={handleContextMenu}
                    onClick={handleClick}
                    onDoubleClick={handleDoubleClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 右键菜单 */}
      <Dropdown
        menu={{ items: getContextMenuItems() }}
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

      {/* 创建模态框 */}
      <Modal
        title="创建关系图"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreate}
        confirmLoading={isCreating}
        okText="创建"
        cancelText="取消"
      >
        <div className={styles.modalContent}>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>名称 *</label>
            <Input
              placeholder="输入关系图名称"
              value={newGraphName}
              onChange={e => setNewGraphName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              placeholder="输入关系图描述（可选）"
              value={newGraphDescription}
              onChange={e => setNewGraphDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>关联词汇类型</label>
            <span className={styles.formHint}>关联后可从词汇库快速添加人物节点</span>
            <Select
              mode="multiple"
              placeholder="选择要关联的词汇类型"
              value={newGraphVocabularyTypes}
              onChange={setNewGraphVocabularyTypes}
              className={styles.vocabularyTypeSelect}
              options={vocabularyTypes.map(t => ({
                label: t.name,
                value: t.id
              }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default RelationshipGraphList
