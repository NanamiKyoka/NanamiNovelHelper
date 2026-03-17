/**
 * 高亮配置服务
 * 负责高亮配置的读写
 */

import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import type { HighlightConfig } from '../types/highlight'
import {
  DEFAULT_HIGHLIGHT_CONFIG,
  HIGHLIGHT_CONFIG_FILE
} from '../types/highlight'
import { projectService } from './project'

class HighlightService {
  private config: HighlightConfig | null = null
  private configPath: string | null = null

  /**
   * 获取当前项目的配置文件路径
   */
  private getConfigPath(): string | null {
    const project = projectService.getCurrentProject()
    if (!project) return null
    return join(project.path, HIGHLIGHT_CONFIG_FILE)
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
      const loaded = JSON.parse(content) as HighlightConfig
      
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
      console.error('Failed to load highlight config:', error)
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
      writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8')
      this.config = newConfig
    } catch (error) {
      console.error('Failed to save highlight config:', error)
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
