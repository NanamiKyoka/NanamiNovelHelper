import { ElectronAPI } from '@electron-toolkit/preload'

/**
 * 项目相关类型定义
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

/**
 * 预设词汇类型
 */
type PresetVocabularyType = 'character' | 'location' | 'organization' | 'item' | 'magic' | 'event'

interface CreateProjectOptions {
  name: string
  parentPath: string
  description?: string
  author?: string
  tags?: string[]
  presetVocabulary?: PresetVocabularyType[]
}

interface RecentProject {
  path: string
  name: string
  lastOpened: string
}

interface ProjectStats {
  totalFiles: number
  totalWords: number
  fileTypes: Record<string, number>
}

/**
 * 文件节点类型
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

interface VocabularySettings {
  autoCreateVocabularyFile: boolean
}

/**
 * 敏感词相关类型定义
 */
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

interface GlobalLayoutSettings {
  badgeVisibility: BadgeVisibility
  badgeOrder: BadgeType[]
  sidebarBadgeVisibility: SidebarBadgeVisibility
  sidebarBadgeOrder: string[]
  showHiddenFiles: boolean
}

interface GlobalSettings {
  theme: GlobalThemeConfig
  window: WindowState
  language: 'zh-CN' | 'en-US' | 'ja-JP'
  sidebarWidth: number
  showWelcome: boolean
  layout: GlobalLayoutSettings
}

interface ProjectEditorSettings {
  fontFamily: string
  fontSize: number
  lineHeight: number
  letterSpacing: number
  paragraphSpacing: number
  autoSaveInterval: number
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

/**
 * 徽章类型
 */
type BadgeType =
  | 'vocabulary'
  | 'sensitive'
  | 'randomName'
  | 'relationship'
  | 'timeline'
  | 'sequenceChart'
  | 'organization'
  | 'map'
  | 'terminal'

/**
 * 默认徽章顺序
 */
declare const DEFAULT_BADGE_ORDER: BadgeType[]

interface BadgeVisibility {
  vocabulary: boolean
  sensitive: boolean
  randomName: boolean
  relationship: boolean
  timeline: boolean
  sequenceChart: boolean
  organization: boolean
  map: boolean
  terminal: boolean
}

interface SidebarBadgeVisibility {
  vocabulary: boolean
  sensitive: boolean
  relationship: boolean
  timeline: boolean
  sequenceChart: boolean
  organization: boolean
}

interface ProjectSettings {
  editor: ProjectEditorSettings
  highlight: ProjectHighlightSettings
  autoCreateVocabularyFile: boolean
  backup: ProjectBackupSettings
  expandedFolders: string[]
  hiddenItems: string[]
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
type OrganizationNodeStyle = 'simple' | 'card'

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

interface OrganizationGraphMeta {
  id: string
  name: string
  description?: string
  thumbnail?: string
  linkedVocabularyTypes: string[]
  nodeStyle: OrganizationNodeStyle
  nodeCount: number
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
}

interface UpdateOrganizationGraphOptions {
  name?: string
  description?: string
  linkedVocabularyTypes?: string[]
  nodeStyle?: OrganizationNodeStyle
  nodes?: OrganizationNode[]
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
 * Git 相关类型定义
 */
type GitMode = 'system' | 'isomorphic' | 'auto'

type GitFileStatus =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'ignored'
  | 'unmodified'

type GitFileStatusShort = 'M' | 'A' | 'D' | 'R' | 'C' | '?' | '!' | ' '

interface GitFileChange {
  path: string
  oldPath?: string
  status: GitFileStatus
  statusShort: GitFileStatusShort
  staged: boolean
  additions: number
  deletions: number
}

interface GitCommit {
  hash: string
  shortHash: string
  message: string
  title: string
  authorName: string
  authorEmail: string
  timestamp: number
  date: string
  parentHashes: string[]
  refs: string[]
}

interface GitBranch {
  name: string
  current: boolean
  upstream?: string
  ahead?: number
  behind?: number
  lastCommit?: GitCommit
  remote: boolean
}

interface GitDiffLine {
  type: 'add' | 'delete' | 'context'
  oldLineNumber?: number
  newLineNumber?: number
  content: string
}

interface GitDiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  header: string
  lines: GitDiffLine[]
}

interface GitFileDiff {
  path: string
  oldPath?: string
  status: GitFileStatus
  binary: boolean
  hunks: GitDiffHunk[]
  additions: number
  deletions: number
}

interface GitRepositoryStatus {
  branch: string | null
  hasChanges: boolean
  hasStagedChanges: boolean
  changes: GitFileChange[]
  stagedChanges: GitFileChange[]
  ahead: number
  behind: number
  rebasing: boolean
  merging: boolean
  conflicts: string[]
}

interface GitResult<T> {
  success: boolean
  data?: T
  error?: string
}

interface GitLogOptions {
  maxCount?: number
  skip?: number
  path?: string
  search?: string
  author?: string
}

interface GitCommitOptions {
  message: string
  all?: boolean
  authorName?: string
  authorEmail?: string
}

interface GitResetOptions {
  commit: string
  mode: 'soft' | 'mixed' | 'hard'
}

interface GitCheckoutOptions {
  target: string
  createBranch?: boolean
  branchName?: string
  force?: boolean
  paths?: string[]
}

interface GitMergeOptions {
  branch: string
  allowUnrelatedHistories?: boolean
  message?: string
}

/**
 * 窗口控制 API
 */
export interface WindowAPI {
  minimize: () => void
  maximize: () => void
  close: () => void
  isMaximized: () => Promise<boolean>
  setFullScreen: (isFullscreen: boolean) => void
  isFullScreen: () => Promise<boolean>
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => void
  removeMaximizeListener: () => void
  onFullScreenChange: (callback: (isFullscreen: boolean) => void) => void
  removeFullScreenListener: () => void
  onFileChange: (
    callback: (event: { type: 'add' | 'change' | 'unlink'; path: string }) => void
  ) => void
  removeFileChangeListener: () => void
}

/**
 * 项目管理 API
 */
export interface ProjectAPI {
  create: (options: CreateProjectOptions) => Promise<Project>
  open: (path: string) => Promise<Project>
  close: () => Promise<void>
  getCurrent: () => Promise<Project | null>
  updateInfo: (info: Partial<Project>) => Promise<Project>
  getRecent: () => Promise<RecentProject[]>
  removeRecent: (path: string) => Promise<void>
  clearRecent: () => Promise<void>
  showOpenDialog: () => Promise<string | null>
  showCreateDialog: () => Promise<string | null>
  isValid: (path: string) => Promise<boolean>
  getStats: (path: string) => Promise<ProjectStats>
}

/**
 * 词汇管理 API
 */
export interface VocabularyAPI {
  // 类型管理
  loadTypes: () => Promise<VocabularyType[]>
  saveTypes: (types: VocabularyType[]) => Promise<void>
  addType: (type: Omit<VocabularyType, 'id' | 'createdAt' | 'updatedAt'>) => Promise<VocabularyType>
  updateType: (id: string, updates: Partial<VocabularyType>) => Promise<VocabularyType | null>
  deleteType: (id: string) => Promise<boolean>
  // 条目管理
  loadEntries: (typeId?: string) => Promise<VocabularyEntry[]>
  saveEntries: (typeId: string, entries: VocabularyEntry[]) => Promise<void>
  addEntry: (
    entry: Omit<VocabularyEntry, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<VocabularyEntry>
  updateEntry: (id: string, updates: Partial<VocabularyEntry>) => Promise<VocabularyEntry | null>
  deleteEntry: (id: string) => Promise<boolean>
  // 关联文件
  createLinkedFile: (entry: VocabularyEntry) => Promise<string | null>
  linkFile: (entryId: string, filePath: string) => Promise<boolean>
  unlinkFile: (entryId: string) => Promise<boolean>
  // 设置
  getSettings: () => Promise<VocabularySettings>
  updateSettings: (settings: Partial<VocabularySettings>) => Promise<void>
}

/**
 * 敏感词管理 API
 */
export interface SensitiveAPI {
  loadWords: () => Promise<SensitiveWord[]>
  saveWords: (words: SensitiveWord[]) => Promise<void>
  addWord: (word: Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>) => Promise<SensitiveWord>
  updateWord: (id: string, updates: Partial<SensitiveWord>) => Promise<SensitiveWord | null>
  deleteWord: (id: string) => Promise<boolean>
  importWords: (
    words: Array<Omit<SensitiveWord, 'id' | 'createdAt' | 'updatedAt'>>
  ) => Promise<number>
}

/**
 * 高亮配置管理 API
 */
export interface HighlightAPI {
  loadConfig: () => Promise<HighlightConfig>
  saveConfig: (config: Partial<HighlightConfig>) => Promise<void>
}

/**
 * 全局设置 API
 */
export interface GlobalSettingsAPI {
  getAll: () => Promise<GlobalSettings>
  update: (settings: Partial<GlobalSettings>) => Promise<GlobalSettings>
  reset: () => Promise<GlobalSettings>
  getTheme: () => Promise<GlobalThemeConfig>
  updateTheme: (theme: Partial<GlobalThemeConfig>) => Promise<GlobalThemeConfig>
  getWindowState: () => Promise<WindowState>
  updateWindowState: (state: Partial<WindowState>) => Promise<WindowState>
  getLanguage: () => Promise<'zh-CN' | 'en-US' | 'ja-JP'>
  setLanguage: (language: 'zh-CN' | 'en-US' | 'ja-JP') => void
  getSidebarWidth: () => Promise<number>
  setSidebarWidth: (width: number) => void
  // 布局设置
  getLayout: () => Promise<GlobalLayoutSettings>
  updateLayout: (layout: Partial<GlobalLayoutSettings>) => Promise<GlobalLayoutSettings>
  getBadgeVisibility: () => Promise<BadgeVisibility>
  updateBadgeVisibility: (settings: Partial<BadgeVisibility>) => Promise<BadgeVisibility>
  getBadgeOrder: () => Promise<BadgeType[]>
  updateBadgeOrder: (order: BadgeType[]) => Promise<BadgeType[]>
  getSidebarBadgeVisibility: () => Promise<SidebarBadgeVisibility>
  updateSidebarBadgeVisibility: (
    settings: Partial<SidebarBadgeVisibility>
  ) => Promise<SidebarBadgeVisibility>
  getSidebarBadgeOrder: () => Promise<string[]>
  updateSidebarBadgeOrder: (order: string[]) => Promise<string[]>
  getShowHiddenFiles: () => Promise<boolean>
  setShowHiddenFiles: (value: boolean) => Promise<void>
  // API Key 管理
  getApiKey: (keyName: string) => Promise<string | null>
  setApiKey: (keyName: string, value: string) => void
  deleteApiKey: (keyName: string) => void
  getApiKeyNames: () => Promise<string[]>
  isEncryptionAvailable: () => Promise<boolean>
}

/**
 * 项目设置 API
 */
export interface ProjectSettingsAPI {
  getAll: () => Promise<ProjectSettings>
  update: (settings: Partial<ProjectSettings>) => Promise<ProjectSettings>
  saveNow: () => void
  reset: () => Promise<ProjectSettings>
  getEditor: () => Promise<ProjectEditorSettings>
  updateEditor: (settings: Partial<ProjectEditorSettings>) => Promise<ProjectEditorSettings>
  getHighlight: () => Promise<ProjectHighlightSettings>
  updateHighlight: (
    settings: Partial<ProjectHighlightSettings>
  ) => Promise<ProjectHighlightSettings>
  getBackup: () => Promise<ProjectBackupSettings>
  updateBackup: (settings: Partial<ProjectBackupSettings>) => Promise<ProjectBackupSettings>
  getAutoCreateVocabularyFile: () => Promise<boolean>
  setAutoCreateVocabularyFile: (value: boolean) => Promise<void>
  getExpandedFolders: () => Promise<string[] | null>
  setExpandedFolders: (folders: string[]) => Promise<void>
  getHiddenItems: () => Promise<string[]>
  setHiddenItems: (items: string[]) => Promise<void>
}

/**
 * 设置 API
 */
export interface SettingsAPI {
  global: GlobalSettingsAPI
  project: ProjectSettingsAPI
}

/**
 * 备份管理 API
 */
export interface BackupAPI {
  create: () => Promise<string | null>
  list: () => Promise<BackupInfo[]>
  restore: (filename: string) => Promise<boolean>
  delete: (filename: string) => Promise<boolean>
  export: (filename: string) => Promise<string | null>
  import: () => Promise<string | null>
}

/**
 * 关系图管理 API
 */
export interface RelationshipAPI {
  // 关系图管理
  getList: () => Promise<RelationshipGraphMeta[]>
  get: (graphId: string) => Promise<RelationshipGraph | null>
  create: (options: CreateRelationshipGraphOptions) => Promise<RelationshipGraph>
  update: (
    graphId: string,
    updates: UpdateRelationshipGraphOptions
  ) => Promise<RelationshipGraph | null>
  delete: (graphId: string) => Promise<boolean>
  // 节点管理
  addNode: (
    graphId: string,
    node: Omit<RelationshipNode, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<RelationshipNode | null>
  updateNode: (
    graphId: string,
    nodeId: string,
    updates: Partial<RelationshipNode>
  ) => Promise<RelationshipNode | null>
  deleteNode: (graphId: string, nodeId: string) => Promise<boolean>
  // 边管理
  addEdge: (
    graphId: string,
    edge: Omit<RelationshipEdge, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<RelationshipEdge | null>
  updateEdge: (
    graphId: string,
    edgeId: string,
    updates: Partial<RelationshipEdge>
  ) => Promise<RelationshipEdge | null>
  deleteEdge: (graphId: string, edgeId: string) => Promise<boolean>
  // 关系类型管理
  getRelationTypes: (graphId: string) => Promise<RelationType[]>
  addRelationType: (
    graphId: string,
    type: Omit<RelationType, 'id' | 'isBuiltIn' | 'order'>
  ) => Promise<RelationType | null>
  updateRelationType: (
    graphId: string,
    typeId: string,
    updates: Partial<RelationType>
  ) => Promise<RelationType | null>
  deleteRelationType: (graphId: string, typeId: string) => Promise<boolean>
  // 缩略图
  saveThumbnail: (graphId: string, dataUrl: string) => Promise<string | null>
  getThumbnailPath: (graphId: string) => Promise<string | null>
  // 导入导出
  export: (graphId: string) => Promise<string | null>
  import: (jsonContent: string) => Promise<RelationshipGraph | null>
  showExportDialog: (graphName: string) => Promise<string | null>
  showImportDialog: () => Promise<string | null>
}

/**
 * 时间线管理 API
 */
export interface TimelineAPI {
  // 时间线管理
  getList: () => Promise<TimelineMeta[]>
  get: (timelineId: string) => Promise<Timeline | null>
  create: (options: CreateTimelineOptions) => Promise<Timeline>
  update: (timelineId: string, updates: UpdateTimelineOptions) => Promise<Timeline | null>
  delete: (timelineId: string) => Promise<boolean>
  // 节点管理
  addNode: (
    timelineId: string,
    node: Omit<TimelineNode, 'id' | 'createdAt' | 'updatedAt' | 'order'>
  ) => Promise<TimelineNode | null>
  updateNode: (
    timelineId: string,
    nodeId: string,
    updates: Partial<TimelineNode>
  ) => Promise<TimelineNode | null>
  deleteNode: (timelineId: string, nodeId: string) => Promise<boolean>
  batchDeleteNodes: (timelineId: string, nodeIds: string[]) => Promise<number>
  moveNode: (timelineId: string, nodeId: string, newOrder: number) => Promise<TimelineNode[] | null>
  batchMoveNodes: (
    timelineId: string,
    nodeIds: string[],
    targetOrder: number
  ) => Promise<TimelineNode[] | null>
  updateNodes: (timelineId: string, nodes: TimelineNode[]) => Promise<Timeline | null>
  // 分支管理
  createBranch: (
    parentTimelineId: string,
    branchFromNodeId: string,
    name?: string
  ) => Promise<Timeline | null>
  mergeBranch: (
    branchTimelineId: string,
    targetTimelineId: string,
    targetNodeId?: string
  ) => Promise<boolean>
  getBranches: (parentTimelineId: string) => Promise<TimelineMeta[]>
  getBranchSourceNode: (timelineId: string) => Promise<TimelineNode | null>
  // 缩略图
  saveThumbnail: (timelineId: string, dataUrl: string) => Promise<string | null>
  getThumbnailPath: (timelineId: string) => Promise<string | null>
  // 导入导出
  export: (timelineId: string) => Promise<string | null>
  exportMarkdown: (timelineId: string) => Promise<string | null>
  import: (jsonContent: string) => Promise<Timeline | null>
  showExportDialog: (timelineName: string, format?: 'json' | 'markdown') => Promise<string | null>
  showImportDialog: () => Promise<string | null>
  saveExportFile: (filePath: string, content: string) => Promise<boolean>
  readImportFile: (filePath: string) => Promise<string | null>
}

/**
 * 事序图管理 API
 */
export interface SequenceChartAPI {
  // 事序图管理
  getList: () => Promise<SequenceChartMeta[]>
  get: (chartId: string) => Promise<SequenceChart | null>
  create: (options: CreateSequenceChartOptions) => Promise<SequenceChart>
  update: (chartId: string, updates: UpdateSequenceChartOptions) => Promise<SequenceChart | null>
  delete: (chartId: string) => Promise<boolean>
  // 事件管理
  addEvent: (chartId: string, event: CreateSequenceEventOptions) => Promise<SequenceEvent | null>
  updateEvent: (
    chartId: string,
    eventId: string,
    updates: UpdateSequenceEventOptions
  ) => Promise<SequenceEvent | null>
  deleteEvent: (chartId: string, eventId: string) => Promise<boolean>
  batchDeleteEvents: (chartId: string, eventIds: string[]) => Promise<number>
  moveEvent: (chartId: string, eventId: string, newOrder: number) => Promise<SequenceEvent[] | null>
  updateEventTime: (
    chartId: string,
    eventId: string,
    cellStart: number,
    cellEnd: number
  ) => Promise<SequenceEvent | null>
  updateEvents: (chartId: string, events: SequenceEvent[]) => Promise<SequenceChart | null>
  // 事件类型管理
  getEventTypes: (chartId: string) => Promise<SequenceEventType[]>
  addEventType: (
    chartId: string,
    type: Omit<SequenceEventType, 'id' | 'isBuiltIn' | 'order'>
  ) => Promise<SequenceEventType | null>
  updateEventType: (
    chartId: string,
    typeId: string,
    updates: Partial<SequenceEventType>
  ) => Promise<SequenceEventType | null>
  deleteEventType: (chartId: string, typeId: string) => Promise<boolean>
  // 缩略图
  saveThumbnail: (chartId: string, dataUrl: string) => Promise<string | null>
  getThumbnailPath: (chartId: string) => Promise<string | null>
  // 导入导出
  export: (chartId: string) => Promise<string | null>
  exportMarkdown: (chartId: string) => Promise<string | null>
  import: (jsonContent: string) => Promise<SequenceChart | null>
  showExportDialog: (chartName: string, format?: 'json' | 'markdown') => Promise<string | null>
  showImportDialog: () => Promise<string | null>
  saveExportFile: (filePath: string, content: string) => Promise<boolean>
  readImportFile: (filePath: string) => Promise<string | null>
}

/**
 * 组织架构图管理 API
 */
export interface OrganizationAPI {
  // 组织架构图管理
  getList: () => Promise<OrganizationGraphMeta[]>
  get: (graphId: string) => Promise<OrganizationGraph | null>
  create: (options: CreateOrganizationGraphOptions) => Promise<OrganizationGraph>
  update: (
    graphId: string,
    updates: UpdateOrganizationGraphOptions
  ) => Promise<OrganizationGraph | null>
  delete: (graphId: string) => Promise<boolean>
  // 节点管理
  addNode: (
    graphId: string,
    options: CreateOrganizationNodeOptions
  ) => Promise<OrganizationNode | null>
  updateNode: (
    graphId: string,
    nodeId: string,
    updates: UpdateOrganizationNodeOptions
  ) => Promise<OrganizationNode | null>
  deleteNode: (graphId: string, nodeId: string) => Promise<boolean>
  moveNode: (
    graphId: string,
    nodeId: string,
    newParentId: string | undefined
  ) => Promise<OrganizationNode | null>
  getChildren: (graphId: string, parentId: string | undefined) => Promise<OrganizationNode[]>
  getDescendants: (graphId: string, nodeId: string) => Promise<OrganizationNode[]>
  getAncestors: (graphId: string, nodeId: string) => Promise<OrganizationNode[]>
  // 缩略图
  saveThumbnail: (graphId: string, dataUrl: string) => Promise<string | null>
  getThumbnailPath: (graphId: string) => Promise<string | null>
  // 导入导出
  export: (graphId: string) => Promise<string | null>
  import: (jsonContent: string) => Promise<OrganizationGraph | null>
  showExportDialog: (graphName: string) => Promise<string | null>
  showImportDialog: () => Promise<string | null>
}

/**
 * 文件系统 API
 */
export interface FileAPI {
  exists: (path: string) => Promise<boolean>
  read: (path: string, encoding?: BufferEncoding) => Promise<string>
  write: (
    path: string,
    content: string,
    options?: {
      encoding?: BufferEncoding
      createParentDir?: boolean
    }
  ) => Promise<void>
  mkdir: (path: string, recursive?: boolean) => Promise<void>
  delete: (
    path: string,
    options?: {
      recursive?: boolean
      useTrash?: boolean
    }
  ) => Promise<void>
  rename: (oldPath: string, newPath: string) => Promise<void>
  copy: (source: string, destination: string, overwrite?: boolean) => Promise<void>
  list: (
    path: string,
    options?: {
      recursive?: boolean
      includeHidden?: boolean
    }
  ) => Promise<FileNode[]>
  getTree: (
    includeHidden?: boolean,
    sortOptions?: SortOptions,
    hiddenItems?: string[]
  ) => Promise<FileNode[]>
  getInfo: (path: string) => Promise<FileNode>
  showSaveDialog: (options?: {
    title?: string
    defaultPath?: string
    filters?: Array<{ name: string; extensions: string[] }>
  }) => Promise<string | null>
  exportTxt: (filePath: string, content: string) => Promise<boolean>
}

/**
 * 图片管理 API
 */
export interface ImageAPI {
  uploadFromBase64: (base64Data: string, config?: ImageFieldConfig) => Promise<ImageUploadResult>
  uploadFromFile: (filePath: string, config?: ImageFieldConfig) => Promise<ImageUploadResult>
  selectAndUpload: (config?: ImageFieldConfig) => Promise<ImageUploadResult | null>
  delete: (imagePath: string) => Promise<void>
  readAsBase64: (imagePath: string) => Promise<string>
  exists: (imagePath: string) => Promise<boolean>
  getFullPath: (imagePath: string) => Promise<string>
}

/**
 * 终端管理 API
 */
export interface TerminalAPI {
  create: (options?: TerminalCreateOptions) => Promise<TerminalInstance>
  write: (id: string, data: string) => Promise<boolean>
  resize: (id: string, cols: number, rows: number) => void
  destroy: (id: string) => Promise<boolean>
  list: () => Promise<TerminalInstance[]>
  getShells: () => Promise<ShellInfo[]>
  setCwd: (id: string, cwd: string) => Promise<TerminalInstance>
  onData: (id: string, callback: (data: string) => void) => () => void
  onExit: (id: string, callback: (exitCode: number) => void) => () => void
  removeDataListener: (id: string) => void
  removeExitListener: (id: string) => void
}

/**
 * 终端窗口管理 API
 */
export interface TerminalWindowAPI {
  create: () => Promise<boolean>
  isOpen: () => Promise<boolean>
  close: () => void
  show: () => void
  minimize: () => void
  maximize: () => void
  isMaximized: () => Promise<boolean>
  onOpened: (callback: () => void) => void
  onClosed: (callback: () => void) => void
  removeOpenedListener: () => void
  removeClosedListener: () => void
}

/**
 * Git 版本控制 API
 */
export interface GitAPI {
  // 仓库管理
  isRepo: (repoPath: string) => Promise<boolean>
  init: (options: {
    path: string
    defaultBranch?: string
    initialCommit?: string
  }) => Promise<GitResult<void>>
  status: (repoPath: string) => Promise<GitResult<GitRepositoryStatus>>
  // 提交管理
  log: (repoPath: string, options?: GitLogOptions) => Promise<GitResult<GitCommit[]>>
  add: (repoPath: string, filepaths: string[]) => Promise<GitResult<void>>
  restore: (repoPath: string, filepaths: string[], source?: string) => Promise<GitResult<void>>
  commit: (repoPath: string, options: GitCommitOptions) => Promise<GitResult<string>>
  reset: (repoPath: string, options: GitResetOptions) => Promise<GitResult<void>>
  // 差异
  diff: (repoPath: string, filepath: string, staged?: boolean) => Promise<GitResult<GitFileDiff>>
  // 分支管理
  branchList: (repoPath: string) => Promise<GitResult<GitBranch[]>>
  branchCreate: (repoPath: string, name: string, startPoint?: string) => Promise<GitResult<void>>
  branchDelete: (repoPath: string, name: string, force?: boolean) => Promise<GitResult<void>>
  branchRename: (repoPath: string, oldName: string, newName: string) => Promise<GitResult<void>>
  checkout: (repoPath: string, options: GitCheckoutOptions) => Promise<GitResult<void>>
  merge: (repoPath: string, options: GitMergeOptions) => Promise<GitResult<void>>
  // 配置
  configGet: (repoPath: string, key: string) => Promise<GitResult<string>>
  configSet: (repoPath: string, key: string, value: string) => Promise<GitResult<void>>
  // 模式
  setMode: (mode: GitMode) => Promise<GitResult<void>>
  getMode: () => Promise<{ mode: GitMode; useSystemGit: boolean }>
  // 提交详情
  getCommitFiles: (repoPath: string, commitHash: string) => Promise<GitResult<GitFileChange[]>>
  getCommitFileDiff: (
    repoPath: string,
    commitHash: string,
    filepath: string
  ) => Promise<GitResult<GitFileDiff>>
}

interface AiApiStreamChunk {
  type: 'chunk' | 'done' | 'error'
  content?: string
  error?: string
  tokensUsed?: { input: number; output: number }
  duration?: number
}

interface AiAssistantAPI {
  getTemplateList: () => Promise<Array<Record<string, unknown>>>
  getTemplates: () => Promise<Array<Record<string, unknown>>>
  getTemplate: (id: string) => Promise<Record<string, unknown> | null>
  saveTemplate: (template: Record<string, unknown>) => Promise<Record<string, unknown>>
  deleteTemplate: (id: string) => Promise<boolean>
  copyTemplateToProject: (id: string) => Promise<Record<string, unknown> | null>
  exportTemplate: (id: string) => Promise<string | null>
  importTemplate: (json5Content: string) => Promise<Record<string, unknown> | null>
  getWorkflowList: () => Promise<Array<Record<string, unknown>>>
  getWorkflows: () => Promise<Array<Record<string, unknown>>>
  getWorkflow: (id: string) => Promise<Record<string, unknown> | null>
  saveWorkflow: (workflow: Record<string, unknown>) => Promise<Record<string, unknown>>
  deleteWorkflow: (id: string) => Promise<boolean>
  exportWorkflow: (id: string) => Promise<string | null>
  importWorkflow: (json5Content: string) => Promise<Record<string, unknown> | null>
  createExecution: (workflowId: string, workflowName: string) => Promise<Record<string, unknown>>
  getExecution: (id: string) => Promise<Record<string, unknown> | null>
  updateExecution: (id: string, updates: Record<string, unknown>) => Promise<Record<string, unknown> | null>
  getExecutionHistory: () => Promise<Array<Record<string, unknown>>>
  deleteExecution: (id: string) => Promise<boolean>
  callApi: (prompt: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>
  callApiStream: (prompt: string, options?: Record<string, unknown>) => Promise<Record<string, unknown>>
  onStreamChunk: (callback: (chunk: AiApiStreamChunk) => void) => void
  removeStreamChunkListener: () => void
  testApiConnection: (provider: string) => Promise<{ success: boolean; error?: string }>
  getAvailableModels: (provider: string) => Promise<string[]>
}

interface DynamicSkillAPI {
  getList: () => Promise<Array<Record<string, unknown>>>
  get: (skillId: string) => Promise<Record<string, unknown> | undefined>
  reload: () => Promise<Array<Record<string, unknown>>>
  getTools: (skillId: string) => Promise<Array<Record<string, unknown>>>
  execute: (
    skillId: string,
    toolId: string,
    parameters: Record<string, unknown>,
    context: Record<string, unknown>
  ) => Promise<Record<string, unknown>>
  cancel: (executionId: string) => Promise<boolean>
  getWhitelist: () => Promise<Array<Record<string, unknown>>>
  addToWhitelist: (skillId: string, skillName: string, skillPath: string) => Promise<void>
  removeFromWhitelist: (skillId: string) => Promise<void>
  isTrusted: (skillId: string, skillPath: string) => Promise<boolean>
  create: (options: Record<string, unknown>) => Promise<Record<string, unknown>>
  update: (skillId: string, options: Record<string, unknown>) => Promise<Record<string, unknown>>
  delete: (skillId: string) => Promise<void>
  checkPython: () => Promise<{ available: boolean; version?: string; path?: string }>
  onExecutionOutput: (callback: (data: { executionId: string; line: string }) => void) => void
  removeExecutionOutputListener: () => void
}

declare global {
  interface Window {
    electron: ElectronAPI & {
      window: WindowAPI
      project: ProjectAPI
      vocabulary: VocabularyAPI
      sensitive: SensitiveAPI
      highlight: HighlightAPI
      settings: SettingsAPI
      backup: BackupAPI
      relationship: RelationshipAPI
      timeline: TimelineAPI
      sequenceChart: SequenceChartAPI
      organization: OrganizationAPI
      file: FileAPI
      image: ImageAPI
      terminal: TerminalAPI
      terminalWindow: TerminalWindowAPI
      git: GitAPI
      aiAssistant: AiAssistantAPI
      dynamicSkill: DynamicSkillAPI
      shell: {
        openExternal: (url: string) => Promise<boolean>
      }
      updater: {
        checkForUpdates: () => Promise<boolean>
        downloadUpdate: () => Promise<boolean>
        quitAndInstall: () => void
        onUpdateAvailable: (callback: (info: unknown) => void) => void
        onUpdateDownloaded: (callback: () => void) => void
        removeUpdateListeners: () => void
      }
      platform: NodeJS.Platform
    }
  }
}
