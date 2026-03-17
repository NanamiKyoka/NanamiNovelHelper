import * as fs from 'fs'
import * as path from 'path'
import { v4 as uuidv4 } from 'uuid'
import JSON5 from 'json5'
import {
  VocabularyType,
  VocabularyEntry,
  SensitiveWord
} from '../types'
import {
  PROJECT_META_DIR,
  VOCABULARY_DIR,
  VOCABULARY_TYPES_FILE,
  VOCABULARY_DEFAULT_DIR,
  SENSITIVE_WORDS_FILE
} from '../types/project'

// 项目设置接口
interface ProjectSettings {
  autoCreateVocabularyFile: boolean // 创建词汇时是否自动创建 Markdown 文件
}

// 默认项目设置
const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  autoCreateVocabularyFile: false
}

class VocabularyService {
  private projectPath: string | null = null
  private settingsPath: string | null = null
  private vocabularyDir: string | null = null
  private vocabularyDefaultDir: string | null = null
  private sensitiveWordsPath: string | null = null
  private settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS

  // 初始化服务
  init(projectPath: string): void {
    this.projectPath = projectPath
    this.settingsPath = path.join(projectPath, PROJECT_META_DIR, 'settings.json5')
    this.vocabularyDir = path.join(projectPath, PROJECT_META_DIR, VOCABULARY_DIR)
    this.vocabularyDefaultDir = path.join(this.vocabularyDir, VOCABULARY_DEFAULT_DIR)
    this.sensitiveWordsPath = path.join(projectPath, PROJECT_META_DIR, SENSITIVE_WORDS_FILE)

    // 确保目录存在
    this.ensureDirectories()
    
    // 加载设置
    this.loadSettings()
  }

  // 确保必要的目录存在
  private ensureDirectories(): void {
    if (!this.projectPath || !this.vocabularyDir) return

    // 创建 .novelhelper 目录
    const metaDir = path.join(this.projectPath, PROJECT_META_DIR)
    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true })
    }

    // 创建词汇目录
    if (!fs.existsSync(this.vocabularyDir)) {
      fs.mkdirSync(this.vocabularyDir, { recursive: true })
    }

    // 创建预设类型目录
    if (!fs.existsSync(this.vocabularyDefaultDir!)) {
      fs.mkdirSync(this.vocabularyDefaultDir!, { recursive: true })
    }
  }

  // 加载项目设置
  private loadSettings(): void {
    if (!this.settingsPath) return

    if (fs.existsSync(this.settingsPath)) {
      try {
        const content = fs.readFileSync(this.settingsPath, 'utf-8')
        const saved = JSON5.parse(content)
        this.settings = { ...DEFAULT_PROJECT_SETTINGS, ...saved }
      } catch {
        this.settings = DEFAULT_PROJECT_SETTINGS
      }
    }
  }

  // 保存项目设置
  private saveSettings(): void {
    if (!this.settingsPath) return

    fs.writeFileSync(this.settingsPath, JSON5.stringify(this.settings, null, 2), 'utf-8')
  }

  // 获取设置
  getSettings(): ProjectSettings {
    return { ...this.settings }
  }

  // 更新设置
  updateSettings(settings: Partial<ProjectSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveSettings()
  }

  // 词汇类型管理

  // 获取词汇类型文件路径
  private getVocabularyTypesPath(): string {
    return path.join(this.vocabularyDir!, VOCABULARY_TYPES_FILE)
  }

  // 加载词汇类型
  loadVocabularyTypes(): VocabularyType[] {
    const typesPath = this.getVocabularyTypesPath()
    
    if (!fs.existsSync(typesPath)) {
      // 如果文件不存在，返回空数组
      // 项目创建时会根据用户选择的预设类型创建文件
      return []
    }

    try {
      const content = fs.readFileSync(typesPath, 'utf-8')
      return JSON5.parse(content)
    } catch (error) {
      console.error('Failed to load vocabulary types:', error)
      return []
    }
  }

  // 保存词汇类型
  saveVocabularyTypes(types: VocabularyType[]): void {
    const typesPath = this.getVocabularyTypesPath()
    fs.writeFileSync(typesPath, JSON5.stringify(types, null, 2), 'utf-8')
  }

  // 添加词汇类型
  addVocabularyType(type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>): VocabularyType {
    const types = this.loadVocabularyTypes()
    const now = new Date().toISOString()
    
    const newType: VocabularyType = {
      ...type,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    }
    
    types.push(newType)
    this.saveVocabularyTypes(types)
    
    return newType
  }

  // 更新词汇类型
  updateVocabularyType(id: string, updates: Partial<VocabularyType>): VocabularyType | null {
    const types = this.loadVocabularyTypes()
    const index = types.findIndex(t => t.id === id)
    
    if (index === -1) return null
    
    const now = new Date().toISOString()
    types[index] = {
      ...types[index],
      ...updates,
      updatedAt: now
    }
    
    this.saveVocabularyTypes(types)
    return types[index]
  }

  // 删除词汇类型
  deleteVocabularyType(id: string): boolean {
    const types = this.loadVocabularyTypes()
    const index = types.findIndex(t => t.id === id)
    
    if (index === -1) return false
    
    types.splice(index, 1)
    this.saveVocabularyTypes(types)
    
    // 删除对应的词汇条目文件
    const entriesPath = this.getVocabularyEntriesPath(id)
    if (fs.existsSync(entriesPath)) {
      fs.unlinkSync(entriesPath)
    }
    
    return true
  }

  // 词汇条目管理

  // 获取词汇条目文件路径（使用 uuid.json5 格式）
  private getVocabularyEntriesPath(typeId: string): string {
    // 直接使用类型 ID 作为文件名
    const fileName = `${typeId}.json5`
    
    // 获取类型信息判断是否为内置类型
    const types = this.loadVocabularyTypes()
    const type = types.find(t => t.id === typeId)
    
    // 检查是否为预设类型（内置类型）
    if (type?.isBuiltIn) {
      return path.join(this.vocabularyDefaultDir!, fileName)
    }
    
    return path.join(this.vocabularyDir!, fileName)
  }

  // 加载指定类型的词汇条目
  loadVocabularyEntries(typeId?: string): VocabularyEntry[] {
    if (typeId) {
      // 加载指定类型的条目
      const entriesPath = this.getVocabularyEntriesPath(typeId)
      
      if (!fs.existsSync(entriesPath)) {
        return []
      }
      
      try {
        const content = fs.readFileSync(entriesPath, 'utf-8')
        return JSON5.parse(content)
      } catch (error) {
        console.error(`Failed to load vocabulary entries for type ${typeId}:`, error)
        return []
      }
    } else {
      // 加载所有类型的条目
      const allEntries: VocabularyEntry[] = []
      const types = this.loadVocabularyTypes()
      
      for (const type of types) {
        const entries = this.loadVocabularyEntries(type.id)
        allEntries.push(...entries)
      }
      
      return allEntries
    }
  }

  // 保存指定类型的词汇条目
  saveVocabularyEntries(typeId: string, entries: VocabularyEntry[]): void {
    const entriesPath = this.getVocabularyEntriesPath(typeId)
    
    // 确保目录存在
    const dir = path.dirname(entriesPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(entriesPath, JSON5.stringify(entries, null, 2), 'utf-8')
  }

  // 添加词汇条目
  addVocabularyEntry(entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt'>): VocabularyEntry {
    const entries = this.loadVocabularyEntries(entry.typeId)
    const now = new Date().toISOString()
    
    const newEntry: VocabularyEntry = {
      ...entry,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    }
    
    entries.push(newEntry)
    this.saveVocabularyEntries(entry.typeId, entries)
    
    // 如果启用了自动创建 Markdown 文件
    if (this.settings.autoCreateVocabularyFile) {
      this.createLinkedMarkdownFile(newEntry)
    }
    
    return newEntry
  }

  // 更新词汇条目
  updateVocabularyEntry(id: string, updates: Partial<VocabularyEntry>): VocabularyEntry | null {
    // 先找到条目属于哪个类型
    const allEntries = this.loadVocabularyEntries()
    const existingEntry = allEntries.find(e => e.id === id)
    
    if (!existingEntry) return null
    
    const entries = this.loadVocabularyEntries(existingEntry.typeId)
    const index = entries.findIndex(e => e.id === id)
    
    if (index === -1) return null
    
    const now = new Date().toISOString()
    entries[index] = {
      ...entries[index],
      ...updates,
      updatedAt: now
    }
    
    this.saveVocabularyEntries(existingEntry.typeId, entries)
    return entries[index]
  }

  // 删除词汇条目
  deleteVocabularyEntry(id: string): boolean {
    // 先找到条目属于哪个类型
    const allEntries = this.loadVocabularyEntries()
    const existingEntry = allEntries.find(e => e.id === id)
    
    if (!existingEntry) return false
    
    const entries = this.loadVocabularyEntries(existingEntry.typeId)
    const index = entries.findIndex(e => e.id === id)
    
    if (index === -1) return false
    
    entries.splice(index, 1)
    this.saveVocabularyEntries(existingEntry.typeId, entries)
    
    return true
  }

  // 关联 Markdown 文件管理

  // 获取词汇详细描述目录
  private getVocabularyDetailDir(): string {
    return path.join(this.projectPath!, '设定', '词汇详情')
  }

  // 创建关联的 Markdown 文件
  createLinkedMarkdownFile(entry: VocabularyEntry): string | null {
    if (!this.projectPath) return null
    
    const detailDir = this.getVocabularyDetailDir()
    if (!fs.existsSync(detailDir)) {
      fs.mkdirSync(detailDir, { recursive: true })
    }
    
    // 使用类型名和条目名作为文件名
    const safeTypeName = entry.typeName.replace(/[\\/:*?"<>|]/g, '_')
    const safeEntryName = entry.name.replace(/[\\/:*?"<>|]/g, '_')
    const fileName = `${safeTypeName}_${safeEntryName}.md`
    const filePath = path.join(detailDir, fileName)
    
    // 创建 Markdown 内容
    const content = `---
id: ${entry.id}
type: ${entry.typeName}
name: ${entry.name}
createdAt: ${entry.createdAt}
updatedAt: ${new Date().toISOString()}
---

# ${entry.name}

${entry.description || '详细描述...'}
`
    
    fs.writeFileSync(filePath, content, 'utf-8')
    
    // 更新条目的链接路径（相对于项目根目录）
    const relativePath = path.relative(this.projectPath, filePath)
    this.updateVocabularyEntry(entry.id, { linkedFilePath: relativePath })
    
    return relativePath
  }

  // 手动链接到现有文件
  linkToMarkdownFile(entryId: string, filePath: string): boolean {
    const relativePath = path.relative(this.projectPath!, filePath)
    const result = this.updateVocabularyEntry(entryId, { linkedFilePath: relativePath })
    return result !== null
  }

  // 取消链接
  unlinkMarkdownFile(entryId: string): boolean {
    const result = this.updateVocabularyEntry(entryId, { linkedFilePath: undefined })
    return result !== null
  }

  // 敏感词管理

  // 加载敏感词
  loadSensitiveWords(): SensitiveWord[] {
    if (!this.sensitiveWordsPath) return []
    
    if (!fs.existsSync(this.sensitiveWordsPath)) {
      return []
    }
    
    try {
      const content = fs.readFileSync(this.sensitiveWordsPath, 'utf-8')
      return JSON5.parse(content)
    } catch (error) {
      console.error('Failed to load sensitive words:', error)
      return []
    }
  }

  // 保存敏感词
  saveSensitiveWords(words: SensitiveWord[]): void {
    if (!this.sensitiveWordsPath) return
    
    // 确保目录存在
    const dir = path.dirname(this.sensitiveWordsPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    
    fs.writeFileSync(this.sensitiveWordsPath, JSON5.stringify(words, null, 2), 'utf-8')
  }

  // 添加敏感词
  addSensitiveWord(word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>): SensitiveWord {
    const words = this.loadSensitiveWords()
    const now = new Date().toISOString()
    
    const newWord: SensitiveWord = {
      ...word,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now
    }
    
    words.push(newWord)
    this.saveSensitiveWords(words)
    
    return newWord
  }

  // 更新敏感词
  updateSensitiveWord(id: string, updates: Partial<SensitiveWord>): SensitiveWord | null {
    const words = this.loadSensitiveWords()
    const index = words.findIndex(w => w.id === id)
    
    if (index === -1) return null
    
    const now = new Date().toISOString()
    words[index] = {
      ...words[index],
      ...updates,
      updatedAt: now
    }
    
    this.saveSensitiveWords(words)
    return words[index]
  }

  // 删除敏感词
  deleteSensitiveWord(id: string): boolean {
    const words = this.loadSensitiveWords()
    const index = words.findIndex(w => w.id === id)
    
    if (index === -1) return false
    
    words.splice(index, 1)
    this.saveSensitiveWords(words)
    
    return true
  }

  // 批量导入敏感词
  importSensitiveWords(words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>>): number {
    const existingWords = this.loadSensitiveWords()
    const now = new Date().toISOString()
    
    let imported = 0
    for (const word of words) {
      // 检查是否已存在
      if (existingWords.some(w => w.name === word.name)) {
        continue
      }
      
      const newWord: SensitiveWord = {
        ...word,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now
      }
      
      existingWords.push(newWord)
      imported++
    }
    
    this.saveSensitiveWords(existingWords)
    return imported
  }
}

// 单例导出
export const vocabularyService = new VocabularyService()