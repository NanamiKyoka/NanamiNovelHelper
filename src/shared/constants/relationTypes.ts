/**
 * 内置关系类型配置
 *
 * 定义默认可用的关系类型，供关系图功能使用
 * 此文件为关系类型的唯一定义源
 */

import type { RelationType } from '@shared/relationship'
import { THEME_COLORS, NEUTRAL_COLORS } from './colors'

/**
 * 内置关系类型 ID
 */
export type BuiltinRelationTypeId =
  | 'family' // 亲情
  | 'friendship' // 友情
  | 'love' // 爱情
  | 'enemy' // 敌对
  | 'master' // 师徒
  | 'superior' // 上下级
  | 'ally' // 同盟
  | 'rival' // 对手
  | 'colleague' // 同事
  | 'neighbor' // 邻居

/**
 * 内置关系类型列表
 */
export const BUILTIN_RELATION_TYPES: RelationType[] = [
  {
    id: 'family',
    name: '亲情',
    color: THEME_COLORS.red,
    lineStyle: 'solid',
    lineWidth: 2,
    isBuiltIn: true,
    order: 0
  },
  {
    id: 'friendship',
    name: '友情',
    color: THEME_COLORS.success,
    lineStyle: 'solid',
    lineWidth: 2,
    isBuiltIn: true,
    order: 1
  },
  {
    id: 'love',
    name: '爱情',
    color: THEME_COLORS.magenta,
    lineStyle: 'solid',
    lineWidth: 2,
    isBuiltIn: true,
    order: 2
  },
  {
    id: 'enemy',
    name: '敌对',
    color: NEUTRAL_COLORS.dark,
    lineStyle: 'dashed',
    lineWidth: 2,
    isBuiltIn: true,
    order: 3
  },
  {
    id: 'master',
    name: '师徒',
    color: THEME_COLORS.purple,
    lineStyle: 'solid',
    lineWidth: 2,
    isBuiltIn: true,
    order: 4
  },
  {
    id: 'superior',
    name: '上下级',
    color: THEME_COLORS.primary,
    lineStyle: 'solid',
    lineWidth: 1,
    isBuiltIn: true,
    order: 5
  },
  {
    id: 'ally',
    name: '同盟',
    color: THEME_COLORS.cyan,
    lineStyle: 'solid',
    lineWidth: 2,
    isBuiltIn: true,
    order: 6
  },
  {
    id: 'rival',
    name: '对手',
    color: THEME_COLORS.orange,
    lineStyle: 'dashed',
    lineWidth: 2,
    isBuiltIn: true,
    order: 7
  },
  {
    id: 'colleague',
    name: '同事',
    color: NEUTRAL_COLORS.grey,
    lineStyle: 'solid',
    lineWidth: 1,
    isBuiltIn: true,
    order: 8
  },
  {
    id: 'neighbor',
    name: '邻居',
    color: NEUTRAL_COLORS.lightGrey,
    lineStyle: 'dotted',
    lineWidth: 1,
    isBuiltIn: true,
    order: 9
  }
]

/**
 * 获取内置关系类型
 */
export function getBuiltinRelationTypes(): RelationType[] {
  return BUILTIN_RELATION_TYPES
}

/**
 * 根据ID获取关系类型
 */
export function getRelationTypeById(id: string): RelationType | undefined {
  return BUILTIN_RELATION_TYPES.find(t => t.id === id)
}
