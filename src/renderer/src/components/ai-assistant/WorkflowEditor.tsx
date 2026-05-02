/**
 * 工作流编辑器组件（全屏模式）
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
  Empty,
  Popconfirm,
  Badge
} from 'antd'
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import type {
  PromptWorkflow,
  WorkflowStep,
  VariableDefinition,
  TemplateCategory
} from '@shared/ai-assistant'
import styles from './WorkflowEditor.module.css'

const { Header, Content } = Layout
const { Text, Title } = Typography

// 分类配置
const CATEGORY_OPTIONS: { value: TemplateCategory; label: string }[] = [
  { value: 'character', label: '人物塑造' },
  { value: 'plot', label: '情节设计' },
  { value: 'worldbuilding', label: '世界观构建' },
  { value: 'polishing', label: '润色修改' }
]

interface WorkflowEditorProps {
  workflowId?: string
  onBack: () => void
}

function WorkflowEditor({ workflowId, onBack }: WorkflowEditorProps): JSX.Element {
  const {
    workflows,
    currentWorkflow,
    templates,
    loadWorkflow,
    saveWorkflow,
    setCurrentWorkflow,
    loadTemplates,
    templatesLoaded
  } = useAiAssistantStore()

  const [form] = Form.useForm()
  const [steps, setSteps] = useState<WorkflowStep[]>([])
  const [globalVariables, setGlobalVariables] = useState<VariableDefinition[]>([])
  const [startStepId, setStartStepId] = useState<string>('')
  const [saving, setSaving] = useState(false)

  // 加载模板列表
  useEffect(() => {
    if (!templatesLoaded) {
      loadTemplates()
    }
  }, [templatesLoaded, loadTemplates])

  // 加载工作流数据
  useEffect(() => {
    if (workflowId) {
      const workflow = workflows.find(w => w.id === workflowId)
      if (workflow) {
        setCurrentWorkflow(workflow)
        form.setFieldsValue({
          name: workflow.name,
          description: workflow.description,
          category: workflow.category,
          tags: workflow.tags
        })
        setSteps(workflow.steps)
        setGlobalVariables(workflow.globalVariables)
        setStartStepId(workflow.startStepId)
      } else {
        loadWorkflow(workflowId)
      }
    } else {
      // 新建模式
      setCurrentWorkflow(null)
      form.resetFields()
      setSteps([])
      setGlobalVariables([])
      setStartStepId('')
    }
  }, [workflowId, workflows, form, loadWorkflow, setCurrentWorkflow])

  // 当 currentWorkflow 变化时更新表单
  useEffect(() => {
    if (currentWorkflow) {
      form.setFieldsValue({
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        category: currentWorkflow.category,
        tags: currentWorkflow.tags
      })
      setSteps(currentWorkflow.steps)
      setGlobalVariables(currentWorkflow.globalVariables)
      setStartStepId(currentWorkflow.startStepId)
    }
  }, [currentWorkflow, form])

  // 添加步骤
  const handleAddStep = () => {
    const newStep: WorkflowStep = {
      id: `step_${Date.now()}`,
      name: `步骤${steps.length + 1}`,
      templateId: '',
      autoExecute: false,
      saveOutput: true,
      outputVariableName: `输出${steps.length + 1}`,
      order: steps.length
    }
    setSteps([...steps, newStep])
    // 如果是第一个步骤，设为起始步骤
    if (steps.length === 0) {
      setStartStepId(newStep.id)
    }
  }

  // 更新步骤
  const handleUpdateStep = (id: string, updates: Partial<WorkflowStep>) => {
    setSteps(steps.map(s => (s.id === id ? { ...s, ...updates } : s)))
  }

  // 删除步骤
  const handleDeleteStep = (id: string) => {
    const newSteps = steps.filter(s => s.id !== id)
    setSteps(newSteps)
    // 如果删除的是起始步骤，重新设置
    if (startStepId === id && newSteps.length > 0) {
      setStartStepId(newSteps[0].id)
    }
  }

  // 移动步骤
  const handleMoveStep = (id: string, direction: 'up' | 'down') => {
    const index = steps.findIndex(s => s.id === id)
    if (index === -1) return

    const newSteps = [...steps]
    if (direction === 'up' && index > 0) {
      ;[newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]]
    } else if (direction === 'down' && index < steps.length - 1) {
      ;[newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]]
    }
    setSteps(newSteps.map((s, i) => ({ ...s, order: i })))
  }

  // 设置起始步骤
  const handleSetStartStep = (id: string) => {
    setStartStepId(id)
    message.success('已设为起始步骤')
  }

  // 添加分支
  // 添加全局变量
  const handleAddGlobalVariable = () => {
    const newVariable: VariableDefinition = {
      id: `gv_${Date.now()}`,
      name: `全局变量${globalVariables.length + 1}`,
      key: `全局变量${globalVariables.length + 1}`,
      type: 'text',
      required: false,
      order: globalVariables.length
    }
    setGlobalVariables([...globalVariables, newVariable])
  }

  // 更新全局变量
  const handleUpdateGlobalVariable = (id: string, updates: Partial<VariableDefinition>) => {
    setGlobalVariables(globalVariables.map(v => (v.id === id ? { ...v, ...updates } : v)))
  }

  // 删除全局变量
  const handleDeleteGlobalVariable = (id: string) => {
    setGlobalVariables(globalVariables.filter(v => v.id !== id))
  }

  // 保存工作流
  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setSaving(true)

      // 验证至少有一个步骤
      if (steps.length === 0) {
        message.error('请至少添加一个步骤')
        setSaving(false)
        return
      }

      // 验证起始步骤
      if (!startStepId && steps.length > 0) {
        setStartStepId(steps[0].id)
      }

      const workflow: Omit<PromptWorkflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string } = {
        id: currentWorkflow?.id,
        name: values.name,
        description: values.description,
        category: values.category,
        tags: values.tags || [],
        steps: steps.map((s, index) => ({ ...s, order: index })),
        startStepId: startStepId || steps[0]?.id,
        globalVariables: globalVariables.map((v, index) => ({ ...v, order: index })),
        isBuiltIn: false,
        source: 'project',
        order: currentWorkflow?.order || 0
      }

      await saveWorkflow(workflow)
      message.success('保存成功')
      onBack()
    } catch (error) {
      console.error('Save failed:', error)
      message.error('保存失败')
    } finally {
      setSaving(false)
    }
  }

  // 可选择的步骤选项（用于分支目标）
  const stepOptions = useMemo(() => {
    return steps.map(s => ({
      value: s.id,
      label: s.name
    }))
  }, [steps])

  // 可选择的模板选项
  const templateOptions = useMemo(() => {
    return templates.map(t => ({
      value: t.id,
      label: t.name
    }))
  }, [templates])

  // 渲染步骤卡片
  const renderStepCard = (step: WorkflowStep, index: number) => {
    const template = templates.find(t => t.id === step.templateId)
    const isStartStep = step.id === startStepId

    return (
      <Card
        key={step.id}
        size="small"
        className={styles.stepCard}
        title={
          <Space>
            <Badge status={isStartStep ? 'success' : 'default'} />
            <Text strong>{step.name}</Text>
            {isStartStep && <Tag color="green">起始</Tag>}
          </Space>
        }
        extra={
          <Space>
            <Tooltip title="上移">
              <Button
                type="text"
                size="small"
                icon={<ArrowUpOutlined />}
                disabled={index === 0}
                onClick={() => handleMoveStep(step.id, 'up')}
              />
            </Tooltip>
            <Tooltip title="下移">
              <Button
                type="text"
                size="small"
                icon={<ArrowDownOutlined />}
                disabled={index === steps.length - 1}
                onClick={() => handleMoveStep(step.id, 'down')}
              />
            </Tooltip>
            {!isStartStep && (
              <Tooltip title="设为起始步骤">
                <Button
                  type="text"
                  size="small"
                  icon={<PlayCircleOutlined />}
                  onClick={() => handleSetStartStep(step.id)}
                />
              </Tooltip>
            )}
            <Popconfirm title="确定删除此步骤？" onConfirm={() => handleDeleteStep(step.id)}>
              <Button type="text" size="small" icon={<DeleteOutlined />} danger />
            </Popconfirm>
          </Space>
        }
      >
        <div className={styles.stepForm}>
          <div className={styles.stepRow}>
            <label>步骤名称：</label>
            <Input
              value={step.name}
              onChange={e => handleUpdateStep(step.id, { name: e.target.value })}
              placeholder="步骤名称"
              style={{ flex: 1 }}
            />
          </div>

          <div className={styles.stepRow}>
            <label>关联模板：</label>
            <Select
              value={step.templateId}
              onChange={templateId => handleUpdateStep(step.id, { templateId })}
              options={templateOptions}
              placeholder="选择提示词模板"
              style={{ flex: 1 }}
              allowClear
            />
          </div>

          {template && (
            <div className={styles.stepRow}>
              <label>模板信息：</label>
              <Space>
                <Tag color="blue">{template.name}</Tag>
                <Text type="secondary">{template.variables.length} 个变量</Text>
              </Space>
            </div>
          )}

          <div className={styles.stepRow}>
            <label>自动执行：</label>
            <Switch
              checked={step.autoExecute}
              onChange={checked => handleUpdateStep(step.id, { autoExecute: checked })}
            />
            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
              无需用户确认自动执行
            </Text>
          </div>

          <div className={styles.stepRow}>
            <label>保存输出：</label>
            <Switch
              checked={step.saveOutput}
              onChange={checked => handleUpdateStep(step.id, { saveOutput: checked })}
            />
            {step.saveOutput && (
              <Input
                value={step.outputVariableName}
                onChange={e => handleUpdateStep(step.id, { outputVariableName: e.target.value })}
                placeholder="变量名"
                style={{ width: 150, marginLeft: 8 }}
                addonBefore="{{"
                addonAfter="}}"
              />
            )}
          </div>

          {/* 默认下一步 */}
          <div className={styles.stepRow}>
            <label>默认下一步：</label>
            <Select
              value={step.nextStepId}
              onChange={nextStepId => handleUpdateStep(step.id, { nextStepId })}
              options={[
                { value: '', label: '无（结束）' },
                ...stepOptions.filter(o => o.value !== step.id)
              ]}
              placeholder="选择下一步"
              style={{ flex: 1 }}
              allowClear
            />
          </div>
        </div>
      </Card>
    )
  }

  // 渲染全局变量卡片
  const renderGlobalVariableCard = (variable: VariableDefinition) => {
    return (
      <Card
        key={variable.id}
        size="small"
        className={styles.variableCard}
        title={
          <Space>
            <Tag color="purple">全局变量</Tag>
            <Text strong>{variable.name}</Text>
          </Space>
        }
        extra={
          <Popconfirm
            title="确定删除此变量？"
            onConfirm={() => handleDeleteGlobalVariable(variable.id)}
          >
            <Button type="text" size="small" icon={<DeleteOutlined />} danger />
          </Popconfirm>
        }
      >
        <div className={styles.variableForm}>
          <div className={styles.stepRow}>
            <label>变量名：</label>
            <Input
              value={variable.name}
              onChange={e => handleUpdateGlobalVariable(variable.id, { name: e.target.value })}
              placeholder="显示名称"
              style={{ width: 120 }}
            />
          </div>
          <div className={styles.stepRow}>
            <label>引用键：</label>
            <Input
              value={variable.key}
              onChange={e => handleUpdateGlobalVariable(variable.id, { key: e.target.value })}
              placeholder="用于 {{key}} 引用"
              style={{ width: 120 }}
              addonBefore="{{"
              addonAfter="}}"
            />
          </div>
          <div className={styles.stepRow}>
            <label>类型：</label>
            <Select
              value={variable.type}
              onChange={type => handleUpdateGlobalVariable(variable.id, { type })}
              options={[
                { value: 'text', label: '文本' },
                { value: 'textarea', label: '多行文本' },
                { value: 'vocabulary', label: '词汇条目' },
                { value: 'select', label: '单选' },
                { value: 'multiselect', label: '多选' },
                { value: 'number', label: '数字' }
              ]}
              style={{ width: 150 }}
            />
          </div>
          <div className={styles.stepRow}>
            <label>必填：</label>
            <Switch
              checked={variable.required}
              onChange={checked => handleUpdateGlobalVariable(variable.id, { required: checked })}
            />
          </div>
        </div>
      </Card>
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
            {currentWorkflow ? `编辑工作流: ${currentWorkflow.name}` : '新建工作流'}
          </Title>
        </Space>
        <Space>
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
                  label="工作流名称"
                  rules={[{ required: true, message: '请输入工作流名称' }]}
                  style={{ flex: 1 }}
                >
                  <Input placeholder="工作流名称" />
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
                <Input placeholder="工作流描述" />
              </Form.Item>

              <Form.Item name="tags" label="标签">
                <Select mode="tags" placeholder="添加标签" />
              </Form.Item>
            </Form>
          </div>

          <Divider style={{ margin: '12px 0' }}>步骤配置</Divider>

          <div className={styles.stepsSection}>
            {steps.length === 0 ? (
              <Empty description="暂无步骤" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              steps.map((step, index) => renderStepCard(step, index))
            )}

            <Button
              type="dashed"
              icon={<PlusOutlined />}
              onClick={handleAddStep}
              style={{ marginTop: 16 }}
            >
              添加步骤
            </Button>
          </div>
        </Content>

        <div className={styles.rightSider}>
          <div className={styles.siderHeader}>
            <Title level={5}>
              <SettingOutlined /> 全局变量
            </Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              size="small"
              onClick={handleAddGlobalVariable}
            >
              添加
            </Button>
          </div>

          <div className={styles.siderContent}>
            {globalVariables.length === 0 ? (
              <Empty description="暂无全局变量" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              globalVariables.map(renderGlobalVariableCard)
            )}
          </div>
        </div>
      </Layout>
    </Layout>
  )
}

export default WorkflowEditor
