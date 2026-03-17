// ============================================
// 词汇高亮配置类型定义
// ============================================

/**
 * 匹配模式
 */
export type MatchMode = 'wholeWord' | 'partial'

/**
 * 高亮范围配置
 */
export interface HighlightScopeConfig {
  /** 是否启用词汇高亮 */
  enabled: boolean
  /** 包含的目录（相对路径，空数组表示全部） */
  includeDirectories: string[]
  /** 排除的目录（相对路径） */
  excludeDirectories: string[]
  /** 排除的文件扩展名（如 ['json5', 'json', 'yaml']） */
  excludeExtensions: string[]
  /** 排除的具体文件（相对路径） */
  excludeFiles: string[]
}

/**
 * 高亮匹配配置（全局默认）
 */
export interface HighlightMatchConfig {
  /** 匹配模式：全词匹配或部分匹配 */
  matchMode: MatchMode
  /** 是否区分大小写 */
  caseSensitive: boolean
  /** 是否匹配词汇的别名 */
  matchAliases: boolean
  /** 敏感词高亮开关 */
  sensitiveWordHighlight: boolean
  /** 敏感词高亮颜色（按严重程度） */
  sensitiveWordColors: Record<string, string>
}

/**
 * 词汇条目的匹配配置（覆盖全局默认）
 */
export interface VocabularyMatchOverride {
  /** 词汇条目 ID */
  entryId: string
  /** 是否启用高亮（null 表示使用全局默认） */
  enabled: boolean | null
  /** 匹配模式覆盖 */
  matchMode: MatchMode | null
  /** 大小写敏感覆盖 */
  caseSensitive: boolean | null
  /** 自定义颜色覆盖 */
  color: string | null
}

/**
 * 词汇类型的匹配配置（覆盖全局默认）
 */
export interface VocabularyTypeMatchOverride {
  /** 词汇类型 ID */
  typeId: string
  /** 是否启用该类型的高亮 */
  enabled: boolean
  /** 匹配模式覆盖 */
  matchMode: MatchMode | null
  /** 大小写敏感覆盖 */
  caseSensitive: boolean | null
}

/**
 * 高亮装饰样式配置
 */
export interface HighlightStyleConfig {
  /** 是否显示文字颜色（改变字体颜色） */
  showTextColor: boolean
  /** 是否显示粗体 */
  showBold: boolean
  /** 是否显示斜体 */
  showItalic: boolean
  /** 是否显示下划线 */
  showUnderline: boolean
  /** 下划线粗细（px） */
  underlineWidth: number
  /** 下划线样式 */
  underlineStyle: 'solid' | 'dashed' | 'dotted' | 'wavy'
  /** 是否显示 hover 提示 */
  showHoverTooltip: boolean
  /** hover 提示延迟（毫秒） */
  hoverDelay: number
}

/**
 * 高亮性能配置
 */
export interface HighlightPerformanceConfig {
  /** 大文件阈值（字节），超过此值降级处理 */
  largeFileThreshold: number
  /** 大文件是否禁用高亮 */
  disableOnLargeFile: boolean
  /** 高亮更新防抖时间（毫秒） */
  updateDebounce: number
  /** 最大高亮数量限制 */
  maxHighlights: number
}

/**
 * 悬浮卡片词汇类型配置
 */
export interface HoverCardTypeConfig {
  /** 词汇类型 ID */
  typeId: string
  /** 类型名称 */
  typeName: string
  /** 要显示的字段 ID 列表 */
  fields: string[]
}

/**
 * 悬浮卡片配置
 */
export interface HoverCardConfig {
  /** 是否启用悬浮卡片 */
  enabled: boolean
  /** 延迟显示时间（毫秒） */
  delay: number
  /** 每种词汇类型的字段配置 */
  typeConfigs: HoverCardTypeConfig[]
}

/**
 * 完整的高亮配置
 */
export interface HighlightConfig {
  /** 配置版本 */
  version: string
  /** 范围配置 */
  scope: HighlightScopeConfig
  /** 匹配配置 */
  match: HighlightMatchConfig
  /** 样式配置 */
  style: HighlightStyleConfig
  /** 性能配置 */
  performance: HighlightPerformanceConfig
  /** 悬浮卡片配置 */
  hoverCard: HoverCardConfig
  /** 词汇类型级别的配置覆盖 */
  typeOverrides: VocabularyTypeMatchOverride[]
  /** 词汇条目级别的配置覆盖 */
  entryOverrides: VocabularyMatchOverride[]
}

/**
 * 高亮匹配结果
 */
export interface HighlightMatch {
  /** 起始位置 */
  from: number
  /** 结束位置 */
  to: number
  /** 匹配的文本 */
  text: string
  /** 词汇条目 ID */
  entryId: string
  /** 词汇名称 */
  entryName: string
  /** 词汇类型 ID */
  typeId: string
  /** 词汇类型名称 */
  typeName: string
  /** 高亮颜色 */
  color: string
  /** 是否为敏感词 */
  isSensitive: boolean
  /** 敏感词严重程度（如果是敏感词） */
  severity?: string
}

/**
 * 高亮词汇模式（用于匹配）
 */
export interface HighlightPattern {
  /** 词汇条目 ID */
  id: string
  /** 主名称 */
  name: string
  /** 别名列表 */
  aliases: string[]
  /** 高亮颜色 */
  color: string
  /** 词汇类型 ID */
  typeId: string
  /** 匹配模式 */
  matchMode: MatchMode
  /** 大小写敏感 */
  caseSensitive: boolean
  /** 是否为敏感词 */
  isSensitive: boolean
  /** 敏感词严重程度 */
  severity?: string
  /** 优先级（用于解决冲突） */
  priority: number
}

// ============================================
// 默认配置
// ============================================

/**
 * 默认范围配置
 */
export const DEFAULT_SCOPE_CONFIG: HighlightScopeConfig = {
  enabled: true,
  includeDirectories: [],
  excludeDirectories: [],
  excludeExtensions: ['json5', 'json', 'yaml', 'yml', 'toml'],
  excludeFiles: []
}

/**
 * 默认匹配配置
 */
export const DEFAULT_MATCH_CONFIG: HighlightMatchConfig = {
  matchMode: 'wholeWord',
  caseSensitive: false,
  matchAliases: true,
  sensitiveWordHighlight: true,
  sensitiveWordColors: {
    low: '#faad14',
    medium: '#fa8c16',
    high: '#f5222d',
    critical: '#a8071a'
  }
}

/**
 * 默认样式配置
 */
export const DEFAULT_STYLE_CONFIG: HighlightStyleConfig = {
  showTextColor: true,
  showBold: false,
  showItalic: false,
  showUnderline: false,
  underlineWidth: 1,
  underlineStyle: 'solid',
  showHoverTooltip: true,
  hoverDelay: 300
}

/**
 * 默认性能配置
 */
export const DEFAULT_PERFORMANCE_CONFIG: HighlightPerformanceConfig = {
  largeFileThreshold: 500 * 1024, // 500KB
  disableOnLargeFile: true,
  updateDebounce: 100,
  maxHighlights: 5000
}

/**
 * 默认悬浮卡片配置
 */
export const DEFAULT_HOVER_CARD_CONFIG: HoverCardConfig = {
  enabled: true,
  delay: 300,
  typeConfigs: [
    {
      typeId: 'character',
      typeName: '角色',
      fields: [
        { fieldId: 'type', visible: true, order: 0 },
        { fieldId: 'gender', visible: true, order: 1 },
        { fieldId: 'age', visible: true, order: 2 },
        { fieldId: 'affiliation', visible: true, order: 3 },
      ]
    },
    {
      typeId: 'location',
      typeName: '地点',
      fields: [
        { fieldId: 'type', visible: true, order: 0 },
        { fieldId: 'location', visible: true, order: 1 },
      ]
    },
    {
      typeId: 'organization',
      typeName: '组织',
      fields: [
        { fieldId: 'type', visible: true, order: 0 },
        { fieldId: 'leader', visible: true, order: 1 },
      ]
    },
    {
      typeId: 'item',
      typeName: '道具',
      fields: [
        { fieldId: 'type', visible: true, order: 0 },
        { fieldId: 'rarity', visible: true, order: 1 },
        { fieldId: 'owner', visible: true, order: 2 },
      ]
    },
    {
      typeId: 'magic',
      typeName: '魔法/技能',
      fields: [
        { fieldId: 'type', visible: true, order: 0 },
        { fieldId: 'element', visible: true, order: 1 },
      ]
    },
    {
      typeId: 'event',
      typeName: '事件',
      fields: [
        { fieldId: 'type', visible: true, order: 0 },
        { fieldId: 'date', visible: true, order: 1 },
        { fieldId: 'location', visible: true, order: 2 },
      ]
    },
  ]
}

/**
 * 完整的默认高亮配置
 */
export const DEFAULT_HIGHLIGHT_CONFIG: HighlightConfig = {
  version: '1.0.0',
  scope: DEFAULT_SCOPE_CONFIG,
  match: DEFAULT_MATCH_CONFIG,
  style: DEFAULT_STYLE_CONFIG,
  performance: DEFAULT_PERFORMANCE_CONFIG,
  hoverCard: DEFAULT_HOVER_CARD_CONFIG,
  typeOverrides: [],
  entryOverrides: []
}

/**
 * 高亮配置文件名
 */
export const HIGHLIGHT_CONFIG_FILE = '.highlight.json'
