// 共享常量统一导出
export * from './relationTypes'
export * from './colors'

// 显式导出类型（解决 TypeScript 重新导出问题）
export type { BuiltinRelationTypeId } from './relationTypes'
