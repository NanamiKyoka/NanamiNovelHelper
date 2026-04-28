/**
 * 事序图列表组件
 * 展示所有事序图，支持创建、编辑、删除、导入导出、拖拽排序
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Typography, Button, Card, Modal, App, Input, Spin, Tag, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  ScheduleOutlined,
  TableOutlined,
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
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import type { SequenceChartMeta } from '@shared/sequence-chart'
import styles from './SequenceChartList.module.css'

const { Title, Text } = Typography
const { TextArea } = Input

interface SequenceChartListProps {
  onOpenChart?: (chartId: string) => void
  onCreateChart?: () => void
}

interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  chart: SequenceChartMeta | null
}

interface SortableCardProps {
  chart: SequenceChartMeta
  getLocalUrl: (filePath: string) => string
  onContextMenu: (e: React.MouseEvent, chart: SequenceChartMeta) => void
  onDoubleClick: (chartId: string) => void
}

function SortableCard({
  chart,
  getLocalUrl,
  onContextMenu,
  onDoubleClick
}: SortableCardProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chart.id
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
        className={styles.chartCard}
        onContextMenu={e => onContextMenu(e, chart)}
        onDoubleClick={() => onDoubleClick(chart.id)}
        styles={{ body: { padding: 0 } }}
      >
        <div className={styles.thumbnail}>
          {chart.thumbnail ? (
            <img
              src={getLocalUrl(chart.thumbnail)}
              alt={chart.name}
              className={styles.thumbnailImage}
            />
          ) : (
            <TableOutlined className={styles.thumbnailPlaceholder} />
          )}
          <div className={styles.dragHandle} {...attributes} {...listeners}>
            <HolderOutlined />
          </div>
        </div>
        <div className={styles.cardBody}>
          <div className={styles.chartName}>{chart.name}</div>
          {chart.description && <div className={styles.chartDescription}>{chart.description}</div>}
          <div className={styles.chartStats}>
            <span className={styles.stat}>
              <ScheduleOutlined />
              {chart.eventCount || 0} 事件
            </span>
          </div>
          {chart.tags && chart.tags.length > 0 && (
            <div className={styles.chartTags}>
              {chart.tags.slice(0, 2).map((tag, index) => (
                <Tag key={index} className={styles.chartTag}>
                  {tag}
                </Tag>
              ))}
              {chart.tags.length > 2 && (
                <span className={styles.moreTags}>+{chart.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function SequenceChartList({
  onOpenChart,
  onCreateChart: _onCreateChart
}: SequenceChartListProps): JSX.Element {
  const {
    charts,
    isLoading,
    loadList,
    createChart,
    deleteChart,
    exportChart,
    exportChartAsMarkdown,
    importChart,
    reorderCharts
  } = useSequenceChartStore()
  const { message, modal } = App.useApp()

  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newChartName, setNewChartName] = useState('')
  const [newChartDescription, setNewChartDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    chart: null
  })

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

  const sortedCharts = useMemo(() => {
    return [...charts].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [charts])

  useEffect(() => {
    loadList()
  }, [loadList])

  const getLocalUrl = (filePath: string): string => {
    const normalizedPath = filePath.replace(/\\/g, '/')
    const encodedPath = encodeURIComponent(normalizedPath)
    return `local://file/${encodedPath}`
  }

  const handleContextMenu = useCallback((e: React.MouseEvent, chart: SequenceChartMeta) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chart
    })
  }, [])

  const handleOpenChart = useCallback(
    (chartId: string) => {
      if (onOpenChart) {
        onOpenChart(chartId)
      }
    },
    [onOpenChart]
  )

  const handleDoubleClick = (chartId: string) => {
    handleOpenChart(chartId)
  }

  const handleCreate = async () => {
    if (!newChartName.trim()) {
      message.warning('请输入事序图名称')
      return
    }

    setIsCreating(true)
    try {
      const chart = await createChart({
        name: newChartName.trim(),
        description: newChartDescription.trim() || undefined
      })
      if (chart) {
        message.success('创建成功')
        setCreateModalVisible(false)
        setNewChartName('')
        setNewChartDescription('')
        if (onOpenChart) {
          onOpenChart(chart.id)
        }
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = (chart: SequenceChartMeta) => {
    setContextMenu(prev => ({ ...prev, visible: false }))
    modal.confirm({
      title: '确定要删除这个事序图吗？',
      content: `将删除「${chart.name}」，删除后无法恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await deleteChart(chart.id)
          message.success('删除成功')
        } catch {
          message.error('删除失败')
        }
      }
    })
  }

  const handleExport = async (chart: SequenceChartMeta, format: 'json' | 'markdown' = 'json') => {
    try {
      const filePath = await window.electron.sequenceChart.showExportDialog(chart.name, format)
      if (filePath) {
        const content =
          format === 'markdown'
            ? await exportChartAsMarkdown(chart.id)
            : await exportChart(chart.id)
        if (content) {
          await window.electron.sequenceChart.saveExportFile(filePath, content)
          message.success('导出成功')
        }
      }
    } catch {
      message.error('导出失败')
    }
    setContextMenu(prev => ({ ...prev, visible: false }))
  }

  const handleImport = async () => {
    try {
      const filePath = await window.electron.sequenceChart.showImportDialog()
      if (filePath) {
        const content = await window.electron.sequenceChart.readImportFile(filePath)
        if (content) {
          const chart = await importChart(content)
          if (chart) {
            message.success('导入成功')
          }
        }
      }
    } catch {
      message.error('导入失败')
    }
  }

  const getContextMenuItems = useCallback((): MenuProps['items'] => {
    const chart = contextMenu.chart
    if (!chart) return []

    return [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: '编辑',
        onClick: () => {
          handleOpenChart(chart.id)
          setContextMenu(prev => ({ ...prev, visible: false }))
        }
      },
      {
        key: 'export',
        icon: <ExportOutlined />,
        label: '导出',
        children: [
          {
            key: 'export-json',
            label: '导出为 JSON',
            onClick: () => handleExport(chart, 'json')
          },
          {
            key: 'export-markdown',
            label: '导出为 Markdown',
            onClick: () => handleExport(chart, 'markdown')
          }
        ]
      },
      { type: 'divider' },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: '删除',
        danger: true,
        onClick: () => handleDelete(chart)
      }
    ]
  }, [contextMenu.chart, handleOpenChart, handleExport, handleDelete])

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      if (over && active.id !== over.id) {
        const oldIndex = sortedCharts.findIndex(c => c.id === active.id)
        const newIndex = sortedCharts.findIndex(c => c.id === over.id)

        if (oldIndex !== -1 && newIndex !== -1) {
          const newCharts = arrayMove(sortedCharts, oldIndex, newIndex)
          const newChartIds = newCharts.map(c => c.id)

          const success = await reorderCharts(newChartIds)
          if (!success) {
            message.error('排序保存失败')
          }
        }
      }
    },
    [sortedCharts, reorderCharts, message]
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <TableOutlined />
          <Title level={5} style={{ margin: 0 }}>
            事序图
          </Title>
          <Text type="secondary">({charts.length})</Text>
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
        ) : charts.length === 0 ? (
          <div className={styles.emptyState}>
            <TableOutlined className={styles.emptyIcon} />
            <Text>暂无事序图</Text>
            <Text type="secondary">创建事序图来规划故事中的事件顺序</Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              创建第一个事序图
            </Button>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={sortedCharts.map(c => c.id)} strategy={rectSortingStrategy}>
              <div className={styles.grid}>
                {sortedCharts.map(chart => (
                  <SortableCard
                    key={chart.id}
                    chart={chart}
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

      {/* 右键菜单 - 使用 Ant Design Dropdown */}
      <Dropdown
        menu={{ items: getContextMenuItems() }}
        open={contextMenu.visible}
        onOpenChange={open => {
          if (!open) {
            setContextMenu(prev => ({ ...prev, visible: false }))
          }
        }}
        overlayStyle={{
          position: 'fixed',
          left: contextMenu.x,
          top: contextMenu.y,
          zIndex: 1050
        }}
      >
        <div style={{ position: 'fixed', left: contextMenu.x, top: contextMenu.y }} />
      </Dropdown>

      {/* 创建模态框 */}
      <Modal
        title="创建事序图"
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
              placeholder="输入事序图名称"
              value={newChartName}
              onChange={e => setNewChartName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              placeholder="输入事序图描述（可选）"
              value={newChartDescription}
              onChange={e => setNewChartDescription(e.target.value)}
              rows={3}
              maxLength={200}
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default SequenceChartList
