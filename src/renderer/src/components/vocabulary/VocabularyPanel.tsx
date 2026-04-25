import React, { useState, useMemo, useEffect, useCallback, forwardRef, useImperativeHandle, useRef } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Space,
  message,
  Tag,
  Popconfirm,
  Empty,
  Tabs,
  Dropdown,
  Modal,
  Badge,
  Checkbox,
  Tooltip,
  Skeleton
} from 'antd'
import type { MenuProps } from 'antd'
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
  ColumnHeightOutlined,
  StarOutlined,
  StarFilled
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
import type { VocabularyEntry } from '../../types/vocabulary'
import { VOCABULARY_DEFAULT_COLORS } from '../../types/vocabulary'
import VocabularyTypeSettings from './VocabularyTypeSettings'
import VocabularyFullscreen from './VocabularyFullscreen'
import { getIconPreview } from './IconPicker'
import { useVocabularyFilter } from './useVocabularyFilter'
import { useVocabularyExport } from './useVocabularyExport'
import VocabularyFilterPanel from './VocabularyFilterPanel'
import VocabularyBatchEditModal from './VocabularyBatchEditModal'
import VocabularyExportModal from './VocabularyExportModal'
import VocabularyEntryDrawer from './VocabularyEntryDrawer'
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

const VocabularyPanel = forwardRef<VocabularyPanelRef, VocabularyPanelProps>(
  (
    { 
      readOnly = false, 
      externalSearchText,
      embedded = false,
      currentTypeId,
      onTypeChange
    }: VocabularyPanelProps,
    ref
  ) => {
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
  
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [batchMode, setBatchMode] = useState(false)
  
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickAddName, setQuickAddName] = useState('')
  
  const [deletedEntry, setDeletedEntry] = useState<VocabularyEntry | null>(null)
  const [undoMessageKey, setUndoMessageKey] = useState<string>('')
  
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false)
  
  const [activeId, setActiveId] = useState<string | null>(null)
  
  const [batchEditModalOpen, setBatchEditModalOpen] = useState(false)
  const [batchEditForm] = Form.useForm()
  
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

  const currentTypeDefinition = types.find(t => t.id === currentType)
  const currentEntries = entries.filter(item => item.typeId === currentType)

  const {
    sortedEntries,
    filteredEntries,
    allTags,
    allColors,
    activeFilterCount,
    clearAllFilters,
    filterState,
    setFilterTags,
    setFilterColor,
    setFilterHasLinkedFile,
    setFilterStarred
  } = useVocabularyFilter({ entries: currentEntries, searchText })

  const {
    exportModalOpen,
    setExportModalOpen,
    exportFormat,
    setExportFormat,
    exportScope,
    handleBatchExport,
    handleExportAll,
    confirmExport
  } = useVocabularyExport({
    currentTypeDefinition,
    filteredEntries,
    selectedRowKeys
  })

  const [filterPanelOpen, setFilterPanelOpen] = useState(false)

  // 高亮搜索关键词
  const highlightText = useCallback((text: string, keyword: string): React.ReactNode => {
    if (!keyword || !text) return text
    
    const lowerText = text.toLowerCase()
    const lowerKeyword = keyword.toLowerCase()
    const index = lowerText.indexOf(lowerKeyword)
    
    if (index === -1) return text
    
    const before = text.slice(0, index)
    const match = text.slice(index, index + keyword.length)
    const after = text.slice(index + keyword.length)
    
    return (
      <>
        {before}
        <span style={{ backgroundColor: '#ffe58f', padding: '0 2px', borderRadius: 2 }}>{match}</span>
        {highlightText(after, keyword)}
      </>
    )
  }, [])

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

  const toggleStarred = async (entry: VocabularyEntry): Promise<void> => {
    try {
      await updateEntry(entry.id, { starred: !entry.starred })
    } catch (error) {
      console.error('切换收藏失败:', error)
      message.error('操作失败')
    }
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

    // 收藏列
    const starredColumn = {
      title: '',
      key: 'starred',
      width: 32,
      fixed: 'left' as const,
      render: (_: unknown, record: VocabularyEntry) => (
        <Tooltip title={record.starred ? '取消收藏' : '收藏'}>
          <Button
            type="text"
            size="small"
            icon={record.starred ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              toggleStarred(record)
            }}
            style={{ padding: '0 4px' }}
          />
        </Tooltip>
      )
    }

    if (!currentTypeDefinition) {
      return [dragHandleColumn, starredColumn, ...getDefaultColumns()]
    }

    const fields = currentTypeDefinition.fields
    const tableConfig = currentTypeDefinition.tableConfig

    // 如果没有字段，使用默认列
    if (!fields || fields.length === 0) {
      return [dragHandleColumn, starredColumn, ...getDefaultColumns()]
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
          <span>{highlightText(name, searchText)}</span>
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

    return [dragHandleColumn, starredColumn, nameColumn, ...fieldColumns, actionColumn].filter(Boolean)
  }, [currentTypeDefinition, readOnly, columnVisibility, searchText])

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
            <span>{highlightText(name, searchText)}</span>
          </Space>
        )
      },
      {
        title: '描述',
        dataIndex: 'description',
        key: 'description',
        ellipsis: true,
        render: (desc: string) => desc ? highlightText(desc, searchText) : '-'
      },
      {
        title: '别名',
        dataIndex: 'aliases',
        key: 'aliases',
        width: 150,
        render: (aliases: string[]) => 
          aliases?.length > 0 
            ? aliases.slice(0, 3).map((a, i) => (
                <Tag key={i} style={{ margin: '2px' }}>{highlightText(a, searchText)}</Tag>
              ))
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
      color: currentTypeDefinition?.color || VOCABULARY_DEFAULT_COLORS[Math.floor(Math.random() * VOCABULARY_DEFAULT_COLORS.length)],
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
      const color = currentTypeDefinition?.color || VOCABULARY_DEFAULT_COLORS[Math.floor(Math.random() * VOCABULARY_DEFAULT_COLORS.length)]
      
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

  // 保存并继续添加
  const handleSaveAndContinue = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      const colorValue = typeof values.color === 'string' 
        ? values.color 
        : values.color?.toHexString?.() || '#1890ff'
      const typeName = types.find(t => t.id === currentType)?.name || '未知'

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
      
      message.success('创建成功，可继续添加')
      
      // 重置表单但保持抽屉打开
      form.resetFields(['name', 'aliases', 'description', 'linkedFilePath'])
      form.setFieldsValue({
        name: '',
        aliases: [],
        tags: [],
        description: '',
        linkedFilePath: undefined,
        fields: (() => {
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
          return defaultFields
        })()
      })
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

  // 打开批量编辑弹窗
  const handleBatchEdit = (): void => {
    if (selectedRowKeys.length === 0) return
    batchEditForm.resetFields()
    setBatchEditModalOpen(true)
  }

  // 执行批量编辑
  const executeBatchEdit = async (): Promise<void> => {
    const values = await batchEditForm.validateFields()
    
    setLoading(true)
    let successCount = 0
    
    try {
      for (const id of selectedRowKeys) {
        const updates: Partial<VocabularyEntry> = {}
        
        if (values.tags !== undefined) {
          if (values.tagsMode === 'replace') {
            updates.tags = values.tags
          } else if (values.tagsMode === 'add') {
            const entry = entries.find(e => e.id === id)
            if (entry) {
              updates.tags = [...new Set([...entry.tags, ...values.tags])]
            }
          } else if (values.tagsMode === 'remove') {
            const entry = entries.find(e => e.id === id)
            if (entry) {
              updates.tags = entry.tags.filter(t => !values.tags.includes(t))
            }
          }
        }
        
        if (values.color) {
          updates.color = typeof values.color === 'string' 
            ? values.color 
            : values.color?.toHexString?.()
        }
        
        if (Object.keys(updates).length > 0) {
          await updateEntry(id as string, updates)
          successCount++
        }
      }
      
      message.success(`成功更新 ${successCount} 个词汇`)
      setBatchEditModalOpen(false)
      setSelectedRowKeys([])
      setBatchMode(false)
    } catch (error) {
      console.error('批量编辑失败:', error)
      message.error('批量编辑失败')
    } finally {
      setLoading(false)
    }
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
                  icon={<EditOutlined />}
                  onClick={handleBatchEdit}
                  disabled={selectedRowKeys.length === 0}
                >
                  批量编辑
                </Button>
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
      
      {filterPanelOpen && !embedded && (
        <VocabularyFilterPanel
          allTags={allTags}
          allColors={allColors}
          filterTags={filterState.filterTags}
          filterColor={filterState.filterColor}
          filterHasLinkedFile={filterState.filterHasLinkedFile}
          filterStarred={filterState.filterStarred}
          activeFilterCount={activeFilterCount}
          onFilterTagsChange={setFilterTags}
          onFilterColorChange={setFilterColor}
          onFilterHasLinkedFileChange={setFilterHasLinkedFile}
          onFilterStarredChange={setFilterStarred}
          onClearAll={clearAllFilters}
        />
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

      <VocabularyEntryDrawer
        open={drawerOpen}
        editingEntry={editingEntry}
        currentTypeDefinition={currentTypeDefinition}
        loading={loading}
        form={form}
        onSave={handleSave}
        onSaveAndContinue={handleSaveAndContinue}
        onCancel={() => setDrawerOpen(false)}
        onTypeSettingsOpen={() => setTypeSettingsOpen(true)}
        onCreateLinkedFile={handleCreateLinkedFile}
        onOpenLinkedFile={handleOpenLinkedFile}
      />

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

      <VocabularyBatchEditModal
        open={batchEditModalOpen}
        selectedCount={selectedRowKeys.length}
        loading={loading}
        onCancel={() => setBatchEditModalOpen(false)}
        onOk={executeBatchEdit}
        form={batchEditForm}
      />

      <VocabularyExportModal
        open={exportModalOpen}
        exportFormat={exportFormat}
        exportScope={exportScope}
        selectedCount={selectedRowKeys.length}
        totalCount={filteredEntries.length}
        onFormatChange={setExportFormat}
        onCancel={() => setExportModalOpen(false)}
        onOk={confirmExport}
      />
    </div>
  )
  }
)

export default VocabularyPanel
export { VocabularyPanel }
