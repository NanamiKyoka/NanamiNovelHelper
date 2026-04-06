/**
 * 全局加载组件
 * 
 * 显示全局加载状态，支持：
 * - 全屏遮罩模式
 * - 进度展示
 * - 多任务状态
 */

import { useMemo } from 'react'
import { Spin, Progress } from 'antd'
import { useLoadingSummary, useLoadingModules } from '@stores/loadingStore'
import styles from './GlobalLoading.module.css'

/** 模块名称映射 */
const MODULE_NAMES: Record<string, string> = {
  project: '项目',
  vocabulary: '词汇',
  sensitive: '敏感词',
  relationship: '关系图',
  timeline: '时间线',
  sequenceChart: '事序图',
  organization: '组织架构',
  map: '地图',
  fileTree: '文件树',
  highlight: '高亮配置',
  settings: '设置',
  git: 'Git',
  ai: 'AI 助手',
  terminal: '终端'
}

/** 全局加载组件属性 */
interface GlobalLoadingProps {
  /** 最小显示时间（毫秒），避免闪烁 */
  minDisplayTime?: number
  /** 是否显示进度条 */
  showProgress?: boolean
  /** 是否显示加载模块列表 */
  showModules?: boolean
  /** 自定义加载消息 */
  customMessage?: string
}

/**
 * 全局加载组件
 */
export function GlobalLoading({
  minDisplayTime: _minDisplayTime = 300,
  showProgress = true,
  showModules = false,
  customMessage
}: GlobalLoadingProps) {
  const { isLoading, latestMessage, taskCount, showGlobalOverlay } = useLoadingSummary()
  const loadingModules = useLoadingModules()

  // 生成加载消息
  const message = useMemo(() => {
    if (customMessage) return customMessage
    if (latestMessage) return latestMessage
    
    if (loadingModules.length === 1) {
      const moduleName = MODULE_NAMES[loadingModules[0]] || loadingModules[0]
      return `加载${moduleName}中...`
    }
    
    if (loadingModules.length > 1) {
      return `加载中... (${loadingModules.length} 个任务)`
    }
    
    return '加载中...'
  }, [customMessage, latestMessage, loadingModules])

  // 计算进度百分比
  const progressPercent = useMemo(() => {
    if (!showProgress || loadingModules.length === 0) return undefined
    
    // 假设每个模块加载完成后进度增加
    // 这里只是一个示意，实际可以根据加载完成的模块计算
    const allModules = [
      'project', 'vocabulary', 'sensitive', 'relationship',
      'timeline', 'sequenceChart', 'organization', 'fileTree', 'highlight'
    ]
    const loadedCount = allModules.filter(m => !loadingModules.includes(m)).length
    return Math.round((loadedCount / allModules.length) * 100)
  }, [showProgress, loadingModules])

  if (!isLoading && !showGlobalOverlay) {
    return null
  }

  return (
    <div className={styles.overlay} role="alert" aria-busy="true" aria-live="polite">
      <div className={styles.container}>
        <div className={styles.spinner}>
          <Spin size="large" />
        </div>
        
        <div className={styles.message}>{message}</div>
        
        {showProgress && progressPercent !== undefined && (
          <div className={styles.progress}>
            <Progress 
              percent={progressPercent} 
              size="small" 
              showInfo={false}
              strokeColor={{
                '0%': '#108ee9',
                '100%': '#87d068'
              }}
            />
          </div>
        )}
        
        {showModules && loadingModules.length > 0 && (
          <div className={styles.modules}>
            {loadingModules.map((module) => (
              <span key={module} className={styles.moduleTag}>
                {MODULE_NAMES[module] || module}
              </span>
            ))}
          </div>
        )}
        
        {taskCount > 1 && (
          <div className={styles.taskCount}>
            {taskCount} 个任务并行处理
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * 页面初始化加载组件
 * 专门用于应用启动时的全屏加载
 */
export function AppInitLoading({ message = '正在初始化应用...' }: { message?: string }) {
  return (
    <div className={styles.initOverlay}>
      <div className={styles.initContainer}>
        <div className={styles.logo}>
          <Spin size="large" />
        </div>
        <div className={styles.initMessage}>{message}</div>
      </div>
    </div>
  )
}

/**
 * 简单的内联加载指示器
 */
export function ModuleLoadingIndicator({ module }: { module: string }) {
  const summary = useLoadingSummary()
  
  if (!summary.isLoading) return null
  
  return (
    <div className={styles.inlineIndicator}>
      <Spin size="small" />
      <span className={styles.inlineText}>
        加载{MODULE_NAMES[module] || module}中...
      </span>
    </div>
  )
}

export default GlobalLoading
