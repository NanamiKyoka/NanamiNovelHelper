/**
 * AI写作助手 IPC 处理器
 */

import { ipcMain } from 'electron'
import { aiAssistantService } from '../services/aiAssistant'
import { aiApiService } from '../services/aiApi'
import type {
  PromptTemplate,
  PromptWorkflow,
  WorkflowExecution,
  TemplateListItem,
  WorkflowListItem,
} from '@shared/ai-assistant'
import type { AiApiCallOptions, AiApiCallResult, AIProvider } from '../services/aiApi'

let registered = false

/**
 * 注册所有 AI 写作助手 IPC 处理器
 */
export function registerAiAssistantHandlers(): void {
  if (registered) return
  registered = true

  // ============================================
  // 模板 IPC 处理器
  // ============================================

  ipcMain.handle('aiAssistant:getTemplateList', (): TemplateListItem[] => {
    return aiAssistantService.getTemplateList()
  })

  ipcMain.handle('aiAssistant:getTemplates', (): PromptTemplate[] => {
    return aiAssistantService.getTemplates()
  })

  ipcMain.handle('aiAssistant:getTemplate', (_event, id: string): PromptTemplate | null => {
    return aiAssistantService.getTemplate(id)
  })

  ipcMain.handle(
    'aiAssistant:saveTemplate',
    (
      _event,
      template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): PromptTemplate => {
      return aiAssistantService.saveTemplate(template)
    }
  )

  ipcMain.handle('aiAssistant:deleteTemplate', (_event, id: string): boolean => {
    return aiAssistantService.deleteTemplate(id)
  })

  ipcMain.handle('aiAssistant:copyTemplateToProject', (_event, id: string): PromptTemplate | null => {
    return aiAssistantService.copyTemplateToProject(id)
  })

  ipcMain.handle('aiAssistant:exportTemplate', (_event, id: string): string | null => {
    return aiAssistantService.exportTemplate(id)
  })

  ipcMain.handle('aiAssistant:importTemplate', (_event, json5Content: string): PromptTemplate | null => {
    return aiAssistantService.importTemplate(json5Content)
  })

  // ============================================
  // 工作流 IPC 处理器
  // ============================================

  ipcMain.handle('aiAssistant:getWorkflowList', (): WorkflowListItem[] => {
    return aiAssistantService.getWorkflowList()
  })

  ipcMain.handle('aiAssistant:getWorkflows', (): PromptWorkflow[] => {
    return aiAssistantService.getWorkflows()
  })

  ipcMain.handle('aiAssistant:getWorkflow', (_event, id: string): PromptWorkflow | null => {
    return aiAssistantService.getWorkflow(id)
  })

  ipcMain.handle(
    'aiAssistant:saveWorkflow',
    (
      _event,
      workflow: Omit<PromptWorkflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): PromptWorkflow => {
      return aiAssistantService.saveWorkflow(workflow)
    }
  )

  ipcMain.handle('aiAssistant:deleteWorkflow', (_event, id: string): boolean => {
    return aiAssistantService.deleteWorkflow(id)
  })

  ipcMain.handle('aiAssistant:exportWorkflow', (_event, id: string): string | null => {
    return aiAssistantService.exportWorkflow(id)
  })

  ipcMain.handle('aiAssistant:importWorkflow', (_event, json5Content: string): PromptWorkflow | null => {
    return aiAssistantService.importWorkflow(json5Content)
  })

  // ============================================
  // 执行状态 IPC 处理器
  // ============================================

  ipcMain.handle(
    'aiAssistant:createExecution',
    (_event, workflowId: string, workflowName: string): WorkflowExecution => {
      return aiAssistantService.createExecution(workflowId, workflowName)
    }
  )

  ipcMain.handle('aiAssistant:getExecution', (_event, id: string): WorkflowExecution | null => {
    return aiAssistantService.getExecution(id)
  })

  ipcMain.handle(
    'aiAssistant:updateExecution',
    (_event, id: string, updates: Partial<WorkflowExecution>): WorkflowExecution | null => {
      return aiAssistantService.updateExecution(id, updates)
    }
  )

  ipcMain.handle('aiAssistant:getExecutionHistory', (): WorkflowExecution[] => {
    return aiAssistantService.getExecutionHistory()
  })

  ipcMain.handle('aiAssistant:deleteExecution', (_event, id: string): boolean => {
    return aiAssistantService.deleteExecution(id)
  })

  // ============================================
  // AI API 调用 IPC 处理器
  // ============================================

  ipcMain.handle(
    'aiAssistant:callApi',
    async (_event, prompt: string, options?: AiApiCallOptions): Promise<AiApiCallResult> => {
      return await aiApiService.call(prompt, options)
    }
  )

  ipcMain.handle(
    'aiAssistant:testApiConnection',
    async (_event, provider: AIProvider): Promise<{ success: boolean; error?: string }> => {
      return await aiApiService.testConnection(provider)
    }
  )

  ipcMain.handle('aiAssistant:getAvailableModels', (_event, provider: AIProvider): string[] => {
    return aiApiService.getAvailableModels(provider)
  })
}
