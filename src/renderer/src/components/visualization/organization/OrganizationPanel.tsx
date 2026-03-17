/**
 * 组织架构图面板入口
 * 管理列表、预览和全屏编辑器之间的切换
 */

import { useState, useCallback } from 'react'
import OrganizationGraphList from './OrganizationGraphList'
import OrganizationGraphPreview from './OrganizationGraphPreview'
import OrganizationGraphFullscreen from './OrganizationGraphFullscreen'
import styles from './OrganizationPanel.module.css'

type ViewMode = 'list' | 'preview' | 'editor'

function OrganizationPanel(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentGraphId, setCurrentGraphId] = useState<string | null>(null)

  // 选择图（进入预览）
  const handleSelectGraph = useCallback((graphId: string) => {
    setCurrentGraphId(graphId)
    setViewMode('preview')
  }, [])

  // 创建新图并进入编辑
  const handleCreateAndEdit = useCallback((graphId: string) => {
    setCurrentGraphId(graphId)
    setViewMode('editor')
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

  return (
    <div className={styles.container}>
      {viewMode === 'list' && (
        <OrganizationGraphList 
          onSelectGraph={handleSelectGraph}
          onCreateAndEdit={handleCreateAndEdit}
        />
      )}
      {viewMode === 'preview' && currentGraphId && (
        <OrganizationGraphPreview
          graphId={currentGraphId}
          onClose={handleBackToList}
          onEnterEditMode={handleEnterEditMode}
        />
      )}
      {viewMode === 'editor' && currentGraphId && (
        <OrganizationGraphFullscreen
          graphId={currentGraphId}
          onBack={handleBackToList}
        />
      )}
    </div>
  )
}

export default OrganizationPanel
