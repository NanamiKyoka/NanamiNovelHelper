/**
 * 共享常量测试 - 关系类型
 */

import { describe, it, expect } from 'vitest'
import {
  BUILTIN_RELATION_TYPES,
  getBuiltinRelationTypes,
  getRelationTypeById
} from './relationTypes'

describe('relationTypes constants', () => {
  describe('BUILTIN_RELATION_TYPES', () => {
    it('should have 10 built-in relation types', () => {
      expect(BUILTIN_RELATION_TYPES).toHaveLength(10)
    })

    it('should have correct structure for each type', () => {
      BUILTIN_RELATION_TYPES.forEach(type => {
        expect(type).toHaveProperty('id')
        expect(type).toHaveProperty('name')
        expect(type).toHaveProperty('color')
        expect(type).toHaveProperty('lineStyle')
        expect(type).toHaveProperty('lineWidth')
        expect(type).toHaveProperty('isBuiltIn')
        expect(type).toHaveProperty('order')
        expect(type.isBuiltIn).toBe(true)
      })
    })

    it('should have family as first type', () => {
      expect(BUILTIN_RELATION_TYPES[0].id).toBe('family')
      expect(BUILTIN_RELATION_TYPES[0].name).toBe('亲情')
    })

    it('should have neighbor as last type', () => {
      const lastType = BUILTIN_RELATION_TYPES[BUILTIN_RELATION_TYPES.length - 1]
      expect(lastType.id).toBe('neighbor')
      expect(lastType.name).toBe('邻居')
    })

    it('should have valid line styles', () => {
      const validLineStyles = ['solid', 'dashed', 'dotted']
      BUILTIN_RELATION_TYPES.forEach(type => {
        expect(validLineStyles).toContain(type.lineStyle)
      })
    })

    it('should have valid colors', () => {
      BUILTIN_RELATION_TYPES.forEach(type => {
        expect(type.color).toMatch(/^#[0-9a-fA-F]{6}$/)
      })
    })
  })

  describe('getBuiltinRelationTypes', () => {
    it('should return all built-in relation types', () => {
      const types = getBuiltinRelationTypes()
      expect(types).toEqual(BUILTIN_RELATION_TYPES)
    })

    it('should return the same reference (constant array)', () => {
      const types1 = getBuiltinRelationTypes()
      const types2 = getBuiltinRelationTypes()
      expect(types1).toBe(types2)
    })
  })

  describe('getRelationTypeById', () => {
    it('should return correct type for valid id', () => {
      const familyType = getRelationTypeById('family')
      expect(familyType).toBeDefined()
      expect(familyType?.name).toBe('亲情')
    })

    it('should return undefined for invalid id', () => {
      const type = getRelationTypeById('nonexistent')
      expect(type).toBeUndefined()
    })

    it('should return correct type for all built-in ids', () => {
      const ids = [
        'family',
        'friendship',
        'love',
        'enemy',
        'master',
        'superior',
        'ally',
        'rival',
        'colleague',
        'neighbor'
      ]
      ids.forEach(id => {
        const type = getRelationTypeById(id)
        expect(type).toBeDefined()
        expect(type?.id).toBe(id)
      })
    })
  })
})
