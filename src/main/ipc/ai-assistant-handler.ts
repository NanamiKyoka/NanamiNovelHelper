/**
 * AI写作助手 IPC 处理器
 */

import { ipcMain, BrowserWindow } from 'electron'
import { aiAssistantService } from '../services/aiAssistant'
import { aiApiService } from '../services/aiApi'
import { validateParams } from '../utils/validation'
import type {
  PromptTemplate,
  PromptWorkflow,
  WorkflowExecution,
  TemplateListItem,
  WorkflowListItem,
  AiApiCallOptions,
  AiApiCallResult,
  AIProvider
} from '@shared/ai-assistant'

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
    validateParams('aiAssistant:getTemplate').nonEmptyString(id, 'id').validate()
    return aiAssistantService.getTemplate(id)
  })

  ipcMain.handle(
    'aiAssistant:saveTemplate',
    (
      _event,
      template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): PromptTemplate => {
      validateParams('aiAssistant:saveTemplate').object(template, 'template').validate()
      return aiAssistantService.saveTemplate(template)
    }
  )

  ipcMain.handle('aiAssistant:deleteTemplate', (_event, id: string): boolean => {
    validateParams('aiAssistant:deleteTemplate').nonEmptyString(id, 'id').validate()
    return aiAssistantService.deleteTemplate(id)
  })

  ipcMain.handle(
    'aiAssistant:copyTemplateToProject',
    (_event, id: string): PromptTemplate | null => {
      validateParams('aiAssistant:copyTemplateToProject').nonEmptyString(id, 'id').validate()
      return aiAssistantService.copyTemplateToProject(id)
    }
  )

  ipcMain.handle('aiAssistant:exportTemplate', (_event, id: string): string | null => {
    validateParams('aiAssistant:exportTemplate').nonEmptyString(id, 'id').validate()
    return aiAssistantService.exportTemplate(id)
  })

  ipcMain.handle(
    'aiAssistant:importTemplate',
    (_event, json5Content: string): PromptTemplate | null => {
      validateParams('aiAssistant:importTemplate')
        .nonEmptyString(json5Content, 'json5Content')
        .validate()
      return aiAssistantService.importTemplate(json5Content)
    }
  )

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
    validateParams('aiAssistant:getWorkflow').nonEmptyString(id, 'id').validate()
    return aiAssistantService.getWorkflow(id)
  })

  ipcMain.handle(
    'aiAssistant:saveWorkflow',
    (
      _event,
      workflow: Omit<PromptWorkflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
    ): PromptWorkflow => {
      validateParams('aiAssistant:saveWorkflow').object(workflow, 'workflow').validate()
      return aiAssistantService.saveWorkflow(workflow)
    }
  )

  ipcMain.handle('aiAssistant:deleteWorkflow', (_event, id: string): boolean => {
    validateParams('aiAssistant:deleteWorkflow').nonEmptyString(id, 'id').validate()
    return aiAssistantService.deleteWorkflow(id)
  })

  ipcMain.handle('aiAssistant:exportWorkflow', (_event, id: string): string | null => {
    validateParams('aiAssistant:exportWorkflow').nonEmptyString(id, 'id').validate()
    return aiAssistantService.exportWorkflow(id)
  })

  ipcMain.handle(
    'aiAssistant:importWorkflow',
    (_event, json5Content: string): PromptWorkflow | null => {
      validateParams('aiAssistant:importWorkflow')
        .nonEmptyString(json5Content, 'json5Content')
        .validate()
      return aiAssistantService.importWorkflow(json5Content)
    }
  )

  // ============================================
  // 执行状态 IPC 处理器
  // ============================================

  ipcMain.handle(
    'aiAssistant:createExecution',
    (_event, workflowId: string, workflowName: string): WorkflowExecution => {
      validateParams('aiAssistant:createExecution')
        .nonEmptyString(workflowId, 'workflowId')
        .nonEmptyString(workflowName, 'workflowName')
        .validate()
      return aiAssistantService.createExecution(workflowId, workflowName)
    }
  )

  ipcMain.handle('aiAssistant:getExecution', (_event, id: string): WorkflowExecution | null => {
    validateParams('aiAssistant:getExecution').nonEmptyString(id, 'id').validate()
    return aiAssistantService.getExecution(id)
  })

  ipcMain.handle(
    'aiAssistant:updateExecution',
    (_event, id: string, updates: Partial<WorkflowExecution>): WorkflowExecution | null => {
      validateParams('aiAssistant:updateExecution')
        .nonEmptyString(id, 'id')
        .object(updates, 'updates')
        .validate()
      return aiAssistantService.updateExecution(id, updates)
    }
  )

  ipcMain.handle('aiAssistant:getExecutionHistory', (): WorkflowExecution[] => {
    return aiAssistantService.getExecutionHistory()
  })

  ipcMain.handle('aiAssistant:deleteExecution', (_event, id: string): boolean => {
    validateParams('aiAssistant:deleteExecution').nonEmptyString(id, 'id').validate()
    return aiAssistantService.deleteExecution(id)
  })

  // ============================================
  // AI API 调用 IPC 处理器
  // ============================================

  ipcMain.handle(
    'aiAssistant:callApi',
    async (_event, prompt: string, options?: AiApiCallOptions): Promise<AiApiCallResult> => {
      validateParams('aiAssistant:callApi').nonEmptyString(prompt, 'prompt').validate()
      return await aiApiService.call(prompt, options)
    }
  )

  ipcMain.handle(
    'aiAssistant:testApiConnection',
    async (_event, provider: AIProvider): Promise<{ success: boolean; error?: string }> => {
      validateParams('aiAssistant:testApiConnection').object(provider, 'provider').validate()
      return await aiApiService.testConnection(provider)
    }
  )

  ipcMain.handle('aiAssistant:getAvailableModels', (_event, provider: AIProvider): string[] => {
    validateParams('aiAssistant:getAvailableModels').object(provider, 'provider').validate()
    return aiApiService.getAvailableModels(provider)
  })

  ipcMain.handle(
    'aiAssistant:callApiStream',
    async (_event, prompt: string, options?: AiApiCallOptions): Promise<AiApiCallResult> => {
      validateParams('aiAssistant:callApiStream').nonEmptyString(prompt, 'prompt').validate()
      const win = BrowserWindow.fromWebContents(_event.sender)
      if (!win) {
        return { success: false, error: '无法获取窗口实例', duration: 0 }
      }
      return await aiApiService.callStream(prompt, options || {}, win)
    }
  )
}
