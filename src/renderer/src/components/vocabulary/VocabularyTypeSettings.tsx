import { useState, useCallback, useEffect, useMemo } from 'react'
import {
  Button,
  Empty,
  Modal,
  Form,
  Input,
  ColorPicker,
  Space,
  message,
  Popconfirm,
  Dropdown,
  Tooltip
} from 'antd'
import {
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
import IconPicker, { getIconPreview, type IconValue } from './IconPicker'
import { v4 as uuidv4 } from 'uuid'
import { useVocabularyStore } from '../../stores/vocabularyStore'
import type { 
  VocabularyType, 
  FieldDefinition, 
  TableColumnConfig 
} from '../../types/vocabulary'
import { 
  getBuiltInVocabularyTypes, 
  DEFAULT_COLORS,
  CHARACTER_FIELDS,
  LOCATION_FIELDS,
  ORGANIZATION_FIELDS,
  ITEM_FIELDS,
  MAGIC_FIELDS,
  EVENT_FIELDS
} from '../../types/vocabulary'
import FieldDefinitionEditor from './FieldDefinitionEditor'
import TableConfigEditor from './TableConfigEditor'
import styles from './VocabularyTypeSettings.module.css'

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
  'character': CHARACTER_FIELDS,
  'location': LOCATION_FIELDS,
  'organization': ORGANIZATION_FIELDS,
  'item': ITEM_FIELDS,
  'magic': MAGIC_FIELDS,
  'event': EVENT_FIELDS
}

// 新建类型的方式
type CreateMode = 'template' | 'custom' | null

// 可排序的类型项组件
interface SortableTypeItemProps {
  type: VocabularyType
  isSelected: boolean
  onSelect: () => void
  onEdit: () => void
  onDuplicate: () => void
  onDelete: () => void
  getTypeIcon: (type: VocabularyType) => React.ReactNode
  readOnly: boolean
}

function SortableTypeItem({
  type,
  isSelected,
  onSelect,
  onEdit,
  onDuplicate,
  onDelete,
  getTypeIcon,
  readOnly
}: SortableTypeItemProps): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: type.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.typeItem} ${isSelected ? styles.active : ''} ${isDragging ? styles.dragging : ''}`}
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
          <div className={styles.typeMeta}>{type.fields.length} 个字段</div>
        </div>
      </div>
      <div className={styles.typeItemActions}>
        <Tooltip title="复制">
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={(e) => { e.stopPropagation(); onDuplicate() }}
            disabled={readOnly}
          />
        </Tooltip>
        <Tooltip title="编辑">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={(e) => { e.stopPropagation(); onEdit() }}
            disabled={readOnly}
          />
        </Tooltip>
        <Popconfirm
          title="确定删除此类型？相关的词汇数据将保留。"
          onConfirm={(e) => { e?.stopPropagation(); onDelete() }}
          onCancel={(e) => e?.stopPropagation()}
          okText="删除"
          cancelText="取消"
        >
          <Tooltip title="删除">
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
              onClick={(e) => e.stopPropagation()}
              disabled={readOnly}
            />
          </Tooltip>
        </Popconfirm>
      </div>
    </div>
  )
}

interface VocabularyTypeSettingsProps {
  readOnly?: boolean
  /** 隐藏左侧类型列表（用于外部控制选中类型时） */
  hideTypeList?: boolean
  /** 外部控制的选中类型ID */
  selectedTypeId?: string | null
  /** 选中类型变化回调 */
  onSelectedTypeIdChange?: (typeId: string | null) => void
}

function VocabularyTypeSettings({ 
  readOnly = false,
  hideTypeList = false,
  selectedTypeId: externalSelectedTypeId,
  onSelectedTypeIdChange
}: VocabularyTypeSettingsProps): JSX.Element {
  const { 
    types, 
    loadTypes, 
    saveTypes, 
    addType, 
    updateType, 
    deleteType,
    reorderTypes,
    isLoaded 
  } = useVocabularyStore()
  
  const [internalSelectedTypeId, setInternalSelectedTypeId] = useState<string | null>(null)
  
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
  
  // 使用外部或内部的选中类型
  const selectedTypeId = externalSelectedTypeId !== undefined ? externalSelectedTypeId : internalSelectedTypeId
  const setSelectedTypeId = (id: string | null) => {
    if (onSelectedTypeIdChange) {
      onSelectedTypeIdChange(id)
    } else {
      setInternalSelectedTypeId(id)
    }
  }
  const [editingType, setEditingType] = useState<VocabularyType | null>(null)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<VocabularyType | null>(null)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false)
  const [selectedIcon, setSelectedIcon] = useState<IconValue | undefined>()
  
  // 获取类型图标（支持自定义图标或默认图标）
  const getTypeIcon = (type: VocabularyType): React.ReactNode => {
    if (type.icon) {
      return getIconPreview(type.icon, TYPE_ICONS[type.id] || <TagOutlined />)
    }
    return TYPE_ICONS[type.id] || <TagOutlined />
  }

  // 加载类型数据
  useEffect(() => {
    if (!isLoaded) {
      loadTypes()
    }
  }, [isLoaded, loadTypes])

  // 选中的类型
  const selectedType = types.find(t => t.id === selectedTypeId) || null

  // 按 order 排序的类型列表
  const sortedTypes = useMemo(() => {
    return [...types].sort((a, b) => a.order - b.order)
  }, [types])

  // 拖拽开始
  const handleDragStart = useCallback((event: DragStartEvent): void => {
    setActiveId(event.active.id as string)
  }, [])
  
  // 拖拽结束
  const handleDragEnd = useCallback((event: DragEndEvent): void => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = sortedTypes.findIndex(t => t.id === active.id)
      const newIndex = sortedTypes.findIndex(t => t.id === over.id)
      
      const newTypes = arrayMove(sortedTypes, oldIndex, newIndex)
      const newTypeIds = newTypes.map(t => t.id)
      
      // 调用 reorderTypes 更新顺序
      reorderTypes(newTypeIds).catch((error) => {
        console.error('Failed to reorder types:', error)
        message.error('排序失败')
      })
    }
    
    setActiveId(null)
  }, [sortedTypes, reorderTypes])
  
  // 当前拖拽的类型
  const activeType = activeId ? types.find(t => t.id === activeId) : null

  // 点击新建按钮 - 打开自定义类型创建
  const handleCreateClick = (): void => {
    if (readOnly) return
    openCreateModal('custom')
  }

  // 从模板创建
  const handleCreateFromTemplate = (template: VocabularyType): void => {
    if (readOnly) return
    openCreateModal('template', template)
  }

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
      // 设置图标预览
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

  // 编辑类型基本信息
  const handleEditType = (type: VocabularyType): void => {
    if (readOnly) return
    setEditingType(type)
    setCreateMode(null)
    setSelectedTemplate(null)
    form.setFieldsValue({
      name: type.name,
      icon: type.icon,
      color: type.color
    })
    // 设置图标预览
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

  // 保存类型基本信息
  const handleSaveType = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      const colorValue = typeof values.color === 'string' 
        ? values.color 
        : values.color?.toHexString?.() || '#1890ff'

      if (editingType) {
        // 编辑现有类型
        await updateType(editingType.id, {
          name: values.name,
          icon: values.icon,
          color: colorValue
        })
        message.success('更新成功')
      } else {
        // 新建类型
        let fields: FieldDefinition[] = []
        
        if (createMode === 'template' && selectedTemplate) {
          // 从模板创建 - 使用模板的字段
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
      console.error('保存失败:', error)
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  // 复制类型（复制所有字段）
  const handleDuplicateType = async (type: VocabularyType): Promise<void> => {
    if (readOnly) return
    
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
    if (readOnly) return
    try {
      await deleteType(typeId)
      if (selectedTypeId === typeId) {
        setSelectedTypeId(null)
      }
      message.success('删除成功')
    } catch (error) {
      console.error('删除类型失败:', error)
      message.error('删除失败')
    }
  }

  // 更新字段定义
  const handleFieldsChange = useCallback(async (fields: FieldDefinition[]): Promise<void> => {
    if (!selectedTypeId || readOnly) return
    await updateType(selectedTypeId, { fields })
  }, [selectedTypeId, readOnly, updateType])

  // 更新表格配置
  const handleTableConfigChange = useCallback(async (columns: TableColumnConfig[]): Promise<void> => {
    if (!selectedTypeId || readOnly) return
    await updateType(selectedTypeId, { tableConfig: columns })
  }, [selectedTypeId, readOnly, updateType])

  // 处理类型项的操作
  const handleTypeSelect = (typeId: string): void => {
    setSelectedTypeId(typeId)
  }

  const handleTypeEdit = (type: VocabularyType): void => {
    handleEditType(type)
  }

  const handleTypeDuplicate = (type: VocabularyType): void => {
    handleDuplicateType(type)
  }

  const handleTypeDelete = (typeId: string): void => {
    handleDeleteType(typeId)
  }

  // 新建菜单
  const createMenuItems = [
    {
      type: 'group' as const,
      label: '从模板创建',
      children: getBuiltInVocabularyTypes().map(t => ({
        key: `template-${t.id}`,
        icon: TYPE_ICONS[t.id] || <TagOutlined />,
        label: t.name,
        onClick: () => handleCreateFromTemplate(t)
      }))
    },
    { type: 'divider' as const },
    {
      key: 'custom',
      icon: <PlusOutlined />,
      label: '自定义类型（空白）',
      onClick: () => openCreateModal('custom')
    }
  ]

  // 右侧配置面板内容（抽取出来复用）
  const configPanel = (
    <div className={styles.typeConfigPanel}>
      {!selectedType ? (
        <div className={styles.emptyConfig}>
          <Empty description="请从左侧选择一个类型进行配置" />
        </div>
      ) : (
        <div className={styles.configContent}>
          <div className={styles.configHeader}>
            <div className={styles.configTitle}>
              <div className={styles.typeIcon} style={{ backgroundColor: selectedType.color }}>
                {getTypeIcon(selectedType)}
              </div>
              <span>{selectedType.name}</span>
            </div>
            <Space>
              <Dropdown 
                menu={{ items: createMenuItems }} 
                trigger={['click']}
                disabled={readOnly}
              >
                <Button size="small" icon={<PlusOutlined />} disabled={readOnly}>
                  新建类型
                </Button>
              </Dropdown>
              <Button 
                size="small" 
                onClick={() => handleEditType(selectedType)} 
                disabled={readOnly}
              >
                编辑基本信息
              </Button>
            </Space>
          </div>
          
          {/* 字段定义编辑器 */}
          <div className={styles.configSection}>
            <h3>字段定义</h3>
            <FieldDefinitionEditor
              fields={selectedType.fields}
              vocabularyTypes={types}
              onChange={handleFieldsChange}
              readOnly={readOnly}
            />
          </div>

          {/* 表格配置编辑器 */}
          <div className={styles.configSection}>
            <h3>表格列配置</h3>
            <TableConfigEditor
              fields={selectedType.fields}
              config={selectedType.tableConfig}
              onChange={handleTableConfigChange}
              readOnly={readOnly}
            />
          </div>
        </div>
      )}
    </div>
  )

  // 如果隐藏类型列表，只显示配置面板
  if (hideTypeList) {
    return (
      <div className={`${styles.container} ${styles.containerHideTypeList}`}>
        {configPanel}
        
        {/* 类型基本信息弹窗 */}
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
          {createMode === 'template' && selectedTemplate && (
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-muted)', borderRadius: 4 }}>
              <div style={{ fontWeight: 500, marginBottom: 8 }}>
                模板：{selectedTemplate.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                将预设 {BUILTIN_FIELDS_MAP[selectedTemplate.id]?.length || 0} 个字段
              </div>
            </div>
          )}
          {createMode === 'custom' && (
            <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-muted)', borderRadius: 4 }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                从空白开始创建，后续可在字段定义中添加字段
              </div>
            </div>
          )}
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
        
        {/* 图标选择器弹窗 */}
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

  return (
    <div className={styles.container}>
      {/* 左侧类型列表 */}
      <div className={styles.typeListPanel}>
        <div className={styles.typeListHeader}>
          <span>类型列表</span>
          <Dropdown 
            menu={{ items: createMenuItems }} 
            trigger={['click']}
            disabled={readOnly}
          >
            <Button type="primary" icon={<PlusOutlined />} size="small">
              新建
            </Button>
          </Dropdown>
        </div>
        <div className={styles.typeListBody}>
          {types.length === 0 ? (
            <Empty description="暂无类型" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortedTypes.map(t => t.id)}
                strategy={verticalListSortingStrategy}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {sortedTypes.map((type) => (
                    <SortableTypeItem
                      key={type.id}
                      type={type}
                      isSelected={selectedTypeId === type.id}
                      onSelect={() => handleTypeSelect(type.id)}
                      onEdit={() => handleTypeEdit(type)}
                      onDuplicate={() => handleTypeDuplicate(type)}
                      onDelete={() => handleTypeDelete(type.id)}
                      getTypeIcon={getTypeIcon}
                      readOnly={readOnly}
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
                        <div className={styles.typeMeta}>{activeType.fields.length} 个字段</div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* 右侧配置面板 */}
      {configPanel}

      {/* 类型基本信息弹窗 */}
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
        {createMode === 'template' && selectedTemplate && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-muted)', borderRadius: 4 }}>
            <div style={{ fontWeight: 500, marginBottom: 8 }}>
              模板：{selectedTemplate.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              将预设 {BUILTIN_FIELDS_MAP[selectedTemplate.id]?.length || 0} 个字段
            </div>
          </div>
        )}
        {createMode === 'custom' && (
          <div style={{ marginBottom: 16, padding: 12, background: 'var(--bg-muted)', borderRadius: 4 }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              从空白开始创建，后续可在字段定义中添加字段
            </div>
          </div>
        )}
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
      
      {/* 图标选择器弹窗 */}
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

export default VocabularyTypeSettings
