/**
 * 关系图面板入口
 * 管理列表、预览和全屏编辑器之间的切换
 */

import { useState, useCallback } from 'react'
import RelationshipGraphList from './RelationshipGraphList'
import RelationshipGraphPreview from './RelationshipGraphPreview'
import RelationshipGraphFullscreen from './RelationshipGraphFullscreen'
import styles from './RelationshipPanel.module.css'

type ViewMode = 'list' | 'preview' | 'editor'

function RelationshipPanel(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null)

  // 打开预览
  const handleSelectGraph = useCallback((graphId: string) => {
    setCurrentGraphId(graphId)
    setViewMode('preview')
  }, [])

  // 从预览进入编辑模式
  const handleEnterEditMode = useCallback(() => {
    setViewMode('editor')
  }, [])

  // 返回列表
  const handleBackToList = useCallback(() => {
    setViewMode('list')
    setCurrentGraphId(null)
  }, [])

  // 从编辑器返回预览
  const handleExitEditor = useCallback(() => {
    setViewMode('preview')
  }, [])

  return (
    <div className={styles.container}>
      {viewMode === 'list' && <RelationshipGraphList onSelectGraph={handleSelectGraph} />}
      {viewMode === 'preview' && currentGraphId && (
        <RelationshipGraphPreview
          graphId={currentGraphId}
          onClose={handleBackToList}
          onEnterEditMode={handleEnterEditMode}
        />
      )}
      {viewMode === 'editor' && currentGraphId && (
        <RelationshipGraphFullscreen graphId={currentGraphId} onBack={handleExitEditor} />
      )}
    </div>
  )
}

export default RelationshipPanel
