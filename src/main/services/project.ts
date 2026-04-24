/**
 * 项目管理服务
 * 负责项目的创建、打开、配置管理等
 */

import { app, dialog } from 'electron'
import { join, resolve } from 'path'
import { existsSync, mkdirSync, readdirSync, writeFileSync, readFileSync, statSync } from 'fs'
import { v4 as uuidv4 } from 'uuid'
import Store from 'electron-store'
import yaml from 'js-yaml'
import JSON5 from 'json5'
import {
  Project,
  CreateProjectOptions,
  RecentProject,
  PROJECT_CONFIG_FILE,
  PROJECT_META_DIR,
  PROJECT_SETTINGS_FILE,
  VOCABULARY_DIR,
  VOCABULARY_TYPES_FILE,
  VOCABULARY_DEFAULT_DIR,
  SENSITIVE_WORDS_FILE,
  BACKUP_DIR,
  PresetVocabularyType
} from '../types/project'
import { vocabularyService } from './vocabulary'
import { projectSettingsService } from './projectSettings'
import { highlightService } from './highlight'
import { relationshipService } from './relationship'
import { timelineService } from './timeline'
import { sequenceChartService } from './sequence-chart'
import { organizationService } from './organization'
import { fileService } from './file'
import { createLogger } from '../utils/logger'
import { ServiceError, ErrorCode, Errors } from '../../shared/errors'

/**
 * 最近项目存储
 */
const recentProjectsStore = new Store<{ recent: RecentProject[] }>({
  name: 'recent-projects',
  defaults: {
    recent: []
  }
})

/**
 * 最大最近项目数量
 */
const MAX_RECENT_PROJECTS = 10

/**
 * 项目服务
 */
class ProjectService {
  private currentProject: Project | null = null
  private logger = createLogger('ProjectService')

  /**
   * 创建新项目
   */
  async createProject(options: CreateProjectOptions): Promise<Project> {
    const { name, parentPath, description, author, tags, presetVocabulary } = options

    if (!name || name.trim().length === 0) {
      throw new ServiceError(ErrorCode.INVALID_ARGUMENT, '项目名称不能为空', { module: 'ProjectService' })
    }

    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(name)) {
      throw new ServiceError(ErrorCode.INVALID_ARGUMENT, '项目名称包含非法字符', { module: 'ProjectService' })
    }

    const projectPath = join(parentPath, name)

    if (existsSync(projectPath)) {
      throw Errors.alreadyExists(`目录 "${name}"`, 'ProjectService')
    }

    // 创建项目 ID
    const projectId = uuidv4()
    const now = new Date().toISOString()

    // 创建项目对象
    const project: Project = {
      id: projectId,
      name: name.trim(),
      description,
      author,
      path: projectPath,
      tags: tags || [],
      createdAt: now,
      updatedAt: now
    }

    // 创建目录结构
    await this.createProjectStructure(projectPath)

    // 创建项目配置文件
    await this.saveProjectConfig(project)

    // 创建默认设定文件（包含预设词汇类型）
    await this.createDefaultSettingsFiles(projectPath, presetVocabulary)

    // 创建内置 SKILL
    await this.createBuiltinSkills(projectPath)

    return project
  }

  /**
   * 创建项目目录结构
   */
  private async createProjectStructure(projectPath: string): Promise<void> {
    // 主目录
    mkdirSync(projectPath, { recursive: true })

    // 元数据目录
    mkdirSync(join(projectPath, PROJECT_META_DIR), { recursive: true })

    // 词汇目录
    mkdirSync(join(projectPath, PROJECT_META_DIR, VOCABULARY_DIR), { recursive: true })

    // 预设词汇类型目录
    mkdirSync(join(projectPath, PROJECT_META_DIR, VOCABULARY_DIR, VOCABULARY_DEFAULT_DIR), { recursive: true })

    // 备份目录
    mkdirSync(join(projectPath, PROJECT_META_DIR, BACKUP_DIR), { recursive: true })

    // SKILL 目录: .novelhelper/data/ai-assistant/skills
    mkdirSync(join(projectPath, PROJECT_META_DIR, 'data', 'ai-assistant', 'skills'), { recursive: true })
  }

  /**
   * 创建默认设定文件
   */
  private async createDefaultSettingsFiles(
    projectPath: string, 
    presetVocabulary: PresetVocabularyType[] = []
  ): Promise<void> {
    // 项目设置文件
    const settingsPath = join(projectPath, PROJECT_META_DIR, PROJECT_SETTINGS_FILE)
    if (!existsSync(settingsPath)) {
      const defaultSettings = {
        // 编辑器设置
        editor: {
          fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
          fontSize: 16,
          lineHeight: 1.8,
          letterSpacing: 0,
          paragraphSpacing: 0.5,
          viewMode: 'wysiwyg',
          toolbarMode: 'fixed',
          showToolbar: true,
          autoSaveInterval: 30000,
          wordWrap: true,
          showLineNumbers: false,
          tabSize: 2,
          spellCheck: false,
          enablePreviewMode: false
        },
        // 高亮设置
        highlight: {
          vocabularyHighlight: true,
          sensitiveWordCheck: true
        },
        // 自动创建词汇文件
        autoCreateVocabularyFile: false,
        // 备份设置
        backup: {
          enabled: true,
          maxCount: 10
        }
      }
      writeFileSync(settingsPath, JSON5.stringify(defaultSettings, null, 2), 'utf-8')
    }

    // 敏感词文件
    const sensitivePath = join(projectPath, PROJECT_META_DIR, SENSITIVE_WORDS_FILE)
    if (!existsSync(sensitivePath)) {
      writeFileSync(sensitivePath, '// 敏感词表\n[]\n', 'utf-8')
    }

    // 词汇类型文件
    const vocabularyTypesPath = join(projectPath, PROJECT_META_DIR, VOCABULARY_DIR, VOCABULARY_TYPES_FILE)
    if (!existsSync(vocabularyTypesPath)) {
      // 根据用户选择的预设类型创建类型文件
      const { getBuiltInVocabularyTypes } = await import('../types/vocabulary')
      const builtInTypes = getBuiltInVocabularyTypes()
      const selectedTypes = builtInTypes.filter(t => presetVocabulary.includes(t.id as PresetVocabularyType))
      
      // 保存用户选择的类型（可以是空数组）
      writeFileSync(vocabularyTypesPath, JSON5.stringify(selectedTypes, null, 2), 'utf-8')
    }

    // 创建 .gitignore 文件，仅忽略设置文件
    const gitignorePath = join(projectPath, PROJECT_META_DIR, '.gitignore')
    if (!existsSync(gitignorePath)) {
      const gitignoreContent = `# 项目设置（包含用户偏好，不建议入库）
settings.json5

# 加密的敏感信息
encrypted-keys.json

# 备份文件
backup/
`
      writeFileSync(gitignorePath, gitignoreContent, 'utf-8')
    }
  }

  /**
   * 保存项目配置文件
   */
  private async saveProjectConfig(project: Project): Promise<void> {
    const configPath = join(project.path, PROJECT_CONFIG_FILE)

    // 构建 YAML frontmatter
    const frontmatter = {
      id: project.id,
      name: project.name,
      description: project.description,
      author: project.author,
      cover: project.cover,
      tags: project.tags,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt
    }

    const yamlContent = yaml.dump(frontmatter, { 
      sortKeys: true,
      quotingType: '"',
      forceQuotes: false
    })

    const content = `---\n${yamlContent}---\n\n# ${project.name}\n\n${project.description || ''}\n`

    writeFileSync(configPath, content, 'utf-8')
  }

  /**
   * 打开项目
   */
  async openProject(path: string): Promise<Project> {
    if (!existsSync(path)) {
      throw Errors.projectInvalidPath('项目路径不存在', 'ProjectService')
    }

    const stats = statSync(path)
    if (!stats.isDirectory()) {
      throw Errors.projectInvalidPath('指定路径不是目录', 'ProjectService')
    }

    const configPath = join(path, PROJECT_CONFIG_FILE)
    if (!existsSync(configPath)) {
      throw Errors.projectInvalidPath('不是有效的项目目录：缺少项目配置文件', 'ProjectService')
    }

    const project = await this.loadProjectConfig(path)

    this.currentProject = project

    this.addRecentProject({
      path: project.path,
      name: project.name,
      lastOpened: new Date().toISOString()
    })

    return project
  }

  /**
   * 加载项目配置
   */
  private async loadProjectConfig(projectPath: string): Promise<Project> {
    const configPath = join(projectPath, PROJECT_CONFIG_FILE)
    const content = readFileSync(configPath, 'utf-8')

    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) {
      throw new ServiceError(ErrorCode.DATA_INVALID, '项目配置文件格式错误', { module: 'ProjectService' })
    }

    try {
      const frontmatter = yaml.load(match[1]) as Record<string, unknown>

      const project: Project = {
        id: frontmatter.id as string,
        name: frontmatter.name as string,
        description: frontmatter.description as string | undefined,
        author: frontmatter.author as string | undefined,
        path: projectPath,
        cover: frontmatter.cover as string | undefined,
        tags: (frontmatter.tags as string[]) || [],
        createdAt: frontmatter.createdAt as string,
        updatedAt: frontmatter.updatedAt as string
      }

      return project
    } catch (error) {
      throw new ServiceError(ErrorCode.FILE_PARSE_ERROR, `解析项目配置失败: ${error}`, { module: 'ProjectService', cause: error })
    }
  }

  /**
   * 关闭项目
   */
  closeProject(): void {
    this.currentProject = null
  }

  /**
   * 获取当前项目
   */
  getCurrentProject(): Project | null {
    return this.currentProject
  }

  /**
   * 更新项目信息
   */
  async updateProjectInfo(info: Partial<Project>): Promise<Project> {
    if (!this.currentProject) {
      throw Errors.projectNotOpen('ProjectService')
    }

    this.currentProject = {
      ...this.currentProject,
      ...info,
      path: this.currentProject.path,
      id: this.currentProject.id,
      createdAt: this.currentProject.createdAt,
      updatedAt: new Date().toISOString()
    }

    await this.saveProjectConfig(this.currentProject)

    this.addRecentProject({
      path: this.currentProject.path,
      name: this.currentProject.name,
      lastOpened: new Date().toISOString()
    })

    return this.currentProject
  }

  /**
   * 获取最近项目列表
   */
  getRecentProjects(): RecentProject[] {
    const recent = recentProjectsStore.get('recent') || []
    
    // 过滤掉不存在的项目
    return recent.filter(item => existsSync(item.path))
  }

  /**
   * 添加到最近项目列表
   */
  addRecentProject(project: RecentProject): void {
    let recent = recentProjectsStore.get('recent') || []

    // 移除已存在的相同路径
    recent = recent.filter(item => item.path !== project.path)

    // 添加到列表开头
    recent.unshift(project)

    // 限制数量
    if (recent.length > MAX_RECENT_PROJECTS) {
      recent = recent.slice(0, MAX_RECENT_PROJECTS)
    }

    recentProjectsStore.set('recent', recent)
  }

  /**
   * 从最近项目列表移除
   */
  removeRecentProject(path: string): void {
    let recent = recentProjectsStore.get('recent') || []
    recent = recent.filter(item => item.path !== path)
    recentProjectsStore.set('recent', recent)
  }

  /**
   * 清空最近项目列表
   */
  clearRecentProjects(): void {
    recentProjectsStore.set('recent', [])
  }

  /**
   * 显示选择目录对话框
   */
  async showOpenDialog(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择项目目录',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: app.getPath('documents')
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  /**
   * 显示选择父目录对话框（用于创建项目）
   */
  async showCreateDialog(): Promise<string | null> {
    const result = await dialog.showOpenDialog({
      title: '选择项目保存位置',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: app.getPath('documents'),
      buttonLabel: '选择此文件夹'
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  }

  /**
   * 检查路径是否是有效项目
   */
  isValidProject(path: string): boolean {
    if (!existsSync(path)) {
      return false
    }

    const stats = statSync(path)
    if (!stats.isDirectory()) {
      return false
    }

    const configPath = join(path, PROJECT_CONFIG_FILE)
    return existsSync(configPath)
  }

  /**
   * 获取项目统计信息
   */
  async getProjectStats(projectPath: string): Promise<{
    totalFiles: number
    totalWords: number
    fileTypes: Record<string, number>
  }> {
    const stats = {
      totalFiles: 0,
      totalWords: 0,
      fileTypes: {} as Record<string, number>
    }

    const scanDir = (dir: string): void => {
      const items = readdirSync(dir, { withFileTypes: true })
      
      for (const item of items) {
        const fullPath = join(dir, item.name)
        
        if (item.isDirectory()) {
          // 跳过隐藏目录
          if (item.name.startsWith('.')) continue
          scanDir(fullPath)
        } else if (item.isFile() && (item.name.endsWith('.md') || item.name.endsWith('.novel'))) {
          stats.totalFiles++
          
          // 读取文件统计字数
          try {
            const content = readFileSync(fullPath, 'utf-8')
            // 移除 frontmatter
            const text = content.replace(/^---\n[\s\S]*?\n---\n/, '')
            stats.totalWords += this.countWords(text)
          } catch {
            // 忽略读取错误
          }
        }
      }
    }

    try {
      scanDir(projectPath)
    } catch {
      // 忽略扫描错误
    }

    return stats
  }

  /**
   * 统计字数（支持 CJK）
   */
  private countWords(text: string): number {
    // 移除空白字符
    const cleanText = text.replace(/\s/g, '')
    
    // 统计 CJK 字符
    const cjkChars = cleanText.match(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g)
    const cjkCount = cjkChars ? cjkChars.length : 0
    
    // 统计非 CJK 字符（按单词计算）
    const nonCjkText = cleanText.replace(/[\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g, ' ')
    const words = nonCjkText.match(/[a-zA-Z0-9]+/g)
    const wordCount = words ? words.length : 0
    
    return cjkCount + wordCount
  }

  /**
   * 获取项目初始化数据（聚合接口）
   * 一次性返回项目打开所需的所有数据，减少 IPC 调用次数
   */
  async getInitData(): Promise<import('../types/project').ProjectInitData> {
    if (!this.currentProject) {
      throw Errors.projectNotOpen('ProjectService')
    }

    // 并行获取所有数据
    const [
      settings,
      vocabularyTypes,
      vocabularyEntries,
      sensitiveWords,
      highlightConfig,
      relationshipGraphs,
      timelines,
      sequenceCharts,
      organizationGraphs
    ] = await Promise.all([
      Promise.resolve(projectSettingsService.getAll()),
      Promise.resolve(vocabularyService.loadVocabularyTypes()),
      Promise.resolve(vocabularyService.loadVocabularyEntries()),
      Promise.resolve(vocabularyService.loadSensitiveWords()),
      Promise.resolve(highlightService.loadConfig()),
      Promise.resolve(relationshipService.getList()),
      Promise.resolve(timelineService.getList()),
      Promise.resolve(sequenceChartService.getList()),
      Promise.resolve(organizationService.getList())
    ])

    // 获取文件树数据
    const showHiddenFiles = projectSettingsService.getShowHiddenFiles()
    const hiddenItems = projectSettingsService.getHiddenItems()
    const expandedFolders = projectSettingsService.getExpandedFolders()
    const tree = fileService.getFileTree(showHiddenFiles, { field: 'name', order: 'asc' }, hiddenItems)

    return {
      project: this.currentProject,
      settings,
      vocabularyTypes,
      vocabularyEntries,
      sensitiveWords,
      highlightConfig,
      relationshipGraphs,
      timelines,
      sequenceCharts,
      organizationGraphs,
      fileTree: {
        tree,
        expandedFolders,
        showHiddenFiles,
        hiddenItems
      }
    }
  }

  /**
   * 创建内置 SKILL
   * 从 builtin-skills 目录复制到项目的 .novelhelper/data/ai-assistant/skills 目录
   */
  private async createBuiltinSkills(projectPath: string): Promise<void> {
    const skillsDir = join(projectPath, PROJECT_META_DIR, 'data', 'ai-assistant', 'skills')
    
    // 内置 SKILL 源目录（编译后位于 out/main/builtin-skills/）
    const builtinSkillsSourceDir = join(__dirname, 'builtin-skills')
    
    if (!existsSync(builtinSkillsSourceDir)) {
      this.logger.warn(`Builtin skills directory not found: ${builtinSkillsSourceDir}`)
      return
    }
    
    // 递归复制所有内置 SKILL
    const copyDir = (src: string, dest: string): void => {
      mkdirSync(dest, { recursive: true })
      const entries = readdirSync(src, { withFileTypes: true })
      
      for (const entry of entries) {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)
        
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath)
        } else {
          // 复制文件
          const content = readFileSync(srcPath)
          writeFileSync(destPath, content)
        }
      }
    }
    
    // 遍历 builtin-skills 目录下的每个子目录（每个子目录是一个 SKILL）
    const skillDirs = readdirSync(builtinSkillsSourceDir, { withFileTypes: true })
    
    for (const dirent of skillDirs) {
      if (!dirent.isDirectory()) continue
      
      const skillId = dirent.name
      const srcPath = join(builtinSkillsSourceDir, skillId)
      const destPath = join(skillsDir, skillId)
      
      // 复制整个 SKILL 目录
      copyDir(srcPath, destPath)
      this.logger.info(`Copied builtin skill: ${skillId}`)
    }
  }
}

// 导出单例
export const projectService = new ProjectService()
