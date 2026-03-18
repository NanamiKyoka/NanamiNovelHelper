/**
 * 敏感词全屏编辑器
 * 左侧分类列表 + 右侧敏感词管理/颜色设置
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
  Table,
  Drawer,
  Form,
  Select,
  Popconfirm,
  message
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined,
  TagsOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useSensitiveStore } from '@stores/sensitiveStore'
import type { SensitiveWord } from '@types/sensitive'
import { SENSITIVE_CATEGORIES, SEVERITY_LEVELS } from '@types/sensitive'
import styles from './SensitiveWordFullscreen.module.css'

const { Sider, Content } = Layout
const { Text, Title } = Typography
const { TextArea } = Input

interface SensitiveWordFullscreenProps {
  onBack: () => void
}

function SensitiveWordFullscreen({ onBack }: SensitiveWordFullscreenProps): JSX.Element {
  const {
    words,
    loadWords,
    addWord,
    updateWord,
    deleteWord,
    isLoaded
  } = useSensitiveStore()
  
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [activeTab, setActiveTab] = useState<'words' | 'settings'>('words')
  const [searchText, setSearchText] = useState('')
  
  // 编辑抽屉状态
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editingWord, setEditingWord] = useState<SensitiveWord | null>(null)
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  // 加载数据
  useEffect(() => {
    if (!isLoaded) {
      loadWords()
    }
  }, [isLoaded, loadWords])

  // 分类列表（包含全部）
  const categories = useMemo(() => {
    const cats = [
      { key: 'all', name: '全部', count: words.length },
      ...SENSITIVE_CATEGORIES.map(cat => ({
        key: cat.value,
        name: cat.label,
        count: words.filter(w => w.category === cat.value).length
      }))
    ]
    return cats
  }, [words])

  // 过滤敏感词
  const filteredWords = useMemo(() => {
    let result = words
    
    if (selectedCategory !== 'all') {
      result = result.filter(w => w.category === selectedCategory)
    }
    
    if (searchText.trim()) {
      const lower = searchText.toLowerCase()
      result = result.filter(w => 
        w.name.toLowerCase().includes(lower) ||
        w.aliases.some(a => a.toLowerCase().includes(lower))
      )
    }
    
    return result
  }, [words, selectedCategory, searchText])

  // 打开新建抽屉
  const handleCreate = (): void => {
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
      message.error('保存失败')
    } finally {
      setLoading(false)
    }
  }

  // 删除敏感词
  const handleDelete = async (id: string): Promise<void> => {
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
      width: 150,
      render: (name: string) => (
        <span style={{ color: '#f5222d', fontWeight: 500 }}>{name}</span>
      )
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      width: 100,
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
  ]

  // Tab 配置
  const tabItems = [
    {
      key: 'words',
      label: (
        <span>
          <WarningOutlined />
          敏感词管理
          {words.length > 0 && (
            <Tag style={{ marginLeft: 8 }} color="red">{words.length}</Tag>
          )}
        </span>
      )
    },
    {
      key: 'settings',
      label: (
        <span>
          <SettingOutlined />
          颜色设置
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
          <Title level={5} className={styles.title}>敏感词管理</Title>
        </div>
        <div className={styles.toolbarRight}>
          <span className={styles.stats}>
            {words.length} 个敏感词
          </span>
        </div>
      </div>

      <Layout className={styles.mainLayout}>
        {/* 左侧分类列表 */}
        <Sider width={220} className={styles.sider}>
          <div className={styles.siderHeader}>
            <Input.Search
              placeholder="搜索敏感词..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="small"
            />
          </div>
          
          <div className={styles.siderBody}>
            <List
              dataSource={categories}
              renderItem={(cat) => (
                <List.Item
                  className={`${styles.categoryItem} ${selectedCategory === cat.key ? styles.active : ''}`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  <div className={styles.categoryContent}>
                    <span className={styles.categoryName}>{cat.name}</span>
                    <Tag>{cat.count}</Tag>
                  </div>
                </List.Item>
              )}
            />
          </div>
          
          <div className={styles.siderFooter}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              block
              onClick={handleCreate}
            >
              添加敏感词
            </Button>
          </div>
        </Sider>

        {/* 右侧内容区 */}
        <Content className={styles.content}>
          <div className={styles.contentBody}>
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key as 'words' | 'settings')}
              items={tabItems}
              className={styles.tabs}
            />
            
            <div className={styles.tabContent}>
              {activeTab === 'words' && (
                <Table
                  dataSource={filteredWords}
                  columns={columns}
                  rowKey="id"
                  size="small"
                  pagination={{ pageSize: 20 }}
                  locale={{ emptyText: <Empty description="暂无敏感词" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
                />
              )}
              
              {activeTab === 'settings' && (
                <div className={styles.settingsPanel}>
                  <h3 className={styles.settingsTitle}>敏感词高亮颜色</h3>
                  <p className={styles.settingsDesc}>
                    按严重程度设置敏感词在编辑器中的高亮颜色
                  </p>
                  
                  <div className={styles.colorSettings}>
                    {SEVERITY_LEVELS.map(level => (
                      <div key={level.value} className={styles.colorRow}>
                        <div className={styles.colorLabel}>
                          <Tag color={level.color}>{level.label}</Tag>
                          <span className={styles.colorDesc}>
                            {level.value === 'low' && '轻微问题'}
                            {level.value === 'medium' && '中等风险'}
                            {level.value === 'high' && '较高风险'}
                            {level.value === 'critical' && '严重问题'}
                          </span>
                        </div>
                        <div 
                          className={styles.colorPreview}
                          style={{ backgroundColor: level.color }}
                        />
                      </div>
                    ))}
                  </div>
                  
                  <div className={styles.settingsNote}>
                    <Text type="secondary">
                      注意：颜色设置可在「设置 → 词汇高亮 → 敏感词颜色」中修改
                    </Text>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Content>
      </Layout>

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
            <TextArea rows={3} placeholder="敏感词说明（可选）" />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  )
}

export default SensitiveWordFullscreen
