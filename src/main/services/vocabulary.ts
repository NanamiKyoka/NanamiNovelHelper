/**
 * 词汇服务
 * 
 * 管理词汇类型、词汇条目和敏感词的 CRUD 操作
 * 继承 ServiceCore 获得路径管理、ID 生成、JSON5 读写等基础能力
 */

import * as fs from 'fs'
import * as path from 'path'
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
  VOCABULARY_DETAILS_DIR,
  SENSITIVE_WORDS_FILE
} from '../types/project'
import { ensureInitialized } from '../../shared/errors'
import { ServiceCore } from './service-core'

interface ProjectSettings {
  autoCreateVocabularyFile: boolean
}

const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  autoCreateVocabularyFile: false
}

class VocabularyService extends ServiceCore {
  private settingsPath: string | null = null
  private vocabularyDir: string | null = null
  private vocabularyDefaultDir: string | null = null
  private vocabularyDetailsDir: string | null = null
  private sensitiveWordsPath: string | null = null
  private settings: ProjectSettings = DEFAULT_PROJECT_SETTINGS

  init(projectPath: string): void {
    this.projectPath = projectPath
    this.settingsPath = path.join(projectPath, PROJECT_META_DIR, 'settings.json5')
    this.vocabularyDir = path.join(projectPath, PROJECT_META_DIR, VOCABULARY_DIR)
    this.vocabularyDefaultDir = path.join(this.vocabularyDir, VOCABULARY_DEFAULT_DIR)
    this.vocabularyDetailsDir = path.join(this.vocabularyDir, VOCABULARY_DETAILS_DIR)
    this.sensitiveWordsPath = path.join(projectPath, PROJECT_META_DIR, SENSITIVE_WORDS_FILE)

    this.ensureDirectories()
    this.loadSettings()
  }

  protected ensureDirectories(): void {
    if (!this.projectPath || !this.vocabularyDir) return

    const metaDir = path.join(this.projectPath, PROJECT_META_DIR)
    this.ensureDir(metaDir)
    this.ensureDir(this.vocabularyDir)

    if (this.vocabularyDefaultDir) {
      this.ensureDir(this.vocabularyDefaultDir)
    }

    if (this.vocabularyDetailsDir) {
      this.ensureDir(this.vocabularyDetailsDir)
    }
  }

  private loadSettings(): void {
    if (!this.settingsPath) return
    const saved = this.readJson5File<Partial<ProjectSettings>>(this.settingsPath)
    this.settings = saved ? { ...DEFAULT_PROJECT_SETTINGS, ...saved } : DEFAULT_PROJECT_SETTINGS
  }

  private saveSettings(): void {
    if (!this.settingsPath) return
    this.writeJson5File(this.settingsPath, this.settings)
  }

  getSettings(): ProjectSettings {
    return { ...this.settings }
  }

  updateSettings(settings: Partial<ProjectSettings>): void {
    this.settings = { ...this.settings, ...settings }
    this.saveSettings()
  }

  // ============================================
  // 词汇类型管理
  // ============================================

  private getVocabularyTypesPath(): string {
    ensureInitialized(this.vocabularyDir, 'VocabularyService')
    return path.join(this.vocabularyDir!, VOCABULARY_TYPES_FILE)
  }

  loadVocabularyTypes(): VocabularyType[] {
    const typesPath = this.getVocabularyTypesPath()
    return this.readJson5File<VocabularyType[]>(typesPath) ?? []
  }

  saveVocabularyTypes(types: VocabularyType[]): void {
    const typesPath = this.getVocabularyTypesPath()
    this.writeJson5File(typesPath, types)
  }

  addVocabularyType(type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>): VocabularyType {
    const types = this.loadVocabularyTypes()
    const now = this.getTimestamp()

    const newType: VocabularyType = {
      ...type,
      id: this.generateId(),
      createdAt: now,
      updatedAt: now
    }

    types.push(newType)
    this.saveVocabularyTypes(types)

    return newType
  }

  updateVocabularyType(id: string, updates: Partial<VocabularyType>): VocabularyType | null {
    const types = this.loadVocabularyTypes()
    const index = types.findIndex(t => t.id === id)

    if (index === -1) return null

    types[index] = {
      ...types[index],
      ...updates,
      updatedAt: this.getTimestamp()
    }

    this.saveVocabularyTypes(types)
    return types[index]
  }

  deleteVocabularyType(id: string): boolean {
    const types = this.loadVocabularyTypes()
    const index = types.findIndex(t => t.id === id)

    if (index === -1) return false

    types.splice(index, 1)
    this.saveVocabularyTypes(types)

    const entriesPath = this.getVocabularyEntriesPath(id)
    if (fs.existsSync(entriesPath)) {
      fs.unlinkSync(entriesPath)
    }

    return true
  }

  // ============================================
  // 词汇条目管理
  // ============================================

  private getVocabularyEntriesPath(typeId: string): string {
    const fileName = `${typeId}.json5`

    const types = this.loadVocabularyTypes()
    const type = types.find(t => t.id === typeId)

    ensureInitialized(this.vocabularyDir, 'VocabularyService')

    if (type?.isBuiltIn && this.vocabularyDefaultDir) {
      return path.join(this.vocabularyDefaultDir, fileName)
    }

    return path.join(this.vocabularyDir!, fileName)
  }

  loadVocabularyEntries(typeId?: string): VocabularyEntry[] {
    if (typeId) {
      const entriesPath = this.getVocabularyEntriesPath(typeId)
      return this.readJson5File<VocabularyEntry[]>(entriesPath) ?? []
    }

    const allEntries: VocabularyEntry[] = []
    const types = this.loadVocabularyTypes()

    for (const type of types) {
      const entries = this.loadVocabularyEntries(type.id)
      allEntries.push(...entries)
    }

    return allEntries
  }

  saveVocabularyEntries(typeId: string, entries: VocabularyEntry[]): void {
    const entriesPath = this.getVocabularyEntriesPath(typeId)
    this.writeJson5File(entriesPath, entries)
  }

  addVocabularyEntry(entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt' | 'order'>): VocabularyEntry {
    const entries = this.loadVocabularyEntries(entry.typeId)
    const now = this.getTimestamp()

    const newEntry: VocabularyEntry = {
      ...entry,
      id: this.generateId(),
      order: entries.length,
      createdAt: now,
      updatedAt: now
    }

    entries.push(newEntry)
    this.saveVocabularyEntries(entry.typeId, entries)

    if (this.settings.autoCreateVocabularyFile) {
      this.createLinkedMarkdownFile(newEntry)
    }

    return newEntry
  }

  updateVocabularyEntry(id: string, updates: Partial<VocabularyEntry>): VocabularyEntry | null {
    const allEntries = this.loadVocabularyEntries()
    const existingEntry = allEntries.find(e => e.id === id)

    if (!existingEntry) return null

    const entries = this.loadVocabularyEntries(existingEntry.typeId)
    const index = entries.findIndex(e => e.id === id)

    if (index === -1) return null

    entries[index] = {
      ...entries[index],
      ...updates,
      updatedAt: this.getTimestamp()
    }

    this.saveVocabularyEntries(existingEntry.typeId, entries)
    return entries[index]
  }

  deleteVocabularyEntry(id: string): boolean {
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

  // ============================================
  // 关联 Novel 文件管理
  // ============================================

  private getVocabularyDetailDir(): string {
    ensureInitialized(this.vocabularyDetailsDir, 'VocabularyService')
    return this.vocabularyDetailsDir!
  }

  createLinkedNovelFile(entry: VocabularyEntry): string | null {
    if (!this.projectPath) return null

    try {
      const detailDir = this.getVocabularyDetailDir()
      this.ensureDir(detailDir)

      const safeTypeName = entry.typeName.replace(/[\\/:*?"<>|]/g, '_')
      const safeEntryName = entry.name.replace(/[\\/:*?"<>|]/g, '_')
      const fileName = `${safeTypeName}_${safeEntryName}.novel`
      const filePath = path.join(detailDir, fileName)

      const content = `---
id: ${entry.id}
type: ${entry.typeName}
name: ${entry.name}
createdAt: ${entry.createdAt}
updatedAt: ${this.getTimestamp()}
---

# ${entry.name}

${entry.description || '详细描述...'}
`

      fs.writeFileSync(filePath, content, 'utf-8')

      const relativePath = path.relative(this.projectPath, filePath)
      this.updateVocabularyEntry(entry.id, { linkedFilePath: relativePath })

      return relativePath
    } catch (error) {
      this.logger.error('创建关联 Novel 文件失败', error)
      return null
    }
  }

  linkToFile(entryId: string, filePath: string): boolean {
    ensureInitialized(this.projectPath, 'VocabularyService')
    const relativePath = path.relative(this.projectPath!, filePath)
    const result = this.updateVocabularyEntry(entryId, { linkedFilePath: relativePath })
    return result !== null
  }

  unlinkFile(entryId: string): boolean {
    const result = this.updateVocabularyEntry(entryId, { linkedFilePath: undefined })
    return result !== null
  }

  // ============================================
  // 敏感词管理
  // ============================================

  loadSensitiveWords(): SensitiveWord[] {
    if (!this.sensitiveWordsPath) return []
    return this.readJson5File<SensitiveWord[]>(this.sensitiveWordsPath) ?? []
  }

  saveSensitiveWords(words: SensitiveWord[]): void {
    if (!this.sensitiveWordsPath) return
    this.writeJson5File(this.sensitiveWordsPath, words)
  }

  addSensitiveWord(word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt' | 'order'>): SensitiveWord {
    const words = this.loadSensitiveWords()
    const now = this.getTimestamp()

    const newWord: SensitiveWord = {
      ...word,
      id: this.generateId(),
      order: words.length,
      createdAt: now,
      updatedAt: now
    }

    words.push(newWord)
    this.saveSensitiveWords(words)

    return newWord
  }

  updateSensitiveWord(id: string, updates: Partial<SensitiveWord>): SensitiveWord | null {
    const words = this.loadSensitiveWords()
    const index = words.findIndex(w => w.id === id)

    if (index === -1) return null

    words[index] = {
      ...words[index],
      ...updates,
      updatedAt: this.getTimestamp()
    }

    this.saveSensitiveWords(words)
    return words[index]
  }

  deleteSensitiveWord(id: string): boolean {
    const words = this.loadSensitiveWords()
    const index = words.findIndex(w => w.id === id)

    if (index === -1) return false

    words.splice(index, 1)
    this.saveSensitiveWords(words)

    return true
  }

  importSensitiveWords(words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt' | 'order'>>): number {
    const existingWords = this.loadSensitiveWords()
    const now = this.getTimestamp()

    let imported = 0
    for (const word of words) {
      if (existingWords.some(w => w.name === word.name)) {
        continue
      }

      const newWord: SensitiveWord = {
        ...word,
        id: this.generateId(),
        order: existingWords.length,
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

export const vocabularyService = new VocabularyService()
