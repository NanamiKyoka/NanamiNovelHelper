/**
 * 事序图面板入口
 * 管理列表、预览和全屏编辑器之间的切换
 */

import { useState, useCallback } from 'react'
import SequenceChartList from './SequenceChartList'
import SequenceChartPreview from './SequenceChartPreview'
import SequenceChartFullscreen from './SequenceChartFullscreen'
import styles from './SequenceChartPanel.module.css'

type ViewMode = 'list' | 'preview' | 'editor'

function SequenceChartPanel(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentChartId, setCurrentChartId] = useState<string | null>(null)

  // 打开预览
  const handleSelectChart = useCallback((chartId: string) => {
    setCurrentChartId(chartId)
    setViewMode('preview')
  }, [])

  // 从预览进入编辑模式
  const handleEnterEditMode = useCallback(() => {
    setViewMode('editor')
  }, [])

  // 返回列表
  const handleBackToList = useCallback(() => {
    setViewMode('list')
    setCurrentChartId(null)
  }, [])

  // 从编辑器返回预览
  const handleExitEditor = useCallback(() => {
    setViewMode('preview')
  }, [])

  // 创建新事序图并打开预览
  const handleCreateAndPreview = useCallback((chartId: string) => {
    setCurrentChartId(chartId)
    setViewMode('preview')
  }, [])

  return (
    <div className={styles.container}>
      {viewMode === 'list' && (
        <SequenceChartList
          onOpenChart={handleSelectChart}
          onCreateChart={handleCreateAndPreview}
        />
      )}
      {viewMode === 'preview' && currentChartId && (
        <SequenceChartPreview
          chartId={currentChartId}
          onClose={handleBackToList}
          onEnterEditMode={handleEnterEditMode}
        />
      )}
      {viewMode === 'editor' && currentChartId && (
        <SequenceChartFullscreen
          chartId={currentChartId}
          onBack={handleExitEditor}
        />
      )}
    </div>
  )
}

export default SequenceChartPanel