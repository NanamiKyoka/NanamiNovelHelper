/**
 * 全局加载组件
 */

import { memo, useMemo } from 'react'
import { Spin, Progress } from 'antd'
import { useLoadingSummary, useLoadingModules } from '@stores/loadingStore'
import styles from './GlobalLoading.module.css'

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

const ALL_MODULES = [
  'project', 'vocabulary', 'sensitive', 'relationship',
  'timeline', 'sequenceChart', 'organization', 'fileTree', 'highlight'
] as const

interface GlobalLoadingProps {
  minDisplayTime?: number
  showProgress?: boolean
  showModules?: boolean
  customMessage?: string
}

const GlobalLoadingInner = memo(function GlobalLoadingInner({
  showProgress = true,
  showModules = false,
  customMessage
}: GlobalLoadingProps) {
  const { isLoading, latestMessage, taskCount, showGlobalOverlay } = useLoadingSummary()
  const loadingModules = useLoadingModules()

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

  const progressPercent = useMemo(() => {
    if (!showProgress || loadingModules.length === 0) return undefined
    const loadedCount = ALL_MODULES.filter(m => !loadingModules.includes(m)).length
    return Math.round((loadedCount / ALL_MODULES.length) * 100)
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
})

export function GlobalLoading(props: GlobalLoadingProps) {
  return <GlobalLoadingInner {...props} />
}

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

export const ModuleLoadingIndicator = memo(function ModuleLoadingIndicator({ module }: { module: string }) {
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
})

export default GlobalLoading
