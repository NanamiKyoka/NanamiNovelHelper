import { useCallback, useMemo, useState } from 'react'
import {
  Table,
  Switch,
  InputNumber,
  Select,
  Space,
  Empty
} from 'antd'
import {
  HolderOutlined
} from '@ant-design/icons'
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
import type { FieldDefinition, TableColumnConfig } from '../../types/vocabulary'
import styles from './TableConfigEditor.module.css'

interface TableConfigEditorProps {
  fields: FieldDefinition[]
  config: TableColumnConfig[]
  onChange: (config: TableColumnConfig[]) => Promise<void>
  readOnly?: boolean
}

// 可排序的表格行组件
interface SortableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

function SortableRow({ 'data-row-key': id, ...props }: SortableRowProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id })

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? {
      opacity: 0.5,
      background: 'var(--ant-color-bg-text-hover)'
    } : {})
  }

  return (
    <tr
      {...props}
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
    />
  )
}

function TableConfigEditor({
  fields,
  config,
  onChange,
  readOnly = false
}: TableConfigEditorProps): JSX.Element {
  // 拖拽状态
  const [activeId, setActiveId] = useState<string | null>(null)

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

  // 确保配置与字段同步
  const syncedConfig = useMemo((): TableColumnConfig[] => {
    const fieldIds = new Set(fields.map(f => f.id))
    const existingConfig = config.filter(c => fieldIds.has(c.fieldId))
    const existingFieldIds = new Set(existingConfig.map(c => c.fieldId))

    // 添加新字段的配置
    const newConfigs = fields
      .filter(f => !existingFieldIds.has(f.id))
      .map((f, index) => ({
        fieldId: f.id,
        visible: true,
        width: f.width || 120,
        fixed: null as 'left' | 'right' | null,
        order: existingConfig.length + index
      }))

    return [...existingConfig, ...newConfigs]
  }, [fields, config])

  // 按 order 排序
  const sortedConfig = useMemo(() => {
    return [...syncedConfig].sort((a, b) => a.order - b.order)
  }, [syncedConfig])

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])

  // 拖拽结束 - 重新排序
  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedConfig.findIndex(c => c.fieldId === active.id)
      const newIndex = sortedConfig.findIndex(c => c.fieldId === over.id)

      // 创建新顺序
      const newConfig = [...sortedConfig]
      const [movedItem] = newConfig.splice(oldIndex, 1)
      newConfig.splice(newIndex, 0, movedItem)

      // 更新 order 字段
      const updatedConfig = newConfig.map((c, i) => ({ ...c, order: i }))

      onChange(updatedConfig).catch((error) => {
        console.error('Failed to reorder columns:', error)
      })
    }

    setActiveId(null)
  }, [sortedConfig, onChange])

  // 当前拖拽的配置项
  const activeConfig = activeId ? syncedConfig.find(c => c.fieldId === activeId) : null

  // 更新配置项
  const handleUpdate = async (
    fieldId: string,
    updates: Partial<TableColumnConfig>
  ): Promise<void> => {
    if (readOnly) return
    const updated = syncedConfig.map(c =>
      c.fieldId === fieldId ? { ...c, ...updates } : c
    )
    await onChange(updated)
  }

  // 表格列定义
  const columns = [
    {
      title: '',
      key: 'dragHandle',
      width: 40,
      className: 'drag-handle-cell',
      render: (_: unknown, record: TableColumnConfig) => (
        <div className={styles.dragHandle} style={{ cursor: 'grab', padding: '4px' }}>
          <HolderOutlined style={{ color: 'var(--text-tertiary)' }} />
        </div>
      )
    },
    {
      title: '字段',
      dataIndex: 'fieldId',
      key: 'fieldId',
      render: (fieldId: string) => fields.find(f => f.id === fieldId)?.name || fieldId
    },
    {
      title: '显示',
      dataIndex: 'visible',
      key: 'visible',
      width: 80,
      render: (visible: boolean, record: TableColumnConfig) => (
        <Switch
          checked={visible}
          onChange={(checked) => handleUpdate(record.fieldId, { visible: checked })}
          disabled={readOnly}
          size="small"
        />
      )
    },
    {
      title: '列宽',
      dataIndex: 'width',
      key: 'width',
      width: 120,
      render: (width: number, record: TableColumnConfig) => (
        <Space.Compact>
          <InputNumber
            value={width}
            onChange={(value) => handleUpdate(record.fieldId, { width: value || 120 })}
            min={50}
            max={500}
            disabled={readOnly}
            size="small"
            style={{ width: 60 }}
          />
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0 8px',
            background: 'var(--ant-color-bg-container-disabled)',
            border: '1px solid var(--ant-color-border)',
            borderLeft: 'none',
            borderRadius: '0 6px 6px 0',
            color: 'var(--ant-color-text-secondary)',
            fontSize: 12,
            height: 24
          }}>px</span>
        </Space.Compact>
      )
    },
    {
      title: '固定',
      dataIndex: 'fixed',
      key: 'fixed',
      width: 100,
      render: (fixed: 'left' | 'right' | null, record: TableColumnConfig) => (
        <Select
          value={fixed}
          onChange={(value) => handleUpdate(record.fieldId, { fixed: value })}
          options={[
            { value: null, label: '不固定' },
            { value: 'left', label: '左侧' },
            { value: 'right', label: '右侧' }
          ]}
          disabled={readOnly}
          size="small"
          style={{ width: '100%' }}
        />
      )
    }
  ]

  if (fields.length === 0) {
    return (
      <Empty
        description="请先添加字段定义"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    )
  }

  return (
    <div className={styles.container}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedConfig.map(c => c.fieldId)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.tableWrapper}>
            <Table
              dataSource={sortedConfig}
              columns={columns as unknown[]}
              rowKey="fieldId"
              size="small"
              pagination={false}
              components={{
                body: {
                  row: SortableRow
                }
              }}
            />
          </div>
        </SortableContext>

        <DragOverlay>
          {activeConfig ? (
            <div className={styles.overlayRow}>
              <Table
                dataSource={[activeConfig]}
                columns={columns as unknown[]}
                rowKey="fieldId"
                size="small"
                pagination={false}
                showHeader={false}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

export default TableConfigEditor