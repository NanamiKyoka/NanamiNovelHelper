import React, { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
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
  Tabs,
  Dropdown,
  Modal,
  Collapse,
  Badge,
  Checkbox,
  Tooltip
} from 'antd'
import type { MenuProps, TableProps } from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  LinkOutlined,
  PictureOutlined,
  SettingOutlined,
  FullscreenOutlined,
  HolderOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExportOutlined,
  FilterOutlined,
  ClearOutlined,
  ColumnHeightOutlined,
  FileAddOutlined,
  FolderOpenOutlined
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
import { useEditorStore } from '../../stores/editorStore'
import { useFileTreeStore } from '../../stores/fileTreeStore'
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
    transition
  }

  return (
    <tr
      {...props}
      ref={setNodeRef}
      style={style}
      className={`${props.className || ''} ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
    />
  )
}

interface VocabularyPanelProps {
  readOnly?: boolean
  externalSearchText?: string
  embedded?: boolean
  currentTypeId?: string
  onTypeChange?: (typeId: string) => void
}

export interface VocabularyPanelRef {
  openCreateDrawer: () => void
  closeDrawer: () => void
  focusSearch: () => void
  isDrawerOpen: () => boolean
}

const VocabularyPanel = forwardRef<VocabularyPanelRef, VocabularyPanelProps>(function VocabularyPanel(
  { 
    readOnly = false, 
    externalSearchText,
    embedded = false,
    currentTypeId,
    onTypeChange
  },
  ref
): JSX.Element {
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
    updateType,
    isLoaded
  } = useVocabularyStore()
  
  const openFile = useEditorStore((state) => state.openFile)
  const expandToPath = useFileTreeStore((state) => state.expandToPath)
  const selectFile = useFileTreeStore((state) => state.select)
  
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<VocabularyEntry | null>(null)
  const [internalCurrentType, setInternalCurrentType] = useState<string>('')
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [typeSettingsOpen, setTypeSettingsOpen] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  
  // 批量操作状态
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchMode, setBatchMode] = useState(false)
  
  // 高级筛选状态
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterColor, setFilterColor] = useState<string>('')
  const [filterHasLinkedFile, setFilterHasLinkedFile] = useState<boolean | null>(null)
  
  // 快速创建状态
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  
  // 撤销删除状态
  const [deletedEntry, setDeletedEntry] = useState<VocabularyEntry | null>(null)
  const [undoMessageKey, setUndoMessageKey] = useState<string>('')
  
  // 列可见性状态
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  
  // 拖拽排序状态
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const searchInputRef = useRef<Input>(null)
  
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
  const filteredEntries = useMemo(() => {
    return currentEntries.filter(item => {
      // 关键词搜索
      if (searchText) {
        const keywordMatch = 
          item.name.toLowerCase().includes(searchText.toLowerCase()) ||
          item.description?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.aliases.some(a => a.toLowerCase().includes(searchText.toLowerCase()))
        if (!keywordMatch) return false
      }
      
      // 标签筛选
      if (filterTags.length > 0) {
        const hasAllTags = filterTags.every(tag => item.tags.includes(tag))
        if (!hasAllTags) return false
      }
      
      // 颜色筛选
      if (filterColor) {
        if (item.color !== filterColor) return false
      }
      
      // 关联文件筛选
      if (filterHasLinkedFile !== null) {
        const hasLinkedFile = !!item.linkedFilePath
        if (filterHasLinkedFile !== hasLinkedFile) return false
      }
      
      return true
    })
  }, [currentEntries, searchText, filterTags, filterColor, filterHasLinkedFile])

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
      
      reorderEntries(currentType, newEntryIds).catch((error) => {
        console.error('Failed to reorder entries:', error)
        message.error('排序失败')
      })
    }
    
    setActiveId(null)
  }, [sortedEntries, currentType, reorderEntries])
  
  // 当前拖拽的条目
  const activeEntry = activeId ? entries.find(e => e.id === activeId) : null

  // 获取当前类型所有标签（用于筛选）
  const allTags = useMemo(() => {
    const tagSet = new Set<string>()
    currentEntries.forEach(item => {
      item.tags.forEach(tag => tagSet.add(tag))
    })
    return Array.from(tagSet).sort()
  }, [currentEntries])

  // 获取当前类型所有颜色（用于筛选）
  const allColors = useMemo(() => {
    const colorSet = new Set<string>()
    currentEntries.forEach(item => {
      colorSet.add(item.color)
    })
    return Array.from(colorSet)
  }, [currentEntries])

  // 筛选条件数量
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (filterTags.length > 0) count++
    if (filterColor) count++
    if (filterHasLinkedFile !== null) count++
    return count
  }, [filterTags, filterColor, filterHasLinkedFile])

  // 清除所有筛选
  const clearAllFilters = (): void => {
    setFilterTags([])
    setFilterColor('')
    setFilterHasLinkedFile(null)
  }

  // 根据配置生成表格列
  const columns = useMemo(() => {
    // 拖拽手柄列
    const dragHandleColumn = {
      title: '',
      key: 'dragHandle',
      width: 40,
      fixed: 'left' as const,
      render: () => (
        <HolderOutlined style={{ color: 'var(--text-tertiary)', cursor: 'grab' }} />
      )
    }

    if (!currentTypeDefinition) {
      return [dragHandleColumn, ...getDefaultColumns()]
    }

    const fields = currentTypeDefinition.fields
    const tableConfig = currentTypeDefinition.tableConfig

    // 如果没有字段，使用默认列
    if (!fields || fields.length === 0) {
      return [dragHandleColumn, ...getDefaultColumns()]
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
            <Tooltip title="点击打开关联文件">
              <LinkOutlined 
                style={{ fontSize: 12, color: 'var(--color-primary)', cursor: 'pointer' }}
                onClick={(e) => {
                  e.stopPropagation()
                  handleOpenLinkedFile(record.linkedFilePath!)
                }}
              />
            </Tooltip>
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
        
        // 检查列可见性
        if (columnVisibility[field.id] === false) return null

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
              return <PictureOutlined style={{ fontSize: 16, color: 'var(--color-primary)' }} />
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
        .map(field => {
          // 检查列可见性
          if (columnVisibility[field.id] === false) return null
          
          return {
            title: field.name,
            dataIndex: ['fields', field.id],
            key: field.id,
            width: 120,
            ellipsis: field.type === 'textarea',
            render: (value: string | string[]) => {
              if (value === undefined || value === null || value === '') return '-'
              // 图片类型显示图标
              if (field.type === 'image') {
                return <PictureOutlined style={{ fontSize: 16, color: 'var(--color-primary)' }} />
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
  }, [currentTypeDefinition, readOnly, columnVisibility])

  // 获取所有可选列
  const allFieldColumns = useMemo(() => {
    if (!currentTypeDefinition?.fields) return []
    return currentTypeDefinition.fields.filter(f => f.id !== 'name')
  }, [currentTypeDefinition])

  // 切换列可见性
  const toggleColumnVisibility = (fieldId: string): void => {
    setColumnVisibility(prev => ({
      ...prev,
      [fieldId]: prev[fieldId] === false ? true : false
    }))
  }

  // 重置列可见性
  const resetColumnVisibility = (): void => {
    setColumnVisibility({})
  }

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

  useImperativeHandle(ref, () => ({
    openCreateDrawer: handleCreate,
    closeDrawer: () => setDrawerOpen(false),
    focusSearch: () => searchInputRef.current?.focus(),
    isDrawerOpen: () => drawerOpen
  }), [drawerOpen])

  // 快速创建词汇
  const handleQuickAdd = async (): Promise<void> => {
    if (readOnly || !quickAddName.trim() || !currentType) return
    
    try {
      setLoading(true)
      const typeName = types.find(t => t.id === currentType)?.name || '未知'
      const color = currentTypeDefinition?.color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
      
      await addEntry({
        name: quickAddName.trim(),
        aliases: [],
        color,
        typeId: currentType,
        typeName,
        fields: {},
        tags: [],
        description: ''
      })
      
      message.success('创建成功')
      setQuickAddName('')
      setQuickAddMode(false)
    } catch (error) {
      console.error('快速创建失败:', error)
      message.error('创建失败')
    } finally {
      setLoading(false)
    }
  }

  // 快速创建按键处理
  const handleQuickAddKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') {
      handleQuickAdd()
    } else if (e.key === 'Escape') {
      setQuickAddMode(false)
      setQuickAddName('')
    }
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
    
    // 保存被删除的条目用于撤销
    const entryToDelete = entries.find(e => e.id === id)
    if (!entryToDelete) return
    
    // 清除之前的撤销状态
    if (undoMessageKey) {
      message.destroy(undoMessageKey)
    }
    
    await deleteEntry(id)
    setDeletedEntry(entryToDelete)
    
    // 显示带撤销按钮的消息
    const key = `delete-${id}-${Date.now()}`
    setUndoMessageKey(key)
    
    message.open({
      type: 'success',
      content: (
        <span>
          已删除「{entryToDelete.name}」
          <Button 
            type="link" 
            size="small" 
            style={{ marginLeft: 8, padding: 0 }}
            onClick={() => handleUndoDelete(key)}
          >
            撤销
          </Button>
        </span>
      ),
      duration: 5,
      key,
      onClose: () => {
        setDeletedEntry(null)
        setUndoMessageKey('')
      }
    })
  }

  // 撤销删除
  const handleUndoDelete = async (key: string): Promise<void> => {
    if (!deletedEntry) return
    
    try {
      // 重新添加被删除的条目
      await addEntry({
        name: deletedEntry.name,
        aliases: deletedEntry.aliases,
        color: deletedEntry.color,
        typeId: deletedEntry.typeId,
        typeName: deletedEntry.typeName,
        fields: deletedEntry.fields,
        tags: deletedEntry.tags,
        description: deletedEntry.description,
        linkedFilePath: deletedEntry.linkedFilePath
      })
      
      message.destroy(key)
      message.success('已撤销删除')
      setDeletedEntry(null)
      setUndoMessageKey('')
    } catch (error) {
      console.error('撤销删除失败:', error)
      message.error('撤销失败')
    }
  }

  // 渲染空状态
  const renderEmptyState = (): React.ReactNode => {
    const hasFilters = activeFilterCount > 0 || searchText
    
    if (hasFilters) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size="small">
              <span>没有找到匹配的词汇</span>
              <Button 
                type="link" 
                size="small"
                onClick={() => {
                  setSearchText('')
                  clearAllFilters()
                }}
              >
                清除筛选条件
              </Button>
            </Space>
          }
        />
      )
    }
    
    if (!currentType) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="请先选择或创建词汇类型"
        />
      )
    }
    
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description={
          <Space direction="vertical" size="middle">
            <span>还没有词汇，开始添加吧</span>
            {!readOnly && (
              <Space>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  新建词汇
                </Button>
                <Button 
                  icon={<TagOutlined />}
                  onClick={() => setQuickAddMode(true)}
                >
                  快速添加
                </Button>
              </Space>
            )}
          </Space>
        }
      />
    )
  }

  // 批量删除
  const handleBatchDelete = (): void => {
    if (readOnly || selectedRowKeys.length === 0) return
    
    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个词汇吗？此操作不可撤销。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          setLoading(true)
          for (const id of selectedRowKeys) {
            await deleteEntry(id as string)
          }
          message.success(`成功删除 ${selectedRowKeys.length} 个词汇`)
          setSelectedRowKeys([])
          setBatchMode(false)
        } catch (error) {
          console.error('批量删除失败:', error)
          message.error('批量删除失败')
        } finally {
          setLoading(false)
        }
      }
    })
  }

  // 批量导出
  const handleBatchExport = (): void => {
    if (selectedRowKeys.length === 0) return
    
    const selectedEntries = filteredEntries.filter(e => selectedRowKeys.includes(e.id))
    const typeName = currentTypeDefinition?.name || '词汇'
    
    const exportData = selectedEntries.map(entry => ({
      名称: entry.name,
      别名: entry.aliases.join('、'),
      颜色: entry.color,
      标签: entry.tags.join('、'),
      备注: entry.description || '',
      ...Object.fromEntries(
        currentTypeDefinition?.fields
          .filter(f => f.id !== 'name')
          .map(f => {
            const value = entry.fields[f.id]
            return [f.name, Array.isArray(value) ? value.join('、') : (value || '')]
          }) || []
      )
    }))
    
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${typeName}_导出_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    message.success(`成功导出 ${selectedEntries.length} 个词汇`)
  }

  // 导出全部
  const handleExportAll = (): void => {
    if (filteredEntries.length === 0) {
      message.warning('没有可导出的数据')
      return
    }
    
    const typeName = currentTypeDefinition?.name || '词汇'
    
    const exportData = filteredEntries.map(entry => ({
      名称: entry.name,
      别名: entry.aliases.join('、'),
      颜色: entry.color,
      标签: entry.tags.join('、'),
      备注: entry.description || '',
      ...Object.fromEntries(
        currentTypeDefinition?.fields
          .filter(f => f.id !== 'name')
          .map(f => {
            const value = entry.fields[f.id]
            return [f.name, Array.isArray(value) ? value.join('、') : (value || '')]
          }) || []
      )
    }))
    
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${typeName}_全部导出_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    message.success(`成功导出 ${filteredEntries.length} 个词汇`)
  }

  // 切换批量模式
  const toggleBatchMode = (): void => {
    setBatchMode(!batchMode)
    if (batchMode) {
      setSelectedRowKeys([])
    }
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

  // 打开关联文件（在编辑器中打开并定位到文件树）
  const handleOpenLinkedFile = async (filePath: string): Promise<void> => {
    try {
      const fileName = filePath.split(/[/\\]/).pop() || filePath
      await expandToPath(filePath)
      selectFile(filePath)
      await openFile(filePath, fileName)
    } catch (error) {
      console.error('打开文件失败:', error)
      message.error('打开文件失败')
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
        <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginLeft: 4 }}>
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
        <Space>
          <Input.Search
            ref={searchInputRef}
            placeholder="搜索..."
            allowClear
            style={{ width: embedded ? '100%' : 200 }}
            onChange={(e) => setSearchText(e.target.value)}
          />
          {!embedded && (
            <Badge count={activeFilterCount} size="small">
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => setFilterPanelOpen(!filterPanelOpen)}
                type={filterPanelOpen ? 'primary' : 'default'}
              >
                筛选
              </Button>
            </Badge>
          )}
        </Space>
        {!embedded && (
          <Space>
            {batchMode && selectedRowKeys.length > 0 && (
              <Tag color="blue" style={{ marginRight: 8 }}>
                已选 {selectedRowKeys.length} 项
              </Tag>
            )}
            {batchMode && (
              <>
                <Button 
                  danger 
                  icon={<DeleteOutlined />}
                  onClick={handleBatchDelete}
                  disabled={selectedRowKeys.length === 0}
                >
                  批量删除
                </Button>
                <Button 
                  icon={<DownloadOutlined />}
                  onClick={handleBatchExport}
                  disabled={selectedRowKeys.length === 0}
                >
                  导出选中
                </Button>
              </>
            )}
            <Dropdown
              menu={{
                items: [
                  { key: 'export', label: '导出全部', icon: <ExportOutlined />, onClick: handleExportAll },
                  { type: 'divider' as const },
                  { 
                    key: 'batch', 
                    label: batchMode ? '退出批量模式' : '批量操作', 
                    icon: batchMode ? <CloseCircleOutlined /> : <CheckCircleOutlined />,
                    onClick: toggleBatchMode 
                  },
                  { 
                    key: 'columns', 
                    label: '列设置', 
                    icon: <ColumnHeightOutlined />,
                    onClick: () => setColumnSettingsOpen(true) 
                  },
                ] as MenuProps['items']
              }}
            >
              <Button icon={<SettingOutlined />}>更多</Button>
            </Dropdown>
            <Button 
              icon={<FullscreenOutlined />} 
              onClick={() => setFullscreen(true)}
            >
              编辑
            </Button>
            <Dropdown
              menu={{
                items: [
                  { 
                    key: 'create', 
                    label: '新建（完整）', 
                    icon: <PlusOutlined />,
                    onClick: handleCreate 
                  },
                  { 
                    key: 'quickAdd', 
                    label: '快速添加', 
                    icon: <TagOutlined />,
                    onClick: () => setQuickAddMode(true) 
                  },
                ] as MenuProps['items']
              }}
            >
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                disabled={readOnly || !currentType}
              >
                新建
              </Button>
            </Dropdown>
          </Space>
        )}
        {embedded && (
          <Dropdown
            menu={{
              items: [
                { 
                  key: 'create', 
                  label: '新建（完整）', 
                  icon: <PlusOutlined />,
                  onClick: handleCreate 
                },
                { 
                  key: 'quickAdd', 
                  label: '快速添加', 
                  icon: <TagOutlined />,
                  onClick: () => setQuickAddMode(true) 
                },
              ] as MenuProps['items']
            }}
          >
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              disabled={readOnly || !currentType}
            >
              新建
            </Button>
          </Dropdown>
        )}
      </div>
      
      {/* 快速添加输入框 */}
      {quickAddMode && !embedded && (
        <div className={styles.quickAddBar}>
          <Space>
            <span className={styles.quickAddLabel}>快速添加：</span>
            <Input
              placeholder="输入词汇名称，按 Enter 保存，Esc 取消"
              value={quickAddName}
              onChange={(e) => setQuickAddName(e.target.value)}
              onKeyDown={handleQuickAddKeyDown}
              style={{ width: 300 }}
              autoFocus
              disabled={loading}
            />
            <Button 
              type="primary" 
              onClick={handleQuickAdd}
              loading={loading}
              disabled={!quickAddName.trim()}
            >
              保存
            </Button>
            <Button 
              onClick={() => { setQuickAddMode(false); setQuickAddName('') }}
            >
              取消
            </Button>
          </Space>
        </div>
      )}
      
      {/* 高级筛选面板 */}
      {filterPanelOpen && !embedded && (
        <div className={styles.filterPanel}>
          <Space wrap size="middle">
            {/* 标签筛选 */}
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>标签：</span>
              <Select
                mode="multiple"
                placeholder="选择标签"
                value={filterTags}
                onChange={setFilterTags}
                options={allTags.map(t => ({ value: t, label: t }))}
                style={{ minWidth: 150 }}
                allowClear
                size="small"
              />
            </div>
            
            {/* 颜色筛选 */}
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>颜色：</span>
              <Select
                placeholder="选择颜色"
                value={filterColor || undefined}
                onChange={(v) => setFilterColor(v || '')}
                allowClear
                style={{ minWidth: 120 }}
                size="small"
              >
                {allColors.map(color => (
                  <Select.Option key={color} value={color}>
                    <Space>
                      <div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: color }} />
                      <span>{color}</span>
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </div>
            
            {/* 关联文件筛选 */}
            <div className={styles.filterItem}>
              <span className={styles.filterLabel}>关联文件：</span>
              <Select
                placeholder="选择"
                value={filterHasLinkedFile}
                onChange={setFilterHasLinkedFile}
                allowClear
                style={{ minWidth: 100 }}
                size="small"
              >
                <Select.Option value={true}>有关联</Select.Option>
                <Select.Option value={false}>无关联</Select.Option>
              </Select>
            </div>
            
            {/* 清除筛选 */}
            {activeFilterCount > 0 && (
              <Button 
                size="small" 
                icon={<ClearOutlined />}
                onClick={clearAllFilters}
              >
                清除筛选
              </Button>
            )}
          </Space>
        </div>
      )}
      
      {/* 表格 */}
      <div className={styles.tableContainer}>
        {!isLoaded ? (
          <div className={styles.skeletonContainer}>
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : (
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
                locale={{ emptyText: renderEmptyState() }}
                rowSelection={batchMode ? {
                  selectedRowKeys,
                  onChange: setSelectedRowKeys,
                  selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
                } : undefined}
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
            label="关联文件"
          >
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                placeholder="关联的 Markdown 文件路径" 
                disabled 
                style={{ flex: 1 }}
              />
              {editingEntry?.linkedFilePath && (
                <Tooltip title="打开文件">
                  <Button 
                    icon={<FolderOpenOutlined />}
                    onClick={() => handleOpenLinkedFile(editingEntry.linkedFilePath!)}
                  />
                </Tooltip>
              )}
              {editingEntry && (
                <Tooltip title={editingEntry.linkedFilePath ? '重新生成关联文件' : '创建关联文件'}>
                  <Button 
                    icon={<FileAddOutlined />}
                    onClick={handleCreateLinkedFile}
                  />
                </Tooltip>
              )}
            </Space.Compact>
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

      {/* 列设置弹窗 */}
      <Modal
        title="列设置"
        open={columnSettingsOpen}
        onCancel={() => setColumnSettingsOpen(false)}
        footer={[
          <Button key="reset" onClick={resetColumnVisibility}>
            重置
          </Button>,
          <Button key="close" type="primary" onClick={() => setColumnSettingsOpen(false)}>
            关闭
          </Button>
        ]}
        width={400}
      >
        {allFieldColumns.length === 0 ? (
          <Empty description="没有可设置的列" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <div className={styles.columnSettingsList}>
            {allFieldColumns.map(field => (
              <div key={field.id} className={styles.columnSettingsItem}>
                <Checkbox
                  checked={columnVisibility[field.id] !== false}
                  onChange={() => toggleColumnVisibility(field.id)}
                >
                  {field.name}
                </Checkbox>
                <span className={styles.columnTypeLabel}>
                  {field.type === 'text' ? '文本' : 
                   field.type === 'textarea' ? '多行文本' :
                   field.type === 'select' ? '选择' :
                   field.type === 'tags' ? '标签' :
                   field.type === 'image' ? '图片' : field.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

export default VocabularyPanel
export { VocabularyPanel }
