/**
 * 事序图列表组件
 * 展示所有事序图，支持创建、编辑、删除、导入导出
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Typography,
  Button,
  Card,
  Empty,
  Modal,
  App,
  Input,
  Spin,
  Tag,
  Tooltip,
} from 'antd'
import {
  PlusOutlined,
  ImportOutlined,
  ExportOutlined,
  DeleteOutlined,
  EditOutlined,
  ScheduleOutlined,
  FileTextOutlined,
  TableOutlined,
} from '@ant-design/icons'
import { useSequenceChartStore } from '@stores/sequenceChartStore'
import type { SequenceChartMeta } from '@types/sequence-chart'
import styles from './SequenceChartList.module.css'

const { Text, Title } = Typography
const { TextArea } = Input

interface SequenceChartListProps {
  onSelectChart: (chartId: string) => void
  onCreateAndEdit: (chartId: string) => void
}

// 右键菜单位置
interface ContextMenuState {
  visible: boolean
  x: number
  y: number
  chart: SequenceChartMeta | null
}

function SequenceChartList({ onSelectChart, onCreateAndEdit }: SequenceChartListProps): JSX.Element {
  const { modal, message } = App.useApp()

  const {
    charts,
    isLoading,
    error,
    loadList,
    createChart,
    deleteChart,
    exportChart,
    exportChartAsMarkdown,
    importChart,
  } = useSequenceChartStore()

  // 创建模态框状态
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [newChartName, setNewChartName] = useState('')
  const [newChartDescription, setNewChartDescription] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    chart: null,
  })

  const contextMenuRef = useRef<HTMLDivElement>(null)

  // 加载列表
  useEffect(() => {
    loadList()
  }, [loadList])

  // 将本地路径转换为 local:// URL
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
  const handleContextMenu = useCallback((e: React.MouseEvent, chart: SequenceChartMeta) => {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      chart,
    })
  }, [])

  // 创建新事序图
  const handleCreate = async () => {
    if (!newChartName.trim()) {
      message.warning('请输入事序图名称')
      return
    }

    setIsCreating(true)
    try {
      const chart = await createChart({
        name: newChartName.trim(),
        description: newChartDescription.trim() || undefined,
      })
      if (chart) {
        message.success('创建成功')
        setCreateModalVisible(false)
        setNewChartName('')
        setNewChartDescription('')
        onCreateAndEdit(chart.id)
      }
    } finally {
      setIsCreating(false)
    }
  }

  // 删除事序图
  const handleDelete = (chart: SequenceChartMeta) => {
    setContextMenu((prev) => ({ ...prev, visible: false }))
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
      },
    })
  }

  // 导出事序图
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
    setContextMenu((prev) => ({ ...prev, visible: false }))
  }

  // 导入事序图
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

  // 双击打开
  const handleDoubleClick = (chartId: string) => {
    onSelectChart(chartId)
  }

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
        ) : charts.length === 0 ? (
          <div className={styles.emptyState}>
            <TableOutlined className={styles.emptyIcon} />
            <Text>暂无事序图</Text>
            <Text type="secondary">点击"新建"创建第一个事序图</Text>
          </div>
        ) : (
          <div className={styles.grid}>
            {charts.map((chart) => (
              <Card
                key={chart.id}
                className={styles.chartCard}
                onContextMenu={(e) => handleContextMenu(e, chart)}
                onDoubleClick={() => handleDoubleClick(chart.id)}
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
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.chartName}>{chart.name}</div>
                  {chart.description && (
                    <div className={styles.chartDescription}>{chart.description}</div>
                  )}
                  <div className={styles.chartStats}>
                    <span className={styles.stat}>
                      <ScheduleOutlined />
                      {chart.eventCount} 事件
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* 右键菜单 */}
      {contextMenu.visible && contextMenu.chart && (
        <div
          ref={contextMenuRef}
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className={styles.contextMenuItem}
            onClick={() => {
              onSelectChart(contextMenu.chart!.id)
              setContextMenu((prev) => ({ ...prev, visible: false }))
            }}
          >
            <EditOutlined />
            <span>编辑</span>
          </div>
          <div className={styles.contextMenuSubmenu}>
            <ExportOutlined />
            <span>导出</span>
            <div className={styles.contextMenuSubmenuItems}>
              <div
                className={styles.contextMenuItem}
                onClick={() => handleExport(contextMenu.chart!, 'json')}
              >
                导出为 JSON
              </div>
              <div
                className={styles.contextMenuItem}
                onClick={() => handleExport(contextMenu.chart!, 'markdown')}
              >
                导出为 Markdown
              </div>
            </div>
          </div>
          <div className={styles.contextMenuDivider} />
          <div
            className={`${styles.contextMenuItem} ${styles.contextMenuItemDanger}`}
            onClick={() => handleDelete(contextMenu.chart!)}
          >
            <DeleteOutlined />
            <span>删除</span>
          </div>
        </div>
      )}

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
              onChange={(e) => setNewChartName(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className={styles.formItem}>
            <label className={styles.formLabel}>描述</label>
            <TextArea
              placeholder="输入事序图描述（可选）"
              value={newChartDescription}
              onChange={(e) => setNewChartDescription(e.target.value)}
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
