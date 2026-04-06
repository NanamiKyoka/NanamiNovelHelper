/**
 * 地图面板入口
 * 管理列表、预览和全屏编辑器之间的切换
 */

import { useState, useCallback } from 'react'
import MapList from './MapList'
import MapPreview from './MapPreview'
import MapFullscreen from './MapFullscreen'
import styles from './MapPanel.module.css'

type ViewMode = 'list' | 'preview' | 'editor'

function MapPanel(): JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [currentMapId, setCurrentMapId] = useState<string | null>(null)

  // 选择地图（进入预览）
  const handleSelectMap = useCallback((mapId: string) => {
    setCurrentMapId(mapId)
    setViewMode('preview')
  }, [])

  // 创建新地图并进入编辑
  const handleCreateAndEdit = useCallback((mapId: string) => {
    setCurrentMapId(mapId)
    setViewMode('editor')
  }, [])

  // 从预览进入编辑模式
  const handleEnterEditMode = useCallback(() => {
    setViewMode('editor')
  }, [])

  // 返回列表
  const handleBackToList = useCallback(() => {
    setViewMode('list')
    setCurrentMapId(null)
  }, [])

  // 从编辑器返回预览（与其他可视化工具行为一致）
  const handleExitEditor = useCallback(() => {
    setViewMode('preview')
  }, [])

  return (
    <div className={styles.container}>
      {viewMode === 'list' && (
        <MapList 
          onSelectMap={handleSelectMap}
          onCreateAndEdit={handleCreateAndEdit}
        />
      )}
      {viewMode === 'preview' && currentMapId && (
        <MapPreview
          mapId={currentMapId}
          onClose={handleBackToList}
          onEnterEditMode={handleEnterEditMode}
        />
      )}
      {viewMode === 'editor' && currentMapId && (
        <MapFullscreen
          mapId={currentMapId}
          onBack={handleExitEditor}
        />
      )}
    </div>
  )
}

export default MapPanel
