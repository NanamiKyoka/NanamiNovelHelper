/**
 * 设置类型定义（主进程）
 * 
 * 从共享模块重导出，确保类型一致性
 */

export * from '@shared/settings'

/** 加密存储的敏感信息 */
export interface EncryptedKeys {
  apiKeys: Record<string, string>
  iv?: string
}
