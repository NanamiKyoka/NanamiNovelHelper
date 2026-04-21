/**
 * 词汇全屏编辑器
 * 左侧类型列表 + 右侧条目管理/高亮设置
 */

import { useState, useEffect, useMemo } from 'react'
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
  message
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
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useUIStore } from '@stores/uiStore'
import type { VocabularyType, VocabularyEntry, FieldDefinition } from '@types/vocabulary'
import { getBuiltInVocabularyTypes, DEFAULT_COLORS } from '@types/vocabulary'
import VocabularyPanel from './VocabularyPanel'
import { HighlightSettings } from '@components/settings/HighlightSettings'
import VocabularyTypeSettings from './VocabularyTypeSettings'
import IconPicker, { getIconPreview, type IconValue } from './IconPicker'
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
  const [activeTab, setActiveTab] = useState<'entries' | 'typeSettings' | 'highlight'>('entries')
  const [searchText, setSearchText] = useState('')
  const [loading, setLoading] = useState(false)

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

  // 加载数据
  useEffect(() => {
    if (!isLoaded) {
      loadTypes()
      loadEntries()
    }
  }, [isLoaded, loadTypes, loadEntries])

  // 自动选择第一个类型
  useEffect(() => {
    if (types.length > 0 && !selectedTypeId) {
      setSelectedTypeId(types[0].id)
    }
  }, [types, selectedTypeId])

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
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>返回</Button>
          <Title level={5} className={styles.title}>词汇管理</Title>
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.stats}>
            {types.length} 个类型 · {entries.length} 个条目
          </span>
        </div>
      </div>

      <Layout className={styles.mainLayout}>
        {/* 左侧类型列表 */}
        <Sider width={280} className={styles.sider}>
          <div className={styles.siderHeader}>
            <Input.Search
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
                onChange={(key) => setActiveTab(key as 'entries' | 'typeSettings' | 'highlight')}
                items={tabItems}
                className={styles.tabs}
              />
              
              <div className={styles.tabContent}>
                {activeTab === 'entries' && (
                  <VocabularyPanel 
                    readOnly={false} 
                    embedded 
                    currentTypeId={selectedTypeId || ''} 
                    onTypeChange={setSelectedTypeId}
                  />
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
    </div>
  )
}

export default VocabularyFullscreen
