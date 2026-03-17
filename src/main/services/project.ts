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
  ProjectDirectoryType,
  ProjectTemplateType,
  PresetVocabularyType,
  DEFAULT_DIRECTORIES
} from '../types/project'

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

  /**
   * 创建新项目
   */
  async createProject(options: CreateProjectOptions): Promise<Project> {
    const { name, parentPath, description, author, tags, directories, templates, presetVocabulary } = options

    // 验证项目名称
    if (!name || name.trim().length === 0) {
      throw new Error('项目名称不能为空')
    }

    // 验证名称是否包含非法字符
    const invalidChars = /[<>:"/\\|?*]/
    if (invalidChars.test(name)) {
      throw new Error('项目名称包含非法字符')
    }

    // 构建项目路径
    const projectPath = join(parentPath, name)

    // 检查目录是否已存在
    if (existsSync(projectPath)) {
      throw new Error(`目录 "${name}" 已存在`)
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
    await this.createProjectStructure(projectPath, directories)

    // 创建项目配置文件
    await this.saveProjectConfig(project)

    // 创建模板文件
    await this.createTemplateFiles(projectPath, templates, project)

    // 创建默认设定文件（包含预设词汇类型）
    await this.createDefaultSettingsFiles(projectPath, presetVocabulary)

    return project
  }

  /**
   * 创建项目目录结构
   */
  private async createProjectStructure(
    projectPath: string, 
    directories: ProjectDirectoryType[] = ['content', 'draft', 'reference']
  ): Promise<void> {
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

    // 根据选择的目录类型创建目录
    const directoryMap: Record<ProjectDirectoryType, string> = {
      content: '内容',
      draft: '草稿',
      reference: '参考资料'
    }

    for (const dirType of directories) {
      const dirName = directoryMap[dirType]
      if (dirName) {
        mkdirSync(join(projectPath, dirName), { recursive: true })
      }
    }
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
   * 创建模板文件
   */
  private async createTemplateFiles(
    projectPath: string, 
    templates: ProjectTemplateType[] = [],
    project: Project
  ): Promise<void> {
    for (const templateType of templates) {
      switch (templateType) {
        case 'chapter': {
          const contentDir = join(projectPath, '内容')
          if (existsSync(contentDir)) {
            const chapterPath = join(contentDir, '章节模板.md')
            if (!existsSync(chapterPath)) {
              writeFileSync(chapterPath, this.getChapterTemplate(), 'utf-8')
            }
          }
          break
        }
        case 'character': {
          const contentDir = join(projectPath, '内容')
          if (existsSync(contentDir)) {
            const characterPath = join(contentDir, '人物卡模板.md')
            if (!existsSync(characterPath)) {
              writeFileSync(characterPath, this.getCharacterTemplate(), 'utf-8')
            }
          }
          break
        }
        case 'worldSetting': {
          // 世界观设定模板放到项目根目录
          const worldSettingPath = join(projectPath, '世界观设定.md')
          if (!existsSync(worldSettingPath)) {
            writeFileSync(worldSettingPath, this.getWorldSettingTemplate(), 'utf-8')
          }
          break
        }
        case 'readme': {
          const readmePath = join(projectPath, 'README.md')
          if (!existsSync(readmePath)) {
            writeFileSync(readmePath, this.getReadmeTemplate(project), 'utf-8')
          }
          break
        }
      }
    }
  }

  /**
   * 章节模板内容
   */
  private getChapterTemplate(): string {
    return `# 章节标题

> 章节简介或备注（可选）

---

## 第一节

在此输入正文内容...

<!-- 
  写作提示：
  - 使用二级标题（##）分隔不同场景或时间线
  - 使用三级标题（###）分隔小节
  - 可以使用引用（>）添加备注或灵感
-->
`
  }

  /**
   * 人物卡模板内容
   */
  private getCharacterTemplate(): string {
    return `---
name: 人物名称
aliases: 
  - 别名1
  - 别名2
age: 年龄
gender: 性别
role: 主角/配角/反派/路人
---

# 人物名称

## 基本信息

| 属性 | 内容 |
|------|------|
| 姓名 | 人物名称 |
| 年龄 | |
| 性别 | |
| 身份 | |
| 职业 | |

## 外貌特征

描述人物的外貌特征...

## 性格特点

- 性格特点1
- 性格特点2
- 性格特点3

## 背景故事

人物背景故事...

## 人物关系

| 人物 | 关系 | 备注 |
|------|------|------|
| | | |

## 重要事件

- [ ] 事件1
- [ ] 事件2

## 备注

其他需要记录的信息...
`
  }

  /**
   * 世界观设定模板内容
   */
  private getWorldSettingTemplate(): string {
    return `# 世界观设定

## 世界背景

描述故事发生的世界背景...

## 历史背景

### 重要历史事件

| 时间 | 事件 | 影响 |
|------|------|------|
| | | |

## 地理环境

### 主要地点

| 地点名称 | 描述 | 相关剧情 |
|---------|------|---------|
| | | |

## 社会结构

### 势力/组织

| 名称 | 领导者 | 目的 | 与主角关系 |
|------|--------|------|-----------|
| | | | |

## 魔法/科技体系

### 能力设定

| 能力名称 | 描述 | 限制 |
|---------|------|------|
| | | |

## 种族/族群

| 种族名称 | 特点 | 分布 |
|---------|------|------|
| | | |

## 其他设定

### 货币/经济

### 宗教/信仰

### 风俗习惯
`
  }

  /**
   * README 模板内容
   */
  private getReadmeTemplate(project: Project): string {
    return `# ${project.name}

${project.description || '这是一个小说创作项目。'}

## 项目信息

| 属性 | 内容 |
|------|------|
| 作者 | ${project.author || '未知'} |
| 创建时间 | ${new Date(project.createdAt).toLocaleDateString('zh-CN')} |
| 标签 | ${project.tags.length > 0 ? project.tags.join(', ') : '无'} |

## 目录结构

\`\`\`
${project.name}/
├── 内容/              # 小说正文章节
├── 草稿/              # 草稿、废案、灵感
├── 参考资料/          # 参考资料、大纲等
└── .novelhelper/      # 项目配置（不要手动修改）
    ├── settings.json5       # 项目设置
    ├── sensitive-words.json5 # 敏感词表
    └── vocabulary/          # 词汇库
        ├── types.json5      # 词汇类型
        └── default/         # 预设词汇类型
\`\`\`

## 写作进度

| 章节 | 状态 | 字数 | 备注 |
|------|------|------|------|
| 第一章 | 进行中 | 0 | |

---

> 由 NanamiNovelHelper 创建
`
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
    // 验证路径是否存在
    if (!existsSync(path)) {
      throw new Error('项目路径不存在')
    }

    // 检查是否是目录
    const stats = statSync(path)
    if (!stats.isDirectory()) {
      throw new Error('指定路径不是目录')
    }

    // 检查项目配置文件
    const configPath = join(path, PROJECT_CONFIG_FILE)
    if (!existsSync(configPath)) {
      throw new Error('不是有效的项目目录：缺少项目配置文件')
    }

    // 读取项目配置
    const project = await this.loadProjectConfig(path)

    // 更新当前项目
    this.currentProject = project

    // 添加到最近项目列表
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

    // 解析 YAML frontmatter
    const match = content.match(/^---\n([\s\S]*?)\n---/)
    if (!match) {
      throw new Error('项目配置文件格式错误')
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
      throw new Error(`解析项目配置失败: ${error}`)
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
      throw new Error('没有打开的项目')
    }

    // 更新项目信息
    this.currentProject = {
      ...this.currentProject,
      ...info,
      path: this.currentProject.path, // 路径不允许修改
      id: this.currentProject.id, // ID 不允许修改
      createdAt: this.currentProject.createdAt, // 创建时间不允许修改
      updatedAt: new Date().toISOString()
    }

    // 保存配置
    await this.saveProjectConfig(this.currentProject)

    // 更新最近项目列表
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
        } else if (item.isFile() && item.name.endsWith('.md')) {
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
}

// 导出单例
export const projectService = new ProjectService()
