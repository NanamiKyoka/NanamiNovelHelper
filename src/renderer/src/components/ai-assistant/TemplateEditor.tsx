/**
 * 模板编辑器组件（全屏模式）
 */

import { useState, useEffect, useMemo } from 'react'
import {
  Layout,
  Form,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Card,
  Divider,
  message,
  Tooltip,
  Tag,
  Switch,
  InputNumber,
  Empty,
  Popconfirm
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  CopyOutlined,
  SaveOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useRelationshipStore } from '@stores/relationshipStore'
import { useTimelineStore } from '@stores/timelineStore'
import type {
  PromptTemplate,
  VariableDefinition,
  TemplateCategory,
  VariableType,
  VariableValue,
  TemplateApiConfig
} from '@shared/ai-assistant'
import styles from './TemplateEditor.module.css'

const { Header, Sider, Content } = Layout
const { TextArea } = Input
const { Text, Title } = Typography

// 分类配置
const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: 'character', label: '人物塑造' },
  { value: 'plot', label: '情节设计' },
  { value: 'worldbuilding', label: '世界观构建' },
  { value: 'polishing', label: '润色修改' }
]

// 变量类型配置
const VARIABLE_TYPE_OPTIONS: { value: VariableType; label: string; description: string }[] = [
  { value: 'text', label: '文本输入', description: '用户手动输入文本' },
  { value: 'textarea', label: '多行文本', description: '用户手动输入多行文本' },
  { value: 'vocabulary', label: '词汇条目', description: '从词汇库选择条目' },
  { value: 'relationship', label: '关系图节点', description: '从关系图选择节点' },
  { value: 'timeline', label: '时间线事件', description: '从时间线选择事件' },
  { value: 'chapter', label: '当前章节', description: '当前编辑的章节内容' },
  { value: 'selection', label: '选中文本', description: '当前选中的文本' },
  { value: 'select', label: '单选', description: '从预设选项中选择一个' },
  { value: 'multiselect', label: '多选', description: '从预设选项中选择多个' },
  { value: 'number', label: '数字', description: '输入数字' },
  { value: 'boolean', label: '布尔值', description: '是/否开关' }
]

interface TemplateEditorProps {
  templateId?: string
  onBack: () => void
  onExecute?: (template: PromptTemplate) => void
}

function TemplateEditor({
  templateId,
  onBack,
  onExecute: _onExecute
}: TemplateEditorProps): JSX.Element {
  const {
    templates,
    currentTemplate,
    loadTemplate,
    saveTemplate,
    setCurrentTemplate,
    resolveVariables
  } = useAiAssistantStore()

  const {
    types: vocabularyTypes,
    loadTypes: loadVocabularyTypes,
    isLoaded: vocabLoaded
  } = useVocabularyStore()
  const { graphList: relationshipGraphs, loadList: loadRelationshipList } = useRelationshipStore()
  const { timelineList, loadList: loadTimelineList } = useTimelineStore()

  const [form] = Form.useForm()
  const [variables, setVariables] = useState<VariableDefinition[]>([])
  const [content, setContent] = useState('')
  const [previewMode, setPreviewMode] = useState(false)
  const [previewVariables, setPreviewVariables] = useState<Record<string, VariableValue>>({})
  const [saving, setSaving] = useState(false)
  const [apiConfig, setApiConfig] = useState<TemplateApiConfig>({})
  const [availableModels, setAvailableModels] = useState<string[]>([])

  const PROVIDER_OPTIONS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'custom', label: '自定义' }
  ]

  // 加载依赖数据
  useEffect(() => {
    if (!vocabLoaded) {
      loadVocabularyTypes()
    }
    loadRelationshipList()
    loadTimelineList()
  }, [vocabLoaded, loadVocabularyTypes, loadRelationshipList, loadTimelineList])

  // 加载模板数据
  useEffect(() => {
    if (templateId) {
      const template = templates.find(t => t.id === templateId)
      if (template) {
        setCurrentTemplate(template)
        form.setFieldsValue({
          name: template.name,
          description: template.description,
          category: template.category,
          tags: template.tags,
          content: template.content
        })
        setVariables(template.variables)
        setContent(template.content)
        setApiConfig(template.apiConfig || {})
      } else {
        loadTemplate(templateId)
      }
    } else {
      // 新建模式
      setCurrentTemplate(null)
      form.resetFields()
      setVariables([])
      setContent('')
      setApiConfig({})
    }
  }, [templateId, templates, form, loadTemplate, setCurrentTemplate])

  // 当 currentTemplate 变化时更新表单
  useEffect(() => {
    if (currentTemplate) {
      form.setFieldsValue({
        name: currentTemplate.name,
        description: currentTemplate.description,
        category: currentTemplate.category,
        tags: currentTemplate.tags,
        content: currentTemplate.content
      })
      setVariables(currentTemplate.variables)
      setContent(currentTemplate.content)
      setApiConfig(currentTemplate.apiConfig || {})
    }
  }, [currentTemplate, form])

  useEffect(() => {
    if (apiConfig.provider) {
      window.electron.aiAssistant.getAvailableModels(apiConfig.provider).then(models => {
        setAvailableModels(models)
      })
    } else {
      setAvailableModels([])
    }
  }, [apiConfig.provider])

  // 添加变量
  const handleAddVariable = () => {
    const newVariable: VariableDefinition = {
      id: `var_${Date.now()}`,
      name: `变量${variables.length + 1}`,
      key: `变量${variables.length + 1}`,
      type: 'text',
      required: false,
      order: variables.length
    }
    setVariables([...variables, newVariable])
  }

  // 更新变量
  const handleUpdateVariable = (id: string, updates: Partial<VariableDefinition>) => {
    setVariables(variables.map(v => (v.id === id ? { ...v, ...updates } : v)))
  }

  // 删除变量
  const handleDeleteVariable = (id: string) => {
    setVariables(variables.filter(v => v.id !== id))
  }

  // 保存模板
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      const template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
        id: currentTemplate?.id,
        name: values.name,
        description: values.description,
        category: values.category,
        tags: values.tags || [],
        variables: variables.map((v, index) => ({ ...v, order: index })),
        content: content,
        apiConfig: apiConfig.provider ? apiConfig : undefined,
        isBuiltIn: false,
        source: 'project',
        order: currentTemplate?.order || 0
      }

      await saveTemplate(template)
      message.success('保存成功')
      onBack()
    } catch (error) {
      console.error('Save failed:', error)
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 渲染变量编辑器
  const renderVariableEditor = (variable: VariableDefinition) => {
    return (
      <Card
        key={variable.id}
        size="small"
        className={styles.variableCard}
        title={
          <Space>
            <Tag color="blue">
              {VARIABLE_TYPE_OPTIONS.find(t => t.value === variable.type)?.label}
            </Tag>
            <Text strong>{variable.name}</Text>
            {variable.required && <Tag color="red">必填</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="复制变量引用">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  navigator.clipboard.writeText(`{{${variable.key}}}`)
                  message.success('已复制到剪贴板')
                }}
              />
            </Tooltip>
            <Popconfirm
              title="确定删除此变量？"
              onConfirm={() => handleDeleteVariable(variable.id)}
            >
              <Button type="text" size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space>
        }
      >
        <div className={styles.variableForm}>
          <div className={styles.variableRow}>
            <label>变量名：</label>
            <Input
              value={variable.name}
              onChange={e => handleUpdateVariable(variable.id, { name: e.target.value })}
              placeholder="显示名称"
              style={{ width: 120 }}
            />
          </div>
          <div className={styles.variableRow}>
            <label>引用键：</label>
            <Input
              value={variable.key}
              onChange={e => handleUpdateVariable(variable.id, { key: e.target.value })}
              placeholder="用于 {{key}} 引用"
              style={{ width: 120 }}
              addonBefore="{{"
              addonAfter="}}"
            />
          </div>
          <div className={styles.variableRow}>
            <label>类型：</label>
            <Select
              value={variable.type}
              onChange={type => handleUpdateVariable(variable.id, { type })}
              options={VARIABLE_TYPE_OPTIONS.map(t => ({
                value: t.value,
                label: t.label
              }))}
              style={{ width: 200 }}
            />
          </div>
          <div className={styles.variableRow}>
            <label>必填：</label>
            <Switch
              checked={variable.required}
              onChange={checked => handleUpdateVariable(variable.id, { required: checked })}
            />
          </div>
          <div className={styles.variableRow}>
            <label>占位符：</label>
            <Input
              value={variable.placeholder}
              onChange={e => handleUpdateVariable(variable.id, { placeholder: e.target.value })}
              placeholder="输入提示"
              style={{ width: 200 }}
            />
          </div>

          {/* 类型特定配置 */}
          {variable.type === 'vocabulary' && (
            <div className={styles.variableRow}>
              <label>词汇类型：</label>
              <Select
                value={variable.vocabularyTypeId}
                onChange={id => handleUpdateVariable(variable.id, { vocabularyTypeId: id })}
                options={vocabularyTypes.map(t => ({ value: t.id, label: t.name }))}
                placeholder="选择词汇类型"
                style={{ width: 200 }}
              />
            </div>
          )}

          {variable.type === 'relationship' && (
            <div className={styles.variableRow}>
              <label>关系图：</label>
              <Select
                value={variable.graphId}
                onChange={id => handleUpdateVariable(variable.id, { graphId: id })}
                options={relationshipGraphs.map(g => ({ value: g.id, label: g.name }))}
                placeholder="选择关系图"
                style={{ width: 200 }}
              />
            </div>
          )}

          {variable.type === 'timeline' && (
            <div className={styles.variableRow}>
              <label>时间线：</label>
              <Select
                value={variable.timelineId}
                onChange={id => handleUpdateVariable(variable.id, { timelineId: id })}
                options={timelineList.map(t => ({ value: t.id, label: t.name }))}
                placeholder="选择时间线"
                style={{ width: 200 }}
              />
            </div>
          )}

          {(variable.type === 'select' || variable.type === 'multiselect') && (
            <div className={styles.variableRow}>
              <label>选项：</label>
              <Select
                mode="tags"
                value={variable.options}
                onChange={options => handleUpdateVariable(variable.id, { options })}
                placeholder="输入选项后按回车"
                style={{ width: 300 }}
              />
            </div>
          )}

          {variable.type === 'number' && (
            <div className={styles.variableRow}>
              <label>默认值：</label>
              <InputNumber
                value={variable.defaultValue as number}
                onChange={val => handleUpdateVariable(variable.id, { defaultValue: val })}
                style={{ width: 120 }}
              />
            </div>
          )}
        </div>
      </Card>
    )
  }

  // 预览渲染
  const previewContent = useMemo(() => {
    if (!previewMode || variables.length === 0) return content
    return resolveVariables(
      { ...currentTemplate, content, variables } as PromptTemplate,
      previewVariables
    )
  }, [previewMode, content, variables, previewVariables, currentTemplate, resolveVariables])

  return (
    <Layout className={styles.container}>
      <Header className={styles.header}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            返回
          </Button>
          <Divider type="vertical" />
          <Title level={4} style={{ margin: 0 }}>
            {currentTemplate ? `编辑模板: ${currentTemplate.name}` : '新建模板'}
          </Title>
        </Space>
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => setPreviewMode(!previewMode)}
            type={previewMode ? 'primary' : 'default'}
          >
            预览
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存
          </Button>
        </Space>
      </Header>

      <Layout style={{ flex: 1, overflow: 'hidden' }}>
        <Content className={styles.mainContent}>
          <div className={styles.formSection}>
            <Form form={form} layout="vertical">
              <div className={styles.formRow}>
                <Form.Item
                  name="name"
                  label="模板名称"
                  rules={[{ required: true, message: '请输入模板名称' }]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="模板名称" />
                </Form.Item>
                <Form.Item
                  name="category"
                  label="分类"
                  rules={[{ required: true, message: '请选择分类' }]}
                  style={{ width: 150 }}
                >
                  <Select options={CATEGORY_OPTIONS} />
                </Form.Item>
              </div>

              <Form.Item name="description" label="描述">
                <Input placeholder="模板描述" />
              </Form.Item>

              <Form.Item name="tags" label="标签">
                <Select mode="tags" placeholder="添加标签" />
              </Form.Item>
            </Form>
          </div>

          <Divider style={{ margin: '12px 0' }}>模板内容</Divider>

          <div className={styles.contentSection}>
            <TextArea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="在此编写提示词模板，使用 {{变量名}} 插入变量..."
              className={styles.contentEditor}
            />
          </div>

          {previewMode && (
            <div className={styles.previewSection}>
              <Title level={5}>预览结果</Title>
              <div className={styles.previewContent}>{previewContent}</div>
            </div>
          )}
        </Content>

        <Sider width={400} className={styles.variablesSider}>
          <div className={styles.variablesHeader}>
            <Title level={5}>
              <SettingOutlined /> 变量定义
            </Title>
            <Button type="primary" icon={<PlusOutlined />} size="small" onClick={handleAddVariable}>
              添加变量
            </Button>
          </div>

          <div className={styles.variablesList}>
            {variables.length === 0 ? (
              <Empty description="暂无变量" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              variables.map(renderVariableEditor)
            )}
          </div>

          <Divider />

          <div className={styles.apiConfigSection}>
            <Title level={5}>
              <SettingOutlined /> API 配置
            </Title>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>提供商</Text>
                <Select
                  style={{ width: '100%' }}
                  placeholder="默认使用全局设置"
                  allowClear
                  value={apiConfig.provider || undefined}
                  onChange={(value) => {
                    setApiConfig(prev => ({
                      ...prev,
                      provider: value as TemplateApiConfig['provider'],
                      model: undefined
                    }))
                  }}
                  options={PROVIDER_OPTIONS}
                />
              </div>
              {apiConfig.provider && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12 }}>模型</Text>
                  {availableModels.length > 0 ? (
                    <Select
                      style={{ width: '100%' }}
                      placeholder="选择模型"
                      allowClear
                      showSearch
                      value={apiConfig.model || undefined}
                      onChange={(value) => {
                        setApiConfig(prev => ({ ...prev, model: value }))
                      }}
                      options={availableModels.map(m => ({ value: m, label: m }))}
                    />
                  ) : (
                    <Input
                      placeholder="输入模型名称"
                      value={apiConfig.model || ''}
                      onChange={(e) => {
                        setApiConfig(prev => ({ ...prev, model: e.target.value }))
                      }}
                    />
                  )}
                </div>
              )}
              {apiConfig.provider && (
                <>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>温度 ({apiConfig.temperature ?? 0.7})</Text>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={0}
                      max={2}
                      step={0.1}
                      value={apiConfig.temperature ?? 0.7}
                      onChange={(value) => {
                        setApiConfig(prev => ({ ...prev, temperature: value ?? undefined }))
                      }}
                    />
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>最大 Token ({apiConfig.maxTokens ?? 2000})</Text>
                    <InputNumber
                      style={{ width: '100%' }}
                      min={100}
                      max={32000}
                      step={100}
                      value={apiConfig.maxTokens ?? 2000}
                      onChange={(value) => {
                        setApiConfig(prev => ({ ...prev, maxTokens: value ?? undefined }))
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {previewMode && variables.length > 0 && (
            <div className={styles.previewVariables}>
              <Title level={5}>预览变量值</Title>
              {variables.map(v => (
                <div key={v.id} className={styles.previewVariableItem}>
                  <label>{v.name}:</label>
                  <Input
                    placeholder={v.placeholder || `输入${v.name}`}
                    value={(previewVariables[v.id]?.value as string) || ''}
                    onChange={e =>
                      setPreviewVariables({
                        ...previewVariables,
                        [v.id]: { variableId: v.id, value: e.target.value }
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </Sider>
      </Layout>
    </Layout>
  )
}

export default TemplateEditor
