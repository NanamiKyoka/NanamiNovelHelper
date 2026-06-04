/**
 * AI 写作助手状态管理
 */

import { create } from 'zustand'
import type {
  PromptTemplate,
  PromptWorkflow,
  WorkflowExecution,
  TemplateListItem,
  WorkflowListItem,
  VariableValue,
  AiApiCallOptions,
  AiApiCallResult,
  AiApiStreamChunk,
  ChatSession,
  ChatSessionSummary,
  AnyAgentEvent,
  AgentSession,
  ToolCallRecord
} from '@shared/ai-assistant'

interface AiAssistantState {
  // 模板状态
  templates: PromptTemplate[]
  templateList: TemplateListItem[]
  currentTemplate: PromptTemplate | null
  templatesLoaded: boolean

  // 工作流状态
  workflows: PromptWorkflow[]
  workflowList: WorkflowListItem[]
  currentWorkflow: PromptWorkflow | null
  workflowsLoaded: boolean

  // 执行状态
  currentExecution: WorkflowExecution | null
  executionHistory: WorkflowExecution[]

  // UI 状态
  isLoading: boolean
  isExecuting: boolean
  error: string | null
  activeTab: 'templates' | 'workflows' | 'history'

  // 会话状态
  sessions: ChatSessionSummary[]
  currentSessionId: string | null
  sessionsLoaded: boolean

  // Agent 状态
  agentEvents: AnyAgentEvent[]
  agentSessions: AgentSession[]
  currentAgentSessionId: string | null
  agentToolCalls: Map<string, ToolCallRecord[]>

  // 模板操作
  loadTemplates: () => Promise<void>
  loadTemplate: (id: string) => Promise<void>
  saveTemplate: (
    template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<PromptTemplate>
  deleteTemplate: (id: string) => Promise<void>
  copyTemplateToProject: (id: string) => Promise<void>
  exportTemplate: (id: string) => Promise<string | null>
  importTemplate: (json5Content: string) => Promise<PromptTemplate | null>

  // 工作流操作
  loadWorkflows: () => Promise<void>
  loadWorkflow: (id: string) => Promise<void>
  saveWorkflow: (
    workflow: Omit<PromptWorkflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => Promise<PromptWorkflow>
  deleteWorkflow: (id: string) => Promise<void>
  exportWorkflow: (id: string) => Promise<string | null>
  importWorkflow: (json5Content: string) => Promise<PromptWorkflow | null>

  // 执行操作
  startWorkflow: (workflowId: string) => Promise<void>
  getExecution: (id: string) => Promise<void>
  updateExecution: (id: string, updates: Partial<WorkflowExecution>) => Promise<void>
  completeStep: (stepId: string, output: string) => Promise<void>
  cancelExecution: () => Promise<void>
  loadExecutionHistory: () => Promise<void>
  deleteExecution: (id: string) => Promise<void>

  // API 调用
  callApi: (prompt: string, options?: AiApiCallOptions) => Promise<AiApiCallResult>
  callApiStream: (prompt: string, options?: AiApiCallOptions) => Promise<AiApiCallResult>
  streamingContent: string
  isStreaming: boolean
  onStreamChunk: (callback: (chunk: AiApiStreamChunk) => void) => void
  removeStreamChunkListener: () => void
  testApiConnection: (
    provider: string
  ) => Promise<{ success: boolean; error?: string }>
  getAvailableModels: (provider: string) => Promise<string[]>

  // 会话操作
  loadSessions: () => Promise<void>
  saveSession: (session: ChatSession) => Promise<ChatSession | null>
  deleteSession: (id: string) => Promise<void>
  createSession: () => Promise<ChatSession>
  switchSession: (id: string) => Promise<ChatSession | null>

  // Agent 操作
  runAgent: (userIntent: string, content: string) => Promise<void>
  stopAgent: () => Promise<void>
  onAgentEvent: (callback: (event: AnyAgentEvent) => void) => (() => void)
  createAgentSession: () => Promise<AgentSession>
  getAgentSession: (id: string) => Promise<AgentSession | null>
  addAgentEvent: (event: AnyAgentEvent) => void
  clearAgentEvents: () => void

  // 变量解析
  resolveVariables: (template: PromptTemplate, variables: Record<string, VariableValue>) => string

  // UI 操作
  setActiveTab: (tab: 'templates' | 'workflows' | 'history') => void
  setCurrentTemplate: (template: PromptTemplate | null) => void
  setCurrentWorkflow: (workflow: PromptWorkflow | null) => void
  clearError: () => void
  clearData: () => void
}

export const useAiAssistantStore = create<AiAssistantState>((set, get) => ({
  // 初始状态
  templates: [],
  templateList: [],
  currentTemplate: null,
  templatesLoaded: false,

  workflows: [],
  workflowList: [],
  currentWorkflow: null,
  workflowsLoaded: false,

  currentExecution: null,
  executionHistory: [],

  isLoading: false,
  isExecuting: false,
  isStreaming: false,
  streamingContent: '',
  error: null,
  activeTab: 'templates',
  sessions: [],
  currentSessionId: null,
  sessionsLoaded: false,

  // Agent 状态
  agentEvents: [],
  agentSessions: [],
  currentAgentSessionId: null,
  agentToolCalls: new Map(),

  // 模板操作
  loadTemplates: async () => {
    set({ isLoading: true, error: null })
    try {
      const templates = await window.api.aiAssistant.listTemplates()
      set({
        templateList: templates.map((t: Record<string, unknown>) => ({ id: t.id, name: t.name, description: t.description, category: t.category })),
        templates,
        templatesLoaded: true,
        isLoading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载模板失败'
      console.error('Failed to load templates:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  loadTemplate: async (id: string) => {
    try {
      const template = await window.api.aiAssistant.getTemplate(id)
      set({ currentTemplate: template })
    } catch (error) {
      console.error('Failed to load template:', error)
      throw error
    }
  },

  saveTemplate: async template => {
    try {
      const saved = template.id
        ? await window.api.aiAssistant.updateTemplate(template.id, template)
        : await window.api.aiAssistant.createTemplate(template)
      set(state => {
        const existingIndex = state.templates.findIndex(t => t.id === saved.id)
        const newTemplates =
          existingIndex >= 0
            ? state.templates.map(t => (t.id === saved.id ? saved : t))
            : [...state.templates, saved]
        return {
          templates: newTemplates,
          currentTemplate: saved
        }
      })
      const templateList = await window.api.aiAssistant.listTemplates()
      set({ templateList: templateList.map((t: Record<string, unknown>) => ({ id: t.id, name: t.name, description: t.description, category: t.category })) })
      return saved
    } catch (error) {
      console.error('Failed to save template:', error)
      throw error
    }
  },

  deleteTemplate: async (id: string) => {
    try {
      await window.api.aiAssistant.deleteTemplate(id)
      set(state => ({
        templates: state.templates.filter(t => t.id !== id),
        templateList: state.templateList.filter(t => t.id !== id),
        currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate
      }))
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw error
    }
  },

  copyTemplateToProject: async (id: string) => {
    try {
      const template = await window.api.aiAssistant.getTemplate(id)
      if (template) {
        const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = template as Record<string, unknown>
        const newTemplate = await window.api.aiAssistant.createTemplate({ ...rest, name: `${(template as Record<string, unknown>).name} (副本)` })
        set(state => ({
          templates: [...state.templates, newTemplate],
          currentTemplate: newTemplate
        }))
      }
    } catch (error) {
      console.error('Failed to copy template to project:', error)
      throw error
    }
  },

  exportTemplate: async (id: string) => {
    try {
      const template = await window.api.aiAssistant.getTemplate(id)
      return template ? JSON.stringify(template, null, 2) : null
    } catch (error) {
      console.error('Failed to export template:', error)
      throw error
    }
  },

  importTemplate: async (json5Content: string) => {
    try {
      const parsed = JSON.parse(json5Content)
      const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = parsed
      const template = await window.api.aiAssistant.createTemplate(rest)
      if (template) {
        set(state => ({
          templates: [...state.templates, template]
        }))
        const templateList = await window.api.aiAssistant.listTemplates()
        set({ templateList: templateList.map((t: Record<string, unknown>) => ({ id: t.id, name: t.name, description: t.description, category: t.category })) })
      }
      return template
    } catch (error) {
      console.error('Failed to import template:', error)
      throw error
    }
  },

  // 工作流操作
  loadWorkflows: async () => {
    set({ isLoading: true, error: null })
    try {
      const workflows = await window.api.aiAssistant.listWorkflows()
      set({
        workflowList: workflows.map((w: Record<string, unknown>) => ({ id: w.id, name: w.name, description: w.description })),
        workflows,
        workflowsLoaded: true,
        isLoading: false,
        error: null
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '加载工作流失败'
      console.error('Failed to load workflows:', error)
      set({ isLoading: false, error: errorMessage })
    }
  },

  loadWorkflow: async (id: string) => {
    try {
      const workflow = await window.api.aiAssistant.getWorkflow(id)
      set({ currentWorkflow: workflow })
    } catch (error) {
      console.error('Failed to load workflow:', error)
      throw error
    }
  },

  saveWorkflow: async workflow => {
    try {
      const saved = workflow.id
        ? await window.api.aiAssistant.updateWorkflow(workflow.id, workflow)
        : await window.api.aiAssistant.createWorkflow(workflow)
      set(state => {
        const existingIndex = state.workflows.findIndex(w => w.id === saved.id)
        const newWorkflows =
          existingIndex >= 0
            ? state.workflows.map(w => (w.id === saved.id ? saved : w))
            : [...state.workflows, saved]
        return {
          workflows: newWorkflows,
          currentWorkflow: saved
        }
      })
      const workflowList = await window.api.aiAssistant.listWorkflows()
      set({ workflowList: workflowList.map((w: Record<string, unknown>) => ({ id: w.id, name: w.name, description: w.description })) })
      return saved
    } catch (error) {
      console.error('Failed to save workflow:', error)
      throw error
    }
  },

  deleteWorkflow: async (id: string) => {
    try {
      await window.api.aiAssistant.deleteWorkflow(id)
      set(state => ({
        workflows: state.workflows.filter(w => w.id !== id),
        workflowList: state.workflowList.filter(w => w.id !== id),
        currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow
      }))
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      throw error
    }
  },

  exportWorkflow: async (id: string) => {
    try {
      const workflow = await window.api.aiAssistant.getWorkflow(id)
      return workflow ? JSON.stringify(workflow, null, 2) : null
    } catch (error) {
      console.error('Failed to export workflow:', error)
      throw error
    }
  },

  importWorkflow: async (json5Content: string) => {
    try {
      const parsed = JSON.parse(json5Content)
      const { id: _oldId, createdAt: _ca, updatedAt: _ua, ...rest } = parsed
      const workflow = await window.api.aiAssistant.createWorkflow(rest)
      if (workflow) {
        set(state => ({
          workflows: [...state.workflows, workflow]
        }))
        const workflowList = await window.api.aiAssistant.listWorkflows()
        set({ workflowList: workflowList.map((w: Record<string, unknown>) => ({ id: w.id, name: w.name, description: w.description })) })
      }
      return workflow
    } catch (error) {
      console.error('Failed to import workflow:', error)
      throw error
    }
  },

  // 执行操作
  startWorkflow: async (workflowId: string) => {
    const workflow = get().workflows.find(w => w.id === workflowId)
    if (!workflow) {
      throw new Error('工作流不存在')
    }

    set({ isExecuting: true, error: null })
    try {
      const execution = await window.api.aiAssistant.saveExecution({
        workflowId,
        workflowName: workflow.name,
        status: 'running',
        startedAt: new Date().toISOString()
      })
      set({ currentExecution: execution })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '启动工作流失败'
      console.error('Failed to start workflow:', error)
      set({ isExecuting: false, error: errorMessage })
      throw error
    }
  },

  getExecution: async (id: string) => {
    try {
      const executions = await window.api.aiAssistant.listExecutions()
      const execution = executions.find((e: Record<string, unknown>) => e.id === id)
      set({ currentExecution: execution || null })
    } catch (error) {
      console.error('Failed to get execution:', error)
      throw error
    }
  },

  updateExecution: async (id: string, updates: Partial<WorkflowExecution>) => {
    try {
      const execution = await window.api.aiAssistant.saveExecution({ id, ...updates })
      if (execution) {
        set({ currentExecution: execution })
      }
    } catch (error) {
      console.error('Failed to update execution:', error)
      throw error
    }
  },

  completeStep: async (stepId: string, output: string) => {
    const execution = get().currentExecution
    if (!execution) return

    try {
      const stepOutputs = { ...execution.stepOutputs, [stepId]: output }
      const updated = await window.api.aiAssistant.saveExecution({ id: execution.id, stepOutputs })
      if (updated) {
        set({ currentExecution: updated })
      }
    } catch (error) {
      console.error('Failed to complete step:', error)
      throw error
    }
  },

  cancelExecution: async () => {
    const execution = get().currentExecution
    if (!execution) return

    try {
      const updated = await window.api.aiAssistant.saveExecution({
        id: execution.id,
        status: 'cancelled',
        completedAt: new Date().toISOString()
      })
      if (updated) {
        set({ currentExecution: null, isExecuting: false })
      }
    } catch (error) {
      console.error('Failed to cancel execution:', error)
      throw error
    }
  },

  loadExecutionHistory: async () => {
    try {
      const history = await window.api.aiAssistant.listExecutions()
      set({ executionHistory: history })
    } catch (error) {
      console.error('Failed to load execution history:', error)
    }
  },

  deleteExecution: async (id: string) => {
    try {
      await window.api.aiAssistant.deleteExecution(id)
      set(state => ({
        executionHistory: state.executionHistory.filter(e => e.id !== id),
        currentExecution: state.currentExecution?.id === id ? null : state.currentExecution
      }))
    } catch (error) {
      console.error('Failed to delete execution:', error)
      throw error
    }
  },

  // API 调用
  callApi: async (prompt: string, options?: AiApiCallOptions) => {
    try {
      return await window.api.aiAssistant.callApi(prompt, options)
    } catch (error) {
      console.error('Failed to call AI API:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 调用失败',
        duration: 0
      }
    }
  },

  callApiStream: async (prompt: string, options?: AiApiCallOptions) => {
    set({ isStreaming: true, streamingContent: '' })
    try {
      const result = await window.api.aiAssistant.callApiStream(prompt, options)
      if (!result.success) {
        set({ isStreaming: false })
      }
      return result as AiApiCallResult
    } catch (error) {
      set({ isStreaming: false })
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 流式调用失败',
        duration: 0
      }
    }
  },

  onStreamChunk: (callback: (chunk: AiApiStreamChunk) => void) => {
    window.api.aiAssistant.onStreamChunk(callback)
  },

  removeStreamChunkListener: () => {
    window.api.aiAssistant.removeStreamChunkListener()
  },

  testApiConnection: async (provider: string) => {
    try {
      return await window.api.aiAssistant.testApiConnection(provider)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败'
      }
    }
  },

  getAvailableModels: async (provider: string) => {
    try {
      return await window.api.aiAssistant.getAvailableModels(provider)
    } catch (error) {
      console.error('Failed to get available models:', error)
      return []
    }
  },

  // 会话操作
  loadSessions: async () => {
    try {
      const sessions = await window.api.aiAssistant.listSessions()
      const sorted = (sessions as ChatSessionSummary[]).sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      )
      set({ sessions: sorted, sessionsLoaded: true })
    } catch (error) {
      console.error('Failed to load sessions:', error)
      set({ sessionsLoaded: true })
    }
  },

  saveSession: async (session: ChatSession) => {
    try {
      const saved = await window.api.aiAssistant.saveSession(session as Record<string, unknown>)
      await get().loadSessions()
      return saved as ChatSession
    } catch (error) {
      console.error('Failed to save session:', error)
      return null
    }
  },

  deleteSession: async (id: string) => {
    try {
      await window.api.aiAssistant.deleteSession(id)
      set(state => ({
        sessions: state.sessions.filter(s => s.id !== id),
        currentSessionId: state.currentSessionId === id ? null : state.currentSessionId
      }))
      await get().loadSessions()
    } catch (error) {
      console.error('Failed to delete session:', error)
      throw error
    }
  },

  createSession: async () => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const session: ChatSession = {
      id,
      title: '新对话',
      messages: [],
      createdAt: now,
      updatedAt: now
    }
    try {
      const saved = await window.api.aiAssistant.saveSession(session as Record<string, unknown>)
      await get().loadSessions()
      return saved as ChatSession
    } catch (error) {
      console.error('Failed to create session:', error)
      return session
    }
  },

  switchSession: async (id: string) => {
    try {
      const session = await window.api.aiAssistant.getSession(id)
      return session as ChatSession | null
    } catch (error) {
      console.error('Failed to switch session:', error)
      return null
    }
  },

  // 变量解析
  resolveVariables: (template: PromptTemplate, variables: Record<string, VariableValue>) => {
    let content = template.content || ''

    const variableMap = new Map<
      string,
      { value: VariableValue; variable: (typeof template.variables)[0] }
    >()
    for (const variable of template.variables) {
      const value = variables[variable.id]
      if (value) {
        variableMap.set(variable.key, { value, variable })
      }
    }

    const getReplacement = (
      key: string,
      value: VariableValue,
      _variable: (typeof template.variables)[0]
    ): string => {
      if (value.entryData && typeof value.entryData === 'object') {
        const propertyMatch = key.match(/\.(\w+)$/)
        if (propertyMatch) {
          const property = propertyMatch[1]
          return String((value.entryData as Record<string, unknown>)[property] || '')
        }
        return String(
          (value.entryData as Record<string, unknown>).name ||
            (value.entryData as Record<string, unknown>).Name ||
            ''
        )
      } else if (Array.isArray(value.value)) {
        return value.value.join(', ')
      } else if (value.value !== null && value.value !== undefined) {
        return String(value.value)
      }
      return ''
    }

    for (const [key, { value, variable }] of variableMap) {
      const replacement = getReplacement(key, value, variable)
      const regex = new RegExp(
        `\\{\\{${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\.\\w+)?\\}\\}`,
        'g'
      )
      content = content.replace(regex, replacement)
    }

    content = content.replace(
      /\{\{(\w+)(?:\.(\w+))?\|([^}]+)\}\}/g,
      (match, key, prop, defaultVal) => {
        const entry = variableMap.get(key)
        if (!entry) return defaultVal
        if (prop && entry.value.entryData && typeof entry.value.entryData === 'object') {
          const val = (entry.value.entryData as Record<string, unknown>)[prop]
          return val ? String(val) : defaultVal
        }
        if (!prop) {
          const replacement = getReplacement(key, entry.value, entry.variable)
          return replacement || defaultVal
        }
        return defaultVal
      }
    )

    content = content.replace(
      /\{\{#if\s+(\w+)(?:\.(\w+))?\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, key, prop, body) => {
        const entry = variableMap.get(key)
        if (!entry) return ''
        let hasValue = false
        if (prop && entry.value.entryData && typeof entry.value.entryData === 'object') {
          hasValue = !!(entry.value.entryData as Record<string, unknown>)[prop]
        } else if (!prop) {
          const replacement = getReplacement(key, entry.value, entry.variable)
          hasValue = replacement !== ''
        }
        return hasValue ? body : ''
      }
    )

    content = content.replace(
      /\{\{#if\s+!(\w+)(?:\.(\w+))?\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_, key, prop, body) => {
        const entry = variableMap.get(key)
        if (!entry) return body
        let hasValue = false
        if (prop && entry.value.entryData && typeof entry.value.entryData === 'object') {
          hasValue = !!(entry.value.entryData as Record<string, unknown>)[prop]
        } else if (!prop) {
          const replacement = getReplacement(key, entry.value, entry.variable)
          hasValue = replacement !== ''
        }
        return hasValue ? '' : body
      }
    )

    return content
  },

  // UI 操作
  setActiveTab: tab => set({ activeTab: tab }),
  setCurrentTemplate: template => set({ currentTemplate: template }),
  setCurrentWorkflow: workflow => set({ currentWorkflow: workflow }),
  clearError: () => set({ error: null }),

  // Agent 操作
  runAgent: async (userIntent: string, content: string) => {
    const sessionId = get().currentAgentSessionId
    if (!sessionId) {
      console.error('No active agent session')
      return
    }
    set({ isStreaming: true, streamingContent: '', agentEvents: [] })
    try {
      await window.api.aiAgent.runAgent(sessionId, userIntent, content)
    } catch (error) {
      console.error('Failed to run agent:', error)
      set({ isStreaming: false })
    }
  },

  stopAgent: async () => {
    const sessionId = get().currentAgentSessionId
    if (!sessionId) return
    try {
      await window.api.aiAgent.stopAgent(sessionId)
    } catch (error) {
      console.error('Failed to stop agent:', error)
    }
    set({ isStreaming: false })
  },

  onAgentEvent: (callback: (event: AnyAgentEvent) => void) => {
    return window.api.aiAgent.onAgentEvent((event) => {
      callback(event as AnyAgentEvent)
    })
  },

  createAgentSession: async () => {
    try {
      const session = await window.api.aiAgent.createSession() as AgentSession
      set(state => ({
        agentSessions: [...state.agentSessions, session],
        currentAgentSessionId: session.id
      }))
      return session
    } catch (error) {
      console.error('Failed to create agent session:', error)
      throw error
    }
  },

  getAgentSession: async (id: string) => {
    try {
      const session = await window.api.aiAgent.getSession(id) as AgentSession | null
      return session
    } catch (error) {
      console.error('Failed to get agent session:', error)
      return null
    }
  },

  addAgentEvent: (event: AnyAgentEvent) => {
    set(state => ({
      agentEvents: [...state.agentEvents, event]
    }))
  },

  clearAgentEvents: () => {
    set({ agentEvents: [] })
  },

  clearData: () => {
    set({
      templates: [],
      templateList: [],
      currentTemplate: null,
      templatesLoaded: false,
      workflows: [],
      workflowList: [],
      currentWorkflow: null,
      workflowsLoaded: false,
      currentExecution: null,
      executionHistory: [],
      isLoading: false,
      isExecuting: false,
      isStreaming: false,
      streamingContent: '',
      error: null,
      activeTab: 'templates',
      sessions: [],
      currentSessionId: null,
      agentEvents: [],
      agentSessions: [],
      currentAgentSessionId: null,
      agentToolCalls: new Map()
    })
  }
}))
