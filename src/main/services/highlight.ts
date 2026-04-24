/**
 * 高亮配置服务
 * 负责高亮配置的读写
 */

import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import JSON5 from 'json5'
import type { HighlightConfig } from '../types/highlight'
import {
  DEFAULT_HIGHLIGHT_CONFIG,
  HIGHLIGHT_CONFIG_FILE
} from '../types/highlight'
import { PROJECT_META_DIR } from '../types/project'
import { projectService } from './project'
import { createLogger } from '../utils/logger'

class HighlightService {
  private logger = createLogger('HighlightService')
  private config: HighlightConfig | null = null
  private configPath: string | null = null

  /**
   * 获取当前项目的配置文件路径
   * 配置文件存储在 .novelhelper 目录下
   */
  private getConfigPath(): string | null {
    const project = projectService.getCurrentProject()
    if (!project) return null
    return join(project.path, PROJECT_META_DIR, HIGHLIGHT_CONFIG_FILE)
  }

  /**
   * 加载高亮配置
   */
  loadConfig(): HighlightConfig {
    const configPath = this.getConfigPath()
    
    if (!configPath) {
      // 没有打开项目，返回默认配置
      return DEFAULT_HIGHLIGHT_CONFIG
    }

    this.configPath = configPath

    if (!existsSync(configPath)) {
      // 配置文件不存在，返回默认配置
      this.config = DEFAULT_HIGHLIGHT_CONFIG
      return this.config
    }

    try {
      const content = readFileSync(configPath, 'utf-8')
      const loaded = JSON5.parse(content) as HighlightConfig
      
      // 合并默认配置（处理版本升级时新增的字段）
      this.config = {
        ...DEFAULT_HIGHLIGHT_CONFIG,
        ...loaded,
        scope: { ...DEFAULT_HIGHLIGHT_CONFIG.scope, ...loaded.scope },
        match: { ...DEFAULT_HIGHLIGHT_CONFIG.match, ...loaded.match },
        style: { ...DEFAULT_HIGHLIGHT_CONFIG.style, ...loaded.style },
        performance: { ...DEFAULT_HIGHLIGHT_CONFIG.performance, ...loaded.performance },
        hoverCard: { ...DEFAULT_HIGHLIGHT_CONFIG.hoverCard, ...loaded.hoverCard }
      }
      
      return this.config
    } catch (error) {
      this.logger.error('加载高亮配置失败', error)
      this.config = DEFAULT_HIGHLIGHT_CONFIG
      return this.config
    }
  }

  /**
   * 保存高亮配置
   */
  saveConfig(config: Partial<HighlightConfig>): void {
    const configPath = this.getConfigPath()
    
    if (!configPath) {
      throw new Error('No project is open')
    }

    this.configPath = configPath

    // 确保 .novelhelper 目录存在
    const metaDir = join(projectService.getCurrentProject()!.path, PROJECT_META_DIR)
    if (!existsSync(metaDir)) {
      mkdirSync(metaDir, { recursive: true })
    }

    // 合并配置
    const newConfig: HighlightConfig = {
      ...DEFAULT_HIGHLIGHT_CONFIG,
      ...(this.config || {}),
      ...config,
      scope: {
        ...DEFAULT_HIGHLIGHT_CONFIG.scope,
        ...(this.config?.scope || {}),
        ...(config.scope || {})
      },
      match: {
        ...DEFAULT_HIGHLIGHT_CONFIG.match,
        ...(this.config?.match || {}),
        ...(config.match || {})
      },
      style: {
        ...DEFAULT_HIGHLIGHT_CONFIG.style,
        ...(this.config?.style || {}),
        ...(config.style || {})
      },
      performance: {
        ...DEFAULT_HIGHLIGHT_CONFIG.performance,
        ...(this.config?.performance || {}),
        ...(config.performance || {})
      },
      hoverCard: {
        ...DEFAULT_HIGHLIGHT_CONFIG.hoverCard,
        ...(this.config?.hoverCard || {}),
        ...(config.hoverCard || {})
      },
      typeOverrides: config.typeOverrides ?? this.config?.typeOverrides ?? [],
      entryOverrides: config.entryOverrides ?? this.config?.entryOverrides ?? []
    }

    // 更新版本
    newConfig.version = DEFAULT_HIGHLIGHT_CONFIG.version

    try {
      writeFileSync(configPath, JSON5.stringify(newConfig, null, 2), 'utf-8')
      this.config = newConfig
    } catch (error) {
      this.logger.error('保存高亮配置失败', error)
      throw error
    }
  }

  /**
   * 获取当前配置
   */
  getConfig(): HighlightConfig | null {
    return this.config
  }

  /**
   * 重置配置（项目关闭时）
   */
  reset(): void {
    this.config = null
    this.configPath = null
  }
}

export const highlightService = new HighlightService()