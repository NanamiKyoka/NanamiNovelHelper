import React, { useState, useEffect, useMemo } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  App,
  Tag,
  Popconfirm,
  Empty,
  Alert
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
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
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useSensitiveStore } from '../../stores/sensitiveStore'
import type { SensitiveWord } from '@shared/sensitive'
import { SENSITIVE_CATEGORIES, SEVERITY_LEVELS } from '@shared/sensitive'
import SensitiveWordFullscreen from './SensitiveWordFullscreen'
import styles from './SensitiveWordPanel.module.css'

interface SensitiveWordPanelProps {
  readOnly?: boolean
}

// 可排序的表格行组件
interface SortableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  'data-row-key': string
}

function SortableRow({ 'data-row-key': id, ...props }: SortableRowProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id
  })

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(props.children, child => {
        if (
          React.isValidElement(child) &&
          (child as React.ReactElement<{ className?: string }>).props?.className?.includes(
            'drag-handle-cell'
          )
        ) {
          return React.cloneElement(child as React.ReactElement<object>, {
            children: (
              <div className={styles.dragHandle} {...listeners}>
                <HolderOutlined />
              </div>
            )
          })
        }
        return child
      })}
    </tr>
  )
}

function SensitiveWordPanel({ readOnly = false }: SensitiveWordPanelProps): JSX.Element {
  const { message } = App.useApp()
  const { words, loadWords, addWord, updateWord, deleteWord, reorderWords, isLoaded } =
    useSensitiveStore()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingWord, setEditingWord] = useState<SensitiveWord | null>(null)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

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

  // 按 order 排序的敏感词列表
  const sortedWords = useMemo(() => {
    return [...words].sort((a, b) => a.order - b.order)
  }, [words])

  // 加载数据
  useEffect(() => {
    if (!isLoaded) {
      loadWords()
    }
  }, [isLoaded, loadWords])

  // 打开新建抽屉
  const handleCreate = (): void => {
    if (readOnly) return
    setEditingWord(null)
    form.resetFields()
    form.setFieldsValue({
      category: '其他',
      severity: 'medium',
      aliases: []
    })
    setDrawerOpen(true)
  }

  // 打开编辑抽屉
  const handleEdit = (word: SensitiveWord): void => {
    if (readOnly) return
    setEditingWord(word)
    form.setFieldsValue({
      ...word,
      aliases: word.aliases || []
    })
    setDrawerOpen(true)
  }

  // 保存敏感词
  const handleSave = async (): Promise<void> => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      if (editingWord) {
        await updateWord(editingWord.id, values)
        message.success('更新成功')
      } else {
        await addWord(values)
        message.success('创建成功')
      }

      setDrawerOpen(false)
    } catch (error) {
      console.error('保存失败:', error)
    } finally {
      setLoading(false)
    }
  }

  // 删除敏感词
  const handleDelete = async (id: string): Promise<void> => {
    if (readOnly) return
    await deleteWord(id)
    message.success('删除成功')
  }

  // 拖拽结束
  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = sortedWords.findIndex(w => w.id === active.id)
      const newIndex = sortedWords.findIndex(w => w.id === over.id)

      const newWords = arrayMove(sortedWords, oldIndex, newIndex)
      const newWordIds = newWords.map(w => w.id)

      // 调用 reorderWords 更新顺序
      reorderWords(newWordIds).catch(error => {
        console.error('Failed to reorder words:', error)
        message.error('排序失败')
      })
    }
  }

  // 获取严重程度标签
  const getSeverityTag = (severity: string): JSX.Element => {
    const level = SEVERITY_LEVELS.find(l => l.value === severity)
    return <Tag color={level?.color || '#999'}>{level?.label || severity}</Tag>
  }

  // 表格列定义
  const columns = [
    {
      title: '',
      key: 'drag',
      width: 40,
      className: 'drag-handle-cell',
      render: () => (
        <div className={styles.dragHandle}>
          <HolderOutlined />
        </div>
      )
    },
    {
      title: '词汇',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ color: 'var(--color-error)', fontWeight: 500 }}>{name}</span>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 80,
      render: (category: string) => <Tag>{category}</Tag>
    },
    {
      title: '严重程度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => getSeverityTag(severity)
    },
    {
      title: '替换建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      ellipsis: true,
      render: (suggestion: string) => suggestion || '-'
    },
    ...(readOnly
      ? []
      : [
          {
            title: '操作',
            key: 'action',
            width: 100,
            render: (_: unknown, record: SensitiveWord) => (
              <Space>
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={() => handleEdit(record)}
                />
                <Popconfirm
                  title="确定删除此敏感词？"
                  onConfirm={() => handleDelete(record.id)}
                  okText="删除"
                  cancelText="取消"
                >
                  <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                </Popconfirm>
              </Space>
            )
          }
        ])
  ]

  if (!words.length && readOnly) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="请先打开项目" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    )
  }

  // 全屏编辑模式
  if (fullscreen) {
    return <SensitiveWordFullscreen onBack={() => setFullscreen(false)} />
  }

  return (
    <div className={styles.container}>
      {/* 头部提示 */}
      <Alert
        message="敏感词在编辑器中会被标记提示，帮助您规避风险内容"
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      {/* 工具栏 */}
      <div className={styles.toolbar}>
        <Space>
          <Button icon={<FullscreenOutlined />} onClick={() => setFullscreen(true)}>
            编辑
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate} disabled={readOnly}>
            添加敏感词
          </Button>
        </Space>
      </div>

      {/* 表格 */}
      <div className={styles.tableContainer}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={sortedWords.map(w => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <Table
              dataSource={sortedWords}
              columns={columns}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 20 }}
              locale={{
                emptyText: <Empty description="暂无敏感词" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              }}
              components={{
                body: {
                  row: SortableRow
                }
              }}
            />
          </SortableContext>
        </DndContext>
      </div>

      {/* 编辑抽屉 */}
      <Drawer
        title={editingWord ? '编辑敏感词' : '添加敏感词'}
        placement="right"
        width={400}
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
          <Form.Item name="name" label="词汇" rules={[{ required: true, message: '请输入词汇' }]}>
            <Input placeholder="敏感词" />
          </Form.Item>

          <Form.Item name="aliases" label="变体/别名">
            <Select mode="tags" placeholder="输入变体后按回车添加" />
          </Form.Item>

          <Form.Item name="category" label="分类">
            <Select options={SENSITIVE_CATEGORIES} />
          </Form.Item>

          <Form.Item name="severity" label="严重程度">
            <Select options={SEVERITY_LEVELS} />
          </Form.Item>

          <Form.Item name="suggestion" label="替换建议">
            <Input placeholder="建议替换为什么词" />
          </Form.Item>

          <Form.Item name="description" label="说明">
            <Input.TextArea rows={3} placeholder="敏感词说明（可选）" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export default SensitiveWordPanel
export { SensitiveWordPanel }
