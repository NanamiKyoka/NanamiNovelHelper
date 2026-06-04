/**
 * 地图列表组件
 * 展示所有地图，支持创建、编辑、删除、导入导出、拖拽排序
 */

import { useState, useEffect, useCallback } from 'react'
import { Typography, Button, Card, Modal, App, Input, Select, Spin } from 'antd'
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  HolderOutlined,
  EnvironmentOutlined
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
import { useMapStore } from '@stores/mapStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import type { MapMeta } from '@types/map'
import styles from './MapList.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface MapListProps {
  onSelectMap: (mapId: string) => void
  onCreateAndEdit: (mapId: string) => void
}

// 右键菜单位置
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  map: MapMeta | null
}

// 可排序的卡片组件
interface SortableCardProps {
  map: MapMeta
  getLocalUrl: (filePath: string) => string
  onContextMenu: (e: React.MouseEvent, map: MapMeta) => void
  onClick: (mapId: string) => void
  onDoubleClick: (mapId: string) => void
}

function SortableCard({
  map,
  getLocalUrl,
  onContextMenu,
  onClick,
  onDoubleClick
}: SortableCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: map.id
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
        className={styles.mapCard}
        onContextMenu={e => onContextMenu(e, map)}
        onClick={() => onClick(map.id)}
        onDoubleClick={() => onDoubleClick(map.id)}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.thumbnail}>
          {map.thumbnail ? (
            <img
              src={getLocalUrl(map.thumbnail)}
              alt={map.name}
              className={styles.thumbnailImage}
            />
          ) : (
            <EnvironmentOutlined className={styles.thumbnailPlaceholder} />
          )}
          {/* 拖拽手柄 */}
          <div className={styles.dragHandle} {...attributes} {...listeners}>
            <HolderOutlined />
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.mapName}>{map.name}</div>
          {map.description && <div className={styles.mapDescription}>{map.description}</div>}
          <div className={styles.mapStats}>
            <span className={styles.stat}>{map.chunkCount} 板块</span>
          </div>
        </div>
      </Card>
    </div>
  )
}

function MapList({ onSelectMap, onCreateAndEdit }: MapListProps): JSX.Element {
  const { modal, message } = App.useApp()

  const {
    maps,
    isLoading,
    error,
    loadList,
    createMap,
    deleteMap,
    exportMap,
    importMap,
    reorderMaps
  } = useMapStore()

  const { types: vocabularyTypes, loadTypes } = useVocabularyStore()

  // 创建模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newMapName, setNewMapName] = useState('')
  const [newMapDescription, setNewMapDescription] = useState('')
  const [newMapVocabularyTypes, setNewMapVocabularyTypes] = useState<string[]>([])
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    map: null
  })

  // 加载数据
  useEffect(() => {
    loadList()
    loadTypes()
  }, [loadList, loadTypes])

  // 点击其他地方关闭右键菜单
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }))
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  // 获取本地文件 URL
  const getLocalUrl = useCallback((filePath: string): string => {
    if (!filePath) return ''
    const normalizedPath = filePath.replace(/\\/g, '/')
    const encodedPath = encodeURIComponent(normalizedPath)
    return `local://file/${encodedPath}`
  }, [])

  // 打开创建模态框
  const handleOpenCreateModal = useCallback(() => {
    setNewMapName('')
    setNewMapDescription('')
    setNewMapVocabularyTypes([])
    setCreateModalVisible(true)
  }, [])

  // 关闭创建模态框
  const handleCloseCreateModal = useCallback(() => {
    setCreateModalVisible(false)
    setNewMapName('')
    setNewMapDescription('')
    setNewMapVocabularyTypes([])
  }, [])

  // 创建地图
  const handleCreate = useCallback(async () => {
    if (!newMapName.trim()) {
      message.error('请输入地图名称')
      return
    }

    setIsCreating(true)
    try {
      const newMap = await createMap({
        name: newMapName.trim(),
        description: newMapDescription.trim() || undefined,
        linkedVocabularyTypes: newMapVocabularyTypes
      })
      if (newMap) {
        message.success('创建成功')
        handleCloseCreateModal()
        // 进入编辑模式
        onCreateAndEdit(newMap.id)
      }
    } catch (_error) {
      message.error('创建失败')
    } finally {
      setIsCreating(false)
    }
  }, [
    newMapName,
    newMapDescription,
    newMapVocabularyTypes,
    createMap,
    message,
    handleCloseCreateModal,
    onCreateAndEdit
  ])

  // 右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, map: MapMeta) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      map
    })
  }, [])

  // 删除地图
  const handleDelete = useCallback(
    async (mapId: string) => {
      const mapItem = maps.find(m => m.id === mapId)
      if (!mapItem) return

      modal.confirm({
        title: '确认删除',
        content: `确定要删除地图「${mapItem.name}」吗？此操作不可恢复。`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          const success = await deleteMap(mapId)
          if (success) {
            message.success('删除成功')
          } else {
            message.error('删除失败')
          }
        }
      })
    },
    [maps, deleteMap, modal, message]
  )

  // 导出地图
  const handleExport = useCallback(
    async (mapId: string) => {
      const filePath = await exportMap(mapId)
      if (filePath) {
        message.success(`已导出到: ${filePath}`)
      }
    },
    [exportMap, message]
  )

  // 拖拽结束处理
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return

      const oldIndex = maps.findIndex(m => m.id === active.id)
      const newIndex = maps.findIndex(m => m.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const newMaps = arrayMove(maps, oldIndex, newIndex)
        const mapIds = newMaps.map(m => m.id)
        reorderMaps(mapIds)
      }
    },
    [maps, reorderMaps]
  )

  // 加载更多地图（当点击导入按钮时）
  const handleImportClick = useCallback(async () => {
    try {
      const filePath = await window.api.map.showImportDialog()
      if (filePath) {
        const importedMap = await importMap(filePath)
        if (importedMap) {
          message.success('导入成功')
        }
      }
    } catch (_error) {
      message.error('导入失败')
    }
  }, [importMap, message])

  if (isLoading && maps.length === 0) {
    return (
      <div className={styles.loading}>
        <Spin size="large" />
        <Text type="secondary">加载中...</Text>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.emptyState}>
        <Text type="secondary">{error}</Text>
        <Button onClick={() => loadList()}>重试</Button>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 头部 */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <Title level={4} style={{ margin: 0 }}>
            地图
          </Title>
          <Text type="secondary">({maps.length})</Text>
        </div>
        <div className={styles.headerActions}>
          <Button icon={<ImportOutlined />} onClick={handleImportClick}>
            导入
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
            新建地图
          </Button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className={styles.content}>
        {maps.length === 0 ? (
          <div className={styles.emptyState}>
            <EnvironmentOutlined className={styles.emptyIcon} />
            <Text type="secondary">暂无地图，点击「新建地图」创建</Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenCreateModal}>
              新建地图
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={maps.map(m => m.id)} strategy={rectSortingStrategy}>
              <div className={styles.grid}>
                {maps.map(map => (
                  <SortableCard
                    key={map.id}
                    map={map}
                    getLocalUrl={getLocalUrl}
                    onContextMenu={handleContextMenu}
                    onClick={onSelectMap}
                    onDoubleClick={onCreateAndEdit}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* 创建模态框 */}
      <Modal
        title="新建地图"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={handleCloseCreateModal}
        okText="创建"
        cancelText="取消"
        confirmLoading={isCreating}
      >
        <div className={styles.modalContent}>
          <div className={styles.formItem}>
            <span className={styles.formLabel}>名称 *</span>
            <Input
              placeholder="输入地图名称"
              value={newMapName}
              onChange={e => setNewMapName(e.target.value)}
              onPressEnter={handleCreate}
            />
          </div>
          <div className={styles.formItem}>
            <span className={styles.formLabel}>描述</span>
            <TextArea
              placeholder="输入地图描述（可选）"
              value={newMapDescription}
              onChange={e => setNewMapDescription(e.target.value)}
              rows={2}
            />
          </div>
          <div className={styles.formItem}>
            <span className={styles.formLabel}>关联词汇类型</span>
            <Select
              mode="multiple"
              placeholder="选择关联的词汇类型（可选）"
              value={newMapVocabularyTypes}
              onChange={setNewMapVocabularyTypes}
              style={{ width: '100%' }}
              options={vocabularyTypes.map(t => ({
                label: t.name,
                value: t.id
              }))}
              allowClear
            />
            <span className={styles.formHint}>
              关联词汇类型后，可以在地图中显示对应的角色/地点图标
            </span>
          </div>
        </div>
      </Modal>

      {/* 右键菜单 */}
      {contextMenu.visible && contextMenu.map && (
        <div
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              onSelectMap(contextMenu.map?.id ?? '')
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
          >
            <EditOutlined />
            <span>预览</span>
          </div>
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              onCreateAndEdit(contextMenu.map?.id ?? '')
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
          >
            <EditOutlined />
            <span>编辑</span>
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              handleExport(contextMenu.map?.id ?? '')
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
          >
            <ExportOutlined />
            <span>导出</span>
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={() => {
              handleDelete(contextMenu.map?.id ?? '')
              setContextMenu(prev => ({ ...prev, visible: false }))
            }}
          >
            <DeleteOutlined />
            <span>删除</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default MapList
