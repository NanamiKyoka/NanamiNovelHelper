/**
 * 安全数值工具函数
 * 用于处理可能为 NaN 的数值，确保 React children 不会收到 NaN
 */

/**
 * 检查值是否为有效的有限数字
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/**
 * 安全地将值转换为字符串
 * 如果值是 NaN 或无效数字，返回默认值
 */
export function safeNumberToString(value: unknown, defaultValue: string = '?'): string {
  if (isValidNumber(value)) {
    return String(value)
  }
  return defaultValue
}

/**
 * 安全地获取数值，如果无效则返回默认值
 */
export function safeNumber(value: unknown, defaultValue: number = 0): number {
  if (isValidNumber(value)) {
    return value
  }
  return defaultValue
}

/**
 * 安全地进行数值运算
 * 确保结果不是 NaN
 */
export function safeAdd(a: unknown, b: unknown, defaultValue: number = 0): number {
  const numA = safeNumber(a)
  const numB = safeNumber(b)
  const result = numA + numB
  return isValidNumber(result) ? result : defaultValue
}

export function safeSubtract(a: unknown, b: unknown, defaultValue: number = 0): number {
  const numA = safeNumber(a)
  const numB = safeNumber(b)
  const result = numA - numB
  return isValidNumber(result) ? result : defaultValue
}

export function safeMultiply(a: unknown, b: unknown, defaultValue: number = 0): number {
  const numA = safeNumber(a)
  const numB = safeNumber(b)
  const result = numA * numB
  return isValidNumber(result) ? result : defaultValue
}

export function safeDivide(a: unknown, b: unknown, defaultValue: number = 0): number {
  const numA = safeNumber(a)
  const numB = safeNumber(b)
  if (numB === 0) return defaultValue
  const result = numA / numB
  return isValidNumber(result) ? result : defaultValue
}
