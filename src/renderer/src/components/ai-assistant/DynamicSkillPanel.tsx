/**
 * 动态 SKILL 管理面板
 */

import { useState, useEffect, useCallback } from 'react'
import {
  Layout,
  Button,
  Space,
  Typography,
  Card,
  Divider,
  message,
  Tag,
  Empty,
  Table,
  Descriptions,
  Collapse,
  Spin,
  Alert,
  Popconfirm,
  Tooltip,
  Input,
  Select,
  InputNumber
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  ToolOutlined,
  ExclamationCircleOutlined,
  SafetyOutlined,
  FileTextOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MinusCircleOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons'
import type { DynamicSkill, DynamicSkillTool, SkillWhitelistEntry } from '@shared/ai-assistant'
import styles from './DynamicSkillPanel.module.css'

const { Header, Content, Sider } = Layout
const { Text, Title, Paragraph } = Typography
const { TextArea } = Input

interface DynamicSkillPanelProps {
  onBack: () => void
}

// 工具参数类型选项
const PARAM_TYPE_OPTIONS = [
  { label: '字符串', value: 'string' },
  { label: '数字', value: 'number' },
  { label: '布尔值', value: 'boolean' },
  { label: '数组', value: 'array' },
  { label: '对象', value: 'object' }
]

// 参数类型
interface ParamData {
  id: string
  name: string
  type: string
  required: boolean
  description: string
}

// 工具类型
interface ToolData {
  id: string
  toolId: string
  name: string
  description: string
  timeout?: number
  parameters: ParamData[]
}

// 编辑数据类型
interface SkillEditData {
  name: string
  description: string
  version: string
  author: string
  tags: string[]
  instructions: string
  tools: ToolData[]
}

// 生成唯一 ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

function DynamicSkillPanel({ onBack }: DynamicSkillPanelProps): JSX.Element {
  const [skills, setSkills] = useState<DynamicSkill[]>([])
  const [whitelist, setWhitelist] = useState<SkillWhitelistEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedSkill, setSelectedSkill] = useState<DynamicSkill | null>(null)

  // 编辑模式状态
  const [editingSkillId, setEditingSkillId] = useState<string | null>(null)
  const [editData, setEditData] = useState<SkillEditData | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // 加载 SKILL 列表
  const loadSkills = useCallback(async () => {
    setLoading(true)
    try {
      const [skillList, whitelistData] = await Promise.all([
        window.electron.dynamicSkill.getList(),
        window.electron.dynamicSkill.getWhitelist()
      ])
      setSkills(skillList)
      setWhitelist(whitelistData)
    } catch (error) {
      console.error('Failed to load skills:', error)
      message.error('加载 SKILL 列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSkills()
  }, [loadSkills])

  // 刷新 SKILL
  const handleReload = async () => {
    setLoading(true)
    try {
      await window.electron.dynamicSkill.reload()
      await loadSkills()
      message.success('SKILL 列表已刷新')
    } catch (error) {
      console.error('Failed to reload skills:', error)
      message.error('刷新失败')
    } finally {
      setLoading(false)
    }
  }

  // 添加到白名单
  const handleAddToWhitelist = async (skill: DynamicSkill) => {
    try {
      await window.electron.dynamicSkill.addToWhitelist(skill.id, skill.metadata.name, skill.path)
      setWhitelist([
        ...whitelist,
        {
          skillId: skill.id,
          skillName: skill.metadata.name,
          addedAt: new Date().toISOString(),
          pathHash: skill.path
        }
      ])
      setSkills(skills.map(s => (s.id === skill.id ? { ...s, isTrusted: true } : s)))
      message.success(`已信任 SKILL: ${skill.metadata.name}`)
    } catch (error) {
      console.error('Failed to add to whitelist:', error)
      message.error('添加信任失败')
    }
  }

  // 从白名单移除
  const handleRemoveFromWhitelist = async (skillId: string) => {
    try {
      await window.electron.dynamicSkill.removeFromWhitelist(skillId)
      setWhitelist(whitelist.filter(w => w.skillId !== skillId))
      setSkills(skills.map(s => (s.id === skillId ? { ...s, isTrusted: false } : s)))
      message.success('已取消信任')
    } catch (error) {
      console.error('Failed to remove from whitelist:', error)
      message.error('取消信任失败')
    }
  }

  // 检查 SKILL 是否在白名单中
  const isSkillTrusted = (skillId: string) => {
    return whitelist.some(w => w.skillId === skillId)
  }

  // 进入编辑模式
  const handleStartEdit = (skill: DynamicSkill, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation()
    }
    setEditingSkillId(skill.id)
    setEditData({
      name: skill.metadata.name || '',
      description: skill.metadata.description || '',
      version: skill.metadata.version || '',
      author: skill.metadata.author || '',
      tags: skill.metadata.tags || [],
      instructions: skill.instructions || '',
      tools:
        skill.tools.length > 0
          ? skill.tools.map(tool => ({
              id: generateId(),
              toolId: tool.id,
              name: tool.name,
              description: tool.description || '',
              parameters: (tool.parameters || []).map(p => ({
                id: generateId(),
                name: p.name,
                type: p.type || 'string',
                required: p.required || false,
                description: p.description || ''
              })),
              timeout: tool.timeout
            }))
          : [{ id: generateId(), toolId: '', name: '', description: '', parameters: [] }]
    })
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingSkillId(null)
    setEditData(null)
  }

  // 更新编辑数据
  const updateEditData = (updates: Partial<SkillEditData>) => {
    setEditData(prev => (prev ? { ...prev, ...updates } : null))
  }

  // 更新工具数据
  const updateTool = (toolId: string, updates: Partial<ToolData>) => {
    setEditData(prev => {
      if (!prev) return null
      return {
        ...prev,
        tools: prev.tools.map(t => (t.id === toolId ? { ...t, ...updates } : t))
      }
    })
  }

  // 添加工具
  const addTool = () => {
    setEditData(prev => {
      if (!prev) return null
      return {
        ...prev,
        tools: [
          ...prev.tools,
          {
            id: generateId(),
            toolId: '',
            name: '',
            description: '',
            parameters: []
          }
        ]
      }
    })
  }

  // 删除工具
  const removeTool = (toolId: string) => {
    setEditData(prev => {
      if (!prev || prev.tools.length <= 1) return prev
      return {
        ...prev,
        tools: prev.tools.filter(t => t.id !== toolId)
      }
    })
  }

  // 添加参数
  const addParameter = (toolId: string) => {
    setEditData(prev => {
      if (!prev) return null
      return {
        ...prev,
        tools: prev.tools.map(t =>
          t.id === toolId
            ? {
                ...t,
                parameters: [
                  ...t.parameters,
                  { id: generateId(), name: '', type: 'string', required: false, description: '' }
                ]
              }
            : t
        )
      }
    })
  }

  // 更新参数
  const updateParameter = (toolId: string, paramId: string, updates: Partial<ParamData>) => {
    setEditData(prev => {
      if (!prev) return null
      return {
        ...prev,
        tools: prev.tools.map(t =>
          t.id === toolId
            ? {
                ...t,
                parameters: t.parameters.map(p => (p.id === paramId ? { ...p, ...updates } : p))
              }
            : t
        )
      }
    })
  }

  // 删除参数
  const removeParameter = (toolId: string, paramId: string) => {
    setEditData(prev => {
      if (!prev) return null
      return {
        ...prev,
        tools: prev.tools.map(t =>
          t.id === toolId ? { ...t, parameters: t.parameters.filter(p => p.id !== paramId) } : t
        )
      }
    })
  }

  // 保存编辑
  const handleSaveEdit = async (skillId: string) => {
    if (!editData) return

    // 验证
    if (!editData.name.trim()) {
      message.error('请输入 SKILL 名称')
      return
    }
    if (!editData.description.trim()) {
      message.error('请输入描述')
      return
    }

    for (const tool of editData.tools) {
      if (!tool.toolId.trim()) {
        message.error('请填写所有工具的 ID')
        return
      }
      if (!tool.name.trim()) {
        message.error('请填写所有工具的名称')
        return
      }
      for (const param of tool.parameters) {
        if (!param.name.trim()) {
          message.error('请填写所有参数的名称')
          return
        }
      }
    }

    setSubmitting(true)
    try {
      const tools = editData.tools.map((tool, index) => ({
        id: tool.toolId || `tool-${index}`,
        name: tool.name || tool.toolId,
        description: tool.description || '',
        parameters: tool.parameters.map(param => ({
          name: param.name,
          type: param.type || 'string',
          required: param.required || false,
          description: param.description || ''
        })),
        timeout: tool.timeout
      }))

      await window.electron.dynamicSkill.update(skillId, {
        name: editData.name,
        description: editData.description,
        version: editData.version,
        author: editData.author,
        tags: editData.tags,
        tools,
        instructions: editData.instructions
      })

      message.success('SKILL 更新成功')
      setEditingSkillId(null)
      setEditData(null)
      await loadSkills()
    } catch (error) {
      console.error('Failed to update skill:', error)
      message.error(error instanceof Error ? error.message : '更新失败')
    } finally {
      setSubmitting(false)
    }
  }

  // 删除 SKILL
  const handleDelete = async (skill: DynamicSkill) => {
    try {
      await window.electron.dynamicSkill.delete(skill.id)
      message.success('SKILL 已移至回收站')
      if (selectedSkill?.id === skill.id) {
        setSelectedSkill(null)
      }
      if (editingSkillId === skill.id) {
        setEditingSkillId(null)
        setEditData(null)
      }
      await loadSkills()
    } catch (error) {
      console.error('Failed to delete skill:', error)
      message.error(error instanceof Error ? error.message : '删除失败')
    }
  }

  // 工具表格列定义
  const toolColumns = [
    {
      title: '工具名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name: string, _record: DynamicSkillTool) => (
        <Space>
          <ToolOutlined />
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 150,
      render: (id: string) => <Text code>{id}</Text>
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    },
    {
      title: '参数',
      dataIndex: 'parameters',
      key: 'parameters',
      width: 100,
      render: (params: DynamicSkillTool['parameters']) => <Tag>{params.length} 个参数</Tag>
    },
    {
      title: '超时',
      dataIndex: 'timeout',
      key: 'timeout',
      width: 80,
      render: (timeout?: number) => (timeout ? `${timeout / 1000}s` : '30s')
    }
  ]

  // 参数表格列定义
  const paramColumns = [
    {
      title: '参数名',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 80,
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '必填',
      dataIndex: 'required',
      key: 'required',
      width: 60,
      render: (required?: boolean) => (required ? <Tag color="red">必填</Tag> : <Tag>可选</Tag>)
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true
    }
  ]

  // 渲染预览模式
  const renderPreviewMode = (skill: DynamicSkill) => (
    <div className={styles.skillDetail}>
      {/* 元数据 */}
      <Card size="small" title="SKILL 信息" className={styles.infoCard}>
        <Descriptions size="small" column={2}>
          <Descriptions.Item label="名称">{skill.metadata.name}</Descriptions.Item>
          <Descriptions.Item label="版本">{skill.metadata.version || '-'}</Descriptions.Item>
          <Descriptions.Item label="作者">{skill.metadata.author || '-'}</Descriptions.Item>
          <Descriptions.Item label="路径">
            <Text code style={{ fontSize: 12 }}>
              {skill.path}
            </Text>
          </Descriptions.Item>
          <Descriptions.Item label="标签" span={2}>
            {skill.metadata.tags?.map(tag => <Tag key={tag}>{tag}</Tag>) || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="依赖" span={2}>
            {skill.metadata.dependencies?.join(', ') || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="描述" span={2}>
            {skill.metadata.description}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 工具列表 */}
      <Divider orientation="left">
        <ToolOutlined /> 工具列表
      </Divider>
      <Table
        size="small"
        columns={toolColumns}
        dataSource={skill.tools}
        rowKey="id"
        pagination={false}
        expandable={{
          expandedRowRender: tool => (
            <div className={styles.paramTable}>
              <Text type="secondary" style={{ marginBottom: 8, display: 'block' }}>
                参数定义：
              </Text>
              {tool.parameters.length > 0 ? (
                <Table
                  size="small"
                  columns={paramColumns}
                  dataSource={tool.parameters}
                  rowKey="name"
                  pagination={false}
                />
              ) : (
                <Text type="secondary">无参数</Text>
              )}
            </div>
          ),
          rowExpandable: tool => tool.parameters.length > 0
        }}
      />

      {/* SKILL 说明 */}
      {skill.instructions && (
        <>
          <Divider orientation="left">
            <FileTextOutlined /> SKILL 说明
          </Divider>
          <Card size="small" className={styles.instructionsCard}>
            <pre className={styles.instructions}>{skill.instructions}</pre>
          </Card>
        </>
      )}
    </div>
  )

  // 渲染编辑模式（受控组件，无 Form.List 嵌套）
  const renderEditMode = (_skill: DynamicSkill) => {
    if (!editData) return null

    return (
      <div className={styles.editForm}>
        <div className={styles.editContent}>
          {/* 基本信息 */}
          <Card size="small" title="基本信息" className={styles.infoCard}>
            <div className={styles.formItem}>
              <label className={styles.formLabel}>
                SKILL 名称 <span className={styles.required}>*</span>
              </label>
              <Input
                value={editData.name}
                onChange={e => updateEditData({ name: e.target.value })}
                placeholder="我的技能"
              />
            </div>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>
                描述 <span className={styles.required}>*</span>
              </label>
              <TextArea
                rows={2}
                value={editData.description}
                onChange={e => updateEditData({ description: e.target.value })}
                placeholder="描述此 SKILL 的功能和用途"
              />
              <span className={styles.formExtra}>用于 AI 判断何时使用此 SKILL</span>
            </div>

            <Space style={{ width: '100%' }} size="large">
              <div className={styles.formItem} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel}>版本</label>
                <Input
                  style={{ width: 120 }}
                  value={editData.version}
                  onChange={e => updateEditData({ version: e.target.value })}
                  placeholder="1.0.0"
                />
              </div>
              <div className={styles.formItem} style={{ marginBottom: 0 }}>
                <label className={styles.formLabel}>作者</label>
                <Input
                  style={{ width: 150 }}
                  value={editData.author}
                  onChange={e => updateEditData({ author: e.target.value })}
                  placeholder="作者名称"
                />
              </div>
            </Space>

            <div className={styles.formItem}>
              <label className={styles.formLabel}>标签</label>
              <Select
                mode="tags"
                style={{ width: '100%' }}
                value={editData.tags}
                onChange={tags => updateEditData({ tags })}
                placeholder="输入标签后按回车添加"
                tokenSeparators={[',']}
              />
            </div>
          </Card>

          {/* SKILL 说明 */}
          <Card size="small" title="说明文档" style={{ marginTop: 16 }}>
            <TextArea
              rows={4}
              value={editData.instructions}
              onChange={e => updateEditData({ instructions: e.target.value })}
              placeholder="供 AI 参考的详细说明文档..."
            />
          </Card>

          {/* 工具定义 */}
          <Divider orientation="left">
            <ToolOutlined /> 工具定义
          </Divider>

          {editData.tools.map((tool, toolIndex) => (
            <Card
              key={tool.id}
              size="small"
              style={{ marginBottom: 16 }}
              title={`工具 #${toolIndex + 1}`}
              extra={
                editData.tools.length > 1 && (
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={() => removeTool(tool.id)}
                  >
                    删除
                  </Button>
                )
              }
            >
              <Space style={{ width: '100%' }} align="start">
                <div className={styles.formItem} style={{ marginBottom: 8, width: 140 }}>
                  <label className={styles.formLabel}>
                    工具 ID <span className={styles.required}>*</span>
                  </label>
                  <Input
                    value={tool.toolId}
                    onChange={e => updateTool(tool.id, { toolId: e.target.value })}
                    placeholder="tool-id"
                  />
                </div>
                <div className={styles.formItem} style={{ marginBottom: 8, width: 140 }}>
                  <label className={styles.formLabel}>
                    工具名称 <span className={styles.required}>*</span>
                  </label>
                  <Input
                    value={tool.name}
                    onChange={e => updateTool(tool.id, { name: e.target.value })}
                    placeholder="工具名称"
                  />
                </div>
                <div
                  className={styles.formItem}
                  style={{ marginBottom: 8, flex: 1, minWidth: 150 }}
                >
                  <label className={styles.formLabel}>描述</label>
                  <Input
                    value={tool.description}
                    onChange={e => updateTool(tool.id, { description: e.target.value })}
                    placeholder="工具描述"
                  />
                </div>
                <div className={styles.formItem} style={{ marginBottom: 8, width: 100 }}>
                  <label className={styles.formLabel}>超时(ms)</label>
                  <InputNumber
                    min={1000}
                    style={{ width: '100%' }}
                    value={tool.timeout}
                    onChange={v => updateTool(tool.id, { timeout: v || undefined })}
                    placeholder="30000"
                  />
                </div>
              </Space>

              {/* 参数列表 */}
              <div style={{ marginTop: 12 }}>
                <div style={{ marginBottom: 8 }}>
                  <Text type="secondary">参数：</Text>
                  <Button
                    type="link"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => addParameter(tool.id)}
                  >
                    添加参数
                  </Button>
                </div>
                {tool.parameters.map(param => (
                  <div key={param.id} className={styles.paramRow}>
                    <Input
                      style={{ width: 100 }}
                      value={param.name}
                      onChange={e => updateParameter(tool.id, param.id, { name: e.target.value })}
                      placeholder="参数名"
                    />
                    <Select
                      style={{ width: 90 }}
                      value={param.type}
                      onChange={v => updateParameter(tool.id, param.id, { type: v })}
                      options={PARAM_TYPE_OPTIONS}
                    />
                    <Select
                      style={{ width: 70 }}
                      value={param.required}
                      onChange={v => updateParameter(tool.id, param.id, { required: v })}
                    >
                      <Select.Option value={false}>可选</Select.Option>
                      <Select.Option value={true}>必填</Select.Option>
                    </Select>
                    <Input
                      style={{ flex: 1, minWidth: 120 }}
                      value={param.description}
                      onChange={e =>
                        updateParameter(tool.id, param.id, { description: e.target.value })
                      }
                      placeholder="描述"
                    />
                    <MinusCircleOutlined
                      style={{ color: 'var(--color-error)', cursor: 'pointer' }}
                      onClick={() => removeParameter(tool.id, param.id)}
                    />
                  </div>
                ))}
              </div>
            </Card>
          ))}

          <Button type="dashed" onClick={addTool} block icon={<PlusOutlined />}>
            添加工具
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Layout className={styles.container}>
      <Header className={styles.header}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
          <Divider type="vertical" />
          <Title level={4} style={{ margin: 0 }}>
            <ToolOutlined style={{ marginRight: 8 }} />
            动态 SKILL 管理
          </Title>
          <Tag color="blue">{skills.length} 个 SKILL</Tag>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={handleReload} loading={loading}>
            刷新
          </Button>
        </Space>
      </Header>

      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Content className={styles.mainContent}>
          {loading && skills.length === 0 ? (
            <div className={styles.loadingContainer}>
              <Spin size="large" tip="加载中..." />
            </div>
          ) : skills.length === 0 ? (
            <Empty description="暂无 SKILL" image={Empty.PRESENTED_IMAGE_SIMPLE}>
              <Space direction="vertical">
                <Text type="secondary">
                  在项目目录 .novelhelper/data/ai-assistant/skills/ 中添加 SKILL 文件夹
                </Text>
              </Space>
            </Empty>
          ) : (
            <Collapse
              accordion
              activeKey={selectedSkill?.id}
              onChange={key => {
                if (key) {
                  const skill = skills.find(s => s.id === key)
                  setSelectedSkill(skill || null)
                  if (editingSkillId && editingSkillId !== key) {
                    setEditingSkillId(null)
                    setEditData(null)
                  }
                } else {
                  setSelectedSkill(null)
                  setEditingSkillId(null)
                  setEditData(null)
                }
              }}
              items={skills.map(skill => {
                const isEditing = editingSkillId === skill.id
                return {
                  key: skill.id,
                  label: (
                    <Space>
                      <Text strong>{skill.metadata.name}</Text>
                      <Text type="secondary">({skill.tools.length} 个工具)</Text>
                      {isSkillTrusted(skill.id) ? (
                        <Tag color="green" icon={<SafetyOutlined />}>
                          已信任
                        </Tag>
                      ) : (
                        <Tag color="orange" icon={<ExclamationCircleOutlined />}>
                          未信任
                        </Tag>
                      )}
                      {isEditing && <Tag color="blue">编辑中</Tag>}
                    </Space>
                  ),
                  extra: (
                    <Space onClick={e => e.stopPropagation()}>
                      {isEditing ? (
                        <>
                          <Button
                            type="primary"
                            size="small"
                            icon={<SaveOutlined />}
                            loading={submitting}
                            onClick={e => {
                              e.stopPropagation()
                              handleSaveEdit(skill.id)
                            }}
                          >
                            保存
                          </Button>
                          <Button
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={e => {
                              e.stopPropagation()
                              handleCancelEdit()
                            }}
                            disabled={submitting}
                          >
                            取消
                          </Button>
                        </>
                      ) : (
                        <>
                          <Tooltip title="编辑 SKILL">
                            <Button
                              type="link"
                              size="small"
                              icon={<EditOutlined />}
                              onClick={e => handleStartEdit(skill, e)}
                            >
                              编辑
                            </Button>
                          </Tooltip>
                          {!isSkillTrusted(skill.id) && (
                            <Tooltip title="添加到信任列表">
                              <Button
                                type="link"
                                size="small"
                                icon={<SafetyOutlined />}
                                onClick={() => handleAddToWhitelist(skill)}
                              >
                                信任
                              </Button>
                            </Tooltip>
                          )}
                          {isSkillTrusted(skill.id) && (
                            <Popconfirm
                              title="确定取消信任此 SKILL？"
                              onConfirm={() => handleRemoveFromWhitelist(skill.id)}
                            >
                              <Button type="link" size="small" danger>
                                取消信任
                              </Button>
                            </Popconfirm>
                          )}
                          <Popconfirm
                            title="确定删除此 SKILL？"
                            description="SKILL 将被移动到系统回收站，可以恢复。"
                            onConfirm={() => handleDelete(skill)}
                            okText="删除"
                            cancelText="取消"
                            okButtonProps={{ danger: true }}
                          >
                            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                              删除
                            </Button>
                          </Popconfirm>
                        </>
                      )}
                    </Space>
                  ),
                  children: isEditing ? renderEditMode(skill) : renderPreviewMode(skill)
                }
              })}
            />
          )}
        </Content>

        <Sider width={280} className={styles.helpSider}>
          <div className={styles.helpHeader}>
            <Title level={5}>
              <PlayCircleOutlined /> 使用说明
            </Title>
          </div>

          <div className={styles.helpContent}>
            <Alert
              message="信任机制"
              description="首次执行 SKILL 时需要确认信任。确认后会添加到白名单，后续执行自动放行。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />

            <div className={styles.helpSection}>
              <Title level={5}>SKILL 结构</Title>
              <Paragraph style={{ fontSize: 12 }}>
                <pre className={styles.codeBlock}>
                  {`.novelhelper/data/ai-assistant/skills/
└── my-skill/
    ├── SKILL.md       # 元数据
    ├── tools.json     # 工具定义
    └── scripts/
        └── tool.py    # 脚本`}
                </pre>
              </Paragraph>
            </div>

            <div className={styles.helpSection}>
              <Title level={5}>SKILL.md 格式</Title>
              <Paragraph style={{ fontSize: 12 }}>
                <pre className={styles.codeBlock}>
                  {`---
name: 我的技能
description: 用于 AI 判断何时使用
version: 1.0.0
---
# 详细说明
供 AI 参考的文档...`}
                </pre>
              </Paragraph>
            </div>

            <div className={styles.helpSection}>
              <Title level={5}>工具执行流程</Title>
              <ol style={{ fontSize: 12, paddingLeft: 16 }}>
                <li>AI 选择要执行的工具</li>
                <li>检查是否在白名单中</li>
                <li>未信任则弹出确认框</li>
                <li>用户确认后执行脚本</li>
                <li>流式返回执行结果</li>
              </ol>
            </div>

            <div className={styles.helpSection}>
              <Title level={5}>编辑 SKILL</Title>
              <ol style={{ fontSize: 12, paddingLeft: 16 }}>
                <li>展开 SKILL 详情</li>
                <li>点击"编辑"按钮</li>
                <li>修改信息后点击"保存"</li>
              </ol>
            </div>
          </div>
        </Sider>
      </Layout>
    </Layout>
  )
}

export default DynamicSkillPanel
