import { describe, it, expect } from 'vitest'
import {
  ValidationError,
  validators,
  validateParams,
  validatePath,
  validateId,
  withValidation
} from './validation'

describe('ValidationError', () => {
  it('should create error with correct properties', () => {
    const error = new ValidationError('testField', 'string', 123)
    expect(error.name).toBe('ValidationError')
    expect(error.field).toBe('testField')
    expect(error.expected).toBe('string')
    expect(error.actual).toBe(123)
    expect(error.message).toContain('testField')
    expect(error.message).toContain('string')
  })
})

describe('validators', () => {
  describe('string', () => {
    it('should pass for valid strings', () => {
      expect(validators.string('hello', 'field')).toBe('hello')
      expect(validators.string('', 'field')).toBe('')
    })

    it('should throw for non-strings', () => {
      expect(() => validators.string(123, 'field')).toThrow(ValidationError)
      expect(() => validators.string(null, 'field')).toThrow(ValidationError)
      expect(() => validators.string(undefined, 'field')).toThrow(ValidationError)
      expect(() => validators.string(true, 'field')).toThrow(ValidationError)
    })
  })

  describe('nonEmptyString', () => {
    it('should pass for non-empty strings', () => {
      expect(validators.nonEmptyString('hello', 'field')).toBe('hello')
      expect(validators.nonEmptyString('  a  ', 'field')).toBe('  a  ')
    })

    it('should throw for empty or whitespace-only strings', () => {
      expect(() => validators.nonEmptyString('', 'field')).toThrow(ValidationError)
      expect(() => validators.nonEmptyString('   ', 'field')).toThrow(ValidationError)
    })

    it('should throw for non-strings', () => {
      expect(() => validators.nonEmptyString(123, 'field')).toThrow(ValidationError)
    })
  })

  describe('number', () => {
    it('should pass for valid numbers', () => {
      expect(validators.number(42, 'field')).toBe(42)
      expect(validators.number(0, 'field')).toBe(0)
      expect(validators.number(-1.5, 'field')).toBe(-1.5)
    })

    it('should throw for NaN', () => {
      expect(() => validators.number(NaN, 'field')).toThrow(ValidationError)
    })

    it('should throw for non-numbers', () => {
      expect(() => validators.number('42', 'field')).toThrow(ValidationError)
      expect(() => validators.number(null, 'field')).toThrow(ValidationError)
    })
  })

  describe('positiveInt', () => {
    it('should pass for positive integers', () => {
      expect(validators.positiveInt(1, 'field')).toBe(1)
      expect(validators.positiveInt(100, 'field')).toBe(100)
    })

    it('should throw for zero or negative', () => {
      expect(() => validators.positiveInt(0, 'field')).toThrow(ValidationError)
      expect(() => validators.positiveInt(-1, 'field')).toThrow(ValidationError)
    })

    it('should throw for non-integers', () => {
      expect(() => validators.positiveInt(1.5, 'field')).toThrow(ValidationError)
    })
  })

  describe('boolean', () => {
    it('should pass for booleans', () => {
      expect(validators.boolean(true, 'field')).toBe(true)
      expect(validators.boolean(false, 'field')).toBe(false)
    })

    it('should throw for truthy/falsy non-booleans', () => {
      expect(() => validators.boolean(1, 'field')).toThrow(ValidationError)
      expect(() => validators.boolean(0, 'field')).toThrow(ValidationError)
      expect(() => validators.boolean('', 'field')).toThrow(ValidationError)
    })
  })

  describe('object', () => {
    it('should pass for plain objects', () => {
      const obj = { a: 1, b: 'test' }
      expect(validators.object(obj, 'field')).toEqual(obj)
    })

    it('should throw for null', () => {
      expect(() => validators.object(null, 'field')).toThrow(ValidationError)
    })

    it('should throw for arrays', () => {
      expect(() => validators.object([], 'field')).toThrow(ValidationError)
    })

    it('should throw for primitives', () => {
      expect(() => validators.object('string', 'field')).toThrow(ValidationError)
    })
  })

  describe('array', () => {
    it('should pass for arrays', () => {
      expect(validators.array([1, 2, 3], 'field')).toEqual([1, 2, 3])
      expect(validators.array([], 'field')).toEqual([])
    })

    it('should throw for non-arrays', () => {
      expect(() => validators.array({}, 'field')).toThrow(ValidationError)
      expect(() => validators.array('array', 'field')).toThrow(ValidationError)
    })
  })

  describe('stringArray', () => {
    it('should pass for string arrays', () => {
      expect(validators.stringArray(['a', 'b'], 'field')).toEqual(['a', 'b'])
    })

    it('should throw for mixed arrays', () => {
      expect(() => validators.stringArray(['a', 1], 'field')).toThrow(ValidationError)
    })

    it('should throw for non-arrays', () => {
      expect(() => validators.stringArray('abc', 'field')).toThrow(ValidationError)
    })
  })

  describe('optional', () => {
    it('should return undefined for null/undefined', () => {
      expect(validators.optional(validators.string, undefined, 'field')).toBeUndefined()
      expect(validators.optional(validators.string, null, 'field')).toBeUndefined()
    })

    it('should validate non-null/undefined values', () => {
      expect(validators.optional(validators.string, 'hello', 'field')).toBe('hello')
    })

    it('should throw for invalid non-null values', () => {
      expect(() => validators.optional(validators.string, 123, 'field')).toThrow(ValidationError)
    })
  })

  describe('enum', () => {
    const directionValidator = validators.enum(['up', 'down', 'left', 'right'] as const)

    it('should pass for valid enum values', () => {
      expect(directionValidator('up', 'field')).toBe('up')
      expect(directionValidator('down', 'field')).toBe('down')
    })

    it('should throw for invalid enum values', () => {
      expect(() => directionValidator('diagonal', 'field')).toThrow(ValidationError)
    })

    it('should throw for non-string values', () => {
      expect(() => directionValidator(123, 'field')).toThrow(ValidationError)
    })
  })
})

describe('ParamValidator', () => {
  it('should chain validations', () => {
    const validator = validateParams('test:').nonEmptyString('hello', 'name').number(42, 'age')

    expect(() => validator.validate()).not.toThrow()
  })

  it('should throw on first failed validation', () => {
    const validator = validateParams('test:').nonEmptyString('', 'name').number(42, 'age')

    expect(() => validator.validate()).toThrow(ValidationError)
  })

  it('should include prefix in error field name', () => {
    const validator = validateParams('myHandler:').nonEmptyString('', 'param')

    try {
      validator.validate()
      expect.fail('Should have thrown')
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError)
      expect((error as ValidationError).field).toContain('myHandler:')
    }
  })

  it('isValid should return true for valid params', () => {
    const result = validateParams().nonEmptyString('test', 'field').isValid()
    expect(result).toBe(true)
  })

  it('isValid should return false for invalid params', () => {
    const result = validateParams().nonEmptyString('', 'field').isValid()
    expect(result).toBe(false)
  })

  it('should support custom validation', () => {
    const validator = validateParams().custom(() => {
      // eslint-disable-next-line no-constant-condition
      if (5 > 3) throw new Error('Custom check failed')
    })

    expect(() => validator.validate()).toThrow('Custom check failed')
  })

  it('should support enum validation', () => {
    const validator = validateParams().enum(['a', 'b', 'c'] as const, 'a', 'choice')

    expect(() => validator.validate()).not.toThrow()
  })

  it('should support optional validation', () => {
    const validator = validateParams().optional(validators.string, undefined, 'maybe')

    expect(() => validator.validate()).not.toThrow()
  })

  it('should support string chain validation', () => {
    const validator = validateParams().string('hello', 'name')
    expect(() => validator.validate()).not.toThrow()
  })

  it('should support number chain validation', () => {
    const validator = validateParams().number(42, 'age')
    expect(() => validator.validate()).not.toThrow()
  })

  it('should support positiveInt chain validation', () => {
    const validator = validateParams().positiveInt(5, 'count')
    expect(() => validator.validate()).not.toThrow()
  })

  it('should support boolean chain validation', () => {
    const validator = validateParams().boolean(true, 'enabled')
    expect(() => validator.validate()).not.toThrow()
  })

  it('should support object chain validation', () => {
    const validator = validateParams().object({ key: 'value' }, 'data')
    expect(() => validator.validate()).not.toThrow()
  })

  it('should support array chain validation', () => {
    const validator = validateParams().array([1, 2, 3], 'items')
    expect(() => validator.validate()).not.toThrow()
  })

  it('should support stringArray chain validation', () => {
    const validator = validateParams().stringArray(['a', 'b'], 'names')
    expect(() => validator.validate()).not.toThrow()
  })

  it('should throw for invalid string chain validation', () => {
    const validator = validateParams().string(123, 'name')
    expect(() => validator.validate()).toThrow(ValidationError)
  })

  it('should throw for invalid number chain validation', () => {
    const validator = validateParams().number('42', 'age')
    expect(() => validator.validate()).toThrow(ValidationError)
  })

  it('should throw for invalid positiveInt chain validation', () => {
    const validator = validateParams().positiveInt(-1, 'count')
    expect(() => validator.validate()).toThrow(ValidationError)
  })

  it('should throw for invalid boolean chain validation', () => {
    const validator = validateParams().boolean(1, 'enabled')
    expect(() => validator.validate()).toThrow(ValidationError)
  })

  it('should throw for invalid object chain validation', () => {
    const validator = validateParams().object(null, 'data')
    expect(() => validator.validate()).toThrow(ValidationError)
  })

  it('should throw for invalid array chain validation', () => {
    const validator = validateParams().array('not-array', 'items')
    expect(() => validator.validate()).toThrow(ValidationError)
  })

  it('should throw for invalid stringArray chain validation', () => {
    const validator = validateParams().stringArray([1, 2], 'names')
    expect(() => validator.validate()).toThrow(ValidationError)
  })
})

describe('validatePath', () => {
  it('should pass for valid paths', () => {
    expect(validatePath('/home/user/file.txt')).toBe('/home/user/file.txt')
  })

  it('should throw for empty paths', () => {
    expect(() => validatePath('')).toThrow(ValidationError)
  })

  it('should use default field name', () => {
    try {
      validatePath('')
      expect.fail('Should have thrown')
    } catch (error) {
      expect((error as ValidationError).field).toBe('path')
    }
  })

  it('should use custom field name', () => {
    try {
      validatePath('', 'filePath')
      expect.fail('Should have thrown')
    } catch (error) {
      expect((error as ValidationError).field).toBe('filePath')
    }
  })
})

describe('validateId', () => {
  it('should pass for valid IDs', () => {
    expect(validateId('abc-123')).toBe('abc-123')
  })

  it('should throw for empty IDs', () => {
    expect(() => validateId('')).toThrow(ValidationError)
  })

  it('should use default field name', () => {
    try {
      validateId('')
      expect.fail('Should have thrown')
    } catch (error) {
      expect((error as ValidationError).field).toBe('id')
    }
  })
})

describe('withValidation', () => {
  it('should call handler when validation passes', async () => {
    const handler = (name: string) => `Hello, ${name}!`
    const wrapped = withValidation(handler, name => {
      validators.nonEmptyString(name, 'name')
    })

    expect(wrapped('World')).toBe('Hello, World!')
  })

  it('should throw before calling handler when validation fails', () => {
    const handler = (name: string) => `Hello, ${name}!`
    const wrapped = withValidation(handler, name => {
      validators.nonEmptyString(name, 'name')
    })

    expect(() => wrapped('')).toThrow(ValidationError)
  })

  it('should work with async handlers', async () => {
    const handler = async (id: string) => ({ id })
    const wrapped = withValidation(handler, id => {
      validators.nonEmptyString(id, 'id')
    })

    const result = await wrapped('test-id')
    expect(result).toEqual({ id: 'test-id' })
  })
})
