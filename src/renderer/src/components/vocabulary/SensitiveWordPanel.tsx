import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Drawer,
  Form,
  Input,
  Select,
  Space,
  message,
  Tag,
  Popconfirm,
  Empty,
  Alert
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  FullscreenOutlined
} from '@ant-design/icons'
import { useSensitiveStore } from '../../stores/sensitiveStore'
import type { SensitiveWord } from '../../types/sensitive'
import { SENSITIVE_CATEGORIES, SEVERITY_LEVELS } from '../../types/sensitive'
import SensitiveWordFullscreen from './SensitiveWordFullscreen'
import styles from './SensitiveWordPanel.module.css'

interface SensitiveWordPanelProps {
  readOnly?: boolean
}

function SensitiveWordPanel({ readOnly = false }: SensitiveWordPanelProps): JSX.Element {
  const {
    words,
    loadWords,
    addWord,
    updateWord,
    deleteWord,
    isLoaded
  } = useSensitiveStore()
  
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingWord, setEditingWord] = useState<SensitiveWord | null>(null)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)

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

  // 获取严重程度标签
  const getSeverityTag = (severity: string): JSX.Element => {
    const level = SEVERITY_LEVELS.find(l => l.value === severity)
    return (
      <Tag color={level?.color || '#999'}>
        {level?.label || severity}
      </Tag>
    )
  }

  // 表格列定义
  const columns = [
    {
      title: '词汇',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <span style={{ color: '#f5222d', fontWeight: 500 }}>{name}</span>
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
    ...(readOnly ? [] : [{
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
            <Button
              type="text"
              size="small"
              icon={<DeleteOutlined />}
              danger
            />
          </Popconfirm>
        </Space>
      )
    }])
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
        <Table
          dataSource={words}
          columns={columns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20 }}
          locale={{ emptyText: <Empty description="暂无敏感词" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
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
