/**
 * 词汇类型定义
 * 主进程和渲染进程共用
 */

import { THEME_COLORS, CHART_PALETTE } from './constants/colors'

// ============================================
// 字段类型定义
// ============================================

/**
 * 字段数据类型
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'tags'
  | 'select'
  | 'number'
  | 'date'
  | 'color'
  | 'reference'
  | 'image'

/**
 * 图片字段配置
 */
export interface ImageFieldConfig {
  /** 最大文件大小（字节），默认 5MB */
  maxSize?: number
  /** 允许的图片格式，默认 ['jpg', 'jpeg', 'png', 'gif', 'webp'] */
  allowedFormats?: string[]
  /** 最大宽度（像素），超过则压缩，默认 1920 */
  maxWidth?: number
  /** 最大高度（像素），超过则压缩，默认 1080 */
  maxHeight?: number
  /** 压缩质量（0-100），默认 85 */
  quality?: number
}

/**
 * 字段定义（用于词汇类型模板）
 */
export interface FieldDefinition {
  id: string
  name: string // 字段名称，如"姓名"、"年龄"
  type: FieldType
  options?: string[] // 用于 select 类型的选项
  referenceTypeId?: string // 用于 reference 类型，引用的词汇类型ID
  imageConfig?: ImageFieldConfig // 用于 image 类型的配置
  required?: boolean
  placeholder?: string
  defaultValue?: string | string[]
  width?: number // 表格列宽
  order: number // 排序
}

// ============================================
// 表格列配置
// ============================================

/**
 * 表格列配置
 */
export interface TableColumnConfig {
  fieldId: string // 关联的字段ID
  visible: boolean // 是否显示
  width: number // 列宽
  fixed?: 'left' | 'right' | null // 固定位置
  order: number // 排序
}

// ============================================
// 词汇类型
// ============================================

/**
 * 词汇类型
 */
export interface VocabularyType {
  id: string
  name: string // 类型名称，如"角色"、"地点"、"组织"
  icon?: string // 图标名称
  color: string // 默认颜色
  fields: FieldDefinition[] // 该类型包含的字段定义
  tableConfig: TableColumnConfig[] // 表格列配置
  isBuiltIn: boolean // 是否内置（内置的不可删除）
  order: number // 排序
  createdAt: string
  updatedAt: string
}

// ============================================
// 词汇条目
// ============================================

/**
 * 词汇条目
 */
export interface VocabularyEntry {
  id: string
  name: string // 词条名称
  aliases: string[] // 别名（用于高亮匹配）
  color: string // 高亮颜色
  typeId: string // 关联的词汇类型ID
  typeName: string // 冗余存储类型名称，便于显示
  fields: Record<string, string | string[]> // 字段值，key 为字段ID
  tags: string[] // 标签
  description?: string // 备注/描述
  linkedFilePath?: string // 关联的 Markdown 文件路径（相对于项目根目录）
  starred?: boolean // 是否收藏
  order: number // 排序序号
  createdAt: string
  updatedAt: string
}

// ============================================
// 内置词汇类型模板
// ============================================

/**
 * 角色模板的字段定义
 */
export const CHARACTER_FIELDS: FieldDefinition[] = [
  { id: 'name', name: '姓名', type: 'text', required: true, order: 0 },
  {
    id: 'type',
    name: '身份',
    type: 'select',
    options: ['主角', '配角', '反派', '路人', '其他'],
    order: 1
  },
  { id: 'gender', name: '性别', type: 'select', options: ['男', '女', '其他', '未知'], order: 2 },
  { id: 'age', name: '年龄', type: 'text', order: 3 },
  { id: 'appearance', name: '外貌特征', type: 'textarea', order: 4 },
  { id: 'personality', name: '性格特点', type: 'textarea', order: 5 },
  { id: 'background', name: '背景故事', type: 'textarea', order: 6 },
  { id: 'abilities', name: '能力技能', type: 'tags', order: 7 },
  { id: 'goals', name: '目标动机', type: 'textarea', order: 8 },
  { id: 'weaknesses', name: '弱点缺陷', type: 'textarea', order: 9 },
  { id: 'affiliation', name: '所属阵营', type: 'text', order: 10 },
  { id: 'relationships', name: '人物关系', type: 'tags', order: 11 }
]

/**
 * 地点模板的字段定义
 */
export const LOCATION_FIELDS: FieldDefinition[] = [
  { id: 'name', name: '名称', type: 'text', required: true, order: 0 },
  {
    id: 'type',
    name: '类型',
    type: 'select',
    options: ['城市', '村庄', '建筑', '区域', '秘境', '其他'],
    order: 1
  },
  { id: 'location', name: '地理位置', type: 'text', order: 2 },
  { id: 'description', name: '环境描述', type: 'textarea', order: 3 },
  { id: 'history', name: '历史背景', type: 'textarea', order: 4 },
  { id: 'inhabitants', name: '居民/势力', type: 'tags', order: 5 },
  { id: 'features', name: '特色事物', type: 'tags', order: 6 }
]

/**
 * 组织模板的字段定义
 */
export const ORGANIZATION_FIELDS: FieldDefinition[] = [
  { id: 'name', name: '名称', type: 'text', required: true, order: 0 },
  {
    id: 'type',
    name: '类型',
    type: 'select',
    options: ['门派', '商会', '家族', '朝廷', '帮会', '教派', '其他'],
    order: 1
  },
  { id: 'leader', name: '领导者', type: 'text', order: 2 },
  { id: 'members', name: '主要成员', type: 'tags', order: 3 },
  { id: 'description', name: '组织介绍', type: 'textarea', order: 4 },
  { id: 'philosophy', name: '理念宗旨', type: 'textarea', order: 5 },
  { id: 'territory', name: '势力范围', type: 'text', order: 6 },
  { id: 'allies', name: '盟友', type: 'tags', order: 7 },
  { id: 'enemies', name: '敌对', type: 'tags', order: 8 }
]

/**
 * 道具模板的字段定义
 */
export const ITEM_FIELDS: FieldDefinition[] = [
  { id: 'name', name: '名称', type: 'text', required: true, order: 0 },
  {
    id: 'type',
    name: '类型',
    type: 'select',
    options: ['武器', '防具', '饰品', '消耗品', '材料', '神器', '其他'],
    order: 1
  },
  {
    id: 'rarity',
    name: '稀有度',
    type: 'select',
    options: ['普通', '稀有', '史诗', '传说', '神话'],
    order: 2
  },
  { id: 'description', name: '物品描述', type: 'textarea', order: 3 },
  { id: 'effects', name: '效果能力', type: 'tags', order: 4 },
  { id: 'origin', name: '来历', type: 'textarea', order: 5 },
  { id: 'owner', name: '持有者', type: 'text', order: 6 }
]

/**
 * 魔法/技能模板的字段定义
 */
export const MAGIC_FIELDS: FieldDefinition[] = [
  { id: 'name', name: '名称', type: 'text', required: true, order: 0 },
  {
    id: 'type',
    name: '类型',
    type: 'select',
    options: ['法术', '武技', '天赋', '禁术', '秘术', '其他'],
    order: 1
  },
  {
    id: 'element',
    name: '属性',
    type: 'select',
    options: ['火', '水', '风', '土', '光', '暗', '雷', '冰', '无', '混合'],
    order: 2
  },
  { id: 'description', name: '效果描述', type: 'textarea', order: 3 },
  { id: 'requirements', name: '修炼条件', type: 'textarea', order: 4 },
  { id: 'users', name: '使用者', type: 'tags', order: 5 },
  { id: 'weakness', name: '弱点限制', type: 'textarea', order: 6 }
]

/**
 * 事件模板的字段定义
 */
export const EVENT_FIELDS: FieldDefinition[] = [
  { id: 'name', name: '事件名称', type: 'text', required: true, order: 0 },
  {
    id: 'type',
    name: '类型',
    type: 'select',
    options: ['历史事件', '剧情事件', '背景事件', '其他'],
    order: 1
  },
  { id: 'date', name: '发生时间', type: 'text', order: 2 },
  { id: 'location', name: '发生地点', type: 'text', order: 3 },
  { id: 'participants', name: '参与人物', type: 'tags', order: 4 },
  { id: 'description', name: '事件经过', type: 'textarea', order: 5 },
  { id: 'consequences', name: '后续影响', type: 'textarea', order: 6 }
]

/**
 * 类型图标映射
 */
export const TYPE_ICONS: Record<string, string> = {
  character: 'TeamOutlined',
  location: 'EnvironmentOutlined',
  organization: 'TeamOutlined',
  item: 'GiftOutlined',
  magic: 'ThunderboltOutlined',
  event: 'CalendarOutlined'
}

/**
 * 获取内置词汇类型列表
 */
export function getBuiltInVocabularyTypes(): VocabularyType[] {
  const now = new Date().toISOString()
  return [
    {
      id: 'character',
      name: '角色',
      icon: 'TeamOutlined',
      color: THEME_COLORS.primary,
      fields: CHARACTER_FIELDS,
      tableConfig: [],
      isBuiltIn: true,
      order: 0,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'location',
      name: '地点',
      icon: 'EnvironmentOutlined',
      color: THEME_COLORS.success,
      fields: LOCATION_FIELDS,
      tableConfig: [],
      isBuiltIn: true,
      order: 1,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'organization',
      name: '组织',
      icon: 'TeamOutlined',
      color: THEME_COLORS.purple,
      fields: ORGANIZATION_FIELDS,
      tableConfig: [],
      isBuiltIn: true,
      order: 2,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'item',
      name: '道具',
      icon: 'GiftOutlined',
      color: THEME_COLORS.warning,
      fields: ITEM_FIELDS,
      tableConfig: [],
      isBuiltIn: true,
      order: 3,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'magic',
      name: '魔法/技能',
      icon: 'ThunderboltOutlined',
      color: THEME_COLORS.magenta,
      fields: MAGIC_FIELDS,
      tableConfig: [],
      isBuiltIn: true,
      order: 4,
      createdAt: now,
      updatedAt: now
    },
    {
      id: 'event',
      name: '事件',
      icon: 'CalendarOutlined',
      color: THEME_COLORS.info,
      fields: EVENT_FIELDS,
      tableConfig: [],
      isBuiltIn: true,
      order: 5,
      createdAt: now,
      updatedAt: now
    }
  ]
}

/**
 * 默认颜色（使用图表调色板）
 */
export const VOCABULARY_DEFAULT_COLORS = CHART_PALETTE
