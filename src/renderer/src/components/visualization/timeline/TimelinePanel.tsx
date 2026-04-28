/**
 * 时间线面板入口
 * 管理列表、预览和全屏编辑器之间的切换
 */

import { useState, useCallback } from 'react'
import TimelineList from './TimelineList'
import TimelinePreview from './TimelinePreview'
import TimelineFullscreen from './TimelineFullscreen'
import styles from './TimelinePanel.module.css'

type ViewMode = 'list' | 'preview' | 'editor'

function TimelinePanel(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentTimelineId, setCurrentTimelineId] = useState<string | null>(null)

  // 打开预览
  const handleSelectTimeline = useCallback((timelineId: string) => {
    setCurrentTimelineId(timelineId)
    setViewMode('preview')
  }, [])

  // 从预览进入编辑模式
  const handleEnterEditMode = useCallback(() => {
    setViewMode('editor')
  }, [])

  // 返回列表
  const handleBackToList = useCallback(() => {
    setViewMode('list')
    setCurrentTimelineId(null)
  }, [])

  // 从编辑器返回预览
  const handleExitEditor = useCallback(() => {
    setViewMode('preview')
  }, [])

  return (
    <div className={styles.container}>
      {viewMode === 'list' && <TimelineList onSelectTimeline={handleSelectTimeline} />}
      {viewMode === 'preview' && currentTimelineId && (
        <TimelinePreview
          timelineId={currentTimelineId}
          onClose={handleBackToList}
          onEnterEditMode={handleEnterEditMode}
        />
      )}
      {viewMode === 'editor' && currentTimelineId && (
        <TimelineFullscreen timelineId={currentTimelineId} onBack={handleExitEditor} />
      )}
    </div>
  )
}

export default TimelinePanel
