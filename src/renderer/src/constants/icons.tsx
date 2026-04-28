/**
 * 统一图标映射表
 *
 * 确保项目中图标使用一致，避免视觉混淆
 */

import {
  // 文件操作
  FileOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  DownloadOutlined,
  UploadOutlined,

  // 编辑操作
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  UndoOutlined,
  RedoOutlined,
  SearchOutlined,
  ReplaceOutlined,

  // 视图操作
  EyeOutlined,
  EyeInvisibleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SettingOutlined,
  MenuOutlined,
  AppstoreOutlined,

  // 功能模块
  TagOutlined,
  TeamOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  TableOutlined,
  CodeOutlined,
  WarningOutlined,

  // 状态
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,

  // 操作
  PlusOutlined,
  MinusOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,

  // 类型图标（词汇类型）
  BookOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  HeartOutlined,
  StarOutlined,

  // 工具
  ToolOutlined,
  BulbTwoTone,
  RocketOutlined

  // 类型定义
} from '@ant-design/icons'

// 图标类型
export type IconName = keyof typeof ICON_MAP

/**
 * 图标映射表
 * 统一管理所有图标，确保一致性
 */
export const ICON_MAP = {
  // 文件操作
  file: FileOutlined,
  folder: FolderOutlined,
  folderOpen: FolderOpenOutlined,
  fileAdd: FileAddOutlined,
  folderAdd: FolderAddOutlined,
  delete: DeleteOutlined,
  edit: EditOutlined,
  save: SaveOutlined,
  download: DownloadOutlined,
  upload: UploadOutlined,

  // 编辑操作
  copy: CopyOutlined,
  cut: ScissorOutlined,
  paste: SnippetsOutlined,
  undo: UndoOutlined,
  redo: RedoOutlined,
  search: SearchOutlined,
  replace: ReplaceOutlined,

  // 视图操作
  visible: EyeOutlined,
  hidden: EyeInvisibleOutlined,
  fullscreen: FullscreenOutlined,
  fullscreenExit: FullscreenExitOutlined,
  settings: SettingOutlined,
  menu: MenuOutlined,
  grid: AppstoreOutlined,

  // 功能模块
  vocabulary: TagOutlined,
  organization: TeamOutlined,
  user: UserOutlined,
  map: EnvironmentOutlined,
  timeline: ClockCircleOutlined,
  calendar: CalendarOutlined,
  relationship: ApartmentOutlined,
  sequenceChart: TableOutlined,
  terminal: CodeOutlined,
  sensitive: WarningOutlined,

  // 状态
  check: CheckOutlined,
  close: CloseOutlined,
  loading: LoadingOutlined,
  warning: ExclamationCircleOutlined,
  info: InfoCircleOutlined,
  help: QuestionCircleOutlined,

  // 操作
  plus: PlusOutlined,
  minus: MinusOutlined,
  refresh: ReloadOutlined,
  export: ExportOutlined,
  import: ImportOutlined,
  more: MoreOutlined,
  arrowUp: ArrowUpOutlined,
  arrowDown: ArrowDownOutlined,
  arrowLeft: ArrowLeftOutlined,
  arrowRight: ArrowRightOutlined,

  // 词汇类型图标
  character: TeamOutlined,
  location: EnvironmentOutlined,
  organizationType: ApartmentOutlined,
  item: GiftOutlined,
  magic: ThunderboltOutlined,
  event: CalendarOutlined,

  // 工具
  tool: ToolOutlined,
  idea: BulbOutlined,
  rocket: RocketOutlined
} as const

/**
 * 词汇类型图标映射
 */
export const VOCABULARY_TYPE_ICONS: Record<string, typeof TeamOutlined> = {
  character: TeamOutlined,
  location: EnvironmentOutlined,
  organization: ApartmentOutlined,
  item: GiftOutlined,
  magic: ThunderboltOutlined,
  event: CalendarOutlined
}

/**
 * 词汇类型图标名称映射
 */
export const VOCABULARY_TYPE_ICON_NAMES: Record<string, string> = {
  character: 'TeamOutlined',
  location: 'EnvironmentOutlined',
  organization: 'ApartmentOutlined',
  item: 'GiftOutlined',
  magic: 'ThunderboltOutlined',
  event: 'CalendarOutlined'
}

/**
 * 功能模块图标映射
 */
export const MODULE_ICONS = {
  files: FolderOutlined,
  search: SearchOutlined,
  git: CodeOutlined,
  ai: BulbTwoTone,
  vocabulary: TagOutlined,
  relationship: ApartmentOutlined,
  timeline: ClockCircleOutlined,
  sequenceChart: TableOutlined,
  organization: TeamOutlined,
  map: EnvironmentOutlined,
  terminal: CodeOutlined,
  settings: SettingOutlined
} as const

/**
 * 获取图标组件
 * @param name 图标名称
 * @returns 图标组件
 */
export function getIcon(name: IconName) {
  return ICON_MAP[name]
}

/**
 * 获取词汇类型图标
 * @param typeId 词汇类型 ID
 * @returns 图标组件
 */
export function getVocabularyTypeIcon(typeId: string) {
  return VOCABULARY_TYPE_ICONS[typeId] || TagOutlined
}

/**
 * 获取模块图标
 * @param moduleId 模块 ID
 * @returns 图标组件
 */
export function getModuleIcon(moduleId: string) {
  return MODULE_ICONS[moduleId as keyof typeof MODULE_ICONS] || AppstoreOutlined
}

// 导出所有图标以便直接使用
export {
  // 文件操作
  FileOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  DownloadOutlined,
  UploadOutlined,

  // 编辑操作
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  UndoOutlined,
  RedoOutlined,
  SearchOutlined,
  ReplaceOutlined,

  // 视图操作
  EyeOutlined,
  EyeInvisibleOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SettingOutlined,
  MenuOutlined,
  AppstoreOutlined,

  // 功能模块
  TagOutlined,
  TeamOutlined,
  UserOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  TableOutlined,
  CodeOutlined,
  WarningOutlined,

  // 状态
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,

  // 操作
  PlusOutlined,
  MinusOutlined,
  ReloadOutlined,
  ExportOutlined,
  ImportOutlined,
  MoreOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,

  // 类型图标
  BookOutlined,
  GiftOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  HeartOutlined,
  StarOutlined,

  // 工具
  ToolOutlined,
  RocketOutlined
}
