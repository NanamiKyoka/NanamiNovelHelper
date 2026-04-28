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
  AiApiCallResult
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
  testApiConnection: (
    provider: 'openai' | 'anthropic' | 'custom'
  ) => Promise<{ success: boolean; error?: string }>
  getAvailableModels: (provider: 'openai' | 'anthropic' | 'custom') => Promise<string[]>

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
  error: null,
  activeTab: 'templates',

  // 模板操作
  loadTemplates: async () => {
    set({ isLoading: true, error: null })
    try {
      const [templateList, templates] = await Promise.all([
        window.electron.aiAssistant.getTemplateList(),
        window.electron.aiAssistant.getTemplates()
      ])
      set({
        templateList,
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
      const template = await window.electron.aiAssistant.getTemplate(id)
      set({ currentTemplate: template })
    } catch (error) {
      console.error('Failed to load template:', error)
      throw error
    }
  },

  saveTemplate: async template => {
    try {
      const saved = await window.electron.aiAssistant.saveTemplate(template)
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
      // 重新加载列表
      const templateList = await window.electron.aiAssistant.getTemplateList()
      set({ templateList })
      return saved
    } catch (error) {
      console.error('Failed to save template:', error)
      throw error
    }
  },

  deleteTemplate: async (id: string) => {
    try {
      const success = await window.electron.aiAssistant.deleteTemplate(id)
      if (success) {
        set(state => ({
          templates: state.templates.filter(t => t.id !== id),
          templateList: state.templateList.filter(t => t.id !== id),
          currentTemplate: state.currentTemplate?.id === id ? null : state.currentTemplate
        }))
      }
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw error
    }
  },

  copyTemplateToProject: async (id: string) => {
    try {
      const template = await window.electron.aiAssistant.copyTemplateToProject(id)
      if (template) {
        set(state => {
          const existingIndex = state.templates.findIndex(t => t.id === id)
          const newTemplates =
            existingIndex >= 0
              ? state.templates.map(t => (t.id === id ? template : t))
              : [...state.templates, template]
          return { templates: newTemplates, currentTemplate: template }
        })
      }
    } catch (error) {
      console.error('Failed to copy template to project:', error)
      throw error
    }
  },

  exportTemplate: async (id: string) => {
    try {
      return await window.electron.aiAssistant.exportTemplate(id)
    } catch (error) {
      console.error('Failed to export template:', error)
      throw error
    }
  },

  importTemplate: async (json5Content: string) => {
    try {
      const template = await window.electron.aiAssistant.importTemplate(json5Content)
      if (template) {
        set(state => ({
          templates: [...state.templates, template]
        }))
        // 重新加载列表
        const templateList = await window.electron.aiAssistant.getTemplateList()
        set({ templateList })
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
      const [workflowList, workflows] = await Promise.all([
        window.electron.aiAssistant.getWorkflowList(),
        window.electron.aiAssistant.getWorkflows()
      ])
      set({
        workflowList,
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
      const workflow = await window.electron.aiAssistant.getWorkflow(id)
      set({ currentWorkflow: workflow })
    } catch (error) {
      console.error('Failed to load workflow:', error)
      throw error
    }
  },

  saveWorkflow: async workflow => {
    try {
      const saved = await window.electron.aiAssistant.saveWorkflow(workflow)
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
      // 重新加载列表
      const workflowList = await window.electron.aiAssistant.getWorkflowList()
      set({ workflowList })
      return saved
    } catch (error) {
      console.error('Failed to save workflow:', error)
      throw error
    }
  },

  deleteWorkflow: async (id: string) => {
    try {
      const success = await window.electron.aiAssistant.deleteWorkflow(id)
      if (success) {
        set(state => ({
          workflows: state.workflows.filter(w => w.id !== id),
          workflowList: state.workflowList.filter(w => w.id !== id),
          currentWorkflow: state.currentWorkflow?.id === id ? null : state.currentWorkflow
        }))
      }
    } catch (error) {
      console.error('Failed to delete workflow:', error)
      throw error
    }
  },

  exportWorkflow: async (id: string) => {
    try {
      return await window.electron.aiAssistant.exportWorkflow(id)
    } catch (error) {
      console.error('Failed to export workflow:', error)
      throw error
    }
  },

  importWorkflow: async (json5Content: string) => {
    try {
      const workflow = await window.electron.aiAssistant.importWorkflow(json5Content)
      if (workflow) {
        set(state => ({
          workflows: [...state.workflows, workflow]
        }))
        // 重新加载列表
        const workflowList = await window.electron.aiAssistant.getWorkflowList()
        set({ workflowList })
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
      const execution = await window.electron.aiAssistant.createExecution(workflowId, workflow.name)
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
      const execution = await window.electron.aiAssistant.getExecution(id)
      set({ currentExecution: execution })
    } catch (error) {
      console.error('Failed to get execution:', error)
      throw error
    }
  },

  updateExecution: async (id: string, updates: Partial<WorkflowExecution>) => {
    try {
      const execution = await window.electron.aiAssistant.updateExecution(id, updates)
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
      const updated = await window.electron.aiAssistant.updateExecution(execution.id, {
        stepOutputs
      })
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
      const updated = await window.electron.aiAssistant.updateExecution(execution.id, {
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
      const history = await window.electron.aiAssistant.getExecutionHistory()
      set({ executionHistory: history })
    } catch (error) {
      console.error('Failed to load execution history:', error)
    }
  },

  deleteExecution: async (id: string) => {
    try {
      const success = await window.electron.aiAssistant.deleteExecution(id)
      if (success) {
        set(state => ({
          executionHistory: state.executionHistory.filter(e => e.id !== id),
          currentExecution: state.currentExecution?.id === id ? null : state.currentExecution
        }))
      }
    } catch (error) {
      console.error('Failed to delete execution:', error)
      throw error
    }
  },

  // API 调用
  callApi: async (prompt: string, options?: AiApiCallOptions) => {
    try {
      return await window.electron.aiAssistant.callApi(prompt, options)
    } catch (error) {
      console.error('Failed to call AI API:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API 调用失败',
        duration: 0
      }
    }
  },

  testApiConnection: async (provider: 'openai' | 'anthropic' | 'custom') => {
    try {
      return await window.electron.aiAssistant.testApiConnection(provider)
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '连接测试失败'
      }
    }
  },

  getAvailableModels: async (provider: 'openai' | 'anthropic' | 'custom') => {
    try {
      return await window.electron.aiAssistant.getAvailableModels(provider)
    } catch (error) {
      console.error('Failed to get available models:', error)
      return []
    }
  },

  // 变量解析
  resolveVariables: (template: PromptTemplate, variables: Record<string, VariableValue>) => {
    let content = template.content || ''

    for (const variable of template.variables) {
      const value = variables[variable.id]
      if (!value) continue

      let replacement = ''

      if (value.entryData && typeof value.entryData === 'object') {
        // 如果有 entryData，尝试解析属性路径
        const key = variable.key
        const propertyMatch = key.match(/\.(\w+)$/)
        if (propertyMatch) {
          const property = propertyMatch[1]
          replacement = String((value.entryData as Record<string, unknown>)[property] || '')
        } else {
          // 默认使用 name 属性
          replacement = String(
            (value.entryData as Record<string, unknown>).name ||
              (value.entryData as Record<string, unknown>).Name ||
              ''
          )
        }
      } else if (Array.isArray(value.value)) {
        replacement = value.value.join(', ')
      } else if (value.value !== null && value.value !== undefined) {
        replacement = String(value.value)
      }

      // 替换 {{变量名}} 和 {{变量名.属性}} 格式
      const regex = new RegExp(`\\{\\{${variable.key}(?:\\.\\w+)?\\}\\}`, 'g')
      content = content.replace(regex, replacement)
    }

    return content
  },

  // UI 操作
  setActiveTab: tab => set({ activeTab: tab }),
  setCurrentTemplate: template => set({ currentTemplate: template }),
  setCurrentWorkflow: workflow => set({ currentWorkflow: workflow }),
  clearError: () => set({ error: null }),

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
      error: null,
      activeTab: 'templates'
    })
  }
}))
