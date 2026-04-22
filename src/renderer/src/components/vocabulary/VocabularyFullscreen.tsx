/**
 * 词汇全屏编辑器
 * 左侧类型列表 + 右侧条目管理/高亮设置
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Layout,
  Button,
  Tabs,
  List,
  Input,
  Space,
  Typography,
  Empty,
  Tag,
  Tooltip,
  Dropdown,
  Popconfirm,
  Modal,
  Form,
  ColorPicker,
  message,
  Upload,
  Progress,
  Alert,
  Table,
  Select,
  Statistic,
  Row,
  Col,
  Card
} from 'antd'
import type { MenuProps } from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  TeamOutlined,
  EnvironmentOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  CalendarOutlined,
  TagOutlined,
  SettingOutlined,
  HighlightOutlined,
  HolderOutlined,
  ImportOutlined,
  UploadOutlined,
  FileTextOutlined,
  BarChartOutlined
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
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useUIStore } from '@stores/uiStore'
import type { VocabularyType, VocabularyEntry, FieldDefinition } from '@types/vocabulary'
import { getBuiltInVocabularyTypes, DEFAULT_COLORS } from '@types/vocabulary'
import VocabularyPanel, { type VocabularyPanelRef } from './VocabularyPanel'
import { HighlightSettings } from '@components/settings/HighlightSettings'
import VocabularyTypeSettings from './VocabularyTypeSettings'
import IconPicker, { getIconPreview, type IconValue } from './IconPicker'
import { useShortcuts } from '@hooks/useShortcuts'
import { v4 as uuidv4 } from 'uuid'
import styles from './VocabularyFullscreen.module.css'

const { Sider, Content } = Layout
const { Text, Title } = Typography

// 类型图标映射
const TYPE_ICONS: Record<string, React.ReactNode> = {
  'character': <TeamOutlined />,
  'location': <EnvironmentOutlined />,
  'organization': <TeamOutlined />,
  'item': <GiftOutlined />,
  'magic': <ThunderboltOutlined />,
  'event': <CalendarOutlined />
}

// 内置类型对应的字段模板
const BUILTIN_FIELDS_MAP: Record<string, FieldDefinition[]> = {
  'character': [],
  'location': [],
  'organization': [],
  'item': [],
  'magic': [],
  'event': []
}

// 可排序的类型项组件
interface SortableTypeItemProps {
  type: VocabularyType
  isSelected: boolean
  entryCount: number
  onSelect: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  getTypeIcon: (type: VocabularyType) => React.ReactNode
}

function SortableTypeItem({
  type,
  isSelected,
  entryCount,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  getTypeIcon
}: SortableTypeItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: type.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.typeItem} ${isSelected ? styles.active : ''}`}
      onClick={onSelect}
    >
      <div className={styles.typeItemContent}>
        <div
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <HolderOutlined />
        </div>
        <div className={styles.typeIcon} style={{ backgroundColor: type.color }}>
          {getTypeIcon(type)}
        </div>
        <div className={styles.typeInfo}>
          <div className={styles.typeName}>{type.name}</div>
          <div className={styles.typeMeta}>
            {entryCount} 条
          </div>
        </div>
      </div>
      <div className={styles.typeItemActions}>
        <Tooltip title="复制">
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
          />
        </Tooltip>
        <Tooltip title="编辑">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); onEdit() }}
          />
        </Tooltip>
        <Popconfirm
          title="确定删除此类型？"
          onConfirm={(e) => { e?.stopPropagation(); onDelete() }}
          onCancel={(e) => e?.stopPropagation()}
          okText="删除"
          cancelText="取消"
        >
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
            onClick={(e) => e.stopPropagation()}
          />
        </Popconfirm>
      </div>
    </div>
  )
}

interface VocabularyFullscreenProps {
  onBack: () => void
}

// 新建类型的方式
type CreateMode = 'template' | 'custom' | null

function VocabularyFullscreen({ onBack }: VocabularyFullscreenProps): JSX.Element {
  const {
    types,
    entries,
    loadTypes,
    loadEntries,
    addType,
    updateType,
    deleteType,
    reorderTypes,
    isLoaded
  } = useVocabularyStore()
  
  const setFullscreenMode = useUIStore((state) => state.setFullscreenMode)
  const exitFullscreen = useUIStore((state) => state.exitFullscreen)
  
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'entries' | 'typeSettings' | 'highlight' | 'statistics'>('entries')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

  const panelRef = useRef<VocabularyPanelRef>(null)
  const typeSearchInputRef = useRef<Input>(null)

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

  // 设置全屏模式，卸载时退出
  useEffect(() => {
    setFullscreenMode('vocabulary')
    return () => exitFullscreen()
  }, [setFullscreenMode, exitFullscreen])
  
  // 类型编辑状态
  const [editingType, setEditingType] = useState<VocabularyType | null>(null)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<VocabularyType | null>(null)
  const [form] = Form.useForm()
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<IconValue | undefined>()

  // 导入状态
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importData, setImportData] = useState<Record<string, unknown>[]>([])
  const [importFields, setImportFields] = useState<string[]>([])
  const [fieldMapping, setFieldMapping] = useState<Record<string, string>>({})
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)

  // 加载数据
  useEffect(() => {
    if (!isLoaded) {
      loadTypes()
      loadEntries()
    }
  }, [isLoaded, loadTypes, loadEntries])

  // 自动选择类型（优先使用上次选择的类型）
  useEffect(() => {
    if (types.length > 0 && !selectedTypeId) {
      const lastSelectedTypeId = localStorage.getItem('vocabulary_last_selected_type')
      const typeExists = types.some(t => t.id === lastSelectedTypeId)
      if (lastSelectedTypeId && typeExists) {
        setSelectedTypeId(lastSelectedTypeId)
      } else {
        setSelectedTypeId(types[0].id)
      }
    }
  }, [types, selectedTypeId])

  // 保存选择的类型到 localStorage
  useEffect(() => {
    if (selectedTypeId) {
      localStorage.setItem('vocabulary_last_selected_type', selectedTypeId)
    }
  }, [selectedTypeId])

  // 注册快捷键
  useShortcuts([
    {
      id: 'vocabulary.create',
      key: 'Ctrl+N',
      action: () => {
        if (activeTab === 'entries' && selectedTypeId) {
          panelRef.current?.openCreateDrawer()
        }
      },
      description: '新建词汇',
      category: '词汇管理'
    },
    {
      id: 'vocabulary.search',
      key: 'Ctrl+F',
      action: () => {
        if (activeTab === 'entries') {
          panelRef.current?.focusSearch()
        } else {
          typeSearchInputRef.current?.focus()
        }
      },
      description: '聚焦搜索框',
      category: '词汇管理'
    },
    {
      id: 'vocabulary.close',
      key: 'Escape',
      action: () => {
        if (panelRef.current?.isDrawerOpen()) {
          panelRef.current.closeDrawer()
        } else if (isTypeModalOpen) {
          setIsTypeModalOpen(false)
        } else if (isIconPickerOpen) {
          setIsIconPickerOpen(false)
        } else {
          onBack()
        }
      },
      description: '关闭弹窗或返回',
      category: '词汇管理'
    }
  ])

  // 选中的类型
  const selectedType = types.find(t => t.id === selectedTypeId) || null

  // 获取类型图标
  const getTypeIcon = (type: VocabularyType): React.ReactNode => {
    if (type.icon) {
      return getIconPreview(type.icon, TYPE_ICONS[type.id] || <TagOutlined />)
    }
    return TYPE_ICONS[type.id] || <TagOutlined />
  }

  // 过滤类型列表
  const filteredTypes = useMemo(() => {
    if (!searchText.trim()) return types.sort((a, b) => a.order - b.order)
    return types.filter(t => 
      t.name.toLowerCase().includes(searchText.toLowerCase())
    ).sort((a, b) => a.order - b.order)
  }, [types, searchText])
  
  // 拖拽开始
  const handleDragStart = (event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }
  
  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = filteredTypes.findIndex(t => t.id === active.id)
      const newIndex = filteredTypes.findIndex(t => t.id === over.id)
      
      const newTypes = arrayMove(filteredTypes, oldIndex, newIndex)
      const newTypeIds = newTypes.map(t => t.id)
      
      // 调用 reorderTypes 更新顺序
      reorderTypes(newTypeIds).catch((error) => {
        console.error('Failed to reorder types:', error)
        message.error('排序失败')
      })
    }
    
    setActiveId(null)
  }
  
  // 当前拖拽的类型
  const activeType = activeId ? types.find(t => t.id === activeId) : null

  // 打开创建弹窗
  const openCreateModal = (mode: CreateMode, template?: VocabularyType): void => {
    setEditingType(null)
    setCreateMode(mode)
    setSelectedTemplate(template || null)
    form.resetFields()
    setSelectedIcon(undefined)
    
    if (mode === 'template' && template) {
      form.setFieldsValue({
        name: template.name,
        icon: template.icon,
        color: template.color
      })
      if (template.icon) {
        setSelectedIcon({ 
          type: /[\p{Emoji}]/u.test(template.icon) ? 'emoji' : 'ant', 
          value: template.icon 
        })
      }
    } else {
      form.setFieldsValue({
        name: '',
        color: DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)]
      })
    }
    setIsTypeModalOpen(true)
  }

  // 编辑类型
  const handleEditType = (type: VocabularyType): void => {
    setEditingType(type)
    setCreateMode(null)
    setSelectedTemplate(null)
    form.setFieldsValue({
      name: type.name,
      icon: type.icon,
      color: type.color
    })
    if (type.icon) {
      setSelectedIcon({ 
        type: /[\p{Emoji}]/u.test(type.icon) ? 'emoji' : 'ant', 
        value: type.icon 
      })
    } else {
      setSelectedIcon(undefined)
    }
    setIsTypeModalOpen(true)
  }

  // 保存类型
  const handleSaveType = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      const colorValue = typeof values.color === 'string' 
        ? values.color 
        : values.color?.toHexString?.() || '#1890ff'

      if (editingType) {
        await updateType(editingType.id, {
          name: values.name,
          icon: values.icon,
          color: colorValue
        })
        message.success('更新成功')
      } else {
        let fields: FieldDefinition[] = []
        
        if (createMode === 'template' && selectedTemplate) {
          const templateFields = BUILTIN_FIELDS_MAP[selectedTemplate.id] || []
          fields = templateFields.map(f => ({ ...f, id: uuidv4() }))
        }
        
        await addType({
          name: values.name,
          icon: values.icon,
          color: colorValue,
          fields,
          tableConfig: [],
          isBuiltIn: false,
          order: types.length
        })
        message.success('创建成功')
      }
      
      setIsTypeModalOpen(false)
      setCreateMode(null)
      setSelectedTemplate(null)
    } catch (error) {
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  // 复制类型
  const handleDuplicateType = async (type: VocabularyType): Promise<void> => {
    await addType({
      name: type.name + ' (副本)',
      icon: type.icon,
      color: type.color,
      fields: type.fields.map(f => ({ ...f, id: uuidv4() })),
      tableConfig: [...type.tableConfig],
      isBuiltIn: false,
      order: types.length
    })
    message.success('复制成功')
  }

  // 删除类型
  const handleDeleteType = async (typeId: string): Promise<void> => {
    try {
      await deleteType(typeId)
      if (selectedTypeId === typeId) {
        setSelectedTypeId(types[0]?.id || null)
      }
      message.success('删除成功')
    } catch (error) {
      message.error('删除失败')
    }
  }

  // 解析导入文件
  const parseImportFile = (file: File): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string
          if (file.name.endsWith('.json')) {
            const data = JSON.parse(content)
            resolve(Array.isArray(data) ? data : [data])
          } else if (file.name.endsWith('.csv')) {
            const lines = content.split('\n').filter(line => line.trim())
            if (lines.length < 2) {
              reject(new Error('CSV 文件至少需要包含标题行和一行数据'))
              return
            }
            const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
            const data = lines.slice(1).map(line => {
              const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
              const obj: Record<string, unknown> = {}
              headers.forEach((header, index) => {
                obj[header] = values[index] || ''
              })
              return obj
            })
            resolve(data)
          } else {
            reject(new Error('不支持的文件格式，请使用 JSON 或 CSV 文件'))
          }
        } catch (error) {
          reject(new Error('文件解析失败，请检查文件格式'))
        }
      }
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsText(file)
    })
  }

  // 处理文件上传
  const handleImportUpload = async (file: File): Promise<boolean> => {
    try {
      const data = await parseImportFile(file)
      if (data.length === 0) {
        message.error('文件中没有数据')
        return false
      }
      
      setImportData(data)
      setImportFields(Object.keys(data[0]))
      
      // 自动映射字段
      const currentTypeDef = types.find(t => t.id === selectedTypeId)
      const autoMapping: Record<string, string> = {}
      const fieldKeywords: Record<string, string[]> = {
        'name': ['名称', '名字', 'name', 'title'],
        'aliases': ['别名', 'aliases', 'alias', 'aka'],
        'description': ['描述', '备注', '说明', 'description', 'desc', 'note'],
        'tags': ['标签', 'tags', 'tag'],
        'color': ['颜色', 'color']
      }
      
      Object.keys(data[0]).forEach(importField => {
        const lowerField = importField.toLowerCase()
        for (const [targetField, keywords] of Object.entries(fieldKeywords)) {
          if (keywords.some(kw => lowerField.includes(kw.toLowerCase()))) {
            autoMapping[importField] = targetField
            break
          }
        }
        // 检查是否匹配自定义字段
        if (!autoMapping[importField] && currentTypeDef) {
          const matchedField = currentTypeDef.fields.find(f => 
            f.name.toLowerCase() === lowerField || 
            f.id.toLowerCase() === lowerField
          )
          if (matchedField) {
            autoMapping[importField] = `field_${matchedField.id}`
          }
        }
      })
      
      setFieldMapping(autoMapping)
      setImportResult(null)
      setImportModalOpen(true)
      return false
    } catch (error) {
      message.error(error instanceof Error ? error.message : '导入失败')
      return false
    }
  }

  // 执行导入
  const executeImport = async (): Promise<void> => {
    if (!selectedTypeId || importData.length === 0) return
    
    setImporting(true)
    setImportProgress(0)
    setImportResult(null)
    
    const currentTypeDef = types.find(t => t.id === selectedTypeId)
    const typeName = currentTypeDef?.name || '未知'
    let successCount = 0
    let failedCount = 0
    
    for (let i = 0; i < importData.length; i++) {
      const item = importData[i]
      try {
        const entry: {
          name: string
          aliases: string[]
          color: string
          typeId: string
          typeName: string
          fields: Record<string, unknown>
          tags: string[]
          description: string
        } = {
          name: '',
          aliases: [],
          color: currentTypeDef?.color || DEFAULT_COLORS[Math.floor(Math.random() * DEFAULT_COLORS.length)],
          typeId: selectedTypeId,
          typeName,
          fields: {},
          tags: [],
          description: ''
        }
        
        // 应用字段映射
        Object.entries(fieldMapping).forEach(([importField, targetField]) => {
          const value = item[importField]
          if (value === undefined || value === '') return
          
          if (targetField === 'name') {
            entry.name = String(value)
          } else if (targetField === 'aliases') {
            entry.aliases = String(value).split(/[,、，]/).map(s => s.trim()).filter(Boolean)
          } else if (targetField === 'description') {
            entry.description = String(value)
          } else if (targetField === 'tags') {
            entry.tags = String(value).split(/[,、，]/).map(s => s.trim()).filter(Boolean)
          } else if (targetField === 'color') {
            entry.color = String(value)
          } else if (targetField.startsWith('field_')) {
            const fieldId = targetField.replace('field_', '')
            entry.fields[fieldId] = value
          }
        })
        
        if (!entry.name) {
          failedCount++
          continue
        }
        
        await addEntry(entry)
        successCount++
      } catch {
        failedCount++
      }
      
      setImportProgress(Math.round(((i + 1) / importData.length) * 100))
    }
    
    setImporting(false)
    setImportResult({ success: successCount, failed: failedCount })
    
    if (successCount > 0) {
      loadEntries()
    }
  }

  // 关闭导入弹窗
  const closeImportModal = (): void => {
    if (!importing) {
      setImportModalOpen(false)
      setImportData([])
      setImportFields([])
      setFieldMapping({})
      setImportResult(null)
    }
  }

  // 新建菜单
  const createMenuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: '从模板创建',
      children: getBuiltInVocabularyTypes().map(t => ({
        key: `template-${t.id}`,
        icon: TYPE_ICONS[t.id] || <TagOutlined />,
        label: t.name,
        onClick: () => openCreateModal('template', t)
      }))
    },
    { type: 'divider' },
    {
      key: 'custom',
      icon: <PlusOutlined />,
      label: '自定义类型',
      onClick: () => openCreateModal('custom')
    }
  ]

  // Tab 配置
  const tabItems = [
    {
      key: 'entries',
      label: (
        <span>
          <TagOutlined />
          条目管理
          {entries.length > 0 && (
            <Tag style={{ marginLeft: 8 }}>{entries.length}</Tag>
          )}
        </span>
      )
    },
    {
      key: 'statistics',
      label: (
        <span>
          <BarChartOutlined />
          统计信息
        </span>
      )
    },
    {
      key: 'typeSettings',
      label: (
        <span>
          <SettingOutlined />
          类型设置
        </span>
      )
    },
    {
      key: 'highlight',
      label: (
        <span>
          <HighlightOutlined />
          高亮设置
        </span>
      )
    }
  ]

  return (
    <div className={styles.container}>
      {/* 顶部工具栏 */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarLeft}>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
            <span style={{ marginLeft: 8, fontSize: 11, opacity: 0.6 }}>Esc</span>
          </Button>
          <Title level={5} className={styles.title}>词汇管理</Title>
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.stats}>
            {types.length} 个类型 · {entries.length} 个条目
          </span>
          <Upload
            accept=".json,.csv"
            showUploadList={false}
            beforeUpload={(file) => handleImportUpload(file)}
            disabled={!selectedTypeId}
          >
            <Tooltip title={!selectedTypeId ? '请先选择类型' : '导入 JSON/CSV 文件'}>
              <Button 
                icon={<ImportOutlined />} 
                style={{ marginLeft: 8 }}
                disabled={!selectedTypeId}
              >
                导入
              </Button>
            </Tooltip>
          </Upload>
          <Tooltip title="Ctrl+N 新建 | Ctrl+F 搜索 | Esc 返回">
            <Tag style={{ marginLeft: 8 }}>快捷键</Tag>
          </Tooltip>
        </div>
      </div>

      <Layout className={styles.mainLayout}>
        {/* 左侧类型列表 */}
        <Sider width={280} className={styles.sider}>
          <div className={styles.siderHeader}>
            <Input.Search
              ref={typeSearchInputRef}
              placeholder="搜索类型..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="small"
            />
            <Dropdown menu={{ items: createMenuItems }} trigger={['click']}>
              <Button type="primary" icon={<PlusOutlined />} size="small">
                新建
              </Button>
            </Dropdown>
          </div>
          
          <div className={styles.siderBody}>
            {filteredTypes.length === 0 ? (
              <Empty description="暂无类型" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={filteredTypes.map(t => t.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className={styles.typeList}>
                    {filteredTypes.map((type) => (
                      <SortableTypeItem
                        key={type.id}
                        type={type}
                        isSelected={selectedTypeId === type.id}
                        entryCount={entries.filter(e => e.typeId === type.id).length}
                        onSelect={() => setSelectedTypeId(type.id)}
                        onEdit={() => handleEditType(type)}
                        onDuplicate={() => handleDuplicateType(type)}
                        onDelete={() => handleDeleteType(type.id)}
                        getTypeIcon={getTypeIcon}
                      />
                    ))}
                  </div>
                </SortableContext>
                
                <DragOverlay>
                  {activeType ? (
                    <div className={styles.overlayItem}>
                      <div className={styles.typeItemContent}>
                        <div className={styles.typeIcon} style={{ backgroundColor: activeType.color }}>
                          {getTypeIcon(activeType)}
                        </div>
                        <div className={styles.typeInfo}>
                          <div className={styles.typeName}>{activeType.name}</div>
                          <div className={styles.typeMeta}>
                            {entries.filter(e => e.typeId === activeType.id).length} 条
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            )}
          </div>
        </Sider>

        {/* 右侧内容区 */}
        <Content className={styles.content}>
          {!selectedType ? (
            <div className={styles.emptyContent}>
              <Empty description="请从左侧选择一个类型" />
            </div>
          ) : (
            <div className={styles.contentBody}>
              <Tabs
                activeKey={activeTab}
                onChange={(key) => setActiveTab(key as 'entries' | 'typeSettings' | 'highlight' | 'statistics')}
                items={tabItems}
                className={styles.tabs}
              />
              
              <div className={styles.tabContent}>
                {activeTab === 'entries' && (
                  <VocabularyPanel 
                    ref={panelRef}
                    readOnly={false} 
                    embedded 
                    currentTypeId={selectedTypeId || ''} 
                    onTypeChange={setSelectedTypeId}
                  />
                )}
                {activeTab === 'statistics' && (
                  <div style={{ padding: 16, overflow: 'auto', height: '100%' }}>
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Card>
                          <Statistic 
                            title="词汇类型数" 
                            value={types.length} 
                            prefix={<TagOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic 
                            title="词汇总数" 
                            value={entries.length} 
                            prefix={<TagOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic 
                            title="已收藏" 
                            value={entries.filter(e => e.starred).length} 
                            prefix={<TagOutlined style={{ color: '#faad14' }} />}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card>
                          <Statistic 
                            title="关联文件" 
                            value={entries.filter(e => e.linkedFilePath).length} 
                            prefix={<FileTextOutlined />}
                          />
                        </Card>
                      </Col>
                    </Row>
                    
                    <Card title="各类型词汇数量" style={{ marginTop: 16 }}>
                      <Table
                        dataSource={types.map(t => ({
                          key: t.id,
                          name: t.name,
                          count: entries.filter(e => e.typeId === t.id).length,
                          starred: entries.filter(e => e.typeId === t.id && e.starred).length,
                          withFile: entries.filter(e => e.typeId === t.id && e.linkedFilePath).length
                        }))}
                        columns={[
                          { title: '类型名称', dataIndex: 'name', key: 'name' },
                          { title: '词汇数量', dataIndex: 'count', key: 'count' },
                          { title: '已收藏', dataIndex: 'starred', key: 'starred' },
                          { title: '关联文件', dataIndex: 'withFile', key: 'withFile' }
                        ]}
                        pagination={false}
                        size="small"
                      />
                    </Card>

                    <Card title="标签使用统计" style={{ marginTop: 16 }}>
                      {(() => {
                        const tagCounts: Record<string, number> = {}
                        entries.forEach(e => {
                          e.tags.forEach(tag => {
                            tagCounts[tag] = (tagCounts[tag] || 0) + 1
                          })
                        })
                        const sortedTags = Object.entries(tagCounts)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 20)
                        
                        if (sortedTags.length === 0) {
                          return <Empty description="暂无标签数据" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                        }
                        
                        return (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {sortedTags.map(([tag, count]) => (
                              <Tag key={tag} style={{ margin: 0 }}>
                                {tag} <span style={{ color: 'var(--text-secondary)' }}>({count})</span>
                              </Tag>
                            ))}
                          </div>
                        )
                      })()}
                    </Card>
                  </div>
                )}
                {activeTab === 'typeSettings' && (
                  <VocabularyTypeSettings 
                    hideTypeList
                    selectedTypeId={selectedTypeId}
                    onSelectedTypeIdChange={setSelectedTypeId}
                  />
                )}
                {activeTab === 'highlight' && (
                  <HighlightSettings />
                )}
              </div>
            </div>
          )}
        </Content>
      </Layout>

      {/* 类型编辑弹窗 */}
      <Modal
        title={editingType ? '编辑类型' : (createMode === 'template' ? '从模板创建' : '新建自定义类型')}
        open={isTypeModalOpen}
        onCancel={() => { 
          setIsTypeModalOpen(false)
          setCreateMode(null)
          setSelectedTemplate(null)
        }}
        onOk={handleSaveType}
        confirmLoading={loading}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="类型名称"
            rules={[{ required: true, message: '请输入类型名称' }]}
          >
            <Input placeholder="如：角色、地点、组织" />
          </Form.Item>
          
          <Form.Item label="图标">
            <div 
              className={styles.iconPreviewBox}
              onClick={() => setIsIconPickerOpen(true)}
            >
              <div 
                className={styles.iconPreview} 
                style={{ backgroundColor: form.getFieldValue('color') || '#1890ff' }}
              >
                {getIconPreview(selectedIcon?.value, <TagOutlined />)}
              </div>
              <span className={styles.iconHint}>点击选择图标</span>
            </div>
          </Form.Item>
          
          <Form.Item name="icon" hidden>
            <Input />
          </Form.Item>
          
          <Form.Item name="color" label="默认颜色">
            <ColorPicker format="hex" />
          </Form.Item>
        </Form>
      </Modal>

      {/* 图标选择器 */}
      <IconPicker
        open={isIconPickerOpen}
        value={selectedIcon}
        onChange={(iconValue) => {
          setSelectedIcon(iconValue)
          form.setFieldValue('icon', iconValue.value)
          setIsIconPickerOpen(false)
        }}
        onCancel={() => setIsIconPickerOpen(false)}
      />

      {/* 导入弹窗 */}
      <Modal
        title="批量导入词汇"
        open={importModalOpen}
        onCancel={closeImportModal}
        footer={null}
        width={700}
      >
        <Alert
          message={`将导入 ${importData.length} 条数据到「${types.find(t => t.id === selectedTypeId)?.name || '当前类型'}」`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        {importing ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <Progress percent={importProgress} status="active" />
            <p style={{ marginTop: 16 }}>正在导入... {importProgress}%</p>
          </div>
        ) : importResult ? (
          <div style={{ padding: '24px 0', textAlign: 'center' }}>
            <Alert
              message={`导入完成：成功 ${importResult.success} 条，失败 ${importResult.failed} 条`}
              type={importResult.failed === 0 ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Button type="primary" onClick={closeImportModal}>
              完成
            </Button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <Text strong>字段映射</Text>
              <Text type="secondary" style={{ marginLeft: 8 }}>
                将导入文件的字段映射到词汇字段
              </Text>
            </div>
            
            <Table
              dataSource={importFields.map(field => ({ key: field, field }))}
              columns={[
                {
                  title: '导入字段',
                  dataIndex: 'field',
                  key: 'field',
                  width: 200
                },
                {
                  title: '映射到',
                  key: 'mapping',
                  render: (_, record) => {
                    const currentTypeDef = types.find(t => t.id === selectedTypeId)
                    const targetOptions = [
                      { value: '', label: '- 忽略 -' },
                      { value: 'name', label: '名称（必填）' },
                      { value: 'aliases', label: '别名' },
                      { value: 'description', label: '描述' },
                      { value: 'tags', label: '标签' },
                      { value: 'color', label: '颜色' },
                      ...(currentTypeDef?.fields.map(f => ({
                        value: `field_${f.id}`,
                        label: `字段: ${f.name}`
                      })) || [])
                    ]
                    
                    return (
                      <Select
                        value={fieldMapping[record.field] || ''}
                        onChange={(value) => {
                          setFieldMapping(prev => ({
                            ...prev,
                            [record.field]: value
                          }))
                        }}
                        options={targetOptions}
                        style={{ width: '100%' }}
                        placeholder="选择映射字段"
                      />
                    )
                  }
                },
                {
                  title: '预览',
                  key: 'preview',
                  render: (_, record) => {
                    const previewValue = importData[0]?.[record.field]
                    return (
                      <Text type="secondary" ellipsis style={{ maxWidth: 200 }}>
                        {String(previewValue ?? '-')}
                      </Text>
                    )
                  }
                }
              ]}
              pagination={false}
              size="small"
            />
            
            <div style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={closeImportModal}>取消</Button>
                <Button 
                  type="primary" 
                  onClick={executeImport}
                  disabled={!Object.values(fieldMapping).includes('name')}
                >
                  开始导入
                </Button>
              </Space>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}

export default VocabularyFullscreen
