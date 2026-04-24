/**
 * 动态 SKILL 服务
 * 加载、解析和执行用户自定义的 SKILL
 */

import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as yaml from 'js-yaml'
import type {
  DynamicSkill,
  DynamicSkillMetadata,
  DynamicSkillTool,
  DynamicSkillExecutionRequest,
  DynamicSkillExecutionResult,
  SkillWhitelistConfig,
  SkillWhitelistEntry,
  SkillExecutionContext,
} from '@shared/ai-assistant'
import { app, shell } from 'electron'
import { createLogger } from '../utils/logger'

/**
 * 创建 SKILL 的选项
 */
export interface CreateSkillOptions {
  /** SKILL ID（目录名） */
  id: string
  /** SKILL 名称 */
  name: string
  /** SKILL 描述 */
  description: string
  /** 版本号 */
  version?: string
  /** 作者 */
  author?: string
  /** 标签 */
  tags?: string[]
  /** 工具列表 */
  tools?: DynamicSkillTool[]
  /** 说明文档内容 */
  instructions?: string
}

/**
 * 更新 SKILL 的选项
 */
export interface UpdateSkillOptions {
  /** SKILL 名称 */
  name?: string
  /** SKILL 描述 */
  description?: string
  /** 版本号 */
  version?: string
  /** 作者 */
  author?: string
  /** 标签 */
  tags?: string[]
  /** 工具列表 */
  tools?: DynamicSkillTool[]
  /** 说明文档内容 */
  instructions?: string
}

/**
 * SKILL 服务类
 */
export class DynamicSkillService {
  private logger = createLogger('DynamicSkillService')
  private skillsCache: Map<string, DynamicSkill> = new Map()
  private whitelistConfig: SkillWhitelistConfig | null = null
  private whitelistPath: string | null = null
  private runningProcesses: Map<string, ChildProcess> = new Map()
  private currentProjectPath: string | null = null

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    // 设置白名单配置路径
    const userDataPath = app.getPath('userData')
    this.whitelistPath = path.join(userDataPath, 'skill-whitelist.json')
    await this.loadWhitelist()
  }

  /**
   * 设置当前项目路径
   */
  setProjectPath(projectPath: string): void {
    this.currentProjectPath = projectPath
  }

  /**
   * 获取当前项目路径
   */
  getProjectPath(): string | null {
    return this.currentProjectPath
  }

  /**
   * 加载白名单配置
   */
  private async loadWhitelist(): Promise<void> {
    if (!this.whitelistPath) return

    try {
      if (fs.existsSync(this.whitelistPath)) {
        const content = await fs.promises.readFile(this.whitelistPath, 'utf-8')
        this.whitelistConfig = JSON.parse(content)
      } else {
        this.whitelistConfig = { entries: [], updatedAt: new Date().toISOString() }
      }
    } catch {
      this.whitelistConfig = { entries: [], updatedAt: new Date().toISOString() }
    }
  }

  /**
   * 保存白名单配置
   */
  private async saveWhitelist(): Promise<void> {
    if (!this.whitelistPath || !this.whitelistConfig) return

    this.whitelistConfig.updatedAt = new Date().toISOString()
    await fs.promises.writeFile(this.whitelistPath, JSON.stringify(this.whitelistConfig, null, 2), 'utf-8')
  }

  /**
   * 计算 SKILL 路径的 hash
   */
  private calculatePathHash(skillPath: string): string {
    return crypto.createHash('md5').update(skillPath).digest('hex')
  }

  /**
   * 检查 SKILL 是否在白名单中
   */
  isSkillTrusted(skillId: string, skillPath: string): boolean {
    if (!this.whitelistConfig) return false

    const entry = this.whitelistConfig.entries.find((e) => e.skillId === skillId)
    if (!entry) return false

    // 检查路径 hash 是否匹配（检测 SKILL 是否被修改）
    const currentHash = this.calculatePathHash(skillPath)
    return entry.pathHash === currentHash
  }

  /**
   * 添加 SKILL 到白名单
   */
  async trustSkill(skillId: string, skillName: string, skillPath: string): Promise<void> {
    if (!this.whitelistConfig) return

    const existingIndex = this.whitelistConfig.entries.findIndex((e) => e.skillId === skillId)
    const entry: SkillWhitelistEntry = {
      skillId,
      skillName,
      addedAt: new Date().toISOString(),
      pathHash: this.calculatePathHash(skillPath),
    }

    if (existingIndex >= 0) {
      this.whitelistConfig.entries[existingIndex] = entry
    } else {
      this.whitelistConfig.entries.push(entry)
    }

    await this.saveWhitelist()
  }

  /**
   * 从白名单移除 SKILL
   */
  async untrustSkill(skillId: string): Promise<void> {
    if (!this.whitelistConfig) return

    this.whitelistConfig.entries = this.whitelistConfig.entries.filter((e) => e.skillId !== skillId)
    await this.saveWhitelist()
  }

  /**
   * 扫描并加载所有 SKILL（从项目目录）
   */
  async loadSkills(projectPath: string): Promise<DynamicSkill[]> {
    this.skillsCache.clear()
    const skills: DynamicSkill[] = []

    // 加载项目 SKILL 目录: .novelhelper/data/ai-assistant/skills
    const skillsDir = path.join(projectPath, '.novelhelper', 'data', 'ai-assistant', 'skills')
    if (fs.existsSync(skillsDir)) {
      const skillDirs = await fs.promises.readdir(skillsDir, { withFileTypes: true })

      for (const dirent of skillDirs) {
        if (!dirent.isDirectory()) continue

        const skillId = dirent.name
        const skillPath = path.join(skillsDir, skillId)

        try {
          const skill = await this.loadSkill(skillId, skillPath)
          if (skill) {
            this.skillsCache.set(skillId, skill)
            skills.push(skill)
          }
        } catch (err) {
          this.logger.error(`Failed to load skill ${skillId}`, err)
        }
      }
    }

    return skills
  }

  /**
   * 加载单个 SKILL
   */
  private async loadSkill(skillId: string, skillPath: string): Promise<DynamicSkill | null> {
    const skillMdPath = path.join(skillPath, 'SKILL.md')
    const toolsJsonPath = path.join(skillPath, 'tools.json')

    // 必须有 SKILL.md
    if (!fs.existsSync(skillMdPath)) {
      return null
    }

    // 读取并解析 SKILL.md
    const skillMdContent = await fs.promises.readFile(skillMdPath, 'utf-8')
    const { metadata, body } = this.parseSkillMd(skillMdContent)

    // 读取 tools.json（可选）
    let tools: DynamicSkillTool[] = []
    if (fs.existsSync(toolsJsonPath)) {
      try {
        const toolsContent = await fs.promises.readFile(toolsJsonPath, 'utf-8')
        tools = JSON.parse(toolsContent)
      } catch (err) {
        this.logger.error(`Failed to parse tools.json for ${skillId}`, err)
      }
    }

    // 如果没有 tools.json，尝试从脚本目录推断工具
    if (tools.length === 0) {
      tools = await this.inferToolsFromScripts(skillPath)
    }

    return {
      id: skillId,
      path: skillPath,
      metadata,
      tools,
      instructions: body,
      isTrusted: this.isSkillTrusted(skillId, skillPath),
    }
  }

  /**
   * 解析 SKILL.md 文件
   */
  private parseSkillMd(content: string): { metadata: DynamicSkillMetadata; body: string } {
    // 解析 YAML frontmatter
    const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)

    if (frontmatterMatch) {
      try {
        const frontmatter = yaml.load(frontmatterMatch[1]) as Record<string, unknown>
        const body = frontmatterMatch[2]

        const metadata: DynamicSkillMetadata = {
          name: (frontmatter.name as string) || 'Unnamed Skill',
          description: (frontmatter.description as string) || '',
          version: frontmatter.version as string | undefined,
          author: frontmatter.author as string | undefined,
          dependencies: frontmatter.dependencies as string[] | undefined,
          tags: frontmatter.tags as string[] | undefined,
          requiresConfirmation: frontmatter.requiresConfirmation as boolean | undefined,
          timeout: frontmatter.timeout as number | undefined,
        }

        return { metadata, body }
      } catch (err) {
        this.logger.error('Failed to parse SKILL.md frontmatter', err)
      }
    }

    // 没有 frontmatter，使用默认值
    return {
      metadata: {
        name: 'Unnamed Skill',
        description: '',
      },
      body: content,
    }
  }

  /**
   * 从脚本目录推断工具定义
   */
  private async inferToolsFromScripts(skillPath: string): Promise<DynamicSkillTool[]> {
    const scriptsDir = path.join(skillPath, 'scripts')
    if (!fs.existsSync(scriptsDir)) {
      return []
    }

    const tools: DynamicSkillTool[] = []
    const scriptFiles = await fs.promises.readdir(scriptsDir)

    for (const file of scriptFiles) {
      // 支持 .py 和 .js 脚本
      if (file.endsWith('.py') || file.endsWith('.js')) {
        const toolId = path.basename(file, path.extname(file))
        const scriptPath = path.join(scriptsDir, file)
        
        // 尝试从脚本注释中提取描述
        const description = await this.extractScriptDescription(scriptPath)

        tools.push({
          id: toolId,
          name: toolId.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2'),
          description,
          parameters: [], // 需要在 tools.json 中明确定义
        })
      }
    }

    return tools
  }

  /**
   * 从脚本文件中提取描述（解析注释）
   */
  private async extractScriptDescription(scriptPath: string): Promise<string> {
    try {
      const content = await fs.promises.readFile(scriptPath, 'utf-8')
      const lines = content.split('\n')

      // 查找脚本开头的文档字符串或注释
      for (const line of lines.slice(0, 20)) {
        // Python docstring
        const docstringMatch = line.match(/^['"]{3}\s*(.+?)\s*['"]{3}$/)
        if (docstringMatch) {
          return docstringMatch[1]
        }

        // Python/JS comment
        const commentMatch = line.match(/^(?:#|\/\/)\s*(.+?)\s*$/)
        if (commentMatch) {
          return commentMatch[1]
        }
      }
    } catch {
      // ignore
    }

    return '执行脚本操作'
  }

  /**
   * 获取缓存的 SKILL
   */
  getSkill(skillId: string): DynamicSkill | undefined {
    return this.skillsCache.get(skillId)
  }

  getWhitelistEntries(): SkillWhitelistEntry[] {
    return this.whitelistConfig?.entries || []
  }

  /**
   * 获取所有缓存的 SKILL
   */
  getAllSkills(): DynamicSkill[] {
    return Array.from(this.skillsCache.values())
  }

  /**
   * 执行 SKILL 工具
   */
  async executeTool(
    request: DynamicSkillExecutionRequest,
    onOutput?: (line: string) => void,
  ): Promise<DynamicSkillExecutionResult> {
    const { skillId, toolId, parameters, context } = request
    const executionId = `${skillId}-${toolId}-${Date.now()}`

    const result: DynamicSkillExecutionResult = {
      executionId,
      status: 'pending',
      outputLines: [],
    }

    const skill = this.skillsCache.get(skillId)
    if (!skill) {
      result.status = 'error'
      result.error = `SKILL not found: ${skillId}`
      return result
    }

    const tool = skill.tools.find((t) => t.id === toolId)
    if (!tool) {
      result.status = 'error'
      result.error = `Tool not found: ${toolId} in SKILL ${skillId}`
      return result
    }

    // 执行脚本
    const scriptsDir = path.join(skill.path, 'scripts')
    const scriptPath = this.findScript(scriptsDir, toolId)

    if (!scriptPath) {
      result.status = 'error'
      result.error = `Script not found for tool: ${toolId}`
      return result
    }

    return this.executeScript(executionId, scriptPath, parameters, context, tool.timeout || skill.metadata.timeout, onOutput)
  }

  /**
   * 查找脚本文件
   */
  private findScript(scriptsDir: string, toolId: string): string | null {
    if (toolId.includes('/') || toolId.includes('\\') || toolId.includes('..')) {
      this.logger.error(`Invalid toolId detected (path traversal attempt): ${toolId}`)
      return null
    }

    const extensions = ['.py', '.js']
    for (const ext of extensions) {
      const scriptPath = path.join(scriptsDir, `${toolId}${ext}`)
      const resolved = path.resolve(scriptPath)
      const resolvedDir = path.resolve(scriptsDir)
      if (!resolved.startsWith(resolvedDir + path.sep) && resolved !== resolvedDir) {
        this.logger.error(`Script path escapes scripts directory: ${resolved}`)
        return null
      }
      if (fs.existsSync(scriptPath)) {
        return scriptPath
      }
    }
    return null
  }

  /**
   * 执行脚本
   */
  private executeScript(
    executionId: string,
    scriptPath: string,
    parameters: Record<string, unknown>,
    context: SkillExecutionContext,
    timeout: number | undefined,
    onOutput?: (line: string) => void,
  ): Promise<DynamicSkillExecutionResult> {
    return new Promise((resolve) => {
      const result: DynamicSkillExecutionResult = {
        executionId,
        status: 'running',
        outputLines: [],
      }

      const startTime = Date.now()
      const timeoutMs = timeout || 30000

      // 准备环境变量和参数
      const env = {
        ...process.env,
        NANAMI_PROJECT_PATH: context.projectPath,
        NANAMI_CURRENT_CHAPTER: context.currentChapter?.path || '',
      }

      // 将参数和环境作为 JSON 传递给脚本
      const inputData = JSON.stringify({
        parameters,
        context: {
          projectPath: context.projectPath,
          currentChapterPath: context.currentChapter?.path,
          currentChapterContent: context.currentChapter?.content,
          selectedText: context.selectedText,
        },
      })

      let command: string
      let args: string[]

      if (scriptPath.endsWith('.py')) {
        command = 'python'
        args = [scriptPath]
      } else {
        command = 'node'
        args = [scriptPath]
      }

      const proc = spawn(command, args, {
        cwd: path.dirname(scriptPath),
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      })

      this.runningProcesses.set(executionId, proc)

      // 设置超时
      const timeoutHandle = setTimeout(() => {
        result.status = 'timeout'
        result.error = `Execution timed out after ${timeoutMs}ms`
        result.duration = Date.now() - startTime
        proc.kill()
        this.runningProcesses.delete(executionId)
        resolve(result)
      }, timeoutMs)

      // 写入输入数据
      proc.stdin?.write(inputData)
      proc.stdin?.end()

      // 收集输出
      proc.stdout?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter((l) => l.trim())
        for (const line of lines) {
          result.outputLines.push(line)
          result.status = 'streaming'
          onOutput?.(line)
        }
      })

      proc.stderr?.on('data', (data: Buffer) => {
        const lines = data.toString().split('\n').filter((l) => l.trim())
        for (const line of lines) {
          result.outputLines.push(`[stderr] ${line}`)
          onOutput?.(`[stderr] ${line}`)
        }
      })

      proc.on('close', (code) => {
        clearTimeout(timeoutHandle)
        this.runningProcesses.delete(executionId)

        result.exitCode = code ?? undefined
        result.duration = Date.now() - startTime

        if (result.status !== 'timeout') {
          result.status = code === 0 ? 'completed' : 'error'

          // 尝试从输出中提取结果（JSON 格式的最后一行）
          if (result.outputLines.length > 0) {
            const lastLine = result.outputLines[result.outputLines.length - 1]
            try {
              result.result = JSON.parse(lastLine)
            } catch {
              // 不是 JSON，保持为原始输出
              result.result = result.outputLines.join('\n')
            }
          }

          if (code !== 0) {
            result.error = `Script exited with code ${code}`
          }
        }

        resolve(result)
      })

      proc.on('error', (err) => {
        clearTimeout(timeoutHandle)
        this.runningProcesses.delete(executionId)

        result.status = 'error'
        result.error = err.message
        result.duration = Date.now() - startTime
        resolve(result)
      })
    })
  }

  /**
   * 取消执行中的 SKILL
   */
  cancelExecution(executionId: string): boolean {
    const proc = this.runningProcesses.get(executionId)
    if (proc) {
      proc.kill()
      this.runningProcesses.delete(executionId)
      return true
    }
    return false
  }

  /**
   * 清理资源
   */
  cleanup(): void {
    for (const proc of this.runningProcesses.values()) {
      proc.kill()
    }
    this.runningProcesses.clear()
  }

  /**
   * 获取 SKILL 目录路径
   */
  private getSkillsDir(): string | null {
    if (!this.currentProjectPath) return null
    return path.join(this.currentProjectPath, '.novelhelper', 'data', 'ai-assistant', 'skills')
  }

  /**
   * 创建新 SKILL
   */
  async createSkill(options: CreateSkillOptions): Promise<DynamicSkill> {
    const skillsDir = this.getSkillsDir()
    if (!skillsDir) {
      throw new Error('No project opened')
    }

    // 验证 ID 格式（只允许字母、数字、连字符、下划线）
    if (!/^[a-zA-Z0-9_-]+$/.test(options.id)) {
      throw new Error('SKILL ID 只能包含字母、数字、连字符和下划线')
    }

    // 检查 ID 是否已存在
    const skillPath = path.join(skillsDir, options.id)
    if (fs.existsSync(skillPath)) {
      throw new Error(`SKILL "${options.id}" 已存在`)
    }

    // 创建目录结构
    await fs.promises.mkdir(skillPath, { recursive: true })
    await fs.promises.mkdir(path.join(skillPath, 'scripts'), { recursive: true })

    // 生成 SKILL.md 内容
    const skillMdContent = this.generateSkillMd({
      name: options.name,
      description: options.description,
      version: options.version,
      author: options.author,
      tags: options.tags,
    }, options.instructions || '')

    // 写入 SKILL.md
    await fs.promises.writeFile(path.join(skillPath, 'SKILL.md'), skillMdContent, 'utf-8')

    // 如果有工具定义，写入 tools.json
    if (options.tools && options.tools.length > 0) {
      await fs.promises.writeFile(
        path.join(skillPath, 'tools.json'),
        JSON.stringify(options.tools, null, 2),
        'utf-8'
      )
    }

    // 加载并返回新创建的 SKILL
    const skill = await this.loadSkill(options.id, skillPath)
    if (!skill) {
      throw new Error('Failed to load created SKILL')
    }

    this.skillsCache.set(options.id, skill)
    return skill
  }

  /**
   * 更新 SKILL
   */
  async updateSkill(skillId: string, options: UpdateSkillOptions): Promise<DynamicSkill> {
    const skill = this.skillsCache.get(skillId)
    if (!skill) {
      throw new Error(`SKILL "${skillId}" not found`)
    }

    const skillPath = skill.path
    const skillMdPath = path.join(skillPath, 'SKILL.md')
    const toolsJsonPath = path.join(skillPath, 'tools.json')

    // 读取现有的 SKILL.md
    const existingContent = await fs.promises.readFile(skillMdPath, 'utf-8')
    const { metadata, body } = this.parseSkillMd(existingContent)

    // 合并元数据
    const newMetadata: DynamicSkillMetadata = {
      name: options.name ?? metadata.name,
      description: options.description ?? metadata.description,
      version: options.version ?? metadata.version,
      author: options.author ?? metadata.author,
      tags: options.tags ?? metadata.tags,
      requiresConfirmation: metadata.requiresConfirmation,
      timeout: metadata.timeout,
    }

    // 生成新的 SKILL.md 内容
    const newInstructions = options.instructions ?? body
    const newSkillMdContent = this.generateSkillMd(newMetadata, newInstructions)

    // 写入 SKILL.md
    await fs.promises.writeFile(skillMdPath, newSkillMdContent, 'utf-8')

    // 如果提供了工具定义，更新 tools.json
    if (options.tools !== undefined) {
      await fs.promises.writeFile(toolsJsonPath, JSON.stringify(options.tools, null, 2), 'utf-8')
    }

    // 重新加载 SKILL
    const updatedSkill = await this.loadSkill(skillId, skillPath)
    if (!updatedSkill) {
      throw new Error('Failed to reload updated SKILL')
    }

    this.skillsCache.set(skillId, updatedSkill)
    return updatedSkill
  }

  /**
   * 删除 SKILL（移动到回收站）
   */
  async deleteSkill(skillId: string): Promise<void> {
    const skill = this.skillsCache.get(skillId)
    if (!skill) {
      throw new Error(`SKILL "${skillId}" not found`)
    }

    // 从白名单中移除
    await this.untrustSkill(skillId)

    // 移动到回收站
    await shell.trashItem(skill.path)

    // 从缓存中移除
    this.skillsCache.delete(skillId)
  }

  /**
   * 生成 SKILL.md 文件内容
   */
  private generateSkillMd(metadata: DynamicSkillMetadata, instructions: string): string {
    const frontmatter: Record<string, unknown> = {
      name: metadata.name,
      description: metadata.description,
    }

    if (metadata.version) frontmatter.version = metadata.version
    if (metadata.author) frontmatter.author = metadata.author
    if (metadata.tags && metadata.tags.length > 0) frontmatter.tags = metadata.tags
    if (metadata.requiresConfirmation !== undefined) frontmatter.requiresConfirmation = metadata.requiresConfirmation
    if (metadata.timeout !== undefined) frontmatter.timeout = metadata.timeout

    const frontmatterYaml = yaml.dump(frontmatter, { indent: 2, lineWidth: -1 })

    return `---\n${frontmatterYaml}---\n\n${instructions}`
  }
}

// 单例实例
export const dynamicSkillService = new DynamicSkillService()

/**
 * 便捷方法：初始化项目 SKILL
 */
export async function initProject(projectPath: string): Promise<void> {
  dynamicSkillService.setProjectPath(projectPath)
  await dynamicSkillService.loadSkills(projectPath)
}

/**
 * 便捷方法：清理项目资源
 */
export function clearProject(): void {
  dynamicSkillService.cleanup()
}
