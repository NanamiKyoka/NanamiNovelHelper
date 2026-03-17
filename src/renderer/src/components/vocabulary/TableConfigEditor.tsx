import { useCallback } from 'react'
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
import type { FieldDefinition, TableColumnConfig } from '../../types/vocabulary'

interface TableConfigEditorProps {
  fields: FieldDefinition[]
  config: TableColumnConfig[]
  onChange: (config: TableColumnConfig[]) => Promise<void>
  readOnly?: boolean
}

function TableConfigEditor({
  fields,
  config,
  onChange,
  readOnly = false
}: TableConfigEditorProps): JSX.Element {
  // 确保配置与字段同步
  const syncConfig = useCallback((): TableColumnConfig[] => {
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

  const syncedConfig = syncConfig()

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

  // 移动配置项顺序
  const handleMove = async (fieldId: string, direction: 'up' | 'down'): Promise<void> => {
    if (readOnly) return
    const index = syncedConfig.findIndex(c => c.fieldId === fieldId)
    if (index === -1) return

    const newConfig = [...syncedConfig]
    if (direction === 'up' && index > 0) {
      [newConfig[index - 1], newConfig[index]] = [newConfig[index], newConfig[index - 1]]
    } else if (direction === 'down' && index < syncedConfig.length - 1) {
      [newConfig[index], newConfig[index + 1]] = [newConfig[index + 1], newConfig[index]]
    }

    // 更新 order
    const updated = newConfig.map((c, i) => ({ ...c, order: i }))
    await onChange(updated)
  }

  // 表格列定义
  const columns = [
    {
      title: '',
      key: 'drag',
      width: 30,
      render: (_: unknown, __: TableColumnConfig, index: number) => (
        <Space direction="vertical" size={0}>
          <a
            onClick={() => handleMove(syncedConfig[index].fieldId, 'up')}
            style={{ 
              opacity: index === 0 ? 0.3 : 1,
              cursor: index === 0 ? 'default' : 'pointer'
            }}
          >
            <HolderOutlined rotate={-90} />
          </a>
          <a
            onClick={() => handleMove(syncedConfig[index].fieldId, 'down')}
            style={{ 
              opacity: index === syncedConfig.length - 1 ? 0.3 : 1,
              cursor: index === syncedConfig.length - 1 ? 'default' : 'pointer'
            }}
          >
            <HolderOutlined rotate={90} />
          </a>
        </Space>
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
    <Table
      dataSource={syncedConfig}
      columns={columns}
      rowKey="fieldId"
      size="small"
      pagination={false}
    />
  )
}

export default TableConfigEditor
