/**
 * 内置关系类型配置
 * 
 * 定义默认可用的关系类型，供关系图功能使用
 */

import type { RelationType } from '@shared/relationship'

/**
 * 内置关系类型列表
 */
export const BUILTIN_RELATION_TYPES: RelationType[] = [
  { id: 'family', name: '家人', color: '#ff4d4f', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 1 },
  { id: 'friend', name: '朋友', color: '#52c41a', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 2 },
  { id: 'lover', name: '恋人', color: '#eb2f96', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 3 },
  { id: 'enemy', name: '敌人', color: '#722ed1', lineStyle: 'dashed', lineWidth: 2, isBuiltIn: true, order: 4 },
  { id: 'colleague', name: '同事', color: '#1890ff', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 5 },
  { id: 'neighbor', name: '邻居', color: '#13c2c2', lineStyle: 'dotted', lineWidth: 1, isBuiltIn: true, order: 6 },
  { id: 'classmate', name: '同学', color: '#faad14', lineStyle: 'solid', lineWidth: 1, isBuiltIn: true, order: 7 },
  { id: 'master-disciple', name: '师徒', color: '#fa541c', lineStyle: 'solid', lineWidth: 2, isBuiltIn: true, order: 8 },
  { id: 'rival', name: '竞争对手', color: '#2f54eb', lineStyle: 'dashed', lineWidth: 1, isBuiltIn: true, order: 9 },
  { id: 'acquaintance', name: '熟人', color: '#8c8c8c', lineStyle: 'dotted', lineWidth: 1, isBuiltIn: true, order: 10 },
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
