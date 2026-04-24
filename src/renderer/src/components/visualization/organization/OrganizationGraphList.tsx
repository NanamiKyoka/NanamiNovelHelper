/**
 * 组织架构图列表组件
 * 展示所有组织架构图，支持创建、编辑、删除、导入导出、拖拽排序
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Typography,
  Button,
  Card,
  Modal,
  App,
  Input,
  Select,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  TeamOutlined,
  ApartmentOutlined,
  HolderOutlined,
} from '@ant-design/icons'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useOrganizationStore } from '@stores/organizationStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import type { OrganizationGraphMeta } from '@types/organization'
import styles from './OrganizationGraphList.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface OrganizationGraphListProps {
  onSelectGraph: (graphId: string) => void
  onCreateAndEdit: (graphId: string) => void
}

// 右键菜单位置
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  graph: OrganizationGraphMeta | null
}

// 可排序的卡片组件
interface SortableCardProps {
  graph: OrganizationGraphMeta
  getLocalUrl: (filePath: string) => string
  onContextMenu: (e: React.MouseEvent, graph: OrganizationGraphMeta) => void
  onDoubleClick: (graphId: string) => void
}

function SortableCard({
  graph,
  getLocalUrl,
  onContextMenu,
  onDoubleClick,
}: SortableCardProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: graph.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={styles.sortableCardWrapper}
    >
      <Card
        className={styles.graphCard}
        onContextMenu={(e) => onContextMenu(e, graph)}
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
            <ApartmentOutlined className={styles.thumbnailPlaceholder} />
          )}
          {/* 拖拽手柄 */}
          <div
            className={styles.dragHandle}
            {...attributes}
            {...listeners}
          >
            <HolderOutlined />
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.graphName}>{graph.name}</div>
          {graph.description && (
            <div className={styles.graphDescription}>{graph.description}</div>
          )}
          <div className={styles.graphStats}>
            <span className={styles.stat}>
              <TeamOutlined />
              {graph.nodeCount} 节点
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

function OrganizationGraphList({ onSelectGraph, onCreateAndEdit }: OrganizationGraphListProps): JSX.Element {
  const { modal, message } = App.useApp()

  const {
    graphs,
    isLoading,
    loadList,
    createGraph,
    deleteGraph,
    exportGraph,
    importGraph,
    reorderGraphs,
  } = useOrganizationStore()

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
        distance: 5, // 需要移动 5px 才开始拖拽，避免误触
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    graph: null,
  })

  const contextMenuRef = useRef<HTMLDivElement>(null)

  // 加载列表
  useEffect(() => {
    loadList()
    loadTypes()
  }, [loadList, loadTypes])

  // 将本地路径转换为 local:// URL（处理 Windows 路径）
  const getLocalUrl = (filePath: string): string => {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const encodedPath = encodeURIComponent(normalizedPath)
    return `local://file/${encodedPath}`
  }

  // 点击外部关闭右键菜单
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu((prev) => ({ ...prev, visible: false }))
      }
    }

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu.visible])

  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, graph: OrganizationGraphMeta) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      graph,
    })
  }, [])

  // 创建新组织架构图
  const handleCreate = async () => {
    if (!newGraphName.trim()) {
      message.warning('请输入组织架构图名称')
      return
    }

    setIsCreating(true)
    try {
      const graph = await createGraph({
        name: newGraphName.trim(),
        description: newGraphDescription.trim() || undefined,
        linkedVocabularyTypes: newGraphVocabularyTypes,
      })
      if (graph) {
        message.success('创建成功')
        setCreateModalVisible(false)
        setNewGraphName('')
        setNewGraphDescription('')
        setNewGraphVocabularyTypes([])
        onCreateAndEdit(graph.id)
      }
    } finally {
      setIsCreating(false)
    }
  }

  // 删除组织架构图
  const handleDelete = (graph: OrganizationGraphMeta) => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
    modal.confirm({
      title: '确定要删除这个组织架构图吗？',
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
      },
    })
  }

  // 导出组织架构图
  const handleExport = async (graph: OrganizationGraphMeta) => {
    try {
      const filePath = await window.electron.organization.showExportDialog(graph.name)
      if (filePath) {
        const content = await exportGraph(graph.id)
        if (content) {
          await window.electron.file.write(filePath, content, { encoding: 'utf-8' })
          message.success('导出成功')
        }
      }
    } catch {
      message.error('导出失败')
    }
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // 导入组织架构图
  const handleImport = async () => {
    try {
      const filePath = await window.electron.organization.showImportDialog()
      if (filePath) {
        const content = await window.electron.file.read(filePath, 'utf-8')
        const graph = await importGraph(content)
        if (graph) {
          message.success('导入成功')
        }
      }
    } catch {
      message.error('导入失败')
    }
  }

  // 双击打开预览
  const handleDoubleClick = (graphId: string) => {
    onSelectGraph(graphId)
  }

  // 处理拖拽结束
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = graphs.findIndex((g) => g.id === active.id)
        const newIndex = graphs.findIndex((g) => g.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          // 乐观更新：先本地排序
          const newGraphs = arrayMove(graphs, oldIndex, newIndex)
          const graphIds = newGraphs.map((g) => g.id)

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
            组织架构
          </Title>
          <Text type="secondary">({graphs.length})</Text>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<ImportOutlined />} onClick={handleImport}>
            导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalVisible(true)}>
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
            <Text>暂无组织架构图</Text>
            <Text type="secondary">点击"新建"创建第一个组织架构图</Text>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={graphs.map((g) => g.id)}
              strategy={rectSortingStrategy}
            >
              <div className={styles.grid}>
                {graphs.map((graph) => (
                  <SortableCard
                    key={graph.id}
                    graph={graph}
                    getLocalUrl={getLocalUrl}
                    onContextMenu={handleContextMenu}
                    onDoubleClick={handleDoubleClick}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && contextMenu.graph && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              onSelectGraph(contextMenu.graph!.id)
              setContextMenu((prev) => ({ ...prev, visible: false }))
            }}
          >
            <EditOutlined />
            <span>打开</span>
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => handleExport(contextMenu.graph!)}
          >
            <ExportOutlined />
            <span>导出</span>
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={() => handleDelete(contextMenu.graph!)}
          >
            <DeleteOutlined />
            <span>删除</span>
          </div>
        </div>
      )}

      {/* 创建模态框 */}
      <Modal
        title="创建组织架构图"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        onOk={handleCreate}
        confirmLoading={isCreating}
        okText="创建并编辑"
        cancelText="取消"
      >
        <div className={styles.modalContent}>
          <div className={styles.formItem}>
            <label className={styles.formLabel}>名称 *</label>
            <Input
              placeholder="输入组织架构图名称"
              value={newGraphName}
              onChange={(e) => setNewGraphName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              placeholder="输入组织架构图描述（可选）"
              value={newGraphDescription}
              onChange={(e) => setNewGraphDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>关联词汇类型</label>
            <span className={styles.formHint}>
              关联后可从词汇库快速添加节点
            </span>
            <Select
              mode="multiple"
              placeholder="选择要关联的词汇类型"
              value={newGraphVocabularyTypes}
              onChange={setNewGraphVocabularyTypes}
              className={styles.vocabularyTypeSelect}
              options={vocabularyTypes.map((t) => ({
                label: t.name,
                value: t.id,
              }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default OrganizationGraphList