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

// ============================================
// 模板 IPC 处理器
// ============================================

// 获取模板列表
ipcMain.handle('aiAssistant:getTemplateList', (): TemplateListItem[] => {
  return aiAssistantService.getTemplateList()
})

// 获取所有模板
ipcMain.handle('aiAssistant:getTemplates', (): PromptTemplate[] => {
  return aiAssistantService.getTemplates()
})

// 获取单个模板
ipcMain.handle('aiAssistant:getTemplate', (_event, id: string): PromptTemplate | null => {
  return aiAssistantService.getTemplate(id)
})

// 保存模板
ipcMain.handle(
  'aiAssistant:saveTemplate',
  (
    _event,
    template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): PromptTemplate => {
    return aiAssistantService.saveTemplate(template)
  }
)

// 删除模板
ipcMain.handle('aiAssistant:deleteTemplate', (_event, id: string): boolean => {
  return aiAssistantService.deleteTemplate(id)
})

// 复制模板到项目
ipcMain.handle('aiAssistant:copyTemplateToProject', (_event, id: string): PromptTemplate | null => {
  return aiAssistantService.copyTemplateToProject(id)
})

// 导出模板
ipcMain.handle('aiAssistant:exportTemplate', (_event, id: string): string | null => {
  return aiAssistantService.exportTemplate(id)
})

// 导入模板
ipcMain.handle('aiAssistant:importTemplate', (_event, json5Content: string): PromptTemplate | null => {
  return aiAssistantService.importTemplate(json5Content)
})

// ============================================
// 工作流 IPC 处理器
// ============================================

// 获取工作流列表
ipcMain.handle('aiAssistant:getWorkflowList', (): WorkflowListItem[] => {
  return aiAssistantService.getWorkflowList()
})

// 获取所有工作流
ipcMain.handle('aiAssistant:getWorkflows', (): PromptWorkflow[] => {
  return aiAssistantService.getWorkflows()
})

// 获取单个工作流
ipcMain.handle('aiAssistant:getWorkflow', (_event, id: string): PromptWorkflow | null => {
  return aiAssistantService.getWorkflow(id)
})

// 保存工作流
ipcMain.handle(
  'aiAssistant:saveWorkflow',
  (
    _event,
    workflow: Omit<PromptWorkflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): PromptWorkflow => {
    return aiAssistantService.saveWorkflow(workflow)
  }
)

// 删除工作流
ipcMain.handle('aiAssistant:deleteWorkflow', (_event, id: string): boolean => {
  return aiAssistantService.deleteWorkflow(id)
})

// 导出工作流
ipcMain.handle('aiAssistant:exportWorkflow', (_event, id: string): string | null => {
  return aiAssistantService.exportWorkflow(id)
})

// 导入工作流
ipcMain.handle('aiAssistant:importWorkflow', (_event, json5Content: string): PromptWorkflow | null => {
  return aiAssistantService.importWorkflow(json5Content)
})

// ============================================
// 执行状态 IPC 处理器
// ============================================

// 创建执行状态
ipcMain.handle(
  'aiAssistant:createExecution',
  (_event, workflowId: string, workflowName: string): WorkflowExecution => {
    return aiAssistantService.createExecution(workflowId, workflowName)
  }
)

// 获取执行状态
ipcMain.handle('aiAssistant:getExecution', (_event, id: string): WorkflowExecution | null => {
  return aiAssistantService.getExecution(id)
})

// 更新执行状态
ipcMain.handle(
  'aiAssistant:updateExecution',
  (_event, id: string, updates: Partial<WorkflowExecution>): WorkflowExecution | null => {
    return aiAssistantService.updateExecution(id, updates)
  }
)

// 获取执行历史
ipcMain.handle('aiAssistant:getExecutionHistory', (): WorkflowExecution[] => {
  return aiAssistantService.getExecutionHistory()
})

// 删除执行历史
ipcMain.handle('aiAssistant:deleteExecution', (_event, id: string): boolean => {
  return aiAssistantService.deleteExecution(id)
})

// ============================================
// AI API 调用 IPC 处理器
// ============================================

// 调用 AI API
ipcMain.handle(
  'aiAssistant:callApi',
  async (_event, prompt: string, options?: AiApiCallOptions): Promise<AiApiCallResult> => {
    return await aiApiService.call(prompt, options)
  }
)

// 测试 API 连接
ipcMain.handle(
  'aiAssistant:testApiConnection',
  async (_event, provider: AIProvider): Promise<{ success: boolean; error?: string }> => {
    return await aiApiService.testConnection(provider)
  }
)

// 获取可用模型列表
ipcMain.handle('aiAssistant:getAvailableModels', (_event, provider: AIProvider): string[] => {
  return aiApiService.getAvailableModels(provider)
})

/**
 * 注册所有 AI 写作助手 IPC 处理器
 */
export function registerAiAssistantHandlers(): void {
  // 所有处理器已通过 ipcMain.handle 注册
  // 此函数用于显式调用，方便在主进程初始化时统一注册
}
