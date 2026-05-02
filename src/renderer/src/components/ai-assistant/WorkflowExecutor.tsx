/**
 * 工作流执行器组件
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Modal,
  Input,
  Button,
  Select,
  Space,
  Typography,
  Result,
  Spin,
  message,
  Tag,
  Divider,
  Tabs
} from 'antd'
import {
  PlayCircleOutlined,
  CopyOutlined,
  LoadingOutlined,
  FileTextOutlined,
  InsertRowBelowOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ToolOutlined
} from '@ant-design/icons'
import { useAiAssistantStore } from '@stores/aiAssistantStore'
import { useVocabularyStore } from '@stores/vocabularyStore'
import { useEditorStore } from '@stores/editorStore'
import { useProjectStore } from '@stores/projectStore'
import type {
  PromptTemplate,
  VariableDefinition,
  VariableValue,
  WorkflowStep,
  AiApiCallResult,
  AiApiStreamChunk,
  SkillDefinition,
  SkillExecutionResult,
  SkillExecutionContext
} from '@shared/ai-assistant'
import styles from './WorkflowExecutor.module.css'

/**
 * SKILL 变量输入组件
 */
interface SkillVariableInputProps {
  variable: VariableDefinition
  value: string
  onChange: (value: string, result?: unknown) => void
  skills: SkillDefinition[]
  onExecuteSkill: (
    skillId: string,
    params: Record<string, unknown>
  ) => Promise<SkillExecutionResult>
}

function SkillVariableInput({
  variable,
  onChange,
  skills,
  onExecuteSkill
}: SkillVariableInputProps): JSX.Element {
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState<SkillExecutionResult | null>(null)

  const skill = skills.find(s => s.id === variable.skillId)

  const handleExecute = async () => {
    if (!skill) return

    setExecuting(true)
    try {
      const params = variable.skillParams || {}
      const execResult = await onExecuteSkill(skill.id, params)
      setResult(execResult)
      if (execResult.success) {
        // 将结果转换为字符串
        const resultStr =
          typeof execResult.data === 'string'
            ? execResult.data
            : JSON.stringify(execResult.data, null, 2)
        onChange(resultStr, execResult)
      }
    } finally {
      setExecuting(false)
    }
  }

  if (!skill) {
    return (
      <div className={styles.skillError}>
        <Text type="secondary">未找到指定的 SKILL: {variable.skillId}</Text>
      </div>
    )
  }

  return (
    <div className={styles.skillVariableContainer}>
      <div className={styles.skillHeader}>
        <Space>
          <ToolOutlined />
          <Text strong>{skill.name}</Text>
        </Space>
        <Button type="primary" size="small" loading={executing} onClick={handleExecute}>
          执行
        </Button>
      </div>
      {skill.description && (
        <Text type="secondary" style={{ fontSize: 12 }}>
          {skill.description}
        </Text>
      )}
      {result && (
        <div className={styles.skillResult}>
          <div className={styles.skillResultHeader}>
            <Text type="secondary">执行结果:</Text>
            {result.success ? <Tag color="success">成功</Tag> : <Tag color="error">失败</Tag>}
          </div>
          {result.message && <Text>{result.message}</Text>}
          {result.error && <Text type="danger">{result.error}</Text>}
        </div>
      )}
    </div>
  )
}

const { TextArea } = Input
const { Text, Title, Paragraph } = Typography

interface WorkflowExecutorProps {
  workflowId?: string
  templateId?: string
  open: boolean
  onClose: () => void
}

type ExecutionStatus = 'input' | 'executing' | 'success' | 'error'

function WorkflowExecutor({
  workflowId,
  templateId,
  open,
  onClose
}: WorkflowExecutorProps): JSX.Element {
  const {
    workflows,
    templates,
    currentExecution,
    skills,
    cancelExecution,
    callApi,
    callApiStream,
    streamingContent,
    isStreaming,
    onStreamChunk,
    removeStreamChunkListener,
    resolveVariables,
    executeSkill
  } = useAiAssistantStore()

  const { entries: vocabularyEntries } = useVocabularyStore()
  const getActiveTab = useEditorStore(state => state.getActiveTab)
  const getCurrentContent = useEditorStore(state => state.getCurrentContent)
  const currentProject = useProjectStore(state => state.currentProject)

  // 执行状态
  const [status, setStatus] = useState<ExecutionStatus>('input')
  const [error, setError] = useState<string | null>(null)
  const [variableValues, setVariableValues] = useState<Record<string, VariableValue>>({})
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [apiResult, setApiResult] = useState<AiApiCallResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [localStreamContent, setLocalStreamContent] = useState('')

  // 获取当前工作流或模板
  const currentWorkflow = useMemo(
    () => workflows.find(w => w.id === workflowId),
    [workflows, workflowId]
  )
  const currentTemplate = useMemo(
    () => templates.find(t => t.id === templateId),
    [templates, templateId]
  )

  // 当前步骤（工作流模式）
  const currentStep: WorkflowStep | null = useMemo(() => {
    if (!currentWorkflow || !currentExecution) return null
    return currentWorkflow.steps.find(s => s.id === currentExecution.currentStepId) || null
  }, [currentWorkflow, currentExecution])

  // 当前步骤的模板
  const currentStepTemplate: PromptTemplate | null = useMemo(() => {
    if (!currentStep) return null
    return templates.find(t => t.id === currentStep.templateId) || null
  }, [currentStep, templates])

  // 当前使用的变量定义
  const activeVariables: VariableDefinition[] = useMemo(() => {
    if (currentWorkflow && currentStepTemplate) {
      return [...currentWorkflow.globalVariables, ...currentStepTemplate.variables]
    }
    return currentTemplate?.variables || []
  }, [currentWorkflow, currentStepTemplate, currentTemplate])

  // 重置状态
  useEffect(() => {
    if (open) {
      setStatus('input')
      setError(null)
      setVariableValues({})
      setGeneratedPrompt('')
      setApiResult(null)
      setLoading(false)
      // 如果没有变量，默认展开预览
      setShowPreview(activeVariables.length === 0)
    }
  }, [open, activeVariables.length])

  const requestInsertContent = useEditorStore(state => state.requestInsertContent)

  // 实时生成预览提示词
  const previewPrompt = useMemo(() => {
    const template = currentStepTemplate || currentTemplate
    if (!template || !template.content) return ''
    return resolveVariables(template, variableValues)
  }, [currentStepTemplate, currentTemplate, variableValues, resolveVariables])

  // 清理流式监听器
  useEffect(() => {
    return () => {
      removeStreamChunkListener()
    }
  }, [removeStreamChunkListener])

  // 处理变量值变化
  const handleVariableChange = (
    variableId: string,
    value: VariableValue['value'],
    entryData?: unknown
  ) => {
    setVariableValues(prev => ({
      ...prev,
      [variableId]: {
        variableId,
        value,
        entryData: entryData as Record<string, unknown> | undefined
      }
    }))
  }

  // 执行 SKILL 变量
  const executeSkillForVariable = async (
    skillId: string,
    params: Record<string, unknown>
  ): Promise<SkillExecutionResult> => {
    const activeTab = getActiveTab()
    const currentContent = getCurrentContent()
    const context: SkillExecutionContext = {
      projectPath: currentProject?.path || '',
      currentChapter: activeTab
        ? {
            path: activeTab.path,
            content: currentContent || ''
          }
        : undefined,
      selectedText: undefined,
      variables: variableValues
    }
    return executeSkill(skillId, params, context)
  }

  // 渲染变量输入
  const renderVariableInput = (variable: VariableDefinition) => {
    const currentValue = variableValues[variable.id]?.value

    switch (variable.type) {
      case 'text':
        return (
          <Input
            placeholder={variable.placeholder || `请输入${variable.name}`}
            value={currentValue as string}
            onChange={e => handleVariableChange(variable.id, e.target.value)}
          />
        )

      case 'textarea':
        return (
          <TextArea
            rows={3}
            placeholder={variable.placeholder || `请输入${variable.name}`}
            value={currentValue as string}
            onChange={e => handleVariableChange(variable.id, e.target.value)}
          />
        )

      case 'vocabulary': {
        const filteredEntries = variable.vocabularyTypeId
          ? vocabularyEntries.filter(e => e.typeId === variable.vocabularyTypeId)
          : vocabularyEntries
        return (
          <Select
            showSearch
            placeholder={variable.placeholder || `选择${variable.name}`}
            value={currentValue as string}
            onChange={val => {
              const entry = filteredEntries.find(e => e.id === val)
              handleVariableChange(
                variable.id,
                val,
                entry ? { name: entry.name, ...entry.fields } : undefined
              )
            }}
            filterOption={(input, option) =>
              (option?.label as string)?.toLowerCase().includes(input.toLowerCase())
            }
            options={filteredEntries.map(e => ({ value: e.id, label: e.name }))}
          />
        )
      }

      case 'chapter': {
        const activeTab = getActiveTab()
        const currentContent = getCurrentContent()
        return (
          <div>
            <Tag color="blue">{activeTab?.name || '当前章节'}</Tag>
            <Button
              size="small"
              onClick={() => handleVariableChange(variable.id, currentContent || '')}
            >
              使用当前内容
            </Button>
          </div>
        )
      }

      case 'selection':
        return (
          <TextArea
            rows={3}
            placeholder="选中的文本将显示在这里"
            value={currentValue as string}
            onChange={e => handleVariableChange(variable.id, e.target.value)}
          />
        )

      case 'select':
        return (
          <Select
            placeholder={variable.placeholder || `选择${variable.name}`}
            value={currentValue as string}
            onChange={val => handleVariableChange(variable.id, val)}
            options={variable.options?.map(o => ({ value: o, label: o }))}
          />
        )

      case 'multiselect':
        return (
          <Select
            mode="multiple"
            placeholder={variable.placeholder || `选择${variable.name}`}
            value={currentValue as string[]}
            onChange={val => handleVariableChange(variable.id, val)}
            options={variable.options?.map(o => ({ value: o, label: o }))}
          />
        )

      case 'number':
        return (
          <Input
            type="number"
            placeholder={variable.placeholder || `请输入${variable.name}`}
            value={currentValue as number}
            onChange={e => handleVariableChange(variable.id, Number(e.target.value))}
          />
        )

      case 'skill':
        // SKILL 变量类型：执行 SKILL 并使用结果
        return (
          <SkillVariableInput
            variable={variable}
            value={currentValue as string}
            onChange={(val, result) => handleVariableChange(variable.id, val, result)}
            skills={skills}
            onExecuteSkill={executeSkillForVariable}
          />
        )

      default:
        return (
          <Input
            placeholder={variable.placeholder || `请输入${variable.name}`}
            value={currentValue as string}
            onChange={e => handleVariableChange(variable.id, e.target.value)}
          />
        )
    }
  }
  const generatePrompt = (): string => {
    const template = currentStepTemplate || currentTemplate
    if (!template) return ''

    return resolveVariables(template, variableValues)
  }

  // 执行 API 调用
  // 开始执行
  const handleExecute = async () => {
    const missingVariables = activeVariables.filter(v => v.required && !variableValues[v.id]?.value)
    if (missingVariables.length > 0) {
      message.error(`请填写必填变量: ${missingVariables.map(v => v.name).join(', ')}`)
      return
    }

    setLoading(true)
    setStatus('executing')
    setLocalStreamContent('')

    try {
      const prompt = generatePrompt()
      setGeneratedPrompt(prompt)

      const template = currentStepTemplate || currentTemplate
      const apiConfig = template?.apiConfig
      const streamOptions = {
        provider: apiConfig?.provider,
        model: apiConfig?.model,
        temperature: apiConfig?.temperature,
        maxTokens: apiConfig?.maxTokens,
        systemPrompt: apiConfig?.systemPrompt
      }

      const streamChunkHandler = (chunk: AiApiStreamChunk) => {
        if (chunk.type === 'chunk' && chunk.content) {
          setLocalStreamContent(prev => prev + chunk.content)
        }
      }
      onStreamChunk(streamChunkHandler)

      const result = await callApiStream(prompt, streamOptions)
      removeStreamChunkListener()

      setApiResult(result)

      if (result.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(result.error || 'API 调用失败')
      }
    } catch (err) {
      removeStreamChunkListener()
      setStatus('error')
      setError(err instanceof Error ? err.message : '执行失败')
    } finally {
      setLoading(false)
    }
  }

  // 复制结果
  const handleCopyResult = () => {
    if (apiResult?.content) {
      navigator.clipboard.writeText(apiResult.content)
      message.success('已复制到剪贴板')
    }
  }

  // 复制预览提示词
  const handleCopyPrompt = () => {
    if (previewPrompt) {
      navigator.clipboard.writeText(previewPrompt)
      message.success('提示词已复制到剪贴板')
    }
  }

  // 插入到编辑器
  const handleInsertToEditor = () => {
    const content = apiResult?.content || localStreamContent
    if (!content) {
      message.warning('没有可插入的内容')
      return
    }
    requestInsertContent(content)
    message.success('已插入到编辑器')
    onClose()
  }

  // 关闭时清理
  const handleClose = () => {
    if (status === 'executing') {
      cancelExecution()
    }
    onClose()
  }

  // 渲染输入阶段
  const renderInputPhase = () => (
    <div className={styles.inputPhase}>
      {activeVariables.length === 0 ? (
        <div className={styles.noVariables}>
          <Text type="secondary">此模板没有变量，可以直接执行</Text>
        </div>
      ) : (
        <div className={styles.variablesForm}>
          {activeVariables.map(variable => (
            <div key={variable.id} className={styles.variableItem}>
              <label className={styles.variableLabel}>
                {variable.name}
                {variable.required && (
                  <Tag color="red" style={{ marginLeft: 4 }}>
                    必填
                  </Tag>
                )}
              </label>
              {renderVariableInput(variable)}
            </div>
          ))}
        </div>
      )}

      {/* 提示词预览区域 */}
      <div className={styles.previewSection}>
        <div className={styles.previewHeader} onClick={() => setShowPreview(!showPreview)}>
          <Space>
            {showPreview ? <EyeInvisibleOutlined /> : <EyeOutlined />}
            <Text strong>预览提示词</Text>
          </Space>
          <Button
            type="text"
            size="small"
            icon={<CopyOutlined />}
            onClick={e => {
              e.stopPropagation()
              handleCopyPrompt()
            }}
          >
            复制
          </Button>
        </div>
        {showPreview && (
          <div className={styles.previewContent}>
            <Paragraph
              style={{
                whiteSpace: 'pre-wrap',
                margin: 0,
                fontSize: 13
              }}
            >
              {previewPrompt || (
                <Text type="secondary">
                  {activeVariables.length === 0 ? '模板内容为空' : '填写变量后将显示提示词预览...'}
                </Text>
              )}
            </Paragraph>
          </div>
        )}
      </div>

      <Divider />

      <div className={styles.actions}>
        <Button onClick={handleClose}>取消</Button>
        <Button
          type="primary"
          icon={<PlayCircleOutlined />}
          loading={loading}
          onClick={handleExecute}
        >
          执行
        </Button>
      </div>
    </div>
  )

  // 渲染执行阶段
  const renderExecutingPhase = () => (
    <div className={styles.executingPhase}>
      <Spin indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />} />
      <Title level={4}>正在调用 AI...</Title>
      {localStreamContent && (
        <div className={styles.streamingContent}>
          <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{localStreamContent}</Paragraph>
        </div>
      )}
      {!localStreamContent && <Text type="secondary">这可能需要几秒钟</Text>}
    </div>
  )

  // 渲染成功阶段
  const renderSuccessPhase = () => (
    <div className={styles.successPhase}>
      <Result status="success" title="执行成功" subTitle={`耗时 ${apiResult?.duration || 0}ms`} />

      <Tabs
        defaultActiveKey="result"
        items={[
          {
            key: 'result',
            label: (
              <span>
                <FileTextOutlined />
                结果
              </span>
            ),
            children: (
              <div className={styles.resultContent}>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{apiResult?.content}</Paragraph>
              </div>
            )
          },
          {
            key: 'prompt',
            label: (
              <span>
                <InsertRowBelowOutlined />
                提示词
              </span>
            ),
            children: (
              <div className={styles.promptContent}>
                <Paragraph style={{ whiteSpace: 'pre-wrap' }}>{generatedPrompt}</Paragraph>
              </div>
            )
          }
        ]}
      />

      <div className={styles.actions}>
        <Button onClick={() => setStatus('input')}>重新执行</Button>
        <Button icon={<CopyOutlined />} onClick={handleCopyResult}>
          复制结果
        </Button>
        <Button type="primary" onClick={handleInsertToEditor}>
          插入到编辑器
        </Button>
      </div>
    </div>
  )

  // 渲染错误阶段
  const renderErrorPhase = () => (
    <div className={styles.errorPhase}>
      <Result status="error" title="执行失败" subTitle={error} />
      <div className={styles.actions}>
        <Button onClick={handleClose}>关闭</Button>
        <Button type="primary" onClick={() => setStatus('input')}>
          重试
        </Button>
      </div>
    </div>
  )

  // 渲染当前阶段
  const renderCurrentPhase = () => {
    switch (status) {
      case 'input':
        return renderInputPhase()
      case 'executing':
        return renderExecutingPhase()
      case 'success':
        return renderSuccessPhase()
      case 'error':
        return renderErrorPhase()
      default:
        return null
    }
  }

  return (
    <Modal
      title={
        <Space>
          <PlayCircleOutlined />
          {currentWorkflow
            ? `执行工作流: ${currentWorkflow.name}`
            : currentTemplate
              ? `执行模板: ${currentTemplate.name}`
              : '执行'}
        </Space>
      }
      open={open}
      onCancel={handleClose}
      footer={null}
      width={700}
      className={styles.executorModal}
    >
      {renderCurrentPhase()}
    </Modal>
  )
}

export default WorkflowExecutor
