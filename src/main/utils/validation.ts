/**
 * IPC 参数验证工具
 * 提供运行时类型检查，防止非法参数传入 Service
 */

/**
 * 验证错误类
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    public expected: string,
    public actual: unknown
  ) {
    super(`参数验证失败: ${field} 应为 ${expected}，实际为 ${typeof actual}`)
    this.name = 'ValidationError'
  }
}

/**
 * 类型验证器
 */
export const validators = {
  /** 验证字符串 */
  string: (value: unknown, field: string): string => {
    if (typeof value !== 'string') {
      throw new ValidationError(field, 'string', value)
    }
    return value
  },

  /** 验证非空字符串 */
  nonEmptyString: (value: unknown, field: string): string => {
    if (typeof value !== 'string' || value.trim() === '') {
      throw new ValidationError(field, '非空字符串', value)
    }
    return value
  },

  /** 验证数字 */
  number: (value: unknown, field: string): number => {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new ValidationError(field, 'number', value)
    }
    return value
  },

  /** 验证正整数 */
  positiveInt: (value: unknown, field: string): number => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
      throw new ValidationError(field, '正整数', value)
    }
    return value
  },

  /** 验证布尔值 */
  boolean: (value: unknown, field: string): boolean => {
    if (typeof value !== 'boolean') {
      throw new ValidationError(field, 'boolean', value)
    }
    return value
  },

  /** 验证对象 */
  object: (value: unknown, field: string): Record<string, unknown> => {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new ValidationError(field, 'object', value)
    }
    return value as Record<string, unknown>
  },

  /** 验证数组 */
  array: (value: unknown, field: string): unknown[] => {
    if (!Array.isArray(value)) {
      throw new ValidationError(field, 'array', value)
    }
    return value
  },

  /** 验证字符串数组 */
  stringArray: (value: unknown, field: string): string[] => {
    if (!Array.isArray(value) || !value.every(item => typeof item === 'string')) {
      throw new ValidationError(field, 'string[]', value)
    }
    return value as string[]
  },

  /** 验证可选值 */
  optional: <T>(
    validator: (value: unknown, field: string) => T,
    value: unknown,
    field: string
  ): T | undefined => {
    if (value === undefined || value === null) {
      return undefined
    }
    return validator(value, field)
  },

  /** 验证枚举值 */
  enum:
    <T extends string>(values: readonly T[]) =>
    (value: unknown, field: string): T => {
      if (typeof value !== 'string' || !values.includes(value as T)) {
        throw new ValidationError(field, `枚举值 (${values.join(' | ')})`, value)
      }
      return value as T
    }
}

/**
 * 参数验证器构建器
 */
export class ParamValidator {
  private validations: Array<() => void> = []
  private prefix: string

  constructor(prefix: string = '') {
    this.prefix = prefix
  }

  /** 添加字符串验证 */
  string(value: unknown, field: string): this {
    this.validations.push(() => validators.string(value, this.prefix + field))
    return this
  }

  /** 添加非空字符串验证 */
  nonEmptyString(value: unknown, field: string): this {
    this.validations.push(() => validators.nonEmptyString(value, this.prefix + field))
    return this
  }

  /** 添加数字验证 */
  number(value: unknown, field: string): this {
    this.validations.push(() => validators.number(value, this.prefix + field))
    return this
  }

  /** 添加正整数验证 */
  positiveInt(value: unknown, field: string): this {
    this.validations.push(() => validators.positiveInt(value, this.prefix + field))
    return this
  }

  /** 添加布尔验证 */
  boolean(value: unknown, field: string): this {
    this.validations.push(() => validators.boolean(value, this.prefix + field))
    return this
  }

  /** 添加对象验证 */
  object(value: unknown, field: string): this {
    this.validations.push(() => validators.object(value, this.prefix + field))
    return this
  }

  /** 添加数组验证 */
  array(value: unknown, field: string): this {
    this.validations.push(() => validators.array(value, this.prefix + field))
    return this
  }

  /** 添加字符串数组验证 */
  stringArray(value: unknown, field: string): this {
    this.validations.push(() => validators.stringArray(value, this.prefix + field))
    return this
  }

  /** 添加可选验证 */
  optional<T>(
    validator: (value: unknown, field: string) => T,
    value: unknown,
    field: string
  ): this {
    this.validations.push(() => validators.optional(validator, value, this.prefix + field))
    return this
  }

  /** 添加枚举验证 */
  enum<T extends string>(values: readonly T[], value: unknown, field: string): this {
    this.validations.push(() => validators.enum(values)(value, this.prefix + field))
    return this
  }

  /** 添加自定义验证 */
  custom(validation: () => void): this {
    this.validations.push(validation)
    return this
  }

  /** 执行所有验证 */
  validate(): void {
    for (const validation of this.validations) {
      validation()
    }
  }

  /** 执行验证并返回是否通过 */
  isValid(): boolean {
    try {
      this.validate()
      return true
    } catch {
      return false
    }
  }
}

/**
 * 创建参数验证器
 */
export function validateParams(prefix?: string): ParamValidator {
  return new ParamValidator(prefix)
}

/**
 * 验证路径参数（常用验证）
 */
export function validatePath(path: unknown, field: string = 'path'): string {
  return validators.nonEmptyString(path, field)
}

/**
 * 验证 ID 参数（常用验证）
 */
export function validateId(id: unknown, field: string = 'id'): string {
  return validators.nonEmptyString(id, field)
}

/**
 * IPC Handler 包装器 - 自动添加参数验证日志
 */
export function withValidation<T extends unknown[], R>(
  handler: (...args: T) => Promise<R> | R,
  validator: (...args: T) => void
): (...args: T) => Promise<R> | R {
  return (...args: T) => {
    validator(...args)
    return handler(...args)
  }
}
