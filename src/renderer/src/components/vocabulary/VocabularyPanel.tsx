import React, { useState, useMemo, useEffect, useCallback } from 'react'
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
  TagOutlined,
  LinkOutlined,
  PictureOutlined,
  SettingOutlined,
  FullscreenOutlined,
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useVocabularyStore } from '../../stores/vocabularyStore'
import type { 
  VocabularyEntry, 
  VocabularyType, 
  FieldDefinition 
} from '../../types/vocabulary'
import { DEFAULT_COLORS } from '../../types/vocabulary'
import ImageUpload from './ImageUpload'
import VocabularyTypeSettings from './VocabularyTypeSettings'
import VocabularyFullscreen from './VocabularyFullscreen'
import { getIconPreview } from './IconPicker'
import styles from './VocabularyPanel.module.css'

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

interface VocabularyPanelProps {
  readOnly?: boolean
  /** 外部搜索关键词（选中文字后自动搜索） */
  externalSearchText?: string
  /** 嵌入模式（隐藏类型标签页和工具栏，用于全屏编辑器） */
  embedded?: boolean
  /** 当前类型ID（嵌入模式下使用） */
  currentTypeId?: string
  /** 类型切换回调（嵌入模式下使用） */
  onTypeChange?: (typeId: string) => void
  /** 启用拖拽排序（仅在编辑界面启用） */
  enableSorting?: boolean
}

function VocabularyPanel({ 
  readOnly = false, 
  externalSearchText,
  embedded = false,
  currentTypeId,
  onTypeChange,
  enableSorting = false
}: VocabularyPanelProps): JSX.Element {
  const {
    types,
    entries,
    loadTypes,
    loadEntries,
    addEntry,
    updateEntry,
    deleteEntry,
    createLinkedFile,
    reorderEntries,
    isLoaded
  } = useVocabularyStore()
  
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VocabularyEntry | null>(null)
  const [internalCurrentType, setInternalCurrentType] = useState<string>('')
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [typeSettingsOpen, setTypeSettingsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  
  // 拖拽状态（仅在启用排序时使用）
  const [activeId, setActiveId] = useState<string | null>(null)
  
  // DnD 传感器（仅在启用排序时使用）
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

  // 嵌入模式下使用外部传入的 currentTypeId，否则使用内部状态
  const currentType = embedded ? (currentTypeId || '') : internalCurrentType
  const setCurrentType = embedded 
    ? (typeId: string) => onTypeChange?.(typeId) 
    : setInternalCurrentType

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

  // 按 order 字段排序的条目（用于拖拽排序）
  const sortedEntries = useMemo(() => {
    return [...filteredEntries].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  }, [filteredEntries])

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])
  
  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event
    
    if (over && active.id !== over.id && currentType) {
      const oldIndex = sortedEntries.findIndex(e => e.id === active.id)
      const newIndex = sortedEntries.findIndex(e => e.id === over.id)
      
      const newEntries = arrayMove(sortedEntries, oldIndex, newIndex)
      const newEntryIds = newEntries.map(e => e.id)
      
      // 调用 reorderEntries 更新顺序
      reorderEntries(currentType, newEntryIds).catch((error) => {
        console.error('Failed to reorder entries:', error)
        message.error('排序失败')
      })
    }
    
    setActiveId(null)
  }, [sortedEntries, currentType, reorderEntries])
  
  // 当前拖拽的条目
  const activeEntry = activeId ? entries.find(e => e.id === activeId) : null

  // 根据配置生成表格列
  const columns = useMemo(() => {
    // 拖拽手柄列（仅在启用排序时显示）
    const dragHandleColumn = (enableSorting && !readOnly) ? {
      title: '',
      key: 'dragHandle',
      width: 40,
      fixed: 'left' as const,
      className: 'drag-handle-cell',
      render: (_: unknown, record: VocabularyEntry) => (
        <div
          className={styles.dragHandle}
          style={{ cursor: 'grab', padding: '4px' }}
        >
          <HolderOutlined style={{ color: '#999' }} />
        </div>
      )
    } : null

    if (!currentTypeDefinition) {
      return [dragHandleColumn, ...getDefaultColumns()].filter(Boolean)
    }

    const fields = currentTypeDefinition.fields
    const tableConfig = currentTypeDefinition.tableConfig

    // 如果没有字段，使用默认列
    if (!fields || fields.length === 0) {
      return [dragHandleColumn, ...getDefaultColumns()].filter(Boolean)
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

    return [dragHandleColumn, nameColumn, ...fieldColumns, actionColumn].filter(Boolean)
  }, [currentTypeDefinition, readOnly, enableSorting])

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
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        <span style={{ marginRight: 4 }}>{getIconPreview(type.icon, <TagOutlined />)}</span>
        {type.name}
        <span style={{ fontSize: 12, color: '#999', marginLeft: 4 }}>
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

  // 全屏编辑模式
  if (fullscreen) {
    return <VocabularyFullscreen onBack={() => setFullscreen(false)} />
  }

  return (
    <div className={styles.container}>
      {/* 类型标签页 - 嵌入模式下隐藏 */}
      {!embedded && types.length > 0 && (
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
          style={{ width: embedded ? '100%' : 200 }}
          onChange={(e) => setSearchText(e.target.value)}
        />
        {!embedded && (
          <Space>
            <Button 
              icon={<FullscreenOutlined />} 
              onClick={() => setFullscreen(true)}
            >
              编辑
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreate} 
              disabled={readOnly || !currentType}
            >
              新建
            </Button>
          </Space>
        )}
        {embedded && (
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            onClick={handleCreate} 
            disabled={readOnly || !currentType}
          >
            新建
          </Button>
        )}
      </div>
      
      {/* 表格 */}
      <div className={styles.tableContainer}>
        {enableSorting ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={sortedEntries.map(e => e.id)}
              strategy={verticalListSortingStrategy}
            >
              <Table
                dataSource={sortedEntries}
                columns={columns as unknown[]}
                rowKey="id"
                size="small"
                scroll={{ x: 'max-content' }}
                pagination={{ pageSize: 10, align: 'center' }}
                locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                components={{
                  body: {
                    row: SortableRow
                  }
                }}
              />
            </SortableContext>
            
            <DragOverlay>
              {activeEntry ? (
                <div className={styles.overlayRow}>
                  <Table
                    dataSource={[activeEntry]}
                    columns={columns as unknown[]}
                    rowKey="id"
                    size="small"
                    pagination={false}
                    showHeader={false}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        ) : (
          <Table
            dataSource={filteredEntries}
            columns={columns as unknown[]}
            rowKey="id"
            size="small"
            scroll={{ x: 'max-content' }}
            pagination={{ pageSize: 10, align: 'center' }}
            locale={{ emptyText: <Empty description="暂无数据" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
          />
        )}
      </div>

      {/* 编辑抽屉 */}
      <Drawer
        title={
          <Space>
            <span>{editingEntry ? `编辑${currentTypeDefinition?.name || '词汇'}` : `新建${currentTypeDefinition?.name || '词汇'}`}</span>
            <Button 
              type="link" 
              size="small"
              icon={<SettingOutlined />}
              onClick={() => setTypeSettingsOpen(true)}
              style={{ marginLeft: 8 }}
            >
              管理字段
            </Button>
          </Space>
        }
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

      {/* 管理词汇类型抽屉 */}
      <Drawer
        title="管理词汇类型"
        placement="right"
        width={600}
        open={typeSettingsOpen}
        onClose={() => setTypeSettingsOpen(false)}
        footer={null}
      >
        <VocabularyTypeSettings />
      </Drawer>
    </div>
  )
}

export default VocabularyPanel
