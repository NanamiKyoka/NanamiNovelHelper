import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * 项目相关类型定义（与主进程和渲染进程保持一致）
 */
interface Project {
  id: string
  name: string
  description?: string
  author?: string
  path: string
  cover?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

interface CreateProjectOptions {
  name: string
  parentPath: string
  description?: string
  author?: string
  tags?: string[]
}

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

/**
 * 词汇相关类型定义
 */
interface VocabularyType {
  id: string
  name: string
  icon?: string
  color: string
  fields: FieldDefinition[]
  tableConfig: TableColumnConfig[]
  isBuiltIn: boolean
  order: number
  createdAt: string
  updatedAt: string
}

interface FieldDefinition {
  id: string
  name: string
  type: string
  options?: string[]
  referenceTypeId?: string
  required?: boolean
  placeholder?: string
  defaultValue?: string | string[]
  width?: number
  order: number
}

interface TableColumnConfig {
  fieldId: string
  visible: boolean
  width: number
  fixed?: 'left' | 'right' | null
  order: number
}

interface VocabularyEntry {
  id: string
  name: string
  aliases: string[]
  color: string
  typeId: string
  typeName: string
  fields: Record<string, string | string[]>
  tags: string[]
  description?: string
  linkedFilePath?: string
  createdAt: string
  updatedAt: string
}

interface SensitiveWord {
  id: string
  name: string
  aliases: string[]
  category: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  suggestion?: string
  description?: string
  createdAt: string
  updatedAt: string
}

interface VocabularySettings {
  autoCreateVocabularyFile: boolean
}

/**
 * 高亮配置类型定义
 */
interface HighlightScopeConfig {
  enabled: boolean
  includeDirectories: string[]
  excludeDirectories: string[]
  excludeExtensions: string[]
  excludeFiles: string[]
}

interface HighlightMatchConfig {
  matchMode: 'wholeWord' | 'partial'
  caseSensitive: boolean
  matchAliases: boolean
  sensitiveWordHighlight: boolean
  sensitiveWordColors: Record<string, string>
}

interface HighlightStyleConfig {
  showTextColor: boolean
  showBold: boolean
  showItalic: boolean
  showUnderline: boolean
  underlineWidth: number
  underlineStyle: 'solid' | 'dashed' | 'dotted' | 'wavy'
  showHoverTooltip: boolean
  hoverDelay: number
}

interface HighlightPerformanceConfig {
  largeFileThreshold: number
  disableOnLargeFile: boolean
  updateDebounce: number
  maxHighlights: number
}

interface VocabularyTypeMatchOverride {
  typeId: string
  enabled: boolean
  matchMode: 'wholeWord' | 'partial' | null
  caseSensitive: boolean | null
}

interface VocabularyMatchOverride {
  entryId: string
  enabled: boolean | null
  matchMode: 'wholeWord' | 'partial' | null
  caseSensitive: boolean | null
  color: string | null
}

interface HighlightConfig {
  version: string
  scope: HighlightScopeConfig
  match: HighlightMatchConfig
  style: HighlightStyleConfig
  performance: HighlightPerformanceConfig
  typeOverrides: VocabularyTypeMatchOverride[]
  entryOverrides: VocabularyMatchOverride[]
}

/**
 * 设置类型定义
 */
interface GlobalThemeConfig {
  mode: 'light' | 'dark' | 'system'
  primaryColor: string
  fontSize: number
  fontFamily: string
}

interface WindowState {
  isMaximized: boolean
  x?: number
  y?: number
  width: number
  height: number
}

interface GlobalSettings {
  theme: GlobalThemeConfig
  window: WindowState
  language: 'zh-CN' | 'en-US' | 'ja-JP'
  sidebarWidth: number
  showWelcome: boolean
}

interface ProjectEditorSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  viewMode: 'wysiwyg' | 'split'
  toolbarMode: 'fixed' | 'floating'
  showToolbar: boolean
  autoSaveInterval: number
  wordWrap: boolean
  showLineNumbers: boolean
  tabSize: number
  spellCheck: boolean
  enablePreviewMode: boolean
}

interface ProjectHighlightSettings {
  vocabularyHighlight: boolean
  sensitiveWordCheck: boolean
}

interface ProjectBackupSettings {
  enabled: boolean
  maxCount: number
}

interface BadgeVisibility {
  vocabulary: boolean
  sensitive: boolean
  randomName: boolean
  relationship: boolean
  timeline: boolean
  sequenceChart: boolean
  organization: boolean
  terminal: boolean
}

type BadgeType = 'vocabulary' | 'sensitive' | 'randomName' | 'relationship' | 'timeline' | 'sequenceChart' | 'organization' | 'terminal'

interface ProjectSettings {
  editor: ProjectEditorSettings
  highlight: ProjectHighlightSettings
  autoCreateVocabularyFile: boolean
  backup: ProjectBackupSettings
  badgeVisibility: BadgeVisibility
  badgeOrder: BadgeType[]
  showHiddenFiles: boolean
}

interface BackupInfo {
  filename: string
  createdAt: string
  size: number
}

/**
 * 关系图类型定义
 */
interface RelationType {
  id: string
  name: string
  color: string
  lineStyle: 'solid' | 'dashed' | 'dotted'
  lineWidth: number
  isBuiltIn: boolean
  order: number
}

type Gender = 'male' | 'female' | 'other' | 'unknown'

interface RelationshipNode {
  id: string
  name: string
  gender: Gender
  description?: string
  avatar?: string
  color: string
  linkedTypeId?: string
  linkedEntryId?: string
  x?: number
  y?: number
  createdAt: string
  updatedAt: string
}

interface RelationshipEdge {
  id: string
  source: string
  target: string
  relationTypeId: string
  label?: string
  createdAt: string
  updatedAt: string
}

type NodeStyleType = 'circle' | 'card'

interface RelationshipGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  linkedVocabularyTypes: string[]
  customRelationTypes: RelationType[]
  nodeStyle: NodeStyleType
  nodeCount: number
  edgeCount: number
  createdAt: string
  updatedAt: string
}

interface RelationshipGraph extends RelationshipGraphMeta {
  nodes: RelationshipNode[]
  edges: RelationshipEdge[]
}

interface CreateRelationshipGraphOptions {
  name: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: NodeStyleType
}

interface UpdateRelationshipGraphOptions {
  name?: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: NodeStyleType
  nodes?: RelationshipNode[]
  edges?: RelationshipEdge[]
  customRelationTypes?: RelationType[]
}

/**
 * 时间线类型定义
 */
type TimeFormat = 'datetime' | 'chapter' | 'custom'

interface TimeInfo {
  format: TimeFormat
  datetime?: string
  chapterId?: string
  chapterTitle?: string
  customLabel?: string
  orderValue?: number
}

interface CharacterRef {
  id: string
  name: string
  typeId?: string
  color?: string
  avatar?: string
}

interface ChapterRef {
  id: string
  title: string
  path: string
}

interface TimelineNode {
  id: string
  title: string
  description?: string
  timeInfo: TimeInfo
  characters: CharacterRef[]
  chapter?: ChapterRef
  color?: string
  order: number
  isBranchPoint?: boolean
  branchedTimelineIds?: string[]
  createdAt: string
  updatedAt: string
}

type BranchType = 'main' | 'branch'

interface BranchInfo {
  type: BranchType
  parentTimelineId?: string
  branchFromNodeId?: string
  mergeToTimelineId?: string
  mergeToNodeId?: string
  branchLabel?: string
}

interface TimelineMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  branchInfo: BranchInfo
  nodeCount: number
  tags?: string[]
  createdAt: string
  updatedAt: string
}

interface Timeline extends TimelineMeta {
  nodes: TimelineNode[]
}

interface CreateTimelineOptions {
  name: string
  description?: string
  tags?: string[]
  branchInfo?: BranchInfo
}

interface UpdateTimelineOptions {
  name?: string
  description?: string
  tags?: string[]
  nodes?: TimelineNode[]
  thumbnail?: string
  branchInfo?: BranchInfo
}

/**
 * 事序图类型定义
 */
type SequenceTimeFormat = 'cell' | 'datetime' | 'chapter'

interface SequenceTimeInfo {
  format: SequenceTimeFormat
  cellStart?: number
  cellEnd?: number
  datetimeStart?: string
  datetimeEnd?: string
  chapterStartId?: string
  chapterStartTitle?: string
  chapterEndId?: string
  chapterEndTitle?: string
}

interface SequenceCharacterRef {
  id: string
  name: string
  typeId?: string
  color?: string
  avatar?: string
}

interface SequenceChapterRef {
  id: string
  title: string
  path: string
}

interface SequenceLocationRef {
  id: string
  name: string
  typeId?: string
  color?: string
}

interface SequenceEventType {
  id: string
  name: string
  color: string
  icon?: string
  isBuiltIn: boolean
  order: number
}

interface SequenceEvent {
  id: string
  order: number
  title: string
  description?: string
  timeInfo: SequenceTimeInfo
  progress: number
  eventTypeId: string
  color?: string
  characters: SequenceCharacterRef[]
  chapter?: SequenceChapterRef
  location?: SequenceLocationRef
  createdAt: string
  updatedAt: string
}

interface TimelineAxisConfig {
  defaultFormat: SequenceTimeFormat
  cellWidth: number
  initialCellCount: number
  minCellCount: number
  maxCellCount: number
  autoExtend: boolean
  timeLabels?: Array<{ position: number; label: string }>
}

interface SequenceChartMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  axisConfig: TimelineAxisConfig
  customEventTypes: SequenceEventType[]
  eventCount: number
  tags?: string[]
  createdAt: string
  updatedAt: string
}

interface SequenceChart extends SequenceChartMeta {
  events: SequenceEvent[]
}

interface CreateSequenceChartOptions {
  name: string
  description?: string
  tags?: string[]
  axisConfig?: Partial<TimelineAxisConfig>
}

interface UpdateSequenceChartOptions {
  name?: string
  description?: string
  tags?: string[]
  events?: SequenceEvent[]
  thumbnail?: string
  axisConfig?: Partial<TimelineAxisConfig>
  customEventTypes?: SequenceEventType[]
}

interface CreateSequenceEventOptions {
  title: string
  description?: string
  timeInfo?: Partial<SequenceTimeInfo>
  progress?: number
  eventTypeId?: string
  color?: string
  characters?: SequenceCharacterRef[]
  chapter?: SequenceChapterRef
  location?: SequenceLocationRef
}

interface UpdateSequenceEventOptions {
  title?: string
  description?: string
  timeInfo?: Partial<SequenceTimeInfo>
  progress?: number
  eventTypeId?: string
  color?: string
  characters?: SequenceCharacterRef[]
  chapter?: SequenceChapterRef
  location?: SequenceLocationRef
  order?: number
}

/**
 * 组织架构图类型定义
 */
export type OrganizationNodeStyle = 'simple' | 'card'

interface OrganizationNode {
  id: string
  name: string
  parentId?: string
  description?: string
  color: string
  linkedTypeId?: string
  linkedEntryId?: string
  order: number
  collapsed?: boolean
  createdAt: string
  updatedAt: string
}

interface OrganizationViewState {
  zoom: number
  centerX: number
  centerY: number
  expandedNodeIds?: string[]
}

interface OrganizationGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  linkedVocabularyTypes: string[]
  nodeStyle: OrganizationNodeStyle
  nodeCount: number
  viewState?: OrganizationViewState
  createdAt: string
  updatedAt: string
}

interface OrganizationGraph extends OrganizationGraphMeta {
  nodes: OrganizationNode[]
}

interface CreateOrganizationGraphOptions {
  name: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: OrganizationNodeStyle
  createRootNode?: boolean
  rootNodeName?: string
}

interface UpdateOrganizationGraphOptions {
  name?: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: OrganizationNodeStyle
  nodes?: OrganizationNode[]
  viewState?: OrganizationViewState
}

interface CreateOrganizationNodeOptions {
  name: string
  parentId?: string
  description?: string
  color?: string
  linkedTypeId?: string
  linkedEntryId?: string
}

interface UpdateOrganizationNodeOptions {
  name?: string
  parentId?: string
  description?: string
  color?: string
  linkedTypeId?: string
  linkedEntryId?: string
  order?: number
  collapsed?: boolean
}

/**
 * 图片相关类型定义
 */
interface ImageFieldConfig {
  maxSize?: number
  allowedFormats?: string[]
  maxWidth?: number
  maxHeight?: number
  quality?: number
}

interface ImageUploadResult {
  path: string
  originalName: string
  size: number
  width: number
  height: number
  format: string
}

/**
 * 终端相关类型定义
 */
interface TerminalCreateOptions {
  cwd?: string
  env?: Record<string, string>
  shellPath?: string
  shellArgs?: string[]
  name?: string
}

interface TerminalInstance {
  id: string
  name: string
  pid: number
  cwd: string
  exited: boolean
  exitCode?: number
}

interface ShellInfo {
  name: string
  path: string
  isDefault?: boolean
}

/**
 * 文件节点信息
 */
interface FileNode {
  key: string
  name: string
  path: string
  isDirectory: boolean
  children?: FileNode[]
  extension?: string
  size?: number
  modifiedAt?: string
}

/**
 * 排序选项
 */
interface SortOptions {
  field: 'name' | 'modified'
  order: 'asc' | 'desc'
}

// Custom APIs for renderer
const api = {
  // 窗口控制
  window: {
    minimize: () => ipcRenderer.send('window-minimize'),
    maximize: () => ipcRenderer.send('window-maximize'),
    close: () => ipcRenderer.send('window-close'),
    isMaximized: () => ipcRenderer.invoke('window-is-maximized'),
    setFullScreen: (isFullscreen: boolean) => ipcRenderer.send('window-set-fullscreen', isFullscreen),
    isFullScreen: () => ipcRenderer.invoke('window-is-fullscreen'),
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
      ipcRenderer.on('window-maximized', (_, isMaximized) => callback(isMaximized))
    },
    removeMaximizeListener: () => {
      ipcRenderer.removeAllListeners('window-maximized')
    },
    onFullScreenChange: (callback: (isFullscreen: boolean) => void) => {
      ipcRenderer.on('window-fullscreen-change', (_, isFullscreen) => callback(isFullscreen))
    },
    removeFullScreenListener: () => {
      ipcRenderer.removeAllListeners('window-fullscreen-change')
    }
  },
  // 项目管理
  project: {
    create: (options: CreateProjectOptions) => ipcRenderer.invoke('project:create', options),
    open: (path: string) => ipcRenderer.invoke('project:open', path),
    close: () => ipcRenderer.invoke('project:close'),
    getCurrent: () => ipcRenderer.invoke('project:get-current'),
    updateInfo: (info: Partial<Project>) => ipcRenderer.invoke('project:update-info', info),
    getRecent: () => ipcRenderer.invoke('project:get-recent'),
    removeRecent: (path: string) => ipcRenderer.invoke('project:remove-recent', path),
    clearRecent: () => ipcRenderer.invoke('project:clear-recent'),
    showOpenDialog: () => ipcRenderer.invoke('project:show-open-dialog'),
    showCreateDialog: () => ipcRenderer.invoke('project:show-create-dialog'),
    isValid: (path: string) => ipcRenderer.invoke('project:is-valid', path),
    getStats: (path: string) => ipcRenderer.invoke('project:get-stats', path)
  },
  // 词汇管理
  vocabulary: {
    // 类型管理
    loadTypes: (): Promise<VocabularyType[]> => ipcRenderer.invoke('vocabulary:loadTypes'),
    saveTypes: (types: VocabularyType[]) => ipcRenderer.invoke('vocabulary:saveTypes', types),
    addType: (type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>) => 
      ipcRenderer.invoke('vocabulary:addType', type),
    updateType: (id: string, updates: Partial<VocabularyType>) => 
      ipcRenderer.invoke('vocabulary:updateType', id, updates),
    deleteType: (id: string) => ipcRenderer.invoke('vocabulary:deleteType', id),
    // 条目管理
    loadEntries: (typeId?: string): Promise<VocabularyEntry[]> => 
      ipcRenderer.invoke('vocabulary:loadEntries', typeId),
    saveEntries: (typeId: string, entries: VocabularyEntry[]) => 
      ipcRenderer.invoke('vocabulary:saveEntries', typeId, entries),
    addEntry: (entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt'>) => 
      ipcRenderer.invoke('vocabulary:addEntry', entry),
    updateEntry: (id: string, updates: Partial<VocabularyEntry>) => 
      ipcRenderer.invoke('vocabulary:updateEntry', id, updates),
    deleteEntry: (id: string) => ipcRenderer.invoke('vocabulary:deleteEntry', id),
    // 关联文件
    createLinkedFile: (entry: VocabularyEntry) => 
      ipcRenderer.invoke('vocabulary:createLinkedFile', entry),
    linkFile: (entryId: string, filePath: string) => 
      ipcRenderer.invoke('vocabulary:linkFile', entryId, filePath),
    unlinkFile: (entryId: string) => ipcRenderer.invoke('vocabulary:unlinkFile', entryId),
    // 设置
    getSettings: (): Promise<VocabularySettings> => 
      ipcRenderer.invoke('vocabulary:getSettings'),
    updateSettings: (settings: Partial<VocabularySettings>) => 
      ipcRenderer.invoke('vocabulary:updateSettings', settings)
  },
  // 敏感词管理
  sensitive: {
    loadWords: (): Promise<SensitiveWord[]> => ipcRenderer.invoke('sensitive:loadWords'),
    saveWords: (words: SensitiveWord[]) => ipcRenderer.invoke('sensitive:saveWords', words),
    addWord: (word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>) => 
      ipcRenderer.invoke('sensitive:addWord', word),
    updateWord: (id: string, updates: Partial<SensitiveWord>) => 
      ipcRenderer.invoke('sensitive:updateWord', id, updates),
    deleteWord: (id: string) => ipcRenderer.invoke('sensitive:deleteWord', id),
    importWords: (words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>>): Promise<number> => 
      ipcRenderer.invoke('sensitive:importWords', words)
  },
  // 高亮配置管理
  highlight: {
    loadConfig: (): Promise<HighlightConfig> => ipcRenderer.invoke('highlight:loadConfig'),
    saveConfig: (config: Partial<HighlightConfig>) => 
      ipcRenderer.invoke('highlight:saveConfig', config)
  },
  // 全局设置
  settings: {
    // 全局设置
    global: {
      getAll: (): Promise<GlobalSettings> => ipcRenderer.invoke('settings:global:getAll'),
      update: (settings: Partial<GlobalSettings>): Promise<GlobalSettings> => 
        ipcRenderer.invoke('settings:global:update', settings),
      reset: (): Promise<GlobalSettings> => ipcRenderer.invoke('settings:global:reset'),
      getTheme: (): Promise<GlobalThemeConfig> => ipcRenderer.invoke('settings:global:getTheme'),
      updateTheme: (theme: Partial<GlobalThemeConfig>): Promise<GlobalThemeConfig> => 
        ipcRenderer.invoke('settings:global:updateTheme', theme),
      getWindowState: (): Promise<WindowState> => 
        ipcRenderer.invoke('settings:global:getWindowState'),
      updateWindowState: (state: Partial<WindowState>): Promise<WindowState> => 
        ipcRenderer.invoke('settings:global:updateWindowState', state),
      getLanguage: (): Promise<'zh-CN' | 'en-US' | 'ja-JP'> => 
        ipcRenderer.invoke('settings:global:getLanguage'),
      setLanguage: (language: 'zh-CN' | 'en-US' | 'ja-JP') => 
        ipcRenderer.invoke('settings:global:setLanguage', language),
      getSidebarWidth: (): Promise<number> => 
        ipcRenderer.invoke('settings:global:getSidebarWidth'),
      setSidebarWidth: (width: number) => 
        ipcRenderer.invoke('settings:global:setSidebarWidth', width),
      // API Key 管理
      getApiKey: (keyName: string): Promise<string | null> => 
        ipcRenderer.invoke('settings:global:getApiKey', keyName),
      setApiKey: (keyName: string, value: string) => 
        ipcRenderer.invoke('settings:global:setApiKey', keyName, value),
      deleteApiKey: (keyName: string) => 
        ipcRenderer.invoke('settings:global:deleteApiKey', keyName),
      getApiKeyNames: (): Promise<string[]> => 
        ipcRenderer.invoke('settings:global:getApiKeyNames'),
      isEncryptionAvailable: (): Promise<boolean> => 
        ipcRenderer.invoke('settings:global:isEncryptionAvailable')
    },
    // 项目设置
    project: {
      getAll: (): Promise<ProjectSettings> => ipcRenderer.invoke('settings:project:getAll'),
      update: (settings: Partial<ProjectSettings>): Promise<ProjectSettings> => 
        ipcRenderer.invoke('settings:project:update', settings),
      saveNow: () => ipcRenderer.invoke('settings:project:saveNow'),
      reset: (): Promise<ProjectSettings> => ipcRenderer.invoke('settings:project:reset'),
      getEditor: (): Promise<ProjectEditorSettings> => 
        ipcRenderer.invoke('settings:project:getEditor'),
      updateEditor: (settings: Partial<ProjectEditorSettings>): Promise<ProjectEditorSettings> => 
        ipcRenderer.invoke('settings:project:updateEditor', settings),
      getHighlight: (): Promise<ProjectHighlightSettings> => 
        ipcRenderer.invoke('settings:project:getHighlight'),
      updateHighlight: (settings: Partial<ProjectHighlightSettings>): Promise<ProjectHighlightSettings> => 
        ipcRenderer.invoke('settings:project:updateHighlight', settings),
      getBackup: (): Promise<ProjectBackupSettings> =>
              ipcRenderer.invoke('settings:project:getBackup'),
            updateBackup: (settings: Partial<ProjectBackupSettings>): Promise<ProjectBackupSettings> =>
              ipcRenderer.invoke('settings:project:updateBackup', settings),
            getBadgeVisibility: (): Promise<BadgeVisibility> =>
              ipcRenderer.invoke('settings:project:getBadgeVisibility'),
            updateBadgeVisibility: (settings: Partial<BadgeVisibility>): Promise<BadgeVisibility> =>
              ipcRenderer.invoke('settings:project:updateBadgeVisibility', settings),
            getBadgeOrder: (): Promise<BadgeType[]> =>
              ipcRenderer.invoke('settings:project:getBadgeOrder'),
            setBadgeOrder: (order: BadgeType[]): Promise<BadgeType[]> =>
              ipcRenderer.invoke('settings:project:updateBadgeOrder', order),
            getShowHiddenFiles: (): Promise<boolean> =>
              ipcRenderer.invoke('settings:project:getShowHiddenFiles'),
            setShowHiddenFiles: (value: boolean): Promise<void> =>
              ipcRenderer.invoke('settings:project:setShowHiddenFiles', value)
          }
        },  // 备份管理
  backup: {
    create: (): Promise<string | null> => ipcRenderer.invoke('backup:create'),
    list: (): Promise<BackupInfo[]> => ipcRenderer.invoke('backup:list'),
    restore: (filename: string): Promise<boolean> => 
      ipcRenderer.invoke('backup:restore', filename),
    delete: (filename: string): Promise<boolean> => 
      ipcRenderer.invoke('backup:delete', filename),
    export: (filename: string): Promise<string | null> => 
      ipcRenderer.invoke('backup:export', filename),
    import: (): Promise<string | null> => ipcRenderer.invoke('backup:import')
  },
  // 关系图管理
  relationship: {
    // 关系图管理
    getList: (): Promise<RelationshipGraphMeta[]> => 
      ipcRenderer.invoke('relationship:getList'),
    get: (graphId: string): Promise<RelationshipGraph | null> => 
      ipcRenderer.invoke('relationship:get', graphId),
    create: (options: CreateRelationshipGraphOptions): Promise<RelationshipGraph> => 
      ipcRenderer.invoke('relationship:create', options),
    update: (graphId: string, updates: UpdateRelationshipGraphOptions): Promise<RelationshipGraph | null> => 
      ipcRenderer.invoke('relationship:update', graphId, updates),
    delete: (graphId: string): Promise<boolean> => 
      ipcRenderer.invoke('relationship:delete', graphId),
    // 节点管理
    addNode: (graphId: string, node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<RelationshipNode | null> => 
      ipcRenderer.invoke('relationship:addNode', graphId, node),
    updateNode: (graphId: string, nodeId: string, updates: Partial<RelationshipNode>): Promise<RelationshipNode | null> => 
      ipcRenderer.invoke('relationship:updateNode', graphId, nodeId, updates),
    deleteNode: (graphId: string, nodeId: string): Promise<boolean> => 
      ipcRenderer.invoke('relationship:deleteNode', graphId, nodeId),
    // 边管理
    addEdge: (graphId: string, edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>): Promise<RelationshipEdge | null> => 
      ipcRenderer.invoke('relationship:addEdge', graphId, edge),
    updateEdge: (graphId: string, edgeId: string, updates: Partial<RelationshipEdge>): Promise<RelationshipEdge | null> => 
      ipcRenderer.invoke('relationship:updateEdge', graphId, edgeId, updates),
    deleteEdge: (graphId: string, edgeId: string): Promise<boolean> => 
      ipcRenderer.invoke('relationship:deleteEdge', graphId, edgeId),
    // 关系类型管理
    getRelationTypes: (graphId: string): Promise<RelationType[]> => 
      ipcRenderer.invoke('relationship:getRelationTypes', graphId),
    addRelationType: (graphId: string, type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>): Promise<RelationType | null> => 
      ipcRenderer.invoke('relationship:addRelationType', graphId, type),
    updateRelationType: (graphId: string, typeId: string, updates: Partial<RelationType>): Promise<RelationType | null> => 
      ipcRenderer.invoke('relationship:updateRelationType', graphId, typeId, updates),
    deleteRelationType: (graphId: string, typeId: string): Promise<boolean> => 
      ipcRenderer.invoke('relationship:deleteRelationType', graphId, typeId),
    // 缩略图
    saveThumbnail: (graphId: string, dataUrl: string): Promise<string | null> => 
      ipcRenderer.invoke('relationship:saveThumbnail', graphId, dataUrl),
    getThumbnailPath: (graphId: string): Promise<string | null> => 
      ipcRenderer.invoke('relationship:getThumbnailPath', graphId),
    // 导入导出
    export: (graphId: string): Promise<string | null> => 
      ipcRenderer.invoke('relationship:export', graphId),
    import: (jsonContent: string): Promise<RelationshipGraph | null> => 
      ipcRenderer.invoke('relationship:import', jsonContent),
    showExportDialog: (graphName: string): Promise<string | null> => 
      ipcRenderer.invoke('relationship:showExportDialog', graphName),
    showImportDialog: (): Promise<string | null> => 
      ipcRenderer.invoke('relationship:showImportDialog')
  },
  // 时间线管理
  timeline: {
    // 时间线管理
    getList: (): Promise<TimelineMeta[]> => 
      ipcRenderer.invoke('timeline:getList'),
    get: (timelineId: string): Promise<Timeline | null> => 
      ipcRenderer.invoke('timeline:get', timelineId),
    create: (options: CreateTimelineOptions): Promise<Timeline> => 
      ipcRenderer.invoke('timeline:create', options),
    update: (timelineId: string, updates: UpdateTimelineOptions): Promise<Timeline | null> => 
      ipcRenderer.invoke('timeline:update', timelineId, updates),
    delete: (timelineId: string): Promise<boolean> => 
      ipcRenderer.invoke('timeline:delete', timelineId),
    // 节点管理
    addNode: (timelineId: string, node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt' | 'order'>): Promise<TimelineNode | null> => 
      ipcRenderer.invoke('timeline:addNode', timelineId, node),
    updateNode: (timelineId: string, nodeId: string, updates: Partial<TimelineNode>): Promise<TimelineNode | null> => 
      ipcRenderer.invoke('timeline:updateNode', timelineId, nodeId, updates),
    deleteNode: (timelineId: string, nodeId: string): Promise<boolean> => 
      ipcRenderer.invoke('timeline:deleteNode', timelineId, nodeId),
    batchDeleteNodes: (timelineId: string, nodeIds: string[]): Promise<number> => 
      ipcRenderer.invoke('timeline:batchDeleteNodes', timelineId, nodeIds),
    moveNode: (timelineId: string, nodeId: string, newOrder: number): Promise<TimelineNode[] | null> => 
      ipcRenderer.invoke('timeline:moveNode', timelineId, nodeId, newOrder),
    batchMoveNodes: (timelineId: string, nodeIds: string[], targetOrder: number): Promise<TimelineNode[] | null> => 
      ipcRenderer.invoke('timeline:batchMoveNodes', timelineId, nodeIds, targetOrder),
    updateNodes: (timelineId: string, nodes: TimelineNode[]): Promise<Timeline | null> => 
      ipcRenderer.invoke('timeline:updateNodes', timelineId, nodes),
    // 分支管理
    createBranch: (parentTimelineId: string, branchFromNodeId: string, name?: string): Promise<Timeline | null> => 
      ipcRenderer.invoke('timeline:createBranch', parentTimelineId, branchFromNodeId, name),
    mergeBranch: (branchTimelineId: string, targetTimelineId: string, targetNodeId?: string): Promise<boolean> => 
      ipcRenderer.invoke('timeline:mergeBranch', branchTimelineId, targetTimelineId, targetNodeId),
    getBranches: (parentTimelineId: string): Promise<TimelineMeta[]> => 
      ipcRenderer.invoke('timeline:getBranches', parentTimelineId),
    getBranchSourceNode: (timelineId: string): Promise<TimelineNode | null> => 
      ipcRenderer.invoke('timeline:getBranchSourceNode', timelineId),
    // 缩略图
    saveThumbnail: (timelineId: string, dataUrl: string): Promise<string | null> => 
      ipcRenderer.invoke('timeline:saveThumbnail', timelineId, dataUrl),
    getThumbnailPath: (timelineId: string): Promise<string | null> => 
      ipcRenderer.invoke('timeline:getThumbnailPath', timelineId),
    // 导入导出
    export: (timelineId: string): Promise<string | null> => 
      ipcRenderer.invoke('timeline:export', timelineId),
    exportMarkdown: (timelineId: string): Promise<string | null> => 
      ipcRenderer.invoke('timeline:exportMarkdown', timelineId),
    import: (jsonContent: string): Promise<Timeline | null> => 
      ipcRenderer.invoke('timeline:import', jsonContent),
    showExportDialog: (timelineName: string, format?: 'json' | 'markdown'): Promise<string | null> => 
      ipcRenderer.invoke('timeline:showExportDialog', timelineName, format),
    showImportDialog: (): Promise<string | null> => 
      ipcRenderer.invoke('timeline:showImportDialog'),
    saveExportFile: (filePath: string, content: string): Promise<boolean> => 
      ipcRenderer.invoke('timeline:saveExportFile', filePath, content),
    readImportFile: (filePath: string): Promise<string | null> => 
      ipcRenderer.invoke('timeline:readImportFile', filePath)
  },
  // 事序图管理
  sequenceChart: {
    // 事序图管理
    getList: (): Promise<SequenceChartMeta[]> => 
      ipcRenderer.invoke('sequenceChart:getList'),
    get: (chartId: string): Promise<SequenceChart | null> => 
      ipcRenderer.invoke('sequenceChart:get', chartId),
    create: (options: CreateSequenceChartOptions): Promise<SequenceChart> => 
      ipcRenderer.invoke('sequenceChart:create', options),
    update: (chartId: string, updates: UpdateSequenceChartOptions): Promise<SequenceChart | null> => 
      ipcRenderer.invoke('sequenceChart:update', chartId, updates),
    delete: (chartId: string): Promise<boolean> => 
      ipcRenderer.invoke('sequenceChart:delete', chartId),
    // 事件管理
    addEvent: (chartId: string, event: CreateSequenceEventOptions): Promise<SequenceEvent | null> => 
      ipcRenderer.invoke('sequenceChart:addEvent', chartId, event),
    updateEvent: (chartId: string, eventId: string, updates: UpdateSequenceEventOptions): Promise<SequenceEvent | null> => 
      ipcRenderer.invoke('sequenceChart:updateEvent', chartId, eventId, updates),
    deleteEvent: (chartId: string, eventId: string): Promise<boolean> => 
      ipcRenderer.invoke('sequenceChart:deleteEvent', chartId, eventId),
    batchDeleteEvents: (chartId: string, eventIds: string[]): Promise<number> => 
      ipcRenderer.invoke('sequenceChart:batchDeleteEvents', chartId, eventIds),
    moveEvent: (chartId: string, eventId: string, newOrder: number): Promise<SequenceEvent[] | null> => 
      ipcRenderer.invoke('sequenceChart:moveEvent', chartId, eventId, newOrder),
    updateEventTime: (chartId: string, eventId: string, cellStart: number, cellEnd: number): Promise<SequenceEvent | null> => 
      ipcRenderer.invoke('sequenceChart:updateEventTime', chartId, eventId, cellStart, cellEnd),
    updateEvents: (chartId: string, events: SequenceEvent[]): Promise<SequenceChart | null> => 
      ipcRenderer.invoke('sequenceChart:updateEvents', chartId, events),
    // 事件类型管理
    getEventTypes: (chartId: string): Promise<SequenceEventType[]> => 
      ipcRenderer.invoke('sequenceChart:getEventTypes', chartId),
    addEventType: (chartId: string, type: Omit<SequenceEventType, 'id' | 'isBuiltIn' | 'order'>): Promise<SequenceEventType | null> => 
      ipcRenderer.invoke('sequenceChart:addEventType', chartId, type),
    updateEventType: (chartId: string, typeId: string, updates: Partial<SequenceEventType>): Promise<SequenceEventType | null> => 
      ipcRenderer.invoke('sequenceChart:updateEventType', chartId, typeId, updates),
    deleteEventType: (chartId: string, typeId: string): Promise<boolean> => 
      ipcRenderer.invoke('sequenceChart:deleteEventType', chartId, typeId),
    // 缩略图
    saveThumbnail: (chartId: string, dataUrl: string): Promise<string | null> => 
      ipcRenderer.invoke('sequenceChart:saveThumbnail', chartId, dataUrl),
    getThumbnailPath: (chartId: string): Promise<string | null> => 
      ipcRenderer.invoke('sequenceChart:getThumbnailPath', chartId),
    // 导入导出
    export: (chartId: string): Promise<string | null> => 
      ipcRenderer.invoke('sequenceChart:export', chartId),
    exportMarkdown: (chartId: string): Promise<string | null> => 
      ipcRenderer.invoke('sequenceChart:exportMarkdown', chartId),
    import: (jsonContent: string): Promise<SequenceChart | null> => 
      ipcRenderer.invoke('sequenceChart:import', jsonContent),
    showExportDialog: (chartName: string, format?: 'json' | 'markdown'): Promise<string | null> => 
      ipcRenderer.invoke('sequenceChart:showExportDialog', chartName, format),
    showImportDialog: (): Promise<string | null> => 
      ipcRenderer.invoke('sequenceChart:showImportDialog'),
    saveExportFile: (filePath: string, content: string): Promise<boolean> => 
      ipcRenderer.invoke('sequenceChart:saveExportFile', filePath, content),
    readImportFile: (filePath: string): Promise<string | null> => 
      ipcRenderer.invoke('sequenceChart:readImportFile', filePath)
  },
  // 组织架构图管理
  organization: {
    // 组织架构图管理
    getList: (): Promise<OrganizationGraphMeta[]> => 
      ipcRenderer.invoke('organization:getList'),
    get: (graphId: string): Promise<OrganizationGraph | null> => 
      ipcRenderer.invoke('organization:get', graphId),
    create: (options: CreateOrganizationGraphOptions): Promise<OrganizationGraph> => 
      ipcRenderer.invoke('organization:create', options),
    update: (graphId: string, updates: UpdateOrganizationGraphOptions): Promise<OrganizationGraph | null> => 
      ipcRenderer.invoke('organization:update', graphId, updates),
    delete: (graphId: string): Promise<boolean> => 
      ipcRenderer.invoke('organization:delete', graphId),
    // 节点管理
    addNode: (graphId: string, options: CreateOrganizationNodeOptions): Promise<OrganizationNode | null> => 
      ipcRenderer.invoke('organization:addNode', graphId, options),
    updateNode: (graphId: string, nodeId: string, updates: UpdateOrganizationNodeOptions): Promise<OrganizationNode | null> => 
      ipcRenderer.invoke('organization:updateNode', graphId, nodeId, updates),
    deleteNode: (graphId: string, nodeId: string): Promise<boolean> => 
      ipcRenderer.invoke('organization:deleteNode', graphId, nodeId),
    moveNode: (graphId: string, nodeId: string, newParentId: string | undefined): Promise<OrganizationNode | null> => 
      ipcRenderer.invoke('organization:moveNode', graphId, nodeId, newParentId),
    getChildren: (graphId: string, parentId: string | undefined): Promise<OrganizationNode[]> => 
      ipcRenderer.invoke('organization:getChildren', graphId, parentId),
    getDescendants: (graphId: string, nodeId: string): Promise<OrganizationNode[]> => 
      ipcRenderer.invoke('organization:getDescendants', graphId, nodeId),
    getAncestors: (graphId: string, nodeId: string): Promise<OrganizationNode[]> => 
      ipcRenderer.invoke('organization:getAncestors', graphId, nodeId),
    // 缩略图
    saveThumbnail: (graphId: string, dataUrl: string): Promise<string | null> => 
      ipcRenderer.invoke('organization:saveThumbnail', graphId, dataUrl),
    getThumbnailPath: (graphId: string): Promise<string | null> => 
      ipcRenderer.invoke('organization:getThumbnailPath', graphId),
    // 导入导出
    export: (graphId: string): Promise<string | null> => 
      ipcRenderer.invoke('organization:export', graphId),
    import: (jsonContent: string): Promise<OrganizationGraph | null> => 
      ipcRenderer.invoke('organization:import', jsonContent),
    showExportDialog: (graphName: string): Promise<string | null> => 
      ipcRenderer.invoke('organization:showExportDialog', graphName),
    showImportDialog: (): Promise<string | null> => 
      ipcRenderer.invoke('organization:showImportDialog')
  },
  // 文件系统
  file: {
    exists: (path: string): Promise<boolean> => ipcRenderer.invoke('file:exists', path),
    read: (path: string, encoding?: BufferEncoding): Promise<string> => 
      ipcRenderer.invoke('file:read', path, encoding),
    write: (path: string, content: string, options?: {
      encoding?: BufferEncoding
      createParentDir?: boolean
    }): Promise<void> => ipcRenderer.invoke('file:write', path, content, options),
    mkdir: (path: string, recursive?: boolean): Promise<void> => 
      ipcRenderer.invoke('file:mkdir', path, recursive),
    delete: (path: string, options?: {
      recursive?: boolean
      useTrash?: boolean
    }): Promise<void> => ipcRenderer.invoke('file:delete', path, options),
    rename: (oldPath: string, newPath: string): Promise<void> => 
      ipcRenderer.invoke('file:rename', oldPath, newPath),
    copy: (source: string, destination: string, overwrite?: boolean): Promise<void> => 
      ipcRenderer.invoke('file:copy', source, destination, overwrite),
    list: (path: string, options?: {
      recursive?: boolean
      includeHidden?: boolean
    }): Promise<FileNode[]> => ipcRenderer.invoke('file:list', path, options),
    getTree: (includeHidden?: boolean, sortOptions?: SortOptions): Promise<FileNode[]> => 
      ipcRenderer.invoke('file:get-tree', includeHidden, sortOptions),
    getInfo: (path: string): Promise<FileNode> => ipcRenderer.invoke('file:get-info', path)
  },
  // 图片管理
  image: {
    uploadFromBase64: (base64Data: string, config?: ImageFieldConfig): Promise<ImageUploadResult> => 
      ipcRenderer.invoke('image:uploadFromBase64', base64Data, config),
    uploadFromFile: (filePath: string, config?: ImageFieldConfig): Promise<ImageUploadResult> => 
      ipcRenderer.invoke('image:uploadFromFile', filePath, config),
    selectAndUpload: (config?: ImageFieldConfig): Promise<ImageUploadResult | null> => 
      ipcRenderer.invoke('image:selectAndUpload', config),
    delete: (imagePath: string): Promise<void> => 
      ipcRenderer.invoke('image:delete', imagePath),
    readAsBase64: (imagePath: string): Promise<string> => 
      ipcRenderer.invoke('image:readAsBase64', imagePath),
    exists: (imagePath: string): Promise<boolean> => 
      ipcRenderer.invoke('image:exists', imagePath),
    getFullPath: (imagePath: string): Promise<string> => 
      ipcRenderer.invoke('image:getFullPath', imagePath)
  },
  // 终端管理
  terminal: {
    create: (options?: TerminalCreateOptions): Promise<TerminalInstance> => 
      ipcRenderer.invoke('terminal:create', options),
    write: (id: string, data: string): Promise<boolean> => 
      ipcRenderer.invoke('terminal:write', id, data),
    resize: (id: string, cols: number, rows: number): void => 
      ipcRenderer.send('terminal:resize', id, { cols, rows }),
    destroy: (id: string): Promise<boolean> => 
      ipcRenderer.invoke('terminal:destroy', id),
    list: (): Promise<TerminalInstance[]> => 
      ipcRenderer.invoke('terminal:list'),
    getShells: (): Promise<ShellInfo[]> => 
      ipcRenderer.invoke('terminal:getShells'),
    setCwd: (id: string, cwd: string): Promise<TerminalInstance> => 
      ipcRenderer.invoke('terminal:setCwd', id, cwd),
    onData: (id: string, callback: (data: string) => void) => {
      const channel = `terminal:data:${id}`
      ipcRenderer.on(channel, (_, data) => callback(data))
      return () => ipcRenderer.removeAllListeners(channel)
    },
    onExit: (id: string, callback: (exitCode: number) => void) => {
      const channel = `terminal:exit:${id}`
      ipcRenderer.on(channel, (_, { exitCode }) => callback(exitCode))
      return () => ipcRenderer.removeAllListeners(channel)
    },
    removeDataListener: (id: string) => {
      ipcRenderer.removeAllListeners(`terminal:data:${id}`)
    },
    removeExitListener: (id: string) => {
      ipcRenderer.removeAllListeners(`terminal:exit:${id}`)
    }
  },
  // 终端窗口管理
  terminalWindow: {
    create: (): Promise<boolean> => ipcRenderer.invoke('terminal-window:create'),
    isOpen: (): Promise<boolean> => ipcRenderer.invoke('terminal-window:is-open'),
    close: () => ipcRenderer.send('terminal-window:close'),
    show: () => ipcRenderer.send('terminal-window:show'),
    minimize: () => ipcRenderer.send('terminal-window:minimize'),
    maximize: () => ipcRenderer.send('terminal-window:maximize'),
    isMaximized: (): Promise<boolean> => ipcRenderer.invoke('terminal-window:is-maximized'),
    onOpened: (callback: () => void) => {
      ipcRenderer.on('terminal-window-opened', () => callback())
    },
    onClosed: (callback: () => void) => {
      ipcRenderer.on('terminal-window-closed', () => callback())
    },
    removeOpenedListener: () => {
      ipcRenderer.removeAllListeners('terminal-window-opened')
    },
    removeClosedListener: () => {
      ipcRenderer.removeAllListeners('terminal-window-closed')
    }
  },
  // 平台信息
  platform: process.platform
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', {
      ...electronAPI,
      ...api
    })
  } catch (error) {
    console.error('Failed to expose electron API:', error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = {
    ...electronAPI,
    ...api
  }
}