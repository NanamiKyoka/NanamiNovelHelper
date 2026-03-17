import { useState, useMemo, useEffect } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  ColorPicker,
  Space,
  message,
  Tag,
  Popconfirm,
  Empty,
  Tabs
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  TagOutlined,
  LinkOutlined,
  PictureOutlined
} from '@ant-design/icons'
import { useVocabularyStore } from '../../stores/vocabularyStore'
import type { 
  VocabularyEntry, 
  VocabularyType, 
  FieldDefinition 
} from '../../types/vocabulary'
import { DEFAULT_COLORS } from '../../types/vocabulary'
import ImageUpload from './ImageUpload'
import styles from './VocabularyPanel.module.css'

// 类型图标映射
const TYPE_ICONS: Record<string, React.ReactNode> = {
  'character': <TeamOutlined />,
  'location': <EnvironmentOutlined />,
  'organization': <TeamOutlined />,
  'item': <GiftOutlined />,
  'magic': <ThunderboltOutlined />,
  'event': <CalendarOutlined />
}

interface VocabularyPanelProps {
  readOnly?: boolean
  /** 外部搜索关键词（选中文字后自动搜索） */
  externalSearchText?: string
}

function VocabularyPanel({ readOnly = false, externalSearchText }: VocabularyPanelProps): JSX.Element {
  const {
    types,
    entries,
    loadTypes,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    createLinkedFile,
    isLoaded
  } = useVocabularyStore()
  
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VocabularyEntry | null>(null)
  const [currentType, setCurrentType] = useState<string>('')
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')

  // 加载数据
  useEffect(() => {
    if (!isLoaded) {
      loadTypes()
      loadEntries()
    }
  }, [isLoaded, loadTypes, loadEntries])

  // 监听外部搜索关键词
  useEffect(() => {
    if (externalSearchText !== undefined) {
      setSearchText(externalSearchText)
    }
  }, [externalSearchText])

  // 当 types 变化时，同步 currentType
  useEffect(() => {
    if (types.length > 0) {
      if (!types.find(t => t.id === currentType)) {
        setCurrentType(types[0].id)
      }
    } else {
      setCurrentType('')
    }
  }, [types, currentType])

  // 当前类型的字段定义
  const currentTypeDefinition = types.find(t => t.id === currentType)
  
  // 过滤当前类型的条目
  const currentEntries = entries.filter(item => item.typeId === currentType)
  
  // 搜索过滤
  const filteredEntries = currentEntries.filter(item => 
    !searchText || 
    item.name.toLowerCase().includes(searchText.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
    item.aliases.some(a => a.toLowerCase().includes(searchText.toLowerCase()))
  )

  // 根据配置生成表格列
  const columns = useMemo(() => {
    if (!currentTypeDefinition) {
      return getDefaultColumns()
    }

    const fields = currentTypeDefinition.fields
    const tableConfig = currentTypeDefinition.tableConfig

    // 如果没有字段，使用默认列
    if (!fields || fields.length === 0) {
      return getDefaultColumns()
    }

    // 创建字段映射便于查找
    const fieldMap = new Map(fields.map(f => [f.id, f]))

    // 名称列（始终在第一位）
    const nameColumn = {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
      width: 120,
      fixed: 'left' as const,
      render: (name: string, record: VocabularyEntry) => (
        <Space>
          <div
            style={{
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: record.color
            }}
          />
          <span>{name}</span>
          {record.linkedFilePath && (
            <LinkOutlined style={{ fontSize: 12, color: '#999' }} />
          )}
        </Space>
      )
    }

    // 字段列 - 根据 tableConfig 过滤和排序
    let fieldColumns: object[]

    if (tableConfig && tableConfig.length > 0) {
      // 使用 tableConfig 过滤可见列并排序
      const visibleConfig = tableConfig
        .filter(c => c.visible && c.fieldId !== 'name')
        .sort((a, b) => a.order - b.order)

      fieldColumns = visibleConfig.map(config => {
        const field = fieldMap.get(config.fieldId)
        if (!field) return null

        return {
          title: field.name,
          dataIndex: ['fields', field.id],
          key: field.id,
          width: config.width || 120,
          fixed: config.fixed || undefined,
          ellipsis: field.type === 'textarea',
          render: (value: string | string[]) => {
            if (value === undefined || value === null || value === '') return '-'
            // 图片类型显示图标
            if (field.type === 'image') {
              return <PictureOutlined style={{ fontSize: 16, color: '#1890ff' }} />
            }
            if (Array.isArray(value)) {
              return value.length > 0
                ? value.slice(0, 2).map((v, i) => <Tag key={i} style={{ margin: '2px' }}>{v}</Tag>)
                : '-'
            }
            if (field.type === 'select') {
              return <Tag>{value}</Tag>
            }
            return String(value)
          }
        }
      }).filter(Boolean)
    } else {
      // 没有 tableConfig 时使用默认逻辑
      fieldColumns = fields
        .filter(f => f.id !== 'name')
        .slice(0, 4)
        .map(field => ({
          title: field.name,
          dataIndex: ['fields', field.id],
          key: field.id,
          width: 120,
          ellipsis: field.type === 'textarea',
          render: (value: string | string[]) => {
            if (value === undefined || value === null || value === '') return '-'
            // 图片类型显示图标
            if (field.type === 'image') {
              return <PictureOutlined style={{ fontSize: 16, color: '#1890ff' }} />
            }
            if (Array.isArray(value)) {
              return value.length > 0
                ? value.slice(0, 2).map((v, i) => <Tag key={i} style={{ margin: '2px' }}>{v}</Tag>)
                : '-'
            }
            if (field.type === 'select') {
              return <Tag>{value}</Tag>
            }
            return String(value)
          }
        }))
    }

    // 操作列
    const actionColumn = readOnly ? null : {
      title: '操作',
      key: 'action',
      width: 80,
      fixed: 'right' as const,
      render: (_: unknown, record: VocabularyEntry) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="确定删除此词汇？"
            onConfirm={() => handleDelete(record.id)}
            okText="删除"
            cancelText="取消"
          >
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
        </Space>
      )
    }

    return [nameColumn, ...fieldColumns, actionColumn].filter(Boolean)
  }, [currentTypeDefinition, readOnly])

  // 默认列定义
  function getDefaultColumns() {
    const baseColumns = [
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        width: 120,
        render: (name: string, record: VocabularyEntry) => (
          <Space>
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: record.color
              }}
            />
            <span>{name}</span>
          </Space>
        )
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (desc: string) => desc || '-'
      },
      {
        title: '别名',
        dataIndex: 'aliases',
        key: 'aliases',
        width: 150,
        render: (aliases: string[]) => 
          aliases?.length > 0 
            ? aliases.slice(0, 3).map((a, i) => <Tag key={i} style={{ margin: '2px' }}>{a}</Tag>)
            : '-'
      }
    ]

    if (!readOnly) {
      baseColumns.push({
        title: '操作',
        key: 'action',
        width: 80,
        render: (_: unknown, record: VocabularyEntry) => (
          <Space>
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
            <Popconfirm
              title="确定删除此词汇？"
              onConfirm={() => handleDelete(record.id)}
              okText="删除"
              cancelText="取消"
            >
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Popconfirm>
          </Space>
        )
      } as unknown)
    }

    return baseColumns
  }

  // 打开新建抽屉
  const handleCreate = (): void => {
    if (readOnly) return
    setEditingEntry(null)
    form.resetFields()
    
    // 设置默认值
    const defaultFields: Record<string, string | string[]> = {}
    currentTypeDefinition?.fields.forEach(field => {
      if (field.defaultValue) {
        defaultFields[field.id] = field.defaultValue
      } else if (field.type === 'tags') {
        defaultFields[field.id] = []
      } else {
        defaultFields[field.id] = ''
      }
    })
    
    form.setFieldsValue({
      fields: defaultFields,
      color: currentTypeDefinition?.color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
      aliases: [],
      tags: []
    })
    setDrawerOpen(true)
  }

  // 打开编辑抽屉
  const handleEdit = (entry: VocabularyEntry): void => {
    if (readOnly) return
    setEditingEntry(entry)
    form.setFieldsValue({
      name: entry.name,
      aliases: entry.aliases || [],
      color: entry.color,
      tags: entry.tags || [],
      description: entry.description,
      linkedFilePath: entry.linkedFilePath,
      fields: entry.fields || {}
    })
    setDrawerOpen(true)
  }

  // 保存条目
  const handleSave = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const colorValue = typeof values.color === 'string' 
        ? values.color 
        : values.color?.toHexString?.() || '#1890ff'
      const typeName = types.find(t => t.id === currentType)?.name || '未知'

      if (editingEntry) {
        // 编辑模式
        await updateEntry(editingEntry.id, {
          name: values.name,
          aliases: values.aliases || [],
          color: colorValue,
          tags: values.tags || [],
          description: values.description,
          linkedFilePath: values.linkedFilePath,
          fields: values.fields || {}
        })
        message.success('更新成功')
      } else {
        // 新建模式
        await addEntry({
          name: values.name,
          aliases: values.aliases || [],
          color: colorValue,
          typeId: currentType,
          typeName,
          fields: values.fields || {},
          tags: values.tags || [],
          description: values.description,
          linkedFilePath: values.linkedFilePath
        })
        message.success('创建成功')
      }
      
      setDrawerOpen(false)
    } catch (error) {
      console.error('保存失败:', error)
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除条目
  const handleDelete = async (id: string): Promise<void> => {
    if (readOnly) return
    await deleteEntry(id)
    message.success('删除成功')
  }

  // 创建关联文件
  const handleCreateLinkedFile = async (): Promise<void> => {
    const currentEntryId = editingEntry?.id
    if (!currentEntryId) {
      message.warning('请先保存词汇后再创建关联文件')
      return
    }
    
    const entry = entries.find(e => e.id === currentEntryId)
    if (!entry) return
    
    const filePath = await createLinkedFile(entry)
    if (filePath) {
      message.success('关联文件创建成功')
      form.setFieldValue('linkedFilePath', filePath)
    }
  }

  // 渲染字段输入组件
  const renderFieldInput = (field: FieldDefinition): JSX.Element => {
    switch (field.type) {
      case 'text':
        return <Input placeholder={field.placeholder || `请输入${field.name}`} />
      case 'textarea':
        return <Input.TextArea rows={3} placeholder={field.placeholder || `请输入${field.name}`} />
      case 'tags':
        return <Select mode="tags" placeholder={field.placeholder || '输入后按回车添加'} />
      case 'select':
        return (
          <Select 
            placeholder={field.placeholder || `请选择${field.name}`}
            options={field.options?.map(o => ({ value: o, label: o }))}
          />
        )
      case 'number':
        return <Input type="number" placeholder={field.placeholder || `请输入${field.name}`} />
      case 'date':
        return <Input type="date" />
      case 'color':
        return <ColorPicker format="hex" />
      case 'image':
        return <ImageUpload config={field.imageConfig} />
      case 'reference':
        const refItems = entries.filter(item => item.typeId === field.referenceTypeId)
        return (
          <Select
            placeholder={`选择${field.name}`}
            options={refItems.map(item => ({ value: item.id, label: item.name }))}
            showSearch
            filterOption={(input, option) => 
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
          />
        )
      default:
        return <Input placeholder={field.placeholder || `请输入${field.name}`} />
    }
  }

  // 标签页配置
  const tabItems = types.map(type => ({
    key: type.id,
    label: (
      <span>
        {TYPE_ICONS[type.id] || <TagOutlined />}
        {' '}{type.name}
        <span style={{ marginLeft: 4, fontSize: 12, color: '#999' }}>
          ({entries.filter(e => e.typeId === type.id).length})
        </span>
      </span>
    )
  }))

  if (!entries.length && readOnly) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="请先打开项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {/* 类型标签页 */}
      {types.length > 0 && (
        <Tabs
          activeKey={currentType}
          onChange={(key) => { setCurrentType(key); setSearchText('') }}
          items={tabItems}
          size="small"
          className={styles.tabs}
        />
      )}

      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <Input.Search
          placeholder="搜索..."
          allowClear
          style={{ width: 200 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          onClick={handleCreate} 
          disabled={readOnly || !currentType}
        >
          新建
        </Button>
      </div>
      
      {/* 表格 */}
      <div className={styles.tableContainer}>
        <Table
          dataSource={filteredEntries}
          columns={columns as unknown[]}
          rowKey="id"
          size="small"
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 10 }}
          locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </div>

      {/* 编辑抽屉 */}
      <Drawer
        title={editingEntry ? `编辑${currentTypeDefinition?.name || '词汇'}` : `新建${currentTypeDefinition?.name || '词汇'}`}
        placement="right"
        width={480}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        footer={
          <Space>
            <Button onClick={() => setDrawerOpen(false)}>取消</Button>
            <Button type="primary" loading={loading} onClick={handleSave}>
              保存
            </Button>
          </Space>
        }
      >
        <Form form={form} layout="vertical">
          {/* 基础字段 */}
          <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}>
            <Input placeholder="词汇名称" />
          </Form.Item>

          <Form.Item name="aliases" label="别名">
            <Select mode="tags" placeholder="输入别名后按回车添加" />
          </Form.Item>

          <Form.Item name="color" label="标记颜色">
            <ColorPicker format="hex" />
          </Form.Item>

          {/* 动态字段 */}
          {currentTypeDefinition?.fields
            .filter(f => f.id !== 'name')
            .sort((a, b) => a.order - b.order)
            .map(field => (
              <Form.Item
                key={field.id}
                name={['fields', field.id]}
                label={field.name}
                rules={[{ required: field.required, message: `请输入${field.name}` }]}
              >
                {renderFieldInput(field)}
              </Form.Item>
            ))
          }

          {/* 通用字段 */}
          <Form.Item name="description" label="备注">
            <Input.TextArea rows={3} placeholder="备注说明" />
          </Form.Item>

          <Form.Item name="tags" label="标签">
            <Select mode="tags" placeholder="添加标签" />
          </Form.Item>

          {/* 关联文件 */}
          <Form.Item 
            name="linkedFilePath" 
            label={
              <Space>
                关联文件
                {editingEntry && (
                  <Button 
                    type="link" 
                    size="small" 
                    onClick={handleCreateLinkedFile}
                    disabled={!editingEntry.linkedFilePath}
                  >
                    {editingEntry.linkedFilePath ? '重新生成' : '创建关联文件'}
                  </Button>
                )}
              </Space>
            }
          >
            <Input placeholder="关联的 Markdown 文件路径" disabled />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export default VocabularyPanel
