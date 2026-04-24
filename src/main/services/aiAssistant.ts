/**
 * AI写作助手服务
 * 管理提示词模板和工作流
 * 所有数据存储在项目目录中，每个项目独立管理
 */

import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import JSON5 from 'json5'
import {
  PromptTemplate,
  PromptWorkflow,
  TemplateListItem,
  WorkflowListItem,
  WorkflowExecution,
  getBuiltInTemplates,
  getBuiltInWorkflows,
} from '@shared/ai-assistant'
import { createLogger } from '../utils/logger'

// 目录常量
const AI_ASSISTANT_DIR = 'ai-assistant'
const TEMPLATES_DIR = 'templates'
const WORKFLOWS_DIR = 'workflows'
const EXECUTIONS_DIR = 'executions'

/**
 * AI写作助手服务
 */
class AiAssistantService {
  private logger = createLogger('AiAssistantService')
  private projectAiDir: string | null = null
  private projectTemplatesDir: string | null = null
  private projectWorkflowsDir: string | null = null
  private projectExecutionsDir: string | null = null

  /**
   * 初始化服务（应用启动时调用）
   */
  initGlobal(): void {
    // 不再需要全局初始化，所有数据都在项目目录中
  }

  /**
   * 初始化项目（打开项目时调用）
   */
  initProject(projectPath: string): void {
    this.projectAiDir = path.join(projectPath, '.novelhelper', 'data', AI_ASSISTANT_DIR)
    this.projectTemplatesDir = path.join(this.projectAiDir, TEMPLATES_DIR)
    this.projectWorkflowsDir = path.join(this.projectAiDir, WORKFLOWS_DIR)
    this.projectExecutionsDir = path.join(this.projectAiDir, EXECUTIONS_DIR)

    // 确保目录存在
    this.ensureProjectDirectories()

    // 初始化内置模板（如果项目目录为空）
    this.initBuiltInTemplates()
    this.initBuiltInWorkflows()
  }

  /**
   * 清理项目数据（关闭项目时调用）
   */
  clearProject(): void {
    this.projectAiDir = null
    this.projectTemplatesDir = null
    this.projectWorkflowsDir = null
    this.projectExecutionsDir = null
  }

  // ============================================
  // 目录管理
  // ============================================

  private ensureProjectDirectories(): void {
    if (!this.projectAiDir) return

    if (!fs.existsSync(this.projectAiDir)) {
      fs.mkdirSync(this.projectAiDir, { recursive: true })
    }
    if (!fs.existsSync(this.projectTemplatesDir!)) {
      fs.mkdirSync(this.projectTemplatesDir!, { recursive: true })
    }
    if (!fs.existsSync(this.projectWorkflowsDir!)) {
      fs.mkdirSync(this.projectWorkflowsDir!, { recursive: true })
    }
    if (!fs.existsSync(this.projectExecutionsDir!)) {
      fs.mkdirSync(this.projectExecutionsDir!, { recursive: true })
    }
  }

  // ============================================
  // 内置模板初始化
  // ============================================

  private initBuiltInTemplates(): void {
    if (!this.projectTemplatesDir || !fs.existsSync(this.projectTemplatesDir)) {
      return
    }

    // 检查目录是否为空
    const existingFiles = fs.readdirSync(this.projectTemplatesDir).filter(f => f.endsWith('.json5'))
    if (existingFiles.length > 0) {
      return // 已有模板，不初始化内置模板
    }

    const builtInTemplates = getBuiltInTemplates()
    for (const template of builtInTemplates) {
      this.saveTemplateFile(template)
    }
  }

  private initBuiltInWorkflows(): void {
    if (!this.projectWorkflowsDir || !fs.existsSync(this.projectWorkflowsDir)) {
      return
    }

    // 检查目录是否为空
    const existingFiles = fs.readdirSync(this.projectWorkflowsDir).filter(f => f.endsWith('.json5'))
    if (existingFiles.length > 0) {
      return // 已有工作流，不初始化内置工作流
    }

    const builtInWorkflows = getBuiltInWorkflows()
    for (const workflow of builtInWorkflows) {
      this.saveWorkflowFile(workflow)
    }
  }

  // ============================================
  // 文件路径
  // ============================================

  private getTemplateFilePath(id: string): string {
    if (!this.projectTemplatesDir) {
      throw new Error('项目未初始化，请先打开项目')
    }
    return path.join(this.projectTemplatesDir, `${id}.json5`)
  }

  private getWorkflowFilePath(id: string): string {
    if (!this.projectWorkflowsDir) {
      throw new Error('项目未初始化，请先打开项目')
    }
    return path.join(this.projectWorkflowsDir, `${id}.json5`)
  }

  private getExecutionFilePath(id: string): string {
    if (!this.projectExecutionsDir) {
      throw new Error('项目未初始化，请先打开项目')
    }
    return path.join(this.projectExecutionsDir, `${id}.json5`)
  }

  // ============================================
  // 模板 CRUD
  // ============================================

  /**
   * 获取所有模板
   */
  getTemplates(): PromptTemplate[] {
    const templates: PromptTemplate[] = []

    if (!this.projectTemplatesDir || !fs.existsSync(this.projectTemplatesDir)) {
      return templates
    }

    const files = fs.readdirSync(this.projectTemplatesDir).filter(f => f.endsWith('.json5'))
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.projectTemplatesDir!, file), 'utf-8')
        const template = JSON5.parse(content) as PromptTemplate
        template.source = 'project'
        templates.push(template)
      } catch (error) {
        this.logger.error(`加载模板 ${file} 失败`, error)
      }
    }

    // 按分类和顺序排序
    return templates.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.order - b.order
    })
  }

  /**
   * 获取模板列表项（用于展示）
   */
  getTemplateList(): TemplateListItem[] {
    const templates = this.getTemplates()
    return templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      category: t.category,
      tags: t.tags,
      variableCount: t.variables.length,
      isBuiltIn: t.isBuiltIn,
      source: t.source,
      updatedAt: t.updatedAt,
    }))
  }

  /**
   * 获取单个模板
   */
  getTemplate(id: string): PromptTemplate | null {
    const filePath = this.getTemplateFilePath(id)
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const template = JSON5.parse(content) as PromptTemplate
      template.source = 'project'
      return template
    } catch (error) {
      this.logger.error(`加载模板 ${id} 失败`, error)
      return null
    }
  }

  /**
   * 保存模板
   */
  saveTemplate(template: Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): PromptTemplate {
    const now = new Date().toISOString()
    const isNew = !template.id

    const fullTemplate: PromptTemplate = {
      ...template,
      id: template.id || uuidv4(),
      createdAt: isNew ? now : (this.getTemplate(template.id!)?.createdAt || now),
      updatedAt: now,
      source: 'project',
      isBuiltIn: false,
    }

    this.saveTemplateFile(fullTemplate)
    return fullTemplate
  }

  private saveTemplateFile(template: PromptTemplate): void {
    const filePath = this.getTemplateFilePath(template.id)
    const dir = path.dirname(filePath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON5.stringify(template, null, 2), 'utf-8')
  }

  /**
   * 删除模板
   */
  deleteTemplate(id: string): boolean {
    const filePath = this.getTemplateFilePath(id)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  }

  /**
   * 复制模板到项目（用于修改内置模板）
   * 由于所有模板都在项目目录中，此方法现在简化为返回模板
   */
  copyTemplateToProject(id: string): PromptTemplate | null {
    const template = this.getTemplate(id)
    if (!template) return null

    // 如果是内置模板，复制一份并标记为非内置
    if (template.isBuiltIn) {
      const now = new Date().toISOString()
      const copiedTemplate: PromptTemplate = {
        ...template,
        id: uuidv4(),
        source: 'project',
        isBuiltIn: false,
        createdAt: now,
        updatedAt: now,
      }
      this.saveTemplateFile(copiedTemplate)
      return copiedTemplate
    }

    return template
  }

  // ============================================
  // 工作流 CRUD
  // ============================================

  /**
   * 获取所有工作流
   */
  getWorkflows(): PromptWorkflow[] {
    const workflows: PromptWorkflow[] = []

    if (!this.projectWorkflowsDir || !fs.existsSync(this.projectWorkflowsDir)) {
      return workflows
    }

    const files = fs.readdirSync(this.projectWorkflowsDir).filter(f => f.endsWith('.json5'))
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.projectWorkflowsDir!, file), 'utf-8')
        const workflow = JSON5.parse(content) as PromptWorkflow
        workflow.source = 'project'
        workflows.push(workflow)
      } catch (error) {
        this.logger.error(`加载工作流 ${file} 失败`, error)
      }
    }

    return workflows.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category)
      }
      return a.order - b.order
    })
  }

  /**
   * 获取工作流列表项
   */
  getWorkflowList(): WorkflowListItem[] {
    const workflows = this.getWorkflows()
    return workflows.map(w => ({
      id: w.id,
      name: w.name,
      description: w.description,
      category: w.category,
      tags: w.tags,
      stepCount: w.steps.length,
      isBuiltIn: w.isBuiltIn,
      source: w.source,
      updatedAt: w.updatedAt,
    }))
  }

  /**
   * 获取单个工作流
   */
  getWorkflow(id: string): PromptWorkflow | null {
    const filePath = this.getWorkflowFilePath(id)
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      const workflow = JSON5.parse(content) as PromptWorkflow
      workflow.source = 'project'
      return workflow
    } catch (error) {
      this.logger.error(`加载工作流 ${id} 失败`, error)
      return null
    }
  }

  /**
   * 保存工作流
   */
  saveWorkflow(workflow: Omit<PromptWorkflow, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): PromptWorkflow {
    const now = new Date().toISOString()
    const isNew = !workflow.id

    const fullWorkflow: PromptWorkflow = {
      ...workflow,
      id: workflow.id || uuidv4(),
      createdAt: isNew ? now : (this.getWorkflow(workflow.id!)?.createdAt || now),
      updatedAt: now,
      source: 'project',
      isBuiltIn: false,
    }

    this.saveWorkflowFile(fullWorkflow)
    return fullWorkflow
  }

  private saveWorkflowFile(workflow: PromptWorkflow): void {
    const filePath = this.getWorkflowFilePath(workflow.id)
    const dir = path.dirname(filePath)

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON5.stringify(workflow, null, 2), 'utf-8')
  }

  /**
   * 删除工作流
   */
  deleteWorkflow(id: string): boolean {
    const filePath = this.getWorkflowFilePath(id)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  }

  // ============================================
  // 执行状态管理
  // ============================================

  /**
   * 创建新的执行状态
   */
  createExecution(workflowId: string, workflowName: string): WorkflowExecution {
    const workflow = this.getWorkflow(workflowId)
    const now = new Date().toISOString()

    const execution: WorkflowExecution = {
      id: uuidv4(),
      workflowId,
      workflowName,
      currentStepId: workflow?.startStepId || '',
      status: 'running',
      stepOutputs: {},
      variables: {},
      apiCallHistory: [],
      startedAt: now,
    }

    this.saveExecution(execution)
    return execution
  }

  /**
   * 获取执行状态
   */
  getExecution(id: string): WorkflowExecution | null {
    const filePath = this.getExecutionFilePath(id)
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      return JSON5.parse(content)
    } catch (error) {
      this.logger.error(`加载执行记录 ${id} 失败`, error)
      return null
    }
  }

  /**
   * 保存执行状态
   */
  saveExecution(execution: WorkflowExecution): void {
    if (!this.projectExecutionsDir) return

    const filePath = this.getExecutionFilePath(execution.id)
    if (!fs.existsSync(this.projectExecutionsDir)) {
      fs.mkdirSync(this.projectExecutionsDir, { recursive: true })
    }

    fs.writeFileSync(filePath, JSON5.stringify(execution, null, 2), 'utf-8')
  }

  /**
   * 更新执行状态
   */
  updateExecution(id: string, updates: Partial<WorkflowExecution>): WorkflowExecution | null {
    const execution = this.getExecution(id)
    if (!execution) return null

    const updated = { ...execution, ...updates }
    this.saveExecution(updated)
    return updated
  }

  /**
   * 获取项目的所有执行历史
   */
  getExecutionHistory(): WorkflowExecution[] {
    if (!this.projectExecutionsDir || !fs.existsSync(this.projectExecutionsDir)) {
      return []
    }

    const executions: WorkflowExecution[] = []
    const files = fs.readdirSync(this.projectExecutionsDir).filter(f => f.endsWith('.json5'))

    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(this.projectExecutionsDir!, file), 'utf-8')
        executions.push(JSON5.parse(content))
      } catch (error) {
        this.logger.error(`加载执行记录 ${file} 失败`, error)
      }
    }

    return executions.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
  }

  /**
   * 删除执行历史
   */
  deleteExecution(id: string): boolean {
    const filePath = this.getExecutionFilePath(id)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      return true
    }
    return false
  }

  // ============================================
  // 导入导出
  // ============================================

  /**
   * 导出模板为 JSON5 字符串
   */
  exportTemplate(id: string): string | null {
    const template = this.getTemplate(id)
    if (!template) return null

    return JSON5.stringify(template, null, 2)
  }

  /**
   * 导入模板
   */
  importTemplate(json5Content: string): PromptTemplate | null {
    try {
      const template = JSON5.parse(json5Content) as PromptTemplate

      // 生成新 ID，避免冲突
      const newId = uuidv4()
      const now = new Date().toISOString()

      const importedTemplate: PromptTemplate = {
        ...template,
        id: newId,
        isBuiltIn: false,
        source: 'project',
        createdAt: now,
        updatedAt: now,
      }

      this.saveTemplateFile(importedTemplate)
      return importedTemplate
    } catch (error) {
      this.logger.error('导入模板失败', error)
      return null
    }
  }

  /**
   * 导出工作流为 JSON5 字符串
   */
  exportWorkflow(id: string): string | null {
    const workflow = this.getWorkflow(id)
    if (!workflow) return null

    return JSON5.stringify(workflow, null, 2)
  }

  /**
   * 导入工作流
   */
  importWorkflow(json5Content: string): PromptWorkflow | null {
    try {
      const workflow = JSON5.parse(json5Content) as PromptWorkflow

      const newId = uuidv4()
      const now = new Date().toISOString()

      const importedWorkflow: PromptWorkflow = {
        ...workflow,
        id: newId,
        isBuiltIn: false,
        source: 'project',
        createdAt: now,
        updatedAt: now,
      }

      this.saveWorkflowFile(importedWorkflow)
      return importedWorkflow
    } catch (error) {
      this.logger.error('导入工作流失败', error)
      return null
    }
  }
}

// 单例导出
export const aiAssistantService = new AiAssistantService()